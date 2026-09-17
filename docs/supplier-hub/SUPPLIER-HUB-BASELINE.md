# Supplier Hub Project: Baseline from the Kick-Off Deck

| | |
|---|---|
| Source | `Kick Off Supplier Hub Project.pdf` (16 PDF pages, Paragon Corp) |
| Deck date | Aug 2026 |
| Captured | 2026-09-17 |
| Built from | The deck only. The codebase (`paragon-supplier-portal/`) was not read for this file |
| Status | **Draft baseline.** Section 10 lists the notes and deck constraints awaiting owner confirmation. Section 12 merges the owner-reviewed meeting notes (2026-09-17) |

**How to read this file.**
- Page citations use PDF page numbers (`p.9`). Slide footers run 1 behind the PDF pages from p.9 onward, so ignore them.
- Confidence tags: **S** = stated on the page. **V** = read from a chart, icon, or layout, so approximate. **I** = inferred by the analyst, reason given.
- IDs are stable. The later gap pass marks each `E..` row as built, partial, or missing.

---

## 1. Project charter

### 1.1 Problem (p.3, S)

| # | Challenge | Deck description |
|---|---|---|
| C1 | Scattered supplier data | Supplier master data, contracts, order collaboration files, and catalogs live across many files and systems |
| C2 | Manual, email-based processes | RFQs and call-offs still largely run through email and Excel, so they are prone to delays and human error |
| C3 | Limited real-time visibility | Planner and procurement teams lack direct visibility into supplier stock, forecast confirmation, and delivery progress |
| C4 | No performance tracking yet | Supplier performance evaluation is not standardized, so it cannot yet be a basis for sourcing decisions |

**Vision (p.3, S):** "Delivering one integrated Supplier Portal platform so the entire supplier collaboration cycle, from onboarding and sourcing to fulfillment, runs in real time, transparently, and measurably."

### 1.2 Meeting objectives: the 4 alignments (p.2, S)

| # | Alignment | What must be agreed |
|---|---|---|
| A1 | Stakeholder | Shared understanding of scope, goals, and benefits across Material Planner, Procurement, IT, and Business Transformation |
| A2 | Resource commitment | PIC, time, and effort from each team |
| A3 | Feature and MVP | Which features are in the MVP and which move to later phases |
| A4 | Timeline | Milestones, phase durations, and a realistic go-live date |

### 1.3 Strategic context: Integrated Materials Flow Transformation Roadmap (p.4, V)

Tagline: "Building a Pull-based, Quality-driven, Technology-enabled Materials Flow Powered by Adaptive Reliable People."

**House model:**
- Common goal: "Konsumen Happy" (happy consumers), supply reliability with a zero-waste spirit.
- What we build: Pull Operating Systems, an autonomous end-to-end materials flow network.
- How we operate: TQM Discipline (built-in quality); People & Organization (adaptive and reliable); Technology Enablement (physical and digitalization).
- Enablers: quality ownership, process excellence and discipline, kaizen; end-to-end ownership, opportunity capture capability, shopfloor leadership; dynamic planning and execution, integrated visibility, physical automation.
- Foundation: standardization and single source of truth.

**Maturity journey (bottom to top, V):**

| Stage | Characteristics |
|---|---|
| Reactive | Hero-based operation; manual planning and execution; "firefighting everyday but still mspt" |
| Controlled | Standard process and result (order rules and performance); supply confirmation, CFOT, capacity planning and unlocking |
| Predictive | Dynamic buffer; early warning; predictive capacity, quality, and inventory |
| Connected | End-to-end visibility; **supplier collaboration**; digital and integrated planning and execution |
| Autonomous | Autonomous material flow; dark warehouse |

**5-year roadmap and targets:**

| Horizon | Theme | Headline target | Other targets |
|---|---|---|---|
| 2026 Design & Deploy | Establish reliable and visible material flow foundation | 100% REL | CFOTQ Mat 70%; Working Cap. 13k PP |
| 2027 to 2028 Scale & Integrate | Scale pull execution and improve flow responsiveness | Modal reduced by half | CFOTQ Mat 100%; Working Cap. 7k PP |
| 2029 Autonomous | Operate a self-regulating and exception-based material network | 80% touchless plan and ops | CFOTQ Material 100%; Logistic cost 4K PP |

**Where the Supplier Hub sits (V):** "Supply Chain Collaboration Hub" is a 2026 item in the Technology Enablement row, next to "Debit & Inventory DMS Activation" and "PLMS: Milkrun". The 2027 to 2028 items in that row include "Call off & Debit Platform Integration" and "Physical Arm: AMR, ASRS Wave 1". Related items in other rows:
- Pull Operating Systems: Material Flow Playbook / OSI Pull Model; OSIP Wave 1 Local-Direct-JIT; Roll Out (Local Runner, RM, Import); Flow & Exception Managed (NPD, PIPO, Supply Crisis); Dynamic OSIP Engine (auto ROP and cycle adjustment).
- TQM Discipline: TQM Troops; **Supplier Bestie**; Internal-Armored; "Red Carpet"; BiQ all Network OSIP (supplier process capability, internal process capability); Quality Loss Elimination Program; **Layered Process Audit & Supplier Passport** (2029); Shift Left Quality.
- Standardization: Goal & Signal Harmonization (CFOT Mat. and Supplier, Supply Confirmation); Log. Cost Structure (returnable box as modal interlock); Closed Loop Govn. (escalation and exception-based mgmt); DELTA Thinking Institutionalization; PULL TQM Institutionalization (OSIP, BIQ).

### 1.4 Current flow and target operating model (p.5, V; original in Indonesian)

Title: "Dari Transformasi Squad Menuju Integrated Material Flow" (From squad transformation to integrated material flow). Subtitle: supply agility and flow management need integrated PULL, TQM, and technology.

