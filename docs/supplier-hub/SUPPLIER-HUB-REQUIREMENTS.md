# Supplier Hub Requirements

| | |
|---|---|
| Version | 0.3 draft, 2026-09-17 |
| Sources | `SUPPLIER-HUB-BASELINE.md` (kick-off deck, Aug 2026); `KICKOFF-MEETING-NOTES.md` (business user feedback, reviewed 2026-09-17) |
| Scope of this version | Detailed: Order Collaboration, Inventory & Capacity Collaboration, RFx (validated); Forecast Collaboration, Call-off Management, and the undiscussed parts of Order and Inventory Collaboration (proposed). Foundation is reserved for the Foundation team. The remaining epics are stubs |
| Not in scope | The codebase. This file states what the Supplier Hub must do, not what is built |

---

## 1. How to read this file

### 1.1 Status of a requirement

| Status | Meaning | Can build start? |
|---|---|---|
| **Validated** | Discussed with business users and confirmed by the project owner | Yes |
| **Proposed** | Written by the analyst from market practice and the deck. Not yet reviewed by business users | After business review |
| **Stub** | Named in the deck, not yet detailed | No |
| **Reserved** | Another contributor owns the detail (see section 1.4) | No, until merged |

### 1.2 Source tags

Every business rule and acceptance criterion ends with its source, so a reader can tell confirmed facts from design choices.

| Tag | Meaning |
|---|---|
| `[MN-ORD-06]` | Meeting note ID in `KICKOFF-MEETING-NOTES.md`, confirmed by the owner |
| `[Deck p.7]` | Kick-off deck page |
| `[Proposed]` | Analyst design choice, needs business review |
| `[Market]` | Common practice in current supplier-collaboration products, see section 8 |

A Validated requirement can still contain `[Proposed]` details, such as a field name or an edge-case handling that nobody discussed. Those details need review even though the requirement is validated.

### 1.3 Requirement template

Every requirement uses this structure, in this order. Contributors (section 1.4) use the same structure.

```
#### REQ-Exx-nn  <Name>

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| <baseline IDs; meeting note IDs> | MVP / Phase 2 / Phase 3 | P0 / P1 / P2 | <team> | <persona codes> | Validated / Proposed / Stub |

**Business value.** <problem solved, for whom, and which KPI or deck challenge it moves. 2 to 4 sentences>

**Experience.** <what each user sees and can do, per persona. Short bullets>

**Step-by-step.** <numbered walkthrough from one persona's chair, with a concrete situation>

**Business rules.** <numbered BR-nn rules, each with a source tag>

**Edge cases.** <bullets: situation, then the required handling, each with a source tag>

**Acceptance criteria.** <numbered AC-nn, each checkable as pass or fail>

**Data and integration.** <objects, key fields, system of record, direction of flow>

**Metrics.** <leading and lagging measures, linked to KPI IDs>

**Open items.** <questions or decisions still pending, with IDs>
```

IDs: `REQ-` + baseline epic ID + 2-digit sequence, such as `REQ-E07-02`. Business rules and acceptance criteria are numbered inside each requirement (`BR-01`, `AC-01`), so their full reference is `REQ-E07-02 / BR-03`.

### 1.4 Contributor sections

| Section | Epics | Owner | ID range | Merge rule |
|---|---|---|---|---|
| 5.1 Foundation | E01 Supplier Registration & Onboarding; E02 Supplier Master Data Management | Foundation team (Vergi is PIC on the deck, p.9) | `REQ-E01-nn`, `REQ-E02-nn` | Produced with `prompts/foundation-requirements-contribution.md`. Replace section 5.1 with the contribution's section 5.1; replace the Foundation row in section 4 with its index rows; append its open items to section 7, its glossary rows to section 3.5, and its source notes register to `KICKOFF-MEETING-NOTES.md` |

---

## 2. Users

| Code | Persona | Organisation | What they do in the hub |
|---|---|---|---|
| MP | Material Planner | PTI | Owns forecast, order, inventory, and call-off collaboration; manages supplier access to PTI stock [Deck p.12; MN-INV-12] |
| BUY | Buyer | PTI Procurement | Runs RFI, RFQ, RFP events; owns supplier onboarding, contract, catalog [Deck p.12] |
| FIN | Accounts Payable | PTI Finance | Owns invoice collaboration [Deck p.12] |
| MDM | Master Data steward | PTI Master Data | Validates supplier-submitted data [Deck p.12] |
| LEG | Legal reviewer | PTI Legal | Validates supplier documents and contracts [Deck p.12] |
| SUP | Supplier user | Supplier (raw material or packaging) | Confirms POs, submits stock, capacity, ASN, quotations |
| ADM | Hub administrator | PTI IT | Configures reason codes, templates, calendars, integrations [Proposed] |

PTI = PT Paragon Technology and Innovation.

---

## 3. Shared concepts

### 3.1 PO and call-off

- A **PO** is an umbrella PO with a long horizon. A **call-off** manages each delivery under it. The hub treats them as separate objects [MN-ORD-01].
- The PO and its quantity and timing breakdown come from SAP [MN-ORD-03].
- In SAP, the umbrella PO holds the overall ordered value. Call-offs are not in SAP: today they are managed manually outside SAP [PQ-01, owner 2026-09-17].
- So the hub is where call-offs are created and managed, and SAP only knows the umbrella PO, goods receipts, and invoices [Proposed, follows from PQ-01; see PQ-11].

### 3.2 The 3 confirmations

When a supplier confirms a PO, it gives 3 confirmations. Each one lives in its own menu. The Order Collaboration Summary shows all 3 [MN-ORD-10 to MN-ORD-13].

| Confirmation | Question the supplier answers | Menu that owns the page | Requirement |
|---|---|---|---|
| Capacity | Can I allocate production for this? | Inventory & Capacity Collaboration | REQ-E08-04 |
| Foresight / fixed stock | For PTI's shared plan, what quantity and date can I meet? | Forecast Collaboration | REQ-E06-02 |
| Shipping notice | Has shipment started, and when will it complete? | Order Collaboration | REQ-E07-05 |

### 3.3 Performance measures

| Measure | Full name | Measured per | Shown in | Source |
|---|---|---|---|---|
| CFOT | Casefill On-Time | PO, per supplier | Supplier performance dashboard [Proposed] | MN-ORD-07 |
| OTIF | On-Time In-Full | Call-off | Supplier performance dashboard; supplier sourcing | MN-ORD-09 |

### 3.4 Working day

The supplier response deadline is 1 working day [MN-ORD-04]. Which calendar defines working days is open (Q-18). Until decided, the hub uses a configurable calendar maintained by ADM [Proposed].

### 3.5 Glossary additions

| Term | Meaning | Source |
|---|---|---|
| SOH | Stock on hand | MN-INV-03 |
| ROP | Reorder point. Sourced from SAP | MN-INV-02, MN-INV-14 |
| Consignment material | Material under a consignment ("modal sharing") arrangement | MN-INV-10 |
| Spreadsheet template upload | Called "EDI" by business users. A file upload, not EDIFACT or X12 | MN-INV-07 |
| TMS | Transportation management system | MN-INV-13 |

---

## 4. Requirement index

| ID | Name | Epic | Phase | Status |
|---|---|---|---|---|
| REQ-E01-nn, REQ-E02-nn | Foundation | E01, E02 | MVP | Reserved |
| REQ-E03-01 | Supplier filtering for sourcing events | E03 | MVP | Validated |
| REQ-E03-02 | Request for Information (RFI) | E03 | MVP | Validated |
| REQ-E03-03 | Request for Quotation (RFQ) with RFI reuse | E03 | MVP | Validated |
| REQ-E03-04 | Request for Proposal (RFP) | E03 | MVP | Validated |
| REQ-E03-05 | Sourcing request, bid comparison, negotiation, awarding | E03 | MVP | Stub |
| REQ-E06-01 | Forecast publication | E06 | MVP | Proposed |
| REQ-E06-02 | Foresight / fixed-stock confirmation | E06 | MVP | Proposed (confirmation concept validated) |
| REQ-E06-03 | Forecast-commit gap monitoring | E06 | MVP | Proposed |
| REQ-E07-01 | PO visibility with quantity and timing breakdown | E07 | MVP | Validated |
| REQ-E07-02 | PO response: approve, adjust, reject, escalate | E07 | MVP | Validated |
| REQ-E07-03 | Order Collaboration Summary | E07 | MVP | Validated |
| REQ-E07-04 | Advanced shipping notice | E07 | MVP | Validated (shipping notice); Proposed (ASN detail) |
| REQ-E07-05 | Shipping notice confirmation | E07 | MVP | Validated |
| REQ-E07-06 | Goods receipt confirmation | E07 | MVP | Proposed |
| REQ-E07-07 | Invoice collaboration | E07 | MVP | Proposed |
| REQ-E07-08 | Order data interface with SAP | E07 | MVP | Proposed |
| REQ-E08-01 | Inventory visibility | E08 | MVP | Validated |
| REQ-E08-02 | Supplier stock submission | E08 | MVP | Validated |
| REQ-E08-03 | Supplier access to PTI stock | E08 | MVP | Validated |
| REQ-E08-04 | Capacity confirmation | E08 | MVP | Proposed (confirmation concept validated) |
| REQ-E08-05 | Inventory and capacity alerts | E08 | MVP | Proposed |
| REQ-E09-01 | Replenishment recommendation from SAP ROP | E09 | MVP | Proposed (SAP source validated) |
| REQ-E09-02 | Event-based strategy analysis | E09 | MVP | Proposed |
| REQ-E09-03 | Call-off release and supplier confirmation | E09 | MVP | Proposed |
| REQ-E09-04 | Delivery execution: need date and dispatch heads-up | E09 | MVP, P1 | Proposed |
| REQ-E10-01 | CFOT and OTIF measurement | E10 | MVP | Validated (definitions); Proposed (formulas) |
| REQ-E13-01 | Supplier access to TMS shipment tracking | E13 | Phase decision open (D-03) | Validated |
| E04, E05, E11, E12, E13 (other) | Contract, Catalog, Reporting, API ERP, Shipment Aggregator | | Phase 2 or MVP per deck | Stub |

