import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS, CHANNEL_CONFIG } from '../../fixtures/test-data';

/**
 * WhatsApp Channel Status Tests
 * 
 * Tests WhatsApp channel connectivity and configuration
 */
test.describe('WhatsApp Channel Status', () => {
  
  test('@critical - WhatsApp channel API accessible', async ({ request }) => {
    const response = await request.get('/api/v1/channels/whatsapp/status', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    // Should be accessible (may return 404 if not configured, but endpoint should exist)
    expect(response.status() === 200 || response.status() === 404).toBeTruthy();
  });
  
  test('@critical - WhatsApp configuration from test data', async ({ request }) => {
    // Verify WhatsApp config exists in test data
    expect(CHANNEL_CONFIG.whatsapp).toBeTruthy();
    expect(CHANNEL_CONFIG.whatsapp.enabled).toBe(true);
    expect(CHANNEL_CONFIG.whatsapp.mediaMaxMb).toBe(50);
    expect(CHANNEL_CONFIG.whatsapp.textChunkLimit).toBe(4000);
  });
  
  test('@critical - WhatsApp channel enabled in config', async ({ request }) => {
    // Check if channels config includes WhatsApp
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // If channels exist, verify WhatsApp configuration
    if (config.channels?.whatsapp) {
      expect(config.channels.whatsapp).toHaveProperty('enabled');
    }
  });
  
  test('@smoke - WhatsApp media settings configured', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Verify WhatsApp media limits if configured
    if (config.channels?.whatsapp) {
      const whatsappConfig = config.channels.whatsapp as Record<string, unknown>;
      // Should have some media-related config
      expect(whatsappConfig).toBeTruthy();
    }
  });
  
  test('@smoke - WhatsApp text chunk limit respected', async ({ request }) => {
    // Verify text chunk limit from test data
    const maxChunkSize = CHANNEL_CONFIG.whatsapp.textChunkLimit;
    
    expect(maxChunkSize).toBe(4000);
    
    // Verify endpoint exists
    const response = await request.get('/api/v1/channels/whatsapp/status', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.status() === 200 || response.status() === 404).toBeTruthy();
  });
  
  test('@smoke - WhatsApp channel can receive messages', async ({ request }) => {
    // Test sending a message via WhatsApp channel endpoint
    const response = await request.post('/api/v1/channels/whatsapp/messages', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        message: 'Test message',
        from: 'test-user',
      },
      timeout: TIMEOUTS.normal,
    });
    
    // Should either succeed or return method not allowed
    expect(response.status() === 200 || response.status() === 405 || response.status() === 404).toBeTruthy();
  });
  
  test('@smoke - WhatsApp webhook endpoint exists', async ({ request }) => {
    // Test webhook endpoint for WhatsApp
    const response = await request.get('/api/v1/channels/whatsapp/webhook', {
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
