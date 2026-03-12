import type { ReactNode } from 'react';
import { Fragment, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronRight, Gauge, Home, LayoutGrid, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';

import { Button, Drawer, TutorialClickIcon } from '@/components/ui';
import { isImageDrawing, isVideoDrawing, formatTutorialDisplayRich, UNASSIGNED_STEP_ID } from '@/features/instruction';
import { useViewerData } from '../context';
import { sortedValues, byStepNumber } from '@/lib/sortedValues';
import type { DrawingRow, EnrichedSubstepNote, EnrichedSubstepPartTool, PartToolRow, SubstepDescriptionRow, SubstepRow, RichTutorialDisplay, SafetyIconCategory } from '@/features/instruction';
import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';
import { FeedbackButton, StarRating } from '@/features/feedback';
import { useVideo } from '@/features/video-player';
import { buildMediaUrl, MediaPaths, resolveFramePath } from '@/lib/media';

import { PartToolBadge } from './PartToolBadge';
import { SubstepCard } from './SubstepCard';
import type { SubstepEditCallbacks } from './SubstepCard';
import { StepOverview } from './StepOverview';
import { PartsDrawer } from './PartsDrawer';
import { SpeedDrawer } from './SpeedDrawer';
import { resolveRawFrameCapture } from '../utils/resolveRawFrameCapture';
import { getUnassignedSubsteps } from '../utils/getUnassignedSubsteps';
import { resolveTutorialTargets, type TutorialTargetResult } from '../utils/resolveTutorialTargets';
import { computeTutorialToggle } from '../utils/tutorialToggle';
import { progressPercent } from '../utils/progressPercent';
import type { ActiveTutorial } from '../utils/tutorialToggle';
import type { TutorialStep } from '../utils/tutorialSteps';
import { getInitialTutorialStep, advanceOnDrawerOpen, advanceOnDrawerClose, advanceOnSubstepClick } from '../utils/tutorialSteps';
import {
  useResponsiveGridColumns,
  CARD_MIN_WIDTH_REM,
  CARD_MAX_WIDTH_REM,
  CARD_GAP_REM,
} from '../hooks/useResponsiveGridColumns';
import { useSwipeGestures, type DrawerRefs } from '../hooks/useSwipeGestures';
import { useVisibleStep } from '../hooks/useVisibleStep';
import { useVisibleSubstep } from '../hooks/useVisibleSubstep';
import { usePartToolSubstepMap } from '../hooks/usePartToolSubstepMap';
import { buildVideoEntry, type SubstepVideoEntry } from '../utils/buildVideoEntry';
import { StepSeparator } from './StepSeparator';
import { AssemblySeparator } from './AssemblySeparator';

/** Stable empty array to avoid new-reference re-renders in SubstepCard effects */
const EMPTY_DRAWINGS: DrawingRow[] = [];

/** Stable empty set to avoid new-reference allocations in partTool highlight memo */
const EMPTY_STRING_SET = new Set<string>();

const ARROW_SIZES = {
  sm: { circle: 'w-6 h-6', icon: 'w-4 h-4' },
  md: { circle: 'w-8 h-8', icon: 'w-5 h-5' },
} as const;

/** Small arrow circle used for substep flow navigation */
function ArrowCircle({ direction, size = 'md' }: { direction: 'right' | 'down'; size?: 'sm' | 'md' }): ReactNode {
  const Icon = direction === 'right' ? ChevronRight : ChevronDown;
  const { circle, icon } = ARROW_SIZES[size];
  return (
    <div className={`${circle} rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center shadow-md`}>
      <Icon className={`${icon} text-[var(--color-secondary)]`} />
    </div>
  );
}

interface InstructionViewProps {
  /** Currently selected step ID */
  selectedStepId: string | null;
  /** Callback to change the selected step */
  onStepChange?: (stepId: string) => void;
  /** Instruction ID (needed for "Track Changes" feature) */
  instructionId?: string;
  /** Callback to take a break (navigate to dashboard, pause tracking) */
  onBreak?: () => void;
  /** Icon variant for the break button. 'close' shows X icon (default), 'home' shows Home icon */
  breakVariant?: 'close' | 'home';
  /** Activity logger instance (from ViewPage) */
  activityLogger?: {
    logStepEntered: (stepId: string) => void;
    logStepExited: (stepId: string, meta?: Record<string, unknown>) => void;
    logSubstepViewed: (substepId: string, meta?: Record<string, unknown>) => void;
    logInstructionCompleted: (meta?: Record<string, unknown>) => void;
  };
  /** Initial substep ID to auto-play (for "Continue" feature) */
  initialSubstepId?: string | null;
  /** Use raw video URLs instead of exported VideoSections/VideoFrameAreas (for Editor preview). Default: false */
  useRawVideo?: boolean;
  /** Project folder name for mvis-media:// URLs (enables source video in Editor preview) */
  folderName?: string;
  /** Whether to use blurred media variants for parts/tools images */
  useBlurred?: boolean;
  /** Whether the parts drawer should start open. Default: false */
  initialPartsDrawerOpen?: boolean;
  /** Enable guided tutorial overlay (3-step walkthrough). Default: false */
  tutorial?: boolean;
  /** Whether edit mode is active (controlled by parent). Default: false */
  editModeActive?: boolean;
  /** Edit callbacks per substep (substepId passed as first arg) */
  editCallbacks?: {
    onDeleteImage?: (substepId: string) => void;
    onAnnotateVideo?: (substepId: string) => void;
    onDeleteVideo?: (substepId: string) => void;
    onSaveDescription?: (descriptionId: string, text: string, substepId: string) => void;
    onDeleteDescription?: (descriptionId: string, substepId: string) => void;
    onAddDescription?: (text: string, substepId: string) => void;
    onSaveNote?: (noteRowId: string, text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, substepId: string, sourceIconId?: string) => void;
    onDeleteNote?: (noteRowId: string, substepId: string) => void;
    onAddNote?: (text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, substepId: string, sourceIconId?: string) => void;
    onSaveRepeat?: (count: number, label: string | null, substepId: string) => void;
    onDeleteRepeat?: (substepId: string) => void;
    onEditTutorial?: (tutorialIndex: number, substepId: string) => void;
    onDeleteTutorial?: (tutorialIndex: number, substepId: string) => void;
    onAddTutorial?: (substepId: string) => void;
    onEditPartTools?: (substepId: string) => void;
    onUpdatePartTool?: (partToolId: string, updates: Partial<PartToolRow>) => void;
    onUpdateSubstepPartToolAmount?: (substepPartToolId: string, amount: number) => void;
    onAddSubstepPartTool?: (substepId: string) => void;
    onDeleteSubstepPartTool?: (substepPartToolId: string) => void;
    onDeleteSubstep?: (substepId: string) => void;
    onDeleteStep?: (stepId: string) => void;
    onAddSubstep?: (stepId: string) => void;
    onAddAssembly?: () => void;
    onDeleteAssembly?: (assemblyId: string) => void;
    onRenameAssembly?: (assemblyId: string, title: string) => void;
    onRenameStep?: (stepId: string, title: string) => void;
    onMoveStepToAssembly?: (stepId: string, assemblyId: string | null) => void;
    onReorderAssembly?: (assemblyId: string, newIndex: number) => void;
    renderAssemblyList?: (
      assemblies: import('@/features/instruction').Assembly[],
      renderAssembly: (assembly: import('@/features/instruction').Assembly) => ReactNode,
    ) => ReactNode;
    renderPreviewUpload?: (stepId: string) => ReactNode;
    renderAssemblyPreviewUpload?: (assemblyId: string) => ReactNode;
    /** Wraps all assembly sections with unified DnD context. When present, replaces renderAssemblyList. */
    renderStepDndWrapper?: (
      containers: Array<{ containerId: string; stepIds: string[] }>,
      children: ReactNode,
      options?: {
        assemblyIds?: string[];
        substepContainers?: Array<{ containerId: string; substepIds: string[] }>;
      },
    ) => ReactNode;
    /** Wraps a step grid with sortable context (editor-core). */
    renderSortableStepGrid?: (
      containerId: string,
      steps: import('./AssemblySection').StepWithPreview[],
      renderStep: (step: import('./AssemblySection').StepWithPreview) => ReactNode,
    ) => ReactNode;
    /** Wraps an assembly section with a sortable wrapper for DnD reordering by header handle. */
    renderSortableAssembly?: (
      assemblyId: string,
      children: (props: { dragHandleProps: { listeners: Record<string, unknown>; attributes: Record<string, unknown> }; isDragging: boolean }) => ReactNode,
    ) => ReactNode;
    /** Wraps a step's substep previews with sortable context (per step container). */
    renderSortableSubstepGrid?: (
      containerId: string,
      substeps: Array<{ id: string; order: number; title: string | null; imageUrl: string | null; frameCaptureData: unknown }>,
      renderSubstep: (substep: { id: string; order: number; title: string | null; imageUrl: string | null; frameCaptureData: unknown }) => ReactNode,
    ) => ReactNode;
  };
  /** Web3Forms access key for feedback submission (provided by app layer). */
  web3FormsKey?: string;
  /** Map of safetyIconId → localized label for note icon tooltips (provided by app layer from catalogs). */
  noteIconLabels?: Record<string, string>;
  /** Render function for the edit popover (provided by editor-core via app shell). Passed through to SubstepCard. */
  renderEditPopover?: (props: {
    open: boolean;
    onClose: () => void;
    callbacks: SubstepEditCallbacks;
    descriptions: SubstepDescriptionRow[];
    notes: EnrichedSubstepNote[];
    partTools: EnrichedSubstepPartTool[];
    repeatCount: number;
    repeatLabel?: string | null;
    tutorials: Array<{ kind: string; label: string }>;
    hasImage: boolean;
    hasVideo: boolean;
    substepId?: string;
  }) => ReactNode;
  /** Render function for the part/tool editor (provided by editor-core via app shell). Passed to PartsDrawer. */
  renderPartToolEditor?: (props: { item: AggregatedPartTool; onClose: () => void }) => ReactNode;
}

/**
 * InstructionView - Card-based view of substeps for a selected step
 *
 * Shows substeps as cards with inline video playback, images, descriptions, and notes.
 */
export function InstructionView({ selectedStepId, instructionId, onBreak, breakVariant = 'close', activityLogger, initialSubstepId, useRawVideo = false, folderName, useBlurred, initialPartsDrawerOpen = false, tutorial = false, editModeActive = false, editCallbacks, web3FormsKey, noteIconLabels, renderEditPopover, renderPartToolEditor }: InstructionViewProps) {
  const { t } = useTranslation();
  const data = useViewerData();
  const { playbackSpeed } = useVideo();

  // Build mvis-media:// URL from source video path (for Editor preview)
  const resolveSourceVideoUrl = useCallback((video: { videoPath?: string | null }, fallback: string) => {
    if (!useRawVideo || !folderName) return fallback;
    const videoPath = video.videoPath;
    if (!videoPath) return fallback;
    return buildMediaUrl(folderName, videoPath);
  }, [useRawVideo, folderName]);

  // Ref for the grid container (for responsive column calculation)
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Get current grid column count for arrow positioning (container-aware)
  const gridColumns = useResponsiveGridColumns(gridContainerRef);

  // Track step entry time for duration calculation
  const stepEnteredAt = useRef<number>(Date.now());
  const previousStepId = useRef<string | null>(null);

  // Get sorted steps for navigation (with optional virtual "Unassigned" step appended in editor)
  const sortedSteps = useMemo(() => {
    if (!data?.steps) return [];
    const steps = sortedValues(data.steps, byStepNumber);

    if (useRawVideo) {
      const unassigned = getUnassignedSubsteps(data);
      if (unassigned.length > 0) {
        const lastStepNumber = steps.length > 0 ? steps[steps.length - 1].stepNumber : 0;
        steps.push({
          id: UNASSIGNED_STEP_ID,
          versionId: '',
          instructionId: '',
          assemblyId: null,
          stepNumber: lastStepNumber + 1,
          title: null,
          description: null,
          repeatCount: 1,
          repeatLabel: null,
          videoFrameAreaId: null,
          substepIds: unassigned.map((s) => s.id),
        });
      }
    }

    return steps;
  }, [data?.steps, data?.substeps, useRawVideo]);

  // Pre-compute steps with their substeps for the scrollable layout
  const stepsWithSubsteps = useMemo(() => {
    if (!data) return [];
    return sortedSteps.map((s) => ({
      step: s,
      substeps: s.id === UNASSIGNED_STEP_ID
        ? getUnassignedSubsteps(data)
        : s.substepIds.map(id => data.substeps[id]).filter(Boolean)
          .sort((a, b) => a.stepOrder - b.stepOrder),
    }));
  }, [sortedSteps, data]);

  // Flat list of all substeps across all steps (for pre-computing maps)
  const allSubsteps = useMemo(() =>
    stepsWithSubsteps.flatMap(({ substeps }) => substeps),
    [stepsWithSubsteps],
  );

  // Ordered substep IDs for IntersectionObserver-based auto-highlight
  const allSubstepIds = useMemo(() => allSubsteps.map(s => s.id), [allSubsteps]);

  // Reverse lookup: partToolId → Set<substepId>
  const partToolSubstepMap = usePartToolSubstepMap();

  const totalSteps = sortedSteps.length;

  // Compute separate part/tool counts per assembly (unique partToolIds by type)
  const assemblyPartToolCounts = useMemo(() => {
    if (!data) return new Map<string, { parts: number; tools: number }>();
    const counts = new Map<string, { parts: number; tools: number }>();

    for (const assembly of Object.values(data.assemblies)) {
      const partIds = new Set<string>();
      const toolIds = new Set<string>();
      for (const stepId of assembly.stepIds) {
        const step = data.steps[stepId];
        if (!step) continue;
        for (const substepId of step.substepIds) {
          const substep = data.substeps[substepId];
          if (!substep) continue;
          for (const ptId of substep.partToolRowIds) {
            const row = data.substepPartTools[ptId];
            if (!row) continue;
            const partTool = data.partTools[row.partToolId];
            if (!partTool) continue;
            if (partTool.type === 'Tool') {
              toolIds.add(row.partToolId);
            } else {
              partIds.add(row.partToolId);
            }
          }
        }
      }
      counts.set(assembly.id, { parts: partIds.size, tools: toolIds.size });
    }
    return counts;
  }, [data]);

  // Determine if we should show assembly separators (2+ assemblies with assigned steps)
  const showAssemblySeparators = useMemo(() => {
    if (!data) return false;
    const assembliesWithSteps = Object.values(data.assemblies).filter(
      (a) => a.stepIds.length > 0,
    );
    return assembliesWithSteps.length >= 2;
  }, [data]);

  // Refs for step sections (scroll-to-step + useVisibleStep)
  const stepSectionRefs = useRef(new Map<string, HTMLDivElement>());

  // Step IDs array for useVisibleStep
  const stepIds = useMemo(() => sortedSteps.map((s) => s.id), [sortedSteps]);

  // Track which step is currently visible at the top of the scroll container
  const visibleStepId = useVisibleStep(stepSectionRefs, gridContainerRef, stepIds);

  // Derive currentIndex from visibleStepId
  const currentIndex = useMemo(() => {
    if (!visibleStepId) return 0;
    const idx = sortedSteps.findIndex((s) => s.id === visibleStepId);
    return idx >= 0 ? idx : 0;
  }, [visibleStepId, sortedSteps]);

  // Log step_entered/exited based on scroll-tracked visible step
  useEffect(() => {
    if (!visibleStepId || !activityLogger) return;

    if (previousStepId.current && previousStepId.current !== visibleStepId) {
      const duration = Date.now() - stepEnteredAt.current;
      activityLogger.logStepExited(previousStepId.current, {
        exit_reason: 'scroll',
        duration_ms: duration,
      });
    }

    activityLogger.logStepEntered(visibleStepId);
    stepEnteredAt.current = Date.now();
    previousStepId.current = visibleStepId;
  }, [visibleStepId, activityLogger]);

  // Scroll to selectedStepId on initial mount
  const hasScrolledToInitial = useRef(false);
  useEffect(() => {
    if (hasScrolledToInitial.current || !selectedStepId) return;
    const el = stepSectionRefs.current.get(selectedStepId);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      hasScrolledToInitial.current = true;
    }
  }, [selectedStepId, stepsWithSubsteps]);

  // State for showing step overview
  const [showOverview, setShowOverview] = useState(false);

  // State for parts drawer - starts open for initial view (closed in editor preview)
  // Tutorial mode overrides to closed so step 0 ("click PartIcon button") works.
  const [isPartsDrawerOpen, setIsPartsDrawerOpen] = useState(tutorial ? false : initialPartsDrawerOpen);

  // Initial step count for PartsDrawer when opened from assembly pill
  const [partsDrawerInitialCount, setPartsDrawerInitialCount] = useState<number | 'all' | 'assembly' | undefined>(undefined);

  // State for feedback widget (controlled by swipe gesture)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // State for speed drawer (controlled by bottom-edge swipe gesture)
  const [isSpeedDrawerOpen, setIsSpeedDrawerOpen] = useState(false);

  // Track which substep opened the parts drawer (for amount highlighting)
  const [highlightedSubstep, setHighlightedSubstep] = useState<{
    substepId: string;
    stepNumber: number;
  } | null>(null);

  // Desktop reverse-highlight: hovering a PartToolCard highlights substeps that use it
  const [highlightedPartToolId, setHighlightedPartToolId] = useState<string | null>(null);

  const highlightedSubstepIdsFromPartTool = useMemo(() => {
    if (!highlightedPartToolId) return EMPTY_STRING_SET;
    return partToolSubstepMap.get(highlightedPartToolId) ?? EMPTY_STRING_SET;
  }, [highlightedPartToolId, partToolSubstepMap]);

  // Track if user has started the instruction (closed parts drawer at least once)
  // Tutorial mode starts as "started" so drawer opens as narrow variant.
  const [hasStarted, setHasStarted] = useState(tutorial ? true : !initialPartsDrawerOpen);

  // Tutorial step state (null = not active)
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(() => getInitialTutorialStep(tutorial));

  // Edit mode: requires both the prop being true AND editCallbacks being provided
  const effectiveEditMode = editModeActive && !!editCallbacks;

  // Stable factory for per-substep edit callbacks (avoids creating N objects per render tick)
  const makeSubstepEditCallbacks = useCallback(
    (substepId: string): SubstepEditCallbacks | undefined => {
      if (!effectiveEditMode || !editCallbacks) return undefined;
      return {
        onDeleteImage: () => editCallbacks.onDeleteImage?.(substepId),
        onAnnotateVideo: () => editCallbacks.onAnnotateVideo?.(substepId),
        onDeleteVideo: () => editCallbacks.onDeleteVideo?.(substepId),
        onSaveDescription: (descId, text) => editCallbacks.onSaveDescription?.(descId, text, substepId),
        onDeleteDescription: (descId) => editCallbacks.onDeleteDescription?.(descId, substepId),
        onAddDescription: (text) => editCallbacks.onAddDescription?.(text, substepId),
        onSaveNote: (noteRowId, text, iconId, iconCat, sourceIconId) => editCallbacks.onSaveNote?.(noteRowId, text, iconId, iconCat, substepId, sourceIconId),
        onDeleteNote: (noteRowId) => editCallbacks.onDeleteNote?.(noteRowId, substepId),
        onAddNote: (text, iconId, iconCat, sourceIconId) => editCallbacks.onAddNote?.(text, iconId, iconCat, substepId, sourceIconId),
        onSaveRepeat: (count, label) => editCallbacks.onSaveRepeat?.(count, label, substepId),
        onDeleteRepeat: () => editCallbacks.onDeleteRepeat?.(substepId),
        onEditTutorial: (refIdx) => editCallbacks.onEditTutorial?.(refIdx, substepId),
        onDeleteTutorial: (refIdx) => editCallbacks.onDeleteTutorial?.(refIdx, substepId),
        onAddTutorial: () => editCallbacks.onAddTutorial?.(substepId),
        onEditPartTools: () => editCallbacks.onEditPartTools?.(substepId),
        onUpdatePartTool: (ptId, updates) => editCallbacks.onUpdatePartTool?.(ptId, updates),
        onUpdateSubstepPartToolAmount: (sptId, amount) => editCallbacks.onUpdateSubstepPartToolAmount?.(sptId, amount),
        onAddSubstepPartTool: () => editCallbacks.onAddSubstepPartTool?.(substepId),
        onDeleteSubstepPartTool: (sptId) => editCallbacks.onDeleteSubstepPartTool?.(sptId),
        onDeleteSubstep: () => editCallbacks.onDeleteSubstep?.(substepId),
      };
    },
    [effectiveEditMode, editCallbacks],
  );

  // State for viewed substeps (eye icons)
  const [viewedSubstepIds, setViewedSubstepIds] = useState<Set<string>>(new Set());

  // Set initial substep from URL param (for "Continue" feature)
  // Note: We only close the parts drawer, but do NOT auto-play the video.
  // The user should see the substep cards and manually click to play.
  const hasSetInitialSubstep = useRef(false);
  useEffect(() => {
    if (initialSubstepId && !hasSetInitialSubstep.current && data?.substeps?.[initialSubstepId]) {
      hasSetInitialSubstep.current = true;
      // Don't set activeSubstepId - this would auto-play the video
      // Just mark as viewed and close the drawer
      setViewedSubstepIds((prev) => { const next = new Set(prev); next.add(initialSubstepId); return next; });
      // Close parts drawer to show the substep cards
      setIsPartsDrawerOpen(false);
      setHasStarted(true);
    }
  }, [initialSubstepId, data?.substeps]);

  // Preload videos for visible step + next step only (lazy approach)
  useEffect(() => {
    if (!data || stepsWithSubsteps.length === 0) return;

    const visibleIdx = visibleStepId ? sortedSteps.findIndex((s) => s.id === visibleStepId) : 0;
    const indicesToPreload = [visibleIdx, visibleIdx + 1].filter((i) => i >= 0 && i < stepsWithSubsteps.length);
    const subsToPreload = indicesToPreload.flatMap((i) => stepsWithSubsteps[i].substeps);

    const links: HTMLLinkElement[] = [];

    for (const substep of subsToPreload) {
      const firstSectionRowId = substep.videoSectionRowIds[0];
      if (!firstSectionRowId) continue;

      const sectionRow = data.substepVideoSections[firstSectionRowId];
      if (!sectionRow?.videoSectionId) continue;

      const videoSection = data.videoSections[sectionRow.videoSectionId];
      if (!videoSection) continue;

      const video = videoSection.videoId ? data.videos[videoSection.videoId] : undefined;
      if (!video) continue;

      let videoUrl: string;
      if (useRawVideo) {
        videoUrl = resolveSourceVideoUrl(video, videoSection.localPath || '');
      } else {
        const substepMediaPath = MediaPaths.substepVideo(substep.id);
        videoUrl = folderName ? buildMediaUrl(folderName, substepMediaPath) : `./${substepMediaPath}`;
      }

      if (!videoUrl) continue;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = videoUrl;
      document.head.appendChild(link);
      links.push(link);
    }

    return () => {
      links.forEach(link => link.remove());
    };
  }, [visibleStepId, stepsWithSubsteps, sortedSteps, data, useRawVideo, folderName, resolveSourceVideoUrl]);

  // Pre-compute drawing maps indexed by substep image / substep id
  // so we avoid O(n*m) filtering inside the render loop.
  const drawingMaps = useMemo(() => {
    if (!data?.drawings) return { image: new Map<string, DrawingRow[]>(), video: new Map<string, DrawingRow[]>() };
    const imageMap = new Map<string, DrawingRow[]>();
    const videoMap = new Map<string, DrawingRow[]>();
    for (const d of Object.values(data.drawings)) {
      if (isImageDrawing(d) && d.videoFrameAreaId) {
        const arr = imageMap.get(d.videoFrameAreaId);
        if (arr) arr.push(d); else imageMap.set(d.videoFrameAreaId, [d]);
      } else if (isVideoDrawing(d) && d.substepId) {
        const arr = videoMap.get(d.substepId);
        if (arr) arr.push(d); else videoMap.set(d.substepId, [d]);
      }
    }
    return { image: imageMap, video: videoMap };
  }, [data?.drawings]);

  // Pre-compute formatted reference data per substep (rich: kind + label + repeatCount).
  const tutorialDisplayMap = useMemo(() => {
    const map = new Map<string, RichTutorialDisplay[]>();
    if (!data) return map;
    for (const substep of allSubsteps) {
      const refs = substep.tutorialRowIds
        .map((id) => data.substepTutorials[id])
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
        .map((ref) => formatTutorialDisplayRich(ref, data.steps, data.substeps));
      if (refs.length > 0) map.set(substep.id, refs);
    }
    return map;
  }, [data, allSubsteps]);

  // Pre-compute tutorialDisplay props per substep (for reference-mode cards)
  const substepTutorialDisplayMap = useMemo(() => {
    const map = new Map<string, { kind: 'see' | 'tutorial'; tutorialLabel: string }>();
    if (!data) return map;
    for (const substep of allSubsteps) {
      if (substep.displayMode !== 'tutorial') continue;
      const refs = tutorialDisplayMap.get(substep.id);
      if (!refs || refs.length === 0) continue;
      const firstRef = refs[0];
      map.set(substep.id, { kind: firstRef.kind, tutorialLabel: firstRef.label });
    }
    return map;
  }, [data, allSubsteps, tutorialDisplayMap]);

  // Stable options for buildVideoEntry (avoids recreating object per substep)
  const videoEntryOptions = useMemo(() => ({
    useRawVideo,
    folderName,
    resolveSourceVideoUrl,
  }), [useRawVideo, folderName, resolveSourceVideoUrl]);

  // Compute per-substep video data for inline card playback (all steps)
  const substepVideoDataMap = useMemo(() => {
    const map = new Map<string, SubstepVideoEntry>();
    if (!data) return map;
    for (const substep of allSubsteps) {
      const entry = buildVideoEntry(substep, data, videoEntryOptions);
      if (entry) map.set(substep.id, entry);
    }
    return map;
  }, [data, allSubsteps, videoEntryOptions]);

  // Pre-compute per-substep edit callbacks (stable references for React.memo)
  const substepEditCallbacksMap = useMemo(() => {
    const map = new Map<string, SubstepEditCallbacks | undefined>();
    for (const substep of allSubsteps) {
      map.set(substep.id, makeSubstepEditCallbacks(substep.id));
    }
    return map;
  }, [allSubsteps, makeSubstepEditCallbacks]);

  // Unified reference toggle: clicking a reference badge toggles persistent highlight / inline cards
  const [activeTutorial, setActiveTutorial] = useState<ActiveTutorial | null>(null);

  // Grid layout: always use the responsive column count so card size stays
  // consistent regardless of how many substeps a step has.
  const effectiveColumns = gridColumns;
  const isSingleColumn = effectiveColumns === 1;

  // Handle inline play — only marks as viewed, does NOT open full overlay
  const handleInlinePlay = useCallback((substepId: string) => {
    setViewedSubstepIds((prev) => { const next = new Set(prev); next.add(substepId); return next; });
    setTutorialStep((s) => advanceOnSubstepClick(s));
  }, []);

  // Click-to-navigate: scroll to target substep and toggle highlight
  const substepRefsMap = useRef(new Map<string, HTMLDivElement>());

  // Auto-detect topmost visible substep (for mobile auto-highlight)
  const visibleSubstepId = useVisibleSubstep(substepRefsMap, gridContainerRef, allSubstepIds);

  const handleTutorialClick = useCallback((sourceSubstepId: string) => {
    if (!data) return;

    // Resolve ALL tutorials for this substep and merge targets
    const refs = tutorialDisplayMap.get(sourceSubstepId) ?? [];
    const substepIdSet = new Set<string>();

    for (const ref of refs) {
      // All steps are on the page, so treat all references as same-page
      const resolved = resolveTutorialTargets(ref.targetType, ref.targetId, null, data.steps, data.substeps as Record<string, SubstepRow>);
      for (const id of resolved.substepIds) substepIdSet.add(id);
    }

    const allTargetIds = [...substepIdSet];
    if (allTargetIds.length === 0) return;

    // All steps visible on page — always isSameStep=true for scroll behavior
    const mergedResult: TutorialTargetResult = { substepIds: allTargetIds, isSameStep: true };

    setActiveTutorial((current) => {
      const next = computeTutorialToggle(current, sourceSubstepId, mergedResult);

      // Scroll to first target on toggle-on
      if (next?.isSameStep) {
        requestAnimationFrame(() => {
          const firstEl = next.targetSubstepIds
            .map(id => substepRefsMap.current.get(id))
            .find(Boolean);
          firstEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }

      return next;
    });
  }, [data, tutorialDisplayMap]);

  // Build a lookup: substepId → stepNumber (for parts drawer highlighting)
  const substepStepNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const { step: s, substeps: subs } of stepsWithSubsteps) {
      for (const sub of subs) {
        map.set(sub.id, s.stepNumber);
      }
    }
    return map;
  }, [stepsWithSubsteps]);

  // Mobile auto-highlight: update highlighted substep based on scroll position
  useEffect(() => {
    if (!isPartsDrawerOpen || !isSingleColumn || !visibleSubstepId) return;
    const stepNumber = substepStepNumberMap.get(visibleSubstepId) ?? 0;
    setHighlightedSubstep({ substepId: visibleSubstepId, stepNumber });
  }, [isPartsDrawerOpen, isSingleColumn, visibleSubstepId, substepStepNumberMap]);

  // Pre-compute per-substep handler maps (stable references for React.memo)
  const substepHandlersMap = useMemo(() => {
    const map = new Map<string, { onClick: () => void; onTutorialClick: () => void; onPartToolClick: () => void }>();
    for (const substep of allSubsteps) {
      const id = substep.id;
      const stepNumber = substepStepNumberMap.get(id) ?? 0;
      map.set(id, {
        onClick: () => handleInlinePlay(id),
        onTutorialClick: () => handleTutorialClick(id),
        onPartToolClick: () => {
          setHighlightedSubstep({ substepId: id, stepNumber });
          setPartsDrawerInitialCount(undefined);
          setIsPartsDrawerOpen(true);
        },
      });
    }
    return map;
  }, [allSubsteps, substepStepNumberMap, handleInlinePlay, handleTutorialClick]);

  // Handle step selection from overview — scroll to the step section
  const handleOverviewStepSelect = useCallback((stepId: string) => {
    stepSectionRefs.current.get(stepId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowOverview(false);
    setIsPartsDrawerOpen(false);
    setHasStarted(true);
  }, []);

  // Handle closing parts drawer and starting
  const handlePartsDrawerClose = useCallback(() => {
    setIsPartsDrawerOpen(false);
    setHighlightedSubstep(null);
    setHighlightedPartToolId(null);
    if (!hasStarted) {
      setHasStarted(true);
    }
    setTutorialStep((s) => advanceOnDrawerClose(s));
  }, [hasStarted]);

  // Drawer refs for progressive swipe gestures
  const navbarRef = useRef<HTMLDivElement>(null);
  const feedbackPanelRef = useRef<HTMLDivElement>(null);
  const feedbackBackdropRef = useRef<HTMLDivElement>(null);
  const speedPanelRef = useRef<HTMLDivElement>(null);
  const speedBackdropRef = useRef<HTMLDivElement>(null);
  const overviewPanelRef = useRef<HTMLDivElement>(null);
  const overviewBackdropRef = useRef<HTMLDivElement>(null);
  const partsPanelRef = useRef<HTMLDivElement>(null);

  const drawerRefs: DrawerRefs = useMemo(() => ({
    feedbackPanelRef,
    feedbackBackdropRef,
    speedPanelRef,
    speedBackdropRef,
    overviewPanelRef,
    overviewBackdropRef,
    partsPanelRef,
  }), []);

  // Swipe gesture hook — attached as passive listeners below to avoid blocking mobile scroll
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGestures({
    isPartsDrawerOpen,
    isFeedbackOpen,
    isSpeedDrawerOpen,
    showOverview,
    setIsPartsDrawerOpen,
    setIsFeedbackOpen,
    setIsSpeedDrawerOpen,
    setShowOverview,
    navbarRef,
    drawerRefs,
  });

  // Attach swipe gesture listeners as passive so they don't block native scroll on mobile
  const rootRef = useRef<HTMLDivElement>(null);
  const onTouchStartRef = useRef(onTouchStart);
  const onTouchMoveRef = useRef(onTouchMove);
  const onTouchEndRef = useRef(onTouchEnd);
  onTouchStartRef.current = onTouchStart;
  onTouchMoveRef.current = onTouchMove;
  onTouchEndRef.current = onTouchEnd;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const start = (e: TouchEvent) => onTouchStartRef.current(e);
    const move = (e: TouchEvent) => onTouchMoveRef.current(e);
    const end = (e: TouchEvent) => onTouchEndRef.current(e);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
    };
  }, []);

  // Early return if no data available yet (loading state)
  if (!data) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="h-full flex flex-col relative min-h-0"
    >
      {/* Navigation & Controls Bar - Touch-optimized for factory workers */}
      <nav ref={navbarRef} className="flex flex-col bg-[var(--color-bg-surface)] shadow-sm">
        {/* Row 1: Progress Bar */}
        {totalSteps > 0 && (
          <div className="w-full px-4 pt-1 pb-1">
            <div className="w-full h-2 bg-[var(--color-border-base)] rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentIndex} aria-valuemin={0} aria-valuemax={totalSteps}>
              <div
                className="h-full bg-[var(--color-secondary)] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent(currentIndex, totalSteps)}%` }}
              />
            </div>
          </div>
        )}

        {/* Row 2: All buttons aligned on same row - smaller on tiny screens */}
        <div className={clsx('flex items-center justify-between px-0 gap-1 sm:gap-2', tutorialStep === 0 ? 'overflow-visible' : 'overflow-hidden')}>
          {/* Left: Step indicator with overview sidebar */}
          {totalSteps > 0 && (
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  const opening = !showOverview;
                  setShowOverview(opening);
                  if (opening) { setIsPartsDrawerOpen(false); }
                }}
                className={`flex items-center gap-0.5 sm:gap-1 min-w-0 justify-center px-2 sm:px-3 h-12 sm:h-14 rounded-lg transition-colors ${
                  showOverview
                    ? 'bg-[var(--color-secondary)] text-white'
                    : 'bg-[var(--color-bg-elevated)]/50 hover:bg-[var(--color-secondary)]/20'
                }`}
                aria-label={t('instructionView.overview', 'Step Overview')}
              >
                <LayoutGrid className={`h-7 w-7 sm:h-8 sm:w-8 mr-0.5 sm:mr-1 ${showOverview ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`} />
                {isPartsDrawerOpen && !hasStarted ? (
                  <span className="text-lg sm:text-xl font-medium text-current leading-none flex items-center">–</span>
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-current tabular-nums">{currentIndex + 1}</span>
                )}
                <span className={`text-lg sm:text-xl font-medium ${showOverview ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>/</span>
                <span className={`text-lg sm:text-xl font-medium tabular-nums ${showOverview ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>{totalSteps}</span>
              </button>
            </div>
          )}

          {/* Center: Parts/Tools drawer button */}
          <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1 justify-center">
            <div className="relative">
              <PartToolBadge
                partCount={1}
                toolCount={1}
                showAmount={false}
                rounded="lg"
                className={clsx(
                  'h-12 sm:h-14 w-16 sm:w-20',
                  tutorialStep === 0 && 'shadow-[inset_0_0_0_0.1875rem_var(--color-tutorial)]',
                )}
                onClick={() => {
                  const opening = !isPartsDrawerOpen;
                  if (opening) {
                    setPartsDrawerInitialCount(undefined);
                    setIsPartsDrawerOpen(true);
                    setTutorialStep((s) => advanceOnDrawerOpen(s));
                  } else {
                    handlePartsDrawerClose();
                  }
                }}
              />
              {tutorialStep === 0 && <TutorialClickIcon iconPosition="bottom-right" label={t('instructionView.tutorial.openParts')} labelPosition="bottom-right" labelWidth="10rem" />}
            </div>
          </div>

          {/* Right: Feedback + Close */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Playback speed toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-12 sm:h-14 w-16 sm:w-20 px-2 sm:px-3 py-0 rounded-lg !bg-[var(--color-bg-elevated)]/50 hover:!bg-[var(--color-bg-elevated)]"
              onClick={() => setIsSpeedDrawerOpen(prev => !prev)}
              aria-label={t('instructionView.playbackSpeed', 'Playback speed')}
            >
              <div className="relative flex flex-col items-center gap-0">
                <span className="text-xs sm:text-sm font-bold leading-none">{playbackSpeed}x</span>
                <Gauge className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            </Button>
            {/* Problem report button */}
            <FeedbackButton
              position="right"
              isOpen={isFeedbackOpen}
              onOpenChange={setIsFeedbackOpen}
              panelRef={feedbackPanelRef}
              backdropRef={feedbackBackdropRef}
              instructionName={data?.instructionName ?? undefined}
              stepNumber={currentIndex + 1}
              web3FormsKey={web3FormsKey}
            />
            {/* Break button - shows Home icon (desktop) or Close icon (mweb) */}
            {onBreak && (
              <Button
                variant="ghost"
                size="sm"
                className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg !bg-[var(--color-bg-elevated)]/50 hover:!bg-[var(--color-bg-elevated)]"
                onClick={onBreak}
                aria-label={breakVariant === 'home' ? t('common.home', 'Home') : t('common.close', 'Close')}
              >
                {breakVariant === 'home'
                  ? <Home className="h-7 w-7 sm:h-8 sm:w-8 translate-y-1" />
                  : <X className="h-7 w-7 sm:h-8 sm:w-8" />}
              </Button>
            )}
          </div>
        </div>

      </nav>

      {/* Parts panel — inline below navbar */}
      <div ref={partsPanelRef}>
        <PartsDrawer
          isOpen={isPartsDrawerOpen}
          currentStepNumber={currentIndex + 1}
          totalSteps={totalSteps}
          highlightedSubstepId={highlightedSubstep?.substepId}
          folderName={folderName}
          useBlurred={useBlurred}
          useRawVideo={useRawVideo}
          editMode={effectiveEditMode}
          renderPartToolEditor={effectiveEditMode ? renderPartToolEditor : undefined}
          initialStepCount={partsDrawerInitialCount}
          onPartToolHover={setHighlightedPartToolId}
        />
      </div>

      {/* Content area wrapper - relative for overlay positioning */}
      <div className="flex-1 relative overflow-hidden isolate">
          {/* All steps - scrollable single-page layout */}
          <div ref={gridContainerRef} className="h-full overflow-y-auto overscroll-y-contain scrollbar-subtle pt-3 px-1 sm:px-2">
            {stepsWithSubsteps.map(({ step: currentStep, substeps: stepSubsteps }, stepIdx) => {
              const prevAssemblyId = stepIdx > 0 ? stepsWithSubsteps[stepIdx - 1].step.assemblyId : null;
              const assemblyChanged = showAssemblySeparators && currentStep.assemblyId != null && currentStep.assemblyId !== prevAssemblyId;
              const assembly = assemblyChanged && data ? data.assemblies[currentStep.assemblyId!] : null;

              return (
              <div key={currentStep.id} ref={(el) => { if (el) stepSectionRefs.current.set(currentStep.id, el); }}>
                {assemblyChanged && assembly && (() => {
                const assemblyArea = assembly.videoFrameAreaId
                  ? data.videoFrameAreas[assembly.videoFrameAreaId]
                  : null;
                const assemblyImageUrl = assemblyArea
                  ? (useRawVideo && folderName
                      ? buildMediaUrl(folderName, resolveFramePath(assembly.videoFrameAreaId!, !!useBlurred, assemblyArea.useBlurred))
                      : assemblyArea.localPath ?? null)
                  : null;
                return (
                  <AssemblySeparator
                    title={assembly.title ?? assembly.id}
                    stepCount={assembly.stepIds.length}
                    partCount={assemblyPartToolCounts.get(assembly.id)?.parts ?? 0}
                    toolCount={assemblyPartToolCounts.get(assembly.id)?.tools ?? 0}
                    imageUrl={assemblyImageUrl}
                    onPartToolClick={() => {
                      // Scroll to first step of this assembly so PartsDrawer shows correct range
                      const firstStepId = assembly.stepIds[0];
                      if (firstStepId) {
                        const el = stepSectionRefs.current.get(firstStepId);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                      setPartsDrawerInitialCount('assembly');
                      setIsPartsDrawerOpen(true);
                      setHighlightedSubstep(null);
                    }}
                  />
                );
              })()}
                {stepIdx > 0 && !assemblyChanged && <StepSeparator stepNumber={currentStep.stepNumber} title={currentStep.title} />}

                {stepSubsteps.length === 0 ? (
                  <div className="py-8 flex items-center justify-center text-[var(--color-text-muted)]">
                    <p>{t('instructionView.noSubsteps', 'No substeps in this step')}</p>
                  </div>
                ) : (
                  <div
                    className="grid justify-center"
                    style={{
                      gridTemplateColumns: `repeat(${effectiveColumns}, minmax(${CARD_MIN_WIDTH_REM}rem, ${CARD_MAX_WIDTH_REM}rem))`,
                      gap: `${CARD_GAP_REM}rem`,
                    }}
                  >
                    {stepSubsteps.map((substep, index) => {
                      const showArrow = index > 0;

                      const firstImageRowId = substep.imageRowIds[0];
                      const imageRow = firstImageRowId
                        ? data.substepImages[firstImageRowId]
                        : null;
                      const area = imageRow
                        ? data.videoFrameAreas[imageRow.videoFrameAreaId]
                        : null;

                      const frameCaptureData = useRawVideo && folderName
                        ? resolveRawFrameCapture(area, data.videos, folderName)
                        : null;

                      const imageUrl = !useRawVideo && area?.localPath
                        ? area.localPath
                        : null;

                      const descriptions = substep.descriptionRowIds
                        .map((id) => data.substepDescriptions[id])
                        .filter(Boolean)
                        .sort((a, b) => a.order - b.order);

                      const notes = substep.noteRowIds
                        .map((id) => {
                          const row = data.substepNotes[id];
                          if (!row) return null;
                          const note = data.notes[row.noteId];
                          if (!note) return null;
                          return { ...row, note } as EnrichedSubstepNote;
                        })
                        .filter((n): n is EnrichedSubstepNote => n !== null)
                        .sort((a, b) => a.order - b.order);

                      const partTools = substep.partToolRowIds
                        .map((id) => {
                          const row = data.substepPartTools[id];
                          if (!row) return null;
                          const partTool = data.partTools[row.partToolId];
                          if (!partTool) return null;
                          return { ...row, partTool } as EnrichedSubstepPartTool;
                        })
                        .filter((p): p is EnrichedSubstepPartTool => p !== null);

                      const tutorials = tutorialDisplayMap.get(substep.id) ?? [];

                      const imageVfaId = imageRow?.videoFrameAreaId ?? null;
                      const imgDrawings = imageVfaId ? (drawingMaps.image.get(imageVfaId) ?? EMPTY_DRAWINGS) : EMPTY_DRAWINGS;
                      const vidDrawings = drawingMaps.video.get(substep.id) ?? EMPTY_DRAWINGS;

                      return (
                        <Fragment key={substep.id}>
                          <div className="relative">
                            <div
                              className={`rounded-xl transition-shadow duration-300 ${activeTutorial?.targetSubstepIds.includes(substep.id) ? 'ring-3 ring-[var(--color-element-tutorial)] shadow-lg' : ''}`}
                              ref={(el) => { if (el) substepRefsMap.current.set(substep.id, el); }}
                            >
                              <SubstepCard
                                title={substep.title}
                                stepOrder={index + 1}
                                totalSubsteps={stepSubsteps.length}
                                imageUrl={imageUrl}
                                frameCaptureData={frameCaptureData}
                                descriptions={descriptions}
                                notes={notes}
                                partTools={partTools}
                                imageDrawings={imgDrawings}
                                videoDrawings={vidDrawings}
                                tutorials={tutorials}
                                onTutorialClick={substepHandlersMap.get(substep.id)?.onTutorialClick}
                                onClick={substepHandlersMap.get(substep.id)?.onClick}
                                videoData={substepVideoDataMap.get(substep.id)}
                                isViewed={viewedSubstepIds.has(substep.id)}
                                tutorialHighlight={tutorialStep === 2 && stepIdx === 0 && index === 0}
                                repeatCount={substep.repeatCount}
                                repeatLabel={substep.repeatLabel}
                                onPartToolClick={substepHandlersMap.get(substep.id)?.onPartToolClick}
                                tutorialDisplay={substepTutorialDisplayMap.get(substep.id)}
                                folderName={folderName}
                                videoFrameAreas={data.videoFrameAreas}
                                noteIconLabels={noteIconLabels}
                                highlightedByPartTool={highlightedSubstepIdsFromPartTool.has(substep.id)}
                                editMode={effectiveEditMode}
                                editCallbacks={substepEditCallbacksMap.get(substep.id)}
                                substepId={substep.id}
                                renderEditPopover={renderEditPopover}
                              />
                            </div>

                            {/* Flow arrow: left side (multi-col) or top center (single-col) */}
                            {showArrow && (
                              isSingleColumn ? (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10" aria-hidden="true">
                                  <ArrowCircle direction="down" size="sm" />
                                </div>
                              ) : (
                                <div className="absolute top-1/2 -left-3 -translate-y-1/2 z-10" aria-hidden="true">
                                  <ArrowCircle direction="right" size="sm" />
                                </div>
                              )
                            )}
                          </div>

                        </Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Edit mode: Add substep button per step */}
                {effectiveEditMode && editCallbacks?.onAddSubstep && (
                  <div className="pt-4 px-2">
                    <button
                      type="button"
                      aria-label={t('editorCore.addSubstep', 'Add substep')}
                      className="w-full h-24 rounded-xl border-2 border-dashed border-[var(--color-border-base)] hover:border-[var(--color-secondary)] flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-secondary)] transition-colors cursor-pointer"
                      onClick={() => editCallbacks.onAddSubstep?.(currentStep.id)}
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-base font-medium">{t('editorCore.addSubstep', 'Add substep')}</span>
                    </button>
                  </div>
                )}
              </div>
              );
            })}

            {/* Completion banner after all steps */}
            {instructionId && (
              <div className="py-8 px-4 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-[var(--color-status-success)]">
                  <Check className="h-6 w-6" />
                  <span className="text-lg font-medium">
                    {t('instructionView.completed', 'Instruction complete')}
                  </span>
                </div>
                <StarRating instructionName={data?.instructionName ?? undefined} onComplete={onBreak} web3FormsKey={web3FormsKey} />
              </div>
            )}
          </div>

        {/* StepOverview - left sidebar drawer */}
        <Drawer
          isOpen={showOverview}
          onClose={() => setShowOverview(false)}
          anchor="left"
          panelRef={overviewPanelRef}
          backdropRef={overviewBackdropRef}
          className="w-[85vw] max-w-md h-full flex flex-col"
        >
          <StepOverview
            onStepSelect={handleOverviewStepSelect}
            activeStepId={visibleStepId}
            useRawVideo={useRawVideo}
            folderName={folderName}
            editMode={effectiveEditMode}
            editCallbacks={effectiveEditMode ? {
              onAddAssembly: editCallbacks?.onAddAssembly,
              onDeleteAssembly: editCallbacks?.onDeleteAssembly,
              onRenameAssembly: editCallbacks?.onRenameAssembly,
              onRenameStep: editCallbacks?.onRenameStep,
              onDeleteStep: editCallbacks?.onDeleteStep,
              onMoveStepToAssembly: editCallbacks?.onMoveStepToAssembly,
              onReorderAssembly: editCallbacks?.onReorderAssembly,
              renderAssemblyList: editCallbacks?.renderAssemblyList,
              renderPreviewUpload: editCallbacks?.renderPreviewUpload,
              renderAssemblyPreviewUpload: editCallbacks?.renderAssemblyPreviewUpload,
              renderStepDndWrapper: editCallbacks?.renderStepDndWrapper,
              renderSortableStepGrid: editCallbacks?.renderSortableStepGrid,
              renderSortableAssembly: editCallbacks?.renderSortableAssembly,
              renderSortableSubstepGrid: editCallbacks?.renderSortableSubstepGrid,
              onDeleteSubstep: editCallbacks?.onDeleteSubstep,
            } : undefined}
          />
        </Drawer>
      </div>

      <SpeedDrawer
        isOpen={isSpeedDrawerOpen}
        onClose={() => setIsSpeedDrawerOpen(false)}
        panelRef={speedPanelRef}
        backdropRef={speedBackdropRef}
      />

    </div>
  );
}
