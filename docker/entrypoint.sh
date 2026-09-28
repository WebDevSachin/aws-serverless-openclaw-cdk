#!/bin/sh
set -e

OPENCLAW_DIR="/home/node/.openclaw"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"
DEFAULT_CONFIG="/opt/openclaw/default-config.json"
S3_CONFIG="s3://openclaw-storage-019015402914/config/openclaw.json"
APP_DIR="/app"

echo "=== OpenClaw Gateway Startup ==="
echo "Version: Kimi-Integrated"
echo "Time: $(date -Iseconds)"

# Create all OpenClaw directories
echo "Creating OpenClaw directories..."
mkdir -p "$OPENCLAW_DIR" \
    "$OPENCLAW_DIR/credentials" \
    "$OPENCLAW_DIR/workspace" \
    "$OPENCLAW_DIR/agents" \
    "$OPENCLAW_DIR/agents/main/agent" \
    "$OPENCLAW_DIR/devices" \
    "$OPENCLAW_DIR/sessions" \
    "$OPENCLAW_DIR/logs" \
    2>/dev/null || true
echo "Directories ready"

# Set proper ownership for node user
chown -R node:node "$OPENCLAW_DIR" 2>/dev/null || true

# Try to download config from S3 first (priority)
echo ""
echo "=== Fetching Config ==="
echo "Attempting to download from S3: $S3_CONFIG"
if aws s3 cp "$S3_CONFIG" "$CONFIG_FILE" 2>/dev/null; then
    echo "✅ Config downloaded from S3 successfully"
    chmod 600 "$CONFIG_FILE" 2>/dev/null || true
elif [ -f "$DEFAULT_CONFIG" ]; then
    echo "⚠️  S3 download failed, using baked-in config"
    cp "$DEFAULT_CONFIG" "$CONFIG_FILE"
    chmod 600 "$CONFIG_FILE" 2>/dev/null || true
    echo "✅ Config copied from baked-in default"
else
    echo "❌ No config available!"
    exit 1
fi

# Substitute environment variables in config
echo ""
echo "=== Configuring Environment ==="
if [ -f "$CONFIG_FILE" ]; then
    # Create temp file for substitution
    TEMP_CONFIG="${CONFIG_FILE}.tmp"
    
    # Substitute environment variables
    sed -e "s|\\\${KIMI_API_KEY}|${KIMI_API_KEY:-}|g" \
        -e "s|\\\${OPENROUTER_API_KEY}|${OPENROUTER_API_KEY:-}|g" \
        -e "s|\\\${OPENCLAW_GATEWAY_TOKEN}|${OPENCLAW_GATEWAY_TOKEN:-}|g" \
        "$CONFIG_FILE" > "$TEMP_CONFIG"
    
    mv "$TEMP_CONFIG" "$CONFIG_FILE"
    chmod 600 "$CONFIG_FILE"
    echo "✅ Environment variables substituted"
fi

# Ensure OPENCLAW_HOME is set
export OPENCLAW_HOME="/home/node"

echo ""
echo "OPENCLAW_HOME=$OPENCLAW_HOME"
echo "Config location: $CONFIG_FILE"

# Show config summary
echo ""
echo "=== Config Summary ==="
if [ -f "$CONFIG_FILE" ]; then
    # Show default model
    MODEL=$(cat "$CONFIG_FILE" | grep '"primary"' | head -1 | cut -d'"' -f4 || echo "unknown")
    echo "Primary Model: $MODEL"
    
    # Show WhatsApp status
    WHATSAPP_STATUS=$(cat "$CONFIG_FILE" | grep -A5 '"whatsapp"' | grep '"enabled"' | head -1 || echo "  enabled: false")
    echo "WhatsApp: $WHATSAPP_STATUS"
    
    # Show Telegram status  
    TELEGRAM_STATUS=$(cat "$CONFIG_FILE" | grep -A5 '"telegram"' | grep '"enabled"' | head -1 || echo "  enabled: false")
    echo "Telegram: $TELEGRAM_STATUS"
    
    # Check for Kimi provider
    if grep -q '"kimi"' "$CONFIG_FILE" 2>/dev/null; then
        echo "✅ Kimi provider configured"
    fi
    
    # Check for OpenRouter provider
    if grep -q '"openrouter"' "$CONFIG_FILE" 2>/dev/null; then
        echo "✅ OpenRouter provider configured (fallback)"
    fi
else
    echo "❌ Config file not found!"
    exit 1
fi

# Run doctor to apply configuration changes
echo ""
echo "=== Running OpenClaw Doctor ==="
cd "$APP_DIR"
node openclaw.mjs doctor --fix 2>&1 || echo "⚠️  Doctor completed with warnings"

echo ""
echo "=== Starting OpenClaw Gateway ==="
echo "Ready to accept connections on port 18789"
echo ""

# Switch to node user for security, then run the gateway
# The official image expects to run as node user
exec su - node -c "cd $APP_DIR && exec node openclaw.mjs gateway --port 18789 --verbose"
