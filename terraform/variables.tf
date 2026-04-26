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

variable "manage_terraform_state_backend" {
  type        = bool
  description = "Create S3 bucket + DynamoDB table for Terraform remote state. Set false only if you use an existing backend and configure backend.hcl yourself."
  default     = true
}

# -----------------------------------------------------------------------------
# App configuration (mirrors `backend/app/core/config.py` + root `.env.example`)
# -----------------------------------------------------------------------------

variable "cors_extra_origins" {
  type        = string
  description = "Comma-separated extra browser origins to allow in addition to the CloudFront domain (e.g. http://localhost:3000)."
  default     = "http://localhost:3000"
}

variable "clerk_jwks_url" {
  type        = string
  description = "Clerk JWKS URL for JWT validation."
}

variable "clerk_issuer" {
  type        = string
  description = "Clerk issuer (JWT `iss` claim / issuer URL string)."
}

variable "clerk_audience" {
  type        = string
  description = "Optional Clerk JWT audience (JWT `aud` claim)."
  default     = null
}

variable "llm_base_url" {
  type        = string
  description = "OpenAI-compatible API base URL (OpenAI, OpenRouter, or compatible proxies)."
  default     = "https://openrouter.ai/api/v1"
}

variable "llm_model" {
  type = string
  # Keep aligned with `backend/app/core/config.py` default, but you will typically override per environment.
  default = "openai/gpt-4.1-mini"
}

variable "llm_timeout_seconds" {
  type    = number
  default = 45
}

variable "llm_max_tokens" {
  type    = number
  default = 1800
}

variable "llm_temperature" {
  type    = number
  default = 0.2
}

variable "openrouter_referer" {
  type        = string
  default     = null
  description = "Optional `HTTP-Referer` for OpenRouter requests (some setups require a site URL)."
}

variable "openrouter_title" {
  type        = string
  default     = null
  description = "Optional `X-Title` for OpenRouter requests."
}

variable "uploads_s3_prefix" {
  type        = string
  default     = "uploads/"
  description = "Key prefix for user uploads when `UPLOAD_STORAGE=s3` (must end with /)."
}

variable "log_level" {
  type    = string
  default = "INFO"
}

variable "log_json" {
  type        = string
  default     = "true"
  description = "Stringified boolean (`true`/`false`) because Lambda env vars are always strings."
}

variable "enable_prometheus" {
  type        = string
  default     = "true"
  description = "Stringified boolean (`true`/`false`)."
}

variable "otel_exporter_otlp_endpoint" {
  type        = string
  default     = null
  description = "Optional OTLP endpoint for OpenTelemetry export (if you add exporters)."
}

variable "service_name" {
  type    = string
  default = "talentstreamai-api"
}

variable "langfuse_base_url" {
  type        = string
  default     = null
  description = "Langfuse base URL. Defaults to https://cloud.langfuse.com in Lambda if unset."
}

variable "langfuse_tracing_enabled" {
  type    = bool
  default = true
}

variable "app_secrets_json" {
  type        = string
  default     = "{}"
  sensitive   = true
  description = "JSON object stored in AWS Secrets Manager and loaded into process env in Lambda. Include keys like OPENROUTER_API_KEY, OPENAI_API_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY."
}

# -----------------------------------------------------------------------------
# Aurora PostgreSQL (Serverless v2) — always created; API Lambda uses DATABASE_URL (see lambda_handler)
# -----------------------------------------------------------------------------

variable "aurora_min_capacity" {
  type        = number
  description = "Aurora Serverless v2 minimum capacity (ACUs). 0.5 is a common cost floor (~tens of USD/mo with steady use)."
  default     = 0.5
}

variable "aurora_max_capacity" {
  type        = number
  description = "Aurora Serverless v2 maximum capacity (ACUs). Keep low (e.g. 1) for non-prod to cap cost."
  default     = 1.0
}

variable "aurora_engine_version" {
  type        = string
  description = "Aurora PostgreSQL engine version."
  default     = "15.12"
}

variable "aurora_database_name" {
  type        = string
  description = "Initial database name in the cluster."
  default     = "talentstreamai"
}

variable "aurora_master_username" {
  type        = string
  description = "Master database username (alphanumeric, start with a letter)."
  default     = "tsadmin"
}

variable "aurora_enable_http_endpoint" {
  type        = bool
  description = "Enable RDS Data API (optional; the app uses psycopg + TLS to the instance endpoint)."
  default     = true
}

variable "aurora_secret_recovery_window_days" {
  type        = number
  description = "Secrets Manager recovery window for the master credential secret. Use 0 for dev-only immediate deletion."
  default     = 7
}

variable "aurora_skip_final_snapshot" {
  type        = bool
  description = "If true, do not take a final snapshot on cluster destroy. Safer to set false for real prod."
  default     = true
}

variable "aurora_deletion_protection" {
  type        = bool
  description = "Enable deletion protection on the cluster (recommended for production)."
  default     = false
}

variable "aurora_backup_retention_period" {
  type        = number
  description = "Backup retention in days."
  default     = 7
}

variable "aurora_performance_insights" {
  type        = bool
  description = "Enable Performance Insights (extra cost; useful for production tuning)."
  default     = false
}

# -----------------------------------------------------------------------------
# Frontend (static export) — browser-only environment
#
# These values are *not* attached to an AWS resource by this Terraform. They are
# captured as Terraform inputs so a deploy pipeline (GitHub Actions) and humans
# have a single source of expected keys (mirrors `frontend` usage of
# `NEXT_PUBLIC_*` in `.env.example`).
# -----------------------------------------------------------------------------

variable "next_public" {
  type        = map(string)
  default     = {}
  description = "Map of `NEXT_PUBLIC_*` keys/values to bake into the static export build (pipeline responsibility)."
}
