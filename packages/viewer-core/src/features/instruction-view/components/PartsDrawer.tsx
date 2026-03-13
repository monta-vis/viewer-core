import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Box, Ruler } from 'lucide-react';
import { PartIcon, ToolIcon } from '@/lib/icons';
import { clsx } from 'clsx';

import { CollapsiblePanel, IconButton, TextInputModal } from '@/components/ui';
import type { TextInputSuggestion } from '@/components/ui';
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
import { StepCountSlider } from './StepCountSlider';

// localStorage key for persisting step count preference
const STORAGE_KEY_COUNT = 'montavis-parts-tools-step-count';

function loadStepCountPreference(): number | 'all' | 'assembly' {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COUNT);
    if (raw === 'all') return 'all';
    if (raw === 'assembly') return 'assembly';
    if (raw) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 1) return num;
    }
  } catch (error) {
    console.warn('[PartsDrawer] Failed to load step count preference:', error);
  }
  return 1;
}

function saveStepCountPreference(value: number | 'all' | 'assembly'): void {
  try {
    localStorage.setItem(STORAGE_KEY_COUNT, String(value));
  } catch (error) {
    console.warn('[PartsDrawer] Failed to save step count preference:', error);
  }
}

interface PartsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
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
  /** Show inline edit controls. Default: false */
  editMode?: boolean;
  /** Called when edit icon is clicked on a PartToolCard. Opens the PartToolListPanel with this partTool pre-selected. */
  onEditPartTool?: (partToolId: string) => void;
  /** Initial step count to show when drawer opens. Default: 1 */
  initialStepCount?: number | 'all' | 'assembly';
  /** Called when a PartToolCard is hovered (id) or unhovered (null). Desktop reverse-highlight. */
  onPartToolHover?: (partToolId: string | null) => void;
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
  currentStepNumber,
  totalSteps,
  highlightedSubstepId,
  folderName,
  useBlurred,
  useRawVideo = false,
  editMode = false,
  onEditPartTool,
  initialStepCount,
  onPartToolHover,
}: PartsDrawerProps) {
  const { t } = useTranslation();
  const data = useViewerData();

  // Selected item for read-only detail modal
  const [selectedItem, setSelectedItem] = useState<AggregatedPartTool | null>(null);

  // Whether the step-count filter modal is open
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Block scroll over the step-filter area so it doesn't trigger the
  // parent horizontal scroll container.
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = filterRef.current;
    if (!el) return;
    const preventWheel = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', preventWheel, { passive: false });
    // Disable parent overflow while pointer is down on filter area
    const lockScroll = () => {
      if (!scrollRef.current) return;
      scrollRef.current.style.overflowX = 'hidden';
      const unlock = () => {
        if (scrollRef.current) scrollRef.current.style.overflowX = '';
      };
      window.addEventListener('pointerup', unlock, { once: true });
      window.addEventListener('pointercancel', unlock, { once: true });
    };
    el.addEventListener('pointerdown', lockScroll);
    return () => {
      el.removeEventListener('wheel', preventWheel);
      el.removeEventListener('pointerdown', lockScroll);
    };
  }, []);

  // Sliding window: selectedCount determines how many steps to show from currentStepNumber
  const [selectedCount, setSelectedCount] = useState<number | 'all' | 'assembly'>(loadStepCountPreference);

  function applyStepCount(value: number | 'all' | 'assembly'): void {
    setSelectedCount(value);
    saveStepCountPreference(value);
  }

  // Track previous isOpen to detect opening transition
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  // Reset state DURING RENDER when drawer opens (not in useEffect/useLayoutEffect)
  // This is React's "derived state during render" pattern - ensures state is correct
  // BEFORE DOM commit, preventing the width animation glitch caused by stale state.
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setSelectedCount(initialStepCount ?? 1);
  }
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
    setSelectedItem(null);
  }

  // Compute assembly step range for the current step's assembly
  const assemblyStepRange = useMemo<[number, number]>(() => {
    if (!data) return [currentStepNumber, currentStepNumber];
    const currentStep = Object.values(data.steps).find(
      (s) => s.stepNumber === currentStepNumber,
    );
    if (!currentStep?.assemblyId) return [currentStepNumber, currentStepNumber];
    const assemblySteps = Object.values(data.steps)
      .filter((s) => s.assemblyId === currentStep.assemblyId);
    const nums = assemblySteps.map((s) => s.stepNumber);
    return [Math.min(...nums), Math.max(...nums)];
  }, [data, currentStepNumber]);

  // Whether there are 2+ assemblies with steps (controls toggle visibility)
  const hasMultipleAssemblies = useMemo(() => {
    if (!data) return false;
    return Object.values(data.assemblies).filter((a) => a.stepIds.length > 0).length >= 2;
  }, [data]);

  // Derive start/end from currentStepNumber + selectedCount (sliding window)
  let startStep: number;
  let endStep: number;
  if (selectedCount === 'all') {
    startStep = 1;
    endStep = totalSteps;
  } else if (selectedCount === 'assembly') {
    startStep = assemblyStepRange[0];
    endStep = assemblyStepRange[1];
  } else {
    startStep = currentStepNumber;
    endStep = Math.min(currentStepNumber + selectedCount - 1, totalSteps);
  }

  // Get filtered parts/tools using the hook
  const stepRange = useMemo<[number, number]>(
    () => [startStep, Math.min(endStep, totalSteps)],
    [startStep, endStep, totalSteps],
  );
  const { parts, tools } = useFilteredPartsTools(stepRange, totalSteps);

  const allItems = useMemo(() => [...tools, ...parts], [tools, parts]);

  const isAllMode = selectedCount === 'all';
  const isAssemblyMode = selectedCount === 'assembly';

  // Build suggestions for step count modal: "All" + 1..totalSteps
  const stepCountSuggestions = useMemo<TextInputSuggestion[]>(() => {
    const items: TextInputSuggestion[] = [
      { id: 'all', label: t('instructionView.all', 'All') },
    ];
    for (let i = 1; i <= totalSteps; i++) {
      items.push({ id: String(i), label: String(i) });
    }
    return items;
  }, [totalSteps, t]);

  return (
    <CollapsiblePanel
      isOpen={isOpen}
      className="bg-[var(--color-bg-surface)] shadow-md border-b border-[var(--color-border-muted)]"
    >
        {/* Content - scrollable: horizontal strip on mobile, vertical grid on desktop */}
        <div ref={scrollRef} className="max-h-28 md:max-h-48 overflow-x-auto overflow-y-hidden md:overflow-x-hidden md:overflow-y-auto scrollbar-subtle px-3">
            <div className="flex flex-nowrap gap-2 md:flex-wrap md:content-start">
              <div ref={filterRef}>
                <StepCountSlider
                  value={typeof selectedCount === 'number' ? selectedCount : (endStep - startStep + 1)}
                  isAll={isAllMode}
                  isAssembly={isAssemblyMode}
                  hasMultipleAssemblies={hasMultipleAssemblies}
                  currentStepNumber={startStep}
                  totalSteps={totalSteps}
                  onChange={applyStepCount}
                  onAllChange={(checked) => applyStepCount(checked ? 'all' : 1)}
                  onAssemblyChange={(checked) => applyStepCount(checked ? 'assembly' : 1)}
                  onNumberClick={() => setFilterModalOpen(true)}
                />
              </div>

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
                  onEditClick={onEditPartTool ? () => onEditPartTool(item.partTool.id) : undefined}
                  onPartToolHover={onPartToolHover}
                />
              ))}
            </div>
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

      {/* Step count filter modal */}
      {filterModalOpen && (
        <TextInputModal
          label={t('instructionView.showNextSteps', 'Show next steps')}
          value={isAllMode || isAssemblyMode ? '' : String(selectedCount)}
          inputType="number"
          suggestions={stepCountSuggestions}
          onSelect={(id) => {
            applyStepCount(id === 'all' ? 'all' : parseInt(id, 10));
            setFilterModalOpen(false);
          }}
          onConfirm={(val) => {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num >= 1) {
              applyStepCount(num >= totalSteps ? 'all' : num);
            }
            setFilterModalOpen(false);
          }}
          onCancel={() => setFilterModalOpen(false)}
        />
      )}
    </CollapsiblePanel>
  );
}

