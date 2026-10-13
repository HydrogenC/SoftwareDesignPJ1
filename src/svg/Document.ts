import { Container } from './Container.js';
import { EditorError } from './EditorError.js';
import type { Shape } from './Shape.js';

/** 画布根 `<svg>`：持有全部顶层图形，并集中维护 id → 图形 索引。 */
export class Document extends Container {
  #width: number;
  #height: number;
  readonly #index = new Map<string, Shape>();

  constructor(width: number, height: number) {
    super('');
    this.#width = width;
    this.#height = height;
  }

  override get tagName(): string {
    return 'svg';
  }

  override label(): string {
    return 'svg';
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
  }

  protected override geometry(): string {
    return `(${this.#width}x${this.#height})`;
  }

  override svgAttributes(): Array<[string, string]> {
    return [
      ['width', String(this.#width)],
      ['height', String(this.#height)],
      ['viewBox', `0 0 ${this.#width} ${this.#height}`],
      ...this.paintAttributes(),
    ];
  }

  lookup(id: string): Shape {
    const shape = this.#index.get(id);
    if (shape === undefined) throw new EditorError(`no such shape: ${id}`);
    return shape;
  }

  has(id: string): boolean {
    return this.#index.has(id);
  }

  /** 挂入新图形：省略 parentId 挂根；id 冲突 / 父不存在 / 父非容器在此报错。 */
  add(shape: Shape, parentId?: string): void {
    this.#assertIdFree(shape);
    const parent = parentId === undefined ? this : this.#container(parentId);
    parent.attach(shape);
    this.#register(shape);
  }

  /** 连同整棵子树摘除并注销。 */
  remove(shape: Shape): void {
    const parent = shape.parent;
    if (parent === null) throw new EditorError(`no such shape: ${shape.id}`);
    parent.detach(shape);
    this.#unregister(shape);
  }

  /** 已在文档中的图形换父（addto / group 收编）；id 不变，索引无需改动。 */
  moveTo(shape: Shape, parentId: string): void {
    const target = this.#container(parentId);
    const from = shape.parent;
    if (from === null) throw new EditorError(`no such shape: ${shape.id}`);
    if (from === target) return;
    if (this.isAncestor(shape, target)) {
      throw new EditorError(`cannot move into own descendant: ${shape.id}`);
    }
    target.attach(shape);
    from.detach(shape);
  }

  isAncestor(ancestor: Shape, node: Shape): boolean {
    for (let p = node.parent; p !== null; p = p.parent) {
      if (p === ancestor) return true;
    }
    return false;
  }

  #container(id: string): Shape {
    const shape = this.#index.get(id);
    if (shape === undefined) throw new EditorError(`no such container: ${id}`);
    return shape;
  }

  #assertIdFree(shape: Shape): void {
    if (this.#index.has(shape.id)) throw new EditorError(`id already exists: ${shape.id}`);
    for (const child of shape.children) this.#assertIdFree(child);
  }

  #register(shape: Shape): void {
    this.#index.set(shape.id, shape);
    for (const child of shape.children) this.#register(child);
  }

  #unregister(shape: Shape): void {
    this.#index.delete(shape.id);
    for (const child of shape.children) this.#unregister(child);
  }
}
