# SC Hub Material build brief (read by every mat-build task prompt)

This file is source material for the task prompts `mat-build-A1` to `mat-build-I1`. It is not a prompt to run on its own. Each task prompt tells the agent to read it first. Its rules are cited as MAT-R1 to MAT-R15. Company rules (FE-*) come from `.claude/skills/prompt-builder/references/portal-fit.md`.

## What is being built

- **Requirements:** `docs/supplier-hub/SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`, MR-1 to MR-10 (sections 3 to 12). The owner accepted every recommendation in section 13 (MAT-D1 to MAT-D15) on 2026-09-29. So the [Proposed] rules tied to those decisions are built as written.
- **Plan:** `docs/supplier-hub/SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md`. It holds the architecture decisions AD-1 to AD-8, the review findings AR-01 to AR-20, and the epic and task table. **Where the plan corrects the requirements, the plan wins.** Two examples: the atom is `asn:approve-shelf-life` (AR-02), and the document expiry window is 180 days (AR-18).

## The code the tasks touch

| Area | Where |
|---|---|
| Dispatcher, target interface | `src/services/transitions/dispatcher.ts` |
| Flows | `src/services/transitions/flows/*.flow.ts`, registered in `src/services/transitions/index.ts` |
| Policy hook names | `src/services/transitions/policyHooks.ts` (`POLICY_HOOKS` :631) |
| Targets, hook bodies | `src/services/data/mock/MockCommandService.ts` (`TARGETS` :4863-4931). New targets go in `src/services/data/mock/targets/` (MAT-R13) |
| Roles | `src/services/transitions/businessRoles.ts` (`compliance` :237-297, `planning` :298, `AUTOMATION_ATOMS` :557) |
| Settings, reason codes | `src/services/transitions/hubSettings.ts`, `hubSettingsStore.ts`, `reasonCodes.ts`; admin pages `src/pages-v2/admin/AdminRuleValues.tsx`, `AdminReasonCodes.tsx` |
| Inventory | `src/services/transitions/inventoryRules.ts`, `inventoryConfig.ts`, `inventoryAlertRules.ts`, `capacityRules.ts`; `src/services/data/mock/inventoryReadModel.ts`; `src/services/data/mock/fixtures/inventoryHub.ts` |
| ASN, call-off | `src/services/transitions/fulfilmentRules.ts`, `callOffRules.ts`, `flows/advanceShipNotice.flow.ts`, `flows/callOff.flow.ts`; `src/pages-v2/SupplierShipments.tsx` |
| Material master | `src/services/sdc/fixtures.ts` (`MATERIAL_MASTER` :135), `sdc/materialMaster.ts` (`materialEntry` :65), `sdc/types.ts:164-234` |
| Supplier master | `src/data/mockSuppliers.ts:63`, `src/types/supplier.types.ts:37`, `MockSupplierService.ts` |
| Performance | `src/services/data/performanceRules.ts`, `mock/supplierMeasureReadModel.ts`, `pages-v2/performance/performanceDisplay.ts` |
| Award | `src/services/sourcing/awardShape.ts`, `src/pages-v2/rfx/AwardPanel.tsx` |
| RFx eligibility | `src/services/transitions/rfxRules.ts` (`filterInvitees` :107), `src/services/sourcing/complianceGate.ts`, `rfxConfig.ts` |
| Supplier documents | `flows/supplierDocument.flow.ts`, `mock/stores/supplierDocumentStore.ts`, `dayProjection.ts` (`documentExpiry`) |
| Liveness | `src/services/liveness/registry.ts` |
| Command hooks | `src/services/query/commandHooks.ts`, `src/services/query/hooks.ts` |
| Strings | `src/lib/i18n/*.ts` (e.g. `inventoryCapacity.ts`, `adminSettings.ts`, `adminReasons.ts`), registered in `src/lib/i18n.ts` |

## Rules for every task

