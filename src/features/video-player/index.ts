// Context & Hooks
export {
  VideoProvider,
  useVideo,
  useVideoState,
  type VideoState,
  type VideoActions,
  type VideoContextValue,
} from './context/VideoContext';

// Viewport interpolation (per-Video with absolute frame numbers)
export {
  useViewportInterpolation,
  interpolateViewport,
  viewportToTransform,
} from './hooks/useViewportInterpolation';

// Video-wide viewport interpolation (simplified - no inheritance needed)
export {
  useVideoViewportInterpolation,
  useSubstepViewportInterpolation, // Legacy alias
  interpolateVideoViewport,
  type VideoViewportResult,
} from './hooks/useSubstepViewportInterpolation';

// Playback viewport (for video playback)
export { usePlaybackViewport } from './hooks/usePlaybackViewport';

// Frame jump store (configurable jump mode for Stream Deck)
export {
  useFrameJumpStore,
  getJumpFrames,
  type FrameJumpMode,
} from './store/frameJumpStore';

// Video shortcuts hook (-, +, F keys)
export { useVideoShortcuts } from './hooks/useVideoShortcuts';

// Components
export { VideoPlayer } from './components/VideoPlayer';
export { PlaybackControls } from './components/PlaybackControls';
