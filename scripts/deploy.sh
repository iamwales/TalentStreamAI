#!/usr/bin/env bash
# One-shot: Lambda zip → Terraform apply (remote S3) → Next export → S3 upload
# Usage: ./scripts/deploy.sh <dev|staging|prod>
# Requires: AWS creds, TF_VAR_* (see README). Optional: terraform/secrets.tfvars

set -euo pipefail

ENVIRONMENT=${1:-dev}
PROJECT_NAME=${2:-talentstreamai}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_ZIP="${ROOT}/terraform/build/api_lambda.zip"
PKG_DIR="${ROOT}/terraform/build/lambda_pkg"
REQUIREMENTS="${PKG_DIR}/requirements.txt"
LAMBDA_IMAGE="${LAMBDA_BUILD_IMAGE:-public.ecr.aws/lambda/python:3.12}"

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo "Environment must be dev, staging, or prod" >&2
  exit 1
fi

echo "Deploying ${PROJECT_NAME} → ${ENVIRONMENT}..."

# --- 1) Lambda package ---
echo "Packaging API Lambda..."
rm -f "$OUT_ZIP"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"
if command -v uv >/dev/null 2>&1; then
  uv export --frozen --no-dev --no-hashes --project "${ROOT}/backend" -o "$REQUIREMENTS"
else
  REQUIREMENTS="${ROOT}/backend/lambda/requirements-lambda.txt"
fi
if [[ "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" && -z "${USE_DOCKER_LAMBDA:-}" ]]; then
  python3 -m pip install -r "$REQUIREMENTS" -t "$PKG_DIR" --no-cache-dir
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "On macOS/ARM, install Docker, or set USE_DOCKER_LAMBDA=1 (with Docker) for manylinux wheels." >&2
    exit 1
  fi
  echo "Using Docker (${LAMBDA_IMAGE}) to install dependencies…"
  docker run --rm --platform linux/amd64 --entrypoint /bin/sh \
    -v "$REQUIREMENTS":/req.txt:ro -v "$PKG_DIR":/out \
    "$LAMBDA_IMAGE" -c 'set -e; python3 -m pip install -q -U pip; python3 -m pip install -r /req.txt -t /out --no-cache-dir'
fi
cp -R "${ROOT}/backend/app" "${PKG_DIR}/app"
cp "${ROOT}/backend/lambda/lambda_handler.py" "${PKG_DIR}/lambda_handler.py"
python3 - <<PY
import os, zipfile
out = r"""${OUT_ZIP}"""
root = r"""${PKG_DIR}"""
os.makedirs(os.path.dirname(out), exist_ok=True)

def should_skip(p):
  x = p.replace(os.sep, "/")
  if "/__pycache__/" in x: return True
  return x.endswith((".pyc", ".pyo"))
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
  for base, _, files in os.walk(root):
    for name in files:
      full = os.path.join(base, name)
      if should_skip(full): continue
      z.write(full, arcname=os.path.relpath(full, root))
print("Wrote", out)
PY

# --- 2) Terraform (S3 remote state) ---
cd "${ROOT}/terraform"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
# Region for the state bucket (must match where the bucket lives; avoid S3 301/redirect issues).
AWS_REGION="${TF_STATE_REGION:-${DEFAULT_AWS_REGION:-us-east-1}}"
BACKEND_HCL="${ROOT}/terraform/backend.hcl"
BACKEND_BUCKET=""
BACKEND_KEY=""
BACKEND_REGION=""
BACKEND_LOCK_TABLE=""
if [ -f "${BACKEND_HCL}" ]; then
  BACKEND_BUCKET=$(awk -F'"' '/^[[:space:]]*bucket[[:space:]]*=/{print $2; exit}' "${BACKEND_HCL}" || true)
  BACKEND_KEY=$(awk -F'"' '/^[[:space:]]*key[[:space:]]*=/{print $2; exit}' "${BACKEND_HCL}" || true)
  BACKEND_REGION=$(awk -F'"' '/^[[:space:]]*region[[:space:]]*=/{print $2; exit}' "${BACKEND_HCL}" || true)
  BACKEND_LOCK_TABLE=$(awk -F'"' '/^[[:space:]]*dynamodb_table[[:space:]]*=/{print $2; exit}' "${BACKEND_HCL}" || true)
