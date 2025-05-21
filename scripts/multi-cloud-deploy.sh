#!/bin/bash
# Multi-Cloud Deployment Script for Dana AI Platform
# This script automates deployment to AWS, GCP, or Azure

set -e

# Display banner
echo "======================================"
echo "     Dana AI Multi-Cloud Deployer     "
echo "======================================"
echo ""

# Check for required tools
check_requirements() {
  local missing_tools=()
  
  echo "🔍 Checking required tools..."
  
  if ! command -v docker &> /dev/null; then
    missing_tools+=("docker")
  fi
  
  if ! command -v terraform &> /dev/null; then
    missing_tools+=("terraform")
  fi
  
  if [[ "$CLOUD_PROVIDER" == "aws" ]] && ! command -v aws &> /dev/null; then
    missing_tools+=("aws CLI")
  fi
  
  if [[ "$CLOUD_PROVIDER" == "gcp" ]] && ! command -v gcloud &> /dev/null; then
    missing_tools+=("gcloud CLI")
  fi
  
  if [[ "$CLOUD_PROVIDER" == "azure" ]] && ! command -v az &> /dev/null; then
    missing_tools+=("azure CLI")
  fi
  
  if [[ ${#missing_tools[@]} -gt 0 ]]; then
    echo "❌ Missing required tools: ${missing_tools[*]}"
    echo "Please install these tools before proceeding."
    exit 1
  fi
  
  echo "✅ All required tools are installed."
}

# Select cloud provider
select_cloud_provider() {
  echo "Select cloud provider:"
  echo "1) AWS"
  echo "2) GCP (Google Cloud)"
  echo "3) Azure"
  read -p "Enter your choice (1-3): " provider_choice
  
  case $provider_choice in
    1)
      CLOUD_PROVIDER="aws"
      echo "Selected AWS as cloud provider."
      ;;
    2)
      CLOUD_PROVIDER="gcp"
      echo "Selected GCP as cloud provider."
      ;;
    3)
      CLOUD_PROVIDER="azure"
      echo "Selected Azure as cloud provider."
      ;;
    *)
      echo "Invalid choice. Defaulting to AWS."
      CLOUD_PROVIDER="aws"
      ;;
  esac
  
  export CLOUD_PROVIDER
}

# Check environment variables
check_environment() {
  ENV_FILE=".env.${ENVIRONMENT}"
  
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found. Creating from .env.example..."
    cp .env.example "$ENV_FILE"
    echo "⚠️ Please edit $ENV_FILE with your values before deploying."
    exit 1
  fi
  
  # Load environment variables
  export $(grep -v '^#' $ENV_FILE | xargs)
  
  echo "✅ Environment variables loaded from $ENV_FILE"
}

# Build and push Docker image
build_and_push_image() {
  echo "🔄 Building Docker image..."
  
  # Generate a version tag using the current timestamp
  VERSION_TAG="v$(date +%Y%m%d-%H%M%S)"
  
  docker build -t dana-ai:$VERSION_TAG .
  
  case $CLOUD_PROVIDER in
    aws)
      echo "🔄 Logging into AWS ECR..."
      aws ecr get-login-password --region ${AWS_REGION:-us-east-1} | docker login --username AWS --password-stdin ${ECR_REPOSITORY_URL}
      
      docker tag dana-ai:$VERSION_TAG ${ECR_REPOSITORY_URL}:$VERSION_TAG
      docker tag dana-ai:$VERSION_TAG ${ECR_REPOSITORY_URL}:latest
      
      echo "🔄 Pushing to AWS ECR..."
      docker push ${ECR_REPOSITORY_URL}:$VERSION_TAG
      docker push ${ECR_REPOSITORY_URL}:latest
      ;;
      
    gcp)
      echo "🔄 Logging into GCP Container Registry..."
      gcloud auth configure-docker
      
      docker tag dana-ai:$VERSION_TAG gcr.io/${GCP_PROJECT_ID}/dana-ai:$VERSION_TAG
      docker tag dana-ai:$VERSION_TAG gcr.io/${GCP_PROJECT_ID}/dana-ai:latest
      
      echo "🔄 Pushing to GCP Container Registry..."
      docker push gcr.io/${GCP_PROJECT_ID}/dana-ai:$VERSION_TAG
      docker push gcr.io/${GCP_PROJECT_ID}/dana-ai:latest
      ;;
      
    azure)
      echo "🔄 Logging into Azure Container Registry..."
      az acr login --name ${ACR_NAME}
      
      docker tag dana-ai:$VERSION_TAG ${ACR_NAME}.azurecr.io/dana-ai:$VERSION_TAG
      docker tag dana-ai:$VERSION_TAG ${ACR_NAME}.azurecr.io/dana-ai:latest
      
      echo "🔄 Pushing to Azure Container Registry..."
      docker push ${ACR_NAME}.azurecr.io/dana-ai:$VERSION_TAG
      docker push ${ACR_NAME}.azurecr.io/dana-ai:latest
      ;;
  esac
  
  echo "✅ Docker image built and pushed successfully with tag: $VERSION_TAG"
  export DANA_VERSION=$VERSION_TAG
}

# Initialize Terraform
init_terraform() {
  echo "🔄 Initializing Terraform for $CLOUD_PROVIDER..."
  
  cd terraform/$CLOUD_PROVIDER
  terraform init
  
  echo "✅ Terraform initialized."
}

