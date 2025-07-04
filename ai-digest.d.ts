declare module 'ai-digest' {
  interface GenerateDigestOptions {
    inputDir: string;
    outputFile: string | null;
    silent?: boolean;
    exclude?: string[];
  }

  export function generateDigest(options: GenerateDigestOptions): Promise<string>;
  
  export default { generateDigest };
}