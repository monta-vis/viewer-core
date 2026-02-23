import { app } from "electron";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

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
  if (relativePath.startsWith("absolute:")) {
    const absPath = relativePath.slice("absolute:".length);
    const ext = path.extname(absPath).toLowerCase();
    if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) return null;
    if (!fs.existsSync(absPath)) return null;
    const stat = fs.lstatSync(absPath);
    if (!stat.isFile()) return null;
    return absPath;
  }

  const filePath = path.join(getProjectsBasePath(), folderName, relativePath);
  if (!isInsideBasePath(filePath)) return null;
  if (!fs.existsSync(filePath)) return null;

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
  substepReferences: Record<string, unknown>[];
  safetyIcons: Record<string, unknown>[];
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
  substep_references: "substepReferences",
  safety_icons: "safetyIcons",
};

// ---------------------------------------------------------------------------
// Get full project data (read-only)
// ---------------------------------------------------------------------------

export function getProjectData(folderName: string): ElectronProjectData {
  const basePath = getProjectsBasePath();
  const dbPath = path.join(basePath, folderName, "montavis.db");

  if (!isInsideBasePath(dbPath) || !fs.existsSync(dbPath)) {
    throw new Error(`Project not found: ${folderName}`);
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
      substepReferences: [],
      safetyIcons: [],
    };

    for (const [tableName, key] of Object.entries(ALLOWED_TABLES)) {
      try {
        const rows = db
          .prepare(`SELECT * FROM ${tableName}`)
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

      // Fallback: check for processed frame file on disk
      if (coverImageAreaId && !coverImagePath) {
        const framePath = path.join(
          basePath,
          entry.name,
          "media",
          "frames",
          coverImageAreaId,
          "image.jpg",
        );
        if (fs.existsSync(framePath)) {
          coverImagePath = framePath;
        }
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
      });
    } catch {
      // Skip unreadable projects
    } finally {
      db.close();
    }
  }

  return projects;
}
