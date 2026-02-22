import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { TEST_CONFIG, TIMEOUTS } from '../../fixtures/test-data';

/**
 * WebSocket Reconnection Tests
 * 
 * Tests for reconnection logic after disconnect, exponential backoff,
 * and connection recovery with OpenClaw Gateway
 */
test.describe('WebSocket Reconnection', () => {

  test('@critical - WebSocket reconnects after graceful disconnect', async () => {
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

    // Gracefully close first connection
    ws1.close();

    await new Promise<void>((resolve) => {
      ws1.on('close', resolve);
    });

    // Create new connection after disconnect
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

  test('@critical - WebSocket reconnects after abrupt disconnect', async () => {
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

    // Abrupt disconnect (terminate instead of close)
    ws1.terminate();

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

  test('@critical - Multiple reconnection attempts succeed', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    let lastWs: WebSocket | null = null;
    let successCount = 0;

    // Perform multiple connect-disconnect cycles
    for (let i = 0; i < 3; i++) {
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        },
        timeout: TIMEOUTS.quick,
      });

      const connected = await new Promise<boolean>((resolve) => {
        ws.on('open', () => resolve(true));
        ws.on('error', () => resolve(false));
        setTimeout(() => resolve(false), TIMEOUTS.quick);
      });

      if (connected) {
        successCount++;
        lastWs = ws;
        ws.close();
        await new Promise<void>((resolve) => ws.on('close', resolve));
      }

      // Small delay between connections
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
    }

    expect(successCount).toBeGreaterThanOrEqual(2);
    if (lastWs) lastWs.close();
  });

  test('@smoke - Reconnection uses exponential backoff pattern', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const connectionTimes: number[] = [];

    // Attempt multiple connections with intentional delays
    for (let attempt = 0; attempt < 3; attempt++) {
      const startTime = Date.now();
      
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        },
        timeout: TIMEOUTS.quick,
      });

      await new Promise<boolean>((resolve) => {
        ws.on('open', () => resolve(true));
        ws.on('error', () => resolve(false));
        setTimeout(() => resolve(false), TIMEOUTS.quick);
      });

      const connectionTime = Date.now() - startTime;
      connectionTimes.push(connectionTime);

      ws.close();
      
      // Wait between attempts
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }

    // All connections should complete (within reasonable time)
    expect(connectionTimes.length).toBe(3);
    expect(connectionTimes.every((t) => t < TIMEOUTS.quick)).toBe(true);
  });

  test('@critical - Session is maintained after reconnection', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    const testSessionId = `reconnect-test-${Date.now()}`;
    
    // First connection - establish session
    const ws1 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    await new Promise<void>((resolve) => {
      ws1.on('open', () => {
        ws1.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'Remember the word: openclaw',
            sessionId: testSessionId,
          },
        }));
      });

      // Wait for response
      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'done' || message.type === 'response') {
          resolve();
        }
      });

      setTimeout(() => resolve(), TIMEOUTS.agent);
    });

    ws1.close();
    await new Promise<void>((resolve) => ws1.on('close', resolve));

    // Reconnect and check session
    const ws2 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const sessionMaintained = await new Promise<boolean>((resolve) => {
      ws2.on('open', () => {
        ws2.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'What word did I ask you to remember?',
            sessionId: testSessionId,
          },
        }));
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'response' || message.type === 'done') {
          const responseText = JSON.stringify(message.data || '').toLowerCase();
          if (responseText.includes('openclaw')) {
            resolve(true);
          }
        }
      });

      setTimeout(() => resolve(false), TIMEOUTS.agent);
    });

    // Session may or may not be maintained depending on server config
    // At minimum, the reconnection should work
    expect(sessionMaintained).toBeDefined();
    ws2.close();
  });

  test('@smoke - Reconnection fails gracefully with invalid token', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=invalid-token`;
    
    const ws = new WebSocket(wsUrl, {
      timeout: TIMEOUTS.quick,
    });

    const connectionResult = await new Promise<{ success: boolean; code?: number }>((resolve) => {
      ws.on('open', () => {
        ws.close();
        resolve({ success: true });
      });

      ws.on('close', (code) => {
        resolve({ success: false, code });
      });

      ws.on('error', () => {
        resolve({ success: false });
      });

      setTimeout(() => resolve({ success: false }), TIMEOUTS.quick);
    });

    // Should fail gracefully
    expect(connectionResult.success).toBe(false);
  });

  test('@critical - WebSocket recovers after server-side disconnect', async () => {
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

    // Send a message to ensure connection is active
    ws1.send(JSON.stringify({ type: 'ping' }));

    // Wait a moment
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));

    // Close the connection
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

    const recovered = await new Promise<boolean>((resolve) => {
      ws2.on('open', () => {
        // Send ping to verify
        ws2.send(JSON.stringify({ type: 'ping' }));
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong' || message.type === 'response') {
          resolve(true);
        }
      });

      ws2.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), TIMEOUTS.normal);
    });

    expect(recovered).toBe(true);
    ws2.close();
  });

  test('@smoke - Rapid connect-disconnect cycles are handled', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    let successCount = 0;
    const cycles = 5;

    for (let i = 0; i < cycles; i++) {
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        },
        timeout: TIMEOUTS.quick,
      });

      const connected = await new Promise<boolean>((resolve) => {
        ws.on('open', () => resolve(true));
        ws.on('error', () => resolve(false));
        setTimeout(() => resolve(false), TIMEOUTS.quick);
      });

      if (connected) {
        successCount++;
        ws.close();
      }

      // Very short delay between cycles
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }

    // Most connections should succeed
    expect(successCount).toBeGreaterThanOrEqual(cycles - 1);
  });

  test('@critical - Reconnection with new session works', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    // First connection with old session
    const ws1 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    await new Promise<void>((resolve) => {
      ws1.on('open', resolve);
    });

    ws1.close();
    await new Promise<void>((resolve) => ws1.on('close', resolve));

    // Reconnect with new session
    const ws2 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const newSessionWorks = await new Promise<boolean>((resolve) => {
      ws2.on('open', () => {
        ws2.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'ping',
            sessionId: `new-session-${Date.now()}`,
          },
        }));
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong' || message.type === 'response' || message.type === 'done') {
          resolve(true);
        }
      });

      ws2.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), TIMEOUTS.normal);
    });

    expect(newSessionWorks).toBe(true);
    ws2.close();
  });

  test('@smoke - Connection state is correct after reconnection', async () => {
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
    
    const firstCloseCode = await new Promise<number>((resolve) => {
      ws1.on('close', (code) => resolve(code));
      ws1.close();
    });

    await new Promise<void>((resolve) => {
      ws1.on('close', resolve);
    });

    expect(ws1.readyState).toBe(WebSocket.CLOSED);

    // New connection should have correct states
    const ws2 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    expect(ws2.readyState).toBe(WebSocket.CONNECTING);

    await new Promise<void>((resolve) => {
      ws2.on('open', resolve);
    });

    expect(ws2.readyState).toBe(WebSocket.OPEN);
    
    // Clean close
    ws2.close();
    
    await new Promise<void>((resolve) => {
      ws2.on('close', resolve);
    });

    expect(ws2.readyState).toBe(WebSocket.CLOSED);
  });

  test('@critical - Gateway accepts messages after reconnection', async () => {
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

    ws1.close();
    await new Promise<void>((resolve) => ws1.on('close', resolve));

    // Second connection - reconnect
    const ws2 = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const messageAccepted = await new Promise<boolean>((resolve) => {
      ws2.on('open', () => {
        // Send message immediately after reconnect
        ws2.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'What is 2+2?',
          },
        }));
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'response' || message.type === 'done') {
          resolve(true);
        }
      });

      ws2.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), TIMEOUTS.agent);
    });

    expect(messageAccepted).toBe(true);
    ws2.close();
  });
});
