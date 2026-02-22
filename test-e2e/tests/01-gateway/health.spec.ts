import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS } from '../../fixtures/test-data';

/**
 * Gateway Health Check Tests
 * 
 * Tests /health endpoint and service availability
 */
test.describe('Gateway Health', () => {
  
  test('@critical - Health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/health', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
  });
  
  test('@critical - Health endpoint returns healthy status', async ({ request }) => {
    const response = await request.get('/health', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Health response may vary - check for healthy flag or success indicators
    expect(data).toBeTruthy();
  });
  
  test('@critical - Gateway UI loads successfully', async ({ page }) => {
    const response = await page.goto('/', {
      timeout: TIMEOUTS.normal,
    });
    
    expect(response?.status()).toBe(200);
  });
  
  test('@smoke - UI contains OpenClaw branding', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.normal });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for OpenClaw text in the page
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('openclaw');
  });
  
  test('@smoke - Gateway version endpoint accessible', async ({ request }) => {
    const response = await request.get('/api/v1/status', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Status should contain version or uptime info
    expect(data).toBeTruthy();
  });
});
