# Supplier Hub: In-house Forecast Engine requirements (E14)

| | |
|---|---|
| Version | 0.8 draft, 2026-09-24 |
| What this is | Detailed requirements for the demand and material forecast engine PTI builds itself (owner decision ENG-1), with each calculation explained |
| Status | Every requirement is **Proposed**. The decision to build is Validated (ENG-1), and 12 of the 18 engine decisions are decided (ENG-D1 to D9 and ENG-D15 to D17, section 4). The rest of the detail has not yet been reviewed by the Material Planner |
| Sources | ENG-1 (`SUPPLIER-HUB-REQUIREMENTS.md` section 9); methods and evidence in `research/FORECAST-METHOD-SPEC.md`; problem analysis in `research/FORECAST-BEST-PRACTICE-2026-09.md` |

## How to read this

- **Template.** The same requirement template as `SUPPLIER-HUB-REQUIREMENTS.md` section 1.3, with one extra block, **Calculation**. It explains the formula in plain words and gives a small worked example.
  - The numbers in the examples are illustrative, not PTI data.
  - The formulas and their evidence are in `research/FORECAST-METHOD-SPEC.md`, cited as `[Spec D1]`, `[Spec M3]` and so on.
- **Source tags.** As in the main requirements file (`[Owner]`, `[Code]`, `[Proposed]`, `[Market]`), plus `[Spec xx]` for a method taken from the method spec.
- **Order.** Requirements are numbered in the suggested build order.
  - **Steps 1 to 6** work on SAP's forecast. They move the problem measures before PTI's own demand model exists.
  - **Steps 7 to 11** replace SAP's forecast with the engine's own.
  - **Step 12** is Phase 2.
