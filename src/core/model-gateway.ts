import type {
  ModelProvider,
  ConversationContext,
  ChatOptions,
  ChatResponseChunk
} from '../types';

export class ModelGateway {
  private providers: Map<string, ModelProvider> = new Map();
  private defaultProviderId: string;

  constructor(defaultProvider: ModelProvider) {
    this.registerProvider(defaultProvider);
    this.defaultProviderId = defaultProvider.id;
  }

  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  setDefaultProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not registered`);
    }
    this.defaultProviderId = providerId;
  }

  async chat(
    context: ConversationContext,
    options?: ChatOptions,
    providerId?: string
  ): Promise<AsyncIterable<ChatResponseChunk>> {
    const id = providerId ?? this.defaultProviderId;
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider ${id} not found`);
    }

    const available = await provider.isAvailable();
    if (!available) {
      throw new Error(`Provider ${id} is not available`);
    }

    return provider.chat(context, options);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