fi

# Resolution order:
# 1) TF_STATE_* env vars (recommended for CI secrets)
# 2) terraform/backend.hcl values (keeps CI/local aligned without extra secrets)
# 3) built-in defaults (project convention)
if [ -n "${BACKEND_REGION}" ] && [ -z "${TF_STATE_REGION:-}" ]; then
  AWS_REGION="${BACKEND_REGION}"
fi
STATE_BUCKET="${TF_STATE_BUCKET:-${BACKEND_BUCKET:-${PROJECT_NAME}-tfstate-${AWS_ACCOUNT_ID}}}"
LOCK_TABLE="${TF_LOCK_TABLE:-${BACKEND_LOCK_TABLE:-$(echo "${PROJECT_NAME}-tf-locks" | tr '_' '-')}}"

# Default key strategy:
# 1) TF_STATE_KEY / backend.hcl key (explicit, no workspaces)
# 2) Auto-detect legacy key "${project}/${env}/terraform.tfstate" if object exists
# 3) Fallback: env/<stage>/... + terraform workspace
RESOLVED_STATE_KEY="${TF_STATE_KEY:-${BACKEND_KEY:-}}"
if [ -n "${RESOLVED_STATE_KEY}" ]; then
  STATE_KEY="${RESOLVED_STATE_KEY}"
  USE_STATE_WORKSPACES=0
else
  LEGACY_STATE_KEY="${PROJECT_NAME}/${ENVIRONMENT}/terraform.tfstate"
  if aws s3api head-object --bucket "${STATE_BUCKET}" --key "${LEGACY_STATE_KEY}" >/dev/null 2>&1; then
    STATE_KEY="${LEGACY_STATE_KEY}"
    USE_STATE_WORKSPACES=0
  else
    STATE_KEY="env/${ENVIRONMENT}/terraform.tfstate"
    USE_STATE_WORKSPACES=1
  fi
fi
echo "Terraform state backend: bucket=${STATE_BUCKET} key=${STATE_KEY} region=${AWS_REGION} lock_table=${LOCK_TABLE} workspaces=${USE_STATE_WORKSPACES}"

# Idempotent S3 + DynamoDB for remote state (CI sets TF_VAR_manage_terraform_state_backend=false).
# SKIP_ENSURE_TERRAFORM_BACKEND=1 if Terraform still manages the state bucket in your root state.
if [ "${SKIP_ENSURE_TERRAFORM_BACKEND:-}" != "1" ]; then
  bash "${ROOT}/scripts/ensure-terraform-backend.sh" "${PROJECT_NAME}" "${AWS_REGION}" "${STATE_BUCKET}" "${LOCK_TABLE}"
fi

clear_stale_state_digest() {
  local state_key="$1"
  if aws s3api head-object --bucket "${STATE_BUCKET}" --key "${state_key}" >/dev/null 2>&1; then
    return 0
  fi
  echo "State object not found for key=${state_key}; clearing stale digest rows in ${LOCK_TABLE} (if any)."
  CANDIDATE_LOCK_IDS=(
    "${STATE_BUCKET}/${state_key}-md5"
    "${state_key}-md5"
  )
  for lock_id in "${CANDIDATE_LOCK_IDS[@]}"; do
    aws dynamodb delete-item \
      --region "${AWS_REGION}" \
      --table-name "${LOCK_TABLE}" \
      --key '{"LockID":{"S":"'"${lock_id}"'"}}' >/dev/null 2>&1 || true
  done
}

clear_stale_state_digest "${STATE_KEY}"

