# Forecast area: accessibility and narrow screens (2026-10)

- **Task:** Forecast UX phase 3, C2 (`docs/supplier-hub/prompts/fux3-build-C2-accessibility.md`). Standard: WCAG 2.1 AA.
- **Checkout audited:** `origin/main` at `740c1ed`, branch `feat/fux3-C2-accessibility`.
- **How it was run:** `npm run build` (Node 22), `vite preview` on port 5352, demo session as a Material Planner. Viewports 1440×900, 768×1024, and 390×844 (also the 375×812 mobile preset, which reports `pointer: coarse`).
- **Pages:** the 12 in `src/components/forecast/forecastPages.ts`, plus Supplier performance (`/buyer/scorecard`), which carries the same purpose header and banner. Both tabs of Publish to suppliers and of Forecast quality were checked.
- **Method:** scripts in the browser measured, per page: heading levels, controls without a name, fields without a label, tables without header cells, disabled buttons without `aria-describedby`, text contrast against the computed background (all `<details>` opened), a focus indicator on every focusable control, and every element wider than the content area outside its own scroll area. Each page was then walked with real Tab presses from the skip link: every control reached, in DOM order, no trap.
- **Checks that passed before any change:** one `h1` per page; no skipped heading level; every table has `th` cells; every field has a label; every control has a name; the step bar already marks its current step with `aria-current="step"`; both tab lists already move by arrow key and Home/End (`ui-v2/tabKeys.js`); the Why this quantity panel moves focus in, closes on Escape and returns focus to its control.
- **Severity:** Blocker means a task cannot be done by keyboard or screen reader. Major means it can, with difficulty. Minor means friction.

## Summary