---

## 5. Detailed requirements

### 5.1 Foundation (reserved)

Reserved for the Foundation team: E01 Supplier Registration & Onboarding and E02 Supplier Master Data Management. The deck scope for these epics is in `SUPPLIER-HUB-BASELINE.md`, section 3.1. The hub replaces PROCIO for these epics (owner decision, 2026-09-17), so the contribution must cover migration of supplier data from PROCIO.

### 5.2 Sourcing & Contracting: RFx Management (E03)

#### REQ-E03-01  Supplier filtering for sourcing events

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.02; MN-RFX-01, MN-ORD-09 | MVP | P1 [Proposed] | Procurement | BUY | Validated |

**Business value.** Buyers today pick invitees by memory or spreadsheet, so the same few suppliers get invited and performance is ignored [Deck p.3, C4]. Filtering by commodity, purchasing group, and performance makes invitations consistent and puts OTIF to use in sourcing decisions. Moves KPI-06 procurement cycle time.

**Experience.**
- BUY: while building an RFI, RFQ, or RFP, opens "Invite suppliers", filters the supplier list, sees each supplier's OTIF next to its name, and selects invitees.

**Step-by-step (Buyer, sourcing a new packaging material).**
1. The buyer creates an RFQ and opens the invitation step.
2. The buyer filters by commodity "Plastic bottle" and purchasing group.
3. The list shows matching active suppliers with their OTIF [MN-ORD-09].
4. The buyer adds 1 more filter from the parameter list (to be provided, A-02).
5. The buyer selects 5 suppliers and moves to the next step.

**Business rules.**
- BR-01. Filters include at least commodity and purchasing group [MN-RFX-01].
- BR-02. The full filter parameter list is provided by Procurement later [MN-RFX-01; A-02].
- BR-03. Supplier OTIF is visible during supplier sourcing [MN-ORD-09].
- BR-04. Only active suppliers are selectable. Blacklisted or deactivated suppliers are hidden [Proposed; Deck p.7 E02.03].

**Edge cases.**
- A supplier has no OTIF history yet: show "No history" instead of 0% [Proposed].
- No supplier matches the filters: show an empty state with the active filters and a clear-filters action [Proposed].

**Acceptance criteria.**
- AC-01. A buyer can filter invitees by commodity and by purchasing group, alone or combined.
- AC-02. Each listed supplier shows its OTIF, or "No history".
- AC-03. Blacklisted and deactivated suppliers do not appear in results.

**Data and integration.** Supplier master (commodity, purchasing group, status) from the Foundation epics. OTIF from REQ-E10-01. Purchasing group from SAP MM [Proposed].

**Metrics.** Leading: share of events whose invitees were chosen through filters. Lagging: KPI-06.

**Open items.** A-02 (full parameter list). A-01 (compliance and capability check with Mas Ary Hidayat).

#### REQ-E03-02  Request for Information (RFI)

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.02; MN-RFX-02, MN-RFX-03, MN-RFX-04 | MVP | P1 [Proposed] | Procurement | BUY, SUP | Validated |

**Business value.** Before asking for prices, buyers need to know what a supplier can make, where, and how. A structured RFI replaces ad-hoc email questionnaires [Deck p.3, C2] and creates reusable supplier capability data for later RFQs.

**Experience.**
- BUY: creates an RFI asking for capability, experience, facilities, and products; reviews responses side by side.
- SUP: receives the invitation, fills in capability, experience, facility, and product entries with descriptions, and submits.

**Step-by-step (Supplier, responding to an RFI).**
1. The supplier opens the RFI invitation from its task list.
2. The supplier describes its capabilities and relevant experience [MN-RFX-02].
3. The supplier adds its facilities, each with a description [MN-RFX-03].
4. The supplier adds its products as catalog entries, each with a description [MN-RFX-03].
5. The supplier submits before the deadline. The buyer sees the response in the RFI comparison view.

**Business rules.**
- BR-01. An RFI asks for the vendor's capability and experience, and for the product or service specifications it offers [MN-RFX-02].
- BR-02. RFI output is structured as capability, facility, and product (product catalog), each with a description [MN-RFX-03].
- BR-03. An RFI is not a required step before an RFQ or RFP [MN-RFX-04].
- BR-04. RFI responses stay stored against the supplier so they can feed a later RFQ [MN-RFX-04].
- BR-05. An RFI carries a response deadline set by the buyer [Proposed].

**Edge cases.**
- The supplier saves a partial response: keep it as a draft, not visible to the buyer until submitted [Proposed].
- The deadline passes: the buyer can extend it for all or selected invitees [Proposed].

**Acceptance criteria.**
- AC-01. A buyer can create and send an RFI without any prior or following RFQ.
- AC-02. A supplier can submit capability, experience, facility, and product entries, each with a description.
- AC-03. Submitted product entries are stored in a form a later RFQ can select from (REQ-E03-03).

**Data and integration.** RFI event, invitee list, response with capability, experience, facility, and product lines. Product lines overlap with Catalog Management (E05), which the deck puts in Phase 2 (D-07).

**Metrics.** Leading: RFI response rate; median time to respond. Lagging: KPI-06.

**Open items.** D-07: the catalog needed by RFI is Phase 2 in the deck. A-01.

#### REQ-E03-03  Request for Quotation (RFQ) with RFI reuse

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.02, E03.03; MN-RFX-04 | MVP | P1 [Proposed] | Procurement | BUY, SUP | Validated (independence and reuse); Proposed (quotation detail) |

**Business value.** RFQs run by email today [Deck p.3, C2]. A hub RFQ collects comparable quotes in one place, and reusing RFI data saves the buyer re-typing specifications.

**Experience.**
- BUY: creates an RFQ from scratch or from an earlier RFI; sets items, quantities, and deadline; invites suppliers (REQ-E03-01).
- SUP: submits a price quote per item.

**Step-by-step (Buyer, RFQ after an RFI).**
1. The buyer opens a closed RFI and chooses "Create RFQ from this RFI".
2. The hub copies the selected product specifications and suppliers into a new RFQ draft [MN-RFX-04].
3. The buyer sets quantities, delivery terms, and the quote deadline [Proposed].
4. The buyer sends the RFQ. Suppliers submit quotes before the deadline [Deck p.7 E03.03].

**Business rules.**
- BR-01. An RFQ can be created with or without a previous RFI [MN-RFX-04].
- BR-02. When created from an RFI, the RFQ pre-fills from RFI data and the buyer can edit everything [MN-RFX-04; Proposed].
- BR-03. Suppliers cannot see other suppliers' quotes [Proposed].

**Edge cases.**
- The RFI had suppliers that should not be invited to the RFQ: the buyer removes them before sending [Proposed].

**Acceptance criteria.**
- AC-01. A buyer can create an RFQ with no RFI.
- AC-02. A buyer can create an RFQ from an RFI, and the item specifications and invitees are pre-filled.
- AC-03. A supplier cannot view another supplier's quote.

**Data and integration.** RFQ event, items, invitees, quotes. Link to source RFI.

**Metrics.** Lagging: KPI-06.

**Open items.** Bid comparison, negotiation, and awarding are REQ-E03-05 (stub).

#### REQ-E03-04  Request for Proposal (RFP)

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.02; MN-RFX-05 | MVP | P1 [Proposed] | Procurement | BUY, SUP | Validated |

**Business value.** Some purchases need commercial terms, not only a unit price. An RFP collects those terms in a comparable, auditable form.

**Experience.**
- BUY: creates an RFP listing the commercial terms to be proposed.
- SUP: responds with its proposed commercial terms.

**Step-by-step (Buyer).**
1. The buyer creates an RFP, standalone or after an RFI [MN-RFX-04].
2. The buyer lists the commercial terms required, such as payment terms, pricing validity, and delivery terms [MN-RFX-05; term examples Proposed].
3. Suppliers submit proposals, and the buyer compares them term by term [Proposed].

**Business rules.**
- BR-01. An RFP asks for commercial terms [MN-RFX-05].
- BR-02. An RFP is not a required step before or after an RFI or RFQ [MN-RFX-04].

**Edge cases.**
- A supplier proposes a term outside the listed ones: allow a free-text "other terms" field [Proposed].

**Acceptance criteria.**
- AC-01. A buyer can create an RFP with a list of required commercial terms.
- AC-02. A supplier can respond to each listed term.

**Data and integration.** RFP event, term list, proposals.

**Metrics.** Lagging: KPI-06.

**Open items.** Standard commercial term list to be supplied by Procurement.

#### REQ-E03-05  Sourcing request, bid comparison, negotiation, awarding

Stub. Deck scope: E03.01, E03.04, E03.05 [Deck p.7]. Not discussed with business users.

### 5.3 Planning & Fulfillment: Order Collaboration (E07)

#### REQ-E07-01  PO visibility with quantity and timing breakdown

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07.01; MN-ORD-01, MN-ORD-02, MN-ORD-03 | MVP | P0 [Deck p.7] | Material Planner | MP, SUP | Validated |

**Business value.** Suppliers learn about PO quantities and timings through email and spreadsheets, so confirmations are late and unreliable (below 50% confirmation reliability, deck p.5). Showing the umbrella PO with its SAP breakdown gives the supplier one reliable source to confirm against.

**Experience.**
- SUP: sees its open POs, each with the quantity and timing breakdown from SAP.
- MP: sees the same PO and the supplier's response status.

