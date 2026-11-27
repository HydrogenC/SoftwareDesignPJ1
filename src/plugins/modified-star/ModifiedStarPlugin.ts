import type { DocumentEvent, Plugin, PluginContext, ShapeView, TreeDecorator } from '../../api.js';

export { default as manifest } from './package.json' with { type: 'json' };

function sameAttributes(before: ShapeView['attributes'], after: ShapeView['attributes']): boolean {
  const entries = Object.entries(after);
  return Object.keys(before).length === entries.length &&
    entries.every(([name, value]) => Object.hasOwn(before, name) && before[name] === value);
}

class ModifiedStar implements TreeDecorator {
  readonly name = 'modified-star';
  readonly #baseline = new Map<string, ShapeView>();
  #changes = new WeakMap<ShapeView, boolean>();

  onDocumentEvent({ kind, document }: DocumentEvent): void {
    this.#baseline.clear();
    this.#changes = new WeakMap();
    if (kind !== 'new') this.#remember(document);
  }

  decorate(shape: ShapeView): string | undefined {
    return this.#changed(shape) ? '*' : undefined;
  }

  #remember(shape: ShapeView): void {
    this.#baseline.set(shape.id, shape);
    for (const child of shape.children) this.#remember(child);
  }

  #changed(shape: ShapeView): boolean {
    // Each tree rendering shares its immutable views between the container and child rows.
    const cached = this.#changes.get(shape);
    if (cached !== undefined) return cached;

    const before = this.#baseline.get(shape.id);
    const changed = before === undefined ||
      before.kind !== shape.kind ||
      before.tagName !== shape.tagName ||
      before.isContainer !== shape.isContainer ||
      before.text !== shape.text ||
      !sameAttributes(before.attributes, shape.attributes) ||
      before.children.length !== shape.children.length ||
      shape.children.some((child, index) => before.children[index]?.id !== child.id || this.#changed(child));
    this.#changes.set(shape, changed);
    return changed;
  }
}

class ModifiedStarPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.registerDecorator(new ModifiedStar());
  }
}

export default new ModifiedStarPlugin();
