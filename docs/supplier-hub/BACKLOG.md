# Supplier Hub: Backlog

| | |
|---|---|
| Version | 1.4, 2026-09-21 |
| What this is | Everything known to be outstanding for the Supplier Hub, in one list: decisions waiting on people, work waiting on those decisions, work waiting on the backend, and work that can start today |
| What this is not | A plan or a commitment. Nothing here has a date. Sequencing belongs to the project owner |
| Sources | Open items (section 7 of `SUPPLIER-HUB-REQUIREMENTS.md`), open decisions (section 9.3 of `SUPPLIER-HUB-PRD.md`), what is not built (section 5 of `BUILD-GAP.md`), stubs (section 6 of the requirements), and defects or debts found while building |

## How to use this list

- **Each item has an ID** (`BL-nn`). IDs never change and never get reused. New items take the next free number.
- **To add, change or close an item**, branch off `main` with a `docs/` prefix, edit this file, and open a pull request. Same rule as every other document here.
- **Closing an item**: move it to section 6 with the date and what closed it, rather than deleting the row. A backlog that only shrinks silently teaches nobody anything.
- **Size** is a rough shape, not an estimate: **S** a day or so, **M** a few days, **L** a week or more, **?** unknown until the decision lands.
- **Blocked by** names what has to happen first. An item with nothing in that column can start today.

---

## 1. Decisions waiting on people

Still open. Items decided on 2026-09-21 are in section 6.

| ID | Decision | Owner | What it unblocks | Detail |
|---|---|---|---|---|
| BL-01 | **REPL** — replenishment method and governance | Material Planner (consultant engaged) | BL-20 SAP replenishment recommendations, and the shape of REQ-E09-01 | PRD 9.3 |
| BL-11 | **PQ-06** — interface technology and latency target | IT | The real SAP interface, and what the interface monitor watches | REQ-E07-08 |
| BL-12 | **PQ-11** — is the hub the long-term record for call-offs? Recommended: the hub holds them for the pilot, and SAP scheduling agreement releases become the long-term record. **Awaiting the owner's yes** | Material Planner, IT | Integration scope (BL-11), and whether call-offs migrate to SAP later | REQ-E09-01, E09-03 |
| BL-54 | **PQ-05 cap** — the absolute rupiah cap on invoice price variance (the 0% and 2% tolerances are decided) | Finance | The final value in CR-12; the build uses a placeholder until then | REQ-E07-07 |
| BL-55 | **A-05** — minimum OTIF for the compliance gate, and whether "No history" passes (proposed: passes) | Procurement | The final value in CR-23; the build uses a placeholder until then | REQ-E03-05 |
| BL-56 | **PQ-08 early allowance** — how many days early a call-off may arrive, given warehouse capacity | Warehouse, Material Planner | The early-delivery rule in CR-05; until then an early date needs approval | REQ-E09-03 |
| BL-57 | **A-01** — compliance and capability check for RFx with Mas Ary Hidayat | Procurement | Confirms the gate criteria in CR-23 | REQ-E03-01 |
| BL-58 | **Q-19** — the PQ-10 answer ends with "They"; confirm nothing is missing | Material Planner | Confirms the delivery execution scope | REQ-E09-04 |
| BL-65 | **CAP-1** — does supplier capacity usually stay the same every week or change? Being discussed | Material Planner | How capacity is entered (one number with overrides, or per week) | REQ-E08-04 |

---

## 2. Build work, in the order it will be done

Decided on 2026-09-21 and ready to build. Priority: first what protects money and compliance, then what keeps planning figures correct, then administration and usability. Placeholder values are used where a number is still open, and each is named.

| Priority | ID | Item | Rule | Size | Placeholder until decided |
|---|---|---|---|---|---|
| 2 | BL-44 | **Invoice price tolerance.** 0% where a contract price exists; 2% otherwise, within an absolute rupiah cap | CR-12 | S | Cap IDR 500,000 (BL-54) |
| 3 | BL-45 | **Goods receipt tolerance.** Any over-delivery flagged; a shortfall above 2% flagged and the receipt kept open | CR-25 | S | — |
| 5 | BL-47 | **Call-off tolerance.** Up to 5% over accepted for every call-off type; any shortfall a visible partial; a late date always goes to planner approval; an early date also goes to approval until the warehouse answers | CR-05 | S | Early allowance 0 days (BL-56) |
| 6 | BL-48 | **Forecast commitment deadline.** Firm periods 1 working day, Trade-off and Forecast 3 working days | CR-26 | S | — |
| 7 | BL-49 | **Call-off release by remaining quantity.** Quantity becomes the default check, value only where a line has no quantity | CR-04; BL-13 | S | — |
| 8 | BL-50 | **Hub-managed working calendar.** Administrator page to load the SAP factory calendar and add, remove or override days; every deadline reads it. This is the first page of the admin screen in BL-32 | Requirements 3.4 | M | SAP load simulated |
| 9 | BL-51 | **3PL tracking link on the ASN.** An administrator-maintained list of 3PLs and their public tracking addresses; the tracking number on an ASN becomes a link out. No reading of status from the 3PL's site | REQ-E07-04 BR-05 | S | A short sample list, marked as sample |
| 10 | BL-52 | **Supplier filters.** Certificate validity, then performance band, then country or region | REQ-E03-01 BR-05 | S | — |
| 11 | BL-53 | **KPI definitions on the performance pages.** State the delivery window, whether early counts, the grain, and whether a date change resets the clock; show targets as "baseline period" until they are set | BL-19 decision | S | Baseline period, no target |
| 12 | BL-31 | Accessibility pass (section 4) | SC-07 | M | — |
| 13 | BL-32 | Admin screen for the remaining configuration: reason codes, tolerances, thresholds, stale periods (section 4) | REQ-E08-05 BR-03 | M | — |
| 14 | BL-33 to BL-39 | The remaining "can start today" items in section 4, in the order listed there | — | — | — |

