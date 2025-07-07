import { GetCodebaseSizeArgsSchema } from '../schemas.js';
import { getCodebaseSize } from '../codebase-digest.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';

export async function handleGetCodebaseSize(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  const parsed = GetCodebaseSizeArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for get_codebase_size: ${parsed.error}`);
  }

  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);

  try {
    console.log(`Getting file statistics for path: ${absolutePath}`);

    const result = await getCodebaseSize({
      inputDir: absolutePath,
    });

    console.log(
      `Total Claude tokens: ${result.totalClaudeTokens}, Total GPT tokens: ${result.totalGptTokens}`
    );

    return {
      content: [{ type: 'text', text: result.content }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get codebase statistics: ${errorMessage}`);
  }
}
