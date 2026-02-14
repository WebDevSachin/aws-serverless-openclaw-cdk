# OpenClaw Configuration Reference

## Gateway Configuration

The `gateway` section controls the OpenClaw gateway behavior, including WebSocket connections, authentication, and security.

### controlUi Settings

```json
{
  "gateway": {
    "controlUi": {
      "allowedOrigins": ["*"],
      "allowInsecureAuth": true,
      "enableIframe": true,
      "dangerouslyDisableDeviceAuth": false
    }
  }
}
```

#### allowedOrigins
- **Type**: `string[]`
- **Default**: `[]` (empty = only same-origin)
- **Purpose**: Specifies which origins can connect to the Control UI WebSocket
- **Common values**:
  - `["*"]` - Allow all origins (use with caution)
  - `["https://dqq18fqtn9gsx.cloudfront.net"]` - Specific CloudFront domain
  - `["https://*.cloudfront.net"]` - All CloudFront domains

**Issue fixed**: "origin not allowed" (WebSocket error 1008)

#### allowInsecureAuth
- **Type**: `boolean`
- **Default**: `false`
- **Purpose**: Allow Control UI to work over HTTP (non-HTTPS)
- **When to use**: 
  - Testing/development environments
  - Internal networks where HTTPS is not available
  - ALB-only deployments (before CloudFront is configured)

**Issue fixed**: "control ui requires HTTPS or localhost (secure context)"

**Security warning**: Only enable this for testing. Production should always use HTTPS.

#### enableIframe
- **Type**: `boolean`
- **Default**: `false`
- **Purpose**: Allow OpenClaw to be embedded in iframes
- **When to use**: When embedding in dashboards or other applications

#### dangerouslyDisableDeviceAuth
- **Type**: `boolean`
- **Default**: `false`
- **Purpose**: Disable device authentication for node connections
- **When to use**: Never in production. For testing only.

### bind Setting

```json
{
  "gateway": {
    "bind": "lan"
  }
}
```

- **Type**: `string`
- **Options**: `"auto"`, `"loopback"`, `"lan"`
- **Default**: `"auto"`
- **Purpose**: Controls which network interfaces the gateway listens on

| Value | Description | Use Case |
|-------|-------------|----------|
| `auto` | Automatic detection | Default, works in most cases |
| `loopback` | localhost only | Single-machine deployments |
| `lan` | All interfaces (0.0.0.0) | Docker, ECS, server deployments |

**For AWS ECS Fargate**: Use `"lan"` to allow ALB health checks.

## Complete Working Config

```json
{
  "name": "OpenClaw",
  "version": "1.0.0",
  "server": {
    "port": 18789,
    "host": "0.0.0.0"
  },
  "gateway": {
    "bind": "lan",
    "controlUi": {
      "allowedOrigins": ["*"],
      "allowInsecureAuth": true,
      "enableIframe": true
    }
  },
  "ai": {
    "provider": "bedrock",
    "model": "amazon.nova-micro-v1:0",
    "region": "ap-south-1",
    "parameters": {
      "maxTokens": 4096,
      "temperature": 0.7,
      "topP": 0.9
    }
  },
  "storage": {
    "type": "filesystem",
    "path": "/workspace",
    "configPath": "/workspace/config",
    "memoryPath": "/workspace/memory"
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

## Common Error Messages

### "origin not allowed"
**Error code**: WebSocket 1008
**Fix**: Add `"allowedOrigins": ["*"]` to gateway.controlUi

### "control ui requires HTTPS or localhost"
**Fix**: Add `"allowInsecureAuth": true` to gateway.controlUi

### "origin not allowed (open the Control UI from the gateway host)"
**Fix**: This is the same as the origin error - update allowedOrigins

### WebSocket disconnects immediately
**Causes**:
1. Origin not allowed
2. HTTPS required but using HTTP
3. Auth token missing or invalid

## GitHub Issues Reference

- **Issue #9358**: Origin validation incorrectly applied to node connections
- **Issue #1922**: Android app disconnects before handshake
- **PR #10695**: Fix for private IP connections without Origin header

## Deployment Checklist

- [ ] Config has `allowedOrigins: ["*"]` for CloudFront
- [ ] Config has `allowInsecureAuth: true` for HTTP ALB
- [ ] Config has `bind: "lan"` for ECS
- [ ] Config uploaded to S3
- [ ] ECS service restarted after config update
- [ ] Target group shows healthy
- [ ] HTTP 200 response from ALB
- [ ] No WebSocket errors in browser console
