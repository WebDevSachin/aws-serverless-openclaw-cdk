import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { OpenClawStackProps } from './types';
/**
 * OpenClaw Stack - Self-hosted autonomous agent platform
 *
 * This stack deploys OpenClaw on AWS using ECS Fargate with:
 * - VPC with public and private subnets (via OpenClawVpc construct)
 * - ECS Cluster with Fargate capacity provider
 * - ECR repository for container images
 * - EFS for persistent storage
 * - S3 for object storage with default config deployment
 * - Secrets Manager for sensitive configuration
 * - CloudWatch Logs for logging (via OpenClawLogging construct)
 * - Application Load Balancer (via OpenClawAlb construct)
 * - IAM roles with Bedrock permissions (via OpenClawIam construct)
 * - Config Management for runtime configuration updates
 */
export declare class OpenClawStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: OpenClawStackProps);
}
