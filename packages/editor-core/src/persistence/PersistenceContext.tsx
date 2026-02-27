/**
 * PersistenceContext
 *
 * Provides a PersistenceAdapter to the component tree via React context.
 * Each platform wraps its app with <PersistenceProvider adapter={...}>.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { PersistenceAdapter } from './types';

const PersistenceContext = createContext<PersistenceAdapter | null>(null);

interface PersistenceProviderProps {
  children: ReactNode;
  adapter: PersistenceAdapter;
}

export function PersistenceProvider({ children, adapter }: PersistenceProviderProps) {
  return (
    <PersistenceContext.Provider value={adapter}>
      {children}
    </PersistenceContext.Provider>
  );
}

/**
 * Access the persistence adapter from the nearest PersistenceProvider.
 * Throws if used outside a PersistenceProvider.
 */
export function usePersistence(): PersistenceAdapter {
  const adapter = useContext(PersistenceContext);
  if (!adapter) {
    throw new Error('usePersistence must be used within a PersistenceProvider');
  }
  return adapter;
}
