// REPL state
export type ReplState =
  | 'idle'
  | 'waiting_input'
  | 'processing'
  | 'streaming'
  | 'error'
  | 'exiting';

// Command type
export type CommandType =
  | 'repl'
  | 'query'
  | 'setup'
  | 'doctor'
  | 'version'
  | 'help';

// Parsed command
export interface ParsedCommand {
  type: CommandType;
  payload?: {
    query?: string;
  };
}
