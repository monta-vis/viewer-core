import { app } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Database from "better-sqlite3";

/** Image extensions to search for, in priority order. */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];

/** Find an image file in a directory by base name, regardless of extension. */
function findImageInDir(dir: string, baseName: string): string | null {
  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = path.join(dir, baseName + ext);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  article_number: string | null;
  estimated_duration: number | null;
  revision: number;
  cover_image_area_id: string | null;
  source_language: string;
  coverImagePath: string | null;
  folderName: string;
  created_at: string;
  updated_at: string;
  languages: string[];
  translationData: { language_code: string; name?: string; description?: string }[];
}

// ---------------------------------------------------------------------------
// Paths & security
// ---------------------------------------------------------------------------

const ALLOWED_MEDIA_EXTENSIONS = new Set([
  ".mp4", ".mov", ".avi", ".mkv", ".webm",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff",
]);

export function getProjectsBasePath(): string {
  return path.join(app.getPath("documents"), "Montavis");
}

/** Verify that a resolved path stays within the Montavis directory tree (projects + catalogs). */
function isInsideMontavisPath(filePath: string): boolean {
  const normalize =
    process.platform === "win32"
      ? (p: string) => path.resolve(p).toLowerCase()
      : (p: string) => path.resolve(p);
  const resolved = normalize(filePath);
  const montavisBase = normalize(
    path.join(app.getPath("documents"), "Montavis"),
  );
  return resolved.startsWith(montavisBase + path.sep) || resolved === montavisBase;
}

/** Verify that a resolved path stays within the Montavis base directory. */
export function isInsideBasePath(filePath: string): boolean {
  const normalize =
    process.platform === "win32"
      ? (p: string) => path.resolve(p).toLowerCase()
      : (p: string) => path.resolve(p);
  const resolved = normalize(filePath);
  const base = normalize(getProjectsBasePath());
  return resolved.startsWith(base + path.sep) || resolved === base;
}

/**
 * Resolve a mvis-media:// URL to an absolute file path.
 * Returns null if the path is invalid or outside the base directory.
 */
export function resolveMediaPath(
  folderName: string,
  relativePath: string,
): string | null {
  // Handle absolute paths (prefixed with "absolute:")
  // Restricted to the Montavis directory tree for security.
  if (relativePath.startsWith("absolute:")) {
    const absPath = relativePath.slice("absolute:".length);
    if (!isInsideMontavisPath(absPath)) return null;
    const ext = path.extname(absPath).toLowerCase();
    if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) return null;
    if (!fs.existsSync(absPath)) return null;
    const stat = fs.lstatSync(absPath);
    if (!stat.isFile()) return null;
    return absPath;
  }

  const filePath = path.join(getProjectsBasePath(), folderName, relativePath);
  if (!isInsideBasePath(filePath)) return null;

  if (!fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);
    // Extensionless path (e.g. "media/frames/{id}/image") — find any image
    if (!ext) {
      const base = path.basename(filePath);
      const found = findImageInDir(dir, base);
      if (found && isInsideBasePath(found)) return found;
    }
    // Image extension present but wrong (e.g. requested .jpg but file is .png)
    if (IMAGE_EXTENSIONS.includes(ext)) {
      const base = path.basename(filePath, ext);
      const found = findImageInDir(dir, base);
      if (found && isInsideBasePath(found)) return found;
    }
    return null;
  }

  return filePath;
}

// ---------------------------------------------------------------------------
// Project data types
// ---------------------------------------------------------------------------

