import { useState, useCallback, useEffect } from 'react';

export type VideoResolution = '480p' | '720p' | '1080p';
export type ResolutionPreference = 'auto' | VideoResolution;

const RESOLUTION_STORAGE_KEY = 'montavis-preferred-resolution';

const VALID_RESOLUTIONS: ResolutionPreference[] = ['auto', '480p', '720p', '1080p'];

/**
 * Detect optimal resolution based on screen width
 * - Phone (< 768px): 480p
 * - Tablet (768-1024px): 720p
 * - Desktop (> 1024px): 1080p
 */
function detectOptimalResolution(): VideoResolution {
  if (typeof window === 'undefined') return '1080p';

  const width = window.innerWidth;

  if (width < 768) {
    return '480p';
  } else if (width <= 1024) {
    return '720p';
  }
  return '1080p';
}

function getStoredPreference(): ResolutionPreference {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(RESOLUTION_STORAGE_KEY);
  if (stored && VALID_RESOLUTIONS.includes(stored as ResolutionPreference)) {
    return stored as ResolutionPreference;
  }
  return 'auto';
}

export function usePreferredResolution() {
  const [preference, setPreferenceState] = useState<ResolutionPreference>(getStoredPreference);
  const [detectedResolution, setDetectedResolution] = useState<VideoResolution>(detectOptimalResolution);

  // Update detected resolution on window resize
  useEffect(() => {
    function handleResize() {
      setDetectedResolution(detectOptimalResolution());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setPreference = useCallback((newPreference: ResolutionPreference) => {
    setPreferenceState(newPreference);
    localStorage.setItem(RESOLUTION_STORAGE_KEY, newPreference);
  }, []);

  // The actual resolution to use (resolves 'auto' to detected)
  const resolvedResolution: VideoResolution =
    preference === 'auto' ? detectedResolution : preference;

  return {
    preference,
    setPreference,
    resolvedResolution,
    detectedResolution,
  };
}
