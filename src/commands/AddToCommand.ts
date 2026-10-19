import { Command, type CommandKind } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import type { Container } from '../svg/Container.js';
import { EditorError } from '../svg/EditorError.js';

export class AddToCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #containerId: string;
  readonly #shapeId: string;
  #parent: Container | null = null;
  #index = 0;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#containerId = this.arg(0, 'gid');
    this.#shapeId = this.arg(1, 'id');
  }

  execute(): string {
    const document = this.document();
    const container = document.container(this.#containerId);
    const shape = document.lookup(this.#shapeId);
    const parent = shape.parent;
    if (parent === null) throw new EditorError(`no such shape: ${shape.id}`);
    this.#parent = parent;
    this.#index = parent.children.indexOf(shape);
    document.moveTo(shape, this.#containerId);
    return `${shape.label()} added to ${container.label()}`;
  }

  override undo(): string {
    const document = this.document();
    const shape = document.lookup(this.#shapeId);
    const parent = this.#parent;
    if (parent === null) throw new EditorError(`no such shape: ${this.#shapeId}`);
    document.reparent(shape, parent, this.#index);
    return `${shape.label()} moved back to ${parent.label()}`;
  }
}
