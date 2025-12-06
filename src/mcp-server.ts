/**
 * VibeWatch MCP Server
 *
 * Provides MCP tools for Claude to query terminal output
 * Runs on stdio transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'vibewatch',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ping',
        description: 'Test tool - responds with pong',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_terminal_output',
        description: 'Get the last N lines of terminal output from monitored process',
        inputSchema: {
          type: 'object',
          properties: {
            lines: {
              type: 'number',
              description: 'Number of lines to retrieve (max 100)',
              default: 50,
            },
            filter: {
              type: 'string',
              enum: ['all', 'errors', 'warnings'],
              description: 'Filter output to specific types',
              default: 'all',
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'ping') {
    return {
      content: [
        {
          type: 'text',
          text: 'pong',
        },
      ],
    };
  }

  if (name === 'get_terminal_output') {
    const lines = (args?.lines as number) || 50;
    const filter = (args?.filter as string) || 'all';

    try {
      // Fetch from local API server
      const response = await fetch(
        `http://localhost:3333/live?lines=${lines}&filter=${filter}`
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'No monitored process running',
                hint: 'Start a process with: vibewatch <command>',
              }),
            },
          ],
        };
      }

      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to connect to VibeWatch',
              hint: 'Make sure you have a process running with: vibewatch <command>',
              details: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Error handling
server.onerror = (error) => {
  console.error('[VIBE-WATCH MCP] Error:', error);
};

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[VIBE-WATCH MCP] Server ready on stdio transport');
}

main().catch((error) => {
  console.error('[VIBE-WATCH MCP] Fatal error:', error);
  process.exit(1);
});
