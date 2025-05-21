#!/bin/bash
# Kubernetes Deployment Script for Dana AI Platform
# This script automates the deployment process to a Kubernetes cluster

set -e

# Check for kubectl
if ! command -v kubectl &> /dev/null; then
  echo "❌ kubectl is not installed. Please install kubectl first."
  exit 1
fi

# Check for environment file
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found. Please create it using .env.example as a template."
  exit 1
fi

# Load environment variables
echo "📝 Loading environment variables from $ENV_FILE"
export $(grep -v '^#' $ENV_FILE | xargs)

# Set deployment context variables
NAMESPACE=${NAMESPACE:-"dana-ai"}
DEPLOYMENT_NAME="dana-ai-app"
IMAGE_NAME="${ECR_REPOSITORY_URL:-"dana-ai"}:${IMAGE_TAG:-"latest"}"

# Check connection to Kubernetes cluster
echo "🔄 Checking connection to Kubernetes cluster..."
if ! kubectl cluster-info &> /dev/null; then
  echo "❌ Could not connect to Kubernetes cluster. Please check your kubeconfig."
  exit 1
fi

# Create namespace if it doesn't exist
echo "🔄 Creating namespace $NAMESPACE if it doesn't exist..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Process template files with environment variables
echo "🔄 Processing Kubernetes manifest templates..."

# Process ConfigMap
envsubst < kubernetes/config-template.yaml > kubernetes/config.yaml
echo "✅ Created config.yaml from template"

# Process Secrets
envsubst < kubernetes/secrets-template.yaml > kubernetes/secrets.yaml
echo "✅ Created secrets.yaml from template"

# Update image tag in deployment file
sed -i.bak "s|\${ECR_REPOSITORY_URL}:latest|${IMAGE_NAME}|g" kubernetes/deployment.yaml
echo "✅ Updated deployment.yaml with image: ${IMAGE_NAME}"

# Apply Kubernetes manifests
echo "🚀 Applying Kubernetes manifests..."

kubectl apply -f kubernetes/config.yaml -n $NAMESPACE
kubectl apply -f kubernetes/secrets.yaml -n $NAMESPACE
kubectl apply -f kubernetes/persistent-volumes.yaml -n $NAMESPACE
kubectl apply -f kubernetes/deployment.yaml -n $NAMESPACE
kubectl apply -f kubernetes/service.yaml -n $NAMESPACE
kubectl apply -f kubernetes/ingress.yaml -n $NAMESPACE

echo "✅ Successfully applied all Kubernetes manifests"

# Wait for deployment to complete
echo "⏳ Waiting for deployment to roll out..."
kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE

# Check if deployment is available
if kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep "True"; then
  echo "✅ Deployment is available!"
  
  # Get the ingress URL
  INGRESS_HOST=$(kubectl get ingress dana-ai-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
  echo "🔗 Your application is accessible at: https://$INGRESS_HOST"
else
  echo "❌ Deployment is not available. Please check the logs:"
  kubectl logs deployment/$DEPLOYMENT_NAME -n $NAMESPACE
fi

# Clean up temporary files
rm -f kubernetes/config.yaml kubernetes/secrets.yaml kubernetes/deployment.yaml.bak

echo "✅ Deployment process completed!"