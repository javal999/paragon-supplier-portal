# BL-233 step 1: term-label inventory

| Field | Value |
|---|---|
| Status | Inventory for review. Levi answered the 27 questions on 2026-10-29 (section 1, TL-D10 to TL-D13); he can still strike out rows that should get no (i). No label or code changes yet |
| Date | 2026-10-29 |
| Spec | `SC-HUB-TERM-LABELS-REQUIREMENTS-2026-10.md` (BR-01 to BR-10, TL-D1 to TL-D9) |
| Code read | branch `docs/term-labels-tooltips` at `de1ac950`; `src/` matches `main` `59199b4f` |
| Scope | Table column headers, grid row labels and KPI card titles (BR-05), on buyer, supplier and admin pages, EN and ID |

---

## 1. Summary

The portal has **1,179 labels** in scope: 897 column headers, 157 grid row labels and 125 KPI card titles. They sit in 191 tables, grids and KPI groups on 67 routes.

- **Important (BR-06):** 592 Y and 587 N.
- **Source checked:** 423 rows have a source wording. 74 of them differ from the source (Differs = Y), and 756 have no source to check (n/a).
- **Clash (BR-02):** on 54 rows, the source's word means something else elsewhere in the hub.
- **ID translates a team English term (BR-04):** 21 rows translate one of the 6 listed terms (DA, carry-over, safety order, ROP). Another 7 translate a team English word that is not on the list (Max, call-off, Uplift, Protection buffer, Strategic buffer, Replenishment cycle). Those 7 are open in question 10.
- **Status:** 1,010 Keep; 49 Change [Proposed]; 21 Decided (TL-D1 10, TL-D8 5, TL-D6 4, TL-D9 2); 99 Ask Levi.
- **Not looked up:** the 57 admin rule-value rows have Source wording "not looked up"; question 5 ruled they get no (i), so they are not looked up.

**Levi's answers, 2026-10-29** (TL-D10 to TL-D13 in the spec). Every row marked Ask Levi is settled by the answer to its question below, and the wave builder sets the row's Status when it builds that page. Q15, Q22, Q23 and Q24 change what a cell shows, not only its label, so they are display fixes inside BL-233, built in the wave that touches the page (RFx last).

| # | Question | Answer |
|---|---|---|
| | *Scope (BR-05), TL-D10* | |
| 1 | /buyer/inventory summary tiles (High risk, PTI stock below PTI ROP, Supplier figures out of date, No lead time on record): KPI cards or filters? | **Filters, out.** No (i) |
| 2 | /buyer/scorecard and /supplier/performance KPI tiles named from sample data (OTDR, QNCR, Inventory DOS, POA Response Time) | **In now.** Add i18n keys (EN and ID) and an (i); a definition with no source comes to Levi as a question (BR-10) |
| 3 | /buyer/scorecard screen-reader-only chart table headers | **Out.** No (i); the wording rule (TL-R1) still applies |
| 4 | Headers over input cells: "Quantity" (/supplier/invoices), "Confirmed" (/supplier/orders), "Shipped quantity" (/supplier/shipments) | **Column headers, in** |
| 5 | /buyer/admin/tolerances and /buyer/admin/alert-thresholds, 57 rule-value rows with a hint line | **No (i): the hint line is enough.** The rows still follow TL-R1; their source wording stays "not looked up" |
| 6 | /buyer/alerts rule names | **Every alert rule name is a row with an (i)**, not only DA and ROP Supplier |
| 7 | /buyer/demand-anticipation-history facts list and CSV headers | **Facts list in; CSV headers out** (no tooltip in a file), but the CSV uses the same words as the screen |
| 8 | RFI and RFP Compare tab summary-card facts (Deviations, Lowest price, Answered) | **In, built in the last wave** while RFx is paused |
| 9 | RFP term-catalog rows on /buyer/rfp/:rfpId and /supplier/rfp | **In, built in the last wave** |
| | *BR-04 reach, TL-D11* | |
| 10 | Is the TL-D6 list closed? | **Open rule:** any term the team writes in English inside Indonesian text stays English in the ID locale. Now covers FG demand, Max, Firm, call-off, lead time, Uplift, Protection buffer, Strategic buffer, plus the 6 in TL-D6 |
| | *Wording, TL-D12* | |
| 11 | "Max" (/buyer/safety-stock, /buyer/order-plan), "Max stock" (/buyer/fs-reconcile) | **Rename to the team's "Max Stock" and "Max Stock Supplier"** |
| 12 | /buyer/what-if "PR need" | **Rename to "PR Generated"** |
| 13 | /buyer/what-if "Arriving" | **Rename to "Incoming"**; tooltip "Not Incoming DA (the supplier-confirmed figure, DRC-8)" |
| 14 | /buyer/collaboration "Gap" | **Rename to "Commitment gap"** (CR-22) |
| 15 | /buyer/reschedule warehouse fill, status header repeats "With the selection" | **Header "Status"** (label bug fix) |
| 16 | /buyer/goods-receipt line "Acc", ID "Disetujui" | **EN "Accepted", ID "Diterima"**; "Disetujui" stays for the receipt's Approved status |
| 17 | Invoices: "Disputed" (buyer) and "Returned" (supplier), same key | **One word: "Disputed"** on both sides |
| 18 | /buyer/invoices "3-way match" vs supplier "Match" | **"3-way match" on both sides** |
| 19 | /supplier/goods-receipts "Discrepancy" and "Difference" both "Selisih" | **Distinct:** "Difference" = "Selisih", "Discrepancy" = "Ketidaksesuaian" |
| 20 | RFI/RFP/RFQ wizards "Certificates" | **Rename to "Certificate validity"**, last wave |
| 21 | /buyer/rfq "Est. Value" shows the buyer's budget | **Rename to "Budget"** |
| 22 | /buyer/rfq Awards history "Award date" shows the award deadline | **Fix the value:** show the actual award date, last wave |
| 23 | /buyer/rfq Awards history "Award value" shows the estimated value | **Fix the value:** show the awarded amount, last wave |
| 24 | /buyer/rfq/:rfqId "vs Should-Cost", model parked | **Hide the row** until the should-cost model resumes |
| 25 | Delivery Agreement card KPI "Remaining", ID "Sisa" | **ID "Sisa kuantitas"**, so it no longer reads as sisa DA |
| 26 | /buyer/suppliers "Tier" holds channel values | **Rename to "Channel"** |
| | *No source, TL-D13* | |
| 27 | "After the check" (DA history), "Called off, not yet shipped" (/buyer/fs-reconcile) | **Keep for now; add both to the Material Planning team's next question list**, as TL-D9 did |

**Calls made in this inventory:**
- Plain record amounts and generic Status columns are Important = N; computed measures and KPI counts are Y. The alternative is Y for every quantity.
- A header repeated in sibling tables of 1 component (reschedule ProposalTable) is listed once.
- Text drawn by a shared component is listed under the page that passes it.
- The supplier-applications page is treated as onboarding (colleague-owned).
- Uplift, Protection buffer and Strategic buffer are marked Ask Levi, not Decided (TL-D6), because TL-D6 names only 6 terms.

**Citation key.** Q-file = `analysis/osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md`; [MoM] n and [PPT] slide n are as that file cites them. SHR = `SUPPLIER-HUB-REQUIREMENTS.md`, RFXI = `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, DG = `DECISION-GUIDE.md`, KMN = `KICKOFF-MEETING-NOTES.md`, DRC = `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md`, CAP = `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md`, all under `docs/supplier-hub/`. Code paths are relative to `src/`.

---

## 2. Inventory

One table per table, grid or KPI group. The heading gives the route, the group and the page file.

## Page: /buyer/demand-anticipation — Demand anticipation weeks grid — `pages-v2/BuyerDemandAnticipation/index.jsx`

Q-file = `analysis/osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md`. Hub docs under `docs/supplier-hub/`.

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | `demandAnt.grid.corner` | N | n/a | n/a | N |  | Keep | Grid corner over the row labels |
| column | Month | Bulan | `weekGrid.month.corner` | N | n/a | n/a | N |  | Keep | Shared WeekGrid corner, Monthly view only; also on /buyer/capacity, /supplier/capacity, history, what-if |
| row | LTP | LTP | `demandAnt.row.ltp` | Y | "LTP W33" (Q-file:18, A1) | N | N |  | Keep | Gets a tooltip (spec §3) |
| row | FG demand | Permintaan FG | `ltpFg.row.fgDemand` | Y | "LTP vs FG Demand" (Q-file:71, A11); "FG demand" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:123, DRC-18) | N | N |  | Ask Levi | ID translates the team's English "FG demand"; BR-04 list may not cover it |
| row | LTP − FG demand | LTP − permintaan FG | `ltpFg.row.ltpLessFg` | Y | "LTP vs FG Demand" (Q-file:71, A11) | N | N |  | Keep | ID "FG demand" wording follows the FG demand ruling |
| row | Consumption, {{weeks}}-week average | Konsumsi, rata-rata {{weeks}} minggu | `ltpFg.row.consumptionAverage` | Y | "moving average consumption" (Q-file:72, A11); 13 weeks (SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10.md:46) | Y | N |  | Change [Proposed] | Source says "moving average"; label drops "moving" |
| row | Safety order | Safety order | `demandAnt.row.safety` | Y | "safety order" (Q-file:17, A1; Q-file:91, B2) | N | N |  | Keep | Not safety stock (spec §3); gets a tooltip |
| row | Carried in | Sisa dibawa masuk | `demandAnt.row.carriedIn` | Y | "carry-over sisa DA" (Q-file:52, A8) | Y | N | sisa DA (Material Planning team, Q-file A8) | Decided (TL-D8) | Becomes "Carry-over" in EN and ID |
| row | Demand anticipation | Antisipasi permintaan | `demandAnt.row.figure` | Y | DA (Q-file:15, section A) | Y | Delivery Agreement, contract pages (`pages-v2/BuyerContractDetail.jsx:5-9`) | DA (Material Planning team, Q-file section A) | Decided (TL-D1) | Becomes "Demand anticipation (DA)" in EN and ID |
| row | Would be | Jika dihitung ulang | `demandAnt.row.wouldBe` | Y | Team: none found; hub: "would be" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:243, CAP-10 BR-03) | N | N |  | Decided (TL-D9) | Kept; asked of the team |
| row | Surplus absorbed | Kelebihan diserap | `demandAnt.row.absorbed` | Y | Team: none found; hub: "surplus absorbed in the last week" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:106, DRC-4) | N | N |  | Decided (TL-D9) | Kept; asked of the team |
| row | Recorded consumption | Pemakaian tercatat | `consumption.row.recorded` | Y | "recorded consumption" (SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md:87, §5 CAP-11) | N | N |  | Keep | ID says "Pemakaian"; the average row says "Konsumsi" |
| row | Open supply | Pasokan terbuka | `supplyGap.row.openSupply` | Y | "Open supply" (SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md:112, CAP-12) | N | N |  | Keep | Released call-offs by need week; not OSPO |
| row | Gap | Kekurangan | `supplyGap.row.gap` | Y | "Gap. gap(w) = demand anticipation(w) − open supply(w)" (SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md:115) | N | Capacity gap (LTP above allocated): status "Gap" and row "Short by", /buyer/capacity; plan-check gap Total DA − Total OSPO (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:142, DRC-4) |  | Keep | Tooltip should say which gap |

## Page: /supplier/demand-anticipation — supplier DA grid — `pages-v2/SupplierDemandAnticipation.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | `demandAnt.grid.corner` | N | n/a | n/a | N |  | Keep |  |
| row | LTP | LTP | `demandAnt.row.ltp` | Y | "LTP W33" (Q-file:18, A1) | N | N |  | Keep |  |
| row | Safety order | Safety order | `demandAnt.row.safety` | Y | "safety order" (Q-file:17, A1) | N | N |  | Keep | Not safety stock (spec §3) |
| row | Carried in | Sisa dibawa masuk | `demandAnt.row.carriedIn` | Y | "carry-over sisa DA" (Q-file:52, A8) | Y | N | sisa DA (Material Planning team, Q-file A8) | Decided (TL-D8) | Becomes "Carry-over" in EN and ID |
| row | Demand anticipation | Antisipasi permintaan | `demandAnt.row.figure` | Y | DA (Q-file:15, section A) | Y | Delivery Agreement, contract pages (`pages-v2/BuyerContractDetail.jsx:5-9`) | DA (Material Planning team, Q-file section A) | Decided (TL-D1) | Becomes "Demand anticipation (DA)" |

## Page: /buyer/demand-anticipation-history — publication weeks grid — `pages-v2/BuyerDemandAnticipationHistory.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | `daHist.col.week` | N | n/a | n/a | N |  | Keep | Grid corner |
| row | LTP | LTP | `daHist.col.ltp` | Y | "LTP W33" (Q-file:18, A1) | N | N |  | Keep | Keys named `col.*`; rendered as WeekGrid rows |
| row | Safety order | Safety order | `daHist.col.safety` | Y | "safety order" (Q-file:17, A1) | N | N |  | Keep |  |
| row | Carried in | Pindahan masuk | `daHist.col.carriedIn` | Y | "carry-over sisa DA" (Q-file:52, A8) | Y | N | sisa DA (Material Planning team, Q-file A8) | Decided (TL-D8) | Becomes "Carry-over"; ID differs from the main grid's "Sisa dibawa masuk" |
| row | Demand anticipation | Antisipasi permintaan | `daHist.col.da` | Y | DA (Q-file:15, section A) | Y | Delivery Agreement, contract pages (`pages-v2/BuyerContractDetail.jsx:5-9`) | DA (Material Planning team, Q-file section A) | Decided (TL-D1) | Becomes "Demand anticipation (DA)" |
| row | After the check | Setelah pemeriksaan | `daHist.col.daInForce` | Y | none found | n/a | N |  | Ask Levi | DA after the plan check absorbed surplus; no source names it |

## Page: /buyer/demand-anticipation-history — CSV export headers — `pages-v2/BuyerDemandAnticipationHistory.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Carried in | Pindahan masuk | `daHist.csv.carriedIn` | Y | "carry-over sisa DA" (Q-file:52, A8) | Y | N | sisa DA (Material Planning team, Q-file A8) | Decided (TL-D8) | Spec §3 names this CSV header |
| column | Demand anticipation | Antisipasi permintaan | `daHist.csv.demandAnticipation` | Y | DA (Q-file:15, section A) | Y | Delivery Agreement, contract pages (`pages-v2/BuyerContractDetail.jsx:5-9`) | DA (Material Planning team, Q-file section A) | Decided (TL-D1) | Export header, `BuyerDemandAnticipationHistory.jsx:129` |
| column | Demand anticipation after the check | Antisipasi permintaan setelah pemeriksaan | `daHist.csv.demandAnticipationInForce` | Y | DA (Q-file:15); "after the check": none found | Y | Delivery Agreement, contract pages | DA (Material Planning team, Q-file section A) | Decided (TL-D1) | DA part follows TL-D1; "after the check" follows the grid-row ruling |

## Page: /buyer/capacity — capacity weeks grid per supplier × planning group — `pages-v2/BuyerCapacity.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week of | Minggu mulai | `inv.capacity.col.week` | N | n/a | n/a | N |  | Keep | Grid corner |
| row | LTP, current forecast | LTP, prakiraan saat ini | `inv.capacity.row.ltp` | Y | "LTP, current forecast" (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md:121) | N | N |  | Keep |  |
| row | Allocated | Dialokasikan | `inv.capacity.row.allocated` | Y | "Allocated" (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md:122) | N | N | Production limit (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:357, DRC-B27) | Keep | Shown when the production-limit source is `sadrFeed` |
| row | Production limit (allocated capacity) | Batas produksi (kapasitas dialokasikan) | `buffers.productionLimit.row` | Y | "Production Limit" (Q-file:202, E3); "production limit" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:112, DRC-9b) | N | N | Allocated (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:357, DRC-B27) | Keep | Same row as Allocated under the default; carries a Provisional line |
| row | Additional capacity | Kapasitas tambahan | `inv.capacity.row.upside` | Y | "Additional capacity" ("Kapasitas tambahan") (SUPPLIER-HUB-REQUIREMENTS.md:1356, BR-05) | N | N |  | Keep |  |
| row | BE = capacity + additional | BE = kapasitas + tambahan | `inv.capacity.row.be` | Y | "BE, the supplier's total for a week, is the capacity plus the additional capacity" (SUPPLIER-HUB-REQUIREMENTS.md:1360, BR-09) | N | N |  | Keep |  |
| row | LTP against capacity | LTP terhadap kapasitas | `inv.capacity.col.ltpCheck` | Y | "LTP against capacity" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:89, CAP-1 BR-04) | N | N |  | Keep | Status row: Within capacity / Needs additional / Cannot be supplied |
| row | Short by | Kurang | `inv.capacity.row.gap` | Y | "Short by" (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md:126) | N | N | gap (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md:126) | Keep | Not the DA grid "Gap" (DA − open supply) |
| row | Reason | Alasan | `inv.capacity.col.reason` | N | "Reason" (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md:127) | n/a | N |  | Keep | Supplier's shortfall reason name |
| row | PTI’s decision | Keputusan PTI | `capDecision.row` | Y | none found (decision: DECISION-GUIDE.md:415, INV-D8) | n/a | N |  | Keep | Buyer cells hold the accept/ask actions |

## Page: /supplier/capacity — capacity weeks grid per planning group — `pages-v2/SupplierCapacity.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week of | Minggu mulai | `inv.capacity.col.week` | N | n/a | n/a | N |  | Keep | Grid corner |
| row | LTP, current forecast | LTP, prakiraan saat ini | `inv.capacity.row.ltp` | Y | "LTP, current forecast" (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md:154) | N | N |  | Keep |  |
| row | Allocated | Dialokasikan | `inv.capacity.row.allocated` | Y | "Allocated" (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md, Table C) | N | N | Production limit (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:357, DRC-B27) | Keep | Input row; no production-limit relabel on this page |
| row | Additional capacity | Kapasitas tambahan | `inv.capacity.row.upside` | Y | "Additional capacity" (SUPPLIER-HUB-REQUIREMENTS.md:1356, BR-05) | N | N |  | Keep | Input row |
| row | BE = capacity + additional | BE = kapasitas + tambahan | `inv.capacity.row.be` | Y | BE (SUPPLIER-HUB-REQUIREMENTS.md:1360, BR-09) | N | N |  | Keep |  |
| row | LTP against capacity | LTP terhadap kapasitas | `inv.capacity.col.ltpCheck` | Y | "LTP against capacity" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:89) | N | N |  | Keep |  |
| row | Reason | Alasan | `inv.capacity.col.reason` | N | "Reason" (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10.md, Table C) | n/a | N |  | Keep |  |
| row | PTI’s decision | Keputusan PTI | `capDecision.row` | Y | none found (DECISION-GUIDE.md:415, INV-D8) | n/a | N |  | Keep | Read only; hidden until PTI accepted a week |

## Page: /buyer/what-if — Results table — `pages-v2/BuyerWhatIfSandbox/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Figure | Angka | `whatIf.col.figure` | N | n/a | n/a | N |  | Keep | Header over the row labels |
| column | Current plan | Rencana saat ini | `whatIf.col.plan` | N | n/a | n/a | N |  | Keep |  |
| column | This scenario | Skenario ini | `whatIf.col.scenario` | N | n/a | n/a | N |  | Keep |  |
| row | ROP Order | ROP Order | `whatIf.row.ropOrder` | Y | "ROP Order" (Q-file:132, B9) | N | N |  | Keep |  |
| row | ROP Fisik | ROP Fisik | `whatIf.row.ropFisik` | Y | "ROP Fisik" (Q-file:83, B1) | N | N |  | Keep |  |
| row | Max | Max | `whatIf.row.max` | Y | "Batas Max" (Q-file:124, B8) | N | Supplier max stock, feedstock reconcile (`lib/i18n/feedstockReconcile.js:25`) |  | Keep | Adds "(typed)" when overridden |
| row | Safety order | Safety order | `whatIf.row.safetyOrder` | Y | "safety order (ROP Order)" (Q-file:91, B2) | N | N |  | Keep | Not safety stock (spec §3) |
| row | Demand anticipation over the lead time | Antisipasi permintaan sepanjang lead time | `whatIf.row.totalDa` | Y | "Total DA" (Q-file:23, A2); "total DA over the lead time" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:34) | Y | Delivery Agreement, contract pages | Total DA (Material Planning team, Q-file A2) | Decided (TL-D1) | Reads "Demand anticipation (DA) over the lead time"; ID keeps DA |
| row | PR need | Kebutuhan PR | `whatIf.row.prNeed` | Y | "PR Generated" (Q-file:241, G; MoM 1B); hub "PR need" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:75) | Y | N |  | Ask Levi | Shows −PR generated; team word is "PR Generated" |
| row | Plan check: PR recommendation | Pemeriksaan rencana: rekomendasi PR | `whatIf.row.prRecommendation` | Y | "shortfall becomes a PR recommendation" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:106, DRC-4) | N | N |  | Keep |  |
| row | Call-offs the trigger would draft | Call-off yang akan dibuat pemicu | `whatIf.row.callOffs` | Y | "Call-off trigger at ROP Fisik" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:118, DRC-13) | N | N |  | Keep |  |
| row | Trigger: create a PR in SAP for | Pemicu: buat PR di SAP sebesar | `whatIf.row.triggerPr` | Y | "SAP PR recommendation when the umbrella PO runs out" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:118, DRC-13) | N | N |  | Keep |  |
| row | Remainder this week | Sisa minggu ini | `whatIf.row.remainder` | Y | "Remainder(w) = DA(w) − call-off(w)" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:133); "sisa = DA − call-off" (Q-file:53, A8) | N | "sisa DA" is the Also called of Carry-over (TL-D8) | sisa (Material Planning team, Q-file A8) | Keep | Tooltip must separate remainder from carry-over |
| row | Carried over | Dipindahkan (carry-over) | `whatIf.row.carried` | Y | "carry-over" (Q-file:52, A8; SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:190) | Y | N | sisa DA (Material Planning team, Q-file A8) | Decided (TL-D8) | TL-D8 rules the carried quantity: "Carry-over"; ID should read Carry-over |
| row | First shortage week | Minggu kekurangan pertama | `whatIf.row.firstShortageWeek` | Y | "first shortage week" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:190, DRC-17) | N | N |  | Keep |  |
| row | Weeks above Max | Minggu di atas Max | `whatIf.row.weeksAboveMax` | Y | "weeks above max" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:190, DRC-17) | N | N |  | Keep |  |

## Page: /buyer/what-if — Weeks grid — `pages-v2/BuyerWhatIfSandbox/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | `whatIf.grid.week` | N | n/a | n/a | N |  | Keep | Grid corner |
| row | LTP (edit) | LTP (ubah) | `whatIf.grid.ltp` | Y | "LTP W33" (Q-file:18, A1) | N | N |  | Keep | "(edit)" marks the input row |
| row | Demand anticipation, current plan | Antisipasi permintaan, rencana saat ini | `whatIf.grid.daPlan` | Y | DA (Q-file:15, section A) | Y | Delivery Agreement, contract pages | DA (Material Planning team, Q-file section A) | Decided (TL-D1) | Reads "Demand anticipation (DA), current plan" |
| row | Demand anticipation, this scenario | Antisipasi permintaan, skenario ini | `whatIf.grid.da` | Y | DA (Q-file:15, section A) | Y | Delivery Agreement, contract pages | DA (Material Planning team, Q-file section A) | Decided (TL-D1) | Reads "Demand anticipation (DA), this scenario" |
| row | Call-offs drafted | Call-off dibuat | `whatIf.grid.drafted` | Y | "call-offs" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:190) | N | N |  | Keep |  |
| row | Arriving | Tiba | `whatIf.grid.incoming` | Y | "Simulasi SOH w/ incoming" (Q-file:48, A7) | Y | "Incoming DA" = supplier confirmation (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:110, DRC-8) |  | Ask Levi | Team word "incoming" collides with "Incoming DA" |
| row | PR recommended | PR direkomendasikan | `whatIf.grid.prQty` | Y | "SAP PR recommendation" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:118, DRC-13) | N | N |  | Keep |  |
| row | Projected SOH, current plan | Proyeksi SOH, rencana saat ini | `whatIf.grid.sohPlan` | Y | "projected SOH" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:190); "Simulasi SOH" (Q-file:48, A7) | N | N |  | Keep |  |
| row | Projected SOH, this scenario | Proyeksi SOH, skenario ini | `whatIf.grid.soh` | Y | "projected SOH" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:190) | N | N |  | Keep |  |

## Page: /buyer/call-offs — Series preview — `pages-v2/BuyerCallOffs/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | # | # | hard-coded pages-v2/BuyerCallOffs/components/SeriesPreview.jsx:21 | N | n/a | n/a | N |  | Keep | Row number |
| column | Quantity | Kuantitas | co.col.quantity | N | n/a | n/a | N |  | Keep | Plain amount |
| column | Need date | Tanggal kebutuhan | co.col.needDate | N | n/a | n/a | N |  | Keep | Date |

## Page: /buyer/call-offs — Umbrella line call-offs — `pages-v2/BuyerCallOffs/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Call-off | Call-off | co.col.callOff | N | n/a | n/a | N |  | Keep | Identifier |
| column | Type | Jenis | co.col.type | N | n/a | n/a | N |  | Keep |  |
| column | Quantity | Kuantitas | co.col.quantity | N | n/a | n/a | N |  | Keep | Plain amount |
| column | Need date | Tanggal kebutuhan | co.col.needDate | N | n/a | n/a | N |  | Keep | Date |
| column | Confirmation | Konfirmasi | co.col.confirmation | N | n/a | n/a | N |  | Keep | Plain status |
| column | Delivery | Pengiriman | co.col.delivery | N | n/a | n/a | N |  | Keep | Plain status |
| column | Action | Tindakan | co.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/call-offs — Blanket POs running out (`callOffs/blanketRunOutDisplay.jsx` RunningOutList) — `pages-v2/BuyerCallOffs/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Blanket PO | PO induk | co.runOut.col.po | N | n/a | n/a | N |  | Keep | Identifier |
| column | Material | Material | co.runOut.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Remaining | Sisa | co.runOut.col.remaining | Y | "Remaining on umbrella PO" (SUPPLIER-HUB-REQUIREMENTS.md:149 CR-04); "remaining" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:220) | N | N |  | Keep | Quantity or value per line basis (CR-04) |
| column | Runs out | Habis | co.runOut.col.runOut | Y | "run-out week" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:223 CAP-9 BR-03) | N | N |  | Keep |  |
| column | New PO needed by | PO baru diperlukan paling lambat | co.runOut.col.newPoBy | Y | "new PO needed by" week (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:223) | N | N |  | Keep | Run-out week minus PO lead time |
| column | PO lead time | Waktu tunggu PO | co.runOut.col.leadTime | Y | "PO lead time" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:223) | N | N |  | Keep |  |

## Page: /supplier/call-offs — Call-off table — `pages-v2/SupplierCallOffs/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Call-off | Call-off | co.col.callOff | N | n/a | n/a | N |  | Keep | Identifier |
| column | Purchase order | Pesanan pembelian | co.col.po | N | n/a | n/a | N |  | Keep | Second line under Call-off |
| column | Material | Material | co.col.material | N | n/a | n/a | N |  | Keep |  |
| column | PIC | PIC | pic.col | N | n/a | n/a | N |  | Keep | Second line, rendered by materials/picDisplay.jsx PicHeader |
| column | Quantity | Kuantitas | co.col.quantity | N | n/a | n/a | N |  | Keep | Plain amount |
| column | Need date | Tanggal kebutuhan | co.col.needDate | N | n/a | n/a | N |  | Keep | Date |
| column | Type | Jenis | co.col.type | N | n/a | n/a | N |  | Keep | Second line under Need date |
| column | Confirmation | Konfirmasi | co.col.confirmation | N | n/a | n/a | N |  | Keep | Plain status |
| column | Confirm by | Konfirmasi paling lambat | co.col.confirmBy | N | n/a | n/a | N |  | Keep | Date; second line under Confirmation |
| column | Delivery | Pengiriman | co.col.delivery | N | n/a | n/a | N |  | Keep | Plain status |
| column | Action | Tindakan | co.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/collaboration — Move demand panel — `pages-v2/BuyerCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | fc.pti.gaps.move.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Quantity to move | Kuantitas yang dipindahkan | fc.pti.gaps.move.qty | N | n/a | n/a | N |  | Keep | Input column |
| column | Headroom this period | Sisa kapasitas periode ini | fc.pti.gaps.move.headroom | Y | "capacity headroom that week (BE − LTP)" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:207 CAP-8 BR-01) | N | N |  | Keep | Tooltip formula: BE − LTP |

## Page: /buyer/collaboration — Commitment grid (via CoverageDetails) — `pages-v2/BuyerCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier and material | Pemasok dan material | fc.col.supplierMaterial | N | n/a | n/a | N |  | Keep | Other columns are period dates; rows are data |

