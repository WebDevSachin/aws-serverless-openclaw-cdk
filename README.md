# OpenClaw AWS CDK

AWS CDK TypeScript project for deploying [OpenClaw](https://github.com/openclaw/openclaw) - a self-hosted autonomous agent platform on AWS.

## Overview

This project deploys OpenClaw on AWS using:
- **ECS Fargate** - Serverless container orchestration
- **Amazon Bedrock** - Foundation model API (Claude models)
- **EFS** - Persistent storage for data and configuration
- **CloudWatch** - Logging and monitoring
- **ECR** - Container image registry

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Route 53  │───▶│  CloudFront │───▶│  ALB (optional) │  │
│  └─────────────┘    └─────────────┘    └────────┬────────┘  │
│                                                 │            │
│  ┌──────────────────────────────────────────────┼────────┐  │
│  │                   VPC (10.0.0.0/16)          │        │  │
│  │                                              ▼        │  │
│  │  ┌─────────────┐    ┌────────────────────────────────┐│  │
│  │  │   Public    │    │            Private             ││  │
│  │  │   Subnets   │    │           Subnets              ││  │
│  │  │             │    │                                ││  │
│  │  │  NAT Gateway│───▶│  ┌─────────────────────────┐   ││  │
│  │  └─────────────┘    │  │    ECS Fargate          │   ││  │
│  │                     │  │  ┌───────────────────┐  │   ││  │
│  │                     │  │  │   OpenClaw        │  │   ││  │
│  │                     │  │  │   Container       │  │   ││  │
│  │                     │  │  │                   │  │   ││  │
│  │                     │  │  │  ┌─────────────┐  │  │   ││  │
│  │                     │  │  │  │  Bedrock    │──┼──┼───┼┼──┤
│  │                     │  │  │  │  Client     │  │  │   ││  │
│  │                     │  │  │  └─────────────┘  │  │   ││  │
│  │                     │  │  │                   │  │   ││  │
│  │                     │  │  │  ┌─────────────┐  │  │   ││  │
│  │                     │  │  └──┤  EFS Mount  │──┼──┼───┼┼──┤
│  │                     │  │     │  /app/data  │  │  │   ││  │
│  │                     │  │     └─────────────┘  │  │   ││  │
│  │                     │  └─────────────────────────┘  │   ││  │
│  │                     └────────────────────────────────┘   ││  │
│  └────────────────────────────────────────────────────────────┘│  │
│                                                                │  │
│  ┌────────────────────┐  ┌────────────────┐  ┌──────────────┐  │  │
│  │    ECR (Images)    │  │   EFS (Data)   │  │ CloudWatch   │  │  │
│  │                    │  │                │  │   (Logs)     │  │  │
│  └────────────────────┘  └────────────────┘  └──────────────┘  │  │
│                                                                │  │
└────────────────────────────────────────────────────────────────┘  │
```

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured
- [Node.js](https://nodejs.org/) 18+ and npm
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) CLI installed
- Docker (for building container images)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd openclaw-aws-cdk

# Install dependencies
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CDK_DEFAULT_ACCOUNT` | AWS account ID | Required |
| `CDK_DEFAULT_REGION` | AWS region | `us-east-1` |
| `BEDROCK_MODEL` | Bedrock model ID | `anthropic.claude-3-5-haiku-20241022-v1:0` |

### Context Options

```bash
# Deploy with custom settings
npx cdk deploy -c cpu=1024 -c memoryMiB=2048 -c bedrockModel=anthropic.claude-3-opus-20240229-v1:0
```

| Context Key | Description | Default |
|-------------|-------------|---------|
| `cpu` | Container CPU units | 512 |
| `memoryMiB` | Container memory | 1024 |
| `bedrockModel` | Bedrock model ID | Haiku |
| `useGraviton` | Use ARM64 instances | true |
| `environment` | Environment tag | production |

## Bedrock Models

| Model | Use Case | Cost |
|-------|----------|------|
| `anthropic.claude-3-5-haiku-20241022-v1:0` | Fast responses, simple tasks | Lowest |
| `anthropic.claude-3-5-sonnet-20241022-v2:0` | Complex reasoning, coding | Medium |
| `anthropic.claude-3-opus-20240229-v1:0` | Research, creative writing | Highest |

## Usage

### Deploy the Stack

```bash
# Synthesize CloudFormation template
npx cdk synth

# Deploy the stack
npx cdk deploy

# Deploy with verbose output
npx cdk deploy --progress events
```

### Build and Push Container Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image (from official OpenClaw base + S3 config sync)
docker build --platform linux/amd64 -f docker/Dockerfile -t openclaw:latest .

# Tag and push
docker tag openclaw:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/openclaw:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/openclaw:latest
```

### Run Tasks

```bash
# Start a task
aws ecs run-task \
  --cluster openclaw-cluster \
  --launch-type FARGATE \
  --task-definition openclaw \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}"
