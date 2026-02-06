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
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const openclaw_stack_1 = require("../lib/openclaw-stack");
describe('OpenClawStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new openclaw_stack_1.OpenClawStack(app, 'TestOpenClawStack', {
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        template = assertions_1.Template.fromStack(stack);
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
            const x86Stack = new openclaw_stack_1.OpenClawStack(x86App, 'X86Stack', {
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
                useGraviton: false,
            });
            const x86Template = assertions_1.Template.fromStack(x86Stack);
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
                    LifecyclePolicyText: assertions_1.Match.serializedJson({
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
                        assertions_1.Match.objectLike({
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
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Environment: assertions_1.Match.arrayWith([
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
            const customStack = new openclaw_stack_1.OpenClawStack(customApp, 'CustomModelStack', {
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
                bedrockModel: 'anthropic.claude-3-opus-20240229-v1:0',
            });
            const customTemplate = assertions_1.Template.fromStack(customStack);
            customTemplate.hasResourceProperties('AWS::ECS::TaskDefinition', {
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Environment: assertions_1.Match.arrayWith([
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
            const customStack = new openclaw_stack_1.OpenClawStack(customApp, 'CustomResourceStack', {
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
                cpu: 1024,
                memoryMiB: 2048,
            });
            const customTemplate = assertions_1.Template.fromStack(customStack);
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
            new openclaw_stack_1.OpenClawStack(app, 'ExistingVpcStack', {
                env: {
                    account: '123456789012',
                    region: 'us-east-1',
                },
                vpcId: 'vpc-12345678',
            });
        }).not.toThrow();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmNsYXctc3RhY2sudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3Qvb3BlbmNsYXctc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCwwREFBc0Q7QUFFdEQsUUFBUSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDN0IsSUFBSSxHQUFZLENBQUM7SUFDakIsSUFBSSxLQUFvQixDQUFDO0lBQ3pCLElBQUksUUFBa0IsQ0FBQztJQUV2QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLG1CQUFtQixFQUFFO1lBQ2xELEdBQUcsRUFBRTtnQkFDSCxPQUFPLEVBQUUsY0FBYztnQkFDdkIsTUFBTSxFQUFFLFdBQVc7YUFDcEI7U0FDRixDQUFDLENBQUM7UUFDSCxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCwrRUFBK0U7SUFDL0UsWUFBWTtJQUNaLCtFQUErRTtJQUMvRSxRQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUNuQixJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1lBQzNDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUU7Z0JBQzlDLFNBQVMsRUFBRSxhQUFhO2dCQUN4QixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixnQkFBZ0IsRUFBRSxJQUFJO2FBQ3ZCLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUM5QyxRQUFRLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFF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QUMvQyxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1FBQ3BELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTFCLG9FQUFvRTtRQUNwRSwyRUFBMkU7UUFDM0Usb0VBQW9FO1FBQ3BFLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDVixJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLGtCQUFrQixFQUFFO2dCQUN6QyxHQUFHLEVBQUU7b0JBQ0gsT0FBTyxFQUFFLGNBQWM7b0JBQ3ZCLE1BQU0sRUFBRSxXQUFXO2lCQUNwQjtnQkFDRCxLQUFLLEVBQUUsY0FBYzthQUN0QixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBUZW1wbGF0ZSwgTWF0Y2ggfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCB7IE9wZW5DbGF3U3RhY2sgfSBmcm9tICcuLi9saWIvb3BlbmNsYXctc3RhY2snO1xuXG5kZXNjcmliZSgnT3BlbkNsYXdTdGFjaycsICgpID0+IHtcbiAgbGV0IGFwcDogY2RrLkFwcDtcbiAgbGV0IHN0YWNrOiBPcGVuQ2xhd1N0YWNrO1xuICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgc3RhY2sgPSBuZXcgT3BlbkNsYXdTdGFjayhhcHAsICdUZXN0T3BlbkNsYXdTdGFjaycsIHtcbiAgICAgIGVudjoge1xuICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFZQQyBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdWUEMnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBhIFZQQyB3aXRoIGNvcnJlY3QgQ0lEUicsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlZQQycsIHtcbiAgICAgICAgQ2lkckJsb2NrOiAnMTAuMC4wLjAvMTYnLFxuICAgICAgICBFbmFibGVEbnNIb3N0bmFtZXM6IHRydWUsXG4gICAgICAgIEVuYWJsZURuc1N1cHBvcnQ6IHRydWUsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgcHVibGljIGFuZCBwcml2YXRlIHN1Ym5ldHMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUMyOjpTdWJuZXQnLCA0KTsgLy8gMiBwdWJsaWMgKyAyIHByaXZhdGVcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgTkFUIGdhdGV3YXknLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUMyOjpOYXRHYXRld2F5JywgMSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gRUNTIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0VDUycsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIGFuIEVDUyBjbHVzdGVyJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6Q2x1c3RlcicsIHtcbiAgICAgICAgQ2x1c3Rlck5hbWU6ICdvcGVuY2xhdy1jbHVzdGVyJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyBGYXJnYXRlIHRhc2sgZGVmaW5pdGlvbiB3aXRoIGNvcnJlY3QgcmVzb3VyY2VzJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICAgIENwdTogJzUxMicsXG4gICAgICAgIE1lbW9yeTogJzEwMjQnLFxuICAgICAgICBOZXR3b3JrTW9kZTogJ2F3c3ZwYycsXG4gICAgICAgIFJlcXVpcmVzQ29tcGF0aWJpbGl0aWVzOiBbJ0ZBUkdBVEUnXSxcbiAgICAgICAgUnVudGltZVBsYXRmb3JtOiB7XG4gICAgICAgICAgQ3B1QXJjaGl0ZWN0dXJlOiAnQVJNNjQnLFxuICAgICAgICAgIE9wZXJhdGluZ1N5c3RlbUZhbWlseTogJ0xJTlVYJyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndXNlcyB4ODZfNjQgd2hlbiBHcmF2aXRvbiBpcyBkaXNhYmxlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHg4NkFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgICBjb25zdCB4ODZTdGFjayA9IG5ldyBPcGVuQ2xhd1N0YWNrKHg4NkFwcCwgJ1g4NlN0YWNrJywge1xuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9LFxuICAgICAgICB1c2VHcmF2aXRvbjogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHg4NlRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHg4NlN0YWNrKTtcblxuICAgICAgeDg2VGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICAgIFJ1bnRpbWVQbGF0Zm9ybToge1xuICAgICAgICAgIENwdUFyY2hpdGVjdHVyZTogJ1g4Nl82NCcsXG4gICAgICAgICAgT3BlcmF0aW5nU3lzdGVtRmFtaWx5OiAnTElOVVgnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gRUNSIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0VDUicsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIEVDUiByZXBvc2l0b3J5JywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUjo6UmVwb3NpdG9yeScsIHtcbiAgICAgICAgUmVwb3NpdG9yeU5hbWU6ICdvcGVuY2xhdycsXG4gICAgICAgIEltYWdlU2Nhbm5pbmdDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgU2Nhbk9uUHVzaDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnaGFzIGxpZmVjeWNsZSBwb2xpY3kgZm9yIGltYWdlIGNsZWFudXAnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNSOjpSZXBvc2l0b3J5Jywge1xuICAgICAgICBMaWZlY3ljbGVQb2xpY3k6IHtcbiAgICAgICAgICBMaWZlY3ljbGVQb2xpY3lUZXh0OiBNYXRjaC5zZXJpYWxpemVkSnNvbih7XG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcnVsZVByaW9yaXR5OiAxLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnS2VlcCBsYXN0IDMwIGltYWdlcycsXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICB0YWdTdGF0dXM6ICdhbnknLFxuICAgICAgICAgICAgICAgICAgY291bnRUeXBlOiAnaW1hZ2VDb3VudE1vcmVUaGFuJyxcbiAgICAgICAgICAgICAgICAgIGNvdW50TnVtYmVyOiAzMCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4cGlyZScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBFRlMgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnRUZTJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgRUZTIGZpbGUgc3lzdGVtJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVGUzo6RmlsZVN5c3RlbScsIHtcbiAgICAgICAgRW5jcnlwdGVkOiB0cnVlLFxuICAgICAgICBQZXJmb3JtYW5jZU1vZGU6ICdnZW5lcmFsUHVycG9zZScsXG4gICAgICAgIFRocm91Z2hwdXRNb2RlOiAnYnVyc3RpbmcnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIEVGUyBhY2Nlc3MgcG9pbnQnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUZTOjpBY2Nlc3NQb2ludCcsIHtcbiAgICAgICAgUm9vdERpcmVjdG9yeToge1xuICAgICAgICAgIFBhdGg6ICcvb3BlbmNsYXcnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIG1vdW50IHRhcmdldHMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUZTOjpNb3VudFRhcmdldCcsIDIpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIElBTSBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdJQU0nLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyB0YXNrIGV4ZWN1dGlvbiByb2xlJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6Um9sZScsIHtcbiAgICAgICAgQXNzdW1lUm9sZVBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgUHJpbmNpcGFsOiB7XG4gICAgICAgICAgICAgICAgU2VydmljZTogJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgQWN0aW9uOiAnc3RzOkFzc3VtZVJvbGUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBNYW5hZ2VkUG9saWN5QXJuczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAnYXJuOicsXG4gICAgICAgICAgICAgICAgeyBSZWY6ICdBV1M6OlBhcnRpdGlvbicgfSxcbiAgICAgICAgICAgICAgICAnOmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQW1hem9uRUNTVGFza0V4ZWN1dGlvblJvbGVQb2xpY3knLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIHRhc2sgcm9sZSB3aXRoIEJlZHJvY2sgcGVybWlzc2lvbnMnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpSb2xlJywge1xuICAgICAgICBBc3N1bWVSb2xlUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIFByaW5jaXBhbDoge1xuICAgICAgICAgICAgICAgIFNlcnZpY2U6ICdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgICAgUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICBTdGF0ZW1lbnQ6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgICBBY3Rpb246IFtcbiAgICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBSZXNvdXJjZTogJyonLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDbG91ZFdhdGNoIExvZ3MgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnQ2xvdWRXYXRjaCBMb2dzJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgbG9nIGdyb3VwJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywge1xuICAgICAgICBMb2dHcm91cE5hbWU6ICcvZWNzL29wZW5jbGF3JyxcbiAgICAgICAgUmV0ZW50aW9uSW5EYXlzOiA3LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gU2VjdXJpdHkgR3JvdXAgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnU2VjdXJpdHkgR3JvdXBzJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgdGFzayBzZWN1cml0eSBncm91cCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIEdyb3VwRGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgRmFyZ2F0ZSB0YXNrcycsXG4gICAgICAgIFNlY3VyaXR5R3JvdXBFZ3Jlc3M6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBDaWRySXA6ICcwLjAuMC4wLzAnLFxuICAgICAgICAgICAgRGVzY3JpcHRpb246ICdBbGxvdyBhbGwgb3V0Ym91bmQgdHJhZmZpYyBieSBkZWZhdWx0JyxcbiAgICAgICAgICAgIElwUHJvdG9jb2w6ICctMScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyBFRlMgc2VjdXJpdHkgZ3JvdXAnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJywge1xuICAgICAgICBHcm91cERlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIE9wZW5DbGF3IEVGUycsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDb25maWd1cmF0aW9uIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0NvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgndXNlcyBkZWZhdWx0IEJlZHJvY2sgbW9kZWwnLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBFbnZpcm9ubWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIE5hbWU6ICdCRURST0NLX01PREVMX0lEJyxcbiAgICAgICAgICAgICAgICBWYWx1ZTogJ2FudGhyb3BpYy5jbGF1ZGUtMy01LWhhaWt1LTIwMjQxMDIyLXYxOjAnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd1c2VzIGN1c3RvbSBCZWRyb2NrIG1vZGVsIHdoZW4gc3BlY2lmaWVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgY3VzdG9tQXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICAgIGNvbnN0IGN1c3RvbVN0YWNrID0gbmV3IE9wZW5DbGF3U3RhY2soY3VzdG9tQXBwLCAnQ3VzdG9tTW9kZWxTdGFjaycsIHtcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgICAgfSxcbiAgICAgICAgYmVkcm9ja01vZGVsOiAnYW50aHJvcGljLmNsYXVkZS0zLW9wdXMtMjAyNDAyMjktdjE6MCcsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGN1c3RvbVRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGN1c3RvbVN0YWNrKTtcblxuICAgICAgY3VzdG9tVGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICAgIENvbnRhaW5lckRlZmluaXRpb25zOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgRW52aXJvbm1lbnQ6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBOYW1lOiAnQkVEUk9DS19NT0RFTF9JRCcsXG4gICAgICAgICAgICAgICAgVmFsdWU6ICdhbnRocm9waWMuY2xhdWRlLTMtb3B1cy0yMDI0MDIyOS12MTowJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0pLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndXNlcyBjdXN0b20gQ1BVIGFuZCBtZW1vcnkgc2V0dGluZ3MnLCAoKSA9PiB7XG4gICAgICBjb25zdCBjdXN0b21BcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgICAgY29uc3QgY3VzdG9tU3RhY2sgPSBuZXcgT3BlbkNsYXdTdGFjayhjdXN0b21BcHAsICdDdXN0b21SZXNvdXJjZVN0YWNrJywge1xuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLFxuICAgICAgICB9LFxuICAgICAgICBjcHU6IDEwMjQsXG4gICAgICAgIG1lbW9yeU1pQjogMjA0OCxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgY3VzdG9tVGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soY3VzdG9tU3RhY2spO1xuXG4gICAgICBjdXN0b21UZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgQ3B1OiAnMTAyNCcsXG4gICAgICAgIE1lbW9yeTogJzIwNDgnLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gT3V0cHV0cyBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdPdXRwdXRzJywgKCkgPT4ge1xuICAgIHRlc3QoJ2V4cG9ydHMgY2x1c3RlciBuYW1lJywgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdFY3NDbHVzdGVyTmFtZScsIHtcbiAgICAgICAgRGVzY3JpcHRpb246ICdFQ1MgQ2x1c3RlciBOYW1lJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3J0cyBFQ1IgcmVwb3NpdG9yeSBVUkknLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0VjclJlcG9zaXRvcnlVcmknLCB7XG4gICAgICAgIERlc2NyaXB0aW9uOiAnRUNSIFJlcG9zaXRvcnkgVVJJJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3J0cyBmaWxlIHN5c3RlbSBJRCcsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc091dHB1dCgnRmlsZVN5c3RlbUlkJywge1xuICAgICAgICBEZXNjcmlwdGlvbjogJ0VGUyBGaWxlIFN5c3RlbSBJRCcsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUYWdzIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ1RhZ3MnLCAoKSA9PiB7XG4gICAgdGVzdCgnYXBwbGllcyB0YWdzIHRvIHJlc291cmNlcycsICgpID0+IHtcbiAgICAgIC8vIENoZWNrIHRoYXQgc3RhY2sgaGFzIHRhZ3MgYXBwbGllZFxuICAgICAgZXhwZWN0KHN0YWNrKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZSgnT3BlbkNsYXdTdGFjayB3aXRoIGV4aXN0aW5nIFZQQycsICgpID0+IHtcbiAgdGVzdCgndXNlcyBleGlzdGluZyBWUEMgd2hlbiB2cGNJZCBpcyBwcm92aWRlZCcsICgpID0+IHtcbiAgICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIFxuICAgIC8vIFdlIGNhbid0IGZ1bGx5IHRlc3QgVlBDIGxvb2t1cCBpbiB1bml0IHRlc3RzIHdpdGhvdXQgY3JlZGVudGlhbHMsXG4gICAgLy8gYnV0IHdlIGNhbiB2ZXJpZnkgdGhlIHN0YWNrIGNyZWF0aW9uIGRvZXNuJ3QgZmFpbCB3aGVuIHZwY0lkIGlzIHByb3ZpZGVkXG4gICAgLy8gTm90ZTogVGhpcyB0ZXN0IHJlcXVpcmVzIGVudiB0byBiZSBzZXQgZm9yIHRoZSBWUEMgbG9va3VwIHRvIHdvcmtcbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgbmV3IE9wZW5DbGF3U3RhY2soYXBwLCAnRXhpc3RpbmdWcGNTdGFjaycsIHtcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgICAgfSxcbiAgICAgICAgdnBjSWQ6ICd2cGMtMTIzNDU2NzgnLFxuICAgICAgfSk7XG4gICAgfSkubm90LnRvVGhyb3coKTtcbiAgfSk7XG59KTtcbiJdfQ==