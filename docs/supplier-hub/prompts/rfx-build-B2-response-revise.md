# Prompt: RFx B2 · Revise RFI and RFP responses until the deadline, with version history

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with task B1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- Decision D-6 is accepted (owner, 2026-09-25): a supplier revises a submitted response until the deadline.
- "The deadline" is the event's response deadline, including any extension that applies to this supplier.
- This task is verbs, store and reads. The "Revise response" button is B4.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read finding AR-05 in `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`, and NR-1 BR-08 and AC-06 and AC-07 in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`.

Then read these files:
- `src/services/transitions/flows/rfiResponse.flow.ts` and `rfpResponse.flow.ts`: Submitted is final today
- `src/services/transitions/flows/quotation.flow.ts` (`t_quotation_revise` at :80, the model to follow)
- The RFI and RFP response targets in `MockCommandService.ts` (:2919-2970, :3065-3129), which upsert 1 row per supplier and event
- The policies bound to their submit verbs
- The `answerRfi` and `answerRfp` branches of `useRfxCommand` (`commandHooks.ts:2496-2736`)
- `rfxReadModel.ts:209-268`

## OBJECTIVE

Add `t_rfiresponse_revise` and `t_rfpresponse_revise`, which let a supplier revise a submitted response until the deadline, and keep every submitted version on the response.

## STANDARD

- Add both verbs as state-preserving transitions from Submitted to Submitted, with the existing `rfiresponse:answer` and `rfpresponse:answer` roles. Reuse the submit policies, including the B1 document rules, and add 1 policy that refuses `RESPONSE_DEADLINE_PASSED` after the deadline, or when the event is not Open. [RFX-R1, RFX-R2]
- Check whether save and submit already refuse after the deadline. If they do not, apply the same deadline policy to them, and say so in the report. [RFX-R10, NR-1 AC-07]
- Add `versions: ResponseVersion[]` to `RfiResponse` and `RfpResponse`. A version is a snapshot of answers, pricing, other terms, question answers and documents, with `submittedAt` and a 1-based `number`. Append a version on each submit and each revise. Never edit or remove a version. The response's own fields keep showing the latest version. [RFX-R3, NR-1 BR-08]
- The buyer reads the latest version and can read earlier ones. A supplier reads only its own versions. [RFX-R4]
- Add `reviseRfiResponse` and `reviseRfpResponse` to `useRfxCommand`. Do not reuse `reviseRfi` or `reviseRfp`, which are the buyer's draft-edit verbs. [RFX-R1]
- Pay the invariant bill for the 2 verbs: surfaceable, annotations with EN and ID purpose text, and the C1 rows. [RFX-R5]

## CONSTRAINTS

- Out of scope: RFQ quotes, which already revise; screens (B4); and withdrawing a response.
- Seeded submitted responses have no `versions`. Read them as version 1 without editing the seeds.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/services/data/mock/rfxResponseReviseCommand.test.ts` covers these cases:
  - a supplier revises a submitted RFP response before the deadline: version 2 exists, version 1 is unchanged, and the buyer reads version 2
  - revising after the deadline is refused with `RESPONSE_DEADLINE_PASSED`
  - another supplier cannot revise it, and is refused at scope
  - a revise that drops a required document is refused with the B1 code
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the verbs, the version history and the tests, run the gates and open the PR now.

---

## Notes on design decisions

- A state-preserving verb follows `t_quotation_revise`, so RFI, RFP and RFQ revise the same way and the process-flow catalogue stays consistent.
- Versions are appended on the response rather than kept in a new store, because a version has no lifecycle of its own.
- The deadline check on save and submit is investigate-first, because it may already exist. The prompt tells the agent to report, not to guess.
