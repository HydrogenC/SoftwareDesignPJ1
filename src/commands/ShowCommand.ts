import { Command, type CommandKind } from './Command.js';

export class ShowCommand extends Command {
  override readonly kind: CommandKind = 'display';

  execute(): string {
    const shape = this.document().lookup(this.arg(0, 'id'));
    const parent = shape.parent;
    const header = `${shape.label()}  parent=${parent === null ? 'none' : parent.label()}`;
    return [header, ...shape.renderDetail().map(line => `  ${line}`)].join('\n');
  }
}
