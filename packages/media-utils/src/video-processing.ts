/**
 * Video processing utilities — viewport cropping with keyframe interpolation,
 * section cutting, and frame extraction.
 *
 * Ported from montavis-creator's viewportProcess.ts into the shared media-utils
 * package so both creator and viewer apps can use them.
 *
 * Uses crop → scale (pro editor style):
 * - crop: extracts the viewport region from the source frame
 * - scale: resizes to output resolution
 * - crop x/y are evaluated per-frame (handles pan), w/h are init-only (constant zoom)
 */

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  type CropRect,
  assertFinitePositive,
  computeProcessingHash,
  isProcessingCurrent,
  spawnFFmpeg,
} from './media-processing.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** DB row shape from viewport_keyframes table. */
export interface ViewportKeyframeDB {
  frame_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  interpolation: 'hold' | 'linear' | null;
}

/** Normalized viewport rectangle (0-1 range). */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A segment between two keyframes with interpolation mode. */
export interface ViewportSegment {
  startFrame: number; // 0-based output frame
  endFrame: number;
  from: Viewport;
  to: Viewport;
  interpolation: 'hold' | 'linear';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpViewport(from: Viewport, to: Viewport, t: number): Viewport {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
  };
}

function kfToViewport(kf: ViewportKeyframeDB): Viewport {
  return { x: kf.x, y: kf.y, width: kf.width, height: kf.height };
}

/** Round to nearest even number (FFmpeg requires even dimensions). */
function even(n: number): number {
  return Math.round(n / 2) * 2;
}

const EPSILON = 0.001;

// ---------------------------------------------------------------------------
// getDefaultViewportNormalized
// ---------------------------------------------------------------------------

/**
 * Returns a centered pixel-square viewport in 0-1 normalized coords.
 * Uses 50% of the video height as the square side length.
 */
export function getDefaultViewportNormalized(videoW: number, videoH: number): Viewport {
  const aspectRatio = videoW / videoH;
  const heightFraction = 0.5;
  const widthFraction = heightFraction / aspectRatio;
  return {
    x: (1 - widthFraction) / 2,
    y: (1 - heightFraction) / 2,
    width: widthFraction,
    height: heightFraction,
  };
}

// ---------------------------------------------------------------------------
// isFullFrameViewport
// ---------------------------------------------------------------------------

/** Returns true if all keyframes show the full frame (no actual pan/zoom). */
export function isFullFrameViewport(keyframes: ViewportKeyframeDB[]): boolean {
  if (keyframes.length === 0) return true;
  return keyframes.every(
    (kf) =>
      Math.abs(kf.x) < EPSILON &&
      Math.abs(kf.y) < EPSILON &&
      Math.abs(kf.width - 1) < EPSILON &&
      Math.abs(kf.height - 1) < EPSILON,
  );
}

// ---------------------------------------------------------------------------
// interpolateViewportAtFrame
// ---------------------------------------------------------------------------

/** Interpolate viewport at any frame. Works on 0-1 normalized values. */
export function interpolateViewportAtFrame(
  frame: number,
  keyframes: ViewportKeyframeDB[],
  /** Pass true if keyframes are already sorted by frame_number ascending. */
  preSorted?: boolean,
): Viewport {
  const sorted = preSorted ? keyframes : [...keyframes].sort((a, b) => a.frame_number - b.frame_number);

  if (sorted.length === 1) return kfToViewport(sorted[0]);

  // Before first or at first
  if (frame <= sorted[0].frame_number) return kfToViewport(sorted[0]);

  // After last or at last
  if (frame >= sorted[sorted.length - 1].frame_number)
    return kfToViewport(sorted[sorted.length - 1]);

  // Exact match
  const exact = sorted.find((kf) => kf.frame_number === frame);
  if (exact) return kfToViewport(exact);

  // Find surrounding pair
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    if (frame > from.frame_number && frame < to.frame_number) {
      const fromVp = kfToViewport(from);
      if (to.interpolation !== 'linear') return fromVp; // hold
      const t = (frame - from.frame_number) / (to.frame_number - from.frame_number);
      return lerpViewport(fromVp, kfToViewport(to), t);
    }
  }

  // Fallback
  return kfToViewport(sorted[sorted.length - 1]);
}

// ---------------------------------------------------------------------------
// buildViewportSegments
// ---------------------------------------------------------------------------

