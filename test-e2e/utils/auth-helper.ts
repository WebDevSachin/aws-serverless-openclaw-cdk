import { APIRequestContext } from '@playwright/test';
import { TEST_CONFIG } from '../fixtures/test-data';

/**
 * Helper class for authentication operations
 */
export class AuthHelper {
  constructor(private request: APIRequestContext) {}

  /**
   * Get headers with gateway token
   */
  getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
      'X-Gateway-Token': TEST_CONFIG.gatewayToken,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get combined auth for WebSocket
   */
  getWebSocketAuth(): { token: string; basicAuth: { username: string; password: string } } {
    return {
      token: TEST_CONFIG.gatewayToken,
      basicAuth: TEST_CONFIG.basicAuth,
    };
  }

  /**
   * Verify gateway token is valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await this.request.get('/api/v1/status', {
        headers: this.getAuthHeaders(),
      });
      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * Get basic auth header value
   */
  getBasicAuthHeader(): string {
    const credentials = `${TEST_CONFIG.basicAuth.username}:${TEST_CONFIG.basicAuth.password}`;
    return 'Basic ' + Buffer.from(credentials).toString('base64');
  }

  /**
   * Get all headers including basic auth and token
   */
  getFullAuthHeaders(): Record<string, string> {
    return {
      ...this.getAuthHeaders(),
      'Authorization': `Bearer ${TEST_CONFIG.gatewayToken}`,
    };
  }
}
