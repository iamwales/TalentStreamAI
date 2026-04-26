terraform {
  required_version = ">= 1.6.0"

  # Remote state: `scripts/deploy.sh` passes -backend-config (S3 + DynamoDB lock). Local dev can use
  # `terraform init` without -backend for a local `terraform.tfstate` file.
  backend "s3" {
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.75"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

locals {
  name = "${var.project_name}-${var.environment}"
}

# - CloudFront + S3 (OAI) for the static Next.js export
# - API Gateway v2 + Lambda for `/api/*`
# - GitHub Actions: assume a role you create manually (OIDC) or use long-lived keys for bootstrap only; see README

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------
# Frontend (S3 + CloudFront)
# -----------------------------

resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name}-frontend-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "OAI for ${local.name} frontend bucket"
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name}-uploads-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# -----------------------------
# API (Lambda + HTTP API)
# -----------------------------

resource "aws_iam_role" "api_lambda_role" {
  name = "${local.name}-api-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_lambda_basic" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "api_lambda_vpc" {
  count = 1

  role       = aws_iam_role.api_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_secretsmanager_secret" "app" {
  name = "${local.name}/app"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id     = aws_secretsmanager_secret.app.id
  secret_string = var.app_secrets_json
}

resource "aws_iam_role_policy" "api_lambda_app" {
  name = "${local.name}-api-lambda-app"
  role = aws_iam_role.api_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = [
          aws_secretsmanager_secret.app.arn,
          aws_secretsmanager_secret.aurora[0].arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*",
        ]
      },
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name = "${local.name}-api"
  role          = aws_iam_role.api_lambda_role.arn
  runtime       = "python3.12"
  handler       = "lambda_handler.handler"

  filename         = "${path.module}/build/api_lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/build/api_lambda.zip")

  architectures = ["x86_64"]
  timeout       = 60
  memory_size   = 1024

  vpc_config {
    subnet_ids         = data.aws_subnets.aurora[0].ids
    security_group_ids = [aws_security_group.api_lambda[0].id]
  }

  environment {
    variables = {
      DEPLOYMENT_ENVIRONMENT  = var.environment
      TALENTSTREAM_SECRETS_ID = aws_secretsmanager_secret.app.arn
      TALENTSTREAM_AWS_LAMBDA = "1"

      CORS_ORIGINS = local.cors_joined

      AUTH_MODE      = "clerk_jwks"
      CLERK_JWKS_URL = var.clerk_jwks_url
      CLERK_ISSUER   = var.clerk_issuer
      CLERK_AUDIENCE = var.clerk_audience == null ? "" : var.clerk_audience

      AGENT_MODE = "llm"

      LLM_BASE_URL        = var.llm_base_url
      LLM_MODEL           = var.llm_model
      LLM_TIMEOUT_SECONDS = tostring(var.llm_timeout_seconds)
      LLM_MAX_TOKENS      = tostring(var.llm_max_tokens)
      LLM_TEMPERATURE     = tostring(var.llm_temperature)
      OPENROUTER_REFERER  = var.openrouter_referer == null ? "" : var.openrouter_referer
      OPENROUTER_TITLE    = var.openrouter_title == null ? "" : var.openrouter_title

      UPLOAD_STORAGE = "s3"
      S3_BUCKET      = aws_s3_bucket.uploads.id
      S3_PREFIX      = var.uploads_s3_prefix
      S3_SSE         = "AES256"

      LOG_LEVEL                   = var.log_level
      LOG_JSON                    = var.log_json
      ENABLE_PROMETHEUS           = var.enable_prometheus
      OTEL_EXPORTER_OTLP_ENDPOINT = var.otel_exporter_otlp_endpoint == null ? "" : var.otel_exporter_otlp_endpoint
      SERVICE_NAME                = var.service_name

      LANGFUSE_TRACING_ENABLED = tostring(var.langfuse_tracing_enabled)
      LANGFUSE_BASE_URL        = coalesce(var.langfuse_base_url, "https://cloud.langfuse.com")

      AURORA_SECRET_ARN = aws_secretsmanager_secret.aurora[0].arn
      POSTGRES_HOST     = aws_rds_cluster.aurora[0].endpoint
      POSTGRES_PORT     = "5432"
      POSTGRES_DB       = var.aurora_database_name
      POSTGRES_USER     = var.aurora_master_username
    }
  }

  # Ensure Aurora is up and Lambda VPC + IAM are ready before function update.
  tags = {
    Project                        = var.project_name
    Environment                    = var.environment
    "talentstream.io/aurora-ready" = aws_rds_cluster_instance.aurora[0].id
    "talentstream.io/vpc-access"   = aws_iam_role_policy_attachment.api_lambda_vpc[0].id
  }

  depends_on = [aws_iam_role_policy_attachment.api_lambda_basic, aws_iam_role_policy.api_lambda_app]
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name}-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.http.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.api.invoke_arn
}

resource "aws_apigatewayv2_route" "api_any" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "api_root_any" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /api"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

# -----------------------------
# CloudFront (S3 default, API on /api/*)
# -----------------------------

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "TalentStreamAI static frontend + API"

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "s3-frontend"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  origin {
    domain_name = replace(aws_apigatewayv2_api.http.api_endpoint, "https://", "")
    origin_id   = "http-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "http-api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    # Forward CORS + API headers. Without `Origin` and preflight fields, the origin (API
    # Gateway/Lambda) may not see the browser's `Origin`, and responses can miss
    # `Access-Control-Allow-*` — the client reports a "CORS" error.
    forwarded_values {
      query_string = true
      headers = [
        "Accept",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
        "Authorization",
        "Content-Type",
        "Origin",
        "X-Request-Id",
      ]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

locals {
  # NOTE: this must be declared after the distribution exists, because it depends on
  # `aws_cloudfront_distribution.cdn.domain_name` (used for CORS in the API Lambda).
  cors_joined = join(
    ",",
    compact(concat(
      [for o in split(",", var.cors_extra_origins) : trimspace(o) if trimspace(o) != ""],
      ["https://${aws_cloudfront_distribution.cdn.domain_name}"],
    )),
  )
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAIRead"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.frontend.iam_arn
        }
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}
