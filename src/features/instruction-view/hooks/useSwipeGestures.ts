import { useCallback, useRef } from 'react';

// ─── Constants ─────────────────────────────────────────────

export const EDGE_ZONE_PX = 44;
export const BOTTOM_ZONE_PX = 60; // Keep small to avoid accidental triggers while scrolling
export const DIRECTION_LOCK_PX = 10;
export const SWIPE_THRESHOLD_PX = 50;
export const SNAP_RATIO = 0.35;
export const VELOCITY_THRESHOLD = 0.5; // px/ms

// ─── Types ─────────────────────────────────────────────────

export type GestureIntent =
  | 'pending-left-edge'
  | 'pending-right-edge'
  | 'pending-bottom-edge'
  | 'pending-close-left'
  | 'pending-close-right'
  | 'pending-close-bottom'
  | 'dragging-open-left'
  | 'dragging-open-right'
  | 'dragging-open-bottom'
  | 'dragging-close-left'
  | 'dragging-close-right'
  | 'dragging-close-bottom'
  | 'cancelled';

interface OpenDrawers {
  partsDrawer: boolean;
  feedbackWidget: boolean;
  speedDrawer: boolean;
}

interface PanelRefs {
  partsPanel: HTMLElement | null;
  feedbackPanel: HTMLElement | null;
  speedPanel: HTMLElement | null;
}

interface GestureState {
  intent: GestureIntent | null;
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  fromNavbar: boolean;
}

// Refs for DOM manipulation during drag
export interface DrawerRefs {
  partsPanelRef: React.RefObject<HTMLDivElement | null>;
  partsBackdropRef: React.RefObject<HTMLDivElement | null>;
  feedbackPanelRef: React.RefObject<HTMLDivElement | null>;
  feedbackBackdropRef: React.RefObject<HTMLDivElement | null>;
  speedPanelRef: React.RefObject<HTMLDivElement | null>;
  speedBackdropRef: React.RefObject<HTMLDivElement | null>;
}

interface SwipeGesturesConfig {
  /** Current drawer open states */
  isPartsDrawerOpen: boolean;
  isFeedbackOpen: boolean;
  isSpeedDrawerOpen: boolean;
  showOverview: boolean;

  /** Callbacks to toggle drawers */
  setIsPartsDrawerOpen: (open: boolean) => void;
  setIsFeedbackOpen: (open: boolean) => void;
  setIsSpeedDrawerOpen: (open: boolean) => void;
  setShowOverview: (show: boolean) => void;

  /** Navbar ref for swipe-down detection */
  navbarRef: React.RefObject<HTMLDivElement | null>;

  /** Drawer DOM refs for progressive drag */
  drawerRefs: DrawerRefs;

  /** StepOverview panel ref — swipe-to-close only activates near its bottom edge */
  overviewPanelRef: React.RefObject<HTMLDivElement | null>;
}

// ─── Pure Helper Functions (exported for testing) ──────────

/**
 * Classify where a touch started and what the initial intent should be.
 * Returns null if the touch should be handled as normal (center touch or inside open drawer).
 */
export function classifyTouchStart(
  x: number,
  y: number,
  screenW: number,
  screenH: number,
  openDrawers: OpenDrawers,
  panelRefs: PanelRefs,
  /** Whether StepOverview is currently shown — blocks all edge gestures */
  showOverview: boolean,
  /** Pass e.target for contains() checks */
  target?: EventTarget | null,
): GestureIntent | null {
  // If a drawer is open: outside panel → immediate close-drag, inside panel → pending (directional lock decides)
  if (openDrawers.partsDrawer) {
    if (!panelRefs.partsPanel?.contains(target as Node)) {
      return 'dragging-close-left';
    }
    return 'pending-close-left';
  }
  if (openDrawers.feedbackWidget) {
    if (!panelRefs.feedbackPanel?.contains(target as Node)) {
      return 'dragging-close-right';
    }
    return 'pending-close-right';
  }
  if (openDrawers.speedDrawer) {
    if (!panelRefs.speedPanel?.contains(target as Node)) {
      return 'dragging-close-bottom';
    }
    return 'pending-close-bottom';
  }

  // StepOverview open: block edge gestures (touchEnd fallback handles closing)
  if (showOverview) return null;

  // No drawer open: check edge zones
  if (x <= EDGE_ZONE_PX) return 'pending-left-edge';
  if (x >= screenW - EDGE_ZONE_PX) return 'pending-right-edge';
  if (y >= screenH - BOTTOM_ZONE_PX) return 'pending-bottom-edge';

  // Center touch — navigation or other (handled by touchEnd fallback)
  return null;
}

