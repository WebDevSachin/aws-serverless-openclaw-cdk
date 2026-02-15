# OpenClaw AWS CDK - Agent Documentation

## Project Overview

This is an AWS CDK TypeScript project for deploying [OpenClaw](https://github.com/openclaw/openclaw) - a self-hosted autonomous agent platform on AWS infrastructure.

**Key Technologies:**
- **AWS CDK v2** (v2.130.0+) - Infrastructure as Code
- **TypeScript** (~5.3.3) - Primary language
- **ECS Fargate** - Serverless container orchestration
- **Amazon Bedrock** - Foundation model API (Claude, Nova models)
- **Amazon EFS** - Persistent storage for data and configuration
- **Application Load Balancer (ALB)** - HTTP traffic distribution
- **CloudFront** - HTTPS with basic authentication
- **Amazon S3** - Object storage and configuration deployment
- **Secrets Manager** - Secure credential storage
- **CloudWatch** - Logging and monitoring

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

## Project Structure

```
.
├── bin/
│   └── app.ts                    # CDK application entry point
├── lib/
│   ├── openclaw-stack.ts         # Main stack definition
│   ├── config.ts                 # Default configurations & cost optimization presets
│   ├── types.ts                  # TypeScript interfaces
│   └── constructs/               # Modular CDK constructs
│       ├── alb.ts                # Application Load Balancer
│       ├── cloudfront.ts         # CloudFront distribution with basic auth
│       ├── config-management.ts  # Runtime config management
│       ├── fargate.ts            # ECS Fargate service
│       ├── iam.ts                # IAM roles and policies
│       ├── logging.ts            # CloudWatch logging
│       ├── secrets.ts            # Secrets Manager
│       ├── storage.ts            # S3 bucket
│       └── vpc.ts                # VPC and networking
├── docker/
│   ├── Dockerfile                # Container image build
│   ├── entrypoint.sh             # Container startup script
│   └── config/                   # Default configuration files
│       ├── openclaw.json         # OpenClaw gateway config
│       ├── SOUL.md               # Agent personality
│       └── USER.md               # User preferences
├── test/
│   └── openclaw-stack.test.ts    # Unit tests (Jest)
├── test-e2e/                     # End-to-end tests (Playwright)
│   ├── tests/
│   │   ├── openclaw.spec.ts      # E2E test suite
│   │   └── debug-screenshot.spec.ts
│   ├── playwright.config.ts      # Playwright configuration
│   └── package.json
├── scripts/
│   └── deploy-local.sh           # Full deployment automation
├── iam/
│   └── cdk-deployment-policy.json # IAM policy for CDK deployment
├── examples/
│   └── cost-optimization.ts      # Cost optimization examples
├── cdk.json                      # CDK configuration
├── package.json                  # Node.js dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Build and Test Commands

### Prerequisites
- Node.js 18+ and npm
- AWS CLI configured with credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Docker (for building container images)

### Installation
```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap
```

### Build Commands
```bash
# Compile TypeScript
npm run build

# Watch mode for development
npm run watch

# Synthesize CloudFormation template
npm run synth

# Deploy the stack
npm run deploy

# Destroy the stack
npm run destroy
```

### Testing Commands

**Unit Tests (Jest):**
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

**End-to-End Tests (Playwright):**
```bash
cd test-e2e
npm install
npx playwright install

# Test ALB (HTTP)
URL=http://<alb-dns> npx playwright test

# Test CloudFront (HTTPS)
URL=https://<cloudfront-domain> \
  AUTH_USER=admin \
  AUTH_PASS=openclaw2025 \
  npx playwright test

# Debug mode (headed browser)
npx playwright test --headed --slowmo 1000
```

### Full Deployment
```bash
# Complete deployment script
./scripts/deploy-local.sh
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CDK_DEFAULT_ACCOUNT` | AWS account ID | Required |
| `CDK_DEFAULT_REGION` | AWS region | `ap-south-1` |
| `BEDROCK_MODEL` | Bedrock model ID | `amazon.nova-micro-v1:0` |

### CDK Context Options

Deploy with custom settings via `-c` flag:
```bash
npx cdk deploy -c cpu=1024 -c memoryMiB=2048 -c bedrockModel=anthropic.claude-3-opus-20240229-v1:0
```

| Context Key | Description | Default |
|-------------|-------------|---------|
| `cpu` | Container CPU units | 512 |
| `memoryMiB` | Container memory | 1024 |
| `bedrockModel` | Bedrock model ID | `amazon.nova-micro-v1:0` |
| `useGraviton` | Use ARM64 instances | false |
| `vpcId` | Existing VPC ID | (create new) |
| `openRouterApiKey` | OpenRouter API key | (optional) |
| `environment` | Environment tag | production |

### OpenClaw Configuration (`docker/config/openclaw.json`)

Key settings for AWS deployment:
```json
{
  "gateway": {
    "port": 18789,
    "bind": "lan",
    "mode": "local",
    "auth": {
      "mode": "token"
    },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["*"],
      "allowInsecureAuth": true
    },
    "trustedProxies": [
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16"
    ]
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/moonshotai/kimi-k2.5"
      }
    }
  }
}
```

## Code Style Guidelines

### TypeScript Conventions
- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled (`strict: true`)
- **Declaration files**: Generated for all modules
- **Source maps**: Inline (`inlineSourceMap: true`)

### Naming Conventions
- **Classes**: PascalCase (e.g., `OpenClawStack`, `OpenClawVpc`)
- **Interfaces**: PascalCase with descriptive names (e.g., `OpenClawStackProps`)
- **Files**: kebab-case (e.g., `openclaw-stack.ts`, `config-management.ts`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Construct IDs**: PascalCase descriptive names

### CDK Patterns
- Use **constructs** for modular, reusable infrastructure components
- Export interfaces for all construct props (e.g., `OpenClawVpcProps`)
- Use default values with nullish coalescing (`??`)
- Add JSDoc comments for all public APIs
- Tag all resources with `Project`, `Environment`, `ManagedBy`

### Example Construct Structure
```typescript
/**
 * Properties for the MyConstruct construct
 */
