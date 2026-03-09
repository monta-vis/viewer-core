import { useEffect, type MutableRefObject } from 'react';

/**
 * Listen for `mweb-reset` from parent — resets to landing card when modal closes.
 */
export function useMwebReset(
  isEmbedded: boolean,
  setStarted: (v: boolean) => void,
): void {
  useEffect(() => {
    if (!isEmbedded) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'mweb-reset' && e.source === window.parent) {
        setStarted(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isEmbedded, setStarted]);
}

/**
 * Post content height to parent for iframe auto-sizing.
 * Measures #root via getBoundingClientRect (not scrollHeight) to avoid
 * circular dependency where iframe viewport size == reported height.
 * Stops reporting once started (fullscreen: parent controls; inline: locked pixel height).
 */
export function useMwebResize(
  isEmbedded: boolean,
  startedRef: MutableRefObject<boolean>,
): void {
  useEffect(() => {
    if (!isEmbedded) return;

    let lastHeight = 0;
    const root = document.getElementById('root');
    const post = () => {
      if (startedRef.current) return;
      const h = root
        ? Math.ceil(root.getBoundingClientRect().height)
        : document.documentElement.scrollHeight;
      if (h !== lastHeight) {
        lastHeight = h;
        window.parent.postMessage({ type: 'mweb-resize', height: h }, '*');
      }
    };

    const ro = new ResizeObserver(post);
    ro.observe(root || document.body);
    post(); // initial

    return () => ro.disconnect();
  }, [isEmbedded, startedRef]);
}

/**
 * Scale all rem-based sizes for textsize param (only affects this iframe).
 * Uses reduced value on small screens to prevent oversized text / overlapping UI.
 * Listens for viewport changes so the font size adapts when crossing the 640px breakpoint.
 */
export function useTextSize(textSize: 'small' | 'large' | null): void {
  useEffect(() => {
    if (!textSize) return;

    if (textSize === 'small') {
      document.documentElement.style.fontSize = '87.5%';
      return () => { document.documentElement.style.fontSize = ''; };
    }

    // textSize === 'large': respond to viewport changes
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => {
      document.documentElement.style.fontSize = mq.matches ? '112.5%' : '125%';
    };
    apply();
    mq.addEventListener('change', apply);

    return () => {
      mq.removeEventListener('change', apply);
      document.documentElement.style.fontSize = '';
    };
  }, [textSize]);
}
