import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { OpenClawStackProps } from './types';
import { OpenClawVpc } from './constructs/vpc';
import { OpenClawIam } from './constructs/iam';
import { OpenClawStorage } from './constructs/storage';
import { OpenClawSecrets } from './constructs/secrets';
import { OpenClawFargate } from './constructs/fargate';
import { OpenClawAlb } from './constructs/alb';
import { OpenClawLogging } from './constructs/logging';
import { OpenClawCloudFront } from './constructs/cloudfront';
import { ConfigManagement } from './constructs/config-management';
import {
  DEFAULT_CONTAINER_CONFIG,
  DEFAULT_BEDROCK_CONFIG,
  DEFAULT_STORAGE_CONFIG,
  DEFAULT_LOGGING_CONFIG,
} from './config';

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
export class OpenClawStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: OpenClawStackProps) {
    super(scope, id, props);

    // Merge props with defaults
    const cpu = props?.cpu ?? 512;
    const memoryMiB = props?.memoryMiB ?? 1024;
    const bedrockModel = props?.bedrockModel ?? DEFAULT_BEDROCK_CONFIG.modelId;
    const useGraviton = props?.useGraviton ?? false;  // Disabled - CodeBuild uses AMD64
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
    const storage = new OpenClawStorage(this, 'Storage');

    // ============================================================
    // Secrets - Secrets Manager
    // ============================================================
    const secrets = new OpenClawSecrets(this, 'Secrets', {
      openRouterApiKey: props?.openRouterApiKey,
      kimiApiKey: props?.kimiApiKey,
    });

    // ============================================================
    // VPC - Networking
    // ============================================================
    // Use existing VPC or create new one using the OpenClawVpc construct
    let vpc: ec2.IVpc;
    let albSecurityGroup: ec2.ISecurityGroup;
    let fargateSecurityGroup: ec2.ISecurityGroup;

