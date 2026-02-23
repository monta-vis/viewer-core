/**
 * Tutorial step state machine for InstructionView.
 *
 * Steps:
 *   0 = "Click the Package button" (opens PartsDrawer)
 *   1 = "Close the PartsDrawer"
 *   2 = "Click a substep card"
 *   null = tutorial complete / not active
 */

export type TutorialStep = 0 | 1 | 2 | null;

/** Get the initial tutorial step based on whether tutorial mode is enabled. */
export function getInitialTutorialStep(tutorialEnabled: boolean): TutorialStep {
  return tutorialEnabled ? 0 : null;
}

/** Advance tutorial step when the parts drawer opens (step 0 → 1). */
export function advanceOnDrawerOpen(current: TutorialStep): TutorialStep {
  return current === 0 ? 1 : current;
}

/** Advance tutorial step when the parts drawer closes (step 1 → 2). */
export function advanceOnDrawerClose(current: TutorialStep): TutorialStep {
  return current === 1 ? 2 : current;
}

/** Advance tutorial step when a substep card is clicked (step 2 → null). */
export function advanceOnSubstepClick(current: TutorialStep): TutorialStep {
  return current === 2 ? null : current;
}
