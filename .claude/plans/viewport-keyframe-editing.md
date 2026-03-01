# Add viewport keyframe editing to VideoTrimDialog

**Status:** pending
**Created:** 2026-03-01

## Context

The VideoTrimDialog currently only supports trim (cut regions). The user wants it to also support **viewport keyframe editing** — the same UX as montavis-creator: drag a viewport rectangle on the video at any frame to auto-create keyframes, see diamond markers on a timeline, right-click to toggle interpolation (hold/linear). The footer bar is removed; a Save button goes in the header. Save passes all data up through `onConfirm` → app layer creates DB records (video + video\_section + viewport\_keyframes) and runs FFmpeg.

## Key architectural decisions

1. **Standalone `ViewportBox`, not `VideoOverlay`.** `VideoOverlay` requires `VideoProvider` context and is heavyweight (annotations, drawings, area management). A simple draggable/resizable rectangle is all we need.

2. **Local `computeLetterboxBounds` utility.** The pure function `computeVideoBounds` in `viewer-core/.../useVideoBounds.ts` is not barrel-exported. Rather than modifying viewer-core exports, write a small equivalent function in `packages/editor-core/src/components/VideoTrimDialog/viewportUtils.ts`. It's ~15 lines of aspect ratio math.

3. **`interpolateViewportAtFrame` from `@monta-vis/media-utils`.** Already exported. Used to compute the current viewport at any frame.

4. **fps = 30.** Browser `<video>` doesn't expose fps. Reuse `FRAME_RATE = 30` constant from `useVideoPlayback.ts` (extract to shared constant or import).

5. **Dialog collects data, app layer handles DB.** Per CLAUDE.md: no DB/IPC logic in editor-core. The dialog emits everything through `onConfirm`.

6. **video.ts inserts viewport\_keyframe rows.** Currently it only inserts video + video\_section + substep\_video\_sections. Must also insert viewport\_keyframes and return their IDs so ViewPage can update editorStore.

## Implementation steps

### 1. Extend `TrimmedFile` type

**File:** `packages/editor-core/src/types/trim.types.ts`

```ts
import type { ViewportKeyframeDB } from '@monta-vis/media-utils';

export interface TrimmedFile {
  file: File;
  trimData: TrimData | null;
  viewportKeyframes: ViewportKeyframeDB[];  // min 1 (frame-0 default)
  videoFps: number;                         // 30
  videoWidth: number;                       // natural width from <video>
  videoHeight: number;                      // natural height from <video>
  videoDurationSeconds: number;             // playback.duration
}
```

No changes needed in `SubstepEditPopover.tsx` — it already passes `TrimmedFile` through unchanged to `onUploadSubstepVideo`.

### 2. New hook: `useViewportKeyframes`

**New file:** `packages/editor-core/src/hooks/useViewportKeyframes.ts`

Local state for viewport keyframes during a dialog session. Not connected to editorStore (pre-upload).

**API:**
- `keyframes: ViewportKeyframeDB[]` — sorted by `frame_number`
- `upsertAtFrame(frameNumber, viewport: {x,y,width,height})` — creates or updates keyframe at frame. New keyframes default to `interpolation: null` (hold)
- `deleteAtFrame(frameNumber)` — no-op if `frameNumber === 0` (protected)
- `toggleInterpolation(frameNumber)` — `null`→`'linear'`→`null`. No-op on frame 0 (first keyframe has no "from" to interpolate)
- `getViewportAtFrame(frame): Viewport` — delegates to `interpolateViewportAtFrame` from `@monta-vis/media-utils`
- `reset()` — resets to single frame-0 full-viewport keyframe

**TDD tests:** `packages/editor-core/src/hooks/useViewportKeyframes.test.ts`

Use `renderHook` from `@testing-library/react`:
1. Init has 1 keyframe at frame 0 with `{x:0, y:0, width:1, height:1}`
2. `upsertAtFrame(60, {x:0.1, y:0.1, width:0.8, height:0.8})` adds a second keyframe, sorted
3. Upserting at existing frame updates it (no duplicate)
4. `deleteAtFrame(0)` is no-op (still 1 keyframe)
5. `deleteAtFrame(60)` removes the keyframe
6. `toggleInterpolation(60)` flips `null` → `'linear'` → `null`
7. `toggleInterpolation(0)` is no-op
8. `getViewportAtFrame(30)` between frames 0 and 60 (hold) returns frame 0's viewport
9. `getViewportAtFrame(30)` between frames 0 and 60 (linear) returns interpolated values
10. `reset()` restores to single frame-0 keyframe

