import { Command, type CommandKind } from './Command.js';
import type { Container } from '../svg/Container.js';
import type { Shape } from '../svg/Shape.js';
import { EditorError } from '../svg/EditorError.js';

export class DeleteCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  #shape: Shape | null = null;
  #parent: Container | null = null;
  #index = 0;

  execute(): string {
    const document = this.document();
    const shape = document.lookup(this.arg(0, 'id'));
    const parent = shape.parent;
    if (parent === null) throw new EditorError(`no such shape: ${shape.id}`);
    this.#shape = shape;
    this.#parent = parent;
    this.#index = parent.children.indexOf(shape);
    document.remove(shape);
    return `${shape.label()} deleted`;
  }

  override undo(): string {
    const shape = this.#shape;
    const parent = this.#parent;
    if (shape === null || parent === null) throw new EditorError('nothing to restore');
    this.document().restore(shape, parent, this.#index);
    return `${shape.label()} restored into ${parent.label()}`;
  }
}
