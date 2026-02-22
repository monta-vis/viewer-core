import { useEffect, useRef, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

import { useVideo } from '../context/VideoContext';

interface VideoPlayerProps {
  /** Additional CSS classes */
  className?: string;
  /** Called when video loads successfully */
  onLoad?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Optional viewport transform style (for Ken Burns effect) */
  viewportStyle?: CSSProperties;
  /** Show blurred video as background for letterbox/pillarbox areas */
  blurredBackground?: boolean;
  /** Called when user clicks "Locate Video" to relink a missing file (Electron only) */
  onRelink?: () => void;
}

/**
 * VideoPlayer Component
 *
 * Renders the HTML5 video element and registers it with VideoContext.
 * All playback control happens through the context, not props.
 */
export function VideoPlayer({ className, onLoad, onError, viewportStyle, blurredBackground = false, onRelink }: VideoPlayerProps) {
  const { t } = useTranslation();
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const { src, playbackSpeed, registerVideoElement, hasError } = useVideo();

  // Register video element with context when src changes (element is only rendered when src exists)
  useEffect(() => {
    const element = videoElementRef.current;
    if (!element) return;

    const cleanup = registerVideoElement(element);

    return () => {
      if (cleanup) cleanup();
      registerVideoElement(null);
    };
  }, [src, registerVideoElement]); // Re-register when src changes since element may be new

  // Sync playback speed when it changes
  useEffect(() => {
    if (videoElementRef.current) {
      videoElementRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, src]);

  // Sync background video with main video
  useEffect(() => {
    if (!blurredBackground || !backgroundVideoRef.current || !videoElementRef.current) return;

    const mainVideo = videoElementRef.current;
    const bgVideo = backgroundVideoRef.current;

    const syncTime = () => {
      if (Math.abs(bgVideo.currentTime - mainVideo.currentTime) > 0.1) {
        bgVideo.currentTime = mainVideo.currentTime;
      }
    };

    const syncPlayState = () => {
      if (mainVideo.paused) {
        bgVideo.pause();
      } else {
        bgVideo.play().catch(() => {});
      }
      syncTime();
    };

    mainVideo.addEventListener('play', syncPlayState);
    mainVideo.addEventListener('pause', syncPlayState);
    mainVideo.addEventListener('seeked', syncTime);
    mainVideo.addEventListener('timeupdate', syncTime);

    return () => {
      mainVideo.removeEventListener('play', syncPlayState);
      mainVideo.removeEventListener('pause', syncPlayState);
      mainVideo.removeEventListener('seeked', syncTime);
      mainVideo.removeEventListener('timeupdate', syncTime);
    };
  }, [blurredBackground, src]);

  const handleLoadedMetadata = () => {
    onLoad?.();
  };

  const handleError = () => {
    onError?.(new Error('Failed to load video'));
  };

  if (!src) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center bg-black text-[var(--color-text-muted)]',
          className
        )}
      >
        <p>No video loaded</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center gap-4 bg-black text-[var(--color-text-muted)]',
          className
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6" />
        </svg>
        <p className="text-sm font-medium">{t('editor.videoNotFound', 'Video Not Found')}</p>
        <p className="text-xs opacity-60">{t('editor.videoNotFoundDetail', 'The source video file could not be loaded.')}</p>
        {onRelink && (
          <button
            type="button"
            onClick={onRelink}
            className="mt-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            aria-label={t('editor.locateVideo', 'Locate Video')}
          >
            {t('editor.locateVideo', 'Locate Video')}
          </button>
        )}
      </div>
    );
  }

  if (blurredBackground) {
    return (
      <div className={clsx('relative overflow-hidden', className)}>
        {/* Blurred background video - fills entire container */}
        <video
          ref={backgroundVideoRef}
          src={src}
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
          muted
          playsInline
          preload="auto"
        />
        {/* Dark overlay to reduce brightness */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Main video - centered with object-contain */}
        <video
          ref={videoElementRef}
          src={src}
          className="relative w-full h-full object-contain"
          style={viewportStyle}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
          playsInline
          preload="auto"
        />
      </div>
    );
  }

  return (
    <video
      ref={videoElementRef}
      src={src}
      className={clsx('max-w-full max-h-full object-contain bg-black', className)}
      style={viewportStyle}
      onLoadedMetadata={handleLoadedMetadata}
      onError={handleError}
      playsInline
      preload="auto"
    />
  );
}