export interface ElectronProjectData {
  instruction: Record<string, unknown> & { folderName: string };
  assemblies: Record<string, unknown>[];
  steps: Record<string, unknown>[];
  substeps: Record<string, unknown>[];
  videos: Record<string, unknown>[];
  videoSections: Record<string, unknown>[];
  videoFrameAreas: Record<string, unknown>[];
  viewportKeyframes: Record<string, unknown>[];
  drawings: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  partTools: Record<string, unknown>[];
  substepDescriptions: Record<string, unknown>[];
  substepNotes: Record<string, unknown>[];
  substepPartTools: Record<string, unknown>[];
  substepImages: Record<string, unknown>[];
  substepVideoSections: Record<string, unknown>[];
  partToolVideoFrameAreas: Record<string, unknown>[];
  branding: Record<string, unknown>[];
  images: Record<string, unknown>[];
  substepTutorials: Record<string, unknown>[];
  safetyIcons: Record<string, unknown>[];
  translations: Record<string, unknown>[];
}

/** Whitelist of tables to read from the project database. */
const ALLOWED_TABLES: Record<string, keyof ElectronProjectData> = {
  assemblies: "assemblies",
  steps: "steps",
  substeps: "substeps",
  videos: "videos",
  video_sections: "videoSections",
  video_frame_areas: "videoFrameAreas",
  viewport_keyframes: "viewportKeyframes",
  drawings: "drawings",
  notes: "notes",
  part_tools: "partTools",
  substep_descriptions: "substepDescriptions",
  substep_notes: "substepNotes",
  substep_part_tools: "substepPartTools",
  substep_images: "substepImages",
  substep_video_sections: "substepVideoSections",
  part_tool_video_frame_areas: "partToolVideoFrameAreas",
  branding: "branding",
  images: "images",
  substep_tutorials: "substepTutorials",
  safety_icons: "safetyIcons",
  translations: "translations",
};

// ---------------------------------------------------------------------------
// Save types & constants
// ---------------------------------------------------------------------------

/** Generic changes format — matches getChangedData() output from the Zustand store. */
export interface ProjectChanges {
  changed: Record<string, Record<string, unknown>[]>;
  deleted: Record<string, string[]>;
}

/** Whitelist of tables that may be written to via the generic save path. */
const SAVE_ALLOWED_TABLES = new Set([
  "assemblies", "steps", "substeps", "videos", "video_sections",
  "video_frame_areas", "viewport_keyframes", "drawings", "notes",
  "part_tools", "substep_descriptions", "substep_notes", "substep_part_tools",
  "substep_images", "substep_video_sections", "part_tool_video_frame_areas",
  "branding", "translations", "substep_tutorials",
]);

/** Delete order: child/junction tables first, then parents (FK-safe). */
const DELETE_ORDER: string[] = [
  // Leaf / junction tables
  "substep_tutorials", "substep_notes", "substep_part_tools",
  "substep_images", "substep_video_sections", "substep_descriptions",
  "part_tool_video_frame_areas", "viewport_keyframes", "translations",
  "drawings", "branding",
  // Mid-level
  "video_frame_areas", "video_sections", "notes", "part_tools",
  // Parent tables
  "videos", "substeps", "steps", "assemblies",
];

// ---------------------------------------------------------------------------
// Get full project data (read-only)
// ---------------------------------------------------------------------------

