# Prompt: RFx F1 · Fold the built RFx improvements into the Supplier Hub documents

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with tasks B4, B5, C3 and D3 merged. No slots to fill.
**Target:** paragon-supplier-portal · documentation only (`docs/supplier-hub/`, `docs/contracts/README.md`)
**Assumptions made:**
- The owner accepted D-1 to D-9 on 2026-09-25. They are recorded as owner decisions RFX-D6 to RFX-D14, after the existing RFX-D1 to RFX-D5.
- `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md` stays as the record of the analysis and is marked as folded in.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `CLAUDE.md`, then these files:
- `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md` and `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`
- `docs/supplier-hub/SUPPLIER-HUB-REQUIREMENTS.md`: CE-01 to CE-11, REQ-E03-02 to REQ-E03-05, the "RFx: later" list, section 9
- `docs/supplier-hub/BUILD-GAP.md` (:20-30, and the work-item table)
- `docs/supplier-hub/BACKLOG.md`
- `docs/supplier-hub/DECISION-GUIDE.md` (:184-221)
- `docs/supplier-hub/SUPPLIER-HUB-PRD.md` (the US-5x rows)

Then read the merged PRs for tasks A1 to D3 (`gh -R javal999/paragon-supplier-portal pr list --state merged --search "feat(rfx)"`), so every "built" statement comes from a merged PR, not from the plan.

## OBJECTIVE

Update the requirements, build-gap, backlog, decision guide and PRD so they describe RFx as built after tasks A1 to D3, with every change traced to a merged PR or an owner decision.

## STANDARD

- Record D-1 to D-9 as RFX-D6 to RFX-D14 in section 9 of the requirements and in the decision guide, each in the existing form (market practice, decision, what would change it). Name each amended rule: RFX-D4, CE-10, REQ-E03-04 BR-08, REQ-E03-05 BR-06 and BR-06a, and the RFI and RFP response lifecycles.
- Write NR-1 to NR-3's rules into REQ-E03-02 to REQ-E03-05 and CE-11 with their provenance tags. A rule that shipped becomes [Owner, 2026-09-25] plus the PR number.
- Update each REQ-E03 row in `BUILD-GAP.md` with what was built and by which PR, and add work items for tasks A1 to D3.
- In `BACKLOG.md`, add rows for what stays open: BL-27 storage adapter, email notifications, the SAP award hand-off, and ZIP download. Point BL-27 at the A2 seam.
- Add the PRD user stories US-RFX-01 to US-RFX-10 under their final US numbers, and map them to requirement IDs.
- Check finding AR-10 in `docs/contracts/README.md:103-104` against `MockCommandService.ts` `TARGETS`, and correct the note only if it is wrong.
- Mark `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md` and `RFX-BUILD-PLAN-2026-09.md` as folded in, with the date and the PR list.
- Derive every count from the files. Never restate one in prose (`CLAUDE.md`, `FLOOR-IN-PROSE-01`). Write plain English with no em dashes, matching the documents' existing style.

## CONSTRAINTS

- Change documentation only. No code, tests or contracts other than the README note in the step above.
- Branch `docs/rfx-improvements-built`, 1 PR, and do not merge.

## DONE WHEN

- Every built statement cites a merged PR number, and every owner rule cites RFX-D6 to RFX-D14.
- `npm run gates` passes. Documentation cannot break it, but the CLAUDE.md pointer check runs.
- A PR is open.

## OUTPUT

At most 20 lines: the PR URL, each changed file with 1 line on what changed, and any statement you could not trace to a PR.

Update the documents and open the PR now.

---

## Notes on design decisions

- The docs PR comes last, one at the end of the overhaul, as in the RFx overhaul of 2026-09-21. The documents then describe what shipped, not what was planned.
- Tracing to merged PRs rather than the plan stops the documents claiming work that changed during the build.
- Assigning RFX-D6 to RFX-D14 keeps the decision numbering continuous with RFX-D1 to RFX-D5.
