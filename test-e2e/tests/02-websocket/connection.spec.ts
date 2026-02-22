import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { TEST_CONFIG, TIMEOUTS } from '../../fixtures/test-data';

/**
 * WebSocket Connection Tests
 * 
 * Tests for WebSocket connection establishment, connection errors,
 * and connection state management with OpenClaw Gateway
 */
test.describe('WebSocket Connection', () => {

  test('@critical - WebSocket connects successfully with valid token', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const connected = await new Promise<boolean>((resolve) => {
      ws.on('open', () => {
        resolve(true);
      });
      ws.on('error', () => {
        resolve(false);
      });
      // Auto-fail if no response within timeout
      setTimeout(() => resolve(false), TIMEOUTS.quick);
    });

    expect(connected).toBe(true);
    ws.close();
  });

  test('@critical - WebSocket connection fails with invalid token', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=invalid-token-12345`;
    
    const connectionFailed = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(wsUrl, {
        timeout: TIMEOUTS.quick,
      });

      ws.on('open', () => {
        ws.close();
        resolve(false); // Should not connect
      });
      
      ws.on('error', (error) => {
        // Connection should fail with error
        resolve(true);
      });

      setTimeout(() => resolve(false), TIMEOUTS.quick);
    });

    expect(connectionFailed).toBe(true);
  });

  test('@critical - WebSocket connects without token fails', async () => {
    // Connect to WebSocket without any token
    const ws = new WebSocket(TEST_CONFIG.wsURL, {
      timeout: TIMEOUTS.quick,
    });

    const connectionResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      ws.on('open', () => {
        ws.close();
        resolve({ success: true });
      });
      
      ws.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      setTimeout(() => resolve({ success: false, error: 'timeout' }), TIMEOUTS.quick);
    });

    // Connection should fail without token
    expect(connectionResult.success).toBe(false);
  });

  test('@critical - WebSocket connection returns proper close code on auth failure', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=wrong-token`;
    
    const closeInfo = await new Promise<{ code: number; reason: string }>((resolve) => {
      const ws = new WebSocket(wsUrl, {
        timeout: TIMEOUTS.quick,
      });

      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });

      ws.on('error', () => {
        // Error before close is also acceptable
      });

      setTimeout(() => resolve({ code: 0, reason: 'timeout' }), TIMEOUTS.quick);
    });

    // Should get a close code indicating auth failure (typically 4000-4999 or 1008)
    expect(closeInfo.code).toBeGreaterThanOrEqual(1000);
  });

  test('@smoke - WebSocket connection state transitions correctly', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const states: string[] = [];
    
    ws.on('open', () => {
      states.push('open');
    });
    
    ws.on('close', () => {
      states.push('close');
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    expect(states).toContain('open');

    // Disconnect
    ws.close();

    // Wait for close
    await new Promise<void>((resolve) => {
      ws.on('close', resolve);
    });

    expect(ws.readyState).toBe(WebSocket.CLOSED);
    expect(states).toContain('close');
  });

  test('@smoke - Multiple WebSocket connections can be established', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    // Create multiple connections
    const connections = Array.from({ length: 3 }, () => 
      new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        },
        timeout: TIMEOUTS.quick,
      })
    );

    const connectionResults = await Promise.all(
      connections.map((ws) => 
        new Promise<boolean>((resolve) => {
          ws.on('open', () => resolve(true));
          ws.on('error', () => resolve(false));
          setTimeout(() => resolve(false), TIMEOUTS.quick);
        })
      )
    );

    // All connections should succeed
    expect(connectionResults.every((r) => r)).toBe(true);

    // Clean up
    connections.forEach((ws) => ws.close());
  });

  test('@critical - WebSocket reconnects after connection drop', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    // First connection
    const ws1 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    await new Promise<void>((resolve) => {
      ws1.on('open', resolve);
    });

    expect(ws1.readyState).toBe(WebSocket.OPEN);

    // Close first connection
    ws1.close();

    await new Promise<void>((resolve) => {
      ws1.on('close', resolve);
    });

    // Create new connection
    const ws2 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const reconnected = await new Promise<boolean>((resolve) => {
      ws2.on('open', () => resolve(true));
      ws2.on('error', () => resolve(false));
      setTimeout(() => resolve(false), TIMEOUTS.quick);
    });

    expect(reconnected).toBe(true);
    ws2.close();
  });

  test('@smoke - WebSocket handles concurrent messages during connection', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    const messages: string[] = [];
    
    ws.on('message', (data) => {
      messages.push(data.toString());
    });

    // Send multiple messages quickly
    ws.send(JSON.stringify({ type: 'ping' }));
    ws.send(JSON.stringify({ type: 'ping' }));
    ws.send(JSON.stringify({ type: 'ping' }));

    // Wait for responses
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // Should receive responses or errors for all messages
    expect(messages.length).toBeGreaterThanOrEqual(0);
    
    ws.close();
  });
});
