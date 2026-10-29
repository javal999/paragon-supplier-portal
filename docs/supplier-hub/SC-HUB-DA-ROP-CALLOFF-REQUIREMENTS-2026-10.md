# SC Hub DA, ROP and call-off requirements: rolling demand anticipation, OSIP reorder points, call-off trigger, feedstock reconcile, what-if sandbox

| Field | Value |
|---|---|
| Status | **Accepted 2026-10-19.** The owner approved every requirement, default, backlog row and decision in this file ("approve all", 2026-10-19). Wave 1 (BL-187, BL-192, BL-200, BL-201, BL-203) is built in GitLab MR !4 and wave 2 (BL-188, BL-190, BL-193, BL-195, BL-197) in MR !5 and wave 3 (BL-189, BL-191, BL-194 feedstock part, BL-196, BL-198, BL-199) in MR !6, and the what-if sandbox (BL-202) in MR !7, 2026-10-19; build decisions in sections 6a to 6d. Values tagged [Default] are starting values until the Material Planning team confirms them (section 4) |
| Date | 2026-10-19 |
| Source meeting | Weekly SC Hub, 2026-10-14: DA, ROP and call-off. Cited as [MoM n] |
| Other sources | *OSIP Playbook.pptx* (SharePoint, FSE Laboratory), cited [PPT n] by slide; *Framework OSIP PM 2026* (Google Sheets), cited [XLS sheet]. Neither is stored in this repository |
| Owner review | Answers 2026-10-16, cited [Owner, 2026-10-16, Qn] by question ID; approach and approval 2026-10-19 |
| Code read | `main` at `b5bd590` |
| Covers | DRC-1 to DRC-19 (section 3). Backlog BL-187 to BL-209 |
| Supersedes | CAP-10 BR-01, BR-02 and BR-04 and CAP-11 BR-02 and BR-03 (`SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md`); CAP-D12, CAP-D13 and CAP-D17 (`SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md`); REQ-E06-04 (fixed stock reconcile) |
| Open questions | 25, kept by the owner in a workbook for the Material Planning team. Each one is a row of section 4 |

**Tags.** [Code] = built behaviour, cited `path:line` under `src/`. [MoM n] = the meeting. [PPT n], [XLS sheet] = the OSIP sources. [Owner, 2026-10-16, Qn] = the owner's answer to open question Qn. [Default] = a choice made under DRC-D9 until the team confirms it; each names its question in section 4.

**New IDs.** Requirements DRC-n, rules DRC-n BR-nn, acceptance criteria DRC-n AC-nn, decisions DRC-Dn. DRC-16 was merged into DRC-15a before acceptance and is not reused.

---

## 1. Clean notes

**Weekly SC Hub, 14 Oct 2026: DA, ROP and call-off.** Attendees: not stated.

**Demand anticipation (DA)**
- **Role:** DA is the planning signal and commitment to suppliers. Physical deliveries come only through call-offs [MoM 1A; PPT 18].
- **Horizon:** the material's lead time, rolling weekly [Owner, 2026-10-16, A3]. PM lead time is 4–5 weeks; RM is up to about 6 months [MoM 1C].
- **Supply vs DA:** supply above DA is absorbed in the last week of the horizon. A shortfall generates a new PR [Owner, 2026-10-16, A4].
- **Carry-over:**
  - The remainder (DA − call-off) goes to the last week by default, or to the first week outside the horizon if the supplier agrees.
  - The carry-over limit is agreed per supplier and proposed from the last 4 weeks of sales orders [Owner, 2026-10-16, A8; PPT 8, 9].
- **Delayed call-off:** a call-off delayed because LTP dropped needs supplier approval, and DA is adjusted [MoM 1B].
- **History:** all of it is kept; Procurement and Finance audit it [Owner, 2026-10-16, A10].
- **Check:** total DA over the lead time equals ROP Order [PPT 7].

**Safety order and feedstock**
- Safety order = 1.65 × √LT × SD, rounded up to the MPQ [MoM 2A; PPT 7, 11].
- Suppliers confirm Incoming DA plus current feedstock, with a confirmation date. Feedstock is not physical stock until produced [MoM 2B].

**Supplier capacity and stock:** capacity is compared with LTP. Named limits and buffers: supplier max stock, production limit, protection buffer, and strategic buffer (festive, CNY) [MoM 3; PPT 12].

**ROP**
- Every ROP is calculated by the system [Owner, 2026-10-16, B10]:
  - **ROP Order** feeds ZPE007, the MRP module that works out PRs.
  - **ROP Fisik** triggers call-offs.
  - **ROP Supplier, ROP FS and ROP to principal** are the supplier-side ROPs.
- The formula depends on the material's OSIP level [PPT 11, 21; XLS Logics].

**CV:** stdev over 6 months ÷ average over 6 months, per variant, mapped to SKUs; shared components use a demand-weighted average. Stable means CV below 0.5 [MoM 4B; XLS Logics].

**NPD:** new products only. ROP is re-evaluated after the first order using CO and IR, the real demand. The NPD vs CMM rules are open with MDM [MoM 4C; Owner, 2026-10-16].

**Call-off**
- Created when SOH in eWM (plants J6, J2) reaches ROP Fisik. Checks follow the eWM refresh rate [MoM 5A; Owner, 2026-10-16, F2].
- The planner approves each call-off and can request one ad hoc.
- An exhausted umbrella PO produces a recommendation that the planner create a PR in SAP [Owner, 2026-10-16, F2].
- Max stock limits call-offs only [Owner, 2026-10-16, A7].

**Feedstock (FS) reconcile:** compares POs ordered with call-offs and ASNs requested. The leftover rule will be discussed later [Owner, 2026-10-16, F4; MoM 5C].

**What-if sandbox:** scope agreed 2026-10-16 (DRC-17).

**Action items**

| Action | Owner | Due |
|---|---|---|
| Finalise NPD vs CMM rules and material-code prefixes | MDM + Material Planner | not stated |
| Final formula and leftover rule for feedstock reconcile | not stated | "discussed later" |
| Answer the 25 open questions (section 4) | Material Planning team | not stated |

---

## 2. Design rules (how "build now, correct later" stays cheap)

