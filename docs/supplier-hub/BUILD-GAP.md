# Supplier Hub: Prototype Build Gap

| | |
|---|---|
| Version | 2.5, 2026-09-21 |
| Compares | `SUPPLIER-HUB-REQUIREMENTS.md` v0.9 with the prototype on `main` |
| Owner decisions | 2026-09-17, recorded in section 9 of the requirements (RFX-1 to RFX-3, GAP-1 to GAP-4, E06-R); 2026-09-21 for the working calendar (Q-18, BL-14) and the commitment deadline (CR-26, BL-05), built as BL-50 and BL-48 |
| Rule | This is the **only** document that describes what the prototype does for the Supplier Hub. The PRD and the requirements describe the product and never the code. Update this file when a build item lands |

**How to read the status.**
- **Built:** the requirement is implemented as written, on sample data.
- **Partial:** part of the requirement is implemented; the rest is named below.
- **Not built:** nothing implemented, with the reason.

Everything runs on sample data held in the browser. There is no backend, no SAP connection and no email; the hub's own rules, refusals and calculations are real, and anything a user changes is lost when the page reloads.

---

## 1. Status per requirement

| Req | Status | Notes |
|---|---|---|
| REQ-E03-01 Supplier filtering | Built | Category and purchasing group filters; OTIF or "No history"; suspended, deactivated and blacklisted suppliers cannot be invited. BR-05 (BL-52): certificate validity (valid, expiring within 90 days, expired or missing — halal and BPOM, from the compliance projection), then performance band (grade A–D or "No history"), then country, on the buyer supplier list and every invitee search, kept in the page address and combined with the existing filters |
| REQ-E03-02 RFI | Built | Template sections A–F, question library with required and weighted questions, drafts hidden from the buyer, deadline extension, answers reused by a later RFQ. Creation follows section 3.6a of the requirements, which the build already matches: central library, edited per event, no save-as-template, no approval before sending. Attachment questions are text fields: there is no file store |
| REQ-E03-03 RFQ | Built | From scratch, from an RFI, or from a purchase requisition; price per item; response deadline enforced; quote privacy |
| REQ-E03-04 RFP | Built | Standard term list in 7 groups, Comply or Deviate with a comment required on a deviation, term-by-term comparison |
| REQ-E03-05 Comparison, negotiation, award | Built | Compliance gate at award (CR-23: halal, BPOM, GMP / ISO 22716 per material, supplier status, minimum OTIF — placeholder 80%, "No history" passes); a failing supplier can be invited and quote but gets no award field, and the award verb refuses it. Weighted score (CR-15, price 40 / lead time 20 / reliability 40) over qualified suppliers only, with reliability from measured OTIF, currency rule (CR-16), negotiation rounds restricted to shortlisted suppliers with every quote version kept, split award that must total 100% per item, reason required when the award leaves the best-scored quote. Sourcing request (E03.01) is still not detailed in the requirements |
| REQ-E06-01 Forecast publication | Built | Weekly periods for packaging then monthly, monthly for raw material; Firm / Trade-off / Forecast zones; versions kept with a Changes view; spreadsheet download; view tracking and re-publication on the PTI Forecasts page |
| REQ-E06-02 Commitment | Built | Pre-filled with the forecast, upside, acknowledgement for Forecast periods, reason enforced by the system when below forecast, CR-21 tolerance, spreadsheet upload, carry-forward on re-publication. CR-26 deadline (BL-48): Firm periods 1 working day, Trade-off and Forecast 3 working days after publication, counted on the hub working calendar. The supplier sees the deadline with the time left, how late once past it, and whether a submitted commitment arrived in time; a commitment is judged against the deadline of the version it answered, so a carried-forward one keeps its verdict. Late is derived when the page is read, never stored |
| REQ-E06-03 Gap monitoring | Built | Gap quantity and %, CR-22 colours, cumulative view, ranked exception list, Accept / Request revision / Move demand, reminders as Home tasks, supplier coverage as an estimate. The planner sees each commitment's CR-26 deadline and how late it is in the exception list, and the time left or lateness in each awaiting cell of the grid (BL-48) |
| REQ-E07-01 PO visibility | Partial | Umbrella PO with its lines, response status and deadline. Per-line dates still depend on PQ-12; there is no SAP feed, so POs are sample data |
| REQ-E07-02 PO response | Built | Approve, Adjust with reason and counter-offer, Reject with cause; 1-working-day deadline on the hub working calendar and Escalated derived from the clock; planner accepts or rejects a counter-offer; rejections feed performance |
| REQ-E07-03 Order summary | Built | PO, ASN count, and the three confirmations with links; lifecycle steps on the PO |
| REQ-E07-04 ASN | Built | Shipped quantity per line capped at the open quantity unless a reason is given, batch, ship date, required fields, several ASNs per PO, cancellation. BR-05 (BL-51): the supplier picks the 3PL from the administrator's list (or types another carrier); the tracking number opens the 3PL's public tracking page in a new tab wherever the ASN is shown, supplier and PTI; no status is read from the 3PL; no 3PL or an unknown one shows plain text. The 3PL list is a sample list, maintained on an administration page by the hub administrator |
| REQ-E07-05 Shipping notice | Built | Expected completion date per PO; the first ASN records shipment started; a later date raises a PTI task |
| REQ-E07-06 Goods receipt | Partial | Supplier page with shipped, received and rejected quantity, QC result, discrepancy flag, acknowledge or dispute, PTI resolution. CR-25 tolerance (BL-45): any over-delivery is flagged, a shortfall above 2% is flagged and the receipt is shown as kept open, a shortfall at or below 2% closes; both the supplier page and PTI's goods receipt panel state the reason per line. Tolerance is held per material, with no material overriding the default yet. Receipts are still created in the hub rather than read from SAP, because there is no SAP feed; dispute attachments are not built; "kept open" is a derived label and does not yet reopen the order quantity for another shipment |
| REQ-E07-07 Invoice | Built | Built from received goods receipts, supplier's own invoice number and date, e-Faktur file name, duplicate and over-invoicing refused, CR-12 and CR-13 matching at submission, status list with correct-and-resubmit, CR-14 due date. CR-12 as revised 2026-09-21 (BL-44): 0% on a line whose PO price comes from a contract, otherwise 2% and within a rupiah cap; the cap is a placeholder (IDR 500,000) until Finance sets it (BL-54). Buyer and supplier invoice screens state per line which rule applied and why a line is held. The supplier's new-invoice form still takes one invoice total, not an amount per line; a total that differs from its lines is checked under the strictest rule on the invoice |
| REQ-E07-08 SAP interface | Partial | Interface monitor with last successful arrival, failed messages and CR-20 retry, plus the data-age banner. The feeds themselves are simulated; the real interface technology is PQ-06 |
| REQ-E08-01 Inventory visibility | Built | Supplier and PTI stock and reorder points, incoming split into in production and in transit with its detail, days of supply with its risk class and the basis that decided it (CR-24: "Lead time N days", or "No lead time · day bands" where the CR-02 fallback applied, BL-46), last update and stale flag. No "available" figure. Raw material and packaging are separate on the PTI view; on the supplier view they are one list, split only for a supplier that supplies both (BR-07, BL-61) |
| REQ-E08-02 Stock submission | Built | One stock entry point, on the Stock page: the template and manual entry carry the same fields, including an optional manufacturing date per batch (not after expiry, not in the future), with row-by-row upload validation (BR-06, BR-09, BL-60). The Forecast page's old batch grid and free-form import are retired; its Stock tab now links to the Stock page. In-transit quantity is shown read-only beside in production on both methods, from ASNs and dispatched call-offs (BR-10). An API-connected supplier presses Sync on its own Stock page, and a PTI user can still sync on its behalf; the connection is simulated, with a failure path that keeps the previous figures marked out of date (BR-03, BL-59). A supplier with PTI stock access can refresh PTI stock for the granted materials only; without access the option is absent (BR-11). Stock recorded by PTI on a supplier's behalf |
| REQ-E08-03 Supplier access to PTI stock | Built | Grant, change and remove per supplier and per material, with a log; a supplier without access never receives PTI stock data |
| REQ-E08-04 Capacity | Built | 13 weekly buckets per material group, "Extra capacity if requested" with a one-line explanation on both sides (BR-05, BL-62), reason required below demand, gap weeks highlighted for the planner, planner filters by supplier, material group, material and gap weeks only, kept in the page address and combined with the Order summary filter (BR-07, BL-63), and the Order summary capacity status |
| REQ-E08-05 Alerts | Built | Rules for PTI and supplier stock against reorder point, projected stock-out, capacity gap, stale data, coverage and commitment below forecast; High / Medium / Low by days of cover against the supplier lead time (CR-24: High below 1 ×, Medium below 1.5 ×), with the CR-02 day bands only where the lead time is missing, which raises its own "lead time missing" alert for PTI (BR-02, BL-46); each alert shows the basis of its class; no duplicates; grouped per supplier; closed with an action note. Delivery is in the hub only, not by email |
| REQ-E09-01 Replenishment recommendation | Partial | Planner releases call-offs against what remains on the umbrella PO line, and can generate a series. Since BL-49 the release check is on remaining **quantity** (BL-13: the PO holds a quantity per line); remaining **value** is the check only on a line that has no quantity (an SAP value-limit line, sample `PO-2026-00128`). The release panel and a draft's panel show what remains before the planner acts, and an over-release is refused with the requested and remaining figures, on the screen and by the verb. The SAP ROP recommendation list is not built (X-16) |
| REQ-E09-02 Event-based analysis | Not built | Waiting on PQ-09 |
| REQ-E09-03 Call-off confirmation | Built | Hub-owned call-offs, the six confirmation statuses, CR-05 tolerance as revised on 2026-09-21 (BL-47): up to 5% over accepted for every call-off type; any shortfall accepted and shown as a partial; a later date always goes to the planner; an earlier date goes to the planner while the early allowance is the placeholder 0 days (BL-56). Both call-off screens show the rule that applied and its reason, on the row and in the panel, and the supplier sees it before sending. Planner approval outside tolerance uses the existing approve and reject verbs; 1-working-day deadline on the hub working calendar with escalation; ASN allowed only on a confirmed call-off |
| REQ-E09-04 Delivery execution | Built | Dispatch heads-up or a linked ASN, At Risk when the expected arrival is after the need date, reminders. No dock or slot booking |
| REQ-E10-01 CFOT and OTIF | Built | Calculated per PO and per call-off from hub data with working period filters, rejections counted, grade bands stated on screen, "No history" where nothing is measurable. Both performance pages state the definitions as calculated — delivery window, early deliveries, grain, date change, in full (BL-53) — and show "Baseline period — no target yet" instead of the 90% target (BL-19). Other scorecard measures stay sample figures and are marked as such |
| REQ-E13-01 TMS access | Not built | Decided out of the MVP (D-03); covered by the 3PL tracking link on the ASN (BL-51) |
| Section 3.4 Working calendar (Q-18) | Built | The hub keeps its own calendar (BL-50): the SAP factory calendar as loaded, which is simulated and marked Sample data (there is no SAP connection, and the load includes one sample plant shutdown day), plus rulings by the Hub administrator that make one date working or non-working, with a reason. A ruling is a governed act (`t_calendar_day_set`), held by Compliance and the administrator seat and by no lane the deadlines measure, and is kept in this browser across reloads. The administration page (Help & administration, Working calendar) lists the non-working days with where each came from, the rulings on record, and the commitment deadlines the calendar decides now. Every working-day deadline in the hub reads this calendar: PO response, call-off confirmation and forecast commitment |

