import {
  assistantMessage,
  userMessage,
  type ChatMessage
} from './chat-message.js';

type DeltaHandler = (delta: string) => void | Promise<void>;

export interface ChatClient {
  chatMessages(messages: ChatMessage[]): Promise<string>;
  streamChatMessages(
    messages: ChatMessage[],
    onDelta: DeltaHandler
  ): Promise<string>;
}

// @anchor:chat-session
export class OpenAiChatSession {
  private readonly history: ChatMessage[] = [];

  constructor(private readonly client: ChatClient) {}

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
