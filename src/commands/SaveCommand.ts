import { Command, type CommandKind } from './Command.js';
import { EditorError } from '../svg/EditorError.js';

export class SaveCommand extends Command {
  override readonly kind: CommandKind = 'document';

  execute(): string {
    const document = this.document();
    const file = this.args[0] ?? this.ctx.path;
    if (file === null || file === undefined) {
      throw new EditorError(`no file path to save to; use 'save <file.svg>'`);
    }
    this.ctx.writer.save(document, file);
    this.ctx.setPath(file);
    return `saved to ${file} (${document.size} elements)`;
  }
}
