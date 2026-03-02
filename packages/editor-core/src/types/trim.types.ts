/**
 * Types for video trimming functionality.
 *
 * Uses metadata-only approach: original video uploads unchanged,
 * cut data stored separately and applied during playback.
 */

/**
 * A region of the video to be cut (removed) during playback.
 */
export interface CutRegion {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
}

/**
 * Complete trim data for a video.
 */
export interface TrimData {
  regions: CutRegion[];
  videoDuration: number; // seconds
}

/**
 * A file with optional trim data attached.
 * Used in the upload flow to pass trim metadata alongside the file.
 */
export interface TrimmedFile {
  file: File;
  trimData: TrimData | null; // null = no trimming
}
