/**
 * Pure helpers for converting between absolute video frames and
 * substep percentage (0-100) across possibly multiple video sections.
 */

interface SectionRange {
  startFrame: number;
  endFrame: number;
}

/** Pre-sorted sections with cached total. Use with frameToSubstepPercent / substepPercentToFrame. */
export interface PreparedSections {
  sorted: SectionRange[];
  totalFrames: number;
}

/** Sort sections once and cache totalFrames. Wrap in useMemo to avoid re-sorting per frame. */
export function prepareSections(sections: SectionRange[]): PreparedSections {
  const sorted = [...sections].sort((a, b) => a.startFrame - b.startFrame);
  const totalFrames = sorted.reduce((sum, s) => sum + (s.endFrame - s.startFrame), 0);
  return { sorted, totalFrames };
}

/** Convert absolute frame to accumulated elapsed frames across sections.
 *  Returns 0 if absoluteFrame is before all sections, totalFrames if past all. */
export function frameToAccumulatedFrame(
  absoluteFrame: number,
  sections: SectionRange[] | PreparedSections,
): number {
  const { sorted, totalFrames } = isPrepared(sections) ? sections : prepareSections(sections);
  if (totalFrames === 0) return 0;
  if (absoluteFrame < sorted[0].startFrame) return 0;

  let elapsed = 0;
  for (const sec of sorted) {
    if (absoluteFrame >= sec.startFrame && absoluteFrame <= sec.endFrame) {
      return elapsed + (absoluteFrame - sec.startFrame);
    }
    elapsed += sec.endFrame - sec.startFrame;
  }
  return totalFrames;
}

/** Convert absolute frame to percentage (0-100) of substep total video duration */
export function frameToSubstepPercent(
  absoluteFrame: number,
  sections: SectionRange[] | PreparedSections,
): number {
  const prepared = isPrepared(sections) ? sections : prepareSections(sections);
  if (prepared.totalFrames === 0) return 0;
  return (frameToAccumulatedFrame(absoluteFrame, prepared) / prepared.totalFrames) * 100;
}

/** Convert substep percentage (0-100) to absolute frame */
export function substepPercentToFrame(
  percent: number,
  sections: SectionRange[] | PreparedSections,
): number {
  const { sorted, totalFrames } = isPrepared(sections) ? sections : prepareSections(sections);
  if (totalFrames === 0 || sorted.length === 0) return 0;

  const targetFrames = (percent / 100) * totalFrames;

  let elapsed = 0;
  for (const sec of sorted) {
    const secLength = sec.endFrame - sec.startFrame;
    if (elapsed + secLength > targetFrames) {
      return sec.startFrame + Math.round(targetFrames - elapsed);
    }
    elapsed += secLength;
  }
  return sorted[sorted.length - 1].endFrame;
}

function isPrepared(v: SectionRange[] | PreparedSections): v is PreparedSections {
  return !Array.isArray(v) && 'sorted' in v;
}
