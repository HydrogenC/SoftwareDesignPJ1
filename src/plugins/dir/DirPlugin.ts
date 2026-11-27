import { Command, EditorError, type CommandContext, type CommandDefinition, type Plugin, type PluginContext } from '../../api.js';
import { NodeDirectoryAccess, type DirectoryAccess, type DirectoryEntry } from './DirectoryAccess.js';

export { default as manifest } from './package.json' with { type: 'json' };

class DirCommand extends Command {
  override readonly kind = 'display';

  constructor(context: CommandContext, args: readonly string[], private readonly directory: DirectoryAccess) {
    super(context, args);
  }

  execute(): string {
    if (this.args.length !== 0) throw new EditorError('usage: dir');
    let path = '.';
    let entries: readonly DirectoryEntry[];
    try {
      path = this.directory.currentPath();
      entries = this.directory.list(path);
    } catch {
      throw new EditorError(`cannot read directory: ${path}`);
    }

    const directories: string[] = [];
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.name === '.' || entry.name === '..') continue;
      const names = entry.isDirectory ? directories : files;
      names.push(entry.name);
    }
    const lines = [
      ...directories.sort().map(name => `[DIR]  ${name}`),
      ...files.sort().map(name => `[FILE]  ${name}`),
    ];
    return lines.length === 0 ? '(empty directory)' : lines.join('\n');
  }
}

class DirDefinition implements CommandDefinition {
  readonly name = 'dir';

  constructor(private readonly directory: DirectoryAccess) {}

  help(): string {
    return '  dir                              list the current working directory';
  }

  create(context: CommandContext, args: readonly string[]): Command {
    return new DirCommand(context, args, this.directory);
  }
}

export class DirPlugin implements Plugin {
  constructor(private readonly directory: DirectoryAccess = new NodeDirectoryAccess()) {}

  activate(context: PluginContext): void {
    context.registerCommand(new DirDefinition(this.directory));
  }
}

export default new DirPlugin();