export function getProjectData(folderName: string): ElectronProjectData {
  const basePath = getProjectsBasePath();
  const dbPath = path.join(basePath, folderName, "montavis.db");

  if (!isInsideBasePath(dbPath) || !fs.existsSync(dbPath)) {
    throw new Error(`Project not found: ${folderName}`);
  }

  // Migrate old table name: substep_references → substep_tutorials (once)
  {
    const migrationDb = new Database(dbPath);
    try {
      const hasOldTable = migrationDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='substep_references'").get();
      const hasNewTable = migrationDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='substep_tutorials'").get();
      if (hasOldTable && !hasNewTable) {
        migrationDb.exec("ALTER TABLE substep_references RENAME TO substep_tutorials");
      }
    } finally {
      migrationDb.close();
    }
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    // Read instruction (single row)
    const instruction = db
      .prepare("SELECT * FROM instructions LIMIT 1")
      .get() as Record<string, unknown> | undefined;

    if (!instruction) {
      throw new Error(`No instruction found in project: ${folderName}`);
    }

    // Attach folderName for media URL resolution
    (instruction as Record<string, unknown>).folderName = folderName;

    // Read all allowed tables
    const result: ElectronProjectData = {
      instruction: instruction as ElectronProjectData["instruction"],
      assemblies: [],
      steps: [],
      substeps: [],
      videos: [],
      videoSections: [],
      videoFrameAreas: [],
      viewportKeyframes: [],
      drawings: [],
      notes: [],
      partTools: [],
      substepDescriptions: [],
      substepNotes: [],
      substepPartTools: [],
      substepImages: [],
      substepVideoSections: [],
      partToolVideoFrameAreas: [],
      branding: [],
      images: [],
      substepTutorials: [],
      safetyIcons: [],
      translations: [],
    };

    for (const [tableName, key] of Object.entries(ALLOWED_TABLES)) {
      try {
        const rows = db
          .prepare(`SELECT * FROM "${tableName}"`)
          .all() as Record<string, unknown>[];
        result[key] = rows;
      } catch {
        // Table may not exist in older DBs — skip
      }
    }

    return result;
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Project listing (read-only)
// ---------------------------------------------------------------------------

export function listProjects(): ProjectListItem[] {
  const basePath = getProjectsBasePath();

  if (!fs.existsSync(basePath)) return [];

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  const projects: ProjectListItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dbPath = path.join(basePath, entry.name, "montavis.db");
    if (!fs.existsSync(dbPath)) continue;

    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db
        .prepare("SELECT * FROM instructions LIMIT 1")
        .get() as Record<string, unknown> | undefined;
      if (!row) continue;

      // Resolve cover image path
      let coverImagePath: string | null = null;
      const coverImageAreaId =
        (row.cover_image_area_id as string | null) ?? null;
      try {
        if (coverImageAreaId) {
          const coverRow = db
            .prepare(
              `SELECT img.original_path AS cover_image_path
               FROM video_frame_areas vfa
               LEFT JOIN images img ON img.id = vfa.image_id
               WHERE vfa.id = ?`,
            )
            .get(coverImageAreaId) as
            | { cover_image_path: string | null }
            | undefined;
          coverImagePath = coverRow?.cover_image_path ?? null;
        }
      } catch {
        // DB not migrated — skip cover image
      }

      // Fallback: check for processed frame file on disk (any image extension)
      if (coverImageAreaId && !coverImagePath) {
        const coverImg = findImageInDir(
          path.join(basePath, entry.name, "media", "frames", coverImageAreaId),
          "image",
        );
        if (coverImg) {
          coverImagePath = coverImg;
        }
      }

      // Query available translation languages + instruction-level translations
      let languages: string[] = [];
      let translationData: { language_code: string; name?: string; description?: string }[] = [];
      try {
        const langRows = db
          .prepare("SELECT DISTINCT language_code FROM translations")
          .all() as { language_code: string }[];
        languages = langRows.map((r) => r.language_code);

        if (languages.length > 0) {
          const tRows = db
            .prepare(
              `SELECT language_code, field_name, text FROM translations
               WHERE entity_type = 'instruction' AND entity_id = ?`,
            )
            .all(row.id as string) as { language_code: string; field_name: string; text: string | null }[];

          const langMap = new Map<string, { language_code: string; name?: string; description?: string }>();
          for (const tr of tRows) {
            let entry = langMap.get(tr.language_code);
            if (!entry) {
              entry = { language_code: tr.language_code };
              langMap.set(tr.language_code, entry);
            }
            if (tr.field_name === "name") entry.name = tr.text ?? undefined;
            if (tr.field_name === "description") entry.description = tr.text ?? undefined;
          }
          translationData = Array.from(langMap.values());
        }
      } catch {
        // translations table may not exist in older DBs
      }

      projects.push({
        id: row.id as string,
        name: row.name as string,
        description: (row.description as string | null) ?? null,
        article_number: (row.article_number as string | null) ?? null,
        estimated_duration: (row.estimated_duration as number | null) ?? null,
        revision: (row.revision as number) ?? 1,
        cover_image_area_id: coverImageAreaId,
        source_language: (row.source_language as string | null) ?? "de",
        coverImagePath,
        folderName: entry.name,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        languages,
        translationData,
      });
    } catch {
      // Skip unreadable projects
    } finally {
      db.close();
    }
  }

  return projects;
}

