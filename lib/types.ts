import * as cdk from 'aws-cdk-lib';

/**
 * Properties for the OpenClawStack
 */
export interface OpenClawStackProps extends cdk.StackProps {
  /**
   * The amount of CPU to allocate to the container
   * @default 512 (0.5 vCPU)
   */
  readonly cpu?: number;

  /**
   * The amount of memory (in MiB) to allocate to the container
   * @default 1024 (1 GB)
   */
  readonly memoryMiB?: number;

  /**
   * The Bedrock model ID to use for OpenClaw
   * @default 'anthropic.claude-3-5-haiku-20241022-v1:0'
   */
  readonly bedrockModel?: string;

  /**
   * Whether to use Graviton (ARM64) instances for cost optimization
   * @default true
   */
  readonly useGraviton?: boolean;

  /**
   * The VPC ID to use (if not provided, a new VPC will be created)
   * @default undefined
   */
  readonly vpcId?: string;

  /**
   * ACM certificate ARN for HTTPS
   * @default undefined (HTTP only)
   */
  readonly certificateArn?: string;

  /**
   * Domain name for the ALB
   * @default undefined
   */
  readonly domainName?: string;

  // ============================================================
  // COST OPTIMIZATION OPTIONS
  // ============================================================

  /**
   * Whether to use NAT Gateway (expensive ~$32/month).
   * Set to false to run Fargate tasks in public subnets (saves ~$32/month).
   * WARNING: Tasks in public subnets have public IPs but are still secure with security groups.
   * @default true (use NAT Gateway for security best practice)
   */
  readonly useNatGateway?: boolean;

  /**
   * Whether to use Fargate Spot instances (saves ~70% on compute costs).
   * Spot tasks can be interrupted when AWS needs capacity back.
   * Good for: Development, non-critical workloads, fault-tolerant apps.
   * @default false
   */
  readonly useFargateSpot?: boolean;

  /**
   * Whether to use NLB instead of ALB (saves ~$17/month).
   * NLB is cheaper but has fewer features (no HTTP routing, no WebSocket).
   * Good for: Simple TCP/HTTP forwarding, cost-sensitive setups.
   * @default false (use ALB)
   */
  readonly useNlbInsteadOfAlb?: boolean;

  /**
   * Whether to use API Gateway HTTP API instead of ALB (saves ~$20/month at low traffic).
   * API Gateway: Pay per request (~$1/million requests), no hourly charge.
   * ALB: Fixed ~$22/month regardless of usage.
   * Good for: Low traffic, intermittent usage.
   * @default false (use ALB)
   */
  readonly useApiGateway?: boolean;

  /**
   * Auto-stop schedule to shut down Fargate tasks when not needed.
   * Format: Cron expression (e.g., '0 18 * * ?' for 6 PM daily)
   * Set to undefined to disable auto-stop.
   * @default undefined
   */
  readonly autoStopSchedule?: string;

  /**
   * Auto-start schedule to start Fargate tasks when needed.
   * Format: Cron expression (e.g., '0 8 * * ?' for 8 AM daily)
   * Must be used with autoStopSchedule.
   * @default undefined
   */
  readonly autoStartSchedule?: string;

  /**
   * Desired count of tasks. Set to 0 to effectively "stop" the service.
   * Useful for manual start/stop to save costs.
   * @default 1
   */
  readonly desiredCount?: number;
}

/**
 * Container configuration for OpenClaw
 */
export interface ContainerConfig {
  /**
   * Container image name
   */
  readonly imageName: string;

  /**
   * Container image tag
   * @default 'latest'
   */
  readonly imageTag?: string;

  /**
   * Container port
   * @default 3000
   */
  readonly containerPort?: number;

  /**
   * Health check path
   * @default '/health'
   */
  readonly healthCheckPath?: string;

  /**
   * Environment variables for the container
   */
  readonly environment?: { [key: string]: string };

  /**
   * Secrets to inject into the container
   */
  readonly secrets?: { [key: string]: string };
}

/**
 * Bedrock configuration
 */
export interface BedrockConfig {
  /**
   * The model ID to use
   */
  readonly modelId: string;

  /**
   * The region where Bedrock is available
   * @default 'us-east-1'
   */
  readonly region?: string;

  /**
   * Maximum tokens for model responses
   * @default 4096
   */
  readonly maxTokens?: number;

  /**
   * Temperature for model responses
   * @default 0.7
   */
  readonly temperature?: number;

  /**
   * Top P for model responses
   * @default 0.9
   */
  readonly topP?: number;
}

/**
 * Networking configuration
 */
export interface NetworkingConfig {
  /**
   * Whether to create a new VPC
   * @default true
   */
  readonly createVpc?: boolean;

  /**
   * VPC CIDR block
   * @default '10.0.0.0/16'
   */
  readonly vpcCidr?: string;

  /**
   * Maximum number of Availability Zones
   * @default 2
   */
  readonly maxAzs?: number;

  /**
   * Whether to create a NAT gateway
   * @default true
   */
  readonly natGateways?: number;

  /**
   * Whether to use public subnets for the container
   * @default false
   */
  readonly publicSubnets?: boolean;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /**
   * Whether to enable EFS for persistent storage
   * @default true
   */
  readonly enableEfs?: boolean;

  /**
   * EFS throughput mode
   * @default 'bursting'
   */
  readonly throughputMode?: 'bursting' | 'provisioned';

  /**
   * EFS provisioned throughput (in MiB/s)
   * Only used when throughputMode is 'provisioned'
   * @default undefined
   */
  readonly provisionedThroughput?: number;

  /**
   * EFS lifecycle policy
   * @default 'AFTER_30_DAYS'
   */
  readonly lifecyclePolicy?: string;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /**
   * Log retention period in days
   * @default 7
   */
  readonly retentionDays?: number;

  /**
   * Whether to enable log encryption
   * @default true
   */
  readonly encryption?: boolean;
}
