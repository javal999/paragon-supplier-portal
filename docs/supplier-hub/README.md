# Supplier Hub: requirements and project knowledge

Business documentation for the PTI Supplier Hub (Supplier Portal) project. The prototype that implements it is the application in this repository.

## Files

| File | What it is | Status |
|---|---|---|
| [SUPPLIER-HUB-REQUIREMENTS.md](SUPPLIER-HUB-REQUIREMENTS.md) | Detailed requirements (`REQ-Exx-nn`): business value, experience, step-by-step, business rules, edge cases, acceptance criteria. **Start here** | Living document |
| [SUPPLIER-HUB-BASELINE.md](SUPPLIER-HUB-BASELINE.md) | Everything in the Aug 2026 kick-off deck, broken into IDs (`E01`–`E13`), plus milestones, people, KPIs, risks, and conflicts. Section 12 merges the reviewed meeting notes | Reference |
| [KICKOFF-MEETING-NOTES.md](KICKOFF-MEETING-NOTES.md) | Business-user feedback from the kick-off, each point with its original scrap note (`MN-…`) and owner confirmation | Reviewed 2026-09-17 |
| [prompts/foundation-requirements-contribution.md](prompts/foundation-requirements-contribution.md) | Prompt the Foundation team runs to produce requirements for E01 and E02 in a mergeable format | Ready to use |
| [prompts/kickoff-deck-baseline.md](prompts/kickoff-deck-baseline.md) | Prompt that produced the baseline | Provenance |

The kick-off deck PDF is not stored in this repository.

## How to read a requirement's status

- **Validated**: confirmed with business users.
- **Proposed**: written from market practice. It needs business review before build.
- **Stub**: named in the deck only.
- **Reserved**: owned by a contributor team.

Every business rule carries a source tag: `[MN-…]` meeting note, `[Deck p.N]`, `[Market]`, or `[Proposed]`.

## How to contribute

1. Branch off `main` with a `docs/` prefix, for example `docs/foundation-requirements`.
2. Edit the markdown. Keep IDs stable: never renumber an existing `REQ-`, `MN-`, `E..`, `PQ-` or `Q-` ID. New items take the next free number.
3. When an open item (section 7 of the requirements) is answered, move it to "Answered decisions", update the affected requirements, and add a change log row.
4. Open a pull request. The project manager reviews and merges.

Foundation team: run `prompts/foundation-requirements-contribution.md` with your notes, then follow the merge rule in section 1.4 of the requirements.
