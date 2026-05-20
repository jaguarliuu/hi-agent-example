import { generateText, streamText } from 'ai';
import type { LanguageModel } from 'ai';
import { userMessage, type ChatMessage } from './chat-message.js';

type DeltaHandler = (delta: string) => void | Promise<void>;

// @anchor:chat-client
export class OpenAiChatClient {
  constructor(private readonly model: LanguageModel) {}

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
      throw new Error('messages must not be empty');
    }

    const result = await generateText({
      model: this.model,
      messages
    });

    const reply = result.text.trim();
    if (!reply) {
      throw new Error('AI response did not contain assistant content');
    }

    return reply;
  }

  async streamChatMessages(
    messages: ChatMessage[],
    onDelta: DeltaHandler
  ): Promise<string> {
    if (messages.length === 0) {
      throw new Error('messages must not be empty');
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
      throw new Error('AI response did not contain assistant content');
    }

    return normalizedReply;
  }
}