---

## 2. Build list

| ID | Change | State |
|---|---|---|
| X-01 | Hub-owned call-offs under an umbrella PO | Done (phase 3) |
| X-02 | PO response, deadline, escalation, counter-offer review | Done (phase 2a) |
| X-03 | Order Collaboration Summary | Done (phase 2a) |
| X-04 | Shipping notice confirmation | Done (phase 2a) |
| X-05 | ASN detail, open-quantity rule, cancellation | Done (phase 2b) |
| X-06 | Goods receipt discrepancy, supplier acknowledge or dispute | Done (phase 2b), except receipts still originate in the hub and disputes take no attachment |
| X-07 | Invoice from goods receipts | Done (phase 2b) |
| X-08 | SAP interface monitor and data-age banner | Done (phase 6b) against simulated feeds |
| X-09 | Inventory view rebuilt | Done (phase 4) |
| X-10 | Stock template, row-level upload, sync | Done (phase 4) |
| X-11 | Supplier access to PTI stock | Done (phase 4) |
| X-12 | Capacity confirmation | Done (phase 4) |
| X-13 | Alerts with risk class | Done (phase 4), hub only |
| X-14 | Forecast periods, zones, compare, download, upload, upside | Done (phase 5) |
| X-15 | Gap monitoring | Done (phase 5) |
| X-16 | SAP ROP recommendations released as call-offs | Not built — waiting on REPL |
| X-17 | Event-based strategy analysis | Not built — waiting on PQ-09 |
| X-18 | Dispatch heads-up, At Risk, dock booking removed | Done (phases 1 and 3) |
| X-19 | RFI, RFP, quote per item, negotiation, split award, invite filters | Done (phase 6a) |
| X-20 | CFOT and OTIF calculated | Done (phase 6b) |
| X-21 | TMS access | Not built — out of the MVP (D-03); replaced by X-27 |
| X-22 | One stock entry (BL-60): same fields on template and manual entry, manufacturing date, read-only in-transit, Forecast page stock grid retired | Done (inventory feedback) |
| X-23 | Supplier-triggered stock sync and PTI stock refresh for granted materials (BL-59) | Done (inventory feedback), simulated until the backend |
| X-24 | One list on the supplier inventory view (BL-61) | Done (inventory feedback) |
| X-25 | Capacity "Extra capacity if requested" label (BL-62) | Done (inventory feedback) |
| X-26 | Planner capacity filters in the page address (BL-63) | Done (inventory feedback) |
| X-27 | Hub working calendar and the first administration page (BL-50) | Done |
| X-28 | Forecast commitment deadline, CR-26 (BL-48) | Done |
| BL-47 | Call-off tolerance per CR-05 as revised: 5% over for every type, shortfall a visible partial, later and earlier dates to the planner | Done (2026-09-21). Early allowance is a placeholder of 0 days until BL-56 |
| BL-49 | Call-off release checked on remaining quantity; value only on a line with no quantity | Done (2026-09-21) |
| X-29 | Alert risk class by supplier lead time, day bands as fallback, "lead time missing" alert, basis shown on screen (BL-46, CR-24) | Done; lead times are sample master data |
| X-30 | 3PL tracking link on the ASN and the administrator's 3PL list (BL-51) | Done |
| X-31 | Supplier filters: certificate validity, performance band, country (BL-52) | Done |
| X-32 | KPI definitions and "Baseline period" on the performance pages (BL-53) | Done |

