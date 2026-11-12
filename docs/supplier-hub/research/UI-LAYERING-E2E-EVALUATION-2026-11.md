# UI layering and end-to-end UI evaluation, 2026-11

| | |
|---|---|
| Version | 1.1, 2026-11-12 (open question 1 answered: portal rebuild). 1.0, 2026-11-12 |
| Commit under test | GitLab `main` at `a8eecbc7`, the commit live in prod. Built with `vite build`, served with `vite preview` |
| Personas | PTI (Material Planner menu) and supplier sup-007, PT Sample Packaging Indonesia. Hub clock pinned to 31 Aug 2026 |
| Method | Task-based end-to-end walk; geometry scan after the ReDeCheck layout failure classes (element collision, element protrusion, viewport protrusion; Walsh, Kapfhammer and McMinn, ISSTA 2017); WCAG 2.2 checks 1.4.13, 2.4.11, 1.4.10 |
| Companion files | `UI-E2E-TEST-SCENARIOS-2026-11.md` (the rerunnable scenario), `ui-overlap-scan.js` (the scan), `ui-layering-shots/` (evidence) |
| Not a source for | Formulas, figures and label wording (covered by `FORESIGHT-E2E-REVIEW-2026-11.md` and the term-labels spec) |

## 1. Verdict

**Capability:** every one of the 22 end-to-end steps works at all 4 screen sizes, but one step, Create ASN, can only be finished by guessing an unmarked required field (UL-05).

**Layering:** the overlap Levi saw is one shared tooltip, `TermTip`, failing 3 ways on every page that uses it. It does not wrap its text, it is cut off at the edge of scrolling grids, and it cannot be hovered or dismissed after a hover.

Reasons:
- 42 of 68 pages carry ⓘ tips (313 tips). 70 of the 306 tested were cut by a grid or the screen, on 25 pages. 9 tips on 2 pages ran their text out of the box, up to 1,291 px of text in a 254 px box (UL-01, UL-02).
- One component, `src/components/forecast/TermTip.jsx:141`, causes UL-01 to UL-04. One fix covers 46 page files.
- Outside the tooltip, the scan found 1 static overlap in 68 pages (Process Flows labels, UL-07). It found no horizontal page scroll at 390 px or 320 px, and no focus hidden under a sticky bar at 1440.
- Indonesian adds no new fault. The same tips fail with 5 to 10 % longer text.

## 2. Root causes

| # | Component and line | Property at fault | Findings | Pages affected | Recommended fix (alternative) |
|---|---|---|---|---|---|
| RC-1 | `components/forecast/TermTip.jsx:141`, inside label cells set `whitespace-nowrap` (`SupplierForecastCommitments/components/MaterialSection.jsx:16`, `PeriodSubmitSection.jsx:11`, `gridCells.jsx:24`) | The tip box sets a width (`w-64`) but not `white-space`, so it inherits `nowrap` from the cell it sits in | UL-01 | 2: `/supplier/forecasts`, `/buyer/stock-simulation` | Add `whitespace-normal break-words` to the tip span (or remove `nowrap` from every label cell, which is 3+ files and easy to reintroduce) |
| RC-2 | `TermTip.jsx:141` (`absolute left-0`), `TermTip.jsx:99` (`setAbove` only) | The tip is absolutely positioned inside the nearest scroll area, always anchored to the trigger's left edge, and its placement only flips up or down | UL-02, UL-04 | 25 for UL-02, 19 for UL-04 (section 4) | Render the tip in a portal with `position: fixed`, measured against the screen, flipping and shifting on both axes. Chosen by the owner, UL-Q1 (alternative not built: align right in place, which does not fix clipping by the scroll area) |
| RC-3 | `TermTip.jsx:141` (`pointer-events-none`), `:142` (`group-hover`), `:124` (Escape on the button only) | The tip closes as soon as the pointer leaves the trigger, and Escape works only when the button has keyboard focus | UL-03 | All 42 pages with tips | Drop `pointer-events-none` so the hover covers the tip, and listen for Escape on `document` while a tip is open |
| RC-4 | Pinned first columns sized for desktop: `MaterialSection.jsx:79` (grid without `scroll-ps`), `BuyerCommitments/components/ExceptionsSection.jsx:52-53` (2 `pin="left"` columns) | At 390 px the pinned columns take about 46 % of the scroll area, and the scroll area sets no `scroll-padding-inline-start`, so the browser scrolls a focused control under them | UL-06 | 2: `/supplier/forecasts`, `/buyer/collaboration` | Copy the pattern `WeekGrid.jsx:325` already uses (`scroll-ps-[140px] md:scroll-ps-[220px]`) and narrow the pinned column below `md` (alternative: unpin below `md`) |
| RC-5 | `SupplierShipments/utils.js:138-140`, `components/WizardDetailsStep.jsx:44-45`, `const.js:78` | The step rule requires a tracking number that the form does not mark, and the ship date defaults to a fixed date | UL-05 | 1: `/supplier/shipments?tab=create` | Mark the field required and say on the disabled **Next** what is missing; default the ship date to the hub's today |

