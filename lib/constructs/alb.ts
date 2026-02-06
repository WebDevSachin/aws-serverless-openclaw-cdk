import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { DEFAULT_CONTAINER_CONFIG } from '../config';

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
export class OpenClawAlb extends Construct {
  /**
   * The Application Load Balancer
   */
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  /**
   * The HTTP listener (always created)
   */
  public readonly listener: elbv2.ApplicationListener;

  /**
   * The HTTPS listener (only if certificate provided)
   */
  public readonly httpsListener?: elbv2.ApplicationListener;

  /**
   * The target group for the Fargate service
   */
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  /**
   * The ALB URL (http:// or https:// based on certificate)
   */
  public readonly albUrl: string;

  /**
   * The ALB DNS name
   */
  public readonly albDnsName: string;

  constructor(scope: Construct, id: string, props: OpenClawAlbProps) {
    super(scope, id);

    // ============================================================
    // Configuration with defaults
    // ============================================================
    const healthCheckPath = props.healthCheckPath ?? '/';  // Use root path for nginx
    const healthCheckIntervalSeconds = props.healthCheckIntervalSeconds ?? 30;
    const healthCheckTimeoutSeconds = props.healthCheckTimeoutSeconds ?? 5;
    const healthyThresholdCount = props.healthyThresholdCount ?? 2;
    const unhealthyThresholdCount = props.unhealthyThresholdCount ?? 3;
    const deregistrationDelaySeconds = props.deregistrationDelaySeconds ?? 30;
    const stickinessDurationHours = props.stickinessDurationHours ?? 1;
    const containerPort = 18789;  // OpenClaw default port

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
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.certificateArn
      );

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
    } else {
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
