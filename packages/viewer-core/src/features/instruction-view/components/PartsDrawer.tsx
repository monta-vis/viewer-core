import type { ReactNode } from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Package, Wrench, ChevronDown, Pencil, Filter, Box, Ruler } from 'lucide-react';
import { clsx } from 'clsx';

import { CollapsiblePanel, TutorialClickIcon, IconButton } from '@/components/ui';
import { useClickOutside } from '@/hooks';
import type { VideoFrameAreaRow, VideoRow } from '@/features/instruction';
import { useViewerData } from '../context';
import {
  useFilteredPartsTools,
  type AggregatedPartTool,
} from '../hooks/useFilteredPartsTools';
import { resolvePartToolImageUrl } from '../utils/resolvePartToolImageUrl';
import { resolvePartToolFrameCapture, type FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { VideoFrameCapture } from './VideoFrameCapture';
import { PartToolDetailModal } from './PartToolDetailModal';

// localStorage keys for persisting preferences (shared with fullpage mode)
const STORAGE_KEY_START = 'montavis-parts-tools-start-step';
const STORAGE_KEY_COUNT = 'montavis-parts-tools-step-count';

// Save preferences to localStorage
function saveStartStepPreference(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_START, String(value));
  } catch {
    // localStorage may not be available
  }
}

function saveStepCountPreference(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_COUNT, String(value));
  } catch {
    // localStorage may not be available
  }
}

interface PartsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Current step number (1-indexed) - used as starting point */
  currentStepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** ID of the substep that opened the drawer (for amount highlighting) */
  highlightedSubstepId?: string;
  /** Project folder name for mvis-media:// area image URLs */
  folderName?: string;
  /** Whether to use blurred media variants */
  useBlurred?: boolean;
  /** Use raw video frame capture instead of exported images (Editor preview). Default: false */
  useRawVideo?: boolean;
  /** Show tutorial highlight on the close button */
  tutorialHighlight?: boolean;
  /** Show inline edit controls. Default: false */
  editMode?: boolean;
  /** Render function for the part/tool editor (provided by editor-core via app shell). */
  renderPartToolEditor?: (props: { item: AggregatedPartTool; onClose: () => void }) => ReactNode;
}

/** Step Range Selector with edit mode for manual input (used in fullpage mode) */
interface StepRangeSelectorProps {
  startStep: number;
  endStep: number;
  maxSteps: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  label: string;
  /** Compact mode for narrow drawer */
  compact?: boolean;
}

