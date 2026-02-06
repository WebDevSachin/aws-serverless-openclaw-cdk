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
exports.OpenClawLogging = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const constructs_1 = require("constructs");
const config_1 = require("../config");
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
class OpenClawLogging extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // ============================================================
        // Configuration with defaults
        // ============================================================
        const logRetentionDays = props?.logRetention ?? config_1.DEFAULT_LOGGING_CONFIG.retentionDays ?? 7;
        this._logRetentionDays = logRetentionDays;
        const logGroupName = props?.logGroupName ?? '/ecs/openclaw';
        const enableEncryption = props?.enableEncryption ?? config_1.DEFAULT_LOGGING_CONFIG.encryption ?? true;
        // ============================================================
        // CloudWatch Log Group for ECS Tasks
        // ============================================================
        // Use auto-generated log group name to avoid conflicts
        // CDK will generate a unique name based on the construct path
        this.logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
            retention: logRetentionDays,
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
    get logRetentionDays() {
        return this._logRetentionDays;
    }
}
exports.OpenClawLogging = OpenClawLogging;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zdHJ1Y3RzL2xvZ2dpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsMkRBQTZDO0FBQzdDLHVEQUF5QztBQUV6QywyQ0FBdUM7QUFDdkMsc0NBQW1EO0FBb0NuRDs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBYSxlQUFnQixTQUFRLHNCQUFTO0lBZ0I1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsK0RBQStEO1FBQy9ELDhCQUE4QjtRQUM5QiwrREFBK0Q7UUFDL0QsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQUUsWUFBWSxJQUFJLCtCQUFzQixDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUEwQixDQUFDO1FBQ3BELE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBRSxZQUFZLElBQUksZUFBZSxDQUFDO1FBQzVELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUFFLGdCQUFnQixJQUFJLCtCQUFzQixDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUM7UUFFOUYsK0RBQStEO1FBQy9ELHFDQUFxQztRQUNyQywrREFBK0Q7UUFDL0QsdURBQXVEO1FBQ3ZELDhEQUE4RDtRQUM5RCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JELFNBQVMsRUFBRSxnQkFBc0M7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCwrREFBK0Q7UUFDL0Qsa0RBQWtEO1FBQ2xELCtEQUErRDtRQUMvRCxJQUFJLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUNmLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUM3QyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFFekMsdUNBQXVDO1lBQ3ZDLHVFQUF1RTtZQUN2RSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO2dCQUN0RCxVQUFVLEVBQUUscUJBQXFCLFNBQVMsSUFBSSxNQUFNLEVBQUU7Z0JBQ3RELGNBQWMsRUFBRTtvQkFDZDt3QkFDRSxFQUFFLEVBQUUsZ0NBQWdDO3dCQUNwQyxXQUFXLEVBQUU7NEJBQ1g7Z0NBQ0UsWUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTztnQ0FDckMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs2QkFDdkM7eUJBQ0Y7cUJBQ0Y7b0JBQ0Q7d0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjt3QkFDdkIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztxQkFDbEM7aUJBQ0Y7Z0JBQ0QsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7Z0JBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDeEMsQ0FBQyxDQUFDO1lBRUgsK0RBQStEO1lBQy9ELDRCQUE0QjtZQUM1QiwrREFBK0Q7WUFDL0QsaURBQWlEO1lBQ2pELG9EQUFvRDtZQUNwRCxLQUFLLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFRCwrREFBK0Q7UUFDL0QsVUFBVTtRQUNWLCtEQUErRDtRQUMvRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZO1lBQ2pDLFdBQVcsRUFBRSxrREFBa0Q7U0FDaEUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdEIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtnQkFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVTtnQkFDbkMsV0FBVyxFQUFFLG9DQUFvQzthQUNsRCxDQUFDLENBQUM7WUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO2dCQUN6QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTO2dCQUNsQyxXQUFXLEVBQUUsbUNBQW1DO2FBQ2pELENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLGdCQUFnQjtRQUN6QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztJQUNoQyxDQUFDO0NBQ0Y7QUF0R0QsMENBc0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgREVGQVVMVF9MT0dHSU5HX0NPTkZJRyB9IGZyb20gJy4uL2NvbmZpZyc7XG5cbi8qKlxuICogVmFsaWQgbG9nIHJldGVudGlvbiBkYXlzIG9wdGlvbnNcbiAqL1xuZXhwb3J0IHR5cGUgTG9nUmV0ZW50aW9uRGF5cyA9IDEgfCAzIHwgNSB8IDcgfCAxNCB8IDMwIHwgNjAgfCA5MDtcblxuLyoqXG4gKiBQcm9wZXJ0aWVzIGZvciB0aGUgT3BlbkNsYXdMb2dnaW5nIGNvbnN0cnVjdFxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9wZW5DbGF3TG9nZ2luZ1Byb3BzIHtcbiAgLyoqXG4gICAqIExvZyByZXRlbnRpb24gcGVyaW9kIGluIGRheXNcbiAgICogQGRlZmF1bHQgNyBkYXlzXG4gICAqL1xuICByZWFkb25seSBsb2dSZXRlbnRpb24/OiBsb2dzLlJldGVudGlvbkRheXM7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIEFMQiB0byBlbmFibGUgYWNjZXNzIGxvZ2dpbmcgZm9yXG4gICAqIElmIHByb3ZpZGVkLCBhbiBTMyBidWNrZXQgd2lsbCBiZSBjcmVhdGVkIGZvciBBTEIgYWNjZXNzIGxvZ3NcbiAgICovXG4gIHJlYWRvbmx5IGFsYj86IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xuXG4gIC8qKlxuICAgKiBMb2cgZ3JvdXAgbmFtZSBmb3IgRUNTIHRhc2tzXG4gICAqIEBkZWZhdWx0ICcvZWNzL29wZW5jbGF3J1xuICAgKi9cbiAgcmVhZG9ubHkgbG9nR3JvdXBOYW1lPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGVuYWJsZSBsb2cgZ3JvdXAgZW5jcnlwdGlvbiB3aXRoIEFXUyBtYW5hZ2VkIGtleVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICByZWFkb25seSBlbmFibGVFbmNyeXB0aW9uPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBPcGVuQ2xhdyBMb2dnaW5nIENvbnN0cnVjdFxuICpcbiAqIENyZWF0ZXM6XG4gKiAtIENsb3VkV2F0Y2ggTG9nIEdyb3VwIGZvciBFQ1MgdGFza3Mgd2l0aCBjb25maWd1cmFibGUgcmV0ZW50aW9uXG4gKiAtIE9wdGlvbmFsIFMzIGJ1Y2tldCBmb3IgQUxCIGFjY2VzcyBsb2dzXG4gKiAtIE9wdGlvbmFsIEFMQiBhY2Nlc3MgbG9nZ2luZyBjb25maWd1cmF0aW9uXG4gKlxuICogRmVhdHVyZXM6XG4gKiAtIENvbmZpZ3VyYWJsZSBsb2cgcmV0ZW50aW9uICgxLCAzLCA1LCA3LCAxNCwgMzAsIDYwLCA5MCBkYXlzKVxuICogLSBEZWZhdWx0IDctZGF5IHJldGVudGlvbiBmb3IgY29zdCBvcHRpbWl6YXRpb25cbiAqIC0gUzMgbGlmZWN5Y2xlIHBvbGljaWVzIGZvciBsb2cgYXJjaGl2YWxcbiAqIC0gQmxvY2sgYWxsIHB1YmxpYyBhY2Nlc3Mgb24gUzMgYnVja2V0XG4gKi9cbmV4cG9ydCBjbGFzcyBPcGVuQ2xhd0xvZ2dpbmcgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogVGhlIENsb3VkV2F0Y2ggTG9nIEdyb3VwIGZvciBFQ1MgdGFza3NcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBsb2dHcm91cDogbG9ncy5JTG9nR3JvdXA7XG5cbiAgLyoqXG4gICAqIFRoZSBTMyBidWNrZXQgZm9yIEFMQiBhY2Nlc3MgbG9ncyAob25seSBpZiBBTEIgcHJvdmlkZWQpXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgYWxiTG9nQnVja2V0PzogczMuSUJ1Y2tldDtcblxuICAvKipcbiAgICogVGhlIGxvZyByZXRlbnRpb24gcGVyaW9kIGluIGRheXNcbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgX2xvZ1JldGVudGlvbkRheXM6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IE9wZW5DbGF3TG9nZ2luZ1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENvbmZpZ3VyYXRpb24gd2l0aCBkZWZhdWx0c1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGxvZ1JldGVudGlvbkRheXMgPSBwcm9wcz8ubG9nUmV0ZW50aW9uID8/IERFRkFVTFRfTE9HR0lOR19DT05GSUcucmV0ZW50aW9uRGF5cyA/PyA3O1xuICAgIHRoaXMuX2xvZ1JldGVudGlvbkRheXMgPSBsb2dSZXRlbnRpb25EYXlzIGFzIG51bWJlcjtcbiAgICBjb25zdCBsb2dHcm91cE5hbWUgPSBwcm9wcz8ubG9nR3JvdXBOYW1lID8/ICcvZWNzL29wZW5jbGF3JztcbiAgICBjb25zdCBlbmFibGVFbmNyeXB0aW9uID0gcHJvcHM/LmVuYWJsZUVuY3J5cHRpb24gPz8gREVGQVVMVF9MT0dHSU5HX0NPTkZJRy5lbmNyeXB0aW9uID8/IHRydWU7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDbG91ZFdhdGNoIExvZyBHcm91cCBmb3IgRUNTIFRhc2tzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVXNlIGF1dG8tZ2VuZXJhdGVkIGxvZyBncm91cCBuYW1lIHRvIGF2b2lkIGNvbmZsaWN0c1xuICAgIC8vIENESyB3aWxsIGdlbmVyYXRlIGEgdW5pcXVlIG5hbWUgYmFzZWQgb24gdGhlIGNvbnN0cnVjdCBwYXRoXG4gICAgdGhpcy5sb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdFY3NMb2dHcm91cCcsIHtcbiAgICAgIHJldGVudGlvbjogbG9nUmV0ZW50aW9uRGF5cyBhcyBsb2dzLlJldGVudGlvbkRheXMsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUzMgQnVja2V0IGZvciBBTEIgQWNjZXNzIExvZ3MgKGlmIEFMQiBwcm92aWRlZClcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBpZiAocHJvcHM/LmFsYikge1xuICAgICAgY29uc3QgYWNjb3VudElkID0gY2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnQ7XG4gICAgICBjb25zdCByZWdpb24gPSBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uO1xuXG4gICAgICAvLyBDcmVhdGUgUzMgYnVja2V0IGZvciBBTEIgYWNjZXNzIGxvZ3NcbiAgICAgIC8vIE5vdGU6IEFMQiBhY2Nlc3MgbG9ncyByZXF1aXJlIHNwZWNpZmljIGJ1Y2tldCBuYW1pbmcgYW5kIHBlcm1pc3Npb25zXG4gICAgICB0aGlzLmFsYkxvZ0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0FsYkxvZ0J1Y2tldCcsIHtcbiAgICAgICAgYnVja2V0TmFtZTogYG9wZW5jbGF3LWFsYi1sb2dzLSR7YWNjb3VudElkfS0ke3JlZ2lvbn1gLFxuICAgICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnVHJhbnNpdGlvblRvR2xhY2llckFmdGVyMzBEYXlzJyxcbiAgICAgICAgICAgIHRyYW5zaXRpb25zOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxuICAgICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnRXhwaXJlQWZ0ZXI5MERheXMnLFxuICAgICAgICAgICAgZXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoOTApLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIH0pO1xuXG4gICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIEVuYWJsZSBBTEIgQWNjZXNzIExvZ2dpbmdcbiAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gQUxCIGFjY2VzcyBsb2dzIGFyZSBkZWxpdmVyZWQgdG8gdGhlIFMzIGJ1Y2tldFxuICAgICAgLy8gVGhlIGJ1Y2tldCBwb2xpY3kgaXMgYXV0b21hdGljYWxseSBtYW5hZ2VkIGJ5IENES1xuICAgICAgcHJvcHMuYWxiLmxvZ0FjY2Vzc0xvZ3ModGhpcy5hbGJMb2dCdWNrZXQsICdhbGItbG9ncycpO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE91dHB1dHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMubG9nR3JvdXAubG9nR3JvdXBOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIExvZyBHcm91cCBOYW1lIGZvciBPcGVuQ2xhdyBFQ1MgdGFza3MnLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuYWxiTG9nQnVja2V0KSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxiTG9nQnVja2V0TmFtZScsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMuYWxiTG9nQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQnVja2V0IE5hbWUgZm9yIEFMQiBBY2Nlc3MgTG9ncycsXG4gICAgICB9KTtcblxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FsYkxvZ0J1Y2tldEFybicsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMuYWxiTG9nQnVja2V0LmJ1Y2tldEFybixcbiAgICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgQVJOIGZvciBBTEIgQWNjZXNzIExvZ3MnLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbG9nIHJldGVudGlvbiBkYXlzIGFzIGEgbnVtYmVyXG4gICAqL1xuICBwdWJsaWMgZ2V0IGxvZ1JldGVudGlvbkRheXMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fbG9nUmV0ZW50aW9uRGF5cztcbiAgfVxufVxuIl19