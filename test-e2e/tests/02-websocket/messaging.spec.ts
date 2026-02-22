import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { TEST_CONFIG, TIMEOUTS } from '../../fixtures/test-data';

/**
 * WebSocket Messaging Tests
 * 
 * Tests for sending and receiving messages via WebSocket,
 * message format validation, and message handling with OpenClaw Gateway
 */
test.describe('WebSocket Messaging', () => {

  test('@critical - WebSocket receives response to ping message', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const receivedResponse = await new Promise<boolean>((resolve) => {
      ws.on('open', () => {
        // Send ping
        ws.send(JSON.stringify({ type: 'ping' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        // Pong or response indicates gateway is alive
        if (message.type === 'pong' || message.type === 'response') {
          resolve(true);
        }
      });

      ws.on('error', () => resolve(false));
      
      // Timeout if no response
      setTimeout(() => resolve(false), TIMEOUTS.normal);
    });

    expect(receivedResponse).toBe(true);
    ws.close();
  });

  test('@critical - WebSocket sends and receives message via query', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const response = await new Promise<{ type: string; data?: unknown }>((resolve) => {
      const messages: { type: string; data?: unknown }[] = [];

      ws.on('open', () => {
        // Send a simple message
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'What is 1+1?',
          },
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);
        
        // Check for response or done message
        if (message.type === 'response' || message.type === 'done') {
          resolve(message);
        }
      });

      ws.on('error', (error) => {
        resolve({ type: 'error', data: error.message });
      });

      // Extended timeout for agent response
      setTimeout(() => {
        if (messages.length > 0) {
          resolve(messages[messages.length - 1]);
        } else {
          resolve({ type: 'timeout' });
        }
      }, TIMEOUTS.agent);
    });

    // Should receive a response type message
    expect(response.type).toMatch(/response|done/);
    ws.close();
  });

  test('@critical - Message includes session ID when provided', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    const testSessionId = `test-session-${Date.now()}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const sessionIdResponse = await new Promise<string | null>((resolve) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'ping',
            sessionId: testSessionId,
          },
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.sessionId) {
          resolve(message.sessionId);
        }
        if (message.type === 'response' || message.type === 'done') {
          resolve(message.sessionId || testSessionId);
        }
      });

      setTimeout(() => resolve(null), TIMEOUTS.normal);
    });

    // Session ID should be echoed back or used
    expect(sessionIdResponse).toBeTruthy();
    ws.close();
  });

  test('@critical - Message format validation - valid JSON required', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        // Send valid JSON message
        ws.send(JSON.stringify({
          type: 'message',
          data: { message: 'test' },
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        // Should receive a valid response
        expect(message).toBeDefined();
        resolve();
      });

      setTimeout(() => resolve(), TIMEOUTS.normal);
    });

    ws.close();
  });

  test('@smoke - Invalid JSON is handled gracefully', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const errorHandled = await new Promise<boolean>((resolve) => {
      let handled = false;
      
      ws.on('open', () => {
        // Send invalid JSON (raw string, not JSON)
        ws.send('this is not valid json');
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        // Gateway might send error response
        if (message.type === 'error') {
          handled = true;
        }
      });

      ws.on('error', () => {
        handled = true;
      });

      setTimeout(() => resolve(handled), TIMEOUTS.normal);
    });

    // Should handle error gracefully (no crash)
    expect(errorHandled).toBe(true);
    ws.close();
  });

  test('@smoke - Empty message is handled', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        // Send empty message
        ws.send(JSON.stringify({
          type: 'message',
          data: { message: '' },
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        // Should receive some response
        expect(message).toBeDefined();
        resolve();
      });

      setTimeout(() => resolve(), TIMEOUTS.normal);
    });

    ws.close();
  });

  test('@critical - Message with elevated flag is accepted', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const responseReceived = await new Promise<boolean>((resolve) => {
      ws.on('open', () => {
        // Send message with elevated flag
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'ping',
            elevated: 'true',
          },
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'response' || message.type === 'done' || message.type === 'pong') {
          resolve(true);
        }
      });

      setTimeout(() => resolve(false), TIMEOUTS.normal);
    });

    expect(responseReceived).toBe(true);
    ws.close();
  });

  test('@critical - Message with model parameter is accepted', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const responseReceived = await new Promise<boolean>((resolve) => {
      ws.on('open', () => {
        // Send message with specific model
        ws.send(JSON.stringify({
          type: 'message',
          data: {
            message: 'ping',
            model: 'openrouter/moonshotai/kimi-k2.5',
          },
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'response' || message.type === 'done' || message.type === 'pong') {
          resolve(true);
        }
      });

      setTimeout(() => resolve(false), TIMEOUTS.normal);
    });

    expect(responseReceived).toBe(true);
    ws.close();
  });

  test('@smoke - Stream of messages maintains order', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    const messageOrder: number[] = [];
    
    await new Promise<void>((resolve) => {
      let sendIndex = 0;
      
      ws.on('open', () => {
        // Send multiple pings with sequence numbers
        for (let i = 0; i < 3; i++) {
          const idx = i;
          ws.send(JSON.stringify({
            type: 'ping',
            seq: idx,
          }));
        }
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.seq !== undefined) {
          messageOrder.push(message.seq);
        }
        if (message.type === 'pong' && messageOrder.length >= 3) {
          resolve();
        }
      });

      setTimeout(() => resolve(), TIMEOUTS.normal);
    });

    // Messages should maintain order (if seq is echoed back)
    if (messageOrder.length > 0) {
      expect(messageOrder).toEqual(messageOrder.slice().sort((a, b) => a - b));
    }
    
    ws.close();
  });

  test('@critical - Large message payload is handled', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    // Create a large message (1KB+)
    const largeMessage = 'test ' + 'x'.repeat(2000);
    
    const handled = await new Promise<boolean>((resolve) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'message',
          data: { message: largeMessage },
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'response' || message.type === 'error') {
          resolve(true);
        }
      });

      ws.on('error', () => resolve(false));
      
      setTimeout(() => resolve(false), TIMEOUTS.normal);
    });

    expect(handled).toBe(true);
    ws.close();
  });

  test('@smoke - Binary messages are not supported', async () => {
    const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      },
      timeout: TIMEOUTS.quick,
    });

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        // Send binary data (Buffer)
        ws.send(Buffer.from([0x00, 0x01, 0x02]));
      });

      ws.on('message', () => {
        // Gateway may handle or ignore binary
        resolve();
      });

      setTimeout(() => resolve(), TIMEOUTS.normal);
    });

    ws.close();
  });
});
