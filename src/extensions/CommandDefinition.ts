import type { Command } from '../commands/Command.js';
import type { CommandContext } from '../commands/CommandContext.js';

export interface CommandDefinition {
  readonly name: string;
  help(context: CommandContext): string;
  create(context: CommandContext, args: readonly string[]): Command;
}
