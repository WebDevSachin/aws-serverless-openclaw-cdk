import * as cdk from 'aws-cdk-lib';
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

  /**
   * OpenRouter API key for accessing various models including Kimi
   * If provided, will create a secret with this value
   */
  openRouterApiKey?: string;

  /**
   * Kimi API key for accessing Kimi for Coding model directly
   * If provided, will create a secret with this value
   * Format: sk-kimi-...
   */
  kimiApiKey?: string;
}

/**
 * OpenClaw Secrets - Secrets Manager for sensitive configuration
 *
 * Creates:
 * - Gateway token secret (auto-generated 32-char alphanumeric)
 * - Optional external API keys secret (placeholder for user to fill)
 */
export class OpenClawSecrets extends Construct {
  public readonly gatewayTokenSecret: secretsmanager.ISecret;
  public readonly externalApiSecret?: secretsmanager.ISecret;
  public readonly openRouterApiSecret?: secretsmanager.ISecret;
  public readonly kimiApiSecret?: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: OpenClawSecretsProps) {
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
        secretStringValue: cdk.SecretValue.unsafePlainText(
          JSON.stringify({
            ANTHROPIC_API_KEY: '',
            OPENAI_API_KEY: '',
          })
        ),
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });
    }

    // OpenRouter API key for accessing various models (Kimi, Claude, GPT, etc.)
    if (props?.openRouterApiKey) {
      this.openRouterApiSecret = new secretsmanager.Secret(this, 'OpenRouterApiSecret', {
        secretName: `openclaw/openrouter-api-key-${stackName}`,
        secretStringValue: cdk.SecretValue.unsafePlainText(
          JSON.stringify({ apiKey: props.openRouterApiKey })
        ),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // Kimi API key for direct Kimi API access (primary model provider)
    if (props?.kimiApiKey) {
      this.kimiApiSecret = new secretsmanager.Secret(this, 'KimiApiSecret', {
        secretName: `openclaw/kimi-api-key-${stackName}`,
        secretStringValue: cdk.SecretValue.unsafePlainText(
          JSON.stringify({ apiKey: props.kimiApiKey })
        ),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }
  }
}
