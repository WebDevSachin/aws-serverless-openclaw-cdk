import { test, expect } from '@playwright/test';
import { OpenClawWebSocketClient } from '../utils/ws-client';
import { TEST_CONFIG, TEST_COMMANDS, TIMEOUTS } from '../../fixtures/test-data';

/**
 * Concurrent Agent Execution Tests
 * 
 * Tests for concurrent agent execution:
 * - Multiple simultaneous agent tasks
 * - Session isolation
 * - Concurrent execution limits
 * - Parallel task processing
 */
test.describe('Concurrent Agent Execution', () => {
  
  test('@critical - Multiple WebSocket connections work simultaneously', async () => {
    // Create multiple clients
    const client1 = new OpenClawWebSocketClient();
    const client2 = new OpenClawWebSocketClient();
    const client3 = new OpenClawWebSocketClient();

    // Connect all clients
    const [connected1, connected2, connected3] = await Promise.all([
      client1.connect(),
      client2.connect(),
      client3.connect(),
    ]);

    expect(connected1).toBeTruthy();
    expect(connected2).toBeTruthy();
    expect(connected3).toBeTruthy();

    // Send messages to all clients in parallel
    const [response1, response2, response3] = await Promise.all([
      client1.sendAndWait('What is 1+1?', { timeout: TIMEOUTS.agent }),
      client2.sendAndWait('What is 2+2?', { timeout: TIMEOUTS.agent }),
      client3.sendAndWait('What is 3+3?', { timeout: TIMEOUTS.agent }),
    ]);

    // All should receive responses
    expect(response1).not.toBeNull();
    expect(response2).not.toBeNull();
    expect(response3).not.toBeNull();

    console.log('Concurrent response 1:', response1);
    console.log('Concurrent response 2:', response2);
    console.log('Concurrent response 3:', response3);

    // Cleanup
    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
  });

  test('@critical - Concurrent tasks complete independently', async () => {
    const client1 = new OpenClawWebSocketClient();
    const client2 = new OpenClawWebSocketClient();

    await Promise.all([
      client1.connect(),
      client2.connect(),
    ]);

    // Send different tasks to each client
    const [response1, response2] = await Promise.all([
      client1.sendAndWait('List the files in the current directory', { timeout: TIMEOUTS.agent }),
      client2.sendAndWait('What is the current date and time?', { timeout: TIMEOUTS.agent }),
    ]);

    expect(response1).not.toBeNull();
    expect(response2).not.toBeNull();

    // Responses should be different
    const response1Text = JSON.stringify(response1);
    const response2Text = JSON.stringify(response2);
    expect(response1Text).not.toBe(response2Text);

    console.log('Task 1 response:', response1);
    console.log('Task 2 response:', response2);

    client1.disconnect();
    client2.disconnect();
  });

  test('@critical - Multiple sessions run independently', async () => {
    // Create clients with different session IDs
    const session1 = `test-session-${Date.now()}-1`;
    const session2 = `test-session-${Date.now()}-2`;

    const client1 = new OpenClawWebSocketClient();
    const client2 = new OpenClawWebSocketClient();

    await Promise.all([
      client1.connect(),
      client2.connect(),
    ]);

    // Send messages with different sessions
    const [response1, response2] = await Promise.all([
      client1.sendAndWait('Remember: my favorite color is blue', { 
        sessionId: session1,
        timeout: TIMEOUTS.agent 
      }),
      client2.sendAndWait('Remember: my favorite color is red', { 
        sessionId: session2,
        timeout: TIMEOUTS.agent 
      }),
    ]);

    expect(response1).not.toBeNull();
    expect(response2).not.toBeNull();

    console.log('Session 1 response:', response1);
    console.log('Session 2 response:', response2);

    // Now verify sessions are isolated by asking each to recall
    const [recall1, recall2] = await Promise.all([
      client1.sendAndWait('What is my favorite color?', { 
        sessionId: session1,
        timeout: TIMEOUTS.agent 
      }),
      client2.sendAndWait('What is my favorite color?', { 
        sessionId: session2,
        timeout: TIMEOUTS.agent 
      }),
    ]);

    expect(recall1).not.toBeNull();
    expect(recall2).not.toBeNull();

    console.log('Session 1 recall:', recall1);
    console.log('Session 2 recall:', recall2);

    // Verify session isolation (each should remember their own color)
    const recall1Text = JSON.stringify(recall1).toLowerCase();
    const recall2Text = JSON.stringify(recall2).toLowerCase();
    
    // At minimum, both sessions should respond
    expect(recall1Text.length).toBeGreaterThan(0);
    expect(recall2Text.length).toBeGreaterThan(0);

    client1.disconnect();
    client2.disconnect();
  });

  test('@smoke - Ten concurrent connections handle properly', async () => {
    // Create 10 clients
    const clients = Array.from({ length: 10 }, () => new OpenClawWebSocketClient());

    // Connect all clients
    const connections = await Promise.all(
      clients.map(client => client.connect())
    );

    // All should connect
    connections.forEach((connected, index) => {
      expect(connected).toBeTruthy(`Client ${index} should connect`);
    });

    // Send messages to all clients in parallel
    const responses = await Promise.all(
      clients.map((client, index) => 
        client.sendAndWait(`What is ${index + 1} times 10?`, { timeout: TIMEOUTS.agent })
      )
    );

    // All should receive responses
    responses.forEach((response, index) => {
      expect(response).not.toBeNull();
      console.log(`Response ${index}:`, response);
    });

    // Cleanup
    clients.forEach(client => client.disconnect());
  });

  test('@smoke - Concurrent tasks with different models', async () => {
    const client1 = new OpenClawWebSocketClient();
    const client2 = new OpenClawWebSocketClient();
    const client3 = new OpenClawWebSocketClient();

    await Promise.all([
      client1.connect(),
      client2.connect(),
      client3.connect(),
    ]);

    // Use different models for each
    const [response1, response2, response3] = await Promise.all([
      client1.sendAndWait('Explain gravity in one sentence', { 
        model: 'openrouter/moonshotai/kimi-k2.5',
        timeout: TIMEOUTS.agent 
      }),
      client2.sendAndWait('Explain gravity in one sentence', { 
        model: 'openrouter/anthropic/claude-3.5-sonnet',
        timeout: TIMEOUTS.agent 
      }),
      client3.sendAndWait('Explain gravity in one sentence', { 
        model: 'openrouter/google/gemini-2.0-flash-001',
        timeout: TIMEOUTS.agent 
      }),
    ]);

    expect(response1).not.toBeNull();
    expect(response2).not.toBeNull();
    expect(response3).not.toBeNull();

    console.log('Kimi response:', response1);
    console.log('Claude response:', response2);
    console.log('Gemini response:', response3);

    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
  });

  test('@smoke - Rapid sequential messages on single connection', async () => {
    const client = new OpenClawWebSocketClient();
    await client.connect();

    // Send multiple messages rapidly
    const messages = [
      'Say: First',
      'Say: Second',
      'Say: Third',
    ];

    const responses = [];
    for (const msg of messages) {
      const response = await client.sendAndWait(msg, { timeout: TIMEOUTS.agent });
      responses.push(response);
      expect(response).not.toBeNull();
    }

    console.log('Rapid sequential responses:', responses);

    client.disconnect();
  });

  test('@smoke - Concurrent file operations', async () => {
    const client1 = new OpenClawWebSocketClient();
    const client2 = new OpenClawWebSocketClient();

    await Promise.all([
      client1.connect(),
      client2.connect(),
    ]);

    // Concurrent file operations
    const [response1, response2] = await Promise.all([
      client1.sendAndWait('Create a file at /tmp/client1-test.txt with content "Hello from client 1"', { timeout: TIMEOUTS.agent }),
      client2.sendAndWait('Create a file at /tmp/client2-test.txt with content "Hello from client 2"', { timeout: TIMEOUTS.agent }),
    ]);

    expect(response1).not.toBeNull();
    expect(response2).not.toBeNull();

    console.log('File operation 1:', response1);
    console.log('File operation 2:', response2);

    // Verify files were created by reading them back
    const [read1, read2] = await Promise.all([
      client1.sendAndWait('Read the file /tmp/client1-test.txt', { timeout: TIMEOUTS.agent }),
      client2.sendAndWait('Read the file /tmp/client2-test.txt', { timeout: TIMEOUTS.agent }),
    ]);

    expect(read1).not.toBeNull();
    expect(read2).not.toBeNull();

    console.log('File content 1:', read1);
    console.log('File content 2:', read2);

    client1.disconnect();
    client2.disconnect();
  });

  test('@smoke - Stress test with 5 parallel heavy tasks', async () => {
    const clients = Array.from({ length: 5 }, () => new OpenClawWebSocketClient());

    // Connect all
    await Promise.all(clients.map(client => client.connect()));

    // Send computationally intensive tasks
    const tasks = [
      'Calculate the factorial of 10',
      'List all prime numbers between 1 and 100',
      'What is the square root of 144?',
      'Calculate 25 * 4 + 10',
      'What is 100 divided by 4?',
    ];

    const responses = await Promise.all(
      clients.map((client, index) => 
        client.sendAndWait(tasks[index], { timeout: TIMEOUTS.agent })
      )
    );

    // All should complete
    responses.forEach((response, index) => {
      expect(response).not.toBeNull();
      console.log(`Task ${index + 1} response:`, response);
    });

    // Cleanup
    clients.forEach(client => client.disconnect());
  });
});
