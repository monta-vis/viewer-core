# Standardize Media Display Through MediaResolver

**Status:** completed
**Created:** 2026-03-14

## Context

Many components display images/videos by calling `buildMediaUrl()` + `MediaPaths` directly instead of using the `MediaResolver` abstraction. This creates duplicated URL-construction logic and makes it harder to add features like blur variants or mode switching. The goal is to route all media display through `MediaResolver`.

## Audit Summary

| Location | Bypass pattern | Migrate? |
|---|---|---|
| `NoteCard.tsx` | Inline `buildMediaUrl()` + `safetyIconUrl()` + `localPath` | Yes |
| `PrintCoverPage.tsx` | `buildMediaUrl(folderName, MediaPaths.frame(...))` | Yes |
| `PrintNoteBlock.tsx` | Same pattern as NoteCard | Yes |
| `PrintPartsToolsPage.tsx` | `buildMediaUrl(folderName, MediaPaths.frame(...))` | Yes |
| `resolveSubstepPrintData.ts` | `buildMediaUrl(folderName, resolveFramePath(...))` | Yes |
| `PrintView.tsx` | Threads `folderName` to all print components | Yes |
| `StepOverview.tsx` | `resolveAssemblyImageUrl()` fallback to `buildMediaUrl` | Yes |
| `AssemblySection.tsx` | `assemblyImageUrl: string` prop → `<img src>` | Yes |
| `App.tsx` dashboard | `resolveCoverImageUrl()` | No — no InstructionData available |
| `ViewPage.tsx` callbacks | `getPartToolImages()`, `getPartToolPreviewUrl()` etc. | No — provides URL strings to editor-core components for uploaded images |
| Editor-core components | `<img src={url}>` consumers | No — receive pre-resolved URLs |

## Plan

### Phase 1: Extract shared note icon resolution utility

**Goal:** Deduplicate the `isLegacy ? safetyIconUrl() : buildMediaUrl()` pattern shared by NoteCard and PrintNoteBlock.

**New file:** `packages/viewer-core/src/features/instruction-view/utils/resolveNoteIconUrl.ts`
```ts
export function resolveNoteIconUrl(
  safetyIconId: string,
  resolver: MediaResolver | null,
): string | null
```
- Legacy filename (`/\.(png|jpg|gif)$/i`) → `safetyIconUrl(safetyIconId)`
- VFA UUID + resolver → `resolver.resolveImage(safetyIconId)` → extract `.url` from `kind: 'url'`
- No resolver → `null`

**Tests (TDD):** `resolveNoteIconUrl.test.ts`
- Legacy filename returns `safetyIconUrl()` result
- UUID with processed resolver returns `mvis-media://` URL
- No resolver returns `null`
- UUID not found in resolver returns `null`

**Modify:**
- `NoteCard.tsx` — Replace inline icon resolution (lines 28-37) with `resolveNoteIconUrl()`. Use `useMediaResolver()` hook instead of `folderName`/`videoFrameAreas` props. Keep props for backward compat but prefer context.
- `PrintNoteBlock.tsx` — Replace inline resolution (lines 20-23) with `resolveNoteIconUrl()`.
- Export from `instruction-view/index.ts`

### Phase 2: AssemblySection accepts ResolvedImage

**Goal:** Replace `assemblyImageUrl: string | null` with `assemblyImage: ResolvedImage | null`. Render via `ResolvedImageView` instead of `<img src>`.

**Modify `AssemblySection.tsx`:**
- Change prop: `assemblyImageUrl?: string | null` → `assemblyImage?: ResolvedImage | null`
- Replace 3 `<img src={assemblyImageUrl}>` usages (lines 304, 392, 481) with `<ResolvedImageView image={assemblyImage} ... />`
- Import `ResolvedImageView` from `@/features/instruction-view/components/ResolvedImageView`

**Modify `StepOverview.tsx`:**
- Remove `resolveAssemblyImageUrl` callback (lines 309-317)
- Pass `assemblyImage={resolver?.resolveImage(assembly.videoFrameAreaId) ?? null}` directly
- Remove `buildMediaUrl` and `MediaPaths` imports (no longer needed)

**Tests:** Update AssemblySection tests for new prop shape.

### Phase 3: Print view uses MediaResolver

**Goal:** Wrap PrintView in `MediaResolverProvider` and migrate all print components from direct `buildMediaUrl()` to `resolver.resolveImage()`.

#### Step 3a: Wrap PrintView in MediaResolverProvider (app layer)

**Modify `apps/viewer/src/pages/ViewPage.tsx` (lines 905-910):**
```tsx
import { createProcessedResolver, MediaResolverProvider } from '@monta-vis/viewer-core';

// In print mode branch:
const printResolver = createProcessedResolver({ data: viewerData, folderName: decodedFolderName });
return (
  <ViewerDataProvider data={viewerData}>
    <MediaResolverProvider resolver={printResolver}>
      <PrintView />
    </MediaResolverProvider>
  </ViewerDataProvider>
);
```

#### Step 3b: Migrate PrintView.tsx

