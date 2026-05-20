import test from 'node:test';
import assert from 'node:assert/strict';
import type { LanguageModel } from 'ai';
import { OpenAiChatClient } from './chat-client.js';
import { userMessage } from './chat-message.js';

test('streamChatMessages waits for asynchronous delta handlers', async () => {
  const model = createStreamingModel([
    { type: 'stream-start', warnings: [] },
    { type: 'text-start', id: 'txt-0' },
    { type: 'text-delta', id: 'txt-0', delta: 'SSE ' },
    { type: 'text-delta', id: 'txt-0', delta: '会持续推送数据' },
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
  ]);
  const client = new OpenAiChatClient(model);
  const events: string[] = [];

  const reply = await client.streamChatMessages(
    [userMessage('介绍一下 SSE')],
    async (delta) => {
      events.push(`start:${delta}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      events.push(`finish:${delta}`);
    }
  );

  assert.equal(reply, 'SSE 会持续推送数据');
  assert.deepEqual(events, [
    'start:SSE ',
    'finish:SSE ',
    'start:会持续推送数据',
    'finish:会持续推送数据'
  ]);
});

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
