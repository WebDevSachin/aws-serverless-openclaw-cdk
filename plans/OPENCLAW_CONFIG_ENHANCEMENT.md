# OpenClaw Configuration Enhancement Plan
## Maximum Permissions & Features

**Current Config**: [`docker/config/openclaw.json`](../docker/config/openclaw.json)  
**Documentation**: [`OPENCLAW_VALID_KEYS.md`](../OPENCLAW_VALID_KEYS.md)

---

## Current Configuration Analysis

### ✅ Already Configured (Maximum Permissions)

| Setting | Current Value | Status |
|---------|---------------|--------|
| `sandbox.mode` | `"off"` | ✅ MAXIMUM |
| `tools.allow` | `["*"]` | ✅ ALL TOOLS |
| `tools.elevated.enabled` | `true` | ✅ ENABLED |
| `elevatedDefault` | `"on"` | ✅ ON BY DEFAULT |
| `thinkingDefault` | `"high"` | ✅ HIGH |
| `verboseDefault` | `"on"` | ✅ VERBOSE |
| `timeoutSeconds` | `3600` | ✅ 1 HOUR |
| `tools.exec.timeoutSec` | `7200` | ✅ 2 HOURS |
| `maxConcurrent` | `10` | ✅ HIGH |
| `logging.level` | `"debug"` | ✅ MAXIMUM |
| `logging.redactSensitive` | `"off"` | ✅ NO REDACTION |
| `browser.enabled` | `true` | ✅ ENABLED |

---

## Missing/Optional Configuration Keys

Based on the official documentation, here are additional keys you can add:

### 1. Tools Profile (Optional)

```json
{
  "tools": {
    "profile": "full",  // ← ADD THIS
    "allow": ["*"],
    "deny": []
  }
}
```

**Options**: `"minimal"`, `"default"`, `"full"`  
**Recommendation**: Use `"full"` for maximum tool access

---

### 2. Image Model (Optional)

```json
{
  "agents": {
    "defaults": {
      "imageModel": {
        "primary": "openrouter/openai/gpt-4o"  // ← ADD THIS
      }
    }
  }
}
```

**Purpose**: Dedicated model for image analysis/generation  
**Recommendation**: Add if you need vision capabilities

---