## Page: /buyer/collaboration — Exceptions — `pages-v2/BuyerCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | # | # | hard-coded pages-v2/BuyerCommitments/components/ExceptionsSection.jsx:52 | N | n/a | n/a | N |  | Keep | Rank |
| column | Supplier | Pemasok | fc.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | fc.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Period | Periode | fc.col.period | N | n/a | n/a | N |  | Keep |  |
| column | Forecast | Prakiraan | fc.col.forecastShort | Y | "forecast" (SUPPLIER-HUB-REQUIREMENTS.md:167 CR-22) | N | N |  | Keep |  |
| column | Commitment | Komitmen | fc.col.commitmentShort | Y | "Commitment" (SUPPLIER-HUB-REQUIREMENTS.md:167 CR-22) | N | N |  | Keep |  |
| column | Gap | Selisih | fc.col.gap | Y | "Commitment gap colour" = commitment ÷ forecast (SUPPLIER-HUB-REQUIREMENTS.md:167 CR-22) | Y | Gap = DA − open supply, What to order "Below demand anticipation" (ID "Kekurangan"); plan-check gap Total DA − Total OSPO (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:142) |  | Ask Levi | Source name is "Commitment gap"; same word, different figure on What to order |
| column | Status | Status | fc.col.status | N | n/a | n/a | N |  | Keep | Plain status |
| column | Commitment due | Tenggat komitmen | fc.col.due | Y | "Commitments are due per CR-26" (SUPPLIER-HUB-REQUIREMENTS.md:1662 BR-07) | N | N |  | Keep | Rule: 1 working day Firm, 3 Trade-off/Forecast |
| column | Days of supply | Hari persediaan | fc.col.daysOfSupply | Y | "Days of supply: SOH ÷ average daily demand" (SUPPLIER-HUB-REQUIREMENTS.md:146 CR-01) | N | N |  | Keep |  |
| column | Actions | Tindakan | fc.col.actions | N | n/a | n/a | N |  | Keep |  |
| column | Details | Rincian | fc.col.details | N | n/a | n/a | N |  | Keep | Screen-reader only header |

## Page: /buyer/collaboration — Supplier coverage — `pages-v2/BuyerCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | fc.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | fc.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Firm demand | Kebutuhan pasti | fc.col.firmDemand | Y | "firm demand" (SUPPLIER-HUB-REQUIREMENTS.md:148 CR-03) | N | N |  | Ask Levi | ID translates "Firm"; stabilise ID keeps "Firm" in English |
| column | Coverage | Cakupan | fc.col.coverage | Y | "Supplier coverage" = (supplier SOH + incoming) ÷ firm demand (SUPPLIER-HUB-REQUIREMENTS.md:148 CR-03) | N | N |  | Keep | Bands: Covered ≥1.0, At risk 0.8–1.0, Uncovered <0.8 |
| column | Principal lead time | Waktu tunggu prinsipal | fc.col.principalLeadTime | Y | "principal lead time" (SUPPLIER-HUB-REQUIREMENTS.md:1555 BR-05) | N | N |  | Keep |  |

## Page: /buyer/order-plan — Below demand anticipation — `pages-v2/BuyerOrderPlan/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier · Material | Pemasok · Material | supplyGap.col.supplier + supplyGap.col.material | N | n/a | n/a | N |  | Keep | One header, two keys |
| column | Week | Minggu | supplyGap.col.week | N | n/a | n/a | N |  | Keep |  |
| column | Demand anticipation | Antisipasi permintaan | supplyGap.col.demandAnticipation | Y | "DA" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:17-18 A1; DRC-PROPOSAL-2026-10-19.md:133) | Y | Delivery Agreement (also DA), contract pages (BuyerContractDetail) | DA (Material Planning team, OSIP playbook) | Decided (TL-D1) | Becomes "Demand anticipation (DA)" in EN and ID |
| column | Open supply | Pasokan terbuka | supplyGap.col.openSupply | Y | "Open supply (released call-offs, by need date)" (SC-HUB-SUPPLY-GAP-CARRY-REQUIREMENTS-2026-10.md:29; CAP-D15, SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md:160) | N | Team's "supply" = SOH + OSPO + PR (SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10.md:44 A2) |  | Keep | Tooltip "Not" line: not OSPO |
| column | Gap | Kekurangan | supplyGap.col.gap | Y | "gap(w) = max(0, demand anticipation(w) − open supply(w))" (SC-HUB-SUPPLY-GAP-CARRY-REQUIREMENTS-2026-10.md:20); team "gap (kekurangan)" (FOLLOWUP-TIM-MATERIAL-2026-10-26.md:24) | N | Commitment gap (commitment ÷ forecast), /buyer/collaboration Exceptions (ID "Selisih") |  | Keep | Holds the carried gap (CAP-D19/D20) |
| column | Proposal | Usulan | supplyGap.col.proposal | Y | Call-off on oldest blanket line, else "New PO needed" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:291 CAP-D15) | N | N |  | Keep |  |

## Page: /buyer/order-plan — ROP Fisik PR recommendations — `pages-v2/BuyerOrderPlan/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | co.trigger.pr.col.material | N | n/a | n/a | N |  | Keep |  |
| column | PTI stock on hand (all plants) | Stok PTI (semua pabrik) | co.trigger.soh | Y | "SOH" (DRC-PROPOSAL-2026-10-19.md:173 BR-05, all plants combined; PERTANYAAN-TIM-MATERIAL-2026-10-16.md:37-38 A5) | Y | Warehouse stock on hand, /buyer/reschedule fill table | SOH (Material Planning team, questions file A5) | Change [Proposed] | Propose "PTI stock on hand (SOH), all plants", TL-D1 pattern |
| column | ROP Fisik | ROP Fisik | co.trigger.ropFisik | Y | "ROP Fisik" (DRC-PROPOSAL-2026-10-19.md:46, :160; PERTANYAAN-TIM-MATERIAL-2026-10-16.md:37-39) | N | N |  | Keep |  |
| column | Max | Maks | co.trigger.max | Y | "Max" / "Max Stock" (DRC-PROPOSAL-2026-10-19.md:164; PERTANYAAN-TIM-MATERIAL-2026-10-16.md:124-125 B8) | N | N |  | Ask Levi | Team writes "Max" in ID text; ID shows "Maks" |
| column | Recommendation | Rekomendasi | co.trigger.pr.col.recommendation | N | n/a | n/a | N |  | Keep | Action text cell |

## Page: /buyer/order-plan — Recommended orders — `pages-v2/BuyerOrderPlan/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | op.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | op.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Receive in | Diterima pada | op.col.week | N | n/a | n/a | N |  | Keep | Week |
| column | Release in | Dirilis pada | op.col.release | N | n/a | n/a | N |  | Keep | Week |
| column | Quantity | Jumlah | op.col.quantity | N | n/a | n/a | N |  | Keep | Plain amount; ID differs from "Kuantitas" elsewhere |
| column | Why this size | Alasan ukuran ini | op.col.reason | Y | "shows why it was chosen: the cost it saved and the constraint that bound it" (FORECAST-ENGINE-REQUIREMENTS.md:415 E14-05 BR-04) | N | N |  | Keep |  |
| column | Last week’s plan | Rencana minggu lalu | op.col.previous | N | n/a | n/a | N |  | Keep | Previous quantity |
| column | Sized by | Dihitung dengan | op.col.method | Y | Joint sizing or single-material fallback (FORECAST-ENGINE-REQUIREMENTS.md:413 E14-05 BR-02); "sized by E14-05" (:287) | N | N |  | Keep |  |
| column | Action | Tindakan | op.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/order-plan — Weekly fill table — `pages-v2/BuyerOrderPlan/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | op.fill.col.week | N | n/a | n/a | N |  | Keep |  |
| column | Order plan | Rencana pesanan | op.fill.col.plan | Y | "projected warehouse fill" (FORECAST-ENGINE-REQUIREMENTS.md:400 E14-05) | N | N |  | Keep | Shows fill % and pallets under this plan |
| column | Interim round-up | Pembulatan sementara | op.fill.col.interim | Y | none found | n/a | N |  | Keep | Needs a definition source for the tooltip |
| column | Lowest possible | Terendah yang mungkin | op.fill.col.lowest | Y | "the lowest possible stock" (FORECAST-ENGINE-REQUIREMENTS.md:1062 ENG-B57) | N | N |  | Keep |  |
| column | Against 80% | Terhadap 80% | op.fill.col.status | Y | "projected warehouse fill against 80%" (FORECAST-ENGINE-REQUIREMENTS.md:447) | N | N |  | Keep |  |
| column | Rented pallets | Palet sewa | op.fill.col.rented | Y | "rented space" (FORECAST-ENGINE-REQUIREMENTS.md:400) | N | N |  | Keep |  |
| column | Rented space cost | Biaya ruang sewa | op.fill.col.rentCost | Y | "rented space ... with its cost" (FORECAST-ENGINE-REQUIREMENTS.md:400) | N | N |  | Keep |  |

## Page: /buyer/order-plan — Warehouse KPIs — `pages-v2/BuyerOrderPlan/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Recommended orders | Pesanan yang disarankan | op.kpi.orders | N | n/a | n/a | N |  | Keep | Plain count |
| kpi | Highest projected fill | Isi tertinggi yang diproyeksikan | op.kpi.peak | Y | "projected warehouse fill" (FORECAST-ENGINE-REQUIREMENTS.md:400) | N | N |  | Keep |  |
| kpi | Rented pallet-weeks | Palet-minggu sewa | op.kpi.rented | Y | "pallet-weeks" (FORECAST-ENGINE-REQUIREMENTS.md:850) | N | N |  | Keep |  |
| kpi | Rented space cost | Biaya ruang sewa | op.kpi.rentCost | Y | "rented-space cost" (FORECAST-ENGINE-REQUIREMENTS.md:447) | N | N |  | Keep |  |

## Page: /buyer/reschedule — Warehouse fill table — `pages-v2/BuyerReschedule/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | rs.fill.col.week | N | n/a | n/a | N |  | Keep |  |
| column | Now | Sekarang | rs.fill.col.now | Y | "projected fill before ... the proposals" (FORECAST-ENGINE-REQUIREMENTS.md:858 E14-13) | N | N |  | Keep |  |
| column | With the selection | Dengan pilihan | rs.fill.col.selected | Y | "projected fill ... after the proposals" (FORECAST-ENGINE-REQUIREMENTS.md:858) | N | N |  | Keep |  |
| column | With every proposal | Dengan semua usulan | rs.fill.col.allRelief | Y | "projected fill ... after the proposals" (FORECAST-ENGINE-REQUIREMENTS.md:858) | N | N |  | Keep |  |
| column | Stock on hand | Stok di tangan | rs.fill.col.onHand | Y | "Stock on hand alone is above capacity" (FORECAST-ENGINE-REQUIREMENTS.md:929) | N | PTI SOH all plants (ROP Fisik trigger), /buyer/order-plan |  | Keep | Fill % from stock on hand |
| column | With the selection | Dengan pilihan | rs.fill.col.status | Y | none found | n/a | N |  | Ask Levi | Status column repeats the "With the selection" header |

## Page: /buyer/reschedule — Later deliveries (push-out detail, via DecisionControl) — `pages-v2/BuyerReschedule/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | rs.decide.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Delivery | Pengiriman | rs.decide.col.delivery | N | n/a | n/a | N |  | Keep | PO or call-off |
| column | Week | Minggu | rs.decide.col.week | N | n/a | n/a | N |  | Keep |  |
| column | Quantity | Kuantitas | rs.decide.col.quantity | N | n/a | n/a | N |  | Keep | Plain amount |
| column | Moved after the week | Dipindah setelah minggu itu | rs.decide.col.safety | Y | none found | n/a | N |  | Keep | Cells show whether safety stock holds |

## Page: /buyer/reschedule — Proposal tables (relief, shortage, no-saving: 3 renders, same headers) — `pages-v2/BuyerReschedule/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Select | Pilih | rs.col.select | N | n/a | n/a | N |  | Keep | Relief and shortage tables only |
| column | Rank | Peringkat | rs.col.rank | N | n/a | n/a | N |  | Keep |  |
| column | Material and supplier | Material dan pemasok | rs.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Order | Pesanan | rs.col.order | N | n/a | n/a | N |  | Keep | Identifier |
| column | Now | Sekarang | rs.col.now | N | n/a | n/a | N |  | Keep | Current date and quantity |
| column | Proposed | Usulan | rs.col.proposed | Y | "proposed date and quantity" (FORECAST-ENGINE-REQUIREMENTS.md:859 E14-13) | N | N |  | Keep | Proposal type pill plus date/qty |
| column | Freed above capacity | Dibebaskan di atas kapasitas | rs.col.freed | Y | "pallet-weeks freed" (FORECAST-ENGINE-REQUIREMENTS.md:859) | N | N |  | Keep |  |
| column | Rented space saved | Ruang sewa yang dihemat | rs.col.saving | Y | "rented-space saving" (FORECAST-ENGINE-REQUIREMENTS.md:859) | N | N |  | Keep |  |
| column | Change cost | Biaya perubahan | rs.col.cost | Y | "change cost = the change penalty inside the lead time + any liability" (FORECAST-ENGINE-REQUIREMENTS.md:885) | N | N |  | Keep |  |
| column | Zone and lead time | Zona dan waktu tunggu | rs.col.position | Y | "zone or lead-time position" (FORECAST-ENGINE-REQUIREMENTS.md:932 AC-01) | N | N |  | Keep |  |
| column | Action | Tindakan | rs.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/reschedule — KPIs — `pages-v2/BuyerReschedule/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Pallet-weeks over capacity | Palet-minggu di atas kapasitas | rs.kpi.over | Y | "over capacity", "pallet-weeks" (FORECAST-ENGINE-REQUIREMENTS.md:850, :915) | N | N |  | Keep |  |
| kpi | Pallet-weeks the proposals free | Palet-minggu yang dibebaskan usulan | rs.kpi.relief | Y | "the pallet-weeks it frees" (FORECAST-ENGINE-REQUIREMENTS.md:850) | N | N |  | Keep |  |
| kpi | Rented space saved | Ruang sewa yang dihemat | rs.kpi.saving | Y | "rented-space cost it saves" (FORECAST-ENGINE-REQUIREMENTS.md:851) | N | N |  | Keep |  |
| kpi | Overload that is stock on hand | Kelebihan yang berupa stok di tangan | rs.kpi.onHand | Y | "Stock on hand alone is above capacity" (FORECAST-ENGINE-REQUIREMENTS.md:929) | N | N |  | Keep |  |

## Page: /buyer/stabilise — Series weeks (PeriodTable, opened from SeriesRow) — `pages-v2/BuyerStabilise/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | stb.detail.col.week | N | n/a | n/a | N |  | Keep |  |
| column | Zone | Zona | stb.detail.col.zone | Y | Firm / Trade-off / Forecast zone (FORECAST-ENGINE-REQUIREMENTS.md:479-480 E14-06 BR-01/02) | N | N |  | Keep | TermTip Firm and Trade-off already present |
| column | Engine value | Nilai mesin | stb.detail.col.raw | Y | "raw engine value" (FORECAST-ENGINE-REQUIREMENTS.md:469) | N | N |  | Keep |  |
| column | Last published | Terakhir diterbitkan | stb.detail.col.previous | Y | "previously published value" (FORECAST-ENGINE-REQUIREMENTS.md:482, :484) | N | N |  | Keep |  |
| column | First published | Pertama diterbitkan | stb.detail.col.first | Y | "the first value the supplier saw" (FORECAST-ENGINE-REQUIREMENTS.md:485) | N | N |  | Keep |  |
| column | Damped | Diredam | stb.detail.col.damped | Y | "Damping"; published = weight × previous + (1 − weight) × new (FORECAST-ENGINE-REQUIREMENTS.md:482, :493) | N | N |  | Keep |  |
| column | Allowed range | Rentang yang diizinkan | stb.detail.col.range | Y | "Allowed range = previous value × (1 ± band)" (FORECAST-ENGINE-REQUIREMENTS.md:497) | N | N |  | Keep |  |
| column | To publish | Akan diterbitkan | stb.detail.col.published | Y | "published values" (FORECAST-ENGINE-REQUIREMENTS.md:514 AC-03) | N | N |  | Keep |  |
| column | Rule | Aturan | stb.detail.col.rule | Y | E14-06 BR-01 to BR-05 (FORECAST-ENGINE-REQUIREMENTS.md:479-486) | N | N |  | Keep | Which stabilise rule set the week |

## Page: /buyer/stabilise — Which rule set the weeks (RuleCounts) — `pages-v2/BuyerStabilise/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Rule | Aturan | stb.rules.col.rule | N | n/a | n/a | N |  | Keep | Row-label column header |
| column | Version to publish | Versi yang akan diterbitkan | stb.rules.col.latest | N | n/a | n/a | N |  | Keep | Plain count |
| column | All replayed versions | Semua versi yang diputar ulang | stb.rules.col.replay | N | n/a | n/a | N |  | Keep | Plain count |
| row | New week — published as calculated | Minggu baru — diterbitkan apa adanya | stb.rule.new | Y | "A new period entering the horizon ... not damped or band-checked" (FORECAST-ENGINE-REQUIREMENTS.md:509) | N | N |  | Keep |  |
| row | No change | Tidak berubah | stb.rule.unchanged | Y | none found | n/a | N |  | Keep |  |
| row | Firm — kept as published | Firm — tetap seperti yang diterbitkan | stb.rule.firmFrozen | Y | "Firm quantities never change once published" (FORECAST-ENGINE-REQUIREMENTS.md:481 BR-03) | N | N |  | Keep |  |
| row | Forecast — as calculated | Forecast — apa adanya | stb.rule.forecast | Y | weight 0 in the Forecast zone, no damping (FORECAST-ENGINE-REQUIREMENTS.md:482 BR-04) | N | N |  | Keep |  |
| row | Trade-off — damped | Trade-off — diredam | stb.rule.damped | Y | "Damping" (FORECAST-ENGINE-REQUIREMENTS.md:482 BR-04) | N | N |  | Keep |  |
| row | Trade-off — held at ±10% a version | Trade-off — ditahan pada ±10% per versi | stb.rule.bandHeld | Y | "per version: ... at most ±10%" (FORECAST-ENGINE-REQUIREMENTS.md:484 BR-05) | N | N |  | Keep |  |
| row | Trade-off — held at ±20% from the first value | Trade-off — ditahan pada ±20% dari nilai pertama | stb.rule.cumulativeHeld | Y | "cumulative: ... at most ±20% from the first value" (FORECAST-ENGINE-REQUIREMENTS.md:485 BR-05) | N | N |  | Keep |  |
| row | Trade-off — beyond the band, with the planner’s reason | Trade-off — di luar batas, dengan alasan perencana | stb.rule.override | Y | "A move beyond the band needs the planner's reason" (FORECAST-ENGINE-REQUIREMENTS.md:486) | N | N |  | Keep |  |

## Page: /buyer/stabilise — Run KPIs — `pages-v2/BuyerStabilise/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Plan movement (MASC) | Pergerakan rencana (MASC) | stb.kpi.masc | Y | "Size of changes (MASC)" (FORECAST-ENGINE-REQUIREMENTS.md:217) | Y | N |  | Change [Proposed] | Propose "Size of changes (MASC)"; TermTip MASC sits in subtitle |
| kpi | Weeks changed inside the lead time | Minggu yang berubah dalam waktu tunggu | stb.kpi.share | Y | "Share of schedules changed inside lead time" (FORECAST-ENGINE-REQUIREMENTS.md:213 E14-02) | Y | N |  | Change [Proposed] | Value is a share; propose source wording |
| kpi | Trade-off weeks within limits | Minggu Trade-off dalam batas | stb.kpi.band | Y | "Tolerance band" (FORECAST-ENGINE-REQUIREMENTS.md:483 BR-05) | Y | N |  | Change [Proposed] | Propose "Trade-off weeks within the tolerance band" |
| kpi | Weeks held in the version to publish | Minggu yang ditahan pada versi yang akan diterbitkan | stb.kpi.held | Y | none found | n/a | N |  | Keep | Firm + band + damped weeks |

## Page: /buyer/stabilise — Series table — `pages-v2/BuyerStabilise/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | stb.series.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | stb.series.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Firm · Trade-off | Firm · Trade-off | stb.series.col.zones | Y | "Firm zone", "Trade-off zone" (FORECAST-ENGINE-REQUIREMENTS.md:479-480) | N | N |  | Keep | TermTip Firm and Trade-off already present |
| column | Held (Firm · band · damped) | Ditahan (Firm · batas · diredam) | stb.series.col.held | Y | "the band", "Damping" (FORECAST-ENGINE-REQUIREMENTS.md:482-486) | N | N |  | Keep |  |
| column | MASC raw → stabilised | MASC mentah → distabilkan | stb.series.col.masc | Y | "raw engine value, the stabilised value" (FORECAST-ENGINE-REQUIREMENTS.md:469); MASC (:217) | N | N |  | Keep |  |
| column | Weeks | Minggu | stb.series.col.open | N | n/a | n/a | N |  | Keep | Opens the series weeks |

## Page: /supplier/forecasts — Material commitment table — `pages-v2/SupplierForecastCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Period | Periode | fc.col.period | N | n/a | n/a | N |  | Keep |  |
| column | Zone | Zona | fc.col.zone | Y | "Firm zone" (SUPPLIER-HUB-REQUIREMENTS.md:1616 BR-05); Firm/Trade-off/Forecast (FORECAST-ENGINE-REQUIREMENTS.md:479-480) | N | N |  | Keep |  |
| column | Forecast ({{uom}}) | Prakiraan ({{uom}}) | fc.col.forecast | Y | "forecast" (SUPPLIER-HUB-REQUIREMENTS.md:167 CR-22) | N | N |  | Keep | Unit in brackets |
| column | Commitment due | Tenggat komitmen | fc.col.due | Y | "Commitments are due per CR-26" (SUPPLIER-HUB-REQUIREMENTS.md:1662) | N | N |  | Keep |  |
| column | Commitment ({{uom}}) | Komitmen ({{uom}}) | fc.col.commitment | Y | "committed quantity" (SUPPLIER-HUB-REQUIREMENTS.md:1683) | N | N |  | Keep | Input column |
| column | Upside ({{uom}}) | Tambahan ({{uom}}) | fc.col.upside | Y | "optional upside quantity above forecast" (SUPPLIER-HUB-REQUIREMENTS.md:1663 BR-08) | N | N |  | Keep | Input column |
| column | Reason below forecast | Alasan di bawah prakiraan | fc.col.reason | N | n/a | n/a | N |  | Keep | Input column |
| column | Status | Status | fc.col.status | N | n/a | n/a | N |  | Keep | Plain status |
| column | Actions | Tindakan | fc.col.actions | N | n/a | n/a | N |  | Keep | Screen-reader only header |

## Page: /supplier/forecasts — Changes tab — `pages-v2/SupplierForecastCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | fc.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Period | Periode | fc.col.period | N | n/a | n/a | N |  | Keep |  |
| column | Zone | Zona | fc.col.zone | Y | Firm/Trade-off/Forecast (FORECAST-ENGINE-REQUIREMENTS.md:479-480) | N | N |  | Keep |  |
| column | Version {{version}} | Versi {{version}} | fc.col.previous | N | n/a | n/a | N |  | Keep | Previous version quantity |
| column | Version {{version}} | Versi {{version}} | fc.col.current | N | n/a | n/a | N |  | Keep | Current version quantity |
| column | Change | Perubahan | fc.col.change | N | n/a | n/a | N |  | Keep | Plain difference |

## Page: /supplier/forecasts — Capacity before the LTP (per period) — `pages-v2/SupplierForecastCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Period | Periode | fc.sup.week.col.period | N | n/a | n/a | N |  | Keep |  |
| column | To submit | Akan dikirim | fc.sup.week.col.lines | N | n/a | n/a | N |  | Keep | Plain count |
| column | LTP against capacity | LTP terhadap kapasitas | fc.sup.week.col.capacity | Y | "LTP against capacity" (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:89) | N | N |  | Keep | ID keeps LTP |
| column | Reason | Alasan | fc.sup.week.col.reason | N | n/a | n/a | N |  | Keep | Input column |
| column | Actions | Tindakan | fc.col.actions | N | n/a | n/a | N |  | Keep | Screen-reader only header |

## Page: /supplier/forecasts — Upload refused rows (via VersionSection) — `pages-v2/SupplierForecastCommitments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Row | Baris | fc.upload.col.row | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | fc.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Period | Periode | fc.col.period | N | n/a | n/a | N |  | Keep |  |
| column | Why it was not saved | Alasan tidak tersimpan | fc.upload.col.reason | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/alerts — Closures per rule — `pages-v2/BuyerAlerts.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Rule | Aturan | inv.alerts.counts.rule | N | n/a | n/a | N |  | Keep |  |
| column | Reason | Alasan | inv.alerts.closeReason | N | n/a | n/a | N |  | Keep |  |
| column | Closed | Ditutup | inv.alerts.counts.count | N | n/a | n/a | N |  | Keep | Plain count of closures |
| row | Supply above demand anticipation is more than the last week of the horizon can absorb | Pasokan di atas antisipasi permintaan melebihi yang dapat diserap minggu terakhir horizon | inv.alerts.rule.demandAnticipationUnabsorbed | Y | "DA" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:17; spec section 3) | Y | Delivery Agreement, contract pages (BuyerContractDetail.jsx) | DA (Material Planning team, OSIP playbook) | Decided (TL-D1) | Rule name is the row label here and in the alert list; read "Demand anticipation (DA)" in EN and ID |
| row | Supplier stock is below the system-calculated supplier reorder point (ROP Supplier) | Stok pemasok di bawah titik pemesanan ulang pemasok hasil hitung sistem (ROP Pemasok) | inv.alerts.rule.supplierBelowRop | Y | "ROP Supplier" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:138) | N | N |  | Decided (TL-D6) | ID should read "ROP Supplier", not "ROP Pemasok" |

## Page: /buyer/data-health — KPI cards — `pages-v2/BuyerDataHealth.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Feeds checked | Umpan diperiksa | dh.kpi.feeds | N | n/a | n/a | N |  | Keep | KpiCard title is the `eyebrow` prop |
| kpi | Stale or missing feeds | Umpan usang atau hilang | dh.kpi.stale | Y | "stale" (FORECAST-ENGINE-REQUIREMENTS.md:101) | N | N |  | Keep |  |
| kpi | Checks failing | Pemeriksaan gagal | dh.kpi.checks | Y | "quality check" (FORECAST-ENGINE-REQUIREMENTS.md:95) | N | N |  | Keep |  |
| kpi | Records refused | Catatan ditolak | dh.kpi.records | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/data-health — Feeds table — `pages-v2/BuyerDataHealth.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Feed | Umpan | dh.col.feed | N | n/a | n/a | N |  | Keep |  |
| column | Owner | Pemilik | dh.col.owner | N | n/a | n/a | N |  | Keep |  |
| column | Refresh | Pembaruan | dh.col.refresh | N | n/a | n/a | N |  | Keep |  |
| column | Last arrival | Terakhir tiba | dh.col.arrival | N | n/a | n/a | N |  | Keep |  |
| column | Freshness | Kesegaran | dh.col.freshness | Y | "freshness" (FORECAST-ENGINE-REQUIREMENTS.md:95) | N | N |  | Keep |  |
| column | Records | Catatan | dh.col.records | N | n/a | n/a | N |  | Keep |  |
| column | Checks | Pemeriksaan | dh.col.checks | Y | "quality check" (FORECAST-ENGINE-REQUIREMENTS.md:95) | N | N |  | Keep |  |
| column | Affects | Berdampak ke | dh.col.affects | Y | "which calculations are blocked by a failed check" (FORECAST-ENGINE-REQUIREMENTS.md:95) | N | N |  | Keep |  |

## Page: /buyer/data-health — Quality checks (feed detail) — `pages-v2/BuyerDataHealth.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Check | Pemeriksaan | dh.detail.check | N | n/a | n/a | N |  | Keep |  |
| column | On failure | Bila gagal | dh.detail.severity | Y | none found | n/a | N |  | Keep | Rule: what happens when the check fails |
| column | Checked | Diperiksa | dh.detail.checked | N | n/a | n/a | N |  | Keep |  |
| column | Failing | Gagal | dh.detail.failing | N | n/a | n/a | N |  | Keep |  |
| column | Result | Hasil | dh.detail.result | N | n/a | n/a | N |  | Keep |  |
| column | (blank) | (blank) | hard-coded pages-v2/BuyerDataHealth.jsx:84 | N | n/a | n/a | N |  | Keep | Empty header over the action column |

