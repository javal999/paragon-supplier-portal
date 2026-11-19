# SC Hub planning, stock and confirmation requirements: weekly confirmation, supplier stock table, LTP inputs, buffers, planning aids and the feedstock grace

| Field | Value |
|---|---|
| Status | Draft 2026-11-18. Proposed; not folded in |
| Date | 2026-11-18 |
| Source meetings | Weekly SC Hub, 2026-11-11, cited `[MoM 11 Nov]`; Run Through with Planner, 2026-11-12, cited `[MoM 12 Nov]` |
| Owner review | Answers 2026-11-18, cited `[Owner, 2026-11-18]`; the 11 November items are rulings dated 2026-11-11 (Q-1) |
| Code read | `gitlab/main` `19239947` for the requirement read; the apply is on `4186d246`, whose docs are unchanged. The checked-out tree was not used |
| Covers | PSC-1 to PSC-6, decisions PSC-D1 to PSC-D4 |
| Amends | PEX-5 BR-01, BR-03 to BR-07 and AC-01; PEX-6 BR-01, BR-03 and AC-01; PEX-7 BR-02, D1 and PEX-D7; PEX-8's PEX-D27 paragraph; PEX-13 BR-04; PEX-15 (new BR-05); DRC-2 BR-02 (note); DRC-9a, DRC-9c and C4; DRC-10 and B9; DRC-15a BR-01; DRC-B28; CR-26; REQ-E06-02 BR-07, BR-09 and BR-13; REQ-E08-01 BR-06; REQ-E08-02 BR-06 and BR-10; REQ-E08-04 BR-11; REQ-E08-05 BR-01; REQ-E07-04 BR-04; TL-D40 to TL-D43; MAT-D3; README |
| Waits on | The planner: the LTP batch file format, the Safety Stock Engine filter list, the Packaging Category/Format field, the Typhoon window; ADM: the event calendar entries |
| Tags | `[MoM 11 Nov]`, `[MoM 12 Nov]`, `[Owner, 2026-11-18]`, `[Code]`, `[Proposed]`; a bare `[Q-n]` means a question in `01-ingest.md`, answered by the owner on 2026-11-18 |
| Terms | **In Production** the stock table's production entries (renamed from Incoming); **In Transit** shipped quantity from ASNs and dispatched call-offs; **In grace** a feedstock or PO On Hold quantity inside its 14-calendar-day grace; **OSPO On Hold** the PO quantity not absorbed by DA (PEX-7 BR-01); **Total OSPO** min(OSPO, DA not yet called off) + OSPO On Hold; **Feedstock to Confirm** the DRC-8 feedstock entry; **Material Buffer** the event-driven component of the Strategic Buffer; **Expeditor** a new PTI planning seat (AIB-2) |
| New IDs | Requirements PSC-n, rules PSC-n BR-nn, acceptance criteria PSC-n AC-nn, decisions PSC-Dn |

### PSC-1 Weekly confirmation cycle

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M1-A3 to M1-A7; M2-A1; REQ-E06-01 BR-02; REQ-E06-02 BR-07, BR-09, BR-13; REQ-E07-02; REQ-E08-02 BR-09, BR-14, BR-18; REQ-E08-04 BR-11; DRC-2; PEX-1 | MVP | P0 | Material Planner | SUP, MP, ADM | Validated (owner, 2026-11-18) |

**Business value.** The supplier confirms the week's plan and stock in one place, on the DA page, and updates only what changed. It moves confirmation reliability (deck p.5, below 50%) and cuts the chase for missing updates. KPI link: confirmation reliability (REQ-E10-01 measures the delivery side; this is the plan side).

**Experience.**
- SUP: the DA page shows the Friday publication (Zone Liability and DA), the confirmation status, and the material, PO, capacity and feedstock items due. The supplier confirms once; later weeks carry forward; a change is submitted.
- MP: the same figures per supplier, with what changed and what is carried forward.
- ADM: maintains the cut-off time and the event calendar.

**Step-by-step (Supplier, first week then a changed week).**
1. On Friday the supplier opens the DA page. The Zone Liability and DA figures are published.
2. The supplier confirms the first week explicitly by Wednesday 23:59 WIB. The SOH pre-fills the stock page.
3. The next week has no change: the last confirmation is carried forward, and the supplier does not submit. An unchanged, approved PO needs no new response.
4. A week with a change: the supplier edits the changed figure and submits; the page records the change and who made it.