### 3. Memory Search (Optional)

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "provider": "gemini",
        "model": "gemini-embedding-001"
      }
    }
  }
}
```

**Purpose**: Semantic search across agent memory  
**Recommendation**: Add for better context retrieval

---

### 4. Human Delay (Optional)

```json
{
  "agents": {
    "defaults": {
      "humanDelay": {
        "mode": "natural"  // ← ADD THIS
      }
    }
  }
}
```

**Options**: `"natural"`, `"off"`, `"fast"`  
**Purpose**: Simulate human typing delays  
**Recommendation**: Use `"off"` for maximum speed

---

### 5. Block Streaming Default (Optional)

```json
{
  "agents": {
    "defaults": {
      "blockStreamingDefault": "off"  // ← ADD THIS
    }
  }
}
```

**Purpose**: Control response streaming behavior  
**Recommendation**: `"off"` for streaming responses

---

### 6. User Timezone (Optional)

```json
{
  "agents": {
    "defaults": {
      "userTimezone": "Asia/Calcutta"  // ← ADD THIS
    }
  }
}
```

**Purpose**: Set default timezone for time-based operations  
**Recommendation**: Set to your local timezone

---

### 7. Media Max Size (Optional)

```json
{
  "agents": {
    "defaults": {
      "mediaMaxMb": 50  // ← ADD THIS (currently only in channels)
    }
  }
}
```

**Purpose**: Maximum media file size for agent operations  
**Recommendation**: Match channel limits (50 MB)

---

### 8. Model Aliases (Optional)

```json
{
  "agents": {
    "defaults": {
      "models": {
        "openrouter/anthropic/claude-opus-4": { "alias": "opus" },
        "openrouter/openai/gpt-4": { "alias": "gpt4" },
        "openrouter/google/gemini-2.0-flash-001": { "alias": "gemini" }
      }
    }
  }
}
```

**Purpose**: Short aliases for model switching  
**Recommendation**: Add for convenience

---

### 9. Session Reset Triggers (Optional)

```json
{
  "session": {
    "resetTriggers": ["/new", "/reset", "/clear"]  // ← ADD THIS
  }
}
```

**Purpose**: Commands that reset the session  
**Recommendation**: Add for user control

---

### 10. Session Store Path (Optional)

```json
{
  "session": {
    "store": "~/.openclaw/agents/default/sessions/sessions.json"  // ← ADD THIS
  }
}
```

**Purpose**: Custom session storage location  
**Recommendation**: Use default (auto-managed)

---

### 11. Typing Indicator (Optional)

```json
{
  "session": {
    "typingIntervalSeconds": 5  // ← ADD THIS
  }
}
```

**Purpose**: Show typing indicator every N seconds  
**Recommendation**: Add for better UX

---

### 12. Logging to File (Optional)

```json
{
  "logging": {
    "file": "/home/node/.openclaw/logs/openclaw.log"  // ← ADD THIS
  }
}
```

**Purpose**: Write logs to file (in addition to console)  
**Recommendation**: Add for persistent logging

---

### 13. Console Style (Optional)

```json
{
  "logging": {
    "consoleStyle": "pretty"  // ← ADD THIS
  }
}
```

**Options**: `"pretty"`, `"json"`  
**Recommendation**: `"pretty"` for human-readable logs

---

### 14. Identity/Personality (Optional)

```json
{
  "identity": {
    "name": "OpenClaw Agent",
    "theme": "helpful",
    "emoji": "🤖"
  }
}
```

**Purpose**: Customize bot personality  
**Recommendation**: Add for branding

---

### 15. Message Routing (Optional)

```json
{
  "routing": {
    "groupChat": {
      "mentionPatterns": ["@openclaw", "openclaw"],
      "historyLimit": 50
    },
    "queue": {
      "mode": "collect",
      "debounceMs": 1000,
      "cap": 20
    }
  }
}
```

**Purpose**: Control message routing in group chats  
**Recommendation**: Add if using group channels

---

### 16. Message Formatting (Optional)

```json
{
  "messages": {
    "messagePrefix": "[OpenClaw]",
    "responsePrefix": ">",
    "ackReaction": "👀",
    "doneReaction": "✅"
  }
}
```

**Purpose**: Customize message appearance  
**Recommendation**: Add for better UX

---

### 17. Custom Model Providers (Optional)

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "local-llm": {
        "baseUrl": "http://localhost:11434/v1",
        "apiKey": "ollama",
        "api": "openai-responses",
        "authHeader": true,
        "models": ["llama3", "mistral"]
      }
    }
  }
}
```

**Purpose**: Add custom model endpoints (Ollama, LiteLLM, etc.)  
**Recommendation**: Add if using local models

---

### 18. Cron Jobs (Optional)

```json
{
  "cron": {
    "daily-summary": {
      "schedule": "0 9 * * *",
      "agent": "main",
      "prompt": "Generate daily summary",
      "to": "whatsapp:+1234567890"
    }
  }
}
```

**Purpose**: Scheduled automated tasks  
**Recommendation**: Add for automation

---

### 19. Webhooks (Optional)