SECRET_ARGS=()
if [ -f secrets.tfvars ]; then
  SECRET_ARGS=(-var-file=secrets.tfvars)
else
  SECRET_ARGS=()
fi

# Terraform reads TF_VAR_* from the environment automatically.
terraform init -input=false -reconfigure \
  -backend-config="bucket=${STATE_BUCKET}" \
  -backend-config="key=${STATE_KEY}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=${LOCK_TABLE}" \
  -backend-config="encrypt=true"

if [ "$USE_STATE_WORKSPACES" -eq 1 ]; then
  if ! terraform workspace select "$ENVIRONMENT" 2>/dev/null; then
    terraform workspace new "$ENVIRONMENT"
  fi
fi

LOCAL_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
FRONTEND_BUCKET_NAME="${LOCAL_NAME}-frontend-${AWS_ACCOUNT_ID}"
UPLOADS_BUCKET_NAME="${LOCAL_NAME}-uploads-${AWS_ACCOUNT_ID}"
DB_SUBNET_GROUP_NAME="${LOCAL_NAME}-aurora"
DB_CLUSTER_IDENTIFIER="${LOCAL_NAME}-aurora"
DB_CLUSTER_INSTANCE_IDENTIFIER="${LOCAL_NAME}-aurora-1"
API_LAMBDA_ROLE_NAME="${LOCAL_NAME}-api-lambda-role"
API_LAMBDA_FUNCTION_NAME="${LOCAL_NAME}-api"
API_LAMBDA_APP_POLICY_NAME="${LOCAL_NAME}-api-lambda-app"
APP_SECRET_NAME="${LOCAL_NAME}/app"
API_LAMBDA_SG_NAME="${LOCAL_NAME}-api-lambda"
AURORA_SG_NAME="${LOCAL_NAME}-aurora"
LAMBDA_BASIC_POLICY_ARN="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
LAMBDA_VPC_POLICY_ARN="arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"

import_if_missing() {
  local address="$1"
  local import_id="$2"
  if terraform state show "$address" >/dev/null 2>&1; then
    return 0
  fi
  echo "Importing existing resource into state: ${address} (${import_id})"
  IMPORT_CMD=(terraform import -var="project_name=${PROJECT_NAME}" -var="environment=${ENVIRONMENT}")
  if [ "${#SECRET_ARGS[@]}" -gt 0 ]; then
    IMPORT_CMD+=("${SECRET_ARGS[@]}")
  fi
  IMPORT_CMD+=("$address" "$import_id")
  if ! "${IMPORT_CMD[@]}" >/dev/null 2>&1; then
    echo "Warning: import failed for ${address}. Continuing; terraform apply will report if still required."
  fi
}

