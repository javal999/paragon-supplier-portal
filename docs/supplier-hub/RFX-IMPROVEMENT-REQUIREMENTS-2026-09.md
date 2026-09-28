# RFx improvement requirements: experience review, supplier attachments, RFP award, multi-supplier award

| Field | Value |
|---|---|
| Status | **Folded in on 2026-09-28** (task F1). Owner accepted every recommendation in section 7 (D-1 to D-9) on 2026-09-25; they are recorded as RFX-D6 to RFX-D14 in section 9 of `SUPPLIER-HUB-REQUIREMENTS.md` 0.24 and in `DECISION-GUIDE.md`. The NR-1 to NR-3 rules are now CE-11a to CE-11m, REQ-E03-02 BR-17 and BR-18, REQ-E03-03 BR-25, REQ-E03-04 BR-14 to BR-16 and REQ-E03-05 BR-11 to BR-17; US-RFX-01 to US-RFX-10 are US-70 to US-79 in the PRD. What was built, and where it differs from this file, is in `BUILD-GAP.md`. Built in PRs #54 (A1), #55 (A2), #56 (B1), #57 (D1), #58 (C1), #59 (B2), #60 (B3), #61 (C2), #62 (B5), #63 (B4), #64 (C3), #66 (D2) and #67 (D3), all merged 2026-09-28; #57 and #66 reached `main` inside #67. This file stays as the record of the analysis and is not updated further |
| Date | 2026-09-25 |
| Code read | `main` at `f3fdede` (same as `origin/main` on the day) |
| Covers | NR-1 supplier attachments in responses, NR-2 award from an RFP, NR-3 award to more than 1 supplier in an RFQ or RFP, and a review of the RFI, RFQ and RFP experience against the market |
| Builds on | REQ-E03-01 to REQ-E03-05, CE-01 to CE-11, CR-15, CR-23, owner decisions RFX-D1 to RFX-D5 (`DECISION-GUIDE.md:184-221`), `research/RFX-BEST-PRACTICE-2026-09.md` |

**Tags.** [Code] = built behaviour, cited `path:line`. [Owner, date, ID] = an owner ruling. [Proposed] = nobody has confirmed it; the owner decides in section 7. **Grades** for market claims: A = vendor documentation, help portal, API guide, release notes; B = standards and law; C = practitioner and customer supplier guides; D = vendor marketing. "Snippet" means only a search-result summary could be read. Code paths are under `src/` unless they start with `docs/`.

**New IDs.** User stories are numbered US-RFX-01 onward and requirement rules NR-n BR-nn, so nothing collides with the main documents. The owner renumbers them on merge.

---

## 1. Summary

The RFx modules match common market practice for authoring and RFQ comparison. They fall short in 3 places that decide whether an event can be finished inside the hub:

1. Supplier files are not kept.
2. An award cannot be undone or made from an RFP.
3. Suppliers hear about events only when they open the hub.

Authoring and the RFQ comparison by break are in line with SAP Ariba and Oracle.

- **NR-1 Supplier attachments.** A supplier can already attach files to an RFQ quote and to attachment-type questions. It cannot attach a general file to an RFI or RFP response. The buyer has no screen that opens any supplier file, and the file itself is lost on reload. The change adds a response-level file area to all 3 event types, required documents set by the buyer, a buyer file view, and real storage (BL-27). Reason: the charter's target of 100% of supplier files in the database, and the audit-trail target.
- **NR-2 Award from an RFP.** An RFP has no award today. The change adds a **firm-offer round** inside the RFP that turns indicative prices into firm ones for the shortlisted suppliers, then an award per option. Reason: full-service and ODM requests (Tundra, ICY) are settled in the RFP, and forcing a copy into an RFQ doubles the work. This amends RFX-D4, so the owner decides first.
- **NR-3 Award to more than 1 supplier.** RFQ split award by percentage per item is built (RFX-D5). The change adds split by quantity, a partial award that leaves items open, the same split on legacy RFQs and on RFPs, and cancelling or correcting an award before it reaches SAP. Reason: dual sourcing is the stated purpose of RFX-D5, and today a wrong award is permanent.

---

## 2. RFx today

Everything runs in the browser on mock stores (`CLAUDE.md`, "Backend is greenfield"); a reload keeps records in memory only for the session. "Real" below means wired through the command dispatcher and its rules. It does not mean persisted.

### 2.1 RFI

| Aspect | As built |
|---|---|
| Event states | Draft, Open, Closed, Cancelled (`services/sourcing/types.ts:155`, `services/transitions/flows/rfiEvent.flow.ts:30-32`) |
| Buyer | Creates from blank, template or copy; sections and 11 question types; confidentiality gate; publish, extend, close, cancel (`rfiEvent.flow.ts:38-108`); "Create a proposal request from this" (`docs/supplier-hub/BUILD-GAP.md:23`) |
| Supplier submits | Answers per question: value, description, range, files (`types.ts:114-124`); Draft then Submitted, and Submitted is final (`rfiResponse.flow.ts:19-21`) |
| Supplier can attach | Only to attachment-type questions (`types.ts:123`). `RfiResponse` has no file field of its own (`types.ts:202-211`) |
| Evaluation | Weighted-question score for a shortlist that "awards nothing" (`services/transitions/rfxRules.ts:373-425`) |
| Award | None, by design (RFX-D1) |

### 2.2 RFQ

| Aspect | As built |
|---|---|
| Event states | Draft, Open, Closed, Awarded, Cancelled. Awarded and Cancelled are final (`services/transitions/flows/rfq.flow.ts:30-33`). The close verb exists, but "nothing fires it today" (`rfq.flow.ts:120-137`) |
| Buyer | Wizard with items, spec fields, 1 to 8 breaks, one-time costs, questions, alternatives, samples; templates and copy; pre-fill from RFI, RFP or requisition (`BUILD-GAP.md:24`) |
| Supplier submits | Intent or decline, then a quote grid per item and break; "Revise quote" keeps both versions (`BUILD-GAP.md:24`; `flows/quotation.flow.ts:80`) |
| Supplier can attach | A general quote file area on both forms (tiered form `pages-v2/rfqs/TieredQuoteForm.tsx:448-453`; legacy form `pages-v2/SupplierRFQs.tsx:1693-1698`), plus attachment questions |
| Evaluation | Per item at a chosen break; CR-15 score over suppliers that pass CR-23; CSV export (`BUILD-GAP.md:27`) |
| Award | Per item, split by % across suppliers, at one break for the whole award. Each item must total 100% (`services/sourcing/rfqComparison.ts:400-438`, `rfxRules.ts:632-656`). No PO: "The hub records the award. The purchase order or contract is raised in SAP." (`lib/i18n/rfx.ts:320`) |

### 2.3 RFP

| Aspect | As built |
|---|---|
| Event states | Draft, Open, Closed, Cancelled; only Cancelled is final (`flows/rfpEvent.flow.ts:26-28`) |
| Buyer | Standard and custom terms; T&C document; confidentiality gate; optional indicative pricing (options × quantity points); questions; templates; "Create RFQ from this RFP" (`BUILD-GAP.md:25`) |
| Supplier submits | Comply or deviate per term, other terms, question answers, indicative prices, own options, sample offer, validity (`types.ts:353-370`). Submitted is final (`rfpResponse.flow.ts:19-21`) |
| Supplier can attach | Only to attachment-type questions. `RfpResponse` has no file field (`types.ts:353-370`) |
| Evaluation | Terms × suppliers comparison, compliance share, and a CR-15 score only when the RFP has both a price and a lead-time term (`pages-v2/rfx/rfpScoring.ts:21-49`) |
| Award | None. The flow has no award verb (`rfpEvent.flow.ts:31-100`). RFP → RFQ carries the chosen options and never the indicative prices (`services/sourcing/rfxPrefill.ts:140-147`) |

### 2.4 Across all 3

