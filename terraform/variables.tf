variable "aws_region" {
  type        = string
  description = "Primary AWS region for future resources."
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Short name used in tagging and future resource names."
  default     = "talentstreamai"
}

variable "environment" {
  type        = string
  description = "Deployment stage label (not read by application code; use for tags and state keys)."

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "github_org" {
  type        = string
  description = "GitHub organization that owns this repository."
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name without org."
}

variable "github_ref_patterns" {
  type        = list(string)
  description = "GitHub OIDC sub patterns allowed to assume the deploy role."
  default     = ["ref:refs/heads/main"]
}

variable "create_oidc_provider" {
  type        = bool
  description = "Create GitHub OIDC provider in this account. Set false if it already exists."
  default     = true
}

variable "existing_oidc_provider_arn" {
  type        = string
  description = "Existing GitHub OIDC provider ARN when create_oidc_provider is false."
  default     = ""
}

variable "deploy_role_name" {
  type        = string
  description = "Name for the GitHub Actions deploy IAM role."
  default     = "github-actions-talentstreamai-deploy"
}

variable "frontend_bucket_name" {
  type        = string
  description = "S3 bucket name for frontend static assets."
}

variable "cloudfront_aliases" {
  type        = list(string)
  description = "Optional CNAME aliases for CloudFront distribution."
  default     = []
}

variable "cloudfront_acm_certificate_arn" {
  type        = string
  description = "Optional ACM certificate ARN (must be in us-east-1) for CloudFront aliases."
  default     = ""
}

variable "route53_zone_id" {
  type        = string
  description = "Optional hosted zone ID for Route53 alias records."
  default     = ""
}

variable "lambda_function_name" {
  type        = string
  description = "Lambda function name backing the API Gateway."
  default     = "talentstreamai-api"
}

variable "lambda_handler" {
  type        = string
  description = "Lambda handler path."
  default     = "app.lambda_handler.handler"
}

variable "lambda_runtime" {
  type        = string
  description = "Lambda runtime."
  default     = "python3.12"
}

variable "lambda_timeout" {
  type        = number
  description = "Lambda timeout in seconds."
  default     = 30
}

variable "lambda_memory_size" {
  type        = number
  description = "Lambda memory size in MB."
  default     = 512
}

variable "lambda_architectures" {
  type        = list(string)
  description = "Lambda CPU architecture list."
  default     = ["x86_64"]
}

variable "clerk_jwt_issuer" {
  type        = string
  description = "JWT issuer URL for Clerk authorizer."
}

variable "clerk_jwt_audiences" {
  type        = list(string)
  description = "Allowed JWT audiences for Clerk authorizer."
}

variable "cors_origins" {
  type        = string
  description = "Comma-separated origins allowed by the FastAPI CORS middleware."
  default     = "*"
}

variable "deployment_environment" {
  type        = string
  description = "Deployment environment passed to backend runtime."
  default     = "dev"
}

variable "lambda_environment" {
  type        = map(string)
  description = "Extra non-secret Lambda environment variables."
  default     = {}
}

variable "lambda_secret_arns" {
  type        = list(string)
  description = "Secrets Manager secret ARNs Lambda can read."
  default     = []
}

variable "create_app_config_secret" {
  type        = bool
  description = "Create an application config secret resource (value managed out-of-band)."
  default     = true
}

variable "app_config_secret_name" {
  type        = string
  description = "Name for the optional app config secret."
  default     = "talentstreamai/app-config"
}

variable "app_config_secret_description" {
  type        = string
  description = "Description for the optional app config secret."
  default     = "Application runtime secret payload for TalentStreamAI Lambda."
}

variable "api_stage_name" {
  type        = string
  description = "API Gateway stage name."
  default     = "$default"
}

variable "state_bucket_arn" {
  type        = string
  description = "Terraform remote state S3 bucket ARN used by GitHub deploy role."
}

variable "state_bucket_objects_arn" {
  type        = string
  description = "Terraform remote state object ARN prefix (bucket ARN plus /*)."
}

variable "state_lock_table_arn" {
  type        = string
  description = "Terraform remote state lock DynamoDB table ARN."
}
