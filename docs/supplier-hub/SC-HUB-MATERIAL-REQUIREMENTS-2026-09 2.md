# SC Hub Material requirements: stock sync and update discipline, trade names, ASN checks, stock simulation, planning groups, alerts, vendor status for bidding

| Field | Value |
|---|---|
| Status | **Decided, ready to build.** The owner accepted the MOM-review rulings (section 13.1) and every recommendation in section 13.2 (MAT-D1 to MAT-D15) on 2026-09-29. Rules tagged [Proposed] that name one of these decisions are built as written. MAT-D15 still needs the document lists from Procurement and Quality before MR-10 goes live |
| Date | 2026-09-29 |
| Source meeting | SC Hub – Material, 2026-09-23. The MOM was reviewed with the owner on 2026-09-29, and its items are cited as [MOM n.n] |
| Code read | `main` at `6b26e09` |
| Covers | MR-1 to MR-10 (section 3) |
| Builds on | REQ-E07-04 (ASN), REQ-E08-01 (inventory visibility), REQ-E08-02 (stock submission), REQ-E08-04 (capacity), REQ-E08-05 (alerts), REQ-E09-03 (call-off), CR-05, CR-18, CR-19, CR-23, CR-24, the RFx award (RFX-D6 to RFX-D15), BL-32 (admin settings and reason codes), BL-50 (hub calendar), ENG-D18 and ENG-D19 |

**Tags.** [Code] = built behaviour, cited `path:line`. [MOM n.n] = the 2026-09-23 meeting, as reviewed. [Owner, 2026-09-29] = a ruling the owner gave while reviewing the MOM. [Proposed] = nobody has confirmed it yet; the owner decides it in section 13. Code paths are under `src/` unless they start with `docs/`.

**New IDs.** Requirements are numbered MR-n, business rules MR-n BR-nn, acceptance criteria MR-n AC-nn, user stories US-MAT-nn and decisions MAT-Dn, so nothing collides with the main documents. The owner renumbers them on merge, as was done for the RFx round.

**No market research this round.** Every rule comes from the meeting, the owner's review or the code. Where a number is a starting value with nothing behind it, it is tagged [Proposed] and listed in section 13.

---

## 1. Summary

The meeting asked for 16 changes. Checked against the code, they fall into 3 groups:

1. **Already built, needs a small change (4).** Capacity is already kept per supplier × material group (REQ-E08-04 BR-06, `services/data/types.ts:637-650`). Alerts already have a risk class and are sorted by it (`services/transitions/inventoryAlertRules.ts:167`). The template already treats columns G to J as optional in the parser (`services/transitions/inventoryRules.ts:435-461`). Batches already exist on the supplier's stock record (`services/sdc/types.ts:470-478`).
2. **New on an existing model (8).** Update discipline, trade names, MRP controller, the ASN batch dropdown, the shelf-life rule, the call-off check, the alert close reason and the stock simulation. Each extends a record or a page that exists.
3. **New model (2).** Vendor qualification (Approved, Preferred) and direct vs indirect sourcing do not exist anywhere in the code. The supplier master has only Active, Onboarding, Suspended and Blacklisted (`types/supplier.types.ts:9`).

The 10 requirements:

| ID | Requirement | MOM items | Size | Needs backend |
|---|---|---|---|---|
| MR-1 | Stock sync schedule and the weekly Thursday update | 1.1, 3.1, 3.2 | M | The 2-hour schedule, yes; the rest no |
| MR-2 | Update compliance in supplier performance and at award | 3.3 | M | No |
| MR-3 | Supplier trade names and one material search | 1.2 | M | No |
| MR-4 | Stock template says which columns are optional | 1.3 | S | No |
| MR-5 | MRP controller (PIC) per material | 1.4 | S | The SAP feed, yes; the field no |
| MR-6 | ASN: batch from stock, shelf-life rule, call-off check | 2.1, 2.2, 2.3 | L | No |
| MR-7 | Supplier stock simulation | 4 | L | No |
| MR-8 | Planning groups for capacity | 5 | M | No |
| MR-9 | Alert order and close reasons | 6.1, 6.2, 6.3 | S | No |
| MR-10 | Vendor qualification and bidding eligibility | 7 | L | No |

Everything except the 2-hour schedule (MR-1 BR-01) and the SAP MRP controller feed (MR-5 BR-05) can be built on the mock stores, like the rest of the hub.

---

## 2. The material module today

Everything runs in the browser on mock stores (`main.tsx:9,23-31`); `httpDataService` exists only in comments as the Stage F swap.