- **Files.** "There is no file store." A record keeps name, size and type only. "A reload keeps the metadata on the record and loses the file" (`services/attachments/sessionAttachments.ts:2-13`, `services/sourcing/rfqModel.ts:77`).
- **Who may award.** The `procurement` bundle holds create, publish, negotiate and award together (`services/transitions/businessRoles.ts:143-160`). No approval step exists for sending an event (CE-06, `docs/supplier-hub/SUPPLIER-HUB-REQUIREMENTS.md:184`) or for an award (no verb or policy found).
- **Notification.** None outside the hub: "notification outside the hub (no email)" is listed as not built (`BUILD-GAP.md:27`). In the hub, the supplier sees its own share or "Not awarded" (`pages-v2/SupplierNegotiations.tsx:263-266`).

---

## 3. Experience review against the market

**Method.** 9 dimensions, buyer and supplier. Market evidence is taken from `research/RFX-BEST-PRACTICE-2026-09.md` (cited as "RFX research §n") and from new research on 2026-09-25 (section 10). Severity: **High** blocks a real sourcing event or breaks the audit-trail target. **Medium** forces a workaround outside the hub. **Low** adds effort while the job still gets done in the hub.

### 3.1 Findings, by severity

**F-01 · High · Dimension 3 (response) · Confidence high**
Supplier files do not survive a reload. Only name, size and type are stored (`sessionAttachments.ts:2-13`). A certificate or drawing sent with a quote is gone before the buyer evaluates it, which breaks CE-11 (`REQUIREMENTS.md:189`) and the charter target "Supplier data and files managed in the database: 100%" (`SUPPLIER-HUB-PRD.md:38`). Market: every suite stores response files, with per-file limits of 50 to 250 MB (Coupa 250 MB, A; Jaggaer 50 MB, C). Change: NR-1 with BL-27.

**F-02 · High · Dimension 4 (evaluation) · Confidence medium**
The buyer cannot open a supplier's files. No buyer page reads a quotation's `attachments`: the only buyer attachment views show the event's own files (`pages-v2/BuyerRfi.tsx:355-360`, `pages-v2/BuyerRfp.tsx:293-298`), and RFI and RFP attachment answers render as file names joined by commas (`pages-v2/rfx/rfxAuthoringDisplay.tsx:84-89`). Confidence is medium because this rests on a search of the buyer pages, not a trace of every component. Market: Oracle downloads "specific or all attachments at the header level" (A), and Ariba downloads a ZIP of all attachments (C, snippet). Change: NR-1 buyer steps 5 and 6.

**F-03 · High · Dimension 6 (award) · Confidence high**
An RFP cannot be awarded (`rfpEvent.flow.ts:26`). A full-service request settled in the RFP must be copied into an RFQ and re-quoted before anything is recorded as awarded. Market: "The Award tab is available for competitive bid events (auctions), RFPs, and RFIs" (Ariba Event Management guide, A); Coupa awards RFP, RFI and RFQ events at line level (A). Change: NR-2.

**F-04 · High · Dimension 6 (award) · Confidence high**
An award cannot be cancelled or corrected. Awarded is a final state (`rfq.flow.ts:33`), and no cancel-award verb exists, though the requirements name the case "The buyer cancels an award before it is sent to SAP" (`REQUIREMENTS.md:617`). A wrong split can be fixed only outside the hub, and nothing records it, which breaks the audit-trail target (`PRD.md:37`). Market: Oracle reopens an award with a reason, and "This activity is recorded" (A); Ariba lets a resubmitted scenario overwrite the earlier one (A). Change: NR-3 BR-09 to BR-11.

**F-05 · Medium · Dimension 3 (response) · Confidence high**
A supplier cannot revise a submitted RFI or RFP response, because Submitted is final (`rfiResponse.flow.ts:21`, `rfpResponse.flow.ts:21`). An RFQ quote can be revised (`quotation.flow.ts:80`). A supplier who uploads the wrong file has to email the buyer. Market: suppliers revise until the deadline and "the last submitted response" counts (Ariba customer guide, C); Coupa suppliers "update your information as many times as needed" (RFX research §5, A). Change: NR-1 BR-08.

**F-06 · Medium · Dimension 6 (award) · Confidence high**
The split award covers only part of real dual sourcing. The split is by percentage only, at one break for the whole award, and every item must total 100% (`rfqComparison.ts:420-425`), so the buyer cannot award 2 items now and hold the third. Market: Ariba splits "by Quantity or Percentage" (A); Oracle splits by quantity (A); Fairmarkit lets the buyer "award the remaining line items later" (A). Change: NR-3 BR-02 to BR-05.

**F-07 · Medium · Dimension 6 (award) · Confidence high**
Legacy RFQs award differently from tiered ones. The list page sends a single winner with no split (`pages-v2/BuyerSourcing.tsx:1172-1182`, `services/query/commandHooks.ts:616-633`). The event page splits against the first line item only (`pages-v2/BuyerSourcingEvent.tsx:235-236`), so a legacy RFQ with 2 lines cannot be split per line. Change: NR-3 BR-07.

**F-08 · Medium · Dimension 8 (status and notification) · Confidence high**
The hub sends no email or other message outside itself (`BUILD-GAP.md:27`). Invitations, deadline reminders and award outcomes reach suppliers only when they log in, so buyers chase by email or WhatsApp. Market: email invitations and reminders are standard. Ariba configures reminders "for prebid end time, bidding start time, and due date" (A, snippet), and Coupa emails suppliers when an event is about to end (A). Change: section 8 step 5; NR-1 to NR-3 name each notification.

**F-09 · Medium · Dimension 7 (links and SAP) · Confidence high**
The award does not reach SAP. The record says "No PO, no contract" (`types.ts:416`), and PO creation is "a separate buyer verb (future batch)" (`services/data/mock/MockCommandService.ts:1498`). The buyer re-types each award line in SAP. Market: Ariba sends each award to S/4HANA, and "The ERP creates a purchase order, contract, or scheduling agreement" (A). Change: out of scope here; it depends on the SAP seam (Stage F2) and interface PQ-06 (`REQUIREMENTS.md:631`).

**F-10 · Medium · Dimension 9 (audit and permissions) · Confidence medium**
The person who runs the event also awards it, with no second check. `procurement` holds `rfq:create`, `rfq:publish`, `rfq:negotiate` and `rfq:award` (`businessRoles.ts:143-160`), and no award approval exists. Market: Ariba "Approval for Award" (A, snippet) and Oracle award approvals by amount (A). Confidence is medium because separating the roles is possible today through custom roles; what is missing is an approval step. Change: open decision D-5.

**F-11 · Medium · Dimension 5 (negotiation) · Confidence high**
An RFP has no negotiation round, while an RFQ does (`types.ts:375-387` names the round by `rfqId`). An RFP's indicative prices cannot be firmed up in the RFP itself. Market: Ariba opens a new round "after bidding closes… before items are awarded" (A). Change: NR-2 firm-offer round.

**F-12 · Medium · Dimension 1 (authoring) · Confidence high**
A live event cannot be amended. Only the deadline can move (`rfq.flow.ts` extend; BL-92 is "later", `docs/supplier-hub/BACKLOG.md:128`). A spec correction means cancelling and re-issuing. Market: Oracle marks earlier responses "resubmission required" after an amendment (A); Coupa creates a new revision and emails suppliers (A). Change: stays BL-92. Listed so the owner sees it beside NR-1, since an amendment often adds a file.

**F-13 · Low · Dimension 2 (invitation and intent) · Confidence medium**
Intent to respond, and decline with a reason, exist on the RFQ only. A search of `pages-v2/SupplierRfi.tsx` and `pages-v2/SupplierRfp.tsx` finds no intent or decline. The buyer of an RFI or RFP cannot tell "not yet" from "will not". Market: Ivalua tracks "Will Respond… Will Not Respond" (C); Zycus has "Confirm Participation" or "Decline Participation" (C). Change: proposed as a follow-on; not part of NR-1 to NR-3.

