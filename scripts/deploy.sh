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
# Default name matches terraform/terraform_state.tf: "${project_name}-tfstate-${account_id}"
# Override in CI (e.g. GitHub) if you created the bucket with a different name: TF_STATE_BUCKET, TF_LOCK_TABLE.
STATE_BUCKET="${TF_STATE_BUCKET:-${PROJECT_NAME}-tfstate-${AWS_ACCOUNT_ID}}"
LOCK_TABLE="${TF_LOCK_TABLE:-$(echo "${PROJECT_NAME}-tf-locks" | tr '_' '-')}"
# Default key = env/<stage>/... + `terraform workspace` (see below). If you use a single object key
# per stage (e.g. talentstreamai/dev/terraform.tfstate) and the default workspace, set TF_STATE_KEY
# and we skip creating/selecting a named workspace.
if [ -n "${TF_STATE_KEY:-}" ]; then
  STATE_KEY="${TF_STATE_KEY}"
  USE_STATE_WORKSPACES=0
else
  STATE_KEY="env/${ENVIRONMENT}/terraform.tfstate"
  USE_STATE_WORKSPACES=1
fi

# Idempotent S3 + DynamoDB for remote state (CI sets TF_VAR_manage_terraform_state_backend=false).
# SKIP_ENSURE_TERRAFORM_BACKEND=1 if Terraform still manages the state bucket in your root state.
if [ "${SKIP_ENSURE_TERRAFORM_BACKEND:-}" != "1" ]; then
  bash "${ROOT}/scripts/ensure-terraform-backend.sh" "${PROJECT_NAME}" "${AWS_REGION}"
fi

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

echo "Applying Terraform…"
APPLY=(terraform apply -auto-approve -var="project_name=${PROJECT_NAME}" -var="environment=${ENVIRONMENT}" -lock-timeout=5m)
if [ "${#SECRET_ARGS[@]}" -gt 0 ]; then APPLY+=("${SECRET_ARGS[@]}"); fi
"${APPLY[@]}"

API_URL=$(terraform output -raw api_gateway_url)
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name)
CUSTOM_URL=""; CUSTOM_URL=$(terraform output -raw cloudfront_url 2>/dev/null) || true

# --- 3) Frontend (Next static export) ---
cd "${ROOT}/frontend"
echo "NEXT_PUBLIC_API_URL=${API_URL}" > .env.production
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
