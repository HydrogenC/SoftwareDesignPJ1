import {
  Command, EditorError, type CommandContext, type CommandDefinition, type Plugin, type PluginContext, type Shape,
} from '../../api.js';

export { default as manifest } from './package.json' with { type: 'json' };

class StatsCommand extends Command {
  override readonly kind = 'display';

  execute(): string {
    if (this.args.length !== 0) throw new EditorError('usage: stats');
    const counts = new Map<string, number>();
    let total = 0;
    let containers = 0;

    function visit(shape: Shape): void {
      const container = shape.asContainer();
      if (container !== null) {
        containers++;
        container.children.forEach(visit);
        return;
      }
      const kind = shape.kind;
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
      total++;
    }

    this.document().children.forEach(visit);
    const parts = Array.from(counts, ([kind, count]) => `${kind}: ${count}`);
    parts.push(`(total ${total}, containers ${containers})`);
    return parts.join('  ');
  }
}

class StatsDefinition implements CommandDefinition {
  readonly name = 'stats';

  help(): string {
    return '  stats                            count shapes by type';
  }

  create(context: CommandContext, args: readonly string[]): Command {
    return new StatsCommand(context, args);
  }
}

class StatsPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.registerCommand(new StatsDefinition());
  }
}

export default new StatsPlugin();
