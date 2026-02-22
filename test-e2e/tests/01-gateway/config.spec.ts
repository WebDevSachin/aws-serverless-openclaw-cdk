import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS } from '../../fixtures/test-data';

/**
 * Gateway Configuration Tests
 * 
 * Tests /api/v1/config endpoint and configuration validation
 */
test.describe('Gateway Configuration', () => {
  
  test('@critical - Config endpoint accessible with auth', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
  });
  
  test('@critical - Config returns valid JSON structure', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    
    const config = await response.json();
    expect(config).toBeTruthy();
    expect(typeof config).toBe('object');
  });
  
  test('@critical - Config contains expected top-level keys', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    const config = await response.json();
    
    // Verify expected top-level configuration sections
    const expectedKeys = ['gateway', 'agents', 'tools', 'session'];
    const configKeys = Object.keys(config);
    
    // At least some of these keys should be present
    const hasExpectedKeys = expectedKeys.some(key => configKeys.includes(key));
    expect(hasExpectedKeys).toBeTruthy();
  });
  
  test('@smoke - Gateway port configuration is correct', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    const config = await response.json();
    
    // If gateway config exists, verify port
    if (config.gateway) {
      expect(config.gateway.port).toBe(18789);
    }
  });
  
  test('@smoke - Agent timeout configuration', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    const config = await response.json();
    
    // If agents config exists, verify timeout
    if (config.agents?.defaults) {
      expect(config.agents.defaults).toHaveProperty('timeoutSeconds');
    }
  });
  
  test('@smoke - Tools configuration with allow list', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    const config = await response.json();
    
    // If tools config exists, verify permissions
    if (config.tools) {
      expect(config.tools).toHaveProperty('allow');
    }
  });
});
