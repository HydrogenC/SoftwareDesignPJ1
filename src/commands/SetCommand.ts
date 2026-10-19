import { Command, type CommandKind } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import type { Shape } from '../svg/Shape.js';

export class SetCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #id: string;
  readonly #attr: string;
  readonly #value: string;
  #shape: Shape | null = null;
  #previous: string | undefined = undefined;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#id = this.arg(0, 'id');
    this.#attr = this.arg(1, 'attribute');
    this.#value = this.arg(2, 'value');
  }

  execute(): string {
    const shape = this.document().lookup(this.#id);
    this.#shape = shape;
    this.#previous = shape.getAttribute(this.#attr);
    shape.set(this.#attr, this.#value);
    return this.#feedback(shape, this.#value);
  }

  override undo(): string {
    const shape = this.#shape ?? this.document().lookup(this.#id);
    const previous = this.#previous;
    if (previous === undefined) {
      shape.unsetAttribute(this.#attr);
      return `${shape.label()} updated: ${this.#attr} unset`;
    }
    shape.set(this.#attr, previous);
    return this.#feedback(shape, previous);
  }

  #feedback(shape: Shape, value: string): string {
    return `${shape.label()} updated: ${this.#attr}=${this.formatValue(value)}`;
  }
}
