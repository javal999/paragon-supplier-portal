# Supplier Hub: Prototype Build Gap

| | |
|---|---|
| Version | 1.0, 2026-09-17 |
| Compares | `SUPPLIER-HUB-REQUIREMENTS.md` v0.4 with the prototype in this repository at `main` b81f770 |
| Owner decisions | 2026-09-17, recorded in section 9 of the requirements (RFX-1 to RFX-3, GAP-1 to GAP-4) |
| Rule | This is the **only** document that describes what the prototype does for the Supplier Hub. The PRD and the requirements describe the product and never the code. Update this file when a build item lands |

**How to read the status.**
- **Partial:** some of the requirement is built.
- **Different:** built, but the experience differs from the requirement.
- **Missing:** nothing built.
- **Ahead:** the code has more than the requirement said at the time of review.

Where the experience differs, the requirement wins (GAP-1). Where the code had a calculation the requirement lacked, the calculation was moved into the requirements as a `CR-` rule (GAP-2). The code is then brought in line with the requirements.

---

## 1. Status per requirement

| Req | Status at review | What the prototype has | Main code |
|---|---|---|---|
| REQ-E03-01 | Partial | Category filter and OTIF column. No purchasing-group filter; suspended suppliers can be invited | `src/pages-v2/BuyerSourcing.tsx` |
| REQ-E03-02 | Missing | No RFI | — |
| REQ-E03-03 | Partial | RFQ create, publish, invite-only quoting, quote privacy. Pre-fill from a purchase requisition. One price per quote; deadline not enforced | `BuyerSourcing.tsx`, `SupplierRFQs.tsx`, `services/transitions/flows/rfq.flow.ts`, `quotation.flow.ts` |
| REQ-E03-04 | Missing | No RFP; the RFQ has one Incoterms and one payment-terms field | — |
| REQ-E03-05 | Ahead | Scored comparison, currency rule, single-supplier award that rejects the other quotes. No negotiation; no multi-award | `src/lib/quoteScore.ts`, `BuyerSourcing.tsx`, `services/transitions/cascades.ts` |
| REQ-E06-01 | Partial | Versioned forecast publications scoped per supplier. Monthly buckets, 3 commitment classes, no compare or download | `services/sdc/`, `SupplierForecasts.tsx` |
| REQ-E06-02 | Partial | Commitment per period with quantity, date, reason; draft then submit. 7-day deadline; no tolerance, upload, or upside | `SupplierForecasts.tsx`, `flows/requirementResponse.flow.ts` |
| REQ-E06-03 | Partial | Shortfall quantity, accept or dispute with note, manual chase list | `services/sdc/consolidation.ts`, `BuyerCollaboration.tsx`, `BuyerChase.tsx` |
| REQ-E07-01 | Different | Standard PO with lines; no umbrella PO; dates on header only | `services/data/types.ts`, `SupplierOrders.tsx`, `BuyerOrders.tsx` |
| REQ-E07-02 | Different | Acknowledge, then confirm quantity. No adjust reason, reject, deadline, or escalation. Confirmed date is collected but not saved | `flows/purchaseOrder.flow.ts`, `SupplierOrders.tsx` |
| REQ-E07-03 | Missing | No Order Collaboration Summary | — |
| REQ-E07-04 | Partial | ASN only after PO confirmation; several per PO. Shipped quantity always the full line; batch not saved; no cancel | `flows/advanceShipNotice.flow.ts`, `SupplierShipments.tsx` |
| REQ-E07-05 | Missing | No shipping notice confirmation | — |
| REQ-E07-06 | Different | PTI creates, inspects, and posts the goods receipt to SAP in the hub. Discrepancy from quality rejection only; supplier cannot dispute | `flows/goodsReceipt.flow.ts`, `BuyerGoodsReceipt.tsx`, `services/transitions/grRollup.ts` |
| REQ-E07-07 | Different | Invoice = PO + amount; number generated; 1% match; delivered POs cannot be invoiced | `flows/invoice.flow.ts`, `services/transitions/invoiceRollup.ts`, `SupplierInvoices.tsx` |
| REQ-E07-08 | Missing | No interface monitor or data-age banner. Simulated SAP posting with retry on 2 screens | `services/transitions/settleFaults.ts` |
| REQ-E08-01 | Different | Sample stock list with an Available column; no PTI vs supplier stock, supplier ROP, in-production, or raw material / packaging split | `BuyerInventory.tsx`, `SupplierInventory.tsx`, `src/data/mockInventory.ts` |
| REQ-E08-02 | Partial | Manual entry, batch grid, .xlsx import with column mapping. Whole file accepted or rejected; no template; Sync button inert | `BulkStockEntryGrid.tsx`, `XlsxImportPanel.tsx`, `services/sdc/ingest.ts` |
| REQ-E08-03 | Missing | — | — |
| REQ-E08-04 | Missing | Capacity type defined, unused | `services/sdc/types.ts` |
| REQ-E08-05 | Missing | Hand-written risk banners only | `BuyerRisk.tsx` |
| REQ-E09-01 | Different | No SAP recommendations; Intake Review turns suggestions into purchase requisitions | `IntakeReview.tsx` |
| REQ-E09-02 | Missing | — | — |
| REQ-E09-03 | Different | Scheduling agreement releases under a contract; PTI releases; supplier read-only; no confirmation statuses | `services/delivery/`, `BuyerDeliveryAgreements.tsx`, `SupplierDeliveryAgreements.tsx` |
| REQ-E09-04 | Partial | Supplier-reported shipment with ETA, not linked to a call-off; no At Risk; dock appointments tab present | `flows/incomingShipment.flow.ts`, `SupplierShipments.tsx` |
| REQ-E10-01 | Missing | OTIF and grades are typed into sample data; no CFOT | `src/data/mockSuppliers.ts`, `services/data/mock/fixtures/` |
| REQ-E13-01 | Missing | "Track shipment" shows a not-available message | `BuyerShipments.tsx` |

