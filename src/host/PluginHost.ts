import type { Plugin, PluginContext } from '../extensions/PluginContext.js';
import {
  categories, createRegistrations, type Category, type Contributions, type Registrations,
} from '../extensions/Registrations.js';

type Declaration = Record<Category, readonly string[]>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDeclaration(metadata: unknown): Declaration {
  if (!isRecord(metadata) || typeof metadata.name !== 'string' || metadata.name.trim() === '') {
    throw new Error('invalid plugin manifest name');
  }
  const value = metadata.contributes === undefined ? {} : metadata.contributes;
  if (!isRecord(value) || Object.keys(value).some(key => !categories.includes(key as Category))) {
    throw new Error('invalid plugin contributes');
  }
  const declaration = {} as Declaration;
  for (const category of categories) {
    const names = value[category] === undefined ? [] : value[category];
    if (!Array.isArray(names) || names.some(name => typeof name !== 'string' || name.trim() === '')) {
      throw new Error(`invalid plugin contributes: ${category}`);
    }
    declaration[category] = names;
  }
  return declaration;
}

function contributionNames(entries: Declaration): string[] {
  return categories.flatMap(category =>
    [...new Set(entries[category])].sort().map(name => `${category}/${name}`),
  );
}

const methods: Record<Category, readonly string[]> = {
  shapes: ['create', 'fromSvg'],
  commands: ['create', 'help'],
  decorators: ['decorate'],
  attributes: ['handles', 'apply'],
};

class DuplicateRegistration extends Error {}

export function activationError(name: string, error: unknown): string {
  const reason = (error instanceof Error ? error.message : String(error)).replace(/\s*\r?\n\s*/g, ' ');
  return `error: plugin failed to activate: ${name} (${reason})`;
}

export class PluginHost {
  readonly #registrations = createRegistrations();

  get registrations(): Registrations {
    return this.#registrations;
  }

  constructor(private readonly report: (message: string) => void) {}

  async load(plugin: unknown, metadata: unknown, options?: unknown, moduleName = '(unnamed)'): Promise<boolean> {
    const name = isRecord(metadata) && typeof metadata.name === 'string' ? metadata.name : moduleName;
    const pending = createRegistrations();
    let active = true;
    let registrationError: Error | undefined;

    const register = <K extends Category>(category: K, contribution: Contributions[K]): void => {
      if (!active) throw new Error('plugin registration is closed');
      try {
        const id = contribution?.name;
        if (typeof id !== 'string' || id.trim() === '' || !isRecord(contribution) ||
            methods[category].some(method => typeof contribution[method] !== 'function')) {
          throw new Error(`invalid registration: ${category}/${id ?? '(unnamed)'}`);
        }
        if (category === 'shapes') {
          const shape = contribution as Contributions['shapes'];
          if (typeof shape.svgTag !== 'string' || shape.svgTag.trim() === '' ||
              (shape.createUsage !== undefined && typeof shape.createUsage !== 'string')) {
            throw new Error(`invalid registration: ${category}/${id}`);
          }
        }
        if (category === 'decorators') {
          const decorator = contribution as Contributions['decorators'];
          if (decorator.onDocumentEvent !== undefined && typeof decorator.onDocumentEvent !== 'function') {
            throw new Error(`invalid registration: ${category}/${id}`);
          }
        }
        this.#assertFree(category, id);
        if (pending[category].has(id)) throw new DuplicateRegistration(`duplicate registration: ${category}/${id}`);
        pending[category].set(id, contribution);
      } catch (error) {
        registrationError ??= error instanceof Error ? error : new Error(String(error));
        throw error;
      }
    };

    const context: PluginContext = Object.freeze({
      registerShape: (shape: Contributions['shapes']) => register('shapes', shape),
      registerCommand: (command: Contributions['commands']) => register('commands', command),
      registerDecorator: (decorator: Contributions['decorators']) => register('decorators', decorator),
      registerAttribute: (handler: Contributions['attributes']) => register('attributes', handler),
    });
    try {
      const declared = contributionNames(readDeclaration(metadata));
      if (!isRecord(plugin) || typeof plugin.activate !== 'function') throw new Error('expected an activate method');
      await (plugin as unknown as Plugin).activate(context, options);
      if (registrationError !== undefined) throw registrationError;

      const registered = contributionNames({
        shapes: [...pending.shapes.keys()],
        commands: [...pending.commands.keys()],
        decorators: [...pending.decorators.keys()],
        attributes: [...pending.attributes.keys()],
      });
      if (declared.length !== registered.length || declared.some((id, index) => id !== registered[index])) {
        const list = (ids: string[]): string => ids.join(', ') || '(none)';
        this.report(`error: plugin manifest mismatch: ${name} (declared: ${list(declared)}, registered: ${list(registered)})`);
        return false;
      }
      // Recheck after activate in case another load completed while it was awaiting.
      for (const category of categories) {
        for (const id of pending[category].keys()) this.#assertFree(category, id);
      }
      for (const [id, shape] of pending.shapes) this.#registrations.shapes.set(id, shape);
      for (const [id, command] of pending.commands) this.#registrations.commands.set(id, command);
      for (const [id, decorator] of pending.decorators) this.#registrations.decorators.set(id, decorator);
      for (const [id, handler] of pending.attributes) this.#registrations.attributes.set(id, handler);
      return true;
    } catch (error) {
      const failure = registrationError ?? error;
      this.report(failure instanceof DuplicateRegistration ? `error: ${failure.message}` : activationError(name, failure));
      return false;
    } finally {
      active = false;
    }
  }

  #assertFree(category: Category, id: string): void {
    if (this.#registrations[category].has(id)) {
      throw new DuplicateRegistration(`duplicate registration: ${category}/${id}`);
    }
  }
}
