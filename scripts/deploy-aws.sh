#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/terraform"
ENVIRONMENT="${TF_ENVIRONMENT:-${1:-dev}}"

if ! command -v terraform >/dev/null 2>&1; then
  echo "Terraform is not installed or not on PATH."
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is not installed. Install it and configure credentials before using remote state."
  exit 1
fi

case "$ENVIRONMENT" in
  dev | staging | prod) ;;
  *)
    echo "Invalid environment: $ENVIRONMENT (expected dev, staging, or prod)"
    exit 1
    ;;
esac

cd "$TF_DIR"

if [ -f backend.hcl ]; then
  if [ ! -f backend_s3.tf ]; then
    echo "Enabling S3 backend: cp backend_s3.tf.example -> backend_s3.tf"
    cp backend_s3.tf.example backend_s3.tf
  fi
  terraform init -input=false -backend-config=backend.hcl
else
  # Default: no backend.hcl → local terraform.tfstate (no backend_s3.tf needed)
  if [ -f backend_s3.tf ]; then
    echo "Remove backend_s3.tf if you are not using S3 remote state, or add backend.hcl."
    exit 1
  fi
  echo "No backend.hcl: using local state (default terraform.tfstate in this directory)."
  terraform init -input=false
fi

if [ ! -f terraform.tfvars ]; then
  echo "Missing terraform.tfvars in $TF_DIR"
  echo "Copy terraform.tfvars.example to terraform.tfvars, adjust values, then rerun."
  exit 1
fi

terraform plan -var="environment=${ENVIRONMENT}" -out=tfplan
echo
echo "Scaffold: there are no resources in main.tf yet. When you add them, review the plan and run:"
echo "  terraform apply tfplan"
