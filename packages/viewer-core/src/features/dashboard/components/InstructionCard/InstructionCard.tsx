import { clsx } from 'clsx';
import { Check, X, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { Card, Badge, IconButton } from '@/components/ui';
import { useInstructionCard } from './useInstructionCard';
import { InstructionCardImage } from './InstructionCardImage';
import { InstructionCardActions } from './InstructionCardActions';
import { type InstructionCardProps } from './types';

export { type InstructionCardProps, type ExportFormat } from './types';

export function InstructionCard(props: InstructionCardProps) {
  const { id, onEdit, onExport, onEditTranslations } = props;

  const {
    state,
    computed,
    setters,
    handlers,
    refs,
    dropzone,
    t,
  } = useInstructionCard(props);

  // Collapsed card view
  if (!state.isExpanded) {
    const handleKeyDown = (e: React.KeyboardEvent) => e.key === 'Enter' && handlers.handleCardClick();

    const collapsedContent = (
      <>
        {/* Image area wrapper */}
        <div className="relative">
          <div className={clsx('aspect-square overflow-hidden', !props.flat && 'bg-[var(--color-bg-surface)] rounded-t-2xl')}>
            <InstructionCardImage
              imageUrl={computed.imageUrl}
              name={props.name}
              isExpanded={false}
              isUploadingImage={false}
              isDragOver={false}
              getRootProps={() => ({})}
              getInputProps={() => ({})}
              fileInputRef={refs.fileInputRef}
              onImageSelect={() => {}}
              onUploadClick={() => {}}
              onImageDelete={() => {}}
            />
          </div>

          {/* Action buttons pill group */}
          {id && (
            <InstructionCardActions
              onEdit={onEdit}
              onProcessMedia={props.onProcessMedia}
              isProcessing={props.isProcessing}
              onBlurPersons={props.onBlurPersons}
              isBlurring={props.isBlurring}
              onTranslate={props.onTranslate}
              isTranslating={state.translatingLangs.size > 0}
              onEditTranslations={onEditTranslations}
              onTutorial={props.onTutorial}
              onExport={onExport}
              isExporting={state.isExporting}
            />
          )}

          {/* Blurred media toggle — top-right of image, wrapped in pill like action buttons */}
          {props.onToggleBlurred && (
            <div className={clsx(
              'absolute top-3 right-3 z-10 rounded-lg shadow-lg p-1 backdrop-blur-md ring-1 ring-white/20',
              props.useBlurred
                ? 'bg-green-500/20'
                : 'bg-white/20 dark:bg-black/25',
            )}>
              <IconButton
                icon={props.useBlurred ? <ShieldCheck /> : <ShieldOff />}
                aria-label={props.useBlurred ? t('instruction.showOriginal', 'Show original media') : t('instruction.useBlurred', 'Use blurred media')}
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onToggleBlurred!(!props.useBlurred);
                }}
                className={clsx(
                  'hover:bg-white/25 dark:hover:bg-white/15',
                  props.useBlurred && '!text-white',
                )}
              />
            </div>
          )}

          {/* Delete button — bottom-right of image, visible on hover */}
          {props.onDelete && (
            <IconButton
              icon={<Trash2 />}
              aria-label={t('common.delete', 'Delete')}
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete!();
              }}
              className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm shadow-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            />
          )}
        </div>

        {/* Footer */}
        <div className={clsx('px-4 pt-3 pb-4', props.footerClassName)}>
          <div className="flex flex-col gap-2">
            {/* Title row: name + version + status + language */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] line-clamp-1">
                  {computed.displayContent.name}
                </h3>
                {props.version && (
                  <Badge variant="primary" size="sm">V{props.version}</Badge>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {computed.showLanguageFallbackBadge && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10"
                    title={t('instruction.languageNotAvailable', 'Translation not available')}
                  >
                    {computed.contentLanguage.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Article number */}
            {props.articleNumber && (
              <p className="text-sm text-[var(--color-text-muted)] font-mono truncate">
                {props.articleNumber}
              </p>
            )}

            {/* Description */}
            {computed.displayContent.description && (
              <p className="text-sm text-[var(--color-text-muted)] leading-snug line-clamp-2">
                {computed.displayContent.description}
              </p>
            )}

            {/* Meta row: duration (left) · date (right) */}
            {(props.estimatedDuration != null || props.updatedAt) && (
              <div className="flex items-center justify-between text-sm text-[var(--color-text-subtle)] mt-1">
                {props.estimatedDuration != null && (
                  <span className="tabular-nums">{t('instruction.estimatedDurationValue', { duration: props.estimatedDuration })}</span>
                )}
                {props.updatedAt && (
                  <span>
                    {new Date(props.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            )}

            {/* Optional footer slot (used by MWeb for start button) */}
            {props.footer}
          </div>
        </div>
      </>
    );

    if (props.flat) {
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={handlers.handleCardClick}
          onKeyDown={handleKeyDown}
          className="group relative cursor-pointer"
        >
          {collapsedContent}
        </div>
      );
    }

    return (
      <Card
        role="button"
        tabIndex={0}
        onClick={handlers.handleCardClick}
        onKeyDown={handleKeyDown}
        variant="ghost"
        bordered={false}
        padding="none"
        selected={props.selected}
        className={clsx(
          'group relative cursor-pointer overflow-hidden',
          'bg-[var(--color-bg-elevated)]',
          'shadow-lg shadow-black/15',
          'hover:shadow-2xl hover:shadow-black/25',
          'hover:-translate-y-1.5',
          'active:translate-y-0 active:shadow-lg active:scale-[0.98]',
          'transition-all duration-300',
          'focus:outline-none focus-visible:outline-none',
        )}
      >
        {collapsedContent}
      </Card>
    );
  }

  // Expanded card view (editing mode)
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'rounded-xl shadow-xl shadow-black/20',
        'bg-[var(--color-bg-elevated)]',
        'ring-2 ring-[var(--color-primary)]/40'
      )}
    >
      <InstructionCardImage
        imageUrl={computed.imageUrl}
        name={props.name}
        isExpanded={true}
        isUploadingImage={state.isUploadingImage}
        isDragOver={dropzone.isDragOver}
        getRootProps={dropzone.getRootProps}
        getInputProps={dropzone.getInputProps}
        fileInputRef={refs.fileInputRef}
        onImageSelect={handlers.handleImageSelect}
        onUploadClick={handlers.handleUploadClick}
        onImageDelete={handlers.handleImageDelete}
      />

      {/* Editable fields */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('instruction.name', 'Name')}
          </label>
          <input
            type="text"
            value={state.editName}
            onChange={(e) => setters.setEditName(e.target.value)}
            className={clsx(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[var(--color-bg-base)] shadow-sm',
              'text-[var(--color-text-base)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40'
            )}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">
            {t('instruction.description', 'Description')}
          </label>
          <textarea
            value={state.editDescription}
            onChange={(e) => setters.setEditDescription(e.target.value)}
            rows={2}
            className={clsx(
              'w-full px-3 py-2 rounded-lg text-sm resize-none',
              'bg-[var(--color-bg-base)] shadow-sm',
              'text-[var(--color-text-base)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40'
            )}
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-3">
          <IconButton
            icon={<X />}
            aria-label={t('common.cancel', 'Cancel')}
            variant="ghost"
            size="sm"
            onClick={handlers.handleCancel}
            disabled={state.isSaving}
          />
          <IconButton
            icon={<Check />}
            aria-label={t('common.save', 'Save')}
            variant={computed.isDirty ? 'primary' : 'ghost'}
            size="sm"
            onClick={handlers.handleSave}
            disabled={state.isSaving || !state.editName.trim()}
            className={clsx(
              computed.isDirty && 'animate-pulse ring-2 ring-[var(--color-secondary)] bg-[var(--color-secondary)]/20',
              state.saveButtonShake && 'animate-shake'
            )}
          />
        </div>
      </div>
    </div>
  );
}
