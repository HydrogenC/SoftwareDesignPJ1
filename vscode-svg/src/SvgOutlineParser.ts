import { SaxesParser } from 'saxes';

export interface SvgElement {
  readonly name: string;
  readonly id: string | undefined;
  readonly start: number;
  readonly end: number;
  readonly children: readonly SvgElement[];
}

interface OpenElement {
  readonly start: number;
  readonly children: SvgElement[];
}

export class SvgOutlineParser {
  parse(source: string): SvgElement | undefined {
    const parser = new SaxesParser({ xmlns: true, position: true });
    const stack: OpenElement[] = [];
    let root: SvgElement | undefined;

    parser.on('opentagstart', () => {
      // Saxes reports a position at the end of the opening tag name.
      const start = source.lastIndexOf('<', parser.position - 1);
      stack.push({ start, children: [] });
    });

    parser.on('closetag', tag => {
      const frame = stack.pop()!;
      const element: SvgElement = {
        name: tag.name,
        id: tag.attributes['id']?.value,
        start: frame.start,
        end: parser.position,
        children: frame.children,
      };
      const parent = stack.at(-1);
      if (parent !== undefined) {
        parent.children.push(element);
      } else if (tag.local === 'svg' && (tag.uri === '' || tag.uri === 'http://www.w3.org/2000/svg')) {
        root = element;
      }
    });

    try {
      parser.write(source).close();
      return root;
    } catch {
      return undefined;
    }
  }
}