```

## Project Structure

```
.
├── bin/
│   └── app.ts                 # CDK application entry point
├── lib/
│   ├── openclaw-stack.ts      # Main stack definition
│   ├── config.ts              # Configuration defaults
│   └── types.ts               # TypeScript interfaces
├── docker/
│   ├── Dockerfile             # Container image
│   ├── entrypoint.sh          # Container startup script
│   └── config/                # Default configuration files
│       ├── openclaw.json
│       ├── SOUL.md
│       └── USER.md
├── test/
│   └── openclaw-stack.test.ts # Unit tests
├── cdk.json                   # CDK configuration
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## Cost Optimization 💰

The default setup costs ~$72/month. Here are configurations to reduce costs:

### Quick Cost Comparison

| Configuration | Monthly Cost | Best For |
|--------------|--------------|----------|
| **Full Setup** (default) | ~$72 | Production, 24/7 use |
| **Spot Instances** | ~$35 | Fault-tolerant workloads |
| **No NAT Gateway** | ~$40 | Development, secure public subnets |
| **Minimal** | ~$15 | Testing, dev, can be interrupted |
| **Scale to 0** | ~$3 | Infrequent use, manual start/stop |

### Cost-Saving Options

```typescript
// Example: Minimal cost configuration
new OpenClawStack(app, 'OpenClawDev', {
  cpu: 256,
  memoryMiB: 512,
  useNatGateway: false,      // Saves ~$32/month
  useFargateSpot: true,      // Saves ~70% on compute
  desiredCount: 1,
});
```

| Option | Savings | Description |
|--------|---------|-------------|
| `useNatGateway: false` | ~$32/mo | Run in public subnets (still secure) |
| `useFargateSpot: true` | ~70% compute | Spot instances (can be interrupted) |
| `desiredCount: 0` | ~$15/mo | Scale to zero when not needed |
| `cpu: 256, memoryMiB: 512` | ~50% compute | Minimal resources |

### Example Configurations

See [examples/cost-optimization.ts](examples/cost-optimization.ts) for complete examples:

```bash
# Deploy minimal cost setup (~$15/month)
cdk deploy OpenClawMinimal

# Deploy with Spot instances (~$35/month)
cdk deploy OpenClawSpot

# Scale to zero when not needed (~$3/month when stopped)
cdk deploy OpenClawManual
```

### Manual Start/Stop

Scale to zero to stop all compute costs:

```bash
# Stop (scale to 0)
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --desired-count 0

# Start (scale to 1)
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --desired-count 1
```

Note: When `desiredCount: 0`, you only pay for:
- ALB (~$22/month) - if using ALB
- EFS storage (~$0.30/GB/month)
- S3 storage (negligible)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Security

- ✅ **Private subnets** for containers
- ✅ **Security groups** with minimal access
- ✅ **IAM roles** with least privilege
- ✅ **Encrypted EFS** at rest
- ✅ **Encrypted CloudWatch** logs
- ✅ **No secrets** in environment variables

## Troubleshooting

### Common Issues

**Task fails to start**
```bash
# Check CloudWatch logs
aws logs tail /ecs/openclaw --follow

# Check task status
aws ecs describe-tasks --cluster openclaw-cluster --tasks <task-id>
```

**Bedrock access denied**
```bash
# Verify IAM permissions
aws bedrock list-foundation-models --region us-east-1
```

**EFS mount fails**
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

## Cleanup

```bash
# Destroy the stack (keeps EFS data)
npx cdk destroy

# To remove EFS data, manually delete the file system
aws efs delete-file-system --file-system-id fs-xxx
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- [OpenClaw Documentation](https://github.com/openclaw/openclaw)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

---

**Built with ❤️ using AWS CDK**
