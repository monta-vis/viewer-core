import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';

export interface VideoState {
  /** Video source URL */
  src: string | null;
  /** Current playback time in seconds */
  currentTime: number;
  /** Current frame number (derived from time * fps) */
  currentFrame: number;
  /** Total duration in seconds */
  duration: number;
  /** Total frame count */
  totalFrames: number;
  /** Frames per second */
  fps: number;
  /** Is video playing */
  isPlaying: boolean;
  /** Playback speed multiplier */
  playbackSpeed: number;
  /** Is video loaded and ready */
  isReady: boolean;
  /** Is currently seeking (for UI feedback) */
  isSeeking: boolean;
  /** Video failed to load (e.g. file not found) */
  hasError: boolean;
  /** Is audio muted */
  isMuted: boolean;
}

export interface VideoActions {
  /** Load a video source */
  loadVideo: (src: string, fps?: number) => void;
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Toggle play/pause */
  togglePlayback: () => void;
  /** Seek to specific time in seconds (precise, may be slower) */
  seek: (time: number) => void;
  /** Seek to specific frame number (precise, may be slower) */
  seekFrame: (frame: number) => void;
  /** Fast seek for scrubbing - uses fastSeek API when available (less precise but faster) */
  fastSeek: (time: number) => void;
  /** Fast seek to frame - optimized for timeline scrubbing */
  fastSeekFrame: (frame: number) => void;
  /** Step forward/backward by frame count */
  stepFrames: (delta: number) => void;
  /** Set playback speed */
  setPlaybackSpeed: (speed: number) => void;
  /** Get reference to video element */
  getVideoElement: () => HTMLVideoElement | null;
  /** Register video element reference, returns cleanup function */
  registerVideoElement: (element: HTMLVideoElement | null) => (() => void) | void;
  /** Start scrubbing mode - reduces state updates for performance */
  startScrubbing: () => void;
  /** Stop scrubbing mode - syncs final time state */
  stopScrubbing: () => void;
  /** Toggle audio mute */
  toggleMute: () => void;
}

export type VideoContextValue = VideoState & VideoActions;

const VideoContext = createContext<VideoContextValue | null>(null);

interface VideoProviderProps {
  children: ReactNode;
  /** Default FPS if video metadata doesn't provide it */
  defaultFps?: number;
}

// Minimum interval between fast seeks (ms) - prevents overwhelming the decoder
const FAST_SEEK_THROTTLE_MS = 16; // ~60fps max seek rate
// Minimum interval between UI state updates during scrubbing (ms)
const UI_UPDATE_THROTTLE_MS = 50; // ~20fps max UI update rate

