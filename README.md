# VibeWatch

> Your AI pair programmer's eyes on your terminal

**Status:** 🚧 In Development (Phase 0)

## What is VibeWatch?

VibeWatch is a CLI tool that monitors your development commands and exposes terminal output to Claude (or any MCP-compatible AI assistant) in real-time. No more copy-pasting errors - just tell Claude "check my terminal" and it sees everything.

## Quick Start

**Coming Soon!** VibeWatch is currently in Phase 0 development.

When ready, installation will be:

```bash
# Install globally
npm i -g vibewatch

# Run your dev command with monitoring
vibewatch npm run dev

# Ask Claude: "I'm getting an error, check my terminal"
# Claude automatically sees your terminal output via MCP
```

## Features (Planned)

### MVP (Phase 1)
- ✅ Live terminal monitoring (query anytime, not just crashes)
- ✅ Crash detection with automatic snapshot
- ✅ Smart filtering (ANSI stripping, noise reduction)
- ✅ MCP integration for Claude Desktop/Cursor
- ✅ Token-optimized output
- ✅ JavaScript/TypeScript + Python support

### Future Phases
- Browser console monitoring
- Multi-process support (monorepos)
- Interactive error resolution
- Test failure deep dive
- Team collaboration features

See [ROADMAP.md](./ROADMAP.md) for full development plan.

## Architecture

```
[Your Dev Command]
        ↓
[VibeWatch CLI] wraps process
        ↓
[Circular Buffer] (last 100 lines)
        ↓
[Fastify API] localhost:3333
        ↓
[MCP Server] stdio transport
        ↓
[Claude Desktop/Cursor]
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
```

## Project Status

- [x] Phase 0: Project setup
- [ ] Phase 1: MVP (Weeks 2-3)
- [ ] Phase 2: Polish (Weeks 4-5)
- [ ] Phase 3: Advanced features (Weeks 6-8)

## Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [ROADMAP.md](./ROADMAP.md) - Development roadmap
- [FEATURE_IDEAS.md](./FEATURE_IDEAS.md) - Future feature ideas

## License

MIT

## Contributing

We're in early development. Contributions welcome once we hit v0.1.0!
