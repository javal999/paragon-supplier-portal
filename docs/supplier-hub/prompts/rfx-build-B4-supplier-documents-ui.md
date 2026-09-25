# Prompt: RFx B4 · Supplier "Documents" section and "Revise response"

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with tasks B1 and B2 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3 · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- 1 shared section component serves the RFI form, the RFP form, and both RFQ quote forms (tiered and legacy).
- On the RFQ quote forms, the existing file area becomes the section's "Other documents" area.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read the NR-1 supplier steps 1 to 6, BR-03 to BR-05, BR-08 and edge cases 1 and 3 in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`.

Then read these files:
- `src/pages-v2/SupplierRfi.tsx` (send at :94-104)
- `src/pages-v2/SupplierRfp.tsx` (send at :120-133)
- `src/pages-v2/rfqs/TieredQuoteForm.tsx` (:448-453)
- `src/pages-v2/SupplierRFQs.tsx` (:1693-1698)
- `src/components/ui-v2/SessionAttachments.tsx`
- `src/services/attachments/fileRules.ts`
- The B1 `responseDocumentsRefusal`
- The B2 `reviseRfiResponse` and `reviseRfpResponse` verbs
- `src/pages-v2/RfxManagement.test.tsx` and `src/pages-v2/rfqs/SupplierRfqResponse.test.tsx`

## OBJECTIVE

Add a "Documents" section to the supplier's RFI, RFP and RFQ response forms, and a "Revise response" action on submitted RFI and RFP responses before the deadline.

## STANDARD

- Build `ResponseDocumentsSection` in `src/pages-v2/rfx/`. It shows 1 slot per document request, marked required or optional, with a Certificate slot adding number, issuer and expiry date fields. An "Other documents" area follows. Upload through `SessionAttachments`. [NR-1 BR-01 to BR-04]
- Pre-check each picked file with `fileLimitRefusal`, and the whole section with `responseDocumentsRefusal`, showing the refusal by slot. These are the same functions the verbs call. [RFX-R2, NR-1 BR-05]
- Replace the file areas at `TieredQuoteForm.tsx:448-453` and `SupplierRFQs.tsx:1693-1698` with the section, and add it to the RFI and RFP forms. Send `documents` in each form's existing dispatch. [RFX-R1]
- On a submitted RFI or RFP response before the deadline, show "Revise response". It re-opens the form on the latest version and dispatches the revise verb. After the deadline, show the response and its files read-only. Show the version number and when it was submitted. [NR-1 BR-08, supplier steps 5 and 6]
- Keep JSX nesting at 6 levels or fewer by extracting slot and certificate sub-components. Add every string to EN and ID. [FE-CMP-4, RFX-R6, RFX-R7]

## CONSTRAINTS

- Out of scope: the buyer side (B5), the negotiation round form, and firm offers (D3). They reuse this section later.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/pages-v2/rfx/ResponseDocumentsSection.test.tsx` covers a required slot blocking submit with the slot named, the certificate fields required, and a 26 MB file refused on pick.
- `src/pages-v2/RfxManagement.test.tsx` gains 2 cases:
  - a supplier submits an RFP with a document, then revises it before the deadline, and sees version 2
  - after the deadline the form is read-only and "Revise response" is absent
- The RFQ quote form tests still pass with the section in place of the old file area.
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the section and the revise action, run the gates and open the PR now.

---

## Notes on design decisions

- 1 component across the 4 forms keeps the rules identical wherever a supplier uploads.
- The RFQ quote forms lose their plain file area to the section, so there is 1 file experience rather than 2 side by side.
- "Revise response" is hidden after the deadline, not disabled, and the verb refuses anyway. That follows the `CLAUDE.md` rule that the entrance is the unit (§84).
