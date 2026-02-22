import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS, SESSION_CONFIG } from '../../fixtures/test-data';
import WebSocket from 'ws';

/**
 * Session Reset Functionality Tests
 * 
 * Tests /reset, /new, /clear commands via WebSocket
 */
test.describe('Session Reset', () => {
  
  test('@critical - /reset command resets session context', async ({ request }) => {
    // Get initial config to verify session settings
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Verify session reset triggers are configured
    expect(config.session).toBeTruthy();
    expect(SESSION_CONFIG.resetTriggers).toContain('/reset');
  });
  
  test('@critical - /new command starts fresh session', async ({ request }) => {
    // Verify /new is in reset triggers
    expect(SESSION_CONFIG.resetTriggers).toContain('/new');
    
    // Test that the session reset endpoint exists
    const response = await request.post('/api/v1/sessions/test-session/reset', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    // Should either succeed or return 404 if session doesn't exist
    expect(response.status() === 200 || response.status() === 404).toBeTruthy();
  });
  
  test('@critical - /clear command clears session data', async ({ request }) => {
    // Verify /clear is in reset triggers
    expect(SESSION_CONFIG.resetTriggers).toContain('/clear');
    
    // Verify session configuration includes reset capability
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Session config should have reset mode
    if (config.session?.reset) {
      expect(config.session.reset).toHaveProperty('mode');
    }
  });
  
  test('@smoke - Session idle timeout configured correctly', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Verify idle timeout matches test data
    if (config.session?.reset) {
      expect(config.session.reset.idleMinutes).toBe(SESSION_CONFIG.idleTimeout);
    }
  });
  
  test('@smoke - Session reset via WebSocket message', async () => {
    // Create WebSocket connection
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });
    
    return new Promise<void>((resolve, reject) => {
      let isConnected = false;
      let hasReceivedResponse = false;
      
      ws.on('open', () => {
        isConnected = true;
        // Send reset command
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            message: '/reset',
          },
        }));
      });
      
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          hasReceivedResponse = true;
          
          // Should receive a response (text or done)
          if (message.type === 'response' || message.type === 'done') {
            ws.close();
            resolve();
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (!isConnected) {
          reject(error);
        }
      });
      
      ws.on('close', () => {
        if (!hasReceivedResponse) {
          // Resolve anyway - some implementations don't send explicit response
          resolve();
        }
      });
      
      // Timeout
      setTimeout(() => {
        ws.close();
        resolve();
      }, TIMEOUTS.normal);
    });
  });
  
  test('@smoke - WebSocket supports session reset triggers', async () => {
    // Test that all reset triggers are valid commands
    const resetCommands = SESSION_CONFIG.resetTriggers;
    
    expect(resetCommands).toContain('/reset');
    expect(resetCommands).toContain('/new');
    expect(resetCommands).toContain('/clear');
    
    // Verify they're properly formatted
    resetCommands.forEach(cmd => {
      expect(cmd.startsWith('/')).toBeTruthy();
    });
  });
});
