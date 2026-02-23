# Architecture

## Monorepo Structure

npm workspaces monorepo with two packages:

```
montavis-viewer/          (root — private, workspaces: packages/*)
├── packages/
│   ├── viewer-core/      @monta-vis/viewer-core (published library)
│   └── viewer-app/       @monta-vis/montavis-viewer (private Electron app)
├── package.json          Root workspace config & convenience scripts
├── tsconfig.json          Solution-style references
└── .github/workflows/    CI/CD (builds & publishes viewer-core only)
```

## viewer-core (`packages/viewer-core/`)

Shared React component library for viewing assembly instructions. Published to GitHub Packages. Consumed by Creator app, web viewer, and viewer-app.

### Tech Stack

- **Framework:** React 19, TypeScript strict
- **Build:** Vite 7 (library mode), vite-plugin-dts
- **Styling:** Tailwind v4 (CSS variables, light/dark themes)
- **State:** Zustand 5 (with Immer)
- **i18n:** i18next + react-i18next (peer dependency)
- **Icons:** Lucide React (peer dependency)

### Package Exports

```
@monta-vis/viewer-core        → dist/viewer-core.js (ES module)
@monta-vis/viewer-core/styles.css → dist/viewer-core.css (Tailwind + theme CSS)
```

TypeScript declarations included (`dist/index.d.ts`).

### Source Structure

```
packages/viewer-core/src/
├── index.ts                          # Main barrel export + theme CSS import
├── styles/
│   └── theme.css                     # Shared design system (CSS vars, base styles, scrollbar, animations)
├── components/ui/                    # Shared UI components
│   ├── Badge/                        # Badge, NumberBadge
│   ├── Button/                       # Button with variants
│   ├── Card/                         # Card layout
│   ├── ColorSwatch/                  # Color picker
│   ├── Confetti/                     # Celebration animation
│   ├── Drawer/                       # Slide panel
│   ├── IconButton/                   # Icon-only button
│   ├── Navbar/                       # Layout navbar (left/center/right slots)
│   ├── PreferencesDialog/            # Settings modal (language, theme, font size, speed)
│   ├── Spinner/                      # Loading indicator
│   ├── ContextMenu.tsx               # Right-click menu
│   └── TutorialClickIcon.tsx         # Tutorial overlay
├── features/
│   ├── instruction/                  # Core data model & store
│   ├── instruction-view/             # Main viewer UI
│   ├── video-player/                 # Video playback context
│   ├── video-overlay/                # SVG/HTML overlays on video
│   ├── dashboard/                    # Instruction card grid
│   └── feedback/                     # User feedback & ratings
├── hooks/                            # Shared hooks (useTheme, useFontSize, usePlaybackSpeed, useClickOutside, usePreferredResolution)
├── lib/                              # Utility functions (media, colors, sortedValues, languages)
└── types/                            # Shared types (snapshot)
```

## Features

### instruction (`src/features/instruction/`)

Core data model. Normalized Zustand store + entity types.

- **Store:** `useSimpleStore` — normalized dicts (steps, substeps, videos, etc.) with Immer
- **Types:** `Step`, `Substep`, `Video`, `VideoSection`, `VideoFrameArea`, `PartTool`, `Note`, `Drawing`, `Image`, `ViewportKeyframe` + enriched variants
- **Utils:** substep sorting, safety icon helpers, reference label resolution

### instruction-view (`src/features/instruction-view/`)

Main read-only viewer for factory workers.

- **Components:** `InstructionView` (root), `SubstepCard`, `StepOverview`, `InlineVideoPlayer`, `PartsToolsBar`, `PartsToolsSidebar`, `PartsDrawer`, `NoteCard`, `VideoFrameCapture`, `LoupeOverlay`, `SpeedDrawer`
- **Contexts:** `InstructionViewContext` (theme/language/mode), `ViewerDataContext` (instruction data)
- **Utils:** `sqliteToSnapshot`, `transformSnapshotToStore`, `applyTranslations`, `resolveReferenceTargets`

### video-player (`src/features/video-player/`)

Video playback — single source of truth via context.

- **Context:** `VideoContext` — state (currentTime, currentFrame, fps, isPlaying, etc.) + actions (play, pause, seek, seekFrame, fastSeek, scrubbing)
- **Store:** `useFrameJumpStore` — jump mode (1 frame, 10 frames, fps)
- **Components:** `VideoPlayer`, `PlaybackControls`
- **Hooks:** `useVideo`, `useVideoState`, `useViewportInterpolation`, `useVideoShortcuts`
- **Optimizations:** RAF-based playback, fast seek throttling (16ms), scrubbing mode (50ms throttle)

### video-overlay (`src/features/video-overlay/`)

SVG/HTML overlays on top of video (annotations, drawings, frame areas).

- **Components:** `VideoOverlay`, `ShapeRenderer`, `ShapeLayer`, `DrawingRenderer`, `DrawingLayer`, `AreaHighlight`, `DrawingToolbar`, `ColorPalette`, `SelectionHandle`
- **Hooks:** `useShapeResize`, `useAreaSelection`, `useAreaResize`, `useAnnotationDrawing`, `useVideoFrameAreaManager`, `useVideoBounds`

### dashboard (`src/features/dashboard/`)

Instruction card grid for listing instructions.

- **Components:** `InstructionCard`, `InstructionCardImage`, `InstructionCardActions`, `DashboardToolbar`, `DashboardHeader`, `DashboardSearchBar`, `DashboardSortControl`, `EmptySearchState`

### feedback (`src/features/feedback/`)

User feedback & star ratings.

