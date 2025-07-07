import { ReadFileArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import fs from 'fs/promises';

export async function handleReadFile(args: any, context: HandlerContext): Promise<HandlerResponse> {
  const parsed = ReadFileArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for read_file: ${parsed.error}`);
  }

  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);

  const content = await fs.readFile(absolutePath, 'utf-8');
  return {
    content: [{ type: 'text', text: content }],
  };
}
