# Forecast UX phase 3 brief (read by every fux3 task prompt)

This file is source material for the phase 3 task prompts `fux3-build-C1` and `fux3-build-C2` and for the usability test plan. It is not a prompt to run on its own. Phase 1 and phase 2 rules still apply: read `fux-build-00-brief.md` (FUX-R1 to FUX-R10) and `fux2-build-00-brief.md` (FUX2-R1 to FUX2-R4). Phase 3 adds FUX3-R1 to FUX3-R3.

## What phase 3 is for

Phases 1 and 2 acted on every finding in `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md` (status in its section 10). Every judgement so far came from reading the screens, not from a planner using them. Phase 3 checks the result with the people it is for, closes the leftovers, and makes the pages usable without a mouse and on a narrow screen.

## Scope, confirmed by the owner on 2026-10-05

| Item | What | Who runs it |
|---|---|---|
| T1 · Usability test | 3 to 5 material planners each do the first weekly cycle on the portal, unassisted. Plan: `docs/supplier-hub/research/FORECAST-UX-USABILITY-TEST-PLAN.md` | A person (the owner or a colleague), not an agent |
| C1 · Clean-up | Unused strings and stale menu keys, the Why this quantity panel at narrow widths, B4 follow-ups | Builder, prompt `fux3-build-C1-cleanup.md` |
| C2 · Accessibility and narrow screens | Keyboard, screen reader and contrast pass on the forecast pages, and a layout pass at 768 and 390 px | Builder, prompt `fux3-build-C2-accessibility.md` |
| C3 · Fixes from the test | Briefed after T1, from its findings | Later |

Out of scope:
- Source column and next-due date on forecast versions (FUX-D4): they wait until the engine publishes on real data and SOMO ratifies C8 §8.
- One set of supplier numbers for scorecard and reliability (FUX-D5): only if planners still confuse them in T1.
- This week as the planners' landing page: decided from T1's results.

## Order

C1 and C2 touch different concerns and can run in parallel. T1 can run any time; running it after C1 and C2 means planners test the finished pages. C3 is briefed from T1's findings.

## Rules added for phase 3

- **FUX3-R1 · Derive, do not inherit.** A list in this brief (unused keys, pages) is a starting point. Derive the real set from the code before changing anything, and report any member the brief missed or got wrong.
- **FUX3-R2 · Delete only what has no reader on current main.** Before removing a string, export or file, search for readers on an up-to-date `main`, not on the branch base. Phase 2's #140 broke main by removing an export that a later merge had started reading.
- **FUX3-R3 · Change no behaviour except what the task names.** C1 and C2 change no figure, verb, flow or engine result.

## The code

The 13 forecast pages and their place in the cycle are listed in `src/components/forecast/forecastPages.ts`. Shared forecast UI lives in `src/components/forecast/`. The menu is `src/components/layout-v2/navConfig.ts`.

## Phase 3 status (2026-10-06)

Merged: C1 #150, C2 #153. T1 (usability test) has not run yet; C3 waits for its findings.
- C1: 35 unused keys removed from EN and ID (the brief listed 3; the derived list, checked both ways, found 32 more). The Why this quantity panel fits the table's visible width and stacks its 3 blocks below 880 px; at 1024 px its third block used to end past the edge.
- C2: 33 accessibility findings (0 Blocker, 6 Major, 27 Minor), 26 fixed, recorded in `docs/supplier-hub/research/FORECAST-UX-ACCESSIBILITY-2026-10.md`. Every disabled act now states its reason to a screen reader; Forecast quality's tabs keep focus on arrow keys; no forecast page scrolls sideways at 768 px. The lint ceiling went down to 756.
- Not fixed, outside the forecast pages: the shared app shell's menu is a fixed 240 px, leaving 86 px for a page at 390 px, so phones are not usable until the shell collapses its menu (Major). Also shared: filter chips without arrow keys, 40 px button height, low-contrast field borders, 13 px checkboxes.
- PR #147 (FE standard Phase 7) converts the forecast module to JavaScript and must take these changes in.

## Report format for every task

At most 25 lines:
1. The branch and PR URL, and the head SHA from `git rev-parse HEAD` and `git ls-remote`.
2. The changed files, 1 line each.
3. All 5 `npm run gates` results by name, and the test count.
4. Each item covered, and where.
5. What you checked on screen, 1 line per page and width.
6. Anything not done, and why, plus any list item the brief got wrong (FUX3-R1).
