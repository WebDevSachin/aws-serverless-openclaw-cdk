"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManagement = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
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
class ConfigManagement extends constructs_1.Construct {
    constructor(scope, id, props) {
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
        new cdk.CfnOutput(this, 'ConfigBucketName', {
            value: props.bucket.bucketName,
            description: 'S3 Bucket containing OpenClaw configuration',
            exportName: 'OpenClawConfigBucket',
        });
        new cdk.CfnOutput(this, 'ConfigKeyPrefix', {
            value: configKeyPrefix,
            description: 'S3 key prefix for configuration files',
            exportName: 'OpenClawConfigPrefix',
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
    getConfigS3Uri(configFileName = 'openclaw.json') {
        const prefix = this.node.tryGetContext('configKeyPrefix') ?? 'config/';
        return `s3://${this.bucket.bucketName}/${prefix}${configFileName}`;
    }
    /**
     * Get the AWS CLI command to update config
     */
    getConfigUpdateCommand(localConfigPath, configFileName = 'openclaw.json') {
        const prefix = this.node.tryGetContext('configKeyPrefix') ?? 'config/';
        return `aws s3 cp ${localConfigPath} s3://${this.bucket.bucketName}/${prefix}${configFileName}`;
    }
    /**
     * Get the AWS CLI command to restart the ECS service
     */
    getServiceRestartCommand() {
        return `aws ecs update-service --cluster ${this.fargateService.cluster.clusterName} --service ${this.fargateService.serviceName} --force-new-deployment`;
    }
}
exports.ConfigManagement = ConfigManagement;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLW1hbmFnZW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvY29uc3RydWN0cy9jb25maWctbWFuYWdlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUluQyx5REFBMkM7QUFDM0MsMkNBQXVDO0FBa0N2Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBQ0gsTUFBYSxnQkFBaUIsU0FBUSxzQkFBUztJQWdCN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUMzQixJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUM7UUFDM0MsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxTQUFTLENBQUM7UUFFM0QsK0RBQStEO1FBQy9ELCtCQUErQjtRQUMvQiwrREFBK0Q7UUFDL0Qsb0VBQW9FO1FBQ3BFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzFFLFdBQVcsRUFBRSxtREFBbUQ7WUFDaEUsVUFBVSxFQUFFO2dCQUNWLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztvQkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztvQkFDeEIsT0FBTyxFQUFFO3dCQUNQLGNBQWM7d0JBQ2QscUJBQXFCO3dCQUNyQixlQUFlO3FCQUNoQjtvQkFDRCxTQUFTLEVBQUU7d0JBQ1QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTO3dCQUN0QixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLGVBQWUsR0FBRztxQkFDaEQ7aUJBQ0YsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsK0RBQStEO1FBQy9ELG1DQUFtQztRQUNuQywrREFBK0Q7UUFDL0QsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVO1lBQzlCLFdBQVcsRUFBRSw2Q0FBNkM7WUFDMUQsVUFBVSxFQUFFLHNCQUFzQjtTQUNuQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxlQUFlO1lBQ3RCLFdBQVcsRUFBRSx1Q0FBdUM7WUFDcEQsVUFBVSxFQUFFLHNCQUFzQjtTQUNuQyxDQUFDLENBQUM7UUFFSCwrREFBK0Q7UUFDL0QsdUJBQXVCO1FBQ3ZCLCtEQUErRDtRQUMvRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNwQixXQUFXLEVBQUUsbUNBQW1DO2dCQUNoRCxLQUFLLEVBQUU7b0JBQ0wsMkRBQTJEO3dCQUN6RCxRQUFRLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLGVBQWUsZUFBZTtvQkFDbkUsaURBQWlEO3dCQUMvQyxhQUFhLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRzt3QkFDeEQsYUFBYSxLQUFLLENBQUMsY0FBYyxDQUFDLFdBQVcsR0FBRzt3QkFDaEQsd0JBQXdCO2lCQUMzQjtnQkFDRCxJQUFJLEVBQUUsa0ZBQWtGO2FBQ3pGLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNYLFdBQVcsRUFBRSw2REFBNkQ7U0FDM0UsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLGlCQUF5QixlQUFlO1FBQzVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLElBQUksU0FBUyxDQUFDO1FBQ3ZFLE9BQU8sUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsSUFBSSxNQUFNLEdBQUcsY0FBYyxFQUFFLENBQUM7SUFDckUsQ0FBQztJQUVEOztPQUVHO0lBQ0ksc0JBQXNCLENBQUMsZUFBdUIsRUFBRSxpQkFBeUIsZUFBZTtRQUM3RixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFNBQVMsQ0FBQztRQUN2RSxPQUFPLGFBQWEsZUFBZSxTQUFTLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLE1BQU0sR0FBRyxjQUFjLEVBQUUsQ0FBQztJQUNsRyxDQUFDO0lBRUQ7O09BRUc7SUFDSSx3QkFBd0I7UUFDN0IsT0FBTyxvQ0FBb0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsV0FBVyxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyx5QkFBeUIsQ0FBQztJQUMzSixDQUFDO0NBQ0Y7QUF0R0QsNENBc0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuLyoqXG4gKiBQcm9wZXJ0aWVzIGZvciB0aGUgQ29uZmlnTWFuYWdlbWVudCBjb25zdHJ1Y3RcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25maWdNYW5hZ2VtZW50UHJvcHMge1xuICAvKipcbiAgICogVGhlIFZQQyB3aGVyZSB0aGUgRmFyZ2F0ZSBzZXJ2aWNlIGlzIGRlcGxveWVkXG4gICAqL1xuICByZWFkb25seSB2cGM6IGVjMi5JVnBjO1xuXG4gIC8qKlxuICAgKiBUaGUgUzMgYnVja2V0IGNvbnRhaW5pbmcgY29uZmlndXJhdGlvbiBmaWxlc1xuICAgKi9cbiAgcmVhZG9ubHkgYnVja2V0OiBzMy5JQnVja2V0O1xuXG4gIC8qKlxuICAgKiBUaGUgRmFyZ2F0ZSBzZXJ2aWNlIHRvIG1hbmFnZVxuICAgKi9cbiAgcmVhZG9ubHkgZmFyZ2F0ZVNlcnZpY2U6IGVjcy5GYXJnYXRlU2VydmljZTtcblxuICAvKipcbiAgICogT3B0aW9uYWw6IFByZWZpeCBmb3IgY29uZmlnIGZpbGVzIGluIFMzXG4gICAqIEBkZWZhdWx0ICdjb25maWcvJ1xuICAgKi9cbiAgcmVhZG9ubHkgY29uZmlnS2V5UHJlZml4Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbDogRW5hYmxlIGF1dG9tYXRpYyBjb25maWcgcmVsb2FkIHZpYSBFdmVudEJyaWRnZVxuICAgKiBAZGVmYXVsdCBmYWxzZSAoTVZQOiBtYW51YWwgcmVsb2FkIG9ubHkpXG4gICAqL1xuICByZWFkb25seSBlbmFibGVBdXRvUmVsb2FkPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDb25maWcgTWFuYWdlbWVudCBDb25zdHJ1Y3QgZm9yIE9wZW5DbGF3XG4gKlxuICogVGhpcyBjb25zdHJ1Y3QgcHJvdmlkZXMgcnVudGltZSBjb25maWd1cmF0aW9uIG1hbmFnZW1lbnQgY2FwYWJpbGl0aWVzLlxuICogRm9yIE1WUCwgaXQgZG9jdW1lbnRzIGFuZCBzZXRzIHVwIHRoZSBtYW51YWwgYXBwcm9hY2guIEZ1dHVyZSBlbmhhbmNlbWVudHNcbiAqIGNvdWxkIGluY2x1ZGUgTGFtYmRhLWJhc2VkIGNvbmZpZyByZWxvYWQgYW5kIEFQSSBHYXRld2F5IGVuZHBvaW50cy5cbiAqXG4gKiBDdXJyZW50IEltcGxlbWVudGF0aW9uIChNVlApOlxuICogLSBDcmVhdGVzIElBTSBwb2xpY3kgZm9yIHJlYWRpbmcgY29uZmlnIGZyb20gUzNcbiAqIC0gRG9jdW1lbnRzIG1hbnVhbCBjb25maWcgdXBkYXRlIHByb2NlZHVyZXNcbiAqXG4gKiBGdXR1cmUgRW5oYW5jZW1lbnRzOlxuICogLSBMYW1iZGEgZnVuY3Rpb24gZm9yIGNvbmZpZyB2YWxpZGF0aW9uIGFuZCByZWxvYWRcbiAqIC0gQVBJIEdhdGV3YXkgZW5kcG9pbnQgZm9yIGFkbWluIG9wZXJhdGlvbnNcbiAqIC0gRXZlbnRCcmlkZ2UgcnVsZSBmb3IgUzMgY29uZmlnIGNoYW5nZXNcbiAqIC0gU1NNIERvY3VtZW50IGZvciBFQ1MgdGFzayByZXN0YXJ0XG4gKlxuICogTWFudWFsIENvbmZpZyBVcGRhdGUgUHJvY2VzczpcbiAqIDEuIFVwZGF0ZSBjb25maWcgZmlsZXMgaW4gUzM6IGF3cyBzMyBjcCAuL2NvbmZpZy9vcGVuY2xhdy5qc29uIHMzOi8vPGJ1Y2tldD4vY29uZmlnL1xuICogMi4gUmVzdGFydCBFQ1MgdGFza3M6IGF3cyBlY3MgdXBkYXRlLXNlcnZpY2UgLS1jbHVzdGVyIDxjbHVzdGVyPiAtLXNlcnZpY2UgPHNlcnZpY2U+IC0tZm9yY2UtbmV3LWRlcGxveW1lbnRcbiAqIDMuIE9yIHVzZSBBV1MgQ0xJIHRvIHRyaWdnZXIgY29uZmlnIHJlbG9hZCB3aXRoaW4gcnVubmluZyBjb250YWluZXJzXG4gKi9cbmV4cG9ydCBjbGFzcyBDb25maWdNYW5hZ2VtZW50IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgLyoqXG4gICAqIFRoZSBTMyBidWNrZXQgY29udGFpbmluZyBjb25maWd1cmF0aW9uXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgYnVja2V0OiBzMy5JQnVja2V0O1xuXG4gIC8qKlxuICAgKiBUaGUgRmFyZ2F0ZSBzZXJ2aWNlIGJlaW5nIG1hbmFnZWRcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBmYXJnYXRlU2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xuXG4gIC8qKlxuICAgKiBJQU0gcG9saWN5IGZvciBjb25maWcgYWNjZXNzXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgY29uZmlnQWNjZXNzUG9saWN5OiBpYW0uTWFuYWdlZFBvbGljeTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ29uZmlnTWFuYWdlbWVudFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIHRoaXMuYnVja2V0ID0gcHJvcHMuYnVja2V0O1xuICAgIHRoaXMuZmFyZ2F0ZVNlcnZpY2UgPSBwcm9wcy5mYXJnYXRlU2VydmljZTtcbiAgICBjb25zdCBjb25maWdLZXlQcmVmaXggPSBwcm9wcy5jb25maWdLZXlQcmVmaXggPz8gJ2NvbmZpZy8nO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSUFNIFBvbGljeSBmb3IgQ29uZmlnIEFjY2Vzc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENyZWF0ZXMgYSBtYW5hZ2VkIHBvbGljeSB0aGF0IGFsbG93cyByZWFkaW5nIGNvbmZpZyBmaWxlcyBmcm9tIFMzXG4gICAgdGhpcy5jb25maWdBY2Nlc3NQb2xpY3kgPSBuZXcgaWFtLk1hbmFnZWRQb2xpY3kodGhpcywgJ0NvbmZpZ0FjY2Vzc1BvbGljeScsIHtcbiAgICAgIGRlc2NyaXB0aW9uOiAnUG9saWN5IGZvciByZWFkaW5nIE9wZW5DbGF3IGNvbmZpZ3VyYXRpb24gZnJvbSBTMycsXG4gICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgICAnczM6R2V0T2JqZWN0VmVyc2lvbicsXG4gICAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgIHByb3BzLmJ1Y2tldC5idWNrZXRBcm4sXG4gICAgICAgICAgICBgJHtwcm9wcy5idWNrZXQuYnVja2V0QXJufS8ke2NvbmZpZ0tleVByZWZpeH0qYCxcbiAgICAgICAgICBdLFxuICAgICAgICB9KSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTdGFjayBPdXRwdXRzIHdpdGggRG9jdW1lbnRhdGlvblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb25maWdCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHByb3BzLmJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgY29udGFpbmluZyBPcGVuQ2xhdyBjb25maWd1cmF0aW9uJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdPcGVuQ2xhd0NvbmZpZ0J1Y2tldCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29uZmlnS2V5UHJlZml4Jywge1xuICAgICAgdmFsdWU6IGNvbmZpZ0tleVByZWZpeCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMga2V5IHByZWZpeCBmb3IgY29uZmlndXJhdGlvbiBmaWxlcycsXG4gICAgICBleHBvcnROYW1lOiAnT3BlbkNsYXdDb25maWdQcmVmaXgnLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gRG9jdW1lbnRhdGlvbiBPdXRwdXRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29uZmlnUmVsb2FkSW5zdHJ1Y3Rpb25zJywge1xuICAgICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdNYW51YWwgQ29uZmlnIFJlbG9hZCBJbnN0cnVjdGlvbnMnLFxuICAgICAgICBzdGVwczogW1xuICAgICAgICAgICcxLiBVcGRhdGUgY29uZmlnIGluIFMzOiBhd3MgczMgY3AgLi9jb25maWcvb3BlbmNsYXcuanNvbiAnICtcbiAgICAgICAgICAgIGBzMzovLyR7cHJvcHMuYnVja2V0LmJ1Y2tldE5hbWV9LyR7Y29uZmlnS2V5UHJlZml4fW9wZW5jbGF3Lmpzb25gLFxuICAgICAgICAgICcyLiBSZXN0YXJ0IEVDUyBzZXJ2aWNlOiBhd3MgZWNzIHVwZGF0ZS1zZXJ2aWNlICcgK1xuICAgICAgICAgICAgYC0tY2x1c3RlciAke3Byb3BzLmZhcmdhdGVTZXJ2aWNlLmNsdXN0ZXIuY2x1c3Rlck5hbWV9IGAgK1xuICAgICAgICAgICAgYC0tc2VydmljZSAke3Byb3BzLmZhcmdhdGVTZXJ2aWNlLnNlcnZpY2VOYW1lfSBgICtcbiAgICAgICAgICAgICctLWZvcmNlLW5ldy1kZXBsb3ltZW50JyxcbiAgICAgICAgXSxcbiAgICAgICAgbm90ZTogJ0ZvciBNVlAsIG1hbnVhbCBjb25maWcgcmVsb2FkIGlzIHJlcXVpcmVkLiBBdXRvLXJlbG9hZCBjb21pbmcgaW4gZnV0dXJlIHJlbGVhc2UuJyxcbiAgICAgIH0sIG51bGwsIDIpLFxuICAgICAgZGVzY3JpcHRpb246ICdJbnN0cnVjdGlvbnMgZm9yIHVwZGF0aW5nIE9wZW5DbGF3IGNvbmZpZ3VyYXRpb24gYXQgcnVudGltZScsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBTMyBVUkkgZm9yIHRoZSBjb25maWcgZmlsZVxuICAgKi9cbiAgcHVibGljIGdldENvbmZpZ1MzVXJpKGNvbmZpZ0ZpbGVOYW1lOiBzdHJpbmcgPSAnb3BlbmNsYXcuanNvbicpOiBzdHJpbmcge1xuICAgIGNvbnN0IHByZWZpeCA9IHRoaXMubm9kZS50cnlHZXRDb250ZXh0KCdjb25maWdLZXlQcmVmaXgnKSA/PyAnY29uZmlnLyc7XG4gICAgcmV0dXJuIGBzMzovLyR7dGhpcy5idWNrZXQuYnVja2V0TmFtZX0vJHtwcmVmaXh9JHtjb25maWdGaWxlTmFtZX1gO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgQVdTIENMSSBjb21tYW5kIHRvIHVwZGF0ZSBjb25maWdcbiAgICovXG4gIHB1YmxpYyBnZXRDb25maWdVcGRhdGVDb21tYW5kKGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nLCBjb25maWdGaWxlTmFtZTogc3RyaW5nID0gJ29wZW5jbGF3Lmpzb24nKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmVmaXggPSB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnY29uZmlnS2V5UHJlZml4JykgPz8gJ2NvbmZpZy8nO1xuICAgIHJldHVybiBgYXdzIHMzIGNwICR7bG9jYWxDb25maWdQYXRofSBzMzovLyR7dGhpcy5idWNrZXQuYnVja2V0TmFtZX0vJHtwcmVmaXh9JHtjb25maWdGaWxlTmFtZX1gO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgQVdTIENMSSBjb21tYW5kIHRvIHJlc3RhcnQgdGhlIEVDUyBzZXJ2aWNlXG4gICAqL1xuICBwdWJsaWMgZ2V0U2VydmljZVJlc3RhcnRDb21tYW5kKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBhd3MgZWNzIHVwZGF0ZS1zZXJ2aWNlIC0tY2x1c3RlciAke3RoaXMuZmFyZ2F0ZVNlcnZpY2UuY2x1c3Rlci5jbHVzdGVyTmFtZX0gLS1zZXJ2aWNlICR7dGhpcy5mYXJnYXRlU2VydmljZS5zZXJ2aWNlTmFtZX0gLS1mb3JjZS1uZXctZGVwbG95bWVudGA7XG4gIH1cbn1cbiJdfQ==