1. **One calculation module.** DA, safety order, every ROP, Max, CV, PR need and carry-over live in pure functions in one module. The live plan, the planner pages and the sandbox (DRC-17) all call it, so an answer changes one place.
2. **One rules block.** Every [Default] is a named key in one frozen config, extending `DEMAND_ANTICIPATION_RULES` [Code: `services/transitions/demandAnticipationRules.js:66`].
   - A value is a number.
   - A formula choice is a switch naming its variants, for example `safetySource: 'deck' | 'sheet'`.
3. **Stamp every stored figure.** A stored DA, ROP or PR recommendation keeps its inputs and the rules version that produced it. A corrected rule recalculates forward, and the audit history still shows which rule made each past number (Procurement and Finance, [Owner, 2026-10-16, A10]).
4. **The team's own examples are tests.**
   - PPT 7: bottle 2000041501, ROP Order 761,888, SS 244,896, PR −645,559.
   - PPT 8: DA adjustment.
   - PPT 9: feedstock reconcile.

   Each becomes a golden fixture, so a default that cannot reproduce them fails CI. Ary's case (CAP-D16) joins them when it arrives.
5. **Provisional, and kept inside PTI.**
   - Every figure built on a [Default] shows "Provisional: rule awaiting Material Planning" with the question ID.
   - PRs and call-offs are recommendations the planner approves [Owner, 2026-10-16, F2], so no default reaches SAP or a supplier on its own.
   - The supplier view of DA (DRC-1) waits (DRC-D10).
6. **Keep data the defaults throw away.** Where a default ignores a dimension, the data still records it: plant on every SOH record (DRC-D12), the level on every material (DRC-D11). A later answer then needs no data migration.

---

## 3. Requirements

**Build status:**
- **Build now** = decided, or only [Default] values and switches.
- **After module** = needs the calculation module first.
- **Hold** = the shape is unknown, so building would be rework.

| ID | Requirement | Build | Waits on |
|---|---|---|---|
| DRC-1 | Suppliers see their own DA, read only | Built, proposal (merged 2026-10-20) | Built behind `SUPPLIER_DA_VIEW_ENABLED = false` (DRC-D10 holds): supplier page of its own published figures, and the Incoming demand anticipation confirmation on the feedstock panel; turning it on is one value |
| DRC-2 | Rolling DA over the lead time, with carry-over | Build now | A1, A9 as [Default] |
| DRC-3 | Full DA history with carry-over origin; audit view for Procurement and Finance | Build now | — |
| DRC-4 | Plan vs execution check: Total DA = Total OSPO (SAP MRP elements as context); surplus absorbed in the last week, shortfall becomes a PR recommendation | Build now | A2 answered 2026-10-28 |
| DRC-5 | A call-off delayed by an LTP drop needs supplier approval; DA adjusted | Build now | — |
| DRC-6 | Lead time per material, broken down by step | Build now | — |
| DRC-7 | Safety order (ROP Order) and safety (ROP Fisik) | After module | B1–B4 as [Default] |
| DRC-8 | Supplier confirms Incoming DA + current feedstock, with a date: daily on a pull agreement, else weekly | Build now | E1, E2 answered 2026-10-28 |
| DRC-9a | Strategic buffer = LTP − baseline | After module | C4 as [Default] |
| DRC-9b | Production limit | Build now | E3 as [Default] |
| DRC-9c | Protection buffer | Built, proposal (merged 2026-10-20) | Built as a proposal, awaiting owner review: protection buffer = CEILING(max(0, LTP − average LTP of the 3 previous months), production MPQ), levels 5 to 7 only, display only; switch `protectionUplift` |
| DRC-10 | System-calculated ROPs and Max, per the material's level | After module | B5–B9 as [Default]; DRC-D11 |
| DRC-11 | CV per variant, SKU and component on 6 monthly buckets; stable/fluctuative | After module | C1 answered 2026-10-28 |
| DRC-12a | NPD tag and ROP review after first order | After module | D1 as [Default] |
| DRC-12b | NPD vs CMM and material-code rules | Hold | D2, MDM |
| DRC-13 | Call-off trigger at ROP Fisik on eWM SOH; quantity = the supplier's minimum delivery rounded like Max; planner approval; SAP PR recommendation when the umbrella PO runs out; max stock caps call-offs | Build now | F1 as [Default]; F5 answered 2026-10-28; real-time needs the eWM feed |
| DRC-14 | Replenishment cycle f per supplier, default by area | Build now | B6 answered 2026-10-28 |
| DRC-15a | Feedstock reconcile: POs ordered vs call-offs + ASNs requested, daily view | Build now | — |
| DRC-15b | Feedstock reconcile leftover rule and final formula | Built, proposal (merged 2026-10-20) | Built as a proposal, awaiting owner review: switch `leftoverRule` (default flag the liability, not priced, capped at max stock; `showOnly`, `carryToNextPo`). Overrides DRC-15a BR-02 until ruled |
| DRC-17 | What-if sandbox | After module | Scope accepted 2026-10-16 |
| DRC-18 | LTP vs FG demand; consumption moving average | Build now | A11 as [Default] |
| DRC-19 | Automatic OSIP level classification | Built, proposal (merged 2026-10-20) | Built as a proposal, awaiting owner review: the system suggests a level (CV stable 4, fluctuative 3; order-method tags when master data carries them; JIT not suggested without pallet-mix data); the planner confirms it through `t_osiplevel_set` |

DRC-16 (daily FS reconcile) is merged into DRC-15a.

### Requirement detail

