import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { AssemblyIcon } from '@/lib/icons';
import { clsx } from 'clsx';

import { Card, Badge, IconButton, DialogShell } from '@/components/ui';
import { StepAssignmentDialog } from './StepAssignmentDialog';
import type { Assembly } from '@/features/instruction';
import { StepOverviewCard } from './StepOverviewCard';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';

/**
 * Get the preview image URL for a step (local mode: use localPath only).
 */
export function getStepPreviewUrl(
  step: StepWithPreview,
  useRawVideo: boolean,
): string | null {
  if (useRawVideo) return null;
  return step.previewLocalPath || null;
}

export interface StepWithPreview {
  id: string;
  order: number;
  title: string | null;
  description: string | null;
  substepCount: number;
  /** VideoFrameArea ID for exported image URL */
  previewAreaId?: string | null;
  /** Pre-exported image URL (for standalone/snapshot mode) */
  previewLocalPath?: string | null;
  /** Raw frame capture data for Editor preview (resolves source video) */
  frameCaptureData?: FrameCaptureData | null;
}

export interface AvailableAssembly {
  id: string;
  title: string | null;
}

/** Check if a drag event contains a step ID */
function hasStepDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes('application/x-step-id');
}

interface AssemblySectionProps {
  /** Assembly data */
  assembly: Assembly;
  /** Steps belonging to this assembly */
  steps: StepWithPreview[];
  /** Called when a step is selected */
  onStepSelect: (stepId: string) => void;
  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
  /** Use raw video frame capture instead of pre-rendered images. Default: false */
  useRawVideo?: boolean;
  /** Edit mode active */
  editMode?: boolean;
  /** Allow rendering with 0 steps (edit mode) */
  allowEmpty?: boolean;
  /** @deprecated No longer used (dropdowns replaced by DnD) */
  availableAssemblies?: AvailableAssembly[];
  /** Called to delete this assembly */
  onDeleteAssembly?: (assemblyId: string) => void;
  /** Called to rename this assembly */
  onRenameAssembly?: (assemblyId: string, title: string) => void;
  /** Called to move a step to another assembly */
  onMoveStepToAssembly?: (stepId: string, assemblyId: string | null) => void;
  /** All steps (for step assignment dialog) */
  allSteps?: (StepWithPreview & { assemblyId?: string | null })[];
  /** Called to rename a step (edit mode only) */
  onRenameStep?: (stepId: string, title: string) => void;
  /** Render prop for preview image upload button on step cards (injected by editor-core via app shell) */
  renderPreviewUpload?: (stepId: string) => ReactNode;
  /** Render prop for assembly preview image upload button (injected by editor-core via app shell) */
  renderAssemblyPreviewUpload?: (assemblyId: string) => ReactNode;
  /** Resolved assembly preview image URL (from videoFrameAreaId) */
  assemblyImageUrl?: string | null;
  /** Render prop for sortable step grid (injected by editor-core). When present, replaces raw steps.map(). */
  renderSortableStepGrid?: (
    containerId: string,
    steps: StepWithPreview[],
    renderStep: (step: StepWithPreview) => ReactNode,
  ) => ReactNode;
}

/**
 * AssemblySection - Collapsible section displaying steps grouped by assembly
 *
 * Glassmorphism card with header and grid of StepOverviewCards.
 * In edit mode: inline title editing, delete button, drag-and-drop step assignment.
 */