/**
 * Given a pending edge intent and cumulative delta, decide whether to commit
 * to drawer drag, cancel (fall through to navigation), or stay pending.
 */
export function resolveDirectionLock(
  intent: GestureIntent,
  deltaX: number,
  deltaY: number,
): 'commit' | 'cancel' | 'pending' {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const maxDelta = Math.max(absX, absY);

  if (maxDelta < DIRECTION_LOCK_PX) return 'pending';

  switch (intent) {
    case 'pending-left-edge':
      // Must move RIGHT to open left drawer
      if (absX >= absY && deltaX > 0) return 'commit';
      return 'cancel';

    case 'pending-right-edge':
      // Must move LEFT to open right drawer
      if (absX >= absY && deltaX < 0) return 'commit';
      return 'cancel';

    case 'pending-bottom-edge':
      // Must move UP to open bottom drawer
      if (absY >= absX && deltaY < 0) return 'commit';
      return 'cancel';

    case 'pending-close-left':
      // Must move LEFT to close left drawer
      if (absX >= absY && deltaX < 0) return 'commit';
      return 'cancel';

    case 'pending-close-right':
      // Must move RIGHT to close right drawer
      if (absX >= absY && deltaX > 0) return 'commit';
      return 'cancel';

    case 'pending-close-bottom':
      // Must move DOWN to close bottom drawer
      if (absY >= absX && deltaY > 0) return 'commit';
      return 'cancel';

    default:
      return 'cancel';
  }
}

/**
 * Determine whether to snap a drawer open (or keep it open) on release.
 * Uses both distance ratio and velocity.
 */
export function shouldSnap(offset: number, panelSize: number, velocity: number): boolean {
  if (panelSize <= 0) return false;
  if (offset / panelSize >= SNAP_RATIO) return true;
  if (velocity >= VELOCITY_THRESHOLD && offset > 0) return true;
  return false;
}

/** Clamp an offset value between 0 and max. */
export function clampOffset(offset: number, max: number): number {
  if (offset < 0) return 0;
  if (offset > max) return max;
  return offset;
}

// ─── Hook ──────────────────────────────────────────────────

