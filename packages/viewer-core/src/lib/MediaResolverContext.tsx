import { createContext, useContext, type FC, type ReactNode } from 'react';
import type { MediaResolver } from './mediaResolver';

const MediaResolverCtx = createContext<MediaResolver | null>(null);

export const MediaResolverProvider: FC<{ resolver: MediaResolver; children: ReactNode }> = ({
  resolver,
  children,
}) => (
  <MediaResolverCtx.Provider value={resolver}>
    {children}
  </MediaResolverCtx.Provider>
);

export function useMediaResolver(): MediaResolver {
  const ctx = useContext(MediaResolverCtx);
  if (!ctx) {
    throw new Error('useMediaResolver must be used within a MediaResolverProvider');
  }
  return ctx;
}

export function useMediaResolverOptional(): MediaResolver | null {
  return useContext(MediaResolverCtx);
}
