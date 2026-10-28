# Material Planning team answers: what they confirm, what they change, what is still open

| Field | Value |
|---|---|
| Status | **Ruled 2026-10-28.** The owner accepted changes 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8 and 3.9, each as recommended. 3.6 waits on the owner's own check. **Built 2026-10-28** on branch `feat/drc-material-answers` (`RULES_VERSION` `osip-2026-10-28.1`), not yet merged; build decisions in `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` section 6e |
| Date | 2026-10-28 |
| Source | Workbook *Pertanyaan Terakit Forecast SC Hub.xlsx* (SharePoint, owner's OneDrive; file name `PERTANYAAN-TIM-MATERIAL-2026-10-16 (2).xlsx`), sheet *Pertanyaan*, read 2026-10-28. Cited [Team, Qn] |
| Answered by | Septiana (Material Planning), every answered row. The sheet records no answer dates |
| Baseline | `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` section 4 (the [Default] each question stands behind) and the rules block `OSIP_RULES` in `src/services/transitions/osipRules.js` on `main` `fd4828c6` |
| Earlier copy | `~/Downloads/PERTANYAAN-TIM-MATERIAL-2026-10-16 (2).xlsx` (16 Oct, unanswered, 36 questions) |

**Tags.**
- **Confirms:** the answer matches the built default. Drop the "Provisional" label for that question.
- **Changes:** the answer differs from the built default. The owner rules before any code changes.
- **Adds:** the answer brings a fact the build did not have.
- **Open:** no usable answer yet.

---

## 1. Summary

The sheet now holds 23 of the original 36 questions:

| Result | Count | Questions |
|---|---|---|
| Answered | 16 | A1, A2, A6, A11, B2, B3, B5, B6, B7, B10, C1, D1, E1, E2, E3, F5 |
| Answered with a pointer only ("refer to gdocs") | 1 | C2 |
| "TBC. Butuh fiksasi cara main LTP" (waits on how LTP is run) | 2 | C3, C4 |
| Blank | 4 | A9, B1, B4, B8 |

The other 13 (A3, A4, A5, A7, A8, A10, A12, B9, D2, F1, F2, F3, F4) are no longer in the sheet. Row numbers run 2 to 24 with no gaps, so they were removed, not hidden. Section 5 lists where each one stands.

The *Status* column still reads "Belum dijawab" (not answered) on every row, including the answered ones. The *Tanggal* (date) column is empty.

---

## 2. Answers, question by question

### A. Demand anticipation (DA)

| Q | Team answer (summary) | Built default | Effect |
|---|---|---|---|
| A1 | Yes: the whole safety order sits in week 1 of DA, separate from the LTP requirement. The safety in DA is a safety **order**, so at the supplier it stays as feedstock and need not be converted into finished packaging. | `daSafetyPlacement: 'week1'` | **Confirms.** **Adds:** the week-1 safety portion is feedstock-form at the supplier |
| A2 | Total DA = safety + the LTP requirement. SOH, OSPO, PR, process order and ROP are SAP MRP elements: demand = process order + ROP; supply = SOH + OSPO + PR; MRP raises a PR recommendation when they differ. **Target: Total OSPO = Total DA.** | `planCheckIncludesSoh: true`: gap = Total DA − (SOH + OSPO + OSPR + PR) | **Changes** DRC-4: the check becomes Total DA vs Total OSPO. See 3.1 |
| A6 | If this is item PCEB, ignore 86,400: it is that item's call-off history. | "Call Off 86,400" feeds no figure | **Confirms.** The team asks us to confirm the item is PCEB |
| A11 | Both figures set the weekly demand by taking the minimum of LTP and historical GI, for existing items. LTP = **average of the next 13 weeks**; GI = **highest of the last 13 weeks**. | `consumptionMovingAvgWeeks: 13`; ROP Fisik demand = min(highest consumption 3 months, capacity, LTP) | **Confirms** the 13-week window. **Adds:** the LTP term is the 13-week forward average |

### B. ROP and safety

| Q | Team answer (summary) | Built default | Effect |
|---|---|---|---|
| B2 | ROP Fisik: SD of actual consumption (GI 261) over **13 weeks**. ROP Order: SD of LTP over **13 weeks**, which replaces the deviation over the lead time. | `sdSource: 'ltp'` over the lead-time weeks; sheet variant uses 12 weeks of consumption | **Changes:** both SDs use a 13-week window, and ROP Fisik's SD comes from consumption. See 3.2 |
| B3 | 95% service level (Z 1.65) by default. It can differ by material criticality and should come from the service-level master data in SAP. | `z: 1.65` for every material | **Confirms** the default. **Adds:** Z per material from SAP master data. See 3.5 |
| B5 | LTP is in the demand minimum for levels 1–5. NPD leaves out GI 261, because it has no consumption history. Level 6 (JIT) leaves LTP out of demand selection. GI 261 = goods issue to a production order. | `fisikDemandIncludesLtp: true` for every level; NPD = min(highest LTP next 3 months, capacity) | **Confirms** levels 1–5 and NPD. **Changes** level 6. See 3.6 |
| B6 | f is the ROP Fisik replenishment cycle and stands for the call-off lead time. The slide values (1 day / 2 days / 1 week) are OSIP assumptions, closer to ideal than today. They are likely to change with logistics and supplier operations. Treat them as data, not as a standard. | `replenishmentCycleDays` constant by supply area | **Confirms** the meaning. **Changes** the form: an editable value, not a constant. See 3.7 |
| B7 | g is a policy parameter, so it can differ per item. Logistics Operations sets it for ROP Fisik; Supply Sustainability sets it for ROP Order. | `fixedSafetyDays: 1` for every material | **Changes:** g per item, default 1. **Adds:** its owners, and that g also applies to ROP Order. See 3.5 |
| B10 | ROP feedstock is not defined: suppliers are expected to cover feedstock from the DA and POs issued. ROP Supplier = the supplier's total physical maximum stock = demand × the bottleneck production lead time, including queueing. | ROP Supplier, ROP FS and ROP to principal follow the XLS columns | **Changes:** drop ROP FS; ROP Supplier gets this formula. ROP to principal is not answered. See 3.4 |

### C. CV and OSIP level

| Q | Team answer (summary) | Built default | Effect |
|---|---|---|---|
| C1 | (1) Six months in **monthly** buckets. (2) The column that sets the category is *CV Comp FG Var*. (3) The 0.5 threshold is final. | `cvWindowWeeks: 26` (weekly); `cvThreshold: 0.5` | **Confirms** 0.5. **Changes** the buckets to 6 monthly. See 3.3 |
| C2 | "Refer to gdocs; the PPT is not updated yet." | Level is a field per material, default 4 | **Open:** we need the Google Doc |
| C3 | TBC. Needs a decision on how LTP is run. | Protection buffer built as a proposal (BL-205) | **Open** |
| C4 | TBC. Needs a decision on how LTP is run. | Strategic buffer = LTP − average of the 3 months before festive | **Open** |

### D. NPD

| Q | Team answer (summary) | Built default | Effect |
|---|---|---|---|
| D1 | NPD definitions still differ. OSIP tags NPD by the MoM definition. On the slide, "NPD" means the demand taken for NPD (the column header). | NPD until the first order is fulfilled (MoM) | **Confirms.** The meaning of CO and IR is not answered |

### E. Feedstock and supplier capacity

| Q | Team answer (summary) | Built default | Effect |
|---|---|---|---|
| E1 | ROP feedstock exists in the current model; the next model does not define it. See B10. | `ltSpareWeeks: 0`, so feedstock = 0 | **Confirms** feedstock = 0 going forward. LT spare is not explained |
| E2 | Suppliers on a pull agreement update stock (and some feedstock) **daily**. Suppliers without one update every **1–2 weeks**, depending on how often DA and delivery requests are sent. DA is owned by Supply Sustainability; delivery requests by the expeditor. With SC Hub, the RDS file may be replaced by the weekly DA update. | Weekly, with the Thursday stock update; the planner approves | **Changes:** the cadence depends on the pull agreement. **Adds:** who owns DA and who owns delivery requests. See 3.8 |
| E3 | MADR = production capacity vs average demand, kept by Production. SADR = supplier capacity vs average demand, kept by Supply Sustainability. OSIP does not use either field yet. SADR will tie to the SC Hub capacity feature. | Production limit = the supplier's allocated capacity per planning group; SADR feed kept as the alternative | **Confirms** the direction. **Adds** both definitions and their owners |

### F. Call-off

| Q | Team answer (summary) | Built default | Effect |
|---|---|---|---|
| F5 | DDPO = delivery date of the purchase order. Call-offs do not work the continuous/batching way shown. They follow ROP Fisik in the warehouse, not DDPO. Quantity per call-off = the supplier's minimum delivery quantity, rounded the way max stock rounds (pallet, koli, pack size, and so on). | Continuous when MPQ rate ≤ 6, batching above (also used by the level suggestion, `jitMpqRateMax`) | **Changes:** drop the continuous/batching rule as the call-off quantity rule. See 3.9 |

---

## 3. Changes the answers ask for (owner rules first)

**Owner ruling, 2026-10-28:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8 and 3.9 accepted as recommended, including the "my call" in 3.1 (keep the old check as a variant) and 3.9 (keep the ≤ 6 rule only in the level suggestion). 3.2 is accepted as recommended: ROP Order now; the ROP Fisik part waits on B1. 3.6 is held: the owner checks first.

Each item is one rules-block key or one formula. The golden fixtures (PPT 7–9) must still reproduce, or the item says why not.

1. **A2, plan check (DRC-4).** Change the check from `Total DA − (SOH + OSPO + OSPR + PR)` to `Total DA vs Total OSPO`, and show the SAP MRP elements as context only. **My call:** add a third variant to the switch rather than replacing the current one. PPT 7's PR −645,559 comes from the SOH arithmetic, so the fixture keeps the old variant. *Alternative:* replace it outright.
2. **B2, SD windows (DRC-7).** ROP Order: SD of LTP over 13 weeks, not over the lead-time weeks. ROP Fisik: SD of GI 261 consumption over 13 weeks (`consumptionSdWeeks` 12 → 13). AC-01 (PPT 7 gives SS 244,896) must be re-checked under 13 weeks.
3. **C1, CV buckets (DRC-11).** Six monthly buckets instead of 26 weekly ones. Threshold 0.5 stays. The CV that sets the category is the FG-variant CV (*CV Comp FG Var*), which matches today's per-variant calculation.
4. **B10, supplier-side ROPs (DRC-10).** Remove ROP FS. ROP Supplier = demand × bottleneck production lead time, including queueing. This needs a new per-supplier field for that lead time. ROP to principal stays on the XLS default until answered.
5. **B3 and B7, per-material parameters.** Z (service level) and g (fixed days) become per-material fields, defaulting to 1.65 and 1 day. Z should come from SAP service-level master data once a feed exists; until then the planner enters it. g has two owners: Logistics Operations (ROP Fisik) and Supply Sustainability (ROP Order).
6. **B5, level 6 (JIT).** The team says level 6 leaves LTP out of demand selection. The built level-6 formula is CEILING(c × d, pallet) with c = daily LTP (`osipRules.js`, DRC-10). These conflict. Ask the team which demand JIT uses (section 4, Q6).
7. **B6, cycle f (DRC-14).** Keep 1 day / 2 days / 1 week as defaults, but make f an editable value per supplier, since the team calls it data that will change.
8. **E2, confirmation cadence (DRC-8).** Daily for suppliers on a pull agreement; every 1–2 weeks otherwise, following the DA send cadence. This needs a per-supplier "pull agreement" flag. Supply Sustainability owns DA.
9. **F5, call-off quantity (DRC-13).** Quantity per call-off = the supplier's minimum delivery quantity, rounded like max stock. Call-offs follow ROP Fisik, not DDPO. **My call:** keep `jitMpqRateMax` (≤ 6) only inside the OSIP level suggestion (DRC-19), where it marks a continuous production pattern, and stop treating it as a call-off rule. *Alternative:* remove it from the level suggestion as well.

**Confirmed, so the "Provisional" label can drop:** A1, A6, A11 (13 weeks), B3 (1.65 default), B5 (levels 1–5 and NPD), C1 (threshold 0.5), D1, E1 (feedstock 0).

---

## 4. Questions still open, and new ones the answers raise

**Still open from the sheet**
1. **A9:** additional PO formula, and who issues it (planner or SAP MRP). Blank.
2. **B1:** final ROP Fisik safety formula, deck or sheet. Blank. B2's answer (SD of consumption for ROP Fisik) points to the **sheet** variant, which is the only one that uses an SD.
3. **B4:** safety rounding, MPQ, koli or MOQ. Blank. F5's answer (round like max stock) may cover it.
4. **B8:** Max formula, and koli per pallet or pack size. Blank.
5. **C2:** level definitions. "Refer to gdocs": we need the link.
6. **C3, C4:** protection and strategic buffers wait on how LTP is run.

**New questions**
1. **A2:** the answer says MRP raises a PR "when demand < supply". MRP normally raises a PR when demand exceeds supply. Is that a typo?
2. **A6:** is the item PCEB? The team asked us to confirm.
3. **B7:** does g apply to ROP Order as well? The answer names an owner for it there, but the deck uses g only in ROP Fisik.
4. **B10:** what is ROP to principal?
5. **D1:** what do CO and IR mean in "ROP is re-evaluated after the first order based on CO, IR"?
6. **B5:** for level 6 (JIT), which demand replaces LTP?
7. **E2:** what happens when a supplier does not confirm?
8. **E1:** what does "LT spare" mean in the current model?

---

## 5. Questions removed from the sheet

| Q | Topic | Where it stands |
|---|---|---|
| A3 | DA horizon length | Owner answered 2026-10-16: the material's lead time, rolling weekly (DRC-2 BR-01) |
| A4 | Adjusting the last week | Owner answered 2026-10-16: surplus absorbed in the last week, shortfall becomes a PR (DRC-4 BR-02) |
| A5 | Shortfall below ROP Fisik covered by call-off | No recorded answer; built behaviour is call-off at ROP Fisik (DRC-13) |
| A7 | DA as a signal; what max stock caps | Owner answered 2026-10-16: max stock caps call-offs only (DRC-13 BR-03) |
| A8 | Carry-over rule | Owner answered 2026-10-16 (DRC-2 BR-03, BR-04) |
| A10 | DA history | Owner answered 2026-10-16: keep all; Procurement and Finance audit (DRC-3) |
| A12 | Sandbox horizon RM 52 / PM 24 weeks | Scope accepted 2026-10-16 (DRC-17) |
| B9 | ROP Order and ZPE007 | Default: ROP Order = cycle stock + safety order |
| D2 | NPD vs CMM, material-code rules | On hold with MDM (BL-206) |
| F1 | Plants J6 and J2 | Default: SOH combined across plants, plant stored (DRC-13 BR-05) |
| F2 | Call-off trigger | Owner answered 2026-10-16: the hub drafts, the planner approves (DRC-13 BR-01) |
| F3 | PO vs call-off reconciliation at PO end | Built as a proposal awaiting owner review (BL-207, DRC-15b) |
| F4 | Daily FS reconcile | Owner answered 2026-10-16: FS = feedstock (DRC-15a) |

---

## 6. Next steps

1. **Owner:** rule on items 3.1 to 3.9, accepting or rejecting each "my call".
2. **Owner, to the team:**
   - send the section 4 questions;
   - ask for the C2 Google Doc link;
   - ask them to set *Status* and *Tanggal* on answered rows.
3. **Build, after the ruling:** one rules-block change per accepted item, each with its golden fixture re-run and the "Provisional" label dropped for confirmed questions. Done 2026-10-28 on `feat/drc-material-answers`. Two decisions came out of it for the owner: BL-230 (the minimum delivery does not fit under Max at the trigger, F5 vs A7; ruled 2026-10-28: call it off anyway, flagged) and BL-231 (PPT 7 stays on the lead-time SD variant; ruled 2026-10-28: accepted).