export function VideoProvider({ children, defaultFps = 30 }: VideoProviderProps) {
  // Video element reference
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Throttling refs for fast seek
  const lastFastSeekTimeRef = useRef<number>(0);
  const pendingSeekRef = useRef<number | null>(null);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for stepFrames - waits for seeked event instead of arbitrary throttle
  const pendingStepDeltaRef = useRef<number>(0);
  const isStepSeekingRef = useRef<boolean>(false);

  // Scrubbing mode refs - reduces state updates for better performance
  const isScrubbingRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(0);
  const lastUIUpdateRef = useRef<number>(0);

  // State
  const [src, setSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fps, setFps] = useState(defaultFps);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Derived values
  const currentFrame = Math.floor(currentTime * fps);
  const totalFrames = Math.floor(duration * fps);

  // Use requestAnimationFrame for smooth time updates during playback
  useEffect(() => {
    if (!isPlaying || !videoRef.current) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const updateTime = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
      rafIdRef.current = requestAnimationFrame(updateTime);
    };

    rafIdRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying]);

  // Register video element
  const registerVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;

    if (element) {
      element.muted = true;
      // Set up event listeners (timeupdate only as fallback when paused)
      const handleTimeUpdate = () => {
        // Only update when paused (RAF handles playing state)
        if (element.paused) {
          setCurrentTime(element.currentTime);
        }
      };
      const handleDurationChange = () => setDuration(element.duration || 0);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => {
        setIsPlaying(false);
        // Sync final position when paused
        setCurrentTime(element.currentTime);
      };
      const handleLoadedMetadata = () => {
        setDuration(element.duration || 0);
        setIsReady(true);
      };
      const handleCanPlay = () => {
        // Also check duration here in case loadedmetadata was missed
        if (element.duration && element.duration > 0) {
          setDuration(element.duration);
          setIsReady(true);
        }
      };
      const handleSeeking = () => setIsSeeking(true);
      const handleSeeked = () => {
        setIsSeeking(false);
        // During scrubbing, skip state update to prevent re-render storm
        if (!isScrubbingRef.current) {
          setCurrentTime(element.currentTime);
        }
        // Always update ref for accurate tracking
        currentTimeRef.current = element.currentTime;
      };
      const handleError = () => setHasError(true);

      element.addEventListener('timeupdate', handleTimeUpdate);
      element.addEventListener('durationchange', handleDurationChange);
      element.addEventListener('play', handlePlay);
      element.addEventListener('pause', handlePause);
      element.addEventListener('loadedmetadata', handleLoadedMetadata);
      element.addEventListener('canplay', handleCanPlay);
      element.addEventListener('seeking', handleSeeking);
      element.addEventListener('seeked', handleSeeked);
      element.addEventListener('error', handleError);

      // Check if metadata already loaded (element was created before registration)
      if (element.readyState >= 1 && element.duration > 0) {
        setDuration(element.duration);
        setIsReady(true);
      }

      return () => {
        element.removeEventListener('timeupdate', handleTimeUpdate);
        element.removeEventListener('durationchange', handleDurationChange);
        element.removeEventListener('play', handlePlay);
        element.removeEventListener('pause', handlePause);
        element.removeEventListener('loadedmetadata', handleLoadedMetadata);
        element.removeEventListener('canplay', handleCanPlay);
        element.removeEventListener('seeking', handleSeeking);
        element.removeEventListener('seeked', handleSeeked);
        element.removeEventListener('error', handleError);
      };
    }
  }, []);

  // Actions
  const loadVideo = useCallback((newSrc: string, newFps?: number) => {
    setSrc(newSrc);
    if (newFps) setFps(newFps);
    setIsReady(false);
    setHasError(false);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('Video play failed:', error);
        });
      }
    }
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  }, [duration]);

  const seekFrame = useCallback((frame: number) => {
    if (!videoRef.current) return;
    // Add small offset to ensure we land on the correct frame
    const time = (frame + 0.001) / fps;
    const clampedTime = Math.max(0, Math.min(time, duration));
    videoRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [fps, duration]);

  /**
   * Fast seek optimized for scrubbing - uses browser's fastSeek API when available.
   * Less precise but much faster for 4K and high-resolution videos.
   * Throttled to prevent overwhelming the video decoder.
   * In scrubbing mode, UI updates are further throttled to prevent re-render storms.
   */
  const fastSeek = useCallback((time: number) => {
    if (!videoRef.current) return;

    const clampedTime = Math.max(0, Math.min(time, duration));
    const now = performance.now();
    const timeSinceLastSeek = now - lastFastSeekTimeRef.current;

    // Always update the ref for accurate tracking
    currentTimeRef.current = clampedTime;

    // Store the pending seek target
    pendingSeekRef.current = clampedTime;

    // Helper to perform actual video seek
    const performSeek = (targetTime: number) => {
      if (!videoRef.current) return;
      if ('fastSeek' in videoRef.current && typeof videoRef.current.fastSeek === 'function') {
        videoRef.current.fastSeek(targetTime);
      } else {
        videoRef.current.currentTime = targetTime;
      }
    };

    // Helper to update UI state (throttled during scrubbing)
    const updateUIState = (targetTime: number) => {
      if (isScrubbingRef.current) {
        // In scrubbing mode, throttle UI updates to prevent re-render storm
        const timeSinceLastUI = now - lastUIUpdateRef.current;
        if (timeSinceLastUI >= UI_UPDATE_THROTTLE_MS) {
          setCurrentTime(targetTime);
          lastUIUpdateRef.current = now;
        }
      } else {
        // Normal mode - update immediately
        setCurrentTime(targetTime);
      }
    };

    // If we're within the throttle window, schedule a delayed seek
    if (timeSinceLastSeek < FAST_SEEK_THROTTLE_MS) {
      // Clear any existing timeout
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }

      // Schedule the seek for when throttle window expires
      seekTimeoutRef.current = setTimeout(() => {
        if (pendingSeekRef.current !== null && videoRef.current) {
          const targetTime = pendingSeekRef.current;
          performSeek(targetTime);
          lastFastSeekTimeRef.current = performance.now();
          pendingSeekRef.current = null;
          // Update UI only if not in scrubbing mode (scrubbing has its own throttle)
          if (!isScrubbingRef.current) {
            setCurrentTime(targetTime);
          }
        }
      }, FAST_SEEK_THROTTLE_MS - timeSinceLastSeek);

      // Update displayed time (throttled in scrubbing mode)
      updateUIState(clampedTime);
      return;
    }

    // Execute seek immediately
    lastFastSeekTimeRef.current = now;
    pendingSeekRef.current = null;
    performSeek(clampedTime);
    updateUIState(clampedTime);
  }, [duration]);

  /**
   * Fast seek to frame - optimized for timeline scrubbing.
   */
  const fastSeekFrame = useCallback((frame: number) => {
    const time = (frame + 0.001) / fps;
    fastSeek(time);
  }, [fps, fastSeek]);

  /**
   * Step frames with seeked-event-based flow.
   * Waits for video to finish seeking before next step.
   * Accumulates delta when key is held faster than video can decode.
   */
  const stepFrames = useCallback((delta: number) => {
    if (!videoRef.current) return;

    // Accumulate the delta
    pendingStepDeltaRef.current += delta;

    // If already seeking, just accumulate - the seeked handler will apply it
    if (isStepSeekingRef.current) {
      // Update UI immediately for responsive feel
      const actualFrame = Math.round(videoRef.current.currentTime * fps);
      const previewFrame = Math.max(0, Math.min(actualFrame + pendingStepDeltaRef.current, totalFrames - 1));
      const previewTime = (previewFrame + 0.001) / fps;
      setCurrentTime(Math.min(previewTime, duration));
      return;
    }

    // Start seeking
    isStepSeekingRef.current = true;
    const totalDelta = pendingStepDeltaRef.current;
    pendingStepDeltaRef.current = 0;

    const actualTime = videoRef.current.currentTime;
    const actualFrame = Math.round(actualTime * fps);
    const newFrame = actualFrame + totalDelta;
    const clampedFrame = Math.max(0, Math.min(newFrame, totalFrames - 1));
    const newTime = (clampedFrame + 0.001) / fps;

    // Set up one-time seeked handler
    const video = videoRef.current;
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      isStepSeekingRef.current = false;
      setCurrentTime(video.currentTime);

      // If more delta accumulated while seeking, continue
      if (pendingStepDeltaRef.current !== 0) {
        // Use setTimeout to avoid call stack issues
        setTimeout(() => stepFrames(0), 0);
      }
    };
    video.addEventListener('seeked', onSeeked);

    video.currentTime = Math.min(newTime, duration);
    setCurrentTime(Math.min(newTime, duration));
  }, [fps, totalFrames, duration]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, []);

  const getVideoElement = useCallback(() => videoRef.current, []);

  /**
   * Start scrubbing mode - reduces state updates for better performance.
   * Call this before rapid seeking (e.g., playhead drag, timeline scroll).
   */
  const startScrubbing = useCallback(() => {
    isScrubbingRef.current = true;
    lastUIUpdateRef.current = performance.now();
  }, []);

  /**
   * Stop scrubbing mode - syncs final time state.
   * Call this when scrubbing ends to ensure UI shows correct final position.
   */
  const stopScrubbing = useCallback(() => {
    isScrubbingRef.current = false;
    // Sync final position
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      currentTimeRef.current = videoRef.current.currentTime;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  }, []);

  // Context value
  const value: VideoContextValue = {
    // State
    src,
    currentTime,
    currentFrame,
    duration,
    totalFrames,
    fps,
    isPlaying,
    playbackSpeed,
    isReady,
    isSeeking,
    hasError,
    isMuted,
    // Actions
    loadVideo,
    play,
    pause,
    togglePlayback,
    seek,
    seekFrame,
    fastSeek,
    fastSeekFrame,
    stepFrames,
    setPlaybackSpeed,
    getVideoElement,
    registerVideoElement,
    startScrubbing,
    stopScrubbing,
    toggleMute,
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo(): VideoContextValue {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}

/** Hook for components that only need to read video state (no actions). */
export function useVideoState(): VideoState {
  const ctx = useVideo();
  return {
    src: ctx.src,
    currentTime: ctx.currentTime,
    currentFrame: ctx.currentFrame,
    duration: ctx.duration,
    totalFrames: ctx.totalFrames,
    fps: ctx.fps,
    isPlaying: ctx.isPlaying,
    playbackSpeed: ctx.playbackSpeed,
    isReady: ctx.isReady,
    isSeeking: ctx.isSeeking,
    hasError: ctx.hasError,
    isMuted: ctx.isMuted,
  };
}
