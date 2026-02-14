#!/bin/bash
# Full deployment script - run from project root with AWS credentials and Docker
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "=== OpenClaw Local Deployment ==="

# Phase 1: Validate
log_info "Phase 1: Validating..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    log_error "AWS credentials not configured. Run: aws configure (or aws sso login)"
    exit 1
fi
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
log_success "AWS OK (Account: $ACCOUNT, Region: $REGION)"

if ! command -v docker > /dev/null 2>&1; then
    log_error "Docker not found. Install Docker Desktop or Docker Engine."
    exit 1
fi
log_success "Docker OK"

# Phase 2: CDK Deploy
log_info "Phase 2: Deploying infrastructure..."
npx cdk deploy --require-approval never
log_success "Infrastructure deployed"

# Phase 3: Build and push image
log_info "Phase 3: Building and pushing Docker image..."
ECR_REPO="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/openclaw"
aws ecr get-login-password --region "$REGION" | \
    docker login --username AWS --password-stdin "$ECR_REPO"

docker build --platform linux/amd64 -f docker/Dockerfile -t openclaw:latest .
docker tag openclaw:latest "${ECR_REPO}:latest"
docker push "${ECR_REPO}:latest"
log_success "Image pushed"

# Phase 4: Upload config and restart
log_info "Phase 4: Uploading config and restarting ECS..."
BUCKET="openclaw-storage-${ACCOUNT}"
aws s3 cp docker/config/openclaw.json "s3://${BUCKET}/config/openclaw.json"
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --force-new-deployment
log_success "Config uploaded, service restarting"

log_info "Waiting 60s for service to stabilize..."
sleep 60

# Phase 5: Verify
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --query 'LoadBalancers[?contains(LoadBalancerName, `OpenCl`)].DNSName' \
    --output text 2>/dev/null | head -1)
if [ -n "$ALB_DNS" ]; then
    log_success "ALB: http://${ALB_DNS}"
fi
CF_URL=$(aws cloudformation describe-stacks --stack-name OpenClawStack \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' --output text 2>/dev/null || true)
if [ -n "$CF_URL" ]; then
    log_success "CloudFront: $CF_URL"
    log_info "Use Basic Auth: admin / openclaw2025"
fi

log_success "=== Deployment complete ==="
