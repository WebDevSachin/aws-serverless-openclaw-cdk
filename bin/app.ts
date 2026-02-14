#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { OpenClawStack } from '../lib/openclaw-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Stack name from context or default
const stackName = app.node.tryGetContext('stackName') || 'OpenClawStack';

// Create the OpenClaw stack
const stack = new OpenClawStack(app, stackName, {
  env,
  description: 'OpenClaw - Self-hosted autonomous agent platform on AWS',
  
  // Stack configuration
  cpu: app.node.tryGetContext('cpu') || 512,
  memoryMiB: app.node.tryGetContext('memoryMiB') || 1024,
  bedrockModel: app.node.tryGetContext('bedrockModel') || 'anthropic.claude-3-5-haiku-20241022-v1:0',
  useGraviton: app.node.tryGetContext('useGraviton') === 'true',  // Default false for x86_64 compatibility
  
  // Optional: Custom VPC ID
  vpcId: app.node.tryGetContext('vpcId'),

  // OpenRouter API key for various models (pass via --context openRouterApiKey=xxx)
  openRouterApiKey: app.node.tryGetContext('openRouterApiKey'),
});

// Add common tags to all resources
cdk.Tags.of(stack).add('Project', 'OpenClaw');
cdk.Tags.of(stack).add('Environment', app.node.tryGetContext('environment') || 'production');
cdk.Tags.of(stack).add('ManagedBy', 'CDK');

// Synthesize the app
app.synth();