### 3. New utility: `viewportUtils.ts`

**New file:** `packages/editor-core/src/components/VideoTrimDialog/viewportUtils.ts`

```ts
/** Minimum viewport dimension (5% of video). */
export const MIN_VIEWPORT_SIZE = 0.05;

/** Default fps assumption. */
export const VIDEO_FPS = 30;

/** Convert seconds to frame number. */
export function timeToFrame(seconds: number, fps = VIDEO_FPS): number {
  return Math.round(seconds * fps);
}

/**
 * Compute the pixel bounds of a video with object-fit:contain inside a container.
 * Same algorithm as viewer-core's computeVideoBounds.
 */
export function computeLetterboxBounds(
  containerWidth: number,
  containerHeight: number,
  videoNaturalWidth: number,
  videoNaturalHeight: number,
): { x: number; y: number; width: number; height: number } | null {
  if (!videoNaturalWidth || !videoNaturalHeight) return null;
  const videoAR = videoNaturalWidth / videoNaturalHeight;
  const containerAR = containerWidth / containerHeight;
  let w: number, h: number;
  if (videoAR > containerAR) {
    w = containerWidth;
    h = containerWidth / videoAR;
  } else {
    h = containerHeight;
    w = containerHeight * videoAR;
  }
  return { x: (containerWidth - w) / 2, y: (containerHeight - h) / 2, width: w, height: h };
}
```

### 4. New component: `ViewportBox`

**New file:** `packages/editor-core/src/components/VideoTrimDialog/ViewportBox.tsx`

Draggable/resizable rectangle over the video. Positioned absolutely within a container that matches the letterbox bounds.

**Props:**
```ts
interface ViewportBoxProps {
  viewport: { x: number; y: number; width: number; height: number };  // 0-1 normalized
  containerWidth: number;   // px (letterbox-adjusted)
  containerHeight: number;  // px (letterbox-adjusted)
  onViewportChange: (v: { x: number; y: number; width: number; height: number }) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}
```

**Behavior:**
- Converts normalized → pixel for rendering, pixel → normalized on output
- Body drag: moves position, opposite corner doesn't move
- Corner drag: resizes, opposite corner stays fixed
- Clamp all values to `[0, 1]`, enforce `MIN_VIEWPORT_SIZE` on width/height
- `onViewportChange` fires on mouseup (not during drag, to avoid keyframe spam)
- `aria-label={t('editorCore.videoTrim.viewport', 'Viewport')}` on the body
- `cursor-move` on body, `cursor-nwse-resize` / `cursor-nesw-resize` on corners
- Orange border: `border-2 border-amber-500`
- Corner handles: `w-2 h-2 rounded-sm bg-white border border-amber-500`

**TDD tests:** `packages/editor-core/src/components/VideoTrimDialog/ViewportBox.test.tsx`
1. Renders at correct pixel position for given normalized viewport
2. Has 4 corner handles
3. Has aria-label "Viewport"
4. `onContextMenu` fires on right-click

### 5. New component: `ViewportKeyframeTimeline`

**New file:** `packages/editor-core/src/components/VideoTrimDialog/ViewportKeyframeTimeline.tsx`

Slim bar (`h-6`) with diamond keyframe markers. Follows TrimTimeline pattern.

**Props:**
```ts
interface ViewportKeyframeTimelineProps {
  duration: number;
  currentTime: number;
  fps: number;
  keyframes: ViewportKeyframeDB[];
  onSeek: (time: number) => void;
  onMarkerContextMenu: (frameNumber: number, e: React.MouseEvent) => void;
}
```

