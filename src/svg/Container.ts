import { Shape } from './Shape.js';
import { EditorError } from './EditorError.js';

/** 复合端：有序持有子图形，move/scale 递归下发。 */
export abstract class Container extends Shape {
  readonly #children: Shape[] = [];

  override get children(): readonly Shape[] {
    return this.#children;
  }

  override attach(child: Shape): void {
    child.parent = this;
    this.#children.push(child);
  }

  override asContainer(): Container {
    return this;
  }

  insertAt(index: number, child: Shape): void {
    child.parent = this;
    this.#children.splice(index, 0, child);
  }

  /** 仅摘除；若仍是自己的子节点则清空其父指针（换父场景下父指针已指向新容器）。 */
  detach(child: Shape): void {
    const at = this.#children.indexOf(child);
    if (at < 0) throw new EditorError(`no such child: ${child.id}`);
    this.#children.splice(at, 1);
    if (child.parent === this) child.parent = null;
  }

  override move(dx: number, dy: number): void {
    for (const child of this.#children) child.move(dx, dy);
  }

  override scale(factor: number): void {
    for (const child of this.#children) child.scale(factor);
  }

  /** 容器自身没有几何；tree 里只显示 g#id。 */
  protected override geometry(): string {
    return '';
  }
}
