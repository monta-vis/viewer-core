import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PersistenceProvider, usePersistence } from './PersistenceContext';
import type { PersistenceAdapter } from './types';

function createMockAdapter(): PersistenceAdapter {
  return {
    listProjects: vi.fn().mockResolvedValue([]),
    getProjectData: vi.fn().mockResolvedValue({}),
    saveChanges: vi.fn().mockResolvedValue({ success: true }),
    resolveMediaUrl: vi.fn().mockReturnValue('http://example.com/media/test.jpg'),
  };
}

describe('PersistenceContext', () => {
  it('throws when usePersistence is called without provider', () => {
    expect(() => {
      renderHook(() => usePersistence());
    }).toThrow('usePersistence must be used within a PersistenceProvider');
  });

  it('returns the adapter when wrapped in PersistenceProvider', () => {
    const adapter = createMockAdapter();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <PersistenceProvider adapter={adapter}>
        {children}
      </PersistenceProvider>
    );

    const { result } = renderHook(() => usePersistence(), { wrapper });
    expect(result.current).toBe(adapter);
  });

  it('adapter methods are callable', async () => {
    const adapter = createMockAdapter();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <PersistenceProvider adapter={adapter}>
        {children}
      </PersistenceProvider>
    );

    const { result } = renderHook(() => usePersistence(), { wrapper });

    const projects = await result.current.listProjects();
    expect(projects).toEqual([]);
    expect(adapter.listProjects).toHaveBeenCalledOnce();

    const url = result.current.resolveMediaUrl('project-1', 'images/test.jpg');
    expect(url).toBe('http://example.com/media/test.jpg');
  });
});
