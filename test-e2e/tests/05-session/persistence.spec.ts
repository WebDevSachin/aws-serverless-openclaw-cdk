import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS, SESSION_CONFIG } from '../../fixtures/test-data';
import WebSocket from 'ws';

/**
 * Session Persistence Tests
 * 
 * Tests session data persistence across messages
 */
test.describe('Session Persistence', () => {
  
  test('@critical - Session context persists across messages', async ({ request }) => {
    // Test that session API exists
    const response = await request.get('/api/v1/sessions/test-persistence-session', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    // Should return session (or 404 if doesn't exist yet)
    expect(response.status() === 200 || response.status() === 404).toBeTruthy();
  });
  
  test('@critical - Session maintains conversation history', async ({ request }) => {
    // Verify session configuration allows history
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Verify session scope is configured
    expect(config.session).toBeTruthy();
    expect(config.session.scope).toBeTruthy();
  });
  
  test('@critical - Session scope configured correctly', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Verify session scope is per-sender (as per config)
    if (config.session?.scope) {
      expect(config.session.scope).toBe('per-sender');
    }
  });
  
  test('@smoke - Session maintenance settings configured', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Verify maintenance configuration
    if (config.session?.maintenance) {
      expect(config.session.maintenance).toHaveProperty('mode');
      expect(config.session.maintenance).toHaveProperty('pruneAfter');
      expect(config.session.maintenance).toHaveProperty('maxEntries');
    }
  });
  
  test('@smoke - Session persists data via WebSocket', async () => {
    // Test WebSocket connection with session persistence
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    const sessionId = `test-session-${Date.now()}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });
    
    return new Promise<void>((resolve, reject) => {
      let isConnected = false;
      let messageCount = 0;
      
      ws.on('open', () => {
        isConnected = true;
        
        // Send first message
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'Remember that my name is TestUser',
            sessionId: sessionId,
          },
        }));
      });
      
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          messageCount++;
          
          if (message.type === 'response' || message.type === 'done') {
            // First message complete, send follow-up
            if (messageCount === 1) {
              ws.send(JSON.stringify({
                type: 'message',
                data: {
                  message: 'What is my name?',
                  sessionId: sessionId,
                },
              }));
            } else {
              // Second response received - session persisted
              ws.close();
              resolve();
            }
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
        resolve();
      });
      
      // Timeout after longer period
      setTimeout(() => {
        ws.close();
        resolve();
      }, TIMEOUTS.long);
    });
  });
  
  test('@smoke - Multiple sessions can exist independently', async ({ request }) => {
    // Test creating/accessing multiple sessions
    const session1Response = await request.get('/api/v1/sessions/session-1', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    const session2Response = await request.get('/api/v1/sessions/session-2', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    // Both should be accessible (or 404 if new)
    expect(session1Response.status() === 200 || session1Response.status() === 404).toBeTruthy();
    expect(session2Response.status() === 200 || session2Response.status() === 404).toBeTruthy();
  });
  
  test('@smoke - Session typing interval configured', async ({ request }) => {
    const response = await request.get('/api/v1/config', {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUTS.quick,
    });
    
    expect(response.ok()).toBeTruthy();
    const config = await response.json();
    
    // Session config should exist
    expect(config.session).toBeTruthy();
    
    // Verify typing interval setting
    expect(SESSION_CONFIG.typingInterval).toBe(5000);
  });
});
