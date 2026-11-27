import { Command, type CommandKind } from '../../../api.js';

export class HelpCommand extends Command {
  override readonly kind: CommandKind = 'display';

  execute(): string {
    return [
      'commands:',
      ...this.ctx.helpLines(),
      '',
      '  a line starting with # is a comment; quote arguments containing spaces',
    ].join('\n');
  }
}