**DRC-2 Rolling DA over the lead time**
- BR-01. The horizon is the material's lead time (DRC-6), in weeks, rolling weekly [Owner, 2026-10-16, A3].
- BR-02. DA(w) = LTP(w). Week 1 also carries the safety order (DRC-7) [Default A1; PPT 7].
- BR-03. Remainder(w) = DA(w) − call-off(w). It moves to the last week of the horizon. With the supplier's agreement, recorded on the move, it can go to the first week outside the horizon instead [Owner, 2026-10-16, A8].
- BR-04. Each supplier has a carry-over limit. Its default is the quantity of the last 4 weeks of sales orders [Owner, 2026-10-16, A8; unit is a Default, see A8b].
- BR-05. Additional PO = Σ DA over the horizon − OSPO; OSPO(w) = OSPO(w−1) − call-off of the previous week + the PO placed that week [Default A9; PPT 8, 9; Owner, 2026-10-19]. Only this reading chains the slides' OSPO 35, 30, 25 with their own call-offs (5, 10, 5) and POs (40, 5, 0).
- AC-01. PPT 8 reproduces: W1 PO 40, call-off 5, remainder 5; in week 2, OSPO is 35 and the additional PO is 5.
- AC-02. PPT 9 reproduces: remainders of 5 carried, with OSPO 30 and 25.
- AC-03. PPT 7 reproduces: incoming DA W33 438,768, then 129,248 and 64,624 × 3; total 761,888.
- Replaces CAP-10 BR-01/02/04 (fixed 4-week horizon, CAP-D17) and CAP-11 BR-02/03 (absorbing over weeks 5–8). It reuses the publication store, the consumption store and the page [Code].

**DRC-4 Plan vs execution check**
- BR-01. Over the horizon: gap = Total DA − Total OSPO [Team, 2026-10-28, A2; owner ruling 2026-10-28]. SOH, OSPR and PR are SAP MRP elements, shown as context. The earlier check, Total DA − (SOH + OSPO + OSPR + PR generated) [PPT 7], is kept as the variant `planCheckBasis: 'sohOspoOsprPr'`.
- BR-02. Supply above DA is absorbed in the last week. A shortfall raises a PR recommendation for the planner [Owner, 2026-10-16, A4].
- AC-01. PPT 7, on the `sohOspoOsprPr` variant: Total DA 761,888 = ROP Order 761,888; gap 0; PR generated −645,559. Under the default the same slide shows a gap of Total DA − OSPO 0.

**DRC-6 Lead time breakdown** [XLS Guidance]
- Local: machine queue + production + delivery (ordering material excluded).
- Import: ordering material (1–2 weeks) + queue + production + shipment.
- Imported raw material: order to principal (4 weeks) + queue + production + shipment (6–8 weeks) + delivery.
- The total drives the DA horizon (DRC-2) and ROP Order (DRC-10).

**DRC-7 Safety**
- BR-01. Safety order (ROP Order) = Z × √LT × SD(LTP over the next 13 weeks), rounded up to a multiple of the MPQ [Team, 2026-10-28, B2; owner ruling 2026-10-28]; [Default B4]. Z is per material, default 1.65 [Team, 2026-10-28, B3; owner ruling 2026-10-28]. Switch `sdSource: 'ltp13w' | 'ltp' | 'consumption12w'`: 'ltp' is the SD over the lead-time weeks (the earlier default), 'consumption12w' the sheet variant.
- BR-02. Safety (ROP Fisik) = ceiling(g × min(a, b, c), MPQ), g per material, default 1 day [Team, 2026-10-28, B7; owner ruling 2026-10-28]; [Default B1]. Switch `fisikSafety: 'deck' | 'sheet'`. The sheet variant is Z × √f × SD(consumption) + g × average demand [XLS ROP Fisik Non stc]. The team's ROP Fisik SD (GI 261 over 13 weeks) waits on B1.
- AC-01. PPT 7: LT 5, MPQ 61,224 gives SS 244,896 on the `sdSource: 'ltp'` variant. On the 13-week default the slide's 12 weeks give SD 42,092 and SS 183,672 The fixture stays on the variant [Owner, 2026-10-28, BL-231].

