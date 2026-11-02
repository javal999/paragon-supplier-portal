# SC Hub: what changed since 21 Oct (Material Planner session, 4 Nov 2026)

| | |
|---|---|
| Deck | `SC-Hub-Planner-04-Nov-What-Changed.pptx` (this folder), 37 slides |
| Read at | GitLab `main` `aeabdc83` (2026-11-02, after MR !81, TL-D35) |
| Audience | Material Planning team, session led by Levi |
| Goal | Agree that the end-to-end prototype is ready for early user testing with suppliers |
| Generator | `sc-hub-vision/decks/planner-04-nov/build.js` (outside the repo, like the 07 Oct and 14 Oct decks) |
| Screenshots | 6 from prod (`aeabdc83`, deployment -s8irr4yx0, https://paragon-supplier-portal-dusky.vercel.app), taken 2026-11-02, sample data. Slide 14 has no screenshot: prod's sample data holds no call-off drafted at ROP Fisik |
| Out of scope | RFx (paused), supplier registration (another team), lint, refactors, CI |

Every claim below was checked in the code or a doc at `aeabdc83`, not taken from a commit title alone. Paths are under `src/` unless they start with `docs/`.

## 1. Changes by planner workflow

### Plan ahead

| Change | Where | Merge | Evidence |
|---|---|---|---|
| Plan check = Total DA − Total OSPO. SOH, OSPR and PR show as "SAP MRP elements", context only. A figure stored earlier keeps its old basis | Demand anticipation (DA) | MR !57 `59199b4f` | `services/transitions/osipRules.js:126, 689-712`; `PlanCheck.jsx:61, 145, 162` |
| Provisional label lists A8b and A9 only (A1, A2 answered) | DA | MR !57 | `demandAnticipationRules.js:114` |
| Supply above a week's DA counts against later weeks' gaps (BL-228). A week with no DA stops the carry. A reduced Gap cell has a tooltip | DA grid Gap row; What to order → Below demand anticipation | MR !43 `829f0681` | `supplyBelowDemandRules.js:92-107`; `supplyRows.jsx:61-64` |

### Reorder points

| Change | Where | Merge | Evidence |
|---|---|---|---|
| Safety order SD = LTP over the next 13 weeks (was lead-time weeks). Z per material | Planning engine · Safety stock targets | MR !57 | `osipRules.js:85-87, 212-255` |
| g per material, f per supplier, pull agreement per supplier, bottleneck lead time per supplier × material, set on a values panel; empty = default | Safety stock targets → material | MR !57 | `osipValues.jsx:17-31`; `osipParams.js:25-37, 67-78` |
| ROP FS removed. ROP Supplier = demand × bottleneck lead time; "not available" without it | Safety stock targets | MR !57 | `osipRopRules.js:307-334` |
| CV over the last 6 full calendar months (was 26 weeks); stable below 0.5 | Safety stock targets | MR !57 | `osipRules.js:110-112, 447-490` |

### Call-offs

| Change | Where | Merge | Evidence |
|---|---|---|---|
| A drafted call-off = the supplier's minimum delivery (MDQ = MOQ [Proposed]), rounded like Max (koli local, MOQ import). Was fill-to-Max in MPQs. No MOQ → fill-to-Max, flagged | Call-offs draft panel | MR !57 | `callOffTriggerRules.js:12-20, 342-400` |
| A minimum delivery above Max is still called off, flagged "Above Max" (BL-230) | Call-offs draft panel | MR !57, MR !58 | `callOffTriggerRules.js:359-362`; `ropFisikTrigger.jsx:132` |
| A line balance below the MDQ is called off, flagged "Below minimum delivery", PR for the rest (BL-232) | Call-offs draft panel | MR !58 `abb96911` | `callOffTriggerRules.js:378-399`; `ropFisikTrigger.jsx:103-128` |
| Need date = today + f, using the supplier's own f when set | Call-offs | MR !57 | `callOffTriggerReadModel.js:143` |
| Feedstock confirmation: daily (WIB day) on a pull agreement, else weekly with the Thursday update; a missed one shows as missed | Inventory feedstock panel | MR !57 | `feedstockRules.js:58, 223, 265` |
| Early delivery decided (BL-56, 2026-11-02): any date once Material Planning confirms; a confirmed early receipt counts as on time (KPI-2). **Code unchanged**: still a 7-day window for every early receipt (BL-234, not built) | Reliability, performance | docs only, `5666e31f` | `docs/supplier-hub/BACKLOG.md` BL-56, BL-234; `services/data/kpiWindow.js` last changed 2026-10-05 |

### Stock & capacity

| Change | Where | Merge | Evidence |
|---|---|---|---|
| Stock: 6 columns, 4 filter tiles, "Supplier cover N days" + "PTI cover N days", a drawer per row | Inventory & capacity → Stock | MRs !28, !30 | `pages-v2/BuyerInventory.jsx:82-89, 225-228, 405-416`; `inventory/MaterialDrawer.jsx` |
| Risk thresholds per material group (INV-D14), set by an administrator | User menu → Alert thresholds | MR !35 `ef250a8c` | `hubSettings.js:805-820, 990-996` |
| Stock simulation: "Over-called by N"; Create call-off only with line balance and not over-called; dispatched counts as shipped (INV-D7) | Stock simulation | MRs !28, !30 | `simulateSupplierStock.js:638-660`; `BuyerStockSimulation.jsx:502-540` |
| Alerts: "Impact in N days", a next step, fitting buttons | Alerts | MR !30 | `inventory/alertNextStep.jsx:16-62` |
| Capacity: Accept additional capacity on amber weeks, Undo (BL-227), "Still short: N" on red; accepted amber leaves the alert | Capacity | MR !30, MR !44 `17c403c4` | `CapacityGapActions.jsx`; `capacityRules.js:163-171, 322-337`; `inventoryAlertRules.js:197-200` |
| Ask supplier names its topic; in-hub message, optional WhatsApp | Drawer, Stock simulation, Alerts, Capacity | MRs !30, !36, !44 | `AskSupplierButton.jsx:117` |
| Quantities follow the UI language | Several | MR !28, MR !36 | `lib/format.js:42-50` |
| GR: a typed ASN replaces drafted lines; a rejected lot reads "Not posted" | Goods receipts | MR !53 `3b790e49` | `GRInspectionWizard/hooks/useGrSource.js:64`; `DispositionStep.jsx:119-123` |
| Zone pill under the period on Foresight commitments | Foresight commitments | MR !55 `083270e2` | `BuyerCommitments/components/ExceptionRow.jsx:78-84` |

### Labels & menu

| Change | Where | Merge | Evidence |
|---|---|---|---|
| Menu lanes: Home, Order collaboration, Weekly plan, Review, Inventory & capacity; engine pages in the user menu | Sidebar | MRs !19, !26 | `components/layout-v2/navConfig.js:91-200, 300-365`; `lib/i18n/hub.js:17-80` |
| (i) tooltip on 390 glossary terms: definition, "How it is calculated", "Also called", "Not" | Every page | MRs !65 to !81 | `components/ui-v2/TermLabel.jsx:49-58`; `components/forecast/TermTip.jsx:145-166` |
| Renamed labels, each by a ruling (TL-D1 to TL-D35): see slides 25 and 26 | Many | MRs !65 to !81 | `docs/supplier-hub/SC-HUB-TERM-LABELS-REQUIREMENTS-2026-10.md` §7; `lib/glossary/termLabels.glossary.js` |
| Blue accent, JetBrains Mono numbers, one chart ramp | All pages | MR !51 `dcd00650` | `lib/chartPalette.js`; `index.css` |

## 2. Calculations with worked examples

Example numbers are illustrative. Each result was computed with the code's rule, and the arithmetic was checked with node.

| Calculation | Formula (code) | Example |
|---|---|---|
| Plan check | PR rec = max(0, Total DA − Total OSPO) (`osipRules.js:689-712`) | DA 1,000, OSPO 700, SOH 300 → 300 (the old basis gave 0) |
| Supply gap carry | gap = max(0, DA − (open + carry)); carry = max(0, open + carry − DA) (`supplyBelowDemandRules.js:92-107`) | DA 980/wk, 2,000 in W37 → gaps 0, 0, 940 |
| Safety order | CEILING(Z × √LT × SD(LTP wk 1-13), MPQ) (glossary :123; `osipRules.js:212-255`) | LT 4, SD 12.91, MPQ 10 → 42.60 → 50 (old 4-week SD 16.33 → 60) |
| ROP Order, PR Generated | LTP × LT + safety; ROP Order − SOH − OSPO − OSPR, ≥ 0 (glossary :732, :979) | 400 + 50 = 450; 450 − 200 − 150 − 0 = 100 |
| ROP Fisik, Max Stock, ROP Supplier | min(cons, cap, LTP); CEILING(g × d, MPQ); CEILING(d × f, MPQ) + safety; CEILING(ROP Fisik, koli); CEILING(d × bottleneck, MPQ) (`osipRules.js:335-435`; `osipRopRules.js:307-319`) | d 25 → safety 40, ROP Fisik 100, Max 140, ROP Supplier 260 |
| Call-off quantity | CEILING(MDQ, koli/MOQ); Above Max allowed, flagged (`callOffTriggerRules.js:342-400`) | MDQ 1,250, pallet 700 → 1,400 against room 390 |
| Below minimum delivery | balance < MDQ → call off balance, PR the rest | room 2,100, MDQ 2,000, balance 1,200 → 1,200 + PR 800 |
| Call-off tolerance | approval if over > 5%, any day late, or early > 0 days (`callOffRules.js:388-399`; `hubSettings.js:89-107`) | 1,050 accepted; 1,060 waits; 1 day early waits |
| KPI on-time window | date − 7 ≤ received ≤ date (`kpiWindow.js:28, 51-54`; `fulfillment.js:59`) | date 10 Nov: 3 Nov counts, 2 Nov and 11 Nov do not |
| Supplier cover and risk | stock ÷ (30-day forecast ÷ 30); High < 1 × LT, Medium < 1.5 × LT (`inventoryRules.js:146-262`) | 4,200 ÷ 300 = 14 days; LT 14 → Medium; group High 1.2 → High |
| Free to call off | available − called off, not shipped (`simulateSupplierStock.js`) | 3,200 − 4,000 = −800 → "Over-called by 800" |
| Capacity | BE = allocated + additional; still short = LTP − BE (`capacityRules.js:322-337`) | 1,000 + 300 = 1,300; LTP 1,400 → still short 100 |

## 3. Questions (slides 28 to 36)

29 open points, in Indonesian and English. Verbatim from `work-tracker/C2-MATERIAL-TEAM-MESSAGE-2026-10-30.md` unless the source column says otherwise.

| ID | Source |
|---|---|
| A9, B1, B4, B8, C2, C3, C4 | C2 message, Pertanyaan sheet rows |
| N1 to N8 | C2 message, by email |
| L1 to L4 | C2 message, TL-D9, TL-D13 |
| L5 (12 alert rules) | C2 message, owner 2026-10-30 |
| Q8 Max Supplier, with `REF-Q8-MAX-SUPPLIER-baris-23.png` | C2 message |
| D1, D2 | C2 message, follow-up of 26 Oct |
| BL-71 (over-delivery reference), BL-149 (SOP link), BL-140 | **Not in C2.** `BACKLOG.md` 2.41 §1, owner Material Planner. BL-58, BL-67, BL-69 and BL-71's "kept open" half were answered by the owner on 2026-11-02 (MR !80) and are no longer asked |
| MDQ = MOQ | **Not in C2.** `callOffTriggerRules.js:16` [Proposed] |
| Pull agreement default "no"; no bottleneck lead time default | **Not in C2.** `osipParams.js:27-37` [Proposed] |

## 4. Claims not verified

- **Screens.** Six slides show prod screenshots (DA grid, (i) tip, values panel, Stock, Stock simulation, Capacity). Prod's DA grid shows the same W37 to W39 figures as slide 6 (980 DA, 2,000 open supply, carries 1,020 and 40, gap 940). The Stock simulation example (slide 20) now uses prod's RM-EMUL-9430 row: available 1,700, called off not shipped 2,500, Over-called by 800.
- **Not shown on prod:** the call-off draft panel ("Below minimum delivery", "Above Max"). No sample material is drafted at ROP Fisik, and I did not create one, because that would change data on prod.
- **Safety stock page text:** it described the old SD and CV windows on prod `aeabdc83`. MR !85 fixed it (main `f79a26c1`, live 2026-11-02 14:36 WIB), so slides 8 and 11 no longer flag it. The values-panel screenshot is from before the fix and does not show that text.
- **BL-236 weekly panel (MR !82):** live in prod. Checked as the sample supplier PT Sample Packaging Indonesia after a reload with the new bundle, the "Also due by the same cutoff" capacity and feedstock lines did not render. The deck only names BL-236 in the BL-149 question and carries no screenshot of it.
- **C2 sent?** On 2026-11-02 the C2 message was a draft that Levi had not yet sent. Check before the session.
- **"11 columns, risk at x = 1725 px"** on the old Stock page comes from `research/INVENTORY-UX-EVALUATION-2026-10.md` §1 and was not re-measured.
- **"Every sample material reads stable"** (CV) comes from the docs; the code was not run.
- **The 390-term count** is glossary entries per wave section, not rendered rows.
- **Old label words** "Max", "PR need", "Arriving", "Gap", "Acc" come from the term-label inventory doc, not from pre-change code.
- **"PTI stock on hand (SOH), all plants"** page placement is read from the TL-D35 spec row; no render site was traced.
- **The BL-232 second-line flag** (a remainder on a second line below the MDQ is also flagged) is read from the code (`line !== first`). No ruling states it.
- **Doc drift found:** the BL-228 requirement header still says "Nothing is built yet". The URS sync names constants `CALL_OFF_OVER_PCT` and `CALL_OFF_EARLY_ALLOWANCE_DAYS`, which do not exist. Comments in `kpiWindow.js:9` and `callOffTolerance.js:17` still say Proposed or placeholder after the 2026-11-02 decision.

## 5. My calls

1. **English slides, bilingual questions.** The 07 Oct and 14 Oct decks are English only, so only the question slides carry ID + EN. *Alternative:* add ID subtitles on every slide.
2. **"8 changed rules"** counts calculation changes a planner sees in figures. Label and layout changes are counted separately. *Alternative:* count every change (about 30).
3. **6 backlog questions added.** Three are Material Planner decisions in `BACKLOG.md` §1 (2.41), and three are [Proposed] owner defaults in code. BL-01 (REPL, consultant), BL-119 (marketing) and BL-150 (Levi's own alert list) were left out. *Alternative:* add BL-150, since L5 touches alerts.
4. **D1 "today" line** says BL-228 now carries surplus forward. The C2 message had no "today" for D1. *Alternative:* leave it blank, as C2 did.
5. **Tolerance and KPI slide kept**, although the code did not change, because the rule was decided on 2026-11-02 and BL-234 is the gap. *Alternative:* drop it.
6. **Generator outside the repo**, following the 07 Oct deck. *Alternative:* commit `build.js` under `docs/`.
7. **Six prod screenshots, slide 14 a text note.** Slide 14 has no screen because prod has no ROP Fisik draft to show. *Alternative:* record a PTI stock update on prod to trigger a draft, then capture it.
