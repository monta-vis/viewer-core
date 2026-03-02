import type Database from "better-sqlite3";
import type { RowWithId } from "./helpers.js";
import { keyById, groupIds } from "./helpers.js";

// ---------------------------------------------------------------------------
// Row types for generateDataJson
// ---------------------------------------------------------------------------

interface InstructionRow {
  id: string;
  name: string;
  description: string | null;
  revision: number;
  cover_image_area_id: string | null;
  article_number: string | null;
  estimated_duration: number | null;
  source_language: string;
  use_blurred: number;
  created_at: string;
  updated_at: string;
}

interface TranslationRow {
  entity_type: string;
  entity_id: string;
  field_name: string;
  language_code: string;
  text: string | null;
  is_auto: number;
}

// ---------------------------------------------------------------------------
// Row data input for buildSnapshotFromRows (pure, testable)
// ---------------------------------------------------------------------------

export interface SnapshotRowData {
  instruction: InstructionRow;
  steps: RowWithId[];
  substeps: RowWithId[];
  videos: RowWithId[];
  videoSections: RowWithId[];
  videoFrameAreas: RowWithId[];
  viewportKeyframes: RowWithId[];
  notes: RowWithId[];
  partTools: RowWithId[];
  substepDescriptions: RowWithId[];
  substepNotes: RowWithId[];
  substepPartTools: RowWithId[];
  substepImages: RowWithId[];
  substepVideoSections: RowWithId[];
  substepReferences: RowWithId[];
  drawings: RowWithId[];
  partToolVideoFrameAreas: RowWithId[];
  branding: RowWithId[];
  assemblies: RowWithId[];
  translations: TranslationRow[];
  languages: string[];
}

/**
 * Pure function: build snapshot object from raw row data.
 * No DB dependency — fully testable.
 */