### 2.1 Navigation and screens

| ID | Change | State |
|---|---|---|
| U-01 to U-04, U-07, U-08 | Menu by hub section and role, one name per object, section label from the menu, PTI / Supplier switch, supplier menu by task | Done (phase 1) |
| U-05 | Home task lists and lifecycle steps | Done (phases 1 and 2a) |
| U-06 | System wording replaced by a plain sample-data marker | Done (phase 1), with markers moved onto the sample sections of pages that now mix calculated and sample figures (phase 6b) |
| U-09 | Pages outside the MVP hidden from the menu | Done (phase 1) |
| U-10 | Menu item highlighted on detail pages | Done (phase 1) |
| U-11 | One icon per menu item | Done (phase 1) |
| U-12 | One "as of" date for sample data | Partial — each family is anchored to the declared present; the PO family is the last to be aligned |
| U-13 | One OTIF target of 90% | Done (phase 1); the performance pages now show "Baseline period" instead (BL-19, BL-53). The 90% still colours the analytics page and the supplier dashboard |
| H-01 | Action banner above summary figures | Done where the built pages carry one |
| H-02 | Section labels at least 12px | Done (phase 1) |
| H-03 | Keyboard and screen-reader test before UAT | Not done — still to be tested |

---

## 3. Where the calculations live

