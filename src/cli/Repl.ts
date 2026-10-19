import { createInterface } from 'node:readline';
import { EditorError } from '../svg/EditorError.js';
import type { CommandRouter } from './CommandRouter.js';

const BANNER = "svg-editor 0.1 — type 'help' for commands";
const PROMPT = 'svg> ';

export class Repl {
  constructor(private readonly router: CommandRouter) {}

  async run(): Promise<void> {
    const interactive = process.stdin.isTTY === true;
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(BANNER);
    console.log();
    if (interactive) process.stdout.write(PROMPT);

    for await (const line of rl) {
      const output = this.#run(line);
      if (output !== '') console.log(output);
      if (interactive) process.stdout.write(PROMPT);
    }
  }

  #run(line: string): string {
    try {
      return this.router.run(line);
    } catch (error) {
      if (error instanceof EditorError) return `error: ${error.message}`;
      throw error;
    }
  }
}
