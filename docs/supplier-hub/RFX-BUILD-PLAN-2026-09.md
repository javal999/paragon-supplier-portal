# RFx build plan: architecture review, epics and tasks

| Field | Value |
|---|---|
| Date | 2026-09-25 |
| Builds | `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`: NR-1 supplier attachments, NR-2 award from an RFP, NR-3 award to more than 1 supplier |
| Decisions | The owner accepted every recommendation in section 7 of the requirements (D-1 to D-9) on 2026-09-25 |
| Code read | `main` at `f3fdede` |
| Delivery | 1 PR per task. Tasks in one lane run in order. Lanes run in parallel and merge one at a time, re-checked against `main` before each merge |
| Prompts | `docs/supplier-hub/prompts/rfx-build-*.md`. Every task prompt reads `rfx-build-00-brief.md` first |

---

## 1. Architecture and implementation review

This covers the code the tasks touch: the command spine, the RFx targets and stores, the award rules, the read model, and the file handling. Severity: **High** = a task will break or duplicate behaviour unless this is fixed first. **Medium** = it adds cost or risk to a task. **Low** = tidy-up.

### 1.1 What is sound, and what the tasks keep

- **One path for every state change.** Every state change runs through the ordered gates of one dispatcher: transition, target, scope, role, idempotency, expected state, legality, fields, policy, apply, cascade (`src/services/transitions/dispatcher.ts:4-12`, `:436-679`). The new verbs use this path and nothing else.
- **The page and the verb share the rule function.** `TieredAwardForm` pre-checks with `tieredAwardShapeRefusal` (`src/pages-v2/rfx/TieredRfq.tsx:555-556`), and the award policy calls the same function (`src/services/data/mock/MockCommandService.ts:3508-3516`). The screen and the verb cannot disagree. The new award rules keep this shape.
- **Supplier reads are narrowed centrally.** A supplier sees only its own award lines (`src/services/data/mock/rfxReadModel.ts:429-447`), only its own responses, and nothing past an unaccepted confidentiality gate (`:212-268`). Each new field is narrowed in the same place.
- **Invariants are enforced by tests, not prose.** Role atoms, surfaceable flags, purpose annotations, the C1 method and flow list, and EN/ID parity all fail the gates when a verb is added without its paperwork (`businessRoles.test.ts:51-127`, `surfaceable.test.ts:44-203`, `annotations.test.ts:40-107`, `c1MethodSurface.contract.test.ts:211-378`, `src/lib/i18n/fragments.test.ts:194-258`). This costs every task some bookkeeping, and the brief lists it (RFX-R5).

### 1.2 Findings

**AR-01 · High · The target does not know which verb it is applying**
`CommandTarget.applyTransition(id, toState, payload, scope)` receives no transition id (`dispatcher.ts:50-80`). The RFQ target tells verbs apart by payload and target state: `payload.deadline` means extend, `toState === 'Draft'` means revise, `toState === 'Awarded'` means award (`MockCommandService.ts:1393-1453`, with its own comment at `:1394-1397`). NR-3 adds 2 more verbs that land on states already in use:
- cancel award goes Awarded → Closed
- "Raised in SAP" keeps the state, like extend and the FX pin

A payload discriminator is guessing at that point.
*Fix, task A1:* pass the transition id to `applyTransition` as an optional 5th argument. Existing targets ignore it, and the RFx targets branch on it.

**AR-02 · High · The award record belongs to the RFQ only**
`AwardRecord.rfqId` (`src/services/sourcing/types.ts:417-433`) and `awardViews` reading `rfqStore.get(award.rfqId)` (`rfxReadModel.ts:434`) tie awards to RFQs. NR-2 needs the same record for RFP options.
*Fix, task C1:* generalise the record once, before the RFP award, to `eventType` + `eventId` and `optionId` on a line, migrating the seeds (`AWARD_SEED`, `RFQ_SAMPLE_AWARD_SEED`). Otherwise the RFP gets a parallel award record.

**AR-03 · Medium · 2 dispatch paths for the same award verb**
`useRfqAward` sends a single winner with no lines and no reason (`src/services/query/commandHooks.ts:616-633`). Its only caller is the RFQ list page (`src/pages-v2/BuyerSourcing.tsx:1100`, `:1172-1195`). `useRfxCommand`'s `award` sends lines and reason (`commandHooks.ts:2714-2722`). The single-winner path is how legacy RFQs escape the split rules (requirements F-07).
*Fix, task C3:* remove it, and link the list page to the event-page award, as tiered RFQs already do (`BuyerSourcing.tsx:3940-3957`).

**AR-04 · Medium · Legacy and tiered awards follow different rules**
- Legacy RFQs are checked by `awardSplitRefusal` (`src/services/transitions/rfxRules.ts:643-656`), with lines built against `lineItems[0]` only (`src/pages-v2/BuyerSourcingEvent.tsx:235-236`).
- Tiered RFQs are checked by `tieredAwardShapeRefusal` (`src/services/sourcing/rfqComparison.ts:400-439`).

Quantity split, partial award and per-item breaks would have to be built twice.
*Fix, task C1:* 1 item-based rule, where a legacy RFQ is a set of items with one break equal to each line's quantity.