## 3. Findings

Sorted by severity, then confidence. Severity: Blocker (a step cannot be finished, or is finished on an unreadable value), Major (done with a detour or guess, or a WCAG 2.2 AA failure), Minor (friction, or a defect at 768 or 390 only), Polish (blocks nothing).

### Major

- **UL-01** · Major · high · Text overflow · Supplier and PTI · `/supplier/forecasts`, `/buyer/stock-simulation` · 1440, 1280, 768, 390, EN and ID
  - Evidence: [UL-01-1440.png](ui-layering-shots/UL-01-1440.png). Scan: "Commitment due" tip `scrollWidth 759, clientWidth 254`; "Zone" 1,291 / 254 (ID 1,362); 9 tips in all.
  - Problem: the tip's sentence runs past its own box and across 2 to 5 week columns, over "Fulfil by" and "Late by 10 h". Neither the tip nor the row under it can be read.
  - Root cause: RC-1. Recommendation: BL-300.

- **UL-02** · Major · high · Clipping and protrusion · both · 25 pages (section 4) · all sizes
  - Evidence: [UL-02-1440.png](ui-layering-shots/UL-02-1440.png), Safety stock targets, "Max Stock" tip 49 % cut (124 px) at the grid's right edge. The scan, with each trigger scrolled to the edge of its grid, reported 70 of 306 tips cut, the worst being Publish to suppliers "Zone Capacity" (84 %), supplier "Ordered quantity" (74 %) and "ROP Fisik" (69 %).
  - Problem: a definition near the right of a grid is cut mid-sentence; the user has to scroll the grid and reopen the tip.
  - Root cause: RC-2. Recommendation: BL-301.

- **UL-03** · Major · high · Hover and focus behaviour (WCAG 1.4.13) · both · all 42 pages with tips
  - Evidence: [UL-03-1440-a-hover-trigger.png](ui-layering-shots/UL-03-1440-a-hover-trigger.png), then [UL-03-1440-b-pointer-on-tip.png](ui-layering-shots/UL-03-1440-b-pointer-on-tip.png): the tip closed when the pointer moved onto it. A tip opened by hover stayed open after Escape (open tips after Escape: 1).
  - Problem: fails "hoverable" and "dismissible" for pointer users; a screen-magnifier user cannot pan over a long definition. The October fix (`FORECAST-UX-ACCESSIBILITY-2026-10.md` item 2) covered the keyboard path only.
  - Root cause: RC-3. Recommendation: BL-302.

- **UL-05** · Major · high · Capability · Supplier · `/supplier/shipments?tab=create` (Create ASN, step 2) · all sizes
  - Evidence: [UL-05-1440.png](ui-layering-shots/UL-05-1440.png). Carrier, Ship date and Estimated arrival carry *, "Tracking or vehicle number" does not, and **Next** stayed disabled with every other field filled (`nextDisabled: true`). It enabled only after a tracking number was typed. The ship date opens on 07 Apr 2026, 5 months before the hub's today.
  - Problem: the supplier cannot tell why the ASN will not advance, and an unchanged default ships a date in the past.
  - Root cause: RC-5. Recommendation: BL-303.

### Minor

- **UL-04** · Minor · medium · Collision · both · 19 pages · all sizes
  - Evidence: scan, 32 tips covering a control of the next row, for example supplier Capacity "LTP, current forecast" → `input "Allocated capacity for the week of 31 Aug 2026"` and the "Copy W36 to all weeks" button; Foresight commitments "Commitment (PCS)" → `input "Upside quantity…"`.
  - Problem: while a tip is open the field below it is hidden. Clicks pass through (`pointer-events-none`), so nothing is blocked, but the user loses sight of what they are about to fill.
  - Root cause: RC-2. Recommendation: BL-301 (prefer the side with room and not the input row).

