# OpenClaw AWS Deploy - Agent Documentation

This is a comprehensive reference for deploying and configuring OpenClaw on AWS infrastructure.

## Project Overview

- **OpenClaw**: Self-hosted autonomous agent platform (formerly Moltbot/Clawdbot)
- **Deployment**: AWS ECS Fargate with CDK
- **AI Provider**: OpenRouter (supports multiple models)

## Critical Configuration Fields

### Gateway Configuration (`gateway`)

```json
{
  "gateway": {
    "port": 18789,
    "bind": "lan",           // "lan" for ALB/ECS, "localhost" for local only
    "mode": "local",
    "auth": {
      "mode": "token"        // REQUIRED: "token" or "password" ("none" REMOVED for security)
    },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["*"],           // CORS origins (use ["*"] for all)
      "allowInsecureAuth": true,          // Allow HTTP (non-HTTPS) access
      "dangerouslyDisableDeviceAuth": true  // Skip device pairing (security downgrade)
    },
    "trustedProxies": [
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16"
    ]
  }
}
```

**⚠️ Security Notes:**
- `auth.mode: "none"` has been **REMOVED** from OpenClaw (commit 3314b3996, 2026-01-26)
- Minimum auth is `token` or `password`
- `dangerouslyDisableDeviceAuth`: Disables device identity checks (use only for trusted networks)
- `allowInsecureAuth`: Allows token-only auth without HTTPS device identity

### AI Model Configuration (`agents.defaults.model`)

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/moonshotai/kimi-k2.5",
        // ⚠️ NO "models" array here - OpenClaw doesn't support this key
        "fallbacks": ["anthropic/claude-3.5-sonnet"]  // Optional fallback models
      }
    }
  }
}
```

**Valid Model Providers via OpenRouter:**
- `openrouter/moonshotai/kimi-k2.5`
- `openrouter/anthropic/claude-3.5-sonnet`
- `openrouter/anthropic/claude-opus-4`
- `openrouter/google/gemini-2.0-flash-001`
- `openrouter/openrouter/flash` (cheapest)
- `openrouter/openrouter/auto` (cost-optimized routing)

### Environment Variables (`env`)

```json
{
  "env": {
    "OPENROUTER_API_KEY": "sk-or-v1-...",
    "SYSTEM_OPENROUTER_KEY": "sk-or-v1-...",
    "vars": {
      "OTHER_API_KEY": "..."
    }
  }
}
```

**Priority order** (highest to lowest):
1. Process environment variables
2. Current working directory `.env` file
3. `~/.openclaw/.env` global file
4. Config `env` block

### Sandbox Configuration (`agents.defaults.sandbox`)

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",      // "non-main" (default) | "off" (DANGEROUS - full system access)
        "perSession": true,
        "workspaceRoot": "~/.openclaw/sandboxes",
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "workdir": "/workspace",
          "readOnlyRoot": true,
          "tmpfs": ["/tmp", "/var/tmp", "/run"],
          "network": "none",
          "user": "1000:1000"
        }
      }
    }
  }
}
```

## Common Configuration Scenarios

### 1. Public Access with Token Auth (No Device Pairing)

For CloudFront/HTTPS access without device pairing:

```json
{
  "gateway": {
    "auth": { "mode": "token" },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["https://d15af3nsx4ckro.cloudfront.net"],
      "allowInsecureAuth": false,
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
```

### 2. HTTP Access (Development Only)

For ALB HTTP access (less secure):

```json
{
  "gateway": {
    "auth": { "mode": "token" },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["*"],
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
```

### 3. Full System Access (DANGEROUS)

To allow agent to execute commands on host (disable sandbox):

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "off"
      }
    }
  }
}
```

**⚠️ WARNING**: This gives the AI full access to your system!

## Deployment Configuration Files

### `docker/config/openclaw.json`

Main gateway configuration deployed to EFS via S3.

### `docker/entrypoint.sh`

Container startup script that:
1. Creates required directories
2. Seeds config from `/opt/openclaw/default-config.json` to EFS
3. Starts OpenClaw gateway

### `lib/constructs/fargate.ts`

ECS Fargate service configuration:
- Task definition with CPU/memory limits
- Container definition with environment variables
- Secrets from Secrets Manager

### Environment Variables in Container

| Variable | Source | Purpose |
|----------|--------|---------|
| `OPENCLAW_GATEWAY_TOKEN` | Secrets Manager | Gateway authentication |
| `OPENROUTER_API_KEY` | Secrets Manager | OpenRouter API access |
| `BEDROCK_MODEL_ID` | Environment | AWS Bedrock model |
| `BEDROCK_REGION` | Environment | AWS region |
| `S3_BUCKET` | Environment | S3 bucket name |

## Troubleshooting

### "pairing required" Error

**Cause**: Device auth is required but not configured
**Fix**: Set `gateway.controlUi.dangerouslyDisableDeviceAuth: true`

### "origin not allowed" Error

**Cause**: CORS origin not in allowed list
**Fix**: Add origin to `gateway.controlUi.allowedOrigins` or use `["*"]`

### "requires HTTPS" Error

**Cause**: Trying to use device auth over HTTP
**Fix**: Set `gateway.controlUi.allowInsecureAuth: true`

### "No API key found for provider" Error

**Cause**: OpenRouter API key not configured
**Fix**: Add to `env.OPENROUTER_API_KEY` in config

### Config Validation Errors

**Cause**: Invalid config keys (e.g., `models` array under `agents.defaults.model`)
**Fix**: Run `openclaw doctor --fix` or remove invalid keys

## Security Best Practices

1. **Always use HTTPS in production** (CloudFront)
2. **Keep `auth.mode` as "token" or "password"** ("none" is removed)
3. **Use `dangerouslyDisableDeviceAuth` only for trusted networks**
4. **Keep sandbox enabled** (`mode: "non-main"`) unless absolutely necessary
5. **Run `openclaw security audit` regularly**

## Useful Commands

```bash
# Get gateway token
aws secretsmanager get-secret-value \
  --secret-id openclaw/gateway-token-openclawstack \
  --query 'SecretString' --output text | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['token'])"

# View logs
aws logs tail /aws/ecs/containerinsights/openclaw-cluster/performance --follow

# Restart service
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --force-new-deployment

# Scale to zero (stop costs)
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --desired-count 0
```

## References

- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [OpenClaw Security](https://docs.openclaw.ai/gateway/security)
- [OpenClaw Configuration](https://docs.openclaw.ai/gateway/configuration)
