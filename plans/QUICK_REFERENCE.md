# OpenClaw Maximum Permissions - Quick Reference

**Last Updated**: 2026-02-15  
**Deployment**: AWS ECS Fargate (Revision 40)  
**Status**: ✅ DEPLOYED & HEALTHY

---

## 🎯 Permission Score: 9/10

OpenClaw has **near-maximum permissions** for a containerized application.

---

## ✅ What OpenClaw CAN Do

### File Operations
```bash
# Read/write/delete files
cat /home/node/.openclaw/openclaw.json
echo "data" > /home/node/test.txt
rm /home/node/test.txt

# EFS persistent storage
ls -la /home/node/.openclaw/
mkdir -p /home/node/.openclaw/workspace/project
```

### AWS Operations
```bash
# S3 storage
aws s3 ls s3://openclaw-storage-*/
aws s3 cp file.txt s3://openclaw-storage-*/
aws s3 rm s3://openclaw-storage-*/file.txt

# Secrets Manager (read-only)
aws secretsmanager get-secret-value --secret-id openclaw/gateway-token-*

# Bedrock AI (via SDK)
# Handled by OpenClaw's model integration
```

### Process Management
```bash
# Run background processes
node server.js &
python script.py &

# View processes
ps aux | grep node

# Kill processes (owned by node user)
kill <pid>
```

### Network Operations
```bash
# HTTP requests
curl https://api.example.com
wget https://example.com/file.zip

# DNS lookup
nslookup example.com
dig example.com
```

### Data Processing
```bash
# JSON processing
cat data.json | jq '.field'

# Text processing
grep "pattern" file.txt
sed 's/old/new/g' file.txt
awk '{print $1}' file.txt

# Compression
tar -czf archive.tar.gz directory/
unzip file.zip
```

### Browser Automation
- ✅ Playwright enabled
- ✅ Can scrape websites
- ✅ Can fill forms
- ✅ Can take screenshots

---

## ❌ What OpenClaw CANNOT Do

### System Administration
```bash
sudo apt-get install package  ❌  # No root access
systemctl restart service     ❌  # No systemd
iptables -A INPUT ...         ❌  # No firewall access
mount /dev/sda1 /mnt          ❌  # No mount
```

### Container Operations
```bash
docker ps                     ❌  # No Docker socket
docker run ...                ❌  # No container control
```

### AWS Services (Without IAM)
```bash
aws ec2 describe-instances    ❌  # No EC2 permissions
aws lambda invoke ...         ❌  # No Lambda permissions
aws dynamodb scan ...         ❌  # No DynamoDB permissions
```

---

## 🔧 Current Configuration

### OpenClaw Settings
```json
{
  "sandbox.mode": "off",              // ✅ Full host access
  "tools.allow": ["*"],               // ✅ All tools
  "tools.elevated.enabled": true,     // ✅ Elevated ops
  "elevatedDefault": "on",            // ✅ On by default
  "timeoutSeconds": 3600,             // ✅ 1 hour
  "tools.exec.timeoutSec": 7200,      // ✅ 2 hours
  "maxConcurrent": 10,                // ✅ 10 agents
  "logging.level": "debug",           // ✅ Debug logs
  "browser.enabled": true             // ✅ Browser tools
}
```

### AWS IAM Permissions
- ✅ Bedrock (all models)
- ✅ S3 (read/write/delete)
- ✅ EFS (full access)
- ✅ Secrets Manager (read-only)
- ✅ CloudWatch Logs (write)
- ❌ EC2, Lambda, DynamoDB, etc.

### Container Runtime
- ✅ Runs as `node` user (non-root)
- ✅ Has `aws-cli`, `jq`, `curl`
- ✅ Can execute any installed command
- ❌ Cannot use `sudo`
- ❌ Cannot install packages

### File System
- ✅ Full access to `/home/node/`
- ✅ Full access to EFS mount
- ✅ Full access to S3 bucket
- ❌ Read-only for system files

### Network
- ✅ Unrestricted outbound (all ports)
- ✅ Can connect to any external service
- ❌ Inbound only from ALB

---

