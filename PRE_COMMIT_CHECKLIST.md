# Pre-Commit Checklist

**Before your first `git commit`, verify this checklist:**

---

## ✅ Files That SHOULD Be Committed

### Core Files
- [x] `package.json` - Dependencies and metadata
- [x] `tsconfig.json` - TypeScript configuration
- [x] `tsup.config.ts` - Build configuration
- [x] `.gitignore` - Git ignore rules
- [x] `.npmignore` - npm publish ignore rules

### Source Code
- [x] `src/types.ts`
- [x] `src/cli.ts`
- [x] `src/mcp-server.ts`
- [x] `src/buffer.ts`
- [x] `src/process-manager.ts`
- [x] `src/analyzer.ts`
- [x] `src/api-server.ts`

### Documentation
- [x] `README.md` - Project overview
- [x] `PRD.md` - Product requirements
- [x] `ROADMAP.md` - Development roadmap
- [x] `FEATURE_IDEAS.md` - Future features
- [x] `PHASE0_COMPLETE.md` - Phase 0 summary

---

## ❌ Files That Should NOT Be Committed

### Build Artifacts
- [ ] `dist/` - Build output (ignored ✓)
- [ ] `*.js.map` - Source maps (ignored ✓)

### Dependencies
- [ ] `node_modules/` - Dependencies (ignored ✓)
- [ ] `package-lock.json` - Lock file (ignored ✓)

### Environment/Local
- [ ] `.env` files (ignored ✓)
- [ ] `.DS_Store` - macOS metadata (ignored ✓)
- [ ] `.vscode/` - Editor settings (ignored ✓)

### AI Assistant Context
- [ ] `.claude/` - Claude Code context (ignored ✓)
- [ ] `.claude-flow/` - Claude Flow context (ignored ✓)

---

## 🔍 Pre-Commit Commands

Run these before committing:

```bash
# 1. Check what will be committed
git status

# 2. See what's ignored
git status --ignored

# 3. Verify build works
npm run build

# 4. Verify TypeScript compiles
npm run typecheck

# 5. Check file sizes
ls -lh dist/

# Expected output:
# cli.js          ~8-9 KB
# mcp-server.js   ~3-4 KB
```

---

## 📝 Review Checklist

### package.json
- [ ] Repository URL updated with your GitHub username
- [ ] Author name is correct
- [ ] Version is `0.1.0`
- [ ] License is correct (MIT)

**Update this:**
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOURUSERNAME/vibewatch.git"
  },
  "author": "Your Name <your.email@example.com>"
}
```

### README.md
- [ ] Installation instructions clear
- [ ] Usage examples present
- [ ] Links work (once repo created)

### Sensitive Information
- [ ] No API keys in code
- [ ] No personal information in docs
- [ ] No absolute file paths (use relative)
- [ ] No passwords or tokens

---

## 🚀 First Commit Commands

```bash
# 1. Initialize git
git init

# 2. Add remote (update USERNAME)
git remote add origin https://github.com/YOURUSERNAME/vibewatch.git

# 3. Stage all files
git add .

# 4. Review what's staged
git status

# 5. Check ignored files aren't staged
git status --ignored

# 6. Make first commit
git commit -m "Initial commit - Phase 0 complete

- Set up TypeScript project with tsup build system
- Implemented CLI wrapper with process spawning
- Created circular buffer with ANSI stripping
- Built Fastify API server for terminal output
- Implemented MCP server with stdio transport
- Added comprehensive documentation (PRD, Roadmap, Features)
- All 3 prototypes validated and working

Phase 0 complete. Ready for Phase 1 MVP development."

# 7. Push to GitHub
git branch -M main
git push -u origin main
```

---

## 📋 Post-Push Checklist

After pushing to GitHub:

- [ ] Verify all files appear on GitHub
- [ ] Check .gitignore worked (no node_modules/ visible)
- [ ] README renders correctly on GitHub
- [ ] Links in README work
- [ ] Add repository topics: `mcp`, `claude`, `terminal`, `debugging`, `typescript`
- [ ] Add description: "Your AI pair programmer's eyes on your terminal"
- [ ] Add website: `https://github.com/YOURUSERNAME/vibewatch` (for now)
- [ ] Add license badge to README
- [ ] Add build status badge (after CI setup)

---

## ⚠️ Common Mistakes to Avoid

1. **Don't commit node_modules/**
   - Check: `git status` should not show it
   - Already ignored ✓

2. **Don't commit dist/**
   - Build artifacts are generated
   - Already ignored ✓

3. **Don't commit .env files**
   - Even though we don't have any yet
   - Already ignored ✓

4. **Don't commit package-lock.json (for libraries)**
   - We want users to get latest compatible versions
   - Already ignored ✓

5. **Don't commit .claude/ directories**
   - AI assistant context is personal
   - Now ignored ✓

---

## 🔒 Security Check

- [ ] No hardcoded localhost URLs with ports?
  - ✓ OK - localhost:3333 is configurable via --port flag
- [ ] No API keys or secrets? ✓
- [ ] No personal file paths? ✓
- [ ] No passwords? ✓

---

## 📊 What Your First Commit Will Include

**Total Files:** ~15 files
**Total Size:** ~30KB (excluding node_modules, dist)

**Breakdown:**
- Source code (src/): ~2KB
- Documentation: ~25KB
- Configuration: ~3KB

**Lines of Code:**
- TypeScript: ~700 lines
- Documentation: ~1500 lines

---

## ✅ Final Check

Run this command to see what will be committed:

```bash
git add -n .
```

The `-n` (dry run) flag shows what would be added WITHOUT actually adding it.

**Expected to see:**
- ✅ All .md files
- ✅ All .ts files in src/
- ✅ package.json, tsconfig.json, tsup.config.ts
- ✅ .gitignore, .npmignore

**Should NOT see:**
- ❌ node_modules/
- ❌ dist/
- ❌ package-lock.json
- ❌ .claude/ or .claude-flow/
- ❌ .DS_Store

---

## 🎯 Ready to Commit?

If all checks pass:

```bash
git init
git add .
git status  # Review one more time
git commit -m "Initial commit - Phase 0 complete"
```

---

**Questions?** Review this checklist carefully before committing!

**Note:** This is a one-time checklist for the first commit. After this, normal git workflow applies.
