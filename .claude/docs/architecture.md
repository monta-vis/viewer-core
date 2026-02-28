# Architecture

## Monorepo Structure

npm workspaces monorepo:

```
montavis-viewer/          (root — private, workspaces: packages/*, apps/*)
├── packages/
│   ├── viewer-core/      @monta-vis/viewer-core (published library — read-only)
│   ├── editor-core/      @monta-vis/editor-core (published library — editing layer)
│   ├── db-utils/         @monta-vis/db-utils (shared SQLite save utilities)
│   └── media-utils/      @monta-vis/media-utils (shared FFmpeg media processing)
├── apps/
│   └── viewer/           @monta-vis/montavis-viewer (private Electron app)
├── package.json          Root workspace config & convenience scripts
├── tsconfig.json          Solution-style references
└── .github/workflows/    CI/CD (builds & publishes viewer-core + editor-core)
```

### Dependency Graph

```
viewer-app  →  editor-core  →  viewer-core
    ↓↓                              ↑
 db-utils            (future: viewer-mobile, viewer-web)
 media-utils
```

## viewer-core (`packages/viewer-core/`)

Read-only React component library for viewing assembly instructions. Published to GitHub Packages. Contains NO editing/mutation logic.

### Tech Stack

- **Framework:** React 19, TypeScript strict
- **Build:** Vite 7 (library mode), vite-plugin-dts
- **Styling:** Tailwind v4 (CSS variables, light/dark themes)
- **i18n:** i18next + react-i18next (peer dependency)
- **Icons:** Lucide React (peer dependency)

### Package Exports

```
@monta-vis/viewer-core        → dist/viewer-core.js (ES module)
@monta-vis/viewer-core/styles.css → dist/viewer-core.css (Tailwind + theme CSS)
```

### Source Structure

```
packages/viewer-core/src/
├── index.ts                          # Main barrel export + theme CSS import
├── styles/
│   └── theme.css                     # Shared design system (CSS vars, base styles)
├── components/ui/                    # Shared UI components
├── features/
│   ├── instruction/                  # Core data model & types (NO store)
│   ├── instruction-view/             # Main viewer UI
│   ├── video-player/                 # Video playback context
│   ├── video-overlay/                # SVG/HTML overlays on video (read-only rendering)
│   ├── dashboard/                    # Instruction card grid
│   └── feedback/                     # User feedback & ratings
├── hooks/                            # Shared hooks
├── lib/                              # Utility functions
└── types/                            # Shared types (snapshot)
```

## editor-core (`packages/editor-core/`)

Editing layer that adds mutation capabilities on top of viewer-core. Published to GitHub Packages. Depends on `@monta-vis/viewer-core`.

### Key Exports

| Export | Purpose |
|---|---|
| `useEditorStore` | Zustand+Immer store with all ~50 mutation actions + change tracking |
| `EditorProvider` | Convenience wrapper (PersistenceProvider + ViewerDataProvider) |
| `PersistenceProvider` / `usePersistence` | React context for platform-specific persistence |
| `useEditCallbacks` | Creates EditCallbacks from store mutations |
| `useVideoFrameAreaManager` | Area CRUD hook (editing-specific) |
| `TextEditDialog` | Generic text editing modal dialog |
| `SafetyIconPicker` | Icon browser with search + category tabs |
| `NoteEditDialog` | Note editing modal with safety icon picker (accepts `catalogs` prop) |
| `SafetyIconCatalog` / `CatalogEntry` / `CatalogCategory` | Shared catalog type contracts |

### Persistence Adapter

Platform-agnostic interface. Each platform provides its own implementation:

```typescript
interface PersistenceAdapter {
  listProjects(): Promise<ProjectListItem[]>;
  getProjectData(projectId: string): Promise<unknown>;
  saveChanges(projectId: string, changes: ProjectChanges): Promise<PersistenceResult>;
  uploadPartToolImage?(projectId: string, partToolId: string, image: ImageSource, crop?: NormalizedCrop): Promise<ImageUploadResult>;
  uploadCoverImage?(projectId: string, image: ImageSource, crop?: NormalizedCrop): Promise<CoverImageUploadResult>;
  resolveMediaUrl(projectId: string, relativePath: string): string;
}
```