**F-14 · Low · Dimension 9 (audit) · Confidence medium**
Award, file and revision records carry no named person. The session actor is always `UNATTRIBUTED: NO_PERSON_IN_SESSION` (`CLAUDE.md`, "Current state"). The record shows what and when, but not who. Market: the Ariba audit log shows who entered and exited the event (A, snippet); Oracle keeps a timeline with the username for each action (A). Change: none here; it waits on the identity provider (F1). Every NR-1 to NR-3 record keeps an actor field, so the name fills in when that lands.

**F-15 · Low · Dimension 1 (authoring) · Confidence high**
Saved templates live in one browser only (BL-95, `BUILD-GAP.md:268`). Change: stays BL-95.

**F-16 · Low · Dimension 3 (response) · Confidence high**
There is no document type with a number and an expiry date. A halal or ISO certificate sent in an RFQ is an unnamed file. Market: Ariba "Certificates allow Participants to add attachments with certificate numbers and effective and expiration dates" (C). Change: NR-1 BR-04.

### 3.2 Dimension table

| # | Dimension | Hub today | Common practice | Leading edge | Gap | Severity |
|---|---|---|---|---|---|---|
| 1 | Event authoring | Sections, 11 types, breaks, templates, copy, gate | Same, plus central library | AI drafting, conditions | Amendment after publish (F-12); browser-only templates (F-15) | Medium |
| 2 | Invitation, intent, clarification, confidentiality | RFQ intent and decline; private or published clarifications; NDA gate | Intent on every event type | Timestamped supplier activity log (Oracle) | No intent on RFI or RFP (F-13) | Low |
| 3 | Supplier response | Drafts; RFQ revise; attachment questions; RFQ quote files | Response-level files; revise until deadline | Certificate answer type (Ariba); line-level files (Oracle) | Files lost on reload (F-01); no RFI/RFP revise (F-05); no certificate type (F-16) | High |
| 4 | Evaluation and comparison | Per item at a break, CR-15, CSV; RFP terms grid | Side-by-side with totals; team scoring | Optimisation, AI bid analysis | Buyer cannot open supplier files (F-02) | High |
| 5 | Negotiation rounds | RFQ rounds, best-and-final flag, versions kept | Rounds before award | Target price per line | No RFP round (F-11); no target per item and break (`BUILD-GAP.md:27`) | Medium |
| 6 | Award | RFQ per item by %, one break, reason rule, gate | By line, % or quantity; approval | Line-by-line approval, reopen with reason | No RFP award (F-03); no cancel (F-04); % only and every item required (F-06); legacy award (F-07) | High |
| 7 | Links and SAP hand-off | RFI → RFQ/RFP, RFP → RFQ, "Created from" | Award creates PO or contract | Validity and scales sent to ERP | No SAP hand-off (F-09) | Medium |
| 8 | Status and notification | In-hub states; supplier sees its share | Email invitation, reminders, award notice | Configurable reminders per milestone | No message outside the hub (F-08) | Medium |
| 9 | Audit, permissions, segregation | Transition trail; award reason; FX pin role split | Event log; award approval | Unseal and award as separate privileges | No award approval (F-10); no named actor (F-14) | Medium |

### 3.3 DROPPED

Each of these was drafted as a finding and then disproved from the code:
- "A supplier cannot attach any file to an RFP": attachment-type questions carry files (`types.ts:123`).
- "A 70/30 split marks the 30% quote Rejected": fixed in PR #26 (`BUILD-GAP.md:27`).
- "A supplier cannot see its award share": it can (`SupplierNegotiations.tsx:263-266`).
- "RFP → RFQ pre-fill is not wired, per the comment at `rfxPrefill.ts:139`": the wizard reads `?rfp=` and calls the pre-fill (`BuyerSourcing.tsx:1618-1627`). The comment is stale; that is a code tidy-up, not an experience gap.

---

## 4. NR-1 Supplier attachments in responses

### a. Problem and reason
A supplier can put a file on an RFI or RFP response only through a question the buyer happened to create (`types.ts:202-211`, `types.ts:353-370`). Where it can attach, the buyer cannot open the file (F-02), and the file is lost on reload (F-01). Packaging and ODM sourcing runs on files: dielines, mold drawings, halal and BPOM certificates, COA and MSDS sheets, sample photos, quotation PDFs. They travel by email beside the hub, which misses CE-11 and the charter targets for audit trail and supplier files (`PRD.md:37-38`).

### b. Market practice
- **3 places to attach:** a general response section (Jaggaer "Supplier Attachments section", C; Zycus "Upload Event Level Attachments", C), attachment questions (GEP "Attachment Only" and "Text + Attachment", C), and messages. Line-level files only at Oracle (A).
- **Required files block submit:** Ariba (A, snippet), and Coupa has a `response-required` flag (A). A certificate answer with number and expiry exists only at Ariba (C).
- **Limits:** Coupa "250 MB per upload", no .zip or .exe (A); Ariba 100 MB (A, snippet); Jaggaer 50 MB (C).
- **Lifecycle:** edit until close, and the last submission counts (Ariba C, Jaggaer C). Oracle keeps revised and archived responses (A).
- **Buyer view:** download all at header level (Oracle, A) or as a ZIP (Ariba, C, snippet).
- **AI extraction** of files into bid lines is claimed only by Fairmarkit (D), and stays on the later list.

### c. Already built
- `AttachmentMeta` (`rfqModel.ts:77`) and one shared upload control (`sessionAttachments.ts:12-13`).
- RFQ quote files on both supplier forms, stored on the quotation (`TieredQuoteForm.tsx:448-453`, `SupplierRFQs.tsx:1693-1698`, `rfqModel.ts:216`).
- Attachment questions with a required flag on all 3 types (`types.ts:27-38`, `types.ts:123`).
- The session-only note, with `urlFor` returning `null` after reload (`sessionAttachments.ts:7-10`).

### d. User stories
- US-RFX-01. As a supplier, I want to attach my documents to any RFI, RFP or RFQ response, and replace a wrong one before the deadline, so that my proposal is complete without an email beside it.
- US-RFX-02. As a buyer, I want to list the documents I need and mark them required, so that I do not chase missing papers after the deadline.
- US-RFX-03. As a buyer, I want to open and download every supplier file, with who sent it and when, so that I evaluate in the hub and the award can be traced to its documents.

### e. Step-by-step flow

**Buyer**
1. Event wizard, new "Documents from suppliers" step (RFI, RFP, RFQ). Add document requests: a name; a type (Certificate, Specification, Drawing, Sample photo, Quotation, Company profile, Other); required or optional; and response level or per RFQ item. They are saved on the Draft.
2. Send. The event moves Draft → Open, and the review step lists the requests.
3. While Open, the event page shows per supplier which requested documents are received or missing, plus any extra files. Drafts stay hidden.
4. Close. The event moves Open → Closed, and files can no longer change.
5. The "Supplier documents" tab lists every file per supplier: request, type, size, uploader, time, version. The buyer opens or downloads one, or uses "Download all" (ZIP).
6. The comparison view has a "Documents" row per supplier: complete, or missing against the required requests.

**Supplier**
1. Opens the event and accepts any confidentiality gate or T&C.
2. The response form's "Documents" section has 1 slot per request, marked required or optional, plus "Other documents".
3. Uploads, and saves the draft. Each file is checked against BR-05. Files can be added, replaced or removed.
4. Submits (Draft → Submitted). Submit is refused while a required slot is empty, and the refusal names the slot.
5. Before the deadline, "Revise response" creates a new version. Earlier versions and their files stay on the record.
6. After the deadline, files are read-only. A negotiation or firm-offer round can carry new files.

