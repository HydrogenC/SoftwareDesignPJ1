import { readdirSync } from 'node:fs';
import { cwd } from 'node:process';

export interface DirectoryEntry {
  readonly name: string;
  readonly isDirectory: boolean;
}

export interface DirectoryAccess {
  currentPath(): string;
  list(path: string): readonly DirectoryEntry[];
}

export class NodeDirectoryAccess implements DirectoryAccess {
  currentPath(): string {
    return cwd();
  }

  list(path: string): DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
  }
}
