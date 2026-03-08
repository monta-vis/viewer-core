import { useTranslation } from 'react-i18next';
import type { InstructionData, PartToolRow } from '@/features/instruction';
import { buildMediaUrl, MediaPaths } from '@/lib/media';
import { PrintPageFooter } from './PrintPageFooter';

interface PrintPartsToolsPageProps {
  data: InstructionData;
  folderName: string;
  instructionName: string;
  pageNumber: number;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

/**
 * Parts & Tools overview page for the print document.
 * Grid of all parts/tools with images and quantities.
 */
export function PrintPartsToolsPage({
  data,
  folderName,
  instructionName,
  pageNumber,
  onImageLoad,
  onImageError,
}: PrintPartsToolsPageProps) {
  const { t } = useTranslation();

  const allPartTools = Object.values(data.partTools);
  const parts = allPartTools.filter((pt) => pt.type === 'Part');
  const tools = allPartTools.filter((pt) => pt.type === 'Tool');

  if (parts.length === 0 && tools.length === 0) return null;

  return (
    <div className="print-page-break" data-testid="print-parts-tools-page">
      <h2 className="print-section-header" style={{ marginBottom: '0.75rem' }}>
        {t('printView.partsAndTools', 'Parts & Tools')}
      </h2>

      {/* Parts section */}
      {parts.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <h3 className="print-section-header">{t('printView.parts', 'Parts')}</h3>
          <div className="print-parts-grid">
            {parts.map((pt) => (
              <PartToolCard
                key={pt.id}
                partTool={pt}
                folderName={folderName}
                onImageLoad={onImageLoad}
                onImageError={onImageError}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tools section */}
      {tools.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <h3 className="print-section-header">{t('printView.tools', 'Tools')}</h3>
          <div className="print-parts-grid">
            {tools.map((pt) => (
              <PartToolCard
                key={pt.id}
                partTool={pt}
                folderName={folderName}
                onImageLoad={onImageLoad}
                onImageError={onImageError}
              />
            ))}
          </div>
        </div>
      )}

      <PrintPageFooter instructionName={instructionName} pageNumber={pageNumber} />
    </div>
  );
}

function PartToolCard({
  partTool,
  folderName,
  onImageLoad,
  onImageError,
}: {
  partTool: PartToolRow;
  folderName: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
}) {
  const imageUrl = partTool.previewImageId
    ? buildMediaUrl(folderName, MediaPaths.frame(partTool.previewImageId))
    : null;

  return (
    <div className="print-part-card">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={partTool.name}
          onLoad={onImageLoad}
          onError={onImageError}
          loading="eager"
        />
      ) : (
        <div style={{ width: '3.125rem', height: '3.125rem', background: '#ffffff', borderRadius: '0.125rem' }} />
      )}
      <span className="print-part-name">{partTool.name}</span>
      {partTool.label && (
        <span className="print-part-meta">{partTool.label}</span>
      )}
      {partTool.partNumber && (
        <span className="print-part-meta">#{partTool.partNumber}</span>
      )}
      {partTool.amount > 0 && (
        <span className="print-quantity-badge">&times;{partTool.amount}</span>
      )}
      {(partTool.material || partTool.dimension) && (
        <span className="print-part-meta">
          {[partTool.material, partTool.dimension].filter(Boolean).join(' · ')}
        </span>
      )}
    </div>
  );
}
