import { ConfigManager } from '../core/config-manager';

export class Doctor {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async run(): Promise<boolean> {
    console.log('🏥 Nova Agent 环境自检\n');

    let allOk = true;

    const nodeOk = this.checkNodeVersion();
    allOk = allOk && nodeOk;

    const configOk = await this.checkConfig();
    allOk = allOk && configOk;

    console.log(`\n${allOk ? '✅ 所有检查通过！' : '❌ 部分检查失败'}`);
    return allOk;
  }

  private checkNodeVersion(): boolean {
    const version = process.versions.node;
    const [major] = version.split('.').map(Number);
    const ok = major >= 18;
    console.log(`${ok ? '✅' : '❌'} Node.js: v${version} (需要 >= 18)`);
    return ok;
  }

  private async checkConfig(): Promise<boolean> {
    const configured = await this.configManager.isConfigured();
    const path = this.configManager.getConfigPath();
    const hasApiKey = !!(process.env.ANTHROPIC_API_KEY ||
      (await this.configManager.loadConfig()).model.apiKey);

    if (configured && hasApiKey) {
      console.log(`✅ 配置文件: ${path}`);
      return true;
    } else if (configured && !hasApiKey) {
      console.log(`⚠️  配置文件存在但 API Key 未设置: ${path}`);
      console.log(`   请运行 \`nova setup\` 或设置环境变量 ANTHROPIC_API_KEY`);
      return false;
    } else {
      console.log(`⚠️  配置文件: 未初始化，运行 \`nova setup\``);
      return false;
    }
  }
}
