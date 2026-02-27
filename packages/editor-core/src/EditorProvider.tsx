/**
 * EditorProvider
 *
 * Convenience wrapper that composes:
 * - PersistenceProvider (persistence adapter)
 * - ViewerDataProvider (auto-synced from useEditorStore)
 *
 * App shells mount one provider and get both editing + viewing capabilities.
 */

import type { ReactNode } from 'react';
import { ViewerDataProvider } from '@monta-vis/viewer-core';
import { useEditorStore } from './store';
import { PersistenceProvider } from './persistence';
import type { PersistenceAdapter } from './persistence';

interface EditorProviderProps {
  children: ReactNode;
  adapter: PersistenceAdapter;
}

export function EditorProvider({ children, adapter }: EditorProviderProps) {
  const storeData = useEditorStore((s) => s.data);

  return (
    <PersistenceProvider adapter={adapter}>
      <ViewerDataProvider data={storeData}>
        {children}
      </ViewerDataProvider>
    </PersistenceProvider>
  );
}
