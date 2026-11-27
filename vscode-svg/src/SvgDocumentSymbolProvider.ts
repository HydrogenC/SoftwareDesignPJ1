import {
  DocumentSymbol,
  Range,
  SymbolKind,
  type CancellationToken,
  type DocumentSymbolProvider,
  type TextDocument,
} from 'vscode';
import { SvgOutlineParser, type SvgElement } from './SvgOutlineParser.js';

export class SvgDocumentSymbolProvider implements DocumentSymbolProvider {
  readonly #parser = new SvgOutlineParser();

  provideDocumentSymbols(document: TextDocument, token: CancellationToken): DocumentSymbol[] {
    if (token.isCancellationRequested) return [];
    const root = this.#parser.parse(document.getText());
    return root === undefined ? [] : [this.#symbol(document, root)];
  }

  #symbol(document: TextDocument, element: SvgElement): DocumentSymbol {
    const { name, id, start, end, children } = element;
    const displayName = id ? `${name}#${id}` : name;
    const range = new Range(document.positionAt(start), document.positionAt(end));
    const tagName = new Range(document.positionAt(start + 1), document.positionAt(start + 1 + name.length));
    const kind = children.length === 0 ? SymbolKind.Field : SymbolKind.Namespace;
    const symbol = new DocumentSymbol(displayName, '', kind, range, tagName);
    symbol.children = children.map(child => this.#symbol(document, child));
    return symbol;
  }
}
