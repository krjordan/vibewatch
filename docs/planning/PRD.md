# VibeWatch: Your AI Pair Programmer's Eyes on Your Terminal

**Internal Name:** vibe-watch
**Public Pitch:** "Just tell Claude 'check my terminal' - no copy-paste, no crash needed."

---

## 1. The Problem

Developers waste time and tokens copy-pasting terminal output to Claude/Cursor/AI assistants:
- **Most dev errors don't crash** - TypeScript compile errors, linting warnings, failed API requests keep the server running
- **Context switching breaks flow** - Scrolling terminal, copying relevant lines, cleaning ANSI codes, pasting to Claude
- **Token waste** - Unfiltered logs with webpack progress bars, repeated lines, node_modules noise
- **Lost context** - By the time you copy the error, new logs have pushed it off screen

**The insight:** Your terminal IS the context. Claude should be able to "look at" your terminal just like a pair programmer would.

---

## 2. The Solution

A CLI wrapper that runs your dev command (e.g., `next dev`), continuously buffers logs, and exposes a **live MCP endpoint** for Claude to query your terminal state in real-time.

**Key Innovation:** Live monitoring + crash detection, not crash-only.

### User Experience:

```bash
# Start your dev server with VibeWatch
$ npx vibe-watch npm run dev

# Your app shows a TypeScript error (server keeps running)
⚠ Compiled with warnings
src/app.tsx:42:5 - error TS2322: Type 'string' is not assignable to type 'number'

# You ask Claude naturally:
You: "I'm getting a type error, can you check my terminal?"

# Claude calls VibeWatch MCP, sees the error, suggests fix
Claude: "I see a TypeScript error in src/app.tsx:42. You're assigning
a string to a number variable. Here's the fix..."
```

**No copy-paste. No crash needed. Just natural conversation.**

---

## 3. Architecture (The Senior Flex)

**Pattern:** Sidecar Process with Live Buffer + Crash Snapshots

### Components:

#### 3.1 CLI Wrapper (`cli.ts`)
- Spawns user's command via `child_process.spawn`
- Pipes stdout/stderr to circular buffer (pass-through to terminal)
- Detects process state (running, crashed, exited cleanly)

#### 3.2 Circular Buffer (`buffer.ts`)
- **Live Buffer:** Rolling 100-line window (always queryable)
- **Crash Snapshot:** Locked buffer state when process crashes (preserved for post-mortem)
- ANSI stripping, noise reduction, line deduplication

#### 3.3 Log Analyzer Engine (`analyzer.ts`)
- Regex-based pattern matching for errors/warnings
- Language detection (JavaScript, Python, Rust, Go)
- Stack trace parsing and file path extraction
- Framework-specific patterns (Next.js, Django, FastAPI)

#### 3.4 Local API Server (`api-server.ts`)
- Fastify server on `localhost:3333`
- Endpoints:
  - `GET /live` - Current buffer state (last N lines)
  - `GET /errors` - Filtered error/warning lines only
  - `GET /crash` - Locked crash snapshot (if crashed)
  - `GET /health` - Server status

#### 3.5 MCP Server (`mcp-server.ts`)
- Stdio transport for Claude Desktop/Cursor
- Fetches data from local API server
- Exposes MCP tools (see section 4)

---

## 4. Functional Requirements (MVP)

### 4.1 Core Command
```bash
npx vibe-watch <command>
```

**Examples:**
```bash
npx vibe-watch npm run dev
npx vibe-watch pytest
npx vibe-watch uvicorn main:app --reload
npx vibe-watch cargo run
```

### 4.2 MCP Tools

#### Tool 1: `get_terminal_output()` (PRIMARY)
**Description:** Get the last N lines of terminal output from the monitored process (live, always available)

**Input Schema:**
```json
{
  "lines": {
    "type": "number",
    "description": "Number of lines to retrieve (max 100)",
    "default": 50
  },
  "filter": {
    "type": "string",
    "enum": ["all", "errors", "warnings"],
    "description": "Filter output to specific types",
    "default": "all"
  }
}
```

**Output:**
```json
{
  "output": [
    "⚠ Compiled with warnings",
    "src/app.tsx:42:5 - error TS2322: Type 'string' is not assignable to type 'number'"
  ],
  "timestamp": "2024-12-05T10:30:45Z",
  "process_status": "running",
  "errors_detected": true,
  "relevant_files": ["src/app.tsx:42"]
}
```

#### Tool 2: `get_crash_context()` (SECONDARY)
**Description:** Get the locked crash snapshot (only available after process crashes)

**Input Schema:**
```json
{
  "verbose": {
    "type": "boolean",
    "description": "Include node_modules in stack traces",
    "default": false
  }
}
```

