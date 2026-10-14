terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "vpc_id" {
  type        = string
  description = "Target VPC ID for Project Rescue Foundation cloud deployment"
  default     = ""
}

variable "subnet_ids" {
  type        = list(string)
  description = "Target Subnet IDs for ECS and RDS placement"
  default     = []
}

# 1. KMS Customer Managed Key for Database and Media Storage
resource "aws_kms_key" "rescue_kms" {
  description             = "KMS Key for Project Rescue Foundation Encrypted Data"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# 2. Private S3 Quarantine & Clean Evidence Storage Buckets
resource "aws_s3_bucket" "evidence_storage" {
  bucket = "project-rescue-evidence-${var.environment}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence_encryption" {
  bucket = aws_s3_bucket.evidence_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.rescue_kms.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket = aws_s3_bucket.evidence_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. Amazon SQS Queues for Asynchronous Media Processing
resource "aws_sqs_queue" "media_processing_dlq" {
  name                      = "project-rescue-media-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "media_processing_queue" {
  name                      = "project-rescue-media-${var.environment}"
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.media_processing_dlq.arn
    maxReceiveCount     = 3
  })
}

# 4. AWS RDS PostgreSQL with PostGIS
resource "aws_db_instance" "postgres_postgis" {
  identifier          = "project-rescue-db-${var.environment}"
  allocated_storage   = 50
  engine              = "postgres"
  engine_version      = "16.3"
  instance_class      = "db.t4g.medium"
  db_name             = "project_rescue"
  username            = "rescue_admin"
  kms_key_id          = aws_kms_key.rescue_kms.arn
  storage_encrypted   = true
  publicly_accessible = false
  skip_final_snapshot = false
  final_snapshot_identifier = "project-rescue-db-final"
}

# 5. ECS Fargate Cluster for Containerized Services
resource "aws_ecs_cluster" "rescue_cluster" {
  name = "project-rescue-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch Log Group for Application and Worker
resource "aws_cloudwatch_log_group" "rescue_logs" {
  name              = "/ecs/project-rescue-${var.environment}"
  retention_in_days = 30
}

# IAM Role for ECS Execution
resource "aws_iam_role" "ecs_execution_role" {
  name = "project-rescue-ecs-exec-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Outputs for Infrastructure Reference
output "kms_key_arn" {
  value = aws_kms_key.rescue_kms.arn
}

output "s3_bucket_name" {
  value = aws_s3_bucket.evidence_storage.id
}

output "sqs_queue_url" {
  value = aws_sqs_queue.media_processing_queue.id
}

output "rds_endpoint" {
  value = aws_db_instance.postgres_postgis.endpoint
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.rescue_cluster.name
}
