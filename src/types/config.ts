// Model configuration
export interface ModelConfig {
  provider: string;
  apiKey?: string;
  apiBaseUrl?: string;
  modelName?: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

// CLI configuration
export interface CliConfig {
  version: string;
  model: ModelConfig;
  _meta?: ConfigMeta;
}

// Configuration metadata
export interface ConfigMeta {
  createdAt: number;
  updatedAt: number;
}
