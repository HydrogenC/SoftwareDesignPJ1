import { EditorError } from '../svg/EditorError.js';
import type { Shape } from '../svg/Shape.js';
import { Rect } from '../svg/Rect.js';
import { Circle } from '../svg/Circle.js';
import { Ellipse } from '../svg/Ellipse.js';
import { Line } from '../svg/Line.js';
import { Text } from '../svg/Text.js';
import { Group } from '../svg/Group.js';

export type SvgAttributes = Record<string, string>;

interface ShapeKind {
  create(id: string, args: string[]): Shape;
  fromSvg(id: string, attrs: SvgAttributes, text: string): Shape;
}

const argNumber = (args: string[], at: number): number => {
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

const kinds = new Map<string, ShapeKind>([
  [
    'rect',
    {
      create(id, a) {
        const shape = new Rect(id, argNumber(a, 0), argNumber(a, 1), argNumber(a, 2), argNumber(a, 3));
        if (a[4] !== undefined) shape.set('fill', a[4]);
        return shape;
      },
      fromSvg(id, at) {
        const shape = new Rect(
          id,
          svgNumber(at, 'x'),
          svgNumber(at, 'y'),
          svgNumber(at, 'width'),
          svgNumber(at, 'height'),
        );
        setPaint(shape, at);
        return shape;
      },
    },
  ],
  [
    'circle',
    {
      create(id, a) {
        const shape = new Circle(id, argNumber(a, 0), argNumber(a, 1), argNumber(a, 2));
        if (a[3] !== undefined) shape.set('fill', a[3]);
        return shape;
      },
      fromSvg(id, at) {
        const shape = new Circle(id, svgNumber(at, 'cx'), svgNumber(at, 'cy'), svgNumber(at, 'r'));
        setPaint(shape, at);
        return shape;
      },
    },
  ],
  [
    'ellipse',
    {
      create(id, a) {
        const shape = new Ellipse(id, argNumber(a, 0), argNumber(a, 1), argNumber(a, 2), argNumber(a, 3));
        if (a[4] !== undefined) shape.set('fill', a[4]);
        return shape;
      },
      fromSvg(id, at) {
        const shape = new Ellipse(
          id,
          svgNumber(at, 'cx'),
          svgNumber(at, 'cy'),
          svgNumber(at, 'rx'),
          svgNumber(at, 'ry'),
        );
        setPaint(shape, at);
        return shape;
      },
    },
  ],
  [
    'line',
    {
      create(id, a) {
        const shape = new Line(id, argNumber(a, 0), argNumber(a, 1), argNumber(a, 2), argNumber(a, 3));
        if (a[4] !== undefined) shape.set('stroke', a[4]);
        return shape;
      },
      fromSvg(id, at) {
        const shape = new Line(
          id,
          svgNumber(at, 'x1'),
          svgNumber(at, 'y1'),
          svgNumber(at, 'x2'),
          svgNumber(at, 'y2'),
        );
        setPaint(shape, at);
        return shape;
      },
    },
  ],
  [
    'text',
    {
      create(id, a) {
        const content = a[2];
        if (content === undefined) throw new EditorError('missing text content');
        return new Text(id, argNumber(a, 0), argNumber(a, 1), content);
      },
      fromSvg(id, at, text) {
        const shape = new Text(id, svgNumber(at, 'x'), svgNumber(at, 'y'), text);
        setPaint(shape, at);
        return shape;
      },
    },
  ],
  [
    'g',
    {
      create(id) {
        return new Group(id);
      },
      fromSvg(id, at) {
        const shape = new Group(id);
        setPaint(shape, at);
        return shape;
      },
    },
  ],
]);

/** 类型名 → 图形类：文档许可的两处按名分派之一（另一处是命令路由）。 */
export class ShapeFactory {
  supports(type: string): boolean {
    return kinds.has(type);
  }

  /** CLI `create` 路径：参数为位置式 token。 */
  create(type: string, id: string, args: string[]): Shape {
    return this.#kind(type).create(id, args);
  }

  /** SVG 读入路径：参数为元素属性 + 文本内容。 */
  fromSvg(type: string, id: string, attrs: SvgAttributes, text: string): Shape {
    return this.#kind(type).fromSvg(id, attrs, text);
  }

  #kind(type: string): ShapeKind {
    const kind = kinds.get(type);
    if (kind === undefined) throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return kind;
  }
}
