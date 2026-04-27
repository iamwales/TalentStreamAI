variable "frontend_image_tag" {
  type        = string
  description = "ECR image tag for the frontend Next.js server container."
  default     = "latest"
}

variable "frontend_container_port" {
  type        = number
  description = "Container/listener port for the frontend service."
  default     = 3000

  validation {
    condition     = var.frontend_container_port >= 1 && var.frontend_container_port <= 65535 && floor(var.frontend_container_port) == var.frontend_container_port
    error_message = "frontend_container_port must be an integer between 1 and 65535."
  }
}

variable "frontend_task_cpu" {
  type        = number
  description = "Fargate task CPU units for frontend service."
  default     = 512
}

variable "frontend_task_memory" {
  type        = number
  description = "Fargate task memory (MiB) for frontend service."
  default     = 1024
}

variable "frontend_desired_count" {
  type        = number
  description = "Desired running task count for frontend ECS service."
  default     = 1
}

locals {
  frontend_ecr_repo_name = "${var.project_name}-${var.environment}-frontend"
}

resource "aws_ecr_repository" "frontend" {
  name                 = local.frontend_ecr_repo_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "frontend_ecs" {
  name              = "/ecs/${local.name}-frontend"
  retention_in_days = 14
}

resource "aws_iam_role" "frontend_ecs_execution" {
  name = "${local.name}-frontend-ecs-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "frontend_ecs_execution" {
  role       = aws_iam_role.frontend_ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "frontend_ecs_task" {
  name = "${local.name}-frontend-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_security_group" "frontend_alb" {
  name        = "${local.name}-frontend-alb"
  description = "ALB ingress for frontend"
  vpc_id      = data.aws_vpc.default[0].id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "frontend_ecs" {
  name        = "${local.name}-frontend-ecs"
  description = "Frontend ECS task access"
  vpc_id      = data.aws_vpc.default[0].id

  ingress {
    from_port       = tonumber(var.frontend_container_port)
    to_port         = tonumber(var.frontend_container_port)
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "frontend" {
  name               = substr("${local.name}-frontend", 0, 32)
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.frontend_alb.id]
  subnets            = slice(sort(data.aws_subnets.aurora[0].ids), 0, 2)
}

resource "aws_lb_target_group" "frontend" {
  name        = substr("${local.name}-fe-tg", 0, 32)
  port        = tonumber(var.frontend_container_port)
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.default[0].id

  health_check {
    path                = "/"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
  }
}

resource "aws_lb_listener" "frontend_http" {
  load_balancer_arn = aws_lb.frontend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_ecs_cluster" "frontend" {
  name = "${local.name}-frontend"
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.name}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.frontend_task_cpu)
  memory                   = tostring(var.frontend_task_memory)
  execution_role_arn       = aws_iam_role.frontend_ecs_execution.arn
  task_role_arn            = aws_iam_role.frontend_ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:${var.frontend_image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = tonumber(var.frontend_container_port)
          hostPort      = tonumber(var.frontend_container_port)
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend_ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "frontend"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "frontend" {
  name            = "${local.name}-frontend"
  cluster         = aws_ecs_cluster.frontend.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.frontend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.private_subnet_ids
    security_groups  = [aws_security_group.frontend_ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = tonumber(var.frontend_container_port)
  }

  depends_on = [aws_lb_listener.frontend_http]
}
