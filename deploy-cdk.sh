#!/bin/bash
# OpenClaw CDK Deployment Script
# Usage: ./deploy-cdk.sh [bootstrap|synth|deploy|destroy]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
STACK_NAME="OpenClawStack"
REGION="${AWS_REGION:-ap-south-1}"
PROFILE="${AWS_PROFILE:-default}"

echo -e "${GREEN}=== OpenClaw CDK Deployment ===${NC}"
echo "Region: $REGION"
echo "Profile: $PROFILE"
echo ""

# Check for required environment variables
check_env() {
    if [ -z "$OPENROUTER_API_KEY" ]; then
        echo -e "${RED}ERROR: OPENROUTER_API_KEY not set${NC}"
        echo "Set it with: export OPENROUTER_API_KEY=your_key_here"
        exit 1
    fi
}

# Build Docker image for CDK
build_cdk_image() {
    echo -e "${YELLOW}Building CDK Docker image...${NC}"
    docker build -t openclaw-cdk:latest -f - . << 'EOF'
FROM node:22-alpine
WORKDIR /app
RUN npm install -g aws-cdk@2
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EOF
}

# Run CDK command in Docker
run_cdk() {
    local cmd="$1"
    docker run --rm \
        -v "$PWD:/app" \
        -v "$HOME/.aws:/root/.aws:ro" \
        -e AWS_PROFILE="$PROFILE" \
        -e AWS_REGION="$REGION" \
        -e OPENROUTER_API_KEY \
        -e SYSTEM_OPENROUTER_KEY \
        -e GATEWAY_TOKEN \
        openclaw-cdk:latest cdk "$cmd" --profile "$PROFILE" --region "$REGION"
}

# Bootstrap CDK (one-time)
bootstrap() {
    echo -e "${YELLOW}Bootstrapping CDK...${NC}"
    check_env
    run_cdk bootstrap
}

# Synthesize CloudFormation
synth() {
    echo -e "${YELLOW}Synthesizing CloudFormation...${NC}"
    check_env
    run_cdk synth
}

# Deploy stack
deploy() {
    echo -e "${YELLOW}Deploying OpenClaw stack...${NC}"
    check_env
    echo -e "${YELLOW}This may take 10-15 minutes...${NC}"
    run_cdk deploy --require-approval never
}

# Destroy stack
destroy() {
    echo -e "${RED}WARNING: This will delete all AWS resources!${NC}"
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" = "yes" ]; then
        run_cdk destroy --force
    else
        echo "Cancelled."
    fi
}

# Main
case "${1:-deploy}" in
    bootstrap)
        bootstrap
        ;;
    synth)
        synth
        ;;
    deploy)
        deploy
        ;;
    destroy)
        destroy
        ;;
    *)
        echo "Usage: $0 [bootstrap|synth|deploy|destroy]"
        exit 1
        ;;
esac

echo -e "${GREEN}Done!${NC}"
