import { languages, window, type ExtensionContext } from 'vscode';
import { SvgDocumentSymbolProvider } from './SvgDocumentSymbolProvider.js';
import { SvgFileDecorationProvider } from './SvgFileDecorationProvider.js';

export function activate(context: ExtensionContext): void {
  const decorations = new SvgFileDecorationProvider();
  context.subscriptions.push(
    decorations,
    window.registerFileDecorationProvider(decorations),
    languages.registerDocumentSymbolProvider(
      { pattern: '**/*.[sS][vV][gG]' },
      new SvgDocumentSymbolProvider(),
    ),
  );
}
