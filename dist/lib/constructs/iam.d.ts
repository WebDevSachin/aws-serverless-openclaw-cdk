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
export declare class OpenClawIam extends Construct {
    /**
     * The task execution role for ECS tasks
     * Used for pulling images, reading secrets, and writing logs
     */
    readonly taskExecutionRole: iam.Role;
    /**
     * The task role for ECS tasks
     * Used for Bedrock API calls and S3 access during task execution
     */
    readonly taskRole: iam.Role;
    constructor(scope: Construct, id: string, props: OpenClawIamProps);
}
