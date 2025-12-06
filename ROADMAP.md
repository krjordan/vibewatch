# VibeWatch Development Roadmap

**Last Updated:** December 5, 2024
**Vision:** Make VibeWatch the #1 terminal-to-AI context bridge for developers

---

## Overview

This roadmap outlines the phased development of VibeWatch from MVP to comprehensive developer tool ecosystem. We prioritize **speed to market** (MVP in 2-3 weeks) and **user feedback** (iterate based on real usage).

---

## Phase 0: Foundation (Week 1)

**Goal:** Set up project infrastructure and validate core technical approach

### Milestones

#### 0.1 Project Setup
- [x] Research MCP ecosystem and competitive landscape
- [x] Finalize PRD with live monitoring scope
- [ ] Initialize TypeScript project
- [ ] Configure `tsup` for build
- [ ] Set up `package.json` with bin configuration
- [ ] Create GitHub repository
- [ ] Set up CI/CD (GitHub Actions)

#### 0.2 Core Prototypes
- [ ] **Prototype 1:** Basic child process spawning
  - Spawn `npm run dev` successfully
  - Pass-through stdout/stderr to terminal
  - Verify no output corruption

- [ ] **Prototype 2:** Circular buffer implementation
  - Buffer last 100 lines
  - Test memory limits (~200KB)
  - Verify FIFO behavior

- [ ] **Prototype 3:** MCP server hello world
  - Stdio transport connection
  - Single tool: `ping()` → "pong"
  - Test with Claude Desktop

**Exit Criteria:**
- All 3 prototypes working
- No technical blockers identified
- Confidence in 2-week MVP timeline

---

## Phase 1: MVP - Core Functionality (Weeks 2-3)

**Goal:** Ship working product that solves the core problem - live terminal monitoring via MCP

**Target Launch Date:** Week 3 (Dec 19-26, 2024)

### Milestones

#### 1.1 CLI Wrapper (Week 2, Days 1-2)
- [ ] Implement `cli.ts` with `commander`
  - Parse: `npx vibe-watch <command>`
  - Handle multiple arguments
  - Display help text

- [ ] Process spawning with `child_process.spawn`
  - Capture stdout and stderr
  - Pass-through to terminal (user sees normal output)
  - Handle process exit codes

- [ ] Terminal UI banners
  - Startup: `[VIBE-WATCH] Monitoring: <command>`
  - Running: Transparent (no spam)
  - On error: `[VIBE-WATCH] ⚠️ Error detected`

**Deliverable:** Can run `npx vibe-watch npm run dev` and see output

#### 1.2 Buffer & Filtering (Week 2, Days 3-4)
- [ ] Circular buffer implementation
  - Store last 100 lines
  - ANSI code stripping (`strip-ansi`)
  - Basic line deduplication

- [ ] Error pattern detection (regex-based)
  - JavaScript: `Error:`, `TypeError:`, `SyntaxError:`
  - Python: `Traceback`, `ImportError:`, `ModuleNotFoundError:`
  - Build failures: `Failed to compile`, `Build failed`

- [ ] Crash detection
  - Exit code !== 0
  - Lock buffer snapshot on crash
  - Preserve snapshot until next run

**Deliverable:** Buffer correctly stores and filters terminal output

#### 1.3 Local API Server (Week 2, Day 5)
- [ ] Fastify server setup
  - Bind to `127.0.0.1:3333`
  - Health check endpoint: `GET /health`

- [ ] Core endpoints
  - `GET /live?lines=50` - Current buffer state
  - `GET /crash` - Locked crash snapshot (if exists)

- [ ] JSON response format
  ```json
  {
    "output": ["line1", "line2"],
    "timestamp": "ISO-8601",
    "process_status": "running|crashed|exited",
    "errors_detected": true|false
  }
  ```

**Deliverable:** `curl http://localhost:3333/live` returns buffer contents

#### 1.4 MCP Server (Week 3, Days 1-2)
- [ ] MCP server with stdio transport
  - Connect to `@modelcontextprotocol/sdk`
  - Error handling and logging (to stderr)

