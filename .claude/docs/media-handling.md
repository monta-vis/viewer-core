# Media Handling & Resolution

## Project Directory Layout

Base path: `~/Documents/Montavis/`

| Path pattern | Content | When created |
|---|---|---|
| `{project}/montavis.db` | SQLite database | Project import / creation |
| `{project}/media/frames/{vfaId}/image.jpg` | Processed image (cropped + scaled) | Image upload (substep, cover, preview, part/tool) |
| `{project}/media/frames/{entryId}/image.{ext}` | Catalog icon copy | `copyCatalogIcon()` — uses catalog entry UUID as VFA ID |
| `{project}/media/substeps/{substepId}/video.mp4` | Merged substep video | `uploadSubstepVideo()` |
| `{project}/media/sections/{sectionId}/video.mp4` | Intermediate section video | Section-level processing (optional cache) |
| `{project}/media_blurred/frames/{vfaId}/image.jpg` | Blurred image variant | processMedia with blur flags |
| `{project}/media_blurred/substeps/{substepId}/video.mp4` | Blurred video variant | processMedia with blur flags |
| `{project}/proxy/{videoId}.mp4` | Source video proxy | External proxy generation (optional) |

Catalogs live separately:

| Path pattern | Content |
|---|---|
| `Montavis/Catalogs/ParttoolIcons/{catalogName}/{file}` | Part/tool icon SVG/PNG |
| `Montavis/Catalogs/SafetyIcons/{catalogName}/{file}` | Safety icon SVG/PNG |
| `Montavis/Catalogs/catalog.json` | Manifest with entry UUIDs |

## MediaResolver Modes

`MediaResolver` is the core abstraction in `viewer-core/src/lib/mediaResolver.ts`. It resolves image and video references to renderable sources.

**Interface:**
```ts
interface MediaResolver {
  readonly mode: 'processed' | 'raw';
  readonly folderName?: string;
  readonly frameCache?: FrameCacheProvider;
  resolveImage(areaId: string): ResolvedImage | null;
  resolveAllPartToolImages(partToolId: string): ResolvedImage[];
  resolvePartToolImage(partToolId: string): ResolvedImage | null;
  resolveVideo(substepId: string): SubstepVideoEntry | null;
}
```

**ResolvedImage** is a discriminated union:
- `{ kind: 'url'; url: string }` — pre-processed image file (processed mode)
- `{ kind: 'frameCapture'; data: FrameCaptureData }` — live video frame extraction (raw mode)

### Raw mode — `createRawResolver()`

Factory: `viewer-core/src/lib/createRawResolver.ts`

Used in the **creator editor** for live preview. Extracts frames on-demand from source videos via `<VideoFrameCapture>` canvas draws. Maintains an LRU cache (`createLruFrameCache`, max 150 entries) keyed by `{videoId}:{frame}:{crop}` to avoid redundant canvas operations. Source videos are accessed via `mvis-media://` protocol with absolute paths.

**Processed fallback:** When a VFA cannot produce a live frame capture (no `videoId`, missing video record, null `videoPath`, or null `frameNumber`), the raw resolver falls back to the processed media path (`media/frames/{areaId}/image`) via `resolveFramePath()`. This covers directly uploaded images (cover images, standalone part/tool images, safety icons) that were never captured from a source video. Blur flags are respected in the fallback path.

### Processed mode — `createProcessedResolver()`

Factory: `viewer-core/src/lib/createProcessedResolver.ts`

Used in the **viewer-app** and **creator preview**. Serves pre-extracted images and merged videos — no runtime frame extraction. Supports blurred variants via master + per-VFA blur flags. Resolves paths through `MediaPaths` constants and builds `mvis-media://` URLs (or falls back to `localPath` for mweb/snapshot exports without a `folderName`).

## Resolution Matrix