## Page: /buyer/data-health — Failing records — `pages-v2/BuyerDataHealth.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Record | Catatan | dh.records.key | N | n/a | n/a | N |  | Keep |  |
| column | What failed | Yang gagal | dh.records.detail | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/data-health — Stock per warehouse — `pages-v2/BuyerDataHealth.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Warehouse | Gudang | dh.wh.warehouse | N | n/a | n/a | N |  | Keep |  |
| column | Newest snapshot | Snapshot terbaru | dh.wh.latest | N | n/a | n/a | N |  | Keep |  |
| column | Freshness | Kesegaran | dh.col.freshness | Y | "freshness" (FORECAST-ENGINE-REQUIREMENTS.md:95) | N | N |  | Keep |  |
| column | Materials affected if stale | Material terdampak bila usang | dh.wh.materials | Y | "lists the 42 materials affected" (FORECAST-ENGINE-REQUIREMENTS.md:101) | N | N |  | Keep |  |

## Page: /buyer/demand-forecast — KPI cards (Forecast tab) — `pages-v2/BuyerDemandForecast.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | SKUs forecast | SKU yang diprakirakan | df.kpi.skus | N | n/a | n/a | N |  | Keep |  |
| kpi | Forecast by the fallback (Comb) | Diprakirakan metode cadangan (Comb) | df.kpi.fallback | Y | "Fallback model ... the 'Comb' benchmark" (FORECAST-ENGINE-REQUIREMENTS.md:550) | N | N | Comb benchmark (FORECAST-ENGINE-REQUIREMENTS.md:550) | Keep |  |
| kpi | Next 26 weeks, all SKUs | 26 minggu ke depan, semua SKU | df.kpi.total | Y | none found | n/a | N |  | Keep | Total forecast quantity |
| kpi | SKU, brand and total | SKU, merek, dan total | df.kpi.recon | Y | "SKU, brand and total forecasts are reconciled so they add up" (FORECAST-ENGINE-REQUIREMENTS.md:552) | N | N |  | Keep |  |

## Page: /buyer/demand-forecast — Forecast levels table — `pages-v2/BuyerDemandForecast.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Level | Level | df.levels.col.level | N | n/a | n/a | OSIP level, /buyer/safety-stock and /buyer/capacity |  | Keep | Hierarchy level (SKU, brand, total), not OSIP level |
| column | SKUs | SKU | df.levels.col.skus | N | n/a | n/a | N |  | Keep |  |
| column | Own forecast, 26 weeks | Prakiraan sendiri, 26 minggu | df.levels.col.base | Y | none found | n/a | N |  | Keep |  |
| column | Reconciled, 26 weeks | Hasil rekonsiliasi, 26 minggu | df.levels.col.forecast | Y | "reconciled" (FORECAST-ENGINE-REQUIREMENTS.md:552) | N | N |  | Keep |  |
| column | SAP's plan, 26 weeks | Rencana SAP, 26 minggu | df.levels.col.sap | Y | "SAP's plan" (FORECAST-ENGINE-REQUIREMENTS.md:1144) | N | N |  | Keep |  |
| column | Against SAP | Terhadap SAP | df.levels.col.diff | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/demand-forecast — SKU table — `pages-v2/BuyerDemandForecast.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | SKU | SKU | df.skus.col.sku | N | n/a | n/a | N |  | Keep |  |
| column | Brand | Merek | df.skus.col.brand | N | n/a | n/a | N |  | Keep |  |
| column | Method | Metode | df.skus.col.method | Y | none found | n/a | N |  | Keep | Forecast model used for the SKU |
| column | History | Riwayat | df.skus.col.history | N | n/a | n/a | N |  | Keep |  |
| column | Next 4 weeks | 4 minggu ke depan | df.skus.col.next4 | N | n/a | n/a | N |  | Keep |  |
| column | 26 weeks | 26 minggu | df.skus.col.forecast | Y | none found | n/a | N |  | Keep | Label is only a horizon; the column holds the forecast |
| column | SAP's plan | Rencana SAP | df.skus.col.sap | Y | "SAP's plan" (FORECAST-ENGINE-REQUIREMENTS.md:1144) | N | N |  | Keep |  |
| column | Against SAP | Terhadap SAP | df.skus.col.diff | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/demand-forecast — Weeks grid (SKU detail) — `pages-v2/BuyerDemandForecast.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week of | Minggu | df.detail.col.week | N | n/a | n/a | N |  | Keep | WeekGrid corner label |
| row | Method's forecast | Prakiraan metode | df.detail.col.base | Y | none found | n/a | N |  | Keep |  |
| row | Reconciled | Hasil rekonsiliasi | df.detail.col.forecast | Y | "reconciled" (FORECAST-ENGINE-REQUIREMENTS.md:552) | N | N |  | Keep |  |
| row | P{{level}} (P50, P90) | P{{level}} | df.range.col.p | Y | "P50 ... P90" (FORECAST-ENGINE-REQUIREMENTS.md:487) | N | N |  | Keep | Glossary term P50/P90 already exists |
| row | Theta (alternative) | Theta (alternatif) | df.detail.col.theta | Y | "Theta" (FORECAST-ENGINE-REQUIREMENTS.md:1144) | N | N |  | Keep |  |
| row | SAP's plan | Rencana SAP | df.detail.col.sap | Y | "SAP's plan" (FORECAST-ENGINE-REQUIREMENTS.md:1144) | N | N |  | Keep |  |
| row | Events | Peristiwa | df.detail.col.events | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/demand-forecast — Events table — `pages-v2/BuyerDemandForecast.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Event | Peristiwa | df.events.col.event | N | n/a | n/a | N |  | Keep |  |
| column | Weeks | Minggu | df.events.col.when | N | n/a | n/a | N |  | Keep |  |
| column | Total | Total | df.events.col.level | Y | none found | n/a | N |  | Keep | Event factor at total level; the brand columns that follow are data names |

## Page: /buyer/demand-forecast — Demand range (Forecast tab) — `pages-v2/demandForecast/DemandRangeSection.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Sold above P90 | Terjual di atas P90 | df.range.kpi.aboveP90 | Y | "share of weeks above P90" (FORECAST-ENGINE-REQUIREMENTS.md:693) | N | N |  | Keep |  |
| kpi | Sold above P50 | Terjual di atas P50 | df.range.kpi.aboveP50 | Y | none found | n/a | N |  | Keep |  |
| kpi | Above P90 without the weekly correction | Di atas P90 tanpa koreksi mingguan | df.range.kpi.uncorrected | Y | none found | n/a | N |  | Keep |  |
| kpi | P90 above P50, total | P90 di atas P50, total | df.range.kpi.width | Y | none found | n/a | N |  | Keep |  |
| column | Level | Level | df.range.col.level | N | n/a | n/a | OSIP level, /buyer/safety-stock and /buyer/capacity |  | Keep | Levels table; hierarchy level, not OSIP level |
| column | Forecast | Prakiraan | df.range.col.forecast | Y | none found | n/a | N |  | Keep | Levels, SKU and material tables: counted once per table, three tables |
| column | P{{level}} | P{{level}} | df.range.col.p | Y | "P50 ... P90" (FORECAST-ENGINE-REQUIREMENTS.md:487) | N | N |  | Keep | Same three tables |
| column | P90 above P50 | P90 di atas P50 | df.range.col.width | Y | none found | n/a | N |  | Keep | Same three tables |
| column | Sold above P90 (past) | Terjual di atas P90 (lalu) | df.range.col.above | Y | "share of weeks above P90" (FORECAST-ENGINE-REQUIREMENTS.md:693) | N | N |  | Keep | Same three tables |
| column | SKU | SKU | df.range.col.sku | N | n/a | n/a | N |  | Keep | SKU table |
| column | Range from | Rentang dari | df.range.col.source | Y | "gets a range from SAP's plan's own past errors" (FORECAST-ENGINE-REQUIREMENTS.md:1124) | N | N |  | Keep | SKU and material tables |
| column | Material | Material | df.range.col.material | N | n/a | n/a | N |  | Keep | Material table |
| column | Forecast need | Kebutuhan prakiraan | df.range.col.need | Y | none found | n/a | N |  | Keep | Material table |

## Page: /buyer/demand-forecast?tab=bias — KPI cards — `pages-v2/BuyerForecastBias.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | SKUs in bias alarm · engine | SKU dengan alarm bias · mesin | fb.kpi.skus | Y | "Bias alarm" (FORECAST-ENGINE-REQUIREMENTS.md:776) | N | N |  | Keep |  |
| kpi | Materials in bias alarm · engine | Material dengan alarm bias · mesin | fb.kpi.materials | Y | "Bias alarm" (FORECAST-ENGINE-REQUIREMENTS.md:776) | N | N |  | Keep |  |
| kpi | Override weeks in force | Minggu dengan penyesuaian berlaku | fb.kpi.overrides | Y | none found | n/a | N |  | Keep |  |
| kpi | Override value (FVA) | Nilai penyesuaian (FVA) | fb.kpi.value | Y | "Override value (FVA)" (FORECAST-ENGINE-REQUIREMENTS.md:777) | N | N |  | Keep |  |

## Page: /buyer/demand-forecast?tab=bias — Tracking signal per SKU — `pages-v2/BuyerForecastBias.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | SKU | SKU | fb.skus.col.sku | N | n/a | n/a | N |  | Keep |  |
| column | Brand | Merek | fb.skus.col.brand | N | n/a | n/a | N |  | Keep |  |
| column | Weeks counted | Minggu dihitung | fb.skus.col.weeks | N | n/a | n/a | N |  | Keep |  |
| column | Engine forecast | Prakiraan mesin | fb.skus.col.engine | Y | "tracking signal per SKU" (FORECAST-ENGINE-REQUIREMENTS.md:776) | N | N |  | Keep | Cells show the tracking signal; the section heading has a TermTip |
| column | SAP's plan | Rencana SAP | fb.skus.col.sap | Y | "tracking signal per SKU" (FORECAST-ENGINE-REQUIREMENTS.md:776) | N | N |  | Keep | Cells show the tracking signal |

## Page: /buyer/demand-forecast?tab=bias — Tracking signal per material — `pages-v2/BuyerForecastBias.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | fb.materials.col.material | N | n/a | n/a | N |  | Keep |  |
| column | SKUs using it | SKU pemakai | fb.materials.col.skus | N | n/a | n/a | N |  | Keep |  |
| column | Engine forecast | Prakiraan mesin | fb.skus.col.engine | Y | "tracking signal per SKU and material" (FORECAST-ENGINE-REQUIREMENTS.md:776) | N | N |  | Keep | Cells show the tracking signal |
| column | SAP's plan | Rencana SAP | fb.skus.col.sap | Y | "tracking signal per SKU and material" (FORECAST-ENGINE-REQUIREMENTS.md:776) | N | N |  | Keep | Cells show the tracking signal |

## Page: /buyer/demand-forecast?tab=bias — Override ledger — `pages-v2/BuyerForecastBias.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Recorded | Dicatat | fb.ledger.col.when | N | n/a | n/a | N |  | Keep |  |
| column | SKU and week | SKU dan minggu | fb.ledger.col.sku | N | n/a | n/a | N |  | Keep |  |
| column | Old → new | Lama → baru | fb.ledger.col.values | N | n/a | n/a | N |  | Keep |  |
| column | Against the engine | Terhadap mesin | fb.ledger.col.direction | Y | "override value by direction (up or down)" (FORECAST-ENGINE-REQUIREMENTS.md:773) | N | N |  | Keep |  |
| column | Reason | Alasan | fb.ledger.col.reason | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/demand-forecast?tab=bias — Override value (FVA) table — `pages-v2/BuyerForecastBias.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Group | Kelompok | fb.fva.col.group | N | n/a | n/a | N |  | Keep | Group rows (all, direction, reason, band) are cell values |
| column | Weeks · SKUs | Minggu · SKU | fb.fva.col.cells | N | n/a | n/a | N |  | Keep |  |
| column | Error: engine → after | Galat: mesin → sesudah | fb.fva.col.mae | Y | "error of the final forecast (after overrides) with the error of the engine forecast" (FORECAST-ENGINE-REQUIREMENTS.md:777) | N | N |  | Keep |  |
| column | Weeks improved | Minggu membaik | fb.fva.col.improved | Y | none found | n/a | N |  | Keep |  |
| column | Value (FVA) | Nilai (FVA) | fb.fva.col.fva | Y | "Override value (FVA)" (FORECAST-ENGINE-REQUIREMENTS.md:777) | N | N |  | Keep |  |

## Page: /buyer/inventory — Summary tiles — `pages-v2/BuyerInventory.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | High risk | Risiko tinggi | inv.tile.high | Y | "risk class against the supplier lead time (CR-24)" (SUPPLIER-HUB-REQUIREMENTS.md:1197) | N | N |  | Ask Levi | Tiles are counts that also filter the table; KPI card or filter? |
| kpi | PTI stock below PTI ROP | Stok PTI di bawah ROP PTI | inv.tile.belowRop | Y | "PTI SOH below PTI ROP" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:715) | N | Reorder point = engine challenger, /buyer/safety-stock | PTI SOH (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:715) | Ask Levi | Same tile question |
| kpi | Supplier figures out of date | Angka pemasok kedaluwarsa | inv.tile.stale | Y | none found | n/a | N |  | Ask Levi | Same tile question |
| kpi | No lead time on record | Waktu tunggu belum tercatat | inv.tile.noLeadTime | Y | none found | n/a | N |  | Ask Levi | Same tile question |

## Page: /buyer/inventory — Inventory table — `pages-v2/BuyerInventory.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material · supplier | Material · pemasok | inv.col.materialSupplier | N | n/a | n/a | N |  | Keep |  |
| column | Risk · supplier cover | Risiko · cakupan pemasok | inv.col.riskCover | Y | "Supplier cover" (ID "Cakupan stok pemasok") (DECISION-GUIDE.md:393, INV-D1) | Y | N | days of cover, CR-24 (DECISION-GUIDE.md:393) | Change [Proposed] | ID omits "stok"; INV-D1 sets "Cakupan stok pemasok" |
| column | Supplier stock | Stok pemasok | inv.col.supplierSoh | Y | "supplier stock" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:315) | N | N |  | Keep |  |
| column | PTI stock / ROP | Stok PTI / ROP | inv.col.ptiSohRop | Y | "PTI SOH below PTI ROP" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:715) | N | ROP Order / ROP Fisik (team ROPs), /buyer/safety-stock | PTI SOH, PTI ROP (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:715) | Keep | SAP's ROP; the tooltip should say it is not ROP Order or ROP Fisik |
| column | Incoming | Akan datang | inv.col.incoming | Y | none found | n/a | N |  | Keep | Split into in production and in transit |
| column | Updated | Diperbarui | inv.col.updated | N | n/a | n/a | N |  | Keep | Also carries the stale flag |

## Page: /buyer/inventory — Incoming detail panel (also on /supplier/inventory) — `pages-v2/inventory/inventoryDisplay.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Date | Tanggal | inv.incoming.col.date | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | inv.incoming.col.source | Y | none found | n/a | N |  | Keep | In production or in transit |
| column | Quantity | Kuantitas | inv.incoming.col.quantity | N | n/a | n/a | N |  | Keep |  |
| column | Reference | Referensi | inv.incoming.col.reference | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/material-requirement — KPI cards — `pages-v2/BuyerMaterialRequirement.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Materials with a net requirement | Material dengan kebutuhan bersih | mrq.kpi.net | Y | "net requirement" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| kpi | Planned orders | Pesanan terencana | mrq.kpi.orders | Y | "planned order" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| kpi | Late to release | Terlambat dirilis | mrq.kpi.late | Y | "late to release" (FORECAST-ENGINE-REQUIREMENTS.md:296) | N | N |  | Keep |  |
| kpi | Marked for review | Ditandai untuk ditinjau | mrq.kpi.review | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/material-requirement — Materials table — `pages-v2/BuyerMaterialRequirement.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | mrq.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | mrq.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Lead time | Waktu tunggu | mrq.col.leadTime | Y | "lead time" (FORECAST-ENGINE-REQUIREMENTS.md:279) | N | N |  | Keep | See Ask Levi on lead time in ID |
| column | Safety stock | Stok pengaman | mrq.col.safetyStock | Y | "safety stock" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep | Engine safety stock; tooltip should say not safety order (ROP Order component) |
| column | Stock on hand | Stok tersedia | mrq.col.stock | Y | "SOH" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:23) | N | N | SOH (Material Planning team, questions file A2) | Keep |  |
| column | Net requirement | Kebutuhan bersih | mrq.col.net | Y | "net requirement" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| column | Planned orders | Pesanan terencana | mrq.col.orders | Y | "planned order" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| column | Late | Terlambat | mrq.col.late | Y | "late to release" (FORECAST-ENGINE-REQUIREMENTS.md:296) | Y | N |  | Keep | Short form of "Late to release" used on the same page |

## Page: /buyer/material-requirement — Weekly requirement table — `pages-v2/BuyerMaterialRequirement.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | mrq.wk.week | N | n/a | n/a | N |  | Keep |  |
| column | Gross requirement | Kebutuhan kotor | mrq.wk.gross | Y | "gross requirement" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| column | Stock at start | Stok awal | mrq.wk.start | Y | "stock" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| column | Confirmed receipts | Penerimaan terkonfirmasi | mrq.wk.receipts | Y | "receipts" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| column | Safety stock | Stok pengaman | mrq.wk.safety | Y | "safety stock" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep | Tooltip should say not safety order |
| column | Net requirement | Kebutuhan bersih | mrq.wk.net | Y | "net requirement" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| column | Planned order | Pesanan terencana | mrq.wk.planned | Y | "planned order" (FORECAST-ENGINE-REQUIREMENTS.md:261) | N | N |  | Keep |  |
| column | Release week | Minggu rilis | mrq.wk.release | Y | "Release week = need week − lead time" (FORECAST-ENGINE-REQUIREMENTS.md:289) | N | N |  | Keep |  |
| column | Stock at end | Stok akhir | mrq.wk.end | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/material-requirement — Finished goods behind the gross requirement — `pages-v2/BuyerMaterialRequirement.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Finished good | Barang jadi | mrq.pegs.sku | N | n/a | n/a | N |  | Keep |  |
| column | Week | Minggu | mrq.pegs.week | N | n/a | n/a | N |  | Keep |  |
| column | Finished-good quantity | Jumlah barang jadi | mrq.pegs.fgQty | Y | none found | n/a | N |  | Keep |  |
| column | Scrap | Susut | mrq.pegs.scrap | Y | "scrap" (FORECAST-ENGINE-REQUIREMENTS.md:272) | N | N |  | Keep |  |
| column | Yield | Hasil (yield) | mrq.pegs.yield | Y | "yield" (FORECAST-ENGINE-REQUIREMENTS.md:272) | N | N |  | Keep |  |
| column | Requirement | Kebutuhan | mrq.pegs.part | Y | "component quantity" (FORECAST-ENGINE-REQUIREMENTS.md:272) | N | N |  | Keep |  |

## Page: /buyer/model-backtest — KPI cards — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | SKUs compared | SKU dibandingkan | mb.kpi.skus | N | n/a | n/a | N |  | Keep |  |
| kpi | Engine beats SAP's plan | Mesin mengungguli rencana SAP | mb.kpi.beats | Y | none found | n/a | N |  | Keep |  |
| kpi | Materials, engine vs SAP's plan | Material, mesin vs rencana SAP | mb.kpi.materials | Y | none found | n/a | N |  | Keep |  |
| kpi | Plan-stability limit | Batas stabilitas rencana | mb.kpi.limit | Y | "Plan-stability limit used in model selection" (FORECAST-ENGINE-REQUIREMENTS.md:1167, ENG-D13) | N | N | stability limit (MASC) (FORECAST-ENGINE-REQUIREMENTS.md:754) | Keep |  |

## Page: /buyer/model-backtest — Methods table — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Method | Metode | mb.methods.col.method | N | n/a | n/a | N |  | Keep |  |
| column | SKUs | SKU | mb.methods.col.skus | N | n/a | n/a | N |  | Keep |  |
| column | Fill rate | Tingkat pemenuhan | mb.methods.col.fill | Y | "Fill rate = weeks fully served ÷ weeks with demand" (FORECAST-ENGINE-REQUIREMENTS.md:1139, ENG-B84) | N | N |  | Keep |  |
| column | Order-complete | Pesanan lengkap | mb.methods.col.complete | Y | "order-complete rate" (FORECAST-ENGINE-REQUIREMENTS.md:724) | N | N |  | Keep |  |
| column | Pallet-weeks | Palet-minggu | mb.methods.col.pallets | Y | "pallet-weeks" (FORECAST-ENGINE-REQUIREMENTS.md:850) | N | N |  | Keep |  |
| column | MASC, median | MASC, median | mb.methods.col.masc | Y | "MASC" (FORECAST-ENGINE-REQUIREMENTS.md:198) | N | N | size of the changes (FORECAST-ENGINE-REQUIREMENTS.md:198) | Keep | Glossary term MASC exists |
| column | WAPE, median | WAPE, median | mb.methods.col.wape | Y | "WAPE" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | Chosen for | Dipilih untuk | mb.methods.col.chosen | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/model-backtest — Portfolio table — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Every SKU on | Setiap SKU pada | mb.portfolio.col.scenario | N | n/a | n/a | N |  | Keep |  |
| column | Fill rate | Tingkat pemenuhan | mb.portfolio.col.fill | Y | "Fill rate" (FORECAST-ENGINE-REQUIREMENTS.md:1139) | N | N |  | Keep |  |
| column | Units served | Unit terlayani | mb.portfolio.col.unitFill | Y | none found | n/a | N |  | Keep |  |
| column | Pallet-weeks | Palet-minggu | mb.portfolio.col.pallets | Y | "pallet-weeks" (FORECAST-ENGINE-REQUIREMENTS.md:850) | N | N |  | Keep |  |
| column | Packaging: peak pallets | Kemasan: puncak palet | mb.portfolio.col.packaging | Y | none found | n/a | N |  | Keep |  |
| column | Raw material: peak pallets | Bahan baku: puncak palet | mb.portfolio.col.rawMaterial | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/model-backtest — Origins table — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Origin | Titik awal | mb.origins.col.origin | Y | "rolling-origin backtest from 12 monthly origins" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | Events in its weeks | Peristiwa dalam minggunya | mb.origins.col.events | N | n/a | n/a | N |  | Keep |  |
| column | SAP's plan | Rencana SAP | mb.scenario.sapPlan | Y | "SAP's plan as the benchmark" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | The fallback | Fallback | mb.scenario.floor | Y | "Comb ... (the floor)" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N | Comb (FORECAST-ENGINE-REQUIREMENTS.md:550) | Keep |  |
| column | The chosen model | Model terpilih | mb.scenario.chosen | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/model-backtest — SKU table — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | SKU | SKU | mb.skus.col.sku | N | n/a | n/a | N |  | Keep |  |
| column | Chosen | Terpilih | mb.skus.col.chosen | N | n/a | n/a | N |  | Keep |  |
| column | Against SAP's plan | Terhadap rencana SAP | mb.skus.col.vsSap | Y | none found | n/a | N |  | Keep |  |
| column | Main model | Model utama | mb.candidate.main | Y | "the main-model slot" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep | Candidate columns appear only when the run has them |
| column | Comb (fallback) | Comb (fallback) | mb.candidate.comb | Y | "the 'Comb' benchmark" (FORECAST-ENGINE-REQUIREMENTS.md:550) | N | N |  | Keep |  |
| column | Theta | Theta | mb.candidate.theta | Y | "Theta" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | SBA | SBA | mb.candidate.sba | Y | "SBA/Croston or TSB for a slow SKU" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | Croston | Croston | mb.candidate.croston | Y | "SBA/Croston" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | TSB | TSB | mb.candidate.tsb | Y | "TSB" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | SAP's plan | Rencana SAP | mb.candidate.sapPlan | Y | "SAP's plan" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |

## Page: /buyer/model-backtest — Materials table — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | mb.materials.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Lead time | Waktu tunggu | mb.materials.col.lead | Y | none found | n/a | N |  | Keep | See Ask Levi on lead time in ID |
| column | Fill rate | Tingkat pemenuhan | mb.materials.col.fill | Y | "Fill rate" (FORECAST-ENGINE-REQUIREMENTS.md:1139) | N | N |  | Keep |  |
| column | Pallet-weeks | Palet-minggu | mb.materials.col.pallets | Y | "pallet-weeks" (FORECAST-ENGINE-REQUIREMENTS.md:850) | N | N |  | Keep |  |
| column | Chosen against SAP's plan | Terpilih terhadap rencana SAP | mb.materials.col.vsSap | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/model-backtest — MASC spread table — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Candidate | Kandidat | mb.masc.col.candidate | N | n/a | n/a | N |  | Keep |  |
| column | SKUs | SKU | mb.masc.col.skus | N | n/a | n/a | N |  | Keep |  |
| column | Lowest | Terendah | mb.masc.col.min | N | n/a | n/a | N |  | Keep | Statistic of MASC; section intro names it |
| column | 25% | 25% | mb.masc.col.p25 | N | n/a | n/a | N |  | Keep |  |
| column | Median | Median | mb.masc.col.median | N | n/a | n/a | N |  | Keep |  |
| column | 75% | 75% | mb.masc.col.p75 | N | n/a | n/a | N |  | Keep |  |
| column | Highest | Tertinggi | mb.masc.col.max | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/model-backtest — SKU detail (candidates) — `pages-v2/BuyerModelBacktest.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Candidate | Kandidat | mb.detail.col.candidate | N | n/a | n/a | N |  | Keep |  |
| column | Fill rate | Tingkat pemenuhan | mb.detail.col.fill | Y | "Fill rate" (FORECAST-ENGINE-REQUIREMENTS.md:1139) | N | N |  | Keep |  |
| column | Order-complete | Pesanan lengkap | mb.detail.col.complete | Y | "order-complete rate" (FORECAST-ENGINE-REQUIREMENTS.md:724) | N | N |  | Keep |  |
| column | Units served | Unit terlayani | mb.detail.col.unitFill | Y | none found | n/a | N |  | Keep |  |
| column | Pallet-weeks | Palet-minggu | mb.detail.col.pallets | Y | "pallet-weeks" (FORECAST-ENGINE-REQUIREMENTS.md:850) | N | N |  | Keep |  |
| column | MASC | MASC | mb.detail.col.masc | Y | "MASC" (FORECAST-ENGINE-REQUIREMENTS.md:198) | N | N | size of the changes (FORECAST-ENGINE-REQUIREMENTS.md:198) | Keep |  |
| column | WAPE | WAPE | mb.detail.col.wape | Y | "WAPE" (FORECAST-ENGINE-REQUIREMENTS.md:756) | N | N |  | Keep |  |
| column | Bias | Bias | mb.detail.col.bias | Y | none found | n/a | N |  | Keep |  |
| column | Selection | Pemilihan | mb.detail.col.status | Y | none found | n/a | N |  | Keep | State: chosen, failed or eligible |