### f. Business rules
- NR-1 BR-01. Every RFI, RFP and RFQ response has a response-level file area. Reason: suppliers send what the buyer did not think to ask for, and it belongs on the record. [Proposed; Market: Jaggaer, Zycus]
- NR-1 BR-02. The buyer can add document requests with a name, type, required flag and level. Reason: a named slot tells the supplier what is needed and lets the hub check it. [Proposed; Market: Coupa]
- NR-1 BR-03. Submit is refused while a required request has no file, and the refusal names the request. Reason: the supplier can still act at that moment. [Proposed; Market: Ariba]
- NR-1 BR-04. A Certificate request also takes number, issuer and expiry date. A certificate expired at the deadline is flagged to the buyer, and the submission is not refused. Reason: a supplier that is renewing is not locked out, and the buyer sees the flag at award. [Proposed; D-9]
- NR-1 BR-05. Limits: at most 25 MB per file and 30 files per response. Allowed types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, PNG, DWG, DXF, STEP, STP. No ZIP or executables. Reason: this covers the files in the 5 sample RFQs, and Coupa bars ZIP and executables for security. [Proposed; D-3]
- NR-1 BR-06. A supplier's files are visible only to that supplier and to PTI, never to another supplier. Reason: drawings and prices are confidential (REQ-E03-05 BR-05). [Proposed]
- NR-1 BR-07. Draft files are invisible to PTI. Reason: the existing Draft rule (`types.ts:201`). [Code, extended]
- NR-1 BR-08. A submitted RFI, RFP or RFQ response can be revised until the deadline. Every version is kept with its files, and the buyer sees the latest first. Reason: closes F-05, the same as the RFQ's "Revise quote". [Proposed; D-6]
- NR-1 BR-09. A revised quote in a negotiation round, or a firm offer (NR-2), can carry files. Reason: a round often changes the drawing or the material. [Proposed]
- NR-1 BR-10. The record keeps who uploaded each file, when, and its version, plus every PTI download with who and when. Reason: CE-08 and the audit-trail target. [Proposed]
- NR-1 BR-11. Supplier files are not copied into a follow-on event. The new event links back to the source. Reason: a file answers a specific request, so it is not presented as an answer to a new one. [Proposed]
- NR-1 BR-12. Until BL-27 lands, file areas keep the session-only note, and the buyer view says which files are no longer held. Reason: CE-11. [Owner, 2026-09-17, SC-04]

### g. Lifecycle and data changes
- New `DocumentRequest {id, name, type, required, level}` on the 3 event types.
- New `ResponseDocument {requestId?, attachment, version, uploadedBy, uploadedAt, certificate?}` as `documents` on RFI and RFP responses and on the quotation. `AttachmentMeta` gains a storage key with BL-27.
- New verbs `t_rfiresponse_revise` and `t_rfpresponse_revise` (statePreserving, before the deadline only), on the model of `t_quotation_revise`. New download log `{fileId, by, at}`.
- No new atoms: suppliers use their existing answer atoms, and a buyer download is a read.

### h. Edge cases
1. A file above 25 MB: refused on upload with the limit named, and the draft keeps its other files.
2. The buyer wants a new required document after publish: not possible until BL-92 (amendments), so the buyer asks through a clarification.
3. The deadline passes mid-upload: the upload fails with "deadline passed", and the last submitted version stands.
4. A supplier declines after uploading to a draft: the draft files are discarded, and nothing reaches PTI.
5. The event is cancelled: files stay on the record, read-only.
6. The same file name is uploaded twice: both are kept, told apart by version.

### i. Acceptance criteria
- NR-1 AC-01. A supplier can attach a file to an RFI, an RFP and an RFQ response without any buyer request existing.
- NR-1 AC-02. Submit with an empty required request is refused, and the refusal names the request.
- NR-1 AC-03. A 26 MB file and a .zip file are each refused on upload with the reason.
- NR-1 AC-04. The buyer opens and downloads every file of a submitted response from the event page, and downloads all files of the event as 1 ZIP (after BL-27).
- NR-1 AC-05. Supplier A never sees a file uploaded by supplier B, on any screen or read.
- NR-1 AC-06. A revised RFP response shows as the new version, and the earlier version and its files stay viewable.
- NR-1 AC-07. After the deadline, the verb refuses upload, replace and delete. Hiding the controls is not enough.
- NR-1 AC-08. Each file shows who uploaded it and when, and each PTI download is recorded.

### j. Success metrics

| Metric | Formula | Baseline | Target [Proposed] | Answers |
|---|---|---|---|---|
| Files on record | Supplier files retrievable at award ÷ supplier files uploaded, per event | 0% after a reload (`sessionAttachments.ts:7-9`) | 100% | Charter: supplier files in the database 100% (`PRD.md:38`); audit trail 100% (`PRD.md:37`) |
| Complete at submit | Responses with every required request filled at submit ÷ submitted responses | No baseline yet; capture from the first 20 events after release | 95% | CE-11; charter sourcing admin time 8 h → 1 h per week (`PRD.md:36`) |
| Document chasing | Buyer clarifications asking for a missing document ÷ events | No baseline yet; count clarifications tagged "document" | Down 80% within 3 months | Charter sourcing admin time |

### k. Dependencies and out of scope
- BL-27 (file storage) is needed for AC-04, the ZIP download, virus scanning, the download log and the files-on-record metric. The rest can ship first on session storage, labelled (BR-12). BL-30 is needed for anything to survive a reload.
- Out of scope: sealed bids (BL-87), AI file extraction (later list), and feeding RFx certificates into the compliance registry. An RFx certificate is evidence for the buyer, and it does not change CR-23.

---

## 5. NR-2 Award from an RFP

### a. Problem and reason
An RFP has no award (`rfpEvent.flow.ts:26`). For full-service, ODM and open-spec requests (Tundra, ICY per RFX-D4), the decision is made on the proposal: the formula, the packaging option, the terms. The hub still forces a copy into an RFQ and a new round of quotes before anything is recorded as awarded. That doubles the supplier's work and the buyer's administration, and it leaves the actual decision unrecorded. It costs against the 8 h → 1 h per week target (`PRD.md:36`), and the RFP decision has no audit record (`PRD.md:37`).

**What an RFP award commits each party to.** This is settled first, because RFX-D4 labels every RFP price Indicative (`REQUIREMENTS.md:188`, `REQUIREMENTS.md:529`), and an award should rest on a firm offer. The options:

| Option | What an award binds | Fit with RFX-D4 |
|---|---|---|
| A. Firm-offer round, then award (recommended) | The buyer invites shortlisted suppliers to a **firm-offer round** in the RFP. Each gives firm prices for the chosen options at the quantity points, with a validity date. The award rests on those firm prices and binds PTI to place the business (via SAP) and the supplier to hold its firm offer until the validity date | Amends RFX-D4: RFP prices stay Indicative, except those given in a firm-offer round, which read Firm |
| B. Selection only | The award records the chosen supplier and option with indicative prices, and binds nothing. Firm prices still come from RFP → RFQ | No change to RFX-D4, but it is not an award in the sense the owner asked for |
| C. Award on indicative prices | The award binds PTI to prices the supplier never committed to | Contradicts RFX-D4. Not recommended |

### b. Market practice
- **RFP award is standard:** "The Award tab is available for competitive bid events (auctions), RFPs, and RFIs" (Ariba, A). Coupa awards RFP, RFI and RFQ events at line level (A).
- **Prices are firmed by rounds before award**, as in Ariba's "new round of bidding… before items are awarded" (A). No vendor documents a feature named BAFO.
- **Whether RFP prices bind at award** was not found for any vendor. Ariba's framework agreement "is not a binding contract" (A), which is the Option B shape.
- **The award leads to a PO or contract** (Ariba, A).

### c. Already built
- RFP options × quantity points, supplier-proposed options and validity (`types.ts:272-309`), and the terms comparison (`rfpScoring.ts:21-49`).
- The RFQ negotiation round with a best-and-final flag (`types.ts:375-387`), which the firm-offer round reuses.
- The award record, reason rule, CR-23 gate and supplier share view (`types.ts:391-433`, `SupplierNegotiations.tsx:263-266`).

### d. User stories
- US-RFX-04. As a buyer, I want to ask shortlisted RFP suppliers for firm prices on the options I chose, so that I can award from the RFP without re-running it as an RFQ.
- US-RFX-05. As a buyer, I want to award an RFP option to 1 or more suppliers with a recorded reason, so that the decision on a full-service request has an audit trail.
- US-RFX-06. As a supplier, I want to know when my RFP prices become a firm commitment, and until when, so that I do not commit by accident.
- US-RFX-07. As a supplier, I want to see whether my proposal was awarded, for which option and share, so that I can plan capacity.

