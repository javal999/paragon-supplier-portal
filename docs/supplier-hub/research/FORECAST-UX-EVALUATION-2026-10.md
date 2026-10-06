# Forecast area: UX evaluation (2026-10)

- **Checkout evaluated:** branch `chore/fe-std-phase4-converter`, commit `b4fab78` ("feat(codemods): rename-references + playbook for the ts-to-js converter").
- **How it was run:** `npm run build` (Node 22) passed, then `vite preview` through the `portal-aliases` launch configuration on port 5320. Viewport 1440×900. Demo session "PTI", menu role set to **Material Planner** (identity menu → "Menu for"). The supplier page was opened with the sidebar persona toggle set to Supplier (demo user "PT Sample Packaging Indonesia").
- **First users judged for:** Material planners, weekly. They decide what to order from which supplier (ordering), and evaluate how the forecast and suppliers performed (evaluation).
- **Scope:** 13 buyer pages in the Forecast menu group. The supplier Forecast page appears only as the receiving end of the publish step.
- **Evidence format:** `file:line` paths are relative to `paragon-supplier-portal/src/`. "Screen" means the route as rendered in the preview.

---

## 1. VERDICT

A first-time planner cannot tell where the weekly cycle starts or which page sends the plan to suppliers. The area needs regrouping around the weekly cycle, not more pages.

1. **There are two publish buttons, and only the wrong one works.** "Re-publish" on Forecasts (menu item 1) is enabled. "Publish to suppliers" on Stabilise and publish (item 13) is refused while data is simulated (`pages-v2/BuyerForecasts.tsx:85-96`, `pages-v2/BuyerStabilise.tsx:345-353`).
2. **The menu order is not the order the data flows.** Safety stock (item 10) feeds Material requirement (item 9). Data health (item 4) is linked from no page. Only 6 links join the 13 pages (F-05).
3. **Data health's failures never reach the pages that act.** Data health flags Material requirement, Order plan and Reschedule. None of those pages shows the flag (`lib/i18n/dataHealth.ts:18`).
4. **The ordering decision is buried.** Order plan's recommended orders start about 1,440 px down a 21,000-character page.

---

## 2. PAGE MAP

The menu runs top to bottom. Real dependencies come from `services/data/mock/MockProcurementService.ts:370-389` and `:552-835`, plus the engine imports.

