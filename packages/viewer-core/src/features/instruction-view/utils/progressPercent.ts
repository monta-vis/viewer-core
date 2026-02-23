/** Returns progress as a percentage (0–100) based on completed steps. */
export function progressPercent(currentIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return (currentIndex / totalSteps) * 100;
}
