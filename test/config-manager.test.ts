import { describe, it, before, after, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../src/core/config-manager';
import type { CliConfig } from '../src/types';

describe('ConfigManager', () => {
  let tempDir: string;
  let originalHomedir: string;
  let originalOsHomedir: typeof os.homedir;

  // Mock home directory
  before(() => {
    originalHomedir = os.homedir();
    originalOsHomedir = os.homedir;
    tempDir = path.join(os.tmpdir(), 'nova-test-config-' + Date.now());
  });

  after(() => {
    // Restore original homedir
    (os as any).homedir = originalOsHomedir;
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Reset temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    // mock homedir
    (os as any).homedir = () => tempDir;
  });

  // Create a new ConfigManager instance (must be created after mock)
  function createConfigManager(): ConfigManager {
    return new ConfigManager();
  }

  it('should have correct method signatures', () => {
    const configManager = createConfigManager();
    assert.ok(typeof configManager.ensureConfigDir === 'function');
    assert.ok(typeof configManager.loadConfig === 'function');
    assert.ok(typeof configManager.saveConfig === 'function');
    assert.ok(typeof configManager.updateModelConfig === 'function');
    assert.ok(typeof configManager.getApiKey === 'function');
    assert.ok(typeof configManager.isConfigured === 'function');
    assert.ok(typeof configManager.getConfigPath === 'function');
    assert.ok(typeof configManager.getConfigDir === 'function');
  });

  // Note: This test requires mocking homedir before constructor, we don't test specific paths here

  it('should load existing config file', async () => {
    const configManager = createConfigManager();
    const configPath = configManager.getConfigPath();

    // Pre-create config file
    const testConfig: CliConfig = {
      version: '0.2.0',
      model: {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        apiBaseUrl: 'https://test.example.com',
        modelName: 'claude-test',
        temperature: 0.5,
        maxTokens: 1000,
        timeoutMs: 60000
      }
    };

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(testConfig));

    const config = await configManager.loadConfig();

    assert.strictEqual(config.version, '0.2.0');
    assert.strictEqual(config.model.apiKey, 'test-api-key');
    assert.strictEqual(config.model.apiBaseUrl, 'https://test.example.com');
  });

  it('should merge partial config with defaults', async () => {
    const configManager = createConfigManager();
    const configPath = configManager.getConfigPath();

    // Create incomplete config
    const partialConfig = {
      version: '0.2.0',
      model: {
        apiKey: 'test-key'
      }
    };

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(partialConfig));

    const config = await configManager.loadConfig();

    assert.strictEqual(config.version, '0.2.0');
    assert.strictEqual(config.model.apiKey, 'test-key');
    assert.strictEqual(config.model.provider, 'anthropic'); // from default
    assert.strictEqual(config.model.temperature, 0.7); // from default
  });

  it('should throw error for invalid config file', async () => {
    const configManager = createConfigManager();
    const configPath = configManager.getConfigPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, 'invalid json {{{');

    await assert.rejects(
      async () => configManager.loadConfig(),
      (err: any) => {
        assert.strictEqual(err.code, 'CONFIG_INVALID');
        return true;
      }
    );
  });

  it('should save config with correct metadata', async () => {
    const configManager = createConfigManager();
    const beforeTime = Date.now();

    const testConfig: CliConfig = {
      version: '0.1.0',
      model: {
        provider: 'anthropic',
        temperature: 0.7,
        maxTokens: 2048,
        timeoutMs: 120000
      }
    };

    await configManager.saveConfig(testConfig);
    const afterTime = Date.now();

    const savedContent = fs.readFileSync(configManager.getConfigPath(), 'utf-8');
    const savedConfig = JSON.parse(savedContent);

    assert.ok(savedConfig._meta);
    assert.ok(savedConfig._meta.createdAt >= beforeTime);
    assert.ok(savedConfig._meta.createdAt <= afterTime);
    assert.ok(savedConfig._meta.updatedAt >= beforeTime);
    assert.ok(savedConfig._meta.updatedAt <= afterTime);
  });

  it('should update model config correctly', async () => {
    const configManager = createConfigManager();

    // Load default config first
    await configManager.loadConfig();

    // Update partial config
    const updatedConfig = await configManager.updateModelConfig({
      apiKey: 'new-api-key',
      temperature: 0.9
    });

    assert.strictEqual(updatedConfig.model.apiKey, 'new-api-key');
    assert.strictEqual(updatedConfig.model.temperature, 0.9);
    // Other fields should remain unchanged
    assert.strictEqual(updatedConfig.model.maxTokens, 2048);
  });

  it('should get api key from environment variable first', async () => {
    const configManager = createConfigManager();

    // Set environment variable
    process.env.ANTHROPIC_API_KEY = 'env-api-key';

    // Load config first, set a different key
    await configManager.loadConfig();
    await configManager.updateModelConfig({ apiKey: 'config-api-key' });

    // Should return environment variable value first
    assert.strictEqual(await configManager.getApiKey(), 'env-api-key');

    // Clean up environment variable
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should get api key from config when no env var', async () => {
    const configManager = createConfigManager();

    // Don't set environment variable, only set config file
    await configManager.loadConfig();
    await configManager.updateModelConfig({ apiKey: 'config-api-key' });

    // Should return value from config file
    assert.strictEqual(await configManager.getApiKey(), 'config-api-key');
  });

  it('should cache config after first load', async () => {
    const configManager = createConfigManager();

    const config1 = await configManager.loadConfig();
    const config2 = await configManager.loadConfig();

    // Should be the same object (cached)
    assert.strictEqual(config1, config2);
  });
});
