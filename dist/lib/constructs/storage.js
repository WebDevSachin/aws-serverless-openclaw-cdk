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
exports.OpenClawStorage = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const constructs_1 = require("constructs");
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
class OpenClawStorage extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        // Get account ID for unique bucket naming
        const accountId = cdk.Stack.of(this).account;
        // Create the S3 bucket with all required configurations
        this.bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: `openclaw-storage-${accountId}`,
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
exports.OpenClawStorage = OpenClawStorage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zdHJ1Y3RzL3N0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLDJDQUF1QztBQUV2Qzs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBYSxlQUFnQixTQUFRLHNCQUFTO0lBSTVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsMENBQTBDO1FBQzFDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUU3Qyx3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUMxQyxVQUFVLEVBQUUsb0JBQW9CLFNBQVMsRUFBRTtZQUMzQyxTQUFTLEVBQUUsSUFBSTtZQUNmLFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxnQ0FBZ0MsRUFBRTtnQkFDaEM7b0JBQ0UsSUFBSSxFQUFFLDRCQUE0QjtvQkFDbEMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUM1Qyx5QkFBeUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7aUJBQ2xEO2FBQ0Y7WUFDRCxjQUFjLEVBQUU7Z0JBQ2Q7b0JBQ0UsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztvQkFDbEMsRUFBRSxFQUFFLCtCQUErQjtpQkFDcEM7YUFDRjtZQUNELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07U0FDeEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUN6QyxDQUFDO0NBQ0Y7QUFsQ0QsMENBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuLyoqXG4gKiBPcGVuQ2xhdyBTdG9yYWdlIC0gUzMgYnVja2V0IGZvciBwZXJzaXN0ZW50IHN0b3JhZ2VcbiAqXG4gKiBGZWF0dXJlczpcbiAqIC0gQXV0by1nZW5lcmF0ZWQgYnVja2V0IG5hbWUgd2l0aCBhY2NvdW50IElEXG4gKiAtIFZlcnNpb25pbmcgZW5hYmxlZFxuICogLSBTMy1tYW5hZ2VkIGVuY3J5cHRpb25cbiAqIC0gQmxvY2sgYWxsIHB1YmxpYyBhY2Nlc3NcbiAqIC0gSW50ZWxsaWdlbnQtVGllcmluZyBsaWZlY3ljbGUgY29uZmlndXJhdGlvblxuICogLSBSZXRhaW4gcG9saWN5IG9uIHN0YWNrIGRlbGV0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBPcGVuQ2xhd1N0b3JhZ2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgYnVja2V0OiBzMy5JQnVja2V0O1xuICBwdWJsaWMgcmVhZG9ubHkgYnVja2V0QXJuOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyBHZXQgYWNjb3VudCBJRCBmb3IgdW5pcXVlIGJ1Y2tldCBuYW1pbmdcbiAgICBjb25zdCBhY2NvdW50SWQgPSBjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudDtcblxuICAgIC8vIENyZWF0ZSB0aGUgUzMgYnVja2V0IHdpdGggYWxsIHJlcXVpcmVkIGNvbmZpZ3VyYXRpb25zXG4gICAgdGhpcy5idWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgb3BlbmNsYXctc3RvcmFnZS0ke2FjY291bnRJZH1gLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGludGVsbGlnZW50VGllcmluZ0NvbmZpZ3VyYXRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnT3BlbkNsYXdJbnRlbGxpZ2VudFRpZXJpbmcnLFxuICAgICAgICAgIGFyY2hpdmVBY2Nlc3NUaWVyVGltZTogY2RrLkR1cmF0aW9uLmRheXMoOTApLFxuICAgICAgICAgIGRlZXBBcmNoaXZlQWNjZXNzVGllclRpbWU6IGNkay5EdXJhdGlvbi5kYXlzKDE4MCksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDM2NSksXG4gICAgICAgICAgaWQ6ICdFeHBpcmVPbGRWZXJzaW9uc0FmdGVyMzY1RGF5cycsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgIH0pO1xuXG4gICAgdGhpcy5idWNrZXRBcm4gPSB0aGlzLmJ1Y2tldC5idWNrZXRBcm47XG4gIH1cbn1cbiJdfQ==