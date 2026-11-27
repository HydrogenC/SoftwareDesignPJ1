import { EditorError, type Shape, type ShapeProvider, type SvgAttributes, type SvgShapeInput } from '../../api.js';
import { Rect } from './shapes/Rect.js';
import { Circle } from './shapes/Circle.js';
import { Ellipse } from './shapes/Ellipse.js';
import { Line } from './shapes/Line.js';
import { Text } from './shapes/Text.js';
import { Group } from './shapes/Group.js';

const argNumber = (args: readonly string[], at: number): number => {
  const raw = args[at];
  if (raw === undefined) throw new EditorError(`missing argument #${at + 1}`);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new EditorError(`invalid number: ${raw}`);
  return n;
};

const svgNumber = (attrs: SvgAttributes, name: string): number => {
  const raw = attrs[name];
  if (raw === undefined) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new EditorError(`invalid <${name}>: ${raw}`);
  return n;
};

const setPaint = (shape: Shape, attrs: SvgAttributes): void => {
  for (const name of ['fill', 'stroke', 'stroke-width']) {
    const value = attrs[name];
    if (value !== undefined) shape.set(name, value);
  }
};

class BuiltinShapeProvider implements ShapeProvider {
  constructor(
    readonly name: string,
    readonly createUsage: string,
    readonly create: (id: string, args: readonly string[]) => Shape,
    private readonly read: (input: SvgShapeInput) => Shape,
  ) {}

  get svgTag(): string {
    return this.name;
  }

  fromSvg(input: SvgShapeInput): Shape {
    const shape = this.read(input);
    setPaint(shape, input.attrs);
    return shape;
  }
}

export const builtinShapes: readonly ShapeProvider[] = [
  new BuiltinShapeProvider('rect', 'rect    <x> <y> <w> <h> [fill]',
    (id, args) => {
      const shape = new Rect(id, argNumber(args, 0), argNumber(args, 1), argNumber(args, 2), argNumber(args, 3));
      if (args[4] !== undefined) shape.set('fill', args[4]);
      return shape;
    },
    ({ id, attrs }) => new Rect(id, svgNumber(attrs, 'x'), svgNumber(attrs, 'y'), svgNumber(attrs, 'width'), svgNumber(attrs, 'height')),
  ),
  new BuiltinShapeProvider('circle', 'circle  <cx> <cy> <r> [fill]',
    (id, args) => {
      const shape = new Circle(id, argNumber(args, 0), argNumber(args, 1), argNumber(args, 2));
      if (args[3] !== undefined) shape.set('fill', args[3]);
      return shape;
    },
    ({ id, attrs }) => new Circle(id, svgNumber(attrs, 'cx'), svgNumber(attrs, 'cy'), svgNumber(attrs, 'r')),
  ),
  new BuiltinShapeProvider('ellipse', 'ellipse <cx> <cy> <rx> <ry> [fill]',
    (id, args) => {
      const shape = new Ellipse(id, argNumber(args, 0), argNumber(args, 1), argNumber(args, 2), argNumber(args, 3));
      if (args[4] !== undefined) shape.set('fill', args[4]);
      return shape;
    },
    ({ id, attrs }) => new Ellipse(id, svgNumber(attrs, 'cx'), svgNumber(attrs, 'cy'), svgNumber(attrs, 'rx'), svgNumber(attrs, 'ry')),
  ),
  new BuiltinShapeProvider('line', 'line    <x1> <y1> <x2> <y2> [stroke]',
    (id, args) => {
      const shape = new Line(id, argNumber(args, 0), argNumber(args, 1), argNumber(args, 2), argNumber(args, 3));
      if (args[4] !== undefined) shape.set('stroke', args[4]);
      return shape;
    },
    ({ id, attrs }) => new Line(id, svgNumber(attrs, 'x1'), svgNumber(attrs, 'y1'), svgNumber(attrs, 'x2'), svgNumber(attrs, 'y2')),
  ),
  new BuiltinShapeProvider('text', 'text    <x> <y> "content"',
    (id, args) => {
      const content = args[2];
      if (content === undefined) throw new EditorError('missing text content');
      return new Text(id, argNumber(args, 0), argNumber(args, 1), content);
    },
    ({ id, attrs, text }) => new Text(id, svgNumber(attrs, 'x'), svgNumber(attrs, 'y'), text),
  ),
  new BuiltinShapeProvider('g', 'g', id => new Group(id), ({ id }) => new Group(id)),
];
