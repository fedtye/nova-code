import { CliParser } from './cli/parser';
import { HELP_TEXT } from './cli/help';
import { Doctor } from './cli/doctor';
import { Setup } from './cli/setup';
import { ReplEngine } from './core/repl-engine';
import { ModelGateway } from './core/model-gateway';
import { ConfigManager } from './core/config-manager';
import { AnthropicProvider } from './providers/anthropic-provider';
import { StreamRenderer } from './renderer/stream-renderer';
import { NovaError, ERROR_MESSAGES } from './types';

export const VERSION = '0.1.0';

async function main() {
  try {
    const parser = new CliParser();
    const command = parser.parse();

    const configManager = new ConfigManager();

    if (command.type === 'setup') {
      const setup = new Setup(configManager);
      await setup.run();
      return;
    }

    if (command.type === 'doctor') {
      const doctor = new Doctor(configManager);
      await doctor.run();
      return;
    }

    if (command.type === 'version') {
      console.log(`Nova Agent v${VERSION}`);
      return;
    }

    if (command.type === 'help') {
      console.log(HELP_TEXT);
      return;
    }

    const config = await configManager.loadConfig();
    const apiKey = await configManager.getApiKey();

    if (!apiKey) {
      throw new NovaError({
        code: 'API_KEY_MISSING',
        ...ERROR_MESSAGES.API_KEY_MISSING
      });
    }

    const anthropicProvider = new AnthropicProvider({
      apiKey: apiKey,
      apiBaseUrl: config.model.apiBaseUrl,
      modelName: config.model.modelName,
      defaultTimeoutMs: config.model.timeoutMs
    });

    const modelGateway = new ModelGateway(anthropicProvider);
    const renderer = new StreamRenderer();

    if (command.type === 'query') {
      const query = command.payload?.query || '';
      const context = {
        messages: [{
          id: Date.now().toString(36),
          role: 'user' as const,
          content: query,
          timestamp: Date.now()
        }],
        maxMessages: 10
      };

      const stream = await modelGateway.chat(context);
      await renderer.renderStream(stream);
      console.log('');
      return;
    }

    if (command.type === 'repl') {
      const repl = new ReplEngine({
        modelGateway,
        renderer,
        config
      });
      await repl.start();
      return;
    }

  } catch (error) {
    if (error instanceof NovaError) {
      console.error(error.toUserString());
      process.exit(1);
    }
    console.error('❌', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
