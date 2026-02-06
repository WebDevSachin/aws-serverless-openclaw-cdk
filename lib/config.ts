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
  containerPort: 3000,
  healthCheckPath: '/',  // Changed to root for nginx
  environment: {
    NODE_ENV: 'production',
    PORT: '3000',
  },
};

/**
 * Default Bedrock configuration
 * Uses Claude 3.5 Haiku for cost optimization
 * Updated to use model available in ap-south-1
 */
export const DEFAULT_BEDROCK_CONFIG: BedrockConfig = {
  modelId: 'amazon.nova-micro-v1:0',  // Cheapest model, no use case submission required
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
 * Bedrock model options
 */
export const BEDROCK_MODELS = {
  /**
   * Claude 3.5 Haiku - Fastest, most cost-effective
   * Best for: Quick responses, simple tasks, high throughput
   */
  CLAUDE_3_5_HAIKU: 'anthropic.claude-3-5-haiku-20241022-v1:0',

  /**
   * Claude 3.5 Sonnet - Balanced performance and cost
   * Best for: Complex reasoning, coding, multi-step tasks
   */
  CLAUDE_3_5_SONNET: 'anthropic.claude-3-5-sonnet-20241022-v2:0',

  /**
   * Claude 3 Opus - Highest capability
   * Best for: Complex analysis, research, creative writing
   */
  CLAUDE_3_OPUS: 'anthropic.claude-3-opus-20240229-v1:0',

  /**
   * Claude 3 Sonnet - Previous generation
   */
  CLAUDE_3_SONNET: 'anthropic.claude-3-sonnet-20240229-v1:0',

  /**
   * Claude 3 Haiku - Previous generation
   */
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
} as const;

/**
 * AWS regions where Bedrock is available
 */
export const BEDROCK_REGIONS = [
  'us-east-1',
  'us-west-2',
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-3',
] as const;
