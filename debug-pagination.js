import { generateCodebaseDigest } from './dist/codebase-digest.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugPagination() {
  const DEBUG_DIR = path.join(__dirname, 'debug-pagination-temp');
  await fs.mkdir(DEBUG_DIR, { recursive: true });

  try {
    // Create many small files to ensure we exceed page size
    for (let i = 1; i <= 10; i++) {
      await fs.writeFile(path.join(DEBUG_DIR, `file${i}.ts`), 'x'.repeat(2000));
    }

    console.log('Created 10 files of 2KB each = 20KB total raw content');

    // Test with small page size
    const result = await generateCodebaseDigest({
      inputDir: DEBUG_DIR,
      page: 1,
      pageSize: 4000, // 4KB page size
    });

    console.log('Result hasMorePages:', result.hasMorePages);
    console.log('Result content length:', result.content.length);
    
    if (result.hasMorePages) {
      console.log('SUCCESS: Pagination detected!');
      
      // Test page 2
      const page2Result = await generateCodebaseDigest({
        inputDir: DEBUG_DIR,
        page: 2,
        pageSize: 4000,
      });
      
      console.log('Page 2 hasMorePages:', page2Result.hasMorePages);
      console.log('Page 2 should show last page message:', page2Result.content.includes('Do NOT call this tool again'));
    } else {
      console.log('FAIL: No pagination detected');
      console.log('First 200 chars:', result.content.substring(0, 200));
    }
    
  } finally {
    await fs.rm(DEBUG_DIR, { recursive: true, force: true });
  }
}

debugPagination().catch(console.error);
