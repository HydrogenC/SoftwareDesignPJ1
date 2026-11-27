import { Shape } from '../../../api.js';

export class Rect extends Shape {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.#x = x;
    this.#y = y;
    this.#width = width;
    this.#height = height;
  }

  override get tagName(): string {
    return 'rect';
  }

  override anchor(): { x: number; y: number } {
    return { x: this.#x, y: this.#y };
  }

  override move(dx: number, dy: number): void {
    this.#x += dx;
    this.#y += dy;
  }

  override scale(factor: number): void {
    this.#x *= factor;
    this.#y *= factor;
    this.#width *= factor;
    this.#height *= factor;
  }

  override svgAttributes(): Array<[string, string]> {
    return [
      ['x', String(this.#x)],
      ['y', String(this.#y)],
      ['width', String(this.#width)],
      ['height', String(this.#height)],
      ...this.paintAttributes(),
    ];
  }

  protected override geometry(): string {
    return `x=${this.#x} y=${this.#y} w=${this.#width} h=${this.#height}`;
  }

  protected override setGeometry(attr: string, value: string): boolean {
    switch (attr) {
      case 'x':
        this.#x = this.toNumber(attr, value);
        return true;
      case 'y':
        this.#y = this.toNumber(attr, value);
        return true;
      case 'width':
        this.#width = this.toNumber(attr, value);
        return true;
      case 'height':
        this.#height = this.toNumber(attr, value);
        return true;
      default:
        return false;
    }
  }
}
