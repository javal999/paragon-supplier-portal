# Demand anticipation (CAP-10 to CAP-12): design brief

| Field | Value |
|---|---|
| Status | **Accepted 2026-10-13.** The owner accepted every recommendation in section 9 (CAP-D10 to CAP-D16). Nothing here is built yet; build order in section 7 |
| Date | 2026-10-13 |
| Parent | `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` section 8 (CAP-10 BR-01 to BR-04, CAP-11 BR-01 to BR-05, CAP-12 BR-01 to BR-03); backlog BL-179 to BL-181 |
| Code read | `main` at `b1cc133` |
| Values | Every number marked [Placeholder] is a starting value. Ary Hidayat's spike use case (MoM 07 Oct, AI 1) validates them later as a test fixture (section 8), on the owner's ruling of 2026-10-13 |

**Tags.** [Code] = what `main` does today, cited `path:line` under `src/`. [MoM] = the 07 Oct meeting. [Placeholder] = a starting value to be checked against Ary's use case. [Proposed] = a design choice, all accepted on 2026-10-13 (section 9); the tag is kept so each choice can be traced.

---

## 1. Summary

The hub can build CAP-10 to CAP-12 now, but three things the spec assumes do not exist yet. This brief proposes how to fill each gap, and orders the work into three steps (section 7).

1. **No demand anticipation figure exists.** Nothing in `src/` computes LTP + ROP − SOH. "DA" in the code already means Delivery Agreement [Code: `pages-v2/BuyerContractDetail.jsx:5-9`]. The closest figure is the requirement engine's net need, which nets safety stock, not the reorder point, and starts from SAP's plan, not the LTP [Code: `services/engine/requirement.js:451`].
2. **Nothing engine-computed is stored, so nothing can be frozen.** Safety stock, ROP, order plan and Stabilise are all recomputed at read. The only stored, versioned per-week plan is the forecast version store [Code: `services/data/mock/stores/forecastHubStores.js`].
3. **No actual consumption is recorded.** There is no goods issue or usage record anywhere in `src/`. The 16 "consumption" matches are a tax label, comments, and sales orders consuming the forecast [Code: `services/engine/requirement.js:9-107`].

What can be reused:
- LTP per supplier × material × week (`groupWeekLtp`, `transitions/capacityRules.js:373`).
- PTI stock on hand and reorder point from SAP (`PTI_STOCK`, `services/data/mock/fixtures/inventoryHub.js:63`).
- Open call-offs with need dates (`CallOff.needDate`, `services/data/types.js:485`; released states in `transitions/callOffRules.js:56`).
- The blanket-line order from CAP-9 (`transitions/blanketPoRules.js`).
- The shared `WeekGrid` for the display.

---

## 2. Name and grain

- **Name [Proposed, CAP-D10].** On screen it reads "Demand anticipation", and in code `demandAnticipation`. The screen never abbreviates it to "DA", because "DA" already labels Delivery Agreements on the contract pages.
- **Grain [Proposed, CAP-D11].** Supplier × material × week, with the week named by its Monday, as everywhere else in the hub.
  - **LTP:** read from the current forecast version with `groupWeekLtp`, which spreads a period evenly by day. Raw-material LTP is monthly only [Code: `transitions/forecastConfig.js:59-62`], so a raw-material week is a by-day share of its month.
  - **Stock on hand and reorder point:** both are per material in SAP [Code: `inventoryHub.js:63-66`]. They are shared across the material's suppliers by each supplier's share of the material's LTP over the 4 frozen weeks [Placeholder].

---

## 3. The formula

