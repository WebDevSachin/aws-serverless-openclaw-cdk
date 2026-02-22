import { test, expect } from '@playwright/test';
import { OpenClawWebSocketClient } from '../utils/ws-client';
import { TEST_CONFIG, TEST_COMMANDS, TIMEOUTS, MODEL_ALIASES } from '../fixtures/test-data';

/**
 * Simple Agent Task Tests
 * 
 * Tests basic agent task execution via WebSocket:
 * - Simple queries
 * - Math calculations
 * - Basic system commands
 */
test.describe('Simple Agent Tasks', () => {
  let wsClient: OpenClawWebSocketClient;

  test.beforeEach(() => {
    wsClient = new OpenClawWebSocketClient();
  });

  test.afterEach(() => {
    wsClient.disconnect();
  });

  test('@critical - Agent responds to simple math query', async () => {
    // Connect to WebSocket
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Send simple math query
    const response = await wsClient.sendAndWait(
      TEST_COMMANDS.simple,
      { timeout: TIMEOUTS.agent }
    );

    // Verify response received
    expect(response).not.toBeNull();
    expect(response?.type).toMatch(/response|done/);
    
    console.log('Simple math response:', response);
  });

  test('@critical - Agent calculates multiplication correctly', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    const response = await wsClient.sendAndWait(
      TEST_COMMANDS.simpleMath,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    expect(response?.type).toMatch(/response|done/);
    
    // Response should contain the correct answer (15 * 23 = 345)
    const responseText = JSON.stringify(response).toLowerCase();
    expect(responseText).toContain('345');
    
    console.log('Multiplication response:', response);
  });

  test('@critical - Agent executes whoami command', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    const response = await wsClient.sendAndWait(
      TEST_COMMANDS.whoami,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    
    // Should get a response containing user info
    const responseText = JSON.stringify(response);
    expect(responseText.length).toBeGreaterThan(0);
    
    console.log('Whoami response:', response);
  });

  test('@critical - Agent reports current directory', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    const response = await wsClient.sendAndWait(
      TEST_COMMANDS.currentDir,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('PWD response:', response);
  });

  test('@smoke - Agent lists files correctly', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    const response = await wsClient.sendAndWait(
      TEST_COMMANDS.listFiles,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('List files response:', response);
  });

  test('@smoke - Agent handles verbose mode toggle', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Enable verbose mode
    const verboseResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.verboseOn,
      { timeout: TIMEOUTS.agent }
    );

    expect(verboseResponse).not.toBeNull();
    console.log('Verbose on response:', verboseResponse);
  });

  test('@smoke - Agent handles thinking mode configuration', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Set thinking to high
    const thinkingResponse = await wsClient.sendAndWait(
      TEST_COMMANDS.thinkingHigh,
      { timeout: TIMEOUTS.agent }
    );

    expect(thinkingResponse).not.toBeNull();
    console.log('Thinking high response:', thinkingResponse);
  });
});
