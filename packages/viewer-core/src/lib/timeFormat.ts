/**
 * Format seconds as MM:SS:FF timecode (with frame count).
 * Returns '--:--:--' for invalid input.
 */
export function formatTimecodeWithFrames(seconds: number, fps: number): string {
  if (seconds === null || seconds === undefined || !isFinite(seconds)) return '--:--:--';
  const effectiveFps = fps || 30;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * effectiveFps);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}
