import { GetCodebaseTopLargestFilesArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import aiDigest from 'ai-digest';
import path from 'path';

export async function handleGetCodebaseTopLargestFiles(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  console.log('📈 get_codebase_top_largest_files handler started');

  const parsed = GetCodebaseTopLargestFilesArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for get_codebase_top_largest_files: ${parsed.error}`);
  }

  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);

  try {
    console.log(`Getting file statistics for path: ${absolutePath}, count: ${parsed.data.count}`);

    // Get file statistics without content
    const stats = await aiDigest.getFileStats({
      inputDir: absolutePath,
      silent: true,
    });

    // Sort files by size (largest first) - they should already be sorted by ai-digest
    const sortedFiles = stats.files || [];

    let output = `## Top ${parsed.data.count} Largest Files\n\n`;

    const filesCount = Math.min(parsed.data.count, sortedFiles.length);

    if (filesCount === 0) {
      output += 'No files found in the specified directory.\n';
    } else {
      output += `Found ${sortedFiles.length} total files. Showing the top ${filesCount} largest:\n\n`;

      for (let i = 0; i < filesCount; i++) {
        const file = sortedFiles[i];
        const sizeInKB = (file.sizeInBytes / 1024).toFixed(2);
        const relativePath = path.relative(absolutePath, file.path);
        output += `${i + 1}. \`./${relativePath}\` - ${sizeInKB} KB\n`;
      }

      if (sortedFiles.length > filesCount) {
        output += `\n... and ${sortedFiles.length - filesCount} more files.\n`;
      }
    }

    output += '\n## Total Summary\n\n';
    output += `- **Total Claude tokens**: ${stats.totalClaudeTokens.toLocaleString()}\n`;
    output += `- **Total GPT tokens**: ${stats.totalGptTokens.toLocaleString()}\n`;
    output += `- **Total files**: ${sortedFiles.length}\n`;

    const handlerResult = {
      content: [{ type: 'text', text: output }],
    };

    console.log(`⏱️ get_codebase_top_largest_files handler finished: returned ${filesCount} files`);
    return handlerResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⏱️ get_codebase_top_largest_files handler finished with error: ${errorMessage}`);
    throw new Error(`Failed to get top largest files: ${errorMessage}`);
  }
}
