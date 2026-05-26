import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentErrorCode } from '../errors/index.js';
import { loadConfig } from './open-ai-config.js';

test('loadConfig returns trimmed required OpenAI-compatible settings', () => {
  withEnv(
    {
      OPENAI_BASE_URL: ' https://api.example.com/v1 ',
      OPENAI_API_KEY: ' test-key ',
      OPENAI_MODEL: ' gpt-test '
    },
    () => {
      assert.deepEqual(loadConfig(), {
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'test-key',
        model: 'gpt-test'
      });
    }
  );
});

test('loadConfig throws a structured config error for missing values', () => {
  withEnv(
    {
      OPENAI_BASE_URL: '',
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-test'
    },
    () => {
      assert.throws(
        () => loadConfig(),
        (error) =>
          error instanceof Error &&
          'code' in error &&
          error.code === AgentErrorCode.ConfigError &&
          'retryable' in error &&
          error.retryable === false
      );
    }
  );
});

function withEnv(
  values: Record<string, string | undefined>,
  callback: () => void
): void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
