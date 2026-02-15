# OpenClaw Model Configuration

This document describes the AI models configured for OpenClaw, optimized for different tasks and budgets.

## Overview

- **Default Model**: Kimi K2.5 (Moonshot AI) - Excellent all-rounder with 256K context
- **Coding**: Claude Sonnet 4.5 (Anthropic) - Best-in-class for software engineering
- **Complex Tasks**: Claude Opus 4.5 (Anthropic) - Most capable for deep analysis
- **Vision**: Claude Sonnet 4.6 (Anthropic) - Best for multimodal tasks
- **Fast**: Claude 3.5 Haiku (Anthropic) - Lightning fast responses

---

## Default Model

### Kimi K2.5 (Moonshot AI) ⭐ DEFAULT
```json
"openrouter/moonshotai/kimi-k2.5"
```
- **Context**: 256,000 tokens
- **Price**: $1.50/M input, $1.50/M output
- **Ranking**: A-tier on LM Arena
- **Best For**: General tasks, long documents, daily use, research, analysis

Kimi K2.5 is the default model for all tasks. It excels at handling long contexts and provides excellent responses for most use cases.

---

## Anthropic Models (Task-Specific)

### Claude Opus 4.5 - Complex Tasks
```json
"openrouter/anthropic/claude-opus-4-5"
```
- **Context**: 200,000 tokens
- **Price**: $15.00/M input, $75.00/M output
- **Ranking**: S-tier
- **Best For**: Complex analysis, research, deep reasoning, creative writing

Use for: Deep research, complex problem solving, long-form content creation

---

### Claude Sonnet 4.6 - Vision & UI
```json
"openrouter/anthropic/claude-sonnet-4-6"
```
- **Context**: 200,000 tokens
- **Price**: $5.00/M input, $25.00/M output
- **Ranking**: S-tier
- **Best For**: Vision tasks, UI development, multimodal analysis, image understanding

Use for: Screenshot analysis, UI/UX design, visual debugging, multimodal tasks

---

### Claude Sonnet 4.5 - Coding
```json
"openrouter/anthropic/claude-sonnet-4-5"
```
- **Context**: 200,000 tokens
- **Price**: $3.00/M input, $15.00/M output
- **Ranking**: S-tier
- **Best For**: Coding, code review, debugging, software architecture

Use for: Writing code, reviewing PRs, debugging, system design

---

### Claude 3.5 Sonnet - Reliable Coding
```json
"openrouter/anthropic/claude-3.5-sonnet"
```
- **Context**: 200,000 tokens
- **Price**: $3.00/M input, $15.00/M output
- **Ranking**: S-tier
- **Best For**: Coding, agents, tool use, general tasks

Proven reliable model with excellent coding capabilities.

---

### Claude 3.5 Haiku - Fast Tasks
```json
"openrouter/anthropic/claude-3-5-haiku"
```
- **Context**: 200,000 tokens
- **Price**: $0.80/M input, $4.00/M output
- **Ranking**: B-tier
- **Best For**: Quick responses, simple tasks, high throughput, sub-agents

Fastest Anthropic model. Use for quick tasks or as sub-agents.

---

## Value Models (Best Price/Performance)

### Gemini 2.5 Flash - Best Value
```json
"openrouter/google/gemini-2.5-flash-preview"
```
- **Context**: 1,000,000 tokens
- **Price**: $0.50/M input, $3.00/M output
- **Ranking**: A-tier
- **Best For**: Long context, fast responses, cost-effective production

---

### MiniMax-M2.1 - Ultra Cheap
```json
"openrouter/minimax/minimax-m2.1"
```
- **Context**: 197,000 tokens
- **Price**: $0.27/M input, $1.12/M output
- **Ranking**: A-tier
- **Best For**: Agents, coding, high volume tasks

---

### DeepSeek V3 - Budget Champion
```json
"openrouter/deepseek/deepseek-chat"
```
- **Context**: 64,000 tokens
- **Price**: $0.14/M input, $0.28/M output
- **Ranking**: A-tier
- **Best For**: High volume, cost-sensitive applications

---

## Budget Models (Free/Cheap)

### Gemini 2.0 Flash - FREE TIER
```json
"openrouter/google/gemini-2.0-flash-exp:free"
```
- **Context**: 1,000,000 tokens
- **Price**: FREE
- **Ranking**: B-tier
- **Best For**: Testing, low priority tasks, experimentation

---

