const assert = require('node:assert/strict');
const { test } = require('node:test');
const { SvgOutlineParser } = require('../dist/SvgOutlineParser.js');

const parser = new SvgOutlineParser();

test('reports nested SVG elements, optional IDs, and UTF-16 source ranges', () => {
  const source = [
    '<?xml version="1.0"?>',
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '  <!-- A comment containing <rect id="ignored"/> -->',
    '  <g id="flow"><g id="node&amp;1">',
    '    <text><![CDATA[<notAnElement/>]]>开始🙂</text><rect id="start" />',
    '  </g></g>',
    '</svg>',
  ].join('\r\n');
  const root = parser.parse(source);
  const [flow] = root.children;
  const [node] = flow.children;
  const [label, rect] = node.children;

  assert.deepEqual([root.name, flow.name, node.name, label.name, rect.name], ['svg', 'g', 'g', 'text', 'rect']);
  assert.deepEqual([root.id, flow.id, node.id, label.id, rect.id], [undefined, 'flow', 'node&1', undefined, 'start']);
  assert.deepEqual(node.children.map(({ name }) => name), ['text', 'rect']);
  assert.equal(source.slice(root.start, root.end), source.slice(source.indexOf('<svg')));
  assert.equal(source.slice(label.start, label.end), '<text><![CDATA[<notAnElement/>]]>开始🙂</text>');
  assert.equal(source.slice(rect.start, rect.end), '<rect id="start" />');
});

test('clears an incomplete or malformed outline and accepts the next valid edit', () => {
  assert.equal(parser.parse('<svg><rect id="old"/></svg>').children[0].id, 'old');
  for (const source of ['<svg><rect id="', '<svg><g></svg>', '<svg/><svg/>', '']) {
    assert.equal(parser.parse(source), undefined, source);
  }
  assert.equal(parser.parse('<svg><rect id="new"/></svg>').children[0].id, 'new');
});

test('accepts an SVG namespace prefix and ignores other XML roots', () => {
  const source = '<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:path/></s:svg>';
  const root = parser.parse(source);
  assert.equal(root.name, 's:svg');
  assert.equal(root.children[0].name, 's:path');
  assert.equal(parser.parse('<svg xmlns="urn:other"/>'), undefined);
  assert.equal(parser.parse('<other/>'), undefined);
});