## Page: /buyer/reliability — KPI cards — `pages-v2/BuyerReliability.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Confirmed by the deadline | Dikonfirmasi sebelum tenggat | rel.kpi.confirmation | Y | "Confirmation rate" (FORECAST-ENGINE-REQUIREMENTS.md:190) | Y | N | confirmation rate (FORECAST-ENGINE-REQUIREMENTS.md:190) | Change [Proposed] | Source names the measure "Confirmation rate" |
| kpi | Delivered as committed | Dikirim sesuai komitmen | rel.kpi.commitment | Y | "Commitment reliability" (FORECAST-ENGINE-REQUIREMENTS.md:191) | Y | N | commitment reliability (FORECAST-ENGINE-REQUIREMENTS.md:191) | Change [Proposed] | Source names the measure "Commitment reliability" |
| kpi | Confirmed-date lines delivered | Baris tepat tanggal konfirmasi | rel.kpi.cfot | Y | "CFOT ... against ... the committed date" (FORECAST-ENGINE-REQUIREMENTS.md:200) | Y | N | CFOT, Casefill On-Time (SUPPLIER-HUB-REQUIREMENTS.md:117) | Change [Proposed] | Source calls it CFOT |
| kpi | Missed lines | Baris yang meleset | rel.kpi.misses | Y | "missed lines" (FORECAST-ENGINE-REQUIREMENTS.md:184) | N | N |  | Keep |  |
| kpi | PTI changes inside lead time | Perubahan PTI di dalam lead time | rel.kpi.planChange | Y | "share of schedules changed inside the supplier lead time" (FORECAST-ENGINE-REQUIREMENTS.md:197) | N | N |  | Keep | ID keeps "lead time" |

## Page: /buyer/reliability — Supplier table — `pages-v2/BuyerReliability.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rel.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Confirmed by the deadline | Dikonfirmasi sebelum tenggat | rel.col.confirmation | Y | "Confirmation rate" (FORECAST-ENGINE-REQUIREMENTS.md:190) | Y | N | confirmation rate (FORECAST-ENGINE-REQUIREMENTS.md:190) | Change [Proposed] | Sort button holds the label |
| column | Delivered as committed | Dikirim sesuai komitmen | rel.col.commitment | Y | "Commitment reliability" (FORECAST-ENGINE-REQUIREMENTS.md:191) | Y | N | commitment reliability (FORECAST-ENGINE-REQUIREMENTS.md:191) | Change [Proposed] |  |
| column | Confirmed-date lines delivered | Baris tepat tanggal konfirmasi | rel.col.cfot | Y | "CFOT" (FORECAST-ENGINE-REQUIREMENTS.md:200) | Y | N | CFOT, Casefill On-Time (SUPPLIER-HUB-REQUIREMENTS.md:117) | Change [Proposed] |  |
| column | Missed lines | Baris yang meleset | rel.col.misses | Y | "missed lines" (FORECAST-ENGINE-REQUIREMENTS.md:184) | N | N |  | Keep |  |
| column | PTI changed inside lead time | Diubah PTI di dalam lead time | rel.col.planChange | Y | "share of schedules changed inside the supplier lead time" (FORECAST-ENGINE-REQUIREMENTS.md:197) | N | N |  | Keep |  |
| column | Size of PTI's changes | Besar perubahan PTI | rel.col.masc | Y | "MASC, the size of the changes" (FORECAST-ENGINE-REQUIREMENTS.md:198) | N | N | MASC (FORECAST-ENGINE-REQUIREMENTS.md:198) | Keep | Scale hint above the table has a MASC TermTip |
| column | Drift since first seen | Pergeseran sejak pertama dilihat | rel.col.mascI | Y | "MASC-I ... shows the total drift" (FORECAST-ENGINE-REQUIREMENTS.md:222) | N | N | MASC-I (FORECAST-ENGINE-REQUIREMENTS.md:222) | Keep |  |

## Page: /buyer/safety-stock — KPI cards — `pages-v2/BuyerSafetyStock.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Warehouse space freed against SAP | Ruang gudang yang dibebaskan dibanding SAP | sst.kpi.freed | Y | "how much space the new calculation frees" (FORECAST-ENGINE-REQUIREMENTS.md:334) | N | N |  | Keep |  |
| kpi | Materials per tier | Material per tingkat | sst.kpi.tiers | Y | "tier" (FORECAST-ENGINE-REQUIREMENTS.md:343) | N | N |  | Keep |  |
| kpi | On SAP's value | Memakai nilai SAP | sst.kpi.fallback | Y | "uses SAP's safety stock" (FORECAST-ENGINE-REQUIREMENTS.md:346) | N | N |  | Keep |  |
| kpi | Safety lead time from the group default | Waktu tunggu pengaman dari nilai bawaan grup | sst.kpi.groupDefault | Y | "safety-lead-time group default" (FORECAST-ENGINE-REQUIREMENTS.md:1006, ENG-B12) | N | N |  | Keep |  |

## Page: /buyer/safety-stock — Safety stock table — `pages-v2/BuyerSafetyStock.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | sst.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Tier and target | Tingkat dan target | sst.col.tier | Y | "service target is a fill rate" (FORECAST-ENGINE-REQUIREMENTS.md:338) | N | N |  | Keep |  |
| column | Safety order (ROP Order) | Pesanan pengaman (ROP Order) | sst.osip.col.safetyOrder | Y | "Safety order (ROP Order)" (DRC-PROPOSAL-2026-10-19.md:154) | N | N |  | Decided (TL-D6) | ID should read "Safety order (ROP Order)"; text from shared OsipColumnTitle |
| column | ROP Fisik safety | Pengaman ROP Fisik | sst.osip.col.fisikSafety | Y | "Safety ROP Fisik" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:84) | Y | N |  | Change [Proposed] | Team writes "Safety ROP Fisik"; ID translates "safety"; hub doc says "ROP Fisik safety" |
| column | Demand CV | CV permintaan | sst.osip.col.cv | Y | "CV" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:145) | N | N |  | Keep |  |
| column | OSIP level | Level OSIP | sst.rop.col.level | Y | "Level OSIP" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:143) | N | Level = forecast hierarchy level, /buyer/demand-forecast |  | Keep | Text from shared RopColumnTitle (osipRops.jsx) |
| column | ROP Order | ROP Order | sst.rop.col.ropOrder | Y | "ROP Order" (DRC-PROPOSAL-2026-10-19.md:45) | N | N |  | Keep | Feeds ZPE007 (questions B9) |
| column | ROP Fisik | ROP Fisik | sst.rop.col.ropFisik | Y | "ROP Fisik" (DRC-PROPOSAL-2026-10-19.md:46) | N | N |  | Keep | Triggers call-offs |
| column | Max | Maks | sst.rop.col.max | Y | "Max Stock" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:48); "Max" (DECISIONS-FOR-REVIEW-2026-10-19.md:20) | Y | N |  | Ask Levi | Team writes "Max Stock" in ID text; ID translates to "Maks" |
| column | Safety stock | Stok pengaman | sst.col.safetyStock | Y | "Safety stock" (FORECAST-ENGINE-REQUIREMENTS.md:313) | N | Safety order (ROP Order), same table |  | Keep | Engine challenger; tooltip should say "Not safety order" |
| column | SAP safety stock | Stok pengaman SAP | sst.col.sap | Y | "SAP's safety stock" (FORECAST-ENGINE-REQUIREMENTS.md:346) | N | N |  | Keep |  |
| column | Freed | Dibebaskan | sst.col.freed | Y | "frees" (FORECAST-ENGINE-REQUIREMENTS.md:334) | N | N |  | Keep |  |
| column | Safety lead time | Waktu tunggu pengaman | sst.col.slt | Y | "safety lead time" (FORECAST-ENGINE-REQUIREMENTS.md:313) | N | N |  | Keep |  |
| column | Reorder point | Titik pesan ulang | sst.col.rop | Y | "reorder point" (FORECAST-ENGINE-REQUIREMENTS.md:313) | N | ROP Order / ROP Fisik (team ROPs), same table |  | Keep | TermTip "Reorder point" already present; engine challenger |
| column | Since last run | Sejak perhitungan terakhir | sst.col.change | N | n/a | n/a | N |  | Keep |  |
| column | History | Riwayat | sst.col.history | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/safety-stock — Forecast errors (material detail) — `pages-v2/BuyerSafetyStock.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Plan made | Rencana dibuat | sst.err.origin | N | n/a | n/a | N |  | Keep |  |
| column | Planned | Rencana | sst.err.planned | N | n/a | n/a | N |  | Keep |  |
| column | Needed | Kebutuhan | sst.err.actual | N | n/a | n/a | N |  | Keep |  |
| column | Shortfall | Kekurangan | sst.err.error | Y | "The shortfalls (actual − forecast)" (FORECAST-ENGINE-REQUIREMENTS.md:353) | N | N |  | Keep |  |

## Page: /buyer/safety-stock — ROP per supplier (material detail) — `pages-v2/safetyStock/osipRops.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | sst.rop.detail.supplier | N | n/a | n/a | N |  | Keep |  |
| column | ROP Order | ROP Order | sst.rop.col.ropOrder | Y | "ROP Order" (DRC-PROPOSAL-2026-10-19.md:45) | N | N |  | Keep |  |
| column | ROP Fisik | ROP Fisik | sst.rop.col.ropFisik | Y | "ROP Fisik" (DRC-PROPOSAL-2026-10-19.md:46) | N | N |  | Keep |  |
| column | Max | Maks | sst.rop.col.max | Y | "Max Stock" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:48) | Y | N |  | Ask Levi | Same question as the main table |
| column | ROP Supplier | ROP Pemasok | sst.rop.col.ropSupplier | Y | "ROP Supplier" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:138) | N | Your reorder point (supplier's own figure), /supplier/inventory |  | Decided (TL-D6) | ID should read "ROP Supplier" |
| column | ROP to principal | ROP ke prinsipal | sst.rop.col.ropToPrincipal | Y | "ROP order to principal" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:137) | Y | N |  | Change [Proposed] | Team sheet column reads "ROP order to principal"; ID translates "to principal" |

## Page: /buyer/safety-stock — Values per supplier (material detail) — `pages-v2/safetyStock/osipValues.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | sst.values.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Replenishment cycle f | Siklus pengisian ulang f | sst.values.col.f | Y | "Cycle replenishment (f)" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:115); "Replenishment cycle f" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:119) | Y | N | call-off lead time (SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10.md:55) | Change [Proposed] | Team word order is "cycle replenishment"; ID translates it |
| column | Pull agreement | Perjanjian tarik | sst.values.col.pull | Y | "pull agreement" (SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10.md:79) | N | N |  | Keep | Team answer is in English; no ID use found |
| column | Bottleneck production lead time (ROP Supplier) | Waktu tunggu produksi bottleneck (ROP Pemasok) | sst.values.col.bottleneck | Y | "bottleneck production lead time" (SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10.md:99) | N | N |  | Decided (TL-D6) | ID should keep "(ROP Supplier)" |

## Page: /buyer/scorecard — KPI cards — `pages-v2/BuyerScorecard.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | On time and in full | Tepat waktu dan tepat jumlah | perf.otif | Y | "OTIF, On-Time In-Full" (SUPPLIER-HUB-REQUIREMENTS.md:118) | N | N | OTIF (SUPPLIER-HUB-REQUIREMENTS.md:118) | Keep |  |
| kpi | Delivered on the confirmed date | Terkirim pada tanggal yang dikonfirmasi | perf.cfot | Y | "CFOT, Casefill On-Time" (SUPPLIER-HUB-REQUIREMENTS.md:117) | Y | N | CFOT (SUPPLIER-HUB-REQUIREMENTS.md:117) | Change [Proposed] | Source names it CFOT |
| kpi | Rejections | Penolakan | perf.rejections | Y | none found | n/a | N |  | Keep |  |
| kpi | Overall score | Skor keseluruhan | perf.score | Y | none found | n/a | N |  | Keep |  |
| kpi | Fixture names: OTDR, PO Ack Rate, Ack Speed, Fill Rate, Lead Time Adherence, QNCR, GR/PO Variance, Invoice Accuracy, Inventory DOS, Responsiveness, Sustainability | same as EN (not translated) | fixture services/data/mock/fixtures/buyerScorecard.js (shown at pages-v2/BuyerScorecard.jsx:207) | Y | none found | n/a | N |  | Ask Levi | Fixture data names, no i18n key or ID text |

## Page: /buyer/scorecard — Chart tables (screen-reader only) — `pages-v2/BuyerScorecard.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Area | Area | buyerScorecard.chart.area | N | n/a | n/a | N |  | Ask Levi | sr-only table; a visible (i) has no place |
| column | (supplier name) | (supplier name) | hard-coded pages-v2/BuyerScorecard.jsx:574 | N | n/a | n/a | N |  | Keep | Data value |
| column | Benchmark | Tolok Ukur | buyerScorecard.radar.benchmark | Y | none found | n/a | N |  | Ask Levi | sr-only table |
| column | Month | Bulan | buyerScorecard.chart.month | N | n/a | n/a | N |  | Keep |  |
| column | OTIF % | OTIF % | buyerScorecard.series.otif | Y | "OTIF" (SUPPLIER-HUB-REQUIREMENTS.md:118) | N | N |  | Ask Levi | sr-only table |
| column | Ack Speed (h) | Kecepatan Konfirmasi (j) | buyerScorecard.series.ackSpeed | Y | none found | n/a | N |  | Ask Levi | sr-only table |
| column | Defect Rate % | Tingkat Cacat % | buyerScorecard.series.defectRate | Y | none found | n/a | N |  | Ask Levi | sr-only table |

## Page: /buyer/stock-simulation — Simulation table — `pages-v2/BuyerStockSimulation.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | sim.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | sim.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | PIC | PIC | pic.col | N | n/a | n/a | N |  | Keep | Text from shared PicHeader (materials/picDisplay.jsx) |
| column | Supplier available | Tersedia di pemasok | sim.col.available | Y | "Supplier available stock" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:452) | Y | N |  | Change [Proposed] | Source adds "stock" |
| column | Already called off, not shipped | Sudah di-call-off, belum dikirim | sim.col.calledOff | Y | "Already called off, not shipped" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:473) | N | N |  | Keep |  |
| column | Free to call off | Bebas untuk call-off | sim.col.free | Y | "Free to call off" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:473) | N | N |  | Keep |  |
| column | PTI inbound | Masuk ke PTI | sim.col.ptiInbound | Y | "PTI inbound" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:453) | N | N |  | Keep |  |
| column | Last update | Pembaruan terakhir | sim.col.lastUpdate | N | n/a | n/a | N |  | Keep |  |
| column | Basis | Dasar | sim.col.basis | Y | "a 'Basis' column" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:455) | N | N |  | Keep |  |
| column | Flags | Tanda | sim.col.flags | Y | none found | n/a | N |  | Keep | Missing inputs, etc. |
| column | Actions | Tindakan | sim.col.actions | N | n/a | n/a | N |  | Keep |  |
| column | Next 13 weeks | 13 minggu ke depan | sim.detail.weeks | N | n/a | n/a | N |  | Keep | sr-only header over the expand button |

## Page: /buyer/stock-simulation — Weekly buckets (row detail) — `pages-v2/inventory/stockSimulationDisplay.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Week | Minggu | sim.detail.week | N | n/a | n/a | N |  | Keep |  |
| column | Supplier available | Tersedia di pemasok | sim.col.available | Y | "Supplier available stock" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:452) | Y | N |  | Change [Proposed] | Same as main table |
| column | Free to call off | Bebas untuk call-off | sim.col.free | Y | "Free to call off" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:473) | N | N |  | Keep |  |
| column | PTI inbound | Masuk ke PTI | sim.col.ptiInbound | Y | "PTI inbound" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:453) | N | N |  | Keep |  |
| column | In the week | Dalam minggu ini | sim.detail.events | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/capacity — Protection buffer — `pages-v2/inventory/ProtectionBufferSection.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | buffers.protection.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | buffers.protection.col.material | N | n/a | n/a | N |  | Keep |  |
| column | OSIP level | Level OSIP | buffers.protection.col.level | Y | "Level OSIP" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:143) | N | N |  | Keep |  |
| column | Month | Bulan | buffers.protection.col.month | N | n/a | n/a | N |  | Keep |  |
| column | LTP | LTP | buffers.protection.col.ltp | Y | "LTP" (DRC-PROPOSAL-2026-10-19.md:133) | N | N |  | Keep |  |
| column | Baseline | Baseline | buffers.protection.col.baseline | Y | "baseline" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:169) | N | N |  | Keep | Average LTP of the 3 previous months |
| column | Uplift | Kenaikan | buffers.protection.col.uplift | Y | "Uplift" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:162) | N | N |  | Ask Levi | Team writes it in English in ID text, but it is not on the TL-D6 list. Keep it English? |
| column | Protection buffer | Buffer proteksi | buffers.protection.col.buffer | Y | "protection buffer" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:160) | N | N | risk protection (XLS Guidance, PERTANYAAN-TIM-MATERIAL-2026-10-16.md:160) | Ask Levi | Team writes it in English in ID text, but it is not on the TL-D6 list. Keep it English? |

## Page: /buyer/capacity — Strategic buffer — `pages-v2/inventory/StrategicBufferSection.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | buffers.strategic.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | buffers.strategic.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Month | Bulan | buffers.strategic.col.month | N | n/a | n/a | N |  | Keep |  |
| column | LTP | LTP | buffers.strategic.col.ltp | Y | "LTP" (DRC-PROPOSAL-2026-10-19.md:133) | N | N |  | Keep |  |
| column | Baseline | Baseline | buffers.strategic.col.baseline | Y | "baseline = rata-rata 3 bulan sebelum festive" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:169) | N | N |  | Keep |  |
| column | Strategic buffer | Buffer strategis | buffers.strategic.col.buffer | Y | "Strategic buffer" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:168) | N | N |  | Ask Levi | Team writes it in English in ID text, but it is not on the TL-D6 list. Keep it English? |

## Page: /buyer/materials/trade-names — Trade names — `pages-v2/materials/BuyerTradeNames.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | PTI material | Material PTI | matName.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | matName.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Trade name | Nama dagang | matName.col.tradeName | N | n/a | n/a | N |  | Keep | Name, an identifier |
| column | Supplier material no. | No. material pemasok | matName.col.supplierNo | N | n/a | n/a | N |  | Keep |  |
| column | Submitted | Diajukan | matName.col.submitted | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | matName.col.state | Y | none found | n/a | N |  | Keep | Awaiting, approved, rejected |
| column | Action | Tindakan | matName.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/inventory — Stock table — `pages-v2/SupplierInventory.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | inv.col.material | N | n/a | n/a | N |  | Keep |  |
| column | PIC | PIC | pic.col | N | n/a | n/a | N |  | Keep | Text from shared PicHeader |
| column | Supplier stock | Stok pemasok | inv.col.supplierSoh | Y | "supplier stock" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:315) | N | N |  | Keep |  |
| column | Your reorder point | Titik pemesanan ulang Anda | inv.col.yourRop | Y | "ROP supplier diisi oleh supplier di template stok" (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:137) | N | ROP Supplier = system figure, /buyer/safety-stock |  | Keep | Supplier's own figure, display only |
| column | PTI stock | Stok PTI | inv.col.ptiSoh | Y | "PTI SOH" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:715) | N | N | PTI SOH (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:715) | Keep | Shown only when PTI shares its stock |
| column | PTI reorder point | Titik pemesanan ulang PTI | inv.col.ptiRop | Y | "PTI ROP" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:715) | Y | Reorder point = engine challenger, /buyer/safety-stock | ROP PTI (SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md:233) | Change [Proposed] | Source says "PTI ROP"; buyer page tile already says "PTI ROP" |
| column | Incoming | Akan datang | inv.col.incoming | Y | none found | n/a | N |  | Keep |  |
| column | Days of supply | Hari persediaan | inv.col.daysOfSupply | Y | "Days of supply" (SUPPLIER-HUB-REQUIREMENTS.md:146, CR-01) | N | N |  | Keep |  |
| column | Last update | Pembaruan terakhir | inv.col.lastUpdate | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/inventory — Current feedstock tab — `pages-v2/inventory/FeedstockConfirmPanel.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | fsConfirm.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Latest confirmation | Konfirmasi terakhir | fsConfirm.col.latest | Y | "Supplier confirms ... current feedstock, with a date" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:110, DRC-8) | N | N |  | Keep |  |
| column | This week | Minggu ini | fsConfirm.col.status | Y | "daily on a pull agreement, else weekly" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:110) | N | N |  | Keep | State: confirmed this week or due |
| column | Action | Tindakan | fsConfirm.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/inventory — Stock template tab — `pages-v2/inventory/StockUploadPanel.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Column | Kolom | inv.upload.columns.col.column | N | n/a | n/a | N |  | Keep | Template columns table; its rows are template field names |
| column | Name | Nama | inv.upload.columns.col.name | N | n/a | n/a | N |  | Keep |  |
| column | Required? | Wajib? | inv.upload.columns.col.presence | N | n/a | n/a | N |  | Keep |  |
| column | Meaning | Arti | inv.upload.columns.col.meaning | N | n/a | n/a | N |  | Keep |  |
| column | Row | Baris | inv.upload.col.row | N | n/a | n/a | N |  | Keep | Refused rows table |
| column | Material | Material | inv.upload.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Reason | Alasan | inv.upload.col.reason | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/inventory — My materials tab — `pages-v2/materials/SupplierMaterialNames.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | PTI material | Material PTI | matName.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Trade name | Nama dagang | matName.col.tradeName | N | n/a | n/a | N |  | Keep |  |
| column | Supplier material no. | No. material pemasok | matName.col.supplierNo | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | matName.col.state | Y | none found | n/a | N |  | Keep |  |
| column | Action | Tindakan | matName.col.action | N | n/a | n/a | N |  | Keep | Shown only to a seat that holds the verb |

## Page: /supplier/performance — KPI cards and PO tiles — `pages-v2/SupplierPerformance.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | On time and in full | Tepat waktu dan tepat jumlah | perf.otif | Y | "OTIF, On-Time In-Full" (SUPPLIER-HUB-REQUIREMENTS.md:118) | N | N | OTIF (SUPPLIER-HUB-REQUIREMENTS.md:118) | Keep |  |
| kpi | Delivered on the confirmed date | Terkirim pada tanggal yang dikonfirmasi | perf.cfot | Y | "CFOT, Casefill On-Time" (SUPPLIER-HUB-REQUIREMENTS.md:117) | Y | N | CFOT (SUPPLIER-HUB-REQUIREMENTS.md:117) | Change [Proposed] | Source names it CFOT |
| kpi | Rejections | Penolakan | perf.rejections | Y | none found | n/a | N |  | Keep |  |
| kpi | Overall score | Skor keseluruhan | perf.score | Y | none found | n/a | N |  | Keep |  |
| kpi | Total POs | Total PO | supplierPerformance.poMetric.totalPos | N | n/a | n/a | N |  | Keep |  |
| kpi | On Time | Tepat Waktu | supplierPerformance.poMetric.onTime | Y | none found | n/a | N |  | Keep | Count of POs on time; basis date not stated |
| kpi | Late | Terlambat | supplierPerformance.poMetric.late | Y | none found | n/a | N |  | Keep |  |
| kpi | Avg Overdue | Rata-rata Terlambat | supplierPerformance.poMetric.avgOverdue | Y | none found | n/a | N |  | Keep |  |
| kpi | Fixture names: ASN Accuracy, Defect / Reject Rate, Invoice Accuracy, Lead Time Variance, POA Response Time, and others | same as EN (not translated) | fixture services/data/mock/fixtures/supplierPerformance.js (shown at pages-v2/SupplierPerformance.jsx:161) | Y | none found | n/a | N |  | Ask Levi | Fixture data names, no i18n key or ID text |

## Page: /buyer/goods-receipt — KPIs (GoodsReceiptKpis.jsx) — `pages-v2/BuyerGoodsReceipt/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Pending Inspection | Menunggu Inspeksi | goodsReceipt.kpi.pending.eyebrow | Y | none found | n/a | N |  | Keep | State; SUPPLIER-HUB-REQUIREMENTS.md:1072 names "quality inspection" but no pending state |
| kpi | On Quality Hold | Ditahan Kualitas | goodsReceipt.kpi.hold.eyebrow | Y | "quality hold" (SUPPLIER-HUB-REQUIREMENTS.md:1072, REQ-E07-06 BR-06) | N | N |  | Keep |  |
| kpi | Approved Today | Disetujui Hari Ini | goodsReceipt.kpi.approvedToday.eyebrow | Y | receipt "Approved" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | N |  | Keep | CR-11 also has "Partially approved"; tooltip should say whether counted |
| kpi | Rejection Rate (30d) | Tingkat Penolakan (30h) | goodsReceipt.kpi.rejectionRate.eyebrow | Y | none found | n/a | N |  | Keep | No source defines the rate; tooltip formula needs a source |

## Page: /buyer/goods-receipt — Receipts table (GoodsReceiptTable.jsx) — `pages-v2/BuyerGoodsReceipt/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | GR / Refs | GR / Ref | goodsReceipt.table.col.grRefs | N | n/a | n/a | N |  | Keep | Identifier |
| column | Supplier | Pemasok | goodsReceipt.table.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Received | Diterima | goodsReceipt.table.col.received | N | n/a | n/a | N |  | Keep | Shows the receipt date |
| column | Received By | Diterima Oleh | goodsReceipt.table.col.receivedBy | N | n/a | n/a | N |  | Keep |  |
| column | Items | Item | goodsReceipt.table.col.items | N | n/a | n/a | N |  | Keep | Count of inspected lines |
| column | Status | Status | goodsReceipt.table.col.status | N | n/a | n/a | N |  | Keep | Generic header; values are CR-11 receipt states |
| column | Disposition | Disposisi | goodsReceipt.table.col.disposition | Y | none found | n/a | N |  | Keep | Derived disposition value; no hub doc defines it |
| column | SAP Doc | Dok SAP | goodsReceipt.table.col.sapDoc | N | n/a | n/a | N |  | Keep | Identifier |

## Page: /buyer/goods-receipt — Receipt line items panel (GrLineItems.jsx) — `pages-v2/BuyerGoodsReceipt/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | goodsReceipt.panel.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Exp | Eksp | goodsReceipt.panel.col.exp | Y | "ASN quantity" (SUPPLIER-HUB-REQUIREMENTS.md:1069); supplier GR page says "Shipped" | Y | Expiry ("Expiry", ASN pages, fc.asn.col.expiryShort) |  | Change [Proposed] | Abbreviation reads as Expiry; propose "Shipped" as on /supplier/goods-receipts |
| column | Recv | Diterima | goodsReceipt.panel.col.recv | Y | "received" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | N |  | Keep | Abbreviation of source word |
| column | Acc | Disetujui | goodsReceipt.panel.col.acc | Y | "accepted" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | Approved (receipt-level state, CR-11; "Disetujui" also on KPI Approved Today) |  | Ask Levi | ID "Disetujui" merges line Accepted with receipt Approved |
| column | Rej | Ditolak | goodsReceipt.panel.col.rej | Y | "Rejected quantity = received − accepted" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | N |  | Keep | Tooltip formula available from CR-11 |
| column | Checks | Pemeriksaan | goodsReceipt.panel.col.checks | Y | "halal and BPOM checks" (SUPPLIER-HUB-REQUIREMENTS.md:1072) | N | N |  | Keep | Legend V/P/H/B already under table |

