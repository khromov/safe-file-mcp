import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedVersion: string | null = null;

/**
 * Get the version from package.json
 * Caches the result for subsequent calls
 */
export function getVersion(): string {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  let version: string;

  try {
    // Try different possible paths for package.json based on build/bundling context
    const possiblePaths = [
      join(__dirname, '..', '..', 'package.json'), // Original tsc build structure
      join(__dirname, '..', 'package.json'),       // Bundled structure (dist/index.js -> package.json)
      join(process.cwd(), 'package.json'),         // Current working directory
    ];
    
    let packageJson: any = null;
    for (const packageJsonPath of possiblePaths) {
      try {
        packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        break;
      } catch {
        // Try next path
        continue;
      }
    }
    
    if (packageJson) {
      version = packageJson.version || '1.0.0';
    } else {
      throw new Error('No package.json found');
    }
  } catch {
    // If package.json is not found, use a default version
    version = 'UNKNOWN';
  }

  cachedVersion = version;
  return version;
}
