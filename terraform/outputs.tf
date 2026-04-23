output "stack_name" {
  value       = local.name
  description = "Composite name (project + environment) for tagging and future resource naming."
}

output "aws_region" {
  value       = var.aws_region
  description = "Region the AWS provider is configured to use."
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions_deploy.arn
  description = "Role ARN to store in GitHub repository variables for OIDC deploys."
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "CloudFront distribution ID for invalidation steps."
}

output "cloudfront_distribution_arn" {
  value       = aws_cloudfront_distribution.frontend.arn
  description = "CloudFront distribution ARN."
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "Default CloudFront domain for the frontend."
}

output "frontend_bucket_name" {
  value       = aws_s3_bucket.frontend.bucket
  description = "S3 bucket that stores frontend static assets."
}

output "api_gateway_endpoint" {
  value       = aws_apigatewayv2_api.http.api_endpoint
  description = "API Gateway endpoint URL."
}

output "lambda_function_name" {
  value       = aws_lambda_function.api.function_name
  description = "Lambda function name used by upload scripts."
}

output "app_config_secret_arn" {
  value       = try(aws_secretsmanager_secret.app_config[0].arn, "")
  description = "Optional app config secret ARN for runtime secrets."
}
