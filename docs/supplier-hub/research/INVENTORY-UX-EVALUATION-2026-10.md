# Inventory & Capacity Collaboration: UX evaluation, PTI and supplier (2026-10)

- **Checkout evaluated:** `main` at `8ea2eba7` ("Merge MR !14: RFx UX wave 2"), in a separate worktree. `src/` was not changed.
- **How it was run:** `npm run build` (Node 24) passed; `vite preview` on port 5341; headless Chromium at 1440×900. PTI with `paragon.hubRole = MP` ("Menu for: Material Planner"); supplier through the sidebar toggle (sup-007, PT Sample Packaging Indonesia, seat holding the Fulfilment lane among others). English throughout, with an Indonesian pass on supplier Stock, To do, Capacity and PTI Inventory, Alerts and Stock simulation.
- **What was done in the session (mock stores, reset on reload):** PK-CAPF-8820 entered on screen with 2 batches; PK-PETB-8810 sent by template (2 batch rows); three refused uploads (wrong column, `1.500`, bad dates); Rigid plastic packaging capacity re-submitted with a W38 shortfall, a reason and confirmed additional capacity; sup-007's PTI stock access removed, then granted for all materials; 18 alert deep links followed.
- **Prior state read:** REQ-E08-01 to 08, CR-01/02/03/18/19/24, MR-1 to MR-10, CAP-1 to CAP-12, BUILD-GAP, SCENARIOS UC6/UC7, BACKLOG, the Forecast and RFx evaluations. A finding that repeats a BL item names it.
- **Evidence format:** `file:line` is relative to `paragon-supplier-portal/src/`. "Screen" means the route as rendered on 31 Aug 2026, the hub's pinned date.

---

## 1. VERDICT

**PTI:** a planner can see every figure the requirements ask for, but the risk class sits off-screen, and no page turns an alert, a gap or a negative figure into the next action.

**Supplier:** a supplier can send stock and capacity, and every refusal is worded well, but the Stock page buries its own table under six panels and gives two deadlines for one update.

1. **The decision column is off-screen.** On Inventory, "Days of supply" (risk) starts at x=1725 in a 1134 px table; at 1440 px only scrolling right shows it (`pages-v2/BuyerInventory.jsx:368-389`).
2. **Alerts end at "Open inventory".** 35 open alerts on 19 materials, up to 5 per material, each with one link and no next step (`pages-v2/BuyerAlerts.jsx:455-471`); the inventory row then has no action.
3. **The supplier's table starts 2,488 px down** a 3,201 px page (`pages-v2/SupplierInventory.jsx:249-279`).
4. **Numbers read two ways in Indonesian:** "85,000 PCS" beside an entry hint that uses a decimal comma, "2,5" (`pages-v2/inventory/inventoryDisplay.jsx:35`, `lib/i18n/inventoryCapacity.js:684`).

---

## 2. SCREEN MAP

| # | Persona | Route | First-time guess | What it actually does | State shown | Next action shown | Who acts next |
|---|---|---|---|---|---|---|---|
| 1 | PTI | `/buyer/home` My tasks | Inbox | 16 task rows; "17 High-risk inventory and capacity alerts", "2 Suppliers with capacity below demand" | Urgent / due soon; cover line instead of a date on the alert row | Open | PTI |
| 2 | PTI | `/buyer/inventory` | Stock list | Banner (High 8, no lead time 1, stale 5), API sync list, RM/PK tabs, 11-column table | Risk pill, Out of date, This cycle "2 of 3" | Record stock from a supplier message; Sync | PTI; supplier not named |
| 3 | PTI | Inventory incoming panel | Delivery detail | Per-date in production and in transit, call-off references linked | Dates, quantities | Links to call-offs or shipments | None stated |
| 4 | PTI | `/buyer/stock-simulation` | What-if | Supplier available, called off not shipped, free to call off, PTI inbound; 3 labelled sample rows on top | Free to call off, negative in 3 rows, no flag | Create call-off; Create PO request on every row | PTI |
| 5 | PTI | Simulation row detail | Calculation | "How the figures are built" list and 13 weekly rows; planner inputs | Week figures | Enter stock on hand / in production | PTI |
| 6 | PTI | `/buyer/call-offs` from simulation | New call-off | Opens a pre-filled dialog where an agreement line exists; otherwise "No agreement line" | Remaining on line | Save as draft; Release to supplier | PTI |
| 7 | PTI | `/buyer/capacity` | Capacity overview | 15 supplier × group rows, 11 Not started; week grid per row; buffers below | Gap, Cannot be supplied, Confirmed additional | Filters only | Not stated |
| 8 | PTI | `/buyer/alerts` | Alert inbox | 35 open alerts grouped by supplier, rule sentence, cover basis | High 17 / Medium 11 / Low 7 | Open inventory / capacity; Close alert | PTI |
| 9 | PTI | `/buyer/supplier-access` | Permissions | Supplier list, access pill, materials supplied, access log | "Materials: 2" without names | Grant / Change access; Remove in panel | PTI |
| 10 | PTI | `/buyer/admin/suppliers` (avatar menu) | Supplier master | Stock update mode per supplier with change form and history | 22 suppliers, 2 on API | Save mode; Change | Hub administrator |
| 11 | PTI | `/buyer/admin/planning-groups` (avatar menu) | Group setup | Create, rename, move materials, retire; 9 default groups | Active | Create group; Move materials | Material Planning |
| 12 | Supplier | `/supplier/home` To do | Inbox | Weekly stock panel, 20 task rows by lane, "Alerts about your materials" at the bottom | "Due Thursday 3 Sept · 3 d 4 h left" and "Overdue 18 days" | Enter stock; Open | Supplier |
| 13 | Supplier | `/supplier/inventory` Stock | My stock | Weekly panel, feedstock confirm table, banner, PTI stock refresh, template guide, incoming cards, then the table | 2 of 4 updated; Missed 2 | Enter stock; Confirm; Upload filled template | Supplier |
| 14 | Supplier | Enter stock panel | Form | Material, SOH, ROP, in production and date, in transit read-only, batches | Inline refusals | Save stock | Supplier |
| 15 | Supplier | `/supplier/capacity` | Capacity form | One tab per planning group; 13-week grid, 8 visible; LTP, allocated, additional, BE, state, reason | Gap / Not started; Last submitted | Submit capacity | Supplier, then not stated |

