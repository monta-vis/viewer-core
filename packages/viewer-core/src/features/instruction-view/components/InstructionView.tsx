import type { ReactNode } from 'react';
import { Fragment, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, ChevronDown, Gauge, Package, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';

import { Button, TutorialClickIcon } from '@/components/ui';
import type { TextInputSuggestion } from '@/components/ui';
import { isImageDrawing, isVideoDrawing, formatTutorialDisplayRich, sortSubstepsByVideoFrame, buildSortData, UNASSIGNED_STEP_ID } from '@/features/instruction';
import { useViewerData } from '../context';
import { sortedValues, byStepNumber } from '@/lib/sortedValues';
import type { DrawingRow, EnrichedSubstepNote, EnrichedSubstepPartTool, PartToolRow, SubstepDescriptionRow, ViewportKeyframeRow, SubstepRow, RichTutorialDisplay, SafetyIconCategory } from '@/features/instruction';
import { FeedbackButton, StarRating } from '@/features/feedback';
import { useVideo } from '@/features/video-player';
import { buildMediaUrl, MediaPaths } from '@/lib/media';

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

/** Stable empty array to avoid new-reference re-renders in SubstepCard effects */
const EMPTY_DRAWINGS: DrawingRow[] = [];

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
    onEditVideo?: (substepId: string) => void;
    onDeleteVideo?: (substepId: string) => void;
    onSaveDescription?: (descriptionId: string, text: string, substepId: string) => void;
    onDeleteDescription?: (descriptionId: string, substepId: string) => void;
    onAddDescription?: (text: string, substepId: string) => void;
    onSaveNote?: (noteRowId: string, text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, substepId: string) => void;
    onDeleteNote?: (noteRowId: string, substepId: string) => void;
    onAddNote?: (text: string, safetyIconId: string, safetyIconCategory: SafetyIconCategory, substepId: string) => void;
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
    onAddSubstep?: (stepId: string) => void;
    onReplacePartTool?: (oldPartToolId: string, newPartToolId: string) => void;
    onCreatePartTool?: (oldPartToolId: string, newName: string) => void;
    onEditPartToolAmount?: (partToolId: string, newAmount: string) => void;
    onEditPartToolImage?: (partToolId: string) => void;
    onDeletePartTool?: (partToolId: string) => void;
  };
  /** Catalog of available parts/tools for search + swap in PartToolDetailModal */
  partToolCatalog?: TextInputSuggestion[];
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
  }) => ReactNode;
}

/**
 * InstructionView - Card-based view of substeps for a selected step
 *
 * Shows substeps as cards with inline video playback, images, descriptions, and notes.
 */
