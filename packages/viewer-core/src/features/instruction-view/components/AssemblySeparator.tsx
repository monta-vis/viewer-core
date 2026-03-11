import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { AssemblyIcon } from '@/lib/icons';
import { DialogShell } from '@/components/ui';
import { PartToolBadge } from './PartToolBadge';

interface AssemblySeparatorProps {
  title: string;
  stepCount: number;
  partCount?: number;
  toolCount?: number;
  onPartToolClick?: () => void;
  imageUrl?: string | null;
}

/** Visual divider between assemblies with title, step count, and optional parts/tools pill. */
export function AssemblySeparator({ title, stepCount, partCount, toolCount, onPartToolClick, imageUrl }: AssemblySeparatorProps) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);

  const hasParts = (partCount ?? 0) > 0;
  const hasTools = (toolCount ?? 0) > 0;
  const showPill = (hasParts || hasTools) && onPartToolClick;

  return (
    <div
      role="separator"
      aria-label={`${t('instructionView.assembly', 'Assembly')}: ${title}`}
      className="py-6"
    >
      {/* Top line */}
      <div className="h-0.5 bg-[var(--color-secondary)]" />

      {/* Content row */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          {imageUrl ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-label={t('instructionView.openAssemblyImage', 'Open assembly image')}
              className="flex-shrink-0 cursor-pointer"
            >
              <img
                src={imageUrl}
                alt={title}
                className="w-[3rem] h-[3rem] rounded object-cover"
              />
            </button>
          ) : (
            <AssemblyIcon className="w-7 h-7 text-[var(--color-secondary)]" />
          )}
          <div className="flex flex-col">
            <span className="text-base font-semibold text-[var(--color-text-base)]">
              {title}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {stepCount === 1
                ? t('instructionView.nStep', '{{count}} Step', { count: stepCount })
                : t('instructionView.nSteps', '{{count}} Steps', { count: stepCount })}
            </span>
          </div>
        </div>

        {showPill && (
          <PartToolBadge
            partCount={partCount ?? 0}
            toolCount={toolCount ?? 0}
            onClick={onPartToolClick}
            showChevron
          />
        )}
      </div>

      {/* Bottom line */}
      <div className="h-0.5 bg-[var(--color-secondary)]" />

      {/* Image preview popup */}
      {imageUrl && (
        <DialogShell
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="max-w-2xl"
          className="p-0 overflow-hidden"
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label={t('common.close', 'Close')}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-auto"
            />
          </div>
        </DialogShell>
      )}
    </div>
  );
}
