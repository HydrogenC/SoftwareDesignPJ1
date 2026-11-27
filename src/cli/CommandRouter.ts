import { Command } from '../commands/Command.js';
import type { CommandContext } from '../commands/CommandContext.js';
import type { CommandDefinition } from '../extensions/CommandDefinition.js';
import { invokeExtension } from '../extensions/invokeExtension.js';
import { EditorError } from '../svg/EditorError.js';
import type { CommandHistory } from './CommandHistory.js';
import { LineParser } from './LineParser.js';

export class CommandRouter {
  constructor(
    private readonly context: CommandContext,
    private readonly history: CommandHistory,
    private readonly commands: ReadonlyMap<string, CommandDefinition>,
  ) {}

  run(line: string): string {
    const tokens = LineParser.parse(line);
    const name = tokens[0];
    if (name === undefined) return '';

    const definition = this.commands.get(name);
    if (definition === undefined) throw new EditorError(`unknown command: ${name}`);
    return invokeExtension('command', name, () => {
      const command = definition.create(this.context, tokens.slice(1));
      if (!(command instanceof Command)) throw new TypeError('expected a Command instance');
      if (command.kind !== 'edit' && command.kind !== 'display' && command.kind !== 'document') {
        throw new TypeError('invalid command kind');
      }
      return this.history.execute(command);
    });
  }
}
