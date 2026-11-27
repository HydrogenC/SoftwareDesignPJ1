import { Command, type CommandContext, type CommandDefinition, type Plugin, type PluginContext } from '../../api.js';
import { InitCommand } from './commands/InitCommand.js';
import { ReadCommand } from './commands/ReadCommand.js';
import { SaveCommand } from './commands/SaveCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { AddToCommand } from './commands/AddToCommand.js';
import { FrontCommand } from './commands/FrontCommand.js';
import { BackCommand } from './commands/BackCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { builtinShapes } from './BuiltinShapeProvider.js';

type CommandConstructor = new (context: CommandContext, args: readonly string[]) => Command;

class BuiltinCommand implements CommandDefinition {
  constructor(
    readonly name: string,
    private readonly CommandClass: CommandConstructor,
    private readonly usage: string,
    private readonly includeShapes = false,
  ) {}

  help(context: CommandContext): string {
    const line = `  ${this.usage}`;
    return this.includeShapes
      ? [line, ...context.factory.usages().map(usage => `      ${usage}`)].join('\n')
      : line;
  }

  create(context: CommandContext, args: readonly string[]): Command {
    return new this.CommandClass(context, args);
  }
}

const commands = [
  new BuiltinCommand('init', InitCommand, 'init [w] [h]                     new canvas (default 800x600)'),
  new BuiltinCommand('read', ReadCommand, 'read <file.svg>                  load an SVG document'),
  new BuiltinCommand('save', SaveCommand, 'save [file.svg]                  save the current document'),
  new BuiltinCommand('canvas', CanvasCommand, 'canvas [w] [h]                   show or resize the canvas\n'),
  new BuiltinCommand('create', CreateCommand, 'create <type> <id> [params] [in <containerId>]', true),
  new BuiltinCommand('delete', DeleteCommand, 'delete <id>'),
  new BuiltinCommand('move', MoveCommand, 'move <id> <dx> <dy>'),
  new BuiltinCommand('scale', ScaleCommand, 'scale <id> <factor>'),
  new BuiltinCommand('set', SetCommand, 'set <id> <attr> <value>'),
  new BuiltinCommand('group', GroupCommand, 'group <newGid> <id1> <id2>...'),
  new BuiltinCommand('ungroup', UngroupCommand, 'ungroup <gid>'),
  new BuiltinCommand('addto', AddToCommand, 'addto <gid> <id>'),
  new BuiltinCommand('front', FrontCommand, 'front <id>'),
  new BuiltinCommand('back', BackCommand, 'back <id>\n'),
  new BuiltinCommand('tree', TreeCommand, 'tree [id]                        show the structure tree'),
  new BuiltinCommand('show', ShowCommand, 'show <id>                        show shape attributes'),
  new BuiltinCommand('help', HelpCommand, 'help                             show this help'),
  new BuiltinCommand('undo', UndoCommand, 'undo                             undo the last edit'),
  new BuiltinCommand('redo', RedoCommand, 'redo                             redo the last undone edit'),
];

export default class BuiltinPlugin implements Plugin {
  activate(context: PluginContext): void {
    for (const shape of builtinShapes) context.registerShape(shape);
    for (const command of commands) context.registerCommand(command);
  }
}