**Current flow:** business need, LTP, capacity commitment, supply confirmation, delivery confirmation (planning line). FG gap at DC/NDC sends a pull signal to ROP/PO trigger, then call-off, then ASN/ETA (execution line). Physical flow: supplier, in transit, warehouse, factory, "Konsumen Happy". Every signal node carries a red warning marker.

**Systemic gaps by stage:**

| Stage | Deck wording | English |
|---|---|---|
| Supplier and confirmation | "Capacity & supply confirmation masih manual"; "Visibility SOP, WIP, feedstock supplier masih terbatas"; "Confirmation reliability < 50%" | Capacity and supply confirmation still manual; visibility of supplier SOP, WIP, and feedstock still limited; confirmation reliability below 50% |
| In transit | "Delivery schedule belum reliable"; "ETA & in-transit visibility belum real-time"; "ASN masih terlambat / tidak konsisten" | Delivery schedule not yet reliable; ETA and in-transit visibility not yet real time; ASN still late or inconsistent |
| Warehouse | "Call-off belum based on model"; "Modal / buffer warehouse belum jelas"; "Akurasi & integritas inventory masih bermasalah" | Call-off not yet model-based; warehouse modal or buffer unclear; inventory accuracy and integrity still problematic |
| Factory | "Material belum ready untuk release process order"; "Banyak manual review & firefighting setiap hari"; "13 juta process order masih blocked" | Material not ready to release process orders; heavy manual review and daily firefighting; 13 juta of process orders still blocked |

Banner: "Formasi sudah berubah, tetapi flow masih bergantung pada manual synchronization, fragmented visibility, dan banyak exception." (The formation has changed, but the flow still depends on manual synchronization, fragmented visibility, and many exceptions.)

**Execution snapshot:**

| Measure | Value |
|---|---|
| Process order created | 30 Juta |
| Material-ready | 17 Juta |
| Factory capacity | 10 Juta |
| Capacity queue | 7 Juta (I: 17 minus 10) |
| Supply-constrained gap | 13 Juta (I: 30 minus 17) |
| CFOT Material | 30% |
| 100% Scheduled Confirmation | 50% |
| Manual effort | High, every day |

**Target: Integrated Flow Operating System.**
- **SC Collaboration Hub** is labeled "Teknologi Digital Backbone (Single Source of Truth)", the digital technology backbone.
- **OSIP** = Order Supply Inventory Pull Model (expanded on the page). Its 4 levers:
  - Order Rule: what to order, based on finished goods and material characteristics.
  - Supply Method: how to make and deliver, based on value chain capability.
  - Inventory Strategy: how much to hold and where, based on demand and lead time.
  - Pull Trigger: when to replenish, based on actual consumption and call-off signal.
- **Signal layers** (these map most directly to portal features):

| Layer | Signals |
|---|---|
| Planning Signal Layer | LTP / demand; capacity commitment; supply and delivery confirmation |
| Execution Signal Layer | PO release; call-off; ASN / ETA; in-transit visibility; goods receipt |
| System of Record | SAP MM / PP / SD; master data and parameters; stock, batch, and FIFO integrity |

- Outcome pillars: Supply Sustainability (material arrives at the warehouse without surprises); Logistics Operations (the factory never stops because the warehouse failed); Flow Systems Excellence (remove firefighting structurally).
- TQM mindset: quality ownership; process excellence and discipline; kaizen.
- Closing line: "OSIP defines the model. Technology connects the flow. TQM removes recurring exceptions."
- Expected results: reliability up; healthier working capital; fewer exceptions; more touchless planning and operations.

---

## 2. Scope map (p.6, S)

"13 epics grouped into 5 main categories."

| ID | Category | Epic | Marker on p.6 |
|---|---|---|---|
| E01 | Foundation | Supplier Registration & Onboarding | "PROCIO E-Procurement Application" badge (V) |
| E02 | Foundation | Supplier Master Data Management | "PROCIO E-Procurement Application" badge (V) |
| E03 | Sourcing & Contracting | RFx & Quotation Management | |
| E04 | Sourcing & Contracting | Contract Management | |
| E05 | Sourcing & Contracting | Catalog Management | |
| E06 | Planning & Fulfillment | Forecast Collaboration | Named "Foresight Collaboration" on p.7 |
| E07 | Planning & Fulfillment | Order Collaboration | "Web Tukar Faktur" badge (V) |
| E08 | Planning & Fulfillment | Inventory & Capacity Collaboration | |
| E09 | Planning & Fulfillment | Call off Management | |
| E10 | Performance & Analytics | Supplier Performance Dashboard | |
| E11 | Performance & Analytics | Reporting & Analytic Dashboard | |
| E12 | System Integration | API ERP | |
| E13 | System Integration | API Shipment Aggregator | |
| EX1 | (outside the 13) | Web Tukar Faktur | Badge on E07. "Tukar faktur" = invoice exchange (I) |
| EX2 | (outside the 13) | Supplier Quality | Appears only on p.9, Phase 2 |
| EX3 | (outside the 13) | Web scraping and AI for sourcing | Appears only on p.9, Phase 3 |

---

## 3. Requirement register

Sources: p.7 and p.8 (headed "Draft Sub-Epics & Sample User Stories"), p.9 for phase, p.12 for owner, p.11 for pilot.

**Column notes.**
- **Owner:** business owner team from p.12. MP = Material Planner, PROC = Procurement, FIN = Finance, IT = IT; "support" = a design-support role on p.12.
- **Pilot:** DP = DP Group, DKSH = DKSH Indonesia, LL = Lautan Luas (p.11).
- **Search terms** and **Evidence** are always inferred (I). They are there to guide the codebase check.

