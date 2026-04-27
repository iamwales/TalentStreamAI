# Aurora Serverless v2 (PostgreSQL) — always provisioned (this stack is production-only).
# `count = 1` keeps state addresses as `name[0]` to match prior `enable_aurora = true` stacks.
# Cost: min_capacity / max_capacity in terraform.tfvars

resource "random_id" "aurora_secret" {
  count       = 1
  byte_length = 4
}

resource "random_password" "aurora" {
  count            = 1
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "aurora" {
  count = 1

  name                    = "${local.name}-aurora-${random_id.aurora_secret[0].hex}"
  recovery_window_in_days = var.aurora_secret_recovery_window_days

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "aurora" {
  count = 1

  secret_id = aws_secretsmanager_secret.aurora[0].id
  secret_string = jsonencode({
    username = var.aurora_master_username
    password = random_password.aurora[0].result
  })
}

data "aws_vpc" "default" {
  count   = 1
  default = true
}

data "aws_subnets" "aurora" {
  count = 1
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default[0].id]
  }
}

# Lambda ENIs do not get public IPs. Use private subnets with a NAT route
# so auth/LLM calls to public services (Clerk/OpenRouter/etc.) can egress.
locals {
  all_subnet_ids    = sort(data.aws_subnets.aurora[0].ids)
  public_subnet_ids = slice(local.all_subnet_ids, 0, 2)
  nat_subnet_id     = local.public_subnet_ids[0]
  private_subnet_ids = slice(
    local.all_subnet_ids,
    2,
    length(local.all_subnet_ids)
  )
}

data "aws_internet_gateway" "default" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.default[0].id]
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = local.nat_subnet_id

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_route_table" "private" {
  vpc_id = data.aws_vpc.default[0].id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_route_table_association" "private_subnets" {
  for_each = toset(local.private_subnet_ids)

  subnet_id      = each.value
  route_table_id = aws_route_table.private.id
}

resource "aws_db_subnet_group" "aurora" {
  count = 1

  name = "${local.name}-aurora"
  # Use the full VPC subnet list so that re-partitioning subnets for ALB/ECS
  # (public vs private) never tries to remove a subnet that Aurora is
  # actively using. RDS only places the cluster instance(s) in 1-2 of these.
  subnet_ids = data.aws_subnets.aurora[0].ids

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_security_group" "aurora" {
  count = 1

  name        = "${local.name}-aurora"
  description = "Aurora PostgreSQL for ${local.name}"
  vpc_id      = data.aws_vpc.default[0].id

  ingress {
    description     = "PostgreSQL from API Lambda"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api_lambda[0].id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_security_group" "api_lambda" {
  count = 1

  name        = "${local.name}-api-lambda"
  description = "Lambda ENI (API) for ${local.name}"
  vpc_id      = data.aws_vpc.default[0].id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_security_group" "secretsmanager_endpoint" {
  count = 1

  name        = "${local.name}-secretsmanager-endpoint"
  description = "Secrets Manager VPC endpoint access for ${local.name}"
  vpc_id      = data.aws_vpc.default[0].id

  # Allow HTTPS from any client inside the VPC that needs to fetch secrets.
  # Right now that's two SGs: the API Lambda ENI (runtime secret reads) and
  # the frontend ECS task ENI (the *execution* role pulls JSON keys to inject
  # into the container at task start — if this is blocked, the task fails to
  # start before any container log is emitted, which surfaces as a CloudFront
  # 503 with no ECS task logs).
  ingress {
    description = "HTTPS from in-VPC clients (Lambda + frontend ECS tasks)"
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

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_endpoint" "secretsmanager" {
  count = 1

  vpc_id              = data.aws_vpc.default[0].id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = local.private_subnet_ids
  security_group_ids  = [aws_security_group.secretsmanager_endpoint[0].id]

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster" "aurora" {
  count = 1

  cluster_identifier = "${local.name}-aurora"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = var.aurora_engine_version
  database_name      = var.aurora_database_name
  master_username    = var.aurora_master_username
  master_password    = random_password.aurora[0].result

  serverlessv2_scaling_configuration {
    min_capacity = var.aurora_min_capacity
    max_capacity = var.aurora_max_capacity
  }

  enable_http_endpoint = var.aurora_enable_http_endpoint

  db_subnet_group_name   = aws_db_subnet_group.aurora[0].name
  vpc_security_group_ids = [aws_security_group.aurora[0].id]

  backup_retention_period      = var.aurora_backup_retention_period
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  skip_final_snapshot   = var.aurora_skip_final_snapshot
  deletion_protection   = var.aurora_deletion_protection
  apply_immediately     = true
  copy_tags_to_snapshot = true

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster_instance" "aurora" {
  count = 1

  identifier         = "${local.name}-aurora-1"
  cluster_identifier = aws_rds_cluster.aurora[0].id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora[0].engine
  engine_version     = aws_rds_cluster.aurora[0].engine_version

  performance_insights_enabled = var.aurora_performance_insights

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
