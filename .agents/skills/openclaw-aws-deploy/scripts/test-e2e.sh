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

cd /Users/sachinkumar/aws-openclaw

log_info "Running OpenClaw E2E Tests"
echo "==========================="

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, 'OpenCl')].DNSName" \
    --output text)

ALB_URL="http://${ALB_DNS}"
log_info "Testing ALB: $ALB_URL"

# Wait for service to be ready
log_info "Waiting for service to be ready..."
for i in {1..30}; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ALB_URL" || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        log_success "Service is responding (HTTP 200)"
        break
    fi
    log_info "Waiting... (HTTP $HTTP_STATUS)"
    sleep 5
done

# Install test dependencies
cd test-e2e
if [ ! -d "node_modules" ]; then
    log_info "Installing Playwright..."
    npm install
    npx playwright install chromium
fi

# Run tests
log_info "Running Playwright tests..."
export URL="$ALB_URL"

if npx playwright test --reporter=list; then
    log_success "========================================="
    log_success "All tests passed!"
    log_success "========================================="
    log_info "OpenClaw is ready at: $ALB_URL"
    exit 0
else
    log_error "========================================="
    log_error "Tests failed!"
    log_error "========================================="
    log_info "Run ./scripts/debug.sh to diagnose"
    exit 1
fi
