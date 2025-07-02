import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const instructions = readFileSync(join(__dirname, "instructions.md"), "utf-8");

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

/* Input schemas for tools implemented in this server */
const EchoSchema = z.object({
  message: z.string().describe("Message to echo"),
});


enum ToolName {
  ECHO = "echo",
}

export const createServer = () => {
  const server = new Server(
    {
      name: "example-servers/everything",
      version: "1.0.0",
    },
    {
      capabilities: {
        prompts: {},
        tools: {},
      },
      instructions
    }
  );

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'complex_prompt',
          description: "A prompt with arguments",
          arguments: [
            {
              name: "temperature",
              description: "Temperature setting",
              required: true,
            },
            {
              name: "style",
              description: "Output style",
              required: false,
            },
          ],
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'complex_prompt') {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `This is a complex prompt with arguments: temperature=${args?.temperature}, style=${args?.style}`,
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: "I understand. You've provided a complex prompt with temperature and style arguments. How would you like me to proceed?",
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              data: "Please generate an image with the following parameters.",
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [
      {
        name: ToolName.ECHO,
        description: "Echoes back the input",
        inputSchema: zodToJsonSchema(EchoSchema) as ToolInput,
      },
    ];

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === ToolName.ECHO) {
      const validatedArgs = EchoSchema.parse(args);
      return {
        content: [{ type: "text", text: `Echo: ${validatedArgs.message}` }],
      };
    }


    throw new Error(`Unknown tool: ${name}`);
  });



  const cleanup = async () => {
  };

  return { server, cleanup };
};