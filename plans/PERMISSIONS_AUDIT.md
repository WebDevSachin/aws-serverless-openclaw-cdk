# OpenClaw Maximum Permissions Audit

**Date**: 2026-02-15  
**Deployment**: AWS ECS Fargate (Revision 40)  
**Status**: ✅ DEPLOYED & HEALTHY

---

## Executive Summary

This document provides a comprehensive audit of all permission layers in the OpenClaw deployment to ensure the agent has **maximum permissions** to execute all commands, access all files, and perform all operations within the container environment.

### Permission Layers Analyzed

1. **OpenClaw Configuration** (Application Level)
2. **AWS IAM Roles** (Cloud Level)
3. **Container Runtime** (Docker/ECS Level)
4. **File System Access** (EFS/Storage Level)
5. **Network Security** (VPC/Security Groups)

---

## 1. OpenClaw Configuration Permissions ✅

**File**: [`docker/config/openclaw.json`](../docker/config/openclaw.json)

### 🔓 Sandbox Mode: OFF
```json
"sandbox": {
  "mode": "off",
  "perSession": false
}
```
- ✅ **Full host access** - No containerization/isolation
- ✅ Agent runs directly on the container OS
- ✅ Can access all files within container filesystem
- ⚠️ **Security Impact**: Agent has unrestricted access to container internals

### 🛠️ Tools: ALL ALLOWED
```json
"tools": {
  "allow": ["*"],
  "deny": [],
  "exec": {
    "backgroundMs": 10000,
    "timeoutSec": 7200,
    "cleanupMs": 3600000
  }
}
```
- ✅ **All tools enabled** - No restrictions
- ✅ **2-hour execution timeout** - Long-running commands supported
- ✅ **Background processes** - Can run daemons/services
- ✅ **No cleanup restrictions** - Processes can persist

### ⚡ Elevated Tools: ENABLED
```json
"elevated": {
  "enabled": true,
  "allowFrom": {
    "webchat": ["*"],
    "session:*": ["*"],
    "whatsapp": ["*"],
    "telegram": ["*"]
  }
}
```
- ✅ **Elevated operations allowed** from all channels
- ✅ **System-level commands** permitted
- ✅ **File system modifications** unrestricted
- ✅ **Process management** enabled

### 🔧 Agent Defaults
```json
"agents": {
  "defaults": {
    "elevatedDefault": "on",
    "thinkingDefault": "high",
    "verboseDefault": "on",
    "timeoutSeconds": 3600,
    "maxConcurrent": 10
  }
}
```
- ✅ **Elevated mode ON by default**
- ✅ **1-hour timeout per agent**
- ✅ **10 concurrent agents** supported
- ✅ **High thinking mode** for complex operations

### 🌐 Browser Tools
```json
"browser": {
  "enabled": true
}
```
- ✅ **Playwright/browser automation** enabled
- ✅ Can interact with web pages
- ✅ Can scrape data, fill forms, etc.

### 📝 Logging: DEBUG MODE
```json
"logging": {
  "level": "debug",
  "consoleLevel": "debug",
  "redactSensitive": "off"
}
```
- ✅ **Full debug logging** enabled
- ✅ **No sensitive data redaction** - Complete visibility
- ⚠️ **Security Impact**: Secrets may appear in logs

---

## 2. AWS IAM Permissions ✅

**File**: [`lib/constructs/iam.ts`](../lib/constructs/iam.ts)

### Task Execution Role (Image Pull, Secrets, Logs)

```typescript
// Managed Policy
'service-role/AmazonECSTaskExecutionRolePolicy'

// Custom Policies
{
  "secretsmanager:GetSecretValue": [
    "openclaw/gateway-token-*",
    "openclaw/external-api-*",
    "openclaw/openrouter-api-*"
  ],
  "logs:CreateLogStream": ["*"],
  "logs:PutLogEvents": ["*"]
}
```

**Permissions**:
- ✅ Pull images from ECR
- ✅ Read all OpenClaw secrets
- ✅ Write to CloudWatch Logs
- ✅ Access ECS task metadata

