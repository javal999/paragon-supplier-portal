# SC Hub DA, ROP and call-off requirements: rolling demand anticipation, OSIP reorder points, call-off trigger, feedstock reconcile, what-if sandbox

| Field | Value |
|---|---|
| Status | **Accepted 2026-10-19.** The owner approved every requirement, default, backlog row and decision in this file ("approve all", 2026-10-19). Wave 1 (BL-187, BL-192, BL-200, BL-201, BL-203) is built in GitLab MR !4 and wave 2 (BL-188, BL-190, BL-193, BL-195, BL-197) in MR !5, 2026-10-19; build decisions in sections 6a and 6b. Values tagged [Default] are starting values until the Material Planning team confirms them (section 4) |
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
| DRC-1 | Suppliers see their own DA, read only | Hold | DRC-D10: the safety and DA rules (A1, A2, B1–B4) |
| DRC-2 | Rolling DA over the lead time, with carry-over | Build now | A1, A9 as [Default] |
| DRC-3 | Full DA history with carry-over origin; audit view for Procurement and Finance | Build now | — |
| DRC-4 | Plan vs execution check: Total DA = ROP Order = SOH + OSPO + OSPR + PR; surplus absorbed in the last week, shortfall becomes a PR recommendation | Build now | A2 as [Default] |
| DRC-5 | A call-off delayed by an LTP drop needs supplier approval; DA adjusted | Build now | — |
| DRC-6 | Lead time per material, broken down by step | Build now | — |
| DRC-7 | Safety order (ROP Order) and safety (ROP Fisik) | After module | B1–B4 as [Default] |
| DRC-8 | Supplier confirms Incoming DA + current feedstock, with a date | Build now | E1, E2 as [Default] |
| DRC-9a | Strategic buffer = LTP − baseline | After module | C4 as [Default] |
| DRC-9b | Production limit | Build now | E3 as [Default] |
| DRC-9c | Protection buffer | Hold | C3: uplift for non-festive materials unknown |
| DRC-10 | System-calculated ROPs and Max, per the material's level | After module | B5–B9 as [Default]; DRC-D11 |
| DRC-11 | CV per variant, SKU and component; stable/fluctuative | After module | C1 as [Default] |
| DRC-12a | NPD tag and ROP review after first order | After module | D1 as [Default] |
| DRC-12b | NPD vs CMM and material-code rules | Hold | D2, MDM |
| DRC-13 | Call-off trigger at ROP Fisik on eWM SOH; planner approval; SAP PR recommendation when the umbrella PO runs out; max stock caps call-offs | Build now | F1 as [Default]; real-time needs the eWM feed |
| DRC-14 | Replenishment cycle f by area | Build now | B6 as [Default] |
| DRC-15a | Feedstock reconcile: POs ordered vs call-offs + ASNs requested, daily view | Build now | — |
| DRC-15b | Feedstock reconcile leftover rule and final formula | Hold | Owner: "discussed later" |
| DRC-17 | What-if sandbox | After module | Scope accepted 2026-10-16 |
| DRC-18 | LTP vs FG demand; consumption moving average | Build now | A11 as [Default] |
| DRC-19 | Automatic OSIP level classification | Hold | C2, F5; the level field exists from DRC-D11 |

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
- BR-01. Over the horizon: gap = Total DA − (SOH + OSPO + OSPR + PR generated) [Default A2; PPT 7].
- BR-02. Supply above DA is absorbed in the last week. A shortfall raises a PR recommendation for the planner [Owner, 2026-10-16, A4].
- AC-01. PPT 7: Total DA 761,888 = ROP Order 761,888; gap 0; PR generated −645,559.

**DRC-6 Lead time breakdown** [XLS Guidance]
- Local: machine queue + production + delivery (ordering material excluded).
- Import: ordering material (1–2 weeks) + queue + production + shipment.
- Imported raw material: order to principal (4 weeks) + queue + production + shipment (6–8 weeks) + delivery.
- The total drives the DA horizon (DRC-2) and ROP Order (DRC-10).

**DRC-7 Safety**
- BR-01. Safety order (ROP Order) = 1.65 × √LT × SD(LTP over the horizon), rounded up to a multiple of the MPQ [Default B1–B4; MoM 2A; PPT 11]. Switch `sdSource: 'ltp' | 'consumption12w'` (sheet variant) [B2].
- BR-02. Safety (ROP Fisik) = ceiling(g × min(a, b, c), MPQ) with g = 1 day [Default B1, B7; PPT 11]. Switch `fisikSafety: 'deck' | 'sheet'`. The sheet variant is Z × √f × SD(consumption) + g × average demand [XLS ROP Fisik Non stc].
- AC-01. PPT 7: LT 5, MPQ 61,224 gives SS 244,896.

