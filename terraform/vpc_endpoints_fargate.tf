# Private-subnet Fargate tasks need reliable paths to ECR (image layers) and to S3
# (ECR image layer storage). In practice, if NAT is flaky/misrouted, tasks get stuck
# in PENDING with `CannotPullContainerError` and the ALB returns 503 (no healthy targets).
#
# These endpoints keep ECR+S3 traffic on the AWS private network. They are optional
# (cost tradeoff) but default on because they directly affect ECS availability.
#
# See: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html

variable "enable_fargate_ecr_vpc_endpoints" {
  type        = bool
  default     = true
  description = "Create S3 gateway + ECR interface VPC endpoints for private-subnet Fargate tasks. Disabling saves a few $/mo but makes NAT misconfiguration more likely to surface as ALB 503s."
}

resource "aws_security_group" "fargate_ecr_endpoints" {
  count = var.enable_fargate_ecr_vpc_endpoints ? 1 : 0

  name        = "${local.name}-fargate-ecr-endpoints"
  description = "Interface VPC endpoints (ECR) access from tasks/Lambda in private subnets"
  vpc_id      = data.aws_vpc.default[0].id

  ingress {
    description = "HTTPS to interface endpoints (ECR) from in-VPC workloads"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = [
      aws_security_group.api_lambda[0].id,
      aws_security_group.frontend_ecs.id,
    ]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# S3 gateway endpoint — no SG, routes S3 over the private AWS backbone in these subnets
resource "aws_vpc_endpoint" "s3_gateway" {
  count = var.enable_fargate_ecr_vpc_endpoints ? 1 : 0

  vpc_id            = data.aws_vpc.default[0].id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_endpoint" "ecr_api" {
  count = var.enable_fargate_ecr_vpc_endpoints ? 1 : 0

  vpc_id              = data.aws_vpc.default[0].id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = local.private_subnet_ids
  security_group_ids  = [aws_security_group.fargate_ecr_endpoints[0].id]

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  count = var.enable_fargate_ecr_vpc_endpoints ? 1 : 0

  vpc_id              = data.aws_vpc.default[0].id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = local.private_subnet_ids
  security_group_ids  = [aws_security_group.fargate_ecr_endpoints[0].id]

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
