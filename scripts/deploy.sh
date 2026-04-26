#!/usr/bin/env bash
# Full AWS deploy: Lambda zip → Terraform apply → static frontend → S3 → CloudFront invalidation.
# Usage: ./scripts/deploy.sh <dev|staging|prod>
# CI: export TF state env (TF_STATE_*) and TF_VAR_* secrets; enable S3 backend (see .github/workflows/deploy-aws.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/terraform"
ENVIRONMENT="${1:-${TF_ENVIRONMENT:-dev}}"

if ! command -v terraform >/dev/null 2>&1; then
  echo "Terraform is not installed or not on PATH."
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is not installed or not on PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node/npm is not on PATH (required to build the frontend export)."
  exit 1
fi

case "$ENVIRONMENT" in
  dev | staging | prod) ;;
  *)
    echo "Invalid environment: $ENVIRONMENT (expected dev, staging, or prod)"
    exit 1
    ;;
esac

if [ -n "${CI:-}" ] && [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "In CI, GITHUB_REPOSITORY is required for Terraform -var=github_repository."
  exit 1
fi
if [ -n "${CI:-}" ] && [ -z "${TF_STATE_BUCKET:-}" ]; then
  echo "In CI, set TF_STATE_BUCKET (and typically TF_STATE_REGION, TF_LOCK_TABLE) for S3 remote state."
  exit 1
fi

bash "$ROOT/scripts/build-lambda-zip.sh"

cd "$TF_DIR"
if [ -n "${TF_STATE_BUCKET:-}" ]; then
  if [ -z "${TF_LOCK_TABLE:-}" ]; then
    echo "Set TF_LOCK_TABLE when TF_STATE_BUCKET is set (DynamoDB state lock table)."
    exit 1
  fi
  export TF_STATE_REGION="${TF_STATE_REGION:-${AWS_REGION:-us-east-1}}"
  if [ ! -f backend_s3.tf ]; then
    echo "Enabling S3 backend: cp backend_s3.tf.example -> backend_s3.tf"
    cp backend_s3.tf.example backend_s3.tf
  fi
  {
    echo "bucket         = \"${TF_STATE_BUCKET}\""
    echo "key            = \"talentstreamai/${ENVIRONMENT}/terraform.tfstate\""
    echo "region         = \"${TF_STATE_REGION}\""
    echo "dynamodb_table = \"${TF_LOCK_TABLE}\""
    echo "encrypt        = true"
  } > backend.hcl
  terraform init -input=false -reconfigure -backend-config=backend.hcl
else
  if [ -f backend.hcl ]; then
    if [ ! -f backend_s3.tf ]; then
      echo "Enabling S3 backend: cp backend_s3.tf.example -> backend_s3.tf"
      cp backend_s3.tf.example backend_s3.tf
    fi
    terraform init -input=false -reconfigure -backend-config=backend.hcl
  else
    if [ -f backend_s3.tf ]; then
      echo "Add backend.hcl (or set TF_STATE_* in CI) for remote state, or remove backend_s3.tf for local only."
      exit 1
    fi
    terraform init -input=false
  fi
  if [ ! -f terraform.tfvars ]; then
    echo "Missing terraform/terraform.tfvars for local apply. Copy terraform.tfvars.example and fill values."
    exit 1
  fi
fi

if [ -n "${CI:-}" ]; then
  terraform apply -auto-approve \
    -var="environment=${ENVIRONMENT}" \
    -var="github_repository=${GITHUB_REPOSITORY}" \
    -var="enable_github_oidc=true"
else
  # Local: use terraform/terraform.tfvars for the rest; only override the stage.
  terraform apply -auto-approve -var="environment=${ENVIRONMENT}"
fi

BUCKET_NAME="$(terraform output -raw frontend_bucket_name)"
DISTRIBUTION_ID="$(terraform output -raw cloudfront_distribution_id)"

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
  echo "terraform output cloudfront_distribution_id is empty; not uploading frontend."
  exit 1
fi

cd "$ROOT/frontend"
npm ci
# Static export: same-origin /api/* via CloudFront (no dev rewrites)
export NEXT_DISABLE_API_REWRITE=1
npm run build
aws s3 sync ./out "s3://${BUCKET_NAME}/" --delete

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"

cd "$TF_DIR"
echo
echo "✅ Deployment complete (${ENVIRONMENT})"
echo "CloudFront: $(terraform output -raw cloudfront_url)"
echo "API:        $(terraform output -raw api_gateway_url)"
echo "S3 (site):  ${BUCKET_NAME}"
