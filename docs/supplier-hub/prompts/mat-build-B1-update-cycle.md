# Prompt: Material B1 · Weekly update cycle and staleness by mode

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with A1 and A3 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D7 and MAT-D8 are accepted (owner, 2026-09-29).
- The hub calendar (BL-50) is the working-day source.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AD-1 and AR-07.
- In the requirements: MR-1 BR-03 to BR-05, section f, edge cases 1 to 5, and AC-02 to AC-05.

Then read these files:
- `inventoryRules.ts:284-293` (`stockFreshness`) and `:356-391` (`buildInventoryPositions`)
- `inventoryConfig.ts:70` and `hubSettingsStore.ts:248` (`stalePeriodFor`)
- the hub calendar module (search for the BL-50 working-calendar reader)
- the 7 callers of `stockFreshness` listed in AR-07
- `inventoryDeclarationStore.ts` and the sync attempt record

## OBJECTIVE

Judge each supplier × material as current, stale or missing by its update mode. A manual supplier goes stale at the Thursday cutoff. An API supplier goes stale after 24 hours without a successful pull. None of the 7 callers changes.

## STANDARD

Cycle
- Pure `updateCycleFor(date, calendar, settings)` → `{start, cutoff}`.
- The cutoff is `stockUpdate.cutoffDay` at `stockUpdate.cutoffTime` WIB. When that day is not a working day, it moves to the last working day before it.
- The cycle is (previous cutoff, cutoff]. [MR-1 BR-03]

Cycle status
- Pure `cycleStatus(supplierId, cycle, records, assignments)` → per material `'updated' | 'missing' | 'notCounted'`.
- Any channel counts, including `pti` (MAT-D7).
- A material assigned during the cycle is `notCounted` (edge case 2). [MR-1 BR-04]

Staleness
- `buildInventoryPositions` computes `staleAt` per position:
  - manual: the first cutoff after the last update
  - API: the last successful pull + `stale.apiHours`
  - a per-supplier × material override (BL-32) still wins, as days from the last update
- `stockFreshness(position, now)` compares `now` with `staleAt` and keeps its signature. The mode is read through `stockUpdateModeOf` (A1). [AR-07, MR-1 BR-05]
- Edge case 1 (a mode change mid-cycle) is decided by the mode at the cycle's start.

## FLIPS

- A3 left a placeholder `FLIPS` row in `hubSettings.bl32.test.ts` for each setting key this task reads: it checks only the value in force. Replace each of your keys' rows with a real rule outcome that flips when the setting changes.

## CONSTRAINTS

- No screen changes (B2). No compliance percentage (B3).
- `stale.defaultDays` stays in use only where no mode applies. State in the PR where that is, if anywhere.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `updateCycle.test.ts` covers:
  - a Thursday cutoff
  - a Thursday holiday moving the cutoff to Wednesday (AC-05)
  - an upload at 23:59:30 counting in the next cycle (edge case 4)
  - a `pti` record counting as updated (AC-04)
  - a mid-cycle assignment being `notCounted`
- `stockFreshness` tests cover:
  - a manual material stale the moment the cutoff passes (AC-02)
  - an API supplier stale after 24 h with failed pulls only (AC-03)
  - an override winning
- Existing freshness tests still pass. Where one changes because its fixture relied on 7 days, list it in the PR with the reason.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the cycle, status and staleness rules and tests, run the gates and open the PR now.

---

## Notes on design decisions

- Computing `staleAt` once in the read model keeps the 7 callers untouched (AR-07) and gives one answer on every screen (AD-1).
- The cycle is a pure function of the date and the calendar, so B2 (panel) and B3 (compliance) use the same weeks.
