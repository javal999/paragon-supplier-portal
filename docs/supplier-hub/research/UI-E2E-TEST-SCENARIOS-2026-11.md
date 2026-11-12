# UI end-to-end test scenarios: capability and layering

| | |
|---|---|
| Version | 1.0, 2026-11-12. First run on GitLab `main` at `a8eecbc7` (the commit live in prod) |
| What this is | A script a tester can rerun after each fix: 22 steps in 6 flows across both personas, each with a capability result and a layering result at 4 screen sizes |
| Findings | The UL-nn ids in the result cells are defined in `UI-LAYERING-E2E-EVALUATION-2026-11.md` in this folder |
| Scan | `ui-overlap-scan.js` in this folder |

## 1. Setup

1. From `paragon-supplier-portal`, create a worktree on the commit under test, then install and build on Node 24 (the machine default Node 26 breaks the build):

   ```bash
   git fetch gitlab && git worktree add .claude/worktrees/ui-test gitlab/main
   ```

   ```bash
   cd .claude/worktrees/ui-test && npx -y -p node@24 -p npm@10 npm ci && npx -y -p node@24 -- sh -c 'npx vite build'
   ```

2. Copy the scan next to the build so the page can fetch it, then serve the build:

   ```bash
   cp docs/supplier-hub/research/ui-overlap-scan.js dist/ && npx -y -p node@24 -- sh -c 'npx vite preview --port 5395 --strictPort'
   ```