### Source Structure

```
packages/editor-core/src/
├── index.ts                          # Main barrel export
├── EditorProvider.tsx                 # Convenience wrapper
├── store/
│   └── editorStore.ts                # Zustand+Immer store (moved from viewer-core)
├── persistence/
│   ├── types.ts                      # PersistenceAdapter interface
│   └── PersistenceContext.tsx         # React context + provider
├── components/
│   ├── SubstepEditPopover.tsx        # Popover-based substep editing
│   ├── TextEditDialog.tsx            # Generic text editing modal
│   ├── SafetyIconPicker.tsx          # Icon browser with search + tabs
│   └── NoteEditDialog.tsx            # Note editing with icon picker
├── hooks/
│   ├── useEditCallbacks.ts           # EditCallbacks from store
│   └── useVideoFrameAreaManager.ts   # Area CRUD (moved from viewer-core)
└── types.ts                          # Editor types + catalog contracts
```

## Features

### instruction (`viewer-core/src/features/instruction/`)

Core data model. Types + utilities only (store moved to editor-core).

- **Types:** `InstructionData`, `Step`, `Substep`, `Video`, `VideoSection`, `VideoFrameArea`, `PartTool`, `Note`, `Drawing`, etc.
- **Utils:** substep sorting, safety icon helpers, reference label resolution

### instruction-view (`viewer-core/src/features/instruction-view/`)

Main read-only viewer for factory workers.

- **Components:** `InstructionView` (root), `SubstepCard`, `StepOverview`, `InlineVideoPlayer`, `PartsToolsSidebar`, `PartsDrawer`, `NoteCard`
- **Contexts:** `InstructionViewContext` (theme/language/mode), `ViewerDataContext` (instruction data)
- **Utils:** `sqliteToSnapshot`, `transformSnapshotToStore`, `applyTranslations`

### video-player (`viewer-core/src/features/video-player/`)

Video playback — single source of truth via context.

- **Context:** `VideoContext` — state + actions (play, pause, seek, etc.)
- **Store:** `useFrameJumpStore` — jump mode (1 frame, 10 frames, fps)
- **Components:** `VideoPlayer`, `PlaybackControls`

### video-overlay (`viewer-core/src/features/video-overlay/`)

SVG/HTML overlays on top of video. Read-only rendering stays in viewer-core.

- **Components:** `VideoOverlay`, `ShapeRenderer`, `ShapeLayer`, `DrawingRenderer`, `DrawingLayer`, `AreaHighlight`
- **Hooks:** `useShapeResize`, `useAreaSelection`, `useAreaResize`, `useVideoBounds`
- **Note:** `useVideoFrameAreaManager` moved to editor-core (editing hook)

### dashboard (`viewer-core/src/features/dashboard/`)

Instruction card grid for listing instructions.

### feedback (`viewer-core/src/features/feedback/`)

User feedback & star ratings.

## Stores (Zustand)

| Store | Location | Purpose |
|---|---|---|
| `useEditorStore` | `editor-core/store/` | Normalized instruction data + mutations + change tracking |
| `useFrameJumpStore` | `viewer-core/features/video-player/store/` | Video frame jump mode (1/10/fps) |

## Contexts (React)

| Context | Package | Purpose |
|---|---|---|
| `VideoContext` | viewer-core | Video playback state & actions (SSoT) |
| `InstructionViewContext` | viewer-core | Theme (light/dark), language, viewer mode |
| `ViewerDataContext` | viewer-core | Instruction data provider (decouples store) |
| `PersistenceContext` | editor-core | Platform-specific persistence adapter |

## Consumption Patterns

### View-only (no editing)

