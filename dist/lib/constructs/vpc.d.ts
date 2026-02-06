import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
/**
 * Properties for the OpenClawVpc construct
 */
export interface OpenClawVpcProps {
    /**
     * Whether to create a NAT Gateway for outbound internet access from private subnets
     * @default true
     */
    readonly useNatGateway?: boolean;
    /**
     * Whether to use public subnets for Fargate tasks (instead of private subnets)
     * This is a cost optimization option that saves ~$32/month by not using NAT Gateway.
     * Tasks will have public IPs but are still secured by security groups.
     * @default false (use private subnets)
     */
    readonly usePublicSubnets?: boolean;
    /**
     * The VPC CIDR block
     * @default '10.0.0.0/16'
     */
    readonly vpcCidr?: string;
    /**
     * Maximum number of Availability Zones
     * @default 2
     */
    readonly maxAzs?: number;
    /**
     * Number of NAT gateways to create
     * @default 1
     */
    readonly natGateways?: number;
}
/**
 * VPC construct for OpenClaw deployment
 *
 * Creates:
 * - VPC with 2 Availability Zones
 * - Public subnets for ALB (2 subnets)
 * - Private subnets with egress for Fargate tasks (2 subnets)
 * - NAT Gateway for outbound internet access from private subnets
 * - Security groups with minimal access
 */
export declare class OpenClawVpc extends Construct {
    /**
     * The VPC resource
     */
    readonly vpc: ec2.IVpc;
    /**
     * Security group for the Application Load Balancer
     * Allows inbound HTTP (80) and HTTPS (443) from anywhere
     */
    readonly albSecurityGroup: ec2.ISecurityGroup;
    /**
     * Security group for Fargate tasks
     * Allows inbound port 3000 only from ALB security group
     */
    readonly fargateSecurityGroup: ec2.ISecurityGroup;
    constructor(scope: Construct, id: string, props?: OpenClawVpcProps);
    /**
     * Get the public subnet IDs
     */
    get publicSubnetIds(): string[];
    /**
     * Get the private subnet IDs
     */
    get privateSubnetIds(): string[];
    /**
     * Get the VPC ID
     */
    get vpcId(): string;
}
