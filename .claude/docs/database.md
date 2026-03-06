# Database Schema

SQLite database (`montavis.db`) per project folder. One instruction per DB.

## Core Tables

### instructions (1 row per DB)

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | Instruction title |
| description | TEXT | Nullable |
| article_number | TEXT | Nullable |
| estimated_duration | INTEGER | Minutes, nullable |
| revision | INTEGER | Default 1 |
| cover_image_area_id | TEXT | FK -> video_frame_areas.id, nullable |
| source_language | TEXT | Default 'de' |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### assemblies

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| instruction_id | TEXT | FK -> instructions.id |
| title | TEXT | Nullable |
| description | TEXT | Nullable |
| order | INTEGER | Sort order |

### steps

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| instruction_id | TEXT | FK -> instructions.id |
| step_number | INTEGER | Display order |
| title | TEXT | Nullable |
| assembly_id | TEXT | FK -> assemblies.id, nullable |
| repeat_count | INTEGER | Default 1 |
| repeat_label | TEXT | Nullable |

### substeps

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| step_id | TEXT | FK -> steps.id |
| step_order | INTEGER | Order within step |
| title | TEXT | Nullable |
| display_mode | TEXT | 'normal' or 'tutorial' |
| repeat_count | INTEGER | Default 1 |
| repeat_label | TEXT | Nullable |

## Video Tables

### videos

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| fps | REAL | Frames per second |
| order | INTEGER | Sort order |
| video_path | TEXT | Relative path |
| width | INTEGER | Nullable |
| height | INTEGER | Nullable |
| duration | REAL | Seconds, nullable |

### video_sections

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| video_id | TEXT | FK -> videos.id, nullable |
| start_frame | INTEGER | Frame number |
| end_frame | INTEGER | Frame number |
| content_aspect_ratio | REAL | Nullable |

Media files: `media/sections/{id}/video.mp4` (+ `video_blurred.mp4`)

### video_frame_areas

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| video_id | TEXT | FK -> videos.id, nullable |
| frame_number | INTEGER | Nullable |
| image_id | TEXT | FK -> images.id, nullable |
| type | TEXT | Area type |
| x | REAL | Normalized 0-1, nullable |
| y | REAL | Normalized 0-1, nullable |
| width | REAL | Normalized 0-1, nullable |
| height | REAL | Normalized 0-1, nullable |

Media files: `media/frames/{id}/image.jpg` (+ `image_blurred.*`)

### viewport_keyframes

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| video_section_id | TEXT | FK -> video_sections.id |
| frame_number | INTEGER | Relative to section start (0-based) |
| x | REAL | Viewport rect |
| y | REAL | Viewport rect |
| width | REAL | Viewport rect |
| height | REAL | Viewport rect |
| interpolation | TEXT | 'hold' or 'linear' |

### images

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| original_path | TEXT | Path to original image file |

## Parts, Tools, Notes

### part_tools

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| instruction_id | TEXT | FK -> instructions.id |
| name | TEXT | Part/tool name |
| label | TEXT | Nullable |
| part_number | TEXT | Nullable |
| type | TEXT | 'part' or 'tool' |
| amount | INTEGER | Quantity |
| description | TEXT | |
| unit | TEXT | |
| material | TEXT | |
| dimension | TEXT | |
| preview_image_id | TEXT | FK -> video_frame_areas.id, nullable |

### notes

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| instruction_id | TEXT | FK -> instructions.id |
| text | TEXT | Note content |
| level | TEXT | Severity level |
| safety_icon_id | TEXT | FK -> safety_icons.id, nullable |
| safety_icon_category | TEXT | Nullable |

### safety_icons

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| filename | TEXT | Icon filename |
| category | TEXT | Icon category |
| label | TEXT | Display label |
| description | TEXT | Icon description |

### drawings

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| instruction_id | TEXT | FK -> instructions.id, nullable |
| substep_image_id | TEXT | FK -> substep_images.id, nullable |
| substep_id | TEXT | FK -> substeps.id, nullable |
| start_frame | INTEGER | Nullable |
| end_frame | INTEGER | Nullable |
| type | TEXT | Shape type (arrow, rectangle, circle, text, freehand) |
| color | TEXT | Hex color |
| stroke_width | REAL | Nullable |
| x1, y1 | REAL | Start point (normalized 0-1), nullable |
| x2, y2 | REAL | End point (normalized 0-1), nullable |
| x, y | REAL | Position (normalized 0-1), nullable |
| content | TEXT | Text content, nullable |
| font_size | REAL | Nullable |
| points | TEXT | JSON string for freehand, nullable |
| order | INTEGER | Z-order |

