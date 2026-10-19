import { Container } from './Container.js';

export class Group extends Container {
  constructor(id: string) {
    super(id);
  }

  override get tagName(): string {
    return 'g';
  }

  override svgAttributes(): Array<[string, string]> {
    return this.paintAttributes();
  }
}
