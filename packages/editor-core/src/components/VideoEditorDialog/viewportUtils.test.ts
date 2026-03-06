import { describe, it, expect } from 'vitest';
import {
  computeLetterboxBounds,
  timeToFrame,
  frameToTime,
  MIN_VIEWPORT_SIZE,
  VIDEO_FPS,
} from './viewportUtils';

describe('viewportUtils', () => {
  describe('computeLetterboxBounds', () => {
    it('returns centered bounds for wider video (pillarbox)', () => {
      // 16:9 video in 800x800 container
      const b = computeLetterboxBounds(800, 800, 1920, 1080);
      expect(b.width).toBe(800);
      expect(b.height).toBeCloseTo(450, 0);
      expect(b.offsetX).toBe(0);
      expect(b.offsetY).toBeCloseTo(175, 0);
    });

    it('returns centered bounds for taller video (letterbox)', () => {
      // 9:16 video in 800x800 container
      const b = computeLetterboxBounds(800, 800, 1080, 1920);
      expect(b.height).toBe(800);
      expect(b.width).toBe(450);
      expect(b.offsetX).toBe(175);
      expect(b.offsetY).toBe(0);
    });

    it('fills container when aspect ratios match', () => {
      const b = computeLetterboxBounds(800, 450, 1920, 1080);
      expect(b.width).toBeCloseTo(800, 0);
      expect(b.height).toBeCloseTo(450, 0);
      expect(b.offsetX).toBeCloseTo(0, 0);
      expect(b.offsetY).toBeCloseTo(0, 0);
    });

    it('returns zeros for invalid dimensions', () => {
      const b = computeLetterboxBounds(0, 0, 1920, 1080);
      expect(b).toEqual({ offsetX: 0, offsetY: 0, width: 0, height: 0 });
    });
  });

  describe('timeToFrame', () => {
    it('converts seconds to frame number', () => {
      expect(timeToFrame(2.5, 30)).toBe(75);
    });

    it('floors fractional frames', () => {
      expect(timeToFrame(1.01, 30)).toBe(30);
    });
  });

  describe('frameToTime', () => {
    it('converts frame number to seconds', () => {
      expect(frameToTime(90, 30)).toBe(3);
    });
  });

  describe('constants', () => {
    it('MIN_VIEWPORT_SIZE is 0.05', () => {
      expect(MIN_VIEWPORT_SIZE).toBe(0.05);
    });

    it('VIDEO_FPS is 30', () => {
      expect(VIDEO_FPS).toBe(30);
    });
  });
});
