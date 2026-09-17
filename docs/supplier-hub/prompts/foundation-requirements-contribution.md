# Prompt: Supplier Hub Foundation requirements contribution

**How to use:** Paste everything between the 2 horizontal rules into Claude (claude.ai or Claude Code). Fill 2 slots first: `[CONTRIBUTOR NAMES]` and `<foundation_notes>` (paste or attach your meeting notes, process documents, or scrap notes about supplier registration, onboarding, and master data). Send the resulting file, `FOUNDATION-REQUIREMENTS.md`, back to the Supplier Hub project manager for merging.
**Structure:** COSTAR plus Constraints and Success criteria (document and spec writing family). Source notes sit at the top because this is a one-shot prompt. The requirement template is fixed, because the output is pasted into an existing document.
**Assumptions made:**
Extended thinking is on, on a current Claude model.
Your notes are the only authority for Foundation detail. The kick-off deck scope is embedded below, so no other file is needed.
The output is English, and Indonesian terms from your notes are kept in quotes beside their English rendering.
Anything your notes do not settle is marked `[Proposed]` or raised as an open item, never stated as decided.

---

<foundation_notes>
[Paste or attach your Foundation notes here: meeting notes, process flows, checklists, scrap notes, in English or Indonesian. Include who confirmed what, if known.]
</foundation_notes>

## CONTEXT

PT Paragon Technology and Innovation (PTI) is building a Supplier Hub, a portal for collaboration with raw material and packaging suppliers. A requirements document already exists. It covers Order Collaboration, Inventory Collaboration, and RFx in detail. Section 5.1, **Foundation**, is reserved for your team. Your output replaces that section, so it must use the same template, IDs, personas, and source tags as the rest of the document.

**Foundation scope from the kick-off deck (Aug 2026, page 7). Both epics are in the MVP, with Vergi as PIC:**

| Baseline ID | Epic | Sub-epic as written in the deck |
|---|---|---|
| E01.01 | Supplier Registration & Onboarding | Supplier request & registration |
| E01.02 | | Internal registration |
| E01.03 | | Questionnaire module |
| E01.04 | | Supplier qualification |
| E01.05 | | Verification & approval workflow |
| E02.01 | Supplier Master Data Management | Profile & bank data maintenance |
| E02.02 | | Update supplier profile (by supplier / internal) |
| E02.03 | | Deactivation & blacklist |
| E02.04 | | Integration to SAP MM |
| E02.05 | | Soft file Vendor Document |

**Facts from the deck that bear on Foundation:**
- On the scope slide (p.6), both epics carry a badge "PROCIO E-Procurement Application". The deck does not say whether they are delivered in PROCIO, integrated with PROCIO, or rebuilt in the hub. This is open decision DEC-05.
- Procurement is business owner for Supplier Onboarding (p.12). The deck names no business owner for Supplier Master Data Management (open decision DEC-09).
- The Master Data team validates supplier-submitted data against master data governance and supports onboarding design (p.12).
- Legal validates supplier documents for legal and regulatory compliance and supports onboarding design (p.12). The Legal key user is still TBC (p.13).
- Related KPI: KPI-02, 80% of eligible suppliers boarded on time (p.15).
- Related risks: RSK-04, low supplier digital literacy slows adoption; RSK-05, poor data quality including master data (p.14).
- Already agreed elsewhere in the document: blacklisted and deactivated suppliers are hidden when buyers select suppliers for RFx events (REQ-E03-01). Supplier filtering uses commodity and purchasing group, so Foundation master data must hold both.

**Personas used across the document. Use these codes and add a new one only if your notes need it:**

| Code | Persona |
|---|---|
| MP | Material Planner, PTI |
| BUY | Buyer, PTI Procurement |
| FIN | Accounts Payable, PTI Finance |
| MDM | Master Data steward, PTI |
| LEG | Legal reviewer, PTI |
| SUP | Supplier user |
| ADM | Hub administrator, PTI IT |

## OBJECTIVE

Write `FOUNDATION-REQUIREMENTS.md`: detailed Foundation requirements for E01 and E02, grounded in the notes above, in a form that can be pasted into the Supplier Hub requirements document without editing.

## AUDIENCE

The Supplier Hub project manager, who merges the file, then business users from Procurement, Master Data, and Legal, who review it, then the build team. They know procurement and SAP MM. They read it to decide whether each requirement is right and complete, and the build team uses the acceptance criteria to test.

## STYLE AND TONE

Plain, direct English. Short bullets and numbered steps. Tables only where the template uses them. Active voice.

## CONSTRAINTS

**Sources and tags**
- Base every business rule, acceptance criterion, and edge case on the notes where the notes cover it. Where the notes are silent, you may propose a design choice, and it must carry `[Proposed]`.
- End every business rule, edge case, and acceptance criterion with 1 source tag:
  - `[FN-nn]`: an item from the source notes register you build in section E of the output.
  - `[Deck p.N]`: a fact from the deck context above.
  - `[Proposed]`: your own design choice.