### Task Role (Runtime Permissions)

```typescript
{
  // Bedrock AI
  "bedrock:InvokeModel": ["*"],
  "bedrock:InvokeModelWithResponseStream": ["*"],
  
  // S3 Storage
  "s3:GetObject": ["arn:aws:s3:::openclaw-*/*"],
  "s3:PutObject": ["arn:aws:s3:::openclaw-*/*"],
  "s3:DeleteObject": ["arn:aws:s3:::openclaw-*/*"],
  "s3:ListBucket": ["arn:aws:s3:::openclaw-*"],
  
  // EFS File System
  "elasticfilesystem:ClientMount": ["arn:aws:elasticfilesystem:*"],
  "elasticfilesystem:ClientWrite": ["arn:aws:elasticfilesystem:*"],
  "elasticfilesystem:ClientRootAccess": ["arn:aws:elasticfilesystem:*"]
}
```

**Permissions**:
- ✅ **All Bedrock models** - No model restrictions
- ✅ **Full S3 access** - Read/Write/Delete objects
- ✅ **EFS root access** - Full filesystem control
- ✅ **Region-scoped** - Works in ap-south-1

### ⚠️ Missing Permissions (Potential Gaps)

The following AWS services are **NOT** currently accessible:

| Service | Use Case | Impact |
|---------|----------|--------|
| **EC2** | Launch instances, manage VMs | ❌ Cannot create compute resources |
| **Lambda** | Invoke serverless functions | ❌ Cannot trigger Lambda |
| **DynamoDB** | NoSQL database access | ❌ Cannot read/write DynamoDB |
| **SQS/SNS** | Message queues, notifications | ❌ Cannot send messages |
| **CloudWatch** | Metrics, alarms | ❌ Cannot create alarms |
| **Systems Manager** | Parameter Store, Run Command | ❌ Cannot access SSM parameters |
| **Secrets Manager (Write)** | Create/update secrets | ❌ Read-only access |
| **IAM** | Manage roles, policies | ❌ Cannot modify IAM |

**Recommendation**: If OpenClaw needs to interact with these services, add IAM policies to the Task Role.

---

## 3. Container Runtime Permissions ✅

**File**: [`docker/Dockerfile`](../docker/Dockerfile)

### User Context
```dockerfile
USER root  # During build
# ... install packages ...
USER node  # Runtime
```

**Analysis**:
- ✅ Runs as `node` user (non-root) - Security best practice
- ✅ Has `sudo` capabilities via `root` build stage
- ✅ Can install packages during build
- ⚠️ **Cannot use `sudo` at runtime** - Would need root user

### Installed Tools
```dockerfile
RUN apt-get install -y --no-install-recommends \
    awscli \
    jq \
    curl
```

**Available Commands**:
- ✅ `aws` - AWS CLI for S3, Secrets Manager, etc.
- ✅ `jq` - JSON processing
- ✅ `curl` - HTTP requests
- ✅ `node` - JavaScript runtime
- ✅ `npm` - Package manager
- ✅ Standard Linux utilities (`ls`, `cat`, `grep`, `sed`, `awk`, etc.)

### File System Permissions
```dockerfile
RUN mkdir -p /home/node/.openclaw && \
    chmod -R 777 /home/node/.openclaw && \
    chown -R node:node /home/node/.openclaw
```

**Permissions**:
- ✅ **777 permissions** on `.openclaw` directory - Full read/write/execute
- ✅ **node:node ownership** - Matches runtime user
- ✅ **EFS mount point** - Persistent storage

### ⚠️ Container Limitations

The container **CANNOT**:
- ❌ Run `sudo` commands (no root access at runtime)
- ❌ Install new packages (requires root)
- ❌ Modify system files outside `/home/node`
- ❌ Access Docker socket (no container-in-container)
- ❌ Modify kernel parameters
- ❌ Load kernel modules

