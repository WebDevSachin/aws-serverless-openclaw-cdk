# IAM Enhancement Plan - Maximum AWS Permissions

**Purpose**: Extend OpenClaw's AWS permissions to access additional services beyond Bedrock, S3, and EFS.

---

## Current IAM Permissions

### ✅ Already Granted

| Service | Actions | Resources |
|---------|---------|-----------|
| **Bedrock** | InvokeModel, InvokeModelWithResponseStream | * |
| **S3** | GetObject, PutObject, DeleteObject, ListBucket | openclaw-* |
| **EFS** | ClientMount, ClientWrite, ClientRootAccess | * |
| **Secrets Manager** | GetSecretValue | openclaw/* |
| **CloudWatch Logs** | CreateLogStream, PutLogEvents | * |

---

## Proposed Enhancements

### Option 1: Conservative (Recommended)

Add commonly needed services with scoped permissions:

```typescript
// In lib/constructs/iam.ts - Add to taskRole

// DynamoDB - For structured data storage
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem',
      'dynamodb:Query',
      'dynamodb:Scan',
    ],
    resources: [
      `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/openclaw-*`,
    ],
  })
);

// Lambda - For invoking serverless functions
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'lambda:InvokeFunction',
    ],
    resources: [
      `arn:aws:lambda:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:function:openclaw-*`,
    ],
  })
);

// SQS - For message queues
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'sqs:SendMessage',
      'sqs:ReceiveMessage',
      'sqs:DeleteMessage',
      'sqs:GetQueueAttributes',
    ],
    resources: [
      `arn:aws:sqs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:openclaw-*`,
    ],
  })
);

// SNS - For notifications
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'sns:Publish',
    ],
    resources: [
      `arn:aws:sns:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:openclaw-*`,
    ],
  })
);

// Systems Manager Parameter Store - For configuration
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'ssm:GetParameter',
      'ssm:GetParameters',
      'ssm:GetParametersByPath',
    ],
    resources: [
      `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/openclaw/*`,
    ],
  })
);

// CloudWatch - For metrics and alarms
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'cloudwatch:PutMetricData',
      'cloudwatch:GetMetricStatistics',
      'cloudwatch:ListMetrics',
    ],
    resources: ['*'],  // CloudWatch metrics don't support resource-level permissions
  })
);
```

**Services Added**: DynamoDB, Lambda, SQS, SNS, SSM, CloudWatch  
**Scope**: Limited to `openclaw-*` resources  
**Risk**: 🟡 MEDIUM - Scoped to OpenClaw resources only

---

### Option 2: Moderate

Add more services with broader permissions:

```typescript
// All services from Option 1, plus:

// EC2 - For describing instances (read-only)
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'ec2:DescribeInstances',
      'ec2:DescribeImages',
      'ec2:DescribeSecurityGroups',
      'ec2:DescribeVpcs',
      'ec2:DescribeSubnets',
    ],
    resources: ['*'],  // Describe actions require * resource
  })
);

// ECS - For describing tasks and services
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'ecs:DescribeTasks',
      'ecs:DescribeServices',
      'ecs:DescribeClusters',
      'ecs:ListTasks',
      'ecs:ListServices',
    ],
    resources: ['*'],
  })
);

// Secrets Manager - Write access
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'secretsmanager:CreateSecret',
      'secretsmanager:UpdateSecret',
      'secretsmanager:PutSecretValue',
    ],
    resources: [
      `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:openclaw/*`,
    ],
  })
);

// S3 - Broader access (all buckets, read-only)
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      's3:ListAllMyBuckets',
      's3:GetBucketLocation',
    ],
    resources: ['*'],
  })
);
```

**Services Added**: EC2 (read), ECS (read), Secrets Manager (write), S3 (list all)  
**Scope**: Mix of scoped and account-wide  
**Risk**: 🟠 MEDIUM-HIGH - Can read most AWS resources

---

### Option 3: Maximum (⚠️ Use with Caution)

Grant broad permissions across many services:

```typescript
// All services from Options 1 & 2, plus:

// EC2 - Full control (⚠️ Can launch instances)
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'ec2:RunInstances',
      'ec2:TerminateInstances',
      'ec2:StartInstances',
      'ec2:StopInstances',
      'ec2:CreateSecurityGroup',
      'ec2:AuthorizeSecurityGroupIngress',
      'ec2:CreateKeyPair',
    ],
    resources: ['*'],
  })
);

// Lambda - Full control
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'lambda:CreateFunction',
      'lambda:UpdateFunctionCode',
      'lambda:DeleteFunction',
      'lambda:InvokeFunction',
    ],
    resources: ['*'],
  })
);

// DynamoDB - Full control
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'dynamodb:CreateTable',
      'dynamodb:DeleteTable',
      'dynamodb:*',
    ],
    resources: ['*'],
  })
);

// S3 - Full control (all buckets)
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      's3:*',
    ],
    resources: ['*'],
  })
);

// IAM - Read-only (⚠️ Can view all roles/policies)
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'iam:GetRole',
      'iam:GetPolicy',
      'iam:ListRoles',
      'iam:ListPolicies',
    ],
    resources: ['*'],
  })
);

// CloudFormation - Read-only
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'cloudformation:DescribeStacks',
      'cloudformation:ListStacks',
      'cloudformation:GetTemplate',
    ],
    resources: ['*'],
  })
);

// STS - Assume roles (⚠️ Can escalate privileges)
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'sts:AssumeRole',
    ],
    resources: [
      `arn:aws:iam::${cdk.Stack.of(this).account}:role/openclaw-*`,
    ],
  })
);
```

**Services Added**: EC2 (full), Lambda (full), DynamoDB (full), S3 (full), IAM (read), CloudFormation (read), STS (assume role)  
**Scope**: Account-wide, minimal restrictions  
**Risk**: 🔴 HIGH - Can create/delete resources, potential cost impact

---

## Implementation Steps

### Step 1: Choose Option

Decide which option fits your needs:
- **Option 1**: For typical agent operations (recommended)
- **Option 2**: For advanced automation and monitoring
- **Option 3**: For maximum flexibility (⚠️ security risk)

### Step 2: Update IAM Construct

Edit [`lib/constructs/iam.ts`](../lib/constructs/iam.ts):

```typescript
// Add after existing taskRole policies (around line 175)

// ============================================================
// Extended AWS Service Permissions
// ============================================================

// Add your chosen option's policies here
```

### Step 3: Deploy Changes

```bash
# Synthesize CloudFormation template
npm run build
cdk synth

# Deploy to AWS
cdk deploy --require-approval never

# Verify deployment
aws ecs describe-services \
  --cluster openclaw-cluster \
  --services openclaw-service
```

### Step 4: Test Permissions

```bash
# SSH into running container (via ECS Exec)
aws ecs execute-command \
  --cluster openclaw-cluster \
  --task <task-id> \
  --container openclaw \
  --interactive \
  --command "/bin/bash"

# Test AWS CLI commands
aws dynamodb list-tables
aws lambda list-functions
aws s3 ls
```

### Step 5: Verify in OpenClaw

Test via OpenClaw chat interface:

```
User: Can you list all DynamoDB tables?
Agent: [executes: aws dynamodb list-tables]

User: Can you invoke the openclaw-test Lambda function?
Agent: [executes: aws lambda invoke ...]
```

---

## Cost Implications

### Option 1: Conservative
- **Cost Impact**: Minimal
- **New Services**: DynamoDB, Lambda, SQS, SNS, SSM, CloudWatch
- **Estimated**: $0-5/month (depends on usage)

### Option 2: Moderate
- **Cost Impact**: Low
- **New Services**: + EC2 (read), ECS (read), Secrets Manager (write)
- **Estimated**: $0-10/month

### Option 3: Maximum
- **Cost Impact**: Potentially HIGH
- **New Services**: + EC2 (full), Lambda (full), DynamoDB (full), S3 (full)
- **Estimated**: $0-100+/month (⚠️ agent could create expensive resources)

---

## Security Considerations

### Option 1: Conservative ✅
- ✅ Scoped to `openclaw-*` resources
- ✅ No resource creation (except DynamoDB items)
- ✅ No privilege escalation
- ✅ Minimal blast radius

### Option 2: Moderate ⚠️
- ⚠️ Can read most AWS resources
- ⚠️ Can create secrets
- ⚠️ Can list all S3 buckets
- ✅ Cannot create compute resources

### Option 3: Maximum 🔴
- 🔴 Can create EC2 instances (cost risk)
- 🔴 Can create Lambda functions (code execution)
- 🔴 Can assume roles (privilege escalation)
- 🔴 Can delete resources (data loss)
- 🔴 Full S3 access (data exfiltration)

**Recommendation**: Start with **Option 1**, expand as needed.

---

## Alternative: Least Privilege Approach

Instead of granting broad permissions, create specific IAM roles for specific tasks:

```typescript
// Create a dedicated role for EC2 operations
const ec2Role = new iam.Role(this, 'OpenClawEC2Role', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
  ],
});

// OpenClaw can assume this role when needed
this.taskRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['sts:AssumeRole'],
    resources: [ec2Role.roleArn],
  })
);
```

**Benefits**:
- ✅ Granular control per operation
- ✅ Easy to audit
- ✅ Can revoke specific permissions without redeployment

**Drawbacks**:
- ❌ More complex setup
- ❌ Requires role assumption in code

---

## Monitoring & Auditing

After granting additional permissions, monitor usage:

### CloudTrail Logging

```bash
# View recent API calls by OpenClaw
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=<task-role-name> \
  --max-results 50
```

### CloudWatch Insights

```sql
-- Query CloudWatch Logs for AWS CLI commands
fields @timestamp, @message
| filter @message like /aws /
| sort @timestamp desc
| limit 100
```

### Cost Explorer

```bash
# Check costs by service
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

---

## Rollback Plan

If issues arise after granting permissions:

### Quick Rollback

```bash
# Revert to previous CDK version
git checkout <previous-commit>
cdk deploy --require-approval never
```

### Selective Removal

```typescript
// Comment out specific policies in lib/constructs/iam.ts
// this.taskRole.addToPolicy(...);  // Commented out

// Redeploy
cdk deploy
```

### Emergency Lockdown

```bash
# Attach a deny-all policy to the task role
aws iam put-role-policy \
  --role-name <task-role-name> \
  --policy-name EmergencyDeny \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*"
    }]
  }'

# Force new deployment to pick up changes
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --force-new-deployment
```

---

## Recommendation

**Start with Option 1 (Conservative)** and expand as needed:

1. Deploy Option 1 permissions
2. Test OpenClaw's ability to use new services
3. Monitor costs and usage for 1 week
4. If more permissions needed, upgrade to Option 2
5. Only use Option 3 if absolutely necessary and in a sandbox environment

**Current Status**: OpenClaw has **sufficient permissions** for most agent operations. Additional AWS service access is **optional** and should be added based on specific use cases.

---

## Next Steps

1. Review this plan with your team
2. Choose an option (1, 2, or 3)
3. Update [`lib/constructs/iam.ts`](../lib/constructs/iam.ts)
4. Deploy changes via `cdk deploy`
5. Test new permissions
6. Monitor usage and costs

---

## References

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [ECS Task IAM Roles](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- [Least Privilege Principle](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege)
- [Current IAM Configuration](../lib/constructs/iam.ts)
