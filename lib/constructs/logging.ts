import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { DEFAULT_LOGGING_CONFIG } from '../config';

/**
 * Valid log retention days options
 */
export type LogRetentionDays = 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90;

/**
 * Properties for the OpenClawLogging construct
 */
export interface OpenClawLoggingProps {
  /**
   * Log retention period in days
   * @default 7 days
   */
  readonly logRetention?: logs.RetentionDays;

  /**
   * Optional ALB to enable access logging for
   * If provided, an S3 bucket will be created for ALB access logs
   */
  readonly alb?: elbv2.ApplicationLoadBalancer;

  /**
   * Log group name for ECS tasks
   * @default '/ecs/openclaw'
   */
  readonly logGroupName?: string;

  /**
   * Whether to enable log group encryption with AWS managed key
   * @default true
   */
  readonly enableEncryption?: boolean;
}

/**
 * OpenClaw Logging Construct
 *
 * Creates:
 * - CloudWatch Log Group for ECS tasks with configurable retention
 * - Optional S3 bucket for ALB access logs
 * - Optional ALB access logging configuration
 *
 * Features:
 * - Configurable log retention (1, 3, 5, 7, 14, 30, 60, 90 days)
 * - Default 7-day retention for cost optimization
 * - S3 lifecycle policies for log archival
 * - Block all public access on S3 bucket
 */
export class OpenClawLogging extends Construct {
  /**
   * The CloudWatch Log Group for ECS tasks
   */
  public readonly logGroup: logs.ILogGroup;

  /**
   * The S3 bucket for ALB access logs (only if ALB provided)
   */
  public readonly albLogBucket?: s3.IBucket;

  /**
   * The log retention period in days
   */
  private readonly _logRetentionDays: number;

  constructor(scope: Construct, id: string, props?: OpenClawLoggingProps) {
    super(scope, id);

    // ============================================================
    // Configuration with defaults
    // ============================================================
    const logRetentionDays = props?.logRetention ?? DEFAULT_LOGGING_CONFIG.retentionDays ?? 7;
    this._logRetentionDays = logRetentionDays as number;
    const logGroupName = props?.logGroupName ?? '/ecs/openclaw';
    const enableEncryption = props?.enableEncryption ?? DEFAULT_LOGGING_CONFIG.encryption ?? true;

    // ============================================================
    // CloudWatch Log Group for ECS Tasks
    // ============================================================
    // Use auto-generated log group name to avoid conflicts
    // CDK will generate a unique name based on the construct path
    this.logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      retention: logRetentionDays as logs.RetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ============================================================
    // S3 Bucket for ALB Access Logs (if ALB provided)
    // ============================================================
    if (props?.alb) {
      const accountId = cdk.Stack.of(this).account;
      const region = cdk.Stack.of(this).region;

      // Create S3 bucket for ALB access logs
      // Note: ALB access logs require specific bucket naming and permissions
      this.albLogBucket = new s3.Bucket(this, 'AlbLogBucket', {
        bucketName: `openclaw-alb-logs-${accountId}-${region}`,
        lifecycleRules: [
          {
            id: 'TransitionToGlacierAfter30Days',
            transitions: [
              {
                storageClass: s3.StorageClass.GLACIER,
                transitionAfter: cdk.Duration.days(30),
              },
            ],
          },
          {
            id: 'ExpireAfter90Days',
            expiration: cdk.Duration.days(90),
          },
        ],
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      // ============================================================
      // Enable ALB Access Logging
      // ============================================================
      // ALB access logs are delivered to the S3 bucket
      // The bucket policy is automatically managed by CDK
      props.alb.logAccessLogs(this.albLogBucket, 'alb-logs');
    }

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'CloudWatch Log Group Name for OpenClaw ECS tasks',
    });

    if (this.albLogBucket) {
      new cdk.CfnOutput(this, 'AlbLogBucketName', {
        value: this.albLogBucket.bucketName,
        description: 'S3 Bucket Name for ALB Access Logs',
      });

      new cdk.CfnOutput(this, 'AlbLogBucketArn', {
        value: this.albLogBucket.bucketArn,
        description: 'S3 Bucket ARN for ALB Access Logs',
      });
    }
  }

  /**
   * Get the log retention days as a number
   */
  public get logRetentionDays(): number {
    return this._logRetentionDays;
  }
}
