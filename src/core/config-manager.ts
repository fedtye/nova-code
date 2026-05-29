import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CliConfig, ModelConfig } from '../types';
import { NovaError, ERROR_MESSAGES } from '../types';

const DEFAULT_CONFIG: CliConfig = {
  version: '0.1.0',
  model: {
    provider: 'anthropic',
    apiKey: undefined,
    apiBaseUrl: 'https://api.anthropic.com',
    modelName: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 120000
  },
  _meta: {
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private cachedConfig: CliConfig | null = null;

  constructor() {
    this.configDir = path.join(os.homedir(), '.nova');
    this.configPath = path.join(this.configDir, 'config.json');
  }

  async ensureConfigDir(): Promise<void> {
    if (!fs.existsSync(this.configDir)) {
      await fs.promises.mkdir(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  async loadConfig(): Promise<CliConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    await this.ensureConfigDir();

    if (!fs.existsSync(this.configPath)) {
      await this.saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }

    try {
      const content = await fs.promises.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(content);
      this.cachedConfig = this.mergeWithDefaults(config);
      return this.cachedConfig;
    } catch {
      throw new NovaError({
        code: 'CONFIG_INVALID',
        ...ERROR_MESSAGES.CONFIG_INVALID
      });
    }
  }

  async saveConfig(config: CliConfig): Promise<void> {
    await this.ensureConfigDir();
    const now = Date.now();
    config._meta = {
      createdAt: config._meta?.createdAt || now,
      updatedAt: now
    };
    await fs.promises.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2),
      { mode: 0o600 }
    );
    this.cachedConfig = config;
  }

  async updateModelConfig(updates: Partial<ModelConfig>): Promise<CliConfig> {
    const config = await this.loadConfig();
    config.model = { ...config.model, ...updates };
    await this.saveConfig(config);
    return config;
  }

  async getApiKey(): Promise<string | undefined> {
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
    await this.loadConfig();
    return this.cachedConfig?.model.apiKey;
  }

  async isConfigured(): Promise<boolean> {
    return fs.existsSync(this.configPath);
  }

  getConfigPath(): string {
    return this.configPath;
  }

  getConfigDir(): string {
    return this.configDir;
  }

  private mergeWithDefaults(config: Partial<CliConfig>): CliConfig {
    return {
      version: config.version ?? DEFAULT_CONFIG.version,
      model: {
        ...DEFAULT_CONFIG.model,
        ...config.model
      },
      _meta: config._meta
    };
  }
}
