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
export declare class OpenClawStorage extends Construct {
    readonly bucket: s3.IBucket;
    readonly bucketArn: string;
    constructor(scope: Construct, id: string);
}
