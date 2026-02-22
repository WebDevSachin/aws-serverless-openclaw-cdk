import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Production configuration
const BASE_URL = process.env.BASE_URL || 'https://d15af3nsx4ckro.cloudfront.net';
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'admin';
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || 'openclaw2025';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || 'GnSPN0qwdgbSOlJapflHjT2xvwOKax32';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Sequential for OpenClaw tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for agent tests
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  use: {
    baseURL: BASE_URL,
    httpCredentials: {
      username: BASIC_AUTH_USER,
      password: BASIC_AUTH_PASS,
    },
    extraHTTPHeaders: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'X-Gateway-Token': GATEWAY_TOKEN,
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // Global timeout for long-running agent tests
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 60000,
  },

  projects: [
    {
      name: 'gateway',
      testMatch: /01-gateway\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'websocket',
      testMatch: /02-websocket\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'agent',
      testMatch: /03-agent\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 180000, // 3 minutes for agent tests
    },
    {
      name: 'tools',
      testMatch: /04-tools\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 180000,
    },
    {
      name: 'session',
      testMatch: /05-session\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'channels',
      testMatch: /06-channels\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: 'test-results/',
});