export interface MyConstructProps {
  /** Description of the property */
  readonly propertyName: string;
  /** Optional property with default */
  readonly optionalProp?: boolean;
}

/**
 * Brief description of the construct
 *
 * Creates:
 * - Resource 1
 * - Resource 2
 */
export class MyConstruct extends Construct {
  /** Public property documentation */
  public readonly resource: iam.IResource;

  constructor(scope: Construct, id: string, props: MyConstructProps) {
    super(scope, id);
    // Implementation
  }
}
```

## Testing Instructions

### Unit Tests

Tests are located in `test/openclaw-stack.test.ts` using Jest with `aws-cdk-lib/assertions`.

**Test Coverage Areas:**
- VPC creation with correct CIDR
- ECS cluster and task definitions
- ECR repository with lifecycle policies
- EFS file system with access points
- IAM roles with Bedrock permissions
- CloudWatch log groups
- Security group rules
- Stack outputs

**Adding New Tests:**
```typescript
describe('Feature Name', () => {
  test('specific behavior', () => {
    template.hasResourceProperties('AWS::Resource::Type', {
      // Expected properties
    });
  });
});
```

### E2E Tests

Located in `test-e2e/tests/openclaw.spec.ts` using Playwright.

**Test Scenarios:**
1. **ALB Page Load** - Verify HTTP 200, no WebSocket origin errors
2. **Chat Connection** - Verify gateway connection
3. **CloudFront Auth** - Test basic authentication
4. **Config Verification** - Verify gateway settings page

**Running E2E Tests:**
```bash
cd test-e2e
URL=http://<alb-dns> npx playwright test
```

## Deployment Process

### Phase 1: Infrastructure Deployment
```bash
npx cdk deploy --require-approval never
```

Creates:
- VPC with public/private subnets
- ECS cluster and Fargate service
- ALB with target group
- CloudFront distribution
- EFS file system
- S3 bucket
- Secrets Manager secrets
- IAM roles and policies

### Phase 2: Build and Push Container
```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com

