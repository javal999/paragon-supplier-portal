# RFx Management: engineering handover (2026-10)

| | |
|---|---|
| Version | 1.3, 2026-10-26 (RFX-D32 deadline check; BL-221 Compare column order; a copied RFP keeps its RFI link; menu after the IA work; screenshots retaken on `main` `e4d8b1f1`). 1.2, 2026-10-22 (RFX-D26 to RFX-D31 owner rulings) |
| For | The engineering team that builds the production RFx module (RFI, RFQ, RFP) of the PTI Supplier Hub |
| What this is | The final requirement for RFx: what the prototype does, the decisions behind it, the rules, the states, the refusals, the screens, and what production must add. It replaces reading the RFx history document by document |
| Built on | The prototype on `main` at `e4d8b1f1` (2026-10-26). It holds the RFx UX waves (MRs !8, !14), the owner rulings (!24), the IA menu (!19), BL-221 (!36), wave 12 (!33), the RFI-link fix (!38) and RFX-D32 (!39). RFx code work is paused after this commit (owner, 2026-10-26) |
| Owner | Achmad Fahlevi (product owner). Decisions are recorded in `DECISION-GUIDE.md` as RFX-D1 to RFX-D32 |
| Paths | `src/…` paths are in `paragon-supplier-portal`. Line numbers were read on `feat/rfx-ux-wave2` on 2026-10-19 and will move; since wave 12 the supplier RFP page is the folder `src/pages-v2/SupplierRfp/` and the RFI and RFP create wizards keep their drafts in react-hook-form (`rfx/RfiCreateWizard/`, `rfx/RfpCreateWizard/hooks/useRfpDraft.js`) |

**In one paragraph.** PTI runs three separate sourcing modules: an RFI collects capability information, an RFQ collects firm, comparable quotes on items with quantity breaks, and an RFP collects commercial terms, options and indicative prices for open-spec purchases. A buyer creates and sends events, compares responses, negotiates in rounds, and records a split award per item; the purchase order or contract is then raised in SAP by hand. A supplier says whether it will respond, answers, quotes, revises until the deadline, and sees its own outcome. The prototype implements all of this against in-memory stores, with every state change going through a governed verb. Production must replace the stores with a backend, add the SAP hand-off, email, file storage and sign-in, and keep the rules, states and refusals listed here.

---

## 1. Scope

**In scope (built in the prototype, to be built for production):**
- RFI, RFQ and RFP as three modules with their own menu items and pages (RFX-D1).
- Authoring wizards, templates, copying a past event, and allowed links between events (RFI → RFQ, RFI → RFP, RFP → RFQ, purchase requisition → RFQ) (RFX-D2, RFX-D3). An RFP started from an RFI keeps that link when the buyer copies a past event into it.
- Supplier invitation with qualification and compliance checks, supplier intent and decline, confidentiality and T&C gates, responses with documents, revision until the deadline.
- RFQ comparison per item at a chosen quantity break, negotiation rounds, split award by share or quantity, partial award, cancel award, "Raised in SAP" marking.
- RFP terms comparison, indicative pricing, firm-offer rounds, RFP award.
- Supplier To do, hub bell notices and award history.

**Out of scope for this module:** supplier registration and master data (E01, E02, Foundation team), approval before award (RFX-D10: none in the MVP), a sourcing request step (E03.01), email (BL-120), the SAP purchase-order interface (BL-121).

---

## 2. Decisions in force

Every decision below is binding unless the owner changes it. Full text: `DECISION-GUIDE.md`.

| ID | Decision |
|---|---|
| RFX-D1 | RFI, RFQ and RFP are separate modules |
| RFX-D2 | Start from blank, a template or a copy of a past event |
| RFX-D3 | Events are independent; allowed links carry content forward and record the source |
| RFX-D4 | Open-spec requests go in the RFP or RFI; their prices are labelled "Indicative" |
| RFX-D5 | Split award per item on an RFQ |
| RFX-D6 | An RFP award binds as stated in the decision; firm-offer rounds firm up RFP prices |
| RFX-D7 | Split by quantity as well as by percentage |
| RFX-D8 | File limits: 25 MB per file, 30 files per response, listed file types only |
| RFX-D9 | Partial award, and one break per item |
| RFX-D10 | No approval step before award in the MVP |
| RFX-D11 | RFI and RFP responses can be revised until the deadline; each version is kept |
| RFX-D12 | An award can be cancelled until it is marked raised in SAP |
| RFX-D13 | Response targets in the metrics tables are starting targets, reviewed after 3 months |
| RFX-D14 | A certificate expired at the deadline is accepted and flagged to the buyer |
| RFX-D15 | A firm-offer round can open on a Partly awarded RFP for the options still open |
| RFX-D16 | Firm-offer round for full-service and ODM options settled in the RFP; "Create RFQ from this RFP" for components tendered per item; an option in a firm-offer round cannot go to an RFQ |
| RFX-D17 | The RFI and RFP details are their own pages; creation stays a modal wizard that opens the new event's page after saving |
| RFX-D18 | The supplier's award notice appears when the award is recorded, with "The purchase order follows from SAP" |
| RFX-D19 | Incoterms default FOB; "CIF Jakarta" is not an option |
| RFX-D20 | The supplier To do is grouped by lane, each lane ordered by deadline |
| RFX-D21 | Intent and decline on the RFI and RFP, as on the RFQ (BL-132) |
| RFX-D22 | No win rate in the supplier's award history; one row per event from the award record |
| RFX-D23 | One name per module, acronym first ("RFQ · Quotation requests"); Indonesian section header "Pengadaan" |
| RFX-D24 | The RFQ side panel is a summary; review, exchange rate and clarifications live on the RFQ event page |
| RFX-D25 | The RFI and RFP pages have Overview, Compare and By supplier tabs; Compare opens once a proposal is in, with summary cards, deviations-only, a neutral "Best" tag and a sticky supplier header |
| RFX-D26 | Legacy RFQs need "I will respond" before quoting, as tiered RFQs do |
| RFX-D27 | A supplier's decline on the RFI and RFP is final |
| RFX-D28 | Supplier response drafts stay in the browser; server drafts are BL-214 |
| RFX-D29 | "Best" also marks the lowest MOQ, the most allocation per month and the highest OTIF commitment; a value not readable in the row's common unit gets no tag |
| RFX-D30 | RFQ wizard unit by category: Packaging PCS, Other none (Scope waits for a unit; the create verb refuses `UOM_MISSING`), every other category KG |
| RFX-D31 | Decline reasons per event type: a shared core plus RFQ, RFI and RFP reasons; each intent verb refuses a reason off its list (`DECLINE_REASON_UNKNOWN`) |
| RFX-D32 | Both create wizards check the response deadline when the buyer leaves the field: blank reads "Deadline is required.", past reads "The response deadline must be a date in the future."; Next stays disabled either way |