---

## 3. FLOW TRACE

### 3.1 Weekly stock update (reached "4 of 4 updated" and PTI's view)

1. Supplier · To do: the panel says "due Thursday 3 Sept 23:59 WIB · 3 d 4 h left"; the Stock lane row says "Due 13 Aug 2026 · Overdue 18 days" for the same 2 materials (S-02).
2. Supplier · Enter stock (from "Enter stock" beside PK-CAPF-8820, material pre-selected): `1.500` refused with a clear sentence; a batch with no number disabled Save with no message (S-08).
3. Supplier · Save stock: toast "Stock saved", panel 3 of 4; nothing says PTI now sees it (S-11).
4. Supplier · Stock template: the downloaded file lists all 4 materials; one filled (2 batch rows, manufacturing dates) → "Materials saved: 1 · Rows not saved: 3 · Stock on hand is required", 560 px under the button (S-03).
5. Supplier · weekly panel: "4 of 4 updated · Every material is updated for this cycle". Clean.
6. PTI · Inventory: PK-CAPF-8820 reads 1,500 PCS, "4 of 4", "0 days · High"; risk only after scrolling right (P-01).
7. PTI · Alerts: both "out of date" alerts gone with no trace; a new High coverage alert for PK-CAPF-8820 (P-11).

Refused paths seen: `1.500` (manual and template), batch total, manufacturing date in the future and after expiry (manual and template, each named per row), wrong column header (reported as "Stock on hand is required", S-09), stale figure ("Missed", "Out of date", "Kedaluwarsa" in Indonesian, X-02).

### 3.2 Capacity (reached PTI's view of the gap; follow-up not possible)

1. Supplier · To do "Capacity confirmations due" → Capacity, Closures tab: LTP 0 in all 13 weeks (S-06).
2. Supplier · Rigid plastic packaging tab: 8 of 13 weeks visible; tabs carry no status (S-05).
3. Supplier · W39 below the LTP with no reason: "The week of 21 Sept 2026 is below the LTP. Choose a reason.", Submit disabled. Clean. "Other" without a note: refused by name. Clean.
4. Supplier · W38 additional capacity 21,840 and "Confirm additional capacity" → Submit capacity: toast; pill still "Gap" (S-07).
5. PTI · Capacity: "Gap · Confirmed additional: 1 wk"; the row reads "Production limit (allocated capacity) · Provisional" where the supplier typed "Allocated" (X-04).
6. PTI · Alerts: "Allocated capacity is below the LTP · Rigid plastic packaging · Cover 4 days · Lead time 14 days" (P-08); "Open capacity" lands on W38 filtered. Clean.
7. PTI · follow-up: no control on Capacity or Alerts to accept the additional capacity, ask the supplier or move demand (P-07).

### 3.3 Stock-out risk and supplier access (reached access granted and removed)

1. PTI · Alerts: High "Supplier stock and incoming do not cover the next 30 days" for PK-PETB-8802, two more alerts on the same material (P-03, P-04).
2. PTI · Open inventory: the row is highlighted (18 of 18 deep links tested land on their row); the row has no link or button (P-02).
3. PTI · Incoming panel (PK-PETB-8801): dated split with call-off links. Clean.
4. PTI · Stock simulation, reached through the menu and a new search: Free to call off −121,000 PCS, Flags "—" (P-05).
5. PTI · Create call-off: lands on Call-offs with "No agreement line for sup-007 · PK-PETB-8802" (P-06).
6. PTI · Supplier access: "Materials: 2" without names; Remove access acts at once (P-13).
7. Supplier · Stock: PTI columns, note and refresh panel are gone with no message (S-10).
8. PTI · grant every material → Supplier · Stock: PTI stock on all 4 rows, "PTI shares its stock with you for every material you supply". Clean.

---

## 4. FINDINGS

### 4.1 PTI

- **P-01** · Major · high · Inventory visibility; visual hierarchy · `/buyer/inventory`
  Evidence: 11 columns; at 1440 px, Incoming starts at x=1571, Days of supply 1725, Last update 1944; the container is 1134 px wide (`BuyerInventory.jsx:368-389`). PIC takes 342 px for its synthetic-data badge; rows repeat "Feedstock not confirmed" and "System: no figure".
  Problem: risk and freshness, the reasons to open the page, need a horizontal scroll.
  Recommendation: put risk and supplier cover second; move PIC, This cycle, supplier ROP, system ROP and feedstock into the row detail. Mockup `P-01-inventory-risk-first.html`.

