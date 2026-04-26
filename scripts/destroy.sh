#!/usr/bin/env bash
# Tear down one environment workspace. Destroys S3 object versions first where needed.
# Usage: ./scripts/destroy.sh <dev|staging|prod> [project_name]
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <dev|staging|prod> [project_name]"
  exit 1
fi

ENVIRONMENT=$1
PROJECT_NAME=${2:-talentstreamai}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}/terraform"

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo "Environment must be dev, staging, or prod" >&2
  exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${DEFAULT_AWS_REGION:-us-east-1}
STATE_BUCKET="${PROJECT_NAME}-tfstate-${AWS_ACCOUNT_ID}"
LOCK_TABLE=$(echo "${PROJECT_NAME}-tf-locks" | tr '_' '-')

SECRET_ARGS=()
if [ -f secrets.tfvars ]; then
  SECRET_ARGS=(-var-file=secrets.tfvars)
fi

echo "Initializing Terraform (S3 backend)…"
terraform init -input=false \
  -backend-config="bucket=${STATE_BUCKET}" \
  -backend-config="key=env/${ENVIRONMENT}/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=${LOCK_TABLE}" \
  -backend-config="encrypt=true"

if ! terraform workspace select "$ENVIRONMENT" 2>/dev/null; then
  echo "Workspace '$ENVIRONMENT' does not exist."
  terraform workspace list
  exit 1
fi

echo "Emptying S3 application buckets (if they exist)…"
FRONTEND_BUCKET="${PROJECT_NAME}-${ENVIRONMENT}-frontend-${AWS_ACCOUNT_ID}"
UPLOADS_BUCKET="${PROJECT_NAME}-${ENVIRONMENT}-uploads-${AWS_ACCOUNT_ID}"
for b in "$FRONTEND_BUCKET" "$UPLOADS_BUCKET"; do
  if aws s3 ls "s3://$b" 2>/dev/null; then
    echo "  s3://$b"
    aws s3 rm "s3://$b" --recursive
  else
    echo "  s3://$b (absent or empty, skipping)"
  fi
done

# Terraform needs a zip artifact to refresh state before destroy.
mkdir -p "${ROOT}/terraform/build"
if [ ! -f "${ROOT}/terraform/build/api_lambda.zip" ]; then
  echo "Creating placeholder Lambda zip for destroy…"
  (cd "${ROOT}/terraform/build" && echo "dummy" | zip -q api_lambda.zip -)
fi

DS=(terraform destroy -auto-approve -var="project_name=${PROJECT_NAME}" -var="environment=${ENVIRONMENT}")
if [ "${#SECRET_ARGS[@]}" -gt 0 ]; then DS+=("${SECRET_ARGS[@]}"); fi
"${DS[@]}"

echo "Destroy complete for ${ENVIRONMENT}."
echo "To drop the workspace: cd terraform && terraform workspace select default && terraform workspace delete ${ENVIRONMENT}"
