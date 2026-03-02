/**
 * Utility functions for video trimming.
 */

import type { CutRegion } from '../types/trim.types';

/**
 * Segment of video to keep (not cut).
 */
export interface KeptSegment {
  start: number;
  end: number;
}

/**
 * Generate a unique ID for a cut region.
 */
export function generateCutId(): string {
  return `cut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calculate the segments to keep given a list of cut regions.
 * Returns an array of {start, end} segments that should be played.
 */
export function getKeptSegments(cuts: CutRegion[], duration: number): KeptSegment[] {
  if (cuts.length === 0) {
    return [{ start: 0, end: duration }];
  }

  // Sort cuts by start time
  const sortedCuts = [...cuts].sort((a, b) => a.startTime - b.startTime);

  // Merge overlapping cuts first
  const mergedCuts = mergeOverlappingRegions(sortedCuts);

  // Build kept segments (gaps between cuts)
  const segments: KeptSegment[] = [];
  let currentPosition = 0;

  for (const cut of mergedCuts) {
    if (cut.startTime > currentPosition) {
      segments.push({ start: currentPosition, end: cut.startTime });
    }
    currentPosition = Math.max(currentPosition, cut.endTime);
  }

  // Add final segment if there's video left after last cut
  if (currentPosition < duration) {
    segments.push({ start: currentPosition, end: duration });
  }

  return segments;
}

/**
 * Merge overlapping or adjacent cut regions into fewer regions.
 * Preserves the ID of the first region in each merged group.
 */
export function mergeOverlappingRegions(regions: CutRegion[]): CutRegion[] {
  if (regions.length === 0) return [];

  // Sort by start time
  const sorted = [...regions].sort((a, b) => a.startTime - b.startTime);

  const merged: CutRegion[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // If current overlaps or touches the last merged region
    if (current.startTime <= last.endTime) {
      // Extend the last region
      last.endTime = Math.max(last.endTime, current.endTime);
    } else {
      // No overlap, add as new region
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Format seconds as M:SS, H:MM:SS, or M:SS.ms timecode.
 */
export function formatTimecode(seconds: number, showMs = false): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (showMs) {
    const wholeSecs = Math.floor(secs);
    const ms = Math.round((secs - wholeSecs) * 100);
    return `${m}:${wholeSecs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  const s = Math.floor(secs);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse a timecode string (M:SS or M:SS.ms) to seconds.
 * Returns null if invalid format.
 */
export function parseTimecode(timecode: string): number | null {
  const match = timecode.match(/^(\d+):(\d{2})(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  const ms = match[3] ? parseInt(match[3].padEnd(2, '0'), 10) / 100 : 0;

  return mins * 60 + secs + ms;
}

/**
 * Check if a file is a video based on MIME type or extension.
 */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;

  const ext = file.name.split('.').pop()?.toLowerCase();
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'm4v'];
  return videoExts.includes(ext || '');
}