```typescript
import { InstructionView, InstructionViewProvider, VideoProvider, ViewerDataProvider } from '@monta-vis/viewer-core';
import '@monta-vis/viewer-core/styles.css';

<InstructionViewProvider>
  <VideoProvider>
    <ViewerDataProvider data={instructionData}>
      <InstructionView selectedStepId={stepId} onStepChange={handleStepChange} />
    </ViewerDataProvider>
  </VideoProvider>
</InstructionViewProvider>
```

### With editing

```typescript
import { InstructionView, VideoProvider, InstructionViewProvider } from '@monta-vis/viewer-core';
import { EditorProvider, useEditorStore, useEditCallbacks } from '@monta-vis/editor-core';

const adapter = createElectronAdapter(); // or createWebAdapter(), etc.

<EditorProvider adapter={adapter}>
  <VideoProvider>
    <InstructionViewProvider>
      <InstructionView editCallbacks={useEditCallbacks()} editNavbarExtra={<SaveButton />} />
    </InstructionViewProvider>
  </VideoProvider>
</EditorProvider>
```

## db-utils (`packages/db-utils/`)

Shared SQLite save utilities. Pure Node.js (no React). `better-sqlite3` as peerDependency. Built with plain `tsc`.

### Key Exports

| Export | Purpose |
|---|---|
| `saveProjectData(db, changes, config)` | Main save function: upsert + delete + audit + backfill in a transaction |
| `SaveConfig` | Config interface: allowedTables, deleteOrder, auditTableMap, etc. |
| `ProjectChanges` | Generic changes format (changed rows + deleted IDs) |
| `recordAudit` / `buildAuditInsert` | Audit table utilities |
| `getTableInfo` / `toSqliteValue` | SQL helpers |

### Design

- `db` handle passed in (caller handles open/close/path resolution)
- Config-driven (allowedTables, deleteOrder, auditTableMap are all per-app config)
- PK-aware upsert via `PRAGMA table_info` + `ON CONFLICT`
- Transaction wrapping with rollback on error

## media-utils (`packages/media-utils/`)

Shared FFmpeg media processing utilities. Pure Node.js (no React, no Electron). Built with plain `tsc`.

### Key Exports

| Export | Purpose |
|---|---|
| `resolveFFmpegBinary(basePath, isPackaged)` | Find FFmpeg binary (parameterized, no Electron import) |
| `readImageDimensions(filePath)` | Read PNG/JPEG dimensions from binary headers |
| `computeProcessingHash(...params)` | SHA-256 cache key for idempotent processing |
| `isProcessingCurrent(outputDir, hash)` | Check `params.hash` sidecar matches |
| `buildImageProcessArgs(ffmpegBin, src, dest, crop?, maxHeight)` | Build FFmpeg args for crop+scale+JPEG |
| `processImage(ffmpegBin, src, dest, crop?, maxHeight)` | Orchestrate FFmpeg + write hash sidecar |
| `PARTTOOL_EXPORT_SIZE` / `EXPORT_SIZE` | Max output heights (720px / 1040px) |

### Design

- No Electron dependency — all platform paths passed as parameters
- Idempotent via `params.hash` sidecar files
- Uses `child_process.execFile` (not `exec`) to prevent shell injection
- Only downscales, preserves aspect ratio, width divisible by 2

## viewer-app (`apps/viewer/`)

Standalone Electron viewer app. `private: true` — never published. Depends on both `@monta-vis/viewer-core` and `@monta-vis/editor-core`.

### Structure

```
apps/viewer/
├── electron/                 Main process + preload
├── src/
│   ├── App.tsx               Root component (HashRouter: Dashboard + ViewPage)
│   ├── pages/ViewPage.tsx    Instruction viewer with editing
│   ├── persistence/
│   │   └── electronAdapter.ts  PersistenceAdapter implementation for Electron
│   ├── stores/
│   │   └── historyStore.ts   Undo/redo (uses useEditorStore)
│   └── components/           App-specific dialogs
└── tsconfig.json
```

### Build Order

1. `npm run build:core`
2. `npm run build:editor`
3. `npm run build:db`
4. `npm run build:media`
5. `npm run build:app`
