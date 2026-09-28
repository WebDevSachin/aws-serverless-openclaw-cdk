import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  DEFAULT_CONTAINER_CONFIG,
  DEFAULT_BEDROCK_CONFIG,
  DEFAULT_LOGGING_CONFIG,
} from '../config';

/**
 * Properties for the OpenClawFargate construct
 */
export interface OpenClawFargateProps {
  /**
   * The VPC to deploy the Fargate service in
   */
  readonly vpc: ec2.IVpc;

  /**
   * The ECS cluster to deploy to (optional, will create one if not provided)
   */
  readonly cluster?: ecs.ICluster;

  /**
   * The task execution role for pulling images and reading secrets
   */
  readonly taskExecutionRole: iam.IRole;

  /**
   * The task role for runtime permissions (Bedrock, S3)
   */
  readonly taskRole: iam.IRole;

  /**
   * The S3 bucket for object storage
   */
  readonly bucket: s3.IBucket;

  /**
   * The Secrets Manager secret for gateway token
   */
  readonly gatewayTokenSecret: secretsmanager.ISecret;

  /**
   * Optional external API secret (contains ANTHROPIC_API_KEY, OPENAI_API_KEY)
   */
  readonly externalApiSecret?: secretsmanager.ISecret;

  /**
   * Optional OpenRouter API secret for accessing various models
   */
  readonly openRouterApiSecret?: secretsmanager.ISecret;

  /**
   * Optional Kimi API secret for direct Kimi API access
   */
  readonly kimiApiSecret?: secretsmanager.ISecret;

  /**
   * CPU units for the task (256, 512, 1024, etc.)
   * @default 512
   */
  readonly cpu?: number;

  /**
   * Memory in MiB for the task
   * @default 1024
   */
  readonly memoryMiB?: number;

  /**
   * Whether to use Graviton (ARM64) architecture
   * @default true
   */
  readonly useGraviton?: boolean;

  /**
   * The Bedrock model ID to use
   * @default 'anthropic.claude-3-5-haiku-20241022-v1:0'
   */
  readonly bedrockModelId?: string;

  /**
   * The AWS region for Bedrock
   * @default 'us-east-1'
   */
  readonly bedrockRegion?: string;

  /**
   * The security group for the Fargate tasks
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * Optional target group for ALB integration
   */
  readonly targetGroup?: elbv2.ApplicationTargetGroup;

  /**
   * Whether to enable auto-scaling
   * @default true
   */
  readonly enableAutoScaling?: boolean;

  /**
   * Minimum capacity for auto-scaling
   * @default 1
   */
  readonly minCapacity?: number;

  /**
   * Maximum capacity for auto-scaling
   * @default 3
   */
  readonly maxCapacity?: number;

  /**
   * ECR repository for container image (optional)
   */
  readonly repository?: ecr.IRepository;

  /**
   * Container image to use (overrides repository if provided)
   */
  readonly containerImage?: ecs.ContainerImage;

  /**
   * Log retention period in days
   * @default 7
   */
  readonly logRetentionDays?: number;

  /**
   * Desired count of tasks
   * @default 1
   */
  readonly desiredCount?: number;

  /**
   * Whether to use Fargate Spot (saves ~70% on compute costs)
   * @default false
   */
  readonly useFargateSpot?: boolean;

  /**
   * Whether to use public subnets (for cost optimization without NAT Gateway)
   * @default false (use private subnets)
   */
  readonly usePublicSubnets?: boolean;
}

/**
 * OpenClaw Fargate Service Construct
 *
 * Creates:
 * - ECS Cluster (if not provided)
 * - Fargate Task Definition with configurable CPU/memory
 * - Container definition with environment variables and secrets
 * - Fargate Service with circuit breaker
 * - CloudWatch Logs
 * - Optional auto-scaling
 */
export class OpenClawFargate extends Construct {
  /**
   * The ECS cluster
   */
  public readonly cluster: ecs.ICluster;

  /**
   * The Fargate service
   */
  public readonly service: ecs.FargateService;

  /**
   * The task definition
   */
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  /**
   * The container definition
   */
  public readonly container: ecs.ContainerDefinition;

  /**
   * The CloudWatch log group
   */
  public readonly logGroup: logs.ILogGroup;

  /**
   * The auto-scaling target (if enabled)
   */
  public readonly autoScalingTarget?: ecs.ScalableTaskCount;