```json
{
  "hooks": {
    "on-message": {
      "url": "https://example.com/webhook",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

**Purpose**: External integrations  
**Recommendation**: Add for event notifications

---

### 20. Skills (Optional)

```json
{
  "skills": {
    "enabled": true,
    "path": "~/.openclaw/skills"
  }
}
```

**Purpose**: Custom skill modules  
**Recommendation**: Add for extensibility

---

### 21. UI Settings (Optional)

```json
{
  "ui": {
    "theme": "dark",
    "language": "en"
  }
}
```

**Purpose**: Control UI appearance  
**Recommendation**: Add for customization

---

### 22. Canvas Host (Optional)

```json
{
  "canvasHost": {
    "enabled": true,
    "port": 3000
  }
}
```

**Purpose**: Enable canvas/artifact hosting  
**Recommendation**: Add if using canvas features

---

### 23. Plugins (Optional)

```json
{
  "plugins": {
    "enabled": true,
    "path": "~/.openclaw/plugins"
  }
}
```

**Purpose**: Plugin system  
**Recommendation**: Add for extensibility

---

### 24. Service Discovery (Optional)

```json
{
  "discovery": {
    "enabled": true,
    "services": {
      "database": "postgresql://localhost:5432/openclaw"
    }
  }
}
```

**Purpose**: Service discovery for integrations  
**Recommendation**: Add if using external services

---

### 25. Custom Bindings (Optional)

```json
{
  "bindings": {
    "custom-tool": {
      "command": "/usr/local/bin/custom-tool",
      "args": ["--flag"]
    }
  }
}
```

**Purpose**: Custom tool bindings  
**Recommendation**: Add for custom integrations

---

## Enhanced Configuration (Maximum Features)

Here's the **complete enhanced configuration** with all recommended additions:

```json
{
  "env": {
    "OPENROUTER_API_KEY": "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",
    "SYSTEM_OPENROUTER_KEY": "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",
    "TELEGRAM_BOT_TOKEN": "",
    "OPENCLAW_GATEWAY_TOKEN": "GnSPN0qwdgbSOlJapflHjT2xvwOKax32"
  },
  "gateway": {
    "port": 18789,
    "bind": "lan",
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "GnSPN0qwdgbSOlJapflHjT2xvwOKax32"
    },
    "reload": {
      "mode": "hybrid",
      "debounceMs": 500
    },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": [
        "https://d15af3nsx4ckro.cloudfront.net",
        "http://localhost:18789",
        "*"
      ],
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    },
    "trustedProxies": [
      "0.0.0.0/0",
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16"
    ]
  },
  "channels": {
    "whatsapp": {
      "dmPolicy": "pairing",
      "allowFrom": ["*"],
      "groupPolicy": "allowlist",
      "textChunkLimit": 4000,
      "mediaMaxMb": 50,
      "sendReadReceipts": true
    },
    "telegram": {
      "enabled": true,
      "botToken": "",
      "dmPolicy": "pairing",
      "allowFrom": ["*"],
      "groupPolicy": "allowlist",
      "historyLimit": 50,
      "mediaMaxMb": 5
    }
  },
  "web": {
    "enabled": true,
    "heartbeatSeconds": 60,
    "reconnect": {
      "initialMs": 2000,
      "maxMs": 120000,
      "factor": 1.4,
      "jitter": 0.2,
      "maxAttempts": 0
    }
  },
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "userTimezone": "Asia/Calcutta",
      "model": {
        "primary": "openrouter/moonshotai/kimi-k2.5",
        "fallbacks": [
          "openrouter/anthropic/claude-3.5-sonnet",
          "openrouter/google/gemini-2.0-flash-001"
        ]
      },
      "imageModel": {
        "primary": "openrouter/openai/gpt-4o"
      },
      "models": {
        "openrouter/anthropic/claude-opus-4": { "alias": "opus" },
        "openrouter/openai/gpt-4": { "alias": "gpt4" },
        "openrouter/google/gemini-2.0-flash-001": { "alias": "gemini" }
      },
      "thinkingDefault": "high",
      "verboseDefault": "on",
      "elevatedDefault": "on",
      "blockStreamingDefault": "off",
      "humanDelay": {
        "mode": "off"
      },
      "timeoutSeconds": 3600,
      "mediaMaxMb": 50,
      "maxConcurrent": 10,
      "sandbox": {
        "mode": "off",
        "perSession": false
      },
      "heartbeat": {
        "every": "1h",
        "model": "openrouter/moonshotai/kimi-k2.5",
        "target": "last",
        "prompt": "System health check. Report any issues."
      },
      "memorySearch": {
        "provider": "gemini",
        "model": "gemini-embedding-001"
      }
    }
  },
  "tools": {
    "profile": "full",
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
        "session:*": ["*"],
        "whatsapp": ["*"],
        "telegram": ["*"]
      }
    }
  },
  "browser": {
    "enabled": true
  },
  "session": {
    "scope": "per-sender",
    "reset": {
      "mode": "idle",
      "idleMinutes": 1440
    },
    "resetTriggers": ["/new", "/reset", "/clear"],
    "maintenance": {
      "mode": "enforce",
      "pruneAfter": "7d",
      "maxEntries": 10000
    },
    "typingIntervalSeconds": 5
  },
  "logging": {
    "level": "debug",
    "consoleLevel": "debug",
    "consoleStyle": "pretty",
    "redactSensitive": "off",
    "file": "/home/node/.openclaw/logs/openclaw.log"
  },
  "identity": {
    "name": "OpenClaw Agent",
    "theme": "helpful",
    "emoji": "🤖"
  },
  "routing": {
    "groupChat": {
      "mentionPatterns": ["@openclaw", "openclaw"],
      "historyLimit": 50
    },
    "queue": {
      "mode": "collect",
      "debounceMs": 1000,
      "cap": 20
    }
  },
  "messages": {
    "messagePrefix": "[OpenClaw]",
    "responsePrefix": ">",
    "ackReaction": "👀",
    "doneReaction": "✅"
  }
}
```

---

## Deployment Steps

### Step 1: Backup Current Config

```bash
cp docker/config/openclaw.json docker/config/openclaw.json.backup
```

### Step 2: Update Configuration

Choose one of these options:

#### Option A: Minimal Additions (Recommended)
Add only the most useful keys:
- `tools.profile: "full"`
- `agents.defaults.userTimezone`
- `agents.defaults.humanDelay.mode: "off"`
- `agents.defaults.blockStreamingDefault: "off"`
- `session.resetTriggers`
- `session.typingIntervalSeconds`
- `logging.consoleStyle: "pretty"`
- `logging.file`

#### Option B: Full Enhancement
Use the complete enhanced configuration above

### Step 3: Rebuild Docker Image

```bash
# Build new image
docker build -t openclaw:enhanced -f docker/Dockerfile .

