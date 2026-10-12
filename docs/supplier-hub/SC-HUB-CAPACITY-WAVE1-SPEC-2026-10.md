# CAP-1 wave 1: week-as-column for Demand forecast, PTI Capacity and supplier Capacity

| Field | Value |
|---|---|
| Status | **Accepted 2026-10-12.** The owner accepted the recommendations for W1-Q1 to W1-Q3 (section 8). **Built in PR #191, merged 2026-10-12** (`main` at `a5eaac3`) |
| Date | 2026-10-12 |
| Parent | `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` CAP-1 (BL-170), decisions CAP-D1 to CAP-D8 accepted 2026-10-12 |
| Code read | `main` at `748d595` |
| In this wave | One shared `WeekGrid` component, and the three tables the owner showed: (A) Demand forecast SKU detail, (B) PTI Capacity, (C) supplier Capacity |
| Not in this wave | The Weekly/Monthly toggle (CAP-2, BL-171, the next PR on top of `WeekGrid`); Force Majeure and Discontinued (CAP-4, BL-173, which only add options to the reason row built here); the other 7 time-series tables (waves 2 and 3, each confirmed by the owner first) |

**Tags.** [Code] = today's behaviour, cited `path:line` under `src/pages-v2/`. [Spec] = what this wave builds. A figure is unchanged unless the row says otherwise.

---

## 1. What changes for the user, in one picture

Today each table is a week per row. After this wave each table is a metric per row, with weeks running left to right.

```
TODAY (supplier Capacity, 13 rows + header)        WAVE 1 (6 rows + header)

WEEK OF   LTP    ALLOC   ADD.   BE      CHECK      METRIC (pcs) │ W36 31 Aug │ W37 07 Sep │ W38 14 Sep │ W39 … →
31 Aug  76,700  [90000] [    ] 90,000  Within      ─────────────┼────────────┼────────────┼────────────┤
07 Sep  72,800  [90000] [    ] 90,000  Within      LTP          │   76,700   │   72,800   │   72,800   │
14 Sep  72,800  [60000] [    ] 60,000  Cannot…     Allocated    │  [90000]   │  [90000]   │  [60000]   │
21 Sep  69,400  [90000] [    ] 90,000  Within      Additional   │  [     ]   │  [     ]   │  [     ]   │
28 Sep  72,800  [90000] [    ] 90,000  Within      BE           │   90,000   │   90,000   │   60,000   │
05 Oct  77,900  [90000] [10000]100,000 Within      LTP check    │  Within    │  Within    │ Cannot be  │
…  (7 more rows)                                   Reason       │     —      │     —      │ [Material▾]│
```

The table height drops from 13 or 26 rows to 6 to 8 rows. On PTI Capacity, where one table repeats per supplier, an open accordion goes from about 14 rows to 8.

---

## 2. The shared `WeekGrid` component [Spec]

One component in `src/components/ui-v2/WeekGrid.jsx` renders all three tables. Each page passes its weeks and a list of row definitions; the component owns layout, scrolling, headers and accessibility.

### 2.1 Layout

| # | Rule |
|---|---|
| G-01 | Rows are metrics, columns are weeks, oldest on the left. |
| G-02 | **Label column**, sticky on the left: the metric name, then its unit in grey (e.g. "LTP, current forecast · pcs"). Width 220 px on desktop, 140 px under 768 px, text wraps to 2 lines. |
| G-03 | **Week header**, two lines: `W36` (ISO week, bold) above `31 Aug` (the Monday). The header row stays visible while the card scrolls sideways. |
| G-04 | **Current week** column: its header reads "This week" under the date, and the column has a 2 px action-blue top border. |
| G-05 | **Week columns** are at least 112 px wide (fits `100,000`, a status pill, and the reason select). Numbers are right-aligned in monospace, as today. |
| G-06 | The grid scrolls **horizontally inside its card**; the page itself never scrolls sideways. A soft shadow on the right edge shows when more weeks are hidden; one on the left edge once the user has scrolled. |
| G-07 | On load the grid is scrolled so the **current week is the first column after the label column**. In all three wave 1 tables the horizon already starts at the current week, so the grid opens at its left edge. |
| G-08 | A **column state** (gap, drill-down highlight) applies to the whole column: an amber tint for a gap week, a 1 px blue inset ring for a drilled-to week. Today the same states colour a row [Code: `BuyerCapacity.jsx:414`, `SupplierCapacity.jsx:267-271`]. |
| G-09 | A **per-week marker** that sat in the week cell today (the "Re-enter" pill) moves into that week's header, under the date. |
| G-10 | Rows can be hidden when their data is absent (e.g. Theta when the SKU has none). A hidden row leaves no gap. |

### 2.2 Interaction

