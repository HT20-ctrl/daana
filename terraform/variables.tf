variable "aws_region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "The deployment environment (e.g., development, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "dana-ai"
}

variable "app_port" {
  description = "Port on which the application runs"
  type        = number
  default     = 3000
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "dana_db"
  
  validation {
    condition     = length(var.db_name) > 0
    error_message = "Database name must not be empty."
  }
}

variable "db_username" {
  description = "Username for the PostgreSQL database"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.db_username) > 0
    error_message = "Database username must not be empty."
  }
}

variable "db_password" {
  description = "Password for the PostgreSQL database"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  
  validation {
    condition     = length(var.certificate_arn) > 0
    error_message = "Certificate ARN must not be empty."
  }
}

variable "app_image" {
  description = "Docker image for the application"
  type        = string
  default     = "dana-ai:latest"
}

variable "app_count" {
  description = "Number of application instances to deploy"
  type        = number
  default     = 2
  
  validation {
    condition     = var.app_count > 0
    error_message = "At least one application instance must be deployed."
  }
}

variable "app_cpu" {
  description = "CPU units for the application (1 vCPU = 1024 units)"
  type        = number
  default     = 256
}

variable "app_memory" {
  description = "Memory for the application in MiB"
  type        = number
  default     = 512
}

variable "health_check_path" {
  description = "Path for health check requests"
  type        = string
  default     = "/api/health"
}