- [ ] Tool 1: `get_terminal_output()`
  - Input: `{ lines?: number, filter?: "all"|"errors" }`
  - Fetch from `http://localhost:3333/live`
  - Return structured JSON

- [ ] Tool 2: `get_crash_context()`
  - Input: `{ verbose?: boolean }`
  - Fetch from `http://localhost:3333/crash`
  - Return crash snapshot or null

**Deliverable:** Claude Desktop can call MCP tools and see terminal output

#### 1.5 Testing & Polish (Week 3, Days 3-4)
- [ ] Manual testing across scenarios
  - Next.js dev server (TypeScript errors)
  - Python Django runserver
  - pytest with failures
  - Process crashes

- [ ] Cross-platform testing
  - macOS
  - Linux (Ubuntu)
  - Windows (via npx)

- [ ] Documentation
  - README.md with quick start
  - Installation instructions
  - Claude Desktop MCP config example
  - Usage examples

**Deliverable:** MVP works reliably across platforms

#### 1.6 Launch (Week 3, Day 5)
- [ ] Publish to npm
  - Package name: `vibewatch`
  - Version: `0.1.0`
  - Test: `npx vibewatch@latest`

- [ ] Submit to MCP registries
  - [mcp.so](https://mcp.so)
  - [mcpservers.org](https://mcpservers.org)
  - GitHub: awesome-mcp-servers PR

- [ ] Launch posts
  - Reddit: r/ClaudeAI, r/webdev
  - Twitter/X: Tag @AnthropicAI
  - Dev.to: "I built an MCP to eliminate copy-paste debugging"

**Deliverable:** Public release, 100+ developers aware

### MVP Success Criteria
- ✅ `npx vibewatch npm run dev` works
- ✅ Claude can query terminal via `get_terminal_output()`
- ✅ Crash detection + snapshot works
- ✅ Published to npm
- ✅ 50+ npm downloads in first week
- ✅ 1+ GitHub star (validates interest)

---

## Phase 2: Polish & Optimization (Weeks 4-5)

**Goal:** Improve UX, token optimization, and language support based on early feedback

### Milestones

#### 2.1 Enhanced Filtering (Week 4)
- [ ] Noise reduction
  - Collapse repeated lines (webpack progress bars)
  - Deduplicate consecutive empty lines
  - Detect and collapse HMR update spam

- [ ] Stack trace filtering
  - Strip `node_modules` by default
  - Keep first/last frame for context
  - Verbose mode: include full stack

- [ ] Relevance scoring
  - Prioritize error lines
  - Deprioritize info/debug logs
  - Return high-value lines first

#### 2.2 Python Support (Week 4)
- [ ] Python error pattern detection
  - Full traceback parsing: `File "...", line X`
  - Django errors: `django.db.*`, `django.urls.*`
  - FastAPI: Pydantic validation errors
  - pytest: test failures, assertion errors

- [ ] File path extraction from tracebacks
  - Parse: `File "/app/views.py", line 42`
  - Return: `relevant_files: ["/app/views.py:42"]`

- [ ] Test with popular frameworks
  - Django `manage.py runserver`
  - FastAPI `uvicorn main:app --reload`
  - pytest suite

#### 2.3 Error Detection Improvements (Week 5)
- [ ] Framework-specific patterns
  - Next.js: "Fast Refresh", hydration errors
  - Vite: "hmr update", "dependency pre-bundling"
  - TypeScript: Multi-line type errors

- [ ] Language auto-detection
  - Detect from command: `pytest` → Python
  - Detect from shebang: `#!/usr/bin/env python3`
  - Load appropriate error patterns

- [ ] Non-fatal error notifications
  - Detect error while process running
  - Display: `[VIBE-WATCH] ⚠️ Error detected (process still running)`
  - Don't lock snapshot (buffer keeps rolling)

#### 2.4 Token Optimization (Week 5)
- [ ] Progressive disclosure
  - First query: errors only (~200 tokens)
  - Second query: errors + context (~500 tokens)
  - Full query: all 100 lines (~1000 tokens)

- [ ] Smart context windowing
  - Return 5 lines before/after error
  - Collapse unimportant middle sections
  - Indicator: `... [25 lines collapsed] ...`

- [ ] File path enrichment
  - Include file paths in response
  - Claude can auto-fetch files if needed
  - Format: `"src/app.tsx:42:15"`

### Phase 2 Success Criteria
- ✅ Token usage <500 on average (vs 1500+ raw paste)
- ✅ Python workflows work smoothly
- ✅ 250+ npm downloads/week
- ✅ 5+ GitHub issues (shows engagement)
- ✅ Positive user feedback on Reddit/Twitter

---

## Phase 3: Advanced Features (Weeks 6-8)

**Goal:** Add power-user features and broader language support

### Milestones

#### 3.1 Additional Language Support (Week 6)
- [ ] Rust
  - `cargo build`, `cargo run`, `cargo test`
  - Compiler error codes: `E0XXX`
  - `RUST_BACKTRACE=1` handling

- [ ] Go
  - `go run`, `go build`, `go test`
  - Module resolution errors
  - Simple error format parsing

#### 3.2 Configuration System (Week 6-7)
- [ ] Config file: `.vibewatchrc`
  ```json
  {
    "bufferSize": 100,
    "filterPatterns": ["custom regex"],
    "ignorePatterns": ["DEBUG", "INFO"],
    "port": 3333,
    "language": "auto|javascript|python|rust|go"
  }
  ```

- [ ] CLI flags
  - `--buffer-size <n>` - Override buffer size
  - `--port <n>` - Change API server port
  - `--verbose` - Include node_modules in output
  - `--filter <type>` - Pre-filter output

- [ ] Environment variables
  - `VIBEWATCH_PORT`
  - `VIBEWATCH_BUFFER_SIZE`
  - `VIBEWATCH_VERBOSE`

#### 3.3 MCP Tool Enhancements (Week 7)
- [ ] Tool 3: `get_recent_errors()`
  - Return only error lines from last 5 minutes
  - Useful for long-running processes
  - Smart time-based filtering

- [ ] Tool 4: `get_file_context()`
  - Input: File path from error
  - Return: File contents around error line
  - Integration: Claude can read files mentioned in errors

- [ ] Tool enhancement: `watch_for_pattern()`
  - Input: Regex pattern to watch
  - Notify when pattern appears
  - Use case: "Tell me when build completes"

#### 3.4 Multi-Process Support (Week 8)
- [ ] Multiple VibeWatch instances
  - Each process gets unique port
  - MCP can query specific process
  - Use case: Monorepo with multiple dev servers

- [ ] Process registry
  - Track all running VibeWatch instances
  - Tool: `list_monitored_processes()`
  - Tool: `get_terminal_output({ processId })`

### Phase 3 Success Criteria
- ✅ Rust/Go workflows supported
- ✅ Configuration system working
- ✅ 500+ weekly active users
- ✅ 10+ community feature requests
- ✅ 2+ external contributors (PRs merged)

---

## Phase 4: Enterprise & Ecosystem (Weeks 9-12)

**Goal:** Position for team adoption and build ecosystem integrations

### Milestones

#### 4.1 Error History & Dashboard (Week 9-10)
- [ ] Terminal UI dashboard (optional)
  - TUI library: `ink` (React for terminal)
  - View: Recent errors, crash history
  - Interactive: Navigate, filter, search

- [ ] Error history storage (in-memory)
  - Keep last 10 crashes in session
  - Tool: `get_error_history()`
  - Compare errors: "Is this the same as before?"

- [ ] Export functionality
  - Export crash as JSON
  - Share with teammates: `vibewatch export crash.json`
  - Import: `vibewatch import crash.json`

#### 4.2 Auto-Fix Mode (Week 10-11)
- [ ] `--fix` flag experimental
  ```bash
  npx vibewatch --fix npm run dev
  ```

- [ ] On crash:
  1. Detect crash
  2. Auto-invoke Claude via MCP
  3. Get suggested fix
  4. Ask user: "Apply this fix? (y/n)"
  5. Apply or skip

- [ ] Safety guardrails
  - Preview changes before applying
  - Create git commit before changes
  - Rollback command if fix breaks things

#### 4.3 Integrations (Week 11-12)
- [ ] Cursor integration
  - Test with Cursor's MCP support
  - Documentation for Cursor users

- [ ] VS Code extension (optional)
  - Panel showing VibeWatch output
  - Click error → jump to file
  - Alternative to terminal monitoring

- [ ] Webhook support
  - On crash, POST to URL
  - Use case: Slack/Discord notifications
  - Use case: Team error aggregation

#### 4.4 Analytics & Telemetry (Week 12)
- [ ] Anonymous usage stats (opt-in)
  - Language distribution
  - Most common errors
  - MCP tool usage frequency

- [ ] Performance metrics
  - Buffer overhead measurement
  - MCP response time tracking
  - Memory usage profiling

- [ ] Public dashboard
  - Aggregate stats: "10K errors analyzed this month"
  - Popular frameworks
  - Marketing: Show adoption growth

### Phase 4 Success Criteria
- ✅ 1,000+ weekly active users
- ✅ 50+ GitHub stars
- ✅ Featured on MCP official registry
- ✅ 5+ blog posts/tutorials by community
- ✅ Inquiry from first team/company

---

## Phase 5: Scale & Monetization (Month 4+)

**Goal:** Sustainable growth and explore revenue streams

### Potential Features (Prioritize Based on Feedback)

#### 5.1 Team Features
- [ ] Shared error database
  - Team members see each other's crashes
  - "Someone already solved this"
  - Requires backend service

- [ ] Error deduplication
  - Group similar errors
  - "This error happened 15 times today"

- [ ] Team analytics dashboard
  - Which errors are most common?
  - Which developers need help?
  - Productivity metrics

#### 5.2 Advanced AI Features
- [ ] ML-based error classification
  - Train model on error patterns
  - "This looks like a Next.js hydration error"
  - Suggest fix before asking Claude

- [ ] RAG on error solutions
  - Build database of error → solution pairs
  - "85% of users fixed this by..."
  - Faster than waiting for Claude

- [ ] Proactive suggestions
  - "Your error mentions 'MODULE_NOT_FOUND' - did you run npm install?"
  - Context-aware hints

#### 5.3 Premium Tier (Optional)
**Free Tier:**
- Core functionality
- Single process monitoring
- 100-line buffer
- Basic MCP tools

**Premium ($5-10/mo):**
- Multi-process monitoring
- Unlimited buffer size
- Error history (persistent storage)
- Team features (shared context)
- Priority support
- Advanced integrations

**Enterprise (Custom):**
- Self-hosted option
- Custom error patterns
- Advanced analytics
- SLA support
- SSO integration

---

## Alternative Roadmap: Community-Driven

If early traction is strong, pivot to community-driven development:

### Community Features Prioritization
- [ ] Create GitHub Discussions
- [ ] Weekly poll: "What should we build next?"
- [ ] Feature voting system
- [ ] Open roadmap (this file) for PRs
- [ ] Contributor recognition

### Plugin System
- [ ] Plugin architecture
  - Custom error analyzers
  - Custom MCP tools
  - Custom filters

- [ ] Example plugins:
  - `vibewatch-rust-analyzer` - Enhanced Rust support
  - `vibewatch-docker` - Container log monitoring
  - `vibewatch-github` - Auto-create issues on crash

---

## Technical Debt & Refactoring

Track technical debt to pay down as we grow:

### Known Debt Items
- [ ] Error pattern regex can become unmaintainable (consider parser library)
- [ ] In-memory buffer doesn't persist across restarts (consider optional disk cache)
- [ ] Single API port limits multi-process support (design better registry)
- [ ] No automated test suite yet (add unit/integration tests)
- [ ] Cross-platform testing is manual (add CI matrix)

### Refactoring Candidates (Post-MVP)
- [ ] Extract language analyzers into separate modules
- [ ] Abstract buffer implementation (allow custom storage)
- [ ] Improve error pattern DSL (move away from raw regex)
- [ ] Build MCP tool plugin system
- [ ] Consider Rust rewrite for performance (only if needed)

---

## Risk Mitigation Strategies

### Risk: Competitors Clone Features
**Mitigation:**
- Ship fast (first-mover advantage)
- Build community (hard to replicate)
- Focus on UX polish (not just features)
- Stay close to users (understand needs better)

### Risk: MCP Remains Niche
**Mitigation:**
- Build for Claude Desktop (1M+ users)
- Expand to Cursor, Zed, other MCP clients
- Make core valuable without MCP (standalone dashboard)
- Consider API for non-MCP AI tools

### Risk: Performance Issues at Scale
**Mitigation:**
- Benchmark early and often
- Profile memory usage with large buffers
- Test with 100+ crashes in session
- Consider Rust rewrite if Node.js hits limits

### Risk: User Doesn't Understand MCP Setup
**Mitigation:**
- Video tutorial (Loom)
- One-line install script
- Auto-detect Claude Desktop config
- Fallback: Standalone dashboard mode

---

## Success Metrics Dashboard

Track these metrics weekly:

| Metric | Week 3 (MVP) | Month 1 | Month 3 | Month 6 |
|--------|-------------|---------|---------|---------|
| npm downloads/week | 50+ | 250+ | 1,000+ | 2,500+ |
| GitHub stars | 5+ | 50+ | 200+ | 500+ |
| Active users (WAU) | 20+ | 100+ | 500+ | 2,000+ |
| MCP tool calls | 100+ | 1,000+ | 10,000+ | 50,000+ |
| GitHub issues | 1+ | 10+ | 30+ | 75+ |
| Community PRs | 0 | 1+ | 5+ | 15+ |
| Reddit/Twitter mentions | 10+ | 50+ | 150+ | 400+ |
| Revenue (if premium) | $0 | $0 | $100+ | $1,000+ |

---

## Long-Term Vision (12-24 Months)

**Year 1 Goal:** Become the standard way developers share terminal context with AI assistants

**Year 2 Possibilities:**
- 10,000+ weekly active users
- Top 10 MCP server by usage
- Featured in Anthropic blog post
- Integration partnerships (Vercel, Netlify)
- Team product (paid tier)
- Open source community (50+ contributors)

**Potential Pivots:**
- If production monitoring demand emerges: Offer hosted service
- If IDE integration is preferred: Build VS Code/JetBrains plugins
- If teams need it: Focus on collaboration features
- If API demand exists: Offer REST API for non-MCP tools

---

## Appendix: Feature Ideas Backlog

Ideas to evaluate based on user feedback:

### Quick Wins (Low Effort, High Value)
- [ ] Copy error to clipboard: `vibewatch copy-last-error`
- [ ] Open error files in editor: `vibewatch open-error-files`
- [ ] Search buffer: `vibewatch grep "pattern"`
- [ ] Tail mode: `vibewatch tail -f` (real-time streaming)

### Medium Effort
- [ ] Diff mode: Compare before/after error
- [ ] Replay mode: Replay crash scenario
- [ ] Annotate errors: Add comments to crashes
- [ ] Error tags: Tag similar errors for grouping

### High Effort (Nice to Have)
- [ ] Browser extension: Monitor web console too
- [ ] Mobile app: View crashes on phone
- [ ] AI error prediction: "You're about to hit this error..."
- [ ] Distributed tracing: Track errors across microservices

### Community Requests
_Leave empty, populate based on GitHub issues/discussions_

---

## How to Use This Roadmap

**For Contributors:**
- Pick items from current phase
- Check GitHub issues for details
- Submit PRs with tests
- Update roadmap when complete

**For Users:**
- See what's coming next
- Vote on features (GitHub Discussions)
- Suggest new ideas
- Understand timeline

**For Maintainers:**
- Review quarterly
- Adjust based on feedback
- Celebrate milestones
- Keep focused (say no to scope creep)

---

**Next Review Date:** January 5, 2025 (after MVP launch)
