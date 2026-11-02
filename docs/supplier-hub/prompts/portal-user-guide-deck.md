# Prompt: Paragon Supplier Portal user guide deck, by use case

**Last run:** 2026-11-02, for the material planners' session on 4 Nov (update run, section "Update runs" at the end). The first run was 2026-10-06.
**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on a fresh branch from `main`. There are no slots to fill. The run stops once after Phase 1 so PTI can review the scenarios. Reply "approved" (or send corrections) to start Phase 2.
**Structure:** COSTAR plus Sources, Constraints and Success criteria blocks. The task family is research and synthesis because the hard part is getting each claimed behavior right from code. The deck is the delivery format, nested inside Results.
**Assumptions made:**
- The reader is the PTI supplier team. They know procurement and supply planning but have not used the portal. They use the deck to review flows and later to coach suppliers.
- English deck. Menu labels are copied exactly from the English locale file.
- Core supplier-facing flows get full walkthroughs, 6 to 8 use cases. Every other menu appears only in the Menu Directory appendix.
- Screenshots come from the local dev app in Demo Mode. No real accounts and no deployed environment.
- Output goes to `docs/supplier-hub/user-guide/`, in 2 versions: A complete (PTI and supplier) and B supplier only, which doubles as the early supplier user-testing script. The run commits locally and does not push.
- Deck cap is 70 slides, with at most 8 slides per use case.
- Thinking is on at high effort. The target is a current Claude model in Claude Code.

---

CONTEXT

This repository is the Paragon Supplier Portal (Supplier Hub). PTI (PT Paragon Technology and Innovation) staff and external suppliers both use it. PTI users hold business roles that control which menu sections they see: MP (material planner), BUY (procurement) and FIN (finance). Suppliers see every supplier section, but supplier seats have lanes (seeded as `commercial`, `fulfilment` and `back_office`) that control which actions they can take. Confirm all of this in code before you rely on it.

The menu is defined in `src/components/layout-v2/navConfig.js`, routes are in `src/router/AppRouter.jsx`, and pages are in `src/pages-v2/`. The `/buyer/process-flows` page (`src/pages-v2/ProcessFlows.jsx`) already lists process flows and transitions, so start there. `README.md` is out of date: its route and page tables do not match the router, so do not take routes or menu names from it. Read `CLAUDE.md` before anything else and follow its rules on branches and commits.

The PTI supplier team needs to learn what the portal can do and which menu does what. They want to review every flow from both sides, PTI and Supplier, so the deck explains the portal one use case at a time. Each use case is built from 3 kinds of scenario:
- Positive end-to-end: the normal path from first action to closed outcome, crossing between PTI and Supplier wherever the real flow does.
- Negative end-to-end: a full run where an actor rejects, a validation blocks, or data does not match, ending in a defined failure or recovery state that the system shows.
- Edge case: a boundary condition inside an otherwise valid flow, such as a partial quantity, a deadline reached, more than 1 award, a supplier seat missing the needed lane, or revoked access. Edge cases get 1 row each, not a walkthrough.

SOURCES, in order of authority

1. Code and tests: `navConfig.js`, `AppRouter.jsx`, the page components, and the services and hooks behind them that change status. Test files (`*.test.jsx`, `*.test.js`) show expected behavior. When code and a test disagree, the code is what users get. Record the conflict.
2. The English i18n locale file under `src/`, for every menu label, button label and status name, copied exactly.
3. `ProcessFlows.jsx` and its data, for the list of flows and the status transitions.
4. `docs/supplier-hub/` (PRD, requirements, BACKLOG, BUILD-GAP). These describe intent. Use them only to label a behavior "planned, not built". They are never evidence that something works.
5. `README.md`: only for how to start Demo Mode.

Every behavior you put in the scenario catalog or the deck must cite a `file:line` from source 1, 2 or 3 that you opened in this session. If you cannot find one, move the behavior to the Unverified section.

OBJECTIVE

Produce 4 files in 2 versions.
- **Version A, complete:** a scenario catalog (`docs/supplier-hub/user-guide/SCENARIOS.md`) and, after PTI approves it, a PowerPoint deck (`docs/supplier-hub/user-guide/Paragon-Supplier-Portal-User-Guide.pptx`) that walks through each core use case from both the PTI and the Supplier side.
- **Version B, supplier only:** `docs/supplier-hub/user-guide/SCENARIOS-SUPPLIER.md` and `Paragon-Supplier-Portal-User-Guide-Supplier.pptx`. They keep only the supplier's screens and tasks, and double as the script for early supplier user testing: each task has a prompt to read out, a start point, the expected path in exact labels, a pass condition, what to watch for and questions to ask after; plus session setup, moderator rules and an observation sheet.