export function AssemblySection({
  assembly,
  steps,
  onStepSelect,
  defaultExpanded = true,
  useRawVideo = false,
  editMode = false,
  allowEmpty = false,
  onDeleteAssembly,
  onRenameAssembly,
  onMoveStepToAssembly,
  allSteps,
  onRenameStep,
  renderPreviewUpload,
  renderAssemblyPreviewUpload,
  assemblyImageUrl,
  renderSortableStepGrid,
}: AssemblySectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(assembly.title ?? '');
  const [isDragOver, setIsDragOver] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (steps.length === 0 && !allowEmpty) return null;

  const handleTitleClick = () => {
    if (!editMode) return;
    setEditTitle(assembly.title ?? '');
    setIsEditingTitle(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    onRenameAssembly?.(assembly.id, editTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitle(assembly.title ?? '');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteAssembly?.(assembly.id);
  };

  // DnD handlers (step drops only — assembly drags are handled by parent)
  const handleDragOver = (e: React.DragEvent) => {
    if (!editMode || !hasStepDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    if (!editMode) return;
    e.preventDefault();
    const stepId = e.dataTransfer.getData('application/x-step-id');
    if (stepId) {
      onMoveStepToAssembly?.(stepId, assembly.id);
    }
  };

  return (
    <Card
      variant="glass"
      padding="none"
      data-assembly-id={assembly.id}
      className={clsx(
        'overflow-hidden transition-shadow',
        isDragOver && 'ring-2 ring-[var(--color-secondary)]',
      )}
      onDragOver={renderSortableStepGrid ? undefined : handleDragOver}
      onDragLeave={renderSortableStepGrid ? undefined : handleDragLeave}
      onDrop={renderSortableStepGrid ? undefined : handleDrop}
    >
      {/* Header */}
      {editMode ? (
        <div
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3',
            'transition-colors',
            isExpanded && 'shadow-sm'
          )}
        >
          {assemblyImageUrl ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-label={t('instructionView.openAssemblyImage', 'Open assembly image')}
              className="flex-shrink-0 cursor-pointer"
            >
              <img src={assemblyImageUrl} alt={assembly.title ?? ''} className="h-6 w-6 rounded object-cover" />
            </button>
          ) : (
            <AssemblyIcon className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
          )}

          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              placeholder={t('editorCore.assemblyTitlePlaceholder', 'Assembly name...')}
              className="flex-1 bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-base)] font-medium outline-none"
            />
          ) : (
            <span
              data-testid="assembly-title"
              onClick={handleTitleClick}
              className="flex-1 font-medium text-[var(--color-text-base)] truncate cursor-text hover:opacity-70"
            >
              {assembly.title || t('editorCore.assemblyTitlePlaceholder', 'Assembly name...')}
            </span>
          )}

          <Badge variant="default" className="text-xs">
            {steps.length} {steps.length === 1 ? t('instructionView.step', 'Step') : t('instructionView.steps', 'Steps')}
          </Badge>

          {renderAssemblyPreviewUpload?.(assembly.id)}

          {allSteps && onMoveStepToAssembly && (
            <IconButton
              icon={<Plus className="h-4 w-4" />}
              aria-label={t('editorCore.assignSteps', 'Assign steps')}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setAssignDialogOpen(true);
              }}
              size="sm"
              variant="default"
            />
          )}

          <IconButton
            icon={<Trash2 className="h-4 w-4" />}
            aria-label={t('editorCore.deleteAssembly', 'Delete assembly')}
            onClick={handleDelete}
            size="sm"
            variant="danger"
          />

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
            aria-label={isExpanded ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')}
          >
            <ChevronDown
              className={clsx(
                'h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200',
                !isExpanded && '-rotate-90'
              )}
            />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3',
            'text-left transition-colors',
            'hover:bg-white/[0.03]',
            isExpanded && 'shadow-sm'
          )}
        >
          {assemblyImageUrl ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setPreviewOpen(true); } }}
              aria-label={t('instructionView.openAssemblyImage', 'Open assembly image')}
              className="flex-shrink-0 cursor-pointer"
            >
              <img src={assemblyImageUrl} alt={assembly.title ?? ''} className="h-6 w-6 rounded object-cover" />
            </span>
          ) : (
            <AssemblyIcon className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
          )}
          <span className="flex-1 font-medium text-[var(--color-text-base)] truncate">
            {assembly.title}
          </span>
          <Badge variant="default" className="text-xs">
            {steps.length} {steps.length === 1 ? t('instructionView.step', 'Step') : t('instructionView.steps', 'Steps')}
          </Badge>
          <ChevronDown
            className={clsx(
              'h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200',
              !isExpanded && '-rotate-90'
            )}
          />
        </button>
      )}

      {/* Content - Step Grid */}
      {isExpanded && (
        <div className="p-4">
          {renderSortableStepGrid
            ? renderSortableStepGrid(assembly.id, steps, (step) => (
                <StepOverviewCard
                  stepNumber={step.order}
                  title={step.title}
                  description={step.description}
                  substepCount={step.substepCount}
                  previewImageUrl={getStepPreviewUrl(step, useRawVideo)}
                  useRawVideo={useRawVideo}
                  frameCaptureData={step.frameCaptureData}
                  onClick={() => onStepSelect(step.id)}
                  stepId={step.id}
                  editMode={editMode}
                  onRenameStep={onRenameStep}
                  renderPreviewUpload={renderPreviewUpload
                    ? () => renderPreviewUpload(step.id)
                    : undefined}
                />
              ))
            : steps.length > 0 ? (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
                }}
              >
                {steps.map((step) => (
                  <StepOverviewCard
                    key={step.id}
                    stepNumber={step.order}
                    title={step.title}
                    description={step.description}
                    substepCount={step.substepCount}
                    previewImageUrl={getStepPreviewUrl(step, useRawVideo)}
                    useRawVideo={useRawVideo}
                    frameCaptureData={step.frameCaptureData}
                    onClick={() => onStepSelect(step.id)}
                    stepId={step.id}
                    draggable={editMode}
                    editMode={editMode}
                    onRenameStep={onRenameStep}
                    renderPreviewUpload={renderPreviewUpload
                      ? () => renderPreviewUpload(step.id)
                      : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] italic">
                {t('instructionView.emptyAssembly', 'No steps — drag steps here')}
              </p>
            )
          }
        </div>
      )}

      {/* Step Assignment Dialog */}
      {allSteps && onMoveStepToAssembly && (
        <StepAssignmentDialog
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          assemblyId={assembly.id}
          assemblyTitle={assembly.title}
          allSteps={allSteps.map((s) => ({
            id: s.id,
            order: s.order,
            title: s.title,
            assemblyId: s.assemblyId ?? null,
          }))}
          onMoveStepToAssembly={onMoveStepToAssembly}
        />
      )}

      {/* Image preview popup */}
      {assemblyImageUrl && (
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
              src={assemblyImageUrl}
              alt={assembly.title ?? ''}
              className="w-full h-auto"
            />
          </div>
        </DialogShell>
      )}
    </Card>
  );
}

