# Central CloudWatch dashboard for the TalentStreamAI stack (API Lambda, API Gateway, ALB/ECS, Aurora, NAT, CloudFront).

locals {
  # CloudWatch stores CloudFront metrics in the us-east-1 (N. Virginia) region.
  cloudwatch_front_metrics_region = "us-east-1"
}

resource "aws_cloudwatch_dashboard" "talentstream" {
  dashboard_name = "${local.name}-observability"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        width  = 24
        height = 1
        x      = 0
        y      = 0
        properties = {
          markdown = join("\n", [
            "# TalentStreamAI — ${local.name}",
            "API Lambda · HTTP API (v2) · ALB/ECS (frontend) · Aurora · NAT · CloudFront. Use this during incidents: trace user → CloudFront → ALB vs `/api/*` → API Gateway → Lambda; data layer: Aurora + Secrets.",
          ])
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Lambda: Invocations (sum / 5m)"
          period = 300
          region = var.aws_region
          stat   = "Sum"
          view   = "timeSeries"
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.api.function_name, { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Lambda: Errors / Throttles"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.api.function_name, { stat = "Sum" }],
            [".", "Throttles", ".", ".", { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Lambda: Duration (ms avg) & Concurrent"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.api.function_name, { stat = "Average" }],
            [".", "ConcurrentExecutions", ".", ".", { stat = "Maximum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway (HTTP v2): Count, 4xx, 5xx (sum / 5m)"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiId", aws_apigatewayv2_api.http.id, "Stage", aws_apigatewayv2_stage.default.name, { stat = "Sum" }],
            [".", "4xx", ".", ".", ".", ".", { stat = "Sum" }],
            [".", "5xx", ".", ".", ".", ".", { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway: Latency (avg ms)"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiId", aws_apigatewayv2_api.http.id, "Stage", aws_apigatewayv2_stage.default.name, { stat = "Average" }],
            [".", "IntegrationLatency", ".", ".", ".", ".", { stat = "Average" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "ALB: Requests & target response time (avg ms)"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.frontend.arn_suffix, { stat = "Sum" }],
            [".", "TargetResponseTime", ".", ".", { stat = "Average" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "ALB: 5xx (ELB + target) & Unhealthy"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", aws_lb.frontend.arn_suffix, { stat = "Sum" }],
            [".", "HTTPCode_Target_5XX_Count", ".", ".", { stat = "Sum" }],
            [".", "UnHealthyHostCount", "LoadBalancer", aws_lb.frontend.arn_suffix, "TargetGroup", aws_lb_target_group.frontend.arn_suffix, { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 19
        width  = 12
        height = 6
        properties = {
          title  = "Target group: healthy / unhealthy (sum / 5m)"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", aws_lb.frontend.arn_suffix, "TargetGroup", aws_lb_target_group.frontend.arn_suffix, { stat = "Sum" }],
            [".", "UnHealthyHostCount", ".", ".", ".", ".", { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 19
        width  = 12
        height = 6
        properties = {
          title  = "ECS: CPU / Memory (%)"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.frontend.name, "ClusterName", aws_ecs_cluster.frontend.name, { stat = "Average" }],
            [".", "MemoryUtilization", ".", ".", ".", ".", { stat = "Average" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 25
        width  = 12
        height = 6
        properties = {
          title  = "Aurora (cluster): CPU & connections"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", aws_rds_cluster.aurora[0].cluster_identifier, { stat = "Average" }],
            [".", "DatabaseConnections", ".", ".", { stat = "Average" }],
            [".", "ServerlessDatabaseCapacity", ".", ".", { stat = "Average" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 25
        width  = 12
        height = 6
        properties = {
          title  = "NAT Gateway: bytes & errors"
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          metrics = [
            ["AWS/NATGateway", "BytesInFromDestination", "NatGatewayId", aws_nat_gateway.main.id, { stat = "Sum" }],
            [".", "BytesOutToDestination", ".", ".", { stat = "Sum" }],
            [".", "ErrorPortAllocation", ".", ".", { stat = "Sum" }],
            [".", "ActiveConnectionCount", ".", ".", { stat = "Sum" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 31
        width  = 12
        height = 6
        properties = {
          title  = "CloudFront: requests & error rates (metrics in ${local.cloudwatch_front_metrics_region})"
          period = 300
          # CloudWatch API for CloudFront: metrics live in N. Virginia.
          region = local.cloudwatch_front_metrics_region
          view   = "timeSeries"
          stat   = "Average"
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.cdn.id, "Region", "Global", { stat = "Sum" }],
            [".", "4xxErrorRate", ".", ".", ".", ".", { stat = "Average" }],
            [".", "5xxErrorRate", ".", ".", ".", ".", { stat = "Average" }],
            [".", "TotalErrorRate", ".", ".", ".", ".", { stat = "Average" }],
          ]
        }
      },
    ]
  })
}
