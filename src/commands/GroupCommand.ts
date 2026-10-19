import { Command, type CommandKind } from './Command.js';
import type { CommandContext } from './CommandContext.js';
import type { Container } from '../svg/Container.js';
import type { Document } from '../svg/Document.js';
import type { Shape } from '../svg/Shape.js';
import { Group } from '../svg/Group.js';
import { EditorError } from '../svg/EditorError.js';

interface Origin {
  shape: Shape;
  parent: Container;
  index: number;
}

export class GroupCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #newId: string;
  readonly #childIds: readonly string[];
  #origins: Origin[] = [];
  #count = 0;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#newId = this.arg(0, 'new id');
    this.#childIds = args.slice(1);
    if (this.#childIds.length === 0) throw new EditorError('missing argument: shape id');
  }

  execute(): string {
    const document = this.document();
    if (document.has(this.#newId)) throw new EditorError(`id already exists: ${this.#newId}`);
    const shapes = this.#childIds.map(id => document.lookup(id));
    this.#assertNoDuplicates(shapes);
    this.#assertNoAncestor(shapes, document);
    // 全部下标在动手前记录，避免逐个摘除造成的位移。
    this.#origins = shapes.map(shape => this.#originOf(shape));
    const group = new Group(this.#newId);
    document.add(group);
    for (const origin of this.#origins) document.moveTo(origin.shape, this.#newId);
    this.#count = shapes.length;
    return `${group.label()} created with ${this.#count} ${this.#count === 1 ? 'child' : 'children'}`;
  }

  override undo(): string {
    const document = this.document();
    const group = document.container(this.#newId);
    for (const origin of [...this.#origins].sort((a, b) => a.index - b.index)) {
      group.detach(origin.shape);
      origin.parent.insertAt(origin.index, origin.shape);
    }
    document.remove(group);
    return `${group.label()} ungrouped (${this.#count} ${this.#count === 1 ? 'child' : 'children'})`;
  }

  #originOf(shape: Shape): Origin {
    const parent = shape.parent;
    if (parent === null) throw new EditorError(`no such shape: ${shape.id}`);
    return { shape, parent, index: parent.children.indexOf(shape) };
  }

  #assertNoDuplicates(shapes: readonly Shape[]): void {
    const seen = new Set<string>();
    for (const shape of shapes) {
      if (seen.has(shape.id)) throw new EditorError(`duplicate shape: ${shape.id}`);
      seen.add(shape.id);
    }
  }

  #assertNoAncestor(shapes: readonly Shape[], document: Document): void {
    for (const a of shapes) {
      for (const b of shapes) {
        if (a !== b && document.isAncestor(a, b)) {
          throw new EditorError(`cannot group a container into its own descendant: ${a.id}`);
        }
      }
    }
  }
}
