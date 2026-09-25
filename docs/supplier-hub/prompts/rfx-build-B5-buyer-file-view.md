# Prompt: RFx B5 · Buyer "Supplier documents" view, comparison row and download log

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with task B1 merged. B2 and B4 are not required. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3 · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- The download log lives in the file service, not a lifecycle verb. A download is an access record, not a state change.
- "Download all" as a ZIP waits for BL-27. It is not shown, so no control promises what it cannot do.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, NR-1 buyer steps 3, 5 and 6, BR-04, BR-06, BR-10, BR-12, AC-04 and AC-08, and findings F-01 and F-02.

Then read these files:
- `src/pages-v2/BuyerRfi.tsx` (event files at :355-360)
- `src/pages-v2/BuyerRfp.tsx` (:293-298, and the comparison at :552-580)
- `src/pages-v2/BuyerSourcingEvent.tsx`
- The tiered comparison in `src/pages-v2/rfx/TieredRfq.tsx`
- `src/pages-v2/rfx/rfxAuthoringDisplay.tsx:84-89`
- The file service from A2
- `documentsOf` and `certificateExpired` from B1

## OBJECTIVE

Give the buyer 1 place per event to open every supplier file, a documents-complete row in each comparison, and a recorded log of each download.

## STANDARD

- Add `recordAccess(fileId: string, by: ActorAttribution): void` and `accessLog(fileId: string): readonly FileAccess[]` to `IFileService`. The log is appended and never edited. Document both methods in `docs/contracts/C1-methods.md`. [RFX-R3, RFX-R5, NR-1 BR-10]
- Build `SupplierDocumentsPanel` in `src/pages-v2/rfx/`. For 1 event it lists each supplier with its files: request, file name, type, size, uploaded at, version (when B2 is present), certificate number and expiry with an "Expired" flag from `certificateExpired`, and "Opened by" from the access log. Opening or downloading calls `recordAccess`. A file the session no longer holds shows the session-only note instead of a link. [NR-1 BR-04, BR-12]
- Show the panel on the RFI and RFP detail and on the RFQ event page, for submitted responses only. [RFX-R4, NR-1 BR-07]
- Add a "Documents" row per supplier to the RFQ comparison (`TieredRfq.tsx`) and the RFP comparison (`BuyerRfp.tsx:552-580`), reading "Complete" or "Missing: <request names>" against the required requests. [NR-1 buyer step 6]
- Replace the comma-joined names at `rfxAuthoringDisplay.tsx:84-89` with links through the same open action. [F-02]
- Add every string to EN and ID. [RFX-R6]

## CONSTRAINTS

- Out of scope: ZIP download, real storage, supplier screens (B4), and download logs for buyer-uploaded event files.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/pages-v2/rfx/SupplierDocumentsPanel.test.tsx` covers these cases:
  - a submitted RFP response with a Certificate shows its number and the Expired flag when the expiry is before the deadline
  - opening a file adds 1 access log entry
  - a Draft response's files do not appear
  - a file not held shows the session-only note
- The tiered comparison test asserts "Missing: Halal certificate" for a supplier without that required document.
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the panel, the comparison row and the access log, run the gates and open the PR now.

---

## Notes on design decisions

- The access log sits on the file service because a download changes no lifecycle state. A verb and flow for it would add process-flow noise for no rule.
- No ZIP control is shown until BL-27. `CLAUDE.md` treats a control that cannot do what it says as a defect.
- This closes F-02 in the session. F-01 (bytes lost on reload) stays until BL-27.
