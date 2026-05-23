// @anchor:chat-session
import { AgentException } from '../errors/index.js';
import {
  assistantMessage,
  userMessage,
  type ChatMessage
} from '../messages/chat-message.js';
import type { ChatClient, DeltaHandler } from './types.js';

export class OpenAiChatSession {
  private readonly history: ChatMessage[] = [];
  private readonly client: ChatClient;

  constructor(client: ChatClient) {
    if (!client) {
      throw AgentException.invalidArgument('client must not be null');
    }
    this.client = client;
  }

  async send(userInput: string): Promise<string> {
    const currentUserMessage = userMessage(userInput);
    const requestMessages = [...this.history, currentUserMessage];

    const reply = await this.client.chatMessages(requestMessages);
    this.history.push(currentUserMessage, assistantMessage(reply));

    return reply;
  }

  async sendStreaming(
    userInput: string,
    onDelta: DeltaHandler
  ): Promise<string> {
    const currentUserMessage = userMessage(userInput);
    const requestMessages = [...this.history, currentUserMessage];

    const reply = await this.client.streamChatMessages(requestMessages, onDelta);
    this.history.push(currentUserMessage, assistantMessage(reply));

    return reply;
  }

  getHistory(): readonly ChatMessage[] {
    return [...this.history];
  }
}