- **UL-06** · Minor · high · Focus obscured · Supplier and PTI · `/supplier/forecasts`, `/buyer/collaboration` · 390 only
  - Evidence: [UL-06-390.png](ui-layering-shots/UL-06-390.png). With keyboard focus, the commitment field for the week of 07 Sept was 45 % under the pinned "Commitment (PCS)" label, value hidden; PTI's **Accept** was 27 % under the pinned Supplier column. At 768 and 1280: 0 %.
  - Problem: on a phone the typed number is hidden while typing. WCAG 2.4.11 AA still passes (partly visible).
  - Root cause: RC-4. Recommendation: BL-304.

- **UL-07** · Minor · high · Collision · PTI · `/buyer/process-flows` · 1440, EN and ID
  - Evidence: [UL-07-1440.png](ui-layering-shots/UL-07-1440.png); scan `span "adjust" X span "partial_deliver" share 0.73`.
  - Problem: on the purchase order diagram the transition labels (confirm, deliver, adjust, reject, partial_deliver) stack on each other and connector lines run through them. The one fixed offset (`process-flows/flowLayout.js:396-403`, written for "deli close") does not cover this pair.
  - Root cause: no general label collision step in `flowLayout.js`. Recommendation: BL-305.

### Polish

- **UL-08** · Polish · high · Density and redundancy · Supplier · `/supplier/forecasts` · all sizes
  - Evidence: [UL-01-1440.png](ui-layering-shots/UL-01-1440.png), "Zone ⓘ ⓘ ⓘ"; `MaterialSection.jsx:90-91` puts the Zone, Zone Liability and Zone Capacity tips on one label.
  - Problem: 3 identical icons with no visible difference; the user has to open each to find the one they need.
  - Recommendation: BL-306, move the Zone Liability and Zone Capacity tips onto the zone chips in each week. Labels unchanged.

- **UL-09** · Polish · medium · Alignment · Supplier · `/supplier/forecasts` · all sizes
  - Evidence: [UL-01-1440.png](ui-layering-shots/UL-01-1440.png); `gridCells.jsx:40` sets `text-right` on the forecast cell while every other row in the grid starts at the left.
  - Problem: "20,100 ⓘ" sits at the right edge of its column, next to the following week, so it reads as that week's number. This is one of the 4 issues in Levi's screenshot.
  - Recommendation: BL-307, align the forecast row like the rows under it.

- **UL-10** · Polish · high · Text · Supplier · `/supplier/inventory`, Enter stock panel · all sizes
  - Evidence: [UL-10-1440.png](ui-layering-shots/UL-10-1440.png): "STOCK ON HAND ()", "SUPPLIER REORDER POINT ()", "IN PRODUCTION ()" before a material is chosen; `lib/i18n/inventoryCapacity.js:297` `'Stock on hand ({{uom}})'`.
  - Problem: empty brackets read as a rendering fault.
  - Recommendation: BL-308, omit the bracket until the unit is known.

## 4. Coverage ledger

Every page in the derived list: the PTI menu (`PTI_NAV`), the supplier menu (`SUPPLIER_NAV`) and the user menu and admin pages (`UTILITY_NAV`) in `src/components/layout-v2/navConfig.js`, plus row-opened pages walked in the scenario. All pages were scanned at 1440×900 in English and Indonesian, with nothing open and with every ⓘ tip opened by keyboard focus (one per distinct label, up to 30). Horizontal page scroll was checked on every page at 320×700: none. "Tips" is tested of present; "Overflow / cut" counts tips with text overflow and tips cut by a scroll area or the screen.

