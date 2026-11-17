# BL-318 review: a closed round row's PO On Hold figure

| | |
|---|---|
| Prepared | 2026-11-17 |
| Scope | BL-318 only: the PO On Hold column on a closed (executed) round row of the PO On Hold panel. PEX-8 |
| Sources read | `../reviews/VERIFY-135-2026-11-16.md` D2 and D3; `DECISION-GUIDE.md` MR !135 rows; `BUILD-GAP.md` 1.4; `BACKLOG.md` BL-318; `SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md` PEX-7 and PEX-8; `poOnHoldReadModel.js`, `PoOnHoldPanel.jsx` and their tests at `gitlab/main` `5d2edcea` |
| Outcome | One display rule: a closed round row shows the quantity that stayed on hold after that round, from the run's own plan. Built on branch `fix/bl318-closed-round-qty` |

## 1. Already reviewed

| Review | What it settled | What it left open |
|---|---|---|
| `VERIFY-135-2026-11-16.md` D2 (lines 131 to 135) | Found the fault on both seats: round 1's closed row reads "122,000 PCS / 4,300 PCS / 0 PCS" and, in the same row, "Stays on hold, back to the planner: 113,400 PCS". Names `poOnHoldReadModel.js:404` (`qty: 0`) as the suspect. | The fix. Its own proposed row offered two options without choosing. |
| `DECISION-GUIDE.md` MR !135 block (rows !135-1 to !135-4, !135-3a) | Recorded the four [Proposed] calls of MR !135 and the separate DA-room question (BL-317). | Nothing about the closed-row figure. !135-3a is BL-317, not this row. |
| `BUILD-GAP.md` 1.4, PEX-8 row | Records BL-318 as known: a closed round row reads 0 PCS next to its stay quantity. | The rule and the build. |
| `BACKLOG.md` BL-318 | Files the row at size S, names the two candidate fixes. | Which one, and the requirement that governs it. |
| PEX-8 in the requirements (BR-04, BR-05, and the built-beyond-BR-01 note) | Defines that a remainder above the cap stays on hold and returns to the planner; the rounds behaviour itself is [Proposed] and built. | No rule for what a closed row displays. |

No earlier review covers the fix choice, and no market comparison exists for it. This note reviews that choice only; the mechanism itself (rounds, execution, the ledger) was reviewed in MR !135's browser check and is not re-reviewed here.

## 2. The mechanism as built

- An execution writes one append-only ledger row with `plan`, produced by `planExecution` before the run (`poOnHoldReadModel.js` lines 419 to 429 show it read back).
- `plan.stayOnHoldQty` is the quantity the execution left on hold after that round. The panel renders it in the row's sentence: "Stays on hold, back to the planner: 113,400 PCS" (`PoOnHoldPanel.jsx` lines 469 to 473).
- The closed row is built from the execution's snapshot under `...snap`, then overwrites the figure with `qty: 0` (`poOnHoldReadModel.js` line 404).
- The table renders that field in the PO On Hold column (`PoOnHoldPanel.jsx` lines 805 to 807).
- So one row carries two figures for the same quantity: `plan.stayOnHoldQty` in its sentence and `0` in the column. The column is wrong, not the sentence.

## 3. Options

| Option | What changes | Cost |
|---|---|---|
| A. Show the quantity that stayed after that round | `qty` on the closed row = `plan.stayOnHoldQty` (0 only when nothing stayed) | One line in the read model, plus tests |
| B. Hide the PO On Hold cell on closed rows | The page renders no figure for a closed row | One conditional in the panel; the figure survives only in the sentence |
| C. Show a dash for a closed row | `qty` stays 0 internally and the page renders "not applicable" | Adds a state that is false: the figure is known, it is not missing |

## 4. Market practice, graded as the `DECISION-GUIDE.md` rows grade sources

Sources are graded A (vendor documentation), B (standard or regulator), C (practitioner guide), D (vendor marketing).