**Business rules.**
- BR-01. Both Zone Liability and DA are published on Friday; Zone Liability is derived from the DA, so the 2 read the same publication. [MoM 11 Nov; Owner, 2026-11-18, Q-2]
- BR-02. The confirmation is due by 23:59 WIB on the Wednesday after the Friday publication, on the hub working calendar. [Owner, 2026-11-18, Q-3, Q-4]
- BR-03. New stock data uses the Thursday 23:59 cutoff (REQ-E08-02 BR-14, BR-18); the DA page shows both deadlines. [Owner, 2026-11-18, Q-3]
- BR-04. The DA page is the one-time confirmation surface. The first cycle is confirmed explicitly; later weeks carry the last confirmation forward; the supplier submits only a change. A week with no submit counts as unchanged and is recorded as "carried forward". [Owner, 2026-11-18, Q-5; amends REQ-E06-02 BR-09, BR-13 and REQ-E08-04 BR-11]
- BR-05. The capacity (REQ-E08-04), PO response (REQ-E07-02) and Foresight (REQ-E06-02) records and their verbs stay underneath. A changed week writes the record; a carried-forward week writes no new record and keeps the last confirmed values in force. An approved, unchanged PO needs no new response; a changed PO reopens it (REQ-E07-02 BR-01). [Owner, 2026-11-18, Q-5] The shipping notice is included read-only from the first ASN. [Owner, 2026-11-18, BL-356]
- BR-06. SOH is 1 figure. The DA confirmation pre-fills the stock page; the supplier confirms or edits it on the stock page; the stock record is the single source, written through the stock verb with its batch rules (REQ-E08-02 BR-06 as amended 2026-11-10; MAT-D21). There is no second stock entry point (REQ-E08-02 BR-09). The DA page's current week reads the stock record. [Owner, 2026-11-18, Q-6; REQ-E08-02 BR-06, BR-09]
- BR-07. Feedstock is entered directly in the stock table (PSC-2); the DA confirmation does not auto-update the stock page. [Owner, 2026-11-18, Q-6]
- BR-08. An API supplier's figures pre-fill the confirmation; the supplier confirms only the differences, and the changed fields are recorded as supplier changes. [Owner, 2026-11-18, Q-7]
- BR-09. The DA is published weekly for every material. The Foresight commitment follows REQ-E06-01 BR-02: weekly for packaging, monthly for raw material. The Wednesday deadline applies to the DA confirmation and to a Foresight period only when that period is published. [REQ-E06-01 BR-02; Owner, 2026-11-18, Q-3]
- BR-10. The page lists every material with a published DA for the week, the open POs with a due response, the capacity groups in the horizon and the feedstock rows for the supplier. The confirmation record is per supplier × week. [Proposed]
- BR-11. The DA figure is LTP A plus the week-1 safety order (DRC-2 BR-02). The buffers enter ROP Order, not DA (PSC-4 BR-06). [Owner, 2026-11-18, Q-13; DRC-2 BR-02]
- BR-12. Zone Liability is the published DA inside the lead time; Zone Capacity is the demand after it (PEX-1). [PEX-1; Owner, 2026-11-18, Q-2]

**Edge cases.**
- The Friday or the Wednesday is not a working day: the deadline moves by the same working-day count on the hub calendar. [Proposed]
- The publication is late: the Wednesday deadline moves by the publication date, not a fixed weekday. [Proposed]
- The supplier misses the first Wednesday: the first confirmation is late; later weeks cannot be carried forward from a first confirmation that does not exist. [Proposed]
- The stock page is edited after the DA confirmation: the DA page's current week follows the stock record. [Owner, 2026-11-18, Q-6]
- A raw material has no Foresight publication that week: the Foresight item reads "Not published this week" and the DA confirmation still applies. [REQ-E06-01 BR-02]

