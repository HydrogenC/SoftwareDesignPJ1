import { Command, EditorError, type CommandKind, type CommandContext, type Container, type Shape } from '../../../api.js';

export class UngroupCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #id: string;
  #group: Container | null = null;
  #parent: Container | null = null;
  #index = 0;
  #children: Shape[] = [];

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#id = this.arg(0, 'id');
  }

  execute(): string {
    const document = this.document();
    const group = document.lookup(this.#id).asContainer();
    if (group === null) throw new EditorError(`not a container: ${this.#id}`);
    group.assertCanUngroup();
    if (group.parent === document) throw new EditorError(`cannot ungroup top-level container: ${this.#id}`);
    const parent = group.parent;
    if (parent === null) throw new EditorError(`no such shape: ${this.#id}`);
    const index = parent.children.indexOf(group);
    const children = [...group.children];
    document.assertCanExtract(group);
    for (const child of children) document.assertCanExtract(child);
    this.#group = group;
    this.#parent = parent;
    this.#index = index;
    this.#children = children;
    children.forEach((child, offset) => document.reparent(child, parent, index + offset));
    document.remove(group);
    return `${group.label()} ungrouped (${children.length} ${children.length === 1 ? 'child' : 'children'})`;
  }

  override undo(): string {
    const group = this.#group;
    const parent = this.#parent;
    if (group === null || parent === null) throw new EditorError('nothing to restore');
    const document = this.document();
    document.restore(group, parent, this.#index);
    for (const child of this.#children) document.moveTo(child, this.#id);
    return `${group.label()} restored with ${this.#children.length} ${this.#children.length === 1 ? 'child' : 'children'}`;
  }
}