# Build image
docker build --platform linux/amd64 -f docker/Dockerfile -t openclaw:latest .

# Tag and push
docker tag openclaw:latest <account>.dkr.ecr.ap-south-1.amazonaws.com/openclaw:latest
docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/openclaw:latest
```

### Phase 3: Deploy Configuration
```bash
# Upload config to S3
aws s3 cp docker/config/openclaw.json s3://openclaw-storage-<account>/config/openclaw.json

# Restart ECS service
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --force-new-deployment
```

### Phase 4: Verify Deployment
```bash
# Check service status
aws ecs describe-services --cluster openclaw-cluster --services openclaw-service

# View logs
aws logs tail /ecs/openclaw --follow

# Test endpoint
curl -v http://<alb-dns>/
```

## Cost Optimization

### Default Configuration (~$72/month)
- ALB: ~$22/month
- NAT Gateway: ~$32/month
- Fargate (512/1024): ~$15/month
- S3 + CloudWatch: ~$3/month

### Cost-Saving Options

| Configuration | Monthly Cost | Best For |
|--------------|--------------|----------|
| **Minimal** | ~$15 | Development, testing |
| **Spot** | ~$35 | Fault-tolerant workloads |
| **Manual** | ~$3 (stopped) | Infrequent use |

**Example: Minimal Cost Deployment**
```typescript
new OpenClawStack(app, 'OpenClawMinimal', {
  cpu: 256,
  memoryMiB: 512,
  useNatGateway: false,      // Saves ~$32/month
  useFargateSpot: true,      // Saves ~70% on compute
});
```

## Security Considerations

### Implemented Security Measures
- ✅ **Private subnets** for containers (by default)
- ✅ **Security groups** with minimal access
- ✅ **IAM roles** with least privilege
- ✅ **Encrypted EFS** at rest
- ✅ **Encrypted CloudWatch** logs
- ✅ **Secrets Manager** for sensitive data
- ✅ **No secrets** in environment variables
- ✅ **Basic auth** via CloudFront Functions

### Security Group Rules
- **ALB**: Allow HTTP (80) and HTTPS (443) from anywhere
- **Fargate**: Allow port 18789 only from ALB security group
- **EFS**: Allow NFS (2049) only from Fargate security group

### IAM Permissions
- **Task Execution Role**: Read secrets, write logs, pull images
- **Task Role**: Bedrock InvokeModel, S3 object access, EFS mount

## Troubleshooting

### Common Issues

**Task fails to start:**
```bash
# Check CloudWatch logs
aws logs tail /ecs/openclaw --follow

# Check task status
aws ecs describe-tasks --cluster openclaw-cluster --tasks <task-id>
```

**Bedrock access denied:**
```bash
# Verify IAM permissions
aws bedrock list-foundation-models --region ap-south-1
```

**EFS mount fails:**
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

**"origin not allowed" WebSocket error:**
- Update `allowedOrigins` in `openclaw.json` to `["*"]`
- Re-upload config to S3 and restart service

**"requires HTTPS" error:**
- Set `allowInsecureAuth: true` in `openclaw.json`
- Re-upload config to S3 and restart service

## Useful Commands

```bash
# Scale service to zero (stop costs)
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --desired-count 0

# Scale service to one (start)
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --desired-count 1

# Force new deployment
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --force-new-deployment

# Get ALB DNS
aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `OpenCl`)].DNSName' --output text

# Get CloudFront URL
aws cloudformation describe-stacks --stack-name OpenClawStack --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' --output text
```

## References

- [OpenClaw Documentation](https://github.com/openclaw/openclaw)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Playwright Documentation](https://playwright.dev/)

---

**Built with AWS CDK v2 and TypeScript**
