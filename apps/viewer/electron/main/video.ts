import path from "path";
import fs from "fs";
import crypto from "crypto";
import Database from "better-sqlite3";
import {
  resolveFFmpegBinary,
  readVideoMetadata,
  buildFullVideoArgs,
  buildSectionMergeArgs,
  spawnFFmpeg,
  EXPORT_SIZE,
} from "@monta-vis/media-utils";
import { getProjectsBasePath, isInsideBasePath } from "./projects.js";
import { isInsidePath } from "./pathUtils.js";
import { getElectronPaths } from "./electronPaths.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoUploadArgs {
  sourceVideoPath: string;
  sections?: Array<{ startFrame: number; endFrame: number }> | null;
}

export interface VideoUploadResult {
  success: boolean;
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isInsideUserHome(filePath: string): boolean {
  return isInsidePath(filePath, getElectronPaths().homePath);
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

  // Validate substepId format (must be a UUID)
  if (!UUID_PATTERN.test(substepId)) {
    return { success: false, error: "Invalid substep ID format" };
  }

  // Generate IDs
  const sectionId = crypto.randomUUID();
  const substepVideoSectionId = crypto.randomUUID();

  // Output path — save to substeps/ (final processed output, not sections/ cache)
  const outputDir = path.join(basePath, folderName, "media", "substeps", substepId);
  if (!isInsideBasePath(outputDir)) {
    return { success: false, error: "Output path is outside project directory" };
  }
  const outputPath = path.join(outputDir, "video.mp4");

  try {
    // Resolve binaries
    const elPaths = getElectronPaths();
    const binBase = elPaths.isPackaged ? elPaths.resourcesPath : elPaths.appPath;
    const ffmpegBin = resolveFFmpegBinary(binBase, elPaths.isPackaged);
    const ffprobeBin = resolveFFmpegBinary(binBase, elPaths.isPackaged, "ffprobe");

    // Probe source video
    const meta = await readVideoMetadata(ffprobeBin, resolvedSource);

    // Determine if we need section merging
    const hasSections = args.sections && args.sections.length > 0;
    const totalSourceFrames = Math.round(meta.fps * meta.duration);
    const isFullVideo = !hasSections ||
      (args.sections!.length === 1 &&
       args.sections![0].startFrame === 0 &&
       args.sections![0].endFrame === totalSourceFrames);

    // Process video
    fs.mkdirSync(outputDir, { recursive: true });

    let frameCount: number;
    if (isFullVideo) {
      // No sections or single full-video section → scale+pad only
      frameCount = totalSourceFrames;
      const allArgs = buildFullVideoArgs(ffmpegBin, resolvedSource, outputPath, EXPORT_SIZE);
      await spawnFFmpeg(allArgs[0], allArgs.slice(1));
    } else {
      // Multiple sections → trim+concat+scale+pad
      const allArgs = buildSectionMergeArgs(
        ffmpegBin, resolvedSource, outputPath, args.sections!, meta.fps, EXPORT_SIZE,
      );
      await spawnFFmpeg(allArgs[0], allArgs.slice(1));

      // Probe merged output for accurate frame count
      const mergedMeta = await readVideoMetadata(ffprobeBin, outputPath);
      frameCount = Math.round(mergedMeta.fps * mergedMeta.duration);
    }

    // DB transaction
    const db = new Database(dbPath);
    try {
      db.pragma("foreign_keys = ON");

      const result = db.transaction(() => {
        // Find and delete old substep_video_sections for this substep
        const oldSvsRows = db
          .prepare("SELECT id, video_section_id FROM substep_video_sections WHERE substep_id = ?")
          .all(substepId) as Array<{ id: string; video_section_id: string }>;

        for (const row of oldSvsRows) {
          db.prepare("DELETE FROM viewport_keyframes WHERE video_section_id = ?").run(row.video_section_id);
          db.prepare("DELETE FROM substep_video_sections WHERE id = ?").run(row.id);
          const oldSection = db
            .prepare("SELECT video_id FROM video_sections WHERE id = ?")
            .get(row.video_section_id) as { video_id: string | null } | undefined;
          db.prepare("DELETE FROM video_sections WHERE id = ?").run(row.video_section_id);
          if (oldSection?.video_id) {
            const otherSections = db
              .prepare("SELECT COUNT(*) as cnt FROM video_sections WHERE video_id = ?")
              .get(oldSection.video_id) as { cnt: number };
            if (otherSections.cnt === 0) {
              db.prepare("DELETE FROM videos WHERE id = ?").run(oldSection.video_id);
            }
          }
        }

        // Insert new video_section (video_id = NULL — standalone uploaded video)
        db.prepare(
          `INSERT INTO video_sections (id, video_id, start_frame, end_frame, fps)
           VALUES (?, NULL, ?, ?, ?)`,
        ).run(sectionId, 0, frameCount, meta.fps);

        // Insert junction: substep_video_sections
        db.prepare(
          `INSERT INTO substep_video_sections (id, substep_id, video_section_id, "order")
           VALUES (?, ?, ?, 0)`,
        ).run(substepVideoSectionId, substepId, sectionId);

        return { success: true as const, sectionId, substepVideoSectionId, frameCount, fps: meta.fps, videoPath: resolvedSource };
      })();

      return result;
    } finally {
      db.close();
    }
  } catch (err) {
    console.error('[uploadSubstepVideo] Failed for substep %s:', substepId, err);

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
