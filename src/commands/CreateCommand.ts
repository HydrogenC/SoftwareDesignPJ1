import { Command, type CommandKind } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class CreateCommand extends Command {
  override readonly kind: CommandKind = 'edit';
  readonly #type: string;
  readonly #newId: string;
  readonly #params: readonly string[];
  readonly #parentId: string | undefined;

  constructor(context: CommandContext, args: readonly string[]) {
    super(context, args);
    this.#type = this.arg(0, 'type');
    this.#newId = this.arg(1, 'id');
    const marker = this.#clauseMarker(args);
    this.#params = marker < 0 ? args.slice(2) : args.slice(2, marker);
    this.#parentId = marker < 0 ? undefined : this.arg(marker + 1, 'container');
  }

  /** `in <containerId>` 只在末尾出现；至少要有 type、id 和父 id 才构成子句。 */
  #clauseMarker(args: readonly string[]): number {
    if (args.length < 4) return -1;
    const marker = args.length - 2;
    return args[marker] === 'in' ? marker : -1;
  }

  execute(): string {
    const document = this.document();
    const shape = this.ctx.factory.create(this.#type, this.#newId, [...this.#params]);
    document.add(shape, this.#parentId);
    if (this.#parentId === undefined) return `${shape.label()} created`;
    return `${shape.label()} created in ${document.container(this.#parentId).label()}`;
  }

  override undo(): string {
    const document = this.document();
    const shape = document.lookup(this.#newId);
    document.remove(shape);
    return `${shape.label()} removed`;
  }
}
