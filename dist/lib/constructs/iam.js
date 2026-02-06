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
exports.OpenClawIam = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
/**
 * OpenClaw IAM Roles Construct
 *
 * Creates IAM roles for ECS task execution and task runtime:
 * - Task Execution Role: For pulling images, reading secrets, writing logs
 * - Task Role: For Bedrock and S3 access during task execution
 */
class OpenClawIam extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // ============================================================
        // Task Execution Role
        // ============================================================
        // Role for ECS task execution - pulling images, reading secrets, writing logs
        this.taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
            roleName: cdk.PhysicalName.GENERATE_IF_NEEDED,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: 'Execution role for OpenClaw ECS tasks',
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
            ],
        });
        // Inline policy for Secrets Manager read access
        this.taskExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'secretsmanager:GetSecretValue',
            ],
            resources: [
                props.gatewayTokenSecretArn,
                ...(props.externalApiSecretArn ? [props.externalApiSecretArn] : []),
            ],
        }));
        // Inline policy for CloudWatch Logs (beyond the managed policy)
        this.taskExecutionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));
        // ============================================================
        // Task Role
        // ============================================================
        // Role for the application runtime - Bedrock and S3 access
        this.taskRole = new iam.Role(this, 'TaskRole', {
            roleName: cdk.PhysicalName.GENERATE_IF_NEEDED,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: 'Task role for OpenClaw ECS tasks with Bedrock and S3 access',
        });
        // Inline policy for Bedrock InvokeModel permissions
        // Note: Bedrock requires '*' resource for InvokeModel in most cases
        // as specific foundation model ARNs don't always work due to how Bedrock handles resources
        this.taskRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: ['*'],
            conditions: {
                // Optional: Add condition to restrict to specific model if needed
                // For now, we allow all foundation models
                StringEquals: {
                    'aws:RequestedRegion': cdk.Stack.of(this).region,
                },
            },
        }));
        // Inline policy for S3 bucket access (least privilege)
        this.taskRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
            ],
            resources: [`${props.bucketArn}/*`],
        }));
        // Separate statement for ListBucket (requires bucket ARN, not object ARN)
        this.taskRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:ListBucket',
            ],
            resources: [props.bucketArn],
        }));
        // Inline policy for EFS access if file system ARN is provided
        if (props.efsFileSystemArn) {
            this.taskRole.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'elasticfilesystem:ClientMount',
                    'elasticfilesystem:ClientWrite',
                ],
                resources: [props.efsFileSystemArn],
            }));
        }
        // ============================================================
        // Outputs
        // ============================================================
        new cdk.CfnOutput(this, 'TaskExecutionRoleArn', {
            value: this.taskExecutionRole.roleArn,
            description: 'ARN of the Task Execution Role',
        });
        new cdk.CfnOutput(this, 'TaskRoleArn', {
            value: this.taskRole.roleArn,
            description: 'ARN of the Task Role',
        });
    }
}
exports.OpenClawIam = OpenClawIam;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWFtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2NvbnN0cnVjdHMvaWFtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQywyQ0FBdUM7QUFpQ3ZDOzs7Ozs7R0FNRztBQUNILE1BQWEsV0FBWSxTQUFRLHNCQUFTO0lBYXhDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQiwrREFBK0Q7UUFDL0Qsc0JBQXNCO1FBQ3RCLCtEQUErRDtRQUMvRCw4RUFBOEU7UUFDOUUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDL0QsUUFBUSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsa0JBQWtCO1lBQzdDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQztZQUM5RCxXQUFXLEVBQUUsdUNBQXVDO1lBQ3BELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUN4QywrQ0FBK0MsQ0FDaEQ7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUNoQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AsK0JBQStCO2FBQ2hDO1lBQ0QsU0FBUyxFQUFFO2dCQUNULEtBQUssQ0FBQyxxQkFBcUI7Z0JBQzNCLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFD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LENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPO1lBQzVCLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBM0lELGtDQTJJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuLyoqXG4gKiBQcm9wZXJ0aWVzIGZvciB0aGUgT3BlbkNsYXdJYW0gY29uc3RydWN0XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3BlbkNsYXdJYW1Qcm9wcyB7XG4gIC8qKlxuICAgKiBUaGUgQVJOIG9mIHRoZSBTMyBidWNrZXQgZm9yIE9wZW5DbGF3IHN0b3JhZ2VcbiAgICovXG4gIHJlYWRvbmx5IGJ1Y2tldEFybjogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgQVJOIG9mIHRoZSBTZWNyZXRzIE1hbmFnZXIgc2VjcmV0IGZvciBnYXRld2F5IHRva2VuXG4gICAqL1xuICByZWFkb25seSBnYXRld2F5VG9rZW5TZWNyZXRBcm46IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIEFSTiBvZiB0aGUgU2VjcmV0cyBNYW5hZ2VyIHNlY3JldCBmb3IgZXh0ZXJuYWwgQVBJIChvcHRpb25hbClcbiAgICovXG4gIHJlYWRvbmx5IGV4dGVybmFsQXBpU2VjcmV0QXJuPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgQVJOIG9mIHRoZSBFRlMgZmlsZSBzeXN0ZW0gKG9wdGlvbmFsLCBmb3IgRUZTIGFjY2VzcyBwZXJtaXNzaW9ucylcbiAgICovXG4gIHJlYWRvbmx5IGVmc0ZpbGVTeXN0ZW1Bcm4/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBCZWRyb2NrIG1vZGVsIElEIGZvciByZXNvdXJjZS1zcGVjaWZpYyBwZXJtaXNzaW9uc1xuICAgKiBAZGVmYXVsdCAnKicgLSBhbGxvd3MgYWxsIEJlZHJvY2sgbW9kZWxzIChsZXNzIHJlc3RyaWN0aXZlKVxuICAgKi9cbiAgcmVhZG9ubHkgYmVkcm9ja01vZGVsSWQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogT3BlbkNsYXcgSUFNIFJvbGVzIENvbnN0cnVjdFxuICpcbiAqIENyZWF0ZXMgSUFNIHJvbGVzIGZvciBFQ1MgdGFzayBleGVjdXRpb24gYW5kIHRhc2sgcnVudGltZTpcbiAqIC0gVGFzayBFeGVjdXRpb24gUm9sZTogRm9yIHB1bGxpbmcgaW1hZ2VzLCByZWFkaW5nIHNlY3JldHMsIHdyaXRpbmcgbG9nc1xuICogLSBUYXNrIFJvbGU6IEZvciBCZWRyb2NrIGFuZCBTMyBhY2Nlc3MgZHVyaW5nIHRhc2sgZXhlY3V0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBPcGVuQ2xhd0lhbSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIC8qKlxuICAgKiBUaGUgdGFzayBleGVjdXRpb24gcm9sZSBmb3IgRUNTIHRhc2tzXG4gICAqIFVzZWQgZm9yIHB1bGxpbmcgaW1hZ2VzLCByZWFkaW5nIHNlY3JldHMsIGFuZCB3cml0aW5nIGxvZ3NcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0YXNrRXhlY3V0aW9uUm9sZTogaWFtLlJvbGU7XG5cbiAgLyoqXG4gICAqIFRoZSB0YXNrIHJvbGUgZm9yIEVDUyB0YXNrc1xuICAgKiBVc2VkIGZvciBCZWRyb2NrIEFQSSBjYWxscyBhbmQgUzMgYWNjZXNzIGR1cmluZyB0YXNrIGV4ZWN1dGlvblxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHRhc2tSb2xlOiBpYW0uUm9sZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogT3BlbkNsYXdJYW1Qcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBUYXNrIEV4ZWN1dGlvbiBSb2xlXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUm9sZSBmb3IgRUNTIHRhc2sgZXhlY3V0aW9uIC0gcHVsbGluZyBpbWFnZXMsIHJlYWRpbmcgc2VjcmV0cywgd3JpdGluZyBsb2dzXG4gICAgdGhpcy50YXNrRXhlY3V0aW9uUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnVGFza0V4ZWN1dGlvblJvbGUnLCB7XG4gICAgICByb2xlTmFtZTogY2RrLlBoeXNpY2FsTmFtZS5HRU5FUkFURV9JRl9ORUVERUQsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRXhlY3V0aW9uIHJvbGUgZm9yIE9wZW5DbGF3IEVDUyB0YXNrcycsXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICAgICdzZXJ2aWNlLXJvbGUvQW1hem9uRUNTVGFza0V4ZWN1dGlvblJvbGVQb2xpY3knXG4gICAgICAgICksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gSW5saW5lIHBvbGljeSBmb3IgU2VjcmV0cyBNYW5hZ2VyIHJlYWQgYWNjZXNzXG4gICAgdGhpcy50YXNrRXhlY3V0aW9uUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgcHJvcHMuZ2F0ZXdheVRva2VuU2VjcmV0QXJuLFxuICAgICAgICAgIC4uLihwcm9wcy5leHRlcm5hbEFwaVNlY3JldEFybiA/IFtwcm9wcy5leHRlcm5hbEFwaVNlY3JldEFybl0gOiBbXSksXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBJbmxpbmUgcG9saWN5IGZvciBDbG91ZFdhdGNoIExvZ3MgKGJleW9uZCB0aGUgbWFuYWdlZCBwb2xpY3kpXG4gICAgdGhpcy50YXNrRXhlY3V0aW9uUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVGFzayBSb2xlXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUm9sZSBmb3IgdGhlIGFwcGxpY2F0aW9uIHJ1bnRpbWUgLSBCZWRyb2NrIGFuZCBTMyBhY2Nlc3NcbiAgICB0aGlzLnRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdUYXNrUm9sZScsIHtcbiAgICAgIHJvbGVOYW1lOiBjZGsuUGh5c2ljYWxOYW1lLkdFTkVSQVRFX0lGX05FRURFRCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdUYXNrIHJvbGUgZm9yIE9wZW5DbGF3IEVDUyB0YXNrcyB3aXRoIEJlZHJvY2sgYW5kIFMzIGFjY2VzcycsXG4gICAgfSk7XG5cbiAgICAvLyBJbmxpbmUgcG9saWN5IGZvciBCZWRyb2NrIEludm9rZU1vZGVsIHBlcm1pc3Npb25zXG4gICAgLy8gTm90ZTogQmVkcm9jayByZXF1aXJlcyAnKicgcmVzb3VyY2UgZm9yIEludm9rZU1vZGVsIGluIG1vc3QgY2FzZXNcbiAgICAvLyBhcyBzcGVjaWZpYyBmb3VuZGF0aW9uIG1vZGVsIEFSTnMgZG9uJ3QgYWx3YXlzIHdvcmsgZHVlIHRvIGhvdyBCZWRyb2NrIGhhbmRsZXMgcmVzb3VyY2VzXG4gICAgdGhpcy50YXNrUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIC8vIE9wdGlvbmFsOiBBZGQgY29uZGl0aW9uIHRvIHJlc3RyaWN0IHRvIHNwZWNpZmljIG1vZGVsIGlmIG5lZWRlZFxuICAgICAgICAgIC8vIEZvciBub3csIHdlIGFsbG93IGFsbCBmb3VuZGF0aW9uIG1vZGVsc1xuICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgJ2F3czpSZXF1ZXN0ZWRSZWdpb24nOiBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBJbmxpbmUgcG9saWN5IGZvciBTMyBidWNrZXQgYWNjZXNzIChsZWFzdCBwcml2aWxlZ2UpXG4gICAgdGhpcy50YXNrUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW2Ake3Byb3BzLmJ1Y2tldEFybn0vKmBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gU2VwYXJhdGUgc3RhdGVtZW50IGZvciBMaXN0QnVja2V0IChyZXF1aXJlcyBidWNrZXQgQVJOLCBub3Qgb2JqZWN0IEFSTilcbiAgICB0aGlzLnRhc2tSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW3Byb3BzLmJ1Y2tldEFybl0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBJbmxpbmUgcG9saWN5IGZvciBFRlMgYWNjZXNzIGlmIGZpbGUgc3lzdGVtIEFSTiBpcyBwcm92aWRlZFxuICAgIGlmIChwcm9wcy5lZnNGaWxlU3lzdGVtQXJuKSB7XG4gICAgICB0aGlzLnRhc2tSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICdlbGFzdGljZmlsZXN5c3RlbTpDbGllbnRNb3VudCcsXG4gICAgICAgICAgICAnZWxhc3RpY2ZpbGVzeXN0ZW06Q2xpZW50V3JpdGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZWZzRmlsZVN5c3RlbUFybl0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE91dHB1dHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFza0V4ZWN1dGlvblJvbGVBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy50YXNrRXhlY3V0aW9uUm9sZS5yb2xlQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIFRhc2sgRXhlY3V0aW9uIFJvbGUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Rhc2tSb2xlQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMudGFza1JvbGUucm9sZUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBUYXNrIFJvbGUnLFxuICAgIH0pO1xuICB9XG59XG4iXX0=