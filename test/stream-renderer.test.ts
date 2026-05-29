import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { StreamRenderer } from '../src/renderer/stream-renderer';
import type { ChatResponseChunk } from '../src/types';

describe('StreamRenderer', () => {
  it('should render stream and accumulate buffer', async () => {
    const renderer = new StreamRenderer();

    async function* testStream(): AsyncIterable<ChatResponseChunk> {
      yield { type: 'content', content: 'Hello' };
      yield { type: 'content', content: ' ' };
      yield { type: 'content', content: 'World' };
      yield { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const result = await renderer.renderStream(testStream());
    assert.strictEqual(result, 'Hello World');
    assert.strictEqual(renderer.getBuffer(), 'Hello World');
  });

  it('should clear buffer', async () => {
    const renderer = new StreamRenderer();

    async function* testStream(): AsyncIterable<ChatResponseChunk> {
      yield { type: 'content', content: 'Test' };
      yield { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } };
    }

    await renderer.renderStream(testStream());
    assert.strictEqual(renderer.getBuffer(), 'Test');

    renderer.clearBuffer();
    assert.strictEqual(renderer.getBuffer(), '');
  });

  it('should throw error when stream yields error chunk', async () => {
    const renderer = new StreamRenderer();
    const testError = new Error('Test error');

    async function* testStream(): AsyncIterable<ChatResponseChunk> {
      yield { type: 'content', content: 'Hello' };
      yield { type: 'error', error: testError };
    }

    await assert.rejects(async () => {
      await renderer.renderStream(testStream());
    }, /Test error/);
  });
});
