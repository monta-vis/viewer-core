# Step Reordering & Cross-Assembly DnD in StepOverview

**Status:** completed
**Created:** 2026-03-11

## Summary

Add full step drag-and-drop: reorder within assemblies, and move between assemblies with position awareness. Uses a unified DndContext approach to avoid nested @dnd-kit context conflicts.

## Context

Currently in StepOverview:
- Assemblies can be reordered via @dnd-kit (`DraggableList` → `renderAssemblyList`)
- Steps can be dragged between assemblies using native HTML5 DnD
- Steps **cannot** be reordered within an assembly
- Steps land at the **end** of the target assembly (no position control)

## Design Decisions

### stepIds array as position source of truth

- `assembly.stepIds` is currently unordered (just a membership list; display order comes from global `stepNumber`)
- **Change:** make `stepIds` ordered — array position = display order within assembly
- After any reorder/move, `renumberAllSteps()` walks assemblies (by `assembly.order`) then steps (by `stepIds` position), then unassigned, assigning sequential `stepNumber` values

### Unified DndContext (critical fix from original plan)

**Problem with nesting:** The original plan put `StepDndProvider` outside `DraggableList`, creating nested `DndContext`s. In @dnd-kit, `useSortable` registers with the **nearest** parent `DndContext`. Steps inside `DraggableList`'s context would register there instead of `StepDndProvider` — breaking cross-assembly drag.

**Solution:** When `renderStepDndWrapper` is provided, it **replaces** `renderAssemblyList`. The `StepDndProvider` becomes the single `DndContext` handling:
1. Assembly reordering (assemblies are sortable items with type='assembly')
2. Step reordering within assemblies (steps in SortableContext per container)
3. Step moves between assemblies (cross-container drag detection)

This eliminates nested contexts entirely.

### Render-prop injection pattern (unchanged)

- viewer-core has no @dnd-kit dependency
- editor-core injects DnD via `renderStepDndWrapper` and `renderSortableStepGrid` (same pattern as `renderAssemblyList`)

## TODO

### 1. Store: reorderStep + moveStepToAssembly + renumberAllSteps

**File:** `packages/editor-core/src/store/editorStore.ts`

Add to `StoreActions` interface:
```typescript
reorderStep(stepId: string, newIndex: number): void;
moveStepToAssembly(stepId: string, targetAssemblyId: string | null, targetIndex: number): void;
```

- `reorderStep(stepId, newIndex)` — reorders within current assembly:
  - Get step's assemblyId, find stepIds array
  - Splice from old position, insert at newIndex
  - Call `renumberAllSteps()`

- `moveStepToAssembly(stepId, targetAssemblyId, targetIndex)` — cross-assembly move:
  - Remove from old assembly's stepIds
  - Update step.assemblyId
  - Insert into target assembly's stepIds at targetIndex
  - Call `renumberAllSteps()`
  - Mark all affected as changed

- `renumberAllSteps(data, changes)` — private helper:
  - Walk assemblies by `order`, steps by `stepIds` position, unassigned by current `stepNumber`
  - Assign sequential stepNumber (1-based)
  - Only mark changed if number actually changed

- Also update existing `assignStepToAssembly` to call `renumberAllSteps()`

### 2. Store tests (TDD — write first)

**File:** `packages/editor-core/src/store/editorStore.test.ts` (extend)

Tests:
1. `reorderStep` within assembly: updates stepIds order + renumbers
2. `reorderStep` no-op when same position
3. `moveStepToAssembly` from assembly A → B at index
4. `moveStepToAssembly` from assembly → unassigned
5. `moveStepToAssembly` from unassigned → assembly at index
6. `renumberAllSteps` across 2 assemblies + unassigned
7. Change tracking: all renumbered steps marked as changed

### 3. New editor-core component: SortableStepGrid

**File:** `packages/editor-core/src/components/SortableStepGrid.tsx`

Two exported components:

**StepDndProvider** — unified DndContext wrapping all assemblies + steps:
```typescript
interface StepDndProviderProps {
  containers: Array<{ containerId: string; stepIds: string[] }>;
  assemblyIds: string[]; // for assembly reordering
  onReorderAssembly: (assemblyId: string, newIndex: number) => void;
  onReorder: (stepId: string, containerId: string, newIndex: number) => void;
  onMove: (stepId: string, targetContainerId: string, targetIndex: number) => void;
  children: ReactNode;
}
```
- Uses PointerSensor (8px distance) + KeyboardSensor
- `closestCorners` collision detection (better for multi-container)
- `onDragEnd`: detect item type (assembly vs step), source/target container, dispatch appropriately
- Differentiates assemblies from steps via `active.data.current.type`

