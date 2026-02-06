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
const storage_1 = require("../../lib/constructs/storage");
describe('OpenClawStorage', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack', {
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        new storage_1.OpenClawStorage(stack, 'TestStorage');
        template = assertions_1.Template.fromStack(stack);
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
        const storage = new storage_1.OpenClawStorage(stack, 'AnotherStorage');
        expect(storage.bucket).toBeDefined();
        expect(storage.bucketArn).toBeDefined();
        // bucketArn is a CDK Token, verify it's a string (token will be resolved during deployment)
        expect(typeof storage.bucketArn).toBe('string');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9jb25zdHJ1Y3RzL3N0b3JhZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCwwREFBK0Q7QUFFL0QsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUMvQixJQUFJLEdBQVksQ0FBQztJQUNqQixJQUFJLEtBQWdCLENBQUM7SUFDckIsSUFBSSxRQUFrQixDQUFDO0lBRXZCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDcEIsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO1lBQ3RDLEdBQUcsRUFBRTtnQkFDSCxPQUFPLEVBQUUsY0FBYztnQkFDdkIsTUFBTSxFQUFFLFdBQVc7YUFDcEI7U0FDRixDQUFDLENBQUM7UUFDSCxJQUFJLHlCQUFlLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzFDLFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFO1lBQ2hELFVBQVUsRUFBRSwrQkFBK0I7U0FDNUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRTtZQUNoRCx1QkFBdUIsRUFBRTtnQkFDdkIsTUFBTSxFQUFFLFNBQVM7YUFDbEI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFO1lBQ2hELDhCQUE4QixFQUFFO2dCQUM5QixlQUFlLEVBQUUsSUFBSTtnQkFDckIsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIscUJBQXFCLEVBQUUsSUFBSTthQUM1QjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxRQUFRLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7WUFDaEQsZ0JBQWdCLEVBQUU7Z0JBQ2hCLGlDQUFpQyxFQUFFO29CQUNqQzt3QkFDRSw2QkFBNkIsRUFBRTs0QkFDN0IsWUFBWSxFQUFFLFFBQVE7eUJBQ3ZCO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDckQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFO1lBQ2hELGdDQUFnQyxFQUFFO2dCQUNoQztvQkFDRSxFQUFFLEVBQUUsNEJBQTRCO29CQUNoQyxRQUFRLEVBQUU7d0JBQ1I7NEJBQ0UsVUFBVSxFQUFFLGdCQUFnQjs0QkFDNUIsSUFBSSxFQUFFLEVBQUU7eUJBQ1Q7d0JBQ0Q7NEJBQ0UsVUFBVSxFQUFFLHFCQUFxQjs0QkFDakMsSUFBSSxFQUFFLEdBQUc7eUJBQ1Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxRQUFRLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7WUFDaEQsc0JBQXNCLEVBQUU7Z0JBQ3RCLEtBQUssRUFBRTtvQkFDTDt3QkFDRSxFQUFFLEVBQUUsK0JBQStCO3dCQUNuQyxnQkFBZ0IsRUFBRSxHQUFHO3dCQUNyQixNQUFNLEVBQUUsU0FBUztxQkFDbEI7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxRQUFRLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFO1lBQ3RDLGNBQWMsRUFBRSxRQUFRO1lBQ3hCLG1CQUFtQixFQUFFLFFBQVE7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1FBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQWUsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDeEMsNEZBQTRGO1FBQzVGLE1BQU0sQ0FBQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBUZW1wbGF0ZSwgTWF0Y2ggfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCB7IE9wZW5DbGF3U3RvcmFnZSB9IGZyb20gJy4uLy4uL2xpYi9jb25zdHJ1Y3RzL3N0b3JhZ2UnO1xuXG5kZXNjcmliZSgnT3BlbkNsYXdTdG9yYWdlJywgKCkgPT4ge1xuICBsZXQgYXBwOiBjZGsuQXBwO1xuICBsZXQgc3RhY2s6IGNkay5TdGFjaztcbiAgbGV0IHRlbXBsYXRlOiBUZW1wbGF0ZTtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIHN0YWNrID0gbmV3IGNkay5TdGFjayhhcHAsICdUZXN0U3RhY2snLCB7XG4gICAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIG5ldyBPcGVuQ2xhd1N0b3JhZ2Uoc3RhY2ssICdUZXN0U3RvcmFnZScpO1xuICAgIHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfSk7XG5cbiAgdGVzdCgnY3JlYXRlcyBTMyBidWNrZXQgd2l0aCBhdXRvLWdlbmVyYXRlZCBuYW1lJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgQnVja2V0TmFtZTogJ29wZW5jbGF3LXN0b3JhZ2UtMTIzNDU2Nzg5MDEyJyxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnYnVja2V0IGhhcyB2ZXJzaW9uaW5nIGVuYWJsZWQnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICBWZXJzaW9uaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBTdGF0dXM6ICdFbmFibGVkJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2J1Y2tldCBibG9ja3MgcHVibGljIGFjY2VzcycsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6UzM6OkJ1Y2tldCcsIHtcbiAgICAgIFB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBCbG9ja1B1YmxpY0FjbHM6IHRydWUsXG4gICAgICAgIEJsb2NrUHVibGljUG9saWN5OiB0cnVlLFxuICAgICAgICBJZ25vcmVQdWJsaWNBY2xzOiB0cnVlLFxuICAgICAgICBSZXN0cmljdFB1YmxpY0J1Y2tldHM6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdidWNrZXQgaGFzIFMzLW1hbmFnZWQgZW5jcnlwdGlvbicsICgpID0+IHtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6UzM6OkJ1Y2tldCcsIHtcbiAgICAgIEJ1Y2tldEVuY3J5cHRpb246IHtcbiAgICAgICAgU2VydmVyU2lkZUVuY3J5cHRpb25Db25maWd1cmF0aW9uOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgU2VydmVyU2lkZUVuY3J5cHRpb25CeURlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgU1NFQWxnb3JpdGhtOiAnQUVTMjU2JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2J1Y2tldCBoYXMgaW50ZWxsaWdlbnQgdGllcmluZyBjb25maWd1cmVkJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgSW50ZWxsaWdlbnRUaWVyaW5nQ29uZmlndXJhdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIElkOiAnT3BlbkNsYXdJbnRlbGxpZ2VudFRpZXJpbmcnLFxuICAgICAgICAgIFRpZXJpbmdzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEFjY2Vzc1RpZXI6ICdBUkNISVZFX0FDQ0VTUycsXG4gICAgICAgICAgICAgIERheXM6IDkwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgQWNjZXNzVGllcjogJ0RFRVBfQVJDSElWRV9BQ0NFU1MnLFxuICAgICAgICAgICAgICBEYXlzOiAxODAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdidWNrZXQgaGFzIGxpZmVjeWNsZSBydWxlIGZvciBleHBpcmF0aW9uJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xuICAgICAgTGlmZWN5Y2xlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBSdWxlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIElkOiAnRXhwaXJlT2xkVmVyc2lvbnNBZnRlcjM2NURheXMnLFxuICAgICAgICAgICAgRXhwaXJhdGlvbkluRGF5czogMzY1LFxuICAgICAgICAgICAgU3RhdHVzOiAnRW5hYmxlZCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2J1Y2tldCBoYXMgcmV0YWluIHJlbW92YWwgcG9saWN5JywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlKCdBV1M6OlMzOjpCdWNrZXQnLCB7XG4gICAgICBEZWxldGlvblBvbGljeTogJ1JldGFpbicsXG4gICAgICBVcGRhdGVSZXBsYWNlUG9saWN5OiAnUmV0YWluJyxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnZXhwb3NlcyBidWNrZXQgYW5kIGJ1Y2tldEFybiBwcm9wZXJ0aWVzJywgKCkgPT4ge1xuICAgIGNvbnN0IHN0b3JhZ2UgPSBuZXcgT3BlbkNsYXdTdG9yYWdlKHN0YWNrLCAnQW5vdGhlclN0b3JhZ2UnKTtcbiAgICBleHBlY3Qoc3RvcmFnZS5idWNrZXQpLnRvQmVEZWZpbmVkKCk7XG4gICAgZXhwZWN0KHN0b3JhZ2UuYnVja2V0QXJuKS50b0JlRGVmaW5lZCgpO1xuICAgIC8vIGJ1Y2tldEFybiBpcyBhIENESyBUb2tlbiwgdmVyaWZ5IGl0J3MgYSBzdHJpbmcgKHRva2VuIHdpbGwgYmUgcmVzb2x2ZWQgZHVyaW5nIGRlcGxveW1lbnQpXG4gICAgZXhwZWN0KHR5cGVvZiBzdG9yYWdlLmJ1Y2tldEFybikudG9CZSgnc3RyaW5nJyk7XG4gIH0pO1xufSk7XG4iXX0=