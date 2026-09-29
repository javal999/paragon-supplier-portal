# Prompt: Material C1 · Stock template marks optional columns

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D4 is accepted (owner, 2026-09-29):
  - column E (in-production quantity) is required, and 0 is allowed
  - column F (completion date) is required when E > 0
  - column D (supplier ROP) stays optional
- The same rule applies to the manual entry form, because both channels share fields (REQ-E08-02 BR-09).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the requirements: MR-4, and MAT-D4 in section 13.2.

Then read these files:
- `inventoryRules.ts:435-508` (`STOCK_TEMPLATE_FIELDS`, `stockTemplateCsv`)
- `inventoryRules.ts:554-747` (`StockRowRefusal`, `validateStockRows`)
- `src/pages-v2/inventory/StockUploadPanel.tsx` and `StockEntryPanel.tsx`
- `src/lib/i18n/inventoryCapacity.ts:108` (`inv.upload.subtitle`)

## OBJECTIVE

Make the template and the upload panel say which columns are required and which are optional. Make in-production quantity required, so the simulation can tell "none" from "not reported".

## STANDARD

Template
- Every optional header ends with " (optional)" in EN or " (opsional)" in ID. [MR-4 BR-01]
- The parser strips either suffix before matching, so files downloaded before this change still upload. [MR-4 BR-02]

Rule
- E is required, and 0 is allowed.
- F is required when E > 0.
- New refusal `productionDateMissing`, with EN and ID text.
- The manual form uses the same validation function (MAT-R2).

Panel
- A table of columns A to J: name, Required or Optional, and a one-line meaning.
- It includes the batch note: "Fill G to J only when your batches expire at different times; if you fill one, fill all 4 for that row." [MR-4 BR-03]

Strings
- EN and ID for every string.

## CONSTRAINTS

- Out of scope: new columns, and trade names in the template.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - a freshly built template marks D and G to J optional (AC-01)
  - a header without the suffix still matches (AC-02)
  - blank E is refused
  - E = 0 with blank F passes
  - E = 50 with blank F is refused `productionDateMissing`
  - the manual form refuses the same row
  - the panel lists every column (AC-03)
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Change the template, rule, panel and tests, run the gates and open the PR now.
