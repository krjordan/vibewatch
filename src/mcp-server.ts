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

const API_BASE = 'http://localhost:3333';

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
        description: 'Get the last N lines of terminal output from a monitored development process. Use this to see what\'s happening in the terminal, check for errors, or understand the current state of a running process.',
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
              description: 'Filter output to specific types. Use "errors" to see only error messages, "warnings" for warnings, or "all" for everything.',
              default: 'all',
            },
            detail: {
              type: 'string',
              enum: ['errors', 'context', 'full'],
              description: 'Detail level for progressive disclosure. "errors" returns only error lines (~200 tokens), "context" returns errors with surrounding context (~500 tokens), "full" returns all output (~1000 tokens). Start with "errors" or "context" to save tokens.',
              default: 'full',
            },
          },
        },
      },
      {
        name: 'get_crash_context',
        description: 'Get detailed context about a process crash, including the error message, stack trace, and relevant file paths. Use this when the user mentions a crash or when you need to understand why a process failed.',
        inputSchema: {
          type: 'object',
          properties: {
            verbose: {
              type: 'boolean',
              description: 'Include node_modules/site-packages in stack traces (default: false)',
              default: false,
            },
          },
        },
      },
      {
        name: 'get_recent_errors',
        description: 'Get only recent error lines from the terminal output. This is a quick way to see what went wrong without scrolling through all output.',
        inputSchema: {
          type: 'object',
          properties: {},
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
    const lines = Math.min((args?.lines as number) || 50, 100);
    const filter = (args?.filter as string) || 'all';
    const detail = (args?.detail as string) || 'full';

    try {
      const response = await fetch(
        `${API_BASE}/live?lines=${lines}&filter=${filter}&detail=${detail}`
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

  if (name === 'get_crash_context') {
    const verbose = (args?.verbose as boolean) ?? false;

    try {
      const response = await fetch(
        `${API_BASE}/crash?verbose=${verbose}`
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

      const data = await response.json() as { error?: string; [key: string]: unknown };

      // Check if there's no crash
      if (data.error === 'No crash detected') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'no_crash',
                message: 'The process is still running or exited cleanly.',
                hint: 'Use get_terminal_output to see the current output.',
              }),
            },
          ],
        };
      }

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

  if (name === 'get_recent_errors') {
    try {
      const response = await fetch(`${API_BASE}/live?filter=errors`);

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

      const data = await response.json() as { output?: string[]; process_status?: string; [key: string]: unknown };

      if (data.output?.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'no_errors',
                message: 'No errors detected in recent output.',
                process_status: data.process_status,
              }),
            },
          ],
        };
      }

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
