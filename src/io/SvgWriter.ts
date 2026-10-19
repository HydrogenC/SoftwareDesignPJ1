import { writeFileSync } from 'node:fs';
import type { Document } from '../svg/Document.js';
import type { Shape } from '../svg/Shape.js';
import { EditorError } from '../svg/EditorError.js';

const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string): string => escapeText(value).replace(/"/g, '&quot;');

const formatAttributes = (attrs: Array<[string, string]>): string =>
  attrs.map(([name, value]) => `${name}="${escapeAttribute(value)}"`).join(' ');

export class SvgWriter {
  render(document: Document): string {
    const root: Array<[string, string]> = [
      ['xmlns', 'http://www.w3.org/2000/svg'],
      ...document.svgAttributes(),
    ];
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>', `<svg ${formatAttributes(root)}>`];
    for (const child of document.children) this.#writeShape(child, 1, lines);
    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  save(document: Document, path: string): void {
    try {
      writeFileSync(path, this.render(document), 'utf8');
    } catch {
      throw new EditorError(`cannot write file: ${path}`);
    }
  }

  #writeShape(shape: Shape, depth: number, lines: string[]): void {
    const pad = '  '.repeat(depth);
    const attrs: Array<[string, string]> = [['id', shape.id], ...shape.svgAttributes()];
    const open = `${pad}<${shape.tagName} ${formatAttributes(attrs)}`;
    const text = shape.svgText();

    if (text !== null) {
      lines.push(`${open}>${escapeText(text)}</${shape.tagName}>`);
      return;
    }

    if (shape.children.length === 0) {
      lines.push(`${open}/>`);
      return;
    }

    lines.push(`${open}>`);
    for (const child of shape.children) this.#writeShape(child, depth + 1, lines);
    lines.push(`${pad}</${shape.tagName}>`);
  }
}
