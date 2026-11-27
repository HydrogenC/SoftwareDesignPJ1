import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const transcripts = new URL('../doc/transcript/', import.meta.url);
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const sessions = [
  { name: 'cli-1', inputs: ['other.svg'], outputs: ['demo.svg'] },
  { name: 'flowchart-phase1', inputs: [], outputs: ['flowchart.svg'] },
  { name: 'phase1-commands', inputs: ['other.svg'], outputs: [] },
];

function assertBytesEqual(actual, expected, label) {
  if (actual.equals(expected)) return;
  assert.equal(actual.toString('utf8'), expected.toString('utf8'), label);
  assert.fail(`${label} has different bytes`);
}

for (const { name, inputs, outputs } of sessions) {
  for (const mode of ['code', 'config']) {
    test(`Phase 1 baseline: ${name} (${mode})`, () => replay(name, inputs, outputs, mode));
  }
}

function replay(name, inputs, outputs, mode) {
  const cwd = mkdtempSync(join(tmpdir(), 'svg-cli-baseline-'));
  try {
    for (const file of inputs) {
      copyFileSync(new URL(`input/${file}`, transcripts), join(cwd, file));
    }
    const config = 'plugins.config.json';
    writeFileSync(join(cwd, config), '{"plugins":[]}');

    const args = mode === 'config' ? ['--config', config] : ['--no-plugins'];
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd,
      input: readFileSync(new URL(`${name}.txt`, transcripts)),
      timeout: 10_000,
    });
    if (result.error) throw result.error;
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr.toString('utf8'));
    assert.equal(result.stderr.length, 0, result.stderr.toString('utf8'));
    assertBytesEqual(
      result.stdout,
      readFileSync(new URL(`expected/${name}.stdout.txt`, transcripts)),
      `${name} stdout`,
    );

    for (const file of outputs) {
      assertBytesEqual(
        readFileSync(join(cwd, file)),
        readFileSync(new URL(`expected/${file}`, transcripts)),
        `${name} saved ${file}`,
      );
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}
