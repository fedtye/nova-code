import * as readline from 'readline';
import { ConfigManager } from '../core/config-manager';

export class Setup {
  private configManager: ConfigManager;
  private rl: readline.Interface;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<void> {
    console.log('⚙️  Nova Agent 配置向导\n');

    await this.configManager.ensureConfigDir();
    const config = await this.configManager.loadConfig();

    const apiKey = await this.question(
      `Anthropic API Key ${config.model.apiKey ? '(按回车保留当前值)' : ''}: `,
      config.model.apiKey
    );

    const modelName = await this.question(
      `模型名称 (默认: ${config.model.modelName}): `,
      config.model.modelName
    );

    const temperatureStr = await this.question(
      `Temperature (默认: ${config.model.temperature}): `,
      String(config.model.temperature)
    );
    const temperature = parseFloat(temperatureStr) || config.model.temperature;

    const maxTokensStr = await this.question(
      `Max Tokens (默认: ${config.model.maxTokens}): `,
      String(config.model.maxTokens)
    );
    const maxTokens = parseInt(maxTokensStr, 10) || config.model.maxTokens;

    const timeoutMsStr = await this.question(
      `超时时间 (毫秒，默认: ${config.model.timeoutMs}): `,
      String(config.model.timeoutMs)
    );
    const timeoutMs = parseInt(timeoutMsStr, 10) || config.model.timeoutMs;

    await this.configManager.updateModelConfig({
      apiKey: apiKey || undefined,
      modelName: modelName || undefined,
      temperature,
      maxTokens,
      timeoutMs
    });

    console.log(`\n✅ 配置已保存到: ${this.configManager.getConfigPath()}`);
    this.rl.close();
  }

  private question(prompt: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue || '');
      });
    });
  }
}
