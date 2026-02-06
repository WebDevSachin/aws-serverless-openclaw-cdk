import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
/**
 * Properties for the ConfigManagement construct
 */
export interface ConfigManagementProps {
    /**
     * The VPC where the Fargate service is deployed
     */
    readonly vpc: ec2.IVpc;
    /**
     * The S3 bucket containing configuration files
     */
    readonly bucket: s3.IBucket;
    /**
     * The Fargate service to manage
     */
    readonly fargateService: ecs.FargateService;
    /**
     * Optional: Prefix for config files in S3
     * @default 'config/'
     */
    readonly configKeyPrefix?: string;
    /**
     * Optional: Enable automatic config reload via EventBridge
     * @default false (MVP: manual reload only)
     */
    readonly enableAutoReload?: boolean;
}
/**
 * Config Management Construct for OpenClaw
 *
 * This construct provides runtime configuration management capabilities.
 * For MVP, it documents and sets up the manual approach. Future enhancements
 * could include Lambda-based config reload and API Gateway endpoints.
 *
 * Current Implementation (MVP):
 * - Creates IAM policy for reading config from S3
 * - Documents manual config update procedures
 *
 * Future Enhancements:
 * - Lambda function for config validation and reload
 * - API Gateway endpoint for admin operations
 * - EventBridge rule for S3 config changes
 * - SSM Document for ECS task restart
 *
 * Manual Config Update Process:
 * 1. Update config files in S3: aws s3 cp ./config/openclaw.json s3://<bucket>/config/
 * 2. Restart ECS tasks: aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment
 * 3. Or use AWS CLI to trigger config reload within running containers
 */
export declare class ConfigManagement extends Construct {
    /**
     * The S3 bucket containing configuration
     */
    readonly bucket: s3.IBucket;
    /**
     * The Fargate service being managed
     */
    readonly fargateService: ecs.FargateService;
    /**
     * IAM policy for config access
     */
    readonly configAccessPolicy: iam.ManagedPolicy;
    constructor(scope: Construct, id: string, props: ConfigManagementProps);
    /**
     * Get the S3 URI for the config file
     */
    getConfigS3Uri(configFileName?: string): string;
    /**
     * Get the AWS CLI command to update config
     */
    getConfigUpdateCommand(localConfigPath: string, configFileName?: string): string;
    /**
     * Get the AWS CLI command to restart the ECS service
     */
    getServiceRestartCommand(): string;
}
