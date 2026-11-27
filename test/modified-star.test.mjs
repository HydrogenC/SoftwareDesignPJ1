import assert from 'node:assert/strict';
import { test } from 'node:test';
import modifiedStar, { manifest } from '../dist/plugins/modified-star/ModifiedStarPlugin.js';

function decorator() {
  let registered;
  modifiedStar.activate({ registerDecorator(value) { registered = value; } });
  return registered;
}

function view(id, kind, { attributes = {}, text = null, children } = {}) {
  return Object.freeze({
    id,
    kind,
    tagName: kind,
    isContainer: children !== undefined,
    attributes: Object.freeze({ ...attributes }),
    text,
    children: Object.freeze(children ?? []),
  });
}

const canvas = (...children) => view('', 'svg', { attributes: { width: '800', height: '600' }, children });
const group = (id, ...children) => view(id, 'g', { children });
const label = text => view('label', 'text', { text });
const rect = id => view(id, 'rect', { attributes: { x: '10', fill: 'blue' } });

test('modified-star tracks new, edited, saved and restored snapshots', () => {
  const star = decorator();
  assert.deepEqual(manifest.contributes.decorators, [star.name]);
  const blank = canvas();
  star.onDocumentEvent({ kind: 'new', document: blank });
  assert.equal(star.decorate(blank), '*');

  const oldLabel = label('Original');
  const sibling = rect('sibling');
  const baseline = canvas(group('group', oldLabel, sibling));
  assert.equal(star.decorate(baseline), '*');
  assert.equal(star.decorate(oldLabel), '*');
  star.onDocumentEvent({ kind: 'saved', document: baseline });
  assert.equal(star.decorate(baseline), undefined);
  assert.equal(star.decorate(oldLabel), undefined);

  const edit = label('Edited');
  const editedGroup = group('group', edit, sibling);
  const edited = canvas(editedGroup);
  assert.equal(star.decorate(edited), '*');
  assert.equal(star.decorate(editedGroup), '*');
  assert.equal(star.decorate(edit), '*');
  assert.equal(star.decorate(sibling), undefined);

  const restored = canvas(group('group', label('Original'), rect('sibling')));
  assert.equal(star.decorate(restored), undefined);
  assert.equal(star.decorate(restored.children[0]), undefined);
  assert.equal(star.decorate(edited), '*');
});

test('modified-star compares child order and membership and keeps unaffected rows clean', () => {
  const star = decorator();
  const first = rect('first');
  const second = rect('second');
  const left = group('left', first, second);
  const right = group('right');
  const baseline = canvas(left, right);
  star.onDocumentEvent({ kind: 'read', document: baseline });
  assert.equal(star.decorate(baseline), undefined);

  const swapped = group('left', second, first);
  const removed = group('left', first);
  const reparented = group('right', second);
  for (const changedGroup of [swapped, removed, reparented]) assert.equal(star.decorate(changedGroup), '*');
  assert.equal(star.decorate(canvas(removed, reparented)), '*');
  assert.equal(star.decorate(first), undefined);
  assert.equal(star.decorate(second), undefined);
  assert.equal(star.decorate(right), undefined);

  const newRect = rect('new');
  assert.equal(star.decorate(newRect), '*');
  assert.equal(star.decorate(canvas(group('left', first, second, newRect), right)), '*');
});

test('modified-star snapshots ignore attribute order and are isolated by activation', () => {
  const saved = decorator();
  const other = decorator();
  const original = canvas(rect('body'));
  const same = canvas(view('body', 'rect', { attributes: { fill: 'blue', x: '10' } }));
  const updated = canvas(view('body', 'rect', { attributes: { fill: 'red', x: '10' } }));
  const resized = view('', 'svg', { attributes: { width: '640', height: '480' }, children: same.children });
  saved.onDocumentEvent({ kind: 'saved', document: original });
  assert.equal(saved.decorate(same), undefined);
  assert.equal(saved.decorate(updated), '*');
  assert.equal(saved.decorate(resized), '*');
  assert.equal(other.decorate(same), '*');

  other.onDocumentEvent({ kind: 'read', document: updated });
  assert.equal(other.decorate(updated), undefined);
  assert.equal(saved.decorate(updated), '*');
  saved.onDocumentEvent({ kind: 'new', document: same });
  assert.equal(saved.decorate(same), '*');
  assert.equal(other.decorate(updated), undefined);
});
