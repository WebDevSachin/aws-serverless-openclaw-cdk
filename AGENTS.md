# OpenClaw AWS Deploy - Agent Documentation

## Project Overview

- **OpenClaw**: Self-hosted autonomous agent platform (formerly Moltbot/Clawdbot)
- **Deployment**: AWS ECS Fargate with CDK
- **AI Provider**: OpenRouter (supports multiple models)

---

## ✅ Valid OpenClaw Configuration Keys (Research Complete)

Based on official documentation research from:
- https://docs.openclaw.ai/gateway/configuration-reference
- https://github.com/digitalknk/openclaw-runbook
- https://semgrep.dev/blog/2026/openclaw-security-engineers-cheat-sheet/

### Top-Level Valid Keys

```json
{
  "env": {},              // ✅ Environment variables
  "gateway": {},          // ✅ Gateway/server settings
  "channels": {},         // ✅ Messaging channels
  "agents": {},           // ✅ Agent configuration
  "models": {},           // ✅ Custom model providers
  "tools": {},            // ✅ Tool permissions
  "session": {},          // ✅ Session management
  "logging": {},          // ✅ Logging configuration
  "identity": {},         // ✅ Bot identity
  "routing": {},          // ✅ Message routing
  "messages": {},         // ✅ Message formatting
  "auth": {},             // ✅ Auth profiles
  "cron": {},             // ✅ Cron jobs
  "hooks": {},            // ✅ Webhooks
  "browser": {},          // ✅ Browser settings
  "skills": {},           // ✅ Skills configuration
  "ui": {},               // ✅ UI settings
  "canvasHost": {},       // ✅ Canvas hosting
  "plugins": {},          // ✅ Plugin settings
  "discovery": {},        // ✅ Service discovery
  "bindings": {},         // ✅ Custom bindings
  "web": {}               // ✅ Web channel settings
}
```

---

## ❌ INVALID Keys (Removed from your config)

These keys caused validation errors:

| Invalid Key | Why Invalid | Alternative |
|-------------|-------------|-------------|
| `commands` | Not a valid top-level key | Use `tools.allow: ["*"]` |
| `security` | Not a valid top-level key | Use `tools.elevated`, `sandbox` |
| `channels.whatsapp.provider` | Invalid sub-key | Remove, use `enabled: true` |
| `channels.whatsapp.web` | Invalid sub-key | Use top-level `web` key |
| `channels.whatsapp.autoReconnect` | Invalid sub-key | Not configurable |
| `channels.telegram.bot` | Invalid sub-key | Use `botToken` directly |
| `tools.browser.enabled` | Invalid path | Use top-level `browser` key |
| `tools.gateway.enabled` | Invalid path | Not valid |
| `tools.web.enabled` | Invalid path | Use `tools.allow` |
| `tools.process.enabled` | Invalid path | Not valid |
| `tools.fs.enabled` | Invalid path | Not valid |
| `agents.defaults.tools` | Invalid sub-key | Use top-level `tools` |
| `agents.main` | Invalid agent config | Only `agents.defaults` valid |

---

## 🔓 Full Permissions Configuration (Working)

Current deployed configuration with MAXIMUM permissions:

```json
{
  "env": {
    "OPENROUTER_API_KEY": "sk-or-v1-...",
    "SYSTEM_OPENROUTER_KEY": "sk-or-v1-..."
  },
  "gateway": {
    "port": 18789,
    "bind": "lan",
    "mode": "local",
    "auth": { "mode": "token" },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["*"],
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    },
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
  },
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "model": {
        "primary": "openrouter/moonshotai/kimi-k2.5",
        "fallbacks": [
          "openrouter/anthropic/claude-3.5-sonnet",
          "openrouter/google/gemini-2.0-flash-001"
        ]
      },
      "thinkingDefault": "high",
      "verboseDefault": "on",
      "elevatedDefault": "on",
      "timeoutSeconds": 3600,
      "maxConcurrent": 10,
      "sandbox": { "mode": "off", "perSession": false },
      "heartbeat": {
        "every": "1h",
        "model": "openrouter/moonshotai/kimi-k2.5",
        "target": "last",
        "prompt": "System health check. Report any issues."
      }
    }
  },
  "tools": {
    "allow": ["*"],
    "deny": [],
    "exec": {
      "backgroundMs": 10000,
      "timeoutSec": 7200,
      "cleanupMs": 3600000
    },
    "elevated": {
      "enabled": true,
      "allowFrom": {
        "webchat": ["*"],
        "session:*": ["*"]
      }
    }
  },
  "session": {
    "scope": "per-sender",
    "reset": { "mode": "idle", "idleMinutes": 1440 },
    "maintenance": { "mode": "enforce", "pruneAfter": "7d", "maxEntries": 10000 }
  },
  "logging": {
    "level": "debug",
    "consoleLevel": "debug",
    "redactSensitive": "off"
  }
}
```

---

## 🔑 Key Configuration Details

### Gateway Settings

