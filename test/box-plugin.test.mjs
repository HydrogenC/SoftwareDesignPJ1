import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Shape } from '../dist/api.js';
import box, { manifest } from '../dist/plugins/box/BoxPlugin.js';

class Part extends Shape {
  constructor(id, type) {
    super(id);
    this.type = type;
  }

  get tagName() { return this.type; }
}

function extensions() {
  const registered = {};
  box.activate({
    registerShape(provider) { registered.provider = provider; },
    registerAttribute(handler) { registered.handler = handler; },
    registerDecorator(decorator) { registered.decorator = decorator; },
  });
  return registered;
}

test('box contributions match the manifest and create parts through the public context', () => {
  const { provider, handler, decorator } = extensions();
  assert.deepEqual(manifest.contributes, {
    shapes: [provider.name],
    attributes: [handler.name],
    decorators: [decorator.name],
  });

  const requests = [];
  const shapes = {
    create(type, id, args) {
      requests.push([type, id, args]);
      return new Part(id, type);
    },
  };
  assert.throws(() => provider.create('node', ['120', '100', '160', '60'], shapes), /usage: create box/);
  assert.deepEqual(requests, []);
  const shape = provider.create('node', ['120', '100', '160', '60', '开始'], shapes);
  assert.deepEqual(requests, [
    ['rect', 'node-rect', ['120', '100', '160', '60', '#4a90d9']],
    ['text', 'node-label', ['140', '135', '开始']],
  ]);
  assert.deepEqual(shape.children.map(part => part.id), ['node-rect', 'node-label']);
  assert.equal(shape.label(), 'box#node');
  assert.equal(shape.treeLabel(), 'g#node');
  assert.equal(shape.tagName, provider.svgTag);
  assert.deepEqual(shape.svgAttributes(), [['data-kind', 'box']]);
  assert.equal(decorator.decorate({ kind: 'box' }), '(box)');
  assert.equal(decorator.decorate({ kind: 'g' }), undefined);
});

test('box provider validates decoded children and leaves attachment to the reader', () => {
  const { provider } = extensions();
  const input = { id: 'node', attrs: { stroke: 'black' }, text: '' };
  const body = new Part('node-rect', 'rect');
  const label = new Part('node-label', 'text');
  const extra = new Part('extra', 'line');
  const shape = provider.fromSvg({ ...input, children: [label, extra, body] });
  assert.deepEqual(shape.children, []);
  assert.equal(body.parent, null);
  assert.deepEqual(shape.svgAttributes(), [['data-kind', 'box'], ['stroke', 'black']]);
  assert.throws(() => provider.fromSvg({ ...input, children: [body] }), /expected direct child text#node-label/);
  assert.throws(() => provider.fromSvg({
    ...input,
    children: [new Part('node-rect', 'circle'), label],
  }), /expected direct child rect#node-rect/);
});

test('box attribute handlers write the selected child ID through the provided writer', () => {
  const { handler } = extensions();
  const shape = {
    id: 'node',
    kind: 'box',
    children: [
      { id: 'node-label', kind: 'text', tagName: 'text', text: '旧标题' },
      { id: 'node-rect', kind: 'rect', tagName: 'rect', attributes: { fill: '#4a90d9' } },
    ],
  };
  assert.equal(handler.handles(shape, 'fill'), true);
  assert.equal(handler.handles(shape, 'label'), true);
  assert.equal(handler.handles(shape, 'stroke'), false);
  assert.equal(handler.handles({ kind: 'rect' }, 'fill'), false);
  const writes = [];
  const writer = { set(...change) { writes.push(change); } };
  assert.deepEqual(handler.apply(shape, 'fill', '#f5a623', writer), {
    applied: 'box#node fill propagated to node-rect',
    undone: 'box#node fill restored on node-rect: #4a90d9',
  });
  assert.deepEqual(handler.apply(shape, 'label', '新标题', writer), {
    applied: 'box#node label updated: "新标题"',
    undone: 'box#node label restored: "旧标题"',
  });
  assert.deepEqual(writes, [
    ['node-rect', 'fill', '#f5a623'],
    ['node-label', 'text', '新标题'],
  ]);
});
