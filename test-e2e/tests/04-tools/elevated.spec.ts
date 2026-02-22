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
 * Elevated Tool Tests
 * 
 * Tests for elevated tool execution in OpenClaw
 * Elevated tools are enabled via the 'elevated' parameter set to 'on'
 */
test.describe('Elevated Tools', () => {
  let ws: WebSocket | null = null;
  let sessionId: string;
  const testMessages: WSMessage[] = [];

  test.beforeEach(async () => {
    // Generate unique session ID for each test
    sessionId = `elevated-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        console.log('WebSocket connected for elevated tests');
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
   * Helper to send message with elevated flag and wait for response
   */
  async function sendElevatedMessage(message: string, timeout: number = TIMEOUTS.agent): Promise<WSMessage | null> {
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
          elevated: 'on',  // Enable elevated tools
        },
      });

      ws!.send(payload);
      console.log('Sent elevated message:', message);

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

  test('@critical @smoke - Elevated whoami command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute whoami with elevated privileges
    const response = await sendElevatedMessage(
      'Run "whoami" with elevated privileges and tell me the result',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Elevated whoami result:', data.response);
    }
  });

  test('@critical @smoke - Elevated system info command', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Execute system info with elevated privileges
    const response = await sendElevatedMessage(
      'Run "uname -a && cat /etc/os-release" to get detailed system information',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('System info result:', data.response);
    }
  });

  test('@critical - Elevated memory info', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get memory info
    const response = await sendElevatedMessage(
      'Run "cat /proc/meminfo" to show detailed memory information',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Memory info result:', data.response);
    }
  });

  test('@critical - Elevated CPU info', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get CPU info
    const response = await sendElevatedMessage(
      'Run "cat /proc/cpuinfo" to show CPU information',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('CPU info result:', data.response);
    }
  });

  test('@critical - Elevated process list', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get process list
    const response = await sendElevatedMessage(
      'Run "ps aux | head -20" to show first 20 running processes',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Process list result:', data.response);
    }
  });

  test('@critical - Elevated network connections', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get network connections
    const response = await sendElevatedMessage(
      'Run "netstat -tuln | head -20" to show network connections',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Network connections result:', data.response);
    }
  });

  test('@critical - Elevated disk usage', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get disk usage
    const response = await sendElevatedMessage(
      'Run "df -h" to show disk usage',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Disk usage result:', data.response);
    }
  });

  test('@critical - Elevated environment variables', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get environment variables
    const response = await sendElevatedMessage(
      'Run "env | sort" to show all environment variables sorted',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Environment variables result length:', data.response?.length);
    }
  });

  test('@critical - Elevated who group', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get group information
    const response = await sendElevatedMessage(
      'Run "id" to show user and group IDs',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('ID result:', data.response);
    }
  });

  test('@critical - Elevated mounted filesystems', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Get mounted filesystems
    const response = await sendElevatedMessage(
      'Run "mount" to show mounted filesystems',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Mount result:', data.response);
    }
  });

  test('@critical - Elevated file permissions check', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Check file permissions
    const response = await sendElevatedMessage(
      'Run "ls -la ~/.openclaw/" to show permissions of the openclaw directory',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      expect(data.response).toBeTruthy();
      console.log('Permissions result:', data.response);
    }
  });

  test('@smoke - Elevated read system file', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Read a system file
    const response = await sendElevatedMessage(
      'Read the file /etc/hostname if it exists',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    console.log('System file read result:', response?.data);
  });

  test('@smoke - Elevated check running services', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Check running services
    const response = await sendElevatedMessage(
      'Run "service --status-all 2>&1 | head -20" to check running services',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    console.log('Services check result:', response?.data);
  });

  test('@smoke - Elevated curl test', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Use curl to test network
    const response = await sendElevatedMessage(
      'Run "curl -s https://httpbin.org/get | head -20" to test HTTP access',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    if (response?.data) {
      const data = response.data as { response?: string };
      console.log('Curl result:', data.response);
    }
  });

  test('@smoke - Elevated check AWS credentials', async ({ page }) => {
    const connected = await connectWebSocket();
    expect(connected).toBeTruthy();

    // Check AWS credentials
    const response = await sendElevatedMessage(
      'Run "aws sts get-caller-identity 2>&1" to check AWS credentials (if available)',
      TIMEOUTS.long
    );
    
    expect(response).not.toBeNull();
    console.log('AWS identity check result:', response?.data);
  });
});
