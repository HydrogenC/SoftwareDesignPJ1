import { invokeExtension } from '../extensions/invokeExtension.js';
import type { ShapeCreationContext, ShapeProvider, SvgAttributes, SvgShapeInput } from '../extensions/ShapeProvider.js';
import { EditorError } from '../svg/EditorError.js';
import { Shape } from '../svg/Shape.js';

export class ShapeFactory implements ShapeCreationContext {
  constructor(private readonly providers: ReadonlyMap<string, ShapeProvider>) {}

  create(type: string, id: string, args: readonly string[]): Shape {
    const provider = this.providers.get(type);
    if (provider === undefined) throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return this.#build(provider, id, () => provider.create(id, args, this));
  }

  forSvg(tag: string, attrs: SvgAttributes): ShapeProvider | undefined {
    const kind = attrs['data-kind'];
    const specialized = kind === undefined ? undefined : this.providers.get(kind);
    if (specialized?.svgTag === tag) return specialized;
    const fallback = this.providers.get(tag);
    return fallback?.svgTag === tag ? fallback : undefined;
  }

  fromSvg(provider: ShapeProvider, input: SvgShapeInput): Shape {
    const shape = this.#build(provider, input.id, () => {
      const result = provider.fromSvg(input);
      if (result instanceof Shape && result.children.length !== 0) {
        throw new TypeError('fromSvg must return a shape without attached children');
      }
      return result;
    });
    for (const child of input.children) shape.attach(child);
    return shape;
  }

  usages(): string[] {
    return [...this.providers.values()].flatMap(provider => provider.createUsage ?? []);
  }

  #build(provider: ShapeProvider, id: string, construct: () => Shape): Shape {
    return invokeExtension('shape provider', provider.name, () => {
      const shape = construct();
      if (!(shape instanceof Shape) || shape.id !== id || shape.kind !== provider.name ||
          shape.tagName !== provider.svgTag || shape.parent !== null) {
        throw new TypeError('expected a detached shape with the requested id, kind and SVG tag');
      }
      return shape;
    });
  }
}
