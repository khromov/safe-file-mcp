import { SearchFileContentArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath, normalizeDisplayPath } from './utils.js';
import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';
import logger from '../logger.js';

interface SearchMatch {
  file: string;
  lineNumber: number;
  line: string;
  context: string[];
  matchedText: string;
}

export async function handleSearchFileContent(
  args: any,
  context: HandlerContext
): Promise<HandlerResponse> {
  const parsed = SearchFileContentArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for search_file_content: ${parsed.error}`);
  }

  logger.info(
    `🔍 search_file_content handler started: pattern "${parsed.data.pattern}", path ${parsed.data.path}`
  );

  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);

  try {
    const matches = await searchFileContent(
      absolutePath,
      parsed.data.pattern,
      {
        useRegex: parsed.data.useRegex,
        caseSensitive: parsed.data.caseSensitive,
        contextLines: parsed.data.contextLines,
        maxResults: parsed.data.maxResults,
        excludePatterns: parsed.data.excludePatterns,
      },
      context.absoluteRootDir
    );

    let resultText = '';

    if (matches.length === 0) {
      resultText = `No matches found for pattern "${parsed.data.pattern}"`;
    } else {
      resultText = `Found ${matches.length} match(es) for pattern "${parsed.data.pattern}":\n\n`;

      // Group matches by file
      const matchesByFile = new Map<string, SearchMatch[]>();
      for (const match of matches) {
        if (!matchesByFile.has(match.file)) {
          matchesByFile.set(match.file, []);
        }
        matchesByFile.get(match.file)!.push(match);
      }

      // Format results by file
      for (const [filePath, fileMatches] of matchesByFile) {
        resultText += `📄 **${filePath}** (${fileMatches.length} match${fileMatches.length > 1 ? 'es' : ''})\n`;

        for (const match of fileMatches) {
          resultText += `\n**Line ${match.lineNumber}:** \`${match.matchedText}\`\n`;
          resultText += '```\n';

          // Add context lines
          if (match.context.length > 0) {
            for (let i = 0; i < match.context.length; i++) {
              const contextLineNumber = match.lineNumber - parsed.data.contextLines + i;
              const isMatchLine = contextLineNumber === match.lineNumber;
              const prefix = isMatchLine ? '> ' : '  ';
              resultText += `${prefix}${contextLineNumber}: ${match.context[i]}\n`;
            }
          }

          resultText += '```\n';
        }

        resultText += '\n';
      }

      if (matches.length >= parsed.data.maxResults) {
        resultText += `\n⚠️ Search limited to ${parsed.data.maxResults} results. Use more specific patterns or increase maxResults to see more matches.\n`;
      }
    }

    const result = {
      content: [{ type: 'text', text: resultText }],
    };

    logger.info(
      `⏱️ search_file_content handler finished: found ${matches.length} matches for pattern "${parsed.data.pattern}"`
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`⏱️ search_file_content handler finished with error: ${errorMessage}`);
    throw new Error(`Failed to search file content: ${errorMessage}`);
  }
}

async function searchFileContent(
  rootPath: string,
  pattern: string,
  options: {
    useRegex: boolean;
    caseSensitive: boolean;
    contextLines: number;
    maxResults: number;
    excludePatterns: string[];
  },
  projectRoot: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  let totalMatches = 0;

  // Create regex pattern
  let searchRegex: RegExp;
  try {
    if (options.useRegex) {
      const flags = options.caseSensitive ? 'g' : 'gi';
      searchRegex = new RegExp(pattern, flags);
    } else {
      // Escape special regex characters for literal search
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = options.caseSensitive ? 'g' : 'gi';
      searchRegex = new RegExp(escapedPattern, flags);
    }
  } catch (error) {
    throw new Error(
      `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Define binary file extensions to skip
  const binaryExtensions = new Set([
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.bin',
    '.dat',
    '.db',
    '.sqlite',
    '.sqlite3',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.ico',
    '.svg',
    '.webp',
    '.tiff',
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.mkv',
    '.wav',
    '.flac',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.zip',
    '.rar',
    '.7z',
    '.gz',
    '.tar',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.otf',
  ]);

  async function searchInFile(filePath: string): Promise<void> {
    if (totalMatches >= options.maxResults) {
      return;
    }

    // Skip binary files based on extension
    const ext = path.extname(filePath).toLowerCase();
    if (binaryExtensions.has(ext)) {
      return;
    }

    // Check exclude patterns
    const relativePath = path.relative(projectRoot, filePath);
    const shouldExclude = options.excludePatterns.some((excludePattern) => {
      const globPattern = excludePattern.includes('*') ? excludePattern : `**/${excludePattern}/**`;
      return minimatch(relativePath, globPattern, { dot: true });
    });

    if (shouldExclude) {
      return;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length && totalMatches < options.maxResults; i++) {
        const line = lines[i];
        const lineMatches = line.match(searchRegex);

        if (lineMatches) {
          for (const matchText of lineMatches) {
            if (totalMatches >= options.maxResults) {
              break;
            }

            // Get context lines
            const contextStart = Math.max(0, i - options.contextLines);
            const contextEnd = Math.min(lines.length, i + options.contextLines + 1);
            const contextLines = lines.slice(contextStart, contextEnd);

            const displayPath = normalizeDisplayPath(filePath, projectRoot);

            matches.push({
              file: displayPath,
              lineNumber: i + 1, // 1-based line numbers
              line: line,
              context: contextLines,
              matchedText: matchText,
            });

            totalMatches++;
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read as text (likely binary files)
      if ((error as any).code !== 'EISDIR') {
        logger.debug(
          `Skipping file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  async function searchDirectory(currentPath: string): Promise<void> {
    if (totalMatches >= options.maxResults) {
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (totalMatches >= options.maxResults) {
          break;
        }

        const fullPath = path.join(currentPath, entry.name);

        try {
          if (entry.isDirectory()) {
            // Skip common directories that usually contain non-searchable content
            const skipDirs = new Set([
              'node_modules',
              '.git',
              '.svn',
              '.hg',
              'dist',
              'build',
              'target',
              'vendor',
              '__pycache__',
              '.venv',
              'venv',
              'ENV',
              'env',
              '.cache',
              '.turbo',
              '.next',
              '.nuxt',
              '.svelte-kit',
              'coverage',
            ]);

            if (!skipDirs.has(entry.name)) {
              await searchDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            await searchInFile(fullPath);
          }
        } catch (error) {
          // Skip entries that can't be accessed
          logger.debug(
            `Skipping ${fullPath}: ${error instanceof Error ? error.message : String(error)}`
          );
          continue;
        }
      }
    } catch (error) {
      // Skip directories that can't be read
      logger.debug(
        `Cannot read directory ${currentPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Start the search
  const stats = await fs.stat(rootPath);
  if (stats.isFile()) {
    await searchInFile(rootPath);
  } else if (stats.isDirectory()) {
    await searchDirectory(rootPath);
  }

  return matches;
}
