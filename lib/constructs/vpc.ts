import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DEFAULT_NETWORKING_CONFIG } from '../config';

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
export class OpenClawVpc extends Construct {
  /**
   * The VPC resource
   */
  public readonly vpc: ec2.IVpc;

  /**
   * Security group for the Application Load Balancer
   * Allows inbound HTTP (80) and HTTPS (443) from anywhere
   */
  public readonly albSecurityGroup: ec2.ISecurityGroup;

  /**
   * Security group for Fargate tasks
   * Allows inbound port 3000 only from ALB security group
   */
  public readonly fargateSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props?: OpenClawVpcProps) {
    super(scope, id);

    const useNatGateway = props?.useNatGateway ?? true;
    const usePublicSubnets = props?.usePublicSubnets ?? false;
    const vpcCidr = props?.vpcCidr ?? DEFAULT_NETWORKING_CONFIG.vpcCidr ?? '10.0.0.0/16';
    const maxAzs = props?.maxAzs ?? DEFAULT_NETWORKING_CONFIG.maxAzs ?? 2;
    const natGateways = useNatGateway
      ? (props?.natGateways ?? DEFAULT_NETWORKING_CONFIG.natGateways ?? 1)
      : 0;

    // ============================================================
    // VPC
    // ============================================================
    // When not using NAT Gateway and using public subnets for tasks,
    // we only need public subnets (cost optimization)
    const subnetConfiguration: ec2.SubnetConfiguration[] = [
      {
        cidrMask: 24,
        name: 'Public',
        subnetType: ec2.SubnetType.PUBLIC,
      },
    ];

    // Only add private subnets if using NAT Gateway
    if (useNatGateway) {
      subnetConfiguration.push({
        cidrMask: 24,
        name: 'Private',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      });
    }

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
      maxAzs: maxAzs,
      natGateways: natGateways,
      subnetConfiguration,
    });

    // ============================================================
    // Security Groups
    // ============================================================

    // ALB Security Group - allows inbound HTTP/HTTPS from anywhere
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for OpenClaw Application Load Balancer',
      allowAllOutbound: true,
    });

    // Inbound: Port 80 from 0.0.0.0/0
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    // Inbound: Port 443 from 0.0.0.0/0
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere'
    );

    // Fargate Security Group - allows inbound only from ALB
    this.fargateSecurityGroup = new ec2.SecurityGroup(this, 'FargateSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for OpenClaw Fargate tasks',
      allowAllOutbound: true,
    });

    // Inbound: Port 3000 from ALB security group only
    this.fargateSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB to container port 3000'
    );
  }

  /**
   * Get the public subnet IDs
   */
  public get publicSubnetIds(): string[] {
    return this.vpc.publicSubnets.map(subnet => subnet.subnetId);
  }

  /**
   * Get the private subnet IDs
   */
  public get privateSubnetIds(): string[] {
    return this.vpc.privateSubnets.map(subnet => subnet.subnetId);
  }

  /**
   * Get the VPC ID
   */
  public get vpcId(): string {
    return this.vpc.vpcId;
  }
}