The `CR-` rules are implemented in the hub's own modules and covered by their own tests. The prototype sources they were taken from are recorded in the requirements' `[Code]` tags.

| Rules | Module |
|---|---|
| Working day arithmetic (section 3.4) | `src/lib/workingCalendar.ts` |
| The calendar in force: SAP load plus administrator rulings (section 3.4, BL-50) | `src/services/transitions/workingCalendarStore.ts` (`hubWorkingCalendar`); the ruling verb `flows/workingCalendar.flow.ts` |
| PO response and escalation | `src/services/data/poResponseProjection.ts` |
| Remaining on the umbrella PO line and the release check, quantity first and value only on a line with no quantity (CR-04) | `src/services/transitions/callOffRules.ts` (`umbrellaRemaining`, `releaseCheck`) |
| Call-off tolerance (CR-05) | Rule: `src/services/transitions/callOffRules.ts` (`checkTolerance`). Values: config module `src/services/transitions/callOffTolerance.ts` — 5% over (`CALL_OFF_OVER_PCT`) and the early allowance `CALL_OFF_EARLY_ALLOWANCE_DAYS`, a placeholder of 0 days until BL-56 is answered (one line) |
| Call-off matching, on time, in full, reminders (CR-06 to CR-09) | `src/services/transitions/callOffRules.ts` |
| Days of supply, bands, coverage, stale (CR-01 to CR-03) | `src/services/transitions/inventoryRules.ts` with `inventoryConfig.ts` |
| Risk class by lead time, CR-02 bands as fallback (CR-24, REQ-E08-05 BR-02) | `riskFor` / `positionRisk` in `src/services/transitions/inventoryRules.ts`, multiple in `inventoryConfig.ts` (`LEAD_TIME_RISK`); alerts in `inventoryAlertRules.ts`. Every page, the dashboard widget and the alerts read this one function (derived in `leadTimeRisk.test.ts`) |
| Forecast periods, zones, commitment tolerance, gap colours (CR-21, CR-22) | `src/services/transitions/forecastRules.ts` with `forecastConfig.ts` |
| Commitment deadline, time left and late (CR-26) | `src/services/transitions/forecastRules.ts` (`commitmentDueAt`, `commitmentTiming`) with `forecastConfig.ts` |
| Goods receipt result, invoice matching, due date (CR-11 to CR-14) | `src/services/transitions/grRollup.ts`, `invoiceRollup.ts` (`checkPrice`, `deriveMatchVerdict`), `fulfilmentRules.ts` (`checkInvoicePrices`, `deriveInvoiceVerdict`), invoice projection |
| Invoice price tolerance and goods receipt quantity tolerance (CR-12, CR-25) | Values in `src/services/transitions/fulfilmentConfig.ts` (the rupiah cap placeholder is one line there, BL-54); rules in `invoiceRollup.ts` (`checkPrice`) and `fulfilmentRules.ts` (`receiptQtyOutcome`, `compareReceipt`, `receiptKeptOpen`) |
| Quote score and currency rule (CR-15, CR-16) | `src/lib/quoteScore.ts`, `src/lib/fxPin.ts` |
| Compliance gate (CR-23) | `src/services/sourcing/complianceGate.ts`, values in `complianceGateConfig.ts` |
| CFOT, OTIF, rejections, score and grade (CR-17) | `src/services/data/performanceRules.ts` |
| KPI definitions as stated on the performance pages (BL-53) | `src/services/data/kpiDefinitions.ts`, pinned to the arithmetic by `kpiDefinitions.bl53.test.ts` |
| Supplier filters: certificate validity, performance band, country (REQ-E03-01 BR-05) | `src/services/sourcing/supplierFilters.ts` |
| 3PL list, tracking address rule and tracking link (REQ-E07-04 BR-05) | `src/services/transitions/threePlStore.ts`, verb `t_threepl_set` |
| Spreadsheet number and batch checks (CR-18, CR-19) | `src/lib/localeNumber.ts`, stock upload validation |
| Integration retry classes (CR-20) | `src/services/transitions/settleFaults.ts` |