# Apply Terraform changes
apply_terraform() {
  echo "🔄 Applying Terraform changes for $CLOUD_PROVIDER..."
  
  terraform apply -var="environment=${ENVIRONMENT}" -var="version=${DANA_VERSION}"
  
  echo "✅ Infrastructure provisioned successfully."
}

# Kubernetes deployment
deploy_kubernetes() {
  echo "🔄 Deploying to Kubernetes..."
  
  case $CLOUD_PROVIDER in
    aws)
      aws eks update-kubeconfig --name dana-ai-cluster --region ${AWS_REGION:-us-east-1}
      ;;
      
    gcp)
      gcloud container clusters get-credentials dana-ai-cluster --zone ${GCP_ZONE} --project ${GCP_PROJECT_ID}
      ;;
      
    azure)
      az aks get-credentials --resource-group dana-ai-rg --name dana-ai-cluster
      ;;
  esac
  
  # Process templates
  mkdir -p kubernetes/rendered
  
  # Process ConfigMap
  envsubst < kubernetes/config-template.yaml > kubernetes/rendered/config.yaml
  
  # Process Secrets
  envsubst < kubernetes/secrets-template.yaml > kubernetes/rendered/secrets.yaml
  
  # Process Deployment - replace the image tag
  cat kubernetes/deployment.yaml | \
    sed "s|\${ECR_REPOSITORY_URL}:latest|${DOCKER_IMAGE_URL}:${DANA_VERSION}|g" > \
    kubernetes/rendered/deployment.yaml
  
  # Copy other files
  cp kubernetes/service.yaml kubernetes/rendered/
  cp kubernetes/ingress.yaml kubernetes/rendered/
  cp kubernetes/persistent-volumes.yaml kubernetes/rendered/
  
  # Apply Kubernetes resources
  kubectl apply -f kubernetes/rendered/
  
  echo "✅ Kubernetes deployment completed."
  
  # Wait for deployment to be ready
  kubectl rollout status deployment/dana-ai-app
}

# Run post-deployment tests
run_tests() {
  echo "🔄 Running post-deployment tests..."
  
  # Get service endpoint
  ENDPOINT=""
  
  case $CLOUD_PROVIDER in
    aws)
      ENDPOINT=$(kubectl get ingress dana-ai-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
      ;;
      
    gcp)
      ENDPOINT=$(kubectl get ingress dana-ai-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
      ;;
      
    azure)
      ENDPOINT=$(kubectl get ingress dana-ai-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
      ;;
  esac
  
  # Basic health check
  curl -fsSL "https://${ENDPOINT}/api/health" || echo "Health check failed!"
  
  echo "✅ Post-deployment tests completed."
}

# Display deployment summary
show_summary() {
  echo ""
  echo "======================================"
  echo "       Deployment Summary             "
  echo "======================================"
  echo "Cloud Provider: $CLOUD_PROVIDER"
  echo "Environment: $ENVIRONMENT"
  echo "Version: $DANA_VERSION"
  echo "Deployment Timestamp: $(date)"
  echo ""
  
  case $CLOUD_PROVIDER in
    aws)
      echo "LoadBalancer: $(kubectl get ingress dana-ai-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
      ;;
      
    gcp|azure)
      echo "LoadBalancer IP: $(kubectl get ingress dana-ai-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
      ;;
  esac
  
  echo ""
  echo "To monitor your deployment:"
  echo "kubectl get pods"
  echo "kubectl logs -f deployment/dana-ai-app"
  echo "======================================"
}

# Main deployment process
main() {
  # Select environment
  if [ -z "$ENVIRONMENT" ]; then
    echo "Select environment:"
    echo "1) Development"
    echo "2) Staging"
    echo "3) Production"
    read -p "Enter your choice (1-3): " env_choice
    
    case $env_choice in
      1) ENVIRONMENT="development" ;;
      2) ENVIRONMENT="staging" ;;
      3) ENVIRONMENT="production" ;;
      *) 
        echo "Invalid choice. Defaulting to development."
        ENVIRONMENT="development"
        ;;
    esac
  fi
  
  export ENVIRONMENT
  
  # Select cloud provider if not set
  if [ -z "$CLOUD_PROVIDER" ]; then
    select_cloud_provider
  fi
  
  # Set image URL based on cloud provider
  case $CLOUD_PROVIDER in
    aws)
      DOCKER_IMAGE_URL="${ECR_REPOSITORY_URL}"
      ;;
      
    gcp)
      DOCKER_IMAGE_URL="gcr.io/${GCP_PROJECT_ID}/dana-ai"
      ;;
      
    azure)
      DOCKER_IMAGE_URL="${ACR_NAME}.azurecr.io/dana-ai"
      ;;
  esac
  
  export DOCKER_IMAGE_URL
  
  # Run deployment steps
  check_requirements
  check_environment
  build_and_push_image
  init_terraform
  apply_terraform
  deploy_kubernetes
  run_tests
  show_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment|-e)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --cloud|-c)
      CLOUD_PROVIDER="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --environment, -e    Set deployment environment (development, staging, production)"
      echo "  --cloud, -c          Set cloud provider (aws, gcp, azure)"
      echo "  --help, -h           Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Run main function
main