| Area | As built |
|---|---|
| Stock entry | One page with 3 panels: manual entry (`pages-v2/inventory/StockEntryPanel.tsx`, verb `declare`, or `record` for PTI on the supplier's behalf), template upload (`StockUploadPanel.tsx`, `channel:'template'`), API sync (`SupplierSyncPanel.tsx`, verb `pull`, atom `stocksync:pull`) |
| Stock record | `InventoryDeclaration` (`services/sdc/types.ts:480-517`): `totalQty`, `uom`, `batches?`, `supplierRop?`, `inProductionQty?`, `productionCompletionDate?`, `channel`, `declaredAt`. Append-only; the latest row wins (`stores/inventoryDeclarationStore.ts:64`). `InventoryBatch` (`:470-478`): `batchNumber`, `qty`, `manufacturingDate?`, `expiryDate?` |
| Channels | `StockChannel = 'template' \| 'manual' \| 'api' \| 'pti'` (`services/sdc/types.ts:522`). Connected or not is `apiConnected`, derived from membership of `API_CONNECTIONS` (`services/data/mock/fixtures/inventoryHub.ts:167`, `inventoryReadModel.ts:58`) |
| Sync | Button only, simulated. No schedule, interval or ingest endpoint. REQ-E08-02 BR-03 already says a scheduled sync needs Stage F |
| Staleness | `stockFreshness()` returns `current`, `stale` or `missing` (`services/transitions/inventoryRules.ts:284-292`) against `updateSla`: hub setting `stale.defaultDays` = 7 (`hubSettings.ts:126`), overridable per supplier × material. A stale figure raises the `staleData` alert at Low |
| Template | CSV built in the browser, columns A to J (`inventoryRules.ts:435-461`); A to C required, D to J optional. The file and the panel never say which are optional. Validation `validateStockRows()` (`:617-747`) |
| Material master | `MaterialMasterEntry` (`services/sdc/types.ts:164-236`): `materialCode`, `label`, `materialType` (`ROH` or `VERP`), `materialGroup` (e.g. `MG-03`), `canonicalUom`, `bpomApplicable`, `halalApplicable`. 42 fixture entries. No trade name, MRP controller or shelf life |
| Material search | None shared. `BuyerInventory.tsx:78-87` filters with `includes()` on code, label and supplier; the stock entry form is a plain `<select>` |
| Incoming | `IncomingSource = 'production' \| 'asn' \| 'dispatch'` (`services/data/types.ts:520-534`). "Incoming" today means in production **plus** in transit (REQ-E08-01 BR-06). In transit = ASNs Submitted or In Transit, dated by `eta`, plus call-off dispatches (`inventoryRules.ts:223-245`) |
| Distributor legs | `IncomingShipment` (`services/sdc/types.ts:543`) with `direction` `principal-to-distributor` or `to-paragon`, `lifecycle` Booked, Shipped, Arrived, Cancelled, `etd`, `eta`. `SupplierMaterialRelationship` has `supplierType` manufacturer or distributor and `principals[].principalLeadTimeDays` (`:597-616`) |
| ASN | `ASN` and `AsnLineItem` (`services/data/types.ts:1418-1475`). Batch is `lotNumber`, free text (`pages-v2/SupplierShipments.tsx:257-262`). Expiry optional, checked only as a valid date (`services/transitions/fulfilmentRules.ts:29, 85-103`). No expected-receipt date other than `eta`. Only exception path: free-text `overShipReason` |
| Call-off | `CallOff` (`services/data/types.ts:411-512`). Tolerance CR-05: `callOff.overPct` 5 and `callOff.earlyAllowanceDays` (`hubSettings.ts:66-68`). The ASN hook checks the call-off is confirmed (`MockCommandService.ts:603-620`). It does not compare the ASN's quantity or date with the call-off |
| Capacity | Per supplier × material group, 13 weekly buckets (`CapacityPlan`, `services/data/types.ts:637-650`; `services/transitions/capacityRules.ts:43-84`). The group is the SAP-style `materialGroup` |
| Alerts | 8 rules (`InventoryAlertRule`, `services/data/types.ts:941`). Risk class High, Medium, Low by CR-24. Sorted High to Low, then supplier name (`inventoryAlertRules.ts:167`). Closed with a required **free-text** note (`pages-v2/BuyerAlerts.tsx:219-235`, hook `ALERT_ACTION_NOTE_AUTHORED`) |
| Reason codes | Admin lists `poAdjust`, `poReject`, `capacityShortfall`, `commitmentShortfall` (`services/transitions/reasonCodes.ts:38`) |
| Supplier status | `SupplierStatus` Active, Onboarding, Suspended, Blacklisted (`types/supplier.types.ts:9`), set by fixture only. "Preferred Supplier" and "Approved Supplier" appear only as free-text scorecard strings (`services/data/types.ts:1652`, `pages-v2/BuyerScorecard.tsx:449-452`) |
| Supplier documents | `SupplierDocument` (`services/data/types.ts:1173`) with category, status (Valid, Awaiting Upload, Under Review, Rejected) and `expiryDate`; flow `supplierDocument.flow.ts:79-158`. Expiring and Expired are read-time projections |
| RFx eligibility | Only Active suppliers can be invited (`services/transitions/rfxRules.ts:56-60`, `filterInvitees` `:107`), re-checked at publish (`RFX_PUBLISH_HAS_INVITEES`). CR-23 blocks scoring and award, not invitation. Direct vs indirect is not modelled |
| Performance | `assessmentScore` = mean of OTIF and CFOT minus 5 points per rejection, 0 to 100 (`services/data/performanceRules.ts:300`); grades A ≥ 90, B ≥ 80, C ≥ 70, D (`:83`). No weights. The award panel shows no performance figure (`pages-v2/rfx/AwardPanel.tsx:686-740`) |
| Roles | No QA role and no Material Planning system role. `planning` holds `calloff:plan`, `calloff:review`, `inventoryalert:close`; `receiving` holds inspection; `compliance` holds documents (`services/transitions/businessRoles.ts:57, 215, 298`) |

---

## 3. MR-1 Stock sync schedule and the weekly Thursday update

### a. Problem and reason
Planners check supplier stock on days when the figure is old. A 7-day stale period (`hubSettings.ts:126`) lets a Friday figure count as current until the next Friday, so a Tuesday check can read a 5-day-old number without warning. The meeting set 2 cadences by channel: system-connected suppliers every 2 hours, manual suppliers every Thursday, as an SOP they must follow [MOM 1.1, 3.2; Owner, 2026-09-29].

### b. Already built
- The Sync button for API-connected suppliers, by the supplier or PTI (REQ-E08-02 BR-03) [Code].
- `lastUpdatedAt`, `channel`, `lastSync` on the read model (`services/data/types.ts:549-592`) [Code].
- Stale period per supplier × material, admin-editable (BL-32) [Code].
- The hub working calendar (BL-50), which every working-day deadline reads [Code].

### c. User stories
- US-MAT-01. As a planner, I want each supplier's stock to be no older than its agreed cadence, so that a check on any weekday reads a figure I can act on.
- US-MAT-02. As a manual supplier, I want to see when my next update is due and which materials are still missing, so that I meet the Thursday deadline without guessing.

### d. Step-by-step flow

**System-connected supplier**
1. Every 2 hours the hub pulls the supplier's stock through its API (Stage F). Until then, the Sync button stays the only trigger, and the page says "Scheduled sync: not active in the prototype".
2. The stock page shows "Last sync" and "Next sync" per supplier.
3. A failed pull keeps the previous figures, records the error and time (as the button does today), and retries at the next slot.

**Manual supplier (template, manual entry, or PTI on its behalf)**
1. On the supplier home and stock page, a panel reads "Weekly stock update due Thursday 23:59 WIB" with a count of materials updated this cycle, e.g. "12 of 15 updated".
2. Wednesday 09:00 and Thursday 09:00: an in-hub reminder lists the materials not yet updated this cycle. Email waits on the email service (as BL-120).
3. The supplier uploads the template or types the figures. Each accepted material moves to "Updated this cycle".
4. After the cutoff, any material not updated this cycle turns stale, and the `staleData` alert is raised for it.

### e. Business rules
- MR-1 BR-01. A system-connected supplier is pulled every 2 hours, set by a hub setting `stockSync.intervalHours` (default 2, min 1, max 24). Needs Stage F [MOM 1.1; Owner, 2026-09-29].
- MR-1 BR-02. "System-connected" is a supplier-level setting, `stockUpdateMode: 'api' | 'manual'`, kept on the supplier master and changed by the Hub administrator. It replaces the fixture test `supplierId in API_CONNECTIONS` (`inventoryReadModel.ts:58`) as the source of `apiConnected`. Reason: the cadence, the SLA and the compliance measure all depend on it, so it must be visible and governed [Proposed].
- MR-1 BR-03. A manual supplier's update cycle runs from the previous cutoff (exclusive) to Thursday 23:59 WIB (inclusive). If Thursday is not a working day on the hub calendar, the cutoff is 23:59 on the last working day before it [Owner, 2026-09-29 (Thursday); time and holiday rule Proposed, MAT-D7].
- MR-1 BR-04. A material counts as updated for a cycle when a stock record for it is accepted inside the cycle, from any channel: `manual`, `template`, `api` or `pti` (recorded by PTI for the supplier). A `pti` record counts because the supplier did send the figure; it stays labelled "Entered by PTI" [Proposed, MAT-D7].
- MR-1 BR-05. Staleness by mode, replacing the single 7-day default:
  - Manual: stale when the material was not updated in the last completed cycle.
  - API: stale when the last successful pull is older than `stale.apiHours` (default 24) [Proposed, MAT-D8].
  - A per-supplier × material override (BL-32) still wins over both [Code, extended].
- MR-1 BR-06. The weekly update is part of the supplier SOP. Material Planning writes the SOP with the validation rules suppliers must follow when entering data [MOM 3.1, 3.2]. The hub shows a link to the current SOP document on the stock page. The SOP document itself is not a hub deliverable.
- MR-1 BR-07. The weekly update is scheduled with the weekly supplier confirmation, so the supplier does both in one visit. The panel in step 1 shows both deadlines side by side [MOM 3.2; which confirmation, open item].

### f. Lifecycle and data changes
- `Supplier.stockUpdateMode: 'api' | 'manual'`, with a governed verb `t_supplier_set_update_mode` held by the Hub administrator.
- New hub settings: `stockSync.intervalHours` (2), `stale.apiHours` (24), `stockUpdate.cutoffDay` (Thursday), `stockUpdate.cutoffTime` (23:59), time zone WIB.
- New pure function `updateCycleFor(date, calendar)` returning `{start, cutoff}`, and `cycleStatus(supplierId, cycle)` returning per material `updated | missing`. Computed at read time; nothing new is stored beyond the stock records.
- `stockFreshness()` reads the mode.

### g. Edge cases
1. A supplier changes from manual to API mid-week: the current cycle is judged by the manual rule; the API rule starts the next cycle.
2. A material is assigned to the supplier mid-cycle: it is excluded from that cycle and counted from the next.
3. An API supplier whose pulls all fail for a week: it is stale after 24 hours, and the week is non-compliant under MR-2 (a failed pull is not an update).
4. A supplier uploads on Thursday 23:59:30: the upload's accepted time decides; after the cutoff it counts in the next cycle.
5. Thursday is a public holiday: the cutoff moves to Wednesday 23:59, and the reminders move one working day earlier.

### h. Acceptance criteria
- MR-1 AC-01. A manual supplier sees its next cutoff and the materials still missing this cycle.
- MR-1 AC-02. A material not updated by the cutoff is shown stale the moment the cutoff passes, and raises `staleData`.
- MR-1 AC-03. An API supplier with no successful pull in 24 hours is shown stale.
- MR-1 AC-04. A record entered by PTI counts as updated and still reads "Entered by PTI".
- MR-1 AC-05. With Thursday marked non-working on the hub calendar, the cutoff falls on Wednesday.
- MR-1 AC-06. Only the Hub administrator can change a supplier's update mode, and the change is logged with who and when.

### i. Dependencies and out of scope
- The 2-hour pull needs Stage F and an API contract per supplier (REQ-E08-02 data section, RSK-02).
- Email reminders wait on the email service.
- Out of scope: the SOP document itself (Material Planning).

---

## 4. MR-2 Update compliance in supplier performance and at award

### a. Problem and reason
A weekly update that carries no consequence is not followed. The owner ruled that a supplier who does not update often enough loses performance score, which can keep it from being awarded [MOM 3.3; Owner, 2026-09-29].

### b. Already built
- `assessmentScore` and the A to D grades (`services/data/performanceRules.ts:83, 300`) [Code].
- Rolling-week windows in the reliability engine, `trailingWindow(asOf, weeks)` with 13 and 26 weeks (`services/engine/reliability.ts`) [Code].
- The award panel with a reason field, required when the award departs from the best-scored quote (`AwardPanel.tsx:429-430`; `AWARD_REASON_REQUIRED`) [Code].

### c. User stories
- US-MAT-03. As Procurement, I want to see how reliably each supplier updates its stock, so that update discipline counts when I choose who to award.
- US-MAT-04. As a supplier, I want to see my own update compliance and which weeks I missed, so that I know what hurts my score.

### d. Step-by-step flow
1. Every cutoff (MR-1 BR-03), the hub judges the supplier's week as compliant or not (BR-02).
2. The supplier performance page and the buyer scorecard show "Update compliance" as a percentage over the last 13 weeks, with a week-by-week strip (green, red, grey for not counted).
3. The compliance feeds the performance score (BR-05).
4. On the RFQ and RFP award panel, each bid row shows the supplier's compliance as a pill: plain at 80% or more, amber below 80%, red below 60%.
5. The buyer awards a share to a supplier with a red pill: the panel asks for a reason before the award can be sent, even when that supplier is best-scored.

### e. Business rules
- MR-2 BR-01. Update compliance % = weeks compliant ÷ weeks counted, over a rolling 13 weeks ending with the last completed cycle [Owner, 2026-09-29].
- MR-2 BR-02. A week is compliant:
  - Manual supplier: every material assigned to it for the whole cycle was updated in that cycle (MR-1 BR-04). One missing material makes the week non-compliant. Reason: a partial update leaves exactly the gap the planner cannot see [Proposed, MAT-D7].
  - API supplier: at least one successful pull on every working day of the cycle [Owner, 2026-09-29 (daily sync); working days Proposed].
- MR-2 BR-03. Grace: the first 4 weeks after the supplier's first material assignment are not counted. With fewer than 4 weeks counted, compliance reads "No history" and raises no flag [Owner, 2026-09-29].
- MR-2 BR-04. Thresholds: below 80% is a warning (amber), below 60% is a flag (red). Both are hub settings `compliance.warnPct` (80) and `compliance.flagPct` (60) [Owner, 2026-09-29].
- MR-2 BR-05. Performance score = (1 − w) × current `assessmentScore` + w × update compliance %, with w = hub setting `compliance.scoreWeight`, default 0.10, fixed at release. With "No history", w is 0 for that supplier. Procurement confirms the weight [Owner, 2026-09-29 (10–15%); formula Proposed, MAT-D9].
- MR-2 BR-06. An award giving any share to a supplier flagged red needs a reason, on RFQ and RFP, per item. The award record keeps the compliance % shown at the time [Owner, 2026-09-29].
- MR-2 BR-07. A flag never blocks invitation, scoring or award by itself. Only CR-23 blocks. Reason: the owner chose warn-and-justify first [Owner, 2026-09-29].

### f. Lifecycle and data changes
- New pure function `updateCompliance(supplierId, asOf, weeks = 13)` → `{pct | null, weeks: {cycle, state: 'compliant' | 'missed' | 'notCounted'}[]}`, computed at read time from stock records and sync attempts.
- `assessmentScore` gains the compliance input and weight; `GRADE_BANDS` unchanged.
- `RfqAwardRecord` and `RfpAwardRecord` gain `complianceAtAward: {supplierId, pct | null}[]`.
- The award policy adds `AWARD_REASON_COMPLIANCE_FLAG` beside `AWARD_REASON_REQUIRED`.
- The free-text scorecard `status` string is left alone here; MR-10 replaces it.

### g. Edge cases
1. A supplier with no materials assigned: "No history", no flag.
2. A supplier switches mode mid-window: each week is judged by the mode it had at that week's cutoff.
3. A material assigned for only part of a cycle: excluded from that cycle (MR-1 edge case 2).
4. The score weight is set to 0: the score equals today's `assessmentScore`, and grades do not move.
5. Adding the weight moves grades. Before release, list every supplier whose grade changes, for Procurement to see.

### h. Acceptance criteria
- MR-2 AC-01. A manual supplier that misses 1 material in a cycle shows that week red.
- MR-2 AC-02. A supplier onboarded 3 weeks ago shows "No history" and no pill colour.
- MR-2 AC-03. With weight 0.10, OTIF/CFOT score 90 and compliance 50%, the performance score is 86.
- MR-2 AC-04. Awarding any share to a supplier at 59% without a reason is refused by the verb, not only by the form.
- MR-2 AC-05. The award record shows the compliance % each awarded supplier had at the time of award.

### i. Success metrics

| Metric | Formula | Baseline | Target [Proposed] |
|---|---|---|---|
| On-time weekly update | Supplier-weeks compliant ÷ supplier-weeks counted | No baseline; capture from the first 4 cycles | 90% within 3 months |
| Stale checks | Planner checks that read a stale figure ÷ checks | No baseline | Down 75% within 3 months |

---

## 5. MR-3 Supplier trade names and one material search

### a. Problem and reason
Suppliers name materials by their trade name, while the hub shows only PTI's code and description. A supplier cannot find its own product, and a planner cannot match a supplier's document or message to a PTI material [MOM 1.2; Owner, 2026-09-29].

### b. Already built
- `MaterialMasterEntry.label` (PTI description) and the material lookups in `services/sdc/materialMaster.ts` [Code].
- `MaterialMasterRefRow` maps PTI and SOMO codes (`services/sdc/materialMasterRef.types.ts`). It is not a list of supplier names [Code].

### c. User stories
- US-MAT-05. As a supplier, I want to record my trade name for each PTI material I supply, so that I recognise my products everywhere in the hub.
- US-MAT-06. As a planner, I want to search materials by any supplier's trade name, so that I find the PTI material a supplier is talking about.

### d. Step-by-step flow

**Supplier**
1. Opens "My materials" (a new tab on the stock page), which lists the PTI materials assigned to it.
2. For each material, enters a trade name and, optionally, its own material number.
3. Submits. The name reads "Awaiting approval".

**Planner (Material Planning)**
1. Opens Materials → Trade names, filtered to "Awaiting approval".
2. Approves or rejects each name. A rejection needs a reason, which the supplier sees.
3. An approved name appears beside the PTI description wherever that supplier's material is shown.

**Anyone searching**
1. Types in the material search on the inventory list, stock entry, ASN line, call-off, alerts or simulation page.
2. The results match on PTI code, PTI description and approved trade names, and show which one matched, e.g. "ROH-EMUL-3320 · Emulsifier base — matched trade name 'Emulsense 200' (PT Example)".

### e. Business rules
- MR-3 BR-01. One PTI material can have many trade names, at most 1 approved per supplier [Owner, 2026-09-29].
- MR-3 BR-02. The supplier enters the trade name; Material Planning approves it [Owner, 2026-09-29]. A changed name goes through approval again, and the previous approved name stays in use until then.
- MR-3 BR-03. A supplier sees only its own trade names, never another supplier's. PTI sees all. Reason: the same confidentiality as RFx files (NR-1 BR-06) [Proposed].
- MR-3 BR-04. One shared search component replaces the ad-hoc filters. It matches case-insensitively and ignores accents, punctuation and extra spaces. It matches every word typed, in any order. For words of 5 or more characters, it allows 1 typo. It ranks exact code first, then full-word matches, then typo matches [Proposed].
- MR-3 BR-05. A trade name is 2 to 80 characters. The optional supplier material number is up to 40 characters [Proposed].
- MR-3 BR-06. Approved trade names can also be loaded by PTI in bulk, from a CSV with PTI code, supplier ID, trade name and supplier material number. They are approved on load, and the record shows "Loaded by PTI" [Proposed].

### f. Lifecycle and data changes
- New `SupplierMaterialName {id, supplierId, materialCode, tradeName, supplierMaterialNo?, state: 'Awaiting approval' | 'Approved' | 'Rejected' | 'Replaced', submittedBy, submittedAt, decidedBy?, decidedAt?, rejectionReason?}`.
- Verbs `t_materialname_submit` (supplier; atom `materialname:submit`), `t_materialname_approve`, `t_materialname_reject` (atom `materialname:review` in `planning`), `t_materialname_load` (bulk, same atom).
- New shared component `MaterialSearch` and pure function `matchMaterial(query, entry, names)`.

### g. Edge cases
1. Two suppliers use the same trade name for different PTI materials: allowed. The search shows both, each with its supplier.
2. A supplier is unassigned from a material: its trade name stays on the record but is hidden from search.
3. The supplier submits a name identical to the PTI description: accepted. The planner may reject it as redundant.

### h. Acceptance criteria
- MR-3 AC-01. A supplier can submit a trade name only for a material assigned to it.
- MR-3 AC-02. An approved name is found by the search on every page in step 1 of the search flow; an unapproved name is not.
- MR-3 AC-03. Supplier A never sees supplier B's trade name on any screen or read.
- MR-3 AC-04. "emulsens 200" finds "Emulsense 200" (1 typo in a 9-character word).
- MR-3 AC-05. A rejection without a reason is refused.

---

## 6. MR-4 Stock template says which columns are optional

### a. Problem and reason
Suppliers leave the batch columns blank, or fill them in and wonder whether they must, because nothing in the file says which columns are optional [MOM 1.3; Owner, 2026-09-29].

### b. Already built
- `STOCK_TEMPLATE_FIELDS` with a `required` flag per column; A to C required, D to J optional (`inventoryRules.ts:435-461`) [Code].
- Headers matched in English or Indonesian; the date format is written into the header [Code].

### c. Business rules
- MR-4 BR-01. Every optional column header ends with " (optional)" in English and " (opsional)" in Indonesian, e.g. "Batch number (optional)" [Owner, 2026-09-29].
- MR-4 BR-02. The header parser ignores the suffix, so files downloaded before the change still upload [Proposed].
- MR-4 BR-03. The upload panel shows a table of the columns with Required or Optional and a one-line meaning, including: "Batch columns (G to J): fill them only when your batches expire at different times; if you fill one, fill all 4 for that row" [Proposed; the reason is REQ-E08-02 BR-06].
- MR-4 BR-04. Which of D to F stay optional is decided in MAT-D4. The MOM names only G to J, while the code also treats D (supplier ROP), E (in-production quantity) and F (production completion date) as optional. MR-7 needs E and F to simulate [Proposed, MAT-D4].

### d. Acceptance criteria
- MR-4 AC-01. A freshly downloaded template marks every optional column in its header.
- MR-4 AC-02. A template downloaded before the change uploads without error.
- MR-4 AC-03. The upload panel lists every column as Required or Optional.

---

## 7. MR-5 MRP controller (PIC) per material

### a. Problem and reason
A supplier or buyer who sees a problem on a material does not know which planner handles it. SAP already holds that person as the MRP controller [MOM 1.4].

### b. Business rules
- MR-5 BR-01. Each material carries its MRP controller: a code and a name, e.g. "P12 · Rina (Packaging)". SAP holds this per plant (MARC-DISPO); the hub keeps one value per material until plants are modelled [Proposed].
- MR-5 BR-02. A Hub administrator maps each MRP controller code to one or more hub users. An unmapped code shows the code only [Proposed].
- MR-5 BR-03. The MRP controller appears on: inventory list and detail, alerts, call-offs, the ASN line, and the stock simulation. It can be filtered on each list, including a "My materials" filter for a planner mapped to a code [MOM 1.4; screens Proposed].
- MR-5 BR-04. Suppliers see the name and not the code, so they know who to contact [Proposed].
- MR-5 BR-05. The value comes from the SAP material feed (`FORECAST-ENGINE-FEED-SPEC.md`, owned by MDM, BL-103). Until the feed runs, it is fixture data labelled simulated [Proposed].

### c. Lifecycle and data changes
- `MaterialMasterEntry.mrpController?: string` (code); new admin table `MrpController {code, name, userIds[]}`, changed by a governed verb.

### d. Acceptance criteria
- MR-5 AC-01. Every material with an MRP controller shows it on the 5 surfaces in BR-03.
- MR-5 AC-02. A planner mapped to "P12" sees only P12's materials under "My materials".
- MR-5 AC-03. A supplier sees the controller's name, never the code.

---

## 8. MR-6 ASN: batch from stock, shelf-life rule, call-off check

### a. Problem and reason
3 errors reach the warehouse today:
- A batch typed on the ASN that the supplier never declared as stock.
- Goods with too little shelf life left.
- An ASN whose quantity or date does not match the call-off it serves.

The ASN checks only that a batch is typed and that an expiry is a valid date (`fulfilmentRules.ts:29, 85-118`). The meeting asked for a dropdown, a 6-month rule, and a poka-yoke against the call-off [MOM 2.1 to 2.3; Owner, 2026-09-29].

### b. Already built
- The 3-step ASN wizard (`pages-v2/SupplierShipments.tsx`), `AsnLineItem.lotNumber` and `expiryDate?` [Code].
- Batch required at submit (`ASN_SUBMIT_COMPLETE`) and quantity within open, unless an over-ship reason is given (`ASN_LINES_WITHIN_OPEN`) [Code].
- The call-off picker listing confirmed call-offs on the PO (`SupplierShipments.tsx:1188-1207`) [Code].
- Batch-level stock on the stock record (`InventoryBatch`) [Code].
- CR-05 tolerance settings (`callOff.overPct`, `callOff.earlyAllowanceDays`) [Code].

### c. User stories
- US-MAT-07. As a supplier, I want to pick the batch from my declared stock, so that the ASN carries the right batch and expiry without retyping.
- US-MAT-08. As QA, I want an ASN with less than 6 months of shelf life left at arrival stopped before it ships, unless someone approves it, so that short-dated goods do not reach the warehouse by surprise.
- US-MAT-09. As a planner, I want to see when an ASN does not match its call-off, so that I can act before the goods arrive.

### d. Step-by-step flow

**Supplier, creating an ASN**
1. Step 1: selects the PO and, for a call-off delivery, the call-off (unchanged).
2. Step 2, per line: the Batch field is a dropdown of the supplier's declared batches of that material, each showing batch number, available quantity and expiry. Picking one fills the expiry.
3. If the supplier declared no batches for the material, the field is free text with the note "This batch is not in your declared stock", and expiry is typed.
4. The line shows remaining shelf life at arrival: "Expiry 2027-01-15 · 7.4 months left at ETA".
5. Step 3 (confirm) shows any warnings: call-off mismatches (BR-10) and batch quantity above the declared batch (BR-03). The supplier can go back or continue.
6. Submits. If a line has less than 6 months left at ETA, submit is refused. The supplier can instead press "Request shelf-life exception" with a reason, which moves the ASN to "Awaiting exception".

**Approver (shelf-life exception)**
1. Sees the ASN in "ASN exceptions", with material, batch, expiry, ETA, months left and the reason.
2. Approves: the ASN moves to Submitted, and its quantity counts as in transit. Or rejects with a reason: the ASN goes back to Draft, and the supplier sees the reason.

**Planner**
1. The ASN list and the call-off page show a "Mismatch" marker on any ASN with a call-off warning, with the detail (e.g. "Quantity 1,200 vs 1,000 called off (+20%)"; "ETA 3 days after the agreed date").

### e. Business rules

**Batch**
- MR-6 BR-01. The batch field lists the batches in the supplier's latest stock record for that material with an available quantity above 0 [MOM 2.2; Owner, 2026-09-29].
- MR-6 BR-02. A batch's available quantity = its declared quantity minus the quantity on the supplier's ASNs for that batch that are Submitted, In Transit, Delivered or Awaiting exception, with a ship date on or after the stock record's `declaredAt` [Proposed].
- MR-6 BR-03. A line quantity above the batch's available quantity is a warning, not a block. Reason: the stock record can be up to a cycle old [Proposed].
- MR-6 BR-04. When the supplier declared no batches for the material, the batch is typed and marked "not in declared stock". The planner sees the marker. Reason: batch columns are optional in the template (MR-4), so a hard dropdown would block suppliers that follow the template correctly [Proposed, MAT-D5].

**Shelf life**
- MR-6 BR-05. Remaining shelf life is measured from the ASN's `eta`, the only arrival date the ASN holds. The rule: expiry ≥ ETA + the material's minimum remaining shelf life. The default is 6 calendar months [Owner, 2026-09-29 (≥ 6 months from receipt); `eta` as receipt date Proposed].
- MR-6 BR-06. The minimum is a per-material value `minRemainingShelfLifeMonths` on the material master. It is taken from SAP's minimum remaining shelf life where maintained, and falls back to the hub setting `shelfLife.defaultMonths` (6) [Owner, 2026-09-29].
- MR-6 BR-07. Expiry becomes required on an ASN line for every material with `shelfLifeRelevant = true`. It is set per material from its master-data shelf life, for raw material and packaging alike, never by material type. Reason: BPOM CPKB treats both as starting materials with an expiry limit [Proposed, MAT-D6].
- MR-6 BR-08. A line that fails BR-05 blocks submit. The only way forward is an exception request with a reason, approved by the holder of `asn:approveShelfLife`. That atom sits in `compliance` only (Quality), not `planning`, so a planner cannot approve their own urgent receipt. The approved goods are received into blocked stock, as SAP does on a failed shelf-life check [Owner, 2026-09-29 (block plus exception); approver Proposed, MAT-D6].
- MR-6 BR-09. An approved exception is recorded on the ASN with approver, time and reason, and shows on the goods receipt.

**Call-off check (poka-yoke)**
- MR-6 BR-10. For an ASN linked to a call-off, the hub compares the call-off with the ASN plus the call-off's earlier non-cancelled ASNs, and warns when any of these holds [Owner, 2026-09-29 (warn)]:
  1. The total shipped quantity is above the agreed quantity by more than `callOff.overPct`, or below it once the ASN is marked final. Checked per material.
  2. The ETA is earlier than the agreed date minus `callOff.earlyAllowanceDays`, or later than the agreed date.
  3. The ASN's material is not the call-off's material.
- MR-6 BR-11. When the PO line has an open confirmed call-off and the ASN names none, the hub warns "This PO line has an open call-off; link it?" [Proposed].
- MR-6 BR-12. Warnings never block. They are stored on the ASN and shown to the planner (step "Planner" above) [Owner, 2026-09-29].
- MR-6 BR-13. New alert rule `callOffNotCovered`, PTI-only: raised when a confirmed call-off due within the supplier's lead time is larger than the supplier's declared SOH plus in production due before the need date. Risk class by CR-24. Reason: this is the poka-yoke on the stock side, before an ASN exists [Proposed; MOM 2.1 as clarified by the owner].

### f. Lifecycle and data changes
- `AsnStatus` gains `Awaiting exception` (Draft → Awaiting exception → Submitted, or → Draft on reject). New verbs `t_asn_request_exception` (supplier, `asn:submit`), `t_asn_approve_exception` and `t_asn_reject_exception` (`asn:approveShelfLife`, reason required on reject).
- `ASN` gains `shelfLifeException?: {reason, requestedBy, requestedAt, decidedBy?, decidedAt?, decision?, decisionReason?}` and `callOffWarnings?: {kind: 'qtyOver' | 'qtyUnder' | 'early' | 'late' | 'material' | 'unlinked', detail}[]`.
- `AsnLineItem` gains `batchSource: 'declared' | 'typed'`.
- `MaterialMasterEntry` gains `minRemainingShelfLifeMonths?` and `shelfLifeRelevant`.
- New hub setting `shelfLife.defaultMonths` (6).
- `asnLineRefusal` gains `'shelfLife'` and `'expiryRequired'`.
- New policy hook `ASN_SHELF_LIFE`.
- `InventoryAlertRule` gains `callOffNotCovered`.

### g. Edge cases
1. The supplier changes the ETA after an exception was approved: the rule is re-checked. If the new ETA still fails, the exception stands only when the new ETA is not later than the approved one. Otherwise, a new request is needed.
2. One ASN line carries 2 batches: each batch is its own line (as today). Each is checked separately.
3. Expiry is the same day as ETA + 6 months: passes (the rule is ≥).
4. A batch's available quantity is 0 because another ASN took it: it drops out of the dropdown. The supplier can still type it under BR-04, marked "not in declared stock".
5. A call-off confirmed with changes (`agreedDeliveries`): BR-10 compares against the agreed deliveries, not the original quantity.
6. The call-off is changed after the ASN: warnings are recomputed on read, and the ASN shows the current comparison.

### h. Acceptance criteria
- MR-6 AC-01. A supplier with declared batches sees only those with available quantity in the dropdown, and picking one fills the expiry.
- MR-6 AC-02. A supplier without declared batches can type a batch, and the ASN shows "not in declared stock" to the planner.
- MR-6 AC-03. An ROH line with expiry 5 months after ETA is refused at submit by the verb, not only by the form.
- MR-6 AC-04. The same ASN with an approved exception moves to Submitted and counts as in transit; while Awaiting exception, it does not count.
- MR-6 AC-05. An ASN 10% over the call-off with a 5% tolerance can be submitted, and shows "Mismatch" to the planner with the figures.
- MR-6 AC-06. An ASN with no call-off on a PO line with an open confirmed call-off shows the link warning.
- MR-6 AC-07. `callOffNotCovered` fires in test data where a call-off of 1,000 is due inside the lead time and SOH + in production is 600.

### i. Success metrics

| Metric | Formula | Baseline | Target [Proposed] |
|---|---|---|---|
| Short-dated receipts | Receipts with less than the minimum shelf life and no approved exception ÷ receipts | No baseline; count from goods receipts | 0 |
| ASN matches call-off | ASNs with no call-off warning ÷ ASNs linked to a call-off | No baseline; first 4 weeks | 95% |

---

## 9. MR-7 Supplier stock simulation

### a. Problem and reason
Suppliers update weekly, on Thursday, but the planner decides on new POs or call-offs on other days, e.g. Tuesday. On Tuesday the planner needs an estimate of the supplier's stock, built from the last update plus what has happened since. The owner ruled that the simulation shows 2 numbers, not 1 [MOM 4; Owner, 2026-09-29].

### b. Already built
- Last stock record with `inProductionQty` and `productionCompletionDate` (`InventoryDeclaration`) [Code].
- ASNs with ship date and ETA [Code].
- `IncomingShipment` with direction `principal-to-distributor` and `eta` [Code].
- `principalLeadTimeDays` per distributor × principal (`services/sdc/types.ts:602`) [Code].
- Capacity per supplier × material group per week (`CapacityPlan`) [Code].
- In transit to PTI (`inTransitItems()`, `inventoryRules.ts:223`) [Code].

### c. Terms

| Term | Meaning | Source |
|---|---|---|
| SOH supplier | Stock on hand at the supplier at its last update | Latest stock record |
| In production | Quantity the manufacturer is making, with its completion date | Stock record fields E and F |
| To distributor | Stock moving from manufacturer to distributor. The MOM calls this "Incoming"; it is renamed here because "incoming" already means in production plus in transit in the hub (REQ-E08-01 BR-06) | `IncomingShipment`, direction `principal-to-distributor` |
| In transit | Stock moving to PTI, from the manufacturer or the distributor. The receiver is always PTI | Submitted and In Transit ASNs, call-off dispatches |

### d. User stories
- US-MAT-10. As a planner, I want an estimate of each supplier's stock on the day I plan, so that I can decide whether to raise a new PO or call-off without waiting for Thursday.
- US-MAT-11. As a planner, I want to fill in a figure the supplier has not given, so that the estimate still runs when data is missing.

### e. Step-by-step flow
1. The planner opens Inventory → Stock simulation, a new page. The stock visibility page (REQ-E08-01) does not change [Proposed, MAT-D2].
2. Picks the check date (default today) and filters: supplier, material, planning group (MR-8), MRP controller (MR-5).
3. The table shows one row per supplier × material, with 2 figures at the check date:
   - **Supplier available stock**
   - **PTI inbound**
   
   It also shows each component, the last update date, and a "Basis" column: "Supplier data" or "Includes planner input".
4. Expanding a row shows weekly buckets for the next 13 weeks, with the 2 figures at the end of each week and the events inside it (production finishing, to-distributor arrivals, ASNs).
5. Where an input is missing, the cell reads "Missing". The planner can enter a value for this simulation: SOH, in-production quantity and completion date, or to-distributor quantity and ETA. The value is marked "Planner input" with who and when.
6. From a row, the planner opens "Create call-off" or "Create PO request", pre-filled with the material and supplier (existing flows).

### f. Calculation
- MR-7 BR-01. For supplier s, material m, check date d, where t0 is the `declaredAt` of the latest stock record [Owner, 2026-09-29]:
  - **Supplier available stock**(d) =
    - SOH(t0)
    - − the shipped quantity of s's ASNs for m with ship date after t0 and on or before d (status Submitted, In Transit, Delivered or Awaiting exception)
    - \+ the to-distributor quantity for m with ETA after t0 and on or before d (lifecycle Booked or Shipped)
    - \+ the in-production quantity for m with completion date after t0 and on or before d, capped by capacity (BR-04)
  - **PTI inbound**(d) = the in-transit quantity for m from s (ASNs Submitted or In Transit, and dispatched call-offs) with ETA on or after d.
- MR-7 BR-02. The 2 figures are never added together on screen. Reason: in transit has already left the supplier. Adding it to the supplier's stock would count it twice against the open call-offs it serves [Owner, 2026-09-29].
- MR-7 BR-03. An ASN shipped after t0 is subtracted even if the supplier's next update might already reflect it. Once a newer stock record exists, it becomes t0, and only ASNs after it count [Proposed].
- MR-7 BR-04. **Capacity cap.** For supplier s, planning group g (MR-8) and week w, the in-production quantity finishing in w across all materials of g is capped at s's allocated capacity for g in w. If the total is above it, each material's quantity is scaled down pro rata and the row shows "Capped by capacity". Allocated capacity is used, not upside, because upside is only "if requested" (REQ-E08-04 BR-05) [Owner, 2026-09-29 (cap by group); allocated only Proposed, MAT-D11].
- MR-7 BR-05. **ETA to distributor.** Use the shipment's `eta`. If it is missing, use `etd + principalLeadTimeDays` for that distributor × principal. If that is missing too, the planner enters it (step 5). The Hub administrator maintains `principalLeadTimeDays` as master data [Owner, 2026-09-29].
- MR-7 BR-06. A supplier with no stock record at all is shown "Cannot simulate: no stock update", with planner input allowed for SOH [Proposed].
- MR-7 BR-07. Show "Already called off, not shipped" (confirmed call-offs not yet covered by an ASN) and **Free to call off** = Supplier available stock − that quantity, beside Supplier available stock. Reason: every availability formula found in the market subtracts committed demand (section 13.2) [Proposed, MAT-D10].
- MR-7 BR-08. Planner input is kept on the simulation only, with who and when. It never changes the supplier's stock record and never counts for MR-2 [Owner, 2026-09-29 (input); scope Proposed].
- MR-7 BR-09. A distributor is simulated on its own stock plus to-distributor. A manufacturer has no to-distributor term [Proposed].

### g. Worked example
Supplier updated Thursday 2026-10-01 (t0). Check date Tuesday 2026-10-06.

| Component | Quantity |
|---|---|
| SOH at t0 | 5,000 |
| ASN shipped 2026-10-03 | − 1,200 |
| To distributor, ETA 2026-10-05 | + 2,000 |
| In production, completes 2026-10-05, 3,000, capped at 2,500 by the group's allocated capacity | + 2,500 |
| In production, completes 2026-10-09 (after d) | not counted |
| **Supplier available stock** | **8,300** |
| PTI inbound: ASN in transit, ETA 2026-10-07 | 1,200 |
| Already called off, not shipped | 3,000 |
| **Free to call off** (8,300 − 3,000) | **5,300** |

### h. Lifecycle and data changes
- New pure function `simulateSupplierStock({supplierId, materialCode, checkDate, overrides})` → `{available, ptiInbound, calledOffNotShipped, components[], cappedByCapacity, basis}`, plus a weekly series. Read-only; no new verbs apart from overrides.
- New `SimulationOverride {id, supplierId, materialCode, field, value, date?, enteredBy, enteredAt}`, valid until the next stock record from the supplier, then discarded.
- New page `pages-v2/BuyerStockSimulation.tsx`, route `/buyer/stock-simulation`, menu Inventory. Atom `inventory:simulate` in `planning`.

### i. Edge cases
1. The ASN's ship date is missing (legacy): use the ASN's submitted date.
2. An in-production completion date in the past but after t0: counted as finished.
3. An in-production completion date before t0: ignored. The supplier should have moved it into SOH; the row shows "Production date before last update".
4. A to-distributor shipment is Cancelled: not counted.
5. Capacity not confirmed for the week: no cap. The row shows "No capacity confirmed for week w".
6. The check date is before t0: the page refuses the date; a simulation looks forward only.

### j. Acceptance criteria
- MR-7 AC-01. The worked example in 9g reproduces exactly in a test.
- MR-7 AC-02. Supplier available stock and PTI inbound are shown separately and never summed.
- MR-7 AC-03. A planner input is shown as "Planner input" with who and when, and disappears after the supplier's next stock record.
- MR-7 AC-04. In-production quantities above allocated capacity are scaled pro rata, and the row says so.
- MR-7 AC-05. A missing ETA falls back to ETD + principal lead time, and the basis says so.
- MR-7 AC-06. The stock visibility page shows no "available" figure (REQ-E08-01 BR-01 still holds).

---

## 10. MR-8 Planning groups for capacity

### a. Problem and reason
Capacity is kept per supplier × SAP material group, e.g. `MG-03` (REQ-E08-04 BR-06, `capacityRules.ts:43-84`). An SAP group can mix materials that run on different lines at the supplier, so one capacity figure per SAP group is too coarse. The meeting asked for more specific groups, from SAP groups and refined by Material Planning, with MDM [MOM 5; Owner, 2026-09-29].

### b. Business rules
- MR-8 BR-01. A **planning group** is a set of materials that share capacity at a supplier. Each belongs to exactly 1 SAP material group. Each material belongs to exactly 1 planning group [MOM 5.1, 5.2].
- MR-8 BR-02. Until Material Planning splits an SAP group, it has 1 default planning group with the same name and materials. So the hub works on day 1 with today's figures [Proposed].
- MR-8 BR-03. Material Planning maintains planning groups: create, rename, move materials, retire. Each change is governed and logged. A group with materials cannot be deleted, only retired once empty [MOM 5.2; governance Proposed].
- MR-8 BR-04. Capacity (REQ-E08-04) is entered and shown per supplier × planning group. The demand per group is the sum of its materials' demand [Proposed].
- MR-8 BR-05. When materials move between groups, capacity entered for future weeks on the affected groups is marked "Needs re-entry" for those weeks. The supplier is asked to confirm again. Past weeks keep the group they had [Proposed].
- MR-8 BR-06. Planning groups are hub master data for now. Whether they move into SAP as a material characteristic is agreed with MDM [MOM 5.3; MAT-D12].
- MR-8 BR-07. Planning group is a filter on capacity, the stock simulation and alerts [Proposed].

### c. Lifecycle and data changes
- New `PlanningGroup {id, name, sapMaterialGroup, state: 'active' | 'retired', createdBy, createdAt}`, and `MaterialMasterEntry.planningGroupId`.
- Verbs `t_planninggroup_create`, `_rename`, `_move_materials`, `_retire`, with atom `planninggroup:manage` in `planning`.
- `CapacitySubmission.materialGroup` and `CapacityPlan.materialGroup` become `planningGroupId`. Existing submissions migrate to the default planning group of their SAP group.

### d. Acceptance criteria
- MR-8 AC-01. With no split made, the capacity page shows the same groups and figures as today.
- MR-8 AC-02. After a split of MG-03 into 2 planning groups, the supplier enters capacity for each, and demand is summed per group.
- MR-8 AC-03. Moving a material marks future capacity weeks of both groups "Needs re-entry".
- MR-8 AC-04. A material cannot be in 2 planning groups, and a group cannot mix 2 SAP groups.

---

## 11. MR-9 Alert order and close reasons

### a. Problem and reason
The planner needs the most urgent alert first, and the hub needs to know why alerts are closed. Today, alerts in a risk class are ordered by supplier name. The close note is free text, so closures cannot be counted by reason [MOM 6.1, 6.2].

### b. Business rules
- MR-9 BR-01. Risk classes stay as CR-24 sets them:
  - High: days of cover below the supplier lead time.
  - Medium: days of cover below 1.5 × the lead time.
  - Low: everything else, including stale data.
  
  This corrects the "Critical, High, Medium" proposal made in the MOM review on 2026-09-29. That proposal was written before CR-24 was checked. It would add a fourth level and raise data alerts from Low to Medium [Owner, 2026-09-21, CR-24; MAT-D1].
- MR-9 BR-02. Order: risk class High to Low. Within a class, fewest days to impact first. Then supplier name [MOM 6.1; days to impact Proposed].
- MR-9 BR-03. Days to impact per rule:
  - Stock rules: days of cover, or days to the projected stock-out.
  - `callOffNotCovered`: days to the call-off's need date.
  - `staleData`: days since the figure became stale, negated so that the oldest comes first.
  - `capacityBelowDemand`: days to the first gap week.
  - Others: 0 [Proposed].
- MR-9 BR-04. Closing an alert needs a reason from a list. The note is optional, except for "Other", where it is required [MOM 6.2; Owner, 2026-09-29].
- MR-9 BR-05. Starter reason list, a new admin list `alertClose` beside the 4 lists in `reasonCodes.ts:38`, editable under BL-32 (add, rename, retire, never delete) [Proposed]:
  - Call-off raised or brought forward
  - PO raised
  - Supplier updated its data
  - Supplier confirmed the stock by other means
  - Data error, no real risk
  - Risk accepted
  - Other (note required)
- MR-9 BR-06. The closed tab can be filtered by reason, and shows a count per reason per rule for the period [Proposed].
- MR-9 BR-07. The alert list shared by Levi (MOM 6.3) is checked against section 14, which lists the 8 rules built plus the 2 this document adds. Any rule on Levi's list and not in section 14 becomes a new MR-9 BR [MOM 6.3].

### c. Lifecycle and data changes
- `InventoryAlert` and `AlertLedgerEntry` gain `closeReason: string` (the code). `actionNote` becomes optional, except for `other`.
- Hook `ALERT_ACTION_NOTE_AUTHORED` becomes `ALERT_CLOSE_REASON_GIVEN`.
- `REASON_LISTS` gains `alertClose`.
- `alertsFromLedger` sorts by `(riskClass, daysToImpact, supplierName)`.

### d. Acceptance criteria
- MR-9 AC-01. 2 High alerts with 3 and 10 days of cover are listed 3 first.
- MR-9 AC-02. Closing without a reason is refused by the verb. Closing with "Other" and no note is refused.
- MR-9 AC-03. A retired reason is no longer offered, and closed alerts that used it still show it.
- MR-9 AC-04. The closed tab shows the count per reason.

---

## 12. MR-10 Vendor qualification and bidding eligibility

### a. Problem and reason
Who may bid depends on how complete a vendor's documents are:
- **Approved:** the vendor has the initial documents. It may bid on indirect materials.
- **Preferred:** the vendor has all required documents. It may bid on direct and indirect materials.

Today the hub has no such levels. It lets any Active supplier be invited to any event, and it does not know whether an event is direct or indirect [MOM 7; Owner, 2026-09-29].

### b. Already built
- Supplier lifecycle `status` Active, Onboarding, Suspended, Blacklisted, and the Active-only invitee gate at filter and publish (`rfxRules.ts:56-60, 107`; `RFX_PUBLISH_HAS_INVITEES`) [Code].
- Supplier documents with category, status and expiry, and the Expiring (90 days) and Expired projections [Code].
- CR-23 at scoring and award [Code].

### c. User stories
- US-MAT-12. As Procurement, I want a vendor's qualification to follow its documents automatically, so that nobody has to keep a status list up to date by hand.
- US-MAT-13. As a buyer, I want the invitee list to offer only vendors qualified for the event's type, so that I cannot invite a vendor that is not allowed to bid.
- US-MAT-14. As a supplier, I want to see my qualification and the documents missing for the next level, so that I know what to send.

### d. Step-by-step flow

**Procurement (set-up)**
1. Administration → Vendor qualification: for each level (Approved, Preferred), picks the required document types from the supplier document categories and certificate types.

**Hub (continuous)**
1. On every document change (verified, rejected, expired), the hub recomputes the vendor's qualification: Preferred if every Preferred document is valid; otherwise Approved if every Approved document is valid; otherwise Registered.
2. A change is logged with the old level, the new level and the document that caused it. The supplier and Procurement see it in the hub.
3. 30 days before a document expires would drop the level, the supplier and Procurement are warned.

**Buyer (sourcing)**
1. Creates an RFI, RFQ or RFP. Its **Sourcing type** (Direct or Indirect) shows, taken from the category's mapping (all of today's purchasing groups, 101 to 104, are direct).
2. The invitee step offers only Active vendors qualified for the type:
   - Direct: Preferred.
   - Indirect: Approved or Preferred.
   
   Other vendors are listed greyed out, with the missing documents.
