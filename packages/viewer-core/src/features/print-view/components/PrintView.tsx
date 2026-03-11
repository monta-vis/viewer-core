import { useState, useEffect, useCallback } from 'react';
import { useViewerData } from '@/features/instruction-view';
import type { InstructionData } from '@/features/instruction';
import { sortedValues, byStepNumber } from '@/lib/sortedValues';
import { useImageLoadTracker } from '../hooks/useImageLoadTracker';
import { resolveSubstepPrintData, type PrintSubstepData } from '../utils/resolveSubstepPrintData';
import { renderImageWithDrawings } from '../utils/renderImageWithDrawings';
import { PrintCoverPage } from './PrintCoverPage';
import { PrintPartsToolsPage } from './PrintPartsToolsPage';
import { PrintStepPage } from './PrintStepPage';
import '../styles/print-view.css';

interface PrintViewProps {
  folderName: string;
}

/** Default render size for image compositing (square canvas) */
const RENDER_WIDTH = 1200;

/**
 * Root print view component — renders instruction data as a multi-page
 * IKEA-style print document. Pre-renders all images with baked-in drawings
 * before signaling readiness via `data-pdf-ready`.
 */
export function PrintView({ folderName }: PrintViewProps) {
  const data = useViewerData();
  const [renderedImages, setRenderedImages] = useState<Record<string, string>>({});
  const [substepPrintData, setSubstepPrintData] = useState<Record<string, PrintSubstepData>>({});
  const [renderingComplete, setRenderingComplete] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Count total images we expect to load in the DOM
  const totalImageCount = data ? countExpectedImages(data) : 0;

  const { onImageLoad, onImageError } = useImageLoadTracker({
    expectedCount: totalImageCount,
    onComplete: useCallback(() => setIsReady(true), []),
  });

  // Pre-compute substep data and render images with drawings.
  // Both substepPrintData and renderedImages are set together AFTER renderAll
  // completes, preventing a race where plain image URLs trigger the load tracker
  // before drawings are baked in.
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setRenderingComplete(false);

    const allSubstepData: Record<string, PrintSubstepData> = {};

    // Collect all substep print data
    for (const substepId of Object.keys(data.substeps)) {
      allSubstepData[substepId] = resolveSubstepPrintData(data, substepId, folderName);
    }

    const withDrawings = Object.entries(allSubstepData).filter(
      ([, d]) => d.imageDrawings.length > 0,
    );
    console.debug(
      `[PrintView] Substep data collected: ${Object.keys(allSubstepData).length} total, ` +
      `${withDrawings.length} with drawings`,
      withDrawings.map(([id, d]) => ({ id, drawingCount: d.imageDrawings.length, imageUrl: d.imageUrl })),
    );

    // Render images with drawings (async, concurrency-limited to avoid OOM)
    const renderAll = async () => {
      const rendered: Record<string, string> = {};
      const entries = Object.entries(allSubstepData).filter(
        ([, printData]) => printData.imageUrl && printData.imageDrawings.length > 0,
      );
      console.debug(`[PrintView] renderAll: ${entries.length} images to composite`);

      const CONCURRENCY = 4;
      let index = 0;

      const runNext = async (): Promise<void> => {
        while (index < entries.length) {
          const current = index++;
          const [substepId, printData] = entries[current];
          const url = await renderImageWithDrawings({
            imageUrl: printData.imageUrl!,
            drawings: printData.imageDrawings,
            width: RENDER_WIDTH,
          });
          const isDataUrl = url.startsWith('data:');
          console.debug(
            `[PrintView] Rendered ${substepId}: ${isDataUrl ? 'data URL (success)' : 'plain URL (FALLBACK)'}`,
          );
          if (!isDataUrl) {
            console.warn(`[PrintView] renderImageWithDrawings returned plain URL for ${substepId} — drawings NOT baked in`);
          }
          rendered[substepId] = url;
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => runNext()));
      if (!cancelled) {
        // Batch all state updates so DOM only sees final rendered URLs
        setSubstepPrintData(allSubstepData);
        setRenderedImages(rendered);
        setRenderingComplete(true);
        console.debug(`[PrintView] renderAll complete: ${Object.keys(rendered).length} rendered, renderingComplete=true`);
      }
    };

    renderAll().catch((err) => {
      if (!cancelled) {
        console.error('[PrintView] Failed to pre-render images:', err);
        // Still set data so substeps without drawings can render
        setSubstepPrintData(allSubstepData);
        setRenderingComplete(true);
      }
    });

    return () => { cancelled = true; };
  }, [data, folderName]);

  if (!data) return null;

  // Gate rendering until all images with drawings have been pre-rendered.
  // This prevents the load tracker from firing on plain image URLs before
  // the composited (drawings baked-in) URLs are ready.
  if (!renderingComplete) {
    return <div data-testid="print-view-loading" />;
  }

  const steps = sortedValues(data.steps, byStepNumber);

  const hasPartsToolsPage = Object.values(data.partTools).some(
    (pt) => pt.type === 'Part' || pt.type === 'Tool',
  );
  // Cover = page 1, parts/tools = page 2 (if present), steps start after
  const stepPageOffset = hasPartsToolsPage ? 3 : 2;

  return (
    <div className="print-view" data-pdf-ready={isReady || undefined} data-testid="print-view">
      {/* Page 1: Cover */}
      <PrintCoverPage
        instructionName={data.instructionName}
        instructionDescription={data.instructionDescription}
        coverImageAreaId={data.coverImageAreaId}
        articleNumber={data.articleNumber}
        estimatedDuration={data.estimatedDuration}
        folderName={folderName}
        onImageLoad={onImageLoad}
        onImageError={onImageError}
      />

      {/* Page 2: Parts & Tools (conditional) */}
      <PrintPartsToolsPage
        data={data}
        folderName={folderName}
        instructionName={data.instructionName}
        pageNumber={2}
        onImageLoad={onImageLoad}
        onImageError={onImageError}
      />

      {/* Step pages */}
      {steps.map((step, index) => (
        <PrintStepPage
          key={step.id}
          step={step}
          substeps={data.substeps}
          substepPrintData={substepPrintData}
          renderedImages={renderedImages}
          folderName={folderName}
          instructionName={data.instructionName}
          pageNumber={stepPageOffset + index}
          onImageLoad={onImageLoad}
          onImageError={onImageError}
        />
      ))}
    </div>
  );
}

/** Count the total number of images expected to load in the DOM. */
function countExpectedImages(data: InstructionData): number {
  let count = 0;

  // Cover image
  if (data.coverImageAreaId) count += 1;

  // Part/tool preview images
  for (const pt of Object.values(data.partTools)) {
    if (pt.previewImageId) count += 1;
  }

  // Substep images (one per substep with an image)
  for (const substep of Object.values(data.substeps)) {
    if (substep.imageRowIds.length > 0) count += 1;
  }

  return count;
}
