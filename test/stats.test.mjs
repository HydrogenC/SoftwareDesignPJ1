import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Container, Document, Shape } from '../dist/api.js';
import stats from '../dist/plugins/stats/StatsPlugin.js';

class Leaf extends Shape {
  constructor(id, kind) {
    super(id);
    this.type = kind;
  }

  get tagName() { return this.type; }
}

class GroupLike extends Container {
  constructor(id, kind = 'g') {
    super(id);
    this.type = kind;
  }

  get tagName() { return 'g'; }
  get kind() { return this.type; }
}

function statsFor(document, args = []) {
  let definition;
  stats.activate({ registerCommand: command => { definition = command; } });
  return definition.create({ requireDocument: () => document }, args);
}

test('stats counts depth-first by first occurrence, including leaves inside a composite shape', () => {
  const document = new Document(100, 100);
  document.add(new GroupLike('outer'));
  document.add(new GroupLike('node', 'box'), 'outer');
  document.add(new Leaf('node-rect', 'rect'), 'node');
  document.add(new Leaf('node-label', 'text'), 'node');
  document.add(new Leaf('circle', 'circle'), 'outer');
  document.add(new Leaf('rect', 'rect'));
  document.add(new GroupLike('empty'));

  const command = statsFor(document);
  assert.equal(command.kind, 'display');
  assert.equal(command.execute(), 'rect: 2  text: 1  circle: 1  (total 4, containers 3)');
});

test('stats excludes the root and rejects arguments', () => {
  const document = new Document(100, 100);
  assert.equal(statsFor(document).execute(), '(total 0, containers 0)');
  assert.throws(() => statsFor(document, ['extra']).execute(), { message: 'usage: stats' });
});
