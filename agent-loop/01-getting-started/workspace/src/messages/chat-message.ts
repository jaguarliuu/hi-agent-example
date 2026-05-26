import { AgentException } from '../errors/index.js';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export function userMessage(content: string): ChatMessage {
  return createMessage('user', content);
}

export function assistantMessage(content: string): ChatMessage {
  return createMessage('assistant', content);
}

function createMessage(role: ChatRole, content: string): ChatMessage {
  const normalized = content.trim();
  if (!normalized) {
    throw AgentException.invalidArgument(`${role} message content must not be empty`);
  }
  return { role, content: normalized };
}
