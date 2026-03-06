# Fix Video Annotations: Drawing Size & Aspect Ratio

**Status:** pending
**Created:** 2026-03-05

## Context

Two bugs in VideoEditorDialog view mode:

1. **Drawings appear tiny in top-left corner** — `useAnnotationDrawing` is called with `bounds: FULL_VIDEO_BOUNDS` (0-100%), which transforms mouse coordinates from 0-100% to 0-1 local space when creating shapes. But `DrawingLayer` is rendered **without** `bounds`, so it treats 0-1 coordinates as 0-100% percentages — a shape at `(0.5, 0.5)` renders at 0.5% of the container instead of 50%.

2. **Video displays 16:9 instead of 1:1** — The video container uses `flex-1 min-h-0` which fills available space. Since the dialog is wider than tall, `object-contain` letterboxes within a wide rectangle. All processed videos are 1:1, so the container needs a `1/1` aspect ratio constraint.

## Plan

### Fix 1: Add `bounds` to DrawingLayer

**File:** `packages/editor-core/src/components/VideoEditorDialog/VideoEditorDialog.tsx` (line ~615)

Add `bounds={FULL_VIDEO_BOUNDS}` to the DrawingLayer component. This tells ShapeLayer to transform coordinates from 0-1 local space back to 0-100% container space for rendering.

```tsx
<DrawingLayer
  drawings={videoDrawing.visibleDrawings}
  containerWidth={containerSize.width}
  containerHeight={containerSize.height}
  selectedId={videoDrawing.selectedDrawingId}
  onSelect={(id) => handleDrawingClick(id)}
  onDeselect={() => videoDrawing.deselectDrawing()}
  onHandleMouseDown={handleDrawingHandleMouseDown}
  isDrawModeActive={!!videoDrawing.drawingTool}
  bounds={FULL_VIDEO_BOUNDS}               // ← ADD THIS
/>
```

### Fix 2: Constrain video container to 1:1 aspect ratio

**File:** `packages/editor-core/src/components/VideoEditorDialog/VideoEditorDialog.tsx` (line ~573)

Change the video container from `flex-1 min-h-0` to use `aspect-square` so the video displays at 1:1 within the available space, centered:

```tsx
<div
  ref={svgContainerRef}
  className="relative w-auto h-full mx-auto aspect-square overflow-hidden rounded bg-black"
  onClick={handleBackgroundClick}
>
```

This constrains the video area to a square that fits within the column height, centering it horizontally.

## Files to modify

| File | Change |
|------|--------|
| `packages/editor-core/src/components/VideoEditorDialog/VideoEditorDialog.tsx` | Add `bounds` to DrawingLayer, fix video container aspect ratio |

## Tests

- Existing tests should pass unchanged
- Manual: draw shapes on video → shapes appear at correct size and position
- Manual: video displays as square, not stretched to 16:9

## Verification

1. `npm run build:editor` passes
2. `npm run test` passes
3. Manual: open annotation editor → video is square → draw shape → shape renders at correct size