function StepRangeSelector({
  startStep,
  endStep,
  maxSteps,
  onStartChange,
  onEndChange,
  label,
  compact = false,
}: StepRangeSelectorProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editStart, setEditStart] = useState(String(startStep));
  const [editEnd, setEditEnd] = useState(String(endStep));
  const startInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local edit state when props change
  useEffect(() => {
    if (!isEditing) {
      setEditStart(String(startStep));
      setEditEnd(String(endStep));
    }
  }, [startStep, endStep, isEditing]);

  // Focus first input when entering edit mode
  useEffect(() => {
    if (isEditing && startInputRef.current) {
      startInputRef.current.focus();
      startInputRef.current.select();
    }
  }, [isEditing]);

  const handleConfirm = () => {
    let newStart = parseInt(editStart, 10);
    let newEnd = parseInt(editEnd, 10);

    // Clamp values
    if (isNaN(newStart) || newStart < 1) newStart = 1;
    if (newStart > maxSteps) newStart = maxSteps;
    if (isNaN(newEnd) || newEnd < newStart) newEnd = newStart;
    if (newEnd > maxSteps) newEnd = maxSteps;

    onStartChange(newStart);
    onEndChange(newEnd);
    setIsEditing(false);
  };

  useClickOutside(containerRef, handleConfirm, isEditing);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      setEditStart(String(startStep));
      setEditEnd(String(endStep));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className={clsx(
        'inline-flex items-center rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-secondary)]/50',
        compact ? 'gap-1 px-2 py-1' : 'gap-1.5 px-3 py-1.5'
      )}>
        <span className={clsx('text-[var(--color-text-muted)]', compact ? 'text-xs' : 'text-sm')}>{label}</span>
        <input
          ref={startInputRef}
          type="text"
          inputMode="numeric"
          value={editStart}
          onChange={(e) => setEditStart(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown}
          className={clsx(
            'px-1 py-0.5 text-center font-medium bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] rounded text-[var(--color-text-base)] focus:outline-none focus:border-[var(--color-secondary)]',
            compact ? 'w-6 text-xs' : 'w-8 text-sm'
          )}
          aria-label={t('instructionView.startStep', 'Start step')}
        />
        <span className={clsx('text-[var(--color-text-subtle)]', compact ? 'text-xs' : 'text-sm')}>–</span>
        <input
          type="text"
          inputMode="numeric"
          value={editEnd}
          onChange={(e) => setEditEnd(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown}
          className={clsx(
            'px-1 py-0.5 text-center font-medium bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] rounded text-[var(--color-text-base)] focus:outline-none focus:border-[var(--color-secondary)]',
            compact ? 'w-6 text-xs' : 'w-8 text-sm'
          )}
          aria-label={t('instructionView.endStep', 'End step')}
        />
        <button
          onClick={handleConfirm}
          className="ml-1 px-2 py-0.5 text-xs font-medium rounded bg-[var(--color-secondary)] text-[var(--color-accent-text)] hover:opacity-90 transition-opacity"
        >
          {t('common.ok', 'OK')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={clsx(
        'group inline-flex items-center rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-muted)] hover:border-[var(--color-border-base)] hover:bg-[var(--color-bg-elevated)] transition-all cursor-pointer',
        compact ? 'gap-1 px-2 py-1' : 'gap-2 px-3 py-1.5'
      )}
      aria-label={`${label} ${startStep}-${endStep}, ${t('instructionView.clickToEdit', 'click to edit')}`}
    >
      <span className={clsx('text-[var(--color-text-muted)]', compact ? 'text-xs' : 'text-sm')}>{label}</span>
      <span className={clsx('font-semibold text-[var(--color-text-base)] tabular-nums', compact ? 'text-xs' : 'text-sm')}>
        {startStep === endStep ? startStep : `${startStep}–${endStep}`}
      </span>
      <Pencil className={clsx('text-[var(--color-text-subtle)] group-hover:text-[var(--color-secondary)] transition-colors', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
    </button>
  );
}

/** Combo input/dropdown for step count */
interface StepCountComboProps {
  value: number;
  onChange: (value: number) => void;
  /** Max selectable step count (remaining steps from current position) */
  maxValue: number;
  /** Whether "All" mode is active (showing all steps from 1) */
  isAllMode: boolean;
  /** Callback when "All" is selected */
  onSelectAll: () => void;
  label?: string;
  /** Compact mode for narrow drawer */
  compact?: boolean;
}

function StepCountCombo({ value, onChange, maxValue, isAllMode, onSelectAll, label, compact = false }: StepCountComboProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(isAllMode ? t('instructionView.all', 'All') : String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input value when prop changes
  useEffect(() => {
    setInputValue(isAllMode ? t('instructionView.all', 'All') : String(value));
  }, [value, isAllMode, t]);

  useClickOutside(containerRef, () => setIsOpen(false));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setInputValue(val);
  };

  const handleInputBlur = () => {
    // If input is empty or was showing "All", keep current value
    if (inputValue === '' || inputValue === t('instructionView.all', 'All')) {
      setInputValue(isAllMode ? t('instructionView.all', 'All') : String(value));
      return;
    }
    let num = parseInt(inputValue, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > maxValue) num = maxValue;
    setInputValue(String(num));
    onChange(num);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(isAllMode ? t('instructionView.all', 'All') : String(value));
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionSelect = (option: number) => {
    setInputValue(String(option));
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleSelectAll = () => {
    setInputValue(t('instructionView.all', 'All'));
    onSelectAll();
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={clsx('inline-flex items-center', compact ? 'gap-1' : 'gap-2')}>
      {label && <span className={clsx('text-[var(--color-text-muted)]', compact ? 'text-xs' : 'text-sm')}>{label}</span>}
      <div ref={containerRef} className="relative">
        <div className="relative inline-flex items-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsOpen(true)}
            className={clsx(
              'rounded-lg shadow-sm bg-[var(--color-bg-surface)] text-[var(--color-text-base)] font-semibold text-center hover:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]/40 transition-all',
              compact ? 'w-14 pl-2 pr-5 py-1 text-xs' : 'w-20 pl-3 pr-7 py-1.5 text-sm'
            )}
            aria-label={label || t('instructionView.stepCount', 'Step count')}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={clsx('absolute p-0.5 rounded hover:bg-[var(--color-bg-hover)] transition-colors', compact ? 'right-1' : 'right-1.5')}
            aria-label={t('instructionView.showOptions', 'Show options')}
            tabIndex={-1}
          >
            <ChevronDown className={clsx('text-[var(--color-text-subtle)] transition-transform', compact ? 'w-3 h-3' : 'w-3.5 h-3.5', isOpen && 'rotate-180')} />
          </button>
        </div>

        {/* Dropdown options */}
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-1 w-full bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto"
            role="listbox"
          >
            {/* "All" option first */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={clsx(
                'w-full font-medium text-center hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border-muted)]',
                compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                isAllMode ? 'bg-[var(--color-bg-selected)] text-[var(--color-secondary)]' : 'text-[var(--color-text-base)]'
              )}
              role="option"
              aria-selected={isAllMode}
            >
              {t('instructionView.all', 'All')}
            </button>
            {Array.from({ length: maxValue }, (_, i) => i + 1).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionSelect(option)}
                className={clsx(
                  'w-full font-medium text-center hover:bg-[var(--color-bg-hover)] transition-colors',
                  compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
                  !isAllMode && option === value ? 'bg-[var(--color-bg-selected)] text-[var(--color-secondary)]' : 'text-[var(--color-text-base)]'
                )}
                role="option"
                aria-selected={!isAllMode && option === value}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PartsDrawer - Fullpage slide-over for parts/tools display
 *
 * Features:
 * - Fullscreen slide-over from left with backdrop
 * - Responsive 2-6 column grid with large IKEA-style cards
 * - Editable step range selector
 * - Click on card to open detail modal
 * - localStorage persistence for step range preferences
 * - Optional "Start" button for initial view
 */
export function PartsDrawer({
  isOpen,
  onClose,
  currentStepNumber,
  totalSteps,
  highlightedSubstepId,
  folderName,
  useBlurred,
  useRawVideo = false,
  tutorialHighlight = false,
  editMode = false,
  renderPartToolEditor,
}: PartsDrawerProps) {
  const { t } = useTranslation();
  const data = useViewerData();

  // Selected item for read-only detail modal
  const [selectedItem, setSelectedItem] = useState<AggregatedPartTool | null>(null);

  // Editing item ID for editor render prop (separate from read-only detail).
  // We store only the ID so that the rendered item always reflects the latest
  // store data instead of a stale snapshot.
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Step range state
  const [startStep, setStartStep] = useState(1);
  const [endStep, setEndStep] = useState(totalSteps);

  // Filter panel collapsed/expanded
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Track previous isOpen to detect opening transition
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  // Reset state DURING RENDER when drawer opens (not in useEffect/useLayoutEffect)
  // This is React's "derived state during render" pattern - ensures state is correct
  // BEFORE DOM commit, preventing the width animation glitch caused by stale state.
  // When setState is called during render, React immediately re-renders before commit.
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    // Reset to current step only
    const step = Math.min(currentStepNumber, totalSteps);
    setStartStep(step);
    setEndStep(step);
    setIsFilterOpen(false);
  }
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
    setSelectedItem(null);
    setEditingItemId(null);
  }

  // Get filtered parts/tools using the hook
  const stepRange = useMemo<[number, number]>(
    () => [startStep, Math.min(endStep, totalSteps)],
    [startStep, endStep, totalSteps],
  );
  const { parts, tools } = useFilteredPartsTools(stepRange, totalSteps);

  const allItems = useMemo(() => [...tools, ...parts], [tools, parts]);
  const hasNoItems = allItems.length === 0;

  // Current step count for dropdown
  const currentStepCount = endStep - startStep + 1;

  // Check if "All" mode is active (showing all steps from 1 to max)
  const isAllMode = startStep === 1 && endStep === totalSteps;

  // Max selectable step count from current position (remaining steps)
  const maxSelectableSteps = totalSteps - startStep + 1;

  // Handle start step change
  const handleStartChange = (value: number) => {
    const clamped = Math.max(1, Math.min(value, totalSteps));
    setStartStep(clamped);
    saveStartStepPreference(clamped);
    if (endStep < clamped) {
      setEndStep(clamped);
    }
  };

  // Handle end step change
  const handleEndChange = (value: number) => {
    const clamped = Math.max(startStep, Math.min(value, totalSteps));
    setEndStep(clamped);
    saveStepCountPreference(clamped - startStep + 1);
  };

  // Handle step count change (dropdown)
  const handleStepCountChange = (count: number) => {
    // When changing step count, keep the current startStep
    const newEnd = Math.min(startStep + count - 1, totalSteps);
    setEndStep(newEnd);
    saveStepCountPreference(count);
  };

  // Handle "All" selection
  const handleSelectAll = () => {
    setStartStep(1);
    setEndStep(totalSteps);
  };

  return (
    <CollapsiblePanel
      isOpen={isOpen}
      maxHeight="50vh"
      className="bg-[var(--color-bg-surface)] shadow-md border-b border-[var(--color-border-muted)]"
    >
        {/* Header */}
        <div className="flex items-center justify-between shadow-sm bg-gradient-to-r from-[var(--color-bg-elevated)] to-[var(--color-bg-surface)] px-2">
          {/* Left: Title + Filter toggle */}
          <div className="flex items-center gap-1 sm:gap-2">
            <h2 className="font-semibold text-lg text-[var(--color-text-base)] pl-3">
              {t('instructionView.partsTools', 'Parts & Tools')}
            </h2>
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              className={clsx(
                'relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg transition-colors',
                isFilterOpen
                  ? 'bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-base)] hover:bg-[var(--color-bg-elevated)]'
              )}
              aria-label={t('instructionView.filterSteps', 'Filter steps')}
            >
              <Filter className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Right: Close button */}
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-base)] hover:bg-[var(--color-bg-elevated)] transition-colors',
              tutorialHighlight && 'shadow-[inset_0_0_0_0.1875rem_var(--color-tutorial)]'
            )}
            aria-label={t('common.close', 'Close')}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
            {tutorialHighlight && <TutorialClickIcon iconPosition="bottom-right" />}
          </button>
        </div>

        {/* Step Range Filter (collapsible) */}
        {isFilterOpen && (
          <div className="flex items-center justify-center gap-2 px-2 py-2 shadow-sm bg-[var(--color-bg-base)]/50">
            <div className="inline-flex items-center gap-2">
              <StepRangeSelector
                startStep={startStep}
                endStep={Math.min(endStep, totalSteps)}
                maxSteps={totalSteps}
                onStartChange={handleStartChange}
                onEndChange={handleEndChange}
                label={t('instructionView.steps', 'Steps')}
                compact
              />
              <StepCountCombo
                value={currentStepCount}
                onChange={handleStepCountChange}
                maxValue={maxSelectableSteps}
                isAllMode={isAllMode}
                onSelectAll={handleSelectAll}
                label={t('instructionView.showNextSteps', 'Step count')}
                compact
              />
            </div>
          </div>
        )}

        {/* Content - scrollable */}
        <div className="overflow-y-auto scrollbar-subtle p-3">
          {hasNoItems ? (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
              <p>{t('instructionView.noPartsTools', 'No parts or tools')}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 content-start">
              {allItems.map((item) => (
                <PartToolCard
                  key={item.partTool.id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                  highlightedSubstepId={highlightedSubstepId}
                  folderName={folderName}
                  partToolVideoFrameAreas={data?.partToolVideoFrameAreas}
                  useBlurred={useBlurred}
                  useRawVideo={useRawVideo}
                  videoFrameAreas={data?.videoFrameAreas}
                  videos={data?.videos}
                  editMode={editMode}
                  onEditClick={renderPartToolEditor ? () => setEditingItemId(item.partTool.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      {/* Read-only Detail Modal */}
      <PartToolDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        folderName={folderName}
        partToolVideoFrameAreas={data?.partToolVideoFrameAreas}
        useBlurred={useBlurred}
        videoFrameAreas={data?.videoFrameAreas}
        frameCaptureData={
          useRawVideo && selectedItem && folderName
            ? resolvePartToolFrameCapture(
                selectedItem.partTool.id,
                data?.partToolVideoFrameAreas ?? {},
                data?.videoFrameAreas ?? {},
                data?.videos ?? {},
                folderName,
              )
            : null
        }
      />

      {/* Editor render prop (provided by app shell via editor-core) */}
      {editingItemId && (() => {
        const editingItem = allItems.find((i) => i.partTool.id === editingItemId);
        if (!editingItem) return null;
        return renderPartToolEditor?.({
          item: editingItem,
          onClose: () => setEditingItemId(null),
        });
      })()}
    </CollapsiblePanel>
  );
}

/**
 * Unified card component for parts/tools display
 * - Fixed 288px width, wraps naturally in flex container
 * - Colored left border (yellow for parts, orange for tools)
 * - Shows substep-specific amount when highlighted
 */
export function PartToolCard({
  item,
  onClick,
  highlightedSubstepId,
  folderName,
  partToolVideoFrameAreas,
  useBlurred,
  useRawVideo = false,
  videoFrameAreas,
  videos,
  editMode = false,
  onEditClick,
}: {
  item: AggregatedPartTool;
  onClick: () => void;
  highlightedSubstepId?: string;
  folderName?: string;
  partToolVideoFrameAreas?: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>;
  useBlurred?: boolean;
  useRawVideo?: boolean;
  videoFrameAreas?: Record<string, VideoFrameAreaRow>;
  videos?: Record<string, VideoRow>;
  editMode?: boolean;
  onEditClick?: () => void;
}) {
  const { t } = useTranslation();
  const Icon = item.partTool.type === 'Part' ? Package : Wrench;
  const iconColorClass = item.partTool.type === 'Part'
    ? 'text-[var(--color-element-part)]'
    : 'text-[var(--color-element-tool)]';

  // Border color based on type (yellow for parts, orange for tools)
  const borderColorClass = item.partTool.type === 'Part'
    ? 'border-l-[var(--color-element-part)]'
    : 'border-l-[var(--color-element-tool)]';

  const previewImageUrl = resolvePartToolImageUrl(
    item.partTool.id,
    folderName,
    partToolVideoFrameAreas ?? {},
    useBlurred,
    videoFrameAreas,
  );

  // Compute raw frame capture data for Editor preview
  const frameCaptureData: FrameCaptureData | null = useRawVideo && folderName
    ? resolvePartToolFrameCapture(
        item.partTool.id,
        partToolVideoFrameAreas ?? {},
        videoFrameAreas ?? {},
        videos ?? {},
        folderName,
      )
    : null;

  // Calculate substep-specific amount display
  // If highlighted substep uses this item and multiple substeps in the same step use it,
  // show "N/Mx" format (substep amount / step total)
  const substepAmount = highlightedSubstepId
    ? item.amountsPerSubstep.get(highlightedSubstepId)
    : undefined;

  const stepTotalAmount = item.totalAmount;

  // Determine if we should show the fractional amount (N/Mx)
  // Show fractional when: substep is highlighted, item is used in that substep,
  // and item is used in multiple substeps (indicated by substepAmount being less than total)
  const showFractionalAmount = substepAmount !== undefined && substepAmount < stepTotalAmount;

  // Highlight state: when a substep is highlighted, mark cards that belong to it
  const isInHighlightedSubstep = highlightedSubstepId && substepAmount !== undefined;
  const isDimmed = highlightedSubstepId && !isInHighlightedSubstep;

  // Highlight ring when item belongs to the highlighted substep
  const highlightRingClass = isInHighlightedSubstep
    ? 'ring-3 ring-[var(--color-element-tool)]'
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex flex-row items-stretch h-22 rounded-lg overflow-hidden border-l-4 text-left transition-all cursor-pointer',
        'shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        'bg-[var(--color-bg-elevated)]',
        borderColorClass,
        highlightRingClass,
        isDimmed && 'opacity-30',
      )}
    >
      {/* Image — fills card height */}
      <div className="w-22 flex-shrink-0 flex items-center justify-center overflow-hidden bg-black">
        {frameCaptureData ? (
          <VideoFrameCapture
            videoId={frameCaptureData.videoId}
            fps={frameCaptureData.fps}
            frameNumber={frameCaptureData.frameNumber}
            cropArea={frameCaptureData.cropArea}
            videoSrc={frameCaptureData.videoSrc}
            alt={item.partTool.name}
            className="w-full h-full"
          />
        ) : previewImageUrl ? (
          <img
            src={previewImageUrl}
            alt={item.partTool.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <Icon className={clsx(iconColorClass, 'opacity-60 w-10 h-10')} />
        )}
      </div>

      {/* Content — name top, optional detail middle, quantity bottom */}
      <div className="flex flex-col justify-between p-1.5 flex-1 min-w-0 overflow-hidden">
        {/* Row 1: Name */}
        <span className="block text-xs font-medium text-[var(--color-text-base)] truncate">
          {item.partTool.name}
        </span>

        {/* Row 2: Optional detail — first available: partNumber, material, dimension */}
        <span className="block text-[0.65rem] leading-tight text-[var(--color-text-muted)] truncate">
          {item.partTool.partNumber ? (
            <span className="font-mono">#{item.partTool.partNumber}</span>
          ) : item.partTool.material ? (
            <span className="inline-flex items-center gap-0.5">
              <Box className="w-3 h-3 flex-shrink-0 inline" aria-hidden="true" />
              {item.partTool.material}
            </span>
          ) : item.partTool.dimension ? (
            <span className="inline-flex items-center gap-0.5">
              <Ruler className="w-3 h-3 flex-shrink-0 inline" aria-hidden="true" />
              {item.partTool.dimension}
            </span>
          ) : '\u00A0'}
        </span>

        {/* Bottom: quantity badge + edit */}
        <div className="flex items-center gap-1">
          {showFractionalAmount ? (
            <span className="rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-base)] font-bold px-2 py-0.5 text-sm">
              <span className={item.partTool.type === 'Part' ? 'text-[var(--color-element-part)]' : 'text-[var(--color-element-tool)]'}>
                {substepAmount}
              </span>
              <span className="text-[var(--color-text-muted)]">/{stepTotalAmount}x</span>
              {item.partTool.unit && <span className="text-[var(--color-text-muted)] ml-0.5 text-[0.75em]">{item.partTool.unit}</span>}
            </span>
          ) : (
            <span className="rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-base)] font-bold text-[var(--color-text-base)] px-2 py-0.5 text-sm">
              {item.totalAmount}x
              {item.partTool.unit && <span className="text-[var(--color-text-muted)] ml-0.5 text-[0.75em] font-normal">{item.partTool.unit}</span>}
            </span>
          )}

          {editMode && onEditClick && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Pencil />}
              data-testid={`edit-parttool-${item.partTool.id}`}
              aria-label={t('common.edit', 'Edit')}
              onClick={(e) => { e.stopPropagation(); onEditClick(); }}
            />
          )}
        </div>
      </div>
    </button>
  );
}
