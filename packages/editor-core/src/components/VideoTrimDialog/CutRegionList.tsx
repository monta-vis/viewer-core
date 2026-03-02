/**
 * CutRegionList - Displays list of cut regions with delete buttons.
 *
 * Shows each region's time range and allows deletion.
 */

import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@monta-vis/viewer-core';
import { formatTimecode } from '../../utils/trimUtils';
import type { CutRegion } from '../../types/trim.types';

export interface CutRegionListProps {
  regions: CutRegion[];
  selectedRegionId: string | null;
  onDelete: (regionId: string) => void;
}

export function CutRegionList({ regions, selectedRegionId, onDelete }: CutRegionListProps) {
  const { t } = useTranslation();

  if (regions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((region) => (
        <div
          key={region.id}
          className={`flex items-center gap-2 px-2 py-1 rounded text-sm bg-[var(--color-error)]/10 border ${selectedRegionId === region.id ? 'border-[var(--color-error)]' : 'border-[var(--color-error)]/30'}`}
        >
          <span className="text-[var(--color-text-base)]">
            {formatTimecode(region.startTime)} - {formatTimecode(region.endTime)}
          </span>
          <IconButton
            icon={<Trash2 className="w-3.5 h-3.5" />}
            variant="danger"
            size="sm"
            aria-label={t('editorCore.videoTrim.deleteRegion', 'Delete region')}
            onClick={() => onDelete(region.id)}
          />
        </div>
      ))}
    </div>
  );
}
