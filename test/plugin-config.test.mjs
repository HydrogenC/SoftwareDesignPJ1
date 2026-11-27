import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createEditor } from '../dist/host/createEditor.js';
import { PluginConfigLoader } from '../dist/host/PluginConfigLoader.js';
import { PluginHost } from '../dist/host/PluginHost.js';
import BuiltinPlugin from '../dist/plugins/builtin/BuiltinPlugin.js';
import builtin from '../dist/plugins/builtin/package.json' with { type: 'json' };

const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const api = new URL('../dist/api.js', import.meta.url).href;
const decorated = name => ({ decorators: [name] });

function createFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'svg-cli-config-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = join(root, 'plugins.config.json');
  function packageAt(path, name, contributes, source, extra = {}) {
    const directory = join(root, path);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'package.json'), JSON.stringify({
      name, type: 'module', main: './entry.js', contributes, ...extra,
    }));
    writeFileSync(join(directory, 'entry.js'), source);
  }
  function configure(plugins) {
    writeFileSync(config, JSON.stringify({ plugins }));
  }
  function run(input) {
    const child = spawnSync(process.execPath, [cli, '--config', config], { input, timeout: 10_000 });
    if (child.error) throw child.error;
    assert.equal(child.status, 0, child.stderr.toString());
    assert.equal(child.stderr.length, 0, child.stderr.toString());
    return child.stdout.toString();
  }
  return { config, packageAt, configure, run };
}

function pluginWithDecorator(name, extra = '') {
  return `
    class Decorator {
      name = ${JSON.stringify(name)};
      decorate(shape) { return shape.id === '' ? this.name : undefined; }
    }
    export default new class {
      activate(ctx) {
        ctx.registerDecorator(new Decorator());
        ${extra}
      }
    };
  `;
}

test('configuration failures roll back staged registrations and later plugins still load', t => {
  const fixture = createFixture(t);
  fixture.packageAt('no-default', 'no-default', {}, 'export const named = 1;');
  fixture.packageAt('mismatch', 'mismatch', decorated('declared'), pluginWithDecorator('mismatch'));
  fixture.packageAt('throws', 'throws', decorated('throws'), pluginWithDecorator('throws', "throw new Error('boom');"));
  fixture.packageAt('broken-dep', 'broken-dep', {}, "import './absent.js';");
  fixture.packageAt('evaluation', 'evaluation', {}, "throw new Error('evaluation failed');");
  fixture.packageAt('duplicate', 'duplicate', decorated('duplicate'), pluginWithDecorator('duplicate', `
    try { ctx.registerDecorator({ name: 'keep', decorate() {} }); } catch {}
  `));
  fixture.packageAt('keep', 'keep', decorated('keep'), pluginWithDecorator('keep'));
  fixture.packageAt('disabled', 'disabled', {}, "throw new Error('should not be evaluated');");
  fixture.packageAt('later', 'later', decorated('later'), pluginWithDecorator('later'));
  fixture.configure([
    { module: './keep' },
    { module: './missing' },
    { module: './no-default' },
    { module: './mismatch' },
    { module: './throws' },
    { module: './broken-dep' },
    { module: './evaluation' },
    { module: './duplicate' },
    { module: './disabled', enabled: false },
    { module: './later/entry.js' },
  ]);
  const output = fixture.run('init\ntree\n');
  assert.deepEqual(output.split('\n').filter(line => line.startsWith('error:')).map(line =>
    line.replace(/\(Cannot find module.*$/, '(missing dependency)'),
  ), [
    'error: plugin not found: ./missing',
    'error: plugin has no default export: ./no-default',
    'error: plugin manifest mismatch: mismatch (declared: decorators/declared, registered: decorators/mismatch)',
    'error: plugin failed to activate: throws (boom)',
    'error: plugin failed to activate: broken-dep (missing dependency)',
    'error: plugin failed to activate: evaluation (evaluation failed)',
    'error: duplicate registration: decorators/keep',
  ]);
  assert.match(output, /svg \(800x600\) keep later\n$/);
});

test('invalid config is rejected before loading any entry', t => {
  const fixture = createFixture(t);
  fixture.packageAt('keep', 'keep', decorated('keep'), pluginWithDecorator('keep'));
  fixture.configure([{ module: './keep' }, { module: './also', enabled: 'false' }]);
  const expected = "error: invalid plugin config\nsvg-editor 0.1 — type 'help' for commands\n\ncanvas 800x600 created\nsvg (800x600)\n";
  assert.equal(fixture.run('init\ntree\n'), expected);
  writeFileSync(fixture.config, '{');
  assert.equal(fixture.run('init\ntree\n'), expected);
});

test('code and config activate the same class with the same options and output', async t => {
  const fixture = createFixture(t);
  const name = '@test/echo';
  const manifest = { name, contributes: { commands: ['echo'] } };
  fixture.packageAt('node_modules/@test/echo', name, manifest.contributes, `
    import { Command } from ${JSON.stringify(api)};
    class Echo extends Command {
      kind = 'display';
      execute() { return this.arg(0, 'prefix') + ':' + this.args.slice(1).join(' '); }
    }
    class Definition {
      name = 'echo';
      constructor(prefix) { this.prefix = prefix; }
      help() { return '  echo <text>'; }
      create(context, args) { return new Echo(context, [this.prefix, ...args]); }
    }
    export default new class {
      async activate(ctx, options) {
        await Promise.resolve();
        ctx.registerCommand(new Definition(options.prefix));
      }
    };
  `, { exports: { import: './entry.js' } });
  const options = { prefix: 'configured' };
  fixture.configure([{ module: name, options }]);
  const direct = new PluginHost(assert.fail);
  const config = new PluginHost(assert.fail);
  for (const host of [direct, config]) assert.equal(await host.load(new BuiltinPlugin(), builtin), true);
  const { default: plugin } = await import(pathToFileURL(join(dirname(fixture.config), 'node_modules/@test/echo/entry.js')).href);
  assert.equal(await direct.load(plugin, manifest, options), true);
  await new PluginConfigLoader(config, assert.fail).load(fixture.config);
  const session = host => {
    const editor = createEditor(host.registrations, assert.fail);
    return Buffer.from(['echo "one two"', 'help'].map(line => editor.run(line)).join('\n'));
  };
  assert.match(session(config).toString(), /^configured:one two/);
  assert.ok(session(direct).equals(session(config)));
  assert.match(fixture.run('echo "one two"\n'), /configured:one two\n$/);
});
