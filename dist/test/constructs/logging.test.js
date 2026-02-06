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
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const logging_1 = require("../../lib/constructs/logging");
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
    function createVpc(stack) {
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
    function createSecurityGroup(stack, vpc) {
        return new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
            vpc,
            description: 'Test security group',
            allowAllOutbound: true,
        });
    }
    function createAlb(stack, vpc, securityGroup) {
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
            new logging_1.OpenClawLogging(stack, 'TestLogging');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::Logs::LogGroup', {
                LogGroupName: '/ecs/openclaw',
                RetentionInDays: 7,
            });
        });
        test('creates log group with default 7 day retention', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::Logs::LogGroup', {
                RetentionInDays: 7,
            });
        });
        test('creates log group with custom retention (1 day)', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                logRetention: logs.RetentionDays.ONE_DAY,
            });
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::Logs::LogGroup', {
                RetentionInDays: 1,
            });
        });
        test('creates log group with custom retention (14 days)', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                logRetention: logs.RetentionDays.TWO_WEEKS,
            });
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::Logs::LogGroup', {
                RetentionInDays: 14,
            });
        });
        test('creates log group with custom retention (90 days)', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                logRetention: logs.RetentionDays.THREE_MONTHS,
            });
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::Logs::LogGroup', {
                RetentionInDays: 90,
            });
        });
        test('uses custom log group name when provided', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                logGroupName: '/custom/log/group',
            });
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::Logs::LogGroup', {
                LogGroupName: '/custom/log/group',
            });
        });
        test('sets removal policy to destroy', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging');
            const template = assertions_1.Template.fromStack(stack);
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
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                alb,
            });
            const template = assertions_1.Template.fromStack(stack);
            // Find the ALB log bucket by its unique bucket name pattern
            const resources = template.toJSON().Resources;
            const albLogBucket = Object.values(resources || {}).find((r) => r.Type === 'AWS::S3::Bucket' &&
                r.Properties?.BucketName?.startsWith('openclaw-alb-logs-'));
            expect(albLogBucket).toBeDefined();
            expect(albLogBucket.Properties.BucketName).toMatch(/openclaw-alb-logs-\d+-us-east-1/);
            expect(albLogBucket.Properties.LifecycleConfiguration).toBeDefined();
        });
        test('blocks public access on ALB log bucket', () => {
            const { stack } = createBaseStack();
            const vpc = createVpc(stack);
            const securityGroup = createSecurityGroup(stack, vpc);
            const alb = createAlb(stack, vpc, securityGroup);
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                alb,
            });
            const template = assertions_1.Template.fromStack(stack);
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
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                alb,
            });
            const template = assertions_1.Template.fromStack(stack);
            template.hasResource('AWS::S3::Bucket', {
                DeletionPolicy: 'Retain',
            });
        });
        test('does not create S3 bucket when ALB is not provided', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging');
            const template = assertions_1.Template.fromStack(stack);
            template.resourceCountIs('AWS::S3::Bucket', 0);
        });
        test('exposes logGroup property', () => {
            const { stack } = createBaseStack();
            const logging = new logging_1.OpenClawLogging(stack, 'TestLogging');
            expect(logging.logGroup).toBeDefined();
            expect(logging.logGroup.logGroupName).toBeDefined();
        });
        test('exposes albLogBucket property when ALB is provided', () => {
            const { stack } = createBaseStack();
            const vpc = createVpc(stack);
            const securityGroup = createSecurityGroup(stack, vpc);
            const alb = createAlb(stack, vpc, securityGroup);
            const logging = new logging_1.OpenClawLogging(stack, 'TestLogging', {
                alb,
            });
            expect(logging.albLogBucket).toBeDefined();
            expect(logging.albLogBucket?.bucketName).toBeDefined();
        });
        test('albLogBucket is undefined when ALB is not provided', () => {
            const { stack } = createBaseStack();
            const logging = new logging_1.OpenClawLogging(stack, 'TestLogging');
            expect(logging.albLogBucket).toBeUndefined();
        });
    });
    // ============================================================================
    // Output Tests
    // ============================================================================
    describe('Outputs', () => {
        test('exports log group name', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging');
            const template = assertions_1.Template.fromStack(stack);
            // Check that output with correct description exists
            const outputs = template.toJSON().Outputs;
            const logGroupOutput = Object.values(outputs || {}).find((o) => o.Description === 'CloudWatch Log Group Name for OpenClaw ECS tasks');
            expect(logGroupOutput).toBeDefined();
        });
        test('exports ALB log bucket name when ALB is provided', () => {
            const { stack } = createBaseStack();
            const vpc = createVpc(stack);
            const securityGroup = createSecurityGroup(stack, vpc);
            const alb = createAlb(stack, vpc, securityGroup);
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                alb,
            });
            const template = assertions_1.Template.fromStack(stack);
            // Check that outputs with correct descriptions exist
            const outputs = template.toJSON().Outputs;
            const albLogBucketNameOutput = Object.values(outputs || {}).find((o) => o.Description === 'S3 Bucket Name for ALB Access Logs');
            const albLogBucketArnOutput = Object.values(outputs || {}).find((o) => o.Description === 'S3 Bucket ARN for ALB Access Logs');
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
            new logging_1.OpenClawLogging(stack, 'TestLogging', {
                alb,
                logRetention: logs.RetentionDays.ONE_MONTH,
            });
            const template = assertions_1.Template.fromStack(stack);
            // Verify all resources are created
            template.resourceCountIs('AWS::Logs::LogGroup', 1);
            template.resourceCountIs('AWS::S3::Bucket', 1);
        });
        test('creates minimal logging setup without ALB', () => {
            const { stack } = createBaseStack();
            new logging_1.OpenClawLogging(stack, 'TestLogging');
            const template = assertions_1.Template.fromStack(stack);
            // Only log group should be created
            template.resourceCountIs('AWS::Logs::LogGroup', 1);
            template.resourceCountIs('AWS::S3::Bucket', 0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9jb25zdHJ1Y3RzL2xvZ2dpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCx5REFBMkM7QUFDM0MsMkRBQTZDO0FBQzdDLDhFQUFnRTtBQUNoRSwwREFBaUY7QUFFakYsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUMvQixTQUFTLGVBQWU7UUFDdEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUU7WUFDNUMsR0FBRyxFQUFFO2dCQUNILE9BQU8sRUFBRSxjQUFjO2dCQUN2QixNQUFNLEVBQUUsV0FBVzthQUNwQjtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLEtBQWdCO1FBQ2pDLE9BQU8sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUU7WUFDbkMsTUFBTSxFQUFFLENBQUM7WUFDVCxtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtpQkFDbEM7Z0JBQ0Q7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFNBQVM7b0JBQ2YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO2lCQUMvQzthQUNGO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENB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QWEsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTNDLG1DQUFtQztZQUNuQyxRQUFRLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25ELFFBQVEsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlLCBNYXRjaCB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgeyBPcGVuQ2xhd0xvZ2dpbmcsIExvZ1JldGVudGlvbkRheXMgfSBmcm9tICcuLi8uLi9saWIvY29uc3RydWN0cy9sb2dnaW5nJztcblxuZGVzY3JpYmUoJ09wZW5DbGF3TG9nZ2luZycsICgpID0+IHtcbiAgZnVuY3Rpb24gY3JlYXRlQmFzZVN0YWNrKCkge1xuICAgIGNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycsIHtcbiAgICAgIGVudjoge1xuICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4geyBhcHAsIHN0YWNrIH07XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVWcGMoc3RhY2s6IGNkay5TdGFjaykge1xuICAgIHJldHVybiBuZXcgZWMyLlZwYyhzdGFjaywgJ1Rlc3RWcGMnLCB7XG4gICAgICBtYXhBenM6IDIsXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ1B1YmxpYycsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdQcml2YXRlJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNlY3VyaXR5R3JvdXAoc3RhY2s6IGNkay5TdGFjaywgdnBjOiBlYzIuSVZwYykge1xuICAgIHJldHVybiBuZXcgZWMyLlNlY3VyaXR5R3JvdXAoc3RhY2ssICdUZXN0U2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGVzdCBzZWN1cml0eSBncm91cCcsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlQWxiKHN0YWNrOiBjZGsuU3RhY2ssIHZwYzogZWMyLklWcGMsIHNlY3VyaXR5R3JvdXA6IGVjMi5JU2VjdXJpdHlHcm91cCkge1xuICAgIHJldHVybiBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIoc3RhY2ssICdUZXN0QWxiJywge1xuICAgICAgdnBjLFxuICAgICAgaW50ZXJuZXRGYWNpbmc6IHRydWUsXG4gICAgICBzZWN1cml0eUdyb3VwLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBMb2cgR3JvdXAgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnTG9nIEdyb3VwJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAnLCAoKSA9PiB7XG4gICAgICBjb25zdCB7IHN0YWNrIH0gPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIFxuICAgICAgbmV3IE9wZW5DbGF3TG9nZ2luZyhzdGFjaywgJ1Rlc3RMb2dnaW5nJyk7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywge1xuICAgICAgICBMb2dHcm91cE5hbWU6ICcvZWNzL29wZW5jbGF3JyxcbiAgICAgICAgUmV0ZW50aW9uSW5EYXlzOiA3LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIGxvZyBncm91cCB3aXRoIGRlZmF1bHQgNyBkYXkgcmV0ZW50aW9uJywgKCkgPT4ge1xuICAgICAgY29uc3QgeyBzdGFjayB9ID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBcbiAgICAgIG5ldyBPcGVuQ2xhd0xvZ2dpbmcoc3RhY2ssICdUZXN0TG9nZ2luZycpO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIHtcbiAgICAgICAgUmV0ZW50aW9uSW5EYXlzOiA3LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIGxvZyBncm91cCB3aXRoIGN1c3RvbSByZXRlbnRpb24gKDEgZGF5KScsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhY2sgfSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgXG4gICAgICBuZXcgT3BlbkNsYXdMb2dnaW5nKHN0YWNrLCAnVGVzdExvZ2dpbmcnLCB7XG4gICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVksXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCB7XG4gICAgICAgIFJldGVudGlvbkluRGF5czogMSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyBsb2cgZ3JvdXAgd2l0aCBjdXN0b20gcmV0ZW50aW9uICgxNCBkYXlzKScsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhY2sgfSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgXG4gICAgICBuZXcgT3BlbkNsYXdMb2dnaW5nKHN0YWNrLCAnVGVzdExvZ2dpbmcnLCB7XG4gICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIHtcbiAgICAgICAgUmV0ZW50aW9uSW5EYXlzOiAxNCxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyBsb2cgZ3JvdXAgd2l0aCBjdXN0b20gcmV0ZW50aW9uICg5MCBkYXlzKScsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhY2sgfSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgXG4gICAgICBuZXcgT3BlbkNsYXdMb2dnaW5nKHN0YWNrLCAnVGVzdExvZ2dpbmcnLCB7XG4gICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRIUkVFX01PTlRIUyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIHtcbiAgICAgICAgUmV0ZW50aW9uSW5EYXlzOiA5MCxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndXNlcyBjdXN0b20gbG9nIGdyb3VwIG5hbWUgd2hlbiBwcm92aWRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhY2sgfSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgXG4gICAgICBuZXcgT3BlbkNsYXdMb2dnaW5nKHN0YWNrLCAnVGVzdExvZ2dpbmcnLCB7XG4gICAgICAgIGxvZ0dyb3VwTmFtZTogJy9jdXN0b20vbG9nL2dyb3VwJyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIHtcbiAgICAgICAgTG9nR3JvdXBOYW1lOiAnL2N1c3RvbS9sb2cvZ3JvdXAnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzZXRzIHJlbW92YWwgcG9saWN5IHRvIGRlc3Ryb3knLCAoKSA9PiB7XG4gICAgICBjb25zdCB7IHN0YWNrIH0gPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIFxuICAgICAgbmV3IE9wZW5DbGF3TG9nZ2luZyhzdGFjaywgJ1Rlc3RMb2dnaW5nJyk7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2UoJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCB7XG4gICAgICAgIERlbGV0aW9uUG9saWN5OiAnRGVsZXRlJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEFMQiBBY2Nlc3MgTG9nZ2luZyBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdBTEIgQWNjZXNzIExvZ2dpbmcnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBTMyBidWNrZXQgZm9yIEFMQiBhY2Nlc3MgbG9ncyB3aGVuIEFMQiBpcyBwcm92aWRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhY2sgfSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgdnBjID0gY3JlYXRlVnBjKHN0YWNrKTtcbiAgICAgIGNvbnN0IHNlY3VyaXR5R3JvdXAgPSBjcmVhdGVTZWN1cml0eUdyb3VwKHN0YWNrLCB2cGMpO1xuICAgICAgY29uc3QgYWxiID0gY3JlYXRlQWxiKHN0YWNrLCB2cGMsIHNlY3VyaXR5R3JvdXApO1xuXG4gICAgICBuZXcgT3BlbkNsYXdMb2dnaW5nKHN0YWNrLCAnVGVzdExvZ2dpbmcnLCB7XG4gICAgICAgIGFsYixcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIEFMQiBsb2cgYnVja2V0IGJ5IGl0cyB1bmlxdWUgYnVja2V0IG5hbWUgcGF0dGVyblxuICAgICAgY29uc3QgcmVzb3VyY2VzID0gdGVtcGxhdGUudG9KU09OKCkuUmVzb3VyY2VzIGFzIFJlY29yZDxzdHJpbmcsIGFueT47XG4gICAgICBjb25zdCBhbGJMb2dCdWNrZXQgPSBPYmplY3QudmFsdWVzKHJlc291cmNlcyB8fCB7fSkuZmluZChcbiAgICAgICAgKHI6IGFueSkgPT4gci5UeXBlID09PSAnQVdTOjpTMzo6QnVja2V0JyAmJiBcbiAgICAgICAgICAgICAgICAgICAgci5Qcm9wZXJ0aWVzPy5CdWNrZXROYW1lPy5zdGFydHNXaXRoKCdvcGVuY2xhdy1hbGItbG9ncy0nKVxuICAgICAgKSBhcyBhbnk7XG4gICAgICBcbiAgICAgIGV4cGVjdChhbGJMb2dCdWNrZXQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYWxiTG9nQnVja2V0LlByb3BlcnRpZXMuQnVja2V0TmFtZSkudG9NYXRjaCgvb3BlbmNsYXctYWxiLWxvZ3MtXFxkKy11cy1lYXN0LTEvKTtcbiAgICAgIGV4cGVjdChhbGJMb2dCdWNrZXQuUHJvcGVydGllcy5MaWZlY3ljbGVDb25maWd1cmF0aW9uKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnYmxvY2tzIHB1YmxpYyBhY2Nlc3Mgb24gQUxCIGxvZyBidWNrZXQnLCAoKSA9PiB7XG4gICAgICBjb25zdCB7IHN0YWNrIH0gPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHZwYyA9IGNyZWF0ZVZwYyhzdGFjayk7XG4gICAgICBjb25zdCBzZWN1cml0eUdyb3VwID0gY3JlYXRlU2VjdXJpdHlHcm91cChzdGFjaywgdnBjKTtcbiAgICAgIGNvbnN0IGFsYiA9IGNyZWF0ZUFsYihzdGFjaywgdnBjLCBzZWN1cml0eUdyb3VwKTtcblxuICAgICAgbmV3IE9wZW5DbGF3TG9nZ2luZyhzdGFjaywgJ1Rlc3RMb2dnaW5nJywge1xuICAgICAgICBhbGIsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6UzM6OkJ1Y2tldCcsIHtcbiAgICAgICAgUHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgQmxvY2tQdWJsaWNBY2xzOiB0cnVlLFxuICAgICAgICAgIEJsb2NrUHVibGljUG9saWN5OiB0cnVlLFxuICAgICAgICAgIElnbm9yZVB1YmxpY0FjbHM6IHRydWUsXG4gICAgICAgICAgUmVzdHJpY3RQdWJsaWNCdWNrZXRzOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzZXRzIEFMQiBsb2cgYnVja2V0IHJldGVudGlvbiB0byByZXRhaW4nLCAoKSA9PiB7XG4gICAgICBjb25zdCB7IHN0YWNrIH0gPSBjcmVhdGVCYXNlU3RhY2soKTtcbiAgICAgIGNvbnN0IHZwYyA9IGNyZWF0ZVZwYyhzdGFjayk7XG4gICAgICBjb25zdCBzZWN1cml0eUdyb3VwID0gY3JlYXRlU2VjdXJpdHlHcm91cChzdGFjaywgdnBjKTtcbiAgICAgIGNvbnN0IGFsYiA9IGNyZWF0ZUFsYihzdGFjaywgdnBjLCBzZWN1cml0eUdyb3VwKTtcblxuICAgICAgbmV3IE9wZW5DbGF3TG9nZ2luZyhzdGFjaywgJ1Rlc3RMb2dnaW5nJywge1xuICAgICAgICBhbGIsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZSgnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgICBEZWxldGlvblBvbGljeTogJ1JldGFpbicsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2RvZXMgbm90IGNyZWF0ZSBTMyBidWNrZXQgd2hlbiBBTEIgaXMgbm90IHByb3ZpZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgeyBzdGFjayB9ID0gY3JlYXRlQmFzZVN0YWNrKCk7XG5cbiAgICAgIG5ldyBPcGVuQ2xhd0xvZ2dpbmcoc3RhY2ssICdUZXN0TG9nZ2luZycpO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpTMzo6QnVja2V0JywgMCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdleHBvc2VzIGxvZ0dyb3VwIHByb3BlcnR5JywgKCkgPT4ge1xuICAgICAgY29uc3QgeyBzdGFjayB9ID0gY3JlYXRlQmFzZVN0YWNrKCk7XG5cbiAgICAgIGNvbnN0IGxvZ2dpbmcgPSBuZXcgT3BlbkNsYXdMb2dnaW5nKHN0YWNrLCAnVGVzdExvZ2dpbmcnKTtcblxuICAgICAgZXhwZWN0KGxvZ2dpbmcubG9nR3JvdXApLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QobG9nZ2luZy5sb2dHcm91cC5sb2dHcm91cE5hbWUpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdleHBvc2VzIGFsYkxvZ0J1Y2tldCBwcm9wZXJ0eSB3aGVuIEFMQiBpcyBwcm92aWRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhY2sgfSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgdnBjID0gY3JlYXRlVnBjKHN0YWNrKTtcbiAgICAgIGNvbnN0IHNlY3VyaXR5R3JvdXAgPSBjcmVhdGVTZWN1cml0eUdyb3VwKHN0YWNrLCB2cGMpO1xuICAgICAgY29uc3QgYWxiID0gY3JlYXRlQWxiKHN0YWNrLCB2cGMsIHNlY3VyaXR5R3JvdXApO1xuXG4gICAgICBjb25zdCBsb2dnaW5nID0gbmV3IE9wZW5DbGF3TG9nZ2luZyhzdGFjaywgJ1Rlc3RMb2dnaW5nJywge1xuICAgICAgICBhbGIsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KGxvZ2dpbmcuYWxiTG9nQnVja2V0KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGxvZ2dpbmcuYWxiTG9nQnVja2V0Py5idWNrZXROYW1lKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnYWxiTG9nQnVja2V0IGlzIHVuZGVmaW5lZCB3aGVuIEFMQiBpcyBub3QgcHJvdmlkZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCB7IHN0YWNrIH0gPSBjcmVhdGVCYXNlU3RhY2soKTtcblxuICAgICAgY29uc3QgbG9nZ2luZyA9IG5ldyBPcGVuQ2xhd0xvZ2dpbmcoc3RhY2ssICdUZXN0TG9nZ2luZycpO1xuXG4gICAgICBleHBlY3QobG9nZ2luZy5hbGJMb2dCdWNrZXQpLnRvQmVVbmRlZmluZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBPdXRwdXQgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnT3V0cHV0cycsICgpID0+IHtcbiAgICB0ZXN0KCdleHBvcnRzIGxvZyBncm91cCBuYW1lJywgKCkgPT4ge1xuICAgICAgY29uc3QgeyBzdGFjayB9ID0gY3JlYXRlQmFzZVN0YWNrKCk7XG5cbiAgICAgIG5ldyBPcGVuQ2xhd0xvZ2dpbmcoc3RhY2ssICdUZXN0TG9nZ2luZycpO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIC8vIENoZWNrIHRoYXQgb3V0cHV0IHdpdGggY29ycmVjdCBkZXNjcmlwdGlvbiBleGlzdHNcbiAgICAgIGNvbnN0IG91dHB1dHMgPSB0ZW1wbGF0ZS50b0pTT04oKS5PdXRwdXRzO1xuICAgICAgY29uc3QgbG9nR3JvdXBPdXRwdXQgPSBPYmplY3QudmFsdWVzKG91dHB1dHMgfHwge30pLmZpbmQoXG4gICAgICAgIChvOiBhbnkpID0+IG8uRGVzY3JpcHRpb24gPT09ICdDbG91ZFdhdGNoIExvZyBHcm91cCBOYW1lIGZvciBPcGVuQ2xhdyBFQ1MgdGFza3MnXG4gICAgICApO1xuICAgICAgZXhwZWN0KGxvZ0dyb3VwT3V0cHV0KS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3J0cyBBTEIgbG9nIGJ1Y2tldCBuYW1lIHdoZW4gQUxCIGlzIHByb3ZpZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgeyBzdGFjayB9ID0gY3JlYXRlQmFzZVN0YWNrKCk7XG4gICAgICBjb25zdCB2cGMgPSBjcmVhdGVWcGMoc3RhY2spO1xuICAgICAgY29uc3Qgc2VjdXJpdHlHcm91cCA9IGNyZWF0ZVNlY3VyaXR5R3JvdXAoc3RhY2ssIHZwYyk7XG4gICAgICBjb25zdCBhbGIgPSBjcmVhdGVBbGIoc3RhY2ssIHZwYywgc2VjdXJpdHlHcm91cCk7XG5cbiAgICAgIG5ldyBPcGVuQ2xhd0xvZ2dpbmcoc3RhY2ssICdUZXN0TG9nZ2luZycsIHtcbiAgICAgICAgYWxiLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgLy8gQ2hlY2sgdGhhdCBvdXRwdXRzIHdpdGggY29ycmVjdCBkZXNjcmlwdGlvbnMgZXhpc3RcbiAgICAgIGNvbnN0IG91dHB1dHMgPSB0ZW1wbGF0ZS50b0pTT04oKS5PdXRwdXRzO1xuICAgICAgY29uc3QgYWxiTG9nQnVja2V0TmFtZU91dHB1dCA9IE9iamVjdC52YWx1ZXMob3V0cHV0cyB8fCB7fSkuZmluZChcbiAgICAgICAgKG86IGFueSkgPT4gby5EZXNjcmlwdGlvbiA9PT0gJ1MzIEJ1Y2tldCBOYW1lIGZvciBBTEIgQWNjZXNzIExvZ3MnXG4gICAgICApO1xuICAgICAgY29uc3QgYWxiTG9nQnVja2V0QXJuT3V0cHV0ID0gT2JqZWN0LnZhbHVlcyhvdXRwdXRzIHx8IHt9KS5maW5kKFxuICAgICAgICAobzogYW55KSA9PiBvLkRlc2NyaXB0aW9uID09PSAnUzMgQnVja2V0IEFSTiBmb3IgQUxCIEFjY2VzcyBMb2dzJ1xuICAgICAgKTtcblxuICAgICAgZXhwZWN0KGFsYkxvZ0J1Y2tldE5hbWVPdXRwdXQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYWxiTG9nQnVja2V0QXJuT3V0cHV0KS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEludGVncmF0aW9uIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0ludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgY29tcGxldGUgbG9nZ2luZyBzZXR1cCB3aXRoIEFMQicsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhY2sgfSA9IGNyZWF0ZUJhc2VTdGFjaygpO1xuICAgICAgY29uc3QgdnBjID0gY3JlYXRlVnBjKHN0YWNrKTtcbiAgICAgIGNvbnN0IHNlY3VyaXR5R3JvdXAgPSBjcmVhdGVTZWN1cml0eUdyb3VwKHN0YWNrLCB2cGMpO1xuICAgICAgY29uc3QgYWxiID0gY3JlYXRlQWxiKHN0YWNrLCB2cGMsIHNlY3VyaXR5R3JvdXApO1xuXG4gICAgICBuZXcgT3BlbkNsYXdMb2dnaW5nKHN0YWNrLCAnVGVzdExvZ2dpbmcnLCB7XG4gICAgICAgIGFsYixcbiAgICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgLy8gVmVyaWZ5IGFsbCByZXNvdXJjZXMgYXJlIGNyZWF0ZWRcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIDEpO1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OlMzOjpCdWNrZXQnLCAxKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgbWluaW1hbCBsb2dnaW5nIHNldHVwIHdpdGhvdXQgQUxCJywgKCkgPT4ge1xuICAgICAgY29uc3QgeyBzdGFjayB9ID0gY3JlYXRlQmFzZVN0YWNrKCk7XG5cbiAgICAgIG5ldyBPcGVuQ2xhd0xvZ2dpbmcoc3RhY2ssICdUZXN0TG9nZ2luZycpO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIC8vIE9ubHkgbG9nIGdyb3VwIHNob3VsZCBiZSBjcmVhdGVkXG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCAxKTtcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpTMzo6QnVja2V0JywgMCk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=