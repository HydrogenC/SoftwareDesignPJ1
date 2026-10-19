import { EditorError } from '../svg/EditorError.js';

const WHITESPACE = /\s/;

/** 逐行拆词：空白分隔，双引号保留内部空格（引号本身去掉）。 */
export class LineParser {
  static parse(line: string): string[] {
    const trimmed = line.trim();
    // 只有行首 # 是注释；颜色值 #ffffff 必须原样保留。
    if (trimmed === '' || trimmed.startsWith('#')) return [];

    const tokens: string[] = [];
    let current = '';
    let started = false;
    let quoted = false;

    for (const char of trimmed) {
      if (quoted) {
        if (char === '"') quoted = false;
        else current += char;
        continue;
      }
      if (char === '"') {
        quoted = true;
        started = true;
        continue;
      }
      if (WHITESPACE.test(char)) {
        if (started) {
          tokens.push(current);
          current = '';
          started = false;
        }
        continue;
      }
      current += char;
      started = true;
    }

    if (quoted) throw new EditorError('unterminated quote');
    if (started) tokens.push(current);
    return tokens;
  }
}
