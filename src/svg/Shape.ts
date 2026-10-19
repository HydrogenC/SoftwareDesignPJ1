import type { Container } from './Container.js';
import { EditorError } from './EditorError.js';

export interface Point {
  x: number;
  y: number;
}

export abstract class Shape {
  readonly #id: string;
  parent: Container | null = null;

  // 不用 `?`：unsetAttribute 需要把已存在的属性显式置回 undefined。
  protected fill: string | undefined = undefined;
  protected stroke: string | undefined = undefined;
  protected strokeWidth: string | undefined = undefined;

  protected constructor(id: string) {
    this.#id = id;
  }

  get id(): string {
    return this.#id;
  }

  /** SVG 元素名，同时充当 label 的类型前缀。 */
  abstract get tagName(): string;

  label(): string {
    return `${this.tagName}#${this.id}`;
  }

  /** 叶子返回空；容器覆写。遍历与排版据此递归，不做 switch。 */
  get children(): readonly Shape[] {
    return [];
  }

  /** 复合端收子；叶子拒绝——供"挂到某 id 名下"统一调用，避免 instanceof。 */
  attach(_child: Shape): void {
    throw new EditorError(`not a container: ${this.id}`);
  }

  /** 容器覆写返回自身；叶子为 null，供命令做"能否容纳"判断。 */
  asContainer(): Container | null {
    return null;
  }

  /** 左上/中心锚点，仅用于 move 后的位置回显；容器没有单一锚点。 */
  anchor(): Point | null {
    return null;
  }

  abstract move(dx: number, dy: number): void;

  abstract scale(factor: number): void;

  set(attr: string, value: string): void {
    if (this.setPaint(attr, value)) return;
    if (this.setGeometry(attr, value)) return;
    throw new EditorError(`unknown attribute: ${attr}`);
  }

  /** 取当前值，供 set 的 undo 记录旧值；未设置的绘制属性返回 undefined。 */
  getAttribute(attr: string): string | undefined {
    return this.svgAttributes().find(([name]) => name === attr)?.[1];
  }

  /** set 前属性本不存在时，undo 用它恢复"未设置"状态。 */
  unsetAttribute(attr: string): void {
    switch (attr) {
      case 'fill':
        this.fill = undefined;
        return;
      case 'stroke':
        this.stroke = undefined;
        return;
      case 'stroke-width':
        this.strokeWidth = undefined;
        return;
      default:
        throw new EditorError(`cannot unset attribute: ${attr}`);
    }
  }

  /** tree 的一行：几何与绘制属性内联。 */
  renderInline(): string {
    return [this.geometry(), ...this.paintParts()].filter(Boolean).join(' ');
  }

  /** show 的明细：几何占一行，绘制属性各占一行。 */
  renderDetail(): string[] {
    return [this.geometry(), ...this.paintParts()].filter(Boolean);
  }

  abstract svgAttributes(): Array<[string, string]>;

  /** <text> 覆写为文本内容，其余为 null。 */
  svgText(): string | null {
    return null;
  }

  /** 各类型自拼几何属性；text / line 的特殊布局落在这里。 */
  protected abstract geometry(): string;

  /** 各类型覆写，处理自身几何属性（text 的内容也在其中）。 */
  protected setGeometry(_attr: string, _value: string): boolean {
    return false;
  }

  protected toNumber(attr: string, value: string): number {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new EditorError(`invalid value for ${attr}: ${value}`);
    return n;
  }

  protected setPaint(attr: string, value: string): boolean {
    switch (attr) {
      case 'fill':
        this.fill = value;
        return true;
      case 'stroke':
        this.stroke = value;
        return true;
      case 'stroke-width':
        this.strokeWidth = value;
        return true;
      default:
        return false;
    }
  }

  protected paintParts(): string[] {
    const parts: string[] = [];
    if (this.fill !== undefined) parts.push(`fill=${this.fill}`);
    if (this.stroke !== undefined) parts.push(`stroke=${this.stroke}`);
    if (this.strokeWidth !== undefined) parts.push(`stroke-width=${this.strokeWidth}`);
    return parts;
  }

  protected paintAttributes(): Array<[string, string]> {
    const attrs: Array<[string, string]> = [];
    if (this.fill !== undefined) attrs.push(['fill', this.fill]);
    if (this.stroke !== undefined) attrs.push(['stroke', this.stroke]);
    if (this.strokeWidth !== undefined) attrs.push(['stroke-width', this.strokeWidth]);
    return attrs;
  }
}