**Workaround**: Pre-install all required tools in the Dockerfile during build.

---

## 4. File System Access ✅

### EFS Mount (Persistent Storage)

**Mount Point**: `/home/node/.openclaw`  
**Access Point**: Enforces `node:node` (1000:1000) ownership  
**Permissions**: Full read/write/execute

**Directories**:
```
/home/node/.openclaw/
├── openclaw.json          # Configuration
├── credentials/           # API keys, tokens
├── workspace/             # Agent workspace
├── agents/                # Agent state
│   └── main/
│       └── agent/
├── devices/               # Device pairings
└── sessions/              # Session data
```

**Access**:
- ✅ **Full read/write** to all directories
- ✅ **Persistent across restarts** - Data survives container crashes
- ✅ **Shared across tasks** - Multiple containers can access (if scaled)
- ✅ **Automatic ownership** - EFS access point ensures correct permissions

### S3 Bucket (Object Storage)

**Bucket**: `openclaw-storage-*`  
**IAM Permissions**: Read/Write/Delete

**Access**:
- ✅ Can upload files via `aws s3 cp`
- ✅ Can download files via `aws s3 cp`
- ✅ Can list objects via `aws s3 ls`
- ✅ Can delete objects via `aws s3 rm`

### Container Filesystem (Ephemeral)

**Writable Directories**:
- `/home/node/` - User home directory
- `/tmp/` - Temporary files
- `/var/tmp/` - Temporary files (persists longer)

**Read-Only Directories**:
- `/usr/` - System binaries
- `/etc/` - System configuration
- `/opt/` - Optional software

---

## 5. Network Security ✅

**File**: [`lib/constructs/vpc.ts`](../lib/constructs/vpc.ts)

### Security Groups

#### ALB Security Group
```typescript
// Inbound
Port 80 (HTTP)   <- 0.0.0.0/0  ✅
Port 443 (HTTPS) <- 0.0.0.0/0  ✅

// Outbound
All traffic      -> 0.0.0.0/0  ✅
```

#### Fargate Security Group
```typescript
// Inbound
Port 18789 <- ALB Security Group only  ✅

// Outbound
All traffic -> 0.0.0.0/0  ✅
```

