import { GetCodebaseArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import { generateCodebaseDigest } from '../codebase-digest.js';

export async function handleGetCodebase(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  const parsed = GetCodebaseArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for get_codebase: ${parsed.error}`);
  }

  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);

  try {
    console.log(`Generating codebase digest for path: ${absolutePath}`);
    const result = await generateCodebaseDigest({
      inputDir: absolutePath,
      page: parsed.data.page,
      pageSize: 99000, // Claude Desktop limits to 100,000 characters per page, so we leave some buffer
    });
    console.log(`Generated codebase digest with length: ${result.content.length}`);

    // The message is already in the correct format from codebase-digest.ts
    let content = result.content;

    return {
      content: [{ type: 'text', text: content }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate codebase digest: ${errorMessage}`);
  }
}
