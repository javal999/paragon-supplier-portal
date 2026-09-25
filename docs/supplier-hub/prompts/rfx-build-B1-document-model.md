# Prompt: RFx B1 · Document requests and response documents (model, verbs, rules)

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with task A2 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- This task is data, verbs and rules only. Screens come in B3, B4 and B5.
- On a quotation, the existing `attachments` field stays readable as "other documents" through 1 adapter function. New uploads go to `documents`.
- A certificate that has expired is flagged when it is read, from the clock. Its status is never stored (`CLAUDE.md`, law 0.5).
- Decisions D-3 and D-9 are accepted (owner, 2026-09-25).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, section 4 (NR-1), especially rules BR-01 to BR-07 and BR-11 and edge cases 1 to 6.

Then read these files:
- `src/services/sourcing/types.ts`: `RfiAnswer` :114, `RfiEvent` :169, `RfiResponse` :202, `RfpEvent` :323, `RfpResponse` :353
- `src/services/sourcing/rfqModel.ts`: `AttachmentMeta` :77, quotation tiered fields :216
- The RFI and RFP targets and their content helpers `rfiContentOf` and `rfpContentOf` in `MockCommandService.ts` (:2834-3170), plus `rfxAuthoringRefusal` (:3408)
- The quotation target (:1591-1698) and the RFQ create and revise path
- `src/services/sourcing/rfxTemplates.ts`, `src/services/sourcing/rfxPrefill.ts`
- `src/services/attachments/fileRules.ts` (from A2)
- `rfxReadModel.ts` :209-268

## OBJECTIVE

Add buyer document requests to RFI, RFP and RFQ events, and supplier response documents to RFI and RFP responses and to quotations, with the authoring, submit and limit refusals enforced by the existing verbs.

## STANDARD

Model
- Add to `types.ts`:
  - `DocumentType`: Certificate, Specification, Drawing, Sample photo, Quotation, Company profile, Other.
  - `DocumentRequest {id, name, type, required, itemLineNo?}`, where `itemLineNo` is allowed on RFQs only.
  - `ResponseDocument {id, requestId?, attachment: AttachmentMeta, uploadedAt, certificate?: {number, issuer, expiresOn}}`.

  Add optional `documentRequests` to `RfiEvent`, `RfpEvent` and the RFQ authoring fields. Add optional `documents` to `RfiResponse`, `RfpResponse` and the quotation. Add `documentsOf(quotation)`, which returns the quotation's `documents` plus its legacy `attachments` as documents with no request, and use it everywhere a quotation's files are read. [NR-1 BR-01, BR-02, RFX-R9]

Authoring
- Carry `documentRequests` through create, revise-draft, save-as-template and copy for all 3 event types, and through RFI → RFP, RFI → RFQ and RFP → RFQ pre-fill. Copy the buyer's requests. Never copy a supplier's documents. [NR-1 BR-11]
- Add `documentRequestsRefusal` to the authoring rules, and call it from the create and revise-draft policies. It returns `DOCUMENT_REQUEST_INVALID`, naming the request, for a blank name, a duplicate name within the event, or an `itemLineNo` that is not an item of the RFQ. [RFX-R2]

Submit rules
- Add `responseDocumentsRefusal(requests, documents, filesAlready)` as a pure function, and call it from the RFI response submit, RFP response submit and quotation submit policies. It returns, in this order:
  - `DOCUMENT_REQUEST_UNKNOWN`: a document names a request the event does not have
  - `DOCUMENT_REQUIRED_MISSING`: names the request
  - `CERTIFICATE_FIELDS_MISSING`: a Certificate document without its number, issuer or expiry date
  - the A2 `fileLimitRefusal` codes

  Saving a draft checks only the limits. [NR-1 BR-03, BR-04, BR-05; RFX-R2]
- Add `certificateExpired(doc, deadline)` as a read-side function that never refuses. [NR-1 BR-04]

Reads
- A supplier reads only its own `documents`. The buyer reads documents of Submitted responses only. Confidential events hide `documentRequests` from a supplier who has not accepted, the same way `questions` are hidden today. Extend the `useRfxCommand` `answerRfi` and `answerRfp` payloads, and the quotation submit payload, to carry `documents`. [RFX-R1, RFX-R4, NR-1 BR-06, BR-07]

## CONSTRAINTS

- Out of scope: any screen or wizard step (B3, B4, B5), revising after submit (B2), version history (B2), the download log (B5), and real storage.
- Existing seeded events and responses have no requests or documents. Keep them valid without touching the seeds.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/services/transitions/rfxDocumentRules.test.ts` fires and passes each refusal code named above.
- `src/services/data/mock/rfxDocumentsCommand.test.ts` covers these cases:
  - an RFP with 1 required Certificate request refuses submit without it, and accepts submit with number, issuer, expiry and a file
  - a supplier cannot read another supplier's documents
  - the buyer cannot read documents of a Draft response
  - RFP → RFQ pre-fill copies the requests and not the documents
  - saving a template keeps the requests
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the model, rules, verbs and tests, run the gates and open the PR now.

---

## Notes on design decisions

- B1 is the data layer, so B3, B4 and B5 can run in parallel on top of it without each redefining the model.
- `documentsOf` keeps today's quotation files visible without a data migration. The mock seeds are fixtures, and rewriting them is churn.
- The refusal order puts structural errors first, so a supplier fixes the cause before the detail.
- An expired certificate is flagged when read, because a stored status would decay with the clock (law 0.5 in `CLAUDE.md`).