**Calls made during the 2026-10-19 build that wait for owner review** are in section 12. Each is built as recommended there.

---

## 3. Personas and permissions

The hub has two personas. A PTI seat holds business roles; a supplier seat holds lanes. Permission is checked per verb by an atom (`src/services/transitions/businessRoles.js`).

| Holder | RFx atoms |
|---|---|
| PTI **Procurement** role | `rfq:create`, `rfq:publish`, `rfq:award`, `rfq:fx-pin`, `rfq:cancel`, `rfq:reopen`, `rfq:award-cancel`, `rfq:award-sap`, `rfq:negotiate`, `quotation:review`, `rfqclarification:answer`, `rfi:create`, `rfi:publish`, `rfp:create`, `rfp:publish`, `rfp:negotiate`, `rfp:award`, `rfp:award-cancel`, `rfp:award-sap` (`businessRoles.js:144-192`) |
| Supplier **Commercial** lane | `quotation:submit`, `rfqintent:declare`, `rfqconfidentiality:accept`, `rfqclarification:ask`, `rfiresponse:answer`, `rfpresponse:answer`, `rfiintent:declare`, `rfpintent:declare`, `rfpfirmoffer:submit` (`businessRoles.js:429-449`) |
| Automation (no person) | `rfq:close`, `quotation:award`, `quotation:reject`, `quotation:reinstate` (cascades only, `businessRoles.js:680-693`) |

No other PTI role or supplier lane holds an RFx atom. A seat that lacks the atom sees "Awaiting {owner}" in place of the action (`components/ui-v2/HandoffNotice.jsx`), one notice per verb in that verb's own slot.

**Tenancy (must be enforced server-side in production):**
- A supplier reads only events it is invited to that are not Draft, only its own invitee row, its own response (Draft included), its own rounds, offers and award lines (`services/data/mock/rfxReadModel.js:250-858`). The buyer never reads a supplier's Draft.
- A confidential event shows a supplier the scope only until it accepts the terms (`maskConfidential`, `services/sourcing/rfqResponse.js:149`).
- A supplier's clarification question is shown to other invitees only when the buyer publishes the answer, and the asker is never named (`rfqResponse.js:112`).
- On the write side, a supplier is refused any command on a record it does not own (`services/transitions/dispatcher.js:474-495`).

---

## 4. Screens

Screenshots of every screen below, taken on `main` `e4d8b1f1`: `user-guide/screens/rfx-2026-10/` (index in its `README.md`).

**Menu.** PTI: section Sourcing ("Pengadaan") holds Requisitions, RFI, RFQ, RFP, Suppliers and Supplier documents, in that order (IA P-03). Supplier: section Sourcing holds RFI invitations, RFQ invitations and RFP invitations, each with its count.

### 4.1 Buyer

| Route | Screen | What it does |
|---|---|---|
| `/buyer/rfi` | RFI list | Rows with number, deadline, template and "N of M submitted"; row button "Open"; "New information request" opens the wizard |
| `/buyer/rfi/:rfiId` | RFI event page | Header with status and days left, stage bar (Sent · Answers in · Closed), section nav with counts, one actions row (Edit, Send, Discard, Close, Extend, Create RFQ, Create RFP, More → Save as a template), "Invited suppliers" with each supplier's intent and response state, answers side by side, supplier documents |
| `/buyer/rfq` | RFQ board | Opens on "Needs my action", ordered by next deadline; tabs Needs my action · Open · Pending award · Draft · Awarded · Closed; KPI tiles filter the table; a Next column; "As of" date line; side panel as a summary with links to the event page |
| `/buyer/rfq/:rfqId` | RFQ event page | Header with status, deadline, days left and the stage stated in words; stage bar (Sent · Quotes in · Round · Award · Raised in SAP · Done) with a Next pill; sticky section nav (Invitees, Clarifications, What is quoted, Comparison, Rounds, Documents, Award) with counts; comparison with "Move to review", exchange-rate banner and dialog, per-break tables folded under "Show every break"; negotiation rounds; award panel with a legend for its pills; award records with cancel and "Mark raised in SAP" |
| `/buyer/rfp` | RFP list | Rows with "N of M submitted"; row button "Open" |
| `/buyer/rfp/:rfpId` | RFP event page | As the RFI page, plus "Terms sent" before any proposal, the terms comparison, indicative pricing, "Firm up the prices" (firm-offer round or RFQ from this RFP), firm-offer rounds, RFP award |

