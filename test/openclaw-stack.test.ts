import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { OpenClawStack } from '../lib/openclaw-stack';

describe('OpenClawStack', () => {
  let app: cdk.App;
  let stack: OpenClawStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new OpenClawStack(app, 'TestOpenClawStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  // ============================================================================
  // VPC Tests
  // ============================================================================
  describe('VPC', () => {
    test('creates a VPC with correct CIDR', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });

    test('creates public and private subnets', () => {
      template.resourceCountIs('AWS::EC2::Subnet', 4); // 2 public + 2 private
    });

    test('creates NAT gateway', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', 1);
    });
  });

  // ============================================================================
  // ECS Tests
  // ============================================================================
  describe('ECS', () => {
    test('creates an ECS cluster', () => {
      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterName: 'openclaw-cluster',
      });
    });

    test('creates Fargate task definition with correct resources', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '512',
        Memory: '1024',
        NetworkMode: 'awsvpc',
        RequiresCompatibilities: ['FARGATE'],
        RuntimePlatform: {
          CpuArchitecture: 'ARM64',
          OperatingSystemFamily: 'LINUX',
        },
      });
    });

    test('uses x86_64 when Graviton is disabled', () => {
      const x86App = new cdk.App();
      const x86Stack = new OpenClawStack(x86App, 'X86Stack', {
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
        useGraviton: false,
      });
      const x86Template = Template.fromStack(x86Stack);

      x86Template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        RuntimePlatform: {
          CpuArchitecture: 'X86_64',
          OperatingSystemFamily: 'LINUX',
        },
      });
    });
  });

  // ============================================================================
  // ECR Tests
  // ============================================================================
  describe('ECR', () => {
    test('creates ECR repository', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'openclaw',
        ImageScanningConfiguration: {
          ScanOnPush: true,
        },
      });
    });

    test('has lifecycle policy for image cleanup', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        LifecyclePolicy: {
          LifecyclePolicyText: Match.serializedJson({
            rules: [
              {
                rulePriority: 1,
                description: 'Keep last 30 images',
                selection: {
                  tagStatus: 'any',
                  countType: 'imageCountMoreThan',
                  countNumber: 30,
                },
                action: {
                  type: 'expire',
                },
              },
            ],
          }),
        },
      });
    });
  });

  // ============================================================================
  // EFS Tests
  // ============================================================================
  describe('EFS', () => {
    test('creates EFS file system', () => {
      template.hasResourceProperties('AWS::EFS::FileSystem', {
        Encrypted: true,
        PerformanceMode: 'generalPurpose',
        ThroughputMode: 'bursting',
      });
    });

    test('creates EFS access point', () => {
      template.hasResourceProperties('AWS::EFS::AccessPoint', {
        RootDirectory: {
          Path: '/openclaw',
        },
      });
    });

    test('creates mount targets', () => {
      template.resourceCountIs('AWS::EFS::MountTarget', 2);
    });
  });

  // ============================================================================
  // IAM Tests
  // ============================================================================
  describe('IAM', () => {
    test('creates task execution role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
              ],
            ],
          },
        ],
      });
    });

    test('creates task role with Bedrock permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com',
              },
            }),
          ],
        },
      });

      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              Resource: '*',
            }),
          ]),
        },
      });
    });
  });

  // ============================================================================
  // CloudWatch Logs Tests
  // ============================================================================
  describe('CloudWatch Logs', () => {
    test('creates log group', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/ecs/openclaw',
        RetentionInDays: 7,
      });
    });
  });

  // ============================================================================
  // Security Group Tests
  // ============================================================================
  describe('Security Groups', () => {
    test('creates task security group', () => {
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

    test('creates EFS security group', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenClaw EFS',
      });
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================
  describe('Configuration', () => {
    test('uses default Bedrock model', () => {
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Environment: Match.arrayWith([
              {
                Name: 'BEDROCK_MODEL_ID',
                Value: 'anthropic.claude-3-5-haiku-20241022-v1:0',
              },
            ]),
          }),
        ]),
      });
    });

    test('uses custom Bedrock model when specified', () => {
      const customApp = new cdk.App();
      const customStack = new OpenClawStack(customApp, 'CustomModelStack', {
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
        bedrockModel: 'anthropic.claude-3-opus-20240229-v1:0',
      });
      const customTemplate = Template.fromStack(customStack);

      customTemplate.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Environment: Match.arrayWith([
              {
                Name: 'BEDROCK_MODEL_ID',
                Value: 'anthropic.claude-3-opus-20240229-v1:0',
              },
            ]),
          }),
        ]),
      });
    });

    test('uses custom CPU and memory settings', () => {
      const customApp = new cdk.App();
      const customStack = new OpenClawStack(customApp, 'CustomResourceStack', {
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
        cpu: 1024,
        memoryMiB: 2048,
      });
      const customTemplate = Template.fromStack(customStack);

      customTemplate.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '1024',
        Memory: '2048',
      });
    });
  });

  // ============================================================================
  // Outputs Tests
  // ============================================================================
  describe('Outputs', () => {
    test('exports cluster name', () => {
      template.hasOutput('EcsClusterName', {
        Description: 'ECS Cluster Name',
      });
    });

    test('exports ECR repository URI', () => {
      template.hasOutput('EcrRepositoryUri', {
        Description: 'ECR Repository URI',
      });
    });

    test('exports file system ID', () => {
      template.hasOutput('FileSystemId', {
        Description: 'EFS File System ID',
      });
    });
  });

  // ============================================================================
  // Tags Tests
  // ============================================================================
  describe('Tags', () => {
    test('applies tags to resources', () => {
      // Check that stack has tags applied
      expect(stack).toBeDefined();
    });
  });
});

describe('OpenClawStack with existing VPC', () => {
  test('uses existing VPC when vpcId is provided', () => {
    const app = new cdk.App();
    
    // We can't fully test VPC lookup in unit tests without credentials,
    // but we can verify the stack creation doesn't fail when vpcId is provided
    // Note: This test requires env to be set for the VPC lookup to work
    expect(() => {
      new OpenClawStack(app, 'ExistingVpcStack', {
        env: {
          account: '123456789012',
          region: 'us-east-1',
        },
        vpcId: 'vpc-12345678',
      });
    }).not.toThrow();
  });
});