### Build work waiting on a decision

| ID | Item | Blocked by | Size | Detail |
|---|---|---|---|---|
| BL-20 | SAP ROP replenishment recommendations released as call-offs | BL-01; forecast source decided (BL-10) | L | REQ-E09-01, X-16 |
| BL-23 | Replace the placeholder values above with the agreed ones | BL-54, BL-55, BL-56 | S | Config modules named in `BUILD-GAP.md` section 3 |

## 3. Build work waiting on the backend (Stage F)

The prototype holds everything in the browser. These need a real backend, which IT has not yet specified (PRD section 4).

| ID | Item | Size | Detail |
|---|---|---|---|
| BL-24 | Real SAP integration: POs, goods receipts and invoice status arriving as messages, and PO responses, ASNs and invoices going back | L | REQ-E07-08, BL-11 |
| BL-25 | Supplier API sync for stock, replacing the simulated Sync button | M | REQ-E08-02 |
| BL-26 | Email delivery of alerts, reminders and escalations. Today they exist only inside the hub | M | REQ-E08-05, E06-03, E07-02 |
| BL-27 | File storage, so RFI attachment questions, receipt-dispute attachments and the e-Faktur hold a real file rather than a file name | M | REQ-E03-02, E07-06, E07-07 |
| BL-28 | Real sign-in for PTI staff and supplier users, replacing the demo persona switch | M | PRD 4.3 |
| BL-29 | Scheduled jobs, so deadlines, escalations and reminders fire on a clock rather than being derived when a page is read | M | REQ-E07-02, E09-03 |
| BL-30 | Durable storage, so what a user enters survives a reload | L | PRD section 4 |

---

## 4. Work that can start today

Nothing blocks these.

| ID | Item | Why | Size | Detail |
|---|---|---|---|---|
| BL-31 | Accessibility pass: keyboard reachability and screen-reader labels across the built pages, then fixes | SC-07 requires it before UAT; it has never been tested | M | Requirements 3.8 |
| BL-32 | Admin screen for the values now held in configuration files: reason codes, tolerances, alert thresholds, stale periods, the working calendar | Today a change needs a developer. ADM is a named persona in the requirements with nothing to use | M | REQ-E08-05 BR-03, 3.6 |
| BL-33 | Sample data so a "Received without ASN" receipt exists | The code path is built and rendered but no sample data produces it, so nobody can see it | S | REQ-E07-06 |
| BL-34 | One "as of" date across the app: the order pages read the demo clock, other pages read today | Two clocks in one demo confuse a reviewer | S | U-12 in `BUILD-GAP.md` |
| BL-35 | An RFI and an RFP awaiting an answer from the main demo supplier | Today that starting point sits on a different supplier, so the main walkthrough cannot show it | S | Phase 6a note |
| BL-36 | Option editor for one-off RFI questions, so a buyer can add single-choice and multiple-choice questions, not only the other five types | The template supports them; the one-off form does not | S | REQ-E03-02 |
| BL-37 | Split-award entry across several items in one pass | The rule and the record are per item; the form handles one item at a time | M | REQ-E03-05 |
| BL-38 | Supplier call-offs table: 10 columns still scroll sideways at 1280px | Same problem the Order summary solved by grouping | S | Phase 3 note |
| BL-39 | Non-conformance and complaint tracking (E10.02), the part of Supplier Performance never detailed | Named in the deck as MVP, still a stub | M | Requirements section 6 |

---

## 5. Other teams and later phases

| ID | Item | Who | Detail |
|---|---|---|---|
| BL-40 | Foundation epics E01 and E02: supplier registration, onboarding, master data, and the PROCIO migration | Foundation team | Requirements 5.1, `prompts/foundation-requirements-contribution.md` |
| BL-41 | Sourcing request intake: a planner or requester raising a request that Procurement turns into an event | Owner ruled it out of the MVP (A-04); revisit when sourcing volume grows | Requirements 3.6a |
| BL-42 | Phase 2 epics: contract management (E04), catalog management (E05), reporting and analytics (E11), API shipment aggregator (E13.02), supplier quality | Per the deck and charter | Requirements section 6 |