| # | Rule |
|---|---|
| G-11 | **Tab order runs along a row**: Allocated W36 → W37 → … → W48, then Additional W36 → … → W48, then the reason selects that are shown, left to right. Today it runs down a week (Allocated, Additional, Reason, next week). |
| G-12 | **Enter** in an input moves to the same row's next week [Spec, matches the row-wise Tab order]. |
| G-13 | Focusing a cell that is scrolled out of view scrolls it into view, keeping the label column visible. |
| G-14 | Mouse wheel scrolls vertically as usual; Shift + wheel and trackpad swipe scroll sideways. |

### 2.3 Accessibility

| # | Rule |
|---|---|
| G-15 | It is a real `<table>`: the label cells are `<th scope="row">`, the week headers `<th scope="col">`, so a screen reader reads "Allocated, week 36, 31 August, 90,000". |
| G-16 | Each input keeps today's label, e.g. "Allocated for 31 Aug 2026" [Code: `SupplierCapacity.jsx:281`]. |
| G-17 | The scroll container has `tabIndex=0` and the name of the table, so a keyboard user can scroll it with the arrow keys. |

### 2.4 What does not change

- Every figure, pill, colour rule and refusal is computed by the same code as today; only where it is drawn changes.
- Page headers, filters, help text, the Submit button and the toasts stay where they are.
- Test ids keep the week in their name (`capacity-ltp-<plan>-<week>`, `df-week-forecast-<week>`), now on cells instead of rows. Ids that named a row (`capacity-week-<week>`, `df-week-<week>`) move to the week's header cell.
- The four copies of `weekLabel` stay in the wave 2 pages for now; `WeekGrid` has its own and wave 2 retires the copies.

---

## 3. Table A: Demand forecast, SKU detail (PTI)

**Where.** `/buyer/demand-forecast`, the "Weeks" card under the chosen SKU [Code: `BuyerDemandForecast.jsx:120-190`]. 26 weeks [Code: `services/engine/demandForecast.js:69`].

**Today.** 26 rows inside a box capped at 384 px high with its own vertical scroll (`max-h-96`), so the planner scrolls inside the card and then the page.

**Wave 1 rows**, top to bottom:

| Row | Cell content | Notes |
|---|---|---|
| Method's forecast | the method's value | as today's "Method's forecast" column |
| Reconciled | the reconciled value; when a planner override is in force, a second line in grey "Overridden · engine 23,000" | the override line wraps inside the 112 px column |
| P50, P90 (one row per band) | the band's value or "—" | rows come from the run's bands, as today's columns do |
| Theta (alternative) | grey value | row shown only when the SKU has Theta (G-10) |
| SAP's plan | value or "—" | |
| Events | event names, comma separated, wrapping to at most 3 lines; longer lists end in "+n" with the full list on hover | today "Double-date promotion" fits one wide cell |

**Rules.**

- A-01. The inner 384 px vertical scroll box is removed: 6 to 8 rows need none.
- A-02. The method line above the grid ("Comb: the average of …", "No seasonality found …") stays above it.
- A-03. The Reconciled row is visually the main row: labels in semibold, values in data-navy as today; the others in regular weight.

**Acceptance.**

- A-AC1. For SYN-FG-001, the W36 column reads Method's 24,299, Reconciled 23,814, P50 22,744, P90 27,504, Theta 25,039, SAP 24,901, Events "Payday", the same as today's first row.
- A-AC2. The card has no vertical scrollbar of its own.
- A-AC3. An overridden week shows the engine's value under the reconciled one, in that week's column only.

---

## 4. Table B: PTI Capacity (PTI)

**Where.** `/buyer/capacity`, inside each supplier × planning group accordion [Code: `BuyerCapacity.jsx:311-470`]. 13 weeks [Code: `services/transitions/inventoryConfig.js:139`].

