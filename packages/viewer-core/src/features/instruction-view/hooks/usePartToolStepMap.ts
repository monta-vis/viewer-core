import { useMemo } from 'react';
import { useViewerData } from '../context';

/**
 * Maps each partToolId to the set of step IDs that use it.
 *
 * Traversal: steps → substepIds → substep.partToolRowIds → junction.partToolId → collect step.id
 */
export function usePartToolStepMap(): Map<string, Set<string>> {
  const data = useViewerData();

  return useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!data) return map;

    for (const step of Object.values(data.steps)) {
      for (const substepId of step.substepIds) {
        const substep = data.substeps[substepId];
        if (!substep) continue;

        for (const rowId of substep.partToolRowIds) {
          const row = data.substepPartTools[rowId];
          if (!row) continue;

          let stepIds = map.get(row.partToolId);
          if (!stepIds) {
            stepIds = new Set();
            map.set(row.partToolId, stepIds);
          }
          stepIds.add(step.id);
        }
      }
    }

    return map;
  }, [data]);
}
