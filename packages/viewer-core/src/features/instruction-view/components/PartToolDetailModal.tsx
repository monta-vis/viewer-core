import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Package, Wrench, Hash, Layers, FileText, Ruler, Box, Scale, ImageIcon, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

import type { AggregatedPartTool } from '../hooks/useFilteredPartsTools';
import { resolvePartToolImageUrl } from '../utils/resolvePartToolImageUrl';
import type { FrameCaptureData } from '../utils/resolveRawFrameCapture';
import { VideoFrameCapture } from './VideoFrameCapture';
import { TextInputModal } from '@/components/ui';
import type { TextInputSuggestion } from '@/components/ui';

/** Edit callbacks for part/tool detail modal. Only used when editMode=true. */
export interface PartToolEditCallbacks {
  /** Swap the current part/tool reference with an existing one from the catalog */
  onReplacePartTool?: (oldPartToolId: string, newPartToolId: string) => void;
  /** Create a new part/tool with the given name and swap the reference */
  onCreatePartTool?: (oldPartToolId: string, newName: string) => void;
  /** Edit the substep-specific amount */
  onEditPartToolAmount?: (partToolId: string, newAmount: string) => void;
  /** Edit the part/tool preview image */
  onEditPartToolImage?: (partToolId: string) => void;
  /** Delete the part/tool */
  onDeletePartTool?: (partToolId: string) => void;
}

interface PartToolDetailModalProps {
  /** The part/tool to display */
  item: AggregatedPartTool | null;
  /** Callback to close the modal */
  onClose: () => void;
  /** Project folder name for mvis-media:// area image URLs */
  folderName?: string;
  /** PartTool-VideoFrameArea junction records from the store */
  partToolVideoFrameAreas?: Record<string, { partToolId: string; videoFrameAreaId: string; isPreviewImage: boolean; order: number }>;
  /** Whether to use blurred media variants */
  useBlurred?: boolean;
  /** Raw frame capture data for Editor preview */
  frameCaptureData?: FrameCaptureData | null;
  /** VideoFrameArea records for localPath fallback (mweb context) */
  videoFrameAreas?: Record<string, { localPath?: string | null }>;
  /** Show inline edit controls. Default: false */
  editMode?: boolean;
  /** Edit callbacks — only used when editMode=true */
  editCallbacks?: PartToolEditCallbacks;
  /** Catalog of available parts/tools for search + swap (name/partNumber editing) */
  partToolCatalog?: TextInputSuggestion[];
}

/** Tappable field styling class (dashed outline on hover) */
const EDITABLE_FIELD_CLASS = 'cursor-pointer rounded px-1 -mx-1 hover:outline-2 hover:outline-dashed hover:outline-[var(--color-secondary)]/60';

/** Which field is currently being edited */
type EditingField = 'name' | 'amount';

/**
 * PartToolDetailModal - Elegant detail view for parts and tools
 *
 * Industrial-refined aesthetic with:
 * - Large image showcase with subtle vignette
 * - Clean typography with mono accents for technical data
 * - Step badges showing where the part/tool is used
 * - Smooth entrance animation
 * - Name/partNumber: search + swap from catalog or create new
 * - Amount: editable via TextInputModal (substep-specific)
 * - Other fields (unit, material, dimension, description): read-only display
 */