## Page: /buyer/goods-receipt — Shipment discrepancies (DiscrepancySection.jsx) — `pages-v2/BuyerGoodsReceipt/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | ASN # | No. ASN | goodsReceipt.discrepancy.col.asn | N | n/a | n/a | N |  | Keep |  |
| column | PO ref | Ref. PO | goodsReceipt.discrepancy.col.po | N | n/a | n/a | N |  | Keep |  |
| column | Carrier | Pengangkut | goodsReceipt.discrepancy.col.carrier | N | n/a | n/a | N |  | Keep | Supplier shipments uses ID "Kurir" for Carrier |
| column | Tracking | Pelacakan | tpl.col.tracking | N | n/a | n/a | N |  | Keep | Key from threePl.js |
| column | Status | Status | goodsReceipt.discrepancy.col.status | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/goods-receipt — Supplier disputes (receipts/ReceiptDisputesSection.jsx) — `pages-v2/BuyerGoodsReceipt/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Goods receipt | Penerimaan barang | fc.grDispute.col.receipt | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | fc.grDispute.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Purchase order | Pesanan pembelian | fc.grDispute.col.po | N | n/a | n/a | N |  | Keep |  |
| column | Supplier comment | Komentar pemasok | fc.grDispute.col.comment | N | n/a | n/a | N |  | Keep |  |
| column | Disputed on | Disanggah pada | fc.grDispute.col.answered | N | n/a | n/a | N |  | Keep | Date |

## Page: /buyer/invoices — KPIs (InvoiceKpis.jsx) — `pages-v2/BuyerInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Pending Approval | Menunggu Persetujuan | buyerInvoices.kpi.pendingApproval.eyebrow | Y | statuses "Submitted, Verified" (SUPPLIER-HUB-REQUIREMENTS.md:1107) | Y | N |  | Keep | KPI groups statuses; tooltip should name which |
| kpi | Payments Released | Pembayaran Dirilis | buyerInvoices.kpi.released.eyebrow | Y | status "Paid" (SUPPLIER-HUB-REQUIREMENTS.md:1107) | Y | N |  | Keep | Supplier page says "Payments Received" for same figure |
| kpi | Disputed | Disengketakan | buyerInvoices.kpi.disputed.eyebrow | Y | "return it with a reason" (SUPPLIER-HUB-REQUIREMENTS.md:1118); summary says "invoice returned" | Y | N |  | Ask Levi | Supplier KPI for same key reads "Returned"; one state, two words |
| kpi | Overdue | Jatuh Tempo | buyerInvoices.kpi.overdue.eyebrow | Y | "Overdue" (SUPPLIER-HUB-REQUIREMENTS.md:159, CR-14) | N | Due date (ID "Jatuh tempo", same page's Due date column) |  | Change [Proposed] | ID reads "due", not "overdue"; propose "Lewat jatuh tempo" |

## Page: /buyer/invoices — Invoice queue (InvoiceQueueTable.jsx) — `pages-v2/BuyerInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Invoice # | No. Faktur | buyerInvoices.table.invoiceNo | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | buyerInvoices.table.supplier | N | n/a | n/a | N |  | Keep |  |
| column | PO ref | Ref PO | buyerInvoices.table.poRef | N | n/a | n/a | N |  | Keep |  |
| column | Amount | Jumlah | buyerInvoices.table.amount | N | n/a | n/a | N |  | Keep |  |
| column | 3-way match | Pencocokan 3 arah | buyerInvoices.table.match | Y | "match status: Matched or Exception" (SUPPLIER-HUB-REQUIREMENTS.md:1106; CR-12, CR-13) | Y | N | three-way matching (industry; DECISION-GUIDE.md:762) | Ask Levi | Supplier invoices column says "Match"; align buyer label? |
| column | Status | Status | buyerInvoices.table.status | N | n/a | n/a | N |  | Keep |  |
| column | Due date | Jatuh tempo | buyerInvoices.table.dueDate | N | n/a | n/a | N |  | Keep | Date; CR-14 rule could feed tooltip |
| column | SAP FI | SAP FI | buyerInvoices.table.sapFi | N | n/a | n/a | N |  | Keep | SAP document identifier |
| column | Actions | Tindakan | buyerInvoices.table.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/invoices — Aging tab (AgingTab.jsx) — `pages-v2/BuyerInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Aging bucket | Rentang umur | buyerInvoices.aging.bucket | Y | none found | n/a | N |  | Keep | Bucket boundaries need a source for tooltip |
| column | Count | Jumlah | buyerInvoices.aging.count | N | n/a | n/a | N |  | Keep | ID "Jumlah" also used for Amount elsewhere |
| column | Amount | Nilai | buyerInvoices.aging.amount | N | n/a | n/a | N |  | Keep |  |
| column | % of AP | % dari AP | buyerInvoices.aging.pctAp | Y | none found | n/a | N |  | Keep | AP = Accounts Payable (SUPPLIER-HUB-REQUIREMENTS.md:84, FIN role) |
| column | Risk | Risiko | buyerInvoices.aging.risk | Y | none found | n/a | Alert risk class (CR-24, inventory alerts) |  | Keep | Rule behind invoice risk not in hub docs |

## Page: /buyer/invoices — Remittance advice rows (RemittanceSection.jsx) — `pages-v2/BuyerInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| row | Invoice no | No. faktur | buyerInvoices.remit.invoiceNo | N | n/a | n/a | N |  | Keep | Key-value table rows |
| row | PO reference | Referensi PO | buyerInvoices.field.poReference | N | n/a | n/a | N |  | Keep |  |
| row | Amount | Jumlah | buyerInvoices.field.amount | N | n/a | n/a | N |  | Keep |  |
| row | Payment date | Tanggal pembayaran | buyerInvoices.field.paymentDate | N | n/a | n/a | N |  | Keep |  |
| row | Bank account | Rekening bank | buyerInvoices.field.bankAccount | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/invoices — Invoice lines (invoices/InvoiceCollaboration.jsx, InvoiceLinesSection; also on /supplier/invoices detail) — `pages-v2/BuyerInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Receipt | Penerimaan | fc.inv.new.col.receipt | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | fc.inv.new.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Quantity | Kuantitas | fc.inv.new.col.quantity | Y | "invoiced quantity" (SUPPLIER-HUB-REQUIREMENTS.md:157, CR-12) | N | N |  | Keep | Context makes "invoiced" clear |
| column | PO unit price | Harga satuan PO | fc.inv.new.col.unitPrice | Y | "PO unit price" (SUPPLIER-HUB-REQUIREMENTS.md:157, CR-12) | N | N |  | Keep |  |
| column | Value | Nilai | fc.inv.new.col.value | Y | "Expected value = invoiced quantity × PO unit price" (SUPPLIER-HUB-REQUIREMENTS.md:157) | Y | N |  | Change [Proposed] | Propose "Expected value"; sub-row shows "Billed" beside it |

## Page: /buyer/orders — KPIs (OrdersKpis.jsx) — `pages-v2/BuyerOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Total Open POs | Total PO Terbuka | buyerOrders.kpi.open.eyebrow | Y | "open PO" (SUPPLIER-HUB-REQUIREMENTS.md:849) | N | N |  | Keep | Count of POs; not OSPO quantity (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:240) |
| kpi | Pending Confirmation | Menunggu Konfirmasi | buyerOrders.kpi.pending.eyebrow | Y | "Awaiting response" (SUPPLIER-HUB-REQUIREMENTS.md:884) | Y | The 3 confirmations (capacity, foresight, shipping notice; §3.2) |  | Change [Proposed] | Propose "Awaiting response"; "confirmation" means the 3 confirmations in hub |
| kpi | In Transit | Dalam Perjalanan | buyerOrders.kpi.transit.eyebrow | Y | "in transit" (SUPPLIER-HUB-REQUIREMENTS.md:969) | N | N |  | Keep |  |
| kpi | Overdue | Jatuh Tempo | buyerOrders.kpi.overdue.eyebrow | Y | none found | n/a | Due date ("Jatuh tempo") |  | Change [Proposed] | ID reads "due", not "overdue"; propose "Lewat jatuh tempo" |

## Page: /buyer/orders — Orders list (OrdersTable.jsx) — `pages-v2/BuyerOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | PO # | No. PO | buyerOrders.table.col.po | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | buyerOrders.table.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Material / Category | Material / Kategori | buyerOrders.table.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Order date | Tanggal pesanan | buyerOrders.table.col.orderDate | N | n/a | n/a | N |  | Keep |  |
| column | Delivery | Pengiriman | buyerOrders.table.col.delivery | N | n/a | n/a | N |  | Keep | Date |
| column | Value | Nilai | buyerOrders.table.col.value | N | n/a | n/a | N |  | Keep |  |
| column | Channel | Kanal | buyerOrders.table.col.channel | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | buyerOrders.table.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Actions | Tindakan | buyerOrders.table.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/orders — PO line items panel (PoLineItems.jsx) — `pages-v2/BuyerOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | buyerOrders.lines.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Qty | Jml | buyerOrders.lines.col.qty | N | n/a | n/a | N |  | Keep |  |
| column | Unit | Satuan | buyerOrders.lines.col.unit | N | n/a | n/a | Unit of measure (ID "Satuan", e.g. UoM on /buyer/shipments) |  | Change [Proposed] | Column shows unit price; ID "Satuan" means UoM; propose "Harga satuan" |
| column | Line total | Total baris | buyerOrders.lines.col.lineTotal | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/orders — PO response details (orders/PoCollaboration.jsx, PoResponseDetails; also on /supplier/orders detail) — `pages-v2/BuyerOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | oc.response.col.line | N | n/a | n/a | N |  | Keep |  |
| column | Ordered | Dipesan | oc.response.col.ordered | Y | "ordered quantity" (SUPPLIER-HUB-REQUIREMENTS.md:155, CR-10) | N | N |  | Keep |  |
| column | Can supply | Sanggup dipasok | oc.response.col.counterQty | Y | "counter-offer quantity" (SUPPLIER-HUB-REQUIREMENTS.md:155, CR-10; :812) | Y | N |  | Change [Proposed] | Propose "Counter-offer quantity" per BR-01 |
| column | Can deliver | Sanggup dikirim | oc.response.col.counterDate | Y | "counter-offer of date" (SUPPLIER-HUB-REQUIREMENTS.md:812, REQ-E07-02 BR-04) | Y | N |  | Change [Proposed] | Propose "Counter-offer date" per BR-01 |
| column | Reason | Alasan | oc.response.col.reason | N | "reason code" (SUPPLIER-HUB-REQUIREMENTS.md:813) | n/a | N |  | Keep | Predefined reason codes |

## Page: /buyer/orders?view=summary — Order summary (orders/OrderSummaryView.jsx via BuyerOrderSummary.jsx; also /supplier/orders?view=summary without Supplier column) — `pages-v2/BuyerOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Purchase order | Pesanan pembelian | oc.summary.col.po | N | "PO number" (SUPPLIER-HUB-REQUIREMENTS.md:882) | Y | N |  | Keep | Identifier; minor wording gap |
| column | Supplier | Pemasok | oc.summary.col.supplier | N | n/a | n/a | N |  | Keep | PTI summary only |
| column | Response | Tanggapan | oc.summary.col.response | Y | "Response" (SUPPLIER-HUB-REQUIREMENTS.md:884) | N | N |  | Keep |  |
| column | ASNs | ASN | oc.summary.col.asns | Y | "ASNs" (SUPPLIER-HUB-REQUIREMENTS.md:885) | N | N |  | Keep |  |
| column | Call-offs | Penarikan | oc.summary.col.callOffs | Y | "Call-offs" (SUPPLIER-HUB-REQUIREMENTS.md:886); team writes "call-off" in ID text (PERTANYAAN-TIM-MATERIAL-2026-10-16.md:39, :218) | N | N |  | Ask Levi | ID translates team English "call-off"; not on TL-D6 list |
| column | Confirmations | Konfirmasi | oc.summary.col.confirmations | Y | "the 3 confirmations" (SUPPLIER-HUB-REQUIREMENTS.md:865, §3.2) | N | N |  | Keep | Source lists 3 columns; code groups them with Cap/Fore/Ship cell labels |
| column | Receipts | Penerimaan barang | oc.summary.col.receipts | Y | "Goods receipts" (SUPPLIER-HUB-REQUIREMENTS.md:890) | Y | N |  | Change [Proposed] | Propose "Goods receipts" EN; ID already matches |
| column | Invoices | Faktur | oc.summary.col.invoices | Y | "Invoices" (SUPPLIER-HUB-REQUIREMENTS.md:891) | N | N |  | Keep |  |

## Page: /buyer/purchase-requisition — KPIs (RequisitionKpis.jsx) — `pages-v2/BuyerRequisitions/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Draft | Draf | requisitions.kpi.draft.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Pending Approval | Menunggu Persetujuan | requisitions.kpi.pending.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Approved | Disetujui | requisitions.kpi.approved.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Sourcing Event | Acara Sourcing | requisitions.kpi.sourcing.eyebrow | Y | "sourcing event" (SUPPLIER-HUB-REQUIREMENTS.md § 3.6a) | N | N |  | Keep |  |
| kpi | PO Created | PO Dibuat | requisitions.kpi.po.eyebrow | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/purchase-requisition — Requisition table (RequisitionTable.jsx) — `pages-v2/BuyerRequisitions/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | PR # | No. PR | requisitions.table.col.pr | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | requisitions.table.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Category | Kategori | requisitions.table.col.category | N | n/a | n/a | N |  | Keep |  |
| column | Qty | Jml | requisitions.table.col.qty | N | n/a | n/a | N |  | Keep |  |
| column | Required | Dibutuhkan | requisitions.table.col.required | N | n/a | n/a | N |  | Keep | Date |
| column | Est. value | Nilai est. | requisitions.table.col.estValue | N | n/a | n/a | N |  | Keep |  |
| column | Requestor | Pemohon | requisitions.table.col.requestor | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | requisitions.table.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Source | Sumber | requisitions.table.col.source | Y | none found | n/a | N |  | Keep | Shows "PIR" or none; PIR undefined in hub docs |
| column | Linked doc | Dok. tertaut | requisitions.table.col.linkedDoc | N | n/a | n/a | N |  | Keep |  |
| column | Actions | Tindakan | requisitions.table.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/shipments — KPIs (ShipmentsKpis.jsx) — `pages-v2/BuyerShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | In Transit | Dalam Perjalanan | shipments.kpi.inTransit.eyebrow | Y | "in transit" (SUPPLIER-HUB-REQUIREMENTS.md:969) | N | N |  | Keep |  |
| kpi | At Dock / Unloading | Di Dok / Bongkar Muat | shipments.kpi.atDock.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Delayed | Terlambat | shipments.kpi.delayed.eyebrow | Y | none found | n/a | Delayed call-off (LTP drop, needs supplier approval), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:32 |  | Keep | Tooltip "Not" line should name delayed call-off |
| kpi | Arriving Today | Tiba Hari Ini | shipments.kpi.arrivingToday.eyebrow | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/shipments — Shipments table (ShipmentsTable.jsx) — `pages-v2/BuyerShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | ASN / PO | ASN / PO | shipments.table.col.asnPo | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | shipments.table.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Mode | Moda | shipments.table.col.mode | N | n/a | n/a | N |  | Keep |  |
| column | Route | Rute | shipments.table.col.route | N | n/a | n/a | N |  | Keep |  |
| column | Ship Date | Tanggal Kirim | shipments.table.col.shipDate | N | n/a | n/a | N |  | Keep |  |
| column | ETA | ETA | shipments.table.col.eta | N | n/a | n/a | N |  | Keep |  |
| column | Packages | Paket | shipments.table.col.packages | N | n/a | n/a | N |  | Keep |  |
| column | Dock | Dermaga | shipments.table.col.dock | N | n/a | n/a | N |  | Keep | KPI "At Dock" uses ID "Dok" for the same word |
| column | Status | Status | shipments.table.col.status | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/shipments — Shipment line items (ShipmentLineItems.jsx) — `pages-v2/BuyerShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | shipments.panel.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Description | Deskripsi | shipments.panel.col.description | N | n/a | n/a | N |  | Keep |  |
| column | Qty | Jml | shipments.panel.col.qty | N | n/a | n/a | N |  | Keep |  |
| column | UoM | Satuan | shipments.panel.col.uom | N | n/a | n/a | N |  | Keep | Unit |

## Page: /buyer/shipments — Shelf-life exceptions (shipments/AsnShelfLifeExceptions.jsx) — `pages-v2/BuyerShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | ASN | ASN | fc.asn.shelfLife.col.asn | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | fc.asn.shelfLife.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Batch | Batch | fc.asn.shelfLife.col.batch | N | n/a | n/a | N |  | Keep |  |
| column | Expiry | Kedaluwarsa | fc.asn.shelfLife.col.expiry | N | n/a | n/a | N |  | Keep | Date |
| column | ETA | ETA | fc.asn.shelfLife.col.eta | N | n/a | n/a | N |  | Keep |  |
| column | Left at ETA | Sisa saat ETA | fc.asn.shelfLife.col.left | Y | "months left at ETA" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:353); "remaining shelf life" (SUPPLIER-HUB-REQUIREMENTS.md:981) | N | N |  | Keep | Tooltip rule from REQ-E07-04 BR-10 |
| column | Supplier reason | Alasan pemasok | fc.asn.shelfLife.col.reason | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/goods-receipts — Receipts table — `pages-v2/SupplierGoodsReceipts.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Goods receipt | Penerimaan barang | fc.gr.col.receipt | N | n/a | n/a | N |  | Keep |  |
| column | ASN | ASN | fc.gr.col.asn | N | n/a | n/a | N |  | Keep |  |
| column | Purchase order | Pesanan pembelian | fc.gr.col.po | N | n/a | n/a | N |  | Keep |  |
| column | Receipt date | Tanggal terima | fc.gr.col.receivedOn | N | n/a | n/a | N |  | Keep |  |
| column | Shipped | Dikirim | fc.gr.col.shipped | Y | "shipped" / "ASN quantity" (SUPPLIER-HUB-REQUIREMENTS.md:1069, REQ-E07-06) | N | N |  | Keep |  |
| column | Received | Diterima | fc.gr.col.received | Y | "received" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | N |  | Keep |  |
| column | Rejected | Ditolak | fc.gr.col.rejected | Y | "Rejected quantity" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | N |  | Keep |  |
| column | Quality result | Hasil mutu | fc.gr.col.qc | Y | "quality inspection result" (SUPPLIER-HUB-REQUIREMENTS.md:1072) | N | N |  | Keep |  |
| column | Discrepancy | Selisih | fc.gr.col.discrepancy | Y | "discrepancy" (SUPPLIER-HUB-REQUIREMENTS.md:1069, CR-25) | N | Team "selisih" = DA planning vs execution gap, PERTANYAAN-TIM-MATERIAL-2026-10-16.md:25, :32 |  | Ask Levi | ID "Selisih" also labels Difference column in this page's panel |
| column | Action | Tindakan | fc.gr.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/goods-receipts — Receipt lines panel — `pages-v2/SupplierGoodsReceipts.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | fc.asn.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Shipped | Dikirim | fc.gr.col.shipped | Y | "shipped" (SUPPLIER-HUB-REQUIREMENTS.md § REQ-E07-06) | N | N |  | Keep |  |
| column | Received | Diterima | fc.gr.col.received | Y | "received" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | N |  | Keep |  |
| column | Difference | Selisih | fc.gr.col.difference | Y | "differs from ASN quantity"; "50-unit discrepancy" (SUPPLIER-HUB-REQUIREMENTS.md § REQ-E07-06) | N | Discrepancy (ID "Selisih", same page's main table) |  | Keep | Same ID word as Discrepancy; see Ask Levi |
| column | Rejected | Ditolak | fc.gr.col.rejected | Y | "Rejected quantity" (SUPPLIER-HUB-REQUIREMENTS.md:156, CR-11) | N | N |  | Keep |  |

## Page: /supplier/invoices — KPIs (InvoiceKpis.jsx) — `pages-v2/SupplierInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Payments Received | Pembayaran Diterima | supplierInvoices.kpi.received.eyebrow | Y | status "Paid" (SUPPLIER-HUB-REQUIREMENTS.md:1107) | Y | N |  | Keep | KPI title, not a status word |
| kpi | Pending Payment | Menunggu Pembayaran | supplierInvoices.kpi.pending.eyebrow | Y | "Scheduled for payment" (SUPPLIER-HUB-REQUIREMENTS.md:1107) | Y | N |  | Keep | Tooltip should name statuses counted |
| kpi | Returned | Dikembalikan | supplierInvoices.kpi.disputed.eyebrow | Y | "return it with a reason" (SUPPLIER-HUB-REQUIREMENTS.md:1118) | N | N |  | Keep | Buyer KPI calls this "Disputed"; see Ask Levi |

## Page: /supplier/invoices — Invoice table (InvoiceTable.jsx) — `pages-v2/SupplierInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Invoice # | No. Faktur | supplierInvoices.table.invoiceNo | N | n/a | n/a | N |  | Keep |  |
| column | PO ref | Ref PO | supplierInvoices.table.poRef | N | n/a | n/a | N |  | Keep |  |
| column | Amount | Jumlah | supplierInvoices.table.amount | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | supplierInvoices.table.status | N | n/a | n/a | N |  | Keep |  |
| column | Match | Pencocokan | fc.inv.col.match | Y | "match status: Matched or Exception" (SUPPLIER-HUB-REQUIREMENTS.md:1106; CR-12, CR-13) | N | N |  | Keep |  |
| column | Due date | Jatuh Tempo | supplierInvoices.table.dueDate | N | n/a | n/a | N |  | Keep |  |
| column | Payment date | Tanggal Pembayaran | supplierInvoices.table.paymentDate | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | supplierInvoices.table.action | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/invoices — New / fix invoice line quantities (LineQtyTable.jsx) — `pages-v2/SupplierInvoices/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Receipt | Penerimaan | fc.inv.new.col.receipt | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | fc.inv.new.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Quantity | Kuantitas | fc.inv.new.col.quantity | Y | "Invoiced quantity cannot exceed received minus already invoiced" (SUPPLIER-HUB-REQUIREMENTS.md § REQ-E07-07 BR-02) | N | N |  | Ask Levi | Header over quantity inputs; column header or form field (BR-05)? |
| column | PO unit price | Harga satuan PO | fc.inv.new.col.unitPrice | Y | "PO unit price" (SUPPLIER-HUB-REQUIREMENTS.md:157, CR-12) | N | N |  | Keep |  |

## Page: /supplier/orders — KPIs (OrdersKpis.jsx) — `pages-v2/SupplierOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Open Orders | Pesanan Terbuka | supplierOrders.kpi.openOrders.eyebrow | Y | "open PO" (SUPPLIER-HUB-REQUIREMENTS.md:849) | N | N |  | Keep |  |
| kpi | In Progress | Sedang Berjalan | supplierOrders.kpi.inProgress.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Total Value Pending | Total Nilai Tertunda | supplierOrders.kpi.totalValue.eyebrow | Y | none found | n/a | N |  | Keep | Tooltip needs what "pending" value includes |
| kpi | Delivered | Terkirim | supplierOrders.kpi.delivered.eyebrow | Y | none found | n/a | N |  | Keep |  |

## Page: /supplier/orders — Orders table (OrdersTable.jsx) — `pages-v2/SupplierOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | PO # | PO # | supplierOrders.col.po | N | n/a | n/a | N |  | Keep | Buyer side ID is "No. PO" |
| column | Order date | Tanggal pesanan | supplierOrders.col.orderDate | N | n/a | n/a | N |  | Keep |  |
| column | Requested delivery | Pengiriman diminta | supplierOrders.col.requestedDelivery | N | n/a | n/a | N |  | Keep | Date |
| column | Items | Item | supplierOrders.col.items | N | n/a | n/a | N |  | Keep |  |
| column | Value | Nilai | supplierOrders.col.value | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | supplierOrders.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | supplierOrders.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/orders — PO line items (LineItemsSection.jsx) — `pages-v2/SupplierOrders/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | supplierOrders.panel.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Ordered | Dipesan | supplierOrders.panel.col.ordered | Y | "ordered quantity" (SUPPLIER-HUB-REQUIREMENTS.md:155, CR-10) | N | N |  | Keep |  |
| column | Confirmed | Dikonfirmasi | supplierOrders.panel.col.confirmed | Y | "counter-offer quantity" (SUPPLIER-HUB-REQUIREMENTS.md:155, CR-10) | Y | The 3 confirmations (§3.2) |  | Ask Levi | Header over confirm-quantity inputs; in scope (BR-05)? Source word differs |

## Page: /supplier/shipments — KPIs (ShipmentsKpiRow.jsx) — `pages-v2/SupplierShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Draft | Draf | supplierShipments.kpi.draft.eyebrow | Y | "Draft" (SUPPLIER-HUB-REQUIREMENTS.md:984) | N | N |  | Keep |  |
| kpi | Submitted | Diajukan | supplierShipments.kpi.submitted.eyebrow | Y | "Submitted" (SUPPLIER-HUB-REQUIREMENTS.md:978) | N | N |  | Keep |  |
| kpi | In Transit | Dalam Perjalanan | supplierShipments.kpi.inTransit.eyebrow | Y | "In Transit" (SUPPLIER-HUB-REQUIREMENTS.md:978) | N | N |  | Keep |  |
| kpi | Delivered | Terkirim | supplierShipments.kpi.delivered.eyebrow | Y | "Delivered" (SUPPLIER-HUB-REQUIREMENTS.md:978) | N | N |  | Keep |  |
| kpi | Discrepancy | Selisih | supplierShipments.kpi.discrepancy.eyebrow | Y | "discrepancy" (SUPPLIER-HUB-REQUIREMENTS.md:1069) | N | Team "selisih" = DA planning vs execution gap, PERTANYAAN-TIM-MATERIAL-2026-10-16.md:25 |  | Keep | "Awaiting exception" state (:978) has no KPI |

## Page: /supplier/shipments — ASN list (ShipmentsList.jsx) — `pages-v2/SupplierShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | ASN # | ASN # | supplierShipments.col.asn | N | n/a | n/a | N |  | Keep |  |
| column | PO ref | Ref PO | supplierShipments.col.poRef | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | supplierShipments.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Carrier | Kurir | supplierShipments.col.carrier | N | n/a | n/a | N |  | Keep | Buyer GR page ID is "Pengangkut" |
| column | Tracking | Pelacakan | supplierShipments.col.tracking | N | n/a | n/a | N |  | Keep |  |
| column | ETA | ETA | supplierShipments.col.eta | N | n/a | n/a | N |  | Keep |  |
| column | Actions | Tindakan | supplierShipments.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/shipments — ASN detail lines (AsnDetailLines.jsx) — `pages-v2/SupplierShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | supplierShipments.lineItems.col.material | N | n/a | n/a | N |  | Keep |  |
| column | PIC | PIC | pic.col | N | "MRP controller (PIC)" (SUPPLIER-HUB-REQUIREMENTS.md:1499) | N | N | MRP controller (SUPPLIER-HUB-REQUIREMENTS.md § REQ-E08-07) | Keep | Rendered by shared PicHeader (materials/picDisplay.jsx); key in mrpController.js |
| column | Ordered | Dipesan | supplierShipments.lineItems.col.ordered | Y | "ordered quantity" (SUPPLIER-HUB-REQUIREMENTS.md:155) | N | N |  | Keep |  |
| column | Shipped | Dikirim | supplierShipments.lineItems.col.shipped | Y | "shipped quantity" (SUPPLIER-HUB-REQUIREMENTS.md:976) | N | N |  | Keep |  |
| column | Lot | Lot | supplierShipments.lineItems.col.lot | N | "batch number" (SUPPLIER-HUB-REQUIREMENTS.md:976) | Y | N |  | Change [Proposed] | Same page's ASN editor says "Batch number"; propose "Batch" |
| column | Expiry | Kedaluwarsa | fc.asn.col.expiryShort | N | n/a | n/a | N |  | Keep | Date |

## Page: /supplier/shipments — ASN lines editor (AsnLinesEditor.jsx, in SubmitAsnPanel and WizardDetailsStep) — `pages-v2/SupplierShipments/index.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | fc.asn.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Open quantity | Kuantitas terbuka | fc.asn.col.open | Y | "open quantity on the call-off" (SUPPLIER-HUB-REQUIREMENTS.md:973) | N | N |  | Keep | Read-only column |
| column | Shipped quantity | Kuantitas dikirim | fc.asn.col.shipped | Y | "shipped quantity" (SUPPLIER-HUB-REQUIREMENTS.md:976) | N | N |  | Ask Levi | Header over quantity inputs; column header or form field (BR-05)? |
| column | Batch number | Nomor batch | fc.asn.col.batch | N | "batch number" (SUPPLIER-HUB-REQUIREMENTS.md:976) | N | N |  | Keep | Header over inputs |
| column | Expiry date | Tanggal kedaluwarsa | fc.asn.col.expiry | N | "expiry date" (SUPPLIER-HUB-REQUIREMENTS.md:976) | N | N |  | Keep | Header over inputs |

## Page: /buyer/rfi — RFI list — `pages-v2/BuyerRfi.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Title | Judul | rfx.rfi.eventTitle | N | n/a | n/a | N |  | Keep |  |
| column | Response deadline | Batas waktu jawaban | rfx.deadline | N | n/a | n/a | N |  | Keep | Date |
| column | Template | Templat | rfx.rfi.template | N | n/a | n/a | N |  | Keep |  |
| column | Submitted | Terkirim | rfx.response.submitted | N | n/a | n/a | N |  | Keep | Cell reads "n of m submitted" |

## Page: /buyer/rfi and /buyer/rfp — create wizard, invitee step — `pages-v2/rfx/RfxInviteeStep.jsx` (RFI and RFP wizards)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rfx.invite.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Purchasing group | Grup pembelian | rfx.invite.col.group | N | n/a | n/a | N |  | Keep | Identifier |
| column | Country | Negara | rfx.invite.col.country | N | n/a | n/a | N |  | Keep |  |
| column | Certificates | Sertifikat | supFilter.col.certificates | Y | "certificate validity (halal and BPOM expiry)" SHR:356 | Y | N |  | Ask Levi | Column shows validity state; source says "certificate validity". Rename or keep? |
| column | Band | Kelompok | supFilter.col.band | Y | "performance band" SHR:356; DG:110 | Y | N |  | Change [Proposed] | Source word is "performance band"; "Band" alone is unclear |
| column | On time in full | Tepat waktu dan lengkap | rfx.invite.col.otif | Y | "OTIF (On-Time In-Full)" KMN:91; "OTIF is measured per call-off" KMN:84 | Y | N | OTIF (KMN:91) | Change [Proposed] | MoM writes OTIF; RFQ wizard already shows "OTIF" |

## Page: /buyer/rfi/:rfiId — Invited suppliers — `pages-v2/BuyerRfiEvent.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rfx.invite.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | On time in full | Tepat waktu dan lengkap | rfx.invite.col.otif | Y | "OTIF (On-Time In-Full)" KMN:91 | Y | N | OTIF (KMN:91) | Change [Proposed] | Same as invitee step |
| column | Your deadline | Batas waktu Anda | rfx.deadline.own | N | n/a | n/a | N |  | Change [Proposed] | Buyer page shows each invitee's deadline; "Your" is wrong for the buyer |
| column | Submitted | Terkirim | rfx.response.submitted | N | n/a | n/a | N |  | Keep |  |
| column | Confidentiality accepted | Kerahasiaan disetujui | rfxa.conf.col | Y | "accepts the confidentiality terms" SHR:553; "confidentiality gate" RFXI:42 | N | N |  | Keep | Conditional column |
| column | For the selected suppliers | Untuk pemasok yang dipilih | rfx.rfi.extendSelected | N | n/a | n/a | N |  | Keep | Header of a selection-checkbox column (extend deadline) |

## Page: /buyer/rfi/:rfiId — Answers grid (Compare) — `pages-v2/rfx/RfiProposals.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Section | Bagian | rfx.rfi.section | N | n/a | n/a | N |  | Keep | Rows are the event's questions (data) |
| column | Response score (sub-line under each supplier header) | Nilai jawaban | rfx.rfi.score | Y | "a weighted question produces a response score that shortlists and never awards" SHR:410 | N | N |  | Keep | Header label is the supplier name (data) |

## Page: /buyer/rfi/:rfiId — Supplier documents — `pages-v2/rfx/SupplierDocumentsPanel.jsx` (also on /buyer/rfq/:rfqId and /buyer/rfp/:rfpId)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Request | Permintaan | rfxFiles.col.request | N | n/a | n/a | N |  | Keep |  |
| column | File | Berkas | rfxFiles.col.file | N | n/a | n/a | N |  | Keep |  |
| column | Type | Jenis | rfxFiles.col.type | N | n/a | n/a | N |  | Keep |  |
| column | Size | Ukuran | rfxFiles.col.size | N | n/a | n/a | N |  | Keep |  |
| column | Uploaded | Diunggah | rfxFiles.col.uploaded | N | n/a | n/a | N |  | Keep | Date |
| column | Uploaded by | Diunggah oleh | rfxFiles.col.uploadedBy | N | n/a | n/a | N |  | Keep |  |
| column | Version | Versi | rfxFiles.col.version | N | n/a | n/a | N |  | Keep | Conditional column |
| column | Certificate | Sertifikat | rfxFiles.col.certificate | Y | "certificate number, issuer and expiry date … expired … flagged to the buyer" SHR:195 (CE-11d) | N | N |  | Keep | Shows number, expiry and the expired flag |
| column | Opened by | Dibuka oleh | rfxFiles.col.openedBy | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/rfp — RFP list — `pages-v2/BuyerRfp/components/RfpEventTable.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Title | Judul | rfx.rfi.eventTitle | N | n/a | n/a | N |  | Keep |  |
| column | Response deadline | Batas waktu jawaban | rfx.deadline | N | n/a | n/a | N |  | Keep |  |
| column | Term | Syarat | rfx.rfp.col.term | N | n/a | n/a | N |  | Keep | Cell is a count ("N terms", options, points) |
| column | Submitted | Terkirim | rfx.response.submitted | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/rfp/:rfpId — Terms sent (Overview) — `pages-v2/BuyerRfp/components/RfpComparison.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Term | Syarat | rfx.rfp.col.term | N | n/a | n/a | N |  | Keep | Rows are the RFP's terms (data) |
| column | PTI asks for | Yang diminta PTI | rfx.rfp.col.requested | Y | "PTI's requested value" SHR:621; SHR:565 | Y | N |  | Change [Proposed] | Source word is "requested value" |

## Page: /buyer/rfp/:rfpId — Terms compare grid — `pages-v2/BuyerRfp/components/RfpComparison.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Term | Syarat | rfx.rfp.col.term | N | n/a | n/a | N |  | Keep |  |
| column | PTI asks for | Yang diminta PTI | rfx.rfp.col.requested | Y | "PTI's requested value" SHR:621 | Y | N |  | Change [Proposed] | As Overview |
| column | {{count}} deviations (sub-line under each supplier) | {{count}} penyimpangan | rfx.rfp.deviations | Y | "Comply or Deviate" SHR:566 | N | N |  | Keep | Count of terms the supplier deviates on |
| column | Weighted score (sub-line under each supplier) | Nilai berbobot | rfx.rfp.scored | Y | "a CR-15 score only when the RFP has both a price and a lead-time term" RFXI:67; CR-15 SHR:160 | N | N |  | Keep | Formula CR-15 |
| row | Other terms | Syarat lain | rfx.rfp.otherTerms | N | n/a | n/a | N |  | Keep | Free text from supplier |
| row | Documents | Dokumen | rfxFiles.docs.row | Y | "Documents from suppliers" step RFXI:183 | N | N |  | Keep | Shows received vs requested documents |

## Page: /buyer/rfp/:rfpId — Invitees — `pages-v2/BuyerRfp/components/RfpInvitees.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rfx.invite.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | On time in full | Tepat waktu dan lengkap | rfx.invite.col.otif | Y | "OTIF (On-Time In-Full)" KMN:91 | Y | N | OTIF (KMN:91) | Change [Proposed] |  |
| column | Your deadline | Batas waktu Anda | rfx.deadline.own | N | n/a | n/a | N |  | Change [Proposed] | Buyer view; "Your" is wrong |
| column | Submitted | Terkirim | rfx.response.submitted | N | n/a | n/a | N |  | Keep |  |
| column | Confidentiality accepted | Kerahasiaan disetujui | rfxa.conf.col | Y | "accepts the confidentiality terms" SHR:553 | N | N |  | Keep |  |
| column | T&C accepted | S&K disetujui | rfxa.tc.col | Y | "accepts … the T&Cs where asked" SHR:553; SHR:567 BR-05 | N | N |  | Keep |  |

## Page: /buyer/rfp/:rfpId — By supplier, terms — `pages-v2/BuyerRfp/components/RfpProposals.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Term | Syarat | rfx.rfp.col.term | N | n/a | n/a | N |  | Keep |  |
| column | PTI asks for | Yang diminta PTI | rfx.rfp.col.requested | Y | "PTI's requested value" SHR:621 | Y | N |  | Change [Proposed] |  |
| column | Proposed | Yang diusulkan | rfx.rfp.col.proposed | Y | "the supplier's proposed value" SHR:621 | N | N |  | Keep |  |
| column | Comply or deviate | Patuh atau menyimpang | rfx.bySupplier.stance | Y | "Comply or Deviate" SHR:621, SHR:566 | N | N |  | Keep |  |
| column | Comment | Komentar | rfx.bySupplier.comment | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/rfp/:rfpId — Question answers — `pages-v2/BuyerRfp/components/RfpQuestionAnswers.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Section | Bagian | rfx.rfi.section | N | n/a | n/a | N |  | Keep | Other columns are supplier names |

## Page: /buyer/rfp/:rfpId — Indicative pricing compare — `pages-v2/rfx/RfpPricing.jsx` (RfpPricingComparison)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Option | Pilihan | rfxa.pricing.col.option | N | n/a | n/a | N |  | Keep | Other columns are supplier names |
| row | Sample offer | Penawaran sampel | rfxa.pricing.sampleOffer | N | n/a | n/a | N |  | Keep | Yes/no |
| row | Timeline | Jadwal | rfxa.pricing.timeline | N | n/a | n/a | N |  | Keep |  |
| row | Prices valid until | Harga berlaku sampai | rfxa.pricing.validUntil | N | n/a | n/a | N |  | Keep | Date |

## Page: /buyer/rfp/:rfpId — Award records — `pages-v2/rfx/AwardRecords.jsx` (RfpAwardLinesTable)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Option | Pilihan | rfxa.pricing.col.option | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | rfx.award.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Share | Porsi | rfx.award.col.share | Y | "Awarded: option, share, quantity point" RFXI:295 | N | LTP share (supplier's split of a material's LTP), DRC DRC-D21/DRC-B25 |  | Keep | Clash per BR-02; tooltip should say "Not LTP share" |
| column | Quantity | Jumlah | rfx.award.col.qty | N | n/a | n/a | N |  | Keep |  |
| column | Quantity point | Titik kuantitas | rfx.rfpAward.col.point | Y | "quantity points" RFXI:64, RFXI:287 | N | N |  | Keep |  |

## Page: /buyer/rfp/:rfpId — Award panel bids — `pages-v2/rfx/AwardPanel/components/ItemBidTable.jsx` (header text from RfpAwardPanel)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rfx.award.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Firm unit price at {{qty}} | Harga satuan pasti pada {{qty}} | rfx.rfpAward.priceAt | Y | "firm prices … read 'Firm' with their validity" DG:216 (RFX-D6) | N | Firm (supplier commitment state "Firm + Trade-off"), CAP:77 |  | Keep | Header also carries the Firm pill (rfxa.firm) |
| column | Firm (pill in price header) | Pasti | rfxa.firm | Y | "read 'Firm'" DG:212, DG:216 | N | Firm (capacity commitment state), CAP:77 |  | Keep |  |
| column | Share | Porsi | rfx.award.col.share | Y | "share" RFXI:295 | N | LTP share, DRC DRC-D21 |  | Keep | Swaps place with Quantity by basis |
| column | Quantity | Kuantitas | rfqCompare.award.qty | N | n/a | n/a | N |  | Keep | ID differs from rfx.award.col.qty "Jumlah" for the same column |

## Page: /buyer/rfq — RFQ board — `pages-v2/BuyerSourcing/components/RfqBoardTable.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | RFQ # | No. RFQ | sourcing.table.col.rfq | N | n/a | n/a | N |  | Keep |  |
| column | Category | Kategori | sourcing.table.col.category | N | n/a | n/a | N |  | Keep |  |
| column | Responses | Respons | sourcing.table.col.responses | N | n/a | n/a | N |  | Keep | "responded / invited" |
| column | Qty | Jml | sourcing.table.col.qty | N | n/a | n/a | N |  | Keep |  |
| column | Est. Value | Nilai Est. | sourcing.table.col.estValue | Y | none found | n/a | N |  | Ask Levi | No source defines it; cell shows the buyer's stated budget |
| column | Response deadline | Tenggat respons | sourcing.table.col.responseDeadline | N | n/a | n/a | N |  | Keep | ID differs from rfx.deadline "Batas waktu jawaban" |
| column | Status | Status | sourcing.table.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Next | Berikutnya | sourcing.table.col.next | N | n/a | n/a | N |  | Keep | Next step |
| column | Actions | Tindakan | sourcing.table.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/rfq — KPI cards — `pages-v2/BuyerSourcing/components/SourcingKpis.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Active RFQs | RFQ Aktif | sourcing.kpi.active.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Awaiting Response | Menunggu Respons | sourcing.kpi.awaiting.eyebrow | Y | none found | n/a | "awaiting response" = PO state, SHR:776 (REQ-E07) |  | Keep | Clash per BR-02; tooltip should say "Not the PO state" |
| kpi | Ready to Award | Siap Dimenangkan | sourcing.kpi.ready.eyebrow | Y | "RFQ ready to award" BACKLOG.md:207 (BL-217, RFX-D23) | N | N |  | Keep |  |
| kpi | Awarded (Quarter) | Dimenangkan (Kuartal) | sourcing.kpi.awarded.eyebrow | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/rfq — Awards history — `pages-v2/BuyerSourcing/components/AwardsHistory.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | RFQ # | No. RFQ | sourcing.awards.col.rfq | N | n/a | n/a | N |  | Keep |  |
| column | Title | Judul | sourcing.awards.col.title | N | n/a | n/a | N |  | Keep |  |
| column | Awarded supplier | Pemasok pemenang | sourcing.awards.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Award date | Tanggal pemenangan | sourcing.awards.col.date | N | n/a | n/a | N |  | Ask Levi | Cell shows the award deadline, not the award date |
| column | Award value | Nilai pemenangan | sourcing.awards.col.value | Y | none found | n/a | N |  | Ask Levi | Cell shows the RFQ estimated value, not the awarded amount |
| column | Actions | Tindakan | sourcing.awards.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/rfq — RFQ wizard, suppliers step — `pages-v2/BuyerSourcing/components/WizardSuppliersStep.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | sourcing.wizard.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Purchasing group | Grup pembelian | rfx.invite.col.group | N | n/a | n/a | N |  | Keep |  |
| column | Country | Negara | sourcing.wizard.col.country | N | n/a | n/a | N |  | Keep |  |
| column | Certificates | Sertifikat | supFilter.col.certificates | Y | "certificate validity" SHR:356 | Y | N |  | Ask Levi | Same question as RFI/RFP invitee step |
| column | Band | Kelompok | supFilter.col.band | Y | "performance band" SHR:356 | Y | N |  | Change [Proposed] |  |
| column | OTIF | OTIF | sourcing.wizard.col.otif | Y | "OTIF (On-Time In-Full)" KMN:91 | N | N | On-Time In-Full (KMN:91) | Keep |  |

## Page: /buyer/rfq/:rfqId — Quote comparison — `pages-v2/BuyerSourcingEvent/components/ComparisonTable.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Criterion | Kriteria | rfx.cmp.col.criterion | N | n/a | n/a | N |  | Keep | Other columns are supplier names |
| row | Unit price | Harga satuan | rfx.cmp.row.unitPrice | Y | "unit price" SHR:667 (REQ-E03-05 BR-01) | N | N |  | Keep |  |
| row | Cost per piece at {{qty}} | Biaya per buah pada {{qty}} | rfqCompare.cmp.unitAtBreak | Y | none found | n/a | N |  | Keep | Replaces Unit price on a tiered RFQ; total at break ÷ pieces |
| row | vs Should-Cost | vs Should-Cost | sourcing.cmp.row.spread | Y | "Should-cost model: Parked, hidden from the menu" BUILD-GAP.md:387 | n/a | N |  | Ask Levi | Should-cost is parked; row still shows |
| row | Total price | Total harga | rfx.cmp.row.totalPrice | Y | "total price" SHR:667 | N | N |  | Keep |  |
| row | Total cost at {{qty}} | Total biaya pada {{qty}} | rfqCompare.cmp.eventTotal | Y | none found | n/a | N |  | Keep | Replaces Total price on a tiered RFQ |
| row | Lead time | Waktu tunggu | rfx.cmp.row.leadTime | Y | "lead time" SHR:667 | N | N |  | Keep |  |
| row | Minimum order quantity | Jumlah pesanan minimum | rfx.cmp.row.moq | Y | "MOQ" SHR:667, SHR:480 | Y | N |  | Change [Proposed] | Source writes MOQ; tiered table already shows "MOQ" |
| row | Payment terms | Termin pembayaran | rfx.cmp.row.payment | Y | "payment terms" SHR:667 | N | N |  | Keep |  |
| row | Price score | Nilai harga | rfx.cmp.row.priceScore | Y | "Price score = lowest price ÷ this price × 100" SHR:160 (CR-15) | N | N |  | Keep |  |
| row | Lead-time score | Nilai waktu tunggu | rfx.cmp.row.leadTimeScore | Y | "Lead-time score = max(0, 100 − 2 × lead-time days)" SHR:160 | N | N |  | Keep |  |
| row | Compliance gate | Gerbang kepatuhan | rfx.cmp.row.gate | Y | "Compliance gate" SHR:168 (CR-23) | N | N |  | Keep |  |
| row | Reliability score | Nilai keandalan | rfx.cmp.row.reliabilityScore | Y | "Reliability score = the supplier's OTIF … 'No history' scores 50" SHR:160 | N | N |  | Keep |  |
| row | Weighted score | Nilai berbobot | rfx.cmp.row.weighted | Y | "Weighted score = price 40% + lead time 20% + reliability 40%" SHR:160 | N | N |  | Keep |  |
| row | Documents | Dokumen | rfxFiles.docs.row | Y | "Documents from suppliers" RFXI:183 | N | N |  | Keep |  |
| row | Result | Hasil | sourcing.cmp.row.result | N | n/a | n/a | N |  | Keep | Awarded / Rejected |
| row | Status | Status | sourcing.cmp.row.status | N | n/a | n/a | N |  | Keep | Shown instead of Result before award |

## Page: /buyer/rfq/:rfqId — Items — `pages-v2/BuyerSourcingEvent/components/EventItemsSection.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Item | Item | rfx.event.col.item | N | n/a | n/a | N |  | Keep |  |
| column | Quantity | Jumlah | rfx.event.col.qty | N | n/a | n/a | N |  | Keep |  |
| column | Specification | Spesifikasi | rfx.event.col.spec | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/rfq/:rfqId — Negotiation rounds — `pages-v2/BuyerSourcingEvent/components/NegotiationSection.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Round | Putaran | rfx.cmp.roundColumn | N | n/a | n/a | N |  | Keep |  |
| column | Round deadline | Batas waktu putaran | rfx.neg.deadline | N | n/a | n/a | N |  | Keep |  |
| column | Invite these suppliers | Undang pemasok berikut | rfx.neg.shortlist | N | n/a | n/a | N |  | Keep | Column lists the shortlist |
| column | Message to the suppliers | Pesan untuk pemasok | rfx.neg.message | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/rfq/:rfqId — Quote versions — `pages-v2/BuyerSourcingEvent/components/QuoteVersionsSection.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rfx.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Round | Putaran | rfx.cmp.roundColumn | N | n/a | n/a | N |  | Keep |  |
| column | Unit price | Harga satuan | rfx.cmp.row.unitPrice | Y | "unit price" SHR:667 | N | N |  | Keep |  |
| column | Lead time | Waktu tunggu | rfx.cmp.row.leadTime | Y | "lead time" SHR:667 | N | N |  | Keep |  |
| column | Submitted on | Dikirim pada | rfx.cmp.submittedOn | N | n/a | n/a | N |  | Keep | Date |

## Page: /buyer/rfq/:rfqId — Response window — `pages-v2/BuyerSourcingEvent/components/ResponseWindowSection.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rfx.invite.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | On time in full | Tepat waktu dan lengkap | rfx.invite.col.otif | Y | "OTIF (On-Time In-Full)" KMN:91 | Y | N | OTIF (KMN:91) | Change [Proposed] |  |
| column | Your deadline | Batas waktu Anda | rfx.deadline.own | N | n/a | n/a | N |  | Change [Proposed] | Buyer view; "Your" is wrong |
| column | For the selected suppliers | Untuk pemasok yang dipilih | rfx.rfi.extendSelected | N | n/a | n/a | N |  | Keep | Selection-checkbox column |

## Page: /buyer/rfq/:rfqId — Tiered RFQ comparison — `pages-v2/rfx/TieredRfq.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier (documents table) | Pemasok | rfqCompare.cmp.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Documents (documents table) | Dokumen | rfxFiles.docs.row | Y | "Documents from suppliers" RFXI:183 | N | N |  | Keep |  |
| column | Supplier (item comparison) | Pemasok | rfqCompare.cmp.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | {{qty}} {{basis}} (one per break) | {{qty}} {{basis}} | rfqCompare.cmp.breakOption | Y | "a unit price at each of the 6 breaks" SHR:480; "firm prices by quantity break" SHR:188 | N | N |  | Keep | Basis = "total" / "per variant" (rfqAuthoring.basis.*) |
| column | One-time costs | Biaya satu kali | rfqCompare.cmp.col.oneTime | Y | "one-time costs to be quoted: mold, die-cut plate…" SHR:494 | N | N |  | Keep |  |
| column | Lead time | Waktu tunggu | rfqCompare.cmp.col.leadTime | Y | "lead time" SHR:480 | N | N |  | Keep |  |
| column | MOQ | MOQ | rfqCompare.cmp.col.moq | Y | "MOQ" SHR:480 | N | N |  | Keep |  |
| column | Total at {{qty}} | Total pada {{qty}} | rfqCompare.cmp.col.totalAtBreak | Y | none found | n/a | N |  | Keep | Total cost at the evaluation break |
| column | Score | Skor | rfqCompare.cmp.col.score | Y | "CR-15 score over suppliers that pass CR-23" RFXI:56 | Y | N |  | Change [Proposed] | Same figure is "Weighted score" in the legacy table (SHR:160) |
| column | Supplier (alternatives) | Pemasok | rfqCompare.cmp.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | {{qty}} {{basis}} (alternatives, one per break) | {{qty}} {{basis}} | rfqCompare.cmp.breakOption | Y | "breaks" SHR:480 | N | N |  | Keep |  |

## Page: /buyer/rfq/:rfqId — Award records — `pages-v2/rfx/AwardRecords.jsx` (AwardLinesTable)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Item | Item | rfqCompare.award.col.item | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | rfx.award.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Share | Porsi | rfx.award.col.share | Y | "split award by percentage per item" RFXI:29 (NR-3) | N | LTP share, DRC DRC-D21/DRC-B25 |  | Keep | Clash per BR-02 |
| column | Quantity | Jumlah | rfx.award.col.qty | N | n/a | n/a | N |  | Keep |  |
| column | Break | Jenjang | rfqCompare.award.col.break | Y | "quantity break" SHR:188 | N | N |  | Keep |  |

## Page: /buyer/rfq/:rfqId — Award panel bids — `pages-v2/rfx/AwardPanel/components/ItemBidTable.jsx` (header text from AwardPanel)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | rfx.award.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Total at {{qty}} / Unit price | Total pada {{qty}} / Harga satuan | rfqCompare.cmp.col.totalAtBreak / rfx.cmp.row.unitPrice | Y | "unit price" SHR:667 | N | N |  | Keep | Tiered RFQ shows Total at break; legacy shows Unit price |
| column | Firm (pill in price header) | Pasti | rfxa.firm | Y | "firm prices by quantity break go in the RFQ and read 'Firm'" DG:212 | N | Firm (capacity commitment state), CAP:77 |  | Keep |  |
| column | Share | Porsi | rfx.award.col.share | Y | "split award by percentage" RFXI:29 | N | LTP share, DRC DRC-D21 |  | Keep |  |
| column | Quantity | Kuantitas | rfqCompare.award.qty | N | n/a | n/a | N |  | Keep | ID "Kuantitas" vs "Jumlah" elsewhere |

## Page: /supplier/rfq — KPI cards — `pages-v2/SupplierRFQs/components/RfqKpiRow.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Open Events | Acara Terbuka | rfqs.kpi.open.eyebrow | Y | none found | n/a | N |  | Keep | ID "Acara" reads as a social event; copy check, not a rename |
| kpi | Quotes Submitted | Penawaran Dikirim | rfqs.kpi.submitted.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Awaiting Award | Menunggu Pemenangan | rfqs.kpi.award.eyebrow | Y | none found | n/a | N |  | Keep |  |

## Page: /supplier/rfq — Awards & history tab — `pages-v2/SupplierRFQs/components/AwardsTab.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | RFQ # | No. RFQ | rfqs.awards.col.rfq | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | rfqs.awards.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Result | Hasil | rfqs.awards.col.result | N | n/a | n/a | N |  | Keep |  |
| column | Award date | Tanggal pemenangan | rfqs.awards.col.awardDate | N | n/a | n/a | N |  | Keep |  |
| column | Your awarded value | Nilai yang Anda menangkan | rfqs.awards.col.awardedValue | N | n/a | n/a | N |  | Keep | Amount |
| column | PO issued | PO diterbitkan | rfqs.awards.col.poIssued | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/rfp — Terms response — `pages-v2/SupplierRfp/components/RfpTermsTable.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Term | Syarat | rfx.rfp.col.term | N | n/a | n/a | N |  | Keep |  |
| column | PTI asks for | Yang diminta PTI | rfx.rfp.col.requested | Y | "PTI's requested value" SHR:621 | Y | N |  | Change [Proposed] |  |
| column | Proposed | Yang diusulkan | rfx.rfp.col.proposed | Y | "the supplier's proposed value" SHR:621 | N | N |  | Keep |  |
| column | Comply | Sesuai | rfx.stance.comply | Y | "Comply or Deviate" SHR:621, SHR:566 | Y | N |  | Change [Proposed] | Header reuses the "Comply" choice key; buyer side reads "Comply or deviate" / "Patuh atau menyimpang" |
| column | Comment | Keterangan | rfx.rfp.comment | N | n/a | n/a | N |  | Keep | ID differs from buyer "Komentar" |

## Page: /supplier/rfp — Firm-offer price grid — `pages-v2/rfx/SupplierFirmOffers.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Options | Opsi | rfx.firm.options | N | n/a | n/a | N |  | Keep | ID "Opsi" vs "Pilihan" for Option elsewhere |
| column | Firm (pill on each quantity-point header) | Pasti | rfxa.firm | Y | "firm-offer round … read 'Firm' with their validity" DG:216 (RFX-D6) | N | Firm (capacity commitment state), CAP:77 |  | Keep | Header number is the quantity point (data) |

## Page: /buyer/admin/sourcing-types — Sourcing types — `pages-v2/admin/AdminSourcingTypes.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Category or purchasing group | Kategori atau purchasing group | adminSourcing.col.key | N | n/a | n/a | N |  | Keep | ID keeps "purchasing group"; elsewhere "Grup pembelian" |
| column | Sourcing type | Jenis sourcing | adminSourcing.col.type | Y | "maps each sourcing category and purchasing group to Direct or Indirect" SHR:212 (CE-12f) | N | N |  | Keep |  |
| column | Last change | Perubahan terakhir | adminSourcing.col.lastChange | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/contracts/:id (Delivery Agreements tab) — Agreement card KPIs — `components/delivery/AgreementDrawdown.jsx` (also on /supplier/delivery-agreements)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Agreed | Disepakati | delivery.kpi.agreed | Y | none found | n/a | N |  | Keep |  |
| kpi | Released | Dirilis | delivery.kpi.released | Y | none found (SUPPLIER-HUB-REQUIREMENTS.md:2072 "scheduling agreement releases", no label word) | n/a | N |  | Keep |  |
| kpi | Delivered | Terkirim | delivery.kpi.delivered | Y | none found | n/a | N |  | Keep |  |
| kpi | Remaining | Sisa | delivery.kpi.remaining | Y | none found (CR-04 "Remaining quantity", SUPPLIER-HUB-REQUIREMENTS.md:149, is the umbrella PO's) | n/a | ID "Sisa" on a DA card reads as "sisa DA" = carry-over (TL-D8), Material Planning team / Demand anticipation (DA) grid |  | Ask Levi | ID "Sisa" on a Delivery Agreement card can read as team "sisa DA" (carry-over). |
| column | Action | Aksi | delivery.action.col | N | n/a | n/a | N |  | Keep | Passed to ReleaseCalendar as actionsHeader |

## Page: /buyer/delivery-agreements — Release calendar — `components/delivery/ReleaseCalendar.jsx` (also on /buyer/contracts/:id and /supplier/delivery-agreements via AgreementDrawdown)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | # | # | delivery.calendar.seq | N | n/a | n/a | N |  | Keep |  |
| column | Release date | Tanggal rilis | delivery.calendar.date | N | n/a | n/a | N |  | Keep |  |
| column | Planned | Direncanakan | delivery.calendar.planned | Y | none found | n/a | N |  | Keep | Planned release quantity |
| column | State | Status | delivery.calendar.state | N | n/a | n/a | N |  | Keep |  |
| column | Fulfillment | Pemenuhan | delivery.calendar.fulfillment | Y | none found | n/a | N |  | Keep | On-time vs late against ETA (footnote) |
| column | Drawn down | Ditarik | delivery.calendar.drawdownCol | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/delivery-agreements — Delivery overview roll-up — `pages-v2/BuyerDeliveryAgreements.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | delivery.rollup.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Contract | Kontrak | delivery.rollup.col.contract | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | delivery.rollup.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Released | Dirilis | delivery.rollup.col.released | Y | none found | n/a | N |  | Keep |  |
| column | Next due | Jatuh tempo | delivery.rollup.col.nextDue | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | delivery.rollup.col.status | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/compliance — KPIs — `pages-v2/BuyerCompliance/components/ComplianceKpis.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Expired | Kedaluwarsa | compliance.kpi.expired.eyebrow | Y | "Expired" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:86) | N | N |  | Keep |  |
| kpi | Expiring ≤90d | Akan Kedaluwarsa ≤90 hari | compliance.kpi.expiring.eyebrow | Y | "the 90 days belong to the certificate registry" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:598) | N | N |  | Keep |  |
| kpi | Missing | Hilang | compliance.kpi.missing.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Under Review | Sedang Ditinjau | compliance.kpi.underReview.eyebrow | Y | "Under Review" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:86) | N | N |  | Keep |  |
| kpi | Valid | Berlaku | compliance.kpi.valid.eyebrow | Y | "Valid" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:86) | N | N |  | Keep |  |

