import type { ReactNode } from 'react';

const CARD_CLASS = 'rounded-xl border border-[var(--color-border-base)] bg-[var(--color-bg-surface)] flex flex-col';
const CARD_HEADER_CLASS = 'flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border-base)]';
const CARD_TITLE_CLASS = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]';
const CARD_BODY_CLASS = 'flex-1 p-3 flex flex-col gap-1';
const EMPTY_STATE_CLASS = 'flex-1 flex items-center justify-center text-sm italic text-[var(--color-text-muted)] py-4';

export interface SectionCardProps {
  'data-testid': string;
  icon: ReactNode;
  title: string;
  addButton?: ReactNode;
  emptyText?: string;
  children?: ReactNode;
}

export function SectionCard({ 'data-testid': testId, icon, title, addButton, emptyText, children }: SectionCardProps) {
  const hasChildren = children !== undefined && children !== null && children !== false;

  return (
    <div className={CARD_CLASS} data-testid={testId}>
      <div className={CARD_HEADER_CLASS}>
        <span className="text-[var(--color-element-muted)]">{icon}</span>
        <span className={`${CARD_TITLE_CLASS} flex-1`}>{title}</span>
        {addButton}
      </div>
      <div className={CARD_BODY_CLASS}>
        {hasChildren ? children : emptyText ? (
          <div className={EMPTY_STATE_CLASS}>{emptyText}</div>
        ) : null}
      </div>
    </div>
  );
}