- **MAT-R1 · One path for state changes.** Change state only through a verb. That means a transition in a flow file, applied by its `CommandTarget`, guarded by a policy hook, and dispatched from pages through a command hook. Pages never write a store.
- **MAT-R2 · Page and verb share the rule.** Put each business rule in a pure function in `src/services/transitions/` or `src/services/sourcing/`, and return a named refusal code. Call the same function from the page's pre-check and from the policy hook. [plan AR-10, AR-11]
- **MAT-R3 · Append, do not edit.** Record exceptions, approvals, overrides and changes as new rows or appended entries. Never edit the earlier record. Derived values are computed, not stored. [plan AD-1, AD-2]
- **MAT-R4 · Narrow supplier reads.** A supplier sees only its own stock, trade names, compliance, qualification and ASNs. It never sees another supplier's trade name, or a rule listed in `PTI_ONLY_RULES`. Narrow in the read model, not in the page.
- **MAT-R5 · Pay the invariant bill for each new verb, state, entity or field.** The tests named here fail otherwise (plan section 2.1).
  - Flow registered in `transitions/index.ts`. The atom matches `ROLE_RE` (`validate.ts:17`): lowercase and dashes after the colon.
  - Role atom in a bundle in `businessRoles.ts` (`businessRoles.test.ts:51,101`). Cascade-only verbs go in `AUTOMATION_ATOMS`.
  - `surfaceable` on each transition (`surfaceable.test.ts:44,79`).
  - Hook name in `POLICY_HOOKS` (`transitions.test.ts:131`).
  - Purpose row in `annotations.ts`, with EN and ID text in `src/lib/i18n/processFlowPurpose.ts` (`annotations.test.ts:40-142`).
  - The flow row, the `- **wired:**` list and the header counts in `docs/contracts/C1-methods.md` (`c1MethodSurface.contract.test.ts`).
  - The method count in `docs/contracts/C5-seams.md`, which borrows the C1 figure, when a new read method is added (same contract test).
  - A real id and a store reset in `ownerlessScope.test.ts`. Creation-only targets go in its `unprobeable` list.
  - A reader or an `allowlist.ts` row for each new stored field (`storedFieldGate.test.ts`).
  - A `FLIPS` entry for each new setting key (`hubSettings.bl32.test.ts:592`).
  - For a new reason list, update the pinned list in `reasonCodes.bl32.test.ts:95`.

  Derive counts. Do not type them into prose (`CLAUDE.md`, `FLOOR-IN-PROSE-01`).
- **MAT-R6 · Strings.** Every user-visible string goes through `t()` with the repo's un-namespaced keys. Add each key to both the `En` and `Id` exports of the matching `src/lib/i18n/<area>.ts` (`fragments.test.ts:194-244`). [FE-I18N-1] A name that people type in (a planning group, a trade name) is data, not a key.
- **MAT-R7 · UI.**
  - Use a ternary or `!!x &&` for conditional render [FE-CMP-3].
  - Keep JSX nesting at 6 levels or fewer [FE-CMP-4].
  - Use stable keys [FE-CMP-5].
  - Follow DP-1 to DP-3 in `CLAUDE.md`. `Button` has no solid variant. Material codes, dates and quantities use the `<Data>` primitive.
- **MAT-R8 · Tests.**
  - Command tests sit in `src/services/data/mock/`. Copy the setup of the nearest existing command test for the same target: `new MockCommandService()`, a `QueryScope` with `PERSONA_SYSTEM_ROLES`, and the store resets in `beforeEach`.
  - Pure-rule tests sit next to the rule.
  - Page tests render through `renderWithProviders` (`src/test/test-utils.tsx`).
  - Each refusal code gets 1 test that fires it and 1 that passes.
  - A worked example given in the requirements is reproduced exactly.
- **MAT-R9 · Scope.** Build only what the task names. Add no dependency, no backend, no email, and no refactor outside the files the task needs. Leave the next task's work to that task.
- **MAT-R10 · Read before asserting.** Open a file before changing or describing it. Line numbers here and in the plan were read on `main` at `6b26e09`, so confirm them. When the code contradicts this brief or the task prompt, stop and report the contradiction instead of choosing.
- **MAT-R11 · Git.** Obey `CLAUDE.md`.
  - Branch `feat/mat-<task id>-<slug>` off an up-to-date `main`.
  - Commit, push, and open 1 PR titled `feat(mat): <task id> <deliverable>`.
  - Do not merge. The operator merges.
- **MAT-R12 · Finish line.** `npm run gates` passes on Node 22. If it prints the floor note, bump `scripts/floor.json` as it asks. Never add tests only to clear the floor. Do not use subagents to verify or double-check your own work.
- **MAT-R13 · New targets in their own module.** Put each new `CommandTarget` and its hook bodies in `src/services/data/mock/targets/<name>.ts`. Add only the import and 1 `TARGETS` line to `MockCommandService.ts`. Import shared helpers; do not copy them. [plan AD-5, AR-01]
- **MAT-R14 · Label simulated data.** A value that will come from SAP, or from a feed not yet running, carries a liveness capability (`registry.ts:53,100`) and a `<LivenessPill>` where it is shown. Never present fixture data as live. [plan AR-19]
- **MAT-R15 · Read masters through the resolver.** Read the material master through `materialEntry`, and the supplier master through the `supplierEntry` resolver (after A1). Never through the fixture directly. Hub-mastered fields live in overlay stores. [plan AD-4]

## Report format for every task

At most 25 lines:
1. The branch and PR URL.
2. The changed files, 1 line each.
3. The `npm run gates` summary: the 4 gates and the test count.
4. Each requirement rule the task covered, as "BR id: where".
5. Anything the task could not do, and why. Also any contradiction found under MAT-R10.