### Llama 3.3 70B - Open Source
```json
"openrouter/meta-llama/llama-3.3-70b-instruct"
```
- **Context**: 128,000 tokens
- **Price**: $0.12/M input, $0.30/M output
- **Ranking**: B-tier
- **Best For**: Open source preference, privacy-focused

---

## Task-Based Routing

The system automatically routes tasks to appropriate models:

| Task Type | Model | Model ID |
|-----------|-------|----------|
| Default/General | Kimi K2.5 | `moonshotai/kimi-k2.5` |
| Coding | Claude Sonnet 4.5 | `anthropic/claude-sonnet-4-5` |
| Code Review | Claude Sonnet 4.5 | `anthropic/claude-sonnet-4-5` |
| Debugging | Claude Sonnet 4.5 | `anthropic/claude-sonnet-4-5` |
| Complex Analysis | Claude Opus 4.5 | `anthropic/claude-opus-4-5` |
| Research | Claude Opus 4.5 | `anthropic/claude-opus-4-5` |
| Vision/Images | Claude Sonnet 4.6 | `anthropic/claude-sonnet-4-6` |
| UI Design | Claude Sonnet 4.6 | `anthropic/claude-sonnet-4-6` |
| Quick Task | Claude 3.5 Haiku | `anthropic/claude-3-5-haiku` |
| Fast Response | Claude 3.5 Haiku | `anthropic/claude-3-5-haiku` |

---

## Complexity-Based Routing

| Complexity | Model | Price/M Input |
|------------|-------|---------------|
| Low | Claude 3.5 Haiku | $0.80 |
| Medium | Kimi K2.5 | $1.50 |
| High | Claude Sonnet 4.5 | $3.00 |
| Very High | Claude Opus 4.5 | $15.00 |

---

## Usage Examples

### Using Specific Models

```typescript
// Default (Kimi K2.5)
const response = await agent.chat("Hello!");

// For coding tasks (automatically uses Claude Sonnet 4.5)
const code = await agent.code("Write a function to...");

// For complex analysis (automatically uses Claude Opus 4.5)
const analysis = await agent.analyze("Deep analysis of...");
```

### Manual Model Selection

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/anthropic/claude-sonnet-4-5"
      }
    }
  }
}
```

---

## AWS Bedrock Models

For AWS Bedrock integration, these models are also available:

| Model | ID | Price/M Input |
|-------|-----|---------------|
| Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20241022-v2:0` | $3.00 |
| Claude 3.5 Haiku | `anthropic.claude-3-5-haiku-20241022-v1:0` | $0.80 |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229-v1:0` | $15.00 |
| Nova Pro | `amazon.nova-pro-v1:0` | $0.80 |
| Nova Lite | `amazon.nova-lite-v1:0` | $0.06 |
| Nova Micro | `amazon.nova-micro-v1:0` | $0.035 |
| Llama 3.3 70B | `meta.llama3-3-70b-instruct-v1:0` | $0.72 |

**Note**: Claude models on Bedrock are only available in `us-east-1`, `us-west-2`, `eu-central-1`, and `eu-west-3`.

---

## Cost Comparison

For a task with 10K input tokens and 2K output tokens:

| Model | Input Cost | Output Cost | Total |
|-------|------------|-------------|-------|
| Claude Opus 4.5 | $0.150 | $0.150 | **$0.300** |
| Claude Sonnet 4.6 | $0.050 | $0.050 | **$0.100** |
| Claude Sonnet 4.5 | $0.030 | $0.030 | **$0.060** |
| Kimi K2.5 | $0.015 | $0.003 | **$0.018** |
| Gemini 2.5 Flash | $0.005 | $0.006 | **$0.011** |
| MiniMax-M2.1 | $0.003 | $0.002 | **$0.005** |
| DeepSeek V3 | $0.001 | $0.001 | **$0.002** |
| Gemini 2.0 Flash | **FREE** | **FREE** | **$0.000** |

---

## Configuration File

The model configuration is stored in:
```
docker/config/openclaw.json
```

Update this file and redeploy to change model settings:
```bash
aws s3 cp docker/config/openclaw.json s3://openclaw-storage-<account>/config/openclaw.json
aws ecs update-service --cluster openclaw-cluster --service openclaw-service --force-new-deployment
```

---

## References

- [OpenRouter Rankings](https://openrouter.ai/rankings)
- [LM Arena Leaderboard](https://chat.lmsys.org/)
- [Anthropic Claude Models](https://www.anthropic.com/claude)
- [Moonshot AI Kimi](https://www.moonshot.ai/)
