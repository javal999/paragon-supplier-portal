# Supplier Hub: Backlog

| | |
|---|---|
| Version | 2.6, 2026-09-24 |
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
| BL-01 | **REPL** — replenishment method and governance | Material Planner (consultant engaged) | The shape of REQ-E09-01, and BL-118 where to hold buffers (E14-12) | PRD 9.3 |
| BL-11 | **PQ-06** — interface technology and latency target | IT | The real SAP interface, and what the interface monitor watches | REQ-E07-08 |
| BL-12 | **PQ-11** — is the hub the long-term record for call-offs? Recommended: the hub holds them for the pilot, and SAP scheduling agreement releases become the long-term record. **Awaiting the owner's yes** | Material Planner, IT | Integration scope (BL-11), and whether call-offs migrate to SAP later | REQ-E09-01, E09-03 |
| BL-54 | **PQ-05 cap** — the absolute rupiah cap on invoice price variance (the 0% and 2% tolerances are decided) | Finance | The final value in CR-12; the build uses a placeholder until then | REQ-E07-07 |
| BL-55 | **A-05** — minimum OTIF for the compliance gate, and whether "No history" passes (proposed: passes) | Procurement | The final value in CR-23; the build uses a placeholder until then | REQ-E03-05 |
| BL-56 | **PQ-08 early allowance** — how many days early a call-off may arrive, given warehouse capacity | Warehouse, Material Planner | The early-delivery rule in CR-05; until then an early date needs approval | REQ-E09-03 |
| BL-57 | **A-01** — compliance and capability check for RFx with Mas Ary Hidayat | Procurement | Confirms the gate criteria in CR-23 | REQ-E03-01 |
| BL-58 | **Q-19** — the PQ-10 answer ends with "They"; confirm nothing is missing | Material Planner | Confirms the delivery execution scope | REQ-E09-04 |
| BL-65 | **CAP-1** — does supplier capacity usually stay the same every week or change? Being discussed | Material Planner | How capacity is entered (one number with overrides, or per week) | REQ-E08-04 |
| BL-67 | **Call-off over tolerance: refuse or approve?** Today a confirmation above +5% is allowed and waits for planner approval, as REQ-E09-03 BR-04 describes. Alternative: the supplier cannot send it | Material Planner | CR-05 wording | REQ-E09-03 |
| BL-68 | **Days of cover in CR-24: supplier stock or PTI stock?** Today supplier stock ÷ demand (the existing days-of-supply figure) | Material Planner | CR-24 wording | REQ-E08-05 |
| BL-69 | **Late at the deadline or after it?** Forecast commitments are late at the deadline minute; PO and call-off responses only after it. Recommended: one rule, late after the deadline | Material Planner | One convention in CR-26 and the response deadlines | REQ-E06-02, E07-02, E09-03 |
| BL-70 | **Who may change the working calendar and the 3PL list?** Today the Hub administrator and the combined buyer "All" role (offered, not seeded), following the enforcement-settings precedent. Alternative: administrator only | Procurement, IT | Role atoms `calendar:set`, `threepl:maintain` | Requirements 3.4, REQ-E07-04 BR-05 |
| BL-71 | **Goods receipt: what an over-delivery is measured against, and does "kept open" reopen quantity?** CR-25 says the order; REQ-E07-06 BR-03 says the ASN. The build uses the ASN when linked, else the order. "Kept open" is a label and does not reopen the missing quantity for another shipment | Material Planner, Warehouse | CR-25, REQ-E07-06 wording; possible build | REQ-E07-06 |
| BL-101 | **C8 §8** — SOMO ratifies the in-house forecast engine amendment (the hub computes the material × period totals until the engine moves to SOMO) | SOMO, with the operator | The engine publishing its own totals on the C8 seam | `docs/contracts/C8-forecast-publication.md` §8 |
| BL-119 | **Forecast engine decisions still open**: ENG-D8a cumulative cap agreed with pilot suppliers; ENG-D10 forecast grain (sell-in or sell-out, per channel); ENG-D11 who reviews the forecast before it drives material plans; ENG-D12 owner of the promotion calendar and how far ahead it is fixed; ENG-D13 plan-stability limit in model selection (set after the first backtest); ENG-D14 materials per service tier | Material Planner, Procurement, Demand Planning, Marketing | BL-108 (D8a confirms), BL-110 (D10, D11), BL-112 (D13), BL-113 (D12); D14 confirms E14-04 tiers | `FORECAST-ENGINE-REQUIREMENTS.md` section 4.2 |

