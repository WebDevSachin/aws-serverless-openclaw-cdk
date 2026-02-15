import {
  ContainerConfig,
  BedrockConfig,
  NetworkingConfig,
  StorageConfig,
  LoggingConfig,
} from './types';

/**
 * Default container configuration
 */
export const DEFAULT_CONTAINER_CONFIG: ContainerConfig = {
  imageName: 'openclaw',
  imageTag: 'latest',
  containerPort: 18789,
  healthCheckPath: '/',
  environment: {
    NODE_ENV: 'production',
    PORT: '18789',
  },
};

/**
 * Bedrock model options
 * Updated with latest models from Anthropic, Amazon, and other providers
 */
export const BEDROCK_MODELS = {
  /**
   * Claude 3.5 Sonnet v2 - Best coding model (S-tier on LM Arena)
   * Best for: Complex coding, reasoning, agentic tasks, visual processing
   * Price: $3/M input, $15/M output
   */
  CLAUDE_3_5_SONNET: 'anthropic.claude-3-5-sonnet-20241022-v2:0',

  /**
   * Claude 3.5 Haiku - Fastest, most cost-effective Anthropic model
   * Best for: Quick responses, simple tasks, high throughput
   * Price: $0.80/M input, $4/M output
   */
  CLAUDE_3_5_HAIKU: 'anthropic.claude-3-5-haiku-20241022-v1:0',

  /**
   * Claude 3 Opus - Highest capability Anthropic model
   * Best for: Complex analysis, research, creative writing
   * Price: $15/M input, $75/M output
   */
  CLAUDE_3_OPUS: 'anthropic.claude-3-opus-20240229-v1:0',

  /**
   * Claude 3 Sonnet - Previous generation (legacy)
   */
  CLAUDE_3_SONNET: 'anthropic.claude-3-sonnet-20240229-v1:0',

  /**
   * Claude 3 Haiku - Previous generation (legacy)
   */
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',

  /**
   * Amazon Nova Pro - Balanced multimodal model
   * Best for: General tasks, multimodal understanding
   * Price: $0.80/M input, $3.20/M output
   */
  NOVA_PRO: 'amazon.nova-pro-v1:0',

  /**
   * Amazon Nova Lite - Fast and cost-effective
   * Best for: Quick responses, simple tasks
   * Price: $0.06/M input, $0.24/M output
   */
  NOVA_LITE: 'amazon.nova-lite-v1:0',

  /**
   * Amazon Nova Micro - Cheapest Bedrock model
   * Best for: High throughput, simple tasks
   * Price: $0.035/M input, $0.14/M output
   */
  NOVA_MICRO: 'amazon.nova-micro-v1:0',

  /**
   * Meta Llama 3.3 70B - Strong open model
   * Best for: Cost-effective reasoning, open-source preference
   * Price: ~$0.72/M input, ~$0.72/M output
   */
  LLAMA_3_3_70B: 'meta.llama3-3-70b-instruct-v1:0',

  /**
   * Meta Llama 3.2 90B Vision - Multimodal open model
   * Best for: Vision tasks, multimodal understanding
   * Price: ~$0.80/M input, ~$1.60/M output
   */
  LLAMA_3_2_90B: 'meta.llama3-2-90b-instruct-v1:0',

  /**
   * Mistral Large 2 - European SOTA model
   * Best for: Reasoning, multilingual, coding
   * Price: ~$2/M input, ~$6/M output
   */
  MISTRAL_LARGE_2: 'mistral.mistral-large-2407-v1:0',

  /**
   * Cohere Command R+ - Enterprise retrieval
   * Best for: RAG, enterprise applications
   * Price: ~$3/M input, ~$15/M output
   */
  COHERE_COMMAND_R_PLUS: 'cohere.command-r-plus-v1:0',
} as const;

/**
 * Default Bedrock configuration
 * Uses Claude 3.5 Sonnet for best performance
 * Falls back to Nova Micro if region doesn't support Claude
 */
export const DEFAULT_BEDROCK_CONFIG: BedrockConfig = {
  modelId: BEDROCK_MODELS.CLAUDE_3_5_SONNET,  // Best coding model (S-tier)
  region: 'us-east-1',  // Claude models available here
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.9,
};

/**
 * Budget Bedrock configuration
 * Uses Nova Micro for minimal cost
 */
export const BUDGET_BEDROCK_CONFIG: BedrockConfig = {
  modelId: BEDROCK_MODELS.NOVA_MICRO,  // Cheapest at $0.035/M input
  region: 'ap-south-1',
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.9,
};

/**
 * Default networking configuration
 */
export const DEFAULT_NETWORKING_CONFIG: NetworkingConfig = {
  createVpc: true,
  vpcCidr: '10.0.0.0/16',
  maxAzs: 2,
  natGateways: 1,
  publicSubnets: false,
};

/**
 * Cost optimization configurations
 * 
 * Use these presets to minimize costs:
 * 
 * 1. MINIMAL (~$15/month) - Development/testing
 *    - No NAT Gateway (public subnets)
 *    - Fargate Spot
 *    - NLB instead of ALB
 *    - Minimal CPU/memory
 * 
 * 2. LOW_TRAFFIC (~$25/month) - Personal use with intermittent traffic
 *    - NAT Gateway for security
 *    - API Gateway instead of ALB
 *    - Scheduled auto-stop/start
 * 
 * 3. SPOT (~$20/month) - Fault-tolerant workloads
 *    - Fargate Spot (70% savings)
 *    - NAT Gateway
 *    - ALB
 */