**Output:**
```json
{
  "error_message": "TypeError: Cannot read property 'map' of undefined",
  "stack_trace": [
    "at UserList.render (/app/components/UserList.tsx:42:15)",
    "at ReactDOMComponent.render (/node_modules/react-dom/...)"
  ],
  "relevant_files": ["/app/components/UserList.tsx:42"],
  "exit_code": 1,
  "timestamp": "2024-12-05T10:30:45Z"
}
```

#### Tool 3: `get_recent_errors()` (V2)
**Description:** Get only error/warning lines from last 5 minutes (smart filtered view)

### 4.3 Buffer Logic

**Live Buffer (Always Active):**
- Keep last 100 lines in memory
- ANSI codes stripped
- Repeated lines collapsed (e.g., "Building... 45%, 46%, 47%" → "Building... [collapsed]")
- Continuously queryable via MCP

**Crash Detection:**
- Trigger: `exit code !== 0` OR error pattern match + process exit
- Action: Lock current buffer state as immutable snapshot
- Preservation: Snapshot remains available until next `vibe-watch` run

**Error Pattern Detection (Non-Crash):**
- Detect: "Error:", "Warning:", "Failed to compile", language-specific patterns
- Action: Mark lines, make available via filtered queries
- Process: Keeps running (no snapshot lock)

### 4.4 Terminal UI

**Normal Operation:**
```bash
$ npx vibe-watch npm run dev
[VIBE-WATCH] Monitoring: npm run dev
[VIBE-WATCH] MCP server running on stdio
[VIBE-WATCH] API server: http://localhost:3333

> ready - started server on 0.0.0.0:3000
```

**On Crash:**
```bash
Error: Cannot find module 'next'
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:889:15)
    at Function.Module._load (internal/modules/cjs/loader.js:745:27)

[VIBE-WATCH] ❌ Crash detected (exit code: 1)
[VIBE-WATCH] 📸 Snapshot captured - Ask Claude to "Fix this crash"
[VIBE-WATCH] 🔍 Error: Cannot find module 'next'
```

**On Non-Fatal Error (Process Running):**
```bash
⚠ Compiled with warnings
src/app.tsx:42:5 - error TS2322

[VIBE-WATCH] ⚠️  Error detected - Ask Claude "What's this error?"
```

---

## 5. The "Senior" Edge (Token Optimization)

### 5.1 Smart Filtering

**ANSI Code Stripping:**
- Remove color codes: `\x1b[31m` → clean text
- Remove cursor control: `\x1b[2K`, `\x1b[1A`
- Library: `strip-ansi` (battle-tested)

**Noise Reduction:**
- Collapse repeated lines: `"Building... 45%"` × 50 → `"Building... [progress collapsed]"`
- Webpack progress bars: Keep first/last only
- HMR updates: Collapse into single line
- Empty lines: Deduplicate consecutive empties

**node_modules Filtering:**
- Default: Strip node_modules from stack traces
- Verbose mode: Include full paths
- Keep: First line (entry point) and last line (error source)

### 5.2 Relevance Scoring (V2)

Prioritize lines by information density:
- **High:** Error messages, stack trace frames, file paths
- **Medium:** Warnings, deprecation notices
- **Low:** Info logs, debug output
- **Noise:** Progress bars, repeated lines

Return high-relevance lines first within token budget.

### 5.3 Progressive Disclosure

**First Query (Minimal):**
- Return: Error lines only (~50-200 tokens)
- Fast, focused, cheap

**If Claude Needs More Context:**
- Return: Error + 10 lines before/after (~500 tokens)
- Includes surrounding context

**If Still Unclear:**
- Return: Full 100-line buffer (~1000 tokens)
- Complete picture

---

## 6. Language & Framework Support (MVP)

### 6.1 Tier 1 - MVP Launch

**JavaScript/TypeScript:**
- Package managers: npm, yarn, pnpm, bun
- Frameworks: Next.js, Vite, React, Node.js
- Error patterns: Module not found, type errors, build failures

**Python:**
- Package managers: pip, poetry
- Frameworks: Django, Flask, FastAPI, pytest
- Error patterns: ImportError, ModuleNotFoundError, tracebacks

### 6.2 Detection Heuristics

**Auto-detect language from command:**
```typescript
const command = "pytest tests/"
// → Detected: Python
// → Load: Python error patterns

const command = "npm run dev"
// → Detected: Node.js
// → Load: JavaScript error patterns
```

**Framework-specific parsing:**
- Next.js: "Failed to compile", hydration errors
- Vite: HMR errors, dependency pre-bundling
- Django: `django.db.*`, template errors
- FastAPI: Pydantic validation, 422 errors

---

## 7. Non-Functional Requirements

### 7.1 Performance
- **Overhead:** <5% CPU/memory vs running command directly
- **Buffer Size:** ~200KB for 100 lines × 2KB/line
- **MCP Response Time:** <100ms for `get_terminal_output()`
- **Startup Time:** <200ms initialization overhead

