# Prompt: Material A3 · Setting units, new settings, alert close reasons

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D7, MAT-D8 and MAT-D9 are accepted (owner, 2026-09-29): cutoff Thursday 23:59 WIB, API stale after 24 h, score weight 0.10.
- A time of day is stored as minutes after midnight, WIB.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-08.
- In the requirements: MR-1 section f, MR-2 BR-04 and BR-05, MR-6 section f, MR-9 BR-04 and BR-05.

Then read these files:
- `src/services/transitions/hubSettings.ts` (`HubSettingUnit` :33, `DEFS` :64-203, `NumericSettingKey` :208, `HubSettingValue` :260, `ORDER_RULES` :317)
- `hubSettingsStore.ts:230-248`
- `src/pages-v2/admin/AdminRuleValues.tsx:76-86, 138, 350`
- `hubSettings.bl32.test.ts:592` (`FLIPS`)
- `src/services/transitions/reasonCodes.ts:38-68` and `reasonCodes.bl32.test.ts:95`
- `src/lib/i18n/adminSettings.ts:112, 333` and `adminReasons.ts:16, 89`
- `capacityRules.ts:176-178` (`NOTE_REQUIRED_CODE`)

## OBJECTIVE

Let the admin set every value the material tasks read, and define the alert close reasons, without any rule reading them yet.

## STANDARD

Units
- Add `hours`, `weekday` (1 to 7, Monday = 1) and `time` (0 to 1439 minutes) to `HubSettingUnit`.
- Format them in the `AdminRuleValues.tsx:76-86` switch: "24 h", "Thursday", "23:59 WIB". The input for `time` is a time field. [AR-08]

Keys (section, rule, default, bounds)

| Key | Default | Bounds |
|---|---|---|
| `stockSync.intervalHours` | 2 | 1 to 24 |
| `stale.apiHours` | 24 | 1 to 168 |
| `stockUpdate.cutoffDay` | 4 (Thursday) | 1 to 7 |
| `stockUpdate.cutoffTime` | 1439 | 0 to 1439 |
| `compliance.warnPct` | 80 | 0 to 100 |
| `compliance.flagPct` | 60 | 0 to 100 |
| `compliance.scoreWeight` | 0.10 | 0 to 0.5 |
| `shelfLife.defaultMonths` | 6 | 0 to 60 |

- Group them under rule headings MR-1, MR-2 and MR-6 in the admin screen, with EN and ID labels and hints.
- Add an `ORDER_RULES` entry so that `compliance.warnPct` must be greater than `compliance.flagPct`.
- Add a `FLIPS` entry per key. [MAT-R5]

Reason list
- Add `alertClose` to `REASON_LISTS`, `STARTER_REASON_CODES` and `BUILT_IN_LABEL_PREFIX`.
- Codes: `calloff-raised`, `po-raised`, `supplier-updated`, `supplier-confirmed-other`, `data-error`, `risk-accepted`, and `other` as the note-required code.
- Add EN and ID labels. Update the pinned list in `reasonCodes.bl32.test.ts:95`. [MR-9 BR-05]

## CONSTRAINTS

- No reader of the new keys or the list. B1, B3, D2 and F1 read them.
- `stale.defaultDays` stays as it is.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `hubSettings.material.test.ts` covers:
  - each key's default and bounds
  - setting `compliance.flagPct` above `compliance.warnPct` is refused by the ordering rule
  - `time` 1439 formats as 23:59
- `reasonCodes.bl32.test.ts` passes with `alertClose`, and `other` is the note-required code.
- The admin screen shows the 8 keys and the new list, in EN and ID.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Add the units, keys, reason list, labels and tests, run the gates and open the PR now.

---

## Notes on design decisions

- Minutes after midnight keep `HubSettingValue` numeric, so the store and the change log need no new type.
- Every material value is in 1 task, so the later tasks only read. Admin changes are governed and logged from day 1 (BL-32).
