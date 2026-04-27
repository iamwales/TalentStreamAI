#!/usr/bin/env bash
# Idempotent: ensure S3 bucket + DynamoDB lock table exist for Terraform remote state.
# Naming matches terraform/terraform_state.tf and scripts/deploy.sh defaults.
# Usage: ./scripts/ensure-terraform-backend.sh <project_name> <aws_region> [state_bucket] [lock_table]
set -euo pipefail

PROJECT_NAME="${1:-}"
REGION="${2:-}"
STATE_BUCKET_ARG="${3:-}"
LOCK_TABLE_ARG="${4:-}"
if [[ -z "$PROJECT_NAME" || -z "$REGION" ]]; then
  echo "Usage: $0 <project_name> <aws_region> [state_bucket] [lock_table]" >&2
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="${STATE_BUCKET_ARG:-${PROJECT_NAME}-tfstate-${ACCOUNT_ID}}"
LOCK_TABLE="${LOCK_TABLE_ARG:-$(echo "${PROJECT_NAME}-tf-locks" | tr '_' '-')}"

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "State bucket already exists: $BUCKET"
else
  echo "Creating state bucket: $BUCKET"
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=${REGION}"
  fi
  aws s3api put-bucket-versioning --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled
  aws s3api put-bucket-encryption --bucket "$BUCKET" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
fi

if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$REGION" &>/dev/null; then
  echo "Lock table already exists: $LOCK_TABLE"
else
  echo "Creating lock table: $LOCK_TABLE"
  aws dynamodb create-table \
    --region "$REGION" \
    --table-name "$LOCK_TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH
  aws dynamodb wait table-exists --region "$REGION" --table-name "$LOCK_TABLE"
fi

echo "Terraform backend ready: bucket=$BUCKET table=$LOCK_TABLE region=$REGION"
