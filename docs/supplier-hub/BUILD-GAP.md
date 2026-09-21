# Supplier Hub: Prototype Build Gap

| | |
|---|---|
| Version | 2.4, 2026-09-21 |
| Compares | `SUPPLIER-HUB-REQUIREMENTS.md` v0.5 with the prototype on branch `feat/supplier-hub-mvp` (pull request "Supplier Hub MVP build") |
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
| REQ-E03-01 Supplier filtering | Built | Category and purchasing group filters; OTIF or "No history"; suspended, deactivated and blacklisted suppliers cannot be invited |
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
| REQ-E07-04 ASN | Built | Shipped quantity per line capped at the open quantity unless a reason is given, batch, ship date, required fields, several ASNs per PO, cancellation |
| REQ-E07-05 Shipping notice | Built | Expected completion date per PO; the first ASN records shipment started; a later date raises a PTI task |
| REQ-E07-06 Goods receipt | Partial | Supplier page with shipped, received and rejected quantity, QC result, discrepancy flag, acknowledge or dispute, PTI resolution. Receipts are still created in the hub rather than read from SAP, because there is no SAP feed; dispute attachments are not built |
| REQ-E07-07 Invoice | Built | Built from received goods receipts, supplier's own invoice number and date, e-Faktur file name, duplicate and over-invoicing refused, CR-12 and CR-13 matching at submission, status list with correct-and-resubmit, CR-14 due date |
| REQ-E07-08 SAP interface | Partial | Interface monitor with last successful arrival, failed messages and CR-20 retry, plus the data-age banner. The feeds themselves are simulated; the real interface technology is PQ-06 |
| REQ-E08-01 Inventory visibility | Built | Supplier and PTI stock and reorder points, incoming split into in production and in transit with its detail, days of supply with one band scale, last update and stale flag. No "available" figure. Raw material and packaging are separate on the PTI view; on the supplier view they are one list, split only for a supplier that supplies both (BR-07, BL-61) |
| REQ-E08-02 Stock submission | Built | One stock entry point, on the Stock page: the template and manual entry carry the same fields, including an optional manufacturing date per batch (not after expiry, not in the future), with row-by-row upload validation (BR-06, BR-09, BL-60). The Forecast page's old batch grid and free-form import are retired; its Stock tab now links to the Stock page. In-transit quantity is shown read-only beside in production on both methods, from ASNs and dispatched call-offs (BR-10). An API-connected supplier presses Sync on its own Stock page, and a PTI user can still sync on its behalf; the connection is simulated, with a failure path that keeps the previous figures marked out of date (BR-03, BL-59). A supplier with PTI stock access can refresh PTI stock for the granted materials only; without access the option is absent (BR-11). Stock recorded by PTI on a supplier's behalf |
| REQ-E08-03 Supplier access to PTI stock | Built | Grant, change and remove per supplier and per material, with a log; a supplier without access never receives PTI stock data |
| REQ-E08-04 Capacity | Built | 13 weekly buckets per material group, "Extra capacity if requested" with a one-line explanation on both sides (BR-05, BL-62), reason required below demand, gap weeks highlighted for the planner, planner filters by supplier, material group, material and gap weeks only, kept in the page address and combined with the Order summary filter (BR-07, BL-63), and the Order summary capacity status |
| REQ-E08-05 Alerts | Built | Rules for PTI and supplier stock against reorder point, projected stock-out, capacity gap, stale data, coverage and commitment below forecast; High / Medium / Low; no duplicates; grouped per supplier; closed with an action note. Delivery is in the hub only, not by email |
| REQ-E09-01 Replenishment recommendation | Partial | Planner releases call-offs against the remaining umbrella PO quantity and value, and can generate a series. The SAP ROP recommendation list is not built (X-16) |
| REQ-E09-02 Event-based analysis | Not built | Waiting on PQ-09 |
| REQ-E09-03 Call-off confirmation | Built | Hub-owned call-offs, the six confirmation statuses, CR-05 tolerance, planner approval outside tolerance, 1-working-day deadline on the hub working calendar with escalation, ASN allowed only on a confirmed call-off |
| REQ-E09-04 Delivery execution | Built | Dispatch heads-up or a linked ASN, At Risk when the expected arrival is after the need date, reminders. No dock or slot booking |
| REQ-E10-01 CFOT and OTIF | Built | Calculated per PO and per call-off from hub data with working period filters, rejections counted, grade bands stated on screen, "No history" where nothing is measurable. Other scorecard measures stay sample figures and are marked as such |
| REQ-E13-01 TMS access | Not built | Waiting on D-03 |
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
| X-21 | TMS access | Not built — waiting on D-03 |
| X-22 | One stock entry (BL-60): same fields on template and manual entry, manufacturing date, read-only in-transit, Forecast page stock grid retired | Done (inventory feedback) |
| X-23 | Supplier-triggered stock sync and PTI stock refresh for granted materials (BL-59) | Done (inventory feedback), simulated until the backend |
| X-24 | One list on the supplier inventory view (BL-61) | Done (inventory feedback) |
| X-25 | Capacity "Extra capacity if requested" label (BL-62) | Done (inventory feedback) |
| X-26 | Planner capacity filters in the page address (BL-63) | Done (inventory feedback) |
| X-27 | Hub working calendar and the first administration page (BL-50) | Done |
| X-28 | Forecast commitment deadline, CR-26 (BL-48) | Done |

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
| U-13 | One OTIF target of 90% | Done (phase 1) |
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
| Call-off tolerance, matching, on time, in full, reminders (CR-05 to CR-09) | `src/services/transitions/callOffRules.ts`, `callOffTolerance.ts` |
| Days of supply, bands, coverage, stale, alert risk class (CR-01 to CR-03) | `src/services/data/` inventory rules with `inventoryConfig.ts` |
| Forecast periods, zones, commitment tolerance, gap colours (CR-21, CR-22) | `src/services/transitions/forecastRules.ts` with `forecastConfig.ts` |
| Commitment deadline, time left and late (CR-26) | `src/services/transitions/forecastRules.ts` (`commitmentDueAt`, `commitmentTiming`) with `forecastConfig.ts` |
| Goods receipt result, invoice matching, due date (CR-11 to CR-14) | `src/services/transitions/grRollup.ts`, `invoiceRollup.ts`, invoice projection |
| Quote score and currency rule (CR-15, CR-16) | `src/lib/quoteScore.ts`, `src/lib/fxPin.ts` |
| Compliance gate (CR-23) | `src/services/sourcing/complianceGate.ts`, values in `complianceGateConfig.ts` |
| CFOT, OTIF, rejections, score and grade (CR-17) | `src/services/data/performanceRules.ts` |
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

