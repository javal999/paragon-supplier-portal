# Foresight end-to-end review (2026-11)

| | |
|---|---|
| Reviewed | GitLab `main` at `eaf82ab0` (2026-11-02), built on Node 22, served with `vite preview` on port 5380, viewport 1440×900, hub clock Monday 31 Aug 2026 19:00 WIB |
| Personas | PTI as the Material Planner (demo seat "All roles"); supplier sup-007 "PT Sample Packaging Indonesia" |
| Materials followed | PK-PETB-8801 PET Bottle 200ml Frosted (packaging; sup-007 share 70%, Sample PET Bottle Manufacturer GmbH 30%) and RM-STEAR-7300 Stearic Acid (raw material; PT Sample Specialty Fats 100%). sup-007 does not supply RM-STEAR-7300, so its supplier-side figures are read on PTI pages only |
| Companion files | `BACKLOG.md` section 4d (BL-237 to BL-258); `FORESIGHT-LOGIC-REVIEW-2026-11.md` (L-01 to L-26, W-01 to W-07) |
| Evidence | `file:line` paths are relative to `src/`. "Screen" is the route as rendered in the preview. Sources are tagged [Team, date, Qn], [Owner, date, decision], [Code `path:line`], [Proposed] |

## 1. VERDICT

**Experience.** A first-time planner can walk the weekly cycle with the step strip, but the OSIP half of Foresight (Demand anticipation, the call-off trigger, the sandbox) sits outside the strip and shows the same material under two plans that never meet.

