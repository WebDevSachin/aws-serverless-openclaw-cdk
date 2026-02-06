import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
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
export declare class OpenClawLogging extends Construct {
    /**
     * The CloudWatch Log Group for ECS tasks
     */
    readonly logGroup: logs.ILogGroup;
    /**
     * The S3 bucket for ALB access logs (only if ALB provided)
     */
    readonly albLogBucket?: s3.IBucket;
    /**
     * The log retention period in days
     */
    private readonly _logRetentionDays;
    constructor(scope: Construct, id: string, props?: OpenClawLoggingProps);
    /**
     * Get the log retention days as a number
     */
    get logRetentionDays(): number;
}
