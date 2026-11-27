import { Command, type AttributeEdit, type CommandKind, type CommandContext, type Shape } from '../../../api.js';

export class SetCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #id: string;
  readonly #attr: string;
  readonly #value: string;
  #edit: AttributeEdit | undefined;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#id = this.arg(0, 'id');
    this.#attr = this.arg(1, 'attribute');
    this.#value = this.arg(2, 'value');
  }

  execute(): string {
    const document = this.document();
    const shape = document.lookup(this.#id);
    this.#edit = this.ctx.setAttribute(this.#id, this.#attr, this.#value);
    return this.#edit.feedback?.applied ?? this.#feedback(shape, this.#value);
  }

  override undo(): string {
    const document = this.document();
    const shape = document.lookup(this.#id);
    const edit = this.#edit!;
    edit.undo(document);
    if (edit.feedback !== undefined) return edit.feedback.undone;
    const previous = edit.previous;
    if (previous === undefined) {
      return `${shape.label()} updated: ${this.#attr} unset`;
    }
    return this.#feedback(shape, previous);
  }

  override redo(): string {
    const document = this.document();
    const shape = document.lookup(this.#id);
    const edit = this.#edit!;
    edit.redo(document);
    return edit.feedback?.applied ?? this.#feedback(shape, this.#value);
  }

  #feedback(shape: Shape, value: string): string {
    return `${shape.label()} updated: ${this.#attr}=${this.formatValue(value)}`;
  }
}