**Continuity.** Figures carry inside each world (LTP 34,300 is the same on 7 pages; the supplier's commitment, its reliability panel and the DA open supply reconcile), but the engine world and the hub-sample world disagree on stock and need for one material, and no page says which is the plan of record.

**Logic.** 14 of 26 formulas match their newest source; the 12 gaps are mostly silent sources, and 4 need the team now.

1. PK-PETB-8801 stock on hand is 196,920 on Material requirement and 30,007 (70% share 21,005) on the DA card, same day (C-01).
2. What to order nets the engine's 16,404 safety stock while Safety stock targets calls OSIP the default (C-02).
3. DA for W37 reads 0 after the check while the published forecast asks 34,300 Firm and the supplier committed 31,000 (C-04).
4. The sandbox projects 22 weeks of negative stock beside "create a PR in SAP for 0" (U-01).

## 2. CYCLE TRACE

**Weekly cycle**

1. PTI, This week: clean; the page never names the planning week (W36, 31 Aug to 6 Sept), only "Data as of 31 Aug 2026, 19:00 WIB" (U-12).
2. PTI, What to order: "Why this quantity" explains 5,756 → 20,000 cleanly; its safety stock 16,404 is the engine challenger, not the OSIP default (C-02).
3. PTI, What-if sandbox for PK-PETB-8801: the link from the row works; `?material=` alone opens an empty page (U-09); the projection runs 22 weeks negative with PR 0 (U-01).
4. PTI, Make warehouse room: clean; PK-PETB-8801 lines are "needed from W3 2027", which contradicts the sandbox's W38 shortage (C-01).
5. PTI, Publish to suppliers: publishing refused as expected; the "Last published" column shows 0 PCS for weeks the supplier holds at 34,300 (C-03).
6. Supplier, Foresight commitments: "Submit all" committed W39 at the pre-filled 30,900 before anything was typed (U-02); W40 committed at 30,000 with reason Capacity.
7. PTI, Foresight commitments: the W40 exception arrived with its reason; strip says 8 exceptions, page says 7 (C-06).
8. PTI then supplier, Feedstock reconcile: same figures on both sides; the supplier sees a "Liability, not priced: 262,000 PCS" proposal awaiting the owner (U-18).
9. PTI, Demand anticipation (DA) and its history: history matches the card; the W37 figure is 0 and the carried 4,300 is invisible in the grid (C-04, U-03).

**OSIP chain**

1. PTI, Safety stock targets: parameters Z, g, f, pull agreement and bottleneck lead time are editable in the row detail; clean.
2. PTI, Safety stock targets, ROP Fisik 12,000 / ROP Order 73,600 / Max 15,200: clean; ROP Supplier "Not available: no bottleneck production lead time set".
3. PTI, Material requirement: clean netting; stock 196,920 is the engine's, not the hub's (C-01).
4. PTI, Call-offs: no draft "at ROP Fisik" exists and nothing says the trigger has not run (U-04); the run-out tab says "raise the next PO" while the DA card says surplus 48,400 (C-05).
5. Supplier, Call-offs: the released call-offs (35,000 in W36) match the DA open supply; clean.

**Demand chain**

1. PTI, Forecast quality, Forecast vs plan: clean; "Plan source: material planning uses SAP's plan" is visible.
2. PTI, Forecast quality, Bias and overrides: an override of SYN-FG-001 W37 to 30,000 was recorded and moved the 26-week total; clean.
3. PTI, Model backtest: clean (PK-PETB-8801 "Equal").
4. PTI, Data health: clean; the failing cycle-count check is chipped on What to order and Make warehouse room.
5. PTI, What to order for PK-PETB-8801 again: the override changed nothing here, and the page says so only on the Bias tab.

## 3. FIGURE LEDGER

**PK-PETB-8801, PT Sample Packaging Indonesia (share 70%), PCS**

| Figure | Unit | What to order | Material requirement | Safety stock targets | Demand anticipation (DA) | What-if sandbox | Publish to suppliers | Supplier Foresight commitments | PTI Foresight commitments | Call-offs / Capacity / FS reconcile | Finding |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LTP W36 | PCS | 39,300 − 5,000 = 34,300 (Below DA) | — | — | 34,300 | 34,300 (LTP W36 input) | — | 34,300 Firm | 34,300 | 76,700 group LTP = 34,300 + 42,400 (Capacity) | clean |
| LTP W39 / W41 | PCS | — | — | — | 30,900 / 39,400 | — | — | 30,900 (was 34,300) / 39,400 | — | 69,400 / 77,900 group (Capacity) | clean |
| FG demand W36 | PCS | — | — | — | 9,695 | — | — | — | — | 13,846 material (Forecast quality) × 0.7 = 9,692 | clean |
| DA W36 | PCS | 39,300 | — | — | 39,300 | 39,300 | — | — | — | — | clean |
| DA W37 | PCS | gap 0 | — | — | 0 (34,300 absorbed) | 0 | — | 34,300 Firm, committed 31,000 | 31,000 Amber −9.6% | — | C-04 |
| Total DA over the lead time | PCS | — | — | — | 73,600 | 73,600 headline; grid sums 39,300 | — | — | — | — | U-10 |
| Safety order | PCS | — | — | 5,000 | 5,000 | 5,000 | — | — | — | — | clean |
| Safety stock (engine) | PCS | 16,404 | 16,404 | 16,404 "Challenger" | — | — | — | — | — | — | C-02 |
| Reorder point (engine) / ROP Order / ROP Fisik | PCS | 56,935 | — | 56,935 / 73,600 / 12,000 | 73,600 ROP Order | 73,600 / 12,000 | — | — | — | — | C-02 |
| Max Stock | PCS | — | — | 15,200 | — | 15,200 | — | — | — | — | clean |
| Stock on hand | PCS | 20,545 at start of W51 | 196,920 | — | SOH 21,005 (70% share) | 21,705 end of W36 | — | — | — | — | C-01 |
| Open supply / released call-offs W36 | PCS | 35,000 | — | — | 35,000 | 35,000 incoming | — | — | — | 10,000 + 10,000 + 15,000 released (Call-offs) | clean |
| Gap W36 / remainder | PCS | 4,300 | — | — | 4,300 / carried to W37 | 4,300 / 4,300 | — | — | — | — | U-03 |
| OSPO / blanket balance | PCS | PO-2025-00107 | — | — | 122,000 | open PO input | — | — | — | 15,000 + 37,000 + 70,000 remaining; "runs out W36" | C-05 |
| Net requirement W51 / recommended order | PCS | 5,756 / 20,000 (W51), 42,000 (W53) | 62,047 (26 wk) | — | — | — | engine value W51 4,029 = 5,756 × 0.7 | — | — | — | clean |
| Last published W51 | PCS | — | — | — | — | — | 12,809 (replayed) | Version 2: Dec 2026 156,800 (monthly) | — | — | C-03 |
| Lead time | days | — | 14 + 6 safety lead time | — | 2 weeks | 2 weeks (4 + 7 + 3) | Firm 14 d · Trade-off 42 d | — | — | PO lead time 2 wk (run-out) | clean |
| Commitment W40 | PCS | — | — | — | — | — | — | 30,000, Capacity, −12.5% | 30,000, Capacity, −12.5% | — | clean |
| Confirmation rate / commitment reliability / CFOT by PO line | % | — | — | — | — | — | — | 88 / 63 / 46 | — | 88 / 63 / 46 (Supplier reliability) | clean |
| Feedstock reconcile | PCS | — | — | — | — | — | — | — | — | 470,000 / 208,000 / 0 / 262,000 / 208,000 on both personas | clean |

**RM-STEAR-7300, PT Sample Specialty Fats (share 100%), KG**

| Figure | Unit | What to order | Material requirement | Safety stock targets | Demand anticipation (DA) | DA history | Publish to suppliers | Call-offs / FS reconcile | Finding |
|---|---|---|---|---|---|---|---|---|---|
| LTP W36 / W37 | KG | 3,470 − 950 = 2,520 / 2,940 | — | — | 2,520 / 2,940 | 2,520 / 2,940 | — | — | U-08 |
| DA W36 to W42 | KG | 3,470 / 2,940 / 2,940 / 2,940 / 2,937 / 2,935 / 2,935 | — | — | same | same ("After the check" same) | — | — | clean |
| Safety order / Safety ROP Fisik | KG | — | — | 950 / 425 | 950 | 950 | — | — | clean |
| ROP Order / ROP Fisik / Max | KG | — | — | 21,097 / 1,275 / 1,400 | 21,097 (20,147 + 950) | — | — | — | clean |
| Safety stock / reorder point (engine) | KG | — | 143 | 143 / 10,699.7 | — | — | — | — | U-13 |
| Stock on hand | KG | — | 126,799 | — | SOH 900 | — | — | — | C-01 |
| OSPO / PR | KG | call off 3,470 + 2,940 × 3 + 2,710 = 15,000 on PO-2025-00116, then New PO 227 / 2,935 / 2,935 | — | — | OSPO 15,000; PR 5,197 (context); recommend PR 6,097 | OSPO 15,000; Additional PO 6,097 | — | PO-2025-00116 15,000 KG, runs out W41, new PO by W38 | U-17 |
| Gap W36 | KG | 3,470 | — | — | 3,470 | — | — | — | clean |
| Lead time | days | — | 45 + 6 safety lead time (7 weeks: 11 + 23 + 11) | — | 7 weeks | — | Firm 45 d · Trade-off 60 d | PO lead time 3 wk | clean |
| Net requirement | KG | no recommended order | 0 | — | — | — | engine 0, MASC 0 → 0 | — | C-01 |

## 4. FINDINGS, tracks A and B

- **C-01** · Major · high · Same figure, same value · PTI, `/buyer/material-requirement`, `/buyer/demand-anticipation`, `/buyer/what-if` · Evidence: Material requirement shows PK-PETB-8801 stock on hand 196,920 (RM-STEAR-7300 126,799 KG); the DA card shows SOH 21,005 at share 70% (900 KG); only the Below DA section names its dataset (`lib/i18n/supplyGap.js`). Problem: the engine dataset and the hub sample are two stock-and-demand worlds for one material, and the pages mixing them do not say so. Recommendation: a basis line on every OSIP and engine figure naming its dataset. Routing: BL-237; the plan of record is open question 1.
- **C-02** · Major · medium · Carry-forward · PTI, `/buyer/order-plan` "Why this quantity" and `/buyer/safety-stock` · Evidence: the panel nets gross 9,897 + safety stock 16,404 − stock 20,545 = 5,756 and shows "Reorder point 56,935"; Safety stock targets labels the same 16,404 "Challenger: engine fill rate" and the OSIP safety order 5,000 / ROP Fisik 12,000 "the default rule"; `services/data/mock/MockProcurementService.js:385` feeds `requirementInputs` from `safetyStockRun`. Problem: What to order sizes every order on the figure the accepted amendment to REQ-E14-04 calls the challenger. Recommendation: decide which safety figure nets the requirement, then label the panel with it. Routing: logic review L-08.
- **C-03** · Major · high · Persona hand-off · PTI, `/buyer/stabilise` · Evidence: "LAST PUBLISHED" reads 0 PCS for PK-PETB-8801 W36 to W50 and 12,809 for W51; the footer says "Last published (Packaging): Version 2, 28 Aug 2026" and the supplier's Version 2 holds 34,300 for W36 to W48; the column is the engine chain replayed 12 weeks (`services/data/mock/stabiliseReadModel.js:33-35`, ENG-B30). Problem: the planner reads "last published" as what suppliers hold. Prior: F-13 (FUX-D4) covers the versions tab, not this column. Recommendation: a basis line under the table naming the replay and Version 2. Routing: BL-238.
- **C-04** · Major · high · Persona hand-off · PTI, `/buyer/demand-anticipation`; supplier, `/supplier/forecasts` · Evidence: the sup-007 PK-PETB-8801 card reads Total DA 73,600, Total OSPO 122,000, "Surplus: 34,300 absorbed in W37; 14,100 more than that week can take", grid DA W37 = 0 (`services/transitions/osipRules.js:689-717`); the supplier's Version 2 asks 34,300 Firm for W37 and the commitment stands at 31,000. Problem: two signals for one week; once DRC-D10 lifts, the supplier would see 0 beside a Firm 34,300. Recommendation: none without a ruling on what OSPO the check counts (the whole blanket balance today, `services/transitions/demandAnticipationRules.js:349-353`). Routing: logic review L-07.
- **C-05** · Major · high · Same figure, same value · PTI, `/buyer/call-offs` run-out tab and `/buyer/demand-anticipation` · Evidence: run-out reads PO-2025-00107 "Runs out W36" and PO-2026-00127 "New PO needed by W37 (in 1 wk) · Raise the next PO"; the DA card for the same pair reads gap −48,400, "Additional PO 0". Problem: one page says raise a PO this week, the other that supply exceeds need by 48,400; CAP-9 draws balances down by LTP, DRC-4 compares a 2-week horizon with the whole balance. Recommendation: name the basis on both; the rule is L-07. Routing: logic review L-07.
- **U-01** · Major · high · Explanation of figures · PTI, `/buyer/what-if?material=PK-PETB-8801&supplier=sup-007` · Evidence: "Call-offs the trigger would draft 22,800", "Trigger: create a PR in SAP for 0", "First shortage week W38", projected SOH −24,095 in W38 falling to −746,093 in W6; after the W37 draft the trigger never re-arms because SOH never rises above ROP Fisik 12,000 (`services/transitions/callOffTriggerRules.js:534-546`, `whatIfSandboxRules.js:701-725`). Problem: a planner reads a 22-week stock-out beside "PR 0" and cannot tell whether the rule or the data is wrong. Recommendation: the re-arm rule and the number of call-offs per drop need the team. Routing: logic review L-15.
- **U-02** · Major · high · Feedback and state · supplier, `/supplier/forecasts` · Evidence: every open period's commitment input is pre-filled with the forecast (`pages-v2/SupplierForecastCommitments/utils.js:26`); "Submit all" for the week of 21 Sept committed PK-PETB-8801 W39 at 30,900 with nothing typed, no summary, no confirm; banner went 24 → 23. Problem: a first-time supplier commits to every material of a week with one click, at quantities it never read. Recommendation: a confirmation summary ("You commit 1 material: PK-PETB-8801 W39 at 30,900") before the submit, pre-fill kept. Routing: BL-240.
- **U-03** · Major · high · Carry-forward · PTI, `/buyer/demand-anticipation` · Evidence: the card sentence reads "35,000 called off, remainder 4,300 · 4,300 carried to W37 (last week of the horizon)"; the grid's Carry-over row shows "—" in W37 and DA W37 = 0; DRC-B22 says a remainder enters the figures from the next planning week. Problem: the sentence and the grid contradict each other on the same card, and nothing says the carry is pending. Recommendation: show "4,300 pending (from next planning week)" in the W37 Carry-over cell, or say so under the sentence. Routing: BL-245.
- **U-04** · Major · medium · First-time and empty states · PTI, `/buyer/call-offs`, `/buyer/order-plan`, `/buyer/home` · Evidence: no draft "at ROP Fisik", no "Create a PR in SAP" task, and What to order's `RopFisikPrSection` renders nothing; the trigger fires only through the PTI stock refresh seam (DRC-B34), which no screen drives. Problem: a planner following DRC-13 cannot find where the call-off trigger lives or whether it ran. Recommendation: an empty state on Call-offs "To act" and What to order: "No call-off drafted at ROP Fisik yet: the trigger runs on PTI stock updates (eWM feed pending)". Routing: BL-252.
- **C-06** · Minor · high · Same figure, same value · PTI, `/buyer/collaboration` · Evidence: step strip "5 Foresight commitments · 8 open exceptions", page tab "Exceptions (7)", banner "outside tolerance 3 + missing past the deadline 4"; the strip counts both streams (`components/forecast/cycleCounts.js:100-106`, `BuyerThisWeek.jsx:200`, `CycleSteps.jsx:107`) while the page lists one. Problem: two counts for one step on one screen. Recommendation: count per stream in the strip, or label it "both streams". Routing: BL-239.
- **U-05** · Minor · high · Feedback and state · supplier, `/supplier/forecasts` · Evidence: after Submit all, the W40 row reads "Submitted on time · Outside tolerance · Draft saved (not visible to PTI) · Amber −12.5%" (`lib/i18n/forecastCollaboration.js:126`); PTI already lists it. Problem: the supplier is told its commitment is invisible to PTI after PTI can see it. Recommendation: drop the draft marker once the period is submitted. Routing: BL-241.
- **U-06** · Minor · high · Role fit and hand-offs · supplier, `/supplier/home` · Evidence: "Forecast commitments overdue · Cover 4 days · Lead time 14 days" and "due soon · Cover 4 days · Lead time 14 days"; the task carries a stock-cover basis (`pages-v2/SupplierHome.jsx:376-397` passes `stock: coverOf(...)`) and `pages-v2/home/severityDisplay.js:39-40` prints the cover instead of the due date. Problem: a commitment task shows a days-of-cover line where the supplier expects the deadline. Recommendation: print the due date on forecast tasks; keep cover on stock tasks. Routing: BL-242.
- **U-07** · Minor · high · Consistency · both personas · Evidence: supplier alert link "Open commitments & gaps" (`lib/i18n/inventoryCapacity.js:454`, `:497`), PTI tab "Commitments & gaps" (`lib/i18n/forecastCollaboration.js:280`, `:283`), supplier Capacity sentence "…submit the LTP on Forecast & commitments" (`inventoryCapacity.js:365`); the owner ruled one name, Foresight commitments (IA R-2). Problem: three names for one page. Recommendation: use the ruled name in the 5 strings. Routing: BL-243.
- **U-08** · Minor · high · Explanation of figures · PTI, `/buyer/demand-anticipation` · Evidence: RM-STEAR-7300 LTP W36 2,520 then 2,940; the monthly raw-material LTP is spread by day and W36 holds one August day (`services/transitions/capacityRules.js:397-406`, CAP-D11); the LTP tooltip says only "the current forecast quantity for the week". Problem: the first week looks like a data error. Recommendation: add "a monthly LTP is spread over its days" to the LTP definition. Routing: BL-246.
- **U-09** · Minor · high · Wayfinding and cycle · PTI, `/buyer/what-if` · Evidence: `?material=PK-PETB-8801` alone (the form `navConfig.js:133` names) shows "Choose a supplier and material to start"; the in-app link carries `&supplier=`; "New blank scenario" navigates to `#/buyer/what-if` and drops the pair. Problem: a bookmarked or typed link and the blank-scenario button both lose the material. Recommendation: pick the primary supplier when only the material is given; keep the pair on "New blank scenario". Routing: BL-247.
- **U-10** · Minor · high · Explanation of figures · PTI, `/buyer/what-if` · Evidence: headline "Demand anticipation (DA) over the lead time 73,600" beside grid row "Demand anticipation (DA), current plan 39,300 · 0"; the headline is the total before the plan check, the grid is after it (`whatIfSandboxRules.js`, `rollingDaFigure` `daInForce`). Problem: 73,600 and 39,300 for one figure on one page, unexplained. Recommendation: name the grid row "after the check" as the DA history does, and the headline "before the check". Routing: BL-249.
- **U-11** · Minor · high · Wayfinding and cycle · PTI, `/buyer/demand-anticipation` · Evidence: the page is in the Weekly plan menu but has no "Decision here / Uses / Next" header, no Data health chip and no place in the step strip, unlike the other five pages. Problem: the planner cannot tell when in the week to publish DA or what feeds it. Recommendation: the purpose header and chip; the strip placement is open question 3. Routing: BL-251.
- **U-12** · Minor · high · Time · PTI, `/buyer/this-week` · Evidence: the page shows "Data as of 31 Aug 2026, 19:00 WIB" and "First release W39" but never the planning week; the DA page says "Planning week: W36 (31 Aug 2026 – 06 Sept 2026)" and the supplier page "Week of 31 Aug 2026". Problem: "this week" has no week number or dates on the page named after it. Recommendation: put "W36 · 31 Aug to 6 Sept 2026" in the header. Routing: BL-255.
- **U-13** · Minor · high · Consistency and density · PTI, `/buyer/safety-stock` · Evidence: engine reorder points 10,699.7 KG, 170.3 KG, 2,028.8 KG, 6,251.3 KG; F-21 ("round to the unit") is marked done for PCS. Problem: KG figures still carry decimals beside OSIP figures that do not. Recommendation: round the engine KG figures as the PCS ones. Routing: BL-254.
- **U-14** · Minor · high · Locale · PTI, `/buyer/safety-stock`, `/buyer/capacity`, `/buyer/demand-anticipation` (ID) · Evidence: sentences read "Pesanan pengaman (ROP Order)", "stok siklus", "Maks", "ROP Pemasok dan ROP ke prinsipal", "Buffer strategis", "Panggilan W36 · 0 dipanggil" while the labels keep Safety order, Max Stock, ROP Supplier, Strategic buffer, Call-off (TL-D11, TL-D17, TL-D21, TL-D22). Problem: TL-D17 extends the English-term rule to sentences and these sentences break it. Recommendation: apply TL-D17 to the OSIP sentences. Routing: BL-256; the wording questions themselves are W-04 and W-05.
- **U-15** · Minor · high · Explanation of figures · PTI, `/buyer/safety-stock`, `/buyer/what-if` · Evidence: "Provisional: rule awaiting Material Planning (B4, MPQ)", "(B1, C2, MPQ, MDQ)" (`services/transitions/osipSafetyRules.js:75-79`, `osipRopRules.js:94-105`). Problem: MPQ and MDQ read as question IDs; they are master-data defaults. Recommendation: "(B4; MPQ = order multiple until master data)". Routing: BL-257.
- **U-16** · Minor · medium · Time · supplier, `/supplier/forecasts` · Evidence: Version 2 (published 28 Aug) shows "Commitment due 24 Aug 2026, 09:00 WIB · Submitted on time" on W36, the deadline of the version the commitment answered (`services/transitions/forecastRules.js:696-713`). Problem: a due date before the publication date, unexplained. Recommendation: "due 24 Aug (version 1)". Routing: BL-244.
- **U-17** · Minor · medium · Explanation of figures · PTI, `/buyer/demand-anticipation` · Evidence: the RM-STEAR-7300 card shows "PR 5,197" under SAP MRP context and "Shortfall: recommend a PR of 6,097"; the first is ROP Order − SOH − OSPO, the second Total DA − OSPO [Team, 2026-10-28, A2]. Problem: two PR quantities, and the planner raises one. Recommendation: name the difference ("ZPE007 would generate 5,197; the hub recommends 6,097 because SOH is context only"). Routing: logic review L-07 (continues team answers section 4, Q1).
- **U-18** · Minor · medium · Role fit and hand-offs · supplier, `/supplier/fs-reconcile` · Evidence: "Liability, not priced: 262,000 PCS · No max stock agreed · Proposed: awaiting owner review (BL-207)" on the supplier's own page (`services/transitions/feedstockReconcile.js:70-73`). Problem: a proposal the owner has not ruled on is shown to the supplier as its liability, against DRC design rule 5. Recommendation: hold the flag to PTI until BL-207 is ruled. Routing: logic review L-24 and open question 2.
- **U-19** · Minor · medium · Locale · supplier, `/supplier/home` (ID) · Evidence: "PTI punya 2 pertanyaan untuk Anda … Your stock and incoming do not cover the next 30 days of PTI demand" (text seeded in `services/data/mock/stores/supplierAskStore.js` while `lib/i18n/inventoryCapacity.js` holds the key). Problem: the question body stays English in the Indonesian locale. Recommendation: store the key, render per locale. Routing: BL-258.
- **U-20** · Minor · medium · Consistency · supplier, `/supplier/forecasts` · Evidence: "SAMPLE DATA" at the top and "SYNTHETIC DATA · AWAITING THE MDM SAP FEED" on the "Your reliability" panel of the same page. Problem: F-14 (one banner) is marked done but the supplier page still carries two. Recommendation: one wording. Routing: BL-253.
- **C-07** · Minor · medium · Locale number formats · both personas (ID) · Evidence: Foresight commitments show "34,300" and "14,700" in Indonesian while every other Foresight page shows "34.300"; BL-138 lists `forecastDisplay.jsx` and is parked until the RFx requirement. Problem: one cycle, two groupings. Recommendation: none new; judged here only as evidence that the forecast sites of BL-138 sit on the weekly cycle. Routing: BL-138 (open).
- **U-21** · Polish · high · Consistency · PTI, `/buyer/demand-anticipation-history` · Evidence: "Showing planning weeks W36 to W36 (52 weeks back by default)" (`lib/i18n/demandAnticipationHistory.js:26`). Problem: the sentence says 52 weeks and shows one. Recommendation: "Showing W36 (the only published week); the default range is 52 weeks back". Routing: BL-250.
- **U-22** · Polish · high · First-time and empty states · PTI, `/buyer/what-if` · Evidence: the saved scenario's compare control is a checkbox labelled only with the scenario name; `lib/i18n/whatIfSandbox.js:199` holds "Compare" unused on the card. Problem: nothing says the checkbox compares. Recommendation: "Compare" beside the checkbox. Routing: BL-248.

Count: Major 9 · Minor 18 · Polish 2 (29 findings: C-01 to C-07, U-01 to U-22).

## 5. COVERAGE LEDGER

**Pages**

| Page | Opened | Findings |
|---|---|---|
| `/buyer/this-week` (EN, ID) | yes | U-12 |
| `/buyer/order-plan` (EN, ID; Why this quantity; Below DA) | yes | C-01, C-02, U-04 |
| `/buyer/what-if?material=` (EN, ID; saved and compared) | yes | U-01, U-09, U-10, U-15, U-22 |
| `/buyer/reschedule` (both warehouses; EN, ID) | yes | C-01 |
| `/buyer/stabilise` (both tabs; EN, ID) | yes | C-03 |
| `/buyer/collaboration` and `/responses` (EN, ID) | yes | C-06, U-07, C-07 |
| `/buyer/demand-anticipation` (both tabs, publish dialog; EN, ID) | yes | C-04, C-05, U-03, U-08, U-11, U-14, U-17 |
| `/buyer/demand-anticipation-history` (EN, ID) | yes | U-21 |
| `/buyer/demand-forecast` (both tabs, override; EN, ID) | yes | clean |
| `/buyer/fs-reconcile` (EN, ID) | yes | clean (U-18 is the supplier side) |
| `/buyer/scorecard` (EN, ID) | yes | clean |
| `/buyer/material-requirement` (EN, ID) | yes | C-01 |
| `/buyer/safety-stock` (row detail, parameters; EN, ID) | yes | C-02, U-13, U-14, U-15 |
| `/buyer/data-health` (EN, ID) | yes | clean |
| `/buyer/model-backtest` (EN, ID) | yes | clean |
| `/buyer/reliability` (EN, ID) | yes | clean (W-02) |
| `/buyer/call-offs` (all tabs; EN, ID) | yes | C-05, U-04 |
| `/buyer/capacity` (EN, ID) | yes | U-14 |
| `/buyer/home` (EN, ID) | yes | U-04 |
| `/supplier/forecasts` and `/responses` (commit, late commit; EN, ID) | yes | U-02, U-05, U-16, U-20, C-07 |
| `/supplier/demand-anticipation` (EN, ID) | yes | clean: "Not available yet", not in the menu (DRC-D10 holds) |
| `/supplier/fs-reconcile` (EN, ID) | yes | U-18 |
| `/supplier/home` (EN, ID) | yes | U-06, U-07, U-19 |
| `/supplier/capacity` (EN, ID) | yes | U-07 |
| `/supplier/call-offs` (EN, ID) | yes | clean |

**Files, `src/services/engine/`** (read = header and the cited functions)

| File | Read | Findings |
|---|---|---|
| `bom.js` | no | — |
| `cfot.js` | yes | clean (L-20) |
| `dataHealth.js` | yes | clean |
| `dates.js` | no | — |
| `demandForecast.js` | yes | clean (L-01) |
| `demandRange.js` | yes | clean (L-01) |
| `eventCalendar.js` | no | — |
| `forecastBias.js` | yes | clean (L-19) |
| `forecastMethods.js` | yes | clean |
| `forecastOverrides.js` | yes | clean |
| `integrity.js` | no | — |
| `leadTimeSteps.js` | yes | clean (L-26) |
| `lines.js` | no | — |
| `modelBacktest.js` | yes | clean |
| `orderSizing.js` | yes | C-02 (L-16) |
| `reconcile.js` | yes | clean |
| `reliability.js` | yes | clean (L-20) |
| `requirement.js` | yes | C-01, C-02 (L-08) |
| `reschedule.js` | yes | clean (L-17) |
| `safetyStock.js` | yes | C-02 (L-08) |
| `stabilise.js` | yes | C-03 (L-18) |
| `stock.js` | no | — |
| `types.js` | no | — |
| `synthetic/` | no | — |

**Files, `src/services/transitions/`** (tests excluded)

| File | Read | Findings |
|---|---|---|
| `osipRules.js` | yes | C-04, C-05 (L-02, L-05, L-07, L-09 to L-14, L-25) |
| `osipRopRules.js` | yes | U-15 (L-11, L-13) |
| `osipSafetyRules.js` | yes | U-15 (L-09, L-10) |
| `osipParams.js` | yes | clean |
| `osipLevelSuggestion.js` | yes | clean |
| `demandAnticipationRules.js` | yes | C-04, U-03 (L-02, L-07) |
| `demandAnticipationHistory.js` | yes | U-21 |
| `supplyBelowDemandRules.js` | yes | clean (L-06) |
| `ltpFgDemandRules.js` | yes | clean (L-03) |
| `consumptionRules.js` | yes | clean (L-04) |
| `callOffTriggerRules.js` | yes | U-01, U-04 (L-15) |
| `whatIfSandboxRules.js` | yes | U-01, U-10 (L-23) |
| `feedstockReconcile.js` | yes | U-18 (L-24) |
| `feedstockRules.js` | yes | clean |
| `drcBufferRules.js` | yes | clean (L-22) |
| `capacityRules.js` | yes | U-08 (L-03, L-21) |
| `forecastRules.js` | yes | U-02, U-16 |
| `forecastConfig.js` | yes | clean |
| `supplierDaView.js` | yes | clean |
| `maxStock.js` | yes | clean |
| `blanketPoRules.js` | no | C-05 names its output |
| `callOffRules.js` | no | — |
| `callOffTolerance.js` | no | — |
| `capacityDecisionRules.js` | no | — |
| `inventoryRules.js`, `inventoryAlertRules.js`, `inventoryConfig.js` | no | — |
| `hubSettings.js`, `hubSettingsStore.js` | no | — |
| `leadTimeSteps` lives in engine; `planningGroupRules.js`, `simulateSupplierStock.js`, `supplierAskRules.js`, `supplierOverlayRules.js`, `supplyBelowDemandRules` (above) | no (except noted) | — |
| `annotations.js`, `businessRoles.js`, `cascades.js`, `catalogView.js`, `contractDraftOwner.js`, `customRoles.js`, `events.js`, `flowGraph.js`, `fulfilmentConfig.js`, `grRollup.js`, `handoff.js`, `index.js`, `invoiceRollup.js`, `legality.js`, `looseEndCensus.js`, `matchMaterial.js`, `materialNameRules.js`, `mrpControllerStore.js`, `nextAct.js`, `policyHooks.js`, `qualificationRuleStore.js`, `qualificationRules.js`, `reasonCodes.js`, `refusalMessage.js`, `refusals.js`, `registry.js`, `rfxDocumentRules.js`, `rfxRules.js`, `roles.js`, `schema.js`, `settleFaults.js`, `sourcingTypeStore.js`, `threePlStore.js`, `updateCompliance.js`, `updateCycle.js`, `validate.js`, `warehouseDecisionRules.js`, `workingCalendarStore.js` | no (out of scope: roles, RFx, invoices, receipts, settings) | — |
| `__fixtures__/`, `dispatcher/`, `flows/`, `fulfilmentRules/`, `policies/` | no | — |

## 6. DROPPED

- "Rupiah shows Indonesian grouping on the English What to order": decided, BL-83.
- "Submit all is enabled on weeks with nothing to submit": not verified (button state not read).
- "The OSIP switch selects show 'Select…' as the value": an innerText artefact of the select; not verified on screen.
- "Make warehouse room and What to order differ on the W36 fill": explained on screen (F-22 done).
- "Would be shows '(no change)' in every cell": TL-D9 kept the row for now.
- "No 'Review ROP after first order' task on Home": by design, no tag has dropped on the sample.
- "The sandbox has no compare": it has, as an unlabelled checkbox (kept as U-22).
- "A saved scenario disappears on reload": BL-30, no durable storage.
- "The Consolidation tab shows another plan (PV-2026-08.2)": IA-B05, labelled "(sample plan)" by D-17.
- "Publish to suppliers has no Publish button": FUX-D1 gate while simulated.
- "PK-PETB-8801 is in bias alarm on the engine too": explained on screen ("New SKU: the engine used SAP's plan", ENG-B107).
- "Gap reads 'Selisih' on the plan check and 'Kekurangan' on the grid in ID": two different figures, and "selisih" is the team's word (Q-file A2).
- "Share 70% on the DA card has no (i)": not verified.
- "Capacity 'Short by' versus the DA 'Gap'": the glossary's Not lines already separate them.

## 7. OPEN QUESTIONS FOR LEVI

1. Until the SAP feeds land, which world is the plan of record per figure: the engine dataset (What to order, Material requirement, Safety stock challenger columns) or the hub sample (LTP, DA, call-offs, OSIP columns)? C-01 proposes labelling both; the choice is yours.
2. BL-207: may the leftover liability stay visible to suppliers before you rule, or should it be PTI-only until then (U-18)?
3. Should Demand anticipation (DA) become the sixth step of the weekly strip, or stay a side page with its own header (U-11, D-19)?
4. BL-138 is parked for RFx; the two forecast sites on the weekly cycle (C-07) could be moved alone. Un-park those two?
5. F-13 / FUX-D4 waits for the engine for the Source column; C-03 shows the "Last published" column misleads today. Add the basis line now (BL-238) or wait?
6. The trigger re-arm rule (DRC-B37) is a build decision: ask the team (L-15) or rule it yourself?