### 3.1 Foundation

| ID | Capability | Deck wording | Phase | Tag | Owner | PIC | Pilot | KPI | Risk | Search terms | Evidence of implementation (I) | Src | Conf |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E01.01 | Supplier self-request and registration | "Supplier request & registration" | MVP | | PROC; MDM, Legal support | Vergi | | KPI-02 | RSK-04 | register, signup, onboarding, vendor request, pendaftaran | Public or supplier-facing registration form that creates a pending supplier record | p.7, p.9, p.12 | S |
| E01.02 | Internal-initiated registration | "Internal registration" | MVP | | PROC | Vergi | | KPI-02 | | internal registration, invite supplier, create vendor | Buyer-side screen to register a supplier on its behalf | p.7 | S |
| E01.03 | Onboarding questionnaire | "Questionnaire module" | MVP | | PROC | Vergi | | | | questionnaire, survey, assessment, kuesioner | Configurable question set that suppliers answer, with stored responses | p.7 | S |
| E01.04 | Supplier qualification | "Supplier qualification" | MVP | | PROC | Vergi | | | | qualification, prequalification, scoring, eligibility | Qualification status or score on the supplier record | p.7 | S |
| E01.05 | Verification and approval workflow | "Verification & approval workflow" | MVP | | PROC; MDM, Legal support | Vergi | | KPI-02 | RSK-05 | approval, verification, workflow, approver, reject | Multi-step approval states (submitted, verified, approved, rejected) with approver roles | p.7, p.12 | S |
| E02.01 | Profile and bank data maintenance | "Profile & bank data maintenance" | MVP | | Not stated; MDM validates (I) | Vergi | | | RSK-05 | profile, bank account, rekening, NPWP, vendor master | Editable supplier profile including bank details | p.7 | S |
| E02.02 | Profile update by supplier or internal user | "Update supplier profile (by supplier/ internal)" | MVP | | Not stated | Vergi | | | RSK-05 | profile update, change request, edit supplier | Both roles can submit profile changes, ideally with review | p.7 | S |
| E02.03 | Deactivation and blacklist | "Deactivation & blacklist" | MVP | | Not stated | Vergi | | | | deactivate, blacklist, block, inactive, suspend | Supplier status values for inactive and blacklisted, with effect on transactions | p.7 | S |
| E02.04 | Master data integration to SAP MM | "Integration to SAP MM" | MVP | | IT (I) | Vergi | | | RSK-01, RSK-07 | SAP, MM, vendor master, BAPI, sync, LFA1 | Outbound or inbound vendor master sync with SAP MM | p.7 | S |
| E02.05 | Vendor document storage | "Soft file Vendor Document" | MVP | | Not stated; Legal validates (I) | Vergi | | | | document, upload, attachment, certificate, dokumen | Upload and store supplier documents against the supplier record | p.7, p.12 | S |

### 3.2 Sourcing and contracting

| ID | Capability | Deck wording | Phase | Tag | Owner | PIC | Pilot | KPI | Risk | Search terms | Evidence of implementation (I) | Src | Conf |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E03.01 | Sourcing request and sourcing project | "Create sourcing request & sourcing project" | MVP | | PROC | | | KPI-06 | | sourcing request, sourcing project, purchase requisition, PR intake | Create a sourcing request and group it into a project | p.7, p.9 | S |
| E03.02 | RFx event creation | "RFx event creation" | MVP | | PROC | | | KPI-06 | | RFQ, RFP, RFI, RFx, event, tender | Buyer creates an RFx event with items, invited suppliers, deadline | p.7 | S |
| E03.03 | Quotation submission | "Quotation submission" | MVP | | PROC | | | KPI-06 | RSK-04 | quotation, quote, bid, penawaran | Supplier submits a priced quote against an RFx event | p.7 | S |
| E03.04 | Bid comparison and negotiation | "Bid comparison & negotiation" | MVP | | PROC | | | KPI-06 | | bid comparison, negotiation, counter offer, evaluation | Side-by-side quote comparison plus a negotiation round or counter-offer | p.7 | S |
| E03.05 | Awarding | "Awarding event" | MVP | | PROC | | | KPI-06 | | award, winner, awarding, PO creation | Award action on an RFx event with an awarded supplier record | p.7 | S |
| E04.01 | Contract creation and e-signature | "Creation & e-signature" | Phase 2 | | PROC; Legal support | | | | | contract, agreement, e-signature, sign, kontrak | Contract record created, with an e-signature step | p.7, p.9, p.12 | S |
| E04.02 | Contract lifecycle and renewal alerts | "Lifecycle & renewal alerts" | Phase 2 | | PROC | | | | | expiry, renewal, lifecycle, alert | Contract status lifecycle and alerts before expiry | p.7 | S |
| E04.03 | Contract compliance and deviation tracking | "Compliance & deviation tracking" | Phase 2 | | PROC; Legal support | | | | | compliance, deviation, breach, contract compliance | Deviations logged against contract terms | p.7 | S |
| E05.01 | Catalog upload and maintenance | "Catalog upload & maintenance" | Phase 2 | | PROC | | | | | catalog, catalogue, item master, price list, upload | Supplier or buyer uploads and edits catalog items | p.7, p.9 | S |
| E05.02 | Catalog search and availability | "Search & availability" | Phase 2 | | PROC | | | | | catalog search, availability, stock availability | Search screen showing catalog items with availability | p.7 | S |
| E05.03 | B2B Marketplace integration | "Integration with B2B Marketplace" | Phase 2 | | PROC; IT (I) | | | | RSK-02 | marketplace, B2B, punchout | Connector to an external B2B marketplace | p.7 | S |

### 3.3 Planning and fulfillment

