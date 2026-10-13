import { Shape } from './Shape.js';

export class Ellipse extends Shape {
  #cx: number;
  #cy: number;
  #rx: number;
  #ry: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.#cx = cx;
    this.#cy = cy;
    this.#rx = rx;
    this.#ry = ry;
  }

  override get tagName(): string {
    return 'ellipse';
  }

  override move(dx: number, dy: number): void {
    this.#cx += dx;
    this.#cy += dy;
  }

  override scale(factor: number): void {
    this.#cx *= factor;
    this.#cy *= factor;
    this.#rx *= factor;
    this.#ry *= factor;
  }

  override svgAttributes(): Array<[string, string]> {
    return [
      ['cx', String(this.#cx)],
      ['cy', String(this.#cy)],
      ['rx', String(this.#rx)],
      ['ry', String(this.#ry)],
      ...this.paintAttributes(),
    ];
  }

  protected override geometry(): string {
    return `cx=${this.#cx} cy=${this.#cy} rx=${this.#rx} ry=${this.#ry}`;
  }

  protected override setGeometry(attr: string, value: string): boolean {
    switch (attr) {
      case 'cx':
        this.#cx = this.toNumber(attr, value);
        return true;
      case 'cy':
        this.#cy = this.toNumber(attr, value);
        return true;
      case 'rx':
        this.#rx = this.toNumber(attr, value);
        return true;
      case 'ry':
        this.#ry = this.toNumber(attr, value);
        return true;
      default:
        return false;
    }
  }
}