- **Components:** `FeedbackButton`, `FeedbackWidget`, `StarRating`
- **Utils:** `submitFeedback`

## Shared Hooks (`src/hooks/`)

| Hook                    | Purpose                                      | Storage                |
| ----------------------- | -------------------------------------------- | ---------------------- |
| `useTheme`              | Light/dark/system theme (CSS class on html)  | `montavis-theme`       |
| `useFontSize`           | Small/medium/large font size (CSS class)     | `montavis-font-size`   |
| `usePlaybackSpeed`      | Video playback speed (0.5x–2x)               | `montavis-playback-speed` |
| `usePreferredResolution`| Preferred video resolution                   | `montavis-resolution`  |
| `useClickOutside`       | Detect clicks outside element                | —                      |
| `useMenuClose`          | Click outside + Escape key handler           | —                      |

## Shared UI Components (`src/components/ui/`)

- **Navbar** — Sticky top bar with `left`/`center`/`right` slots. Gradient background.
- **PreferencesDialog** — Centered modal with built-in sections (Language, Theme, Font Size, Playback Speed). Supports `extraSections` prop for app-specific content and `hideSections` to hide built-in sections.
- **Card** — Versatile card with variants (default, elevated, ghost, glass), optional interactivity.
- **Button / IconButton** — Buttons with variant/size system, WCAG touch targets.
- **Drawer** — Edge-anchored slide panel with backdrop.
- **Badge / NumberBadge** — Label indicators.

## Stores (Zustand)

| Store              | Location                              | Purpose                           |
| ------------------ | ------------------------------------- | --------------------------------- |
| `useSimpleStore`   | `features/instruction/store/`         | Normalized instruction data       |
| `useFrameJumpStore`| `features/video-player/store/`        | Video frame jump mode (1/10/fps)  |

## Contexts (React)

| Context                    | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `VideoContext`              | Video playback state & actions (SSoT)        |
| `InstructionViewContext`    | Theme (light/dark), language, viewer mode    |
| `ViewerDataContext`         | Instruction data provider (decouples store)  |

## Consumption Pattern

```typescript
import {
  InstructionView,
  InstructionViewProvider,
  VideoProvider,
  ViewerDataProvider,
} from '@monta-vis/viewer-core';
import '@monta-vis/viewer-core/styles.css';

<InstructionViewProvider defaultTheme="dark" defaultLanguage="en">
  <VideoProvider>
    <ViewerDataProvider data={instructionData}>
      <InstructionView
        selectedStepId={stepId}
        onStepChange={handleStepChange}
      />
    </ViewerDataProvider>
  </VideoProvider>
</InstructionViewProvider>
```

## Theming

**Shared design system:** `src/styles/theme.css` defines `:root` dark theme + `.light` theme CSS variables (base hues, core/semantic/status colors, backgrounds, text, borders, interactive states, shadows, scrollbar, animations). Bundled into `dist/viewer-core.css` automatically. Consumer apps import `@monta-vis/viewer-core/styles.css` to get all variables.

**Scoped instruction themes:** `instruction-view/styles/instruction-view.css` defines `.instruction-theme-dark` / `.instruction-theme-light` classes for the InstructionView component (with note-level and video player overrides). Theme switching via `InstructionViewContext`.

## Media URL Protocols

The library supports multiple URL schemes (resolved by the consuming app):
- `mvis-media://` — local project media (Electron)
- `mvis-catalog://` — part tool catalog icons (Electron)
- Standard HTTPS URLs (web context)

## viewer-app (`packages/viewer-app/`)

Standalone Electron viewer app. `private: true` — never published. Depends on `@monta-vis/viewer-core` via npm workspace symlink.

### Structure

```
packages/viewer-app/
├── electron/
│   ├── main/
│   │   ├── index.ts          Main process (window, IPC, protocol)
│   │   └── projects.ts       Project listing + getProjectData (SQLite read-only)
│   └── preload/
│       └── preload.ts        Exposes electronAPI (list, getData, getMediaUrl)
├── index.html                Entry HTML
├── src/
│   ├── main.tsx              React entry point
│   ├── App.tsx               Root component (HashRouter: Dashboard + ViewPage)
│   ├── pages/
│   │   └── ViewPage.tsx      Instruction viewer (loads SQLite → InstructionView)
│   ├── i18n.ts               i18next setup
│   └── index.css             App-level styles
├── vite.config.ts            Vite SPA config (not library mode)
└── tsconfig.json             TypeScript config
```

### Routing (HashRouter)

| Route | Component | Description |
|---|---|---|
| `/` | `DashboardPage` | Lists local instructions from `~/Documents/Montavis/` |
| `/view/:folderName` | `ViewPage` | Opens and displays an instruction |

### IPC Handlers

| Channel | Handler | Description |
|---|---|---|
| `projects:list` | `listProjects()` | Lists all projects (reads `instructions` table) |
| `projects:get-data` | `getProjectData(folderName)` | Reads full project data (instruction + 20 tables) |
| `projects:get-media-url` | — | Returns `mvis-media://` URL for media files |

### Data Flow (Instruction Opening)

1. User clicks `InstructionCard` → navigates to `/view/:folderName`
2. `ViewPage` calls `window.electronAPI.projects.getData(folderName)`
3. Main process opens SQLite DB (read-only), reads all tables
4. Renderer receives `ElectronProjectData`, runs `sqliteToSnapshot()` → `transformSnapshotToStore()`
5. Renders with `VideoProvider` → `InstructionViewProvider` → `ViewerDataProvider` → `InstructionView`

### Build Order

viewer-core must be built before viewer-app (types resolve from `dist/`):
1. `npm run build:core`
2. `npm run build:app`