export function buildSnapshotFromRows(
  data: SnapshotRowData,
): Record<string, unknown> {
  const { instruction } = data;
  const useBlurred = !!instruction.use_blurred;

  // Group relations
  const substepsByStep = groupIds(data.substeps, "step_id");
  const imagesBySubstep = groupIds(data.substepImages, "substep_id");
  const vsBySubstep = groupIds(data.substepVideoSections, "substep_id");
  const ptBySubstep = groupIds(data.substepPartTools, "substep_id");
  const notesBySubstep = groupIds(data.substepNotes, "substep_id");
  const descsBySubstep = groupIds(data.substepDescriptions, "substep_id");
  const refsBySubstep = groupIds(data.substepReferences, "substep_id");
  const kfByVideo = groupIds(data.viewportKeyframes, "video_id");

  // Build steps
  const steps: Record<string, unknown> = {};
  for (const r of data.steps) {
    steps[r.id] = {
      id: r.id,
      instruction_id: r.instruction_id,
      assembly_id: r.assembly_id ?? null,
      step_number: r.step_number,
      title: r.title,
      repeat_count: r.repeat_count ?? 1,
      repeat_label: r.repeat_label ?? null,
      substep_ids: substepsByStep[r.id] || [],
    };
  }

  // Build substeps
  const substeps: Record<string, unknown> = {};
  for (const r of data.substeps) {
    substeps[r.id] = {
      id: r.id,
      step_id: r.step_id,
      step_order: r.step_order,
      title: r.title,
      display_mode: r.display_mode ?? "normal",
      repeat_count: r.repeat_count ?? 1,
      repeat_label: r.repeat_label ?? null,
      image_row_ids: imagesBySubstep[r.id] || [],
      video_section_row_ids: vsBySubstep[r.id] || [],
      part_tool_row_ids: ptBySubstep[r.id] || [],
      note_row_ids: notesBySubstep[r.id] || [],
      description_row_ids: descsBySubstep[r.id] || [],
      reference_row_ids: refsBySubstep[r.id] || [],
    };
  }

  // Build videos
  const videos: Record<string, unknown> = {};
  for (const r of data.videos) {
    videos[r.id] = {
      id: r.id,
      fps: r.fps,
      order: r.order,
      viewport_keyframe_ids: kfByVideo[r.id] || [],
      video_path: r.video_path,
    };
  }

  // Build video sections with relative URLs (blurred when applicable)
  const videoSections: Record<string, unknown> = {};
  for (const r of data.videoSections) {
    const videoFile =
      useBlurred && r.has_blurred_version ? "video_blurred.mp4" : "video.mp4";
    videoSections[r.id] = {
      id: r.id,
      video_id: r.video_id,
      start_frame: r.start_frame,
      end_frame: r.end_frame,
      content_aspect_ratio: r.content_aspect_ratio ?? null,
      url_1080p: `./media/sections/${r.id}/${videoFile}`,
      url_720p: `./media/sections/${r.id}/${videoFile}`,
      url_480p: `./media/sections/${r.id}/${videoFile}`,
    };
  }

  // Build video frame areas with relative URLs (blurred when applicable)
  const videoFrameAreas: Record<string, unknown> = {};
  for (const r of data.videoFrameAreas) {
    const imageFile =
      r.image_ext && r.image_ext !== ".jpg"
        ? `image${r.image_ext}`
        : useBlurred && r.has_blurred_version
          ? "image_blurred.jpg"
          : "image.jpg";
    videoFrameAreas[r.id] = {
      id: r.id,
      video_id: r.video_id,
      frame_number: r.frame_number,
      type: r.type,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      url_1080p: `./media/frames/${r.id}/${imageFile}`,
      url_720p: `./media/frames/${r.id}/${imageFile}`,
      url_480p: `./media/frames/${r.id}/${imageFile}`,
    };
  }

  // Build translations
  const translationsMap: Record<
    string,
    Record<string, Record<string, Record<string, unknown>>>
  > = {
    instruction: {},
    steps: {},
    substeps: {},
    notes: {},
    partTools: {},
    substepDescriptions: {},
    drawings: {},
  };

  const entityTypeToKey: Record<string, string> = {
    instruction: "instruction",
    step: "steps",
    substep: "substeps",
    note: "notes",
    part_tool: "partTools",
    substep_description: "substepDescriptions",
    drawing: "drawings",
  };

  for (const t of data.translations) {
    const key = entityTypeToKey[t.entity_type];
    if (!key) continue;
    if (!translationsMap[key][t.entity_id])
      translationsMap[key][t.entity_id] = {};
    if (!translationsMap[key][t.entity_id][t.language_code]) {
      translationsMap[key][t.entity_id][t.language_code] = { is_auto: true };
    }
    const entry = translationsMap[key][t.entity_id][t.language_code];
    entry[t.field_name] = t.text;
    if (!t.is_auto) entry.is_auto = false;
  }

  return {
    meta: {
      instruction_id: instruction.id,
      revision: instruction.revision,
      generated_at: instruction.updated_at,
      languages: data.languages,
      cdn_base_url: "./media",
    },
    instruction: {
      id: instruction.id,
      name: instruction.name,
      description: instruction.description,
      article_number: instruction.article_number,
      cover_image_area_id: instruction.cover_image_area_id,
      estimated_duration: instruction.estimated_duration,
      source_language: instruction.source_language,
      use_blurred: instruction.use_blurred,
    },
    translations: translationsMap,
    steps,
    substeps,
    videos,
    videoSections,
    videoFrameAreas,
    viewportKeyframes: keyById(data.viewportKeyframes),
    drawings: keyById(data.drawings),
    notes: keyById(data.notes),
    partTools: keyById(data.partTools),
    substepImages: keyById(data.substepImages),
    substepVideoSections: keyById(data.substepVideoSections),
    substepPartTools: keyById(data.substepPartTools),
    substepNotes: keyById(data.substepNotes),
    substepDescriptions: keyById(data.substepDescriptions),
    substepReferences: keyById(data.substepReferences),
    partToolVideoFrameAreas: keyById(data.partToolVideoFrameAreas),
    assemblies: keyById(data.assemblies),
    branding: data.branding,
  };
}

// ---------------------------------------------------------------------------
// generateDataJson — reads DB and builds full JSON string
// ---------------------------------------------------------------------------

/** Callback to find an actual image file in a directory by base name. */
export type FindImageInDir = (dir: string, baseName: string) => string | null;

/**
 * Read a project's SQLite DB and generate the data.json content
 * with relative media URLs (./media/...) for mweb export.
 *
 * @param dbPath - Path to the project's montavis.db
 * @param DatabaseConstructor - better-sqlite3 constructor (injected to avoid bundling native module)
 * @param projectDir - Optional project directory for filesystem fallback patches
 * @param findImageInDir - Optional callback to find images by base name (avoids coupling to app-specific code)
 */