interface UnassignedSectionProps {
  /** Steps without assembly assignment */
  steps: StepWithPreview[];
  /** Called when a step is selected */
  onStepSelect: (stepId: string) => void;
  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
  /** Use raw video frame capture instead of pre-rendered images. Default: false */
  useRawVideo?: boolean;
  /** Edit mode active */
  editMode?: boolean;
  /** @deprecated No longer used (dropdowns replaced by DnD) */
  availableAssemblies?: AvailableAssembly[];
  /** Called to move a step to an assembly */
  onMoveStepToAssembly?: (stepId: string, assemblyId: string | null) => void;
  /** Called to rename a step (edit mode only) */
  onRenameStep?: (stepId: string, title: string) => void;
  /** Render prop for preview image upload button on step cards (injected by editor-core via app shell) */
  renderPreviewUpload?: (stepId: string) => ReactNode;
  /** Render prop for sortable step grid (injected by editor-core). When present, replaces raw steps.map(). */
  renderSortableStepGrid?: (
    containerId: string,
    steps: StepWithPreview[],
    renderStep: (step: StepWithPreview) => ReactNode,
  ) => ReactNode;
}

/**
 * UnassignedSection - Section for steps without assembly assignment
 *
 * Drop target for DnD: dropping a step here unassigns it (assemblyId = null).
 */
export function UnassignedSection({
  steps,
  onStepSelect,
  defaultExpanded = true,
  useRawVideo = false,
  editMode = false,
  onMoveStepToAssembly,
  onRenameStep,
  renderPreviewUpload,
  renderSortableStepGrid,
}: UnassignedSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDragOver, setIsDragOver] = useState(false);

  if (steps.length === 0) return null;

  // DnD handlers
  const handleDragOver = (e: React.DragEvent) => {
    if (!editMode || !hasStepDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    if (!editMode) return;
    e.preventDefault();
    const stepId = e.dataTransfer.getData('application/x-step-id');
    if (stepId) {
      onMoveStepToAssembly?.(stepId, null);
    }
  };

  return (
    <Card
      variant="glass"
      padding="none"
      className={clsx(
        'overflow-hidden transition-shadow',
        isDragOver && 'ring-2 ring-[var(--color-secondary)]',
      )}
      onDragOver={renderSortableStepGrid ? undefined : handleDragOver}
      onDragLeave={renderSortableStepGrid ? undefined : handleDragLeave}
      onDrop={renderSortableStepGrid ? undefined : handleDrop}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3',
          'text-left transition-colors',
          'hover:bg-white/[0.03]',
          isExpanded && 'shadow-sm'
        )}
      >
        <span className="flex-1 font-medium text-[var(--color-text-muted)] truncate">
          {t('instructionView.unassignedSteps', 'Other Steps')}
        </span>
        <Badge variant="default" className="text-xs">
          {steps.length}
        </Badge>
        <ChevronDown
          className={clsx(
            'h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
      </button>

      {/* Content - Step Grid */}
      {isExpanded && (
        <div className="p-4">
          {renderSortableStepGrid
            ? renderSortableStepGrid('unassigned', steps, (step) => (
                <StepOverviewCard
                  stepNumber={step.order}
                  title={step.title}
                  description={step.description}
                  substepCount={step.substepCount}
                  previewImageUrl={getStepPreviewUrl(step, useRawVideo)}
                  useRawVideo={useRawVideo}
                  frameCaptureData={step.frameCaptureData}
                  onClick={() => onStepSelect(step.id)}
                  stepId={step.id}
                  editMode={editMode}
                  onRenameStep={onRenameStep}
                  renderPreviewUpload={renderPreviewUpload
                    ? () => renderPreviewUpload(step.id)
                    : undefined}
                />
              ))
            : (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
                }}
              >
                {steps.map((step) => (
                  <StepOverviewCard
                    key={step.id}
                    stepNumber={step.order}
                    title={step.title}
                    description={step.description}
                    substepCount={step.substepCount}
                    previewImageUrl={getStepPreviewUrl(step, useRawVideo)}
                    useRawVideo={useRawVideo}
                    frameCaptureData={step.frameCaptureData}
                    onClick={() => onStepSelect(step.id)}
                    stepId={step.id}
                    draggable={editMode}
                    editMode={editMode}
                    onRenameStep={onRenameStep}
                    renderPreviewUpload={renderPreviewUpload
                      ? () => renderPreviewUpload(step.id)
                      : undefined}
                  />
                ))}
              </div>
            )
          }
        </div>
      )}
    </Card>
  );
}
