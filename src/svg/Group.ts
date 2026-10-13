import { Container } from './Container.js';

export class Group extends Container {
  override get tagName(): string {
    return 'g';
  }

  override svgAttributes(): Array<[string, string]> {
    return this.paintAttributes();
  }
}