**AR-05 · Medium · Responses are overwritten in place**
The RFI and RFP response targets upsert 1 row per supplier and event, so each save replaces the last (`MockCommandService.ts:2946-2957`, `:3106-3116`). Revise-until-deadline (D-6) and the file history (NR-1 BR-08, BR-10) need earlier versions.
*Fix, task B2:* keep submitted versions in an appended history on the response, and show the latest as the response.

**AR-06 · Medium · The quote cascade runs one way only**
The award cascade marks the named quotes Awarded and the rest Rejected (`src/services/transitions/cascades.ts:72-75`; `MockCommandService.ts:4451-4479`). Both are final states (`src/services/transitions/flows/quotation.flow.ts:25`). Cancelling an award needs the reverse: new quotation verbs from Awarded and Rejected back to Under Review, fired by a cascade under the automation grant (`businessRoles.ts:557`).
*Fix, task C2.*

**AR-07 · Medium · File bytes sit outside the data seam**
The file store is a module-level `Map`, called directly by the upload component (`src/services/attachments/sessionAttachments.ts:21-45`; `src/components/ui-v2/SessionAttachments.tsx:21-46`). Every other read and write goes through `DataService` (`CLAUDE.md`, "Backend is greenfield": `httpDataService` is the designed swap). When BL-27 lands, the components would have to change, not only an adapter.
*Fix, task A2:* a file seam on the data service, with the session store as its first adapter.

**AR-08 · Low · The award store can be edited, though it is only ever appended to**
`awardStore` is built on a generic collection that exposes `update` (`src/services/data/mock/stores/rfxStores.ts:39-64`, `:72`). The only write today is `add` (`MockCommandService.ts:1479`). A cancel that edits the record in place would lose what was awarded.
*Fix, task C2:* record a cancellation as a new appended record, and let the read model derive the award in force.

**AR-09 · Low · Stale comment**
`src/services/sourcing/rfxPrefill.ts:139` says the RFP → RFQ wizard wiring "is a later batch", but the wizard calls it (`BuyerSourcing.tsx:1618-1627`).
*Fix:* whichever task next touches the file corrects the comment.

**AR-10 · Low · Reported, not re-checked**
The code map reported that `docs/contracts/README.md:103-104` still calls quote submit and review unwired, while `TARGETS` wires both (`MockCommandService.ts:226-227`). Not re-checked here. It goes in the final docs task (F1) to confirm.

### 1.3 What stays out of reach of this plan

- **No backend.** The whole hub runs on in-browser mock stores. BL-27 (real file storage), email notifications, and the SAP hand-off need Stage F1 or F2 and are not part of these prompts (epic E).
- **No named person.** The actor on every record is `UNATTRIBUTED: NO_PERSON_IN_SESSION` (`CLAUDE.md`). New records keep an actor field, which fills in when an identity provider exists.

---

## 2. Epics and tasks

Each task is 1 PR and 1 prompt. "Needs" lists tasks that must be merged first.

### Epic A · Foundations

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| A1 | Transition id passed to `applyTransition`; the RFQ, RFI and RFP targets branch on it (AR-01) | none | `rfx-build-A1-transition-id.md` |
| A2 | File seam on the data service with a session adapter, plus 1 shared file-limit rule (AR-07, D-3) | none | `rfx-build-A2-file-seam.md` |

### Epic B · NR-1 Supplier attachments

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| B1 | Document requests on the 3 event types; response documents on RFI and RFP responses and quotes; required-slot and limit refusals; certificate fields (NR-1 BR-01 to BR-07, BR-11) | A2 | `rfx-build-B1-document-model.md` |
| B2 | Revise until the deadline for RFI and RFP responses, with an appended version history (NR-1 BR-08, D-6, AR-05) | B1 | `rfx-build-B2-response-revise.md` |
| B3 | Buyer "Documents from suppliers" step in the RFI, RFP and RFQ wizards | B1 | `rfx-build-B3-buyer-requests-ui.md` |
| B4 | Supplier "Documents" section and "Revise response" on the RFI, RFP and RFQ forms | B2 | `rfx-build-B4-supplier-documents-ui.md` |
| B5 | Buyer "Supplier documents" tab, comparison "Documents" row, and the download log (NR-1 BR-10) | B1 | `rfx-build-B5-buyer-file-view.md` |

### Epic C · NR-3 Award to more than 1 supplier (RFQ)

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| C1 | 1 item-based award rule: split by % or quantity, a break per item, partial award, the Partly awarded state; legacy RFQs on the same rule; award record generalised to event type and id (NR-3 BR-01 to BR-08, AR-02, AR-04) | A1 | `rfx-build-C1-award-engine.md` |
| C2 | Cancel award and "Raised in SAP" verbs; appended cancellation; quote reinstatement cascade; supplier "Award withdrawn" (NR-3 BR-09 to BR-12, AR-06, AR-08) | C1 | `rfx-build-C2-award-cancel.md` |
| C3 | Award panel: split mode, quantities, "Not awarded now", a break per item, cancel and SAP marking; legacy RFQs on the panel; single-winner path removed; supplier per-item outcome (AR-03) | C2 | `rfx-build-C3-award-ui.md` |