  constructor(scope: Construct, id: string, props: OpenClawFargateProps) {
    super(scope, id);

    // ============================================================
    // Configuration with defaults
    // ============================================================
    const cpu = props.cpu ?? 512;
    const memoryMiB = props.memoryMiB ?? 1024;
    const useGraviton = props.useGraviton ?? false;  // Default to x86_64 for CodeBuild compatibility
    const bedrockModelId = props.bedrockModelId ?? DEFAULT_BEDROCK_CONFIG.modelId;
    const bedrockRegion = props.bedrockRegion ?? DEFAULT_BEDROCK_CONFIG.region ?? 'us-east-1';
    const enableAutoScaling = props.enableAutoScaling ?? true;
    const minCapacity = props.minCapacity ?? 1;
    const maxCapacity = props.maxCapacity ?? 3;
    const logRetentionDays = props.logRetentionDays ?? DEFAULT_LOGGING_CONFIG.retentionDays ?? 7;
    const desiredCount = props.desiredCount ?? 1;
    const useFargateSpot = props.useFargateSpot ?? false;
    const usePublicSubnets = props.usePublicSubnets ?? false;

    // ============================================================
    // ECS Cluster
    // ============================================================
    const isNewCluster = !props.cluster;
    const stackName = cdk.Stack.of(this).stackName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    this.cluster = props.cluster ?? new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: `openclaw-cluster-${stackName}`,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // ============================================================
    // CloudWatch Logs
    // ============================================================
    // Use auto-generated log group name to avoid conflicts
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      retention: logRetentionDays as logs.RetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ============================================================
    // Task Definition
    // ============================================================
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu,
      memoryLimitMiB: memoryMiB,
      executionRole: props.taskExecutionRole,
      taskRole: props.taskRole,
      runtimePlatform: {
        cpuArchitecture: useGraviton
          ? ecs.CpuArchitecture.ARM64
          : ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // ============================================================
    // Container Definition
    // ============================================================
    
    // Determine container image
    let image: ecs.ContainerImage;
    if (props.containerImage) {
      image = props.containerImage;
    } else if (props.repository) {
      // Use the ECR repository image (openclaw:latest should be pushed there)
      image = ecs.ContainerImage.fromEcrRepository(props.repository, 'latest');
    } else {
      // Use public NGINX as placeholder
      image = ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:alpine');
    }

    // Build secrets configuration
    // OPENCLAW_GATEWAY_TOKEN is used by the official OpenClaw image
    const secrets: { [key: string]: ecs.Secret } = {
      OPENCLAW_GATEWAY_TOKEN: ecs.Secret.fromSecretsManager(props.gatewayTokenSecret, 'token'),
    };

    // Add external API secrets if provided
    if (props.externalApiSecret) {
      secrets.ANTHROPIC_API_KEY = ecs.Secret.fromSecretsManager(
        props.externalApiSecret,
        'ANTHROPIC_API_KEY'
      );
      secrets.OPENAI_API_KEY = ecs.Secret.fromSecretsManager(
        props.externalApiSecret,
        'OPENAI_API_KEY'
      );
    }

    // Add OpenRouter API key if provided (for Kimi, Claude, GPT, etc.)
    if (props.openRouterApiSecret) {
      secrets.OPENROUTER_API_KEY = ecs.Secret.fromSecretsManager(
        props.openRouterApiSecret,
        'apiKey'
      );
    }

    // Add Kimi API key if provided (primary model provider)
    if (props.kimiApiSecret) {
      secrets.KIMI_API_KEY = ecs.Secret.fromSecretsManager(
        props.kimiApiSecret,
        'apiKey'
      );
    }

    // Add container to task definition
    this.container = this.taskDefinition.addContainer('openclaw', {
      image,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'openclaw',
        logGroup: this.logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '18789',
        LOG_LEVEL: 'info',
        BEDROCK_MODEL_ID: bedrockModelId,
        BEDROCK_REGION: bedrockRegion,
        S3_BUCKET: props.bucket.bucketName,
      },
      secrets,
      // No command override - Dockerfile ENTRYPOINT + CMD handles startup
      // Config file has bind: "lan" for ALB/ECS compatibility
      // No container health check - relying on ALB health check only
    });

    // Add port mapping
    this.container.addPortMappings({
      containerPort: 18789,  // OpenClaw default port
      protocol: ecs.Protocol.TCP,
    });

    // ============================================================
    // Fargate Service
    // ============================================================
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      serviceName: 'openclaw-service',
      desiredCount,
      // Use public IP in public subnets (cost optimization without NAT Gateway)
      assignPublicIp: usePublicSubnets,
      securityGroups: [props.securityGroup],
      vpcSubnets: {
        subnetType: usePublicSubnets
          ? ec2.SubnetType.PUBLIC
          : ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      // Temporarily disable circuit breaker to debug issues
      // circuitBreaker: { rollback: true },
      healthCheckGracePeriod: cdk.Duration.seconds(300),
      minHealthyPercent: 0,
      // Use Fargate Spot capacity provider if enabled
      capacityProviderStrategies: useFargateSpot
        ? [
            {
              capacityProvider: 'FARGATE_SPOT',
              weight: 1,
            },
          ]
        : undefined,
    });

    // ============================================================
    // ALB Target Group Integration
    // ============================================================
    if (props.targetGroup) {
      this.service.attachToApplicationTargetGroup(props.targetGroup);
    }

    // ============================================================
    // Auto-scaling
    // ============================================================
    if (enableAutoScaling) {
      this.autoScalingTarget = this.service.autoScaleTaskCount({
        minCapacity,
        maxCapacity,
      });

      // Target tracking scaling based on CPU utilization
      this.autoScalingTarget.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: 70,
        scaleInCooldown: cdk.Duration.seconds(300),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });
    }

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service Name',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'TaskDefinitionArn', {
      value: this.taskDefinition.taskDefinitionArn,
      description: 'Task Definition ARN',
    });

    new cdk.CfnOutput(this, 'Architecture', {
      value: useGraviton ? 'ARM64 (Graviton)' : 'X86_64',
      description: 'CPU Architecture',
    });
  }
}