**Acceptance criteria.**
- AC-01. The Friday publication shows both Zone Liability and DA, and the Wednesday 23:59 WIB confirmation deadline; the stock page shows the Thursday 23:59 cutoff. [Q-2, Q-3, Q-4]
- AC-02. The DA confirmation pre-fills SOH 1,200; the stock page shows 1,200; the supplier edits it there; the DA page's current week reads 1,200. No second entry point exists. [Q-6; REQ-E08-02 BR-09]
- AC-03. The first confirmation is explicit; the next week with no change is recorded "carried forward"; a week with a change records the change in the capacity, PO response or Foresight record and who made it. [Q-5]
- AC-04. An API supplier sees pre-filled figures; changing 1 field and submitting records that field as a supplier change and leaves the unchanged fields as pre-filled. [Q-7]
- AC-05. A first week with no submit is not a confirmation; after a first confirmation, a week with no submit is carried forward. [Q-5]
- AC-06. A raw material with a monthly Foresight cadence shows the Foresight item only in its publication week. [REQ-E06-01 BR-02; Q-3]
- AC-07. The page lists the materials with a published DA, the due POs, the capacity groups and the feedstock rows. [BR-10]

**Data and integration.** Weekly confirmation per supplier × week: publication date, deadlines, the carried-forward values, the changed fields and who changed them, links to the stock, capacity, PO response and Foresight records.

**Metrics.** Leading: confirmation coverage and the share of weeks carried forward. Lagging: confirmation reliability (the plan side; REQ-E10-01 measures delivery).

**Open items.** The exact layout of the 2 deadlines is the builder's call.

### PSC-2 Supplier stock table

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M2-A1 to M2-A8; REQ-E08-01 BR-06; REQ-E08-02 BR-06, BR-09, BR-10; REQ-E08-06 BR-04; REQ-E08-07 BR-03, BR-04; DRC-8; MAT-D3, MAT-D4, MAT-D21 | MVP | P0 | Material Planner | SUP, MP | Validated (owner, 2026-11-18) |

**Business value.** The supplier's stock table shows the runs in production and the shipments in transit as separate, dated entries, and the download matches the screen. It cuts the WhatsApp clarification and the stale SOH. KPI link: KPI-04, optimize stock.

**Experience.**
- SUP: 1 row per material. In Transit columns (quantity and ETA) and In Production columns (quantity and ETA) sit after Supplier; a drawer lists each shipment and each run. Feedstock to Confirm is typed for packaging. The PIC is gone from this table.
- MP: the same table, read-only, with the same filters.

**Step-by-step (Supplier, updating 1 material).**
1. The supplier filters to the material by Supplier, MRP Controller or Packaging Category/Format.
2. The supplier opens the material's drawer and adds an In Production run (qty, ETA), then another.
3. For packaging, the supplier types Feedstock to Confirm in the row.
4. The supplier downloads the template; the file lists every In Transit and In Production entry.

**Business rules.**
- BR-01. The table is 1 row per material. The row carries SOH, feedstock and batches; the In Transit and In Production entries are child rows in the material's drawer. [Owner, 2026-11-18, Q-23; Proposed]
- BR-02. In Transit columns after Supplier show the total quantity and the nearest ETA; the drawer lists each shipment from submitted ASNs and dispatched call-offs. [M2-A3; Q-23; REQ-E08-02 BR-10]
- BR-03. In Production columns show the total quantity and the latest ETA; the drawer lists each run. [M2-A4; Q-23]
- BR-04. The supplier Stock table's former Incoming column and its labels are renamed In Production. The combined "Incoming" group label is retired on the supplier view; In Production and In Transit are separate figures. [M2-A4; Q-24; amends REQ-E08-01 BR-06 and MAT-D3]
- BR-05. The PIC column is removed from the supplier Stock table. The PIC stays on the inventory list and detail, alerts, call-offs and the ASN line (REQ-E08-07 BR-03), and the supplier still sees the name there (BR-04). [M2-A2; Q-22]
- BR-06. Feedstock to Confirm is typed directly in the table before the supplier confirms. The column is shown for packaging and hidden for raw material suppliers. The template carries columns K and L for packaging and drops them for raw material. [M2-A6, M2-A7; Q-6; REQ-E08-02 BR-06 [Proposed, BL-290]]
- BR-07. The feedstock entry is the DRC-8 confirmation and is never added to SOH. [DRC-8]
- BR-08. Filters: Supplier, MRP Controller (REQ-E08-07 BR-03) and Packaging Category/Format, read as the SAP material group until a field is named. [M2-A8; Q-25; Proposed] The SAP material group is the field; a packaging format field is a later swap. [Owner, 2026-11-18, BL-329]
- BR-09. Open To-Dos on the supplier Home list are ordered by due date, then risk class where one exists, then type. [M2-A1; Q-26; REQ-E08-02 BR-18]
- BR-10. Every stock row follows CR-18 (number format) and CR-19 (batch total); every In Production row follows MAT-D4 and MAT-D21 (quantity required, completion date required when above 0). [Code; MAT-D4, MAT-D21]
- BR-11. The download flattens every In Transit and In Production entry of the listed materials. [M2-A5]

