import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * OpenClaw Storage - S3 bucket for persistent storage
 *
 * Features:
 * - Auto-generated bucket name with account ID
 * - Versioning enabled
 * - S3-managed encryption
 * - Block all public access
 * - Intelligent-Tiering lifecycle configuration
 * - Retain policy on stack deletion
 */
export class OpenClawStorage extends Construct {
  public readonly bucket: s3.IBucket;
  public readonly bucketArn: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Get account ID and stack name for unique bucket naming
    const accountId = cdk.Stack.of(this).account;
    const stackName = cdk.Stack.of(this).stackName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8);

    // Create the S3 bucket with all required configurations
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `oc-data-${accountId}-${stackName}`,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      intelligentTieringConfigurations: [
        {
          name: 'OpenClawIntelligentTiering',
          archiveAccessTierTime: cdk.Duration.days(90),
          deepArchiveAccessTierTime: cdk.Duration.days(180),
        },
      ],
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(365),
          id: 'ExpireOldVersionsAfter365Days',
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.bucketArn = this.bucket.bucketArn;
  }
}
