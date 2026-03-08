import { useTranslation } from 'react-i18next';
import { PrintNoteBlock } from './PrintNoteBlock';
import { PrintPartToolBadge } from './PrintPartToolBadge';
import type { PrintSubstepData } from '../utils/resolveSubstepPrintData';

interface PrintSubstepBlockProps {
  substepData: PrintSubstepData;
  /** Pre-rendered image data URL (with baked drawings) or plain image URL */
  renderedImageUrl: string | null;
  /** e.g. "1/5" */
  orderLabel: string;
  repeatCount: number;
  folderName: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

/**
 * Single substep block for print view.
 * Shows image (left) + content (right) in a 2-column layout.
 */
export function PrintSubstepBlock({
  substepData,
  renderedImageUrl,
  orderLabel,
  repeatCount,
  folderName,
  onImageLoad,
  onImageError,
}: PrintSubstepBlockProps) {
  const { t } = useTranslation();
  const hasImage = !!renderedImageUrl;
  const hasContent = substepData.descriptions.length > 0 ||
    substepData.notes.length > 0 ||
    substepData.partTools.length > 0;

  return (
    <div className={`print-avoid-break ${hasImage && hasContent ? 'print-substep-block' : 'print-substep-block print-substep-block--stacked'}`}>
      {/* Image column */}
      <div>
        {renderedImageUrl ? (
          <div className="print-image-container print-substep-image">
            <img
              src={renderedImageUrl}
              alt={`${t('instructionView.substep', 'Substep')} ${orderLabel}`}
              onLoad={onImageLoad}
              onError={onImageError}
              loading="eager"
            />
          </div>
        ) : (
          <div className="print-no-image" ref={() => onImageLoad?.()}>
            {t('printView.noImage', 'No image')}
          </div>
        )}
      </div>

      {/* Content column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {/* Order badge + repeat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span className="print-substep-order">{orderLabel}</span>
          {repeatCount > 1 && (
            <span className="print-repeat-badge">&times;{repeatCount}</span>
          )}
        </div>

        {/* Descriptions */}
        {substepData.descriptions.length > 0 && (
          <ul className="print-description-list">
            {substepData.descriptions.map((desc, i) => (
              <li key={i}>{desc}</li>
            ))}
          </ul>
        )}

        {/* Notes */}
        {substepData.notes.map((note, i) => (
          <PrintNoteBlock key={i} note={note} folderName={folderName} />
        ))}

        {/* Part/tool callouts */}
        {substepData.partTools.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.125rem' }}>
            {substepData.partTools.map((pt, i) => (
              <PrintPartToolBadge key={i} partTool={pt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
