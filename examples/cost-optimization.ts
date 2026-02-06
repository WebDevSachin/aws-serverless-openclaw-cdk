#!/usr/bin/env node
/**
 * Cost Optimization Examples for OpenClaw AWS CDK
 * 
 * This file shows various deployment configurations to minimize costs.
 * 
 * Cost Breakdown (us-east-1, monthly):
 * =====================================
 * 
 * FULL SETUP (default):                    ~$72/month
 *   - ALB: $22
 *   - NAT Gateway: $32
 *   - Fargate (512/1024): $15
 *   - S3 + CloudWatch: $3
 * 
 * MINIMAL (development):                   ~$15/month
 *   - NLB: $5 (instead of ALB)
 *   - No NAT Gateway: $0 (public subnets)
 *   - Fargate Spot (256/512): $5 (70% savings)
 *   - S3 + CloudWatch: $3
 * 
 * SPOT INSTANCES:                          ~$35/month
 *   - ALB: $22
 *   - NAT Gateway: $32
 *   - Fargate Spot: $5 (70% savings on compute)
 *   - S3 + CloudWatch: $3
 * 
 * MANUAL CONTROL (scale to 0):             ~$3/month when stopped
 *   - Same as FULL but desiredCount: 0
 *   - Scale to 1 when needed
 */

import * as cdk from 'aws-cdk-lib';
import { OpenClawStack } from '../lib/openclaw-stack';

const app = new cdk.App();

// ============================================================
// 1. MINIMAL COST - Development/Testing (~$15/month)
// ============================================================
// Best for: Development, testing, non-critical workloads
// Trade-offs: 
//   - Tasks run in public subnets (still secure with SGs)
//   - Can be interrupted (Spot instances)
// ============================================================
new OpenClawStack(app, 'OpenClawMinimal', {
  cpu: 256,
  memoryMiB: 512,
  useNatGateway: false,      // Saves ~$32/month
  useFargateSpot: true,      // Saves ~70% on compute
  useGraviton: true,
  
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: 'development',
    CostOptimization: 'minimal',
  },
});

// ============================================================
// 2. SPOT ONLY - Fault Tolerant (~$35/month)
// ============================================================
// Best for: Workloads that can handle interruptions
// Trade-offs: Tasks can be interrupted with 2-minute warning
// ============================================================
new OpenClawStack(app, 'OpenClawSpot', {
  cpu: 512,
  memoryMiB: 1024,
  useNatGateway: true,
  useFargateSpot: true,      // 70% savings on compute
  
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: 'production',
    CostOptimization: 'spot',
  },
});

// ============================================================
// 3. MANUAL CONTROL - Scale to Zero (~$3/month when stopped)
// ============================================================
// Best for: Infrequent use
// Usage: Deploy with desiredCount: 0 to stop, 1 to start
// ============================================================
new OpenClawStack(app, 'OpenClawManual', {
  cpu: 512,
  memoryMiB: 1024,
  desiredCount: 0,  // Change to 1 to start
  
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: 'personal',
    CostOptimization: 'manual',
  },
});

app.synth();
