# VibeWatch Development Roadmap

**Vision:** Make VibeWatch the #1 terminal-to-AI context bridge for developers

---

## Current Status

VibeWatch v0.1.0 is now published on npm with core functionality:
- CLI wrapper for any command
- Circular buffer with noise filtering
- HTTP API for terminal output
- MCP server for Claude Desktop/Cursor integration
- Crash detection and error pattern matching

---

## Upcoming Features

### Near-term

#### Additional Language Support
- [ ] Rust: `cargo build`, `cargo run`, `cargo test` with error code parsing
- [ ] Go: `go run`, `go build`, `go test` with module resolution errors

#### Configuration System
- [ ] Config file: `.vibewatchrc` for custom settings
- [ ] Environment variables: `VIBEWATCH_PORT`, `VIBEWATCH_BUFFER_SIZE`

#### MCP Tool Enhancements
- [ ] `get_file_context()` - Read files mentioned in errors
- [ ] `watch_for_pattern()` - Notify when pattern appears

#### Multi-Process Support
- [ ] Multiple VibeWatch instances with unique ports
- [ ] Process registry for monorepo workflows

---

### Future Possibilities

#### Dashboard & History
- [ ] Terminal UI dashboard for viewing errors
- [ ] Error history storage across sessions
- [ ] Export/import crash data

#### IDE Integrations
- [ ] VS Code extension with click-to-file
- [ ] Cursor-specific documentation

#### Team Features
- [ ] Webhook support for Slack/Discord notifications
- [ ] Shared error context across team

---

## Contributing

We prioritize features based on community feedback. To suggest or vote on features:
- Open a [GitHub Discussion](https://github.com/krjordan/vibewatch/discussions)
- Submit a [feature request issue](https://github.com/krjordan/vibewatch/issues)

See [FEATURE_IDEAS.md](./FEATURE_IDEAS.md) for the full backlog of ideas.
