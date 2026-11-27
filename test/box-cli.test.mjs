import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createEditor } from '../dist/host/createEditor.js';
import { PluginHost } from '../dist/host/PluginHost.js';
import box, { manifest as boxManifest } from '../dist/plugins/box/BoxPlugin.js';
import BuiltinPlugin from '../dist/plugins/builtin/BuiltinPlugin.js';
import builtin from '../dist/plugins/builtin/package.json' with { type: 'json' };
import modifiedStar, { manifest as starManifest } from '../dist/plugins/modified-star/ModifiedStarPlugin.js';

const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const config = fileURLToPath(new URL('../plugins.config.json', import.meta.url));
const transcripts = new URL('../doc/transcript/', import.meta.url);

function temporaryDirectory(t) {
  const path = mkdtempSync(join(tmpdir(), 'svg-box-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

async function editorWithBox({ boxEnabled = true, starEnabled = false } = {}) {
  const host = new PluginHost(assert.fail);
  assert.equal(await host.load(new BuiltinPlugin(), builtin), true);
  if (boxEnabled) assert.equal(await host.load(box, boxManifest), true);
  if (starEnabled) assert.equal(await host.load(modifiedStar, starManifest), true);
  return createEditor(host.registrations, assert.fail);
}

function assertBoxReplay(cwd, args, stdoutFixture) {
  const target = join(cwd, 'flowchart-box.svg');
  const input = readFileSync(new URL('flowchart-box.txt', transcripts));
  const expectedOutput = readFileSync(new URL(`expected/${stdoutFixture}`, transcripts));
  const expectedSvg = readFileSync(new URL('expected/flowchart-box.svg', transcripts));
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, input, timeout: 10_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr.toString());
  assert.equal(result.stderr.toString(), '');
  assert.equal(result.stdout.toString(), expectedOutput.toString());
  assert.deepEqual(result.stdout, expectedOutput);
  assert.deepEqual(readFileSync(target), expectedSvg);
  unlinkSync(target);
}

test('the Phase 1 box session with both labels gives identical stdout and SVG in both assemblies', t => {
  const cwd = temporaryDirectory(t);
  for (const args of [[], ['--config', config]]) {
    assertBoxReplay(cwd, args, 'flowchart-box.modified-star.stdout.txt');
  }
});

test('disabling modified-star preserves the original box tree output', t => {
  const cwd = temporaryDirectory(t);
  const localConfig = join(cwd, 'plugins.config.json');
  writeFileSync(localConfig, JSON.stringify({
    plugins: [
      { module: fileURLToPath(new URL('../dist/plugins/box', import.meta.url)) },
      { module: fileURLToPath(new URL('../dist/plugins/modified-star', import.meta.url)), enabled: false },
    ],
  }));
  assertBoxReplay(cwd, ['--config', localConfig], 'flowchart-box.stdout.txt');
});

test('the box and modified-star labels coexist through save, edit, undo, redo and read', async t => {
  const editor = await editorWithBox({ starEnabled: true });
  const cwd = temporaryDirectory(t);
  const savedFile = join(cwd, 'saved.svg');
  const missingFile = join(cwd, 'missing', 'broken.svg');

  editor.run('init');
  assert.equal(editor.run('tree'), 'svg (800x600) *');
  editor.run('create g parent');
  editor.run('create box n1 120 100 160 60 Original in parent');
  assert.match(editor.run('tree n1'), /^g#n1 \(box\) \*\n/);
  editor.run(`save "${savedFile}"`);
  const clean = editor.run('tree');
  assert.match(clean, /g#n1 \(box\)$/m);
  assert.doesNotMatch(clean, /\*$/m);

  editor.run('set n1 label Updated');
  const dirty = editor.run('tree');
  assert.match(dirty, /^svg \(800x600\) \*$/m);
  assert.match(dirty, /g#parent \*$/m);
  assert.match(dirty, /g#n1 \(box\) \*$/m);
  assert.match(dirty, /text#n1-label .*"Updated" \*$/m);
  assert.doesNotMatch(dirty, /rect#n1-rect .*\*$/m);
  assert.equal(editor.run('tree n1-label'), 'text#n1-label (140,135) "Updated" *');

  assert.throws(() => editor.run(`save "${missingFile}"`), /cannot write file/);
  assert.throws(() => editor.run(`read "${missingFile}"`), /cannot read file/);
  assert.equal(editor.run('tree'), dirty);
  editor.run('undo');
  assert.equal(editor.run('tree'), clean);
  editor.run('redo');
  assert.equal(editor.run('tree'), dirty);
  editor.run(`read "${savedFile}"`);
  assert.equal(editor.run('tree'), clean);

  const starOnly = await editorWithBox({ boxEnabled: false, starEnabled: true });
  starOnly.run(`read "${savedFile}"`);
  starOnly.run('set n1-label text Updated');
  assert.match(starOnly.run('tree'), /g#n1 \*$/m);
});

test('box fill and label each undo and redo in one command', async () => {
  const editor = await editorWithBox();
  editor.run('init');
  assert.match(editor.run('help'), /^      box +<x> <y> <w> <h> "<title>"$/m);
  editor.run('create box n1 120 100 160 60 "开始"');
  const original = editor.run('tree');
  assert.equal(editor.run('set n1 fill #f5a623'), 'box#n1 fill propagated to n1-rect');
  const painted = editor.run('tree');
  assert.match(painted, /rect#n1-rect .*fill=#f5a623/);
  assert.equal(editor.run('set n1 label "处理数据 v2"'), 'box#n1 label updated: "处理数据 v2"');
  const renamed = editor.run('tree');
  assert.match(renamed, /text#n1-label .*"处理数据 v2"/);
  assert.equal(editor.run('undo'), 'box#n1 label restored: "开始"');
  assert.equal(editor.run('tree'), painted);
  assert.equal(editor.run('undo'), 'box#n1 fill restored on n1-rect: #4a90d9');
  assert.equal(editor.run('tree'), original);
  editor.run('redo');
  assert.equal(editor.run('tree'), painted);
  editor.run('redo');
  assert.equal(editor.run('tree'), renamed);

  editor.run('create rect r1 0 0 1 1');
  assert.equal(editor.run('set r1 fill red'), 'rect#r1 updated: fill=red');
  assert.throws(() => editor.run('set r1 label fail'), /unknown attribute: label/);
  assert.equal(editor.run('set n1 stroke black'), 'box#n1 updated: stroke=black');
});

test('box protects required parts, preflights IDs and deletes as a whole subtree', async () => {
  const editor = await editorWithBox();
  editor.run('init');
  editor.run('create g parent');
  editor.run('create rect taken-rect 0 0 1 1');
  editor.run('create text taken2-label 0 0 exists');
  editor.run('create box n1 0 0 160 60 label');
  editor.run('create circle extra 5 5 2 in n1');
  const before = editor.run('tree');

  for (const [command, error] of [
    ['create box taken 0 0 160 60 label', /id already exists: taken-rect/],
    ['create box taken2 0 0 160 60 label in parent', /id already exists: taken2-label/],
    ['delete n1-rect', /cannot remove required box part: n1-rect/],
    ['addto parent n1-label', /cannot remove required box part: n1-label/],
    ['group orphaned taken-rect n1-rect', /cannot remove required box part: n1-rect/],
    ['ungroup n1', /cannot ungroup composite shape: n1/],
  ]) {
    assert.throws(() => editor.run(command), error);
    assert.equal(editor.run('tree'), before);
  }
  for (const id of ['taken', 'taken2', 'taken2-rect', 'orphaned']) {
    assert.throws(() => editor.run(`show ${id}`), /no such shape/);
  }

  assert.equal(editor.run('addto parent extra'), 'circle#extra added to g#parent');
  editor.run('undo');
  assert.equal(editor.run('tree'), before);
  editor.run('delete n1');
  for (const id of ['n1', 'n1-rect', 'n1-label', 'extra']) {
    assert.throws(() => editor.run(`show ${id}`), /no such shape/);
  }
  editor.run('undo');
  assert.equal(editor.run('tree'), before);
});

test('nested boxes move together, round-trip and degrade to regular groups', async t => {
  const editor = await editorWithBox();
  editor.run('init');
  editor.run('create box outer 0 0 100 60 Outer');
  editor.run('create box inner 10 10 60 30 Inner in outer');
  editor.run('front outer-rect');
  const before = editor.run('tree');
  editor.run('move outer 3 4');
  const moved = editor.run('tree');
  assert.match(moved, /rect#outer-rect .*x=3 y=4/);
  assert.match(moved, /rect#inner-rect .*x=13 y=14/);
  assert.match(moved, /text#inner-label .*\(33,34\) "Inner"/);
  editor.run('undo');
  assert.equal(editor.run('tree'), before);

  const file = join(temporaryDirectory(t), 'nested.svg');
  editor.run(`save "${file}"`);
  editor.run(`read "${file}"`);
  assert.equal(editor.run('tree'), before);
  assert.equal(editor.run('set outer label "New & Nested"'), 'box#outer label updated: "New & Nested"');
  assert.match(editor.run('show outer-label'), /"New & Nested"/);
  assert.match(editor.run('show inner-label'), /"Inner"/);

  const defaults = await editorWithBox({ boxEnabled: false });
  defaults.run(`read "${file}"`);
  assert.equal(defaults.run('tree'), before.replaceAll(' (box)', ''));
  assert.throws(() => defaults.run('set outer label disabled'), /unknown attribute: label/);
  assert.throws(() => defaults.run('create box disabled 0 0 10 10 disabled'), /unknown shape type: box/);
});

test('malformed box reads preserve the document and history, even with duplicate IDs', async t => {
  const editor = await editorWithBox();
  const defaults = await editorWithBox({ boxEnabled: false });
  editor.run('init');
  editor.run('create rect keep 10 10 10 10');
  editor.run('move keep 2 0');
  editor.run('undo');
  const before = editor.run('tree');
  const file = join(temporaryDirectory(t), 'broken.svg');
  const read = `read "${file}"`;
  for (const [contents, error] of [
    ['<rect id="n1-rect"/>', /expected direct child text#n1-label/],
    ['<circle id="n1-rect"/><text id="n1-label"/>', /expected direct child rect#n1-rect/],
    ['<rect id="n1-rect"/><g id="extra"><text id="n1-label"/></g>', /expected direct child text#n1-label/],
    ['<rect id="n1-rect"/><text id="n1-label"/><g id="extra"><text id="n1-label"/></g>', /id already exists: n1-label/],
  ]) {
    writeFileSync(file, `<svg><g id="n1" data-kind="box">${contents}</g></svg>`);
    assert.throws(() => editor.run(read), error);
    assert.equal(editor.run('tree'), before);
  }
  assert.throws(() => defaults.run(read), /id already exists: n1-label/);
  editor.run('redo');
  assert.match(editor.run('show keep'), /x=12/);
  editor.run('undo');
  assert.equal(editor.run('tree'), before);
});

test('box fill undo restores an absent child fill after reading an SVG', async t => {
  const file = join(temporaryDirectory(t), 'inherited.svg');
  writeFileSync(file, '<svg><g id="n1" data-kind="box" fill="blue"><rect id="n1-rect"/><text id="n1-label"/></g></svg>');
  const editor = await editorWithBox();
  editor.run(`read "${file}"`);
  assert.match(editor.run('show n1'), /fill=blue/);
  const before = editor.run('tree');
  editor.run('set n1 fill red');
  assert.match(editor.run('show n1-rect'), /fill=red/);
  assert.equal(editor.run('undo'), 'box#n1 fill unset on n1-rect');
  assert.equal(editor.run('tree'), before);
});
