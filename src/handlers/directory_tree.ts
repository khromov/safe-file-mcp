import { DirectoryTreeArgsSchema } from '../schemas.js';
import { HandlerContext, HandlerResponse } from '../types.js';
import { validateRelativePath, resolveRelativePath } from './utils.js';
import { buildTree } from '../file-operations.js';

export async function handleDirectoryTree(args: any, context: HandlerContext): Promise<HandlerResponse> {
  const parsed = DirectoryTreeArgsSchema.safeParse(args || {});
  if (!parsed.success) {
    throw new Error(`Invalid arguments for directory_tree: ${parsed.error}`);
  }
  validateRelativePath(parsed.data.path);
  const absolutePath = resolveRelativePath(parsed.data.path, context.absoluteRootDir);

  const treeData = await buildTree(absolutePath, [context.absoluteRootDir], context.absoluteRootDir);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(treeData, null, 2),
      },
    ],
  };
}