export function PartToolDetailModal({ item, onClose, folderName, partToolVideoFrameAreas, useBlurred, frameCaptureData, videoFrameAreas, editMode = false, editCallbacks, partToolCatalog }: PartToolDetailModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = item !== null;

  // Internal state for TextInputModal
  const [editingField, setEditingField] = useState<{ field: EditingField; currentValue: string } | null>(null);

  // Close editing when item changes
  useEffect(() => {
    setEditingField(null);
  }, [item?.partTool.id]);

  // Close on Escape key (only when TextInputModal is NOT open — it handles its own Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !editingField) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingField]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!item) return null;

  const isPart = item.partTool.type === 'Part';
  const Icon = isPart ? Package : Wrench;
  const accentColor = isPart ? 'var(--color-element-part)' : 'var(--color-element-tool)';
  const typeLabel = isPart
    ? t('instructionView.part', 'Part')
    : t('instructionView.tool', 'Tool');

  const previewImageUrl = resolvePartToolImageUrl(
    item.partTool.id,
    folderName,
    partToolVideoFrameAreas ?? {},
    useBlurred,
    videoFrameAreas,
  );

  const partToolId = item.partTool.id;

  /** Handle name/partNumber confirm (free-text → create new part/tool) */
  const handleNameConfirm = (newValue: string) => {
    editCallbacks?.onCreatePartTool?.(partToolId, newValue);
    setEditingField(null);
  };

  /** Handle name/partNumber suggestion select (swap reference) */
  const handleNameSelect = (selectedId: string) => {
    editCallbacks?.onReplacePartTool?.(partToolId, selectedId);
    setEditingField(null);
  };

  /** Handle amount confirm */
  const handleAmountConfirm = (newValue: string) => {
    editCallbacks?.onEditPartToolAmount?.(partToolId, newValue);
    setEditingField(null);
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className={clsx(
          'fixed inset-0 z-50 transition-all duration-300',
          'bg-black/60 backdrop-blur-sm',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parttool-detail-title"
        tabIndex={-1}
        className={clsx(
          'fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-full sm:max-w-md',
          'z-50 outline-none',
          'transition-all duration-300 ease-out',
          isOpen
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        <div className="h-full sm:h-auto flex flex-col bg-[var(--color-bg-surface)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border-muted)]">

          {/* Image Section - Hero area */}
          <div className="relative bg-[var(--color-bg-base)] aspect-square sm:aspect-[4/3]">
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
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon
                  className="w-24 h-24 opacity-20"
                  style={{ color: accentColor }}
                />
              </div>
            )}

            {/* Subtle vignette overlay (only when an image is shown) */}
            {(frameCaptureData || previewImageUrl) && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)'
                }}
              />
            )}

            {/* Edit mode: image edit button (top center) */}
            {editMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
                <button
                  type="button"
                  aria-label={t('common.edit', 'Edit')}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); editCallbacks?.onEditPartToolImage?.(partToolId); }}
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Close button - top right */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/60 hover:text-white transition-all"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Type badge - top left */}
            <div
              className="absolute top-3 left-3 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 text-white font-medium text-sm"
              style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 85%, black)` }}
            >
              <Icon className="w-4 h-4" />
              <span>{typeLabel}</span>
            </div>

            {/* Quantity badge - bottom right, prominent */}
            <div
              data-testid={editMode ? 'editable-amount' : undefined}
              className={clsx(
                'absolute bottom-3 right-3 px-5 py-2 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-black/5',
                editMode && 'cursor-pointer hover:outline-2 hover:outline-dashed hover:outline-[var(--color-secondary)]/60',
              )}
              role={editMode ? 'button' : undefined}
              tabIndex={editMode ? 0 : undefined}
              onClick={editMode ? (e) => { e.stopPropagation(); setEditingField({ field: 'amount', currentValue: String(item.totalAmount) }); } : undefined}
              onKeyDown={editMode ? (e) => { if (e.key === 'Enter') setEditingField({ field: 'amount', currentValue: String(item.totalAmount) }); } : undefined}
            >
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: accentColor }}
              >
                {item.totalAmount}×
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 sm:flex-none p-5 space-y-4 overflow-y-auto">

            {/* Name — editable in edit mode (search + swap) */}
            <div
              data-testid={editMode ? 'editable-name' : undefined}
              className={editMode ? EDITABLE_FIELD_CLASS : undefined}
              role={editMode ? 'button' : undefined}
              tabIndex={editMode ? 0 : undefined}
              onClick={editMode ? () => setEditingField({ field: 'name', currentValue: '' }) : undefined}
              onKeyDown={editMode ? (e) => { if (e.key === 'Enter') setEditingField({ field: 'name', currentValue: '' }); } : undefined}
            >
              <h2
                id="parttool-detail-title"
                className="text-xl font-semibold text-[var(--color-text-base)] leading-tight"
              >
                {item.partTool.name}
              </h2>
            </div>

            {/* Part Number — read-only display (always, no edit controls) */}
            {item.partTool.partNumber && (
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <Hash className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                <span className="font-mono text-sm tracking-wide">
                  {item.partTool.partNumber}
                </span>
              </div>
            )}

            {/* Unit / Material / Dimension — always read-only */}
            {(item.partTool.unit || item.partTool.material || item.partTool.dimension) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
                {item.partTool.unit && (
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                    <span>{item.partTool.unit}</span>
                  </div>
                )}
                {item.partTool.material && (
                  <div className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                    <span>{item.partTool.material}</span>
                  </div>
                )}
                {item.partTool.dimension && (
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-subtle)]" />
                    <span>{item.partTool.dimension}</span>
                  </div>
                )}
              </div>
            )}

            {/* Description — always read-only */}
            {item.partTool.description && (
              <div className="flex gap-2">
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--color-text-subtle)]" />
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {item.partTool.description}
                </p>
              </div>
            )}

            {/* Used in Steps */}
            {item.usedInSteps.length > 0 && (
              <div className="pt-2 shadow-[0_-1px_2px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2 mb-2.5">
                  <Layers className="w-4 h-4 text-[var(--color-text-subtle)]" />
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    {t('instructionView.usedInSteps', 'Used in steps')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.usedInSteps.map((stepNum) => (
                    <span
                      key={stepNum}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold tabular-nums transition-colors"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                        color: accentColor,
                        border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`
                      }}
                    >
                      {stepNum}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Edit mode: delete button */}
            {editMode && (
              <button
                type="button"
                aria-label={t('editorCore.deletePartTool', 'Delete part/tool')}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                onClick={() => editCallbacks?.onDeletePartTool?.(partToolId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t('editorCore.deletePartTool', 'Delete part/tool')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TextInputModal for name editing (with catalog suggestions) */}
      {editingField?.field === 'name' && (
        <TextInputModal
          label={t('instructionView.fieldName', 'Name')}
          value={editingField.currentValue}
          inputType="text"
          onConfirm={handleNameConfirm}
          onCancel={() => setEditingField(null)}
          suggestions={partToolCatalog}
          onSelect={handleNameSelect}
        />
      )}

      {/* TextInputModal for amount editing (number, no suggestions) */}
      {editingField?.field === 'amount' && (
        <TextInputModal
          label={t('instructionView.fieldAmount', 'Amount')}
          value={editingField.currentValue}
          inputType="number"
          onConfirm={handleAmountConfirm}
          onCancel={() => setEditingField(null)}
        />
      )}
    </>
  );
}
