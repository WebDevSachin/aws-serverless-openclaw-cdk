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
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const fargate_1 = require("../../lib/constructs/fargate");
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
            secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
                ANTHROPIC_API_KEY: 'test-anthropic-key',
                OPENAI_API_KEY: 'test-openai-key',
            })),
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
    function createFargateConstruct(baseResources, props) {
        const { stack, vpc, securityGroup, bucket, gatewayTokenSecret, externalApiSecret, taskExecutionRole, taskRole, } = baseResources;
        const fargate = new fargate_1.OpenClawFargate(stack, 'TestFargate', {
            vpc,
            securityGroup,
            bucket,
            gatewayTokenSecret,
            externalApiSecret,
            taskExecutionRole,
            taskRole,
            ...props,
        });
        return { fargate, template: assertions_1.Template.fromStack(stack) };
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
                    'Fn::GetAtt': [assertions_1.Match.stringLikeRegexp('TaskExecutionRole'), 'Arn'],
                },
            });
        });
        test('uses provided task role', () => {
            const base = createBaseStack();
            const { template } = createFargateConstruct(base);
            template.hasResourceProperties('AWS::ECS::TaskDefinition', {
                TaskRoleArn: {
                    'Fn::GetAtt': [assertions_1.Match.stringLikeRegexp('TaskRole'), 'Arn'],
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Environment: assertions_1.Match.arrayWith([
                            { Name: 'NODE_ENV', Value: 'production' },
                            { Name: 'PORT', Value: '3000' },
                            { Name: 'LOG_LEVEL', Value: 'info' },
                            { Name: 'BEDROCK_MODEL_ID', Value: 'anthropic.claude-3-5-haiku-20241022-v1:0' },
                            { Name: 'BEDROCK_REGION', Value: 'us-east-1' },
                            { Name: 'S3_BUCKET', Value: { Ref: assertions_1.Match.stringLikeRegexp('TestBucket') } },
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Environment: assertions_1.Match.arrayWith([
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Secrets: assertions_1.Match.arrayWith([
                            assertions_1.Match.objectLike({
                                Name: 'GATEWAY_TOKEN',
                                ValueFrom: {
                                    Ref: assertions_1.Match.stringLikeRegexp('GatewayTokenSecret'),
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Secrets: assertions_1.Match.arrayWith([
                            assertions_1.Match.objectLike({
                                Name: 'ANTHROPIC_API_KEY',
                            }),
                            assertions_1.Match.objectLike({
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
                        Subnets: assertions_1.Match.arrayWith([
                            { Ref: assertions_1.Match.stringLikeRegexp('Private') },
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
                                'Fn::GetAtt': [assertions_1.Match.stringLikeRegexp('TestSecurityGroup'), 'GroupId'],
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
                ContainerDefinitions: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
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
                        TargetGroupArn: { Ref: assertions_1.Match.stringLikeRegexp('TargetGroup') },
                    },
                ],
            });
        });
        test('does not attach to target group when not provided', () => {
            const base = createBaseStack();
            const { template } = createFargateConstruct(base);
            template.hasResourceProperties('AWS::ECS::Service', {
                LoadBalancers: assertions_1.Match.absent(),
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
            const template = assertions_1.Template.fromStack(base.stack);
            // Check that there is an output with Service in the name
            const outputs = template.findOutputs('*');
            const serviceOutputs = Object.entries(outputs).filter(([key]) => key.includes('Service') && key.includes('Name'));
            expect(serviceOutputs.length).toBeGreaterThan(0);
        });
        test('exports cluster name', () => {
            const base = createBaseStack();
            createFargateConstruct(base);
            const template = assertions_1.Template.fromStack(base.stack);
            // Check that there is an output with Cluster in the name
            const outputs = template.findOutputs('*');
            const clusterOutputs = Object.entries(outputs).filter(([key]) => key.includes('Cluster') && key.includes('Name'));
            expect(clusterOutputs.length).toBeGreaterThan(0);
        });
        test('exports task definition ARN', () => {
            const base = createBaseStack();
            createFargateConstruct(base);
            const template = assertions_1.Template.fromStack(base.stack);
            // Check that there is an output with TaskDefinition in the name
            const outputs = template.findOutputs('*');
            const taskDefOutputs = Object.entries(outputs).filter(([key]) => key.includes('TaskDefinition'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFyZ2F0ZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9jb25zdHJ1Y3RzL2ZhcmdhdGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQyx1REFBeUM7QUFDekMsK0VBQWlFO0FBQ2pFLDhFQUFnRTtBQUNoRSwwREFBcUY7QUFFckYsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUMvQix3Q0FBd0M7SUFDeEMsU0FBUyxlQUFlO1FBQ3RCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO1lBQzVDLEdBQUcsRUFBRTtnQkFDSCxPQUFPLEVBQUUsY0FBYztnQkFDdkIsTUFBTSxFQUFFLFdBQVc7YUFDcEI7U0FDRixDQUFDLENBQUM7UUFFSCxhQUFhO1FBQ2IsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUU7WUFDeEMsTUFBTSxFQUFFLENBQUM7WUFDVCxtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtpQkFDbEM7Z0JBQ0Q7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFNBQVM7b0JBQ2YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO2lCQUMvQzthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsd0JBQXdCO1FBQ3hCLE1BQU0sYUFBYSxHQUFHLElB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QUM7WUFFSCxRQUFRLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLEVBQUU7Z0JBQ2xELFlBQVksRUFBRSxDQUFDO2FBQ2hCLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBUZW1wbGF0ZSwgTWF0Y2ggfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xuaW1wb3J0ICogYXMgZWxidjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xuaW1wb3J0IHsgT3BlbkNsYXdGYXJnYXRlLCBPcGVuQ2xhd0ZhcmdhdGVQcm9wcyB9IGZyb20gJy4uLy4uL2xpYi9jb25zdHJ1Y3RzL2ZhcmdhdGUnO1xuXG5kZXNjcmliZSgnT3BlbkNsYXdGYXJnYXRlJywgKCkgPT4ge1xuICAvLyBIZWxwZXIgdG8gY3JlYXRlIGJhc2Ugc3RhY2sgcmVzb3VyY2VzXG4gIGZ1bmN0aW9uIGNyZWF0ZUJhc2VTdGFjaygpIHtcbiAgICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjayhhcHAsICdUZXN0U3RhY2snLCB7XG4gICAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIFZQQ1xuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHN0YWNrLCAnVGVzdFZwYycsIHtcbiAgICAgIG1heEF6czogMixcbiAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICBuYW1lOiAnUHVibGljJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ1ByaXZhdGUnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIHNlY3VyaXR5IGdyb3VwXG4gICAgY29uc3Qgc2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cChzdGFjaywgJ1Rlc3RTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjLFxuICAgICAgZGVzY3JpcHRpb246ICdUZXN0IHNlY3VyaXR5IGdyb3VwJyxcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYnVja2V0XG4gICAgY29uc3QgYnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzdGFjaywgJ1Rlc3RCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiAndGVzdC1vcGVuY2xhdy1idWNrZXQnLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIHNlY3JldHNcbiAgICBjb25zdCBnYXRld2F5VG9rZW5TZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHN0YWNrLCAnR2F0ZXdheVRva2VuU2VjcmV0Jywge1xuICAgICAgc2VjcmV0TmFtZTogJ29wZW5jbGF3L2dhdGV3YXktdG9rZW4nLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZXh0ZXJuYWxBcGlTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHN0YWNrLCAnRXh0ZXJuYWxBcGlTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiAnb3BlbmNsYXcvZXh0ZXJuYWwtYXBpcycsXG4gICAgICBzZWNyZXRTdHJpbmdWYWx1ZTogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dChcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIEFOVEhST1BJQ19BUElfS0VZOiAndGVzdC1hbnRocm9waWMta2V5JyxcbiAgICAgICAgICBPUEVOQUlfQVBJX0tFWTogJ3Rlc3Qtb3BlbmFpLWtleScsXG4gICAgICAgIH0pXG4gICAgICApLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIElBTSByb2xlc1xuICAgIGNvbnN0IHRhc2tFeGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHN0YWNrLCAnVGFza0V4ZWN1dGlvblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHN0YWNrLCAnVGFza1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBhcHAsXG4gICAgICBzdGFjayxcbiAgICAgIHZwYyxcbiAgICAgIHNlY3VyaXR5R3JvdXAsXG4gICAgICBidWNrZXQsXG4gICAgICBnYXRld2F5VG9rZW5TZWNyZXQsXG4gICAgICBleHRlcm5hbEFwaVNlY3JldCxcbiAgICAgIHRhc2tFeGVjdXRpb25Sb2xlLFxuICAgICAgdGFza1JvbGUsXG4gICAgfTtcbiAgfVxuXG4gIC8vIEhlbHBlciB0byBjcmVhdGUgRmFyZ2F0ZSBjb25zdHJ1Y3Qgd2l0aCBkZWZhdWx0IHByb3BzXG4gIGZ1bmN0aW9uIGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoXG4gICAgYmFzZVJlc291cmNlczogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlQmFzZVN0YWNrPixcbiAgICBwcm9wcz86IFBhcnRpYWw8T3BlbkNsYXdGYXJnYXRlUHJvcHM+XG4gICkge1xuICAgIGNvbnN0IHtcbiAgICAgIHN0YWNrLFxuICAgICAgdnBjLFxuICAgICAgc2VjdXJpdHlHcm91cCxcbiAgICAgIGJ1Y2tldCxcbiAgICAgIGdhdGV3YXlUb2tlblNlY3JldCxcbiAgICAgIGV4dGVybmFsQXBpU2VjcmV0LFxuICAgICAgdGFza0V4ZWN1dGlvblJvbGUsXG4gICAgICB0YXNrUm9sZSxcbiAgICB9ID0gYmFzZVJlc291cmNlcztcblxuICAgIGNvbnN0IGZhcmdhdGUgPSBuZXcgT3BlbkNsYXdGYXJnYXRlKHN0YWNrLCAnVGVzdEZhcmdhdGUnLCB7XG4gICAgICB2cGMsXG4gICAgICBzZWN1cml0eUdyb3VwLFxuICAgICAgYnVja2V0LFxuICAgICAgZ2F0ZXdheVRva2VuU2VjcmV0LFxuICAgICAgZXh0ZXJuYWxBcGlTZWNyZXQsXG4gICAgICB0YXNrRXhlY3V0aW9uUm9sZSxcbiAgICAgIHRhc2tSb2xlLFxuICAgICAgLi4ucHJvcHMsXG4gICAgfSk7XG5cbiAgICByZXR1cm4geyBmYXJnYXRlLCB0ZW1wbGF0ZTogVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKSB9O1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUYXNrIERlZmluaXRpb24gVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnVGFzayBEZWZpbml0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgdGFzayBkZWZpbml0aW9uIHdpdGggZGVmYXVsdCBDUFUgKDUxMikgYW5kIG1lbW9yeSAoMTAyNCknLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgQ3B1OiAnNTEyJyxcbiAgICAgICAgTWVtb3J5OiAnMTAyNCcsXG4gICAgICAgIE5ldHdvcmtNb2RlOiAnYXdzdnBjJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyB0YXNrIGRlZmluaXRpb24gd2l0aCBjdXN0b20gQ1BVIGFuZCBtZW1vcnknLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UsIHtcbiAgICAgICAgY3B1OiAxMDI0LFxuICAgICAgICBtZW1vcnlNaUI6IDIwNDgsXG4gICAgICB9KTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICAgIENwdTogJzEwMjQnLFxuICAgICAgICBNZW1vcnk6ICcyMDQ4JyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndXNlcyBBUk02NCBhcmNoaXRlY3R1cmUgd2hlbiB1c2VHcmF2aXRvbiBpcyB0cnVlJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlLCB7XG4gICAgICAgIHVzZUdyYXZpdG9uOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgICBSdW50aW1lUGxhdGZvcm06IHtcbiAgICAgICAgICBDcHVBcmNoaXRlY3R1cmU6ICdBUk02NCcsXG4gICAgICAgICAgT3BlcmF0aW5nU3lzdGVtRmFtaWx5OiAnTElOVVgnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd1c2VzIFg4Nl82NCBhcmNoaXRlY3R1cmUgd2hlbiB1c2VHcmF2aXRvbiBpcyBmYWxzZScsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSwge1xuICAgICAgICB1c2VHcmF2aXRvbjogZmFsc2UsXG4gICAgICB9KTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICAgIFJ1bnRpbWVQbGF0Zm9ybToge1xuICAgICAgICAgIENwdUFyY2hpdGVjdHVyZTogJ1g4Nl82NCcsXG4gICAgICAgICAgT3BlcmF0aW5nU3lzdGVtRmFtaWx5OiAnTElOVVgnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd1c2VzIHByb3ZpZGVkIHRhc2sgZXhlY3V0aW9uIHJvbGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgRXhlY3V0aW9uUm9sZUFybjoge1xuICAgICAgICAgICdGbjo6R2V0QXR0JzogW01hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ1Rhc2tFeGVjdXRpb25Sb2xlJyksICdBcm4nXSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndXNlcyBwcm92aWRlZCB0YXNrIHJvbGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgVGFza1JvbGVBcm46IHtcbiAgICAgICAgICAnRm46OkdldEF0dCc6IFtNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCdUYXNrUm9sZScpLCAnQXJuJ10sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDb250YWluZXIgRGVmaW5pdGlvbiBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdDb250YWluZXIgRGVmaW5pdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdjb250YWluZXIgaGFzIGNvcnJlY3QgZW52aXJvbm1lbnQgdmFyaWFibGVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICAgIENvbnRhaW5lckRlZmluaXRpb25zOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgRW52aXJvbm1lbnQ6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICAgIHsgTmFtZTogJ05PREVfRU5WJywgVmFsdWU6ICdwcm9kdWN0aW9uJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdQT1JUJywgVmFsdWU6ICczMDAwJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdMT0dfTEVWRUwnLCBWYWx1ZTogJ2luZm8nIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ0JFRFJPQ0tfTU9ERUxfSUQnLCBWYWx1ZTogJ2FudGhyb3BpYy5jbGF1ZGUtMy01LWhhaWt1LTIwMjQxMDIyLXYxOjAnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ0JFRFJPQ0tfUkVHSU9OJywgVmFsdWU6ICd1cy1lYXN0LTEnIH0sXG4gICAgICAgICAgICAgIHsgTmFtZTogJ1MzX0JVQ0tFVCcsIFZhbHVlOiB7IFJlZjogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnVGVzdEJ1Y2tldCcpIH0gfSxcbiAgICAgICAgICAgIF0pLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY29udGFpbmVyIGhhcyBjdXN0b20gQmVkcm9jayBjb25maWd1cmF0aW9uIHdoZW4gc3BlY2lmaWVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlLCB7XG4gICAgICAgIGJlZHJvY2tNb2RlbElkOiAnYW50aHJvcGljLmNsYXVkZS0zLW9wdXMtMjAyNDAyMjktdjE6MCcsXG4gICAgICAgIGJlZHJvY2tSZWdpb246ICd1cy13ZXN0LTInLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgICBDb250YWluZXJEZWZpbml0aW9uczogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgIEVudmlyb25tZW50OiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgICB7IE5hbWU6ICdCRURST0NLX01PREVMX0lEJywgVmFsdWU6ICdhbnRocm9waWMuY2xhdWRlLTMtb3B1cy0yMDI0MDIyOS12MTowJyB9LFxuICAgICAgICAgICAgICB7IE5hbWU6ICdCRURST0NLX1JFR0lPTicsIFZhbHVlOiAndXMtd2VzdC0yJyB9LFxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgfSksXG4gICAgICAgIF0pLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjb250YWluZXIgaGFzIHBvcnQgbWFwcGluZyBvbiBwb3J0IDMwMDAnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBQb3J0TWFwcGluZ3M6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIENvbnRhaW5lclBvcnQ6IDMwMDAsXG4gICAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NvbnRhaW5lciBoYXMgaGVhbHRoIGNoZWNrIGNvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBIZWFsdGhDaGVjazoge1xuICAgICAgICAgICAgICBDb21tYW5kOiBbJ0NNRC1TSEVMTCcsICdjdXJsIC1mIGh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9oZWFsdGggfHwgZXhpdCAxJ10sXG4gICAgICAgICAgICAgIEludGVydmFsOiAzMCxcbiAgICAgICAgICAgICAgVGltZW91dDogNSxcbiAgICAgICAgICAgICAgUmV0cmllczogMyxcbiAgICAgICAgICAgICAgU3RhcnRQZXJpb2Q6IDYwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NvbnRhaW5lciByZWZlcmVuY2VzIGdhdGV3YXkgdG9rZW4gc2VjcmV0JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICAgIENvbnRhaW5lckRlZmluaXRpb25zOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgU2VjcmV0czogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgICAgTmFtZTogJ0dBVEVXQVlfVE9LRU4nLFxuICAgICAgICAgICAgICAgIFZhbHVlRnJvbToge1xuICAgICAgICAgICAgICAgICAgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCdHYXRld2F5VG9rZW5TZWNyZXQnKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIF0pLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY29udGFpbmVyIHJlZmVyZW5jZXMgZXh0ZXJuYWwgQVBJIHNlY3JldHMgd2hlbiBwcm92aWRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSwge1xuICAgICAgICBleHRlcm5hbEFwaVNlY3JldDogYmFzZS5leHRlcm5hbEFwaVNlY3JldCxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBTZWNyZXRzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgICAgICBOYW1lOiAnQU5USFJPUElDX0FQSV9LRVknLFxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgICAgTmFtZTogJ09QRU5BSV9BUElfS0VZJyxcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBdKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBTZXJ2aWNlIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0ZhcmdhdGUgU2VydmljZScsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIEVDUyBzZXJ2aWNlJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6U2VydmljZScsIHtcbiAgICAgICAgU2VydmljZU5hbWU6ICdvcGVuY2xhdy1zZXJ2aWNlJyxcbiAgICAgICAgRGVzaXJlZENvdW50OiAxLFxuICAgICAgICBMYXVuY2hUeXBlOiAnRkFSR0FURScsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3NlcnZpY2UgaXMgaW4gcHJpdmF0ZSBzdWJuZXRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6U2VydmljZScsIHtcbiAgICAgICAgTmV0d29ya0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICBBd3N2cGNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBBc3NpZ25QdWJsaWNJcDogJ0RJU0FCTEVEJyxcbiAgICAgICAgICAgIFN1Ym5ldHM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgICAgIHsgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCdQcml2YXRlJykgfSxcbiAgICAgICAgICAgIF0pLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3NlcnZpY2UgZG9lcyBub3QgYXNzaWduIHB1YmxpYyBJUCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlNlcnZpY2UnLCB7XG4gICAgICAgIE5ldHdvcmtDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgQXdzdnBjQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgQXNzaWduUHVibGljSXA6ICdESVNBQkxFRCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2VydmljZSBoYXMgY2lyY3VpdCBicmVha2VyIGVuYWJsZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgICBEZXBsb3ltZW50Q29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIERlcGxveW1lbnRDaXJjdWl0QnJlYWtlcjoge1xuICAgICAgICAgICAgRW5hYmxlOiB0cnVlLFxuICAgICAgICAgICAgUm9sbGJhY2s6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2VydmljZSBoYXMgaGVhbHRoIGNoZWNrIGdyYWNlIHBlcmlvZCBvZiA2MCBzZWNvbmRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6U2VydmljZScsIHtcbiAgICAgICAgSGVhbHRoQ2hlY2tHcmFjZVBlcmlvZFNlY29uZHM6IDYwLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzZXJ2aWNlIHVzZXMgcHJvdmlkZWQgc2VjdXJpdHkgZ3JvdXAnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgICBOZXR3b3JrQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIEF3c3ZwY0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIFNlY3VyaXR5R3JvdXBzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAnRm46OkdldEF0dCc6IFtNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCdUZXN0U2VjdXJpdHlHcm91cCcpLCAnR3JvdXBJZCddLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ2x1c3RlciBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdFQ1MgQ2x1c3RlcicsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIGNsdXN0ZXIgd2hlbiBub3QgcHJvdmlkZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpDbHVzdGVyJywge1xuICAgICAgICBDbHVzdGVyTmFtZTogJ29wZW5jbGF3LWNsdXN0ZXInLFxuICAgICAgICBDbHVzdGVyU2V0dGluZ3M6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBOYW1lOiAnY29udGFpbmVySW5zaWdodHMnLFxuICAgICAgICAgICAgVmFsdWU6ICdlbmFibGVkJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd1c2VzIHByb3ZpZGVkIGNsdXN0ZXInLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBleGlzdGluZ0NsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIoYmFzZS5zdGFjaywgJ0V4aXN0aW5nQ2x1c3RlcicsIHtcbiAgICAgICAgdnBjOiBiYXNlLnZwYyxcbiAgICAgICAgY2x1c3Rlck5hbWU6ICdleGlzdGluZy1jbHVzdGVyJyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB7IGZhcmdhdGUsIHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UsIHtcbiAgICAgICAgY2x1c3RlcjogZXhpc3RpbmdDbHVzdGVyLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFNob3VsZCB1c2UgdGhlIGV4aXN0aW5nIGNsdXN0ZXIgKGNsdXN0ZXIgaXMgYSByZWZlcmVuY2Ugc28gd2UgY2hlY2sgaXQgZXhpc3RzKVxuICAgICAgZXhwZWN0KGZhcmdhdGUuY2x1c3RlcikudG9CZURlZmluZWQoKTtcbiAgICAgIC8vIFNob3VsZCBvbmx5IGhhdmUgb25lIGNsdXN0ZXIgKHRoZSBleGlzdGluZyBvbmUpXG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUNTOjpDbHVzdGVyJywgMSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdlbmFibGVzIGNvbnRhaW5lciBpbnNpZ2h0cycsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OkNsdXN0ZXInLCB7XG4gICAgICAgIENsdXN0ZXJTZXR0aW5nczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIE5hbWU6ICdjb250YWluZXJJbnNpZ2h0cycsXG4gICAgICAgICAgICBWYWx1ZTogJ2VuYWJsZWQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDbG91ZFdhdGNoIExvZ3MgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnQ2xvdWRXYXRjaCBMb2dnaW5nJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCB7XG4gICAgICAgIExvZ0dyb3VwTmFtZTogJy9lY3Mvb3BlbmNsYXcnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjb25maWd1cmVzIGF3c2xvZ3MgZHJpdmVyIHdpdGggY29ycmVjdCBwcmVmaXgnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IE1hdGNoLmFycmF5V2l0aChbXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBMb2dDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICAgIExvZ0RyaXZlcjogJ2F3c2xvZ3MnLFxuICAgICAgICAgICAgICBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgJ2F3c2xvZ3Mtc3RyZWFtLXByZWZpeCc6ICdvcGVuY2xhdycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndXNlcyBjb3JyZWN0IGxvZyByZXRlbnRpb24gcGVyaW9kJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlLCB7XG4gICAgICAgIGxvZ1JldGVudGlvbkRheXM6IDE0LFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIHtcbiAgICAgICAgUmV0ZW50aW9uSW5EYXlzOiAxNCxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEF1dG8tc2NhbGluZyBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdBdXRvLXNjYWxpbmcnLCAoKSA9PiB7XG4gICAgdGVzdCgnY29uZmlndXJlcyBhdXRvLXNjYWxpbmcgYnkgZGVmYXVsdCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsIHtcbiAgICAgICAgTWluQ2FwYWNpdHk6IDEsXG4gICAgICAgIE1heENhcGFjaXR5OiAzLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjb25maWd1cmVzIGF1dG8tc2NhbGluZyB3aXRoIGN1c3RvbSBtaW4vbWF4IGNhcGFjaXR5JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlLCB7XG4gICAgICAgIG1pbkNhcGFjaXR5OiAyLFxuICAgICAgICBtYXhDYXBhY2l0eTogNSxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLCB7XG4gICAgICAgIE1pbkNhcGFjaXR5OiAyLFxuICAgICAgICBNYXhDYXBhY2l0eTogNSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY29uZmlndXJlcyBDUFUtYmFzZWQgdGFyZ2V0IHRyYWNraW5nJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLCB7XG4gICAgICAgIFBvbGljeVR5cGU6ICdUYXJnZXRUcmFja2luZ1NjYWxpbmcnLFxuICAgICAgICBUYXJnZXRUcmFja2luZ1NjYWxpbmdQb2xpY3lDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgUHJlZGVmaW5lZE1ldHJpY1NwZWNpZmljYXRpb246IHtcbiAgICAgICAgICAgIFByZWRlZmluZWRNZXRyaWNUeXBlOiAnRUNTU2VydmljZUF2ZXJhZ2VDUFVVdGlsaXphdGlvbicsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBUYXJnZXRWYWx1ZTogNzAsXG4gICAgICAgICAgU2NhbGVJbkNvb2xkb3duOiAzMDAsXG4gICAgICAgICAgU2NhbGVPdXRDb29sZG93bjogNjAsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NhbiBkaXNhYmxlIGF1dG8tc2NhbGluZycsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSwge1xuICAgICAgICBlbmFibGVBdXRvU2NhbGluZzogZmFsc2UsXG4gICAgICB9KTtcblxuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxhYmxlVGFyZ2V0JywgMCk7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsIDApO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEFMQiBJbnRlZ3JhdGlvbiBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdBTEIgSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnYXR0YWNoZXMgdG8gdGFyZ2V0IGdyb3VwIHdoZW4gcHJvdmlkZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG5cbiAgICAgIGNvbnN0IHRhcmdldEdyb3VwID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAoYmFzZS5zdGFjaywgJ1RhcmdldEdyb3VwJywge1xuICAgICAgICB2cGM6IGJhc2UudnBjLFxuICAgICAgICBwb3J0OiAzMDAwLFxuICAgICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuICAgICAgICB0YXJnZXRUeXBlOiBlbGJ2Mi5UYXJnZXRUeXBlLklQLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSwge1xuICAgICAgICB0YXJnZXRHcm91cCxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgICBMb2FkQmFsYW5jZXJzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgQ29udGFpbmVyTmFtZTogJ29wZW5jbGF3JyxcbiAgICAgICAgICAgIENvbnRhaW5lclBvcnQ6IDMwMDAsXG4gICAgICAgICAgICBUYXJnZXRHcm91cEFybjogeyBSZWY6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ1RhcmdldEdyb3VwJykgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdkb2VzIG5vdCBhdHRhY2ggdG8gdGFyZ2V0IGdyb3VwIHdoZW4gbm90IHByb3ZpZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6U2VydmljZScsIHtcbiAgICAgICAgTG9hZEJhbGFuY2VyczogTWF0Y2guYWJzZW50KCksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBPdXRwdXQgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnT3V0cHV0cycsICgpID0+IHtcbiAgICB0ZXN0KCdleHBvcnRzIHNlcnZpY2UgbmFtZScsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSk7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGJhc2Uuc3RhY2spO1xuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGVyZSBpcyBhbiBvdXRwdXQgd2l0aCBTZXJ2aWNlIGluIHRoZSBuYW1lXG4gICAgICBjb25zdCBvdXRwdXRzID0gdGVtcGxhdGUuZmluZE91dHB1dHMoJyonKTtcbiAgICAgIGNvbnN0IHNlcnZpY2VPdXRwdXRzID0gT2JqZWN0LmVudHJpZXMob3V0cHV0cykuZmlsdGVyKChba2V5XSkgPT4gXG4gICAgICAgIGtleS5pbmNsdWRlcygnU2VydmljZScpICYmIGtleS5pbmNsdWRlcygnTmFtZScpXG4gICAgICApO1xuICAgICAgZXhwZWN0KHNlcnZpY2VPdXRwdXRzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3J0cyBjbHVzdGVyIG5hbWUnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhiYXNlLnN0YWNrKTtcbiAgICAgIC8vIENoZWNrIHRoYXQgdGhlcmUgaXMgYW4gb3V0cHV0IHdpdGggQ2x1c3RlciBpbiB0aGUgbmFtZVxuICAgICAgY29uc3Qgb3V0cHV0cyA9IHRlbXBsYXRlLmZpbmRPdXRwdXRzKCcqJyk7XG4gICAgICBjb25zdCBjbHVzdGVyT3V0cHV0cyA9IE9iamVjdC5lbnRyaWVzKG91dHB1dHMpLmZpbHRlcigoW2tleV0pID0+IFxuICAgICAgICBrZXkuaW5jbHVkZXMoJ0NsdXN0ZXInKSAmJiBrZXkuaW5jbHVkZXMoJ05hbWUnKVxuICAgICAgKTtcbiAgICAgIGV4cGVjdChjbHVzdGVyT3V0cHV0cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2V4cG9ydHMgdGFzayBkZWZpbml0aW9uIEFSTicsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSk7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGJhc2Uuc3RhY2spO1xuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGVyZSBpcyBhbiBvdXRwdXQgd2l0aCBUYXNrRGVmaW5pdGlvbiBpbiB0aGUgbmFtZVxuICAgICAgY29uc3Qgb3V0cHV0cyA9IHRlbXBsYXRlLmZpbmRPdXRwdXRzKCcqJyk7XG4gICAgICBjb25zdCB0YXNrRGVmT3V0cHV0cyA9IE9iamVjdC5lbnRyaWVzKG91dHB1dHMpLmZpbHRlcigoW2tleV0pID0+IFxuICAgICAgICBrZXkuaW5jbHVkZXMoJ1Rhc2tEZWZpbml0aW9uJylcbiAgICAgICk7XG4gICAgICBleHBlY3QodGFza0RlZk91dHB1dHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHVibGljIFByb3BlcnRpZXMgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnUHVibGljIFByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgdGVzdCgnZXhwb3NlcyBjbHVzdGVyIHByb3BlcnR5JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyBmYXJnYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICBleHBlY3QoZmFyZ2F0ZS5jbHVzdGVyKS50b0JlRGVmaW5lZCgpO1xuICAgICAgLy8gY2x1c3Rlck5hbWUgaXMgYSB0b2tlbiwgc28gd2UganVzdCB2ZXJpZnkgaXQncyBkZWZpbmVkXG4gICAgICBleHBlY3QoZmFyZ2F0ZS5jbHVzdGVyLmNsdXN0ZXJOYW1lKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3NlcyBzZXJ2aWNlIHByb3BlcnR5JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyBmYXJnYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICBleHBlY3QoZmFyZ2F0ZS5zZXJ2aWNlKS50b0JlRGVmaW5lZCgpO1xuICAgICAgLy8gc2VydmljZU5hbWUgaXMgYSB0b2tlbiwgc28gd2UganVzdCB2ZXJpZnkgaXQncyBkZWZpbmVkXG4gICAgICBleHBlY3QoZmFyZ2F0ZS5zZXJ2aWNlLnNlcnZpY2VOYW1lKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3NlcyB0YXNrIGRlZmluaXRpb24gcHJvcGVydHknLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IGZhcmdhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSk7XG5cbiAgICAgIGV4cGVjdChmYXJnYXRlLnRhc2tEZWZpbml0aW9uKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGZhcmdhdGUudGFza0RlZmluaXRpb24uZGVmYXVsdENvbnRhaW5lcikudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2V4cG9zZXMgY29udGFpbmVyIHByb3BlcnR5JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyBmYXJnYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICBleHBlY3QoZmFyZ2F0ZS5jb250YWluZXIpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoZmFyZ2F0ZS5jb250YWluZXIuY29udGFpbmVyTmFtZSkudG9CZSgnb3BlbmNsYXcnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2V4cG9zZXMgbG9nIGdyb3VwIHByb3BlcnR5JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyBmYXJnYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UpO1xuXG4gICAgICBleHBlY3QoZmFyZ2F0ZS5sb2dHcm91cCkudG9CZURlZmluZWQoKTtcbiAgICAgIC8vIGxvZ0dyb3VwTmFtZSBpcyBhIHRva2VuLCBzbyB3ZSBqdXN0IHZlcmlmeSBpdCdzIGRlZmluZWRcbiAgICAgIGV4cGVjdChmYXJnYXRlLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2V4cG9zZXMgYXV0byBzY2FsaW5nIHRhcmdldCB3aGVuIGVuYWJsZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB7IGZhcmdhdGUgfSA9IGNyZWF0ZUZhcmdhdGVDb25zdHJ1Y3QoYmFzZSwgeyBlbmFibGVBdXRvU2NhbGluZzogdHJ1ZSB9KTtcblxuICAgICAgZXhwZWN0KGZhcmdhdGUuYXV0b1NjYWxpbmdUYXJnZXQpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhdXRvIHNjYWxpbmcgdGFyZ2V0IGlzIHVuZGVmaW5lZCB3aGVuIGRpc2FibGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyBmYXJnYXRlIH0gPSBjcmVhdGVGYXJnYXRlQ29uc3RydWN0KGJhc2UsIHsgZW5hYmxlQXV0b1NjYWxpbmc6IGZhbHNlIH0pO1xuXG4gICAgICBleHBlY3QoZmFyZ2F0ZS5hdXRvU2NhbGluZ1RhcmdldCkudG9CZVVuZGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEludGVncmF0aW9uIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0ludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgY29tcGxldGUgRmFyZ2F0ZSBzZXR1cCB3aXRoIGFsbCBjb21wb25lbnRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlKTtcblxuICAgICAgLy8gVmVyaWZ5IGFsbCBtYWpvciByZXNvdXJjZXMgYXJlIGNyZWF0ZWRcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFQ1M6OkNsdXN0ZXInLCAxKTtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywgMSk7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywgMSk7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCAxKTtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsIDEpO1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLCAxKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3VzZXMgY29ycmVjdCBkZXNpcmVkIGNvdW50JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlRmFyZ2F0ZUNvbnN0cnVjdChiYXNlLCB7XG4gICAgICAgIGRlc2lyZWRDb3VudDogMixcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgICBEZXNpcmVkQ291bnQ6IDIsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==