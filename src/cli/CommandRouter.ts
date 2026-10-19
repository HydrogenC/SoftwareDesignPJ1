import type { Command } from '../commands/Command.js';
import type { CommandContext } from '../commands/CommandContext.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import { BackCommand } from '../commands/BackCommand.js';
import { CanvasCommand } from '../commands/CanvasCommand.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { FrontCommand } from '../commands/FrontCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { HelpCommand } from '../commands/HelpCommand.js';
import { InitCommand } from '../commands/InitCommand.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ReadCommand } from '../commands/ReadCommand.js';
import { SaveCommand } from '../commands/SaveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { ShowCommand } from '../commands/ShowCommand.js';
import { TreeCommand } from '../commands/TreeCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { EditorError } from '../svg/EditorError.js';
import type { CommandHistory } from './CommandHistory.js';
import { LineParser } from './LineParser.js';

type CommandFactory = new (context: CommandContext, args: readonly string[]) => Command;

/** 命令名 → 命令类：文档许可的两处按名分派之一（另一处是图形工厂）。 */
const commands = new Map<string, CommandFactory>([
  ['init', InitCommand],
  ['read', ReadCommand],
  ['save', SaveCommand],
  ['canvas', CanvasCommand],
  ['create', CreateCommand],
  ['delete', DeleteCommand],
  ['move', MoveCommand],
  ['scale', ScaleCommand],
  ['set', SetCommand],
  ['group', GroupCommand],
  ['ungroup', UngroupCommand],
  ['addto', AddToCommand],
  ['front', FrontCommand],
  ['back', BackCommand],
  ['tree', TreeCommand],
  ['show', ShowCommand],
  ['help', HelpCommand],
]);

export class CommandRouter {
  constructor(
    private readonly context: CommandContext,
    private readonly history: CommandHistory,
  ) {}

  run(line: string): string {
    const tokens = LineParser.parse(line);
    const name = tokens[0];
    if (name === undefined) return '';
    const args = tokens.slice(1);

    // undo/redo 不是普通命令：它们驱动历史栈本身。
    if (name === 'undo' || name === 'redo') {
      this.context.requireDocument();
      return name === 'undo' ? this.history.undo() : this.history.redo();
    }

    const Factory = commands.get(name);
    if (Factory === undefined) throw new EditorError(`unknown command: ${name}`);
    return this.history.execute(new Factory(this.context, args));
  }
}