**Wizards** (modal, opened from the list page): RFI (Scope, Questions, Invitees, Documents, Review), RFQ (Scope, Items, Breaks, Questions and options, Suppliers, Terms, Documents, Review), RFP (as RFI plus Terms, Pricing). The RFQ wizard seeds the first break from the Scope quantity, defaults the unit by category (Packaging → PCS, others KG) and Incoterms to FOB, and offers "Save and send to suppliers" on Review. After saving, the RFI and RFP wizards open the new event's page. **Response deadline (RFX-D32):** both the RFI and RFP wizards check it when the buyer leaves the field. A blank one reads "Deadline is required." ("Batas waktu wajib diisi."), a past one "The response deadline must be a date in the future."; Next stays disabled on either. **Pre-filled from an RFI:** an RFP opened from an RFI shows "Pre-filled from RFI-…"; copying a past event into it keeps the RFI link, and the saved RFP shows "Created from RFI-…" (MR !38; before it the link was dropped without a word).

**Confirmation sheets.** Close (RFI, RFP), award and cancel-award (RFQ, RFP) open a sheet listing who is affected, the shares, the reason, and what can be undone. Nothing is dispatched until the buyer confirms ("Record the award" / "Catat pemenang"; "Back to edit" / "Kembali").

**Proposal view on the RFI and RFP pages (RFX-D25).** Three tabs under the actions row, held in the URL (`?tab=overview|compare|supplier`, `&supplier=<id>`): Overview (scope, terms or questions sent, invitees, documents, firm-up, award), Compare (summary cards best scored first, one-line invitee count, the grid with "Show deviations only", collapsible groups, sticky supplier header and a neutral "Best" tag, indicative prices with the lowest per option and quantity tagged; for the RFI, section accordions and "Show answers that differ"), and By supplier (one proposal at a time with Previous/Next). Compare is the default once anything is submitted. In the comparison, questions and indicative-price grids the supplier columns follow the summary cards' order, best scored first (BL-221). "Best" comes from `bestValueIds` in `src/pages-v2/rfx/rfxCompare.js`: lowest price basis, shortest lead time, most payment days, longest price validity, lowest MOQ, most allocation per month and highest OTIF commitment (RFX-D29); other terms get none. Values are compared in one common unit (MOQ and allocation in pieces or kilograms, allocation per month, OTIF as a percentage); a value that cannot be read in that unit gets no tag.

### 4.2 Supplier

| Route | Screen | What it does |
|---|---|---|
| `/supplier/home` | To do | Grouped by lane (Orders, Stock, Sourcing, Forecast and commitments, Invoices and documents), each ordered by deadline. Sourcing rows: "RFQ invitations to answer", "RFI to answer", "RFP to answer", "RFQ round to answer", each with the event number and days left; "Awarded to you · RFQ-… · share" with "The purchase order follows from SAP" |
| `/supplier/rfi` | RFI invitations | Rows with a days-left pill and a button by state (Answer, Revise, View); the opened row shows the step strip (Step 0 terms if confidential · Step 1 say if you will respond · Step 2 answer), then the questionnaire |
| `/supplier/rfq` | RFQ invitations | Tabs Open events, My Quotes, Awards & history. Each card has the step strip; the quote opens after "I will respond". My Quotes carries a round strip ("PTI asked for a revised quote · Revise by … · N days left") and an outcome strip. Awards & history is one row per event from the award record |
| `/supplier/rfq/rounds` | Revised quotes | Open rounds with the prefilled revision; can be filtered to one round from the card |
| `/supplier/rfp` | RFP invitations | As the RFI, with T&C acceptance, term-by-term Comply or Deviate, indicative prices, sample (Yes/No), firm-offer form, "Awarded" pill on the row |

**Response forms (RFI, RFP, RFQ quote drawer):** what the supplier types is kept as a draft in this browser and restored when the form opens ("Draft saved on this device at HH:MM"); each missing or invalid field is marked "Still missing" under the field; a banner counts the gaps with links to each; Send is disabled with the count. A buyer question that repeats a built-in field (sample ready date, development timeline) is shown once.

**Hub bell (supplier):** award and withdrawal notices; menu items carry counts ("RFQ invitations · 1 round").

### 4.3 Shared conventions
- Every string is in English and Indonesian through `t()`; dates use `formatDate` ("06 Sept 2026"), never ISO.
- Design rules DP-1 to DP-3 (`paragon-supplier-portal/CLAUDE.md`): outline buttons only, semantic colour for state only, monospace data tokens.
- Honesty markers stay visible: "Sample data", "Simulated" on reliability and the composite score, "Estimated" on lead time, "Indicative" on RFP prices, "Firm" on firm offers, the note that files are kept for this session only.

---

## 5. Flows (state machines)

All state changes go through verbs in `src/services/transitions/flows/`. A verb names its from-states, its to-state, the atom it needs, and its policy hooks. Production must keep these states and verbs; the dispatcher checks role, scope, stale state, legality, fields and policy in that order (`src/services/transitions/refusals.js`).

### 5.1 RFQ (`rfq.flow.js`)
States: Draft, Open, Closed, Partly awarded, Awarded, Cancelled.