---

## 2. Build list: bring the prototype in line

Each item follows the requirement named. E06 items wait for the owner review (E06-R).

| ID | Change | Requirement |
|---|---|---|
| X-01 | Replace the scheduling-agreement release model with call-offs owned by the hub under an umbrella PO, confirmed by the supplier per line | REQ-E09-03 |
| X-02 | PO response: Approve / Adjust / Reject, deadline, Escalated status, rejection notification; save the confirmed date | REQ-E07-02 |
| X-03 | Build the Order Collaboration Summary | REQ-E07-03 |
| X-04 | Build the shipping notice confirmation | REQ-E07-05 |
| X-05 | ASN: shipped quantity, batch, required fields, cancel, in-transit link, call-off gate | REQ-E07-04 |
| X-06 | Goods receipt read from SAP; supplier acknowledge or dispute; keep the quality inspection result (K-01) | REQ-E07-06 |
| X-07 | Invoice from goods receipts; supplier invoice number and e-Faktur; duplicate block; statuses | REQ-E07-07 |
| X-08 | SAP interface monitor and data-age banner | REQ-E07-08 |
| X-09 | Inventory view: remove Available; add PTI and supplier SOH and ROP, in production vs in transit, material type split, stale flag, days of supply | REQ-E08-01 |
| X-10 | Fixed downloadable stock template; row-level acceptance; working Sync button | REQ-E08-02 |
| X-11 | Supplier access to PTI stock | REQ-E08-03 |
| X-12 | Capacity confirmation | REQ-E08-04 |
| X-13 | Rule-based alerts with risk class | REQ-E08-05 |
| X-14 | Forecast buckets, zones, compare, download, upload, upside | REQ-E06-01, REQ-E06-02 (after E06-R) |
| X-15 | Gap monitoring: %, bands, cumulative, ranking, reassign | REQ-E06-03 (after E06-R) |
| X-16 | SAP ROP recommendations released as call-offs | REQ-E09-01 (after REPL) |
| X-17 | Event-based analysis | REQ-E09-02 (after PQ-09) |
| X-18 | Dispatch heads-up against a call-off, At Risk flag; remove the Dock appointments tab and Dock Schedule button | REQ-E09-04 |
| X-19 | RFI and RFP; RFQ from RFI; quote per item; enforce deadline; purchasing-group filter; hide suspended suppliers; negotiation rounds; multi-award | REQ-E03-01 to REQ-E03-05 |
| X-20 | Calculate CFOT and OTIF from hub data; working period filter; one OTIF target | REQ-E10-01 |
| X-21 | No change until D-03 decides the TMS phase | REQ-E13-01 |

