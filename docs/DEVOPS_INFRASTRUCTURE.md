# DevOps & Infrastructure Documentation

This document provides a comprehensive guide to the DevOps and infrastructure setup for the Dana AI platform.

## Table of Contents

1. [CI/CD Pipeline](#cicd-pipeline)
2. [Environment Variables Management](#environment-variables-management)
3. [Infrastructure as Code (Terraform)](#infrastructure-as-code-terraform)
4. [Container Orchestration (Kubernetes)](#container-orchestration-kubernetes)
5. [Docker Setup](#docker-setup)
6. [Deployment Procedures](#deployment-procedures)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)

## CI/CD Pipeline

Our CI/CD pipeline uses GitHub Actions to automate testing, building, and deployment.

### Workflows

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Triggers on pushes to `main` and `develop` branches
   - Runs linting and type checking
   - Executes unit and integration tests
   - Builds the application
   - Archives build artifacts

2. **CD Pipeline** (`.github/workflows/cd.yml`)
   - Triggers after successful CI run on the `main` branch
   - Downloads build artifacts
   - Deploys to production environments
   - Notifies team upon successful deployment

### Usage

The CI/CD pipeline runs automatically when code is pushed to the repository. No manual intervention is required for standard deployment.

## Environment Variables Management

We use a structured approach to manage environment variables across different environments.

### Configuration Files

- `.env.example` - Template file documenting all required environment variables
- `.env.development` - Development environment variables (local use only, not in source control)
- `.env.production` - Production environment variables (secured via CI/CD secrets)

### Secrets Management

- Development: Local `.env.development` file (not committed to source control)
- Production: Kubernetes Secrets or AWS Parameter Store (based on deployment target)
- CI/CD: GitHub Secrets for pipeline credentials

## Infrastructure as Code (Terraform)

We use Terraform to define and provision infrastructure in a consistent and repeatable way.

### Infrastructure Components

The Terraform configuration creates the following AWS resources:

- VPC with public and private subnets
- Internet and NAT gateways
- Security groups and networking rules
- RDS PostgreSQL database
- ECR repositories for Docker images
- ECS cluster for container orchestration
- Application Load Balancer (ALB)
- S3 buckets for storage
- CloudWatch for monitoring

### Usage

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan changes
terraform plan -var-file="production.tfvars"

# Apply changes
terraform apply -var-file="production.tfvars"
```

## Container Orchestration (Kubernetes)

We use Kubernetes for container orchestration in production environments.

### Kubernetes Resources

Our Kubernetes setup includes:

- **Deployments** - Application deployment configuration
- **Services** - Internal and external network exposure
- **Ingress** - External access with TLS termination
- **ConfigMaps** - Non-sensitive configuration
- **Secrets** - Sensitive configuration values
- **PersistentVolumes** - Data storage

### Deployment

Use the deployment script for automated deployment:

```bash
# Make sure the script is executable
chmod +x scripts/deploy-kubernetes.sh

# Run the deployment
./scripts/deploy-kubernetes.sh
```

## Docker Setup

Our application is containerized using Docker for consistent development and deployment.

### Docker Images

We maintain multiple Docker images:

- **Base Image** - Node.js 20 Alpine with shared dependencies
- **Development Image** - Includes development dependencies
- **Production Image** - Optimized for production use

### Local Development

To run the application locally using Docker:

```bash
# Build and start all services
docker-compose up

# Build and start specific services
docker-compose up app db

# Run in detached mode
docker-compose up -d
```

### Building Production Images

```bash
# Build the production image
docker build -t dana-ai:latest .

# Tag and push to ECR
docker tag dana-ai:latest ${ECR_REPOSITORY_URL}:latest
docker push ${ECR_REPOSITORY_URL}:latest
```

## Deployment Procedures

### Preparing for Deployment

1. Ensure all tests pass locally and on CI
2. Make sure all required environment variables are set
3. Verify the infrastructure is provisioned correctly

### Production Deployment

The production deployment happens automatically through our CI/CD pipeline when changes are merged to the `main` branch. However, you can also deploy manually:

```bash
# Deploy to Kubernetes
./scripts/deploy-kubernetes.sh

# Deploy to AWS ECS
terraform apply -var-file="production.tfvars" -target=aws_ecs_service.dana_service
```

### Rollback Procedure

In case of deployment issues:

```bash
# Kubernetes rollback
kubectl rollout undo deployment/dana-ai-app -n dana-ai

# View rollout history
kubectl rollout history deployment/dana-ai-app -n dana-ai
```

## Monitoring & Logging

We use a combination of tools for monitoring and logging:

- **AWS CloudWatch** - Infrastructure metrics and logs
- **Kubernetes Dashboard** - Cluster monitoring
- **Application Logs** - Structured JSON logs stored in CloudWatch
- **Alerting** - CloudWatch Alarms and Slack notifications

### Accessing Logs

```bash
# View Kubernetes pod logs
kubectl logs -f deployment/dana-ai-app -n dana-ai

# View specific pod logs
kubectl logs -f pod/dana-ai-app-abc123 -n dana-ai
```

## Backup & Recovery

Our backup and recovery strategy covers both database and application data.

### Database Backups

PostgreSQL backups are managed through:

- Automated daily RDS snapshots (retained for 7 days)
- Script-based logical backups (see `scripts/db-backup.ts`)
- Point-in-time recovery capabilities

### Application Data Backup

Application-specific data is backed up using:

- S3 bucket versioning
- S3 lifecycle policies (transition to Glacier after 90 days)
- Cross-region replication for disaster recovery

### Running a Backup

```bash
# Run a database backup
npx tsx scripts/db-backup.ts backup

# List available backups
npx tsx scripts/db-backup.ts list
```

### Recovery Procedure

```bash
# Restore from most recent backup
npx tsx scripts/db-backup.ts restore

# Restore from a specific backup
npx tsx scripts/db-backup.ts restore dana-ai-backup-2025-05-21.sql
```