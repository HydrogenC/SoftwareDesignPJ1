import type { Document } from '../svg/Document.js';
import { EditorError } from '../svg/EditorError.js';
import type { AttributeFeedback, AttributeHandler, AttributeWriter } from './AttributeHandler.js';
import { invokeExtension } from './invokeExtension.js';
import { viewShape } from './ShapeView.js';

interface Change {
  readonly id: string;
  readonly attr: string;
  readonly before: string | undefined;
  readonly after: string | undefined;
}

export class AttributeEdit {
  private constructor(
    private readonly changes: readonly Change[],
    readonly previous: string | undefined,
    readonly feedback: AttributeFeedback | undefined,
  ) {}

  static apply(
    document: Document,
    handlers: Iterable<AttributeHandler>,
    id: string,
    attr: string,
    value: string,
  ): AttributeEdit {
    const target = document.lookup(id);
    const previous = target.getAttribute(attr);
    const registered = [...handlers];
    const view = registered.length === 0 ? undefined : viewShape(target);
    const matches = view === undefined ? [] : registered.filter(handler =>
      invokeExtension('attribute handler', handler.name, () => {
        const result = handler.handles(view, attr);
        if (typeof result !== 'boolean') throw new TypeError('handles must return a boolean');
        return result;
      }),
    );
    if (matches.length > 1) {
      throw new EditorError(`conflicting attribute handlers for ${id}/${attr}: ${matches.map(h => h.name).join(', ')}`);
    }

    const changes: Change[] = [];
    let active = true;
    const writer: AttributeWriter = {
      set(childId, property, next) {
        if (!active) throw new EditorError('attribute transaction is closed');
        const shape = document.lookup(childId);
        if (shape !== target && !document.isAncestor(target, shape)) {
          throw new EditorError(`attribute transaction cannot edit shape outside ${id}: ${childId}`);
        }
        const before = shape.getAttribute(property);
        shape.set(property, next);
        changes.push({ id: childId, attr: property, before, after: next });
      },
    };

    try {
      const handler = matches[0];
      if (handler === undefined || view === undefined) {
        writer.set(id, attr, value);
        return new AttributeEdit(changes, previous, undefined);
      }
      const feedback = invokeExtension('attribute handler', handler.name, () => {
        const result = handler.apply(view, attr, value, writer);
        if (result === undefined) return undefined;
        if (typeof result?.applied !== 'string' || typeof result.undone !== 'string') {
          throw new TypeError('expected applied and undone feedback strings');
        }
        return { applied: result.applied, undone: result.undone };
      });
      return new AttributeEdit(changes, previous, feedback);
    } catch (error) {
      AttributeEdit.restore(document, [...changes].reverse(), 'before');
      throw error;
    } finally {
      active = false;
    }
  }

  undo(document: Document): void {
    AttributeEdit.restore(document, [...this.changes].reverse(), 'before');
  }

  redo(document: Document): void {
    AttributeEdit.restore(document, this.changes, 'after');
  }

  private static restore(document: Document, changes: readonly Change[], side: 'before' | 'after'): void {
    for (const change of changes) {
      const shape = document.lookup(change.id);
      const value = change[side];
      if (value === undefined) shape.unsetAttribute(change.attr);
      else shape.set(change.attr, value);
    }
  }
}