## Page: /buyer/compliance — Certificate registry — `pages-v2/BuyerCompliance/components/ComplianceRegistryTable.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | compliance.table.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Certificate | Sertifikat | compliance.table.certificate | N | n/a | n/a | N |  | Keep |  |
| column | Category | Kategori | compliance.table.category | N | n/a | n/a | N |  | Keep |  |
| column | Issued by | Diterbitkan oleh | compliance.table.issuedBy | N | n/a | n/a | N |  | Keep |  |
| column | Expiry | Kedaluwarsa | compliance.table.expiry | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | compliance.table.status | N | n/a | n/a | N |  | Keep |  |
| column | In SAP | Di SAP | compliance.table.sapSync | Y | none found | n/a | N |  | Keep |  |
| column | Action required | Tindakan diperlukan | compliance.table.actionRequired | Y | none found | n/a | N |  | Keep |  |
| column | Remind | Ingatkan | compliance.table.remind | N | n/a | n/a | N |  | Keep | Button column |

## Page: /buyer/contracts — KPIs — `pages-v2/BuyerContracts/components/ContractsKpis.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Active Contracts | Kontrak Aktif | contracts.kpi.active.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Expiring Soon | Segera Kedaluwarsa | contracts.kpi.expiring.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Overdue Obligations | Kewajiban Jatuh Tempo | contracts.kpi.overdue.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Total Active Value | Total Nilai Aktif | contracts.kpi.value.eyebrow | Y | none found | n/a | N |  | Keep |  |

