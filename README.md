# safe-file-mcp

_Work in progress_

This MCP server provides secure file system operations with relative path handling. It implements a comprehensive set of file management tools while ensuring all operations are contained within a designated root directory.

## Components

### Tools

1. `echo`
   - Simple tool to echo back input messages
   - Input:
     - `message` (string): Message to echo back
   - Returns: Text content with echoed message

2. `read_root_directory`
   - Read the contents of the root directory
   - This should be your first command when exploring the file system
   - No inputs required
   - Returns: List of files and directories in the root, with instructions to use relative paths

3. `read_file`
   - Read the complete contents of a file
   - Inputs:
     - `path` (string): Relative path from root directory (e.g., "./file.txt", "./folder/file.txt")
     - `tail` (number, optional): If provided, returns only the last N lines
     - `head` (number, optional): If provided, returns only the first N lines
   - Returns: File content as text

4. `read_multiple_files`
   - Read the contents of multiple files simultaneously
   - Input:
     - `paths` (array of strings): Array of relative paths from root directory
   - Returns: Combined content of all files with separators

5. `write_file`
   - Create a new file or overwrite an existing file
   - Inputs:
     - `path` (string): Relative path from root directory
     - `content` (string): Content to write to the file
   - Returns: Success confirmation

6. `edit_file`
   - Make line-based edits to a text file
   - Inputs:
     - `path` (string): Relative path from root directory
     - `edits` (array): Array of edit operations with oldText and newText
     - `dryRun` (boolean, default: false): Preview changes as diff without applying
   - Returns: Git-style diff showing changes made

7. `create_directory`
   - Create a new directory or ensure a directory exists
   - Input:
     - `path` (string): Relative path from root directory
   - Returns: Success confirmation

8. `list_directory`
   - Get a listing of files and directories
   - Input:
     - `path` (string): Relative path from root directory (use "./" for root)
   - Returns: List with [FILE] and [DIR] prefixes

9. `list_directory_with_sizes`
   - Get a detailed listing including file sizes
   - Inputs:
     - `path` (string): Relative path from root directory
     - `sortBy` (string, optional): Sort by "name" or "size"
   - Returns: Detailed listing with sizes and summary

10. `directory_tree`
    - Get a recursive tree view as JSON
    - Input:
      - `path` (string): Relative path from root directory
    - Returns: JSON structure of the directory tree

11. `move_file`
    - Move or rename files and directories
    - Inputs:
      - `source` (string): Source relative path
      - `destination` (string): Destination relative path
    - Returns: Success confirmation

12. `search_files`
    - Recursively search for files matching a pattern
    - Inputs:
      - `path` (string): Starting directory (relative path)
      - `pattern` (string): Search pattern (case-insensitive)
      - `excludePatterns` (array, optional): Patterns to exclude
    - Returns: List of matching file paths

13. `get_file_info`
    - Get detailed metadata about a file or directory
    - Input:
      - `path` (string): Relative path from root directory
    - Returns: File statistics including size, dates, type, and permissions

### Prompts

1. `complex_prompt`
   - Advanced prompt demonstrating argument handling
   - Required arguments:
     - `temperature` (number): Temperature setting
   - Optional arguments:
     - `style` (string): Output style preference
   - Returns: Multi-turn conversation demonstrating prompt capabilities

## Usage

All file operations use relative paths starting with "./". The server operates within a designated root directory:
- In development mode: Maps to the local `./mount` folder
- In production mode: Maps to the current directory

### Path Examples
- Root directory file: `./file.txt`
- Subdirectory file: `./folder/file.txt`
- Nested directory: `./parent/child/file.txt`

## Security Features

- All paths must be relative and start with "./"
- Parent directory references ("..") are not allowed
- Operations are confined to the designated root directory
- Atomic file operations prevent race conditions
- Secure file writing with exclusive creation flags

## Running from source

```shell
npm install
npm run build
npm run start
```

## Development Mode

```shell
npm run dev
```

This starts the server with auto-restart on code changes and maps "./" to the local "./mount" directory.

## Running with Docker

```shell
docker-compose up
```

The Docker container maps the local `./mount` directory to the container's root directory for file operations.