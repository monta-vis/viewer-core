/**
 * Video player component for trimming.
 *
 * Displays the video with an object URL from a File.
 * Event handling (timeupdate, play/pause, etc.) is managed by
 * useVideoPlayback via the forwarded ref — no event props needed.
 */

import { useEffect, useState, forwardRef } from 'react';

export interface TrimVideoPlayerProps {
  file: File;
  className?: string;
}

export const TrimVideoPlayer = forwardRef<HTMLVideoElement, TrimVideoPlayerProps>(
  function TrimVideoPlayer({ file, className }, ref) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    // Create and cleanup object URL
    useEffect(() => {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }, [file]);

    if (!objectUrl) return null;

    return (
      <video
        ref={ref}
        src={objectUrl}
        className={`w-full rounded-lg bg-black max-h-[50vh] object-contain ${className ?? ''}`.trim()}
        playsInline
        preload="metadata"
      />
    );
  },
);
