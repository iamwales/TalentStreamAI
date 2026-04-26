# Remote state infrastructure (S3 + DynamoDB).
#
# First apply: default local state — `terraform init` then `terraform apply` (no S3 in repo until you add backend_s3.tf).
# Then migrate: point backend.hcl at the outputs below and `terraform init -migrate-state`.
#
# Set `manage_terraform_state_backend = false` only if you use a pre-existing backend (advanced).

resource "aws_s3_bucket" "terraform_state" {
  count  = var.manage_terraform_state_backend ? 1 : 0
  bucket = "${local.name}-tfstate-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "terraform-remote-state"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  count  = var.manage_terraform_state_backend ? 1 : 0
  bucket = aws_s3_bucket.terraform_state[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  count  = var.manage_terraform_state_backend ? 1 : 0
  bucket = aws_s3_bucket.terraform_state[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  count  = var.manage_terraform_state_backend ? 1 : 0
  bucket = aws_s3_bucket.terraform_state[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_state_lock" {
  count = var.manage_terraform_state_backend ? 1 : 0

  name         = replace("${local.name}-tf-locks", "_", "-")
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Purpose = "terraform-state-locking"
  }
}
