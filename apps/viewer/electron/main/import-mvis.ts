import path from "path";
import os from "os";
import fs from "fs";
import * as yauzl from "yauzl";
import Database from "better-sqlite3";
import extractZip from "extract-zip";
import log from "electron-log/main";
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
// Manifest: lightweight duplicate detection from .mvis zips
// ---------------------------------------------------------------------------

export interface MvisManifest {
  id: string;
  revision: number;
  updated_at: string;
}

/**
 * Read only the manifest.json entry from a .mvis zip without extracting everything.
 * Returns null if the zip has no manifest (old .mvis files) or on any error.
 */
export function readManifestFromZip(
  zipPath: string,
): Promise<MvisManifest | null> {
  return new Promise((resolve) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        resolve(null);
        return;
      }

      zipfile.on("error", () => {
        zipfile.close();
        resolve(null);
      });

      zipfile.on("entry", (entry: yauzl.Entry) => {
        if (entry.fileName.endsWith("/manifest.json")) {
          zipfile.openReadStream(entry, (streamErr, stream) => {
            if (streamErr || !stream) {
              zipfile.close();
              resolve(null);
              return;
            }
            const chunks: Buffer[] = [];
            stream.on("error", () => {
              zipfile.close();
              resolve(null);
            });
            stream.on("data", (chunk: Buffer) => chunks.push(chunk));
            stream.on("end", () => {
              zipfile.close();
              try {
                const json = JSON.parse(
                  Buffer.concat(chunks).toString("utf-8"),
                ) as Record<string, unknown>;
                if (
                  typeof json.id !== "string" ||
                  typeof json.revision !== "number" ||
                  !json.id
                ) {
                  resolve(null);
                  return;
                }
                resolve({
                  id: json.id,
                  revision: json.revision,
                  updated_at: typeof json.updated_at === "string" ? json.updated_at : "",
                });
              } catch {
                resolve(null);
              }
            });
          });
          return;
        }
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        resolve(null);
      });
      zipfile.readEntry();
    });
  });
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

interface ExistingProject {
  folderName: string;
  revision: number;
}

/**
 * Find an existing project folder that contains the same instruction ID.
 * Returns the folder name and revision if found, null otherwise.
 */
export function findExistingProject(
  basePath: string,
  instructionId: string,
): ExistingProject | null {
  if (!fs.existsSync(basePath)) return null;

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dbPath = path.join(basePath, entry.name, "montavis.db");
    const meta = readInstructionMeta(dbPath);
    if (meta && meta.id === instructionId) {
      return { folderName: entry.name, revision: meta.revision };
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
 * 1. Try to read manifest.json from zip (without extracting)
 * 2. If manifest found and existing project has same or newer revision → skip
 * 3. Extract zip to OS temp directory
 * 4. Read instruction metadata from extracted DB
 * 5. If no manifest was available, check for duplicates via DB metadata
 * 6. Move extracted folder to Documents/Montavis/{name}
 */
export async function importMvisFromPath(
  zipPath: string,
): Promise<ImportResult> {
  log.info('[importMvis] Starting import:', zipPath);
  const basePath = getProjectsBasePath();
  log.info('[importMvis] Projects base path:', basePath);

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  // Fast path: read manifest from zip without extracting
  const manifest = await readManifestFromZip(zipPath);
  log.info('[importMvis] Manifest from zip:', manifest ? JSON.stringify(manifest) : 'null');

  if (manifest) {
    const match = findExistingProject(basePath, manifest.id);
    if (match) {
      log.info('[importMvis] Existing project found:', JSON.stringify(match));
      if (manifest.revision <= match.revision) {
        // Existing project is same or newer — skip import entirely
        log.info('[importMvis] Skipping import — existing revision is same or newer');
        return { success: true, folderName: match.folderName };
      }
    }
  }

  // Extract to OS temp directory (avoids leftover folders in Documents/Montavis/)
  const tempDir = path.join(os.tmpdir(), `mvis-import-${Date.now()}`);
  log.info('[importMvis] Extracting to temp dir:', tempDir);

  try {
    await extractZip(zipPath, { dir: tempDir });
    log.info('[importMvis] Extraction complete');

    // Find montavis.db — it may be at root or inside a single subfolder
    let dbRoot: string | null = null;

    if (fs.existsSync(path.join(tempDir, "montavis.db"))) {
      dbRoot = tempDir;
    } else {
      for (const entry of fs.readdirSync(tempDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const candidate = path.join(tempDir, entry.name);
          if (fs.existsSync(path.join(candidate, "montavis.db"))) {
            dbRoot = candidate;
            break;
          }
        }
      }
    }

    if (!dbRoot) {
      log.error('[importMvis] No montavis.db found in extracted contents');
      fs.rmSync(tempDir, { recursive: true, force: true });
      return {
        success: false,
        error: "Invalid .mvis file: no montavis.db found",
      };
    }

    log.info('[importMvis] Found montavis.db at:', dbRoot);
    const incomingDbPath = path.join(dbRoot, "montavis.db");
    const incoming = readInstructionMeta(incomingDbPath);
    if (!incoming) {
      log.error('[importMvis] No instruction found in database');
      fs.rmSync(tempDir, { recursive: true, force: true });
      return {
        success: false,
        error: "Invalid .mvis file: no instruction found in database",
      };
    }
    log.info('[importMvis] Instruction meta:', JSON.stringify(incoming));

    // Fallback duplicate check when manifest was not available (old .mvis files)
    if (!manifest) {
      const match = findExistingProject(basePath, incoming.id);
      if (match) {
        log.info('[importMvis] Fallback duplicate check — existing:', JSON.stringify(match));
        if (incoming.revision <= match.revision) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          log.info('[importMvis] Skipping import — existing revision is same or newer');
          return { success: true, folderName: match.folderName };
        }
      }
    }

    // Determine folder name
    const rawName =
      dbRoot === tempDir ? path.basename(zipPath, ".mvis") : path.basename(dbRoot);
    const folderName = deduplicateFolderName(basePath, rawName);
    const destDir = path.join(basePath, folderName);
    log.info('[importMvis] Destination:', destDir);

    if (!isInsideBasePath(destDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      log.error('[importMvis] Destination outside base path');
      return { success: false, error: "Invalid project name" };
    }

    // Move content to final location
    try {
      fs.renameSync(dbRoot, destDir);
      log.info('[importMvis] Moved via renameSync');
    } catch {
      // renameSync fails across drives — fall back to copy
      log.info('[importMvis] renameSync failed, falling back to copy');
      await fs.promises.cp(dbRoot, destDir, { recursive: true });
    }

    if (!fs.existsSync(path.join(destDir, "montavis.db"))) {
      log.error('[importMvis] montavis.db missing after move');
      fs.rmSync(destDir, { recursive: true, force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
      return {
        success: false,
        error: "Extraction failed: montavis.db missing after move",
      };
    }

    // Clean up temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    log.info('[importMvis] Import successful, folderName:', folderName);
    return { success: true, folderName };
  } catch (err) {
    log.error('[importMvis] Unexpected error:', err);
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
