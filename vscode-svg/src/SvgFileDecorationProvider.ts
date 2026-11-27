import {
  EventEmitter,
  FileDecoration,
  FileType,
  workspace,
  type CancellationToken,
  type Disposable,
  type FileDecorationProvider,
  type Uri,
} from 'vscode';

export class SvgFileDecorationProvider implements FileDecorationProvider, Disposable {
  readonly #changes = new EventEmitter<Uri>();
  readonly #watcher = workspace.createFileSystemWatcher('**/*.[sS][vV][gG]', false, true);
  readonly onDidChangeFileDecorations = this.#changes.event;

  constructor() {
    this.#watcher.onDidCreate(uri => this.#changes.fire(uri));
    this.#watcher.onDidDelete(uri => this.#changes.fire(uri));
  }

  async provideFileDecoration(uri: Uri, token: CancellationToken): Promise<FileDecoration | undefined> {
    if (!uri.path.toLowerCase().endsWith('.svg') || token.isCancellationRequested) {
      return undefined;
    }
    try {
      const { type } = await workspace.fs.stat(uri);
      if ((type & FileType.File) !== 0 && !token.isCancellationRequested) {
        return new FileDecoration('[]', 'SVG file');
      }
    } catch {
      // The Explorer entry may have disappeared before the stat completed.
    }
    return undefined;
  }

  dispose(): void {
    this.#watcher.dispose();
    this.#changes.dispose();
  }
}
