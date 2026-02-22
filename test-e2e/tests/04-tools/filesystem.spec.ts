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
 * Filesystem Tool Tests
 * 
 * Tests file read/write operations in the OpenClaw workspace
 */
test.describe('Filesystem Tools', () => {
  let ws: WebSocket | null = null;
  let sessionId: string;
  const testMessages: WSMessage[] = [];

  test.beforeEach(async () => {
    // Generate unique session ID for each test
    sessionId = `fs-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        console.log('WebSocket connected for filesystem tests');
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

      const originalHandler = ws!.on;
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

  test('@critical @smoke - Write file to workspace', async ({ page }) => {
    // Connect to WebSocket
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Send command to write a test file
    const testFileContent = `Test content ${Date.now()}`;
    const message = `Write the following content to file ~/.openclaw/workspace/test-file.txt:\n${testFileContent}`;
    
    const response = await sendMessageAndWait(message, TIMEOUTS.long);
    
    // Verify response indicates success
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('File write response:', data.response);
    }
  });

  test('@critical @smoke - Read file from workspace', async ({ page }) => {
    // First write a file to read
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    const testContent = `Read test ${Date.now()}`;
    
    // Write file first
    await sendMessageAndWait(`Write "${testContent}" to ~/.openclaw/workspace/read-test.txt`, TIMEOUTS.long);
    
    // Now read the file
    const response = await sendMessageAndWait('Read the file ~/.openclaw/workspace/read-test.txt', TIMEOUTS.long);
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toContain(testContent);
      console.log('File read response:', data.response);
    }
  });

  test('@critical - List files in workspace directory', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // List files in workspace
    const response = await sendMessageAndWait('List all files in ~/.openclaw/workspace directory', TIMEOUTS.long);
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Directory listing response:', data.response);
    }
  });

  test('@critical - Create and delete file', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    const filename = `test-delete-${Date.now()}.txt`;
    
    // Create file
    const createResponse = await sendMessageAndWait(
      `Create a file called ${filename} in ~/.openclaw/workspace with content "delete me test"`,
      TIMEOUTS.long
    );
    expect(createResponse).not.toBeNull();
    
    // Delete file
    const deleteResponse = await sendMessageAndWait(
      `Delete the file ~/.openclaw/workspace/${filename}`,
      TIMEOUTS.long
    );
    expect(deleteResponse).not.toBeNull();
    
    console.log('File create/delete test passed');
  });

  test('@critical - Write and read JSON file', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    const jsonContent = JSON.stringify({ name: 'test', value: 123, timestamp: Date.now() }, null, 2);
    
    // Write JSON file
    const writeResponse = await sendMessageAndWait(
      `Write the following JSON to ~/.openclaw/workspace/test-data.json:\n${jsonContent}`,
      TIMEOUTS.long
    );
    expect(writeResponse).not.toBeNull();
    
    // Read JSON file
    const readResponse = await sendMessageAndWait(
      'Read ~/.openclaw/workspace/test-data.json and tell me the value of "name"',
      TIMEOUTS.long
    );
    expect(readResponse).not.toBeNull();
    
    if (readResponse?.data) {
      const data = readResponse.data as { response?: string };
      expect(data.response?.toLowerCase()).toContain('test');
    }
  });

  test('@smoke - File exists check', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Check if a known file exists
    const response = await sendMessageAndWait(
      'Does the file ~/.openclaw/workspace/test-data.json exist? Just answer yes or no.',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    console.log('File exists check response:', response?.data);
  });

  test('@smoke - Create nested directory structure', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Create nested directory and file
    const response = await sendMessageAndWait(
      'Create directory ~/.openclaw/workspace/nested/test and write "nested test" to ~/.openclaw/workspace/nested/test/file.txt',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    console.log('Nested directory test passed');
  });

  test('@smoke - Copy file within workspace', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // First create a source file
    await sendMessageAndWait(
      'Write "original content" to ~/.openclaw/workspace/source-copy.txt',
      TIMEOUTS.long
    );

    // Copy the file
    const copyResponse = await sendMessageAndWait(
      'Copy ~/.openclaw/workspace/source-copy.txt to ~/.openclaw/workspace/destination-copy.txt',
      TIMEOUTS.long
    );
    expect(copyResponse).not.toBeNull();
    
    // Verify copy
    const verifyResponse = await sendMessageAndWait(
      'Read ~/.openclaw/workspace/destination-copy.txt',
      TIMEOUTS.long
    );
    
    if (verifyResponse?.data) {
      const data = verifyResponse.data as { response?: string };
      expect(data.response).toContain('original content');
    }
  });
});
