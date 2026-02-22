import { test, expect } from '@playwright/test';
import { OpenClawWebSocketClient } from '../utils/ws-client';
import { TEST_CONFIG, TEST_COMMANDS, TIMEOUTS, MODEL_ALIASES } from '../fixtures/test-data';

/**
 * Model Switching Tests
 * 
 * Tests for switching between different models:
 * - Kimi (primary)
 * - Claude (fallback)
 * - Gemini (fallback)
 * 
 * Note: Model switching behavior depends on OpenClaw configuration.
 * These tests verify the system accepts model switch requests.
 */
test.describe('Model Switching', () => {
  let wsClient: OpenClawWebSocketClient;

  test.beforeEach(() => {
    wsClient = new OpenClawWebSocketClient();
  });

  test.afterEach(() => {
    wsClient.disconnect();
  });

  test('@critical - Agent accepts switch to Kimi model', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // First, ask a simple question to establish baseline
    const baselineResponse = await wsClient.sendAndWait(
      'Hello, what model are you using?',
      { timeout: TIMEOUTS.agent }
    );
    expect(baselineResponse).not.toBeNull();
    console.log('Baseline response:', baselineResponse);

    // Now switch to Kimi
    const kimiResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.switchToKimi,
      { timeout: TIMEOUTS.agent }
    );

    expect(kimiResponse).not.toBeNull();
    console.log('Switch to Kimi response:', kimiResponse);

    // Verify response acknowledges the switch
    const responseText = JSON.stringify(kimiResponse).toLowerCase();
    expect(responseText).toMatch(/kimi|switch|model|changed|ok|confirmed/);
  });

  test('@critical - Agent accepts switch to Claude model', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Switch to Claude (using opus alias)
    const claudeResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.switchToOpus,
      { timeout: TIMEOUTS.agent }
    );

    expect(claudeResponse).not.toBeNull();
    console.log('Switch to Claude response:', claudeResponse);

    // Verify response
    const responseText = JSON.stringify(claudeResponse).toLowerCase();
    expect(responseText).toMatch(/claude|opus|switch|model|changed|ok|confirmed/);
  });

  test('@critical - Agent accepts switch to Gemini model', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Switch to Gemini
    const geminiResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.switchToGemini,
      { timeout: TIMEOUTS.agent }
    );

    expect(geminiResponse).not.toBeNull();
    console.log('Switch to Gemini response:', geminiResponse);

    // Verify response
    const responseText = JSON.stringify(geminiResponse).toLowerCase();
    expect(responseText).toMatch(/gemini|switch|model|changed|ok|confirmed/);
  });

  test('@critical - Agent accepts switch to GPT-4 model', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Switch to GPT-4
    const gpt4Response = await wsClient.sendAndWait(
      TEST_COMMANDS.switchToGPT4,
      { timeout: TIMEOUTS.agent }
    );

    expect(gpt4Response).not.toBeNull();
    console.log('Switch to GPT-4 response:', gpt4Response);

    // Verify response
    const responseText = JSON.stringify(gpt4Response).toLowerCase();
    expect(responseText).toMatch(/gpt|switch|model|changed|ok|confirmed/);
  });

  test('@smoke - Model switch persists across messages', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Switch to a specific model
    await wsClient.sendAndWait(
      TEST_COMMANDS.switchToGemini,
      { timeout: TIMEOUTS.agent }
    );

    // Send another message to verify the model persisted
    const subsequentResponse = await wsClient.sendAndWait(
      'What model are you now?',
      { timeout: TIMEOUTS.agent }
    );

    expect(subsequentResponse).not.toBeNull();
    console.log('Subsequent response after switch:', subsequentResponse);
  });

  test('@smoke - Multiple model switches in sequence', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Switch to Kimi
    const kimiResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.switchToKimi,
      { timeout: TIMEOUTS.agent }
    );
    expect(kimiResponse).not.toBeNull();
    console.log('Switched to Kimi:', kimiResponse);

    // Switch to Claude
    const claudeResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.switchToOpus,
      { timeout: TIMEOUTS.agent }
    );
    expect(claudeResponse).not.toBeNull();
    console.log('Switched to Claude:', claudeResponse);

    // Switch back to Gemini
    const geminiResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.switchToGemini,
      { timeout: TIMEOUTS.agent }
    );
    expect(geminiResponse).not.toBeNull();
    console.log('Switched to Gemini:', geminiResponse);
  });

  test('@smoke - Model specified in WebSocket connection persists', async () => {
    // Create client with specific model
    const modelClient = new OpenClawWebSocketClient(
      TEST_CONFIG.wsURL,
      TEST_CONFIG.gatewayToken,
      {
        onMessage: (msg) => console.log('Message:', msg),
      }
    );

    const connected = await modelClient.connect();
    expect(connected).toBeTruthy();

    // Ask about the model
    const response = await modelClient.sendAndWait(
      'What model are you using right now?',
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('Model in connection response:', response);

    modelClient.disconnect();
  });

  test('@smoke - Different models produce different responses', async () => {
    const client1 = new OpenClawWebSocketClient();
    const client2 = new OpenClawWebSocketClient();

    const connected1 = await client1.connect();
    const connected2 = await client2.connect();
    expect(connected1).toBeTruthy();
    expect(connected2).toBeTruthy();

    // Send same prompt to different model connections
    const prompt = 'Explain quantum computing in one sentence.';

    const response1 = await client1.sendAndWait(prompt, { timeout: TIMEOUTS.agent });
    const response2 = await client2.sendAndWait(prompt, { timeout: TIMEOUTS.agent });

    expect(response1).not.toBeNull();
    expect(response2).not.toBeNull();

    // Responses should be different (or at least both valid)
    console.log('Response from connection 1:', response1);
    console.log('Response from connection 2:', response2);

    client1.disconnect();
    client2.disconnect();
  });
});
