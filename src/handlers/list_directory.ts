import { ListDirectoryArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import fs from 'fs/promises';

export async function handleListDirectory(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  const parsed = ListDirectoryArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
  }
  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const formatted = entries
    .map((entry) => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`)
    .join('\n');
  return {
    content: [{ type: 'text', text: formatted }],
  };
}