3. Publish re-checks the rule.
4. At award, a vendor that has since dropped below the required level is refused, with the reason, like CR-23.

**Supplier**
1. Profile shows "Qualification: Approved" and "For Preferred, still needed: …", linking to the document upload.

### e. Business rules
- MR-10 BR-01. Qualification levels: Registered (below Approved), Approved, Preferred. Each vendor has exactly 1 [Owner, 2026-09-29].
- MR-10 BR-02. Qualification is separate from lifecycle status. Only an Active vendor can be invited, whatever its qualification (today's rule). A Suspended Preferred vendor cannot be invited [Proposed].
- MR-10 BR-03. The level is computed from documents only: a document counts when its status is Valid and it is not expired on the day. There is no manual override up. Procurement can suspend a vendor through lifecycle status [Owner, 2026-09-29 (automatic); no override Proposed].
- MR-10 BR-04. The documents required per level are set by Procurement in the admin screen. The Preferred list always includes every Approved document [Owner, 2026-09-29 (Preferred = all); lists open, MAT-D15].
- MR-10 BR-05. Eligibility: Direct events accept Preferred. Indirect events accept Approved and Preferred [Owner, 2026-09-29].
- MR-10 BR-06. Procurement maps each sourcing category and purchasing group to Direct or Indirect once, in the admin screen. An RFI, RFQ or RFP takes its sourcing type from its category and shows it; the buyer does not type it. It cannot change after publish [Proposed, MAT-D13].
- MR-10 BR-07. Checked at invite (filter), at publish (hook) and at award (refusal with reason). An invited vendor that drops a level mid-event can still respond, but cannot be awarded until it is back at the level [Proposed, MAT-D14].
- MR-10 BR-08. The hub is the source of the qualification, because the documents live in the hub and there is no SAP vendor master interface (`services/data/sapInterfaceRules.ts` has no vendor object). When that interface exists, the level is sent to SAP [Owner, 2026-09-29 (documents in hub); SAP direction Proposed]. This corrects the MOM-review recommendation to keep the status in SAP.
- MR-10 BR-09. The free-text scorecard strings "Preferred Supplier" and "Approved Supplier" (`services/data/types.ts:1652`) are replaced by the computed level [Proposed].
- MR-10 BR-10. A supplier application approved in onboarding (`supplierApplication.flow.ts`, state "Approved") does not make the vendor an "Approved" vendor. To avoid the clash, the application state is shown as "Application accepted" [Proposed].

### f. Lifecycle and data changes
- New admin config `QualificationRule {level: 'approved' | 'preferred', requiredDocs: {category, certType?}[]}`, changed by a governed verb held by `procurement` and the Hub administrator.
- New pure function `qualificationFor(supplierId, onDate)` → `{level, missingFor: {approved: [], preferred: []}, expiringSoon: []}`, computed at read time. The new ledger `QualificationChange {supplierId, from, to, cause, at}` is appended when a recompute differs.
- `Supplier` gains the projected `qualification` (never stored, like `scorecardGrade`).
- New admin mapping `SourcingTypeMap {category | purchasingGroup → 'direct' | 'indirect'}`; the RFI, RFQ and RFP event types gain a derived, stored-at-publish `sourcingType`.
- `filterInvitees` gains the qualification filter. `RFX_PUBLISH_HAS_INVITEES` gains `SUPPLIER_NOT_QUALIFIED`. The award policies gain `AWARD_SUPPLIER_NOT_QUALIFIED`.

### g. Edge cases
1. A Preferred vendor's Preferred-only document expires mid-event on a direct RFQ: it can still submit, but cannot be awarded. The award panel shows why.
2. Procurement adds a document to the Preferred list: vendors without it drop to Approved at once. The admin screen shows how many vendors would drop before saving.
3. A vendor with no documents: Registered, never invitable.
4. An existing event published before this change: `sourcingType` defaults to Direct. Invited vendors are not removed, and award applies the rule.

### h. Acceptance criteria
- MR-10 AC-01. Verifying the last missing Preferred document moves the vendor to Preferred at once, and the change is logged with the document.
- MR-10 AC-02. An expired Approved document moves an Approved vendor to Registered.
- MR-10 AC-03. A direct RFQ's invitee list does not offer an Approved-only vendor, and publishing with one is refused by the hook.
- MR-10 AC-04. An indirect RFP offers both Approved and Preferred vendors.
- MR-10 AC-05. Awarding a vendor that dropped below the required level is refused with the reason.
- MR-10 AC-06. A supplier sees its level and the documents missing for the next.

---

## 13. Decisions

### 13.1 Accepted by the owner on 2026-09-29 (MOM review)

| # | Decision | Ruling | Used in |
|---|---|---|---|
| A-1 | Sync cadence | 2 hours for system-connected suppliers; weekly for manual suppliers | MR-1 |
| A-2 | Weekly update | Every Thursday, as an SOP; missing it lowers performance and can stop an award | MR-1, MR-2 |
| A-3 | Compliance measure | Rolling 13 weeks; warn below 80%, flag below 60% (reason to award); 4-week grace; 10–15% of the score; no automatic exclusion | MR-2 |
| A-4 | Trade names | Supplier enters, Material Planning approves; many per material, 1 per supplier; search tolerates typos | MR-3 |
| A-5 | Template | Say on the template that G to J are optional | MR-4 |
| A-6 | Call-off mismatch | Warn, do not block | MR-6 |
| A-7 | Shelf life | At least 6 months at receipt; per-material override from SAP; block with an exception approved by QA or Material Planning | MR-6 |
| A-8 | Stock simulation | 2 numbers (supplier available; PTI inbound); last update − ASNs since + to-distributor by ETA + in production by date, capped by group capacity | MR-7 |
| A-9 | ETA to distributor | Entered by the user or kept as master data | MR-7 |
| A-10 | Capacity | Grouped by material group, refined by Material Planning, with MDM | MR-8 |
| A-11 | Close reason | Dropdown plus free text | MR-9 |
| A-12 | Vendor qualification | Document-based, 1 per vendor; Approved = initial documents, Preferred = all; direct → Preferred; indirect → Approved or Preferred; up and down automatically; documents in the hub | MR-10 |

### 13.2 Decided 2026-09-29

**Ruling, 2026-09-29:** the owner accepted the recommendation on every row below, including MAT-D1, which replaces the Critical/High/Medium scale in the MOM review, and MAT-D6, which replaces "QA or Material Planning" in A-7 with Quality only.

Market practice was researched on 2026-09-29 (sources and grades in section 17). A = vendor documentation, B = standard or regulator, C = practitioner or customer guide, D = vendor marketing; "snippet" = only a search summary was read. "Not found" means the research looked and found no source, not that no practice exists.

| # | Decision | Recommendation | Market practice | Risk if not decided |
|---|---|---|---|---|
| MAT-D1 | Alert severity scale | **Keep CR-24 High/Medium/Low; add the days-to-impact sort within each class.** Replaces the Critical/High/Medium scale from the MOM review | SAP IBP custom alerts use 3 severities, High/Medium/Low, set by thresholds (A). SAP SCC inventory alerts rank a fixed 3-step order: out of stock, below minimum, above maximum (A). Oracle ASCP orders exceptions by importance and sorts late ones by days late (A). No 4-level scale and no "stale data" severity found | Two scales in the hub (CR-24 on stock, a new one on alerts) show the same material with different urgency. Unsorted classes bury the alert with least time to act; practitioners cite alert fatigue (C, snippet) |
| MAT-D2 | Where the simulation lives | **Separate Stock simulation page for the first release**; revisit after 3 months of use | **The market puts it on the main screen:** SAP SCC shows projected stock and a 10-week projection in the collaboration grid (A); Pfizer's supplier guide recalculates projected stock in the same grid (C). No tool found that keeps it only in a separate view. The recommendation keeps REQ-E08-01 BR-01 (MN-INV-01, business users: "no separate available figure") until users ask otherwise | Planners keep estimating supplier stock by hand in Excel on non-Thursday days, and decide POs on a 5-day-old figure |
| MAT-D3 | Name for manufacturer → distributor | **"To distributor"** | SAP SCC "In transit" = ASNs without goods receipt; SAP S/4 "stock in transit" = left the issuing plant, not yet received (A). Oracle supply types: on hand, in receiving, WIP, POs, in-transits (A). APICS "pipeline stock" (B/C, snippet). No standard term for the manufacturer → distributor leg found | "Incoming" means in production + in transit in the hub today (REQ-E08-01 BR-06). Reusing it for one leg makes the same word mean two numbers on two screens |
| MAT-D4 | Template columns D to F | **E (in-production qty) required, 0 allowed; F (completion date) required when E > 0; D (supplier ROP) optional** | SAP SCC keeps supplier manufacturing orders and firm receipts as their own key figures, apart from stock on hand (A). Required vs optional per quantity column in SAP's or Oracle's upload templates: not found | The simulation (MR-7) cannot tell "nothing in production" from "not reported", so it under-states supplier stock and triggers call-offs that are not needed |
| MAT-D5 | ASN batch when no batches are declared | **Free text, marked "not in declared stock"; dropdown when batches are declared** | SAP SCC ship notices take supplier and buyer batch as typed fields; a batch-matching rule exists only for subcontracting components, default off (A). A customer guide has suppliers type the batch (C). GS1 DESADV carries batch and expiry as optional free text (B). A portal that forces a pick from declared stock: not found | A hard dropdown blocks every supplier that follows the template (batch columns optional). No marker means planners cannot see which ASN batches were never declared as stock |
| MAT-D6 | Shelf-life rule: which materials, who approves | **Changed.** Rule applies to every material with a shelf life in master data, **raw material and packaging alike**, not by material type. Exception approved by **Quality (the `compliance` lane)** only, not planning. An approved short-dated receipt is received into blocked stock | BPOM CPKB treats raw and packaging materials together as starting materials: specs state an expiry limit, expired material is not used, the warehouse warns QC 3 months ahead, deviations are approved by the Head of QC (B). SAP S/4 checks minimum remaining shelf life at GR, warning or error by configuration; on error, goods can go to GR blocked stock (A). SAP's field is client-level, not per plant (C, snippet) | Short-dated goods reach the warehouse unflagged, a CPKB audit finding. A planner approving their own urgent receipt bypasses the quality check the rule exists for |
| MAT-D7 | Weekly cycle details | **Thursday 23:59 WIB, earlier working day on holidays; PTI-entered records count and stay labelled; a week is compliant only if every material was updated** | Oracle lets buyer users upload supplier on-hand on the supplier's behalf (A). SAP SCC shows "Last customer update" and "Last supplier update" separately (A). Practitioners advise agreeing the cadence and what happens when a file does not arrive (C). A specific cutoff, holiday rule or all-or-nothing rule: not found | Without a fixed cutoff, "late" is argued supplier by supplier and MR-2 cannot be scored. Counting partial weeks lets a supplier update its easy materials and skip the critical ones |
| MAT-D8 | API stale threshold | **24 hours** | EDI 846 practice: "daily at minimum, hourly or better" for high-volume retail (C); retailers accept hourly to weekly (C). SAP SCC alerts on transmission failure, not on data age (A). Oracle purges supplier on-hand older than a customer-set number of days (A). A published threshold for supplier inventory integrations: not found | A silent integration failure looks like fresh data; the planner acts on stock that is days old. Practitioners cite shipping on last week's numbers after a failed export (C) |
| MAT-D9 | How compliance enters the score | **Weighted blend into the score, w = 0.10** (low end of the owner's 10–15%), **fixed at release** | SAP Ariba SPM and S/4 Supplier Evaluation let the customer set weights; no defaults (A). Changing weights later breaks comparison over time (A, snippet). Published example scorecards give responsiveness about 10% (D). A "data update compliance" KPI in a score: not found | A weight set late or changed after launch makes grades jump for reasons suppliers cannot see, and breaks the trend Procurement reviews |
| MAT-D10 | Open call-offs in the simulation | **Changed. Subtract confirmed call-offs not yet shipped, and show the result as "Free to call off" beside Supplier available stock**; both shown, never merged | Every availability formula found subtracts committed demand: JD Edwards ATP (A), Oracle Fusion projected available balance (A), Oracle order promising "shelf − allocated" (A, snippet), SAP SCC projected stock = on hand − demand + shipments (A). Oracle warns that leaving demand in the balance "distorts" the picture (A) | The planner reads stock already promised to PTI as available and skips a call-off that was needed, or counts the same units twice |
| MAT-D11 | Capacity used for the cap | **Allocated capacity only; upside shown separately** | SAP SCC records upside apart from the commit, as a separate key figure (A). Oracle ASCP plans on base capacity plus tolerance fences (A) | Counting upside that was only "if requested" overstates what the supplier will make, and the simulation shows stock that never arrives |
| MAT-D12 | Where planning groups are mastered | **Hub now; move to SAP master data with MDM when the SAP feed runs** | Oracle masters supplier capacity in the ERP approved supplier list (A). SAP IBP takes resources from S/4 work centres and defines aggregated constraints across product groups inside IBP (A). A "capacity group" object in SAP Business Network: not found | Waiting for MDM blocks MR-8 and MR-7's cap. Never moving it leaves 2 groupings (SAP and hub) that drift apart |
| MAT-D13 | Direct vs indirect on an event | **Changed. Derive it from the category, not a field typed on each event:** Procurement maps each category or purchasing group to Direct or Indirect once; the event inherits it | SAP Ariba: all event types serve direct and indirect; eligibility is filtered by commodity, and material groups map to commodities (A). S/4 purchasing categories group material groups and suppliers (C, snippet). Jaggaer: categories carry their own required questionnaires (C). An event-level direct/indirect flag: not found | A typed field can be set wrong on each event, letting an Approved-only supplier into a direct-material event. Without any rule, the Preferred requirement cannot be enforced at all |
| MAT-D14 | Vendor drops a level mid-event | **Allow response, refuse award until it is back at the level** | SAP Ariba: minimum status for award eligibility, set per event or item; status shown at invite and award (A, snippet); disqualification limits participation and award, does not block in ERP (A). Oracle: not-eligible blocks publish, eligible-with-warning may take part (A). Removing a supplier from an event already running: not found | Removing mid-event punishes a supplier renewing a certificate. Allowing award lets an unqualified supplier receive a PO for a critical raw material, a GMP issue (D) |
| MAT-D15 | Documents required per level | **Blocking for MR-10 go-live. Procurement and Quality define the lists together.** Recommended starting point: Approved = business licence (NIB), tax ID (NPWP), halal certificate for materials in its scope; Preferred = Approved + GMP/ISO 22716 or ISO 9001, and BPOM where applicable. Placeholder lists, labelled, until then | SAP Ariba: qualified before preferred; preferred levels 1–5; qualification per commodity and region; certificates carry expiry and notifications (A). Oracle: qualification periods and automatic requalification of expiring qualifications (A). ISO 22716 §6.2 ties purchasing to supplier evaluation and agreed technical terms, which points to Quality co-owning the requirements (B). Halal is mandatory for cosmetics and their raw materials from 17 Oct 2026 (C) | MR-10 cannot go live without the lists. Without them, status stays manual, and an expired certificate does not stop the next PO (D); approved lists not kept current are a common GMP audit finding (D, snippet). After 17 Oct 2026 a supplier without halal could still be sourced |

**Note on MAT-D15.** SAP Ariba holds qualification per commodity and region, not one per vendor. The owner ruled one level per vendor (A-12). If a vendor supplies both certified and uncertified categories, one level cannot say "Preferred for fragrances, Approved for cartons". Revisit A-12 if that case appears.

---

## 14. Alert rules after this change (for MOM 6.3)

| Rule | Condition | Shown to | Status |
|---|---|---|---|
| `ptiBelowRop` | PTI SOH below PTI ROP | PTI | Built |
| `supplierBelowRop` | Supplier SOH below supplier ROP | PTI, supplier | Built |
| `projectedStockOut` | Projected stock-out before the next incoming date | PTI | Built |
| `capacityBelowDemand` | Allocated capacity below demand | PTI, supplier | Built; per planning group after MR-8 |
| `staleData` | Supplier figure older than its cadence | PTI, supplier | Built; rule changed by MR-1 BR-05 |
| `coverage` | Supplier coverage At risk or Uncovered (CR-03) | PTI | Built |
| `commitmentBelowForecast` | Committed quantity below forecast beyond tolerance | PTI, supplier | Built |
| `leadTimeMissing` | No lead time for supplier × material | PTI | Built |
| `callOffNotCovered` | Confirmed call-off due within lead time larger than SOH + in production before the need date | PTI | New, MR-6 BR-13 |
| ASN mismatch | ASN does not match its call-off | PTI | New, shown as a marker on the ASN (MR-6 BR-12), not an alert |

Which of these are PTI-only is set by `PTI_ONLY_RULES` (`inventoryAlertRules.ts:63`).

---

## 15. Build order

1. **Small changes (no dependencies).** MR-4 (template), MR-9 (after MAT-D1), MR-5 (field and admin mapping on fixture data).
2. **Update discipline.** MR-1 without the 2-hour schedule, then MR-2. Needs MAT-D7, MAT-D8, MAT-D9.
3. **Master data.** MR-3 (trade names and search), and MR-8 (planning groups, with a migration that keeps today's figures).
4. **ASN.** MR-6: batch dropdown, then the shelf-life rule and exception state, then the call-off warnings and `callOffNotCovered`. Needs MAT-D5 and MAT-D6.
5. **Simulation.** MR-7, after MR-8 (planning group cap) and MR-4 (MAT-D4). Needs MAT-D2, D3, D10, D11.
6. **Vendor qualification.** MR-10: rule config and computed level, then the invitee filter and publish hook, then the award refusal. Needs MAT-D13, MAT-D14; go-live needs MAT-D15.
7. **Backend (Stage F).** The 2-hour scheduled pull (MR-1 BR-01), the SAP MRP controller feed (MR-5 BR-05) and email reminders.

Each numbered step is a separate PR. Steps 1 to 6 need no backend.

---

## 16. What I could not verify

- **"Weekly supplier confirmation" (MOM 3.2).** No weekly or Thursday confirmation exists in the code. It may be the forecast commitment (BL-48) or a process outside the hub. MR-1 BR-07 leaves which confirmation as an open item.
- **SAP minimum remaining shelf life.** Whether PTI maintains it in the SAP material master is not known. MR-6 BR-06 falls back to 6 months when it is empty.
- **MRP controller per plant.** SAP keeps it per plant. Whether PTI has more than one plant per material is not checked. MR-5 keeps 1 value per material.
- **The alert list in MOM 6.3.** Not yet shared, so section 14 lists only the rules in the code.
- **Grade movement from MR-2.** How many suppliers change grade once compliance enters the score was not computed. MR-2 edge case 5 asks for that list before release.
- **Direct vs indirect default.** All 4 purchasing groups (101 to 104, `rfxConfig.ts:71`) are production materials, so the hub has no indirect category to default from. MAT-D13 assumes buyers pick Indirect by hand.

---

## 17. Sources for section 13.2

Researched 2026-09-29. SAP help.sap.com pages were read through its content API or as PDFs where marked A; items marked snippet were seen only as search summaries.

| Source | Grade | Used for |
|---|---|---|
| SAP Business Network for Supply Chain help: SMI alerts, projected stock status, days' supply, planning collaboration key figures (help.sap.com/docs/ARIBA_SCC/56f40d0f2e4848519334e69f554b4fb6/ pages 4d1082093d5843b0acde1f08ef15f9ff, 84cde1ae53cf4421b15635a2290ceb8e, 3119f426a4bd4559a6608764eeb460e1, 5eb9d58d40f94e61b6f989229fc28208, d0c4152388594caf9a2bcbe656f2619b, 770d492ca60b4f00b490f707c1968ac2, db033dd8786e4c769886737f170ede67, 657440364cb448518f98dee08843c2ae, 9dfe4ee07a9b410682a1638621a438ef) | A | D1, D2, D3, D10, D11, D12 |
| SAP Business Network forecast commit and upside, help.sap.com/docs/ARIBA_NETWORK_SUPPLIERS/f0dac91c138b407c8e90c6c6a43eec83/617d77e4c081496ea990228d7fd1d5d1.html | A | D11 |
| SAP IBP custom alerts, help.sap.com/doc/85288b262c3f4bb4aa10e3244daff3cd/1911/en-US/8751e454555ebc25e10000000a4c4043.html | A | D1 |
| SAP IBP resources and aggregated constraints, help.sap.com/docs/SAP_INTEGRATED_BUSINESS_PLANNING/68fa1e86fe6f41d98421d1ce13a08a9f/5d6a08b708034bc2ad6839f936454573.html; …/feae3cea3cc549aaa9d9de7d363a83e6/31f5f4e59c4f4ac8bdf2f214cec84041.html | A | D12 |
| SAP S/4 stock in transit, help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/ee045184edf24e15928397fc12b6296e.html | A (snippet) | D3 |
| SAP Business Network Supply Chain Integration & Configuration Guide 2605, help.sap.com/doc/91878ca67cdc4e49a0821082c775fb3c/2605/en-US/SupplyChainCollaborationConfiguration_1.pdf | A | D4, D5, D7, D8 |
| SAP Help, GR SLED check, help.sap.com/doc/a6a8c7536e8e2a4be10000000a174cb4/700_SFIN3E%20006/en-US/ae9ac7536e8e2a4be10000000a174cb4.html | A | D6 |
| SAP Learning, date checks in goods receipt, learning.sap.com/courses/inventory-management-in-sap-cloud-erp/using-date-checks-in-goods-receipt-processing-1 | A | D6 |
| SAP Learning, S/4 supplier evaluation KPIs, learning.sap.com/courses/purchasing-in-sap-s-4hana/explaining-kpis-in-supplier-evaluation | A | D9 |
| SAP Learning, SPM project planning, learning.sap.com/courses/sap-ariba-supplier-management-supplier-performance-management-projects/completing-spm-project-planning-phase-activities | A | D9 |
| SAP Help, SPM scorecards, help.sap.com/docs/strategic-sourcing/running-supplier-performance-management-reviews/creating-and-managing-supplier-performance-management-scorecards | A (snippet) | D9 |
| SAP Learning, Ariba direct materials sourcing, learning.sap.com/courses/sap-ariba-sourcing-direct-spend-features-and-functions/using-sourcing-projects-and-events | A | D13 |
| SAP Help, material group to commodity, help.sap.com/docs/strategic-sourcing/common-data-import-and-administration-guide-for-sap-strategic-sourcing-solutions-and-sap-ariba-supplier-management-solutions/copying-material-group-to-commodity-field-in-guided-sourcing | A (snippet) | D13 |
| SAP Help, supplier qualification and sourcing events, help.sap.com/docs/strategic-sourcing/supplier-management-setup-and-administration/about-supplier-qualification-and-sap-ariba-sourcing-events-3235169bcd21479a9fb536fa3ea4277a | A (snippet) | D14 |
| SAP Learning, Ariba SLM qualification, disqualification, preferred suppliers, certificates (learning.sap.com/courses/sap-ariba-supplier-management-supplier-lifecycle-management/…; …/managing-modular-questionnaires-and-supplier-certificates/characterizing-supplier-certificate-management) | A | D14, D15 |
| Oracle ASCP exceptions, supply types, supplier capacity (docs.oracle.com/cd/E26401_01/doc.122/e48756/T309464T309475.htm, T309464T471624.htm, T309464T309472.htm) | A | D1, D3, D11, D12 |
| Oracle 25A projected available balance, docs.oracle.com/en/cloud/saas/readiness/scm/25a/scp25a/25A-sc-planning-wn-f35196.htm | A | D10 |
| JD Edwards ATP, docs.oracle.com/en/applications/jd-edwards/supply-chain-manufacturing/9.2/eoarp/available-to-promise-calculation.html | A | D10 |
| Oracle Using Supply Chain Collaboration 26B, docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26b/faucc/using-supply-chain-collaboration.pdf | A | D4, D7, D8 |
| Oracle supplier eligibility for sourcing, docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/supplier-eligibility-for-sourcing.html | A | D14 |
| Oracle automatic requalification and rule sets, docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/how-you-automatically-requalify-qualifications.html; …/25c/oapro/supplier-qualification-rule-sets.html | A | D15 |
| GS1 Austria Pharma DESADV EANCOM MIG, gs1.at/sites/default/files/2020-05/PHARMA_DESADV_EANCOM_2002_1_3_EN.PDF | B | D5 |
| PerBPOM 31/2020 CPKB (mirror copy, bikinpabrik.id) | B | D6 |
| ISO 22716:2007 text §6.2, §6.5.3 (copy at bpu.cc) | B | D15 |
| IDEXX SAP SCC ASN supplier guide, support.ariba.com/item/download?item_id=202408 | C | D5 |
| Pfizer SAP SCC supplier training guide, cdn.pfizer.com/pfizercom/Pfizer_SAP_SCC_Portal_Supplier_Training_Guide_11082023.pdf | C | D2 |
| EDISQ and Orderful EDI 846 guides (edisq.com/blog/edi-846-inventory-advice-guide; orderful.com/blog/edi-846) | C | D8 |
| Procurewave VMI guide, procurewave.com/vendor-managed-inventory-guide | C | D7, D8 |
| Jaggaer supplier qualification manual (Dompé) | C | D13 |
| CIRS Group, Indonesia halal for cosmetics from 18 Oct 2026 | C (snippet) | D15 |
| Practitioner control-tower articles (locus.sh; scmr.com) | C (snippet) | D1 risk |
| LeanLinking scorecard and approved-supplier-list guides; Ivalua and Ramp scorecard blogs | D | D9, D14, D15 (examples and risks only) |

**Not reached:** Kinaxis, Blue Yonder, Coupa, E2open and TradeBeyond documentation (behind logins or marketing only); the ASCM dictionary original; the full ISO 22716 standard.

## Change log

| Version | Date | Change |
|---|---|---|
| 0.3 | 2026-09-29 | Owner accepted every recommendation in section 13.2 (MAT-D1 to MAT-D15); status set to Decided |
| 0.2 | 2026-09-29 | Section 13.2: market practice and risk per open decision, researched the same day (section 17). Recommendations changed on MAT-D6 (packaging included; Quality approves), MAT-D9 (w = 0.10), MAT-D10 (subtract, "Free to call off") and MAT-D13 (derived from category); rules MR-2 BR-05, MR-6 BR-07/08, MR-7 BR-07, MR-10 BR-06 aligned |
| 0.1 | 2026-09-29 | First draft from the 2026-09-23 SC Hub Material meeting, as reviewed with the owner on 2026-09-29; code read on `main` at `6b26e09` |
