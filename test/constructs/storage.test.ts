import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { OpenClawStorage } from '../../lib/constructs/storage';

describe('OpenClawStorage', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    new OpenClawStorage(stack, 'TestStorage');
    template = Template.fromStack(stack);
  });

  test('creates S3 bucket with auto-generated name', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'openclaw-storage-123456789012',
    });
  });

  test('bucket has versioning enabled', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  test('bucket blocks public access', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('bucket has S3-managed encryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });
  });

  test('bucket has intelligent tiering configured', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      IntelligentTieringConfigurations: [
        {
          Id: 'OpenClawIntelligentTiering',
          Tierings: [
            {
              AccessTier: 'ARCHIVE_ACCESS',
              Days: 90,
            },
            {
              AccessTier: 'DEEP_ARCHIVE_ACCESS',
              Days: 180,
            },
          ],
        },
      ],
    });
  });

  test('bucket has lifecycle rule for expiration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: [
          {
            Id: 'ExpireOldVersionsAfter365Days',
            ExpirationInDays: 365,
            Status: 'Enabled',
          },
        ],
      },
    });
  });

  test('bucket has retain removal policy', () => {
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  test('exposes bucket and bucketArn properties', () => {
    const storage = new OpenClawStorage(stack, 'AnotherStorage');
    expect(storage.bucket).toBeDefined();
    expect(storage.bucketArn).toBeDefined();
    // bucketArn is a CDK Token, verify it's a string (token will be resolved during deployment)
    expect(typeof storage.bucketArn).toBe('string');
  });
});
