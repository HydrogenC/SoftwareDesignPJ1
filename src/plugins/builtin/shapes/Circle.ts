import { Shape } from '../../../api.js';

export class Circle extends Shape {
  #cx: number;
  #cy: number;
  #r: number;

  constructor(id: string, cx: number, cy: number, r: number) {
    super(id);
    this.#cx = cx;
    this.#cy = cy;
    this.#r = r;
  }

  override get tagName(): string {
    return 'circle';
  }

  override anchor(): { x: number; y: number } {
    return { x: this.#cx, y: this.#cy };
  }

  override move(dx: number, dy: number): void {
    this.#cx += dx;
    this.#cy += dy;
  }

  override scale(factor: number): void {
    this.#cx *= factor;
    this.#cy *= factor;
    this.#r *= factor;
  }

  override svgAttributes(): Array<[string, string]> {
    return [
      ['cx', String(this.#cx)],
      ['cy', String(this.#cy)],
      ['r', String(this.#r)],
      ...this.paintAttributes(),
    ];
  }

  protected override geometry(): string {
    return `cx=${this.#cx} cy=${this.#cy} r=${this.#r}`;
  }

  protected override setGeometry(attr: string, value: string): boolean {
    switch (attr) {
      case 'cx':
        this.#cx = this.toNumber(attr, value);
        return true;
      case 'cy':
        this.#cy = this.toNumber(attr, value);
        return true;
      case 'r':
        this.#r = this.toNumber(attr, value);
        return true;
      default:
        return false;
    }
  }
}
