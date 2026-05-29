import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { CliParser } from '../src/cli/parser';

describe('CliParser', () => {
  it('should parse repl command when no args', () => {
    const parser = new CliParser([]);
    const command = parser.parse();
    assert.strictEqual(command.type, 'repl');
  });

  it('should parse setup command', () => {
    const parser = new CliParser(['setup']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'setup');
  });

  it('should parse doctor command', () => {
    const parser = new CliParser(['doctor']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'doctor');
  });

  it('should parse version command with -v', () => {
    const parser = new CliParser(['-v']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'version');
  });

  it('should parse version command with --version', () => {
    const parser = new CliParser(['--version']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'version');
  });

  it('should parse help command with -h', () => {
    const parser = new CliParser(['-h']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'help');
  });

  it('should parse help command with --help', () => {
    const parser = new CliParser(['--help']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'help');
  });

  it('should parse query command with -q', () => {
    const parser = new CliParser(['-q', 'hello world']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'query');
    assert.strictEqual(command.payload?.query, 'hello world');
  });

  it('should parse query command with --query', () => {
    const parser = new CliParser(['--query', 'test query']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'query');
    assert.strictEqual(command.payload?.query, 'test query');
  });

  it('should throw error when query is missing', () => {
    const parser = new CliParser(['-q']);
    assert.throws(() => parser.parse(), /Query argument is required/);
  });

  it('should default to help for unknown commands', () => {
    const parser = new CliParser(['unknown']);
    const command = parser.parse();
    assert.strictEqual(command.type, 'help');
  });
});
