import type { Shape } from '../svg/Shape.js';
import { invokeExtension } from '../extensions/invokeExtension.js';
import { viewShape, type ShapeView } from '../extensions/ShapeView.js';
import type { TreeDecorator } from '../extensions/TreeDecorator.js';

interface Row {
  prefix: string;
  label: string;
  inline: string;
  view: ShapeView | undefined;
}

const BRANCH = '├── ';
const LAST_BRANCH = '└── ';
const INDENT = '    ';
const CONTINUE = '│   ';

/** 结构树排版：所有内联属性对齐到同一列（最长 prefix+label 再留两格）。 */
export class TreeFormatter {
  constructor(private readonly decorators: ReadonlyMap<string, TreeDecorator>) {}

  render(root: Shape): string {
    const rows: Row[] = [];
    this.#collect(root, this.decorators.size === 0 ? undefined : viewShape(root), 0, [], true, rows);
    const [rootRow, ...body] = rows;
    if (rootRow === undefined) return '';

    const column = body.reduce(
      (max, row) => (row.inline === '' ? max : Math.max(max, row.prefix.length + row.label.length)),
      0,
    ) + 2;

    const lines = [this.#rootLine(rootRow) + this.#suffix(rootRow)];
    for (const row of body) lines.push(this.#bodyLine(row, column) + this.#suffix(row));
    return lines.join('\n');
  }

  #rootLine(row: Row): string {
    return row.inline === '' ? row.label : `${row.label} ${row.inline}`;
  }

  #bodyLine(row: Row, column: number): string {
    if (row.inline === '') return `${row.prefix}${row.label}`;
    const padding = ' '.repeat(column - row.prefix.length - row.label.length);
    return `${row.prefix}${row.label}${padding}${row.inline}`;
  }

  #suffix(row: Row): string {
    const view = row.view;
    if (view === undefined) return '';
    let suffix = '';
    for (const decorator of this.decorators.values()) {
      const label = invokeExtension('tree decorator', decorator.name, () => {
        const value = decorator.decorate(view);
        if (value !== undefined && (typeof value !== 'string' || /[\r\n]/.test(value))) {
          throw new TypeError('expected a single-line label or undefined');
        }
        return value;
      });
      if (label) suffix += ` ${label}`;
    }
    return suffix;
  }

  #collect(shape: Shape, view: ShapeView | undefined, depth: number, lastFlags: boolean[], isLast: boolean, rows: Row[]): void {
    const indent = lastFlags.map(last => (last ? INDENT : CONTINUE)).join('');
    const prefix = depth === 0 ? '' : `${indent}${isLast ? LAST_BRANCH : BRANCH}`;
    rows.push({ prefix, label: shape.treeLabel(), inline: shape.renderInline(), view });

    const children = shape.children;
    const childFlags = depth === 0 ? [] : [...lastFlags, isLast];
    children.forEach((child, index) => {
      this.#collect(child, view?.children[index], depth + 1, childFlags, index === children.length - 1, rows);
    });
  }
}
