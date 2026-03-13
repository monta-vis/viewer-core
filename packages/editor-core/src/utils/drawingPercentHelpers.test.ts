import { describe, it, expect } from 'vitest';
import {
  prepareSections,
  frameToAccumulatedFrame,
  frameToSubstepPercent,
  substepPercentToFrame,
} from './drawingPercentHelpers';

describe('drawingPercentHelpers', () => {
  describe('prepareSections', () => {
    it('sorts sections by startFrame', () => {
      const result = prepareSections([
        { startFrame: 100, endFrame: 200 },
        { startFrame: 0, endFrame: 50 },
      ]);
      expect(result.sorted[0].startFrame).toBe(0);
      expect(result.sorted[1].startFrame).toBe(100);
    });

    it('computes totalFrames across all sections', () => {
      const result = prepareSections([
        { startFrame: 0, endFrame: 50 },
        { startFrame: 100, endFrame: 200 },
      ]);
      expect(result.totalFrames).toBe(150); // 50 + 100
    });

    it('handles empty sections', () => {
      const result = prepareSections([]);
      expect(result.sorted).toEqual([]);
      expect(result.totalFrames).toBe(0);
    });
  });

  describe('frameToSubstepPercent', () => {
    describe('single section', () => {
      const sections = [{ startFrame: 0, endFrame: 100 }];

      it('maps start to 0%', () => {
        expect(frameToSubstepPercent(0, sections)).toBe(0);
      });

      it('maps end to 100%', () => {
        expect(frameToSubstepPercent(100, sections)).toBe(100);
      });

      it('maps midpoint to 50%', () => {
        expect(frameToSubstepPercent(50, sections)).toBe(50);
      });
    });

    describe('multiple sections with gap', () => {
      // Section A: frames 0-50 (50 frames), Section B: frames 100-200 (100 frames)
      // Total = 150 frames
      const sections = [
        { startFrame: 0, endFrame: 50 },
        { startFrame: 100, endFrame: 200 },
      ];

      it('maps frame 0 to 0%', () => {
        expect(frameToSubstepPercent(0, sections)).toBe(0);
      });

      it('maps end of section A correctly', () => {
        // Frame 50 = end of first section = 50/150 * 100 = 33.33%
        expect(frameToSubstepPercent(50, sections)).toBeCloseTo(33.33, 1);
      });

      it('maps start of section B correctly', () => {
        // Frame 100 = start of second section = 50/150 * 100 = 33.33%
        expect(frameToSubstepPercent(100, sections)).toBeCloseTo(33.33, 1);
      });

      it('maps midpoint of section B correctly', () => {
        // Frame 150 = 50 + 50 = 100 elapsed → 100/150 * 100 = 66.67%
        expect(frameToSubstepPercent(150, sections)).toBeCloseTo(66.67, 1);
      });

      it('returns 100% past all sections', () => {
        expect(frameToSubstepPercent(300, sections)).toBe(100);
      });
    });

    it('accepts PreparedSections', () => {
      const prepared = prepareSections([{ startFrame: 0, endFrame: 100 }]);
      expect(frameToSubstepPercent(50, prepared)).toBe(50);
    });

    it('returns 0 for zero total frames', () => {
      expect(frameToSubstepPercent(50, [])).toBe(0);
    });
  });

  describe('frameToAccumulatedFrame', () => {
    it('returns 0 for frame before all sections', () => {
      const sections = [
        { startFrame: 150, endFrame: 300 },
        { startFrame: 450, endFrame: 600 },
      ];
      expect(frameToAccumulatedFrame(100, sections)).toBe(0);
    });

    it('returns accumulated frame within first section', () => {
      const sections = [
        { startFrame: 150, endFrame: 300 },
        { startFrame: 450, endFrame: 600 },
      ];
      // Frame 200 is 50 frames into section 1
      expect(frameToAccumulatedFrame(200, sections)).toBe(50);
    });

    it('returns accumulated frame spanning across sections', () => {
      const sections = [
        { startFrame: 150, endFrame: 300 },
        { startFrame: 450, endFrame: 600 },
      ];
      // Section 1 = 150 frames. Frame 500 is 50 into section 2 → 150 + 50 = 200
      expect(frameToAccumulatedFrame(500, sections)).toBe(200);
    });

    it('returns totalFrames for frame past all sections', () => {
      const sections = [
        { startFrame: 150, endFrame: 300 },
        { startFrame: 450, endFrame: 600 },
      ];
      // Total = 150 + 150 = 300
      expect(frameToAccumulatedFrame(700, sections)).toBe(300);
    });

    it('returns 0 for empty sections', () => {
      expect(frameToAccumulatedFrame(50, [])).toBe(0);
    });

    it('accepts PreparedSections', () => {
      const prepared = prepareSections([
        { startFrame: 150, endFrame: 300 },
        { startFrame: 450, endFrame: 600 },
      ]);
      expect(frameToAccumulatedFrame(200, prepared)).toBe(50);
    });
  });

  describe('substepPercentToFrame', () => {
    describe('single section', () => {
      const sections = [{ startFrame: 0, endFrame: 100 }];

      it('maps 0% to frame 0', () => {
        expect(substepPercentToFrame(0, sections)).toBe(0);
      });

      it('maps 100% to frame 100', () => {
        expect(substepPercentToFrame(100, sections)).toBe(100);
      });

      it('maps 50% to frame 50', () => {
        expect(substepPercentToFrame(50, sections)).toBe(50);
      });
    });

    describe('multiple sections with gap', () => {
      const sections = [
        { startFrame: 0, endFrame: 50 },
        { startFrame: 100, endFrame: 200 },
      ];

      it('maps 0% to frame 0', () => {
        expect(substepPercentToFrame(0, sections)).toBe(0);
      });

      it('maps ~33.33% to frame 50 (end of section A)', () => {
        const percent = (50 / 150) * 100;
        expect(substepPercentToFrame(percent, sections)).toBe(50);
      });

      it('maps 100% to frame 200 (end of section B)', () => {
        expect(substepPercentToFrame(100, sections)).toBe(200);
      });
    });

    it('returns 0 for empty sections', () => {
      expect(substepPercentToFrame(50, [])).toBe(0);
    });

    it('accepts PreparedSections', () => {
      const prepared = prepareSections([{ startFrame: 0, endFrame: 100 }]);
      expect(substepPercentToFrame(50, prepared)).toBe(50);
    });
  });
});
