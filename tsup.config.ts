import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    'mcp-server': 'src/mcp-server.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  target: 'node18',
  external: [
    '@modelcontextprotocol/sdk',
    'fastify',
    'strip-ansi',
    'commander',
    'zod',
  ],
});
