# Supplier Hub Requirements

| | |
|---|---|
| Version | 0.34 draft, 2026-11-02 |
| Sources | `SUPPLIER-HUB-BASELINE.md` (kick-off deck, Aug 2026); `KICKOFF-MEETING-NOTES.md` (business user feedback, reviewed 2026-09-17); owner review of the prototype gap review (2026-09-17); owner RFx decisions RFX-D1 to RFX-D5 (2026-09-21); owner RFx decisions RFX-D6 to RFX-D14 (2026-09-25), from `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`; owner RFx decision RFX-D15 (2026-09-28); RFx best-practice research, `research/RFX-BEST-PRACTICE-2026-09.md` (2026-09-21); owner decision ENG-1 (2026-09-23) with the forecast research `research/FORECAST-BEST-PRACTICE-2026-09.md` and `research/FORECAST-METHOD-SPEC.md`; owner material decisions MAT-D1 to MAT-D15 (2026-09-29), from `SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`, and the owner's rulings during the material build MAT-D16 to MAT-D21 (2026-09-29), from section 4.1 of `SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md` |
| Scope of this version | Detailed: Order Collaboration, Inventory & Capacity Collaboration, RFx (validated); Forecast Collaboration, Call-off Management, and the undiscussed parts of Order and Inventory Collaboration (proposed). Hub navigation and screen conventions (validated). Foundation is reserved for the Foundation team. The remaining epics are stubs |
| Not in scope | The codebase. This file states what the Supplier Hub must do, not what is built. What the prototype does today, and where, is tracked only in `BUILD-GAP.md` |

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
| `[Owner]` | Decision by the project owner, dated in section 9 |
| `[Code]` | Calculation or threshold taken from the prototype. The owner ruled on 2026-09-17 that calculations follow the prototype where this file was silent or open. A validated business rule still wins over a code value |
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
- So the hub is where call-offs are created and managed, and SAP only knows the umbrella PO, goods receipts, and invoices [Proposed, follows from PQ-01]. The hub's call-off record is the long-term record [Owner, 2026-11-02, PQ-11].

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

Recommended default until Q-18 is answered: Monday to Friday, 08:00 to 17:00 WIB, excluding Indonesian national holidays and PTI collective leave days (cuti bersama). A deadline that falls outside working hours moves to the next working hour [Proposed].

Decided (Q-18, 2026-09-21): the hub keeps its own working calendar, maintained by the Hub administrator (ADM). It is loaded from the SAP factory calendar for Indonesia, and the administrator can add, remove or override days in the hub. Every deadline in this file reads that calendar [Owner].

### 3.5 Glossary additions

| Term | Meaning | Source |
|---|---|---|
| SOH | Stock on hand | MN-INV-03 |
| ROP | Reorder point. Calculated by PTI's forecast engine; from SAP until the engine is live | MN-INV-02; ENG-1 (supersedes MN-INV-14) |
| Consignment material | Material under a consignment ("modal sharing") arrangement | MN-INV-10 |
| Spreadsheet template upload | Called "EDI" by business users. A file upload, not EDIFACT or X12 | MN-INV-07 |
| TMS | Transportation management system | MN-INV-13 |
| JIT call-off | A firm call-off for a fixed delivery. The same tolerance as every call-off applies (CR-05) | Owner, 2026-09-21 |
| Forecast-based call-off | A call-off released from a forecast-driven schedule. The same tolerance as every call-off applies (CR-05) | Owner, 2026-09-21 |

### 3.6 Shared calculation rules

Every requirement that calculates something refers to a rule here by its `CR-` ID, so each formula is written once. Values tagged `[Code]` are the prototype's, adopted by owner decision on 2026-09-17. ADM can change every threshold [Proposed].

| ID | Rule | Formula or value | Used by | Source |
|---|---|---|---|---|
| CR-01 | Days of supply | SOH ÷ average daily demand. Average daily demand = forecast quantity for the next 30 days ÷ 30 | REQ-E08-01, REQ-E08-05 | Bands [Code]; demand basis [Proposed] |
| CR-02 | Days-of-supply bands | Fallback only, used where a supplier lead time is missing: Critical below 14 days; Warning 14 to 29; Healthy 30 to 60; Excess above 60. A missing lead time raises its own data-quality alert | REQ-E08-01, REQ-E08-05 | [Code]; fallback role [Owner, 2026-09-21] |
| CR-03 | Supplier coverage | (supplier SOH + incoming quantity in production or in transit) ÷ firm demand. Covered at 1.0 or more; At risk from 0.8 to below 1.0; Uncovered below 0.8. No demand counts as Covered | REQ-E08-05 | [Code] |
| CR-04 | Remaining on umbrella PO | Remaining quantity = PO quantity − released call-off quantity. Remaining value = PO value − released call-off value. Value applies until PQ-12 confirms a quantity exists | REQ-E09-01 | [Code] quantity; [PQ-01] value |
| CR-05 | Call-off quantity and date tolerance | Quantity: up to 5% over the approved quantity is accepted; any shortfall is a partial delivery and stays visible. Date: a late confirmation always needs planner approval. An early date also needs approval: there is no fixed early allowance, and an early delivery is allowed once the Material Planner team confirms it (PQ-08) | REQ-E09-03 | [Owner, 2026-09-21]; early date [Owner, 2026-11-02] |
| CR-06 | Delivery match to a call-off | A receipt or dispatch counts toward a call-off when its date is within 7 days of the need date, for the same supplier and material. If several match, take the closest date, then the closest quantity | REQ-E09-03, REQ-E10-01 | [Code] |
| CR-07 | On time and missed | On time: received on or before the approved need date. Late: received after it. Missed: nothing received 3 days after the need date. Pending: before that | REQ-E09-03, REQ-E10-01 | [Code] |
| CR-08 | In full | Received quantity ≥ approved call-off quantity. Tolerance for "in full" stays open (PQ-08) | REQ-E10-01 | [Proposed]; the prototype has no in-full test |
| CR-09 | Delivery reminders | Reminder to the supplier 7 days before the need date when no ASN or dispatch heads-up exists. "Drift" signal to the planner when 2 or more call-offs of the same material and supplier are late or missed | REQ-E09-03, REQ-E09-04 | [Code] |
| CR-10 | Counter-offer quantity | 0 < counter-offer quantity ≤ ordered quantity for that line | REQ-E07-02 | [Code] |
| CR-11 | Goods receipt line result | Rejected quantity = received − accepted. Line is Accepted when nothing is rejected and all checks pass; Rejected when nothing is accepted; Partial otherwise. The receipt is Approved when all lines are Accepted, Rejected when all are Rejected, else Partially approved | REQ-E07-06 | [Code] |
| CR-12 | Invoice price match | Expected value = invoiced quantity × PO unit price. Where a contract price exists the tolerance is 0%. Otherwise matched when \|invoice amount − expected value\| ÷ expected value ≤ 2% **and** the difference is within an absolute rupiah cap set by Finance (PQ-05). Outside either limit the exception is Price variance | REQ-E07-07 | [Owner, 2026-09-21] |
| CR-13 | Invoice quantity match | Any rejected goods receipt quantity on the referenced receipts makes the exception Quantity mismatch | REQ-E07-07 | [Code] |
| CR-14 | Invoice due and overdue | Due date = submission date + 30 days. Overdue when the due date has passed and the invoice is not paid. Days outstanding = today − due date | REQ-E07-07 | [Code] |
| CR-15 | Quote score | Only suppliers that pass the compliance gate (CR-23) are scored. Weighted score = price 40% + lead time 20% + reliability 40%. Price score = lowest price ÷ this price × 100. Lead-time score = max(0, 100 − 2 × lead-time days). Reliability score = the supplier's OTIF (REQ-E10-01); "No history" scores 50 | REQ-E03-05 | [Owner, 2026-09-21]; formulas [Code] |
| CR-16 | Multi-currency quotes | Quotes in different currencies are ranked only after an exchange rate is recorded for each currency. A rate older than 7 days must be refreshed | REQ-E03-05 | [Code] |
| CR-17 | OTIF target status | Target 90%. Meeting at 90% or more; Near from 80% to below 90%; Missing below 80% | REQ-E10-01 | [Code] |
| CR-18 | Spreadsheet number check | A number that reads differently in Indonesian and English format (for example `1.500`) is rejected with a reason, not guessed | REQ-E08-02 | [Code] |
| CR-19 | Batch total | When a stock row has batches, batch quantities must add up to the SOH | REQ-E08-02 | [Code] |
| CR-20 | Integration retry | A failed SAP message is retryable only for a transport failure (timeout, connection). A business refusal from SAP is shown with its reason and is not retried until the data is fixed | REQ-E07-08 | [Code] |
| CR-21 | Forecast commitment tolerance | Firm periods: no shortfall accepted automatically. Trade-off periods: up to 10% below forecast accepted automatically. Forecast periods: acknowledgement only | REQ-E06-02 | [Owner]; 10% mirrors CR-05 |
| CR-22 | Commitment gap colour | Commitment ÷ forecast: Green at 1.0 or more; Amber from 0.8 to below 1.0; Red below 0.8 | REQ-E06-03 | [Owner]; thresholds from CR-03 [Code] |
| CR-23 | Compliance gate | A supplier passes only when all apply: a valid halal certificate for halal materials; a valid BPOM registration where required; GMP / ISO 22716 for cosmetic raw material; status not Suspended or Blacklisted; OTIF at or above the gate minimum, where "No history" passes. A supplier that fails can be invited and can answer, but **cannot be awarded**; the reason is shown to the buyer | REQ-E03-01, REQ-E03-05 | [Owner, 2026-09-21]; OTIF minimum value open (A-05) |
| CR-24 | Alert risk class | Days of cover compared with the supplier's lead time for that material: High when cover is below the lead time; Medium when below 1.5 × lead time; Low otherwise. CR-02 applies only where no lead time exists | REQ-E08-05 | [Owner, 2026-09-21] |
| CR-25 | Goods receipt quantity tolerance | Over-delivery: 0%, so any quantity above the order is a decision, not a default. Under-delivery: a shortfall above 2% is flagged and the receipt stays open. Values held per material | REQ-E07-06 | [Owner, 2026-09-21] |
| CR-26 | Forecast commitment deadline | Firm periods: 1 working day after publication. Trade-off and Forecast periods: 3 working days after publication | REQ-E06-02 | [Owner, 2026-09-21] |

**Starter reason codes** [Code], used by REQ-E07-02 (Adjust), REQ-E08-04 (capacity shortfall), and REQ-E06-02 (commitment shortfall) until the Material Planner supplies the final list: Capacity, Material, Logistics, Quality, Other (with a note).

### 3.6a Creating a sourcing event

How an RFI, RFQ or RFP comes into being, before it reaches suppliers [Owner, A-04, 2026-09-18; amended by the owner on 2026-09-21, RFX-D1 to RFX-D5, and on 2026-09-25, RFX-D6 to RFX-D14, in section 9]. The same rules apply to all 3 event types.

