import { Command, type CommandKind } from './Command.js';
import { EditorError } from '../svg/EditorError.js';

export class CanvasCommand extends Command {
  override readonly kind: CommandKind = 'document';

  /** 查询尺寸不算 IO 修改，不锁历史。 */
  override get locksHistory(): boolean {
    return this.args.length > 0;
  }

  execute(): string {
    const document = this.document();
    if (this.args.length === 0) return `canvas ${document.width}x${document.height}`;
    const width = this.num(0, 'width');
    const height = this.num(1, 'height');
    if (width <= 0 || height <= 0) throw new EditorError('canvas size must be positive');
    document.resize(width, height);
    return `canvas resized to ${width}x${height}`;
  }
}