**Analysis**:
- ✅ **Outbound unrestricted** - Can connect to any external service
- ✅ **Can call OpenRouter API** (https://openrouter.ai)
- ✅ **Can call AWS APIs** (Bedrock, S3, Secrets Manager)
- ✅ **Can access public internet** (for web scraping, API calls)
- ✅ **Inbound restricted** - Only ALB can reach container (security)

### Network Access

**Allowed**:
- ✅ HTTPS to OpenRouter (port 443)
- ✅ HTTPS to AWS services (port 443)
- ✅ HTTP/HTTPS to any public website
- ✅ Custom ports to external services
- ✅ DNS resolution (port 53)

**Blocked**:
- ❌ Direct inbound from internet (must go through ALB)
- ❌ SSH access (no port 22 exposed)

---

## 6. Command Execution Capabilities ✅

### What OpenClaw CAN Execute

#### File Operations
```bash
# Read files
cat /home/node/.openclaw/openclaw.json
ls -la /home/node/

# Write files
echo "data" > /home/node/test.txt
mkdir -p /home/node/workspace/project

# Delete files
rm /home/node/test.txt
rm -rf /home/node/workspace/old-project
```

#### AWS CLI Commands
```bash
# S3 operations
aws s3 ls s3://openclaw-storage-*/
aws s3 cp file.txt s3://openclaw-storage-*/
aws s3 rm s3://openclaw-storage-*/file.txt

# Secrets Manager (read-only)
aws secretsmanager get-secret-value --secret-id openclaw/gateway-token-*

# Bedrock (via SDK, not CLI)
# Handled by OpenClaw's model integration
```

#### Process Management
```bash
# Run background processes
node server.js &
python script.py &

# View processes
ps aux
top

# Kill processes (owned by node user)
kill <pid>
pkill -f "node server.js"
```

#### Network Operations
```bash
# HTTP requests
curl https://api.example.com
wget https://example.com/file.zip

# DNS lookup
nslookup example.com
dig example.com

# Network testing
ping -c 4 8.8.8.8  # May not work (requires root)
```

#### Data Processing
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

### What OpenClaw CANNOT Execute

#### System Administration
```bash
# Root-only commands
sudo apt-get install package  ❌
systemctl restart service     ❌
iptables -A INPUT ...         ❌
mount /dev/sda1 /mnt          ❌
```

#### Container/Docker Operations
```bash
# Docker commands (no socket access)
docker ps                     ❌
docker run ...                ❌
docker build ...              ❌
```

#### Kernel Operations
```bash
# Kernel modules
modprobe module               ❌
insmod module.ko              ❌
lsmod                         ❌ (may work but limited)
```

#### User Management
```bash
# User/group operations
useradd newuser               ❌
passwd user                   ❌
chown root:root file          ❌ (can only chown to node:node)
```

---

## 7. Verification Test Suite

### Test 1: File System Access
```bash
# Create test file
echo "test" > /home/node/.openclaw/test.txt

# Verify write
cat /home/node/.openclaw/test.txt

# Verify permissions
ls -la /home/node/.openclaw/test.txt

# Cleanup
rm /home/node/.openclaw/test.txt
```

**Expected**: ✅ All operations succeed

### Test 2: AWS CLI Access
```bash
# List S3 buckets (requires IAM permissions)
aws s3 ls

# Get secret (requires IAM permissions)
aws secretsmanager get-secret-value \
  --secret-id openclaw/gateway-token-openclawstack \
  --query 'SecretString' --output text
```

**Expected**: ✅ Commands succeed with proper IAM role

### Test 3: Command Execution
```bash
# Long-running command
sleep 10 && echo "done"

# Background process
node -e "setTimeout(() => console.log('done'), 5000)" &

# Process listing
ps aux | grep node
```

**Expected**: ✅ All commands execute successfully

### Test 4: Network Access
```bash
# External API call
curl -s https://api.ipify.org?format=json

# OpenRouter API test
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

**Expected**: ✅ Network requests succeed

### Test 5: Tool Permissions
```bash
# Verify tools are allowed
# (This is tested via OpenClaw's internal tool system)
```

**Expected**: ✅ All tools execute without permission errors

---

## 8. Recommendations for Maximum Permissions

### ✅ Already Implemented

1. **Sandbox disabled** - Full container access
2. **All tools allowed** - No tool restrictions
3. **Elevated tools enabled** - System-level operations
4. **Long timeouts** - 2-hour execution limit
5. **Debug logging** - Full visibility
6. **EFS root access** - Full filesystem control
7. **S3 full access** - Read/Write/Delete
8. **Unrestricted outbound** - All network access

### 🔧 Optional Enhancements

If you need **even more** permissions, consider:

#### 1. Add More AWS Service Permissions
```typescript
// In lib/constructs/iam.ts
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'dynamodb:*',
      'lambda:InvokeFunction',
      'sqs:*',
      'sns:*',
      'ssm:GetParameter',
      'ssm:PutParameter',
    ],
    resources: ['*'],
  })
);
```

#### 2. Run Container as Root (⚠️ NOT RECOMMENDED)
```dockerfile
# In docker/Dockerfile
USER root  # Instead of USER node
```
**Impact**: Full root access, but major security risk

#### 3. Add Docker Socket Access (⚠️ NOT RECOMMENDED)
```typescript
// In lib/constructs/fargate.ts
this.taskDefinition.addVolume({
  name: 'docker-socket',
  host: {
    sourcePath: '/var/run/docker.sock',
  },
});
```
**Impact**: Can control Docker daemon, extreme security risk

#### 4. Install Additional Tools
```dockerfile
# In docker/Dockerfile
RUN apt-get install -y \
    git \
    python3 \
    python3-pip \
    vim \
    htop \
    net-tools
