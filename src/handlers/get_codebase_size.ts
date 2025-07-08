import { GetCodebaseSizeArgsSchema } from '../schemas.js';
import { getCodebaseSize } from '../codebase-digest.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import aiDigest from 'ai-digest';
import path from 'path';

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

    // Get file statistics without content
    const stats = await aiDigest.getFileStats({
      inputDir: absolutePath,
      silent: true,
    });

    // Sort files by size (largest first) - they should already be sorted by ai-digest
    const sortedFiles = stats.files || [];

    let output = '';

    // Check token counts and provide warnings
    const claudeTokenLimit = 150000;
    const gptTokenLimit = 128000;

    let hasWarning = false;
    const hitClaudeLimit = stats.totalClaudeTokens > claudeTokenLimit;
    const hitGptLimit = stats.totalGptTokens > gptTokenLimit;

    if (hitClaudeLimit) {
      hasWarning = true;
      output += `⚠️ **WARNING: Large Codebase Detected for Claude**\n\n`;
      output += `The codebase contains ${stats.totalClaudeTokens.toLocaleString()} Claude tokens, which exceeds the recommended limit of ${claudeTokenLimit.toLocaleString()} tokens.\n\n`;
      output += `This may cause issues with Claude's context window. You should create a \`.aidigestignore\` file in the root of your project (similar to .gitignore) to exclude unnecessary files.\n\n`;
    }

    if (hitGptLimit) {
      if (!hasWarning) {
        output += `⚠️ **WARNING: Large Codebase Detected**\n\n`;
      }
      output += `Note: The codebase also contains ${stats.totalGptTokens.toLocaleString()} ChatGPT tokens (limit: ${gptTokenLimit.toLocaleString()}).\n\n`;
    }

    // Show token summary
    output += `## Token Summary\n\n`;
    output += `- **Claude tokens**: ${stats.totalClaudeTokens.toLocaleString()}\n`;
    output += `- **ChatGPT tokens**: ${stats.totalGptTokens.toLocaleString()}\n`;
    output += `- **Total files**: ${sortedFiles.length}\n\n`;

    // Only show top 10 largest files if we hit the token limits
    if ((hitClaudeLimit || hitGptLimit) && sortedFiles.length > 0) {
      output += `## Top 10 Largest Files\n\n`;
      output += `Consider adding some of these to your \`.aidigestignore\` file if they are not relevant to the project (test files, snapshots, external modules, test data, other unused files, etc):\n\n`;

      const top10Files = sortedFiles.slice(0, 10);
      top10Files.forEach((file, index) => {
        const sizeInKB = (file.sizeInBytes / 1024).toFixed(2);
        const relativePath = path.relative(absolutePath, file.path);
        output += `${index + 1}. \`./${relativePath}\` - ${sizeInKB} KB\n`;
      });

      if (sortedFiles.length > 10) {
        output += `\n... and ${sortedFiles.length - 10} more files.\n`;
        output += `\n💡 **Tip**: You can use the \`get_codebase_top_largest_files\` tool to see more large files. For example, to see the top 50 largest files, just ask me "show me the top 50 largest files in the codebase".\n`;
      }
    }

    // Add instruction to run get_codebase next
    output += `\n## Next Step\n\n`;
    output += `Now run \`get_codebase\` to retrieve the actual codebase content.`;

    // Store the top 100 files in case user asks for more (only if we hit limits)
    if ((hitClaudeLimit || hitGptLimit) && sortedFiles.length > 10) {
      const top100Files = sortedFiles.slice(0, 100).map((file, index) => {
        const sizeInKB = (file.sizeInBytes / 1024).toFixed(2);
        const relativePath = path.relative(absolutePath, file.path);
        return `${index + 1}. ./${relativePath} - ${sizeInKB} KB`;
      });

      // Add hidden comment with top 100 for potential follow-up
      output += `\n\n<!-- Top 100 files (hidden):\n${top100Files.join('\n')}\n-->`;
    }

    const handlerResult = {
      content: [{ type: 'text', text: output }],
    };

    console.log(
      `⏱️ get_codebase_size handler finished: ${sortedFiles.length} files, ${stats.totalClaudeTokens} tokens`
    );
    return handlerResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⏱️ get_codebase_size handler finished with error: ${errorMessage}`);
    throw new Error(`Failed to get codebase statistics: ${errorMessage}`);
  }
}
