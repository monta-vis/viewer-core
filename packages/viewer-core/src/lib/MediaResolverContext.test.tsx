import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MediaResolverProvider, useMediaResolver } from './MediaResolverContext';
import type { MediaResolver } from './mediaResolver';

const mockResolver: MediaResolver = {
  mode: 'processed',
  resolveImage: () => null,
  resolveAllPartToolImages: () => [],
  resolvePartToolImage: () => null,
  resolveVideo: () => null,
};

describe('MediaResolverContext', () => {
  it('provides resolver via hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MediaResolverProvider resolver={mockResolver}>{children}</MediaResolverProvider>
    );
    const { result } = renderHook(() => useMediaResolver(), { wrapper });
    expect(result.current).toBe(mockResolver);
    expect(result.current.mode).toBe('processed');
  });

  it('throws when used outside provider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useMediaResolver());
    }).toThrow('useMediaResolver must be used within a MediaResolverProvider');
    spy.mockRestore();
  });
});
