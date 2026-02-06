"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BEDROCK_REGIONS = exports.BEDROCK_MODELS = exports.RESOURCE_SIZING = exports.DEFAULT_LOGGING_CONFIG = exports.DEFAULT_STORAGE_CONFIG = exports.COST_OPTIMIZATION = exports.DEFAULT_NETWORKING_CONFIG = exports.DEFAULT_BEDROCK_CONFIG = exports.DEFAULT_CONTAINER_CONFIG = void 0;
/**
 * Default container configuration
 */
exports.DEFAULT_CONTAINER_CONFIG = {
    imageName: 'openclaw',
    imageTag: 'latest',
    containerPort: 3000,
    healthCheckPath: '/', // Changed to root for nginx
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
exports.DEFAULT_BEDROCK_CONFIG = {
    modelId: 'amazon.nova-micro-v1:0', // Cheapest model, no use case submission required
    region: 'ap-south-1',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
};
/**
 * Default networking configuration
 */
exports.DEFAULT_NETWORKING_CONFIG = {
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
exports.COST_OPTIMIZATION = {
    /**
     * Minimal cost for development/testing (~$15/month)
     * Trade-offs: Public subnets, can be interrupted
     */
    minimal: {
        cpu: 256,
        memoryMiB: 512,
        useNatGateway: false, // Saves ~$32/month
        useFargateSpot: true, // Saves ~70% on compute
        useNlbInsteadOfAlb: true, // Saves ~$17/month
        desiredCount: 1,
    },
    /**
     * Low traffic with API Gateway (~$25/month)
     * Trade-offs: Pay per request, less routing flexibility
     */
    lowTraffic: {
        cpu: 512,
        memoryMiB: 1024,
        useNatGateway: true, // Keep for security
        useApiGateway: true, // Saves ~$20/month at low traffic
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
        autoStopSchedule: '0 18 * * ?', // 6 PM daily
        autoStartSchedule: '0 8 * * ?', // 8 AM daily
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
        desiredCount: 1, // Change to 0 to stop
    },
};
/**
 * Default storage configuration
 */
exports.DEFAULT_STORAGE_CONFIG = {
    enableEfs: true,
    throughputMode: 'bursting',
    lifecyclePolicy: 'AFTER_30_DAYS',
};
/**
 * Default logging configuration
 */
exports.DEFAULT_LOGGING_CONFIG = {
    retentionDays: 7,
    encryption: true,
};
/**
 * Resource sizing configurations based on workload
 */
exports.RESOURCE_SIZING = {
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
};
/**
 * Bedrock model options
 */
exports.BEDROCK_MODELS = {
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
};
/**
 * AWS regions where Bedrock is available
 */
exports.BEDROCK_REGIONS = [
    'us-east-1',
    'us-west-2',
    'ap-northeast-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'eu-central-1',
    'eu-west-1',
    'eu-west-3',
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFRQTs7R0FFRztBQUNVLFFBQUEsd0JBQXdCLEdBQW9CO0lBQ3ZELFNBQVMsRUFBRSxVQUFVO0lBQ3JCLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGVBQWUsRUFBRSxHQUFHLEVBQUcsNEJBQTRCO0lBQ25ELFdBQVcsRUFBRTtRQUNYLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLElBQUksRUFBRSxNQUFNO0tBQ2I7Q0FDRixDQUFDO0FBRUY7Ozs7R0FJRztBQUNVLFFBQUEsc0JBQXNCLEdBQWtCO0lBQ25ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRyxrREFBa0Q7SUFDdEYsTUFBTSxFQUFFLFlBQVk7SUFDcEIsU0FBUyxFQUFFLElBQUk7SUFDZixXQUFXLEVBQUUsR0FBRztJQUNoQixJQUFJLEVBQUUsR0FBRztDQUNWLENBQUM7QUFFRjs7R0FFRztBQUNVLFFBQUEseUJBQXlCLEdBQXFCO0lBQ3pELFNBQVMsRUFBRSxJQUFJO0lBQ2YsT0FBTyxFQUFFLGFBQWE7SUFDdEIsTUFBTSxFQUFFLENBQUM7SUFDVCxXQUFXLEVBQUUsQ0FBQztJQUNkLGFBQWEsRUFBRSxLQUFLO0NBQ3JCLENBQUM7QUFFRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7QUFDVSxRQUFBLGlCQUFpQixHQUFHO0lBQy9COzs7T0FHRztJQUNILE9BQU8sRUFBRTtRQUNQLEdBQUcsRUFBRSxHQUFHO1FBQ1IsU0FBUyxFQUFFLEdBQUc7UUFDZCxhQUFhLEVBQUUsS0FBSyxFQUFPLG1CQUFtQjtRQUM5QyxjQUFjLEVBQUUsSUFBSSxFQUFPLHdCQUF3QjtRQUNuRCxrQkFBa0IsRUFBRSxJQUFJLEVBQUcsbUJBQW1CO1FBQzlDLFlBQVksRUFBRSxDQUFDO0tBQ2hCO0lBRUQ7OztPQUdHO0lBQ0gsVUFBVSxFQUFFO1FBQ1YsR0FBRyxFQUFFLEdBQUc7UUFDUixTQUFTLEVBQUUsSUFBSTtRQUNmLGFBQWEsRUFBRSxJQUFJLEVBQVEsb0JBQW9CO1FBQy9DLGFBQWEsRUFBRSxJQUFJLEVBQVEsa0NBQWtDO1FBQzdELFlBQVksRUFBRSxDQUFDO0tBQ2hCO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxFQUFFO1FBQ1QsR0FBRyxFQUFFLEdBQUc7UUFDUixTQUFTLEVBQUUsSUFBSTtRQUNmLGFBQWEsRUFBRSxJQUFJO1FBQ25CLGdCQUFnQixFQUFFLFlBQVksRUFBSSxhQUFhO1FBQy9DLGlCQUFpQixFQUFFLFdBQVcsRUFBSSxhQUFhO1FBQy9DLFlBQVksRUFBRSxDQUFDO0tBQ2hCO0lBRUQ7OztPQUdHO0lBQ0gsSUFBSSxFQUFFO1FBQ0osR0FBRyxFQUFFLEdBQUc7UUFDUixTQUFTLEVBQUUsSUFBSTtRQUNmLGFBQWEsRUFBRSxJQUFJO1FBQ25CLGNBQWMsRUFBRSxJQUFJO1FBQ3BCLFlBQVksRUFBRSxDQUFDO0tBQ2hCO0lBRUQ7OztPQUdHO0lBQ0gsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEdBQUc7UUFDUixTQUFTLEVBQUUsSUFBSTtRQUNmLGFBQWEsRUFBRSxJQUFJO1FBQ25CLFlBQVksRUFBRSxDQUFDLEVBQUcsc0JBQXNCO0tBQ3pDO0NBQ08sQ0FBQztBQUVYOztHQUVHO0FBQ1UsUUFBQSxzQkFBc0IsR0FBa0I7SUFDbkQsU0FBUyxFQUFFLElBQUk7SUFDZixjQUFjLEVBQUUsVUFBVTtJQUMxQixlQUFlLEVBQUUsZUFBZTtDQUNqQyxDQUFDO0FBRUY7O0dBRUc7QUFDVSxRQUFBLHNCQUFzQixHQUFrQjtJQUNuRCxhQUFhLEVBQUUsQ0FBQztJQUNoQixVQUFVLEVBQUUsSUFBSTtDQUNqQixDQUFDO0FBRUY7O0dBRUc7QUFDVSxRQUFBLGVBQWUsR0FBRztJQUM3Qjs7T0FFRztJQUNILE9BQU8sRUFBRTtRQUNQLEdBQUcsRUFBRSxHQUFHO1FBQ1IsU0FBUyxFQUFFLEdBQUc7S0FDZjtJQUVEOztPQUVHO0lBQ0gsUUFBUSxFQUFFO1FBQ1IsR0FBRyxFQUFFLEdBQUc7UUFDUixTQUFTLEVBQUUsSUFBSTtLQUNoQjtJQUVEOztPQUVHO0lBQ0gsZUFBZSxFQUFFO1FBQ2YsR0FBRyxFQUFFLElBQUk7UUFDVCxTQUFTLEVBQUUsSUFBSTtLQUNoQjtDQUNPLENBQUM7QUFFWDs7R0FFRztBQUNVLFFBQUEsY0FBYyxHQUFHO0lBQzVCOzs7T0FHRztJQUNILGdCQUFnQixFQUFFLDBDQUEwQztJQUU1RDs7O09BR0c7SUFDSCxpQkFBaUIsRUFBRSwyQ0FBMkM7SUFFOUQ7OztPQUdHO0lBQ0gsYUFBYSxFQUFFLHVDQUF1QztJQUV0RDs7T0FFRztJQUNILGVBQWUsRUFBRSx5Q0FBeUM7SUFFMUQ7O09BRUc7SUFDSCxjQUFjLEVBQUUsd0NBQXdDO0NBQ2hELENBQUM7QUFFWDs7R0FFRztBQUNVLFFBQUEsZUFBZSxHQUFHO0lBQzdCLFdBQVc7SUFDWCxXQUFXO0lBQ1gsZ0JBQWdCO0lBQ2hCLGdCQUFnQjtJQUNoQixnQkFBZ0I7SUFDaEIsY0FBYztJQUNkLFdBQVc7SUFDWCxXQUFXO0NBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbnRhaW5lckNvbmZpZyxcbiAgQmVkcm9ja0NvbmZpZyxcbiAgTmV0d29ya2luZ0NvbmZpZyxcbiAgU3RvcmFnZUNvbmZpZyxcbiAgTG9nZ2luZ0NvbmZpZyxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogRGVmYXVsdCBjb250YWluZXIgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9DT05UQUlORVJfQ09ORklHOiBDb250YWluZXJDb25maWcgPSB7XG4gIGltYWdlTmFtZTogJ29wZW5jbGF3JyxcbiAgaW1hZ2VUYWc6ICdsYXRlc3QnLFxuICBjb250YWluZXJQb3J0OiAzMDAwLFxuICBoZWFsdGhDaGVja1BhdGg6ICcvJywgIC8vIENoYW5nZWQgdG8gcm9vdCBmb3IgbmdpbnhcbiAgZW52aXJvbm1lbnQ6IHtcbiAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICAgIFBPUlQ6ICczMDAwJyxcbiAgfSxcbn07XG5cbi8qKlxuICogRGVmYXVsdCBCZWRyb2NrIGNvbmZpZ3VyYXRpb25cbiAqIFVzZXMgQ2xhdWRlIDMuNSBIYWlrdSBmb3IgY29zdCBvcHRpbWl6YXRpb25cbiAqIFVwZGF0ZWQgdG8gdXNlIG1vZGVsIGF2YWlsYWJsZSBpbiBhcC1zb3V0aC0xXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX0JFRFJPQ0tfQ09ORklHOiBCZWRyb2NrQ29uZmlnID0ge1xuICBtb2RlbElkOiAnYW1hem9uLm5vdmEtbWljcm8tdjE6MCcsICAvLyBDaGVhcGVzdCBtb2RlbCwgbm8gdXNlIGNhc2Ugc3VibWlzc2lvbiByZXF1aXJlZFxuICByZWdpb246ICdhcC1zb3V0aC0xJyxcbiAgbWF4VG9rZW5zOiA0MDk2LFxuICB0ZW1wZXJhdHVyZTogMC43LFxuICB0b3BQOiAwLjksXG59O1xuXG4vKipcbiAqIERlZmF1bHQgbmV0d29ya2luZyBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX05FVFdPUktJTkdfQ09ORklHOiBOZXR3b3JraW5nQ29uZmlnID0ge1xuICBjcmVhdGVWcGM6IHRydWUsXG4gIHZwY0NpZHI6ICcxMC4wLjAuMC8xNicsXG4gIG1heEF6czogMixcbiAgbmF0R2F0ZXdheXM6IDEsXG4gIHB1YmxpY1N1Ym5ldHM6IGZhbHNlLFxufTtcblxuLyoqXG4gKiBDb3N0IG9wdGltaXphdGlvbiBjb25maWd1cmF0aW9uc1xuICogXG4gKiBVc2UgdGhlc2UgcHJlc2V0cyB0byBtaW5pbWl6ZSBjb3N0czpcbiAqIFxuICogMS4gTUlOSU1BTCAofiQxNS9tb250aCkgLSBEZXZlbG9wbWVudC90ZXN0aW5nXG4gKiAgICAtIE5vIE5BVCBHYXRld2F5IChwdWJsaWMgc3VibmV0cylcbiAqICAgIC0gRmFyZ2F0ZSBTcG90XG4gKiAgICAtIE5MQiBpbnN0ZWFkIG9mIEFMQlxuICogICAgLSBNaW5pbWFsIENQVS9tZW1vcnlcbiAqIFxuICogMi4gTE9XX1RSQUZGSUMgKH4kMjUvbW9udGgpIC0gUGVyc29uYWwgdXNlIHdpdGggaW50ZXJtaXR0ZW50IHRyYWZmaWNcbiAqICAgIC0gTkFUIEdhdGV3YXkgZm9yIHNlY3VyaXR5XG4gKiAgICAtIEFQSSBHYXRld2F5IGluc3RlYWQgb2YgQUxCXG4gKiAgICAtIFNjaGVkdWxlZCBhdXRvLXN0b3Avc3RhcnRcbiAqIFxuICogMy4gU1BPVCAofiQyMC9tb250aCkgLSBGYXVsdC10b2xlcmFudCB3b3JrbG9hZHNcbiAqICAgIC0gRmFyZ2F0ZSBTcG90ICg3MCUgc2F2aW5ncylcbiAqICAgIC0gTkFUIEdhdGV3YXlcbiAqICAgIC0gQUxCXG4gKi9cbmV4cG9ydCBjb25zdCBDT1NUX09QVElNSVpBVElPTiA9IHtcbiAgLyoqXG4gICAqIE1pbmltYWwgY29zdCBmb3IgZGV2ZWxvcG1lbnQvdGVzdGluZyAofiQxNS9tb250aClcbiAgICogVHJhZGUtb2ZmczogUHVibGljIHN1Ym5ldHMsIGNhbiBiZSBpbnRlcnJ1cHRlZFxuICAgKi9cbiAgbWluaW1hbDoge1xuICAgIGNwdTogMjU2LFxuICAgIG1lbW9yeU1pQjogNTEyLFxuICAgIHVzZU5hdEdhdGV3YXk6IGZhbHNlLCAgICAgIC8vIFNhdmVzIH4kMzIvbW9udGhcbiAgICB1c2VGYXJnYXRlU3BvdDogdHJ1ZSwgICAgICAvLyBTYXZlcyB+NzAlIG9uIGNvbXB1dGVcbiAgICB1c2VObGJJbnN0ZWFkT2ZBbGI6IHRydWUsICAvLyBTYXZlcyB+JDE3L21vbnRoXG4gICAgZGVzaXJlZENvdW50OiAxLFxuICB9LFxuXG4gIC8qKlxuICAgKiBMb3cgdHJhZmZpYyB3aXRoIEFQSSBHYXRld2F5ICh+JDI1L21vbnRoKVxuICAgKiBUcmFkZS1vZmZzOiBQYXkgcGVyIHJlcXVlc3QsIGxlc3Mgcm91dGluZyBmbGV4aWJpbGl0eVxuICAgKi9cbiAgbG93VHJhZmZpYzoge1xuICAgIGNwdTogNTEyLFxuICAgIG1lbW9yeU1pQjogMTAyNCxcbiAgICB1c2VOYXRHYXRld2F5OiB0cnVlLCAgICAgICAvLyBLZWVwIGZvciBzZWN1cml0eVxuICAgIHVzZUFwaUdhdGV3YXk6IHRydWUsICAgICAgIC8vIFNhdmVzIH4kMjAvbW9udGggYXQgbG93IHRyYWZmaWNcbiAgICBkZXNpcmVkQ291bnQ6IDEsXG4gIH0sXG5cbiAgLyoqXG4gICAqIFNjaGVkdWxlZCBzdG9wL3N0YXJ0ICh+JDEyL21vbnRoIGlmIHN0b3BwZWQgMTJoL2RheSlcbiAgICogVHJhZGUtb2ZmczogTm90IGF2YWlsYWJsZSAyNC83XG4gICAqL1xuICBzY2hlZHVsZWQ6IHtcbiAgICBjcHU6IDUxMixcbiAgICBtZW1vcnlNaUI6IDEwMjQsXG4gICAgdXNlTmF0R2F0ZXdheTogdHJ1ZSxcbiAgICBhdXRvU3RvcFNjaGVkdWxlOiAnMCAxOCAqICogPycsICAgLy8gNiBQTSBkYWlseVxuICAgIGF1dG9TdGFydFNjaGVkdWxlOiAnMCA4ICogKiA/JywgICAvLyA4IEFNIGRhaWx5XG4gICAgZGVzaXJlZENvdW50OiAxLFxuICB9LFxuXG4gIC8qKlxuICAgKiBTcG90IGluc3RhbmNlcyBvbmx5ICh+JDM1L21vbnRoLCA3MCUgY29tcHV0ZSBzYXZpbmdzKVxuICAgKiBUcmFkZS1vZmZzOiBUYXNrcyBjYW4gYmUgaW50ZXJydXB0ZWRcbiAgICovXG4gIHNwb3Q6IHtcbiAgICBjcHU6IDUxMixcbiAgICBtZW1vcnlNaUI6IDEwMjQsXG4gICAgdXNlTmF0R2F0ZXdheTogdHJ1ZSxcbiAgICB1c2VGYXJnYXRlU3BvdDogdHJ1ZSxcbiAgICBkZXNpcmVkQ291bnQ6IDEsXG4gIH0sXG5cbiAgLyoqXG4gICAqIE1hbnVhbCBjb250cm9sIChzY2FsZSB0byAwIHdoZW4gbm90IG5lZWRlZClcbiAgICogQ29zdDogfiQzNS9tb250aCB3aGVuIHJ1bm5pbmcsIH4kMy9tb250aCB3aGVuIHN0b3BwZWRcbiAgICovXG4gIG1hbnVhbDoge1xuICAgIGNwdTogNTEyLFxuICAgIG1lbW9yeU1pQjogMTAyNCxcbiAgICB1c2VOYXRHYXRld2F5OiB0cnVlLFxuICAgIGRlc2lyZWRDb3VudDogMSwgIC8vIENoYW5nZSB0byAwIHRvIHN0b3BcbiAgfSxcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogRGVmYXVsdCBzdG9yYWdlIGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfU1RPUkFHRV9DT05GSUc6IFN0b3JhZ2VDb25maWcgPSB7XG4gIGVuYWJsZUVmczogdHJ1ZSxcbiAgdGhyb3VnaHB1dE1vZGU6ICdidXJzdGluZycsXG4gIGxpZmVjeWNsZVBvbGljeTogJ0FGVEVSXzMwX0RBWVMnLFxufTtcblxuLyoqXG4gKiBEZWZhdWx0IGxvZ2dpbmcgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9MT0dHSU5HX0NPTkZJRzogTG9nZ2luZ0NvbmZpZyA9IHtcbiAgcmV0ZW50aW9uRGF5czogNyxcbiAgZW5jcnlwdGlvbjogdHJ1ZSxcbn07XG5cbi8qKlxuICogUmVzb3VyY2Ugc2l6aW5nIGNvbmZpZ3VyYXRpb25zIGJhc2VkIG9uIHdvcmtsb2FkXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNPVVJDRV9TSVpJTkcgPSB7XG4gIC8qKlxuICAgKiBNaW5pbWFsIGNvbmZpZ3VyYXRpb24gZm9yIHRlc3RpbmcvZGV2ZWxvcG1lbnRcbiAgICovXG4gIG1pbmltYWw6IHtcbiAgICBjcHU6IDI1NixcbiAgICBtZW1vcnlNaUI6IDUxMixcbiAgfSxcblxuICAvKipcbiAgICogU3RhbmRhcmQgY29uZmlndXJhdGlvbiBmb3IgcHJvZHVjdGlvbiB3b3JrbG9hZHNcbiAgICovXG4gIHN0YW5kYXJkOiB7XG4gICAgY3B1OiA1MTIsXG4gICAgbWVtb3J5TWlCOiAxMDI0LFxuICB9LFxuXG4gIC8qKlxuICAgKiBIaWdoLXBlcmZvcm1hbmNlIGNvbmZpZ3VyYXRpb24gZm9yIGRlbWFuZGluZyB3b3JrbG9hZHNcbiAgICovXG4gIGhpZ2hQZXJmb3JtYW5jZToge1xuICAgIGNwdTogMTAyNCxcbiAgICBtZW1vcnlNaUI6IDIwNDgsXG4gIH0sXG59IGFzIGNvbnN0O1xuXG4vKipcbiAqIEJlZHJvY2sgbW9kZWwgb3B0aW9uc1xuICovXG5leHBvcnQgY29uc3QgQkVEUk9DS19NT0RFTFMgPSB7XG4gIC8qKlxuICAgKiBDbGF1ZGUgMy41IEhhaWt1IC0gRmFzdGVzdCwgbW9zdCBjb3N0LWVmZmVjdGl2ZVxuICAgKiBCZXN0IGZvcjogUXVpY2sgcmVzcG9uc2VzLCBzaW1wbGUgdGFza3MsIGhpZ2ggdGhyb3VnaHB1dFxuICAgKi9cbiAgQ0xBVURFXzNfNV9IQUlLVTogJ2FudGhyb3BpYy5jbGF1ZGUtMy01LWhhaWt1LTIwMjQxMDIyLXYxOjAnLFxuXG4gIC8qKlxuICAgKiBDbGF1ZGUgMy41IFNvbm5ldCAtIEJhbGFuY2VkIHBlcmZvcm1hbmNlIGFuZCBjb3N0XG4gICAqIEJlc3QgZm9yOiBDb21wbGV4IHJlYXNvbmluZywgY29kaW5nLCBtdWx0aS1zdGVwIHRhc2tzXG4gICAqL1xuICBDTEFVREVfM181X1NPTk5FVDogJ2FudGhyb3BpYy5jbGF1ZGUtMy01LXNvbm5ldC0yMDI0MTAyMi12MjowJyxcblxuICAvKipcbiAgICogQ2xhdWRlIDMgT3B1cyAtIEhpZ2hlc3QgY2FwYWJpbGl0eVxuICAgKiBCZXN0IGZvcjogQ29tcGxleCBhbmFseXNpcywgcmVzZWFyY2gsIGNyZWF0aXZlIHdyaXRpbmdcbiAgICovXG4gIENMQVVERV8zX09QVVM6ICdhbnRocm9waWMuY2xhdWRlLTMtb3B1cy0yMDI0MDIyOS12MTowJyxcblxuICAvKipcbiAgICogQ2xhdWRlIDMgU29ubmV0IC0gUHJldmlvdXMgZ2VuZXJhdGlvblxuICAgKi9cbiAgQ0xBVURFXzNfU09OTkVUOiAnYW50aHJvcGljLmNsYXVkZS0zLXNvbm5ldC0yMDI0MDIyOS12MTowJyxcblxuICAvKipcbiAgICogQ2xhdWRlIDMgSGFpa3UgLSBQcmV2aW91cyBnZW5lcmF0aW9uXG4gICAqL1xuICBDTEFVREVfM19IQUlLVTogJ2FudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowJyxcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogQVdTIHJlZ2lvbnMgd2hlcmUgQmVkcm9jayBpcyBhdmFpbGFibGVcbiAqL1xuZXhwb3J0IGNvbnN0IEJFRFJPQ0tfUkVHSU9OUyA9IFtcbiAgJ3VzLWVhc3QtMScsXG4gICd1cy13ZXN0LTInLFxuICAnYXAtbm9ydGhlYXN0LTEnLFxuICAnYXAtc291dGhlYXN0LTEnLFxuICAnYXAtc291dGhlYXN0LTInLFxuICAnZXUtY2VudHJhbC0xJyxcbiAgJ2V1LXdlc3QtMScsXG4gICdldS13ZXN0LTMnLFxuXSBhcyBjb25zdDtcbiJdfQ==