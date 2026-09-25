# Prompt: RFx D3 · RFP screens for firm-offer rounds and award

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with tasks C3 and D2 merged (B4 too, if firm offers should carry files). No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3 · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- The RFP award panel reuses the C3 award panel with RFP items (options at quantity points).
- Firm offers use the B4 documents section for files when B4 is merged. Otherwise the files part is skipped and the report says so.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, NR-2 buyer steps 1 to 7, supplier steps 1 to 4, BR-03, BR-08, BR-09, edge cases 1 and 6, and AC-01 to AC-07.

Then read these files:
- `src/pages-v2/BuyerRfp.tsx` (comparison :552-580, "Create RFQ from this RFP" :431-456)
- `src/pages-v2/SupplierRfp.tsx`
- The C3 award panel and supplier outcome view
- The D1 and D2 verbs and reads
- `src/pages-v2/RfxManagement.test.tsx` and `src/pages-v2/rfx/RfpToRfqPolish.test.tsx`

## OBJECTIVE

Add the buyer's "Ask for firm offers" round and RFP award panel to the RFP page, and the supplier's firm-offer form and award outcome to the supplier RFP page.

## STANDARD

Buyer
- On a Closed RFP, "Ask for firm offers" opens a form that picks options (buyer and supplier-proposed), quantity points, qualifying suppliers (failing ones listed with the reason and not selectable), a deadline and a message. It dispatches `openRfpRound`. Show open and closed rounds with their deadline, and a "Close round" action. [NR-2 buyer steps 2 to 4]
- In the RFP comparison, show firm-offer prices labelled **Firm** with their validity, beside indicative prices labelled Indicative. Show "Single firm offer" when only 1 supplier offered on an option. [NR-2 BR-03, edge case 1]
- Render the C3 award panel for RFP items, with the reason field always required. Hide "Create RFQ from this RFP" for options with an active award, while the others stay available. Show no award action when the RFP has no pricing step, and say that firm prices are needed. [NR-2 BR-06, BR-08, edge case 6]

Supplier
- On a firm-offer request, show the text "Prices you give in this round are firm offers until the validity date you set." Then show a price grid of option by quantity point, a required validity date, and, if B4 is merged, the documents section. Dispatch `submitFirmOffer` or `reviseFirmOffer` until the round deadline, and show the result read-only after it. [NR-2 supplier steps 2 and 3]
- Show the award outcome per option: Awarded (share, quantity point), Not awarded, Pending or Award withdrawn. [NR-2 BR-09]

UI rules and strings
- Keep JSX nesting at 6 levels or fewer. Use outline buttons for primary actions. Add every string to EN and ID. [FE-CMP-4, RFX-R6, RFX-R7]

## CONSTRAINTS

- Out of scope: email, RFI award, and changes to the RFQ award panel beyond the RFP item input it needs.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/pages-v2/RfxManagement.test.tsx` gains 4 cases:
  - the buyer opens a firm-offer round, and a failing supplier cannot be selected
  - the supplier submits a firm offer and sees it labelled Firm with its validity
  - the buyer awards option 1 at 60/40 and the RFP shows Awarded, with "Create RFQ" hidden for option 1 and shown for option 2
  - the supplier sees its share on option 1
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the RFP screens, run the gates and open the PR now.

---

## Notes on design decisions

- The award panel is shared with C3, so a buyer awards an RFP option exactly as an RFQ item.
- The firm-offer wording is quoted from the requirements, because it is what tells a supplier the price now binds.
- The files part depends on B4 but does not block on it, so the 2 lanes stay independent.
