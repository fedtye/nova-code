// Message role
export type Role = 'user' | 'assistant' | 'system';

// Single message
export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

// Conversation context
export interface ConversationContext {
  messages: Message[];
  maxMessages: number;
  systemPrompt?: string;
}
