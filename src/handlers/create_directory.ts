import { CreateDirectoryArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import fs from 'fs/promises';

export async function handleCreateDirectory(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  console.log('📁 create_directory handler started');
  
  const parsed = CreateDirectoryArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for create_directory: ${parsed.error}`);
  }
  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);
  await fs.mkdir(absolutePath, { recursive: true });
  
  const result = {
    content: [{ type: 'text', text: `Successfully created directory ${parsed.data.path}` }],
  };
  
  console.log(`⏱️ create_directory handler finished for path: ${parsed.data.path}`);
  return result;
}
