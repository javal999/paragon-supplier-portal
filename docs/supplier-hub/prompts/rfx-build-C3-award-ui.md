# Prompt: RFx C3 · Award panel for every RFQ, cancel and SAP marking, supplier per-item outcome

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with tasks C1 and C2 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3 · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- 1 award panel serves tiered and legacy RFQs, built by extending `TieredAwardForm`.
- The RFQ list page links to the event-page award for every RFQ, as it already does for tiered ones.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read finding AR-03 in `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`, and, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, NR-3 buyer steps 1 to 8, supplier steps 1 and 2, BR-07, and AC-01 to AC-07.

Then read these files:
- `src/pages-v2/rfx/TieredRfq.tsx` (`TieredAwardForm` :527-600)
- `src/pages-v2/BuyerSourcingEvent.tsx` (award section :794-980, legacy form :885-980)
- `src/pages-v2/BuyerSourcing.tsx` (`handleAward` :1172-1195, panels :3940-4010)
- `src/services/query/commandHooks.ts` (`useRfqAward` :616-633, the `award` branch of `useRfxCommand` :2714-2722)
- `src/pages-v2/SupplierNegotiations.tsx:240-270`
- The C1 and C2 verbs and read model
- `src/pages-v2/rfx/TieredRfqEvent.test.tsx`

## OBJECTIVE

Make 1 award panel on the RFQ event page for every RFQ, with split by % or quantity, a break per item, "Not awarded now", "Will not award", cancel with a reason and "Raised in SAP". Remove the single-winner award path, and show suppliers their outcome per item.

## STANDARD

Buyer panel
- Per item:
  - a break select
  - a "Split by %" or "Split by quantity" toggle
  - 1 input per qualifying supplier, with the derived side shown read-only
  - a "Not awarded now" option

  Refusals from `awardShapeRefusal` show inline, naming the item. Confirm dispatches `award` or `awardPartial` through `useRfxCommand`, chosen by whether any item stays open. A "Will not award" choice on open items is available on the final award. [NR-3 BR-02 to BR-07, RFX-R2]
- Render the legacy RFQ through the same panel, and delete the legacy form (`BuyerSourcingEvent.tsx:885-980`). [NR-3 BR-07, AR-04]
- Delete `useRfqAward` and the list page's `handleAward`. The list-page side panel shows the award link for every RFQ that can be awarded, using the tiered pattern at `BuyerSourcing.tsx:3940-3957`. [AR-03]
- The recorded-award view lists each award with its status (Active, Cancelled, Raised in SAP). "Cancel award" needs a reason. "Mark raised in SAP" needs the SAP document number. Each is shown only to a seat holding its atom, through the existing handoff pattern (`useVerbAvailability`). [NR-3 BR-09, BR-10]

Supplier outcome
- `SupplierNegotiations.tsx` shows per item: Awarded (share, quantity, break), Not awarded, Pending (item still open), or Award withdrawn (with date). [NR-3 BR-12, supplier steps 1 and 2]

UI rules and strings
- Extract per-item rows to keep JSX nesting at 6 levels or fewer. Use `Button variant="outline"` for Confirm, and `secondary` for Cancel and Close. Add every string to EN and ID. [FE-CMP-4, RFX-R6, RFX-R7]

## CONSTRAINTS

- Out of scope: RFP screens (D3), award approval (D-5), and email notification.
- Keep the comparison view, the evaluation-break selector and the CSV export unchanged.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/pages-v2/rfx/TieredRfqEvent.test.tsx` gains these cases:
  - a 70,000 / 30,000 quantity split on item 1 with item 2 at 60/40, dispatched and shown (AC-01)
  - item 3 left open, which gives Partly awarded (AC-03)
  - a mismatched quantity total shows `AWARD_SPLIT_INCOMPLETE` naming the item (AC-02)
  - cancel with a reason returns the panel to awardable (AC-05)
  - cancel absent after "Raised in SAP" (AC-06)
- `src/pages-v2/BuyerSourcing.test.tsx` asserts that a legacy RFQ's side panel offers the event-page award link and no single-winner award (AC-04).
- `src/pages-v2/RfxManagement.test.tsx` asserts that the supplier sees Pending for an open item and "Award withdrawn" after a cancel (AC-07).
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the panel, remove the old path, run the gates and open the PR now.

---

## Notes on design decisions

- Removing `useRfqAward` is part of the task, not a follow-up. As long as it exists, a legacy RFQ can bypass every split rule (AR-03, requirements F-07).
- Cancel and SAP marking sit behind the handoff pattern, because `CLAUDE.md` §84 makes the entrance the unit of coverage.
- The button variants are named because `CLAUDE.md` retired solid buttons and enforces it by type. An agent reaching for `primary` would fail `tsc`.
