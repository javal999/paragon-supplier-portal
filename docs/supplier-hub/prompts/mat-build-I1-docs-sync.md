# Prompt: Material I1 · Fold the material build into the documents

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with every task A1 to G2 merged. No slots to fill.
**Target:** paragon-supplier-portal docs · markdown only · rules from `mat-build-00-brief.md` and `docs/supplier-hub/README.md` ("How to contribute")
**Assumptions made:**
- The RFx round's fold-in (task F1, PR #70) is the model: new IDs are renumbered into the main documents, and the requirements file stays as the record.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first. Then read these:
- `docs/supplier-hub/SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md` and `SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md`, including section 4, "Found during the build"
- `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, whose status row shows how a folded-in file is marked
- `SUPPLIER-HUB-REQUIREMENTS.md` (REQ-E07-04, REQ-E08-01 to REQ-E08-05, REQ-E03-02 to REQ-E03-05, the answered-decisions table, the change log)
- `BUILD-GAP.md`, `BACKLOG.md`, `DECISION-GUIDE.md`, `SUPPLIER-HUB-PRD.md` (user stories)
- the merged task PRs: `gh pr list --state merged --search "feat(mat)"`

## OBJECTIVE

Make the main documents describe the material features as built, with MAT-D1 to MAT-D15 recorded as owner decisions, and the build's differences from the requirements stated.

## STANDARD

Requirements
- MR-n BR-nn rules become business rules on the REQ they extend: MR-1 and MR-4 on REQ-E08-02, MR-2 on REQ-E08-02 and REQ-E03-05, MR-6 on REQ-E07-04, MR-8 on REQ-E08-04, MR-9 on REQ-E08-05, MR-10 on REQ-E03-02 to 05.
- MR-3, MR-5 and MR-7 become new REQ IDs, taking the next free numbers.
- Never renumber an existing ID.

Decisions
- MAT-D1 to MAT-D15 become MAT-D entries in `DECISION-GUIDE.md`, each with market practice, decision and what would change it.
- They go in the requirements' answered-decisions table.

Corrections
- Correct the requirement text for:
  - plan AR-02: the atom name
  - AR-04: "Hub administrator only" became a `compliance` atom
  - AR-18: the 180-day document window
- State these in `BUILD-GAP.md` as build differences.

User stories
- US-MAT-01 to US-MAT-14 become PRD user stories, taking the next free numbers.

Backlog
- Epic H items and every open follow-up from the plan's section 4 become BL rows (next free numbers). Built items go to Closed with their PRs.

Status rows
- Mark the requirements and plan files "Folded in on <date>", as the RFx file is.

Change log
- Add change-log rows in each edited document.

## CONSTRAINTS

- Docs only. No code.
- Derive every count and PR number from `gh` and the files. Type no count from memory (`FLOOR-IN-PROSE-01`).

## DONE WHEN

- Every MR rule is findable in `SUPPLIER-HUB-REQUIREMENTS.md` under its new ID, with a mapping table in the requirements file's status row.
- `BUILD-GAP.md` shows each MR's status and its PRs.
- A docs PR is open, titled `docs(supplier-hub): I1 fold material build into the documents`.

## OUTPUT

Report the PR URL, the ID mapping (MR → REQ/BR) as a table, and the new BL rows. At most 30 lines.

Fold the documents and open the PR now.
