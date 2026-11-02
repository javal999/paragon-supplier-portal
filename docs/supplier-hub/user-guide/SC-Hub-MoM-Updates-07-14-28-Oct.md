# SC Hub: what came of the 07, 14 and 28 Oct meetings, and what the planners still need to confirm

| | |
|---|---|
| For | The Material Planner session, Wed 4 Nov 2026, and any follow-up on one of these meetings |
| Read at | GitLab `main` `f79a26c1` (2026-11-02), the build prod runs since 14:38 WIB |
| Companion files | `SC-Hub-Planner-04-Nov-What-Changed.pptx` (MR !83): every change since 21 Oct, with worked examples and the 29 questions. `Paragon-Supplier-Portal-User-Guide.pptx` (MR !84): how each flow works today |
| Sources | `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` (07 Oct), `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` (14 Oct), `SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10.md` (28 Oct), `BUILD-GAP.md` §1.2, `BACKLOG.md`, `research/ALERT-RULES-FOR-TEAM-2026-11-02.md`, and the C2 message to the team (`sc-hub-vision/work-tracker/C2-MATERIAL-TEAM-MESSAGE-2026-10-30.md`, outside the repo) |

**In one line:** everything decided on 07, 14 and 28 Oct is built and live in prod. What is left is 29 answers from the Material Planning team (section 4), their check of the 12 alert rules (section 5), and 3 rules waiting for the owner's review (section 3).

---

## 1. Weekly SC Hub, 07 Oct: capacity, forecast confirmation, DA horizon

Decisions CAP-D1 to CAP-D8 accepted 12 Oct, CAP-D9 to CAP-D17 on 13 Oct. Backlog BL-170 to BL-181.

| Meeting point | What was decided | Status in prod | Where to see it |
|---|---|---|---|
| Week = column, component = row (CAP-1) | Time-series tables use weeks as columns | **Partly built.** Capacity (PTI and supplier) and Demand forecast use it. The other 7 time-series tables wait for the owner to confirm each one (CAP-D5) | Capacity, Demand forecast |
| Weekly/Monthly toggle (CAP-2) | A week counts in the month of its Thursday; monthly is read only | Built | Capacity, Demand forecast |
| Meets demand, falls short, needs confirmation (CAP-3) | Three states: Within capacity, Needs additional capacity, Cannot be supplied; the supplier confirms additional capacity per week (CAP-D1) | Built | Capacity (both sides), Submit by period |
| Force Majeure, Discontinued (CAP-4, CAP-5) | Both need a note; Discontinued raises a PTI alert to find another source (CAP-D2); reason filter | Built. Discontinued alerts PTI only; no Procurement screen | Foresight commitments, Capacity, Alerts |
| No commitment date (CAP-6) | The supplier confirms a quantity per period | Built | Foresight commitments |
| Remove Request revision (CAP-7) | Hide first | Built: switched off | Foresight commitments |
| Move demand to several suppliers (CAP-8) | One quantity per supplier, in the material's unit (CAP-D3) | Built | Foresight commitments → Move demand |
| Blanket PO run-out (CAP-9) | "New PO needed by"; several blanket POs drawn oldest first, one alert per group (CAP-D9) | Built | Call-offs → Blanket POs running out; Alerts |
| DA frozen per 4-week horizon (CAP-10, CAP-11) | Built on 13 Oct, then **replaced on 19 Oct** by the 14 Oct meeting: the horizon is the lead time and rolls weekly (DRC-2) | Built as replaced | Demand anticipation (DA) |
| PO < DA → additional PO (CAP-12) | The hub recommends, the planner raises it (CAP-D4) | Built: "Below demand anticipation (DA)" with a call-off proposal or "New PO needed" | What to order |
| Ary Hidayat's spike case (action item) | Build with placeholder values, replace with Ary's numbers | **Open:** Ary's case not received (BL-209, question D2) | – |
| Capacity: one number or per week (BL-65) | Per week, plus "Copy to all weeks" (INV-D2, 22 Oct) | Built | Capacity |

