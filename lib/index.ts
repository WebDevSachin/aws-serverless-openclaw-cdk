/**
 * OpenClaw AWS CDK Library
 * 
 * This library provides infrastructure as code for deploying OpenClaw
 * on AWS using ECS Fargate, Bedrock, and other AWS services.
 */

// Main stack
export { OpenClawStack } from './openclaw-stack';

// Types
export type { OpenClawStackProps } from './types';

// Model configurations
export {
  // Default model
  DEFAULT_MODEL,
  // Model categories
  ANTHROPIC_MODELS,
  VALUE_MODELS,
  BUDGET_MODELS,
  ALL_MODELS,
  // Recommended models
  RECOMMENDED_MODELS,
  // Task routing
  TASK_ROUTING,
  COMPLEXITY_ROUTING,
  // Model utilities
  getModelById,
  getOpenRouterId,
  estimateCost,
  compareCosts,
  // Model types
  type ModelDefinition,
} from './models';

// Infrastructure configurations
export {
  // Bedrock
  BEDROCK_MODELS,
  BEDROCK_REGIONS,
  CLAUDE_REGIONS,
  BEDROCK_RECOMMENDATIONS,
  BEDROCK_PRICING,
  DEFAULT_BEDROCK_CONFIG,
  BUDGET_BEDROCK_CONFIG,
  // Cost optimization
  COST_OPTIMIZATION,
  RESOURCE_SIZING,
  // Defaults
  DEFAULT_CONTAINER_CONFIG,
  DEFAULT_STORAGE_CONFIG,
  DEFAULT_LOGGING_CONFIG,
} from './config';

// Constructs
export { OpenClawVpc } from './constructs/vpc';
export { OpenClawIam } from './constructs/iam';
export { OpenClawStorage } from './constructs/storage';
export { OpenClawSecrets } from './constructs/secrets';
export { OpenClawFargate } from './constructs/fargate';
export { OpenClawAlb } from './constructs/alb';
export { OpenClawLogging } from './constructs/logging';
export { OpenClawCloudFront } from './constructs/cloudfront';
export { ConfigManagement } from './constructs/config-management';
