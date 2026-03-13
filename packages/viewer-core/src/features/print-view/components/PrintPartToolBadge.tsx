import type { PrintPartToolData } from '../utils/resolveSubstepPrintData';

interface PrintPartToolBadgeProps {
  partTool: PrintPartToolData;
}

/**
 * Compact inline badge showing part/tool name and quantity.
 */
export function PrintPartToolBadge({ partTool }: PrintPartToolBadgeProps) {
  return (
    <span className="print-part-badge">
      {partTool.position && (
        <strong>{partTool.position}</strong>
      )}
      <span>{partTool.name}</span>
      {partTool.amount > 1 && (
        <span className="print-quantity-badge">&times;{partTool.amount}</span>
      )}
    </span>
  );
}
