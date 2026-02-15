#!/bin/sh
set -e

OPENCLAW_DIR="/home/node/.openclaw"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"
DEFAULT_CONFIG="/opt/openclaw/default-config.json"

echo "=== OpenClaw Gateway Startup ==="

# Create all OpenClaw directories (EFS access point ensures node:node ownership)
# These are needed for credentials, sessions, agents, etc.
echo "Creating OpenClaw directories..."
mkdir -p "$OPENCLAW_DIR" \
    "$OPENCLAW_DIR/credentials" \
    "$OPENCLAW_DIR/workspace" \
    "$OPENCLAW_DIR/agents" \
    "$OPENCLAW_DIR/agents/main/agent" \
    "$OPENCLAW_DIR/devices" \
    "$OPENCLAW_DIR/sessions" \
    2>/dev/null || true
echo "Directories ready"

# Always update config from baked-in default (ensures latest config is used)
if [ -f "$DEFAULT_CONFIG" ]; then
    echo "Updating config from default..."
    if cp "$DEFAULT_CONFIG" "$CONFIG_FILE" 2>/dev/null; then
        echo "Config updated on EFS successfully"
    else
        echo "WARNING: Could not copy config to EFS"
    fi
else
    echo "WARNING: No default config found"
fi

# Ensure OPENCLAW_HOME is set so OpenClaw finds config at ~/.openclaw/openclaw.json
export OPENCLAW_HOME="/home/node"

echo "OPENCLAW_HOME=$OPENCLAW_HOME"
echo "Config location: $CONFIG_FILE"

# Show config if exists
if [ -f "$CONFIG_FILE" ]; then
    echo "--- Config Contents ---"
    cat "$CONFIG_FILE" 2>/dev/null | jq '.' 2>/dev/null || cat "$CONFIG_FILE" 2>/dev/null
    echo "--- End Config ---"
else
    echo "(no config file - using defaults)"
fi

echo ""
echo "=== Starting OpenClaw Gateway ==="
exec "$@"
