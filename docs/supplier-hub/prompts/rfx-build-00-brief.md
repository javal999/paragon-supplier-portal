# RFx build brief (read by every rfx-build task prompt)

This file is source material for the task prompts `rfx-build-A1` to `rfx-build-F1`. It is not a prompt to run on its own. Each task prompt tells the agent to read it first. Rules here are cited as RFX-R1 to RFX-R12. Company rules (FE-*) come from `.claude/skills/prompt-builder/references/portal-fit.md`.

## What is being built

- **Requirements:** `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`. NR-1 supplier attachments (section 4), NR-2 award from an RFP (section 5), NR-3 award to more than 1 supplier (section 6). The owner accepted every recommendation in its section 7 (D-1 to D-9) on 2026-09-25, so the [Proposed] rules tied to those decisions are to be built as written.
- **Plan and architecture review:** `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`. Findings AR-01 to AR-10, and the epic and task table.

## The code the tasks touch

| Area | Where |
|---|---|
| Flows (states, verbs, roles, policy hooks) | `src/services/transitions/flows/{rfq,quotation,rfiEvent,rfiResponse,rfpEvent,rfpResponse,negotiationRound}.flow.ts` |
| Dispatcher and target interface | `src/services/transitions/dispatcher.ts` (`CommandTarget` at :50) |
| Targets, policies, cascades | `src/services/data/mock/MockCommandService.ts` (`TARGETS` at :4221; rfq target :1389; RFI/RFP targets :2865-3170; award policy :3490-3559; cascade resolver :4328-4482) |
| Policy hook names | `src/services/transitions/policyHooks.ts` |
| Pure rules | `src/services/transitions/rfxRules.ts`, `src/services/sourcing/rfqComparison.ts` |
| Types | `src/services/sourcing/types.ts`, `src/services/sourcing/rfqModel.ts` |
| Stores | `src/services/data/mock/stores/{rfxStores,rfqStore,quotationStore}.ts` |
| Reads | `src/services/data/mock/rfxReadModel.ts`, `src/services/query/hooks.ts`, `src/services/query/commandHooks.ts` (`useRfxCommand` at :2496) |
| Roles | `src/services/transitions/businessRoles.ts` (`procurement` :143-160, supplier `commercial` :335-348, `AUTOMATION_ATOMS` :557) |
| Screens | `src/pages-v2/{BuyerRfi,BuyerRfp,BuyerSourcing,BuyerSourcingEvent,SupplierRfi,SupplierRfp,SupplierRFQs,SupplierNegotiations}.tsx`, `src/pages-v2/rfx/`, `src/pages-v2/rfqs/` |
| Files | `src/services/attachments/sessionAttachments.ts`, `src/components/ui-v2/SessionAttachments.tsx` |
| Strings | `src/lib/i18n/{rfx,rfxAuthoring,rfqCompare,rfqAuthoring}.ts`, registered in `src/lib/i18n.ts` |

## Rules for every RFx task

- **RFX-R1 · One path for state changes.** Change state only through a verb: a transition in the flow file, applied by its `CommandTarget`, guarded by a policy hook, and dispatched from pages through `useRfxCommand`. Pages never write a store. [pattern: `useRfxCommand`, `commandHooks.ts:2496-2736`]
- **RFX-R2 · Page and verb share the rule.** Put each business rule in a pure function in `rfxRules.ts` or `src/services/sourcing/`, returning a named refusal code. Call the same function from the page's pre-check and from the policy hook. [pattern: `tieredAwardShapeRefusal`, `rfqComparison.ts:400`, used at `TieredRfq.tsx:555` and `MockCommandService.ts:3508`]
- **RFX-R3 · Append history.** Record versions, cancellations and downloads as new rows or appended entries, never by editing the earlier record. [pattern: FX pins append, `rfq.flow.ts` fx-pin comment; plan AR-05, AR-08]
- **RFX-R4 · Narrow supplier reads.** Every new field a supplier can read is narrowed in `rfxReadModel.ts`. A supplier sees only its own responses, files, offers and award lines, and nothing behind an unaccepted confidentiality gate. [pattern: `rfxReadModel.ts:212-268`, `:429-447`]
- **RFX-R5 · Pay the invariant bill for each new verb, state or field.** For each one, add or update:
  - a role atom in a bundle (`businessRoles.ts`; cascade-only verbs go in `AUTOMATION_ATOMS`)
  - a `surfaceable` value on the transition
  - a purpose row in `src/services/transitions/annotations.ts`, with EN and ID text in `src/lib/i18n/processFlowPurpose.ts`
  - the flow and transition rows and totals in `docs/contracts/C1-methods.md`
  - a `looseEndCensus.ts` row only if a state cannot be left

  The tests named in the plan's section 1.1 fail otherwise. Derive counts. Do not type them into prose (`CLAUDE.md`, `FLOOR-IN-PROSE-01`).
- **RFX-R6 · Strings.** Every user-visible string goes through `t()` with the repo's un-namespaced keys. Add each key to both the `En` and `Id` export of the matching `src/lib/i18n/<area>.ts`. [FE-I18N-1]
- **RFX-R7 · UI.** Use a ternary or `!!x &&` for conditional render [FE-CMP-3]. Keep JSX nesting at 6 levels or fewer [FE-CMP-4]. Use stable keys, never the index [FE-CMP-5]. Follow DP-1 to DP-3 in `CLAUDE.md`, and note that `Button` has no solid variant.
- **RFX-R8 · Tests.**
  - Command tests sit in `src/services/data/mock/`: `new MockCommandService()`, a `QueryScope` with `PERSONA_SYSTEM_ROLES`, and `resetRfxStores()`, `rfqStore.reset()`, `quotationStore.reset()`, `sdcClock.reset()` in `beforeEach` (model: `rfxCommand.test.ts:54-58`).
  - Page tests render through `renderWithProviders` (`src/test/test-utils.tsx:75`).
  - Each refusal code gets 1 test that fires it and 1 that passes.
- **RFX-R9 · Scope.** Build only what the task names. Add no dependency, no backend, no email, and no refactor outside the files the task needs. Leave the next task's work for the next task.
- **RFX-R10 · Read before asserting.** Open a file before changing or describing it. When the code contradicts this brief or the task prompt, stop and report the contradiction instead of choosing.
- **RFX-R11 · Git.** Obey `CLAUDE.md`:
  - Branch `feat/rfx-<task id>-<slug>` off an up-to-date `main`.
  - Commit, push, and open 1 PR titled `feat(rfx): <task id> <deliverable>`.
  - Do not merge. The operator merges.
- **RFX-R12 · Finish line.** `npm run gates` passes on Node 22. If it prints the floor note, bump `scripts/floor.json` as it asks. Never add tests only to clear the floor. Do not use subagents to verify or double-check your own work.

## Report format for every task

At most 25 lines:
1. The branch and PR URL.
2. The changed files, 1 line each.
3. The `npm run gates` summary: 4 gates and the test count.
4. Each requirement rule the task covered, as "BR id: where".
5. Anything the task could not do, and why.
