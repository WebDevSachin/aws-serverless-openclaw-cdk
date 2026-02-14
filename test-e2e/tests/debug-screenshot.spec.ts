import { test, expect } from '@playwright/test';

test('Debug OpenClaw - Screenshot errors', async ({ page }) => {
  const errors: string[] = [];
  const wsEvents: any[] = [];
  
  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[${type.toUpperCase()}] ${text}`);
    if (type === 'error') {
      errors.push(text);
    }
  });
  
  // Capture page errors
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
    errors.push(err.message);
  });
  
  // Capture WebSocket events
  page.on('websocket', ws => {
    console.log(`[WebSocket] Created: ${ws.url()}`);
    wsEvents.push({ type: 'created', url: ws.url() });
    
    ws.on('open', () => {
      console.log(`[WebSocket] Opened`);
      wsEvents.push({ type: 'open' });
    });
    
    ws.on('close', (data: { code: number; reason: string }) => {
      console.log(`[WebSocket] Closed: ${data.code} - ${data.reason}`);
      wsEvents.push({ type: 'close', code: data.code, reason: data.reason });
    });
  });
  
  // Navigate and take screenshot
  console.log('Navigating to OpenClaw...');
  const response = await page.goto('/', { timeout: 30000 });
  console.log(`Page loaded with status: ${response?.status()}`);
  
  // Screenshot 1: Initial load
  await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true });
  console.log('Screenshot 1: Initial load saved');
  
  // Wait for UI
  await page.waitForTimeout(3000);
  
  // Screenshot 2: After wait
  await page.screenshot({ path: 'test-results/02-after-wait.png', fullPage: true });
  console.log('Screenshot 2: After wait saved');
  
  // Check for error banners
  const errorBanner = page.locator('text=disconnected').first();
  if (await errorBanner.isVisible().catch(() => false)) {
    const errorText = await errorBanner.textContent();
    console.log(`[ERROR BANNER] ${errorText}`);
    
    // Screenshot 3: Error closeup
    await errorBanner.screenshot({ path: 'test-results/03-error-banner.png' });
    console.log('Screenshot 3: Error banner saved');
  }
  
  // Get all error messages from page
  const allErrors = await page.locator('text=/disconnected|origin|HTTPS|secure/i').allTextContents();
  console.log('All error messages found:', allErrors);
  
  // Screenshot 4: Final state
  await page.screenshot({ path: 'test-results/04-final-state.png', fullPage: true });
  console.log('Screenshot 4: Final state saved');
  
  // Log summary
  console.log('\n========== SUMMARY ==========');
 console.log('Console errors:', errors);
  console.log('WebSocket events:', wsEvents);
  console.log('Error messages on page:', allErrors);
  console.log('============================\n');
});
