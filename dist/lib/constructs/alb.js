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
exports.OpenClawAlb = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const constructs_1 = require("constructs");
/**
 * OpenClaw Application Load Balancer Construct
 *
 * Creates:
 * - Internet-facing ALB in public subnets
 * - Target group with health checks and sticky sessions
 * - HTTP listener (redirects to HTTPS if certificate provided)
 * - HTTPS listener (only if certificate provided)
 * - Integration with Fargate service
 */
class OpenClawAlb extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // ============================================================
        // Configuration with defaults
        // ============================================================
        const healthCheckPath = props.healthCheckPath ?? '/'; // Use root path for nginx
        const healthCheckIntervalSeconds = props.healthCheckIntervalSeconds ?? 30;
        const healthCheckTimeoutSeconds = props.healthCheckTimeoutSeconds ?? 5;
        const healthyThresholdCount = props.healthyThresholdCount ?? 2;
        const unhealthyThresholdCount = props.unhealthyThresholdCount ?? 3;
        const deregistrationDelaySeconds = props.deregistrationDelaySeconds ?? 30;
        const stickinessDurationHours = props.stickinessDurationHours ?? 1;
        const containerPort = 18789; // OpenClaw default port
        // ============================================================
        // Target Group
        // ============================================================
        this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            vpc: props.vpc,
            port: containerPort,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            deregistrationDelay: cdk.Duration.seconds(deregistrationDelaySeconds),
            healthCheck: {
                path: healthCheckPath,
                protocol: elbv2.Protocol.HTTP,
                interval: cdk.Duration.seconds(healthCheckIntervalSeconds),
                timeout: cdk.Duration.seconds(healthCheckTimeoutSeconds),
                healthyThresholdCount,
                unhealthyThresholdCount,
            },
        });
        // Enable sticky sessions for WebSocket support
        this.targetGroup.enableCookieStickiness(cdk.Duration.hours(stickinessDurationHours));
        // ============================================================
        // Application Load Balancer
        // ============================================================
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: props.securityGroup,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
        });
        // ============================================================
        // Attach Fargate Service to Target Group
        // ============================================================
        props.fargateService.attachToApplicationTargetGroup(this.targetGroup);
        // ============================================================
        // HTTPS Listener (only if certificate provided)
        // ============================================================
        if (props.certificateArn) {
            // Import the certificate
            const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn);
            // Create HTTPS listener
            this.httpsListener = this.loadBalancer.addListener('HttpsListener', {
                port: 443,
                protocol: elbv2.ApplicationProtocol.HTTPS,
                certificates: [certificate],
                defaultTargetGroups: [this.targetGroup],
            });
            // HTTP listener redirects to HTTPS
            this.listener = this.loadBalancer.addListener('HttpListener', {
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                defaultAction: elbv2.ListenerAction.redirect({
                    protocol: 'HTTPS',
                    port: '443',
                    permanent: true,
                }),
            });
        }
        else {
            // HTTP listener forwards directly to target group
            this.listener = this.loadBalancer.addListener('HttpListener', {
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                defaultTargetGroups: [this.targetGroup],
            });
        }
        // ============================================================
        // Output Properties
        // ============================================================
        this.albDnsName = this.loadBalancer.loadBalancerDnsName;
        this.albUrl = props.certificateArn
            ? `https://${this.albDnsName}`
            : `http://${this.albDnsName}`;
        // ============================================================
        // Outputs
        // ============================================================
        new cdk.CfnOutput(this, 'AlbDnsName', {
            value: this.albDnsName,
            description: 'Application Load Balancer DNS Name',
        });
        new cdk.CfnOutput(this, 'AlbUrl', {
            value: this.albUrl,
            description: 'Application Load Balancer URL',
        });
        new cdk.CfnOutput(this, 'TargetGroupArn', {
            value: this.targetGroup.targetGroupArn,
            description: 'ALB Target Group ARN',
        });
    }
}
exports.OpenClawAlb = OpenClawAlb;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2NvbnN0cnVjdHMvYWxiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUUzQyw4RUFBZ0U7QUFDaEUsd0VBQTBEO0FBQzFELDJDQUF1QztBQTJFdkM7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSxXQUFZLFNBQVEsc0JBQVM7SUErQnhDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQiwrREFBK0Q7UUFDL0QsOEJBQThCO1FBQzlCLCtEQUErRDtRQUMvRCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsZUFBZSxJQUFJLEdBQUcsQ0FBQyxDQUFFLDBCQUEwQjtRQUNqRixNQUFNLDBCQUEwQixHQUFHLEtBQUssQ0FBQywwQkFBMEIsSUFBSSxFQUFFLENBQUM7UUFDMUUsTUFBTSx5QkFBeUIsR0FBRyxLQUFLLENBQUMseUJBQXlCLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0scUJBQXFCLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixJQUFJLENBQUMsQ0FBQztRQUMvRCxNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLENBQUM7UUFDbkUsTUFBTSwwQkFBMEIsR0FBRyxLQUFLLENBQUMsMEJBQTBCLElBQUksRUFBRSxDQUFDO1FBQzFFLE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixJQUFJLENBQUMsQ0FBQztRQUNuRSxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBRSx3QkFBd0I7UUFFdEQsK0RBQStEO1FBQy9ELGVBQWU7UUFDZiwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3ZFLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLElBQUksRUFBRSxhQUFhO1lBQ25CLFFBQVEsRUFBRSxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSTtZQUN4QyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQy9CLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDO1lBQ3JFLFdBQVcsRUFBRTtnQkFDWCxJQUFJLEVBQUUsZUFBZTtnQkFDckIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSTtnQkFDN0IsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDO2dCQUMxRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUM7Z0JBQ3hELHFCQUFxQjtnQkFDckIsdUJBQXVCO2FBQ3hCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBRXJGLCtEQUErRDtRQUMvRCw0QkFBNEI7UUFDNUIsK0RBQStEO1FBQy9ELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUNqRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxjQUFjLEVBQUUsSUFBSTtZQUNwQixhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWE7WUFDbEMsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07YUFDbEM7U0FDRixDQUFDLENBQUM7UUFFSCwrREFBK0Q7UUFDL0QseUNBQXlDO1FBQ3pDLCtEQUErRDtRQUMvRCxLQUFLLENBQUMsY0FBYyxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV0RSwrREFBK0Q7UUFDL0QsZ0RBQWdEO1FBQ2hELCtEQUErRDtRQUMvRCxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6Qix5QkFBeUI7WUFDekIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FDcEQsSUFBSSxFQUNKLGFBQWEsRUFDYixLQUFLLENBQUMsY0FBYyxDQUNyQixDQUFDO1lBRUYsd0JBQXdCO1lBQ3hCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFO2dCQUNsRSxJQUFJLEVBQUUsR0FBRztnQkFDVCxRQUFRLEVBQUUsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEtBQUs7Z0JBQ3pDLFlBQVksRUFBRSxDQUFDLFdBQVcsQ0FBQztnQkFDM0IsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO2FBQ3hDLENBQUMsQ0FBQztZQUVILG1DQUFtQztZQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRTtnQkFDNUQsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJO2dCQUN4QyxhQUFhLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7b0JBQzNDLFFBQVEsRUFBRSxPQUFPO29CQUNqQixJQUFJLEVBQUUsS0FBSztvQkFDWCxTQUFTLEVBQUUsSUFBSTtpQkFDaEIsQ0FBQzthQUNILENBQUMsQ0FBQztRQUNMLENBQUM7YUFBTSxDQUFDO1lBQ04sa0RBQWtEO1lBQ2xELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFO2dCQUM1RCxJQUFJLEVBQUUsRUFBRTtnQkFDUixRQUFRLEVBQUUsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUk7Z0JBQ3hDLG1CQUFtQixFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQzthQUN4QyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsK0RBQStEO1FBQy9ELG9CQUFvQjtRQUNwQiwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDO1FBQ3hELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWM7WUFDaEMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUM5QixDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFaEMsK0RBQStEO1FBQy9ELFVBQVU7UUFDViwrREFBK0Q7UUFDL0QsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQ3RCLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ2xCLFdBQVcsRUFBRSwrQkFBK0I7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjO1lBQ3RDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBckpELGtDQXFKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IERFRkFVTFRfQ09OVEFJTkVSX0NPTkZJRyB9IGZyb20gJy4uL2NvbmZpZyc7XG5cbi8qKlxuICogUHJvcGVydGllcyBmb3IgdGhlIE9wZW5DbGF3QWxiIGNvbnN0cnVjdFxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9wZW5DbGF3QWxiUHJvcHMge1xuICAvKipcbiAgICogVGhlIFZQQyB0byBkZXBsb3kgdGhlIEFMQiBpblxuICAgKi9cbiAgcmVhZG9ubHkgdnBjOiBlYzIuSVZwYztcblxuICAvKipcbiAgICogVGhlIHNlY3VyaXR5IGdyb3VwIGZvciB0aGUgQUxCXG4gICAqL1xuICByZWFkb25seSBzZWN1cml0eUdyb3VwOiBlYzIuSVNlY3VyaXR5R3JvdXA7XG5cbiAgLyoqXG4gICAqIFRoZSBGYXJnYXRlIHNlcnZpY2UgdG8gYXR0YWNoIHRvIHRoZSBBTEJcbiAgICovXG4gIHJlYWRvbmx5IGZhcmdhdGVTZXJ2aWNlOiBlY3MuRmFyZ2F0ZVNlcnZpY2U7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIEFDTSBjZXJ0aWZpY2F0ZSBBUk4gZm9yIEhUVFBTXG4gICAqL1xuICByZWFkb25seSBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgZG9tYWluIG5hbWUgZm9yIHRoZSBBTEJcbiAgICovXG4gIHJlYWRvbmx5IGRvbWFpbk5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhlYWx0aCBjaGVjayBwYXRoXG4gICAqIEBkZWZhdWx0ICcvaGVhbHRoJ1xuICAgKi9cbiAgcmVhZG9ubHkgaGVhbHRoQ2hlY2tQYXRoPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIZWFsdGggY2hlY2sgaW50ZXJ2YWwgaW4gc2Vjb25kc1xuICAgKiBAZGVmYXVsdCAzMFxuICAgKi9cbiAgcmVhZG9ubHkgaGVhbHRoQ2hlY2tJbnRlcnZhbFNlY29uZHM/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEhlYWx0aCBjaGVjayB0aW1lb3V0IGluIHNlY29uZHNcbiAgICogQGRlZmF1bHQgNVxuICAgKi9cbiAgcmVhZG9ubHkgaGVhbHRoQ2hlY2tUaW1lb3V0U2Vjb25kcz86IG51bWJlcjtcblxuICAvKipcbiAgICogSGVhbHRoeSB0aHJlc2hvbGQgY291bnRcbiAgICogQGRlZmF1bHQgMlxuICAgKi9cbiAgcmVhZG9ubHkgaGVhbHRoeVRocmVzaG9sZENvdW50PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBVbmhlYWx0aHkgdGhyZXNob2xkIGNvdW50XG4gICAqIEBkZWZhdWx0IDNcbiAgICovXG4gIHJlYWRvbmx5IHVuaGVhbHRoeVRocmVzaG9sZENvdW50PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBEZXJlZ2lzdHJhdGlvbiBkZWxheSBpbiBzZWNvbmRzXG4gICAqIEBkZWZhdWx0IDMwXG4gICAqL1xuICByZWFkb25seSBkZXJlZ2lzdHJhdGlvbkRlbGF5U2Vjb25kcz86IG51bWJlcjtcblxuICAvKipcbiAgICogU3RpY2tpbmVzcyBjb29raWUgZHVyYXRpb24gaW4gaG91cnNcbiAgICogQGRlZmF1bHQgMVxuICAgKi9cbiAgcmVhZG9ubHkgc3RpY2tpbmVzc0R1cmF0aW9uSG91cnM/OiBudW1iZXI7XG59XG5cbi8qKlxuICogT3BlbkNsYXcgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciBDb25zdHJ1Y3RcbiAqXG4gKiBDcmVhdGVzOlxuICogLSBJbnRlcm5ldC1mYWNpbmcgQUxCIGluIHB1YmxpYyBzdWJuZXRzXG4gKiAtIFRhcmdldCBncm91cCB3aXRoIGhlYWx0aCBjaGVja3MgYW5kIHN0aWNreSBzZXNzaW9uc1xuICogLSBIVFRQIGxpc3RlbmVyIChyZWRpcmVjdHMgdG8gSFRUUFMgaWYgY2VydGlmaWNhdGUgcHJvdmlkZWQpXG4gKiAtIEhUVFBTIGxpc3RlbmVyIChvbmx5IGlmIGNlcnRpZmljYXRlIHByb3ZpZGVkKVxuICogLSBJbnRlZ3JhdGlvbiB3aXRoIEZhcmdhdGUgc2VydmljZVxuICovXG5leHBvcnQgY2xhc3MgT3BlbkNsYXdBbGIgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogVGhlIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXJcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBsb2FkQmFsYW5jZXI6IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xuXG4gIC8qKlxuICAgKiBUaGUgSFRUUCBsaXN0ZW5lciAoYWx3YXlzIGNyZWF0ZWQpXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgbGlzdGVuZXI6IGVsYnYyLkFwcGxpY2F0aW9uTGlzdGVuZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBIVFRQUyBsaXN0ZW5lciAob25seSBpZiBjZXJ0aWZpY2F0ZSBwcm92aWRlZClcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBodHRwc0xpc3RlbmVyPzogZWxidjIuQXBwbGljYXRpb25MaXN0ZW5lcjtcblxuICAvKipcbiAgICogVGhlIHRhcmdldCBncm91cCBmb3IgdGhlIEZhcmdhdGUgc2VydmljZVxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHRhcmdldEdyb3VwOiBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwO1xuXG4gIC8qKlxuICAgKiBUaGUgQUxCIFVSTCAoaHR0cDovLyBvciBodHRwczovLyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSlcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBhbGJVcmw6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIEFMQiBETlMgbmFtZVxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGFsYkRuc05hbWU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogT3BlbkNsYXdBbGJQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDb25maWd1cmF0aW9uIHdpdGggZGVmYXVsdHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBoZWFsdGhDaGVja1BhdGggPSBwcm9wcy5oZWFsdGhDaGVja1BhdGggPz8gJy8nOyAgLy8gVXNlIHJvb3QgcGF0aCBmb3IgbmdpbnhcbiAgICBjb25zdCBoZWFsdGhDaGVja0ludGVydmFsU2Vjb25kcyA9IHByb3BzLmhlYWx0aENoZWNrSW50ZXJ2YWxTZWNvbmRzID8/IDMwO1xuICAgIGNvbnN0IGhlYWx0aENoZWNrVGltZW91dFNlY29uZHMgPSBwcm9wcy5oZWFsdGhDaGVja1RpbWVvdXRTZWNvbmRzID8/IDU7XG4gICAgY29uc3QgaGVhbHRoeVRocmVzaG9sZENvdW50ID0gcHJvcHMuaGVhbHRoeVRocmVzaG9sZENvdW50ID8/IDI7XG4gICAgY29uc3QgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQgPSBwcm9wcy51bmhlYWx0aHlUaHJlc2hvbGRDb3VudCA/PyAzO1xuICAgIGNvbnN0IGRlcmVnaXN0cmF0aW9uRGVsYXlTZWNvbmRzID0gcHJvcHMuZGVyZWdpc3RyYXRpb25EZWxheVNlY29uZHMgPz8gMzA7XG4gICAgY29uc3Qgc3RpY2tpbmVzc0R1cmF0aW9uSG91cnMgPSBwcm9wcy5zdGlja2luZXNzRHVyYXRpb25Ib3VycyA/PyAxO1xuICAgIGNvbnN0IGNvbnRhaW5lclBvcnQgPSAxODc4OTsgIC8vIE9wZW5DbGF3IGRlZmF1bHQgcG9ydFxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVGFyZ2V0IEdyb3VwXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdGhpcy50YXJnZXRHcm91cCA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRoaXMsICdUYXJnZXRHcm91cCcsIHtcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgcG9ydDogY29udGFpbmVyUG9ydCxcbiAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICB0YXJnZXRUeXBlOiBlbGJ2Mi5UYXJnZXRUeXBlLklQLFxuICAgICAgZGVyZWdpc3RyYXRpb25EZWxheTogY2RrLkR1cmF0aW9uLnNlY29uZHMoZGVyZWdpc3RyYXRpb25EZWxheVNlY29uZHMpLFxuICAgICAgaGVhbHRoQ2hlY2s6IHtcbiAgICAgICAgcGF0aDogaGVhbHRoQ2hlY2tQYXRoLFxuICAgICAgICBwcm90b2NvbDogZWxidjIuUHJvdG9jb2wuSFRUUCxcbiAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKGhlYWx0aENoZWNrSW50ZXJ2YWxTZWNvbmRzKSxcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoaGVhbHRoQ2hlY2tUaW1lb3V0U2Vjb25kcyksXG4gICAgICAgIGhlYWx0aHlUaHJlc2hvbGRDb3VudCxcbiAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gRW5hYmxlIHN0aWNreSBzZXNzaW9ucyBmb3IgV2ViU29ja2V0IHN1cHBvcnRcbiAgICB0aGlzLnRhcmdldEdyb3VwLmVuYWJsZUNvb2tpZVN0aWNraW5lc3MoY2RrLkR1cmF0aW9uLmhvdXJzKHN0aWNraW5lc3NEdXJhdGlvbkhvdXJzKSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdGhpcy5sb2FkQmFsYW5jZXIgPSBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ0FsYicsIHtcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgaW50ZXJuZXRGYWNpbmc6IHRydWUsXG4gICAgICBzZWN1cml0eUdyb3VwOiBwcm9wcy5zZWN1cml0eUdyb3VwLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQXR0YWNoIEZhcmdhdGUgU2VydmljZSB0byBUYXJnZXQgR3JvdXBcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBwcm9wcy5mYXJnYXRlU2VydmljZS5hdHRhY2hUb0FwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcy50YXJnZXRHcm91cCk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBIVFRQUyBMaXN0ZW5lciAob25seSBpZiBjZXJ0aWZpY2F0ZSBwcm92aWRlZClcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBpZiAocHJvcHMuY2VydGlmaWNhdGVBcm4pIHtcbiAgICAgIC8vIEltcG9ydCB0aGUgY2VydGlmaWNhdGVcbiAgICAgIGNvbnN0IGNlcnRpZmljYXRlID0gYWNtLkNlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgJ0NlcnRpZmljYXRlJyxcbiAgICAgICAgcHJvcHMuY2VydGlmaWNhdGVBcm5cbiAgICAgICk7XG5cbiAgICAgIC8vIENyZWF0ZSBIVFRQUyBsaXN0ZW5lclxuICAgICAgdGhpcy5odHRwc0xpc3RlbmVyID0gdGhpcy5sb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoJ0h0dHBzTGlzdGVuZXInLCB7XG4gICAgICAgIHBvcnQ6IDQ0MyxcbiAgICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUFMsXG4gICAgICAgIGNlcnRpZmljYXRlczogW2NlcnRpZmljYXRlXSxcbiAgICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW3RoaXMudGFyZ2V0R3JvdXBdLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEhUVFAgbGlzdGVuZXIgcmVkaXJlY3RzIHRvIEhUVFBTXG4gICAgICB0aGlzLmxpc3RlbmVyID0gdGhpcy5sb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoJ0h0dHBMaXN0ZW5lcicsIHtcbiAgICAgICAgcG9ydDogODAsXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICAgIGRlZmF1bHRBY3Rpb246IGVsYnYyLkxpc3RlbmVyQWN0aW9uLnJlZGlyZWN0KHtcbiAgICAgICAgICBwcm90b2NvbDogJ0hUVFBTJyxcbiAgICAgICAgICBwb3J0OiAnNDQzJyxcbiAgICAgICAgICBwZXJtYW5lbnQ6IHRydWUsXG4gICAgICAgIH0pLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhUVFAgbGlzdGVuZXIgZm9yd2FyZHMgZGlyZWN0bHkgdG8gdGFyZ2V0IGdyb3VwXG4gICAgICB0aGlzLmxpc3RlbmVyID0gdGhpcy5sb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoJ0h0dHBMaXN0ZW5lcicsIHtcbiAgICAgICAgcG9ydDogODAsXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICAgIGRlZmF1bHRUYXJnZXRHcm91cHM6IFt0aGlzLnRhcmdldEdyb3VwXSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE91dHB1dCBQcm9wZXJ0aWVzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdGhpcy5hbGJEbnNOYW1lID0gdGhpcy5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZTtcbiAgICB0aGlzLmFsYlVybCA9IHByb3BzLmNlcnRpZmljYXRlQXJuXG4gICAgICA/IGBodHRwczovLyR7dGhpcy5hbGJEbnNOYW1lfWBcbiAgICAgIDogYGh0dHA6Ly8ke3RoaXMuYWxiRG5zTmFtZX1gO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gT3V0cHV0c1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbGJEbnNOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYWxiRG5zTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciBETlMgTmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxiVXJsJywge1xuICAgICAgdmFsdWU6IHRoaXMuYWxiVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFyZ2V0R3JvdXBBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy50YXJnZXRHcm91cC50YXJnZXRHcm91cEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQUxCIFRhcmdldCBHcm91cCBBUk4nLFxuICAgIH0pO1xuICB9XG59XG4iXX0=