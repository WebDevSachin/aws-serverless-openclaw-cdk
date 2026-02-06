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
const secrets_1 = require("../../lib/constructs/secrets");
describe('OpenClawSecrets', () => {
    let app;
    let stack;
    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack', {
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
    });
    describe('Gateway Token Secret', () => {
        test('creates gateway token secret with correct name', () => {
            new secrets_1.OpenClawSecrets(stack, 'TestSecrets');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::SecretsManager::Secret', {
                Name: 'openclaw/gateway-token',
            });
        });
        test('gateway token secret generates 32-char alphanumeric password', () => {
            new secrets_1.OpenClawSecrets(stack, 'TestSecrets');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::SecretsManager::Secret', {
                Name: 'openclaw/gateway-token',
                GenerateSecretString: assertions_1.Match.objectLike({
                    SecretStringTemplate: '{"token":""}',
                    GenerateStringKey: 'token',
                    ExcludePunctuation: true,
                    PasswordLength: 32,
                }),
            });
        });
        test('gateway token secret has retain removal policy', () => {
            new secrets_1.OpenClawSecrets(stack, 'TestSecrets');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResource('AWS::SecretsManager::Secret', {
                DeletionPolicy: 'Retain',
                UpdateReplacePolicy: 'Retain',
            });
        });
        test('exposes gatewayTokenSecret property', () => {
            const secrets = new secrets_1.OpenClawSecrets(stack, 'TestSecrets');
            expect(secrets.gatewayTokenSecret).toBeDefined();
        });
    });
    describe('External API Secret', () => {
        test('does not create external API secret by default', () => {
            new secrets_1.OpenClawSecrets(stack, 'TestSecrets');
            const template = assertions_1.Template.fromStack(stack);
            // Should only have 1 secret (gateway token)
            template.resourceCountIs('AWS::SecretsManager::Secret', 1);
        });
        test('creates external API secret when enabled', () => {
            new secrets_1.OpenClawSecrets(stack, 'TestSecrets', {
                createExternalApiSecret: true,
            });
            const template = assertions_1.Template.fromStack(stack);
            // Should have 2 secrets now
            template.resourceCountIs('AWS::SecretsManager::Secret', 2);
            template.hasResourceProperties('AWS::SecretsManager::Secret', {
                Name: 'openclaw/external-apis',
            });
        });
        test('external API secret has correct structure with placeholders', () => {
            new secrets_1.OpenClawSecrets(stack, 'TestSecrets', {
                createExternalApiSecret: true,
            });
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::SecretsManager::Secret', {
                Name: 'openclaw/external-apis',
                SecretString: JSON.stringify({
                    ANTHROPIC_API_KEY: '',
                    OPENAI_API_KEY: '',
                }),
            });
        });
        test('exposes externalApiSecret property when created', () => {
            const secrets = new secrets_1.OpenClawSecrets(stack, 'TestSecrets', {
                createExternalApiSecret: true,
            });
            expect(secrets.externalApiSecret).toBeDefined();
        });
        test('externalApiSecret is undefined when not created', () => {
            const secrets = new secrets_1.OpenClawSecrets(stack, 'TestSecrets');
            expect(secrets.externalApiSecret).toBeUndefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9jb25zdHJ1Y3RzL3NlY3JldHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCwwREFBK0Q7QUFFL0QsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUMvQixJQUFJLEdBQVksQ0FBQztJQUNqQixJQUFJLEtBQWdCLENBQUM7SUFFckIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNwQixLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUU7WUFDdEMsR0FBRyxFQUFFO2dCQUNILE9BQU8sRUFBRSxjQUFjO2dCQUN2QixNQUFNLEVBQUUsV0FBVzthQUNwQjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUNwQyxJQUFJLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1lBQzFELElBQUkseUJBQWUsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDMUMsTUFBTSxRQUFRLEdBQUcscUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFM0MsUUFBUSxDQUFDLHFCQUFxQixDQUFDLDZCQUE2QixFQUFFO2dCQUM1RCxJQUFJLEVBQUUsd0JBQXdCO2FBQy9CLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDhEQUE4RCxFQUFFLEdBQUcsRUFBRTtZQUN4RSxJQUFJLHlCQUFlLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzFDLE1BQU0sUUFBUSxHQUFHLHFCQUFRLENB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RTtnQkFDeEQsdUJBQXVCLEVBQUUsSUFBSTthQUM5QixDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1lBQzNELE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQWUsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBUZW1wbGF0ZSwgTWF0Y2ggfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcbmltcG9ydCB7IE9wZW5DbGF3U2VjcmV0cyB9IGZyb20gJy4uLy4uL2xpYi9jb25zdHJ1Y3RzL3NlY3JldHMnO1xuXG5kZXNjcmliZSgnT3BlbkNsYXdTZWNyZXRzJywgKCkgPT4ge1xuICBsZXQgYXBwOiBjZGsuQXBwO1xuICBsZXQgc3RhY2s6IGNkay5TdGFjaztcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIHN0YWNrID0gbmV3IGNkay5TdGFjayhhcHAsICdUZXN0U3RhY2snLCB7XG4gICAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnR2F0ZXdheSBUb2tlbiBTZWNyZXQnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBnYXRld2F5IHRva2VuIHNlY3JldCB3aXRoIGNvcnJlY3QgbmFtZScsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1NlY3JldHMoc3RhY2ssICdUZXN0U2VjcmV0cycpO1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U2VjcmV0c01hbmFnZXI6OlNlY3JldCcsIHtcbiAgICAgICAgTmFtZTogJ29wZW5jbGF3L2dhdGV3YXktdG9rZW4nLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdnYXRld2F5IHRva2VuIHNlY3JldCBnZW5lcmF0ZXMgMzItY2hhciBhbHBoYW51bWVyaWMgcGFzc3dvcmQnLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdTZWNyZXRzKHN0YWNrLCAnVGVzdFNlY3JldHMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlNlY3JldHNNYW5hZ2VyOjpTZWNyZXQnLCB7XG4gICAgICAgIE5hbWU6ICdvcGVuY2xhdy9nYXRld2F5LXRva2VuJyxcbiAgICAgICAgR2VuZXJhdGVTZWNyZXRTdHJpbmc6IE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgIFNlY3JldFN0cmluZ1RlbXBsYXRlOiAne1widG9rZW5cIjpcIlwifScsXG4gICAgICAgICAgR2VuZXJhdGVTdHJpbmdLZXk6ICd0b2tlbicsXG4gICAgICAgICAgRXhjbHVkZVB1bmN0dWF0aW9uOiB0cnVlLFxuICAgICAgICAgIFBhc3N3b3JkTGVuZ3RoOiAzMixcbiAgICAgICAgfSksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2dhdGV3YXkgdG9rZW4gc2VjcmV0IGhhcyByZXRhaW4gcmVtb3ZhbCBwb2xpY3knLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdTZWNyZXRzKHN0YWNrLCAnVGVzdFNlY3JldHMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2UoJ0FXUzo6U2VjcmV0c01hbmFnZXI6OlNlY3JldCcsIHtcbiAgICAgICAgRGVsZXRpb25Qb2xpY3k6ICdSZXRhaW4nLFxuICAgICAgICBVcGRhdGVSZXBsYWNlUG9saWN5OiAnUmV0YWluJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3NlcyBnYXRld2F5VG9rZW5TZWNyZXQgcHJvcGVydHknLCAoKSA9PiB7XG4gICAgICBjb25zdCBzZWNyZXRzID0gbmV3IE9wZW5DbGF3U2VjcmV0cyhzdGFjaywgJ1Rlc3RTZWNyZXRzJyk7XG4gICAgICBleHBlY3Qoc2VjcmV0cy5nYXRld2F5VG9rZW5TZWNyZXQpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdFeHRlcm5hbCBBUEkgU2VjcmV0JywgKCkgPT4ge1xuICAgIHRlc3QoJ2RvZXMgbm90IGNyZWF0ZSBleHRlcm5hbCBBUEkgc2VjcmV0IGJ5IGRlZmF1bHQnLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdTZWNyZXRzKHN0YWNrLCAnVGVzdFNlY3JldHMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgLy8gU2hvdWxkIG9ubHkgaGF2ZSAxIHNlY3JldCAoZ2F0ZXdheSB0b2tlbilcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpTZWNyZXRzTWFuYWdlcjo6U2VjcmV0JywgMSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjcmVhdGVzIGV4dGVybmFsIEFQSSBzZWNyZXQgd2hlbiBlbmFibGVkJywgKCkgPT4ge1xuICAgICAgbmV3IE9wZW5DbGF3U2VjcmV0cyhzdGFjaywgJ1Rlc3RTZWNyZXRzJywge1xuICAgICAgICBjcmVhdGVFeHRlcm5hbEFwaVNlY3JldDogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgICAvLyBTaG91bGQgaGF2ZSAyIHNlY3JldHMgbm93XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6U2VjcmV0c01hbmFnZXI6OlNlY3JldCcsIDIpO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U2VjcmV0c01hbmFnZXI6OlNlY3JldCcsIHtcbiAgICAgICAgTmFtZTogJ29wZW5jbGF3L2V4dGVybmFsLWFwaXMnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdleHRlcm5hbCBBUEkgc2VjcmV0IGhhcyBjb3JyZWN0IHN0cnVjdHVyZSB3aXRoIHBsYWNlaG9sZGVycycsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1NlY3JldHMoc3RhY2ssICdUZXN0U2VjcmV0cycsIHtcbiAgICAgICAgY3JlYXRlRXh0ZXJuYWxBcGlTZWNyZXQ6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlNlY3JldHNNYW5hZ2VyOjpTZWNyZXQnLCB7XG4gICAgICAgIE5hbWU6ICdvcGVuY2xhdy9leHRlcm5hbC1hcGlzJyxcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgQU5USFJPUElDX0FQSV9LRVk6ICcnLFxuICAgICAgICAgIE9QRU5BSV9BUElfS0VZOiAnJyxcbiAgICAgICAgfSksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2V4cG9zZXMgZXh0ZXJuYWxBcGlTZWNyZXQgcHJvcGVydHkgd2hlbiBjcmVhdGVkJywgKCkgPT4ge1xuICAgICAgY29uc3Qgc2VjcmV0cyA9IG5ldyBPcGVuQ2xhd1NlY3JldHMoc3RhY2ssICdUZXN0U2VjcmV0cycsIHtcbiAgICAgICAgY3JlYXRlRXh0ZXJuYWxBcGlTZWNyZXQ6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGV4cGVjdChzZWNyZXRzLmV4dGVybmFsQXBpU2VjcmV0KS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXh0ZXJuYWxBcGlTZWNyZXQgaXMgdW5kZWZpbmVkIHdoZW4gbm90IGNyZWF0ZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBzZWNyZXRzID0gbmV3IE9wZW5DbGF3U2VjcmV0cyhzdGFjaywgJ1Rlc3RTZWNyZXRzJyk7XG4gICAgICBleHBlY3Qoc2VjcmV0cy5leHRlcm5hbEFwaVNlY3JldCkudG9CZVVuZGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19