**Edge cases.**
- A material is both packaging and raw material: the feedstock column and the template K/L follow the material type of the row, and the page says which type decided it. [Proposed]
- An in-transit shipment has no ASN (a dispatched call-off): it shows the call-off's quantity and need date. [REQ-E08-02 BR-10]
- The supplier edits SOH after the DA confirmation: the current week's DA follows the stock record. [Q-6; PSC-1 BR-06]
- A material has no In Production run: the drawer shows "No production run declared" and the total reads 0. [Proposed]

**Acceptance criteria.**
- AC-01. The supplier Stock table shows no PIC; the PIC still shows on the inventory list and detail, Alerts, Call-offs and the ASN line. [Q-22; REQ-E08-07 BR-03]
- AC-02. A material with 2 In Production runs shows the total in the columns and 2 rows in the drawer; the download lists both. [Q-23]
- AC-03. A material with 2 submitted ASNs shows the total and the nearest ETA in the columns and 2 in-transit rows in the drawer; the download lists both. [Q-23]
- AC-04. A packaging supplier types Feedstock to Confirm and confirms; the figure appears in the DRC-8 confirmation and not in SOH. [Q-6; DRC-8]
- AC-05. A raw material supplier sees no Feedstock to Confirm column and no columns K and L in the template. [Q-6]
- AC-06. The 3 filters narrow the table and survive a reload in the page address. [Q-25]
- AC-07. To-Dos order by due date, then risk class, then type. [Q-26]
- AC-08. The In Production and In Transit labels appear on the table and its tips; no "Incoming" label remains on the supplier view. [Q-24]

**Data and integration.** Material stock row: SOH, batches, feedstock. Child rows: In Production (qty, ETA) and In Transit (qty, ETA, ASN or call-off). Filters in the page address. Template columns K and L for packaging.

**Metrics.** Leading: share of materials with a current SOH and an In Production ETA. Lagging: KPI-04.

**Open items.** The supplier's other stock views keep the PIC; only the Stock table loses it (builder's call).

### PSC-3 LTP inputs

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M2-A9 to M2-A11; PEX-5 BR-01 to BR-03; PEX-6; DRC-18; REQ-E14-03 | MVP | P1 | Material Planner | MP | Validated (owner, 2026-11-18) |

**Business value.** The planner uploads the plan for many materials in 1 action, and a raw material used by several finished goods carries its total requirement in 1 row. It removes the manual summing and the per-material CSV. KPI link: none; leading measure only.

**Experience.**
- MP: 3 upload screens (LTP A, LTP B, Festive), each taking a file with many materials; a preview shows the computed total and the uploaded override per material.
- MP: a material used by several FGs shows 1 row with the total and the FG breakdown in the drill-in.

**Step-by-step (Planner, monthly LTP).**
1. The planner opens LTP A and downloads the batch template.
2. The planner fills 1 row per material; a material used by 3 FGs is 1 row.
3. The planner uploads; the page shows the computed total from the FG plan and the BOM beside the uploaded figure.
4. The planner confirms; the upload is stamped with who, when and the file name.

**Business rules.**
- BR-01. Batch upload for many materials, on 3 separate screens: LTP A, LTP B and Festive. The screens replace the per-material CSV (BL-267). [M2-A9, M2-A11; Q-27] The file is one CSV per type, one row per material × week. [Owner, 2026-11-18, BL-330]
- BR-02. The hub computes a material's total requirement from the FG plan and the BOM; the uploaded row is the override. One row covers every FG that uses the material. [M2-A10; Q-28] The computed total reads the current FG plan version. [Owner, 2026-11-18, BL-330]
- BR-03. Each upload is stamped with uploader, date and file name, as PEX-5 BR-02 requires. [PEX-5 BR-02 [Proposed]]
- BR-04. A material with no upload reads the computed total; a material with no FG plan and no upload reads "Not available". [Proposed]
- BR-05. The 3 series are separate; the buffers read LTP A, LTP B and LTP Festive (PSC-4). [PSC-4; PEX-5 BR-01]
- BR-06. A new upload marks the published DA out of date with its cause (PEX-6). [PEX-6]

