# UI layering wave 2: decisions taken without the owner, 2026-11-12

| | |
|---|---|
| Version | 1.1, 2026-11-13 (owner accepted WD-1 to WD-10, section 3). Previous: 1.0, 2026-11-12 |
| Branch | `feat/ui-layering-wave2` (GitLab MR !132, merged 2026-11-13 as `36655c4f`, live in prod as Vercel deployment `-8nhxib2fu`), branched from MR !129's head; !129 merged to `main` at 22:24 WIB (`36ae2939`) and `main` is merged into this branch |
| Why this file exists | Levi was away and asked for the remaining review work to be built, with an educated guess wherever a confirmation was needed, and each guess logged. Every row below was reversible before the merge; section 3 records the owner's ruling |
| Source of the work | `UI-LAYERING-E2E-EVALUATION-2026-11.md` findings UL-04 to UL-10, backlog BL-303 to BL-311 |

## 1. Decisions

| # | Decision | Taken | Alternative kept | Why this way | Where |
|---|---|---|---|---|---|
| WD-1 | Phones are in scope for suppliers (review open question 2) | Built BL-304 for 390 px | Treat phones as out of scope and drop BL-304 to Polish | Suppliers are external and will open the hub on whatever device they have; the fix is narrow, and at 1440 px PTI's pinned columns stay pinned as before (checked in the browser) | `pinnedColumn.js`, `Table.jsx`, `MaterialSection.jsx` |
| WD-2 | The ASN tracking number stays required (review open question 3) | Marked it with * (drawn by CSS, as "Carrier *" reads), `aria-required`, and a line under the form names every missing field | Make it optional at creation and required at dispatch | Today's code requires it (`utils.js` step rule); changing a rule is a ruling, marking a rule is not | `WizardDetailsStep.jsx`, `utils.js` `missingLogistics` |
| WD-3 | The ASN ship date opens on the hub's today (`DECLARED_PRESENT`, 31 Aug 2026) | Default changed from the fixed 2026-04-07 | Leave it empty and force a choice | Every other date default in the hub reads the declared present; an empty date would add one more blocked field | `SupplierShipments/const.js` |
| WD-4 | Pinned table columns let go when they would take more than half the scroll area | Portal-wide, in the shared `placePinnedColumns`; they pin again when the area widens | Unpin only on PTI Foresight commitments; or narrow the Supplier column there | At 390 px PTI's # and Supplier columns were 299 of 358 px, so no padding could leave room; a per-page fix would leave every other pinned table with the same trap | `components/ui-v2/pinnedColumn.js` `PIN_SHARE_MAX = 0.5` |
| WD-5 | Every pinned table pads its scroll area by the pinned width | Portal-wide, measured in `placePinnedColumns` | Per-page `scroll-ps-*` classes, as `WeekGrid` does | The widths are already measured there; a class needs a fixed width the table does not have | `pinnedColumn.js` |
| WD-6 | The forecast figure in the supplier grid is left-aligned | Like every other row and its week header | Right-align every numeric row (inputs included), the usual table rule for numbers | The grid is transposed (one column per week), so the eye reads down a column, not along a row of digits; the defect was the figure reading as the next week's | `gridCells.jsx` |
| WD-7 | The Zone Liability and Zone Capacity ⓘ sit on each week's zone chip | One ⓘ stays on the "Zone" label | Keep the 3 icons and add the zone name beside each | The chip is the thing the definition explains; the label text and the glossary entries are unchanged (TL-R1 BR-03) | `forecasts/forecastDisplay.jsx` `ZonePill withTip` |
| WD-8 | Process Flows labels slide along their own edge to clear each other and the state boxes | 8 to 11 spots along the edge, then 6 small steps beside it; if a label has no free spot, the label it lands on moves instead | Draw the diagram with a graph-layout library | The layout is hand-rolled and tested (`flowLayout.test.js`); a library swap is a bigger change than the defect | `process-flows/flowLayout.js` `separateLabels` |
| WD-9 | A term tip opens on the side of its label (below, above, right, left) that covers fewest controls; the default rule on a tie | Counted on every opening | A fixed side | Measured on the 26 pages with tips (272 tips): below-first covered a control with 33 tips on 15 pages, above-first with 39; choosing per opening, 15 tips on 7 pages; adding right and left (BL-311), 11 tips on 5 pages, all inside rows of clickable stat cards where every side is a control | `components/forecast/TermTip.jsx` `coveredControls` |
| WD-10 | The "cmd_000i recorded… pending live channel" toast is not changed | Logged as BL-310 for the owner | Hide the command id in the toast | It is wording and not part of the layering review; the internal id may be wanted for support | `BACKLOG.md` BL-310 |

## 2. What would change if the owner disagrees

| If the owner rules | Change |
|---|---|
| WD-1: phones out of scope | Revert the `PIN_SHARE_MAX` branch in `pinnedColumn.js` and the `md:` variants in `MaterialSection.jsx`; the desktop behaviour is identical either way |
| WD-2: tracking optional at creation | Drop `tracking` from `missingLogistics` and the * from the label; the hint keeps working for the other fields |
| WD-6: numbers right-aligned | Restore `text-right` on the forecast cell and add it to the commitment and upside inputs, so the whole column aligns |
| WD-7: icons back on the label | Remove `withTip` from the two columns and restore the two `TermTip`s on the label |

## 3. Owner ruling

| | |
|---|---|
| Ruled | 2026-11-13, by Levi, in the build session: "go for WD-1 to WD-10" |
| Result | WD-1 to WD-9 accepted as built; no change to the code in `36655c4f` |
| WD-10 | Accepted. BL-310 then ruled the same day: drop the id line (option A); built in the same MR, BL-310 closed |
| Section 2 | Kept for reference only; no reversal is planned |
