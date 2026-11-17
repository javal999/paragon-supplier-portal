# Prompt: Material G1 hardened · model-comparison reproduction

**How to use:** Harness experiment, 2026-11-17. Paste into an agent whose checkout is `sc-hub-vision/model-ab/arm-hardened` (detached at `d29ca606`). Not a normal build prompt; the production prompt is `mat-build-G1-qualification.md`. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + JavaScript/JSDoc + Tailwind 3 at base `d29ca606` · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- The task body is the shipped G1 prompt with the same 3 run waivers as the baseline arm, plus 1 verification protocol derived from the deepseek-flash failure modes found in research (ambiguity handled silently, verification narrated instead of run, zero-margin completion).
- The reference docs are injected as untracked files, as in the baseline arm.
- The Opus reference output is the shipped branch tip `f0ed3842` (merged as `5e00304b`). The prompt states its target was Opus 5; git cannot prove which model produced the commit.

---

## RUN CONTEXT

- Your checkout is `/Users/achmadfahlevi/Documents/Build AI Product Sense/projects/sc-hub-vision/model-ab/arm-hardened`. Work only there, and use absolute paths in every tool call.
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

## VERIFICATION PROTOCOL

- Open every file named in CONTEXT and confirm each line reference before writing. When a file, line or dependency does not match, stop and report the mismatch; do not adapt the spec silently. [MAT-R10]
- Before writing, list in your work log every file you will create or modify, 1 per line. Update the list when it changes.
- Run every check you report, and paste the command with its last lines. A check you reasoned about instead of running is UNVERIFIED, and you say so.
- For each DONE WHEN bullet, record PASS or FAIL with the test name or command that proves it. Mark it UNVERIFIED when you did not check it.
- After the first full test run, re-read your diff against every STANDARD bullet before committing.
- When a check fails twice, stop and report the blocker instead of attempting a third fix.
- End the report with a `Changed files` list, 1 line per file and what changed; no ranges and no "and similar".

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - verifying the last missing Preferred document moves the vendor to Preferred, and the history names the document (AC-01)
  - an expired Approved document moves the vendor to Registered (AC-02)
  - a vendor with no documents is Registered (edge case 3)
  - a Preferred list missing an Approved item is refused
  - the history is identical on 2 reads, and no store grew
  - a supplier sees its own level and missing documents only
- Every line of the VERIFICATION PROTOCOL has been followed, and the report carries the PASS/FAIL record and the Changed files list.
- A local commit on HEAD holds the work, per MAT-R11 with push and PR waived.

## OUTPUT

Report in the brief's format, at most 25 lines, followed by the PASS/FAIL record and the Changed files list.

Build the rules, level, history, projection, screens and tests, run the gates and commit locally now. Do not push and do not open a PR.

---

## Notes on design decisions

- The domain content is identical to the baseline arm; only the VERIFICATION PROTOCOL and the OUTPUT extension differ. Any score difference between arms isolates the protocol.
- Each protocol line maps to a failure mode from the deepseek research: silent adaptation to mismatched context (P1), plan drift (P2), narrated verification (P3), optimistic completion claims (P4), stop-at-first-green (P5), retry thrash (P6), unenumerated reporting (P7).
- The protocol deliberately does not name a model. It is the same kind of instruction a production prompt can carry for any model.
- The instruction count exceeds the prompt-builder floor because the source G1 prompt is itself over it. The protocol adds 7 lines; it does not restate the standard.
- Harness-level checks (gates, evidence files) were found to outperform prompt-level checklists in the research; this arm measures only the prompt-level half, and the report says so.
