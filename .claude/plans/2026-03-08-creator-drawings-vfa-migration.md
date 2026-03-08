# Creator: Migrate drawings from substep_image_id to video_frame_area_id

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align montavis-creator with viewer-core's DrawingRow change (`substepImageId` → `videoFrameAreaId`), ensuring both apps use the same data format.

**Architecture:** The creator's Drawing model gets a new `video_frame_area_id` column (populated from the SubstepImageRow join). The backend API, SQLite export, and PDF generator all include the new field. The frontend switches from matching `substepImageId` (SubstepImage row ID) to `videoFrameAreaId` (VFA ID), which is architecturally correct since VFA is the actual image entity. The old `substep_image_id` column stays in PostgreSQL for backwards compat and cascade deletes.

**Tech Stack:** Python/SQLAlchemy (backend), Alembic (migrations), TypeScript/React (frontend), viewer-core types

**Context:** The viewer-core `DrawingRow` type already changed `substepImageId` → `videoFrameAreaId`. The creator imports this type via `file:` link. The transform layer (`transformSnapshotToStore`) already falls back: `d.video_frame_area_id ?? d.substep_image_id`.

---

## Task 1: Alembic Migration — Add `video_frame_area_id` to Drawing

**Files:**
- Create: `src/backend/alembic/versions/XXXX_add_drawing_video_frame_area_id.py`

**Step 1: Generate migration**

```bash
cd src/backend
alembic revision --autogenerate -m "add video_frame_area_id to drawing"
```

**Step 2: Edit migration to add data population**

The autogenerate will add the column. Manually add the UPDATE to populate from join:

```python
def upgrade() -> None:
    op.add_column("drawing", sa.Column("video_frame_area_id", sa.String(36), nullable=True))
    op.create_foreign_key(
        "fk_drawing_video_frame_area_id",
        "drawing", "video_frame_area",
        ["video_frame_area_id"], ["id"],
        ondelete="SET NULL",
    )
    # Populate from substep_image_row join
    op.execute("""
        UPDATE drawing SET video_frame_area_id = (
            SELECT sir.video_frame_area_id
            FROM substep_image_row sir
            WHERE sir.id = drawing.substep_image_id
        )
        WHERE substep_image_id IS NOT NULL AND video_frame_area_id IS NULL
    """)

def downgrade() -> None:
    op.drop_constraint("fk_drawing_video_frame_area_id", "drawing", type_="foreignkey")
    op.drop_column("drawing", "video_frame_area_id")
```

**Step 3: Run migration**

```bash
alembic upgrade head
```

**Step 4: Commit**

---

## Task 2: Drawing SQLAlchemy Model — Add column

**Files:**
- Modify: `src/backend/app/models/drawing.py:28` (add column after substep_image_id)

**Step 1: Add the column**

After the existing `substep_image_id` mapped_column, add:

```python
# New canonical FK for image drawings (references the VFA directly)
video_frame_area_id: Mapped[str | None] = mapped_column(
    String(36),
    ForeignKey("video_frame_area.id", ondelete="SET NULL"),
    nullable=True,
)
```

Note: `ondelete="SET NULL"` (not CASCADE) — we don't want deleting a VFA to silently destroy drawings. The viewer already re-links drawings before deleting VFAs.

**Step 2: Commit**

---

## Task 3: DrawingAudit Model — Add column

**Files:**
- Modify: `src/backend/app/models/audit.py:217` (add after substep_image_id)

**Step 1: Add the column**

```python
video_frame_area_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
```

**Step 2: Commit**

---

## Task 4: DB Init — Add column to syncable columns

**Files:**
- Modify: `src/backend/app/db_init.py:60`

**Step 1: Add to column list**

Change:
```python
"drawing": ["instruction_id", "substep_image_id", "substep_id", ...],
```
To:
```python
"drawing": ["instruction_id", "substep_image_id", "video_frame_area_id", "substep_id", ...],
```

**Step 2: Commit**

---

## Task 5: Local Sync — Add column

**Files:**
- Modify: `src/backend/app/models/local_sync.py:131`