# Tag for ECR
docker tag openclaw:enhanced <account-id>.dkr.ecr.ap-south-1.amazonaws.com/openclaw:latest

# Push to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/openclaw:latest
```

### Step 4: Deploy to ECS

```bash
# Force new deployment
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --force-new-deployment

# Monitor deployment
aws ecs describe-services \
  --cluster openclaw-cluster \
  --services openclaw-service \
  --query 'services[0].deployments'
```

### Step 5: Verify Configuration

```bash
# Check logs for config loading
aws logs tail /aws/ecs/containerinsights/openclaw-cluster/performance --follow

# Look for:
# "Config loaded successfully"
# "Tools profile: full"
# "Sandbox mode: off"
```

---

## Testing Enhanced Configuration

### Test 1: Verify Tools Profile

```
User: What tools do you have access to?
Agent: [Should list ALL available tools]
```

### Test 2: Verify Image Model

```
User: Analyze this image: [upload image]
Agent: [Should use gpt-4o for vision]
```

### Test 3: Verify Memory Search

```
User: Remember: My favorite color is blue
[Later]
User: What's my favorite color?
Agent: [Should retrieve from memory: blue]
```

### Test 4: Verify Session Reset

```
User: /reset
Agent: [Session should reset]
```

### Test 5: Verify Logging

```bash
# Check log file exists
aws ecs execute-command \
  --cluster openclaw-cluster \
  --task <task-id> \
  --container openclaw \
  --interactive \
  --command "ls -la /home/node/.openclaw/logs/"