| ID | Capability | Deck wording | Phase | Tag | Owner | PIC | Pilot | KPI | Risk | Search terms | Evidence of implementation (I) | Src | Conf |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E06.01 | Forecast sharing to suppliers | "Demand Anticipation (Forecast sharing)" | MVP | | MP | | DP, LL | KPI-04 | RSK-05 | forecast, demand, LTP, publish forecast, prakiraan | Buyer publishes a forecast horizon that the supplier can view | p.7, p.9, p.11, p.12 | S |
| E06.02 | Supplier commitment and exception | "Commitment & exception" | MVP | | MP | | DP, LL | KPI-04 | RSK-05 | commitment, supply commitment, confirm forecast, exception | Supplier commits or flags an exception per forecast line; the buyer sees the gap | p.7, p.11 | S |
| E07.01 | PO confirmation | "PO confirmation" | MVP | P0 | MP | Levi | | KPI-05 | RSK-04 | purchase order, PO confirm, acknowledge, accept, reject | Supplier accepts, rejects, or changes a PO; status stored | p.7, p.9 | S |
| E07.02 | Advanced shipping notice confirmation | "Advanced shipping notice confirmation" | MVP | P0 | MP | Levi | DKSH | KPI-05 | | ASN, advanced shipping notice, shipment notice, dispatch | Supplier creates an ASN against a PO with quantities and ETA | p.7 | S |
| E07.03 | Goods receipt confirmation | "Goods Receipt confirmation" | MVP | P0 | MP | Levi | | KPI-05 | RSK-05 | goods receipt, GR, receiving, penerimaan | GR quantity visible and confirmed against ASN or PO | p.7 | S |
| E07.04 | Invoice collaboration | "Invoice collaboration" | MVP | P0 | FIN | Levi | | | | invoice, faktur, tukar faktur, billing, AP | Supplier submits an invoice matched to PO or GR, with status | p.7, p.12 | S |
| E07.05 | Interface PO, GR, inbound delivery, invoice to external systems | "Interface PO, GR, Inbound Delivery, Invoice to external systems" | MVP | P0 | MP; IT (I) | Levi | DP | | RSK-01, RSK-07 | interface, inbound delivery, IDoc, API, SAP, integration | PO, GR, inbound delivery, and invoice data exchanged with an external system | p.7 | S |
| E08.01 | Capacity and inventory visibility | "Capacity & inventory visibility" | MVP | P0 | MP | | | KPI-04 | RSK-05 | capacity, inventory, stock, supplier stock, WIP, kapasitas | Supplier-maintained capacity and stock visible to planners | p.7, p.9 | S |
| E08.02 | Capacity and inventory alerts | "Alerts notification" | MVP | P0 | MP | | DKSH | KPI-04 | | alert, notification, shortage, threshold, early warning | Alerts raised on a capacity or stock breach | p.7, p.11 | S |
| E09.01 | Replenishment strategy and calculation | "Replenishment strategy & calculation" | MVP | | MP | | DP, LL | KPI-04 | | replenishment, ROP, reorder point, min max, OSIP | Calculated replenishment quantity or trigger per material | p.7, p.9 | S |
| E09.01.01 | Event-based strategy analysis | "Analysis of event based strategy" | MVP | | MP | | | KPI-04 | | event based, trigger, scenario, strategy analysis | Analysis view comparing event-based replenishment options | p.7 | S |
| E09.02 | Execution strategy: when the supplier can and must deliver | "[P1] Execution strategy (kapan supplier bisa dan perlu datang)" | MVP | P1 | MP | | DP, LL | KPI-05 | | call-off, delivery slot, schedule, delivery window, jadwal | Call-off with a requested date and the supplier's feasible delivery date | p.7, p.11 | S |

### 3.4 Performance, analytics, integration

| ID | Capability | Deck wording | Phase | Tag | Owner | PIC | Pilot | KPI | Risk | Search terms | Evidence of implementation (I) | Src | Conf |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E10.01 | Supplier scorecard and KPI | "Scorecard & KPI (OTIF, quality, price)" | MVP | | Not stated; PROC sets evaluation standards (I) | | | KPI-05 | RSK-05 | scorecard, OTIF, supplier rating, KPI, performance | Per-supplier scorecard computing OTIF, quality, and price metrics | p.8, p.9, p.12 | S |
| E10.02 | Non-conformance and complaint tracking | "Non-conformance & complaint tracking" | MVP | | Not stated | | | | | non-conformance, NCR, complaint, claim, keluhan | Log NCRs or complaints against a supplier with a status | p.8 | S |
| E11.01 | Spend and sourcing analytics | "Spend & sourcing analytics" | Phase 2 | | Not stated | | | KPI-06 | | spend, analytics, sourcing report, savings | Spend dashboard by supplier, category, period | p.8, p.9 | S |
| E11.02 | Supplier KPI overview | "Overview KPI suppliers" | Phase 2 | | Not stated | | | KPI-05 | | KPI overview, dashboard, supplier summary | Cross-supplier KPI summary page | p.8 | S |
| E12.01 | Supplier stock, capacity, inventory model sync | "Supplier stock, capacity, inventory model sync" | MVP | | IT | | DP | KPI-04 | RSK-01, RSK-02, RSK-07 | API, sync, stock sync, capacity sync, ERP | Automated feed of supplier stock and capacity from the supplier ERP | p.8, p.9, p.11, p.12 | S |
| E12.02 | Supplier transactional data sync | "Supplier data transactional sync (ex : sales order, delivery order, etc)" | MVP | | IT | | DP | | RSK-01, RSK-02, RSK-07 | sales order, delivery order, ERP-to-ERP, EDI | Supplier SO or DO data received and linked to PO or ASN | p.8, p.11 | S |
| E13.01 | Shipment tracking integration | "Shipment tracking integration" | Phase 2 | | IT | | DKSH | KPI-05 | RSK-02 | shipment, tracking, aggregator, logistics, carrier | Tracking status pulled from a shipment aggregator | p.8, p.9, p.11 | S |
| E13.02 | ETA visibility | "ETA visibility" | Phase 2 | | IT | | DKSH | KPI-05 | RSK-02 | ETA, estimated arrival, in transit | ETA shown per shipment or ASN | p.8, p.11 | S |