export const COST_OPTIMIZATION = {
  /**
   * Minimal cost for development/testing (~$15/month)
   * Trade-offs: Public subnets, can be interrupted
   */
  minimal: {
    cpu: 256,
    memoryMiB: 512,
    useNatGateway: false,      // Saves ~$32/month
    useFargateSpot: true,      // Saves ~70% on compute
    useNlbInsteadOfAlb: true,  // Saves ~$17/month
    desiredCount: 1,
  },

  /**
   * Low traffic with API Gateway (~$25/month)
   * Trade-offs: Pay per request, less routing flexibility
   */
  lowTraffic: {
    cpu: 512,
    memoryMiB: 1024,
    useNatGateway: true,       // Keep for security
    useApiGateway: true,       // Saves ~$20/month at low traffic
    desiredCount: 1,
  },

  /**
   * Scheduled stop/start (~$12/month if stopped 12h/day)
   * Trade-offs: Not available 24/7
   */
  scheduled: {
    cpu: 512,
    memoryMiB: 1024,
    useNatGateway: true,
    autoStopSchedule: '0 18 * * ?',   // 6 PM daily
    autoStartSchedule: '0 8 * * ?',   // 8 AM daily
    desiredCount: 1,
  },

  /**
   * Spot instances only (~$35/month, 70% compute savings)
   * Trade-offs: Tasks can be interrupted
   */
  spot: {
    cpu: 512,
    memoryMiB: 1024,
    useNatGateway: true,
    useFargateSpot: true,
    desiredCount: 1,
  },

  /**
   * Manual control (scale to 0 when not needed)
   * Cost: ~$35/month when running, ~$3/month when stopped
   */
  manual: {
    cpu: 512,
    memoryMiB: 1024,
    useNatGateway: true,
    desiredCount: 1,  // Change to 0 to stop
  },
} as const;

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  enableEfs: true,
  throughputMode: 'bursting',
  lifecyclePolicy: 'AFTER_30_DAYS',
};

/**
 * Default logging configuration
 */
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  retentionDays: 7,
  encryption: true,
};

/**
 * Resource sizing configurations based on workload
 */
export const RESOURCE_SIZING = {
  /**
   * Minimal configuration for testing/development
   */
  minimal: {
    cpu: 256,
    memoryMiB: 512,
  },

  /**
   * Standard configuration for production workloads
   */
  standard: {
    cpu: 512,
    memoryMiB: 1024,
  },

  /**
   * High-performance configuration for demanding workloads
   */
  highPerformance: {
    cpu: 1024,
    memoryMiB: 2048,
  },
} as const;

/**
 * Recommended Bedrock models by use case
 */
export const BEDROCK_RECOMMENDATIONS = {
  /** Best overall for coding */
  CODING: BEDROCK_MODELS.CLAUDE_3_5_SONNET,
  /** Best value (quality/price) */
  VALUE: BEDROCK_MODELS.NOVA_PRO,
  /** Cheapest option */
  BUDGET: BEDROCK_MODELS.NOVA_MICRO,
  /** Best for complex tasks */
  COMPLEX: BEDROCK_MODELS.CLAUDE_3_OPUS,
  /** Best open-source model */
  OPEN_SOURCE: BEDROCK_MODELS.LLAMA_3_3_70B,
  /** Best for vision tasks */
  VISION: BEDROCK_MODELS.LLAMA_3_2_90B,
} as const;

/**
 * Bedrock model pricing (per million tokens)
 */
export const BEDROCK_PRICING: Record<string, { input: number; output: number }> = {
  [BEDROCK_MODELS.CLAUDE_3_5_SONNET]: { input: 3.0, output: 15.0 },
  [BEDROCK_MODELS.CLAUDE_3_5_HAIKU]: { input: 0.80, output: 4.0 },
  [BEDROCK_MODELS.CLAUDE_3_OPUS]: { input: 15.0, output: 75.0 },
  [BEDROCK_MODELS.CLAUDE_3_SONNET]: { input: 3.0, output: 15.0 },
  [BEDROCK_MODELS.CLAUDE_3_HAIKU]: { input: 0.25, output: 1.25 },
  [BEDROCK_MODELS.NOVA_PRO]: { input: 0.80, output: 3.20 },
  [BEDROCK_MODELS.NOVA_LITE]: { input: 0.06, output: 0.24 },
  [BEDROCK_MODELS.NOVA_MICRO]: { input: 0.035, output: 0.14 },
  [BEDROCK_MODELS.LLAMA_3_3_70B]: { input: 0.72, output: 0.72 },
  [BEDROCK_MODELS.LLAMA_3_2_90B]: { input: 0.80, output: 1.60 },
  [BEDROCK_MODELS.MISTRAL_LARGE_2]: { input: 2.0, output: 6.0 },
  [BEDROCK_MODELS.COHERE_COMMAND_R_PLUS]: { input: 3.0, output: 15.0 },
};

/**
 * AWS regions where Bedrock is available
 * Note: Not all models are available in all regions
 * Claude 3.5 Sonnet: us-east-1, us-west-2, eu-central-1, eu-west-3
 * Nova models: Available in most regions including ap-south-1
 */
export const BEDROCK_REGIONS = [
  'us-east-1',      // Full model support including Claude 3.5
  'us-west-2',      // Full model support including Claude 3.5
  'ap-south-1',     // Nova models only (no Claude)
  'ap-northeast-1', // Nova models only
  'ap-southeast-1', // Nova models only
  'ap-southeast-2', // Nova models only
  'eu-central-1',   // Claude 3.5 available
  'eu-west-1',      // Nova models only
  'eu-west-3',      // Claude 3.5 available
] as const;

/**
 * Regions supporting Claude 3.5 Sonnet
 */
export const CLAUDE_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-3',
] as const;

// Re-export all model definitions
export * from './models';
