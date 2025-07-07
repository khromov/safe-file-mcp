import { MoveFileArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import fs from 'fs/promises';
import path from 'path';

export async function handleMoveFile(args: any, context: HandlerContext): Promise<HandlerResponse> {
  console.log('🚚 move_file handler started');
  
  const parsed = MoveFileArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for move_file: ${parsed.error}`);
  }
  validateRelativePath(parsed.data.source);
  validateRelativePath(parsed.data.destination);
  const absoluteSource = resolveRelativePath(parsed.data.source, context.absoluteRootDir);
  const absoluteDest = resolveRelativePath(parsed.data.destination, context.absoluteRootDir);

  // Ensure destination parent directory exists
  const destParentDir = path.dirname(absoluteDest);
  await fs.mkdir(destParentDir, { recursive: true });

  await fs.rename(absoluteSource, absoluteDest);
  
  const result = {
    content: [
      {
        type: 'text',
        text: `Successfully moved ${parsed.data.source} to ${parsed.data.destination}`,
      },
    ],
  };
  
  console.log(`⏱️ move_file handler finished: ${parsed.data.source} -> ${parsed.data.destination}`);
  return result;
}
