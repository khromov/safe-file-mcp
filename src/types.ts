// Tree entry interface for directory tree
export interface TreeEntry {
  name: string;
  type: 'file' | 'directory';
  children?: TreeEntry[];
}

// Handler types
export interface HandlerContext {
  absoluteRootDir: string;
}

export interface HandlerResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
  [key: string]: unknown; // Allow additional properties
}

export type ToolHandler = (args: any, context: HandlerContext) => Promise<HandlerResponse>;

// MCP tool input type (generic object for tmcp compatibility)
export type ToolInput = Record<string, any>;
