import { Command, type CommandKind } from '../../../api.js';

export class RedoCommand extends Command {
  override readonly kind: CommandKind = 'display';

  execute(): string {
    return this.ctx.redo();
  }
}
