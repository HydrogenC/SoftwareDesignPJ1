const assert = require('node:assert/strict');
const { mkdtemp, mkdir, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const vscode = require('vscode');
const { SvgFileDecorationProvider } = require('../dist/SvgFileDecorationProvider.js');

async function run() {
  await vscode.extensions.getExtension('svgframe.svg-explorer-outline').activate();
  const dir = await mkdtemp(join(tmpdir(), 'svg-vscode-test-'));
  const decorations = new SvgFileDecorationProvider();
  const cancellation = new vscode.CancellationTokenSource();
  try {
    const uri = vscode.Uri.file(join(dir, 'example.svg'));
    const folder = vscode.Uri.file(join(dir, 'folder.svg'));
    const plain = vscode.Uri.file(join(dir, 'plain.txt'));
    const source = '<svg>\n  <g id="node">\n    <rect id="start"/><text>开始</text>\n  </g>\n</svg>';
    await Promise.all([writeFile(uri.fsPath, source), mkdir(folder.fsPath), writeFile(plain.fsPath, 'plain')]);
    const badge = target => decorations.provideFileDecoration(target, cancellation.token);
    assert.equal((await badge(uri)).badge, '[]');
    assert.equal(await badge(folder), undefined);
    assert.equal(await badge(plain), undefined);

    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.commands.executeCommand('vscode.open', uri);
    assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), uri.toString());
    const outline = () => vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
    const [root] = await outline();
    const [group] = root.children;
    assert.equal(root.name, 'svg');
    assert.equal(group.name, 'g#node');
    assert.deepEqual(group.children.map(({ name }) => name), ['rect#start', 'text']);
    const [rect] = group.children;
    assert.equal(rect.selectionRange.start.line, 2);
    assert.equal(document.getText(rect.selectionRange), 'rect');
    assert.equal(document.getText(rect.range), '<rect id="start"/>');

    const replace = async (text) => {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text);
      assert.equal(await vscode.workspace.applyEdit(edit), true);
    };
    await replace('<svg><g id="edited"/>');
    assert.deepEqual((await outline()) ?? [], []);
    await replace('<svg><g id="edited"/></svg>');
    assert.equal((await outline())[0].children[0].name, 'g#edited');
    assert.equal(document.isDirty, true);
    await replace(source);
  } finally {
    cancellation.dispose();
    decorations.dispose();
    await rm(dir, { recursive: true, force: true });
  }
  console.log('SVG Extension Host assertions passed');
}

module.exports = { run };
