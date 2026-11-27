import type { ShapeView } from './ShapeView.js';

export interface DocumentEvent {
  readonly kind: 'new' | 'read' | 'saved';
  readonly document: ShapeView;
}

export interface TreeDecorator {
  readonly name: string;
  decorate(shape: ShapeView): string | undefined;
  onDocumentEvent?(event: DocumentEvent): void;
}
