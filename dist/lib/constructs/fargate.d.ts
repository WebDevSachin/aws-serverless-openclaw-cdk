import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
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
export declare class OpenClawFargate extends Construct {
    /**
     * The ECS cluster
     */
    readonly cluster: ecs.ICluster;
    /**
     * The Fargate service
     */
    readonly service: ecs.FargateService;
    /**
     * The task definition
     */
    readonly taskDefinition: ecs.FargateTaskDefinition;
    /**
     * The container definition
     */
    readonly container: ecs.ContainerDefinition;
    /**
     * The CloudWatch log group
     */
    readonly logGroup: logs.ILogGroup;
    /**
     * The auto-scaling target (if enabled)
     */
    readonly autoScalingTarget?: ecs.ScalableTaskCount;
    constructor(scope: Construct, id: string, props: OpenClawFargateProps);
}
