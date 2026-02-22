import { test, expect } from '@playwright/test';
import { OpenClawWebSocketClient } from '../utils/ws-client';
import { TEST_CONFIG, TIMEOUTS } from '../../fixtures/test-data';
import * as path from 'path';

/**
 * Vision/Image Analysis Tests
 * 
 * Tests for image/vision analysis capabilities:
 * - Image description
 * - Visual content analysis
 * - Image-based questions
 * 
 * Note: Vision capabilities depend on the model supporting vision.
 * Kimi K2.5 and Claude models typically support vision.
 */
test.describe('Vision/Image Analysis', () => {
  let wsClient: OpenClawWebSocketClient;

  test.beforeEach(() => {
    wsClient = new OpenClawWebSocketClient();
  });

  test.afterEach(() => {
    wsClient.disconnect();
  });

  test('@critical - Agent can analyze image from URL', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Ask agent to analyze an image from a public URL
    const visionQuery = 'Look at https://httpbin.org/image/jpeg and describe what you see in the image.';
    
    const response = await wsClient.sendAndWait(
      visionQuery,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    expect(response?.type).toMatch(/response|done/);
    
    console.log('Vision response from URL:', response);
    
    // Response should contain some analysis (not an error)
    const responseText = JSON.stringify(response);
    expect(responseText.length).toBeGreaterThan(10);
  });

  test('@critical - Agent can analyze image from different source', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Test with another image source
    const visionQuery = 'What is in this image? https://httpbin.org/image/png';
    
    const response = await wsClient.sendAndWait(
      visionQuery,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('Vision response from PNG:', response);
  });

  test('@smoke - Agent handles vision with detailed analysis request', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Request detailed analysis
    const visionQuery = 'Analyze this image in detail: https://httpbin.org/image/jpeg. What are the main colors, objects, and any text visible?';
    
    const response = await wsClient.sendAndWait(
      visionQuery,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('Detailed vision analysis:', response);
  });

  test('@smoke - Agent handles multiple images in single query', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Ask about multiple images
    const visionQuery = 'Compare these two images: https://httpbin.org/image/jpeg and https://httpbin.org/image/png. What are the differences?';
    
    const response = await wsClient.sendAndWait(
      visionQuery,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('Multi-image comparison:', response);
  });

  test('@smoke - Agent handles vision request without explicit URL', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Test a general vision-related query
    const query = 'Can you describe what you would see if you looked at a red apple?';
    
    const response = await wsClient.sendAndWait(
      query,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('Vision description response:', response);
    
    // Should get a descriptive response
    const responseText = JSON.stringify(response).toLowerCase();
    expect(responseText).toMatch(/red|apple|round|color|fruit/);
  });

  test('@smoke - Agent uses Kimi model for vision (if supported)', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Use Kimi model which supports vision
    const visionQuery = 'Describe this image: https://httpbin.org/image/jpeg';
    
    const response = await wsClient.sendAndWait(
      visionQuery, 
      { 
        model: 'openrouter/moonshotai/kimi-k2.5',
        timeout: TIMEOUTS.agent 
      }
    );

    expect(response).not.toBeNull();
    console.log('Kimi vision response:', response);
  });

  test('@smoke - Vision works with SVG images', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Test with SVG image
    const visionQuery = 'What do you see in this SVG image? https://httpbin.org/image/svg';
    
    const response = await wsClient.sendAndWait(
      visionQuery,
      { timeout: TIMEOUTS.agent }
    );

    expect(response).not.toBeNull();
    console.log('SVG vision response:', response);
  });

  test('@smoke - Agent handles vision errors gracefully', async () => {
    const connected = await wsClient.connect();
    expect(connected).toBeTruthy();

    // Test with invalid/non-existent image URL
    const visionQuery = 'Describe this image: https://httpbin.org/status/404';
    
    const response = await wsClient.sendAndWait(
      visionQuery,
      { timeout: TIMEOUTS.agent }
    );

    // Should still get a response (possibly an error message)
    expect(response).not.toBeNull();
    console.log('Vision error handling response:', response);
  });
});
