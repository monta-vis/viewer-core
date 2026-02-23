import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { VideoProvider, useVideo, useVideoState } from './VideoContext';
import { createMockVideoElement } from '@/test/mocks';

describe('VideoContext', () => {
  describe('useVideo hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useVideo());
      }).toThrow('useVideo must be used within a VideoProvider');

      consoleSpy.mockRestore();
    });

    it('provides initial state', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      expect(result.current.src).toBeNull();
      expect(result.current.currentTime).toBe(0);
      expect(result.current.currentFrame).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.totalFrames).toBe(0);
      expect(result.current.fps).toBe(30); // default fps
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.playbackSpeed).toBe(1);
      expect(result.current.isReady).toBe(false);
    });

    it('uses custom defaultFps', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <VideoProvider defaultFps={60}>{children}</VideoProvider>
      );

      const { result } = renderHook(() => useVideo(), { wrapper });

      expect(result.current.fps).toBe(60);
    });
  });

  describe('loadVideo', () => {
    it('sets video source', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      act(() => {
        result.current.loadVideo('http://example.com/video.mp4');
      });

      expect(result.current.src).toBe('http://example.com/video.mp4');
      expect(result.current.isReady).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.isPlaying).toBe(false);
    });

    it('sets custom fps when provided', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      act(() => {
        result.current.loadVideo('http://example.com/video.mp4', 24);
      });

      expect(result.current.fps).toBe(24);
    });
  });

  describe('registerVideoElement', () => {
    it('registers video element and returns cleanup function', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });
      let cleanup: (() => void) | void = undefined;

      act(() => {
        cleanup = result.current.registerVideoElement(mockVideo);
      });

      expect(result.current.getVideoElement()).toBe(mockVideo);
      expect(typeof cleanup).toBe('function');

      // Cleanup
      act(() => {
        if (cleanup) cleanup();
      });
    });

    it('sets up event listeners', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      expect(mockVideo.addEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('durationchange', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('seeked', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('updates duration on loadedmetadata event', async () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 120 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      // Trigger loadedmetadata event
      act(() => {
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      await waitFor(() => {
        expect(result.current.duration).toBe(120);
        expect(result.current.isReady).toBe(true);
      });
    });
  });

  describe('playback controls', () => {
    it('play() calls video.play()', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement();

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      act(() => {
        result.current.play();
      });

      expect(mockVideo.play).toHaveBeenCalled();
    });

    it('pause() calls video.pause()', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement();

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      act(() => {
        result.current.pause();
      });

      expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('togglePlayback toggles between play and pause', async () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ paused: true });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      // Start playing
      act(() => {
        result.current.togglePlayback();
      });

      expect(mockVideo.play).toHaveBeenCalled();

      // Simulate play event
      act(() => {
        mockVideo.dispatchEvent(new Event('play'));
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });

      // Pause
      act(() => {
        result.current.togglePlayback();
      });

      expect(mockVideo.pause).toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('seeks to specified time', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      act(() => {
        result.current.seek(50);
      });

      expect(result.current.currentTime).toBe(50);
    });

    it('clamps seek time to valid range', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      // Test below range
      act(() => {
        result.current.seek(-10);
      });
      expect(result.current.currentTime).toBe(0);

      // Test above range
      act(() => {
        result.current.seek(200);
      });
      expect(result.current.currentTime).toBe(100);
    });
  });

  describe('seekFrame', () => {
    it('seeks to frame by converting to time', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      // At 30fps, frame 30 should be ~1 second
      act(() => {
        result.current.seekFrame(30);
      });

      // Should be slightly over 1 second due to the 0.001 offset for frame accuracy
      expect(result.current.currentTime).toBeCloseTo(1.00033, 3);
    });
  });

  describe('stepFrames', () => {
    it('steps forward by frame count', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, currentTime: 1 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      act(() => {
        result.current.stepFrames(10);
      });

      // Should advance by 10 frames at 30fps
      expect(result.current.currentTime).toBeGreaterThan(1);
    });

    it('steps backward by negative frame count', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, currentTime: 2 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      act(() => {
        result.current.stepFrames(-10);
      });

      expect(result.current.currentTime).toBeLessThan(2);
    });
  });

  describe('setPlaybackSpeed', () => {
    it('updates playback speed', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement();

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      act(() => {
        result.current.setPlaybackSpeed(2);
      });

      expect(result.current.playbackSpeed).toBe(2);
      expect(mockVideo.playbackRate).toBe(2);
    });
  });

  describe('derived values', () => {
    it('calculates currentFrame from currentTime and fps', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      act(() => {
        result.current.seek(1); // 1 second at 30fps = frame 30
      });

      expect(result.current.currentFrame).toBe(30);
    });

    it('calculates totalFrames from duration and fps', async () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 10 }); // 10 seconds

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      await waitFor(() => {
        // 10 seconds at 30fps = 300 frames
        expect(result.current.totalFrames).toBe(300);
      });
    });
  });

  describe('useVideoState hook', () => {
    it('returns only state properties (no actions)', () => {
      const { result } = renderHook(() => useVideoState(), {
        wrapper: VideoProvider,
      });

      // Should have state properties
      expect(result.current).toHaveProperty('src');
      expect(result.current).toHaveProperty('currentTime');
      expect(result.current).toHaveProperty('currentFrame');
      expect(result.current).toHaveProperty('duration');
      expect(result.current).toHaveProperty('totalFrames');
      expect(result.current).toHaveProperty('fps');
      expect(result.current).toHaveProperty('isPlaying');
      expect(result.current).toHaveProperty('playbackSpeed');
      expect(result.current).toHaveProperty('isReady');

      // Should not have action methods
      expect(result.current).not.toHaveProperty('loadVideo');
      expect(result.current).not.toHaveProperty('play');
      expect(result.current).not.toHaveProperty('pause');
      expect(result.current).not.toHaveProperty('seek');
    });

    it('includes isSeeking state', () => {
      const { result } = renderHook(() => useVideoState(), {
        wrapper: VideoProvider,
      });

      expect(result.current).toHaveProperty('isSeeking');
      expect(result.current.isSeeking).toBe(false);
    });
  });

  describe('scrubbing mode', () => {
    it('startScrubbing and stopScrubbing control scrubbing mode', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, currentTime: 50 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      // Start scrubbing
      act(() => {
        result.current.startScrubbing();
      });

      // Stop scrubbing should sync final position
      act(() => {
        result.current.stopScrubbing();
      });

      expect(result.current.currentTime).toBe(50);
    });

    it('stopScrubbing syncs current video position', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, currentTime: 0 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      act(() => {
        result.current.startScrubbing();
      });

      // Change video time externally
      mockVideo.currentTime = 75;

      act(() => {
        result.current.stopScrubbing();
      });

      expect(result.current.currentTime).toBe(75);
    });
  });

  describe('fastSeek', () => {
    it('uses fastSeek API when available', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });
      mockVideo.fastSeek = vi.fn();

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      act(() => {
        result.current.fastSeek(50);
      });

      expect(mockVideo.fastSeek).toHaveBeenCalledWith(50);
    });

    it('falls back to currentTime when fastSeek not available', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });
      // fastSeek not defined

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      act(() => {
        result.current.fastSeek(50);
      });

      expect(result.current.currentTime).toBe(50);
    });

    it('clamps seek time to valid range', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      // Negative time
      act(() => {
        result.current.fastSeek(-10);
      });
      expect(result.current.currentTime).toBe(0);

      // Over duration
      act(() => {
        result.current.fastSeek(200);
      });
      expect(result.current.currentTime).toBe(100);
    });
  });

  describe('fastSeekFrame', () => {
    it('converts frame to time and fast seeks', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      // At 30fps, frame 60 = 2 seconds + small offset
      act(() => {
        result.current.fastSeekFrame(60);
      });

      expect(result.current.currentTime).toBeCloseTo(2.00033, 3);
    });
  });

  describe('event handlers', () => {
    it('handles durationchange event', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 50 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      // Change duration
      mockVideo.duration = 150;

      act(() => {
        mockVideo.dispatchEvent(new Event('durationchange'));
      });

      expect(result.current.duration).toBe(150);
    });

    it('handles canplay event and sets isReady', async () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      act(() => {
        mockVideo.dispatchEvent(new Event('canplay'));
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
        expect(result.current.duration).toBe(100);
      });
    });

    it('handles seeking event', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      act(() => {
        mockVideo.dispatchEvent(new Event('seeking'));
      });

      expect(result.current.isSeeking).toBe(true);
    });

    it('handles seeked event and resets isSeeking', async () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, currentTime: 50 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      // Start seeking
      act(() => {
        mockVideo.dispatchEvent(new Event('seeking'));
      });

      expect(result.current.isSeeking).toBe(true);

      // Finish seeking
      act(() => {
        mockVideo.dispatchEvent(new Event('seeked'));
      });

      await waitFor(() => {
        expect(result.current.isSeeking).toBe(false);
        expect(result.current.currentTime).toBe(50);
      });
    });

    it('handles pause event and syncs currentTime', async () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, currentTime: 30 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      // Simulate play then pause
      act(() => {
        mockVideo.dispatchEvent(new Event('play'));
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });

      mockVideo.currentTime = 45;

      act(() => {
        mockVideo.dispatchEvent(new Event('pause'));
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(false);
        expect(result.current.currentTime).toBe(45);
      });
    });

    it('handles error event without throwing', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement();

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      // Should not throw
      expect(() => {
        act(() => {
          mockVideo.dispatchEvent(new Event('error'));
        });
      }).not.toThrow();
    });

    it('handles timeupdate only when paused', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, paused: true });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      mockVideo.currentTime = 25;

      act(() => {
        mockVideo.dispatchEvent(new Event('timeupdate'));
      });

      expect(result.current.currentTime).toBe(25);
    });
  });

  describe('play error handling', () => {
    it('handles play promise rejection gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement();
      mockVideo.play = vi.fn().mockReturnValue(Promise.reject(new Error('NotAllowedError')));

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      // Should not throw
      expect(() => {
        act(() => {
          result.current.play();
        });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('registerVideoElement null handling', () => {
    it('handles null element', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      // Should not throw
      expect(() => {
        act(() => {
          result.current.registerVideoElement(null);
        });
      }).not.toThrow();

      expect(result.current.getVideoElement()).toBeNull();
    });
  });

  describe('stepFrames edge cases', () => {
    it('clamps to totalFrames - 1', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 10, currentTime: 9.9 }); // near end

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      // Try to step past end
      act(() => {
        result.current.stepFrames(1000);
      });

      // Should be clamped near duration
      expect(result.current.currentTime).toBeLessThanOrEqual(10);
    });

    it('clamps to frame 0 when stepping backward past start', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 100, currentTime: 0.1 }); // near start

      act(() => {
        result.current.registerVideoElement(mockVideo);
        mockVideo.dispatchEvent(new Event('loadedmetadata'));
      });

      // Try to step before start
      act(() => {
        result.current.stepFrames(-1000);
      });

      // Should be clamped to 0
      expect(result.current.currentTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on cleanup', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement();

      let cleanup: (() => void) | void = undefined;

      act(() => {
        cleanup = result.current.registerVideoElement(mockVideo);
      });

      // Run cleanup
      act(() => {
        if (cleanup) cleanup();
      });

      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('durationchange', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('canplay', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('seeking', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('seeked', expect.any(Function));
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('already loaded video', () => {
    it('sets duration and isReady if video already loaded', () => {
      const { result } = renderHook(() => useVideo(), {
        wrapper: VideoProvider,
      });

      const mockVideo = createMockVideoElement({ duration: 200, readyState: 4 });

      act(() => {
        result.current.registerVideoElement(mockVideo);
      });

      expect(result.current.duration).toBe(200);
      expect(result.current.isReady).toBe(true);
    });
  });
});