- **The problem the engine must move** (owner's "Challenge & Gaps" slides):
  - Scheduled Confirmed: 67% against 100%
  - CFOT: 36.4% against 100%
  - Packaging warehouse: 121% to 142% against 80%
  - Raw material warehouse: about 106% against 80%
  - Shortage and excess at the same time
- **Personas:**
  - MP: Material Planner
  - SUP: supplier
  - BUY: buyer
  - ADM: Hub administrator

---

## 1. How the engine fits together

```
                  SAP / planning data                    Supplier data in the Hub
  sales history · promo & launch plan · BOM    commitments · confirmations · receipts · ASNs
  lead times · MOQ · stock · open orders                              │
                      │                                               │
                      ▼                                               ▼
              ┌──────────────────────── E14-01 Data foundation ────────────────────────┐
              ▼                                                                        ▼
   E14-07 Finished-goods forecast ──► E14-09 Demand range              E14-02 Reliability and
   E14-08 Launches and promotions        │                             plan-change measures
              │                          │                                        │
              ▼                          ▼                                        │
   E14-03 Material requirement ◄── E14-04 Safety stock, safety lead time, ROP ◄───┘
              │
              ▼
   E14-05 Order sizing (MOQ, warehouse space) ──► REQ-E09-01 replenishment recommendation
              │
              ▼
   E14-06 Stabilise and publish ──► REQ-E06-01 forecast publication to suppliers

   Around all of it: E14-10 model selection by service · E14-11 bias and override control
   Warehouse relief: E14-13 reschedule or cancel open orders (reads E14-03, E14-04, E14-05)
   Phase 2: E14-12 where to hold buffers
```

**Until each step is live, its SAP equivalent stays the source** [Owner, ENG-1]:
- E14-03 to E14-06 run on SAP's net requirement until E14-07 is live.
- REQ-E06-01 and REQ-E09-01 publish SAP's numbers until E14-05 and E14-06 are live.

---

## 2. Cross-cutting rules (apply to every E14 requirement)

- **X-01. The Hub owns the engine now; SOMO owns it later.** Each calculation is a pure function: inputs in, result out, with the clock passed in. This lets it move to SOMO unchanged [Owner, ENG-1; Proposed].
- **X-02. Every published number can be traced.** For every forecast quantity, ROP and recommendation the engine keeps:
  - the input snapshot
  - the method and its version
  - the parameters
  - the run time

  A planner can open any number and see how it was produced [Proposed].
- **X-03. Every result carries an honest label.** Engine output says whether it ran on live data or on simulated data. Simulated output is never shown to a supplier, which is the existing rule for simulated publications (`src/services/sdc/types.ts:287`) [Code].
- **X-04. Runs follow the publication cadence.** Packaging is weekly and raw material monthly (REQ-E06-01 BR-02). The planner can trigger an extra run; this is the emergency re-publication rule [Code].
- **X-05. Parameters belong to the administrator.** Service targets, zone lengths, the stabilisation weight, the tolerance band and cost rates are set on the administration page and logged, the same as today's rule values (BL-32) [Code; Proposed].
- **X-06. A planner can override, with a reason.** Every override records who, when, the old value, the new value and a reason code. E14-11 measures whether overrides help [Proposed].

---

## 3. Requirements

### REQ-E14-01  Engine data foundation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; ENG-D1; BL-100; PRD I14 | MVP | P0 [Proposed] | Master Data Management team (data); IT (SAP integration) | MP, ADM | Proposed |

**Business value.** Every calculation in the engine depends on clean inputs. The owner's slides name low stock accuracy as a gap, and a wrong on-hand figure makes the engine reorder stock PTI already holds, which makes the excess problem worse. This requirement defines the inputs and refuses to run a calculation whose inputs fail a quality check.

**Experience.**
- MP: sees one data-health page. It shows each input with its freshness, coverage and quality check, and which calculations are blocked by a failed check.
- ADM: sees the feed status and last load time for each source.

**Step-by-step (Planner, Monday).**
1. The weekly packaging run is due. The planner opens Data health.
2. Sales history is fresh (loaded Sunday night). Bills of materials are fresh. Stock on hand for warehouse WH-2 is 9 days old.
3. The page shows that E14-03 (material requirement) will use WH-2 stock marked "stale", and lists the 42 materials affected.
4. The planner asks the warehouse to reload WH-2, then starts the run.

**Business rules.**
- BR-01. The engine reads the inputs in the table under **Data and integration**. Each input has a named source and a freshness limit [Proposed].
- BR-02. **Sales history** is weekly per finished-good SKU, 2 to 3 years deep. A week in which the SKU was out of stock is flagged, so zero sales in that week are not read as zero demand [Spec D1].
- BR-03. **Stock accuracy check.** The engine flags a material as low-confidence when its latest cycle count differed from system stock by more than the tolerance: **2% to start**, set by the administrator and tightened per material class after the first counting cycle. High-volume packaging is counted most often. For flagged materials:
  - the recommendation is marked for review
  - it is not released automatically

  [Owner, 2026-09-23, ENG-D2]
- BR-04. **Minimum history.** A SKU with less than one full season of history (52 weeks) is forecast by E14-08 (launch method) rather than E14-07 [Spec D1, D6].
- BR-05. A calculation whose required input is missing or older than its freshness limit either:
  - does not run for the affected items, and says so, or
  - runs with the stale input clearly marked, if the planner chooses

  It never runs silently on stale data [Proposed].
- BR-06. **Data ownership.** The Master Data Management team owns the engine's input data: the forecast inputs, the breakdown through the bill of materials, stock, and ERP master data. The feeds are integrated with SAP later [Owner, 2026-09-23, ENG-D1].
- BR-07. **Synthetic data until SAP is connected.** Until the Master Data Management team connects SAP, the engine runs on a synthetic dataset [Owner, 2026-09-23, ENG-D1]:
  - It is built to reproduce the measures on the owner's "Challenge & Gaps" slides: a confirmation rate near 67%, CFOT near 36%, and warehouses over capacity. The screens and measures then behave realistically [Proposed].
  - Every result from it carries the simulated label (X-03) and is never shown to a supplier [Code].
  - Results on synthetic data prove the calculations, not the business answer. How much of the low CFOT comes from suppliers not confirming is answered only on SAP data [Proposed].

**Calculation.** No formula; this requirement defines what goes in.

The one check with arithmetic is **stock accuracy**:
- Stock accuracy = |counted − system| ÷ system
- *Example:* system stock 10,000, counted 9,200. The gap is 800, which is 8%. With a tolerance of 2%, the material is flagged, and its recommendations wait for the planner.

**Edge cases.**
- A new material with no stock record: treated as zero on hand, and flagged [Proposed].
- A bill of materials that changed during the horizon (new formula version): the engine uses the version valid in each week [Proposed].

**Acceptance criteria.**
- AC-01. Data health shows every input with its source, last load time and quality status.
- AC-02. A run on stale or missing input either skips the affected items or marks them. The run log says which it did.
- AC-03. Materials failing the stock-accuracy check never get an automatically released recommendation.

**Data and integration.**

| Input | Grain | Source | Used by |
|---|---|---|---|
| Sales (sell-in) history, stock-out flags | SKU × week | SAP | E14-07, E14-09, E14-10 |
| Price, promotion calendar, launch plan | SKU × week | Marketing / planning | E14-07, E14-08 |
| SKU → brand → category map | SKU | SAP | E14-07 |
| Bills of materials with quantity-per, scrap, yield, validity dates | FG → bulk → material | SAP / SOMO master (C8 §4) | E14-03 |
| Lead time per material and supplier | Material × supplier | SAP; Hub delivery history | E14-03, E14-04, E14-06 |
| MOQ and order multiple | Material × supplier | SAP purchasing info record | E14-05 |
| Volume per unit (pallet or m³); owned warehouse capacity | Material; warehouse | Warehouse | E14-05 |
| Holding, ordering and rented-space cost rates | Material group | Finance | E14-05 |
| Stock on hand, cycle-count results | Material × warehouse | SAP | E14-01 BR-03, E14-03 |
| Open POs and call-offs at the supplier-confirmed date | Line | Hub | E14-03, E14-02 |
| Goods receipts | Line | SAP (REQ-E07-06) | E14-02, E14-04 |

**Metrics.** Leading: share of materials passing all quality checks. Lagging: stock-accuracy rate.

**Open items.**
- BL-103: the feed specification, drafted as `FORECAST-ENGINE-FEED-SPEC.md`, for the Master Data Management team to confirm.
- C8-IDENTITY-GRAIN: material identity between the SOMO master and the Hub.

---

### REQ-E14-02  Supplier reliability and plan-change measures

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; BL-99; REQ-E06-02, REQ-E06-03, REQ-E10-01 | MVP | P0 [Proposed] | Material Planner | MP, BUY, SUP | Proposed |

**Business value.**
- The owner states that low CFOT is caused by both PTI's plan changes and suppliers, and more often by suppliers not confirming. This requirement measures each cause separately, per supplier.
- Measuring separately lets the Hub enforce confirmation, and lets PTI check its own plan discipline.
- It needs no new model and uses data the Hub already holds, so it can start first.
- It moves Scheduled Confirmed and CFOT.

**Experience.**
- MP: sees each supplier's commitment reliability, confirmation rate and miss split, and PTI's own plan-change measures next to them.
- BUY: sees the same per supplier in supplier performance and sourcing.
- SUP: sees its own confirmation rate, its commitment reliability, and PTI's plan-change figure for its materials.

**Step-by-step (Planner, monthly review).**
1. The planner opens Reliability for packaging suppliers.
2. Supplier A: confirmation rate 58%, commitment reliability 71%. Of its 40 missed lines, 26 were never confirmed, 9 were supplier-caused and 5 were PTI-caused.
3. PTI's own figure for Supplier A's materials: 18% of schedules were changed inside the supplier's lead time.
4. The planner sees that the biggest lever for Supplier A is confirmation. The buyer raises it in the supplier review, and the Hub's commit deadlines and escalation already apply.

**Business rules.**
- BR-01. **Confirmation rate** = PO lines and forecast periods confirmed by their deadline ÷ all lines and periods due in the window. This is the Hub's own measure of Scheduled Confirmed [Proposed].
- BR-02. **Commitment reliability** = quantity received on or before the committed date ÷ committed quantity, per supplier and window [Spec G3].
- BR-03. **Every missed line is put in exactly one class** [Spec G3; Proposed]:
  - **Never confirmed:** the supplier did not confirm by the deadline.
  - **PTI-caused:** PTI changed the quantity or date inside the supplier's lead time, or revised a Trade-off period beyond the tolerance band (E14-06), and the supplier had not re-confirmed.
  - **Supplier-caused:** the supplier confirmed, PTI made no change inside the lead time, and the receipt was short or late against the commitment.
- BR-04. **A change PTI makes and the supplier re-confirms becomes the new basis.** The supplier is then measured against the re-confirmed commitment, not the original one. This is the SCOR rule [Spec G3; Market].
- BR-05. **PTI's plan-change measures**, per supplier and material:
  - share of schedules changed inside the supplier lead time [Spec G1]
  - MASC, the size of the changes (see Calculation)
- BR-06. CFOT is reported against both the requested date and the committed date. The gap between the two is shown [Spec G3].
- BR-07. **Suppliers see their own measures from day one:** confirmation rate, commitment reliability, and PTI's plan-change figure for their materials. A supplier never sees another supplier's figures [Owner, 2026-09-23, ENG-D3].

**Calculation.**

*Commitment reliability*
- The supplier committed 10,000 units by 10 October. It delivered 6,000 on 9 October and 4,000 on 14 October.
- Reliability = 6,000 ÷ 10,000 = **60%**.

*Who caused the miss*
- The original PO said 8,000. On 3 October, inside the 14-day lead time, PTI raised it to 10,000. The supplier re-confirmed 10,000 on 4 October.
- The re-confirmation is the new basis (BR-04). The late 4,000 is therefore **supplier-caused**.
- Had the supplier not re-confirmed, the line would be **PTI-caused**.

*Share of schedules changed inside lead time*
- Schedules changed inside the supplier lead time ÷ all schedules published in the window.
- *Example:* 9 of 50 changed = **18%**.

*Size of changes (MASC)*
- Take the average change between two versions for the same weeks. Divide it by the product's normal week-to-week movement, so products of different sizes compare fairly.
- *Example:* previous version for weeks 5 to 8 = 1,000 / 1,200 / 1,100 / 900. New version = 1,000 / 1,500 / 1,100 / 700.
- The changes are 0, 300, 0 and 200, an average of 125.
- If the product normally moves 250 from one season to the next (its seasonal-naive error), MASC = 125 ÷ 250 = **0.5**. The plan changed by half its normal noise.
- *MASC-I* uses the same formula against the **first** version the supplier ever saw for that week. It shows the total drift, not only the last step.

**Edge cases.**
- A line cancelled by PTI inside the lead time: PTI-caused, and excluded from the supplier's reliability [Proposed].
- A partial confirmation (confirms 8,000 of 10,000): counts as confirmed for 8,000. The gap follows REQ-E06-03 [Proposed].

**Acceptance criteria.**
- AC-01. Every missed line in the window has exactly one class, and the three classes add up to all misses.
- AC-02. A PTI change that the supplier re-confirmed moves the measurement basis to the re-confirmed commitment.
- AC-03. A supplier sees its own measures and PTI's plan-change figure for its materials, and never another supplier's.

**Data and integration.** Reads from the Hub:
- forecast versions (REQ-E06-01)
- commitments (REQ-E06-02)
- PO responses (REQ-E07-02)
- call-offs (REQ-E09)
- goods receipts (REQ-E07-06)

It feeds supplier performance (REQ-E10-01) and sourcing filters (REQ-E03-01). Until SAP is connected it runs on the synthetic dataset (E14-01 BR-07).

**Metrics.** Leading: confirmation rate. Lagging: CFOT; share of misses that are never confirmed.

**Open items.**
- BL-66: the CFOT calculation differs from its definition in five places. Fix it before E14-02 reports CFOT.

---

### REQ-E14-03  Material requirement calculation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; REQ-E06-01 BR-01; REQ-E09-01 BR-01 | MVP | P0 [Proposed] | Material Planner | MP | Proposed |

**Business value.**
- Turns the finished-goods plan into what each packaging and raw material is needed, when, and how much must be ordered. The result is net of stock and of what is already on order.
- It nets against the supplier's **confirmed** dates, so a date a supplier has not confirmed does not count as covered. This is the link between Scheduled Confirmed and shortage.
- It moves shortage, warehouse utilisation and CFOT.

**Experience.**
- MP: sees, per material and week, the requirement broken down: gross requirement, stock, receipts, safety stock, net requirement and planned order. Each line links to the finished goods that caused it.

**Step-by-step (Planner).**
1. The planner opens bullet case BC-220 for week 10.
2. The screen shows a gross requirement of 20,400 from 3 lipstick SKUs. It also shows 5,000 projected on hand, 6,000 confirmed from Supplier A, and a safety stock of 3,000.
3. The net requirement is 12,400. The planned order is 15,000, rounded to the MOQ and multiple, and it must be released in week 6.
4. The planner opens the 20,400 and sees which SKUs and which forecast weeks it came from.

**Business rules.**
- BR-01. **Forecast consumption:** sales orders replace the forecast in the weeks they fall into, so the two are not counted twice. The window is set per SKU group [Spec M1].
- BR-02. **Explosion order:** items are processed by low-level code, finished goods first, then bulk, then materials, so every item's full requirement is known before it is netted [Spec M2].
- BR-03. **Scrap and yield:** the component quantity is raised by its scrap percentage, and the order quantity is divided by its yield [Spec M2].
- BR-04. **Netting uses:**
  - stock on hand, subject to E14-01 BR-03
  - open POs and call-offs at the **supplier-confirmed** date and quantity
  - safety stock from E14-04

  An unconfirmed line counts as a receipt only if the planner chooses to, and is then marked [Proposed].
- BR-05. **Time-phasing:** a planned receipt in week t is released in week t minus the lead time. Where E14-04 sets a safety lead time, that is added to the lead time [Spec M2, M7].
- BR-06. Order size rounding (MOQ, multiples, warehouse space) comes from E14-05. This requirement produces the net requirement E14-05 sizes [Spec M5].

**Calculation (one material, one week).**
1. **Gross requirement** = the finished-goods quantities using this material × quantity-per × (1 + scrap%).
   - *Example:* 20,000 lipsticks × 1 case each × 1.02 = **20,400**.
2. **Net requirement** = gross requirement + safety stock − (projected stock at the start of the week + confirmed receipts in the week). If that is negative, it is zero.
   - *Example:* 20,400 + 3,000 − (5,000 + 6,000) = **12,400**.
3. **Planned order** = the net requirement, sized by E14-05.
   - *Example:* MOQ 10,000, multiple 5,000, so 12,400 becomes **15,000**.
4. **Release week** = need week − lead time.
   - *Example:* week 10 − 4 weeks = **week 6**.
5. **Projected stock at the end of the week** = start stock + receipts + planned receipt − gross requirement.
   - *Example:* 5,000 + 6,000 + 15,000 − 20,400 = **5,600**, which stays above the safety stock of 3,000.

**Edge cases.**
- A material used by many finished goods (shared packaging): its gross requirement is the sum over all of them, and each part stays traceable [Proposed].
- A planned order whose release week is already past: shown as "late to release" with its shortfall week, not silently moved [Proposed].

**Acceptance criteria.**
- AC-01. For any material and week, the screen shows gross requirement, stock, receipts, safety stock, net requirement and planned order, and they reconcile by the formula above.
- AC-02. An unconfirmed open line does not reduce the net requirement unless the planner includes it, and then it is marked.
- AC-03. Every gross requirement can be traced to the finished-goods quantities that caused it.

**Data and integration.**
- Inputs: bills of materials, stock, open POs and call-offs, lead times (E14-01); the finished-goods plan (SAP now, E14-07 later).
- Outputs: net requirements to E14-05.

**Metrics.** Leading: share of net requirement covered by confirmed receipts. Lagging: shortage weeks per material.

**Open items.** ENG-D4: whether planned orders from other plants or intercompany transfers are in scope.

---

### REQ-E14-04  Safety stock, safety lead time and reorder point

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; REQ-E08 BR-04; REQ-E09-01 | MVP | P0 [Proposed] | Material Planner | MP, ADM | Proposed |

**Business value.**
- Replaces SAP's reorder point with one sized from PTI's own forecast errors and supplier delivery history.
- The textbook safety-stock formula is shown in recent research to be the least accurate method [Spec M3], which is one reason shortage and excess sit side by side.
- Late suppliers are covered with extra time (a safety lead time), not extra stock, because extra stock does not help when the problem is timing [Spec M7].
- It moves shortage and warehouse utilisation.

**Experience.**
- MP: sees each material's safety stock, safety lead time and reorder point, the service target behind them, and the history they came from.
- ADM: sets the service target per material group.

**Step-by-step (Planner).**
1. The planner opens pump bottle PB-50.
2. The screen shows a 90% fill-rate target. The safety stock of 1,500 comes from the last 30 backtest points. The safety lead time of 3 days comes from Supplier B's last 10 deliveries.
3. The planner compares it with SAP's old safety stock of 4,000. The difference shows how much space the new calculation frees.

**Business rules.**
- BR-01. **Safety stock comes from the engine's own forecast errors,** measured over the lead time plus the review period at many past points. The safety stock is the error level that is exceeded only as often as the service target allows [Spec M3].
- BR-02. **The service target is a fill rate**, the share of demand filled from stock, not a cycle service level. With large MOQ lots, a cycle-service target over-buffers. The targets are tiered [Owner, 2026-09-23, ENG-D5]:
  - **95%** for high-volume packaging on production-critical lines
  - **90%** for other materials
  - **85%** for slow-moving materials

  Until the Material Planner names the materials in each tier, the engine assigns them by volume: the top 20% of materials by volume get 95%, and slow movers (E14-07 BR-03) get 85%. This default is marked on screen (ENG-D14).
- BR-03. **Safety lead time per supplier and material group** = the delay between the confirmed date and the actual receipt date that is exceeded only as often as the administrator allows [Spec M7].
- BR-04. **Reorder point** = expected demand over (lead time + review period) + safety stock [Spec M3].
- BR-05. Until a material has enough history (30 backtest points), it uses SAP's safety stock, and this is marked [Proposed].
- BR-06. Safety stock and ROP are recalculated each run, and the change from the last run is shown [Proposed].

**Calculation.**

*Safety stock*
- At 10 past points (a real run uses at least 30), the engine compares what it would have forecast for the next 5 weeks (4-week lead time plus 1-week review) with what actually sold.
- The shortfalls (actual − forecast), sorted: −1,200, −800, −300, 0, 200, 400, 600, 900, **1,500**, 2,600.
- For a 90% target, take the value that 9 of the 10 are at or below: **1,500**. That is the safety stock.
- The textbook formula would assume the errors follow a normal curve. This method uses the errors PTI actually had, so it does not over-buffer when the errors are lopsided.

*Safety lead time*
- Supplier B's last 10 receipts arrived this many days after the confirmed date: 0, 0, 0, 1, 1, 2, 2, **3**, 5, 9.
- At an 80% setting, take the value that 8 of 10 are at or below: **3 days**.
- Planned orders to Supplier B are released 3 days earlier.

*Reorder point*
- Average demand 5,000 a week × 5 weeks = 25,000, plus safety stock 1,500 = **ROP 26,500**.

**Edge cases.**
- A supplier with fewer than 5 receipts: no safety lead time is calculated, and the material group's default is used and marked [Proposed].
- A material whose errors are all one sign (always under-forecast): E14-11 raises a bias alarm, because safety stock should not keep absorbing a biased forecast [Spec G2].

**Acceptance criteria.**
- AC-01. Each material shows its safety stock, safety lead time and ROP with the target, the history window and the method used.
- AC-02. A material with too little history shows SAP's value, marked as such.
- AC-03. For a sample of materials, an independent recalculation from the stored history gives the same safety stock.

**Data and integration.**
- Inputs: backtest errors (E14-10); receipt history (E14-02).
- Outputs: safety stock to E14-03; ROP to REQ-E09-01 and REQ-E08.

**Metrics.**
- Leading: achieved fill rate against target, per material group.
- Lagging: shortage weeks; average stock ÷ warehouse capacity.

**Open items.**
- ENG-D14: the Material Planner's list of materials per service tier.
- REPL: which replenishment method applies to which segment.

---

### REQ-E14-05  Order sizing within MOQ and warehouse space

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; REQ-E09-01 | MVP | P0 [Proposed] | Material Planner | MP, ADM | Proposed |

**Business value.**
- Packaging warehouses run at 121% to 142% of capacity.
- Today an order is rounded up to its MOQ without regard to space.
- This requirement sizes orders so the plan fits the owned warehouse. Rented space is treated as a visible cost the plan must weigh, not as an overflow nobody planned.
- It moves warehouse utilisation, and shortage through fewer emergency orders.

**Experience.**
- MP: sees the recommended order per material and week, the projected warehouse fill against capacity, and any week where rented space is used, with its cost.

**Step-by-step (Planner).**
1. The planner opens Recommendations for packaging, weeks 6 to 13.
2. The projected packaging warehouse fill is 78% to 96%, with rented space needed in week 9, shown with its rupiah cost.
3. The screen explains the choice. Ordering carton CT-10 in two lots instead of one keeps week 9 within capacity for less than the rented-space cost.
4. The planner releases the recommendations into call-offs (REQ-E09-01).

**Business rules.**
- BR-01. The engine chooses when and how much to order for all materials sharing a warehouse together. It minimises ordering cost + holding cost + rented-space cost, subject to [Spec M5]:
  - demand met each week
  - MOQ and order multiples
  - the warehouse volume limit
- BR-02. A single-material fallback (Wagner–Whitin, then round up to MOQ and multiple) is used when the joint calculation cannot run [Spec M5].
- BR-03. Inside the supplier's lead time, a change to an already-planned order carries a penalty, so the plan does not churn close in (links to E14-06) [Spec M5, M6; Proposed].
- BR-04. Each recommendation shows why it was chosen: the cost it saved and the constraint that bound it [Proposed].
- BR-05. Recommendations become call-offs only when a planner releases them. The existing REQ-E09-01 rules apply (umbrella PO balance, reason on edit) [Code].

**Calculation.**

*Why ordering more at once is not always cheaper.* One material needs 1,000 units in each of weeks 1, 2 and 3. Each order costs 500. Holding one unit for one week costs 0.2.

| Plan | Order cost | Holding cost | Total |
|---|---|---|---|
| 3,000 in week 1 (2,000 held after week 1, 1,000 after week 2) | 500 | 3,000 unit-weeks × 0.2 = 600 | **1,100** |
| 2,000 in week 1, 1,000 in week 3 | 1,000 | 1,000 × 0.2 = 200 | 1,200 |
| 1,000 each week | 1,500 | 0 | 1,500 |

Without space limits, one big order is cheapest.

*With space limits.* Now the warehouse has room for 1,500 units, and rented space costs 1.0 per unit per week. The one-big-order plan holds 2,000 after week 1, so 500 units spill into rented space for a week, costing 500. Its total becomes 1,600, and **the two-order plan (1,200) wins**. The engine does this comparison for all materials in the warehouse at once.

*How it is solved.* The comparison is written as an optimisation model. The HiGHS solver finds the cheapest plan. HiGHS runs inside the Hub through its WebAssembly build [Spec M5].

**Edge cases.**
- No plan fits the warehouse even with maximum rented space: the engine shows the shortfall weeks and lets the planner choose between rented space and a later delivery [Proposed].
- An MOQ larger than 26 weeks of demand: flagged as a sourcing issue for the buyer (BUY), not just a planning one [Proposed].

**Acceptance criteria.**
- AC-01. Every recommended order respects its MOQ and multiple.
- AC-02. The projected warehouse fill is shown per week, and any rented space is shown with its cost.
- AC-03. For a published test case, the engine's plan cost matches the known optimum.

**Data and integration.**
- Inputs: net requirements (E14-03); MOQ, multiples, unit volume, capacity and cost rates (E14-01).
- Outputs: recommendations to REQ-E09-01.

**Metrics.** Leading: projected warehouse fill against 80%. Lagging: actual warehouse utilisation; rented-space cost.

**Open items.**
- ENG-D6: cost rates for holding, ordering and rented space, from Finance.
- ENG-D7: whether raw material and packaging share one capacity.

---

### REQ-E14-06  Stabilise and publish the plan to suppliers

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; REQ-E06-01; REQ-E06-02; CR-21 | MVP | P0 [Proposed] | Material Planner | MP, SUP | Proposed |

**Business value.**
- Suppliers give lower service to buyers whose plans keep changing [Spec G1, Terwiesch et al. 2005].
- This requirement keeps the Firm zone fixed, limits how far Trade-off periods can move each version, and damps small week-to-week noise before publication.
- Suppliers get a plan worth confirming.
- It also publishes a range next to the quantity, so suppliers can plan upside capacity.
- It moves Scheduled Confirmed and CFOT.

**Experience.**
- MP: before publishing, sees each period's raw engine value, the stabilised value, and any period that breaks the tolerance band. Breaking the band needs a reason.
- SUP: sees the quantity per period, as today. In Trade-off and Forecast periods it also sees an upper figure, and it can commit upside against it (REQ-E06-02 BR-08).

**Step-by-step (Planner, Monday).**
1. The engine proposes the new packaging version. Week 7 of carton CT-10 (a Trade-off week) moves from 1,200 to 1,500.
2. After damping, the proposed publication is 1,350.
3. The tolerance band for that week is 1,080 to 1,320, so 1,350 is outside it.
4. The planner sees the flag. The planner either publishes 1,320 (the band edge) or publishes 1,350 with the reason "Promotion added". In the second case the supplier sees the reason and the period asks for a new commitment.

**Business rules.**
- BR-01. **Firm zone** = at least the supplier's firm lead time for the material group. The Hub's rule today already defaults it to the lead time (`src/services/transitions/forecastConfig.ts:76-83`) [Code].
- BR-02. **Trade-off zone** = from the end of Firm to the supplier's raw-material lead time. **Forecast zone** beyond that [Spec M6; Proposed].
- BR-03. **Firm quantities never change** once published, as today (`forecastRules.ts:239-275`) [Code].
- BR-04. **Damping:** before publication, each Trade-off period's new value is blended with its previously published value. The weight is **0.5 in the Trade-off zone and 0 in the Forecast zone** (no damping), and is tuned from the backtest (E14-10). The administrator holds the value [Owner, 2026-09-23, ENG-D9].
- BR-05. **Tolerance band:** a Trade-off period has 2 limits [Owner, 2026-09-23, ENG-D8]:
  - **per version:** it may move at most **±10%** from its previously published value (the CR-21 value)
  - **cumulative:** it may move at most **±20%** from the first value the supplier saw for that week. The ±20% is a starting value to agree with the pilot suppliers.
  - A move beyond the band needs the planner's reason, and the period returns to "awaiting commitment" [Spec G4; Code CR-21].
- BR-06. **Range:** Trade-off and Forecast periods show the P50 quantity plus an upper figure (default P90) from E14-09 [Spec G5].
- BR-07. **Retraining:** the demand model is retrained on a set cycle (starting point: every 8 weeks), not every week. More frequent retraining makes the plan move more [Spec M6, Zanotti 2026].

**Calculation.**

*Damping*
- Published value = weight × previous value + (1 − weight) × new value.
- *Example (weight 0.5):* previous 1,200, new 1,500 → 0.5 × 1,200 + 0.5 × 1,500 = **1,350**.

*Band check*
- Allowed range = previous value × (1 ± band).
- *Example:* 1,200 × 0.9 to 1,200 × 1.1 = **1,080 to 1,320**. 1,350 is outside, so it needs a reason, or it is capped at 1,320.

*Cumulative cap*
- Allowed range = first value the supplier saw × (1 ± 20%).
- *Example:* the supplier first saw 1,000 for that week. Version 2 moved it to 1,100 (+10%) and version 3 to 1,200 (+9%). Version 4 moves it to 1,300. That is +8% on version 3, inside ±10%, but +30% on what the supplier first saw, beyond the ±20% range (800 to 1,200). It needs a reason. The cumulative cap catches drift that per-version checks miss: 3 steps of +10% add up to +33%.

*Range*
- The supplier sees 1,350 (P50) and up to 1,700 (P90) for that week, and can commit an upside against the 1,700.

**Edge cases.**
- An emergency re-publication (REQ-E06-01 BR-02): damping still applies. A band break still needs a reason [Proposed].
- A new period entering the horizon: it has no previous value, so it is not damped or band-checked [Proposed].

**Acceptance criteria.**
- AC-01. No published Firm quantity differs from its previous publication.
- AC-02. No Trade-off period moves beyond the band without a recorded reason, and the supplier sees that reason.
- AC-03. The planner sees raw, damped and published values before publishing.

**Data and integration.**
- Inputs: planned orders or material requirements (E14-03, E14-05); ranges (E14-09); supplier lead times (E14-01).
- Outputs: forecast versions (REQ-E06-01).

**Metrics.** Leading: share of Trade-off revisions within the band; MASC (E14-02). Lagging: confirmation rate; CFOT.

**Open items.**
- ENG-D8a: the cumulative cap agreed with the pilot suppliers (starting at ±20%).
- C8-CLASS-PROJECTION (C8 §2.2): the commercial meaning of Firm.

---

### REQ-E14-07  Finished-goods demand forecast

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; REQ-E06-01 BR-01 | MVP | P0 [Proposed] | Material Planner (with Demand Planning) | MP | Proposed |

**Business value.**
- Replaces SAP's demand forecast with PTI's own. The model learns across thousands of SKUs at once and uses price, promotion and calendar effects.
- Every step downstream depends on it.
- It moves shortage and warehouse utilisation.

**Experience.**
- MP: sees the forecast per SKU, brand and total, and which method produced each SKU's forecast.

**Step-by-step (Planner).**
1. The weekly run finishes. The planner opens the Wardah lipstick range.
2. 380 SKUs are forecast by the main model, 45 slow SKUs by the slow-mover method, and 12 new SKUs by the launch method (E14-08).
3. The brand total equals the sum of its SKUs.

**Business rules.**
- BR-01. **Main model:** one gradient-boosted tree model (LightGBM) trained across all SKUs of a brand or category [Spec D1].
  - Its inputs: past sales at several lags, rolling averages, price and price changes, promotion flags, calendar and events (Ramadan and Lebaran, 11.11, payday), and SKU/brand/category averages.
  - Its loss is suited to sales counts with many zeros (Tweedie).
- BR-02. **Fallback model** for SKUs where the main model fails the backtest (E14-10): a statistical average of three smoothing methods (the "Comb" benchmark), or Theta [Spec D2].
- BR-03. **Slow and intermittent SKUs:** SBA by default; TSB where the SKU is flagged for discontinuation or a shade or pack change. Classic Croston is used only where the published selection rule favours it [Spec D3].
- BR-04. **Consistency across levels:** SKU, brand and total forecasts are reconciled so they add up. The method is MinT-shrink, which never produces a negative forecast [Spec D4].
- BR-05. Each SKU's method is chosen by the backtest, E14-10, not fixed by hand [Spec E].
- BR-06. Zero sales in a week flagged as a stock-out are excluded from training (E14-01 BR-02) [Spec D1].

**Calculation (plain language).**

*The main model*
- It learns patterns from all SKUs together. For example: "sales rise about 2.5× in a week with a 30% discount and TV support", and "sales fall the week after a promotion".
- It learns these from features built for each SKU and week, then applies them to each SKU's own level.
- This is the approach that won the M5 competition, where it beat statistical methods by 22%. Most of that gain was at brand and total level; at single-SKU level the gain was about 5% [Spec D1].

*Slow SKUs: SBA*
- It keeps two running averages, updated only in weeks with a sale: the typical sale size and the typical gap between sales.
- Forecast per week = 0.95 × size ÷ gap. The 0.95 corrects a known upward bias.
- *Example:* a SKU sold 500 in week 3, then 400 in week 7 (a gap of 4 weeks). Starting with size 500 and gap 3, and a smoothing weight of 0.1:
  - size = 500 + 0.1 × (400 − 500) = 490
  - gap = 3 + 0.1 × (4 − 3) = 3.1
  - forecast = 0.95 × 490 ÷ 3.1 = **150 a week**

*SKUs being discontinued: TSB*
- It keeps the probability of a sale in a week, updated every week including weeks with no sale, and the typical size.
- Forecast = probability × size.
- *Example:* probability 0.30, size 450, forecast 135. After a week with no sale (weight 0.1), the probability becomes 0.27 and the forecast **121.5**.
- The forecast keeps falling while sales stay at zero, so PTI stops ordering materials for a SKU that is dying.

*Choosing between Croston and SBA*
- Use SBA when v > 2 − 1.5 × p, where v is the variability of sale sizes and p is the average gap. The often-quoted cut-offs 1.32 and 0.49 are wrong [Spec D3, checked at source].

*Consistency across levels*
- Each level is forecast on its own. The results are then adjusted, weighted by how reliable each level has been, so SKUs add up to brand and brand to total.

**Edge cases.**
- A SKU moving between brands or categories: history follows the SKU, and the reconciliation uses the current map [Proposed].
- A range discontinued mid-horizon: its future forecast is zero from the end date in the launch plan [Proposed].

**Acceptance criteria.**
- AC-01. Every SKU has a forecast and a named method.
- AC-02. SKU forecasts add up to brand and total forecasts, with no negative values.
- AC-03. The main model is used for a SKU only where it beat the fallback in the latest backtest (E14-10).

**Data and integration.** Inputs from E14-01. Outputs to E14-03, E14-09 and E14-10. Training runs in Python (LightGBM, Nixtla libraries); the trained model and the closed-form methods can serve results to the Hub [Spec build notes].

**Metrics.** Leading: backtest service result (E14-10). Lagging: shortage weeks; forecast bias (E14-11).

**Open items.**
- ENG-D10: the grain, sell-in or sell-out, and whether per channel.
- ENG-D11: who reviews the forecast before it drives material plans (Demand Planning or MP).

---

### REQ-E14-08  Launches and promotions

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1 | MVP | P1 [Proposed] | Material Planner (with Marketing) | MP | Proposed |

**Business value.**
- PTI launches and promotes often.
- A new SKU has no history, so the main model cannot forecast it.
- A promotion the model does not know about causes shortage in the promotion and excess after it.
- It moves shortage and excess.

**Experience.**
- MP: for a new SKU, picks or confirms the similar past launches (analogues), enters or confirms the launch volume, and sees the resulting week-by-week curve.
- MP: for a promotion, sees the expected uplift and the dip after it.

**Step-by-step (Planner, a new lip cream shade).**
1. The engine suggests 3 past launches with the same brand, category and price tier.
2. Their average curve puts 7% of the first 26 weeks' volume in week 6.
3. The launch plan is 60,000 units in 26 weeks, so week 6 is forecast at 4,200.
4. The planner accepts. As real sales arrive, the engine blends the launch curve with them. Once the SKU has 52 weeks of history (E14-01 BR-04), the main model (E14-07) takes over.

**Business rules.**
- BR-01. **Launches** are forecast from the life-cycle curve of similar past launches, scaled by the planned launch volume [Spec D6].
  - Similar means the same brand, category, price tier and shade family.
  - The curve is a ramp-up, a flat maturity and a decline.
- BR-02. **Promotions** are inputs to the main model (E14-07 BR-01) [Spec D6].
- BR-03. A separate, explainable promotion model gives each promotion's expected uplift. It is used as a check the planner can read, and for SKUs with fewer than 5 past promoted weeks, where it borrows from all SKUs [Spec D6].
- BR-04. Promotions must be in the promotion calendar before the run to affect the forecast. A promotion added after publication triggers a band check (E14-06) [Proposed].

**Calculation.**

*Launch*
- Week-k forecast = launch volume × the analogues' average share of volume in week k.
- *Example:* 60,000 × 7% = **4,200**.

*Promotion*
- Promotion week = baseline × uplift. The week after = baseline × dip.
- *Example:* baseline 2,000 a week, uplift 2.4 for a 30% discount with TV → **4,800**. Dip 0.8 the week after → **1,600**.
- The uplift and dip are learned from past promotions across all SKUs.

**Edge cases.**
- No suitable analogue: the planner enters the curve by hand, and it is marked [Proposed].
- A promotion cancelled after the materials were ordered: the excess shows in E14-03, and the reason is recorded [Proposed].

**Acceptance criteria.**
- AC-01. Every new SKU shows its analogues and launch volume.
- AC-02. Every promotion week shows its expected uplift from the check model next to the main model's forecast.

**Data and integration.** Launch plan and promotion calendar (E14-01). Outputs to E14-07.

**Metrics.** Lagging: launch forecast error in the first 13 weeks; excess stock 8 weeks after a promotion.

**Open items.** ENG-D12: which team owns the promotion calendar, and how far ahead it is fixed.

---

### REQ-E14-09  Demand range

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1 | MVP | P1 [Proposed] | Material Planner | MP, SUP | Proposed |

**Business value.**
- A single number hides how uncertain it is.
- A range (the likely value and a high value) lets E14-04 size safety stock correctly, and lets suppliers plan upside capacity (E14-06 BR-06).
- It moves shortage and warehouse utilisation, and Scheduled Confirmed indirectly.

**Experience.**
- MP: sees P50 and P90 per SKU and material, and how often actual sales have fallen outside the range.

**Business rules.**
- BR-01. The engine produces at least P50 and P90, and the administrator may add others [Spec D5].
- BR-02. The range is **calibrated** on past weeks. P90 should be exceeded in about 10% of weeks. If history shows it was exceeded more often, the range is widened [Spec D5].
- BR-03. The range keeps adjusting as new actuals arrive, using an online correction [Spec D5].

**Calculation.**

*Calibration*
- In the backtest, actual sales exceeded P90 in 18% of weeks, not 10%, so the range is too narrow.
- The engine widens P90 at each horizon until the backtest miss rate is 10%.

*Online correction*
- Each week: new P90 adjustment = old adjustment + step × (1 if actual exceeded P90, else 0 − 0.10).
- *Example (step 50 units):* after a miss the adjustment rises by 45 (50 × 0.9). After a hit it falls by 5 (50 × 0.1).
- Over time P90 settles where it is exceeded 10% of the time.

**Edge cases.** A SKU with too little history: the range comes from its product group, and is marked [Proposed].

**Acceptance criteria.**
- AC-01. Every forecast has a P50 and a P90.
- AC-02. The screen shows the recent share of weeks above P90 for each group.

**Data and integration.** From E14-07 and E14-08. Outputs to E14-04 and E14-06.

**Metrics.** Leading: P90 miss rate against 10%.

**Open items.** None.

---

### REQ-E14-10  Choosing models by service, not accuracy

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1 | MVP | P0 [Proposed] | Material Planner | MP | Proposed |

**Business value.**
- Recent research on 20,330 real orders found that the most accurate forecast model is often **not** the one that fills the most orders [Spec E, Chin et al. 2026].
- PTI's problem is shortage and excess, not a forecast-accuracy score.
- So this requirement picks each SKU's model by replaying PTI's own ordering on past data and measuring fill rate and warehouse space.
- It moves all four measures.

**Experience.**
- MP: sees, per SKU group, the candidate models with their simulated fill rate, order-complete rate, average stock against capacity, accuracy and stability, and which model was chosen.

**Business rules.**
- BR-01. **Backtest on history.** The engine goes back to at least 6 past dates, including Ramadan and Lebaran and 11.11, and forecasts from each date as if it were that day [Spec E].
- BR-02. At each past date, it replays PTI's ordering policy (E14-04 and E14-05) on each candidate model's forecast, then records [Spec E]:
  - fill rate
  - order-complete rate, meaning every line of an order filled, which is the PO-level measure like CFOT
  - average stock against warehouse capacity
- BR-03. **Selection:** the model with the best simulated fill rate and warehouse result is chosen, provided its plan stability (MASC) is within the administrator's limit. Accuracy and bias are shown as diagnostics, not used to choose [Spec E; Proposed].
- BR-04. The statistical fallback (E14-07 BR-02) is the floor. A model that does not beat it is not used [Spec D2].

**Calculation.**

*Replay*
- At each past date: set the order-up-to level from the model's forecast (expected demand over lead time plus review, plus safety stock). Order the gap to it. Let the order arrive after the lead time. Then serve the actual sales from stock.

*Measures*
- Fill rate = weeks fully served ÷ weeks with demand.
- Order-complete rate = orders with every line filled ÷ all orders.

*Example*
- Model A has lower forecast error but under-forecasts slow SKUs. Its fill rate is 81%.
- Model B is a little less accurate but not biased low. Its fill rate is 90% at similar stock.
- The engine picks **B**.

**Acceptance criteria.**
- AC-01. Each SKU group shows every candidate's simulated fill, order-complete rate and stock, and the chosen model.
- AC-02. The chosen model never has a worse simulated fill rate than the fallback.

**Data and integration.**
- Inputs: history (E14-01); candidates (E14-07, E14-08).
- Outputs: model choice to E14-07; errors to E14-04.
- Reference code: the Chin et al. reproduction repository, MIT licence [Spec E].

**Metrics.** Leading: simulated fill against target. Lagging: actual fill; CFOT.

**Open items.** ENG-D13: the stability limit (MASC) used in selection.

---

### REQ-E14-11  Forecast bias and planner override control

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; E14 X-06 | MVP | P1 [Proposed] | Material Planner | MP | Proposed |

**Business value.**
- A forecast that is always a little high fills the warehouse. One that is always a little low causes shortage.
- Planner overrides also often make the forecast worse. A 15-year study found upward adjustments of 50% to 100% made it 26% worse [Spec G2].
- This requirement detects bias early and shows whether each type of override helps.
- It moves shortage and warehouse utilisation.

**Experience.**
- MP: sees a bias alarm per SKU and material, and a monthly report of override value by direction (up or down) and size.

**Business rules.**
- BR-01. **Bias alarm:** a tracking signal per SKU and material. The alarm fires when it passes 0.51 in absolute value, at a smoothing weight of 0.1 [Spec G2].
- BR-02. **Override value (FVA):** each month the engine compares the error of the final forecast (after overrides) with the error of the engine forecast (before overrides), across SKUs. It reports the result by direction and size band [Spec G2].
- BR-03. An upward override needs a reason code (X-06). An override type with negative value over 13 weeks is flagged for review with the planner's lead [Spec G2; Proposed].
- BR-04. Overrides are also judged by the service result (E14-10), not accuracy alone, because a study found that allowing overrides can raise profit even when accuracy falls [Spec G2, Kesavan et al. 2026].

**Calculation.**

*Tracking signal*
- Each week: smoothed error = 0.1 × this week's error + 0.9 × last week's smoothed error.
- Smoothed size = the same, using the error's absolute value.
- Signal = smoothed error ÷ smoothed size. It is near 0 when errors cancel out, and near +1 or −1 when they are always one way.
- **Above 0.51 in absolute value: bias alarm.**

*Override value*
- *Example:* the engine's error on overridden SKUs averaged 1,000 units, and the error after overrides averaged 1,150.
- Ratio 1.15, so override value = 1 − 1.15 = **−15%**. The overrides made it worse.

**Acceptance criteria.**
- AC-01. Every SKU and material shows its current tracking signal, and alarms are listed.
- AC-02. The monthly report shows override value by direction and size band.

**Data and integration.** From E14-07 and the override log (X-06).

**Metrics.** Lagging: share of SKUs in bias alarm; override value.

**Open items.** None.

---

### REQ-E14-12  Where to hold buffers (Phase 2)

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; REPL | Phase 2 | P2 [Proposed] | Material Planner | MP | Proposed |

**Business value.**
- Holding safety stock at every level (finished good, bulk, packaging) double-buffers and fills warehouses.
- This requirement decides at which level buffers sit, so fewer, better-placed buffers give the same service.
- It moves warehouse utilisation.

**Business rules.**
- BR-01. The engine uses the guaranteed-service model with its MOQ extension [Spec M4]:
  - each stage (finished good, bulk, material) promises a service time
  - the engine chooses the promises that meet the customer service time at the lowest total holding cost
- BR-02. It is solved as an optimisation model (HiGHS), because shared packaging makes the network more than a simple tree [Spec M4; Proposed].
- BR-03. The output is a recommendation for the planner and the REPL decision. It does not change safety stocks automatically [Proposed].

**Calculation (plain language).**
- A buffer high up the chain (for example at the bottle) protects every finished good that uses that bottle, so it pools their uncertainty and can be smaller in total.
- A buffer at the finished good responds fastest but must cover that SKU alone.
- The model compares these trade-offs for the whole bill-of-materials network, using each stage's holding cost and lead time.

**Acceptance criteria.** AC-01. For each finished-good family, the engine shows where buffers sit and the total holding cost against today's placement.

**Data and integration.** Bills of materials, lead times, holding costs (E14-01); errors (E14-04).

**Metrics.** Lagging: average stock ÷ capacity at the same fill rate.

**Open items.** REPL (BL-01).

---

### REQ-E14-13  Reschedule or cancel open orders (warehouse relief)

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| ENG-1; BL-106 finding; owner slides (warehouse 121% to 142%) | MVP | P0 [Proposed] | Material Planner | MP, BUY, SUP | Proposed |

**Business value.**
- Order sizing (E14-05) cannot lower today's warehouse overload. On the synthetic data every over-capacity week is stock already received or already on order, and the first new order falls after it (BL-106).
- The remaining lever is the orders already placed: open PO lines and call-offs that will arrive before the stock is needed.
- This requirement finds them and proposes to move each one later (reschedule out), bring it earlier (reschedule in), reduce it, or cancel it. Each proposal carries:
  - the pallet-weeks it frees
  - the rented-space cost it saves
  - what it costs with the supplier
- Rescheduling out and cancelling lower warehouse utilisation and rented-space cost. Rescheduling in prevents shortage.
- **The risk to manage:** every change PTI makes inside a supplier's lead time counts as PTI-caused in E14-02 and makes the plan less stable, which lowers supplier service (Terwiesch et al. 2005). So this report prefers changes outside the lead time. It shows the cost of every change and never sends one automatically.

**Experience.**
- MP: opens "Reschedule open orders" under Forecast. For each warehouse it shows:
  - the projected fill before and after the proposals
  - a ranked list of proposals: material, supplier, order, current date and quantity, proposed date and quantity, pallet-weeks freed, rented-space saving, and whether the change falls inside the supplier's lead time
- MP: for a call-off, sends the change to the supplier from the list; the supplier re-confirms as today. For a PO line, the list says the change is made in SAP and records that the planner took it there.
- BUY: sees proposals that need a commercial conversation, such as a cancellation inside the Trade-off zone that carries a liability.
- SUP: sees nothing new. A rescheduled call-off arrives as today's call-off change, with PTI's reason.

**Step-by-step (Planner, Monday).**
1. The packaging warehouse is projected at 127% this week, falling to 84% in week 8.
2. The report proposes 14 moves. The top one: call-off CO-2026-0141, carton CT-10, 20,000 units due in week 3, moved to week 5. It is not needed before then, it frees 20 pallet-weeks, and it saves about Rp 700,000 at the placeholder rented-space rate. Week 3 is 21 days away and the supplier's lead time is 14 days, so the change is outside the lead time.
3. The planner selects the top 9 proposals, all outside the lead time. The projected fill for weeks 3 to 6 drops by 11 to 18 points.
4. The planner sends the 6 call-off changes with the reason "Warehouse capacity: not needed until week 5". The 3 PO-line changes are marked "to change in SAP".
5. Suppliers re-confirm the new dates. Until they do, the planner's view shows the lines as awaiting confirmation. Nothing is counted as moved until confirmed.

**Business rules.**
- BR-01. **Candidates:** open PO lines and open call-offs with a quantity not yet received. Lines already dispatched (ASN sent) are shown for information only, never proposed [Proposed].
- BR-02. **Need date of a line:** the first week in which projected stock *without* that line would fall below safety stock (E14-03 netting with E14-04 safety stock). The projection takes lines in due-date order, so earlier lines cover earlier weeks [Spec M2; Proposed].
- BR-03. **Proposal types** [Proposed]:
  - **Reschedule out:** the line is due at least one week (ENG-D15) before its need date. Propose the need date.
  - **Reschedule in:** the line is due after its need date, which would cause a shortage. Propose the need date. This moves shortage, not space, and is listed separately.
  - **Reduce:** only part of the line is needed within the horizon. Propose the needed quantity, rounded up to MOQ and order multiple.
  - **Cancel:** none of the line is needed within the horizon.
- BR-04. **What may be proposed depends on where the line sits in the supplier's zones** (REQ-E06-01 BR-04, CR-21) [Owner CR-21; Proposed]:
  - **Firm zone**, or inside the supplier's lead time: shown, but marked "needs supplier agreement". It is ranked last, and counts as a PTI change inside the lead time if sent (E14-02).
  - **Trade-off zone:** a quantity change is limited to the band (ENG-D8: ±10% per change, ±20% cumulative). A larger change or a cancellation carries the supplier's liability for material already bought (ENG-D17).
  - **Forecast zone:** free to move.
- BR-05. **Ranking:** by net saving, which is rented-space cost saved minus change cost, where:
  - rented-space cost saved = pallet-weeks freed inside over-capacity weeks × the rented-space rate (ENG-D6)
  - change cost = the change penalty inside the lead time (E14-05 BR-03) + any liability (BR-04)

  Proposals that free space only in weeks already under capacity have no saving and are not listed as warehouse relief [Proposed].
- BR-06. **Proposals are chosen together per warehouse.** Accepting one updates the projection before the next is valued, so two proposals never claim the same pallet-weeks [Proposed].
- BR-07. **How a proposal is carried out** [Code; Proposed]:
  - **Call-off:** through the existing planner change (`t_calloff_change`, a reason required). The supplier re-confirms as for any change.
  - **PO line:** the Hub does not edit a PO (REQ-E07-01 BR-02), so the change is made in SAP. The report records the planner's "taken to SAP" mark and the time.
  - Nothing is sent automatically.
- BR-08. **Honesty (X-03):** while the engine runs on synthetic data, proposals are shown with the simulated label. A change sent from them follows the E14-05 release rule (ENG-B18): it cannot reach a supplier until the data is live [Proposed].
- BR-09. **Guard on supplier stability:** the report shows how many proposals fall inside the lead time, and how PTI's share of schedules changed inside the lead time (E14-02) would move if all selected proposals were sent [Proposed].

**Calculation.**

*Need date (BR-02)*
- Carton CT-10: 40,000 on hand, safety stock 8,000, use of 8,000 a week.
- Open call-off CO-2026-0141 is 20,000 units, due in week 3.
- Without CO-2026-0141, projected stock at the end of each week:

| Week | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Stock | 32,000 | 24,000 | 16,000 | 8,000 | 0 | −8,000 |

- It first falls below safety stock in week 5, so the need date is the start of week 5.

*Proposal (BR-03)*
- Due in week 3, needed in week 5: two weeks early, which is more than the 1-week threshold. Propose **reschedule out to week 5**.

*Space freed*
- 2,000 cartons fit on a pallet, so 20,000 is 10 pallets.
- Moving the call-off from week 3 to week 5 keeps 10 pallets out of the warehouse for 2 weeks: **20 pallet-weeks**.
- If weeks 3 and 4 are both over capacity, all 20 count.

*Net saving (BR-05)*
- Rented-space saving: 20 × Rp 35,000 (placeholder rate) = **Rp 700,000**.
- The change is made 21 days before the original date and the supplier's lead time is 14 days, so it is outside the lead time: no penalty.
- Net saving **Rp 700,000**.
- Had it been inside the lead time, the change penalty of 10 pallets × Rp 150,000 = Rp 1,500,000 would make the net saving negative. It would then rank last, marked "needs supplier agreement".

*Together (BR-06)*
- After accepting CO-2026-0141, weeks 3 and 4 hold 10 fewer pallets. A second proposal that frees space only in week 4 is revalued against the new week-4 fill. If week 4 is now under capacity, its saving becomes zero and it drops off the relief list.

**Edge cases.**
- A line whose supplier has a minimum call-off size: a reduction never goes below it [Proposed].
- A cancellation of a PO line that is the last open line on an umbrella PO: flagged for the buyer, because the contract may carry a commitment [Proposed].
- Stock on hand alone is above capacity with no open lines left: the report says no open order can relieve the week. The remaining levers are using up surplus stock or moving it, which are outside this report [Proposed].

**Acceptance criteria.**
- AC-01. Every proposal shows its type, current and proposed date and quantity, pallet-weeks freed, rented-space saving, change cost, and zone or lead-time position.
- AC-02. No proposal is sent to a supplier or changed in SAP without an explicit planner act, and none reaches a supplier while the engine data is simulated.
- AC-03. The projected fill after the selected proposals equals the fill recalculated from the changed lines (independent recalculation).
- AC-04. Two selected proposals never claim the same pallet-weeks.

**Data and integration.** Reads:
- E14-03 netting and E14-04 safety stock
- open PO lines and call-offs with confirmations and ASNs (E14-01 feeds)
- warehouse capacity and volume (E14-05)
- the cost rates (ENG-D6)

Writes only through the existing call-off change verb and a "taken to SAP" mark.

**Metrics.** Leading: pallet-weeks freed by accepted proposals; share of proposals outside the lead time. Lagging: warehouse utilisation against 80%; rented-space cost; PTI-caused changes inside the lead time (E14-02) must not rise.

**Decided (owner, 2026-09-24).**
- ENG-D15: a reschedule-out is proposed when the line arrives at least 1 week before its need week. An administrator setting, beside the E14-05 cost rates.
- ENG-D16: the Material Planner agrees PO-line changes with the supplier in SAP; the Hub only records "taken to SAP".
- ENG-D17: the supplier's liability on a Trade-off cancellation is flagged ("liability — not priced"), not priced.

**Build.** Built on synthetic data (BL-107, PR #44); the choices the build made are ENG-B19 to ENG-B28 (section 4.1d).

---

## 4. Engine decisions

### 4.1 Decided (owner, 2026-09-23)

| ID | Decision | Answer | Applied in |
|---|---|---|---|
| ENG-D1 | Owner of each input feed | The Master Data Management team owns the input data (forecast inputs, bill-of-materials breakdown, stock, ERP master data). Synthetic data until they connect SAP | E14-01 BR-06, BR-07 |
| ENG-D2 | Stock-accuracy tolerance | 2% to start; flag, do not block; high-volume packaging counted most often; tighten per class after the first cycle | E14-01 BR-03 |
| ENG-D3 | Show the confirmation rate to suppliers from day one | Yes: each supplier sees its own measures plus PTI's plan-change figure for its materials | E14-02 BR-07 |
| ENG-D5 | Service targets | Fill rate, tiered 95% / 90% / 85%; default tiering by volume until ENG-D14 | E14-04 BR-02 |
| ENG-D8 | Tolerance band | ±10% per version plus a cumulative cap from first publication, starting at ±20% | E14-06 BR-05 |
| ENG-D9 | Damping weight | 0.5 in Trade-off, 0 in Forecast, tuned from the backtest | E14-06 BR-04 |
| ENG-D4 | Other plants and intercompany transfers | Pilot plants only; the engine is single-plant; intercompany transfers in Phase 2 | E14-03 |
| ENG-D6 | Cost rates for order sizing | Finance supplies holding cost (% of value a year), cost per order, and rented space per pallet per week (from the 3PL invoices). Until then they are admin settings with placeholder values, labelled "placeholder — Finance to confirm" | E14-05 |
| ENG-D7 | Warehouse capacity | Separate per physical warehouse (packaging, raw material), in pallets | E14-05 |
| ENG-D15 | Weeks early before a reschedule-out is proposed | 1 week, an administrator setting beside the E14-05 cost rates (owner, 2026-09-24) | E14-13 BR-03 |
| ENG-D16 | Who agrees PO-line changes with suppliers in SAP | The Material Planner; the Hub records only "taken to SAP" (owner, 2026-09-24) | E14-13 BR-07 |
| ENG-D17 | Supplier liability on a Trade-off cancellation | Flagged "liability — not priced"; not priced (owner, 2026-09-24) | E14-13 BR-04 |

### 4.1a Build decisions accepted (owner, 2026-09-23, PR #37)

Choices the first build (BL-102, BL-99) had to make where the requirements were silent. The owner accepted all of them as built.

| ID | Decision | Applied in |
|---|---|---|
| ENG-B1 | Actives (`AI-`) and fragrances (`FR-`) count as raw material. The split follows the master's material type, not the code prefix (contract C9 §3: codes are opaque) | Synthetic dataset; E14-05 later |
| ENG-B2 | The supplier "Your reliability" panel shows simulated data with the SIMULATED label, as the prototype's supplier forecast page already does. For real suppliers it stays off until the Master Data Management team's SAP feed is live (X-03) | E14-02 BR-07 |
| ENG-B3 | A confirmation received after its deadline counts as never confirmed | E14-02 BR-01, BR-03 |
| ENG-B4 | The tolerance band (ENG-D8: ±10% per version, ±20% cumulative) also applies to PO quantity changes when classifying a missed line | E14-02 BR-03 |
| ENG-B5 | The confirmation rate counts PO lines only, until forecast-period commitments are part of the engine's input | E14-02 BR-01 |

### 4.1b Build decisions accepted (owner, 2026-09-23, PR #39)

| ID | Decision | Applied in |
|---|---|---|
| ENG-B6 | A slow mover is a material needed in fewer than 3 of every 4 weeks over the last 52 (average demand interval ≥ 4/3); a material with no requirement is slow too | E14-04 BR-02 |
| ENG-B7 | Volume for the default tiers is measured in pallets, so pieces and kilograms compare | E14-04 BR-02 |
| ENG-B8 | Order quantity per cycle for the fill-rate rule = one review week of expected demand, rounded up to MOQ and order multiple | E14-04 BR-01, BR-02 |
| ENG-B9 | Planned orders go to the largest-share supplier and are not split by share (interim, until E14-05) | E14-03 BR-06 |
| ENG-B10 | In netting, a confirmed line counts at its latest confirmation even if late; open lines more than 14 days overdue are treated as closed | E14-03 BR-04 |
| ENG-B11 | The forecast-consumption window defaults to the order's own week until set per SKU group | E14-03 BR-01 |
| ENG-B12 | The safety-lead-time group default is the pooled percentile of the group; 0, marked, below 5 receipts | E14-04 BR-03 |
| ENG-B13 | No safety-stock minimum. A floor of demand over the safety lead time would double-count the earlier release E14-03 applies for late suppliers. A material whose engine safety stock is zero while an order is expected is flagged "relies on the order lot (MOQ) — review" | E14-04 BR-01 |

### 4.1c Build decisions accepted (owner, 2026-09-23, PR #41)

| ID | Decision | Applied in |
|---|---|---|
| ENG-B14 | Order sizing is solved by an exact per-material dynamic program plus coordinate descent across the materials of a warehouse (the METHOD-SPEC M5 heuristic). HiGHS was tested and not used: at PTI's size it did not prove optimality within 30 seconds and would add a 3.5 MB WebAssembly file. No new dependency | E14-05 BR-01 |
| ENG-B15 | The order plan is its own page (Forecast → Order plan); Material requirement nets on its orders | E14-05 |
| ENG-B16 | A draft call-off from the order plan carries the Monday of the week it is received as need date, or today if that Monday has passed | E14-05 BR-05 |
| ENG-B17 | The change penalty is priced per pallet changed, against last week's run recomputed now (not a stored copy) | E14-05 BR-03 |
| ENG-B18 | A call-off drafted from the order plan carries origin "engine" and cannot be released (as a draft or directly) while the engine runs on simulated data (X-03). Editing keeps the origin; editing and dismissing stay allowed; an unknown origin value is refused. Once the engine data is live, earlier drafts become releasable | E14-05 BR-05; REQ-E09-01 |

### 4.1d Build decisions for review (PR #44, BL-107)

Choices the E14-13 build made where the requirement was silent. For the owner to accept or change.

| ID | Decision | Applied in |
|---|---|---|
| ENG-B19 | Open call-offs come from the Hub's own call-off record (the SAP-grain feed carries PO lines only). A released call-off not yet received is projected at its approved delivery date beside E14-03's PO lines. E14-03 and E14-05 do not net call-offs yet, so this report's "now" fill is the order-plan fill plus call-offs | E14-13 BR-01 |
| ENG-B20 | PO lines follow E14-03's defaults: confirmed lines only (unconfirmed ones are counted on the page, not projected); a line more than 14 days overdue is closed (ENG-B10), call-offs too. The fill includes E14-05's planned orders; the need date does not (they are re-planned around the open lines), and they are not re-planned after a proposal | E14-13 BR-02 |
| ENG-B21 | One proposal per line: cancel, then reduce, then reschedule out, then reschedule in. A reduction also moves to the need week when the line is early by the threshold (one change, not two). Reductions round up to the source's MOQ and multiple (the Hub holds no minimum call-off size). "Needed within the horizon" includes the safety stock at the end of E14-03's 26 weeks | E14-13 BR-03 |
| ENG-B22 | Zone by days from today to the line's date in force; Firm = the lead time (REQ-E06-01 BR-01), Trade-off from the REQ-E06-01 zone lengths. A line E14-02 reads as inside the lead time (against PTI's requested date) is inside here too. A reschedule-in to a date inside the lead time also needs supplier agreement | E14-13 BR-04 |
| ENG-B23 | In the Trade-off zone a reduction is held to the ENG-D8 band (the smallest quantity inside ±10% of the quantity in force and ±20% of the first). A call-off keeps no quantity history, so its first quantity is the one in force; a PO line's is its ordered quantity. Liability is flagged on a Firm or Trade-off cancellation and on a Firm reduction beyond the band | E14-13 BR-04; ENG-D8, D17 |
| ENG-B24 | The change penalty is E14-05's rate per pallet changed (all pallets for a reschedule, removed pallets for a reduction or cancellation), only inside the lead time | E14-13 BR-05 |
| ENG-B25 | Joint valuation is greedy per warehouse: rank tier first (free; a liability to agree; inside the lead time), then highest net saving against the projection as it stands. A row's value is its marginal in rank order; a planner's selection is valued by recomputing from the baseline, and that total is what the page shows | E14-13 BR-05, BR-06 |
| ENG-B26 | "Taken to SAP" is a new record `t_sapchange_mark` on a new planning atom `sapchange:mark` (ENG-D16). It is refused while the engine data is simulated, like the call-off change (`t_calloff_change` now carries `calloff_engine_data_live`), because a change made in SAP reaches the supplier | E14-13 BR-07, BR-08 |
| ENG-B27 | A call-off is only proposed when the change verb can take it: dispatched, awaiting the supplier's answer, awaiting the planner's approval, a change pending, or two confirmed deliveries are shown for information. A call-off cancellation has no Hub verb (the change verb needs a quantity above zero); the page says to agree it with the supplier | E14-13 BR-01, BR-07 |
| ENG-B28 | The stability guard uses E14-02's portfolio share over its 26-week window; a PO line adds to it when created in the window, not already changed inside the lead time, and the change is inside the lead time. Call-offs are not in the E14-02 measure; the page counts them among the selected proposals inside the lead time | E14-13 BR-09 |

### 4.1e Build decisions for review (PR #48, BL-108)

Choices the E14-06 build made where the requirement was silent or read two ways. For the owner to accept or change.

| ID | Decision | Applied in |
|---|---|---|
| ENG-B29 | The quantity stabilised and published per supplier × material × week is the material's net requirement lot-for-lot (REQ-E06-01 BR-01), from E14-03's netting with E14-04's safety stock, split by the supplier's source share (C8 fan-out). E14-05's order lots are not published: they become call-offs, and a lot that moves one week reads as a 100% change in two weeks (on the synthetic data the order plan's lots alternate with empty weeks) | E14-06 Data and integration |
| ENG-B30 | No engine plan has been published, so the versions a supplier would have seen are replayed: the chain as of each of the last 12 weeks and today, on today's record (the ENG-B17 shape). Packaging keeps every weekly version, raw material every fourth (X-04, REQ-E06-01 BR-02). Periods are the engine's weeks, not REQ-E06-01 BR-03's monthly buckets | E14-06; X-04 |
| ENG-B31 | The ±20% cumulative cap is measured from the value the supplier saw when the week entered the Trade-off zone (the first value it was asked to commit against), not from a Forecast-zone value, which moves freely. A move published beyond the band with the planner's reason re-anchors the cap at that value. BR-05 says "the first value the supplier saw"; read literally, a week whose Forecast value moved would be held at entry to Trade-off, and after an override the two bands could not meet | E14-06 BR-05; ENG-D8 |
| ENG-B32 | The plan-change share at forecast grain (RL.3.27, E14-02): of the weeks that sat inside the supplier's lead time in a later version, the share whose quantity changed there. MASC is E14-02's own (`reliability.ts`), per consecutive version pair, with E14-02's scale | E14-06 Metrics; E14-02 BR-05 |
| ENG-B33 | The page also runs the stabiliser on SAP's published plan history (the stand-in E14-02 measures), to show what stabilising would have done to the plan suppliers actually saw | E14-06 |
| ENG-B34 | The Trade-off damping weight is an administrator setting (Tolerances, `engine.dampingWeightPct`, 50%, 0 to 90%: at 100% a Trade-off week could never move). The Forecast weight stays 0 and the band stays ±10% / ±20% in code, as in E14-02 and E14-13; neither is on the administration page yet | E14-06 BR-04, BR-05; X-05 |
| ENG-B35 | Publishing asks the existing verb (`t_forecastversion_publish`) with the engine as source. It is refused by name while the engine data is simulated (X-03), and, once it is live, until SOMO ratifies C8 §8, because a published line today names SOMO as the source of its totals. Nothing is created either way; publishing SAP's plan is unchanged | E14-06; X-03; C8 §8 (BL-101) |
| ENG-B36 | The Firm zone is the longer of the REQ-E06-01 zone length and the supplier's lead time (BR-01 "at least the lead time") | E14-06 BR-01 |
| ENG-B37 | A Trade-off week whose last published value was 0 cannot move without a reason (±10% of 0 is 0). It is held at 0 and flagged; on the synthetic data this holds one real need of 54,513 units at 0 | E14-06 BR-05 |
| ENG-B38 | A week beyond the band is held at the band edge by default and flagged "needs a reason". The engine publishes the damped value with a reason when given one (tested), but the page has no reason entry yet: reasons are entered with the publication, which is refused (ENG-B35) | E14-06 BR-05, AC-02 |

