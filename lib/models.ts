/**
 * OpenClaw Model Configuration
 * 
 * Curated list of the best models from LM Arena and OpenRouter.
 * Default: Kimi K2.5 for general tasks
 * Specialized: Anthropic Claude models for specific tasks
 * 
 * Last Updated: 2026-02-15
 * Source: https://openrouter.ai/rankings
 */

/**
 * Model definition interface
 */
export interface ModelDefinition {
  /** Model ID for OpenRouter */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Provider name */
  readonly provider: string;
  /** Context window size */
  readonly contextWindow: number;
  /** Input price per million tokens */
  readonly inputPrice: number;
  /** Output price per million tokens */
  readonly outputPrice: number;
  /** Description of capabilities */
  readonly description: string;
  /** Best use cases */
  readonly useCases: string[];
  /** LM Arena ranking tier */
  readonly ranking: 'S' | 'A' | 'B' | 'C';
  /** Is this the default model */
  readonly isDefault?: boolean;
}

/**
 * DEFAULT MODEL
 * Kimi K2.5 - Long context specialist, excellent all-rounder
 */
export const DEFAULT_MODEL: ModelDefinition = {
  id: 'moonshotai/kimi-k2.5',
  name: 'Kimi K2.5',
  provider: 'Moonshot AI',
  contextWindow: 256000,
  inputPrice: 1.50,
  outputPrice: 1.50,
  description: 'DEFAULT MODEL - Long context specialist with 256K context. Excellent all-rounder for most tasks.',
  useCases: ['General tasks', 'Long documents', 'Daily use', 'Research', 'Analysis'],
  ranking: 'A',
  isDefault: true,
};

/**
 * ANTHROPIC MODELS
 * Specialized models for coding, complex tasks, and vision
 */
export const ANTHROPIC_MODELS: Record<string, ModelDefinition> = {
  /**
   * Claude Opus 4.5 - Most capable Anthropic model
   * For: Complex analysis, research, deep reasoning
   */
  CLAUDE_OPUS_4_5: {
    id: 'anthropic/claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    description: 'Most capable Anthropic model. Best for deep analysis, research, and complex reasoning.',
    useCases: ['Complex analysis', 'Research', 'Deep reasoning', 'Creative writing', 'Long-form content'],
    ranking: 'S',
  },

  /**
   * Claude Sonnet 4.6 - Latest with vision
   * For: Vision tasks, UI development, advanced coding
   */
  CLAUDE_SONNET_4_6: {
    id: 'anthropic/claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputPrice: 5.0,
    outputPrice: 25.0,
    description: 'Latest Sonnet with best-in-class vision and coding capabilities.',
    useCases: ['Vision tasks', 'UI development', 'Multimodal', 'Advanced coding', 'Image analysis'],
    ranking: 'S',
  },

  /**
   * Claude Sonnet 4.5 - Best for coding
   * For: Software engineering, code review, debugging
   */
  CLAUDE_SONNET_4_5: {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    description: 'Best coding model from Anthropic. Exceptional at software engineering tasks.',
    useCases: ['Coding', 'Code review', 'Debugging', 'Architecture', 'Software engineering'],
    ranking: 'S',
  },

  /**
   * Claude 3.5 Sonnet - Reliable proven model
   * For: Coding, agents, general tasks
   */
  CLAUDE_3_5_SONNET: {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    description: 'Proven S-tier coding model. Great balance of capability and reliability.',
    useCases: ['Coding', 'Agents', 'Tool use', 'General tasks', 'Reasoning'],
    ranking: 'S',
  },

  /**
   * Claude 3.5 Haiku - Fast responses
   * For: Quick tasks, sub-agents, high throughput
   */
  CLAUDE_3_5_HAIKU: {
    id: 'anthropic/claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputPrice: 0.80,
    outputPrice: 4.0,
    description: 'Lightning fast responses. Perfect for quick tasks and sub-agents.',
    useCases: ['Quick responses', 'Simple tasks', 'High throughput', 'Sub-agents'],
    ranking: 'B',
  },

  /**
   * Claude 3 Opus - Previous generation flagship
   */
  CLAUDE_3_OPUS: {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    description: 'Previous generation high-capability model.',
    useCases: ['Complex tasks', 'Research', 'Analysis'],
    ranking: 'S',
  },
};

/**
 * VALUE TIER MODELS
 * Best price-to-performance ratio
 */
export const VALUE_MODELS: Record<string, ModelDefinition> = {
  /**
   * Gemini 2.5 Flash - Best value
   */
  GEMINI_2_5_FLASH: {
    id: 'google/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    contextWindow: 1000000,
    inputPrice: 0.50,
    outputPrice: 3.0,
    description: 'Best value - Near Pro reasoning at 60% lower cost. 1M context.',
    useCases: ['Long context', 'Fast responses', 'Cost-effective', 'Interactive dev'],
    ranking: 'A',
  },

  /**
   * MiniMax-M2.1 - Ultra cheap
   */
  MINIMAX_M2_1: {
    id: 'minimax/minimax-m2.1',
    name: 'MiniMax-M2.1',
    provider: 'MiniMax',
    contextWindow: 197000,
    inputPrice: 0.27,
    outputPrice: 1.12,
    description: '$0.27/M input. Excellent for agents and coding.',
    useCases: ['Agents', 'Coding', 'High volume', 'Cost-efficient'],
    ranking: 'A',
  },

  /**
   * DeepSeek V3 - Ultra cheap
   */
  DEEPSEEK_V3: {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    contextWindow: 64000,
    inputPrice: 0.14,
    outputPrice: 0.28,
    description: '$0.14/M input. Great for high volume tasks.',
    useCases: ['High volume', 'Coding', 'Cost-sensitive'],
    ranking: 'A',
  },
};

