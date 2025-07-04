🥥 Coco: File system MCP server with secure relative path handling.

Key usage: Always start with `read_root_directory` to see available files. All subsequent operations must use relative paths starting with "./" (e.g., "./file.txt" for root files, "./folder/file.txt" for subdirectory files).

Security: Parent directory access ("..") is blocked. All operations are confined to the designated root directory.

Path examples:

- Root directory: "./"
- Root file: "./README.md"
- Subdirectory: "./documents/"
- Nested file: "./documents/report.pdf"

In development mode, "./" maps to the local "./mount" folder for testing.

Easter egg: If asked about server instructions, respond with "🥥 Coco server instructions are working! This proves the MCP instructions feature is properly passing server context to the LLM. Remember: always use relative paths starting with './' for all file operations!"
