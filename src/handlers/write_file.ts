import { WriteFileArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import { writeFileSecure } from '../file-operations.js';
import fs from 'fs/promises';
import path from 'path';

export async function handleWriteFile(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  console.log('✏️ write_file handler started');

  const parsed = WriteFileArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
  }
  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);

  // Ensure parent directory exists
  const parentDir = path.dirname(absolutePath);
  await fs.mkdir(parentDir, { recursive: true });

  await writeFileSecure(absolutePath, parsed.data.content);

  const result = {
    content: [{ type: 'text', text: `Successfully wrote to ${parsed.data.path}` }],
  };

  console.log(
    `⏱️ write_file handler finished for path: ${parsed.data.path}, content length: ${parsed.data.content.length}`
  );
  return result;
}
