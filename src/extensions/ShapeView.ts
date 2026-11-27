import type { Shape } from '../svg/Shape.js';

export interface ShapeView {
  readonly id: string;
  readonly kind: string;
  readonly tagName: string;
  readonly isContainer: boolean;
  readonly attributes: Readonly<Record<string, string>>;
  readonly text: string | null;
  readonly children: readonly ShapeView[];
}

export function viewShape(shape: Shape): ShapeView {
  return Object.freeze({
    id: shape.id,
    kind: shape.kind,
    tagName: shape.tagName,
    isContainer: shape.asContainer() !== null,
    attributes: Object.freeze(Object.fromEntries(shape.svgAttributes())),
    text: shape.svgText(),
    children: Object.freeze(shape.children.map(viewShape)),
  });
}