AUDIENCE

The PTI supplier team. They know the business process but not the screens. After reading, each person should be able to name which menu handles a given task for a given role, and to walk a supplier through the main flows. Phase 1 is reviewed by the PTI product owner, who approves or corrects the use case list and scenarios before any slides exist.

STYLE AND TONE

Plain operational English. Short imperative steps ("Open Purchase Orders. Select the PO. Click Acknowledge."). Name the actor on every step. Use menu and button labels exactly as the UI shows them, in bold. Keep slide text short and put the detail in speaker notes.

CONSTRAINTS

- Treat `src/` as read-only. Write only under `docs/supplier-hub/user-guide/`. You may also add `.claude/launch.json` if the dev-server preview needs it.
- Run the app with `npm run dev` through the browser preview tool and sign in through Demo Mode only. Find in code how a demo session picks a PTI role (MP, BUY, FIN) and a supplier lane, and use that. If a role or lane cannot be reached in Demo Mode, use a labeled placeholder frame for those screens and give the reason in speaker notes.
- Store screenshots as PNG files in `docs/supplier-hub/user-guide/screens/`, named `UC<n>-<step>-<role>.png`.
- Build both decks with the pptx skill through the generator in `docs/supplier-hub/user-guide/build/` (`node build/build-user-guides.cjs`; content in `content-complete.cjs` and `content-supplier.cjs`). Keep the look of the 6 Oct deck: Cambria titles, Calibri body, navy PTI badge, teal SUPPLIER badge, logo from `build/assets/`.
- Use subagents only to read code for different use cases in parallel. Check your own work yourself, in this session.
- Work on branch `docs/portal-user-guide` from `main`, commit locally, and stop. The user pushes and opens the PR after review.
- Be concise in chat. Progress updates are 1 to 2 lines.

PHASE 1: SCENARIO CATALOG, then stop

Start from this use case list. Confirm each one in code, merge or split as the code requires, and keep 6 to 8:
1. Supplier onboarding and access (application or invite, qualification, supplier access and lanes)
2. Sourcing: RFI, RFQ with rounds, RFP, award
3. Purchase order to payment: PO, supplier acknowledgement, shipment notice, goods receipt, invoice
4. Forecast collaboration: publish to suppliers, supplier response or dispute, PTI review
5. Contracts, delivery agreements and call-offs
6. Compliance documents (for example halal and certificate expiry)
7. Shared stock and capacity (supplier inventory, capacity, stock check reconcile)
8. Communication and supplier performance (Comm Hub, scorecard)

Write `SCENARIOS.md` with these sections:
1. Roles and lanes: each PTI role and supplier lane, what it sees and what it can do, with evidence.
2. Use cases: for each one, purpose (1 sentence); 1 positive end-to-end scenario; 1 or 2 negative end-to-end scenarios; 2 to 4 edge cases. Write each end-to-end scenario as a table with columns Step, Actor, Menu, Action, Status after, Evidence. Give each edge case 1 row with columns Condition, What the system does, Who acts next, Menu, Evidence.
3. Menu Directory: every item in `navConfig.js`, for every PTI section and every supplier section. Columns: Menu label, Section, Role, What it does (1 line, at most 15 words), Use case (or "Not walked through").
4. Unverified: every behavior you expected but could not confirm in code, and every "planned, not built" item from source 4 that a reader might expect to exist.
5. Screenshot plan: the role, lane, route and demo data needed for each positive-scenario step.

Then post a chat summary of at most 15 lines: final use case list, scenario count per use case, Unverified count, and any role or lane you cannot reach in Demo Mode. Wait for approval before Phase 2.

PHASE 2: SCREENSHOTS AND DECK

Capture screenshots following the approved screenshot plan, then build the deck in this order:
1. Title slide.
2. How to read this deck: actor colors (1 color for PTI, 1 for Supplier, used the same way on every slide) and the 3 scenario types.
3. Roles and lanes: 1 slide.
4. Capability Map: a matrix of use case (rows) by role and lane (columns), each cell holding the menu labels that role uses. At most 2 slides.
5. One section per use case, at most 8 slides each:
   a. Overview: purpose, plus a swimlane diagram of the positive scenario with a PTI lane and a Supplier lane and the handoffs marked.
   b. 3 to 5 step slides: screenshot on the left; on the right, up to 6 numbered steps of at most 15 words each, an actor badge per step, and the status after the last step.
   c. When it goes wrong: the negative scenarios as a table with columns Trigger, What the system shows, Who acts next, Menu.
   d. Edge cases: a table with columns Condition, What happens, Menu.