### 3.1 Compliance gate demo scenarios

Sample data (BL-64) so a buyer can see every CR-23 outcome on the sourcing pages (`/buyer/sourcing`, then an RFQ). The five sample RFQs are titled "Compliance gate demo — … (sample)"; the suppliers marked "(illustrative)" exist only for this demo. Fixtures: `src/services/data/mock/fixtures/gateDemo.ts`; each row is pinned by name in `gateDemo.test.ts`. Demo date: the declared present, 31 Aug 2026.

| Scenario | RFQ | Supplier | Gate result |
|---|---|---|---|
| Halal certificate expired (the day before the demo date) | RFQ-2026-016 (Closed) | sup-018 PT Sample Raw Material Surabaya | Fails: halal |
| Halal certificate expires on the demo date (still valid) | RFQ-2026-016 | sup-017 PT Sample Halal Raw Material Jakarta | Passes |
| Halal certificate missing | RFQ-2026-016 | sup-009 Sample Vitamins Co. | Fails: halal |
| GMP / ISO 22716 missing on a raw material | RFQ-2026-016 | sup-013 PT Sample Preform Works | Fails: GMP |
| Mixed pass and fail; split award among passing suppliers | RFQ-2026-016 | sup-001 and sup-017 (e.g. 60 / 40) | Award recorded; a line naming sup-018 is refused |
| BPOM missing where BPOM applies | RFQ-2026-017 (Closed) | sup-016 PT Sample Active Ingredient Indonesia | Fails: BPOM |
| Registry row valid, supplier master holds no halal certificate | RFQ-2026-017 | sup-005 (registry row creg-0015) | Passes |
| Several criteria at once | RFQ-2026-017, RFQ-2026-020 | sup-011 (halal, BPOM, GMP); sup-004 (halal, BPOM) | Fails |
| Registry row expired, supplier master says valid | RFQ-2026-018 (Open, still collecting quotes) | sup-002 (registry row creg-0017) | Fails: halal |
| OTIF exactly at the 80% minimum (4 of 5 call-offs) | RFQ-2026-019 (Closed) | sup-019 PT Sample Preform Bekasi | Passes |
| OTIF just below the minimum (11 of 14, shown 79%) | RFQ-2026-019 | sup-020 PT Sample PET Bottle Karawang | Fails: OTIF |
| Suspended | RFQ-2026-019 | sup-021 PT Sample Packaging Medan | Fails: status |
| Blacklisted | RFQ-2026-019 | sup-022 PT Sample Closures Batam | Fails: status |
| Material needing no certificate (packaging); no certificates and no OTIF history | RFQ-2026-019 | sup-011 Sample Salicylics & Niacinamide Ltd. | Passes |
| Every bidder fails; award impossible, and the page says so | RFQ-2026-020 (Closed) | sup-011, sup-004, sup-009 | No award possible |