**Step-by-step (Supplier, new PO).**
1. SAP creates an umbrella PO. The hub receives it with its quantity and timing breakdown [MN-ORD-03].
2. The supplier gets a notification and opens the PO [Proposed].
3. The supplier reviews each breakdown line: quantity and date.
4. The supplier decides how to respond (REQ-E07-02).

**Business rules.**
- BR-01. The PO is an umbrella PO with a long horizon. Deliveries are managed as call-offs, not as PO lines [MN-ORD-01].
- BR-02. Quantity and timing breakdown comes from SAP. The hub does not edit it [MN-ORD-03; "does not edit" Proposed].
- BR-04. The umbrella PO in SAP carries the overall ordered value [PQ-01]. Whether it also carries a quantity per breakdown line is PQ-12.
- BR-03. A supplier sees only its own POs [MN-ORD-13].

**Edge cases.**
- SAP changes a PO after it was confirmed: show the change, and require the supplier to respond again [Proposed].

**Acceptance criteria.**
- AC-01. A new SAP PO appears in the hub with every breakdown line's quantity and date.
- AC-02. A supplier user cannot open another supplier's PO.
- AC-03. A PO changed in SAP after confirmation returns to "awaiting response".

**Data and integration.** SAP to hub: PO header, breakdown lines (quantity, date), supplier, material. See REQ-E07-08.

**Metrics.** Leading: time from PO creation to supplier first view.

**Open items.** None.

#### REQ-E07-02  PO response: approve, adjust, reject, escalate

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07.01; MN-ORD-04 to MN-ORD-08, MN-ORD-14 | MVP | P0 [Deck p.7] | Material Planner | SUP, MP | Validated |

**Business value.** Replaces email back-and-forth with a timed, structured answer. Planners learn within 1 working day whether supply is secured, and the reasons behind every adjustment or rejection become data for supplier assessment. Answers the Lautan Luas pilot need for a response SLA [Deck p.11]. Moves KPI-05 and CFOT.

**Experience.**
- SUP: for each PO, chooses Approve, Adjust, or Reject before the deadline shown on screen.
- MP: sees responses, counter-offers, and reasons; is notified of rejections and of POs with no response.

**Step-by-step (Supplier, adjusting a PO).**
1. The supplier opens a PO created this morning. The screen shows "Respond by" 1 working day later [MN-ORD-04].
2. The supplier cannot meet the second delivery date. It chooses Adjust.
3. The supplier picks a predefined reason, such as "Production capacity" [MN-ORD-06; example Proposed].
4. The supplier enters a counter-offer: a new date and quantity for that line [MN-ORD-06].
5. The supplier submits. The planner sees the adjustment and counter-offer.

**Step-by-step (Planner, no response).**
1. A PO passes its 1-working-day deadline with no supplier response.
2. The hub marks it Escalated and notifies the planner [MN-ORD-14].
3. The planner decides the next action, such as sourcing from another vendor [MN-ORD-14].

**Business rules.**
- BR-01. The supplier responds within 1 working day of PO creation [MN-ORD-04].
- BR-02. Response options are Approve, Adjust, Reject [MN-ORD-05, MN-ORD-06, MN-ORD-08].
- BR-03. Approve leads to the supplier providing an ASN [MN-ORD-05].
- BR-04. Adjust changes quantity, timing, or both, and requires a predefined reason and a counter-offer of date and quantity [MN-ORD-06].
- BR-05. Reason codes are predefined, not free text [MN-ORD-06]. ADM maintains the list [Proposed].
- BR-06. Reject applies when the supplier cannot meet the requested date, quantity, and/or quality [MN-ORD-08].
- BR-07. A rejection counts against the supplier's performance assessment [MN-ORD-08].
- BR-08. A rejection notifies PTI and names the supplier [MN-ORD-08].
- BR-09. No response within the deadline sets the PO to Escalated, and PTI's team must act [MN-ORD-14].

**Edge cases.**
- The supplier adjusts some breakdown lines and accepts others: the response is recorded per line [Proposed].
- The planner does not accept the counter-offer: the planner can reject it with a comment, which reopens the PO for the supplier [Proposed].
- The supplier responds after escalation: record the response and its lateness; keep the escalation visible [Proposed].
- A PO arrives on a non-working day: the deadline counts from the next working day [Proposed; Q-18].

**Acceptance criteria.**
- AC-01. Each PO shows a response deadline 1 working day after creation.
- AC-02. Adjust cannot be submitted without a predefined reason and a counter-offer date and quantity.
- AC-03. Reject cannot be submitted without selecting date, quantity, and/or quality as the cause.
- AC-04. A rejection generates a notification to PTI naming the supplier.
- AC-05. A PO with no response at the deadline is marked Escalated and appears in the planner's escalation list.
- AC-06. Rejections are available to the supplier performance measures (REQ-E10-01).

**Data and integration.** Response record per PO (and per line if line-level responses are confirmed): option, reason code, counter-offer date and quantity, timestamp, user. Response status returned to SAP [Proposed; see REQ-E07-08].

**Metrics.** Leading: share of POs answered within 1 working day; escalations per week. Lagging: CFOT (REQ-E10-01); KPI-05.

**Open items.** Q-18 (which working calendar). Reason code list [Proposed: to be supplied by Material Planner].

#### REQ-E07-03  Order Collaboration Summary

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07; MN-ORD-10 to MN-ORD-13 | MVP | P0 [Deck p.7] | Material Planner | MP, SUP | Validated |

**Business value.** One place to see whether a PO is fully secured: the PO, its ASNs, and all 3 confirmations. It removes the need to check 3 menus to answer "is this order safe?".

**Experience.**
- MP: sees every PO with its ASN breakdown and the status of the capacity, foresight / fixed-stock, and shipping notice confirmations. Each status links to its detail page.
- SUP: sees the same summary for its own POs only.

**Step-by-step (Planner, Monday review).**
1. The planner opens the Order Collaboration Summary.
2. The planner sees a PO with capacity confirmed, foresight confirmed, and shipping notice missing.
3. The planner opens the shipping notice status and lands on that PO's shipping notice page [MN-ORD-13].

**Business rules.**
- BR-01. The summary shows the PO, its ASN breakdown, and the 3 confirmations [MN-ORD-13].
- BR-02. Each confirmation links to the detail page in its own menu [MN-ORD-13; Q-16].
- BR-03. Paragon users and the supplier that owns the PO can see the summary. A supplier sees only its own POs [MN-ORD-13; Q-17].

**Edge cases.**
- A confirmation is not required for a PO type: show "Not required" instead of "Missing" [Proposed].

**Acceptance criteria.**
- AC-01. For any PO, the summary shows its ASNs and the status of each of the 3 confirmations.
- AC-02. Selecting a confirmation status opens that confirmation's detail page for the same PO.
- AC-03. A supplier user sees only POs where it is the supplier.

**Data and integration.** Reads from REQ-E07-01, REQ-E07-04, REQ-E07-05, REQ-E08-04, REQ-E06-02.

**Metrics.** Leading: share of open POs with all 3 confirmations complete.

**Open items.** None.

#### REQ-E07-04  Advanced shipping notice (ASN)

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07.02; MN-ORD-05 | MVP | P0 [Deck p.7] | Material Planner | SUP, MP | Validated (ASN follows approval); Proposed (ASN content) |

**Business value.** ASNs are late or inconsistent today [Deck p.5]. A structured ASN tells the warehouse what is coming, and it is the source of the in-transit figure in inventory visibility (REQ-E08-01).

**Experience.**
- SUP: after approving a PO or call-off, creates an ASN with shipped quantity, dispatch date, and expected arrival.
- MP: sees ASNs per PO and their incoming totals in inventory visibility.

**Step-by-step (Supplier).**
1. The supplier approves a PO [MN-ORD-05].
2. When goods are ready, the supplier creates an ASN against the PO and call-off [Proposed].
3. The supplier enters material, quantity, batch, dispatch date, and ETA [Proposed; Market].
4. The supplier submits. The quantity moves into "in transit" for PTI [MN-INV-05].

**Business rules.**
- BR-01. An ASN is provided after the supplier approves [MN-ORD-05].
- BR-02. ASN quantity cannot exceed the open quantity on the call-off without a reason [Proposed].
- BR-03. Per-date incoming detail is shown in Order Collaboration; inventory shows the aggregate [MN-INV-04].