| Key | Value | Description |
|-----|-------|-------------|
| `gateway.bind` | `"lan"` | Binds to all interfaces (0.0.0.0) |
| `gateway.auth.mode` | `"token"` | Token authentication required |
| `gateway.controlUi.allowInsecureAuth` | `true` | Allows HTTP without HTTPS |
| `gateway.controlUi.dangerouslyDisableDeviceAuth` | `true` | No device pairing |
| `gateway.controlUi.allowedOrigins` | `["*"]` | All origins allowed |

### Agent Settings

| Key | Value | Description |
|-----|-------|-------------|
| `agents.defaults.sandbox.mode` | `"off"` | No sandbox - full system access |
| `agents.defaults.elevatedDefault` | `"on"` | Elevated tools enabled by default |
| `agents.defaults.timeoutSeconds` | `3600` | 1 hour timeout |
| `agents.defaults.maxConcurrent` | `10` | 10 concurrent agents |

### Tool Settings

| Key | Value | Description |
|-----|-------|-------------|
| `tools.allow` | `["*"]` | ALL tools allowed |
| `tools.exec.timeoutSec` | `7200` | 2 hour exec timeout |
| `tools.elevated.enabled` | `true` | Elevated tools enabled |
| `tools.elevated.allowFrom` | `{"webchat": ["*"]}` | All webchat users can use elevated tools |

---

## 🌐 Access URLs

| Endpoint | URL | Authentication |
|----------|-----|----------------|
| ALB (HTTP) | http://OpenCl-OpenC-Xd6O8bjxsqx2-1359750568.ap-south-1.elb.amazonaws.com | Token only |
| CloudFront (HTTPS) | https://d15af3nsx4ckro.cloudfront.net | Basic Auth + Token |
| Basic Auth | admin / openclaw2025 | - |
| Gateway Token | GnSPN0qwdgbSOlJapflHjT2xvwOKax32 | From Secrets Manager |

---

## ⚠️ Security Warnings

1. **Sandbox is OFF** - Agent runs directly on host with full system access
2. **All tools allowed** - Can execute any command, modify any file
3. **Elevated tools enabled** - Can perform sensitive operations
4. **Device auth disabled** - No pairing required for connections
5. **All origins allowed** - Any domain can connect

**Use only in trusted environments!**

---

## 📚 Documentation Files Created

1. **OPENCLAW_VALID_KEYS.md** - Complete reference of all valid configuration keys
2. **docker/config/openclaw.json** - Working full-permissions configuration
3. **.agents/AGENTS.md** - This file

---

## 🛠️ Useful Commands

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

# Check service status
aws ecs describe-services \
  --cluster openclaw-cluster \
  --services openclaw-service
```

---

## 📋 Permissions Audit (2026-02-15)

### Current Permission Score: 9/10

OpenClaw has **near-maximum permissions** across all layers:

| Layer | Score | Status |
|-------|-------|--------|
| OpenClaw Config | 10/10 | ✅ MAXIMUM |
| AWS IAM | 7/10 | 🟡 HIGH (Bedrock, S3, EFS) |
| Container Runtime | 8/10 | 🟡 HIGH (non-root user) |
| File System | 10/10 | ✅ MAXIMUM (EFS + S3) |
| Network | 10/10 | ✅ MAXIMUM (unrestricted outbound) |

### What OpenClaw CAN Do

- ✅ Execute any command available in container
- ✅ Read/write/delete files in `/home/node/` and EFS
- ✅ Access AWS services (Bedrock, S3, Secrets Manager)
- ✅ Make HTTP/HTTPS requests to any external service
- ✅ Run background processes and daemons
- ✅ Use browser automation (Playwright)
- ✅ Process data with installed tools (jq, curl, aws-cli)

### What OpenClaw CANNOT Do

- ❌ Run `sudo` or root-level commands
- ❌ Install new packages at runtime
- ❌ Access Docker socket
- ❌ Access AWS services without IAM permissions (EC2, Lambda, DynamoDB)
- ❌ Modify system files outside `/home/node/`

### Enhancement Options

See detailed plans in [`/plans`](plans/) directory:
- **[PERMISSIONS_AUDIT.md](plans/PERMISSIONS_AUDIT.md)** - Complete permission analysis
- **[OPENCLAW_CONFIG_ENHANCEMENT.md](plans/OPENCLAW_CONFIG_ENHANCEMENT.md)** - OpenClaw config enhancements
- **[IAM_ENHANCEMENT_PLAN.md](plans/IAM_ENHANCEMENT_PLAN.md)** - AWS IAM expansion options

---

## References

- [OpenClaw Official Docs](https://docs.openclaw.ai/)
- [Configuration Reference](https://docs.openclaw.ai/gateway/configuration-reference)
- [OpenClaw Runbook](https://github.com/digitalknk/openclaw-runbook)
- [Security Cheat Sheet](https://semgrep.dev/blog/2026/openclaw-security-engineers-cheat-sheet/)
- [Permissions Audit](plans/PERMISSIONS_AUDIT.md)
- [Config Enhancement Plan](plans/OPENCLAW_CONFIG_ENHANCEMENT.md)
