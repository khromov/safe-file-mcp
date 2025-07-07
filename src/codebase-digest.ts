import aiDigest from 'ai-digest';
import path from 'path';

export interface CodebaseDigestOptions {
  inputDir: string;
  page?: number;
  pageSize?: number;
}

export interface CodebaseDigestResult {
  content: string;
  hasMorePages: boolean;
  currentPage: number;
  nextPage?: number;
}

export interface CodebaseSizeOptions {
  inputDir: string;
}

export interface CodebaseSizeResult {
  content: string;
  hasWarning: boolean;
  totalClaudeTokens: number;
  totalGptTokens: number;
  totalFiles: number;
}

/**
 * Check codebase size and provide warnings if too large
 */
export async function getCodebaseSize(options: CodebaseSizeOptions): Promise<CodebaseSizeResult> {
  const { inputDir } = options;

  // Get file statistics without content
  const stats = await aiDigest.getFileStats({
    inputDir,
    silent: true,
  });

  // Sort files by size (largest first) - they should already be sorted by ai-digest
  const sortedFiles = stats.files || [];

  let output = '';

  // Check token counts and provide warnings
  const claudeTokenLimit = 150000;
  const gptTokenLimit = 128000;

  let hasWarning = false;

  if (stats.totalClaudeTokens > claudeTokenLimit) {
    hasWarning = true;
    output += `⚠️ **WARNING: Large Codebase Detected for Claude**\n\n`;
    output += `The codebase contains ${stats.totalClaudeTokens.toLocaleString()} Claude tokens, which exceeds the recommended limit of ${claudeTokenLimit.toLocaleString()} tokens.\n\n`;
    output += `This may cause issues with Claude's context window. You should create a \`.aidigestignore\` file in the root of your project (similar to .gitignore) to exclude unnecessary files.\n\n`;
  }

  if (stats.totalGptTokens > gptTokenLimit) {
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

  // Show top 10 largest files
  if (sortedFiles.length > 0) {
    output += `## Top 10 Largest Files\n\n`;
    output += `Consider adding some of these to your \`.aidigestignore\` file:\n\n`;

    const top10Files = sortedFiles.slice(0, 10);
    top10Files.forEach((file, index) => {
      const sizeInKB = (file.sizeInBytes / 1024).toFixed(2);
      const relativePath = path.relative(inputDir, file.path);
      output += `${index + 1}. \`./${relativePath}\` - ${sizeInKB} KB\n`;
    });

    if (sortedFiles.length > 10) {
      output += `\n... and ${sortedFiles.length - 10} more files.\n`;
    }
  }

  // Add instruction to run get_codebase next
  output += `\n## Next Step\n\n`;
  output += `Now run \`get_codebase\` to retrieve the actual codebase content.`;

  // Store the top 100 files in case user asks for more
  const top100Files = sortedFiles.slice(0, 100).map((file, index) => {
    const sizeInKB = (file.sizeInBytes / 1024).toFixed(2);
    const relativePath = path.relative(inputDir, file.path);
    return `${index + 1}. ./${relativePath} - ${sizeInKB} KB`;
  });

  // Add hidden comment with top 100 for potential follow-up
  if (sortedFiles.length > 10) {
    output += `\n\n<!-- Top 100 files (hidden):\n${top100Files.join('\n')}\n-->`;
  }

  return {
    content: output,
    hasWarning,
    totalClaudeTokens: stats.totalClaudeTokens,
    totalGptTokens: stats.totalGptTokens,
    totalFiles: sortedFiles.length,
  };
}

/**
 * Generate a paginated codebase digest using ai-digest
 * Large files (> pageSize) are replaced with omission messages
 */
export async function generateCodebaseDigest(
  options: CodebaseDigestOptions
): Promise<CodebaseDigestResult> {
  const { inputDir, page = 1, pageSize = 99000 } = options;

  // Get individual file objects from ai-digest
  const { files } = await aiDigest.generateDigestFiles({
    inputDir,
    silent: true,
  });

  let currentPage = 1;
  let currentPageContent = '';
  let currentPageCharCount = 0;
  let totalCharCount = 0;

  for (const file of files) {
    let fileContent = file.content;
    let fileCharCount = fileContent.length;

    // If file is larger than page size, replace with omission message
    if (fileCharCount > pageSize) {
      const omissionMessage = `# ${file.fileName}\nFile omitted due to large size (${fileCharCount.toLocaleString()} characters)\n`;
      fileContent = omissionMessage;
      fileCharCount = omissionMessage.length;
    }

    // Check if adding this file would exceed the page size
    if (currentPageCharCount + fileCharCount > pageSize && currentPageCharCount > 0) {
      // Move to next page
      if (currentPage === page) {
        // We've collected the requested page, stop here
        break;
      }
      currentPage++;
      currentPageContent = '';
      currentPageCharCount = 0;
    }

    // Add file to current page if we're on the requested page
    if (currentPage === page) {
      currentPageContent += fileContent;
      currentPageCharCount += fileCharCount;
    }

    totalCharCount += fileCharCount;
  }

  // Check if there are more pages
  const hasMorePages = totalCharCount > page * pageSize;

  if (hasMorePages) {
    currentPageContent += `\n\n---\nThis is page ${page}. You MUST call this tool again with page: ${page + 1} to get the rest of the files.\n`;
  }

  return {
    content: currentPageContent,
    hasMorePages,
    currentPage: page,
    nextPage: hasMorePages ? page + 1 : undefined,
  };
}
