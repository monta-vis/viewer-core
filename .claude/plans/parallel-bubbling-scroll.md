# Remove border from PdfPreviewDialog

**Status:** pending

## Context
The `DialogShell` component applies `border border-[var(--color-border)]` by default, which creates a visible white border around the PDF preview modal. This looks unclean.

## Change
**File:** `packages/viewer-core/src/features/print-view/components/PdfPreviewDialog.tsx` (line 33)

Change `className="!p-0 overflow-hidden"` → `className="!p-0 !border-0 overflow-hidden"`

## Verification
- `npm run build:core` passes
**Created:** 2026-03-08

## Context

The previous implementation navigated the entire window to a print preview URL (`?print=preview`). The user wants instead an **overlay dialog** (not full window takeover) that shows the print content as **individual pages** with visible page boundaries — like a PDF viewer.

The current `PrintPreviewToolbar` + full-page navigation approach needs to be replaced with a `DialogShell`-based overlay containing paginated content.

## Architecture

### Approach

- **Use `DialogShell`** (existing base modal in viewer-core) as the overlay container
- Create a new **`PrintPreviewDialog`** component that wraps `DialogShell` with a custom fullscreen layout
- Inside the dialog: a **scrollable area** showing each print page as a discrete "paper sheet" with shadows/gaps between them (like a PDF viewer)
- **Toolbar** (Print / Download PDF / Close) sits at the top of the dialog, inside the overlay
- The existing `PrintView` logic (image pre-rendering, page components) is reused — we just wrap each page in a "paper sheet" container instead of relying on CSS page-break rules

### Key Decisions

- **No route navigation** — dialog is opened via state from the Dashboard
- **`DialogShell` with custom fullscreen layout** — override `maxWidth` and `className` to fill the viewport
- **Paper sheet styling** — each page container (cover, parts/tools, step pages) gets a white card with shadow on a gray background, sized to A4 proportions
- **`window.print()`** for Print button — prints the dialog content
- **Download PDF** button — Electron IPC `print:save-pdf` (already implemented)

## Changes

### 1. New component: `PrintPreviewDialog`

**File:** `packages/viewer-core/src/features/print-view/components/PrintPreviewDialog.tsx`

Wraps `DialogShell` with:
- Full-viewport size (`maxWidth=""` override, custom className for full height)
- Dark gray background in the scrollable area (like a PDF viewer)
- Toolbar at top with Print / Download PDF / Close buttons
- Scrollable body rendering `PrintView` pages, each wrapped in an A4-proportioned white card with shadow
- `@media print` rules hide the toolbar and dialog chrome, show only page content

**Props:**
```tsx
interface PrintPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  folderName: string;
  /** Called when user clicks Download PDF — wired to Electron IPC in app */
  onDownloadPdf?: () => void;
}
```

### 2. Refactor `PrintView` to expose pages individually

**File:** `packages/viewer-core/src/features/print-view/components/PrintView.tsx`

The current `PrintView` renders all pages sequentially in one `<div>`. For the dialog overlay, we need each page to be visually separated.

**Option A (simpler):** Add a CSS class `.print-view--paginated` that adds visible page gaps:
- Each page container (`.print-page-break`, `.print-page-break-before`) becomes a white card with shadow + margin
- Gray background between pages
- This approach reuses the existing PrintView as-is, just styled differently in preview mode

This is the preferred approach — minimal code change, maximum reuse.

### 3. CSS for paginated preview

**File:** `packages/viewer-core/src/features/print-view/styles/print-view.css`

```css
/* ── Paginated preview (inside dialog overlay) ── */
.print-preview-dialog__body {
  background: #4b5563; /* gray-600 — PDF viewer background */
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.print-preview-dialog__page {
  background: #ffffff;
  box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.3);
  border-radius: 0.125rem;
  width: 100%;
  max-width: 52.5rem; /* ~210mm A4 width at 96dpi */
  aspect-ratio: 210 / 297; /* A4 proportions */
  overflow: hidden;
  padding: 0.5cm;
}

/* In print mode: remove dialog chrome, show pages full-bleed */
@media print {
  .print-preview-dialog__body {
    background: white;
    padding: 0;
    gap: 0;
  }
  .print-preview-dialog__page {
    box-shadow: none;
    border-radius: 0;
    max-width: none;
    aspect-ratio: auto;
  }
}
```

