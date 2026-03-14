import { useTranslation } from 'react-i18next';
import type { Step, Substep } from '@/features/instruction';
import { PrintSubstepBlock } from './PrintSubstepBlock';
import { PrintPageFooter } from './PrintPageFooter';
import type { PrintSubstepData } from '../utils/resolveSubstepPrintData';

interface PrintStepPageProps {
  step: Step;
  substeps: Record<string, Substep>;
  substepPrintData: Record<string, PrintSubstepData>;
  renderedImages: Record<string, string>;
  instructionName: string;
  pageNumber: number;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

/**
 * A single step page for the print document.
 * Page-break before, step number + title, then all substeps.
 */
export function PrintStepPage({
  step,
  substeps,
  substepPrintData,
  renderedImages,
  instructionName,
  pageNumber,
  onImageLoad,
  onImageError,
}: PrintStepPageProps) {
  const { t } = useTranslation();

  const stepSubsteps = step.substepIds
    .map((id) => substeps[id])
    .filter(Boolean)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const totalSubsteps = stepSubsteps.length;

  return (
    <div className="print-page-break-before print-page" data-testid="print-step-page">
      {/* Step header */}
      <div style={{ marginBottom: '0.625rem' }}>
        <div className="print-step-header">
          <span className="print-step-number">
            {t('printView.step', 'Step')} {step.stepNumber}
          </span>
          {step.title && <h2>{step.title}</h2>}
        </div>
        <hr className="print-substep-divider" />
      </div>

      {/* Substep blocks */}
      {stepSubsteps.map((substep, index) => {
        const printData = substepPrintData[substep.id];
        if (!printData) return null;

        return (
          <div key={substep.id}>
            {index > 0 && <hr className="print-substep-divider" />}
            <PrintSubstepBlock
              substepData={printData}
              renderedImageUrl={renderedImages[substep.id] ?? printData.imageUrl}
              orderLabel={`${index + 1}/${totalSubsteps}`}
              repeatCount={substep.repeatCount}
              onImageLoad={onImageLoad}
              onImageError={onImageError}
            />
          </div>
        );
      })}

      {/* Spacer pushes footer to page bottom */}
      <div className="print-page-spacer" />

      <PrintPageFooter instructionName={instructionName} pageNumber={pageNumber} />
    </div>
  );
}
