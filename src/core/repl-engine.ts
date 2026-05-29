import * as readline from 'readline';
import type { ReplState, Message, ConversationContext, ModelProvider, ChatResponseChunk } from '../types';
import type { ModelGateway } from './model-gateway';
import type { StreamRenderer } from '../renderer/stream-renderer';
import type { CliConfig } from '../types';

export class ReplEngine {
  private state: ReplState = 'idle';
  private rl: readline.Interface | null = null;
  private context: ConversationContext;
  private modelGateway: ModelGateway;
  private renderer: StreamRenderer;
  private config: CliConfig;
  private shouldExit = false;

  constructor(options: {
    modelGateway: ModelGateway;
    renderer: StreamRenderer;
    config: CliConfig;
    maxHistoryMessages?: number;
  }) {
    this.modelGateway = options.modelGateway;
    this.renderer = options.renderer;
    this.config = options.config;
    this.context = {
      messages: [],
      maxMessages: options.maxHistoryMessages ?? 10
    };
  }

  async start(): Promise<void> {
    this.setupReadline();
    this.state = 'waiting_input';

    console.log('\n🤖 Nova Agent v0.1');
    console.log('输入 /help 查看可用命令，输入 /exit 退出\n');

    while (!this.shouldExit) {
      this.state = 'waiting_input';
      const input = await this.prompt('> ');

      if (input.trim()) {
        if (this.isSlashCommand(input)) {
          await this.handleSlashCommand(input);
        } else {
          await this.handleUserInput(input);
        }
      }
    }

    this.cleanup();
  }

  stop(): void {
    this.shouldExit = true;
  }

  private setupReadline(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl?.question(question, resolve);
    });
  }

  private isSlashCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  private async handleSlashCommand(input: string): Promise<void> {
    const cmd = input.trim().slice(1).toLowerCase();

    switch (cmd) {
      case 'exit':
      case 'quit':
        this.shouldExit = true;
        console.log('👋 再见！');
        break;
      case 'clear':
        this.context.messages = [];
        console.log('✅ 上下文已清空');
        break;
      case 'history':
        this.printHistory();
        break;
      case 'help':
        this.printReplHelp();
        break;
      case 'config':
        this.printConfig();
        break;
      default:
        console.log(`❌ 未知命令: /${cmd}`);
        console.log('输入 /help 查看可用命令');
    }
  }

  private async handleUserInput(content: string): Promise<void> {
    const userMessage: Message = {
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
    this.context.messages.push(userMessage);
    this.trimContext();

    this.state = 'processing';

    try {
      const stream = await this.modelGateway.chat(this.context);

      this.state = 'streaming';
      const assistantContent = await this.renderer.renderStream(stream);

      const assistantMessage: Message = {
        id: this.generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now()
      };
      this.context.messages.push(assistantMessage);
      this.trimContext();

    } catch (error) {
      this.state = 'error';
      console.error('\n❌ 发生错误:', error instanceof Error ? error.message : String(error));
    }

    this.state = 'idle';
    console.log('');
  }

  private trimContext(): void {
    const max = this.context.maxMessages;
    if (this.context.messages.length > max) {
      const excess = this.context.messages.length - max;
      this.context.messages = this.context.messages.slice(excess);
    }
  }

  private printHistory(): void {
    if (this.context.messages.length === 0) {
      console.log('暂无对话历史');
      return;
    }
    console.log(`\n📜 对话历史 (最近 ${this.context.messages.length} 条):\n`);
    this.context.messages.forEach((msg, idx) => {
      const role = msg.role === 'user' ? '👤' : '🤖';
      console.log(`${role} [#${idx + 1}]: ${msg.content}`);
    });
    console.log('');
  }

  private printReplHelp(): void {
    console.log(`
REPL 命令:
  /exit, /quit    退出
  /clear          清空对话上下文
  /history        显示对话历史
  /config         显示当前配置
  /help           显示此帮助
`);
  }

  private printConfig(): void {
    const apiKey = this.config.model.apiKey;
    const maskedApiKey = apiKey
      ? `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`
      : '(未设置)';

    console.log('\n⚙️ 当前配置:');
    console.log(`  Provider: ${this.config.model.provider}`);
    console.log(`  API Key: ${maskedApiKey}`);
    console.log(`  Model: ${this.config.model.modelName}`);
    console.log(`  Temperature: ${this.config.model.temperature}`);
    console.log(`  Max Tokens: ${this.config.model.maxTokens}`);
    console.log(`  Timeout: ${this.config.model.timeoutMs}ms`);
    console.log(`  上下文最大消息数: ${this.context.maxMessages}`);
    console.log(`  可用模型提供者: ${this.modelGateway.getAvailableProviders().join(', ')}`);
    console.log('');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  private cleanup(): void {
    this.rl?.close();
    this.rl = null;
    this.state = 'idle';
  }
}