| Route | Persona | Page | Scanned | Tips | Overflow / cut | Findings |
|---|---|---|---|---|---|---|
| `/buyer/admin/3pl-tracking` | PTI | 3PL tracking links | 1440 EN, 1440 ID | 1 of 1 | 0 / 0 | UL-03 |
| `/buyer/admin/alert-thresholds` | PTI | Alert thresholds and stale periods | 1440 EN, 1440 ID | 4 of 4 | 0 / 0 | UL-03, UL-04 |
| `/buyer/admin/master-data-fields` | PTI | Master data fields | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/admin/mrp-controllers` | PTI | MRP controllers (PIC) | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/admin/planning-groups` | PTI | Planning groups | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/admin/qualification` | PTI | Vendor qualification | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/admin/reason-codes` | PTI | Reason codes | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/admin/sourcing-types` | PTI | Sourcing types | 1440 EN, 1440 ID | 1 of 1 | 0 / 0 | UL-03, UL-04 |
| `/buyer/admin/suppliers` | PTI | Suppliers | 1440 EN, 1440 ID | 1 of 1 | 0 / 0 | UL-03 |
| `/buyer/admin/tolerances` | PTI | Tolerances and rule values | 1440 EN, 1440 ID | 2 of 2 | 0 / 1 | UL-02, UL-03, UL-04 |
| `/buyer/admin/working-calendar` | PTI | Working calendar | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/alerts` | PTI | Alerts | 1440 EN, 1440 ID; scenario F3 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/buyer/call-offs` | PTI | Call-offs | 1440 EN, 1440 ID; scenario C1 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/buyer/capacity` | PTI | Capacity | 1440 EN, 1440 ID; scenario D4 at 4 sizes | 13 of 13 | 0 / 3 | UL-02, UL-03 |
| `/buyer/collaboration` | PTI | Foresight commitments | 1440 EN, 1440 ID; scenario A7 at 4 sizes | 8 of 8 | 0 / 3 | UL-02, UL-03, UL-04, UL-06 |
| `/buyer/comm-hub` | PTI | Supplier follow-ups | 1440 EN, 1440 ID; scenario F2 | 0 of 0 | 0 / 0 | clean |
| `/buyer/compliance` | PTI | Supplier documents | 1440 EN, 1440 ID | 7 of 7 | 0 / 2 | UL-02, UL-03, UL-04 |
| `/buyer/data-health` | PTI | Data health | 1440 EN, 1440 ID | 7 of 7 | 0 / 0 | UL-03 |
| `/buyer/demand-anticipation` | PTI | Demand anticipation (DA) | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/demand-anticipation-history` | PTI | Demand anticipation (DA) history | 1440 EN, 1440 ID | 10 of 10 | 0 / 3 | UL-02, UL-03, UL-04 |
| `/buyer/demand-forecast` | PTI | Forecast quality | 1440 EN, 1440 ID | 24 of 24 | 0 / 2 | UL-02, UL-03 |
| `/buyer/fs-reconcile` | PTI | Feedstock reconcile | 1440 EN, 1440 ID | 5 of 5 | 0 / 1 | UL-02, UL-03, UL-04 |
| `/buyer/goods-receipt` | PTI | Goods receipts | 1440 EN, 1440 ID; scenario B4 at 4 sizes | 5 of 5 | 0 / 0 | UL-03 |
| `/buyer/home` | PTI | My tasks | 1440 EN, 1440 ID; scenario F2 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/buyer/interface-monitor` | PTI | Interface monitor | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/inventory` | PTI | Stock | 1440 EN, 1440 ID | 4 of 4 | 0 / 0 | UL-03 |
| `/buyer/invoices` | PTI | Invoices | 1440 EN, 1440 ID | 5 of 5 | 0 / 0 | UL-03 |
| `/buyer/material-requirement` | PTI | Material requirement | 1440 EN, 1440 ID | 15 of 15 | 0 / 3 | UL-02, UL-03, UL-04 |
| `/buyer/materials/trade-names` | PTI | Trade names | 1440 EN, 1440 ID | 1 of 1 | 0 / 0 | UL-03, UL-04 |
| `/buyer/model-backtest` | PTI | Model backtest | 1440 EN, 1440 ID | 23 of 23 | 0 / 4 | UL-02, UL-03 |
| `/buyer/order-plan` | PTI | What to order | 1440 EN, 1440 ID; scenario A2 at 4 sizes | 9 of 9 | 0 / 1 | UL-02, UL-03, UL-04 |
| `/buyer/orders` | PTI | Purchase orders | 1440 EN, 1440 ID | 6 of 6 | 0 / 2 | UL-02, UL-03 |
| `/buyer/plan-trace` | PTI | Plan vs execution | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/process-flows` | PTI | Process Flows | 1440 EN, 1440 ID | 1 of 1 | 0 / 0 | UL-03, UL-07 |
| `/buyer/purchase-requisition` | PTI | Requisitions | 1440 EN, 1440 ID | 6 of 6 | 0 / 2 | UL-02, UL-03 |
| `/buyer/reliability` | PTI | Supplier reliability | 1440 EN, 1440 ID | 9 of 9 | 0 / 3 | UL-02, UL-03, UL-04 |
| `/buyer/reschedule` | PTI | Make warehouse room | 1440 EN, 1440 ID | 8 of 8 | 0 / 2 | UL-02, UL-03 |
| `/buyer/rfi` | PTI | RFI · Information requests | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/rfp` | PTI | RFP · Proposal requests | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/rfq` | PTI | RFQ · Quotation requests | 1440 EN, 1440 ID; scenario E1 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/buyer/rfq/rfq-003?section=award` | PTI | RFQ-2026-003 award | scenario E3 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/buyer/roles` | PTI | Roles | 1440 EN, 1440 ID | 1 of 1 | 0 / 0 | UL-03 |
| `/buyer/safety-stock` | PTI | Safety stock targets | 1440 EN, 1440 ID | 17 of 17 | 0 / 8 | UL-02, UL-03 |
| `/buyer/scorecard` | PTI | Supplier performance | 1440 EN, 1440 ID | 4 of 4 | 0 / 0 | UL-03 |
| `/buyer/shipments` | PTI | Shipments & ASN | 1440 EN, 1440 ID | 4 of 4 | 0 / 0 | UL-03 |
| `/buyer/stabilise` | PTI | Publish to suppliers | 1440 EN, 1440 ID; scenario A4 at 4 sizes | 17 of 17 | 0 / 1 | UL-02, UL-03, UL-04 |
| `/buyer/stock-simulation` | PTI | Stock simulation | 1440 EN, 1440 ID; scenario D3 at 4 sizes | 6 of 6 | 1 / 5 | UL-01, UL-02, UL-03, UL-04 |
| `/buyer/supplier-access` | PTI | Supplier access | 1440 EN, 1440 ID | 1 of 1 | 0 / 0 | UL-03 |
| `/buyer/suppliers` | PTI | Suppliers | 1440 EN, 1440 ID | 4 of 4 | 0 / 0 | UL-03 |
| `/buyer/this-week` | PTI | This week | 1440 EN, 1440 ID; scenario A1 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/buyer/what-if` | PTI | What-if sandbox, no material chosen | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/buyer/what-if?material=PK-PETB-8804&supplier=sup-012` | PTI | What-if sandbox, from a row | scenario A3 at 4 sizes | 21 of 21 | 0 / 2 | UL-02, UL-03, UL-04 |
| `/glossary` | both | Glossary | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/supplier/call-offs` | Supplier | Call-offs | 1440 EN, 1440 ID; scenario C2 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/supplier/capacity` | Supplier | Capacity | 1440 EN, 1440 ID; scenario D2 at 4 sizes | 5 of 5 | 0 / 1 | UL-02, UL-03, UL-04 |
| `/supplier/demand-anticipation` | Supplier | Demand anticipation (DA) | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/supplier/documents` | Supplier | Profile & documents | 1440 EN, 1440 ID | 4 of 4 | 0 / 1 | UL-02, UL-03 |
| `/supplier/forecasts` | Supplier | Foresight commitments | 1440 EN, 1440 ID; scenarios A5, A6 at 4 sizes | 30 of 37 | 8 / 16 | UL-01, UL-02, UL-03, UL-04, UL-06, UL-08, UL-09 |
| `/supplier/forecasts?tab=responses` | Supplier | Foresight commitments, responses | 1440 EN | 0 of 0 | 0 / 0 | clean |
| `/supplier/fs-reconcile` | Supplier | Feedstock reconcile | 1440 EN, 1440 ID | 5 of 5 | 0 / 1 | UL-02, UL-03, UL-04 |
| `/supplier/goods-receipts` | Supplier | Goods receipts | 1440 EN, 1440 ID | 5 of 5 | 0 / 1 | UL-02, UL-03, UL-04 |
| `/supplier/home` | Supplier | To do | 1440 EN, 1440 ID; scenario F1 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/supplier/inventory` | Supplier | Stock | 1440 EN, 1440 ID; scenario D1 at 4 sizes | 6 of 6 | 0 / 2 | UL-02, UL-03, UL-04, UL-10 |
| `/supplier/invoices` | Supplier | Invoices | 1440 EN, 1440 ID | 4 of 4 | 0 / 0 | UL-03 |
| `/supplier/orders` | Supplier | Purchase orders | 1440 EN, 1440 ID; scenario B1 at 4 sizes | 6 of 6 | 0 / 1 | UL-02, UL-03 |
| `/supplier/performance` | Supplier | My performance | 1440 EN, 1440 ID | 7 of 7 | 0 / 0 | UL-03 |
| `/supplier/rfi` | Supplier | RFI · Information requests | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/supplier/rfp` | Supplier | RFP · Proposal requests | 1440 EN, 1440 ID | 0 of 0 | 0 / 0 | clean |
| `/supplier/rfq` | Supplier | RFQ · Quotation requests | 1440 EN, 1440 ID; scenario E2 at 4 sizes | 0 of 0 | 0 / 0 | clean |
| `/supplier/shipments` | Supplier | Shipments & ASN | 1440 EN, 1440 ID; scenario B3 at 4 sizes | 5 of 5 | 0 / 1 | UL-02, UL-03, UL-04, UL-05 |

Also checked: the header menus (Language, Notifications, identity panel), the Why this quantity panel, the Accept, PO, GR, RFQ and quotation panels and the forecast submit dialog. Each opens on screen and closes with Escape. Keyboard focus was walked through every control on What to order, Safety stock targets, PTI Capacity and Publish to suppliers at 1440 (320 controls): none was hidden under the sticky top bar (WCAG 2.4.11).

What the scan cannot see: paint order is judged at the centre of each overlap, so a 1 to 2 px sliver can be missed; charts drawn on canvas are not inspected; tips beyond the first 30 distinct labels on a page were not opened (7 on `/supplier/forecasts`, all week-specific copies of a tested label).

## 5. Dropped

Removed in the adversarial pass, with the reason:
- Static collisions on supplier Capacity ("BE = capacity + additional" × "· PCS"), DA history ("· KG"), This week ("Version 2" × date) and PTI Feedstock reconcile (hold status): the first scan compared bounding boxes, and a label that wraps has one wide box. With line boxes (`getClientRects`) none remains, and the screenshot of Capacity shows no overlap.
- RFQ-2026-003 page: header search, language and bell "overlapping" document rows. The rows were scrolled out of view inside `main`. With the scroll area's clip applied, 0 remain.
- 768 px: the commitment input "covered" by its pinned label. That came from the scan's own `scrollIntoView`. With real keyboard focus the browser scrolls it fully clear: 0 % hidden on 4 weeks tested.
- 390 px: **Award the event** "off screen". The button is disabled, so it cannot take focus. Scrolled into view it is on screen and nothing covers it.
- The Accept and quotation panels reported at x = 1440 (off screen): mid-way through the slide-in animation. 1.5 s later both were at x = 960.
- Sticky table headers and cells reported "off screen" or "clipped": columns scrolled out of their grid, which is what a sideways grid does.
- The last week column cut at the card edge (Levi's screenshot): the grid scrolls sideways with a visible scrollbar, and the card says "scroll sideways for later weeks and months".
- The "No supplier identity in session" page when a supplier URL opens under the PTI persona: intended behaviour (`identitySources.js:120-126`), not layering.
- Toast "cmd_000i recorded. Procurement notification pending live channel." after PO confirm and ASN submit: wording, out of scope. Moved to open questions.

## 6. Open questions for Levi

1. **Answered [Owner, 2026-11-12, UL-Q1]: portal rebuild.** `TermTip` is rebuilt on a portal with fixed positioning (fixes UL-02 and UL-04 on 25 pages, M); the in-place patch (align right at the edge, still cut by scroll areas, S) is not built. BL-301 carries the ruling.
2. Is a phone in scope for suppliers? If not, UL-06 drops to Polish and BL-304 can wait.
3. ASN tracking number: should it be required when the ASN is created, before the carrier has picked up? BL-303 marks it as required, matching today's code. Making it optional is a rule change.
4. The "cmd_000i recorded… pending live channel" toast shows an internal command id to users. Reword or hide it? It is a wording question, outside this review.