Earlier demo rows still hold: RFQ-2026-003 (sup-010 halal expired), RFQ-2026-014 (sup-007 OTIF 50%, sup-008 OTIF 0%, sup-013 no history), RFQ-2026-004 (sup-004 halal and BPOM). The OTIF figures are calculated from sample call-offs and goods receipts (PO-2026-00191, PO-2026-00192), not typed in. Suspended and blacklisted suppliers cannot be invited; sup-021 and sup-022 represent a status change after the quote.

### 3.2 3PL tracking link and supplier filter demo cases (BL-51, BL-52)

The 3PL list is a sample list (four illustrative 3PLs on the reserved `.example` domain, so the links cannot be opened); it is kept on **Administration → 3PL tracking links** (`/buyer/admin/3pl-tracking`, user menu). Each case is pinned by name in `threePl.bl51.test.ts` and `supplierFilters.bl52.test.ts`. Demo date: the declared present, 31 Aug 2026.

| Case | Where to see it | Sample record | Result |
|---|---|---|---|
| ASN names a listed 3PL | Supplier Shipments & ASN (sup-007); PTI Shipments & ASN opened from the Order summary for PO-2025-00107 | ASN-2025-00211, ASN-2025-00198 | Tracking number is a link to the 3PL's page, new tab |
| ASN names a 3PL no longer offered | PTI Shipments & ASN for PO-2025-00116 | ASN-2025-00301 (sup-002) | Still a link; the 3PL is not offered on new ASNs |
| ASN names a 3PL the list does not hold | Supplier Shipments & ASN; PTI Goods receipts (ASN discrepancies); PTI Shipments & ASN for PO-2025-00107 | ASN-2025-00201 | Plain text |
| ASN names no 3PL (carrier typed by name) | PTI Shipments & ASN for PO-2025-00131 | ASN-2025-00302 (sup-005) | Plain text, although the typed name matches a listed 3PL |
| Certificates valid | Supplier list, invitee search | sup-001 | Valid |
| Certificates expiring within 90 days | Supplier list, invitee search | sup-017 (expires on the demo date), sup-003 | Expiring |
| Certificates expired or missing | Supplier list, invitee search | sup-018 (expired), sup-008 (none on file), sup-007 (BPOM under review), sup-002 (registry row missing) | Expired or missing |
| Performance band A to D and "No history" | Supplier list, invitee search | A sup-016 · B sup-019 · C sup-020 · D sup-001 · No history sup-006 | Band as shown |
| Country | Supplier list, invitee search | DE: sup-005 (active), sup-012 (suspended, never invitable) | Filtered |

The PTI Shipments list itself holds sample shipment records that name no 3PL, so their tracking numbers stay plain text; a shipment borrows its ASN's link only when both carry the same tracking number.

sup-016's A band comes from two sample call-offs received on time and in full (PO-2026-00193, CO-2026-0033 and 0034, GR-2026-109 and 110); its compliance-gate result is unchanged.

---

## 4. Prototype features that were kept or parked

| ID | Feature | Outcome |
|---|---|---|
| K-01 | Goods receipt quality inspection | Kept for PTI; the supplier sees the result and rejected quantity only. Boundary with the Phase 2 Supplier Quality module is still open (Q-20) |
| K-02 | Stock by batch with expiry | Kept as template columns and manual batch rows, now with an optional manufacturing date |
| K-03 | Stock recorded by PTI from a WhatsApp or email reply | Kept, labelled "Entered by PTI" |
| K-04 | Distributor principal lead times | Kept, feeding supplier coverage |
| K-05 | Should-cost model | Parked, hidden from the menu |
| K-06 | Purchase requisitions, intake review, plan grid | Parked; the RFQ-from-requisition path is kept |
| K-07 | Compliance tracker and supplier documents | Handed to the Foundation team; hidden from the menu |
| K-08 | Marketplace, discovery, storefront, supply risk, contracts | Parked, hidden from the menu |
| K-09 | Roles catalogue, process flows, glossary | Moved to the user menu |
| K-10 | Acknowledge-only forecast lines, dispute log, draft before submit | Kept in forecast collaboration |

### 3.2 Risk class demo scenarios (BL-46)

Sample data so a planner can see every CR-24 outcome on `/buyer/inventory`, `/supplier/inventory` and `/buyer/alerts`. Lead times are sample master data per supplier × material in `src/services/data/mock/fixtures/inventoryHub.ts` (`SUPPLIER_LEAD_TIME_DAYS`); the real figure would come from the supplier master. Days of cover here come from the planning estimate, so they do not move with the clock. Each row is pinned by name in `leadTimeRisk.test.ts`.

**Boundary convention:** "below" is strict at both cuts. Cover exactly at the lead time is Medium; cover exactly at 1.5 × the lead time is Low.