33 findings: 0 Blocker, 6 Major, 27 Minor. 26 fixed in C2 (#153), 1 more after it (#155), and 4 shared-primitive findings (15, 30, 31, 32) in PR_REF, so 31 fixed and 2 not fixed (19, 33). All 6 Major findings are fixed: finding 8, the shared app shell's fixed menu, was outside C2's files and was fixed in #155 on 2026-10-06.

## Findings

| # | Page | Issue | WCAG | Severity | Status | Why not fixed |
|---|---|---|---|---|---|---|
| 1 | All pages with a term tip (shared `TermTip`) | The info button had `focus:outline-none`. The only sign of focus was a colour change on a 12 px icon. | 2.4.7 | Major | Fixed: focus ring in the action colour | |
| 2 | All pages with a term tip | An open tip could be closed only by moving focus or the pointer away. | 1.4.13 | Minor | Fixed: Escape hides it, focus stays | |
| 3 | Publish to suppliers, Forecast quality, Model backtest, Supplier reliability | A closed tip was an invisible 256 px box that still took width. These pages scrolled sideways at 390 and 768 px. | 1.4.10 | Major | Fixed: closed tip is `display: none`, open tip capped to screen width | |
| 4 | All pages with a term tip | The info button's target was 12×12 px. | 2.5.5 (AAA), brief's 44 px on touch | Minor | Fixed: 24 px hit area, 44 px on touch, layout unchanged | |
| 5 | Pages whose Data health chip shows failing checks (shared `DataHealthChip`) | The "See Data health" link used `text-action`, which measures 4.41:1 on the page background. | 1.4.3 | Minor | Fixed: `text-action-hover` | |
| 6 | This week and the 4 Weekly plan pages (shared `CycleSteps`) | At 768 px, 5 columns of about 84 px each pushed step names out of their boxes. | 1.4.10 | Minor | Fixed: 1, 2, 3 columns, then 5 from `xl` | |
| 7 | Publish to suppliers, Forecast quality | The content under the tab list was not a tab panel. | 1.3.1 | Minor | Fixed: `role="tabpanel"` named by the active tab | |
| 8 | All 13 pages (shared `AppShellV2`) | The menu is a fixed 240 px and the main area has 32 px padding. At 390 px a page gets 86 px of width; at 768 px it gets 458 px. | 1.4.10 | Major | Fixed in #155 | Below 1024 px the menu is a drawer opened by the top bar's ☰ button (it closes on a pick, Escape or backdrop; focus returns to ☰), and the page padding is 16 px on phones. At 390 px the page gets the full width. #156 then fixed Supplier performance, whose screen-reader chart tables widened the page to 513 px: their cards now clip them. |
| 9 | Forecast quality | An arrow key or click on a tab dropped focus to the page body. Each tab mounts its own frame and tab list. | 2.1.1, 2.4.3 | Major | Fixed: new frame focuses its active tab | |
| 10 | What to order | The "Why this quantity" buttons and 3 links used `text-action`: 4.21:1 on a hovered row, 4.41:1 on the page background. | 1.4.3 | Minor | Fixed: `text-action-hover` | |
| 11 | What to order | The reason a row has "No agreement" instead of a draft act was only in a hover `title`. | 1.3.1 | Minor | Fixed: reason also in screen-reader text | |
| 12 | Make warehouse room | The disabled "Mark as taken to SAP" and "Send change to supplier" were not linked to the reason beside them or the reason above the table. | 4.1.2 | Major | Fixed: `aria-describedby` to both | |
| 13 | Make warehouse room | "Save decision" was disabled with no stated reason before an option was chosen. The refusal text was not linked to it. | 4.1.2, 3.3.2 | Minor | Fixed: reason linked in both states | |
| 14 | Make warehouse room | On the decision note field, focus showed only as a 1 px border tint. Its required/optional hint was not linked. | 2.4.7, 3.3.2 | Minor | Fixed: focus ring, hint linked | |
| 15 | Make warehouse room, Material requirement | Row checkboxes are 13×13 px. | 2.5.5 (AAA), brief's 44 px on touch | Minor | Fixed in PR_REF | On coarse pointers the checkbox's `<label>` carries the shared `.touch-target` class (`src/index.css`): an invisible `::before` at least 44×44 px. The drawn checkbox and table density are unchanged; mouse pointers match no rule. |
| 16 | Publish to suppliers | The "Show weeks" toggle did not say whether its weeks were shown. | 4.1.2 | Minor | Fixed: `aria-expanded` | |
| 17 | Supplier responses | On the 2 filter selects, the move-to select and the note field, focus showed only as a border tint. | 2.4.7 | Minor | Fixed: focus ring | |
| 18 | Supplier responses | The disabled confirm in the action panel did not name the missing note or supplier. | 4.1.2 | Minor | Fixed: reason linked | |
| 19 | Supplier responses | The rule for the Due column is only in a hover `title` on its header. | 1.3.1 | Minor | Not fixed | A sentence in a header cell is read on every cell. A visible note needs a copy decision. |
| 20 | Supplier performance | On the supplier select, focus showed only as a border tint. | 2.4.7 | Minor | Fixed: focus ring | |
| 21 | Supplier performance | The radar and 12-month trend charts had no text alternative. The trend figures appear nowhere else. | 1.1.1 | Major | Fixed: a screen-reader table under each chart | |
| 22 | Forecast quality | The bias link and the Model backtest link used `text-action` (4.41:1). | 1.4.3 | Minor | Fixed: `text-action-hover` | |
| 23 | Forecast quality, Material requirement, Safety stock, Data health, Model backtest | The selected row was marked with `aria-selected`, which a plain table row does not expose. | 4.1.2 | Minor | Fixed: `aria-current` | |
| 24 | Forecast quality (range week select, 5 bias-tab fields) | Focus showed only as a border tint. | 2.4.7 | Minor | Fixed: focus ring | |
| 25 | Forecast quality, bias tab | "Record override" was disabled with no reason. The reason hint was not linked to its select. | 4.1.2, 3.3.2 | Minor | Fixed: both linked | |
| 26 | End-of-cycle stock check | The max-stock Save was disabled on an empty field with no reason. The error was not linked to the field. Focus showed only as a tint. | 4.1.2, 3.3.1, 2.4.7 | Minor | Fixed: reason linked, focus ring | |
| 27 | Material requirement | The reason for the "Review" flag was only in a hover `title`. | 1.3.1 | Minor | Fixed: reason also in screen-reader text | |
| 28 | What to order, End-of-cycle stock check, Material requirement, Supplier reliability | The set-max-stock, gross-quantity and Why this quantity text buttons were 16 to 20 px tall. The sort button had no touch minimum. | Brief's 44 px on touch | Minor | Fixed: 44 px hit area on touch screens | |
| 29 | All 13 pages ("About this page") | The section toggle had no minimum height on touch screens. | Brief's 44 px on touch | Minor | Fixed: taller on touch screens only | |
| 30 | What to order, Make warehouse room, Publish to suppliers, Forecast quality (shared `FilterChipsBar`) | The chips are a radio group, but arrow keys do not move between them. | 2.1.1 (ARIA radio pattern) | Minor | Fixed in PR_REF | The group is one Tab stop (roving `tabIndex`); Left/Up and Right/Down move focus and selection with wrap; Home/End go to first/last. Multi-select chips keep one Tab stop each. |
| 31 | All 13 pages (shared `Button`) | Buttons are 40 px tall, under 44 px on touch. | Brief's 44 px on touch | Minor | Fixed in PR_REF | `Button` carries `.touch-target`: on coarse pointers the tap area is at least 44×44 px; the drawn button stays 40 px and desktop is unchanged. |
| 32 | All pages with fields | The field border (`border-input` #D1D8E0) measures 1.4:1 on white. | 1.4.11 | Minor | Fixed in PR_REF | Owner approved `border-input` #8291A0: 3.23:1 on white, 3.12:1 on `bg-page` #FAFBFC. |
| 33 | All 13 pages (`AboutThisPage`, other collapsed sections) | An `h2` inside `<summary>` can lose its heading role, because a summary's children are presentational to some screen readers. | 1.3.1 | Minor | Not fixed | Restructuring changes every page's heading outline. Heading order is otherwise correct. |

## Re-check after the fixes

Same build steps and scripts on the branch:
- **1440 px:** every page has a visible focus indicator on every control. Text contrast failures are 0. Every disabled act has a description. A Tab walk reaches every control in order with no trap.
- **768 px:** no page scrolls sideways.
- **390 px, collapsed menu simulated:** no page scrolls sideways.
- **375 px mobile preset:** the term tip's hit area is 44 px.
- **Forecast quality:** the arrow key keeps focus on the tab reached.
- **Term tip:** Escape hides the tip and keeps focus.