---

## 2. Build work, in the order it will be done

Decided on 2026-09-21 and ready to build. Priority: first what protects money and compliance, then what keeps planning figures correct, then administration and usability. Placeholder values are used where a number is still open, and each is named.

| Priority | ID | Item | Rule | Size | Placeholder until decided |
|---|---|---|---|---|---|
| 1 | BL-33 to BL-35, BL-38, BL-39, BL-74 to BL-80, BL-83, BL-84, BL-93, BL-96 to BL-98 | The remaining "can start today" items in section 4, in the order listed there | — | — | — |

### Forecast engine build order

The rest of the in-house forecast engine (ENG-1), in the order recommended on 2026-09-24. Every item runs on the synthetic dataset first (BL-102) and switches to SAP data when BL-100 lands; nothing calculated on synthetic data reaches a supplier (X-03). Steps E14-02 to E14-06 and E14-13 are built (section 6).

| Order | ID | Item | Why this position | Blocked by | Size | Detail |
|---|---|---|---|---|---|---|
| 2 | BL-109 | **Data health page and quality checks on arrival (E14-01)**: freshness limits per feed, the checks in the feed spec, what is stale or failed | Needed before the first real SAP feed arrives, so bad data is caught before it drives orders | Nothing | M | REQ-E14-01; `FORECAST-ENGINE-FEED-SPEC.md` |
| 3 | BL-110 | **Finished-goods demand forecast (E14-07)**: one LightGBM model trained across SKUs, the Comb or Theta fallback, SBA or TSB for slow and intermittent SKUs, SKU, brand and total reconciled (MinT-shrink); replaces SAP's plan as the input to E14-03 | Every later step depends on it; until it exists E14-03 to E14-06 run on SAP's plan | ENG-D10, ENG-D11 (BL-119); meaningful results need sales history (BL-100) | L | REQ-E14-07 |
| 4 | BL-111 | **Demand range (E14-09)**: P50 and P90 per SKU and material, conformal calibration, how often actuals fell outside | Feeds safety stock (E14-04) and the supplier range (E14-06 BR-06) | BL-110 | M | REQ-E14-09 |
| 5 | BL-112 | **Choosing models by service, not accuracy (E14-10)**: replay PTI's ordering on past data and pick each SKU's model by fill rate and warehouse space | Accuracy is not service (Chin 2026); guards against a model that scores well and fills the warehouse | BL-110; ENG-D13 set after the first backtest | L | REQ-E14-10 |
| 6 | BL-113 | **Launches and promotions (E14-08)**: new-SKU forecasts from look-alikes, promotion uplift from the calendar | Cuts shortage in promotions and excess after them | BL-110; ENG-D12 (BL-119) | M | REQ-E14-08 |
| 7 | BL-114 | **Forecast bias and planner override control (E14-11)**: a bias alarm per SKU and material (tracking signal), and the value each type of planner override adds or loses (FVA) | Stops a steady high bias filling the warehouse; shows which overrides help | BL-110 | M | REQ-E14-11; X-06 |
| 8 | BL-115 | **Yield in the material requirement (E14-03)**: a yield field on the BOM line, used in the gross requirement beside scrap | The only part of E14-03 not built | Synthetic default until the BOM feed carries yield (BL-103) | S | REQ-E14-03 |
| 9 | BL-116 | **Safety stock change since the last run (E14-04 BR-06)**: show the change and its cause per material | The only part of E14-04 not built | Nothing | S | REQ-E14-04 BR-06 |
| 10 | BL-117 | **Cap on rented space in order sizing (E14-05)**: the "no plan fits" edge case: when no plan fits even with maximum rented space, show the shortfall weeks and let the planner choose rented space or a later delivery | The only part of E14-05 not built | Nothing | S | REQ-E14-05 edge cases |

