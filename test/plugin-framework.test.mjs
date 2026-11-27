import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Command, Container, EditorError } from '../dist/api.js';
import { createEditor } from '../dist/host/createEditor.js';
import { PluginHost } from '../dist/host/PluginHost.js';
import BuiltinPlugin from '../dist/plugins/builtin/BuiltinPlugin.js';
import builtin from '../dist/plugins/builtin/package.json' with { type: 'json' };

class Composite extends Container {
  get kind() { return 'compound'; }
  get tagName() { return 'g'; }
  treeLabel() { return `g#${this.id}`; }
  svgAttributes() { return [['data-kind', this.kind]]; }
  assertCanUngroup() { throw new EditorError(`cannot ungroup composite shape: ${this.id}`); }
  assertCanRemove(child) {
    if (child.id === `${this.id}-part`) throw new EditorError(`required part: ${child.id}`);
  }
}

class CompositeProvider {
  name = 'compound';
  svgTag = 'g';
  createUsage = 'compound';

  create(id, args, shapes) {
    const shape = new Composite(id);
    shape.attach(shapes.create('rect', `${id}-part`, ['0', '0', '1', '1']));
    const textId = args[0] === 'duplicate' ? `${id}-part` : `${id}-text`;
    shape.attach(shapes.create('text', textId, ['0', '0', 'old']));
    return shape;
  }

  fromSvg({ id, children }) {
    if (!children.some(child => child.id === `${id}-part` && child.kind === 'rect')) {
      throw new EditorError(`missing required part: ${id}-part`);
    }
    return new Composite(id);
  }
}

class PaintHandler {
  constructor(name = 'compound-paint') { this.name = name; }

  handles(shape, attr) { return shape.kind === 'compound' && attr === 'caption'; }

  apply(shape, _attr, value, writer) {
    const [body, text] = shape.children;
    writer.set(body.id, 'fill', value);
    writer.set(text.id, 'text', value);
    if (value === 'fail') throw new Error('paint failed');
    return { applied: `applied ${value}`, undone: 'restored' };
  }
}

class TreeLabel {
  events = [];

  constructor(name) { this.name = name; }
  onDocumentEvent(event) { this.events.push(event); }
  decorate(shape) { return shape.kind === 'compound' ? this.name : undefined; }
}

class SampleCommand extends Command {
  kind = 'display';
  execute() { return 'sample ready'; }
}

class SampleDefinition {
  name = 'sample';
  help() { return '  sample     test command'; }
  create(context, args) { return new SampleCommand(context, args); }
}

class SamplePlugin {
  constructor(first, second) { Object.assign(this, { first, second }); }

  activate(context) {
    context.registerShape(new CompositeProvider());
    context.registerCommand(new SampleDefinition());
    context.registerAttribute(new PaintHandler());
    context.registerDecorator(this.first);
    context.registerDecorator(this.second);
  }
}

const manifest = {
  name: 'sample',
  contributes: {
    shapes: ['compound'], commands: ['sample'], attributes: ['compound-paint'], decorators: ['second', 'first'],
  },
};

async function setup(plugins = []) {
  const errors = [];
  const report = error => errors.push(error);
  const host = new PluginHost(report);
  assert.equal(await host.load(new BuiltinPlugin(), builtin), true);
  for (const [plugin, manifest] of plugins) assert.equal(await host.load(plugin, manifest), true, errors.join('\n'));
  const editor = createEditor(host.registrations, report);
  return { editor, errors };
}

