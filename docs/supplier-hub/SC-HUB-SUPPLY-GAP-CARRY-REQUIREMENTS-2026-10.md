# SC Hub requirement BL-228: supply gap carries surplus forward

| Field | Value |
|---|---|
| Status | **Proposed, awaiting owner review.** Nothing is built. Decisions CAP-D18 to CAP-D21 (section 6) are recommendations until the owner accepts them |
| Date | 2026-10-27 |
| Source | Owner, 2026-10-27, reviewing the Demand anticipation grid ("yes, log it"). Backlog row BL-228 |
| Code read | `main` at `3d91b887` |
| Amends | CAP-12 BR-01 (gap per week) in `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md`, as designed in `SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md` section 6 |
| Does not change | DRC-4 plan check, demand anticipation figures, open supply per week, the oldest-first proposal walk (CAP-9, BR-03) |

**Tags.** [Code] = built behaviour, cited `path:line` under `src/`. [Owner, 2026-10-27] = the owner's request. [Proposed] = a value written before review.

---

## 1. The problem

The gap is computed one week at a time [Code: `services/transitions/supplyBelowDemandRules.js:74`]:

> gap(w) = max(0, demand anticipation(w) − open supply(w))

Supply above a week's demand anticipation is thrown away. It does not count against the next week.

The example the owner reviewed, one supplier × material, in KG:

| | W37 | W38 | W39 |
|---|---:|---:|---:|
| Demand anticipation | 980 | 980 | 980 |
| Open supply (released call-offs, by need date) | 2,000 | 0 | 0 |
| **Gap today** | 0 | **980** | **980** |
| **Gap with this rule** | 0 | **0** | **940** |

Today the hub reports 1,960 KG short and proposes call-offs for it. The real need is 940 KG: W37's call-off brings 1,020 KG more than W37 uses, and that material is still in stock in W38. The overstatement reaches two places:

1. the Gap row on the Demand anticipation grid [Code: `pages-v2/BuyerDemandAnticipation/components/supplyRows.jsx:51-74`];
2. the "Below demand anticipation" proposals on What to order, which draft call-offs or "New PO needed" for each gap [Code: `supplyBelowDemandRules.js:153-178`, `pages-v2/BuyerOrderPlan/components/BelowDemandSection.jsx:106-116`].

---

## 2. The rule

Per supplier × material, walk the weeks earliest first with a running surplus that starts at 0 [Proposed]:

```
available(w) = open supply(w) + carried in(w)
gap(w)       = max(0, demand anticipation(w) − available(w))
carried in(w+1) = max(0, available(w) − demand anticipation(w))
```

- **BR-01. Surplus moves forward.** Supply above a week's demand anticipation counts against the next weeks' gaps until it is used up.
- **BR-02. Never backward (CAP-D19).** A call-off needed in W39 does not cover a gap in W37. Material that arrives late does not meet an earlier need, so W37 still shows its gap.
- **BR-03. Within the demand anticipation weeks (CAP-D18).** The carry runs only across weeks that have a demand anticipation figure: the rolling horizon (DRC-2). Weeks outside it have no figure and no gap today [Code: `supplyBelowDemandRules.js:74-75`, `null` when there is no figure], so a surplus left at the end of the horizon covers nothing and is not shown.
- **BR-04. Starts at the planning week.** The carry starts at 0 in the first week the grid shows. Released call-offs needed before that week (overdue) are not counted, as today.
- **BR-05. Proposals follow the new gap.** "Below demand anticipation" lists only weeks whose gap, after the carry, is above 0, with that gap as the quantity to cover. The oldest-first walk over blanket balances is unchanged [Code: `proposeForGaps`, `supplyBelowDemandRules.js:153`].

Worked through the example: W37 has 2,000 available, gap 0, carries 1,020. W38 has 1,020 available, gap 0, carries 40. W39 has 40 available, gap 940. What to order shows one line: W39, 940 KG.

---

## 3. What the planner sees