**Step 1: Add to sync columns**

Change:
```python
"drawing": _BASE_COLUMNS | _VERSIONED_COLUMNS | {
    "instruction_id", "substep_image_id", "substep_id",
```
To:
```python
"drawing": _BASE_COLUMNS | _VERSIONED_COLUMNS | {
    "instruction_id", "substep_image_id", "video_frame_area_id", "substep_id",
```

**Step 2: Commit**

---

## Task 6: DrawingData Schema — Add field

**Files:**
- Modify: `src/backend/app/schemas/editor.py:94-110`

**Step 1: Add field to schema**

After `substep_image_id`:
```python
video_frame_area_id: str | None = None
```

Update the docstring to mention `video_frame_area_id` as the canonical field for image drawings.

**Step 2: Commit**

---

## Task 7: Editor Routes — Include video_frame_area_id in API responses

**Files:**
- Modify: `src/backend/app/features/instructions/routes/editor.py:656,914,1428,1449,1696`

**Step 1: Update DrawingData construction (lines ~656 and ~914)**

In both `_get_editor_data` and `get_step_chunk`, add the field:
```python
DrawingData(
    ...
    substep_image_id=d.substep_image_id,
    video_frame_area_id=d.video_frame_area_id,
    ...
)
```

**Step 2: Update `_upsert_drawing` (lines ~1428 and ~1449)**

Add to both INSERT values and ON CONFLICT UPDATE:
```python
video_frame_area_id=data.video_frame_area_id,
```

**Step 3: Update `_copy_version_entities` (line ~1696)**

When copying drawings to a new version, map the VFA ID:
```python
video_frame_area_id=vfa_id_map.get(row.video_frame_area_id, row.video_frame_area_id) if row.video_frame_area_id else None,
```

(The `vfa_id_map` should already exist in the copy logic — verify and use the correct variable name.)

**Step 4: Commit**

---

## Task 8: Draft Service — Include video_frame_area_id

**Files:**
- Modify: `src/backend/app/features/instructions/services/draft_service.py:605`

**Step 1: Add field when copying drawings to draft**

```python
video_frame_area_id=id_map.get(item.video_frame_area_id) if item.video_frame_area_id else None,
```

**Step 2: Commit**

---

## Task 9: SQLite Export — Add video_frame_area_id to exported schema

**Files:**
- Modify: `src/backend/app/features/instructions/services/sqlite_export.py:127,620-625`

**Step 1: Update CREATE TABLE (line ~127)**

Add column after `substep_image_id`:
```sql
video_frame_area_id TEXT,
```

**Step 2: Update INSERT statement (lines ~620-625)**

Add `video_frame_area_id` to column list and values:
```python
conn.execute(
    """INSERT INTO drawings
       (id, substep_image_id, video_frame_area_id, substep_id, ...)
       VALUES (?, ?, ?, ?, ...)""",
    (
        drawing.id,
        drawing.substep_image_id,
        drawing.video_frame_area_id,
        drawing.substep_id,
        ...
    ),
)
```

**Step 3: Commit**

---

## Task 10: PDF Generator — Use video_frame_area_id for drawing lookup

**Files:**
- Modify: `src/backend/app/features/instructions/services/pdf/generator.py:247-300`

**Step 1: Update query (lines ~247-254)**

Change from querying by `substep_image_id` to `video_frame_area_id`. Get VFA IDs from the SubstepImageRows:

```python
vfa_ids = [si.video_frame_area_id for si in substep_images]
if vfa_ids:
    result = await self.db.execute(
        select(Drawing)
        .where(Drawing.video_frame_area_id.in_(vfa_ids))
        .where(Drawing.is_deleted == False)
    )
    drawings = list(result.scalars().all())
```

**Step 2: Update lookup dict (lines ~294-300)**

Change from `substep_image_id` key to `video_frame_area_id`:
```python
drawings_by_vfa: dict[str, list[Drawing]] = {}
for d in drawings:
    if d.video_frame_area_id:
        if d.video_frame_area_id not in drawings_by_vfa:
            drawings_by_vfa[d.video_frame_area_id] = []
        drawings_by_vfa[d.video_frame_area_id].append(d)
```

