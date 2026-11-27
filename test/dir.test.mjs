import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DirPlugin } from '../dist/plugins/dir/DirPlugin.js';

const path = join(tmpdir(), 'svg-dir-example');

function dirFor(list, args = []) {
  const directory = {
    currentPath: () => path,
    list(target) {
      assert.equal(target, path);
      return list();
    },
  };
  let definition;
  new DirPlugin(directory).activate({ registerCommand: command => { definition = command; } });
  return definition.create({}, args);
}

test('dir groups and sorts entries consistently, including hidden names', () => {
  const entries = [
    { name: 'zeta', isDirectory: false },
    { name: '.', isDirectory: true },
    { name: 'src', isDirectory: true },
    { name: '.cache', isDirectory: true },
    { name: 'Alpha', isDirectory: false },
    { name: 'alpha', isDirectory: false },
    { name: '..', isDirectory: true },
    { name: '.env', isDirectory: false },
  ];
  const expected = '[DIR]  .cache\n[DIR]  src\n[FILE]  .env\n[FILE]  Alpha\n[FILE]  alpha\n[FILE]  zeta';
  const command = dirFor(() => entries);
  assert.equal(command.kind, 'display');
  assert.equal(command.execute(), expected);
  assert.equal(dirFor(() => [...entries].reverse()).execute(), expected);
});

test('dir handles an empty directory and a read failure, then can retry', () => {
  let fail = true;
  const command = dirFor(() => {
    if (fail) throw new Error('permission denied');
    return [];
  });
  assert.throws(() => command.execute(), { message: `cannot read directory: ${path}` });
  fail = false;
  assert.equal(command.execute(), '(empty directory)');
});

test('dir rejects arguments before accessing the directory', () => {
  const command = dirFor(() => assert.fail('unexpected directory read'), ['elsewhere']);
  assert.throws(() => command.execute(), { message: 'usage: dir' });
});
