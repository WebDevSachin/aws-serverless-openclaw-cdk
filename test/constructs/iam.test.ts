import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { OpenClawIam } from '../../lib/constructs/iam';

describe('OpenClawIam', () => {
  const defaultProps = {
    bucketArn: 'arn:aws:s3:::test-openclaw-bucket',
    gatewayTokenSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:gateway-token',
    externalApiSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:external-api',
    efsFileSystemArn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-12345678',
  };

  // Helper function to create a fresh stack for each test
  function createStackAndTemplate(props?: Partial<typeof defaultProps>) {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    new OpenClawIam(stack, 'TestIam', { ...defaultProps, ...props });
    return Template.fromStack(stack);
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
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
              Resource: Match.arrayWith([defaultProps.gatewayTokenSecretArn]),
            }),
          ]),
        },
      });
    });

    test('can read external API secret when provided', () => {
      const template = createStackAndTemplate();
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
              Resource: Match.arrayWith([defaultProps.externalApiSecretArn]),
            }),
          ]),
        },
      });
    });

    test('has CloudWatch Logs permissions', () => {
      const template = createStackAndTemplate();
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
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

    test('has region condition for Bedrock access', () => {
      const template = createStackAndTemplate();
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
          Statement: Match.arrayWith([
            Match.objectLike({
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
          Statement: Match.arrayWith([
            Match.objectLike({
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
          Statement: Match.arrayWith([
            Match.objectLike({
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

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (
            statement.Action?.includes('s3:GetObject') ||
            statement.Action?.includes('s3:PutObject') ||
            statement.Action?.includes('s3:DeleteObject')
          ) {
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

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
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

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
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

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
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
          Statement: Match.arrayWith([
            Match.objectLike({
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
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          const actions = Array.isArray(statement.Action)
            ? statement.Action
            : [statement.Action];
          actions.forEach((action: string) => {
            expect(action).not.toMatch(/^elasticfilesystem:/);
          });
        });
      });
    });
  });
});