/** Renders the first available detail field: partNumber, material, or dimension. */
function PartToolDetail({ partTool }: { partTool: AggregatedPartTool['partTool'] }) {
  if (partTool.partNumber) {
    return <span className="font-mono">#{partTool.partNumber}</span>;
  }
  if (partTool.material) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <Box className="w-3 h-3 flex-shrink-0 inline" aria-hidden="true" />
        {partTool.material}
      </span>
    );
  }
  if (partTool.dimension) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <Ruler className="w-3 h-3 flex-shrink-0 inline" aria-hidden="true" />
        {partTool.dimension}
      </span>
    );
  }
  return <>{'\u00A0'}</>;
}

/**
 * Unified card component for parts/tools display
 * - Fixed 288px width, wraps naturally in flex container
 * - Colored left border (yellow for parts, orange for tools)
 * - Shows substep-specific amount when highlighted
 */
export const PartToolCard = memo(function PartToolCard({
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
  onPartToolHover,
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
  onPartToolHover?: (partToolId: string | null) => void;
}) {
  const { t } = useTranslation();
  const Icon = item.partTool.type === 'Part' ? PartIcon : ToolIcon;
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
    ? `ring-3 ${item.partTool.type === 'Part' ? 'ring-[var(--color-element-part)]' : 'ring-[var(--color-element-tool)]'}`
    : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      onMouseEnter={() => onPartToolHover?.(item.partTool.id)}
      onMouseLeave={() => onPartToolHover?.(null)}
      className={clsx(
        'shrink-0 md:shrink flex flex-row items-stretch h-22 rounded-lg overflow-hidden border-l-4 text-left transition-all cursor-pointer',
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
            loading="lazy"
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
          <PartToolDetail partTool={item.partTool} />
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
    </div>
  );
});
