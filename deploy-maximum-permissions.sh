#!/bin/bash
set -e

# OpenClaw Maximum Permissions Deployment Script
# This script deploys the updated Docker image with root user and enhanced config

echo "=== OpenClaw Maximum Permissions Deployment ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="ap-south-1"
CLUSTER_NAME="openclaw-cluster"
SERVICE_NAME="openclaw-service"
REPOSITORY_NAME="openclaw"

# Step 1: Verify AWS credentials
echo -e "${BLUE}[1/8]${NC} Verifying AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}ERROR:${NC} AWS credentials not configured or invalid"
    echo "Please run: aws configure"
    echo "Or: aws sso login"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓${NC} AWS Account: $ACCOUNT_ID"
echo ""

# Step 2: Build TypeScript
echo -e "${BLUE}[2/8]${NC} Building TypeScript..."
npm run build
echo -e "${GREEN}✓${NC} TypeScript build complete"
echo ""

# Step 3: Build Docker image for linux/amd64 (required for ECS Fargate)
echo -e "${BLUE}[3/8]${NC} Building Docker image for linux/amd64..."
docker buildx build --platform linux/amd64 -t openclaw:maximum-permissions -f docker/Dockerfile .
echo -e "${GREEN}✓${NC} Docker image built"
echo ""

# Step 4: Get ECR repository URI
echo -e "${BLUE}[4/8]${NC} Getting ECR repository URI..."
ECR_URI=$(aws ecr describe-repositories \
    --repository-names $REPOSITORY_NAME \
    --region $REGION \
    --query 'repositories[0].repositoryUri' \
    --output text)
echo -e "${GREEN}✓${NC} ECR URI: $ECR_URI"
echo ""

# Step 5: Login to ECR
echo -e "${BLUE}[5/8]${NC} Logging in to ECR..."
aws ecr get-login-password --region $REGION | \
    docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
echo -e "${GREEN}✓${NC} ECR login successful"
echo ""

# Step 6: Tag and push image
echo -e "${BLUE}[6/8]${NC} Tagging and pushing image to ECR..."
docker tag openclaw:maximum-permissions $ECR_URI:latest
docker push $ECR_URI:latest
echo -e "${GREEN}✓${NC} Image pushed to ECR"
echo ""

# Step 7: Force ECS deployment
echo -e "${BLUE}[7/8]${NC} Forcing ECS deployment..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $REGION \
    --no-cli-pager > /dev/null
echo -e "${GREEN}✓${NC} Deployment initiated"
echo ""

# Step 8: Monitor deployment
echo -e "${BLUE}[8/8]${NC} Monitoring deployment..."
echo "Waiting for service to stabilize (this may take 2-3 minutes)..."
echo ""

# Get initial deployment count
INITIAL_DEPLOYMENTS=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION \
    --query 'length(services[0].deployments)' \
    --output text)

echo "Current deployments: $INITIAL_DEPLOYMENTS"
echo ""

# Wait for deployment to complete
MAX_WAIT=300  # 5 minutes
WAIT_TIME=0
INTERVAL=10

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    # Get current status
    SERVICE_INFO=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $REGION \
        --query 'services[0]' \
        --output json)
    
    RUNNING_COUNT=$(echo $SERVICE_INFO | jq -r '.runningCount')
    DESIRED_COUNT=$(echo $SERVICE_INFO | jq -r '.desiredCount')
    DEPLOYMENT_COUNT=$(echo $SERVICE_INFO | jq -r '.deployments | length')
    PRIMARY_STATUS=$(echo $SERVICE_INFO | jq -r '.deployments[0].rolloutState // "IN_PROGRESS"')
    
    echo -e "${BLUE}Status:${NC} Running: $RUNNING_COUNT/$DESIRED_COUNT | Deployments: $DEPLOYMENT_COUNT | State: $PRIMARY_STATUS"
    
    # Check if deployment is complete
    if [ "$DEPLOYMENT_COUNT" -eq "1" ] && [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ] && [ "$PRIMARY_STATUS" = "COMPLETED" ]; then
        echo ""
        echo -e "${GREEN}✓${NC} Deployment completed successfully!"
        break
    fi
    
    # Check for failed deployment
    if [ "$PRIMARY_STATUS" = "FAILED" ]; then
        echo ""
        echo -e "${RED}ERROR:${NC} Deployment failed!"
        echo "Check logs: aws logs tail /aws/ecs/containerinsights/$CLUSTER_NAME/performance --follow"
        exit 1
    fi
    
    sleep $INTERVAL
    WAIT_TIME=$((WAIT_TIME + INTERVAL))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    echo ""
    echo -e "${YELLOW}WARNING:${NC} Deployment is taking longer than expected"
    echo "Monitor manually: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME"
fi

echo ""
echo "=== Deployment Summary ==="
echo ""

# Get final service status
FINAL_INFO=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION \
    --query 'services[0]' \
    --output json)

RUNNING=$(echo $FINAL_INFO | jq -r '.runningCount')
DESIRED=$(echo $FINAL_INFO | jq -r '.desiredCount')
STATUS=$(echo $FINAL_INFO | jq -r '.status')

echo "Service: $SERVICE_NAME"
echo "Status: $STATUS"
echo "Running Tasks: $RUNNING/$DESIRED"
echo ""

# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --region $REGION \
    --query 'taskArns[0]' \
    --output text)

if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
    echo "Latest Task: $TASK_ARN"
    
    # Get task details
    TASK_INFO=$(aws ecs describe-tasks \
        --cluster $CLUSTER_NAME \
        --tasks $TASK_ARN \
        --region $REGION \
        --query 'tasks[0]' \
        --output json)
    
    TASK_STATUS=$(echo $TASK_INFO | jq -r '.lastStatus')
    HEALTH_STATUS=$(echo $TASK_INFO | jq -r '.healthStatus // "UNKNOWN"')
    
    echo "Task Status: $TASK_STATUS"
    echo "Health Status: $HEALTH_STATUS"
fi

echo ""
echo "=== Access Information ==="
echo ""
echo "CloudFront URL: https://d15af3nsx4ckro.cloudfront.net"
echo "Basic Auth: admin / openclaw2025"
echo "Gateway Token: GnSPN0qwdgbSOlJapflHjT2xvwOKax32"
echo "Chat URL: /chat?session=agent%3Amain%3AGnSPN0qwdgbSOlJapflHjT2xvwOKax32"
echo ""

echo "=== Next Steps ==="
echo ""
echo "1. View logs:"
echo "   aws logs tail /aws/ecs/containerinsights/$CLUSTER_NAME/performance --follow"
echo ""
echo "2. Test permissions via chat interface:"
echo "   - Visit: https://d15af3nsx4ckro.cloudfront.net"
echo "   - Try: 'whoami' (should return 'root')"
echo "   - Try: 'sudo -v' (should succeed)"
echo "   - Try: 'apt-get update && apt-get install -y htop'"
echo ""
echo "3. Test new features:"
echo "   - Upload an image (should use GPT-4o)"
echo "   - Try: '/reset' (should reset session)"
echo "   - Try: 'switch to opus' (should switch model)"
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