Phase 2: BL-118 (E14-12), section 5.

### Build work waiting on a decision

| ID | Item | Blocked by | Size | Detail |
|---|---|---|---|---|
| BL-23 | Enter the agreed values once decided, on the admin screen (Tolerances and rule values); no developer needed since BL-32 | BL-54, BL-55, BL-56 | S | `/buyer/admin` |
| BL-81 | Apply the answers to BL-67 to BL-71 (tolerance refusal, days-of-cover basis, late convention, admin roles, receipt measure and reopening) | BL-67 to BL-71 | S each | Decisions in section 1 |

## 3. Build work waiting on the backend (Stage F)

The prototype holds everything in the browser. These need a real backend, which IT has not yet specified (PRD section 4).

| ID | Item | Size | Detail |
|---|---|---|---|
| BL-24 | Real SAP integration: POs, goods receipts and invoice status arriving as messages, and PO responses, ASNs and invoices going back | L | REQ-E07-08, BL-11 |
| BL-25 | Supplier API sync for stock, replacing the simulated Sync button | M | REQ-E08-02 |
| BL-26 | Email delivery of alerts, reminders and escalations. Today they exist only inside the hub | M | REQ-E08-05, E06-03, E07-02 |
| BL-27 | File storage, so RFx attachments (buyer files on RFI, RFP and RFQ events and items, attachment answers, supplier quotation files; today kept for the session only), receipt-dispute attachments and the e-Faktur hold a real file rather than a file name | M | REQ-E03-02 to E03-04 (CE-11), E07-06, E07-07 |
| BL-28 | Real sign-in for PTI staff and supplier users, replacing the demo persona switch | M | PRD 4.3 |
| BL-29 | Scheduled jobs, so deadlines, escalations and reminders fire on a clock rather than being derived when a page is read | M | REQ-E07-02, E09-03 |
| BL-30 | Durable storage, so what a user enters survives a reload | L | PRD section 4 |
| BL-95 | Share saved RFx templates across the team. Templates are stored in each buyer's browser (`paragon.rfqTemplates`, `paragon.rfiTemplates`, `paragon.rfpTemplates`), so a colleague never sees them and clearing the browser loses them. Needs a store behind the backend (BL-30). CE-04 says a saved template is for every buyer | M | Requirements 3.6a CE-04 |
| BL-100 | Forecast engine input data in the hub, from SAP through the Master Data Management team (ENG-D1): finished-goods sales history (2 to 3 years, weekly), price and promotion calendar, launch plan, bills of materials with scrap and yield, MOQs and multiples, warehouse volume per item and owned capacity | L | PRD I14; `research/FORECAST-METHOD-SPEC.md` section 5 |

---

## 4. Work that can start today

Nothing blocks these.