## Page: /buyer/contracts — Contracts list — `pages-v2/BuyerContracts/components/ContractsTable.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Contract # | No. Kontrak | contracts.table.col.number | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | contracts.table.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Type | Jenis | contracts.table.col.type | N | n/a | n/a | N |  | Keep |  |
| column | Period | Periode | contracts.table.col.period | N | n/a | n/a | N |  | Keep |  |
| column | Expiry | Kedaluwarsa | contracts.table.col.expiry | N | n/a | n/a | N |  | Keep |  |
| column | Value | Nilai | contracts.table.col.value | N | n/a | n/a | N |  | Keep | Record amount, not a computed measure |
| column | Performance | Kinerja | contracts.table.col.performance | Y | none found | n/a | N |  | Keep |  |
| column | Status | Status | contracts.table.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Actions | Tindakan | contracts.table.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/contracts — New contract wizard, selected obligations — `pages-v2/BuyerContracts/components/WizardObligationsStep.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Title | Judul | contracts.wizard.obl.col.title | N | n/a | n/a | N |  | Keep |  |
| column | Owner | Pemilik | contracts.wizard.obl.col.owner | N | n/a | n/a | N |  | Keep | Cells are form selects |
| column | Due date | Tanggal tenggat | contracts.wizard.obl.col.dueDate | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/contracts/:id (Overview tab) — Obligations — `pages-v2/contracts/contractView.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Title | Judul | contracts.panel.obl.col.title | N | n/a | n/a | N |  | Keep |  |
| column | Owner | Pemilik | contracts.panel.obl.col.owner | N | n/a | n/a | N |  | Keep |  |
| column | Due | Tenggat | contracts.panel.obl.col.due | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | contracts.panel.obl.col.status | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/stabilise?tab=versions — Published versions — `pages-v2/BuyerForecasts.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Version | Versi | fc.pti.versions.col.version | N | n/a | n/a | N |  | Keep |  |
| column | Published | Diterbitkan | fc.pti.versions.col.published | N | n/a | n/a | N |  | Keep | Date-time |
| column | Type | Jenis | fc.pti.versions.col.kind | N | n/a | n/a | N |  | Keep | Scheduled / emergency / moved |
| column | Suppliers | Pemasok | fc.pti.versions.col.suppliers | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/supplier-access — Supplier access — `pages-v2/BuyerSupplierAccess.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | inv.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Access to PTI stock | Akses ke stok PTI | inv.access.col.access | Y | "Supplier access to PTI stock" (SUPPLIER-HUB-REQUIREMENTS.md:1292, REQ-E08-03) | N | N |  | Keep |  |
| column | Materials supplied | Material yang dipasok | inv.access.col.materials | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | inv.access.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/supplier-access — Access log — `pages-v2/BuyerSupplierAccess.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | When | Waktu | inv.access.log.when | N | n/a | n/a | N |  | Keep |  |
| column | Supplier | Pemasok | inv.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Change | Perubahan | inv.access.log.what | N | n/a | n/a | N |  | Keep |  |
| column | Materials | Material | inv.access.log.materials | N | n/a | n/a | N |  | Keep |  |
| column | By | Oleh | inv.access.log.by | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/suppliers/:id — KPIs — `pages-v2/BuyerSupplierProfile.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | OTIF | OTIF | buyerSupplierProfile.kpi.otif.eyebrow | Y | "OTIF, On-Time In-Full" (SUPPLIER-HUB-REQUIREMENTS.md:118, §3.3) | N | N |  | Keep |  |
| kpi | Lead Time Adherence | Kepatuhan Waktu Tunggu | buyerSupplierProfile.kpi.leadTime.eyebrow | Y | none found | n/a | N |  | Keep | ID translates "lead time"; see Ask Levi |
| kpi | Invoice Accuracy | Akurasi Faktur | buyerSupplierProfile.kpi.invoiceAccuracy.eyebrow | Y | none found | n/a | N |  | Keep |  |
| kpi | Scorecard Grade | Grade Kartu Skor | buyerSupplierProfile.kpi.scorecard.eyebrow | Y | "grades A ≥ 90, B ≥ 80, C ≥ 70, D" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:88) | N | N |  | Keep |  |

## Page: /buyer/suppliers/:id — Compliance tab — `pages-v2/BuyerSupplierProfile.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Document | Dokumen | buyerSupplierProfile.compliance.col.document | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | buyerSupplierProfile.compliance.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Uploaded | Diunggah | buyerSupplierProfile.compliance.col.uploaded | N | n/a | n/a | N |  | Keep |  |
| column | Expires | Kedaluwarsa | buyerSupplierProfile.compliance.col.expires | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/suppliers/:id — Catalog tab — `pages-v2/BuyerSupplierProfile.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material | Material | buyerSupplierProfile.catalog.col.material | N | n/a | n/a | N |  | Keep |  |
| column | SAP Code | Kode SAP | buyerSupplierProfile.catalog.col.sapCode | N | n/a | n/a | N |  | Keep |  |
| column | MOQ | MOQ | buyerSupplierProfile.catalog.col.moq | Y | "MOQ" (osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md:125) | N | N |  | Keep |  |
| column | Lead time | Waktu tunggu | buyerSupplierProfile.catalog.col.leadTime | Y | "lead time" (osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md:27, A3) | N | N |  | Ask Levi | Team writes "lead time" in English in ID text; ID translates it. |
| column | Unit price | Harga satuan | buyerSupplierProfile.catalog.col.unitPrice | N | n/a | n/a | N |  | Keep | Record amount |
| column | Capacity | Kapasitas | buyerSupplierProfile.catalog.col.capacity | Y | "capacity is compared with LTP" (osip/DRC-PROPOSAL-2026-10-19.md:41) | N | N |  | Keep |  |

## Page: /buyer/suppliers/:id — Performance tab — `pages-v2/BuyerSupplierProfile.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | PO # | PO # | buyerSupplierProfile.performance.col.po | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | buyerSupplierProfile.performance.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Qty | Kuantitas | buyerSupplierProfile.performance.col.qty | N | n/a | n/a | N |  | Keep | Record quantity |
| column | Value | Nilai | buyerSupplierProfile.performance.col.value | N | n/a | n/a | N |  | Keep | Record amount |
| column | Ordered | Dipesan | buyerSupplierProfile.performance.col.ordered | N | n/a | n/a | N |  | Keep | Date |
| column | Delivery | Pengiriman | buyerSupplierProfile.performance.col.delivery | N | n/a | n/a | N |  | Keep | Date |
| column | OTIF | OTIF | buyerSupplierProfile.performance.col.otif | Y | "OTIF, On-Time In-Full" (SUPPLIER-HUB-REQUIREMENTS.md:118) | N | N |  | Keep |  |
| column | Status | Status | buyerSupplierProfile.performance.col.status | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/suppliers/:id — Message log tab — `pages-v2/BuyerSupplierProfile.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Timestamp | Stempel waktu | buyerSupplierProfile.msglog.col.timestamp | N | n/a | n/a | N |  | Keep |  |
| column | Direction | Arah | buyerSupplierProfile.msglog.col.direction | N | n/a | n/a | N |  | Keep |  |
| column | Channel | Kanal | buyerSupplierProfile.msglog.col.channel | N | n/a | n/a | N |  | Keep |  |
| column | Type | Jenis | buyerSupplierProfile.msglog.col.type | N | n/a | n/a | N |  | Keep |  |
| column | Preview | Pratinjau | buyerSupplierProfile.msglog.col.preview | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | buyerSupplierProfile.msglog.col.status | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/suppliers/:id — Qualification history (buyer only) — `pages-v2/qualification/QualificationPanel.jsx` (panel also on /supplier/documents, history table buyer-only)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Date | Tanggal | qualification.history.col.at | N | n/a | n/a | N |  | Keep |  |
| column | Change | Perubahan | qualification.history.col.change | N | n/a | n/a | N |  | Keep |  |
| column | Cause | Penyebab | qualification.history.col.cause | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/suppliers — Suppliers list — `pages-v2/BuyerSuppliers.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | buyerSuppliers.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Country | Negara | buyerSuppliers.col.country | N | n/a | n/a | N |  | Keep |  |
| column | Tier | Tingkat | buyerSuppliers.col.tier | Y | none found | n/a | service tier (95%/85% service level per material), forecast engine (DECISION-GUIDE.md ENG-D14) |  | Ask Levi | Values are WhatsApp/Web/API connectivity; "tier" also names ENG-D14 service tiers. |
| column | Category | Kategori | buyerSuppliers.col.category | N | n/a | n/a | N |  | Keep |  |
| column | Compliance | Kepatuhan | buyerSuppliers.col.compliance | Y | "Compliance gate" (SUPPLIER-HUB-REQUIREMENTS.md:168, CR-23) | N | N |  | Keep |  |
| column | OTIF | OTIF | buyerSuppliers.col.otif | Y | "OTIF, On-Time In-Full" (SUPPLIER-HUB-REQUIREMENTS.md:118) | N | N |  | Keep |  |
| column | Band | Kelompok | supFilter.col.band | Y | "performance band" (SUPPLIER-HUB-REQUIREMENTS.md:356, REQ-E03-01 BR-05) | Y | Days-of-supply bands (CR-02), Alert thresholds page / inventory alerts |  | Change [Proposed] | Source says "performance band"; ID "Kelompok" also = material group. |
| column | Status | Status | buyerSuppliers.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Actions | Tindakan | buyerSuppliers.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/fs-reconcile — Feedstock reconcile — `pages-v2/FixedStockReconcile.jsx` (also /supplier/fs-reconcile, without the Supplier column)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | fsr.col.supplier | N | n/a | n/a | N |  | Keep | PTI view only |
| column | Material | Material | fsr.col.material | N | n/a | n/a | N |  | Keep |  |
| column | PO ordered | Dipesan di PO | fsr.col.poOrdered | Y | "PO ordered" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:178, DRC-15a BR-01) | N | N |  | Keep |  |
| column | Called off | Di-call-off | fsr.col.calledOff | Y | "Called off" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:338, DRC-B13) | N | N |  | Keep |  |
| column | ASN requested | Diminta di ASN | fsr.col.asnRequested | Y | "ASN requested" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:338, DRC-B13) | N | N |  | Keep |  |
| column | Not yet called off | Belum di-call-off | fsr.col.notYetCalledOff | Y | "not yet called off" (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md:337, DRC-B12) | N | N |  | Keep |  |
| column | Called off, not yet shipped | Di-call-off, belum dikirim | fsr.col.notYetShipped | Y | none found (DRC-15a BR-01 names only "the remainder") | n/a | N |  | Ask Levi | No source names this figure; add to the team question list, like TL-D9? |
| column | Max stock | Stok maksimum | fsr.col.maxStock | Y | "Max Stock Supplier" (osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md:194, :222) | Y | Max Stock PTI (ROP + cycle stock), team sheet Guidance (osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md:126) / Max on ROP pages (DRC-10) |  | Change [Proposed] | Proposed "Max Stock Supplier" per BR-01/BR-02; ID translates team term, see Ask Levi. |

## Page: /buyer/process-flows — Transitions — `pages-v2/ProcessFlows.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Transition | Transisi | processFlows.col.transition | N | n/a | n/a | N |  | Keep |  |
| column | From → To | Dari → Ke | processFlows.col.edge | N | n/a | n/a | N |  | Keep |  |
| column | Step | Langkah | processFlows.col.step | N | n/a | n/a | N |  | Keep |  |
| column | Required role | Peran wajib | processFlows.col.role | Y | none found | n/a | N |  | Keep |  |
| column | Fields & hooks | Bidang & kait | processFlows.col.contract | N | n/a | n/a | N |  | Keep |  |
| column | Boundary & links | Batas & tautan | processFlows.col.links | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/roles — Roles catalogue — `pages-v2/RolesCatalogue.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Role code | Kode peran | roles.page.col.code | N | n/a | n/a | N |  | Keep |  |
| column | Display name | Nama tampilan | roles.page.col.name | N | n/a | n/a | N |  | Keep |  |
| column | Description | Deskripsi | roles.page.col.description | N | n/a | n/a | N |  | Keep |  |
| column | Kind | Jenis | roles.page.col.kind | N | n/a | n/a | N |  | Keep |  |
| column | Reach | Jangkauan | roles.page.col.scope | Y | none found | n/a | N |  | Keep |  |
| column | Actions | Tindakan | roles.page.col.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /supplier/documents — KPIs — `pages-v2/SupplierDocuments/components/DocumentKpis.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| kpi | Total Documents | Total Dokumen | supplierDocuments.kpi.total.eyebrow | N | n/a | n/a | N |  | Keep | Plain count |
| kpi | Valid | Berlaku | supplierDocuments.kpi.valid.eyebrow | Y | "Valid" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:86) | N | N |  | Keep |  |
| kpi | Expiring ≤180d | Akan Kedaluwarsa ≤180h | supplierDocuments.kpi.expiring.eyebrow | Y | "expiring window (180 days, the supplier-document window)" (SUPPLIER-HUB-REQUIREMENTS.md:209) | N | N |  | Keep | Same word as compliance KPI with a 90-day window |
| kpi | Expired | Kedaluwarsa | supplierDocuments.kpi.expired.eyebrow | Y | "Expired" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:86) | N | N |  | Keep |  |
| kpi | Needs Action | Perlu Tindakan | supplierDocuments.kpi.needsAction.eyebrow | Y | none found | n/a | N |  | Keep |  |

## Page: /supplier/documents — Documents — `pages-v2/SupplierDocuments/components/DocumentTable.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Document | Dokumen | supplierDocuments.table.document | N | n/a | n/a | N |  | Keep |  |
| column | Category | Kategori | supplierDocuments.table.category | N | n/a | n/a | N |  | Keep |  |
| column | Issued by | Diterbitkan oleh | supplierDocuments.table.issuedBy | N | n/a | n/a | N |  | Keep |  |
| column | Issued | Diterbitkan | supplierDocuments.table.issued | N | n/a | n/a | N |  | Keep |  |
| column | Expiry | Kedaluwarsa | supplierDocuments.table.expiry | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | supplierDocuments.table.status | N | n/a | n/a | N |  | Keep |  |
| column | Ver. | Ver. | supplierDocuments.table.version | N | n/a | n/a | N |  | Keep |  |
| column | Actions | Tindakan | supplierDocuments.table.actions | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/mrp-controllers — MRP controllers — `pages-v2/admin/AdminMrpControllers.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Code | Kode | mrpc.col.code | N | n/a | n/a | N |  | Keep |  |
| column | Name | Nama | mrpc.col.name | N | n/a | n/a | N |  | Keep |  |
| column | Hub users | Pengguna hub | mrpc.col.users | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | mrpc.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/mrp-controllers — Mapping history — `pages-v2/admin/AdminMrpControllers.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Code | Kode | mrpc.col.code | N | n/a | n/a | N |  | Keep |  |
| column | Mapping | Pemetaan | mrpc.history.col.change | N | n/a | n/a | N |  | Keep |  |
| column | By | Oleh | mrpc.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | When | Kapan | mrpc.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/planning-groups — Planning groups — `pages-v2/admin/AdminPlanningGroups.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Planning group | Grup perencanaan | adminPg.col.group | N | n/a | n/a | N |  | Keep |  |
| column | SAP material group | Grup material SAP | adminPg.col.sapGroup | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | adminPg.col.state | N | n/a | n/a | N |  | Keep |  |
| column | Materials | Material | adminPg.col.materials | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | adminPg.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/planning-groups — Change history — `pages-v2/admin/AdminPlanningGroups.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Change | Perubahan | adminPg.history.col.change | N | n/a | n/a | N |  | Keep |  |
| column | By | Oleh | adminPg.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | When | Waktu | adminPg.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/qualification — Rule history — `pages-v2/admin/AdminQualification.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Level | Level | adminQual.history.col.level | Y | "qualification level: Registered, Approved or Preferred" (SUPPLIER-HUB-REQUIREMENTS.md:207, CE-12a) | N | N |  | Keep |  |
| column | Documents required | Dokumen yang diwajibkan | adminQual.history.col.documents | Y | "picks the required document types" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:609) | N | N |  | Keep |  |
| column | By | Oleh | adminQual.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | When | Kapan | adminQual.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/reason-codes — Reason codes — `pages-v2/admin/AdminReasonCodes.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Code | Kode | adminRsn.col.code | N | n/a | n/a | N |  | Keep |  |
| column | English label | Label bahasa Inggris | adminRsn.col.labelEn | N | n/a | n/a | N |  | Keep |  |
| column | Indonesian label | Label bahasa Indonesia | adminRsn.col.labelId | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | adminRsn.col.status | N | n/a | n/a | N |  | Keep |  |
| column | Source | Sumber | adminRsn.col.source | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | adminRsn.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/reason-codes — Change history — `pages-v2/admin/AdminReasonCodes.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Code | Kode | adminRsn.history.col.code | N | n/a | n/a | N |  | Keep |  |
| column | Old → new | Lama → baru | adminRsn.history.col.change | N | n/a | n/a | N |  | Keep |  |
| column | By | Oleh | adminRsn.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | Recorded | Dicatat | adminRsn.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/tolerances — Rule values (one table per rule) — `pages-v2/admin/AdminRuleValues/components/RuleGroup.jsx` (also /buyer/admin/alert-thresholds)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Value | Nilai | adminSet.col.value | N | n/a | n/a | N |  | Keep | Rule-name column; row labels are in RuleRow.jsx |
| column | In force | Berlaku | adminSet.col.inForce | Y | none found | n/a | N |  | Keep |  |
| column | Default | Bawaan | adminSet.col.default | Y | none found | n/a | N |  | Keep |  |
| column | Action | Tindakan | adminSet.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/tolerances — Change history — `pages-v2/admin/AdminRuleValues/components/ChangeHistory.jsx` (also /buyer/admin/alert-thresholds)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Value | Nilai | adminSet.history.col.value | N | n/a | n/a | N |  | Keep |  |
| column | Old → new | Lama → baru | adminSet.history.col.change | N | n/a | n/a | N |  | Keep |  |
| column | By | Oleh | adminSet.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | Recorded | Dicatat | adminSet.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/alert-thresholds — Per material group — `pages-v2/admin/AdminRuleValues/components/GroupOverridesPanel.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Material group | Kelompok material | adminSet.groups.col.group | N | n/a | n/a | N |  | Keep |  |
| column | Value | Nilai | adminSet.groups.col.value | N | n/a | n/a | N |  | Keep |  |
| column | Group value | Nilai kelompok | adminSet.groups.col.override | Y | "overridden per material group" (SUPPLIER-HUB-REQUIREMENTS.md:1428, REQ-E08-05 BR-03) | N | N |  | Keep |  |
| column | Global value | Nilai global | adminSet.groups.col.global | Y | "one global set" (SUPPLIER-HUB-REQUIREMENTS.md:1428, REQ-E08-05 BR-03) | N | N |  | Keep |  |
| column | Action | Tindakan | adminSet.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/alert-thresholds — Stale periods — `pages-v2/admin/AdminRuleValues/components/StalePeriodsPanel.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | adminSet.stale.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Material | Material | adminSet.stale.col.material | N | n/a | n/a | N |  | Keep |  |
| column | Stale after | Usang setelah | adminSet.stale.col.period | Y | "stale period" (SUPPLIER-HUB-REQUIREMENTS.md:1428; SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:101) | Y | N |  | Change [Proposed] | Sources say "Stale period"; page section already says "stale periods". |
| column | Set by | Diatur oleh | adminSet.stale.col.source | N | n/a | n/a | N |  | Keep |  |
| column | Last stock update | Pembaruan stok terakhir | adminSet.stale.col.lastUpdate | N | n/a | n/a | N |  | Keep | Date |
| column | Stock figure now | Angka stok sekarang | adminSet.stale.col.now | Y | none found | n/a | N |  | Keep | Current / stale / missing state |
| column | Action | Tindakan | adminSet.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/suppliers — Stock update mode — `pages-v2/admin/AdminSuppliers.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | adminSup.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Stock update mode | Cara pembaruan stok | adminSup.col.mode | Y | "update mode" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:152, MR-1 AC-06) | N | N |  | Keep |  |
| column | Set by | Ditetapkan oleh | adminSup.col.source | N | n/a | n/a | N |  | Keep |  |
| column | Last change | Perubahan terakhir | adminSup.col.lastChange | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | adminSup.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/suppliers — Change history — `pages-v2/admin/AdminSuppliers.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Supplier | Pemasok | adminSup.history.col.supplier | N | n/a | n/a | N |  | Keep |  |
| column | Mode set | Cara yang ditetapkan | adminSup.history.col.mode | Y | "update mode" (SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md:152) | N | N |  | Keep |  |
| column | Reason | Alasan | adminSup.history.col.reason | N | n/a | n/a | N |  | Keep |  |
| column | Changed by | Diubah oleh | adminSup.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | When | Kapan | adminSup.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/3pl-tracking — 3PL list — `pages-v2/admin/AdminThreePls.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | 3PL | 3PL | tpl.col.name | N | n/a | n/a | N |  | Keep |  |
| column | Public tracking address | Alamat pelacakan publik | tpl.col.pattern | N | n/a | n/a | N |  | Keep |  |
| column | On new ASNs | Pada ASN baru | tpl.col.offered | Y | none found (SUPPLIER-HUB-REQUIREMENTS.md:975, REQ-E07-04 BR-05, describes the link, no column word) | n/a | N |  | Keep |  |
| column | Example link | Contoh tautan | tpl.col.try | N | n/a | n/a | N |  | Keep |  |
| column | Change | Ubah | tpl.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/3pl-tracking — Change history — `pages-v2/admin/AdminThreePls.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | 3PL | 3PL | tpl.history.col.threePl | N | n/a | n/a | N |  | Keep |  |
| column | Recorded as | Dicatat sebagai | tpl.history.col.change | N | n/a | n/a | N |  | Keep |  |
| column | By | Oleh | tpl.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | When | Waktu | tpl.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/working-calendar — Days — `pages-v2/admin/AdminWorkingCalendar.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Date | Tanggal | adminCal.col.date | N | n/a | n/a | N |  | Keep |  |
| column | Day | Hari | adminCal.col.day | N | n/a | n/a | N |  | Keep |  |
| column | Status | Status | adminCal.col.status | N | n/a | n/a | N |  | Keep | Working / non-working day |
| column | Set by | Ditetapkan oleh | adminCal.col.source | N | n/a | n/a | N |  | Keep |  |
| column | Reason | Alasan | adminCal.col.reason | N | n/a | n/a | N |  | Keep |  |
| column | Action | Tindakan | adminCal.col.action | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/working-calendar — Rulings history — `pages-v2/admin/AdminWorkingCalendar.jsx`

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| column | Date | Tanggal | adminCal.history.col.date | N | n/a | n/a | N |  | Keep |  |
| column | Ruled | Ditetapkan | adminCal.history.col.ruled | N | n/a | n/a | N |  | Keep |  |
| column | Reason | Alasan | adminCal.history.col.reason | N | n/a | n/a | N |  | Keep |  |
| column | By | Oleh | adminCal.history.col.by | N | n/a | n/a | N |  | Keep |  |
| column | Recorded | Dicatat | adminCal.history.col.at | N | n/a | n/a | N |  | Keep |  |

