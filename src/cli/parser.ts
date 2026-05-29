import type { ParsedCommand, CommandType } from '../types';

export class CliParser {
  private args: string[];

  constructor(args: string[] = process.argv.slice(2)) {
    this.args = args;
  }

  parse(): ParsedCommand {
    if (this.args.length === 0) {
      return { type: 'repl' };
    }

    const first = this.args[0];

    if (first === 'setup') return { type: 'setup' };
    if (first === 'doctor') return { type: 'doctor' };

    if (first === '-v' || first === '--version') {
      return { type: 'version' };
    }
    if (first === '-h' || first === '--help') {
      return { type: 'help' };
    }
    if (first === '-q' || first === '--query') {
      const query = this.args.slice(1).join(' ');
      if (!query) {
        throw new Error('Query argument is required for -q/--query');
      }
      return {
        type: 'query',
        payload: { query }
      };
    }

    return { type: 'help' };
  }
}
