# VibeWatch Documentation

Welcome to the VibeWatch documentation. This directory contains all project documentation including planning, development guides, and API references.

## Quick Links

| Document | Description |
|----------|-------------|
| [Main README](../README.md) | Quick start and installation |
| [CONTRIBUTING](../CONTRIBUTING.md) | How to contribute |

## Planning Documents

- [PRD.md](./planning/PRD.md) - Product Requirements Document
- [ROADMAP.md](./planning/ROADMAP.md) - Development roadmap with phases
- [FEATURE_IDEAS.md](./planning/FEATURE_IDEAS.md) - Future feature ideas and opportunities

## Development Process

- [PRE_COMMIT_CHECKLIST.md](./development/PRE_COMMIT_CHECKLIST.md) - Pre-commit safety checklist
- [PHASE0_COMPLETE.md](./development/PHASE0_COMPLETE.md) - Phase 0 completion summary
- [SESSION_SUMMARY.md](./development/SESSION_SUMMARY.md) - Development session notes

## Architecture Overview

```
src/
├── cli.ts           # Main CLI entry point (commander-based)
├── mcp-server.ts    # MCP server with stdio transport
├── api-server.ts    # Fastify HTTP API (localhost:3333)
├── buffer.ts        # Circular buffer with noise filtering
├── analyzer.ts      # Log analysis, error detection, relevance scoring
├── process-manager.ts # Child process spawning and monitoring
└── types.ts         # Shared TypeScript types
```

## Key Concepts

### Circular Buffer
The buffer stores the last N lines (default 100) of terminal output. It:
- Strips ANSI codes
- Filters noise (progress bars, HMR spam)
- Collapses repeated lines
- Preserves errors and warnings

### MCP Integration
VibeWatch exposes an MCP server that Claude Desktop/Cursor can connect to:
1. CLI starts API server on `localhost:3333`
2. MCP server connects to API via HTTP
3. Claude queries MCP tools to see terminal output

### Progressive Disclosure
To optimize token usage:
- `errors` - Only error lines (~200 tokens)
- `context` - Errors with surrounding lines (~500 tokens)
- `full` - All buffered output (~1000 tokens)

## API Reference

### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server status, buffer stats |
| GET | `/live` | Recent terminal output |
| GET | `/crash` | Crash snapshot (if crashed) |
| GET | `/errors` | Errors only |
| GET | `/context` | Errors with surrounding context |

### Query Parameters

**`/live`**
- `lines` - Number of lines (default: 50, max: 100)
- `filter` - `all`, `errors`, `warnings`
- `detail` - `errors`, `context`, `full`

**`/crash`**
- `verbose` - Include node_modules paths (`true`/`false`)

**`/context`**
- `window` - Lines before/after error (default: 5)

### MCP Tools

| Tool | Parameters | Description |
|------|------------|-------------|
| `get_terminal_output` | lines, filter, detail | Get recent output |
| `get_crash_context` | verbose | Get crash details |
| `get_recent_errors` | - | Get errors only |
| `ping` | - | Test connectivity |

## Project Status

| Phase | Status | Features |
|-------|--------|----------|
| Phase 0 | Complete | Project setup, prototypes |
| Phase 1 | Complete | CLI, buffer, API, MCP tools |
| Phase 2 | Complete | Relevance scoring, progressive disclosure |
| Phase 3 | Planned | Config system, Rust/Go, multi-process |
| Phase 4 | Planned | Dashboard, auto-fix, integrations |

## Getting Help

- [GitHub Issues](https://github.com/krjordan/vibewatch/issues)
- [Discussions](https://github.com/krjordan/vibewatch/discussions)
