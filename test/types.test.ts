import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { NovaError, ERROR_MESSAGES, ErrorCode } from '../src/types';

describe('types', () => {
  describe('NovaError', () => {
    it('should create an error with code and message', () => {
      const error = new NovaError({
        code: 'API_KEY_MISSING',
        message: 'Test message',
        suggestion: 'Test suggestion'
      });

      assert.strictEqual(error.name, 'NovaError');
      assert.strictEqual(error.code, 'API_KEY_MISSING');
      assert.strictEqual(error.message, 'Test message');
      assert.strictEqual(error.suggestion, 'Test suggestion');
      assert.strictEqual(error.level, 'error');
      assert.strictEqual(error.recoverable, true);
    });

    it('should use default values for optional fields', () => {
      const error = new NovaError({
        code: 'UNKNOWN_ERROR',
        message: 'Test message'
      });

      assert.strictEqual(error.level, 'error');
      assert.strictEqual(error.recoverable, true);
      assert.strictEqual(error.suggestion, undefined);
      assert.strictEqual(error.cause, undefined);
    });

    it('should accept custom values for all fields', () => {
      const cause = new Error('Original cause');
      const error = new NovaError({
        code: 'MODEL_TIMEOUT',
        message: 'Test timeout',
        level: 'warning',
        recoverable: false,
        suggestion: 'Try again later',
        cause
      });

      assert.strictEqual(error.level, 'warning');
      assert.strictEqual(error.recoverable, false);
      assert.strictEqual(error.suggestion, 'Try again later');
      assert.strictEqual(error.cause, cause);
    });

    it('should pass cause property correctly', () => {
      const originalError = new Error('Underlying issue');
      const error = new NovaError({
        code: 'UNKNOWN_ERROR',
        message: 'Wrapped error',
        cause: originalError
      });

      assert.strictEqual(error.cause, originalError);
      assert.ok(error.cause instanceof Error);
      assert.strictEqual(error.cause?.message, 'Underlying issue');
    });

    it('should handle nested causes', () => {
      const level1 = new Error('Level 1');
      const level2 = new NovaError({
        code: 'CONFIG_INVALID',
        message: 'Level 2',
        cause: level1
      });
      const level3 = new NovaError({
        code: 'UNKNOWN_ERROR',
        message: 'Level 3',
        cause: level2
      });

      assert.strictEqual(level3.cause, level2);
      assert.strictEqual(level2.cause, level1);
      assert.strictEqual((level3.cause as NovaError).cause, level1);
    });

    it('should format user-friendly message', () => {
      const error = new NovaError({
        code: 'API_KEY_MISSING',
        message: 'API Key missing',
        suggestion: 'Run nova setup'
      });

      const userString = error.toUserString();
      assert.ok(userString.includes('API Key missing'));
      assert.ok(userString.includes('Run nova setup'));
    });

    it('should format message without suggestion', () => {
      const error = new NovaError({
        code: 'API_KEY_MISSING',
        message: 'API Key missing'
      });

      const userString = error.toUserString();
      assert.ok(userString.includes('API Key missing'));
      assert.ok(!userString.includes('💡 建议:'));
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      const codes: ErrorCode[] = [
        'CONFIG_NOT_FOUND',
        'CONFIG_INVALID',
        'API_KEY_MISSING',
        'API_KEY_INVALID',
        'MODEL_UNAVAILABLE',
        'MODEL_TIMEOUT',
        'MODEL_RATE_LIMITED',
        'MODEL_QUOTA_EXCEEDED',
        'MODEL_INVALID_RESPONSE',
        'INPUT_TOO_LONG',
        'INVALID_INPUT',
        'UNKNOWN_ERROR'
      ];

      for (const code of codes) {
        assert.ok(ERROR_MESSAGES[code], `Missing message for ${code}`);
        assert.ok(ERROR_MESSAGES[code].message, `Missing message text for ${code}`);
        assert.ok(ERROR_MESSAGES[code].suggestion, `Missing suggestion for ${code}`);
      }
    });
  });
});
