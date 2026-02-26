# Coding Conventions

## Imports

```typescript
// GOOD — from feature barrel or component index
import { Button } from "@/components/ui";
import { useSimpleStore } from "@/features/instruction";

// BAD — deep import into feature internals
import { SubstepCard } from "@/features/instruction-view/components/SubstepCard";
```

## Components

- Single responsibility, reusable when used 2+ times
- TypeScript strict, no `any`
- All user-facing text through i18n (consumer provides translations)
- rem-based sizing (no pixels)
- CSS variables for theming (light/dark)
- `aria-label` on all icon-only buttons

## viewer-core is a Component Library

- No routes, no pages, no Electron, no SQLite
- Exports components, hooks, stores, types, utilities
- Consumed via `import { ... } from '@monta-vis/viewer-core'`
- CSS exported via `@monta-vis/viewer-core/styles.css`
- Electron-specific code belongs in `packages/viewer-app/` only

## VideoContext = Single Source of Truth

```typescript
const { currentFrame, seek, play, pause } = useVideo();
// NEVER duplicate video state in useState!
```

## Error Handling

- Prefer early returns over deeply nested conditionals
- Handle errors at system boundaries (user input, external APIs, IPC)
- Trust internal code and framework guarantees — don't over-validate
- Use TypeScript discriminated unions for result types when appropriate

```typescript
// GOOD — early return
function getStep(id: string) {
  const step = steps[id];
  if (!step) return null;
  return enrichStep(step);
}

// BAD — unnecessary nesting
function getStep(id: string) {
  if (steps[id]) {
    return enrichStep(steps[id]);
  } else {
    return null;
  }
}
```

## Dependency Management

- Peer dependencies in viewer-core stay minimal (react, react-dom, i18next, react-i18next, lucide-react)
- New dependencies require justification — prefer built-in solutions over new packages
- Check if existing deps already solve the problem before adding new ones
- Dev dependencies are fine (testing, build tooling)

## Theming

- **Shared design system:** `src/styles/theme.css` — CSS variables for colors, backgrounds, text, borders, shadows
- **Dark theme:** `:root` (default), **Light theme:** `.light` class
- **Scoped themes:** `instruction-view/styles/instruction-view.css` — `.instruction-theme-dark` / `.instruction-theme-light`
- Theme switching via `InstructionViewContext`

## Media URL Protocols

- `mvis-media://` — local project media (Electron)
- `mvis-catalog://` — part tool catalog icons (Electron)
- Standard HTTPS URLs (web context)

## Clean Code

- Good, understandable naming conventions
- Single responsibility
- No hybrid solutions — when approach changes, clean up old code first

## Debugging

- Max 2 debug rounds, then re-analyze from scratch
- Stale closure? Remove comparison, call idempotently