- **P-02** · Major · high · Inventory visibility; navigation · `/buyer/inventory` row
  Evidence: the row holds only the incoming button (`BuyerInventory.jsx:403-473`); on PK-PETB-8802 the row had no link or button at all (screen). Stock simulation reads `?q=` (`BuyerStockSimulation.jsx:65`) but nothing links to it; no row shows its alerts.
  Problem: UC7's path (alert → material → simulation → call-off) needs the menu and a second search at each step.
  Recommendation: a row opens a material drawer: why the class, open alerts for the pair, figures, and actions "Open stock simulation", "Create call-off" or "Create PO request", "Record stock".

- **P-03** · Major · high · Alerts · `/buyer/alerts`
  Evidence: each alert shows the rule sentence, cover basis and one link, "Open inventory" (`BuyerAlerts.jsx:395-471`). Days to impact is computed (`services/transitions/inventoryAlertRules.js:368-380`) and sorted on, never shown.
  Problem: "High" says nothing about what to do or by when; REQ-E08-05's own planner step (bring a call-off forward) has no path from the alert.
  Recommendation: per rule, a one-line next step, days to impact, and the action that fits ("Create call-off", "Ask supplier", "Open stock simulation"). Mockup `P-03-alerts-next-step.html`.

- **P-04** · Major · high · Alerts · `/buyer/alerts`
  Evidence: 35 open alerts on 19 positions; RM-STEAR-7300 carries 5 (commitment, projected stock-out, coverage, PTI below ROP, supplier below ROP), RM-EMUL-9430 3, each with its own "Close alert" (screen). REQ-E08-05 edge case: group many alerts from one cause.
  Problem: the planner reads five sentences and closes five records for one decision; the High count (17) overstates distinct problems.
  Recommendation: one card per supplier × material listing its rules, one next step, one close with reason.

- **P-05** · Major · high · Stock simulation · `/buyer/stock-simulation`
  Evidence: Free to call off −108,100 PCS (PK-PETB-8801), −121,000 PCS (PK-PETB-8802), −800 KG (sample row) with Flags "—" and the same "Create call-off" button as every other row (`BuyerStockSimulation.jsx:404-409, 436-468`).
  Problem: a negative figure means PTI has called off more than the supplier holds; the screen neither says so nor stops a further call-off.
  Recommendation: show "Over-called by 121,000 PCS" in red with one line on what it means; replace "Create call-off" with "Ask supplier for a production date" on such rows.

- **P-06** · Major · high · Stock simulation; navigation · Stock simulation → Call-offs
  Evidence: "Create call-off" is rendered on every row (`BuyerStockSimulation.jsx:141-144, 445-456`). For sup-007 × PK-PETB-8802 it lands on "No agreement line for sup-007 · PK-PETB-8802"; for PK-PETB-8801 it opens a pre-filled dialog (screen).
  Problem: the offered action is a dead end for pairs without a blanket PO; the planner learns this only after leaving the page.
  Recommendation: show "Create call-off" with the remaining quantity where an agreement line exists; otherwise make "Create PO request" the outline action.

- **P-07** · Major · high · Capacity · `/buyer/capacity`, `/buyer/alerts`
  Evidence: the page is filters, pills and a read-only grid (`BuyerCapacity.jsx:576-662`); W38 "Cannot be supplied" and later "Needs additional capacity · Confirmed additional" offer no control. REQ-E08-04 BR-10: above BE "the planner acts (bring demand forward, split to another source, or cut)".
  Problem: flow 3.2 cannot finish in the hub; PTI sees the gap and must leave to act.
  Recommendation: per gap week, "Accept additional capacity", "Move demand" (to Commitments & gaps) and "Ask supplier", each recorded on the week.

- **P-08** · Major · medium · Inventory visibility; alerts · Inventory, Alerts
  Evidence: "Days of supply" (`lib/i18n/inventoryCapacity.js:38`) never says whose stock. "PTI stock is below the PTI reorder point" for PK-PETB-8801 is Medium with "Cover 17 days" while PTI holds 30,000 against ROP 40,000; the capacity alert shows "Cover 4 days · Lead time 14 days" (screen). BL-68 is open.
  Problem: PTI-stock and capacity alerts take their class from supplier cover, so urgency reads wrong.
  Recommendation: label it "Supplier cover"; show each rule's own basis (PTI stock vs ROP, short by, first gap week) until BL-68 is decided.

- **P-09** · Major · medium · Stock simulation · simulation row detail
  Evidence: on PK-PETB-8801, CO-2026-0002 (15,000) and CO-2026-0005 (10,500) are listed both under "Called off, not shipped" and "In transit to PTI" (screen). Shipped quantity is read only from ASNs (`services/transitions/simulateSupplierStock.js:542-570`), so a dispatched call-off without an ASN counts as not shipped.
  Problem: Free to call off is 25,500 PCS lower than the supplier's real position; the planner may raise a PO that is not needed.
  Recommendation: count dispatched call-offs as shipped; confirm the rule with Material Planning (open question 7).

