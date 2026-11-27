import type { Plugin, PluginManifest } from './api.js';
import { Repl } from './cli/Repl.js';
import { createEditor } from './host/createEditor.js';
import { PluginConfigLoader } from './host/PluginConfigLoader.js';
import { PluginHost } from './host/PluginHost.js';
import BuiltinPlugin from './plugins/builtin/BuiltinPlugin.js';
import manifest from './plugins/builtin/package.json' with { type: 'json' };

const codePlugins: readonly {
  load: () => Promise<{ default: Plugin; manifest: PluginManifest }>;
  options?: unknown;
}[] = [
  { load: () => import('./plugins/stats/StatsPlugin.js') },
  { load: () => import('./plugins/dir/DirPlugin.js') },
];
const report = (message: string): void => console.log(message);
const host = new PluginHost(report);
await host.load(new BuiltinPlugin(), manifest);

const args = process.argv.slice(2);
if (args[0] === '--config') {
  const path = args[1];
  if (path === undefined || args.length !== 2) report('error: invalid plugin config');
  else await new PluginConfigLoader(host, report).load(path);
} else if (args[0] !== '--no-plugins') {
  for (const { load, options } of codePlugins) {
    const { default: plugin, manifest } = await load();
    await host.load(plugin, manifest, options);
  }
}

await new Repl(createEditor(host.registrations, report)).run();