Then update wherever `drawings_by_image[si.id]` is used downstream to `drawings_by_vfa[si.video_frame_area_id]`.

**Step 3: Commit**

---

## Task 11: Creator SnapshotDrawing Type — Add field

**Files:**
- Modify: `src/types/snapshot.ts:154`

**Step 1: Add field after `substep_image_id`**

```typescript
video_frame_area_id: string | null;
```

Keep `substep_image_id` for backwards compat — the viewer-core transform already handles the fallback.

**Step 2: Commit**

---

## Task 12: Frontend — useEditorDrawing.ts

**Files:**
- Modify: `src/features/editor/hooks/useEditorDrawing.ts:170,181,263,290,312-313,344,357`

This is the most critical frontend file. Every `substepImageId` reference on `DrawingRow` must change to `videoFrameAreaId`, and the **value** must change from SubstepImage row ID to VFA ID.

**Step 1: Update `substepAnnotations` filter (line ~170)**

Change:
```typescript
(d) => isImageDrawing(d) && d.substepImageId === currentSubstepImage.imgRow.id,
```
To:
```typescript
(d) => isImageDrawing(d) && d.videoFrameAreaId === currentSubstepImage.imgRow.videoFrameAreaId,
```

**Step 2: Update `allSubstepImageDrawings` filter (line ~181)**

Change:
```typescript
(d) => isImageDrawing(d) && d.substepImageId !== null && imageIds.has(d.substepImageId),
```
To (use VFA IDs instead of SubstepImage row IDs):
```typescript
// Build VFA ID set from substep images
const vfaIds = new Set(
  substep.imageRowIds
    .map(id => data?.substepImages[id]?.videoFrameAreaId)
    .filter((id): id is string => !!id)
);
return allDrawingsArray.filter(
  (d) => isImageDrawing(d) && d.videoFrameAreaId !== null && vfaIds.has(d.videoFrameAreaId),
);
```

**Step 3: Update drawing creation (line ~263)**

Change:
```typescript
substepImageId: isImage ? currentSubstepImage.imgRow.id : null,
```
To:
```typescript
videoFrameAreaId: isImage ? currentSubstepImage.imgRow.videoFrameAreaId : null,
```

**Step 4: Update drawing selection navigation (line ~290)**

Change:
```typescript
?? (drawing.substepImageId ? data.substepImages[drawing.substepImageId]?.substepId : null);
```
To — need reverse lookup (find SubstepImageRow by VFA ID):
```typescript
?? (drawing.videoFrameAreaId
  ? Object.values(data.substepImages).find(si => si.videoFrameAreaId === drawing.videoFrameAreaId)?.substepId
  : null);
```

**Step 5: Update drawing panel select image detection (lines ~312-313)**

Change:
```typescript
if (isImageDrawing(drawing) && drawing.substepImageId) {
  const imgRow = data!.substepImages[drawing.substepImageId];
```
To:
```typescript
if (isImageDrawing(drawing) && drawing.videoFrameAreaId) {
  const imgRow = Object.values(data!.substepImages).find(
    si => si.videoFrameAreaId === drawing.videoFrameAreaId
  );
```

**Step 6: Update mode change — video→image (line ~344)**

Change:
```typescript
substepImageId: targetImageId,
```
To:
```typescript
videoFrameAreaId: data!.substepImages[targetImageId]?.videoFrameAreaId ?? null,
```

**Step 7: Update mode change — image→video (line ~357)**

Change:
```typescript
substepImageId: null,
```
To:
```typescript
videoFrameAreaId: null,
```

**Step 8: Commit**

---

## Task 13: Frontend — SubstepViewer.tsx

**Files:**
- Modify: `src/features/editor/components/SubstepViewer/SubstepViewer.tsx:152-158`

**Step 1: Update image drawing detection**

