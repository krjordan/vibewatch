# VibeWatch

> Your AI pair programmer's eyes on your terminal

[![npm version](https://img.shields.io/npm/v/vibewatch.svg)](https://www.npmjs.com/package/vibewatch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is VibeWatch?

VibeWatch is a CLI tool that monitors your development commands and exposes terminal output to Claude (or any MCP-compatible AI assistant) in real-time. No more copy-pasting errors - just tell Claude "check my terminal" and it sees everything.

## Quick Start

```bash
# Install globally
npm install -g vibewatch

# Or run directly with npx
npx vibewatch npm run dev

# Your dev server runs normally, but now Claude can see it!
```

Then ask Claude: *"I'm getting an error, check my terminal"* - Claude automatically sees your terminal output via MCP.

## Installation

### Option 1: Global Install
```bash
npm install -g vibewatch
vibewatch npm run dev
```

### Option 2: npx (no install)
```bash
npx vibewatch npm run dev
```

### Option 3: Local Development
```bash
git clone https://github.com/krjordan/vibewatch.git
cd vibewatch
npm install
npm run build
node dist/cli.js npm run dev
```

## Usage

### Basic Usage

Wrap any command with `vibewatch`:

```bash
# JavaScript/TypeScript
vibewatch npm run dev
vibewatch npx next dev
vibewatch yarn dev
vibewatch pnpm dev

# Python
vibewatch python manage.py runserver
vibewatch uvicorn main:app --reload
vibewatch pytest

# Any command
vibewatch cargo run
vibewatch go run main.go
```

### CLI Options

```bash
vibewatch [options] <command>

Options:
  -p, --port <number>        API server port (default: 3333)
  -b, --buffer-size <number> Log buffer size (default: 100)
  -v, --verbose              Include node_modules in stack traces
  -r, --raw                  Disable noise filtering (keep all output)
  -k, --keep-alive <seconds> Keep API alive after crash for MCP queries (default: 30)
  -h, --help                 Display help
  -V, --version              Show version
```

### Examples

```bash
# Next.js with custom port
vibewatch --port 4444 npx next dev

# Keep API alive for 60 seconds after crash
vibewatch --keep-alive 60 npm run dev

# Disable noise filtering for debugging
vibewatch --raw npm run build

# Larger buffer for long-running processes
vibewatch --buffer-size 500 npm test
```

## MCP Integration

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vibewatch": {
      "command": "node",
      "args": ["/path/to/vibewatch/dist/mcp-server.js"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "vibewatch": {
      "command": "npx",
      "args": ["vibewatch-mcp"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_terminal_output` | Get recent terminal output with optional filtering |
| `get_crash_context` | Get detailed crash information with stack traces |
| `get_recent_errors` | Quick view of recent errors only |
| `ping` | Test connectivity |

### MCP Tool Parameters

**get_terminal_output:**
```typescript
{
  lines?: number,           // Max lines to retrieve (default: 50, max: 100)
  filter?: 'all' | 'errors' | 'warnings',  // Filter output type
  detail?: 'errors' | 'context' | 'full'   // Progressive disclosure level
}
```

**get_crash_context:**
```typescript
{
  verbose?: boolean  // Include node_modules/site-packages (default: false)
}
```

## API Endpoints

VibeWatch exposes a local HTTP API for direct queries:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Server status and buffer stats |
| `GET /live?lines=50&detail=context` | Recent output with progressive disclosure |
| `GET /crash` | Crash snapshot (if crashed) |
| `GET /errors` | Errors only |
| `GET /context?window=5` | Errors with surrounding context |

### Progressive Disclosure

Save tokens by requesting only what you need:

```bash
# Errors only (~200 tokens)
curl 'http://localhost:3333/live?detail=errors'

# Errors with context (~500 tokens)
curl 'http://localhost:3333/live?detail=context'

# Full output (~1000 tokens)
curl 'http://localhost:3333/live?detail=full'
```

## Features

### Framework Detection
VibeWatch automatically detects and optimizes for:
- **JavaScript:** Next.js, Vite, Webpack
- **Python:** Django, FastAPI, pytest
- **General:** Node.js, Python, Rust, Go

### Smart Filtering
- ANSI code stripping
- Noise reduction (progress bars, HMR updates)
- Repeated line collapsing
- Stack trace filtering (node_modules/site-packages hidden by default)

### Error Detection
- Language-aware error pattern matching
- Framework-specific error patterns
- Non-fatal error notifications
- Relevant file path extraction

### Crash Handling
- Automatic crash detection
- Buffer snapshot preservation
- Keep-alive mode for post-crash MCP queries
- Exit code and signal reporting

## Architecture

```
[Your Dev Command]
        ↓
[VibeWatch CLI] ─── wraps process, captures output
        ↓
[Circular Buffer] ─── last 100 lines, noise filtering
        ↓
[Fastify API] ─────── localhost:3333
        ↓
[MCP Server] ──────── stdio transport
        ↓
[Claude Desktop/Cursor/Any MCP Client]
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## Documentation

- [Product Requirements](./docs/planning/PRD.md)
- [Development Roadmap](./docs/planning/ROADMAP.md)
- [Feature Ideas](./docs/planning/FEATURE_IDEAS.md)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Support

- [GitHub Issues](https://github.com/krjordan/vibewatch/issues) - Bug reports & feature requests
- [Discussions](https://github.com/krjordan/vibewatch/discussions) - Questions & ideas

## License

MIT - see [LICENSE](./LICENSE) for details.

---

Built with love for the vibe coding community.