export async function generateDataJson(
  dbPath: string,
  DatabaseConstructor: typeof Database,
  projectDir?: string,
  findImageInDir?: FindImageInDir,
): Promise<string> {
  const db = new DatabaseConstructor(dbPath, { readonly: true });

  const ALLOWED_TABLES = new Set([
    "instructions",
    "assemblies",
    "steps",
    "substeps",
    "videos",
    "video_sections",
    "video_frame_areas",
    "viewport_keyframes",
    "notes",
    "part_tools",
    "substep_descriptions",
    "substep_notes",
    "substep_part_tools",
    "substep_images",
    "substep_video_sections",
    "substep_references",
    "drawings",
    "part_tool_video_frame_areas",
    "branding",
    "translations",
  ]);

  const all = (table: string): RowWithId[] => {
    if (!ALLOWED_TABLES.has(table)) throw new Error(`Disallowed table: ${table}`);
    return db.prepare(`SELECT * FROM ${table}`).all() as RowWithId[];
  };

  const safeAll = (table: string): RowWithId[] => {
    try {
      return all(table);
    } catch {
      return [];
    }
  };

  const instruction = db
    .prepare(
      "SELECT id, name, description, revision, cover_image_area_id, article_number, estimated_duration, source_language, use_blurred, created_at, updated_at FROM instructions LIMIT 1",
    )
    .get() as InstructionRow | undefined;

  if (!instruction) {
    db.close();
    throw new Error("No instruction found in database");
  }

  let translationRows: TranslationRow[] = [];
  let languages: string[] = [];
  try {
    translationRows = db
      .prepare(
        "SELECT entity_type, entity_id, field_name, language_code, text, is_auto FROM translations",
      )
      .all() as TranslationRow[];
    languages = (
      db
        .prepare("SELECT DISTINCT language_code FROM translations")
        .all() as { language_code: string }[]
    ).map((r) => r.language_code);
  } catch {
    /* table may not exist in older DBs */
  }

  const rowData: SnapshotRowData = {
    instruction,
    steps: all("steps"),
    substeps: all("substeps"),
    videos: all("videos"),
    videoSections: all("video_sections"),
    videoFrameAreas: all("video_frame_areas"),
    viewportKeyframes: all("viewport_keyframes"),
    notes: all("notes"),
    partTools: all("part_tools"),
    substepDescriptions: all("substep_descriptions"),
    substepNotes: all("substep_notes"),
    substepPartTools: all("substep_part_tools"),
    substepImages: all("substep_images"),
    substepVideoSections: all("substep_video_sections"),
    substepReferences: safeAll("substep_references"),
    assemblies: safeAll("assemblies"),
    drawings: safeAll("drawings"),
    partToolVideoFrameAreas: safeAll("part_tool_video_frame_areas"),
    branding: safeAll("branding"),
    translations: translationRows,
    languages,
  };

  db.close();

  // Filesystem fallback: patch has_blurred_version for projects blurred before the DB flag fix
  if (projectDir) {
    const { default: path } = await import("path");
    const { promises: fsp } = await import("fs");
    const CONCURRENCY = 20;
    const pending: Array<{ row: RowWithId; filePath: string }> = [];

    for (const row of rowData.videoSections) {
      if (!row.has_blurred_version) {
        pending.push({
          row,
          filePath: path.join(
            projectDir,
            "media",
            "sections",
            row.id,
            "video_blurred.mp4",
          ),
        });
      }
    }
    for (const row of rowData.videoFrameAreas) {
      if (!row.has_blurred_version) {
        pending.push({
          row,
          filePath: path.join(
            projectDir,
            "media",
            "frames",
            row.id,
            "image_blurred.jpg",
          ),
        });
      }
    }

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(({ row, filePath }) =>
          fsp
            .access(filePath)
            .then(() => {
              row.has_blurred_version = 1;
            })
            .catch(() => {}),
        ),
      );
    }
  }

  // Detect actual image extension for catalog-icon VFAs (.png, .svg)
  if (projectDir && findImageInDir) {
    const { default: path } = await import("path");
    for (const row of rowData.videoFrameAreas) {
      if (row.type !== "SafetyIcon" && row.type !== "PartToolScan") continue;
      const frameDir = path.join(projectDir, "media", "frames", row.id);
      const found = findImageInDir(frameDir, "image");
      if (found) row.image_ext = path.extname(found);
    }
  }

  return JSON.stringify(buildSnapshotFromRows(rowData), null, 2);
}
