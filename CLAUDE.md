# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MCP "Everything" Server - Development Guidelines

## Build, Test & Run Commands
- Build: `npm run build` - Compiles TypeScript to JavaScript and copies instructions.md to dist/
- Watch mode: `npm run watch` - Watches for changes and rebuilds automatically  
- Run server: `npm run start` - Starts the MCP server using stdio transport (default)
- Run SSE server: `npm run start:sse` - Starts the MCP server with SSE transport (deprecated)
- Run streamable HTTP server: `npm run start:streamableHttp` - Starts the MCP server with streamable HTTP transport

## Architecture Overview

This is a comprehensive MCP (Model Context Protocol) server that implements all protocol features for testing and demonstration purposes. The codebase follows a modular transport architecture:

### Core Components
- `everything.ts` - Main server implementation with all MCP features (tools, resources, prompts, sampling)
- `index.ts` - Entry point that routes to different transport implementations based on CLI args
- `stdio.ts` - Standard I/O transport (default for Claude Desktop integration)
- `sse.ts` - Server-Sent Events transport over HTTP (deprecated)
- `streamableHttp.ts` - Streamable HTTP transport with session management

### Transport Architecture
The server supports multiple transport protocols through a unified interface:
- **STDIO**: Direct process communication (primary usage)
- **SSE**: HTTP with Server-Sent Events (legacy)
- **Streamable HTTP**: Modern HTTP with streaming and session resumability

### MCP Protocol Implementation
- **Tools**: 8 tools demonstrating various MCP capabilities (echo, add, longRunningOperation, sampleLLM, etc.)
- **Resources**: 100 test resources (even IDs = text, odd IDs = binary) with pagination and subscriptions
- **Prompts**: 3 prompts showcasing argument handling and resource embedding
- **Sampling**: LLM sampling capability integration
- **Progress Notifications**: Long-running operation progress tracking
- **Logging**: Automatic log message generation with level filtering

## Code Style Guidelines
- Use ES modules with `.js` extension in import paths
- Strictly type all functions and variables with TypeScript
- Follow zod schema patterns for tool input validation
- Prefer async/await over callbacks and Promise chains
- Place all imports at top of file, grouped by external then internal
- Use descriptive variable names that clearly indicate purpose
- Implement proper cleanup for timers and resources in server shutdown
- Follow camelCase for variables/functions, PascalCase for types/classes, UPPER_CASE for constants
- Handle errors with try/catch blocks and provide clear error messages
- Use consistent indentation (2 spaces) and trailing commas in multi-line objects

## Key Dependencies
- `@modelcontextprotocol/sdk` - Core MCP protocol implementation
- `zod` - Schema validation for tool inputs
- `express` - HTTP server for SSE and streamable HTTP transports
- `zod-to-json-schema` - Convert zod schemas to JSON schema format

## Server Features
- Auto-generating log messages every 15 seconds (configurable level filtering)
- Resource subscription updates every 5 seconds
- Completion suggestions for prompt arguments and resource IDs
- Multi-modal content support (text + images)
- Session management for HTTP transports
- Progress token support for long-running operations

## Testing Notes
- Even-numbered resources (2, 4, 6...) contain plaintext
- Odd-numbered resources (1, 3, 5...) contain binary data
- Resources support pagination (10 items per page)
- All tools include comprehensive input validation via zod schemas