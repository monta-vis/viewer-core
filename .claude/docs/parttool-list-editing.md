# PartToolList Editing Architecture

## Data Flow

```
EditorPage → usePartToolListStore (shared state) → PartToolListPanelWrapper (bridge) → PartToolListPanel (editor-core, props-driven)
```

- **Store** (`partToolListStore.ts`): `isOpen`, `activeSubstepPartToolId`, `activePartToolId`, `setContext()`
- **Wrapper** (`PartToolListPanelWrapper.tsx`): Reads `useEditorStore` + store, creates callbacks, passes props
- **Panel** (`editor-core/PartToolListPanel.tsx`): Stateless UI — table + sidebar form + detail dialog

## Two Highlight IDs

| ID | Source | Meaning |
|----|--------|---------|
| `highlightPartToolId` | Store's `activePartToolId` (set by EditorPage when editing a substep) | Substep's current partTool (read-only context) |
| `selectedPartToolId` | Panel-local state (set by Edit icon click) | Currently editing in sidebar form |

Priority: `effectiveHighlightId = highlightPartToolId ?? selectedPartToolId`

## Two Replace Modes

**Replace button shows when:** `(highlightPartToolId ?? selectedPartToolId)` exists AND clicked row differs from it.

| Mode | Trigger | Handler | Effect |
|------|---------|---------|--------|
| **Substep-scoped** | `highlightPartToolId` set (substep sidebar context) | `onSubstepReplace(newId)` | Updates ONE substep junction |
| **Global merge** | Only `selectedPartToolId` set (Edit icon context) | `onGlobalReplace(sourceId, targetId)` | `computePartToolMerge`: transfers all images + substep junctions from source → target, deletes source |

## Detail Dialog

Row click → opens detail dialog showing partTool info. Buttons: Replace (conditional) + Close.

## Sidebar Form

Edit icon → loads partTool into `SidebarFormState` → dirty-check via `snapshotRef`. Actions: Add (new from form), Update (patch existing), Delete, Deselect. Discard dialog on switching with unsaved changes.

## Key Files

| File | Package | Role |
|------|---------|------|
| `partToolListStore.ts` | creator | Shared open/context state |
| `PartToolListPanelWrapper.tsx` | creator | Bridge: store → props, all mutation callbacks |
| `PartToolListPanel.tsx` | editor-core | Props-driven UI (table, sidebar, dialogs) |
| `partToolResolve.ts` | creator | Pure `computePartToolMerge()` — merge operations |
| `EditorPage.tsx` | creator | Syncs `editingPartTool` → store via `setContext()` |

## computePartToolMerge Algorithm

1. Transfer source's images to target (append order)
2. Transfer substep junctions (sum amounts on conflict, reassign otherwise)
3. Delete source partTool