### 3.5 Items outside the 13 epics

| ID | Capability | Deck wording | Phase | Owner | Pilot | Search terms | Evidence of implementation (I) | Src | Conf |
|---|---|---|---|---|---|---|---|---|---|
| EX1 | Web invoice exchange | "Web Tukar Faktur" | Not stated (sits on E07, an MVP epic) | FIN (I) | | tukar faktur, invoice exchange, faktur pajak | Invoice exchange web flow; may be the same as E07.04 | p.6 | V |
| EX2 | Supplier quality | "Supplier Quality" | Phase 2 | Not stated | | quality, QC, inspection, defect | No sub-epics defined in the deck | p.9 | S |
| EX3 | Web scraping and AI for sourcing | "Webscrapping and utilize AI for sourcing" | Phase 3 | Not stated | | scrape, crawler, AI sourcing, supplier discovery | No sub-epics defined in the deck | p.9 | S |

### 3.6 Pilot capabilities with no matching register row

| ID | Capability to validate | Pilot | Closest row | Src |
|---|---|---|---|---|
| PX1 | "Early warning, risk classification" | DKSH | E08.02 covers alerts only. No risk classification capability is defined | p.11 |
| PX2 | "Response SLA" | Lautan Luas | None. No SLA capability is defined | p.11 |

---

## 4. Release plan and milestones

### 4.1 Phase contents (p.9, S)

| Phase | Heading on slide | Items as listed |
|---|---|---|
| MVP | "Phase 1: Foundation to Transact" | [Vergi] Supplier registration & Onboarding (E01); [Vergi] Supplier master data management (E02); Forecast Collaboration (E06); Inventory & Capacity Collaboration (E08); [Levi] Order Collaboration (E07); Call Off Management (E09); API ERP (E12); *visual gap*; RFx & Quotation Management (E03); Supplier Performance Dashboard (E10) |
| Phase 2 | "Contract & Catalog Management" | Contract Management (E04); Reporting And Analytic Dashboard (E11); Catalog management (E05); API Shipment Agregator (E13); Supplier Quality (EX2) |
| Phase 3 | "Contract & Catalog Management" | Webscrapping and utilize AI for sourcing (EX3) |

### 4.2 Milestones (p.10, V unless marked)

Header: "Target milestones August 2026 to May 2027 (to be agreed together)". Footnote (S): "this timeline is indicative and will be finalized once resources and MVP scope are agreed."

| ID | Milestone | Start | End | Conf |
|---|---|---|---|---|
| MS-01 | Discovery & Design | Start of Aug'26 | End of Sep'26 | V |
| MS-02 | Phase 1: MVP Build & Launch | Start of Oct'26 | End of Mar'27 | V |
| MS-03 | Go-Live MVP | End of Mar'27 | (marker) | V |
| MS-04 | Phase 2: Build & Launch | Start of Apr'27 | End of May'27 | V; the bar sits between the Phase 1 and Phase 2 rows |
| MS-05 | Phase 3: Build & Launch | No bar drawn | No bar drawn | V |
| MS-06 | Go-Live Phase 3 | Mid to late Apr'27 | (marker) | V |
| MS-07 | Hypercare & Stabilization | Start of Oct'26 | Mid to late Apr'27 | V |

---

## 5. People and commitments

### 5.1 Teams (p.12, S)

| ID | Team | Key contribution | Supporting detail |
|---|---|---|---|
| TEAM-01 | Material Planner | Business owner for Forecast, Order, Inventory, and Call-off Collaboration (E06 to E09) | Provides planning process requirements, replenishment strategy, and collaboration features |
| TEAM-02 | Procurement | Business owner for Supplier Onboarding, RFx, Contract, and Catalog Management (E01, E03, E04, E05) | Defines sourcing policy and supplier evaluation standards |
| TEAM-03 | IT | Technical delivery of the platform, system integration, and system security | Provides the Solution Architect, Developer and QA team, and Integration |
| TEAM-04 | Process Transformation | Risk management, change management, end-to-end process standardization | Identifies potential risk and ensures the end-to-end supplier collaboration process |
| TEAM-05 | Master Data Team | Validates supplier-submitted data against master data governance | Supports the design of supplier onboarding and registration |
| TEAM-06 | Legal Team | Validates supplier documents for legal and regulatory compliance | Supports the design of onboarding, registration, and contract management |
| TEAM-07 | Finance | Business owner for invoice collaboration (E07.04) | Oversees invoicing for accurate and on-time supplier payment |

### 5.2 Roles and time allocation for the MVP phase (p.13)

Allocation is read from Harvey balls, so every percentage is **V** and approximate (0, 25, 50, 75, 100).

