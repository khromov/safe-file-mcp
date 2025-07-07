import { GetCodebaseSizeArgsSchema } from '../schemas.js';
import { getCodebaseSize } from '../codebase-digest.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';

export async function handleGetCodebaseSize(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  console.log('📊 get_codebase_size handler started');
  
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

    const handlerResult = {
      content: [{ type: 'text', text: result.content }],
    };
    
    console.log(`⏱️ get_codebase_size handler finished: ${result.totalFiles} files, ${result.totalClaudeTokens} tokens`);
    return handlerResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⏱️ get_codebase_size handler finished with error: ${errorMessage}`);
    throw new Error(`Failed to get codebase statistics: ${errorMessage}`);
  }
}