## 2. Weekly SC Hub, 14 Oct: DA, ROP and call-off (OSIP)

Requirements DRC-1 to DRC-19, accepted 19 Oct ("approve all"). Built in MRs !4 to !13 (19 to 20 Oct). Values tagged [Default] stay provisional until the team confirms them.

| Requirement | Status in prod | Waits on |
|---|---|---|
| DRC-1 Suppliers see their own DA | Built, **switched off** (DRC-D10: suppliers must not plan on unconfirmed figures) | Owner's go; B1, B4 |
| DRC-2 Rolling DA over the lead time, with carry-over | Built | A9 |
| DRC-3 DA history and audit view | Built: Demand anticipation (DA) history | – |
| DRC-4 Plan vs execution check | Built; changed on 28 Oct to Total DA vs Total OSPO (section 3) | N1 (possible typo in the team's answer) |
| DRC-5 Delayed call-off needs supplier approval | Built: "Approve the delay" / "Reject the delay" | – |
| DRC-6 Lead time by step | Built | – |
| DRC-7 Safety order and safety | Built; changed on 28 Oct (13-week SD) | B1, B4 |
| DRC-8 Supplier confirms feedstock (and Incoming DA) | Feedstock built (daily on a pull agreement, else weekly); Incoming DA hidden with DRC-1 | N7 (what if a supplier does not confirm) |
| DRC-9a Strategic buffer | Built on [Default] | C4 |
| DRC-9b Production limit | Built: the supplier's allocated capacity as a placeholder | Q8 (which "Max Supplier") |
| DRC-9c Protection buffer | Built as a **proposal**, display only | Owner review; C3 |
| DRC-10 System ROPs and Max per level | Built on [Default]; ROP FS removed on 28 Oct | B8, N4, N6 |
| DRC-11 CV and stable/fluctuative | Built; 6 monthly buckets since 28 Oct | – |
| DRC-12a NPD tag and ROP review | Built on [Default] | N5 (CO, IR) |
| DRC-12b NPD vs CMM, material-code rules | **On hold** with MDM (BL-206) | D2 of the sheet, MDM |
| DRC-13 Call-off trigger at ROP Fisik | Built; quantity = supplier's minimum delivery since 28 Oct. **Not visible in the demo:** a draft appears only when the eWM stock feed refreshes, and no screen does that today | eWM SOH feed; MDQ = MOQ is [Proposed] |
| DRC-14 Replenishment cycle f per supplier | Built, editable per supplier since 28 Oct | – |
| DRC-15a Feedstock reconcile | Built | – |
| DRC-15b Leftover rule at PO end | Built as a **proposal** (BL-207) | Owner review |
| DRC-17 What-if sandbox | Built; opens from "Try a what-if" | – |
| DRC-18 LTP vs FG demand, moving-average consumption | Built on [Default] | Consumption waits on the SAP goods-issue feed |
| DRC-19 Automatic OSIP level | Built as a **proposal** ("Use suggestion") | Owner review; C2 (level definitions link) |

## 3. Team answers and owner rulings, 28 Oct

Septiana (Material Planning) answered 16 of the 23 questions left in the sheet. The owner ruled on what the answers change, and the build went live the same day (MR !57; BL-232 in MR !58, live 2 Nov).

| # | What changed | Status |
|---|---|---|
| 3.1 | Plan check = Total DA vs Total OSPO; SOH, OSPR and PR shown as "SAP MRP elements", context only (A2) | Built, live |
| 3.2 | Safety order SD over the next 13 weeks of LTP (B2). The ROP Fisik part waits on B1 | Built (ROP Order part), live |
| 3.3 | CV over 6 monthly buckets, threshold 0.5 (C1) | Built, live |
| 3.4 | ROP FS removed; ROP Supplier = demand × bottleneck lead time (B10) | Built, live |
| 3.5 | Z and g per material (B3, B7) | Built, live |
| 3.6 | Level 6 (JIT): which demand replaces LTP (B5) | **Held:** owner checks first; asked as N6 |
| 3.7 | Cycle f editable per supplier (B6) | Built, live |
| 3.8 | Feedstock confirmation daily on a pull agreement, else weekly (E2) | Built, live |
| 3.9 | Call-off quantity = the supplier's minimum delivery, rounded like Max (F5) | Built, live |
| BL-230 | A minimum delivery above Max is still called off, flagged "Above Max" | Built, live (not visible in the demo, see DRC-13) |
| BL-231 | The PPT 7 golden case stays on the lead-time SD variant | Ruled |
| BL-232 | A line balance below the minimum delivery is called off, flagged "Below minimum delivery", PR for the rest | Built, live 2 Nov (not visible in the demo, see DRC-13) |

Confirmed by the team, so no longer provisional: A1, A6, A11, B3, B5 (levels 1 to 5 and NPD), C1, D1, E1.

**After 28 Oct (owner, 2 Nov), for context:** early delivery confirmed by Material Planning counts as on time (KPI-2), but the code still applies one 7-day window (BL-234, not built); stock, capacity and feedstock are confirmed together by the Thursday cutoff (BL-236, live); promotion entry per SKU added to the backlog (BL-235, not built).

## 4. What the Material Planning team still needs to confirm

These are the 29 questions in the planner deck (slides 28 to 36), in the C2 message drafted 30 Oct with a reply date of **Friday 6 November**. Check that C2 was sent before the session: on 2 Nov it was still a draft. *Today* is what the hub does until the answer arrives.

| ID | Question | Today in the hub |
|---|---|---|
| **DA and plan check** | | |
| A9 | Additional PO formula, and who issues it (planner or SAP MRP)? | Additional PO = Σ DA − OSPO, OSPO counting the new PO |
| N1 (A2) | The answer says MRP raises a PR "when demand < supply". Typo? | Shortfall → PR recommendation |
| N2 (A6) | The example item is PCEB (confirmation only, no reply needed) | – |
| D1 | Does a call-off surplus in one week reduce later weeks' gaps? For how many weeks? | Yes, carried forward until a week with no DA (BL-228) |
| D2 | Ary: one spike case with numbers per week | Placeholders |
| **ROP and safety** | | |
| B1 | Final ROP Fisik safety formula: deck or sheet? | Deck (PPT 11); sheet as a switch |
| B4 | Safety rounding: MPQ, koli or MOQ? | Up to a multiple of MPQ |
| B8 | Max formula; koli per pallet or pack size? | Deck formula; koli per pallet (Non stc), pack size (stc) |
| N3 (B7) | Does g also apply to ROP Order? | ROP Fisik only |
| N4 (B10) | What is "ROP to principal"? | Follows the XLS columns |
| N6 (B5) | Level 6 (JIT): which demand replaces LTP? | CEILING(c × d, pallet), c = daily LTP; held |
| **CV and OSIP level** | | |
| C2 | Level definitions: the Google Doc link | Level field per material, default 4 |
| C3 | Protection buffer | Proposal only (BL-205) |
| C4 | Strategic buffer | LTP − average of 3 months before festive |
| **NPD, feedstock, supplier confirmation** | | |
| N5 (D1) | What do CO and IR mean in the NPD rule? | Not defined |
| N7 (E2) | What happens when a supplier does not confirm? | Shown as missed; no further rule |
| N8 (E1) | What does "LT spare" mean? | LT spare = 0, feedstock target 0 |
| Q8 (E3) | "Max Supplier": Prod Cap/week (MADR) or Supplier Cap/week (SADR)? | Supplier's allocated capacity as a placeholder |
| **Labels** | | |
| L1 to L4 | "Would be", "Surplus absorbed", "After the check", "Called off, not yet shipped": right words? | As listed |
| L5 | The 12 alert rules: right names and definitions? | Section 5 |
| **Backlog, Material Planner owner** | | |
| BL-71 | Over-delivery measured against the order or the ASN (the "kept open" half was answered 2 Nov) | ASN when linked, else the order |
| BL-140 | How an ASN is raised against a value-limit PO line | Open quantity 0: cannot ship |
| BL-149 | The SOP document to link on the Stock page | SOP named, not linked |
| **[Proposed] defaults in the code** | | |
| MDQ | Supplier minimum delivery = MOQ? | MDQ = MOQ |
| Pull agreement | Default "no" for every supplier? | No |
| Bottleneck lead time | No default: ROP Supplier "not available" without it | Not available |

Two small requests in the same message: the Google Doc link for C2, and filling *Status* and *Tanggal* on the answered rows of the sheet.

## 5. Alert rules: confirm with the team (L5, BL-150)

The hub raises 12 alerts today. The team's own list from the 23 Sept meeting (MOM 6.3) was never shared, so the hub team wrote these from the built rules.

| # | Rule (as on screen) | Shown to |
|---|---|---|
| 1 | PTI stock is below the PTI reorder point | PTI |
| 2 | Supplier stock is below the system-calculated supplier reorder point (ROP Supplier) | PTI, supplier |
| 3 | PTI stock runs out before the next incoming delivery | PTI |
| 4 | Allocated capacity is below the LTP | PTI, supplier |
| 5 | Supplier stock figures are out of date | PTI, supplier |
| 6 | Supplier stock and incoming do not cover the next 30 days of demand | PTI, supplier |
| 7 | Committed quantity below forecast beyond tolerance | PTI, supplier |
| 8 | No supplier lead time on record | PTI |
| 9 | A confirmed call-off due within the lead time is larger than the supplier stock plus production due before the need date | PTI |
| 10 | The supplier marked this material Discontinued: it needs another source | PTI |
| 11 | A blanket PO runs out soon: raise the next PO by its "new PO needed by" week | PTI |
| 12 | Supply above demand anticipation (DA) is more than the last week of the horizon can absorb | PTI |

Risk: High below 1 × the supplier lead time of cover, Medium below 1.5 ×; thresholds per material group under Alert thresholds and stale periods. Closing an alert needs a reason.

**Ask the team:**
1. Is any alert from their 23 Sept list missing? Each missing one becomes a new rule.
2. Is any rule here not wanted, or worded differently from how they say it?
3. Is "Shown to" right for each rule?
4. Once the list is final: one card per supplier × material instead of one per rule (INV-D5, P-04)?

## 6. Waiting on the owner, not the team

| Item | What is needed |
|---|---|
| BL-205 Protection buffer (DRC-9c) | Accept, change or drop the proposal (also needs C3) |
| BL-207 Feedstock leftover rule (DRC-15b) | Pick the rule: flag the liability (current), show only, or carry to the next PO |
| BL-208 Automatic OSIP level (DRC-19) | Accept the suggestion rule (also needs C2) |
| DRC-1 Supplier DA view | When to switch it on (after B1, B4) |
| CAP-1 waves 2 and 3 | Confirm each of the 7 remaining week tables before it is converted (CAP-D5) |
| BL-234 Early receipt confirmed by MP | Build: today one 7-day window applies to every early receipt |

## 7. What the demo cannot show yet

Useful to say up front so the planners do not read these as defects:
- **No call-off drafted at ROP Fisik**, so the "Below minimum delivery" and "Above Max" flags cannot be shown. The trigger runs on the eWM stock feed, which no screen refreshes.
- **Order-plan drafts and Publish to suppliers are withheld** on sample data.
- **Consumption** is typed or uploaded by the planner until the SAP goods-issue feed exists.
- **Suppliers do not see the DA** (DRC-1 switched off).
- **No email or WhatsApp** goes out for supplier questions or alerts; everything stays in the portal.

The full list is section 4 of `SCENARIOS.md` (22 items).
