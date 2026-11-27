import type { AttributeHandler } from './AttributeHandler.js';
import type { CommandDefinition } from './CommandDefinition.js';
import type { ShapeProvider } from './ShapeProvider.js';
import type { TreeDecorator } from './TreeDecorator.js';

export interface Contributions {
  shapes: ShapeProvider;
  commands: CommandDefinition;
  decorators: TreeDecorator;
  attributes: AttributeHandler;
}

export type Category = keyof Contributions;
export type Registrations = { [K in Category]: ReadonlyMap<string, Contributions[K]> };
export type MutableRegistrations = { [K in Category]: Map<string, Contributions[K]> };

export const categories = ['shapes', 'commands', 'decorators', 'attributes'] as const;

export function createRegistrations(): MutableRegistrations {
  return { shapes: new Map(), commands: new Map(), decorators: new Map(), attributes: new Map() };
}