**SortableStepContainer** — wraps step grid with SortableContext:
```typescript
interface SortableStepContainerProps<T> {
  containerId: string;
  items: T[];
  getItemId: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
  gridStyle?: React.CSSProperties;
  emptyContent?: ReactNode;
}
```
- `SortableContext` with `rectSortingStrategy`
- `useDroppable({ id: containerId })` for empty container drops
- Each item wrapped with `useSortable({ id, data: { type: 'step', containerId } })`

### 4. Viewer-core callback interface changes

**File:** `packages/viewer-core/src/features/instruction-view/components/StepOverview.tsx`

Add to `StepOverviewEditCallbacks`:
```typescript
/** Wraps all assembly sections with unified DnD context (replaces renderAssemblyList when present) */
renderStepDndWrapper?: (
  containers: Array<{ containerId: string; stepIds: string[] }>,
  assemblyIds: string[],
  children: ReactNode,
) => ReactNode;
/** Wraps step grid with sortable context (editor-core) */
renderSortableStepGrid?: (
  containerId: string,
  steps: StepWithPreview[],
  renderStep: (step: StepWithPreview) => ReactNode,
) => ReactNode;
```

### 5. AssemblySection + UnassignedSection changes

**File:** `packages/viewer-core/src/features/instruction-view/components/AssemblySection.tsx`

- Add `renderSortableStepGrid` prop to both components
- When present: use it instead of raw `steps.map(...)` for rendering the grid
- When present: skip HTML5 DnD handlers (`onDragOver`/`onDrop` on the Card) — @dnd-kit handles this
- When present: do NOT pass `draggable={editMode}` to StepOverviewCard (sortable wrapper handles drag)
- When absent: keep current HTML5 DnD behavior (backward compat)

### 6. StepOverview changes

**File:** `packages/viewer-core/src/features/instruction-view/components/StepOverview.tsx`

- Build containers array from filteredAssemblies + unassigned
- When `renderStepDndWrapper` is provided: use it as the outer wrapper (replaces `renderAssemblyList`)
- When only `renderAssemblyList` is provided: use existing behavior
- Pass `renderSortableStepGrid` to AssemblySection and UnassignedSection

### 7. useEditCallbacks changes

**File:** `packages/editor-core/src/hooks/useEditCallbacks.ts`

- Import StepDndProvider, SortableStepContainer
- Add `renderStepDndWrapper` callback using `createElement(StepDndProvider, ...)`
- Add `renderSortableStepGrid` callback using `createElement(SortableStepContainer, ...)`
- When `renderStepDndWrapper` is returned, `renderAssemblyList` is NOT returned (mutually exclusive)
- Add both to EditCallbacks interface and returned object

### 8. Barrel exports

- Export `StepWithPreview` from `packages/viewer-core/src/features/instruction-view/index.ts`
- Export `SortableStepGrid` components from `packages/editor-core/src/index.ts`

## Tests (TDD)

### Store tests (write first)
1. `reorderStep` — swaps step within assembly, stepIds updated, stepNumber renumbered
2. `reorderStep` — no-op when same index
3. `moveStepToAssembly` — assembly A → B at index 0, both stepIds updated
4. `moveStepToAssembly` — assembly → unassigned
5. `moveStepToAssembly` — unassigned → assembly
6. `renumberAllSteps` — 2 assemblies + unassigned, correct sequential numbering
7. Change tracking verified for all operations

### Component tests
1. AssemblySection uses `renderSortableStepGrid` when provided
2. AssemblySection HTML5 DnD still works without `renderSortableStepGrid`
3. StepOverview wraps with `renderStepDndWrapper` when provided
4. StepOverview builds correct containers array

## Verification

1. `npm run test` — all new + existing tests pass
2. `npm run typecheck` — no type errors
3. `npm run build:core && npm run build:editor` — builds clean
4. Manual: drag step within assembly → reorders, number updates
5. Manual: drag step from assembly A to B → moves with position
6. Manual: drag step to/from unassigned section
7. Manual: assembly DnD still works alongside step DnD

## Critical files

- `packages/editor-core/src/store/editorStore.ts`
- `packages/editor-core/src/components/SortableStepGrid.tsx` (new)
- `packages/editor-core/src/hooks/useEditCallbacks.ts`
- `packages/viewer-core/src/features/instruction-view/components/StepOverview.tsx`
- `packages/viewer-core/src/features/instruction-view/components/AssemblySection.tsx`
