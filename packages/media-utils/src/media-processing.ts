/**
 * Shared FFmpeg media processing utilities.
 *
 * Pure Node.js — no Electron dependency. All platform-specific paths
 * (appPath, resourcesPath) are passed as parameters.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max output height for PartTool images (px). */
export const PARTTOOL_EXPORT_SIZE = 720;

/** Max output height for cover / general images (px). */
export const EXPORT_SIZE = 1040;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// resolveFFmpegBinary
// ---------------------------------------------------------------------------

/**
 * Resolve the path to the bundled FFmpeg binary.
 *
 * @param basePath  - In dev: the app root (where `resources/` lives).
 *                    In packaged: `process.resourcesPath`.
 * @param isPackaged - Whether the app is running from a packaged build.
 * @returns Absolute path to the `ffmpeg` executable.
 * @throws If the binary cannot be found.
 */
export function resolveFFmpegBinary(basePath: string, isPackaged: boolean): string {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const binPath = isPackaged
    ? path.join(basePath, 'ffmpeg', `ffmpeg${ext}`)
    : path.join(basePath, 'resources', 'ffmpeg', `ffmpeg${ext}`);

  if (!fs.existsSync(binPath)) {
    throw new Error(`FFmpeg binary not found at ${binPath}`);
  }
  return binPath;
}

// ---------------------------------------------------------------------------
// readImageDimensions
// ---------------------------------------------------------------------------

/**
 * Read image dimensions from PNG/JPEG binary headers without external libs.
 * Returns `{ width: 0, height: 0 }` for unsupported formats or on error.
 */
export function readImageDimensions(filePath: string): ImageDimensions {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 4) return { width: 0, height: 0 };

    // PNG: bytes 16-23 contain width and height as 4-byte big-endian
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
      };
    }

    // JPEG: scan for SOF markers
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let offset = 2;
      while (offset < buf.length - 1) {
        if (buf[offset] !== 0xFF) break;
        const marker = buf[offset + 1];
        // SOF0–SOF2 markers contain dimensions
        if (marker >= 0xC0 && marker <= 0xC2) {
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7),
          };
        }
        const segLen = buf.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }

    return { width: 0, height: 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}

// ---------------------------------------------------------------------------
// computeProcessingHash / isProcessingCurrent
// ---------------------------------------------------------------------------

/** Compute a short SHA-256 hash of processing parameters for cache invalidation. */
export function computeProcessingHash(...params: (string | number | null | undefined)[]): string {
  return createHash('sha256')
    .update(params.map(p => String(p ?? '')).join('|'))
    .digest('hex')
    .slice(0, 16);
}

/** Check if a `params.hash` sidecar file matches the expected hash. */
export function isProcessingCurrent(outputDir: string, expectedHash: string): boolean {
  try {
    return fs.readFileSync(path.join(outputDir, 'params.hash'), 'utf-8').trim() === expectedHash;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// buildImageProcessArgs
// ---------------------------------------------------------------------------

/**
 * Build FFmpeg args to crop + scale an image to JPEG.
 *
 * - Crop uses normalized coordinates: `crop=iw*W:ih*H:iw*X:ih*Y`
 * - Scale: `scale=-2:min(ih\,N)` — only downscales, keeps aspect ratio,
 *   ensures width is divisible by 2.
 * - Output: JPEG with `yuvj420p` pixel format, quality 2.
 */
export function buildImageProcessArgs(
  ffmpegBin: string,
  sourcePath: string,
  outputPath: string,
  crop: CropRect | undefined,
  maxHeight: number,
): string[] {
  const filters: string[] = [];

  if (crop) {
    filters.push(`crop=iw*${crop.width}:ih*${crop.height}:iw*${crop.x}:ih*${crop.y}`);
  }

  // Only downscale — never upscale. Width divisible by 2.
  filters.push(`scale=-2:'min(ih\\,${maxHeight})'`);

  return [
    ffmpegBin,
    '-y',
    '-i', sourcePath,
    '-vf', filters.join(','),
    '-pix_fmt', 'yuvj420p',
    '-q:v', '2',
    outputPath,
  ];
}

// ---------------------------------------------------------------------------
// spawnFFmpeg
// ---------------------------------------------------------------------------

/** Promise wrapper around `child_process.execFile`. */
export function spawnFFmpeg(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// processImage
// ---------------------------------------------------------------------------

/**
 * Process an image via FFmpeg: optional crop, scale to max height, convert to JPEG.
 * Writes a `params.hash` sidecar for idempotent skipping.
 */
export async function processImage(
  ffmpegBin: string,
  sourcePath: string,
  outputPath: string,
  crop: CropRect | undefined,
  maxHeight: number,
): Promise<void> {
  const outputDir = path.dirname(outputPath);

  // Build cache hash from all processing parameters
  const hash = computeProcessingHash(
    'image-process',
    sourcePath,
    crop?.x, crop?.y, crop?.width, crop?.height,
    maxHeight,
  );

  // Skip if already processed with same params and output exists
  if (isProcessingCurrent(outputDir, hash) && fs.existsSync(outputPath)) {
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const allArgs = buildImageProcessArgs(ffmpegBin, sourcePath, outputPath, crop, maxHeight);
  // allArgs[0] is the binary, rest are the arguments
  await spawnFFmpeg(allArgs[0], allArgs.slice(1));

  // Write sidecar for future cache checks
  fs.writeFileSync(path.join(outputDir, 'params.hash'), hash, 'utf-8');
}