**DRC-10 ROPs and Max** [PPT 11; Owner, 2026-10-16, B10]
- **ROP Order** = c × d + safety order, where c = LTP and d = lead time PO→ETA. Its output is shown as the input to ZPE007 [Default B9]. The hub does not run ZPE007.
- **ROP Fisik** = ceiling(demand × f) × MPQ + safety.
  - Demand for an existing material = min(highest of the last 3 months' consumption, production capacity, LTP).
  - Demand for an NPD material = min(highest LTP over the next 3 months, production capacity) [Default B5].
- **ROP Supplier** = demand × the supplier's bottleneck production lead time, queueing included: the supplier's total physical maximum stock. The lead time is a value per supplier × material with no default [Team, 2026-10-28, B10; owner ruling 2026-10-28].
- **ROP FS** is removed: suppliers cover feedstock from the DA and the POs issued [Team, 2026-10-28, B10; owner ruling 2026-10-28].
- **ROP to principal** follows the XLS "ROP Fisik Non stc" column, as built (unanswered).
- **Max:** local = ceiling(ROP, koli), import = ceiling(ROP, MOQ). Koli = pcs per pallet for "Non stc" materials and pcs per pack size for "stc" materials, which we read as sticker [Default B8; XLS ROP Fisik Non stc / stc].
- **Formula by level** (PPT 11): modal sharing (levels 3–4), fixed order (MDQ), JIT (pallet rounding, at least 1 call-off a day). Level comes from DRC-D11.
- The supplier ROP column on the stock template becomes display only (DRC-D15).

**DRC-13 Call-off trigger**
- BR-01. When SOH reaches ROP Fisik, the hub drafts a call-off on the umbrella PO for the planner to approve. The planner can also request one at any time [Owner, 2026-10-16, F2].
- BR-02. With no umbrella PO balance left, the hub recommends that the planner create a PR in SAP [Owner, 2026-10-16, F2].
- BR-03. A call-off never takes projected stock above max stock [Owner, 2026-10-16, A7]. [Owner, 2026-10-28, BL-230] Exception: when the minimum delivery (BR-06) does not fit under Max it is called off anyway and flagged `ABOVE_MAX`, because Max is ROP Fisik rounded to the same unit, so at the trigger it never fits. Projected stock may then pass Max by up to the call-off quantity (switch `minimumDeliveryAboveMax`; 'wait' keeps A7 literal).
- BR-04. The check runs on every SOH update. Real time follows the eWM refresh rate once the eWM feed exists [Owner, 2026-10-16, F2]. Until then, SOH comes from the hub's stock records.
- BR-05. SOH and ROP Fisik are compared per material, all plants combined [Default F1]. Each SOH record keeps its plant (J6, J2) [DRC-D12].
- BR-06. Quantity per call-off = the supplier's minimum delivery quantity (MDQ = MOQ until the master carries MDQ, [Proposed]), rounded up the way max stock rounds (local koli/pallet, import MOQ). Call-offs follow ROP Fisik, not DDPO [Team, 2026-10-28, F5; owner ruling 2026-10-28]. The earlier fill-to-Max quantity is kept as `quantityRule: 'fillToMax'`.
- BR-07. [Owner, 2026-10-28, BL-232] When a PO line's balance is below the supplier's minimum delivery, the hub still drafts the call-off for the balance, flagged `BELOW_MIN_DELIVERY`; the rest goes to the next-oldest line with balance, and what no line covers is the PR recommendation (BR-02). A remainder on the next line that is below that line's supplier's minimum delivery is flagged too. The draft's panel shows the supplier's minimum delivery and the warning, so the planner checks with the supplier before releasing it. Example: balance 1,200, MDQ 2,000 → a 1,200 call-off, flagged, and a PR recommendation for 800.

**DRC-15a Feedstock reconcile**
- BR-01. Per supplier × material: PO ordered, call-offs requested, ASNs requested, and the remainder, shown daily [Owner, 2026-10-16, F4].
- BR-02. The remainder is shown only. What happens to it is DRC-15b, which is on hold.
- Replaces the "Fixed stock reconcile" page and its outcomes (REQ-E06-04, ENG-D21) [DRC-D14].

**DRC-17 What-if sandbox** (accepted 2026-10-16)
- Editable inputs for one material:
  - **Demand:** LTP per week, uplift.
  - **Lead time and replenishment:** lead time, f.
  - **Safety:** SD, Z, g.
  - **Order and stock sizes:** MPQ, MOQ/koli, max stock.
  - **Position:** SOH, OSPO, feedstock.
  - **Rule switches.**
- Output vs the current plan: DA per week, ROPs, PR need, call-offs, carry-over, projected SOH, first shortage week, weeks above max.
- Horizon: 52 weeks for RM, 24 for PM.
- Save named scenarios and compare up to 3.
- PTI planners only. Analysis only, never pushed to the plan in v1.
- The sandbox also confirms defaults: show the team PPT 7 under each switch and record which result they confirm.

---

## 4. Defaults table

Rule (DRC-D9): when sources conflict, the newest wins, so MoM (14 Oct), then the deck, then the sheet.
**Kind:**
- **Value** = one number in the rules block.
- **Switch** = variants built, one on.
- **Hold** = not built.

| Q | Default | Source | Kind | Alternative kept |
|---|---|---|---|---|
| A1 | Whole safety order in week 1 of DA; at the supplier it stays feedstock-form | [Team, 2026-10-28, A1]; owner ruling 2026-10-28 (confirms PPT 7) | Switch | Spread evenly over the horizon |
| A2 | Plan check = Total DA − Total OSPO (`planCheckBasis: 'totalOspo'`); SOH, OSPR, PR shown as SAP MRP context | [Team, 2026-10-28, A2]; owner ruling 2026-10-28 | Switch | SOH + OSPO + OSPR + PR (PPT 7 arithmetic; PPT 7 runs on it); OSPO + OSPR + PR |
| A6 | "Call Off 86,400" not used (PCEB's call-off history, team to confirm the item) | [Team, 2026-10-28, A6]; owner ruling 2026-10-28 | — | — |
| A8b | Carry-over limit = quantity of the last 4 weeks of sales orders | Owner, 2026-10-16, A8 | Value | Count of carry-overs |
| A9 | Additional PO = Σ DA − OSPO; OSPO counts the new PO (`ospoIncludesNewPo` on, owner 2026-10-19) | PPT 8, 9 | Switch | OSPO without new POs |
| A11 | Moving average over 13 weeks (3 months); LTP term = next 13 weeks' average, GI = highest of the last 13 | [Team, 2026-10-28, A11]; owner ruling 2026-10-28 | Value | — |
| B1 | ROP Fisik safety per deck | PPT 11 | Switch | XLS formula |
| B2 | ROP Order: SD of LTP over 13 weeks (`sdSource: 'ltp13w'`). ROP Fisik's SD (GI 261 over 13 weeks) waits on B1 | [Team, 2026-10-28, B2]; owner ruling 2026-10-28 | Switch | SD of LTP over the lead time (PPT 7 runs on it); SD of 12-week consumption (XLS) |
| B3 | Z per material, default 1.65 (95%); the planner sets it until SAP's service-level master data feeds it | [Team, 2026-10-28, B3]; owner ruling 2026-10-28 | Value per material | — |
| B4 | Round up to a multiple of the MPQ | PPT 7 | Switch | Koli / MOQ |
| B5 | Demand Min includes LTP for levels 1–5; NPD leaves GI 261 out. Level 6 (JIT): HELD (team answers 3.6) | [Team, 2026-10-28, B5]; owner ruling 2026-10-28 (levels 1–5, NPD) | Switch | XLS (without LTP) |
| B6 | f per supplier, editable; default by area 1 day (Jabodetabek) / 2 days (outside) / 7 days (import) | [Team, 2026-10-28, B6]; owner ruling 2026-10-28 | Value per supplier | — |
| B7 | g per material, default 1 day; owners Logistics Operations (ROP Fisik), Supply Sustainability (ROP Order). The hub applies g in ROP Fisik only: whether ROP Order reads g is open (team answers 4, Q3) | [Team, 2026-10-28, B7]; owner ruling 2026-10-28 | Value per material | — |
| B8 | Max per deck; koli per pallet ("Non stc") or pack size ("stc", read as sticker) | PPT 11; XLS | Switch | XLS Guidance (ROP + cycle stock) |
| B9 | ROP Order = cycle stock + safety order | PPT 7 | — | — |
| B10 | ROP Supplier = demand × the supplier's bottleneck production lead time, queueing included (per supplier × material, no default: "not available" until set). ROP FS removed. ROP to principal stays as built (unanswered) | [Team, 2026-10-28, B10]; owner ruling 2026-10-28 | Value per supplier × material | — |
| C1 | CV on 6 monthly buckets (full calendar months, weeks spread by day), set by the FG-variant CV ("CV Comp FG Var"); threshold 0.5 final | [Team, 2026-10-28, C1]; owner ruling 2026-10-28 | Switch | Weekly buckets over 26 weeks |
| C2 | Level is a field per material, default level 4 (warehouse replenishment) | XLS Guidance: levels 3–4 hold 6,751 of 9,210 pallets (73%) | Value | Automatic classification (DRC-19, hold) |
| C3 | Protection buffer not built | — | Hold | — |
| C4 | Strategic buffer = LTP − average of the 3 months before festive (no rounding stated) | PPT 12 | Value | — |
| D1 | NPD until first order fulfilled | MoM 4C; [Team, 2026-10-28, D1]; owner ruling 2026-10-28 | Switch | 1 year after launch (XLS); 52 weeks (engine) |
| D2 | NPD vs CMM not built | — | Hold | — |
| E1 | LT spare 0, so feedstock target = 0; the next model defines no feedstock ROP | [Team, 2026-10-28, E1]; owner ruling 2026-10-28 | Value | — |
| E2 | A supplier on a pull agreement (flag per supplier, default no) confirms daily; any other weekly with the Thursday stock update (the DA send). What follows a missed confirmation is open (team answers 4, Q7) | [Team, 2026-10-28, E2]; owner ruling 2026-10-28 | Switch | Weekly for every supplier |
| E3 | Production limit = supplier's allocated capacity per planning group | MR-8 (built) | Switch | SADR feed |
| F1 | SOH combined across plants; plant stored | — | Switch | Per plant |
| F5 | Call-off quantity = the supplier's minimum delivery quantity (MDQ = MOQ, [Proposed]) rounded like Max; call-offs follow ROP Fisik, not DDPO. The ≤ 6 MPQ rate stays in the level suggestion only. When that quantity does not fit under Max it is called off anyway, flagged [Owner, 2026-10-28, BL-230] | [Team, 2026-10-28, F5]; owner ruling 2026-10-28 | Switch | Fill up to Max rounded to the MPQ; 'wait' (Max caps it) |

Each row carries its question ID into the code comment and the "Provisional" label, so answering a question means changing one key and the golden fixtures.

**2026-10-28 (team answers, owner ruling).** The rows marked [Team, 2026-10-28, Qn] are built in `RULES_VERSION` `osip-2026-10-28.1`. The "Provisional" label left A1, A2, A6, A11, B2, B3, B5 (levels 1–5, NPD), B6, B7, C1, D1, E1, E2 and F5 (call-off); it stays on A8b, A9, B1, B4, B8, B9, B10 (ROP to principal), C2, C3, C4 and level 6 (B5, F5 marker). Z, g, f, the pull agreement and the bottleneck lead time are set by the Material Planner (`t_osipparam_set`) on the Safety stock targets page. PPT 7 reproduces on the kept variants `sdSource: 'ltp'` and `planCheckBasis: 'sohOspoOsprPr'`; PPT 8 and 9 reproduce under the defaults.

---

## 5. Backlog

**New rows** (sizes: S a day, M a few days, L a week or more)

| BL | Item | Size | Blocked by | Links |
|---|---|---|---|---|
| BL-187 | Calculation module and rules block, with stamped figures and golden fixtures PPT 7–9 | L | — | Design rules 1–4 |
| BL-188 | Rolling DA over the lead time, with carry-over (rework of BL-179/180) | L | BL-187 | DRC-2 |
| BL-189 | DA history and audit view | M | BL-188 | DRC-3 |
| BL-190 | Plan vs execution check | M | BL-187 | DRC-4 |
| BL-191 | Supplier approval for a delayed call-off | M | BL-188 | DRC-5 |
| BL-192 | Lead time per material by step | M | — | DRC-6 |
| BL-193 | Safety order and ROP Fisik safety | M | BL-187 | DRC-7 |
| BL-194 | Supplier confirmation of Incoming DA + feedstock | M | BL-188 | DRC-8 |
| BL-195 | Strategic buffer and production limit | M | BL-187 | DRC-9a, 9b |
| BL-196 | System ROPs and Max per level | L | BL-187, BL-193 | DRC-10 |
| BL-197 | CV per variant, SKU and component | M | BL-187 | DRC-11 |
| BL-198 | NPD tag and ROP review | S | BL-196 | DRC-12a |
| BL-199 | Call-off trigger at ROP Fisik with planner approval | L | BL-196 | DRC-13 |
| BL-200 | Replenishment cycle f by area | S | — | DRC-14 |
| BL-201 | Feedstock reconcile (replaces fixed stock reconcile) | M | — | DRC-15a |
| BL-202 | What-if sandbox | L | BL-187, BL-196 | DRC-17 |
| BL-203 | LTP vs FG demand and moving average | S | — | DRC-18 |
| BL-204 | Merged 2026-10-20 (MR !13), awaiting owner review: supplier view of DA | M | Material Planning: A1, A2, B1–B4 | DRC-1 |
| BL-205 | Merged 2026-10-20 (MR !12), awaiting owner review: protection buffer | ? | C3 | DRC-9c |
| BL-206 | On hold: NPD vs CMM rules | ? | MDM: D2 | DRC-12b |
| BL-207 | Merged 2026-10-20 (MR !11), awaiting owner review: feedstock reconcile leftover rule | ? | Owner | DRC-15b |
| BL-208 | Merged 2026-10-20 (MR !10), awaiting owner review: automatic OSIP level classification | L | C2, F5 | DRC-19 |
| BL-209 | Golden fixture from Ary's spike case (moves from CAP-D16) | S | Ary | CAP-D16 |

**Changes to existing rows and docs**
- **BL-179, BL-180** (built, closed): reopened and superseded by BL-188. CAP-D12, D13 and D17 are marked superseded by DRC-2.
- **BL-181** (CAP-12 open supply and gap): kept. Its gap now reads against the rolling DA.
- **BL-119** (ENG-D22): records the OSIP DA rule as the team's process.
- **BL-136** (max-stock history on the fixed stock reconcile page): moves to the feedstock reconcile page.
- **REQ-E06-04:** renamed "Feedstock reconcile" and rewritten by DRC-15a.
- **REQ-E08-02 BR-06 / MAT-D4:** the supplier ROP column becomes display only.
- **REQ-E14-04** (engine fill-rate safety stock): kept as a challenger behind a switch. It is not the default.

---

## 6. Decisions

**Settled by the owner's answers (2026-10-16), accepted 2026-10-19**

| ID | Decision | Outcome |
|---|---|---|
| DRC-D1 | What is frozen | Horizon = lead time, rolling weekly; carry-over to the last week by default |
| DRC-D4 | Where supplier ROP comes from | Calculated by the system |
| DRC-D6 | Call-off release | Hub drafts at ROP Fisik; planner approves; SAP PR recommendation |

**Settled by the defaults table (section 4)**
- DRC-D2 (DA formula): A1, A2, A9.
- DRC-D3 (safety method): B1–B4. The engine method stays as a switch.
- DRC-D5 (NPD): D1.
- DRC-D7 (reconcile): DRC-15a built, 15b on hold.

**New, accepted 2026-10-19**

| ID | Question | Recommendation |
|---|---|---|
| DRC-D8 | Build before the material team confirms? | Yes, on documented defaults (accepted 2026-10-19) |
| DRC-D9 | Which source wins a conflict? | Newest: MoM, then deck, then sheet |
| DRC-D10 | Show suppliers DA before the formulas are confirmed? | No. Hold DRC-1 (BL-204) |
| DRC-D11 | How is the level set before automatic classification? | A field per material, default level 4, editable by the planner |
| DRC-D12 | Per plant or combined? | Compare combined, store the plant on every SOH record |
| DRC-D13 | Built demand anticipation (BL-179/180) | Reopen; rework under BL-188, reusing the store, page and consumption record |
| DRC-D14 | "Fixed stock reconcile" page | Rename and rework as feedstock reconcile |
| DRC-D15 | Supplier ROP column on the stock template | Display only |
| DRC-D16 | Audit of past figures after a rule changes | Each figure keeps its inputs and rules version; recalculate forward only |
| DRC-D17 | Supplier confirmation before suppliers see DA (DRC-8, BL-194) | Accepted 2026-10-19: suppliers confirm their current feedstock with a confirmation date; confirming Incoming DA waits for BL-204 (DRC-D10) |
| DRC-D18 | Access to the DA history (DRC-3, BL-189) | Accepted 2026-10-19: no role gate, as `CLAUDE.md` §65 holds for every page; planners find it under Review, Procurement and Finance under Audit; a supplier reads nothing |
| DRC-D19 | NPD default on sample data (DRC-12a) | Accepted 2026-10-19: keep "until first order fulfilled" (D1); the page notes that sample PO history is partial, so most sample materials read as NPD |
| DRC-D20 | Supplier-below-ROP alert after DRC-D15 (REQ-E08-05) | Accepted 2026-10-19: the alert compares supplier stock with the system ROP Supplier; it does not fire where that figure is not available |
| DRC-D21 | One consumption split per supplier (BL-211) | Accepted 2026-10-19: every page splits a material's recorded consumption across its suppliers by LTP share over the share window (CAP-D11); `consumptionSplit` defaults to `'ltpShare'`, with the DA-share (CAP-D14) and even splits kept as variants |

---

## 6a. Build decisions, wave 1 (2026-10-19)

Readings the builders made where the sources leave a gap. Each sits behind a rules key or a single function, so a Material Planning answer changes one place. Code: `src/services/transitions/osipRules.js` (`OSIP_RULES`, `RULES_VERSION`).

| ID | Item | Decision |
|---|---|---|
| DRC-B1 | OSPO chain (DRC-2 BR-05) | `ospoIncludesNewPo` on: OSPO(w) = OSPO(w−1) − call-off + last week's new PO [Owner, 2026-10-19] |
| DRC-B2 | Safety order SD (DRC-7 BR-01) | Sample standard deviation (n−1). PPT 7 rounds to the same 244,896 either way |
| DRC-B3 | ROP Fisik cycle part (DRC-10) | Read as CEILING(demand × f, MPQ), the same form as the safety term; the literal "× MPQ" would multiply twice |
| DRC-B4 | ROP Fisik units (DRC-10) | Demand inputs are daily rates, because f and g are in days |
| DRC-B5 | Levels 5 and 6 (DRC-10) | Level 5 = CEILING(demand × f, MDQ) + safety; level 6 (JIT) = CEILING(c × d, pallet), no safety; any other level uses level 4 and is flagged. The deck gives no full formula |
| DRC-B6 | Carry-over (DRC-2 BR-03, BR-04) | A carry is capped at the carry-over limit; the excess is returned as "uncarried". "First week outside" without the supplier's agreement falls back to the last week, flagged |
| DRC-B7 | Plan check (DRC-4) | Surplus comes off the last week's DA, never below 0; what is left is returned as "unabsorbed" |
| DRC-B8 | Supply area (DRC-14, BL-200) | From the supplier's country and city: not Indonesia = import; Jakarta, Bogor, Depok, Tangerang, Bekasi, Cikarang = Jabodetabek; Karawang and an Indonesian supplier without a city = outside Jabodetabek |
| DRC-B9 | Lead-time route (DRC-6) | Indonesian supplier = local; foreign = import; foreign with SAP type ROH = imported raw material. Sample step splits keep each source's existing total, so sample imported raw materials (30 days) sit below the XLS ranges |
| DRC-B10 | FG demand (DRC-18) | The engine's gross requirement (FG plan and sales orders through the BOM), split by the supplier's LTP share. On sample data it is not calibrated against the LTP fixtures |
| DRC-B11 | Moving average (DRC-18) | 13 weeks ending at each grid week, capped at the current hub week; weeks with no record are left out, not counted as 0 |
| DRC-B12 | Feedstock reconcile rows (DRC-15a) | A row for every supplier × material with a PO line or a released call-off. No blanket-PO flag exists, so direct POs show their full quantity as "not yet called off" |
| DRC-B13 | Feedstock reconcile quantities (DRC-15a) | PO ordered excludes rejected POs; value-only PO lines add no quantity (noted). Called off = requested quantity on released call-offs. ASN requested counts Submitted, In Transit, Delivered and Discrepancy |
| DRC-B14 | Fixed stock cycle setting (REQ-E06-04 BR-01) | Kept in Administration, marked "not in use"; no page reads it |

## 6b. Build decisions, wave 2 (2026-10-19)

| ID | Item | Decision |
|---|---|---|
| DRC-B15 | MPQ (DRC-2, DRC-7) | MPQ = `MaterialSource.orderMultiple` until the master data feed carries MPQ |
| DRC-B16 | Carry-over limit (DRC-2 BR-04, A8b) | Not applied: sales orders are per FG SKU, so the hub has no quantity per supplier × material. Each figure is flagged; the limit path is built and tested |
| DRC-B17 | OSPR (DRC-4) | Counts 0, flagged: the hub's purchase requisitions carry no material code |
| DRC-B18 | OSPO start (DRC-2 BR-05) | Chains from the previous planning week's publication; with none, starts from the open PO not yet called off (blanket balance), flagged |
| DRC-B19 | PR in the plan check (DRC-4) | The PR ZPE007 would generate, max(0, −PR generated), as in the PPT 7 fixture |
| DRC-B20 | No lead time (DRC-2 BR-01) | A pair without a lead time uses a 4-week horizon, flagged |
| DRC-B21 | Publishing (DRC-2, CAP-D13) | One verb records the week's figures and the supplier's agreement to carry outside the horizon (`agreedFirstOutside`, that planning week only). Re-publishing in the same week appends a record that supersedes the earlier one; an identical one is refused. CAP-D13's "once only" is dropped |
| DRC-B22 | Own remainder (DRC-2 BR-03) | A remainder made this planning week shows as "carried to Wxx" and enters the figures from the next planning week, as PPT 8 week 2 reads |
| DRC-B23 | Surplus alert (DRC-4 BR-02) | `demandAnticipationUnabsorbed` now fires on a surplus the last week cannot take (replaces the CAP-11 weeks 5 to 8 alert) |
| DRC-B24 | ROP Fisik safety inputs (DRC-7 BR-02) | Production capacity is left out of the min (no PTI figure); "highest consumption of 3 months" = highest recorded week of the last 13 ÷ 7; the LTP term = mean weekly LTP over the lead time ÷ 7 |
| DRC-B25 | Consumption per supplier (DRC-7, DRC-18) | Split by the supplier's LTP share over the share window (CAP-D11) on every page, the Demand anticipation grid included (DRC-D21, BL-211) |
| DRC-B26 | CV (DRC-11) | Historical weekly sell-in before now, stock-outs filled as the engine fills them; since 2026-10-28 summed into the last 6 full calendar months (each week spread over its 7 days) [Team C1]; each SKU is its own variant (no variant grouping in the data) |
| DRC-B27 | Production limit (DRC-9b) | The existing "Allocated" row on PTI Capacity is the production limit, relabelled and marked Provisional |
| DRC-B28 | Strategic buffer (DRC-9a) | Festive window = the months from the first day of Ramadan to Lebaran (event calendar); CNY is not in the calendar and is not shown; an incomplete baseline shows "—" |

## 6c. Build decisions, wave 3 (2026-10-19)

| ID | Item | Decision |
|---|---|---|
| DRC-B29 | Level field (DRC-D11) | `t_osiplevel_set`, atom `osiplevel:set` in the planning lane; levels 1 to 6; levels 1 and 2 use the level-4 formula, flagged; confirming a level closes the NPD review task |
| DRC-B30 | Level 5 and 6 inputs (DRC-10) | Level 5: MDQ = MOQ [Default]. Level 6: c = daily LTP, d = 1 day, rounded to a pallet |
| DRC-B31 | Supplier-side ROPs (DRC-10, B10) | CEILING(ROP Fisik daily demand × the days of one lead-time leg, MPQ), no safety: ROP Supplier = queue + production, ROP FS = ordering material, ROP to principal = order to principal; a leg the route lacks reads "Not available" |
| DRC-B32 | NPD "first order fulfilled" (DRC-12a) | Accepted goods-receipt quantity reaches the first non-rejected PO's quantity; a value-only line counts when the PO is Delivered or Closed. Transition products are not told apart (no flag in the data) |
| DRC-B33 | NPD review task (DRC-12a) | Raised once when the tag drops from NPD; a material seen for the first time only sets a baseline |
| DRC-B34 | Call-off trigger run (DRC-13 BR-04) | Runs on PTI SOH updates through the eWM refresh seam (`applyPtiStockRefresh`); the seeded stock is not an update. No screen records PTI SOH, so in the demo the trigger fires only through the seam |
| DRC-B35 | Trigger quantity (DRC-13 BR-01b, A7) | Max − (SOH + released not yet received), stepped down to the largest whole MPQ that fits under PTI's Max (DRC-10); room below one MPQ drafts nothing |
| DRC-B36 | Trigger line choice (DRC-13 BR-01a) | Oldest blanket line with balance across every supplier of the material; the remainder goes to the next line, then a PR recommendation |
| DRC-B37 | One open draft (DRC-13 BR-01) | Any draft of the material, the planner's own included, blocks a new one; a released or dismissed hub draft re-arms only after SOH is seen above ROP Fisik |
| DRC-B38 | Trigger draft path (DRC-13) | The hub creates the draft directly (`origin: 'ropFisik'`), with its figures and rules version stored; release is gated by the planner only. X-03 (engine drafts withheld until the engine is live) does not apply to these drafts [Owner, 2026-10-19] |
| DRC-B39 | Plant (DRC-D12) | PTI SOH records carry a plant (sample J6 for raw material, J2 for packaging); comparison is combined |
| DRC-B40 | Delayed call-off (DRC-5) | Reason code "LTP dropped" (new reason list `callOffChange`); the supplier answers through the existing confirmation; reject keeps the call-off on its old date; DA moves only after approval |
| DRC-B41 | Feedstock confirmation (DRC-8, DRC-D17) | `t_feedstock_confirm`, atom `feedstock:confirm` in the supplier fulfilment lane; shown on PTI Inventory; "Missed" only after a first confirmation; not in the MR-2 compliance score; no planner review marker |

## 6d. Build decisions, what-if sandbox (2026-10-19)

| ID | Item | Decision |
|---|---|---|
| DRC-B42 | Projection (DRC-17) | The sandbox runs its own day-by-day loop over the live functions: each week's LTP spread over 7 days; each day the trigger checks SOH against ROP Fisik; a call-off fills to Max from the OSPO balance, counts as approved and arrives f days later; what no balance covers is a PR recommendation; a shortage week is one where stock runs out on any day |
| DRC-B43 | Scope of the trigger (DRC-17) | Per selected supplier × material, where the live trigger sums ROP Fisik and Max across a material's suppliers |
| DRC-B44 | Festive uplift input (DRC-17) | A percentage added to the LTP of weeks in a Ramadan-to-Lebaran month (DRC-9a calendar); default 0 |
| DRC-B45 | RM or PM horizon (DRC-17) | SAP material type VERP = packaging (24 weeks), anything else = raw material (52 weeks) |
| DRC-B46 | Saving (DRC-17) | `t_whatifscenario_save`, atom `whatifscenario:save` in the planning lane, append-only, stamped with `RULES_VERSION`; no page role gate (§65, DRC-D18) |
| DRC-B47 | PPT 7 preset (DRC-17) | Offered as its own pair so a confirmed result can be saved; runs on the hub's Mondays; ROP Fisik, Max and the trigger read "Not available" because the slide gives no consumption or supply area |
| DRC-B48 | Inputs that feed no figure (DRC-17) | Listed on the page with the reason: feedstock (E1), CV threshold and window (CV not shown), carry-over target and limit, the production-limit source. Since BL-210, SD can be typed (it replaces the computed SD in the safety order) and the consumption window moves ROP Fisik |

## 6e. Build decisions, the team's answers (2026-10-28)

Built on branch `feat/drc-material-answers` from the owner's ruling on SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10 section 3. Rows marked **[Owner, 2026-10-28]** are the [Proposed] answers the owner accepted before the build; the others are build calls for the owner to overrule.

| ID | Item | Decision |
|---|---|---|
| DRC-B49 | Where the per-material and per-supplier values live | One planner ledger, `t_osipparam_set` (entity `osipParam`, atom `osipparam:set` in the planning lane), keyed `z|<material>`, `g|<material>`, `f|<supplier>`, `pullAgreement|<supplier>`, `bottleneckLeadTimeDays|<supplier>|<material>`; null resets to the default. Edited in the Safety stock targets detail panel. The team named Logistics Operations and Supply Sustainability as owners of g and the DA; the hub has no role for either, so the Material Planner holds the verb |
| DRC-B50 | g in ROP Order (B7) | **[Owner, 2026-10-28]** g is per material and both owners are recorded, but the hub applies it where it did before (ROP Fisik). Whether ROP Order reads g stays open (team answers 4, Q3) |
| DRC-B51 | Bottleneck lead time (B10) | **[Owner, 2026-10-28]** A supplier × material value in days, no default; ROP Supplier reads "not available" until it is set. ROP Supplier keeps the MPQ rounding the earlier reading used. Consequence: the supplier-below-ROP alert (REQ-E08-05) stays quiet until a planner sets it |
| DRC-B52 | Monthly CV buckets (C1) | **[Owner, 2026-10-28]** Calendar months by day (each week's demand spread over its 7 days), the last 6 FULL months; a SKU with fewer has no CV. Measured on the sample data: every material reads stable (highest CV 0.41), so no sample material is suggested level 3 any more |
| DRC-B53 | Pull-agreement cadence (E2) | **[Owner, 2026-10-28]** Flag per supplier, default no. Daily = each hub calendar day, midnight to midnight WIB (working days are not distinguished). Others weekly with the Thursday stock update. A missed confirmation is shown as missed; nothing else follows (team answers 4, Q7) |
| DRC-B54 | Call-off quantity (F5) | **[Owner, 2026-10-28]** MDQ = MOQ, rounded with `maxRoundingUnit` (the max-stock rule). A line with no MOQ falls back to the earlier fill-to-Max quantity, flagged `NO_MDQ`. With no line at all the PR is the room below Max, as before |
| DRC-B55 | Minimum delivery above Max (F5 vs A7) | **[Owner, 2026-10-28, BL-230]** keep 'callOff'. Max = ROP Fisik rounded up to the same unit, so the room under Max at the trigger is always below one unit. Default 'callOff': the minimum delivery is called off anyway, flagged `ABOVE_MAX`. 'wait' keeps A7 literal: on the sample, RM-STEAR-7300 (MOQ 1,250, pallet 700) calls off 1,400 at SOH 1,010 under 'callOff'; under 'wait' the what-if hand material only calls off when stock is at 0 and runs short in week 2 |
| DRC-B56 | PPT 7 golden fixture (A2, B2) | **[Owner, 2026-10-28, BL-231]** Kept on the variants `sdSource: 'ltp'` and `planCheckBasis: 'sohOspoOsprPr'`; the what-if sandbox opens the PPT 7 case on them. Under the defaults the slide gives SS 183,672 and a gap of Total DA |
| DRC-B57 | The what-if sandbox and own values | A live pair opens on its material's own Z and g (as switches) and its supplier's own f and bottleneck lead time (as inputs) |
| DRC-B58 | PO line balance below the minimum delivery (BL-232) | **[Owner, 2026-10-28, BL-232]** Call off the balance, flag `BELOW_MIN_DELIVERY` per draft, keep the PR for the rest. Options not taken: no flag (as first built), or no call-off and a PR for the whole minimum delivery. A cut by Max under `minimumDeliveryAboveMax: 'wait'` is A7's reading and is not flagged. The panel also shows BL-230's `ABOVE_MAX`, which was stored but not shown. Quantities and formulas are unchanged, so `RULES_VERSION` stays `osip-2026-10-28.1` |

## 7. Build order

1. **Wave 1, in parallel:**
   - BL-187 calculation module.
   - BL-192 lead time.
   - BL-200 replenishment cycle.
   - BL-201 feedstock reconcile.
   - BL-203 moving average.
2. **Wave 2, needs BL-187:** BL-188 rolling DA, BL-190 check, BL-193 safety, BL-195 buffers, BL-197 CV.
3. **Wave 3:**
   - BL-196 ROPs and Max.
   - Then BL-198 NPD and BL-199 call-off trigger.
   - BL-189, BL-191, BL-194 on the rolling DA.
4. **Wave 4:** BL-202 sandbox, then a confirmation session with the material team (PPT 7 under each switch).
5. **Held** until answers: BL-204 to BL-209.

---

