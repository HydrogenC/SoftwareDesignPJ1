import { Command, EditorError, type CommandKind, type CommandContext, type Shape } from '../../../api.js';

export class ScaleCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #id: string;
  readonly #factor: number;
  #shape: Shape | null = null;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#id = this.arg(0, 'id');
    this.#factor = this.num(1, 'factor');
    if (this.#factor <= 0) throw new EditorError('scale factor must be positive');
  }

  execute(): string {
    const shape = this.document().lookup(this.#id);
    shape.scale(this.#factor);
    this.#shape = shape;
    return `${shape.label()} scaled by ${this.formatNumber(this.#factor)}`;
  }

  override undo(): string {
    const shape = this.#shape ?? this.document().lookup(this.#id);
    const inverse = 1 / this.#factor;
    shape.scale(inverse);
    return `${shape.label()} scaled back by ${this.formatNumber(inverse)}`;
  }
}
