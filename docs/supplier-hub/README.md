# Supplier Hub: requirements and project knowledge

Business documentation for the PTI Supplier Hub (Supplier Portal) project. The prototype that implements it is the application in this repository.

## Files

| File | What it is | Status |
|---|---|---|
| [SUPPLIER-HUB-PRD.md](SUPPLIER-HUB-PRD.md) | MVP product requirements document: executive summary, KPIs, user stories, non-goals, architecture, diagrams, test scenarios, edge cases, proposed API contract, risks and roadmap. **For executives and IT** | Draft |
| [SUPPLIER-HUB-REQUIREMENTS.md](SUPPLIER-HUB-REQUIREMENTS.md) | Detailed requirements (`REQ-Exx-nn`): business value, experience, step-by-step, business rules, edge cases, acceptance criteria. **Start here** | Living document |
| [SUPPLIER-HUB-BASELINE.md](SUPPLIER-HUB-BASELINE.md) | Everything in the Aug 2026 kick-off deck, broken into IDs (`E01`–`E13`), plus milestones, people, KPIs, risks, and conflicts. Section 12 merges the reviewed meeting notes | Reference |
| [BACKLOG.md](BACKLOG.md) | Everything outstanding in one list: decisions waiting on people, work waiting on those decisions or on the backend, work that can start today, and what other teams own. **Start here to pick up work** | Living document |
| [DECISION-GUIDE.md](DECISION-GUIDE.md) | A recommendation for each open decision (BL-01 to BL-19b in the backlog): market practice, what we suggest for PTI, and what would change it; plus the RFx decisions RFX-D1 to RFX-D15, the SC Hub Material decisions MAT-D1 to MAT-D21, and their reasoning. **Take this into the decision meetings** | Recommendations, 2026-09-21; RFx decisions 2026-09-22 to 2026-09-28; material decisions 2026-09-29 |
| [BUILD-GAP.md](BUILD-GAP.md) | The only place that describes the prototype: status per requirement, the build list and what is still not built, where each calculation lives, prototype features kept or parked, and how older design docs in this repo relate. **For the build team** | Living document |
| [SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md](SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md) | SC Hub Material requirements from the 2026-09-23 meeting (MR-1 to MR-10): stock sync and the weekly update, update compliance in performance and award, trade names, template, MRP controller, ASN batch / shelf-life / call-off checks, supplier stock simulation, planning groups, alert order and close reasons, vendor qualification for bidding; decisions MAT-D1 to MAT-D15 with market practice; a fold-in map to the requirement IDs | Folded in, 2026-09-29 (record of the analysis) |
| [SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md](SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md) | DA, ROP and call-off requirements from the 2026-10-14 meeting and the OSIP playbook (DRC-1 to DRC-19): rolling demand anticipation with carry-over, safety order, reorder points by level, call-off trigger, feedstock reconcile, what-if sandbox; a defaults table for the 25 questions open with Material Planning; decisions DRC-D1 to DRC-D16; backlog BL-187 to BL-209 | Accepted 2026-10-19; not built |
| [SC-HUB-TERM-LABELS-REQUIREMENTS-2026-10.md](SC-HUB-TERM-LABELS-REQUIREMENTS-2026-10.md) | How labels are worded and explained (BL-233): a label keeps the source's word, a clash shows both ("Demand anticipation (DA)"), a rename needs a ruling; every important column header, grid row and KPI card title gets an (i) tooltip with definition, calculation, other names and what it is not. Decisions TL-D1 to TL-D40 (TL-D40, the Protection buffer tip, approved 2026-11-12); label inventory in `research/TERM-LABEL-INVENTORY-2026-10.md`; TL-D1 supersedes CAP-D10, TL-D8 renames "Carried in" to "Carry-over" | Accepted 2026-10-29; not built |
| [SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md](SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md) | Plan vs execution requirements from the 2026-10-21 and 2026-11-04 meetings (PEX-1 to PEX-16): Foresight zones Zone Liability and Zone Capacity, 17-week then monthly horizon to 12 months, capacity utilisation and treemap, LTP A / Festive / B inputs, DA versions with causes, PO On Hold with planner suggestion and supplier choice, SLA on confirmations, sandbox levels; decisions PEX-D1 to PEX-D29 (PEX-D3 and PEX-D9 to PEX-D15 still proposed; PEX-D25 to PEX-D28 ruled 2026-11-12, PEX-D29 ruled 2026-11-17); backlog BL-264 to BL-279, BL-282 to BL-285, BL-293 to BL-298, BL-312 and BL-313 to BL-318 | Approved 2026-11-05; built and merged in waves 1 and 2 (MR !97, !100, !101, !102, last on 2026-11-10); PEX-D27 built in MR !117; PEX-D25 and PEX-D26 built in MR !127 (`15f9712f`); PEX-12 built as an educated guess in MR !131 (BL-312, [Proposed], thresholds empty, waits on Mba Septi); the PO On Hold marker and "Suggest again" built in MR !135 (BL-314, BL-315, [Proposed], merged to `main` on 2026-11-16, in production since 2026-11-17; two faults BL-317 and BL-318); BL-313 (PEX-D29, ruled 2026-11-17) merged in MR !140 (`5d2edcea`); open parts in `BACKLOG.md` section 4e |
| [user-guide/SC-Hub-MoM-14-Oct-What-Changed.pptx](user-guide/SC-Hub-MoM-14-Oct-What-Changed.pptx) | 24-slide walkthrough of what changed after the 2026-10-14 meeting (DA, ROP and call-off, OSIP): rolling demand anticipation, reorder points by level, call-off trigger, feedstock, what-if sandbox, proposals awaiting review, open points and try-it tasks. **For the users, in the weekly session** | Ready to present, 2026-10-20 |
| [user-guide/SC-Hub-Planner-04-Nov-What-Changed.pptx](user-guide/SC-Hub-Planner-04-Nov-What-Changed.pptx) | 37-slide deck for the Material Planner session of 2026-11-04: every calculation, screen and label change since 2026-10-21 by planner workflow, worked examples for each changed formula, and 29 open questions (ID + EN). Source text, evidence and unverified claims: [user-guide/SC-Hub-Planner-04-Nov-What-Changed.md](user-guide/SC-Hub-Planner-04-Nov-What-Changed.md). **For Material Planning** | Ready to present, 2026-11-02: main `aeabdc83`, screenshots from prod |
| [user-guide/Paragon-Supplier-Portal-User-Guide.pptx](user-guide/Paragon-Supplier-Portal-User-Guide.pptx) | 56-slide user guide, complete version (PTI and supplier): sign-in, roles and lanes, then 7 use cases (UC1 PO to goods receipt, UC2 call-offs, UC3 forecast, UC4 compliance documents, UC5 stock, feedstock and capacity, UC6 alerts, UC7 demand anticipation), each with steps, what goes wrong and edge cases; menu directory and known limits. RFx and invoices are left out (owner, 2026-11-02). Source and evidence: [user-guide/SCENARIOS.md](user-guide/SCENARIOS.md). **For PTI users** | Ready, 2026-11-02: screenshots from a build of `aeabdc83` / `f79a26c1` |
| [user-guide/Paragon-Supplier-Portal-User-Guide-Supplier.pptx](user-guide/Paragon-Supplier-Portal-User-Guide-Supplier.pptx) | 23-slide supplier-only guide that doubles as the script for early supplier user testing: tasks T1 to T9 with a test prompt, expected path and pass condition, moderator setup and rules, observation sheet. Source: [user-guide/SCENARIOS-SUPPLIER.md](user-guide/SCENARIOS-SUPPLIER.md). **For suppliers and test moderators** | Ready, 2026-11-02 |
| [user-guide/SC-Hub-MoM-Updates-07-14-28-Oct.pptx](user-guide/SC-Hub-MoM-Updates-07-14-28-Oct.pptx) | 21-slide briefing on the 07, 14 and 28 Oct meetings: each decision and its status in prod, the 29 questions still open for Material Planning, the 12 alert rules to confirm, items waiting on the owner, what the demo cannot show. Text: [user-guide/SC-Hub-MoM-Updates-07-14-28-Oct.md](user-guide/SC-Hub-MoM-Updates-07-14-28-Oct.md). **For the Material Planner session** | Ready, 2026-11-02 |
| [user-guide/build/README.md](user-guide/build/README.md) | Generator for the three decks above (pptxgenjs, content as data) and how to retake their screenshots | Tool |
| [SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md](SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md) | Build plan for MR-1 to MR-10: architecture decisions AD-1 to AD-8, code review findings AR-01 to AR-20, 21 tasks in epics A to I with lanes and waves, and what was found during the build. **For the build team** | Built and folded in, 2026-09-29 (record of the plan) |
| [prompts/mat-build-00-brief.md](prompts/mat-build-00-brief.md) | Brief read by every material task prompt (`prompts/mat-build-*.md`), rules MAT-R1 to MAT-R15 | Ready to use |
| [FORECAST-ENGINE-REQUIREMENTS.md](FORECAST-ENGINE-REQUIREMENTS.md) | The in-house forecast engine (epic E14, ENG-1): 12 requirements, each with its calculation explained and a worked example, and the engine decisions (ENG-D, ENG-B) | Draft, 2026-09-23 |
| [FORECAST-ENGINE-FEED-SPEC.md](FORECAST-ENGINE-FEED-SPEC.md) | Every input the engine reads, with fields, refresh, quality checks and the likely SAP source. **For the Master Data Management team** (BL-103) | Draft, 2026-09-23 |
| [research/FORECAST-BEST-PRACTICE-2026-09.md](research/FORECAST-BEST-PRACTICE-2026-09.md) | The forecast problem (Scheduled Confirmed, CFOT, warehouse), the Hub as built, and the market scan | Research, 2026-09-23 |
| [research/FORECAST-METHOD-SPEC.md](research/FORECAST-METHOD-SPEC.md) | The calculation behind each engine step, with its paper and the newest evidence | Research, 2026-09-23 |
| [research/ALERT-RULES-FOR-TEAM-2026-11-02.md](research/ALERT-RULES-FOR-TEAM-2026-11-02.md) | The 12 alert rules in the hub today, with who sees them, for the Material Planning team to confirm against the 2026-09-23 list (BL-150) | Notes, 2026-11-02 |
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
