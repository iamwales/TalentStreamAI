# Aurora Serverless v2 (PostgreSQL) for the API when var.enable_aurora is true.
# Cost controls: use min_capacity / max_capacity (e.g. 0.5–1.0 ACU) per environment.

resource "random_id" "aurora_secret" {
  count       = var.enable_aurora ? 1 : 0
  byte_length = 4
}

resource "random_password" "aurora" {
  count   = var.enable_aurora ? 1 : 0
  length  = 32
  special = true
  # AWS RDS allows most printable ASCII; keep to a safe set
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "aurora" {
  count = var.enable_aurora ? 1 : 0

  name                    = "${local.name}-aurora-${random_id.aurora_secret[0].hex}"
  recovery_window_in_days = var.aurora_secret_recovery_window_days

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "aurora" {
  count = var.enable_aurora ? 1 : 0

  secret_id = aws_secretsmanager_secret.aurora[0].id
  secret_string = jsonencode({
    username = var.aurora_master_username
    password = random_password.aurora[0].result
  })
}

data "aws_vpc" "default" {
  count   = var.enable_aurora ? 1 : 0
  default = true
}

data "aws_subnets" "aurora" {
  count = var.enable_aurora ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default[0].id]
  }
}

resource "aws_db_subnet_group" "aurora" {
  count = var.enable_aurora ? 1 : 0

  name       = "${local.name}-aurora"
  subnet_ids = data.aws_subnets.aurora[0].ids

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_security_group" "aurora" {
  count = var.enable_aurora ? 1 : 0

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
  count = var.enable_aurora ? 1 : 0

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

resource "aws_rds_cluster" "aurora" {
  count = var.enable_aurora ? 1 : 0

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

  # Optional: use Data API for ad-hoc queries; the app uses psycopg + TCP
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
  count = var.enable_aurora ? 1 : 0

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