## Junction Tables (M:N Relations)

### substep_images

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| substep_id | TEXT | FK -> substeps.id |
| video_frame_area_id | TEXT | FK -> video_frame_areas.id |
| order | INTEGER | Display order |

### substep_video_sections

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| substep_id | TEXT | FK -> substeps.id, nullable |
| video_section_id | TEXT | FK -> video_sections.id, nullable |
| order | INTEGER | Display order |

### substep_part_tools

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| substep_id | TEXT | FK -> substeps.id |
| part_tool_id | TEXT | FK -> part_tools.id |
| amount | INTEGER | Quantity for this substep |

### substep_notes

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| substep_id | TEXT | FK -> substeps.id |
| note_id | TEXT | FK -> notes.id |

### substep_descriptions

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| substep_id | TEXT | FK -> substeps.id |
| text | TEXT | Description content |
| order | INTEGER | Display order |

### substep_tutorials

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| substep_id | TEXT | FK -> substeps.id |
| target_type | TEXT | 'step' or 'substep' |
| target_id | TEXT | FK -> steps.id or substeps.id |
| source_instruction_id | TEXT | Cross-instruction ref, nullable |
| order | INTEGER | Display order |
| source_language | TEXT | Nullable |
| kind | TEXT | 'see' or 'tutorial', nullable |
| label | TEXT | Nullable |

### part_tool_video_frame_areas

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| part_tool_id | TEXT | FK -> part_tools.id |
| video_frame_area_id | TEXT | FK -> video_frame_areas.id |
| order | INTEGER | Display order |
| is_preview_image | INTEGER | Boolean (0/1) |

## Other Tables

### translations

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| entity_type | TEXT | 'instruction', 'step', 'substep', 'note', 'part_tool', 'substep_description', 'drawing' |
| entity_id | TEXT | FK -> entity table.id |
| field_name | TEXT | 'name', 'description', 'title', 'text', 'content', 'repeat_label' |
| language_code | TEXT | e.g. 'en', 'fr', 'es' |
| text | TEXT | Translated text, nullable |
| is_auto | INTEGER | Boolean (0/1), auto-translated flag |

### branding

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| primary_color | TEXT | Hex color, nullable |
| secondary_color | TEXT | Hex color, nullable |
| default_theme | TEXT | 'light' or 'dark', nullable |

## Relationships Overview

```
instructions (1)
  |-- assemblies (N)
  |-- steps (N)
  |     |-- substeps (N)
  |           |-- substep_images (N) --> video_frame_areas
  |           |-- substep_video_sections (N) --> video_sections
  |           |-- substep_part_tools (N) --> part_tools
  |           |-- substep_notes (N) --> notes
  |           |-- substep_descriptions (N)
  |           |-- substep_tutorials (N)
  |           |-- drawings (N)
  |-- videos (N)
  |     |-- video_sections (N)
  |     |     |-- viewport_keyframes (N)
  |     |-- video_frame_areas (N)
  |-- part_tools (N)
  |     |-- part_tool_video_frame_areas (N) --> video_frame_areas
  |-- notes (N)
  |-- translations (N, polymorphic via entity_type/entity_id)
  |-- branding (N)
  |-- safety_icons (N)
```

## Delete Order (for FK safety)

Leaf/junction first, parents last:

1. substep_tutorials, substep_notes, substep_part_tools, substep_images, substep_video_sections, substep_descriptions
2. part_tool_video_frame_areas, viewport_keyframes, translations, drawings, branding
3. video_frame_areas, video_sections, notes, part_tools
4. videos, substeps, steps, assemblies

## Notes

- All PKs are TEXT UUIDs (not autoincrement)
- Coordinates (x, y, width, height) in video_frame_areas and drawings are normalized 0-1
- The DB is schema-less in the sense that older DBs may be missing newer tables/columns — code handles this gracefully
- Each project is a folder under `Documents/Montavis/{folderName}/` containing `montavis.db` + `media/` directory
