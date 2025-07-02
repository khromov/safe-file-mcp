import { z } from "zod";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";

// File info interface
export interface FileInfo {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: string;
}

// Tree entry interface for directory tree
export interface TreeEntry {
  name: string;
  type: 'file' | 'directory';
  children?: TreeEntry[];
}

// MCP tool types
const ToolInputSchema = ToolSchema.shape.inputSchema;
export type ToolInput = z.infer<typeof ToolInputSchema>;

// Tool input schemas
export const EchoSchema = z.object({
  message: z.string().describe("Message to echo"),
});

// Tool names enum
export enum ToolName {
  ECHO = "echo",
}