**Edge cases.**
- A material is used by an FG with no plan: the computed total leaves that FG out and says so. [Proposed]
- The uploaded total differs from the computed total: the upload wins; the page shows both and the difference. [Proposed]
- A file repeats a material: the last row wins, and the page lists the repeated row. [Proposed]

**Acceptance criteria.**
- AC-01. A batch file with 2 materials uploads in 1 action; each material shows its stamp. [Q-27]
- AC-02. A material used by 2 FGs appears once; its computed total is the sum of both FGs' requirements. [Q-28]
- AC-03. An uploaded figure overrides the computed total; the drill-in shows the FG breakdown. [Q-28]
- AC-04. A material with no plan and no upload reads "Not available". [BR-04]
- AC-05. A new upload marks the published DA out of date with the LTP cause. [PEX-6]

**Data and integration.** LTP series per material × week × type (A, B, Festive); upload stamp; computed total from the FG plan × BOM.

**Metrics.** Leading: share of materials with an upload in the cycle. Lagging: none.

**Open items.** The treatment of a material with no BOM line.

### PSC-4 Buffers, model A

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M2-A12 to M2-A17; PEX-5 BR-01, BR-03 to BR-07, AC-01; PEX-6; PEX-13 BR-04; DRC-2 BR-02; DRC-9a, DRC-9c, C4; DRC-10, B9; DRC-B28 | MVP | P1 | Material Planner | MP, SUP | Validated (owner, 2026-11-18); Proposed (the ROP-only audit field) |

**Business value.** The 3 buffers get 1 definition each, on a baseline the planner and the supplier share, so the same uplift is not paid twice and every buffer figure traces to its formula. KPI link: KPI-04 (stock) and KPI-05 (OTIF through availability).

**Experience.**
- MP: Safety stock targets shows LTP A, LTP B and Festive, the Protection Buffer, the Strategic Buffer with its festive and material components, the cover setting and the event window.
- SUP: sees the resulting DA and ROP Order, not the internal arithmetic.

**Step-by-step (Planner, first run).**
1. The planner uploads LTP A, B and Festive.
2. The page shows Protection, Strategic (festive + material) and the cover setting.
3. ADM has the event calendar; the planner can override a Material Buffer switch with a reason.
4. ROP Order includes each component once.

**Business rules.**
- BR-01. LTP A is the baseline for DA and ROP Order. The LTP choice (A, Festive or B) is retired as a DA input. [Owner, 2026-11-18, Q-13; model A]
- BR-02. DA(w) = LTP A(w); week 1 also carries the safety order (DRC-2 BR-02 unchanged). [Owner, 2026-11-18; DRC-2 BR-02]
- BR-03. Protection Buffer = max(0, [AVG(LTP B over the lead-time weeks) − AVG(LTP A over them)]) × P, where P is a per-material cover setting, default 4 weeks. [M2-A13; Q-13]
- BR-04. Strategic Buffer, festive component = the sum over the lead-time weeks of max(0, LTP Festive(w) − LTP A(w)). [M2-A14; Q-14]
- BR-05. Material Buffer = the coverage weeks × the average weekly LTP A over the coverage window. It is the event-driven component of the Strategic Buffer. [M2-A15, M2-A16; Q-15]
- BR-06. Strategic Buffer total = BR-04 + BR-05. ROP Order = LTP A × the lead time + safety order + Protection Buffer + Strategic Buffer total. Each component is added once; there is no per-week LTP B − LTP A adder. [Q-13; QF-1]
- BR-07. The event calendar carries CNY and Typhoon; ADM maintains it. The Material Buffer switches on in the window and off after it; the planner can override the switch with a reason (PEX-13 BR-02). [M2-A17; Q-16; PEX-13 BR-04 lifted] The default Typhoon window is 2 weeks before landfall. [Owner, 2026-11-18, BL-332]
- BR-08. When LTP B or Festive is missing, the buffer reads "Not available" and is not added; DRC-9a and DRC-9c stay as fallback displays on the Capacity page, labelled fallback, and are not the buffer definition. [Q-13; QF-39]
- BR-09. The DA grid shows LTP A, LTP B and Festive as inputs and DA; the chosen-LTP marker is removed. [model A; PEX-5 BR-03 amended]
- BR-10. A change that moves DA writes a DA version with its cause: LTP A, LTP B, LTP Festive, the safety stock or protection buffer switch (PEX-13). A change that moves only ROP Order (the cover setting, the event window, the Material Buffer switch) is recorded with the ROP Order figure's stored inputs and rules version (DRC-D16) and does not write a DA version. [PEX-6; Q-13; QF-5]
- BR-11. The sandbox's 4 demand presets are PSC-5's (SKU revamp, SKU off/retired, one-shot material uplift, material level transition). [Q-10; PEX-15 BR-05]

