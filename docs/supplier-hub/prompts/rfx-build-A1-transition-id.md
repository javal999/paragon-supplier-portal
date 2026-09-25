# Prompt: RFx A1 · Pass the transition id to command targets

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` that contains `RFX-BUILD-PLAN-2026-09.md`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `.claude/skills/prompt-builder/references/portal-fit.md` and `docs/supplier-hub/prompts/rfx-build-00-brief.md`
**Assumptions made:**
- Only the dispatcher and the RFQ, RFI event and RFP event targets change. The other targets ignore the new argument.
- Behaviour stays identical. This is an enabler for C1, C2 and D2.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow its rules RFX-R1 to RFX-R12. Then read `CLAUDE.md`, finding AR-01 in `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`, `src/services/transitions/dispatcher.ts` (the `CommandTarget` interface at :50 and the apply step near :644-660), and the RFQ target in `src/services/data/mock/MockCommandService.ts` (:1389-1567).

The RFQ target cannot see which verb it applies. It tells extend, revise-draft and award apart by payload fields and target state (`MockCommandService.ts:1393-1453`). Tasks C1, C2 and D2 add verbs that land on states already in use, so the discriminator has to become the transition id.

## OBJECTIVE

Pass the transition id to `CommandTarget.applyTransition`, and make the RFQ, RFI event and RFP event targets branch on it, with no change in behaviour.

## STANDARD

- Add `transitionId` as an optional 5th parameter of `applyTransition`, and pass `input.transitionId` from the dispatcher's apply step. Keep the existing 4 parameters and their order, so every other target compiles unchanged. [RFX-R9]
- In the RFQ target, replace each payload or target-state discriminator with a switch on `transitionId`. Keep each branch's body as it is. Where a verb has no branch today, keep today's fall-through behaviour. [RFX-R1, RFX-R10]
- Do the same in the `rfiEvent` and `rfpEvent` targets only where they discriminate by payload today. Leave the other targets alone. [RFX-R9]
- Update the comments that explain the payload discriminator (for example `MockCommandService.ts:1394-1397`) so they describe the new switch. [RFX-R10]

## CONSTRAINTS

- Out of scope: new verbs, new states, UI, and every target other than `rfq`, `rfiEvent` and `rfpEvent`.
- If the dispatcher's conformance harness (`src/services/contracts/conformance/`) constructs targets and needs the new argument, update it. Otherwise leave it alone.

## DONE WHEN

- `npm run gates` passes on Node 22, with every existing RFQ, RFI and RFP command test unchanged and green (`src/services/data/mock/rfqAwardCommand.test.ts`, `rfqLifecycleCommand.test.ts`, `rfqFxPinCommand.test.ts`, `rfxCommand.test.ts`, `rfxReviseDraftCommand.test.ts`).
- A new test in `src/services/data/mock/rfqTransitionIdCommand.test.ts` dispatches `t_rfq_award` with a stray `deadline` field in the payload. It asserts that the RFQ is awarded and that its deadline and extensions are unchanged. It fails on today's `main`, which the report states.
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Make the change, add the test, run the gates and open the PR now.

---

## Notes on design decisions

- This is its own PR because it touches the dispatcher every verb goes through. Keeping it separate and behaviour-preserving makes it easy to review, and C1, C2 and D2 build on it.
- The regression test names the concrete failure the payload discriminator allows: a stray field sends a verb down the wrong branch. That shows the change fixes something rather than only renaming it.
- The optional 5th parameter avoids editing every target in the tree, which RFX-R9 forbids.
- The rules count stays under 20: 12 from the brief plus 4 here.
