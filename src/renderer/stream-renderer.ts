import type { ChatResponseChunk } from '../types';

export class StreamRenderer {
  private buffer: string = '';
  private isRendering: boolean = false;

  async renderStream(
    stream: AsyncIterable<ChatResponseChunk>
  ): Promise<string> {
    this.buffer = '';
    this.isRendering = true;

    try {
      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'content':
            if (chunk.content) {
              this.buffer += chunk.content;
              this.writeToTerminal(chunk.content);
            }
            break;
          case 'done':
            this.writeToTerminal('\n');
            break;
          case 'error':
            if (chunk.error) {
              throw chunk.error;
            }
            break;
        }
      }
    } finally {
      this.isRendering = false;
    }

    return this.buffer;
  }

  private writeToTerminal(content: string): void {
    process.stdout.write(content);
  }

  getBuffer(): string {
    return this.buffer;
  }

  clearBuffer(): void {
    this.buffer = '';
  }
}
