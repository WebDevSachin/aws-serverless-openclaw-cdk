// Test configuration and data for OpenClaw E2E tests

export const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'https://d15af3nsx4ckro.cloudfront.net',
  wsURL: process.env.WS_URL || 'wss://d15af3nsx4ckro.cloudfront.net/ws',
  basicAuth: {
    username: process.env.BASIC_AUTH_USER || 'admin',
    password: process.env.BASIC_AUTH_PASS || 'openclaw2025',
  },
  gatewayToken: process.env.GATEWAY_TOKEN || 'GnSPN0qwdgbSOlJapflHjT2xvwOKax32',
};

// Test commands for agent validation
export const TEST_COMMANDS = {
  // Simple queries
  simple: 'What is 2+2?',
  simpleMath: 'Calculate 15 * 23',
  
  // System commands
  whoami: 'whoami',
  currentDir: 'pwd',
  listFiles: 'ls -la',
  
  // File operations
  writeFile: 'echo "test content" > /tmp/openclaw-test.txt',
  readFile: 'cat /tmp/openclaw-test.txt',
  createWorkspaceFile: 'echo "workspace test" > ~/.openclaw/workspace/test-file.txt',
  readWorkspaceFile: 'cat ~/.openclaw/workspace/test-file.txt',
  
  // Model switching commands
  switchToOpus: 'Switch to opus',
  switchToGPT4: 'Switch to gpt4',
  switchToGemini: 'Switch to gemini',
  switchToKimi: 'Switch to kimi',
  
  // Session commands
  resetSession: '/reset',
  newSession: '/new',
  clearSession: '/clear',
  
  // Browser commands
  browserTest: 'Go to https://example.com and tell me the page title',
  
  // Elevated tool commands
  installPackage: 'apt-get update && apt-get install -y curl',
  systemInfo: 'uname -a && cat /etc/os-release',
  
  // Agent behavior
  verboseOn: 'Enable verbose mode',
  verboseOff: 'Disable verbose mode',
  thinkingHigh: 'Set thinking to high',
  thinkingOff: 'Set thinking to off',
  elevatedOn: 'Enable elevated tools',
  elevatedOff: 'Disable elevated tools',
};

// Expected responses (partial matches)
export const EXPECTED_RESPONSES = {
  simpleMath: ['4', 'four'],
  whoami: ['root', 'node'],
  thinkingHigh: ['thinking', 'analyzing'],
  elevatedEnabled: ['elevated', 'enabled'],
  sessionReset: ['reset', 'cleared', 'new session'],
};

// Model aliases configuration
export const MODEL_ALIASES = {
  opus: 'openrouter/anthropic/claude-opus-4',
  gpt4: 'openrouter/openai/gpt-4',
  gemini: 'openrouter/google/gemini-2.0-flash-001',
  kimi: 'openrouter/moonshotai/kimi-k2.5',
};

// Timeout configurations
export const TIMEOUTS = {
  quick: 30000,      // 30 seconds
  normal: 60000,     // 1 minute
  long: 120000,      // 2 minutes
  veryLong: 180000,  // 3 minutes
  agent: 300000,     // 5 minutes for complex agent tasks
};

// Session configuration
export const SESSION_CONFIG = {
  typingInterval: 5000,  // 5 seconds
  resetTriggers: ['/new', '/reset', '/clear'],
  idleTimeout: 1440,     // 24 hours in minutes
};

// Channel configuration
export const CHANNEL_CONFIG = {
  whatsapp: {
    enabled: true,
    mediaMaxMb: 50,
    textChunkLimit: 4000,
  },
  telegram: {
    enabled: true,
    mediaMaxMb: 5,
    historyLimit: 50,
  },
  web: {
    enabled: true,
    heartbeatSeconds: 60,
  },
};
