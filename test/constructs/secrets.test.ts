import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { OpenClawSecrets } from '../../lib/constructs/secrets';

describe('OpenClawSecrets', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

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
      new OpenClawSecrets(stack, 'TestSecrets');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'openclaw/gateway-token',
      });
    });

    test('gateway token secret generates 32-char alphanumeric password', () => {
      new OpenClawSecrets(stack, 'TestSecrets');
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'openclaw/gateway-token',
        GenerateSecretString: Match.objectLike({
          SecretStringTemplate: '{"token":""}',
          GenerateStringKey: 'token',
          ExcludePunctuation: true,
          PasswordLength: 32,
        }),
      });
    });

    test('gateway token secret has retain removal policy', () => {
      new OpenClawSecrets(stack, 'TestSecrets');
      const template = Template.fromStack(stack);

      template.hasResource('AWS::SecretsManager::Secret', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('exposes gatewayTokenSecret property', () => {
      const secrets = new OpenClawSecrets(stack, 'TestSecrets');
      expect(secrets.gatewayTokenSecret).toBeDefined();
    });
  });

  describe('External API Secret', () => {
    test('does not create external API secret by default', () => {
      new OpenClawSecrets(stack, 'TestSecrets');
      const template = Template.fromStack(stack);

      // Should only have 1 secret (gateway token)
      template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    });

    test('creates external API secret when enabled', () => {
      new OpenClawSecrets(stack, 'TestSecrets', {
        createExternalApiSecret: true,
      });
      const template = Template.fromStack(stack);

      // Should have 2 secrets now
      template.resourceCountIs('AWS::SecretsManager::Secret', 2);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'openclaw/external-apis',
      });
    });

    test('external API secret has correct structure with placeholders', () => {
      new OpenClawSecrets(stack, 'TestSecrets', {
        createExternalApiSecret: true,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'openclaw/external-apis',
        SecretString: JSON.stringify({
          ANTHROPIC_API_KEY: '',
          OPENAI_API_KEY: '',
        }),
      });
    });

    test('exposes externalApiSecret property when created', () => {
      const secrets = new OpenClawSecrets(stack, 'TestSecrets', {
        createExternalApiSecret: true,
      });
      expect(secrets.externalApiSecret).toBeDefined();
    });

    test('externalApiSecret is undefined when not created', () => {
      const secrets = new OpenClawSecrets(stack, 'TestSecrets');
      expect(secrets.externalApiSecret).toBeUndefined();
    });
  });
});
