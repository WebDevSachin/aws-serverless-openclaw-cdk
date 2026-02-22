import { SSTConfig } from "sst";
import { Bucket, Cluster, Service, Config } from "sst/constructs";
import * as aws_ec2 from "aws-cdk-lib/aws-ec2";
import * as aws_efs from "aws-cdk-lib/aws-efs";
import * as aws_logs from "aws-cdk-lib/aws-logs";

export default {
  config(_input) {
    return {
      name: "openclaw",
      region: process.env.AWS_REGION || "ap-south-1",
    };
  },
  stacks(app) {
    // VPC Stack
    app.stack(function VPCStack({ stack }) {
      const vpc = new aws_ec2.Vpc(stack, "OpenClawVPC", {
        maxAzs: 2,
        natGateways: 1,
        subnetConfiguration: [
          {
            name: "Public",
            subnetType: aws_ec2.SubnetType.PUBLIC,
            cidrMask: 24,
          },
          {
            name: "Private",
            subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
        ],
      });

      stack.addOutputs({
        VpcId: vpc.vpcId,
      });

      return { vpc };
    });

    // Storage Stack - EFS for persistent data
    app.stack(function StorageStack({ stack }) {
      const { vpc } = app.nodes.getChild("VPCStack") as any;

      // EFS File System
      const fileSystem = new aws_efs.FileSystem(stack, "OpenClawEFS", {
        vpc,
        lifecyclePolicy: aws_efs.LifecyclePolicy.AFTER_30_DAYS,
        performanceMode: aws_efs.PerformanceMode.GENERAL_PURPOSE,
        throughputMode: aws_efs.ThroughputMode.PROVISIONED,
        provisionedThroughputPerSecond: aws_efs.Size.mebibytes(100),
        removalPolicy: stack.cdk.RemovalPolicy.RETAIN,
      });

      // Access Point for OpenClaw data
      const accessPoint = fileSystem.addAccessPoint("OpenClawDataAP", {
        path: "/openclaw-data",
        createAcl: {
          ownerGid: 1000,
          ownerUid: 1000,
          permissions: "750",
        },
        posixUser: {
          gid: 1000,
          uid: 1000,
        },
      });

      // S3 Bucket for logs and backups
      const bucket = new Bucket(stack, "OpenClawBucket", {
        cors: [
          {
            allowedOrigins: ["*"],
            allowedMethods: ["GET", "PUT", "POST", "DELETE"],
            allowedHeaders: ["*"],
          },
        ],
      });

      stack.addOutputs({
        EfsFileSystemId: fileSystem.fileSystemId,
        S3BucketName: bucket.bucketName,
      });

      return { fileSystem, accessPoint, bucket };
    });

    // ECS Cluster Stack
    app.stack(function ClusterStack({ stack }) {
      const { vpc } = app.nodes.getChild("VPCStack") as any;
      const { fileSystem, accessPoint } = app.nodes.getChild("StorageStack") as any;

      // ECS Cluster
      const cluster = new Cluster(stack, "OpenClawCluster", {
        vpc,
        containerInsights: true,
      });

      // EFS Volume Configuration
      const efsVolume: any = {
        name: "openclaw-data",
        efsVolumeConfiguration: {
          fileSystemId: fileSystem.fileSystemId,
          transitEncryption: "ENABLED",
          authorizationConfig: {
            accessPointId: accessPoint.accessPointId,
            iam: "ENABLED",
          },
        },
      };

      stack.addOutputs({
        ClusterName: cluster.clusterName,
      });

      return { cluster, efsVolume };
    });

    // OpenClaw Service Stack - Main Deployment
    app.stack(function OpenClawServiceStack({ stack }) {
      const { vpc } = app.nodes.getChild("VPCStack") as any;
      const { bucket } = app.nodes.getChild("StorageStack") as any;
      const { cluster, efsVolume } = app.nodes.getChild("ClusterStack") as any;

      // Secrets from environment
      const OPENROUTER_API_KEY = new Config.Secret(stack, "OPENROUTER_API_KEY");
      const SYSTEM_OPENROUTER_KEY = new Config.Secret(stack, "SYSTEM_OPENROUTER_KEY");
      const GATEWAY_TOKEN = new Config.Secret(stack, "GATEWAY_TOKEN");

      // OpenClaw Service with FULL PERMISSIONS
      const service = new Service(stack, "OpenClawService", {
        cluster,
        serviceName: "openclaw",
        cpu: "4 vCPU",
        memory: "8 GB",
        architecture: "x86_64",
        storage: "100 GB",
        image: {
          context: "./docker",
          dockerfile: "Dockerfile",
        },
        port: 18789,
        path: "/",
        health: {
          path: "/health",
          interval: "30 seconds",
          timeout: "5 seconds",
          startPeriod: "120 seconds",
          healthyThreshold: 2,
          unhealthyThreshold: 3,
        },
        environment: {
          NODE_ENV: "production",
          OPENCLAW_HOME: "/home/node",
          GATEWAY_MODE: "swarm",
          GATEWAY_ROLE: "primary",
          LOG_LEVEL: "debug",
          BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY || "",
        },
        secrets: {
          OPENROUTER_API_KEY,
          SYSTEM_OPENROUTER_KEY,
          GATEWAY_TOKEN,
        },
        volumes: [
          {
            path: "/home/node/.openclaw",
            efs: efsVolume,
          },
        ],
        logging: {
          retention: "three_months",
        },
        // Full permissions - no sandbox
        // Running as root for maximum access
        // This allows system-level operations
        permissions: [
          {
            actions: ["s3:*"],
            resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
          },
          {
            actions: ["bedrock:*"],
            resources: ["*"],
          },
          {
            actions: [
              "ecr:GetAuthorizationToken",
              "ecr:BatchCheckLayerAvailability",
              "ecr:GetDownloadUrlForLayer",
              "ecr:BatchGetImage",
            ],
            resources: ["*"],
          },
          {
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            resources: ["*"],
          },
        ],
        // Enable ECS Exec for debugging
        exec: true,
        // Auto-scaling configuration
        scaling: {
          minContainers: 1,
          maxContainers: 10,
          cpuUtilization: 70,
          memoryUtilization: 70,
          requestCount: 1000,
        },
      });

      // Additional Agent Services (Core Team)
      const agentCore1 = new Service(stack, "AgentCore1", {
        cluster,
        serviceName: "agent-core-1",
        cpu: "2 vCPU",
        memory: "4 GB",
        architecture: "x86_64",
        image: {
          context: "./docker",
          dockerfile: "Dockerfile",
        },
        environment: {
          NODE_ENV: "production",
          OPENCLAW_HOME: "/home/node",
          AGENT_ID: "agent-core-1",
          AGENT_TEAM: "core",
          AGENT_ROLE: "generalist",
          GATEWAY_PRIMARY: service.url,
          MAX_CONCURRENT_TASKS: "5",
        },
        secrets: {
          OPENROUTER_API_KEY,
          SYSTEM_OPENROUTER_KEY,
        },
        volumes: [
          {
            path: "/home/node/.openclaw",
            efs: efsVolume,
          },
        ],
        permissions: [
          {
            actions: ["s3:*", "bedrock:*", "logs:*"],
            resources: ["*"],
          },
        ],
        exec: true,
      });

      const agentCore2 = new Service(stack, "AgentCore2", {
        cluster,
        serviceName: "agent-core-2",
        cpu: "2 vCPU",
        memory: "4 GB",
        architecture: "x86_64",
        image: {
          context: "./docker",
          dockerfile: "Dockerfile",
        },
        environment: {
          NODE_ENV: "production",
          OPENCLAW_HOME: "/home/node",
          AGENT_ID: "agent-core-2",
          AGENT_TEAM: "core",
          AGENT_ROLE: "generalist",
          GATEWAY_PRIMARY: service.url,
          MAX_CONCURRENT_TASKS: "5",
        },
        secrets: {
          OPENROUTER_API_KEY,
          SYSTEM_OPENROUTER_KEY,
        },
        volumes: [
          {
            path: "/home/node/.openclaw",
            efs: efsVolume,
          },
        ],
        permissions: [
          {
            actions: ["s3:*", "bedrock:*", "logs:*"],
            resources: ["*"],
          },
        ],
        exec: true,
      });

      // Code Team Agents
      const agentCode1 = new Service(stack, "AgentCode1", {
        cluster,
        serviceName: "agent-code-1",
        cpu: "2 vCPU",
        memory: "4 GB",
        architecture: "x86_64",
        image: {
          context: "./docker",
          dockerfile: "Dockerfile",
        },
        environment: {
          NODE_ENV: "production",
          OPENCLAW_HOME: "/home/node",
          AGENT_ID: "agent-code-1",
          AGENT_TEAM: "code",
          AGENT_ROLE: "developer",
          GATEWAY_PRIMARY: service.url,
          MAX_CONCURRENT_TASKS: "3",
          SPECIALIZATION: "code",
        },
        secrets: {
          OPENROUTER_API_KEY,
          SYSTEM_OPENROUTER_KEY,
        },
        volumes: [
          {
            path: "/home/node/.openclaw",
            efs: efsVolume,
          },
        ],
        permissions: [
          {
            actions: ["s3:*", "bedrock:*", "logs:*", "ecr:*", "ecs:*"],
            resources: ["*"],
          },
        ],
        exec: true,
      });

      // DevOps Team Agent
      const agentDevOps1 = new Service(stack, "AgentDevOps1", {
        cluster,
        serviceName: "agent-devops-1",
        cpu: "2 vCPU",
        memory: "4 GB",
        architecture: "x86_64",
        image: {
          context: "./docker",
          dockerfile: "Dockerfile",
        },
        environment: {
          NODE_ENV: "production",
          OPENCLAW_HOME: "/home/node",
          AGENT_ID: "agent-devops-1",
          AGENT_TEAM: "devops",
          AGENT_ROLE: "architect",
          GATEWAY_PRIMARY: service.url,
          MAX_CONCURRENT_TASKS: "3",
          SPECIALIZATION: "infrastructure",
        },
        secrets: {
          OPENROUTER_API_KEY,
          SYSTEM_OPENROUTER_KEY,
        },
        volumes: [
          {
            path: "/home/node/.openclaw",
            efs: efsVolume,
          },
        ],
        permissions: [
          {
            actions: ["*"],
            resources: ["*"],
          },
        ],
        exec: true,
      });

      stack.addOutputs({
        ServiceURL: service.url,
        GatewayEndpoint: service.url,
        PrimaryAgent: agentCore1.url,
      });
    });
  },
} satisfies SSTConfig;