maybe_import_existing_stack_resources() {
  echo "Checking for existing AWS resources to adopt into Terraform state..."

  if aws s3api head-bucket --bucket "${FRONTEND_BUCKET_NAME}" 2>/dev/null; then
    import_if_missing "aws_s3_bucket.frontend" "${FRONTEND_BUCKET_NAME}"
  fi
  if aws s3api head-bucket --bucket "${UPLOADS_BUCKET_NAME}" 2>/dev/null; then
    import_if_missing "aws_s3_bucket.uploads" "${UPLOADS_BUCKET_NAME}"
  fi
  if aws iam get-role --role-name "${API_LAMBDA_ROLE_NAME}" >/dev/null 2>&1; then
    import_if_missing "aws_iam_role.api_lambda_role" "${API_LAMBDA_ROLE_NAME}"

    ROLE_ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name "${API_LAMBDA_ROLE_NAME}" \
      --query "AttachedPolicies[].PolicyArn" --output text 2>/dev/null || echo "")
    if echo "${ROLE_ATTACHED_POLICIES}" | rg -q "${LAMBDA_BASIC_POLICY_ARN}"; then
      import_if_missing "aws_iam_role_policy_attachment.api_lambda_basic" "${API_LAMBDA_ROLE_NAME}/${LAMBDA_BASIC_POLICY_ARN}"
    fi
    if echo "${ROLE_ATTACHED_POLICIES}" | rg -q "${LAMBDA_VPC_POLICY_ARN}"; then
      import_if_missing "aws_iam_role_policy_attachment.api_lambda_vpc[0]" "${API_LAMBDA_ROLE_NAME}/${LAMBDA_VPC_POLICY_ARN}"
    fi
    if aws iam get-role-policy --role-name "${API_LAMBDA_ROLE_NAME}" --policy-name "${API_LAMBDA_APP_POLICY_NAME}" >/dev/null 2>&1; then
      import_if_missing "aws_iam_role_policy.api_lambda_app" "${API_LAMBDA_ROLE_NAME}:${API_LAMBDA_APP_POLICY_NAME}"
    fi
  fi
  if aws lambda get-function --region "${AWS_REGION}" --function-name "${API_LAMBDA_FUNCTION_NAME}" >/dev/null 2>&1; then
    import_if_missing "aws_lambda_function.api" "${API_LAMBDA_FUNCTION_NAME}"
    LAMBDA_POLICY_JSON=$(aws lambda get-policy --region "${AWS_REGION}" --function-name "${API_LAMBDA_FUNCTION_NAME}" \
      --query "Policy" --output text 2>/dev/null || echo "")
    if [ -n "${LAMBDA_POLICY_JSON}" ] && [ "${LAMBDA_POLICY_JSON}" != "None" ]; then
      HAS_API_GW_PERMISSION=$(LAMBDA_POLICY_JSON="${LAMBDA_POLICY_JSON}" python3 - <<'PY'
import json
import os

raw = os.environ.get("LAMBDA_POLICY_JSON", "")
try:
    policy = json.loads(raw) if raw else {}
except Exception:
    print("0")
    raise SystemExit(0)
for stmt in policy.get("Statement", []):
    if stmt.get("Sid") == "AllowExecutionFromAPIGateway":
        print("1")
        raise SystemExit(0)
print("0")
PY
)
      if [ "${HAS_API_GW_PERMISSION}" = "1" ]; then
        import_if_missing "aws_lambda_permission.api_gw" "${API_LAMBDA_FUNCTION_NAME}/AllowExecutionFromAPIGateway"
      fi
    fi
  fi
  if aws secretsmanager describe-secret --region "${AWS_REGION}" --secret-id "${APP_SECRET_NAME}" >/dev/null 2>&1; then
    import_if_missing "aws_secretsmanager_secret.app" "${APP_SECRET_NAME}"
  fi
  if aws rds describe-db-subnet-groups --region "${AWS_REGION}" --db-subnet-group-name "${DB_SUBNET_GROUP_NAME}" >/dev/null 2>&1; then
    import_if_missing "aws_db_subnet_group.aurora[0]" "${DB_SUBNET_GROUP_NAME}"
  fi
  if aws rds describe-db-clusters --region "${AWS_REGION}" --db-cluster-identifier "${DB_CLUSTER_IDENTIFIER}" >/dev/null 2>&1; then
    import_if_missing "aws_rds_cluster.aurora[0]" "${DB_CLUSTER_IDENTIFIER}"
  fi
  if aws rds describe-db-instances --region "${AWS_REGION}" --db-instance-identifier "${DB_CLUSTER_INSTANCE_IDENTIFIER}" >/dev/null 2>&1; then
    import_if_missing "aws_rds_cluster_instance.aurora[0]" "${DB_CLUSTER_INSTANCE_IDENTIFIER}"
  fi
  AURORA_SECRET_NAME=$(aws secretsmanager list-secrets --region "${AWS_REGION}" \
    --filters "Key=name,Values=${LOCAL_NAME}-aurora-" \
    --query "SecretList[0].Name" --output text 2>/dev/null || echo "")
  if [ -n "${AURORA_SECRET_NAME}" ] && [ "${AURORA_SECRET_NAME}" != "None" ]; then
    AURORA_SECRET_DELETED_AT=$(aws secretsmanager describe-secret --region "${AWS_REGION}" \
      --secret-id "${AURORA_SECRET_NAME}" --query "DeletedDate" --output text 2>/dev/null || echo "")
    if [ -n "${AURORA_SECRET_DELETED_AT}" ] && [ "${AURORA_SECRET_DELETED_AT}" != "None" ]; then
      echo "Restoring aurora secret pending deletion: ${AURORA_SECRET_NAME}"
      aws secretsmanager restore-secret --region "${AWS_REGION}" --secret-id "${AURORA_SECRET_NAME}" >/dev/null
    fi
    import_if_missing "aws_secretsmanager_secret.aurora[0]" "${AURORA_SECRET_NAME}"
  fi

  DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --region "${AWS_REGION}" --filters Name=isDefault,Values=true --query "Vpcs[0].VpcId" --output text 2>/dev/null || echo "")
  if [ -n "${DEFAULT_VPC_ID}" ] && [ "${DEFAULT_VPC_ID}" != "None" ]; then
    API_LAMBDA_SG_ID=$(aws ec2 describe-security-groups --region "${AWS_REGION}" \
      --filters "Name=group-name,Values=${API_LAMBDA_SG_NAME}" "Name=vpc-id,Values=${DEFAULT_VPC_ID}" \
      --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "")
    if [ -n "${API_LAMBDA_SG_ID}" ] && [ "${API_LAMBDA_SG_ID}" != "None" ]; then
      import_if_missing "aws_security_group.api_lambda[0]" "${API_LAMBDA_SG_ID}"
    fi

    AURORA_SG_ID=$(aws ec2 describe-security-groups --region "${AWS_REGION}" \
      --filters "Name=group-name,Values=${AURORA_SG_NAME}" "Name=vpc-id,Values=${DEFAULT_VPC_ID}" \
      --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "")
    if [ -n "${AURORA_SG_ID}" ] && [ "${AURORA_SG_ID}" != "None" ]; then
      import_if_missing "aws_security_group.aurora[0]" "${AURORA_SG_ID}"
    fi
  fi
}