### 2.1 Navigation and screens

| ID | Change | Requirement |
|---|---|---|
| U-01 to U-04, U-07, U-08 | Rebuild the menu per section 3.7: sections by hub area, role filter, one name per object, section label from the menu, "PTI / Supplier" switch, supplier menu by task. Main code: `src/components/layout-v2/SidebarV2.tsx` | NV-02, NV-05; section 3.7 |
| U-05 | Home as a task list; lifecycle steps on each PO and call-off | SC-01, SC-02 |
| U-06 | Replace system labels ("Commands dispatch — in-memory ledger", feed names) with 1 "Sample data" badge | SC-04 |
| U-09 | Hide out-of-scope pages during the pilot (section 4) | NV-06 |
| U-10 | Highlight the menu item on detail pages | NV-03 |
| U-11 | Unique icon per menu item | NV-04 |
| U-12 | One "as of" date for sample data | SC-05 |
| U-13 | One OTIF target (CR-17: 90%). Retire the 95% line on the scorecard and supplier performance pages | CR-17 |
| H-01 | Action banner above KPI tiles on working pages | SC-03 |
| H-02 | Section labels at least 12px | SC-06 |
| H-03 | Keyboard and screen-reader test before UAT | SC-07 |

---

## 3. Calculations: where each rule came from

Rules adopted into section 3.6 of the requirements, with the prototype code they were taken from.

| Rule | Prototype source |
|---|---|
| CR-02 days-of-supply bands | `src/pages-v2/BuyerInventory.tsx` (PTI page bands) |
| CR-03 supplier coverage | `src/services/sdc/consolidation.ts` (`COVERAGE_AT_RISK_FLOOR = 0.8`) |
| CR-04 remaining quantity | `src/services/delivery/ledger.ts` |
| CR-05 over-quantity tolerance | `src/services/delivery/ledger.ts` (10% flag for forecast releases; unlimited for JIT) |
| CR-06, CR-07 match and on time | `src/services/delivery/fulfillment.ts` (`MATCH_WINDOW_DAYS = 7`, `DELIVERY_GRACE_DAYS = 3`) |
| CR-09 reminders and drift | `src/services/chase/deliveryChase.ts` |
| CR-10 counter-offer quantity | `src/services/transitions/policies.ts` |
| CR-11 goods receipt result | `src/services/transitions/grRollup.ts` |
| CR-12, CR-13 invoice match | `src/services/transitions/invoiceRollup.ts` (`MATCH_TOLERANCE = 0.01`) |
| CR-14 invoice due and overdue | `src/services/data/mock/MockCommandService.ts` (due date on submit), `src/services/data/invoiceProjection.ts` (overdue) |
| CR-15, CR-16 quote score and currency | `src/lib/quoteScore.ts`, `src/lib/fxPin.ts` |
| CR-17 OTIF target status | `src/lib/chartPalette.ts` (`targetStatus`, target 90 on dashboard and analytics) |
| CR-18 number check | `src/lib/localeNumber.ts` |
| CR-19 batch total | `src/services/sdc/ingest.ts` |
| CR-20 integration retry | `src/services/transitions/settleFaults.ts` |
| Starter reason codes | `src/pages-v2/SupplierForecasts.tsx` (`ROOT_CAUSE_LEVELS`) |
| Call-off series generator (REQ-E09-01 BR-05) | `src/services/delivery/generator.ts` |