// ---------------------------------------------------------------------------
// Save project data (read-write)
// ---------------------------------------------------------------------------

/**
 * Save changes to a project's SQLite database.
 * Accepts the format from getChangedData() — arrays of snake_case row objects
 * keyed by table name, plus deleted IDs keyed as `{table}_ids`.
 */
export function saveProjectData(
  folderName: string,
  changes: ProjectChanges,
): { success: boolean; error?: string } {
  const basePath = getProjectsBasePath();
  const dbPath = path.join(basePath, folderName, "montavis.db");

  if (!isInsideBasePath(dbPath)) {
    return { success: false, error: "Invalid folder name" };
  }
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: `Project DB not found: ${folderName}` };
  }

  try {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    db.exec("BEGIN TRANSACTION");

    try {
      // Cache column + primary key info per table
      const tableInfoCache: Record<string, { columns: Set<string>; pkColumns: string[] }> = {};
      function getTableInfo(table: string) {
        if (!tableInfoCache[table]) {
          const info = db.pragma(`table_info("${table}")`) as Array<{ name: string; pk: number }>;
          tableInfoCache[table] = {
            columns: new Set(info.map((c) => c.name)),
            pkColumns: info.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name),
          };
        }
        return tableInfoCache[table];
      }

      // ── UPSERT changed rows ──
      for (const [key, rows] of Object.entries(changes.changed)) {
        const targetTable = key === "instruction" ? "instructions" : key;
        if (!SAVE_ALLOWED_TABLES.has(key) && key !== "instruction") continue;

        const { columns: tableColumns, pkColumns } = getTableInfo(targetTable);
        if (tableColumns.size === 0) continue;

        for (const row of rows) {
          const cols = Object.keys(row).filter((k) => tableColumns.has(k));
          if (cols.length === 0) continue;

          const quotedCols = cols.map((c) => `"${c}"`);
          const placeholders = cols.map(() => "?");
          const pkSet = new Set(pkColumns);
          const updateSet = cols
            .filter((c) => !pkSet.has(c))
            .map((c) => `"${c}" = excluded."${c}"`);

          const conflictTarget = pkColumns.map((c) => `"${c}"`).join(", ");
          const sql =
            updateSet.length > 0 && pkColumns.length > 0
              ? `INSERT INTO "${targetTable}" (${quotedCols.join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updateSet.join(", ")}`
              : `INSERT OR IGNORE INTO "${targetTable}" (${quotedCols.join(", ")}) VALUES (${placeholders.join(", ")})`;

          const values = cols.map((c) => {
            const val = row[c];
            if (typeof val === "boolean") return val ? 1 : 0;
            return val ?? null;
          });

          db.prepare(sql).run(...values);
        }

        // Update updated_at for instructions
        if (key === "instruction") {
          db.prepare("UPDATE instructions SET updated_at = datetime('now')").run();
        }
      }

      // ── DELETE rows ──
      // Keys are formatted as `{table_name}_ids`
      const deletedEntries = Object.entries(changes.deleted);
      // Sort by DELETE_ORDER so FK constraints aren't violated
      deletedEntries.sort((a, b) => {
        const tA = a[0].replace(/_ids$/, "");
        const tB = b[0].replace(/_ids$/, "");
        const iA = DELETE_ORDER.indexOf(tA);
        const iB = DELETE_ORDER.indexOf(tB);
        return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
      });

      for (const [key, ids] of deletedEntries) {
        const table = key.replace(/_ids$/, "");
        if (!SAVE_ALLOWED_TABLES.has(table)) continue;

        const deleteStmt = db.prepare(`DELETE FROM "${table}" WHERE "id" = ?`);
        // Also clean up associated translations
        const deleteTranslationsStmt = db.prepare(
          "DELETE FROM translations WHERE entity_id = ?",
        );

        for (const id of ids) {
          deleteStmt.run(id);
          try {
            deleteTranslationsStmt.run(id);
          } catch {
            // translations table may not exist — skip
          }
        }
      }

      db.exec("COMMIT");
      db.close();
      return { success: true };
    } catch (txErr) {
      db.exec("ROLLBACK");
      db.close();
      throw txErr;
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Upload part tool image
// ---------------------------------------------------------------------------

/**
 * Copy an image to the project's media folder and create the necessary DB rows.
 * Returns the new video_frame_area ID on success.
 */
export function uploadPartToolImage(
  folderName: string,
  partToolId: string,
  sourceImagePath: string,
  crop?: { x: number; y: number; width: number; height: number },
): { success: boolean; vfaId?: string; junctionId?: string; isPreview?: boolean; error?: string } {
  const basePath = getProjectsBasePath();
  const dbPath = path.join(basePath, folderName, "montavis.db");

  if (!isInsideBasePath(dbPath) || !fs.existsSync(dbPath)) {
    return { success: false, error: "Project not found" };
  }

  // Resolve and validate source path to prevent arbitrary file reads
  const resolvedSource = path.resolve(sourceImagePath);
  if (!fs.existsSync(resolvedSource)) {
    return { success: false, error: "Source image not found" };
  }

  // Only allow image extensions (no videos or other media)
  const ext = path.extname(resolvedSource).toLowerCase();
  const ALLOWED_IMAGE_EXTENSIONS = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff",
  ]);
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return { success: false, error: "Unsupported file type" };
  }

  // Verify the file is within a user-accessible directory (not system paths)
  const userHome = app.getPath("home");
  const normalizeForCheck =
    process.platform === "win32"
      ? (p: string) => path.resolve(p).toLowerCase()
      : (p: string) => path.resolve(p);
  if (!normalizeForCheck(resolvedSource).startsWith(normalizeForCheck(userHome))) {
    return { success: false, error: "Source path is outside user directory" };
  }

  const vfaId = crypto.randomUUID();
  const destDir = path.join(basePath, folderName, "media", "frames", vfaId);
  const destFile = path.join(destDir, `image${ext}`);

  try {
    // Copy image to media folder
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(resolvedSource, destFile);

    // Create DB rows
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    db.exec("BEGIN TRANSACTION");

    try {
      const now = new Date().toISOString();

      // Insert video_frame_areas row with crop coordinates
      const cx = crop?.x ?? 0;
      const cy = crop?.y ?? 0;
      const cw = crop?.width ?? 1;
      const ch = crop?.height ?? 1;
      db.prepare(
        `INSERT INTO video_frame_areas (id, x, y, width, height, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(vfaId, cx, cy, cw, ch, now, now);

      // Insert junction row
      const junctionId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO part_tool_video_frame_areas (id, part_tool_id, video_frame_area_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(junctionId, partToolId, vfaId, now, now);

      // Update part_tool preview_image_id
      db.prepare(
        `UPDATE part_tools SET preview_image_id = ? WHERE id = ?`,
      ).run(vfaId, partToolId);

      db.exec("COMMIT");
      db.close();
      return { success: true, vfaId, junctionId, isPreview: true };
    } catch (txErr) {
      db.exec("ROLLBACK");
      db.close();
      // Clean up copied file on failure
      try {
        fs.rmSync(destDir, { recursive: true });
      } catch { /* ignore cleanup errors */ }
      throw txErr;
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
