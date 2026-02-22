# OpenClaw Valid Configuration Keys - Complete Reference

Based on official documentation at https://docs.openclaw.ai/gateway/configuration-reference

## Top-Level Keys

```json
{
  "env": {},                    // Environment variables
  "gateway": {},                // Gateway/server settings
  "channels": {},               // Messaging channels (WhatsApp, Telegram, etc.)
  "agents": {},                 // Agent configuration
  "models": {},                 // Custom model providers
  "tools": {},                  // Tool permissions and settings
  "session": {},                // Session management
  "logging": {},                // Logging configuration
  "identity": {},               // Bot identity/personality
  "routing": {},                // Message routing
  "messages": {},               // Message formatting
  "auth": {},                   // Auth profiles
  "cron": {},                   // Cron jobs
  "hooks": {},                  // Webhooks
  "browser": {},                // Browser settings
  "skills": {},                 // Skills configuration
  "ui": {},                     // UI settings
  "canvasHost": {},             // Canvas hosting
  "plugins": {},                // Plugin settings
  "discovery": {},              // Service discovery
  "bindings": {},               // Custom bindings
  "web": {}                     // Web channel settings
}
```

---

## 1. env

Environment variable configuration.

```json
{
  "env": {
    "OPENROUTER_API_KEY": "sk-or-...",
    "vars": {
      "GROQ_API_KEY": "gsk-...",
      "CUSTOM_KEY": "value"
    },
    "shellEnv": {
      "enabled": true,
      "timeoutMs": 15000
    }
  }
}
```

**Valid keys:**
- `OPENROUTER_API_KEY` (string)
- `vars` (object) - Additional environment variables
- `shellEnv.enabled` (boolean)
- `shellEnv.timeoutMs` (number)

---

## 2. gateway

Gateway server configuration.

```json
{
  "gateway": {
    "port": 18789,
    "bind": "lan",
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "${OPENCLAW_GATEWAY_TOKEN}"
    },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["*"],
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    },
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
    "reload": {
      "mode": "hybrid",
      "debounceMs": 300
    }
  }
}
```

**Valid keys:**
- `port` (number) - Server port
- `bind` (string) - "lan" or "localhost"
- `mode` (string) - "local"
- `auth.mode` (string) - "token" or "password"
- `auth.token` (string) - Token value
- `auth.password` (string) - Password value
- `controlUi.enabled` (boolean)
- `controlUi.allowedOrigins` (array of strings)
- `controlUi.allowInsecureAuth` (boolean)
- `controlUi.dangerouslyDisableDeviceAuth` (boolean)
- `trustedProxies` (array of strings) - CIDR ranges
- `reload.mode` (string) - "hybrid", "hot", "restart", "off"
- `reload.debounceMs` (number)

---

## 3. channels

Messaging channel configuration.

### 3.1 WhatsApp
```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "dmPolicy": "pairing",
      "allowFrom": ["+15555550123"],
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["+15555550123"],
      "textChunkLimit": 4000,
      "chunkMode": "length",
      "mediaMaxMb": 50,
      "sendReadReceipts": true,
      "groups": {
        "*": { "requireMention": true }
      }
    }
  }
}
```

### 3.2 Telegram
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "your-bot-token",
      "tokenFile": "/path/to/token",
      "dmPolicy": "pairing",
      "allowFrom": ["tg:123456789"],
      "groupPolicy": "allowlist",
      "groups": {},
      "historyLimit": 50,
      "replyToMode": "first",
      "linkPreview": true,
      "streamMode": "partial",
      "mediaMaxMb": 5,
      "configWrites": true
    }
  }
}
```

### 3.3 Discord
```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "your-bot-token",
      "dmPolicy": "pairing",
      "allowFrom": ["1234567890"],
      "guilds": {},
      "historyLimit": 20,
      "textChunkLimit": 2000,
      "allowBots": false,
      "mediaMaxMb": 8
    }
  }
}
```

### 3.4 Slack
```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "botToken": "xoxb-...",
      "appToken": "xapp-...",
      "dmPolicy": "pairing",
      "channels": {},
      "historyLimit": 50,
      "allowBots": false
    }
  }
}
```

### 3.5 Google Chat
```json
{
  "channels": {
    "googlechat": {
      "enabled": true,
      "serviceAccountFile": "/path/to/service-account.json",
      "webhookPath": "/googlechat"
    }
  }
}
```

### 3.6 Signal
```json
{
  "channels": {
    "signal": {
      "enabled": true,
      "account": "+1234567890"
    }
  }
}
```

### 3.7 iMessage
```json
{
  "channels": {
    "imessage": {
      "enabled": true
    }
  }
}
```

---

## 4. agents

Agent runtime configuration.

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "userTimezone": "America/New_York",
      "model": {
        "primary": "openrouter/moonshotai/kimi-k2.5",
        "fallbacks": ["anthropic/claude-3.5-sonnet"]
      },
      "imageModel": {
        "primary": "openai/gpt-4o"
      },
      "models": {
        "anthropic/claude-opus-4": { "alias": "opus" }
      },
      "thinkingDefault": "low",
      "verboseDefault": "off",
      "elevatedDefault": "on",
      "blockStreamingDefault": "off",
      "humanDelay": { "mode": "natural" },
      "timeoutSeconds": 600,
      "mediaMaxMb": 5,
      "maxConcurrent": 3,
      "heartbeat": {
        "every": "30m",
        "model": "anthropic/claude-3-haiku",
        "target": "last",
        "to": "+15555550123",
        "prompt": "HEARTBEAT"
      },
      "sandbox": {
        "mode": "non-main",
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
      },
      "memorySearch": {
        "provider": "gemini",
        "model": "gemini-embedding-001"
      }
    }
  }
}
```

