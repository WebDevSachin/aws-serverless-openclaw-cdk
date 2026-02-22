import { APIRequestContext } from '@playwright/test';
import { TEST_CONFIG, TIMEOUTS } from '../fixtures/test-data';
import { AuthHelper } from './auth-helper';

/**
 * API client for OpenClaw Gateway
 */
export class OpenClawAPIClient {
  private authHelper: AuthHelper;

  constructor(private request: APIRequestContext) {
    this.authHelper = new AuthHelper(request);
  }

  /**
   * Get gateway status
   */
  async getStatus(): Promise<{ status: string; version?: string; uptime?: number } | null> {
    try {
      const response = await this.request.get('/api/v1/status', {
        headers: this.authHelper.getAuthHeaders(),
        timeout: TIMEOUTS.quick,
      });
      
      if (!response.ok()) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get status:', error);
      return null;
    }
  }

  /**
   * Get gateway configuration
   */
  async getConfig(): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.request.get('/api/v1/config', {
        headers: this.authHelper.getAuthHeaders(),
        timeout: TIMEOUTS.quick,
      });
      
      if (!response.ok()) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get config:', error);
      return null;
    }
  }

  /**
   * Send a message to the agent via HTTP API
   */
  async sendMessage(
    message: string, 
    options: { 
      sessionId?: string; 
      model?: string;
      thinking?: string;
      verbose?: string;
      elevated?: string;
    } = {}
  ): Promise<{ response?: string; sessionId?: string; error?: string } | null> {
    try {
      const response = await this.request.post('/api/v1/chat', {
        headers: this.authHelper.getAuthHeaders(),
        data: {
          message,
          sessionId: options.sessionId,
          model: options.model,
          thinking: options.thinking,
          verbose: options.verbose,
          elevated: options.elevated,
        },
        timeout: TIMEOUTS.agent,
      });
      
      if (!response.ok()) {
        const errorText = await response.text();
        return { error: errorText };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.request.get(`/api/v1/sessions/${sessionId}`, {
        headers: this.authHelper.getAuthHeaders(),
        timeout: TIMEOUTS.quick,
      });
      
      if (!response.ok()) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Reset a session
   */
  async resetSession(sessionId: string): Promise<boolean> {
    try {
      const response = await this.request.post(`/api/v1/sessions/${sessionId}/reset`, {
        headers: this.authHelper.getAuthHeaders(),
        timeout: TIMEOUTS.quick,
      });
      
      return response.ok();
    } catch (error) {
      console.error('Failed to reset session:', error);
      return false;
    }
  }

  /**
   * Get channel status
   */
  async getChannelStatus(channel: 'whatsapp' | 'telegram' | 'web'): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.request.get(`/api/v1/channels/${channel}/status`, {
        headers: this.authHelper.getAuthHeaders(),
        timeout: TIMEOUTS.quick,
      });
      
      if (!response.ok()) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to get ${channel} status:`, error);
      return null;
    }
  }

  /**
   * Get health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    try {
      const response = await this.request.get('/health', {
        headers: this.authHelper.getAuthHeaders(),
        timeout: TIMEOUTS.quick,
      });
      
      if (!response.ok()) {
        return { healthy: false };
      }
      
      const data = await response.json();
      return { healthy: true, details: data };
    } catch (error) {
      console.error('Health check failed:', error);
      return { healthy: false };
    }
  }
}