**Edge cases.**
- LTP B is lower than LTP A: Protection Buffer is 0, not negative. [BR-03; Proposed]
- The lead time is missing: all 3 components read "Not available" and the existing missing-lead-time alert fires. [REQ-E08-05 BR-01]
- The event window and the festive window overlap: both components show, and the Strategic total is their sum. [Proposed]
- The planner overrides an automatic switch: the reason is required, and the next window does not override the manual choice until it is cleared. [Proposed; PEX-13 BR-02]

**Acceptance criteria.**
- AC-01. Lead time 3 weeks, LTP A 100/week, LTP B 120/week, LTP Festive 130/week, P = 4, coverage 2 weeks: Protection 80, Strategic festive 90, Material 200, Strategic total 290. [Q-13 to Q-16]
- AC-02. ROP Order adds Protection 80 and Strategic 290 once each; no per-week LTP B − LTP A line exists. [Q-13; BR-06]
- AC-03. With no LTP B, the Protection Buffer reads "Not available" and ROP Order excludes it; the Capacity page's fallback display is labelled fallback. [Q-13; BR-08]
- AC-04. CNY in W5-W6 switches the Material Buffer on in those weeks and off outside; a manual override records a reason. [Q-16]
- AC-05. The DA grid has no chosen-LTP marker and shows LTP A, B and Festive. [Q-13; BR-09]
- AC-06. A cover-setting change moves ROP Order and is recorded with the ROP Order figure's stored inputs and rules version (DRC-D16), not as a DA version; an LTP A change writes a DA version. [BR-10]

**Data and integration.** LTP A, B and Festive series; lead time (DRC-6); cover setting per material; event calendar; buffer components; ROP Order inputs and rules version (DRC-D16).

**Metrics.** Leading: share of materials with all 3 LTP inputs. Lagging: KPI-04 and KPI-05.

**Open items.** The ROP-only audit field uses DRC-D16; the field name is the builder's call.

### PSC-5 Planning aids

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M1-A1, M1-A2; M2-A18, M2-A19; CAP-1 BR-02; REQ-E08-05 BR-01; CR-24; DRC-10, DRC-11; PEX-15 | MVP | P2 | Material Planner | MP | Validated (owner, 2026-11-18); Proposed (the 4 preset shapes) |

**Business value.** The planner reads a week and a date on every grid, sees a below-ROP or max-stock warning, and finds the CV rule explained. KPI link: KPI-04 through earlier warning.

**Experience.**
- MP: a ROP-level view grouped by the OSIP level, with the PTI ROP, the max-stock warning and the below-ROP warning; WeekGrid tables show the week and Monday date; the CV explanation opens from Safety stock targets; the 4 scenario presets are in the sandbox.

**Step-by-step (Planner, weekly check).**
1. The planner opens the ROP-level view and reads the level, the ROP and the warning.
2. A max-stock alert appears in the existing alert list.
3. The planner opens the CV explanation beside the CV figure.
4. The planner loads a scenario preset in the sandbox.

**Business rules.**
- BR-01. Every WeekGrid table shows the week label and Monday date as each CAP-1 wave lands; CAP-1 BR-02 is unchanged. [M1-A1; Q-8]
- BR-02. A ROP-level view groups materials by their OSIP level, shows the PTI ROP, and warns when SOH is below the ROP. A new max-stock alert fires when PTI SOH reaches the DRC-10 Max; its class is Low, its basis is "at or above Max", and it has no days-to-impact. REQ-E08-05 BR-01 gains the rule. [M1-A2; Q-9; DRC-10; REQ-E08-05 BR-01]
- BR-03. CV is explained on the page like BL-208's "How the level is suggested"; the calculation is DRC-11 unchanged. [M2-A18; Q-11]
- BR-04. Safety stock targets keeps its existing supplier, planning group, MRP controller and level filters; a new filter is added only when the planner names it. [M2-A19; Q-12; Owner, 2026-11-18, BL-328]
- BR-05. The sandbox offers 4 demand presets: SKU revamp (FG level), SKU off/retired, one-shot material uplift and material level transition. Each loads a demand shape on the Material tab; the FG tab stays unscaled (PEX-D28). [M1-D4; Q-10; PEX-15 BR-05] The shapes are: SKU revamp = a ramp over 6 weeks; SKU off/retired = a decline to 0 over 4 weeks; one-shot uplift = a single-week spike; material level transition = a step change at a week. [Owner, 2026-11-18, BL-353; Proposed]
- BR-06. The Excel scenario template remains the owner's deliverable and is not a hub requirement. [M1-A18]