### 4.2 Still open

| ID | Decision | Owner | Blocks |
|---|---|---|---|
| ENG-D8a | The cumulative cap agreed with pilot suppliers | Material Planner, Procurement | Confirms E14-06 BR-05 (runs on ±20% meanwhile) |
| ENG-D10 | Forecast grain: sell-in or sell-out, per channel or not | Demand Planning | E14-07 |
| ENG-D11 | Who reviews the forecast before it drives material plans | Material Planner, Demand Planning | E14-07 |
| ENG-D12 | Owner of the promotion calendar and how far ahead it is fixed | Marketing | E14-08 |
| ENG-D13 | Plan-stability limit used in model selection | Material Planner | E14-10 (set after the first backtest) |
| ENG-D14 | Materials per service tier | Material Planner | Confirms E14-04 BR-02 (runs on volume ranking meanwhile) |
| C8 §8 | SOMO ratifies the engine producing the totals | SOMO | Publishing engine totals on C8 (BL-101) |
| REPL | Replenishment method per material segment | Material Planner (consultant) | E14-12, parts of E14-04 |

**Nothing open blocks the first build** (E14-01 to E14-04 on synthetic data). BL-66, the CFOT definition fix, must land before E14-02 reports CFOT. Recommendations for the open items are in `DECISION-GUIDE.md`, section "Forecast engine (E14)".

