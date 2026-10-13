# SC Hub Capacity requirements: week-as-column tables, monthly view, shortfall reasons, planner actions, blanket PO run-out, DA horizon

| Field | Value |
|---|---|
| Status | **Accepted 2026-10-12.** The owner accepted every recommendation in section 10 (CAP-D1 to CAP-D8). CAP-1 wave 1 is built (PR #191, 2026-10-12); everything else is not built yet. Build status per CAP is in section 1.2 of `BUILD-GAP.md`. Under CAP-D8 every [Proposed] value is the starting value; CAP-10 to CAP-12 values are replaced by Ary Hidayat's spike use case when it lands |
| Date | 2026-10-12 |
| Source meeting | Weekly SC Hub, 2026-10-07. Items cited as [MOM n] (section 1) and [AI n] (action items) |
| Owner review | 2026-10-12, cited as [Owner, 2026-10-12] |
| Code read | `main` at `748d595` |
| Covers | CAP-1 to CAP-12 (sections 2 to 8). Backlog BL-170 to BL-181 |
| Builds on | REQ-E08-04 (capacity confirmation), REQ-E06-01 (forecast publication), REQ-E06-02 (commitment), REQ-E06-03 (gap monitoring), REQ-E09-03 (call-off), REQ-E14-05 (What to order), BL-32 (reason codes), ENG-D18 to ENG-D22 |

**Tags.** [Code] = built behaviour, cited `path:line` under `src/`. [MOM n] = the meeting. [Owner, 2026-10-12] = a ruling given while reviewing the MOM. [Proposed] = a starting value written before review; all were accepted under CAP-D8 on 2026-10-12, and the tag is kept so they can be traced and revisited.

**New IDs.** Requirements CAP-n, rules CAP-n BR-nn, acceptance criteria CAP-n AC-nn, decisions CAP-Dn. The owner renumbers them when they fold into `SUPPLIER-HUB-REQUIREMENTS.md`, as for the material round.

---

## 1. The meeting, as reviewed

| MOM | Point | Outcome |
|---|---|---|
| 1 F1 | Forecast is published per supplier × SKU × material | Recorded as a decision. No change, no build now [Owner, 2026-10-12] |
| 1 F2 | Forecast quality is measured per SKU/material across all suppliers | Recorded as a decision. No change, no build now [Owner, 2026-10-12] |
| 2 C1 | Show clearly whether capacity meets demand, falls short, or needs confirmation | CAP-3 |
| 2 C2 | From the capacity forecast, say when the blanket PO runs out and a new PO is needed | CAP-9 |
| 2 C3 | Reasons a supplier can't fulfil: Force Majeure, Discontinued | CAP-4 (AI 5) |
| 2 C4 | Commitment Date not needed; confirmation is quantity per period | CAP-6 |
| 2 C5 | Remove "Request revision" | CAP-7: hide first [Owner, 2026-10-12] |
| 2 C6 | Move demand to several suppliers, with a quantity each in pcs/kg | CAP-8 |
| 3 U1 | Week = column, component = row, horizontal scroll; actions stay weekly | CAP-1 (AI 2): time-series tables whose rows are consecutive weeks, like the Demand forecast and both Capacity tables. Not every table with a week column [Owner, 2026-10-12] |
| 3 U2 | Supplier capacity uses the same weekly layout | CAP-1 |
| 3 U3 | Weekly/Monthly toggle; a week spanning two months belongs to the month with more of its days (ISO) | CAP-2 (AI 4) |
| AI 3 | Filter the exceptions table by below-forecast reason | CAP-5 |
| 4 D1 | Current-horizon DA does not change; adjust the next horizon | CAP-10 |
| 4 D2 | Lower consumption in the 4-week horizon: adjust DA from week 5, fully absorbed by week 4 of the next horizon | CAP-11 |
| 4 D3 | PO < DA: create an additional PO | CAP-12 |
| AI 1 | Ary Hidayat: spike use case (impact on PO, DA, LTP) | Dependency of CAP-10 to CAP-12. The owner asked to write and build them now and revisit against Ary's calculation [Owner, 2026-10-12]. Every [Proposed] number in sections 8 is replaced by Ary's when it lands |

Summary by size:

| ID | Requirement | Size | Backlog |
|---|---|---|---|
| CAP-1 | Week-as-column layout for week tables | L | BL-170 |
| CAP-2 | Weekly/Monthly toggle | M | BL-171 |
| CAP-3 | Three capacity states, shown the same everywhere | S | BL-172 |
| CAP-4 | Force Majeure and Discontinued reasons | S | BL-173 |
| CAP-5 | Reason filter on exceptions and capacity gaps | S | BL-174 |
| CAP-6 | Remove the commitment date | S | BL-175 |
| CAP-7 | Hide Request revision | S | BL-176 |
| CAP-8 | Move demand to several suppliers | M | BL-177 |
| CAP-9 | Blanket PO run-out and "new PO needed by" | M | BL-178 |
| CAP-10 | DA frozen in the current horizon | M | BL-179 |
| CAP-11 | Lower consumption absorbed in the next horizon | M | BL-180 |
| CAP-12 | Additional PO when PO < DA | M | BL-181 |

None needs the backend; all build on the mock stores like the rest of the hub.

---

## 2. CAP-1 Week-as-column layout

**Problem.** Ten tables list one week per row. A 13-week table is 13+ rows; a 26-week one is 26. On the buyer Capacity page every supplier accordion repeats that, so a planner scrolls through 14 rows per supplier to find the one red week [Code: `BuyerCapacity.jsx:385`]. The metrics per week are few (4 to 8), so turning weeks into columns cuts each table to 4 to 8 rows.

**Scope** [Owner, 2026-10-12: tables whose first column is a run of consecutive weeks, like the three the owner showed (Demand forecast SKU detail, PTI Capacity, supplier Capacity); not every table that has a week column]. Wave 1 is those three. Waves 2 and 3 are the other time-series tables, each confirmed by the owner before it is built [Proposed, CAP-D5]:

| # | Table | Persona | Weeks | Metrics → rows | Wave |
|---|---|---|---|---|---|
| 1 | Capacity, per supplier × planning group (`BuyerCapacity.jsx:385`) | PTI | 13 | 7 | 1 |
| 2 | Capacity, per planning group, editable (`SupplierCapacity.jsx:256`) | Supplier | 13 | 6 | 1 |
| 3 | Demand forecast SKU detail (`BuyerDemandForecast.jsx:122`) | PTI | 26 | 6 to 8 | 1 |
| 4 | Material requirement (`BuyerMaterialRequirement.jsx:175`) | PTI | 26 | 8 | 2 |
| 5 | Make warehouse room, fill (`BuyerReschedule/components/FillSection.jsx:39`) | PTI | 26 | 5 | 2 |
| 6 | What to order, fill (`BuyerOrderPlan/components/FillTable.jsx:27`) | PTI | 26 | 6 | 2 |
| 7 | Stock simulation (`inventory/stockSimulationDisplay.jsx:165`) | PTI | 13 | 4 | 2 |
| 8 | Stabilise, per series (`BuyerStabilise/components/PeriodTable.jsx:34`) | PTI | 13 to 26 | 8 | 3 [Proposed] |
| 9 | Submit per period (`SupplierForecastCommitments/components/PeriodSubmitSection.jsx:51`) | Supplier | Firm + Trade-off | 4 | 3 [Proposed] |
| 10 | Commitment per material (`SupplierForecastCommitments/components/MaterialSection.jsx:65`) | Supplier | Whole horizon, weekly then monthly | 8 | 3 [Proposed] |

Out of scope: tables whose rows are records with a week as one field (override ledger, pegs, later deliveries, exceptions, changes, upload results). Pivoting a list of records gives one column per record, not per week. The planner commitment grid already has periods as columns [Code: `BuyerCommitments/components/CommitmentGrid.jsx:43`].

Wave 3 is last because those tables carry long text (Stabilise's Rule column) or per-row Draft/Submit buttons and mix weeks with months (rows 9, 10). CAP-6 removes the Date input from row 10 first, which makes the pivot simpler.

**Rules.**

- BR-01. One shared component (`WeekGrid` in `components/ui-v2`) renders every table in scope. The ten tables do not each build their own. Today four pages copy the same `weekLabel` helper [Code: `BuyerMaterialRequirement.jsx:51`, `BuyerStabilise/utils.js:14`, `BuyerReschedule/utils.js:16`, `BuyerOrderPlan/utils.js:24`]; the component owns it.
- BR-02. Rows are metrics; columns are weeks, oldest left. The first column (metric name, with its unit and help) is sticky. The header row (week label `W41` + Monday date) is sticky.
- BR-03. The current week's column is marked. On load the grid scrolls so the current week is the first column shown after the label column.
- BR-04. A status row (e.g. "LTP against capacity") shows its pill in each week cell. A week in gap tints its whole column, as the row tint does today.
- BR-05. Actions stay weekly [MOM 3 U1]. An action or input that belonged to a week row sits in that week's column: an input row (Allocated, Additional capacity), a reason row whose select appears only in weeks that need one, and a per-week button row when the table has one (Gross → pegs, Submit all). A per-week detail panel (pegs) opens below the grid for the chosen week.
- BR-06. Tab moves along a row, week to week, then to the next row's first week. Enter in an input moves down to the next input row of the same week [Proposed].
- BR-07. When the columns overflow, the grid scrolls horizontally inside its card; the page never scrolls horizontally. A shadow on the right edge shows there is more.
- BR-08. A week column is at least 96 px wide [Proposed], enough for `100,000` and a pill.
- BR-09. A screen reader reads each cell with its metric and week as headers (`th scope="row"` and `scope="col"`).
- BR-10. Export, download and print keep today's layout (one row per week), so spreadsheets users built do not break [Proposed].

**Acceptance.**

- AC-01. The supplier Capacity table for one planning group shows 6 rows × 13 week columns and fits without vertical scroll on a 1080 px tall screen.
- AC-02. A supplier enters Allocated for 13 weeks with Tab only, left to right.
- AC-03. A week where allocated < LTP shows the reason select in that week's column only; the other weeks show a dash.
- AC-04. Scrolling right keeps the metric names and the week header in view.
- AC-05. Each of the ten tables, after its wave, shows the same figures as before (same cell values, same pills), tested per table.

---

## 3. CAP-2 Weekly/Monthly toggle

**Problem.** A 26-week table is still 26 columns. Planners also talk in months.

**Rules.**

- BR-01. Every `WeekGrid` has a Weekly/Monthly toggle. Weekly is the default. The choice is remembered per page for the viewer [Proposed].
- BR-02. A week belongs to the month holding at least 4 of its 7 days (Monday to Sunday). That is the month of its Thursday, the ISO 8601 rule [MOM 3 U3]. Example: the week of Mon 28 Sep 2026 to Sun 4 Oct 2026 has 3 days in September and 4 in October, so it counts in October.
- BR-03. Each metric declares how its weeks combine into a month [Proposed]:
  - **Flows** (LTP, forecast, allocated, additional capacity, gross, receipts, planned receipts, rent cost): sum of the weeks.
  - **Levels at the end** (projected end, on hand, available, plan fill): the month's last week.
  - **Levels at the start** (projected start): the month's first week.
  - **Lowest** (lowest fill): the minimum of the weeks.
  - **Status pills**: the worst week, with the count, e.g. "Cannot be supplied · 1 of 5 wk".
  - **Reasons and events**: every distinct value of the month's weeks.
- BR-04. A month column shows how many weeks it holds (4 or 5) and its first and last Monday.
- BR-05. The monthly view is read only. Inputs, reasons and per-week actions show only in the weekly view, because actions stay weekly [MOM 3 U1]. In monthly view, an editable table shows a line: "Switch to Weekly to edit."
- BR-06. A partial month at the horizon's edge is marked "partial" and still follows BR-02.
- BR-07. Tables whose own periods are months already (raw material on the commitment page [Code: `services/transitions/forecastConfig.js:59`]) show the toggle disabled with a note.

**Acceptance.**

- AC-01. The week of 28 Sep 2026 is counted in October; the week of 31 Aug 2026 (5 days in September) is counted in September.
- AC-02. On supplier Capacity, monthly LTP for October equals the sum of its ISO weeks' LTP.
- AC-03. A month holding one red week shows the red pill with "1 of 5 wk".
- AC-04. No input is editable in monthly view.

---

## 4. CAP-3 Three capacity states, shown the same everywhere

**Built.** The capacity check already has three outcomes per week: Within capacity, Needs additional capacity (LTP above allocated, within BE), Cannot be supplied (LTP above BE) [Code: `lib/i18n/inventoryCapacity.js:317-318`; `services/transitions/capacityRules.js:460`]. The MOM's "needs confirmation" matches "Needs additional capacity": PTI needs the supplier to confirm the extra [Proposed, CAP-D1].

**Rules.**

- BR-01. The three states use one colour each, on every surface: green Within capacity, amber Needs additional capacity, red Cannot be supplied. Buyer Capacity, supplier Capacity, Submit per period, and the planner exception list all read the same pill.
- BR-02. The accordion header on buyer Capacity counts each non-green state: "Needs additional: 2 wk · Cannot be supplied: 1 wk" (today it shows "Weeks below the LTP" and "Cannot be supplied").
- BR-03. An amber week offers the supplier one action, "Confirm additional capacity", which records that the additional capacity in that week is committed. Until confirmed, the week reads "Needs confirmation" [Proposed, CAP-D1].

**Acceptance.**

- AC-01. A week with LTP 95,000, allocated 90,000 and additional 10,000 shows amber on all four surfaces.
- AC-02. After the supplier confirms, it shows amber "Confirmed additional" and the header count drops [Proposed].

---

## 5. CAP-4 and CAP-5 Reasons

### CAP-4 Force Majeure and Discontinued

**Built.** There are two reason lists the supplier picks from when below demand: `capacityShortfall` (Capacity page) and `commitmentShortfall` (commitment page). Both ship with Capacity, Material, Logistics, Quality, Other [Code: `services/transitions/reasonCodes.js:76-77`]. The administrator can already add codes (BL-32).

- BR-01. Both starter lists gain `force-majeure` (Force Majeure / Keadaan kahar) and `discontinued` (Discontinued / Dihentikan). Order: Capacity, Material, Logistics, Quality, Force Majeure, Discontinued, Other.
- BR-02. Both new reasons require a note, like Other [Proposed].
- BR-03. Discontinued raises an alert to the planner and to Procurement for that supplier × material: the material needs another source [Proposed, CAP-D2].
- BR-04. Reports and the exception list show the reason name, never the code.
- AC-01. A supplier picks Force Majeure on a below-LTP week; Submit refuses until a note is entered.
- AC-02. The administrator's reason-code settings list both new codes and can rename or retire them.

### CAP-5 Reason filter

- BR-01. The planner's exception list (`BuyerCommitments`) gets a Reason filter: multi-select over the active `commitmentShortfall` codes, plus "No reason". It sits with the existing filters [Code: `BuyerCommitments/components/CommitmentFilters.jsx`] [AI 3].
- BR-02. Buyer Capacity gets the same filter over `capacityShortfall`, applied with "Gaps only" [Proposed].
- BR-03. The filter shows a count per reason ("Force Majeure (3)").
- AC-01. Choosing Discontinued shows only exceptions whose reason is Discontinued; clearing it restores the list.

---

## 6. CAP-6 and CAP-7 Simplify the supplier's confirmation

### CAP-6 Remove the commitment date

**Built.** The commitment row has a required date input, pre-filled with the period start [Code: `SupplierForecastCommitments/utils.js:26`; `services/transitions/forecastRules.js:1157-1159` refuses an empty date]. The older confirm panel has an optional "Committed date" [Code: `SupplierForecasts/components/ConfirmPanel.jsx:297`]. Nothing downstream reads the date except the responses table that displays it [Code: `SupplierForecasts/components/ResponsesTab.jsx:117`].

- BR-01. The supplier confirms a quantity per period, with no date [MOM 2 C4]. The Date input, its column, and the "Committed date" field and column are removed.
- BR-02. The rule no longer refuses a missing date. The record stores the period start in `commitmentDate` until the data contract drops the field, so nothing reading the record breaks [Proposed].
- BR-03. An upload template with a date column still parses; the column is ignored.
- AC-01. A supplier submits a commitment with quantity only.
- AC-02. An old upload file with a date column uploads without error.

### CAP-7 Hide Request revision

**Built.** The planner has Accept, Request revision and Move demand on an exception [Code: `BuyerCommitments/components/ExceptionRow.jsx:23`]. Request revision moves the line to "Revision requested", which the supplier sees on Home and on the commitment page [Code: `SupplierHome.jsx:202`; `services/transitions/forecastRules.js:614`].

**Recommendation: hide, don't delete** [Owner, 2026-10-12, "hide first"]. Hiding is a one-line revert if the team wants it back. The rules and the supplier's path stay tested.

- BR-01. A build flag `REQUEST_REVISION_ENABLED = false` hides the button. The planner keeps Accept and Move demand.
- BR-02. Lines already in "Revision requested" stay as they are: the supplier can still resubmit them, and they still count on the supplier's Home.
- BR-03. The flag is code, not an administrator setting, so it can't be switched on by accident [Proposed].
- AC-01. No exception shows Request revision.
- AC-02. A line already in Revision requested can still be resubmitted by the supplier.

---

## 7. CAP-8 and CAP-9 Planner actions

### CAP-8 Move demand to several suppliers

**Built.** Move demand picks one target from the material's other qualified suppliers [Code: `BuyerCommitments/components/ActionPanelBody.jsx:64-85`].

- BR-01. The Move demand panel lists the qualified suppliers, one row each: supplier, quantity, and the target's capacity headroom that week when known (BE − LTP).
- BR-02. The unit is the material's base unit (pcs or kg), shown on every row. The planner does not choose it [Proposed, CAP-D3].
- BR-03. The total moved must be greater than 0 and no more than the shortfall (forecast − commitment). Moving less than the shortfall leaves the rest as an open exception [Proposed].
- BR-04. A quantity above a target's headroom warns but does not block.
- BR-05. Each allocation adds demand to that supplier for the same material and period. Each target confirms it like any other demand. The source line records one log entry per allocation.
- BR-06. The note stays required.
- AC-01. A shortfall of 12,800 pcs is moved 8,000 to supplier B and 4,800 to C. B and C each see the new demand; the source line shows two allocations.
- AC-02. Entering 13,000 in total is refused with "More than the shortfall of 12,800 pcs".

### CAP-9 Blanket PO run-out

**Built.** A blanket (umbrella) PO shows ordered, released and remaining quantity or value [Code: `lib/i18n/callOffs.js:16-23`]. Nothing projects when it runs out.

- BR-01. For each blanket PO line, the hub projects week by week: remaining − (LTP for that supplier × material in the week). It assumes call-offs follow the plan [MOM 2 C2].
- BR-01a. Several blanket PO lines for the same supplier × material draw down one after another, oldest PO first. Each week's LTP is taken from the oldest line that still has a balance, and any excess spills to the next line in the same week. Each line has its own run-out week; the group's run-out, its "new PO needed by" week and its single alert belong to the last line. Earlier lines show which PO is next in line [Owner, 2026-10-13, CAP-D9].
- BR-02. A value-only line (no quantity) uses LTP × the line's unit price [Proposed].
- BR-03. The **run-out week** is the first week the projection goes below zero. The **new PO needed by** week is the run-out week minus the PO lead time for that material [Proposed: lead time from the material master; 2 weeks if missing].
- BR-04. The call-off page shows both weeks on the blanket PO panel, and a list "Blanket POs running out" sorted by "new PO needed by".
- BR-05. An alert is raised when "new PO needed by" is within 4 weeks [Proposed].
- BR-06. When the projection never goes below zero within the forecast horizon, the panel says "Covers the forecast horizon (26 wk)".
- AC-01. A blanket PO with 200,000 pcs remaining against LTP 72,800/wk shows run-out in week 3 and, with a 2-week lead time, "new PO needed by" week 1.

---

## 8. CAP-10 to CAP-12 DA horizon

**Definition used.** DA (Demand Anticipation) = LTP + ROP PTI − SOH, per supplier × material per week (ENG-D22, `FORECAST-ENGINE-REQUIREMENTS.md`). The hub has no DA figure today. The nearest built pieces are the published forecast's zones (REQ-E06-01 BR-04) and the What to order recommendations (REQ-E14-05). These requirements add DA as its own record. **Ary Hidayat's spike use case (AI 1) is the source of truth; every [Proposed] below is a placeholder until it lands.**

**Design (accepted 2026-10-13).** `SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md` sets how these rules are built: the name "Demand anticipation" (never "DA", which means Delivery Agreement in the code), the grain, the formula (stock and reorder point counted once, in week 1), the publication store and verb, planner-recorded consumption, open supply as released call-offs by need week, and Ary's use case as a golden test fixture. Decisions CAP-D10 to CAP-D16 below.

### CAP-10 DA frozen in the current horizon

- BR-01. The horizon is 4 weeks [MOM 4 D2]. The current horizon is the 4 weeks starting with the current week [Proposed].
- BR-02. When DA is published for a horizon, its 4 weeks are frozen. A recalculation (new LTP, stock, consumption) changes only week 5 onward [MOM 4 D1].
- BR-03. The planner sees frozen weeks with a lock and the recalculated figure beside them as "would be" (read only).
- BR-04. The horizon rolls weekly [Proposed]: each Monday, week 5 enters the frozen window.
- AC-01. A new LTP that raises week 2 by 10,000 leaves week 2's DA unchanged and shows "would be +10,000".

### CAP-11 Lower consumption absorbed in the next horizon

- BR-01. At the end of each week, the hub compares actual consumption with DA for the frozen weeks so far. The **excess** is the sum of (DA − consumption) over weeks where consumption was lower.
- BR-02. The excess is taken off DA from week 5 onward [MOM 4 D2].
- BR-03. It must be fully absorbed by week 8 (week 4 of the next horizon) [MOM 4 D2]. The hub spreads it evenly over weeks 5 to 8, never below 0 in a week; what one week cannot take moves to the next [Proposed].
- BR-04. If it cannot be absorbed by week 8 (DA in weeks 5 to 8 is smaller than the excess), the hub raises an alert to the planner with the remaining amount.
- BR-05. Each adjustment shows on the week as "−n, absorbed from W41 to W44 excess".
- AC-01. Excess 12,000 over DA of 20,000/wk in weeks 5 to 8 gives 17,000/wk.

### CAP-12 Additional PO when PO < DA

- BR-01. For each week, if the open PO quantity for supplier × material is below DA, the shortfall is DA − open PO [MOM 4 D3].
- BR-02. The hub recommends an additional PO for the shortfall on What to order, marked "PO below DA". The planner raises it; the hub does not post a PO to SAP itself [Proposed, CAP-D4].
- BR-03. A blanket PO with remaining quantity is offered first, as a call-off, before a new PO.
- AC-01. DA 30,000 and open PO 22,000 in week 6 recommend 8,000 additional.

---

## 9. What this does not change

- F1 and F2 (forecast grain and forecast quality) [Owner, 2026-10-12].
- Registration (parked, out of scope).
- The planner commitment grid's layout (already weeks as columns).

---

## 10. Decisions (CAP-D1 to D8 accepted 2026-10-12, CAP-D9 to D16 2026-10-13)

| ID | Question | Recommendation | Outcome |
|---|---|---|---|
| CAP-D1 | Is "needs confirmation" the same as "Needs additional capacity", and does the supplier confirm it per week? | Yes, and yes (CAP-3 BR-03) | Accepted, 2026-10-12 |
| CAP-D2 | What should Discontinued trigger? | Alert to planner and Procurement to find another source (CAP-4 BR-03) | Accepted, 2026-10-12 |
| CAP-D3 | In Move demand, does the planner choose pcs or kg, or does the unit follow the material? | Follows the material's base unit (CAP-8 BR-02) | Accepted, 2026-10-12 |
| CAP-D4 | Does "create additional PO" mean the hub recommends it, or posts it? | Recommends; the planner raises it (CAP-12 BR-02) | Accepted, 2026-10-12 |
| CAP-D5 | Order of the CAP-1 waves | Wave 1 Capacity (both) + Demand forecast; wave 2 MRQ, Reschedule, Order plan, Simulation; wave 3 Stabilise and the commitment page | Accepted, 2026-10-12 |
| CAP-D6 | Monthly view editable? | No, read only (CAP-2 BR-05) | Accepted, 2026-10-12 |
| CAP-D7 | Exports keep one row per week? | Yes (CAP-1 BR-10) | Accepted, 2026-10-12 |
| CAP-D8 | Every other [Proposed] value in this file | Accept as starting values; CAP-10 to CAP-12 values are replaced by Ary's use case | Accepted, 2026-10-12 |
| CAP-D9 | Several blanket POs for one supplier × material: each drawn by the full LTP, pooled, or one after another? | One after another, oldest first; one alert per group, on the last PO (CAP-9 BR-01a) | Accepted, 2026-10-13 |
| CAP-D10 | Name | "Demand anticipation" on screen, `demandAnticipation` in code, never "DA" | Accepted, 2026-10-13 |
| CAP-D11 | Grain and splitting | Supplier × material × week; monthly raw-material LTP spread by day; stock and reorder point shared by LTP share over the frozen 4 weeks | Accepted, 2026-10-13 |
| CAP-D12 | Formula | Stock and reorder point counted once, in week 1; later weeks equal the LTP; open orders not netted; one function checked by Ary's fixture | Accepted, 2026-10-13 |
| CAP-D13 | Freezing | Append-only publication store; "Publish demand anticipation" verb on `forecast:publish`; a frozen week keeps its first value; "would be" beside it; horizon rolls on publish | Accepted, 2026-10-13 |
| CAP-D14 | Consumption | Recorded by the planner (typed or uploaded), marked as awaiting the SAP goods-issue feed; split by demand anticipation share | Accepted, 2026-10-13 |
| CAP-D15 | Open supply and the extra PO | Released call-offs by need week; call-off on the oldest blanket line first, otherwise "New PO needed"; own section on What to order | Accepted, 2026-10-13 |
| CAP-D16 | Ary's numbers | Golden fixture and test; placeholders in one config block | Accepted, 2026-10-13 |