**Valid keys in agents.defaults:**
- `workspace` (string)
- `userTimezone` (string)
- `model.primary` (string)
- `model.fallbacks` (array of strings)
- `imageModel.primary` (string)
- `models` (object with aliases)
- `thinkingDefault` (string) - "low", "medium", "high"
- `verboseDefault` (string) - "on", "off"
- `elevatedDefault` (string) - "on", "off"
- `blockStreamingDefault` (string)
- `humanDelay.mode` (string)
- `timeoutSeconds` (number)
- `mediaMaxMb` (number)
- `maxConcurrent` (number)
- `heartbeat.every` (string)
- `heartbeat.model` (string)
- `heartbeat.target` (string)
- `heartbeat.to` (string)
- `heartbeat.prompt` (string)
- `sandbox.mode` (string) - "non-main", "off", "full"
- `sandbox.perSession` (boolean)
- `sandbox.workspaceRoot` (string)
- `sandbox.docker.image` (string)
- `sandbox.docker.workdir` (string)
- `sandbox.docker.readOnlyRoot` (boolean)
- `sandbox.docker.tmpfs` (array)
- `sandbox.docker.network` (string)
- `sandbox.docker.user` (string)
- `memorySearch.provider` (string)
- `memorySearch.model` (string)

---

## 5. models

Custom model provider configuration.

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "custom-proxy": {
        "baseUrl": "http://localhost:4000/v1",
        "apiKey": "LITELLM_KEY",
        "api": "openai-responses",
        "authHeader": true,
        "headers": {},
        "models": []
      }
    }
  }
}
```

---

## 6. tools

Tool permissions and configuration.

```json
{
  "tools": {
    "profile": "full",
    "allow": ["*"],
    "deny": [],
    "exec": {
      "backgroundMs": 10000,
      "timeoutSec": 1800,
      "cleanupMs": 1800000
    },
    "elevated": {
      "enabled": true,
      "allowFrom": {
        "webchat": ["*"],
        "whatsapp": ["+15555550123"],
        "telegram": ["123456789"]
      }
    }
  }
}
```

**Valid keys:**
- `profile` (string) - "minimal", "default", "full"
- `allow` (array of strings) - Tool names or ["*"] for all
- `deny` (array of strings) - Tool names to deny
- `exec.backgroundMs` (number)
- `exec.timeoutSec` (number)
- `exec.cleanupMs` (number)
- `elevated.enabled` (boolean)
- `elevated.allowFrom` (object with channel-specific allowlists)

---

## 7. session

Session management configuration.

```json
{
  "session": {
    "scope": "per-sender",
    "reset": {
      "mode": "idle",
      "idleMinutes": 60,
      "atHour": 4
    },
    "resetTriggers": ["/new", "/reset"],
    "store": "~/.openclaw/agents/default/sessions/sessions.json",
    "maintenance": {
      "mode": "enforce",
      "pruneAfter": "30d",
      "maxEntries": 500,
      "rotateBytes": "10mb"
    },
    "typingIntervalSeconds": 5
  }
}
```

**Valid keys:**
- `scope` (string) - "per-sender", "shared"
- `reset.mode` (string) - "idle", "daily", "never"
- `reset.idleMinutes` (number)
- `reset.atHour` (number)
- `resetTriggers` (array of strings)
- `store` (string)
- `maintenance.mode` (string) - "enforce", "warn"
- `maintenance.pruneAfter` (string)
- `maintenance.maxEntries` (number)
- `maintenance.rotateBytes` (string)
- `typingIntervalSeconds` (number)

---

## 8. logging

Logging configuration.

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools"
  }
}
```

