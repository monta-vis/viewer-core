/**
 * Utility for multiplying PartTool amounts for ReferenceCard display.
 */

export interface PartToolSummary {
  name: string;
  type: 'Part' | 'Tool';
  amount: number;
}

/**
 * Clone part tools and multiply Part amounts by the given multiplier.
 * Tools are reusable and keep their original amount (not multiplied).
 * Used to show "target's PartTools × repeatCount" on ReferenceCards.
 */
export function multiplyPartToolAmounts(
  partTools: readonly PartToolSummary[],
  multiplier: number,
): PartToolSummary[] {
  return partTools.map(pt => ({
    name: pt.name,
    type: pt.type,
    amount: pt.type === 'Tool' ? pt.amount : pt.amount * multiplier,
  }));
}
