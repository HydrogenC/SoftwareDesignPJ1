import { EditorError } from '../svg/EditorError.js';

export function invokeExtension<T>(category: string, name: string, invoke: () => T): T {
  try {
    return invoke();
  } catch (error) {
    if (error instanceof EditorError) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    throw new EditorError(`${category} ${name} failed: ${reason}`);
  }
}
