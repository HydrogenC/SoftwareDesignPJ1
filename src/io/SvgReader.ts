import { readFileSync } from 'node:fs';
import { Document } from '../svg/Document.js';
import { EditorError } from '../svg/EditorError.js';
import type { ShapeFactory, SvgAttributes } from '../registry/ShapeFactory.js';

interface XmlNode {
  tag: string;
  attrs: SvgAttributes;
  text: string;
  children: XmlNode[];
}

export interface ReadResult {
  document: Document;
  warnings: string[];
}

const NAME_CHAR = /[A-Za-z0-9:_-]/;

const decodeEntities = (value: string): string =>
  value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole: string, body: string) => {
    if (body.startsWith('#x')) return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    switch (body) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        return whole;
    }
  });

export class SvgReader {
  readonly #factory: ShapeFactory;
  #src = '';
  #pos = 0;
  #warnings: string[] = [];
  #counters = new Map<string, number>();

  constructor(factory: ShapeFactory) {
    this.#factory = factory;
  }

  read(path: string): ReadResult {
    try {
      this.#src = readFileSync(path, 'utf8');
    } catch {
      throw new EditorError(`cannot read file: ${path}`);
    }

    this.#pos = 0;
    let root: XmlNode;
    try {
      root = this.#parseDocument();
    } catch {
      throw new EditorError(`cannot read file: ${path}`);
    }
    if (root.tag !== 'svg') throw new EditorError(`cannot read file: ${path}`);

    const document = new Document(this.#size(root, 'width', 800), this.#size(root, 'height', 600));
    this.#warnings = [];
    this.#counters = new Map();
    this.#fill(root, document, undefined);
    return { document, warnings: this.#warnings };
  }

  #fill(node: XmlNode, document: Document, parentId: string | undefined): void {
    for (const child of node.children) {
      if (!this.#factory.supports(child.tag)) continue;

      let id = child.attrs.id;
      if (id === undefined || id === '') {
        id = this.#nextId(child.tag, document);
        this.#warnings.push(`assigned id ${id} to unnamed <${child.tag}>`);
      }

      const shape = this.#factory.fromSvg(child.tag, id, child.attrs, child.text.trim());
      document.add(shape, parentId);
      this.#fill(child, document, id);
    }
  }

  #size(root: XmlNode, name: 'width' | 'height', fallback: number): number {
    const raw = root.attrs[name];
    const value = raw === undefined ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  #nextId(tag: string, document: Document): string {
    let n = this.#counters.get(tag) ?? 0;
    let id: string;
    do {
      n += 1;
      id = `${tag}${n}`;
    } while (document.has(id));
    this.#counters.set(tag, n);
    return id;
  }

  #parseDocument(): XmlNode {
    this.#skipMisc();
    const root = this.#parseElement();
    this.#skipMisc();
    return root;
  }

  #skipMisc(): void {
    for (;;) {
      this.#skipWhitespace();
      if (this.#src.startsWith('<?', this.#pos)) {
        this.#skipPast('?>');
      } else if (this.#src.startsWith('<!--', this.#pos)) {
        this.#skipPast('-->');
      } else if (this.#src.startsWith('<!', this.#pos)) {
        this.#skipPast('>');
      } else {
        return;
      }
    }
  }

  #skipPast(marker: string): void {
    const end = this.#src.indexOf(marker, this.#pos);
    if (end < 0) throw new Error('unexpected end of input');
    this.#pos = end + marker.length;
  }

  #skipWhitespace(): void {
    while (this.#pos < this.#src.length && /\s/.test(this.#src[this.#pos]!)) this.#pos += 1;
  }

  #parseElement(): XmlNode {
    this.#expect('<');
    const tag = this.#readName();
    const attrs = this.#parseAttributes();

    if (this.#src.startsWith('/>', this.#pos)) {
      this.#pos += 2;
      return { tag, attrs, text: '', children: [] };
    }

    this.#expect('>');
    const children: XmlNode[] = [];
    let text = '';

    for (;;) {
      if (this.#pos >= this.#src.length) throw new Error('unexpected end of input');
      if (this.#src.startsWith('</', this.#pos)) {
        this.#pos += 2;
        const closing = this.#readName();
        this.#skipWhitespace();
        this.#expect('>');
        if (closing !== tag) throw new Error('mismatched tag');
        return { tag, attrs, text: decodeEntities(text), children };
      }
      if (this.#src.startsWith('<!--', this.#pos)) {
        this.#skipPast('-->');
        continue;
      }
      if (this.#src[this.#pos] === '<') {
        children.push(this.#parseElement());
        continue;
      }

      const next = this.#src.indexOf('<', this.#pos);
      const end = next < 0 ? this.#src.length : next;
      text += this.#src.slice(this.#pos, end);
      this.#pos = end;
    }
  }

  #parseAttributes(): SvgAttributes {
    const attrs: SvgAttributes = {};
    for (;;) {
      this.#skipWhitespace();
      if (this.#src.startsWith('/>', this.#pos)) return attrs;
      if (this.#src[this.#pos] === '>') return attrs;

      const name = this.#readName();
      this.#skipWhitespace();
      this.#expect('=');
      this.#skipWhitespace();

      const quote = this.#src[this.#pos];
      if (quote !== '"' && quote !== "'") throw new Error('unquoted attribute');
      this.#pos += 1;
      const end = this.#src.indexOf(quote, this.#pos);
      if (end < 0) throw new Error('unterminated attribute');
      attrs[name] = decodeEntities(this.#src.slice(this.#pos, end));
      this.#pos = end + 1;
    }
  }

  #readName(): string {
    const start = this.#pos;
    while (this.#pos < this.#src.length && NAME_CHAR.test(this.#src[this.#pos]!)) this.#pos += 1;
    if (this.#pos === start) throw new Error('expected a name');
    return this.#src.slice(start, this.#pos);
  }

  #expect(char: string): void {
    if (!this.#src.startsWith(char, this.#pos)) throw new Error(`expected "${char}"`);
    this.#pos += char.length;
  }
}