### Epic D · NR-2 Award from an RFP

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| D1 | Firm-offer round: entity, flow, target, supplier firm-offer verb, Firm labels (NR-2 BR-01 to BR-04) | A1 | `rfx-build-D1-firm-offer-round.md` |
| D2 | RFP award, cancel and SAP marking on the C1/C2 award model; RFP states Awarded and Partly awarded; "no RFQ from an awarded option" (NR-2 BR-05 to BR-10) | C2, D1 | `rfx-build-D2-rfp-award.md` |
| D3 | RFP screens: buyer firm-offer round and award panel; supplier firm-offer form and outcome | D2, C3 | `rfx-build-D3-rfp-award-ui.md` |

### Epic E · Blocked on a backend (no prompts yet)

| Item | Blocked on |
|---|---|
| BL-27 file storage adapter, virus scan, ZIP download | Stage F1 backend; the A2 seam makes it an adapter swap |
| Email notifications for invitations, deadlines, rounds and awards (requirements F-08) | An email service (Stage F1) |
| Award to SAP for PO or contract (requirements F-09) | SAP seam (Stage F2), interface PQ-06 |

### Epic F · Documentation

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| F1 | Fold NR-1 to NR-3 as built into `SUPPLIER-HUB-REQUIREMENTS.md`, `BUILD-GAP.md`, `BACKLOG.md` and the decision guide; record D-1 to D-9 | all of B, C, D | `rfx-build-F1-docs-sync.md` |

### 2.1 Order and lanes

```
Lane 1  A1 ─► C1 ─► C2 ─► C3 ─┐
             └─► D1 ──────────┴► D2 ─► D3
Lane 2  A2 ─► B1 ─┬► B2 ─► B4
                  ├► B3
                  └► B5
Last    F1 (after B4, B5, C3, D3)
```

- A1 and A2 can start together.
- After them, up to 3 builders can work at once, for example C1, D1 and B1. Most conflict risk is in `MockCommandService.ts`, which C, D and B all touch. Merge one PR at a time, and have the next PR merge `main` in and re-run the gates before merging.

---

## 3. Found during the build (2026-09-25)

Each item was found by a task builder and checked against the code before it was accepted. The PR numbers are the task PRs, all open against `main` when this was written.

### 3.1 Fixed inside the task PR that found it

| Found in | Issue | Fix |
|---|---|---|
| C1 (#58) | The C1 prompt said 2 award tests must "pass unchanged" while the record field they read was being replaced | The prompt now lists the allowed test edits (section 2, task C1). The PR lists every edited assertion |
| B2 (#59) | Saving a draft could overwrite a Submitted response and bypass the version history | Save refuses `RESPONSE_ALREADY_SUBMITTED: use revise` |
| B3 (#60) | Removing an RFQ item silently moved a document request onto another item, because requests name items by position | The wizard remaps requests when an item is removed. A request on the removed item becomes response-level and is named in a notice |
| D1 (#57) | Supplier-proposed option ids (`sup-opt-N`) are unique only within one supplier, so 2 suppliers' options collided in a round | Rounds and firm prices name options by `rfpOptionRef`: `<supplierId>:<optionId>` for a proposed option |
| B4 (#63) | A revised negotiation-round quote (`t_quotation_revise`) did not run the document rules (left open by B1) | The B1 document policy now runs on revise too |
| C3 (#64) | A final award that only marks open items "Will not award" was refused `AWARD_EMPTY` (left open by C1) | Allowed with no lines only on a Partly awarded RFQ when `notAwardedItems` covers every open item |

### 3.2 Open follow-ups

| # | Item | Why it matters | Suggested owner |
|---|---|---|---|
| FU-1 | `ResponseDocument` has no `uploadedBy`. The B1 prompt left it out | NR-1 BR-10 asks who uploaded each file, and the buyer view (B5) cannot show it | A small task after B1 and B5 merge: record the session actor on each document, and show it in the panel |
| FU-2 | `CLAUDE.md:241` says `quotation:review` and `rfq:award` are "not co-reachable on any RFQ". After C3 the award link shows on every awardable RFQ, so both appear on RFQ-2026-011 | A stale statement in the file every session reads | The operator. `CLAUDE.md` is canon, so it is not edited from a task PR |
| FU-3 | `IFileService.urlFor` is synchronous (A2). Real storage usually hands out signed URLs asynchronously | BL-27 may need `urlFor` to become async | The BL-27 adapter task |
| FU-4 | The legacy single-price RFQ comparison has no "Documents" row (B5 covered tiered RFQs and RFPs). The documents panel on that page still shows complete or missing | A small consistency gap | F1 records it, or a later polish task |
| FU-5 | `t_rfq_award` still accepts a payload without `awardLines` (read as 1 line per item at 100%) for legacy RFQs, though no screen sends one after C3 | Dead path kept for C1's command tests | Remove together with those tests in a later tidy-up |
| FU-6 | Page tests time out when many builders run the full suite at once (load average above 150) | False red runs. Each passed alone and on a full re-run | None. Note it for parallel work |

