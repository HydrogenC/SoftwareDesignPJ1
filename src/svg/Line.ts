import { Shape } from './Shape.js';

export class Line extends Shape {
  #x1: number;
  #y1: number;
  #x2: number;
  #y2: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.#x1 = x1;
    this.#y1 = y1;
    this.#x2 = x2;
    this.#y2 = y2;
  }

  override get tagName(): string {
    return 'line';
  }

  override anchor(): { x: number; y: number } {
    return { x: this.#x1, y: this.#y1 };
  }

  override move(dx: number, dy: number): void {
    this.#x1 += dx;
    this.#y1 += dy;
    this.#x2 += dx;
    this.#y2 += dy;
  }

  override scale(factor: number): void {
    this.#x1 *= factor;
    this.#y1 *= factor;
    this.#x2 *= factor;
    this.#y2 *= factor;
  }

  override svgAttributes(): Array<[string, string]> {
    return [
      ['x1', String(this.#x1)],
      ['y1', String(this.#y1)],
      ['x2', String(this.#x2)],
      ['y2', String(this.#y2)],
      ...this.paintAttributes(),
    ];
  }

  protected override geometry(): string {
    return `(${this.#x1},${this.#y1}) -> (${this.#x2},${this.#y2})`;
  }

  protected override setGeometry(attr: string, value: string): boolean {
    switch (attr) {
      case 'x1':
        this.#x1 = this.toNumber(attr, value);
        return true;
      case 'y1':
        this.#y1 = this.toNumber(attr, value);
        return true;
      case 'x2':
        this.#x2 = this.toNumber(attr, value);
        return true;
      case 'y2':
        this.#y2 = this.toNumber(attr, value);
        return true;
      default:
        return false;
    }
  }
}