if [ "${AUTO_IMPORT_EXISTING_RESOURCES:-1}" = "1" ]; then
  maybe_import_existing_stack_resources
fi

echo "Applying Terraform…"
APPLY=(terraform apply -auto-approve -var="project_name=${PROJECT_NAME}" -var="environment=${ENVIRONMENT}" -lock-timeout=5m)
if [ "${#SECRET_ARGS[@]}" -gt 0 ]; then APPLY+=("${SECRET_ARGS[@]}"); fi
"${APPLY[@]}"

API_URL=$(terraform output -raw api_gateway_url)
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name)
CUSTOM_URL=""; CUSTOM_URL=$(terraform output -raw cloudfront_url 2>/dev/null) || true

# --- 3) Frontend (Next static export) ---
cd "${ROOT}/frontend"
# Default production behavior: same-origin `/api/*` behind CloudFront.
# Set NEXT_PUBLIC_API_URL explicitly only if you intentionally want cross-origin browser calls.
echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-}" > .env.production
echo "Frontend API base (NEXT_PUBLIC_API_URL): ${NEXT_PUBLIC_API_URL:-<same-origin /api>}"
# Bake Clerk key if the pipeline provides it
if [ -n "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
  echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}" >> .env.production
fi
export DISABLE_ESLINT_PLUGIN=1
export NEXT_DISABLE_API_REWRITE=1
npm install
export NEXT_STATIC_EXPORT=1
npx --yes next build
aws s3 sync ./out "s3://${FRONTEND_BUCKET}/" --delete
cd "$ROOT"
CF_ID=$(cd "${ROOT}/terraform" && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/*" >/dev/null
echo "Done. CloudFront: $CUSTOM_URL  API: $API_URL  Bucket: $FRONTEND_BUCKET"
