# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Coco MCP (Context Coder) is a secure file system access server implementing the Model Context Protocol. It provides AI models with controlled file operations within designated directories.

## Essential Commands

**Development:**

```bash
npm run dev          # Start development server with auto-reload
npm run build        # Compile TypeScript to dist/
npm start            # Run production server
```

**Testing:**

```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Architecture

The server follows a layered architecture:

1. **Transport Layer** (`src/streamableHttp.ts`): Handles HTTP/SSE communication with session management
2. **MCP Layer** (`src/mcp.ts`): Implements the Model Context Protocol server with 14 file operation tools
3. **File Operations** (`src/file-operations.ts`): Secure file system utilities with path validation
4. **Codebase Digest** (`src/codebase-digest.ts`): Handles AI-digest integration for token counting and file analysis

**Key Design Decisions:**

- All file paths must be relative (starting with "./")
- Parent directory access ("../") is blocked for security
- In development mode, operations are sandboxed to the `./mount` directory
- The server validates all paths to prevent directory traversal attacks
- Large codebases are handled with token counting and size warnings

## Development Notes

When working on this codebase:

1. **Path Handling**: Always use the `validatePath()` function from file-operations.ts when dealing with user-provided paths
2. **Error Messages**: Include the actual error details in responses to help with debugging
3. **Testing**: Add tests in `src/__tests__/` following the existing Jest/TypeScript setup
4. **Docker**: The Dockerfile uses a multi-stage build. Test Docker changes with `docker-compose up --build`
5. **Token Limits**: Be aware of Claude (150k) and ChatGPT (128k) token limits when processing codebases

## Available Tools

The server exposes 14 MCP tools for file operations:

- Codebase analysis: `get_codebase_size` (check size first), `get_codebase` (paginated summary)
- File reading: `read_file`, `read_multiple_files`, `get_file_info`
- Directory operations: `list_directory`, `directory_tree`, `create_directory`
- File writing: `write_file`, `move_file`
- Search: `search_files`
- Command execution: `execute_command`

**Important Workflow:**

1. Always run `get_codebase_size` FIRST to check if the codebase is within token limits
2. Then run `get_codebase` to get the actual code content
3. Use other tools only when specifically needed

See `src/mcp.ts` for the complete tool implementations.
