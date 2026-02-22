# OpenClaw Maximum Permissions Deployment Guide

**Changes Made**:
1. ✅ Dockerfile updated to run as root user (Container Runtime: 10/10)
2. ✅ OpenClaw config enhanced with all recommended features
3. ✅ Ready for deployment

---

## 🚨 CRITICAL SECURITY WARNING

The container now runs as **root user** with **maximum permissions**:
- ✅ Can use `sudo`
- ✅ Can install packages at runtime
- ✅ Can modify any file in the container
- ✅ Full system access

**⚠️ USE ONLY IN TRUSTED ENVIRONMENTS!**

---

## Changes Summary

### 1. Dockerfile Changes ([`docker/Dockerfile`](docker/Dockerfile))

```diff
- # Run as node user - EFS access point ensures proper ownership
- USER node
+ # ⚠️ SECURITY WARNING: Running as root for maximum permissions
+ # This allows sudo, package installation, and full system access
+ # Use only in trusted environments!
+ # Run as root user for maximum permissions
+ USER root
```

**Impact**: Container Runtime permissions increased from 8/10 to 10/10

---

### 2. OpenClaw Config Enhancements ([`docker/config/openclaw.json`](docker/config/openclaw.json))

**Added Keys**:
- `agents.defaults.userTimezone: "Asia/Calcutta"` - Correct time handling
- `agents.defaults.imageModel` - Vision capabilities (GPT-4o)
- `agents.defaults.models` - Model aliases (opus, gpt4, gemini)
- `agents.defaults.blockStreamingDefault: "off"` - Streaming responses
- `agents.defaults.humanDelay.mode: "off"` - Faster responses
- `agents.defaults.mediaMaxMb: 50` - Consistent media limits
- `agents.defaults.memorySearch` - Semantic search (Gemini embeddings)
- `tools.profile: "full"` - Explicit maximum tool access
- `session.resetTriggers` - User control (/new, /reset, /clear)
- `session.typingIntervalSeconds: 5` - Typing indicator
- `logging.consoleStyle: "pretty"` - Readable logs
- `logging.file` - Persistent logging
- `identity` - Custom branding (OpenClaw Agent 🤖)
- `routing` - Group chat support
- `messages` - Custom formatting (prefix, reactions)

**Impact**: More features, better UX, enhanced capabilities

---

## Deployment Steps

### Prerequisites

1. **AWS Credentials**: Configure AWS CLI
   ```bash
   aws configure
   # OR
   aws sso login
   ```

2. **Verify Credentials**:
   ```bash
   aws sts get-caller-identity
   ```

---

### Step 1: Build TypeScript

```bash
cd /Users/sachinkumar/aws-openclaw
npm run build
```

---

### Step 2: Build Docker Image

```bash
# Build image
docker build -t openclaw:maximum-permissions -f docker/Dockerfile .

# Verify image
docker images | grep openclaw
```

---

### Step 3: Get ECR Repository URI

```bash
# Get repository URI
ECR_URI=$(aws ecr describe-repositories \
  --repository-names openclaw \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR URI: $ECR_URI"
```

---

### Step 4: Login to ECR

```bash
# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="ap-south-1"

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
```

---

### Step 5: Tag and Push Image

```bash
# Tag image
docker tag openclaw:maximum-permissions $ECR_URI:latest

# Push to ECR
docker push $ECR_URI:latest

# Verify push
aws ecr describe-images \
  --repository-name openclaw \
  --query 'imageDetails[0].imageTags'
```

---

### Step 6: Force ECS Deployment

```bash
# Force new deployment
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --force-new-deployment \
  --region ap-south-1

# Monitor deployment
aws ecs describe-services \
  --cluster openclaw-cluster \
  --services openclaw-service \
  --region ap-south-1 \
  --query 'services[0].deployments'
```

---

### Step 7: Monitor Logs

```bash
# Tail logs
aws logs tail /aws/ecs/containerinsights/openclaw-cluster/performance \
  --follow \
  --region ap-south-1

# Look for:
# - "Config loaded successfully"
# - "Tools profile: full"
# - "Sandbox mode: off"
# - "Running as root user"
```

---

### Step 8: Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster openclaw-cluster \
  --services openclaw-service \
  --region ap-south-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Health:healthCheckGracePeriodSeconds}'

