/**
 * ViewerDataContext
 *
 * Provides InstructionData to instruction-view components via React context,
 * decoupling them from the Zustand store (useSimpleStore).
 *
 * Consumers (ViewPage, EditorPage, MwebApp) wrap the viewer tree with
 * <ViewerDataProvider data={...}> and can source data from any origin.
 */
import { createContext, useContext, type ReactNode } from 'react';

import type { InstructionData } from '@/features/instruction';

// ============================================
// Context
// ============================================

const ViewerDataContext = createContext<InstructionData | null>(null);

// ============================================
// Provider
// ============================================

interface ViewerDataProviderProps {
  children: ReactNode;
  data: InstructionData | null;
}

export function ViewerDataProvider({ children, data }: ViewerDataProviderProps) {
  return (
    <ViewerDataContext.Provider value={data}>
      {children}
    </ViewerDataContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

/**
 * Access InstructionData from the nearest ViewerDataProvider.
 * Returns `null` when data hasn't been loaded yet.
 */
export function useViewerData(): InstructionData | null {
  return useContext(ViewerDataContext);
}