## 5. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-23 | First draft: E14-01 to E14-12 with calculation explanations, from ENG-1 and `research/FORECAST-METHOD-SPEC.md` |
| 0.2 | 2026-09-23 | Owner decided ENG-D1, D2, D3, D5, D8 and D9. Data owned by the Master Data Management team, synthetic data until SAP is connected (E14-01 BR-06, BR-07); stock-accuracy tolerance 2%; suppliers see their own measures; tiered fill-rate targets; ±10% per version plus ±20% cumulative; damping 0.5 / 0. New open items ENG-D8a and ENG-D14 |
| 0.3 | 2026-09-23 | Build decisions ENG-B1 to ENG-B5 from the first build (PR #37) accepted by the owner, section 4.1a |
| 0.4 | 2026-09-23 | Build decisions ENG-B6 to ENG-B13 from PR #39 (E14-03, E14-04) accepted, section 4.1b |
| 0.5 | 2026-09-23 | ENG-D4, D6, D7 decided; build decisions ENG-B14 to ENG-B18 from PR #41 (E14-05 and the release block), section 4.1c |
| 0.6 | 2026-09-23 | REQ-E14-13 Reschedule or cancel open orders added (Proposed), from the E14-05 finding that order sizing cannot lower the current overload; ENG-D15 to ENG-D17 opened |
| 0.7 | 2026-09-24 | ENG-D15, D16, D17 decided by the owner on the defaults (1 week; the Material Planner in SAP, the Hub records "taken to SAP"; liability flagged, not priced). REQ-E14-13 built on synthetic data (BL-107, PR #44); build decisions ENG-B19 to ENG-B28 for review, section 4.1d |
| 0.8 | 2026-09-24 | REQ-E14-06 built on synthetic data (BL-108, PR #48); build decisions ENG-B29 to ENG-B38 for review, section 4.1e. The range beside the quantity (BR-06) is not built: it needs E14-09 |
