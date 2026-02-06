import { ContainerConfig, BedrockConfig, NetworkingConfig, StorageConfig, LoggingConfig } from './types';
/**
 * Default container configuration
 */
export declare const DEFAULT_CONTAINER_CONFIG: ContainerConfig;
/**
 * Default Bedrock configuration
 * Uses Claude 3.5 Haiku for cost optimization
 * Updated to use model available in ap-south-1
 */
export declare const DEFAULT_BEDROCK_CONFIG: BedrockConfig;
/**
 * Default networking configuration
 */
export declare const DEFAULT_NETWORKING_CONFIG: NetworkingConfig;
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
export declare const COST_OPTIMIZATION: {
    /**
     * Minimal cost for development/testing (~$15/month)
     * Trade-offs: Public subnets, can be interrupted
     */
    readonly minimal: {
        readonly cpu: 256;
        readonly memoryMiB: 512;
        readonly useNatGateway: false;
        readonly useFargateSpot: true;
        readonly useNlbInsteadOfAlb: true;
        readonly desiredCount: 1;
    };
    /**
     * Low traffic with API Gateway (~$25/month)
     * Trade-offs: Pay per request, less routing flexibility
     */
    readonly lowTraffic: {
        readonly cpu: 512;
        readonly memoryMiB: 1024;
        readonly useNatGateway: true;
        readonly useApiGateway: true;
        readonly desiredCount: 1;
    };
    /**
     * Scheduled stop/start (~$12/month if stopped 12h/day)
     * Trade-offs: Not available 24/7
     */
    readonly scheduled: {
        readonly cpu: 512;
        readonly memoryMiB: 1024;
        readonly useNatGateway: true;
        readonly autoStopSchedule: "0 18 * * ?";
        readonly autoStartSchedule: "0 8 * * ?";
        readonly desiredCount: 1;
    };
    /**
     * Spot instances only (~$35/month, 70% compute savings)
     * Trade-offs: Tasks can be interrupted
     */
    readonly spot: {
        readonly cpu: 512;
        readonly memoryMiB: 1024;
        readonly useNatGateway: true;
        readonly useFargateSpot: true;
        readonly desiredCount: 1;
    };
    /**
     * Manual control (scale to 0 when not needed)
     * Cost: ~$35/month when running, ~$3/month when stopped
     */
    readonly manual: {
        readonly cpu: 512;
        readonly memoryMiB: 1024;
        readonly useNatGateway: true;
        readonly desiredCount: 1;
    };
};
/**
 * Default storage configuration
 */
export declare const DEFAULT_STORAGE_CONFIG: StorageConfig;
/**
 * Default logging configuration
 */
export declare const DEFAULT_LOGGING_CONFIG: LoggingConfig;
/**
 * Resource sizing configurations based on workload
 */
export declare const RESOURCE_SIZING: {
    /**
     * Minimal configuration for testing/development
     */
    readonly minimal: {
        readonly cpu: 256;
        readonly memoryMiB: 512;
    };
    /**
     * Standard configuration for production workloads
     */
    readonly standard: {
        readonly cpu: 512;
        readonly memoryMiB: 1024;
    };
    /**
     * High-performance configuration for demanding workloads
     */
    readonly highPerformance: {
        readonly cpu: 1024;
        readonly memoryMiB: 2048;
    };
};
/**
 * Bedrock model options
 */
export declare const BEDROCK_MODELS: {
    /**
     * Claude 3.5 Haiku - Fastest, most cost-effective
     * Best for: Quick responses, simple tasks, high throughput
     */
    readonly CLAUDE_3_5_HAIKU: "anthropic.claude-3-5-haiku-20241022-v1:0";
    /**
     * Claude 3.5 Sonnet - Balanced performance and cost
     * Best for: Complex reasoning, coding, multi-step tasks
     */
    readonly CLAUDE_3_5_SONNET: "anthropic.claude-3-5-sonnet-20241022-v2:0";
    /**
     * Claude 3 Opus - Highest capability
     * Best for: Complex analysis, research, creative writing
     */
    readonly CLAUDE_3_OPUS: "anthropic.claude-3-opus-20240229-v1:0";
    /**
     * Claude 3 Sonnet - Previous generation
     */
    readonly CLAUDE_3_SONNET: "anthropic.claude-3-sonnet-20240229-v1:0";
    /**
     * Claude 3 Haiku - Previous generation
     */
    readonly CLAUDE_3_HAIKU: "anthropic.claude-3-haiku-20240307-v1:0";
};
/**
 * AWS regions where Bedrock is available
 */
export declare const BEDROCK_REGIONS: readonly ["us-east-1", "us-west-2", "ap-northeast-1", "ap-southeast-1", "ap-southeast-2", "eu-central-1", "eu-west-1", "eu-west-3"];
