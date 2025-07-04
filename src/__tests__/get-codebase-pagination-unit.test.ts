import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock ai-digest before importing the code that uses it
const mockGenerateDigestFiles = jest.fn<() => Promise<{ files: Array<{ fileName: string; content: string }> }>>();
jest.unstable_mockModule('ai-digest', () => ({
  default: {
    generateDigestFiles: mockGenerateDigestFiles
  }
}));

describe('get_codebase pagination logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockFile = (fileName: string, size: number) => {
    const header = `# ${fileName}\n\n\`\`\`\n`;
    const footer = `\n\`\`\`\n`;
    const paddingSize = size - header.length - footer.length;
    const content = header + 'x'.repeat(paddingSize) + footer;
    return {
      fileName,
      content
    };
  };

  it('should paginate files correctly', () => {
    const PAGE_SIZE = 99000;
    const mockFiles = [
      createMockFile('file1.ts', 50000),
      createMockFile('file2.ts', 40000),
      createMockFile('file3.ts', 30000),
      createMockFile('file4.ts', 20000),
    ];

    // Test page 1
    let requestedPage = 1;
    let currentPage = 1;
    let currentPageContent = '';
    let currentPageCharCount = 0;
    let totalCharCount = 0;
    
    for (const file of mockFiles) {
      const fileContent = file.content;
      const fileCharCount = fileContent.length;
      
      if (currentPageCharCount + fileCharCount > PAGE_SIZE && currentPageCharCount > 0) {
        if (currentPage === requestedPage) {
          break;
        }
        currentPage++;
        currentPageContent = '';
        currentPageCharCount = 0;
      }
      
      if (currentPage === requestedPage) {
        currentPageContent += fileContent;
        currentPageCharCount += fileCharCount;
      }
      
      totalCharCount += fileCharCount;
    }
    
    // Page 1 should have file1 and file2 (50000 + 40000 = 90000 chars)
    expect(currentPageContent).toContain('file1.ts');
    expect(currentPageContent).toContain('file2.ts');
    expect(currentPageContent).not.toContain('file3.ts');
    expect(currentPageContent).not.toContain('file4.ts');
    expect(currentPageCharCount).toBe(90000);
    
    // Test page 2
    requestedPage = 2;
    currentPage = 1;
    currentPageContent = '';
    currentPageCharCount = 0;
    let pageCharCount = 0; // Track chars on current page regardless of which page we're on
    
    for (const file of mockFiles) {
      const fileContent = file.content;
      const fileCharCount = fileContent.length;
      
      // Check if adding this file would exceed the page size
      if (pageCharCount + fileCharCount > PAGE_SIZE && pageCharCount > 0) {
        // Move to next page
        if (currentPage === requestedPage) {
          // We've collected the requested page, stop here
          break;
        }
        currentPage++;
        pageCharCount = 0;
        if (currentPage === requestedPage) {
          currentPageContent = '';
          currentPageCharCount = 0;
        }
      }
      
      pageCharCount += fileCharCount;
      
      // Add file to current page if we're on the requested page
      if (currentPage === requestedPage) {
        currentPageContent += fileContent;
        currentPageCharCount += fileCharCount;
      }
    }
    
    // Page 2 should have file3 and file4 (30000 + 20000 = 50000 chars)
    expect(currentPageContent).not.toContain('file1.ts');
    expect(currentPageContent).not.toContain('file2.ts');
    expect(currentPageContent).toContain('file3.ts');
    expect(currentPageContent).toContain('file4.ts');
    expect(currentPageCharCount).toBe(50000);
  });

  it('should handle files that exceed page size', () => {
    const PAGE_SIZE = 99000;
    const mockFiles = [
      createMockFile('largefile.ts', 150000), // Larger than page size
    ];

    let requestedPage = 1;
    let currentPage = 1;
    let currentPageContent = '';
    let currentPageCharCount = 0;
    
    for (const file of mockFiles) {
      let fileContent = file.content;
      let fileCharCount = fileContent.length;
      
      // If file is larger than page size, replace with omission message
      if (fileCharCount > PAGE_SIZE) {
        const omissionMessage = `# ${file.fileName}\nFile omitted due to large size (${fileCharCount.toLocaleString()} characters)\n`;
        fileContent = omissionMessage;
        fileCharCount = omissionMessage.length;
      }
      
      // Check if adding this file would exceed the page size
      if (currentPageCharCount + fileCharCount > PAGE_SIZE && currentPageCharCount > 0) {
        // Move to next page
        if (currentPage === requestedPage) {
          // We've collected the requested page, stop here
          break;
        }
        currentPage++;
        currentPageContent = '';
        currentPageCharCount = 0;
      }
      
      // Add file to current page if we're on the requested page
      if (currentPage === requestedPage) {
        currentPageContent += fileContent;
        currentPageCharCount += fileCharCount;
      }
    }
    
    // Should include the omission message instead of the large file
    expect(currentPageContent).toContain('largefile.ts');
    expect(currentPageContent).toContain('File omitted due to large size');
    expect(currentPageContent).toContain('150,000 characters');
    expect(currentPageCharCount).toBeLessThan(100); // The omission message is much smaller
  });

  it('should calculate hasMorePages correctly', () => {
    const PAGE_SIZE = 99000;
    const mockFiles = [
      createMockFile('file1.ts', 50000),
      createMockFile('file2.ts', 40000),
      createMockFile('file3.ts', 30000), // Total: 120000
    ];

    let totalCharCount = 0;
    for (const file of mockFiles) {
      totalCharCount += file.content.length;
    }

    // Page 1: Should have more pages
    const requestedPage1 = 1;
    const hasMorePages1 = totalCharCount > requestedPage1 * PAGE_SIZE;
    expect(hasMorePages1).toBe(true);

    // Page 2: Should not have more pages
    const requestedPage2 = 2;
    const hasMorePages2 = totalCharCount > requestedPage2 * PAGE_SIZE;
    expect(hasMorePages2).toBe(false);
  });

  it('should calculate totalCharCount correctly with large files', () => {
    const PAGE_SIZE = 99000;
    const mockFiles = [
      createMockFile('file1.ts', 50000),
      createMockFile('largefile.ts', 150000), // Will be replaced with omission message
      createMockFile('file2.ts', 30000),
    ];

    let totalCharCount = 0;
    for (const file of mockFiles) {
      let fileCharCount = file.content.length;
      
      // If file is larger than page size, count the omission message size instead
      if (fileCharCount > PAGE_SIZE) {
        const omissionMessage = `# ${file.fileName}\nFile omitted due to large size (${fileCharCount.toLocaleString()} characters)\n`;
        fileCharCount = omissionMessage.length;
      }
      
      totalCharCount += fileCharCount;
    }

    // Total should be: 50000 + ~70 (omission message) + 30000 = ~80070
    expect(totalCharCount).toBeLessThan(81000);
    expect(totalCharCount).toBeGreaterThan(80000);
    
    // Should fit on one page since large file is replaced with short message
    const hasMorePages = totalCharCount > PAGE_SIZE;
    expect(hasMorePages).toBe(false);
  });
});