| Context | Resolver | `useRawVideo` | `folderName` | Image source | Video source | URL scheme | Frame extraction |
|---|---|---|---|---|---|---|---|
| Creator editor | Raw | `true` | project name | Live canvas capture from source video; falls back to processed path for VFAs without video | Source video sections (unmerged) | `mvis-media://` | On-demand via `<VideoFrameCapture>` |
| Viewer-app (.mvis) | Processed | `false` | project name | `media/frames/{vfaId}/image.{ext}` | `media/substeps/{substepId}/video.mp4` | `mvis-media://` | None (pre-extracted) |
| mweb / cloud export | Processed | `false` | `undefined` | `localPath` from DB (relative `./`) | Relative path from DB | Relative `./` paths | None |

**Resolver creation** happens in `InstructionView.tsx`:
```ts
const resolver = useMemo(() => {
  if (useRawVideo && folderName)
    return createRawResolver({ folderName, data, resolveSourceVideoUrl, frameCache });
  return createProcessedResolver({ data, folderName, useBlurred });
}, [...]);
```

Provided to the component tree via `<MediaResolverProvider>`.

## When Data Is Saved to Project Directory

### Image uploads (all types)

All image uploads follow the same pipeline:
1. **Validate** source file (allowed extension, within user home)
2. **Process** via FFmpeg: crop (normalized 0-1 coords) + scale to max height + JPEG conversion
3. **Write** to `media/frames/{newVfaId}/image.jpg`
4. **Create** `video_frame_areas` DB row with crop coordinates
5. **Link** via junction table or foreign key

| Upload type | Function | Max height | DB linkage |
|---|---|---|---|
| Substep image | `uploadSubstepImage()` | 1040px | `substep_images` junction |
| Part/tool image | `uploadPartToolImage()` | 720px | `part_tool_video_frame_areas` junction + `preview_image_id` |
| Cover image | `uploadCoverImage()` | 1040px | `instructions.cover_image_area_id` |
| Step/assembly/repeat preview | `uploadEntityPreviewImage()` | 1040px | Entity `.video_frame_area_id` column, VFA `type='PreviewImage'` |

FFmpeg filter: `crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}, scale=-2:'min(ih,{maxHeight})'` → JPEG yuvj420p quality 2.

### Substep video upload

Function: `uploadSubstepVideo()` in `apps/viewer/electron/main/video.ts`

1. **Probe** source with ffprobe → extract fps, duration
2. **Process** via FFmpeg:
   - Full video: scale + pad to square (`EXPORT_SIZE`)
   - Multiple sections: trim + concat + scale + pad via `filter_complex`
3. **Write** to `media/substeps/{substepId}/video.mp4`
4. **Create** `video_sections` row (with `video_id: NULL`) + `substep_video_sections` junction
5. Old substep videos are cascade-deleted first

Settings: libx264, CRF 23, fast preset, yuv420p, no audio, `+faststart`.

### Catalog icon copy

Function: `copyCatalogIcon()` in `apps/viewer/electron/main/projects.ts`

1. Parse composite icon ID (`"catalogName/filename"`)
2. Copy file to `media/frames/{entryId}/image.{ext}`
3. `INSERT OR IGNORE` into `video_frame_areas` — uses the catalog entry's fixed UUID as VFA ID for deduplication

## URL Protocol: `mvis-media://`

### Registration

```ts
protocol.registerSchemesAsPrivileged([
  { scheme: "mvis-media", privileges: { stream: true, supportFetchAPI: true } },
]);
```

Registered in `apps/viewer/electron/main/index.ts` before app ready.

### URL format

Built by `buildMediaUrl(folderName, filePath)` in `viewer-core/src/lib/media.ts`:
- **Relative paths:** `mvis-media://{encodedFolder}/{encodedPath}`
- **Absolute paths:** `mvis-media://{encodedFolder}/absolute:{encodedPath}` (raw mode source videos)

### Path resolution