## Page: /buyer/admin/tolerances — rule-value rows (`pages-v2/admin/AdminRuleValues/components/RuleRow.jsx`)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| row | Over the released quantity, accepted without the planner | Kelebihan dari kuantitas yang dirilis, diterima tanpa perencana | `adminSet.key.callOff.overPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Days early, accepted without the planner | Hari lebih awal, diterima tanpa perencana | `adminSet.key.callOff.earlyAllowanceDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Supplier confirms a released call-off within | Pemasok mengonfirmasi call-off yang dirilis dalam | `adminSet.key.callOff.confirmWorkingDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Difference allowed on a line with a contract price | Selisih yang diizinkan pada baris dengan harga kontrak | `adminSet.key.invoice.contractPricePct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Difference allowed on a line without a contract price | Selisih yang diizinkan pada baris tanpa harga kontrak | `adminSet.key.invoice.standardPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Rupiah cap on that difference | Batas rupiah untuk selisih itu | `adminSet.key.invoice.standardCapIdr.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Over-delivery accepted without a flag | Kelebihan kiriman yang diterima tanpa ditandai | `adminSet.key.receipt.overPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Shortfall accepted without keeping the receipt open | Kekurangan yang diterima tanpa membiarkan penerimaan terbuka | `adminSet.key.receipt.shortPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Shortfall below forecast accepted in Firm periods | Kekurangan dari prakiraan yang diterima pada periode Pasti | `adminSet.key.commitment.firmShortfallPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Shortfall below forecast accepted in Trade-off periods | Kekurangan dari prakiraan yang diterima pada periode Kompromi | `adminSet.key.commitment.tradeOffShortfallPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Firm periods due after publication | Periode Pasti jatuh tempo setelah penerbitan | `adminSet.key.commitment.firmDeadlineWorkingDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Trade-off and Forecast periods due after publication | Periode Kompromi dan Prakiraan jatuh tempo setelah penerbitan | `adminSet.key.commitment.otherDeadlineWorkingDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Green from (commitment ÷ forecast) | Hijau mulai (komitmen ÷ prakiraan) | `adminSet.key.gap.greenFromPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Amber from (commitment ÷ forecast) | Kuning mulai (komitmen ÷ prakiraan) | `adminSet.key.gap.amberFromPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Minimum OTIF to pass the compliance gate | OTIF minimum untuk lolos gerbang kepatuhan | `adminSet.key.gate.minOtifPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | A supplier with no OTIF history passes the gate | Pemasok tanpa riwayat OTIF lolos gerbang | `adminSet.key.gate.noHistoryPasses.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Fill-rate target, high-volume materials | Target tingkat pemenuhan, material volume tinggi | `adminSet.key.engine.fillRateHighPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Fill-rate target, other materials | Target tingkat pemenuhan, material lain | `adminSet.key.engine.fillRateStandardPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Fill-rate target, slow movers | Target tingkat pemenuhan, material bergerak lambat | `adminSet.key.engine.fillRateSlowPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Share of late deliveries the safety lead time covers | Porsi pengiriman terlambat yang ditutup waktu tunggu pengaman | `adminSet.key.engine.safetyLeadTimePercentile.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Holding cost, share of value per year | Biaya penyimpanan, porsi nilai per tahun | `adminSet.key.engine.holdingCostPctPerYear.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Cost per order | Biaya per pesanan | `adminSet.key.engine.orderCostIdr.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Rented space, per pallet per week | Ruang sewa, per palet per minggu | `adminSet.key.engine.rentedSpaceIdrPerPalletWeek.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Change penalty inside the lead time, per pallet | Penalti perubahan dalam waktu tunggu, per palet | `adminSet.key.engine.changePenaltyIdrPerPallet.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Most rented space, as a share of owned capacity | Ruang sewa terbanyak, sebagai bagian dari kapasitas sendiri | `adminSet.key.engine.maxRentedSpacePct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Former stock reconcile cycle, packaging (not in use) | Siklus rekonsiliasi stok lama, kemasan (tidak dipakai) | `adminSet.key.forecast.fsReconcileCycleWeeks.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Weeks early before a later date is proposed | Minggu lebih awal sebelum tanggal yang lebih lambat diusulkan | `adminSet.key.engine.rescheduleOutWeeks.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Damping weight in the Trade-off zone | Bobot peredaman di zona Trade-off | `adminSet.key.engine.dampingWeightPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Most plan change a model may have and still be chosen (MASC) | Perubahan rencana terbesar agar model masih dapat dipilih (MASC) | `adminSet.key.engine.backtestMascLimitPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Extra quantile in the demand range | Kuantil tambahan pada rentang permintaan | `adminSet.key.engine.rangeExtraQuantilePct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Purchase order lines | Batas kesegaran: Baris pesanan pembelian | `adminSet.key.engine.freshnessDays.poLines.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Schedule changes | Batas kesegaran: Perubahan jadwal | `adminSet.key.engine.freshnessDays.scheduleChanges.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Goods receipts | Batas kesegaran: Penerimaan barang | `adminSet.key.engine.freshnessDays.receipts.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Sources (lead time, MOQ, share) | Batas kesegaran: Sumber (waktu tunggu, MOQ, porsi) | `adminSet.key.engine.freshnessDays.sources.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Bills of materials | Batas kesegaran: Daftar bahan (BOM) | `adminSet.key.engine.freshnessDays.bom.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Stock on hand | Batas kesegaran: Stok tersedia | `adminSet.key.engine.freshnessDays.stock.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Material values | Batas kesegaran: Nilai material | `adminSet.key.engine.freshnessDays.materialValues.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Finished goods | Batas kesegaran: Barang jadi | `adminSet.key.engine.freshnessDays.finishedGoods.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Sales history | Batas kesegaran: Riwayat penjualan | `adminSet.key.engine.freshnessDays.sales.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: SAP finished-goods plan | Batas kesegaran: Rencana barang jadi SAP | `adminSet.key.engine.freshnessDays.fgPlan.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: Open sales orders | Batas kesegaran: Pesanan penjualan terbuka | `adminSet.key.engine.freshnessDays.salesOrders.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Freshness limit: SAP safety stock | Batas kesegaran: Stok pengaman SAP | `adminSet.key.engine.freshnessDays.sapSafetyStock.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Warning below | Peringatan di bawah | `adminSet.key.compliance.warnPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Flag below | Tanda merah di bawah | `adminSet.key.compliance.flagPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Weight in the performance score | Bobot dalam skor kinerja | `adminSet.key.compliance.scoreWeight.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Default minimum remaining shelf life | Sisa umur simpan minimum bawaan | `adminSet.key.shelfLife.defaultMonths.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |

## Page: /buyer/admin/alert-thresholds — rule-value rows (`pages-v2/admin/AdminRuleValues/components/RuleRow.jsx`)

| Kind | Label EN | Label ID | Key | Important | Source wording | Differs | Clash | Also called | Status | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| row | Medium risk below this multiple of the lead time | Risiko sedang di bawah kelipatan waktu tunggu ini | `adminSet.key.risk.mediumBelowMultiple.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Critical below | Kritis di bawah | `adminSet.key.bands.criticalBelowDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Warning below | Waspada di bawah | `adminSet.key.bands.warningBelowDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Healthy up to | Sehat sampai | `adminSet.key.bands.healthyUpToDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Covered from | Tercakup mulai | `adminSet.key.coverage.coveredFromPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | At risk from | Berisiko mulai | `adminSet.key.coverage.atRiskFromPct.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Default stale period | Periode data usang bawaan | `adminSet.key.stale.defaultDays.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Stock pull interval for system-connected suppliers | Interval penarikan stok untuk pemasok yang terhubung sistem | `adminSet.key.stockSync.intervalHours.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Stale period for system-connected suppliers | Periode data usang untuk pemasok yang terhubung sistem | `adminSet.key.stale.apiHours.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Weekly update cutoff day | Hari batas pembaruan mingguan | `adminSet.key.stockUpdate.cutoffDay.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |
| row | Weekly update cutoff time | Jam batas pembaruan mingguan | `adminSet.key.stockUpdate.cutoffTime.label` | Y | not looked up | n/a | N |  | Ask Levi | Admin rule row with its own hint line; in BR-05 scope? See Ask Levi |

## 3. Coverage

Search: `<Table`, `<DataTable` or `KpiCard` under `src/pages-v2` and `src/components`, tests excluded (114 files). Custom grids were found by `<table`, `<th`, `role="grid"` and week-grid row lists (45 more files). Rows = labels the file contributed. Total 1,179.

| File | Found by | Rows | Note |
|---|---|---|---|
| `components/delivery/AgreementDrawdown.jsx` | search | 5 | 4 KPIs + Action header it passes to ReleaseCalendar; no on-screen "DA" label (DA is code-comment shorthand only) |
| `components/delivery/ReleaseCalendar.jsx` | search | 6 | Listed once; also renders on 2 more pages |
| `components/ui-v2/KpiCard.jsx` | search | 0 | no labels: shared component (title = `eyebrow` prop) |
| `components/ui-v2/Table.jsx` | custom grid | 0 | no labels: shared component |
| `components/ui-v2/TableHeader.jsx` | custom grid | 0 | no labels: shared component |
| `components/ui-v2/WeekGrid.jsx` | custom grid | 1 | Own label "Month" corner (Monthly view), listed once under /buyer/demand-anticipation; every other label comes from parent props; "This week", "Partial", week numbers are markers/data |
| `components/ui-v2/pinnedColumn.js` | custom grid | 0 | no labels: column-pinning helper, no text |
| `components/ui-v2/weekGridView.js` | custom grid | 0 | no labels: Weekly/Monthly view store |
| `pages-v2/BuyerAlerts.jsx` | custom grid | 5 | 3 columns + 2 rule-name rows (DA rule under TL-D1, ROP Supplier rule under TL-D6); alert list is a list, not a table |
| `pages-v2/BuyerCallOffs/components/SeriesPreview.jsx` | custom grid | 3 |  |
| `pages-v2/BuyerCallOffs/components/UmbrellaSection.jsx` | search | 7 | Header facts (RemainingFacts, RunOutFacts, PicHeader) are not table headers |
| `pages-v2/BuyerCapacity.jsx` | custom grid | 10 | Status filter chips and "Gaps only" are filters (out) |
| `pages-v2/BuyerCommitments/components/ActionPanelBody.jsx` | custom grid | 3 | Move demand table; rest is prose and a note field |
| `pages-v2/BuyerCommitments/components/CommitmentGrid.jsx` | custom grid | 1 | Period columns are dates; row headers are data |
| `pages-v2/BuyerCommitments/components/ExceptionsSection.jsx` | search | 12 |  |
| `pages-v2/BuyerCommitments/components/SupplierCoverage.jsx` | search | 5 |  |
| `pages-v2/BuyerCompliance/components/ComplianceKpis.jsx` | search | 5 |  |
| `pages-v2/BuyerCompliance/components/ComplianceRegistryTable.jsx` | search | 9 |  |
| `pages-v2/BuyerContracts/components/ContractsKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerContracts/components/ContractsTable.jsx` | search | 9 |  |
| `pages-v2/BuyerContracts/components/WizardBasicsStep.jsx` | custom grid | 0 | no labels: only form fields |
| `pages-v2/BuyerContracts/components/WizardObligationsStep.jsx` | custom grid | 3 | Suggested-obligation titles are hard-coded content, not labels |
| `pages-v2/BuyerDataHealth.jsx` | search | 24 | 4 KPI + 4 tables |
| `pages-v2/BuyerDeliveryAgreements.jsx` | search | 6 | No on-screen "DA" label; ReleaseCalendar labels counted under ReleaseCalendar.jsx |
| `pages-v2/BuyerDemandAnticipation/components/AnticipationGrid.jsx` | custom grid | 7 | Corner + LTP, Safety order, Carried in, Demand anticipation, Would be, Surplus absorbed; "Published"/"Horizon" header pills are markers, not labels |
| `pages-v2/BuyerDemandAnticipation/components/ltpFgDemandRows.jsx` | custom grid | 3 | FG demand, LTP − FG demand, Consumption average |
| `pages-v2/BuyerDemandAnticipation/components/supplyRows.jsx` | custom grid | 2 | Open supply, Gap |
| `pages-v2/BuyerDemandAnticipation/consumptionRows.jsx` | custom grid | 1 | Recorded consumption |
| `pages-v2/BuyerDemandAnticipation/index.jsx` | custom grid | 0 | no labels: page entry; grid labels counted under AnticipationGrid and its row modules; rest is filters, tabs, prose |
| `pages-v2/BuyerDemandAnticipationHistory.jsx` | custom grid | 9 | 6 grid labels + 3 CSV headers (TL-D1/TL-D8 only); facts list (dt: OSPO, Safety order, Remainder…) not counted, see Ask Levi 5 |
| `pages-v2/BuyerDemandForecast.jsx` | search | 28 | 4 KPI, levels, SKU, weeks grid, events tables |
| `pages-v2/BuyerForecastBias.jsx` | search | 23 | Bias tab of /buyer/demand-forecast; FVA group rows are cell values |
| `pages-v2/BuyerForecasts.jsx` | search | 4 | Rendered as Published versions tab of /buyer/stabilise |
| `pages-v2/BuyerGoodsReceipt/components/DiscrepancySection.jsx` | search | 5 | Blank action header not counted |
| `pages-v2/BuyerGoodsReceipt/components/GoodsReceiptKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerGoodsReceipt/components/GoodsReceiptTable.jsx` | search | 8 | Blank action header not counted |
| `pages-v2/BuyerGoodsReceipt/components/GrLineItems.jsx` | search | 6 | "Quantity check (CR-25)" is a section heading, not a column |
| `pages-v2/BuyerInventory.jsx` | search | 10 | 4 filter tiles (Ask Levi) + 6 columns; PicFilter/drawers hold no table labels here |
| `pages-v2/BuyerInvoices/components/AgingTab.jsx` | search | 5 | Chart series name not counted |
| `pages-v2/BuyerInvoices/components/InvoiceKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerInvoices/components/InvoiceQueueTable.jsx` | search | 9 |  |
| `pages-v2/BuyerInvoices/components/RemittanceSection.jsx` | custom grid | 5 | Key-value table row labels |
| `pages-v2/BuyerMaterialRequirement.jsx` | search | 27 | 4 KPI + 3 tables (local component named WeekGrid is a plain table) |
| `pages-v2/BuyerModelBacktest.jsx` | search | 54 | 4 KPI + 7 tables |
| `pages-v2/BuyerOrderPlan/components/BelowDemandSection.jsx` | search | 6 |  |
| `pages-v2/BuyerOrderPlan/components/FillTable.jsx` | search | 7 |  |
| `pages-v2/BuyerOrderPlan/components/RecommendationsSection.jsx` | search | 9 |  |
| `pages-v2/BuyerOrderPlan/components/RopFisikPrSection.jsx` | search | 5 |  |
| `pages-v2/BuyerOrderPlan/components/WarehouseKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerOrders/components/OrdersKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerOrders/components/OrdersTable.jsx` | search | 9 |  |
| `pages-v2/BuyerOrders/components/PoLineItems.jsx` | custom grid | 4 | Footer "Total" not counted |
| `pages-v2/BuyerReliability.jsx` | search | 13 | 5 KPI + 8 columns |
| `pages-v2/BuyerRequisitions/components/RequisitionKpis.jsx` | search | 5 |  |
| `pages-v2/BuyerRequisitions/components/RequisitionTable.jsx` | search | 11 |  |
| `pages-v2/BuyerReschedule/components/FillSection.jsx` | search | 6 |  |
| `pages-v2/BuyerReschedule/components/LaterDeliveries.jsx` | search | 5 |  |
| `pages-v2/BuyerReschedule/components/ProposalTable.jsx` | search | 11 | Rendered 3 times with the same headers; listed once |
| `pages-v2/BuyerReschedule/components/RescheduleKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerRfi.jsx` | search | 4 | RFI list; blank last header skipped |
| `pages-v2/BuyerRfiEvent.jsx` | search | 6 | Invited suppliers table; answers grid and documents counted under RfiProposals and SupplierDocumentsPanel |
| `pages-v2/BuyerRfp/components/RfpComparison.jsx` | search | 8 | Two tables (Overview, Compare). Term rows are the RFP's terms (data, `termLabel`); group headers are toggle buttons, not counted |
| `pages-v2/BuyerRfp/components/RfpEventTable.jsx` | search | 4 |  |
| `pages-v2/BuyerRfp/components/RfpInvitees.jsx` | search | 6 |  |
| `pages-v2/BuyerRfp/components/RfpProposals.jsx` | search | 5 | Supplier summary cards (SummaryCard facts: Deviations, Lowest price, Lead time) are not KpiCard; not counted, see Ask Levi |
| `pages-v2/BuyerRfp/components/RfpQuestionAnswers.jsx` | search | 1 | Other headers are supplier names; rows are questions |
| `pages-v2/BuyerSafetyStock.jsx` | search | 24 | 4 KPI + main table (includes texts from shared OsipColumnTitle in safetyStock/osipSafety.jsx and RopColumnTitle in osipRops.jsx) + errors table |
| `pages-v2/BuyerScorecard.jsx` | search | 12 | 4 KPI + fixture KPI tiles row + 7 sr-only chart table headers |
| `pages-v2/BuyerShipments/components/ShipmentLineItems.jsx` | custom grid | 4 |  |
| `pages-v2/BuyerShipments/components/ShipmentsKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerShipments/components/ShipmentsTable.jsx` | search | 9 | Blank action header not counted |
| `pages-v2/BuyerSourcing/components/AwardsHistory.jsx` | search | 6 |  |
| `pages-v2/BuyerSourcing/components/RfqBoardTable.jsx` | search | 9 |  |
| `pages-v2/BuyerSourcing/components/SourcingKpis.jsx` | search | 4 | KpiCard `eyebrow` is the title |
| `pages-v2/BuyerSourcing/components/WizardSuppliersStep.jsx` | custom grid | 6 | Blank checkbox header skipped |
| `pages-v2/BuyerSourcingEvent/components/ComparisonTable.jsx` | search | 17 | Supplier-header pills (Best scored, Tied) are pills, not labels |
| `pages-v2/BuyerSourcingEvent/components/EventItemsSection.jsx` | search | 3 |  |
| `pages-v2/BuyerSourcingEvent/components/NegotiationSection.jsx` | search | 4 | Blank actions header skipped |
| `pages-v2/BuyerSourcingEvent/components/QuoteVersionsSection.jsx` | search | 5 |  |
| `pages-v2/BuyerSourcingEvent/components/ResponseWindowSection.jsx` | search | 4 |  |
| `pages-v2/BuyerStabilise/components/PeriodTable.jsx` | search | 9 |  |
| `pages-v2/BuyerStabilise/components/RuleCounts.jsx` | search | 11 | 3 columns + 8 rule row labels |
| `pages-v2/BuyerStabilise/components/RunKpis.jsx` | search | 4 |  |
| `pages-v2/BuyerStabilise/components/SeriesSection.jsx` | search | 6 | Filter chips out of scope |
| `pages-v2/BuyerStockSimulation.jsx` | search | 12 | PIC via shared PicHeader |
| `pages-v2/BuyerSupplierAccess.jsx` | search | 9 | 2 tables |
| `pages-v2/BuyerSupplierApplications/components/ApplicationsList.jsx` | search | 0 | owned by colleague |
| `pages-v2/BuyerSupplierApplications/components/ApplicationsTable.jsx` | search | 0 | owned by colleague |
| `pages-v2/BuyerSupplierProfile.jsx` | search | 28 | 4 KPIs + 4 tables; Overview/Comm `<dt>` fields not in scope |
| `pages-v2/BuyerSuppliers.jsx` | search | 9 |  |
| `pages-v2/BuyerWhatIfSandbox/components/ResultsTable.jsx` | custom grid | 16 | 3 columns + 13 rows (HEADLINE_KEYS); saved-scenario column header is the scenario's name (data) |
| `pages-v2/BuyerWhatIfSandbox/components/WeeksGrid.jsx` | custom grid | 9 | Corner + 8 rows; "Festive" is a header marker |
| `pages-v2/FixedStockReconcile.jsx` | search | 8 |  |
| `pages-v2/ProcessFlows.jsx` | search | 6 |  |
| `pages-v2/RolesCatalogue.jsx` | custom grid | 6 |  |
| `pages-v2/SupplierCallOffs/components/CallOffTable.jsx` | search | 11 | Includes 4 second-line sub-headers; PIC text from materials/picDisplay.jsx |
| `pages-v2/SupplierCapacity.jsx` | custom grid | 8 | Planning-group sub-tabs are navigation (out) |
| `pages-v2/SupplierDemandAnticipation.jsx` | custom grid | 5 | Corner + 4 rows, same keys as the buyer grid |
| `pages-v2/SupplierDocuments/components/DocumentKpis.jsx` | search | 5 |  |
| `pages-v2/SupplierDocuments/components/DocumentTable.jsx` | search | 8 |  |
| `pages-v2/SupplierForecastCommitments/components/ChangesTable.jsx` | search | 6 |  |
| `pages-v2/SupplierForecastCommitments/components/MaterialSection.jsx` | search | 9 |  |
| `pages-v2/SupplierForecastCommitments/components/PeriodSubmitSection.jsx` | search | 5 |  |
| `pages-v2/SupplierForecastCommitments/components/UploadResultTable.jsx` | custom grid | 4 |  |
| `pages-v2/SupplierGoodsReceipts.jsx` | search | 15 | Main table 10 + panel lines table 5; dt/dd response fields out (detail fields) |
| `pages-v2/SupplierInventory.jsx` | search | 9 | PIC via shared PicHeader; tabs are navigation |
| `pages-v2/SupplierInvoices/components/InvoiceKpis.jsx` | search | 3 |  |
| `pages-v2/SupplierInvoices/components/InvoiceTable.jsx` | search | 8 |  |
| `pages-v2/SupplierInvoices/components/LineQtyTable.jsx` | custom grid | 4 | Used by NewInvoicePanel and FixInvoicePanel |
| `pages-v2/SupplierOrders/components/LineItemsSection.jsx` | custom grid | 3 | Confirmed column shown only when confirming |
| `pages-v2/SupplierOrders/components/OrdersKpis.jsx` | search | 4 |  |
| `pages-v2/SupplierOrders/components/OrdersTable.jsx` | search | 7 |  |
| `pages-v2/SupplierPerformance.jsx` | search | 9 | 4 KPI + 4 PO tiles + fixture KPI tiles row; charts have no tables |
| `pages-v2/SupplierRFQs/components/AwardsTab.jsx` | search | 6 |  |
| `pages-v2/SupplierRFQs/components/RfqKpiRow.jsx` | search | 3 |  |
| `pages-v2/SupplierRfp/components/RfpTermsTable.jsx` | search | 5 |  |
| `pages-v2/SupplierShipments/components/AsnDetailLines.jsx` | custom grid | 6 | PIC header comes from shared PicHeader (materials/picDisplay.jsx, not in list) |
| `pages-v2/SupplierShipments/components/AsnLinesEditor.jsx` | custom grid | 5 |  |
| `pages-v2/SupplierShipments/components/ShipmentsKpiRow.jsx` | search | 5 |  |
| `pages-v2/SupplierShipments/components/ShipmentsList.jsx` | search | 7 | sr-only expand header not counted |
| `pages-v2/admin/AdminMrpControllers.jsx` | search | 8 | 2 tables |
| `pages-v2/admin/AdminPlanningGroups.jsx` | search | 8 | 2 tables |
| `pages-v2/admin/AdminQualification.jsx` | search | 4 |  |
| `pages-v2/admin/AdminReasonCodes.jsx` | search | 10 | 2 tables |
| `pages-v2/admin/AdminRuleValues/components/ChangeHistory.jsx` | search | 4 |  |
| `pages-v2/admin/AdminRuleValues/components/GroupOverridesPanel.jsx` | search | 5 | Row labels (band keys) not counted: no fixed row-label list in this file |
| `pages-v2/admin/AdminRuleValues/components/RuleGroup.jsx` | search | 4 | Rule-name row labels live in RuleRow.jsx, not in this list |
| `pages-v2/admin/AdminRuleValues/components/StalePeriodsPanel.jsx` | search | 7 |  |
| `pages-v2/admin/AdminSourcingTypes.jsx` | search | 3 |  |
| `pages-v2/admin/AdminSuppliers.jsx` | search | 10 | 2 tables |
| `pages-v2/admin/AdminThreePls.jsx` | search | 9 | 2 tables |
| `pages-v2/admin/AdminWorkingCalendar.jsx` | search | 11 | 2 tables |
| `pages-v2/callOffs/blanketRunOutDisplay.jsx` | search | 6 | RunningOutList table; RunOutFacts is a dl, not a table |
| `pages-v2/contracts/contractView.jsx` | custom grid | 4 | Overview `<dt>` fields not in scope |
| `pages-v2/demandForecast/DemandRangeSection.jsx` | search | 13 | Rendered on /buyer/demand-forecast; shared columns across 3 tables noted per row |
| `pages-v2/inventory/FeedstockConfirmPanel.jsx` | search | 4 | Feedstock tab of /supplier/inventory |
| `pages-v2/inventory/ProtectionBufferSection.jsx` | custom grid | 8 | Rendered on /buyer/capacity |
| `pages-v2/inventory/StockUploadPanel.jsx` | custom grid | 7 | Template tab of /supplier/inventory |
| `pages-v2/inventory/StrategicBufferSection.jsx` | custom grid | 6 | Rendered on /buyer/capacity |
| `pages-v2/inventory/inventoryDisplay.jsx` | custom grid | 4 | Incoming panel; also on /supplier/inventory; other exports are pills, cells and helpers |
| `pages-v2/inventory/stockSimulationDisplay.jsx` | custom grid | 5 | Weekly buckets table in the row detail |
| `pages-v2/invoices/InvoiceCollaboration.jsx` | custom grid | 5 | InvoiceLinesSection, listed under /buyer/invoices, also /supplier/invoices; "Price check (CR-12) · Billed" is an in-cell sub-label, not counted |
| `pages-v2/materials/BuyerTradeNames.jsx` | search | 7 |  |
| `pages-v2/materials/SupplierMaterialNames.jsx` | search | 5 | My materials tab of /supplier/inventory |
| `pages-v2/orders/OrderSummaryView.jsx` | search | 8 | Cap/Fore/Ship in-cell short labels not counted; also /supplier/orders?view=summary |
| `pages-v2/orders/PoCollaboration.jsx` | custom grid | 5 | PoResponseDetails table; listed under /buyer/orders, also /supplier/orders |
| `pages-v2/qualification/QualificationPanel.jsx` | search | 3 | History table, buyer view only |
| `pages-v2/receipts/ReceiptDisputesSection.jsx` | search | 5 | Blank action header not counted |
| `pages-v2/rfx/AwardPanel/components/ItemBidTable.jsx` | search | 10 | Shared by /buyer/rfq/:rfqId and /buyer/rfp/:rfpId; price header text comes from AwardPanel.jsx / RfpAwardPanel.jsx, so listed under each page (5 + 5) |
| `pages-v2/rfx/AwardRecords.jsx` | search | 10 | Two tables: RFQ award lines (5), RFP award lines (5) |
| `pages-v2/rfx/RfiProposals.jsx` | custom grid | 2 | Answers grid; RFI summary cards (SummaryCard, "Answered") not KpiCard, not counted |
| `pages-v2/rfx/RfpPricing.jsx` | search | 4 | RfpPricingComparison (buyer) counted. RfpPricingForm (supplier, /supplier/rfp) has Option + quantity-point headers; Option counted once under buyer table, quantity points are data; editor is form fields |
| `pages-v2/rfx/RfxInviteeStep.jsx` | custom grid | 6 | Used by RFI and RFP create wizards; blank checkbox header skipped |
| `pages-v2/rfx/SupplierDocumentsPanel.jsx` | search | 9 | Listed under /buyer/rfi/:rfiId, also on /buyer/rfq/:rfqId and /buyer/rfp/:rfpId |
| `pages-v2/rfx/SupplierFirmOffers.jsx` | search | 2 | Quantity-point headers are data; Firm pill counted |
| `pages-v2/rfx/TieredRfq.jsx` | search | 11 | Three tables: documents, item comparison, alternatives. RfqContentSection field labels are a read-out list, not a table |
| `pages-v2/safetyStock/osipRops.jsx` | custom grid | 6 | ROP detail table; its RopColumnTitle texts on the main table are counted under BuyerSafetyStock.jsx |
| `pages-v2/safetyStock/osipValues.jsx` | custom grid | 4 | Column headers only; the inputs inside are form fields (out) |
| `pages-v2/shipments/AsnShelfLifeExceptions.jsx` | custom grid | 7 | Blank action header not counted |
| `pages-v2/admin/AdminRuleValues/components/RuleRow.jsx` | custom grid | 57 | Rule-value row labels from `services/transitions/hubSettings.js`, keys `adminSet.key.*.label` |

## 4. Owned by colleague

- /buyer/supplier-applications — `pages-v2/BuyerSupplierApplications/components/ApplicationsList.jsx`, `pages-v2/BuyerSupplierApplications/components/ApplicationsTable.jsx` — column 6, row 0, kpi 3 (no rows written)
- /register — `pages-v2/SupplierRegistration/` (index.jsx and components/*) — column 0, row 0, kpi 0 (every `eyebrow` there is a `FormSection` heading, not a KpiCard; no tables)