---

## 5. What is still not built

- **SAP ROP replenishment recommendations** (X-16, REQ-E09-01): waiting on the replenishment-method decision (REPL).
- **Event-based strategy analysis** (X-17, REQ-E09-02): waiting on PQ-09.
- **Supplier access to the TMS** (X-21, REQ-E13-01): waiting on the phase decision (D-03).
- **Any real integration.** SAP, supplier APIs and the TMS are simulated. POs, goods receipts and invoice status are sample data, not inbound messages.
- **Email and other notifications.** Alerts and reminders appear in the hub only; nothing is sent.
- **File attachments.** RFI attachment questions, receipt-dispute attachments and the e-Faktur are recorded as file names; no file is stored.
- **Sourcing event creation beyond the central library** (A-04): no sourcing request intake, no save-as-template, no admin screen for the question and term library, no approval step before sending. All four were ruled out of the MVP rather than left undone.
- **A backend.** No database, no sign-in for real users, no scheduled jobs; changes are lost on reload. The pilot needs all of these (PRD section 4).
- **Accessibility testing** (H-03).
- **The rest of the administration screen** (BL-32): reason codes, tolerances, alert thresholds and stale periods still live in configuration files. The working calendar is its first page and is built.
- **The real SAP factory calendar.** The calendar load is simulated sample data; the administrator's rulings are kept in the browser only.
- **Foundation epics** E01 and E02 (registration, onboarding, supplier master data), which belong to the Foundation team.

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
