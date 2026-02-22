import { test, expect } from '@playwright/test';

const BASE_URL = 'https://d15af3nsx4ckro.cloudfront.net';
const AUTH_USER = 'admin';
const AUTH_PASS = 'openclaw2025';
const GATEWAY_TOKEN = 'GnSPN0qwdgbSOlJapflHjT2xvwOKax32';

test.describe('OpenClaw Access Tests', () => {
  
  test('Access chat with session via CloudFront', async ({ page }) => {
    // Set up basic auth
    await page.setExtraHTTPHeaders({
      'Authorization': 'Basic ' + Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64')
    });
    
    // Navigate to chat URL with session
    const chatUrl = `${BASE_URL}/chat?session=agent%3Amain%3A${GATEWAY_TOKEN}`;
    console.log('Accessing:', chatUrl);
    
    await page.goto(chatUrl);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/chat-access.png', fullPage: true });
    
    // Check if connected
    const content = await page.content();
    expect(content).toContain('openclaw');
    
    console.log('✅ Chat access test passed');
  });

  test('Access Control UI', async ({ page }) => {
    // Set up basic auth
    await page.setExtraHTTPHeaders({
      'Authorization': 'Basic ' + Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64')
    });
    
    // Navigate to main page
    await page.goto(BASE_URL);
    
    // Wait for load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/control-ui.png', fullPage: true });
    
    // Verify page loaded
    const title = await page.title();
    console.log('Page title:', title);
    
    console.log('✅ Control UI test passed');
  });

  test('Test WebSocket Connection', async ({ page }) => {
    // Set up basic auth
    await page.setExtraHTTPHeaders({
      'Authorization': 'Basic ' + Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64')
    });
    
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));
    
    // Navigate to chat
    const chatUrl = `${BASE_URL}/chat?session=agent%3Amain%3A${GATEWAY_TOKEN}`;
    await page.goto(chatUrl);
    
    // Wait for WebSocket to connect
    await page.waitForTimeout(5000);
    
    // Check for connection status
    const wsStatus = await page.evaluate(() => {
      // @ts-ignore
      return (window as any).openclaw?.connectionStatus || 'unknown';
    });
    
    console.log('WebSocket status:', wsStatus);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/websocket-test.png', fullPage: true });
    
    console.log('✅ WebSocket test completed');
  });

});