| ID | Role | Person in charge (S) | Design | Build | Test | Deploy | Flag |
|---|---|---|---|---|---|---|---|
| ROLE-01 | Project Sponsor | Juan Jose, Yogi | none | none | none | none | No allocation drawn |
| ROLE-02 | Project Manager | Vergiant, Levi | 75 | 50 | 75 | 75 | |
| ROLE-03 | PMO | Zanja | 0 | 25 | 50 | 25 | |
| ROLE-04 | BPO / Key User Material Planner | Anugerah / Septi, Ary, Widara | 75 | 25 | 75 | 75 | |
| ROLE-05 | BPO / Key User Procurement | Sutan, Munadah / Meli, Alfia, Rinaldi, Sesya, Purwita | 75 | 25 | 75 | 75 | |
| ROLE-06 | BPO / Key User Legal | TBC | 25 | 25 | 25 | 0 | **TBC** |
| ROLE-07 | BPO / Key User Finance (AP) | TBC | 25 | 25 | 25 | 0 | **TBC** |
| ROLE-08 | Software Engineer & QA | Vacant (in red) | 0 | 100 | 75 | 25 | **Vacant** |
| ROLE-09 | ERP Functional | Alfi, Muharani, Adi | 50 | 50 | 25 | 0 | |
| ROLE-10 | Process Transformation | Andy | 50 | 25 | 0 | 50 | |
| ROLE-11 | Master Data Management | Silvi, Noviandri | 25 | 25 | 25 | 25 | |

In the BPO rows, the name before "/" is read as the BPO and the names after it as key users (I, from the "BPO / Key User" role label).

---

## 6. Pilot suppliers (p.11, S)

| ID | Supplier | Type | Why selected | Capability to validate | Rows |
|---|---|---|---|---|---|
| PILOT-01 | DP Group (Dynaplast, Rapid Plast) | Packaging | SAP-enabled supplier; high business impact; fast replenishment, high call-off frequency | Potentially connect ERP-to-ERP; forecast collaboration and supply commitment; call-off management | E12, E07.05, E06, E09 |
| PILOT-02 | DKSH Indonesia, PT | Raw material | High business impact; frequent shortages; long lead time supplier | Shipment visibility and ETA tracking; early warning, risk classification | E13, E07.02, E08.02, PX1 |
| PILOT-03 | Lautan Luas, PT | Raw material | High business impact; several local items, very responsive; fast replenishment, high call-off frequency | Forecast collaboration and supply commitment; call-off management; response SLA | E06, E09, PX2 |

---

## 7. Success metrics (p.15, S)

"KPIs that will be tracked once the portal is live."

| ID | KPI | Definition as printed | Target as printed | Measurement source |
|---|---|---|---|---|
| KPI-01 | Website Uptime | "99% uptime application, with zero error or bug that impacted to business" | 99% uptime; zero business-impacting bugs | Not stated |
| KPI-02 | Suppliers Boarded On Time | "Listes suppliers that eligible to use supplier portal boarded on time" | 80% | Not stated; eligible supplier list not defined |
| KPI-03 | Supplier Compliance | "Supplier actively using the application" | 100% | Not stated; "actively using" not defined |
| KPI-04 | Optimize Stock | "Measuring the reduction in excess/obsolete inventory and stockouts through forecast, VMI, and inventory collaboration with suppliers" | No numeric target stated | Not stated |
| KPI-05 | Supplier OTIF Performance | "Percentage of on-time supplier deliveries based on portal data" | No numeric target stated | Portal data |
| KPI-06 | Procurement Cycle Time | "Sourcing to purchase order lead time reduced" | No numeric target stated | Not stated |

No baseline values are given for any KPI. The strategic targets in section 1.3 (CFOTQ, working capital, REL) are not linked to the portal KPIs on p.15.

---

## 8. Risks (p.14, S)

"Things to anticipate together from the start." No mitigations or owners are stated for any risk.

| ID | Risk as printed | Affected rows (I) |
|---|---|---|
| RSK-01 | Lack readiness of the ERP API endpoints for master data and transaction synchronization | E02.04, E07.05, E12 |
| RSK-02 | Supplier or aggregator is reluctant to open their API | E05.03, E12, E13 |
| RSK-03 | Resistance to process change from suppliers and internal users alike | All; adoption KPIs KPI-02, KPI-03 |
| RSK-04 | Low digital literacy among suppliers leads to slow adoption of the portal | E01, E03.03, E07; KPI-02, KPI-03 |
| RSK-05 | Poor data quality (ex: discrepancy stock, poor accuracy forecasting, master data, etc) | E02, E06, E08, E10 |
| RSK-06 | Deployment delay due to miss scope and availability resources | All milestones; ROLE-08 vacant |
| RSK-07 | Error integration between internal and supplier ERP | E02.04, E07.05, E12 |

---

## 9. Glossary

"Expanded on page" means the deck itself gives the meaning. "Common meaning (I)" is standard industry usage, supplied by the analyst. Every other term is left for the owner to confirm.

| Term | Meaning | Basis |
|---|---|---|
| OSIP | Order Supply Inventory Pull Model | Expanded on page (p.5) |
| SC Collaboration Hub | "Teknologi Digital Backbone (Single Source of Truth)" | Expanded on page (p.5) |
| Juta | Indonesian for million. The unit of the p.5 values (currency, units, or orders) is not stated | Common meaning (I) |
| Konsumen Happy | Happy consumers | Translation (I) |
| Tukar Faktur | Invoice exchange | Translation (I) |
| PROCIO | "E-Procurement Application" (badge subtitle on p.6) | Expanded on page, partially |
| PO, GR, ASN, ETA, RFx, RFQ, OTIF, SLA, SOP, WIP, FIFO, JIT, VMI, AP, PIC, PMO, BPO, MDM, SAP MM / PP / SD, AMR, ASRS, NPD, FG, DC | Standard supply chain and SAP terms | Common meaning (I) |
| LTP | Long-term planning (I) | Common meaning (I) |
| ROP | Reorder point (I) | Common meaning (I) |
| NDC | Not expanded (national distribution center likely) | Not expanded in deck |
| CFOT | Casefill On-Time, measured per PO (like OTIF, which is measured per call-off) | Confirmed by owner, meeting notes MN-ORD-07 |
| CFOTQ | Not expanded (likely CFOT plus quality, inferred) | Not expanded in deck |
| REL | Not expanded (likely reliability) | Not expanded in deck |
| PP (as in "13k PP", "4K PP") | Not expanded | Not expanded in deck |
| BiQ / BIQ | Not expanded | Not expanded in deck |
| PIPO | Not expanded | Not expanded in deck |
| PLMS, DMS | Not expanded | Not expanded in deck |
| SS, LOGOPS, FSE | Not expanded (role names under "Material Role Transform.") | Not expanded in deck |
| QIT, QCP | Not expanded | Not expanded in deck |
| TQM Troops, Supplier Bestie, Internal-Armored, Red Carpet, DELTA Thinking | Internal program names | Not expanded in deck |
| Odyssey | Appears on the cover next to the team names | Not expanded in deck |
| mspt | "Firefighting everyday but still mspt" | Not expanded in deck |

