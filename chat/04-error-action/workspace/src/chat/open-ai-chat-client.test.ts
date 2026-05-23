import test from 'node:test';
import assert from 'node:assert/strict';
import type { LanguageModel } from 'ai';
import { AgentErrorCode } from '../errors/index.js';
import { userMessage } from '../messages/chat-message.js';
import { OpenAiChatClient } from './open-ai-chat-client.js';

test('constructor rejects a missing model with INVALID_ARGUMENT', () => {
  assertAgentError(
    () => new OpenAiChatClient(null as never),
    AgentErrorCode.InvalidArgument,
    /model must not be null/
  );
});

test('chatMessages rejects empty messages with INVALID_ARGUMENT', async () => {
  const client = new OpenAiChatClient(createStreamingModel([]));

  await assert.rejects(
    () => client.chatMessages([]),
    (error) => isAgentError(error, AgentErrorCode.InvalidArgument)
  );
});

test('streamChatMessages rejects a non-function delta handler', async () => {
  const client = new OpenAiChatClient(createStreamingModel([]));

  await assert.rejects(
    () => client.streamChatMessages([userMessage('hello')], null as never),
    (error) => isAgentError(error, AgentErrorCode.InvalidArgument)
  );
});

test('streamChatMessages turns an empty stream into STREAM_ERROR', async () => {
  const client = new OpenAiChatClient(
    createStreamingModel([
      { type: 'stream-start', warnings: [] },
      { type: 'text-start', id: 'txt-0' },
      { type: 'text-end', id: 'txt-0' },
      {
        type: 'finish',
        finishReason: 'stop',
        usage: {
          inputTokens: 1,
          outputTokens: 0,
          totalTokens: 1
        }
      }
    ])
  );

  await assert.rejects(
    () => client.streamChatMessages([userMessage('hello')], () => undefined),
    (error) => isAgentError(error, AgentErrorCode.StreamError)
  );
});

test('streamChatMessages waits for delta handlers and returns the full reply', async () => {
  const client = new OpenAiChatClient(
    createStreamingModel([
      { type: 'stream-start', warnings: [] },
      { type: 'text-start', id: 'txt-0' },
      { type: 'text-delta', id: 'txt-0', delta: 'hello ' },
      { type: 'text-delta', id: 'txt-0', delta: 'world' },
      { type: 'text-end', id: 'txt-0' },
      {
        type: 'finish',
        finishReason: 'stop',
        usage: {
          inputTokens: 1,
          outputTokens: 2,
          totalTokens: 3
        }
      }
    ])
  );
  const events: string[] = [];

  const reply = await client.streamChatMessages(
    [userMessage('hello')],
    async (delta) => {
      events.push(`start:${delta}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`finish:${delta}`);
    }
  );

  assert.equal(reply, 'hello world');
  assert.deepEqual(events, [
    'start:hello ',
    'finish:hello ',
    'start:world',
    'finish:world'
  ]);
});

function assertAgentError(
  callback: () => unknown,
  code: AgentErrorCode,
  message: RegExp
) {
  assert.throws(
    callback,
    (error) =>
      isAgentError(error, code) &&
      error instanceof Error &&
      message.test(error.message)
  );
}

function isAgentError(error: unknown, code: AgentErrorCode): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === code &&
    'retryable' in error &&
    error.retryable === false
  );
}

function createStreamingModel(chunks: unknown[]): LanguageModel {
  return {
    specificationVersion: 'v2',
    provider: 'test',
    modelId: 'test-model',
    supportedUrls: {},
    async doGenerate() {
      throw new Error('doGenerate should not be called');
    },
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk as never);
          }
          controller.close();
        }
      }),
      request: {},
      response: { headers: {} }
    })
  } as LanguageModel;
}
