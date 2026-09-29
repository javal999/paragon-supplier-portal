# Prompt: Material G1 · Vendor qualification from documents

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with A1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- A-12, MAT-D14 and MAT-D15 are accepted (owner, 2026-09-29):
  - 1 level per vendor
  - Procurement and Quality set the lists; until they do, placeholder lists apply, labelled
  - enforcement stays on with placeholders (plan AD-8)
- The placeholder lists follow requirements section 13.2, MAT-D15:
  - Approved: Tax & Legal (NIB and NPWP), and a halal certificate for materials in scope
  - Preferred: Approved plus Quality (GMP/ISO 22716 or ISO 9001), and BPOM where applicable
- The expiry warning uses the documents' own window (`DOCUMENT_EXPIRING_WINDOW_DAYS`, 180 days), not the 90 days in the requirements text (plan AR-18).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AD-2 and AR-18.
- In the requirements: MR-10 sections d and f, BR-01 to BR-04, BR-08 to BR-10, edge cases 2 and 3, AC-01, AC-02 and AC-06.

Then read these files:
- `flows/supplierDocument.flow.ts:79-158`, `supplierDocumentStore.ts:31`, and the target at `MockCommandService.ts:4540`
- `SupplierDocument` (`types.ts:1083-1106, 1173`) and `dayProjection.ts:134, 201` (`documentExpiry`)
- `threePlStore.ts` and `customRoles.ts`, for admin-configured lists
- `BuyerScorecard.tsx:449-452` and `services/data/types.ts:1652` (free-text status)
- `supplierApplication.flow.ts:166` (application "Approved")
- A1's `supplierEntry`

## OBJECTIVE

Compute each vendor's qualification level (Registered, Approved or Preferred) from its valid documents against rules Procurement and Quality set, with a history an auditor can follow.

## STANDARD

Rules (BR-04)
- `QualificationRule {level: 'approved' | 'preferred', requiredDocs: {category, certType?, label}[], placeholder: boolean}`.
- Verb `t_qualification_rule_set`, atom `qualification:manage` in `compliance`.
- The Preferred list always includes every Approved item, enforced by `QUALIFICATION_RULE_VALID`.
- Placeholder lists are seeded with `placeholder: true` and a visible "Placeholder, awaiting Procurement and Quality" label (MAT-R14).
- Before saving, the admin screen shows how many vendors would change level (edge case 2).
- Target in `targets/qualificationRule.ts`. Pay the bill (MAT-R5).

Level (BR-01 to BR-03)
- Pure `qualificationFor(supplierId, onDate)` → `{level, missingFor: {approved, preferred}, expiringSoon}`.
- A document counts when `status === 'Valid'` and `documentExpiry` is not expired on the date.
- Match a rule by `category`, and by `certType` when the rule names one (AR-18).
- No manual override.

History (AD-2)
- Pure `qualificationHistory(supplierId)` replays the supplier's document transitions in date order.
- It returns `{at, from, to, causeDocumentId}`, without writing anything on read.

Projection (BR-09)
- `Supplier.qualification` is projected at read, like `scorecardGrade`.
- The free-text scorecard strings are replaced by it.

Label (BR-10)
- The application state "Approved" displays as "Application accepted" (label only; the state name is unchanged).

Screens
- Administration → Vendor qualification (lists per level).
- The supplier profile shows "Qualification: <level>", "For <next level>, still needed: …" with upload links, and the expiring list (AC-06).
- The buyer supplier detail shows the level and the history.
- EN and ID for every string.

## CONSTRAINTS

- Out of scope: RFx eligibility (G2).
- Do not add qualification to `GATE_CRITERIA` (AR-16).

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - verifying the last missing Preferred document moves the vendor to Preferred, and the history names the document (AC-01)
  - an expired Approved document moves the vendor to Registered (AC-02)
  - a vendor with no documents is Registered (edge case 3)
  - a Preferred list missing an Approved item is refused
  - the history is identical on 2 reads, and no store grew
  - a supplier sees its own level and missing documents only
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the rules, level, history, projection, screens and tests, run the gates and open the PR now.
