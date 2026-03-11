import { useMemo } from 'react';
import { useViewerData } from '../context';

/**
 * Maps each partToolId to the set of substep IDs that use it.
 *
 * Traversal: substeps → partToolRowIds → junction.partToolId → collect substep.id
 */
export function usePartToolSubstepMap(): Map<string, Set<string>> {
  const data = useViewerData();

  return useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!data) return map;

    for (const substep of Object.values(data.substeps)) {
      for (const rowId of substep.partToolRowIds) {
        const row = data.substepPartTools[rowId];
        if (!row) continue;

        let substepIds = map.get(row.partToolId);
        if (!substepIds) {
          substepIds = new Set();
          map.set(row.partToolId, substepIds);
        }
        substepIds.add(substep.id);
      }
    }

    return map;
  }, [data]);
}
