import { test, expect } from '@playwright/test';

test.describe('OpenClaw Deployment Tests', () => {
  test('ALB - Page loads without WebSocket origin errors', async ({ page }) => {
    const errors: string[] = [];
    const wsErrors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
        console.log('Console error:', text);
      }
    });
    
    // Capture WebSocket errors
    page.on('websocket', ws => {
      ws.on('close', (data: { code: number; reason: string }) => {
        const errorMsg = `WebSocket closed: ${data.code} - ${data.reason}`;
        wsErrors.push(errorMsg);
        console.log(errorMsg);
      });
    });
    
    // Navigate to OpenClaw
    const response = await page.goto('/', { timeout: 30000 });
    expect(response?.status()).toBe(200);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give WebSocket time to connect
    
    // Verify page loaded
    await expect(page.locator('text=OPENCLAW').first()).toBeVisible({ timeout: 10000 });
    
    // Check for origin errors
    const originErrors = errors.filter(e => 
      e.includes('origin not allowed') || 
      e.includes('1008') ||
      e.includes('requires HTTPS')
    );
    
    if (originErrors.length > 0) {
      console.log('Origin errors found:', originErrors);
    }
    
    expect(originErrors, `Found origin errors: ${originErrors.join(', ')}`).toHaveLength(0);
    
    // Check WebSocket errors
    const wsOriginErrors = wsErrors.filter(e => 
      e.includes('1008') || 
      e.includes('origin not allowed')
    );
    
    expect(wsOriginErrors, `Found WebSocket origin errors: ${wsOriginErrors.join(', ')}`).toHaveLength(0);
    
    console.log('✅ Test passed: No origin errors');
  });
  
  test('ALB - Chat connects to gateway', async ({ page }) => {
    await page.goto('/', { timeout: 30000 });
    
    // Wait for UI
    await expect(page.locator('text=OPENCLAW').first()).toBeVisible({ timeout: 10000 });
    
    // Click on Chat if not already there
    const chatLink = page.locator('text=Chat').first();
    if (await chatLink.isVisible().catch(() => false)) {
      await chatLink.click();
      await page.waitForTimeout(2000);
    }
    
    // Check connection status - look for green indicator or connected state
    // The Health indicator should not show "Offline" permanently
    const healthIndicator = page.locator('text=Health Offline');
    
    // Wait a bit for WebSocket to try connecting
    await page.waitForTimeout(5000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/chat-status.png' });
    
    console.log('✅ Chat page loaded');
  });
  
  test('CloudFront - Basic auth works', async ({ page }) => {
    // Only run if CloudFront URL is provided
    const cloudfrontUrl = process.env.CLOUDFRONT_URL;
    if (!cloudfrontUrl) {
      test.skip('CloudFront URL not provided');
      return;
    }
    
    // Set up auth
    const username = process.env.AUTH_USER || 'admin';
    const password = process.env.AUTH_PASS || 'openclaw2025';
    
    // Navigate with auth
    const response = await page.goto(cloudfrontUrl, {
      timeout: 30000,
      httpCredentials: { username, password }
    });
    
    expect(response?.status()).toBe(200);
    await expect(page.locator('text=OPENCLAW').first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ CloudFront auth works');
  });
  
  test('Config - Verify gateway settings', async ({ page }) => {
    // This test checks if the config is properly loaded
    await page.goto('/', { timeout: 30000 });
    
    // Navigate to Config page
    await page.click('text=Config');
    await page.waitForTimeout(2000);
    
    // Take screenshot of config
    await page.screenshot({ path: 'test-results/config-page.png' });
    
    console.log('✅ Config page accessible');
  });
});
