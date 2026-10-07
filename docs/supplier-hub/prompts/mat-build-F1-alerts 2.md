# Prompt: Material F1 · Alert order and close reasons

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with A3 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D1 is accepted (owner, 2026-09-29): keep CR-24 High, Medium and Low, and sort by days to impact within each class.
- Existing closed alerts keep their free-text note, and read as reason "Other" in counts.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-13 and AR-14.
- In the requirements: MR-9 BR-01 to BR-06 and AC-01 to AC-04.

Then read these files:
- `inventoryAlertRules.ts:22-36, 89-224` (`AlertCondition`, `alertsFromLedger` :167-185, `AlertLedgerEntry` :144, `groupAlertsBySupplier` :211-224)
- `flows/inventoryAlert.flow.ts:29-30`, `MockCommandService.ts:2711-2718`, `dispatcher.ts:624`
- `commandHooks.ts:2045, 2103-2108`
- `BuyerAlerts.tsx:62-79, 214-235`
- `capacityRules.ts:176-178` and A3's `alertClose` list

## OBJECTIVE

Put the most urgent alert first within each risk class, and make every closure carry a reason code that can be counted.

## STANDARD

Days to impact (BR-03)
- `AlertCondition` gains `daysToImpact: number`:
  - stock rules: days of cover or days to the projected stock-out
  - `capacityBelowDemand`: days to the first gap week
  - `staleData`: minus the days since it went stale, so the oldest comes first
  - other rules: 0

Sort (BR-02, AR-13)
- Within a class, fewest days first, then supplier name.
- `groupAlertsBySupplier` orders groups by their most urgent alert, not by name, so the grouping keeps the order.

Close verb (AR-14, BR-04)
- `requiredFields: ['closeReason']`, with `actionNote` optional.
- Hook `ALERT_CLOSE_REASON_GIVEN` replaces `ALERT_ACTION_NOTE_AUTHORED`. It refuses:
  - `REASON_UNKNOWN`: a retired or unknown code
  - `NOTE_REQUIRED`: `other` without a note
- The ledger stores `closeReason`. Pay the bill for the hook rename (MAT-R5).

Form
- A reason dropdown from `alertClose` (active codes only), with a note field required only for "Other".

Closed tab (BR-06)
- A reason filter, kept in the page address, and a count per reason per rule for the period.

Strings
- EN and ID for every string.

## FLIPS

- A3 left a placeholder `FLIPS` row in `hubSettings.bl32.test.ts` for each setting key this task reads: it checks only the value in force. Replace each of your keys' rows with a real rule outcome that flips when the setting changes.

## CONSTRAINTS

- CR-24 is unchanged.
- Out of scope: the `callOffNotCovered` rule (D3).

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - 2 High alerts with 3 and 10 days list 3 first, including after grouping (AC-01)
  - close without a reason is refused by the verb
  - "Other" without a note is refused (AC-02)
  - a retired reason is not offered, and old closures still show it (AC-03)
  - the closed tab counts per reason (AC-04)
  - an old note-only closure counts as Other
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the ordering, the close-reason change, the form, the closed tab and tests, run the gates and open the PR now.