---

## 6. Closed

| ID | Item | Closed | By |
|---|---|---|---|
| BL-02 | PQ-09 event-based analysis in the MVP | 2026-09-21 | Decided: not in the MVP; belongs in the planning suite. BL-21 closes with it |
| BL-03 | D-03 supplier TMS access | 2026-09-21 | Decided: no TMS integration in the MVP; replaced by the 3PL tracking link (BL-51). BL-22 closes with it |
| BL-04 | A-03 compliance and scoring | 2026-09-21 | Decided: compliance gate at award (CR-23) and new weights (CR-15). Build is BL-43; template and term-list review with users continues as part of A-01 (BL-57) |
| BL-05 | PQ-08 call-off tolerances and commitment deadline | 2026-09-21 | Decided except the early allowance (BL-56). Build is BL-47 and BL-48 |
| BL-06 | PQ-04 goods receipt tolerance | 2026-09-21 | Decided (CR-25). Build is BL-45 |
| BL-07 | PQ-05 invoice tolerance | 2026-09-21 | Decided except the rupiah cap (BL-54). Build is BL-44 |
| BL-08 | PQ-02 capacity horizon | 2026-09-21 | Decided: 13 weekly buckets, as built. No build |
| BL-09 | PQ-03 alert risk class | 2026-09-21 | Decided (CR-24). Build is BL-46 |
| BL-10 | PQ-07 forecast source | 2026-09-21 | Decided: MRP weeks 1–13, IBP months 4–6, one published forecast. Build waits on the real SAP feed (BL-24) |
| BL-13 | PQ-12 umbrella PO grain | 2026-09-21 | Decided: quantity per line. Build is BL-49 |
| BL-14 | Q-18 working calendar | 2026-09-21 | Decided: hub-managed by the Hub administrator, loaded from SAP. Build is BL-50 |
| BL-15 | Q-20 quality inspection | 2026-09-21 | Decided: keep the result display; non-conformance in Phase 2 with BL-39. No build |
| BL-16 | D-07 catalog for the RFI | 2026-09-21 | Decided: capability list only in the MVP, as built. No build |
| BL-17 | DEC-06 Web Tukar Faktur | 2026-09-21 | Decided: separate system built in parallel; the hub's invoice collaboration stays unchanged. No build |
| BL-18 | DEC-09 dashboard owner | 2026-09-21 | Decided: Procurement owns the dashboard; Material Planning owns delivery measures. No build |
| BL-19 | KPI definitions and targets | 2026-09-21 | Decided: definitions first, 3-month baseline, then targets. Build is BL-53 |
| BL-19a | A-02 supplier filters | 2026-09-21 | Decided. Build is BL-52. A-01 continues as BL-57 |
| BL-19b | MIG PROCIO migration | 2026-09-21 | Decided: active suppliers of the last 24 months plus contracted; suppliers confirm their own bank and tax details; second-channel confirmation for bank changes. Work sits with the Foundation team (BL-40) |
| BL-21 | Event-based strategy analysis | 2026-09-21 | Closed with BL-02 |
| BL-22 | Supplier TMS access | 2026-09-21 | Closed with BL-03 |
| BL-43 | Compliance gate at award | 2026-09-21 | Built: CR-23 gate refuses an award to a failing supplier and shows the failed criteria; quote score re-weighted 40/20/40 (CR-15) over qualified suppliers. Placeholder OTIF minimum 80% until BL-55 |
| BL-46 | Alert risk class by lead time | 2026-09-21 | Built: one risk-class function (CR-24) for the inventory views, the dashboard widget and the alerts: High below the supplier lead time, Medium below 1.5 ×, Low otherwise, strict at both cuts; the CR-02 day bands only where the lead time is missing, which raises a "lead time missing" alert for PTI. Every surface shows the basis. Lead times are sample master data; demo table in `BUILD-GAP.md` 3.2 |
| BL-64 | Compliance gate demo data | 2026-09-21 | Built: five sample RFQs (016–020) cover every CR-23 scenario; an RFQ nobody can win says so. Table in `BUILD-GAP.md` |
| BL-60 | One stock entry | 2026-09-21 | Built: manual and template share the same fields on the Stock page; the Forecast page's old entry retired; optional manufacturing date; in-transit read-only from ASNs and call-offs |
| BL-59 | Supplier-triggered stock sync | 2026-09-21 | Built (simulated until BL-25): supplier Sync for API-connected suppliers; PTI stock refresh only for granted materials |
| BL-61 | One list on the supplier inventory view | 2026-09-21 | Built: tabs only when a supplier supplies both types; PTI view unchanged |
| BL-62 | Capacity "upside" relabelled | 2026-09-21 | Built: "Extra capacity if requested", with an explanation |
| BL-63 | Capacity page filters | 2026-09-21 | Built: supplier, material group, material, gaps only, kept in the page address |
