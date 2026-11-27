import { Command, EditorError, type CommandKind, type CommandContext, type Container } from '../../../api.js';

export class BackCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #id: string;
  #parent: Container | null = null;
  #index = 0;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#id = this.arg(0, 'id');
  }

  execute(): string {
    const document = this.document();
    const shape = document.lookup(this.#id);
    const parent = shape.parent;
    if (parent === null) throw new EditorError(`no such shape: ${shape.id}`);
    this.#parent = parent;
    this.#index = parent.children.indexOf(shape);
    document.reparent(shape, parent, 0);
    return `${shape.label()} moved to back`;
  }

  override undo(): string {
    const parent = this.#parent;
    if (parent === null) throw new EditorError(`no such shape: ${this.#id}`);
    const shape = this.document().lookup(this.#id);
    this.document().reparent(shape, parent, this.#index);
    return `${shape.label()} z-order restored`;
  }
}
