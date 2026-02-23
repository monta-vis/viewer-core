---
name: montavis-brand
description: Montavis brand identity and design system. Use when building UI components, styling interfaces, creating marketing materials, or ensuring visual consistency. Triggers on requests involving colors, typography, spacing, component styling, or brand consistency for the Montavis Creator application.
---

# Montavis Brand System

Dark-mode first design for video-based manufacturing assembly instructions.

## Colors

```css
/* Backgrounds */
--deep-space: hsl(220, 64%, 9%);    /* Deepest */
--deep-navy: hsl(216, 63%, 13%);    /* Main bg */
--twilight: hsl(212, 58%, 20%);     /* Elevated */
--horizon: hsl(212, 48%, 31%);      /* Borders */

/* Accents */
--primary: hsl(180, 55%, 50%);      /* Cyan - primary actions */
--secondary: hsl(180, 64%, 57%);    /* Bright cyan - hover */
--accent: hsl(27, 51%, 56%);        /* Copper - warnings */

/* Text */
--text-primary: hsl(210, 33%, 92%);
--text-secondary: hsl(210, 12%, 70%);
--text-muted: hsl(210, 10%, 50%);

/* Status */
--success: hsl(158, 64%, 40%);
--warning: hsl(38, 92%, 50%);
--error: hsl(0, 72%, 51%);
```

## Interactive States

| State | Lightness Δ |
|-------|-------------|
| Hover | +8% |
| Selected | +12% |
| Active | +22% |

## Typography

- **Sans:** Inter, system-ui
- **Mono:** JetBrains Mono, Consolas
- **Scale:** 12/14/16/18/20/24px
- **Headlines:** 600 weight, -0.02em tracking
- **Data:** Monospace, `tabular-nums`

## Spacing (4px grid)

`4` → `8` → `12` → `16` → `24` → `32`

Use rem units only. Touch targets min 2.75rem.

## Radius

- sm: 0.25rem (buttons)
- md: 0.5rem (cards)
- lg: 0.75rem (modals)

## Component Patterns

```tsx
// Primary button
className="bg-[var(--primary)] text-[var(--deep-navy)] hover:bg-[var(--secondary)]"

// Card
className="bg-[var(--deep-navy)] border border-[var(--horizon)] rounded-lg"

// Input
className="bg-[var(--deep-space)] border-[var(--horizon)] focus:border-[var(--primary)]"
```

## Logo

Files: `public/logo.png`, `public/logo_style.png`, `public/logo_no_text.ico`

Always on dark backgrounds. Min size: 24px (icon), 120px (full).

## Accessibility

- `aria-label` on all icon buttons
- Color contrast ≥ 4.5:1
- Focus: 2px cyan outline
- Touch targets: min 2.75rem (44px)

## Never

- Light/white backgrounds
- Pixels (use rem)
- Border radius >12px on small elements
- Multiple competing accents
- Spring/bounce animations
