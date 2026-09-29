# Supplier Hub: requirements and project knowledge

Business documentation for the PTI Supplier Hub (Supplier Portal) project. The prototype that implements it is the application in this repository.

## Files

| File | What it is | Status |
|---|---|---|
| [SUPPLIER-HUB-PRD.md](SUPPLIER-HUB-PRD.md) | MVP product requirements document: executive summary, KPIs, user stories, non-goals, architecture, diagrams, test scenarios, edge cases, proposed API contract, risks and roadmap. **For executives and IT** | Draft |
| [SUPPLIER-HUB-REQUIREMENTS.md](SUPPLIER-HUB-REQUIREMENTS.md) | Detailed requirements (`REQ-Exx-nn`): business value, experience, step-by-step, business rules, edge cases, acceptance criteria. **Start here** | Living document |
| [SUPPLIER-HUB-BASELINE.md](SUPPLIER-HUB-BASELINE.md) | Everything in the Aug 2026 kick-off deck, broken into IDs (`E01`–`E13`), plus milestones, people, KPIs, risks, and conflicts. Section 12 merges the reviewed meeting notes | Reference |
| [BACKLOG.md](BACKLOG.md) | Everything outstanding in one list: decisions waiting on people, work waiting on those decisions or on the backend, work that can start today, and what other teams own. **Start here to pick up work** | Living document |
| [DECISION-GUIDE.md](DECISION-GUIDE.md) | A recommendation for each open decision (BL-01 to BL-19b in the backlog): market practice, what we suggest for PTI, and what would change it; plus the RFx decisions RFX-D1 to RFX-D14 and their reasoning. **Take this into the decision meetings** | Recommendations, 2026-09-21; RFx decisions 2026-09-22 |
| [BUILD-GAP.md](BUILD-GAP.md) | The only place that describes the prototype: status per requirement, the build list and what is still not built, where each calculation lives, prototype features kept or parked, and how older design docs in this repo relate. **For the build team** | Living document |
| [SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md](SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md) | SC Hub Material requirements from the 2026-09-23 meeting (MR-1 to MR-10): stock sync and the weekly update, update compliance in performance and award, trade names, template, MRP controller, ASN batch / shelf-life / call-off checks, supplier stock simulation, planning groups, alert order and close reasons, vendor qualification for bidding; decisions MAT-D1 to MAT-D15 with market practice | Decided, 2026-09-29 |
| [SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md](SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md) | Build plan for MR-1 to MR-10: architecture decisions AD-1 to AD-8, code review findings AR-01 to AR-20, 21 tasks in epics A to I with lanes and waves. **For the build team** | Plan, 2026-09-29 |
| [prompts/mat-build-00-brief.md](prompts/mat-build-00-brief.md) | Brief read by every material task prompt (`prompts/mat-build-*.md`), rules MAT-R1 to MAT-R15 | Ready to use |
| [FORECAST-ENGINE-REQUIREMENTS.md](FORECAST-ENGINE-REQUIREMENTS.md) | The in-house forecast engine (epic E14, ENG-1): 12 requirements, each with its calculation explained and a worked example, and the engine decisions (ENG-D, ENG-B) | Draft, 2026-09-23 |
| [FORECAST-ENGINE-FEED-SPEC.md](FORECAST-ENGINE-FEED-SPEC.md) | Every input the engine reads, with fields, refresh, quality checks and the likely SAP source. **For the Master Data Management team** (BL-103) | Draft, 2026-09-23 |
| [research/FORECAST-BEST-PRACTICE-2026-09.md](research/FORECAST-BEST-PRACTICE-2026-09.md) | The forecast problem (Scheduled Confirmed, CFOT, warehouse), the Hub as built, and the market scan | Research, 2026-09-23 |
| [research/FORECAST-METHOD-SPEC.md](research/FORECAST-METHOD-SPEC.md) | The calculation behind each engine step, with its paper and the newest evidence | Research, 2026-09-23 |
| [research/RFX-BEST-PRACTICE-2026-09.md](research/RFX-BEST-PRACTICE-2026-09.md) | What leading procurement platforms (SAP Ariba, Oracle, Coupa and others) do for RFI, RFP and RFQ authoring, supplier response, evaluation and award, with a source link on every claim, mapped to Paragon's real RFQs. Summarised in section 8.3 of the requirements | Research, 2026-09-21 |
| [KICKOFF-MEETING-NOTES.md](KICKOFF-MEETING-NOTES.md) | Business-user feedback from the kick-off, each point with its original scrap note (`MN-…`) and owner confirmation | Reviewed 2026-09-17 |
| [prompts/foundation-requirements-contribution.md](prompts/foundation-requirements-contribution.md) | Prompt the Foundation team runs to produce requirements for E01 and E02 in a mergeable format | Ready to use |
| [prompts/kickoff-deck-baseline.md](prompts/kickoff-deck-baseline.md) | Prompt that produced the baseline | Provenance |

The kick-off deck PDF is not stored in this repository.

## How to read a requirement's status

- **Validated**: confirmed with business users.
- **Proposed**: written from market practice. It needs business review before build.
- **Stub**: named in the deck only.
- **Reserved**: owned by a contributor team.

Every business rule carries a source tag: `[MN-…]` meeting note, `[Deck p.N]`, `[Owner]` decision, `[Code]` calculation taken from the prototype, `[Market]`, or `[Proposed]`.

## One place for each kind of fact

- Product scope, KPIs, stories, architecture, risks: the PRD.
- Business rules, formulas (`CR-`), menu (`NV-`), screen rules (`SC-`): the requirements. The PRD refers to them and does not repeat them.
- What the prototype does and where: `BUILD-GAP.md` only.
- What is still outstanding, and what blocks it: `BACKLOG.md`.
- The deck and the meeting notes: the baseline and meeting notes files, kept as the record of what was said.
- Market research with its full source list: `research/`. The requirements summarise it (section 8) and do not repeat it.

## How to contribute

1. Branch off `main` with a `docs/` prefix, for example `docs/foundation-requirements`.
2. Edit the markdown. Keep IDs stable: never renumber an existing `REQ-`, `MN-`, `E..`, `PQ-` or `Q-` ID. New items take the next free number.
3. When an open item (section 7 of the requirements) is answered, move it to "Answered decisions", update the affected requirements, and add a change log row.
4. Open a pull request. The project manager reviews and merges.

Foundation team: run `prompts/foundation-requirements-contribution.md` with your notes, then follow the merge rule in section 1.4 of the requirements.
