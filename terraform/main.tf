terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
  
  # Store terraform state in S3 bucket (production environment)
  backend "s3" {
    bucket = "dana-ai-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    # Enable state locking with DynamoDB
    dynamodb_table = "dana-ai-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "dana_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.prefix}-vpc"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.dana_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.prefix}-public-subnet-1"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.dana_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.prefix}-public-subnet-2"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Private Subnets
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.dana_vpc.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name        = "${var.prefix}-private-subnet-1"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.dana_vpc.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name        = "${var.prefix}-private-subnet-2"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "dana_igw" {
  vpc_id = aws_vpc.dana_vpc.id

  tags = {
    Name        = "${var.prefix}-igw"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# NAT Gateway with Elastic IP
resource "aws_eip" "nat_eip" {
  vpc = true

  tags = {
    Name        = "${var.prefix}-nat-eip"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_nat_gateway" "dana_nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet_1.id

  tags = {
    Name        = "${var.prefix}-nat"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Route Tables
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.dana_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.dana_igw.id
  }

  tags = {
    Name        = "${var.prefix}-public-rt"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.dana_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.dana_nat.id
  }

  tags = {
    Name        = "${var.prefix}-private-rt"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_subnet_1.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_rt.id
}

# Security Groups
resource "aws_security_group" "alb_sg" {
  name        = "${var.prefix}-alb-sg"
  description = "Security group for application load balancer"
  vpc_id      = aws_vpc.dana_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.prefix}-alb-sg"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_security_group" "app_sg" {
  name        = "${var.prefix}-app-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.dana_vpc.id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.prefix}-app-sg"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_security_group" "db_sg" {
  name        = "${var.prefix}-db-sg"
  description = "Security group for database"
  vpc_id      = aws_vpc.dana_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.prefix}-db-sg"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# RDS PostgreSQL Database
resource "aws_db_subnet_group" "dana_db_subnet_group" {
  name       = "${var.prefix}-db-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]

  tags = {
    Name        = "${var.prefix}-db-subnet-group"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_db_instance" "dana_db" {
  identifier              = "${var.prefix}-db"
  allocated_storage       = 20
  storage_type            = "gp2"
  engine                  = "postgres"
  engine_version          = "15.3"
  instance_class          = "db.t3.micro"
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  parameter_group_name    = "default.postgres15"
  db_subnet_group_name    = aws_db_subnet_group.dana_db_subnet_group.name
  vpc_security_group_ids  = [aws_security_group.db_sg.id]
  backup_retention_period = 7
  storage_encrypted       = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.prefix}-db-final-snapshot"
  
  // Enable automated backups
  backup_window = "03:00-04:00"  // UTC time
  maintenance_window = "Mon:04:00-Mon:05:00"
  
  // Enable deletion protection in production
  deletion_protection = var.environment == "production" ? true : false
  
  tags = {
    Name        = "${var.prefix}-db"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Elastic Container Registry (ECR) for Docker images
resource "aws_ecr_repository" "dana_ecr" {
  name                 = "${var.prefix}-ecr"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = {
    Name        = "${var.prefix}-ecr"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Application Load Balancer (ALB)
resource "aws_lb" "dana_alb" {
  name               = "${var.prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name        = "${var.prefix}-alb"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.dana_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.dana_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dana_tg.arn
  }
}

resource "aws_lb_target_group" "dana_tg" {
  name     = "${var.prefix}-tg"
  port     = var.app_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.dana_vpc.id

  health_check {
    enabled             = true
    interval            = 30
    path                = "/api/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name        = "${var.prefix}-tg"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# ECS Cluster for container orchestration
resource "aws_ecs_cluster" "dana_cluster" {
  name = "${var.prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.prefix}-cluster"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# S3 bucket for backups and media storage
resource "aws_s3_bucket" "dana_storage" {
  bucket = "${var.prefix}-storage-${var.environment}"

  tags = {
    Name        = "${var.prefix}-storage"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

resource "aws_s3_bucket_versioning" "dana_storage_versioning" {
  bucket = aws_s3_bucket.dana_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dana_storage_encryption" {
  bucket = aws_s3_bucket.dana_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudWatch for monitoring and logging
resource "aws_cloudwatch_log_group" "dana_logs" {
  name              = "/aws/ecs/${var.prefix}-logs"
  retention_in_days = 30

  tags = {
    Name        = "${var.prefix}-logs"
    Environment = var.environment
    Project     = "Dana AI"
  }
}

# Outputs
output "rds_endpoint" {
  description = "The connection endpoint for the RDS database"
  value       = aws_db_instance.dana_db.endpoint
}

output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.dana_alb.dns_name
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.dana_ecr.repository_url
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.dana_storage.bucket
}