| Finding | Source | Grade |
|---|---|---|
| A history view renders the value recorded in the event, never a recomputed or synthesized one. Current state answers "what is true now"; event detail answers "what was recorded about this action". The two are not interchangeable. | Pixso, "Audit Log UI Design" (https://pixso.net/articles/audit-log-ui-design/) | C |
| Do not use 0 for missing or not applicable data; 0 is reserved for a real numeric zero. Use a dash for missing data where the design system allows it, and explicit text where accessibility requires it. | EU Europa Component Library, Table usage (https://ec.europa.eu/component-library/eu/components/table/usage/); Signal Sciences Design, Tables (https://signalsciences.github.io/design/docs/product/tables/) | A |
| SAPUI5 shows an empty text value with an en dash as a localizable empty indicator; the empty control is hidden from screen readers so the cell is announced as empty. A dash marks absence, not a value. | SAPUI5 Accessibility Guide, "Improve Screen Reader Announcements" (https://sapui5.hana.ondemand.com/test-resources/sap/m/demokit/accessibilityGuide/webapp/topics/overview/applicationDeveloper/emptyDisplayControlReadings.html) | A |
| Public-sector table guidance forbids empty cells and directs writers to "no data" or "not applicable"; dashes can be misread by screen readers, so explicit text is preferred. | GOV.UK content design, Tables (https://www.gov.uk/guidance/content-design/tables); Bristol City Council style, Tables (https://www.bristol.gov.uk/bristol-style/a-to-z-of-style/a-to-z-of-style-item?id=99) | B |

Reading these together: the row's figure is known, recorded in the execution's own plan. A history row should show what was recorded at that event, and a real 0 is a value, not a marker for "moved to the next round". Option C would use an absence marker for a figure that is present, and option B discards it from the table.

## 5. Pick

**Option A.** A closed round row shows `plan.stayOnHoldQty` in the PO On Hold column. It reads 0 only when the execution took everything (FS only), where 0 is the true figure. This keeps the row internally consistent, keeps the recorded after-value visible, and follows the audit-view rule that history is read from the event, not recomputed.

**What would change it:** the owner reading the column as "on hold now" and preferring closed rows to carry no current-looking figure. Then option B (hide the cell) is the alternative; it is a page change only, and the sentence still states the remainder.

**[Proposed] call for the owner:** a closed round row's PO On Hold column shows the quantity that stayed on hold after that round (BL-318). Alternative: hide the column on closed rows. Ruling owner: Levi.

## 6. Findings, by severity, with confidence

| # | Severity | Finding | Confidence |
|---|---|---|---|
| 1 | Major | A closed round row shows 0 PCS in the PO On Hold column while its own sentence states a remainder above 0. Reproduced in code at `poOnHoldReadModel.js:404` and observed in the MR !135 browser check (VERIFY-135 D2). | High |
| 2 | Minor | PEX-8 had no display rule for a closed round row, so the build had no line to check against. The new BR-07 closes it. | High |
| 3 | Minor | A screen reader announces "0 PCS" in the column: a wrong value, not merely a blank. The same change removes it; no separate accessibility fix is needed. | Medium |
| 4 | Minor | The column header, "PO On Hold", can be read as "now" on a history row. BR-07 defines it as "after that round" for closed rows. | Medium |
| 5 | Informational | BL-317 (earlier rounds against the week's DA) is a separate fault and is not touched here. | High |

## 7. What was changed

- `src/services/data/mock/poOnHoldReadModel.js`: the closed row's `qty` is `e.plan.stayOnHoldQty`, with the typedef note.
- `src/services/data/mock/poOnHold.resuggest.test.js`: new test for a closed row after round 2 (180 of 300 stays).
- `src/pages-v2/poOnHold/PoOnHoldPanel.again.page.test.jsx`: asserts the closed row's cell reads 180.
- `docs/supplier-hub/SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md`: PEX-8 BR-07 and the build-status cell.
- This note.
