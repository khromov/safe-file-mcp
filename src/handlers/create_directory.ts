import { CreateDirectoryArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import fs from 'fs/promises';
import logger from '../logger.js';

export async function handleCreateDirectory(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  logger.debug('📁 create_directory handler started');

  const parsed = CreateDirectoryArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for create_directory: ${parsed.error}`);
  }
  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);
  await fs.mkdir(absolutePath, { recursive: true });

  // Remove leading ./ from display path
  const displayPath = parsed.data.path.startsWith('./')
    ? parsed.data.path.slice(2)
    : parsed.data.path;

  const result = {
    content: [{ type: 'text', text: `Successfully created directory ${displayPath || '(root)'}` }],
  };

  logger.debug(`⏱️ create_directory handler finished for path: ${parsed.data.path}`);
  return result;
}
