# Montavis Viewer (Monorepo)

npm workspaces monorepo with three packages:

- **`packages/viewer-core/`** — `@monta-vis/viewer-core` — read-only viewer components + types (published to GitHub Packages)
- **`packages/editor-core/`** — `@monta-vis/editor-core` — editing layer: store, persistence, edit hooks (published)
- **`apps/viewer/`** — `@monta-vis/montavis-viewer` — standalone Electron viewer app (private)

## Quick Start

```bash
npm install          # Install all workspaces
npm run build:core   # Build viewer-core library
npm run build:editor # Build editor-core (requires core built first)
npm run build:app    # Build viewer-app (requires core + editor built first)
npm run dev:core     # Watch mode for viewer-core
npm run dev:editor   # Watch mode for editor-core
npm run dev:app      # Dev server for viewer-app
npm run test         # Run Vitest tests (viewer-core + editor-core)
npm run typecheck    # Typecheck all packages
```

## Behavioral Rules

1. **Read before acting** — never speculate about code you haven't opened. Read relevant files before answering or making changes.
2. **Plan for big changes** — present a plan for approval only for architectural changes or changes spanning 5+ files. Once a plan is approved, execute it fully without re-asking for confirmation at each step.
3. **Explain changes** — give a high-level summary of what changed after every step.
4. **Simplicity above all** — every change should be as small and simple as possible. Avoid complex, sweeping changes.
5. **TDD** — write tests BEFORE implementation. Every plan must include test cases.
6. **English only** — all `.md` files must be written in English.
7. **No hallucinations** — if unsure, investigate first. Never make claims about code without reading it.
8. **Echo Task:** At the end of every response, repeat the user's original question/task as plain text (e.g., `> Task: "your question here"`).
9. If you change something in editor-core or viewer-core rebuild it at the end
10. **Fix failing tests** — if you encounter a failing test during testing (even if unrelated to your current changes), investigate and fix the root cause. Never apply superficial fixes just to make the test pass — always understand why it fails and correct the actual problem.
11. **Logging:**
    - Add `console.error` for caught errors and unexpected states (always include context: what failed and why)
    - Add `console.warn` for fallback behavior or recoverable issues
    - Use `console.debug` sparingly for complex data transformations where input/output is hard to trace
    - Never use bare `console.log` — use the appropriate level
    - Always include the function/module name in the log message: `console.error('[VideoExport] Failed to encode frame:', error)`

## Critical Constraints

### DO NOT

- Use `any` in TypeScript
- Use pixels (rem only)
- Deep-import from features (use barrel exports)
- Add app-specific logic (routes, IPC, DB) to viewer-core or editor-core
- Add editing/mutation logic to viewer-core (use editor-core)
- Mix old and new logic when plans change — clean up first
- create a worktree on you own

### ALWAYS

- `aria-label` on icon buttons
- Export new public API from feature `index.ts` barrels
- Reusable components when used 2+ times
- Single responsibility per component
- Clean code and using best practices
- All user-facing text through i18n

### MediaResolver = Single Source of Truth for Media

Always use the `MediaResolver` from `viewer-core` for resolving media URLs (images, frames, videos). Never manually call `buildMediaUrl` in components — use `useMediaResolver()` from the `MediaResolverProvider` context instead. The resolver has two modes:

- **Raw** (`createRawResolver`) — editor: live frame captures, source videos
- **Processed** (`createProcessedResolver`) — viewer: pre-rendered images, merged videos

```typescript
// GOOD — use the resolver
const resolver = useMediaResolver();
const image = resolver.resolveImage(areaId);

// BAD — manual URL construction in components
buildMediaUrl(folderName, MediaPaths.frame(areaId));
```

## MCP Tools

- **Context7** — library docs ("use context7")
- **GitHub** — issues, PRs, commits, branches

## Commands

`/sync` `/commit` `/check` `/code-review`

## Documentation

**Path:** `.claude/docs/`

Auto-lookup relevant docs based on the task at hand:

- `architecture.md` — monorepo structure, features, stores, contexts, exports, data flows
- `conventions.md` — coding patterns, imports, error handling, dependencies, theming
- `testing.md` — TDD workflow, test types, rules

### Maintenance

Update `.claude/docs/` at commit time when:

- New exported component, hook, or utility
- Store/context shape changes
- Architecture decisions
- Build/publish config changes

Rules: delete outdated info immediately, keep compact, replace don't append.

## Plans

**Location:** `.claude/plans/`

Save a plan file when a task requires multiple steps, complex implementation, or pending work. Format:

```markdown
# [Plan Title]

**Status:** pending | in-progress | completed
**Created:** YYYY-MM-DD

## Summary

## TODO

## Tests (TDD)

## Context
```
