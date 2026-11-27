import type { ShapeView } from './ShapeView.js';

export interface AttributeWriter {
  set(id: string, attr: string, value: string): void;
}

export interface AttributeFeedback {
  readonly applied: string;
  readonly undone: string;
}

export interface AttributeHandler {
  readonly name: string;
  handles(shape: ShapeView, attr: string): boolean;
  apply(shape: ShapeView, attr: string, value: string, writer: AttributeWriter): AttributeFeedback | void;
}