| # | Menu label | First-time guess | What it actually does | Inputs from | Outputs to | Role who acts | How often |
|---|---|---|---|---|---|---|---|
| 1 | Forecasts | "The forecast": demand numbers to review | Lists published forecast versions per stream and which suppliers opened them. "Re-publish" sends the SAP-based plan (simulated) | SAP planning run (simulated). Stabilise publish, once the engine is live | Supplier Forecast & commitments; Commitments & gaps | MP | Weekly (packaging), monthly (raw material) |
| 2 | Commitments & gaps | Supplier commitments | Exceptions table (overdue, outside tolerance), commitment/forecast heatmap, cumulative chart, coverage. Accept, Request revision, Move demand | Published version (1); supplier commitments | Supplier (revision requests); Fixed stock reconcile | MP | Weekly, after the commitment deadline |
| 3 | Fixed stock reconcile | Stock correction | End-of-cycle check of committed, called-off and held stock against max stock. Classifies liability | Commitments (2); Call-offs; supplier stock | Settlement outside the Hub; max stock | MP reviews; max stock is Procurement's (`fsr` text, `maxstock:set` in procurement lane) | Every 3 weeks (packaging), monthly (raw) |
| 4 | Data health | System status page | Freshness and quality checks on 17 feeds, and which engine steps each failure affects. Diagnostic only | SAP feeds (synthetic) | Nothing wired; result pages do not read it (`dataHealth.ts:18`) | MDM team; planner should check | Weekly, before planning |
| 5 | Demand forecast | The forecast the plan uses | Engine sell-in forecast per finished good, 26 weeks, compared with SAP's plan. Does **not** feed material plans | Sales history; events | Forecast bias; Model backtest. Not Material requirement (`materialPlanningSource: 'sapPlan'`, `MockProcurementService.ts:752`) | MP team reviews (ENG-D11) | Weekly review |
| 6 | Forecast bias | Error report | Tracking signal per SKU and material, engine against SAP, plus planner overrides and their value | Demand forecast (5); SAP plan snapshots | Overrides back to Demand forecast only | MP | Monthly |
| 7 | Model backtest | Technical test, not for me | Replays ordering to choose each SKU's model by fill rate and space. Headline: engine beats SAP on 0 of 16 | Demand forecast methods; Safety stock; order sizing (`engine/modelBacktest.ts:99-116`) | Owner's switch decision (ENG-B66); stability limit ENG-D13 | Owner / planning lead | Rarely, per model change |
| 8 | Supplier reliability | Supplier scorecard | Confirmation rate, delivery as committed, missed-line causes, PTI changes inside lead time, per supplier | PO lines, confirmations, receipts | Plan-change measure used by Stabilise and Reschedule (`engine/stabilise.ts:69`, `engine/reschedule.ts:77-86`) | MP (evaluation) | Monthly |
| 9 | Material requirement | What I need to buy | Net requirement per material: SAP FG plan × BOM, net of stock, confirmed deliveries and safety stock. Planned orders are sized by Order plan | SAP FG plan; Safety stock (10); Order plan (11) re-run | Order plan; Stabilise | MP | Weekly |
| 10 | Safety stock | Safety stock settings | Safety stock, safety lead time and reorder point per material against SAP. Changes since the last run. No action on page | Plan errors; late deliveries | Material requirement; Stabilise (`MockProcurementService.ts:385`, `:687`) | Admin sets targets; MP lists tiers | Per run; review changes |
| 11 | Order plan | List of orders to place | Recommended orders per warehouse, sized jointly for space. Overflow weeks. "Create draft call-off" | Material requirement (9); cost rates | Call-offs (drafts); Reschedule | MP | Weekly |
| 12 | Reschedule open orders | Change PO dates | Ranks open PO lines and call-offs to push out, reduce or cancel for warehouse relief. Marks "taken to SAP" | Order plan sized chain; Call-offs; reliability measure | SAP change marks; call-off changes | MP | Weekly, when over capacity |
| 13 | Stabilise and publish | Final publish step | Damps and caps Trade-off weeks, shows the version to publish. Publish refused on simulated data | Material requirement net requirement; Safety stock; last published version | Forecasts versions (1); supplier page | MP | Weekly / monthly |
| S | Supplier: Forecast & commitments | (Receiving end only) | Receives the published version ("Packaging · Version 2"), Firm/Trade-off/Forecast periods, and a Home task until it is opened | Publish from Forecasts (1) or Stabilise (13) | Commitments to page 2; stock to page 3 | Supplier | Per published version |

---

## 3. TARGET STRUCTURE

The Forecast group becomes **Weekly plan** (cycle steps, in data order) plus **Review** (evaluation). Engine diagnostics move out of daily navigation.

