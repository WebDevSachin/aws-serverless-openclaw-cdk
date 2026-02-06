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
exports.OpenClawSecrets = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const constructs_1 = require("constructs");
/**
 * OpenClaw Secrets - Secrets Manager for sensitive configuration
 *
 * Creates:
 * - Gateway token secret (auto-generated 32-char alphanumeric)
 * - Optional external API keys secret (placeholder for user to fill)
 */
class OpenClawSecrets extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Gateway token secret with auto-generated password
        // Use unique secret name to avoid conflicts with deleted secrets
        const stackName = cdk.Stack.of(this).stackName.toLowerCase();
        this.gatewayTokenSecret = new secretsmanager.Secret(this, 'GatewayTokenSecret', {
            secretName: `openclaw/gateway-token-${stackName}`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ token: '' }),
                generateStringKey: 'token',
                excludePunctuation: true,
                passwordLength: 32,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Optional external API secret with placeholder values
        if (props?.createExternalApiSecret) {
            this.externalApiSecret = new secretsmanager.Secret(this, 'ExternalApiSecret', {
                secretName: 'openclaw/external-apis',
                secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
                    ANTHROPIC_API_KEY: '',
                    OPENAI_API_KEY: '',
                })),
                removalPolicy: cdk.RemovalPolicy.RETAIN,
            });
        }
    }
}
exports.OpenClawSecrets = OpenClawSecrets;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zdHJ1Y3RzL3NlY3JldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0VBQWlFO0FBQ2pFLDJDQUF1QztBQWF2Qzs7Ozs7O0dBTUc7QUFDSCxNQUFhLGVBQWdCLFNBQVEsc0JBQVM7SUFJNUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLG9EQUFvRDtRQUNwRCxpRUFBaUU7UUFDakUsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzlFLFVBQVUsRUFBRSwwQkFBMEIsU0FBUyxFQUFFO1lBQ2pELG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNuRCxpQkFBaUIsRUFBRSxPQUFPO2dCQUMxQixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixjQUFjLEVBQUUsRUFBRTthQUNuQjtZQUNELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgsdURBQXVEO1FBQ3ZELElBQUksS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7Z0JBQzVFLFVBQVUsRUFBRSx3QkFBd0I7Z0JBQ3BDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNiLGlCQUFpQixFQUFFLEVBQUU7b0JBQ3JCLGNBQWMsRUFBRSxFQUFFO2lCQUNuQixDQUFDLENBQ0g7Z0JBQ0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUN4QyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBbkNELDBDQW1DQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbi8qKlxuICogUHJvcGVydGllcyBmb3IgT3BlbkNsYXdTZWNyZXRzIGNvbnN0cnVjdFxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9wZW5DbGF3U2VjcmV0c1Byb3BzIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIHRoZSBleHRlcm5hbCBBUEkgc2VjcmV0c1xuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgY3JlYXRlRXh0ZXJuYWxBcGlTZWNyZXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE9wZW5DbGF3IFNlY3JldHMgLSBTZWNyZXRzIE1hbmFnZXIgZm9yIHNlbnNpdGl2ZSBjb25maWd1cmF0aW9uXG4gKlxuICogQ3JlYXRlczpcbiAqIC0gR2F0ZXdheSB0b2tlbiBzZWNyZXQgKGF1dG8tZ2VuZXJhdGVkIDMyLWNoYXIgYWxwaGFudW1lcmljKVxuICogLSBPcHRpb25hbCBleHRlcm5hbCBBUEkga2V5cyBzZWNyZXQgKHBsYWNlaG9sZGVyIGZvciB1c2VyIHRvIGZpbGwpXG4gKi9cbmV4cG9ydCBjbGFzcyBPcGVuQ2xhd1NlY3JldHMgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgZ2F0ZXdheVRva2VuU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5JU2VjcmV0O1xuICBwdWJsaWMgcmVhZG9ubHkgZXh0ZXJuYWxBcGlTZWNyZXQ/OiBzZWNyZXRzbWFuYWdlci5JU2VjcmV0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogT3BlbkNsYXdTZWNyZXRzUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8gR2F0ZXdheSB0b2tlbiBzZWNyZXQgd2l0aCBhdXRvLWdlbmVyYXRlZCBwYXNzd29yZFxuICAgIC8vIFVzZSB1bmlxdWUgc2VjcmV0IG5hbWUgdG8gYXZvaWQgY29uZmxpY3RzIHdpdGggZGVsZXRlZCBzZWNyZXRzXG4gICAgY29uc3Qgc3RhY2tOYW1lID0gY2RrLlN0YWNrLm9mKHRoaXMpLnN0YWNrTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMuZ2F0ZXdheVRva2VuU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnR2F0ZXdheVRva2VuU2VjcmV0Jywge1xuICAgICAgc2VjcmV0TmFtZTogYG9wZW5jbGF3L2dhdGV3YXktdG9rZW4tJHtzdGFja05hbWV9YCxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IHRva2VuOiAnJyB9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICd0b2tlbicsXG4gICAgICAgIGV4Y2x1ZGVQdW5jdHVhdGlvbjogdHJ1ZSxcbiAgICAgICAgcGFzc3dvcmRMZW5ndGg6IDMyLFxuICAgICAgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBPcHRpb25hbCBleHRlcm5hbCBBUEkgc2VjcmV0IHdpdGggcGxhY2Vob2xkZXIgdmFsdWVzXG4gICAgaWYgKHByb3BzPy5jcmVhdGVFeHRlcm5hbEFwaVNlY3JldCkge1xuICAgICAgdGhpcy5leHRlcm5hbEFwaVNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0V4dGVybmFsQXBpU2VjcmV0Jywge1xuICAgICAgICBzZWNyZXROYW1lOiAnb3BlbmNsYXcvZXh0ZXJuYWwtYXBpcycsXG4gICAgICAgIHNlY3JldFN0cmluZ1ZhbHVlOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KFxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIEFOVEhST1BJQ19BUElfS0VZOiAnJyxcbiAgICAgICAgICAgIE9QRU5BSV9BUElfS0VZOiAnJyxcbiAgICAgICAgICB9KVxuICAgICAgICApLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==