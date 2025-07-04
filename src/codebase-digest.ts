import aiDigest from 'ai-digest';

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
