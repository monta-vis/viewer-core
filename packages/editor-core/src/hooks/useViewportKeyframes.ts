import { useCallback, useState } from 'react';
import {
  interpolateVideoViewport,
  type ViewportKeyframe,
  type ViewportKeyframeRow,
} from '@monta-vis/viewer-core';

export interface UseViewportKeyframesReturn {
  keyframes: ViewportKeyframeRow[];
  upsertAtFrame: (
    frame: number,
    viewport: { x: number; y: number; width: number; height: number },
  ) => void;
  deleteAtFrame: (frame: number) => void;
  toggleInterpolation: (frame: number) => void;
  getViewportAtFrame: (
    frame: number,
    videoAspectRatio?: number,
  ) => ViewportKeyframe;
  reset: (initial?: ViewportKeyframeRow[]) => void;
}

export function useViewportKeyframes(
  initial?: ViewportKeyframeRow[],
): UseViewportKeyframesReturn {
  const [keyframes, setKeyframes] = useState<ViewportKeyframeRow[]>(
    () => initial ?? [],
  );

  const upsertAtFrame = useCallback(
    (
      frame: number,
      viewport: { x: number; y: number; width: number; height: number },
    ) => {
      setKeyframes((prev) => {
        const idx = prev.findIndex((kf) => kf.frameNumber === frame);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...viewport };
          return updated;
        }
        return [
          ...prev,
          {
            id: `kf-${Date.now()}-${frame}`,
            videoSectionId: prev[0]?.videoSectionId ?? '',
            versionId: prev[0]?.versionId ?? '',
            frameNumber: frame,
            interpolation: 'hold' as const,
            ...viewport,
          },
        ].sort((a, b) => a.frameNumber - b.frameNumber);
      });
    },
    [],
  );

  const deleteAtFrame = useCallback((frame: number) => {
    setKeyframes((prev) => prev.filter((kf) => kf.frameNumber !== frame));
  }, []);

  const toggleInterpolation = useCallback((frame: number) => {
    setKeyframes((prev) =>
      prev.map((kf) =>
        kf.frameNumber === frame
          ? {
              ...kf,
              interpolation:
                kf.interpolation === 'linear' ? 'hold' : 'linear',
            }
          : kf,
      ),
    );
  }, []);

  const getViewportAtFrame = useCallback(
    (frame: number, videoAspectRatio?: number): ViewportKeyframe => {
      return interpolateVideoViewport(frame, keyframes, videoAspectRatio);
    },
    [keyframes],
  );

  const reset = useCallback((newKeyframes?: ViewportKeyframeRow[]) => {
    setKeyframes(newKeyframes ?? []);
  }, []);

  return {
    keyframes,
    upsertAtFrame,
    deleteAtFrame,
    toggleInterpolation,
    getViewportAtFrame,
    reset,
  };
}