- **Open supply row: unchanged.** It still shows the call-offs needed in that week (W37 = 2,000, W38 = 0). It answers "what arrives when".
- **Gap row: the new figure.** W38 shows 0, W39 shows 940.
- **Where the cover came from (CAP-D20).** A Gap cell that a carry reduced shows a tooltip naming the carried quantity, e.g. W38: "1,020 carried from earlier weeks" [Proposed]. No new row is added to the grid.
- **Monthly view.** The Gap row sums its weekly figures [Code: `supplyRows.jsx:55`, `combine: 'sum'`]. The sum of carried weekly gaps is the month's true gap, so the monthly view needs no change.
- **What to order.** The "Demand anticipation", "Open supply" and "Gap" columns of a proposal line keep their meaning; the Gap column now holds the carried gap. Gap ≠ demand anticipation − open supply on a line whose week received a carry, so the line shows the same tooltip as the grid.

---

## 4. What this does not change (CAP-D21)

- **DRC-4 plan check.** It compares the horizon's total demand anticipation with SOH + OSPO + OSPR + PR and absorbs a surplus in the last week. It works on totals, so it already counts W37's extra 1,020. The demand anticipation figure it writes (`qty`, the figure in force) is read by the gap, never recomputed [Code: `supplyBelowDemandRules.js:13-17`]. This rule changes only how open supply is set against that figure, week by week.
- **Stock on hand.** The weekly gap does not subtract SOH today and still will not. SOH enters the demand anticipation through week 1 (DRC-2) and the DRC-4 check.
- **Draft call-offs.** A proposal the planner has not released is not supply, as today (CAP-12: a Draft is not released).

---

## 5. Acceptance

- **AC-01.** Demand anticipation 980 in W37, W38, W39; one released call-off of 2,000 needed in W37. The Gap row reads 0, 0, 940.
- **AC-02.** Same pair, What to order lists one "Below demand anticipation" line: W39, gap 940, proposal for 940 on the oldest blanket line with balance.
- **AC-03 (never backward).** Demand anticipation 980 in W37 and W38; one released call-off of 2,000 needed in W38. Gap reads 980, 0.
- **AC-04 (horizon end).** Horizon of 2 weeks, demand anticipation 980 each; call-off 3,000 in week 1. Gaps 0, 0; the week outside the horizon shows "—", as today.
- **AC-05 (no carry, unchanged).** Every week's open supply ≤ its demand anticipation: every gap equals today's figure. The existing CAP-12 tests (AC-01 to AC-03: 30,000 − 22,000 = 8,000 in week 6) still pass unchanged.
- **AC-06 (tooltip).** The W39 Gap cell in AC-01 has the tooltip "40 carried from earlier weeks".

---

## 6. Decisions for the owner

| ID | Question (from BL-228) | Recommendation | Why |
|---|---|---|---|
| CAP-D18 | Carry forward only within the rolling horizon, or beyond it? | Within the horizon only (BR-03) | Weeks outside the horizon have no demand anticipation, so there is no gap there to cover. A surplus left at the horizon's end is already in the DRC-4 total |
| CAP-D19 | Does a later call-off cover an earlier week? | Never backward (BR-02) | Material arriving in W39 cannot be used in W37. Covering backward would hide a real stock-out. The planner sees the late call-off in the Open supply row and can move its need date |
| CAP-D20 | Show where the cover came from? | Tooltip on the reduced Gap cell; no new row | The grid keeps its rows, and the planner can still check why Gap ≠ demand anticipation − open supply |
| CAP-D21 | Only the weekly Gap row and the proposals change? | Yes. DRC-4, demand anticipation, Open supply and SOH handling stay as they are (section 4) | DRC-4 works on horizon totals and already counts the surplus |

---

## 7. Build

- **Size S.** One pure-function change in `withOpenSupply` (`supplyBelowDemandRules.js:211`): replace the per-week `supplyGap` call with the running carry, and add `carriedIn` to `SupplyWeekFields`. `supplyGapRows` and `proposeForGaps` need no change; they read `gap`.
- **UI.** The tooltip in `supplyRows.jsx` and `BelowDemandSection.jsx`; two i18n keys (EN, ID) in `lib/i18n/supplyGap.js`.
- **Tests.** AC-01 to AC-06 in `supplyBelowDemandRules.cap12.test.js` (rules) and `BuyerOrderPlan.cap12.page.test.jsx` (What to order line).
- **Estimate.** About 2 hours with tests, one builder, after the owner accepts section 6.
