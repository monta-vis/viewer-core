import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

interface CropArea {
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

interface VideoFrameCaptureProps {
  /** Video ID (used as key for state reset) */
  videoId: string;
  /** Video FPS for accurate frame seeking */
  fps: number;
  /** Frame number to capture */
  frameNumber: number;
  /** Crop area (normalized 0-1 coordinates) */
  cropArea?: CropArea;
  /** Alt text for the image */
  alt?: string;
  /** CSS class for the container */
  className?: string;
  /** Direct video URL (for local mode, e.g., mvis-media://) */
  videoSrc?: string;
  /** Called after canvas capture with the natural content dimensions and dataUrl */
  onCapture?: (size: { width: number; height: number }, dataUrl: string) => void;
}

/**
 * VideoFrameCapture - Captures a specific frame from a video and displays it
 *
 * Uses a hidden video element to seek to the specified frame,
 * then captures it to a canvas with optional cropping.
 * No server-side storage required.
 *
 * In local mode, pass videoSrc directly. In cloud mode, this component
 * is typically not used (pre-exported images are preferred).
 */
export function VideoFrameCapture({
  videoId,
  fps,
  frameNumber,
  cropArea,
  alt = 'Video frame',
  className,
  videoSrc,
  onCapture,
}: VideoFrameCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Calculate crop dimensions from normalized coordinates
  const getCropDimensions = useCallback((videoWidth: number, videoHeight: number) => {
    if (!cropArea ||
        cropArea.x === null ||
        cropArea.y === null ||
        cropArea.width === null ||
        cropArea.height === null) {
      // No crop - use full video
      return {
        sx: 0,
        sy: 0,
        sw: videoWidth,
        sh: videoHeight,
      };
    }

    // Coordinates are normalized (0-1)
    const sx = cropArea.x * videoWidth;
    const sy = cropArea.y * videoHeight;
    const sw = cropArea.width * videoWidth;
    const sh = cropArea.height * videoHeight;

    return { sx, sy, sw, sh };
  }, [cropArea]);

  // Capture frame to canvas
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { sx, sy, sw, sh } = getCropDimensions(video.videoWidth, video.videoHeight);

    // Set canvas size to match crop area (or limit to reasonable size)
    const maxSize = 800;
    const scale = Math.min(1, maxSize / Math.max(sw, sh));
    canvas.width = sw * scale;
    canvas.height = sh * scale;

    // Draw the cropped area to canvas
    ctx.drawImage(
      video,
      sx, sy, sw, sh, // Source crop
      0, 0, canvas.width, canvas.height // Destination (full canvas)
    );

    setIsLoaded(true);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCapture?.({ width: canvas.width, height: canvas.height }, dataUrl);
  }, [getCropDimensions, onCapture]);

  // Seek to frame when video is loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // Seek to the specified frame
      const time = (frameNumber + 0.001) / fps;
      video.currentTime = Math.min(time, video.duration);
    };

    const handleSeeked = () => {
      // Frame is ready, capture it
      captureFrame();
    };

    const handleError = () => {
      setHasError(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // If metadata already loaded, trigger seek
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [videoSrc, frameNumber, fps, captureFrame]);

  // Reset state when source changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [videoId, frameNumber]);

  if (hasError) {
    return (
      <div className={clsx(
        'flex items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text-muted)]',
        className
      )}>
        <span className="text-sm">{t('instructionView.frameLoadError', 'Failed to load frame')}</span>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src={videoSrc}
        preload="metadata"
        muted
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />

      {/* Canvas to display captured frame */}
      <canvas
        ref={canvasRef}
        className={clsx(
          'w-full h-full object-contain',
          !isLoaded && 'invisible'
        )}
        aria-label={alt}
      />

      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-base)]">
          <div className="w-6 h-6 border-2 border-[var(--color-border-base)] border-t-[var(--color-secondary)] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
