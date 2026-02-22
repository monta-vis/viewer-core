import { describe, it, expect, beforeEach } from 'vitest';

import { useFrameJumpStore, getJumpFrames } from './frameJumpStore';

describe('frameJumpStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useFrameJumpStore.setState({ jumpMode: 1 });
  });

  it('should start with jumpMode of 1', () => {
    const state = useFrameJumpStore.getState();
    expect(state.jumpMode).toBe(1);
  });

  it('should cycle from 1 to 10', () => {
    useFrameJumpStore.getState().cycleJumpMode();
    expect(useFrameJumpStore.getState().jumpMode).toBe(10);
  });

  it('should cycle from 10 to fps', () => {
    useFrameJumpStore.getState().setJumpMode(10);
    useFrameJumpStore.getState().cycleJumpMode();
    expect(useFrameJumpStore.getState().jumpMode).toBe('fps');
  });

  it('should cycle from fps back to 1', () => {
    useFrameJumpStore.getState().setJumpMode('fps');
    useFrameJumpStore.getState().cycleJumpMode();
    expect(useFrameJumpStore.getState().jumpMode).toBe(1);
  });

  it('should allow setting specific jump mode', () => {
    useFrameJumpStore.getState().setJumpMode(10);
    expect(useFrameJumpStore.getState().jumpMode).toBe(10);

    useFrameJumpStore.getState().setJumpMode('fps');
    expect(useFrameJumpStore.getState().jumpMode).toBe('fps');

    useFrameJumpStore.getState().setJumpMode(1);
    expect(useFrameJumpStore.getState().jumpMode).toBe(1);
  });
});

describe('getJumpFrames', () => {
  it('should return 1 for mode 1', () => {
    expect(getJumpFrames(1, 30)).toBe(1);
    expect(getJumpFrames(1, 60)).toBe(1);
  });

  it('should return 10 for mode 10', () => {
    expect(getJumpFrames(10, 30)).toBe(10);
    expect(getJumpFrames(10, 60)).toBe(10);
  });

  it('should return fps for mode fps (1 second)', () => {
    expect(getJumpFrames('fps', 30)).toBe(30);
    expect(getJumpFrames('fps', 60)).toBe(60);
    expect(getJumpFrames('fps', 24)).toBe(24);
    expect(getJumpFrames('fps', 29.97)).toBe(30); // rounded
  });
});
