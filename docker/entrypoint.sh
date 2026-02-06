#!/bin/sh
set -e

# =============================================================================
# OpenClaw Container Entrypoint Script
# =============================================================================

# Colors for output (POSIX-compliant)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

log_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

log_warn() {
    printf "${YELLOW}[WARN]${NC} %s\n" "$1"
}

log_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

# =============================================================================
# 1. Pull configuration from S3 if S3_BUCKET is set
# =============================================================================

pull_s3_config() {
    if [ -n "$S3_BUCKET" ]; then
        log_info "Pulling configuration from S3 bucket: ${S3_BUCKET}"
        
        # Create config directory if it doesn't exist
        mkdir -p /workspace/config
        
        # Attempt to sync from S3
        if aws s3 sync "s3://${S3_BUCKET}/config/" /workspace/config/ --region "${AWS_DEFAULT_REGION:-us-east-1}" 2>/tmp/s3_error; then
            log_success "Successfully synced configuration from S3"
            return 0
        else
            log_warn "Failed to sync from S3: $(cat /tmp/s3_error)"
            log_warn "Falling back to default configuration"
            return 1
        fi
    else
        log_info "S3_BUCKET not set, using default configuration"
        return 1
    fi
}

# =============================================================================
# 2. Set up workspace structure
# =============================================================================

setup_workspace() {
    log_info "Setting up workspace structure..."
    
    # Create necessary directories
    mkdir -p /workspace/config
    mkdir -p /workspace/memory
    mkdir -p /workspace/logs
    
    # Ensure SOUL.md exists (copy from /defaults/ if missing)
    if [ ! -f /workspace/config/SOUL.md ]; then
        if [ -f /defaults/SOUL.md ]; then
            log_info "Copying default SOUL.md..."
            cp /defaults/SOUL.md /workspace/config/SOUL.md
        fi
    fi
    
    # Ensure USER.md exists (copy from /defaults/ if missing)
    if [ ! -f /workspace/config/USER.md ]; then
        if [ -f /defaults/USER.md ]; then
            log_info "Copying default USER.md..."
            cp /defaults/USER.md /workspace/config/USER.md
        fi
    fi
    
    # Ensure openclaw.json exists (copy from /defaults/ if missing)
    if [ ! -f /workspace/config/openclaw.json ]; then
        if [ -f /defaults/openclaw.json ]; then
            log_info "Copying default openclaw.json..."
            cp /defaults/openclaw.json /workspace/config/openclaw.json
        fi
    fi
    
    log_success "Workspace structure ready"
}

# =============================================================================
# 3. Validate configuration
# =============================================================================

validate_config() {
    log_info "Validating configuration..."
    
    CONFIG_FILE="/workspace/config/openclaw.json"
    
    if [ -f "$CONFIG_FILE" ]; then
        # Validate JSON syntax using jq
        if jq empty "$CONFIG_FILE" 2>/dev/null; then
            log_success "Configuration file is valid JSON"
            
            # Log configuration status
            MODEL=$(jq -r '.ai.model // "not set"' "$CONFIG_FILE")
            REGION=$(jq -r '.ai.region // "not set"' "$CONFIG_FILE")
            log_info "Configured model: ${MODEL}"
            log_info "Configured region: ${REGION}"
        else
            log_error "Configuration file is invalid JSON"
            log_warn "Falling back to default configuration"
            cp /defaults/openclaw.json "$CONFIG_FILE"
        fi
    else
        log_warn "Configuration file not found, using defaults"
        cp /defaults/openclaw.json "$CONFIG_FILE"
    fi
}

# =============================================================================
# 4. Set environment variables
# =============================================================================

setup_environment() {
    log_info "Setting up environment variables..."
    
    # Export BEDROCK_MODEL_ID with default
    if [ -z "$BEDROCK_MODEL_ID" ]; then
        export BEDROCK_MODEL_ID="anthropic.claude-3-5-haiku-20241022-v1:0"
        log_info "Using default BEDROCK_MODEL_ID: ${BEDROCK_MODEL_ID}"
    else
        log_info "Using BEDROCK_MODEL_ID: ${BEDROCK_MODEL_ID}"
    fi
    
    # Export BEDROCK_REGION with default
    if [ -z "$BEDROCK_REGION" ]; then
        export BEDROCK_REGION="us-east-1"
        log_info "Using default BEDROCK_REGION: ${BEDROCK_REGION}"
    else
        log_info "Using BEDROCK_REGION: ${BEDROCK_REGION}"
    fi
    
    # Set other defaults
    export PORT="${PORT:-3000}"
    export NODE_ENV="${NODE_ENV:-production}"
    
    log_success "Environment variables configured"
}

# =============================================================================
# Main execution
# =============================================================================

main() {
    log_info "Starting OpenClaw container..."
    log_info "Node version: $(node --version)"
    log_info "Architecture: $(uname -m)"
    
    # Step 1: Try to pull from S3, fall back to defaults on failure
    if ! pull_s3_config; then
        log_info "Using local/default configuration"
    fi
    
    # Step 2: Set up workspace structure
    setup_workspace
    
    # Step 3: Validate configuration
    validate_config
    
    # Step 4: Set environment variables
    setup_environment
    
    log_success "Container initialization complete!"
    log_info "Starting OpenClaw application..."
    
    # Step 5: Start OpenClaw application using exec for proper signal handling
    # Pass through any command line arguments
    exec "$@"
}

# Run main function with all arguments
main "$@"