**Rendering:**
- Background: `bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] rounded-lg`
- Label above: `text-xs text-[var(--color-text-muted)]` "Viewport keyframes"
- Diamond markers: `w-2 h-2 rotate-45 absolute` centered vertically
  - Frame 0: `bg-yellow-400/40` (semi-transparent — always present, can't delete)
  - Hold (`interpolation === null`): `bg-yellow-400`
  - Linear: `bg-pink-400`
  - `hover:scale-150 transition-transform`
- Click on bar background: seek (same as TrimTimeline)
- Right-click on marker: `onMarkerContextMenu(frameNumber, e)` + `e.preventDefault()`
- Playhead: thin white line (same pattern as TrimTimeline)

**TDD tests:** `packages/editor-core/src/components/VideoTrimDialog/ViewportKeyframeTimeline.test.tsx`
1. Renders correct number of diamond markers
2. Frame 0 marker has semi-transparent style (`opacity` or class check)
3. Hold markers have yellow styling
4. Linear markers have pink styling
5. Right-click on marker calls `onMarkerContextMenu` with correct `frameNumber`
6. Click on background calls `onSeek`
7. Has `aria-label` "Viewport keyframes" on the bar

### 6. Extend `TrimVideoPlayer`

**File:** `packages/editor-core/src/components/VideoTrimDialog/TrimVideoPlayer.tsx`

Add one new callback prop:

```ts
onVideoSize?: (width: number, height: number) => void;
```

In `handleLoadedMetadata`, after calling `onLoadedMetadata`, add:

```ts
onVideoSize?.(video.videoWidth, video.videoHeight);
```

### 7. Update `VideoTrimDialog` — main integration

**File:** `packages/editor-core/src/components/VideoTrimDialog/VideoTrimDialog.tsx`

**Header changes:**
- Remove footer bar entirely
- Add Save button in header: `<Button variant="primary" size="sm" onClick={handleSave}>`
- Use `Save` icon from lucide-react (not `Scissors`)

**New state:**
```ts
const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
const [contextMenu, setContextMenu] = useState<{ frameNumber: number; x: number; y: number } | null>(null);
const videoContainerRef = useRef<HTMLDivElement>(null);
```

**New hooks:**
```ts
const viewportKF = useViewportKeyframes();
```

**ResizeObserver** on `videoContainerRef` to track `containerSize` — needed for `computeLetterboxBounds`.

**Letterbox bounds** (derived):
```ts
const letterbox = useMemo(
  () => computeLetterboxBounds(containerSize.width, containerSize.height, videoSize.width, videoSize.height),
  [containerSize, videoSize],
);
```

**Current viewport** (interpolated):
```ts
const currentFrame = timeToFrame(playback.currentTime);
const currentViewport = viewportKF.getViewportAtFrame(currentFrame);
```

**Viewport drag handler:**
```ts
const handleViewportChange = useCallback((viewport) => {
  viewportKF.upsertAtFrame(timeToFrame(playback.currentTime), viewport);
}, [viewportKF, playback.currentTime]);
```

**Context menu handler** — triggered by right-click on ViewportBox or on a timeline marker:
```ts
const handleContextMenu = useCallback((frameNumber: number, e: React.MouseEvent) => {
  e.preventDefault();
  setContextMenu({ frameNumber, x: e.clientX, y: e.clientY });
}, []);
```

For the viewport box right-click, target the keyframe at the current frame (or the nearest one at-or-after current frame, matching creator behavior):
```ts
const handleViewportContextMenu = useCallback((e: React.MouseEvent) => {
  const frame = timeToFrame(playback.currentTime);
  // Find keyframe at current frame, or nearest after
  const kf = viewportKF.keyframes.find(k => k.frame_number >= frame) ?? viewportKF.keyframes[0];
  handleContextMenu(kf.frame_number, e);
}, [playback.currentTime, viewportKF.keyframes, handleContextMenu]);
```

**Context menu rendering** — `ContextMenu` + `ContextMenuItem` from `@monta-vis/viewer-core`:
```tsx
{contextMenu && (
  <ContextMenu position={{ x: contextMenu.x, y: contextMenu.y }} onClose={() => setContextMenu(null)}>
    <ContextMenuItem
      onClick={() => { viewportKF.toggleInterpolation(contextMenu.frameNumber); setContextMenu(null); }}
      disabled={contextMenu.frameNumber === 0}
    >
      {t('editorCore.videoTrim.toggleInterpolation', 'Toggle interpolation')}
    </ContextMenuItem>
    <ContextMenuItem
      onClick={() => { viewportKF.deleteAtFrame(contextMenu.frameNumber); setContextMenu(null); }}
      disabled={contextMenu.frameNumber === 0}
      className="text-[var(--color-error)]"
    >
      {t('editorCore.videoTrim.deleteKeyframe', 'Delete keyframe')}
    </ContextMenuItem>
  </ContextMenu>
)}
```

**Updated `handleSave`** (renamed from `handleApplyTrim`):
```ts
onConfirm({
  file,
  trimData: regions.length > 0 ? { regions: [...regions], videoDuration: playback.duration } : null,
  viewportKeyframes: viewportKF.keyframes,
  videoFps: VIDEO_FPS,
  videoWidth: videoSize.width,
  videoHeight: videoSize.height,
  videoDurationSeconds: playback.duration,
});
```

**Layout:**
```
DialogShell (maxWidth="max-w-4xl", className="p-0")
├── Header
│   ├── Scissors icon + "Trim Video" title
│   ├── flex-grow spacer
│   ├── Button(primary, sm) "Save"
│   └── IconButton(ghost, sm) X close
├── Content (px-6 py-4 space-y-4)
│   ├── file name <p>
│   ├── <div ref={videoContainerRef} className="relative">
│   │   ├── <TrimVideoPlayer ref={videoRef} onVideoSize={setVideoSize} ... />
│   │   └── {letterbox && <div style={letterbox position}>
│   │       └── <ViewportBox viewport={currentViewport} ... />
│   │       </div>}
│   ├── <TrimPlaybackControls ... />
│   ├── <TrimTimeline ... />
│   ├── <ViewportKeyframeTimeline ... />
│   └── instruction text <p>
└── {contextMenu && <ContextMenu ...>}
```

### 8. Update `video.ts` — accept full keyframe array + insert DB rows

**File:** `apps/viewer/electron/main/video.ts`

**Args type change:**
```ts
export interface VideoViewportUploadArgs {
  sourceVideoPath: string;
  fps: number;
  viewportKeyframes: ViewportKeyframeDB[];  // replaces startViewport/endViewport/interpolation
  videoWidth: number;
  videoHeight: number;
  videoDurationSeconds: number;             // NEW — compute endFrame from this
}
```

Remove `startFrame`, `endFrame`, `startViewport`, `endViewport`, `interpolation` fields. Compute internally:
```ts
const startFrame = 0;
const endFrame = Math.round(args.videoDurationSeconds * args.fps);
```

**FFmpeg call change:**
```ts
const segments = buildViewportSegments(args.viewportKeyframes, startFrame, endFrame);
```

**DB insert — add viewport\_keyframes:** After inserting video + video\_section + substep\_video\_sections, insert viewport\_keyframe rows:

```ts
const viewportKeyframeIds: string[] = [];
for (const kf of args.viewportKeyframes) {
  const kfId = crypto.randomUUID();
  viewportKeyframeIds.push(kfId);
  db.prepare(
    `INSERT INTO viewport_keyframes (id, video_id, frame_number, x, y, width, height, interpolation, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(kfId, videoId, kf.frame_number, kf.x, kf.y, kf.width, kf.height, kf.interpolation ?? 'hold', now, now);
}
```

**Result type change:**
```ts
export interface VideoUploadResult {
  success: boolean;
  videoId?: string;
  sectionId?: string;
  substepVideoSectionId?: string;
  viewportKeyframeIds?: string[];  // NEW
  error?: string;
}
```

Return `viewportKeyframeIds` in the success result.

### 9. Update `ViewPage.tsx` — wire new fields + store viewport keyframes

**File:** `apps/viewer/src/pages/ViewPage.tsx`

**Updated args construction:**
```ts
const args: VideoViewportUploadArgs = {
  sourceVideoPath: nativePath,
  fps: trimmedFile.videoFps,
  viewportKeyframes: trimmedFile.viewportKeyframes,
  videoWidth: trimmedFile.videoWidth,
  videoHeight: trimmedFile.videoHeight,
  videoDurationSeconds: trimmedFile.videoDurationSeconds,
};
```

**After successful upload — add viewport keyframes to editorStore:**
```ts
if (result.viewportKeyframeIds) {
  for (let i = 0; i < result.viewportKeyframeIds.length; i++) {
    const kf = trimmedFile.viewportKeyframes[i];
    store.addViewportKeyframe({
      id: result.viewportKeyframeIds[i],
      versionId,
      videoId: result.videoId!,
      frameNumber: kf.frame_number,
      x: kf.x,
      y: kf.y,
      width: kf.width,
      height: kf.height,
      interpolation: kf.interpolation ?? 'hold',
    });
  }
}
```

Also update `addVideoSection` call to use computed `endFrame`:
```ts
store.addVideoSection({
  id: result.sectionId,
  versionId,
  videoId: result.videoId!,
  startFrame: 0,
  endFrame: Math.round(trimmedFile.videoDurationSeconds * trimmedFile.videoFps),
  localPath: null,
});
```

## New i18n keys (inline fallbacks)

| Key | Fallback |
|-----|----------|
| `editorCore.videoTrim.save` | `'Save'` |
| `editorCore.videoTrim.viewport` | `'Viewport'` |
| `editorCore.videoTrim.viewportKeyframes` | `'Viewport keyframes'` |
| `editorCore.videoTrim.toggleInterpolation` | `'Toggle interpolation'` |
| `editorCore.videoTrim.deleteKeyframe` | `'Delete keyframe'` |

## Files

### New files
| File | Purpose |
|------|---------|
| `editor-core/src/hooks/useViewportKeyframes.ts` | Keyframe state hook |
| `editor-core/src/hooks/useViewportKeyframes.test.ts` | TDD tests (10 cases) |
| `editor-core/src/components/VideoTrimDialog/viewportUtils.ts` | `computeLetterboxBounds`, `timeToFrame`, constants |
| `editor-core/src/components/VideoTrimDialog/ViewportBox.tsx` | Draggable/resizable viewport rect |
| `editor-core/src/components/VideoTrimDialog/ViewportBox.test.tsx` | TDD tests (4 cases) |
| `editor-core/src/components/VideoTrimDialog/ViewportKeyframeTimeline.tsx` | Diamond marker timeline |
| `editor-core/src/components/VideoTrimDialog/ViewportKeyframeTimeline.test.tsx` | TDD tests (7 cases) |

### Modified files
| File | Change |
|------|--------|
| `editor-core/src/types/trim.types.ts` | Extend `TrimmedFile` with viewport + video metadata |
| `editor-core/src/components/VideoTrimDialog/TrimVideoPlayer.tsx` | Add `onVideoSize` callback |
| `editor-core/src/components/VideoTrimDialog/VideoTrimDialog.tsx` | Remove footer, Save in header, ViewportBox, ViewportKeyframeTimeline, context menu |
| `apps/viewer/electron/main/video.ts` | New args type, insert viewport\_keyframe DB rows, return IDs |
| `apps/viewer/src/pages/ViewPage.tsx` | Wire new TrimmedFile fields, add viewport keyframes to store |

### Reused from codebase
| Utility | Source | Used for |
|---------|--------|----------|
| `interpolateViewportAtFrame` | `@monta-vis/media-utils` | Interpolate viewport at frame |
| `ViewportKeyframeDB` type | `@monta-vis/media-utils` | Shared keyframe shape |
| `buildViewportSegments` | `@monta-vis/media-utils` | FFmpeg segment building (video.ts) |
| `ContextMenu` + `ContextMenuItem` | `@monta-vis/viewer-core` | Right-click menu |
| `DialogShell`, `Button`, `IconButton` | `@monta-vis/viewer-core` | Dialog chrome |

## Verification

1. `npm run test -w packages/editor-core` — all tests pass (existing 337 + ~21 new)
2. `npm run build:editor` — clean build
3. `npm run typecheck` — 0 errors
4. Manual E2E in Electron:
   - Pick a video → dialog opens with viewport rect over full video
   - Seek to different frames, drag viewport → diamond markers appear
   - Right-click viewport → toggle interpolation to linear → marker turns pink
   - Right-click → delete non-frame-0 keyframe → marker disappears
   - Frame-0 context menu items are disabled (greyed out)
   - Add cut regions (trim still works alongside viewport)
   - Click Save → verify in DB: `videos`, `video_sections`, `substep_video_sections`, `viewport_keyframes` rows all created
   - Processed video shows viewport crop/pan effect
