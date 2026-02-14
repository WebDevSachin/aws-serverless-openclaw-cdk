#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd /Users/sachinkumar/aws-openclaw

log_info "OpenClaw Debug Tool"
echo "==================="

# Get resources
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, 'OpenCl')].DNSName" \
    --output text)
TG_ARN=$(aws elbv2 describe-target-groups \
    --names OpenCl-OpenC-MJUYWLUKJSSN \
    --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")

echo ""
log_info "1. ECS Service Status"
echo "---------------------"
aws ecs describe-services \
    --cluster openclaw-cluster \
    --services openclaw-service \
    --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
    --output table

echo ""
log_info "2. Target Group Health"
echo "----------------------"
if [ -n "$TG_ARN" ]; then
    aws elbv2 describe-target-health \
        --target-group-arn "$TG_ARN" \
        --query 'TargetHealthDescriptions[*].{ID:Target.Id,State:TargetHealth.State,Desc:TargetHealth.Description}' \
        --output table
else
    log_warn "Target group not found"
fi

echo ""
log_info "3. HTTP Response Test"
echo "---------------------"
ALB_URL="http://${ALB_DNS}"
log_info "Testing: $ALB_URL"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$ALB_URL" || echo "FAILED")
if [ "$HTTP_STATUS" = "200" ]; then
    log_success "HTTP $HTTP_STATUS - OK"
elif [ "$HTTP_STATUS" = "503" ]; then
    log_error "HTTP $HTTP_STATUS - Service Unavailable (targets unhealthy)"
elif [ "$HTTP_STATUS" = "FAILED" ]; then
    log_error "Connection failed - Check security groups"
else
    log_warn "HTTP $HTTP_STATUS"
fi

echo ""
log_info "4. Recent Container Logs"
echo "------------------------"
aws logs tail /ecs/openclaw --since 10m --format short 2>/dev/null | head -30 || log_warn "No logs available"

echo ""
log_info "5. Configuration Check"
echo "----------------------"
BUCKET="openclaw-storage-$(aws sts get-caller-identity --query Account --output text)"
if aws s3 ls "s3://${BUCKET}/config/openclaw.json" > /dev/null 2>&1; then
    log_success "Config exists in S3"
    echo "Current gateway.controlUi settings:"
    aws s3 cp "s3://${BUCKET}/config/openclaw.json" - 2>/dev/null | \
        jq '.gateway.controlUi // {"error": "not found"}' 2>/dev/null || \
        log_warn "Could not parse config"
else
    log_error "Config not found in S3!"
fi

echo ""
log_info "6. Common Issues & Fixes"
echo "------------------------"
echo ""
echo "Issue: Target unhealthy"
echo "  Fix: Check security groups, health check path, container port"
echo ""
echo "Issue: 'origin not allowed' error"
echo "  Fix: Set gateway.controlUi.allowedOrigins = ['*'] in config"
echo ""
echo "Issue: 'requires HTTPS or localhost'"
echo "  Fix: Set gateway.controlUi.allowInsecureAuth = true in config"
echo ""
echo "Issue: WebSocket disconnects (1008)"
echo "  Fix: Update config and restart service:"
echo "    ./scripts/fix-origin.sh"
echo ""

echo ""
log_info "Debug complete"