# Check task status
aws ecs list-tasks \
  --cluster openclaw-cluster \
  --service-name openclaw-service \
  --region ap-south-1

# Get task details
TASK_ARN=$(aws ecs list-tasks \
  --cluster openclaw-cluster \
  --service-name openclaw-service \
  --region ap-south-1 \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster openclaw-cluster \
  --tasks $TASK_ARN \
  --region ap-south-1 \
  --query 'tasks[0].{Status:lastStatus,Health:healthStatus,Started:startedAt}'
```

---

## Testing Maximum Permissions

### Test 1: Verify Root Access

```bash
# Via OpenClaw chat interface
User: What user am I running as?
Agent: [executes: whoami]
Expected: root

User: Can I use sudo?
Agent: [executes: sudo -v]
Expected: Success (no password required for root)
```

---

### Test 2: Install Package at Runtime

```bash
User: Install the 'htop' package
Agent: [executes: apt-get update && apt-get install -y htop]
Expected: Success

User: Run htop
Agent: [executes: htop -v]
Expected: htop version displayed
```

---

### Test 3: Modify System Files

```bash
User: Create a file in /etc/
Agent: [executes: echo "test" > /etc/openclaw-test.txt]
Expected: Success

User: Read the file
Agent: [executes: cat /etc/openclaw-test.txt]
Expected: "test"
```

---

### Test 4: Verify Enhanced Config

```bash
User: What's my timezone?
Agent: [Should use Asia/Calcutta timezone]

User: Analyze this image [upload image]
Agent: [Should use GPT-4o for vision]

User: /reset
Agent: [Session should reset]
```

---

### Test 5: Verify New Features

```bash
User: Remember: My favorite color is blue
[Later]
User: What's my favorite color?
Agent: [Should retrieve from memory: blue]

User: Switch to opus model
Agent: [Should switch to Claude Opus 4]
```

---

## Permission Scores After Deployment

| Layer | Before | After | Change |
|-------|--------|-------|--------|
| **OpenClaw Config** | 10/10 | 10/10 | ✅ No change (already max) |
| **AWS IAM** | 7/10 | 7/10 | ⚠️ No change (optional) |
| **Container Runtime** | 8/10 | **10/10** | ✅ **+2 (root user)** |
| **File System** | 10/10 | 10/10 | ✅ No change (already max) |
| **Network** | 10/10 | 10/10 | ✅ No change (already max) |

**Overall**: 9/10 → **9.4/10** (Container Runtime: 10/10)

---

## What OpenClaw Can Now Do (NEW)

### Previously COULD NOT Do:
- ❌ Run `sudo` commands
- ❌ Install packages at runtime
- ❌ Modify system files outside `/home/node/`

### Now CAN Do:
- ✅ **Run `sudo` commands** (root user)
- ✅ **Install packages at runtime** (`apt-get install`)
- ✅ **Modify any file in container** (full system access)
- ✅ **Create/modify system files** (`/etc/`, `/usr/`, etc.)
- ✅ **Change system configuration** (network, users, etc.)
- ✅ **Load kernel modules** (if available)

---

## Security Implications

### Before (node user):
- 🟡 Limited blast radius
- 🟡 Cannot modify system
- 🟡 Cannot install malware
- 🟡 Safer for untrusted code

### After (root user):
- 🔴 **Full system access**
- 🔴 **Can modify anything**
- 🔴 **Can install anything**
- 🔴 **Maximum security risk**

**⚠️ CRITICAL**: Use only in:
- Development environments
- Trusted internal networks
- Isolated test environments
- **NEVER** expose to public internet without additional security layers

---

## Rollback Plan

If issues arise, rollback to previous version:

### Quick Rollback

```bash
# Revert Dockerfile
git checkout HEAD~1 docker/Dockerfile

# Revert config
git checkout HEAD~1 docker/config/openclaw.json

# Rebuild and redeploy
docker build -t openclaw:rollback -f docker/Dockerfile .
docker tag openclaw:rollback $ECR_URI:latest
docker push $ECR_URI:latest

# Force deployment
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --force-new-deployment \
  --region ap-south-1
```

---

## Alternative: Use Deployment Script

```bash
# Use the automated deployment script
cd /Users/sachinkumar/aws-openclaw
bash scripts/deploy-local.sh

# The script will:
# 1. Validate AWS credentials
# 2. Build TypeScript
# 3. Build Docker image
# 4. Push to ECR
# 5. Deploy to ECS
# 6. Monitor deployment
```

---

## Monitoring After Deployment

### CloudWatch Logs

```bash
# View logs
aws logs tail /aws/ecs/containerinsights/openclaw-cluster/performance \
  --follow \
  --region ap-south-1 \
  --filter-pattern "ERROR"
```

### ECS Service Health

```bash
# Check service health
watch -n 5 'aws ecs describe-services \
  --cluster openclaw-cluster \
  --services openclaw-service \
  --region ap-south-1 \
  --query "services[0].{Running:runningCount,Desired:desiredCount,Status:status}"'
```

### Cost Monitoring

```bash
# Check costs
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

---

## Troubleshooting

### Issue: Deployment Fails

**Symptoms**: ECS service fails to start new tasks

**Causes**:
1. Docker image not pushed to ECR
2. ECS task definition not updated
3. Health check failing

**Solution**:
```bash
# Check ECR image
aws ecr describe-images --repository-name openclaw

# Check task definition
aws ecs describe-task-definition --task-definition openclaw-task

# Check task logs
aws logs tail /aws/ecs/containerinsights/openclaw-cluster/performance --follow
```

---

### Issue: Permission Denied (Still)

**Symptoms**: Still getting permission denied errors

**Causes**:
1. Old container still running
2. EFS access point enforcing node:node ownership
3. AWS IAM permissions missing

**Solution**:
```bash
# Force stop all tasks
aws ecs list-tasks --cluster openclaw-cluster --service-name openclaw-service | \
  jq -r '.taskArns[]' | \
  xargs -I {} aws ecs stop-task --cluster openclaw-cluster --task {}

# Wait for new tasks to start
aws ecs wait services-stable --cluster openclaw-cluster --services openclaw-service
```

---

### Issue: Config Not Loading

**Symptoms**: New config features not working

**Causes**:
1. Config file not copied to EFS
2. Syntax error in JSON
3. Invalid configuration keys

**Solution**:
```bash
# Validate JSON
cat docker/config/openclaw.json | jq '.'

# Check config in container
aws ecs execute-command \
  --cluster openclaw-cluster \
  --task <task-id> \
  --container openclaw \
  --interactive \
  --command "cat /home/node/.openclaw/openclaw.json | jq '.'"
```

---

## Next Steps After Deployment

1. ✅ **Verify deployment** - Check service is running
2. ✅ **Test permissions** - Run test commands via chat
3. ✅ **Monitor logs** - Watch for errors
4. ✅ **Test new features** - Try image model, memory search, etc.
5. ⚠️ **Monitor costs** - Check for unexpected charges
6. ⚠️ **Review security** - Ensure proper network isolation

---

## Summary

### Changes Made:
1. ✅ Dockerfile: Changed from `USER node` to `USER root`
2. ✅ Config: Added 15+ new configuration keys
3. ✅ Documentation: Created deployment guide

### Permission Increase:
- **Container Runtime**: 8/10 → **10/10** ✅
- **Overall Score**: 9/10 → **9.4/10** ✅

### New Capabilities:
- ✅ Can use `sudo`
- ✅ Can install packages
- ✅ Can modify system files
- ✅ Vision capabilities (GPT-4o)
- ✅ Memory search (Gemini)
- ✅ Model aliases
- ✅ Better UX (formatting, reactions)

### Security Warning:
- 🔴 **MAXIMUM SECURITY RISK**
- 🔴 **Use only in trusted environments**
- 🔴 **Never expose to public internet**

---

## Access URLs (After Deployment)

- **CloudFront**: https://d15af3nsx4ckro.cloudfront.net
- **Basic Auth**: admin / openclaw2025
- **Gateway Token**: GnSPN0qwdgbSOlJapflHjT2xvwOKax32
- **Chat**: /chat?session=agent%3Amain%3AGnSPN0qwdgbSOlJapflHjT2xvwOKax32

---

**Ready to deploy!** Follow the steps above to deploy the maximum permissions configuration.