| ID | Item | Why | Size | Detail |
|---|---|---|---|---|
| BL-33 | Sample data so a "Received without ASN" receipt exists | The code path is built and rendered but no sample data produces it, so nobody can see it | S | REQ-E07-06 |
| BL-34 | One "as of" date across the app: the order pages read the demo clock, other pages read today. Also seen: a recorded award and the admin change history are dated with the real clock while the page says "As of 31 Aug 2026" | Two clocks in one demo confuse a reviewer | S | U-12 in `BUILD-GAP.md` |
| BL-35 | An RFI and an RFP awaiting an answer from the main demo supplier | Today that starting point sits on a different supplier, so the main walkthrough cannot show it | S | Phase 6a note |
| BL-38 | Supplier call-offs table: 10 columns still scroll sideways at 1280px | Same problem the Order summary solved by grouping | S | Phase 3 note |
| BL-39 | Non-conformance and complaint tracking (E10.02), the part of Supplier Performance never detailed | Named in the deck as MVP, still a stub | M | Requirements section 6 |
| BL-74 | Goods receipt GR-2026-015 shows quality result "Approved" while its status reads "Partially Approved" | A reviewer sees two answers on one receipt | S | REQ-E07-06 |
| BL-75 | Supplier new-invoice form takes one total, not an amount per line; a total that differs from its lines is checked under the strictest line rule | CR-12 is per line since BL-44 | S | REQ-E07-07 |
| BL-76 | The Risk page uses its own day thresholds (under 30 red, under 50 amber) over sample categories with no supplier or material; align with CR-24 or retire it | Contradicts CR-02 / CR-24 | S | REQ-E08-05 |
| BL-77 | Capacity sample data for more than one supplier, so the planner's capacity filters (BL-63) can be demonstrated | Today one supplier has capacity plans | S | REQ-E08-04 |
| BL-78 | Sample KPI tiles, the radar "benchmark", improvement-action targets, the analytics page and the supplier dashboard still show authored targets or colour against 90% | BL-19: baseline first, no targets yet | S | REQ-E10-01 |
| BL-79 | Retire superseded supply-data-collaboration code: the hidden chase page counts a 7-day calendar-day threshold nobody decided (`parseGrid` was removed with BL-73) | Dead code and a rule nobody decided | S | BUILD-GAP section 6 |
| BL-80 | A value-only PO line (BL-49) shows quantity 0 on PO and ASN screens outside the call-off pages | Only the call-off screens know the line has no quantity | S | CR-04 |
| BL-83 | Text run-ons: Indonesian "closing soon" pill joins its date ("Segera ditutup02 Sep 2026"); the in-transit read-out reads "0nothing in transit"; `formatNumber` uses the Indonesian thousands dot in the English UI outside the Stock page | Small display defects seen in the BL-72/73 check | S | SC conventions |
| BL-84 | Accessibility items left by BL-31: field errors not tied to their field (many forms); h1 jumping to h3 on marketplace, discovery, storefront, WhatsApp demo, supplier comm hub and shipments; unnamed controls in the contract wizard obligation grid and WhatsApp demo; top-bar menu button does nothing and the notification count is not in its name; login contrast and missing h1; 404 title in English only; then a session with a real screen reader | Needed before UAT (SC-07) | M | `BUILD-GAP.md` "Accessibility (BL-31)" |

---

## 5. Other teams and later phases

