# Remote state (S3 + DynamoDB) — only when `manage_terraform_state_backend` is true.
# `scripts/deploy.sh` / GitHub Actions use `ensure-terraform-backend.sh` + this flag false so the bucket/table exist before `terraform init` with no duplicate resources.

resource "aws_s3_bucket" "terraform_state" {
  count = var.manage_terraform_state_backend ? 1 : 0
  # One shared bucket per account; state file keys / workspaces carry the environment.
  bucket = "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}"

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

  name         = replace("${var.project_name}-tf-locks", "_", "-")
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
