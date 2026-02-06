import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { OpenClawLogging, LogRetentionDays } from '../../lib/constructs/logging';

describe('OpenClawLogging', () => {
  function createBaseStack() {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    return { app, stack };
  }

  function createVpc(stack: cdk.Stack) {
    return new ec2.Vpc(stack, 'TestVpc', {
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
  }

  function createSecurityGroup(stack: cdk.Stack, vpc: ec2.IVpc) {
    return new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
      vpc,
      description: 'Test security group',
      allowAllOutbound: true,
    });
  }

  function createAlb(stack: cdk.Stack, vpc: ec2.IVpc, securityGroup: ec2.ISecurityGroup) {
    return new elbv2.ApplicationLoadBalancer(stack, 'TestAlb', {
      vpc,
      internetFacing: true,
      securityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });
  }

  // ============================================================================
  // Log Group Tests
  // ============================================================================
  describe('Log Group', () => {
    test('creates CloudWatch log group', () => {
      const { stack } = createBaseStack();
      
      new OpenClawLogging(stack, 'TestLogging');

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/ecs/openclaw',
        RetentionInDays: 7,
      });
    });

    test('creates log group with default 7 day retention', () => {
      const { stack } = createBaseStack();
      
      new OpenClawLogging(stack, 'TestLogging');

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7,
      });
    });

    test('creates log group with custom retention (1 day)', () => {
      const { stack } = createBaseStack();
      
      new OpenClawLogging(stack, 'TestLogging', {
        logRetention: logs.RetentionDays.ONE_DAY,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 1,
      });
    });

    test('creates log group with custom retention (14 days)', () => {
      const { stack } = createBaseStack();
      
      new OpenClawLogging(stack, 'TestLogging', {
        logRetention: logs.RetentionDays.TWO_WEEKS,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 14,
      });
    });

    test('creates log group with custom retention (90 days)', () => {
      const { stack } = createBaseStack();
      
      new OpenClawLogging(stack, 'TestLogging', {
        logRetention: logs.RetentionDays.THREE_MONTHS,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 90,
      });
    });

    test('uses custom log group name when provided', () => {
      const { stack } = createBaseStack();
      
      new OpenClawLogging(stack, 'TestLogging', {
        logGroupName: '/custom/log/group',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/custom/log/group',
      });
    });

    test('sets removal policy to destroy', () => {
      const { stack } = createBaseStack();
      
      new OpenClawLogging(stack, 'TestLogging');

      const template = Template.fromStack(stack);

      template.hasResource('AWS::Logs::LogGroup', {
        DeletionPolicy: 'Delete',
      });
    });
  });

  // ============================================================================
  // ALB Access Logging Tests
  // ============================================================================
  describe('ALB Access Logging', () => {
    test('creates S3 bucket for ALB access logs when ALB is provided', () => {
      const { stack } = createBaseStack();
      const vpc = createVpc(stack);
      const securityGroup = createSecurityGroup(stack, vpc);
      const alb = createAlb(stack, vpc, securityGroup);

      new OpenClawLogging(stack, 'TestLogging', {
        alb,
      });

      const template = Template.fromStack(stack);

      // Find the ALB log bucket by its unique bucket name pattern
      const resources = template.toJSON().Resources as Record<string, any>;
      const albLogBucket = Object.values(resources || {}).find(
        (r: any) => r.Type === 'AWS::S3::Bucket' && 
                    r.Properties?.BucketName?.startsWith('openclaw-alb-logs-')
      ) as any;
      
      expect(albLogBucket).toBeDefined();
      expect(albLogBucket.Properties.BucketName).toMatch(/openclaw-alb-logs-\d+-us-east-1/);
      expect(albLogBucket.Properties.LifecycleConfiguration).toBeDefined();
    });

    test('blocks public access on ALB log bucket', () => {
      const { stack } = createBaseStack();
      const vpc = createVpc(stack);
      const securityGroup = createSecurityGroup(stack, vpc);
      const alb = createAlb(stack, vpc, securityGroup);

      new OpenClawLogging(stack, 'TestLogging', {
        alb,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('sets ALB log bucket retention to retain', () => {
      const { stack } = createBaseStack();
      const vpc = createVpc(stack);
      const securityGroup = createSecurityGroup(stack, vpc);
      const alb = createAlb(stack, vpc, securityGroup);

      new OpenClawLogging(stack, 'TestLogging', {
        alb,
      });

      const template = Template.fromStack(stack);

      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
      });
    });

    test('does not create S3 bucket when ALB is not provided', () => {
      const { stack } = createBaseStack();

      new OpenClawLogging(stack, 'TestLogging');

      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::S3::Bucket', 0);
    });

    test('exposes logGroup property', () => {
      const { stack } = createBaseStack();

      const logging = new OpenClawLogging(stack, 'TestLogging');

      expect(logging.logGroup).toBeDefined();
      expect(logging.logGroup.logGroupName).toBeDefined();
    });

    test('exposes albLogBucket property when ALB is provided', () => {
      const { stack } = createBaseStack();
      const vpc = createVpc(stack);
      const securityGroup = createSecurityGroup(stack, vpc);
      const alb = createAlb(stack, vpc, securityGroup);

      const logging = new OpenClawLogging(stack, 'TestLogging', {
        alb,
      });

      expect(logging.albLogBucket).toBeDefined();
      expect(logging.albLogBucket?.bucketName).toBeDefined();
    });

    test('albLogBucket is undefined when ALB is not provided', () => {
      const { stack } = createBaseStack();

      const logging = new OpenClawLogging(stack, 'TestLogging');

      expect(logging.albLogBucket).toBeUndefined();
    });
  });

  // ============================================================================
  // Output Tests
  // ============================================================================
  describe('Outputs', () => {
    test('exports log group name', () => {
      const { stack } = createBaseStack();

      new OpenClawLogging(stack, 'TestLogging');

      const template = Template.fromStack(stack);

      // Check that output with correct description exists
      const outputs = template.toJSON().Outputs;
      const logGroupOutput = Object.values(outputs || {}).find(
        (o: any) => o.Description === 'CloudWatch Log Group Name for OpenClaw ECS tasks'
      );
      expect(logGroupOutput).toBeDefined();
    });

    test('exports ALB log bucket name when ALB is provided', () => {
      const { stack } = createBaseStack();
      const vpc = createVpc(stack);
      const securityGroup = createSecurityGroup(stack, vpc);
      const alb = createAlb(stack, vpc, securityGroup);

      new OpenClawLogging(stack, 'TestLogging', {
        alb,
      });

      const template = Template.fromStack(stack);

      // Check that outputs with correct descriptions exist
      const outputs = template.toJSON().Outputs;
      const albLogBucketNameOutput = Object.values(outputs || {}).find(
        (o: any) => o.Description === 'S3 Bucket Name for ALB Access Logs'
      );
      const albLogBucketArnOutput = Object.values(outputs || {}).find(
        (o: any) => o.Description === 'S3 Bucket ARN for ALB Access Logs'
      );

      expect(albLogBucketNameOutput).toBeDefined();
      expect(albLogBucketArnOutput).toBeDefined();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    test('creates complete logging setup with ALB', () => {
      const { stack } = createBaseStack();
      const vpc = createVpc(stack);
      const securityGroup = createSecurityGroup(stack, vpc);
      const alb = createAlb(stack, vpc, securityGroup);

      new OpenClawLogging(stack, 'TestLogging', {
        alb,
        logRetention: logs.RetentionDays.ONE_MONTH,
      });

      const template = Template.fromStack(stack);

      // Verify all resources are created
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    test('creates minimal logging setup without ALB', () => {
      const { stack } = createBaseStack();

      new OpenClawLogging(stack, 'TestLogging');

      const template = Template.fromStack(stack);

      // Only log group should be created
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
      template.resourceCountIs('AWS::S3::Bucket', 0);
    });
  });
});
