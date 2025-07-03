# safe-file-mcp

_Work in progress_

This MCP server attempts to exercise all the features of the MCP protocol. It is not intended to be a useful server, but rather a test server for builders of MCP clients. It implements prompts, tools, resources, sampling, and more to showcase MCP capabilities.

## File System Access

This server provides secure file system access using **relative paths only**. All file operations must use paths starting with `./` (e.g., `./file.txt`, `./folder/file.txt`).

### Getting Started

1. First, call `read_root_directory` to see what files and directories are available
2. All subsequent file operations should use relative paths starting with `./`

### Path Examples

- `./hello.txt` - Access a file in the root directory
- `./folder/document.txt` - Access a file in a subdirectory
- `./data/` - Access a directory

## Components

### Tools

1. `echo`
   - Simple tool to echo back input messages
   - Input:
     - `message` (string): Message to echo back
   - Returns: Text content with echoed message

2. `read_root_directory`
   - **Call this first!** Lists the contents of the root directory
   - No inputs required
   - Returns: List of files and directories with instructions to use relative paths

3. `read_file`
   - Read the complete contents of a file
   - Inputs:
     - `path` (string): Relative path starting with `./`
     - `tail` (number, optional): Return only the last N lines
     - `head` (number, optional): Return only the first N lines
   - Returns: File contents

4. `read_multiple_files`
   - Read contents of multiple files simultaneously
   - Inputs:
     - `paths` (array): Array of relative paths starting with `./`
   - Returns: Contents of all files

5. `write_file`
   - Create or overwrite a file
   - Inputs:
     - `path` (string): Relative path starting with `./`
     - `content` (string): File content
   - Returns: Success message

6. `edit_file`
   - Make line-based edits to a text file
   - Inputs:
     - `path` (string): Relative path starting with `./`
     - `edits` (array): Array of {oldText, newText} replacements
     - `dryRun` (boolean): Preview changes without applying
   - Returns: Git-style diff of changes

7. `create_directory`
   - Create a new directory
   - Inputs:
     - `path` (string): Relative path starting with `./`
   - Returns: Success message

8. `list_directory`
   - List contents of a directory
   - Inputs:
     - `path` (string): Relative path starting with `./`
   - Returns: List of files and directories

9. `list_directory_with_sizes`
   - List directory contents with file sizes
   - Inputs:
     - `path` (string): Relative path starting with `./`
     - `sortBy` (string): Sort by "name" or "size"
   - Returns: Detailed directory listing

10. `directory_tree`
    - Get recursive tree view as JSON
    - Inputs:
      - `path` (string): Relative path starting with `./`
    - Returns: JSON tree structure

11. `move_file`
    - Move or rename files/directories
    - Inputs:
      - `source` (string): Relative source path starting with `./`
      - `destination` (string): Relative destination path starting with `./`
    - Returns: Success message

12. `search_files`
    - Recursively search for files
    - Inputs:
      - `path` (string): Relative path to start search
      - `pattern` (string): Search pattern
      - `excludePatterns` (array): Patterns to exclude
    - Returns: List of matching file paths

13. `get_file_info`
    - Get detailed file metadata
    - Inputs:
      - `path` (string): Relative path starting with `./`
    - Returns: File statistics

### Resources

The server provides 100 test resources in two formats:

- Even numbered resources:
  - Plaintext format
  - URI pattern: `test://static/resource/{even_number}`
  - Content: Simple text description

- Odd numbered resources:
  - Binary blob format
  - URI pattern: `test://static/resource/{odd_number}`
  - Content: Base64 encoded binary data

Resource features:
- Supports pagination (10 items per page)
- Allows subscribing to resource updates
- Demonstrates resource templates
- Auto-updates subscribed resources every 5 seconds

### Prompts

1. `simple_prompt`
   - Basic prompt without arguments
   - Returns: Single message exchange

2. `complex_prompt`
   - Advanced prompt demonstrating argument handling
   - Required arguments:
     - `temperature` (number): Temperature setting
   - Optional arguments:
     - `style` (string): Output style preference
   - Returns: Multi-turn conversation with images

3. `resource_prompt`
   - Demonstrates embedding resource references in prompts
   - Required arguments:
     - `resourceId` (number): ID of the resource to embed (1-100)
   - Returns: Multi-turn conversation with an embedded resource reference
   - Shows how to include resources directly in prompt messages

### Logging

The server sends random-leveled log messages every 15 seconds, e.g.:

```json
{
  "method": "notifications/message",
  "params": {
    "level": "info",
    "data": "Info-level message"
  }
}
```

## Usage with HTTP Clients

This server only supports streamable HTTP transport. Start the server and connect via HTTP:

```bash
npm run start
```

The server will start on the default HTTP port and accept MCP connections via streamable HTTP protocol.

## Running with Docker

The server can be run in a Docker container with a mounted volume:

```bash
# Build the image
docker build -t mcp-server .

# Run with a mounted directory
docker run -p 3001:3001 -v /path/to/your/files:/app/mount mcp-server
```

The mounted directory at `/app/mount` becomes the root directory for all file operations.

## Development Mode

In development mode, the `./mount` directory in the project is used as the root:

```bash
npm run dev
```

## Running from source

```shell
npm install
npm run build
npm run start
```

## Running as an installed package

### Install

```shell
npm install -g @modelcontextprotocol/server-everything@latest
```

### Run the server

```shell
npx @modelcontextprotocol/server-everything
```

## Run MCP inspector

```
npx @modelcontextprotocol/inspector
```