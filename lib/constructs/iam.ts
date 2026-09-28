import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Properties for the OpenClawIam construct
 */
export interface OpenClawIamProps {
  /**
   * The ARN of the S3 bucket for OpenClaw storage
   */
  readonly bucketArn: string;

  /**
   * The ARN of the Secrets Manager secret for gateway token
   */
  readonly gatewayTokenSecretArn: string;

  /**
   * The ARN of the Secrets Manager secret for external API (optional)
   */
  readonly externalApiSecretArn?: string;

  /**
   * The ARN of the Secrets Manager secret for OpenRouter API key (optional)
   */
  readonly openRouterApiSecretArn?: string;

  /**
   * The ARN of the Secrets Manager secret for Kimi API key (optional)
   */
  readonly kimiApiSecretArn?: string;

  /**
   * The ARN of the EFS file system (optional, for EFS access permissions)
   */
  readonly efsFileSystemArn?: string;

  /**
   * The Bedrock model ID for resource-specific permissions
   * @default '*' - allows all Bedrock models (less restrictive)
   */
  readonly bedrockModelId?: string;
}

/**
 * OpenClaw IAM Roles Construct
 *
 * Creates IAM roles for ECS task execution and task runtime:
 * - Task Execution Role: For pulling images, reading secrets, writing logs
 * - Task Role: For Bedrock and S3 access during task execution
 */
export class OpenClawIam extends Construct {
  /**
   * The task execution role for ECS tasks
   * Used for pulling images, reading secrets, and writing logs
   */
  public readonly taskExecutionRole: iam.Role;

  /**
   * The task role for ECS tasks
   * Used for Bedrock API calls and S3 access during task execution
   */
  public readonly taskRole: iam.Role;

  constructor(scope: Construct, id: string, props: OpenClawIamProps) {
    super(scope, id);

    // ============================================================
    // Task Execution Role
    // ============================================================
    // Role for ECS task execution - pulling images, reading secrets, writing logs
    this.taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      roleName: cdk.PhysicalName.GENERATE_IF_NEEDED,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Execution role for OpenClaw ECS tasks',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });

    // Inline policy for Secrets Manager read access
    this.taskExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
        ],
        resources: [
          props.gatewayTokenSecretArn,
          ...(props.externalApiSecretArn ? [props.externalApiSecretArn] : []),
          ...(props.openRouterApiSecretArn ? [props.openRouterApiSecretArn] : []),
          ...(props.kimiApiSecretArn ? [props.kimiApiSecretArn] : []),
        ],
      })
    );

    // Inline policy for CloudWatch Logs (beyond the managed policy)
    this.taskExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      })
    );

    // ============================================================
    // Task Role
    // ============================================================
    // Role for the application runtime - Bedrock and S3 access
    this.taskRole = new iam.Role(this, 'TaskRole', {
      roleName: cdk.PhysicalName.GENERATE_IF_NEEDED,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Task role for OpenClaw ECS tasks with Bedrock and S3 access',
    });

    // Inline policy for Bedrock InvokeModel permissions
    // Note: Bedrock requires '*' resource for InvokeModel in most cases
    // as specific foundation model ARNs don't always work due to how Bedrock handles resources
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
        conditions: {
          // Optional: Add condition to restrict to specific model if needed
          // For now, we allow all foundation models
          StringEquals: {
            'aws:RequestedRegion': cdk.Stack.of(this).region,
          },
        },
      })
    );

    // Inline policy for S3 bucket access (least privilege)
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
        ],
        resources: [`${props.bucketArn}/*`],
      })
    );

    // Separate statement for ListBucket (requires bucket ARN, not object ARN)
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:ListBucket',
        ],
        resources: [props.bucketArn],
      })
    );

    // Inline policy for EFS access if file system ARN is provided
    // Include ClientRootAccess for full permissions via access point
    if (props.efsFileSystemArn) {
      this.taskRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'elasticfilesystem:ClientMount',
            'elasticfilesystem:ClientWrite',
            'elasticfilesystem:ClientRootAccess',
          ],
          resources: [props.efsFileSystemArn],
        })
      );
    }

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'TaskExecutionRoleArn', {
      value: this.taskExecutionRole.roleArn,
      description: 'ARN of the Task Execution Role',
    });

    new cdk.CfnOutput(this, 'TaskRoleArn', {
      value: this.taskRole.roleArn,
      description: 'ARN of the Task Role',
    });
  }
}
