#!/bin/bash
set -e

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

log_info "Fixing OpenClaw Origin Issues"
echo "=============================="

# Get account
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="openclaw-storage-${ACCOUNT}"

# Upload config from docker/config/openclaw.json (has allowedOrigins: ["*"], allowInsecureAuth: true)
log_info "Uploading config to S3..."
aws s3 cp docker/config/openclaw.json "s3://${BUCKET}/config/openclaw.json"
log_success "Config uploaded"

# Restart service
log_info "Restarting ECS service..."
aws ecs update-service \
    --cluster openclaw-cluster \
    --service openclaw-service \
    --force-new-deployment

log_info "Waiting for service to stabilize..."
sleep 45

# Check status
for i in {1..10}; do
    RUNNING=$(aws ecs describe-services \
        --cluster openclaw-cluster \
        --services openclaw-service \
        --query 'services[0].runningCount' --output text)
    
    if [ "$RUNNING" -eq 1 ]; then
        log_success "Service is running!"
        break
    fi
    log_info "Waiting... ($RUNNING/1)"
    sleep 10
done

# Verify HTTP
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --query 'LoadBalancers[?contains(LoadBalancerName, \`OpenCl\`)].DNSName' \
    --output text)

log_info "Testing HTTP connection..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${ALB_DNS}" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    log_success "========================================="
    log_success "Fix applied successfully!"
    log_success "========================================="
    log_info "URL: http://${ALB_DNS}"
    log_info ""
    log_info "Next: Run tests with ./scripts/test-e2e.sh"
else
    log_error "HTTP $HTTP_STATUS - Service may still be starting"
    log_info "Wait 30 seconds and run ./scripts/debug.sh"
fi
