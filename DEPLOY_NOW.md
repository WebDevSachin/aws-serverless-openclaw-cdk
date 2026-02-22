# Deploy OpenClaw Maximum Permissions NOW

## ⚠️ AWS Credentials Required

Before deployment, you MUST configure AWS credentials. The current credentials are invalid.

## Quick Setup (Choose ONE)

### Option 1: AWS Configure (Recommended)
```bash
aws configure
```
Enter when prompted:
- AWS Access Key ID: `[Your Access Key]`
- AWS Secret Access Key: `[Your Secret Key]`
- Default region name: `ap-south-1`
- Default output format: `json`

### Option 2: AWS SSO
```bash
aws sso login --profile your-profile-name
export AWS_PROFILE=your-profile-name
```

### Option 3: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_DEFAULT_REGION="ap-south-1"
```

## Verify Credentials
```bash
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-user"
}
```

## Deploy (After Credentials Are Set)

### Automated Deployment
```bash
cd /Users/sachinkumar/aws-openclaw
./deploy-maximum-permissions.sh
```

### Manual Deployment (If Script Fails)
```bash
# 1. Build TypeScript
npm run build

# 2. Get ECR URI
ECR_URI=$(aws ecr describe-repositories --repository-names openclaw --region ap-south-1 --query 'repositories[0].repositoryUri' --output text)
echo "ECR URI: $ECR_URI"

# 3. Build Docker image
docker build -t openclaw:maximum-permissions -f docker/Dockerfile .

# 4. Login to ECR
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com

# 5. Tag and push
docker tag openclaw:maximum-permissions $ECR_URI:latest
docker push $ECR_URI:latest

# 6. Force deployment
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --force-new-deployment --region ap-south-1

# 7. Monitor
aws ecs describe-services --cluster openclaw-cluster --services openclaw-service --region ap-south-1 --query 'services[0].{Running:runningCount,Desired:desiredCount,Status:status}'
```

## Test After Deployment

### 1. Check Service Status
```bash
aws ecs describe-services --cluster openclaw-cluster --services openclaw-service --region ap-south-1
```

### 2. View Logs
```bash
aws logs tail /aws/ecs/containerinsights/openclaw-cluster/performance --follow --region ap-south-1
```

### 3. Test via Chat Interface

Visit: https://d15af3nsx4ckro.cloudfront.net

Login:
- Username: `admin`
- Password: `openclaw2025`

Test commands:
```
User: whoami
Expected: root

User: sudo -v
Expected: Success

User: apt-get update && apt-get install -y htop
Expected: Package installed

User: htop --version
Expected: htop version displayed
```

## Troubleshooting

### Error: "The security token included in the request is invalid"
**Solution**: Configure AWS credentials (see options above)

### Error: "No such file or directory: docker"
**Solution**: Install Docker Desktop for Mac

### Error: "Cannot connect to the Docker daemon"
**Solution**: Start Docker Desktop

### Error: "Repository does not exist"
**Solution**: Check repository name and region

## Files Changed

1. [`docker/Dockerfile`](docker/Dockerfile) - Changed to `USER root`
2. [`docker/config/openclaw.json`](docker/config/openclaw.json) - Enhanced config
3. [`deploy-maximum-permissions.sh`](deploy-maximum-permissions.sh) - Deployment script

## Permission Scores After Deployment

- OpenClaw Config: 10/10 ✅
- AWS IAM: 7/10 ⚠️
- **Container Runtime: 10/10** ✅ (was 8/10)
- File System: 10/10 ✅
- Network: 10/10 ✅

**Overall: 9.4/10** ✅

---

**IMPORTANT**: Configure AWS credentials first, then run deployment script!
