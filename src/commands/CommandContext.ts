import type { AttributeEdit } from '../extensions/AttributeEdit.js';
import type { SvgReader } from '../io/SvgReader.js';
import type { SvgWriter } from '../io/SvgWriter.js';
import type { ShapeFactory } from '../registry/ShapeFactory.js';
import type { Document } from '../svg/Document.js';
import type { Shape } from '../svg/Shape.js';

export interface CommandContext {
  readonly document: Document | null;
  readonly path: string | null;
  readonly factory: Pick<ShapeFactory, 'create' | 'usages'>;
  readonly reader: Pick<SvgReader, 'read'>;
  readonly writer: Pick<SvgWriter, 'save'>;
  readonly renderTree: (root: Shape) => string;
  requireDocument(): Document;
  open(document: Document, path: string | null): void;
  markSaved(path: string): void;
  setAttribute(id: string, attr: string, value: string): AttributeEdit;
  helpLines(): string[];
  undo(): string;
  redo(): string;
}
