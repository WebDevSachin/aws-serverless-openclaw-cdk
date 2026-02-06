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
exports.OpenClawFargate = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
const config_1 = require("../config");
/**
 * OpenClaw Fargate Service Construct
 *
 * Creates:
 * - ECS Cluster (if not provided)
 * - Fargate Task Definition with configurable CPU/memory
 * - Container definition with environment variables and secrets
 * - Fargate Service with circuit breaker
 * - CloudWatch Logs
 * - Optional auto-scaling
 */
class OpenClawFargate extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // ============================================================
        // Configuration with defaults
        // ============================================================
        const cpu = props.cpu ?? 512;
        const memoryMiB = props.memoryMiB ?? 1024;
        const useGraviton = props.useGraviton ?? false; // Default to x86_64 for CodeBuild compatibility
        const bedrockModelId = props.bedrockModelId ?? config_1.DEFAULT_BEDROCK_CONFIG.modelId;
        const bedrockRegion = props.bedrockRegion ?? config_1.DEFAULT_BEDROCK_CONFIG.region ?? 'us-east-1';
        const enableAutoScaling = props.enableAutoScaling ?? true;
        const minCapacity = props.minCapacity ?? 1;
        const maxCapacity = props.maxCapacity ?? 3;
        const logRetentionDays = props.logRetentionDays ?? config_1.DEFAULT_LOGGING_CONFIG.retentionDays ?? 7;
        const desiredCount = props.desiredCount ?? 1;
        const useFargateSpot = props.useFargateSpot ?? false;
        const usePublicSubnets = props.usePublicSubnets ?? false;
        // ============================================================
        // ECS Cluster
        // ============================================================
        const isNewCluster = !props.cluster;
        this.cluster = props.cluster ?? new ecs.Cluster(this, 'Cluster', {
            vpc: props.vpc,
            clusterName: 'openclaw-cluster',
            containerInsightsV2: ecs.ContainerInsights.ENABLED,
        });
        // ============================================================
        // CloudWatch Logs
        // ============================================================
        // Use auto-generated log group name to avoid conflicts
        this.logGroup = new logs.LogGroup(this, 'LogGroup', {
            retention: logRetentionDays,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // ============================================================
        // Task Definition
        // ============================================================
        this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            cpu,
            memoryLimitMiB: memoryMiB,
            executionRole: props.taskExecutionRole,
            taskRole: props.taskRole,
            runtimePlatform: {
                cpuArchitecture: useGraviton
                    ? ecs.CpuArchitecture.ARM64
                    : ecs.CpuArchitecture.X86_64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
            },
        });
        // ============================================================
        // Container Definition
        // ============================================================
        // Determine container image
        let image;
        if (props.containerImage) {
            image = props.containerImage;
        }
        else if (props.repository) {
            // Use the ECR repository image (openclaw:latest should be pushed there)
            image = ecs.ContainerImage.fromEcrRepository(props.repository, 'latest');
        }
        else {
            // Use public NGINX as placeholder
            image = ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:alpine');
        }
        // Build secrets configuration
        const secrets = {
            OPENCLAW_GATEWAY_TOKEN: ecs.Secret.fromSecretsManager(props.gatewayTokenSecret),
        };
        // Add external API secrets if provided
        if (props.externalApiSecret) {
            secrets.ANTHROPIC_API_KEY = ecs.Secret.fromSecretsManager(props.externalApiSecret, 'ANTHROPIC_API_KEY');
            secrets.OPENAI_API_KEY = ecs.Secret.fromSecretsManager(props.externalApiSecret, 'OPENAI_API_KEY');
        }
        // Add container to task definition
        this.container = this.taskDefinition.addContainer('openclaw', {
            image,
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'openclaw',
                logGroup: this.logGroup,
            }),
            environment: {
                NODE_ENV: 'production',
                PORT: '18789',
                LOG_LEVEL: 'info',
                BEDROCK_MODEL_ID: bedrockModelId,
                BEDROCK_REGION: bedrockRegion,
                S3_BUCKET: props.bucket.bucketName,
            },
            secrets,
            // Override command to bind to LAN for ALB health checks
            command: ['node', 'dist/index.js', 'gateway', '--allow-unconfigured', '--bind', 'lan'],
            // No container health check - relying on ALB health check only
        });
        // Add port mapping
        this.container.addPortMappings({
            containerPort: 18789, // OpenClaw default port
            protocol: ecs.Protocol.TCP,
        });
        // ============================================================
        // Fargate Service
        // ============================================================
        this.service = new ecs.FargateService(this, 'Service', {
            cluster: this.cluster,
            taskDefinition: this.taskDefinition,
            serviceName: 'openclaw-service',
            desiredCount,
            // Use public IP in public subnets (cost optimization without NAT Gateway)
            assignPublicIp: usePublicSubnets,
            securityGroups: [props.securityGroup],
            vpcSubnets: {
                subnetType: usePublicSubnets
                    ? ec2.SubnetType.PUBLIC
                    : ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            // Temporarily disable circuit breaker to debug issues
            // circuitBreaker: { rollback: true },
            healthCheckGracePeriod: cdk.Duration.seconds(300),
            minHealthyPercent: 0,
            // Use Fargate Spot capacity provider if enabled
            capacityProviderStrategies: useFargateSpot
                ? [
                    {
                        capacityProvider: 'FARGATE_SPOT',
                        weight: 1,
                    },
                ]
                : undefined,
        });
        // ============================================================
        // ALB Target Group Integration
        // ============================================================
        if (props.targetGroup) {
            this.service.attachToApplicationTargetGroup(props.targetGroup);
        }
        // ============================================================
        // Auto-scaling
        // ============================================================
        if (enableAutoScaling) {
            this.autoScalingTarget = this.service.autoScaleTaskCount({
                minCapacity,
                maxCapacity,
            });
            // Target tracking scaling based on CPU utilization
            this.autoScalingTarget.scaleOnCpuUtilization('CpuScaling', {
                targetUtilizationPercent: 70,
                scaleInCooldown: cdk.Duration.seconds(300),
                scaleOutCooldown: cdk.Duration.seconds(60),
            });
        }
        // ============================================================
        // Outputs
        // ============================================================
        new cdk.CfnOutput(this, 'ServiceName', {
            value: this.service.serviceName,
            description: 'ECS Service Name',
        });
        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'ECS Cluster Name',
        });
        new cdk.CfnOutput(this, 'TaskDefinitionArn', {
            value: this.taskDefinition.taskDefinitionArn,
            description: 'Task Definition ARN',
        });
        new cdk.CfnOutput(this, 'Architecture', {
            value: useGraviton ? 'ARM64 (Graviton)' : 'X86_64',
            description: 'CPU Architecture',
        });
    }
}
exports.OpenClawFargate = OpenClawFargate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFyZ2F0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zdHJ1Y3RzL2ZhcmdhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLHlEQUEyQztBQU0zQywyREFBNkM7QUFDN0MsMkNBQXVDO0FBQ3ZDLHNDQUltQjtBQXNJbkI7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQStCNUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUNuRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLCtEQUErRDtRQUMvRCw4QkFBOEI7UUFDOUIsK0RBQStEO1FBQy9ELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDO1FBQzdCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDO1FBQzFDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLENBQUUsZ0RBQWdEO1FBQ2pHLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxjQUFjLElBQUksK0JBQXNCLENBQUMsT0FBTyxDQUFDO1FBQzlFLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLElBQUksK0JBQXNCLENBQUMsTUFBTSxJQUFJLFdBQVcsQ0FBQztRQUMxRixNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLENBQUM7UUFDMUQsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUM7UUFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLElBQUksK0JBQXNC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QUFDO2dCQUMxQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7YUFDM0MsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELCtEQUErRDtRQUMvRCxVQUFVO1FBQ1YsK0RBQStEO1FBQy9ELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDL0IsV0FBVyxFQUFFLGtCQUFrQjtTQUNoQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQy9CLFdBQVcsRUFBRSxrQkFBa0I7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUI7WUFDNUMsV0FBVyxFQUFFLHFCQUFxQjtTQUNuQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsUUFBUTtZQUNsRCxXQUFXLEVBQUUsa0JBQWtCO1NBQ2hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQS9ORCwwQ0ErTkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgZWNyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3InO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9DT05UQUlORVJfQ09ORklHLFxuICBERUZBVUxUX0JFRFJPQ0tfQ09ORklHLFxuICBERUZBVUxUX0xPR0dJTkdfQ09ORklHLFxufSBmcm9tICcuLi9jb25maWcnO1xuXG4vKipcbiAqIFByb3BlcnRpZXMgZm9yIHRoZSBPcGVuQ2xhd0ZhcmdhdGUgY29uc3RydWN0XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3BlbkNsYXdGYXJnYXRlUHJvcHMge1xuICAvKipcbiAgICogVGhlIFZQQyB0byBkZXBsb3kgdGhlIEZhcmdhdGUgc2VydmljZSBpblxuICAgKi9cbiAgcmVhZG9ubHkgdnBjOiBlYzIuSVZwYztcblxuICAvKipcbiAgICogVGhlIEVDUyBjbHVzdGVyIHRvIGRlcGxveSB0byAob3B0aW9uYWwsIHdpbGwgY3JlYXRlIG9uZSBpZiBub3QgcHJvdmlkZWQpXG4gICAqL1xuICByZWFkb25seSBjbHVzdGVyPzogZWNzLklDbHVzdGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgdGFzayBleGVjdXRpb24gcm9sZSBmb3IgcHVsbGluZyBpbWFnZXMgYW5kIHJlYWRpbmcgc2VjcmV0c1xuICAgKi9cbiAgcmVhZG9ubHkgdGFza0V4ZWN1dGlvblJvbGU6IGlhbS5JUm9sZTtcblxuICAvKipcbiAgICogVGhlIHRhc2sgcm9sZSBmb3IgcnVudGltZSBwZXJtaXNzaW9ucyAoQmVkcm9jaywgUzMpXG4gICAqL1xuICByZWFkb25seSB0YXNrUm9sZTogaWFtLklSb2xlO1xuXG4gIC8qKlxuICAgKiBUaGUgUzMgYnVja2V0IGZvciBvYmplY3Qgc3RvcmFnZVxuICAgKi9cbiAgcmVhZG9ubHkgYnVja2V0OiBzMy5JQnVja2V0O1xuXG4gIC8qKlxuICAgKiBUaGUgU2VjcmV0cyBNYW5hZ2VyIHNlY3JldCBmb3IgZ2F0ZXdheSB0b2tlblxuICAgKi9cbiAgcmVhZG9ubHkgZ2F0ZXdheVRva2VuU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5JU2VjcmV0O1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbCBleHRlcm5hbCBBUEkgc2VjcmV0IChjb250YWlucyBBTlRIUk9QSUNfQVBJX0tFWSwgT1BFTkFJX0FQSV9LRVkpXG4gICAqL1xuICByZWFkb25seSBleHRlcm5hbEFwaVNlY3JldD86IHNlY3JldHNtYW5hZ2VyLklTZWNyZXQ7XG5cbiAgLyoqXG4gICAqIENQVSB1bml0cyBmb3IgdGhlIHRhc2sgKDI1NiwgNTEyLCAxMDI0LCBldGMuKVxuICAgKiBAZGVmYXVsdCA1MTJcbiAgICovXG4gIHJlYWRvbmx5IGNwdT86IG51bWJlcjtcblxuICAvKipcbiAgICogTWVtb3J5IGluIE1pQiBmb3IgdGhlIHRhc2tcbiAgICogQGRlZmF1bHQgMTAyNFxuICAgKi9cbiAgcmVhZG9ubHkgbWVtb3J5TWlCPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBHcmF2aXRvbiAoQVJNNjQpIGFyY2hpdGVjdHVyZVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICByZWFkb25seSB1c2VHcmF2aXRvbj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBCZWRyb2NrIG1vZGVsIElEIHRvIHVzZVxuICAgKiBAZGVmYXVsdCAnYW50aHJvcGljLmNsYXVkZS0zLTUtaGFpa3UtMjAyNDEwMjItdjE6MCdcbiAgICovXG4gIHJlYWRvbmx5IGJlZHJvY2tNb2RlbElkPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgQVdTIHJlZ2lvbiBmb3IgQmVkcm9ja1xuICAgKiBAZGVmYXVsdCAndXMtZWFzdC0xJ1xuICAgKi9cbiAgcmVhZG9ubHkgYmVkcm9ja1JlZ2lvbj86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHNlY3VyaXR5IGdyb3VwIGZvciB0aGUgRmFyZ2F0ZSB0YXNrc1xuICAgKi9cbiAgcmVhZG9ubHkgc2VjdXJpdHlHcm91cDogZWMyLklTZWN1cml0eUdyb3VwO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbCB0YXJnZXQgZ3JvdXAgZm9yIEFMQiBpbnRlZ3JhdGlvblxuICAgKi9cbiAgcmVhZG9ubHkgdGFyZ2V0R3JvdXA/OiBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGVuYWJsZSBhdXRvLXNjYWxpbmdcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgZW5hYmxlQXV0b1NjYWxpbmc/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNaW5pbXVtIGNhcGFjaXR5IGZvciBhdXRvLXNjYWxpbmdcbiAgICogQGRlZmF1bHQgMVxuICAgKi9cbiAgcmVhZG9ubHkgbWluQ2FwYWNpdHk/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIE1heGltdW0gY2FwYWNpdHkgZm9yIGF1dG8tc2NhbGluZ1xuICAgKiBAZGVmYXVsdCAzXG4gICAqL1xuICByZWFkb25seSBtYXhDYXBhY2l0eT86IG51bWJlcjtcblxuICAvKipcbiAgICogRUNSIHJlcG9zaXRvcnkgZm9yIGNvbnRhaW5lciBpbWFnZSAob3B0aW9uYWwpXG4gICAqL1xuICByZWFkb25seSByZXBvc2l0b3J5PzogZWNyLklSZXBvc2l0b3J5O1xuXG4gIC8qKlxuICAgKiBDb250YWluZXIgaW1hZ2UgdG8gdXNlIChvdmVycmlkZXMgcmVwb3NpdG9yeSBpZiBwcm92aWRlZClcbiAgICovXG4gIHJlYWRvbmx5IGNvbnRhaW5lckltYWdlPzogZWNzLkNvbnRhaW5lckltYWdlO1xuXG4gIC8qKlxuICAgKiBMb2cgcmV0ZW50aW9uIHBlcmlvZCBpbiBkYXlzXG4gICAqIEBkZWZhdWx0IDdcbiAgICovXG4gIHJlYWRvbmx5IGxvZ1JldGVudGlvbkRheXM/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIERlc2lyZWQgY291bnQgb2YgdGFza3NcbiAgICogQGRlZmF1bHQgMVxuICAgKi9cbiAgcmVhZG9ubHkgZGVzaXJlZENvdW50PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBGYXJnYXRlIFNwb3QgKHNhdmVzIH43MCUgb24gY29tcHV0ZSBjb3N0cylcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IHVzZUZhcmdhdGVTcG90PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgcHVibGljIHN1Ym5ldHMgKGZvciBjb3N0IG9wdGltaXphdGlvbiB3aXRob3V0IE5BVCBHYXRld2F5KVxuICAgKiBAZGVmYXVsdCBmYWxzZSAodXNlIHByaXZhdGUgc3VibmV0cylcbiAgICovXG4gIHJlYWRvbmx5IHVzZVB1YmxpY1N1Ym5ldHM/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE9wZW5DbGF3IEZhcmdhdGUgU2VydmljZSBDb25zdHJ1Y3RcbiAqXG4gKiBDcmVhdGVzOlxuICogLSBFQ1MgQ2x1c3RlciAoaWYgbm90IHByb3ZpZGVkKVxuICogLSBGYXJnYXRlIFRhc2sgRGVmaW5pdGlvbiB3aXRoIGNvbmZpZ3VyYWJsZSBDUFUvbWVtb3J5XG4gKiAtIENvbnRhaW5lciBkZWZpbml0aW9uIHdpdGggZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzZWNyZXRzXG4gKiAtIEZhcmdhdGUgU2VydmljZSB3aXRoIGNpcmN1aXQgYnJlYWtlclxuICogLSBDbG91ZFdhdGNoIExvZ3NcbiAqIC0gT3B0aW9uYWwgYXV0by1zY2FsaW5nXG4gKi9cbmV4cG9ydCBjbGFzcyBPcGVuQ2xhd0ZhcmdhdGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogVGhlIEVDUyBjbHVzdGVyXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogZWNzLklDbHVzdGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgRmFyZ2F0ZSBzZXJ2aWNlXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgc2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xuXG4gIC8qKlxuICAgKiBUaGUgdGFzayBkZWZpbml0aW9uXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgdGFza0RlZmluaXRpb246IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb247XG5cbiAgLyoqXG4gICAqIFRoZSBjb250YWluZXIgZGVmaW5pdGlvblxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGNvbnRhaW5lcjogZWNzLkNvbnRhaW5lckRlZmluaXRpb247XG5cbiAgLyoqXG4gICAqIFRoZSBDbG91ZFdhdGNoIGxvZyBncm91cFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGxvZ0dyb3VwOiBsb2dzLklMb2dHcm91cDtcblxuICAvKipcbiAgICogVGhlIGF1dG8tc2NhbGluZyB0YXJnZXQgKGlmIGVuYWJsZWQpXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgYXV0b1NjYWxpbmdUYXJnZXQ/OiBlY3MuU2NhbGFibGVUYXNrQ291bnQ7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE9wZW5DbGF3RmFyZ2F0ZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENvbmZpZ3VyYXRpb24gd2l0aCBkZWZhdWx0c1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGNwdSA9IHByb3BzLmNwdSA/PyA1MTI7XG4gICAgY29uc3QgbWVtb3J5TWlCID0gcHJvcHMubWVtb3J5TWlCID8/IDEwMjQ7XG4gICAgY29uc3QgdXNlR3Jhdml0b24gPSBwcm9wcy51c2VHcmF2aXRvbiA/PyBmYWxzZTsgIC8vIERlZmF1bHQgdG8geDg2XzY0IGZvciBDb2RlQnVpbGQgY29tcGF0aWJpbGl0eVxuICAgIGNvbnN0IGJlZHJvY2tNb2RlbElkID0gcHJvcHMuYmVkcm9ja01vZGVsSWQgPz8gREVGQVVMVF9CRURST0NLX0NPTkZJRy5tb2RlbElkO1xuICAgIGNvbnN0IGJlZHJvY2tSZWdpb24gPSBwcm9wcy5iZWRyb2NrUmVnaW9uID8/IERFRkFVTFRfQkVEUk9DS19DT05GSUcucmVnaW9uID8/ICd1cy1lYXN0LTEnO1xuICAgIGNvbnN0IGVuYWJsZUF1dG9TY2FsaW5nID0gcHJvcHMuZW5hYmxlQXV0b1NjYWxpbmcgPz8gdHJ1ZTtcbiAgICBjb25zdCBtaW5DYXBhY2l0eSA9IHByb3BzLm1pbkNhcGFjaXR5ID8/IDE7XG4gICAgY29uc3QgbWF4Q2FwYWNpdHkgPSBwcm9wcy5tYXhDYXBhY2l0eSA/PyAzO1xuICAgIGNvbnN0IGxvZ1JldGVudGlvbkRheXMgPSBwcm9wcy5sb2dSZXRlbnRpb25EYXlzID8/IERFRkFVTFRfTE9HR0lOR19DT05GSUcucmV0ZW50aW9uRGF5cyA/PyA3O1xuICAgIGNvbnN0IGRlc2lyZWRDb3VudCA9IHByb3BzLmRlc2lyZWRDb3VudCA/PyAxO1xuICAgIGNvbnN0IHVzZUZhcmdhdGVTcG90ID0gcHJvcHMudXNlRmFyZ2F0ZVNwb3QgPz8gZmFsc2U7XG4gICAgY29uc3QgdXNlUHVibGljU3VibmV0cyA9IHByb3BzLnVzZVB1YmxpY1N1Ym5ldHMgPz8gZmFsc2U7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBFQ1MgQ2x1c3RlclxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGlzTmV3Q2x1c3RlciA9ICFwcm9wcy5jbHVzdGVyO1xuICAgIHRoaXMuY2x1c3RlciA9IHByb3BzLmNsdXN0ZXIgPz8gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICBjbHVzdGVyTmFtZTogJ29wZW5jbGF3LWNsdXN0ZXInLFxuICAgICAgY29udGFpbmVySW5zaWdodHNWMjogZWNzLkNvbnRhaW5lckluc2lnaHRzLkVOQUJMRUQsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDbG91ZFdhdGNoIExvZ3NcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBVc2UgYXV0by1nZW5lcmF0ZWQgbG9nIGdyb3VwIG5hbWUgdG8gYXZvaWQgY29uZmxpY3RzXG4gICAgdGhpcy5sb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dHcm91cCcsIHtcbiAgICAgIHJldGVudGlvbjogbG9nUmV0ZW50aW9uRGF5cyBhcyBsb2dzLlJldGVudGlvbkRheXMsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVGFzayBEZWZpbml0aW9uXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdGhpcy50YXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKHRoaXMsICdUYXNrRGVmJywge1xuICAgICAgY3B1LFxuICAgICAgbWVtb3J5TGltaXRNaUI6IG1lbW9yeU1pQixcbiAgICAgIGV4ZWN1dGlvblJvbGU6IHByb3BzLnRhc2tFeGVjdXRpb25Sb2xlLFxuICAgICAgdGFza1JvbGU6IHByb3BzLnRhc2tSb2xlLFxuICAgICAgcnVudGltZVBsYXRmb3JtOiB7XG4gICAgICAgIGNwdUFyY2hpdGVjdHVyZTogdXNlR3Jhdml0b25cbiAgICAgICAgICA/IGVjcy5DcHVBcmNoaXRlY3R1cmUuQVJNNjRcbiAgICAgICAgICA6IGVjcy5DcHVBcmNoaXRlY3R1cmUuWDg2XzY0LFxuICAgICAgICBvcGVyYXRpbmdTeXN0ZW1GYW1pbHk6IGVjcy5PcGVyYXRpbmdTeXN0ZW1GYW1pbHkuTElOVVgsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ29udGFpbmVyIERlZmluaXRpb25cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBcbiAgICAvLyBEZXRlcm1pbmUgY29udGFpbmVyIGltYWdlXG4gICAgbGV0IGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2U7XG4gICAgaWYgKHByb3BzLmNvbnRhaW5lckltYWdlKSB7XG4gICAgICBpbWFnZSA9IHByb3BzLmNvbnRhaW5lckltYWdlO1xuICAgIH0gZWxzZSBpZiAocHJvcHMucmVwb3NpdG9yeSkge1xuICAgICAgLy8gVXNlIHRoZSBFQ1IgcmVwb3NpdG9yeSBpbWFnZSAob3BlbmNsYXc6bGF0ZXN0IHNob3VsZCBiZSBwdXNoZWQgdGhlcmUpXG4gICAgICBpbWFnZSA9IGVjcy5Db250YWluZXJJbWFnZS5mcm9tRWNyUmVwb3NpdG9yeShwcm9wcy5yZXBvc2l0b3J5LCAnbGF0ZXN0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSBwdWJsaWMgTkdJTlggYXMgcGxhY2Vob2xkZXJcbiAgICAgIGltYWdlID0gZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgncHVibGljLmVjci5hd3Mvbmdpbngvbmdpbng6YWxwaW5lJyk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgc2VjcmV0cyBjb25maWd1cmF0aW9uXG4gICAgY29uc3Qgc2VjcmV0czogeyBba2V5OiBzdHJpbmddOiBlY3MuU2VjcmV0IH0gPSB7XG4gICAgICBPUEVOQ0xBV19HQVRFV0FZX1RPS0VOOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihwcm9wcy5nYXRld2F5VG9rZW5TZWNyZXQpLFxuICAgIH07XG5cbiAgICAvLyBBZGQgZXh0ZXJuYWwgQVBJIHNlY3JldHMgaWYgcHJvdmlkZWRcbiAgICBpZiAocHJvcHMuZXh0ZXJuYWxBcGlTZWNyZXQpIHtcbiAgICAgIHNlY3JldHMuQU5USFJPUElDX0FQSV9LRVkgPSBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihcbiAgICAgICAgcHJvcHMuZXh0ZXJuYWxBcGlTZWNyZXQsXG4gICAgICAgICdBTlRIUk9QSUNfQVBJX0tFWSdcbiAgICAgICk7XG4gICAgICBzZWNyZXRzLk9QRU5BSV9BUElfS0VZID0gZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoXG4gICAgICAgIHByb3BzLmV4dGVybmFsQXBpU2VjcmV0LFxuICAgICAgICAnT1BFTkFJX0FQSV9LRVknXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIEFkZCBjb250YWluZXIgdG8gdGFzayBkZWZpbml0aW9uXG4gICAgdGhpcy5jb250YWluZXIgPSB0aGlzLnRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignb3BlbmNsYXcnLCB7XG4gICAgICBpbWFnZSxcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xuICAgICAgICBzdHJlYW1QcmVmaXg6ICdvcGVuY2xhdycsXG4gICAgICAgIGxvZ0dyb3VwOiB0aGlzLmxvZ0dyb3VwLFxuICAgICAgfSksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICBQT1JUOiAnMTg3ODknLFxuICAgICAgICBMT0dfTEVWRUw6ICdpbmZvJyxcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogYmVkcm9ja01vZGVsSWQsXG4gICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBiZWRyb2NrUmVnaW9uLFxuICAgICAgICBTM19CVUNLRVQ6IHByb3BzLmJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgfSxcbiAgICAgIHNlY3JldHMsXG4gICAgICAvLyBPdmVycmlkZSBjb21tYW5kIHRvIGJpbmQgdG8gTEFOIGZvciBBTEIgaGVhbHRoIGNoZWNrc1xuICAgICAgY29tbWFuZDogWydub2RlJywgJ2Rpc3QvaW5kZXguanMnLCAnZ2F0ZXdheScsICctLWFsbG93LXVuY29uZmlndXJlZCcsICctLWJpbmQnLCAnbGFuJ10sXG4gICAgICAvLyBObyBjb250YWluZXIgaGVhbHRoIGNoZWNrIC0gcmVseWluZyBvbiBBTEIgaGVhbHRoIGNoZWNrIG9ubHlcbiAgICB9KTtcblxuICAgIC8vIEFkZCBwb3J0IG1hcHBpbmdcbiAgICB0aGlzLmNvbnRhaW5lci5hZGRQb3J0TWFwcGluZ3Moe1xuICAgICAgY29udGFpbmVyUG9ydDogMTg3ODksICAvLyBPcGVuQ2xhdyBkZWZhdWx0IHBvcnRcbiAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVENQLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gRmFyZ2F0ZSBTZXJ2aWNlXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdGhpcy5zZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnU2VydmljZScsIHtcbiAgICAgIGNsdXN0ZXI6IHRoaXMuY2x1c3RlcixcbiAgICAgIHRhc2tEZWZpbml0aW9uOiB0aGlzLnRhc2tEZWZpbml0aW9uLFxuICAgICAgc2VydmljZU5hbWU6ICdvcGVuY2xhdy1zZXJ2aWNlJyxcbiAgICAgIGRlc2lyZWRDb3VudCxcbiAgICAgIC8vIFVzZSBwdWJsaWMgSVAgaW4gcHVibGljIHN1Ym5ldHMgKGNvc3Qgb3B0aW1pemF0aW9uIHdpdGhvdXQgTkFUIEdhdGV3YXkpXG4gICAgICBhc3NpZ25QdWJsaWNJcDogdXNlUHVibGljU3VibmV0cyxcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbcHJvcHMuc2VjdXJpdHlHcm91cF0sXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IHVzZVB1YmxpY1N1Ym5ldHNcbiAgICAgICAgICA/IGVjMi5TdWJuZXRUeXBlLlBVQkxJQ1xuICAgICAgICAgIDogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgIH0sXG4gICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGNpcmN1aXQgYnJlYWtlciB0byBkZWJ1ZyBpc3N1ZXNcbiAgICAgIC8vIGNpcmN1aXRCcmVha2VyOiB7IHJvbGxiYWNrOiB0cnVlIH0sXG4gICAgICBoZWFsdGhDaGVja0dyYWNlUGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLFxuICAgICAgbWluSGVhbHRoeVBlcmNlbnQ6IDAsXG4gICAgICAvLyBVc2UgRmFyZ2F0ZSBTcG90IGNhcGFjaXR5IHByb3ZpZGVyIGlmIGVuYWJsZWRcbiAgICAgIGNhcGFjaXR5UHJvdmlkZXJTdHJhdGVnaWVzOiB1c2VGYXJnYXRlU3BvdFxuICAgICAgICA/IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY2FwYWNpdHlQcm92aWRlcjogJ0ZBUkdBVEVfU1BPVCcsXG4gICAgICAgICAgICAgIHdlaWdodDogMSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXVxuICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFMQiBUYXJnZXQgR3JvdXAgSW50ZWdyYXRpb25cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBpZiAocHJvcHMudGFyZ2V0R3JvdXApIHtcbiAgICAgIHRoaXMuc2VydmljZS5hdHRhY2hUb0FwcGxpY2F0aW9uVGFyZ2V0R3JvdXAocHJvcHMudGFyZ2V0R3JvdXApO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEF1dG8tc2NhbGluZ1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGlmIChlbmFibGVBdXRvU2NhbGluZykge1xuICAgICAgdGhpcy5hdXRvU2NhbGluZ1RhcmdldCA9IHRoaXMuc2VydmljZS5hdXRvU2NhbGVUYXNrQ291bnQoe1xuICAgICAgICBtaW5DYXBhY2l0eSxcbiAgICAgICAgbWF4Q2FwYWNpdHksXG4gICAgICB9KTtcblxuICAgICAgLy8gVGFyZ2V0IHRyYWNraW5nIHNjYWxpbmcgYmFzZWQgb24gQ1BVIHV0aWxpemF0aW9uXG4gICAgICB0aGlzLmF1dG9TY2FsaW5nVGFyZ2V0LnNjYWxlT25DcHVVdGlsaXphdGlvbignQ3B1U2NhbGluZycsIHtcbiAgICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcbiAgICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLFxuICAgICAgICBzY2FsZU91dENvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBPdXRwdXRzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NlcnZpY2VOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuc2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRUNTIFNlcnZpY2UgTmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2x1c3Rlck5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jbHVzdGVyLmNsdXN0ZXJOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgQ2x1c3RlciBOYW1lJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYXNrRGVmaW5pdGlvbkFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnRhc2tEZWZpbml0aW9uLnRhc2tEZWZpbml0aW9uQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdUYXNrIERlZmluaXRpb24gQVJOJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcmNoaXRlY3R1cmUnLCB7XG4gICAgICB2YWx1ZTogdXNlR3Jhdml0b24gPyAnQVJNNjQgKEdyYXZpdG9uKScgOiAnWDg2XzY0JyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ1BVIEFyY2hpdGVjdHVyZScsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==