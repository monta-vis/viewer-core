import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

import { Card, TextInputModal, IconButton, ConfirmDeleteDialog } from '@/components/ui';
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel';
import { ResolvedImageView } from './ResolvedImageView';
import type { ResolvedImage } from '@/lib/mediaResolver';

interface StepOverviewCardProps {
  /** Step number (1-based) */
  stepNumber: number;
  /** Step title */
  title: string | null;
  /** Step description - what needs to be done */
  description: string | null;
  /** Number of substeps in this step */
  substepCount: number;
  /** Resolved preview image (url or frameCapture) */
  image?: ResolvedImage | null;
  /** Called when card is clicked */
  onClick?: () => void;
  /** Step ID — used for drag-and-drop transfer */
  stepId?: string;
  /** Whether the card is draggable (edit mode). Default: false */
  draggable?: boolean;
  /** Whether edit mode is active. Default: false */
  editMode?: boolean;
  /** Called to rename a step (edit mode only) */
  onRenameStep?: (stepId: string, title: string) => void;
  /** Called to delete a step (edit mode only) */
  onDeleteStep?: (stepId: string) => void;
  /** Render prop for preview image upload button (injected by editor-core via app shell) */
  renderPreviewUpload?: (stepId: string) => ReactNode;
  /** Whether the substep expansion panel is open */
  expanded?: boolean;
  /** Called when the expand/collapse chevron is toggled */
  onExpandToggle?: (stepId: string) => void;
  /** Expandable content (substep previews) rendered inside a CollapsiblePanel */
  children?: ReactNode;
  /** Render prop for substep droppable zone (shown when collapsed in edit mode) */
  renderSubstepDropZone?: (stepId: string) => ReactNode;
}

/**
 * StepOverviewCard - Horizontal card showing a step preview in the overview grid
 *
 * Displays a square thumbnail on the left with step number, description, and substep count on the right.
 */
export function StepOverviewCard({
  stepNumber,
  title,
  description,
  substepCount,
  image,
  onClick,
  stepId,
  draggable = false,
  editMode = false,
  onRenameStep,
  onDeleteStep,
  renderPreviewUpload,
  expanded,
  onExpandToggle,
  children,
  renderSubstepDropZone,
}: StepOverviewCardProps) {
  const { t } = useTranslation();
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!stepId) return;
    e.dataTransfer.setData('application/x-step-id', stepId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      data-step-id={stepId}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      interactive
      variant="glass"
      bordered={false}
      padding="none"
      className={`overflow-hidden group relative${draggable ? ' cursor-grab active:cursor-grabbing' : ''}`}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Delete button (edit mode) */}
      {editMode && stepId && onDeleteStep && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            icon={<Trash2 />}
            aria-label={t('editorCore.deleteStep', 'Delete step')}
            onClick={() => setConfirmDeleteOpen(true)}
            size="sm"
            variant="danger"
          />
        </div>
      )}

      <div className="flex flex-row">
        {/* Thumbnail — 1:1 square, left side */}
        <div className="relative w-[40%] flex-shrink-0 aspect-square bg-black overflow-hidden rounded-l-xl">
          {image ? (
            <ResolvedImageView
              image={image}
              alt={title || `${t('instructionView.step', 'Step')} ${stepNumber}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-subtle)]">
              <svg
                className="w-10 h-10 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          {editMode && stepId && renderPreviewUpload?.(stepId)}
        </div>

        {/* Info — right side */}
        <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--color-secondary)]">
              {stepNumber}
            </span>
            {editMode && stepId ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.currentTarget.blur(); setTitleModalOpen(true); }}
                className="flex-1 min-w-0 text-left bg-transparent border-b border-[var(--color-border)] text-base font-semibold truncate cursor-text hover:border-[var(--color-secondary)] transition-colors"
              >
                <span className={title ? 'text-[var(--color-text-base)]' : 'text-[var(--color-text-muted)]'}>
                  {title || t('editorCore.stepTitlePlaceholder', 'Title (optional)')}
                </span>
              </button>
            ) : title ? (
              <span className="text-base font-semibold text-[var(--color-text)] truncate">
                {title}
              </span>
            ) : null}
          </div>

          {description && (
            <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mt-1">
              {description}
            </p>
          )}

          {onExpandToggle ? (
            <button
              type="button"
              aria-label={t('instructionView.expandSubsteps', 'Expand substeps')}
              onClick={(e) => { e.stopPropagation(); if (stepId) onExpandToggle(stepId); }}
              className="flex items-center gap-1 mt-2 rounded hover:bg-white/10 transition-colors px-1 -mx-1"
            >
              <span className="text-xs text-[var(--color-text-subtle)]">
                {t('instructionView.substepCount', '{{count}} Substeps', { count: substepCount })}
              </span>
              <ChevronDown
                className={clsx(
                  'h-3.5 w-3.5 text-[var(--color-text-subtle)] transition-transform duration-200',
                  expanded !== true && '-rotate-90',
                )}
              />
            </button>
          ) : (
            <p className="text-xs text-[var(--color-text-subtle)] mt-2">
              {t('instructionView.substepCount', '{{count}} Substeps', { count: substepCount })}
            </p>
          )}
        </div>
      </div>

      {children && (
        <CollapsiblePanel isOpen={expanded === true}>
          {children}
        </CollapsiblePanel>
      )}

      {/* Substep drop zone for collapsed cards in edit mode */}
      {renderSubstepDropZone && stepId && expanded !== true && renderSubstepDropZone(stepId)}

      {titleModalOpen && stepId && (
        <TextInputModal
          label={t('editorCore.stepTitlePlaceholder', 'Title (optional)')}
          value={title ?? ''}
          onConfirm={(val) => { onRenameStep?.(stepId, val); setTitleModalOpen(false); }}
          onCancel={() => setTitleModalOpen(false)}
        />
      )}

      {/* Confirm delete step dialog */}
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => { if (stepId) onDeleteStep?.(stepId); }}
        title={t('editorCore.deleteStepConfirmTitle', 'Delete step?')}
        message={t('editorCore.deleteStepConfirmMessage', 'All substeps will be unassigned. This action cannot be undone.')}
      />
    </Card>
  );
}