| Verb | From → to | Atom | Rules |
|---|---|---|---|
| `t_rfq_create`, `t_rfq_revise_draft` | ∅ / Draft → Draft | `rfq:create` | RFQ_CREATE_VALID, RFQ_CREATE_RFP_OPTIONS_FREE |
| `t_rfq_publish` | Draft → Open | `rfq:publish` | RFX_INVITEES_QUALIFIED |
| `t_rfq_extend` | Open, Closed → Open | `rfq:publish` | RFX_EXTEND_VALID |
| `t_rfq_fx_pin` | Open, Closed → Open | `rfq:fx-pin` | RFQ_FX_PIN_WELL_FORMED |
| `t_rfq_award_partial` | Open, Closed, Partly awarded → Partly awarded | `rfq:award` | RFQ_AWARD_GOVERNED |
| `t_rfq_award` | Open, Closed, Partly awarded → Awarded | `rfq:award` | RFQ_AWARD_GOVERNED |
| `t_rfq_award_cancel`, `_cancel_partial` | Awarded, Partly awarded → Closed / Partly awarded | `rfq:award-cancel` | RFQ_AWARD_CANCEL_GOVERNED |
| `t_rfq_award_sap_raised` | Awarded, Partly awarded → same | `rfq:award-sap` | RFQ_AWARD_SAP_GOVERNED |
| `t_rfq_cancel` | Draft, Open, Closed → Cancelled | `rfq:cancel` | — |
| `t_rfq_reopen` | Closed → Open | `rfq:reopen` | — |
| `t_rfq_close` | Open → Closed | `rfq:close` (automation) | Not fired by anything today; production should close at the deadline |

Cascades (`cascades.js`): award → quotations Awarded / Rejected; partial award → Awarded; cancel → quotations reinstated to Under Review; create → the source requisition moves to Sourcing Event.

Related flows: `quotation` (Submitted, Under Review, Awarded, Rejected; submit, revise in a round, review), `negotiationRound` (Open, Closed), `rfqIntent` (Responding, Declined), `rfqConfidentiality` (Accepted), `rfqClarification` (Asked, Answered).

### 5.2 RFI (`rfiEvent.flow.js`, `rfiResponse.flow.js`, `rfiIntent.flow.js`)
- Event: Draft → Open (publish needs invitees, qualified) → Closed; extend Open/Closed → Open; cancel from Draft, Open or Closed. Atoms `rfi:create`, `rfi:publish`.
- Response: save (∅ → Draft), submit (Draft → Submitted), revise (Submitted → Submitted, appends a version). Save checks invited, acceptance gate, document limits, window open, not submitted, not declined. Atom `rfiresponse:answer`.
- Intent: respond (∅ → Responding), decline (∅ → Declined, reason and words), withdraw (Responding → Declined, until the response is sent). Atom `rfiintent:declare`.

### 5.3 RFP (`rfpEvent.flow.js`, `rfpResponse.flow.js`, `rfpIntent.flow.js`, `rfpOfferRound.flow.js`, `rfpFirmOffer.flow.js`)
- Event: Draft → Open → Closed → Partly awarded → Awarded; Cancelled from Draft, Open or Closed. Every RFP award needs a reason.
- Response and intent: as the RFI, plus T&C acceptance and terms answered.
- Firm-offer round: opens on a Closed or Partly awarded RFP for options still open (not awarded, not sourced by an RFQ); the supplier's firm offer is valid until a date on or after the round deadline; each revision is appended.

---

## 6. Business rules

Each rule is one pure function shared by the page (to explain) and the verb (to refuse). Production must keep the single source: the screen and the server read the same rule.

| Rule | Where | What it decides |
|---|---|---|
| Compliance gate CR-23 | `services/sourcing/complianceGate.js:141` | Halal, BPOM, GMP/ISO 22716 per material, supplier status, minimum OTIF (placeholder 80%; "No history" passes). A failing supplier can be invited and can quote, but is listed, not ranked, and cannot be awarded |
| Qualification by sourcing type | `services/sourcing/sourcingType.js:229, 307` | Supplier level the sourcing type needs; warn-only while the lists are placeholders (MAT-D19) |
| Score CR-15 | `services/sourcing/rfqComparison.js:298` | Price 40, lead time 20, reliability 40 over qualified suppliers; reliability is OTIF, 50 with no history |
| Evaluation break | `rfqComparison.js` | Comparison per item at a chosen break; total cost = unit price × quantity (× variants for a per-variant break) + one-time costs; only current quote versions are ranked |
| Award shape | `services/sourcing/awardShape.js:411` | One break per item; each item totals 100% or the break quantity (tolerance 0.01 pp or 1 unit); final award leaves no item open unless "Will not award" |
| Reason owed | `awardShape.js:601` | A reason is required when the award departs from the best score, names a supplier on placeholder qualification or a red compliance flag, and on every RFP award |
| Award status | `services/sourcing/awardStatus.js:47` | Active, Cancelled or Raised in SAP, derived from the appended trail; cancel is refused once raised in SAP |
| RFP option settled | `services/sourcing/rfpAward.js:193, 266` | An option awarded, sourced by an RFQ, or in a firm-offer round cannot be awarded or sourced twice |
| Response window | `services/transitions/rfxRules.js:165-246` | Per-invitee deadline overrides the event's; "closing soon" at 3 days; an extension must be later than the current deadline |
| Intent | `services/sourcing/rfxIntent.js:131, 168` | One intent per invitee; decline needs a listed reason and words; a decline is final; a declined supplier cannot save, submit or revise |
| Documents | `services/transitions/rfxDocumentRules.js`, `services/attachments/fileRules.js` | Required requests, certificate number/issuer/expiry, 30 files and 25 MB per file |

---

## 7. Refusal codes

A refused verb returns `POLICY_REJECTED` with a detail `CODE: sentence`. The screen shows the sentence; tests assert the code. Production must return the same codes. Grouped list (full list with file and line: section 4 of the inventory appended as Annex A):

