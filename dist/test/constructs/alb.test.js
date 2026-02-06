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
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const alb_1 = require("../../lib/constructs/alb");
const fargate_1 = require("../../lib/constructs/fargate");
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
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
        // Create Fargate security group
        const fargateSecurityGroup = new ec2.SecurityGroup(stack, 'FargateSecurityGroup', {
            vpc,
            description: 'Security group for Fargate tasks',
            allowAllOutbound: true,
        });
        fargateSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from ALB');
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
    function createFargateService(baseResources) {
        const { stack, vpc, fargateSecurityGroup, bucket, gatewayTokenSecret, taskExecutionRole, taskRole } = baseResources;
        const fargate = new fargate_1.OpenClawFargate(stack, 'TestFargate', {
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
    function createAlbConstruct(baseResources, fargateService, props) {
        const { stack, vpc, albSecurityGroup } = baseResources;
        const alb = new alb_1.OpenClawAlb(stack, 'TestAlb', {
            vpc,
            securityGroup: albSecurityGroup,
            fargateService,
            ...props,
        });
        return { alb, template: assertions_1.Template.fromStack(stack) };
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
                Subnets: assertions_1.Match.arrayWith([
                    { Ref: assertions_1.Match.stringLikeRegexp('Public') },
                ]),
            });
        });
        test('security group is attached to ALB', () => {
            const base = createBaseStack();
            const fargate = createFargateService(base);
            const { template } = createAlbConstruct(base, fargate.service);
            template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
                SecurityGroups: assertions_1.Match.arrayWith([
                    { 'Fn::GetAtt': [assertions_1.Match.stringLikeRegexp('AlbSecurityGroup'), 'GroupId'] },
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
                TargetGroupAttributes: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        Key: 'stickiness.enabled',
                        Value: 'true',
                    }),
                    assertions_1.Match.objectLike({
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
                TargetGroupAttributes: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
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
                TargetGroupAttributes: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
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
                        TargetGroupArn: { Ref: assertions_1.Match.stringLikeRegexp('TargetGroup') },
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
                        TargetGroupArn: { Ref: assertions_1.Match.stringLikeRegexp('TargetGroup') },
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
                        TargetGroupArn: { Ref: assertions_1.Match.stringLikeRegexp('TargetGroup') },
                    },
                ],
            });
        });
        test('ECS service has health check grace period', () => {
            const base = createBaseStack();
            const fargate = createFargateService(base);
            createAlbConstruct(base, fargate.service);
            const template = assertions_1.Template.fromStack(base.stack);
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
            const template = assertions_1.Template.fromStack(base.stack);
            const outputs = template.findOutputs('*');
            const dnsOutputs = Object.entries(outputs).filter(([key]) => key.includes('AlbDnsName'));
            expect(dnsOutputs.length).toBeGreaterThan(0);
        });
        test('exports ALB URL', () => {
            const base = createBaseStack();
            const fargate = createFargateService(base);
            createAlbConstruct(base, fargate.service);
            const template = assertions_1.Template.fromStack(base.stack);
            const outputs = template.findOutputs('*');
            const urlOutputs = Object.entries(outputs).filter(([key]) => key.includes('AlbUrl'));
            expect(urlOutputs.length).toBeGreaterThan(0);
        });
        test('exports target group ARN', () => {
            const base = createBaseStack();
            const fargate = createFargateService(base);
            createAlbConstruct(base, fargate.service);
            const template = assertions_1.Template.fromStack(base.stack);
            const outputs = template.findOutputs('*');
            const tgOutputs = Object.entries(outputs).filter(([key]) => key.includes('TargetGroupArn'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxiLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L2NvbnN0cnVjdHMvYWxiLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBeUQ7QUFDekQseURBQTJDO0FBRTNDLHlEQUEyQztBQUMzQyx1REFBeUM7QUFDekMsK0VBQWlFO0FBQ2pFLGtEQUF5RTtBQUN6RSwwREFBK0Q7QUFFL0QsUUFBUSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDM0Isd0NBQXdDO0lBQ3hDLFNBQVMsZUFBZTtRQUN0QixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRTtZQUM1QyxHQUFHLEVBQUU7Z0JBQ0gsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLE1BQU0sRUFBRSxXQUFXO2FBQ3BCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsNkNBQTZDO1FBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFO1lBQ3hDLE1BQU0sRUFBRSxDQUFDO1lBQ1QsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07aUJBQ2xDO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxTQUFTO29CQUNmLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtpQkFDL0M7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEs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ay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCB7IE9wZW5DbGF3QWxiLCBPcGVuQ2xhd0FsYlByb3BzIH0gZnJvbSAnLi4vLi4vbGliL2NvbnN0cnVjdHMvYWxiJztcbmltcG9ydCB7IE9wZW5DbGF3RmFyZ2F0ZSB9IGZyb20gJy4uLy4uL2xpYi9jb25zdHJ1Y3RzL2ZhcmdhdGUnO1xuXG5kZXNjcmliZSgnT3BlbkNsYXdBbGInLCAoKSA9PiB7XG4gIC8vIEhlbHBlciB0byBjcmVhdGUgYmFzZSBzdGFjayByZXNvdXJjZXNcbiAgZnVuY3Rpb24gY3JlYXRlQmFzZVN0YWNrKCkge1xuICAgIGNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycsIHtcbiAgICAgIGVudjoge1xuICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgVlBDIHdpdGggcHVibGljIGFuZCBwcml2YXRlIHN1Ym5ldHNcbiAgICBjb25zdCB2cGMgPSBuZXcgZWMyLlZwYyhzdGFjaywgJ1Rlc3RWcGMnLCB7XG4gICAgICBtYXhBenM6IDIsXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ1B1YmxpYycsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdQcml2YXRlJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBBTEIgc2VjdXJpdHkgZ3JvdXBcbiAgICBjb25zdCBhbGJTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHN0YWNrLCAnQWxiU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEFMQicsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgIH0pO1xuICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXG4gICAgICBlYzIuUG9ydC50Y3AoODApLFxuICAgICAgJ0FsbG93IEhUVFAgdHJhZmZpYydcbiAgICApO1xuICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXG4gICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcbiAgICAgICdBbGxvdyBIVFRQUyB0cmFmZmljJ1xuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgRmFyZ2F0ZSBzZWN1cml0eSBncm91cFxuICAgIGNvbnN0IGZhcmdhdGVTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHN0YWNrLCAnRmFyZ2F0ZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBGYXJnYXRlIHRhc2tzJyxcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgfSk7XG4gICAgZmFyZ2F0ZVNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBhbGJTZWN1cml0eUdyb3VwLFxuICAgICAgZWMyLlBvcnQudGNwKDMwMDApLFxuICAgICAgJ0FsbG93IHRyYWZmaWMgZnJvbSBBTEInXG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBidWNrZXRcbiAgICBjb25zdCBidWNrZXQgPSBuZXcgczMuQnVja2V0KHN0YWNrLCAnVGVzdEJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6ICd0ZXN0LW9wZW5jbGF3LWJ1Y2tldCcsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgc2VjcmV0c1xuICAgIGNvbnN0IGdhdGV3YXlUb2tlblNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQoc3RhY2ssICdHYXRld2F5VG9rZW5TZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiAnb3BlbmNsYXcvZ2F0ZXdheS10b2tlbicsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgSUFNIHJvbGVzXG4gICAgY29uc3QgdGFza0V4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUoc3RhY2ssICdUYXNrRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdGFza1JvbGUgPSBuZXcgaWFtLlJvbGUoc3RhY2ssICdUYXNrUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFwcCxcbiAgICAgIHN0YWNrLFxuICAgICAgdnBjLFxuICAgICAgYWxiU2VjdXJpdHlHcm91cCxcbiAgICAgIGZhcmdhdGVTZWN1cml0eUdyb3VwLFxuICAgICAgYnVja2V0LFxuICAgICAgZ2F0ZXdheVRva2VuU2VjcmV0LFxuICAgICAgdGFza0V4ZWN1dGlvblJvbGUsXG4gICAgICB0YXNrUm9sZSxcbiAgICB9O1xuICB9XG5cbiAgLy8gSGVscGVyIHRvIGNyZWF0ZSBGYXJnYXRlIHNlcnZpY2VcbiAgZnVuY3Rpb24gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZVJlc291cmNlczogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlQmFzZVN0YWNrPikge1xuICAgIGNvbnN0IHsgc3RhY2ssIHZwYywgZmFyZ2F0ZVNlY3VyaXR5R3JvdXAsIGJ1Y2tldCwgZ2F0ZXdheVRva2VuU2VjcmV0LCB0YXNrRXhlY3V0aW9uUm9sZSwgdGFza1JvbGUgfSA9IGJhc2VSZXNvdXJjZXM7XG5cbiAgICBjb25zdCBmYXJnYXRlID0gbmV3IE9wZW5DbGF3RmFyZ2F0ZShzdGFjaywgJ1Rlc3RGYXJnYXRlJywge1xuICAgICAgdnBjLFxuICAgICAgc2VjdXJpdHlHcm91cDogZmFyZ2F0ZVNlY3VyaXR5R3JvdXAsXG4gICAgICBidWNrZXQsXG4gICAgICBnYXRld2F5VG9rZW5TZWNyZXQsXG4gICAgICB0YXNrRXhlY3V0aW9uUm9sZSxcbiAgICAgIHRhc2tSb2xlLFxuICAgICAgZW5hYmxlQXV0b1NjYWxpbmc6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZhcmdhdGU7XG4gIH1cblxuICAvLyBIZWxwZXIgdG8gY3JlYXRlIEFMQiBjb25zdHJ1Y3RcbiAgZnVuY3Rpb24gY3JlYXRlQWxiQ29uc3RydWN0KFxuICAgIGJhc2VSZXNvdXJjZXM6IFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZUJhc2VTdGFjaz4sXG4gICAgZmFyZ2F0ZVNlcnZpY2U6IGVjcy5GYXJnYXRlU2VydmljZSxcbiAgICBwcm9wcz86IFBhcnRpYWw8T3BlbkNsYXdBbGJQcm9wcz5cbiAgKSB7XG4gICAgY29uc3QgeyBzdGFjaywgdnBjLCBhbGJTZWN1cml0eUdyb3VwIH0gPSBiYXNlUmVzb3VyY2VzO1xuXG4gICAgY29uc3QgYWxiID0gbmV3IE9wZW5DbGF3QWxiKHN0YWNrLCAnVGVzdEFsYicsIHtcbiAgICAgIHZwYyxcbiAgICAgIHNlY3VyaXR5R3JvdXA6IGFsYlNlY3VyaXR5R3JvdXAsXG4gICAgICBmYXJnYXRlU2VydmljZSxcbiAgICAgIC4uLnByb3BzLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgYWxiLCB0ZW1wbGF0ZTogVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKSB9O1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBBTEIgQ29uZmlndXJhdGlvbiBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdBTEIgQ29uZmlndXJhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdBTEIgaXMgaW50ZXJuZXQtZmFjaW5nJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInLCB7XG4gICAgICAgIFNjaGVtZTogJ2ludGVybmV0LWZhY2luZycsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ0FMQiBpcyBpbiBwdWJsaWMgc3VibmV0cycsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJywge1xuICAgICAgICBTdWJuZXRzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIHsgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCdQdWJsaWMnKSB9LFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2VjdXJpdHkgZ3JvdXAgaXMgYXR0YWNoZWQgdG8gQUxCJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInLCB7XG4gICAgICAgIFNlY3VyaXR5R3JvdXBzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIHsgJ0ZuOjpHZXRBdHQnOiBbTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnQWxiU2VjdXJpdHlHcm91cCcpLCAnR3JvdXBJZCddIH0sXG4gICAgICAgIF0pLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdBTEIgaXMgb2YgdHlwZSBhcHBsaWNhdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJywge1xuICAgICAgICBUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVGFyZ2V0IEdyb3VwIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ1RhcmdldCBHcm91cCcsICgpID0+IHtcbiAgICB0ZXN0KCd0YXJnZXQgZ3JvdXAgaGFzIGNvcnJlY3QgcG9ydCBhbmQgcHJvdG9jb2wnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OlRhcmdldEdyb3VwJywge1xuICAgICAgICBQb3J0OiAzMDAwLFxuICAgICAgICBQcm90b2NvbDogJ0hUVFAnLFxuICAgICAgICBUYXJnZXRUeXBlOiAnaXAnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd0YXJnZXQgZ3JvdXAgaGFzIGNvcnJlY3QgaGVhbHRoIGNoZWNrIHNldHRpbmdzIHdpdGggZGVmYXVsdHMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OlRhcmdldEdyb3VwJywge1xuICAgICAgICBIZWFsdGhDaGVja1BhdGg6ICcvaGVhbHRoJyxcbiAgICAgICAgSGVhbHRoQ2hlY2tJbnRlcnZhbFNlY29uZHM6IDMwLFxuICAgICAgICBIZWFsdGhDaGVja1RpbWVvdXRTZWNvbmRzOiA1LFxuICAgICAgICBIZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICAgIFVuaGVhbHRoeVRocmVzaG9sZENvdW50OiAzLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd0YXJnZXQgZ3JvdXAgaGFzIGNvbmZpZ3VyYWJsZSBoZWFsdGggY2hlY2sgcGF0aCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UsIHtcbiAgICAgICAgaGVhbHRoQ2hlY2tQYXRoOiAnL2FwaS9oZWFsdGgnLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpUYXJnZXRHcm91cCcsIHtcbiAgICAgICAgSGVhbHRoQ2hlY2tQYXRoOiAnL2FwaS9oZWFsdGgnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd0YXJnZXQgZ3JvdXAgaGFzIGNvbmZpZ3VyYWJsZSBoZWFsdGggY2hlY2sgc2V0dGluZ3MnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlLCB7XG4gICAgICAgIGhlYWx0aENoZWNrSW50ZXJ2YWxTZWNvbmRzOiA2MCxcbiAgICAgICAgaGVhbHRoQ2hlY2tUaW1lb3V0U2Vjb25kczogMTAsXG4gICAgICAgIGhlYWx0aHlUaHJlc2hvbGRDb3VudDogMyxcbiAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IDUsXG4gICAgICB9KTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OlRhcmdldEdyb3VwJywge1xuICAgICAgICBIZWFsdGhDaGVja0ludGVydmFsU2Vjb25kczogNjAsXG4gICAgICAgIEhlYWx0aENoZWNrVGltZW91dFNlY29uZHM6IDEwLFxuICAgICAgICBIZWFsdGh5VGhyZXNob2xkQ291bnQ6IDMsXG4gICAgICAgIFVuaGVhbHRoeVRocmVzaG9sZENvdW50OiA1LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd0YXJnZXQgZ3JvdXAgaGFzIHN0aWNreSBzZXNzaW9ucyBlbmFibGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpUYXJnZXRHcm91cCcsIHtcbiAgICAgICAgVGFyZ2V0R3JvdXBBdHRyaWJ1dGVzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgS2V5OiAnc3RpY2tpbmVzcy5lbmFibGVkJyxcbiAgICAgICAgICAgIFZhbHVlOiAndHJ1ZScsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICBLZXk6ICdzdGlja2luZXNzLnR5cGUnLFxuICAgICAgICAgICAgVmFsdWU6ICdsYl9jb29raWUnLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndGFyZ2V0IGdyb3VwIGhhcyBjb3JyZWN0IGRlcmVnaXN0cmF0aW9uIGRlbGF5JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpUYXJnZXRHcm91cCcsIHtcbiAgICAgICAgVGFyZ2V0R3JvdXBBdHRyaWJ1dGVzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgS2V5OiAnZGVyZWdpc3RyYXRpb25fZGVsYXkudGltZW91dF9zZWNvbmRzJyxcbiAgICAgICAgICAgIFZhbHVlOiAnMzAnLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndGFyZ2V0IGdyb3VwIGhhcyBjb25maWd1cmFibGUgZGVyZWdpc3RyYXRpb24gZGVsYXknLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlLCB7XG4gICAgICAgIGRlcmVnaXN0cmF0aW9uRGVsYXlTZWNvbmRzOiA2MCxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6VGFyZ2V0R3JvdXAnLCB7XG4gICAgICAgIFRhcmdldEdyb3VwQXR0cmlidXRlczogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICBNYXRjaC5vYmplY3RMaWtlKHtcbiAgICAgICAgICAgIEtleTogJ2RlcmVnaXN0cmF0aW9uX2RlbGF5LnRpbWVvdXRfc2Vjb25kcycsXG4gICAgICAgICAgICBWYWx1ZTogJzYwJyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBIVFRQIExpc3RlbmVyIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0hUVFAgTGlzdGVuZXInLCAoKSA9PiB7XG4gICAgdGVzdCgnSFRUUCBsaXN0ZW5lciBpcyBjcmVhdGVkIG9uIHBvcnQgODAnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyJywge1xuICAgICAgICBQb3J0OiA4MCxcbiAgICAgICAgUHJvdG9jb2w6ICdIVFRQJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnSFRUUCBsaXN0ZW5lciBmb3J3YXJkcyB0byB0YXJnZXQgZ3JvdXAgd2hlbiBubyBjZXJ0aWZpY2F0ZScsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInLCB7XG4gICAgICAgIFBvcnQ6IDgwLFxuICAgICAgICBEZWZhdWx0QWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFR5cGU6ICdmb3J3YXJkJyxcbiAgICAgICAgICAgIFRhcmdldEdyb3VwQXJuOiB7IFJlZjogTWF0Y2guc3RyaW5nTGlrZVJlZ2V4cCgnVGFyZ2V0R3JvdXAnKSB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ0hUVFAgbGlzdGVuZXIgcmVkaXJlY3RzIHRvIEhUVFBTIHdoZW4gY2VydGlmaWNhdGUgcHJvdmlkZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlLCB7XG4gICAgICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czphY206dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjpjZXJ0aWZpY2F0ZS90ZXN0LWNlcnQtaWQnLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIHtcbiAgICAgICAgUG9ydDogODAsXG4gICAgICAgIERlZmF1bHRBY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgVHlwZTogJ3JlZGlyZWN0JyxcbiAgICAgICAgICAgIFJlZGlyZWN0Q29uZmlnOiB7XG4gICAgICAgICAgICAgIFByb3RvY29sOiAnSFRUUFMnLFxuICAgICAgICAgICAgICBQb3J0OiAnNDQzJyxcbiAgICAgICAgICAgICAgU3RhdHVzQ29kZTogJ0hUVFBfMzAxJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEhUVFBTIExpc3RlbmVyIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0hUVFBTIExpc3RlbmVyJywgKCkgPT4ge1xuICAgIHRlc3QoJ0hUVFBTIGxpc3RlbmVyIGlzIGNyZWF0ZWQgd2hlbiBjZXJ0aWZpY2F0ZSBBUk4gcHJvdmlkZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlLCB7XG4gICAgICAgIGNlcnRpZmljYXRlQXJuOiAnYXJuOmF3czphY206dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjpjZXJ0aWZpY2F0ZS90ZXN0LWNlcnQtaWQnLFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIHtcbiAgICAgICAgUG9ydDogNDQzLFxuICAgICAgICBQcm90b2NvbDogJ0hUVFBTJyxcbiAgICAgICAgQ2VydGlmaWNhdGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgQ2VydGlmaWNhdGVBcm46ICdhcm46YXdzOmFjbTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOmNlcnRpZmljYXRlL3Rlc3QtY2VydC1pZCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnSFRUUFMgbGlzdGVuZXIgZm9yd2FyZHMgdG8gdGFyZ2V0IGdyb3VwJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSwge1xuICAgICAgICBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6Y2VydGlmaWNhdGUvdGVzdC1jZXJ0LWlkJyxcbiAgICAgIH0pO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInLCB7XG4gICAgICAgIFBvcnQ6IDQ0MyxcbiAgICAgICAgRGVmYXVsdEFjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBUeXBlOiAnZm9yd2FyZCcsXG4gICAgICAgICAgICBUYXJnZXRHcm91cEFybjogeyBSZWY6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ1RhcmdldEdyb3VwJykgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdIVFRQUyBsaXN0ZW5lciBpcyBub3QgY3JlYXRlZCB3aGVuIG5vIGNlcnRpZmljYXRlIHByb3ZpZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIC8vIENvdW50IGxpc3RlbmVycyAtIHNob3VsZCBvbmx5IGhhdmUgMSAoSFRUUClcbiAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInKTtcbiAgICAgIGV4cGVjdChPYmplY3Qua2V5cyhsaXN0ZW5lcnMpLmxlbmd0aCkudG9CZSgxKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBGYXJnYXRlIEludGVncmF0aW9uIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0ZhcmdhdGUgSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnRmFyZ2F0ZSBzZXJ2aWNlIGlzIHJlZ2lzdGVyZWQgd2l0aCB0YXJnZXQgZ3JvdXAnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IHRlbXBsYXRlIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6U2VydmljZScsIHtcbiAgICAgICAgTG9hZEJhbGFuY2VyczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIENvbnRhaW5lck5hbWU6ICdvcGVuY2xhdycsXG4gICAgICAgICAgICBDb250YWluZXJQb3J0OiAzMDAwLFxuICAgICAgICAgICAgVGFyZ2V0R3JvdXBBcm46IHsgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCdUYXJnZXRHcm91cCcpIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnRUNTIHNlcnZpY2UgaGFzIGhlYWx0aCBjaGVjayBncmFjZSBwZXJpb2QnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKGJhc2Uuc3RhY2spO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgICBIZWFsdGhDaGVja0dyYWNlUGVyaW9kU2Vjb25kczogNjAsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQdWJsaWMgUHJvcGVydGllcyBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdQdWJsaWMgUHJvcGVydGllcycsICgpID0+IHtcbiAgICB0ZXN0KCdleHBvc2VzIGxvYWQgYmFsYW5jZXIgcHJvcGVydHknLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IGFsYiB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIGV4cGVjdChhbGIubG9hZEJhbGFuY2VyKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGFsYi5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyQXJuKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3NlcyBsaXN0ZW5lciBwcm9wZXJ0eScsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNvbnN0IHsgYWxiIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgZXhwZWN0KGFsYi5saXN0ZW5lcikudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2V4cG9zZXMgdGFyZ2V0IGdyb3VwIHByb3BlcnR5JywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyBhbGIgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UpO1xuXG4gICAgICBleHBlY3QoYWxiLnRhcmdldEdyb3VwKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGFsYi50YXJnZXRHcm91cC50YXJnZXRHcm91cEFybikudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2V4cG9zZXMgYWxiRG5zTmFtZSBwcm9wZXJ0eScsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNvbnN0IHsgYWxiIH0gPSBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgZXhwZWN0KGFsYi5hbGJEbnNOYW1lKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3NlcyBhbGJVcmwgcHJvcGVydHkgd2l0aCBodHRwOi8vIHdoZW4gbm8gY2VydGlmaWNhdGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IGFsYiB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIGV4cGVjdChhbGIuYWxiVXJsKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGFsYi5hbGJVcmwuc3RhcnRzV2l0aCgnaHR0cDovLycpKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3NlcyBhbGJVcmwgcHJvcGVydHkgd2l0aCBodHRwczovLyB3aGVuIGNlcnRpZmljYXRlIHByb3ZpZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyBhbGIgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UsIHtcbiAgICAgICAgY2VydGlmaWNhdGVBcm46ICdhcm46YXdzOmFjbTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOmNlcnRpZmljYXRlL3Rlc3QtY2VydC1pZCcsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KGFsYi5hbGJVcmwpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYWxiLmFsYlVybC5zdGFydHNXaXRoKCdodHRwczovLycpKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3NlcyBodHRwc0xpc3RlbmVyIHdoZW4gY2VydGlmaWNhdGUgcHJvdmlkZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjb25zdCB7IGFsYiB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSwge1xuICAgICAgICBjZXJ0aWZpY2F0ZUFybjogJ2Fybjphd3M6YWNtOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6Y2VydGlmaWNhdGUvdGVzdC1jZXJ0LWlkJyxcbiAgICAgIH0pO1xuXG4gICAgICBleHBlY3QoYWxiLmh0dHBzTGlzdGVuZXIpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdodHRwc0xpc3RlbmVyIGlzIHVuZGVmaW5lZCB3aGVuIG5vIGNlcnRpZmljYXRlIHByb3ZpZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyBhbGIgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UpO1xuXG4gICAgICBleHBlY3QoYWxiLmh0dHBzTGlzdGVuZXIpLnRvQmVVbmRlZmluZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBPdXRwdXQgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnT3V0cHV0cycsICgpID0+IHtcbiAgICB0ZXN0KCdleHBvcnRzIEFMQiBETlMgbmFtZScsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UpO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhiYXNlLnN0YWNrKTtcbiAgICAgIGNvbnN0IG91dHB1dHMgPSB0ZW1wbGF0ZS5maW5kT3V0cHV0cygnKicpO1xuICAgICAgY29uc3QgZG5zT3V0cHV0cyA9IE9iamVjdC5lbnRyaWVzKG91dHB1dHMpLmZpbHRlcigoW2tleV0pID0+XG4gICAgICAgIGtleS5pbmNsdWRlcygnQWxiRG5zTmFtZScpXG4gICAgICApO1xuICAgICAgZXhwZWN0KGRuc091dHB1dHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdleHBvcnRzIEFMQiBVUkwnLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soYmFzZS5zdGFjayk7XG4gICAgICBjb25zdCBvdXRwdXRzID0gdGVtcGxhdGUuZmluZE91dHB1dHMoJyonKTtcbiAgICAgIGNvbnN0IHVybE91dHB1dHMgPSBPYmplY3QuZW50cmllcyhvdXRwdXRzKS5maWx0ZXIoKFtrZXldKSA9PlxuICAgICAgICBrZXkuaW5jbHVkZXMoJ0FsYlVybCcpXG4gICAgICApO1xuICAgICAgZXhwZWN0KHVybE91dHB1dHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdleHBvcnRzIHRhcmdldCBncm91cCBBUk4nLCAoKSA9PiB7XG4gICAgICBjb25zdCBiYXNlID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCBmYXJnYXRlID0gY3JlYXRlRmFyZ2F0ZVNlcnZpY2UoYmFzZSk7XG4gICAgICBjcmVhdGVBbGJDb25zdHJ1Y3QoYmFzZSwgZmFyZ2F0ZS5zZXJ2aWNlKTtcblxuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soYmFzZS5zdGFjayk7XG4gICAgICBjb25zdCBvdXRwdXRzID0gdGVtcGxhdGUuZmluZE91dHB1dHMoJyonKTtcbiAgICAgIGNvbnN0IHRnT3V0cHV0cyA9IE9iamVjdC5lbnRyaWVzKG91dHB1dHMpLmZpbHRlcigoW2tleV0pID0+XG4gICAgICAgIGtleS5pbmNsdWRlcygnVGFyZ2V0R3JvdXBBcm4nKVxuICAgICAgKTtcbiAgICAgIGV4cGVjdCh0Z091dHB1dHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ29tcGxldGUgSW50ZWdyYXRpb24gVGVzdFxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdDb21wbGV0ZSBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIGNvbXBsZXRlIEFMQiBzZXR1cCB3aXRoIGFsbCBjb21wb25lbnRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmFzZSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgZmFyZ2F0ZSA9IGNyZWF0ZUZhcmdhdGVTZXJ2aWNlKGJhc2UpO1xuICAgICAgY29uc3QgeyB0ZW1wbGF0ZSB9ID0gY3JlYXRlQWxiQ29uc3RydWN0KGJhc2UsIGZhcmdhdGUuc2VydmljZSk7XG5cbiAgICAgIC8vIFZlcmlmeSBhbGwgbWFqb3IgcmVzb3VyY2VzIGFyZSBjcmVhdGVkXG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJywgMSk7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6VGFyZ2V0R3JvdXAnLCAxKTtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyBjb21wbGV0ZSBBTEIgc2V0dXAgd2l0aCBIVFRQUycsICgpID0+IHtcbiAgICAgIGNvbnN0IGJhc2UgPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IGZhcmdhdGUgPSBjcmVhdGVGYXJnYXRlU2VydmljZShiYXNlKTtcbiAgICAgIGNvbnN0IHsgdGVtcGxhdGUgfSA9IGNyZWF0ZUFsYkNvbnN0cnVjdChiYXNlLCBmYXJnYXRlLnNlcnZpY2UsIHtcbiAgICAgICAgY2VydGlmaWNhdGVBcm46ICdhcm46YXdzOmFjbTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOmNlcnRpZmljYXRlL3Rlc3QtY2VydC1pZCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gVmVyaWZ5IGFsbCBtYWpvciByZXNvdXJjZXMgYXJlIGNyZWF0ZWRcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInLCAxKTtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpUYXJnZXRHcm91cCcsIDEpO1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyJywgMik7IC8vIEhUVFAgKyBIVFRQU1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19