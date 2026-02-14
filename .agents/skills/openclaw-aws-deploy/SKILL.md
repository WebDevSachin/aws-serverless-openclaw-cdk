---
name: openclaw-aws-deploy
description: Deploy and manage OpenClaw on AWS infrastructure with automated testing. Use when deploying OpenClaw to AWS ECS Fargate, troubleshooting deployment issues, configuring CloudFront/ALB, fixing WebSocket/origin errors, or setting up HTTPS with authentication. Handles the complete lifecycle - infrastructure deployment, container builds, configuration management, health checks, and automated end-to-end testing with Playwright.
---

# OpenClaw AWS Deployment Skill

Complete deployment and management of OpenClaw on AWS with automated testing and debugging.

## Quick Start

```bash
# Deploy everything
./scripts/deploy.sh

# Test deployment
./scripts/test-e2e.sh

# Debug issues
./scripts/debug.sh
```

## Deployment Phases

### Phase 1: Infrastructure Planning

1. **Review current state**
   - Check AWS credentials: `aws sts get-caller-identity`
   - Verify CDK bootstrap: `npx cdk bootstrap`
   - Review config: `cat docker/config/openclaw.json`

2. **Validate configuration**
   - Port: 18789 (OpenClaw default)
   - Model: amazon.nova-micro-v1:0 (cheapest)
   - Region: ap-south-1
   - Key settings for HTTP/LAN access:
     ```json
     {
       "gateway": {
         "controlUi": {
           "allowedOrigins": ["*"],
           "allowInsecureAuth": true,
           "enableIframe": true
         }
       }
     }
     ```

### Phase 2: Deploy Infrastructure

```bash
cd /Users/sachinkumar/aws-openclaw
npm install
npx cdk deploy --require-approval never
```

**Critical resources created:**
- ECS Cluster + Fargate Service
- ALB (HTTP on port 80)
- CloudFront (HTTPS with auth)
- S3 bucket for config
- ECR repository

### Phase 3: Build and Push Container

```bash
# Get ECR login
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  019015402914.dkr.ecr.ap-south-1.amazonaws.com

# Build and push (from official OpenClaw base + S3 config sync)
docker build --platform linux/amd64 -f docker/Dockerfile -t openclaw:latest .
docker tag openclaw:latest \
  019015402914.dkr.ecr.ap-south-1.amazonaws.com/openclaw:latest
docker push 019015402914.dkr.ecr.ap-south-1.amazonaws.com/openclaw:latest
```

### Phase 4: Deploy Config and Restart

```bash
# Upload config to S3
aws s3 cp docker/config/openclaw.json \
  s3://openclaw-storage-019015402914/config/openclaw.json

# Restart service to pick up config
aws ecs update-service \
  --cluster openclaw-cluster \
  --service openclaw-service \
  --force-new-deployment
```

### Phase 5: Automated Testing with Playwright

**Install Playwright:**
```bash
cd /Users/sachinkumar/aws-openclaw/test-e2e
npm install
npx playwright install
```

**Run tests:**
```bash
# Test ALB (HTTP)
URL=http://OpenCl-OpenC-Ogw8feHgvj1q-894360763.ap-south-1.elb.amazonaws.com \
  npx playwright test

# Test CloudFront (HTTPS)  
URL=https://dqq18fqtn9gsx.cloudfront.net \
  AUTH_USER=admin \
  AUTH_PASS=openclaw2025 \
  npx playwright test
```

**Test scenarios:**
1. **Health check** - Verify HTTP 200 response
2. **WebSocket connection** - Check no "origin not allowed" error
3. **Chat functionality** - Verify connection to gateway
4. **Authentication** - Test basic auth (CloudFront only)

### Phase 6: Debug Loop

**If tests fail, follow this debug sequence:**

1. **Check container health:**
   ```bash
   aws ecs describe-services \
     --cluster openclaw-cluster \
     --services openclaw-service
   ```

2. **Check target health:**
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn $(aws elbv2 describe-target-groups \
       --names OpenCl-OpenC-MJUYWLUKJSSN \
       --query 'TargetGroups[0].TargetGroupArn' --output text)
   ```

3. **View logs:**
   ```bash
   aws logs tail /ecs/openclaw --follow
   ```

4. **Test directly:**
   ```bash
   curl -v http://<alb-dns>/
   ```

5. **Common fixes:**
   - Target unhealthy: Check security groups, health check path
   - "origin not allowed": Update `allowedOrigins` in config
   - "requires HTTPS": Set `allowInsecureAuth: true`
   - WebSocket fails: Check CloudFront origin headers

6. **Fix, redeploy, retest** - Repeat until passing

## Common Issues & Solutions

### Issue: "origin not allowed" (WebSocket error 1008)

**Cause:** OpenClaw security feature blocking CloudFront origin

**Fix:**
```json
{
  "gateway": {
    "controlUi": {
      "allowedOrigins": ["*"],
      "dangerouslyDisableDeviceAuth": false
    }
  }
}
```
Upload to S3 and restart service.

### Issue: "control ui requires HTTPS or localhost"

**Cause:** OpenClaw requires secure context for Control UI

**Fix:**
```json
{
  "gateway": {
    "controlUi": {
      "allowInsecureAuth": true
    }
  }
}
```
This allows HTTP access for testing.

### Issue: CloudFront WebSocket fails

**Cause:** Origin header mismatch or missing headers

**Fix options:**
1. Use direct ALB URL (HTTP, no auth)
2. Configure CloudFront to forward Origin header
3. Wait for OpenClaw bug fix (issue #9358)

### Issue: Target group unhealthy

**Causes & fixes:**
- Security group blocking: Allow port 18789 from ALB SG
- Health check failing: Verify path `/` returns 200
- Container crashing: Check logs with `aws logs tail`
- Port mismatch: Ensure container and TG both use 18789

## Testing with Playwright

### Test Structure

```typescript
// test-e2e/openclaw.spec.ts
import { test, expect } from '@playwright/test';

test('OpenClaw loads without WebSocket errors', async ({ page }) => {
  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  // Navigate to OpenClaw
  await page.goto(process.env.URL || 'http://localhost:18789');
  
  // Wait for page load
  await page.waitForLoadState('networkidle');
  
  // Check no origin errors
  const originErrors = errors.filter(e => 
    e.includes('origin not allowed') || 
    e.includes('1008')
  );
  expect(originErrors).toHaveLength(0);
  
  // Verify UI loaded
  await expect(page.locator('text=OPENCLAW')).toBeVisible();
});
```

### Running Tests Headed (for debugging)

```bash
npx playwright test --headed --slowmo 1000
```

This opens browser so you can see what's happening.

## Configuration Reference

See [references/config-schema.md](references/config-schema.md) for complete OpenClaw configuration options.

## Scripts

- `scripts/deploy.sh` - Full deployment automation
- `scripts/test-e2e.sh` - Run Playwright tests
- `scripts/debug.sh` - Debug common issues
- `scripts/fix-origin.sh` - Fix origin/websocket issues

## Iterative Development Workflow

```
1. PLAN: Review config, identify requirements
2. DEPLOY: Run CDK deploy, build container
3. TEST: Playwright tests verify functionality
4. DEBUG: If failed, check logs, identify issue
5. FIX: Update config/code, redeploy
6. RETEST: Run tests again
7. REPEAT: Until all tests pass
```