function withTemporaryDirectory(run) {
  const directory = mkdtempSync(join(tmpdir(), 'svg-cli-framework-'));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('a registered class is invoked through each of the four extension points', async () => {
  const first = new TreeLabel('first');
  const second = new TreeLabel('second');
  const { editor, errors } = await setup([[new SamplePlugin(first, second), manifest]]);
  assert.equal(editor.run('sample'), 'sample ready');
  assert.match(editor.run('help'), /      compound\n[\s\S]+  sample     test command/);
  editor.run('init');
  editor.run('create compound node');
  const base = editor.run('tree');
  assert.match(base, /g#node first second\n/);
  assert.equal(editor.run('set node caption blue'), 'applied blue');
  assert.match(editor.run('show node-part'), /fill=blue/);
  assert.match(editor.run('show node-text'), /"blue"/);
  assert.equal(editor.run('undo'), 'restored');
  assert.equal(editor.run('tree'), base);
  assert.equal(editor.run('undo'), 'compound#node removed');
  editor.run('redo');
  assert.equal(editor.run('redo'), 'applied blue');
  assert.match(editor.run('show node-text'), /"blue"/);
  withTemporaryDirectory(directory => editor.run(`save "${join(directory, 'test.svg')}"`));
  assert.deepEqual(first.events.map(event => event.kind), ['new', 'saved']);
  assert.equal(first.events[1].document.children[0].kind, 'compound');
  assert.ok(Object.isFrozen(first.events[1].document.children));
  assert.deepEqual(errors, []);
});

test('a failing or conflicting handler preserves the content and both history stacks', async () => {
  const plugin = new SamplePlugin(new TreeLabel('first'), new TreeLabel('second'));
  const { editor } = await setup([[plugin, manifest]]);
  editor.run('init');
  editor.run('create compound node');
  editor.run('set node caption blue');
  editor.run('undo');
  const before = editor.run('tree');
  assert.throws(() => editor.run('set node caption fail'), /attribute handler compound-paint failed: paint failed/);
  assert.equal(editor.run('tree'), before);
  assert.equal(editor.run('redo'), 'applied blue');
  assert.equal(editor.run('undo'), 'restored');
  assert.equal(editor.run('undo'), 'compound#node removed');

  const conflict = { activate(context) { context.registerAttribute(new PaintHandler('other')); } };
  const other = await setup([[plugin, manifest], [conflict, { name: 'collision', contributes: { attributes: ['other'] } }]]);
  other.editor.run('init');
  other.editor.run('create compound node');
  const original = other.editor.run('tree');
  assert.throws(() => other.editor.run('set node caption red'), /conflicting attribute handlers.*compound-paint, other/);
  assert.equal(other.editor.run('tree'), original);
  assert.equal(other.editor.run('undo'), 'compound#node removed');
});

test('composite hooks preserve indexes and block partial delete, regroup and move', async () => {
  const plugin = new SamplePlugin(new TreeLabel('first'), new TreeLabel('second'));
  const { editor } = await setup([[plugin, manifest]]);
  editor.run('init');
  editor.run('create g parent');
  editor.run('create compound node in parent');
  editor.run('create circle safe 5 5 1');
  const before = editor.run('tree');
  for (const [command, error] of [
    ['delete node-part', /required part/],
    ['addto parent node-part', /required part/],
    ['group orphaned safe node-part', /required part/],
    ['ungroup node', /cannot ungroup composite shape/],
    ['create compound parent', /id already exists/],
    ['create compound duplicate duplicate', /id already exists: duplicate-part/],
  ]) {
    assert.throws(() => editor.run(command), error);
    assert.equal(editor.run('tree'), before);
  }
  assert.equal(editor.run('undo'), 'circle#safe removed');
});

test('SVG providers inspect complete decoded children, degrade by tag, and reject malformed reads', async () => {
  const plugin = new SamplePlugin(new TreeLabel('first'), new TreeLabel('second'));
  const installed = await setup([[plugin, manifest]]);
  const defaults = await setup();
  withTemporaryDirectory(directory => {
    const file = join(directory, 'test.svg');
    const svg = inner => writeFileSync(file, `<svg><g id="node" data-kind="compound">${inner}</g></svg>`);
    const read = `read "${file}"`;
    svg('<rect id="node-part" width="1" height="1"/><text id="word">hi</text>');
    installed.editor.run(read);
    defaults.editor.run(read);
    assert.match(installed.editor.run('tree'), /g#node first second/);
    assert.match(defaults.editor.run('tree'), /g#node\n.*rect#node-part/);
    assert.throws(() => defaults.editor.run('sample'), /unknown command: sample/);
    assert.throws(() => defaults.editor.run('set node caption blue'), /unknown attribute: caption/);
    assert.throws(() => defaults.editor.run('create compound ghost'), /unknown shape type: compound/);
    const before = installed.editor.run('tree');
    svg('<circle id="node-part"/>');
    assert.throws(() => installed.editor.run(read), /missing required part/);
    assert.equal(installed.editor.run('tree'), before);
    svg('<rect id="node-part"/><circle id="node-part"/>');
    assert.throws(() => installed.editor.run(read), /id already exists: node-part/);
    assert.throws(() => defaults.editor.run(read), /id already exists: node-part/);
    assert.equal(installed.editor.run('tree'), before);
  });
});