### 4. Update `PrintPreviewToolbar` → embed in dialog header

**File:** `packages/viewer-core/src/features/print-view/components/PrintPreviewToolbar.tsx`

Simplify — becomes the header row of the dialog rather than a fixed-position bar. Same buttons (Print, Download PDF, Close), but as an inline flex row inside the dialog.

### 5. Dashboard: open dialog instead of navigating

**File:** `apps/viewer/src/App.tsx`

Instead of `navigate(...)` for PDF, set a state variable to open the preview dialog:
```tsx
const [pdfPreviewFolder, setPdfPreviewFolder] = useState<string | null>(null);

// In onExport:
if (format === 'pdf') {
  setPdfPreviewFolder(project.folderName);
}

// Render dialog:
{pdfPreviewFolder && (
  <PrintPreviewDialog
    open={!!pdfPreviewFolder}
    onClose={() => setPdfPreviewFolder(null)}
    folderName={pdfPreviewFolder}
    onDownloadPdf={...}
  />
)}
```

### 6. ViewPage: revert `?print=preview` changes

**File:** `apps/viewer/src/pages/ViewPage.tsx`

Remove the `isPreviewMode` / `PrintPreviewToolbar` logic added in the previous iteration. Keep `?print=true` for programmatic PDF generation (the `print:save-pdf` IPC handler still needs it).

### 7. Barrel exports

**File:** `packages/viewer-core/src/features/print-view/index.ts`

Export `PrintPreviewDialog` (replace `PrintPreviewToolbar` export or keep both).

### 8. Remove `isPreview` prop from `PrintView`

No longer needed — the paginated styling is handled by the dialog wrapper, not by PrintView itself.

## Critical Files

| File | Change |
|------|--------|
| `packages/viewer-core/src/features/print-view/components/PrintPreviewDialog.tsx` | **New** — dialog overlay wrapping PrintView |
| `packages/viewer-core/src/features/print-view/components/PrintPreviewToolbar.tsx` | Simplify to inline header row |
| `packages/viewer-core/src/features/print-view/components/PrintView.tsx` | Revert `isPreview` prop |
| `packages/viewer-core/src/features/print-view/styles/print-view.css` | Add paginated preview styles, revert `print-view--preview` |
| `packages/viewer-core/src/features/print-view/index.ts` | Export `PrintPreviewDialog` |
| `apps/viewer/src/App.tsx` | State-based dialog open instead of navigate |
| `apps/viewer/src/pages/ViewPage.tsx` | Revert preview mode changes |

## TODO

- [ ] Create `PrintPreviewDialog` component (DialogShell + toolbar + paginated body)
- [ ] Update `PrintPreviewToolbar` to inline header (no fixed positioning)
- [ ] Add paginated preview CSS (gray bg, white page cards, shadow, A4 ratio)
- [ ] Revert `PrintView` — remove `isPreview` prop and `print-view--preview` class
- [ ] Revert `ViewPage.tsx` — remove `isPreviewMode` / toolbar rendering
- [ ] Update `App.tsx` — state-based dialog open instead of navigate
- [ ] Update barrel export (print-view/index.ts)
- [ ] Revert CSS: remove `print-view--preview` and fixed toolbar styles
- [ ] Build: `npm run build:core`

## Verification

1. `npm run build:core` succeeds
2. `npm run test` — no new failures
3. Dashboard → Export → PDF → overlay dialog opens (not full window)
4. Dialog shows pages as white sheets on gray background with gaps
5. Print button → native OS print dialog
6. Download PDF button → save dialog → PDF saved
7. Close button → dialog closes, back to dashboard
8. Escape key → dialog closes
9. `?print=true` still works for programmatic PDF (IPC handler)
