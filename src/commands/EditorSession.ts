import type { CommandHistory } from '../cli/CommandHistory.js';
import { AttributeEdit } from '../extensions/AttributeEdit.js';
import { invokeExtension } from '../extensions/invokeExtension.js';
import type { Registrations } from '../extensions/Registrations.js';
import { viewShape } from '../extensions/ShapeView.js';
import type { DocumentEvent } from '../extensions/TreeDecorator.js';
import type { SvgReader } from '../io/SvgReader.js';
import type { SvgWriter } from '../io/SvgWriter.js';
import type { ShapeFactory } from '../registry/ShapeFactory.js';
import type { Document } from '../svg/Document.js';
import { EditorError } from '../svg/EditorError.js';
import type { Shape } from '../svg/Shape.js';
import type { CommandContext } from './CommandContext.js';

interface Services {
  readonly factory: ShapeFactory;
  readonly reader: SvgReader;
  readonly writer: SvgWriter;
  readonly renderTree: (root: Shape) => string;
  readonly history: CommandHistory;
  readonly registrations: Registrations;
  readonly report: (error: string) => void;
}

export class EditorSession implements CommandContext {
  #document: Document | null = null;
  #path: string | null = null;

  constructor(private readonly services: Services) {}

  get factory(): ShapeFactory { return this.services.factory; }
  get reader(): SvgReader { return this.services.reader; }
  get writer(): SvgWriter { return this.services.writer; }
  get renderTree(): (root: Shape) => string { return this.services.renderTree; }

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
    this.#publish(path === null ? 'new' : 'read', document);
  }

  markSaved(path: string): void {
    this.#path = path;
    this.#publish('saved', this.requireDocument());
  }

  setAttribute(id: string, attr: string, value: string): AttributeEdit {
    return AttributeEdit.apply(this.requireDocument(), this.services.registrations.attributes.values(), id, attr, value);
  }

  helpLines(): string[] {
    return [...this.services.registrations.commands.values()].map(command =>
      invokeExtension('command', command.name, () => {
        const line = command.help(this);
        if (typeof line !== 'string') throw new TypeError('help must return a string');
        return line;
      }),
    );
  }

  undo(): string {
    this.requireDocument();
    return this.services.history.undo();
  }

  redo(): string {
    this.requireDocument();
    return this.services.history.redo();
  }

  #publish(kind: DocumentEvent['kind'], document: Document): void {
    const listeners = [...this.services.registrations.decorators.values()].filter(decorator => decorator.onDocumentEvent);
    if (listeners.length === 0) return;
    const event = Object.freeze({ kind, document: viewShape(document) });
    for (const listener of listeners) {
      try {
        invokeExtension('tree decorator', listener.name, () => listener.onDocumentEvent?.(event));
      } catch (error) {
        this.services.report(`error: ${(error as EditorError).message}`);
      }
    }
  }
}
