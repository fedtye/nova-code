import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ModelGateway } from '../src/core/model-gateway';
import type { ModelProvider, ConversationContext, ChatOptions, ChatResponseChunk } from '../src/types';

// 创建一个 mock provider 用于测试
class MockProvider implements ModelProvider {
  readonly id: string;
  readonly name: string;
  private available: boolean;
  private responses: ChatResponseChunk[];

  constructor(id: string, name: string, available = true, responses?: ChatResponseChunk[]) {
    this.id = id;
    this.name = name;
    this.available = available;
    this.responses = responses || [
      { type: 'content', content: `Response from ${name}` },
      { type: 'done', usage: { inputTokens: 5, outputTokens: 10 } }
    ];
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async chat(
    context: ConversationContext,
    options?: ChatOptions
  ): Promise<AsyncIterable<ChatResponseChunk>> {
    const responses = this.responses;
    async function* generate(): AsyncIterable<ChatResponseChunk> {
      for (const response of responses) {
        yield response;
      }
    }
    return generate();
  }
}

describe('ModelGateway', () => {
  it('should create gateway with default provider', () => {
    const provider = new MockProvider('test', 'Test Provider');
    const gateway = new ModelGateway(provider);

    assert.deepStrictEqual(gateway.getAvailableProviders(), ['test']);
  });

  it('should register additional providers', () => {
    const provider1 = new MockProvider('provider1', 'Provider 1');
    const provider2 = new MockProvider('provider2', 'Provider 2');

    const gateway = new ModelGateway(provider1);
    gateway.registerProvider(provider2);

    assert.deepStrictEqual(gateway.getAvailableProviders().sort(), ['provider1', 'provider2']);
  });

  it('should set and use default provider', async () => {
    const provider1 = new MockProvider('provider1', 'Provider 1');
    const provider2 = new MockProvider('provider2', 'Provider 2');

    const gateway = new ModelGateway(provider1);
    gateway.registerProvider(provider2);

    // 默认应该是 provider1
    await assert.doesNotReject(async () => {
      await gateway.chat({ messages: [], maxMessages: 10 });
    });

    // 切换默认 provider
    gateway.setDefaultProvider('provider2');
    await assert.doesNotReject(async () => {
      await gateway.chat({ messages: [], maxMessages: 10 });
    });
  });

  it('should throw error when setting non-existent provider as default', () => {
    const provider = new MockProvider('test', 'Test Provider');
    const gateway = new ModelGateway(provider);

    assert.throws(
      () => gateway.setDefaultProvider('nonexistent'),
      /Provider nonexistent not registered/
    );
  });

  it('should use specified provider when provided', async () => {
    const responses1: ChatResponseChunk[] = [
      { type: 'content', content: 'From provider 1' },
      { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } }
    ];
    const responses2: ChatResponseChunk[] = [
      { type: 'content', content: 'From provider 2' },
      { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } }
    ];

    const provider1 = new MockProvider('provider1', 'Provider 1', true, responses1);
    const provider2 = new MockProvider('provider2', 'Provider 2', true, responses2);

    const gateway = new ModelGateway(provider1);
    gateway.registerProvider(provider2);

    // 使用 provider2
    const stream = await gateway.chat(
      { messages: [], maxMessages: 10 },
      undefined,
      'provider2'
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    assert.strictEqual(chunks[0].content, 'From provider 2');
  });

  it('should throw error when specified provider not found', async () => {
    const provider = new MockProvider('test', 'Test Provider');
    const gateway = new ModelGateway(provider);

    await assert.rejects(
      async () => gateway.chat(
        { messages: [], maxMessages: 10 },
        undefined,
        'nonexistent'
      ),
      /Provider nonexistent not found/
    );
  });

  it('should throw error when provider is not available', async () => {
    const provider = new MockProvider('unavailable', 'Unavailable Provider', false);
    const gateway = new ModelGateway(provider);

    await assert.rejects(
      async () => gateway.chat({ messages: [], maxMessages: 10 }),
      /Provider unavailable is not available/
    );
  });

  it('should return all registered providers', () => {
    const provider1 = new MockProvider('p1', 'Provider 1');
    const provider2 = new MockProvider('p2', 'Provider 2');
    const provider3 = new MockProvider('p3', 'Provider 3');

    const gateway = new ModelGateway(provider1);
    gateway.registerProvider(provider2);
    gateway.registerProvider(provider3);

    const providers = gateway.getAvailableProviders();
    assert.strictEqual(providers.length, 3);
    assert.ok(providers.includes('p1'));
    assert.ok(providers.includes('p2'));
    assert.ok(providers.includes('p3'));
  });
});
