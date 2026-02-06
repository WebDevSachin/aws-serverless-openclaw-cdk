import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
/**
 * Properties for OpenClawSecrets construct
 */
export interface OpenClawSecretsProps {
    /**
     * Whether to create the external API secrets
     * @default false
     */
    createExternalApiSecret?: boolean;
}
/**
 * OpenClaw Secrets - Secrets Manager for sensitive configuration
 *
 * Creates:
 * - Gateway token secret (auto-generated 32-char alphanumeric)
 * - Optional external API keys secret (placeholder for user to fill)
 */
export declare class OpenClawSecrets extends Construct {
    readonly gatewayTokenSecret: secretsmanager.ISecret;
    readonly externalApiSecret?: secretsmanager.ISecret;
    constructor(scope: Construct, id: string, props?: OpenClawSecretsProps);
}