- Set requirement status to **Validated** only when the notes say business users confirmed it. Otherwise use **Proposed**.
- Record DEC-05 (PROCIO) as an open item unless the notes answer it. If they answer it, state the answer in the affected requirements with its `[FN-nn]` tag.

**IDs and structure**
- Requirement IDs are `REQ-E01-nn` and `REQ-E02-nn`, numbered from 01 per epic.
- A requirement may cover 1 or several sub-epics. Every sub-epic from E01.01 to E02.05 must appear in at least 1 requirement's "Maps to" cell, or in the not-covered list in section D.
- Use the heading levels exactly as in the template, so the file pastes under the existing document.

**Length**
- Each requirement: at most 700 words.
- Business value: 2 to 4 sentences.
- Step-by-step: 3 to 8 steps.
- Be concise: a rule that fits in 1 line gets 1 line.

## RESULTS

The file contains exactly these 5 sections, in this order, with these headings.

**Section A.** Heading `### 5.1 Foundation`, then a 2 to 3 sentence introduction naming the source notes and their date, if known. Then 1 block per requirement, each in this exact template:

```
#### REQ-E0x-nn  <Name>

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| <E01.xx / E02.xx IDs; FN-nn IDs> | MVP | P0 / P1 / P2 | <team> | <persona codes> | Validated / Proposed |

**Business value.** <problem solved, for whom, and which KPI or risk it moves>

**Experience.** <per persona: what they see and can do>

**Step-by-step (<Persona>, <concrete situation>).**
1. ...

**Business rules.**
- BR-01. <rule> [tag]

**Edge cases.**
- <situation>: <required handling> [tag]

**Acceptance criteria.**
- AC-01. <condition checkable as pass or fail> [tag]

**Data and integration.** <objects, key fields, system of record, direction of flow, including SAP MM where relevant>

**Metrics.** <leading and lagging measures, KPI IDs where they apply>

**Open items.** <IDs from section C, or "None">
```

**Section B.** Heading `### Index rows for section 4`, then a table with columns `ID | Name | Epic | Phase | Status`, 1 row per requirement.

**Section C.** Heading `### Open items for section 7`, then a table with columns `ID | Item | Requirements affected`. Number new items `FQ-01` onward. Include DEC-05 and DEC-09 if still open.

**Section D.** Heading `### Glossary rows for section 3.5`, then a table with columns `Term | Meaning | Source`, for terms the requirements use that a reader outside Procurement would not know. After it, a line `Not covered:` listing any sub-epic from E01.01 to E02.05 that the notes give no basis to detail, or "None".

**Section E.** Heading `### Source notes register`, then a table with columns `ID | Note, rewritten in clear English | Original wording | Confirmed by business users (Yes / No / Unknown)`, with IDs `FN-01` onward, 1 row per distinct point in the notes. Quote Indonesian originals as written.

## SUCCESS CRITERIA

Check each before writing the file, and fix any failure:
- Every sub-epic E01.01 to E02.05 appears in a "Maps to" cell or in the not-covered list.
- Every business rule, edge case, and acceptance criterion ends with exactly 1 source tag.
- Every `[FN-nn]` tag used exists in section E.
- Every acceptance criterion can be marked pass or fail by a tester without asking a question.
- No requirement marked Validated rests only on `[Proposed]` rules.
- Section B has 1 row per requirement in section A, with matching IDs and names.

## TASK

Read the notes in `<foundation_notes>`, build the source notes register first, then write `FOUNDATION-REQUIREMENTS.md` with sections A to E as specified. Output the file only, with no preamble.

---

## Notes on design decisions

- **The prompt stands alone.** Your friends may not have this workspace, so the deck scope for E01 and E02, the personas, and the relevant open decisions are embedded instead of referenced.
- **Fixed headings and IDs make the merge a paste.** Section A replaces section 5.1 of `SUPPLIER-HUB-REQUIREMENTS.md`. Sections B, C, and D go into sections 4, 7, and 3.5. Section E goes into the meeting notes as the Foundation equivalent of the `MN-` register.
- **`FN-nn` tags mirror the `MN-nn` tags** used for the validated epics, so reviewers can trace every rule to a note the same way across the document.
- **Status is Validated only when the notes say business users confirmed it.** This keeps a friend's unreviewed assumptions from entering the document looking like agreed requirements.
- **PROCIO (DEC-05) is called out explicitly,** because it decides whether Foundation is built, integrated, or bought, and it affects every requirement in the section.
- **No example requirement is included.** An example would anchor the model to invented Foundation content. The template carries the format instead.
- **Left out:** no persona role for the model, no step-by-step reasoning instructions, and no request to research market practice. Your friends' notes are the source. If they want market-based proposals too, add that as a separate pass.