| Scenario | Supplier | Material | Days of cover | Lead time | Risk class and basis shown |
|---|---|---|---|---|---|
| High: cover below lead time | sup-002 PT Sample Specialty Fats | RM-STEAR-7300 | 10 | 21 | High · Lead time 21 days |
| Medium: between 1 × and 1.5 × | sup-007 PT Sample Packaging Indonesia | PK-PETB-8801 | 17 | 14 | Medium · Lead time 14 days |
| Low | sup-008 PT Sample Carton Packaging | PK-CART-9901 | 44.99 (shown as 44) | 14 | Low · Lead time 14 days |
| Exactly 1 × | sup-009 Sample Vitamins Co. | AI-VITC-6730 | 25 | 25 | Medium · Lead time 25 days |
| Exactly 1.5 × (was Critical under the old day bands) | sup-006 Sample Specialty Chemicals France | AI-VITC-6720 | 12 | 8 | Low · Lead time 8 days |
| No lead time: fallback to the CR-02 bands | sup-010 PT Sample Halal Emulsifiers | RM-EMUL-9430 | 6 | none | High · No lead time · day bands: Critical, and a "lead time missing" alert on `/buyer/alerts` (not shown to the supplier) |

---

## 5. What is still not built

- **SAP ROP replenishment recommendations** (X-16, REQ-E09-01): waiting on the replenishment-method decision (REPL).
- **Event-based strategy analysis** (X-17, REQ-E09-02): waiting on PQ-09.
- **Supplier access to the TMS** (X-21, REQ-E13-01): decided out of the MVP (D-03); the 3PL tracking link covers delivery tracking (X-27).
- **Any real integration.** SAP, supplier APIs and the TMS are simulated. POs, goods receipts and invoice status are sample data, not inbound messages.
- **Email and other notifications.** Alerts and reminders appear in the hub only; nothing is sent.
- **File attachments.** RFI attachment questions, receipt-dispute attachments and the e-Faktur are recorded as file names; no file is stored.
- **Sourcing event creation beyond the central library** (A-04): no sourcing request intake, no save-as-template, no admin screen for the question and term library, no approval step before sending. All four were ruled out of the MVP rather than left undone.
- **A backend.** No database, no sign-in for real users, no scheduled jobs; changes are lost on reload. The pilot needs all of these (PRD section 4).
- **Accessibility testing with assistive technology** (H-03): the BL-31 pass below was done with automated checks and the keyboard; no session with a real screen reader or real users has been run.
- **The rest of the administration screen** (BL-32): reason codes, tolerances, alert thresholds and stale periods still live in configuration files. The working calendar is its first page and is built.
- **The real SAP factory calendar.** The calendar load is simulated sample data; the administrator's rulings are kept in the browser only.
- **Foundation epics** E01 and E02 (registration, onboarding, supplier master data), which belong to the Foundation team.

---

## Accessibility (BL-31)

Target: SC-06 and SC-07, WCAG 2.1 AA. Pass done on 2026-09-21 against the built app.

**What was checked.** Every route in `src/router/AppRouter.tsx`, both personas and in English and Indonesian, with a script run in the browser: controls without an accessible name, form fields without a label, positive `tabindex`, focusable content inside `aria-hidden`, dialogs without a name, tables without header cells, clickable elements that the keyboard cannot reach, heading order, landmarks, the page `lang`, and the contrast of every visible text node against its real background. The drawers and dialogs on the main walkthrough pages (PO, ASN, goods receipt, invoice, call-off, RFQ, requisition, delivery agreement, stock entry, the RFQ, RFI, RFP and goods-receipt wizards) were opened and checked the same way. Focus order, the focus trap, Escape and focus return were checked with real key presses on the PO drawer and the RFQ wizard.

**What was fixed.**

