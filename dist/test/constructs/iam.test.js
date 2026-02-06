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
const iam_1 = require("../../lib/constructs/iam");
describe('OpenClawIam', () => {
    const defaultProps = {
        bucketArn: 'arn:aws:s3:::test-openclaw-bucket',
        gatewayTokenSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:gateway-token',
        externalApiSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:external-api',
        efsFileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
    };
    // Helper function to create a fresh stack for each test
    function createStackAndTemplate(props) {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack', {
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        new iam_1.OpenClawIam(stack, 'TestIam', { ...defaultProps, ...props });
        return assertions_1.Template.fromStack(stack);
    }
    // ============================================================================
    // Task Execution Role Tests
    // ============================================================================
    describe('Task Execution Role', () => {
        test('creates task execution role with correct assume role policy', () => {
            const template = createStackAndTemplate();
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
        test('has correct description for task execution role', () => {
            const template = createStackAndTemplate();
            template.hasResourceProperties('AWS::IAM::Role', {
                Description: 'Execution role for OpenClaw ECS tasks',
            });
        });
        test('has managed policy AmazonECSTaskExecutionRolePolicy', () => {
            const template = createStackAndTemplate();
            const roles = template.findResources('AWS::IAM::Role', {
                Properties: {
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
                },
            });
            expect(Object.keys(roles).length).toBeGreaterThanOrEqual(1);
        });
    });
    // ============================================================================
    // Secrets Manager Access Tests
    // ============================================================================
    describe('Secrets Manager Access', () => {
        test('can read gateway token secret', () => {
            const template = createStackAndTemplate();
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: 'secretsmanager:GetSecretValue',
                            Resource: assertions_1.Match.arrayWith([defaultProps.gatewayTokenSecretArn]),
                        }),
                    ]),
                },
            });
        });
        test('can read external API secret when provided', () => {
            const template = createStackAndTemplate();
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: 'secretsmanager:GetSecretValue',
                            Resource: assertions_1.Match.arrayWith([defaultProps.externalApiSecretArn]),
                        }),
                    ]),
                },
            });
        });
        test('has CloudWatch Logs permissions', () => {
            const template = createStackAndTemplate();
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                            Resource: '*',
                        }),
                    ]),
                },
            });
        });
    });
    // ============================================================================
    // Task Role Tests
    // ============================================================================
    describe('Task Role', () => {
        test('creates task role with correct assume role policy', () => {
            const template = createStackAndTemplate();
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
                Description: 'Task role for OpenClaw ECS tasks with Bedrock and S3 access',
            });
        });
    });
    // ============================================================================
    // Bedrock Permissions Tests
    // ============================================================================
    describe('Bedrock Permissions', () => {
        test('has Bedrock InvokeModel permissions', () => {
            const template = createStackAndTemplate();
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
        test('has region condition for Bedrock access', () => {
            const template = createStackAndTemplate();
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
                            Condition: {
                                StringEquals: {
                                    'aws:RequestedRegion': 'us-east-1',
                                },
                            },
                        }),
                    ]),
                },
            });
        });
    });
    // ============================================================================
    // S3 Permissions Tests
    // ============================================================================
    describe('S3 Permissions', () => {
        test('has S3 object permissions for specific bucket', () => {
            const template = createStackAndTemplate();
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: [
                                's3:GetObject',
                                's3:PutObject',
                                's3:DeleteObject',
                            ],
                            Resource: `${defaultProps.bucketArn}/*`,
                        }),
                    ]),
                },
            });
        });
        test('has S3 ListBucket permission for specific bucket', () => {
            const template = createStackAndTemplate();
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: 's3:ListBucket',
                            Resource: defaultProps.bucketArn,
                        }),
                    ]),
                },
            });
        });
    });
    // ============================================================================
    // EFS Permissions Tests
    // ============================================================================
    describe('EFS Permissions', () => {
        test('has EFS ClientMount and ClientWrite permissions when EFS ARN is provided', () => {
            const template = createStackAndTemplate();
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: [
                                'elasticfilesystem:ClientMount',
                                'elasticfilesystem:ClientWrite',
                            ],
                            Resource: defaultProps.efsFileSystemArn,
                        }),
                    ]),
                },
            });
        });
    });
    // ============================================================================
    // Least Privilege Tests
    // ============================================================================
    describe('Least Privilege', () => {
        test('S3 permissions are scoped to specific bucket ARN', () => {
            const template = createStackAndTemplate();
            const policies = template.findResources('AWS::IAM::Policy');
            let foundS3ObjectPolicy = false;
            Object.values(policies).forEach((policy) => {
                const statements = policy.Properties.PolicyDocument.Statement;
                statements.forEach((statement) => {
                    if (statement.Action?.includes('s3:GetObject') ||
                        statement.Action?.includes('s3:PutObject') ||
                        statement.Action?.includes('s3:DeleteObject')) {
                        foundS3ObjectPolicy = true;
                        expect(statement.Resource).toBe(`${defaultProps.bucketArn}/*`);
                    }
                });
            });
            expect(foundS3ObjectPolicy).toBe(true);
        });
        test('S3 ListBucket permission is scoped to specific bucket ARN', () => {
            const template = createStackAndTemplate();
            const policies = template.findResources('AWS::IAM::Policy');
            let foundListBucketPolicy = false;
            Object.values(policies).forEach((policy) => {
                const statements = policy.Properties.PolicyDocument.Statement;
                statements.forEach((statement) => {
                    if (statement.Action?.includes('s3:ListBucket')) {
                        foundListBucketPolicy = true;
                        expect(statement.Resource).toBe(defaultProps.bucketArn);
                    }
                });
            });
            expect(foundListBucketPolicy).toBe(true);
        });
        test('EFS permissions are scoped to specific file system ARN', () => {
            const template = createStackAndTemplate();
            const policies = template.findResources('AWS::IAM::Policy');
            let foundEfsPolicy = false;
            Object.values(policies).forEach((policy) => {
                const statements = policy.Properties.PolicyDocument.Statement;
                statements.forEach((statement) => {
                    if (statement.Action?.includes('elasticfilesystem:ClientMount')) {
                        foundEfsPolicy = true;
                        expect(statement.Resource).toBe(defaultProps.efsFileSystemArn);
                    }
                });
            });
            expect(foundEfsPolicy).toBe(true);
        });
        test('Secrets Manager permissions are scoped to specific secret ARNs', () => {
            const template = createStackAndTemplate();
            const policies = template.findResources('AWS::IAM::Policy');
            let foundSecretsPolicy = false;
            Object.values(policies).forEach((policy) => {
                const statements = policy.Properties.PolicyDocument.Statement;
                statements.forEach((statement) => {
                    if (statement.Action?.includes('secretsmanager:GetSecretValue')) {
                        foundSecretsPolicy = true;
                        const resources = Array.isArray(statement.Resource)
                            ? statement.Resource
                            : [statement.Resource];
                        expect(resources).toContain(defaultProps.gatewayTokenSecretArn);
                        expect(resources).toContain(defaultProps.externalApiSecretArn);
                    }
                });
            });
            expect(foundSecretsPolicy).toBe(true);
        });
    });
    // ============================================================================
    // Optional Props Tests
    // ============================================================================
    describe('Optional Props', () => {
        test('works without external API secret ARN', () => {
            const template = createStackAndTemplate({
                externalApiSecretArn: undefined,
            });
            // Should still create both roles
            template.resourceCountIs('AWS::IAM::Role', 2);
            // Should have gateway token secret only (as string since there's only one)
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: assertions_1.Match.arrayWith([
                        assertions_1.Match.objectLike({
                            Effect: 'Allow',
                            Action: 'secretsmanager:GetSecretValue',
                            Resource: defaultProps.gatewayTokenSecretArn,
                        }),
                    ]),
                },
            });
        });
        test('works without EFS file system ARN', () => {
            const template = createStackAndTemplate({
                efsFileSystemArn: undefined,
            });
            // Should create both roles but no EFS permissions
            template.resourceCountIs('AWS::IAM::Role', 2);
            // Verify no EFS permissions in policies
            const policies = template.findResources('AWS::IAM::Policy');
            Object.values(policies).forEach((policy) => {
                const statements = policy.Properties.PolicyDocument.Statement;
                statements.forEach((statement) => {
                    const actions = Array.isArray(statement.Action)
                        ? statement.Action
                        : [statement.Action];
                    actions.forEach((action) => {
                        expect(action).not.toMatch(/^elasticfilesystem:/);
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWFtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L2NvbnN0cnVjdHMvaWFtLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBeUQ7QUFDekQsa0RBQXVEO0FBRXZELFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQzNCLE1BQU0sWUFBWSxHQUFHO1FBQ25CLFNBQVMsRUFBRSxtQ0FBbUM7UUFDOUMscUJBQXFCLEVBQUUsb0VBQW9FO1FBQzNGLG9CQUFvQixFQUFFLG1FQUFtRTtRQUN6RixnQkFBZ0IsRUFBRSwwRUFBMEU7S0FDN0YsQ0FBQztJQUVGLHdEQUF3RDtJQUN4RCxTQUFTLHNCQUFzQixDQUFDLEtBQW9DO1FBQ2xFLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO1lBQzVDLEdBQUcsRUFBRTtnQkFDSCxPQUFPLEVBQUUsY0FBYztnQkFDdkIsTUFBTSxFQUFFLFdBQVc7YUFDcEI7U0FDRixDQUFDLENBQUM7UUFDSCxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLEdBQUcsWUFBWSxFQUFFLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNqRSxPQUFPLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCwrRUFBK0U7SUFDL0UsNEJBQTRCO0lBQzVCLCtFQUErRTtJQUMvRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksQ0FBQyw2REFBNkQsRUFBRSxHQUFHLEVBQUU7WUFDdkUsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztZQUMxQyxRQUFRLENB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QUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBPcGVuQ2xhd0lhbSB9IGZyb20gJy4uLy4uL2xpYi9jb25zdHJ1Y3RzL2lhbSc7XG5cbmRlc2NyaWJlKCdPcGVuQ2xhd0lhbScsICgpID0+IHtcbiAgY29uc3QgZGVmYXVsdFByb3BzID0ge1xuICAgIGJ1Y2tldEFybjogJ2Fybjphd3M6czM6Ojp0ZXN0LW9wZW5jbGF3LWJ1Y2tldCcsXG4gICAgZ2F0ZXdheVRva2VuU2VjcmV0QXJuOiAnYXJuOmF3czpzZWNyZXRzbWFuYWdlcjp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnNlY3JldDpnYXRld2F5LXRva2VuJyxcbiAgICBleHRlcm5hbEFwaVNlY3JldEFybjogJ2Fybjphd3M6c2VjcmV0c21hbmFnZXI6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjpzZWNyZXQ6ZXh0ZXJuYWwtYXBpJyxcbiAgICBlZnNGaWxlU3lzdGVtQXJuOiAnYXJuOmF3czplbGFzdGljZmlsZXN5c3RlbTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOmZpbGUtc3lzdGVtL2ZzLTEyMzQ1Njc4JyxcbiAgfTtcblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY3JlYXRlIGEgZnJlc2ggc3RhY2sgZm9yIGVhY2ggdGVzdFxuICBmdW5jdGlvbiBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKHByb3BzPzogUGFydGlhbDx0eXBlb2YgZGVmYXVsdFByb3BzPikge1xuICAgIGNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycsIHtcbiAgICAgIGVudjoge1xuICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgbmV3IE9wZW5DbGF3SWFtKHN0YWNrLCAnVGVzdElhbScsIHsgLi4uZGVmYXVsdFByb3BzLCAuLi5wcm9wcyB9KTtcbiAgICByZXR1cm4gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVGFzayBFeGVjdXRpb24gUm9sZSBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdUYXNrIEV4ZWN1dGlvbiBSb2xlJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgdGFzayBleGVjdXRpb24gcm9sZSB3aXRoIGNvcnJlY3QgYXNzdW1lIHJvbGUgcG9saWN5JywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpSb2xlJywge1xuICAgICAgICBBc3N1bWVSb2xlUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgICBQcmluY2lwYWw6IHtcbiAgICAgICAgICAgICAgICBTZXJ2aWNlOiAnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBBY3Rpb246ICdzdHM6QXNzdW1lUm9sZScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIE1hbmFnZWRQb2xpY3lBcm5zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgJ0ZuOjpKb2luJzogW1xuICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICdhcm46JyxcbiAgICAgICAgICAgICAgICB7IFJlZjogJ0FXUzo6UGFydGl0aW9uJyB9LFxuICAgICAgICAgICAgICAgICc6aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BbWF6b25FQ1NUYXNrRXhlY3V0aW9uUm9sZVBvbGljeScsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2hhcyBjb3JyZWN0IGRlc2NyaXB0aW9uIGZvciB0YXNrIGV4ZWN1dGlvbiByb2xlJywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpSb2xlJywge1xuICAgICAgICBEZXNjcmlwdGlvbjogJ0V4ZWN1dGlvbiByb2xlIGZvciBPcGVuQ2xhdyBFQ1MgdGFza3MnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdoYXMgbWFuYWdlZCBwb2xpY3kgQW1hem9uRUNTVGFza0V4ZWN1dGlvblJvbGVQb2xpY3knLCAoKSA9PiB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IGNyZWF0ZVN0YWNrQW5kVGVtcGxhdGUoKTtcbiAgICAgIGNvbnN0IHJvbGVzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpJQU06OlJvbGUnLCB7XG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBNYW5hZ2VkUG9saWN5QXJuczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgJ2FybjonLFxuICAgICAgICAgICAgICAgICAgeyBSZWY6ICdBV1M6OlBhcnRpdGlvbicgfSxcbiAgICAgICAgICAgICAgICAgICc6aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BbWF6b25FQ1NUYXNrRXhlY3V0aW9uUm9sZVBvbGljeScsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KE9iamVjdC5rZXlzKHJvbGVzKS5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gU2VjcmV0cyBNYW5hZ2VyIEFjY2VzcyBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdTZWNyZXRzIE1hbmFnZXIgQWNjZXNzJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NhbiByZWFkIGdhdGV3YXkgdG9rZW4gc2VjcmV0JywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgU3RhdGVtZW50OiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgQWN0aW9uOiAnc2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWUnLFxuICAgICAgICAgICAgICBSZXNvdXJjZTogTWF0Y2guYXJyYXlXaXRoKFtkZWZhdWx0UHJvcHMuZ2F0ZXdheVRva2VuU2VjcmV0QXJuXSksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY2FuIHJlYWQgZXh0ZXJuYWwgQVBJIHNlY3JldCB3aGVuIHByb3ZpZGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgU3RhdGVtZW50OiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgQWN0aW9uOiAnc2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWUnLFxuICAgICAgICAgICAgICBSZXNvdXJjZTogTWF0Y2guYXJyYXlXaXRoKFtkZWZhdWx0UHJvcHMuZXh0ZXJuYWxBcGlTZWNyZXRBcm5dKSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0pLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdoYXMgQ2xvdWRXYXRjaCBMb2dzIHBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgU3RhdGVtZW50OiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgQWN0aW9uOiBbJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJywgJ2xvZ3M6UHV0TG9nRXZlbnRzJ10sXG4gICAgICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFRhc2sgUm9sZSBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdUYXNrIFJvbGUnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyB0YXNrIHJvbGUgd2l0aCBjb3JyZWN0IGFzc3VtZSByb2xlIHBvbGljeScsICgpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gY3JlYXRlU3RhY2tBbmRUZW1wbGF0ZSgpO1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6Um9sZScsIHtcbiAgICAgICAgQXNzdW1lUm9sZVBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgUHJpbmNpcGFsOiB7XG4gICAgICAgICAgICAgICAgU2VydmljZTogJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgQWN0aW9uOiAnc3RzOkFzc3VtZVJvbGUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBEZXNjcmlwdGlvbjogJ1Rhc2sgcm9sZSBmb3IgT3BlbkNsYXcgRUNTIHRhc2tzIHdpdGggQmVkcm9jayBhbmQgUzMgYWNjZXNzJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEJlZHJvY2sgUGVybWlzc2lvbnMgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnQmVkcm9jayBQZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICB0ZXN0KCdoYXMgQmVkcm9jayBJbnZva2VNb2RlbCBwZXJtaXNzaW9ucycsICgpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gY3JlYXRlU3RhY2tBbmRUZW1wbGF0ZSgpO1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcbiAgICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbScsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIFJlc291cmNlOiAnKicsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnaGFzIHJlZ2lvbiBjb25kaXRpb24gZm9yIEJlZHJvY2sgYWNjZXNzJywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgU3RhdGVtZW50OiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgQWN0aW9uOiBbXG4gICAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgUmVzb3VyY2U6ICcqJyxcbiAgICAgICAgICAgICAgQ29uZGl0aW9uOiB7XG4gICAgICAgICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAgICAgICAnYXdzOlJlcXVlc3RlZFJlZ2lvbic6ICd1cy1lYXN0LTEnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFMzIFBlcm1pc3Npb25zIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ1MzIFBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgIHRlc3QoJ2hhcyBTMyBvYmplY3QgcGVybWlzc2lvbnMgZm9yIHNwZWNpZmljIGJ1Y2tldCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gY3JlYXRlU3RhY2tBbmRUZW1wbGF0ZSgpO1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBSZXNvdXJjZTogYCR7ZGVmYXVsdFByb3BzLmJ1Y2tldEFybn0vKmAsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnaGFzIFMzIExpc3RCdWNrZXQgcGVybWlzc2lvbiBmb3Igc3BlY2lmaWMgYnVja2V0JywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgU3RhdGVtZW50OiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7XG4gICAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgICAgQWN0aW9uOiAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgICAgICAgIFJlc291cmNlOiBkZWZhdWx0UHJvcHMuYnVja2V0QXJuLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBFRlMgUGVybWlzc2lvbnMgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnRUZTIFBlcm1pc3Npb25zJywgKCkgPT4ge1xuICAgIHRlc3QoJ2hhcyBFRlMgQ2xpZW50TW91bnQgYW5kIENsaWVudFdyaXRlIHBlcm1pc3Npb25zIHdoZW4gRUZTIEFSTiBpcyBwcm92aWRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gY3JlYXRlU3RhY2tBbmRUZW1wbGF0ZSgpO1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICdlbGFzdGljZmlsZXN5c3RlbTpDbGllbnRNb3VudCcsXG4gICAgICAgICAgICAgICAgJ2VsYXN0aWNmaWxlc3lzdGVtOkNsaWVudFdyaXRlJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgUmVzb3VyY2U6IGRlZmF1bHRQcm9wcy5lZnNGaWxlU3lzdGVtQXJuLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBMZWFzdCBQcml2aWxlZ2UgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnTGVhc3QgUHJpdmlsZWdlJywgKCkgPT4ge1xuICAgIHRlc3QoJ1MzIHBlcm1pc3Npb25zIGFyZSBzY29wZWQgdG8gc3BlY2lmaWMgYnVja2V0IEFSTicsICgpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gY3JlYXRlU3RhY2tBbmRUZW1wbGF0ZSgpO1xuICAgICAgY29uc3QgcG9saWNpZXMgPSB0ZW1wbGF0ZS5maW5kUmVzb3VyY2VzKCdBV1M6OklBTTo6UG9saWN5Jyk7XG4gICAgICBsZXQgZm91bmRTM09iamVjdFBvbGljeSA9IGZhbHNlO1xuXG4gICAgICBPYmplY3QudmFsdWVzKHBvbGljaWVzKS5mb3JFYWNoKChwb2xpY3k6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBzdGF0ZW1lbnRzID0gcG9saWN5LlByb3BlcnRpZXMuUG9saWN5RG9jdW1lbnQuU3RhdGVtZW50O1xuICAgICAgICBzdGF0ZW1lbnRzLmZvckVhY2goKHN0YXRlbWVudDogYW55KSA9PiB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgc3RhdGVtZW50LkFjdGlvbj8uaW5jbHVkZXMoJ3MzOkdldE9iamVjdCcpIHx8XG4gICAgICAgICAgICBzdGF0ZW1lbnQuQWN0aW9uPy5pbmNsdWRlcygnczM6UHV0T2JqZWN0JykgfHxcbiAgICAgICAgICAgIHN0YXRlbWVudC5BY3Rpb24/LmluY2x1ZGVzKCdzMzpEZWxldGVPYmplY3QnKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgZm91bmRTM09iamVjdFBvbGljeSA9IHRydWU7XG4gICAgICAgICAgICBleHBlY3Qoc3RhdGVtZW50LlJlc291cmNlKS50b0JlKGAke2RlZmF1bHRQcm9wcy5idWNrZXRBcm59LypgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChmb3VuZFMzT2JqZWN0UG9saWN5KS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnUzMgTGlzdEJ1Y2tldCBwZXJtaXNzaW9uIGlzIHNjb3BlZCB0byBzcGVjaWZpYyBidWNrZXQgQVJOJywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKCk7XG4gICAgICBjb25zdCBwb2xpY2llcyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6SUFNOjpQb2xpY3knKTtcbiAgICAgIGxldCBmb3VuZExpc3RCdWNrZXRQb2xpY3kgPSBmYWxzZTtcblxuICAgICAgT2JqZWN0LnZhbHVlcyhwb2xpY2llcykuZm9yRWFjaCgocG9saWN5OiBhbnkpID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdGVtZW50cyA9IHBvbGljeS5Qcm9wZXJ0aWVzLlBvbGljeURvY3VtZW50LlN0YXRlbWVudDtcbiAgICAgICAgc3RhdGVtZW50cy5mb3JFYWNoKChzdGF0ZW1lbnQ6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChzdGF0ZW1lbnQuQWN0aW9uPy5pbmNsdWRlcygnczM6TGlzdEJ1Y2tldCcpKSB7XG4gICAgICAgICAgICBmb3VuZExpc3RCdWNrZXRQb2xpY3kgPSB0cnVlO1xuICAgICAgICAgICAgZXhwZWN0KHN0YXRlbWVudC5SZXNvdXJjZSkudG9CZShkZWZhdWx0UHJvcHMuYnVja2V0QXJuKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChmb3VuZExpc3RCdWNrZXRQb2xpY3kpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdFRlMgcGVybWlzc2lvbnMgYXJlIHNjb3BlZCB0byBzcGVjaWZpYyBmaWxlIHN5c3RlbSBBUk4nLCAoKSA9PiB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IGNyZWF0ZVN0YWNrQW5kVGVtcGxhdGUoKTtcbiAgICAgIGNvbnN0IHBvbGljaWVzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpJQU06OlBvbGljeScpO1xuICAgICAgbGV0IGZvdW5kRWZzUG9saWN5ID0gZmFsc2U7XG5cbiAgICAgIE9iamVjdC52YWx1ZXMocG9saWNpZXMpLmZvckVhY2goKHBvbGljeTogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IHN0YXRlbWVudHMgPSBwb2xpY3kuUHJvcGVydGllcy5Qb2xpY3lEb2N1bWVudC5TdGF0ZW1lbnQ7XG4gICAgICAgIHN0YXRlbWVudHMuZm9yRWFjaCgoc3RhdGVtZW50OiBhbnkpID0+IHtcbiAgICAgICAgICBpZiAoc3RhdGVtZW50LkFjdGlvbj8uaW5jbHVkZXMoJ2VsYXN0aWNmaWxlc3lzdGVtOkNsaWVudE1vdW50JykpIHtcbiAgICAgICAgICAgIGZvdW5kRWZzUG9saWN5ID0gdHJ1ZTtcbiAgICAgICAgICAgIGV4cGVjdChzdGF0ZW1lbnQuUmVzb3VyY2UpLnRvQmUoZGVmYXVsdFByb3BzLmVmc0ZpbGVTeXN0ZW1Bcm4pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KGZvdW5kRWZzUG9saWN5KS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnU2VjcmV0cyBNYW5hZ2VyIHBlcm1pc3Npb25zIGFyZSBzY29wZWQgdG8gc3BlY2lmaWMgc2VjcmV0IEFSTnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IGNyZWF0ZVN0YWNrQW5kVGVtcGxhdGUoKTtcbiAgICAgIGNvbnN0IHBvbGljaWVzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpJQU06OlBvbGljeScpO1xuICAgICAgbGV0IGZvdW5kU2VjcmV0c1BvbGljeSA9IGZhbHNlO1xuXG4gICAgICBPYmplY3QudmFsdWVzKHBvbGljaWVzKS5mb3JFYWNoKChwb2xpY3k6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBzdGF0ZW1lbnRzID0gcG9saWN5LlByb3BlcnRpZXMuUG9saWN5RG9jdW1lbnQuU3RhdGVtZW50O1xuICAgICAgICBzdGF0ZW1lbnRzLmZvckVhY2goKHN0YXRlbWVudDogYW55KSA9PiB7XG4gICAgICAgICAgaWYgKHN0YXRlbWVudC5BY3Rpb24/LmluY2x1ZGVzKCdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScpKSB7XG4gICAgICAgICAgICBmb3VuZFNlY3JldHNQb2xpY3kgPSB0cnVlO1xuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VzID0gQXJyYXkuaXNBcnJheShzdGF0ZW1lbnQuUmVzb3VyY2UpXG4gICAgICAgICAgICAgID8gc3RhdGVtZW50LlJlc291cmNlXG4gICAgICAgICAgICAgIDogW3N0YXRlbWVudC5SZXNvdXJjZV07XG4gICAgICAgICAgICBleHBlY3QocmVzb3VyY2VzKS50b0NvbnRhaW4oZGVmYXVsdFByb3BzLmdhdGV3YXlUb2tlblNlY3JldEFybik7XG4gICAgICAgICAgICBleHBlY3QocmVzb3VyY2VzKS50b0NvbnRhaW4oZGVmYXVsdFByb3BzLmV4dGVybmFsQXBpU2VjcmV0QXJuKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChmb3VuZFNlY3JldHNQb2xpY3kpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gT3B0aW9uYWwgUHJvcHMgVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnT3B0aW9uYWwgUHJvcHMnLCAoKSA9PiB7XG4gICAgdGVzdCgnd29ya3Mgd2l0aG91dCBleHRlcm5hbCBBUEkgc2VjcmV0IEFSTicsICgpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gY3JlYXRlU3RhY2tBbmRUZW1wbGF0ZSh7XG4gICAgICAgIGV4dGVybmFsQXBpU2VjcmV0QXJuOiB1bmRlZmluZWQsXG4gICAgICB9KTtcblxuICAgICAgLy8gU2hvdWxkIHN0aWxsIGNyZWF0ZSBib3RoIHJvbGVzXG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6SUFNOjpSb2xlJywgMik7XG5cbiAgICAgIC8vIFNob3VsZCBoYXZlIGdhdGV3YXkgdG9rZW4gc2VjcmV0IG9ubHkgKGFzIHN0cmluZyBzaW5jZSB0aGVyZSdzIG9ubHkgb25lKVxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICAgIFN0YXRlbWVudDogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICAgIEFjdGlvbjogJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgICAgICAgICAgUmVzb3VyY2U6IGRlZmF1bHRQcm9wcy5nYXRld2F5VG9rZW5TZWNyZXRBcm4sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnd29ya3Mgd2l0aG91dCBFRlMgZmlsZSBzeXN0ZW0gQVJOJywgKCkgPT4ge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBjcmVhdGVTdGFja0FuZFRlbXBsYXRlKHtcbiAgICAgICAgZWZzRmlsZVN5c3RlbUFybjogdW5kZWZpbmVkLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFNob3VsZCBjcmVhdGUgYm90aCByb2xlcyBidXQgbm8gRUZTIHBlcm1pc3Npb25zXG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6SUFNOjpSb2xlJywgMik7XG5cbiAgICAgIC8vIFZlcmlmeSBubyBFRlMgcGVybWlzc2lvbnMgaW4gcG9saWNpZXNcbiAgICAgIGNvbnN0IHBvbGljaWVzID0gdGVtcGxhdGUuZmluZFJlc291cmNlcygnQVdTOjpJQU06OlBvbGljeScpO1xuICAgICAgT2JqZWN0LnZhbHVlcyhwb2xpY2llcykuZm9yRWFjaCgocG9saWN5OiBhbnkpID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdGVtZW50cyA9IHBvbGljeS5Qcm9wZXJ0aWVzLlBvbGljeURvY3VtZW50LlN0YXRlbWVudDtcbiAgICAgICAgc3RhdGVtZW50cy5mb3JFYWNoKChzdGF0ZW1lbnQ6IGFueSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGFjdGlvbnMgPSBBcnJheS5pc0FycmF5KHN0YXRlbWVudC5BY3Rpb24pXG4gICAgICAgICAgICA/IHN0YXRlbWVudC5BY3Rpb25cbiAgICAgICAgICAgIDogW3N0YXRlbWVudC5BY3Rpb25dO1xuICAgICAgICAgIGFjdGlvbnMuZm9yRWFjaCgoYWN0aW9uOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChhY3Rpb24pLm5vdC50b01hdGNoKC9eZWxhc3RpY2ZpbGVzeXN0ZW06Lyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=