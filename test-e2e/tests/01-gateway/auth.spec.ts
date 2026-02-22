import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS } from '../../fixtures/test-data';

/**
 * Gateway Authentication Tests
 * 
 * Tests Basic Auth (CloudFront) and Gateway Token authentication
 */
test.describe('Gateway Authentication', () => {
  
  test('@critical - Basic Auth with valid credentials', async ({ request }) => {
    const response = await request.get('/', {
      httpCredentials: {
        username: TEST_CONFIG.basicAuth.username,
        password: TEST_CONFIG.basicAuth.password,
      },
    });
    
    expect(response.status()).toBe(200);
  });
  
  test('@critical - Basic Auth with invalid credentials fails', async ({ request }) => {
    const response = await request.get('/', {
      httpCredentials: {
        username: 'wronguser',
        password: 'wrongpass',
      },
    });
    
    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });
  
  test('@critical - Gateway Token authentication via Bearer header', async ({ request }) => {
    const response = await request.get('/api/v1/status', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });
  
  test('@critical - Gateway Token authentication via X-Gateway-Token header', async ({ request }) => {
    const response = await request.get('/api/v1/status', {
      headers: {
        'X-Gateway-Token': TEST_CONFIG.gatewayToken,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
  });
  
  test('@critical - Invalid Gateway Token fails', async ({ request }) => {
    const response = await request.get('/api/v1/status', {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.status()).toBe(401);
  });
  
  test('@critical - Missing authentication fails', async ({ request }) => {
    const response = await request.get('/api/v1/status', {
      timeout: TIMEOUTS.quick,
    });
    
    // Should require authentication
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
  
  test('@smoke - Combined Basic Auth + Gateway Token works', async ({ request }) => {
    const response = await request.get('/', {
      httpCredentials: {
        username: TEST_CONFIG.basicAuth.username,
        password: TEST_CONFIG.basicAuth.password,
      },
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'X-Gateway-Token': TEST_CONFIG.gatewayToken,
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
  });
});
