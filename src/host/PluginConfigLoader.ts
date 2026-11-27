import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as resolveModule } from 'import-meta-resolve';
import { activationError, isRecord, type PluginHost } from './PluginHost.js';

interface ConfigEntry {
  module: string;
  enabled?: boolean;
  options?: unknown;
}

class PluginNotFound extends Error {}

function hasCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

function isEntry(entry: unknown): entry is ConfigEntry {
  return isRecord(entry) && typeof entry.module === 'string' && entry.module.trim() !== '' &&
    (entry.enabled === undefined || typeof entry.enabled === 'boolean');
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

export class PluginConfigLoader {
  constructor(
    private readonly host: PluginHost,
    private readonly report: (message: string) => void,
  ) {}

  async load(configPath: string): Promise<void> {
    const path = resolve(configPath);
    let config: unknown;
    try {
      config = readJson(path);
      if (!isRecord(config) || !Array.isArray(config.plugins) || !config.plugins.every(isEntry)) {
        throw new Error('expected a plugins array');
      }
    } catch {
      this.report('error: invalid plugin config');
      return;
    }
    for (const entry of config.plugins) {
      if (entry.enabled !== false) await this.#loadEntry(entry, path);
    }
  }

  async #loadEntry(entry: ConfigEntry, configPath: string): Promise<void> {
    let name = entry.module;
    try {
      const { url, manifest } = this.#resolve(entry.module, configPath);
      const metadata = readJson(manifest);
      if (isRecord(metadata) && typeof metadata.name === 'string') name = metadata.name;
      const module: Record<string, unknown> = await import(url.href);
      if (!Object.hasOwn(module, 'default')) {
        this.report(`error: plugin has no default export: ${entry.module}`);
        return;
      }
      await this.host.load(module.default, metadata, entry.options, entry.module);
    } catch (error) {
      this.report(error instanceof PluginNotFound
        ? `error: plugin not found: ${entry.module}`
        : activationError(name, error));
    }
  }

  #resolve(specifier: string, configPath: string): { url: URL; manifest: string } {
    const local = specifier.startsWith('./') || specifier.startsWith('../') || isAbsolute(specifier);
    if (local) {
      const path = resolve(dirname(configPath), specifier);
      if (this.#stat(path).isDirectory()) {
        return { url: pathToFileURL(createRequire(configPath).resolve(path)), manifest: join(path, 'package.json') };
      }
      return { url: pathToFileURL(path), manifest: this.#findManifest(path) };
    }

    let url: URL;
    try {
      url = new URL(resolveModule(specifier, pathToFileURL(configPath).href));
    } catch (error) {
      if (hasCode(error, 'ERR_MODULE_NOT_FOUND')) throw new PluginNotFound();
      throw error;
    }
    if (url.protocol !== 'file:') throw new Error('expected a plugin package on the filesystem');
    const path = fileURLToPath(url);
    this.#stat(path);
    const parts = specifier.split('/');
    const packageName = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    return { url, manifest: this.#findManifest(path, packageName) };
  }

  #stat(path: string) {
    try {
      return statSync(path);
    } catch (error) {
      if (hasCode(error, 'ENOENT') || hasCode(error, 'ENOTDIR')) throw new PluginNotFound();
      throw error;
    }
  }

  #findManifest(entry: string, packageName?: string): string {
    let directory = dirname(entry);
    for (;;) {
      const path = join(directory, 'package.json');
      try {
        const manifest = readJson(path);
        if (packageName === undefined || (isRecord(manifest) && manifest.name === packageName)) return path;
      } catch (error) {
        if (!hasCode(error, 'ENOENT')) throw error;
      }
      const parent = dirname(directory);
      if (parent === directory) throw new Error('plugin package.json not found');
      directory = parent;
    }
  }
}
