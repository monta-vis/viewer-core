import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import extractZip from "extract-zip";
import { getProjectsBasePath, isInsideBasePath } from "./projects.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstructionMeta {
  id: string;
  name: string;
  revision: number;
}

export interface ImportResult {
  success: boolean;
  folderName?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read instruction id, name, and revision from a montavis.db file.
 */
export function readInstructionMeta(dbPath: string): InstructionMeta | null {
  if (!fs.existsSync(dbPath)) return null;

  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare("SELECT id, name, revision FROM instructions LIMIT 1")
      .get() as { id: string; name: string; revision: number } | undefined;
    return row ?? null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/**
 * Find an existing project folder that contains the same instruction ID.
 * Returns the folder name if found, null otherwise.
 */
export function findExistingProject(
  basePath: string,
  instructionId: string,
): string | null {
  if (!fs.existsSync(basePath)) return null;

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dbPath = path.join(basePath, entry.name, "montavis.db");
    const meta = readInstructionMeta(dbPath);
    if (meta && meta.id === instructionId) {
      return entry.name;
    }
  }
  return null;
}

/**
 * Generate a unique folder name by appending -1, -2, etc. if the name
 * already exists.
 */
export function deduplicateFolderName(
  basePath: string,
  name: string,
): string {
  const sanitized = name.replace(/[<>:"/\\|?*]/g, "_").trim();
  let candidate = sanitized;
  let counter = 1;

  while (fs.existsSync(path.join(basePath, candidate))) {
    candidate = `${sanitized}-${counter}`;
    counter++;
  }

  return candidate;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

/**
 * Import a .mvis file (zip archive) into Documents/Montavis/.
 *
 * Steps:
 * 1. Extract zip to a temporary directory
 * 2. Read instruction metadata from the extracted DB
 * 3. Check if a project with the same instruction ID already exists
 *    - If yes, return the existing folder (skip re-import)
 * 4. Move the extracted folder to Documents/Montavis/{name}
 * 5. Return the folder name for navigation
 */
export async function importMvisFromPath(
  zipPath: string,
): Promise<ImportResult> {
  const basePath = getProjectsBasePath();

  // Ensure base directory exists
  fs.mkdirSync(basePath, { recursive: true });

  // Extract to a temporary directory first
  const tempDir = path.join(basePath, `.mvis-import-${Date.now()}`);

  try {
    // Extract the zip
    await extractZip(zipPath, { dir: tempDir });

    // Find montavis.db — it may be at root or inside a single subfolder
    let dbPath = path.join(tempDir, "montavis.db");
    let contentDir = tempDir;

    if (!fs.existsSync(dbPath)) {
      // Check if there's a single subfolder containing the DB
      const entries = fs.readdirSync(tempDir, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory());
      if (dirs.length === 1) {
        const subDir = path.join(tempDir, dirs[0].name);
        const subDbPath = path.join(subDir, "montavis.db");
        if (fs.existsSync(subDbPath)) {
          dbPath = subDbPath;
          contentDir = subDir;
        }
      }
    }

    if (!fs.existsSync(dbPath)) {
      return { success: false, error: "No montavis.db found in .mvis file" };
    }

    // Read metadata
    const meta = readInstructionMeta(dbPath);
    if (!meta) {
      return {
        success: false,
        error: "Could not read instruction metadata from database",
      };
    }

    // Check for existing project with same instruction ID
    const existing = findExistingProject(basePath, meta.id);
    if (existing) {
      // Already imported — just navigate to it
      return { success: true, folderName: existing };
    }

    // Determine folder name
    const folderName = deduplicateFolderName(basePath, meta.name);
    const destDir = path.join(basePath, folderName);

    if (!isInsideBasePath(destDir)) {
      return { success: false, error: "Invalid project name" };
    }

    // Move content to final location
    fs.renameSync(contentDir, destDir);

    // Clean up temp dir if content was in a subfolder
    if (contentDir !== tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return { success: true, folderName };
  } catch (err) {
    // Clean up temp dir on failure
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