- **Event and invitees:** NO_QUESTIONS, NO_INVITEES, SUPPLIER_NOT_SELECTABLE, SUPPLIER_NOT_QUALIFIED, NOT_INVITED, NOT_AN_EXTENSION, EVENT_NOT_OPEN, BAD_DEADLINE, TC_DOCUMENT_EMPTY, UNKNOWN_SOURCE_RFI.
- **Responses:** RESPONSE_DEADLINE_PASSED, RESPONSE_ALREADY_SUBMITTED, PAST_DEADLINE, CONFIDENTIALITY_NOT_ACCEPTED, TC_NOT_ACCEPTED, REQUIRED_UNANSWERED, ANSWER_INVALID, TERMS_UNANSWERED, TERM_ANSWER_INVALID, DEVIATION_NEEDS_COMMENT, INTENT_DECLINED.
- **Intent:** EVENT_NOT_FOUND, NOT_RESPONDING, INTENT_ALREADY_STATED, DECLINE_REASON_UNKNOWN, DECLINE_TEXT_MISSING, RESPONSE_ALREADY_SENT, QUOTE_ALREADY_SUBMITTED.
- **RFQ authoring:** BUILT_IN_MISMATCH (a question linked to a built-in field of the wrong type), UOM_MISSING, UOM_UNKNOWN (RFX-D30), NO_ITEMS, ITEM_SPEC_MISSING, TIER_COUNT, TIERS_NOT_INCREASING, CURRENCY_NOT_PERMITTED, SAMPLES_INVALID, and the item and question rules.
- **Quotes:** TIER_PRICE_MISSING, SPEC_VALUE_MISSING, ONE_TIME_COST_MISSING, SAMPLE_OFFER_MISSING, MOQ_INVALID, LEAD_TIME_INVALID, ALTERNATIVES_NOT_ALLOWED, ANSWER_MISSING.
- **Rounds:** ROUND_CLOSED, NOT_IN_ROUND, NO_SHORTLIST, NOT_A_BIDDER, RFP_NOT_ROUND_READY, ROUND_OPTION_SETTLED, OFFER_VALIDITY_MISSING.
- **Award:** AWARD_SPLIT_INCOMPLETE, AWARD_ITEM_NOT_QUOTED, AWARD_ITEMS_OPEN, AWARD_REASON_REQUIRED, AWARD_REASON_COMPLIANCE_FLAG, AWARD_OFFER_EXPIRED, AWARD_OPTION_SOURCED_ELSEWHERE, COMPLIANCE_GATE_FAILED, RFQ_OPTION_IN_FIRM_ROUND, RFQ_SOURCE_RFP_OPEN (an RFQ from an RFP that is still Open), AWARD_RAISED_IN_SAP, AWARD_SAP_DOCUMENT_REQUIRED.
- **Documents:** DOCUMENT_REQUIRED_MISSING, CERTIFICATE_FIELDS_MISSING, FILE_COUNT_EXCEEDED, FILE_TYPE_NOT_ALLOWED, FILE_TOO_LARGE.

---

## 8. Data

**Records** (`src/services/sourcing/types.js`, `src/data/mockRfqs.js`, `src/data/mockQuotations.js`): RfiEvent, RfiResponse, RfpEvent, RfpResponse (term answers Comply/Deviate), ResponseVersion, RFQ (items, breaks, invitees, per-invitee deadlines, extensions, FX pins), Quotation (lines, round number, supersedes), NegotiationRound, RfpOfferRound, RfpFirmOffer, AwardLine (share, quantity, split basis, break), RfqAwardRecord and RfpAwardRecord (lines, reason, not-awarded suppliers, compliance at award, best scored), AwardCancellation, AwardSapMark, intent records.

**Append-only (production must not update or delete):** award records, award cancellations, SAP marks, response versions, quotation versions, FX pins. An award's status is derived from its trail, never stored.

**Identity:** every record carries the actor; the prototype records `UNATTRIBUTED: NO_PERSON_IN_SESSION` until a sign-in provider names a person.

---

## 9. What production must add

| Need | Prototype today | Production | Backlog |
|---|---|---|---|
| Backend and database | In-memory stores, reset on reload; `httpDataService` designed, not wired | Server stores with the same verbs, rules and refusals; tenancy enforced on the server | Stage F |
| SAP hand-off | An award mints no PO or contract; the buyer types the SAP document number | Send the award to SAP and receive the document number | BL-121 |
| Email | None; the supplier learns of events only in the hub | Invitations, reminders, rounds, award and withdrawal | BL-120 |
| File storage | Files kept for the session only | Real storage behind `IFileService`, virus scan, signed links | BL-27, BL-125 |
| Sign-in | No named person | Named actor on every record | F1 |
| Response drafts | Kept in the browser | Kept on the server with "Discard draft" | BL-214 |
| Notifications store | Bell notices derived on read, no read state | Stored notices with read and unread | BL-213 |
| RFQ auto-close | `t_rfq_close` exists, nothing fires it | Close at the response deadline | — |
| Templates | Browser storage | Shared central library | BL-95 |

---

## 10. Testing