**Modify `packages/viewer-core/src/features/print-view/components/PrintView.tsx`:**
- Remove `folderName` prop — use `useMediaResolver()` hook instead
- Change `resolveSubstepPrintData(data, substepId, folderName)` → `resolveSubstepPrintData(data, substepId, resolver)`
- Remove `folderName` from `PrintCoverPage` and `PrintPartsToolsPage` props

#### Step 3c: Migrate resolveSubstepPrintData

**Modify `packages/viewer-core/src/features/print-view/utils/resolveSubstepPrintData.ts`:**
- Change signature: `resolver: MediaResolver` instead of `folderName: string`
- Replace `buildMediaUrl(folderName, resolveFramePath(...))` with:
  ```ts
  const resolved = resolver.resolveImage(firstImage.videoFrameAreaId);
  const imageUrl = resolved?.kind === 'url' ? resolved.url : null;
  ```
- Remove `buildMediaUrl`, `resolveFramePath` imports

**Update tests:** Provide mock resolver instead of folderName string.

#### Step 3d: Migrate PrintCoverPage

**Modify `packages/viewer-core/src/features/print-view/components/PrintCoverPage.tsx`:**
- Use `useMediaResolver()` hook
- Replace `buildMediaUrl(folderName, MediaPaths.frame(coverImageAreaId))` with `resolver.resolveImage(coverImageAreaId)` → extract URL
- Remove `folderName` prop, remove `buildMediaUrl`/`MediaPaths` imports

#### Step 3e: Migrate PrintPartsToolsPage

**Modify `packages/viewer-core/src/features/print-view/components/PrintPartsToolsPage.tsx`:**
- `PartToolCard`: use `useMediaResolver()` hook
- Replace `buildMediaUrl(folderName, MediaPaths.frame(partTool.previewImageId))` with `resolver.resolveImage(partTool.previewImageId)` → extract URL
- Remove `folderName` prop from `PartToolCard`, remove direct imports

#### Step 3f: Migrate PrintNoteBlock (uses Phase 1 utility)

- Already migrated in Phase 1 via `resolveNoteIconUrl()`. Just need to ensure `useMediaResolver()` is available in print context (guaranteed by Step 3a).

### Phase 4: Cleanup

- Verify `buildMediaUrl` and `MediaPaths` imports are removed from all migrated files
- Run `npm run typecheck` across all packages
- Run `npm run test` to ensure no regressions

## Files Changed

| File | Phase | Change |
|---|---|---|
| `viewer-core/.../utils/resolveNoteIconUrl.ts` | 1 | **New** — shared utility |
| `viewer-core/.../utils/resolveNoteIconUrl.test.ts` | 1 | **New** — tests |
| `viewer-core/.../components/NoteCard.tsx` | 1 | Use utility + `useMediaResolver()` |
| `viewer-core/.../instruction-view/index.ts` | 1 | Export new utility |
| `viewer-core/.../components/AssemblySection.tsx` | 2 | `assemblyImage: ResolvedImage` prop, use `ResolvedImageView` |
| `viewer-core/.../components/StepOverview.tsx` | 2 | Remove `resolveAssemblyImageUrl`, pass `ResolvedImage` directly |
| `apps/viewer/src/pages/ViewPage.tsx` | 3a | Wrap PrintView in `MediaResolverProvider` |
| `viewer-core/.../print-view/components/PrintView.tsx` | 3b | Use `useMediaResolver()`, remove `folderName` prop |
| `viewer-core/.../print-view/utils/resolveSubstepPrintData.ts` | 3c | Accept `MediaResolver` instead of `folderName` |
| `viewer-core/.../print-view/components/PrintCoverPage.tsx` | 3d | Use `useMediaResolver()`, remove direct URL construction |
| `viewer-core/.../print-view/components/PrintPartsToolsPage.tsx` | 3e | Use `useMediaResolver()`, remove direct URL construction |
| `viewer-core/.../print-view/components/PrintNoteBlock.tsx` | 1+3f | Use `resolveNoteIconUrl()` + `useMediaResolver()` |

## Not Migrated (by design)

- **App.tsx `resolveCoverImageUrl()`** — Dashboard displays project list covers. No `InstructionData` loaded, no MediaResolver available. This is project-metadata-level, outside instruction viewing scope.
- **ViewPage.tsx editor callbacks** (`getPartToolImages`, `getPartToolPreviewUrl`, `resolveStandaloneVideoSrc`) — These build URLs for editor-core components that accept plain `string` URLs for already-processed images on disk. The raw resolver would return frameCapture data which is wrong for uploaded images.
- **Editor-core components** (PartToolImagePicker, PartToolTable, etc.) — URL string consumers. The fix would be upstream, but upstream is correct as-is.

## Tests (TDD)

Each phase writes tests first:
1. `resolveNoteIconUrl.test.ts` — unit tests for the utility
2. `AssemblySection` test updates — new prop shape
3. `resolveSubstepPrintData` test updates — mock resolver
4. Print component test updates — provide `MediaResolverProvider` in test wrapper

## Verification

1. `npm run test` — all tests pass
2. `npm run typecheck` — no type errors
3. `npm run build:core` — viewer-core builds
4. Manual: open viewer-app, verify instruction images/videos display correctly
5. Manual: trigger PDF print, verify cover image, part/tool images, substep images, note icons all render
6. Manual: open editor mode, verify assembly preview images display in StepOverview
