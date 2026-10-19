import { Command, type CommandKind } from './Command.js';

const HELP = `commands:
  init [w] [h]                     new canvas (default 800x600)
  read <file.svg>                  load an SVG document
  save [file.svg]                  save the current document
  canvas [w] [h]                   show or resize the canvas

  create <type> <id> [params] [in <containerId>]
      rect    <x> <y> <w> <h> [fill]
      circle  <cx> <cy> <r> [fill]
      ellipse <cx> <cy> <rx> <ry> [fill]
      line    <x1> <y1> <x2> <y2> [stroke]
      text    <x> <y> "content"
      g
  delete <id>
  move <id> <dx> <dy>
  scale <id> <factor>
  set <id> <attr> <value>
  group <newGid> <id1> <id2>...
  ungroup <gid>
  addto <gid> <id>
  front <id>
  back <id>

  tree [id]                        show the structure tree
  show <id>                        show shape attributes
  help                             show this help
  undo                             undo the last edit
  redo                             redo the last undone edit

  a line starting with # is a comment; quote arguments containing spaces`;

export class HelpCommand extends Command {
  override readonly kind: CommandKind = 'display';

  execute(): string {
    return HELP;
  }
}