- CE-01. The buyer creates the event. There is no sourcing request object in the MVP: a planner or requester asks Procurement outside the hub. Sourcing request (E03.01) stays a stub for a later phase [Owner].
- CE-02. Where a purchase requisition exists, the buyer can start an RFQ from it, and its fields are pre-filled (REQ-E03-03 BR-04). A requisition is never required [Owner].
- CE-03. The buyer starts from one of four points: a blank event; the central library (1 RFI template per category family, the standard RFP term list, and 1 item-type spec template per packaging type for the RFQ); a template the buyer's team saved (CE-04); or a copy of a past event of the same type (CE-04). The buyer adds or removes questions, terms, items or fields for that 1 event; the library is not changed by doing so [Owner; starting points Owner, 2026-09-21, RFX-D2].
- CE-04. **Replaced on 2026-09-21 (RFX-D2).** A buyer can save an RFI, RFQ or RFP as a template, start a new event from a template, and copy a past event into a new one. A template keeps the content (sections, questions, terms, options, items, spec fields, quantity breaks, one-time costs requested, event settings) and never the invitees or dates. A copy keeps the content and the invitees, and its dates are cleared. Everything is editable before the event is sent [Owner, 2026-09-21]. A saved template is available to every buyer in Procurement, not only to the buyer who saved it [Proposed]. The rule this replaces (no save-as-template, no copy, decided 2026-09-18) is kept in section 9 as the A-04 record.
- CE-05. Procurement owns the question library, the term list and the item-type spec templates. A change is made by IT on Procurement's request; there is no admin screen in the MVP [Owner]. Saved templates (CE-04) belong to the buyers and never change the library [Owner, 2026-09-21].
- CE-06. No approval is needed before an event is sent: the buyer sends it. Creating and sending are separate permissions, so a second pair of eyes can be required by giving them to different people, but the hub does not demand it [Owner].
- CE-07. Every event carries a response deadline, at least 1 invited supplier, and the scope the suppliers answer, before it can be sent [Proposed].
- CE-08. The whole event is auditable: who created it, what was added or removed against the template, who sent it, and when [Proposed; charter requires 100% sourcing documentation].
- CE-09. RFI, RFQ and RFP are independent: each can be created alone, and none is a required step before another [Owner, 2026-09-21, RFX-D3; MN-RFX-04]. The allowed links are RFI → RFQ, RFI → RFP, RFP → RFQ, and purchase requisition → RFQ. The new event is pre-filled from its source, every field stays editable, the event records its source, and it shows "Created from …" with the source's number [Owner, 2026-09-21, RFX-D3].
- CE-10. Open-spec requests, where PTI wants recommendations, options, samples or indicative prices, are run as an RFP or an RFI; firm prices by quantity break are asked for in an RFQ, or in a firm-offer round inside the RFP (REQ-E03-04 BR-15) [Owner, 2026-09-21, RFX-D4; amended 2026-09-25, RFX-D6]. Every price a supplier gives is labelled on screen as **Indicative** (RFI price range, RFP pricing) or **Firm** (RFQ, and a price given in an RFP firm-offer round, shown with its validity date). No leading platform has a native flag for this, so it is an explicit field of the hub [Owner, 2026-09-21; Market, section 8.3; firm-offer label Owner, 2026-09-25, RFX-D6; PR #57, #67].
- CE-11. Files a buyer or supplier attaches to an event (brief, drawings, reference images, a quotation PDF, the supplier's response documents) are part of the event record and are kept with it [Proposed]. Until file storage exists (BACKLOG BL-27), the hub must say plainly when a file is kept only for the session, and the buyer's file view says which files are no longer held [Owner, 2026-09-17, SC-04; buyer view Owner, 2026-09-25; PR #55, #62].

**Supplier documents in responses** (NR-1 in `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`). These rules apply to the RFI, the RFP and the RFQ alike. A rule that shipped is tagged with the owner's acceptance of 2026-09-25 and the PR that built it; a rule not yet built keeps its original tag.
- CE-11a. Every RFI, RFP and RFQ response has a response-level file area, whether or not the buyer asked for a document (NR-1 BR-01) [Owner, 2026-09-25; PR #56, #63].
- CE-11b. The buyer can add document requests to an RFI, RFP or RFQ before sending it: a name, a type (Certificate, Specification, Drawing, Sample photo, Quotation, Company profile, Other), required or optional, and on an RFQ the whole response or one item. A request after sending waits on amendments (BL-92), so meanwhile the buyer asks through a clarification (NR-1 BR-02) [Owner, 2026-09-25; PR #56, #60].
- CE-11c. Submit is refused while a required request has no file, and the refusal names the request (NR-1 BR-03) [Owner, 2026-09-25; PR #56, #63].
- CE-11d. A Certificate request also takes the certificate number, issuer and expiry date. A certificate that has expired by the supplier's deadline is flagged to the buyer, and the submission is not refused (NR-1 BR-04) [Owner, 2026-09-25, RFX-D14; PR #56, #62, #63]. An RFx certificate is evidence for the buyer only: it does not update the compliance registry or the compliance gate (CR-23) [Proposed; NR-1 section k].
- CE-11e. File limits: at most 25 MB per file and 30 files per response. Allowed types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, PNG, DWG, DXF, STEP, STP. No ZIP and no executables. A file over a limit is refused when it is picked, and the verb refuses it again on save and submit (NR-1 BR-05) [Owner, 2026-09-25, RFX-D8; PR #55, #56, #63].
- CE-11f. A supplier's files are visible only to that supplier and to PTI, never to another supplier. Files on a Draft response are invisible to PTI. On a confidential event the document requests are withheld until the supplier accepts the terms (NR-1 BR-06, BR-07) [Owner, 2026-09-25; PR #56, #62].
- CE-11g. A submitted response can be revised until the supplier's deadline, extensions included. Each revision is a new version, every version is kept with its files, and the buyer reads the latest. A save on a submitted response is refused and the supplier is told to revise. After the deadline, save, submit and revise are all refused by the verb, not only hidden (NR-1 BR-08, AC-07). This amends the RFI and RFP response lifecycles: a submitted response is no longer final before the deadline (REQ-E03-02 BR-18, REQ-E03-04 BR-14) [Owner, 2026-09-25, RFX-D11; PR #59, #63].
- CE-11h. A revised quote in a negotiation round can carry files and passes the same document rules (NR-1 BR-09) [Owner, 2026-09-25; PR #63]. A firm offer in an RFP firm-offer round (REQ-E03-04 BR-15) can also carry files; each version keeps the files it was sent with, and the buyer sees them on the round [Proposed; built as BACKLOG BL-129].
- CE-11i. The record keeps when each file was uploaded, the version that first holds it, and every time PTI opens or downloads it, with who and when (NR-1 BR-10) [Owner, 2026-09-25; PR #56, #59, #62]. Who uploaded each file is also recorded: the person in the session when the file first arrives, never a name the upload itself supplies, kept unchanged while the file is carried into a later save or version. Until sign-in names a person the buyer sees the unnamed-user wording with the supplier the file belongs to, and a file stored before the uploader was recorded reads "Not recorded" [Proposed; built in PR #73, BACKLOG BL-123 closed]. The access log lasts as long as the session until file storage exists (BL-27).
- CE-11j. Supplier files are never copied into a follow-on event; the new event shows "Created from …" (CE-09). Document requests do carry over through templates, copies and pre-fills (NR-1 BR-11) [Owner, 2026-09-25; PR #56].
- CE-11k. The buyer opens and downloads each supplier file from the event page, grouped by supplier, with its request, type, size, upload time, certificate fields and version (NR-1 buyer step 5) [Owner, 2026-09-25; PR #62]. "Download all" as 1 ZIP waits on file storage (NR-1 AC-04) [Proposed; BACKLOG BL-122].
- CE-11l. The comparison shows a "Documents" row per supplier: Complete, or Missing with the names of the required requests left empty (NR-1 buyer step 6) [Owner, 2026-09-25; PR #62].
- CE-11m. Starting targets, reviewed after 3 months [Owner, 2026-09-25, RFX-D13]: supplier files retrievable at award ÷ supplier files uploaded, 100% (needs BL-27); responses with every required request filled at submit ÷ submitted responses, 95%; buyer clarifications asking for a missing document, down 80% within 3 months.

**Vendor qualification and sourcing type** (MR-10 in `SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`). These rules apply to the RFI, the RFQ and the RFP alike, and each of REQ-E03-02 to REQ-E03-05 refers to them.
- CE-12a. Every vendor has exactly 1 qualification level: Registered (below Approved), Approved or Preferred (MR-10 BR-01) [Owner, 2026-09-29; PR #91].
- CE-12b. Qualification is separate from lifecycle status. Only an Active vendor can be invited, whatever its level, so a Suspended Preferred vendor cannot be invited (MR-10 BR-02) [Owner, 2026-09-29; PR #109].
- CE-12c. The level is computed from documents only, at read time: a document counts when its status is Valid and it is not expired on the day. There is no manual override up; Procurement suspends a vendor through its lifecycle status. The history of level changes, each with the document or list change that caused it, is replayed from the document and list records, never written during a read (MR-10 BR-03) [Owner, 2026-09-29; PR #91]. A document within its expiring window (180 days, the supplier-document window) is listed to the vendor as expiring [Owner, 2026-09-29; PR #91; corrected from "90 days", plan AR-18].
- CE-12d. The documents required per level are set in the admin screen, each by document category with an optional certificate type. The Preferred list always includes every Approved document. The lists are edited by Procurement and by Quality (the `compliance` lane), who define them together (MR-10 BR-04) [Owner, 2026-09-29, MAT-D15, MAT-D18; PR #91]. Until they save real lists, placeholder lists are in force and labelled "Placeholder, awaiting Procurement and Quality" [Owner, 2026-09-29, MAT-D15; BACKLOG BL-146].
- CE-12e. Eligibility: a Direct event accepts Preferred vendors; an Indirect event accepts Approved and Preferred (MR-10 BR-05) [Owner, 2026-09-29; PR #109].
- CE-12f. Procurement maps each sourcing category and purchasing group to Direct or Indirect once, in the admin screen; every mapping starts as Direct. An event takes its sourcing type from its category or purchasing group and shows it; the buyer does not type it. The type is stored at publish and cannot change after. An event published before this rule reads Direct (MR-10 BR-06, edge case 4) [Owner, 2026-09-29, MAT-D13; PR #109].
- CE-12g. Eligibility is checked at invite (a vendor below the level is listed greyed out, with its missing documents, and cannot be picked), at publish (refused, naming the vendor) and at award (refused, with the reason). A vendor that drops a level mid-event can still respond, but cannot be awarded until it is back at the level (MR-10 BR-07) [Owner, 2026-09-29, MAT-D14; PR #109]. **While a list for the needed level is a placeholder, the 3 checks warn instead of refusing:** the vendor shows "Not qualified: <missing documents>", can be invited and published, and an award to it needs a reason; the warnings are stored on the event and the award. Enforcement switches on by itself once Procurement and Quality save a real list [Owner, 2026-09-29, MAT-D19; PR #109].
- CE-12h. The hub is the source of the qualification, because the documents live in the hub. When a SAP vendor master interface exists, the level is sent to SAP (MR-10 BR-08) [Owner, 2026-09-29; the send waits on BACKLOG BL-155].
- CE-12i. The free-text scorecard statuses "Preferred Supplier" and "Approved Supplier" are replaced by the computed level (MR-10 BR-09) [Owner, 2026-09-29; PR #91].
- CE-12j. A supplier application approved in onboarding does not make the vendor "Approved"; the application state is shown as "Application accepted" (MR-10 BR-10) [Owner, 2026-09-29; PR #91].

**Why it is worth revisiting later.** CE-01 leaves the ask in email, and CE-05 means a new question or spec field waits on an IT change. Both are acceptable while the pilot runs a handful of events; neither scales to routine sourcing. The candidates are the sourcing request (E03.01) and an admin screen for the library.

### 3.7 Hub navigation

The menu follows the hub's own sections, not procurement stages, and each PTI user sees only the sections for their role [Owner, 2026-09-17]. Item names are the same for PTI and suppliers wherever the object is the same.

**PTI users** (as built on 2026-10-21 by the navigation evaluation, `research/PORTAL-IA-EVALUATION-2026-10.md`)

| Section | Items | Roles | Requirements |
|---|---|---|---|
| Home | My tasks; Supplier follow-ups | All | Section 3.8 |
| Order collaboration | Purchase orders (Summary and List views); Call-offs; Shipments & ASN; Goods receipts | MP | REQ-E07-01 to REQ-E07-06, REQ-E09-01 to REQ-E09-04 |
| Weekly plan | This week; What to order; Make warehouse room; Publish to suppliers; Foresight commitments; Demand anticipation | MP | REQ-E06-01 to REQ-E06-03, DRC |
| Review | Supplier performance; Forecast quality; Feedstock reconcile; Demand anticipation history | MP | REQ-E10-01, REQ-E06-04, DRC-D14, DRC-D18 |
| Inventory & capacity | Stock; Stock simulation; Capacity; Alerts; Supplier access; Trade names | MP | REQ-E08-01 to REQ-E08-08 |
| Sourcing | Requisitions; RFI; RFQ; RFP; Suppliers; Supplier documents | BUY | REQ-E03-01 to REQ-E03-05; Foundation |
| Invoices | Invoices | FIN | REQ-E07-07 |
| Audit | Demand anticipation history | BUY, FIN | DRC-D18 |
| Performance | Supplier performance; Feedstock reconcile | BUY | REQ-E10-01, REQ-E06-04 |

**Suppliers**

| Section | Items | Requirements |
|---|---|---|
| Home | To do | Section 3.8 |
| Orders | Purchase orders (Summary and List views); Call-offs; Shipments & ASN; Goods receipts | REQ-E07-01 to REQ-E07-06, REQ-E09-03, REQ-E09-04 |
| Planning | Foresight commitments; Feedstock reconcile; Stock; Capacity | REQ-E06-01, REQ-E06-02, REQ-E06-04, REQ-E08-02, REQ-E08-04 |
| Sourcing | RFI invitations; RFQ invitations (with negotiation rounds); RFP invitations | REQ-E03-02 to REQ-E03-05 |
| Invoices | Invoices | REQ-E07-07 |
| Company | Profile & documents; My performance | Foundation; REQ-E10-01 |

"Foresight commitments" is the one name for REQ-E06-02 on both personas and on the Order summary column [Owner, 2026-10-21; the business's word, MN-ORD-11]. Stock simulation stays its own page until MAT-D2's review, so the Stock page keeps BR-01's "no separate available figure"; each Stock row links to it [Owner, 2026-10-21].

**Rules.**
- NV-01. Help, glossary, and administration (reason codes, working calendar, tolerances and rule values, alert thresholds and stale periods, 3PL list, SAP interface monitor, roles) sit in the user menu, not the main menu [Owner]. Every administration change is recorded with who, when, and the old and new value.
- NV-02. The persona switch reads "PTI / Supplier". The PTI role is chosen from the user menu [Owner].
- NV-03. A menu item stays highlighted on its detail pages (for example a PO opened from Purchase orders) [Owner].
- NV-04. Every menu item has its own icon [Owner].
- NV-05. A page's section label is taken from the menu, so it always matches the menu [Owner].
- NV-06. Features outside the MVP are hidden from the menu during the pilot [Owner; see section 2.3 of the PRD]. RFI, RFQ and RFP are all MVP features, so the rule never folds them into one sourcing item or hides any of them; how they appear is NV-07 [Owner, 2026-09-21, RFX-D1].
- NV-07. RFI, RFQ and RFP are three separate modules, each its own menu item under Sourcing with its own page, title and count, for buyers and suppliers alike; they are not tabs of one sourcing page. This replaces the earlier design, in which one sourcing page switched between the three with tabs. Older addresses redirect to the new ones [Owner, 2026-09-21, RFX-D1]. The modules are linked only by the pre-fills in CE-09.

### 3.8 Screen conventions

- SC-01. **Home is a task list**, sorted by deadline: responses due, escalations, missing confirmations, alerts, and reminders. Each task opens the record where the action is taken [Owner].
- SC-02. **Every record shows its steps.** A PO or call-off shows its lifecycle (response → confirmations → ASN → goods receipt → invoice) with the current step and the next action highlighted [Owner].
- SC-03. **Task first.** On a working page, an action banner ("1 order needs your confirmation") sits above summary figures [Owner].
- SC-04. **Business language only.** Screens show no system or integration terms. Data that is not live shows 1 plain "Sample data" badge [Owner].
- SC-05. **One "as of" date** per page for all figures on it [Owner].
- SC-06. **Readable labels.** Section labels are at least 12px. Text meets WCAG 2.1 AA contrast [Owner].
- SC-07. **Keyboard and screen reader.** Every action can be reached by keyboard, and every control has an accessible name. Tested before UAT [Owner].

---

## 4. Requirement index

| ID | Name | Epic | Phase | Status |
|---|---|---|---|---|
| REQ-E01-nn, REQ-E02-nn | Foundation | E01, E02 | MVP | Reserved |
| REQ-E03-01 | Supplier filtering for sourcing events | E03 | MVP | Validated |
| REQ-E03-02 | Request for Information (RFI) | E03 | MVP | Validated; authoring detail Proposed (A-03); documents and revise Validated (RFX-D8, RFX-D11) |
| REQ-E03-03 | Request for Quotation (RFQ) with RFI reuse | E03 | MVP | Validated (RFX-D1 to RFX-D5); Proposed (item, break and response detail) |
| REQ-E03-04 | Request for Proposal (RFP) | E03 | MVP | Validated; authoring detail Proposed (A-03); firm-offer round and award Validated (RFX-D6) |
| REQ-E03-05 | Bid comparison, negotiation, and awarding | E03 | MVP | Validated (negotiation; per-item split award by % or quantity, partial award, cancel before SAP; RFX-D5, RFX-D7, RFX-D9, RFX-D12); Proposed (detail) |
| REQ-E06-01 | Forecast publication | E06 | MVP | Validated (owner, E06-R) |
| REQ-E06-02 | Foresight / fixed-stock confirmation | E06 | MVP | Validated (owner, E06-R) |
| REQ-E06-03 | Forecast-commit gap monitoring | E06 | MVP | Validated (owner, E06-R) |
| REQ-E06-04 | Fixed stock (FS) reconcile; superseded 2026-10-19 by DRC-15a (feedstock reconcile) | E06 | MVP | Validated (team 2026-09-28, ENG-D21; owner 2026-09-29); superseded, rework BL-201 |
| REQ-E07-01 | PO visibility with quantity and timing breakdown | E07 | MVP | Validated |
| REQ-E07-02 | PO response: approve, adjust, reject, escalate | E07 | MVP | Validated |
| REQ-E07-03 | Order Collaboration Summary | E07 | MVP | Validated (drill-through and lifecycle columns, 2026-09-19) |
| REQ-E07-04 | Advanced shipping notice | E07 | MVP | Validated (shipping notice; batch, shelf-life and call-off checks, owner 2026-09-29); Proposed (ASN detail) |
| REQ-E07-05 | Shipping notice confirmation | E07 | MVP | Validated |
| REQ-E07-06 | Goods receipt confirmation | E07 | MVP | Proposed |
| REQ-E07-07 | Invoice collaboration | E07 | MVP | Proposed |
| REQ-E07-08 | Order data interface with SAP | E07 | MVP | Proposed |
| REQ-E08-01 | Inventory visibility | E08 | MVP | Validated |
| REQ-E08-02 | Supplier stock submission | E08 | MVP | Validated |
| REQ-E08-03 | Supplier access to PTI stock | E08 | MVP | Validated |
| REQ-E08-04 | Capacity confirmation | E08 | MVP | Proposed (confirmation concept validated); planning groups Validated (owner, 2026-09-29) |
| REQ-E08-05 | Inventory and capacity alerts | E08 | MVP | Proposed; order and close reasons Validated (owner, 2026-09-29) |
| REQ-E08-06 | Supplier trade names and one material search | E08 | MVP | Validated (owner, 2026-09-29) |
| REQ-E08-07 | MRP controller (PIC) per material | E08 | MVP | Validated (owner, 2026-09-29) |
| REQ-E08-08 | Supplier stock simulation | E08 | MVP | Validated (owner, 2026-09-29) |
| REQ-E09-01 | Replenishment recommendation from the forecast engine | E09 | MVP | Proposed (source decided, ENG-1) |
| REQ-E09-02 | Event-based strategy analysis | E09 | MVP | Proposed |
| REQ-E09-03 | Call-off release and supplier confirmation | E09 | MVP | Proposed |
| REQ-E09-04 | Delivery execution: need date and dispatch heads-up | E09 | MVP, P1 | Proposed |
| REQ-E10-01 | CFOT and OTIF measurement | E10 | MVP | Validated (definitions); Proposed (formulas) |
| REQ-E13-01 | Supplier access to TMS shipment tracking | E13 | Phase decision open (D-03) | Validated |
| REQ-E14-01 | Engine data foundation | E14 | MVP | Proposed; partly built on synthetic data (BL-102, PR #37; BL-109, PR #46) |
| REQ-E14-02 | Supplier reliability and plan-change measures | E14 | MVP | Proposed |
| REQ-E14-03 | Material requirement calculation | E14 | MVP | Proposed |
| REQ-E14-04 | Safety stock, safety lead time and reorder point | E14 | MVP | Proposed |
| REQ-E14-05 | Order sizing within MOQ and warehouse space | E14 | MVP | Proposed |
| REQ-E14-06 | Stabilise and publish the plan to suppliers | E14 | MVP | Proposed; built on synthetic data (BL-108, PR #48) |
| REQ-E14-07 | Finished-goods demand forecast | E14 | MVP | Proposed |
| REQ-E14-08 | Launches and promotions | E14 | MVP | Proposed |
| REQ-E14-09 | Demand range | E14 | MVP | Proposed |
| REQ-E14-10 | Choosing models by service, not accuracy | E14 | MVP | Proposed |
| REQ-E14-11 | Forecast bias and planner override control | E14 | MVP | Proposed |
| REQ-E14-12 | Where to hold buffers | E14 | Phase 2 | Proposed |
| REQ-E14-13 | Reschedule or cancel open orders (warehouse relief) | E14 | MVP | Proposed; built on synthetic data (BL-107, PR #44) |
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

**Business value.** Buyers today pick invitees by memory or spreadsheet, so the same few suppliers get invited and performance is ignored [Deck p.3, C4]. Filtering by category, purchasing group, and performance makes invitations consistent and puts OTIF to use in sourcing decisions. Moves KPI-06 procurement cycle time.

**Experience.**
- BUY: while building an RFI, RFQ, or RFP, opens "Invite suppliers", filters the supplier list by category and purchasing group, sees each supplier's OTIF next to its name, and selects invitees.

**Step-by-step (Buyer, sourcing a new packaging material).**
1. The buyer creates an RFQ and opens the invitation step.
2. The buyer filters by category "Plastic bottle" and purchasing group.
3. The list shows matching active suppliers with their OTIF [MN-ORD-09].
4. The buyer adds 1 more filter from the parameter list (to be provided, A-02).
5. The buyer selects 5 suppliers and moves to the next step.

**Business rules.**
- BR-01. Filters include at least category (commodity) and purchasing group, usable alone or together [MN-RFX-01; Owner].
- BR-02. The full filter parameter list is provided by Procurement later [MN-RFX-01; A-02].
- BR-03. Supplier OTIF is visible during supplier sourcing [MN-ORD-09].
- BR-04. Only active suppliers are selectable. Blacklisted or deactivated suppliers are hidden [Proposed; Deck p.7 E02.03].
- BR-05. Further filters, in this order: certificate validity (halal and BPOM expiry), performance band, and country or region [Owner, 2026-09-21; A-02].
- BR-06. A supplier that fails the compliance gate (CR-23) can still be found and invited; the list shows that it cannot be awarded and why [Owner, 2026-09-21].

**Edge cases.**
- A supplier has no OTIF history yet: show "No history" instead of 0% [Proposed].
- No supplier matches the filters: show an empty state with the active filters and a clear-filters action [Proposed].

**Acceptance criteria.**
- AC-01. A buyer can filter invitees by category and by purchasing group, alone or combined.
- AC-02. Each listed supplier shows its OTIF, or "No history".
- AC-03. Blacklisted and deactivated suppliers do not appear in results.

**Data and integration.** Supplier master (category, purchasing group, status) from the Foundation epics. OTIF from REQ-E10-01. Purchasing group from SAP MM [Proposed].

**Metrics.** Leading: share of events whose invitees were chosen through filters. Lagging: KPI-06.

**Open items.** A-02 (full parameter list). A-01 (compliance and capability check with Mas Ary Hidayat).

#### REQ-E03-02  Request for Information (RFI)

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.02; MN-RFX-02, MN-RFX-03, MN-RFX-04; RFX-D1 to RFX-D4, RFX-D8, RFX-D11, RFX-D14 | MVP | P1 [Proposed] | Procurement | BUY, SUP | Validated; authoring detail Proposed (A-03); documents and revise Validated (RFX-D8, RFX-D11) |

**Business value.** Before asking for prices, buyers need to know what a supplier can make, where, and how. A structured RFI replaces ad-hoc email questionnaires [Deck p.3, C2] and creates reusable supplier capability data for later RFQs and RFPs.

**Experience.**
- BUY: creates an RFI from the category template, a saved template, or a copy of a past RFI (section 3.6a); groups questions in sections, adding its own; chooses a type for each question; attaches the brief, drawings or reference images; lists the documents it needs from suppliers; optionally asks suppliers to accept confidentiality terms first; reviews responses and supplier documents side by side; turns the RFI into an RFQ or an RFP.
- SUP: receives the invitation, accepts the confidentiality terms where the RFI has them, fills in capability, experience, facility, and product entries and the buyer's questions, attaches its documents, submits, and can revise until the deadline.

**Step-by-step (Supplier, responding to an RFI).**
1. The supplier opens the RFI invitation from its task list.
2. If the RFI is confidential, the supplier sees only the title and the terms, and accepts them. The acceptance is recorded with the time, and the content opens [Proposed; Market, section 8.3].
3. The supplier describes its capabilities and relevant experience [MN-RFX-02].
4. The supplier adds its facilities, each with a description [MN-RFX-03].
5. The supplier adds its products as catalog entries, each with a description [MN-RFX-03].
6. The supplier answers the buyer's own questions, including an indicative price range where asked.
7. The supplier submits before the deadline. The buyer sees the response in the RFI comparison view.

**Business rules.**
- BR-01. An RFI asks for the vendor's capability and experience, and for the product or service specifications it offers [MN-RFX-02].
- BR-02. RFI output is structured as capability, facility, and product (product catalog), each with a description [MN-RFX-03].
- BR-03. An RFI is not a required step before an RFQ or RFP [MN-RFX-04; Owner, 2026-09-21, RFX-D3].
- BR-04. RFI responses stay stored against the supplier so they can feed a later RFQ or RFP [MN-RFX-04].
- BR-05. An RFI carries a response deadline set by the buyer [Proposed].
- BR-06. Questions are grouped in sections: the template sections A to F, plus any section the buyer adds for the event, which needs a title [Proposed; Market, section 8.3].
- BR-07. Each question has one of 11 types: short text, long text, yes/no, single choice, multiple choice, number with unit, money, percentage, date, attachment, and indicative price range. Number, money and percentage can carry a minimum and a maximum; a percentage lies between 0 and 100; money and a price range name a currency PTI accepts. Every question has a required flag and an optional help text [Proposed; Market, section 8.3].
- BR-08. A single-choice or multiple-choice question is its option list: the buyer writes the options in an option editor, at least 2, none blank and none repeated [Proposed].
- BR-09. A supplier's answer must fit its question: yes or no for yes/no, one of the listed options for a choice, a number within the bounds, a real date. An answer that does not fit is refused with the reason [Proposed].
- BR-10. An indicative price range is labelled **Indicative** to the buyer and the supplier, and is never used as a firm price or in an award (CE-10) [Owner, 2026-09-21, RFX-D4].
- BR-11. The buyer can attach files to the RFI (brief, drawings, reference images). Files follow CE-11 [Proposed].
- BR-12. The buyer can make the RFI confidential. A supplier that has not accepted the confidentiality terms sees none of the scope, questions or files, and cannot save an answer. The buyer sees who has accepted and when [Proposed; Market, section 8.3].
- BR-13. The buyer can save the RFI as a template, start from a template, or copy a past RFI (CE-04) [Owner, 2026-09-21, RFX-D2].
- BR-14. From an open or closed RFI the buyer can create an RFP: the title, category family, scope, the RFI's questions as scope notes, the suppliers who submitted, and the attachments are copied, and the RFP shows that it was created from the RFI. The buyer can also create an RFQ from it (REQ-E03-03 BR-02) [Owner, 2026-09-21, RFX-D3].
- BR-15. Question weights stay as they are: a weighted question produces a response score that shortlists and never awards [Proposed]. Knock-out and show-if questions are later (section 5.2, "RFx: later, not in the MVP").
- BR-16. The buyer can edit a draft RFI before sending it [Proposed].
- BR-17. The RFI can carry document requests, and the response carries the supplier's documents, under CE-11a to CE-11l [Owner, 2026-09-25, RFX-D8; PR #56, #60, #62, #63].
- BR-18. A submitted RFI response can be revised until the supplier's deadline, and every version is kept with its files (CE-11g) [Owner, 2026-09-25, RFX-D11; PR #59, #63].
- BR-19. The RFI shows its sourcing type (CE-12f), and its invitees are checked for qualification at invite and at publish (CE-12e, CE-12g) [Owner, 2026-09-29, MAT-D13, MAT-D14; PR #109].

**Edge cases.**
- The supplier saves a partial response: keep it as a draft, not visible to the buyer until submitted [Proposed].
- The deadline passes: the buyer can extend it for all or selected invitees [Proposed].
- A supplier tries to answer a confidential RFI without accepting the terms: the save is refused with the reason [Proposed].
- A draft response is never carried into a follow-on RFQ or RFP; only suppliers who submitted become invitees [Proposed].

**Acceptance criteria.**
- AC-01. A buyer can create and send an RFI without any prior or following RFQ.
- AC-02. A supplier can submit capability, experience, facility, and product entries, each with a description.
- AC-03. Submitted product entries are stored in a form a later RFQ can select from (REQ-E03-03).
- AC-04. A buyer can add a section, and a question of each of the 11 types, with a required flag and help text; a choice question with fewer than 2 options cannot be saved.
- AC-05. An answer that does not fit its question is refused with the reason.
- AC-06. On a confidential RFI, a supplier that has not accepted the terms sees no scope, question or file, and its answers cannot be saved; after acceptance the time is recorded and shown to the buyer.
- AC-07. An indicative price range reads "Indicative" wherever it is shown.
- AC-08. A buyer can save the RFI as a template and start a new RFI from it; a copy of a past RFI carries its content and invitees, and its dates are empty.
- AC-09. "Create RFP" on an RFI opens an RFP pre-filled with the scope, scope notes and submitted responders, all editable, and the RFP shows its source.
- AC-10. A supplier can attach a file to an RFI response with no document request; a required request left empty blocks submission and is named.
- AC-11. A submitted RFI response revised before the deadline shows as the new version and the earlier version stays readable; after the deadline the verb refuses the revision.

**RFI template** [Proposed; Market; pending user use cases, A-03]. How an event is created from a template is in section 3.6a. A template is a set of reusable sections plus questions from a question library. Procurement keeps 1 template per category family, such as "Packaging RFI" and "Raw material RFI". The buyer starts from a template and can add or remove questions for one event. Company identity (legal name, tax ID, address, bank) is read from the supplier master (Foundation) and never asked again.

| Section | What the supplier answers | Structured as |
|---|---|---|
| A. Capability | Categories supplied (from the category list); production processes, such as injection moulding, blow moulding, printing, compounding; in-house testing and R&D | Multi-select from lists, plus a description |
| B. Experience | Years supplying the category; reference customers in cosmetics, personal care, or food; similar products made; export markets | Rows of reference, product, years, plus a description |
| C. Facilities | Per site: location, type (factory, warehouse), monthly capacity with unit, key equipment, site certifications | 1 row per site, with a description |
| D. Products | Catalog lines: product name, category, specification summary, unit, MOQ, standard lead time, sample available, datasheet | 1 row per product, with a description and attachment |
| E. Compliance | Halal status and certificate, BPOM, ISO 9001 / 22716 (GMP), REACH where relevant, sustainability commitments | Yes/no or choice per item, certificate upload with expiry date |
| F. Event questions | Questions the buyer adds for this event, in section F or in sections of the buyer's own | The 11 question types in BR-07. Each can be marked required and carry help text |

Template rules:
- A required question blocks submission until answered.
- Sections A to D map to the capability, experience, facility, and product structure in BR-02, so answers are stored against the supplier and reused (BR-04).
- The buyer can give a question an optional weight. Weighted questions produce a response score used only to shortlist suppliers for an RFQ or RFP.

**Data and integration.** RFI event with its sections, questions, attachments, confidentiality terms and source (template or copied event); invitee list; confidentiality acceptance per supplier with time; response with capability, experience, facility, and product lines, typed answers, response documents and its submitted versions; document requests on the event. Product lines overlap with Catalog Management (E05), which the deck puts in Phase 2 (D-07).

**Metrics.** Leading: RFI response rate; median time to respond. Lagging: KPI-06.

**Open items.** D-07: the catalog needed by RFI is Phase 2 in the deck. A-01. A-03 (RFI template review with users).

#### REQ-E03-03  Request for Quotation (RFQ) with RFI reuse

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.02, E03.03; MN-RFX-04; RFX-D1 to RFX-D5, RFX-D8, RFX-D14 | MVP | P1 [Proposed] | Procurement | BUY, SUP | Validated (independence, reuse, templates, firm tiered prices, supplier documents); Proposed (item, break and response detail) |

**Business value.** RFQs run by email today [Deck p.3, C2]. Paragon's real RFQs (Oslo stickers, Iron unit box, Redwood 2.0 mold) ask for several items, each with a spec sheet, priced at 3 to 6 quantity breaks, with plate or mold costs on top. A hub RFQ with that shape collects quotes that can actually be compared, and reusing RFI, RFP and past RFQ content saves the buyer re-typing specifications.

**Experience.**
- BUY: creates an RFQ from scratch, from a template, from a copy of a past RFQ, from an RFI, from an RFP, or from a purchase requisition (section 3.6a); adds items with their spec sheets, the quantity breaks, the one-time costs to be quoted, questions and options; invites suppliers (REQ-E03-01); saves a draft or sends; answers suppliers' clarification questions.
- SUP: states "I will respond" or declines with a reason; accepts the confidentiality terms where the RFQ has them; fills the supplier spec fields and a firm unit price per break for every item, with MOQ, lead time and one-time costs; optionally offers an alternative; answers questions; submits and can revise until the deadline; asks clarification questions.

**Step-by-step (Buyer, the Oslo sticker RFQ).**
1. The buyer starts from the sticker template, which pre-fills the item type's spec fields [Proposed].
2. Basics: title, project name "Oslo" (shown as a tag), category, currency, response deadline, award date, incoterms, payment terms.
3. Items: 2 sticker items, 8 variants each, PCS. For each, the buyer fills the buyer spec fields (material, size, colours, finishing, roll and ink standard) and leaves brand, machine and die-cut type for the supplier. A note says "Spec is the same as the existing Amplify variant sticker".
4. Quantity breaks: 3K / 5K / 7K / 10K / 25K / 50K, per variant.
5. One-time costs requested: die-cut plate and printing plate.
6. Questions and options: "Can goods ship in the 2nd week of October?" (yes/no) and "Sample ready date" (date); alternatives allowed; 20 samples needed by a date.
7. The buyer invites 4 suppliers, reviews, and sends.

**Step-by-step (Supplier, answering it).**
1. The supplier opens the invitation and chooses "I will respond". The quote grid opens.
2. For each item, the supplier fills brand, machine and die-cut type, a unit price at each of the 6 breaks, MOQ, lead time, and the plate costs.
3. At RFQ level: currency, validity date, payment terms offered, answers to the 2 questions, the sample offer (can sample, ready date), notes, and its quotation PDF.
4. The supplier submits. Before the deadline it can revise; each version is kept.

**Business rules.**
- BR-01. An RFQ can be created with or without a previous RFI or RFP [MN-RFX-04; Owner, 2026-09-21, RFX-D3].
- BR-02. When created from an RFI, the RFQ pre-fills from RFI data: each distinct product a submitted responder named becomes an item, and the submitted responders become invitees. The buyer can edit everything [MN-RFX-04; Owner, 2026-09-21, RFX-D3].
- BR-03. Suppliers cannot see other suppliers' quotes [Proposed].
- BR-04. An RFQ can also be started from a purchase requisition, which pre-fills title, category, quantity, and unit. A requisition is never required [Owner].
- BR-05. Quotes are accepted only until the response deadline. The buyer can extend the deadline for all or selected invitees [Proposed].
- BR-06. When created from an RFP, the options the buyer chooses become items and the RFP's responders become invitees, all editable [Owner, 2026-09-21, RFX-D3].
- BR-07. An RFQ has 1 or more items. Each item has an item type from the library (Sticker/label, Unit box/carton, Bottle and closure, Mold component, Other), a description, a number of variants or SKUs, a unit of measure, a spec sheet, an optional note and optional reference files [Proposed; Market, section 8.3].
- BR-08. The spec sheet comes from the item type's template. Each field is filled by the **buyer** or by the **supplier**, is text, a number with a unit, or a choice, and is required or optional. The buyer can add a custom field and remove optional ones. A required buyer field must be filled before sending; a required supplier field must be filled before the supplier can submit [Proposed; Market, section 8.3].
- BR-09. The buyer sets 1 to 8 quantity breaks, in increasing order, each marked **per variant** or **total**. An item can override the RFQ's breaks. A break can be typed as "5K" [Proposed; Market, section 8.3].
- BR-10. For each item the buyer lists the one-time costs to be quoted: mold, die-cut plate, printing plate or cylinder, development. The supplier must answer each (0 is an answer) and can add others with a name and an amount [Proposed; Market, section 8.3].
- BR-11. The buyer can add questions of the RFI types (REQ-E03-02 BR-07). A required question must be answered, and an answer must fit its question [Proposed].
- BR-12. Options: "Allow alternative offers" (off by default), "Samples requested" (quantity and date needed), and "Confidential" [Proposed; Market, section 8.3].
- BR-13. The currency the buyer picks is saved on the RFQ, and only currencies PTI accepts can be picked [Proposed].
- BR-14. Create and send are separate permissions (CE-06). A created RFQ is a draft, hidden from suppliers until sent [Owner].
- BR-15. Before quoting, the supplier states its intent: "I will respond", or decline with a reason from a list (no capacity, not our product, lead time too short, quantity too small, spec unclear, other) and its own words. The buyer sees each invitee's intent, reason and words. A supplier that declined cannot quote; a supplier with a live quote cannot decline [Proposed; Market, section 8.3].
- BR-16. On a confidential RFQ, a supplier sees no spec values, item notes or files until it accepts the confidentiality terms; the acceptance is recorded once, with the time. A quote on a confidential RFQ whose terms were not accepted is refused [Proposed; Market, section 8.3].
- BR-17. The quote has one block per item: every supplier spec field, a firm unit price at every break, MOQ, lead time in days (more than 0), and the one-time costs (BR-10). Where alternatives are allowed, the supplier can add an alternative per item: a description and a price per break. An alternative is shown apart from the main quote and is not ranked [Proposed; Market, section 8.3].
- BR-18. At RFQ level the quote carries the currency, a validity date, the payment terms offered, the answers, the sample offer (can sample, and a ready date) where samples were requested, notes, and the supplier's documents (CE-11) [Proposed; documents Owner, 2026-09-25, PR #56, #63].
- BR-19. A quote is refused, naming the item or field, when a break price, a required supplier spec value, a requested one-time cost, a required answer or a requested sample offer is missing, when an alternative is sent that the RFQ does not allow, or when it is not a per-item quote on an RFQ with items [Proposed].
- BR-20. Every RFQ price is labelled **Firm** (CE-10) [Owner, 2026-09-21, RFX-D4].
- BR-21. The supplier can revise its quote until the deadline. Each revision is a new version that names the one it replaces, and both are kept [Proposed].
- BR-22. Clarification questions: an invited supplier asks a question on the RFQ. The buyer answers privately (only the asker sees it) or publishes it (every invitee sees the question and answer, with the asker's name removed). The buyer always sees who asked [Proposed; Market, section 8.3].
- BR-23. The buyer can save the RFQ as a template and start from a template, or copy a past RFQ (CE-04) [Owner, 2026-09-21, RFX-D2].
- BR-24. The buyer can edit a draft RFQ before sending it [Proposed].
- BR-25. The buyer can add document requests to the RFQ, each for the whole response or for one item (CE-11b). When an item is removed from a draft, a request on a later item moves with its item, and a request on the removed item applies to the whole response and is named to the buyer [Owner, 2026-09-25; PR #56, #60].
- BR-26. The RFQ shows its sourcing type (CE-12f), and its invitees are checked for qualification at invite and at publish (CE-12e, CE-12g) [Owner, 2026-09-29, MAT-D13, MAT-D14; PR #109].

**Edge cases.**
- The RFI had suppliers that should not be invited to the RFQ: the buyer removes them before sending [Proposed].
- An RFQ with no items, more than 8 breaks, breaks not increasing, or a required buyer spec field empty cannot be sent; the reason names the item or break [Proposed].
- A supplier that fails the compliance gate (CR-23) can still state intent and quote; it cannot be awarded (REQ-E03-05) [Owner, 2026-09-21].
- An older RFQ with a single price per line and no items keeps the single-price quote [Proposed].

**Acceptance criteria.**
- AC-01. A buyer can create an RFQ with no RFI, no RFP and no purchase requisition.
- AC-02. A buyer can create an RFQ from an RFI, and the items and invitees are pre-filled and editable.
- AC-03. A supplier cannot view another supplier's quote.
- AC-04. A buyer can create an RFQ from a purchase requisition, and its fields are pre-filled and editable.
- AC-05. A quote cannot be submitted after the response deadline.
- AC-06. A buyer can create an RFQ with 2 items of different types, a buyer and a supplier spec field on each, 6 per-variant breaks, and requested one-time costs; 9 breaks, or breaks out of order, are refused.
- AC-07. A supplier cannot open the quote grid before stating "I will respond"; a decline without a reason or without its own words is refused; the buyer sees both.
- AC-08. On a confidential RFQ, a supplier that has not accepted the terms sees no spec values, notes or files, and its quote is refused.
- AC-09. A quote missing one break price is refused, naming the item.
- AC-10. An alternative offer is shown apart from the main quote and not ranked.
- AC-11. A revised quote keeps both versions.
- AC-12. A published clarification answer is visible to every invitee without the asker's name; a private one only to the asker.
- AC-13. A buyer can save the RFQ as a template (without invitees or dates) and start a new RFQ from it; a copy carries invitees and has empty dates.
- AC-14. A buyer can create an RFQ from an RFP, and the chosen options and responders are pre-filled and editable.
- AC-15. Every RFQ price reads "Firm" and every RFP or RFI price reads "Indicative".
- AC-16. A buyer can open a draft RFQ, change it, and then send it.
- AC-17. A quote with a required document request left empty is refused, naming the request; a 26 MB file and a .zip file are each refused when picked, with the reason.

**Data and integration.** RFQ event with project name, currency, items (type, variants, unit, spec fields with filled-by, note, attachments, one-time costs requested, break override), breaks (quantity, basis), questions, options, attachments, and its source (RFI, RFP, past RFQ, template, requisition). Intent per invitee; confidentiality acceptance with time; clarifications with visibility. Quote versions with per-item spec values, break prices, MOQ, lead time, one-time costs, alternatives, answers, sample offer, attachments.

**Metrics.** Leading: share of invitees stating intent; decline reasons by count. Lagging: KPI-06.

**Open items.** None. Bid comparison, negotiation, and awarding are REQ-E03-05.

#### REQ-E03-04  Request for Proposal (RFP)

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.02; MN-RFX-05; RFX-D1 to RFX-D4, RFX-D6 to RFX-D15 | MVP | P1 [Proposed] | Procurement | BUY, SUP | Validated; authoring detail Proposed (A-03); firm-offer round and award Validated (RFX-D6) |

**Business value.** Some purchases need commercial terms, not only a unit price, and some start before the spec is known: Tundra (a bottle and pump whose material and neck are open for the supplier's recommendation) and ICY (a full-service lip product with formula and pack options, samples and a timeline). An RFP collects terms, options and indicative prices in a comparable, auditable form. It ends either in an award on firm offers made inside the RFP or in a firm RFQ, so a full-service decision is recorded without re-running it as an RFQ (RFX-D6).

**Experience.**
- BUY: creates an RFP from the term list, a saved template, a copy of a past RFP, or an RFI (section 3.6a); writes the scope and attaches reference files; picks standard terms and adds its own; optionally attaches T&Cs to be accepted and makes the RFP confidential; optionally lists options and quantity points for indicative pricing and asks for samples; optionally adds questions and document requests; compares proposals term by term and option by option; asks shortlisted suppliers for firm offers and awards each option to 1 or more suppliers, or turns the RFP into an RFQ.
- SUP: accepts the confidentiality terms and the T&Cs where asked; responds to each term with comply or deviate; gives indicative prices per option and quantity point, can propose its own options, and states a sample offer, a timeline and a validity date; answers questions; attaches its documents; submits and can revise until the deadline; gives firm prices with a validity date when invited to a firm-offer round; sees its own outcome per option.

**Step-by-step (Buyer, the Tundra open-spec RFP).**
1. The buyer creates an RFP, standalone or after an RFI [MN-RFX-04].
2. The buyer writes the scope, attaches the reference image, and lists the commercial terms required, such as payment terms, pricing validity, and delivery terms, adding a custom term with its requested value [MN-RFX-05; term examples Proposed].
3. The buyer lists 2 options ("Full set: bottle, pump and cap"; "Pump and cap only") and quantity points 10K / 50K / 100K.
4. Suppliers submit proposals, pricing the options they choose and proposing their own. Every price reads "Indicative".
5. The buyer compares proposals term by term and option by option. For the options it is ready to decide, it asks the shortlisted suppliers for firm offers and awards on them (BR-15, BR-16); for the others it creates an RFQ from the chosen options for firm prices [Owner, 2026-09-21, RFX-D3, RFX-D4; amended 2026-09-25, RFX-D6].

**Business rules.**
- BR-01. An RFP asks for commercial terms [MN-RFX-05].
- BR-02. An RFP is not a required step before or after an RFI or RFQ [MN-RFX-04; Owner, 2026-09-21, RFX-D3].
- BR-03. The buyer picks terms from the standard list and can add custom terms. Each term has a label, a group, a value kind (text, number with unit, choice, yes/no) and PTI's requested value, which must fit the kind [Proposed; Market, section 8.3].
- BR-04. The supplier answers each term with Comply or Deviate and its proposed value, which must fit the term's kind; a comment is required on a deviation [Proposed].
- BR-05. The buyer can attach a T&C document (text, a file, or both). A supplier must accept it before it can save or submit a response [Proposed; Market, section 8.3].
- BR-06. The buyer can make the RFP confidential, with the same effect as REQ-E03-02 BR-12: without acceptance a supplier sees no scope, questions, terms, pricing, T&Cs or files [Proposed; Market, section 8.3].
- BR-07. Indicative pricing (optional): the buyer lists options, each with a title and an optional description, and quantity points, each per variant or total, and can ask for samples. The supplier prices any options it chooses at the quantity points, can propose its own options, and states a sample offer (can sample, ready date), a timeline and a validity date [Proposed; Market, section 8.3].
- BR-08. Every RFP price is labelled **Indicative** to the buyer and the supplier, except a price given in a firm-offer round, which reads **Firm** with its validity date (BR-15). Firm prices are asked for in a firm-offer round or in an RFQ (CE-10) [Owner, 2026-09-21, RFX-D4; amended 2026-09-25, RFX-D6; PR #57, #67].
- BR-09. The buyer can add a questions section with the RFI question types (REQ-E03-02 BR-07) [Proposed].
- BR-10. The buyer can attach files to the RFP (CE-11) [Proposed].
- BR-11. The buyer can save the RFP as a template, start from a template, or copy a past RFP (CE-04) [Owner, 2026-09-21, RFX-D2].
- BR-12. From an RFP the buyer can create an RFQ pre-filled from the chosen options, with the responders as invitees (REQ-E03-03 BR-06) [Owner, 2026-09-21, RFX-D3]. An option already awarded in the RFP is left out (BR-16d) [Owner, 2026-09-25; PR #66, #67].
- BR-13. The buyer can edit a draft RFP before sending it [Proposed].
- BR-14. The RFP can carry document requests, and the response carries the supplier's documents, under CE-11a to CE-11l. A submitted RFP response can be revised until the supplier's deadline, and every version is kept with its files (CE-11g) [Owner, 2026-09-25, RFX-D8, RFX-D11; PR #56, #59, #60, #62, #63].
- BR-15. **Firm-offer round** (NR-2 BR-01 to BR-04) [Owner, 2026-09-25, RFX-D6]:
  - BR-15a. After the RFP closes, the buyer can open a firm-offer round for named options (PTI's or a supplier's own) and quantity points, with a deadline and an optional message. Only suppliers that submitted and pass the compliance gate can be invited, and a failing supplier is shown with the reason. On an RFP the gate judges supplier status and OTIF only, because an RFP names a category and no material codes [Owner, 2026-09-25; PR #57, #67].
  - BR-15b. An invited supplier gives a firm unit price per option and quantity point and a validity date on or after the round deadline, and can revise until the round closes. The screen tells it: "Prices you give in this round are firm offers until the validity date you set." [Owner, 2026-09-25; PR #57, #67].
  - BR-15c. Rounds can repeat. The last firm offer per supplier and option counts, and every version is kept [Owner, 2026-09-25; PR #57].
  - BR-15d. A supplier's own option is named together with the supplier that proposed it, so options from different suppliers never merge in a round, a firm price or an award [Owner, 2026-09-25; PR #57, #66].
  - BR-15e. A round opens on a Closed or a Partly awarded RFP, and on no other status. It names only options that are still open: an option named by an award in force on the RFP, or sourced by an RFQ created from the RFP that is not cancelled, is refused by name, on either status. A Closed RFP holds no award in force, because the cancel that returns it to Closed is the one that leaves none, so there the check only ever finds an option an RFQ sources. The new round's firm prices replace the older ones for the same supplier and option (BR-15c), and awarding the remaining options with the final award moves the RFP from Partly awarded to Awarded [Owner, 2026-09-28, RFX-D15; PR #57, #66, #71].
- BR-16. **Award from an RFP** (NR-2 BR-05 to BR-10, NR-3) [Owner, 2026-09-25, RFX-D6]:
  - BR-16a. The buyer awards each option at one quantity point to 1 or more suppliers, split under REQ-E03-05 BR-06, as a final award or as a partial award that leaves options open. The RFP becomes Awarded, or Partly awarded while options stay open. The responses stay Submitted [Owner, 2026-09-25, RFX-D6, RFX-D7, RFX-D9; PR #66, #67].
  - BR-16b. An award line counts only on the supplier's latest firm offer for that option from a closed round, still valid on the award date; otherwise it is refused, naming the option [Owner, 2026-09-25; PR #66].
  - BR-16c. Every RFP award needs a reason, and a supplier failing the compliance gate at award is refused [Owner, 2026-09-25; CR-23 Owner, 2026-09-21; PR #66].
  - BR-16d. An option awarded in the RFP cannot go into an RFQ created from it, and an option that such an RFQ already covers cannot be awarded in the RFP. Options not placed either way can still go to an RFQ [Owner, 2026-09-25; PR #66, #67].
  - BR-16e. The award can be cancelled with a reason, or marked "Raised in SAP" with the SAP document number, as on an RFQ (REQ-E03-05 BR-13, BR-14) [Owner, 2026-09-25, RFX-D12; PR #66, #67].
  - BR-16f. The buyer can mark the options left open "Will not award", and the RFP becomes Awarded for the options awarded (NR-3 BR-06) Because every RFP award needs a reason (BR-16c), the close-out needs one too [Proposed; built for the RFQ (PR #64) and for the RFP (BACKLOG BL-130)].
  - BR-16g. Each responder sees only its own outcome per option: Awarded with share and quantity point, Not awarded, Pending, or Award withdrawn. It never sees another supplier's share, the reason, the cancellation or the SAP number [Owner, 2026-09-25; PR #66, #67]. A message outside the hub waits on email [Proposed; BACKLOG BL-120].
  - BR-16h. The PO or contract is created in SAP (REQ-E03-05 BR-09) [Proposed; BACKLOG BL-121].
- BR-17. The RFP shows its sourcing type (CE-12f), and its invitees are checked for qualification at invite and at publish (CE-12e, CE-12g). An RFP award follows REQ-E03-05 BR-18 to BR-20 [Owner, 2026-09-29, MAT-D13, MAT-D14; PR #109, #110].

**Edge cases.**
- A supplier proposes a term outside the listed ones: allow a free-text "other terms" field [Proposed].
- A supplier prices only some options: allowed; the comparison shows the gaps [Proposed].
- A supplier tries to respond before accepting the T&Cs: the save and the submission are refused with the reason [Proposed].
- Only 1 firm offer on an option: it can be awarded, and the comparison shows "Single firm offer" [Owner, 2026-09-25; PR #67].
- A firm offer's validity has passed on the award date: the line is refused, and the buyer opens a new round [Owner, 2026-09-25; PR #66].
- The RFP has no pricing step: no award is offered, and the page says firm prices are needed [Owner, 2026-09-25; PR #67].

**Acceptance criteria.**
- AC-01. A buyer can create an RFP with a list of required commercial terms.
- AC-02. A supplier can respond to each listed term.
- AC-03. A buyer can add a custom term with a value kind and a requested value; a requested value that does not fit the kind is refused.
- AC-04. When the RFP has T&Cs, a supplier cannot save or submit before accepting them.
- AC-05. A supplier can price options at the quantity points, add an option of its own, and give a sample offer, timeline and validity date; every price reads "Indicative".
- AC-06. The buyer sees options against suppliers, including options a supplier proposed.
- AC-07. A buyer can save the RFP as a template and start from it, or copy a past RFP.
- AC-08. A buyer can create an RFQ from an RFP (REQ-E03-03 AC-14).
- AC-09. The buyer can open a firm-offer round on a Closed or Partly awarded RFP, only for options still open and only for submitted suppliers that pass the compliance gate (RFX-D15).
- AC-10. Prices from a round read "Firm" with their validity; every other RFP price still reads "Indicative".
- AC-11. An award naming a supplier with no valid firm offer on the option is refused, naming the option; an award without a reason is refused.
- AC-12. A successful award moves the RFP to Awarded, or Partly awarded, and records option, supplier, share, quantity, quantity point and reason.
- AC-13. After award, "Create RFQ from this RFP" leaves out an awarded option and still offers the others.
- AC-14. Each responder sees only its own outcome.
- AC-15. A submitted RFP response revised before the deadline shows as the new version, and the earlier version and its files stay viewable.

**RFP template** [Proposed; Market; pending user use cases, A-03]. How an event is created from the term list is in section 3.6a. An RFP has 3 parts: the buyer's scope, a commercial terms table, and supporting attachments, plus the optional indicative pricing and questions (BR-07, BR-09). The terms table is the part suppliers answer and buyers compare.

Each term row holds: term name; PTI's requested value; the supplier's proposed value; Comply or Deviate; a comment, required when the supplier deviates.

Standard term list, from which the buyer picks for each RFP:

| Group | Terms |
|---|---|
| Price | Price basis and unit; price validity period; price adjustment mechanism (fixed, index-linked, exchange-rate-linked); volume discounts or rebates |
| Payment | Payment terms (days); currency |
| Delivery | Incoterms and delivery point; standard lead time; minimum order quantity; capacity allocated to PTI per month; consignment or vendor-managed inventory option |
| Quality and compliance | Specification compliance; quality claim and return handling; halal and BPOM obligations; packaging and labelling requirements |
| Service level | OTIF commitment; penalty or credit for late or short delivery |
| Contract | Contract duration; renewal and termination notice |
| Other | Free-text terms the supplier wants to add |

Template rules:
- Suppliers answer every term the buyer selected, and can add terms under Other.
- The comparison view lists terms as rows and suppliers as columns, with deviations highlighted.
- Price and lead time can be scored with CR-15 when the RFP carries them.
- Custom terms appear in the comparison in their group and are labelled as custom.

**Data and integration.** RFP event with scope, attachments, terms (standard and custom, value kind, requested value), T&C document, confidentiality terms, options and quantity points, questions, and source (RFI, template or copied event); T&C and confidentiality acceptance per supplier with time; proposals with term answers, indicative prices per option and point, supplier-proposed options, sample offer, timeline, validity, response documents and submitted versions; document requests on the event; firm-offer rounds (options named by reference to their proposer, quantity points, invitees, deadline, message, closing time) and firm offers (prices, validity, versions); RFP award records as for REQ-E03-05.

**Metrics.** Lagging: KPI-06. Starting targets, reviewed after 3 months [Owner, 2026-09-25, RFX-D13]: RFPs ending in an award or an RFQ ÷ closed RFPs, 90%; sourcing events per awarded full-service need, 1.3 on average; RFP cycle time from publish to award, recorded first and targeted after 3 months; RFP awards with a reason, 100%.

**Open items.** A-03 (RFP template and standard term list review with Procurement).

#### REQ-E03-05  Bid comparison, negotiation, and awarding

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E03.04, E03.05; RFX-D5, RFX-D6, RFX-D7, RFX-D9, RFX-D10, RFX-D12, RFX-D13 | MVP | P1 [Proposed] | Procurement | BUY, SUP | Validated (negotiation step; award to more than 1 supplier, per item, split by % or quantity, partial award, cancel before SAP) [Owner]; Proposed (detail) |

**Business value.** Buyers compare quotes in spreadsheets and negotiate by email today [Deck p.3, C2]. Comparing on one scored view, negotiating in rounds inside the hub, and awarding with a recorded split gives every award an audit trail, which the charter requires for 100% of sourcing documentation (PRD section 1), and supports dual sourcing. With quantity breaks, the cheapest supplier often changes between low and high volumes, so the comparison and the award have to be made at a stated break.

**Experience.**
- BUY: compares quotes item by item, with the suppliers as rows and the breaks as columns; picks the evaluation break; sees one-time costs, lead time, MOQ and the supplier-filled spec values beside the prices, and the score at that break; shortlists suppliers, runs 1 or more negotiation rounds, then awards each item to 1 or more suppliers by percentage or quantity, at a break chosen per item, now or later for items left open; cancels an award, with a reason, until it is raised in SAP.
- SUP: receives a negotiation request, submits a revised quote per item and per break, and sees per item whether it was awarded, with share, quantity and break, or that an award was withdrawn.

**Step-by-step (Buyer, splitting the Oslo award).**
1. The Oslo RFQ closes with quotes from 3 suppliers. One fails the compliance gate (CR-23); it is listed with the reason and not ranked.
2. The buyer compares each sticker item across the 6 breaks. The lowest price at each break is marked. At 3K and 5K one supplier is best-scored; from 7K the other is.
3. The buyer sets the evaluation break to 10K. Total cost at 10K = unit price × 10,000 × 8 variants + plate costs; the composite score (CR-15) uses that total as the price.
4. The buyer awards item 1: 70% to supplier B, best-scored at 10K, and 30% to supplier A; item 2: 100% to supplier B. Each item totals 100%. Every item's best-scored quote has a share, so no reason is needed; giving all of item 1 to supplier A would need one.
5. Both suppliers are notified of their share per item. The supplier that was not awarded is notified it was not awarded.

**Business rules.**
- BR-01. The comparison view shows, per quote: unit price, total price, lead time, MOQ, payment terms, the score for each criterion, and the weighted score (CR-15). Quotes in different currencies follow CR-16 [Code]. On an RFQ with items, the comparison is per item: suppliers as rows, breaks as columns with the unit price at each, the lowest price at each break marked, one-time costs, lead time and MOQ in their own columns, and the supplier-filled spec values under each supplier [Proposed; Market, section 8.3].
- BR-01a. Quotes are scored only for suppliers that pass the compliance gate (CR-23). A supplier that fails keeps its quote visible, marked with the failed criteria, and cannot be selected in an award [Owner, 2026-09-21].
- BR-01b. The buyer chooses an **evaluation break**; it starts at the break nearest the RFQ's total quantity. Total cost of an item at that break = unit price × break quantity (× the number of variants for a per-variant break) + the item's one-time costs. The composite score (CR-15, weights unchanged) scores price as that total [Proposed].
- BR-01c. Alternative offers are shown apart from the main quotes and are not ranked [Proposed; Market, section 8.3].
- BR-02. The hub highlights the best-scored quote, per item on an RFQ with items. The score supports the buyer's decision and never awards automatically [Proposed].
- BR-03. A negotiation step is available after the response deadline [Owner]. The buyer invites 1 or more shortlisted suppliers to a round with a deadline and an optional message or target. Invited suppliers submit a revised quote, per item and per break on an RFQ with items; suppliers not invited cannot [Proposed]. A revised quote can carry files (CE-11h) [Owner, 2026-09-25; PR #63].
- BR-04. Rounds can repeat. The buyer can mark a round as best and final offer. Every quote version, message, and deadline is kept [Proposed; Market].
- BR-05. A supplier sees only its own quotes and the buyer's messages to it, never another supplier's price or rank [Proposed; REQ-E03-03 BR-03].
- BR-06. An event can be awarded to more than 1 supplier [Owner]. This holds for tiered RFQs, legacy RFQs and RFP options alike (NR-3 BR-01) [Owner, 2026-09-25; PR #58, #64, #66]. Each item (on an RFP, each option) has its own award, split across 1 or more suppliers by percentage or by quantity; every line stores both, and typing one derives the other [Owner, 2026-09-21, RFX-D5; amended 2026-09-25, RFX-D7; PR #58, #64]. Each awarded item totals its break quantity within 1 unit, and an item may be left "Not awarded now" for a later award [Owner, 2026-09-25, RFX-D9; PR #58, #64].
- BR-06a. Each item has its own break (on an RFP, its quantity point), which every award line of that item records; items in one award can be at different breaks [Owner, 2026-09-25, RFX-D9; PR #58, #64]. An award is refused, naming the item where one applies, when: an awarded item does not total its break quantity; a line names no item or an unknown item; a line names a break the item does not have; a quantity does not match its share; a supplier did not price the item at that break (on an RFP, holds no valid firm offer for it); a supplier fails the compliance gate; the item is already awarded; a final award leaves an item neither awarded nor marked "Will not award" [Owner, 2026-09-25, RFX-D9; PR #58, #64, #66].
- BR-07. An award needs a reason when it does not follow the best-scored quote; on an RFQ with items, when any item's award gives its best-scored quote no share [Proposed]. Every RFP award needs a reason (REQ-E03-04 BR-16c) [Owner, 2026-09-25; PR #66].
- BR-08. On award, awarded suppliers are notified with their share, and every other quote is marked Not awarded and its supplier notified [Code; Proposed notification]. On a split award every quote an award line names is marked Awarded [Proposed]. A partial award marks the quotes it names Awarded and rejects none; the final award rejects every quote that no award in force named [Owner, 2026-09-25; PR #58, #64]. In the hub the notice is the supplier's own outcome per item (BR-15); a message outside the hub waits on email [Proposed; BACKLOG BL-120].
- BR-09. The hub records the award. The PO or contract is created in SAP, per the charter's system-of-record rule (PRD section 2.3) [Proposed].
- BR-10. The comparison can be downloaded as a spreadsheet file: items × suppliers × breaks [Proposed].
- BR-11. An event with items still open after an award is **Partly awarded**. It becomes Awarded when the last item is awarded, or when the buyer marks every open item "Will not award" (NR-3 BR-06) [Owner, 2026-09-25, RFX-D9; PR #58, #64]. On an RFP the "Will not award" close-out also needs a reason (REQ-E03-04 BR-16c, BR-16f).
- BR-12. Legacy RFQs are awarded per line on the same award panel as tiered RFQs, and the RFQ list links to it for every RFQ that can still be awarded. There is no single-winner award (NR-3 BR-07) [Owner, 2026-09-25; PR #58, #64].
- BR-13. An award can be cancelled with a reason until it is marked "Raised in SAP". The cancelled record is kept, and a correction is a cancel followed by a new award. Cancelling the only award in force returns the event to Closed; cancelling one of several leaves it Partly awarded. On an RFQ, the quotes the cancelled award named (unless another award in force names them) and every Rejected quote of the event return to Under Review, so a new award can use them (NR-3 BR-09) [Owner, 2026-09-25, RFX-D12; PR #61, #64, #66].
- BR-14. "Raised in SAP" takes the SAP document number, typed by the buyer until the SAP interface sends it back. After it, the award cannot be cancelled in the hub, and changes are made in SAP (NR-3 BR-10) [Owner, 2026-09-25, RFX-D12; PR #61, #64, #66].
- BR-15. Each supplier sees only its own outcome per item: Awarded with share, quantity and break; Not awarded; Pending; or "Award withdrawn" with the date. It never sees another supplier's share, the cancel reason or the SAP number (NR-3 BR-12) [Owner, 2026-09-25; PR #61, #64].
- BR-16. Every award, cancellation and SAP marking keeps when and why, and an actor field that names the person once sign-in exists (NR-3 BR-11) [Owner, 2026-09-25; PR #61].
- BR-17. No approval step before award in the MVP. Award, cancel and SAP marking are separate permissions, so Procurement can give them to different people (NR-3 BR-13) [Owner, 2026-09-25, RFX-D10; PR #61, #66].
- BR-18. Each bid row on the RFQ and RFP award panels shows the supplier's update compliance (REQ-E08-02 BR-23) as a pill: plain at `compliance.warnPct` (80%) or more, amber below it, red below `compliance.flagPct` (60%), grey for "No history". An award that gives any share to a supplier shown red needs a reason, per item, on the RFQ and the RFP, and the verb refuses it without one. The award record keeps the compliance % each supplier had at the time of award (MR-2 BR-06) [Owner, 2026-09-29; PR #110].
- BR-19. A compliance flag never blocks invitation, scoring or award by itself; it only asks for a reason. Only CR-23 blocks (MR-2 BR-07) [Owner, 2026-09-29; PR #110].
- BR-20. At award, a vendor below the qualification level the event's sourcing type needs is refused with the reason, after the CR-23 check (CE-12g). While the level's list is a placeholder, the award needs a reason instead [Owner, 2026-09-29, MAT-D14, MAT-D19; PR #109]. Whether a reason is owed, for any of the causes in BR-07, BR-18 and this rule, is decided by one rule shared by the award panel and the verbs [Code, PR #109, #110].

**Edge cases.**
- Only 1 quote received: the buyer can still negotiate and award, and the comparison view shows "Single quote" [Proposed].
- A supplier does not respond in a negotiation round: its last valid quote stands [Proposed].
- The buyer cancels an award before it is raised in SAP: BR-13 applies [Owner, 2026-09-25, RFX-D12].
- The buyer tries to cancel an award already raised in SAP: refused, naming the SAP document [Owner, 2026-09-25; PR #61].
- A supplier with "No history" of update compliance (REQ-E08-02 BR-25) shows a grey pill and never owes a reason for compliance [Owner, 2026-09-29; PR #110].
- A Preferred vendor's Preferred-only document expires mid-event on a direct RFQ: it can still submit, but cannot be awarded, and the award panel shows why (MR-10 edge case 1) [Owner, 2026-09-29, MAT-D14; PR #109].
- A split of 60,000 and 45,000 on a 100,000 break: refused, naming the item and the 105,000 total. A split of 33.33% three ways: accepted, with the remaining unit on the first line [Owner, 2026-09-25; PR #58].
- Every quoting supplier fails the compliance gate: the page says no award is possible [Owner, 2026-09-21].
- A supplier that declined (REQ-E03-03 BR-15) holds no quote, so it appears in neither the comparison nor the award [Proposed].

**Acceptance criteria.**
- AC-01. The comparison view shows each criterion score and the weighted score, and highlights the best-scored quote.
- AC-02. A buyer can run a negotiation round for selected suppliers, and only those suppliers can submit a revised quote.
- AC-03. Every quote version in every round is kept and viewable by the buyer.
- AC-04. A buyer can award 1 event to 2 or more suppliers, and the award cannot be saved unless each awarded item totals its break quantity.
- AC-05. Awarded and non-awarded suppliers are notified, and a supplier sees only its own outcome.
- AC-06. On an RFQ with items, changing the evaluation break changes the total cost and can change the best-scored supplier; the lowest price at each break is marked.
- AC-07. An award naming a supplier that did not price the item at the award break, or a supplier that fails the gate, is refused with the item named.
- AC-08. A 70 / 30 split marks both quotes Awarded and records the break.
- AC-09. In one award a buyer splits 1 item 60% / 40% and another by quantity 70,000 / 30,000, and both are saved with share and quantity.
- AC-10. Awarding 2 of 3 items moves the RFQ to Partly awarded, and awarding the third later moves it to Awarded.
- AC-11. A legacy RFQ with 2 lines can be split per line, and the RFQ list offers no single-winner award.
- AC-12. Cancelling an award with a reason returns the RFQ to Closed, keeps the cancelled record, and returns the affected quotes to Under Review; cancel is refused after "Raised in SAP".
- AC-13. Each supplier sees its own outcome per item, and "Award withdrawn" after a cancel, and never another supplier's share.
- AC-14. Awarding any share to a supplier at 59% update compliance without a reason is refused by the verb, not only by the form; with a reason it passes, and the award record shows the compliance % each awarded supplier had (MR-2 AC-04, AC-05).
- AC-15. A direct RFQ's invitee list does not offer an Approved-only vendor, publishing with one is refused, and awarding a vendor that dropped below the level is refused with the reason, once the level's list is not a placeholder (MR-10 AC-03, AC-05). An indirect RFP offers both Approved and Preferred vendors (MR-10 AC-04).

**Data and integration.** Quote versions per round; negotiation round (invitees, deadline, message, best-and-final flag); award records for an RFQ or an RFP, with lines (supplier, item or option, split basis, share, quantity, break, reason); cancellations and SAP markings appended beside the award, never written over it; the best-scored quote per item at the award. Award to SAP for PO or contract creation [Proposed; interface per PQ-06].

**Metrics.** Leading: share of awards with a recorded reason; negotiated saving = first quote − final quote. Lagging: KPI-06; charter sourcing administration time. Starting targets, reviewed after 3 months [Owner, 2026-09-25, RFX-D13]: multi-supplier awards recorded in the hub ÷ multi-supplier decisions, 90%; award corrections made through cancel ÷ award corrections known, 100%; awards with a reason where one is required, 100%; negotiated saving not lowered by split awards.

**Open items.** Sourcing request (E03.01) is not yet detailed. A-03 (score weights review with Procurement).

#### RFx: later, not in the MVP

Kept out of the MVP by the RFx overhaul of 2026-09-21 [Proposed]. Each is a backlog row in `BACKLOG.md` (BL-85 to BL-92), and the market practice behind each is in section 8.3.

- Excel bid-sheet download and upload, with per-line validation.
- Weighted scoring by an evaluator team; knock-out questions; show-if (conditional) questions.
- Two-stage sealed bids (technical before commercial).
- Sample tracking after the event: requested, due, received, approved.
- AI drafting of an event from an email or brief, and AI extraction of a supplier's PDF quote into the quote grid.
- Award optimisation (scenarios with constraints).
- An admin screen for the question library, the term list and the item-type spec templates (CE-05).
- Amendments to a live event that notify invitees. Deadline extension already exists (REQ-E03-03 BR-05).

Added on 2026-09-28 from the RFx improvement analysis of 2026-09-25:
- An approval step before award, by value. The MVP has none (REQ-E03-05 BR-17) [Owner, 2026-09-25, RFX-D10].
- RFx certificates feeding the compliance registry and the compliance gate (CE-11d) [Proposed].
- Intent to respond, and decline with a reason, on the RFI and the RFP, as the RFQ has (REQ-E03-03 BR-15) [Proposed; BACKLOG BL-132].

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
- BR-05. Reason codes are predefined, not free text [MN-ORD-06]. ADM maintains the list [Proposed]. Until the Material Planner supplies the list, the starter list in section 3.6 applies [Code].
- BR-06. Reject applies when the supplier cannot meet the requested date, quantity, and/or quality [MN-ORD-08].
- BR-07. A rejection counts against the supplier's performance assessment [MN-ORD-08].
- BR-08. A rejection notifies PTI and names the supplier [MN-ORD-08].
- BR-09. No response within the deadline sets the PO to Escalated, and PTI's team must act [MN-ORD-14].
- BR-10. A counter-offer quantity follows CR-10: above 0 and not above the ordered quantity [Code].

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

**Open items.** Q-18 (working calendar; recommended default in section 3.4). Final reason code list from the Material Planner (starter list in section 3.6).

#### REQ-E07-03  Order Collaboration Summary

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E07; MN-ORD-10 to MN-ORD-13 | MVP | P0 [Deck p.7] | Material Planner | MP, SUP | Validated; drill-through and lifecycle columns validated by the owner, 2026-09-19 |

**Business value.** One place to answer "is this order safe?": the PO, who supplies it, the supplier's response, its ASNs and call-offs, the 3 confirmations, what has been received, and what has been invoiced. Every figure on the row is a way in to the record behind it, so the planner stops hunting through menus and cross-matching PO numbers by eye. It removes the need to check 3 menus [MN-ORD-13] and, with the lifecycle columns, the need to check 5.

**Experience.**
- MP: one row per open PO, with every cell either a link to that record or a plain statement of why there is nothing to open. Landing on a destination, the planner sees that PO's records already filtered, and a way back.
- SUP: the same summary for its own POs only, with the supplier's own destinations (its orders, shipments, call-offs, receipts, invoices, commitments, capacity).

**Step-by-step (Planner, Monday review).**
1. The planner opens Order summary. A banner names how many orders have had no supplier response past their deadline.
2. Row PO-2025-00108 shows Escalated, 2 ASNs, 1 call-off confirmed, capacity Gap, foresight Confirmed, shipping notice Not started, 1 receipt with a discrepancy, 1 invoice returned.
3. The planner selects the ASN count. Shipments & ASN opens, filtered to PO-2025-00108, with its 2 ASNs listed; the first is open in the detail panel.
4. The planner selects "Back to order summary" and is returned to the same row, with the summary's own filters as they left them.
5. The planner selects the capacity Gap. Capacity opens for that supplier and the material groups of that PO, on the weeks the PO delivers into, with the gap week highlighted.

**Step-by-step (Supplier).**
1. The supplier opens Order summary and sees only its own POs.
2. A row shows Awaiting response with a deadline today. Selecting the response opens that PO with the response form.
3. A row shows a receipt discrepancy. Selecting it opens Goods receipts filtered to that PO, where the supplier acknowledges or disputes.

**Business rules.**
- BR-01. The summary shows, per PO: PO number, supplier, supplier response, ASNs, call-offs, the 3 confirmations (capacity, foresight / fixed stock, shipping notice), goods receipts, and invoices [MN-ORD-13; lifecycle columns Owner, 2026-09-19].
- BR-02. Every cell that has a record behind it is a link. Selecting it opens the page that owns that record, filtered to this PO, with the record open where exactly one exists [Owner].
- BR-03. A cell with nothing behind it is **not** a link. It states the empty condition, and names the reason on hover and to assistive technology [Owner; SC-07].
- BR-04. Every destination reached this way shows which PO it was filtered by and offers "Back to order summary", which returns the user to the summary with its filters and scroll position as they were [Owner].
- BR-05. Capacity and foresight are agreed per material group and period, not per PO. Their destinations are filtered to the PO's supplier and the PO's materials or material groups, over the periods the PO delivers into, and the destination states that this is why those rows are shown [Owner].
- BR-06. A supplier sees only POs where it is the supplier, on the summary and at every destination [MN-ORD-13; Q-17].
- BR-07. Navigation is a read. A user whose role does not permit the destination's actions still sees the filtered records; the actions are withheld with the usual notice, never the navigation [Proposed; consistent with NV and the handoff pattern].
- BR-08. A confirmation that is not required for a PO shows "Not required", which is not a link [Proposed].
- BR-09. Counts on the summary count what the destination will show: cancelled ASNs, dismissed call-off drafts and cancelled invoices are excluded from both, or shown in both [Owner].
- BR-10. The summary and its destinations read the same figures as the pages that own them. The summary never calculates a status of its own [Proposed].
- BR-11. Rows are ordered by attention: escalated or overdue first, then orders with a gap or discrepancy, then the rest by need date [Proposed].
- BR-12. A destination opened from the summary carries the data-age banner of the page it lands on (REQ-E07-08) [Proposed].

**Drill-through contract.** One row per column: what is behind it, where it goes, and what the cell does when there is nothing.

| Column | Destination | Filtered to | Opens | When empty (not a link) |
|---|---|---|---|---|
| PO number | Purchase orders | That PO | The PO detail | Never empty |
| Supplier | Supplier profile (PTI); no link on the supplier's own summary | That supplier | Profile | Supplier record missing: state "Supplier record unavailable" |
| Response | Purchase orders | That PO | The PO detail at the response, including the counter-offer or rejection reason | Never empty; before any response it reads "Awaiting response" and still opens the PO |
| ASNs | Shipments & ASN | That PO | The ASN when there is exactly 1; the filtered list when there are several | "No ASN yet" — the supplier has not shipped against this order |
| Call-offs | Call-offs | That PO | The call-off when there is exactly 1; the filtered list when there are several | "No call-offs" — deliveries on this order are not managed as call-offs |
| Capacity | Capacity | That supplier, the PO's material groups, the PO's delivery weeks | The capacity grid on those weeks, gap weeks highlighted | "Not started" — the supplier has not confirmed capacity for these material groups |
| Foresight / fixed stock | Forecast commitments | That supplier, the PO's materials | The commitment rows for those materials | "Not started"; or "Not required" when the PO's materials have no forecast periods |
| Shipping notice | Purchase orders | That PO | The PO detail at the shipping notice (REQ-E07-05) | "Not started" — no expected completion date yet |
| Goods receipts | Goods receipts | That PO | The receipt when there is exactly 1; the filtered list when there are several | "Nothing received yet" |
| Invoices | Invoices | That PO | The invoice when there is exactly 1; the filtered list when there are several | "Not invoiced yet" |

**Edge cases.**

*Positive paths*
- Exactly 1 record behind a cell: the destination opens that record, not a list of 1 [Owner].
- Several records: the destination lists them, filtered, newest first, and none is auto-opened [Proposed].
- A PO whose materials span several material groups: capacity opens with every group of that PO listed [Proposed].
- A PO delivered before call-offs were introduced: call-offs reads "No call-offs" and is not a link [Proposed].
- Language switched to Indonesian: destinations, filters and the back link behave the same, with every string translated [SC-04].

*Refusals and negatives*
- A supplier follows a link or a pasted address for another supplier's PO: refused as not found, with no hint that the PO exists [BR-06; SP1].
- An address names a PO that does not exist: "Order not found", with a way back to the summary [Proposed].
- An address names a PO the user may see but a filter value that is malformed: the filter is ignored, the page states that it showed everything for the PO [Proposed].
- A user without the role the destination's actions need: the records are shown, the actions are withheld with the standard notice [BR-07].
- A cell with nothing behind it cannot be selected by mouse or keyboard, and its reason is available to a screen reader [BR-03; SC-07].

*Data edges*
- An ASN cancelled after it was counted: the count and the destination both exclude it [BR-09].
- Goods received with no ASN: the receipts cell counts it, and the destination shows it marked "Received without ASN" [REQ-E07-06].
- An invoice covering several POs: it appears under each PO it covers, and the destination states that its lines cover more than this order [Proposed].
- A PO with many ASNs or receipts: the destination scrolls rather than truncating, and the count on the summary matches the number listed [Proposed].
- The PO is closed or cancelled: the row stays visible with its status, and every destination still opens read-only [Proposed].
- SAP data behind a destination is older than the latency target: the destination shows the data-age banner [BR-12].
- The same PO open in 2 browser tabs: each behaves independently; the summary re-reads on return [Proposed].

**Acceptance criteria.**
- AC-01. For any PO, the summary shows the supplier, the response, ASNs, call-offs, the 3 confirmations, goods receipts and invoices.
- AC-02. Selecting each of those cells opens the page that owns that record, filtered to that PO, and the filter is visible to the user.
- AC-03. Where exactly 1 record exists behind a cell, that record is open on arrival; where several exist, the filtered list is shown.
- AC-04. Capacity opens for the PO's supplier, material groups and delivery weeks; foresight opens for the PO's supplier and materials; each destination states why those rows were chosen.
- AC-05. A cell with nothing behind it is not selectable by mouse or keyboard, and its reason is readable on hover and by a screen reader.
- AC-06. Every destination reached from the summary offers "Back to order summary", and returning restores the summary's filters and position.
- AC-07. A supplier user sees only POs where it is the supplier, and a direct address to another supplier's PO is refused as not found.
- AC-08. An address naming a PO that does not exist shows "Order not found" and a way back.
- AC-09. A user lacking the destination's action role still sees the filtered records, with actions withheld and explained.
- AC-10. A count on the summary equals the number of records the destination lists, with cancelled records excluded from both.
- AC-11. A confirmation that is not required shows "Not required" and is not a link.
- AC-12. Every rule above holds on both the PTI and the supplier summary.

**Data and integration.** Reads from REQ-E07-01 (PO and response), REQ-E07-04 (ASNs), REQ-E07-05 (shipping notice), REQ-E07-06 (goods receipts), REQ-E07-07 (invoices), REQ-E08-04 (capacity), REQ-E06-02 (foresight), REQ-E09-03 (call-offs), Foundation (supplier). The summary holds no state of its own.

**Metrics.** Leading: share of open POs with all 3 confirmations complete; share of summary visits that reach a destination.

**Alignment check against the other requirements.** Each source requirement owns its records; this one only gathers and links to them.

| Source | Owns | This requirement adds | Conflict? |
|---|---|---|---|
| REQ-E07-01, REQ-E07-02 | PO, response, escalation | A column and a link to the PO detail | None. The summary never changes a response |
| REQ-E07-04 | ASNs | Count and link; cancelled ASNs excluded (BR-09) | None. BR-09 matches REQ-E07-04's cancellation rule |
| REQ-E07-05 | Shipping notice | Status and link to the PO detail where the notice lives | None |
| REQ-E07-06 | Goods receipts and discrepancies | New column and link | Extends the original 3-confirmation scope; owner-approved 2026-09-19 |
| REQ-E07-07 | Invoices | New column and link | As above. An invoice spanning POs is listed under each |
| REQ-E08-04 | Capacity per material group and week | Status per PO, and the filter that maps a PO to groups and weeks (BR-05) | No conflict, but the grain differs: a PO status is a reading of a wider agreement, and the destination says so |
| REQ-E06-02 | Commitments per material and period | Status per PO and the material filter | As above. "Not required" where the materials have no forecast periods |
| REQ-E09-03 | Call-offs | Count and link | None |
| Section 3.7, 3.8 (NV, SC) | Menu and screen rules | Destinations keep their own menu highlight (NV-03); the back link is additional, not a replacement for the menu | None |
| REQ-E07-08 | SAP data age | Destinations carry their own banner (BR-12) | None |

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
- BR-05. The ASN names its 3PL or carrier and a tracking or vehicle number. Where the 3PL has a public tracking page, the hub shows the tracking number as a link to that page. The hub does not read status from the 3PL's site. The list of 3PLs and their tracking addresses is maintained by ADM [Owner, 2026-09-21; replaces TMS access, D-03].
- BR-04. Required ASN fields: material, shipped quantity and unit, batch number, ship date, expected arrival, carrier, and tracking or vehicle number. Optional: expiry date per batch and a packing list attachment [Proposed; carrier, tracking number, and expected arrival are required in the prototype, Code]. **Amended 2026-09-29:** expiry is required on a line whose material is shelf-life relevant (BR-12) [Owner, 2026-09-29, MAT-D6; PR #93].
- BR-06. **Batch from declared stock.** The batch field lists the batches in the supplier's latest stock record for that material with an available quantity above 0, each with its batch number, available quantity and expiry; picking one fills the expiry (MR-6 BR-01) [Owner, 2026-09-29; PR #89].
- BR-07. A batch's available quantity = its declared quantity minus the quantity on the supplier's ASNs for that batch that are Submitted, In Transit, Delivered or Awaiting exception, shipped on or after the stock record's date (MR-6 BR-02) [Owner, 2026-09-29; PR #89, #93].
- BR-08. A line quantity above the batch's available quantity is a warning, not a block, shown before submit on every submit path (MR-6 BR-03) [Owner, 2026-09-29; PR #89, #101].
- BR-09. When the supplier declared no batches for the material, or picks "a batch not in the list", the batch is typed and stored as "not in declared stock", which the planner sees (MR-6 BR-04) [Owner, 2026-09-29, MAT-D5; PR #89, #101].
- BR-10. **Shelf life.** Remaining shelf life is measured from the ASN's expected arrival (ETA): expiry must be on or after ETA + the material's minimum remaining shelf life, in calendar months; a date equal to the minimum passes (MR-6 BR-05) [Owner, 2026-09-29; PR #93].
- BR-11. The minimum is the material master's minimum remaining shelf life, copied from SAP where maintained, and otherwise the hub setting `shelfLife.defaultMonths` (6) (MR-6 BR-06) [Owner, 2026-09-29; PR #84, #93]. Until the SAP material feed runs, the SAP values are sample data labelled as such (BACKLOG BL-152).
- BR-12. The rule applies to every material that is shelf-life relevant. A material is shelf-life relevant by default when it is a raw material (ROH) or has a minimum remaining shelf life in master data; packaging without one is not. An administrator can switch any material on or off (MR-6 BR-07) [Owner, 2026-09-29, MAT-D6 as amended by MAT-D16; PR #84, #93].
- BR-13. A line that fails BR-10 blocks submit. The only way forward is a shelf-life exception request with a reason, which moves the ASN to Awaiting exception. The request is approved or rejected, with a reason on reject, by the holder of `asn:approve-shelf-life`, an atom of the `compliance` lane (Quality) only, not planning. Approved: the ASN moves to Submitted and counts as in transit. Rejected: it returns to Draft and the supplier sees the reason. While Awaiting exception it does not count as in transit. Approved goods are received into blocked stock (MR-6 BR-08) [Owner, 2026-09-29, MAT-D6; PR #93; atom name corrected from `asn:approveShelfLife`, plan AR-02].
- BR-14. Every request, approval, rejection and later ETA change is appended to the ASN's exception record with who, when and why, and an approved exception shows on the ASN and at goods receipt as "receive to blocked stock" (MR-6 BR-09) [Owner, 2026-09-29; PR #93].
- BR-15. **Call-off check.** For an ASN linked to a call-off, the hub compares the call-off's agreed deliveries with this ASN plus the call-off's earlier non-cancelled ASNs, and warns when: the total shipped is above the agreed quantity by more than `callOff.overPct`, or below it once the ASN is marked the last one for the call-off, per material; the ETA is earlier than the agreed date minus `callOff.earlyAllowanceDays`, or later than the agreed date; or the ASN's material is not the call-off's (MR-6 BR-10) [Owner, 2026-09-29; PR #101].
- BR-16. When the PO line has an open confirmed call-off and the ASN names none, the hub warns "This PO line has an open call-off; link it?" (MR-6 BR-11) [Owner, 2026-09-29; PR #101].
- BR-17. Call-off warnings never block. They are shown to the supplier before submit on every submit path, stored on the ASN at submit, and shown to the planner as a "Mismatch" marker with the current figures, recomputed on read, on the ASN list and the call-off page (MR-6 BR-12) [Owner, 2026-09-29; PR #101].
- BR-18. Alert rule `callOffNotCovered`, PTI only: raised when a confirmed call-off due within the supplier's lead time is larger than the supplier's declared SOH plus in production due before the need date (REQ-E08-05 BR-01) (MR-6 BR-13) [Owner, 2026-09-29; PR #101].

**Edge cases.**
- Partial shipment: multiple ASNs per call-off are allowed [Proposed; Market].
- ASN cancelled after submission: cancelled ASNs leave the in-transit figure [Proposed].
- The supplier changes the ETA to a later date after an exception was approved: the rule is re-checked; the approval stands only when the new ETA is not later than the approved one, otherwise the ASN returns to Awaiting exception (MR-6 edge case 1) [Owner, 2026-09-29; PR #93].
- One ASN line carries 2 batches: each batch is its own line and is checked separately (MR-6 edge case 2) [Owner, 2026-09-29; PR #89].
- A batch's available quantity is 0 because another ASN took it: it drops out of the list, and the supplier can still type it as not in declared stock (MR-6 edge case 4) [Owner, 2026-09-29; PR #89].
- The call-off is changed after the ASN: the planner's warnings are recomputed on read (MR-6 edge case 6) [Owner, 2026-09-29; PR #101].

**Acceptance criteria.**
- AC-01. A supplier can create an ASN only for an approved PO and, for a call-off delivery, only for a confirmed call-off (REQ-E09-03 BR-06).
- AC-02. A submitted ASN increases the in-transit quantity in REQ-E08-01.
- AC-03. Multiple ASNs can be created against one call-off.
- AC-04. A supplier with declared batches sees only those with available quantity, and picking one fills the expiry; a supplier without declared batches can type a batch, and the planner sees "not in declared stock" (MR-6 AC-01, AC-02).
- AC-05. A raw-material line with expiry 5 months after ETA is refused at submit by the verb, not only by the form; the same ASN with an approved exception moves to Submitted and counts as in transit, and does not count while Awaiting exception (MR-6 AC-03, AC-04).
- AC-06. An ASN 10% over the call-off with a 5% tolerance can be submitted and shows "Mismatch" to the planner with the figures; an ASN with no call-off on a PO line with an open confirmed call-off shows the link warning (MR-6 AC-05, AC-06).

**Data and integration.** ASN header and lines. Sent to SAP as inbound delivery [Deck p.7 E07.05; see REQ-E07-08].

**Metrics.** Leading: share of receipts with an ASN before arrival.

**Open items.** Warehouse to confirm the required fields in BR-04.

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
- BR-03. Submitting the first ASN for a PO records "shipment started" with that ASN's ship date. The supplier then only gives the expected completion date, and updates it if it moves [Proposed].

**Edge cases.**
- Expected completion date moves later: the supplier updates it, and the planner is notified [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can record shipment start and expected completion date for a PO.
- AC-02. The summary shows the confirmation status for that PO.

**Data and integration.** Shipping notice confirmation per PO: start flag, start date, expected completion date.

**Metrics.** Leading: share of POs with a shipping notice confirmation before first receipt.

**Open items.** Material Planner to confirm BR-03.

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
- BR-03. A receipt that differs from ASN quantity outside CR-25 is flagged as a discrepancy: any over-delivery, or a shortfall above 2% [Owner, 2026-09-21].
- BR-04. Received quantity and receipt date feed OTIF per call-off (REQ-E10-01) [MN-ORD-09; Proposed].
- BR-05. Quantity rejected at PTI's quality inspection is also a discrepancy. Line and receipt results follow CR-11 [Code].
- BR-06. PTI records its quality inspection result against the receipt: quality hold, retest, halal and BPOM checks. The supplier sees the result and the rejected quantity, not the internal checklist. Posting the goods receipt stays in SAP [Owner; detail Proposed; see Q-20].

**Edge cases.**
- Receipt with no ASN: show it as "Received without ASN", and count it in the ASN coverage metric [Proposed].
- Quality rejection after receipt: show returned quantity separately from received quantity [Proposed].

**Acceptance criteria.**
- AC-01. A goods receipt posted in SAP appears in the hub against its ASN.
- AC-02. A receipt outside the quantity tolerance is flagged and visible to both supplier and planner.
- AC-03. A supplier can acknowledge or dispute a discrepancy with a comment.
- AC-04. A supplier sees the quality inspection result and rejected quantity for each receipt.

**Data and integration.** SAP to hub: GR document, material, quantity, date, batch, reference ASN or inbound delivery. See REQ-E07-08.

**Metrics.** Leading: open discrepancies older than 5 working days [Proposed]. Lagging: KPI-05.

**Open items.** None on tolerance: PQ-04 is decided (CR-25). Q-20 (quality inspection in the MVP while the Supplier Quality module is Phase 2).

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
- BR-03. Price differences beyond tolerance make the invoice an exception for FIN. The tolerance is per line: 0% where a contract price exists, otherwise 2% within an absolute rupiah cap (CR-12) [Owner, 2026-09-21]. An exception is either Price variance (CR-12) or Quantity mismatch (CR-13) [Code].
- BR-04. Invoice status comes back from SAP [Proposed].
- BR-05. Due date and overdue follow CR-14 [Code]. Payment terms on the PO replace the 30-day default when present [Proposed].

**Edge cases.**
- Supplier submits the same invoice number twice: block as a duplicate [Proposed].
- Invoice rejected by Finance: return it with a reason; the supplier can correct and resubmit [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can create an invoice only from its own received goods receipts.
- AC-02. A duplicate invoice number from the same supplier is blocked.
- AC-03. The supplier sees the invoice status as updated from SAP.

**Data and integration.** Invoice header and lines, tax invoice attachment, match result, status. Hub to SAP for invoice posting or parking; SAP to hub for status [Proposed].

**Metrics.** Leading: share of invoices submitted through the hub; share matched first time. Lagging: days from receipt to payment.

**Open items.** DEC-06 (is Web Tukar Faktur this capability or a separate app). PQ-05 (Finance to set the rupiah cap in CR-12; the 0% and 2% tolerances are decided).

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
- BR-03. Every message is logged with status. Retry follows CR-20: transport failures can be retried; business refusals are fixed first [Proposed; Code].
- BR-04. Target latency: SAP changes visible in the hub within 15 minutes [Proposed].

**Edge cases.**
- SAP unavailable: the hub keeps working on last data, shows the data age, and queues outbound messages [Proposed].

**Acceptance criteria.**
- AC-01. Each object in BR-01 flows in the direction in BR-02.
- AC-02. A failed message is visible in the monitor with its error and can be retried.
- AC-03. Screens show a data-age warning when inbound data exceeds the latency target.

**Data and integration.** SAP document types and interface technology (for example IDoc, OData or BAPI through an integration layer) to be decided by IT [Proposed].

**Metrics.** Leading: failed messages per day; latency distribution.

**Open items.** PQ-06 (interface technology and latency target). PQ-11 (the hub is the long-term call-off record, decided 2026-11-02; whether call-offs also go to SAP is still open).

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
- BR-04. PTI's ROP and safety stock are calculated by PTI's forecast engine (`research/FORECAST-METHOD-SPEC.md`, M3). Until the engine is live, PTI's ROP comes from SAP. MOQ is master data the engine reads, not a figure it calculates [Owner, 2026-09-23, ENG-1; supersedes MN-INV-14].
- BR-05. Incoming stock is shown as an aggregate. The per-date detail is in Order Collaboration [MN-INV-04].
- BR-06. Incoming is split into in production and in transit [MN-INV-05].
- BR-07. Raw material and packaging are shown separately on the PTI view, because packaging is a finished good at the supplier [MN-INV-06]. On the supplier view they are one list, because a supplier normally supplies one type; the split appears only for a supplier that supplies both [Owner, 2026-09-21].
- BR-08. Each material shows its days of supply (CR-01) and its risk class against the supplier lead time (CR-24), with the basis shown. The CR-02 day bands are used only where the lead time is missing [Code; Owner, 2026-09-21].

**Edge cases.**
- Supplier stock has not been updated within its data-update SLA: show the last update time and flag it as stale. The SLA varies by material and supplier, because each moves differently, so it is configured per supplier and material [owner, 2026-09-17; configuration Proposed]. When a figure is stale is set by the supplier's update mode (REQ-E08-02 BR-16) [Owner, 2026-09-29].
- Supplier has no ROP: show "Not provided" [Proposed].

**Acceptance criteria.**
- AC-01. For a material and supplier, the view shows supplier SOH, PTI SOH, PTI ROP, supplier ROP, and incoming split into in production and in transit.
- AC-02. The view has no "available stock" field.
- AC-03. Raw material and packaging can be viewed separately.
- AC-04. The incoming figure links to its per-date detail in Order Collaboration.
- AC-05. Each supplier figure shows its last update time.
- AC-06. Each material shows days of supply and its risk class, calculated with CR-01 and CR-24 (CR-02 only without a lead time), and says which basis was used.

**Data and integration.** PTI SOH from SAP. PTI ROP from the forecast engine, and from SAP until the engine is live. Supplier SOH, supplier ROP, and in-production quantity from REQ-E08-02. In-transit quantity from ASNs (REQ-E07-04).

**Metrics.** Leading: share of materials with supplier stock updated within the agreed period. Lagging: KPI-04.

**Open items.** Data-update SLA values per supplier and material, to be agreed with suppliers (risk register rows 11 and 12). Since 2026-09-29 staleness follows the update mode (REQ-E08-02 BR-16); the 7-day default applies only where no mode-based limit exists [Owner, 2026-09-29, MAT-D7, MAT-D8].

#### REQ-E08-02  Supplier stock submission

> **Amended 2026-10-19 (DRC-D15).** Every ROP, the supplier ROP included, is calculated by the system [Owner, 2026-10-16, B10]. The supplier ROP column in BR-06 becomes display only once BL-196 is built (`SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` DRC-10).

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E08.01, E12.01; MN-INV-07 | MVP | P0 [Deck p.7] | Material Planner | SUP, MP, ADM | Validated |

**Business value.** Suppliers differ in digital maturity [Deck p.14, RSK-04]. Offering spreadsheet, API, and manual entry lets every supplier share stock, while ERP-connected suppliers such as DP Group can sync automatically [Deck p.11].

**Experience.**
- SUP: uploads a filled template, types stock figures into the hub, or, if API-connected, presses Sync to pull its latest figures from its own ERP. A supplier granted PTI stock access (REQ-E08-03) can also refresh PTI stock for the granted materials.
- MP: can also press Sync for an API-connected supplier, for example when chasing a stale figure.

**Step-by-step (Supplier, spreadsheet upload).**
1. The supplier downloads the stock template from the hub [MN-INV-07; download Proposed].
2. The supplier fills in SOH, ROP, and in-production quantity per material [Proposed field list].
3. The supplier uploads the file. The hub validates it and shows errors per row [Proposed].
4. The supplier fixes errors and re-uploads. Accepted figures appear in REQ-E08-01.

**Business rules.**
- BR-01. 3 submission channels: spreadsheet template upload, API sync, manual entry [MN-INV-07].
- BR-02. The spreadsheet channel uses a fixed template [MN-INV-07].
- BR-03. API sync is triggered by the supplier with a Sync button, in addition to the scheduled sync; a PTI user can also trigger it for an API-connected supplier [MN-INV-07, amended by the owner 2026-09-21]. A scheduled sync needs the backend (Stage F).
- BR-04. Manual entry is done directly in the hub [MN-INV-07].
- BR-05. A file with invalid rows is rejected row by row, not as a whole, and valid rows are accepted [Proposed].
- BR-06. Template fields, 1 row per material, or 1 row per batch when batches are given: material code; SOH; unit; supplier ROP; in-production quantity; expected production completion date; batch number, batch quantity, manufacturing date, and expiry date (optional) [Proposed; batch fields Code; manufacturing date Owner, 2026-09-21]. Batch detail stays optional because it matters only where batches expire at different times. **Amended 2026-09-29:** in-production quantity is required, 0 allowed; the completion date is required when in production is above 0; supplier ROP and the 4 batch columns stay optional. The verb enforces both on manual, template and PTI records; an API pull is exempt, because a supplier ERP may not send them [Owner, 2026-09-29, MAT-D4, MAT-D21; PR #104, #107]. **Amended 2026-11-10:** for a raw material (ROH) with stock on hand above 0, batches are required and every batch carries its expiry date, because the warehouse controls near-expiry stock by batch; batch number, batch quantity and expiry date read "Required for raw materials" in the template; packaging keeps the 4 batch columns optional; the manufacturing date stays optional; an API pull is exempt [Owner, 2026-11-10, BL-289]. The template also carries 2 optional feedstock columns, sent as a feedstock confirmation and never added to the SOH [Proposed, BL-290].
- BR-07. Rows are checked with CR-18 (numbers) and CR-19 (batch total) [Code].
- BR-08. A PTI user can record stock that a supplier sent by WhatsApp or email, on the supplier's behalf. The record shows it was entered by PTI, and the supplier sees it [Owner; detail Proposed].
- BR-09. Manual entry and template upload carry exactly the same fields and rules, on one page. There is no second stock entry point [Owner, 2026-09-21].
- BR-10. In-transit quantity is never entered by the supplier. It comes from submitted ASNs and dispatched call-offs (REQ-E07-04, REQ-E09-03), and both input methods show it read-only next to the in-production figure, so the two parts of incoming stock appear together [Owner, 2026-09-21].
- BR-11. A supplier's sync retrieves PTI stock only for materials it has been granted (REQ-E08-03). A supplier without a grant retrieves no PTI stock, and the option is not offered [Owner, 2026-09-21].
- BR-12. **Update mode.** Each supplier has a stock update mode, API or manual, kept on the supplier master; it alone decides whether the supplier is API-connected. It is changed by a governed verb held by the `compliance` lane, and each change is logged with who, when and an optional reason (MR-1 BR-02) [Owner, 2026-09-29; PR #86; "Hub administrator only" corrected to a `compliance` atom, plan AR-04; BACKLOG BL-144].
- BR-13. **Sync schedule.** An API supplier is pulled every `stockSync.intervalHours` (default 2, from 1 to 24). The schedule needs Stage F; until then the Sync button is the only trigger, and the supplier sees "Last sync", "Next sync" and "Scheduled sync: not active in the prototype" (MR-1 BR-01) [Owner, 2026-09-29; PR #85, #106; schedule BACKLOG BL-151].
- BR-14. **Weekly cycle.** A manual supplier's update cycle runs from the previous cutoff (exclusive) to the cutoff, Thursday 23:59 WIB (inclusive). The day and time are hub settings. When Thursday is not a working day on the hub calendar, the cutoff is 23:59 on the last working day before it (MR-1 BR-03) [Owner, 2026-09-29, MAT-D7; PR #85, #88].
- BR-15. A material counts as updated for a cycle when a stock record for it is accepted inside the cycle from any channel, including one entered by PTI, which stays labelled "Entered by PTI". A material assigned mid-cycle is not counted in that cycle (MR-1 BR-04, edge case 2) [Owner, 2026-09-29, MAT-D7; PR #88].
- BR-16. **Staleness by mode.** Manual: a figure goes stale at the cutoff after the cycle it was updated in. API: a figure is stale when the last successful pull is older than `stale.apiHours` (24). A failed pull keeps the previous figures and shows "Last pull failed <time>", and does not make the figure stale by itself. A per supplier × material stale period (BL-32) wins over both. A mode change mid-cycle applies from the next cycle (MR-1 BR-05, edge case 1) [Owner, 2026-09-29, MAT-D8, MAT-D17; PR #88].
- BR-17. The weekly update is part of the supplier SOP, written by Material Planning with the validation rules suppliers follow. The stock page names the SOP (MR-1 BR-06) [Owner, 2026-09-29; PR #106]. A link to the current SOP document waits on the document (BACKLOG BL-149).
- BR-18. A manual supplier sees, on its home page and the stock page, the next cutoff, how many materials are updated this cycle ("12 of 15 updated"), the materials still missing, each linking to the entry form, and the materials missed in the last cycle. An in-hub reminder listing the missing materials appears at 09:00 WIB on the working day before the cutoff and on the cutoff day (MR-1 step-by-step, AC-01) [Owner, 2026-09-29; PR #106]. Email reminders wait on the email service (BACKLOG BL-153). The panel and the To do also show the supplier's capacity and feedstock confirmations, all due at the same cutoff, so the supplier confirms stock, capacity and feedstock in one visit (MR-1 BR-07) [Owner, 2026-11-02; build BACKLOG BL-236].
- BR-19. **Template columns.** Every optional column header of the template ends with " (optional)" in English and " (opsional)" in Indonesian (MR-4 BR-01) [Owner, 2026-09-29; PR #104].
- BR-20. The header check ignores the suffix, so a template downloaded before the change still uploads (MR-4 BR-02) [Owner, 2026-09-29; PR #104].
- BR-21. The upload panel lists every column as Required, Optional or "Required when in production is above 0", with a one-line meaning, and says the batch columns are filled only when batches expire at different times, and then all 4 for that row (MR-4 BR-03) [Owner, 2026-09-29; PR #104].
- BR-22. Which of columns D to F are required is set in BR-06 as amended (MR-4 BR-04) [Owner, 2026-09-29, MAT-D4; PR #104, #107].
- BR-23. **Update compliance.** Update compliance % = weeks compliant ÷ weeks counted, over a rolling 13 weeks ending with the last completed cycle (MR-2 BR-01) [Owner, 2026-09-29; PR #105].
- BR-24. A week is compliant for a manual supplier when every material assigned to it for the whole cycle was updated in that cycle; 1 missing material makes the week non-compliant. For an API supplier, when at least 1 successful pull happened on every working day of the cycle; a failed pull is not an update. Each week is judged by the mode the supplier had at that week's cutoff (MR-2 BR-02, edge case 2) [Owner, 2026-09-29, MAT-D7; PR #105].
- BR-25. The first 4 weeks after the supplier's first material assignment are not counted. With fewer than 4 weeks counted, compliance reads "No history" and raises no flag (MR-2 BR-03) [Owner, 2026-09-29; PR #105].
- BR-26. Below `compliance.warnPct` (80%) is a warning (amber); below `compliance.flagPct` (60%) is a flag (red). The warning threshold must stay above the flag threshold (MR-2 BR-04) [Owner, 2026-09-29; PR #85, #110].
- BR-27. Performance score = (1 − w) × the delivery score (CFOT, OTIF and rejections, as today) + w × update compliance %, with w = `compliance.scoreWeight`, 0.10, fixed at release; with "No history", w is 0. The grade bands do not change. The weight moves the score, grade and band only: the compliance gate (CR-23) and the quote score's reliability axis (CR-15) read OTIF and are not affected (MR-2 BR-05) [Owner, 2026-09-29, MAT-D9; PR #105; scope corrected from source, plan AR-09]. The supplier sees its own compliance and a week-by-week strip on its performance page, and Procurement sees it on the scorecard [Owner, 2026-09-29; PR #105].

**Edge cases.**
- Uploaded material is not assigned to the supplier: reject that row [Proposed].
- API sync fails: show the error and time and keep the previous figures. **Superseded 2026-09-29:** the figures are not flagged stale by the failure; they go stale only when the last successful pull is older than 24 hours (BR-16) [Owner, 2026-09-29, MAT-D17; PR #88].
- A stock upload accepted at Thursday 23:59:30 counts in the next cycle: the accepted time decides (MR-1 edge case 4) [Owner, 2026-09-29; PR #88].
- A supplier with no materials assigned reads "No history" and raises no flag (MR-2 edge case 1) [Owner, 2026-09-29; PR #105].

**Acceptance criteria.**
- AC-01. A supplier can submit stock by template upload and by manual entry.
- AC-02. An API-connected supplier can trigger a sync with a Sync button, and so can a PTI user on its behalf.
- AC-04. The manual form and the template have the same fields.
- AC-05. In-transit quantity is shown read-only from ASNs and dispatched call-offs, and cannot be typed.
- AC-06. A supplier without PTI stock access is not offered a PTI stock refresh, and a supplier with access retrieves only the granted materials.
- AC-03. Invalid template rows are listed with a reason, and valid rows are saved.
- AC-07. A manual supplier sees its next cutoff and the materials still missing this cycle (MR-1 AC-01).
- AC-08. A material not updated by the cutoff is shown stale the moment the cutoff passes and raises `staleData`; an API supplier with no successful pull in 24 hours is shown stale (MR-1 AC-02, AC-03).
- AC-09. A record entered by PTI counts as updated and still reads "Entered by PTI"; with Thursday marked non-working, the cutoff falls on Wednesday (MR-1 AC-04, AC-05).
- AC-10. Only a holder of the update-mode atom can change a supplier's update mode, and the change is logged with who and when (MR-1 AC-06, as corrected by plan AR-04).
- AC-11. A freshly downloaded template marks every optional column in its header, a template downloaded before the change uploads, and the upload panel lists every column as Required or Optional (MR-4 AC-01 to AC-03).
- AC-12. A manual supplier that misses 1 material in a cycle shows that week red; a supplier onboarded 3 weeks ago shows "No history"; with weight 0.10, a delivery score of 90 and compliance 50%, the performance score is 86 (MR-2 AC-01 to AC-03).

**Data and integration.** Stock record per supplier, material, date: SOH, ROP, in-production quantity, channel, submitted by. API contract per supplier [RSK-02].

**Metrics.** Leading: share of suppliers submitting on schedule, by channel.

**Open items.** Material Planner to confirm the template fields in BR-06. Submission frequency follows the per-supplier, per-material data-update SLA (see REQ-E08-01).

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
- BR-04. Allocation below demand (the LTP, BR-12) requires a predefined constraint reason. The starter list is in section 3.6 [Proposed; Code].
- BR-05. Suppliers may state extra capacity they could give PTI on request, above their allocation. The field is labelled "Additional capacity" ("Kapasitas tambahan" in Indonesian) and explained where it is entered, with BE = capacity + additional capacity [Proposed; Market; label Owner, 2026-09-21; renamed from "Extra capacity if requested", Owner, 2026-09-29].
- BR-06. Capacity is kept per material group, not per SKU, because one supplier line usually makes several PTI materials [Owner, 2026-09-21].
- BR-07. The planner can filter the capacity view by supplier, material group, material, and gap weeks only, and the filter is kept in the page address [Owner, 2026-09-21].
- BR-08. The LTP (the current forecast version the supplier commits against) is compared with capacity per material group and week: the group's LTP for a week is the sum of the supplier's LTP for every material of the group, each period spread evenly over its days [Owner, 2026-09-28; ENG-D18]. Accepted by the owner, 2026-09-29.
- BR-09. BE, the supplier's total for a week, is the capacity plus the additional capacity (BR-05). It is derived, never entered or stored separately [Owner, 2026-09-28; ENG-D18]. Accepted by the owner, 2026-09-29.
- BR-10. A week whose LTP is above capacity, up to and including BE, shows amber, "needs the additional capacity". A week whose LTP is above BE shows red, "cannot be supplied", and the planner acts (bring demand forward, split to another source, or cut) [Owner, 2026-09-28; ENG-D18]. Exactly at capacity is not flagged; exactly at BE is amber. An amber week still needs the BR-04 reason. Accepted by the owner, 2026-09-29.
- BR-11. The supplier confirms a week's capacity before it can submit the LTP for that week (REQ-E06-02 BR-11). A week counts as confirmed when the group's latest capacity submission states it, a gap week with its reason included. A supplier with an LTP in a material group always has a capacity confirmation for that group. How capacity is entered (one number with overrides, or per week) stays open (BL-65); it is per week today [Owner, 2026-09-28; ENG-D19]. Accepted by the owner, 2026-09-29.
- BR-12. The LTP is the only demand figure for capacity: the capacity pages, the gap weeks, "short by", the reason rule (BR-04), the planner's filters and banner, the Order Collaboration Summary capacity status and the capacity alert all read it. A material with no LTP line has no capacity demand [Owner, 2026-09-29].
- BR-13. **Planning groups.** A planning group is a set of materials that share capacity at a supplier. Each belongs to exactly 1 SAP material group, and each material belongs to exactly 1 planning group (MR-8 BR-01) [Owner, 2026-09-29; PR #92].
- BR-14. Until Material Planning splits an SAP group, it has 1 default planning group with the same name and materials, so capacity figures are unchanged on day 1 (MR-8 BR-02) [Owner, 2026-09-29; PR #92].
- BR-15. Material Planning creates, renames, moves materials between and retires planning groups through governed verbs; each change is logged. A group with materials cannot be retired (MR-8 BR-03) [Owner, 2026-09-29; PR #92].
- BR-16. Capacity is entered and shown per supplier × planning group, and replaces the material group in BR-03, BR-06 and BR-07. A group's demand is the sum of its materials' LTP (BR-08), so the BL-133 LTP-to-capacity join follows planning groups (MR-8 BR-04) [Owner, 2026-09-29, MAT-D20; PR #92].
- BR-17. When materials move between groups, capacity entered for future weeks of the affected groups reads "Needs re-entry" for those weeks, and the week is not confirmed until the supplier submits again. Past weeks keep the group they had (MR-8 BR-05) [Owner, 2026-09-29; PR #92].
- BR-18. Planning groups are hub master data for now; whether they move into SAP is agreed with MDM (MR-8 BR-06) [Owner, 2026-09-29, MAT-D12].
- BR-19. Planning group is a filter on capacity, the stock simulation and alerts (MR-8 BR-07) [Owner, 2026-09-29; PR #92, #108]. Group names come from the planning group record, not from a fixed label list [Code, PR #92].

**Edge cases.**
- Supplier shares one line across several PTI materials: capacity is entered per material group, not per material [Proposed].
- Capacity changes after confirmation: the supplier updates it; the planner is notified if a gap appears [Proposed].

**Acceptance criteria.**
- AC-01. A supplier can enter allocated capacity per material group per week.
- AC-02. A week with allocation below demand cannot be submitted without a reason.
- AC-03. The planner sees capacity against demand with gap weeks highlighted.
- AC-04. The planner can narrow the capacity view by supplier, material group, material, and gaps only.
- AC-05. Exactly at capacity is not flagged; above capacity and exactly at BE is amber; above BE is red [Owner, 2026-09-28].
- AC-06. The supplier and the planner see each week's LTP, capacity and BE with its amber or red flag [Owner, 2026-09-28].
- AC-07. With no split made, the capacity page shows the same groups and figures as before planning groups; after a split of MG-03 into 2 planning groups, the supplier enters capacity for each and demand is summed per group (MR-8 AC-01, AC-02).
- AC-08. Moving a material marks future capacity weeks of both groups "Needs re-entry"; a material cannot be in 2 planning groups, and a group cannot mix 2 SAP groups (MR-8 AC-03, AC-04).

**Data and integration.** Capacity record: supplier, planning group (was material group until 2026-09-29, BR-16), week, allocated quantity, upside quantity, reason. Planning group: id, name, SAP material group, state, with an append-only change log. Demand from REQ-E06-01.

**Metrics.** Leading: share of pilot suppliers with current capacity confirmation. Lagging: confirmation reliability (deck p.5 baseline below 50%).

**Open items.** PQ-02 (horizon and bucket size). Recommended default: weekly buckets for 13 weeks [Proposed].

#### REQ-E08-05  Inventory and capacity alerts

> **Amended 2026-10-19 (DRC-D20).** "Supplier stock below supplier ROP" compares supplier stock with the system-calculated ROP Supplier (`SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` DRC-10), not the ROP the supplier types, which is display only (DRC-D15). Where the system figure is not available, the alert does not fire.

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
  - Supplier SOH below the system-calculated supplier ROP (ROP Supplier); the ROP the supplier declares is display only, and no system figure means no alert (DRC-D15, DRC-D20).
  - Projected stock-out before the next incoming date.
  - Committed quantity below forecast beyond tolerance (REQ-E06-03).
  - Allocated capacity below demand (REQ-E08-04).
  - Supplier data older than the stale period.
  - Supplier coverage At risk or Uncovered (CR-03) [Code].
  - A confirmed call-off due within the lead time not covered by SOH plus production (`callOffNotCovered`, PTI only, REQ-E07-04 BR-18) [Owner, 2026-09-29; PR #101].
  - No supplier lead time on record (`leadTimeMissing`, PTI only; see BR-02) [Owner, 2026-09-21].
  - The supplier marked a material Discontinued: find another source (`supplyDiscontinued`, PTI only, High; CAP-4 BR-03) [Owner, CAP-D2].
  - A blanket PO needs its next PO within 4 weeks (`blanketPoRunOut`, PTI only; CAP-9 BR-05) [Owner, 2026-10-12].
  - Supply above demand anticipation that the last week of the horizon cannot absorb (`demandAnticipationUnabsorbed`, PTI only, Medium; DRC-4 BR-02) [Owner, 2026-10-19].
  - Built: 12 rules, 7 of them PTI only (`services/transitions/inventoryAlertRules.js`, `ALERT_RULES`, `PTI_ONLY_RULES`) [Docs aligned to the build, 2026-10-23].
- BR-02. Each alert has a risk class: High, Medium, Low, set by CR-24 (days of cover against the supplier's lead time). CR-02 applies only where the lead time is missing, and a missing lead time raises its own alert [Owner, 2026-09-21].
- BR-03. Alert thresholds (the CR-24 multiples and the CR-02 fallback bands) and the stale period are one global set, editable by the Compliance role under Help & administration → Alert thresholds and stale periods, and each value can be overridden per material group (`bands.criticalBelowDays@MG-20` and similar, through `t_setting_set`). Stale period precedence: supplier × material (BL-32), then material group, then global. A change that would put a group's values out of order is refused [Owner, 2026-10-23, INV-D14; built on `feat/inv-gaps-1023`].
- BR-04. Alerts are delivered in the hub and by email [Proposed; Market]. Built: in the hub only; email waits for the notification service (BACKLOG BL-26).
- BR-05. The same condition does not raise a new alert until the open one is closed [Proposed].
- BR-06. Risk classes stay as CR-24 sets them (BR-02): High, Medium, Low, with stale data Low. There is no fourth level (MR-9 BR-01) [Owner, 2026-09-29, MAT-D1].
- BR-07. Order: risk class High to Low; within a class, fewest days to impact first; then supplier name. A group of alerts under one supplier sits at the place of its most urgent alert (MR-9 BR-02) [Owner, 2026-09-29, MAT-D1; PR #87].
- BR-08. Days to impact per rule: stock rules, days of cover; projected stock-out, days until PTI stock runs out; `callOffNotCovered`, days to the call-off's need date; `staleData`, minus the days since the figure went stale, so the oldest comes first; `capacityBelowDemand`, days to the first gap week; other rules, 0 (MR-9 BR-03) [Owner, 2026-09-29; PR #87, #101].
- BR-09. Closing an alert needs a reason from the list. The note is optional, except for "Other", where it is required. The verb refuses a close without a reason, with a retired or unknown reason, or with "Other" and no note (MR-9 BR-04) [Owner, 2026-09-29; PR #87].
- BR-10. The reason list is the admin list `alertClose` (BL-32: add, rename, retire, never delete), starting with: Call-off raised or brought forward; PO raised; Supplier updated its data; Supplier confirmed the stock by other means; Data error, no real risk; Risk accepted; Other (note required) (MR-9 BR-05) [Owner, 2026-09-29; PR #85, #87].
- BR-11. The closed tab can be filtered by reason and shows a count per reason per rule. A closure made before reasons existed reads and counts as Other (MR-9 BR-06) [Owner, 2026-09-29; PR #87].
- BR-12. The alert list shared in the 2026-09-23 meeting (MOM 6.3) is checked against the rules in BR-01; any rule on it and not in BR-01 becomes a new rule here (MR-9 BR-07) [Owner, 2026-09-29; waiting on the list, BACKLOG BL-150].

**Edge cases.**
- Many alerts from one root cause (1 supplier late on many materials): group them under 1 parent alert [Proposed; Market].

**Acceptance criteria.**
- AC-01. Each rule in BR-01 raises an alert when its condition is met in test data.
- AC-02. Every alert shows a risk class.
- AC-03. A repeating condition does not create duplicate open alerts.
- AC-04. 2 High alerts with 3 and 10 days of cover are listed 3 first, also after grouping (MR-9 AC-01).
- AC-05. Closing without a reason is refused by the verb, and so is closing with "Other" and no note; a retired reason is no longer offered, and closed alerts that used it still show it; the closed tab shows the count per reason (MR-9 AC-02 to AC-04).
- AC-06. `callOffNotCovered` fires where a call-off of 1,000 is due inside the lead time and SOH plus in production is 600 (MR-6 AC-07).

**Data and integration.** Reads REQ-E08-01, REQ-E06-03, REQ-E08-04, REQ-E09-03. Alert record: rule, material, supplier, class, days to impact (derived), status, close reason, action note.

**Metrics.** Leading: alerts closed within 1 working day. Lagging: stock-outs (KPI-04).

**Open items.** PQ-03 (confirm the starting thresholds in BR-02).

#### REQ-E08-06  Supplier trade names and one material search

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| MR-3 (`SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`); SC Hub Material meeting 2026-09-23, item 1.2 | MVP | P1 | Material Planner | SUP, MP | Validated (owner, 2026-09-29) |

**Business value.** Suppliers name materials by their own trade name, while the hub shows only PTI's code and description. A supplier cannot find its own product, and a planner cannot match a supplier's document or message to a PTI material. One trade name per supplier and one search that finds it close that gap.

**Experience.**
- SUP: records its trade name, and optionally its own material number, for each PTI material it supplies, on a "My materials" tab of the stock page; sees the state of each name and the reason for a rejection.
- MP: approves or rejects trade names, loads approved names in bulk, and finds a PTI material by any supplier's approved trade name.

**Step-by-step (Supplier, then Planner).**
1. The supplier opens "My materials", enters "Emulsense 200" for its PTI emulsifier base and submits. The name reads "Awaiting approval".
2. The planner opens Materials → Trade names, filtered to "Awaiting approval", and approves it.
3. On the inventory list the planner types "emulsens 200" and finds the PTI material, with "matched trade name 'Emulsense 200' (the supplier)".

**Business rules.**
- BR-01. One PTI material can have many trade names, at most 1 approved per supplier (MR-3 BR-01) [Owner, 2026-09-29; PR #97].
- BR-02. The supplier enters the trade name; Material Planning approves or rejects it, and a rejection needs a reason the supplier sees. A changed name goes through approval again, and the previous approved name stays in use until then (MR-3 BR-02) [Owner, 2026-09-29; PR #97].
- BR-03. A supplier sees only its own trade names, never another supplier's. PTI sees all. On PTI screens the name reads "Supplier's name"; the supplier reads "Your name" (MR-3 BR-03) [Owner, 2026-09-29; PR #97, #102].
- BR-04. One shared search replaces the page-by-page filters on the inventory lists, stock entry, the ASN line editor, call-offs, alerts and the stock simulation. It matches PTI code, PTI description and approved trade names; ignores case, accents, punctuation and extra spaces; matches every word typed, in any order; allows 1 typo in a word of 5 or more characters; ranks exact code first, then full-word matches, then part-word matches, then typo matches; and shows which field matched (MR-3 BR-04) [Owner, 2026-09-29; PR #102, #108]. Part-word matches, which the old filters allowed, are kept [Code, PR #102].
- BR-05. A trade name is 2 to 80 characters; the optional supplier material number is up to 40 (MR-3 BR-05) [Owner, 2026-09-29; PR #97].
- BR-06. Approved trade names can be loaded by PTI in bulk from a CSV with PTI code, supplier ID, trade name and supplier material number. They are approved on load, the record shows "Loaded by PTI", and loading the same file twice changes nothing (MR-3 BR-06) [Owner, 2026-09-29; PR #97].

**Edge cases.**
- Two suppliers use the same trade name for different PTI materials: allowed; the search shows both, each with its supplier (MR-3 edge case 1) [Owner, 2026-09-29].
- A supplier is unassigned from a material: its trade name stays on the record but is hidden from search (MR-3 edge case 2) [Owner, 2026-09-29; PR #97].
- The name is identical to the PTI description: accepted; the planner may reject it as redundant (MR-3 edge case 3) [Owner, 2026-09-29].

**Acceptance criteria.**
- AC-01. A supplier can submit a trade name only for a material assigned to it.
- AC-02. An approved name is found by the search on every page in BR-04; an unapproved name is not.
- AC-03. Supplier A never sees supplier B's trade name on any screen or read.
- AC-04. "emulsens 200" finds "Emulsense 200" (1 typo in a 9-character word).
- AC-05. A rejection without a reason is refused.

**Data and integration.** Supplier material name: supplier, PTI material code, trade name, supplier material number, state (Awaiting approval, Approved, Rejected, Replaced), submitted by and at, decided by and at, rejection reason. Mastered in the hub; nothing goes to SAP.

**Metrics.** Leading: share of supplier × material pairs with an approved trade name.

**Open items.** None.

#### REQ-E08-07  MRP controller (PIC) per material

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| MR-5 (`SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`); SC Hub Material meeting 2026-09-23, item 1.4 | MVP | P1 | Material Planner | SUP, MP, ADM | Validated (owner, 2026-09-29) |

**Business value.** A supplier or buyer who sees a problem on a material does not know which planner handles it. SAP already holds that person as the MRP controller; showing it on every material surface routes the question to the right planner.

**Experience.**
- MP: sees the MRP controller on inventory, alerts, call-offs, the ASN line and the stock simulation, and filters to "My materials".
- SUP: sees the name of the planner for each of its materials, not the code.
- ADM: maps each MRP controller code to a name and the hub users it stands for.

**Step-by-step (Planner).**
1. The planner mapped to "P12" opens the alert list and picks "My materials".
2. Only P12's materials remain, each showing "P12 · <name>".

**Business rules.**
- BR-01. Each material carries its MRP controller code. SAP holds it per plant; the hub keeps 1 value per material until plants are modelled (MR-5 BR-01) [Owner, 2026-09-29; PR #84].
- BR-02. An administrator maps each code to a name and 1 or more hub users, through a governed verb held by the `compliance` lane. An unmapped code shows the code only (MR-5 BR-02) [Owner, 2026-09-29; PR #90]. An administrator can also remove a mapping (`t_mrpcontroller_unmap`, BACKLOG BL-157, closed 2026-09-29).
- BR-03. The MRP controller appears on the inventory list and detail, alerts, call-offs and the ASN line, and can be filtered on each of those lists and on the stock simulation, including "My materials" for the code picked for the seat in the identity panel (MR-5 BR-03) [Owner, 2026-09-29; PR #90, #108].
- BR-04. Suppliers see the name and never the code (MR-5 BR-04) [Owner, 2026-09-29; PR #90].
- BR-05. The code comes from the SAP material feed, owned by Master Data Management (BL-103). Until the feed runs, it is sample data and labelled as such wherever it is shown (MR-5 BR-05) [Owner, 2026-09-29; PR #84, #90; feed BACKLOG BL-152].

**Edge cases.**
- A material with no MRP controller: the field is empty and the material is absent from every "My materials" filter [Proposed].

**Acceptance criteria.**
- AC-01. Every material with an MRP controller shows it on the surfaces in BR-03.
- AC-02. A planner mapped to "P12" sees only P12's materials under "My materials".
- AC-03. A supplier sees the controller's name, never the code.

**Data and integration.** Material master: MRP controller code (copy of SAP MARC-DISPO). MRP controller map: code, name, users, changed by a governed verb.

**Metrics.** None.

**Open items.** Whether PTI has more than 1 plant per material (MR-5 section 16 of the material requirements).

#### REQ-E08-08  Supplier stock simulation

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| MR-7 (`SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`); SC Hub Material meeting 2026-09-23, item 4 | MVP | P1 | Material Planner | MP | Validated (owner, 2026-09-29) |

**Business value.** Suppliers update weekly, on Thursday, but the planner decides on new POs or call-offs on other days. On a Tuesday the planner needs an estimate of the supplier's stock built from the last update plus what happened since, shown as 2 numbers that are never added together.

**Experience.**
- MP: opens Inventory → Stock simulation, picks a check date and filters, reads per supplier × material the supplier's available stock, what is already called off and not shipped, what is free to call off, and PTI inbound; expands a row for 13 weekly buckets; enters a missing figure as planner input; and opens "Create call-off" or "Create PO request" pre-filled.

**Step-by-step (Planner, on a Tuesday).** The worked example in MR-7 section g of the material requirements: supplier updated Thursday 2026-10-01 with SOH 5,000; an ASN of 1,200 shipped on 2026-10-03; 2,000 reached the distributor on 2026-10-05; 3,000 finished production on 2026-10-05, capped at 2,500 by the group's allocated capacity. On Tuesday 2026-10-06 the page reads Supplier available stock 8,300, already called off 3,000, Free to call off 5,300, and PTI inbound 1,200.

**Business rules.**
- BR-01. For supplier s, material m and check date d, with t0 the date of the latest stock record: Supplier available stock(d) = SOH(t0) − the shipped quantity of s's ASNs for m shipped after t0 and on or before d (Submitted, In Transit, Delivered or Awaiting exception) + the to-distributor quantity for m with ETA after t0 and on or before d (Booked or Shipped) + the in-production quantity for m completing after t0 and on or before d, capped by capacity (BR-04). PTI inbound(d) = the in-transit quantity for m from s (ASNs Submitted or In Transit, and dispatched call-offs) with ETA on or after d (MR-7 BR-01) [Owner, 2026-09-29; PR #103]. A Discrepancy ASN counts as shipped, and an Arrived to-distributor leg counts as arrived [Code, PR #103].
- BR-02. The 2 figures are never added together on screen, because in transit has already left the supplier (MR-7 BR-02) [Owner, 2026-09-29; PR #103, #108].
- BR-03. An ASN shipped after t0 is subtracted; once a newer stock record exists it becomes t0, and only ASNs after it count (MR-7 BR-03) [Owner, 2026-09-29; PR #103].
- BR-04. **Capacity cap.** For supplier s, planning group g (REQ-E08-04 BR-13) and week w, the in-production quantity finishing in w across the materials of g is capped at s's allocated capacity for g in w, scaled down pro rata per material, and the row says "Capped by capacity". Allocated capacity only; additional capacity is not used (MR-7 BR-04) [Owner, 2026-09-29, MAT-D11; PR #103].
- BR-05. **ETA to distributor.** The shipment's ETA; if missing, its ETD + the principal lead time for that distributor; if that is missing too, the planner enters it. The administrator maintains the principal lead times (MR-7 BR-05) [Owner, 2026-09-29; PR #103]. The shipment record does not carry its principal, so the fallback uses the distributor's shortest principal lead time (BACKLOG BL-158).
- BR-06. A supplier with no stock record reads "Cannot simulate: no stock update", and the planner may enter SOH (MR-7 BR-06) [Owner, 2026-09-29; PR #103, #108].
- BR-07. "Already called off, not shipped" (confirmed call-offs not yet covered by an ASN) and **Free to call off** = Supplier available stock − that quantity are shown beside Supplier available stock (MR-7 BR-07) [Owner, 2026-09-29, MAT-D10; PR #103, #108].
- BR-08. Planner input is kept on the simulation only, labelled "Planner input" with who and when, until the supplier's next stock record, after which it is no longer used. It never changes the supplier's stock record and never counts toward update compliance. The input is set through a governed verb held by `planning` (MR-7 BR-08) [Owner, 2026-09-29; PR #103, #108].
- BR-09. A distributor is simulated on its own stock plus to-distributor; a manufacturer has no to-distributor term (MR-7 BR-09) [Owner, 2026-09-29; PR #103].
- BR-10. The simulation is its own page (Inventory → Stock simulation), PTI only. The stock visibility page keeps no "available" figure (REQ-E08-01 BR-01) [Owner, 2026-09-29, MAT-D2; PR #108]. The manufacturer → distributor leg is named "To distributor" [Owner, 2026-09-29, MAT-D3].

**Edge cases.**
- The ASN's ship date is missing: the ASN's submitted date is used (MR-7 edge case 1) [Owner, 2026-09-29; PR #103].
- An in-production completion date in the past but after t0 counts as finished; one before t0 is ignored, and the row says "Production date before last update" (MR-7 edge cases 2, 3) [Owner, 2026-09-29; PR #103].
- A Cancelled to-distributor shipment is not counted (MR-7 edge case 4) [Owner, 2026-09-29; PR #103].
- No capacity confirmed for the week: no cap, and the row says so (MR-7 edge case 5) [Owner, 2026-09-29; PR #103].
- A check date before t0 is refused; a simulation looks forward only (MR-7 edge case 6) [Owner, 2026-09-29; PR #103, #108].

**Acceptance criteria.**
- AC-01. The worked example reproduces exactly in a test.
- AC-02. Supplier available stock and PTI inbound are shown separately and never summed.
- AC-03. A planner input shows as "Planner input" with who and when, and disappears after the supplier's next stock record.
- AC-04. In-production quantities above allocated capacity are scaled pro rata, and the row says so.
- AC-05. A missing ETA falls back to ETD + principal lead time, and the basis says so.
- AC-06. The stock visibility page shows no "available" figure.

**Data and integration.** Read-only calculation over the stock records, ASNs, to-distributor shipments, call-offs, capacity and planning groups. Planner input: supplier, material, field, value, date, entered by and at. Nothing goes to SAP.

**Metrics.** Leading: planner checks on non-Thursday days that use the simulation.

**Open items.** The acceptable load time at real volume (build plan section 1.1, input 2). The labelled sample row that reproduces the worked example on the page (BACKLOG BL-148).

### 5.5 Planning & Fulfillment: Forecast Collaboration (E06)

All requirements in this section are **Proposed**, written from market practice (section 8). Only the foresight / fixed-stock confirmation concept is validated [MN-ORD-11].

The owner confirmed the recommendations for this section on 2026-09-17 (E06-R). Rules tagged `[Owner]` come from that review.

#### REQ-E06-01  Forecast publication

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E06.01 | MVP | P0 [Proposed] | Material Planner | MP, SUP | Proposed |

**Business value.** Suppliers cannot plan capacity or feedstock without seeing PTI's demand, and today that demand travels by email and Excel [Deck p.3]. Publishing material requirements on a fixed cadence, with firmness zones, gives suppliers the lead signal that later confirmations depend on. Pilot suppliers DP Group and Lautan Luas validate this [Deck p.11].

**Experience.**
- MP: reviews the forecast calculated by the forecast engine (from SAP until the engine is live), publishes it, and sees which suppliers have viewed it.
- SUP: sees the forecast per material and period, the zone of each period, and what changed since the last version. It can download the forecast as a spreadsheet.

**Step-by-step (Supplier, Monday).**
1. A new forecast version is published. The supplier is notified [Proposed; Market].
2. The supplier opens it and sees weekly quantities for 13 weeks and monthly quantities after that [Proposed].
3. Each period is labelled Firm, Trade-off, or Forecast [Market].
4. The supplier switches to "Changes" and sees periods that moved against the previous version [Market].
5. The supplier downloads it to plan, then confirms in REQ-E06-02.

**Business rules.**
- BR-01. The forecast is the net material requirement calculated by PTI's own forecast engine (`research/FORECAST-METHOD-SPEC.md`). The engine forecasts finished-goods demand, explodes it through the bill of materials, and nets it against stock and open orders. It is published to the supplier as one forecast with the zone marking each period. Until the engine is live, the hub publishes SAP's net requirement (MRP for weeks 1 to 13, IBP for months 4 to 6) as it does today. The engine runs in the hub first and moves to SOMO later; the published forecast and its zones do not change when it moves [Owner, 2026-09-23, ENG-1; supersedes the 2026-09-21 ruling and MN-INV-14].
- BR-02. Publication cadence: weekly for packaging, monthly for raw material. An emergency re-publication is allowed at any time [Owner; Code design].
- BR-03. Periods: packaging uses weekly periods for 13 weeks, then monthly up to 6 months; raw material uses monthly periods for 6 months. Horizon and cut-over are configurable [Owner].
- BR-04. Each period carries a zone [Market]:
  - Firm: quantities no longer change.
  - Trade-off: changes are acceptable to the supplier.
  - Forecast: indicative only.
- BR-05. Zone lengths are set per supplier and material group. The Firm zone defaults to the supplier's lead time for that material group [Owner].
- BR-08. Firm and Trade-off periods need a quantity and date commitment. Forecast periods need only an acknowledgement [Owner; Code].
- BR-06. Every published version is kept. Suppliers can compare the current version with the previous one, and a Changes view lists only periods whose quantity moved [Market; Owner].
- BR-07. A supplier sees only materials it supplies [Proposed].

**Edge cases.**
- A material moves to a different supplier mid-horizon: each supplier sees only the periods allocated to it [Proposed].
- Emergency re-publication mid-week: allowed, recorded as a new version, and suppliers are notified [Proposed].

**Acceptance criteria.**
- AC-01. A published forecast shows quantity per material per period with its zone.
- AC-02. A supplier can compare the current and previous versions and see the change per period.
- AC-03. A supplier can download the forecast as a spreadsheet.
- AC-04. A supplier cannot see materials it does not supply.

**Data and integration.** Engine inputs: finished-goods sales history, price and promotion calendar, launch plan, bills of materials, lead times, MOQs, stock on hand, and open orders (`research/FORECAST-METHOD-SPEC.md`, section 5). Until the engine is live, SAP to hub: material, supplier, period, quantity, version date. Zone settings per supplier and material group.

**Metrics.** Leading: share of suppliers that viewed the forecast within 1 working day. Lagging: forecast change in the Firm zone (should be near zero).

**Open items.** ENG-1 input data: sales history, the promotion calendar, MOQs, and warehouse volume per item are not yet in the hub. PQ-07 (MRP weeks 1 to 13, IBP months 4 to 6) applies only until the engine is live.

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
- BR-04. A commit below forecast needs a predefined reason. The starter list is in section 3.6 [Owner; Code].
- BR-05. A commit within the tolerance of forecast is accepted without planner action. Outside tolerance, it becomes an exception (REQ-E06-03). Tolerance follows CR-21 [Owner].
- BR-06. Suppliers can commit by screen or spreadsheet upload, using the same fixed-template approach as stock (REQ-E08-02) [Owner].
- BR-07. Commitments are due per CR-26: 1 working day after publication for Firm periods, 3 working days for Trade-off and Forecast periods [Owner, 2026-09-21].
- BR-08. A supplier may commit an optional upside quantity above forecast [Market; Owner].
- BR-09. The commitment starts pre-filled with the forecast quantity. The supplier still submits it [Owner].
- BR-10. A commitment is kept as a draft until submitted, and the planner does not see drafts [Owner; Code].
- BR-11. A commitment for a period cannot be submitted until the supplier has confirmed capacity (REQ-E08-04) for every week the period touches, for the material's group. Weeks beyond the capacity horizon are not asked. Saving a draft and acknowledging a Forecast period are not gated. The rule is enforced by the system, not only by the page [Owner, 2026-09-28; ENG-D19]. Accepted by the owner, 2026-09-29.
- BR-12. A period whose group LTP is above BE (REQ-E08-04 BR-10) in one of its weeks needs a predefined reason before it can be submitted; "Other" needs a note. The reason is kept with each commitment of the period [Owner, 2026-09-28; ENG-D19]. Accepted by the owner, 2026-09-29.
- BR-13. The supplier submits one period at a time with one "Submit all", which sends every material of that period. It is the only way to submit on screen [Owner, 2026-09-28; ENG-D19]. Accepted by the owner, 2026-09-29.

**Edge cases.**
- Forecast re-published after commitment: periods whose quantity did not change keep their commitment; changed periods return to "awaiting commitment" [Owner; Code].
- No commitment by the deadline: escalate to the planner, as for POs [Proposed; MN-ORD-14].

**Acceptance criteria.**
- AC-01. A supplier can commit a quantity and date per period, on screen or by upload.
- AC-02. A commit below forecast cannot be submitted without a reason.
- AC-03. A commit within tolerance needs no planner action. A commit outside tolerance appears as an exception.
- AC-04. Missing commitments at the deadline are escalated.
- AC-05. Submitting a period without confirmed capacity for its weeks is refused, and names the week; with capacity confirmed it is accepted [Owner, 2026-09-28].
- AC-06. Submitting a period above BE without a reason is refused; with a reason it is accepted [Owner, 2026-09-28].
- AC-07. "Submit all" for a period submits every material of that period at once [Owner, 2026-09-28].

**Data and integration.** Commitment record: version, material, period, committed quantity, date, upside quantity, reason, submitted by.

**Metrics.** Leading: commitment coverage (share of periods committed). Lagging: CFOT (REQ-E10-01); confirmation reliability.

**Open items.** PQ-08 (confirm CR-21 values with suppliers).

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
- BR-02. Periods are coloured by commitment ÷ forecast, per CR-22 [Market; Owner]:
  - Green: 1.0 or more.
  - Amber: 0.8 to below 1.0.
  - Red: below 0.8.
- BR-03. Cumulative commitment against cumulative forecast is shown over the horizon [Market].
- BR-04. Exceptions are ranked: overdue first, then Firm zone, then lowest days of supply (CR-01) [Owner; Code].
- BR-05. Planner actions on an exception: accept, request revision, reassign demand. Request revision and reassign need a note. Every note and revision request is kept in a log the supplier can see [Owner; Code].
- BR-06. Automatic reminders go to suppliers with missing commitments at half the deadline and at the deadline. After the deadline, the missing commitment escalates to the planner [Market; Owner].
- BR-07. The planner sees supplier coverage per material (CR-03), including distributor lead times from principal to distributor, labelled as an estimate [Owner; Code].

**Edge cases.**
- Supplier commits more than forecast in Firm zone: show as information, not error [Proposed].

**Acceptance criteria.**
- AC-01. Each period shows the gap as quantity and percentage, coloured by tolerance level.
- AC-02. The exception list is sorted with Firm-zone exceptions first.
- AC-03. A planner action on an exception is saved with a note and visible to the supplier.

**Data and integration.** Reads REQ-E06-01, REQ-E06-02, REQ-E08-01.

**Metrics.** Leading: open exceptions older than 2 working days [Proposed]. Lagging: KPI-04; KPI-05.

**Open items.** PQ-08 (confirm CR-21 and CR-22 values).

#### REQ-E06-04  Fixed stock (FS) reconcile

> **Superseded 2026-10-19 (DRC-D14).** FS means feedstock, not fixed stock [Owner, 2026-10-16]. The page is renamed "Feedstock reconcile" and compares, per supplier × material, the POs ordered with the call-offs and ASNs requested, daily (DRC-15a in `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md`). BL-201 is built (GitLab MR !4, 2026-10-19), so the outcomes and settlement below are retired; they are kept here as the record of the 2026-09-29 rules. The leftover rule is on hold (DRC-15b, BL-207).

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E06.02; ENG-D21; BL-134 | MVP | P1 [Proposed] | Material Planner | MP, SUP, BUY | Validated (reconcile decided by the team 2026-09-28, ENG-D21; rules decided by the owner 2026-09-29) |

**Business value.** The foresight / fixed-stock commitment (REQ-E06-02) asks the supplier to make and hold stock for PTI. Nothing today checks, at the end of a cycle, whether PTI then called that stock off, and whether the supplier really holds what was not called off. The reconcile closes that loop: it shows where PTI under-called a commitment (a settlement question for PTI), where the supplier does not hold what it committed, where PTI called off stock nobody committed, and where stock sits above the maximum [Owner/Team, 2026-09-28].

**Experience.**
- MP: sees, per supplier, material and cycle, what the supplier committed, what it accepted of PTI's call-offs, what it holds, the maximum stock, and the outcome, with a count per outcome. Under-called rows carry the quantity flagged "liability — not priced". A cycle still running is marked provisional [Owner/Team, 2026-09-28; accepted 2026-09-29].
- BUY (Procurement): sets, changes or clears the maximum stock of a supplier and material from the row; every change is kept [Owner, 2026-09-29].
- SUP: sees the same rows for its own materials only, read-only, so both sides read the same figures before the settlement conversation [accepted 2026-09-29].

**Step-by-step (Planner, end of W3).**
1. The planner opens Forecast → Fixed stock reconcile.
2. Material X from supplier A reads: committed 99,600; called off 88,000; not called off 11,600; held 85,000; maximum 90,000; outcome "PTI under-called"; liability — not priced 11,600.
3. The planner takes the flagged quantity to the settlement conversation with the supplier, outside the Hub (ENG-D17).

**Business rules.**
- BR-01. **Cycle.** Packaging is reconciled at the end of each cycle of 3 weeks, W1 to W3 [Owner/Team, 2026-09-28: "FS Reconcile end W3"]. The cycle length is an administrator setting (Administration → Tolerances and rule values, default 3 weeks) [Owner, 2026-09-29]. Cycles run back to back from a fixed Monday, the first week of the Hub's first published packaging forecast (2026-08-31) [accepted 2026-09-29]. Raw material is committed per month (REQ-E06-01 BR-03), so it is reconciled at the end of each month [accepted 2026-09-29].
- BR-02. **Rows.** One row per supplier, material and cycle that has started, where something was committed or called off. A pair with nothing committed and nothing called off has no row [accepted 2026-09-29].
- BR-03. **Committed** is the sum of the supplier's submitted Firm and Trade-off commitments for the cycle's periods (REQ-E06-02). A period still awaiting a commitment counts as zero and is shown as awaiting. Forecast-zone periods carry only an acknowledgement and are not counted. A packaging month beyond the weekly horizon is not read: it is re-cut into weeks before its cycle starts. For each period the commitment standing in the latest version that covers the period is used, so a period that has left the current version keeps the commitment it ended with; if that version moved the period's demand away from the supplier, the supplier has nothing committed for it [accepted 2026-09-29].
- BR-04. **Called off** is what the supplier **accepted** of PTI's call-offs (REQ-E09-03): the deliveries of a confirmation once it is accepted, automatically or by the planner; where the planner has changed an accepted call-off and the change is not yet confirmed, the deliveries both sides last agreed. Each delivery counts in the cycle of its agreed date [Owner, 2026-09-29].
  - A call-off still awaiting the supplier's confirmation, and a counter-offer (new date, changes, partial) still awaiting the planner, are **not counted** until accepted. The row shows them as a note: "n call-offs awaiting the supplier — not counted" and "n counter-offers awaiting PTI — not counted", placed in the cycle of the call-off's need date [Owner, 2026-09-29; the split into two notes Proposed].
  - A rejected call-off, a draft and a dismissed draft count nothing [Owner, 2026-09-29].
- BR-05. **Held** is the supplier's stock on hand (REQ-E08-02): while the cycle runs, the current figure the Stock page shows; once it has ended, the latest figure submitted by the cycle end. With no such figure, held is "not reported" — never assumed to be zero [accepted 2026-09-29].
- BR-06. **Maximum stock** is the most the supplier may hold for PTI of the material, a supplier × material value **maintained by Procurement** [Owner, 2026-09-29]. It is set, changed or cleared with one governed act (`t_maxstock_set`, the `maxstock:set` permission held by the Procurement role only); every change is kept with the value before it, who made it and when. The planner reads it and does not set it; a supplier reads its own and cannot set it. Where none is set the row reads "No max stock agreed", and nothing is capped or above the maximum.
- BR-07. **Not called off** = committed − called off, never below zero. Where PTI called off more than was committed, the row shows 0 and the note "called off beyond commitment" with the difference [Owner, 2026-09-29].
- BR-08. **Outcome**, the first that applies:
  1. Not called off above zero and held not reported → **Stock not reported**.
  2. Not called off above zero and held below it → **Supplier short** (short = not called off − held).
  3. Not called off above zero and held at least that → **PTI under-called**.
  4. Nothing committed and something called off → **Not committed**; no liability is flagged [Owner, 2026-09-29].
  5. Held above the maximum stock → **Above max stock**.
  6. Otherwise → **Balanced**.
  [Order and outcomes 1–3, 5, 6 accepted 2026-09-29.]
- BR-09. **Settlement.** For "PTI under-called" and "Supplier short", the quantity flagged is min(not called off, held, maximum stock where set), shown as "liability — not priced". It is flagged, not priced, and agreed outside the Hub [Owner/Team, 2026-09-28, following ENG-D17; accepted 2026-09-29]. Stock above the maximum is the supplier's own and is never flagged. "Stock not reported" and "Not committed" flag nothing.
- BR-10. **Provisional and final.** A cycle is read from its first day. Until it ends the row is provisional, because PTI can still call off; after its end it is final [accepted 2026-09-29].
- BR-11. The list is sorted most urgent first: Supplier short, PTI under-called, Stock not reported, Not committed, Above max stock, Balanced; then the latest cycle first. Each outcome has a count tile that filters the list [accepted 2026-09-29; Not committed placed by the owner, 2026-09-29].
- BR-12. **Who sees what.** The planner sees every supplier. A supplier sees only its own rows, scoped by the service, never by the page, including the liability flag [accepted 2026-09-29].

**Worked example.** Supplier A, PET bottle 200 ml, cycle W1 to W3 (31 Aug to 20 Sep 2026). Commitments: W1 34,300, W2 31,000, W3 34,300 → committed 99,600. The deliveries the supplier accepted on PTI's call-offs, dated in the cycle, total 88,000. Held at the end of W3: 85,000. Maximum stock set by Procurement: 90,000.
- Not called off = 99,600 − 88,000 = 11,600. Held 85,000 ≥ 11,600 → **PTI under-called**; liability — not priced = min(11,600; 85,000; 90,000) = **11,600**.
- If held were 7,000: **Supplier short** by 11,600 − 7,000 = 4,600; liability — not priced 7,000.
- If no stock figure were submitted: **Stock not reported**; nothing flagged.
- If PTI had called off 101,000: **Balanced**; not called off reads 0, with 1,400 called off beyond the commitment. With 95,000 held: **Above max stock**, 5,000 the supplier's own.
- If the maximum stock were 10,000: liability capped at **10,000**; 75,000 above the maximum.
- If nothing had been committed and 12,000 called off: **Not committed**; nothing flagged.
- A further call-off of 15,000 awaiting the supplier's confirmation adds nothing to called off; the row notes "1 call-off awaiting the supplier — not counted".

**Edge cases.**
- No stock figure: held "not reported"; an uncalled commitment reads "Stock not reported" (BR-05, BR-08).
- No maximum stock set: "No max stock agreed"; nothing capped, nothing above the maximum (BR-06).
- A confirmation accepted with a changed quantity or date counts the accepted quantity on the accepted date, which may fall in another cycle.
- A stock figure submitted after an ended cycle's end is not used for that cycle.
- Units: committed, called off, held and maximum stock are in the material's unit; no conversion is made.
- A maximum stock for a supplier and material the Hub does not assign is refused.

**Acceptance criteria.**
- AC-01. For each supplier, material and started cycle, the page shows committed, called off, not called off (never negative), held (or "Not reported"), maximum stock (or "No max stock agreed"), the outcome, and whether the row is provisional or final.
- AC-02. The outcome follows BR-08, and the flagged quantity follows BR-09, labelled "liability — not priced" and never priced.
- AC-03. Only accepted call-off deliveries count as called off; call-offs awaiting the supplier and counter-offers awaiting PTI are noted, not counted; Forecast-zone periods are not counted as committed.
- AC-04. A supplier sees only its own rows, read-only.
- AC-05. A Procurement seat can set, change and clear the maximum stock; a planner-only seat is refused and sees that it is Procurement's act; a supplier is refused. Every change is kept.
- AC-06. The packaging cycle length is changed on the administrator's Tolerances page and the reconcile uses the value in force.
- AC-07. At 1280 px and wider, the Result and Status columns are visible without scrolling sideways.
- AC-08. The worked example above reproduces exactly (`src/services/transitions/fixedStockReconcile.test.ts`).

**Data and integration.** Reads REQ-E06-02 (commitments, per forecast version), REQ-E09-03 (call-offs and their confirmations), REQ-E08-02 (stock submissions), and the maximum stock per supplier and material (Procurement's ledger, BR-06). Computed at read; the only record it adds is the maximum-stock ledger.

**Metrics.** Leading: rows "Stock not reported" at cycle end (should be zero); rows with call-offs still awaiting the supplier at cycle end. Lagging: quantity flagged "liability — not priced" per cycle; share of committed quantity called off per cycle.

**Open items.** Whether the reconcile should raise a Home task or alert at cycle end. Whether a maximum stock should also be entered through the supplier-material master data feed once one exists.

### 5.6 Planning & Fulfillment: Call-off Management (E09)

All requirements in this section are **Proposed**, written from market practice (section 8). Validated inputs: PO and call-off are separate objects [MN-ORD-01], OTIF is measured per call-off [MN-ORD-09], and ROP is calculated by the forecast engine [ENG-1, superseding MN-INV-14].

#### REQ-E09-01  Replenishment recommendation from the forecast engine

> **Amended 2026-10-19.** ROP Order and ROP Fisik follow the OSIP formulas by level (`SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` DRC-7, DRC-10); the engine's fill-rate safety stock (REQ-E14-04) stays as a challenger behind a switch. A call-off is drafted when SOH reaches ROP Fisik and released only on planner approval; with no umbrella PO balance left the hub recommends a PR in SAP (DRC-13, BL-199).

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E09.01; ENG-1 | MVP | P0 [Proposed] | Material Planner | MP | Proposed (source decided, ENG-1) |

**Business value.** Call-offs are not model-based today [Deck p.5]. Turning the forecast engine's recommendations into a review-and-release list lets planners release call-offs consistently, moving toward the Dynamic OSIP Engine in the roadmap [Deck p.4].

**Experience.**
- MP: sees recommended call-offs per material and supplier with quantity and need date, context from inventory visibility, and releases, edits, or dismisses each.

**Step-by-step (Planner).**
1. The planner opens Recommendations. The forecast engine has proposed 14 call-offs [ENG-1; Proposed].
2. Each row shows PTI SOH, PTI ROP, incoming quantity, and the recommended quantity and date [Proposed].
3. The planner edits 1 quantity to a full pallet and releases 13 [Proposed].
4. The planner dismisses 1 with the reason "Promotion cancelled" [Proposed].
5. Released recommendations become call-offs (REQ-E09-03).

**Business rules.**
- BR-01. The ROP and recommendation cycle are calculated by the forecast engine: net requirement, safety stock, and order size within MOQ and warehouse space (`research/FORECAST-METHOD-SPEC.md`, M2, M3, M5). Until the engine is live they come from SAP [Owner, 2026-09-23, ENG-1; supersedes MN-INV-14]. Which replenishment method applies to which material segment is still open (REPL).
- BR-02. A recommendation must reference an open umbrella PO with the same supplier and material [MN-ORD-01; Proposed].
- BR-03. Edited or dismissed recommendations record the planner's reason [Proposed].
- BR-04. Released call-offs cannot exceed what remains on the umbrella PO. The PO holds value [PQ-01], so the check is on remaining value, or on quantity if PQ-12 confirms quantity is available [Proposed]. Remaining follows CR-04 [Code].
- BR-05. The planner can generate a series of draft call-offs from a total quantity: number of call-offs = total ÷ quantity per call-off, rounded up; spaced weekly, monthly, or quarterly; the last call-off takes the remainder. Drafts are edited freely and become call-offs only when released [Code].

**Edge cases.**
- No open umbrella PO: show the recommendation as blocked with "No PO" [Proposed].

**Acceptance criteria.**
- AC-01. Engine recommendations appear with quantity, date, and inventory context.
- AC-02. A planner can release, edit, or dismiss each, with a reason for edit and dismiss.
- AC-03. Release is blocked when it exceeds what remains on the umbrella PO.

**Data and integration.** From the forecast engine: recommendation (material, supplier, quantity, date, ROP). SAP to hub: umbrella PO value. Released call-offs are stored in the hub, not sent to SAP [PQ-01].

**Metrics.** Leading: share of call-offs released from recommendations unedited [Proposed]. Lagging: KPI-04.

**Open items.** REPL (replenishment method, deferred). PQ-07 (SAP source, until the engine is live). PQ-11. PQ-12.

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

> **Amended 2026-10-19.** A call-off delayed because LTP dropped needs supplier approval, and demand anticipation is adjusted (`SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` DRC-5, BL-191). Max stock caps call-offs only (DRC-13 BR-03).

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
3. A later date always needs approval (CR-05), so the confirmation goes to the planner as Awaiting Approval [Owner, 2026-09-21].
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
- BR-03. Quantity and date tolerance follow CR-05: up to 5% over accepted, any shortfall a visible partial delivery, and a late date always needs planner approval. There is no fixed early-delivery allowance: an early date is allowed once the Material Planner team confirms it, which also stands for the warehouse's part [Owner, 2026-11-02, PQ-08].
- BR-04. A confirmation within tolerance is accepted automatically. Outside tolerance it waits for planner approval: Awaiting Approval, Approved, Rejected [Market].
- BR-05. Confirmation is due within 1 working day of release, matching the PO rule. No response escalates [Proposed; MN-ORD-04, MN-ORD-14].
- BR-06. An ASN can be created only for a confirmed call-off [Market; MN-ORD-05].
- BR-07. OTIF is measured per call-off against the approved date and quantity, using CR-06 to CR-08 [MN-ORD-09; "approved" Proposed; Code].
- BR-08. Automatic reminder to the supplier before the need date if no ASN exists, per CR-09: 7 days before [Market; Code].
- BR-09. Each call-off is JIT or forecast-based (section 3.5), set at release. The type no longer changes the tolerance: CR-05 applies the same rule to both [Owner, 2026-09-21].

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

**Open items.** PQ-11 (migrating today's manual call-off records; the hub as the long-term record was decided 2026-11-02). The PQ-08 date tolerance was decided 2026-11-02.

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
- BR-06. The planner is reminded when a call-off is within 7 days of its need date with no heads-up (CR-09) [Market; Code].

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

**Open items.** Dock and slot scheduling is out of scope for now and may return in a later phase.

### 5.7 Performance & Analytics (E10)

#### REQ-E10-01  CFOT and OTIF measurement

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E10.01; MN-ORD-07, MN-ORD-08, MN-ORD-09 | MVP | P1 [Proposed] | Procurement (dashboard); Material Planning (delivery measures) | MP, BUY | Validated (definitions); Proposed (formulas) |

**Business value.** Supplier performance is not tracked in a standard way today [Deck p.3, C4]. Measuring CFOT per PO and OTIF per call-off from hub data turns every confirmation and delivery into evidence for sourcing decisions. Moves KPI-05.

**Experience.**
- MP, BUY: see CFOT and OTIF per supplier on the performance dashboard, and OTIF in supplier sourcing.

**Step-by-step (Buyer).**
1. The buyer opens the supplier performance dashboard.
2. The buyer compares CFOT and OTIF across suppliers of a category.
3. When inviting suppliers to an RFQ, the buyer sees the same OTIF (REQ-E03-01).

**Business rules.**
- BR-01. CFOT (Casefill On-Time) is measured per PO, per supplier [MN-ORD-07].
- BR-02. OTIF is measured per call-off [MN-ORD-09].
- BR-03. OTIF is shown on the performance dashboard and in supplier sourcing [MN-ORD-09].
- BR-04. Supplier rejections count in the performance assessment [MN-ORD-08].
- BR-05. Proposed formula, CFOT per PO: quantity confirmed and delivered by the confirmed date, divided by PO quantity [Proposed].
- BR-06. OTIF per call-off: 1 when the call-off is on time (CR-07) and in full (CR-08), else 0. Receipts are matched to call-offs with CR-06. Aggregated as the percentage of call-offs due in the period [on-time and matching Code; in-full Proposed; Market].
- BR-07. Target status follows CR-17: target 90% [Code].
- BR-08. The period filter recalculates CFOT and OTIF for the POs and call-offs due in the chosen period [Proposed].

**Edge cases.**
- Planner-initiated date change: measure against the latest date agreed by both sides [Proposed].

**Acceptance criteria.**
- AC-01. The dashboard shows CFOT and OTIF per supplier for a selected period.
- AC-02. OTIF is calculated per call-off and CFOT per PO.

**Data and integration.** PO responses (REQ-E07-02), call-offs (REQ-E09-03), goods receipts (REQ-E07-06).

**Metrics.** This requirement produces KPI-05.

**Open items.** CFOT formula (BR-05) needs business confirmation. In-full tolerance (PQ-08).

### 5.8 System Integration: API Shipment Aggregator (E13)

#### REQ-E13-01  Supplier access to TMS shipment tracking

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| E13.01; MN-INV-13 | Not in the MVP (D-03, 2026-09-21) | P2 [Proposed] | IT | SUP, MP | Validated |

**Business value.** ETA and in-transit visibility are not real-time today [Deck p.5]. Giving suppliers access to PTI's TMS to track their deliveries is a fast start, before a full API integration. Relevant to DKSH's pilot need for shipment visibility [Deck p.11].

**Experience.**
- SUP: tracks its deliveries to PTI in the TMS.
- MP: sees the resulting in-transit status and ETA.

**Step-by-step.** To be detailed once the phase is decided (D-03).

**Business rules.**
- BR-01. Initially, suppliers get TMS access to track deliveries to PTI [MN-INV-13].
- BR-02. When integration is mature, exchange moves to API [MN-INV-13].
- BR-03. Decided (D-03, 2026-09-21): no TMS integration in the MVP. Delivery tracking is covered by the 3PL tracking link on the ASN (REQ-E07-04 BR-05) [Owner].

**Acceptance criteria.** To be written once the phase is decided.

**Open items.** D-03 (phase). Which TMS, and supplier account model [Proposed].

---

### 5.9 Planning: In-house Forecast Engine (E14)

Detailed in `FORECAST-ENGINE-REQUIREMENTS.md`, which uses this file's template plus a Calculation block per requirement. The epic follows owner decision ENG-1 (section 9); every requirement in it is Proposed. ENG-D1, D2, D3, D5, D8 and D9 are decided (section 9); the rest are listed in section 4 of that file.

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
| A-05 | Minimum OTIF for the compliance gate (CR-23), and whether "No history" passes (proposed: passes) | REQ-E03-05 |
| A-01 | Check with Mas Ary Hidayat on compliance and capability for RFx | REQ-E03-01 to REQ-E03-04 |
| PQ-11 | The hub is the long-term record for call-offs (decided 2026-11-02, section 9). Still open: whether call-offs ever need to go back to SAP or another system, and whether today's manual records (for example spreadsheets) are migrated | REQ-E07-08, REQ-E09-01, REQ-E09-03 |
| PQ-05 | Finance to set the absolute rupiah cap for invoice price variance (CR-12); the 0% and 2% tolerances are decided | REQ-E07-07 |
| PQ-06 | Interface technology and latency target | REQ-E07-08 |
| CAP-1 | Does supplier capacity usually stay the same every week or change week to week? This shapes how capacity is entered. Proposed: one number for all weeks with per-week overrides | REQ-E08-04 |
| CR24-1 | Days of cover in CR-24 measured on supplier stock (built) or PTI stock | REQ-E08-05 |
| ADM-1 | Whether the combined buyer "All" role may change the working calendar and the 3PL list, or the Hub administrator only | Section 3.4, REQ-E07-04 |
| GR-1 | Over-delivery measured against the order (CR-25) or the ASN (REQ-E07-06 BR-03). Whether a receipt kept open reopens the missing quantity was decided 2026-11-02 (section 9) | REQ-E07-06 |
| MAT-D15 | The documents required for Approved and Preferred, from Procurement and Quality. Until then placeholder lists are in force and the qualification checks warn instead of refusing (MAT-D19) | CE-12d, CE-12g |
| MR-1 BR-07 | The SOP document to link on the stock page. Which weekly confirmation the update goes with was decided 2026-11-02 (section 9) | REQ-E08-02 BR-17 |
| MR-9 BR-07 | The alert list shared in the 2026-09-23 meeting, to check against REQ-E08-05 BR-01. The rules that exist today are listed for the team to confirm in `research/ALERT-RULES-FOR-TEAM-2026-11-02.md` | REQ-E08-05 BR-12 |

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

### 8.3 RFx best practice basis

Research date: 2026-09-21. The full note, with every source link, is `research/RFX-BEST-PRACTICE-2026-09.md`. The strongest source is the SAP Ariba Event Management API guide (version 2605), which lists the data model; Oracle Fusion Sourcing documentation is public and detailed; Coupa buyer documentation sits behind a login, and Jaggaer, Ivalua, GEP, Zip and Keelvar are covered mainly through product pages, read as claims.

| Pattern | Where it appears in this file | Evidence |
|---|---|---|
| Events are copied into follow-on events, choosing what carries over (content, items, suppliers, even prior bids); RFI used as the qualifying round | CE-04, CE-09 | Ariba API guide p.53–54, `itemsToIncludeForCopy` ([PDF](https://help.sap.com/doc/7b8bf5aa499341489687038610fa0bea/cloud/en-US/f342574f194c4af6a24a42087a665607.pdf)); Oracle "Cross Copy RFI to RFQ" ([docs.oracle.com](https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/negotiation-types.html)) |
| Sections of typed questions: text, long text, yes/no, number, money, percentage, date, attachment, value lists; required flag; min–max ranges | REQ-E03-02 BR-06 to BR-09 | Ariba API guide pp.46–49; Oracle requirements and sections ([docs.oracle.com](https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/negotiation-controls.html)) |
| Templates and a reusable library | CE-03 to CE-05 | Ariba sourcing library and template administration ([learning.sap.com](https://learning.sap.com/courses/managing-sourcing-and-event-templates/introducing-sourcing-template-administration)); Coupa "from template" and "Copy Event" (release note, partially verified) |
| Bidder agreement or NDA as an access gate before confidential content is shown | REQ-E03-02 BR-12, REQ-E03-03 BR-16, REQ-E03-04 BR-05, BR-06 | Ariba bidder agreement ([help.sap.com](https://help.sap.com/docs/strategic-sourcing/participating-in-sourcing-events/how-to-accept-bidder-agreement-and-complete-event-prerequisites)) and "visible after access gate is cleared" (API guide); Coupa T&C acceptance before content ([AstraZeneca Coupa guide](https://www.astrazeneca.com/content/dam/az/Partnering/supplier/pdf/Suppliers_Guide_to_AZ_Sourcing_Events_in_Coupa_S2C_ENG.pdf)) |
| Commercial terms answered term by term, with comments and deviations | REQ-E03-04 BR-03, BR-04 | Oracle clause deviations ([docs.oracle.com](https://docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/create-supplier-contracts-from-negotiation-award.html)); Ariba participant comments per term (API guide) |
| Line items with buyer-filled and supplier-filled attributes | REQ-E03-03 BR-07, BR-08 | Ariba term `requiredType` (API guide); Oracle line attributes ([docs.oracle.com](https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/negotiation-lines.html)) |
| Buyer-defined quantity tiers, priced per tier | REQ-E03-03 BR-09 | Oracle price tiers (negotiation lines page); Ariba volume scales (help.sap.com, snippet only) |
| One-time costs beside the unit price, rolled into a total | REQ-E03-03 BR-10, REQ-E03-05 BR-01b | Ariba cost terms and formulas ([learning.sap.com](https://learning.sap.com/courses/working-with-pricing-tactics-and-response-options-within-sap-ariba-guided-sourcing/creating-a-custom-formula-within-a-line-item_da514cf2-4777-43b4-919a-74f7e2529859)); Oracle fixed cost factors. A named "tooling/mold/NRE" term is not verified in any vendor |
| Alternative bids and supplier-added items, excluded from ranking by default | REQ-E03-03 BR-17, REQ-E03-04 BR-07, REQ-E03-05 BR-01c | Ariba alternative bids ([help.sap.com](https://help.sap.com/docs/strategic-sourcing/participating-in-sourcing-events/topics-about-submitting-alternative-bids)); Oracle alternate lines; Keelvar ([keelvar.com](https://www.keelvar.com/sourcing-optimization-software)) |
| Intent to participate, decline with a reason | REQ-E03-03 BR-15 | Coupa "I intend / I decline" (AstraZeneca guide); Ariba decline reasons ([help.sap.com](https://help.sap.com/docs/strategic-sourcing/common-data-import-and-administration-guide-for-sap-strategic-sourcing-solutions-and-sap-ariba-supplier-management-solutions/how-to-customize-supplier-reasons-for-declining-to-bid)) |
| Event messages from suppliers, answered to one or to all | REQ-E03-03 BR-22 | Ariba event messages ([learning.sap.com](https://learning.sap.com/learning-journeys/introducing-projects-within-sap-ariba-sourcing/customizing-event-messages_ed875a6e-a5d9-4b07-8bb8-9a881d1926ef)); Coupa message center. Automatic anonymisation of a broadcast question is not verified in any vendor |
| Revise until the deadline, every version kept | REQ-E03-03 BR-21 | Coupa (Compass participate page); Ariba revised responses |
| Award per line item, split by percentage or quantity | REQ-E03-05 BR-06, BR-06a | Ariba manual award scenarios ([learning.sap.com](https://learning.sap.com/courses/project-monitoring-and-event-administration-within-sap-ariba-guided-sourcing/creating-manual-award-scenarios-to-award-guided-sourcing-events)); Oracle award by line (26B What's New) |
| RFI for open-spec needs, with indicative, non-binding prices | CE-10, REQ-E03-04 BR-07, BR-08 | [Mercanis](https://www.mercanis.com/wikis/what-are-rfx-procedures); [SiftHub](https://www.sifthub.io/blog/rfi-vs-rfp) |

**Not verified in any vendor, so the hub's own design:** a native Indicative / Firm price flag (CE-10), a sample-request object with tracking, automatic anonymisation of a published clarification, and a documented "extract a supplier PDF quote into the grid" feature in the large suites (claimed by Ivalua in marketing).

**Leading edge, kept for later** ("RFx: later, not in the MVP" in section 5.2): Excel bid sheets (Coupa CSO line validation, Ariba offline sheets), team scoring with knock-out and show-if questions (Oracle knockout score, Ariba conditions), two-envelope sealed bids (Oracle two-stage RFQ, Ariba envelopes), AI drafting and bid analysis (Coupa Navi, SAP Joule, Oracle AI Assist, Fairmarkit, Keelvar Kai), and optimisation scenarios (Ariba, Coupa CSO, Keelvar).

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
| RFX-1 | Supplier filters for sourcing events | Category and purchasing group |
| RFX-2 | Is a purchase requisition required to create an RFQ | No. An RFQ can start from scratch, an RFI, or a purchase requisition |
| RFX-3 | Bid comparison, negotiation, and award | A negotiation step is required, and an event can be awarded to more than 1 supplier |
| A-04 | How an RFI or RFP is created before it is sent | The buyer creates it; no sourcing request in the MVP. Central library, edited per event. Procurement owns the library and IT changes it on request. No approval before sending (section 3.6a). The 2026-09-18 answer also ruled out save-as-template and copying a past event; **that part was reversed on 2026-09-21 (RFX-D2)** |
| BL-02 / PQ-09 | Event-based strategy analysis in the MVP | No. It belongs in the planning suite |
| BL-03 / D-03 | Supplier TMS access | No TMS integration in the MVP. The ASN names its 3PL and tracking number, and the hub links out to the 3PL's public tracking page (REQ-E07-04 BR-05) |
| BL-04 / A-03 | Compliance in sourcing | A pass/fail gate, not a weight (CR-23): valid halal, valid BPOM where required, GMP / ISO 22716 for cosmetic raw material, not Suspended or Blacklisted, minimum OTIF. A supplier that fails can be invited but cannot be awarded. Qualified suppliers are scored on price 40%, lead time 20%, reliability 40% (CR-15) |
| BL-05 / PQ-08 | Call-off tolerances and commitment deadline | Up to 5% over accepted; any shortfall a visible partial; late always needs approval (CR-05). Commitment deadline 1 working day for Firm, 3 for Trade-off and Forecast (CR-26). Early-delivery allowance waits on the warehouse; decided 2026-11-02, see PQ-08 below |
| BL-06 / PQ-04 | Goods receipt tolerance | 0% over; shortfall above 2% flagged (CR-25) |
| BL-07 / PQ-05 | Invoice price tolerance | 0% where a contract price exists; 2% otherwise, within an absolute rupiah cap set by Finance (CR-12) |
| BL-08 / PQ-02 | Capacity horizon | 13 weekly buckets |
| BL-09 / PQ-03 | Alert risk class | Days of cover against supplier lead time (CR-24); day bands only as a fallback |
| BL-10 / PQ-07 | Forecast source | MRP for weeks 1–13, IBP for months 4–6, published as one forecast. **Superseded 2026-09-23 by ENG-1**; applies only until the engine is live |
| ENG-1 | Who calculates the demand forecast, material requirement, ROP, and replenishment | PTI builds its own forecast engine. It runs in the hub first and moves to SOMO later. SAP IBP and other external planning engines are not used. Supersedes MN-INV-14 and the PQ-07 answer. Methods: `research/FORECAST-METHOD-SPEC.md` (owner, 2026-09-23) |
| ENG-D1 | Who owns the forecast engine's input data | The Master Data Management team: forecast inputs, bill-of-materials breakdown, stock, ERP master data. Synthetic data until they connect SAP (owner, 2026-09-23) |
| ENG-D2 | Stock-accuracy tolerance for the engine | 2% to start; flag, do not block; tighten per material class after the first counting cycle (owner, 2026-09-23) |
| ENG-D3 | Show suppliers their confirmation rate from day one | Yes, their own measures plus PTI's plan-change figure for their materials (owner, 2026-09-23) |
| ENG-D5 | Service targets for safety stock | Fill rate, tiered 95% / 90% / 85% (owner, 2026-09-23) |
| ENG-D8 | Trade-off tolerance band | ±10% per version plus a cumulative cap from first publication, starting at ±20% (owner, 2026-09-23) |
| ENG-D9 | Plan damping weight | 0.5 in Trade-off, 0 in Forecast, tuned from the backtest (owner, 2026-09-23) |
| KPI-1 | BL-66: align OTIF and CFOT with REQ-E10-01 and CR-08 | Yes: a counter-offer counts when the planner accepts it; a planner change counts after the supplier re-confirms; partial receipts are summed; a dispatched call-off with no receipt is missed 3 days after the need date (owner, 2026-09-23) |
| KPI-2 | Early deliveries in OTIF and CFOT | One rule for both: on time only if received no more than 7 days before the date (the CR-06 window), until BL-56 sets the early allowance (owner, 2026-09-23). Amended (owner, 2026-11-02): an early receipt on a date the Material Planner team confirmed counts as on time in OTIF and CFOT; an early receipt with no confirmation keeps the 7-day window (owner confirmed, 2026-11-02). Build: BL-234 |
| KPI-3 | Sharing partial receipts across deliveries | Each delivery takes its closest receipt first; leftovers top up the nearest delivery still short (owner, 2026-09-23) |
| KPI-4 | Two CFOT averages | The reliability page averages CFOT per PO; the performance pages weight by quantity. Both are shown (owner, 2026-09-23) |
| KPI-1 to KPI-4 | Are the four KPI rules final? | Yes, final (owner, 2026-11-02) |
| ENG-D4 | Plants in the forecast engine | Pilot plants only; intercompany transfers in Phase 2 (owner, 2026-09-23) |
| ENG-D6 | Cost rates for order sizing | From Finance and the 3PL invoices; placeholder admin values until then (owner, 2026-09-23) |
| ENG-D7 | Warehouse capacity for order sizing | Separate per physical warehouse, in pallets (owner, 2026-09-23) |
| ENG-D15 | Weeks early before a reschedule-out is proposed | 1 week, an administrator setting (owner, 2026-09-24) |
| PQ-11 | Is the hub the long-term record for call-offs? | Yes: the hub's call-off record is the long-term system record, replacing the recommendation that SAP scheduling agreement releases take that role (owner, 2026-11-02). Migration of manual records and any send to SAP stay open (section 7) |
| PQ-08 | Early-delivery allowance for call-offs | No fixed number of days: a call-off may be delivered on any date, early included, once the Material Planner team confirms it; the same holds for the warehouse's part (owner, 2026-11-02). CR-05 and REQ-E09-03 BR-03 updated. A confirmed early delivery counts as on time in OTIF and CFOT (KPI-2, owner 2026-11-02) |
| DL-1 / BL-69 | Late at the deadline or after it | One convention: late only after the deadline, for forecast commitments, PO responses and call-off responses (owner, 2026-11-02). Forecast commitments change (BACKLOG BL-81) |
| GR-1 / BL-71 | Does a receipt kept open reopen the missing quantity? | Yes: the missing quantity reopens for another shipment (owner, 2026-11-02). Build in BACKLOG BL-81. What an over-delivery is measured against stays open (section 7) |
| Q-19 / BL-58 | Is anything missing after "They" in the PQ-10 answer? | No. PQ-10 stands as recorded (owner, 2026-11-02) |
| CO-1 / BL-67 | A call-off confirmation above +5%: refused, or held for the planner? | Allowed, and waits for the planner's approval, as built (REQ-E09-03 BR-04) (owner, 2026-11-02) |
| MR-1 BR-07 / BL-149 | Which weekly supplier confirmation goes with the stock update? | The weekly supplier confirmation is the supplier's stock, capacity and feedstock, confirmed together in one visit by the Thursday stock-update cutoff (owner, 2026-11-02). REQ-E08-02 BR-18; build BACKLOG BL-236. The SOP link stays open |
| ENG-D16 | Who agrees PO-line changes with suppliers in SAP | The Material Planner; the hub records only "taken to SAP" (owner, 2026-09-24) |
| ENG-D17 | Supplier liability on a Trade-off cancellation | Flagged "liability — not priced", not priced (owner, 2026-09-24) |
| BL-13 / PQ-12 | Umbrella PO grain | Quantity per line, so call-off release checks remaining quantity |
| BL-14 / Q-18 | Working calendar | The hub keeps its own calendar, maintained by the Hub administrator, loaded from the SAP factory calendar with overrides in the hub |
| BL-15 / Q-20 | Quality inspection | Keep the result display in the hub; non-conformance and corrective action come with Supplier Quality in Phase 2 |
| BL-16 / D-07 | Catalog for the RFI | A capability list only in the MVP (the RFI's product entries); the purchasable catalog stays in Phase 2 |
| BL-17 / DEC-06 | Web Tukar Faktur | A separate system built in parallel. The hub's invoice collaboration stays as it is, so the end-to-end flow keeps working |
| BL-18 / DEC-09 | Performance dashboard owner | Procurement owns the dashboard; Material Planning owns the delivery measures |
| BL-19 / KPI | KPI targets | Fix the definitions first (delivery window, whether early counts, grain, whether a date change resets the clock), measure a 3-month baseline, then set targets. Amended (owner, 2026-11-02): the baselines are the ones written in the PRD success criteria (S1 to S5); the 3-month baseline still applies to CFOT and OTIF, which have no success-criteria row, for now (owner confirmed, 2026-11-02) |
| BL-19a / A-02 | Supplier filters | Add certificate validity, then performance band, then country or region |
| BL-19b / MIG | PROCIO migration | Active suppliers from the last 24 months, plus any under contract. Suppliers confirm their own bank and tax details through the portal; a bank-detail change is confirmed through a second channel |
| INV-FB | Inventory collaboration feedback (2026-09-21) | Supplier triggers API sync, retrieving PTI stock only where granted (REQ-E08-02 BR-03, BR-11). Manual entry and upload are identical and in one place (BR-09). In-transit comes from the ASN (BR-10). Batch, manufacturing and expiry dates stay optional (BR-06). One list on the supplier view (REQ-E08-01 BR-07). Capacity per material group, "upside" relabelled (REQ-E08-04 BR-05, BR-06). Capacity filters (BR-07). Fixed or changing weekly capacity stays open (CAP-1) |
| GAP-1 | Prototype experience that differs from this file | This file wins |
| GAP-2 | Calculations where this file was silent or open | Follow the prototype (section 3.6, tag `[Code]`) |
| GAP-3 | Menu, usability, and screen conventions | Follow the gap review recommendations (sections 3.7 and 3.8) |
| GAP-4 | Prototype features not in this file | Per the gap review suggestions, listed in `BUILD-GAP.md` |
| RFX-D1 | How RFI, RFQ and RFP appear in the hub (owner, 2026-09-21) | Three separate modules, each its own menu item under Sourcing, for buyers and suppliers. Replaces the one sourcing page with RFI / RFQ / RFP tabs (NV-06, NV-07) |
| RFX-D2 | Templates and copies (owner, 2026-09-21) | Buyers can save templates, copy a past event, and start from a template, for RFI, RFQ and RFP. Reverses CE-04 and that part of A-04. The central library stays owned by Procurement with no admin screen (CE-05) |
| RFX-D3 | Links between event types (owner, 2026-09-21) | The three are independent. Allowed links: RFI → RFQ, RFI → RFP, RFP → RFQ, purchase requisition → RFQ. The new event records its source (CE-09) |
| RFX-D4 | Open-spec requests and price basis (owner, 2026-09-21) | Recommendations, options, samples and indicative prices go in an RFP or RFI, with prices labelled Indicative; firm prices by quantity break go in the RFQ (CE-10) |
| RFX-D5 | Split award on an RFQ (owner, 2026-09-21) | An RFQ can be awarded to several suppliers, per item, split by %, and each item totals 100% (REQ-E03-05 BR-06). **Amended 2026-09-25 by RFX-D7 and RFX-D9** |
| RFX-D6 | What an RFP award binds each party to (owner, 2026-09-25, D-1) | Option A: a firm-offer round inside the RFP, then an award on those firm prices. Firm-offer prices read Firm with their validity; every other RFP price stays Indicative. Amends RFX-D4, CE-10 and REQ-E03-04 BR-08; adds REQ-E03-04 BR-15 and BR-16. Built in PR #57, #66 and #67 |
| RFX-D7 | Split by quantity as well as percentage (owner, 2026-09-25, D-2) | Add quantity. Every award line stores both, and typing one derives the other. Amends RFX-D5 and REQ-E03-05 BR-06. Built in PR #58 and #64 |
| RFX-D8 | File limits (owner, 2026-09-25, D-3) | At most 25 MB per file and 30 files per response; the types in CE-11e; no ZIP or executables. A value the owner can move. New rule CE-11e. Built in PR #55, #56 and #63 |
| RFX-D9 | Partial award and a break per item (owner, 2026-09-25, D-4) | Both allowed: each item has its own break, an item can stay "Not awarded now", and the event is Partly awarded until the rest is awarded or marked "Will not award". Amends REQ-E03-05 BR-06 and BR-06a; adds BR-11. Built in PR #58 and #64; "Will not award" on an RFP is BL-130 |
| RFX-D10 | Approval before award (owner, 2026-09-25, D-5) | None in the MVP, as CE-06 for sending. Award, cancel and SAP marking are separate permissions, so Procurement can split them by role. An approval by value stays later. REQ-E03-05 BR-17. Built in PR #61 and #66 |
| RFX-D11 | Revise after submit for RFI and RFP (owner, 2026-09-25, D-6) | Allow revise until the supplier's deadline, keeping every version. Amends the RFI and RFP response lifecycles, where a submitted response was final. CE-11g, REQ-E03-02 BR-18, REQ-E03-04 BR-14. Built in PR #59 and #63 |
| RFX-D12 | Cancel an award (owner, 2026-09-25, D-7) | Cancel with a reason until the award is marked "Raised in SAP", keeping the cancelled record. Replaces the REQ-E03-05 edge case "the event returns to evaluation"; REQ-E03-05 BR-13 and BR-14. Built in PR #61, #64, #66 and #67 |
| RFX-D13 | Response targets in the metrics tables (owner, 2026-09-25, D-8) | The proposed targets of the RFx improvement analysis (sections 4j, 5j and 6j) are starting targets, reviewed after 3 months. CE-11m and the metrics of REQ-E03-04 and REQ-E03-05. No build |
| RFX-D14 | Certificate expired at the deadline (owner, 2026-09-25, D-9) | Accept the submission and flag the certificate to the buyer. CE-11d. Built in PR #56 and #62 |
| RFX-D15 | Firm-offer round on a Partly awarded RFP (owner, 2026-09-28, FU-7) | Allow it, for the options still open (not awarded on the RFP and not sourced by an RFQ created from it). The remaining options are awarded on the new round's firm prices. Amends REQ-E03-04 BR-15e; closes FU-7 and BL-128. Built in PR #71 |
| MAT-D1 | Alert severity scale (owner, 2026-09-29) | Keep CR-24 High / Medium / Low and sort by days to impact within each class. Replaces the Critical / High / Medium scale of the MOM review. REQ-E08-05 BR-06 to BR-08. Built in PR #87 |
| MAT-D2 | Where the stock simulation lives (owner, 2026-09-29) | A separate Stock simulation page for the first release, revisited after 3 months of use; REQ-E08-01 BR-01 stands. REQ-E08-08 BR-10. Built in PR #108 |
| MAT-D3 | Name for the manufacturer → distributor leg (owner, 2026-09-29) | "To distributor". REQ-E08-08 BR-10 |
| MAT-D4 | Template columns D to F (owner, 2026-09-29) | In-production quantity (E) required, 0 allowed; completion date (F) required when E > 0; supplier ROP (D) optional. Amends REQ-E08-02 BR-06; BR-22. Built in PR #104; enforced by the verb per MAT-D21 |
| MAT-D5 | ASN batch when no batches are declared (owner, 2026-09-29) | Free text, marked "not in declared stock"; a list when batches are declared. REQ-E07-04 BR-09. Built in PR #89 and #101 |
| MAT-D6 | Shelf-life rule: which materials, who approves (owner, 2026-09-29) | Every shelf-life relevant material, raw material and packaging alike; exception approved by Quality (`compliance`) only; approved goods received into blocked stock. Replaces "QA or Material Planning" in the MOM review. **Amended by MAT-D16.** REQ-E07-04 BR-12, BR-13. Built in PR #93 |
| MAT-D7 | Weekly cycle details (owner, 2026-09-29) | Thursday 23:59 WIB, the last working day before it on a holiday; PTI-entered records count and stay labelled; a week is compliant only if every material was updated. REQ-E08-02 BR-14, BR-15, BR-24. Built in PR #88 and #105 |
| MAT-D8 | API stale threshold (owner, 2026-09-29) | 24 hours. **Amended by MAT-D17.** REQ-E08-02 BR-16. Built in PR #88 |
| MAT-D9 | How update compliance enters the score (owner, 2026-09-29) | A weighted blend, w = 0.10, fixed at release. REQ-E08-02 BR-27. Built in PR #105 |
| MAT-D10 | Open call-offs in the simulation (owner, 2026-09-29) | Subtract confirmed call-offs not yet shipped and show the result as "Free to call off" beside Supplier available stock; never merged. REQ-E08-08 BR-07. Built in PR #103 and #108 |
| MAT-D11 | Capacity used for the simulation's cap (owner, 2026-09-29) | Allocated capacity only; additional capacity is not used. REQ-E08-08 BR-04. Built in PR #103 |
| MAT-D12 | Where planning groups are mastered (owner, 2026-09-29) | In the hub now; moved to SAP master data with MDM when the SAP feed runs. REQ-E08-04 BR-18. Built in PR #92 |
| MAT-D13 | Direct vs indirect on an event (owner, 2026-09-29) | Derived from the category or purchasing group, mapped once by Procurement; not typed per event. CE-12f. Built in PR #109 |
| MAT-D14 | Vendor drops a level mid-event (owner, 2026-09-29) | It can still respond, and cannot be awarded until it is back at the level. CE-12g. Built in PR #109; warn-only while lists are placeholders (MAT-D19) |
| MAT-D15 | Documents required per qualification level (owner, 2026-09-29) | Procurement and Quality define the lists together; blocking for MR-10 go-live; placeholder lists, labelled, until then. CE-12d. Lists still open (section 7) |
| MAT-D16 | Raw materials default to the shelf-life check (owner, 2026-09-29, during the build, A2) | A material is shelf-life relevant by default when it is ROH or has a minimum remaining shelf life in master data; packaging without one is not; an administrator can switch any material. Amends MAT-D6's "by master data, never by material type". REQ-E07-04 BR-12. Built in PR #84 |
| MAT-D17 | API staleness and a failed pull (owner, 2026-09-29, during the build, B1) | An API figure is stale only when its last successful pull is older than 24 hours; a failed pull shows "Last pull failed" and does not make the figure stale. Amends MAT-D8 and supersedes the REQ-E08-02 edge case "flag them as stale". REQ-E08-02 BR-16. Built in PR #88 |
| MAT-D18 | Who edits the qualification lists (owner, 2026-09-29, during the build, G1) | Procurement and Quality: the atom sits in both the `procurement` and `compliance` lanes. Replaces "procurement and the Hub administrator" in MR-10. CE-12d. Built in PR #91 |
| MAT-D19 | Qualification checks while a list is a placeholder (owner, 2026-09-29, during the build, G1/G2) | Warn and require a reason instead of refusing, at invite, publish and award, while a list for the needed level is a placeholder; enforcement switches on by itself when a real list is saved. Amends the fail-closed row of the build plan's AD-8 until MAT-D15 is answered. CE-12g. Built in PR #109 |
| MAT-D20 | BL-133's LTP-to-capacity join (owner, 2026-09-29, during the build, C5) | Follows planning groups: the LTP of a planning group is the sum of its materials' LTP. REQ-E08-04 BR-16. Built in PR #92 |
| MAT-D21 | In-production enforced by the verb (owner, 2026-09-29, during the build, C1) | The declare and record verb refuses a blank in-production quantity, and one above 0 without a completion date, on manual, template and PTI records; an API pull is exempt. Extends MAT-D4 from the form and template to the verb. REQ-E08-02 BR-06. Built in PR #107 (C1b) |
| E06-R | Forecast Collaboration recommendations | Confirmed as recommended: periods and cadence by material type, zones, split deadline, pre-filled commitment, tolerance CR-21, gap colours CR-22, re-publication, ranking, planner actions, reminders, spreadsheet round-trip, supplier coverage, upside |

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-17 | First draft from deck baseline and reviewed meeting notes |
| 0.2 | 2026-09-17 | Added proposed Planning & Fulfillment requirements (E06, E09, E07-06 to E07-08, E08-04, E08-05) from market research; market reference; Foundation contribution rule |
| 0.3 | 2026-09-17 | Applied PQ-01 (call-offs outside SAP) and PQ-10 (dispatch heads-up, no dock scheduling); REQ-E09-04 rescoped |
| 0.4 | 2026-09-17 | Applied owner decisions from the prototype gap review: shared calculation rules (3.6), hub navigation (3.7), screen conventions (3.8); RFI and RFP templates; RFQ from a purchase requisition; REQ-E03-05 detailed with negotiation and multi-award; recommendations filled for open points in E07, E08, E09, E10. E06 held for owner review (E06-R) |
| 0.5 | 2026-09-17 | Applied the confirmed Forecast Collaboration recommendations (E06-R): section 5.5 validated, CR-21 and CR-22 added |
| 0.6 | 2026-09-18 | Answered A-04: section 3.6a records how a sourcing event is created before it is sent |
| 0.7 | 2026-09-19 | REQ-E07-03 extended: drill-through contract per column, goods receipt and invoice columns, empty-cell rule, and an alignment check against the source requirements |
| 0.8 | 2026-09-21 | Owner decisions on 18 of the 21 backlog decisions: compliance gate CR-23, risk class CR-24, receipt tolerance CR-25, commitment deadline CR-26; CR-02, CR-05, CR-12 and CR-15 revised; hub-managed calendar; 3PL tracking link replaces TMS access. Open items narrowed to A-01, A-05, PQ-05 cap, PQ-06, PQ-08 early allowance, PQ-11, Q-19 |
| 0.9 | 2026-09-21 | Inventory collaboration feedback (INV-FB): supplier-triggered sync with PTI stock limited to granted materials, one stock entry with identical fields, in-transit from the ASN, optional manufacturing date, one list on the supplier view, capacity label and filters. CAP-1 opened |
| 0.10 | 2026-09-21 | Text aligned with the builds of BL-44 to BL-53 (CR-12 per line, CR-05 for every call-off type, CR-24 in inventory). Open items KPI-D, CO-1, CR24-1, DL-1, ADM-1 and GR-1 added from what the builds found |
| 0.11 | 2026-09-21 | NV-07: RFI, RFQ and RFP as three separate menu items for buyers and suppliers (owner decision, built in PR #21); menu tables updated |
| 0.12 | 2026-09-22 | RFx overhaul. Owner decisions RFX-D1 to RFX-D5 recorded (section 9): separate modules, templates and copies (CE-04 replaced, A-04 amended), independent events with allowed links (CE-09), indicative vs firm prices (CE-10), per-item split award. REQ-E03-02 to REQ-E03-05 rewritten: sections and 11 question types, option editor, attachments (CE-11), confidentiality gate, custom RFP terms and T&C acceptance, RFP indicative pricing, RFQ items with buyer- and supplier-filled spec fields, quantity breaks per variant or total, one-time costs, alternatives, samples, questions, intent and decline, clarifications, comparison at an evaluation break, per-item split award. "RFx: later, not in the MVP" list added. Section 8.3 summarises the RFx best-practice research |
| 0.13 | 2026-09-22 | NV-01 lists the administration sections built with BL-32 and records that every change is logged |
| 0.14 | 2026-09-23 | ENG-1: PTI calculates forecast, material requirement, ROP, and replenishment in its own engine (hub first, SOMO later), superseding MN-INV-14 and the PQ-07 answer. REQ-E06-01 BR-01, REQ-E08 BR-04, and REQ-E09-01 rewritten with SAP as the source until the engine is live. Glossary ROP updated. New epic E14 (In-house Forecast Engine), REQ-E14-01 to REQ-E14-12, detailed in `FORECAST-ENGINE-REQUIREMENTS.md` (section 5.9) |
| 0.15 | 2026-09-23 | Engine decisions ENG-D1, D2, D3, D5, D8, D9 recorded in section 9 and applied in `FORECAST-ENGINE-REQUIREMENTS.md` 0.2 |
| 0.16 | 2026-09-23 | KPI-1 to KPI-4 recorded (BL-66, built in PR #38); open item KPI-D closed |
| 0.17 | 2026-09-23 | ENG-D4, D6, D7 recorded in section 9 |
| 0.18 | 2026-09-23 | REQ-E14-13 added to the index (detail in `FORECAST-ENGINE-REQUIREMENTS.md`) |
| 0.19 | 2026-09-24 | ENG-D15, D16, D17 recorded in section 9; REQ-E14-13 built on synthetic data (PR #44) |
| 0.20 | 2026-09-24 | REQ-E14-01 index status: Data health page, freshness limits and quality checks on arrival built on synthetic data (BL-109, PR #46) |
| 0.21 | 2026-09-24 | Leftovers of E14-03, E14-04 and E14-05 built on synthetic data (BL-115 yield, BL-116 safety-stock change since the last run, BL-117 cap on rented space; PR #47); build decisions ENG-B50 to ENG-B59 in `FORECAST-ENGINE-REQUIREMENTS.md` 0.9. One new administrator value, the most rented space (REQ-E14-05, placeholder 25% until the Warehouse confirms) |
| 0.22 | 2026-09-24 | REQ-E14-06 built on synthetic data (PR #48); build decisions ENG-B29 to ENG-B38 in `FORECAST-ENGINE-REQUIREMENTS.md` section 4.1g |
| 0.23 | 2026-09-25 | Forecast engine build decisions ENG-B19 to ENG-B59 accepted by the owner (`FORECAST-ENGINE-REQUIREMENTS.md` 0.12, sections 4.1d to 4.1g) |
| 0.24 | 2026-09-28 | RFx improvements folded in as built (PRs #54 to #64, #66, #67). Owner decisions D-1 to D-9 of 2026-09-25 recorded as RFX-D6 to RFX-D14 (section 9). CE-10 amended (firm-offer prices read Firm); CE-11a to CE-11m added (supplier documents, limits, certificates, revise until the deadline, access log, starting targets). REQ-E03-02 BR-17 and BR-18; REQ-E03-03 BR-25; REQ-E03-04 BR-08 amended, BR-14 to BR-16 added (firm-offer round and award); REQ-E03-05 BR-06 and BR-06a amended, BR-11 to BR-17 added (quantity split, break per item, partial award, legacy RFQs on one panel, cancel, raised in SAP, supplier outcome, no approval). Starting metric targets (RFX-D13). Open item FU-7 added. Source: `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md` |
| 0.25 | 2026-09-28 | Owner decision RFX-D15 recorded (section 9): a firm-offer round may open on a Partly awarded RFP for its open options. REQ-E03-04 BR-15e amended. Open item FU-7 closed and removed from section 7. Built in PR #71 |
| 0.26 | 2026-09-28 | CE-11i: who uploaded each supplier file is recorded and shown in the buyer's "Supplier documents" panel (FU-1, BL-123). Built in PR #73 |
| 0.27 | 2026-09-28 | Forecast engine decisions ENG-D8a, D10, D11, D12, D14 decided and ENG-D18 to D21 added from the team's LTP / DA / capacity review (`FORECAST-ENGINE-REQUIREMENTS.md` 0.13). REQ-E08-04 and REQ-E06-02 gain capacity-before-LTP and Submit all per week when BL-133 is built |
| 0.29 | 2026-09-29 | SC Hub Material build folded in as built (PRs #84 to #93, #97, #101 to #110). Owner decisions MAT-D1 to MAT-D15 and the build rulings MAT-D16 to MAT-D21 recorded (section 9). MR-1, MR-4 and MR-2 BR-01 to BR-05 are REQ-E08-02 BR-12 to BR-27 (BR-06 amended, edge case on a failed sync superseded); MR-2 BR-06, BR-07 are REQ-E03-05 BR-18, BR-19; MR-6 is REQ-E07-04 BR-06 to BR-18 (BR-04 amended); MR-8 is REQ-E08-04 BR-13 to BR-19; MR-9 is REQ-E08-05 BR-06 to BR-12; MR-10 is CE-12a to CE-12j, cited by REQ-E03-02 BR-19, REQ-E03-03 BR-26, REQ-E03-04 BR-17 and REQ-E03-05 BR-20. New REQ-E08-06 (MR-3), REQ-E08-07 (MR-5) and REQ-E08-08 (MR-7). Corrected against the requirements file: the atom `asn:approve-shelf-life` (plan AR-02), the update-mode verb held by `compliance` rather than the Hub administrator only (AR-04), the 180-day document window (AR-18), and the score weight moving grade and band only (AR-09). Open items MAT-D15, MR-1 BR-07 and MR-9 BR-07. Map in `SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md` |
| 0.28 | 2026-09-29 | REQ-E08-04 BR-08 to BR-12 and REQ-E06-02 BR-11 to BR-13: capacity before the LTP, two-level check against capacity and BE, one Submit all per week, the LTP as the only capacity demand figure, "Additional capacity" (BL-133, PR #80). New REQ-E06-04 Fixed stock reconcile, Validated (BL-134, PR #79) |
| 0.30 | 2026-09-29 | Forecast engine: REQ-E14-09 demand range, REQ-E14-10 model backtest and REQ-E14-11 forecast bias and planner overrides built on synthetic data (PRs #100, #96, #98); build decisions accepted (`FORECAST-ENGINE-REQUIREMENTS.md` 0.15) |
| 0.31 | 2026-10-19 | Weekly SC Hub 2026-10-14 (DA, ROP and call-off) accepted as `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md` (DRC-1 to DRC-19, DRC-D1 to DRC-D16, BL-187 to BL-209). REQ-E06-04 superseded by DRC-15a; notes on REQ-E08-02, REQ-E09-01 and REQ-E09-03 |
| 0.32 | 2026-10-21 | Section 3.7 menu tables rewritten to the as-built navigation of the IA evaluation (`research/PORTAL-IA-EVALUATION-2026-10.md`, P-01 to P-12): Requisitions and Supplier documents in Sourcing; Order summary is a view of Purchase orders; Call-offs and Trade names joined their sections; Supplier follow-ups replaces Supplier replies and Chase; Foresight commitments names REQ-E06-02 everywhere; supplier Company holds My performance. The table had still shown the pre-FUX "Forecast" section |
| 0.33 | 2026-11-02 | Owner answers of 2026-11-02 (Material Planner): PQ-11 decided, the hub is the long-term call-off record (migration and any send to SAP stay open); PQ-08 decided, no fixed early allowance, an early date needs the Material Planner team's confirmation (CR-05, REQ-E09-03 BR-03; PQ-08 removed from section 7); KPI-1 to KPI-4 confirmed final. Follow-up answers the same day: the baselines are the ones written in the PRD success criteria (S1 to S5) (BL-19 row); an early receipt on a date the Material Planner team confirmed counts as on time in OTIF and CFOT (KPI-2, PQ-08 rows; build BL-234). Header version corrected from 0.31 (0.32 was logged without a header bump) |
| 0.34 | 2026-11-02 | Owner answers: DL-1 decided, late only after the deadline (removed from section 7); GR-1 narrowed, a receipt kept open reopens the missing quantity; the CFOT and OTIF 3-month baseline and the 7-day window for an unconfirmed early receipt confirmed; MR-9 BR-07 points to the existing alert rules listed for the team (`research/ALERT-RULES-FOR-TEAM-2026-11-02.md`); Q-19 and CO-1 decided and removed from section 7; MR-1 BR-07 decided (stock, capacity and feedstock in one weekly visit; REQ-E08-02 BR-18), the SOP link stays open |
