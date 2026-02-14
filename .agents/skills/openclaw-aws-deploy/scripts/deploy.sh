#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../../.."

log_info "Starting OpenClaw Deployment Pipeline"
echo "======================================"

# Phase 1: Validate prerequisites
log_info "Phase 1: Validating prerequisites..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    log_error "AWS credentials not configured"
    exit 1
fi
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
log_success "AWS credentials valid (Account: $ACCOUNT, Region: $REGION)"

# Phase 2: Install dependencies
log_info "Phase 2: Installing dependencies..."
npm install
log_success "Dependencies installed"

# Phase 3: CDK Bootstrap (if needed)
log_info "Phase 3: Checking CDK bootstrap..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1; then
    log_warn "CDK not bootstrapped, bootstrapping now..."
    npx cdk bootstrap
fi
log_success "CDK ready"

# Phase 4: Deploy infrastructure
log_info "Phase 4: Deploying infrastructure..."
npx cdk deploy --require-approval never
log_success "Infrastructure deployed"

# Phase 5: Build and push container
log_info "Phase 5: Building container..."
ECR_REPO="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/openclaw"

log_info "Logging into ECR..."
aws ecr get-login-password --region "$REGION" | \
    docker login --username AWS --password-stdin "$ECR_REPO"

log_info "Building image (from official OpenClaw base + S3 config sync)..."
docker build --platform linux/amd64 -f docker/Dockerfile -t openclaw:latest .

docker tag openclaw:latest "${ECR_REPO}:latest"

docker push "${ECR_REPO}:latest"
log_success "Container pushed to ECR"

# Phase 6: Deploy config
log_info "Phase 6: Deploying configuration..."
BUCKET="openclaw-storage-${ACCOUNT}"
aws s3 cp docker/config/openclaw.json "s3://${BUCKET}/config/openclaw.json"
log_success "Config uploaded to S3"

# Phase 7: Restart service
log_info "Phase 7: Restarting ECS service..."
aws ecs update-service \
    --cluster openclaw-cluster \
    --service openclaw-service \
    --force-new-deployment
log_success "Service restart initiated"

# Phase 8: Wait for stability
log_info "Phase 8: Waiting for service to stabilize..."
sleep 30

for i in {1..20}; do
    STATUS=$(aws ecs describe-services \
        --cluster openclaw-cluster \
        --services openclaw-service \
        --query 'services[0].runningCount' --output text)
    
    if [ "$STATUS" -eq 1 ]; then
        log_success "Service is running (1/1 tasks)"
        break
    fi
    
    log_info "Waiting for tasks... ($STATUS/1 running)"
    sleep 15
done

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --query 'LoadBalancers[?contains(LoadBalancerName, \`OpenCl\`)].DNSName' \
    --output text)

log_success "========================================="
log_success "Deployment Complete!"
log_success "========================================="
log_info "ALB URL: http://${ALB_DNS}"
log_info "CloudFront: Check AWS Console"
log_info ""
log_info "Next: Run tests with ./scripts/test-e2e.sh"