/**
 * Build viewport segments for a section, mapping absolute frames to 0-based output frames.
 * Interpolates boundary values when the section doesn't align with keyframe positions.
 */
export function buildViewportSegments(
  keyframes: ViewportKeyframeDB[],
  sectionStartFrame: number,
  sectionEndFrame: number,
): ViewportSegment[] {
  const sorted = [...keyframes].sort((a, b) => a.frame_number - b.frame_number);

  interface Point {
    absFrame: number;
    viewport: Viewport;
    interpolation: 'hold' | 'linear';
  }

  const points: Point[] = [];

  // Start boundary (interpolated) — pass sorted array to avoid re-sorting
  const startVp = interpolateViewportAtFrame(sectionStartFrame, sorted, true);
  points.push({ absFrame: sectionStartFrame, viewport: startVp, interpolation: 'hold' });

  // Keyframes strictly within section
  for (const kf of sorted) {
    if (kf.frame_number > sectionStartFrame && kf.frame_number < sectionEndFrame) {
      points.push({
        absFrame: kf.frame_number,
        viewport: kfToViewport(kf),
        interpolation: kf.interpolation === 'linear' ? 'linear' : 'hold',
      });
    }
  }

  // End boundary (interpolated) — pass sorted array to avoid re-sorting
  const endVp = interpolateViewportAtFrame(sectionEndFrame, sorted, true);
  let endInterp: 'hold' | 'linear' = 'hold';
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].frame_number < sectionEndFrame && sorted[i + 1].frame_number >= sectionEndFrame) {
      endInterp = sorted[i + 1].interpolation === 'linear' ? 'linear' : 'hold';
      break;
    }
  }
  points.push({ absFrame: sectionEndFrame, viewport: endVp, interpolation: endInterp });

  // Build segments between consecutive points
  const segments: ViewportSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    segments.push({
      startFrame: from.absFrame - sectionStartFrame,
      endFrame: to.absFrame - sectionStartFrame,
      from: from.viewport,
      to: to.viewport,
      interpolation: to.interpolation,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// computeCropValues
// ---------------------------------------------------------------------------

/**
 * Convert a 0-1 normalized viewport to pixel crop values.
 * The viewport is a pixel-square: vp.height encodes the vertical fraction
 * such that videoH * vp.height == videoW * vp.width (square crop).
 */
export function computeCropValues(
  vp: Viewport,
  videoW: number,
  videoH: number,
): { w: number; h: number; x: number; y: number } {
  assertFinitePositive(videoW, 'videoW');
  assertFinitePositive(videoH, 'videoH');
  assertFinitePositive(vp.width, 'viewport.width');
  assertFinitePositive(vp.height, 'viewport.height');
  return {
    w: even(Math.round(videoW * vp.width)),
    h: even(Math.round(videoH * vp.height)),
    x: Math.max(0, Math.round(videoW * vp.x)),
    y: Math.max(0, Math.round(videoH * vp.y)),
  };
}

// ---------------------------------------------------------------------------
// buildCropExpr
// ---------------------------------------------------------------------------

/**
 * Build FFmpeg crop expression from viewport segments.
 * w/h are constant (from first segment — zoom is constant per FFmpeg call).
 * x/y are piecewise expressions using frame counter `n` for panning.
 */
export function buildCropExpr(
  segments: ViewportSegment[],
  videoW: number,
  videoH: number,
): { w: number; h: number; x: string; y: string } {
  // w/h from first segment (constant zoom)
  const crop = computeCropValues(segments[0].from, videoW, videoH);

  // Pre-compute pixel x/y for from and to of each segment
  const computed = segments.map((seg) => ({
    from: computeCropValues(seg.from, videoW, videoH),
    to: computeCropValues(seg.to, videoW, videoH),
    seg,
  }));

  // Build x or y expression
  function buildExpr(getVal: (c: (typeof computed)[number]) => { from: number; to: number }): string {
    if (segments.length === 1) {
      const c = computed[0];
      const seg = c.seg;
      const vals = getVal(c);
      if (seg.interpolation === 'linear' && vals.from !== vals.to) {
        const range = seg.endFrame - seg.startFrame;
        return `${vals.from}+(${vals.to - vals.from})*(n-${seg.startFrame})/${range}`;
      }
      return String(vals.from);
    }

    // Multiple segments — nested if(lt(n, endFrame), expr, rest)
    function buildFrom(idx: number): string {
      const c = computed[idx];
      const seg = c.seg;
      const vals = getVal(c);

      const segExpr =
        seg.interpolation === 'linear' && vals.from !== vals.to
          ? `${vals.from}+(${vals.to - vals.from})*(n-${seg.startFrame})/${seg.endFrame - seg.startFrame}`
          : String(vals.from);

      if (idx === computed.length - 1) return segExpr;
      return `if(lt(n,${seg.endFrame}),${segExpr},${buildFrom(idx + 1)})`;
    }
    return buildFrom(0);
  }

  return {
    w: crop.w,
    h: crop.h,
    x: buildExpr((c) => ({ from: c.from.x, to: c.to.x })),
    y: buildExpr((c) => ({ from: c.from.y, to: c.to.y })),
  };
}

// ---------------------------------------------------------------------------
// buildSectionCutArgsWithViewport
// ---------------------------------------------------------------------------

/** Build FFmpeg args for a section with viewport crop+scale applied. */
export function buildSectionCutArgsWithViewport(
  ffmpegBin: string,
  videoPath: string,
  outputPath: string,
  startFrame: number,
  endFrame: number,
  fps: number,
  resolutionHeight: number,
  videoWidth: number,
  videoHeight: number,
  segments: ViewportSegment[],
): string[] {
  const startTime = (startFrame / fps).toFixed(6);
  const duration = ((endFrame - startFrame) / fps).toFixed(6);

  const crop = buildCropExpr(segments, videoWidth, videoHeight);
  const cropFilter = `crop=${crop.w}:${crop.h}:'${crop.x}':'${crop.y}'`;
  const outScale = `scale=${resolutionHeight}:${resolutionHeight}`;

  return [
    ffmpegBin,
    '-y',
    '-ss',
    startTime,
    '-i',
    videoPath,
    '-t',
    duration,
    '-vf',
    `${cropFilter},${outScale}`,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-threads',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    outputPath,
  ];
}

// ---------------------------------------------------------------------------
// computeViewportHash
// ---------------------------------------------------------------------------

/** Deterministic hash of viewport keyframes for cache invalidation. */
export function computeViewportHash(keyframes: ViewportKeyframeDB[]): string {
  if (keyframes.length === 0) return 'none';
  const sorted = [...keyframes].sort((a, b) => a.frame_number - b.frame_number);
  const data = sorted
    .map(
      (kf) =>
        `${kf.frame_number}|${kf.x}|${kf.y}|${kf.width}|${kf.height}|${kf.interpolation ?? 'hold'}`,
    )
    .join(';');
  return createHash('sha256').update(data).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// filterKeyframesForSection
// ---------------------------------------------------------------------------

/**
 * Filter viewport keyframes to those relevant to a section's frame range.
 * Includes the last keyframe before startFrame (the "from" state) plus all inside [startFrame, endFrame].
 */
export function filterKeyframesForSection(
  keyframes: ViewportKeyframeDB[],
  startFrame: number,
  endFrame: number,
): ViewportKeyframeDB[] {
  let lastBefore: ViewportKeyframeDB | null = null;
  const inside: ViewportKeyframeDB[] = [];
  for (const kf of keyframes) {
    if (kf.frame_number < startFrame) {
      lastBefore = kf;
    } else if (kf.frame_number <= endFrame) {
      inside.push(kf);
    }
  }
  return lastBefore ? [lastBefore, ...inside] : inside;
}

// ---------------------------------------------------------------------------
// buildVideoCutArgs
// ---------------------------------------------------------------------------

/**
 * Build FFmpeg args for a simple time-based video cut + scale (no viewport crop).
 * Codec: libx264, fast preset, CRF 23, yuv420p, faststart, no audio.
 */
export function buildVideoCutArgs(
  ffmpegBin: string,
  videoPath: string,
  outputPath: string,
  startFrame: number,
  endFrame: number,
  fps: number,
  resolutionHeight: number,
): string[] {
  const startTime = (startFrame / fps).toFixed(6);
  const duration = ((endFrame - startFrame) / fps).toFixed(6);

  return [
    ffmpegBin,
    '-y',
    '-ss',
    startTime,
    '-i',
    videoPath,
    '-t',
    duration,
    '-vf',
    `scale=-2:${resolutionHeight}`,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-threads',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    outputPath,
  ];
}

// ---------------------------------------------------------------------------
// buildFrameExtractArgs
// ---------------------------------------------------------------------------

/**
 * Build FFmpeg args to extract a single frame as JPEG with optional crop+scale.
 */
export function buildFrameExtractArgs(
  ffmpegBin: string,
  videoPath: string,
  outputPath: string,
  frameNumber: number,
  fps: number,
  crop?: CropRect,
  maxHeight?: number,
): string[] {
  const seekTime = (frameNumber / fps).toFixed(6);

  const filters: string[] = [];
  if (crop) {
    assertFinitePositive(crop.width, 'crop.width');
    assertFinitePositive(crop.height, 'crop.height');
    if (!Number.isFinite(crop.x) || crop.x < 0) throw new Error(`Invalid crop.x: ${crop.x}`);
    if (!Number.isFinite(crop.y) || crop.y < 0) throw new Error(`Invalid crop.y: ${crop.y}`);
    filters.push(`crop=iw*${crop.width}:ih*${crop.height}:iw*${crop.x}:ih*${crop.y}`);
  }
  if (maxHeight) {
    assertFinitePositive(maxHeight, 'maxHeight');
    filters.push(`scale=-2:'min(ih\\,${maxHeight})'`);
  }

  const args = [
    ffmpegBin,
    '-y',
    '-ss',
    seekTime,
    '-i',
    videoPath,
  ];

  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  args.push(
    '-frames:v',
    '1',
    '-pix_fmt',
    'yuvj420p',
    '-q:v',
    '2',
    outputPath,
  );

  return args;
}

// ---------------------------------------------------------------------------
// processVideoSection
// ---------------------------------------------------------------------------

/**
 * Process a video section: checks cache → builds args (with or without viewport) →
 * runs FFmpeg → writes params.hash sidecar.
 */
export async function processVideoSection(
  ffmpegBin: string,
  videoPath: string,
  outputPath: string,
  startFrame: number,
  endFrame: number,
  fps: number,
  resolutionHeight: number,
  viewport?: { segments: ViewportSegment[]; videoWidth: number; videoHeight: number },
): Promise<void> {
  const outputDir = path.dirname(outputPath);

  const viewportHashData = viewport
    ? viewport.segments
        .map(
          (s) =>
            `${s.startFrame}|${s.endFrame}|${s.from.x}|${s.from.y}|${s.from.width}|${s.from.height}|${s.to.x}|${s.to.y}|${s.to.width}|${s.to.height}|${s.interpolation}`,
        )
        .join(';')
    : 'none';

  const hash = computeProcessingHash(
    'video-section',
    videoPath,
    startFrame,
    endFrame,
    fps,
    resolutionHeight,
    viewportHashData,
  );

  if (isProcessingCurrent(outputDir, hash) && fs.existsSync(outputPath)) {
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  let allArgs: string[];
  if (viewport) {
    allArgs = buildSectionCutArgsWithViewport(
      ffmpegBin,
      videoPath,
      outputPath,
      startFrame,
      endFrame,
      fps,
      resolutionHeight,
      viewport.videoWidth,
      viewport.videoHeight,
      viewport.segments,
    );
  } else {
    allArgs = buildVideoCutArgs(
      ffmpegBin,
      videoPath,
      outputPath,
      startFrame,
      endFrame,
      fps,
      resolutionHeight,
    );
  }

  await spawnFFmpeg(allArgs[0], allArgs.slice(1));

  fs.writeFileSync(path.join(outputDir, 'params.hash'), hash, 'utf-8');
}

// ---------------------------------------------------------------------------
// processFrameExtract
// ---------------------------------------------------------------------------

/**
 * Extract a single frame as JPEG: checks cache → builds args → runs FFmpeg → writes sidecar.
 */
export async function processFrameExtract(
  ffmpegBin: string,
  videoPath: string,
  outputPath: string,
  frameNumber: number,
  fps: number,
  crop?: CropRect,
  maxHeight?: number,
): Promise<void> {
  const outputDir = path.dirname(outputPath);

  const hash = computeProcessingHash(
    'frame-extract',
    videoPath,
    frameNumber,
    fps,
    crop?.x,
    crop?.y,
    crop?.width,
    crop?.height,
    maxHeight,
  );

  if (isProcessingCurrent(outputDir, hash) && fs.existsSync(outputPath)) {
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const allArgs = buildFrameExtractArgs(ffmpegBin, videoPath, outputPath, frameNumber, fps, crop, maxHeight);
  await spawnFFmpeg(allArgs[0], allArgs.slice(1));

  fs.writeFileSync(path.join(outputDir, 'params.hash'), hash, 'utf-8');
}

// ---------------------------------------------------------------------------
// VideoMetadata + readVideoMetadata
// ---------------------------------------------------------------------------

export interface VideoMetadata {
  fps: number;
  width: number;
  height: number;
  duration: number;
}

/**
 * Probe a video file using ffprobe and return metadata.
 * Falls back to 30 fps when `r_frame_rate` is missing.
 * Throws on failure or if no video stream is found.
 */
export function readVideoMetadata(ffprobeBin: string, filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      ffprobeBin,
      ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );

    const chunks: Buffer[] = [];
    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));

    proc.on('error', reject);

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe exited with code ${code}`));
      }

      try {
        const stdout = Buffer.concat(chunks).toString('utf-8');
        const data = JSON.parse(stdout) as {
          streams?: Array<{
            codec_type?: string;
            r_frame_rate?: string;
            width?: number;
            height?: number;
          }>;
          format?: { duration?: string };
        };

        const videoStream = data.streams?.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          return reject(new Error('No video stream found'));
        }

        let fps = 30;
        if (videoStream.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split('/');
          if (parts.length === 2) {
            const num = Number(parts[0]);
            const den = Number(parts[1]);
            if (den > 0 && Number.isFinite(num)) {
              fps = num / den;
            }
          }
        }

        resolve({
          fps,
          width: videoStream.width ?? 0,
          height: videoStream.height ?? 0,
          duration: Number(data.format?.duration ?? 0),
        });
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// buildFullVideoArgs
// ---------------------------------------------------------------------------

/**
 * Build FFmpeg args to scale a full video to fit within `size x size`,
 * padding with black borders to produce exact square output.
 *
 * Filter: scale to fit → pad to fill square.
 * Same codec settings as buildVideoCutArgs. No -ss/-t (full video). No audio.
 */
export function buildFullVideoArgs(
  ffmpegBin: string,
  videoPath: string,
  outputPath: string,
  size: number,
): string[] {
  const scaleFilter = `scale='min(${size},iw*${size}/ih)':'min(${size},ih*${size}/iw)'`;
  const padFilter = `pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2`;

  return [
    ffmpegBin,
    '-y',
    '-i',
    videoPath,
    '-vf',
    `${scaleFilter},${padFilter}`,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-threads',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    outputPath,
  ];
}

// ---------------------------------------------------------------------------
// buildSectionMergeArgs
// ---------------------------------------------------------------------------

/**
 * Build FFmpeg args to extract multiple sections from a video, concatenate them,
 * and scale+pad to a square output. Uses filter_complex with trim+setpts per section,
 * concat, then scale+pad.
 */
export function buildSectionMergeArgs(
  ffmpegBin: string,
  videoPath: string,
  outputPath: string,
  sections: Array<{ startFrame: number; endFrame: number }>,
  fps: number,
  exportSize: number,
): string[] {
  const trimFilters = sections.map((sec, i) => {
    const start = (sec.startFrame / fps).toFixed(6);
    const end = (sec.endFrame / fps).toFixed(6);
    return `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${i}]`;
  });

  const concatInputs = sections.map((_, i) => `[v${i}]`).join('');
  const concatFilter = `${concatInputs}concat=n=${sections.length}:v=1:a=0[merged]`;

  const scaleFilter = `scale='min(${exportSize},iw*${exportSize}/ih)':'min(${exportSize},ih*${exportSize}/iw)'`;
  const padFilter = `pad=${exportSize}:${exportSize}:(ow-iw)/2:(oh-ih)/2`;
  const finalFilter = `[merged]${scaleFilter},${padFilter}[out]`;

  const filterComplex = [...trimFilters, concatFilter, finalFilter].join(';');

  return [
    ffmpegBin,
    '-y',
    '-i',
    videoPath,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-threads',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    outputPath,
  ];
}
