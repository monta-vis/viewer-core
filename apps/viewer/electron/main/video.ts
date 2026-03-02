import { app } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Database from "better-sqlite3";
import {
  resolveFFmpegBinary,
  readVideoMetadata,
  buildFullVideoArgs,
  spawnFFmpeg,
  EXPORT_SIZE,
} from "@monta-vis/media-utils";
import { getProjectsBasePath, isInsideBasePath } from "./projects.js";
import { isInsidePath } from "./pathUtils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoUploadArgs {
  sourceVideoPath: string;
}

export interface VideoUploadResult {
  success: boolean;
  videoId?: string;
  sectionId?: string;
  substepVideoSectionId?: string;
  frameCount?: number;
  fps?: number;
  videoPath?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Allowed extensions & validation
// ---------------------------------------------------------------------------

const ALLOWED_VIDEO_EXTENSIONS = new Set([
  ".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v",
]);

function isInsideUserHome(filePath: string): boolean {
  return isInsidePath(filePath, app.getPath("home"));
}

function validateVideoSource(
  sourcePath: string,
): { valid: true; resolved: string } | { valid: false; error: string } {
  const resolved = path.resolve(sourcePath);
  if (!fs.existsSync(resolved)) {
    return { valid: false, error: "Source video not found" };
  }
  if (!ALLOWED_VIDEO_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
    return { valid: false, error: "Unsupported video file type" };
  }
  if (!isInsideUserHome(resolved)) {
    return { valid: false, error: "Source path is outside user directory" };
  }
  return { valid: true, resolved };
}

// ---------------------------------------------------------------------------
// uploadSubstepVideo
// ---------------------------------------------------------------------------

export async function uploadSubstepVideo(
  folderName: string,
  substepId: string,
  args: VideoUploadArgs,
): Promise<VideoUploadResult> {
  const basePath = getProjectsBasePath();
  const dbPath = path.join(basePath, folderName, "montavis.db");

  if (!isInsideBasePath(dbPath) || !fs.existsSync(dbPath)) {
    return { success: false, error: "Project not found" };
  }

  // Validate source video
  const sourceCheck = validateVideoSource(args.sourceVideoPath);
  if (!sourceCheck.valid) {
    return { success: false, error: sourceCheck.error };
  }
  const resolvedSource = sourceCheck.resolved;

  // Generate IDs
  const videoId = crypto.randomUUID();
  const sectionId = crypto.randomUUID();
  const substepVideoSectionId = crypto.randomUUID();

  // Output path
  const outputDir = path.join(basePath, folderName, "media", "sections", sectionId);
  const outputPath = path.join(outputDir, "video.mp4");

  try {
    // Resolve binaries
    const binBase = app.isPackaged ? process.resourcesPath : app.getAppPath();
    const ffmpegBin = resolveFFmpegBinary(binBase, app.isPackaged);
    const ffprobeBin = resolveFFmpegBinary(binBase, app.isPackaged, "ffprobe");

    // Probe source video
    const meta = await readVideoMetadata(ffprobeBin, resolvedSource);
    const frameCount = Math.round(meta.fps * meta.duration);

    // Process video: scale+pad to EXPORT_SIZE x EXPORT_SIZE
    fs.mkdirSync(outputDir, { recursive: true });
    const allArgs = buildFullVideoArgs(ffmpegBin, resolvedSource, outputPath, EXPORT_SIZE);
    await spawnFFmpeg(allArgs[0], allArgs.slice(1));

    // DB transaction
    const db = new Database(dbPath);
    try {
      db.pragma("foreign_keys = ON");

      const result = db.transaction(() => {
        const now = new Date().toISOString();

        // Find and delete old substep_video_sections for this substep
        const oldSvsRows = db
          .prepare("SELECT id, video_section_id FROM substep_video_sections WHERE substep_id = ?")
          .all(substepId) as Array<{ id: string; video_section_id: string }>;

        for (const row of oldSvsRows) {
          db.prepare("DELETE FROM viewport_keyframes WHERE video_section_id = ?").run(row.video_section_id);
          db.prepare("DELETE FROM substep_video_sections WHERE id = ?").run(row.id);
          const oldSection = db
            .prepare("SELECT video_id FROM video_sections WHERE id = ?")
            .get(row.video_section_id) as { video_id: string } | undefined;
          db.prepare("DELETE FROM video_sections WHERE id = ?").run(row.video_section_id);
          if (oldSection) {
            const otherSections = db
              .prepare("SELECT COUNT(*) as cnt FROM video_sections WHERE video_id = ?")
              .get(oldSection.video_id) as { cnt: number };
            if (otherSections.cnt === 0) {
              db.prepare("DELETE FROM videos WHERE id = ?").run(oldSection.video_id);
            }
          }
        }

        // Insert new video row
        db.prepare(
          `INSERT INTO videos (id, source_path, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
        ).run(videoId, path.basename(resolvedSource), now, now);

        // Insert new video_section with probed frameCount and fps
        db.prepare(
          `INSERT INTO video_sections (id, video_id, start_frame, end_frame, fps, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(sectionId, videoId, 0, frameCount, meta.fps, now, now);

        // Insert junction: substep_video_sections
        db.prepare(
          `INSERT INTO substep_video_sections (id, substep_id, video_section_id, "order", created_at, updated_at)
           VALUES (?, ?, ?, 0, ?, ?)`,
        ).run(substepVideoSectionId, substepId, sectionId, now, now);

        return { success: true, videoId, sectionId, substepVideoSectionId, frameCount, fps: meta.fps, videoPath: resolvedSource };
      })();

      return result;
    } finally {
      db.close();
    }
  } catch (err) {
    // Clean up output on failure
    try {
      fs.rmSync(outputDir, { recursive: true });
    } catch { /* ignore cleanup errors */ }

    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
