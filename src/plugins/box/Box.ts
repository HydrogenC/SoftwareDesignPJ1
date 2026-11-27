import { Container, EditorError, type Shape } from '../../api.js';

export const rectId = (id: string): string => `${id}-rect`;
export const labelId = (id: string): string => `${id}-label`;

export class Box extends Container {
  constructor(id: string) {
    super(id);
  }

  override get kind(): string {
    return 'box';
  }

  override get tagName(): string {
    return 'g';
  }

  override treeLabel(): string {
    return `g#${this.id}`;
  }

  override creationFeedback(parent: Container | null): string {
    const parts = `${this.treeLabel()} + rect#${rectId(this.id)} + text#${labelId(this.id)}`;
    return `${super.creationFeedback(parent)} (${parts})`;
  }

  override svgAttributes(): Array<[string, string]> {
    return [['data-kind', this.kind], ...this.paintAttributes()];
  }

  override assertCanUngroup(): void {
    throw new EditorError(`cannot ungroup composite shape: ${this.id}`);
  }

  override assertCanRemove(child: Shape): void {
    if (child.id === rectId(this.id) || child.id === labelId(this.id)) {
      throw new EditorError(`cannot remove required box part: ${child.id}`);
    }
  }
}
