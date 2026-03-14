import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { AssemblyIcon } from '@/lib/icons';
import { clsx } from 'clsx';

import { Card, Badge, IconButton, DialogShell, ConfirmDeleteDialog } from '@/components/ui';
import { StepAssignmentDialog } from './StepAssignmentDialog';
import type { Assembly } from '@/features/instruction';
import { StepOverviewCard } from './StepOverviewCard';
import { SubstepPreviewCard } from './SubstepPreviewCard';
import type { ResolvedImage } from '@/lib/mediaResolver';
import { ResolvedImageView } from './ResolvedImageView';

export interface SubstepPreview {
  id: string;
  order: number;
  title: string | null;
  image: ResolvedImage | null;
}

export interface StepWithPreview {
  id: string;
  order: number;
  title: string | null;
  description: string | null;
  substepCount: number;
  /** Resolved step preview image (url or frameCapture) */
  image: ResolvedImage | null;
  /** Compact substep preview data for expansion panel */
  substepPreviews?: SubstepPreview[];
}

/** Check if a drag event contains a step ID */
function hasStepDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes('application/x-step-id');
}

/** Render substep preview children for a step card (shared between sortable and plain grid). */
function renderSubstepChildren(
  step: StepWithPreview,
  opts: {
    editMode?: boolean;
    onDeleteSubstep?: (substepId: string) => void;
    renderSortableSubstepGrid?: (
      containerId: string,
      substeps: SubstepPreview[],
      renderSubstep: (substep: SubstepPreview) => ReactNode,
    ) => ReactNode;
    onStepSelect: (stepId: string) => void;
  },
): ReactNode {
  const subs = step.substepPreviews;
  if (!subs || subs.length === 0) return null;

  if (opts.renderSortableSubstepGrid) {
    return opts.renderSortableSubstepGrid(step.id, subs, (sub) => (
      <SubstepPreviewCard
        key={sub.id}
        substepId={sub.id}
        order={sub.order}
        title={sub.title}
        image={sub.image}
        onClick={() => opts.onStepSelect(step.id)}
        editMode={opts.editMode}
        onDeleteSubstep={opts.onDeleteSubstep}
      />
    ));
  }

  return (
    <div
      className="grid gap-2 p-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(6rem, 1fr))' }}
    >
      {subs.map((sub) => (
        <SubstepPreviewCard
          key={sub.id}
          substepId={sub.id}
          order={sub.order}
          title={sub.title}
          image={sub.image}
          onClick={() => opts.onStepSelect(step.id)}
          editMode={opts.editMode}
          onDeleteSubstep={opts.onDeleteSubstep}
        />
      ))}
    </div>
  );
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
  /** Edit mode active */
  editMode?: boolean;
  /** Allow rendering with 0 steps (edit mode) */
  allowEmpty?: boolean;
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
  /** Called to delete a step (edit mode only) */
  onDeleteStep?: (stepId: string) => void;
  /** Render prop for preview image upload button on step cards (injected by editor-core via app shell) */
  renderPreviewUpload?: (stepId: string) => ReactNode;
  /** Render prop for assembly preview image upload button (injected by editor-core via app shell) */
  renderAssemblyPreviewUpload?: (assemblyId: string) => ReactNode;
  /** Resolved assembly preview image (from videoFrameAreaId) */
  assemblyImage?: ResolvedImage | null;
  /** Render prop for sortable step grid (injected by editor-core). When present, replaces raw steps.map(). */
  renderSortableStepGrid?: (
    containerId: string,
    steps: StepWithPreview[],
    renderStep: (step: StepWithPreview) => ReactNode,
  ) => ReactNode;
  /** Drag handle props for assembly DnD reordering (header-only drag) */
  dragHandleProps?: {
    listeners: Record<string, unknown> | undefined;
    attributes: Record<string, unknown>;
  };
  /** Set of step IDs whose substep panel is expanded */
  expandedStepIds?: Set<string>;
  /** Called when a step's expand/collapse is toggled */
  onExpandToggle?: (stepId: string) => void;
  /** Render prop for sortable substep grid (injected by editor-core). */
  renderSortableSubstepGrid?: (
    containerId: string,
    substeps: SubstepPreview[],
    renderSubstep: (substep: SubstepPreview) => ReactNode,
  ) => ReactNode;
  /** Renders a droppable zone for collapsed steps so substeps can be dropped onto them. */
  renderSubstepDropZone?: (stepId: string) => ReactNode;
  /** Called when a substep should be deleted */
  onDeleteSubstep?: (substepId: string) => void;
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
  editMode = false,
  allowEmpty = false,
  onDeleteAssembly,
  onRenameAssembly,
  onMoveStepToAssembly,
  allSteps,
  onRenameStep,
  onDeleteStep,
  renderPreviewUpload,
  renderAssemblyPreviewUpload,
  assemblyImage,
  renderSortableStepGrid,
  dragHandleProps,
  expandedStepIds,
  onExpandToggle,
  renderSortableSubstepGrid,
  renderSubstepDropZone,
  onDeleteSubstep,
}: AssemblySectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(assembly.title ?? '');
  const [isDragOver, setIsDragOver] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
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
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
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

  const renderStepCard = (step: StepWithPreview, opts?: { draggable?: boolean }) => (
    <StepOverviewCard
      stepNumber={step.order}
      title={step.title}
      description={step.description}
      substepCount={step.substepCount}
      image={step.image}
      onClick={() => onStepSelect(step.id)}
      stepId={step.id}
      draggable={opts?.draggable}
      editMode={editMode}
      onRenameStep={onRenameStep}
      onDeleteStep={onDeleteStep}
      renderPreviewUpload={renderPreviewUpload}
      expanded={expandedStepIds?.has(step.id)}
      onExpandToggle={onExpandToggle}
      renderSubstepDropZone={renderSubstepDropZone}
    >
      {renderSubstepChildren(step, { editMode, onDeleteSubstep, renderSortableSubstepGrid, onStepSelect })}
    </StepOverviewCard>
  );

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
          {dragHandleProps && (
            <span
              aria-label={t('instructionView.dragAssembly', 'Drag to reorder assembly')}
              className="cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-base)] transition-colors"
              {...dragHandleProps.listeners}
              {...dragHandleProps.attributes}
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          {assemblyImage ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-label={t('instructionView.openAssemblyImage', 'Open assembly image')}
              className="flex-shrink-0 cursor-pointer"
            >
              <ResolvedImageView image={assemblyImage} alt={assembly.title ?? ''} className="h-6 w-6 rounded object-cover" />
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
          {assemblyImage ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setPreviewOpen(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setPreviewOpen(true); } }}
              aria-label={t('instructionView.openAssemblyImage', 'Open assembly image')}
              className="flex-shrink-0 cursor-pointer"
            >
              <ResolvedImageView image={assemblyImage} alt={assembly.title ?? ''} className="h-6 w-6 rounded object-cover" />
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
            ? renderSortableStepGrid(assembly.id, steps, (step) => renderStepCard(step))
            : steps.length > 0 ? (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
                }}
              >
                {steps.map((step) => (
                  <div key={step.id}>{renderStepCard(step, { draggable: editMode })}</div>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('editorCore.deleteAssembly', 'Delete assembly?')}
        message={t('editorCore.deleteAssemblyConfirm', 'All step assignments will be removed. This action cannot be undone.')}
      />

      {/* Image preview popup */}
      {assemblyImage && (
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
            <ResolvedImageView
              image={assemblyImage}
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
  /** Edit mode active */
  editMode?: boolean;
  /** Called to move a step to an assembly */
  onMoveStepToAssembly?: (stepId: string, assemblyId: string | null) => void;
  /** Called to rename a step (edit mode only) */
  onRenameStep?: (stepId: string, title: string) => void;
  /** Called to delete a step (edit mode only) */
  onDeleteStep?: (stepId: string) => void;
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
  editMode = false,
  onMoveStepToAssembly,
  onRenameStep,
  onDeleteStep,
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

  const renderStepCard = (step: StepWithPreview, opts?: { draggable?: boolean }) => (
    <StepOverviewCard
      stepNumber={step.order}
      title={step.title}
      description={step.description}
      substepCount={step.substepCount}
      image={step.image}
      onClick={() => onStepSelect(step.id)}
      stepId={step.id}
      draggable={opts?.draggable}
      editMode={editMode}
      onRenameStep={onRenameStep}
      onDeleteStep={onDeleteStep}
      renderPreviewUpload={renderPreviewUpload}
    />
  );

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
            ? renderSortableStepGrid('unassigned', steps, (step) => renderStepCard(step))
            : (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
                }}
              >
                {steps.map((step) => (
                  <div key={step.id}>{renderStepCard(step, { draggable: editMode })}</div>
                ))}
              </div>
            )
          }
        </div>
      )}
    </Card>
  );
}