### 7.2 Reliability
- **Pass-through:** Terminal output identical to running command directly
- **Crash Resistance:** VibeWatch crash should not kill monitored process
- **Data Integrity:** No log lines lost or corrupted

### 7.3 Security
- **Local-only:** API server binds to `127.0.0.1` (no external access)
- **No persistence:** Logs stored in memory only (cleared on exit)
- **No cloud:** Zero external API calls or data transmission

### 7.4 Compatibility
- **Node.js:** v18.0.0+
- **Platforms:** macOS, Linux, Windows (via npx)
- **MCP Clients:** Claude Desktop, Cursor, any MCP-compatible client
- **Shell:** bash, zsh, fish, PowerShell

---

## 8. Success Metrics

### 8.1 Launch Goals (Month 1)
- 500+ npm downloads
- 100+ GitHub stars
- Featured on MCP registry (mcp.so, mcpservers.org)
- 1K+ Reddit/Twitter engagement on launch post

### 8.2 Product-Market Fit (Month 3)
- 1,000+ weekly active users
- 10,000+ crashes/errors analyzed via MCP
- 20+ GitHub issues (shows engagement)
- 5+ community PRs (shows adoption)

### 8.3 North Star Metric
**"Terminal queries via MCP"** - How many times devs ask Claude to check their terminal instead of copy-pasting

**Target:** 10,000 queries in first 3 months

---

## 9. Technical Stack (MVP)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | TypeScript | Universal subprocess monitoring, npm ecosystem |
| MCP SDK | `@modelcontextprotocol/sdk` v1.24.2 | Official, well-documented |
| Web Framework | Fastify v5.0 | 10x faster than Express, TypeScript-first |
| Process Spawning | Native `child_process.spawn` | Streams, no buffer limits |
| ANSI Stripping | `strip-ansi` v7.1 | Battle-tested, 2KB |
| CLI Parsing | `commander` v12.0 | Simple, lightweight |
| Circular Buffer | `ring-buffer-ts` | TypeScript-native, zero deps |
| Build Tool | `tsup` v8.0 | Fast, handles shebang |
| Distribution | npm/npx | Frictionless: `npx vibe-watch` |

---

## 10. Out of Scope (MVP)

**Explicitly NOT building:**
- ❌ Production monitoring (use Sentry/Rollbar)
- ❌ Team collaboration features
- ❌ Cloud storage or log aggregation
- ❌ Historical log search (beyond current session)
- ❌ IDE plugins (CLI-first approach)
- ❌ Automatic code fixes (Claude suggests, user applies)
- ❌ ML-based error classification (regex patterns for MVP)

**May revisit in V2+:**
- 🔮 Real-time error streaming (WebSocket)
- 🔮 Multi-process monitoring (monorepos)
- 🔮 Custom filter rules (`.vibewatchrc`)
- 🔮 Error history dashboard (TUI)
- 🔮 Auto-fix mode (`--fix` flag)

---

## 11. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Competitors add live monitoring | Medium | Ship fast (MVP in 2 weeks), establish brand |
| MCP adoption stays niche | High | Target Claude Desktop's 1M+ users, expand to Cursor/Zed |
| Performance overhead | Low | Benchmark early, optimize buffer/filtering |
| Cross-platform issues | Medium | Test on Mac/Linux/Windows, use Node.js abstractions |
| Users don't understand MCP setup | Medium | Clear docs, video tutorial, one-line install |

---

## 12. Go-to-Market Strategy

### 12.1 Positioning
**"VibeWatch: Your AI pair programmer's eyes on your terminal"**

### 12.2 Launch Channels
1. **Reddit** (r/ClaudeAI, r/webdev, r/programming)
2. **Twitter/X** (tag @AnthropicAI, #MCP)
3. **GitHub** (awesome-mcp-servers lists)
4. **MCP Registry** (official registry, mcp.so, mcpservers.org)
5. **Dev.to/Medium** (tutorial: "How I eliminated copy-paste debugging")

### 12.3 Key Message
**"Stop copy-pasting terminal errors. Just tell Claude 'check my terminal' and VibeWatch handles the rest."**

---

## Appendix: Competitive Differentiation

| Feature | VibeWatch | stdout-mcp | console-mcp | Sentry |
|---------|-----------|------------|-------------|--------|
| Live terminal access | ✅ Always queryable | ❌ Passive capture | ❌ Storage-focused | N/A |
| Crash detection | ✅ Auto-snapshot | ❌ | ❌ | ✅ (prod only) |
| Non-fatal errors | ✅ While running | ❌ | ❌ | N/A |
| Zero-config | ✅ `npx vibe-watch` | ❌ Manual piping | ❌ Logger setup | ❌ SDK integration |
| Token optimization | ✅ Smart filtering | ❌ Raw logs | ❌ | ❌ |
| Local-first | ✅ No cloud | ✅ | ✅ | ❌ Cloud required |
| Cost | Free | Free | Free | $29-299/mo |

