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
 * Command Execution Tool Tests
 * 
 * Tests command execution (whoami, pwd, ls) in the OpenClaw environment
 */
test.describe('Execution Tools (exec)', () => {
  let ws: WebSocket | null = null;
  let sessionId: string;
  const testMessages: WSMessage[] = [];

  test.beforeEach(async () => {
    // Generate unique session ID for each test
    sessionId = `exec-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        console.log('WebSocket connected for exec tests');
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

  test('@critical @smoke - Execute whoami command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute whoami command via agent
    const response = await sendMessageAndWait(
      'Please run the command "whoami" and tell me the result',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      const responseText = data.response?.toLowerCase() || '';
      // Should return either 'root' or 'node' based on container user
      expect(responseText).toMatch(/root|node/);
      console.log('whoami result:', data.response);
    }
  });

  test('@critical @smoke - Execute pwd command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute pwd command via agent
    const response = await sendMessageAndWait(
      'Please run "pwd" to show the current working directory',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('pwd result:', data.response);
    }
  });

  test('@critical @smoke - Execute ls command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute ls -la command
    const response = await sendMessageAndWait(
      'Please run "ls -la /home" to list files in the home directory',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('ls result:', data.response);
    }
  });

  test('@critical - Execute uname command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute uname -a
    const response = await sendMessageAndWait(
      'Run "uname -a" to show system information',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      // Should contain Linux
      expect(data.response).toContain('Linux');
      console.log('uname result:', data.response);
    }
  });

  test('@critical - Execute cat to read file', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // First create a test file
    await sendMessageAndWait(
      'Write "Hello from cat test" to /tmp/cat-test.txt',
      TIMEOUTS.long
    );

    // Now cat the file
    const response = await sendMessageAndWait(
      'Run "cat /tmp/cat-test.txt" to show file contents',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toContain('Hello from cat test');
      console.log('cat result:', data.response);
    }
  });

  test('@critical - Execute echo command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute echo
    const response = await sendMessageAndWait(
      'Run "echo $PATH" to show the PATH environment variable',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('echo result:', data.response);
    }
  });

  test('@critical - Execute df command for disk space', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute df -h
    const response = await sendMessageAndWait(
      'Run "df -h" to show disk space usage',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('df result:', data.response);
    }
  });

  test('@critical - Execute free command for memory', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute free -m
    const response = await sendMessageAndWait(
      'Run "free -m" to show memory usage',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('free result:', data.response);
    }
  });

  test('@critical - Execute ps command for processes', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute ps aux
    const response = await sendMessageAndWait(
      'Run "ps aux" to show running processes',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('ps result:', data.response);
    }
  });

  test('@smoke - Execute env command for environment', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute env
    const response = await sendMessageAndWait(
      'Run "env" to show environment variables (just list the variable names)',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('env result:', data.response);
    }
  });

  test('@smoke - Execute hostname command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute hostname
    const response = await sendMessageAndWait(
      'Run "hostname" to show the container hostname',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('hostname result:', data.response);
    }
  });

  test('@smoke - Execute uptime command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute uptime
    const response = await sendMessageAndWait(
      'Run "uptime" to show system uptime',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('uptime result:', data.response);
    }
  });

  test('@smoke - Chain multiple commands', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute chained commands
    const response = await sendMessageAndWait(
      'Run "whoami && pwd && echo test123" and show me the output of all three commands',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Chained commands result:', data.response);
    }
  });

  test('@smoke - Execute npm/node commands if available', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Check if node is available
    const response = await sendMessageAndWait(
      'Check if node and npm are installed by running "node --version" and "npm --version"',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    console.log('Node/npm check result:', response?.data);
  });
});