```

---

## Comparison: Current vs Enhanced

| Feature | Current | Enhanced | Benefit |
|---------|---------|----------|---------|
| Tools Profile | Not set | `"full"` | Explicit maximum access |
| Image Model | Not set | GPT-4o | Vision capabilities |
| Memory Search | Not set | Gemini embeddings | Better context retrieval |
| Human Delay | Not set | `"off"` | Faster responses |
| Block Streaming | Not set | `"off"` | Streaming responses |
| User Timezone | Not set | Asia/Calcutta | Correct time handling |
| Media Max | 50 MB (channels) | 50 MB (agent) | Consistent limits |
| Model Aliases | Not set | opus, gpt4, gemini | Easier model switching |
| Reset Triggers | Not set | /new, /reset, /clear | User control |
| Typing Indicator | Not set | 5 seconds | Better UX |
| Log File | Console only | File + Console | Persistent logs |
| Console Style | Default | Pretty | Readable logs |
| Identity | Not set | Custom name/emoji | Branding |
| Message Routing | Not set | Configured | Group chat support |
| Message Formatting | Not set | Custom prefix/reactions | Better UX |

---

## Recommendations

### ✅ Recommended Additions (Low Risk)

1. **`tools.profile: "full"`** - Explicit maximum tool access
2. **`agents.defaults.userTimezone`** - Correct time handling
3. **`agents.defaults.humanDelay.mode: "off"`** - Faster responses
4. **`agents.defaults.blockStreamingDefault: "off"`** - Streaming
5. **`session.resetTriggers`** - User control
6. **`logging.consoleStyle: "pretty"`** - Readable logs
7. **`logging.file`** - Persistent logging

### ⚠️ Optional Additions (Medium Risk)

8. **`agents.defaults.imageModel`** - Vision capabilities (costs more)
9. **`agents.defaults.memorySearch`** - Better memory (requires Gemini API)
10. **`agents.defaults.models`** - Model aliases (convenience)
11. **`identity`** - Custom branding
12. **`messages`** - Custom formatting

### 🔴 Advanced Additions (High Risk)

13. **`models.providers`** - Custom model endpoints (requires setup)
14. **`cron`** - Scheduled tasks (automation)
15. **`hooks`** - Webhooks (external integrations)
16. **`skills`** - Custom skills (requires development)
17. **`plugins`** - Plugin system (requires development)

---

## Summary

### Current Status: 9/10 Permissions

Your current configuration already has **maximum permissions** for:
- ✅ Sandbox disabled
- ✅ All tools allowed
- ✅ Elevated tools enabled
- ✅ High timeouts
- ✅ Debug logging
- ✅ Browser enabled

### Recommended Enhancements: +1/10 Features

Adding the recommended keys will give you:
- ✅ Explicit tool profile
- ✅ Better timezone handling
- ✅ Faster responses (no human delay)
- ✅ Streaming responses
- ✅ User session control
- ✅ Persistent logging
- ✅ Better UX (formatting, reactions)

### Final Score: 10/10 (Maximum Permissions + Maximum Features)

---

## Next Steps

1. Review this plan
2. Choose additions (Recommended, Optional, or Advanced)
3. Update [`docker/config/openclaw.json`](../docker/config/openclaw.json)
4. Rebuild and deploy Docker image
5. Test enhanced configuration
6. Monitor logs and behavior

---

## References

- [Current Configuration](../docker/config/openclaw.json)
- [Valid Configuration Keys](../OPENCLAW_VALID_KEYS.md)
- [OpenClaw Official Docs](https://docs.openclaw.ai/)
- [Configuration Reference](https://docs.openclaw.ai/gateway/configuration-reference)
