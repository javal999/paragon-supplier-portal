# Verification protocol · addendum for build prompts

**How to use:** Append the block below to a build prompt when the model is not Opus, or when the task's acceptance is checkable and the report will be read by someone who will not re-run everything. It adds no domain rules; it changes how the agent proves the work. Tested 2026-11-17 in the G1 A/B (see `sc-hub-vision/reviews/model-comparison-2026-11-17.md`).
**Target:** any repo · works with the prompt-builder house format · no slots.

---

## VERIFICATION PROTOCOL

- Open every file named in CONTEXT and confirm each line reference before writing. When a file, line or dependency does not match, stop and report the mismatch; do not adapt the spec silently.
- Before writing, list in your work log every file you will create or modify, 1 per line. Update the list when it changes.
- Run every check you report, and paste the command with its last lines. A check you reasoned about instead of running is UNVERIFIED, and you say so.
- For each DONE WHEN bullet, record PASS or FAIL with the test name or command that proves it. Mark it UNVERIFIED when you did not check it.
- After the first full test run, re-read your diff against every STANDARD bullet before committing.
- When a check fails twice, stop and report the blocker instead of attempting a third fix.
- End the report with a `Changed files` list, 1 line per file and what changed; no ranges and no "and similar".

---

## Why each line exists

| Line | Failure it closes | Evidence |
|---|---|---|
| Confirm references, stop on mismatch | Priors override ambiguous context; silent adaptation | DeepSeek V4.1 Flash adopts the strictest reading without a verification call when a rule is ambiguous (behavior study, 2026-10-17) |
| File list before writing | Exploration collapse; scope drift | Dry-run-before-commit fell to 37 to 54% in the same study |
| Run, do not narrate | Verification migrated into reasoning text | Self-correction markers fell 44 to 51 down to 27 to 30 per reply |
| PASS/FAIL per criterion | Optimistic completion claims | 67% hallucination on non-answers (Artificial Analysis Omniscience) |
| Re-read the diff against STANDARD | Stops at first green | Documented zero-margin completion: 5 of 6 runs ended on the last allowed call |
| Stop after 2 failures | Retry thrash | Same |
| Enumerated changed-files list | "and similar" hides omissions | Pre-completion checklist practice |

## The harness half (stronger than the prompt half)

Prompt checklists reach roughly 70 to 90% compliance; a harness gate that blocks completion reaches near 100%. Keep the protocol, but do not rely on it alone:

1. The orchestrator never treats the builder's report as evidence. Check `git log`, the diff, and the gate result at the site.
2. Run a separate verifier pass: give a fresh agent the DONE WHEN list and the diff, before the builder's claims, and ask for per-item PASS/FAIL with the command that proves it. Mechanical checks first.
3. Keep the floor and the drift gate as the finish line. They are the reason a wrong "done" cannot merge.
4. When acceptance is a judgment call (requirement interpretation, rulings, merge decisions), use a session pointed at the Anthropic endpoint. A deepseek reviewer is not independent eyes on a deepseek builder.
