import { Command, Document, EditorError, type CommandKind } from '../../../api.js';

export class InitCommand extends Command {
  override readonly kind: CommandKind = 'document';

  override get resetsHistory(): boolean {
    return true;
  }

  execute(): string {
    const width = this.args[0] === undefined ? 800 : this.num(0, 'width');
    const height = this.args[1] === undefined ? 600 : this.num(1, 'height');
    if (width <= 0 || height <= 0) throw new EditorError('canvas size must be positive');
    this.ctx.open(new Document(width, height), null);
    return `canvas ${width}x${height} created`;
  }
}
