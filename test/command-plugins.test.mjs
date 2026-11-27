import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createEditor } from '../dist/host/createEditor.js';
import { PluginHost } from '../dist/host/PluginHost.js';
import BuiltinPlugin from '../dist/plugins/builtin/BuiltinPlugin.js';
import builtin from '../dist/plugins/builtin/package.json' with { type: 'json' };
import { DirPlugin, manifest as dirManifest } from '../dist/plugins/dir/DirPlugin.js';

const transcripts = new URL('../doc/transcript/', import.meta.url);
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const config = fileURLToPath(new URL('../plugins.config.json', import.meta.url));

function temporaryDirectory(t) {
  const path = mkdtempSync(join(tmpdir(), 'svg-command-plugins-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

function runCli(cwd, args, input) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, input, timeout: 10_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr.toString());
  assert.equal(result.stderr.length, 0, result.stderr.toString());
  return result.stdout;
}

test('stats and real dir produce identical bytes through both assemblies', t => {
  const cwd = temporaryDirectory(t);
  mkdirSync(join(cwd, 'docs'));
  mkdirSync(join(cwd, 'plugins'));
  for (const file of ['.env', 'demo.svg', 'package.json']) writeFileSync(join(cwd, file), '');
  copyFileSync(new URL('input/other.svg', transcripts), join(cwd, 'docs', 'other.svg'));

  const input = readFileSync(new URL('command-plugins.txt', transcripts));
  const expected = readFileSync(new URL('expected/command-plugins.stdout.txt', transcripts));
  const codeOutput = runCli(cwd, [], input);
  const configOutput = runCli(cwd, ['--config', config], input);
  assert.equal(codeOutput.toString(), expected.toString());
  assert.deepEqual(configOutput, codeOutput);
});

test('stats and dir each appear in help only when enabled', t => {
  const cwd = temporaryDirectory(t);
  const selectedConfig = join(temporaryDirectory(t), 'plugins.config.json');
  const input = 'help\ninit\nstats\ndir\n';

  function assertCommands(output, enabled) {
    for (const name of ['stats', 'dir']) {
      const help = new RegExp(`^  ${name} +\\S`, 'm');
      const unknown = new RegExp(`^error: unknown command: ${name}$`, 'm');
      if (enabled.includes(name)) {
        assert.match(output, help);
        assert.doesNotMatch(output, unknown);
      } else {
        assert.doesNotMatch(output, help);
        assert.match(output, unknown);
      }
    }
  }

  assertCommands(runCli(cwd, [], input).toString(), ['stats', 'dir']);
  assertCommands(runCli(cwd, ['--no-plugins'], input).toString(), []);
  for (const name of ['stats', 'dir']) {
    const plugins = ['stats', 'dir'].map(command => ({
      module: fileURLToPath(new URL(`../dist/plugins/${command}`, import.meta.url)),
      enabled: command === name,
    }));
    writeFileSync(selectedConfig, JSON.stringify({ plugins }));
    const output = runCli(cwd, ['--config', selectedConfig], input).toString();
    assertCommands(output, [name]);
    assert.ok(output.includes(name === 'stats' ? '(total 0, containers 0)' : '(empty directory)'));
  }
});

test('dir preserves the document and both history stacks on success and failure', async () => {
  const path = tmpdir();
  let fail = false;
  const directory = {
    currentPath: () => path,
    list() {
      if (fail) throw new Error('permission denied');
      return [];
    },
  };
  const host = new PluginHost(assert.fail);
  assert.equal(await host.load(new BuiltinPlugin(), builtin), true);
  assert.equal(await host.load(new DirPlugin(directory), dirManifest), true);
  const editor = createEditor(host.registrations, assert.fail);
  editor.run('init');
  const empty = editor.run('tree');
  editor.run('create rect r1 0 0 5 5');
  const original = editor.run('tree');
  editor.run('move r1 4 0');
  const moved = editor.run('tree');
  editor.run('undo');

  assert.equal(editor.run('dir'), '(empty directory)');
  assert.equal(editor.run('tree'), original);
  fail = true;
  assert.throws(() => editor.run('dir'), { message: `cannot read directory: ${path}` });
  assert.equal(editor.run('tree'), original);
  editor.run('redo');
  assert.equal(editor.run('tree'), moved);
  editor.run('undo');
  editor.run('undo');
  assert.equal(editor.run('tree'), empty);
});

test('real dir after saving under a subdirectory still lists cwd and preserves the IO lock', t => {
  const cwd = temporaryDirectory(t);
  mkdirSync(join(cwd, 'docs'));
  const input = 'init\ncreate rect r1 0 0 5 5\nsave docs/saved.svg\ndir\nundo\n';
  const output = runCli(cwd, [], input).toString();
  assert.match(output, /saved to docs\/saved\.svg \(1 elements\)\n\[DIR\]  docs\nerror: undo not allowed after io command\n$/);
});
