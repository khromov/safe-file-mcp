# 🥥 Coco MCP Server Instructions

## Overview

Coco (Context Coder) is an MCP server that provides AI assistants with comprehensive codebase awareness. Unlike traditional file-by-file approaches, Coco enables you to understand entire project structures instantly through its intelligent code digestion capabilities.

## Primary Workflow

### 1. Start with Context
**ALWAYS begin by calling `get_codebase`** - This is the foundation of Coco's approach. This tool provides a complete representation of the entire codebase, giving you immediate understanding of:
- Project structure and organization
- All code files and their contents
- Dependencies and relationships
- Overall architecture patterns

The digest is paginated (100k chars/page). If you see a message like "You MUST call this tool again with page...", continue retrieving pages with get_codebase using the page parameter until you have the complete context.

### 2. Work with Full Context
Once you have the codebase digest, you can:
- Answer questions about any part of the code
- Suggest improvements that align with existing patterns
- Write new code that fits the project's style
- Understand complex interactions between components

### 3. Modify with Confidence
Use writing tools to make changes:
- `write_file` - Create or update files
- `create_directory` - Set up new directories
- `move_file` - Reorganize code structure

### 4. Use Other Tools Sparingly
Only use these tools when specifically needed:
- `read_file` - Only when explicitly asked to re-read a file or when the digest doesn't contain what you need
- `list_directory` - Only when users ask "what files are in X directory?"
- `directory_tree` - Only when users request a visual tree structure
- `search_files` - When looking for specific patterns across files
- `execute_command` - For running build/test commands

## Path Conventions

All paths are relative to the mounted root directory:
- Always use "./" prefix: `./src/index.ts`, `./package.json`
- Parent directory access ("../") is blocked for security
- In development mode, "./" maps to the `./mount` directory

## Best Practices

1. **Context First**: Always get the full codebase context before making suggestions or changes
2. **Respect Patterns**: Use the codebase digest to understand and follow existing conventions
3. **Minimal Reads**: Avoid redundant file reads when information is already in context
4. **Smart Navigation**: Use search instead of browsing when looking for specific code
5. **Safe Operations**: All file operations are atomic and secure

Remember: Coco's strength is providing complete context awareness. Use this to write better, more integrated code that truly fits the project.