**Edge cases.**
- A WeekGrid table has no week data: the header still shows the planning week. [Proposed]
- The max-stock alert fires while a call-off is above Max (DRC-13 BR-03): both show, and the call-off flag wins the wording. [Proposed]
- A preset has no FG LTP: it applies on the Material tab and says the FG tab is unscaled. [PEX-D28]

**Acceptance criteria.**
- AC-01. A WeekGrid table shows W46 2026 and its Monday date. [Q-8; CAP-1 BR-02]
- AC-02. A material at maximum stock raises 1 alert with class Low and basis "at or above Max"; closing it requires a reason. [Q-9; REQ-E08-05 BR-01]
- AC-03. A material below its ROP shows the warning in the ROP-level view. [Q-9]
- AC-04. The CV explanation states the 6-month window, stdev ÷ average and the 0.5 threshold. [Q-11; DRC-11]
- AC-05. Each of the 4 presets loads on the Material tab and leaves the FG tab unscaled. [Q-10; PEX-15 BR-05]

**Data and integration.** WeekGrid header; alert rule; CV text; sandbox presets.

**Metrics.** None.

**Open items.** The 4 preset shapes are [Proposed] and can be adjusted by the planner.

### PSC-6 Feedstock reconcile and grace

| Maps to | Phase | Priority | Business owner | Users | Status |
|---|---|---|---|---|---|
| M1-A14 to M1-A17; PEX-7 BR-01, BR-02, BR-05; PEX-8 PEX-D27; PEX-9; DRC-15a | MVP | P1 | Material Planner | MP, SUP | Validated (owner, 2026-11-18) |

**Business value.** The page separates a quantity still in grace from a quantity on hold, so the planner acts on the right bucket and the supplier sees why a quantity waits. KPI link: KPI-04.

**Experience.**
- MP: the row shows PO ordered, DA, called off, DA not yet called off, ASNs requested, the 2 remainders, In grace, PO On Hold and Total OSPO.
- SUP: the same split for its own rows.

**Step-by-step (Planner, Monday check).**
1. The planner opens Feedstock reconcile.
2. The row shows the columns above; In grace and PO On Hold each carry a date.
3. The planner follows "Not yet called off" to the PO On Hold line.

**Business rules.**
- BR-01. The feedstock grace is the PO On Hold grace: 1 14-calendar-day clock that starts when the PO On Hold quantity first appears [Proposed]. The no-movement period stays 14 working days. [M1-A14; Q-21; Owner, 2026-11-18, BL-331; PEX-7 BR-02; PEX-7 BR-03]
- BR-02. During the grace the feedstock quantity shows In grace; at the end it moves to PO On Hold or leaves the row by the decision. [M1-A14; Q-21; Owner, 2026-11-18, BL-331]
- BR-03. The page shows PO ordered, DA, called off, DA not yet called off, ASNs requested, the 2 remainders, In grace, PO On Hold and Total OSPO, per supplier × material. [M1-A15; DRC-15a BR-01]
- BR-04. Total OSPO = min(OSPO, DA not yet called off) + PO On Hold. [M1-A16; PEX-7 BR-01]
- BR-05. In grace and PO On Hold are 2 columns, each with its date. "Not yet called off" links to the PO On Hold line and shows its option and status (PEX-9 BR-02). [M1-A17; Q-17; PEX-9 BR-02]
- BR-06. Grace days are counted as days 1 to 14 inclusive; the quantity moves to PO On Hold on day 15. [Q-21; Proposed]
- BR-07. A decision recorded before the grace ends takes effect at the end; the quantity stays in PO On Hold until then (PEX-8 BR-05). [PEX-8 BR-05]
- BR-08. The end-of-grace need date = the end of the grace + the DRC-6 lead time, counted in calendar days (PEX-D27 paragraph). [PEX-D27; Q-21]
- BR-09. A rejected call-off does not restart the grace; the quantity returns to the open PO and PEX-8 decides. [Owner, 2026-11-18, BL-354]

