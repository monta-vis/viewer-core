import { vi } from 'vitest';

interface MockVideoOptions {
  duration?: number;
  currentTime?: number;
  paused?: boolean;
  readyState?: number;
}

/**
 * Creates a mock HTMLVideoElement for testing VideoContext.
 * Uses EventTarget for real event dispatching with vi.fn() spies
 * on addEventListener/removeEventListener for assertion support.
 */
export function createMockVideoElement(options: MockVideoOptions = {}): HTMLVideoElement {
  const target = new EventTarget();

  const mock = {
    currentTime: options.currentTime ?? 0,
    duration: options.duration ?? 0,
    paused: options.paused ?? true,
    readyState: options.readyState ?? 0,
    playbackRate: 1,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      target.addEventListener(type, listener as EventListener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      target.removeEventListener(type, listener as EventListener);
    }),
    dispatchEvent: (event: Event) => target.dispatchEvent(event),
  } as unknown as HTMLVideoElement;

  return mock;
}