- **P-10** · Minor · high · Stock simulation · `/buyer/stock-simulation`
  Evidence: the first three rows are labelled samples ("requirements worked example", "walkthrough case 2", "case 3"); case 2 shows RM-EMUL-9430 under PT Sample Specialty Fats, which supplies no such material on Inventory (screen). BL-148.
  Problem: a first-time planner reads sample figures before real ones.
  Recommendation: decide BL-148; if kept, move the samples behind a "Worked examples" toggle.

- **P-11** · Minor · high · Alerts; status · `/buyer/alerts`
  Evidence: after the supplier's update, the two `staleData` alerts for sup-007 left Open; Closed stayed 0 (screen). A `cleared` ledger entry is written only for closed alerts (`inventoryAlertRules.js:681-692`).
  Problem: PTI cannot see that the supplier's update resolved an alert.
  Recommendation: a "Cleared today" list with the time and the record that cleared it.

- **P-12** · Minor · high · Wayfinding · `/buyer/inventory`
  Evidence: the banner counts both tabs ("High risk: 8") while the chip counts the open tab ("High (7)"); banner lines are text, not filters (`BuyerInventory.jsx:198-260`).
  Problem: counts disagree and the banner cannot be acted on.
  Recommendation: make each banner line a filter and say "all types".

- **P-13** · Minor · high · Supplier access · `/buyer/supplier-access`
  Evidence: sup-007 reads "Materials: 2" beside four listed materials; which two shows only in the panel. "Remove access" acts on click (`BuyerSupplierAccess.jsx:147-166, 240-249`).
  Problem: the planner cannot check scope at a glance, and a removal has no restatement.
  Recommendation: mark granted materials in the list; a confirm line "PT Sample Packaging Indonesia stops seeing PTI stock for 2 materials".

- **P-14** · Minor · high · Navigation · avatar menu → Planning groups, Supplier stock update mode
  Evidence: both sit under the user menu (`components/layout-v2/navConfig.js:305-349`); Inventory and Capacity link to neither. Planning groups are Material Planning's (REQ-E08-04 BR-15).
  Problem: a planner who needs to split a group or check a supplier's mode cannot find it from the work pages.
  Recommendation: link "Planning groups" from Capacity and the update mode from the Inventory row detail. BL-144 decides who may change the mode.

- **P-15** · Minor · high · Capacity; work queue · `/buyer/capacity`
  Evidence: 11 of 15 groups "Not started · Not submitted yet" with no due date or chase (screen); My tasks counts "Suppliers with capacity below demand" but not unconfirmed groups.
  Problem: PTI cannot tell which supplier is late or since when.
  Recommendation: "Waiting for supplier since …" and an "Ask supplier" action per group.

- **P-16** · Minor · medium · Stock simulation · `/buyer/stock-simulation`
  Evidence: columns stop at supplier figures and PTI inbound (`lib/i18n/stockSimulation.js:24-33`); no PTI demand, PTI stock or need date.
  Problem: "Free to call off 5,300" cannot be compared with what PTI needs without another page.
  Recommendation: add "PTI need within lead time" beside Free to call off.

- **P-17** · Minor · medium · Status · `/buyer/admin/suppliers`
  Evidence: "The change applies at once" (`lib/i18n/adminSuppliers.js:23-24`); REQ-E08-02 BR-16: a mode change mid-cycle applies from the next cycle.
  Problem: the administrator expects staleness to change now.
  Recommendation: "Applies from the next weekly cycle, Thursday 3 Sept 23:59 WIB".

### 4.2 Supplier

- **S-01** · Major · high · Work queue; visual hierarchy · `/supplier/inventory`
  Evidence: first stock row at 2,488 px of 3,201 (measured). Above it: weekly panel, feedstock table with four "Confirm" buttons, banner, access note, PTI refresh, and template guide and incoming cards, both `details open` (`SupplierInventory.jsx:249-279`; `inventory/StockUploadPanel.jsx:54, 214`).
  Problem: the supplier scrolls three screens to see its own stock, past a second weekly duty whose "Confirm" reads like the stock update.
  Recommendation: weekly status, PTI's questions, then the table; feedstock, template guide and trade names as tabs. Mockup `S-01-supplier-stock-page.html`.

- **S-02** · Major · high · Work queue; status · `/supplier/home`, `/supplier/inventory`
  Evidence: for PK-CAPF-8820 and PK-PETB-8810 the To do row reads "Stock figures to update · Due 13 Aug 2026 · Overdue 18 days · URGENT" (`pages-v2/SupplierHome.jsx:299-308`), the panel reads "Missed: 2 materials" and "due Thursday 3 Sept 23:59 WIB · 3 d 4 h left" (`inventory/WeeklyUpdatePanel.jsx:110-137`).
  Problem: two deadlines for one task; the supplier cannot tell whether it is late.
  Recommendation: one line on both: "This week: 2 of 4 sent · due Thu 3 Sept 23:59 WIB · 2 out of date since 13 Aug".

- **S-03** · Major · high · Stock submission · Stock template
  Evidence: the downloaded template lists every material; with one filled, upload returned "Materials saved: 1 · Rows not saved: 3 · Stock on hand is required" in red (`StockUploadPanel.jsx:154-166, 252-301`). The result sits about 560 px below the button and names no material.
  Problem: the supplier cannot tell whether it must fill every row or whether its upload worked.
  Recommendation: treat a row with no figures as "left blank, not sent" in neutral text; name what was sent; show the result next to the button.