**Edge cases.**
- The grace ends on a non-working day: the quantity moves on that calendar day; the planner's decision is due on the hub working day. [Proposed]
- A PO On Hold line is decided before the grace ends: the decision is recorded, the quantity stays in PO On Hold until day 15, then leaves both columns. [PEX-8 BR-05]
- A supplier rejects the call-off: whether the quantity restarts the grace is open. [Open item]

**Acceptance criteria.**
- AC-01. A quantity that first appears on 1 Dec is in grace on days 1 to 14 (1 to 14 Dec) and moves to PO On Hold on 15 Dec. [Q-21]
- AC-02. The page shows In grace and PO On Hold as 2 columns, each with its date; "Not yet called off" opens the PO On Hold line. [Q-17; PEX-9 BR-02]
- AC-03. With Open PO 470k, DA 300k, Called Off 208k, DA not yet called off 92k and PO On Hold 170k, Total OSPO reads 262k. [M1-A16]
- AC-04. With OSPO 50k and DA not yet called off 92k, PO On Hold is 0 and Total OSPO reads 50k. [BR-04]
- AC-05. The end-of-grace need date = the end of the grace + the lead time, in calendar days. [Q-21; PEX-D27]

**Data and integration.** Feedstock reconcile rows; grace start and end; PO On Hold decision line; lead time.

**Metrics.** Leading: share of PO On Hold quantities decided inside the grace. Lagging: KPI-04.

**Open items.** None.

## 2. Decisions

| ID | Decision | Outcome | Source |
|---|---|---|---|
| PSC-D1 | Buffer model | Model A: LTP A baseline; Protection + Strategic (festive + material) once in ROP Order; the per-week LTP B − LTP A adder is retired | Owner, 2026-11-18 |
| PSC-D2 | Grace unit | 14 calendar days for the feedstock and PO On Hold graces; the no-movement period stays working days | Owner, 2026-11-18 |
| PSC-D3 | Weekly cycle | Both Zone Liability and DA published Friday; confirmation by Wednesday 23:59; new stock data uses the Thursday cutoff | Owner, 2026-11-18 |
| PSC-D4 | Confirmation and stock entry | One-time confirmation on the DA page, change-only after the first week; the DA confirmation pre-fills the stock page; the stock page remains the single entry point | Owner, 2026-11-18 |
| PSC-D5 | Firm deadline | 1 Wednesday deadline for the weekly Foresight/DA confirmation; CR-26 stays outside the weekly cycle | Owner, 2026-11-18 (BL-327) |
| PSC-D6 | Shipping notice | Included read-only in the one-time confirmation, from the first ASN | Owner, 2026-11-18 (BL-356) |
| PSC-D7 | LTP file and source | One CSV per type, one row per material × week; the computed total reads the current FG plan + BOM | Owner, 2026-11-18 (BL-330) |
| PSC-D8 | Typhoon window | ADM sets the window; default 2 weeks before landfall | Owner, 2026-11-18 (BL-332) |
| PSC-D9 | Safety Stock filters | The existing 4 filters stay; a new filter is added only when named | Owner, 2026-11-18 (BL-328) |
| PSC-D10 | Packaging field | SAP material group now; a packaging format field is a later swap | Owner, 2026-11-18 (BL-329) |
| PSC-D11 | Preset shapes | Ramp, decline to 0, one-week spike, step change; [Proposed] | Owner, 2026-11-18 (BL-353) |
| PSC-D12 | Grace merge | The feedstock grace is the PO On Hold grace: 1 14-calendar-day clock | Owner, 2026-11-18 (BL-331) |
| PSC-D13 | Rejected call-off | Does not restart the grace; PEX-8 decides | Owner, 2026-11-18 (BL-354) |
| PSC-D14 | Material Buffer coverage | Two settings: `P` (default 4) is the Protection multiplier; the Material Buffer has its own coverage weeks (default 2), averaged over those weeks. AC-01 holds as written; the earlier one-setting reading is revised | Owner, 2026-11-19 |
| PSC-D15 | Protection switch as a DA cause | The protection buffer switch stays ROP-Order-only: it writes a DRC-D16 row and no DA version. BR-10's cause list is read through its operative clause ("a change that moves DA") | Owner, 2026-11-19 |