```

#### 5. Increase Resource Limits
```typescript
// In lib/openclaw-stack.ts
const cpu = 2048;        // 2 vCPU
const memoryMiB = 4096;  // 4 GB RAM
```

---

## 9. Security Warnings ⚠️

### Current Security Posture

| Setting | Status | Risk Level |
|---------|--------|------------|
| Sandbox disabled | ❌ OFF | 🔴 HIGH |
| All tools allowed | ✅ ON | 🔴 HIGH |
| Elevated tools | ✅ ON | 🔴 HIGH |
| Device auth disabled | ❌ OFF | 🟡 MEDIUM |
| All origins allowed | ✅ ON | 🟡 MEDIUM |
| Sensitive data redaction | ❌ OFF | 🟡 MEDIUM |
| Root user | ❌ OFF | 🟢 LOW |
| Docker socket access | ❌ OFF | 🟢 LOW |

### Recommendations

1. **Use in trusted environments only** - This configuration is suitable for:
   - Development/testing environments
   - Internal corporate networks
   - Trusted user bases

2. **Do NOT expose to public internet** - The current setup has:
   - Basic auth (admin/openclaw2025)
   - Gateway token (GnSPN0qwdgbSOlJapflHjT2xvwOKax32)
   - But no rate limiting or advanced security

3. **Monitor logs regularly** - With debug logging enabled:
   - Check CloudWatch Logs for suspicious activity
   - Review command execution patterns
   - Watch for unauthorized access attempts

4. **Rotate credentials** - Periodically update:
   - Gateway token
   - Basic auth password
   - OpenRouter API key

---

## 10. Summary

### ✅ Maximum Permissions Achieved

OpenClaw has **maximum permissions** within the following boundaries:

| Layer | Permission Level | Notes |
|-------|------------------|-------|
| **OpenClaw Config** | 🟢 MAXIMUM | All tools, no sandbox, elevated mode |
| **AWS IAM** | 🟡 HIGH | Bedrock, S3, EFS access; missing EC2, Lambda, etc. |
| **Container Runtime** | 🟡 HIGH | Non-root user; can't sudo or install packages |
| **File System** | 🟢 MAXIMUM | Full EFS access, S3 access |
| **Network** | 🟢 MAXIMUM | Unrestricted outbound, all protocols |

### 🎯 What OpenClaw Can Do

- ✅ Execute any command available in the container
- ✅ Read/write/delete files in `/home/node/` and EFS
- ✅ Access AWS services (Bedrock, S3, Secrets Manager)
- ✅ Make HTTP/HTTPS requests to any external service
- ✅ Run background processes and daemons
- ✅ Process data with installed tools (jq, curl, aws-cli)
- ✅ Use browser automation (Playwright)
- ✅ Manage sessions and agent state

### ⚠️ What OpenClaw Cannot Do

- ❌ Run `sudo` or root-level commands
- ❌ Install new packages at runtime
- ❌ Access Docker socket or manage containers
- ❌ Modify kernel parameters or load modules
- ❌ Access AWS services without IAM permissions (EC2, Lambda, DynamoDB, etc.)
- ❌ Modify system files outside `/home/node/`

### 📊 Permission Score: 9/10

OpenClaw has **near-maximum permissions** for a containerized application. The only limitations are:
1. Non-root user (security best practice)
2. Limited AWS service access (can be expanded)
3. No Docker socket access (security best practice)

**Conclusion**: The deployment is configured for **maximum safe permissions** while maintaining reasonable security boundaries. If you need root access or Docker socket access, those can be added but are **strongly discouraged** due to security risks.

---

## References

- [OpenClaw Configuration](../docker/config/openclaw.json)
- [IAM Roles](../lib/constructs/iam.ts)
- [Dockerfile](../docker/Dockerfile)
- [VPC Security](../lib/constructs/vpc.ts)
- [Agent Documentation](../AGENTS.md)
- [Valid Configuration Keys](../OPENCLAW_VALID_KEYS.md)
