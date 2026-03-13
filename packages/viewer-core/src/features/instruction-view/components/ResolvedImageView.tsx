import type { ResolvedImage } from '@/lib/mediaResolver';
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
 */
export function ResolvedImageView({ image, alt = '', className, onCapture, onLoad }: ResolvedImageViewProps) {
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
      onCapture={onCapture}
    />
  );
}