export function InstructionView({ selectedStepId, onStepChange, instructionId, onBreak, activityLogger, initialSubstepId, useRawVideo = false, folderName, useBlurred, initialPartsDrawerOpen = false, tutorial = false, editModeActive = false, editCallbacks, partToolCatalog, renderEditPopover }: InstructionViewProps) {
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

  // Log step_entered when step changes
  useEffect(() => {
    if (!selectedStepId || !activityLogger) return;

    // Log exit from previous step
    if (previousStepId.current && previousStepId.current !== selectedStepId) {
      const duration = Date.now() - stepEnteredAt.current;
      activityLogger.logStepExited(previousStepId.current, {
        exit_reason: 'navigation',
        duration_ms: duration,
      });
    }

    // Log entry to new step
    activityLogger.logStepEntered(selectedStepId);
    stepEnteredAt.current = Date.now();
    previousStepId.current = selectedStepId;
  }, [selectedStepId, activityLogger]);

  // Scroll grid container to top when step changes
  useEffect(() => {
    gridContainerRef.current?.scrollTo(0, 0);
  }, [selectedStepId]);

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
          substepIds: unassigned.map((s) => s.id),
        });
      }
    }

    return steps;
  }, [data?.steps, data?.substeps, useRawVideo]);

  // Get step (virtual Step 0 lives in sortedSteps, not data.steps)
  // Falls back to first step when selectedStepId doesn't resolve (e.g. UNASSIGNED with no unassigned substeps)
  const step = useMemo(() => {
    if (!data) return null;
    if (!selectedStepId) return sortedSteps[0] ?? null;
    if (selectedStepId === UNASSIGNED_STEP_ID) {
      return sortedSteps.find((s) => s.id === UNASSIGNED_STEP_ID) ?? sortedSteps[0] ?? null;
    }
    return data.steps[selectedStepId] ?? sortedSteps[0] ?? null;
  }, [selectedStepId, data, sortedSteps]);

  // Find current step index and prev/next (uses step.id so fallback is reflected)
  const { prevStep, nextStep, currentIndex, totalSteps } = useMemo(() => {
    const effectiveId = step?.id ?? selectedStepId;
    const idx = sortedSteps.findIndex((s) => s.id === effectiveId);
    return {
      prevStep: idx > 0 ? sortedSteps[idx - 1] : null,
      nextStep: idx < sortedSteps.length - 1 ? sortedSteps[idx + 1] : null,
      currentIndex: idx,
      totalSteps: sortedSteps.length,
    };
  }, [sortedSteps, step, selectedStepId]);

  // State for showing step overview
  const [showOverview, setShowOverview] = useState(false);

  // State for parts drawer - starts open for initial view (closed in editor preview)
  // Tutorial mode overrides to closed so step 0 ("click Package button") works.
  const [isPartsDrawerOpen, setIsPartsDrawerOpen] = useState(tutorial ? false : initialPartsDrawerOpen);

  // State for feedback widget (controlled by swipe gesture)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // State for speed drawer (controlled by bottom-edge swipe gesture)
  const [isSpeedDrawerOpen, setIsSpeedDrawerOpen] = useState(false);

  // Track which substep opened the parts drawer (for amount highlighting)
  const [highlightedSubstep, setHighlightedSubstep] = useState<{
    substepId: string;
    stepNumber: number;
  } | null>(null);

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
        onEditVideo: () => editCallbacks.onEditVideo?.(substepId),
        onDeleteVideo: () => editCallbacks.onDeleteVideo?.(substepId),
        onSaveDescription: (descId, text) => editCallbacks.onSaveDescription?.(descId, text, substepId),
        onDeleteDescription: (descId) => editCallbacks.onDeleteDescription?.(descId, substepId),
        onAddDescription: (text) => editCallbacks.onAddDescription?.(text, substepId),
        onSaveNote: (noteRowId, text, iconId, iconCat) => editCallbacks.onSaveNote?.(noteRowId, text, iconId, iconCat, substepId),
        onDeleteNote: (noteRowId) => editCallbacks.onDeleteNote?.(noteRowId, substepId),
        onAddNote: (text, iconId, iconCat) => editCallbacks.onAddNote?.(text, iconId, iconCat, substepId),
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

  // Scroll-down hint: shows bouncing arrow when substeps overflow
  const [showScrollHint, setShowScrollHint] = useState(false);
  const lastCardRef = useRef<HTMLDivElement | null>(null);

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

  const substeps = useMemo(() => {
    if (!step || !data?.substeps) return [];

    // For virtual Step 0, collect unassigned substeps directly
    if (step.id === UNASSIGNED_STEP_ID) {
      return getUnassignedSubsteps(data);
    }

    const raw = step.substepIds
      .map((id) => data.substeps[id])
      .filter(Boolean);
    return sortSubstepsByVideoFrame(raw, buildSortData(data));
  }, [step, data]);

  // Preload all substep videos for instant playback
  useEffect(() => {
    if (!data || substeps.length === 0) return;

    const links: HTMLLinkElement[] = [];

    for (const substep of substeps) {
      const firstSectionRowId = substep.videoSectionRowIds[0];
      if (!firstSectionRowId) continue;

      const sectionRow = data.substepVideoSections[firstSectionRowId];
      if (!sectionRow?.videoSectionId) continue;

      const videoSection = data.videoSections[sectionRow.videoSectionId];
      if (!videoSection) continue;

      const video = data.videos[videoSection.videoId];
      if (!video) continue;

      let videoUrl: string;
      if (useRawVideo) {
        // Editor raw mode — preload source video
        videoUrl = resolveSourceVideoUrl(video, videoSection.localPath || '');
      } else {
        const substepMediaPath = useBlurred
          ? MediaPaths.substepVideoBlurred(substep.id)
          : MediaPaths.substepVideo(substep.id);
        if (folderName) {
          videoUrl = buildMediaUrl(folderName, substepMediaPath);
        } else {
          videoUrl = `./${substepMediaPath}`;
        }
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
  }, [substeps, data?.substepVideoSections, data?.videoSections, data?.videos, useRawVideo, folderName, resolveSourceVideoUrl]);

  // Pre-compute drawing maps indexed by substep image / substep id
  // so we avoid O(n*m) filtering inside the render loop.
  const drawingMaps = useMemo(() => {
    if (!data?.drawings) return { image: new Map<string, DrawingRow[]>(), video: new Map<string, DrawingRow[]>() };
    const imageMap = new Map<string, DrawingRow[]>();
    const videoMap = new Map<string, DrawingRow[]>();
    for (const d of Object.values(data.drawings)) {
      if (isImageDrawing(d) && d.substepImageId) {
        const arr = imageMap.get(d.substepImageId);
        if (arr) arr.push(d); else imageMap.set(d.substepImageId, [d]);
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
    for (const substep of substeps) {
      const refs = substep.tutorialRowIds
        .map((id) => data.substepTutorials[id])
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
        .map((ref) => formatTutorialDisplayRich(ref, data.steps, data.substeps));
      if (refs.length > 0) map.set(substep.id, refs);
    }
    return map;
  }, [data, substeps]);

  // Pre-compute tutorialDisplay props per substep (for reference-mode cards)
  const substepTutorialDisplayMap = useMemo(() => {
    const map = new Map<string, { kind: 'see' | 'tutorial'; tutorialLabel: string }>();
    if (!data) return map;
    for (const substep of substeps) {
      if (substep.displayMode !== 'tutorial') continue;
      const refs = tutorialDisplayMap.get(substep.id);
      if (!refs || refs.length === 0) continue;
      const firstRef = refs[0];
      map.set(substep.id, { kind: firstRef.kind, tutorialLabel: firstRef.label });
    }
    return map;
  }, [data, substeps, tutorialDisplayMap]);

  // Compute per-substep video data for inline card playback
  const substepVideoDataMap = useMemo(() => {
    const map = new Map<string, { videoSrc: string; startFrame: number; endFrame: number; fps: number; viewportKeyframes: ViewportKeyframeRow[]; videoAspectRatio: number; sections?: { startFrame: number; endFrame: number }[] }>();
    if (!data) return map;

    for (const substep of substeps) {
      const firstSectionRowId = substep.videoSectionRowIds[0];
      if (!firstSectionRowId) continue;

      const sectionRow = data.substepVideoSections[firstSectionRowId];
      if (!sectionRow?.videoSectionId) continue;

      const videoSection = data.videoSections[sectionRow.videoSectionId];
      if (!videoSection) continue;

      const video = data.videos[videoSection.videoId];
      if (!video) continue;

      if (useRawVideo) {
        // Editor raw mode — use source video, iterate ALL sections
        const videoSrc = resolveSourceVideoUrl(video, videoSection.localPath || '');
        if (!videoSrc) continue;

        const viewportKeyframes = video.viewportKeyframeIds
          .map(id => data.viewportKeyframes[id])
          .filter(Boolean);
        const videoAspectRatio = (video.width && video.height) ? video.width / video.height : 16 / 9;

        // Collect all sections for this substep (sorted by order / start frame)
        const allSections: { startFrame: number; endFrame: number }[] = [];
        for (const rowId of substep.videoSectionRowIds) {
          const row = data.substepVideoSections[rowId];
          if (!row?.videoSectionId) continue;
          const sec = data.videoSections[row.videoSectionId];
          if (!sec) continue;
          allSections.push({ startFrame: sec.startFrame, endFrame: sec.endFrame });
        }
        allSections.sort((a, b) => a.startFrame - b.startFrame);

        map.set(substep.id, {
          videoSrc,
          startFrame: allSections[0]?.startFrame ?? videoSection.startFrame,
          endFrame: allSections[allSections.length - 1]?.endFrame ?? videoSection.endFrame,
          fps: video.fps,
          viewportKeyframes,
          videoAspectRatio,
          sections: allSections.length > 1 ? allSections : undefined,
        });
      } else {
        // Processed mode — use merged substep video (all sections concatenated)
        // Sum up total frame count across ALL sections of this substep
        let totalFrames = 0;
        for (const rowId of substep.videoSectionRowIds) {
          const row = data.substepVideoSections[rowId];
          if (!row?.videoSectionId) continue;
          const sec = data.videoSections[row.videoSectionId];
          if (!sec) continue;
          totalFrames += sec.endFrame - sec.startFrame;
        }

        // Resolve merged substep video URL (blurred variant when applicable)
        const substepMediaPath = useBlurred
          ? MediaPaths.substepVideoBlurred(substep.id)
          : MediaPaths.substepVideo(substep.id);

        let videoSrc: string;
        if (folderName) {
          videoSrc = buildMediaUrl(folderName, substepMediaPath);
        } else {
          // mweb / published mode — relative URL from data directory
          videoSrc = `./${substepMediaPath}`;
        }

        map.set(substep.id, {
          videoSrc,
          startFrame: 0,
          endFrame: totalFrames,
          fps: video.fps,
          viewportKeyframes: [], // viewport already baked into processed clips
          videoAspectRatio: 1, // processed clips are square
        });
      }
    }

    return map;
  }, [data, substeps, useRawVideo, useBlurred, folderName, resolveSourceVideoUrl]);

  // Pre-compute per-substep edit callbacks (stable references for React.memo)
  const substepEditCallbacksMap = useMemo(() => {
    const map = new Map<string, SubstepEditCallbacks | undefined>();
    for (const substep of substeps) {
      map.set(substep.id, makeSubstepEditCallbacks(substep.id));
    }
    return map;
  }, [substeps, makeSubstepEditCallbacks]);

  // Unified reference toggle: clicking a reference badge toggles persistent highlight / inline cards
  const [activeTutorial, setActiveTutorial] = useState<ActiveTutorial | null>(null);

  // Clear active reference when step changes
  useEffect(() => {
    setActiveTutorial(null);
  }, [selectedStepId]);

  // Observe last substep card to show/hide scroll hint
  useEffect(() => {
    const el = lastCardRef.current;
    const root = gridContainerRef.current;
    if (!el || !root || substeps.length <= 1) {
      setShowScrollHint(false);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setShowScrollHint(!entry.isIntersecting),
      { root, threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [step?.id, substeps.length]);

  // Pre-compute video data for cross-step reference targets
  const activeRefVideoData = useMemo(() => {
    const map = new Map<string, { videoSrc: string; startFrame: number; endFrame: number; fps: number; viewportKeyframes: ViewportKeyframeRow[]; videoAspectRatio: number; sections?: { startFrame: number; endFrame: number }[] }>();
    if (!activeTutorial || activeTutorial.isSameStep || !data) return map;

    for (const targetId of activeTutorial.targetSubstepIds) {
      const targetSubstep = data.substeps[targetId];
      if (!targetSubstep) continue;

      const firstSectionRowId = targetSubstep.videoSectionRowIds[0];
      if (!firstSectionRowId) continue;

      const sectionRow = data.substepVideoSections[firstSectionRowId];
      if (!sectionRow?.videoSectionId) continue;

      const videoSection = data.videoSections[sectionRow.videoSectionId];
      if (!videoSection) continue;

      const video = data.videos[videoSection.videoId];
      if (!video) continue;

      if (useRawVideo) {
        const videoSrc = resolveSourceVideoUrl(video, videoSection.localPath || '');
        if (!videoSrc) continue;
        const viewportKeyframes = video.viewportKeyframeIds
          .map(id => data.viewportKeyframes[id])
          .filter(Boolean);
        const videoAspectRatio = (video.width && video.height) ? video.width / video.height : 16 / 9;
        const allSections: { startFrame: number; endFrame: number }[] = [];
        for (const rowId of targetSubstep.videoSectionRowIds) {
          const row = data.substepVideoSections[rowId];
          if (!row?.videoSectionId) continue;
          const sec = data.videoSections[row.videoSectionId];
          if (!sec) continue;
          allSections.push({ startFrame: sec.startFrame, endFrame: sec.endFrame });
        }
        allSections.sort((a, b) => a.startFrame - b.startFrame);
        map.set(targetId, {
          videoSrc,
          startFrame: allSections[0]?.startFrame ?? videoSection.startFrame,
          endFrame: allSections[allSections.length - 1]?.endFrame ?? videoSection.endFrame,
          fps: video.fps,
          viewportKeyframes,
          videoAspectRatio,
          sections: allSections.length > 1 ? allSections : undefined,
        });
      } else {
        let totalFrames = 0;
        for (const rowId of targetSubstep.videoSectionRowIds) {
          const row = data.substepVideoSections[rowId];
          if (!row?.videoSectionId) continue;
          const sec = data.videoSections[row.videoSectionId];
          if (!sec) continue;
          totalFrames += sec.endFrame - sec.startFrame;
        }
        const substepMediaPath = useBlurred
          ? MediaPaths.substepVideoBlurred(targetId)
          : MediaPaths.substepVideo(targetId);
        const videoSrc = folderName
          ? buildMediaUrl(folderName, substepMediaPath)
          : `./${substepMediaPath}`;
        map.set(targetId, {
          videoSrc,
          startFrame: 0,
          endFrame: totalFrames,
          fps: video.fps,
          viewportKeyframes: [],
          videoAspectRatio: 1,
        });
      }
    }
    return map;
  }, [activeTutorial, data, useRawVideo, useBlurred, folderName, resolveSourceVideoUrl]);

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

  const handleTutorialClick = useCallback((sourceSubstepId: string) => {
    if (!data) return;

    // Resolve ALL tutorials for this substep and merge targets
    const refs = tutorialDisplayMap.get(sourceSubstepId) ?? [];
    const substepIdSet = new Set<string>();
    let allSameStep = true;

    for (const ref of refs) {
      const resolved = resolveTutorialTargets(ref.targetType, ref.targetId, step?.id ?? null, data.steps, data.substeps as Record<string, SubstepRow>);
      for (const id of resolved.substepIds) substepIdSet.add(id);
      if (!resolved.isSameStep) allSameStep = false;
    }

    const allSubstepIds = [...substepIdSet];
    if (allSubstepIds.length === 0) return;

    const mergedResult: TutorialTargetResult = { substepIds: allSubstepIds, isSameStep: allSameStep };

    setActiveTutorial((current) => {
      const next = computeTutorialToggle(current, sourceSubstepId, mergedResult);

      // Scroll to first same-step target on toggle-on only
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
  }, [data, step?.id, tutorialDisplayMap]);

  // Pre-compute per-substep handler maps (stable references for React.memo)
  const substepHandlersMap = useMemo(() => {
    const map = new Map<string, { onClick: () => void; onTutorialClick: () => void; onPartToolClick: () => void }>();
    const stepNumber = step?.stepNumber ?? 0;
    for (const substep of substeps) {
      const id = substep.id;
      map.set(id, {
        onClick: () => handleInlinePlay(id),
        onTutorialClick: () => handleTutorialClick(id),
        onPartToolClick: () => {
          setHighlightedSubstep({ substepId: id, stepNumber });
          setIsPartsDrawerOpen(true);
        },
      });
    }
    return map;
  }, [substeps, step?.stepNumber, handleInlinePlay, handleTutorialClick]);

  // Handle step selection from overview
  const handleOverviewStepSelect = useCallback((stepId: string) => {
    onStepChange?.(stepId);
    setShowOverview(false);
    setIsPartsDrawerOpen(false);
    setHasStarted(true);
  }, [onStepChange]);

  // Handle closing parts drawer and starting
  const handlePartsDrawerClose = useCallback(() => {
    setIsPartsDrawerOpen(false);
    setHighlightedSubstep(null);
    if (!hasStarted) {
      setHasStarted(true);
    }
    setTutorialStep((s) => advanceOnDrawerClose(s));
  }, [hasStarted]);

  // Drawer refs for progressive swipe gestures
  const navbarRef = useRef<HTMLDivElement>(null);
  const partsPanelRef = useRef<HTMLDivElement>(null);
  const partsBackdropRef = useRef<HTMLDivElement>(null);
  const feedbackPanelRef = useRef<HTMLDivElement>(null);
  const feedbackBackdropRef = useRef<HTMLDivElement>(null);
  const speedPanelRef = useRef<HTMLDivElement>(null);
  const speedBackdropRef = useRef<HTMLDivElement>(null);
  const overviewPanelRef = useRef<HTMLDivElement>(null);

  const drawerRefs: DrawerRefs = useMemo(() => ({
    partsPanelRef,
    partsBackdropRef,
    feedbackPanelRef,
    feedbackBackdropRef,
    speedPanelRef,
    speedBackdropRef,
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
    overviewPanelRef,
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

  // Early return if no step data available yet (loading state)
  if (!step || !data) {
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
        {onStepChange && totalSteps > 0 && (
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
          {/* Left: Parts/Tools drawer button - milk-glass orange style (matches SubstepCard badge) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              className={clsx(
                'relative group flex items-center justify-center rounded-lg transition-all duration-200',
                'h-12 w-12 sm:h-14 sm:w-14 m-0 bg-[var(--color-element-tool)]/10 hover:bg-[var(--color-element-tool)]/20',
                'border border-[var(--color-element-tool)]/30 hover:border-[var(--color-element-tool)]/50',
                'text-[var(--color-element-tool)]',
                tutorialStep === 0 && 'shadow-[inset_0_0_0_3px_var(--color-tutorial)]',
              )}
              onClick={() => {
                const opening = !isPartsDrawerOpen;
                setIsPartsDrawerOpen(opening);
                if (opening) setTutorialStep((s) => advanceOnDrawerOpen(s));
              }}
              aria-label={t('instructionView.partsToolsOverview', 'Parts & Tools')}
            >
              <Package className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200 group-hover:scale-110" />
              {tutorialStep === 0 && <TutorialClickIcon iconPosition="bottom-right" label={t('instructionView.tutorial.openParts')} labelPosition="bottom-right" labelWidth="10rem" />}
            </button>
          </div>

          {/* Center: Step Navigation with integrated Overview */}
          {onStepChange && totalSteps > 0 && (
            <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1 justify-center">
              {/* Previous button - icon only on small, with text on larger screens */}
              <Button
                variant="secondary"
                size="sm"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg lg:w-auto lg:px-4"
                onClick={() => prevStep && onStepChange(prevStep.id)}
                disabled={!prevStep}
                aria-label={t('instructionView.previous', 'Previous')}
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden lg:inline ml-1 text-base font-medium">{t('instructionView.previousStep', 'Previous')}</span>
              </Button>

              {/* Step indicator with dropdown - clickable to open overview */}
              <button
                type="button"
                onClick={() => {
                  const opening = !showOverview;
                  setShowOverview(opening);
                  if (opening) setIsPartsDrawerOpen(false);
                }}
                className={`flex items-center gap-0.5 sm:gap-1 min-w-0 justify-center px-2 sm:px-3 h-12 sm:h-14 rounded-lg transition-colors ${
                  showOverview
                    ? 'bg-[var(--color-secondary)] text-white'
                    : 'hover:bg-[var(--color-secondary)]/20'
                }`}
                aria-label={t('instructionView.overview', 'Step Overview')}
              >
                {isPartsDrawerOpen && !hasStarted ? (
                  <span className="text-lg sm:text-xl font-medium text-current leading-none flex items-center">–</span>
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-current tabular-nums">{currentIndex + 1}</span>
                )}
                <span className={`text-lg sm:text-xl font-medium ${showOverview ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>/</span>
                <span className={`text-lg sm:text-xl font-medium tabular-nums ${showOverview ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>{totalSteps}</span>
                <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 ml-0.5 sm:ml-1 transition-transform ${showOverview ? 'rotate-180 text-white/70' : 'text-[var(--color-text-muted)]'}`} />
              </button>

              {/* Next button - hidden on last step */}
              {nextStep && (
                <Button
                  variant="primary"
                  size="sm"
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg sm:w-auto sm:px-4"
                  onClick={() => onStepChange?.(nextStep.id)}
                  aria-label={t('instructionView.next', 'Next')}
                >
                  <span className="hidden sm:inline mr-1 text-base font-medium">{t('instructionView.nextStep', 'Next')}</span>
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              )}
            </div>
          )}

          {/* Right: Feedback + Close */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Playback speed toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-12 sm:h-14 px-2 sm:px-3 py-0 rounded-lg hover:bg-[var(--color-bg-elevated)]"
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
            />
            {/* Close button - always visible when onBreak exists */}
            {onBreak && (
              <Button
                variant="ghost"
                size="sm"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg hover:bg-[var(--color-bg-elevated)]"
                onClick={onBreak}
                aria-label={t('instructionView.close', 'Close')}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            )}
          </div>
        </div>

      </nav>

      {/* Content area wrapper - relative for overlay positioning */}
      <div className="flex-1 relative overflow-hidden isolate">
          {/* Substep Cards - responsive grid */}
          <div ref={gridContainerRef} className="h-full overflow-y-auto overscroll-y-contain scrollbar-subtle pt-3 px-1 sm:px-2" style={isSingleColumn ? { scrollSnapType: 'y proximity' } : undefined}>
              {substeps.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
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
                  {substeps.map((substep, index) => {
                  // Simple: every card except the first gets an arrow
                  const showArrow = index > 0;

                  const firstImageRowId = substep.imageRowIds[0];
                  const imageRow = firstImageRowId
                    ? data.substepImages[firstImageRowId]
                    : null;
                  const area = imageRow
                    ? data.videoFrameAreas[imageRow.videoFrameAreaId]
                    : null;

                  // Compute frame capture data for raw video mode
                  const frameCaptureData = useRawVideo && folderName
                    ? resolveRawFrameCapture(area, data.videos, folderName)
                    : null;

                  // Get image URL - use localPath (required in local mode)
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

                  // Get parts and tools for this substep (for inline badges)
                  const partTools = substep.partToolRowIds
                    .map((id) => {
                      const row = data.substepPartTools[id];
                      if (!row) return null;
                      const partTool = data.partTools[row.partToolId];
                      if (!partTool) return null;
                      return { ...row, partTool } as EnrichedSubstepPartTool;
                    })
                    .filter((p): p is EnrichedSubstepPartTool => p !== null);

                  // Get pre-computed tutorials for this substep
                  const tutorials = tutorialDisplayMap.get(substep.id) ?? [];

                  // Look up pre-computed drawings for this substep
                  const substepImageId = imageRow?.id ?? null;
                  const imgDrawings = substepImageId ? (drawingMaps.image.get(substepImageId) ?? EMPTY_DRAWINGS) : EMPTY_DRAWINGS;
                  const vidDrawings = drawingMaps.video.get(substep.id) ?? EMPTY_DRAWINGS;

                  return (
                    <Fragment key={substep.id}>
                    <div className="relative" ref={index === substeps.length - 1 ? lastCardRef : undefined} style={isSingleColumn ? { scrollSnapAlign: 'start' } : undefined}>
                        <div
                          className={`rounded-xl transition-shadow duration-300 ${activeTutorial?.targetSubstepIds.includes(substep.id) ? 'ring-3 ring-[var(--color-element-tutorial)] shadow-lg' : ''}`}
                          ref={(el) => { if (el) substepRefsMap.current.set(substep.id, el); }}
                        >
                          <SubstepCard
                            title={substep.title}
                            stepOrder={index + 1}
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
                            tutorialHighlight={tutorialStep === 2 && index === 0}
                            repeatCount={substep.repeatCount}
                            repeatLabel={substep.repeatLabel}
                            onPartToolClick={substepHandlersMap.get(substep.id)?.onPartToolClick}
                            tutorialDisplay={substepTutorialDisplayMap.get(substep.id)}
                            folderName={folderName}
                            videoFrameAreas={data.videoFrameAreas}
                            editMode={effectiveEditMode}
                            editCallbacks={substepEditCallbacksMap.get(substep.id)}
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

                    {/* Cross-step reference: inline target cards after source card */}
                    {activeTutorial?.sourceSubstepId === substep.id && !activeTutorial.isSameStep &&
                      activeTutorial.targetSubstepIds.map((targetId, targetIdx) => {
                        const targetSubstep = data.substeps[targetId];
                        if (!targetSubstep) return null;

                        const targetFirstImageRowId = targetSubstep.imageRowIds[0];
                        const targetImageRow = targetFirstImageRowId ? data.substepImages[targetFirstImageRowId] : null;
                        const targetArea = targetImageRow ? data.videoFrameAreas[targetImageRow.videoFrameAreaId] : null;

                        const targetFrameCapture = useRawVideo && folderName
                          ? resolveRawFrameCapture(targetArea, data.videos, folderName)
                          : null;
                        const targetImageUrl = !useRawVideo && targetArea?.localPath ? targetArea.localPath : null;

                        const targetDescriptions = targetSubstep.descriptionRowIds
                          .map((id) => data.substepDescriptions[id])
                          .filter(Boolean)
                          .sort((a, b) => a.order - b.order);

                        const targetNotes = targetSubstep.noteRowIds
                          .map((id) => {
                            const row = data.substepNotes[id];
                            if (!row) return null;
                            const note = data.notes[row.noteId];
                            if (!note) return null;
                            return { ...row, note } as EnrichedSubstepNote;
                          })
                          .filter((n): n is EnrichedSubstepNote => n !== null)
                          .sort((a, b) => a.order - b.order);

                        const targetImageId = targetImageRow?.id ?? null;
                        const targetImgDrawings = targetImageId ? (drawingMaps.image.get(targetImageId) ?? EMPTY_DRAWINGS) : EMPTY_DRAWINGS;
                        const targetVidDrawings = drawingMaps.video.get(targetId) ?? EMPTY_DRAWINGS;

                        return (
                          <div key={targetId} className="ring-3 ring-[var(--color-element-tutorial)] shadow-lg rounded-xl">
                            <SubstepCard
                              title={targetSubstep.title}
                              stepOrder={targetIdx + 1}
                              imageUrl={targetImageUrl}
                              frameCaptureData={targetFrameCapture}
                              descriptions={targetDescriptions}
                              notes={targetNotes}
                              folderName={folderName}
                              videoFrameAreas={data.videoFrameAreas}
                              imageDrawings={targetImgDrawings}
                              videoDrawings={targetVidDrawings}
                              videoData={activeRefVideoData.get(targetId)}
                            />
                          </div>
                        );
                      })
                    }
                    </Fragment>
                  );
                  })}
                </div>
              )}

            {/* Edit mode: Add substep button */}
            {effectiveEditMode && editCallbacks?.onAddSubstep && step && (
              <div className="pt-4 px-2">
                <button
                  type="button"
                  aria-label={t('editorCore.addSubstep', 'Add substep')}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-[var(--color-border-base)] hover:border-[var(--color-secondary)] flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-secondary)] transition-colors cursor-pointer"
                  onClick={() => editCallbacks.onAddSubstep?.(step.id)}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-base font-medium">{t('editorCore.addSubstep', 'Add substep')}</span>
                </button>
              </div>
            )}

            {/* Next Step button at bottom of scrollable area (single-column / mobile only) */}
            {nextStep && onStepChange && gridColumns === 1 && (
              <div className="pt-4 px-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-medium"
                  onClick={() => onStepChange(nextStep.id)}
                  aria-label={t('instructionView.nextStepFull', 'Next Step')}
                >
                  {t('instructionView.nextStepFull', 'Next Step')}
                  <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            )}

            {/* Completion banner - last step only */}
            {!nextStep && instructionId && (
              <div className="py-8 px-4 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-[var(--color-status-success)]">
                  <Check className="h-6 w-6" />
                  <span className="text-lg font-medium">
                    {t('instructionView.completed', 'Instruction complete')}
                  </span>
                </div>
                <StarRating instructionName={data?.instructionName ?? undefined} onComplete={onBreak} />
              </div>
            )}
          </div>

        {/* Scroll-down hint: fade gradient + chevron when substeps overflow */}
        {showScrollHint && isSingleColumn && (
          <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none" aria-hidden="true">
            <div className="h-16 bg-gradient-to-t from-[var(--color-bg-base)] to-transparent" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 animate-bounce-subtle">
              <div className="bg-[var(--color-secondary)] backdrop-blur-sm rounded-full p-2 shadow-lg border border-[var(--color-bg-surface)]/20">
                <ChevronDown className="h-6 w-6 text-[var(--color-bg-surface)]" />
              </div>
            </div>
          </div>
        )}

        {/* StepOverview - backdrop + slide-down overlay */}
        <div
          className={clsx(
            'absolute inset-0 z-25 bg-black/40 transition-opacity duration-300 will-change-[opacity]',
            showOverview ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setShowOverview(false)}
        />
        <div ref={overviewPanelRef} className={`absolute top-0 left-0 right-0 h-[90%] z-30 bg-[var(--color-bg-surface)] transition-transform duration-300 ease-out rounded-b-2xl shadow-2xl ${showOverview ? 'translate-y-0' : '-translate-y-full'}`}>
          <StepOverview
            onStepSelect={handleOverviewStepSelect}
            useRawVideo={useRawVideo}
            folderName={folderName}
          />
        </div>
      </div>

      {/* Parts Drawer - fullpage before starting, narrow after */}
      <PartsDrawer
        isOpen={isPartsDrawerOpen}
        onClose={handlePartsDrawerClose}
        currentStepNumber={currentIndex + 1}
        totalSteps={totalSteps}
        highlightedSubstepId={highlightedSubstep?.substepId}
        variant={hasStarted ? 'narrow' : 'fullpage'}
        panelRef={partsPanelRef}
        backdropRef={partsBackdropRef}
        folderName={folderName}
        useBlurred={useBlurred}
        tutorialHighlight={tutorialStep === 1}
        useRawVideo={useRawVideo}
        editMode={effectiveEditMode}
        editCallbacks={effectiveEditMode && editCallbacks ? {
          onReplacePartTool: editCallbacks.onReplacePartTool,
          onCreatePartTool: editCallbacks.onCreatePartTool,
          onEditPartToolAmount: editCallbacks.onEditPartToolAmount,
          onEditPartToolImage: editCallbacks.onEditPartToolImage,
          onDeletePartTool: editCallbacks.onDeletePartTool,
        } : undefined}
        partToolCatalog={effectiveEditMode ? partToolCatalog : undefined}
      />

      <SpeedDrawer
        isOpen={isSpeedDrawerOpen}
        onClose={() => setIsSpeedDrawerOpen(false)}
        panelRef={speedPanelRef}
        backdropRef={speedBackdropRef}
      />

    </div>
  );
}
