# SC Hub plan vs execution requirements: Foresight zones, capacity heads-up, LTP inputs, DA versions, PO On Hold

| Field | Value |
|---|---|
| Status | **Approved 2026-11-05 (MR !95, `c03e64e6`). Built and merged to GitLab `main` in waves 1 and 2: MR !97 `b1bc58e8` (wave 1 and P0 fixes, 2026-11-09), MR !100 `55b63846` (PO On Hold, 2026-11-09), MR !101 `bc6ec8a3` (lead time, switches, trace, sandbox levels, 2026-11-09), MR !102 `c904d7da` (LTP inputs, DA versions, capacity heads-up, 2026-11-10). See the Build status column in section 3 and the wave status in section 5.** The owner answered the clarifying questions on 2026-11-05 (section 2) and ruled on the wave 1 build decisions the same day (PEX-D16 to PEX-D22) and on the working-day count for PO On Hold on 2026-11-09 (PEX-D23). Rows tagged [Proposed] and the decisions in the "My calls" table of section 6 are the builders' and my calls: they were built as written and the owner has not ruled on them |
| Date | 2026-11-05 |
| Source meetings | Weekly SC Hub, 2026-10-21, cited [M21 n]. Weekly SC Hub, 2026-11-04, cited [M04 n]. The PO On Hold decision table shared with the 2026-11-04 notes, cited [Table] |
| Owner review | Answers in chat, 2026-11-05, cited [Owner, 2026-11-05] |
| Code read | GitLab `main` at `3da82ae5` for section 2a (the behaviour before the waves); the Build status column and section 5 were read on `c904d7da` (2026-11-10) |
| Covers | PEX-1 to PEX-16 (section 3). Backlog BL-264 to BL-279 and BL-282 to BL-285; rules still to define BL-293 to BL-295 (2026-11-10) |
| Amends | DRC-3 (DA history), DRC-9a (strategic buffer source), DRC-9c (protection buffer, was Hold), DRC-15a (feedstock reconcile columns), DRC-17 (what-if sandbox) in `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md`; the Firm, Trade-off and Forecast labels in `SC-HUB-TERM-LABELS-REQUIREMENTS-2026-10.md` |
| Waits on | Mba Septi (Material Planning): SAP identifiers for DA, PO, call-off, ASN and LTP; absorption and carry-over thresholds; OSIP MDM template review; ROP, safety stock, lead time and MOQ rules [M21 6] |

**Tags.** [Code] = built behaviour, cited `path:line` under `src/`. [M21 n], [M04 n] = the meetings, by agenda item. [Table] = the PO On Hold decision table. [Owner, 2026-11-05] = the owner's answer. [Default] = a starting value until the named person confirms it. [Proposed] = my call, listed in section 6 with the alternative.

**New IDs.** Requirements PEX-n, rules PEX-n BR-nn, acceptance criteria PEX-n AC-nn, decisions PEX-Dn.

---

## 1. Clean notes

### Weekly SC Hub, 2026-11-04

1. **Foresight commitment and capacity [M04 1].**
   - The supplier commits to what it can fulfil over the lead time. Capacity is shown 6 to 12 months ahead.
   - Weeks are columns (scroll right), not rows.
   - The commitment outside the lead time comes from the capacity confirmation.
   - Firm, Trade-off and Forecast become two zones. **Zone Liability** is the demand inside the lead time. **Zone Capacity** is the capacity left after the liabilities.
   - Foresight shows 17 weeks by week, then 6 months or more by month.
   - Capacity is a heads-up over 6 to 12 months, per material and per brand. Utilisation shows as a percentage with colour bands and a treemap. Utilisation below 70% needs attention.
2. **Supplier confirmation and PO On Hold [M04 2].**
   - Supplier confirmation shows the SLA: the fulfilment window from the lead time.
   - PO On Hold is PO quantity that DA did not absorb. It needs a supplier action. Three ways out: feedstock (FS) only, FS + spread, absorb as finished goods (FG) [Table].
   - The grace period is set per supplier and per material.
   - Feedstock reconcile drops "Called off, not yet shipped". For "Not yet called off", the planner decides between spread and absorb at the end of the period.
