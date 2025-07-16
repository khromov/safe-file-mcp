import aiDigest from 'ai-digest';
import path from 'path';
import { getIgnoreFile, normalizeDisplayPath } from './handlers/utils.js';

interface ListFilesOptions {
  sortBy: 'size' | 'path';
  reverse: boolean;
  directory: string;
}

function parseArgs(): ListFilesOptions {
  const args = process.argv.slice(2);
  let sortBy: 'size' | 'path' = 'size';
  let reverse = false;
  let directory = '.';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--sort-by' && i + 1 < args.length) {
      const sortValue = args[i + 1];
      if (sortValue === 'size' || sortValue === 'path') {
        sortBy = sortValue;
      }
      i++; // Skip next arg since we used it
    } else if (arg === '--reverse' || arg === '-r') {
      reverse = true;
    } else if (arg === '--directory' && i + 1 < args.length) {
      directory = args[i + 1];
      i++; // Skip next arg since we used it
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npx context-coder ls [options]

List all files that will be included in the codebase analysis

Options:
  --sort-by <type>      Sort by "size" or "path" (default: "size")
  --reverse, -r         Reverse sort order (ascending instead of descending)
  --directory <dir>     Directory to analyze (default: ".")
  --help, -h            Show this help message
`);
      process.exit(0);
    }
  }

  return { sortBy, reverse, directory };
}

async function listFiles(options: ListFilesOptions) {
  const { sortBy, reverse, directory } = options;
  
  // Resolve directory path
  const inputDir = path.resolve(directory);
  
  console.log(`📋 Listing files in: ${inputDir}`);
  
  try {
    // Check for .cocoignore file
    const ignoreFile = await getIgnoreFile(inputDir);
    if (ignoreFile) {
      console.log(`🚫 Using ignore file: ${ignoreFile}`);
    } else {
      console.log(`🚫 Using default ignore patterns (.aidigestignore)`);
    }
    
    // Get file statistics
    const stats = await aiDigest.getFileStats({
      inputDir,
      ignoreFile,
      silent: true,
      additionalDefaultIgnores: ['.cocoignore'],
    });
    
    let files = stats.files || [];
    
    // Sort files
    if (sortBy === 'size') {
      files.sort((a, b) => reverse ? a.sizeInBytes - b.sizeInBytes : b.sizeInBytes - a.sizeInBytes);
    } else {
      files.sort((a, b) => {
        const aPath = normalizeDisplayPath(a.path, inputDir);
        const bPath = normalizeDisplayPath(b.path, inputDir);
        return reverse ? bPath.localeCompare(aPath) : aPath.localeCompare(bPath);
      });
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total files: ${files.length}`);
    console.log(`- Claude tokens: ${stats.totalClaudeTokens.toLocaleString()}`);
    console.log(`- ChatGPT tokens: ${stats.totalGptTokens.toLocaleString()}`);
    
    console.log(`\n📁 Files (sorted by ${sortBy}${reverse ? ' ascending' : ' descending'}):`);
    console.log('='.repeat(80));
    
    files.forEach((file, index) => {
      const sizeInKB = (file.sizeInBytes / 1024).toFixed(2);
      const displayPath = normalizeDisplayPath(file.path, inputDir);
      console.log(`${(index + 1).toString().padStart(4)}. ${displayPath.padEnd(50)} ${sizeInKB.padStart(10)} KB`);
    });
    
  } catch (error) {
    console.error(`❌ Error listing files: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Parse arguments and run
const options = parseArgs();
await listFiles(options);