### e. Step-by-step flow

**Buyer**
1. RFP event page, after the deadline. Compare terms, options and indicative prices (existing).
2. "Ask for firm offers". Pick the options (buyer or supplier-proposed), the quantity points, and the suppliers (only those that submitted and pass CR-23). Set a deadline and an optional message. A firm-offer round opens, and the RFP stays Closed.
3. The shortlisted suppliers are notified.
4. The round closes at its deadline or by the buyer. Firm prices show labelled **Firm** with their validity, beside the Indicative ones.
5. Award panel. Award each option to 1 or more suppliers (NR-3) at one quantity point, with a reason. Suppliers without a firm offer on that option, or failing CR-23, are refused.
6. Confirm. The RFP moves Closed → Awarded, and the award record and each responder's outcome are saved. The screen says the PO or contract is raised in SAP.
7. For options not ready, the buyer can still use "Create RFQ from this RFP" instead.

**Supplier**
1. Submits the RFP response with indicative prices (existing).
2. Receives a firm-offer request, which states: "Prices you give in this round are firm offers until the validity date you set."
3. Enters firm prices per option and quantity point, a required validity date, and optional files. Can revise until the round deadline.
4. After award, sees "Awarded: option, share, quantity point" or "Not awarded".

### f. Business rules
- NR-2 BR-01. An RFP is awarded only on firm prices from a firm-offer round of that RFP. Reason: an award binds, so it rests on a committed price (Option A). [Proposed; amends RFX-D4, D-1]
- NR-2 BR-02. A firm-offer round is open only to suppliers that submitted and pass CR-23, and only for named options and quantity points. Reason: it reuses REQ-E03-05 BR-03 and keeps the award gate. [Proposed]
- NR-2 BR-03. Firm-offer prices carry a validity date and read **Firm**. Every other RFP price still reads Indicative. Reason: RFX-D4's labels stay true on every screen. [Proposed; amends CE-10]
- NR-2 BR-04. Rounds can repeat. The last firm offer per supplier and option counts, and every version is kept. Reason: as REQ-E03-05 BR-04. [Proposed]
- NR-2 BR-05. The award is per option, at one quantity point, split under NR-3. Reason: an option is the RFP's unit of choice, as an item is the RFQ's. [Proposed]
- NR-2 BR-06. Every RFP award needs a reason. Reason: an RFP has a composite score only when it has price and lead-time terms (`rfpScoring.ts:21-49`), so "follows the best score" cannot always be tested. [Proposed]
- NR-2 BR-07. A supplier failing CR-23 at award cannot be awarded (`REQUIREMENTS.md:168`). [Owner, 2026-09-21]
- NR-2 BR-08. An awarded option cannot also go to an RFQ, and options not awarded still can. Reason: 2 routes to the same business would double-award. [Proposed]
- NR-2 BR-09. Each awarded supplier is notified of its option, share and quantity point, and every other responder of "Not awarded". Reason: as REQ-E03-05 BR-08. [Proposed]
- NR-2 BR-10. The PO or contract is created in SAP (REQ-E03-05 BR-09). [Proposed]

### g. Lifecycle and data changes
- `rfpEvent` states become Draft, Open, Closed, Awarded, Cancelled, with Awarded final. New verb `t_rfp_award` (Closed → Awarded), policy `RFP_AWARD_GOVERNED` (firm offer present, CR-23, shares valid, reason present). NR-3 adds `t_rfp_award_cancel`.
- New verbs `t_rfp_round_open` and `t_rfp_round_close`. New entity `RfpFirmOfferRound {id, rfpId, roundNumber, optionIds, quantityPoints, invitedSupplierIds, deadline, message?, closed}`.
- New `RfpFirmOffer {roundId, supplierId, prices: {optionId, qty, unitPrice}[], validUntil, documents?, submittedAt, version}` and supplier verb `t_rfpfirmoffer_submit`.
- `AwardRecord` generalised: `eventType: 'rfq' | 'rfp'`, `eventId` in place of `rfqId`, and `AwardLine.optionId` beside `itemLineNo`.
- New atoms `rfp:negotiate` and `rfp:award` in the `procurement` bundle, beside `rfq:negotiate` and `rfq:award` (`businessRoles.ts:143-160`). Supplier atom `rfpfirmoffer:submit`.

### h. Edge cases
1. Only 1 firm offer: it can be awarded, and the comparison shows "Single firm offer".
2. A firm offer's validity passes before award: it cannot be awarded, and the buyer opens a new round.
3. A supplier-proposed option is chosen: it enters the round like a buyer option, in the supplier's words.
4. A supplier fails CR-23 between the round and the award: refused at award, with the reason shown.
5. No firm offers arrive: no award is possible, and the buyer opens another round or creates an RFQ.
6. The RFP has no pricing step: award is not offered, and the page says firm prices are needed.

### i. Acceptance criteria
- NR-2 AC-01. The buyer can open a firm-offer round on a Closed RFP, only for submitted suppliers that pass CR-23.
- NR-2 AC-02. Prices from the round read Firm with their validity, and all other RFP prices still read Indicative.
- NR-2 AC-03. An award naming a supplier without a firm offer on the option is refused, naming the option.
- NR-2 AC-04. An award without a reason is refused.
- NR-2 AC-05. A successful award moves the RFP to Awarded and records option, supplier, share, quantity, quantity point and reason.
- NR-2 AC-06. After award, "Create RFQ from this RFP" is refused for an awarded option and allowed for the others.
- NR-2 AC-07. Each responder sees only its own outcome.

### j. Success metrics

| Metric | Formula | Baseline | Target [Proposed] | Answers |
|---|---|---|---|---|
| RFP decisions recorded | RFPs ending in an award or an RFQ ÷ closed RFPs | No baseline yet; RFPs have no outcome today | 90% | Charter audit trail 100% (`PRD.md:37`) |
| Events per decision | Sourcing events created per awarded full-service need | 2 (RFP plus RFQ) by construction today | 1.3 on average | Charter sourcing admin time 8 h → 1 h per week (`PRD.md:36`); KPI-06 |
| RFP cycle time | RFP publish → award, in working days | No baseline yet; KPI-06 has no target (`PRD.md:41`) | Record first; target set after 3 months | KPI-06 |
| Awards with a reason | As REQ-E03-05 metric | Existing REQ-E03-05 metric | 100% of RFP awards (BR-06) | REQ-E03-05 metric (`REQUIREMENTS.md:633`) |

### k. Dependencies and out of scope
- Depends on NR-3 for the split rules and cancel.
- Depends on section 7, D-1, because BR-01 and BR-03 amend RFX-D4.
- Out of scope: RFI award (Ariba allows it; RFX-D1 keeps the RFI non-awarding), evaluator-team scoring (BL-86), and SAP hand-off (F-09).

---

## 6. NR-3 Award to more than 1 supplier in an RFQ or RFP

### a. Problem and reason
RFX-D5 built a per-item split by percentage on tiered RFQs. 4 gaps remain:
1. The split is by % only, at one break for the whole award, and every item must be awarded (`rfqComparison.ts:420-425`).
2. Legacy RFQs award 1 supplier from the list page (`BuyerSourcing.tsx:1172-1182`), and split only the first line (`BuyerSourcingEvent.tsx:235-236`).
3. An RFP cannot be awarded (NR-2).
4. An award is permanent (`rfq.flow.ts:33`).

Dual sourcing protects packaging supply. A split that cannot follow real volumes, or be corrected, goes back to spreadsheets. That costs against the 8 h → 1 h target and the audit trail.

