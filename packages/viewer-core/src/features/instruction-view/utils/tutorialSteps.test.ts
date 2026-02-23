import { describe, it, expect } from 'vitest';
import {
  getInitialTutorialStep,
  advanceOnDrawerOpen,
  advanceOnDrawerClose,
  advanceOnSubstepClick,
} from './tutorialSteps';

describe('tutorialSteps', () => {
  describe('getInitialTutorialStep', () => {
    it('returns 0 when tutorial is enabled', () => {
      expect(getInitialTutorialStep(true)).toBe(0);
    });

    it('returns null when tutorial is disabled', () => {
      expect(getInitialTutorialStep(false)).toBe(null);
    });
  });

  describe('advanceOnDrawerOpen', () => {
    it('advances from step 0 to step 1', () => {
      expect(advanceOnDrawerOpen(0)).toBe(1);
    });

    it('does not change other steps', () => {
      expect(advanceOnDrawerOpen(1)).toBe(1);
      expect(advanceOnDrawerOpen(2)).toBe(2);
      expect(advanceOnDrawerOpen(null)).toBe(null);
    });
  });

  describe('advanceOnDrawerClose', () => {
    it('advances from step 1 to step 2', () => {
      expect(advanceOnDrawerClose(1)).toBe(2);
    });

    it('does not change other steps', () => {
      expect(advanceOnDrawerClose(0)).toBe(0);
      expect(advanceOnDrawerClose(2)).toBe(2);
      expect(advanceOnDrawerClose(null)).toBe(null);
    });
  });

  describe('advanceOnSubstepClick', () => {
    it('advances from step 2 to null (complete)', () => {
      expect(advanceOnSubstepClick(2)).toBe(null);
    });

    it('does not change other steps', () => {
      expect(advanceOnSubstepClick(0)).toBe(0);
      expect(advanceOnSubstepClick(1)).toBe(1);
      expect(advanceOnSubstepClick(null)).toBe(null);
    });
  });

  describe('full flow', () => {
    it('completes the tutorial: 0 → 1 → 2 → null', () => {
      let step = getInitialTutorialStep(true);
      expect(step).toBe(0);

      step = advanceOnDrawerOpen(step);
      expect(step).toBe(1);

      step = advanceOnDrawerClose(step);
      expect(step).toBe(2);

      step = advanceOnSubstepClick(step);
      expect(step).toBeNull();
    });
  });
});
