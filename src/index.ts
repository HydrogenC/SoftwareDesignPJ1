import type { Plugin, PluginManifest } from './api.js';
import { Repl } from './cli/Repl.js';
import { createEditor } from './host/createEditor.js';
import { PluginConfigLoader } from './host/PluginConfigLoader.js';
import { PluginHost } from './host/PluginHost.js';
import BuiltinPlugin from './plugins/builtin/BuiltinPlugin.js';
import manifest from './plugins/builtin/package.json' with { type: 'json' };

const codePlugins: readonly { plugin: Plugin; manifest: PluginManifest; options?: unknown }[] = [];
const report = (message: string): void => console.log(message);
const host = new PluginHost(report);
await host.load(new BuiltinPlugin(), manifest);

const args = process.argv.slice(2);
if (args[0] === '--config') {
  const path = args[1];
  if (path === undefined || args.length !== 2) report('error: invalid plugin config');
  else await new PluginConfigLoader(host, report).load(path);
} else if (args[0] !== '--no-plugins') {
  for (const { plugin, manifest, options } of codePlugins) await host.load(plugin, manifest, options);
}

await new Repl(createEditor(host.registrations, report)).run();
