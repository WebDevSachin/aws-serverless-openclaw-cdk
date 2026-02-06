import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { OpenClawAlb, OpenClawAlbProps } from '../../lib/constructs/alb';
import { OpenClawFargate } from '../../lib/constructs/fargate';

describe('OpenClawAlb', () => {
  // Helper to create base stack resources
  function createBaseStack() {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    // Create VPC with public and private subnets
    const vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create ALB security group
    const albSecurityGroup = new ec2.SecurityGroup(stack, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for ALB',
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // Create Fargate security group
    const fargateSecurityGroup = new ec2.SecurityGroup(stack, 'FargateSecurityGroup', {
      vpc,
      description: 'Security group for Fargate tasks',
      allowAllOutbound: true,
    });
    fargateSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB'
    );

    // Create bucket
    const bucket = new s3.Bucket(stack, 'TestBucket', {
      bucketName: 'test-openclaw-bucket',
    });

    // Create secrets
    const gatewayTokenSecret = new secretsmanager.Secret(stack, 'GatewayTokenSecret', {
      secretName: 'openclaw/gateway-token',
    });

    // Create IAM roles
    const taskExecutionRole = new iam.Role(stack, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const taskRole = new iam.Role(stack, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    return {
      app,
      stack,
      vpc,
      albSecurityGroup,
      fargateSecurityGroup,
      bucket,
      gatewayTokenSecret,
      taskExecutionRole,
      taskRole,
    };
  }

  // Helper to create Fargate service
  function createFargateService(baseResources: ReturnType<typeof createBaseStack>) {
    const { stack, vpc, fargateSecurityGroup, bucket, gatewayTokenSecret, taskExecutionRole, taskRole } = baseResources;

    const fargate = new OpenClawFargate(stack, 'TestFargate', {
      vpc,
      securityGroup: fargateSecurityGroup,
      bucket,
      gatewayTokenSecret,
      taskExecutionRole,
      taskRole,
      enableAutoScaling: false,
    });

    return fargate;
  }

  // Helper to create ALB construct
  function createAlbConstruct(
    baseResources: ReturnType<typeof createBaseStack>,
    fargateService: ecs.FargateService,
    props?: Partial<OpenClawAlbProps>
  ) {
    const { stack, vpc, albSecurityGroup } = baseResources;

    const alb = new OpenClawAlb(stack, 'TestAlb', {
      vpc,
      securityGroup: albSecurityGroup,
      fargateService,
      ...props,
    });

    return { alb, template: Template.fromStack(stack) };
  }

  // ============================================================================
  // ALB Configuration Tests
  // ============================================================================
  describe('ALB Configuration', () => {
    test('ALB is internet-facing', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Scheme: 'internet-facing',
      });
    });

    test('ALB is in public subnets', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Subnets: Match.arrayWith([
          { Ref: Match.stringLikeRegexp('Public') },
        ]),
      });
    });

    test('security group is attached to ALB', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        SecurityGroups: Match.arrayWith([
          { 'Fn::GetAtt': [Match.stringLikeRegexp('AlbSecurityGroup'), 'GroupId'] },
        ]),
      });
    });

    test('ALB is of type application', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Type: 'application',
      });
    });
  });

  // ============================================================================
  // Target Group Tests
  // ============================================================================
  describe('Target Group', () => {
    test('target group has correct port and protocol', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        Port: 3000,
        Protocol: 'HTTP',
        TargetType: 'ip',
      });
    });

    test('target group has correct health check settings with defaults', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        HealthCheckPath: '/health',
        HealthCheckIntervalSeconds: 30,
        HealthCheckTimeoutSeconds: 5,
        HealthyThresholdCount: 2,
        UnhealthyThresholdCount: 3,
      });
    });

    test('target group has configurable health check path', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service, {
        healthCheckPath: '/api/health',
      });

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        HealthCheckPath: '/api/health',
      });
    });

    test('target group has configurable health check settings', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service, {
        healthCheckIntervalSeconds: 60,
        healthCheckTimeoutSeconds: 10,
        healthyThresholdCount: 3,
        unhealthyThresholdCount: 5,
      });

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        HealthCheckIntervalSeconds: 60,
        HealthCheckTimeoutSeconds: 10,
        HealthyThresholdCount: 3,
        UnhealthyThresholdCount: 5,
      });
    });

    test('target group has sticky sessions enabled', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        TargetGroupAttributes: Match.arrayWith([
          Match.objectLike({
            Key: 'stickiness.enabled',
            Value: 'true',
          }),
          Match.objectLike({
            Key: 'stickiness.type',
            Value: 'lb_cookie',
          }),
        ]),
      });
    });

    test('target group has correct deregistration delay', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        TargetGroupAttributes: Match.arrayWith([
          Match.objectLike({
            Key: 'deregistration_delay.timeout_seconds',
            Value: '30',
          }),
        ]),
      });
    });

    test('target group has configurable deregistration delay', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service, {
        deregistrationDelaySeconds: 60,
      });

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        TargetGroupAttributes: Match.arrayWith([
          Match.objectLike({
            Key: 'deregistration_delay.timeout_seconds',
            Value: '60',
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // HTTP Listener Tests
  // ============================================================================
  describe('HTTP Listener', () => {
    test('HTTP listener is created on port 80', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 80,
        Protocol: 'HTTP',
      });
    });

    test('HTTP listener forwards to target group when no certificate', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 80,
        DefaultActions: [
          {
            Type: 'forward',
            TargetGroupArn: { Ref: Match.stringLikeRegexp('TargetGroup') },
          },
        ],
      });
    });

    test('HTTP listener redirects to HTTPS when certificate provided', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service, {
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
      });

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 80,
        DefaultActions: [
          {
            Type: 'redirect',
            RedirectConfig: {
              Protocol: 'HTTPS',
              Port: '443',
              StatusCode: 'HTTP_301',
            },
          },
        ],
      });
    });
  });

  // ============================================================================
  // HTTPS Listener Tests
  // ============================================================================
  describe('HTTPS Listener', () => {
    test('HTTPS listener is created when certificate ARN provided', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service, {
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
      });

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 443,
        Protocol: 'HTTPS',
        Certificates: [
          {
            CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
          },
        ],
      });
    });

    test('HTTPS listener forwards to target group', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service, {
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
      });

      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 443,
        DefaultActions: [
          {
            Type: 'forward',
            TargetGroupArn: { Ref: Match.stringLikeRegexp('TargetGroup') },
          },
        ],
      });
    });

    test('HTTPS listener is not created when no certificate provided', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      // Count listeners - should only have 1 (HTTP)
      const listeners = template.findResources('AWS::ElasticLoadBalancingV2::Listener');
      expect(Object.keys(listeners).length).toBe(1);
    });
  });

  // ============================================================================
  // Fargate Integration Tests
  // ============================================================================
  describe('Fargate Integration', () => {
    test('Fargate service is registered with target group', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      template.hasResourceProperties('AWS::ECS::Service', {
        LoadBalancers: [
          {
            ContainerName: 'openclaw',
            ContainerPort: 3000,
            TargetGroupArn: { Ref: Match.stringLikeRegexp('TargetGroup') },
          },
        ],
      });
    });

    test('ECS service has health check grace period', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      createAlbConstruct(base, fargate.service);
      const template = Template.fromStack(base.stack);

      template.hasResourceProperties('AWS::ECS::Service', {
        HealthCheckGracePeriodSeconds: 60,
      });
    });
  });

  // ============================================================================
  // Public Properties Tests
  // ============================================================================
  describe('Public Properties', () => {
    test('exposes load balancer property', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service);

      expect(alb.loadBalancer).toBeDefined();
      expect(alb.loadBalancer.loadBalancerArn).toBeDefined();
    });

    test('exposes listener property', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service);

      expect(alb.listener).toBeDefined();
    });

    test('exposes target group property', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service);

      expect(alb.targetGroup).toBeDefined();
      expect(alb.targetGroup.targetGroupArn).toBeDefined();
    });

    test('exposes albDnsName property', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service);

      expect(alb.albDnsName).toBeDefined();
    });

    test('exposes albUrl property with http:// when no certificate', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service);

      expect(alb.albUrl).toBeDefined();
      expect(alb.albUrl.startsWith('http://')).toBe(true);
    });

    test('exposes albUrl property with https:// when certificate provided', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service, {
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
      });

      expect(alb.albUrl).toBeDefined();
      expect(alb.albUrl.startsWith('https://')).toBe(true);
    });

    test('exposes httpsListener when certificate provided', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service, {
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
      });

      expect(alb.httpsListener).toBeDefined();
    });

    test('httpsListener is undefined when no certificate provided', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { alb } = createAlbConstruct(base, fargate.service);

      expect(alb.httpsListener).toBeUndefined();
    });
  });

  // ============================================================================
  // Output Tests
  // ============================================================================
  describe('Outputs', () => {
    test('exports ALB DNS name', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      createAlbConstruct(base, fargate.service);

      const template = Template.fromStack(base.stack);
      const outputs = template.findOutputs('*');
      const dnsOutputs = Object.entries(outputs).filter(([key]) =>
        key.includes('AlbDnsName')
      );
      expect(dnsOutputs.length).toBeGreaterThan(0);
    });

    test('exports ALB URL', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      createAlbConstruct(base, fargate.service);

      const template = Template.fromStack(base.stack);
      const outputs = template.findOutputs('*');
      const urlOutputs = Object.entries(outputs).filter(([key]) =>
        key.includes('AlbUrl')
      );
      expect(urlOutputs.length).toBeGreaterThan(0);
    });

    test('exports target group ARN', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      createAlbConstruct(base, fargate.service);

      const template = Template.fromStack(base.stack);
      const outputs = template.findOutputs('*');
      const tgOutputs = Object.entries(outputs).filter(([key]) =>
        key.includes('TargetGroupArn')
      );
      expect(tgOutputs.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Complete Integration Test
  // ============================================================================
  describe('Complete Integration', () => {
    test('creates complete ALB setup with all components', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service);

      // Verify all major resources are created
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
    });

    test('creates complete ALB setup with HTTPS', () => {
      const base = createBaseStack();
      const fargate = createFargateService(base);
      const { template } = createAlbConstruct(base, fargate.service, {
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
      });

      // Verify all major resources are created
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 2); // HTTP + HTTPS
    });
  });
});
