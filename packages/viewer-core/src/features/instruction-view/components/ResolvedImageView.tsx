import { useCallback } from 'react';
import type { ResolvedImage } from '@/lib/mediaResolver';
import { useMediaResolverOptional } from '@/lib/MediaResolverContext';
import { VideoFrameCapture } from './VideoFrameCapture';

interface ResolvedImageViewProps {
  image: ResolvedImage | null;
  alt?: string;
  className?: string;
  onCapture?: (size: { width: number; height: number }, dataUrl: string) => void;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * Renders a ResolvedImage — either as an <img> (url kind)
 * or as a <VideoFrameCapture> (frameCapture kind).
 *
 * When a frame cache is available on the resolver, captured frames
 * are automatically stored for future cache hits.
 */
export function ResolvedImageView({ image, alt = '', className, onCapture, onLoad }: ResolvedImageViewProps) {
  const resolver = useMediaResolverOptional();
  const frameCache = resolver?.frameCache;

  const handleCapture = useCallback(
    (size: { width: number; height: number }, dataUrl: string) => {
      // Store in frame cache if available
      if (frameCache && image?.kind === 'frameCapture') {
        const { videoId, frameNumber, cropArea } = image.data;
        frameCache.set({ videoId, frameNumber, cropArea }, dataUrl);
      }
      onCapture?.(size, dataUrl);
    },
    [frameCache, image, onCapture],
  );

  if (!image) return null;

  if (image.kind === 'url') {
    return (
      <img
        src={image.url}
        alt={alt}
        className={className}
        draggable={false}
        loading="lazy"
        onLoad={onLoad}
      />
    );
  }

  return (
    <VideoFrameCapture
      videoId={image.data.videoId}
      fps={image.data.fps}
      frameNumber={image.data.frameNumber}
      cropArea={image.data.cropArea}
      videoSrc={image.data.videoSrc}
      alt={alt}
      className={className}
      onCapture={handleCapture}
    />
  );
}