3. Open `http://localhost:5395/#/buyer/home`. The 4 screen sizes are 1440×900, 1280×720, 768×1024 and 390×844 (browser device toolbar, or the built-in browser's viewport setting).
4. Persona: the **PTI** / **Supplier** toggle at the top of the sidebar. At 390 px the sidebar sits behind the menu button. The supplier persona is sup-007, PT Sample Packaging Indonesia. A supplier route opened while the PTI persona is active shows "No supplier identity in session": switch with the toggle, not the URL.
5. Language: the **EN** menu in the top bar. It is stored in `localStorage` under `paragon.lang`.
6. Run the scan in the browser console:

   ```js
   eval(await (await fetch('/ui-overlap-scan.js')).text());   // defines the scan and runs it once
   uiOverlapScan();                                          // the page as it is now
   await uiOverlapScanTips({ max: 30 });                     // opens each ⓘ tip by focus, lists the faulty ones
   ```

7. Sample data lives in memory and resets on reload. Run each flow in one tab without reloading, or the hand-off data disappears.

## 2. Scenarios

**How to read a result cell.** "pass" means the step's capability worked and the scan flagged nothing on that screen. Otherwise the cell names the finding ids seen on that screen. UL-03 (tooltips cannot be hovered or dismissed by Escape after a hover) applies to every screen with ⓘ tips and is not repeated in the cells.

**Capability.** At 1440 the action was performed and the result read on the next screen. At 1280, 768 and 390 the step's main control was given keyboard focus (or scrolled into view when it cannot take focus) and hit-tested: it is on screen and nothing paints over it. The action itself was not repeated at those sizes.

**Layering pass rule, every step.** With nothing open, the scan reports no static collision and no horizontal page scroll. With each ⓘ tip open in turn, `uiOverlapScanTips` returns no tip that is cut (`clipped`, `offScreen`) or overflows its box (`textOverflow`). An open panel or dialog is fully on screen and closes with Escape.

### Flow A. Weekly plan and Foresight commitments (PTI → supplier → PTI)

| Step | Persona | Route | Action | Expected capability result | Layers to open | 1440 | 1280 | 768 | 390 |
|---|---|---|---|---|---|---|---|---|---|
| A1 | PTI | `/buyer/this-week` | Read the step cards; click **Open What to order** | What to order opens | none | pass | pass | pass | pass |
| A2 | PTI | `/buyer/order-plan` | Click **Why this quantity** on the first row | Panel shows gross to net requirement, safety stock and order sizing for that row; focus moves to its heading below the top bar | Why this quantity panel, 9 ⓘ tips | UL-02, UL-04 | UL-02, UL-04 | UL-02 | UL-02 |
| A3 | PTI | `/buyer/what-if?material=PK-PETB-8804&supplier=sup-012` (the **Try a what-if** link on the same row) | Open the sandbox from the row | The supplier and material picker shows PK-PETB-8804 · sup-012 | 21 ⓘ tips | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 |
| A4 | PTI | `/buyer/stabilise` | Try to publish | Refused with the reason on screen ("Nothing can be published until real data arrives…"), status Blocked | 17 ⓘ tips | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 | UL-02 |
| A5 | Supplier | `/supplier/forecasts` | Material 2000028400, week of 31 Aug: commitment 15000 (forecast 20,100), reason **Capacity**, **Save draft** | "Reason below forecast" appears when the number drops below the forecast; status "Draft saved (not visible to PTI)" | 37 ⓘ tips (30 tested, one per label) | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04, UL-06 |
| A6 | Supplier | same | **Submit all** for the week of 31 Aug → confirm dialog → **Submit all** | Toast "Commitments submitted: 2"; status Submitted, Outside tolerance | confirm dialog | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04 |
| A7 | PTI | `/buyer/collaboration` | Find 2000028400 · week of 31 Aug; click **Accept** | Row shows forecast 20,100, commitment 15,000, −25.4 %, Outside tolerance; the Accept panel opens and closes with Escape | Accept panel, 8 ⓘ tips | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04, UL-06 |

### Flow B. Purchase order to goods receipt (supplier → PTI)

| Step | Persona | Route | Action | Expected capability result | Layers to open | 1440 | 1280 | 768 | 390 |
|---|---|---|---|---|---|---|---|---|---|
| B1 | Supplier | `/supplier/orders` | Open PO-2026-00121; **Acknowledge receipt**, then **Confirm order** twice (opens the form, then confirms) | Status Sent → Acknowledged → Confirmed; toast "PO-2026-00121 confirmed" | PO panel, 6 ⓘ tips | UL-02 | UL-02 | UL-02 | UL-02 |
| B3 | Supplier | `/supplier/shipments?tab=create&po=po-021` (**Create ASN now** on the confirmed PO) | Step 2: ship date, estimated arrival, batch, expiry, tracking number; **Next**, tick the confirmation, **Submit ASN** | ASN-2026-901 submitted; Submitted count goes from 0 to 1 | 5 ⓘ tips | UL-02, UL-04, UL-05 | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 |
| B4 | PTI | `/buyer/goods-receipt` | **New GR** | ASN-2026-901 for PO-2026-00121 is listed under "Select inbound at dock"; the wizard closes with Escape. GR not posted in this run | GR wizard, 5 ⓘ tips | pass | UL-02 | UL-02 | UL-02 |

### Flow C. Call-offs (PTI → supplier)

| Step | Persona | Route | Action | Expected capability result | Layers to open | 1440 | 1280 | 768 | 390 |
|---|---|---|---|---|---|---|---|---|---|
| C1 | PTI | `/buyer/call-offs` | **New call-off** on a blanket line, quantity 1000, need date 21 Sept 2026, **Release to supplier** | Toast "Call-off released to the supplier". PO-2025-00117 belongs to another supplier, so sup-007 does not see this one | New call-off panel | pass | pass | pass | pass |
| C2 | Supplier | `/supplier/call-offs` | **Respond** on CO-2026-0003 → **Confirm as requested** → **Send confirmation**; then **Send dispatch notice** with PIC, shipped 01 Sept, arrival 03 Sept, quantity 1000 | Toasts "CO-2026-0003 confirmed" and "Dispatch notice sent for CO-2026-0003" | respond and dispatch forms | pass | pass | pass | pass |

### Flow D. Stock and capacity (supplier → PTI)

| Step | Persona | Route | Action | Expected capability result | Layers to open | 1440 | 1280 | 768 | 390 |
|---|---|---|---|---|---|---|---|---|---|
| D1 | Supplier | `/supplier/inventory` | **Enter stock on screen**: PK-PETB-8802, stock on hand 30000, in production 0, **Save stock** | Toast "Stock saved". In transit shows 80,000 from ASN-2026-901 (B3) | Enter stock panel, 6 ⓘ tips | UL-02, UL-04, UL-10 | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 |
| D2 | Supplier | `/supplier/capacity` | **Submit capacity** | Toast "Capacity submitted" | 5 ⓘ tips | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 | UL-02, UL-04 |
| D3 | PTI | `/buyer/stock-simulation` | Find PK-PETB-8802 · PT Sample Packaging Indonesia | Supplier stock 30,000 PCS (D1) | 6 ⓘ tips | UL-01, UL-02 | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04 | UL-01, UL-02, UL-04 |
| D4 | PTI | `/buyer/capacity` | Find Rigid plastic packaging · PT Sample Packaging Indonesia | "Last submitted 31 Aug 2026, 19:00 WIB"; Cannot be supplied: 1 week; PTI's decision pending | 13 ⓘ tips | UL-02, UL-04 | UL-02 | UL-02 | UL-02, UL-04 |

### Flow E. Sourcing (PTI → supplier → PTI)

| Step | Persona | Route | Action | Expected capability result | Layers to open | 1440 | 1280 | 768 | 390 |
|---|---|---|---|---|---|---|---|---|---|
| E1 | PTI | `/buyer/rfq` | **New RFQ** | The 8-step wizard opens on Scope and closes with Escape. Not completed in this run | RFQ wizard | pass | pass | pass | pass |
| E2 | Supplier | `/supplier/rfq` | RFQ-2026-010: **I will respond**, then **Submit quote** | Toast "The buyer now sees that you will respond."; the quotation panel opens with unit price, lead time, validity and MOQ. Not submitted in this run | quotation panel | pass | pass | pass | pass |
| E3 | PTI | `/buyer/rfq/rfq-003?section=award` | **Award RFQ** on a Pending Award event | The award section opens; **Award the event** stays disabled until a supplier is chosen | award section | pass | pass | pass | pass |

### Flow F. Home tasks and alerts

| Step | Persona | Route | Action | Expected capability result | Layers to open | 1440 | 1280 | 768 | 390 |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Supplier | `/supplier/home` | First To do link, **Confirm capacity** | Capacity opens | none | pass | pass | pass | pass |
| F2 | PTI | `/buyer/home` | First task, "Suppliers to follow up…", **Open** | Supplier follow-ups opens on the follow-up tab | none | pass | pass | pass | pass |
| F3 | PTI | `/buyer/alerts` | **Open Foresight commitments** on a PT Sample Packaging Indonesia alert | Foresight commitments opens, filtered to 2000028400 · sup-007 | none | pass | pass | pass | pass |

**Capability summary.** All 22 steps completed or reached their control at every size. The one capability defect is UL-05: on B3 the **Next** button stays disabled with no message until the unmarked tracking number field is filled.

## 3. Regression checklist

Run on any new or changed page, at 1440×900 and 390×844. Each check is pass or fail.

| # | Check | How | Root cause it guards |
|---|---|---|---|
| R1 | No ⓘ tip text runs out of its box | `uiOverlapScanTips()` returns no entry with `textOverflow` | RC-1, TermTip inherits `white-space: nowrap` (UL-01) |
| R2 | No ⓘ tip is cut by a scroll area or the screen | No entry with `clipped` or `offScreen`. Scroll each sideways grid to its right end and run again | RC-2, TermTip positioned inside the scroll area, flips only up and down (UL-02, UL-04) |
| R3 | A tip stays open while the pointer moves onto it, and Escape closes a tip opened by hover | Hover the ⓘ, move onto the tip text, press Escape | RC-3, `pointer-events-none` and a button-only Escape handler (UL-03) |
| R4 | A focused field or button in a grid with a pinned first column is fully visible at 390 px | Tab into the grid; `uiOverlapScan().focus.hiddenShare` is 0 | RC-4, pinned columns sized for desktop, no `scroll-padding-inline-start` (UL-06) |
| R5 | Every field that blocks **Next** or **Save** is marked required, and the disabled button says what is missing | Leave each field empty in turn | RC-5, required-field rule not shown on screen (UL-05) |
| R6 | No static collision and no horizontal page scroll at 320 px | `uiOverlapScan()` with nothing open: `staticCollisions` empty, `pageHScroll` 0 | WCAG 1.4.10 and diagram labels (UL-07) |
