# OpenClaw AWS Deploy - Quick Start

## One-Command Deployment

```bash
cd /Users/sachinkumar/aws-openclaw/.agents/skills/openclaw-aws-deploy
./scripts/deploy.sh
```

This deploys everything: infrastructure, container, config.

## Test Deployment

```bash
./scripts/test-e2e.sh
```

Uses Playwright to verify:
- Page loads without errors
- No WebSocket origin errors
- Chat connects to gateway

## If Tests Fail

```bash
./scripts/debug.sh
```

Shows:
- ECS service status
- Target health
- Recent logs
- Common issues & fixes

## Fix Common Issues

```bash
./scripts/fix-origin.sh
```

Automatically configures:
- `allowedOrigins: ["*"]` - Fix origin errors
- `allowInsecureAuth: true` - Allow HTTP
- Uploads config to S3
- Restarts service

## Manual Steps (if needed)

```bash
# Just deploy infrastructure
cd /Users/sachinkumar/aws-openclaw
npx cdk deploy

# Just upload config
aws s3 cp docker/config/openclaw.json s3://openclaw-storage-019015402914/config/

# Just restart service
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --force-new-deployment
```

## Iterative Fix Process

```bash
# 1. Check current state
./scripts/debug.sh

# 2. Fix issues
./scripts/fix-origin.sh

# 3. Test again
./scripts/test-e2e.sh

# 4. Repeat until passing
```
