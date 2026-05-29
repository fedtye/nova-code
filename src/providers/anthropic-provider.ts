import type {
  ModelProvider,
  ConversationContext,
  ChatOptions,
  ChatResponseChunk,
  TokenUsage,
  Message,
  ErrorCode
} from '../types';
import { NovaError, ERROR_MESSAGES } from '../types';

export class AnthropicProvider implements ModelProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';

  private apiKey: string;
  private apiBaseUrl: string;
  private modelName: string;
  private defaultTimeoutMs: number;
  private availableCache?: boolean;

  constructor(options: {
    apiKey: string;
    apiBaseUrl?: string;
    modelName?: string;
    defaultTimeoutMs?: number;
  }) {
    this.apiKey = options.apiKey;
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.anthropic.com';
    this.modelName = options.modelName || 'claude-3-5-sonnet-20241022';
    this.defaultTimeoutMs = options.defaultTimeoutMs || 120000;
  }

  async isAvailable(): Promise<boolean> {
    if (this.availableCache !== undefined) {
      return this.availableCache;
    }
    this.availableCache = !!this.apiKey;
    return this.availableCache;
  }

  async chat(
    context: ConversationContext,
    options?: ChatOptions
  ): Promise<AsyncIterable<ChatResponseChunk>> {
    if (!this.apiKey) {
      throw new NovaError({
        code: 'API_KEY_MISSING',
        ...ERROR_MESSAGES.API_KEY_MISSING,
        recoverable: true
      });
    }

    const messages = this.convertMessages(context);

    return this.createStream(messages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      timeoutMs: options?.timeoutMs || this.defaultTimeoutMs
    });
  }

  private convertMessages(context: ConversationContext): Array<{
    role: 'user' | 'assistant';
    content: string;
  }> {
    return context.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
  }

  private async *createStream(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      timeoutMs: number;
    }
  ): AsyncIterable<ChatResponseChunk> {
    const requestBody = {
      model: this.modelName,
      messages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature ?? 0.7,
      stream: true
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        clearTimeout(timeoutId);
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new NovaError({
          code: 'MODEL_INVALID_RESPONSE',
          ...ERROR_MESSAGES.MODEL_INVALID_RESPONSE
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let usage: TokenUsage | undefined = { inputTokens: 0, outputTokens: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              if (event.type === 'content_block_delta') {
                const content = event.delta?.text || '';
                if (content) {
                  yield { type: 'content', content };
                }
              } else if (event.type === 'message_delta') {
                usage = {
                  inputTokens: event.usage?.input_tokens || 0,
                  outputTokens: event.usage?.output_tokens || 0
                };
              } else if (event.type === 'message_stop') {
                yield {
                  type: 'done',
                  usage: usage || { inputTokens: 0, outputTokens: 0 }
                };
              } else if (event.type === 'error') {
                throw this.mapAnthropicError(event.error);
              }
            } catch (e) {
              if (e instanceof NovaError) {
                throw e;
              } else {
                throw new NovaError({
                  code: 'MODEL_INVALID_RESPONSE',
                  ...ERROR_MESSAGES.MODEL_INVALID_RESPONSE,
                  cause: e instanceof Error ? e : undefined
                });
              }
            }
          }
        }
      }

      clearTimeout(timeoutId);
    } catch (e) {
      clearTimeout(timeoutId);

      if (e instanceof NovaError) {
        yield { type: 'error', error: e };
        return;
      }

      if (e instanceof Error && e.name === 'AbortError') {
        yield {
          type: 'error',
          error: new NovaError({
            code: 'MODEL_TIMEOUT',
            ...ERROR_MESSAGES.MODEL_TIMEOUT
          })
        };
        return;
      }

      yield {
        type: 'error',
        error: new NovaError({
          code: 'UNKNOWN_ERROR',
          ...ERROR_MESSAGES.UNKNOWN_ERROR,
          cause: e instanceof Error ? e : undefined
        })
      };
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = {};
    }

    throw this.mapAnthropicError(errorData.error || {}, response.status);
  }

  private mapAnthropicError(
    anthropicError: { type?: string; message?: string },
    status?: number
  ): NovaError {
    const type = anthropicError.type || '';
    const message = anthropicError.message || 'Unknown error';

    let code: ErrorCode = 'UNKNOWN_ERROR';
    let recoverable = true;

    if (status === 401 || type.includes('authentication')) {
      code = 'API_KEY_INVALID';
    } else if (status === 429) {
      code = type.includes('token') ? 'MODEL_QUOTA_EXCEEDED' : 'MODEL_RATE_LIMITED';
      recoverable = true;
    } else if (status === 500 || status === 503) {
      code = 'MODEL_UNAVAILABLE';
    } else if (type.includes('invalid_request') && message.includes('prompt')) {
      code = 'INPUT_TOO_LONG';
    }

    const msgConfig = ERROR_MESSAGES[code];

    return new NovaError({
      code,
      message: msgConfig.message,
      suggestion: msgConfig.suggestion,
      recoverable
    });
  }

  private async makeRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: { maxTokens: number }
  ): Promise<any> {
    const requestBody = {
      model: this.modelName,
      messages,
      max_tokens: options.maxTokens,
      stream: false
    };

    const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }
}
