import { Command, type CommandKind } from '../../../api.js';

export class TreeCommand extends Command {
  override readonly kind: CommandKind = 'display';

  execute(): string {
    const document = this.document();
    const id = this.args[0];
    const root = id === undefined ? document : document.lookup(id);
    return this.ctx.renderTree(root);
  }
}
