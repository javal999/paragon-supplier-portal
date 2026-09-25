# Prompt: RFx B3 · "Documents from suppliers" step in the RFI, RFP and RFQ wizards

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with task B1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3 · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- 1 shared editor component serves the 3 wizards.
- The step sits just before each wizard's review step.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read NR-1 buyer steps 1 and 2, BR-02 and edge case 2 in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`.

Then read these files:
- The RFI and RFP create wizards in `src/pages-v2/rfx/`, and the RFQ wizard in `src/pages-v2/sourcing/`
- Their tests (`src/pages-v2/rfx/RfiCreate*.test.tsx`, `RfpCreate*.test.tsx`, `RfxEditDraft*.test.tsx`, and the RFQ authoring tests)
- `DocumentRequest` and `documentRequestsRefusal` from task B1
- `src/lib/i18n/rfxAuthoring.ts`

Match the nearest existing wizard step, for example the questions or options step, in layout, validation display and test style.

## OBJECTIVE

Add a "Documents from suppliers" step to the RFI, RFP and RFQ create wizards, so the buyer can add, edit and remove document requests, see them on the review step, and keep them through edit-draft and save-as-template.

## STANDARD

- Build 1 component, `DocumentRequestsEditor`, in `src/pages-v2/rfx/`. Each row has a name, a type select from `DocumentType`, and a required checkbox. On the RFQ only, a level select offers "Whole response" or an item. Rows can be added and removed. Rows use stable ids as keys. [FE-CMP-5, RFX-R7]
- Show `documentRequestsRefusal` inline, naming the row, and block "Next" while it refuses. It is the same function the create verb calls. [RFX-R2]
- On the review step, list the requests with type and required mark. Edit-draft re-opens the wizard with them filled in. [NR-1 BR-02]
- Add every label, option and message to both `rfxAuthoringEn` and `rfxAuthoringId`. [RFX-R6]

## CONSTRAINTS

- Out of scope: the supplier side (B4), the buyer file view (B5), and adding requests to an event that has been sent (BL-92).
- Keep the other wizard steps and their order unchanged.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/pages-v2/rfx/DocumentRequestsEditor.test.tsx` covers adding 2 rows, marking 1 required, removing 1, and the duplicate-name refusal showing and blocking.
- 1 wizard test per event type (in the existing wizard test files) creates an event with a required Certificate request, and asserts that the dispatched payload carries it and that the review step shows it.
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the step, wire it into the 3 wizards, run the gates and open the PR now.

---

## Notes on design decisions

- 1 shared editor keeps the 3 wizards from drifting, which is the risk RFX-D1 accepted by splitting the modules.
- The inline check reuses the verb's own rule, so the step can never accept a request the verb refuses.
- The level select appears only on the RFQ, because only RFQs have items (NR-1 BR-02).