`resolveMediaPath(folderName, relativePath)` in `apps/viewer/electron/main/projects.ts`:
1. Decode hostname → folder name, pathname → relative path
2. Absolute paths: validate within Montavis directory tree
3. Relative paths: resolve from `Documents/Montavis/{folder}/{path}`
4. **Security:** path must stay within base directory (`isInsidePath()` check)
5. **Extension-flexible:** extensionless image paths (e.g., `media/frames/{id}/image`) search the directory for any valid image extension
6. Returns absolute filesystem path or `null`

### Streaming

Supports HTTP `Range` headers for video seeking (206 Partial Content). SVG files get CSP headers disabling script execution.

### MediaPaths constants

```ts
export const MediaPaths = {
  proxy:              (videoId)    => `proxy/${videoId}.mp4`,
  section:            (sectionId)  => `media/sections/${sectionId}/video.mp4`,
  substepVideo:       (substepId)  => `media/substeps/${substepId}/video.mp4`,
  substepVideoBlurred:(substepId)  => `media_blurred/substeps/${substepId}/video.mp4`,
  frame:              (frameAreaId)=> `media/frames/${frameAreaId}/image`,
  frameBlurred:       (frameAreaId)=> `media_blurred/frames/${frameAreaId}/image`,
};
```

## Key Files

### viewer-core (published package)

| File | Purpose |
|---|---|
| `src/lib/mediaResolver.ts` | `MediaResolver` interface + `ResolvedImage` types |
| `src/lib/media.ts` | `buildMediaUrl()`, `MediaPaths` constants |
| `src/lib/createRawResolver.ts` | Raw mode factory (editor live preview) |
| `src/lib/createProcessedResolver.ts` | Processed mode factory (viewer + cloud) |
| `src/lib/createLruFrameCache.ts` | LRU cache for extracted video frames (max 150) |
| `src/lib/MediaResolverContext.tsx` | React context provider for resolver |
| `src/features/instruction-view/components/InstructionView.tsx` | Creates resolver, provides to tree |
| `src/features/instruction-view/components/ResolvedImageView.tsx` | Renders `ResolvedImage` (URL → `<img>`, frameCapture → `<VideoFrameCapture>`) |
| `src/features/instruction-view/components/VideoFrameCapture.tsx` | Canvas-based frame extraction from `<video>` |
| `src/features/instruction-view/utils/buildVideoEntry.ts` | Builds `SubstepVideoEntry` from DB data |
| `src/features/instruction-view/utils/resolveRawFrameCapture.ts` | Raw frame capture data resolution |
| `src/features/instruction-view/utils/resolveAllPartToolImageUrls.ts` | Part/tool URL resolution |

### editor-core (published package)

| File | Purpose |
|---|---|
| `src/hooks/useEditCallbacks.ts` | Upload orchestration (`handlePreviewUpload`) |
| `src/components/PreviewImageUploadButton.tsx` | File picker + crop for previews |
| `src/components/ImageCropDialog.tsx` | Crop UI with frame capture support |
| `src/components/SubstepEditPopover.tsx` | Substep edit — image/video upload callbacks |
| `src/components/PartToolListPanel.tsx` | Part/tool image gallery + upload |
| `src/utils/iconUtils.ts` | Catalog icon merging + URL resolution |
| `src/persistence/types.ts` | `PersistenceAdapter` upload method signatures |

### media-utils (published package)

| File | Purpose |
|---|---|
| `src/media-processing.ts` | `processImage()`, `resolveFFmpegBinary()` |
| `src/video-processing.ts` | `readVideoMetadata()`, `buildFullVideoArgs()`, `buildSectionMergeArgs()`, viewport interpolation |

### Electron app (private)

| File | Purpose |
|---|---|
| `electron/main/index.ts` | `mvis-media://` protocol registration + handler, IPC routing |
| `electron/main/projects.ts` | `resolveMediaPath()`, all image upload functions, `copyCatalogIcon()` |
| `electron/main/video.ts` | `uploadSubstepVideo()` |
| `electron/main/import-mvis.ts` | `.mvis` file import, project directory creation |
| `electron/main/pathUtils.ts` | `isInsidePath()`, `normalizePath()` — path security |