**Valid keys:**
- `level` (string) - "debug", "info", "warn", "error"
- `file` (string)
- `consoleLevel` (string)
- `consoleStyle` (string) - "pretty", "json"
- `redactSensitive` (string) - "off", "tools", "all"

---

## 9. identity

Bot identity configuration.

```json
{
  "identity": {
    "name": "Assistant",
    "theme": "helpful",
    "emoji": "🤖"
  }
}
```

---

## 10. routing

Message routing configuration.

```json
{
  "routing": {
    "groupChat": {
      "mentionPatterns": ["@bot", "bot"],
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

---

## 11. messages

Message formatting configuration.

```json
{
  "messages": {
    "messagePrefix": "[bot]",
    "responsePrefix": ">",
    "ackReaction": "👀",
    "ackReactionScope": "group-mentions"
  }
}
```

---

## 12. auth

Auth profile configuration.

```json
{
  "auth": {
    "profiles": {
      "anthropic:default": {
        "provider": "anthropic",
        "mode": "api_key"
      }
    },
    "order": {
      "anthropic": ["anthropic:default"]
    }
  }
}
```

---

## 13. cron

Cron job configuration.

```json
{
  "cron": {
    "enabled": true,
    "store": "~/.openclaw/cron/cron.json",
    "maxConcurrentRuns": 2,
    "sessionRetention": "24h"
  }
}
```

---

## 14. hooks

Webhook configuration.

```json
{
  "hooks": {
    "enabled": true,
    "path": "/hooks",
    "token": "shared-secret",
    "presets": ["gmail"]
  }
}
```

---

## 15. browser

Browser configuration.

```json
{
  "browser": {
    "enabled": true,
    "control": true
  }
}
```

---

## 16. skills

Skills configuration.

```json
{
  "skills": {
    "allow": ["*"],
    "deny": [],
    "paths": ["~/.openclaw/skills"]
  }
}
```

---

## 17. ui

UI configuration.

```json
{
  "ui": {
    "theme": "dark"
  }
}
```

---

## 18. web

Web channel configuration (for WhatsApp Baileys).

```json
{
  "web": {
    "enabled": true,
    "heartbeatSeconds": 60,
    "reconnect": {
      "initialMs": 2000,
      "maxMs": 120000,
      "factor": 1.4
    }
  }
}
```

---

## INVALID KEYS (Will cause errors)

These keys are NOT valid and will cause config validation errors:

❌ `commands` - Not a valid top-level key
❌ `security` - Not a valid top-level key  
❌ `channels.whatsapp.provider` - Not valid
❌ `channels.whatsapp.web` - Not valid (use top-level `web`)
❌ `channels.whatsapp.autoReconnect` - Not valid
❌ `channels.telegram.bot` - Not valid
❌ `tools.browser.enabled` - Not valid (use top-level `browser`)
❌ `tools.gateway.enabled` - Not valid
❌ `tools.web.enabled` - Not valid
❌ `tools.web.search` - Not valid
❌ `tools.process.enabled` - Not valid
❌ `tools.fs.enabled` - Not valid
❌ `session.reset.atHour` - Only valid with mode "daily"
❌ `agents.defaults.tools` - Not valid
❌ `agents.main` - Not valid (no per-agent config here)

---

## Full Working Example - Maximum Permissions

```json
{
  "env": {
    "OPENROUTER_API_KEY": "sk-or-v1-...",
    "vars": {}
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
        "fallbacks": ["openrouter/anthropic/claude-3.5-sonnet"]
      },
      "thinkingDefault": "high",
      "verboseDefault": "on",
      "elevatedDefault": "on",
      "timeoutSeconds": 3600,
      "maxConcurrent": 10,
      "sandbox": { "mode": "off", "perSession": false }
    }
  },
  "tools": {
    "allow": ["*"],
    "deny": [],
    "exec": {
      "timeoutSec": 7200
    },
    "elevated": {
      "enabled": true,
      "allowFrom": { "webchat": ["*"] }
    }
  },
  "session": {
    "scope": "per-sender",
    "reset": { "mode": "idle", "idleMinutes": 1440 }
  },
  "logging": {
    "level": "debug",
    "redactSensitive": "off"
  }
}
```

---

## Documentation Sources

- Official: https://docs.openclaw.ai/gateway/configuration-reference
- Examples: https://github.com/digitalknk/openclaw-runbook
- Security: https://semgrep.dev/blog/2026/openclaw-security-engineers-cheat-sheet/
