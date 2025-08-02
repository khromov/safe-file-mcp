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

// Generic tool handler with properly typed arguments
export type ToolHandler<T = Record<string, unknown>> = (
  args: T,
  context: HandlerContext
) => Promise<HandlerResponse>;

// MCP-specific types using proper structure based on tmcp specification
export interface McpCallToolResult {
  content?: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// Tool input type for tmcp compatibility - prefer Record<string, unknown> over any
export type ToolInput = Record<string, unknown>;
