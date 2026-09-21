# Supplier Hub: Backlog

| | |
|---|---|
| Version | 1.0, 2026-09-21 |
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

These block work. Each one is a question for a named owner, not a task for the build team.

| ID | Decision | Owner | What it unblocks | Detail |
|---|---|---|---|---|
| BL-01 | **REPL** — replenishment method and governance | Material Planner (consultant engaged) | BL-20 SAP replenishment recommendations, and the shape of REQ-E09-01 | PRD 9.3 |
| BL-02 | **PQ-09** — is event-based strategy analysis needed in the MVP | Material Planner | BL-21, or drops it from scope | REQ-E09-02 |
| BL-03 | **D-03** — which phase supplier TMS access belongs to | Project sponsors | BL-22 supplier TMS access | REQ-E13-01 |
| BL-04 | **A-03** — review the RFI template, the RFP term list and the quote score weights with Procurement | Procurement | Confirms what is already built; may change questions, terms or weights | REQ-E03-02, E03-04, CR-15 |
| BL-05 | **PQ-08** — call-off under-quantity and date tolerances, in-full tolerance, commitment tolerances per zone, commitment deadline | Material Planner | Replaces the placeholder values now in configuration (CR-05, CR-08, CR-21) | REQ-E09-03, E06-02 |
| BL-06 | **PQ-04** — goods receipt discrepancy tolerance | Material Planner, warehouse | Today any difference is flagged (tolerance 0) | REQ-E07-06 |
| BL-07 | **PQ-05** — Finance to confirm the 1% invoice price tolerance and the status list | Finance | Confirms CR-12 and the supplier-visible statuses | REQ-E07-07 |
| BL-08 | **PQ-02** — capacity horizon and bucket size | Material Planner | Confirms the 13 weekly buckets now built | REQ-E08-04 |
| BL-09 | **PQ-03** — risk class thresholds for alerts | Material Planner | Confirms the starting High / Medium / Low rules | REQ-E08-05 |
| BL-10 | **PQ-07** — which SAP source provides forecast and demand sensing (MRP, IBP, other) | Material Planner, ERP Functional | The real forecast feed, and BL-20 | REQ-E06-01, E09-01 |
| BL-11 | **PQ-06** — interface technology and latency target | IT | The real SAP interface, and what the interface monitor watches | REQ-E07-08 |
| BL-12 | **PQ-11** — is the hub the record for call-offs, do they ever go back to SAP, are today's manual records migrated | Material Planner, IT | Call-off data migration, and whether an outbound interface is needed | REQ-E09-01, E09-03 |
| BL-13 | **PQ-12** — does the umbrella PO carry quantities per line, or only a total value | Material Planner, ERP Functional | Whether call-off release checks quantity or value (CR-04) | REQ-E07-01 |
| BL-14 | **Q-18** — which working calendar defines the 1-working-day deadline | Material Planner | Confirms the default now built (Mon–Fri 08:00–17:00 WIB, Indonesian holidays) | Requirements 3.4 |
| BL-15 | **Q-20** — quality inspection in the hub for the MVP, while Supplier Quality is Phase 2 and receipts post in SAP | Material Planner, Procurement | Whether the inspection built at K-01 stays | REQ-E07-06 |
| BL-16 | **D-07** — the RFI needs a product catalog, which the deck puts in Phase 2 | Project sponsors | Whether RFI product entries become a real catalog | REQ-E03-02 |
| BL-17 | **DEC-06** — is Web Tukar Faktur this invoice capability or a separate application | Finance | Scope of REQ-E07-07 | PRD 9.3 |
| BL-18 | **DEC-09** — business owner for the performance dashboard | Steering Committee | Ownership of REQ-E10-01 | PRD 9.3 |
| BL-19 | **KPI definitions** — S4 confirmation accuracy, S5 optimized stock, and targets for OTIF, CFOT, PO response rate and procurement cycle time | Steering Committee, Material Planner | What the dashboard measures against | PRD section 1 |
| BL-19a | **A-01, A-02** — compliance and capability check for RFx with Mas Ary Hidayat; the full supplier filter parameter list | Procurement | Extra invitee filters beyond category and purchasing group | REQ-E03-01 |
| BL-19b | **MIG** — PROCIO to hub supplier data migration scope and approach | Procurement, MDM, IT | Foundation onboarding with real supplier data | PRD 9.3 |

---

## 2. Build work waiting on a decision

| ID | Item | Blocked by | Size | Detail |
|---|---|---|---|---|
| BL-20 | SAP ROP replenishment recommendations released as call-offs | BL-01, BL-10 | L | REQ-E09-01, X-16 |
| BL-21 | Event-based strategy analysis (launch, promotion, phase-in or out, supply crisis) | BL-02 | L | REQ-E09-02, X-17 |
| BL-22 | Supplier access to the TMS for shipment tracking | BL-03 | M | REQ-E13-01, X-21 |
| BL-23 | Replace placeholder tolerance and threshold values with the agreed ones | BL-05 to BL-09 | S | Config modules named in `BUILD-GAP.md` section 3 |

---

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
| — | Nothing closed yet. The first closed item goes here, with the date and the pull request that closed it | | |
