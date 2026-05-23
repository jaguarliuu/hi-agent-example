import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentErrorCode } from '../errors/index.js';
import type { ChatMessage } from '../messages/chat-message.js';
import { OpenAiChatSession } from './open-ai-chat-session.js';

test('constructor rejects a missing client with INVALID_ARGUMENT', () => {
  assert.throws(
    () => new OpenAiChatSession(null as never),
    (error) =>
      error instanceof Error &&
      'code' in error &&
      error.code === AgentErrorCode.InvalidArgument
  );
});

test('sendStreaming emits deltas and stores the complete assistant reply', async () => {
  const deltas: string[] = [];
  const fakeClient = {
    async chatMessages(): Promise<string> {
      throw new Error('chatMessages should not be called');
    },
    async streamChatMessages(
      messages: ChatMessage[],
      onDelta: (delta: string) => void | Promise<void>
    ): Promise<string> {
      assert.equal(messages.at(-1)?.content, '介绍一下 SSE');
      await onDelta('SSE ');
      await onDelta('会持续推送数据');
      return 'SSE 会持续推送数据';
    }
  };
  const session = new OpenAiChatSession(fakeClient);

  const reply = await session.sendStreaming('介绍一下 SSE', (delta) => {
    deltas.push(delta);
  });

  assert.equal(reply, 'SSE 会持续推送数据');
  assert.deepEqual(deltas, ['SSE ', '会持续推送数据']);
  assert.deepEqual(session.getHistory(), [
    { role: 'user', content: '介绍一下 SSE' },
    { role: 'assistant', content: 'SSE 会持续推送数据' }
  ]);
});

test('sendStreaming keeps history unchanged when the stream fails', async () => {
  const fakeClient = {
    async chatMessages(): Promise<string> {
      throw new Error('chatMessages should not be called');
    },
    async streamChatMessages(
      _messages: ChatMessage[],
      onDelta: (delta: string) => void | Promise<void>
    ): Promise<string> {
      await onDelta('已经打印到终端的半截内容');
      throw new Error('stream disconnected');
    }
  };
  const session = new OpenAiChatSession(fakeClient);

  await assert.rejects(
    () => session.sendStreaming('写一个长回答', () => undefined),
    /stream disconnected/
  );
  assert.deepEqual(session.getHistory(), []);
});