- **S-04** · Major · high · Alerts; work queue · `/supplier/home`
  Evidence: "Alerts about your materials" starts 1,994 px down, after 20 task rows; no To do row or menu badge counts it (`SupplierHome.jsx:566-595`). Each is a rule plus "Open inventory" (screen).
  Problem: the supplier sees PTI's High alerts last and is not told what PTI expects.
  Recommendation: an "Asked by PTI" block at the top of To do and Stock, each line with the ask ("Tell PTI when production starts") and its action.

- **S-05** · Minor · high · Capacity · `/supplier/capacity`
  Evidence: 13 week columns, 8 visible at 1440 px (measured); planning-group tabs carry no status; no way to copy one week to all (BL-65 open).
  Problem: entering 13 weeks needs horizontal scrolling, and the supplier cannot see which group still needs confirming.
  Recommendation: status on each tab ("Closures · Not started"); "Copy W36 to all weeks" once BL-65 is decided.

- **S-06** · Minor · high · Capacity; work queue · To do → `/supplier/capacity?group=pg-MG-21`
  Evidence: "Capacity confirmations due" opens Closures, whose LTP is 0 in all 13 weeks (screen).
  Problem: the supplier is asked to confirm capacity PTI does not need.
  Recommendation: "No PTI demand in the next 13 weeks" and drop the task, or allow a one-click confirm.

- **S-07** · Minor · high · Status; capacity · `/supplier/capacity` after submit
  Evidence: after "Capacity submitted" the pill still reads "Gap" beside "Last submitted 31 Aug 2026, 19:00 WIB" (screen).
  Problem: "Gap" reads like an error the supplier must fix; nothing says PTI received it or who acts next.
  Recommendation: "Sent to PTI 31 Aug 19:00 · W38 uses your additional capacity · PTI decides".

- **S-08** · Minor · high · Stock submission · Enter stock panel
  Evidence: a batch row with no batch number disables "Save stock" with no message (`inventory/StockEntryPanel.jsx:151-153, 158-168`); the batch-total message gives no numbers (`inventoryCapacity.js:227`).
  Problem: the supplier cannot see why Save is grey.
  Recommendation: "Batch number is required" under the field; "Batches add up to 1,400 of 1,500".

- **S-09** · Minor · high · Stock submission · Stock template
  Evidence: a file with "Qty on hand" for column B returned "Row 2 · Stock on hand is required" (screen).
  Problem: the message points at a value, not the header the supplier renamed.
  Recommendation: check headers first: "Column B is headed 'Qty on hand'; expected 'Stock on hand'".

- **S-10** · Minor · high · Supplier access · `/supplier/inventory`
  Evidence: after PTI removed access, the PTI columns, the access note and the refresh panel disappeared with no message (`SupplierInventory.jsx:264-277`; screen).
  Problem: a consignment supplier that relied on PTI stock sees it vanish without a reason.
  Recommendation: one line "PTI stopped sharing its stock on 31 Aug" until the next grant.

- **S-11** · Minor · medium · Status; stock submission · Enter stock panel
  Evidence: button "Save stock", toast "Stock saved" (`inventoryCapacity.js:223, 231`); the table keeps only the latest figure and channel.
  Problem: "Save" can read as a draft; a supplier revising a figure sees no earlier submission.
  Recommendation: "Send to PTI" / "Sent to PTI 19:00 · counts for this week"; a short history in the row.

- **S-12** · Minor · medium · Status · `/supplier/inventory`
  Evidence: "SAP data last updated 10 hours ago." heads the supplier's Stock page (`SupplierInventory.jsx:236`).
  Problem: the supplier's figures are its own, so the banner suggests SAP overrides them.
  Recommendation: drop it from the supplier page, or say which column it applies to.

### 4.3 Both

- **X-01** · Major · high · Language · every inventory and capacity table, Indonesian
  Evidence: `qty` formats with `en-US` (`inventory/inventoryDisplay.jsx:35`; also `StockUploadPanel.jsx:233`), so Indonesian screens show "85,000 PCS", "60,000". The same page's hint says "misalnya 1500 atau 2,5" (`inventoryCapacity.js:684`). `formatNumber` is locale-aware (`lib/format.js:38-41`); the call-off dialog mixes both: "70,000 PCS (Rp 112.000.000)".
  Problem: CR-18 refuses `1.500` because it reads two ways; the display creates the same ambiguity.
  Recommendation: use `formatNumber` for quantities, giving "85.000" in Indonesian.

- **X-02** · Minor · high · Language · Inventory, supplier Stock, Indonesian
  Evidence: "Out of date" is "Kedaluwarsa" (`inventoryCapacity.js:501, 536`), the word used for batch expiry ("Tanggal kedaluwarsa").
  Problem: an Indonesian user reads stale figures as expired stock.
  Recommendation: "Perlu diperbarui" (already used for the supplier filter) or "Usang".

- **X-03** · Minor · high · Work queue · My tasks, supplier To do
  Evidence: rows show a stock cover line in place of a date: "Capacity confirmations due · Cover 0 days · Lead time 14 days", "17 High-risk inventory and capacity alerts · Cover 7 days · Lead time 45 days" (`pages-v2/home/severityDisplay.js:36-41`; screen).
  Problem: the cover belongs to one unnamed material, and the due date disappears.
  Recommendation: keep the due date; add the cover as a second line naming the material.