**Edge cases.**
- Partial shipment: multiple ASNs per call-off are allowed [Proposed; Market].
- ASN cancelled after submission: cancelled ASNs leave the in-transit figure [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can create an ASN only for an approved PO.
- AC-02. A submitted ASN increases the in-transit quantity in REQ-E08-01.
- AC-03. Multiple ASNs can be created against one call-off.

**Data and integration.** ASN header and lines. Sent to SAP as inbound delivery [Deck p.7 E07.05; see REQ-E07-08].

**Metrics.** Leading: share of receipts with an ASN before arrival.

**Open items.** Mandatory ASN fields to be confirmed with the warehouse [Proposed].

#### REQ-E07-05  Shipping notice confirmation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07.02; MN-ORD-12 | MVP | P0 [Deck p.7] | Material Planner | SUP, MP | Validated |

**Business value.** Gives the planner a clear signal that shipment of a confirmed PO has started and when it will finish. It is 1 of the 3 confirmations in the summary.

**Experience.**
- SUP: confirms that shipment has started and states when it will complete.
- MP: sees the confirmation in the summary and on the PO's shipping notice page.

**Step-by-step (Supplier).**
1. The supplier dispatches the first delivery of a PO.
2. The supplier opens the PO's shipping notice page and confirms shipment started, with the expected completion date [MN-ORD-12].
3. The summary updates the shipping notice status [MN-ORD-13].

**Business rules.**
- BR-01. The shipping notice confirmation states that shipment has started and until when [MN-ORD-12].
- BR-02. It lives in Order Collaboration and is shown in the summary [MN-ORD-13; Q-16].

**Edge cases.**
- Expected completion date moves later: the supplier updates it, and the planner is notified [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can record shipment start and expected completion date for a PO.
- AC-02. The summary shows the confirmation status for that PO.

**Data and integration.** Shipping notice confirmation per PO: start flag, start date, expected completion date.

**Metrics.** Leading: share of POs with a shipping notice confirmation before first receipt.

**Open items.** Relationship between this confirmation and individual ASNs to be confirmed [Proposed].

#### REQ-E07-06  Goods receipt confirmation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07.03 | MVP | P0 [Deck p.7] | Material Planner | SUP, MP | Proposed |

**Business value.** Suppliers find out what PTI actually received only when an invoice is disputed. Showing each goods receipt against its ASN closes the loop on every delivery, gives OTIF its "received" fact, and surfaces discrepancies while they are still easy to resolve.

**Experience.**
- SUP: sees received quantity per ASN and call-off, with any difference from what was shipped.
- MP: sees open discrepancies and the supplier's response.

**Step-by-step (Supplier, short receipt).**
1. PTI posts a goods receipt in SAP. The hub shows it against the ASN [Proposed].
2. The receipt is 950 of 1,000 shipped. The hub flags a 50-unit discrepancy [Proposed].
3. The supplier acknowledges it or disputes it with a comment and attachment [Proposed].
4. The planner sees the dispute and resolves it [Proposed].

**Business rules.**
- BR-01. Goods receipts come from SAP. The hub displays them and does not post them [Proposed].
- BR-02. Every receipt links to its ASN and call-off where one exists. SAP receipts reference the umbrella PO only, because call-offs are not in SAP, so the link to the call-off runs through the ASN or inbound delivery reference [Proposed; PQ-01].
- BR-03. A receipt that differs from ASN quantity by more than a configurable tolerance is flagged as a discrepancy [Proposed; Market].
- BR-04. Received quantity and receipt date feed OTIF per call-off (REQ-E10-01) [MN-ORD-09; Proposed].

**Edge cases.**
- Receipt with no ASN: show it as "Received without ASN", and count it in the ASN coverage metric [Proposed].
- Quality rejection after receipt: show returned quantity separately from received quantity [Proposed].

**Acceptance criteria.**
- AC-01. A goods receipt posted in SAP appears in the hub against its ASN.
- AC-02. A receipt outside the quantity tolerance is flagged and visible to both supplier and planner.
- AC-03. A supplier can acknowledge or dispute a discrepancy with a comment.

**Data and integration.** SAP to hub: GR document, material, quantity, date, batch, reference ASN or inbound delivery. See REQ-E07-08.

**Metrics.** Leading: open discrepancies older than 5 working days [Proposed]. Lagging: KPI-05.

**Open items.** PQ-04 (discrepancy tolerance).

#### REQ-E07-07  Invoice collaboration

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07.04; EX1 Web Tukar Faktur | MVP | P0 [Deck p.7] | Finance | SUP, FIN | Proposed |

**Business value.** Finance oversees accurate and on-time supplier payment [Deck p.12]. Letting suppliers submit invoices against received goods and see their status removes "tukar faktur" (invoice exchange) paperwork and payment-status calls.

**Experience.**
- SUP: creates an invoice from a PO and its goods receipts, attaches the tax invoice, submits, and follows its status to payment.
- FIN: sees submitted invoices with their match result and handles exceptions.

**Step-by-step (Supplier).**
1. The supplier selects received, not-yet-invoiced goods receipts for a PO [Proposed; Market].
2. The hub pre-fills the invoice lines from the receipts [Proposed; Market].
3. The supplier enters invoice number and date and attaches the tax invoice (e-Faktur) [Proposed].
4. The supplier submits. The hub shows match status: Matched or Exception [Proposed].
5. The supplier follows status: Submitted, Verified, Scheduled for payment, Paid [Proposed].

**Business rules.**
- BR-01. An invoice can only reference goods receipts of the supplier's own POs [Proposed].
- BR-02. Invoiced quantity cannot exceed received minus already invoiced quantity [Proposed; Market].
- BR-03. Price differences beyond a Finance-set tolerance make the invoice an exception for FIN [Proposed].
- BR-04. Invoice status comes back from SAP [Proposed].

**Edge cases.**
- Supplier submits the same invoice number twice: block as a duplicate [Proposed].
- Invoice rejected by Finance: return it with a reason; the supplier can correct and resubmit [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can create an invoice only from its own received goods receipts.
- AC-02. A duplicate invoice number from the same supplier is blocked.
- AC-03. The supplier sees the invoice status as updated from SAP.

**Data and integration.** Invoice header and lines, tax invoice attachment, match result, status. Hub to SAP for invoice posting or parking; SAP to hub for status [Proposed].

**Metrics.** Leading: share of invoices submitted through the hub; share matched first time. Lagging: days from receipt to payment.

**Open items.** DEC-06 (is Web Tukar Faktur this capability or a separate app). PQ-05 (Finance tolerance and statuses).

#### REQ-E07-08  Order data interface with SAP

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07.05, E12 | MVP | P0 [Deck p.7] | IT | ADM, MP | Proposed |

**Business value.** Every order collaboration screen depends on SAP data arriving quickly and correctly, and ERP API readiness is the first risk in the deck [Deck p.14, RSK-01]. A defined interface with monitoring prevents silent data gaps that would erode supplier and planner trust.

**Experience.**
- ADM: sees each interface's last successful run, failures, and failed records, and can retry.
- MP: sees a banner when data for a screen is older than expected.

**Step-by-step (Administrator, failed message).**
1. A goods receipt fails to load into the hub. The monitor shows it as failed with the error [Proposed].
2. The administrator fixes the cause and retries the record [Proposed].
3. The record loads, and the monitor shows it as successful [Proposed].

**Business rules.**
- BR-01. Objects exchanged with SAP: umbrella PO and breakdown, inbound delivery (from ASN), goods receipt, invoice [Deck p.7 E07.05]. Call-offs are not exchanged: they live in the hub only [PQ-01].
- BR-02. Direction: SAP to hub for PO, GR, invoice status. Hub to SAP for PO response, ASN as inbound delivery, invoice [Proposed].
- BR-03. Every message is logged with status and can be retried [Proposed].
- BR-04. Target latency: SAP changes visible in the hub within 15 minutes [Proposed].

**Edge cases.**
- SAP unavailable: the hub keeps working on last data, shows the data age, and queues outbound messages [Proposed].

**Acceptance criteria.**
- AC-01. Each object in BR-01 flows in the direction in BR-02.
- AC-02. A failed message is visible in the monitor with its error and can be retried.
- AC-03. Screens show a data-age warning when inbound data exceeds the latency target.

**Data and integration.** SAP document types and interface technology (for example IDoc, OData or BAPI through an integration layer) to be decided by IT [Proposed].

**Metrics.** Leading: failed messages per day; latency distribution.

**Open items.** PQ-06 (interface technology and latency target). PQ-11 (call-off record outside SAP).

### 5.4 Planning & Fulfillment: Inventory & Capacity Collaboration (E08)

#### REQ-E08-01  Inventory visibility

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E08.01; MN-INV-01 to MN-INV-06 | MVP | P0 [Deck p.7] | Material Planner | MP, SUP | Validated |

**Business value.** Planners lack direct visibility of supplier stock [Deck p.3, C3], and inventory accuracy is a known problem [Deck p.5]. One view of supplier and PTI stock, reorder points, and upcoming supply lets planners see shortages coming. Moves KPI-04 optimize stock.

**Experience.**
- MP: per material and supplier, sees supplier SOH, PTI SOH, PTI ROP, supplier ROP, and upcoming quantity with date split into in production and in transit. Raw material and packaging are shown separately.
- SUP: sees its own stock figures for the materials it supplies.

**Step-by-step (Planner, checking a raw material).**
1. The planner opens Inventory Visibility and selects Raw Material [MN-INV-06].
2. The planner finds material X from supplier A.
3. The planner reads supplier SOH, PTI SOH, and both ROPs [MN-INV-02, MN-INV-03].
4. The planner sees the aggregate incoming quantity, split into in production and in transit, with the next date [MN-INV-01, MN-INV-04, MN-INV-05].
5. The planner opens the incoming figure to see the per-date detail in Order Collaboration [MN-INV-04].

**Business rules.**
- BR-01. Show on-hand stock and upcoming quantity with its date. No separate "available" figure [MN-INV-01].
- BR-02. Show SOH separately for the supplier and for PTI [MN-INV-03].
- BR-03. Show 2 ROPs: PTI's and the supplier's [MN-INV-02].
- BR-04. PTI's ROP comes from SAP [MN-INV-14].
- BR-05. Incoming stock is shown as an aggregate. The per-date detail is in Order Collaboration [MN-INV-04].
- BR-06. Incoming is split into in production and in transit [MN-INV-05].
- BR-07. Raw material and packaging are shown separately, because packaging is a finished good at the supplier [MN-INV-06].

**Edge cases.**
- Supplier stock has not been updated within its data-update SLA: show the last update time and flag it as stale. The SLA varies by material and supplier, because each moves differently, so it is configured per supplier and material [owner, 2026-09-17; configuration Proposed].
- Supplier has no ROP: show "Not provided" [Proposed].

**Acceptance criteria.**
- AC-01. For a material and supplier, the view shows supplier SOH, PTI SOH, PTI ROP, supplier ROP, and incoming split into in production and in transit.
- AC-02. The view has no "available stock" field.
- AC-03. Raw material and packaging can be viewed separately.
- AC-04. The incoming figure links to its per-date detail in Order Collaboration.
- AC-05. Each supplier figure shows its last update time.

**Data and integration.** PTI SOH and PTI ROP from SAP. Supplier SOH, supplier ROP, and in-production quantity from REQ-E08-02. In-transit quantity from ASNs (REQ-E07-04).

**Metrics.** Leading: share of materials with supplier stock updated within the agreed period. Lagging: KPI-04.

**Open items.** Data-update SLA values per supplier and material, to be agreed with suppliers (risk register rows 11 and 12).

#### REQ-E08-02  Supplier stock submission

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E08.01, E12.01; MN-INV-07 | MVP | P0 [Deck p.7] | Material Planner | SUP, MP, ADM | Validated |

**Business value.** Suppliers differ in digital maturity [Deck p.14, RSK-04]. Offering spreadsheet, API, and manual entry lets every supplier share stock, while ERP-connected suppliers such as DP Group can sync automatically [Deck p.11].

**Experience.**
- SUP: uploads a filled template, or types stock figures into the hub.
- MP: presses Sync for API-connected suppliers to pull their latest figures.

**Step-by-step (Supplier, spreadsheet upload).**
1. The supplier downloads the stock template from the hub [MN-INV-07; download Proposed].
2. The supplier fills in SOH, ROP, and in-production quantity per material [Proposed field list].
3. The supplier uploads the file. The hub validates it and shows errors per row [Proposed].
4. The supplier fixes errors and re-uploads. Accepted figures appear in REQ-E08-01.

**Business rules.**
- BR-01. 3 submission channels: spreadsheet template upload, API sync, manual entry [MN-INV-07].
- BR-02. The spreadsheet channel uses a fixed template [MN-INV-07].
- BR-03. API sync is triggered by PTI with a Sync button [MN-INV-07].
- BR-04. Manual entry is done directly in the hub [MN-INV-07].
- BR-05. A file with invalid rows is rejected row by row, not as a whole, and valid rows are accepted [Proposed].

**Edge cases.**
- Uploaded material is not assigned to the supplier: reject that row [Proposed].
- API sync fails: show the error and time, keep the previous figures, flag them as stale [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can submit stock by template upload and by manual entry.
- AC-02. A PTI user can trigger an API sync for a connected supplier with a Sync button.
- AC-03. Invalid template rows are listed with a reason, and valid rows are saved.

**Data and integration.** Stock record per supplier, material, date: SOH, ROP, in-production quantity, channel, submitted by. API contract per supplier [RSK-02].

**Metrics.** Leading: share of suppliers submitting on schedule, by channel.

**Open items.** Template fields [Proposed]. Submission frequency follows the per-supplier, per-material data-update SLA (see REQ-E08-01).

#### REQ-E08-03  Supplier access to PTI stock

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| MN-INV-08 to MN-INV-12 | MVP; per-material access nice to have | P1 [Proposed] | Material Planner | MP, SUP | Validated |

**Business value.** Selected suppliers, especially under consignment, can plan replenishment themselves when they see PTI's stock. Keeping access selective protects commercial information.

**Experience.**
- MP: grants or removes a supplier's access to PTI stock, and optionally limits it to specific materials.
- SUP: if granted, sees PTI's stock for the permitted materials.

**Step-by-step (Planner).**
1. The planner opens Supplier Access and selects a supplier [MN-INV-12].
2. The planner switches PTI stock visibility on [MN-INV-08].
3. Nice to have: the planner limits access to consignment materials the supplier supplies [MN-INV-09, MN-INV-10].
4. The supplier sees PTI stock for those materials at next login.

**Business rules.**
- BR-01. Only selected suppliers can see PTI stock [MN-INV-08].
- BR-02. The Material Planner grants and removes access at any time. Suppliers do not approve the change [MN-INV-12].
- BR-03. Nice to have: access can be limited to materials the supplier can supply [MN-INV-09].
- BR-04. Material-level access targets consignment materials [MN-INV-10].
- BR-05. No fixed refresh cycle [MN-INV-11, dropped].
- BR-06. Every grant and removal is logged with user and time [Proposed].

**Edge cases.**
- Access removed while the supplier is viewing: the next page load no longer shows PTI stock [Proposed].

**Acceptance criteria.**
- AC-01. A supplier without access cannot see PTI stock anywhere in the hub.
- AC-02. A Material Planner can grant and remove access without supplier action.
- AC-03. Each change is logged.

**Data and integration.** Access list: supplier, scope (all or material list), granted by, time.

**Metrics.** Leading: number of suppliers with access.

**Open items.** None.

#### REQ-E08-04  Capacity confirmation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E08.01; MN-ORD-10 | MVP | P0 [Deck p.7] | Material Planner | SUP, MP | Proposed (the confirmation itself is Validated) |

**Business value.** Capacity and supply confirmation are manual today, and confirmation reliability is below 50% [Deck p.5]. A structured capacity confirmation tells the planner, per period, whether the supplier has allocated production for PTI, before a shortage reaches the factory.

**Experience.**
- SUP: states allocated capacity for PTI per material group and period, and flags constraints.
- MP: sees allocated capacity against forecast demand, with gaps highlighted.

**Step-by-step (Supplier, confirming capacity for a new PO).**
1. From the Order Collaboration Summary, the supplier opens the capacity confirmation for a PO [MN-ORD-10, MN-ORD-13].
2. The page shows PTI's demand per week for the materials on the PO [Proposed].
3. The supplier enters the capacity it allocates per week [Proposed; Market].
4. For a week where allocation is below demand, the supplier picks a constraint reason, such as a machine shutdown [Proposed].
5. The supplier submits. The summary marks the capacity confirmation as done, and the planner sees the gap week [Proposed].

**Business rules.**
- BR-01. The capacity confirmation answers whether the supplier can allocate production [MN-ORD-10].
- BR-02. The page lives in Inventory & Capacity Collaboration, and the summary links to it [MN-ORD-13; Q-16].
- BR-03. Capacity is stated per material group and weekly period, for a horizon set by ADM [Proposed; Market].
- BR-04. Allocation below demand requires a predefined constraint reason [Proposed].
- BR-05. Suppliers may state upside capacity above demand [Proposed; Market].

**Edge cases.**
- Supplier shares one line across several PTI materials: capacity is entered per material group, not per material [Proposed].
- Capacity changes after confirmation: the supplier updates it; the planner is notified if a gap appears [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can enter allocated capacity per material group per week.
- AC-02. A week with allocation below demand cannot be submitted without a reason.
- AC-03. The planner sees capacity against demand with gap weeks highlighted.

**Data and integration.** Capacity record: supplier, material group, week, allocated quantity, upside quantity, reason. Demand from REQ-E06-01.

**Metrics.** Leading: share of pilot suppliers with current capacity confirmation. Lagging: confirmation reliability (deck p.5 baseline below 50%).

**Open items.** PQ-02 (horizon and bucket size).

#### REQ-E08-05  Inventory and capacity alerts

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E08.02; PX1 | MVP | P0 [Deck p.7] | Material Planner | MP, SUP | Proposed |

**Business value.** Planners discover shortages when material is already missing at the factory [Deck p.5]. Rule-based alerts with a risk class give early warning, which is what the DKSH pilot is meant to validate [Deck p.11].

**Experience.**
- MP: receives alerts in the hub and by email, sorted by risk class, and opens the affected material directly.
- SUP: receives alerts about its own materials, such as stale stock data.

**Step-by-step (Planner, morning check).**
1. The planner opens the alert list. 3 are High [Proposed].
2. Top alert: PTI SOH for material X is below PTI ROP, and the next incoming quantity arrives after projected stock-out [Proposed].
3. The planner opens inventory visibility for X and requests an earlier call-off (REQ-E09-03) [Proposed].
4. The planner closes the alert with an action note [Proposed].

**Business rules.**
- BR-01. Alert rules [Proposed]:
  - PTI SOH below PTI ROP.
  - Supplier SOH below supplier ROP.
  - Projected stock-out before the next incoming date.
  - Committed quantity below forecast beyond tolerance (REQ-E06-03).
  - Allocated capacity below demand (REQ-E08-04).
  - Supplier data older than the stale period.
- BR-02. Each alert has a risk class: High, Medium, Low. The class is set by days of cover compared with supplier lead time [Proposed; PX1].
- BR-03. Alert thresholds and the stale period are configurable by ADM, per material group [Proposed; Market].
- BR-04. Alerts are delivered in the hub and by email [Proposed; Market].
- BR-05. The same condition does not raise a new alert until the open one is closed [Proposed].

**Edge cases.**
- Many alerts from one root cause (1 supplier late on many materials): group them under 1 parent alert [Proposed; Market].

**Acceptance criteria.**
- AC-01. Each rule in BR-01 raises an alert when its condition is met in test data.
- AC-02. Every alert shows a risk class.
- AC-03. A repeating condition does not create duplicate open alerts.

**Data and integration.** Reads REQ-E08-01, REQ-E06-03, REQ-E08-04. Alert record: rule, material, supplier, class, status, action note.

**Metrics.** Leading: alerts closed within 1 working day. Lagging: stock-outs (KPI-04).

**Open items.** PQ-03 (risk class thresholds).

### 5.5 Planning & Fulfillment: Forecast Collaboration (E06)

All requirements in this section are **Proposed**, written from market practice (section 8). Only the foresight / fixed-stock confirmation concept is validated [MN-ORD-11].

#### REQ-E06-01  Forecast publication

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E06.01 | MVP | P0 [Proposed] | Material Planner | MP, SUP | Proposed |

**Business value.** Suppliers cannot plan capacity or feedstock without seeing PTI's demand, and today that demand travels by email and Excel [Deck p.3]. Publishing material requirements on a fixed cadence, with firmness zones, gives suppliers the lead signal that later confirmations depend on. Pilot suppliers DP Group and Lautan Luas validate this [Deck p.11].

**Experience.**
- MP: reviews the forecast generated from SAP, publishes it, and sees which suppliers have viewed it.
- SUP: sees the forecast per material and period, the zone of each period, and what changed since the last version. It can download the forecast as a spreadsheet.

**Step-by-step (Supplier, Monday).**
1. A new forecast version is published. The supplier is notified [Proposed; Market].
2. The supplier opens it and sees weekly quantities for 13 weeks and monthly quantities after that [Proposed].
3. Each period is labelled Firm, Trade-off, or Forecast [Market].
4. The supplier switches to "Changes" and sees periods that moved against the previous version [Market].
5. The supplier downloads it to plan, then confirms in REQ-E06-02.

**Business rules.**
- BR-01. The forecast is net material requirement from SAP planning. The hub does not calculate demand [Proposed; aligned with MN-INV-14].
- BR-02. Publication cadence is weekly [Proposed].
- BR-03. Buckets are weekly for the near horizon and monthly after. Horizon and cut-over are configurable [Proposed; Market].
- BR-04. Each period carries a zone [Market]:
  - Firm: quantities no longer change.
  - Trade-off: changes are acceptable to the supplier.
  - Forecast: indicative only.
- BR-05. Zone lengths are set per supplier and material group [Proposed].
- BR-06. Every published version is kept. Suppliers can compare the current version with the previous one [Market].
- BR-07. A supplier sees only materials it supplies [Proposed].

**Edge cases.**
- A material moves to a different supplier mid-horizon: each supplier sees only the periods allocated to it [Proposed].
- Emergency re-publication mid-week: allowed, recorded as a new version, and suppliers are notified [Proposed].

**Acceptance criteria.**
- AC-01. A published forecast shows quantity per material per period with its zone.
- AC-02. A supplier can compare the current and previous versions and see the change per period.
- AC-03. A supplier can download the forecast as a spreadsheet.
- AC-04. A supplier cannot see materials it does not supply.

**Data and integration.** SAP to hub: material, supplier, period, quantity, version date. Zone settings per supplier and material group.

**Metrics.** Leading: share of suppliers that viewed the forecast within 1 working day. Lagging: forecast change in the Firm zone (should be near zero).

**Open items.** PQ-02 (horizon, buckets, zones). PQ-07 (SAP source: MRP or IBP).

#### REQ-E06-02  Foresight / fixed-stock confirmation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E06.02; MN-ORD-11 | MVP | P0 [Proposed] | Material Planner | SUP, MP | Proposed (the confirmation itself is Validated) |

**Business value.** A forecast only reduces risk when the supplier commits to it. Structured commitments per period, with reasons for shortfalls, turn "we will try" into data the planner can act on. This is the supply confirmation signal from deck p.5.

**Experience.**
- SUP: for each period, commits a quantity and date, or states a shortfall with a reason. It can enter commitments on screen or by spreadsheet upload.
- MP: sees commitment against forecast; commitments within tolerance need no action.

**Step-by-step (Supplier).**
1. From the forecast or the Order Collaboration Summary, the supplier opens the confirmation page [MN-ORD-11, MN-ORD-13].
2. Each period shows PTI's quantity. By default, the commit equals the forecast [Proposed].
3. For week 6, the supplier can supply 800 of 1,000. It enters 800, a date, and the reason "Raw material shortage" [MN-ORD-11; reason Proposed].
4. The supplier submits. Week 6 falls outside tolerance and appears as an exception for the planner [Market].

**Business rules.**
- BR-01. PTI shares its plan; the supplier replies with the quantity and date it can meet [MN-ORD-11].
- BR-02. The page lives in Forecast Collaboration, and the summary links to it [MN-ORD-13; Q-16].
- BR-03. Commitment is per material per period [Market].
- BR-04. A commit below forecast needs a predefined reason [Proposed].
- BR-05. A commit within the tolerance of forecast is accepted without planner action. Outside tolerance, it becomes an exception (REQ-E06-03) [Market].
- BR-06. Suppliers can commit by screen or spreadsheet upload [Market; aligned with MN-INV-07].
- BR-07. Commitments are due within a set time after publication, proposed as 1 working day to match the PO rule [Proposed; MN-ORD-04].
- BR-08. A supplier may commit an upside quantity above forecast [Market].

**Edge cases.**
- Forecast re-published after commitment: periods whose quantity changed beyond tolerance return to "awaiting commitment"; unchanged periods keep their commitment [Proposed].
- No commitment by the deadline: escalate to the planner, as for POs [Proposed; MN-ORD-14].

**Acceptance criteria.**
- AC-01. A supplier can commit a quantity and date per period, on screen or by upload.
- AC-02. A commit below forecast cannot be submitted without a reason.
- AC-03. A commit within tolerance needs no planner action. A commit outside tolerance appears as an exception.
- AC-04. Missing commitments at the deadline are escalated.

**Data and integration.** Commitment record: version, material, period, committed quantity, date, upside quantity, reason, submitted by.

**Metrics.** Leading: commitment coverage (share of periods committed). Lagging: CFOT (REQ-E10-01); confirmation reliability.

**Open items.** PQ-08 (tolerance per zone; commitment deadline).

#### REQ-E06-03  Forecast-commit gap monitoring

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E06.02, E08.02 | MVP | P1 [Proposed] | Material Planner | MP | Proposed |

**Business value.** Planners cannot review every period of every material. A gap view that colours periods by tolerance and ranks exceptions by impact directs attention to the few materials at real risk.

**Experience.**
- MP: sees a grid of material by period coloured green, amber, or red, plus cumulative forecast against cumulative commitment, and a ranked exception list.

**Step-by-step (Planner).**
1. The planner opens Gap Monitoring for suppliers in the pilot [Proposed].
2. Material Y shows red in weeks 5 to 7 [Market].
3. The cumulative line shows commitment falling 12% behind forecast by week 7 [Market].
4. The planner opens the exception, reads the supplier's reason, and accepts it, asks for revision, or moves demand to another supplier [Proposed].

**Business rules.**
- BR-01. Gap per period = commitment minus forecast, as quantity and percentage [Market].
- BR-02. Periods are coloured by tolerance level [Market]:
  - Green: within tolerance.
  - Amber: warning.
  - Red: error.
- BR-03. Cumulative commitment against cumulative forecast is shown over the horizon [Market].
- BR-04. Exceptions are ranked by impact: Firm zone first, then by projected days of cover from REQ-E08-01 [Proposed].
- BR-05. Planner actions on an exception: accept, request revision, reassign demand. Each needs a note [Proposed].
- BR-06. Automatic reminders go to suppliers with missing commitments [Market].

**Edge cases.**
- Supplier commits more than forecast in Firm zone: show as information, not error [Proposed].

**Acceptance criteria.**
- AC-01. Each period shows the gap as quantity and percentage, coloured by tolerance level.
- AC-02. The exception list is sorted with Firm-zone exceptions first.
- AC-03. A planner action on an exception is saved with a note and visible to the supplier.

**Data and integration.** Reads REQ-E06-01, REQ-E06-02, REQ-E08-01.

**Metrics.** Leading: open exceptions older than 2 working days [Proposed]. Lagging: KPI-04; KPI-05.

**Open items.** PQ-08 (tolerances).

### 5.6 Planning & Fulfillment: Call-off Management (E09)

All requirements in this section are **Proposed**, written from market practice (section 8). Validated inputs: PO and call-off are separate objects [MN-ORD-01], OTIF is measured per call-off [MN-ORD-09], and ROP comes from SAP [MN-INV-14].

#### REQ-E09-01  Replenishment recommendation from SAP ROP

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E09.01; MN-INV-14 | MVP | P0 [Proposed] | Material Planner | MP | Proposed (SAP source is Validated) |

**Business value.** Call-offs are not model-based today [Deck p.5]. Turning SAP's ROP-based recommendations into a review-and-release list lets planners release call-offs consistently, moving toward the Dynamic OSIP Engine in the roadmap [Deck p.4].

**Experience.**
- MP: sees recommended call-offs per material and supplier with quantity and need date, context from inventory visibility, and releases, edits, or dismisses each.

**Step-by-step (Planner).**
1. The planner opens Recommendations. SAP has proposed 14 call-offs from ROP [MN-INV-14; Proposed].
2. Each row shows PTI SOH, PTI ROP, incoming quantity, and the recommended quantity and date [Proposed].
3. The planner edits 1 quantity to a full pallet and releases 13 [Proposed].
4. The planner dismisses 1 with the reason "Promotion cancelled" [Proposed].
5. Released recommendations become call-offs (REQ-E09-03).

**Business rules.**
- BR-01. The ROP and recommendation cycle come from SAP (demand sensing). The hub does not calculate them [MN-INV-14].
- BR-02. A recommendation must reference an open umbrella PO with the same supplier and material [MN-ORD-01; Proposed].
- BR-03. Edited or dismissed recommendations record the planner's reason [Proposed].
- BR-04. Released call-offs cannot exceed what remains on the umbrella PO. The PO holds value [PQ-01], so the check is on remaining value, or on quantity if PQ-12 confirms quantity is available [Proposed].

**Edge cases.**
- No open umbrella PO: show the recommendation as blocked with "No PO" [Proposed].

**Acceptance criteria.**
- AC-01. SAP recommendations appear with quantity, date, and inventory context.
- AC-02. A planner can release, edit, or dismiss each, with a reason for edit and dismiss.
- AC-03. Release is blocked when it exceeds what remains on the umbrella PO.

**Data and integration.** SAP to hub: recommendation (material, supplier, quantity, date, ROP) and umbrella PO value. Released call-offs are stored in the hub, not sent to SAP [PQ-01].

**Metrics.** Leading: share of call-offs released from recommendations unedited [Proposed]. Lagging: KPI-04.

**Open items.** PQ-07 (demand sensing source in SAP). PQ-11. PQ-12.

#### REQ-E09-02  Event-based strategy analysis

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E09.01.01 | MVP | P2 [Proposed] | Material Planner | MP | Proposed |

**Business value.** ROP works for steady demand but fails around events such as launches, promotions, and supply crises, which the roadmap calls "Flow & Exception Managed (NPD, PIPO, Supply Crisis)" [Deck p.4]. An analysis view lets planners test whether an event-based strategy would perform better for a material before changing it in SAP.

**Experience.**
- MP: selects a material and an event window, and compares projected stock and call-offs under the current ROP strategy against an event-based alternative.

**Step-by-step (Planner, product launch).**
1. The planner selects material Z and a launch window of 6 weeks [Proposed].
2. The hub shows projected stock under the current ROP [Proposed].
3. The planner enters the expected event demand. The hub shows projected stock with a pre-built quantity released before the window [Proposed].
4. The planner saves the comparison and sends it to the SAP parameter owner [Proposed].

**Business rules.**
- BR-01. Analysis only. The hub does not change SAP parameters [Proposed; MN-INV-14].
- BR-02. Event types: new product launch, promotion, phase-in / phase-out, supply crisis [Proposed; Deck p.4].

**Edge cases.**
- Not enough history for the material: show the projection with a low-confidence label [Proposed].

**Acceptance criteria.**
- AC-01. A planner can compare projected stock under the current and event-based strategy for a chosen window.
- AC-02. A saved comparison can be shared.

**Data and integration.** Reads SAP ROP, lead time, and REQ-E08-01 inventory.

**Metrics.** Lagging: stock-outs and excess stock during event windows.

**Open items.** PQ-09 (confirm this is needed in MVP; lowest-confidence requirement in this file).

#### REQ-E09-03  Call-off release and supplier confirmation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E09; MN-ORD-01, MN-ORD-09 | MVP | P0 [Proposed] | Material Planner | MP, SUP | Proposed |

**Business value.** Call-offs run through email and Excel today [Deck p.3, C2], and pilot suppliers DP Group and Lautan Luas have high call-off frequency [Deck p.11]. A released call-off with a line-level supplier confirmation and tolerance rules gives each delivery a clear commitment, which is the basis for OTIF.

**Experience.**
- MP: releases call-offs and sees confirmation status; approves confirmations outside tolerance.
- SUP: confirms each call-off line: confirm, confirm with a new date or quantity, or reject.

**Step-by-step (Supplier).**
1. The supplier receives a call-off: 2,000 units, need date 12 Oct [Proposed].
2. The supplier confirms 2,000 for 14 Oct, which is 2 days late [Market].
3. Late tolerance is 1 day, so the confirmation goes to the planner as Awaiting Approval [Market].
4. The planner approves it. The call-off shows Confirmed with New Date, and ASN creation opens (REQ-E07-04) [Market].

**Business rules.**
- BR-01. A call-off belongs to an umbrella PO and manages 1 delivery [MN-ORD-01].
- BR-02. Confirmation statuses [Market]:
  - Awaiting Confirmation.
  - Confirmed.
  - Confirmed with New Date.
  - Confirmed with Changes.
  - Partially Confirmed.
  - Rejected.
- BR-03. Quantity tolerance (under and over %) and date tolerance (early and late days) are set per supplier and material group [Market].
- BR-04. A confirmation within tolerance is accepted automatically. Outside tolerance it waits for planner approval: Awaiting Approval, Approved, Rejected [Market].
- BR-05. Confirmation is due within 1 working day of release, matching the PO rule. No response escalates [Proposed; MN-ORD-04, MN-ORD-14].
- BR-06. An ASN can be created only for a confirmed call-off [Market; MN-ORD-05].
- BR-07. OTIF is measured per call-off against the approved date and quantity [MN-ORD-09; "approved" Proposed].
- BR-08. Automatic reminder to the supplier a set number of days before need date if no ASN exists [Market].

**Edge cases.**
- Planner changes a confirmed call-off: status returns to Awaiting Confirmation [Proposed].
- Supplier splits 1 call-off into 2 deliveries: allowed as Partially Confirmed with 2 dates, each measured for OTIF [Proposed; Market].

**Acceptance criteria.**
- AC-01. A supplier can confirm, confirm with new date or quantity, or reject each call-off line.
- AC-02. A confirmation within tolerance is accepted automatically; outside tolerance it waits for planner approval.
- AC-03. An unconfirmed call-off escalates after 1 working day.
- AC-04. OTIF for a call-off is calculated against its approved date and quantity.

**Data and integration.** Call-off: umbrella PO, material, quantity, need date, status, confirmed date and quantity, approval. The hub is the record for call-offs; nothing is sent to SAP [PQ-01].

**Metrics.** Leading: share confirmed within 1 working day; share needing approval. Lagging: OTIF (KPI-05).

**Open items.** PQ-08 (tolerances). PQ-11 (migrating today's manual call-off records).

#### REQ-E09-04  Delivery execution: need date and dispatch heads-up

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E09.02 "[P1] Execution strategy (kapan supplier bisa dan perlu datang)"; PQ-10 | MVP | P1 [Deck p.7] | Material Planner | SUP, MP | Proposed (scope set by owner, PQ-10) |

**Business value.** The deck asks when the supplier can come and when it must come. For now PTI needs a heads-up that the supplier has already shipped, not dock or slot scheduling [PQ-10]. A dispatch heads-up against each call-off tells the planner that supply is on its way, feeds the in-transit figure, and costs the supplier one action.

**Experience.**
- SUP: sees the need date on each confirmed call-off, and sends a dispatch heads-up when goods leave, with expected arrival.
- MP: sees which call-offs are dispatched, and which are due soon with no heads-up.

**Step-by-step (Supplier).**
1. The supplier opens a confirmed call-off. The need date is 14 Oct ("must come") [Deck p.7; Proposed].
2. The truck leaves on 13 Oct. The supplier selects "Shipped" and enters expected arrival 14 Oct 10:00 [PQ-10; Proposed fields].
3. The planner sees the call-off as Dispatched, and its quantity moves to in transit (REQ-E08-01) [MN-INV-05; Proposed].

**Business rules.**
- BR-01. "Must come" is the need date on the confirmed call-off [Deck p.7; Proposed].
- BR-02. "Can come" is the date the supplier confirmed (REQ-E09-03) [Proposed].
- BR-03. The supplier sends a dispatch heads-up once goods have shipped [PQ-10].
- BR-04. The hub does not manage delivery schedules, dock slots, or receiving locations [PQ-10].
- BR-05. The heads-up can be the ASN itself (REQ-E07-04) when the supplier creates one, so the supplier does not report the same shipment twice [Proposed].
- BR-06. The planner is reminded when a call-off is within a set number of days of its need date with no heads-up [Proposed; Market].

**Edge cases.**
- Expected arrival later than need date: flag the call-off as At Risk for the planner [Proposed; Market].
- Partial dispatch: heads-up per shipment, each with its quantity [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can mark a confirmed call-off as shipped, with expected arrival.
- AC-02. A shipped call-off shows as Dispatched to the planner and counts as in transit.
- AC-03. A call-off whose expected arrival is after its need date is flagged At Risk.
- AC-04. The hub has no dock or slot booking function in this scope.

**Data and integration.** Call-off dispatch record: shipped date, expected arrival, quantity, optional ASN link.

**Metrics.** Leading: share of call-offs with a heads-up before arrival. Lagging: OTIF (KPI-05).

**Open items.** Q-19 (PQ-10 answer appears cut off; confirm nothing is missing). Dock and slot scheduling is out of scope for now and may return in a later phase.

### 5.7 Performance & Analytics (E10)

#### REQ-E10-01  CFOT and OTIF measurement

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E10.01; MN-ORD-07, MN-ORD-08, MN-ORD-09 | MVP | P1 [Proposed] | Not stated (DEC-09) | MP, BUY | Validated (definitions); Proposed (formulas) |

**Business value.** Supplier performance is not tracked in a standard way today [Deck p.3, C4]. Measuring CFOT per PO and OTIF per call-off from hub data turns every confirmation and delivery into evidence for sourcing decisions. Moves KPI-05.

**Experience.**
- MP, BUY: see CFOT and OTIF per supplier on the performance dashboard, and OTIF in supplier sourcing.

**Step-by-step (Buyer).**
1. The buyer opens the supplier performance dashboard.
2. The buyer compares CFOT and OTIF across suppliers of a commodity.
3. When inviting suppliers to an RFQ, the buyer sees the same OTIF (REQ-E03-01).

**Business rules.**
- BR-01. CFOT (Casefill On-Time) is measured per PO, per supplier [MN-ORD-07].
- BR-02. OTIF is measured per call-off [MN-ORD-09].
- BR-03. OTIF is shown on the performance dashboard and in supplier sourcing [MN-ORD-09].
- BR-04. Supplier rejections count in the performance assessment [MN-ORD-08].
- BR-05. Proposed formula, CFOT per PO: quantity confirmed and delivered by the confirmed date, divided by PO quantity [Proposed].
- BR-06. Proposed formula, OTIF per call-off: 1 if the full call-off quantity is received on or before the requested date, else 0; aggregated as a percentage of call-offs [Proposed; Market].

**Edge cases.**
- Planner-initiated date change: measure against the latest date agreed by both sides [Proposed].

**Acceptance criteria.**
- AC-01. The dashboard shows CFOT and OTIF per supplier for a selected period.
- AC-02. OTIF is calculated per call-off and CFOT per PO.

**Data and integration.** PO responses (REQ-E07-02), call-offs (REQ-E09-03), goods receipts (REQ-E07-06).

**Metrics.** This requirement produces KPI-05.

**Open items.** Formulas BR-05 and BR-06 need business confirmation. Tolerances for "on time" and "in full" [Proposed].

### 5.8 System Integration: API Shipment Aggregator (E13)

#### REQ-E13-01  Supplier access to TMS shipment tracking

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E13.01; MN-INV-13 | Open (D-03): deck puts E13 in Phase 2 | P2 [Proposed] | IT | SUP, MP | Validated |

**Business value.** ETA and in-transit visibility are not real-time today [Deck p.5]. Giving suppliers access to PTI's TMS to track their deliveries is a fast start, before a full API integration. Relevant to DKSH's pilot need for shipment visibility [Deck p.11].

**Experience.**
- SUP: tracks its deliveries to PTI in the TMS.
- MP: sees the resulting in-transit status and ETA.

**Step-by-step.** To be detailed once the phase is decided (D-03).

**Business rules.**
- BR-01. Initially, suppliers get TMS access to track deliveries to PTI [MN-INV-13].
- BR-02. When integration is mature, exchange moves to API [MN-INV-13].

**Acceptance criteria.** To be written once the phase is decided.

**Open items.** D-03 (phase). Which TMS, and supplier account model [Proposed].

---

## 6. Stubs

| Epic | Deck scope | Phase | Status |
|---|---|---|---|
| E04 Contract Management | E04.01 to E04.03 | Phase 2 | Stub |
| E05 Catalog Management | E05.01 to E05.03. Note D-07: RFI needs a product catalog in MVP | Phase 2 | Stub |
| E10 Supplier Performance Dashboard (other) | E10.02 non-conformance and complaint tracking | MVP | Stub |
| E11 Reporting & Analytic Dashboard | E11.01, E11.02 | Phase 2 | Stub |
| E12 API ERP | E12.01, E12.02. Partly covered by REQ-E08-02 and REQ-E07-08 | MVP | Stub |
| E13 API Shipment Aggregator (other) | E13.02 ETA visibility | Phase 2 | Stub |

---

## 7. Open items

| ID | Item | Requirements affected |
|---|---|---|
| Q-18 | Which working calendar defines the 1-working-day deadline | REQ-E07-02 |
| A-01 | Check with Mas Ary Hidayat on compliance and capability for RFx | REQ-E03-01 to REQ-E03-04 |
| A-02 | Full parameter list for supplier filtering | REQ-E03-01 |
| D-03 | Phase for supplier TMS access | REQ-E13-01 |
| D-07 | Catalog needed by RFI in MVP while Catalog Management is Phase 2 | REQ-E03-02 |
| DEC-09 | Business owner for performance dashboard | REQ-E10-01 |
| DEC-06 | Is Web Tukar Faktur the invoice collaboration capability or a separate app | REQ-E07-07 |
| PQ-11 | Call-offs are managed manually outside SAP today. Confirm the hub becomes the record for call-offs, whether call-offs ever need to go back to SAP or another system, and whether today's manual records (for example spreadsheets) are migrated | REQ-E07-08, REQ-E09-01, REQ-E09-03 |
| PQ-12 | Does the umbrella PO carry only a total value, or also quantities per breakdown line (MN-ORD-03 says quantity and timing come from SAP) | REQ-E07-01, REQ-E09-01 |
| PQ-02 | Forecast and capacity horizon, bucket sizes, and zone lengths | REQ-E06-01, REQ-E08-04 |
| PQ-03 | Risk class thresholds for alerts | REQ-E08-05 |
| PQ-04 | Goods receipt discrepancy tolerance | REQ-E07-06 |
| PQ-05 | Invoice tolerance and status list from Finance | REQ-E07-07 |
| PQ-06 | Interface technology and latency target | REQ-E07-08 |
| PQ-07 | SAP source of forecast and demand sensing (MRP, IBP, or other) | REQ-E06-01, REQ-E09-01 |
| PQ-08 | Commitment and confirmation tolerances per zone; commitment deadline | REQ-E06-02, REQ-E06-03, REQ-E09-03 |
| PQ-09 | Is event-based strategy analysis needed in MVP | REQ-E09-02 |
| Q-19 | The PQ-10 answer ends with "They". Confirm nothing is missing | REQ-E09-04 |

---

## 8. Market reference

Research date: 2026-09-17. Vendor pages were read directly unless marked "snippet only". Vendor performance statistics were excluded, because they are marketing claims.

### 8.1 Patterns used in this file

| Pattern | Where it appears in this file | Evidence |
|---|---|---|
| Buyer publishes net demand; supplier commits per time bucket, including upside | REQ-E06-01, REQ-E06-02 | SAP Business Network forecast collaboration (help.sap.com/docs/business-network-for-trading-partners/supplier-business-network-supply-chain/forecast-collaboration); E2open (e2open.com/supply/supply-forecast-collaboration); Coupa (coupa.com/products/supply-chain-collaboration/forecast-collaboration); o9 (o9solutions.com/solutions/supplier-and-risk-management/supplier-collaboration) |
| Forecast versions and change or waterfall view | REQ-E06-01 | SAP BN key figures: previous forecast, forecast change, forecast deviation (help.sap.com/.../key-figures-reference); SupplyOn waterfall report (supplyon.com/en/solutions/supply-chain-collaboration/forecast-collaboration) |
| Gap monitoring with tolerance colours and alert levels; cumulative commit vs forecast | REQ-E06-03 | SAP SNC Order Forecast Monitor (help.sap.com/docs/SAP_SUPPLY_CHAIN_MANAGEMENT/...); SAP BN cumulative key figures; CPFR exception criteria (scm.ncsu.edu CPFR article) |
| Firm, trade-off, and forecast zones | REQ-E06-01 | SAP scheduling agreement firm and trade-off zones. Source is SAP Community and a KBA title, not product documentation |
| Spreadsheet round-trip for suppliers | REQ-E06-02, REQ-E08-02 | SAP BN CSV upload for forecast commit; SupplyOn bulk upload; o9 spreadsheet uploads |
| Auto-accept within tolerance, buyer approval outside it | REQ-E06-02, REQ-E09-03 | SAP BN order confirmation approval for scheduling agreements (help.sap.com/docs/sisgw/...77c968eea6e143b390f9bf4176e8d63f); o9 automatic commitment within thresholds |
| Confirmation statuses and quantity and date tolerances | REQ-E09-03 | SAP BN order confirmation and ship notice rules (help.sap.com/docs/business-network-for-procurement/business-network-buyer-administration/order-confirmation-and-ship-notice-rules) |
| Reminders before need date for unshipped items | REQ-E09-03 | SAP BN reminder rules (3 to 10 days before delivery date) |
| Call-off releases against scheduling agreements; firm call-offs beside forecast | REQ-E09-01, REQ-E09-03 | SupplyOn forecasts and delivery schedules (supplyon.com/en/solutions/logistics-supply-chain/forecasts-delivery-schedules); JAGGAER delivery call-offs (jaggaer.com/solutions/supply-chain-collaboration) |
| VMI and consignment signals | REQ-E08-03, REQ-E08-05 | SAP BN min/max and days of supply; JAGGAER VMI with consignment; SupplyOn VMI, Kanban, JIT/JIS |
| Capacity commitments and constraints from suppliers | REQ-E08-04 | o9 supplier collaboration |
| Exception ranking and grouping; AI agents chasing missing commitments | REQ-E06-03, REQ-E08-05 | o9 autopilot agents (snippet only); SAP Joule Supplier Management Assistant (announcement, news.sap.com 2025-10); JAGGAER delivery risk prediction |
| Dock slot booking with capacity rules and At Risk flag from ETA | Not used after PQ-10; At Risk flag kept in REQ-E09-04 | SupplyOn Dock/Slot Management; SAP Dock Appointment Scheduling (help.sap.com/docs/business-network-freight-collaboration/application-help/dock-appointment-scheduling); Blue Yonder Network Appointment Scheduling |
| Supplier mobile app for confirmations and ASNs | Not yet used; candidate for RSK-04 | SAP Business Network Supplier mobile app |
| Planning system pushes forecasts to partners and receives commits back | REQ-E06-01, REQ-E06-02 | Kinaxis Network Collaboration by TraceLink, announced 2026-04-15 (prnewswire release) |

### 8.2 Not verified

- No vendor publishes default tolerances between forecast and commitment. All tolerance values in this file are open items (PQ-08).
- No vendor documents OTIF per call-off as a built-in report. OTIF definitions vary by company (on-time window, early deliveries, order or line level), so REQ-E10-01 formulas need business confirmation.
- SAP Business Network Kanban support: no primary page found.
- Coupa and E2open support for scheduling agreements and consignment: snippet only.
- Firm and trade-off zone definitions: SAP Community, not product documentation.

---

## 9. Answered decisions

| ID | Question | Answer (owner, 2026-09-17) |
|---|---|---|
| DEC-05 | Relationship with PROCIO for Foundation | PROCIO is replaced by the hub. Supplier data is migrated |
| REPL | Replenishment method | Decided later. REQ-E09-01 and REQ-E09-02 depend on it |
| SLA | Data-update SLA | Varies by material and supplier |
| SFTP | Automated SFTP file drop as a 4th stock channel | Not needed. Spreadsheet upload is enough |
| PQ-01 | SAP representation of umbrella PO and call-off | The umbrella PO is the overall ordered value. Call-offs are managed manually outside SAP |
| PQ-10 | Dock slot booking | Not needed now. PTI only needs a heads-up that the supplier has shipped |

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-17 | First draft from deck baseline and reviewed meeting notes |
| 0.3 | 2026-09-17 | Applied PQ-01 (call-offs outside SAP) and PQ-10 (dispatch heads-up, no dock scheduling); REQ-E09-04 rescoped |
| 0.2 | 2026-09-17 | Added proposed Planning & Fulfillment requirements (E06, E09, E07-06 to E07-08, E08-04, E08-05) from market research; market reference; Foundation contribution rule |
