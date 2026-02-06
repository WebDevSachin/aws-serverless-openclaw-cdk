import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { OpenClawFargate, OpenClawFargateProps } from '../../lib/constructs/fargate';

describe('OpenClawFargate', () => {
  // Helper to create base stack resources
  function createBaseStack() {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });

    // Create VPC
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

    // Create security group
    const securityGroup = new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
      vpc,
      description: 'Test security group',
      allowAllOutbound: true,
    });

    // Create bucket
    const bucket = new s3.Bucket(stack, 'TestBucket', {
      bucketName: 'test-openclaw-bucket',
    });

    // Create secrets
    const gatewayTokenSecret = new secretsmanager.Secret(stack, 'GatewayTokenSecret', {
      secretName: 'openclaw/gateway-token',
    });

    const externalApiSecret = new secretsmanager.Secret(stack, 'ExternalApiSecret', {
      secretName: 'openclaw/external-apis',
      secretStringValue: cdk.SecretValue.unsafePlainText(
        JSON.stringify({
          ANTHROPIC_API_KEY: 'test-anthropic-key',
          OPENAI_API_KEY: 'test-openai-key',
        })
      ),
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
      securityGroup,
      bucket,
      gatewayTokenSecret,
      externalApiSecret,
      taskExecutionRole,
      taskRole,
    };
  }

  // Helper to create Fargate construct with default props
  function createFargateConstruct(
    baseResources: ReturnType<typeof createBaseStack>,
    props?: Partial<OpenClawFargateProps>
  ) {
    const {
      stack,
      vpc,
      securityGroup,
      bucket,
      gatewayTokenSecret,
      externalApiSecret,
      taskExecutionRole,
      taskRole,
    } = baseResources;

    const fargate = new OpenClawFargate(stack, 'TestFargate', {
      vpc,
      securityGroup,
      bucket,
      gatewayTokenSecret,
      externalApiSecret,
      taskExecutionRole,
      taskRole,
      ...props,
    });

    return { fargate, template: Template.fromStack(stack) };
  }

  // ============================================================================
  // Task Definition Tests
  // ============================================================================
  describe('Task Definition', () => {
    test('creates task definition with default CPU (512) and memory (1024)', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '512',
        Memory: '1024',
        NetworkMode: 'awsvpc',
      });
    });

    test('creates task definition with custom CPU and memory', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        cpu: 1024,
        memoryMiB: 2048,
      });

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '1024',
        Memory: '2048',
      });
    });

    test('uses ARM64 architecture when useGraviton is true', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        useGraviton: true,
      });

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        RuntimePlatform: {
          CpuArchitecture: 'ARM64',
          OperatingSystemFamily: 'LINUX',
        },
      });
    });

    test('uses X86_64 architecture when useGraviton is false', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        useGraviton: false,
      });

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        RuntimePlatform: {
          CpuArchitecture: 'X86_64',
          OperatingSystemFamily: 'LINUX',
        },
      });
    });

    test('uses provided task execution role', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ExecutionRoleArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('TaskExecutionRole'), 'Arn'],
        },
      });
    });

    test('uses provided task role', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        TaskRoleArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('TaskRole'), 'Arn'],
        },
      });
    });
  });

  // ============================================================================
  // Container Definition Tests
  // ============================================================================
  describe('Container Definition', () => {
    test('container has correct environment variables', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Environment: Match.arrayWith([
              { Name: 'NODE_ENV', Value: 'production' },
              { Name: 'PORT', Value: '3000' },
              { Name: 'LOG_LEVEL', Value: 'info' },
              { Name: 'BEDROCK_MODEL_ID', Value: 'anthropic.claude-3-5-haiku-20241022-v1:0' },
              { Name: 'BEDROCK_REGION', Value: 'us-east-1' },
              { Name: 'S3_BUCKET', Value: { Ref: Match.stringLikeRegexp('TestBucket') } },
            ]),
          }),
        ]),
      });
    });

    test('container has custom Bedrock configuration when specified', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        bedrockModelId: 'anthropic.claude-3-opus-20240229-v1:0',
        bedrockRegion: 'us-west-2',
      });

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Environment: Match.arrayWith([
              { Name: 'BEDROCK_MODEL_ID', Value: 'anthropic.claude-3-opus-20240229-v1:0' },
              { Name: 'BEDROCK_REGION', Value: 'us-west-2' },
            ]),
          }),
        ]),
      });
    });

    test('container has port mapping on port 3000', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            PortMappings: [
              {
                ContainerPort: 3000,
                Protocol: 'tcp',
              },
            ],
          }),
        ]),
      });
    });

    test('container has health check configuration', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            HealthCheck: {
              Command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
              Interval: 30,
              Timeout: 5,
              Retries: 3,
              StartPeriod: 60,
            },
          }),
        ]),
      });
    });

    test('container references gateway token secret', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Secrets: Match.arrayWith([
              Match.objectLike({
                Name: 'GATEWAY_TOKEN',
                ValueFrom: {
                  Ref: Match.stringLikeRegexp('GatewayTokenSecret'),
                },
              }),
            ]),
          }),
        ]),
      });
    });

    test('container references external API secrets when provided', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        externalApiSecret: base.externalApiSecret,
      });

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Secrets: Match.arrayWith([
              Match.objectLike({
                Name: 'ANTHROPIC_API_KEY',
              }),
              Match.objectLike({
                Name: 'OPENAI_API_KEY',
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // Service Tests
  // ============================================================================
  describe('Fargate Service', () => {
    test('creates ECS service', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Service', {
        ServiceName: 'openclaw-service',
        DesiredCount: 1,
        LaunchType: 'FARGATE',
      });
    });

    test('service is in private subnets', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Service', {
        NetworkConfiguration: {
          AwsvpcConfiguration: {
            AssignPublicIp: 'DISABLED',
            Subnets: Match.arrayWith([
              { Ref: Match.stringLikeRegexp('Private') },
            ]),
          },
        },
      });
    });

    test('service does not assign public IP', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Service', {
        NetworkConfiguration: {
          AwsvpcConfiguration: {
            AssignPublicIp: 'DISABLED',
          },
        },
      });
    });

    test('service has circuit breaker enabled', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Service', {
        DeploymentConfiguration: {
          DeploymentCircuitBreaker: {
            Enable: true,
            Rollback: true,
          },
        },
      });
    });

    test('service has health check grace period of 60 seconds', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Service', {
        HealthCheckGracePeriodSeconds: 60,
      });
    });

    test('service uses provided security group', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Service', {
        NetworkConfiguration: {
          AwsvpcConfiguration: {
            SecurityGroups: [
              {
                'Fn::GetAtt': [Match.stringLikeRegexp('TestSecurityGroup'), 'GroupId'],
              },
            ],
          },
        },
      });
    });
  });

  // ============================================================================
  // Cluster Tests
  // ============================================================================
  describe('ECS Cluster', () => {
    test('creates cluster when not provided', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterName: 'openclaw-cluster',
        ClusterSettings: [
          {
            Name: 'containerInsights',
            Value: 'enabled',
          },
        ],
      });
    });

    test('uses provided cluster', () => {
      const base = createBaseStack();
      const existingCluster = new ecs.Cluster(base.stack, 'ExistingCluster', {
        vpc: base.vpc,
        clusterName: 'existing-cluster',
      });

      const { fargate, template } = createFargateConstruct(base, {
        cluster: existingCluster,
      });

      // Should use the existing cluster (cluster is a reference so we check it exists)
      expect(fargate.cluster).toBeDefined();
      // Should only have one cluster (the existing one)
      template.resourceCountIs('AWS::ECS::Cluster', 1);
    });

    test('enables container insights', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterSettings: [
          {
            Name: 'containerInsights',
            Value: 'enabled',
          },
        ],
      });
    });
  });

  // ============================================================================
  // CloudWatch Logs Tests
  // ============================================================================
  describe('CloudWatch Logging', () => {
    test('creates CloudWatch log group', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/ecs/openclaw',
      });
    });

    test('configures awslogs driver with correct prefix', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            LogConfiguration: {
              LogDriver: 'awslogs',
              Options: {
                'awslogs-stream-prefix': 'openclaw',
              },
            },
          }),
        ]),
      });
    });

    test('uses correct log retention period', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        logRetentionDays: 14,
      });

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 14,
      });
    });
  });

  // ============================================================================
  // Auto-scaling Tests
  // ============================================================================
  describe('Auto-scaling', () => {
    test('configures auto-scaling by default', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
        MinCapacity: 1,
        MaxCapacity: 3,
      });
    });

    test('configures auto-scaling with custom min/max capacity', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        minCapacity: 2,
        maxCapacity: 5,
      });

      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
        MinCapacity: 2,
        MaxCapacity: 5,
      });
    });

    test('configures CPU-based target tracking', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
        PolicyType: 'TargetTrackingScaling',
        TargetTrackingScalingPolicyConfiguration: {
          PredefinedMetricSpecification: {
            PredefinedMetricType: 'ECSServiceAverageCPUUtilization',
          },
          TargetValue: 70,
          ScaleInCooldown: 300,
          ScaleOutCooldown: 60,
        },
      });
    });

    test('can disable auto-scaling', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        enableAutoScaling: false,
      });

      template.resourceCountIs('AWS::ApplicationAutoScaling::ScalableTarget', 0);
      template.resourceCountIs('AWS::ApplicationAutoScaling::ScalingPolicy', 0);
    });
  });

  // ============================================================================
  // ALB Integration Tests
  // ============================================================================
  describe('ALB Integration', () => {
    test('attaches to target group when provided', () => {
      const base = createBaseStack();

      const targetGroup = new elbv2.ApplicationTargetGroup(base.stack, 'TargetGroup', {
        vpc: base.vpc,
        port: 3000,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
      });

      const { template } = createFargateConstruct(base, {
        targetGroup,
      });

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

    test('does not attach to target group when not provided', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      template.hasResourceProperties('AWS::ECS::Service', {
        LoadBalancers: Match.absent(),
      });
    });
  });

  // ============================================================================
  // Output Tests
  // ============================================================================
  describe('Outputs', () => {
    test('exports service name', () => {
      const base = createBaseStack();
      createFargateConstruct(base);

      const template = Template.fromStack(base.stack);
      // Check that there is an output with Service in the name
      const outputs = template.findOutputs('*');
      const serviceOutputs = Object.entries(outputs).filter(([key]) => 
        key.includes('Service') && key.includes('Name')
      );
      expect(serviceOutputs.length).toBeGreaterThan(0);
    });

    test('exports cluster name', () => {
      const base = createBaseStack();
      createFargateConstruct(base);

      const template = Template.fromStack(base.stack);
      // Check that there is an output with Cluster in the name
      const outputs = template.findOutputs('*');
      const clusterOutputs = Object.entries(outputs).filter(([key]) => 
        key.includes('Cluster') && key.includes('Name')
      );
      expect(clusterOutputs.length).toBeGreaterThan(0);
    });

    test('exports task definition ARN', () => {
      const base = createBaseStack();
      createFargateConstruct(base);

      const template = Template.fromStack(base.stack);
      // Check that there is an output with TaskDefinition in the name
      const outputs = template.findOutputs('*');
      const taskDefOutputs = Object.entries(outputs).filter(([key]) => 
        key.includes('TaskDefinition')
      );
      expect(taskDefOutputs.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Public Properties Tests
  // ============================================================================
  describe('Public Properties', () => {
    test('exposes cluster property', () => {
      const base = createBaseStack();
      const { fargate } = createFargateConstruct(base);

      expect(fargate.cluster).toBeDefined();
      // clusterName is a token, so we just verify it's defined
      expect(fargate.cluster.clusterName).toBeDefined();
    });

    test('exposes service property', () => {
      const base = createBaseStack();
      const { fargate } = createFargateConstruct(base);

      expect(fargate.service).toBeDefined();
      // serviceName is a token, so we just verify it's defined
      expect(fargate.service.serviceName).toBeDefined();
    });

    test('exposes task definition property', () => {
      const base = createBaseStack();
      const { fargate } = createFargateConstruct(base);

      expect(fargate.taskDefinition).toBeDefined();
      expect(fargate.taskDefinition.defaultContainer).toBeDefined();
    });

    test('exposes container property', () => {
      const base = createBaseStack();
      const { fargate } = createFargateConstruct(base);

      expect(fargate.container).toBeDefined();
      expect(fargate.container.containerName).toBe('openclaw');
    });

    test('exposes log group property', () => {
      const base = createBaseStack();
      const { fargate } = createFargateConstruct(base);

      expect(fargate.logGroup).toBeDefined();
      // logGroupName is a token, so we just verify it's defined
      expect(fargate.logGroup.logGroupName).toBeDefined();
    });

    test('exposes auto scaling target when enabled', () => {
      const base = createBaseStack();
      const { fargate } = createFargateConstruct(base, { enableAutoScaling: true });

      expect(fargate.autoScalingTarget).toBeDefined();
    });

    test('auto scaling target is undefined when disabled', () => {
      const base = createBaseStack();
      const { fargate } = createFargateConstruct(base, { enableAutoScaling: false });

      expect(fargate.autoScalingTarget).toBeUndefined();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration', () => {
    test('creates complete Fargate setup with all components', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base);

      // Verify all major resources are created
      template.resourceCountIs('AWS::ECS::Cluster', 1);
      template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
      template.resourceCountIs('AWS::ECS::Service', 1);
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
      template.resourceCountIs('AWS::ApplicationAutoScaling::ScalableTarget', 1);
      template.resourceCountIs('AWS::ApplicationAutoScaling::ScalingPolicy', 1);
    });

    test('uses correct desired count', () => {
      const base = createBaseStack();
      const { template } = createFargateConstruct(base, {
        desiredCount: 2,
      });

      template.hasResourceProperties('AWS::ECS::Service', {
        DesiredCount: 2,
      });
    });
  });
});