- Gates: `npx -y -p node@24 -- sh -c 'node scripts/gates.mjs'` runs build, spec typecheck, the full vitest suite, the access-gate suite, lint and format, and asserts the floor in `scripts/floor.json`. Node 24 is required (`.nvmrc`).
- About 90 RFx spec files; the RFx UX build specs are `rfx/rfxUx2A`, `BuyerSourcing/rfxUx1D`, `rfxUx2B`, `rfxUxB02`, `BuyerSourcingEvent/eventStage`, `SupplierRFQs/rfxUx1B`, `rfxUx2C`, `rfx/RfxConfirmSheets`, `SupplierResponseForms`, `responseDraft`, `builtInDuplicates`, `RfxIntent`, `services/sourcing/rfxIntent`, `rfqOptionInRound`, `services/data/mock/rfxIntentCommand`, `rfqFromOpenRfp`, `rfx/builtInLink`, `rfx/rfxExtend`, `rfx/oneStageBar.guard`, `BuyerSourcing/rfxUxBl222`, `rfxUxBl216`; since wave 12 also `rfx/RfiCreateWizard.formStates`, `rfx/RfpCreateWizard.formStates` (the form states pinned before the react-hook-form conversion, then RFX-D32) and `rfx/RfpCreate` (the kept RFI link).
- Each refusal is pinned by a passing and a failing case. Production tests should port these cases against the server.

---

## 11. Source documents

