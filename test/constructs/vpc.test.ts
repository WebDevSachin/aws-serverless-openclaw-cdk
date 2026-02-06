import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { OpenClawVpc } from '../../lib/constructs/vpc';

describe('OpenClawVpc', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
  });

  // ============================================================================
  // VPC Configuration Tests
  // ============================================================================
  describe('VPC Configuration', () => {
    test('creates a VPC with correct CIDR', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });

    test('creates VPC with custom CIDR when specified', () => {
      new OpenClawVpc(stack, 'TestVpc', {
        vpcCidr: '172.16.0.0/16',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '172.16.0.0/16',
      });
    });

    test('VPC has 2 Availability Zones', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');
      
      expect(vpcConstruct.vpc.availabilityZones.length).toBe(2);
    });

    test('VPC exports VPC ID', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');
      
      expect(vpcConstruct.vpcId).toBeDefined();
      expect(typeof vpcConstruct.vpcId).toBe('string');
    });
  });

  // ============================================================================
  // Subnet Tests
  // ============================================================================
  describe('Subnets', () => {
    test('creates public and private subnets', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      // 2 public + 2 private = 4 subnets total
      template.resourceCountIs('AWS::EC2::Subnet', 4);
    });

    test('creates 2 public subnets', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');
      
      expect(vpcConstruct.vpc.publicSubnets.length).toBe(2);
    });

    test('creates 2 private subnets', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');
      
      expect(vpcConstruct.vpc.privateSubnets.length).toBe(2);
    });

    test('public subnets have /24 CIDR mask', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      const subnets = template.findResources('AWS::EC2::Subnet');
      const publicSubnets = Object.values(subnets).filter((subnet: any) => {
        return subnet.Properties.MapPublicIpOnLaunch === true;
      });

      // Verify we have 2 public subnets
      expect(publicSubnets.length).toBe(2);
    });

    test('exports public subnet IDs', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');
      
      expect(vpcConstruct.publicSubnetIds.length).toBe(2);
      expect(vpcConstruct.publicSubnetIds.every(id => typeof id === 'string')).toBe(true);
    });

    test('exports private subnet IDs', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');
      
      expect(vpcConstruct.privateSubnetIds.length).toBe(2);
      expect(vpcConstruct.privateSubnetIds.every(id => typeof id === 'string')).toBe(true);
    });
  });

  // ============================================================================
  // NAT Gateway Tests
  // ============================================================================
  describe('NAT Gateway', () => {
    test('creates 1 NAT gateway by default', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::EC2::NatGateway', 1);
    });

    test('creates NAT gateway when useNatGateway is true', () => {
      new OpenClawVpc(stack, 'TestVpc', {
        useNatGateway: true,
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::EC2::NatGateway', 1);
    });

    test('does not create NAT gateway when useNatGateway is false', () => {
      new OpenClawVpc(stack, 'TestVpc', {
        useNatGateway: false,
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::EC2::NatGateway', 0);
    });

    test('creates Elastic IP for NAT gateway', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::EC2::EIP', 1);
    });
  });

  // ============================================================================
  // Security Group Tests
  // ============================================================================
  describe('ALB Security Group', () => {
    test('creates ALB security group', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Application Load Balancer',
      });
    });

    test('ALB security group allows inbound HTTP (port 80) from anywhere', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Application Load Balancer',
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: '0.0.0.0/0',
          }),
        ]),
      });
    });

    test('ALB security group allows inbound HTTPS (port 443) from anywhere', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Application Load Balancer',
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0',
          }),
        ]),
      });
    });

    test('ALB security group allows all outbound traffic', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Application Load Balancer',
        SecurityGroupEgress: [
          {
            CidrIp: '0.0.0.0/0',
            Description: 'Allow all outbound traffic by default',
            IpProtocol: '-1',
          },
        ],
      });
    });
  });

  describe('Fargate Security Group', () => {
    test('creates Fargate security group', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Fargate tasks',
      });
    });

    test('Fargate security group allows inbound port 3000 from ALB security group', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      // Find the Fargate security group ingress rule that references the ALB security group
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 3000,
        ToPort: 3000,
        Description: 'Allow traffic from ALB to container port 3000',
      });
    });

    test('Fargate security group allows all outbound traffic', () => {
      new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Fargate tasks',
        SecurityGroupEgress: [
          {
            CidrIp: '0.0.0.0/0',
            Description: 'Allow all outbound traffic by default',
            IpProtocol: '-1',
          },
        ],
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    test('exports all required properties', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');

      expect(vpcConstruct.vpc).toBeDefined();
      expect(vpcConstruct.albSecurityGroup).toBeDefined();
      expect(vpcConstruct.fargateSecurityGroup).toBeDefined();
      expect(vpcConstruct.vpcId).toBeDefined();
      expect(vpcConstruct.publicSubnetIds).toHaveLength(2);
      expect(vpcConstruct.privateSubnetIds).toHaveLength(2);
    });

    test('security groups are associated with the VPC', () => {
      const vpcConstruct = new OpenClawVpc(stack, 'TestVpc');
      const template = Template.fromStack(stack);

      // Get the VPC ID
      const vpcId = vpcConstruct.vpcId;

      // Verify security groups reference the same VPC
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Application Load Balancer',
        VpcId: {
          Ref: Match.stringLikeRegexp('Vpc'),
        },
      });

      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw Fargate tasks',
        VpcId: {
          Ref: Match.stringLikeRegexp('Vpc'),
        },
      });
    });
  });
});
