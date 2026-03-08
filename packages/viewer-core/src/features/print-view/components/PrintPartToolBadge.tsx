import type { PrintPartToolData } from '../utils/resolveSubstepPrintData';

interface PrintPartToolBadgeProps {
  partTool: PrintPartToolData;
}

/**
 * Compact inline badge showing part/tool name and quantity.
 */
export function PrintPartToolBadge({ partTool }: PrintPartToolBadgeProps) {
  const borderColor = partTool.type === 'Tool' ? '#6b7280' : 'var(--print-accent)';

  return (
    <span className="print-part-badge" style={{ borderColor }}>
      {partTool.label && (
        <strong>{partTool.label}</strong>
      )}
      <span>{partTool.name}</span>
      {partTool.amount > 1 && (
        <span className="print-quantity-badge">&times;{partTool.amount}</span>
      )}
    </span>
  );
}