- `research/RFX-UX-EVALUATION-2026-10.md` — the 32 UX findings, design proposals, mockups and build status (section 10).
- `DECISION-GUIDE.md` — RFX-D1 to RFX-D32.
- `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, `RFX-BUILD-PLAN-2026-09.md` — the 2026-09 improvements.
- `SUPPLIER-HUB-REQUIREMENTS.md` — REQ-E03-01 to REQ-E03-05.
- `BUILD-GAP.md` — what is built per requirement; `BACKLOG.md` — what is left.
- `user-guide/SCENARIOS.md` UC1 — the end-to-end sourcing scenario.
- `docs/contracts/C1-methods.md` — the verb catalogue.

---

## 12. Calls made during the build, waiting for owner review

Built as recommended; the owner may change any of them.

| Area | Call | Recommendation |
|---|---|---|
| Supplier forms | Drafts are kept in the browser, not on the server | Decided 2026-10-22: keep until the backend (BL-214) (RFX-D28) |
| Supplier forms | A repeated buyer question is shown and the built-in field hidden; its answer fills the built-in field on send | Keep; a stored link replaces the word match (BL-215) |
| Supplier forms | Single-price Submit is disabled until price, validity and documents are in | Keep |
| Supplier RFQ | Legacy RFQs also need "I will respond" before quoting (reverses the 2026-09-21 rule that quoting was the statement of intent) | Decided 2026-10-22: keep (RFX-D26) |
| Supplier RFQ | Round and outcome strips sit on the My Quotes card | Keep |
| Supplier RFQ | A non-tiered round prefills the last unit price | Keep |
| Supplier intent | A decline is final; a declined supplier cannot save a draft; decline reasons reuse the RFQ list | Decided 2026-10-22: the decline stays final (RFX-D27); reasons become a shared core plus a list per event type (RFX-D31) |
| To do | Lanes in a fixed order; a red row no longer jumps above other lanes | Keep (RFX-D20) |
| Bell | No read state; the badge counts every award notice | Keep until BL-213 |
| RFQ board | "Needs my action" leaves out Open and Closed RFQs with no quote; awarded RFQs awaiting "Raised in SAP" count | Keep |
| RFQ board | "All" tab removed; an out-of-list Incoterm is flagged, not refused | Keep |
| RFQ wizard | Unit by category: Packaging → PCS, others KG | Decided 2026-10-22: Packaging PCS, Other no unit until the buyer picks one, the rest KG (RFX-D30) |
| RFQ wizard | Seeded first break is a total break | Keep |
| RFQ side panel | The "Your move" line is replaced by the stage-derived Next | Keep |
| RFQ comparison | With no exchange rate, bids stay visible with "—" scores | Keep (RFX-D24) |
| RFQ event page | Early negotiation round warns, never blocks | Keep |
| RFP | "Create RFQ from this RFP" is refused while the RFP is Open, at the verb as well as on the page; it also refuses revising a draft RFQ whose RFP was extended back to Open | Keep (BL-216) |
| RFI and RFP pages | "Extend" shown only in the statuses the extend verb accepts (Open, Closed) | Keep (BL-219) |
| RFQ side panel | "Cancel RFQ" confirms on a sheet with no reason field, because the verb takes none and Cancelled is final | Keep (BL-222) |
| Questions | A buyer question can be linked to the built-in field it repeats; the word match stays only for unlinked questions | Keep (BL-215) |
| Award panels | Compact qualification pill with the explanation as a tooltip; the full text once in the invitee table | Keep |


---

## Annex A. Verbs, hooks and refusals with their source

Read on `feat/rfx-ux-wave2` on 2026-10-19 and spot-checked against the source. Line numbers will move; the names will not. "MCS" is `src/services/data/mock/MockCommandService.js`.

### A.1 Where each policy hook is implemented
- `services/transitions/policies.js`: QUOTATION_SUBMIT_CURRENCY_PERMITTED, RFQ_FX_PIN_WELL_FORMED, RFQ_CREATE_VALID.
- MCS: RFI_CREATE_VALID, RFX_PUBLISH_HAS_INVITEES, RFX_INVITEES_QUALIFIED, RFX_EXTEND_VALID, RFX_RESPONSE_INVITED, RFX_RESPONSE_WINDOW_OPEN, RFX_RESPONSE_NOT_SUBMITTED, RFI_SUBMIT_COMPLETE, RFP_CREATE_TERMS_KNOWN, RFX_RESPONSE_ACCEPTANCE_GATE, RFP_SUBMIT_TERMS_ANSWERED, QUOTATION_SUBMIT_BEFORE_DEADLINE, QUOTATION_LINES_WELL_FORMED, QUOTATION_REVISE_IN_ROUND, NEGOTIATION_ROUND_VALID, RFP_OFFER_ROUND_VALID, RFP_FIRM_OFFER_VALID, RFQ_AWARD_GOVERNED, RFQ_AWARD_CANCEL_GOVERNED, RFQ_AWARD_SAP_GOVERNED, RFP_AWARD_GOVERNED, RFP_AWARD_CANCEL_GOVERNED, RFP_AWARD_SAP_GOVERNED, RFQ_CREATE_RFP_OPTIONS_FREE.
- `services/data/mock/rfxIntentCommand.js`: RFX_INTENT_VALID, RFX_RESPONSE_NOT_DECLINED (returns `INTENT_DECLINED`).
- `services/data/mock/rfqEngagementCommand.js`: RFQ_INTENT_VALID, RFQ_CONFIDENTIALITY_ACCEPTABLE, RFQ_CLARIFICATION_ASKABLE, RFQ_CLARIFICATION_ANSWERABLE, QUOTATION_TIERED_WELL_FORMED.
- `services/data/mock/rfxDocumentsCommand.js`: RFX_RESPONSE_DOCUMENTS_WITHIN_LIMITS, RFX_RESPONSE_DOCUMENTS_COMPLETE, QUOTATION_DOCUMENTS_COMPLETE.

### A.2 Command targets
`rfq`, `quotation`, `rfiEvent`, `rfiResponse`, `rfpEvent` (also the RFP award, cancel and SAP mark), `rfpResponse`, `negotiationRound`, `rfpOfferRound`, `rfpFirmOffer` in MCS; `rfqIntent`, `rfqConfidentiality`, `rfqClarification` in `rfqEngagementCommand.js`; `rfiIntent`, `rfpIntent` in `rfxIntentCommand.js`. The registered set is `WIRED_COMMAND_TARGETS` in MCS; derive it, do not copy it.

### A.3 Refusal codes by source
- **Events and invitees (MCS):** UNKNOWN_TEMPLATE, BAD_DEADLINE, NO_QUESTIONS, NO_INVITEES, SUPPLIER_NOT_SELECTABLE, NOT_INVITED, NOT_AN_EXTENSION, EVENT_NOT_OPEN, TC_DOCUMENT_EMPTY, ATTACHMENT_MALFORMED, UNKNOWN_SOURCE_RFI, CONFIDENTIALITY_MALFORMED; SUPPLIER_NOT_QUALIFIED in `services/sourcing/sourcingType.js`.
- **Responses:** RESPONSE_DEADLINE_PASSED and RESPONSE_ALREADY_SUBMITTED (`transitions/rfxRules.js`); PAST_DEADLINE, CONFIDENTIALITY_NOT_ACCEPTED, TC_NOT_ACCEPTED, REQUIRED_UNANSWERED, ANSWER_INVALID, TERMS_UNANSWERED, TERM_ANSWER_INVALID, DEVIATION_NEEDS_COMMENT (MCS); INTENT_DECLINED (`services/sourcing/rfxIntent.js`, `rfqEngagementCommand.js`).
- **Intent (`rfxIntent.js`; RFQ twin in `rfqResponse.js`):** EVENT_NOT_FOUND, NOT_RESPONDING, INTENT_ALREADY_STATED, DECLINE_REASON_UNKNOWN, DECLINE_TEXT_MISSING, RESPONSE_ALREADY_SENT; QUOTE_ALREADY_SUBMITTED on the RFQ.
- **RFQ engagement (`rfqResponse.js`):** NOT_CONFIDENTIAL, ALREADY_ACCEPTED, QUESTION_EMPTY, QUESTION_TOO_LONG (over 1000 characters), CLARIFICATION_NOT_FOUND, ALREADY_ANSWERED, ANSWER_EMPTY, VISIBILITY_UNKNOWN, RFQ_NOT_FOUND.
- **RFQ authoring (`services/sourcing/rfqModel.js`):** TIER_COUNT, TIER_NOT_POSITIVE, TIER_BASIS_UNKNOWN, TIERS_NOT_INCREASING, ITEM_INCOMPLETE, ITEM_TYPE_UNKNOWN, VARIANTS_INVALID, ITEM_SPEC_MISSING, ONE_TIME_COST_UNKNOWN, CURRENCY_NOT_PERMITTED, NO_ITEMS, QUESTION_INCOMPLETE, UNKNOWN_QUESTION_TYPE, SAMPLES_INVALID, BUILT_IN_MISMATCH.
- **Quotes (`rfqResponse.js` `tieredQuoteRefusal`, `rfxRules.js` `quoteLinesRefusal`):** NOT_TIERED, TIERED_QUOTE_REQUIRED, ITEM_UNKNOWN, ITEM_QUOTE_MISSING, ITEM_QUOTE_DUPLICATE, TIER_PRICE_MISSING, TIER_UNKNOWN, TIER_PRICE_INVALID, SPEC_VALUES_MALFORMED, SPEC_VALUE_MISSING, SPEC_VALUE_INVALID, SPEC_VALUE_UNKNOWN, ONE_TIME_COST_INVALID, ONE_TIME_COST_MISSING, SAMPLE_OFFER_MISSING, SAMPLE_OFFER_INVALID, MOQ_INVALID, LEAD_TIME_INVALID, ALTERNATIVES_NOT_ALLOWED, ALTERNATIVE_INCOMPLETE, ANSWERS_MALFORMED, ANSWER_MISSING, ANSWER_UNKNOWN, QUOTE_LINES_MALFORMED, QUOTE_LINE_MATERIAL, QUOTE_LINE_QTY, QUOTE_LINE_PRICE, QUOTE_LINE_DUPLICATE.
- **Rounds:** ROUND_MISMATCH, ROUND_CLOSED, NOT_IN_ROUND, EVENT_CLOSED, NO_SHORTLIST, NOT_A_BIDDER, BAD_TARGET (MCS); RFP_NOT_FOUND, RFP_NOT_ROUND_READY, ROUND_NO_OPTIONS, ROUND_OPTION_UNKNOWN, ROUND_OPTION_SETTLED, ROUND_QTY_INVALID, ROUND_NO_INVITEES, ROUND_NOT_RESPONDED, ROUND_NOT_INVITED, OFFER_EMPTY, OFFER_OUTSIDE_ROUND, OFFER_PRICE_INVALID, OFFER_PRICE_DUPLICATE, OFFER_VALIDITY_MISSING (`services/sourcing/rfpFirmOffer.js`).
- **Award (`services/sourcing/awardShape.js`):** AWARD_EMPTY, AWARD_ITEM_UNKNOWN, AWARD_TIER_UNKNOWN, AWARD_SHARE_INVALID, AWARD_QTY_INVALID, AWARD_SPLIT_INCOMPLETE, AWARD_ITEM_NOT_QUOTED, AWARD_QTY_NOT_DERIVED, AWARD_ITEM_ALREADY_AWARDED, AWARD_ITEMS_OPEN, AWARD_NOTHING_OPEN, AWARD_REASON_REQUIRED, AWARD_REASON_COMPLIANCE_FLAG, AWARD_OFFER_EXPIRED, AWARD_OPTION_SOURCED_ELSEWHERE, AWARD_SUPPLIER_NOT_QUALIFIED; QUOTE_NOT_ON_EVENT (MCS); COMPLIANCE_GATE_FAILED (`complianceGate.js`); RFQ_OPTION_IN_FIRM_ROUND and RFQ_SOURCE_RFP_OPEN (`rfpAward.js`).
- **Award cancel and SAP mark (`services/sourcing/awardStatus.js`):** AWARD_NOT_ACTIVE, AWARD_RAISED_IN_SAP, AWARD_REASON_REQUIRED, AWARD_CANCEL_TARGET_WRONG, AWARD_SAP_DOCUMENT_REQUIRED.
- **Documents (`transitions/rfxDocumentRules.js`, `attachments/fileRules.js`):** DOCUMENT_REQUEST_INVALID, DOCUMENT_REQUEST_UNKNOWN, DOCUMENT_REQUIRED_MISSING, CERTIFICATE_FIELDS_MISSING, FILE_COUNT_EXCEEDED, FILE_TYPE_NOT_ALLOWED, FILE_TOO_LARGE.
- **RFI and RFP authoring (`transitions/rfxRules.js`):** SECTIONS_MALFORMED, SECTION_ID_INVALID, SECTION_TITLE_REQUIRED, DUPLICATE_SECTION, UNKNOWN_SECTION, CHOICE_NEEDS_OPTIONS, OPTION_BLANK, OPTION_DUPLICATE, BOUNDS_NOT_APPLICABLE, BAD_BOUNDS, CURRENCY_REQUIRED, BAD_WEIGHT, DUPLICATE_QUESTION, NO_TERMS, DUPLICATE_TERM, CUSTOM_TERM_LABEL_REQUIRED, UNKNOWN_TERM_GROUP, UNKNOWN_TERM, UNKNOWN_VALUE_KIND, CHOICE_TERM_NEEDS_OPTIONS, TERM_VALUE_REQUIRED, TERM_VALUE_INVALID, the PRICING_* request codes and the pricing answer codes (PRICING_NOT_ASKED, PRICING_EMPTY, PROPOSED_OPTION_*, PRICE_UNKNOWN_OPTION, PRICE_UNKNOWN_QTY, PRICE_INVALID, PRICE_DUPLICATE, SAMPLE_OFFER_REQUIRED, SAMPLE_DATE_INVALID, VALIDITY_INVALID).
- **Templates (browser store, not verbs):** TEMPLATE_MALFORMED, TEMPLATE_SYSTEM_ID, TEMPLATE_DUPLICATE, TEMPLATE_UNNAMED (`rfqTemplates.js`); TEMPLATE_NAME_REQUIRED, TEMPLATE_NAME_LENGTH, UNKNOWN_FAMILY, UNKNOWN_CURRENCY, STORAGE_UNAVAILABLE, STORE_UNREADABLE (`rfxTemplates.js`).
- **Refusals without a code:** "event not found", "response not found", "RFP not found", "proposal not found", "sourcing event not found", "negotiation round not found" (MCS) and the currency and FX-pin messages in `policies.js`. Production should give these codes.

### A.4 Known inconsistencies in the prototype to resolve in production
- `negotiationRoundStore` and `rfpOfferRoundStore` are described as append-only in the store header but are updated in place on close; `rfpFirmOfferStore` is updated per revision. Production should append and derive.
- The `quotation.flow.js` header still calls `t_quotation_submit` and `t_quotation_review` "AUTHORED-UNWIRED" (`quotation.flow.js:11-13`), yet the quotation target is registered and both verbs are tested. Treat the code, not the comment, as the truth.
- `t_rfq_publish` runs only RFX_INVITEES_QUALIFIED. It deliberately skips RFX_PUBLISH_HAS_INVITEES, because that hook reads `invitees` and an RFQ keeps `invitedSupplierIds` (`rfq.flow.js:126-129`). Production should give the RFQ its own "has invitees" check, so all three event types refuse a send to nobody the same way.
