import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
/**
 * Properties for the OpenClawAlb construct
 */
export interface OpenClawAlbProps {
    /**
     * The VPC to deploy the ALB in
     */
    readonly vpc: ec2.IVpc;
    /**
     * The security group for the ALB
     */
    readonly securityGroup: ec2.ISecurityGroup;
    /**
     * The Fargate service to attach to the ALB
     */
    readonly fargateService: ecs.FargateService;
    /**
     * Optional ACM certificate ARN for HTTPS
     */
    readonly certificateArn?: string;
    /**
     * Optional domain name for the ALB
     */
    readonly domainName?: string;
    /**
     * Health check path
     * @default '/health'
     */
    readonly healthCheckPath?: string;
    /**
     * Health check interval in seconds
     * @default 30
     */
    readonly healthCheckIntervalSeconds?: number;
    /**
     * Health check timeout in seconds
     * @default 5
     */
    readonly healthCheckTimeoutSeconds?: number;
    /**
     * Healthy threshold count
     * @default 2
     */
    readonly healthyThresholdCount?: number;
    /**
     * Unhealthy threshold count
     * @default 3
     */
    readonly unhealthyThresholdCount?: number;
    /**
     * Deregistration delay in seconds
     * @default 30
     */
    readonly deregistrationDelaySeconds?: number;
    /**
     * Stickiness cookie duration in hours
     * @default 1
     */
    readonly stickinessDurationHours?: number;
}
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
export declare class OpenClawAlb extends Construct {
    /**
     * The Application Load Balancer
     */
    readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    /**
     * The HTTP listener (always created)
     */
    readonly listener: elbv2.ApplicationListener;
    /**
     * The HTTPS listener (only if certificate provided)
     */
    readonly httpsListener?: elbv2.ApplicationListener;
    /**
     * The target group for the Fargate service
     */
    readonly targetGroup: elbv2.ApplicationTargetGroup;
    /**
     * The ALB URL (http:// or https:// based on certificate)
     */
    readonly albUrl: string;
    /**
     * The ALB DNS name
     */
    readonly albDnsName: string;
    constructor(scope: Construct, id: string, props: OpenClawAlbProps);
}
