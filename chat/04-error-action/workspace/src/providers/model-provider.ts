import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import type { OpenAiConfig } from '../config/open-ai-config.js';

export function createModel(config: OpenAiConfig): LanguageModel {
  const provider = createOpenAICompatible({
    name: 'openai-compatible',
    baseURL: config.baseUrl,
    apiKey: config.apiKey
  });

  return provider(config.model);
}