**Wave 1 rows**, top to bottom (each label carries the plan's unit, e.g. pcs):

| Row | Cell content |
|---|---|
| LTP, current forecast | LTP of the week |
| Allocated | stated allocation, or grey "Not stated" |
| Additional capacity | stated additional capacity, or "—" |
| BE = capacity + additional | BE, or "—" |
| LTP against capacity | the pill: Within capacity, Needs additional capacity, Cannot be supplied |
| Short by | the gap in bold amber on a gap week, otherwise "—" |
| Reason | the supplier's reason name (and its note after a dash), otherwise "—" |

**Rules.**

- B-01. The accordion header is unchanged: supplier, planning group, status pill, "Weeks below the LTP: n", the red and amber week counts, last submitted [Code: `BuyerCapacity.jsx:320-368`].
- B-02. A gap week tints its whole column amber (G-08), and its "Short by" cell stays bold.
- B-03. A week flagged for re-entry shows the "Re-enter" pill in its header (G-09).
- B-04. **Filters now hide columns, not rows.** "Gaps only" shows only the gap weeks' columns; a drill-down from a PO shows only the drilled weeks' columns [Code: `BuyerCapacity.jsx:407-408`]. When a filter leaves no week, the accordion shows "No week matches the filters" instead of an empty grid.
- B-05. The two help lines ("Additional capacity is what …", "LTP is the current forecast …") stay above the grid.
- B-06. Several accordions can be open at once, as today; each grid scrolls on its own.

**Acceptance.**

- B-AC1. For PT Sample Packaging Indonesia, the W38 (14 Sep) column reads LTP 72,800, Allocated 60,000, Additional —, BE 60,000, "Cannot be supplied", Short by 12,800, Reason Material, and the column is tinted.
- B-AC2. With "Gaps only" ticked, that accordion shows the W38 column alone.
- B-AC3. An open accordion is 8 rows tall (header + 7) whatever the horizon.

---

## 5. Table C: supplier Capacity (supplier, editable)

**Where.** `/supplier/capacity`, one table per planning group tab [Code: `SupplierCapacity.jsx:254-385`]. 13 weeks.

**Wave 1 rows**, top to bottom:

| Row | Cell content |
|---|---|
| LTP, current forecast | LTP of the week (read only) |
| Allocated | number input, pre-filled as today |
| Additional capacity | number input, optional |
| BE = capacity + additional | the stated BE, or "—" (read only) |
| LTP against capacity | the pill, recalculated as the supplier types, as today |
| Reason | in a week where allocated is below demand: the reason select, and under it a note input when the reason is Other. In other weeks: "—" |

**Rules.**

- C-01. Inputs are 96 px wide inside the 112 px column, right-aligned.
- C-02. The reason select appears in a week the moment allocated drops below demand, and disappears when it rises again, as today [Code: `SupplierCapacity.jsx:264`]. The Reason row is always present so the grid does not jump.
- C-03. When a week needs a reason and has none, Submit stays disabled and the line under the grid names the week ("The week of 14 Sep 2026 is below the LTP. Choose a reason."), as today [Code: `SupplierCapacity.jsx:361-371`; `lib/i18n/inventoryCapacity.js:349`]. **New:** the week in that line is a link that scrolls to the week's column and focuses its select (G-13), since that column may be off screen.
- C-04. A week below demand tints its column amber; a drilled-to week has the blue ring (G-08).
- C-05. Tab runs along each row (G-11), so a supplier types 13 allocations in a row without touching the mouse.
- C-06. Submit, the planning group tabs, the status line, the materials list and the two help lines stay where they are.
- C-07. When the seat may not submit, inputs are disabled as today, and the handoff notice is unchanged.

**Acceptance.**

- C-AC1. A supplier types 90000 into Allocated W36 and presses Tab: the cursor goes to Allocated W37.
- C-AC2. Typing 60000 in W38 shows the reason select in W38 only, and the W38 column turns amber; changing it back to 90000 removes both.
- C-AC3. With no reason in W38, Submit is disabled, the line names 14 Sep 2026, and clicking the date focuses the W38 select.
- C-AC4. After submit, the PTI Capacity grid for the same supplier shows the same figures, week for week.

---

## 6. Checks before merge

| Check | How |
|---|---|
| Same figures | For each table, a test renders the old fixture and asserts every (metric, week) cell equals the value today's row showed. One test per table, every week, every metric |
| Tab order | A test tabs through supplier Capacity and asserts the focus sequence row by row |
| Filters | PTI Capacity "Gaps only" and drill-down show exactly the expected week columns |
| No page scroll | At 1280 px and 375 px wide, `document.scrollingElement.scrollWidth` equals the viewport width |
| Accessibility | Each value cell is reachable with its row and column headers (G-15) |
| Both languages | Labels, "This week" and "No week matches the filters" exist in EN and ID |
| Screenshot | Before and after of the three tables, attached to the PR |

## 7. Build order

1. `WeekGrid` with its own tests (layout, sticky, scroll-to-current, tab order, column states).
2. Table A, read only, the simplest.
3. Table B, read only with filters.
4. Table C, editable.

One PR for the four steps, as they share the component and its tests. CAP-2 (monthly toggle) follows as a separate PR on the same component.

## 8. Decisions (accepted 2026-10-12)

| # | Question | Recommendation | Outcome |
|---|---|---|---|
| W1-Q1 | Is a 112 px week column right, given 13 weeks becomes ~1,700 px of grid (about 9 weeks visible on a laptop)? | Yes. Smaller columns can't fit the reason select | Accepted, 2026-10-12 |
| W1-Q2 | On PTI Capacity, should "Gaps only" hide the other weeks (as specified), or keep them and dim them? | Hide, as it does today with rows | Accepted, 2026-10-12 |
| W1-Q3 | Should "Reconciled" be the first row on Demand forecast, since it is the figure that is used? | Keep today's order (Method's, then Reconciled) so the eye reads method → result; Reconciled is bold | Accepted, 2026-10-12 |
