import type { ChatMessage } from '../messages/chat-message.js';

export type DeltaHandler = (delta: string) => void | Promise<void>;

export interface ChatClient {
  chatMessages(messages: ChatMessage[]): Promise<string>;
  streamChatMessages(
    messages: ChatMessage[],
    onDelta: DeltaHandler
  ): Promise<string>;
}
