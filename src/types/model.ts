import type { ConversationContext, Message } from './message';

// Model provider interface - reserved for future multi-model support
export interface ModelProvider {
  readonly id: string;
  readonly name: string;

  chat(
    context: ConversationContext,
    options?: ChatOptions
  ): Promise<AsyncIterable<ChatResponseChunk>>;

  isAvailable(): Promise<boolean>;
}

// Chat options
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

// Streaming response chunk
export interface ChatResponseChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  error?: Error;
  usage?: TokenUsage;
}

// Token usage statistics
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}