**Prototype calculations not adopted**, to be removed from the code:

| Calculation | Why not adopted |
|---|---|
| Reorder point = daily demand × 14, safety stock = × 7, MOQ = max(500, × 7), on the PTI inventory panel | ROP comes from SAP (REQ-E08-01 BR-04, validated) |
| Supplier-page days-of-supply bands (below 7, 7 to 13, 14 to 30, above 30) | Conflicts with CR-02; one set kept |
| OTIF target 95% on scorecard and supplier performance | Conflicts with CR-17; one target kept |
| Forecast commitment deadline of 7 calendar days, exact-match re-publication, coverage-style gap colours | Held for owner review of E06 (E06-R) |

---

## 4. Prototype features not in the requirements

Decisions per the gap review suggestions (GAP-4).

| ID | Feature | Decision | Where it now lives |
|---|---|---|---|
| K-01 | Goods receipt quality inspection: hold, retest, halal and BPOM checks | Keep for PTI; the supplier sees the result | REQ-E07-06 BR-06; boundary open (Q-20) |
| K-02 | Stock by batch with expiry date | Keep as optional template columns | REQ-E08-02 BR-06 |
| K-03 | PTI records stock or replies received by WhatsApp or email | Keep | REQ-E08-02 BR-08 |
| K-04 | Distributor principal lead times and principal shipments | Keep | Held with E06 (E06-R), because it feeds forecast coverage |
| K-05 | Should-cost model in bid comparison | Park | Hidden in pilot |
| K-06 | Purchase requisitions, intake review, plan grid | Park. The RFQ-from-requisition path stays (REQ-E03-03 BR-04) | Hidden in pilot |
| K-07 | Compliance tracker and supplier documents | Hand to the Foundation team (E01, E02) | Foundation contribution |
| K-08 | Marketplace, discovery, storefront, supply risk, contracts | Park; contract and catalog are Phase 2 | Hidden in pilot |
| K-09 | Roles catalogue, process flows, glossary | Move to the user menu | NV-01 |
| K-10 | Acknowledge-only forecast lines, dispute log, draft before submit | Keep | Held with E06 (E06-R) |

---

## 5. Other documents in this repository

These documents describe how the prototype was designed. For Supplier Hub product scope, `SUPPLIER-HUB-PRD.md` and `SUPPLIER-HUB-REQUIREMENTS.md` are the reference. Where they disagree, the Supplier Hub documents win. The documents below are kept unchanged as engineering history.

| Document | Relation to the Supplier Hub documents |
|---|---|
| `docs/Delivery_Agreement_Design_Spec_v1.md`, `docs/Delivery_Agreement_and_Contract_Compliance_Chase_Design_Note_v1.md` | The scheduling-agreement model is replaced by hub call-offs (REQ-E09-03, X-01). Its calculations kept as CR-04 to CR-09 |
| `docs/Supplier_Data_Collaboration_Design_v2.md`, `docs/C8_Forecast_Publication_Seam_Proposal.md`, `docs/contracts/C8-forecast-publication.md` | Forecast and stock design. Forecast parts wait for E06-R; stock parts replaced by REQ-E08-02 |
| `docs/PR_Intake_Review_Investigation_2026-07-15.md`, `docs/contracts/C7-pr-intake.md`, `docs/Stage_G_Grid_Planning_Layer_Plan_v1.md` | Parked features (K-06) |
| `docs/Halal_Compliance_Control_Design_v1.md` | Foundation hand-off (K-07); halal checks at receipt kept (K-01) |
| `docs/Communication_Hub_Design_Skeleton_v1.md` | Supports K-03 |
| `docs/Supplier_Portal_*_Plan_*.md`, `Paragon_World_Class_Build_Plan_v1.md`, `docs/Paragon_Platform_Strategic_Spine_v1.md` | Prototype build sequencing, not product requirements |
| `CLAUDE.md`, `docs/findings.md`, `docs/contracts/` (others) | Engineering rules and records for the prototype codebase |
