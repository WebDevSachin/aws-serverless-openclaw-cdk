#!/bin/sh
set -e

OPENCLAW_DIR="/home/node/.openclaw"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"
DEFAULT_CONFIG="/opt/openclaw/default-config.json"

echo "=== OpenClaw Gateway Startup ==="

# Create all OpenClaw directories with full permissions
# These are needed for credentials, sessions, agents, etc.
echo "Creating OpenClaw directories..."
mkdir -p "$OPENCLAW_DIR" \
    "$OPENCLAW_DIR/credentials" \
    "$OPENCLAW_DIR/workspace" \
    "$OPENCLAW_DIR/agents" \
    "$OPENCLAW_DIR/devices" \
    "$OPENCLAW_DIR/sessions" \
    2>/dev/null || true

# Set full permissions so nothing is ever blocked
chmod -R 777 "$OPENCLAW_DIR" 2>/dev/null || true
chown -R 1000:1000 "$OPENCLAW_DIR" 2>/dev/null || true
echo "Directories ready with full permissions"

# If no config on EFS, try to seed from the baked-in default
if [ ! -f "$CONFIG_FILE" ]; then
    if [ -f "$DEFAULT_CONFIG" ]; then
        echo "No config found on EFS, seeding from default..."
        if cp "$DEFAULT_CONFIG" "$CONFIG_FILE" 2>/dev/null; then
            echo "Config seeded to EFS successfully"
        else
            echo "EFS not writable, using baked-in config directly"
            export OPENCLAW_CONFIG_PATH="$DEFAULT_CONFIG"
        fi
    else
        echo "WARNING: No config found anywhere, gateway will use defaults"
    fi
else
    echo "Config found on EFS at $CONFIG_FILE"
fi

# Show which config we're using
ACTIVE_CONFIG="${OPENCLAW_CONFIG_PATH:-$CONFIG_FILE}"
echo "Using config: $ACTIVE_CONFIG"
cat "$ACTIVE_CONFIG" 2>/dev/null | jq '.' 2>/dev/null || cat "$ACTIVE_CONFIG" 2>/dev/null || echo "(no config)"

echo ""
echo "=== Starting OpenClaw Gateway ==="
exec "$@"
