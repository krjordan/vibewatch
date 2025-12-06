# Contributing to VibeWatch

Thank you for your interest in contributing to VibeWatch! This document provides guidelines and information for contributors.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to make developer tools better.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/krjordan/vibewatch.git
cd vibewatch

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode (watch for changes)
npm run dev
```

### Testing Your Changes

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Test locally with a real command
node dist/cli.js npm run dev
```

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/krjordan/vibewatch/issues) first
2. Create a new issue with:
   - Clear title describing the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment info (OS, Node version, etc.)
   - Relevant terminal output

### Suggesting Features

1. Check [existing discussions](https://github.com/krjordan/vibewatch/discussions) and [FEATURE_IDEAS.md](./docs/planning/FEATURE_IDEAS.md)
2. Open a discussion or issue with:
   - Clear description of the feature
   - Use cases and motivation
   - Proposed implementation (if any)

### Submitting Pull Requests

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/my-feature` or `fix/my-fix`
3. **Make changes** following our code style
4. **Test** your changes locally
5. **Commit** with clear messages (see below)
6. **Push** to your fork
7. **Open a PR** with a clear description

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: Add Rust language support

- Add Rust error patterns to analyzer
- Detect cargo commands
- Extract file paths from Rust stack traces
```

```
fix: Handle SIGTERM properly in process manager

The child process was not being terminated when the parent
received SIGTERM. This change forwards the signal properly.

Fixes #42
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use descriptive variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Project Structure

```
src/
├── cli.ts           # CLI entry point
├── mcp-server.ts    # MCP server
├── api-server.ts    # HTTP API
├── buffer.ts        # Circular buffer
├── analyzer.ts      # Log analysis
├── process-manager.ts # Process spawning
└── types.ts         # Shared types
```

### Adding New Features

1. **Error Patterns**: Add to `FrameworkPatterns` in `analyzer.ts`
2. **CLI Options**: Add to `program` in `cli.ts`
3. **API Endpoints**: Add to `startApiServer` in `api-server.ts`
4. **MCP Tools**: Add to `ListToolsRequestSchema` handler in `mcp-server.ts`

## Areas We Need Help

### High Priority
- [ ] Unit tests (vitest)
- [ ] Integration tests
- [ ] Windows compatibility testing
- [ ] Additional language support (Ruby, Java, PHP)

### Medium Priority
- [ ] Performance benchmarking
- [ ] Documentation improvements
- [ ] Error pattern contributions
- [ ] MCP tool enhancements

### Good First Issues

Look for issues labeled `good first issue` - these are beginner-friendly tasks.

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Pull Request Process

1. PRs should target `main`
2. Ensure all checks pass (typecheck, lint)
3. Request review from maintainers
4. Address feedback
5. Squash and merge when approved

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update CHANGELOG (when we add one)
3. Create GitHub release
4. Publish to npm

## Questions?

- Open a [Discussion](https://github.com/krjordan/vibewatch/discussions)
- Check [docs/](./docs/) for architecture details
- Review [ROADMAP.md](./docs/planning/ROADMAP.md) for project direction

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to VibeWatch!
