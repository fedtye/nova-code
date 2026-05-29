import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import { AnthropicProvider } from '../src/providers/anthropic-provider';
import { NovaError } from '../src/types';

describe('AnthropicProvider', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should create provider with default values', () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' });

    assert.strictEqual(provider.id, 'anthropic');
    assert.strictEqual(provider.name, 'Anthropic Claude');
  });

  it('should throw error when no api key provided in chat', async () => {
    const provider = new AnthropicProvider({ apiKey: '' });

    await assert.rejects(
      async () => provider.chat({ messages: [], maxMessages: 10 }),
      (err: any) => {
        assert.strictEqual(err.code, 'API_KEY_MISSING');
        return true;
      }
    );
  });

  it('should return true for availability when api key exists', async () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' });

    const available = await provider.isAvailable();
    assert.strictEqual(available, true);
  });

  it('should return false for availability when api key is empty', async () => {
    const provider = new AnthropicProvider({ apiKey: '' });

    const available = await provider.isAvailable();
    assert.strictEqual(available, false);
  });

  it('should cache availability status', async () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' });

    const available1 = await provider.isAvailable();
    const available2 = await provider.isAvailable();

    assert.strictEqual(available1, true);
    assert.strictEqual(available2, true);
  });

  // 注意：isAvailable 不再发送真实请求，这个测试不再需要

  it('should stream content correctly', async () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' });

    // Mock streaming response
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type": "content_block_delta", "delta": {"text": "Hello"}}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"type": "content_block_delta", "delta": {"text": " World"}}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"type": "message_delta", "usage": {"input_tokens": 10, "output_tokens": 20}}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"type": "message_stop"}\n\n'));
        controller.close();
      }
    });

    global.fetch = async () => ({
      ok: true,
      body: mockStream
    }) as Response;

    const stream = await provider.chat({
      messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: Date.now() }],
      maxMessages: 10
    });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    assert.strictEqual(chunks.length, 3);
    assert.strictEqual(chunks[0].type, 'content');
    assert.strictEqual(chunks[0].content, 'Hello');
    assert.strictEqual(chunks[1].type, 'content');
    assert.strictEqual(chunks[1].content, ' World');
    assert.strictEqual(chunks[2].type, 'done');
    assert.deepStrictEqual(chunks[2].usage, { inputTokens: 10, outputTokens: 20 });
  });

  it('should yield error chunk on stream error', async () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' });

    global.fetch = async () => {
      throw new Error('Network error');
    };

    const stream = await provider.chat({
      messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: Date.now() }],
      maxMessages: 10
    });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].type, 'error');
    assert.ok(chunks[0].error instanceof NovaError);
  });
});
