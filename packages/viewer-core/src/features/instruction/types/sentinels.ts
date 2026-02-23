/**
 * Sentinel value for the "Unassigned" pseudo-step.
 * - `null` = no step selected (unchanged)
 * - `UNASSIGNED_STEP_ID` = unassigned bucket selected
 * - UUID string = real step selected
 */
export const UNASSIGNED_STEP_ID = '__unassigned__' as const;

/**
 * Sentinel value for the "Unassigned" pseudo-substep.
 * - `null` = no substep selected (unchanged)
 * - `UNASSIGNED_SUBSTEP_ID` = unassigned bucket selected
 * - UUID string = real substep selected
 */
export const UNASSIGNED_SUBSTEP_ID = '__unassigned_substep__' as const;
