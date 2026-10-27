# Inventory & Capacity Collaboration (E08): engineering handover (2026-10)

| | |
|---|---|
| Version | 1.0, 2026-10-23 |
| For | The engineering team that builds the production Inventory & Capacity module (epic E08) of the PTI Supplier Hub |
| What this is | The final requirement for E08: what the prototype does, the decisions behind it, the rules, the states, the refusals, the screens, and what production must add. It replaces reading the inventory history document by document |
| Built on | GitLab `main` at `e31cba92`, which holds the material build (PRs #84 to #110), CAP-1 to CAP-5 (PRs #191 onward), Inventory UX wave 1 (MR !28, `f1c2b76d`) and wave 2 (MR !30, `71aaa3d6`) |
| Owner | Achmad Fahlevi (product owner). Decisions are recorded in `DECISION-GUIDE.md` (INV-D1 to INV-D13, MAT-D1 to MAT-D21), `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` section 10 (CAP-D) and `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` (DRC-D) |
| Paths | `src/…` paths are in `paragon-supplier-portal`; references below drop the `src/` prefix. Line numbers were read on `e31cba92` on 2026-10-23 and will move; the names will not |

**In one paragraph.** A supplier tells PTI how much stock it holds and how much production capacity it allocates to PTI; PTI reads that beside its own stock and acts before a shortage reaches the factory. The supplier enters stock on screen, uploads a template, or (when API-connected) presses Sync; it states capacity per planning group for 13 weeks; it answers PTI's questions in the hub. PTI reads every supplier × material on one risk-first table, estimates the supplier's stock between weekly updates on Stock simulation, compares capacity with the LTP per week, accepts additional capacity on amber weeks, works a rule-based alert list and closes each alert with a reason, and decides which suppliers see PTI stock. The prototype implements all of this against in-memory stores, with every state change going through one of 21 governed verbs in 11 flows. Production must replace the stores with a backend, add the supplier API pull, the schedule, email and sign-in, and keep the rules, states and refusals listed here.

---

## 1. Scope

**In scope (built in the prototype, to be built for production):**
- Inventory visibility (REQ-E08-01): one row per supplier × material with supplier stock, PTI stock and ROP, incoming split into in production and in transit, risk class on supplier cover, last update and stale flag; a material drawer per row.
- Stock submission (REQ-E08-02): manual entry and template upload on one page with the same fields, batches, the API Sync button, the weekly Thursday cycle, PTI recording a supplier's message, the supplier's update mode and update compliance.
- Supplier access to PTI stock (REQ-E08-03): grant, change and remove, per supplier and per material, with a log.
- Capacity (REQ-E08-04): capacity per supplier × planning group × week against the LTP, BE, the reason rule, planning groups, and PTI's "Accept additional capacity" on an amber week (INV-D8).
- Alerts (REQ-E08-05): 12 derived rules, the CR-24 class with its basis, order by days to impact, next step and actions per rule, close with a reason.
- Stock simulation (REQ-E08-08): the supplier's estimated stock at a check date, free to call off, PTI inbound, and planner input.
- "Ask supplier" (INV-D9): one governed hub ask per supplier × subject, answered on the supplier's To do and Stock page.
- Supplier feedstock confirmation (DRC-8, DRC-D17) on the supplier Stock page.

**Shown on these pages but specified elsewhere:** trade names and the one material search (REQ-E08-06, flow `materialName`), the MRP controller (REQ-E08-07, flow `mrpController`), the reason lists (flow `reasonCode`) and the alert thresholds (flow `hubSetting`) on the admin pages, the strategic and protection buffer sections on PTI Capacity (DRC-9a, DRC-9c, read only), and the feedstock reconcile page (DRC-15a).

**Out of scope for this module:** the supplier API itself (BL-25), the scheduled pull (BL-151), email delivery of alerts and reminders (BL-26, BL-153), "Move demand" (it belongs to the order plan, INV-D8), the SAP material feed (BL-152), supplier registration and master data (E01, E02).

---

## 2. Decisions in force

Every decision below is binding unless the owner changes it. Full text: `DECISION-GUIDE.md`, `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` section 10, `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` section on decisions.

| ID | Decision |
|---|---|
| INV-D1 | CR-24 days of cover stay supplier stock ÷ demand, labelled "Supplier cover"; PTI cover is a second figure beside it; an alert about PTI stock states its own basis |
| INV-D2 | Capacity stays one value per week on the 13-week grid, with "Copy W36 to all weeks" per row (built 2026-10-23, `SupplierCapacity.jsx`) |
| INV-D3 | The labelled sample row on Stock simulation stays until a seed pair reproduces the MR-7 worked example |
| INV-D4 | One weekly status on the stock-update cutoff; no second deadline and no SOP link until BL-149 is answered |
| INV-D5 | Alert next steps now; one card per supplier × material (P-04) waits for the rule list (BL-150) |
| INV-D6 | Only the administrator lane changes a supplier's update mode; Inventory shows the mode with a link to the admin page |
| INV-D7 | In the stock simulation a call-off counts as shipped from dispatch, with or without an ASN |
| INV-D8 | On a gap week PTI can "Accept additional capacity" or "Ask supplier", both recorded on the planning group and week; "Move demand" is not built here |
| INV-D9 | "Ask supplier" is a hub ask on the supplier's To do, with an optional WhatsApp share of the link; no email |
| INV-D10 | A blank template row is not an error: "N rows left blank, not sent" |
| INV-D11 | When PTI removes all stock access, the supplier's Stock page says "PTI stopped sharing its stock with you on <date>" (built 2026-10-23, `SupplierInventory.jsx`) |
| INV-D14 | Alert thresholds and the stale period can be overridden per material group (built 2026-10-23, `hubSettingsStore.js` `groupSetting`, admin `GroupOverridesPanel.jsx`) |
| INV-D12 | An accepted amber week no longer counts toward the capacity alert; a red week always counts |
| INV-D13 | PTI may accept additional capacity before the supplier confirms it |
| MAT-D1 | Keep CR-24 High, Medium, Low; sort by days to impact within a class, then supplier name |
| MAT-D2, MAT-D3 | Stock simulation is its own page; the manufacturer → distributor leg is "To distributor" |
| MAT-D4, MAT-D21 | In-production quantity required (0 allowed); completion date required when it is above 0; the verb enforces both except on an API pull |
| MAT-D7, MAT-D8, MAT-D17 | Cutoff Thursday 23:59 WIB (last working day before it on a holiday); an API figure is stale 24 hours after the last successful pull; a failed pull does not make a figure stale |
| MAT-D9 | Performance score = (1 − w) × delivery score + w × update compliance, w = 0.10 |
| MAT-D10, MAT-D11 | "Already called off, not shipped" and "Free to call off" beside supplier available stock; the production cap uses allocated capacity only |
| MAT-D12, MAT-D20 | Planning groups are mastered in the hub for now; a group's LTP is the sum of its materials' LTP |
| CAP-D1 | An amber week is the week that "needs confirmation"; the supplier confirms its additional capacity per week |
| CAP-D2 | The shortfall reason Discontinued raises a PTI alert to find another source |
| CAP-D8 | Force Majeure, Discontinued and Other need a note on the shortfall lists; every [Proposed] value is the starting value |
| CAP-D9 | Several blanket POs for one supplier × material draw down oldest first; one run-out alert per group, on the last PO |
| DRC-D10 | Suppliers do not see demand anticipation until the formulas are confirmed (`SUPPLIER_DA_VIEW_ENABLED` is false) |
| DRC-D15, DRC-D20 | The supplier ROP is display only; "Supplier stock below supplier ROP" compares with the system ROP Supplier and does not fire without it |
| DRC-D17 | Suppliers confirm their current feedstock with a confirmation date |

---

## 3. Personas and permissions

The hub has two personas. A PTI seat holds business roles; a supplier seat holds lanes. Permission is checked per verb by an atom (`services/transitions/businessRoles.js`). This area uses 15 atoms.

| Holder | Atoms in this area |
|---|---|
| PTI **Planning** lane (`businessRoles.js:353`) | `inventorydeclaration:record` (`:357`), `stocksync:run`, `stockaccess:manage`, `inventoryalert:close` (`:366-368`), `planninggroup:manage` (`:390`), `inventory:simulate` (`:396`), `supplierask:raise`, `supplierask:close` (`:400-401`), `capacitydecision:accept` (`:405`) |
| PTI **Compliance** lane (`businessRoles.js:261`) | `supplier:set-update-mode` (`:329`) |
| Supplier **Fulfilment** lane (`businessRoles.js:480`) | `inventorydeclaration:declare` (`:502`), `stocksync:pull` (`:505`), `capacity:confirm` (`:508`), `feedstock:confirm` (`:514`), `supplierask:answer` (`:518`) |

The `admin` and `buyer_all` supersets derive their atoms from the lanes. No supplier lane holds a PTI atom and no automation atom acts in this area. A seat that lacks the atom sees "Awaiting {owner}" in place of the action (`components/ui-v2/HandoffNotice.jsx`); each surface gates the form or mode, not only the button (for example `pages-v2/inventory/PtiAsksBlock.jsx:40`, `pages-v2/inventory/AskSupplierButton.jsx:81`).

**Tenancy (must be enforced server-side in production):**
- A supplier reads only its own inventory rows; PTI stock is removed from every row its access grant does not cover, on every read (`services/data/mock/MockProcurementService.js:489-493`, `services/transitions/inventoryRules.js:604-618`). The system ROP Supplier is added for PTI only (`MockProcurementService.js:498-504`).
- A supplier never reads the 7 PTI-only alert rules (`MockProcurementService.js:661-664`, `services/transitions/inventoryAlertRules.js:103`), never reads Stock simulation (`services/data/mock/stockSimulationReadModel.js:99`), and reads planning groups only for its own materials, without the change log (`MockProcurementService.js:607-620`).
- A supplier reads only the asks and capacity decisions that name it (`MockProcurementService.js:639-650`) and only its own update mode (`services/data/mock/MockSupplierService.js:68-72`).
- On the write side, a supplier may create only for itself, and a PTI seat may not create for a supplier the data does not name on targets that set `requireCreationOwner` (`services/transitions/dispatcher.js:476-486`). Planning groups and simulation inputs name no owner, so every supplier scope is refused (`services/data/mock/targets/planningGroup.js:58`, `services/data/mock/targets/simulationOverride.js:26`).

---

## 4. Screens

Screenshots for UC6 and UC7 (`user-guide/screens/UC6-*.png`, `UC7-*.png`) were taken on 2026-10-06, before Inventory UX waves 1 and 2. They show the older layouts; the mockups in `research/inventory-ux-mockups/` show the risk-first table, the alert next step and the supplier Stock page as built.

### 4.1 PTI

| Route | Screen | What it does |
|---|---|---|
| `/buyer/inventory` (`router/AppRouter.jsx:201`) | Inventory | Four tiles that filter the table (High risk, PTI stock below PTI ROP, Supplier figures out of date, No lead time on record; `pages-v2/BuyerInventory.jsx:85`); Raw material, Packaging and All types; one material search; table Material · supplier, Risk · supplier cover (PTI cover beside it), Supplier stock, PTI stock / ROP, Incoming (opens the per-date detail), Updated. An API panel lists connected suppliers with last sync and "Sync" (`stocksync:run`). "Record stock from a supplier message" opens the stock entry form (`inventorydeclaration:record`). No "available" figure |
| `/buyer/inventory` row | Material drawer (`pages-v2/inventory/MaterialDrawer.jsx`) | Why the class is what it is (CR-24 basis); PIC, this cycle, supplier ROP marked display only (`:249`) and the system ROP Supplier, feedstock, free to call off; the pair's open alerts; the update mode with a link to Administration → Suppliers (`:198`); actions Open stock simulation, Create call-off (only on an agreement line with quantity left and not over-called) or Create PO request, Ask supplier (stock figures when missing or stale, else a production date, `:164-165`), Sync, Record stock |
| `/buyer/stock-simulation` (`AppRouter.jsx:203`) | Stock simulation | Check date and filters in the URL; per supplier × material: Supplier available, Already called off (not shipped), Free to call off, PTI inbound in its own cell, last update, basis, flags; a row opens 13 weekly buckets and the planner inputs (`inventory:simulate`); "Over-called by N" offers Create PO request and Ask supplier (`pages-v2/BuyerStockSimulation.jsx:560`). A labelled sample row reproduces the MR-7 example (INV-D3) |
| `/buyer/capacity` (`AppRouter.jsx:204`) | Capacity | Per supplier × planning group, weeks as columns: LTP, capacity, additional capacity, BE, the state pill (within, amber "Needs the additional capacity", red "Cannot be supplied"), the supplier's reason, "Needs re-entry"; filters supplier, planning group, material, gaps only and reason kept in the URL, plus status chips; a "PTI's decision" row per plan (`pages-v2/BuyerCapacity.jsx:320`, `:671`) with Accept additional capacity on an amber week, "Still short: N" on a red week, and Ask supplier on both. Read-only strategic and protection buffer sections below |
| `/buyer/alerts` (`AppRouter.jsx:205`) | Alerts | Open and Closed tabs (`pages-v2/BuyerAlerts.jsx:132`); High to Low, then fewest days to impact, grouped per supplier; each open alert shows Impact in N days, its own basis, a next step and the actions that fit its rule (`pages-v2/inventory/alertNextStep.jsx:46`); Close alert with a reason (`inventoryalert:close`); the Closed tab filters by reason and counts closures per rule per reason |
| `/buyer/supplier-access` (`AppRouter.jsx:206`) | Supplier access | Per supplier: grant access to every material or chosen ones (consignment marked), change, remove (`stockaccess:manage`, `pages-v2/BuyerSupplierAccess.jsx:42`); the change log with who and when. Remove acts at once, with no confirmation (P-13, not in this build) |

### 4.2 Supplier

| Route | Screen | What it does |
|---|---|---|
| `/supplier/home` (`AppRouter.jsx:249`) | To do | The Stock lane carries "Weekly stock update · N of M sent · due …" (manual suppliers), stale figures (API suppliers) and "Capacity confirmations due" (`pages-v2/SupplierHome.jsx:320`, `:330`, `:346`); the weekly panel; the "PTI is asking about N" block above the lanes (`:606`); "Alerts about your materials" from the 5 supplier-visible rules (`:609`) |
| `/supplier/inventory` (`AppRouter.jsx:287`) | Stock | Header actions "Enter stock on screen" and "Upload template", the upload result under them, the weekly status, the "PTI is asking" block, then tabs My stock, Feedstock to confirm, My materials, Template guide (`pages-v2/SupplierInventory.jsx:83`). API suppliers get Sync (`stocksync:pull`); a supplier with an access grant gets "Refresh PTI stock" (a read, absent without a grant). In transit is read-only beside in production on both entry methods |
| `/supplier/capacity` (`AppRouter.jsx:290`) | Capacity | One tab per planning group, 13 weeks as columns, Weekly or Monthly (Monthly read only); capacity, additional capacity, a reason (and note for Force Majeure, Discontinued, Other) below the LTP; "Confirm additional capacity" on an amber week; "PTI accepted your additional capacity on …" read only when PTI accepted; Submit capacity (`capacity:confirm`, `pages-v2/SupplierCapacity.jsx:168`) |

**Stock entry form** (`pages-v2/inventory/StockEntryPanel.jsx`): the same fields as the template (stock on hand, supplier ROP, in-production quantity and completion date, optional batches with number, quantity, manufacturing and expiry date); the unit is the material's and never typed. A supplier saves through `declare` with channel `manual` and PTI through `record` (`StockEntryPanel.jsx:201-202`); the template upload saves through `declare` with channel `template` (`pages-v2/inventory/StockUploadPanel.jsx:176`).

**Ask supplier control** (`pages-v2/inventory/AskSupplierButton.jsx`): with no live ask on the subject, a dialog with topic, a prefilled question and an optional due date; with a live ask, its state, question and answer, "Withdraw ask" (Open) or "Close ask" (Answered), and an optional WhatsApp share of the hub link. Placed on the material drawer, alerts (`alertNextStep.jsx:260`, `:269`), Stock simulation and capacity gap weeks (`pages-v2/inventory/CapacityGapActions.jsx:106`).

### 4.3 Administration

| Route | Screen | What it does |
|---|---|---|
| `/buyer/admin/suppliers` (`AppRouter.jsx:232`) | Suppliers | Each supplier's stock update mode (API or manual) and where it came from; one form to change it with an optional reason (`supplier:set-update-mode`, `pages-v2/admin/AdminSuppliers.jsx:77`); the changes on record |
| `/buyer/admin/planning-groups` (`AppRouter.jsx:238`) | Planning groups | Create, rename, move materials, retire an empty group (`planninggroup:manage`, `pages-v2/admin/AdminPlanningGroups.jsx:105`); the change log |
| `/buyer/admin/alert-thresholds` (`AppRouter.jsx:244`) | Alert thresholds and stale periods | The CR-02 bands, the CR-24 multiple, CR-03 thresholds, stale periods, sync interval and cutoff (flow `hubSetting`, atom `setting:set`) |
| `/buyer/admin/reason-codes` (`AppRouter.jsx:245`) | Reason codes | The `capacityShortfall` and `alertClose` lists among others: add, rename, retire, never delete (flow `reasonCode`) |

### 4.4 Shared conventions
- Every string is in English and Indonesian through `t()`; quantities follow the reader's language (X-01); dates use `formatDate`.
- Design rules DP-1 to DP-3 (`paragon-supplier-portal/CLAUDE.md`): outline buttons only, semantic colour for state only, monospace data tokens.
- Honesty markers stay visible: "Sample data" on every page, the simulated API connection, "Scheduled sync: not active in the prototype", "Provisional" and "Proposed" on the buffer sections, the sample row on Stock simulation, the MRP controller sample label.

---

## 5. Flows (state machines)

All state changes go through verbs in `src/services/transitions/flows/`. A verb names its from-states, its to-state, the atom it needs and its policy hooks. The dispatcher checks scope first, then role, stale state, legality, fields and policy (`services/transitions/dispatcher.js:476-486`, `services/transitions/refusals.js:61`). A refused hook returns `POLICY_REJECTED:<hook>:<reason>` (`dispatcher.js:676`). The 11 flows hold 21 verbs; no cascade links any of them.

| Verb | Flow | From → to | Atom | Policy hook |
|---|---|---|---|---|
| `t_inventorydeclaration_declare` | inventoryDeclaration | ∅ → Declared | `inventorydeclaration:declare` | SDC_MATERIAL_KNOWN, INV_DECLARE_BATCH_TOTAL, INV_DECLARE_DETAIL_VALID |
| `t_inventorydeclaration_record` | inventoryDeclaration | ∅ → Declared | `inventorydeclaration:record` | the same three |
| `t_stocksync_run` | stockSync | ∅ → Recorded | `stocksync:run` | STOCK_SYNC_CONNECTED |
| `t_stocksync_pull` | stockSync | ∅ → Recorded | `stocksync:pull` | STOCK_SYNC_CONNECTED |
| `t_stockaccess_grant` | stockAccess | NoAccess → Granted | `stockaccess:manage` | STOCK_ACCESS_SCOPE_VALID |
| `t_stockaccess_change` | stockAccess | Granted → Granted | `stockaccess:manage` | STOCK_ACCESS_SCOPE_VALID |
| `t_stockaccess_remove` | stockAccess | Granted → NoAccess | `stockaccess:manage` | none |
| `t_capacity_submit` | capacitySubmission | ∅ → Submitted | `capacity:confirm` | CAPACITY_SUBMISSION_VALID |
| `t_capacitydecision_accept` | capacityDecision | ∅ → Accepted | `capacitydecision:accept` | CAPACITY_DECISION_ACCEPTABLE |
| `t_capacitydecision_withdraw` | capacityDecision | Accepted → Withdrawn | `capacitydecision:accept` | none (BL-227) |
| `t_planninggroup_create` | planningGroup | ∅ → Active | `planninggroup:manage` | PLANNING_GROUP_VALID |
| `t_planninggroup_rename` | planningGroup | Active → Active | `planninggroup:manage` | PLANNING_GROUP_VALID |
| `t_planninggroup_move_materials` | planningGroup | Active → Active | `planninggroup:manage` | PLANNING_GROUP_VALID |
| `t_planninggroup_retire` | planningGroup | Active → Retired | `planninggroup:manage` | PLANNING_GROUP_VALID |
| `t_inventoryalert_close` | inventoryAlert | Open → Closed | `inventoryalert:close` | ALERT_CLOSE_REASON_GIVEN |
| `t_simulation_override_set` | simulationOverride | ∅ → Recorded | `inventory:simulate` | SIMULATION_OVERRIDE_VALID |
| `t_feedstock_confirm` | feedstockConfirmation | ∅ → Confirmed | `feedstock:confirm` | FEEDSTOCK_CONFIRMATION_VALID |
| `t_supplierask_raise` | supplierAsk | ∅ → Open | `supplierask:raise` | SUPPLIER_ASK_RAISABLE |
| `t_supplierask_answer` | supplierAsk | Open → Answered | `supplierask:answer` | SUPPLIER_ASK_ANSWERABLE |
| `t_supplierask_close` | supplierAsk | Answered → Closed | `supplierask:close` | none |
| `t_supplierask_withdraw` | supplierAsk | Open → Withdrawn | `supplierask:close` | none |
| `t_supplier_set_update_mode` | supplierOverlay | Defined → Defined | `supplier:set-update-mode` | SUPPLIER_UPDATE_MODE_VALID |

Required fields and side effects, flow by flow:
- **inventoryDeclaration** (`flows/inventoryDeclaration.flow.js:80`, `:110`): needs `materialCode` and `totalQty`. A declaration is an immutable snapshot; current stock is the latest per supplier × material. `declare` is the supplier's own act; `record` is PTI recording a supplier's message, stored with channel `pti` whatever the payload says (`services/transitions/inventoryRules.js:1147`). The unit comes from the material master, never the payload.
- **stockSync** (`flows/stockSync.flow.js:38`, `:50`): one attempt per press, success or failure. On success the simulated answer is written as declarations with channel `api`; on failure the attempt is recorded with an error key and the previous figures are kept (`services/data/mock/MockCommandService.js:3244`, `:3291-3292`).
- **stockAccess** (`flows/stockAccess.flow.js:30-55`): `entityId` is the supplier. An empty material list means every material. Every change appends to the grant's log with the actor and time (`MockCommandService.js:3334-3339`).
- **capacitySubmission** (`flows/capacitySubmission.flow.js:28`): needs `supplierId`, `planningGroupId` and `weeks`. A changed plan is a new submission; the latest per supplier × planning group wins at read. "Confirm additional capacity" rides this verb as `upsideConfirmed: true` on the week; there is no separate verb.
- **capacityDecision** (`flows/capacityDecision.flow.js:38`): needs `supplierId`, `planningGroupId` and `week`. The planner can undo an acceptance (`t_capacitydecision_withdraw`, BL-227): the row is marked withdrawn and kept, the week counts toward the alert again, and Accept records a new decision.
- **planningGroup** (`flows/planningGroup.flow.js:36-71`): a move appends to the material overlay, which makes a material's group single-valued (`services/data/mock/targets/planningGroup.js:86-101`). A group with materials cannot be retired; `Retired` is terminal.
- **inventoryAlert** (`flows/inventoryAlert.flow.js:26`): the alert is a condition derived at read, keyed rule × subject × supplier. Only the closure is stored. A closed alert stays closed while its condition persists; once the condition clears and returns, it is a new open alert (`services/transitions/inventoryAlertRules.js:580`, `:594`).
- **simulationOverride** (`flows/simulationOverride.flow.js:30`): needs supplier, material, field (`soh`, `inProduction`, `toDistributor`) and value. Used by the simulation until the supplier's next stock record; never touches the stock record or update compliance.
- **feedstockConfirmation** (`flows/feedstockConfirmation.flow.js:36`): writes only to its own store; supplier stock, the simulation and "free to call off" never read it.
- **supplierAsk** (`flows/supplierAsk.flow.js:25-69`): states Open, Answered, Closed, Withdrawn; Closed and Withdrawn are terminal; a new question is a new ask. Each act appends a history step with actor and time.
- **supplierOverlay** (`flows/supplierOverlay.flow.js:37`): `entityId` is the supplier; each change appends a row with who, when and an optional reason. A change mid-cycle applies from the next cycle (REQ-E08-02 BR-16).

---

## 6. Business rules

Each rule is one pure function shared by the page (to explain) and the verb (to refuse). Production must keep the single source: the screen and the server read the same rule. Defaults are hub settings an administrator can change (`services/transitions/hubSettings.js`).

| Rule | Where | What it decides |
|---|---|---|
| Days of supply, CR-01 | `services/transitions/inventoryRules.js:179`; window `services/transitions/inventoryConfig.js:28` | SOH ÷ average daily demand; demand = forecast for the next 30 days ÷ 30 |
| Bands, CR-02 | `inventoryRules.js:189`; defaults `hubSettings.js:268`, `:278`, `:288` | Critical below 14 days, Warning below 30, Healthy up to 60, Excess above. Fallback only, where the lead time is missing |
| Risk class, CR-24 | `inventoryRules.js:243`; multiple `hubSettings.js:257` | Supplier cover below the lead time is High, below 1.5 × lead time Medium, else Low; strict at both cuts. No lead time: CR-02 bands, and a `leadTimeMissing` alert. No cover: Low |
| Coverage, CR-03 | `inventoryRules.js:363`; defaults `hubSettings.js:298`, `:307` | (supplier SOH + incoming) ÷ 30-day demand: Covered at 100% or more, At risk from 80%, Uncovered below; no demand is Covered |
| Freshness | `inventoryRules.js:401`; `services/transitions/updateCycle.js:206` | Missing, stale or current. Manual: stale at the cutoff after the cycle it was updated in. API: stale 24 hours after the last successful pull (`hubSettings.js:646`); a failed pull does not make it stale (MAT-D17). A per supplier × material stale period wins over both |
| Weekly cycle | `updateCycle.js:88`; defaults `hubSettings.js:658`, `:668` | Cutoff day 4 (Thursday) at minute 1439 (23:59 WIB); the last working day before it when Thursday is not a working day; reminders at 09:00 WIB (`updateCycle.js:289`) |
| Update compliance | `services/transitions/updateCompliance.js:29-33` | Over 13 weeks, the first 4 weeks after onboarding not counted, "No history" below 4 counted weeks |
| PTI stock below PTI ROP | `inventoryRules.js:414` | PTI SOH below PTI ROP |
| Supplier stock below ROP | `inventoryRules.js:425` | Supplier SOH below the system ROP Supplier; no system figure, no alert (DRC-D20). The supplier-typed ROP is display only |
| Projected stock-out | `inventoryRules.js:440` | PTI SOH ÷ the material's daily demand (all suppliers) is fewer days than until the next incoming date; no incoming date, no alert |
| Template | `inventoryRules.js:649` | 10 columns: material code, stock on hand, unit, in-production quantity required; completion date required when in production is above 0; supplier ROP and the 4 batch columns optional (header ends " (optional)" / " (opsional)") |
| In production, MAT-D4 | `inventoryRules.js:719` | Required (0 allowed) on manual, template and PTI records; completion date required above 0; the `api` channel is exempt |
| Batch dates | `inventoryRules.js:751` | Each date a `YYYY-MM-DD` day; manufacturing not after expiry and not in the future |
| Number reading, CR-18 | `inventoryRules.js:914` | A number that reads differently in Indonesian and English (`1.500`) is refused, not guessed |
| Batch total, CR-19 | `inventoryRules.js:1116`; verb `MockCommandService.js:3133` | Batch quantities add up to the SOH; a material's rows are accepted or refused together |
| Blank rows, INV-D10 | `inventoryRules.js:931` | A row with only the code and unit filled is "left blank, not sent", not refused |
| Upload validation | `inventoryRules.js:959` | Row by row; a refused row lists its row number, material, field and reason; valid materials are saved |
| PTI stock access | `inventoryRules.js:604`, `:615` | No active grant, no PTI stock; an empty material list grants every material |
| Capacity horizon | `inventoryConfig.js:139`; `services/transitions/capacityRules.js:38` | 13 weeks from the current Monday |
| Capacity submission | `capacityRules.js:257` | Every horizon week once, quantities 0 or more, a reason below the LTP from the active `capacityShortfall` list, a note for Force Majeure, Discontinued and Other (`services/transitions/reasonCodes.js:167`) |
| LTP against capacity | `capacityRules.js:322`, `:332` | BE = capacity + additional capacity, derived. LTP ≤ capacity: within; up to and including BE: amber; above BE: red; no entry: unconfirmed |
| Plan status | `capacityRules.js:195` | Not started, gap, outdated (a week missing or needing re-entry), confirmed |
| Re-entry, MR-8 BR-05 | `services/transitions/planningGroupRules.js:228` | A move of materials after a submission marks the group's weeks not yet past as "Needs re-entry" |
| Capacity alert weeks, INV-D12 | `capacityRules.js:163` | Gap weeks count, except an amber week PTI accepted |
| Accept additional capacity | `services/transitions/capacityDecisionRules.js:52` | Only on an amber week of a stated plan, once per supplier × planning group × week |
| Planning groups | `planningGroupRules.js:156` | Name required; one SAP material group per planning group; a material in one group only; retire only when empty |
| Stock simulation | `services/transitions/simulateSupplierStock.js:694` | Available(d) = SOH(t0) − ASNs shipped after t0 (`:46`) − call-offs dispatched with no ASN + to-distributor legs Booked, Shipped or Arrived (`:58`) + production completing, capped by allocated capacity; free = available − called off, not shipped; PTI inbound in its own figure; a check date before t0 is refused |
| Planner input | `simulateSupplierStock.js:838` | Known supplier and material; field `soh` without a date, `inProduction` and `toDistributor` with one; quantity 0 or more |
| Alert rules | `inventoryAlertRules.js:81`, `:351` | 12 rules: ptiBelowRop, supplierBelowRop, projectedStockOut, capacityBelowDemand, staleData, coverage, commitmentBelowForecast, leadTimeMissing, callOffNotCovered, supplyDiscontinued, blanketPoRunOut, demandAnticipationUnabsorbed. One open alert per key |
| PTI-only rules | `inventoryAlertRules.js:103` | 7 rules never shown to a supplier: ptiBelowRop, projectedStockOut, leadTimeMissing, callOffNotCovered, supplyDiscontinued, blanketPoRunOut, demandAnticipationUnabsorbed |
| Alert order | `inventoryAlertRules.js:625`, `:708` | Class High to Low, fewest days to impact, supplier name; a supplier group sits at its most urgent alert |
| Alert close | `inventoryAlertRules.js:647`; list `reasonCodes.js:108` | An active `alertClose` reason; "Other" needs a note. Starter list: calloff-raised, po-raised, supplier-updated, supplier-confirmed-other, data-error, risk-accepted, other. A closure from before reasons counts as Other (`inventoryAlertRules.js:663`) |
| Next step per rule | `pages-v2/inventory/alertNextStep.jsx:46` | Which rules offer Open stock simulation, Create call-off or PO request, Ask supplier (and its topic), or the page link |
| Ask supplier | `services/transitions/supplierAskRules.js:122`, `:142` | Topic one of productionDate, stockFigures, capacityGap, other; subject a material or a planning group with a week; the supplier supplies it; question and answer 1 to 1000 characters; due date from today on; one live ask (Open or Answered) per supplier × subject (`services/data/mock/targets/supplierAsk.js:133`) |
| Feedstock confirmation | `services/transitions/feedstockRules.js:109` | Material assigned; quantity 0 or more; confirmation date required, a day, not in the future; note up to 500 characters (`feedstockRules.js:47`); "Incoming DA confirmed" only with the supplier DA view on |
| Update mode | `services/transitions/supplierOverlayRules.js:42` | A known supplier; mode `api` or `manual`. The mode alone decides "API-connected" (`services/data/mock/inventoryReadModel.js:78`) |

---

## 7. Refusal codes

A refused verb returns `POLICY_REJECTED:<hook>:<reason>`. The screen translates the code; tests assert it. Production must return the same codes. The 14 hooks return 52 coded refusals (47 distinct code names), 3 lower-case codes and 11 sentences with no code. Below, `<…>` marks a value filled in at run time.

**Stock declare and record** (`MockCommandService.js:3020`, `:3133`, `:3163`):
- `UNKNOWN_MATERIAL: '<code>' is not in the material master — no canonical unit exists for it, and a quantity without a trustworthy unit is not a fact this platform stores`
- `missingField: in-production quantity is required (0 allowed)`
- `productionDateMissing: a production completion date is required when in-production quantity is above 0`
- `invalidDate: production completion date must be a date (YYYY-MM-DD)`
- No code: `batch total <sum> does not equal declared totalQty <total> — a total that disagrees with its own detail is fabricated`; `<field> must be a number of zero or more`; `production completion date must be a date (YYYY-MM-DD)`; `channel must be template or manual`; `batch <number>: <manufacturing|expiry> date must be a date (YYYY-MM-DD)`; `batch <number>: manufacturing date is after the expiry date`; `batch <number>: manufacturing date is in the future`.

**Stock sync** (`MockCommandService.js:3305`): `NOT_API_CONNECTED: this supplier shares stock by template or manual entry, not by API`

**Stock access** (`MockCommandService.js:3353-3362`): `NOT_SUPPLIED: <material> is not a material this supplier supplies`. No code: `supplier not found in the inventory view`; `materials must be a list (empty for every material)`.

**Capacity submission** (`MockCommandService.js:3411-3433`, rule `capacityRules.js:257`): each reads `<CODE>: week <YYYY-MM-DD>`, with CODE one of `NOWEEKS`, `WEEKOUTSIDEHORIZON`, `DUPLICATEWEEK`, `INVALIDQUANTITY`, `MISSINGWEEK`, `BELOW_DEMAND_NEEDS_REASON`, `OTHER_REASON_NEEDS_NOTE`. No code: `no materials of this group are assigned to the supplier`; `weeks must be a list`.

**Alert close** (`MockCommandService.js:3468-3469`):
- `NOTE_REQUIRED: the reason "other" needs a note`
- `REASON_UNKNOWN: <reason as JSON> is not an active alert close reason`

**Accept additional capacity** (`capacityDecisionRules.js:33-39`; format `targets/capacityDecision.js:89`):
- `WEEK_NOT_IN_PLAN: the supplier has no capacity plan for this planning group and week`
- `CAPACITY_NOT_STATED: the supplier has not stated its capacity for this week`
- `NOT_A_GAP_WEEK: the LTP is within the supplier’s capacity this week, so there is nothing to accept`
- `ABOVE_ADDITIONAL_CAPACITY: the LTP is above capacity plus additional capacity, so the additional capacity cannot cover this week`
- `ALREADY_ACCEPTED: PTI has already accepted the additional capacity for this week`

**Ask supplier** (`supplierAskRules.js:47-55`; format `targets/supplierAsk.js:144`):
- `TOPIC_UNKNOWN: the topic is not one PTI can ask about`
- `SUBJECT_REQUIRED: name either a material, or a planning group and a week`
- `NOT_SUPPLIED: the supplier does not supply this material or planning group week`
- `QUESTION_REQUIRED: the question is empty`
- `TEXT_TOO_LONG: the text is longer than 1000 characters`
- `DUE_DATE_INVALID: the due date is not a date from today on`
- `ASK_ALREADY_OPEN: PTI already has an ask on this subject that is not closed`
- `ANSWER_REQUIRED: the answer is empty`
- `ANSWER_DATE_INVALID: the date in the answer is not a date`

**Planning groups** (`planningGroupRules.js:156-201`; `targets/planningGroup.js:134`):
- `NAME_REQUIRED: a planning group needs a name`
- `UNKNOWN_SAP_GROUP: <group> is not an SAP material group with materials`
- `NO_MATERIALS: choose at least 1 material to move`
- `UNKNOWN_MATERIAL: <code> is not in the material master`
- `MIXED_SAP_GROUP: <code> is in SAP group <group>, and <planning group> is under <group>`
- `ALREADY_IN_GROUP: <code> is already in <planning group>`
- `RETIRE_NOT_EMPTY: <planning group> still holds <n> material(s); move them out first`
- `UNKNOWN_GROUP: <planning group>`

**Planner input** (`simulateSupplierStock.js:838-849`), code only, no sentence: `UNKNOWN_SUPPLIER`, `UNKNOWN_MATERIAL`, `UNKNOWN_FIELD`, `INVALID_QUANTITY`, `DATE_REQUIRED`, `INVALID_DATE`, `DATE_NOT_ALLOWED`.

**Feedstock confirmation** (`feedstockRules.js:59-69`), code only: `NOT_ASSIGNED`, `QTY_INVALID`, `DATE_REQUIRED`, `DATE_INVALID`, `DATE_IN_FUTURE`, `NOTE_INVALID`, `NOTE_TOO_LONG`, `INCOMING_DA_INVALID`, `INCOMING_DA_NOT_AVAILABLE`.

**Update mode** (`supplierOverlayRules.js:42-48`):
- `UNKNOWN_SUPPLIER: <supplier> is not on the supplier master`
- `UPDATE_MODE_INVALID: the stock update mode must be api or manual, got <value as JSON>`

**Read-side refusals (not verbs).** Stock simulation answers `INVALID_CHECK_DATE` or `CHECK_DATE_BEFORE_LAST_UPDATE` for a row (`simulateSupplierStock.js:212`). The dispatcher throws `SCOPE_DENIED` for a creation the scope may not make (`dispatcher.js:478`, `:486`); the stock entry form shows it as "material not assigned" (`pages-v2/inventory/inventoryDisplay.jsx:383`).

---

## 8. Data

**Records** (`services/data/types.js`, `services/sdc/types.js`): InventoryDeclaration (supplier, material, declared at, total quantity, unit from the master, optional batches, supplier ROP, in-production quantity and completion date, channel `template` / `manual` / `api` / `pti`), StockSyncAttempt (supplier, time, outcome, error key), StockAccessGrant (supplier, active, materials, log), CapacitySubmission (supplier, planning group, submitted at, weeks with allocated, additional, `upsideConfirmed`, reason, note), CapacityDecision (supplier, planning group, week, decided at and by), PlanningGroupEvent (created, renamed, moved, retired), SupplierUpdateModeChange, AlertLedgerEntry (closed with reason and note, or cleared), SimulationOverride (field, value, date, entered by and at), FeedstockConfirmation (quantity, unit, confirmed on, note, Incoming DA publication), SupplierAsk (subject, topic, risk class, question, due date, state, history).

**Derived at read, never stored:** inventory positions, days of supply, risk class and basis, coverage, freshness, the weekly status and update compliance, capacity plans with LTP and BE, plan status, re-entry weeks, every alert condition and its days to impact, the stock simulation, the planning groups themselves.

**Append-only (production must not update or delete):** declarations, sync attempts, capacity submissions, capacity decisions, the planning group log and the material overlay, the supplier overlay, the alert ledger, simulation inputs, feedstock confirmations. Two stores break this in the prototype (Annex A.4).

**Identity:** every record carries the actor from the session; the prototype records `UNATTRIBUTED: NO_PERSON_IN_SESSION` until a sign-in provider names a person.

**Seed and sample data:** stock, capacity, access and sync seeds (`services/data/mock/fixtures/inventoryHub.js`), the simulated API answers, the sample weekly history behind update compliance, and the MR-7 sample row. Every page carries "Sample data".

---

## 9. What production must add

| Need | Prototype today | Production | Backlog |
|---|---|---|---|
| Backend and database | In-memory stores, reset on reload | Server stores with the same verbs, rules and refusals; tenancy enforced on the server | Stage F |
| Supplier API pull | Sync reads a sample answer per supplier | A real pull per supplier, with an API contract each | BL-25 |
| Scheduled pull | Setting, "Last sync" and "Next sync" built; no schedule runs | Pull every `stockSync.intervalHours` (2) | BL-151 |
| Email | None; alerts, reminders and asks exist only in the hub | Alerts, the cutoff reminder, asks | BL-26, BL-153 |
| SOP link and the second weekly deadline | One status on the cutoff (INV-D4) | Link to Material Planning's SOP; the second deadline once named | BL-149 |
| Alert rule list | 12 rules; per supplier × material cards not built | Check the 2026-09-23 list; add rules; build P-04 | BL-150 |
| SAP material feed | MRP controller, shelf life and material group are sample values | The feed from Master Data Management | BL-152 |
| Distributor principal on a shipment | ETA fallback uses the distributor's shortest principal lead time | The leg's own principal | BL-158 |
| Planning groups in SAP | Mastered in the hub | Agree with MDM (MAT-D12) | — |
| Move demand | Not on Capacity | On the order plan (INV-D8) | — |
| Polish | Built (BL-221, BL-223, BL-224 and BL-227 wording, MR !36, 2026-10-23; BL-227 undo and Ask supplier label, 2026-10-27) | Wave 2 wording and edge states; wave 1 leftovers; Call-offs quantity format; capacity grid polish; Risk page thresholds | BL-227, BL-224, BL-223, BL-186, BL-76 |
| Sign-in | No named person | Named actor on every record | F1 |

---

## 10. Testing

- Gates: `npx -y -p node@24 -- sh -c 'node scripts/gates.mjs'` runs build, spec typecheck, the full vitest suite, the access-gate suite, lint and format, and asserts the floor in `scripts/floor.json`. Node 24 is required (`.nvmrc`). On GitLab the `gates` job runs `npm run gates` on every merge request (`.gitlab-ci.yml`).
- Specs that pin this area: rules `services/transitions/inventoryRules.test.js`, `inventoryAlertRules.test.js`, `capacityAlertRules.test.js`, `planningGroupRules.test.js`, `simulateSupplierStock.test.js`, `feedstockRules.test.js`, `alertHref.test.js`; verbs and reads `services/data/mock/inventoryCommand.test.js`, `inventoryDeclarationRecord.test.js`, `planningGroupCommand.test.js`, `simulationOverrideCommand.test.js`, `stockSimulationRead.test.js`, `stockStaleness.test.js`, `capacityDecision.test.js`, `supplierAsk.test.js`, `feedstockConfirm.test.js`, `capacityBeforeLtp.bl133.test.js`; pages `pages-v2/BuyerInventory.riskFirst.page.test.jsx`, `BuyerAlerts.nextStep.p03.page.test.jsx`, `BuyerStockSimulation.test.jsx`, `SupplierInventory.test.jsx`, `InventoryCapacity.test.jsx`, `weeklyUpdate.page.test.jsx`, `cap3CapacityStates.page.test.jsx`, `planningGroupCapacity.page.test.jsx`, `oneStockEntry.guard.test.js`, `admin/AdminSuppliers.test.jsx`, `admin/AdminPlanningGroups.test.jsx`, and in `pages-v2/inventory/`: `stockPageUx.page.test.jsx`, `ptiAsks.s04.page.test.jsx`, `AskSupplierButton.page.test.jsx`, `capacityGapActions.p07.page.test.jsx`, `stockSimulationDisplay.test.js`, `inTransitReadOnly.test.jsx`, `feedstockConfirm.page.test.jsx`, `localeQty.x01.page.test.jsx`.
- Each refusal is pinned by a passing and a failing case. Production tests should port these cases against the server.

---

## 11. Source documents

- `SUPPLIER-HUB-REQUIREMENTS.md` — REQ-E08-01 to REQ-E08-08; CR-01, CR-02, CR-03, CR-18, CR-19, CR-24.
- `SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md` — MR-1 to MR-10 and MAT-D1 to MAT-D15.
- `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` — CAP-1 to CAP-12 and CAP-D1 to CAP-D17.
- `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` — DRC-8, DRC-9, DRC-10 and DRC-D decisions.
- `DECISION-GUIDE.md` — INV-D1 to INV-D13, MAT-D1 to MAT-D21.
- `research/INVENTORY-UX-EVALUATION-2026-10.md` — the findings P-01 to P-17, S-01 to S-12, X-01 to X-05, mockups, and the build status (section 10).
- `BUILD-GAP.md` — what is built per requirement; `BACKLOG.md` — what is left.
- `user-guide/SCENARIOS.md` UC6 and UC7 — the end-to-end stock, capacity and alert scenarios.

---

## 12. Calls waiting for owner review, and where code and documents disagree

Built as recommended; the owner may change any of them.

| Area | Call | Recommendation |
|---|---|---|
| Capacity decision | Undo is built; an accepted week that turns red says it counts toward the alert again (BL-227, 2026-10-27) | Done |
| Supplier To do | The block reads "PTI has N questions for you" (BL-227 wording, built 2026-10-23) | Done |
| Ask supplier | The button names its topic ("Ask for a production date"); the hint line is gone (BL-227, 2026-10-27) | Done |
| Alerts | Grouped per supplier; one card per supplier × material waits for the rule list | Keep until BL-150 (INV-D5) |
| Supplier access | Remove acts at once, with no confirmation (P-13) | Add a confirmation in the Minor findings build |
| Capacity refusal codes | Five capacity codes are the rule's camelCase name upper-cased (`MISSINGWEEK`); `OTHER_REASON_NEEDS_NOTE` also fires for Force Majeure and Discontinued | Production: `MISSING_WEEK`-style names and one `NOTE_REQUIRED` code, mapped once |
| Stock declare refusals | 3 codes are lower-case and 7 sentences carry no code | Production: give every refusal an upper-case code |

**Code and documents disagreed; aligned on 2026-10-23.** The code is the truth for what is built, and each case followed a recorded decision, so the documents were corrected to match (branch `docs/inventory-doc-code-align`). The table keeps what each document used to say.

| Topic | Document said | Code does (documents now say the same) |
|---|---|---|
| Alert rules | REQ-E08-05 BR-01 lists 8 rules; SCENARIOS UC7 says 9 | 12 rules (`inventoryAlertRules.js:81`) |
| Supplier below ROP | SCENARIOS UC7: against the ROP the supplier declared | Against the system ROP Supplier (`inventoryRules.js:425`), as DRC-D20 and the REQ-E08-05 amendment say |
| Failed API sync | SCENARIOS UC6 ("figures kept and flagged stale"), BUILD-GAP REQ-E08-02 ("marked out of date"), and the header comment of `pages-v2/inventory/SupplierSyncPanel.jsx` | A failed pull does not make a figure stale (`inventoryRules.js:401-406`, MAT-D17); the screen says the figures stay up to date until the last successful sync is too old |
| Alert thresholds | REQ-E08-05 BR-03: configurable per material group | Built per material group on 2026-10-23 (INV-D14): global set with per-group overrides, stale period supplier × material > group > global (`hubSettingsStore.js`) |
| MRP controller mapping | REQ-E08-07 BR-02 and the BUILD-GAP REQ-E08-07 row: a mapping cannot be removed | `t_mrpcontroller_unmap` exists (`flows/mrpController.flow.js:51`), as BL-157 and the BUILD-GAP MR-5 row say |
| Build status | BACKLOG BL-68 and BL-144: "build pending" | Built: "Supplier cover" in the drawer (`MaterialDrawer.jsx:210`) and the update mode with its admin link (`MaterialDrawer.jsx:198`) |
| File paths | BUILD-GAP section 3 points to `.ts` files (`inventoryRules.ts`, `capacityRules.ts` and others) | Every file is JavaScript (`.js`) |
| Test path | Evaluation section 10 cites `pages-v2/inventory/weeklyUpdate.page.test.jsx` | The spec is `pages-v2/weeklyUpdate.page.test.jsx` |
| Shortfall note | Header comment of `pages-v2/SupplierCapacity.jsx`: "Other" needs a note | Force Majeure, Discontinued and Other need a note (`reasonCodes.js:167`, CAP-D8) |

---

## Annex A. Verbs, hooks and refusals with their source

Read on `main` at `e31cba92` on 2026-10-23. Every `path:line` in this document was opened and checked against the text named in A.5. "MCS" is `services/data/mock/MockCommandService.js`.

### A.1 Where each policy hook is implemented
- MCS: SDC_MATERIAL_KNOWN (`:3020`), INV_DECLARE_BATCH_TOTAL (`:3133`), INV_DECLARE_DETAIL_VALID (`:3163`), STOCK_SYNC_CONNECTED (`:3299`), STOCK_ACCESS_SCOPE_VALID (`:3353`), CAPACITY_SUBMISSION_VALID (`:3411`), ALERT_CLOSE_REASON_GIVEN (`:3461`).
- `services/data/mock/targets/`: CAPACITY_DECISION_ACCEPTABLE (`capacityDecision.js:80`), SUPPLIER_ASK_RAISABLE and SUPPLIER_ASK_ANSWERABLE (`supplierAsk.js:147`, `:168`), PLANNING_GROUP_VALID (`planningGroup.js:115`), SIMULATION_OVERRIDE_VALID (`simulationOverride.js:47`), FEEDSTOCK_CONFIRMATION_VALID (`feedstockConfirmation.js:91`), SUPPLIER_UPDATE_MODE_VALID (`supplierOverlay.js:50`).

### A.2 Command targets
`inventoryDeclaration` (MCS `:3041`), `stockSync` (`:3244`), `stockAccess` (`:3313`), `capacitySubmission` (`:3370`), `inventoryAlert` (`:3439`) in MCS; `capacityDecision`, `supplierAsk`, `planningGroup`, `simulationOverride`, `feedstockConfirmation`, `supplierOverlay` in `services/data/mock/targets/`. All 11 are registered in `TARGETS` (MCS `:6165`); the registered set is `WIRED_COMMAND_TARGETS` (MCS `:6285`); derive it, do not copy it. The page-side dispatch for each verb is in `services/query/commandHooks.js`: `useInventoryCommand` (`:3099`; declare, record, sync, pull, access, capacity, alert close), `useSupplierAskCommand` (`:1877`), `useCapacityDecisionCommand` (`:1952`), `useFeedstockConfirm` (`:1994`), `useSimulationOverrideSet` (`:2785`), `usePlanningGroupCommand` (`:1623`), `useSupplierSetUpdateMode` (`:1518`).

### A.3 Refusal codes by source
- **MCS:** UNKNOWN_MATERIAL, missingField, productionDateMissing, invalidDate, NOT_API_CONNECTED, NOT_SUPPLIED, the 7 capacity codes, NOTE_REQUIRED, REASON_UNKNOWN, and the 11 uncoded sentences.
- **`services/transitions/capacityDecisionRules.js`:** WEEK_NOT_IN_PLAN, CAPACITY_NOT_STATED, NOT_A_GAP_WEEK, ABOVE_ADDITIONAL_CAPACITY, ALREADY_ACCEPTED.
- **`services/transitions/supplierAskRules.js`:** TOPIC_UNKNOWN, SUBJECT_REQUIRED, NOT_SUPPLIED, QUESTION_REQUIRED, TEXT_TOO_LONG, DUE_DATE_INVALID, ASK_ALREADY_OPEN, ANSWER_REQUIRED, ANSWER_DATE_INVALID.
- **`services/transitions/planningGroupRules.js`:** NAME_REQUIRED, UNKNOWN_SAP_GROUP, NO_MATERIALS, UNKNOWN_MATERIAL, MIXED_SAP_GROUP, ALREADY_IN_GROUP, RETIRE_NOT_EMPTY; UNKNOWN_GROUP in `targets/planningGroup.js`.
- **`services/transitions/simulateSupplierStock.js`:** UNKNOWN_SUPPLIER, UNKNOWN_MATERIAL, UNKNOWN_FIELD, INVALID_QUANTITY, DATE_REQUIRED, INVALID_DATE, DATE_NOT_ALLOWED; read side INVALID_CHECK_DATE, CHECK_DATE_BEFORE_LAST_UPDATE.
- **`services/transitions/feedstockRules.js`:** NOT_ASSIGNED, QTY_INVALID, DATE_REQUIRED, DATE_INVALID, DATE_IN_FUTURE, NOTE_INVALID, NOTE_TOO_LONG, INCOMING_DA_INVALID, INCOMING_DA_NOT_AVAILABLE.
- **`services/transitions/supplierOverlayRules.js`:** UNKNOWN_SUPPLIER, UPDATE_MODE_INVALID.

### A.4 Known inconsistencies in the prototype to resolve in production
- `stockAccessStore.put` replaces the whole grant row, log included (`services/data/mock/stores/inventoryHubStores.js:48-52`), and `supplierAskStore.append` rewrites the ask's `state` on the row while it appends the history step (`services/data/mock/stores/supplierAskStore.js:108-111`). Production should append events and derive the grant and the ask state.
- The capacity verb's refusal names are derived by upper-casing the rule's camelCase name (`MCS:3431`), so they read `MISSINGWEEK`, not `MISSING_WEEK`, and the page matches them by substring (`pages-v2/inventory/inventoryDisplay.jsx:383`). Planner input and feedstock refusals carry no sentence.
- The header comment of `SupplierSyncPanel.jsx` says a failed sync marks figures out of date; the rule (`inventoryRules.js:401-406`) and the screen text do not. Treat the code, not the comment, as the truth.
- `t_stockaccess_remove`, `t_supplierask_close` and `t_supplierask_withdraw` run no policy hook; only the role, scope and from-state guard them.

### A.5 References checked
Each reference below was opened on `e31cba92` and holds the named text: 199 distinct `path:line` references, every one used in this document; with the far ends of line ranges, 246 lines were checked.

| Reference | Holds |
|---|---|
| `router/AppRouter.jsx:201`, `:203`, `:204`, `:205`, `:206` | Routes `/buyer/inventory`, `/buyer/stock-simulation`, `/buyer/capacity`, `/buyer/alerts`, `/buyer/supplier-access` |
| `router/AppRouter.jsx:232`, `:238`, `:244`, `:245` | Routes `/buyer/admin/suppliers`, `/buyer/admin/planning-groups`, `/buyer/admin/alert-thresholds`, `/buyer/admin/reason-codes` |
| `router/AppRouter.jsx:249`, `:287`, `:290` | Routes `/supplier/home`, `/supplier/inventory`, `/supplier/capacity` |
| `services/transitions/businessRoles.js:261`, `:353`, `:480` | Lanes `compliance`, `planning`, `fulfilment` |
| `businessRoles.js:329` | `'supplier:set-update-mode'` |
| `businessRoles.js:357`, `:366-368`, `:390`, `:396`, `:400-401`, `:405` | `inventorydeclaration:record`; `stocksync:run`, `stockaccess:manage`, `inventoryalert:close`; `planninggroup:manage`; `inventory:simulate`; `supplierask:raise`, `supplierask:close`; `capacitydecision:accept` |
| `businessRoles.js:502`, `:505`, `:508`, `:514`, `:518` | `inventorydeclaration:declare`, `stocksync:pull`, `capacity:confirm`, `feedstock:confirm`, `supplierask:answer` |
| `flows/inventoryDeclaration.flow.js:80`, `:110` | `t_inventorydeclaration_declare`, `t_inventorydeclaration_record` |
| `flows/stockSync.flow.js:38`, `:50` | `t_stocksync_run`, `t_stocksync_pull` |
| `flows/stockAccess.flow.js:30-55` | `t_stockaccess_grant` to `t_stockaccess_remove` |
| `flows/capacitySubmission.flow.js:28`; `flows/capacityDecision.flow.js:38` | `t_capacity_submit`; `t_capacitydecision_accept` |
| `flows/planningGroup.flow.js:36-71` | `t_planninggroup_create` to `t_planninggroup_retire` |
| `flows/inventoryAlert.flow.js:26`; `flows/simulationOverride.flow.js:30`; `flows/feedstockConfirmation.flow.js:36` | `t_inventoryalert_close`; `t_simulation_override_set`; `t_feedstock_confirm` |
| `flows/supplierAsk.flow.js:25-69`; `flows/supplierOverlay.flow.js:37`; `flows/mrpController.flow.js:51` | supplierAsk states to `t_supplierask_withdraw`; `t_supplier_set_update_mode`; `t_mrpcontroller_unmap` |
| `services/transitions/dispatcher.js:476-486`, `:478`, `:486`, `:676` | Creation scope check; the two `SCOPE_DENIED` throws; `POLICY_REJECTED` with the hook name |
| `services/transitions/refusals.js:61` | `COMMAND_REFUSALS` |
| `services/data/mock/MockProcurementService.js:489-493`, `:498-504`, `:607-620`, `:639-650`, `:661-664` | Supplier mask; system ROP Supplier for PTI; planning groups narrowed; asks and decisions; PTI-only alert filter |
| `services/data/mock/MockSupplierService.js:68-72` | Update mode narrowed to the supplier |
| `services/data/mock/stockSimulationReadModel.js:99` | `if (scope.personaType !== 'buyer') return [];` |
| `services/data/mock/targets/planningGroup.js:58`, `:86-101`, `:115`, `:134` | `readScopeOwner: () => null`; the move writes the material overlay; hook bound; `UNKNOWN_GROUP` |
| `targets/simulationOverride.js:26`, `:47`; `targets/capacityDecision.js:80`, `:89`; `targets/supplierAsk.js:133`, `:144`, `:147`, `:168`; `targets/feedstockConfirmation.js:91`; `targets/supplierOverlay.js:50` | Owner-less read; hooks bound; the `CODE: sentence` format; one live ask per subject |
| MCS `:3020`, `:3026`, `:3041`, `:3133`, `:3150`, `:3163`, `:3166`, `:3173`, `:3180`, `:3202-3205`, `:3223-3228` | Declare hooks, target and refusal texts |
| MCS `:3244`, `:3291-3292`, `:3299`, `:3305`, `:3313`, `:3334-3339`, `:3353-3362`, `:3370`, `:3411-3433`, `:3418-3419`, `:3431`, `:3439`, `:3461`, `:3468-3469`, `:6165`, `:6285` | Sync, access, capacity and alert targets, hooks and texts; `TARGETS`; `WIRED_COMMAND_TARGETS` |
| `services/transitions/inventoryRules.js:179`, `:189`, `:243`, `:363`, `:401-406`, `:414`, `:425`, `:440`, `:604-618`, `:615`, `:649`, `:719`, `:751`, `:914`, `:931`, `:959`, `:1116`, `:1147` | CR-01, CR-02, CR-24, CR-03, freshness, the three stock conditions, access mask, template, production, batch dates, CR-18, blank rows, validation, CR-19, channel |
| `services/transitions/inventoryConfig.js:28`, `:139` | `DEMAND_WINDOW = 30`; `CAPACITY_HORIZON_WEEKS = 13` |
| `services/transitions/hubSettings.js:257`, `:268`, `:278`, `:288`, `:298`, `:307`, `:646`, `:658`, `:668` | Defaults 1.5, 14, 30, 60, 100, 80, 24, 4, 1439 |
| `services/transitions/hubSettingsStore.js:322` | `staleOverrideFor(supplierId, materialCode)` |
| `services/transitions/updateCycle.js:88`, `:206`, `:289`; `services/transitions/updateCompliance.js:29-33` | Cycle, stale-at, reminder time; compliance window, grace, minimum |
| `services/transitions/capacityRules.js:38`, `:163`, `:195`, `:257`, `:322`, `:332` | Horizon, alert gap weeks, plan status, submission refusal, BE, LTP level |
| `services/transitions/capacityDecisionRules.js:33-39`, `:52` | Refusal sentences; `capacityAcceptRefusal` |
| `services/transitions/planningGroupRules.js:156-201`, `:228` | `planningGroupRefusal`; `needsReEntry` |
| `services/transitions/simulateSupplierStock.js:46`, `:58`, `:212`, `:694`, `:838-849` | Shipped ASN states; open legs; read refusals; `simulateSupplierStock`; `simulationOverrideRefusal` |
| `services/transitions/inventoryAlertRules.js:81`, `:103`, `:351`, `:580`, `:594`, `:625`, `:647`, `:663`, `:708` | Rules, PTI-only rules, derivation, standing closure, ledger, order, close refusal, Other fallback, grouping |
| `services/transitions/reasonCodes.js:108`, `:167` | `alertClose` list; note-required shortfall codes |
| `services/transitions/supplierAskRules.js:47-55`, `:122`, `:142` | Refusal sentences; raise and answer refusals |
| `services/transitions/feedstockRules.js:47`, `:59-69`, `:109` | Note length 500; refusal list; `feedstockEntryRefusal` |
| `services/transitions/supplierOverlayRules.js:42-48` | `supplierUpdateModeRefusal` |
| `services/data/mock/inventoryReadModel.js:78` | `isApiConnected` |
| `services/data/mock/stores/inventoryHubStores.js:48-52`; `stores/supplierAskStore.js:108-111` | `put(grant)`; `append(id, state, event)` |
| `services/query/commandHooks.js:1518`, `:1623`, `:1877`, `:1952`, `:1994`, `:2785`, `:3099` | The seven command hooks |
| `pages-v2/BuyerInventory.jsx:85`; `pages-v2/BuyerAlerts.jsx:132`; `pages-v2/BuyerStockSimulation.jsx:560`; `pages-v2/BuyerCapacity.jsx:320`, `:671`; `pages-v2/BuyerSupplierAccess.jsx:42` | Tiles; status tabs; Ask supplier on the simulation; gap actions and decision line; access atom |
| `pages-v2/inventory/MaterialDrawer.jsx:164-165`, `:198`, `:210`, `:249` | Ask topic; admin link; "Supplier cover"; supplier ROP display only |
| `pages-v2/inventory/alertNextStep.jsx:46`, `:260`, `:269`; `pages-v2/inventory/CapacityGapActions.jsx:106` | `ALERT_PLAN`; Ask supplier on alerts and gap weeks |
| `pages-v2/inventory/AskSupplierButton.jsx:81`; `pages-v2/inventory/PtiAsksBlock.jsx:40`; `pages-v2/inventory/inventoryDisplay.jsx:383` | Raise and answer gates; `refusalKey` |
| `pages-v2/inventory/StockEntryPanel.jsx:201-202`; `pages-v2/inventory/StockUploadPanel.jsx:176` | Declare manual, record; declare template |
| `pages-v2/SupplierHome.jsx:320`, `:330`, `:346`, `:606`, `:609`; `pages-v2/SupplierInventory.jsx:83`; `pages-v2/SupplierCapacity.jsx:168` | Stock lane rows; PTI asks; alerts; Stock page tabs; capacity atom |
| `pages-v2/admin/AdminSuppliers.jsx:77`; `pages-v2/admin/AdminPlanningGroups.jsx:105` | Update mode and planning group gates |
