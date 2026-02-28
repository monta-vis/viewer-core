# Montavis Viewer (Monorepo)

npm workspaces monorepo with three packages:

- **`packages/viewer-core/`** — `@monta-vis/viewer-core` — read-only viewer components + types (published to GitHub Packages)
- **`packages/editor-core/`** — `@monta-vis/editor-core` — editing layer: store, persistence, edit hooks (published)
- **`packages/viewer-app/`** — `@monta-vis/montavis-viewer` — standalone Electron viewer app (private)

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
2. **Check in before major changes** — always present a plan and get approval before multi-file or architectural changes.
3. **Explain changes** — give a high-level summary of what changed after every step.
4. **Simplicity above all** — every change should be as small and simple as possible. Avoid complex, sweeping changes.
5. **TDD** — write tests BEFORE implementation. Every plan must include test cases.
6. **English only** — all `.md` files must be written in English.
7. **No hallucinations** — if unsure, investigate first. Never make claims about code without reading it.
8. **Echo Task:** At the end of every response, repeat the user's original question/task as plain text (e.g., `> Task: "your question here"`).
9. If you change something in editor-core or viewer-core rebuild it at the end

## Critical Constraints

### DO NOT

- Use `any` in TypeScript
- Use pixels (rem only)
- Deep-import from features (use barrel exports)
- Add app-specific logic (routes, IPC, DB) to viewer-core or editor-core
- Add editing/mutation logic to viewer-core (use editor-core)
- Mix old and new logic when plans change — clean up first

### ALWAYS

- `aria-label` on icon buttons
- Export new public API from feature `index.ts` barrels
- Reusable components when used 2+ times
- Single responsibility per component
- All user-facing text through i18n

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