### b. Market practice
- **Split by % or quantity:** Ariba "split the award by percentage or quantity" (A); Oracle by quantity (A); Jaggaer "by quantity count or quantity percentages" (A, snippet).
- **Totals and partial award:** Keelvar requires shares to "equal 100" (A, snippet). Oracle leaves remaining units "not awarded" (A). Fairmarkit lets the buyer "return and award the remaining line items later" (A). Quantity tiers that differ per award line were not found for any vendor.
- **Approval and change:** Ariba approves award scenarios line by line (A); Oracle requires approval over an amount limit, and reopens an award with a recorded reason (A).
- **Notification:** Ariba can email both winners and non-winners (A). Fairmarkit tells suppliers they won "part of the event" (A). Public procurement law requires reasons to unsuccessful bidders (EU 2007/66/EC, UK Procurement Act 2023 s.50, B). That law does not bind PTI, but it shows good practice.

### c. Already built
- `AwardLine` and `AwardRecord` already hold a share, a quantity and a break per line (`types.ts:391-433`). RFX-D5 notes that the rule would change, not the data (`DECISION-GUIDE.md:221`).
- Named refusals (`rfqComparison.ts:346-438`), the reason rule (REQ-E03-05 BR-07) and the CR-23 gate.
- Split quotes marked Awarded (`BUILD-GAP.md:27`), and the supplier's own share view (`SupplierNegotiations.tsx:263-266`).

### d. User stories
- US-RFX-08. As a buyer, I want to split any item of an RFQ or RFP by quantity or percentage, and award some items now and others later, so that the award matches the volumes I agreed.
- US-RFX-09. As a buyer, I want to cancel or correct an award before it is raised in SAP, with a reason, so that a mistake is fixed on the record.
- US-RFX-10. As a supplier, I want to see my share, quantity and break per item, and be told when an award changes.

### e. Step-by-step flow

**Buyer**
1. RFQ event page or RFP award panel, after the deadline. Pick the break or quantity point per item (existing).
2. For each item or option, choose "Split by %" or "Split by quantity". Typing one derives the other.
3. Optionally set an item to "Not awarded now", and it stays open.
4. The panel checks each awarded item: 100% of its break quantity. Refusals name the item.
5. Give a reason where one is required: an item's best-scored quote gets no share, or the event is an RFP.
6. Confirm. The event becomes Awarded, or **Partly awarded** if any item is open. The buyer returns later for the open items.
7. Until the award is marked "Raised in SAP", "Cancel award" with a reason returns the event to Closed and keeps the cancelled record. A correction is a cancel followed by a new award.
8. Each change notifies the suppliers concerned.

**Supplier**
1. Sees per item: Awarded (share, quantity, break), Not awarded, or Pending.
2. After a cancel, sees "Award withdrawn" with the date, until a new award replaces it.

### f. Business rules
- NR-3 BR-01. RFQs (legacy and tiered) and RFPs can be awarded to more than 1 supplier, per item or option. Reason: one award behaviour everywhere. [Owner, REQ-E03-05 BR-06; extension Proposed]
- NR-3 BR-02. Split by percentage or by quantity. Every line stores both. Reason: this is RFX-D5's own "what would change this" case, and the data holds both (`DECISION-GUIDE.md:221`). [Proposed; D-2]
- NR-3 BR-03. Each awarded item totals its break quantity, within 1 unit, and an item may be left "Not awarded now". Reason: awarded items are fully placed, and ready items are not held back. [Proposed; amends `rfqComparison.ts:420-425`; D-4]
- NR-3 BR-04. Each item has its own break or quantity point. Reason: the cheapest supplier changes with volume, and items differ in volume. [Proposed; amends REQ-E03-05 BR-06a]
- NR-3 BR-05. A supplier can be awarded an item only at a break it priced (firm, on an RFP). [Code, extended]
- NR-3 BR-06. An event with open items is **Partly awarded**. It becomes Awarded when the last item is awarded. If the buyer marks the rest "Will not award", it becomes Awarded for the items awarded. Reason: the state tells the buyer that work remains. [Proposed]
- NR-3 BR-07. Legacy RFQs award per line on the same panel, and the list page links to it, as it does for tiered RFQs (`BuyerSourcing.tsx:3940-3957`). Reason: removes F-07. [Proposed]
- NR-3 BR-08. The reason rule (REQ-E03-05 BR-07) and CR-23 apply to every line. [Owner, 2026-09-21]
- NR-3 BR-09. An award can be cancelled with a reason until it is marked "Raised in SAP". The cancelled record is kept. Reason: closes F-04 and `REQUIREMENTS.md:617`. [Proposed; D-7]
- NR-3 BR-10. "Raised in SAP" takes the SAP document number. After it, changes happen in SAP and are noted in the hub. Reason: SAP is the system of record (REQ-E03-05 BR-09). [Proposed]
- NR-3 BR-11. Every award, cancel and SAP marking keeps who, when and why. Reason: CE-08 and the audit-trail target. [Proposed]
- NR-3 BR-12. Each supplier sees and is notified of only its own outcome and any cancellation. Reason: REQ-E03-05 BR-05 and BR-08. [Proposed]
- NR-3 BR-13. No award approval in the MVP. Procurement can separate award from evaluation by role. Reason: as CE-06; an approval by value needs a ledger this platform lacks (D-5). [Proposed]

### g. Lifecycle and data changes
- `rfq` states add **Partly awarded** (from Open or Closed on a partial award; to Awarded, or to Closed on cancel). The same state is added to `rfpEvent`.
- Awarded is no longer final until "Raised in SAP". New verbs `t_rfq_award_cancel` and `t_rfp_award_cancel` (Awarded or Partly awarded → Closed, reason required), and `t_rfq_award_sap_raised` and `t_rfp_award_sap_raised` (statePreserving, SAP number required).
- `AwardLine` gains `splitBasis: 'pct' | 'qty'`. `awardTierQty` becomes per line, not per award. RFP lines gain `optionId`.
- `AwardRecord` gains `status: 'Active' | 'Cancelled'`, `cancelledAt`, `cancelReason`, `sapRaisedAt` and `sapDocumentNo`. A cancelled record is kept, and a new record is made for the replacement.
- On cancel, the quote cascade (`MockCommandService.ts:1453-1502`) is reversed to Under Review. This needs new quotation verbs, because Awarded and Rejected are final (`quotation.flow.ts:25`).
- New atoms `rfq:award-cancel` and `rfp:award-cancel` in `procurement`.

### h. Edge cases
1. A 60,000 + 45,000 split on a 100,000 break: refused, naming the item and the 105,000 total.
2. 33.33% × 3: accepted within the 1-unit tolerance, and the remainder unit goes to the first line.
3. Item 1 awarded at the 10K break and item 2 at the 50K break: accepted (BR-04).
4. The award is already Raised in SAP: cancel is refused, naming the SAP document.
5. Open items on a Partly awarded event pass their quote validity: shown as expired, and the buyer runs a round or marks them "Will not award".
6. A legacy RFQ with 1 line: 1 item, one break equal to the total quantity.

### i. Acceptance criteria
- NR-3 AC-01. A buyer awards 1 item 60% / 40% and another by quantity 70,000 / 30,000 in one award, and both are saved with share and quantity.
- NR-3 AC-02. A split whose quantities do not total the break quantity is refused, naming the item.
- NR-3 AC-03. Awarding 2 of 3 items moves the RFQ to Partly awarded, and awarding the third later moves it to Awarded.
- NR-3 AC-04. A legacy RFQ with 2 lines can be split per line, and the list page no longer offers a single-winner award.
- NR-3 AC-05. Cancelling an award with a reason returns the RFQ to Closed, keeps the cancelled record, and returns the affected quotes to Under Review.
- NR-3 AC-06. Cancel is refused after "Raised in SAP".
- NR-3 AC-07. Each supplier sees its own outcome per item, and "Award withdrawn" after a cancel, and never another supplier's share.
- NR-3 AC-08. An RFP option splits across 2 suppliers under the same rules.

### j. Success metrics

