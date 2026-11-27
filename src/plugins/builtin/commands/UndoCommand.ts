import { Command, type CommandKind } from '../../../api.js';

export class UndoCommand extends Command {
  override readonly kind: CommandKind = 'display';

  execute(): string {
    return this.ctx.undo();
  }
}