6. Menu Directory appendix: the full table from `SCENARIOS.md`, split across slides at 12 rows per slide, with PTI and Supplier in separate parts.
7. Known limits: the Unverified items, at 1 line each.

Put the `file:line` evidence for each slide in its speaker notes. Total deck length: 70 slides or fewer.

Before committing, render every slide to an image and inspect each one for overflowing text, overlapping shapes, unreadable screenshots and missing actor badges. Fix what you find.

SUCCESS CRITERIA (each can be checked true or false)

- Every `navConfig.js` menu item appears exactly once in the Menu Directory under each role that sees it.
- Every step in every end-to-end scenario names 1 actor, a menu label that matches the English locale string exactly, and the status after the step.
- Every behavior in `SCENARIOS.md` and in the speaker notes cites a `file:line`, or appears under Unverified.
- Every use case has at least 1 positive scenario, 1 negative scenario and 2 edge cases.
- Every step slide has a screenshot or a labeled placeholder with a stated reason.
- The deck has 70 slides or fewer, and no use case section has more than 8.
- Nothing under `src/` changed (`git diff --stat main -- src` is empty).

FINAL REPORT (in chat, at most 12 lines)

Slide count, use cases covered, screenshots captured versus placeholders, Unverified count, the commit hash, and the 3 things PTI most needs to decide or check during review.

Start Phase 1 now.

---

## Update runs

An update run does not start from Phase 1. It starts from the approved catalogs and the code on `main`, and it keeps the use case numbers stable.

1. Find what changed: `git log --oneline <basis commit>..main --no-merges`, grouped by feature. Check each change in the code before writing it up; record the file:line.
2. Re-check every label already in the catalogs against the English locale (a label that moved or changed is corrected, never reworded).
3. Add a use case only for a capability that has its own end-to-end flow; extend an existing one otherwise. Keep onboarding and registration out.
4. Rewrite `SCENARIOS.md` and `SCENARIOS-SUPPLIER.md`, then the content files, then build both decks.
5. Screenshots: retake only after the labels are frozen and prod (or a local build of `main`) runs the new code. Until then the generator draws a labelled placeholder with the route, seat and demo record from the screenshot plan.
6. Render both decks to images and inspect every slide (LibreOffice, or Keynote on macOS: `osascript` export to PDF, then `pdftoppm`).

**2026-11-02 run:** basis `7078ea3` → `aeabdc83`. UC3, UC4, UC6, UC7 rewritten; UC8 (demand anticipation and replenishment, PTI only) added; version B and the generator added; all screenshots placeholders until prod is redeployed.

---

## Notes on design decisions

- **Classed as research and synthesis, not document writing.** The real risk is a deck that confidently describes something the portal does not do. That is why every behavior needs a `file:line` and why there is a named Unverified section. Document-writing elements (exact section list, length per section) sit inside Results.
- **Source ranking puts code above docs and README.** `README.md` lists routes such as `/buyer/purchase-orders` that are not in `AppRouter.jsx`, and the PRD describes intent. Without a ranking, the model would mix planned features into the user guide.
- **Built-in PTI review gate after Phase 1.** Fixing a wrong use case list costs 1 markdown edit before screenshots and around 1 hour of rework after. It also gives PTI the scenario review you asked for, without slides getting in the way.
- **Negative and edge cases have different shapes on purpose.** Negative scenarios are full runs, shown as a table of trigger, system response and who acts next. Edge cases are 1 row each. Walking through every edge case would roughly double the deck and bury the main flows.
- **The Menu Directory covers the "which menu does what" goal for all 62 menu entries in `navConfig.js` (46 PTI, 16 Supplier).** Walkthroughs cover only the core flows, so every menu still gets a 1-line purpose and a pointer to the use case that covers it.
- **Left out:** a persona ("you are a technical writer"), which measurably hurts accuracy; step-by-step reasoning instructions, because thinking is on; example slides, which would anchor the layout to my guess rather than the paragon-brand skill. The cost of no example is that the first render may need 1 layout correction pass.
- **Run it at high effort.** It reads code behind 62 menu entries and about 90 routes. If context gets tight, run Phase 2 in a new session pointed at the approved `SCENARIOS.md`.
