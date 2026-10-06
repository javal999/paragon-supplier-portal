# Prompt: Material C3 · One material search

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with C2 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MR-3 BR-04 is accepted:
  - match case-insensitively, ignoring accents, punctuation and extra spaces
  - every word must match, in any order
  - 1 typo is allowed in words of 5 or more characters
- No search library is added (MAT-R9). A small edit-distance function is enough.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the requirements: MR-3 BR-04, the search flow in section d, AC-02 and AC-04.

Then read these files:
- `src/pages-v2/BuyerInventory.tsx:78-87` (the `includes()` filter) and the `SearchBar` component
- `StockEntryPanel.tsx:192-204` (the material `<select>`)
- `SupplierShipments.tsx`: the ASN line material field
- the call-off list pages (`BuyerCallOffs.tsx`, `SupplierCallOffs.tsx`) and `BuyerAlerts.tsx`
- C2's `materialNamesFor` and `approvedNameFor`

## OBJECTIVE

Replace the separate material filters with one search that matches PTI code, PTI description and approved trade names, and says which one matched.

## STANDARD

Rule
- Pure `matchMaterial(query, entry, names)` → `{rank, matchedOn: 'code' | 'description' | 'tradeName', tradeName?, supplierId?} | null`.
- Rank order: exact code first, then full-word matches, then typo matches.
- Only approved names are searched. A supplier's search sees only its own names (MAT-R4).

Component
- `MaterialSearch` in `src/components/ui-v2/`, in 2 modes: list filter and picker.
- It shows the match reason, e.g. "matched trade name 'Emulsense 200' (PT Example)".

Use it on
- the inventory list (PTI and supplier)
- the stock entry material picker
- the ASN line material field
- the call-off lists
- the alert list

MR-5 and MR-7 add their own pages later, and those use the same component.

Strings
- EN and ID for every string.

## CONSTRAINTS

- Do not change filter state kept in page addresses. Keep the existing query parameter names.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `matchMaterial.test.ts` covers:
  - "emulsens 200" finds "Emulsense 200" (AC-04)
  - word order does not matter
  - an unapproved name is not matched (AC-02)
  - exact code ranks first
  - a supplier's search never matches another supplier's name
- 1 page test per surface shows a trade-name match.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the rule, component, wiring and tests, run the gates and open the PR now.