| Issue | WCAG | Severity | Fix |
|---|---|---|---|
| List rows (PO, ASN, goods receipt, invoice, contract, delivery agreement, requisition, RFQ, supplier, role) opened a record only on a mouse click | 2.1.1 | High | A clickable row is a tab stop and opens on Enter or Space, with a visible focus ring (shared `TableRow`) |
| Drawers did not take focus, so the keyboard stayed on the page behind them; drawers had no name | 2.4.3, 4.1.2 | High | Shared modal behaviour: focus moves in, Tab stays inside, Escape closes, focus returns to the opener; the drawer is named by its title |
| The five wizards and two confirmation dialogs were a plain overlay: no dialog role, no name, no Escape, Tab left the dialog | 2.1.2, 2.4.3, 4.1.2 | High | One shared modal overlay with the same behaviour; wizard step buttons are named "Step 2 of 4: …" |
| Tertiary text failed contrast on the page background, the table header band and the status tints (3.8 to 4.4 : 1) | 1.4.3 | High | Tertiary text token darkened; it now passes on every surface it sits on |
| Teal used as text (3.5 : 1) and action blue as text on tinted or grey backgrounds (4.0 to 4.4 : 1), including the outline button label | 1.4.3 | Medium | Text uses the darker arm of each colour, as warning already did; chart legend text and the planning grid header re-coloured |
| Form captions were not tied to their fields (a separate label element with no link), so fields had no name | 1.3.1, 4.1.2 | Medium | Caption wraps the field on the ASN, PO acknowledge, RFQ quote, requisition, contract, storefront, goods-receipt and registration forms; registration errors are tied to their field |
| Search boxes named only by their placeholder; the top bar search had no name | 3.3.2, 4.1.2 | Medium | Every search box has a name |
| No way to skip the top bar and menu | 2.4.1 | Medium | "Skip to main content" link |
| Toasts could go unannounced (the live region appeared with the first toast) | 4.1.3 | Medium | The region is always present; error toasts interrupt |
| Menu, persona switch and period switch did not state their name or selected state; tabs had no arrow keys; "New call-off" repeated with no context | 1.3.1, 2.4.6, 4.1.2 | Low | Named navigation and groups, pressed state, arrow keys on tabs, each call-off button described by its PO and supplier |
| A page title squeezed to zero width on a narrow window | 1.4.10 | Low | The page header wraps |

**What remains.**

| Issue | WCAG | Severity |
|---|---|---|
| Field errors are announced but tied to their field only on the registration, forecast response and intake adjustment forms | 1.3.1, 3.3.1 | Medium |
| Action blue as text still passes only on white (4.57 : 1); any new use on a grey or tinted background fails. The sites are the `text-action` classes in `src/` (derive them; the in-browser check found none failing after this pass) | 1.4.3 | Low |
| Some pages go from the page title straight to a level-3 heading (marketplace, discovery, storefront, WhatsApp demo, supplier comm hub, supplier shipments) | 1.3.1 | Low |
| Controls inside a few table grids have no name of their own (contract wizard obligation owner and due date, WhatsApp demo input) | 4.1.2 | Low |
| The menu button in the top bar does nothing; the notification button does not say how many notifications there are | 4.1.2 | Low |
| The sign-in page (outside the hub shell) keeps its own dark design: low-contrast text, no page heading, English-only notice | 1.3.1, 1.4.3 | Low (not part of the hub) |
| The 404 page title is English in both languages | 3.1.2 | Low |
| No test with a real screen reader (see H-03 in section 5) | — | — |

The checks that guard the fixes are in `src/lib/a11yGate/` (every icon-only button is named; every clickable table row is keyboard-operable) and `src/components/ui-v2/bl31Keyboard.test.tsx` (the modal keyboard behaviour, row activation and the accessible names of the shared building blocks).

---

## 6. Other documents in this repository

These documents describe how the prototype was designed. For Supplier Hub product scope, `SUPPLIER-HUB-PRD.md` and `SUPPLIER-HUB-REQUIREMENTS.md` are the reference. Where they disagree, the Supplier Hub documents win. The documents below are kept unchanged as engineering history.

| Document | Relation to the Supplier Hub documents |
|---|---|
| `docs/Delivery_Agreement_Design_Spec_v1.md`, `docs/Delivery_Agreement_and_Contract_Compliance_Chase_Design_Note_v1.md` | The scheduling-agreement model is replaced by hub call-offs (REQ-E09-03). Its calculations survive as CR-04 to CR-09 |
| `docs/Supplier_Data_Collaboration_Design_v2.md`, `docs/C8_Forecast_Publication_Seam_Proposal.md`, `docs/contracts/C8-forecast-publication.md` | Forecast and stock design, replaced by REQ-E06-01 to REQ-E06-03 and REQ-E08-02 |
| `docs/PR_Intake_Review_Investigation_2026-07-15.md`, `docs/contracts/C7-pr-intake.md`, `docs/Stage_G_Grid_Planning_Layer_Plan_v1.md` | Parked features (K-06) |
| `docs/Halal_Compliance_Control_Design_v1.md` | Foundation hand-off (K-07); halal checks at receipt kept (K-01) |
| `docs/Communication_Hub_Design_Skeleton_v1.md` | Supports K-03 |
| `docs/Supplier_Portal_*_Plan_*.md`, `Paragon_World_Class_Build_Plan_v1.md`, `docs/Paragon_Platform_Strategic_Spine_v1.md` | Prototype build sequencing, not product requirements |
| `CLAUDE.md`, `docs/findings.md`, `docs/contracts/` (others) | Engineering rules and records for the prototype codebase. `C1-methods.md` and `C5-seams.md` carry counts that the build updates as verbs are added |
