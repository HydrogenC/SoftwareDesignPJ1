import type { Shape } from '../svg/Shape.js';

export type SvgAttributes = Readonly<Record<string, string>>;

export interface SvgShapeInput {
  readonly id: string;
  readonly attrs: SvgAttributes;
  readonly text: string;
  readonly children: readonly Shape[];
}

export interface ShapeCreationContext {
  create(type: string, id: string, args: readonly string[]): Shape;
}

export interface ShapeProvider {
  readonly name: string;
  readonly svgTag: string;
  readonly createUsage?: string;
  create(id: string, args: readonly string[], shapes: ShapeCreationContext): Shape;
  /** Inspect the decoded children and return an empty shape. The reader attaches them. */
  fromSvg(input: SvgShapeInput): Shape;
}