    if (vpcId) {
      // Use existing VPC
      vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', { vpcId });
      
      // Create security groups for existing VPC
      albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
        vpc,
        description: 'Security group for OpenClaw Application Load Balancer',
        allowAllOutbound: true,
      });
      albSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'Allow HTTP traffic from anywhere'
      );
      albSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(443),
        'Allow HTTPS traffic from anywhere'
      );

      fargateSecurityGroup = new ec2.SecurityGroup(this, 'FargateSecurityGroup', {
        vpc,
        description: 'Security group for OpenClaw Fargate tasks',
        allowAllOutbound: true,
      });
      fargateSecurityGroup.addIngressRule(
        albSecurityGroup,
        ec2.Port.tcp(18789),
        'Allow traffic from ALB to container port 18789'
      );
    } else {
      // Create new VPC using the OpenClawVpc construct
      // Use public subnets if NAT Gateway is disabled (cost optimization)
      const openClawVpc = new OpenClawVpc(this, 'OpenClawVpc', {
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
    efsSecurityGroup.addIngressRule(
      fargateSecurityGroup,
      ec2.Port.tcp(2049),
      'Allow NFS access from ECS tasks'
    );

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
    const stackNameShort = this.stackName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const repository = new ecr.Repository(this, 'OpenClawRepository', {
      repositoryName: `openclaw-${stackNameShort}`,
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
    // EFS Access Point with full permissions for node user
    // ============================================================
    const accessPoint = new efs.AccessPoint(this, 'OpenClawAccessPoint', {
      fileSystem,
      path: '/openclaw',
      // Run as node user (UID/GID 1000) with full permissions
      posixUser: {
        uid: '1000',
        gid: '1000',
      },
      createAcl: {
        ownerUid: '1000',
        ownerGid: '1000',
        permissions: '0777',
      },
    });

    // ============================================================
    // IAM Roles - Using OpenClawIam Construct
    // ============================================================
    const openClawIam = new OpenClawIam(this, 'OpenClawIam', {
      bucketArn: storage.bucket.bucketArn,
      gatewayTokenSecretArn: secrets.gatewayTokenSecret.secretArn,
      externalApiSecretArn: secrets.externalApiSecret?.secretArn,
      openRouterApiSecretArn: secrets.openRouterApiSecret?.secretArn,
      kimiApiSecretArn: secrets.kimiApiSecret?.secretArn,
      efsFileSystemArn: fileSystem.fileSystemArn,
      bedrockModelId: bedrockModel,
    });

    // ============================================================
    // Fargate Service - Using OpenClawFargate Construct
    // ============================================================
    const fargate = new OpenClawFargate(this, 'OpenClawFargate', {
      vpc,
      bucket: storage.bucket,
      gatewayTokenSecret: secrets.gatewayTokenSecret,
      externalApiSecret: secrets.externalApiSecret,
      openRouterApiSecret: secrets.openRouterApiSecret,
      kimiApiSecret: secrets.kimiApiSecret,
      taskExecutionRole: openClawIam.taskExecutionRole,
      taskRole: openClawIam.taskRole,
      securityGroup: fargateSecurityGroup,
      cpu,
      memoryMiB,
      useGraviton,
      bedrockModelId: bedrockModel,
      bedrockRegion: DEFAULT_BEDROCK_CONFIG.region,
      repository,
      enableAutoScaling: true,
      minCapacity: 1,
      maxCapacity: 3,
      desiredCount,
      // Cost optimization options
      useFargateSpot,
      usePublicSubnets: !useNatGateway,
    });

    // ============================================================
    // EFS Mount for OpenClaw Config/Persistence
    // Following official Docker pattern: /home/node/.openclaw
    // Using access point with IAM auth for proper permissions
    // ============================================================
    fargate.taskDefinition.addVolume({
      name: 'openclaw-data',
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: 'ENABLED',
        authorizationConfig: {
          accessPointId: accessPoint.accessPointId,
          iam: 'ENABLED',
        },
      },
    });
    fargate.container.addMountPoints({
      sourceVolume: 'openclaw-data',
      containerPath: '/home/node/.openclaw',
      readOnly: false,
    });

    // ============================================================
    // Application Load Balancer - Using OpenClawAlb Construct
    // ============================================================
    const alb = new OpenClawAlb(this, 'OpenClawAlb', {
      vpc,
      securityGroup: albSecurityGroup,
      fargateService: fargate.service,
      healthCheckPath: DEFAULT_CONTAINER_CONFIG.healthCheckPath,
    });

    // ============================================================
    // CloudFront Distribution - HTTPS with Basic Auth
    // ============================================================
    const cloudfrontDist = new OpenClawCloudFront(this, 'OpenClawCloudFront', {
      loadBalancer: alb.loadBalancer,
      authUsername: 'admin',
      authPassword: 'openclaw2025',
    });

    // ============================================================
    // Logging - Using OpenClawLogging Construct
    // ============================================================
    const logging = new OpenClawLogging(this, 'OpenClawLogging', {
      logRetention: DEFAULT_LOGGING_CONFIG.retentionDays as logs.RetentionDays,
      alb: alb.loadBalancer,
      logGroupName: '/ecs/openclaw',
      enableEncryption: DEFAULT_LOGGING_CONFIG.encryption,
    });

    // ============================================================
    // Config Management
    // ============================================================
    const configManagement = new ConfigManagement(this, 'ConfigManagement', {
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
      exportName: `${this.stackName}-AlbUrl`
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: alb.albDnsName,
      description: 'ALB DNS Name',
      exportName: `${this.stackName}-AlbDnsName`
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: storage.bucket.bucketName,
      description: 'S3 Bucket for OpenClaw storage',
      exportName: `${this.stackName}-S3Bucket`
    });

    new cdk.CfnOutput(this, 'GatewayTokenSecretArn', {
      value: secrets.gatewayTokenSecret.secretArn,
      description: 'Gateway Token Secret ARN',
      exportName: `${this.stackName}-GatewayTokenSecret`
    });

    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: fargate.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${this.stackName}-ClusterName`
    });

    new cdk.CfnOutput(this, 'EcsServiceName', {
      value: fargate.service.serviceName,
      description: 'ECS Service Name',
      exportName: `${this.stackName}-ServiceName`
    });

    new cdk.CfnOutput(this, 'CloudWatchLogGroup', {
      value: logging.logGroup.logGroupName,
      description: 'CloudWatch Log Group',
      exportName: `${this.stackName}-LogGroup`
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