- **X-04** · Polish · high · Consistency · menus, Capacity
  Evidence: PTI "Inventory" vs supplier "Stock" (both "Stok" in Indonesian, `lib/i18n/hub.js:42, 86`); PTI row "Production limit (allocated capacity)" vs supplier "Allocated" (`lib/i18n/drcBuffers.js:11`); subtitle "per material group" vs filter "Planning group" (`inventoryCapacity.js:283-286`).
  Problem: one figure carries three names across the two personas.
  Recommendation: one term each: "Stock", "Allocated capacity", "Planning group".

- **X-05** · Polish · high · Consistency · Inventory, Alerts, supplier Stock
  Evidence: "6 days · High" above "No lead time · day bands: Critical" (`inventoryCapacity.js:54`).
  Problem: two scales on one cell.
  Recommendation: "No lead time on record: 6 days counts as High".

---

## 5. DESIGN PROPOSALS

- **P-01 · Inventory table.** Change: risk first, fewer columns. Layout: header and meta → 4 summary tiles that filter (High risk, PTI stock below PTI ROP, Out of date, No lead time) → type tabs with "All types" → search and chips → table: Material · supplier, Risk · supplier cover, Supplier stock, PTI stock / ROP (red when below), Incoming, Updated → detail drawer at right. Labels EN/ID: "Risk · supplier cover" / "Risiko · cakupan pemasok", "All types" / "Semua jenis". States: empty "No materials match this view", loading, stale row (amber Updated cell). Replaces the 11-column table and the text banner. Mockup P-01.

- **P-02 · Material drawer.** Change: a row opens one place to decide. Layout: title and supplier → one-sentence reason for the class → 4 figure tiles (supplier stock, PTI stock/ROP, supplier ROP, free to call off) → open alerts on the pair → "What to do" actions. Controls EN/ID: "Open stock simulation" / "Buka simulasi stok", "Create call-off" / "Buat call-off" (only with an agreement line), "Create PO request" / "Buat permintaan PO", "Ask the supplier for a production date" / "Minta tanggal produksi ke pemasok". States: no figures (asks for stock), API supplier (Sync), no agreement line. Replaces the incoming-only side panel. Mockup P-01.

- **P-03 · Alert next step.** Change: each alert says what to do and by when. Layout: card header (class, material, supplier, "Impact in N days") → rule list with each rule's own basis → right block "Next step" sentence → actions. Controls EN/ID: "Create call-off" / "Buat call-off", "Open stock simulation" / "Buka simulasi stok", "Close with reason" / "Tutup dengan alasan". States: open, closed (reason, note), cleared (P-11). Replaces the single "Open inventory" link. Mockup P-03.

- **P-04 · Alert grouping.** Change: one card per supplier × material (per planning group for capacity). Layout: tabs "Needs action · 19 materials", "Cleared today", "Closed" → class chips → cards sorted by days to impact. One close records the reason on every rule in the card. Labels EN/ID: "Needs action" / "Perlu tindakan", "35 alerts on 19 materials" / "35 peringatan pada 19 material". States: empty "No material needs action". Replaces supplier groups of single-rule rows. Mockup P-03.

- **P-05 · Over-called flag.** Change: a negative Free to call off becomes a state. Layout: red cell "Over-called by 121,000 PCS"; flag "Called off more than the supplier holds"; row action becomes "Ask supplier for a production date"; detail shows the call-offs that exceed stock. Labels EN/ID: "Over-called by" / "Melebihi stok sebesar". States: positive (as today), zero, negative. Replaces "−121,000 PCS" with Flags "—".

- **P-06 · Action that fits the pair.** Change: the simulation row offers the act the hub can complete. Layout: actions cell shows "Create call-off · 70,000 left on PO-2026-00127" when an agreement line exists, otherwise "Create PO request" as the outline button and a grey note "No agreement line". Labels EN/ID: "No agreement line" / "Belum ada baris perjanjian". States: line exists, no line, line exhausted. Replaces the unconditional "Create call-off".

