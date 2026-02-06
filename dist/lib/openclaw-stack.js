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
exports.OpenClawStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
const efs = __importStar(require("aws-cdk-lib/aws-efs"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const vpc_1 = require("./constructs/vpc");
const iam_1 = require("./constructs/iam");
const storage_1 = require("./constructs/storage");
const secrets_1 = require("./constructs/secrets");
const fargate_1 = require("./constructs/fargate");
const alb_1 = require("./constructs/alb");
const logging_1 = require("./constructs/logging");
const config_management_1 = require("./constructs/config-management");
const config_1 = require("./config");
/**
 * OpenClaw Stack - Self-hosted autonomous agent platform
 *
 * This stack deploys OpenClaw on AWS using ECS Fargate with:
 * - VPC with public and private subnets (via OpenClawVpc construct)
 * - ECS Cluster with Fargate capacity provider
 * - ECR repository for container images
 * - EFS for persistent storage
 * - S3 for object storage with default config deployment
 * - Secrets Manager for sensitive configuration
 * - CloudWatch Logs for logging (via OpenClawLogging construct)
 * - Application Load Balancer (via OpenClawAlb construct)
 * - IAM roles with Bedrock permissions (via OpenClawIam construct)
 * - Config Management for runtime configuration updates
 */
class OpenClawStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Merge props with defaults
        const cpu = props?.cpu ?? 512;
        const memoryMiB = props?.memoryMiB ?? 1024;
        const bedrockModel = props?.bedrockModel ?? config_1.DEFAULT_BEDROCK_CONFIG.modelId;
        const useGraviton = props?.useGraviton ?? false; // Disabled - CodeBuild uses AMD64
        const vpcId = props?.vpcId;
        const desiredCount = props?.desiredCount ?? 1;
        // Cost optimization flags
        const useNatGateway = props?.useNatGateway ?? true;
        const useFargateSpot = props?.useFargateSpot ?? false;
        const useNlbInsteadOfAlb = props?.useNlbInsteadOfAlb ?? false;
        const useApiGateway = props?.useApiGateway ?? false;
        // ============================================================
        // Storage - S3 Bucket
        // ============================================================
        const storage = new storage_1.OpenClawStorage(this, 'Storage');
        // ============================================================
        // Secrets - Secrets Manager
        // ============================================================
        const secrets = new secrets_1.OpenClawSecrets(this, 'Secrets');
        // ============================================================
        // VPC - Networking
        // ============================================================
        // Use existing VPC or create new one using the OpenClawVpc construct
        let vpc;
        let albSecurityGroup;
        let fargateSecurityGroup;
        if (vpcId) {
            // Use existing VPC
            vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', { vpcId });
            // Create security groups for existing VPC
            albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
                vpc,
                description: 'Security group for OpenClaw Application Load Balancer',
                allowAllOutbound: true,
            });
            albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');
            albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic from anywhere');
            fargateSecurityGroup = new ec2.SecurityGroup(this, 'FargateSecurityGroup', {
                vpc,
                description: 'Security group for OpenClaw Fargate tasks',
                allowAllOutbound: true,
            });
            fargateSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from ALB to container port 3000');
        }
        else {
            // Create new VPC using the OpenClawVpc construct
            // Use public subnets if NAT Gateway is disabled (cost optimization)
            const openClawVpc = new vpc_1.OpenClawVpc(this, 'OpenClawVpc', {
                useNatGateway,
                usePublicSubnets: !useNatGateway,
            });
            vpc = openClawVpc.vpc;
            albSecurityGroup = openClawVpc.albSecurityGroup;
            fargateSecurityGroup = openClawVpc.fargateSecurityGroup;
        }
        // ============================================================
        // EFS Security Group
        // ============================================================
        const efsSecurityGroup = new ec2.SecurityGroup(this, 'EfsSecurityGroup', {
            vpc,
            description: 'Security group for OpenClaw EFS',
            allowAllOutbound: false,
        });
        efsSecurityGroup.addIngressRule(fargateSecurityGroup, ec2.Port.tcp(2049), 'Allow NFS access from ECS tasks');
        // ============================================================
        // EFS - Persistent Storage
        // ============================================================
        const fileSystem = new efs.FileSystem(this, 'OpenClawEfs', {
            vpc,
            securityGroup: efsSecurityGroup,
            throughputMode: efs.ThroughputMode.BURSTING,
            lifecyclePolicy: efs.LifecyclePolicy.AFTER_30_DAYS,
            performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            // Backup managed by AWS Backup or manual configuration
        });
        // ============================================================
        // ECR Repository
        // ============================================================
        const repository = new ecr.Repository(this, 'OpenClawRepository', {
            repositoryName: config_1.DEFAULT_CONTAINER_CONFIG.imageName,
            imageScanOnPush: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lifecycleRules: [
                {
                    maxImageCount: 30,
                    description: 'Keep last 30 images',
                },
            ],
        });
        // ============================================================
        // EFS Access Point
        // ============================================================
        const accessPoint = new efs.AccessPoint(this, 'OpenClawAccessPoint', {
            fileSystem,
            path: '/openclaw',
        });
        // ============================================================
        // IAM Roles - Using OpenClawIam Construct
        // ============================================================
        const openClawIam = new iam_1.OpenClawIam(this, 'OpenClawIam', {
            bucketArn: storage.bucket.bucketArn,
            gatewayTokenSecretArn: secrets.gatewayTokenSecret.secretArn,
            externalApiSecretArn: secrets.externalApiSecret?.secretArn,
            efsFileSystemArn: fileSystem.fileSystemArn,
            bedrockModelId: bedrockModel,
        });
        // ============================================================
        // Fargate Service - Using OpenClawFargate Construct
        // ============================================================
        const fargate = new fargate_1.OpenClawFargate(this, 'OpenClawFargate', {
            vpc,
            bucket: storage.bucket,
            gatewayTokenSecret: secrets.gatewayTokenSecret,
            externalApiSecret: secrets.externalApiSecret,
            taskExecutionRole: openClawIam.taskExecutionRole,
            taskRole: openClawIam.taskRole,
            securityGroup: fargateSecurityGroup,
            cpu,
            memoryMiB,
            useGraviton,
            bedrockModelId: bedrockModel,
            bedrockRegion: config_1.DEFAULT_BEDROCK_CONFIG.region,
            repository,
            enableAutoScaling: true,
            minCapacity: 1,
            maxCapacity: 3,
            desiredCount,
            // Cost optimization options
            useFargateSpot,
            usePublicSubnets: !useNatGateway,
        });
        // NOTE: EFS mount disabled due to access issues in Fargate
        // Using ephemeral storage instead (data lost on task stop)
        // TODO: Re-enable EFS after fixing IAM/security group configuration
        // 
        // EFS volume configuration (disabled):
        // fargate.taskDefinition.addVolume({
        //   name: 'openclaw-data',
        //   efsVolumeConfiguration: {
        //     fileSystemId: fileSystem.fileSystemId,
        //     transitEncryption: 'ENABLED',
        //     authorizationConfig: {
        //       accessPointId: accessPoint.accessPointId,
        //       iam: 'DISABLED',
        //     },
        //   },
        // });
        // fargate.container.addMountPoints({
        //   sourceVolume: 'openclaw-data',
        //   containerPath: '/app/data',
        //   readOnly: false,
        // });
        // ============================================================
        // Application Load Balancer - Using OpenClawAlb Construct
        // ============================================================
        const alb = new alb_1.OpenClawAlb(this, 'OpenClawAlb', {
            vpc,
            securityGroup: albSecurityGroup,
            fargateService: fargate.service,
            healthCheckPath: config_1.DEFAULT_CONTAINER_CONFIG.healthCheckPath,
        });
        // ============================================================
        // Logging - Using OpenClawLogging Construct
        // ============================================================
        const logging = new logging_1.OpenClawLogging(this, 'OpenClawLogging', {
            logRetention: config_1.DEFAULT_LOGGING_CONFIG.retentionDays,
            alb: alb.loadBalancer,
            logGroupName: '/ecs/openclaw',
            enableEncryption: config_1.DEFAULT_LOGGING_CONFIG.encryption,
        });
        // ============================================================
        // Config Management
        // ============================================================
        const configManagement = new config_management_1.ConfigManagement(this, 'ConfigManagement', {
            vpc,
            bucket: storage.bucket,
            fargateService: fargate.service,
            configKeyPrefix: 'config/',
            enableAutoReload: false,
        });
        // ============================================================
        // Deploy Default Configs to S3
        // ============================================================
        const configDeployment = new s3deploy.BucketDeployment(this, 'DeployConfig', {
            sources: [s3deploy.Source.asset('./docker/config')],
            destinationBucket: storage.bucket,
            destinationKeyPrefix: 'config/',
            retainOnDelete: false,
        });
        // Ensure config deployment happens after bucket is created
        configDeployment.node.addDependency(storage.bucket);
        // ============================================================
        // Stack Outputs
        // ============================================================
        new cdk.CfnOutput(this, 'AlbUrl', {
            value: alb.albUrl,
            description: 'OpenClaw Application URL',
            exportName: 'OpenClawAlbUrl'
        });
        new cdk.CfnOutput(this, 'AlbDnsName', {
            value: alb.albDnsName,
            description: 'ALB DNS Name',
            exportName: 'OpenClawAlbDnsName'
        });
        new cdk.CfnOutput(this, 'S3BucketName', {
            value: storage.bucket.bucketName,
            description: 'S3 Bucket for OpenClaw storage',
            exportName: 'OpenClawS3Bucket'
        });
        new cdk.CfnOutput(this, 'GatewayTokenSecretArn', {
            value: secrets.gatewayTokenSecret.secretArn,
            description: 'Gateway Token Secret ARN',
            exportName: 'OpenClawGatewayTokenSecret'
        });
        new cdk.CfnOutput(this, 'EcsClusterName', {
            value: fargate.cluster.clusterName,
            description: 'ECS Cluster Name',
            exportName: 'OpenClawClusterName'
        });
        new cdk.CfnOutput(this, 'EcsServiceName', {
            value: fargate.service.serviceName,
            description: 'ECS Service Name',
            exportName: 'OpenClawServiceName'
        });
        new cdk.CfnOutput(this, 'CloudWatchLogGroup', {
            value: logging.logGroup.logGroupName,
            description: 'CloudWatch Log Group',
            exportName: 'OpenClawLogGroup'
        });
        // ============================================================
        // Legacy Outputs (kept for backward compatibility)
        // ============================================================
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'VPC ID',
        });
        new cdk.CfnOutput(this, 'ClusterName', {
            value: fargate.cluster.clusterName,
            description: 'ECS Cluster Name (legacy)',
        });
        new cdk.CfnOutput(this, 'EcrRepositoryUri', {
            value: repository.repositoryUri,
            description: 'ECR Repository URI',
        });
        new cdk.CfnOutput(this, 'FileSystemId', {
            value: fileSystem.fileSystemId,
            description: 'EFS File System ID',
        });
        new cdk.CfnOutput(this, 'BucketName', {
            value: storage.bucket.bucketName,
            description: 'S3 Bucket Name',
        });
        new cdk.CfnOutput(this, 'LogGroupName', {
            value: fargate.logGroup.logGroupName,
            description: 'CloudWatch Log Group (Fargate)',
        });
        new cdk.CfnOutput(this, 'ServiceName', {
            value: fargate.service.serviceName,
            description: 'ECS Service Name (legacy)',
        });
        new cdk.CfnOutput(this, 'BedrockModel', {
            value: bedrockModel,
            description: 'Bedrock Model',
        });
        new cdk.CfnOutput(this, 'Architecture', {
            value: useGraviton ? 'ARM64 (Graviton)' : 'X86_64',
            description: 'CPU Architecture',
        });
        // ============================================================
        // Stack Metadata
        // ============================================================
        cdk.Tags.of(this).add('Stack', 'OpenClaw');
        cdk.Tags.of(this).add('Model', bedrockModel);
        cdk.Tags.of(this).add('Architecture', useGraviton ? 'ARM64' : 'X86_64');
    }
}
exports.OpenClawStack = OpenClawStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmNsYXctc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvb3BlbmNsYXctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBRTNDLHlEQUEyQztBQUUzQyx5REFBMkM7QUFHM0Msd0VBQTBEO0FBSTFELDBDQUErQztBQUMvQywwQ0FBK0M7QUFDL0Msa0RBQXVEO0FBQ3ZELGtEQUF1RDtBQUN2RCxrREFBdUQ7QUFDdkQsMENBQStDO0FBQy9DLGtEQUF1RDtBQUN2RCxzRUFBa0U7QUFDbEUscUNBS2tCO0FBRWxCOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw0QkFBNEI7UUFDNUIsTUFBTSxHQUFHLEdBQUcsS0FBSyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDOUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLFNBQVMsSUFBSSxJQUFJLENBQUM7UUFDM0MsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLFlBQVksSUFBSSwrQkFBc0IsQ0FBQyxPQUFPLENBQUM7UUFDM0UsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUFFLFdBQVcsSUFBSSxLQUFLLENBQUMsQ0FBRSxrQ0FBa0M7UUFDcEYsTUFBTSxLQUFLLEdBQUcsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUMzQixNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsWUFBWSxJQUFJLENBQUMsQ0FBQztRQUU5QywwQkFBMEI7UUFDMUIsTUFBTSxhQUFhLEdBQUcsS0FBSyxFQUFFLGFBQWEsSUFBSSxJQUFJLENBQUM7UUFDbkQsTUFBTSxjQUFjLEdBQUcsS0FBSyxF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RSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFFLENBQUM7Q0FDRjtBQTVVRCxzQ0E0VUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgZWNyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3InO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBlZnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVmcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgT3BlbkNsYXdTdGFja1Byb3BzIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBPcGVuQ2xhd1ZwYyB9IGZyb20gJy4vY29uc3RydWN0cy92cGMnO1xuaW1wb3J0IHsgT3BlbkNsYXdJYW0gfSBmcm9tICcuL2NvbnN0cnVjdHMvaWFtJztcbmltcG9ydCB7IE9wZW5DbGF3U3RvcmFnZSB9IGZyb20gJy4vY29uc3RydWN0cy9zdG9yYWdlJztcbmltcG9ydCB7IE9wZW5DbGF3U2VjcmV0cyB9IGZyb20gJy4vY29uc3RydWN0cy9zZWNyZXRzJztcbmltcG9ydCB7IE9wZW5DbGF3RmFyZ2F0ZSB9IGZyb20gJy4vY29uc3RydWN0cy9mYXJnYXRlJztcbmltcG9ydCB7IE9wZW5DbGF3QWxiIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2FsYic7XG5pbXBvcnQgeyBPcGVuQ2xhd0xvZ2dpbmcgfSBmcm9tICcuL2NvbnN0cnVjdHMvbG9nZ2luZyc7XG5pbXBvcnQgeyBDb25maWdNYW5hZ2VtZW50IH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2NvbmZpZy1tYW5hZ2VtZW50JztcbmltcG9ydCB7XG4gIERFRkFVTFRfQ09OVEFJTkVSX0NPTkZJRyxcbiAgREVGQVVMVF9CRURST0NLX0NPTkZJRyxcbiAgREVGQVVMVF9TVE9SQUdFX0NPTkZJRyxcbiAgREVGQVVMVF9MT0dHSU5HX0NPTkZJRyxcbn0gZnJvbSAnLi9jb25maWcnO1xuXG4vKipcbiAqIE9wZW5DbGF3IFN0YWNrIC0gU2VsZi1ob3N0ZWQgYXV0b25vbW91cyBhZ2VudCBwbGF0Zm9ybVxuICogXG4gKiBUaGlzIHN0YWNrIGRlcGxveXMgT3BlbkNsYXcgb24gQVdTIHVzaW5nIEVDUyBGYXJnYXRlIHdpdGg6XG4gKiAtIFZQQyB3aXRoIHB1YmxpYyBhbmQgcHJpdmF0ZSBzdWJuZXRzICh2aWEgT3BlbkNsYXdWcGMgY29uc3RydWN0KVxuICogLSBFQ1MgQ2x1c3RlciB3aXRoIEZhcmdhdGUgY2FwYWNpdHkgcHJvdmlkZXJcbiAqIC0gRUNSIHJlcG9zaXRvcnkgZm9yIGNvbnRhaW5lciBpbWFnZXNcbiAqIC0gRUZTIGZvciBwZXJzaXN0ZW50IHN0b3JhZ2VcbiAqIC0gUzMgZm9yIG9iamVjdCBzdG9yYWdlIHdpdGggZGVmYXVsdCBjb25maWcgZGVwbG95bWVudFxuICogLSBTZWNyZXRzIE1hbmFnZXIgZm9yIHNlbnNpdGl2ZSBjb25maWd1cmF0aW9uXG4gKiAtIENsb3VkV2F0Y2ggTG9ncyBmb3IgbG9nZ2luZyAodmlhIE9wZW5DbGF3TG9nZ2luZyBjb25zdHJ1Y3QpXG4gKiAtIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgKHZpYSBPcGVuQ2xhd0FsYiBjb25zdHJ1Y3QpXG4gKiAtIElBTSByb2xlcyB3aXRoIEJlZHJvY2sgcGVybWlzc2lvbnMgKHZpYSBPcGVuQ2xhd0lhbSBjb25zdHJ1Y3QpXG4gKiAtIENvbmZpZyBNYW5hZ2VtZW50IGZvciBydW50aW1lIGNvbmZpZ3VyYXRpb24gdXBkYXRlc1xuICovXG5leHBvcnQgY2xhc3MgT3BlbkNsYXdTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogT3BlbkNsYXdTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBNZXJnZSBwcm9wcyB3aXRoIGRlZmF1bHRzXG4gICAgY29uc3QgY3B1ID0gcHJvcHM/LmNwdSA/PyA1MTI7XG4gICAgY29uc3QgbWVtb3J5TWlCID0gcHJvcHM/Lm1lbW9yeU1pQiA/PyAxMDI0O1xuICAgIGNvbnN0IGJlZHJvY2tNb2RlbCA9IHByb3BzPy5iZWRyb2NrTW9kZWwgPz8gREVGQVVMVF9CRURST0NLX0NPTkZJRy5tb2RlbElkO1xuICAgIGNvbnN0IHVzZUdyYXZpdG9uID0gcHJvcHM/LnVzZUdyYXZpdG9uID8/IGZhbHNlOyAgLy8gRGlzYWJsZWQgLSBDb2RlQnVpbGQgdXNlcyBBTUQ2NFxuICAgIGNvbnN0IHZwY0lkID0gcHJvcHM/LnZwY0lkO1xuICAgIGNvbnN0IGRlc2lyZWRDb3VudCA9IHByb3BzPy5kZXNpcmVkQ291bnQgPz8gMTtcblxuICAgIC8vIENvc3Qgb3B0aW1pemF0aW9uIGZsYWdzXG4gICAgY29uc3QgdXNlTmF0R2F0ZXdheSA9IHByb3BzPy51c2VOYXRHYXRld2F5ID8/IHRydWU7XG4gICAgY29uc3QgdXNlRmFyZ2F0ZVNwb3QgPSBwcm9wcz8udXNlRmFyZ2F0ZVNwb3QgPz8gZmFsc2U7XG4gICAgY29uc3QgdXNlTmxiSW5zdGVhZE9mQWxiID0gcHJvcHM/LnVzZU5sYkluc3RlYWRPZkFsYiA/PyBmYWxzZTtcbiAgICBjb25zdCB1c2VBcGlHYXRld2F5ID0gcHJvcHM/LnVzZUFwaUdhdGV3YXkgPz8gZmFsc2U7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTdG9yYWdlIC0gUzMgQnVja2V0XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3Qgc3RvcmFnZSA9IG5ldyBPcGVuQ2xhd1N0b3JhZ2UodGhpcywgJ1N0b3JhZ2UnKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFNlY3JldHMgLSBTZWNyZXRzIE1hbmFnZXJcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBzZWNyZXRzID0gbmV3IE9wZW5DbGF3U2VjcmV0cyh0aGlzLCAnU2VjcmV0cycpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVlBDIC0gTmV0d29ya2luZ1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFVzZSBleGlzdGluZyBWUEMgb3IgY3JlYXRlIG5ldyBvbmUgdXNpbmcgdGhlIE9wZW5DbGF3VnBjIGNvbnN0cnVjdFxuICAgIGxldCB2cGM6IGVjMi5JVnBjO1xuICAgIGxldCBhbGJTZWN1cml0eUdyb3VwOiBlYzIuSVNlY3VyaXR5R3JvdXA7XG4gICAgbGV0IGZhcmdhdGVTZWN1cml0eUdyb3VwOiBlYzIuSVNlY3VyaXR5R3JvdXA7XG5cbiAgICBpZiAodnBjSWQpIHtcbiAgICAgIC8vIFVzZSBleGlzdGluZyBWUENcbiAgICAgIHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCAnRXhpc3RpbmdWcGMnLCB7IHZwY0lkIH0pO1xuICAgICAgXG4gICAgICAvLyBDcmVhdGUgc2VjdXJpdHkgZ3JvdXBzIGZvciBleGlzdGluZyBWUENcbiAgICAgIGFsYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0FsYlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlcicsXG4gICAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgICAgZWMyLlBvcnQudGNwKDgwKSxcbiAgICAgICAgJ0FsbG93IEhUVFAgdHJhZmZpYyBmcm9tIGFueXdoZXJlJ1xuICAgICAgKTtcbiAgICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgICAgZWMyLlBvcnQudGNwKDQ0MyksXG4gICAgICAgICdBbGxvdyBIVFRQUyB0cmFmZmljIGZyb20gYW55d2hlcmUnXG4gICAgICApO1xuXG4gICAgICBmYXJnYXRlU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRmFyZ2F0ZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgRmFyZ2F0ZSB0YXNrcycsXG4gICAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGZhcmdhdGVTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICBhbGJTZWN1cml0eUdyb3VwLFxuICAgICAgICBlYzIuUG9ydC50Y3AoMzAwMCksXG4gICAgICAgICdBbGxvdyB0cmFmZmljIGZyb20gQUxCIHRvIGNvbnRhaW5lciBwb3J0IDMwMDAnXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDcmVhdGUgbmV3IFZQQyB1c2luZyB0aGUgT3BlbkNsYXdWcGMgY29uc3RydWN0XG4gICAgICAvLyBVc2UgcHVibGljIHN1Ym5ldHMgaWYgTkFUIEdhdGV3YXkgaXMgZGlzYWJsZWQgKGNvc3Qgb3B0aW1pemF0aW9uKVxuICAgICAgY29uc3Qgb3BlbkNsYXdWcGMgPSBuZXcgT3BlbkNsYXdWcGModGhpcywgJ09wZW5DbGF3VnBjJywge1xuICAgICAgICB1c2VOYXRHYXRld2F5LFxuICAgICAgICB1c2VQdWJsaWNTdWJuZXRzOiAhdXNlTmF0R2F0ZXdheSxcbiAgICAgIH0pO1xuICAgICAgdnBjID0gb3BlbkNsYXdWcGMudnBjO1xuICAgICAgYWxiU2VjdXJpdHlHcm91cCA9IG9wZW5DbGF3VnBjLmFsYlNlY3VyaXR5R3JvdXA7XG4gICAgICBmYXJnYXRlU2VjdXJpdHlHcm91cCA9IG9wZW5DbGF3VnBjLmZhcmdhdGVTZWN1cml0eUdyb3VwO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEVGUyBTZWN1cml0eSBHcm91cFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGVmc1NlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0Vmc1NlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBPcGVuQ2xhdyBFRlMnLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogZmFsc2UsXG4gICAgfSk7XG4gICAgZWZzU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGZhcmdhdGVTZWN1cml0eUdyb3VwLFxuICAgICAgZWMyLlBvcnQudGNwKDIwNDkpLFxuICAgICAgJ0FsbG93IE5GUyBhY2Nlc3MgZnJvbSBFQ1MgdGFza3MnXG4gICAgKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEVGUyAtIFBlcnNpc3RlbnQgU3RvcmFnZVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGZpbGVTeXN0ZW0gPSBuZXcgZWZzLkZpbGVTeXN0ZW0odGhpcywgJ09wZW5DbGF3RWZzJywge1xuICAgICAgdnBjLFxuICAgICAgc2VjdXJpdHlHcm91cDogZWZzU2VjdXJpdHlHcm91cCxcbiAgICAgIHRocm91Z2hwdXRNb2RlOiBlZnMuVGhyb3VnaHB1dE1vZGUuQlVSU1RJTkcsXG4gICAgICBsaWZlY3ljbGVQb2xpY3k6IGVmcy5MaWZlY3ljbGVQb2xpY3kuQUZURVJfMzBfREFZUyxcbiAgICAgIHBlcmZvcm1hbmNlTW9kZTogZWZzLlBlcmZvcm1hbmNlTW9kZS5HRU5FUkFMX1BVUlBPU0UsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICAvLyBCYWNrdXAgbWFuYWdlZCBieSBBV1MgQmFja3VwIG9yIG1hbnVhbCBjb25maWd1cmF0aW9uXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBFQ1IgUmVwb3NpdG9yeVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IHJlcG9zaXRvcnkgPSBuZXcgZWNyLlJlcG9zaXRvcnkodGhpcywgJ09wZW5DbGF3UmVwb3NpdG9yeScsIHtcbiAgICAgIHJlcG9zaXRvcnlOYW1lOiBERUZBVUxUX0NPTlRBSU5FUl9DT05GSUcuaW1hZ2VOYW1lLFxuICAgICAgaW1hZ2VTY2FuT25QdXNoOiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG1heEltYWdlQ291bnQ6IDMwLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnS2VlcCBsYXN0IDMwIGltYWdlcycsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gRUZTIEFjY2VzcyBQb2ludFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGFjY2Vzc1BvaW50ID0gbmV3IGVmcy5BY2Nlc3NQb2ludCh0aGlzLCAnT3BlbkNsYXdBY2Nlc3NQb2ludCcsIHtcbiAgICAgIGZpbGVTeXN0ZW0sXG4gICAgICBwYXRoOiAnL29wZW5jbGF3JyxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIElBTSBSb2xlcyAtIFVzaW5nIE9wZW5DbGF3SWFtIENvbnN0cnVjdFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IG9wZW5DbGF3SWFtID0gbmV3IE9wZW5DbGF3SWFtKHRoaXMsICdPcGVuQ2xhd0lhbScsIHtcbiAgICAgIGJ1Y2tldEFybjogc3RvcmFnZS5idWNrZXQuYnVja2V0QXJuLFxuICAgICAgZ2F0ZXdheVRva2VuU2VjcmV0QXJuOiBzZWNyZXRzLmdhdGV3YXlUb2tlblNlY3JldC5zZWNyZXRBcm4sXG4gICAgICBleHRlcm5hbEFwaVNlY3JldEFybjogc2VjcmV0cy5leHRlcm5hbEFwaVNlY3JldD8uc2VjcmV0QXJuLFxuICAgICAgZWZzRmlsZVN5c3RlbUFybjogZmlsZVN5c3RlbS5maWxlU3lzdGVtQXJuLFxuICAgICAgYmVkcm9ja01vZGVsSWQ6IGJlZHJvY2tNb2RlbCxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEZhcmdhdGUgU2VydmljZSAtIFVzaW5nIE9wZW5DbGF3RmFyZ2F0ZSBDb25zdHJ1Y3RcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBmYXJnYXRlID0gbmV3IE9wZW5DbGF3RmFyZ2F0ZSh0aGlzLCAnT3BlbkNsYXdGYXJnYXRlJywge1xuICAgICAgdnBjLFxuICAgICAgYnVja2V0OiBzdG9yYWdlLmJ1Y2tldCxcbiAgICAgIGdhdGV3YXlUb2tlblNlY3JldDogc2VjcmV0cy5nYXRld2F5VG9rZW5TZWNyZXQsXG4gICAgICBleHRlcm5hbEFwaVNlY3JldDogc2VjcmV0cy5leHRlcm5hbEFwaVNlY3JldCxcbiAgICAgIHRhc2tFeGVjdXRpb25Sb2xlOiBvcGVuQ2xhd0lhbS50YXNrRXhlY3V0aW9uUm9sZSxcbiAgICAgIHRhc2tSb2xlOiBvcGVuQ2xhd0lhbS50YXNrUm9sZSxcbiAgICAgIHNlY3VyaXR5R3JvdXA6IGZhcmdhdGVTZWN1cml0eUdyb3VwLFxuICAgICAgY3B1LFxuICAgICAgbWVtb3J5TWlCLFxuICAgICAgdXNlR3Jhdml0b24sXG4gICAgICBiZWRyb2NrTW9kZWxJZDogYmVkcm9ja01vZGVsLFxuICAgICAgYmVkcm9ja1JlZ2lvbjogREVGQVVMVF9CRURST0NLX0NPTkZJRy5yZWdpb24sXG4gICAgICByZXBvc2l0b3J5LFxuICAgICAgZW5hYmxlQXV0b1NjYWxpbmc6IHRydWUsXG4gICAgICBtaW5DYXBhY2l0eTogMSxcbiAgICAgIG1heENhcGFjaXR5OiAzLFxuICAgICAgZGVzaXJlZENvdW50LFxuICAgICAgLy8gQ29zdCBvcHRpbWl6YXRpb24gb3B0aW9uc1xuICAgICAgdXNlRmFyZ2F0ZVNwb3QsXG4gICAgICB1c2VQdWJsaWNTdWJuZXRzOiAhdXNlTmF0R2F0ZXdheSxcbiAgICB9KTtcblxuICAgIC8vIE5PVEU6IEVGUyBtb3VudCBkaXNhYmxlZCBkdWUgdG8gYWNjZXNzIGlzc3VlcyBpbiBGYXJnYXRlXG4gICAgLy8gVXNpbmcgZXBoZW1lcmFsIHN0b3JhZ2UgaW5zdGVhZCAoZGF0YSBsb3N0IG9uIHRhc2sgc3RvcClcbiAgICAvLyBUT0RPOiBSZS1lbmFibGUgRUZTIGFmdGVyIGZpeGluZyBJQU0vc2VjdXJpdHkgZ3JvdXAgY29uZmlndXJhdGlvblxuICAgIC8vIFxuICAgIC8vIEVGUyB2b2x1bWUgY29uZmlndXJhdGlvbiAoZGlzYWJsZWQpOlxuICAgIC8vIGZhcmdhdGUudGFza0RlZmluaXRpb24uYWRkVm9sdW1lKHtcbiAgICAvLyAgIG5hbWU6ICdvcGVuY2xhdy1kYXRhJyxcbiAgICAvLyAgIGVmc1ZvbHVtZUNvbmZpZ3VyYXRpb246IHtcbiAgICAvLyAgICAgZmlsZVN5c3RlbUlkOiBmaWxlU3lzdGVtLmZpbGVTeXN0ZW1JZCxcbiAgICAvLyAgICAgdHJhbnNpdEVuY3J5cHRpb246ICdFTkFCTEVEJyxcbiAgICAvLyAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgIC8vICAgICAgIGFjY2Vzc1BvaW50SWQ6IGFjY2Vzc1BvaW50LmFjY2Vzc1BvaW50SWQsXG4gICAgLy8gICAgICAgaWFtOiAnRElTQUJMRUQnLFxuICAgIC8vICAgICB9LFxuICAgIC8vICAgfSxcbiAgICAvLyB9KTtcbiAgICAvLyBmYXJnYXRlLmNvbnRhaW5lci5hZGRNb3VudFBvaW50cyh7XG4gICAgLy8gICBzb3VyY2VWb2x1bWU6ICdvcGVuY2xhdy1kYXRhJyxcbiAgICAvLyAgIGNvbnRhaW5lclBhdGg6ICcvYXBwL2RhdGEnLFxuICAgIC8vICAgcmVhZE9ubHk6IGZhbHNlLFxuICAgIC8vIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciAtIFVzaW5nIE9wZW5DbGF3QWxiIENvbnN0cnVjdFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGFsYiA9IG5ldyBPcGVuQ2xhd0FsYih0aGlzLCAnT3BlbkNsYXdBbGInLCB7XG4gICAgICB2cGMsXG4gICAgICBzZWN1cml0eUdyb3VwOiBhbGJTZWN1cml0eUdyb3VwLFxuICAgICAgZmFyZ2F0ZVNlcnZpY2U6IGZhcmdhdGUuc2VydmljZSxcbiAgICAgIGhlYWx0aENoZWNrUGF0aDogREVGQVVMVF9DT05UQUlORVJfQ09ORklHLmhlYWx0aENoZWNrUGF0aCxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIExvZ2dpbmcgLSBVc2luZyBPcGVuQ2xhd0xvZ2dpbmcgQ29uc3RydWN0XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgbG9nZ2luZyA9IG5ldyBPcGVuQ2xhd0xvZ2dpbmcodGhpcywgJ09wZW5DbGF3TG9nZ2luZycsIHtcbiAgICAgIGxvZ1JldGVudGlvbjogREVGQVVMVF9MT0dHSU5HX0NPTkZJRy5yZXRlbnRpb25EYXlzIGFzIGxvZ3MuUmV0ZW50aW9uRGF5cyxcbiAgICAgIGFsYjogYWxiLmxvYWRCYWxhbmNlcixcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9lY3Mvb3BlbmNsYXcnLFxuICAgICAgZW5hYmxlRW5jcnlwdGlvbjogREVGQVVMVF9MT0dHSU5HX0NPTkZJRy5lbmNyeXB0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ29uZmlnIE1hbmFnZW1lbnRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBjb25maWdNYW5hZ2VtZW50ID0gbmV3IENvbmZpZ01hbmFnZW1lbnQodGhpcywgJ0NvbmZpZ01hbmFnZW1lbnQnLCB7XG4gICAgICB2cGMsXG4gICAgICBidWNrZXQ6IHN0b3JhZ2UuYnVja2V0LFxuICAgICAgZmFyZ2F0ZVNlcnZpY2U6IGZhcmdhdGUuc2VydmljZSxcbiAgICAgIGNvbmZpZ0tleVByZWZpeDogJ2NvbmZpZy8nLFxuICAgICAgZW5hYmxlQXV0b1JlbG9hZDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBEZXBsb3kgRGVmYXVsdCBDb25maWdzIHRvIFMzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgY29uZmlnRGVwbG95bWVudCA9IG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsICdEZXBsb3lDb25maWcnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KCcuL2RvY2tlci9jb25maWcnKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogc3RvcmFnZS5idWNrZXQsXG4gICAgICBkZXN0aW5hdGlvbktleVByZWZpeDogJ2NvbmZpZy8nLFxuICAgICAgcmV0YWluT25EZWxldGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gRW5zdXJlIGNvbmZpZyBkZXBsb3ltZW50IGhhcHBlbnMgYWZ0ZXIgYnVja2V0IGlzIGNyZWF0ZWRcbiAgICBjb25maWdEZXBsb3ltZW50Lm5vZGUuYWRkRGVwZW5kZW5jeShzdG9yYWdlLmJ1Y2tldCk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTdGFjayBPdXRwdXRzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FsYlVybCcsIHtcbiAgICAgIHZhbHVlOiBhbGIuYWxiVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdPcGVuQ2xhdyBBcHBsaWNhdGlvbiBVUkwnLFxuICAgICAgZXhwb3J0TmFtZTogJ09wZW5DbGF3QWxiVXJsJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FsYkRuc05hbWUnLCB7XG4gICAgICB2YWx1ZTogYWxiLmFsYkRuc05hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FMQiBETlMgTmFtZScsXG4gICAgICBleHBvcnROYW1lOiAnT3BlbkNsYXdBbGJEbnNOYW1lJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1MzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBzdG9yYWdlLmJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgZm9yIE9wZW5DbGF3IHN0b3JhZ2UnLFxuICAgICAgZXhwb3J0TmFtZTogJ09wZW5DbGF3UzNCdWNrZXQnXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR2F0ZXdheVRva2VuU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IHNlY3JldHMuZ2F0ZXdheVRva2VuU2VjcmV0LnNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnR2F0ZXdheSBUb2tlbiBTZWNyZXQgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdPcGVuQ2xhd0dhdGV3YXlUb2tlblNlY3JldCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFY3NDbHVzdGVyTmFtZScsIHtcbiAgICAgIHZhbHVlOiBmYXJnYXRlLmNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUyBDbHVzdGVyIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogJ09wZW5DbGF3Q2x1c3Rlck5hbWUnXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRWNzU2VydmljZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZmFyZ2F0ZS5zZXJ2aWNlLnNlcnZpY2VOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgU2VydmljZSBOYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdPcGVuQ2xhd1NlcnZpY2VOYW1lJ1xuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkV2F0Y2hMb2dHcm91cCcsIHtcbiAgICAgIHZhbHVlOiBsb2dnaW5nLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBMb2cgR3JvdXAnLFxuICAgICAgZXhwb3J0TmFtZTogJ09wZW5DbGF3TG9nR3JvdXAnXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBMZWdhY3kgT3V0cHV0cyAoa2VwdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVnBjSWQnLCB7XG4gICAgICB2YWx1ZTogdnBjLnZwY0lkLFxuICAgICAgZGVzY3JpcHRpb246ICdWUEMgSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NsdXN0ZXJOYW1lJywge1xuICAgICAgdmFsdWU6IGZhcmdhdGUuY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRUNTIENsdXN0ZXIgTmFtZSAobGVnYWN5KScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRWNyUmVwb3NpdG9yeVVyaScsIHtcbiAgICAgIHZhbHVlOiByZXBvc2l0b3J5LnJlcG9zaXRvcnlVcmksXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUiBSZXBvc2l0b3J5IFVSSScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRmlsZVN5c3RlbUlkJywge1xuICAgICAgdmFsdWU6IGZpbGVTeXN0ZW0uZmlsZVN5c3RlbUlkLFxuICAgICAgZGVzY3JpcHRpb246ICdFRlMgRmlsZSBTeXN0ZW0gSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogc3RvcmFnZS5idWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQnVja2V0IE5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwTmFtZScsIHtcbiAgICAgIHZhbHVlOiBmYXJnYXRlLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBMb2cgR3JvdXAgKEZhcmdhdGUpJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZXJ2aWNlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBmYXJnYXRlLnNlcnZpY2Uuc2VydmljZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUyBTZXJ2aWNlIE5hbWUgKGxlZ2FjeSknLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JlZHJvY2tNb2RlbCcsIHtcbiAgICAgIHZhbHVlOiBiZWRyb2NrTW9kZWwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0JlZHJvY2sgTW9kZWwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FyY2hpdGVjdHVyZScsIHtcbiAgICAgIHZhbHVlOiB1c2VHcmF2aXRvbiA/ICdBUk02NCAoR3Jhdml0b24pJyA6ICdYODZfNjQnLFxuICAgICAgZGVzY3JpcHRpb246ICdDUFUgQXJjaGl0ZWN0dXJlJyxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFN0YWNrIE1ldGFkYXRhXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdTdGFjaycsICdPcGVuQ2xhdycpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTW9kZWwnLCBiZWRyb2NrTW9kZWwpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnQXJjaGl0ZWN0dXJlJywgdXNlR3Jhdml0b24gPyAnQVJNNjQnIDogJ1g4Nl82NCcpO1xuICB9XG59XG4iXX0=