- **Weekly plan · Rencana mingguan**
  1. This week · Minggu ini *(new start page: cycle stepper, input check, what is due)*
  2. What to order · Apa yang dipesan *(Order plan, with Material requirement and Safety stock as a per-material "Why this quantity" panel)*
  3. Make warehouse room · Kosongkan ruang gudang *(Reschedule open orders, plus Order plan's "Weeks that do not fit" card)*
  4. Publish to suppliers · Terbitkan ke pemasok *(Stabilise and publish, with Forecasts' version history as a "Published versions" tab)*
  5. Supplier responses · Tanggapan pemasok *(Commitments & gaps)*
- **Review · Evaluasi**
  6. Supplier performance · Kinerja pemasok *(Supplier reliability; reconcile with Performance → Supplier scorecard, see Open questions)*
  7. Forecast quality · Kualitas prakiraan *(Demand forecast + Forecast bias as two tabs)*
  8. End-of-cycle stock check · Cek stok akhir siklus *(Fixed stock reconcile)*
- **Help & administration (user menu) → Planning engine · Mesin perencanaan**
  - Data health · Kesehatan data *(full page. Its summary also appears as the input check on "This week")*
  - Model backtest · Uji model *(owner decision page)*
  - Safety stock targets · Target stok pengaman *(the full table. Values also shown in the "What to order" panel)*

Rationale, 1 line per change:
- **New "This week" start page:** gives the cycle a visible entry point and order. Today Home links only to Commitments (`pages-v2/BuyerHome.tsx:173,182`).
- **Merge Material requirement into What to order:** each page links to the other for the same decision (`BuyerMaterialRequirement.tsx:281`), and the planner's job is the order, not the netting.
- **Safety stock becomes a panel, and its targets move to admin:** the page has no planner action, and its targets are set by the administrator (on screen: "The administrator sets them").
- **Order plan overflow card moves to Make warehouse room:** its choice "is not saved and changes no order" and already points to Reschedule (`lib/i18n/orderPlan.ts:132`).
- **Merge Forecasts into Publish to suppliers:** this leaves one publish button. Version history becomes the evidence that publishing worked.
- **Commitments & gaps moves after publish:** suppliers respond to a published version, so the step follows publication.
- **Demand forecast and Forecast bias move to Review:** neither drives material plans yet (on screen, both pages). They answer "how did the forecast do".
- **Fixed stock reconcile moves to Review:** it runs at cycle end (3-weekly or monthly), not every week.
- **Data health and Model backtest move to admin:** they are owned by the MDM team and the owner (ENG-D1, ENG-B66). Data health's verdict stays visible through the input check on "This week".
- **Rename "Forecast" to "Weekly plan":** the section's main output is orders and a published plan. "Forecast · Forecasts" (EN) and "Prakiraan · Prakiraan" (ID) no longer collide.

---

## 4. FIRST-RUN PATH

One weekly cycle in the target structure, from incoming forecast to published plan:

1. **This week:** check that the finished-goods plan and feeds arrived and pass. Decide to proceed, or hold and alert the MDM team.
2. **What to order:** review recommended orders, needing materials first. Decide which orders to place with which supplier, and create draft call-offs.
3. **Make warehouse room:** for weeks over capacity, decide which open orders to push out, reduce or cancel, or whether to rent space.
4. **Publish to suppliers:** review held Trade-off weeks and give reasons for any beyond the band. Decide to publish the version.
5. **Supplier responses** (after the commitment deadline): decide per exception to accept, request revision, or move demand to another supplier.
6. **Supplier performance** (monthly): decide which suppliers to follow up, and which PTI changes inside lead time to stop.
7. **Forecast quality** (monthly): decide which SKUs to raise with demand planning, or which override types to stop.
8. **End-of-cycle stock check** (cycle end): decide on liability follow-up and max-stock changes with Procurement.

Steps 1 to 4 are the weekly ordering cycle that ends in a published plan. Steps 5 to 8 are evaluation.

---

## 5. COMPREHENSION AIDS

| Aid | What it does |
|---|---|
| **Cycle stepper** | A 5-step bar (This week → What to order → Make room → Publish → Responses) at the top of each Weekly plan page. It shows the current step, each step's status (to do, done, blocked) and the week. It answers "where am I in the cycle" without training. |
| **"This week" start page** | It is the default landing page for the MP role. One card per step shows its status and one number ("11 materials to order", "3 weeks over capacity", "Version 3 due Mon"). An input-check card shows the Data health verdict, with a link. |
| **Purpose header** | Every page carries 3 lines under the title: *Decision here* (one sentence), *Uses* (the previous step, with a link), *Next* (the following step, with a link). The current descriptive subtitles move into a collapsible "About this page". |
| **One simulated-data banner** | One component with one wording on every page: "Sample data. Nothing here reaches suppliers or SAP." The page-specific caveat paragraphs, today 95 to 253 words above the fold, move into "About this page". |
| **Publish gate checklist** | On Publish to suppliers, a checklist appears before the button: inputs pass (Data health), orders reviewed, warehouse weeks resolved, held weeks have reasons. A blocked item names its page. |
| **Term tips** | Point-of-use tooltips for Firm, Trade-off, MASC, tracking signal, reorder point and P50/P90, in EN and ID. Today definitions sit only in each page's bottom "How it works" section, and the glossary excludes KPI terms (`pages-v2/Glossary.tsx:52`). |

---

## 6. FINDINGS

Sorted by severity, then confidence.

| ID | Sev. | Conf. | Dimension | Page(s) | Evidence | Problem and user impact | Fix |
|---|---|---|---|---|---|---|---|
| F-01 | Blocker | High | Cross-page flow; Feedback and state | Forecasts, Stabilise and publish | `BuyerForecasts.tsx:85-96`: Re-publish and Emergency buttons are enabled for MP (screen /buyer/forecasts). `BuyerStabilise.tsx:345-353,452-467`: publish uses `source: 'engine'` and is withheld on simulated data | Two publish points use one verb. The first menu item publishes an unstabilised SAP plan with no data check. The designed end of the cycle refuses. A new planner publishes from the wrong page. | Keep one publish step (Publish to suppliers). Move version history there as a tab. If the SAP path must stay, label it "Publish SAP plan (until engine is live)" and show the gate checklist. |
| F-02 | Blocker | High | Cross-page flow; Feedback and state | Data health → Material requirement, Order plan, Reschedule, Stabilise | Data health shows "E14-03/E14-05/E14-13 Flagged · By: Cycle counts" (screen). `lib/i18n/dataHealth.ts:18`: "result pages do not yet carry this page's flag". No other page imports `useDataHealth` (grep). No i18n of stabilise/orderPlan/reschedule mentions data health | A planner can order and publish on flagged inputs without seeing it. This is the severity definition's own example. | Add a status chip on every result page: "Inputs: 1 check failing → Data health". Add the input check to "This week" and to the publish checklist. |
| F-03 | Major | High | Wayfinding; Information architecture | Forecast group; Home | `components/layout-v2/navConfig.ts:97-116`: 13 items, one flat group, no order cue. Home's only links into the group go to Commitments (`BuyerHome.tsx:173,182`). Data flows Safety stock → Material requirement → Order plan → Reschedule/Stabilise (`MockProcurementService.ts:370-389,552-603,676-707`), which is not menu order | A new user cannot name the first page or the sequence. They open pages in menu order, which runs against the dependencies (10 feeds 9, and 13 duplicates 1). | Adopt the Section 3 structure. Add the "This week" start page and the cycle stepper. |
| F-04 | Major | High | Information architecture; Role fit | Data health, Model backtest, Demand forecast, Forecast bias, Fixed stock reconcile | Daily actions (Order plan, Commitments), monthly review (Reliability, Bias), cycle-end (FS reconcile) and diagnostics (Data health, Backtest) share one group (`navConfig.ts:101-115`). Backtest says switching "is the owner's decision (ENG-B66)" (screen). Data health: "The Master Data Management team owns these feeds" (screen) | Planners see 13 equal-weight items, about 5 of which they never act on weekly. This dilutes the 4 that matter for ordering. | Split into Weekly plan / Review / admin Planning engine (Section 3). |
| F-05 | Major | High | Cross-page flow; Page purpose | All 13 | Only 6 inter-page links exist: Commitments→Chase/Responses (`BuyerCommitments.tsx:229,232`), Demand→Bias/Backtest (`BuyerDemandForecast.tsx:252,258`), Bias→Demand (`BuyerForecastBias.tsx:566`), MR→Order plan (`BuyerMaterialRequirement.tsx:281`), Order plan→Reschedule (`BuyerOrderPlan.tsx:293`), Stabilise→Demand (`BuyerStabilise.tsx:399`). No page links forward to Stabilise, and none links to Data health | Handoffs are invisible. After Order plan the user does not know publishing comes next, or where it is. | Use the purpose header with Uses/Next links on every page, plus the stepper. |
| F-06 | Major | High | Naming; Cross-page flow | Forecasts, Demand forecast, Forecast bias, supplier page | "Forecasts" = published SAP-based versions. "Demand forecast" = engine sell-in, "Not yet feeding material plans" (screen). Supplier sees "Forecast & commitments". `MockProcurementService.ts:752` `materialPlanningSource: 'sapPlan'` | Three "forecast" pages show different numbers from different sources, and none names the relation. The user cannot tell which forecast drives orders. | Rename by job: "Publish to suppliers", "Forecast quality". On What to order, state the source ("Plan source: SAP finished-goods plan, 31 Aug"). |
| F-07 | Major | High | Cognitive load; Page purpose | Order plan, Reschedule open orders | Order plan: 21,066 characters. Cost rates, KPIs, overflow card, chart and a 26-row weekly table come before "Recommended orders" (`BuyerOrderPlan.tsx:422,303,503,510`). First table at about 1,441 px. Reschedule: 33,629 characters, first table at about 1,414 px (measured on screen) | The ordering decision (what, from whom) sits below 2 screens of context. First users may never reach it. | Put Recommended orders first, with summary KPIs above it. Collapse cost rates, chart, weekly table and "How" into secondary sections. Do the same on Reschedule. |
| F-08 | Major | High | Cognitive load; First-time experience | Data health, Demand forecast, Forecast bias, Model backtest, Safety stock, Order plan, Reschedule, Stabilise | Explanatory paragraphs above the 900 px fold: Backtest 253 words, Demand 241, Stabilise 237, Order plan 208, Reschedule 191, Safety stock 167, Data health 162 (measured). Content includes caveats such as "It proves the calculation, not the business answer" | The first screen is caveats, not the task. Users skip the text, including the one line that matters (for example "Nothing on this page can reach a supplier"). | Use one simulated-data banner plus one purpose line. Move the rest into collapsed "About this page". |
| F-09 | Major | High | Naming; Cognitive load | Stabilise, Backtest, Bias, Demand, Order plan, Reliability | On-screen unexplained terms: MASC, tracking signal, WAPE, "MinT-shrink, λ 0.24" (`lib/i18n/demandForecast.ts:31`), "Interim round-up" (`orderPlan.ts:51`), Firm/Trade-off, P50/P90, sell-in. Definitions only in each page's bottom section. Glossary excludes KPI terms (`Glossary.tsx:52`) | Planners guess at headline metrics, for example "Plan movement (MASC) 0.176 → 0.175" as Stabilise's first KPI. | Use plain-language KPI names ("How much the plan moves"). Add tooltips at point of use. Add these terms to the glossary. |
| F-10 | Major | High | Cross-page flow; Information architecture | Order plan, Reschedule | `lib/i18n/orderPlan.ts:132`: the overflow choice "is not saved and changes no order: act on it with the 3PL, on the Reschedule open orders page, or … on the Call-offs page" | One decision (fix an over-capacity week) is split over 3 pages, and the choice made on the first is discarded. | Move the overflow card into Make warehouse room and persist the choice there. |
| F-11 | Major | High | Information architecture; Consistency | Supplier reliability; Performance → Supplier scorecard | "Delivered on the confirmed date" shows 37% on /buyer/reliability (26 weeks, 211 POs) and 40% on /buyer/scorecard (90 days, 3 orders) (screen). They sit in different menu groups | The evaluation job has two homes with conflicting numbers under one name. This matches the severity definition's Major example. | Choose one supplier-evaluation page (Open question 2). Align the window and the dataset, or rename one metric. |
| F-12 | Major | High | Role fit; Feedback and state | Forecast bias, Demand forecast | Bias: "Overrides change the demand forecast shown here and on Demand forecast. They do not drive material planning" (screen). The override form is on the page (`BuyerForecastBias.tsx`, section "Override the forecast") | A planner can override a forecast expecting orders to change, and nothing downstream moves. Only one sentence warns them. | Move to Review. Next to the override form, state "Does not change orders until the engine forecast is switched on". |
| F-13 | Major | Medium | Feedback and state | Stabilise, Forecasts | Stabilise shows a replayed "version to publish" but not the last published version or the next due date. Forecasts lists versions but not whether each was stabilised or engine- or SAP-sourced (`BuyerForecasts.tsx:103-107` columns: version, published, type, suppliers) | The user cannot tell what is draft, what is published and what is due. After publishing, nothing confirms what suppliers now see. | On Publish to suppliers, show "Last published: V2, 28 Aug, SAP plan · Next due: 4 Sep". Add a Source column to version history. |
| F-14 | Major | Medium | Consistency; Feedback and state | All 13 | Two simulated-data labels: "SAMPLE DATA" (Forecasts, Commitments, FS reconcile) and "SYNTHETIC DATA · AWAITING THE MDM SAP FEED" (10 engine pages), plus page-specific caveat lines (screen) | Users cannot tell whether "sample" and "synthetic" differ, or which pages hold real data. | Use one banner component with one wording (Section 5). |
| F-15 | Major | Medium | Role fit | Fixed stock reconcile | Max stock is set on this page ("Set max stock", `lib/i18n/fixedStockReconcile.ts:58`). The `maxstock:set` verb sits in the procurement lane (`services/transitions/businessRoles.ts:222`). The Forecast group is shown only to `roles: ['MP']` (`navConfig.ts:100`) | The role that maintains max stock (Procurement/BUY) has no menu path to the page where it is set. The MP role sees an action it may not hold. | Show End-of-cycle stock check to MP and BUY. Gate "Set max stock" visibly by role. |
| F-16 | Major | Medium | Naming | Demand forecast, Model backtest | `lib/i18n/demandForecast.ts:18` (on screen): the backtest "(E14-10), which is not built either". The same page links to the working Model backtest page (`BuyerDemandForecast.tsx:258`) | The page contradicts the menu, so the user cannot trust either page's status. | Update the text to the backtest's current state. |
| F-17 | Minor | High | Cognitive load | Material requirement | Rows sorted by material code (`services/engine/requirement.ts:585`), rendered as-is (`BuyerMaterialRequirement.tsx:336`). The first visible rows all show net requirement 0, while 11 of 42 materials need ordering (screen) | Materials needing action are scattered through 42 rows. | Sort by need: late to release, then net requirement, then review flag. Add a "Needs order" filter. |
| F-18 | Minor | High | Naming | Data health, Stabilise, Backtest, Reschedule, Demand forecast | Requirement codes on screen: "E14-02 Supplier reliability" (`lib/i18n/dataHealth.ts:36-38`), ENG-D9, ENG-D8a, ENG-B66, C8 §8, ENG-D13, BR-03, ENG-D15 (screen) | Internal backlog codes mean nothing to planners and crowd the text. | Remove the codes from UI copy, or move them into "About this page". Name engine steps by their menu labels. |
| F-19 | Minor | High | Naming | Forecast group (ID) | `lib/i18n/hub.ts:178,194`: section and item are both "Prakiraan", so the breadcrumb reads "PRAKIRAAN · PRAKIRAAN". English reads "Forecast · Forecasts" (`hub.ts:19,36`) | The breadcrumb repeats itself, and the user cannot tell the page from the group. | Rename per Section 3. |
| F-20 | Minor | High | Naming; Consistency | Forecasts, Stabilise (ID) | Same publish verb, two Indonesian words: "Terbitkan ulang" (`forecastCollaboration.ts:438`) and "Publikasikan ke pemasok" (`stabilise.ts:210`). Untranslated: "Backtest model", "Sell-in", Firm/Trade-off, call-off (screen, ID) | Indonesian users read 2 actions where there is 1. English loanwords are inconsistent. | Use "Terbitkan" throughout. Decide which loanwords stay (Open question 6). |
| F-21 | Minor | High | Cognitive load | Supplier reliability, Safety stock | "Size of PTI's changes 0.83" and "Drift since first seen 0.96" have no unit or scale. Reorder point "170.3" for a PCS material (screen) | Planners cannot judge good from bad. | Add a scale hint ("1.0 = usual week-to-week movement"). Round to the unit. |
| F-22 | Minor | Medium | Consistency | Order plan, Reschedule | Same label "Projected warehouse fill by week": W36 = 127% on Order plan and 128% "Now" on Reschedule (screen, packaging warehouse) | Two figures for one week on adjacent pages erode trust. | Use one projection source, or label the difference ("includes recommended orders"). |
| F-23 | Minor | Medium | Cognitive load | Commitments & gaps | 4 sections (exceptions, 3×16 heatmap with 3 lines per cell, cumulative chart, coverage). About 300 numbers on the page (measured) | Only the exceptions table drives action. The rest slows the weekly check. | Keep exceptions first. Collapse heatmap and cumulative chart into a "Coverage" tab. |
| F-24 | Minor | Medium | Cognitive load | Stabilise | KPI "Trade-off revisions inside the band 0% → 100%" (screen). Read cold, it looks like a jump from good to bad | A misread headline can stop a correct publish. | Rephrase as "Trade-off weeks within limits: 2 of 2 after stabilising". |
| F-25 | Polish | High | Naming | Safety stock | Menu "Safety stock", page title "Safety stock and reorder point" (`lib/i18n/safetyStock.ts:8`) | The menu and the title differ. | Align them. |
| F-26 | Polish | Medium | Consistency | All 13 | Date line wording varies: "As of", "Checked", "Window", "Finished-goods plan made", "Tracking signal over", "Replayed from" (screen) | The user cannot see at a glance how current a page is. | Use one "Data as of <date>" line, plus a second line where needed. |
| F-27 | Polish | Medium | Naming | Forecasts | Button labels mix verb and noun: "Re-publish" next to "Emergency re-publication" (`forecastCollaboration.ts:190-191`) | Minor reading friction. | Use "Publish now" and "Publish urgent update". |

Count: Blocker 2 · Major 14 · Minor 8 · Polish 3 (27 findings).

---

## 7. ROADMAP

**Quick wins** (labels, order, headers, links)

| Change | Findings | Size |
|---|---|---|
| Reorder and regroup the menu into Weekly plan / Review. Move Data health, Backtest and Safety stock targets to the admin menu (`navConfig.ts` only) | F-03, F-04 | S |
| Rename section and items in EN and ID per Section 3. Fix the "Prakiraan · Prakiraan" breadcrumb and the publish verb | F-06, F-19, F-20, F-25, F-27 | S |
| Demote the Forecasts "Re-publish" buttons behind a label and a link to Stabilise until the merge lands | F-01 | S |
| Purpose header (Decision / Uses / Next with links) on 13 pages | F-05 | M |
| Move Recommended orders to the top of Order plan and proposals to the top of Reschedule. Collapse context sections | F-07 | S |
| Sort Material requirement by need | F-17 | S |
| One simulated-data banner. Move caveats into "About this page" | F-08, F-14 | S |
| Remove requirement codes from UI copy. Fix the "backtest not built" sentence | F-16, F-18 | S |
| Data health status chip with link on the result pages | F-02 | M |
| Term tooltips and glossary entries for MASC, tracking signal, Firm/Trade-off, P50/P90 | F-09, F-21, F-24 | M |
| Override form note ("does not change orders yet") | F-12 | S |
| Unify the date line and the warehouse-fill source label | F-22, F-26 | S |

**Larger changes** (merges, new pages)

| Change | Findings | Size |
|---|---|---|
| "This week" start page with cycle stepper and input check | F-02, F-03, F-05 | M |
| Merge Forecasts into Publish to suppliers. Add last-published, next-due, source column and publish checklist | F-01, F-13 | M |
| Merge Material requirement and Safety stock values into What to order as a per-material panel | F-07, F-17 | L |
| Make warehouse room: move the overflow card into Reschedule and persist the choice | F-10, F-22 | L |
| Forecast quality: Demand forecast + Forecast bias as tabs, under Review | F-06, F-12 | M |
| One supplier-evaluation page (Reliability vs Scorecard) | F-11 | M |
| End-of-cycle stock check visible to BUY, with role-gated max stock | F-15 | S |
| Commitments: exceptions first, coverage tab | F-23 | S |

---

## 8. DROPPED

- **"Move demand changes the plan without showing it on Order plan."** Not verified in code or on screen.
- **"No PO rows on Order plan give no reason."** A hint exists (`op.action.noPo.hint`, `lib/i18n/orderPlan.ts:103`).
- **"Demand forecast shows 19 SKUs but 20 in the brand tab."** Explained on screen ("1 discontinued at zero").
- **"Not-viewed count differs between EN (2) and ID (1) on Forecasts."** Caused by my own supplier-side visit, which marked the version viewed.
- **"Data health shows every feed as Fresh, 0 days."** The page states the synthetic feed is generated at read. This is honest, not misleading.
- **"Model backtest headline (0 of 16) confuses planners."** Duplicate of F-04/F-12 (role fit). Merged.
- **"Reschedule is too dense."** Merged into F-07.
- **"Fixed stock reconcile is misplaced in the weekly menu."** Merged into F-04.
- **"Metrics have no tooltips."** Absence could not be verified reliably from code. Replaced by F-09, which rests on definitions sitting only at page bottom and on the glossary exclusion.
- **"Demand forecast total differs between table and screenshot."** Screenshot misread. The text read is consistent.

---

## 9. OPEN QUESTIONS

1. Until the engine is live, should the SAP-plan publish on Forecasts stay available, and who may use emergency re-publication? **Decided 2026-10-05 (FUX-D1): remove the SAP-plan publish; Stabilise and publish is the only publish point.**
2. Which page is the single supplier-evaluation home: Supplier reliability (Forecast) or Supplier scorecard (Performance)? **Decided 2026-10-05 (FUX-D2): Supplier scorecard; Supplier reliability moves to the planning-engine pages.**
3. Should Demand forecast and Forecast bias sit in planners' navigation before the engine forecast drives material plans (ENG-B66)? **Resolved in build: both sit under Review as the 2 tabs of Forecast quality, with a line saying material planning uses SAP's plan (phase 2 B5).**
4. Who owns Data health and Model backtest day to day: the MDM team, the owner, or a planning lead?
5. Should Procurement (BUY) see End-of-cycle stock check, given it maintains max stock? **Decided 2026-10-05 (FUX-D6): yes, from its Performance menu; Set max stock stays role-gated (phase 2 B1).**
6. Which English loanwords stay in the Indonesian UI (Firm, Trade-off, call-off, sell-in, backtest)?
7. For raw material (monthly), does the same weekly stepper apply, or does it need a monthly variant?
8. Is the safety-stock tier list a planner decision (which keeps a planner page) or administrator configuration (admin only)?

Phase 1 build brief: `docs/supplier-hub/prompts/fux-build-00-brief.md` (tasks A1 to A4). Phase 2: `fux2-build-00-brief.md` (tasks B1 to B6).

## 10. STATUS AFTER PHASES 1 AND 2 (2026-10-05)

Every finding has been acted on. Phase 1 is #125, #126, #127, #131 (brief `fux-build-00-brief.md`); phase 2 is #134, #135, #137, #138, #139, #140, #142, #145 (brief `fux2-build-00-brief.md`).

| Finding | Where it was fixed | Status |
|---|---|---|
| F-01 | A2 (SAP publish removed), B2 (versions tab and checklist) | Done |
| F-02 | A3 (Data health chip), A4 (chip on Publish), B1 (input check on This week) | Done |
| F-03, F-04 | A1 (Weekly plan and Review menus), B1 (This week page and step bar) | Done |
| F-05 | A4 (purpose headers), B1 (step bar) | Done |
| F-06 | A3 (plan source on What to order), B5 (plan source on Forecast quality) | Done |
| F-07 | A3 (decision first), B3 ("Why this quantity" panel) | Done |
| F-08, F-09, F-14, F-16, F-18, F-20, F-21, F-26 | A4 | Done |
| F-10 | B4 (warehouse-week decision saved on Make warehouse room), #145 (relief proposals show their acts) | Done |
| F-11 | A1 (scorecard is the evaluation home), B6 (header, basis line, reliability measure renamed) | Done |
| F-12 | A4 (override note), B5 (Forecast bias as a tab) | Done |
| F-13 | A2 and B2 (last published on the publish page) | Partly: Source column and next-due date wait for the engine and C8 §8 (FUX-D4) |
| F-15 | B1 (Procurement menu path, FUX-D6) | Done |
| F-17 | A3 (sort by need, filter) | Done |
| F-19, F-25 | A1, A4 | Done |
| F-22 | A3 (labels name the real difference: released call-offs), B4 | Done |
| F-23, F-24, F-27 | A2 | Done |

Still open:
- F-13's Source column and next-due date (FUX-D4).
- Whether This week becomes the planners' landing page: decided after the phase 3 usability test.
- Open questions 4, 6, 7 and 8 above.