export function useSwipeGestures(config: SwipeGesturesConfig) {
  const gestureRef = useRef<GestureState | null>(null);

  const {
    isPartsDrawerOpen, isFeedbackOpen, isSpeedDrawerOpen, showOverview,
    setIsPartsDrawerOpen, setIsFeedbackOpen, setIsSpeedDrawerOpen, setShowOverview,
    navbarRef, drawerRefs, overviewPanelRef,
  } = config;

  // ── Helpers for DOM manipulation during drag ──

  const applyOpenDrag = useCallback((
    intent: 'dragging-open-left' | 'dragging-open-right' | 'dragging-open-bottom',
    offset: number,
  ) => {
    let panel: HTMLDivElement | null = null;
    let backdrop: HTMLDivElement | null = null;
    let panelSize = 0;

    if (intent === 'dragging-open-left') {
      panel = drawerRefs.partsPanelRef.current;
      backdrop = drawerRefs.partsBackdropRef.current;
      panelSize = panel?.getBoundingClientRect().width ?? 320;
    } else if (intent === 'dragging-open-right') {
      panel = drawerRefs.feedbackPanelRef.current;
      backdrop = drawerRefs.feedbackBackdropRef.current;
      panelSize = panel?.getBoundingClientRect().width ?? 320;
    } else {
      panel = drawerRefs.speedPanelRef.current;
      backdrop = drawerRefs.speedBackdropRef.current;
      panelSize = panel?.getBoundingClientRect().height ?? 200;
    }

    const clamped = clampOffset(offset, panelSize);

    if (panel) {
      panel.style.transition = 'none';
      if (intent === 'dragging-open-left') {
        panel.style.transform = `translateX(${clamped - panelSize}px)`;
      } else if (intent === 'dragging-open-right') {
        panel.style.transform = `translateX(${panelSize - clamped}px)`;
      } else {
        panel.style.transform = `translateY(${panelSize - clamped}px)`;
      }
    }
    if (backdrop) {
      backdrop.style.transition = 'none';
      backdrop.style.opacity = String((clamped / panelSize) * 0.4);
      backdrop.style.pointerEvents = clamped > 0 ? 'auto' : 'none';
    }
  }, [drawerRefs]);

  const applyCloseDrag = useCallback((
    intent: 'dragging-close-left' | 'dragging-close-right' | 'dragging-close-bottom',
    offset: number,
  ) => {
    let panel: HTMLDivElement | null = null;
    let backdrop: HTMLDivElement | null = null;
    let panelSize = 0;

    if (intent === 'dragging-close-left') {
      panel = drawerRefs.partsPanelRef.current;
      backdrop = drawerRefs.partsBackdropRef.current;
      panelSize = panel?.getBoundingClientRect().width ?? 320;
    } else if (intent === 'dragging-close-right') {
      panel = drawerRefs.feedbackPanelRef.current;
      backdrop = drawerRefs.feedbackBackdropRef.current;
      panelSize = panel?.getBoundingClientRect().width ?? 320;
    } else {
      panel = drawerRefs.speedPanelRef.current;
      backdrop = drawerRefs.speedBackdropRef.current;
      panelSize = panel?.getBoundingClientRect().height ?? 200;
    }

    // offset is how far user has dragged in the closing direction (positive)
    const remaining = clampOffset(panelSize - offset, panelSize);

    if (panel) {
      panel.style.transition = 'none';
      if (intent === 'dragging-close-left') {
        // PartsDrawer: translate left as user drags left
        panel.style.transform = `translateX(${-(panelSize - remaining)}px)`;
      } else if (intent === 'dragging-close-right') {
        // FeedbackWidget: translate right as user drags right
        panel.style.transform = `translateX(${panelSize - remaining}px)`;
      } else {
        // SpeedDrawer: translate down as user drags down
        panel.style.transform = `translateY(${panelSize - remaining}px)`;
      }
    }
    if (backdrop) {
      backdrop.style.transition = 'none';
      backdrop.style.opacity = String((remaining / panelSize) * 0.4);
    }
  }, [drawerRefs]);

  const clearInlineStyles = useCallback((
    intent: GestureIntent,
  ) => {
    const refs: Array<React.RefObject<HTMLDivElement | null>> = [];

    if (intent.includes('left')) {
      refs.push(drawerRefs.partsPanelRef, drawerRefs.partsBackdropRef);
    } else if (intent.includes('right')) {
      refs.push(drawerRefs.feedbackPanelRef, drawerRefs.feedbackBackdropRef);
    } else if (intent.includes('bottom')) {
      refs.push(drawerRefs.speedPanelRef, drawerRefs.speedBackdropRef);
    }

    for (const ref of refs) {
      if (ref.current) {
        ref.current.style.transition = '';
        ref.current.style.transform = '';
        ref.current.style.opacity = '';
        ref.current.style.pointerEvents = '';
      }
    }
  }, [drawerRefs]);

  // ── Touch Handlers ──

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 1) return; // Ignore multi-touch

    const touch = e.touches[0];
    const fromNavbar = navbarRef.current?.contains(e.target as Node) ?? false;

    const openDrawers: OpenDrawers = {
      partsDrawer: isPartsDrawerOpen,
      feedbackWidget: isFeedbackOpen,
      speedDrawer: isSpeedDrawerOpen,
    };
    const panelRefs: PanelRefs = {
      partsPanel: drawerRefs.partsPanelRef.current,
      feedbackPanel: drawerRefs.feedbackPanelRef.current,
      speedPanel: drawerRefs.speedPanelRef.current,
    };

    const intent = classifyTouchStart(
      touch.clientX,
      touch.clientY,
      window.innerWidth,
      window.innerHeight,
      openDrawers,
      panelRefs,
      showOverview,
      e.target,
    );

    gestureRef.current = {
      intent,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      lastX: touch.clientX,
      lastY: touch.clientY,
      lastTime: Date.now(),
      fromNavbar,
    };
  }, [isPartsDrawerOpen, isFeedbackOpen, isSpeedDrawerOpen, showOverview, navbarRef, drawerRefs]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || e.touches.length > 1) {
      // Multi-touch: cancel
      if (gesture) gesture.intent = 'cancelled';
      return;
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;

    // Update velocity tracking
    gesture.lastX = touch.clientX;
    gesture.lastY = touch.clientY;
    gesture.lastTime = Date.now();

    const intent = gesture.intent;

    // ── Resolve pending intents ──
    if (intent === 'pending-left-edge' || intent === 'pending-right-edge' || intent === 'pending-bottom-edge') {
      const lock = resolveDirectionLock(intent, deltaX, deltaY);
      if (lock === 'commit') {
        if (intent === 'pending-left-edge') gesture.intent = 'dragging-open-left';
        else if (intent === 'pending-right-edge') gesture.intent = 'dragging-open-right';
        else gesture.intent = 'dragging-open-bottom';
      } else if (lock === 'cancel') {
        gesture.intent = 'cancelled';
      }
      return;
    }

    if (intent === 'pending-close-left' || intent === 'pending-close-right' || intent === 'pending-close-bottom') {
      const lock = resolveDirectionLock(intent, deltaX, deltaY);
      if (lock === 'commit') {
        if (intent === 'pending-close-left') gesture.intent = 'dragging-close-left';
        else if (intent === 'pending-close-right') gesture.intent = 'dragging-close-right';
        else gesture.intent = 'dragging-close-bottom';
      } else if (lock === 'cancel') {
        gesture.intent = 'cancelled';
      }
      return;
    }

    // ── Active drag: update DOM directly ──
    if (intent === 'dragging-open-left') {
      applyOpenDrag('dragging-open-left', Math.max(0, deltaX));
    } else if (intent === 'dragging-open-right') {
      applyOpenDrag('dragging-open-right', Math.max(0, -deltaX));
    } else if (intent === 'dragging-open-bottom') {
      applyOpenDrag('dragging-open-bottom', Math.max(0, -deltaY));
    } else if (intent === 'dragging-close-left') {
      applyCloseDrag('dragging-close-left', Math.max(0, -deltaX));
    } else if (intent === 'dragging-close-right') {
      applyCloseDrag('dragging-close-right', Math.max(0, deltaX));
    } else if (intent === 'dragging-close-bottom') {
      applyCloseDrag('dragging-close-bottom', Math.max(0, deltaY));
    }
  }, [applyOpenDrag, applyCloseDrag]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const elapsed = Math.max(1, Date.now() - gesture.startTime);
    const intent = gesture.intent;

    // ── Handle dragging intents (open/close) ──

    if (intent?.startsWith('dragging-open-') || intent?.startsWith('dragging-close-')) {
      // Calculate offset and velocity for snap decision
      let offset = 0;
      let panelSize = 0;
      let velocity = 0;

      if (intent === 'dragging-open-left') {
        offset = Math.max(0, deltaX);
        panelSize = drawerRefs.partsPanelRef.current?.getBoundingClientRect().width ?? 320;
        velocity = Math.abs(deltaX) / elapsed;
      } else if (intent === 'dragging-open-right') {
        offset = Math.max(0, -deltaX);
        panelSize = drawerRefs.feedbackPanelRef.current?.getBoundingClientRect().width ?? 320;
        velocity = Math.abs(deltaX) / elapsed;
      } else if (intent === 'dragging-open-bottom') {
        offset = Math.max(0, -deltaY);
        panelSize = drawerRefs.speedPanelRef.current?.getBoundingClientRect().height ?? 200;
        velocity = Math.abs(deltaY) / elapsed;
      } else if (intent === 'dragging-close-left') {
        offset = Math.max(0, -deltaX);
        panelSize = drawerRefs.partsPanelRef.current?.getBoundingClientRect().width ?? 320;
        velocity = Math.abs(deltaX) / elapsed;
      } else if (intent === 'dragging-close-right') {
        offset = Math.max(0, deltaX);
        panelSize = drawerRefs.feedbackPanelRef.current?.getBoundingClientRect().width ?? 320;
        velocity = Math.abs(deltaX) / elapsed;
      } else if (intent === 'dragging-close-bottom') {
        offset = Math.max(0, deltaY);
        panelSize = drawerRefs.speedPanelRef.current?.getBoundingClientRect().height ?? 200;
        velocity = Math.abs(deltaY) / elapsed;
      }

      const snap = shouldSnap(offset, panelSize, velocity);

      // Clear inline styles before React state update triggers CSS transition
      clearInlineStyles(intent);

      // Apply final state
      if (intent === 'dragging-open-left') {
        setIsPartsDrawerOpen(snap);
      } else if (intent === 'dragging-open-right') {
        setIsFeedbackOpen(snap);
      } else if (intent === 'dragging-open-bottom') {
        setIsSpeedDrawerOpen(snap);
      } else if (intent === 'dragging-close-left') {
        setIsPartsDrawerOpen(!snap);
      } else if (intent === 'dragging-close-right') {
        setIsFeedbackOpen(!snap);
      } else if (intent === 'dragging-close-bottom') {
        setIsSpeedDrawerOpen(!snap);
      }

      return;
    }

    // ── Pending intents that never committed → fallthrough to navigation ──
    // Also handles: cancelled, null (center touch)

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < SWIPE_THRESHOLD_PX && absY < SWIPE_THRESHOLD_PX) return;

    // StepOverview open + swipe up → close, but only near the bottom edge of the panel
    if (showOverview && absY > absX && deltaY < -SWIPE_THRESHOLD_PX) {
      const panel = overviewPanelRef.current;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        // Only close if the touch started within EDGE_ZONE_PX of the panel's bottom edge (or below it)
        if (gesture.startY < rect.bottom - EDGE_ZONE_PX) return;
      }
      setShowOverview(false);
      return;
    }

    // Don't navigate when overlays are open
    if (isPartsDrawerOpen || isFeedbackOpen || isSpeedDrawerOpen || showOverview) return;

    if (gesture.fromNavbar && deltaY > SWIPE_THRESHOLD_PX) {
      // Swipe down from navbar → toggle overview
      const opening = !showOverview;
      setShowOverview(opening);
      if (opening) setIsPartsDrawerOpen(false);
    }
  }, [
    isPartsDrawerOpen, isFeedbackOpen, isSpeedDrawerOpen, showOverview,
    setIsPartsDrawerOpen, setIsFeedbackOpen, setIsSpeedDrawerOpen, setShowOverview,
    drawerRefs, clearInlineStyles,
  ]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
