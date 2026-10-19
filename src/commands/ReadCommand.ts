import { Command, type CommandKind } from './Command.js';

export class ReadCommand extends Command {
  override readonly kind: CommandKind = 'document';

  override get resetsHistory(): boolean {
    return true;
  }

  execute(): string {
    const file = this.arg(0, 'file');
    const { document, warnings } = this.ctx.reader.read(file);
    this.ctx.open(document, file);
    const lines = warnings.map(warning => `warning: ${warning}`);
    lines.push(`read ${file} (${document.size} elements)`);
    return lines.join('\n');
  }
}