Change:
```typescript
const substepImageIds = new Set(
  Object.values(data.substepImages ?? {})
    .filter((img) => img.substepId === substepId)
    .map((img) => img.id)
);
return Object.values(data.drawings).some(
  (d) => d.substepImageId && substepImageIds.has(d.substepImageId)
);
```
To:
```typescript
const vfaIds = new Set(
  Object.values(data.substepImages ?? {})
    .filter((img) => img.substepId === substepId)
    .map((img) => img.videoFrameAreaId)
);
return Object.values(data.drawings).some(
  (d) => d.videoFrameAreaId && vfaIds.has(d.videoFrameAreaId)
);
```

**Step 2: Commit**

---

## Task 14: Frontend — getUnassignedElements.ts

**Files:**
- Modify: `src/features/editor/utils/getUnassignedElements.ts:33`

**Step 1: Update filter**

Change:
```typescript
drawings: Object.values(data.drawings).filter((d) => d.substepId === null && d.substepImageId === null),
```
To:
```typescript
drawings: Object.values(data.drawings).filter((d) => d.substepId === null && d.videoFrameAreaId === null),
```

**Step 2: Commit**

---

## Task 15: Frontend Tests — Update mock data

**Files:**
- Modify: `src/features/editor/hooks/__tests__/useEditorDrawing.test.ts`
- Modify: `src/features/editor/pages/editorDrawing.test.ts`
- Modify: `src/features/editor/pages/editorDrawingResize.test.ts`
- Modify: `src/features/editor/utils/getUnassignedElements.test.ts`

**Step 1: Replace all `substepImageId` with `videoFrameAreaId` in mock data**

For each file, do a find-and-replace of `substepImageId` → `videoFrameAreaId`.

Important: in `editorDrawing.test.ts`, the tests that check `result.substepImageId` should become `result.videoFrameAreaId`, and test descriptions mentioning `substepImageId` should be updated too.

Also in `useEditorDrawing.test.ts`, update the mock `isImageDrawing`:
```typescript
isImageDrawing: (d: { videoFrameAreaId?: string | null }) => !!d.videoFrameAreaId,
```

**Step 2: Run tests**

```bash
npm test
```

**Step 3: Commit**

---

## Task 16: Typecheck & verify

**Step 1: Rebuild viewer-core and editor-core** (already done in the monorepo change)

```bash
cd ../montavis-viewer && npm run build:core && npm run build:editor
```

**Step 2: Typecheck creator**

```bash
cd ../montavis-creator && npx tsc --noEmit
```

**Step 3: Run creator tests**

```bash
npm test
```

**Step 4: Commit**

---

## Key Files Summary

| File | Change |
|------|--------|
| `src/backend/app/models/drawing.py` | Add `video_frame_area_id` column |
| `src/backend/app/models/audit.py` | Add to DrawingAudit |
| `src/backend/app/db_init.py` | Add to syncable columns |
| `src/backend/app/models/local_sync.py` | Add to sync columns |
| `src/backend/app/schemas/editor.py` | Add to DrawingData schema |
| `src/backend/app/features/instructions/routes/editor.py` | API responses + upsert + copy |
| `src/backend/app/features/instructions/services/draft_service.py` | Draft copy |
| `src/backend/app/features/instructions/services/sqlite_export.py` | Export schema + insert |
| `src/backend/app/features/instructions/services/pdf/generator.py` | PDF drawing lookup |
| `src/types/snapshot.ts` | Add `video_frame_area_id` |
| `src/features/editor/hooks/useEditorDrawing.ts` | Filter/create by VFA ID |
| `src/features/editor/components/SubstepViewer/SubstepViewer.tsx` | Drawing detection |
| `src/features/editor/utils/getUnassignedElements.ts` | Unassigned filter |
| 4 test files | Mock data rename |

## Verification

1. `alembic upgrade head` — migration runs without errors
2. `npx tsc --noEmit` — no type errors
3. `npm test` — all frontend tests pass
4. `pytest` — all backend tests pass
5. Manual: open instruction in creator → add image drawing → drawing has `video_frame_area_id` set
6. Manual: export to SQLite → `drawings` table has `video_frame_area_id` column populated
7. Manual: open exported project in viewer → drawings display correctly