**DRC-10 ROPs and Max** [PPT 11; Owner, 2026-10-16, B10]
- **ROP Order** = c × d + safety order, where c = LTP and d = lead time PO→ETA. Its output is shown as the input to ZPE007 [Default B9]. The hub does not run ZPE007.
- **ROP Fisik** = ceiling(demand × f) × MPQ + safety.
  - Demand for an existing material = min(highest of the last 3 months' consumption, production capacity, LTP).
  - Demand for an NPD material = min(highest LTP over the next 3 months, production capacity) [Default B5].
- **ROP Supplier, ROP FS and ROP to principal** follow the XLS "ROP Fisik Non stc" columns.
- **Max:** local = ceiling(ROP, koli), import = ceiling(ROP, MOQ). Koli = pcs per pallet for "Non stc" materials and pcs per pack size for "stc" materials, which we read as sticker [Default B8; XLS ROP Fisik Non stc / stc].
- **Formula by level** (PPT 11): modal sharing (levels 3–4), fixed order (MDQ), JIT (pallet rounding, at least 1 call-off a day). Level comes from DRC-D11.
- The supplier ROP column on the stock template becomes display only (DRC-D15).

**DRC-13 Call-off trigger**
- BR-01. When SOH reaches ROP Fisik, the hub drafts a call-off on the umbrella PO for the planner to approve. The planner can also request one at any time [Owner, 2026-10-16, F2].
- BR-02. With no umbrella PO balance left, the hub recommends that the planner create a PR in SAP [Owner, 2026-10-16, F2].
- BR-03. A call-off never takes projected stock above max stock [Owner, 2026-10-16, A7].
- BR-04. The check runs on every SOH update. Real time follows the eWM refresh rate once the eWM feed exists [Owner, 2026-10-16, F2]. Until then, SOH comes from the hub's stock records.
- BR-05. SOH and ROP Fisik are compared per material, all plants combined [Default F1]. Each SOH record keeps its plant (J6, J2) [DRC-D12].

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
| A1 | Whole safety order in week 1 of DA | PPT 7 | Switch | Spread evenly over the horizon |
| A2 | The check includes SOH | PPT 7 arithmetic | Switch | MoM wording (OSPO + PR only) |
| A6 | "Call Off 86,400" not used | PPT 7 (feeds no figure) | — | — |
| A8b | Carry-over limit = quantity of the last 4 weeks of sales orders | Owner, 2026-10-16, A8 | Value | Count of carry-overs |
| A9 | Additional PO = Σ DA − OSPO; OSPO counts the new PO (`ospoIncludesNewPo` on, owner 2026-10-19) | PPT 8, 9 | Switch | OSPO without new POs |
| A11 | Moving average over 13 weeks (3 months) | XLS ROP Fisik Non stc | Value | — |
| B1 | ROP Fisik safety per deck | PPT 11 | Switch | XLS formula |
| B2 | SD of LTP over the horizon | MoM 2A, PPT 11 | Switch | SD of 12-week consumption (XLS) |
| B3 | Z = 1.65 for every material | MoM 2A | Value | Per level or category |
| B4 | Round up to a multiple of the MPQ | PPT 7 | Switch | Koli / MOQ |
| B5 | Demand Min includes LTP | PPT 11 | Switch | XLS (without LTP) |
| B6 | 1 day / 2 days / 1 week is replenishment cycle f | PPT 11 | Value | — |
| B7 | g = 1 day | PPT 11 | Value | Per level |
| B8 | Max per deck; koli per pallet ("Non stc") or pack size ("stc", read as sticker) | PPT 11; XLS | Switch | XLS Guidance (ROP + cycle stock) |
| B9 | ROP Order = cycle stock + safety order | PPT 7 | — | — |
| C1 | CV on weekly buckets over 26 weeks; threshold 0.5 | MoM 4B; XLS Logics | Value | Monthly buckets |
| C2 | Level is a field per material, default level 4 (warehouse replenishment) | XLS Guidance: levels 3–4 hold 6,751 of 9,210 pallets (73%) | Value | Automatic classification (DRC-19, hold) |
| C3 | Protection buffer not built | — | Hold | — |
| C4 | Strategic buffer = LTP − average of the 3 months before festive (no rounding stated) | PPT 12 | Value | — |
| D1 | NPD until first order fulfilled | MoM 4C (newest) | Switch | 1 year after launch (XLS); 52 weeks (engine) |
| D2 | NPD vs CMM not built | — | Hold | — |
| E1 | LT spare = a value per material, default 0 (feedstock = 0) | XLS Guidance | Value | — |
| E2 | Supplier confirms weekly with the Thursday stock update; the planner approves | MR-1 cycle (built) | Value | — |
| E3 | Production limit = supplier's allocated capacity per planning group | MR-8 (built) | Switch | SADR feed |
| F1 | SOH combined across plants; plant stored | — | Switch | Per plant |
| F5 | Continuous if MPQ rate ≤ 6, batching above | XLS Logics | Value | — |

Each row carries its question ID into the code comment and the "Provisional" label, so answering a question means changing one key and the golden fixtures.

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
| BL-204 | On hold: supplier view of DA | M | Material Planning: A1, A2, B1–B4 | DRC-1 |
| BL-205 | On hold: protection buffer | ? | C3 | DRC-9c |
| BL-206 | On hold: NPD vs CMM rules | ? | MDM: D2 | DRC-12b |
| BL-207 | On hold: feedstock reconcile leftover rule | ? | Owner | DRC-15b |
| BL-208 | On hold: automatic OSIP level classification | L | C2, F5 | DRC-19 |
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
| DRC-B25 | Consumption per supplier (DRC-7, DRC-18) | The OSIP safety figures and the DRC-18 rows split a material's consumption by the supplier's LTP share over the share window (CAP-D11). The recorded-consumption grid on Demand anticipation keeps CAP-D14's split by each supplier's share of that week's demand anticipation. Aligning the two is open |
| DRC-B26 | CV (DRC-11) | Historical weekly sell-in for the 26 weeks before now, stock-outs filled as the engine fills them; each SKU is its own variant (no variant grouping in the data) |
| DRC-B27 | Production limit (DRC-9b) | The existing "Allocated" row on PTI Capacity is the production limit, relabelled and marked Provisional |
| DRC-B28 | Strategic buffer (DRC-9a) | Festive window = the months from the first day of Ramadan to Lebaran (event calendar); CNY is not in the calendar and is not shown; an incomplete baseline shows "—" |

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