3. **LTP framework [M04 3].**
   - LTP A drives ROP, DA and regular replenishment.
   - LTP Festive is the festive need and the strategic buffer.
   - LTP B is the protection buffer for orders.
   - The hub shows all three. Which material uses which LTP is decided outside the hub (Mas Ghifari's system).
   - A change to LTP, strategic buffer (SB) or protection buffer (PB) that moves DA is recorded as a DA version.
4. **DA, PO and history [M04 4].** Track when DA changed and to what. Check whether PO and DA can be linked, and whether a PO can flow back into DA (to be checked).
5. **ASN [M04 5].** ASN is the supplier's shipment to PTI. Consider a link to track the shipment from the principal to the supplier, under Stock.
6. **Actions [M04 6].** Supplier early feedback on 9 scenarios, including adjustment and PO-to-Foresight reconcile. An Excel simulation of the inputs and outputs. Planner final check next week. Updated supplier UI ready for usability testing by Monday 9 or Tuesday 10 November 2026. ZPEE discussion on Friday (date to confirm).

### Weekly SC Hub, 2026-10-21

1. **Plan vs execution [M21 1].** Compare DA (plan) with PO and call-off (execution) as the basis of the feedstock reconcile. One blanket PO has many call-offs and many ASNs; each call-off traces to its PO. Validate the PO to call-off identifier, including a call-off still running after its PO is used up, and overlapping POs. Supplier rejections, demand changes caused by capacity, and fulfilment issues are recorded and linked to DA and capacity. For the remaining PO quantity: the supplier confirms absorb or carry-over; thresholds decide auto absorb, auto carry-over or manual confirmation; the carry-over week follows DA. PO cancellation is unclear.
2. **LTP and constraints [M21 2].** LTP A, B and C with a BOM constraint step. **Superseded** by [M04 3]: no LTP C in the hub; the BOM constraint goes to the sandbox only [Owner, 2026-11-05, Q1].
3. **Master data, RFI and OSIP [M21 3].** The OSIP database is the master data reference. Review the MDM template. Bring RFI fields (lead time, capacity, MOQ and other planning parameters) into master data. Clear definitions, consistent structure, grouping, and mandatory fields marked apart from optional ones.
4. **ROP and safety stock [M21 4].** ROP Fisik and ROP Order calculated apart from DA. ROP adjusts from master data and parameters. A switch turns safety stock or protection buffer on or off; every change carries a reason. Rules and thresholds for safety stock, lead time, MOQ and supplier confirmation to be defined.
5. **Simulation and sandbox [M21 5].** Simulations split by level, not one screen. Levels follow material and supplier characteristics. Fixed vs editable inputs, presets, and combinations: DA adjustment, ROP from LTP, MOQ and safety stock, LTP scenarios (Baseline, Festive, Constraint). Show the effect on FG and on every material in the BOM.
6. **Actions [M21 6].** Mba Septi: items under "Waits on" above. Mas Levi: the overall SC Hub system flow, the MVP scope for LTP selection and BOM constraint, the simulation levels and scenarios.

---

## 2. Owner answers, 2026-11-05

| Q | Question | Answer |
|---|---|---|
| A1 | Foresight zones | Update them: Zone Liability and Zone Capacity |
| A2 | Capacity heads-up | Horizon 12 months, with capacity utilisation |
| A3 | PO On Hold table | As read in section 1 |
| A4 | FS reconcile change | As read in section 1 |
| A5 | LTP framework | LTP Festive and LTP B are new DA columns. Both are additional inputs |
| A6 | DA versioning | Build it on the DA history |
| A7 | Plan vs execution | Improve the existing check |
| A8–A12 | ROP, master data, sandbox, ASN, action items | As read in section 1 |
| Q1 | LTP C and the BOM constraint | No LTP C. The BOM constraint stays in the sandbox |
| Q2 | LTP source | LTP A, LTP Festive, LTP B and the LTP choice per material are all inputs |
| Q3 | "Serap feedstock" | Spread over the next weeks' call-offs, confirmed by the supplier |
| Q4 | FG formula | It is a cap |
| Q5 | Rows 1 and 3 both say "no demand at all" | Use the proposed rule: PIPO goes to FS only; FG needs all its conditions (AND) |
| Q6 | Who picks the option | The planner suggests; the supplier receives the suggestion and chooses the final decision |
| Q7 | Grace period and no-movement days | 14 days each, set per material and supplier |
| Q8 | "Forecast from LTP and SOH" | A heads-up: the ordered quantity comes from the gap between LTP (planned use) and SOH |
| Q9 | Zone rename | Agreed by the planners |
| Q10 | ROP engine | One calculation module, with ROP and DA as separate entry points |
| Q11 | OSIP database | Open it in Chrome when needed |
| Q12 | MoM 21/10 | Not processed before; handled in this file |

---

## 2a. What the hub does today

Read on GitLab `main` `3da82ae5`. Paths are under `src/`.

| Topic | Built behaviour [Code] | Change asked |
|---|---|---|
| Zones | `zoneFor` sets Firm under `firmDays`, Trade-off under `firmDays + tradeOffDays`, else Forecast (`services/transitions/forecastRules.js:193-198`). `firmDays` is the lead time from a sample table, not master data (`services/transitions/forecastConfig.js:75-93`). Labels `fc.zone.*` (`lib/i18n/forecastCollaboration.js:26-28`), also `rs.zone.*` and `stb.zone.*` | PEX-1: two zones |
| Foresight horizon | Packaging 13 weeks then months to 6; raw material 6 months only (`forecastConfig.js:60-63`). The supplier commitments page has one row per period (`pages-v2/SupplierForecastCommitments/components/MaterialSection.jsx:13-16`); the buyer grid has periods as columns (`pages-v2/BuyerCommitments/components/CommitmentGrid.jsx:10-12`) | PEX-2: 17 weeks then months to 12; supplier page turns to columns |
| Capacity | 13 weeks (`services/transitions/inventoryConfig.js:188`), per supplier × planning group × week. Bands compare LTP with capacity: within (green), needs additional (amber), cannot supply (red) (`services/transitions/capacityRules.js:303-337`). No utilisation %, no brand | PEX-4 |
| DA and LTP | One LTP row, read from the Foresight commitment lines' `forecastQty` (`capacityRules.js:355-360`). Strategic buffer = LTP − average of the 3 months before Ramadan to Lebaran (`services/transitions/drcBufferRules.js:16-28`). Protection buffer = an uplift, switch `protectionUplift: 'rollingBaseline' | 'off'`, default `rollingBaseline` (`drcBufferRules.js:392-394`) | PEX-5 |
| DA history | One record per publication × supplier × material, with per-week LTP, safety, carried in and DA, and `rulesVersion` (`services/transitions/demandAnticipationHistory.js:92-118`). Written only by Publish (`flows/demandAnticipation.flow.js:40-48`); no cause is stored | PEX-6 |
| Feedstock reconcile | Columns PO ordered, Called off, ASN requested, Not yet called off, Called off not yet shipped, Max stock supplier (`pages-v2/FixedStockReconcile.jsx:226-233`). The leftover rule is [Proposed BL-207] `showOnly | flagLiability | carryToNextPo` (`services/transitions/feedstockReconcile.js:45-56`) | PEX-9; PO On Hold replaces the leftover rule |
| PO status | No Cancelled status (`services/data/types.js:70-82`). No "on hold" quantity. Call-off carries `poId` and `poLineId`; ASN carries `poReference` and an optional `callOffId` (`types.js:484-499, 1912-1926`) | PEX-7, PEX-11, PEX-12 |
| Per pair settings | Stale period per supplier × material (`services/transitions/hubSettings.js:739`); OSIP params in `t_osipparam_set` (DRC-B49). No grace period, no "no movement" rule | PEX-7 BR-02 to BR-04 |
| Supplier SLA | Call-offs show "confirm by" (`services/transitions/callOffRules.js:567-575`). No fulfilment window anywhere | PEX-10 |
| Safety stock | No on/off switch. OSIP parameter changes keep a ledger but need no reason (`flows/osipParam.flow.js:39-48`) | PEX-13 |
| Sandbox | One supplier × material, OSIP level selector, festive uplift %, up to 3 saved scenarios compared (`services/transitions/whatIfSandboxRules.js:70-114`). No FG or BOM view | PEX-15 |
| BOM | `BomLine` FG → material with `qtyPer`, scrap and yield (`services/engine/types.js:69-82`), used by the forecast engine | PEX-4 brand split, PEX-15 |
| Tracking link | ASN has no URL field; links come from the 3PL's `trackingUrlPattern` (`services/transitions/threePlStore.js:42-48`) | PEX-16 |

---

## 3. Requirements

**Build status:**
- **Build now** = decided, or only [Default] and [Proposed] values.
- **After PEX-n** = needs that requirement first.
- **Hold** = waits on Mba Septi; building now would be rework.
- **Built** and **Partly built** (2026-11-10) = merged to GitLab `main`, with the merge request and the backlog row; what is left is named.

| ID | Requirement | Build | Waits on |
|---|---|---|---|
| PEX-1 | Foresight zones: Zone Liability and Zone Capacity replace Firm, Trade-off and Forecast | Partly built: labels (BL-264, MR !97 `b1bc58e8`), plain "Zone Capacity" per PEX-D16; BR-02, BR-03 open (BL-283) | — |
| PEX-2 | Foresight horizon: 17 weeks by week, then by month to month 12, weeks as columns | Partly built: packaging (BL-265, MR !97 `b1bc58e8`); BR-04 raw material open (BL-282) | — |
| PEX-3 | LTP vs SOH heads-up on Foresight | Partly built: BR-01 (BL-266, MR !97 `b1bc58e8`); BR-02 open (BL-284) | — |
| PEX-4 | Capacity heads-up: 12 months, utilisation %, per material and brand, colour bands, treemap | Built (BL-269, MR !102 `c904d7da`); BR-03 brand split rule open (BL-295, PEX-D26) | — |
| PEX-5 | LTP inputs: LTP A, LTP Festive, LTP B and the LTP choice per material; two new DA columns | Mostly built (BL-267, MR !102 `c904d7da`); BR-05 on the Capacity page's strategic buffer section open; BR-08 supplier split rule open (BL-293, PEX-D25); Protection buffer tip (BL-294, TL-D40) | — |
| PEX-6 | DA versions: every input change that moves DA is a version with its cause | Built (BL-268, MR !102 `c904d7da`); the safety stock and protection buffer switch is not yet a cause (BR-01; PEX-13 BR-03) | — |
| PEX-7 | PO On Hold: the remainder DA did not absorb, with a grace period per supplier × material | Built (BL-270, BL-272, MR !100 `55b63846`); working days per PEX-D23 | Thresholds for auto handling (PEX-12) |
| PEX-8 | PO On Hold decision: planner suggests FS only, FS + spread or FG; supplier chooses | Partly built (BL-271, MR !100 `55b63846`): suggestion, choice, pre-selection and silence rule; the end-of-grace execution and the FG data (PIPO flag, Max PTI, stock movement) are open | — |
| PEX-9 | Feedstock reconcile: drop "Called off, not yet shipped"; "Not yet called off" feeds PO On Hold | Built: BR-01 (BL-274, MR !97 `b1bc58e8`); BR-02 and BR-03 (BL-271, MR !100 `55b63846`) | — |
| PEX-10 | SLA on supplier confirmations: fulfilment window from the lead time | Built (BL-273): call-offs and Foresight commitments in MR !97 `b1bc58e8`, lead time per PEX-D17 and PEX-D18; the PO On Hold decision in MR !100 `55b63846` | — |
| PEX-11 | Plan vs execution trace: DA → PO → call-off → ASN, with exceptions | Built: trace and flags (BL-276, MR !101 `bc6ec8a3`); Hold: PO back into DA (BR-04) | Mba Septi: SAP identifiers |
| PEX-12 | Remaining PO thresholds: auto absorb, auto carry-over, manual; PO cancellation | Hold | Mba Septi: thresholds; cancellation flow |
| PEX-13 | Safety stock and protection buffer switch per material, reason required | Partly built: switch (BL-275, MR !101 `bc6ec8a3`); BR-03 (a DA version on a switch change) not built; Hold: rules (BR-04) | Mba Septi: rules and thresholds |
| PEX-14 | Master data from OSIP and RFI, mandatory fields marked | Hold | Mba Septi: MDM template review |
| PEX-15 | What-if sandbox by level, with LTP scenarios and a BOM constraint | Partly built (BL-277, MR !101 `bc6ec8a3`): three level tabs and the BOM constraint; Festive and Protection buffer presets not yet reading the LTP inputs; no LTP scenario for a finished good | — |
| PEX-16 | ASN: principal-to-supplier tracking link under Stock | Built (BL-279, MR !97 `b1bc58e8`) | — |

### Requirement detail

**PEX-1 Foresight zones [M04 1; Owner, 2026-11-05, A1, Q9]**
- BR-01. **Zone Liability** = the weeks from this week to the end of the material's lead time (DRC-6). The quantity is PTI's demand in those weeks. The supplier commits to it.
- BR-02. **Zone Capacity** = the weeks after the lead time. The quantity is the supplier's capacity left after the liabilities: confirmed capacity − (Zone Liability quantity + other open commitments in that period).
- BR-03. The commitment in Zone Capacity is read from the supplier's capacity confirmation, not typed again [M04 1].
- BR-04. The labels Firm, Trade-off and Forecast go from every buyer and supplier page, the glossary and both locales. "Zone Liability" and "Zone Capacity" stay in English in the Indonesian locale (TL-D6 open rule).
- BR-05. Each zone label carries a term tip (TL-D7: an important term).
- AC-01. A material with a 6-week lead time shows weeks 1–6 under Zone Liability and week 7 onward under Zone Capacity.
- AC-02. No page, tooltip or i18n value contains "Firm", "Trade-off" or "Forecast" as a zone name.

**PEX-2 Foresight horizon [M04 1; Owner, 2026-11-05, A2]**
- BR-01. Weeks are columns; the grid scrolls right. Material and row labels stay pinned on the left.
- BR-02. Weeks 1–17 show by week. After week 17, months show to month 12 from the planning week.
- BR-03. A month that starts inside week 17 begins at the first full month after it [Proposed].
- BR-04. The same horizon applies to packaging and raw material. Today raw material has no weekly periods [Proposed].
- BR-05. The supplier Foresight commitments page turns from a row per period to a column per period, as the buyer grid already is.
- AC-01. On planning week W45 2026 the grid shows W45 2026 to W8 2027 by week, then March 2027 to October 2027 by month. (Corrected 2026-11-05: 2026 has 53 ISO weeks, so 17 weeks from W45 end at W8, 22–28 Feb 2027; the text read W9.)

**PEX-3 LTP vs SOH heads-up [Owner, 2026-11-05, Q8]**
- BR-01. A one-line note on the Foresight demand row says where the ordered quantity comes from: "Ordered quantity = LTP (planned use) − PTI stock on hand." It is an explanation, not a new figure.
- BR-02. Hovering a week shows LTP, SOH and the gap for that week.

**PEX-4 Capacity heads-up [M04 1; Owner, 2026-11-05, A2]**
- BR-01. Horizon 12 months. Weeks 1–13 keep the weekly entry built today; months 4–12 are entered by month [Proposed].
- BR-02. Utilisation(month) = PTI demand on the supplier in the month ÷ the supplier's confirmed capacity in the month, as a percentage [Proposed]. Demand is the LTP-based demand of PEX-5.
- BR-03. Breakdown per material and per brand. A material's demand is split to brands by the share of each FG's LTP in the material's BOM demand [Proposed; BOM lines exist at `services/engine/types.js:69`]. **Open, 2026-11-10:** the hub holds no LTP per FG (LTP is per material, PEX-5). MR !102 splits by the material's gross requirement pegs per brand from a 56-week engine run, one share for all 12 months. The rule, with OEM finished goods and the months past the engine horizon, is PEX-D26 (BL-295).
- BR-04. Colour bands: the built LTP vs capacity bands stay (green within, amber needs additional capacity, red cannot supply). A new band marks utilisation below 70% as under-used, needs attention [M04 1]. It uses a neutral blue outline, not amber, so it does not read as a supply risk [Proposed].
- BR-05. A treemap per supplier: tile size = confirmed capacity, tile colour = the band. The table stays the primary view; the treemap is a second tab with the same figures (DP-2 accessibility: colour is never the only signal; each tile prints its %).
- BR-06. A month with no confirmed capacity shows "No capacity confirmed", not 0%.
- BR-07. Capacity is confirmed per planning group today. Per material, utilisation = material demand ÷ the group's capacity, so the materials of a group add up to the group figure.
- AC-01. Demand 700, capacity 1,000 reads 70%, green. Demand 690 reads 69%, under-used.

**PEX-5 LTP inputs [M04 3; Owner, 2026-11-05, A5, Q2]**
- BR-01. Four inputs per material: LTP A, LTP Festive and LTP B (quantities per week), and the LTP choice (A, Festive or B) per material. All come from outside the hub (Mas Ghifari's system).
- BR-02. Until a feed exists, the planner uploads them from a file on the DA page [Proposed]. Each upload is stamped with the uploader, date and source file name. LTP A replaces today's source, the Foresight commitment `forecastQty`; until LTP A is uploaded for a material, that source stays.
- BR-03. The DA grid shows LTP A as today and adds two rows, LTP Festive and LTP B. The row that DA uses is marked.
- BR-04. DA(w) = the chosen LTP(w) (DRC-2 BR-02 reads the chosen LTP instead of the single LTP).
- BR-05. Strategic buffer = LTP Festive − LTP A when LTP Festive is given. The DRC-9a calculation (LTP − baseline) stays as the fallback when it is not [Proposed].
- BR-06. Protection buffer = LTP B − LTP A, used for orders (ROP Order) only. It replaces the built uplift (`protectionUplift: 'rollingBaseline'`) when LTP B is given [Proposed]. Tip wording: TL-D40 (BL-294).
- BR-07. The hub never picks the LTP. A material with no choice uses LTP A.
- BR-08. Supplier split. LTP A, LTP Festive and LTP B are per material; DA, safety order and the capacity heads-up are per supplier × material. The split rule needs an owner answer (PEX-D25, BL-293). As built in MR !102: each supplier's share of the Foresight commitment LTP over the first 4 hub weeks, an even split when there is none, one share for every week.
- AC-01. Material X: LTP A 100, LTP Festive 130, LTP B 115, choice Festive. DA = 130, strategic buffer = 30, protection buffer = 15.

**PEX-6 DA versions [M04 3, 4; Owner, 2026-11-05, A6]**
- BR-01. A DA version is a publication, as today. When any of these changes and moves a DA figure, the published DA is marked out of date with the cause: LTP A, LTP Festive, LTP B, the LTP choice, strategic buffer, protection buffer, the safety stock or protection buffer switch (PEX-13) [Proposed].
- BR-02. The next publication stores the causes since the previous one (which input, old value, new value, who, when) beside what it stores today. Version number = the count of publications for the pair and planning week.
- BR-03. An input change that moves no DA figure is logged as an input change, not a version.
- BR-04. The DA history page (DRC-3) lists the versions per material with the cause and a before/after per week. Two versions can be compared side by side.
- AC-01. Uploading LTP B for a material whose choice is A marks nothing. Switching the choice to B marks DA out of date; the next publication records the cause "LTP choice A → B".

**PEX-7 PO On Hold [M04 2; Table; Owner, 2026-11-05, Q7]**
- BR-01. PO On Hold (supplier × material) = open PO quantity that DA over the horizon does not absorb: max(0, OSPO − Σ DA not yet called off over the horizon) [Proposed].
- BR-02. The grace period starts on the day a PO On Hold quantity first appears [Proposed]. Its length is 14 working days on the hub calendar by default, editable per supplier × material [Owner, 2026-11-05, Q7; working days: Owner, 2026-11-09, PEX-D23].
- BR-03. The "no stock movement" period for the FG option is 14 working days on the hub calendar by default, editable per supplier × material [Owner, 2026-11-05, Q7; working days: Owner, 2026-11-09, PEX-D23].
- BR-04. Both settings live in the planner ledger `t_osipparam_set`, keyed `grace|<supplier>|<material>` and `noMove|<supplier>|<material>` (DRC-B49 pattern) [Proposed].
- BR-05. Until the grace period ends, the quantity shows as PO On Hold, "decision due <date>". The decision (PEX-8) takes effect at the end of the grace period [Table].

**PEX-8 PO On Hold decision [M04 2; Table; Owner, 2026-11-05, Q3–Q6]**
- BR-01. The planner suggests one option per PO On Hold line. The supplier sees the suggestion and chooses the final option. The supplier's choice is final [Owner, 2026-11-05, Q6].
- BR-02. The hub pre-selects the suggestion from the conditions below; the planner can change it before sending.

  | Option | Condition (all must hold) | At the end of the grace period |
  |---|---|---|
  | FS only | PIPO material, or no demand at all | The remainder is taken as feedstock in one call-off [Proposed, see PEX-D3] |
  | FS + spread | Demand dropped and is still above 0 | The remainder is spread over the next weeks' call-offs, following DA [Owner, 2026-11-05, Q3] |
  | Absorb as FG | Not PIPO, AND no demand at all, AND no stock movement for the set period (BR-03 of PEX-7) | Absorbed up to the cap; the rest stays on hold |

- BR-03. FG cap = (Max PTI + min(Max Supplier, SOH Supplier)) − SOH PTI, floored at 0 [Table; Owner, 2026-11-05, Q4].
- BR-04. A quantity above the cap stays PO On Hold and goes back to the planner.
- BR-05. The supplier's choice and the planner's suggestion are both recorded, with time and who, on an append-only ledger.
- BR-06. A supplier who has not chosen by the end of the grace period: the planner's suggestion applies, marked "no supplier response" [Proposed].
- AC-01. PIPO material, remainder 500: suggestion FS only. Supplier chooses FS + spread: the 500 is spread over the next weeks' call-offs.
- AC-02. Non-PIPO, zero demand, no movement 14 working days, Max PTI 1,000, Max Supplier 400, SOH Supplier 300, SOH PTI 900: cap = 1,000 + 300 − 900 = 400. Remainder 600: 400 absorbed as FG, 200 stays on hold.
- AC-03. Non-PIPO, zero demand, stock moved 5 days ago: FG is not suggested.

**PEX-9 Feedstock reconcile [M04 2; Owner, 2026-11-05, A4]**
- BR-01. Remove the "Called off, not yet shipped" column on the buyer and supplier views.
- BR-02. "Not yet called off" links to the PO On Hold line for the same supplier × material and shows its option and status.
- BR-03. PO On Hold replaces the [Proposed] leftover rule BL-207 (`showOnly | flagLiability | carryToNextPo`).

**PEX-10 SLA on supplier confirmations [M04 2]**
- BR-01. Every supplier confirmation (call-off, Foresight commitment, PO On Hold decision) shows the fulfilment window: from the confirmation date to that date + the material's lead time (DRC-6).
- BR-02. Format: "Fulfil by 3 Dec 2026 (lead time 28 days)".

**PEX-11 Plan vs execution trace [M21 1; M04 4; Owner, 2026-11-05, A7]**
- BR-01. For a supplier × material, one view shows DA per week, the POs, the call-offs per PO and the ASNs per call-off.
- BR-02. Every call-off names its PO. A call-off with no PO, a call-off open after its PO is used up, and two POs open for the same supplier × material in the same period are flagged.
- BR-03. Supplier rejections and capacity-driven demand changes show on the week they hit, linked to the DA version (PEX-6) and the capacity confirmation.
- BR-04. **Hold:** a PO flowing back into DA, until Mba Septi confirms the SAP identifiers [M04 4].

**PEX-12 Remaining PO thresholds and cancellation [M21 1]** Hold. Waits on Mba Septi for the thresholds that decide auto absorb, auto carry-over or manual confirmation, and on the PO cancellation flow. PEX-8 is the manual path until then.

**PEX-13 Safety stock and protection buffer switch [M21 4]**
- BR-01. Per material, two switches: safety stock on/off, protection buffer on/off. Default on.
- BR-02. Turning either one off or on requires a reason (free text, at least 10 characters), recorded with who and when. The protection buffer switch moves from the code constant `protectionUplift` to this per-material setting.
- BR-03. A switch change that moves DA writes a DA version (PEX-6).
- BR-04. **Hold:** the rules and thresholds that would flip the switch automatically.

**PEX-14 Master data [M21 3]** Hold. Waits on Mba Septi's review of the OSIP MDM template and the RFI field list. When it lands: each master field has a definition, a group, and a mandatory or optional mark; mandatory fields show a marker and block save when empty.

**PEX-15 What-if sandbox by level [M21 5; Owner, 2026-11-05, Q1]**
- BR-01. Three levels, each its own tab [Proposed]:
  1. **Material:** one supplier × material. The sandbox built today, plus the LTP choice.
  2. **FG and BOM:** one FG. LTP scenario applied to the FG; the effect on every material in its BOM.
  3. **Supplier:** one supplier. Total demand vs capacity per month (PEX-4 figures).
- BR-02. Scenarios: Baseline (LTP A), Festive (LTP Festive), Protection buffer (LTP B), and BOM constraint. No LTP C.
- BR-03. **BOM constraint:** the planner enters the units a limiting material supports. The FG production quantity drops to that number, and every other material in the BOM is recalculated from it.
- BR-04. Fixed vs editable inputs are listed on each tab. Presets load a known case.
- AC-01. FG demand 110; material X supports 80. Materials Y and Z are recalculated for 80 FG units.

**PEX-16 ASN tracking link [M04 5]**
- BR-01. On the supplier Stock page (`/supplier/inventory`), an incoming shipment from the principal can carry a tracking URL typed by the supplier. It is not an ASN and does not use the 3PL pattern.
- BR-02. The link opens in a new tab. Only `https://` links are accepted.

---

## 4. Defaults table

| ID | Default | Source | Kind | Confirm with |
|---|---|---|---|---|
| D1 | Grace period 14 working days per supplier × material | Owner, 2026-11-05, Q7; 2026-11-09 (PEX-D23) | Value | Planner |
| D2 | No-movement period 14 working days per supplier × material | Owner, 2026-11-05, Q7; 2026-11-09 (PEX-D23) | Value | Planner |
| D3 | Utilisation bands: <70% amber, 70–100% green, >100% red | M04 1 (70%); the rest Proposed | Value | Planner |
| D4 | Grace period starts when the remainder first appears | Proposed | Rule | Mba Septi |
| D5 | Supplier silence at the end of the grace period applies the planner's suggestion | Proposed | Rule | Planner |
| D6 | LTP inputs by file upload until a feed exists | Proposed | Source | Mas Ghifari |
| D7 | Brand split by FG LTP share in the BOM; open, the hub holds no FG LTP (PEX-D26) | Proposed | Rule | Planner |

---

## 5. Development plan

The supplier usability test is on Monday 9 or Tuesday 10 November 2026 [M04 6]. Wave 1 is what suppliers will see in it.

| Wave | Goal | Backlog | Ready by |
|---|---|---|---|
| 1 | Supplier UI for the usability test | BL-264 zones, BL-265 horizon, BL-266 heads-up, BL-273 SLA, BL-274 FS reconcile column, BL-279 tracking link | Fri 6 Nov 2026 merge, so the build is up by Mon 9 Nov |
| 2 | LTP inputs and DA versions | BL-267 LTP inputs, BL-268 DA versions, BL-269 capacity heads-up and treemap | Week of 9 Nov |
| 2a | Rules wave 2 left undefined, in priority order | BL-293 supplier split, BL-294 Protection buffer tip, BL-295 brand split | After the owner rules PEX-D25, TL-D40 and PEX-D26 |
| 3 | PO On Hold end to end | BL-270 PO On Hold, BL-271 decision, BL-272 grace settings, BL-275 SS/PB switch | Week of 16 Nov |
| 4 | Trace and sandbox | BL-276 trace, BL-277 sandbox levels | Week of 23 Nov |
| Held | Wait on Mba Septi | BL-278 master data; PEX-11 BR-04; PEX-12 | When she answers |

**Wave 1 status, 2026-11-10:** built on branch `feat/pex-wave1-p0` with the P0 fixes BL-182, BL-78 and BL-234 and merged in MR !97 (`b1bc58e8`, 2026-11-09). BL-274 and BL-279 are done; BL-264, BL-265 and BL-266 are partly built, and what is left is BL-282 (weekly raw material), BL-283 (Zone Capacity quantity) and BL-284 (per-week LTP and SOH hover). BL-273 is done: call-offs and Foresight in MR !97, the PO On Hold decision in MR !100.

**Wave 2 status, 2026-11-10** (waves 2 and 3 of the table above were built together in three lanes, not in the order of the table):
- MR !100 (`55b63846`, 2026-11-09): PO On Hold (BL-270), grace settings (BL-272), the decision (BL-271, partly) and the feedstock reconcile link (PEX-9 BR-02, BR-03). Not built: the end-of-grace execution, FG data, PEX-12.
- MR !101 (`bc6ec8a3`, 2026-11-09): one lead time on the Stock page (BL-285), safety stock and protection buffer switches (BL-275, partly), the plan vs execution trace (BL-276, partly), the sandbox levels (BL-277, partly).
- MR !102 (`c904d7da`, 2026-11-10): LTP inputs (BL-267, mostly), DA versions (BL-268) and the capacity heads-up (BL-269).
- Open with their blockers: end of grace and the FG data (BL-271), Festive and Protection buffer presets and the FG scenario in the sandbox (BL-277), auto-switching rules (BL-275, Mba Septi), a PO flowing back into DA (BL-276, Mba Septi), PEX-12 thresholds and cancellation, master data (PEX-14, BL-278, Mba Septi). The status of each row is in section 4e of `BACKLOG.md`.

**Not in this file:** the Excel simulation and the 9-scenario supplier test [M04 6] are owner deliverables, not hub builds. The ZPEE discussion has no requirement yet.

---

## 6. Decisions

**Settled by the owner, 2026-11-05**

| ID | Decision | Outcome |
|---|---|---|
| PEX-D1 | Zones | Zone Liability and Zone Capacity replace Firm, Trade-off and Forecast everywhere (planners agreed) |
| PEX-D2 | LTP C | Not in the hub. BOM constraint lives in the sandbox only |
| PEX-D4 | Who decides PO On Hold | Planner suggests; supplier chooses the final option |
| PEX-D5 | Rows 1 and 3 overlap | PIPO with zero demand → FS only. FG needs not PIPO AND zero demand AND no movement |
| PEX-D6 | FG formula | A cap; the rest stays on hold |
| PEX-D7 | Grace and no-movement periods | 14 days each, per supplier × material; counted in working days from 2026-11-09 (PEX-D23) |
| PEX-D8 | ROP engine | One calculation module, ROP and DA as separate entry points |
| PEX-D16 | Zone names after the lead time | Plain "Zone Capacity" for the old Trade-off and Forecast weeks, EN and ID (BL-264); detail in `DECISION-GUIDE.md` |
| PEX-D17 | Fulfil-by lead time | DRC-6 `leadTimeBreakdown`; the Stock page mismatch is BL-285 |
| PEX-D18 | No lead time on record | Call-offs use the material-type default (packaging 14, raw material 30 days), labelled as a default |
| PEX-D19 | Tracking-link test data | Run the step as sup-005 on its seeded principal shipment `ish-0002`; nothing new is seeded |
| PEX-D20 | Other MR !97 build decisions | Accepted as built; BR-02/BR-03 (BL-283), BR-04 (BL-282) and the LTP and SOH hover (BL-284) stay deferred |
| PEX-D21 | Stabilise and Reschedule labels | Keep the zone renames; their rules are unchanged |
| PEX-D22 | Who commits where | Zone Capacity periods are acknowledge-only; commitments are typed in Zone Liability only. The capacity-left quantity stays in BL-283 |
| PEX-D23 | PO On Hold days | The grace period and the no-movement days count working days on the hub calendar, not calendar days (owner, 2026-11-09). Built in MR !100 |
| PEX-D24 | Wave 1 questions Q-W3, Q-W4, Q-W5 | The owner accepted the recommended answer to each on 2026-11-05: Q-W3 suppliers see the heads-up sentence only; the per-week LTP, SOH and gap show on the buyer grid, and on the supplier page only for materials with granted PTI-stock access (not built: BL-284); Q-W4 the tracking link is held by a governed ledger verb, built as `t_incomingshipment_track` (the question named `t_incomingtracking_set`); Q-W5 the supplier test build is a Vercel preview deploy from the CLI of merged GitLab `main`, with the owner's OK. Q-W1 and Q-W2 are PEX-D22 and PEX-D21 |

**My calls, for the owner to overrule.** All of these are **proposed, not ruled**. Wave 2 built each as written: PEX-D3, PEX-D9 and PEX-D14 in MR !100, PEX-D10 to PEX-D13 in MR !102, PEX-D15 in MR !101. A change after merge is a small follow-up MR. The builders also made smaller calls that the requirement text does not settle (for example how a new upload and an unavailable week behave); they are not recorded here until the owner rules on them

| ID | Decision | My call | Alternative |
|---|---|---|---|
| PEX-D3 | What "FS only" does | One call-off of the whole remainder at the end of the grace period. With no demand there are no next weeks to spread over, so "spread" only applies to "FS + spread" | Both FS options spread; FS only would then differ from FS + spread only by its condition |
| PEX-D9 | PO On Hold formula | max(0, OSPO − DA not yet called off over the horizon) | The DRC-15a "Not yet called off" figure as is |
| PEX-D10 | Strategic buffer source | LTP Festive − LTP A; DRC-9a calculation as fallback | Keep DRC-9a only, show LTP Festive as information |
| PEX-D11 | Protection buffer | LTP B − LTP A, in ROP Order only; lifts DRC-9c Hold | Keep on Hold until Mba Septi defines it |
| PEX-D12 | LTP input channel | Planner file upload until a feed exists | Wait for Mas Ghifari's feed |
| PEX-D13 | Utilisation formula | Demand ÷ confirmed capacity per month | (Demand + committed liabilities) ÷ capacity |
| PEX-D14 | Supplier silence | Planner's suggestion applies, marked "no supplier response" | Stays on hold until the supplier answers |
| PEX-D15 | Sandbox levels | Material, FG and BOM, Supplier | Levels by material class (OSIP levels 1–6) |
| PEX-D25 | Split of a material-level LTP to suppliers (PEX-5 BR-08) | Keep the MR !102 rule until ruled: share of the Foresight commitment LTP over the first 4 hub weeks, even split when none | `MaterialSource.share` from the engine dataset; a supplier-level upload; a supplier-level feed from Mas Ghifari's system |
| PEX-D26 | Brand split of the capacity heads-up (PEX-4 BR-03) | Keep the MR !102 rule until ruled: gross requirement pegs per brand from a 56-week engine run, one share for 12 months | A share recomputed per month from the pegs; a brand-level plan, if one exists; a planner-entered share |