**[Proposed, CAP-D12; Placeholder until Ary's use case.]** For one supplier × material, starting with the current week:

```
start   = share × (SOH − ROP)          positive = stock above the reorder point
week w:
  if start < 0 (stock below ROP):  DA(1) = LTP(1) + (ROP − SOH) share, then DA(w) = LTP(w)
  if start ≥ 0 (stock above ROP):  surplus is used up first, week by week:
                                    DA(w) = max(0, LTP(w) − surplus left)
                                    surplus left −= LTP(w) until it reaches 0
```

**Why this reading of "LTP + ROP − SOH".**
- **Stock and reorder point count once.** Applied literally every week, the 1,500 kg reorder point would be added 13 times and the stock subtracted 13 times. They are a stock position, not a weekly flow.
- **Week 1 restores the reorder point.** It tops stock back up to the reorder point, or uses up the stock above it, and later weeks ask only for the LTP. That is the team's formula with the stock counted once.
- **Open orders are not netted here.** CAP-12 compares supply with demand anticipation, so netting them here would count them twice.

**Example** (illustrative, not fixture data). Take one supplier with 100% share, SOH 1,800, ROP 1,500, and LTP 400, 400, 400 and 400 in weeks 1 to 4. The start is +300. Week 1 is 400 − 300 = 100. Weeks 2 to 4 are 400 each. With SOH at 1,200 instead, week 1 is 400 + 300 = 700.

**Still open beside it.** ENG-D22 in `FORECAST-ENGINE-REQUIREMENTS.md:1167` recommends netting to safety stock and counting open orders, and using the reorder point only as the trigger. That stays open. The formula lives in one pure function (`demandAnticipationWeeks`), so Ary's numbers can confirm it, or a ruling on ENG-D22 can replace it, without touching the screens.

---

## 4. CAP-10: freezing the current horizon

**[Proposed, CAP-D13.]**

- **A new store keeps every version.** The `demandAnticipationStore` appends each publication and never overwrites one, like `forecastVersionStore`. A publication holds:
  - who published it (actor) and when (hub clock);
  - its horizon start (a Monday);
  - per supplier × material × week: the figure, and the inputs it came from (LTP, stock share, reorder-point share).
- **A new planner verb, "Publish demand anticipation"** (`t_demandanticipation_publish`). It freezes the 4 weeks from the current hub week (BR-01). It reuses the planner's `forecast:publish` atom [Code: `transitions/businessRoles.js:371`] rather than minting a new one [Proposed]. A seat without the atom sees the existing handoff notice.
- **Once frozen, a week keeps its value.** It keeps the figure from the first publication that froze it. A later publication freezes the next 4 weeks and leaves the frozen ones alone, which rolls the horizon (BR-02, BR-04).
- **"Would be" (BR-03).** A frozen week shows a lock and its published figure. Beside it, read only, it shows today's recomputation, e.g. "would be 12,800 (+2,800)".
- **Weekly roll.** The demo clock does not move by itself [Code: `services/sdc/clock.js:66`], so the roll happens when the planner publishes, not on a timer. One publication is seeded so the page opens frozen.
- **Where it shows.** A new planner page, "Demand anticipation", in the Weekly plan menu. It shows one `WeekGrid` per supplier × material, with these rows: LTP, stock share, reorder-point share, demand anticipation (locked in weeks 1 to 4), would be, recorded consumption, absorbed, open supply, gap. Weekly and Monthly view come with the grid; monthly is read only.

**Acceptance.**
- AC-01: after publishing, a new LTP that raises week 2 by 10,000 leaves week 2's figure unchanged and shows "would be +10,000".
- AC-02: publishing again a week later freezes weeks 5 to 8 and leaves weeks 1 to 4 as they were.
- AC-03: a seat without the atom sees the handoff notice instead of Publish.

---

## 5. CAP-11: recorded consumption and absorbing the excess

**[Proposed, CAP-D14.]**

- **Where consumption comes from.** The planner records actual weekly consumption per material, typed in or uploaded, through a new verb (`t_consumption_record`). It is stored in a `consumptionStore` with its source: `manual`, `upload`, or later `sap`. Until the SAP goods-issue feed exists, the screen says "Consumption recorded by the planner · awaiting SAP goods-issue feed".
- **Why not derive it.** Stock-on-hand changes plus goods receipts would be the obvious proxy. But the sample stock series is calibrated to warehouse fill, not balanced against receipts [Code: `services/engine/synthetic/generate.js:565-612`], so the result would be wrong in ways nobody could see.
- **Split across suppliers.** A material's consumption is shared across its suppliers by each one's share of that week's demand anticipation [Placeholder].
- **The excess and absorbing it** follow the spec (BR-01 to BR-05):
  - The excess is the sum of (demand anticipation − consumption) over frozen weeks where consumption was lower.
  - It is spread evenly over weeks 5 to 8, never below 0 in a week. What one week cannot take moves to the next.
  - What is still left after week 8 raises a PTI-only alert with the remaining amount, derived like the CAP-4 and CAP-9 alerts.
  - Each week shows "−n absorbed from the W36–W39 excess".
- **Absorbed weeks are not frozen yet.** Weeks 5 to 8 sit outside the frozen window, so absorbing changes them. The next publication then freezes them with the absorption included.

**Acceptance.**
- AC-01 (spec): an excess of 12,000 over demand anticipation of 20,000/wk in weeks 5 to 8 gives 17,000/wk.
- AC-02: an excess of 90,000 over 20,000/wk leaves 10,000 unabsorbed and raises the alert.
- AC-03: no consumption recorded means no excess and no adjustment.

---

## 6. CAP-12: supply below demand anticipation

**[Proposed, CAP-D15.]**

- **Open supply per supplier × material × week** is the call-offs in released states (Awaiting Confirmation and the four confirmed states [Code: `transitions/callOffRules.js:44-56`]), bucketed by the week of their need date.
  - **Blanket balance is not supply.** A blanket balance that has not been called off is not dated supply. CAP-9 already shows it as run-out.
  - **Every confirmed PO line counts as a blanket.** CAP-9 treats every Confirmed or Partially Delivered PO line as a blanket line, and PO lines carry only header dates [Code: `services/data/types.js:239-257`]. So call-offs are the dated supply.
- **Gap.** gap(w) = demand anticipation(w) − open supply(w), where positive.
- **The proposal for a gap:**
  1. a call-off on the oldest blanket line for that supplier × material with balance left, ordered oldest first as in CAP-9 (BR-03). It is drafted with the existing draft call-off verb. If the oldest line cannot cover the gap, the rest goes to the next line.
  2. Otherwise, "New PO needed" with the gap quantity (BR-02, CAP-D4: the hub recommends, the planner raises).
- **Where it shows.** A section "Below demand anticipation" on What to order, separate from the engine's recommendations. The engine's What to order nets only its own synthetic PO lines, not hub call-offs [Code: ENG-B19, `services/engine/orderSizing.js:792`], so mixing the two lists would count supply twice. Each row links to the supplier × material on the Demand anticipation page.

**Acceptance.**
- AC-01 (spec): demand anticipation 30,000 and open supply 22,000 in week 6 propose 8,000.
- AC-02: the proposal names the oldest blanket line with balance, and its draft call-off carries 8,000 and the week-6 need date.
- AC-03: with no blanket balance left, the proposal reads "New PO needed: 8,000".

---

## 7. Build order

| Step | Contents | Size | Depends on |
|---|---|---|---|
| A | CAP-10: the formula function, `demandAnticipationStore`, the publish verb (CommandTarget, policy, audit), the seeded publication, and the Demand anticipation page with locked weeks and "would be". C1 and C5 count the new read | M | — |
| B | CAP-12: open supply by need week, the gap, the "Below demand anticipation" section, and the blanket call-off proposal | M | A |
| C | CAP-11: `consumptionStore` with its record verb and upload, the excess and absorbing it, and the alert | M | A |

B and C run in parallel once A is merged. Each step runs its own specs; the full suite runs once on the combined result, as before.

---

## 8. Validating with Ary's use case

**[Proposed, CAP-D16.]**

- **The fixture.** When Ary's spreadsheet arrives, it becomes a golden fixture, `src/services/transitions/__fixtures__/demandAnticipation.ary.json`. Each scenario gives, per week, the inputs (LTP, SOH, ROP, consumption, open supply) and Ary's expected results (demand anticipation, excess, absorbed, gap, additional PO).
- **The test.** A test runs the formula on every scenario and compares the results to Ary's, week by week.
- **A mismatch** fails the test and names the scenario, the week and the rule. The owner then decides: either the formula changes, and the test goes green, or Ary's case is corrected.
- **Placeholder values.** Until the spreadsheet arrives, every [Placeholder] value is in one config block (`DEMAND_ANTICIPATION_RULES`), so changing a value is a one-line edit.

---

## 9. Decisions (accepted 2026-10-13)

| ID | Question | Recommendation | Outcome |
|---|---|---|---|
| CAP-D10 | Name | "Demand anticipation" on screen, `demandAnticipation` in code, never "DA" (it means Delivery Agreement today) | Accepted, 2026-10-13 |
| CAP-D11 | Grain and splitting | Supplier × material × week; monthly raw-material LTP spread by day; stock on hand and reorder point shared by LTP share over the frozen 4 weeks | Accepted, 2026-10-13 |
| CAP-D12 | Formula | Stock and reorder point counted once, in week 1 (top up to the reorder point, or use the stock above it first); later weeks equal the LTP; open orders not netted. One function, checked by Ary's fixture | Accepted, 2026-10-13 |
| CAP-D13 | Freezing | An append-only publication store; a planner "Publish demand anticipation" verb on the `forecast:publish` atom; a frozen week keeps its first value; "would be" beside it; the horizon rolls on publish; one publication seeded | Accepted, 2026-10-13 |
| CAP-D14 | Consumption | Recorded by the planner, typed or uploaded, marked as awaiting the SAP goods-issue feed; split by demand anticipation share; never derived from stock changes | Accepted, 2026-10-13 |
| CAP-D15 | Open supply and the extra PO | Released call-offs by need week; gap = demand anticipation − open supply; call-off on the oldest blanket line first, otherwise "New PO needed"; its own section on What to order | Accepted, 2026-10-13 |
| CAP-D16 | Ary's numbers | A golden fixture and a test; placeholders in one config block | Accepted, 2026-10-13 |
