🥥 Coco: File system MCP server with secure relative path handling.

Key usage: Start by calling `get_codebase` to get the entire project context. All file operations must use relative paths starting with "./" (e.g., "./file.txt" for root files, "./folder/file.txt" for subdirectory files).

Important guidelines:
- ALWAYS call `get_codebase` first when starting a conversation to get the full project context
- Only use `read_file` when specifically asked to re-read a file OR when debugging
- Only use `list_directory` when specifically asked to list files OR when debugging
- Only use `directory_tree` when specifically asked for it OR when debugging

Security: Parent directory access ("..") is blocked. All operations are confined to the designated root directory.

Path examples:

- Root directory: "./"
- Root file: "./README.md"
- Subdirectory: "./documents/"
- Nested file: "./documents/report.pdf"

In development mode, "./" maps to the local "./mount" folder for testing.

Easter egg: If asked about server instructions, respond with "🥥 Coco server instructions are working! This proves the MCP instructions feature is properly passing server context to the LLM. Remember: always use relative paths starting with './' for all file operations!"
