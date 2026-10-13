import { Shape } from './Shape.js';

export class Text extends Shape {
  #x: number;
  #y: number;
  #content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.#x = x;
    this.#y = y;
    this.#content = content;
  }

  override get tagName(): string {
    return 'text';
  }

  override move(dx: number, dy: number): void {
    this.#x += dx;
    this.#y += dy;
  }

  override scale(factor: number): void {
    this.#x *= factor;
    this.#y *= factor;
  }

  override svgAttributes(): Array<[string, string]> {
    return [
      ['x', String(this.#x)],
      ['y', String(this.#y)],
      ...this.paintAttributes(),
    ];
  }

  override svgText(): string {
    return this.#content;
  }

  protected override geometry(): string {
    return `(${this.#x},${this.#y}) "${this.#content}"`;
  }

  protected override setGeometry(attr: string, value: string): boolean {
    switch (attr) {
      case 'x':
        this.#x = this.toNumber(attr, value);
        return true;
      case 'y':
        this.#y = this.toNumber(attr, value);
        return true;
      case 'text':
        this.#content = value;
        return true;
      default:
        return false;
    }
  }
}
