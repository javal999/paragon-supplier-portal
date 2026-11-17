# Prompt: Material G1 Opus arm · model-comparison reproduction

**How to use:** Harness experiment, 2026-11-17. Run only from a session pointed at Anthropic with Opus 5.5: `env | grep ANTHROPIC_BASE_URL` must print nothing. Paste into an agent whose checkout is `sc-hub-vision/model-ab/arm-opus` (detached at `d29ca606`). Not a normal build prompt; the production prompt is `mat-build-G1-qualification.md`. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + JavaScript/JSDoc + Tailwind 3 at base `d29ca606` · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- The task body is reproduced from `mat-build-G1-qualification.md` with 2 waivers for a local experiment: no push and no PR.
- The reference docs (brief, requirements, plan) were committed at `ce781f88`, after this task's branch was built; they are injected into the checkout as untracked files, matching the original working tree.
- This is the live Opus arm. The historical shipped branch tip `f0ed3842` (merged `5e00304b`) remains the second reference; the prompt states it targeted Opus 5, but git cannot prove which model produced it.

---

## RUN CONTEXT

- Your checkout is `/Users/achmadfahlevi/Documents/Build AI Product Sense/projects/sc-hub-vision/model-ab/arm-opus`. Work only there, and use absolute paths in every tool call.
- Read `CLAUDE.md` at the checkout root before starting, and obey it.
- Node 22 is required for `npm run gates`. Prefix npm commands with `PATH=/Users/achmadfahlevi/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin:$PATH` so `node` and `npm` resolve to Node 22.
- The checkout is detached at the task's base commit. Commit on it; do not create or switch branches.
- Do not push and do not open a pull request. MAT-R11's branch, push and PR steps are waived; the local commit is the deliverable.
- The reference documents under `docs/supplier-hub/` are untracked files provided for reading. Do not add them to your commit.
- The base commit has 1 known pre-existing failing test, unrelated to this task: `src/services/data/mock/invoiceCommand.test.ts` F-2, date-dependent, failing because today's real date is past its fixture dates. Do not modify it. Treat the gate as green for this task when the build and `test:gate` pass and no test other than that one fails; record it in your report as a known base failure.

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
- A local commit on HEAD holds the work, per MAT-R11 with push and PR waived.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the rules, level, history, projection, screens and tests, run the gates and commit locally now. Do not push and do not open a PR.

---

## Notes on design decisions

- The body is the shipped G1 prompt, so the comparison tests the artifact that actually produced the Opus reference, not a retelling of it.
- The only edits are the 3 run waivers (checkout path, no branch, no push/PR). Both arms get the identical body, so the A/B stays fair.
- The docs commit postdates the build. Injecting the docs as untracked files restores what the original builder could read; the requirements and plan are cited by MAT-R1..R15, so without them the task is not runnable.
- `mat-build-00-brief.md` line references were read at `6b26e09`, verified as an ancestor of the base; the flow file at base matches the range cited.
