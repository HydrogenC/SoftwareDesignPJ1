import { Command, type CommandKind, type CommandContext, type Shape } from '../../../api.js';

export class MoveCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #id: string;
  readonly #dx: number;
  readonly #dy: number;
  #shape: Shape | null = null;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#id = this.arg(0, 'id');
    this.#dx = this.num(1, 'dx');
    this.#dy = this.num(2, 'dy');
  }

  execute(): string {
    const shape = this.document().lookup(this.#id);
    shape.move(this.#dx, this.#dy);
    this.#shape = shape;
    if (shape.asContainer() !== null) {
      return `${shape.label()} moved by (${this.formatNumber(this.#dx)},${this.formatNumber(this.#dy)})`;
    }
    return `${shape.label()} moved to ${this.#position(shape)}`;
  }

  override undo(): string {
    const shape = this.#target();
    shape.move(-this.#dx, -this.#dy);
    if (shape.asContainer() !== null) {
      return `${shape.label()} moved back by (${this.formatNumber(-this.#dx)},${this.formatNumber(-this.#dy)})`;
    }
    return `${shape.label()} moved back to ${this.#position(shape)}`;
  }

  #position(shape: Shape): string {
    const anchor = shape.anchor();
    if (anchor === null) return '(unknown)';
    return `(${this.formatNumber(anchor.x)},${this.formatNumber(anchor.y)})`;
  }

  #target(): Shape {
    return this.#shape ?? this.document().lookup(this.#id);
  }
}
