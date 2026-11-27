import type { Command } from '../commands/Command.js';
import { EditorError } from '../svg/EditorError.js';

/** Invoker：按命令类别维护撤销/重做栈，并执行 IO 后的历史锁。 */
export class CommandHistory {
  readonly #undoStack: Command[] = [];
  readonly #redoStack: Command[] = [];
  #locked = false;

  execute(command: Command): string {
    const feedback = this.#feedback(command.execute());
    if (command.kind === 'edit') {
      this.#undoStack.push(command);
      this.#redoStack.length = 0;
      this.#locked = false;
    } else if (command.kind === 'document') {
      if (command.resetsHistory) {
        this.#undoStack.length = 0;
        this.#redoStack.length = 0;
      }
      if (command.locksHistory) this.#locked = true;
    }
    return feedback;
  }

  undo(): string {
    if (this.#locked) throw new EditorError('undo not allowed after io command');
    const command = this.#undoStack[this.#undoStack.length - 1];
    if (command === undefined) throw new EditorError('nothing to undo');
    const feedback = this.#feedback(command.undo());
    this.#undoStack.pop();
    this.#redoStack.push(command);
    return feedback;
  }

  redo(): string {
    if (this.#locked) throw new EditorError('undo not allowed after io command');
    const command = this.#redoStack[this.#redoStack.length - 1];
    if (command === undefined) throw new EditorError('nothing to redo');
    const feedback = this.#feedback(command.redo());
    this.#redoStack.pop();
    this.#undoStack.push(command);
    return feedback;
  }

  #feedback(value: string): string {
    if (typeof value !== 'string') throw new TypeError('command feedback must be a string');
    return value;
  }
}
