import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import type { ModelProvider, ConversationContext, ChatOptions, ChatResponseChunk, CliConfig } from '../src/types';

class MockModelProvider implements ModelProvider {
  readonly id = 'mock';
  readonly name = 'Mock Provider';
  async isAvailable(): Promise<boolean> { return true; }
  async *chat(
    context: ConversationContext,
    options?: ChatOptions
  ): AsyncIterable<ChatResponseChunk> {
    const lastMessage = context.messages[context.messages.length - 1];
    yield { type: 'content', content: `Echo: ${lastMessage?.content}` };
    yield { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

class MockRenderer {
  output: string = '';
  async renderStream(stream: AsyncIterable<ChatResponseChunk>): Promise<string> {
    let result = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content' && chunk.content) {
        result += chunk.content;
      }
    }
    this.output = result;
    return result;
  }
  getBuffer(): string { return this.output; }
  clearBuffer(): void { this.output = ''; }
}

describe('ReplEngine (basic types)', () => {
  it('should mock provider work', async () => {
    const provider = new MockModelProvider();
    const context: ConversationContext = {
      messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }],
      maxMessages: 10
    };

    let result = '';
    for await (const chunk of await provider.chat(context)) {
      if (chunk.type === 'content' && chunk.content) {
        result += chunk.content;
      }
    }
    assert.strictEqual(result, 'Echo: Hello');
  });

  it('should have valid CliConfig structure', () => {
    const config: CliConfig = {
      version: '0.1.0',
      model: {
        provider: 'anthropic',
        temperature: 0.7,
        maxTokens: 2048,
        timeoutMs: 120000
      }
    };
    assert.strictEqual(config.version, '0.1.0');
    assert.strictEqual(config.model.provider, 'anthropic');
  });
});
