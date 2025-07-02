# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MCP "Everything" Server - Development Guidelines

## Build, Test & Run Commands
- Build: `npm run build` - Compiles TypeScript to JavaScript and copies instructions.md to dist/
- Watch mode: `npm run watch` - Watches for changes and rebuilds automatically  
- Run server: `npm run start` - Starts the MCP server using streamable HTTP transport
- Development: `npm run dev` - Starts the server with auto-restart on code changes (uses nodemon)

## Architecture Overview

This is a comprehensive MCP (Model Context Protocol) server that implements all protocol features for testing and demonstration purposes. The server uses streamable HTTP transport exclusively.

### Core Components
- `everything.ts` - Main server implementation with all MCP features (tools, resources, prompts, sampling)
- `index.ts` - Entry point that starts the streamable HTTP server
- `streamableHttp.ts` - Streamable HTTP transport with session management

### Transport Architecture
The server uses streamable HTTP transport providing:
- Modern HTTP with streaming capabilities
- Session resumability
- WebSocket-like bidirectional communication over HTTP

### MCP Protocol Implementation
- **Tools**: 1 tool - echo (echoes back input messages)
- **Prompts**: 1 prompt - complex_prompt (demonstrates argument handling)

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
- No formal test suite - this is a demo/testing server for MCP protocol features

## Package Information
- Published as `@modelcontextprotocol/server-everything`
- Binary executable: `mcp-server-everything`
- Can be run via npx without installation: `npx -y @modelcontextprotocol/server-everything`
- Only supports streamable HTTP transport (runs on HTTP server by default)