| Metric | Formula | Baseline | Target [Proposed] | Answers |
|---|---|---|---|---|
| Split awards in the hub | Multi-supplier awards recorded in the hub ÷ multi-supplier decisions (hub plus the buyer's own sheet) | No baseline yet; ask Procurement for the count of dual-sourced items in the last quarter | 90% | Charter audit trail 100% (`PRD.md:37`); RFX-D5 purpose |
| Corrections on record | Award corrections made through cancel ÷ award corrections known (hub plus SAP changes) | 0% (no cancel verb) | 100% | Charter audit trail |
| Awards with a reason | As REQ-E03-05 metric | Existing REQ-E03-05 metric | 100% where required | REQ-E03-05 metric (`REQUIREMENTS.md:633`) |
| Negotiated saving | As REQ-E03-05: first quote − final quote | Existing REQ-E03-05 metric | Not lowered by split awards | REQ-E03-05 metric |

### k. Dependencies and out of scope
- RFP parts depend on NR-2.
- The SAP number in BR-10 is typed by the buyer until the SAP seam (F2) sends it back.
- Out of scope: award optimisation with supplier-count constraints (BL-90), an approval ladder by value (D-5), and automatic PO creation (F-09).

---

## 7. Decisions for the owner

**Ruling, 2026-09-25:** the owner accepted the recommendation on every row below. Rules tagged [Proposed] that name one of these decisions are built as written, and are recorded as owner decisions when the documents are updated (build plan task F1).

| # | Decision | Options | Recommendation | Reason | Amends |
|---|---|---|---|---|---|
| D-1 | What an RFP award binds each party to | A. Firm-offer round, then award on firm prices. B. Selection only, no binding, firm prices via RFQ. C. Award on indicative prices | A | An award should rest on a firm offer. A keeps RFX-D4's labels true (firm-offer prices read Firm), and removes the second event for full-service needs | RFX-D4, CE-10, REQ-E03-04 BR-08 (`REQUIREMENTS.md:188`, `:529`) |
| D-2 | Split by quantity as well as percentage | Keep % only; add quantity | Add quantity | Oracle and Jaggaer split by quantity, and RFX-D5's own "what would change this" names it | RFX-D5, REQ-E03-05 BR-06 |
| D-3 | File limits | 25 MB per file, 30 files per response, types in NR-1 BR-05, no ZIP [Proposed] | As proposed | Covers dielines and mold drawings; sits between Jaggaer's 50 MB and Coupa's recommended 20 to 40 files; Coupa excludes ZIP for security. A number the owner can move | New |
| D-4 | Partial award and a different break per item | One break and all items (today); per-item break and "Not awarded now" | Allow both | The cheapest supplier changes with volume per item; Fairmarkit and Oracle leave lines unawarded | REQ-E03-05 BR-06, BR-06a |
| D-5 | Approval before award | None (as CE-06); separate the award role from the evaluating buyer; approval by value | None in the MVP; separate roles where Procurement wants it | An approval by value needs the approval policy and act ledgers this platform does not have (`CLAUDE.md`, §69). A role split works today | Mirrors CE-06 |
| D-6 | Revise after submit for RFI and RFP | Keep Submitted final; allow revise until the deadline | Allow revise | Matches the RFQ and Ariba, Coupa and Jaggaer; a wrong file otherwise goes by email | `rfiResponse.flow.ts:21`, `rfpResponse.flow.ts:21` |
| D-7 | Cancel an award | Permanent (today); cancel until raised in SAP | Cancel until raised in SAP, with a reason | Closes the edge case at `REQUIREMENTS.md:617`, and Oracle reopens with a reason | REQ-E03-05 edge case |
| D-8 | Response targets in the metrics tables | The [Proposed] targets in sections 4j, 5j and 6j | Accept as starting targets, review after 3 months | No baselines exist; they need a first value to measure against | New |
| D-9 | Certificate expired at the deadline | Refuse submit; accept and flag | Accept and flag | A supplier renewing its certificate should not be locked out; the buyer sees the flag at award | New |

---

## 8. Build order

1. **NR-1 without storage** (BR-01 to BR-09, BR-12): the response-level file area on RFI and RFP, document requests, required-slot refusal, revise-after-submit. Depends on D-3 and D-6. Unblocks F-05 and most of F-02 in the session.
2. **BL-27 file storage**, then NR-1 BR-10 and AC-04 (buyer file view, ZIP download, download log). Closes F-01 and F-02 and the files-on-record metric. It needs a backend, so it sits with Stage F1.
3. **NR-3 on the RFQ**: quantity split, per-item break, partial award, legacy RFQ on the same panel, cancel and "Raised in SAP". Depends on D-2, D-4 and D-7. Closes F-04, F-06 and F-07.
4. **NR-2**: firm-offer round and RFP award on the NR-3 award model. Depends on D-1 and on step 3. Closes F-03 and F-11.
5. **Notifications outside the hub** (F-08) for invitations, deadlines, firm-offer rounds and award outcomes. It needs an email service, and so also a backend.

Steps 1, 3 and 4 need no backend and can be built on the mock stores, like the rest of the hub. Steps 2 and 5 wait on Stage F.

---

## 9. What I could not verify

- **F-02 buyer file view.** Based on a search of the buyer pages for `attachments`, not on a trace of every component a buyer page renders. A component could show quote files under another name. Confidence medium.
- **F-13 RFI and RFP intent.** A search for "intent" and "decline" in the 2 supplier pages found nothing. Intent handling could live in a shared component not imported there.
- **F-14 unattributed actor.** Taken from `CLAUDE.md`, not traced in the award record code.
- **Whether a late RFQ quote is refused.** `t_rfq_close` never fires (`rfq.flow.ts:120-137`). Whether the submit verb checks the deadline was not traced, so it is not a finding.
- **Market claims read only as snippets or through a summarising fetch:** all help.sap.com topic pages (attachment answer type, 100 MB default, approval tasks, reminders, audit log); Jaggaer and Keelvar help pages (403 or challenge); the Oracle Notify Award Decision page; the Coupa API field descriptions.
- **Ariba virus scanning.** A page titled "Enforced Anti-Virus Scanning" exists, while a KBA snippet says uploaded files are not scanned. Unresolved.
- **Not found for any vendor:** a feature named BAFO; whether RFP prices are binding at award; award quantity tiers that differ per line; a regret-letter template; a rule separating evaluators from award approvers; file locking and per-file versioning after submission.
- **GEP, Ivalua and Zycus.** Help centres are behind logins. Every claim about them is a customer guide (C) or marketing (D).
- **Fetched pages with AI-addressed text.** The Fairmarkit `.md` documentation pages contain a navigation section addressed to AI agents. It was ignored.

---

## 10. Sources

Earlier research reused: `docs/supplier-hub/research/RFX-BEST-PRACTICE-2026-09.md` (RFX research). New on 2026-09-25:

| Source | Grade |
|---|---|
| SAP Ariba Event Management guide 2605, https://help.sap.com/doc/7a3fa99980684edebfea9d6cdfe16b71/2605/en-US/EventManagement.pdf | A |
| SAP Ariba Managing Events with Guided Sourcing 2605, https://help.sap.com/doc/465e89ea0f754fb093b701458a1fe364/2605/en-US/EventMgmtGuidedSourcing.pdf | A |
| SAP Ariba RFQ and Award Integration 2608, https://help.sap.com/doc/340e884a6d3e411b867e87036bb43adf/2608/en-US/RfqAward.pdf | A |
| SAP Ariba Guided Sourcing (SS-16550), https://help.sap.com/docs/SAP_Ariba/b65c5796406c4376a64b70c0044e17b0/f802b8ae224d40429adfe886a0607cec.html | A (snippet) |
| SAP Ariba event attachments and requirements, https://help.sap.com/docs/strategic-sourcing/event-management/about-event-attachments-and-requirements-5bf2ea6724fd44488df9013e676c869a | A (snippet) |
| SAP Ariba file size limit, https://help.sap.com/docs/ariba/f5681fbd739744be88f4f5e8f8a49ead/1b6d484a342042208bca16b3571d4188.html | A (snippet) |
| SAP Ariba anti-virus scanning, https://help.sap.com/docs/PRODUCTS/978b7e36451a4c2c85321a3ef6f3a7e5/485da9ff0b774e5a9cd885893696b327.html | A (title only) |
| SAP Ariba event reminder messages, https://help.sap.com/docs/strategic-sourcing/event-rules-reference/event-reminder-messages | A (snippet) |
| SAP Ariba tasks in Guided Sourcing projects, https://help.sap.com/docs/strategic-sourcing/managing-events-with-guided-sourcing/tasks-in-guided-sourcing-projects | A (snippet) |
| SAP Ariba bid analysis, https://help.sap.com/docs/ARIBA_SOURCING/f8c5d42a08224649ba69b52fd19f049a/ef8e3f37fbdf46a49be06e90a73f37cc.html | A (snippet) |
| SAP Learning, monitoring events, https://learning.sap.com/courses/project-monitoring-and-event-administration-within-sap-ariba-guided-sourcing/monitoring-events-and-reviewing-bids | A |
| SAP Learning, event audit logs, https://learning.sap.com/learning-journeys/introducing-sap-ariba-guided-sourcing-projects/reviewing-guided-sourcing-event-audit-logs | A (snippet) |
| SAP Community, sourcing event ZIP export, https://community.sap.com/t5/spend-management-q-a/sourcing-event-file-zip-export/qaq-p/12687415 | C (snippet) |
| Gerresheimer Ariba supplier guide, https://www.gerresheimer.com/fileadmin/user_upload/user_upload/landingpages/gx-ariba/GX_Ariba_Supplier_Sourcing_Documentation_V1.pdf | C |
| PSO Ariba supplier guide, https://psopk.com/files/business_partner/sap_ariba/pso_suppliers_guide_respond_to_events_in_sap_ariba.pdf | C |
| Hydro One Ariba supplier guide, https://www.hydroone.com/abouthydroone/Suppliers_/Documents/Hydro%20One%20-%20User%20Guide%20-%20Responding%20To%20A%20Sourcing%20Event.pdf | C |
| Oracle, how you award negotiations, https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/how-you-award-negotiations.html | A |
| Oracle, strategies to award, https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/strategies-to-award-negotiations.html | A |
| Oracle, document and award approvals, https://docs.oracle.com/en/cloud/saas/procurement/26a/oaprc/document-and-award-approvals.html | A |
| Oracle, reopen award decision, https://docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/how-you-reopen-award-decision-after-negotiation-is-completed.html | A |
| Oracle, notify award decision, https://docs.oracle.com/en/cloud/saas/procurement/25b/faspp/notfy-award-decision.html | A (snippet) |
| Oracle 26B What's New (award outcome), https://docs.oracle.com/en/cloud/saas/readiness/scm/26b/proc26b/26B-procurement-wn-f42961.htm | A |
| Oracle 26A What's New (split award, sealed timeline), https://docs.oracle.com/en/cloud/saas/readiness/scm/26a/proc26a/26A-procurement-wn-f41762.htm and https://docs.oracle.com/en/cloud/saas/readiness/scm/26a/proc26a/26A-procurement-wn-f41776.htm | A |
| Oracle 25C What's New (line attachments), https://docs.oracle.com/en/cloud/saas/readiness/scm/25c/proc25c/25C-procurement-wn-f38365.htm | A |
| Oracle 26C What's New (response versions), https://docs.oracle.com/en/cloud/saas/readiness/scm/26c/proc26c/26C-procurement-wn-f46455.htm | A |
| Oracle Redwood supplier sourcing, https://docs.oracle.com/en/cloud/saas/readiness/common/rrdem/redwood-use-new-supplier-experience-for-sourcing.html | A |
| Oracle negotiation amendments, https://docs.oracle.com/en/cloud/saas/procurement/25d/oaprc/negotiation-amendments.html | A |
| Oracle monitor supplier activities, https://docs.oracle.com/en/cloud/saas/procurement/25d/oaprc/monitor-supplier-activities.html | A |
| Oracle new round, https://docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/initiate-a-new-round-of-response.html | A |
| Oracle sourcing approvals setup, https://docs.oracle.com/en/cloud/saas/procurement/26a/oapro/oracle-sourcing-approvals-setup.html | A |
| Coupa Sourcing API, https://compass.coupa.com/en-us/products/product-documentation/integration-technical-documentation/the-coupa-core-api/resources/transactional-resources/sourcing-api-(quote_requests) | A |
| Coupa quote request attachment API, https://compass.coupa.com/_dita_/en-us/documentation/plat/integ/coupa_core_api/topics/quote_request_attachment_api.dita | A |
| Coupa supplier sourcing FAQ, https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/coupa-supplier-portal/set-up-the-csp/sourcing/sourcing-faq | A |
| Coupa participate in a sourcing event, https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/coupa-supplier-portal/set-up-the-csp/sourcing/participate-in-a-sourcing-event | A |
| Coupa event status for suppliers, https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/coupa-supplier-portal/set-up-the-csp/sourcing/sourcing-event-status-for-suppliers | A |
| Coupa glossary A and S, https://docs.coupa.com/en/coupa-glossary/overview/a and https://docs.coupa.com/en/coupa-glossary/overview/s | A |
| Coupa event types, https://docs.coupa.com/en/supplier-documentation/coupa-for-suppliers/the-coupa-supplier-portal-or-csp/features-and-processes-in-the-coupa-supplier-portal/sourcing/sourcing-events-types-for-suppliers | A |
| AstraZeneca Coupa supplier guide, https://www.astrazeneca.com/content/dam/az/Partnering/supplier/pdf/Suppliers_Guide_to_AZ_Sourcing_Events_in_Coupa_S2C_ENG.pdf | C |
| Jaggaer split award options, https://solutions.sciquest.com/sshelp/en/General/Content/Indirect/Sourcing/Evaluation/Split%20Awarding.htm | A (snippet) |
| Jaggaer award scenarios, https://solutions.sciquest.com/sshelp/en/General/Content/Indirect/Sourcing/Evaluation/Award%20Scenarios.htm | A (snippet) |
| Jaggaer supplier guide (Ships for Canada), https://shipsforcanada.ca/images/uploads/Jaggaer-Supplier-Guide-v1.1.pdf | C |
| Jaggaer supplier handbook (Legal Aid), https://legalaid.ukp.app.jaggaer.com/web/docs/JA_Supplier_Handbook.pdf | C |
| Pennsylvania DGS Jaggaer guides, https://www.pa.gov/content/dam/copapwp-pagov/en/dgs/documents/documents/itq-documents/helpful-information/responding%20to%20an%20amended%20event%20in%20jaggaer.pdf | C |
| GEP SMART supplier FAQ (Petronas), https://www.petronas.com/sites/default/files/uploads/content/2024/GEP%20SMART%20Supplier%20FAQ.pdf | C |
| GEP SMART RFx guidance (Roche), https://assets.roche.com/f/325925/x/567e9f172b/mybuy-rfx-guidance-for-suppliers.pdf | C |
| Ivalua supplier portal guide (Hikma), https://www.hikma.com/media/rc1c4y3j/hikma-ivalua-supplier-portal_v3.pdf | C |
| Zycus supplier portal guide (Victoria), https://www.vic.gov.au/sites/default/files/2023-09/ZSN-Supplier-Portal-navigation-guide-v10-(1)-.pdf | C |
| Keelvar split awards, https://support.keelvar.com/hc/en-us/articles/360014353180-Configuring-split-awards | A (snippet) |
| Fairmarkit award an event, https://docs.fairmarkit.com/buyers/events/award-an-event.md | A |
| Fairmarkit review and award an RFQ, https://docs.fairmarkit.com/buyers/request-for-quote-rfq/review-and-award-a-request-for-quote-event.md | A |
| Fairmarkit bid analysis blog, https://www.fairmarkit.com/blog/bid-analysis-transformed-how-agentic-ai-is-dramatically-reducing-cycle-times | D |
| SAP News, Joule supplier-response summary, https://news.sap.com/2025/10/sap-connect-spend-management-procurement/ | D |
| UK Procurement Act 2023 s.50, https://www.legislation.gov.uk/ukpga/2023/54/section/50/enacted | B |
| EU Remedies Directive 2007/66/EC, https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32007L0066 | B (snippet) |
