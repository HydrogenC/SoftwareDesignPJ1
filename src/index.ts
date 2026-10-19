import { ShapeFactory } from './registry/ShapeFactory.js';
import { SvgReader } from './io/SvgReader.js';
import { SvgWriter } from './io/SvgWriter.js';
import { CommandContext } from './commands/CommandContext.js';
import { CommandHistory } from './cli/CommandHistory.js';
import { CommandRouter } from './cli/CommandRouter.js';
import { TreeFormatter } from './cli/TreeFormatter.js';
import { Repl } from './cli/Repl.js';

const factory = new ShapeFactory();
const formatter = new TreeFormatter();
const context = new CommandContext(
  factory,
  new SvgReader(factory),
  new SvgWriter(),
  root => formatter.render(root),
);
const router = new CommandRouter(context, new CommandHistory());

await new Repl(router).run();
