/** Extract values from a record and sort them. */
export function sortedValues<T>(
  record: Record<string, T>,
  compareFn: (a: T, b: T) => number,
): T[] {
  return Object.values(record).sort(compareFn);
}

/** Sort comparator: by `order` field (ascending). */
export const byOrder = (a: { order: number }, b: { order: number }): number =>
  a.order - b.order;

/** Sort comparator: by `stepNumber` field (ascending). */
export const byStepNumber = (a: { stepNumber: number }, b: { stepNumber: number }): number =>
  a.stepNumber - b.stepNumber;