## 📊 Permission Layers

| Layer | Score | Details |
|-------|-------|---------|
| **OpenClaw Config** | 10/10 | All tools, no sandbox, elevated mode |
| **AWS IAM** | 7/10 | Bedrock, S3, EFS; missing EC2, Lambda, etc. |
| **Container Runtime** | 8/10 | Non-root user; can't sudo or install packages |
| **File System** | 10/10 | Full EFS access, S3 access |
| **Network** | 10/10 | Unrestricted outbound, all protocols |

**Overall**: 9/10 - Near-maximum permissions

---

## 🚀 Quick Commands

### Check Service Status
```bash
aws ecs describe-services \
  --cluster openclaw-cluster \
  --services openclaw-service
```

### View Logs
```bash
aws logs tail /aws/ecs/containerinsights/openclaw-cluster/performance --follow
```

### Restart Service
```bash
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --force-new-deployment
```

### Get Gateway Token
```bash
aws secretsmanager get-secret-value \
  --secret-id openclaw/gateway-token-openclawstack \
  --query 'SecretString' --output text | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['token'])"
```

### Scale Service
```bash
# Scale up
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --desired-count 2

# Scale down (stop costs)
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --desired-count 0
```

---

## 🌐 Access URLs

| Endpoint | URL | Auth |
|----------|-----|------|
| **CloudFront (HTTPS)** | https://d15af3nsx4ckro.cloudfront.net | Basic Auth + Token |
| **ALB (HTTP)** | http://OpenCl-OpenC-Xd6O8bjxsqx2-1359750568.ap-south-1.elb.amazonaws.com | Token only |
| **Chat Interface** | /chat?session=agent%3Amain%3A<TOKEN> | - |
| **Control UI** | / | Basic Auth |

**Basic Auth**: `admin` / `openclaw2025`  
**Gateway Token**: `GnSPN0qwdgbSOlJapflHjT2xvwOKax32`

---

## 📈 Enhancement Options

### Option 1: Add More OpenClaw Features
See [`OPENCLAW_CONFIG_ENHANCEMENT.md`](OPENCLAW_CONFIG_ENHANCEMENT.md)

**Recommended Additions**:
- `tools.profile: "full"` - Explicit maximum access
- `agents.defaults.userTimezone` - Correct time handling
- `agents.defaults.imageModel` - Vision capabilities
- `agents.defaults.memorySearch` - Better context retrieval
- `logging.file` - Persistent logging

**Impact**: More features, same permissions

---

### Option 2: Add More AWS Permissions
See [`IAM_ENHANCEMENT_PLAN.md`](IAM_ENHANCEMENT_PLAN.md)

**Conservative (Recommended)**:
- DynamoDB (read/write)
- Lambda (invoke)
- SQS/SNS (messaging)
- SSM Parameter Store (config)
- CloudWatch (metrics)

**Moderate**:
- + EC2 (read-only)
- + ECS (read-only)
- + Secrets Manager (write)

**Maximum (⚠️ High Risk)**:
- + EC2 (full control)
- + Lambda (full control)
- + S3 (all buckets)
- + IAM (read-only)

**Impact**: More AWS service access, potential cost increase

---

## ⚠️ Security Warnings

### Current Security Posture: HIGH RISK

| Setting | Status | Risk |
|---------|--------|------|
| Sandbox disabled | ❌ OFF | 🔴 HIGH |
| All tools allowed | ✅ ON | 🔴 HIGH |
| Elevated tools | ✅ ON | 🔴 HIGH |
| Device auth disabled | ❌ OFF | 🟡 MEDIUM |
| All origins allowed | ✅ ON | 🟡 MEDIUM |
| Sensitive data redaction | ❌ OFF | 🟡 MEDIUM |

**Recommendation**: Use only in trusted environments!

---

## 🧪 Testing Permissions

### Test File Access
```bash
# Via OpenClaw chat
User: Create a test file at /home/node/test.txt with content "hello"
Agent: [executes: echo "hello" > /home/node/test.txt]

User: Read the file
Agent: [executes: cat /home/node/test.txt]
```

