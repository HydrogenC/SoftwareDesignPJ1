import { CommandHistory } from '../cli/CommandHistory.js';
import { CommandRouter } from '../cli/CommandRouter.js';
import { TreeFormatter } from '../cli/TreeFormatter.js';
import { EditorSession } from '../commands/EditorSession.js';
import type { Registrations } from '../extensions/Registrations.js';
import { SvgReader } from '../io/SvgReader.js';
import { SvgWriter } from '../io/SvgWriter.js';
import { ShapeFactory } from '../registry/ShapeFactory.js';

export function createEditor(registrations: Registrations, report: (error: string) => void): CommandRouter {
  const factory = new ShapeFactory(registrations.shapes);
  const formatter = new TreeFormatter(registrations.decorators);
  const history = new CommandHistory();
  const context = new EditorSession({
    factory,
    reader: new SvgReader(factory),
    writer: new SvgWriter(),
    renderTree: root => formatter.render(root),
    history,
    registrations,
    report,
  });
  return new CommandRouter(context, history, registrations.commands);
}