| ID | Item | Who | Detail |
|---|---|---|---|
| BL-40 | Foundation epics E01 and E02: supplier registration, onboarding, master data, and the PROCIO migration | Foundation team | Requirements 5.1, `prompts/foundation-requirements-contribution.md` |
| BL-41 | Sourcing request intake: a planner or requester raising a request that Procurement turns into an event | Owner ruled it out of the MVP (A-04); revisit when sourcing volume grows | Requirements 3.6a |
| BL-85 | Excel bid-sheet download and upload for RFQs, with per-line validation (the comparison already exports a CSV). Later, not in the MVP (requirements 5.2) | Build team, after the MVP | Requirements 5.2 and 8.3 |
| BL-86 | Weighted scoring by an evaluator team; knock-out questions; show-if (conditional) questions. Later, not in the MVP | Build team, after the MVP | Requirements 5.2 and 8.3 |
| BL-87 | Two-stage sealed bids: technical envelope before commercial. Later, not in the MVP | Build team, after the MVP | Requirements 5.2 and 8.3 |
| BL-88 | Sample tracking after the event: requested, due, received, approved. Later, not in the MVP. No platform has a native object for it | Build team, after the MVP | Requirements 5.2 and 8.3 |
| BL-89 | AI drafting of an event from an email or brief; AI extraction of a supplier's PDF or Excel quote into the grid, confirmed by the buyer. Later, not in the MVP; Phase 3 "AI for sourcing" (PRD 3) | Build team, after the MVP | Requirements 5.2 and 8.3 |
| BL-90 | Award optimisation: scenarios with constraints such as maximum suppliers or capacity. Later, not in the MVP | Build team, after the MVP | Requirements 5.2 and 8.3 |
| BL-91 | Admin screen for the RFx libraries: question library, term list, item-type spec templates (CE-05). Later, not in the MVP; Procurement asks IT meanwhile. Same family as BL-32 | Build team, after the MVP | Requirements 3.6a |
| BL-92 | Amendments to a live RFx event that notify invitees and flag responses to revisit (deadline extension exists). Later, not in the MVP | Build team, after the MVP | Requirements 5.2 and 8.3 |
| BL-42 | Phase 2 epics: contract management (E04), catalog management (E05), reporting and analytics (E11), API shipment aggregator (E13.02), supplier quality | Per the deck and charter | Requirements section 6 |
| BL-103 | Forecast engine feed specification: each input, its grain, refresh and quality check, handed to the Master Data Management team, who own the data and the SAP integration | Master Data Management team | Drafted: `FORECAST-ENGINE-FEED-SPEC.md` (2026-09-23), handed to the team for confirmation of sources and owners. `FORECAST-ENGINE-REQUIREMENTS.md` E14-01; PRD I14 |
| BL-118 | Where to hold buffers (E14-12, Phase 2): guaranteed-service model with the MOQ extension, deciding at which level (finished good, bulk, packaging) safety stock sits | Build team, Phase 2; after REPL (BL-01) | `FORECAST-ENGINE-REQUIREMENTS.md` REQ-E14-12 |

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
| BL-10 | PQ-07 forecast source | 2026-09-21 | Decided: MRP weeks 1–13, IBP months 4–6, one published forecast. Build waits on the real SAP feed (BL-24). **Superseded 2026-09-23 by ENG-1**: PTI's own forecast engine calculates it; this SAP source applies until the engine is live (BL-99 to BL-101) |
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
| BL-44 | Invoice price tolerance | 2026-09-21 | Built: per line, 0% on a contract price, otherwise 2% within the cap (placeholder IDR 500,000 until BL-54); the invoice shows which rule applied |
| BL-45 | Goods receipt tolerance | 2026-09-21 | Built: any over-delivery flagged; a shortfall above 2% flagged and shown as kept open (a label; it does not reopen the order quantity) |
| BL-47 | Call-off tolerance | 2026-09-21 | Built: up to 5% over accepted for every type; a shortfall is a visible partial; later and earlier dates go to the planner (early allowance 0 days until BL-56) |
| BL-49 | Call-off release by remaining quantity | 2026-09-21 | Built: release checked on remaining quantity; value only on a line with no quantity; over-release refused with both figures |
| BL-50 | Hub-managed working calendar | 2026-09-21 | Built: administrator page (first page of the admin screen, BL-32) with the SAP factory calendar (sample load) and governed add/remove/override rulings; every working-day deadline reads it |
| BL-48 | Forecast commitment deadline | 2026-09-21 | Built: Firm 1 working day, Trade-off and Forecast 3, on the hub calendar; time left and late shown to supplier and planner |
| BL-51 | 3PL tracking link on the ASN | 2026-09-21 | Built: the supplier picks the 3PL from the administrator's list (sample list, marked as sample) or types another carrier; the tracking number opens the 3PL's public page in a new tab on every ASN surface, supplier and PTI; no status read; no or unknown 3PL shows plain text. The list is changed through a governed verb held by the compliance lane and the Hub administrator, on Administration → 3PL tracking links |
| BL-52 | Supplier filters | 2026-09-21 | Built: certificate validity (valid, expiring within 90 days, expired or missing), performance band (A–D, No history), country, on the supplier list and every invitee search, in the page address and combined with the existing filters. Region is not a separate filter: the supplier master holds a country only |
| BL-53 | KPI definitions on the performance pages | 2026-09-21 | Built: OTIF and CFOT definitions as calculated (window, early, grain, date change, in full) on both performance pages; targets read "Baseline period — no target yet". One difference from the requirements is stated as the code does it and left for a decision: a PO counter-offer moves the CFOT date as soon as it is sent |
| BL-72 | "ROUND {{ROUND}}" on the RFQ event page | 2026-09-21 | Fixed: a header key for the column; one more un-interpolated string found and fixed (supplier application toast); guard test over the tree |
| BL-73 | Second stock entry path | 2026-09-21 | Fixed: the supplier and PTI chat triage pages pre-fill the Stock page's own entry form (same fields, checks and verb); a PTI recording shows "Entered by PTI"; the old grid parser and hooks removed |
| BL-36 | Option editor for RFI questions | 2026-09-21 | Built in PR #25: single-choice and multiple-choice questions written in an option editor (at least 2 options, none blank or repeated), with the same rule in the editor, the create verb and the template store; part of 11 question types |
| BL-37 | Split award across several items in one pass | 2026-09-21 | Built in PR #26: a tiered RFQ is awarded per item by % share in one form at one evaluation break, each item totalling 100%, through the existing award verb; a split marks every named quote Awarded. Legacy single-price RFQs keep their earlier form |
| BL-31 | Accessibility pass | 2026-09-21 | Done: 68 pages audited by keyboard and automated checks against WCAG 2.1 AA; keyboard-operable rows, one focus contract for every drawer and dialog, skip link, named nav and search, 39 form labels tied to fields, text contrast raised to AA; guard tests. What remains is BL-84 |
| BL-96 | RFP → RFQ pre-fill from the chosen options | 2026-09-22 | Built in PR #30 |
| BL-97 | "Firm" label on RFQ prices | 2026-09-22 | Built in PR #30 |
| BL-98 | "Created from …" on every event with a source | 2026-09-22 | Built in PR #30 |
| BL-93 | Edit a draft RFI, RFQ or RFP | 2026-09-22 | Built in PR #31: Edit draft on a Draft's side panel (RFQ) or detail (RFI, RFP) re-opens the create wizard on every stored field and saves through a revise-draft verb per event type (same atom, fields and policy as create; Draft only; compare-and-set on Draft; who and when recorded); Save changes keeps it a draft, Save and send also sends it with the publish permission. Discard draft on a Draft RFI or RFP through the existing cancel verbs (the RFQ panel already had Cancel) |
| BL-32 | Admin screen for the remaining configuration | 2026-09-22 | Built: tolerances and rule values, alert thresholds and stale periods (default and per supplier × material), and reason codes (add, rename, retire; never deleted) on `/buyer/admin`, each change governed, validated, logged and resettable; the rules read the setting when they run |
| BL-94 | Oslo demo: sup-007 fails the compliance gate on RFQ-2026-021 | 2026-09-22 | Fixed in PR #33: sup-007 now has a real delivery history, four past call-offs on the 100ml PET line (CO-2026-0043 to 0046, 80, 60, 40 and 25 days before the present) each received on its date and in full (GR-2026-018 to 021). Its calculated 90-day OTIF is 83% (5 of 6), so it passes the gate on Oslo, is ranked, and can take a share of the award. The gate minimum, the gate and the late CO-2026-0001 are unchanged; sup-008 (0%) still fails |
| BL-99 | Supplier reliability and plan-change measures (E14-02) | 2026-09-23 | Built in PR #37 on synthetic data: planner page Forecast → Supplier reliability, supplier panel "Your reliability". CFOT waits on BL-66 |
| BL-102 | Synthetic dataset for the forecast engine | 2026-09-23 | Built in PR #37: deterministic, calibrated to the slide measures (confirmation 65.9%, CFOT 36.7% by definition, packaging warehouse 124–136%, raw material 105–107%), labelled simulated |
| BL-66 | KPI definitions vs the calculation | 2026-09-23 | Decided as recommended (KPI-1 to KPI-4 in section 9 of the requirements): fix the five differences; one 7-day early window for OTIF and CFOT until BL-56 sets the allowance. Built as BL-82 |
| BL-82 | OTIF and CFOT aligned with the agreed definitions | 2026-09-23 | Built in PR #38: counter-offer counts on acceptance, planner change after re-confirmation, partial receipts summed, one early window (`kpiWindow.ts`), dispatched-but-not-received counts as missed after 3 days; definitions updated on both performance pages; CFOT shown on the reliability page and panel. No sample supplier's score moved |
| BL-104 | Material requirement (E14-03) | 2026-09-23 | Built in PR #39 on synthetic data: BOM explosion, netting against stock and supplier-confirmed receipts, interim MOQ round-up; page Forecast → Material requirement |
| BL-105 | Safety stock, safety lead time and reorder point (E14-04) | 2026-09-23 | Built in PR #39 on synthetic data: fill-rate safety stock from the plan's errors, tiers 95/90/85, safety lead time per supplier, ROP; zero safety stock flagged, not floored; page Forecast → Safety stock |
| BL-108 | Stabilise and publish the plan to suppliers (E14-06) | 2026-09-24 | Built in PR #48 on synthetic data: page Forecast → Stabilise and publish; Firm kept, Trade-off damped (admin weight, 50%) and held to ±10% / ±20%; publishing with the engine as source refused while the data is simulated and until C8 §8 is ratified. Range beside the quantity waits on BL-111. Finding (as of 2026-08-31): on SAP's published plan history, stabilising cuts MASC from 0.593 to 0.114 and the share of weeks changed inside the lead time from 96.4% (783 of 812) to 0%, with every Trade-off revision inside the band (41.2% before); the version to publish keeps 179 Firm weeks, damps 144 and holds 61 at the band (42 per version, 19 cumulative). On the engine's own plan there is almost nothing to stabilise: stock covers the need in all 242 Firm weeks and 426 of 427 Trade-off weeks, so MASC moves only from 0.176 to 0.175; one of its 2 band-held weeks holds a real need of 54,513 units at 0 because it was last published as 0 (ENG-B37) |
| BL-107 | Reschedule or cancel open orders (E14-13) | 2026-09-24 | ENG-D15 to D17 decided on the defaults. Built in PR #44 on synthetic data: page Forecast → Reschedule open orders; call-off changes through the existing change verb, PO lines recorded as taken to SAP, both refused while the data is simulated. Finding (as of 2026-08-31): packaging is 1,972 pallet-weeks over capacity; 50 reschedule-outs free 1,152 of them (Rp 40.3M rented space at the placeholder rate, Rp 31.8M change penalty), but only the 22 that need no supplier agreement are free to send, and they free 398 (Rp 13.9M). Of the 820 pallet-weeks that remain, 741 are stock on hand. Raw material is 379 over; its stock on hand covers the whole 26-week horizon, so all 96 open lines come out as cancellations, all needing supplier agreement; 130 of the 138 that remain are stock on hand. Sending every relief proposal would raise PTI's share of schedules changed inside the lead time from 18.4% to 28.3% |
| BL-106 | Order sizing within MOQ and warehouse space (E14-05) | 2026-09-23 | Built in PR #41 on synthetic data: warehouse-wide sizing, placeholder cost rates, page Forecast → Order plan, draft call-offs from recommendations; engine-origin drafts cannot be released while the data is simulated. Finding: it cuts packaging orders (101 → 65) but cannot lower the current overload, which is stock already on hand |
| BL-20 | SAP ROP replenishment recommendations released as call-offs | 2026-09-24 | Superseded by ENG-1: PTI's engine replaces SAP for ROP and replenishment. ROP built in PR #39 (E14-04), recommendations as draft call-offs in PR #41 (E14-05). Releasing them to suppliers waits on live data (BL-100) |