### Test AWS Access
```bash
User: List files in S3 bucket
Agent: [executes: aws s3 ls s3://openclaw-storage-*/]

User: Get the gateway token secret
Agent: [executes: aws secretsmanager get-secret-value ...]
```

### Test Command Execution
```bash
User: Run a background process that sleeps for 10 seconds
Agent: [executes: sleep 10 &]

User: Show running processes
Agent: [executes: ps aux | grep sleep]
```

### Test Network Access
```bash
User: Check my public IP
Agent: [executes: curl https://api.ipify.org]

User: Test OpenRouter API
Agent: [executes: curl https://openrouter.ai/api/v1/models]
```

---

## 📚 Documentation

### Core Documents
- [`AGENTS.md`](../AGENTS.md) - Agent documentation
- [`OPENCLAW_VALID_KEYS.md`](../OPENCLAW_VALID_KEYS.md) - Valid config keys
- [`docker/config/openclaw.json`](../docker/config/openclaw.json) - Current config

### Enhancement Plans
- [`PERMISSIONS_AUDIT.md`](PERMISSIONS_AUDIT.md) - Complete permission analysis
- [`OPENCLAW_CONFIG_ENHANCEMENT.md`](OPENCLAW_CONFIG_ENHANCEMENT.md) - Config enhancements
- [`IAM_ENHANCEMENT_PLAN.md`](IAM_ENHANCEMENT_PLAN.md) - AWS IAM expansion

### Infrastructure
- [`lib/constructs/iam.ts`](../lib/constructs/iam.ts) - IAM roles
- [`lib/constructs/fargate.ts`](../lib/constructs/fargate.ts) - ECS configuration
- [`docker/Dockerfile`](../docker/Dockerfile) - Container image

---

## 🎯 Summary

### Current Status
✅ **OpenClaw has maximum safe permissions** for a containerized application

### What You Have
- ✅ Full container filesystem access
- ✅ All OpenClaw tools enabled
- ✅ Elevated operations allowed
- ✅ Long execution timeouts
- ✅ Browser automation
- ✅ AWS Bedrock, S3, EFS access
- ✅ Unrestricted network access

### What You Don't Have (By Design)
- ❌ Root access (security best practice)
- ❌ Docker socket access (security best practice)
- ❌ EC2/Lambda/DynamoDB access (can be added)

### Next Steps
1. ✅ **Current setup is working** - No changes needed
2. 🔧 **Optional**: Add more OpenClaw features (see enhancement plan)
3. 🔧 **Optional**: Add more AWS permissions (see IAM plan)
4. 🧪 **Recommended**: Test permissions via chat interface
5. 📊 **Recommended**: Monitor logs and costs

---

## 🆘 Troubleshooting

### Permission Denied Errors

**Symptom**: `Permission denied` when executing commands

**Causes**:
1. Trying to access files outside `/home/node/`
2. Trying to use `sudo`
3. Trying to install packages

**Solution**: Pre-install tools in Dockerfile or use available tools

---

### AWS Access Denied

**Symptom**: `AccessDenied` when using AWS CLI

**Causes**:
1. IAM role doesn't have required permissions
2. Resource is outside allowed scope

**Solution**: Add IAM permissions (see IAM Enhancement Plan)

---

### Command Not Found

**Symptom**: `command not found` error

**Causes**:
1. Tool not installed in container
2. Tool not in PATH

**Solution**: 
- Check available tools: `ls /usr/bin/`
- Add to Dockerfile if needed

---

### Timeout Errors

**Symptom**: Command times out

**Causes**:
1. Command exceeds 2-hour timeout
2. Network connectivity issues

**Solution**:
- Increase `tools.exec.timeoutSec` in config
- Check network connectivity

---

## 📞 Support

- **Documentation**: https://docs.openclaw.ai/
- **GitHub**: https://github.com/digitalknk/openclaw-runbook
- **Security**: https://semgrep.dev/blog/2026/openclaw-security-engineers-cheat-sheet/

---

**Last Updated**: 2026-02-15  
**Version**: Revision 40  
**Permission Score**: 9/10 ✅
