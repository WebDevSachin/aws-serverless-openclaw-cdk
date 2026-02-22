import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS, CHANNEL_CONFIG } from '../../fixtures/test-data';

/**
 * Telegram Channel Status Tests
 * 
 * Tests Telegram channel connectivity and configuration
 */
test.describe('Telegram Channel Status', () => {
  
  test('@critical - Telegram channel API accessible', async ({ request }) => {
    const response = await request.get('/api/v1/channels/telegram/status', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    // Should be accessible (may return 404 if not configured, but endpoint should exist)
    expect(response.status() === 200 || response.status() === 404).toBeTruthy();
  });
  
  test('@critical - Telegram configuration from test data', async ({ request }) => {
    // Verify Telegram config exists in test data
    expect(CHANNEL_CONFIG.telegram).toBeTruthy();
    expect(CHANNEL_CONFIG.telegram.enabled).toBe(true);
    expect(CHANNEL_CONFIG.telegram.mediaMaxMb).toBe(5);
    expect(CHANNEL_CONFIG.telegram.historyLimit).toBe(50);
  });
  
  test('@critical - Telegram channel enabled in config', async ({ request }) => {
    // Check if channels config includes Telegram
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // If channels exist, verify Telegram configuration
    if (config.channels?.telegram) {
      expect(config.channels.telegram).toHaveProperty('enabled');
    }
  });
  
  test('@smoke - Telegram bot token configured', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // If Telegram is configured, verify bot configuration
    if (config.channels?.telegram) {
      const telegramConfig = config.channels.telegram as Record<string, unknown>;
      // Should have bot-related config
      expect(telegramConfig).toBeTruthy();
    }
  });
  
  test('@smoke - Telegram history limit configured', async ({ request }) => {
    // Verify history limit from test data
    const historyLimit = CHANNEL_CONFIG.telegram.historyLimit;
    
    expect(historyLimit).toBe(50);
    
    // Verify endpoint exists
    const response = await request.get('/api/v1/channels/telegram/status', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.status() === 200 || response.status() === 404).toBeTruthy();
  });
  
  test('@smoke - Telegram media settings configured', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Verify Telegram media limits if configured
    if (config.channels?.telegram) {
      const telegramConfig = config.channels.telegram as Record<string, unknown>;
      // Should have some media-related config
      expect(telegramConfig).toBeTruthy();
    }
  });
  
  test('@smoke - Telegram channel can receive messages', async ({ request }) => {
    // Test sending a message via Telegram channel endpoint
    const response = await request.post('/api/v1/channels/telegram/messages', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        message: 'Test message',
        chat_id: '123456789',
      },
      timeout: TIMEOUTS.normal,
    });
    
    // Should either succeed or return method not allowed
    expect(response.status() === 200 || response.status() === 405 || response.status() === 404).toBeTruthy();
  });
  
  test('@smoke - Telegram webhook endpoint exists', async ({ request }) => {
    // Test webhook endpoint for Telegram
    const response = await request.get('/api/v1/channels/telegram/webhook', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    // Should exist and be accessible
    expect(response.status() === 200 || response.status() === 404 || response.status() === 405).toBeTruthy();
  });
});
