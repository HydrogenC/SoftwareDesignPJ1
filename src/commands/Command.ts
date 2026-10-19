import type { Document } from '../svg/Document.js';
import { EditorError } from '../svg/EditorError.js';
import type { CommandContext } from './CommandContext.js';

export type CommandKind = 'edit' | 'display' | 'document';

/** Command 模式：每个命令自带 execute 与逆操作，历史层只负责编排。 */
export abstract class Command {
  abstract readonly kind: CommandKind;

  constructor(
    protected readonly ctx: CommandContext,
    protected readonly args: readonly string[],
  ) {}

  abstract execute(): string;

  undo(): string {
    throw new EditorError('this command cannot be undone');
  }

  /** 默认重放同一命令；撤销已把状态还原到执行前的样子。 */
  redo(): string {
    return this.execute();
  }

  /** init / read 替换文档后，旧历史不再有意义。 */
  get resetsHistory(): boolean {
    return false;
  }

  /** 文档类命令执行后锁住 undo/redo，直到下一次编辑。 */
  get locksHistory(): boolean {
    return this.kind === 'document';
  }

  protected document(): Document {
    return this.ctx.requireDocument();
  }

  protected arg(index: number, name: string): string {
    const value = this.args[index];
    if (value === undefined) throw new EditorError(`missing argument: ${name}`);
    return value;
  }

  protected num(index: number, name: string): number {
    const raw = this.arg(index, name);
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new EditorError(`invalid number for ${name}: ${raw}`);
    return value;
  }

  /** 避免浮点尾数污染回显；模型内部仍保留完整精度。 */
  protected formatNumber(value: number): string {
    return String(Number(value.toFixed(6)));
  }

  protected formatValue(value: string): string {
    return /\s/.test(value) ? `"${value}"` : value;
  }
}
