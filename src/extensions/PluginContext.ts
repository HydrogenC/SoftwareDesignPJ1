import type { AttributeHandler } from './AttributeHandler.js';
import type { CommandDefinition } from './CommandDefinition.js';
import type { ShapeProvider } from './ShapeProvider.js';
import type { TreeDecorator } from './TreeDecorator.js';

export interface PluginContext {
  registerShape(provider: ShapeProvider): void;
  registerCommand(command: CommandDefinition): void;
  registerDecorator(decorator: TreeDecorator): void;
  registerAttribute(handler: AttributeHandler): void;
}

export interface Plugin {
  activate(context: PluginContext, options?: unknown): void | Promise<void>;
}

export interface PluginManifest {
  readonly name: string;
  readonly contributes?: {
    readonly shapes?: readonly string[];
    readonly commands?: readonly string[];
    readonly decorators?: readonly string[];
    readonly attributes?: readonly string[];
  };
}