- **P-07 · Capacity gap actions.** Change: PTI acts on a gap week. Layout: under each amber or red week cell, a menu: "Accept additional capacity" (amber, confirmed), "Move demand" (opens Commitments & gaps filtered), "Ask supplier" (message on the week, shown on the supplier's Capacity tab). Header line per row: "PTI's decision: pending / accepted 31 Aug". Labels EN/ID: "Accept additional capacity" / "Terima kapasitas tambahan", "Move demand" / "Pindahkan kebutuhan", "Ask supplier" / "Tanya pemasok". States: pending, accepted, moved, asked. Replaces the read-only grid.

- **P-08 · Basis per rule.** Change: name whose stock decides the class. Layout: Inventory column "Risk · supplier cover"; each alert rule shows its own basis: PTI rules "PTI 900 / ROP 2,500 KG", capacity "Short by 14,560 · W38", coverage "Supplier cover 10 days · lead time 21". Labels EN/ID: "Supplier cover" / "Cakupan pemasok". States: lead time missing (day bands, said once). Replaces "Days of supply" and the uniform "Cover N days" line. Revisit when BL-68 is decided.

- **P-09 · Shipped means dispatched too.** Change: a dispatched call-off without an ASN counts as shipped. Layout: unchanged columns; the detail lists such call-offs once, under "In transit to PTI", with "dispatched, no ASN yet". Labels EN/ID: "Dispatched, no ASN yet" / "Sudah dikirim, belum ada ASN". States: ASN, dispatch only, neither. Replaces the double listing.

- **S-01 · Supplier Stock page.** Change: the page leads with this week and the table. Layout: header with "Enter stock on screen" and "Upload template" → "This week" status card → "PTI is asking about N materials" (S-04) → tabs: My stock (table with This week, Your stock, Incoming, Days of supply, PTI stock, row action) · Feedstock to confirm · My materials · Template guide → upload result under the table. Labels EN/ID: "Enter stock on screen" / "Isi stok di layar", "Upload template" / "Unggah templat", "Feedstock to confirm" / "Feedstock untuk dikonfirmasi". States: all sent, partly sent, API supplier (sync card instead). Replaces six stacked panels. Mockup S-01.

- **S-02 · One deadline.** Change: one weekly status everywhere. Layout: To do Stock lane row "Weekly stock update · 2 of 4 sent · due Thu 3 Sept 23:59 WIB", second line "2 out of date since 13 Aug"; the panel uses the same two lines; drop the separate "Stock figures to update" row and the "Missed" strip. Labels EN/ID: "This week: 2 of 4 sent" / "Minggu ini: 2 dari 4 terkirim". States: on time, due today (reminder), overdue, all sent. Replaces three statements. Mockup S-01.

- **S-03 · Template result.** Change: blank rows are not errors. Layout: result block directly under the upload button: green "Sent to PTI: PK-PETB-8810 (2 batches, 45,000 PCS)", grey "3 rows left blank, not sent", red table only for real refusals with row, material, reason. Labels EN/ID: "Sent to PTI" / "Terkirim ke PTI", "left blank, not sent" / "dikosongkan, tidak dikirim". States: checking, all sent, partly refused, file unreadable. Replaces "Rows not saved: 3" for untouched rows. Mockup S-01.

- **S-04 · PTI's asks first.** Change: supplier alerts become asks at the top. Layout: block "PTI is asking about N of your materials" above the To do lanes and on Stock; each line: class, material, plain ask, action button; menu badge on Stock and Capacity. Labels EN/ID: "PTI is asking about" / "PTI bertanya tentang", "Tell PTI when production starts" / "Beri tahu PTI kapan produksi dimulai". States: none ("Nothing PTI is waiting on"), High first. Replaces the bottom list. Mockup S-01.

- **X-01 · Locale numbers.** Change: quantities use the reader's locale. Layout: no layout change; `qty` delegates to `formatNumber`, so Indonesian reads "85.000 PCS", English "85,000 PCS"; the entry hint gives an example in the same locale ("1500 atau 2,5" stays valid). States: EN, ID; template and CSV keep plain digits. Replaces hard-coded `en-US`.

---

## 6. MOCKUPS

Folder: `docs/supplier-hub/research/inventory-ux-mockups/`. Self-contained HTML, inline CSS, no external files. Each opened headless at 1440 px on 2026-10-22: no console errors, no horizontal scroll.

- `P-01-inventory-risk-first.html` — Inventory with filter tiles, risk as the second column and a material drawer with the reason and actions that fit the pair (P-01, P-02, P-08, P-12).
- `P-03-alerts-next-step.html` — Alerts as one card per material with each rule's own basis, days to impact, a next-step sentence, a capacity card, and "Cleared today" (P-03, P-04, P-07, P-08, P-11).
- `S-01-supplier-stock-page.html` — supplier Stock with one weekly status, PTI's asks, the table first, feedstock and template guide as tabs, and an upload result that names what was sent (S-01, S-02, S-03, S-04, X-01).

---

## 7. ROADMAP

| Size | Quick wins (labels, order, links, refusal text) | Larger changes (new panels, merged screens, new states) |
|---|---|---|
| S | X-01 locale numbers · X-02 "Kedaluwarsa" · X-03 due date on task rows · X-04 names · X-05 basis wording · P-12 banner as filters · P-17 "applies from next cycle" · S-08 batch messages · S-09 header check · S-10 removal note · S-11 "Send to PTI" · S-12 drop SAP banner · S-06 zero-LTP group · S-07 sent state · P-14 links to admin | P-06 action that fits the pair · P-05 over-called state · P-13 granted list and confirm |
| M | P-08 basis per rule · P-10 sample rows (after BL-148) · P-16 PTI need column · S-05 tab status | P-01 inventory columns · P-02 material drawer · P-03 next step per rule · P-11 cleared list · S-02 one deadline · S-03 template result · S-04 asks first · P-15 waiting-since and ask · P-09 dispatch as shipped |
| L | — | P-04 grouped alerts · P-07 capacity gap actions · S-01 Stock page restructure |

---

## 8. DROPPED

- "Alert deep links lose the row": the first run re-used a mounted Inventory page, which keeps its first search (`BuyerInventory.jsx:107`); remounting per link, 18 of 18 landed highlighted. A test artefact, not a user path.
- "Capacity submits a week below the LTP without a reason": W38 already carried "Material" from the seeded submission; a new shortfall on W39 was refused by name.
- "The supplier sees PTI-only alerts": `PTI_ONLY_RULES` (`inventoryAlertRules.js:102-113`) filters them; the supplier list showed none.
- "A Fulfilment seat cannot declare stock or confirm capacity": both atoms sit in the fulfilment lane (`services/transitions/businessRoles.js:493-505`).
- "Feedstock Confirm competes with the stock update": merged into S-01.
- "'Missed' and 'Still missing this cycle' repeat each other": merged into S-02.
- "Two simulated-data labels in one table": covered by Forecast evaluation F-14; only the column-width effect is kept in P-01.
- "Bell shows a fixed 3": BL-213. "Admin page title differs from its menu item": BL-183. "No email for alerts or reminders": BL-26, BL-153; the page says "Delivered in the hub". "Sync is simulated": BL-25, BL-151; the panel says so.

---

## 9. OPEN QUESTIONS

**Ruled 2026-10-22.** The owner accepted every recommendation; the rulings are INV-D1 to INV-D11 in `DECISION-GUIDE.md`: 1 → INV-D1, 2 → INV-D2, 3 → INV-D3, 4 → INV-D4 (BL-149 still open), 5 → INV-D5 (BL-150 still open; P-04 waits), 6 → INV-D6, 7 → INV-D7, 8 → INV-D8, 9 → INV-D10, 10 → INV-D11, 11 → INV-D9.

1. BL-68: days of cover on supplier stock or PTI stock? It decides P-08's labels and every alert's class.
2. BL-65: one capacity number with weekly overrides, or per week? It decides S-05's "copy to all weeks".
3. BL-148: do the three labelled sample rows stay on Stock simulation (P-10)?
4. BL-149: which second deadline and which SOP link go on the weekly panel (S-02)?
5. BL-150: the alert list from the 2026-09-23 meeting; P-04's grouping should wait for the final rule set.
6. BL-144: who changes a supplier's update mode, and should a Material Planner reach it from Inventory (P-14)?
7. In the simulation, does a dispatched call-off with no ASN count as shipped (P-09)?
8. PTI's capacity follow-up: accept additional capacity, move demand, or message the supplier, and which of them is recorded (P-07)?
9. Should a blank template row be ignored or refused (S-03)?
10. Should a supplier be told when PTI removes its stock access (S-10)?
11. Is "Ask supplier" a hub message the supplier answers on To do, or a WhatsApp/email hand-off outside the hub (P-02, P-07)?

---

## 10. BUILD STATUS

Scope ruled 2026-10-22: the 13 Major findings except P-04 (waits for BL-150, INV-D5); Minor and Polish findings are not in this build. Brief: `sc-hub-vision/prompts/inventory-ux-build.md`. Wave 1 on branch `feat/inv-ux-wave1` (MR !28); wave 2 on `feat/inv-ux-wave2`, stacked on it.

| ID | Status | Wave | Pinned by |
|---|---|---|---|
| P-01 | Built | 1 (lane 1A) | `pages-v2/BuyerInventory.riskFirst.page.test.jsx` (P-01) |
| P-02 | Built; Ask supplier added in wave 2 (2D) | 1 (1A), 2 (2D) | `BuyerInventory.riskFirst.page.test.jsx` (P-02, INV-D6) |
| P-03 | Built | 2 (2B) | `pages-v2/BuyerAlerts.nextStep.p03.page.test.jsx` (P-03) |
| P-04 | Waiting on owner (BL-150, INV-D5) | – | – |
| P-05 | Built; Ask supplier added in wave 2 (2D) | 1 (1B), 2 (2D) | `pages-v2/BuyerStockSimulation.test.jsx` (P-05); drawer: `BuyerInventory.riskFirst.page.test.jsx` |
| P-06 | Built | 1 (1B) | `BuyerStockSimulation.test.jsx` (P-06); `inventory/stockSimulationDisplay.test.js` |
| P-07 | Built (Move demand not built, INV-D8; alert rule INV-D12, accept rule INV-D13) | 2 (2C) | `services/data/mock/capacityDecision.test.js`; `pages-v2/inventory/capacityGapActions.p07.page.test.jsx` |
| P-08 | Built on Inventory and Alerts | 1 (1A), 2 (2B) | `BuyerInventory.riskFirst.page.test.jsx` (P-08) |
| P-09 | Built | 1 (1B) | `services/transitions/simulateSupplierStock.test.js` (INV-D7) |
| S-01 | Built; the "PTI is asking" block added in wave 2 | 1 (1C), 2 (2A) | `pages-v2/inventory/stockPageUx.page.test.jsx` (S-01) |
| S-02 | Built | 1 (1C) | `stockPageUx.page.test.jsx` (S-02); `weeklyUpdate.page.test.jsx` |
| S-03 | Built | 1 (1C) | `stockPageUx.page.test.jsx` (S-03); `services/transitions/inventoryRules.test.js` |
| S-04 | Built (the hub ask, INV-D9) | 2 (2A) | `services/data/mock/supplierAsk.test.js`; `pages-v2/inventory/ptiAsks.s04.page.test.jsx`; `AskSupplierButton.page.test.jsx` |
| X-01 | Built; Call-offs and Shipments followed on 2026-10-23 (BL-223) | 1 (1D) | `pages-v2/inventory/inventoryDisplay.qty.test.js`; `inventory/localeQty.x01.page.test.jsx` |
| P-10 to P-17, S-05 to S-12, X-02 to X-05 | Not in scope (Minor, Polish) | – | – |