---

## 10. Notes to confirm: deck constraints, conflicts, and open decisions

These are captured as notes only. Nothing in sections 1 to 9 resolves them. Fill in the Decision column when confirmed.

### 10.1 Deck constraints to carry into planning

| ID | Constraint as the deck states it | Src | Decision |
|---|---|---|---|
| N-01 | The timeline is indicative and will be finalized after resources and MVP scope are agreed | p.10 | |
| N-02 | The sub-epics are a "Draft", described as "Sample User Stories", not a final backlog | p.7, p.8 | |
| N-03 | MVP window is about 6 months of build (Oct'26 to Mar'27) after 2 months of discovery and design | p.10 | |
| N-04 | Software Engineer & QA is vacant, yet it is the only role at full Build allocation | p.13 | |
| N-05 | Legal and Finance key users are TBC | p.13 | |
| N-06 | P0 tags exist only on Inventory & Capacity Collaboration (E08) and Order Collaboration (E07). P1 exists only on Call-off execution strategy (E09.02). No other row carries a priority tag | p.7 | |
| N-07 | Only E01, E02 (Vergi) and E07 (Levi) have a named PIC. The other MVP epics have no PIC | p.9 | |
| N-08 | Portal KPIs 4 to 6 have no numeric target, and none has a baseline | p.15 | |
| N-09 | No risk has a mitigation or owner | p.14 | |
| N-10 | Registration & Onboarding and Master Data Management carry a PROCIO e-procurement badge. The deck does not say whether these epics are delivered in PROCIO, integrated with it, or rebuilt in the portal | p.6 | |

### 10.2 Conflicts between pages

