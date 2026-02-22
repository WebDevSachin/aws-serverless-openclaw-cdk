import WebSocket from 'ws';
import { TEST_CONFIG, TIMEOUTS } from '../fixtures/test-data';

interface WSMessage {
  type: string;
  data?: unknown;
  error?: string;
  sessionId?: string;
}

interface WSOptions {
  onMessage?: (message: WSMessage) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onOpen?: () => void;
}

/**
 * WebSocket client for OpenClaw Gateway
 */
export class OpenClawWebSocketClient {
  private ws: WebSocket | null = null;
  private messageQueue: string[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor(
    private url: string = TEST_CONFIG.wsURL,
    private token: string = TEST_CONFIG.gatewayToken,
    private options: WSOptions = {}
  ) {}

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Create WebSocket with auth headers
        const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
        
        this.ws = new WebSocket(wsUrl, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
          timeout: TIMEOUTS.quick,
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('WebSocket connected');
          this.options.onOpen?.();
          resolve(true);
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString()) as WSMessage;
            this.options.onMessage?.(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        this.ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
          this.options.onError?.(error);
          if (!this.isConnected) {
            resolve(false);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.isConnected = false;
          console.log(`WebSocket closed: ${code} - ${reason.toString()}`);
          this.options.onClose?.(code, reason.toString());
          this.attemptReconnect();
        });

      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        resolve(false);
      }
    });
  }

  /**
   * Send a message
   */
  send(message: string, options: { 
    sessionId?: string;
    model?: string;
    thinking?: string;
    verbose?: string;
    elevated?: string;
  } = {}): boolean {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket not connected');
      return false;
    }

    const payload = JSON.stringify({
      type: 'message',
      data: {
        message,
        sessionId: options.sessionId,
        model: options.model,
        thinking: options.thinking,
        verbose: options.verbose,
        elevated: options.elevated,
      },
    });

    this.ws.send(payload);
    return true;
  }

  /**
   * Send ping
   */
  ping(): boolean {
    if (!this.isConnected || !this.ws) {
      return false;
    }

    this.ws.send(JSON.stringify({ type: 'ping' }));
    return true;
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isConnected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Wait for a specific message type
   */
  async waitForMessage(
    predicate: (msg: WSMessage) => boolean,
    timeout: number = TIMEOUTS.normal
  ): Promise<WSMessage | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(null);
      }, timeout);

      const checkMessage = (message: WSMessage) => {
        if (predicate(message)) {
          clearTimeout(timer);
          this.options.onMessage = this.options.onMessage; // Restore original handler
          resolve(message);
        }
      };

      // Override message handler temporarily
      const originalHandler = this.options.onMessage;
      this.options.onMessage = (msg: WSMessage) => {
        originalHandler?.(msg);
        checkMessage(msg);
      };
    });
  }

  /**
   * Send message and wait for response
   */
  async sendAndWait(
    message: string,
    options: {
      sessionId?: string;
      model?: string;
      timeout?: number;
    } = {}
  ): Promise<WSMessage | null> {
    const timeout = options.timeout || TIMEOUTS.agent;
    
    return new Promise((resolve) => {
      const receivedMessages: WSMessage[] = [];
      
      const timer = setTimeout(() => {
        resolve(receivedMessages.length > 0 ? receivedMessages[receivedMessages.length - 1] : null);
      }, timeout);

      const originalHandler = this.options.onMessage;
      this.options.onMessage = (msg: WSMessage) => {
        originalHandler?.(msg);
        receivedMessages.push(msg);
        
        // Resolve on response or done message
        if (msg.type === 'response' || msg.type === 'done') {
          clearTimeout(timer);
          this.options.onMessage = originalHandler;
          resolve(msg);
        }
      };

      this.send(message, options);
    });
  }
}
