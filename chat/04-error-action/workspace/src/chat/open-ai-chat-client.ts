// @anchor:chat-client
import { generateText, streamText } from 'ai';
import type { LanguageModel } from 'ai';
import { AgentException } from '../errors/index.js';
import { userMessage, type ChatMessage } from '../messages/chat-message.js';
import type { DeltaHandler } from './types.js';

export class OpenAiChatClient {
  constructor(private readonly model: LanguageModel) {
    if (!model) {
      throw AgentException.invalidArgument('model must not be null');
    }
  }

  async chat(userPrompt: string): Promise<string> {
    return this.chatMessages([userMessage(userPrompt)]);
  }

  async streamChat(
    userPrompt: string,
    onDelta: DeltaHandler
  ): Promise<string> {
    return this.streamChatMessages([userMessage(userPrompt)], onDelta);
  }

  async chatMessages(messages: ChatMessage[]): Promise<string> {
    if (messages.length === 0) {
      throw AgentException.invalidArgument('messages must not be empty');
    }

    const result = await generateText({
      model: this.model,
      messages
    });

    const reply = result.text.trim();
    if (!reply) {
      throw AgentException.invalidState(
        'AI response did not contain assistant content'
      );
    }

    return reply;
  }

  async streamChatMessages(
    messages: ChatMessage[],
    onDelta: DeltaHandler
  ): Promise<string> {
    if (messages.length === 0) {
      throw AgentException.invalidArgument('messages must not be empty');
    }
    if (typeof onDelta !== 'function') {
      throw AgentException.invalidArgument('onDelta must be a function');
    }

    const result = streamText({
      model: this.model,
      messages
    });

    let reply = '';
    for await (const delta of result.textStream) {
      if (!delta) continue;
      await onDelta(delta);
      reply += delta;
    }

    const normalizedReply = reply.trim();
    if (!normalizedReply) {
      throw AgentException.streamError(
        'AI stream did not contain assistant content'
      );
    }

    return normalizedReply;
  }
}
