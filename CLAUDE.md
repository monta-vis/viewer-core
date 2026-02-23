# Montavis Viewer (Monorepo)

npm workspaces monorepo with two packages:
- **`packages/viewer-core/`** → `@monta-vis/viewer-core` — shared React component library for viewing assembly instructions. Published to GitHub Packages. Consumed by the Creator app, web viewer, and other Montavis frontends.
- **`packages/viewer-app/`** → `@monta-vis/montavis-viewer` — standalone Electron viewer app (`private: true`, never published).

1. First think through the problem, read the codebase for relevant files.
2. Before you make any major changes, check in with me and I will verify the plan.
3. Please every step of the way just give me a high level explanation of what changes you made
4. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
5. Maintain a documentation file that describes how the architecture of the library works inside and out.
6. Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.
7. All `.md` files in this project must be written in English (including context files, plans, documentation).
8. **TDD (Test-Driven Development):** Write tests BEFORE implementation. Plan tests in every plan file.

## Quick Start

```bash
npm install          # Install all workspaces
npm run build:core   # Build viewer-core library
npm run build:app    # Build viewer-app (requires core built first)
npm run dev:core     # Watch mode for viewer-core
npm run dev:app      # Dev server for viewer-app
npm run test         # Run Vitest tests (viewer-core)
npm run typecheck    # Typecheck all packages
```

## Tech Stack

**Library:** React 19, Vite 7 (library mode), TypeScript strict, Tailwind v4, Zustand 5, i18next
**Peer deps:** react, react-dom, i18next, react-i18next, lucide-react
**Published to:** GitHub Packages (`@monta-vis` scope)

## MCP Tools

- **Context7** - Library docs ("use context7")
- **GitHub** - Issues, PRs, commits, branches

## Commands

`/sync` `/commit` `/check` `/code-review`

---

## Library Rules

### viewer-core is a Component Library, Not an App

- No routes, no pages, no Electron, no SQLite in viewer-core
- Exports components, hooks, stores, types, and utilities
- Consumed via `import { ... } from '@monta-vis/viewer-core'`
- CSS exported separately via `@monta-vis/viewer-core/styles.css`
- Electron-specific code belongs in `packages/viewer-app/` only

### VideoContext = Single Source of Truth

```typescript
const { currentFrame, seek, play, pause } = useVideo();
// NEVER duplicate video state in useState!
```

### Imports

```typescript
// GOOD - from feature index
import { Button } from "@/components/ui";
import { useSimpleStore } from "@/features/instruction";

// BAD - deep import
import { SubstepCard } from "@/features/instruction-view/components/SubstepCard";
```

### Components

- Reusable, single responsibility
- TypeScript strict, no `any`
- All text in i18n (consumer provides translations)
- rem-based sizing (no pixels)
- CSS variables for theming (light/dark)

---

## Testing (TDD)

### Test-Driven Development Workflow

1. **Write test first** - Define expected behavior before implementation
2. **Run test (RED)** - Verify test fails (confirms test is valid)
3. **Implement minimal code (GREEN)** - Make test pass with simplest solution
4. **Refactor** - Clean up while keeping tests green
5. **Repeat** - Next test case

### Test Types

| Type      | Tool         | When                        |
| --------- | ------------ | --------------------------- |
| Unit      | Vitest       | Functions, hooks, utilities |
| Component | Vitest + RTL | React components            |

### Rules

- **Every new feature requires tests in the plan**
- Test edge cases and error states
- Mock external dependencies
- Keep tests focused and fast

---

## Critical Constraints

### DO NOT

- Use pixels (rem only)
- Use `any` in TypeScript
- Deep feature imports
- Add app-specific logic (routes, IPC, DB queries) to viewer-core

### ALWAYS

- **Write tests FIRST (TDD)** - before implementation
- `aria-label` on icon buttons
- Export new public API from feature `index.ts` barrels
- Keep peer dependencies minimal

### Clean Code

- Reusable components when used more than 2 times
- Single responsibility
- Good, understandable naming conventions

### Debugging

- Max 2 debug rounds, then re-analyze
- Stale Closure? Remove comparison, call idempotently

### Plan Changes

- **When a plan changes, do NOT mix old and new logic** - clean up outdated code first
- If the new approach is different from existing code, delete/refactor the old code before implementing new
- Don't create hybrid solutions that blend incompatible approaches

---

## Documentation Files

**Auto-lookup:** When working on a task, automatically read relevant docs based on their descriptions below.

**Path:** `.claude/docs/{filename}`

- `architecture.md` - Library structure, features, stores, contexts, exports

## Documentation Maintenance

Update `.claude/docs/` documentation **at commit time** when:

- New exported component, hook, or utility
- Store shape changes
- Context API changes
- Architecture decision
- Build/publish config changes

**Rules:**

- **DELETE outdated info immediately** - never keep old references that no longer exist
- When removing a file/feature, search ALL docs for references and remove them
- Keep COMPACT: concepts, flows, rules only - no code details
- Replace outdated info, don't append
- Skip minor fixes, refactors, UI tweaks

## Plans

**Location:** `.claude/plans/`

### When to Save a Plan

Save a plan file when:

- Task requires multiple steps that will be done later
- Complex feature implementation discussed but not started
- User approves a plan for future implementation
- Session ends with pending work

### Plan File Format

```markdown
# [Plan Title]

**Status:** pending | in-progress | completed
**Created:** YYYY-MM-DD
**Priority:** high | medium | low

## Summary

Brief description of the goal.

## TODO

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Tests (TDD)

- [ ] Test: [describe expected behavior]
- [ ] Test: [describe edge case]
- [ ] Test: [describe error case]

## Context

Relevant files, decisions, constraints.

## Notes

Additional information for next session.
```

### On Session Start

Check `.claude/plans/` for pending plans and inform user of any active tasks.

After each response, provide a summary table with:

- **Request:** The user's original question/task (brief)
- **Docs Read:** Which .claude/docs files were read
- **MCP Tools:** Context7, GitHub
- **Commands:** /sync, /commit, /check, /code-review
