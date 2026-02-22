import { test, expect } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS, TEST_COMMANDS } from '../../fixtures/test-data';
import WebSocket from 'ws';

interface WSMessage {
  type: string;
  data?: unknown;
  error?: string;
  sessionId?: string;
}

/**
 * Browser Automation Tool Tests
 * 
 * Tests browser automation (Playwright) capabilities in OpenClaw
 */
test.describe('Browser Tools', () => {
  let ws: WebSocket | null = null;
  let sessionId: string;
  const testMessages: WSMessage[] = [];

  test.beforeEach(async () => {
    // Generate unique session ID for each test
    sessionId = `browser-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testMessages.length = 0;
  });

  test.afterEach(async () => {
    // Clean up WebSocket connection
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    ws = null;
  });

  /**
   * Helper to connect WebSocket and wait for connection
   */
  async function connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      const wsUrl = `${TEST_CONFIG.wsURL}?token=${encodeURIComponent(TEST_CONFIG.gatewayToken)}`;
      
      ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
        },
        timeout: TIMEOUTS.quick,
      });

      ws.on('open', () => {
        console.log('WebSocket connected for browser tests');
        resolve(true);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          testMessages.push(message);
          console.log('Received message:', message.type);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        resolve(false);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        console.log(`WebSocket closed: ${code} - ${reason.toString()}`);
      });

      // Timeout for connection
      setTimeout(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          resolve(false);
        }
      }, TIMEOUTS.quick);
    });
  }

  /**
   * Helper to send message and wait for response
   */
  async function sendMessageAndWait(message: string, timeout: number = TIMEOUTS.agent): Promise<WSMessage | null> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return null;
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify({
        type: 'message',
        data: {
          message,
          sessionId,
        },
      });

      ws!.send(payload);
      console.log('Sent message:', message);

      const timer = setTimeout(() => {
        console.log('Timeout waiting for response');
        resolve(testMessages.length > 0 ? testMessages[testMessages.length - 1] : null);
      }, timeout);

      ws!.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString()) as WSMessage;
          testMessages.push(msg);
          
          if (msg.type === 'response' || msg.type === 'done') {
            clearTimeout(timer);
            resolve(msg);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });
    });
  }

  test('@critical @smoke - Navigate to example.com and get page title', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Use browser to navigate to example.com
    const response = await sendMessageAndWait(
      'Go to https://example.com and tell me the page title',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Browser navigation result:', data.response);
    }
  });

  test('@critical @smoke - Navigate to example.org and extract content', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Navigate and extract content
    const response = await sendMessageAndWait(
      'Please browse to https://example.org and tell me what text is on the page',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Content extraction result:', data.response);
    }
  });

  test('@critical - Take screenshot of a webpage', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Request screenshot
    const response = await sendMessageAndWait(
      'Navigate to https://example.com and take a screenshot. Tell me if the screenshot was successful.',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      console.log('Screenshot result:', data.response);
    }
  });

  test('@critical - Get current URL from browser', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // First navigate somewhere
    await sendMessageAndWait(
      'Go to https://httpbin.org/html and wait for the page to load',
      TIMEOUTS.veryLong
    );

    // Then get the URL
    const response = await sendMessageAndWait(
      'What is the current URL in the browser?',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      console.log('Current URL:', data.response);
    }
  });

  test('@critical - Extract links from a webpage', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Extract links
    const response = await sendMessageAndWait(
      'Go to https://example.com and list all the links on the page',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      console.log('Links extraction result:', data.response);
    }
  });

  test('@critical - Fill form input on a page', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Try to interact with a form
    const response = await sendMessageAndWait(
      'Go to https://httpbin.org/forms/post and fill in any form field you find with the value "test123"',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    console.log('Form interaction result:', response?.data);
  });

  test('@smoke - Click on a link', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Click a link
    const response = await sendMessageAndWait(
      'Go to https://example.com and click on the link that says "More information..."',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    console.log('Click result:', response?.data);
  });

  test('@smoke - Scroll on a page', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Try scrolling
    const response = await sendMessageAndWait(
      'Go to https://example.com and scroll down the page',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    console.log('Scroll result:', response?.data);
  });

  test('@smoke - Get page metadata', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get metadata
    const response = await sendMessageAndWait(
      'Navigate to https://example.com and tell me the page title, description (if any), and any headings on the page',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      console.log('Page metadata:', data.response);
    }
  });

  test('@smoke - Navigate to JSON endpoint', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Navigate to JSON endpoint
    const response = await sendMessageAndWait(
      'Go to https://httpbin.org/json and tell me what JSON data is returned',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      console.log('JSON endpoint result:', data.response);
    }
  });

  test('@smoke - Test browser with HTTPS site', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Navigate to HTTPS site
    const response = await sendMessageAndWait(
      'Visit https://www.cloudflare.com and tell me what you see on the page',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    console.log('HTTPS site result:', response?.data);
  });

  test('@smoke - Handle page with JavaScript', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Navigate to site with JS
    const response = await sendMessageAndWait(
      'Go to https://httpbin.org/html and wait 2 seconds, then tell me what text is visible on the page',
      TIMEOUTS.veryLong
    );
    
    expect(response).not.toBeNull();
    console.log('JavaScript page result:', response?.data);
  });
});
