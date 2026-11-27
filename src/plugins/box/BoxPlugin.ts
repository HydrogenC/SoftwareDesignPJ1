import {
  EditorError, type AttributeFeedback, type AttributeHandler, type AttributeWriter, type Plugin, type PluginContext,
  type ShapeCreationContext, type ShapeProvider, type ShapeView, type SvgShapeInput, type TreeDecorator,
} from '../../api.js';
import { Box, labelId, rectId } from './Box.js';

export { default as manifest } from './package.json' with { type: 'json' };

function requirePart<T extends Pick<ShapeView, 'id' | 'kind' | 'tagName'>>(
  children: readonly T[], id: string, kind: 'rect' | 'text',
): T {
  const child = children.find(part => part.id === id);
  if (child?.kind !== kind || child.tagName !== kind) {
    throw new EditorError(`invalid box: expected direct child ${kind}#${id}`);
  }
  return child;
}

class BoxProvider implements ShapeProvider {
  readonly name = 'box';
  readonly svgTag = 'g';
  readonly createUsage = 'box     <x> <y> <w> <h> "<title>"';

  create(id: string, args: readonly string[], shapes: ShapeCreationContext): Box {
    const [x, y, width, height, title] = args;
    if (args.length !== 5 || x === undefined || y === undefined ||
        width === undefined || height === undefined || title === undefined) {
      throw new EditorError('usage: create box <id> <x> <y> <w> <h> "<title>" [in <containerId>]');
    }

    const body = shapes.create('rect', rectId(id), [x, y, width, height, '#4a90d9']);
    const labelX = Number(x) + 20;
    const labelY = Number(y) + Number(height) / 2 + 5;
    const label = shapes.create('text', labelId(id), [String(labelX), String(labelY), title]);
    const box = new Box(id);
    box.attach(body);
    box.attach(label);
    return box;
  }

  fromSvg({ id, attrs, children }: SvgShapeInput): Box {
    requirePart(children, rectId(id), 'rect');
    requirePart(children, labelId(id), 'text');

    const box = new Box(id);
    for (const name of ['fill', 'stroke', 'stroke-width']) {
      const value = attrs[name];
      if (value !== undefined) box.set(name, value);
    }
    return box;
  }
}

class BoxAttributes implements AttributeHandler {
  readonly name = 'box-attributes';

  handles(shape: ShapeView, attr: string): boolean {
    return shape.kind === 'box' && (attr === 'fill' || attr === 'label');
  }

  apply(shape: ShapeView, attr: string, value: string, writer: AttributeWriter): AttributeFeedback {
    const box = `box#${shape.id}`;
    if (attr === 'fill') {
      const body = requirePart(shape.children, rectId(shape.id), 'rect');
      const previous = body.attributes.fill;
      writer.set(body.id, 'fill', value);
      return {
        applied: `${box} fill propagated to ${body.id}`,
        undone: previous === undefined
          ? `${box} fill unset on ${body.id}`
          : `${box} fill restored on ${body.id}: ${previous}`,
      };
    }

    const label = requirePart(shape.children, labelId(shape.id), 'text');
    writer.set(label.id, 'text', value);
    return {
      applied: `${box} label updated: ${JSON.stringify(value)}`,
      undone: `${box} label restored: ${JSON.stringify(label.text)}`,
    };
  }
}

class BoxTypeLabel implements TreeDecorator {
  readonly name = 'box-type-label';

  decorate(shape: ShapeView): string | undefined {
    return shape.kind === 'box' ? '(box)' : undefined;
  }
}

class BoxPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.registerShape(new BoxProvider());
    context.registerAttribute(new BoxAttributes());
    context.registerDecorator(new BoxTypeLabel());
  }
}

export default new BoxPlugin();