| ID | Page A says | Page B says | Pages | Which wins under the ranking |
|---|---|---|---|---|
| CON-01 | Epic "Forecast Collaboration" | "Foresight Collaboration" | p.6 vs p.7 | Same epic. p.6 name kept |
| CON-02 | 13 epics in 5 categories | "Supplier Quality" in Phase 2, not an epic | p.6 vs p.9 | p.9 for phase. Scope status open |
| CON-03 | 13 epics in 5 categories | "Webscrapping and utilize AI for sourcing" in Phase 3, not an epic | p.6 vs p.9 | p.9 for phase. Scope status open |
| CON-04 | "Web Tukar Faktur" badge on Order Collaboration | Invoice collaboration listed as a sub-epic of Order Collaboration | p.6 vs p.7 | Open: same capability or separate application |
| CON-05 | Phase 2 heading "Contract & Catalog Management" | Phase 3 has the same heading but only contains web scraping and AI | p.9 | Likely a copy error in Phase 3 (I) |
| CON-06 | Phase 3 in scope with its own go-live | No Phase 3 bar on the timeline; Phase 3 go-live marker (mid to late Apr'27) falls before the Phase 2 bar ends (end of May'27) | p.9 vs p.10 | Open |
| CON-07 | Phase 2 bar | Drawn between the Phase 1 and Phase 2 rows, so its row is ambiguous | p.10 | V reading: Phase 2 |
| CON-08 | Hypercare follows go-live (I, usual order) | Hypercare bar starts Oct'26, about 6 months before MVP go-live | p.10 | Open |
| CON-09 | Timeline header "August 2026 to May 2027" | Kick-off deck dated Aug 2026, so Discovery & Design (Aug to Sep'26) is already running at kick-off | p.1 vs p.10 | Open |
| CON-10 | Material Planner is business owner for Order Collaboration | Finance is business owner for invoice collaboration, a sub-epic of Order Collaboration; PIC for Order Collaboration is Levi | p.12 vs p.7, p.9 | Split ownership of E07 |
| CON-11 | Stakeholder teams: Material Planner, Procurement, IT, Odyssey | Alignment names "Business Transformation"; team slide names "Process Transformation" | p.1 vs p.2 vs p.12 | Open: likely the same team under 3 names (I) |
| CON-12 | MVP includes Supplier Performance Dashboard (E10) | No team on p.12 is business owner for E10, E11, or E02 | p.9 vs p.12 | Open |
| CON-13 | KPI-04 cites "VMI" | No VMI epic or sub-epic exists | p.15 vs p.6 to p.8 | Open |
| CON-14 | DKSH validates "Early warning, risk classification"; Lautan Luas validates "Response SLA" | No capability defines risk classification or response SLA | p.11 vs p.7, p.8 | Open (PX1, PX2) |
| CON-15 | Shipment visibility and ETA tracking validated with a pilot | API Shipment Aggregator (E13) is Phase 2, after MVP go-live | p.11 vs p.9 | Open: pilot timing |
| CON-16 | MVP list | RFx & Quotation and Supplier Performance Dashboard sit after a visual gap, possibly a separate tier within MVP | p.9 | V. Open |
| CON-17 | Sub-bullet markers | "Supplier request & registration" (p.7) and "Overview KPI suppliers" (p.8) use a different bullet marker from their siblings, so nesting is unclear | p.7, p.8 | Treated as siblings |
| CON-18 | 5-year roadmap maturity stages | The text layer order (Reactive, Controlled, Connected, Predictive, Autonomous) differs from the visual order bottom to top (Reactive, Controlled, Predictive, Connected, Autonomous) | p.4 | V order used |

### 10.3 Open decisions

| ID | Decision the deck leaves open | Src | Decision |
|---|---|---|---|
| DEC-01 | Stakeholder alignment on scope, goals, benefits (A1) | p.2 | |
| DEC-02 | Committed PIC, time, effort per team (A2), including filling ROLE-06, ROLE-07, ROLE-08 | p.2, p.13 | |
| DEC-03 | Final MVP feature list (A3), including whether E03 and E10 stay in MVP | p.2, p.9 | |
| DEC-04 | Final milestones and go-live date (A4) | p.2, p.10 | |
| DEC-05 | Relationship with PROCIO for E01 and E02 | p.6 | |
| DEC-06 | Whether Web Tukar Faktur is a separate app, part of E07.04, or out of scope | p.6 | |
| DEC-07 | Scope and sub-epics of Supplier Quality (EX2) and AI sourcing (EX3) | p.9 | |
| DEC-08 | Numeric targets and baselines for KPI-04, KPI-05, KPI-06, and definitions of "eligible" and "actively using" | p.15 | |
| DEC-09 | Business owners for E02, E10, E11 | p.12 | |
| DEC-10 | Risk owners and mitigations | p.14 | |
| DEC-11 | Whether early warning or risk classification and response SLA are MVP capabilities | p.11 | |

---

## 11. What could not be read or verified

| Page | What is uncertain |
|---|---|
| p.4 | Dense graphic with a watermark. Arrow meaning between roadmap boxes (dashed paths from "1", "Red Carpet", the "=" sign between Supply Chain Collaboration Hub and PLMS) is not explained |
| p.4 | Units of "13k PP", "7k PP", "4K PP" and meaning of "100% REL" |
| p.5 | Small, low-resolution text in the image. Units of "30 Juta", "17 Juta", "10 Juta", "13 juta process order" are not stated |
| p.5 | The label "100% Scheduled Confirmation 50%" reads as a metric name plus a value, but may be a target and an actual |
| p.10 | All dates are read from bar positions and are approximate to about half a month |
| p.13 | Harvey-ball fills are approximate to the nearest 25% |
| p.1 | Meaning of "Odyssey" |
| All | Target user roles, supplier count in scope, security and access requirements, languages, and non-functional requirements beyond KPI-01 uptime are not stated in the deck |

---

## 12. Merged from the kick-off meeting notes (owner-reviewed 2026-09-17)

Source: `KICKOFF-MEETING-NOTES.md`. That file holds each point with its original scrap. Full requirements are in `SUPPLIER-HUB-REQUIREMENTS.md`.

### 12.1 New register rows

| ID | Capability | Phase | Source notes |
|---|---|---|---|
| E08.03 | Inventory data submission by spreadsheet template upload, API sync started by PTI, and manual entry | MVP | MN-INV-07 |
| E08.04 | Supplier access to PTI stock, per supplier, maintained by the Material Planner; per-material access for consignment materials is nice to have | MVP | MN-INV-08 to MN-INV-12 |
| E07.06 | PO response within 1 working day: approve, adjust with predefined reason and counter-offer, reject (date, quantity, quality); no response escalates to PTI | MVP, P0 | MN-ORD-04 to MN-ORD-08, MN-ORD-14 |
| E07.07 | 3 confirmations (capacity, foresight or fixed stock, shipping notice) linked to their menus, and the Order Collaboration Summary for PTI and the owning supplier | MVP, P0 | MN-ORD-10 to MN-ORD-13 |
| E10.03 | CFOT per PO and OTIF per call-off, shown on the performance dashboard and in supplier sourcing | MVP | MN-ORD-07, MN-ORD-09 |
| E03.06 | Supplier filtering for sourcing events by commodity, purchasing group, and further parameters | MVP | MN-RFX-01 |
| E03.07 | Independent RFI, RFQ, RFP event types; RFI data reusable in an RFQ | MVP | MN-RFX-02 to MN-RFX-05 |

### 12.2 Changes to existing rows

| Row | Change | Source |
|---|---|---|
| E08.01 | On-hand and upcoming quantity with date (no "available" figure); SOH split by supplier and PTI; PTI ROP and supplier ROP; aggregate incoming split into in production and in transit; raw material and packaging separate | MN-INV-01 to MN-INV-06 |
| E09.01 | ROP and replenishment recommendation come from SAP (demand sensing), not calculated in the hub | MN-INV-14 |
| E13.01 | Suppliers get TMS access to track deliveries first, API exchange later. Phase still open, deck has E13 in Phase 2 | MN-INV-13 |
| E06.02 | Foresight or fixed-stock confirmation page lives in Forecast Collaboration, shown in the Order Collaboration Summary | MN-ORD-11, MN-ORD-13 |

### 12.3 Effect on section 10

| Item | Effect |
|---|---|
| PX2, DEC-11 | Partly answered: 1-working-day PO response deadline is a concrete response SLA |
| CON-01 | Settled by page ownership: forecast confirmation lives in Forecast Collaboration |
| CON-15 | Still open, now tied to the TMS access phase decision |
| Glossary | CFOT expanded as Casefill On-Time |
| New open | Q-18 working calendar; A-01 check with Mas Ary Hidayat; A-02 supplier filter parameters; D-03 TMS phase; D-07 RFI catalog while E05 is Phase 2 |

