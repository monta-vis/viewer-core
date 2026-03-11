# Replace Web3Forms Feedback with HPI Support Ticket System

**Status:** pending
**Created:** 2026-03-11

## Context

The app currently uses Web3Forms (email API) for feedback submissions via `FeedbackWidget`. The user wants to replace this with the HPI (Human Process Integration) API to get a full support ticket workflow: intake, staff triage, resolution loop, and customer confirmation with process tracking.

**Architecture:** The Electron app acts as the client (ticket submission + tracking link). A separate server hosts the HPI orchestrator (triage loop, waitForTask, resolution). The user does not yet have an HPI instance — setup instructions included.

**Key constraint:** Same UI — `FeedbackWidget` stays unchanged. Only the submission backend changes.

## Overview

Two workstreams:
1. **viewer-core refactor** — Replace `web3FormsKey` prop with generic `onSubmitFeedback` callback (adapter pattern, like `PersistenceAdapter`)
2. **Orchestrator server** — New `apps/support-server/` that handles HPI workflow
3. **App wiring** — Electron app calls orchestrator server via HTTP, passes adapter to viewer-core

## Step 1: Define Types in viewer-core

**New file:** `packages/viewer-core/src/features/feedback/types.ts`

```ts
export interface FeedbackPayload {
  description?: string;
  phoneNumber?: string;
  screenshot?: File | null;
  attachment?: File | null;
  instructionName?: string;
  stepNumber?: number;
}

export interface FeedbackSubmitResult {
  success: boolean;
  trackingUrl?: string;
}

export type FeedbackSubmitFn = (data: FeedbackPayload) => Promise<FeedbackSubmitResult>;
```

Export from `packages/viewer-core/src/features/feedback/index.ts` barrel.

## Step 2: Refactor viewer-core Components (TDD)

Replace `web3FormsKey?: string` with `onSubmitFeedback?: FeedbackSubmitFn` in the prop chain:

| File | Change |
|------|--------|
| `packages/viewer-core/src/features/feedback/components/FeedbackWidget.tsx` | Replace `web3FormsKey` prop → `onSubmitFeedback`. `handleSubmit` calls `onSubmitFeedback(payload)` instead of `submitFeedback()` |
| `packages/viewer-core/src/features/feedback/components/FeedbackButton.tsx` | Replace `web3FormsKey` prop → `onSubmitFeedback`, forward to FeedbackWidget |
| `packages/viewer-core/src/features/feedback/components/StarRating.tsx` | Replace `web3FormsKey` prop → `onSubmitFeedback`, use it in rating submit |
| `packages/viewer-core/src/features/instruction-view/components/InstructionView.tsx` | Replace `web3FormsKey` prop (line 133) → `onSubmitFeedback`, pass to FeedbackButton (line 785) and StarRating (line 1002) |

**Clean up `submitFeedback.ts`:** Remove `submitViaEmail` and `submitFeedback`. Keep `dataUrlToBlob` (used by FeedbackWidget for screenshot conversion).

### Tests (TDD — write before implementation)

Update `packages/viewer-core/src/features/feedback/utils/submitFeedback.test.ts`:
- Remove all Web3Forms tests (`submitViaEmail`, `submitFeedback`)
- Keep `dataUrlToBlob` test

Add to existing or new FeedbackWidget test:
- Test that `onSubmitFeedback` callback is called with correct payload shape
- Test that success/error states work when callback resolves/rejects

## Step 3: Orchestrator Server

**New workspace:** `apps/support-server/`

A lightweight Deno HTTP server (matching HPI's example pattern) that:
1. Accepts `POST /tickets` from Electron app with feedback payload
2. Creates HPI process (4 steps: intake, triage, resolution, confirmation)
3. Creates process tracking link for customer
4. Completes intake task immediately with submitted data
5. Starts triage loop (create staff triage task, waitForTask, handle "request more info" or "send resolution")
6. Returns `{ success: true, trackingUrl: "..." }` to the Electron app immediately after intake

**Files:**
- `apps/support-server/serve.ts` — HTTP server (port from env)
- `apps/support-server/orchestrator.ts` — HPI workflow logic
- `apps/support-server/hpiClient.ts` — Thin HPI API wrapper (createProcess, createTask, completeTask, waitForTask, updateProcess, createProcessLink)

**Env vars for server:**
- `HPI_URL` — HPI instance URL (e.g., `http://localhost:5188`)
- `HPI_TOKEN` — API token from HPI dashboard
- `PORT` — Server port (default 3000)

## Step 4: Wire Electron App

**File:** `apps/viewer/src/feedback/submitToSupportServer.ts` (new)

```ts
export const submitToSupportServer: FeedbackSubmitFn = async (data) => {
  const baseUrl = import.meta.env.VITE_SUPPORT_SERVER_URL;
  // Convert screenshot File to base64 if present
  // POST to orchestrator server
  // Return { success, trackingUrl }
};
```

**File:** `apps/viewer/src/pages/ViewPage.tsx` (line 963)

Replace:
```ts
web3FormsKey={import.meta.env.VITE_WEB3FORMS_KEY}
```
With:
```ts
onSubmitFeedback={submitToSupportServer}
```

**File:** `apps/viewer/.env`

Replace `VITE_WEB3FORMS_KEY` with:
```
VITE_SUPPORT_SERVER_URL=http://localhost:3000
```

## Step 5: HPI Setup Instructions

1. Clone HPI repo, set `HPI_EDITION=ee`
2. Run `deno task dev` to start HPI instance
3. Create API token in HPI dashboard (Settings > API Tokens)
4. Set env vars in `apps/support-server/.env`
5. Run `deno run --allow-net --allow-read --allow-env apps/support-server/serve.ts`

## Implementation Order

1. Define `FeedbackPayload`, `FeedbackSubmitFn`, `FeedbackSubmitResult` types
2. Write tests for refactored components (TDD)
3. Refactor viewer-core: replace `web3FormsKey` → `onSubmitFeedback` in all components
4. Clean up `submitFeedback.ts` (keep `dataUrlToBlob` only)
5. Build viewer-core: `npm run build:core`
6. Create `apps/support-server/` with HPI client + orchestrator
7. Create `submitToSupportServer` adapter in `apps/viewer/`
8. Wire ViewPage.tsx
9. Update `.env`
10. Build app: `npm run build:app`

## Critical Files

- `packages/viewer-core/src/features/feedback/utils/submitFeedback.ts` — remove Web3Forms, keep dataUrlToBlob
- `packages/viewer-core/src/features/feedback/components/FeedbackWidget.tsx` — replace web3FormsKey → onSubmitFeedback
- `packages/viewer-core/src/features/feedback/components/FeedbackButton.tsx` — same prop change
- `packages/viewer-core/src/features/feedback/components/StarRating.tsx` — same prop change
- `packages/viewer-core/src/features/instruction-view/components/InstructionView.tsx` — same prop change (line 133, 785, 1002)
- `apps/viewer/src/pages/ViewPage.tsx` — wire new adapter (line 963)

## Verification

1. `npm run test` — all tests pass (updated feedback tests)
2. `npm run build:core` — viewer-core builds
3. `npm run build:app` — app builds
4. Start HPI instance + support server
5. Open app → FeedbackWidget → submit → verify HPI process created
6. Check HPI dashboard for triage task
7. Complete triage → verify resolution task sent to customer
8. Open tracking link → verify customer can see progress