/**
 * BUDGET TIER MODELS
 * Cheapest options
 */
export const BUDGET_MODELS: Record<string, ModelDefinition> = {
  GEMINI_2_0_FLASH_FREE: {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: 'Google',
    contextWindow: 1000000,
    inputPrice: 0.0,
    outputPrice: 0.0,
    description: 'FREE tier - 1M context, good quality.',
    useCases: ['Free usage', 'Testing', 'Low priority'],
    ranking: 'B',
  },
  LLAMA_3_3_70B: {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    contextWindow: 128000,
    inputPrice: 0.12,
    outputPrice: 0.30,
    description: 'Strong open-source model. Great for privacy.',
    useCases: ['Open source', 'Privacy', 'Cost-effective'],
    ranking: 'B',
  },
};

/**
 * All models combined
 */
export const ALL_MODELS: Record<string, ModelDefinition> = {
  KIMI_K2_5: DEFAULT_MODEL,
  ...ANTHROPIC_MODELS,
  ...VALUE_MODELS,
  ...BUDGET_MODELS,
};

/**
 * Recommended models by use case
 * Default is Kimi K2.5, with Anthropic models for specialized tasks
 */
export const RECOMMENDED_MODELS = {
  /** Default for general tasks */
  DEFAULT: DEFAULT_MODEL,
  /** Coding tasks - use Claude Sonnet 4.5 */
  CODING: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
  /** Complex analysis - use Claude Opus 4.5 */
  COMPLEX: ANTHROPIC_MODELS.CLAUDE_OPUS_4_5,
  /** Vision tasks - use Claude Sonnet 4.6 */
  VISION: ANTHROPIC_MODELS.CLAUDE_SONNET_4_6,
  /** Fast responses - use Claude 3.5 Haiku */
  FAST: ANTHROPIC_MODELS.CLAUDE_3_5_HAIKU,
  /** Best value - use Gemini 2.5 Flash */
  VALUE: VALUE_MODELS.GEMINI_2_5_FLASH,
  /** Free option - use Gemini 2.0 Flash */
  FREE: BUDGET_MODELS.GEMINI_2_0_FLASH_FREE,
  /** Reliable fallback - use Claude 3.5 Sonnet */
  RELIABLE: ANTHROPIC_MODELS.CLAUDE_3_5_SONNET,
};

/**
 * Task-based model routing
 * Routes different tasks to appropriate models
 */
export const TASK_ROUTING = {
  /** General tasks use Kimi K2.5 */
  general: DEFAULT_MODEL,
  /** Coding uses Claude Sonnet 4.5 */
  coding: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
  /** Code review uses Claude Sonnet 4.5 */
  codeReview: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
  /** Debugging uses Claude Sonnet 4.5 */
  debugging: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
  /** Complex analysis uses Claude Opus 4.5 */
  complexAnalysis: ANTHROPIC_MODELS.CLAUDE_OPUS_4_5,
  /** Research uses Claude Opus 4.5 */
  research: ANTHROPIC_MODELS.CLAUDE_OPUS_4_5,
  /** Vision uses Claude Sonnet 4.6 */
  vision: ANTHROPIC_MODELS.CLAUDE_SONNET_4_6,
  /** UI design uses Claude Sonnet 4.6 */
  uiDesign: ANTHROPIC_MODELS.CLAUDE_SONNET_4_6,
  /** Quick tasks use Claude 3.5 Haiku */
  quickTask: ANTHROPIC_MODELS.CLAUDE_3_5_HAIKU,
  /** Fast response uses Claude 3.5 Haiku */
  fastResponse: ANTHROPIC_MODELS.CLAUDE_3_5_HAIKU,
};

/**
 * Complexity-based model selection
 */
export const COMPLEXITY_ROUTING = {
  /** Low complexity - use Haiku */
  low: ANTHROPIC_MODELS.CLAUDE_3_5_HAIKU,
  /** Medium complexity - use Kimi K2.5 (default) */
  medium: DEFAULT_MODEL,
  /** High complexity - use Sonnet 4.5 */
  high: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
  /** Very high complexity - use Opus 4.5 */
  veryHigh: ANTHROPIC_MODELS.CLAUDE_OPUS_4_5,
};

/**
 * Get model by ID
 */
export function getModelById(id: string): ModelDefinition | undefined {
  return Object.values(ALL_MODELS).find(model => model.id === id);
}

/**
 * Get OpenRouter full model ID (with prefix)
 */
export function getOpenRouterId(model: ModelDefinition): string {
  return `openrouter/${model.id}`;
}

/**
 * Calculate estimated cost for a task
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const model = getModelById(modelId);
  if (!model) return null;
  
  const inputCost = (inputTokens / 1_000_000) * model.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * model.outputPrice;
  return inputCost + outputCost;
}

/**
 * Compare costs between models
 */
export function compareCosts(
  inputTokens: number,
  outputTokens: number
): Array<{ model: ModelDefinition; cost: number }> {
  return Object.values(ALL_MODELS)
    .map(model => ({
      model,
      cost: estimateCost(model.id, inputTokens, outputTokens) ?? 0,
    }))
    .sort((a, b) => a.cost - b.cost);
}
