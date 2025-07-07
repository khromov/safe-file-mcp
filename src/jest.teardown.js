const fs = require('fs/promises');
const path = require('path');

module.exports = async function globalTeardown() {
  const testBaseDir = path.join(__dirname, '__tests__', 'handlers', 'test-handlers-temp');
  
  try {
    await fs.rm(testBaseDir, { recursive: true, force: true });
    console.log('\nCleaned up test handlers temp directory');
  } catch (error) {
    // Directory might not exist if no tests were run
    if (error.code !== 'ENOENT') {
      console.error('Failed to clean up test handlers temp directory:', error);
    }
  }
};
