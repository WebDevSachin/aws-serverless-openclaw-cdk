import * as cdk from 'aws-cdk-lib';
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
export class ConfigManagement extends Construct {
  /**
   * The S3 bucket containing configuration
   */
  public readonly bucket: s3.IBucket;

  /**
   * The Fargate service being managed
   */
  public readonly fargateService: ecs.FargateService;

  /**
   * IAM policy for config access
   */
  public readonly configAccessPolicy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string, props: ConfigManagementProps) {
    super(scope, id);

    this.bucket = props.bucket;
    this.fargateService = props.fargateService;
    const configKeyPrefix = props.configKeyPrefix ?? 'config/';

    // ============================================================
    // IAM Policy for Config Access
    // ============================================================
    // Creates a managed policy that allows reading config files from S3
    this.configAccessPolicy = new iam.ManagedPolicy(this, 'ConfigAccessPolicy', {
      description: 'Policy for reading OpenClaw configuration from S3',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:GetObjectVersion',
            's3:ListBucket',
          ],
          resources: [
            props.bucket.bucketArn,
            `${props.bucket.bucketArn}/${configKeyPrefix}*`,
          ],
        }),
      ],
    });

    // ============================================================
    // Stack Outputs with Documentation
    // ============================================================
    const stackName = cdk.Stack.of(this).stackName;
    new cdk.CfnOutput(this, 'ConfigBucketName', {
      value: props.bucket.bucketName,
      description: 'S3 Bucket containing OpenClaw configuration',
      exportName: `${stackName}-ConfigBucket`,
    });

    new cdk.CfnOutput(this, 'ConfigKeyPrefix', {
      value: configKeyPrefix,
      description: 'S3 key prefix for configuration files',
      exportName: `${stackName}-ConfigPrefix`,
    });

    // ============================================================
    // Documentation Output
    // ============================================================
    new cdk.CfnOutput(this, 'ConfigReloadInstructions', {
      value: JSON.stringify({
        description: 'Manual Config Reload Instructions',
        steps: [
          '1. Update config in S3: aws s3 cp ./config/openclaw.json ' +
            `s3://${props.bucket.bucketName}/${configKeyPrefix}openclaw.json`,
          '2. Restart ECS service: aws ecs update-service ' +
            `--cluster ${props.fargateService.cluster.clusterName} ` +
            `--service ${props.fargateService.serviceName} ` +
            '--force-new-deployment',
        ],
        note: 'For MVP, manual config reload is required. Auto-reload coming in future release.',
      }, null, 2),
      description: 'Instructions for updating OpenClaw configuration at runtime',
    });
  }

  /**
   * Get the S3 URI for the config file
   */
  public getConfigS3Uri(configFileName: string = 'openclaw.json'): string {
    const prefix = this.node.tryGetContext('configKeyPrefix') ?? 'config/';
    return `s3://${this.bucket.bucketName}/${prefix}${configFileName}`;
  }

  /**
   * Get the AWS CLI command to update config
   */
  public getConfigUpdateCommand(localConfigPath: string, configFileName: string = 'openclaw.json'): string {
    const prefix = this.node.tryGetContext('configKeyPrefix') ?? 'config/';
    return `aws s3 cp ${localConfigPath} s3://${this.bucket.bucketName}/${prefix}${configFileName}`;
  }

  /**
   * Get the AWS CLI command to restart the ECS service
   */
  public getServiceRestartCommand(): string {
    return `aws ecs update-service --cluster ${this.fargateService.cluster.clusterName} --service ${this.fargateService.serviceName} --force-new-deployment`;
  }
}
