import type { Document } from '../svg/Document.js';
import type { Shape } from '../svg/Shape.js';
import type { ShapeFactory } from '../registry/ShapeFactory.js';
import type { SvgReader } from '../io/SvgReader.js';
import type { SvgWriter } from '../io/SvgWriter.js';
import { EditorError } from '../svg/EditorError.js';

/** 命令层共享的会话状态与协作对象；当前文档与路径随 init / read / save 变化。 */
export class CommandContext {
  #document: Document | null = null;
  #path: string | null = null;

  constructor(
    readonly factory: ShapeFactory,
    readonly reader: SvgReader,
    readonly writer: SvgWriter,
    readonly renderTree: (root: Shape) => string,
  ) {}

  get document(): Document | null {
    return this.#document;
  }

  get path(): string | null {
    return this.#path;
  }

  requireDocument(): Document {
    if (this.#document === null) throw new EditorError(`no document. use 'init' or 'read' first`);
    return this.#document;
  }

  open(document: Document, path: string | null): void {
    this.#document = document;
    this.#path = path;
  }

  setPath(path: string): void {
    this.#path = path;
  }
}
