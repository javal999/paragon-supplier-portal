# Supplier Hub: recommendations for the open decisions

| | |
|---|---|
| Version | 1.33, 2026-11-18 (docs pass after MR !159, !160 and !161: the builder calls of the three MRs recorded as my calls under the owner's away grant, awaiting his ruling; the BL-284 note-vs-cell gap question recorded). Previous: 1.32, 2026-11-17 (docs pass closing nine rows built on `main`: BL-235, BL-141, BL-264, BL-265, BL-282, BL-283, BL-289, BL-290 and BL-291; the two [Proposed] calls of MR !113 recorded as !113-1 and !113-2, not ruled). Previous: 1.31, 2026-11-17 (docs pass after MR !150 and MR !151 merged to `main`: the seven builder calls of each recorded as ruled by the owner on 2026-11-17, each as proposed (!150-1 to !150-7 and !151-1 to !151-7); follow-ups BL-325 and BL-326 added to `BACKLOG.md`). Previous: 1.30, 2026-11-17 (!144: BL-313 PEX-D29 accepted by the owner 2026-11-17 and merged in MR !140 (`5d2edcea`); the !127-2 row records the ruling; renumbered after merging main, which took 1.29). Previous: 1.29, 2026-11-17 (docs pass after MR !147 merged to `main` as `f3ad2476`: the VERIFY-135 findings D1 to D3 recorded below, D1 and D2 ruled and built (BL-317, BL-318); docs MR !144 must renumber to 1.30). Previous: 1.28, 2026-11-17 (docs pass after MR !145 merged to `main` as `9f637083`: the eight builder calls of MR !145 recorded as ruled by the owner on 2026-11-17, each as proposed (!145-1 to !145-8); !135-3 and !135-3a recorded ruled the same day; if docs MR !144 merges first, renumber this to 1.29). Previous: 1.27, 2026-11-17 (!127-2: its second half replaced by BL-313, PEX-D29 [Proposed], recorded sourcing shares divided by their total; renumbered after merging main, which took the previous number). Previous: 1.26, 2026-11-17 (docs pass after MR !135: row !117-6 says the "suggest again" path exists since MR !135 [Proposed]; the four builder calls of MR !135 listed as [Proposed], not ruled, as !135-1 to !135-4, and the question !135-3a added from the browser check; MR !135 recorded as in production since 2026-11-17). Previous: 1.25, 2026-11-13 (builder calls of MR !117, !127, !130 and !131 listed as [Proposed], not ruled; the !117 "Accept all" claim marked unverified). Previous: 1.24, 2026-11-11 (ENG-D23 to ENG-D25 added: the owner's BL-286 ruling, the backtest's chosen model shown on the Demand forecast page and not applied). Previous: 1.23, 2026-11-11 (ENG-D26 to ENG-D28 added: the owner's BL-287 ruling, judging overrides by service deferred, the override ledger as backend work (BL-299), the Forecast bias service note reworded; 1.22, 2026-11-10 (PEX-D23 and PEX-D24 added: the owner's working-day ruling for PO On Hold and the accepted wave 1 answers Q-W3 to Q-W5; the PEX wave 2 build calls listed as proposed, not ruled; the PEX-D16 to PEX-D22 section says MR !97 is merged (`b1bc58e8`); 1.21, 2026-11-09 (FSR-D9 added: BL-280, lead time stays English on the planning pages, the four held glossary labels renamed; 1.20, 2026-11-05 (PEX-D16 to PEX-D22 added: the owner's rulings on the PEX wave 1 build decisions in MR !97 (branch `feat/pex-wave1-p0`, merged with GitLab main 8f96aa84); 1.19, 2026-11-05: FSR-D8 added: BL-263's Indonesian labels renamed, the team's English terms kept per TL-D11 and TL-D17; 1.18, 2026-11-05: FSR-D7 added: BL-243 and BL-249 built, applying IA R-2 and the TL-D13 qualifier; 1.17, 2026-11-03: FSR-D1 to FSR-D6 added: the owner's rulings on the six open questions of the Foresight end-to-end review; 1.16, 2026-11-02: BL-12 and BL-56 decided by the owner; BL-19 baselines and early receipts in OTIF and CFOT answered; INV-D4 superseded by the BL-149 answer; 1.15, 2026-10-26: RFX-D32 added: the RFx deadline is checked on leaving the field; INV-D14 added 2026-10-23)) |
| Covers | BL-01 to BL-19b in `BACKLOG.md` — the 21 decisions that block or confirm work; the RFx decisions RFX-D1 to RFX-D5 (2026-09-21) and RFX-D6 to RFX-D14 (2026-09-25) and RFX-D15 (2026-09-28) and the RFx UX decisions RFX-D16 to RFX-D24 (2026-10-19) and RFX-D25 (2026-10-20) and RFX-D26 to RFX-D31 (2026-10-22) and RFX-D32 (2026-10-26); the Inventory & Capacity UX decisions INV-D1 to INV-D13 (2026-10-22) and INV-D14 (2026-10-23); the SC Hub Material decisions MAT-D1 to MAT-D15 and the build rulings MAT-D16 to MAT-D21 (2026-09-29); and the 15 forecast engine decisions ENG-D1 to ENG-D14 with ENG-D8a (2026-09-23); and the Foresight review rulings FSR-D1 to FSR-D6 (2026-11-03) and FSR-D7 and FSR-D8 (2026-11-05); and the PEX wave 1 build rulings PEX-D16 to PEX-D22 (2026-11-05) and PEX-D23 and PEX-D24 (2026-11-09 and 2026-11-05) |
| Purpose | Give the project owner a defensible recommendation to take to each owner: what the market does, what we suggest for PTI, and what would change our mind |
| Status | **18 of the 21 were decided on 2026-09-21**, mostly as recommended; the outcomes are in section 9 of the requirements and in the Closed section of `BACKLOG.md`. Still open: BL-01 REPL, BL-11 interface technology, and two values (BL-54 invoice cap, BL-55 gate OTIF minimum). BL-12 call-off record and BL-56 early allowance were decided on 2026-11-02 (see their entries). Where the owner decided differently from this guide — the hub keeps its own calendar (BL-14), capacity stays at 13 weekly buckets (BL-08), Web Tukar Faktur stays separate (BL-17), and TMS access becomes a 3PL tracking link (BL-03) — the decision stands and this guide is kept as the reasoning behind the others. All decided items are built and in production as of 2026-09-21 (BL-43 to BL-53). The builds raised six new questions, BL-66 to BL-71 in the backlog, which this guide does not yet cover |
| Evidence | Market practice is cited at the end. Where a claim is a judgement rather than a published practice, it says so |

**How to read each entry:** *Market practice* is what comparable companies and supplier-collaboration products do. *Recommendation* is what we suggest for PTI and why. *What would change this* names the fact that would overturn it, so the owner can test the recommendation instead of taking it on trust.

---

## Blocking new capability

### BL-01 · REPL — replenishment method and governance
**Market practice.** Nobody runs one method across a whole catalogue. The common pattern is to segment materials by demand variability and value (ABC × XYZ), then apply: reorder point or min–max for stable, high-volume items; time-phased MRP for items with a known production plan; vendor-managed inventory for consignment. The planning system calculates; the portal releases and records.

**Recommendation.** Segment first, then decide per segment rather than picking one method for everything. Suggested starting split: reorder point for stable packaging with short lead times; time-phased MRP for raw material tied to the production plan; VMI for the consignment materials already identified. Keep the calculation in SAP, so the hub stays a collaboration layer and never becomes a second planning engine — the requirements already say this (MN-INV-14). Set a quarterly parameter review with a named owner; the method matters less than whether anyone revisits the parameters.

**Superseded in part, 2026-09-23 (ENG-1).** The owner decided PTI calculates forecast, ROP, and replenishment in its own engine, in the hub first and SOMO later. The advice to keep the calculation in SAP no longer applies. The segmentation advice and the quarterly parameter review still do. Methods: `research/FORECAST-METHOD-SPEC.md`.

**What would change this.** If the consultant finds demand variability is low across the board, a single reorder-point method with periodic review is simpler and cheaper to govern.

### BL-02 · PQ-09 — is event-based strategy analysis needed in the MVP?
**Market practice.** Scenario and what-if planning is a planning-suite capability (SAP IBP, o9, Kinaxis), not a supplier-portal one. Supplier portals show the result of a plan; they rarely model alternatives.

**Recommendation.** Not in the MVP. Launches, promotions and phase-in/phase-out belong in the planning layer, and the hub should show the call-offs that result. Revisit after the pilot, when there is evidence about how often planners actually need it.

**What would change this.** If planners today do this analysis in spreadsheets and nothing else will own it, a light version in the hub beats a spreadsheet.

### BL-03 · D-03 — which phase supplier TMS access belongs to
**Market practice.** Two routes: give suppliers a read-only view in the transport system, or integrate a visibility provider (project44, FourKites, or the carrier's API) and show tracking inside the portal. The second is what mature programmes end up with; the first is how they start.

**Recommendation.** Phase 2 for real integration, with a cheap interim: give the pilot suppliers read-only TMS accounts if the licence allows, and measure how often ETA actually changes. That measurement is what tells you whether integration is worth the shipment-aggregator budget line already in the charter.

**What would change this.** If TMS licences cannot be issued to external parties, the interim disappears and integration moves up.

### BL-16 · D-07 — the RFI needs a product catalog, which the deck puts in Phase 2
**Market practice.** Supplier-maintained catalogues (Ariba, Coupa, JAGGAER) separate *capability data* — what a supplier can make — from a *purchasable catalogue* with prices and contracts. The first is light; the second needs contract and price management behind it.

**Recommendation.** Build only the capability list in the MVP: the product entries an RFI already collects, stored against the supplier and reusable in an RFQ. That is what the RFI needs. Leave the purchasable catalogue in Phase 2 with contract management, where it belongs.

**What would change this.** If Procurement expects to buy from the catalogue during the pilot, this becomes a Phase 2 dependency rather than a light MVP item.

### BL-19b · MIG — PROCIO to hub supplier data migration
**Market practice.** Staged migration with cleansing: extract, de-duplicate to a golden record, validate against the tax and banking authorities' formats, load, then govern with an approval workflow (SAP MDG or equivalent). Migrating everything is the common mistake; the standard remedy is a recency cut-off.

**Recommendation.** Migrate only suppliers with activity in the last 24 months, plus any under contract. Let suppliers confirm their own bank and tax details through the portal rather than trusting migrated values — that turns a data-cleansing project into an onboarding step, and the Foundation team is building that door anyway. Treat bank detail changes as a fraud-sensitive flow from day one: confirmation by a second channel, never by email alone.

**What would change this.** If PROCIO holds contractual history that must survive for audit, the cut-off applies to the active set only and history is archived rather than migrated.

---

## Confirming values the hub already runs on

These eight are one number or one list each. The prototype ships defensible defaults; these sessions replace "defensible" with "agreed".

### BL-05 · PQ-08 — call-off and commitment tolerances, and the commitment deadline
**Market practice.** Supplier networks treat quantity and date tolerances as separate, configurable per supplier and material. Retail OTIF programmes commonly use a delivery window of 0 to +2 days, some use ±1 day. On quantity, a small over-delivery allowance (often around 5%) with under-delivery treated as a partial delivery is the norm.

**Recommendation.** Quantity: accept up to +5% over, treat any shortfall as partial and visible, rather than silently accepted. Date: for packaging with warehouse constraints, allow up to 2 days early and 0 late without approval; for raw material, 3 days early and 0 late. Late always needs planner approval, because that is the case that hurts. Commitment deadline: 1 working day for Firm periods, 3 working days for Trade-off — the prototype's 7 days is generous for a pilot with three suppliers.

**What would change this.** Warehouse dock capacity. If receiving cannot absorb early deliveries, the early allowance drops to 0 and the tolerance becomes late-side only.

**Decision (owner, 2026-11-02, BL-56).** No fixed early allowance: a call-off may be delivered on any date, early included, once the Material Planner team confirms it, and the same holds for the warehouse's part. The allowance stays 0 days, so every early date goes to the planner, as built. Follow-up answer (owner, 2026-11-02): an early receipt on a date the Material Planner team confirmed counts as on time in OTIF and CFOT (KPI-2 amended; build BL-234).

### BL-06 · PQ-04 — goods receipt discrepancy tolerance
**Market practice.** ERP systems carry separate over- and under-delivery tolerances per material or per supplier–material combination, set in the material master or purchasing info record, and check the cumulative received quantity against the order.

**Recommendation.** Over-delivery: 0% by default, so anything above the ordered quantity is a decision rather than a default acceptance. Under-delivery: flag any shortfall above 2%, and keep the receipt open rather than closing it short. Hold the values per material in SAP, not in the hub, so one place governs them.

**What would change this.** Materials sold in fixed pack sizes, where a small over-delivery is unavoidable. Those need a per-material over-tolerance matching the pack size.

### BL-07 · PQ-05 — invoice price tolerance and the status list
**Market practice.** Most organisations accept a tolerance rather than an exact match, typically between 1% and 5%: around 2% on price for standard items and 0% for contracted prices, with quantity tolerance around 5% or an absolute cap such as a fixed currency amount. Dynamics and SAP both default price tolerance to zero and expect the organisation to set its own.

**Recommendation.** Price: 0% where a contract price exists — that is the point of having one — and 2% otherwise, with an absolute cap in rupiah so a percentage on a large invoice does not wave through a material sum. Quantity: never above what was received. The prototype's 1% is defensible but tighter than common practice, so expect more exceptions than necessary at launch.

**What would change this.** Commodity materials priced on an index, where the invoice legitimately moves with the index between order and delivery. Those need the price adjustment mechanism in the contract, not a wider tolerance.

### BL-08 · PQ-02 — capacity horizon and bucket size
**Market practice.** Capacity collaboration typically runs weekly buckets over 8 to 13 weeks, aligned to the forecast horizon so supplier and buyer look at the same periods.

**Recommendation.** Keep the 13 weekly buckets already built, and add monthly buckets out to 6 months for raw material, matching the forecast. Align capacity periods to forecast periods exactly: if they differ, every conversation starts with reconciling two calendars.

**What would change this.** Suppliers whose production plans are monthly. For them a weekly capacity question invents precision nobody has.

### BL-09 · PQ-03 — risk class thresholds for alerts
**Market practice.** The standard risk measure is days of cover compared with replenishment lead time, not a fixed number of days. A material with 10 days of cover and a 5-day lead time is comfortable; the same 10 days against a 45-day lead time is an emergency.

**Recommendation.** Make lead time the denominator: High when projected cover is below the lead time, Medium when below 1.5× lead time, Low otherwise. Keep the fixed day-bands only as a fallback where a supplier lead time is missing, and treat a missing lead time as its own data-quality alert.

**What would change this.** Nothing much — this is the one item where market practice is close to unanimous. The work is getting reliable lead times per supplier and material, which is a master-data task.

### BL-14 · Q-18 — the working calendar
**Market practice.** ERP systems hold a factory calendar per country or plant, and every deadline calculation reads it. Duplicating a calendar in a satellite application is a known source of drift.

**Recommendation.** Use the SAP factory calendar for Indonesia as the single source, and have the hub read it rather than hold its own list. The prototype's built-in list is fine for the demo and should not survive into the pilot.

**What would change this.** If the calendar cannot be exposed through an interface in time, the hub keeps a local copy with a named owner and a yearly review — an accepted risk, not a design.

### BL-04 · A-03 — RFI and RFP templates, and the quote score weights
**Market practice.** Category-specific questionnaires are standard. On scoring, the strong convention in regulated food, pharma and cosmetics is that compliance is a **gate, not a weight**: a supplier without valid halal, BPOM or GMP certification is not scored lower, it is not eligible.

**Recommendation.** Split the current weights in two. Make compliance a pass/fail qualification before scoring, then score the qualified suppliers on price, lead time and reliability — for example 40 / 20 / 40. As built, a supplier can compensate for weak compliance with a low price, which is not what PTI means. Keep reliability fed by measured OTIF, which the build already does.

**What would change this.** If Procurement wants partial compliance to be visible rather than disqualifying during discovery, keep it scored for RFI shortlisting and make it a gate only at award.

### BL-19a · A-01, A-02 — the full supplier filter parameter list
**Market practice.** Mature supplier search filters on: category, purchasing group, status, performance band, certification validity, capability or material group, country or region, payment terms, and a risk or financial score.

**Recommendation.** Add, in this order of value: certification validity (halal and BPOM expiry), performance band, and country or region. Certification validity first, because it is the filter that prevents a compliance problem rather than reporting one. The rest can follow demand.

**What would change this.** Nothing structural; this is a backlog-order question rather than a design one.

---

## IT and integration

### BL-10 · PQ-07 — which SAP source provides forecast and demand sensing
**Market practice.** Near-term netted requirements come from MRP; mid- and long-term unconstrained demand comes from the planning suite (IBP or equivalent). Portals publish one merged view so the supplier sees a single number per period.

**Recommendation.** Weeks 1–13 from MRP, months 4–6 from IBP, published as one forecast with the zone marking which is which. Suppliers should never have to reconcile two PTI forecasts; that is the hub's job.

**What would change this.** If IBP is not live for these categories, publish MRP only and state the shorter horizon honestly rather than padding it.

**Superseded 2026-09-23 (ENG-1).** This SAP source applies only until PTI's own forecast engine is live.

### BL-11 · PQ-06 — interface technology and latency target
**Market practice.** Current SAP integration favours API-first through the Integration Suite, with events for state changes and IDocs kept only where they already exist. Fifteen minutes is a comfortable target for collaboration data; it is not a real-time requirement.

**Recommendation.** Events for PO creation and change, goods receipt, and invoice status; synchronous APIs for reads the user is waiting on; a scheduled reconciliation to catch anything missed, because event delivery fails quietly. Keep the 15-minute target and show data age on screen, which the build already does.

**What would change this.** An existing middleware standard at PTI. Consistency with what IT already runs beats any greenfield preference.

### BL-12 · PQ-11 — is the hub the record for call-offs?
**Market practice.** In SAP-centred landscapes, scheduling agreements with releases are the standard home for call-offs, and portals present and collaborate on them rather than owning them. A portal that owns transactional records becomes a second system of record, which is what the charter says to avoid.

**Recommendation.** Medium term, move call-offs into SAP as scheduling agreement releases, with the hub as the collaboration surface. For the pilot, the hub can hold them, since they live in spreadsheets today and anything is an improvement — but decide the target now, because it changes the integration scope in BL-11. Migrate only open call-offs at go-live; closed ones stay in the spreadsheets as history.

**What would change this.** Cost and time of the SAP change. If scheduling agreements are a large configuration project, hub-owned call-offs with a clean interface may be the pragmatic answer for longer.

**Decision (owner, 2026-11-02).** The hub's call-off record is the long-term system record, not SAP scheduling agreement releases. This differs from the recommendation above; the decision stands. Still open: whether today's manual call-off records are migrated, and whether call-offs are also sent to SAP (BL-11).

### BL-13 · PQ-12 — does the umbrella PO carry quantities per line?
**Market practice.** A scheduling agreement carries a target quantity and dated schedule lines with quantities. Value-only control is weaker: it cannot answer "how much is left to call off" in units, which is the question planners actually ask.

**Recommendation.** Quantity per line, so the hub can check a release against remaining quantity rather than remaining value. The build already supports both, and quantity is the better control.

**What would change this.** Service or framework agreements where only value makes sense. Those keep the value check.

---

## Scope and ownership

### BL-15 · Q-20 — quality inspection in the hub, while Supplier Quality is Phase 2
**Market practice.** Incoming inspection belongs in the ERP quality module. Portals show the result to the supplier and host the follow-up: non-conformance reports, 8D or corrective action, and the supplier's response.

**Recommendation.** Keep what is built — the hub shows the result and the rejected quantity — and do not extend it. Put the supplier-facing half (non-conformance and corrective action) in Phase 2 with Supplier Quality, where it joins the non-conformance stub already in the backlog (BL-39).

**What would change this.** If SAP QM is not in scope for the pilot materials, the hub's display is the only record of an inspection result and deserves more care.

### SQ-D1 · E10.02 non-conformance and complaint tracking is Phase 2, with Supplier Quality (decided 2026-11-10)
**Decision.** Levi ruled on 2026-11-10: E10.02 moves from MVP to Phase 2 and joins Supplier Quality (EX2). This keeps BL-15 / Q-20 (`BACKLOG.md:340`, `SUPPLIER-HUB-REQUIREMENTS.md:2194`) and resolves the conflict with the stub table (`SUPPLIER-HUB-REQUIREMENTS.md:2059`) and the baseline (`SUPPLIER-HUB-BASELINE.md:213`), which both said MVP. The hub keeps what is built: PTI records the inspection result against the receipt, and the supplier sees the result and the rejected quantity (REQ-E07-06 BR-05, BR-06 and AC-04, `SUPPLIER-HUB-REQUIREMENTS.md:1071-1082`). Nothing new is built.

**Alternative not taken.** (A) A minimal NCR log in the MVP: PTI quality logs a non-conformance report (NCR) against a supplier and a receipt, with a status and the supplier's response. Size M, rules [Proposed], reverses BL-15 / Q-20. (C) Show an NCR status read from SAP QM. Size unknown, and SAP QM scope for the pilot is unconfirmed (`DECISION-GUIDE.md:163`).

**What would change this.** The pilot sponsor needing E10.02 at go-live (then A is the smallest start), or IT confirming that SAP QM is not in scope for the pilot materials. In that case the hub's display is the only inspection record and deserves more care (`DECISION-GUIDE.md:163`).

### SQ-D2 · BL-39 stays open as the Phase 2 placeholder (decided 2026-11-10)
**Decision.** Levi ruled on 2026-11-10: BL-39 (`BACKLOG.md:107`) stays in the open backlog. Its Why now reads "Phase 2 with Supplier Quality (BL-15, SQ-D1); waits on DEC-07 for scope and an owner". The row keeps the open questions for the PTI quality owner, Procurement, the pilot sponsor and IT until Supplier Quality is scoped. BL-15 already names BL-39 as the place non-conformance waits.

**Alternative not taken.** Closing BL-39 and moving it to the decided table, as was done for BL-15. Then no open row would carry the Phase 2 work, and BL-15's reference would point at a closed item.

**What would change this.** DEC-07 (`SUPPLIER-HUB-BASELINE.md:426`) being decided. The Supplier Quality scope then replaces BL-39 with detailed rows.

### BL-17 · DEC-06 — is Web Tukar Faktur this capability or a separate application?
**Market practice.** Invoice submission through a portal, matched against receipts, with tax compliance handled by the national e-invoicing system. In Indonesia that means e-Faktur and the DJP's Coretax platform; the portal carries the commercial document and the reference, not the tax authority's role.

**Recommendation.** Let the hub replace the physical invoice-exchange ritual: the supplier submits against receipts, sees the match result and the payment status. Keep the tax document flow in e-Faktur and store the reference. Retiring "tukar faktur" as a trip to the office is one of the most visible wins available to this project, and suppliers will feel it immediately.

**What would change this.** If Web Tukar Faktur is a live system with its own roadmap, this becomes an integration rather than a replacement, and Finance decides which front door suppliers use.

### BL-18 · DEC-09 — business owner for the performance dashboard
**Market practice.** Supplier performance is usually owned by Procurement, with supply chain or planning owning the delivery measures that feed it. Split ownership without a named arbiter is the common failure.

**Recommendation.** Procurement owns the dashboard and the supplier conversation, which matches the charter; Material Planning owns the delivery measures (OTIF, CFOT) as data. One owner for the scorecard, one for each measure.

**What would change this.** Nothing in the market; this is an organisational choice for the Steering Committee.

### BL-19 · KPI definitions and targets
**Market practice.** World-class OTIF is quoted around 95% and above, and large retailers enforce 95% with financial penalties. But mature programmes measure a baseline before setting a target, because an OTIF number is only comparable to itself: the definition of the delivery window, whether early counts as on time, and whether it is measured per order or per line all move the number by more than the improvement being measured.

**Recommendation.** Fix the definitions before the targets. Write down: the delivery window, whether early is on time, the measurement grain (per call-off, as the requirements already say), and whether a supplier-requested date change resets the clock. Then measure for three months and set targets from the baseline. Publish the definition to suppliers with the first scorecard — a metric a supplier cannot reproduce will be argued rather than acted on.

**What would change this.** Nothing. This is the one item where moving fast costs the most: a target set on an undefined measure produces a year of disputes.

**Decision (owner, 2026-11-02).** The baselines are the ones written in the PRD success criteria (S1 to S5), so no 3-month measurement sets them. CFOT and OTIF have no row there, so the 3-month baseline still applies to them. The KPI-1 to KPI-4 definitions are final, and an early receipt on a date the Material Planner team confirmed counts as on time in OTIF and CFOT.

---

## RFx decisions (decided 2026-09-21)

The owner took these five during the RFx overhaul. They are recorded as RFX-D1 to RFX-D5 in section 9 of the requirements and built in PRs #21 and #24 to #27, and the RFP → RFQ link in PR #30. They are kept here in the same form as the others so the reasoning travels with them. The research behind them is `research/RFX-BEST-PRACTICE-2026-09.md`.

### RFX-D1 · RFI, RFQ and RFP as separate modules
**Market practice.** Suites keep one event engine with an event type (Ariba, Oracle, Coupa), but buyers meet them as different jobs: an RFI qualifies suppliers, an RFP compares proposals and terms, an RFQ collects firm prices. Supplier guides from Coupa and Ariba customers describe each type separately.

**Decision.** Three modules, each its own menu item under Sourcing, for buyers and suppliers (NV-07). This replaces the single sourcing page with RFI / RFQ / RFP tabs. The modules share their building blocks (questions, attachments, confidentiality gate, templates) and are linked only by pre-fill (RFX-D3).

**What would change this.** If buyers routinely run all three for the same need, a sourcing project that groups them (the Ariba project container) becomes worth adding on top; the modules would stay.

### RFX-D2 · Templates and copying a past event
**Market practice.** Every leading platform creates events from templates and by copying a past event, choosing what carries over (Ariba `itemsToIncludeForCopy`: content, line items, suppliers, even prior bids; Coupa "from template" and "Copy Event"). Template administration sits with a small admin group.

**Decision.** Buyers can save a template, start from one, and copy a past event, for RFI, RFQ and RFP. A template keeps content, never invitees or dates; a copy keeps invitees and clears dates. This reverses CE-04 and part of A-04 (2026-09-18). The central library stays owned by Procurement, changed by IT on request, with no admin screen (CE-05 stands).

**What would change this.** If saved templates multiply and drift from the library, Procurement may want to approve templates before others can use them; that is the admin screen (BL-91), not a reversal.

### RFX-D3 · Independent events with allowed links
**Market practice.** An RFI is used as a qualifying round and its information is reused in a follow-on RFP or RFQ, usually by copying (Ariba, Oracle "Cross Copy RFI to RFQ"). No platform forces a sequence.

**Decision.** The three are independent and each can be created alone. Allowed links: RFI → RFQ, RFI → RFP, RFP → RFQ, purchase requisition → RFQ. The new event is pre-filled, fully editable, and records and shows its source (CE-09).

**What would change this.** A need to go back the other way (an RFQ turned into an RFP when quotes reveal the spec was wrong). Nothing has asked for it.

### RFX-D4 · Open-spec requests in the RFP or RFI, prices labelled indicative
**Market practice.** When the need is not yet specified, buyers use an RFI or an RFP in which the supplier proposes the solution, and RFI prices are non-binding by convention. No vendor checked has a native "indicative vs firm" flag; the basis is carried by the event type, a price-validity term, or a follow-on round.

**Decision.** Recommendations, options, samples and indicative prices go in an RFP (or an RFI price range), and every such price reads "Indicative"; firm prices by quantity break go in the RFQ and read "Firm" (CE-10). Tundra and ICY are RFPs; Oslo, Iron and Redwood 2.0 are RFQs.

**What would change this.** If suppliers treat "indicative" as a commitment in practice (or refuse to give one), the RFP pricing step would need a validity date and an explicit non-binding statement; the validity date already exists.

**Amended 2026-09-25 (RFX-D6).** Firm prices can now also be given in a firm-offer round inside the RFP, and those read "Firm" with their validity. Every other RFP price still reads "Indicative".

### RFX-D5 · Split award per item on an RFQ
**Market practice.** Manual award scenarios award per line item and split by percentage or quantity (Ariba); Oracle awards by supplier or by line. With quantity breaks the cheapest supplier often changes with volume, which is what a split exists for.

**Decision.** An RFQ can be awarded to several suppliers, per item, split by %, and every item totals 100%. The award is made at one evaluation break, recorded on every line, and needs a reason when an item's best-scored quote gets no share (REQ-E03-05).

**What would change this.** If the business wants to split by quantity rather than by share, or award different items at different breaks, the award record already holds a quantity and a break per line; the rule would change, not the data.

**Amended 2026-09-25 (RFX-D7, RFX-D9).** That case arrived: an award now splits by % or by quantity, each item has its own break, and items can be left open for a later award.

---

## RFx decisions (decided 2026-09-25)

The owner accepted every recommendation in section 7 of `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md` (D-1 to D-9) on 2026-09-25. They are recorded as RFX-D6 to RFX-D14 in section 9 of the requirements and were built in PRs #54 to #64, #66 and #67 (merged 2026-09-28). Market sources and their grades are in section 10 of that file.

### RFX-D6 · What an RFP award binds each party to (D-1)
**Market practice.** Award from an RFP is standard: the SAP Ariba Award tab covers RFPs and RFIs, and Coupa awards RFP, RFI and RFQ events at line level. Prices are firmed up by a new round before award (Ariba). No vendor documents whether an RFP price binds at award; Ariba's framework agreement "is not a binding contract".

**Decision.** Option A. The buyer opens a firm-offer round inside a Closed RFP for named options and quantity points, and invites only suppliers that submitted and pass the compliance gate. Each supplier gives firm prices with a validity date. The award is made per option on those firm offers, with a reason, and binds PTI to place the business through SAP and the supplier to hold its offer until the validity date. Firm-offer prices read "Firm"; every other RFP price stays "Indicative". An option awarded in the RFP cannot also go to an RFQ. **Amends** RFX-D4, CE-10 and REQ-E03-04 BR-08; adds REQ-E03-04 BR-15 and BR-16. Built in PR #57 (round), #66 (award) and #67 (screens).

**What would change this.** If suppliers will not give firm prices outside an RFQ, the round adds a step without saving one, and option B (selection only, firm prices through RFP → RFQ) is the fallback. FU-7, whether a Partly awarded RFP may run a new round for its open options, was decided on 2026-09-28 as RFX-D15.

### RFX-D7 · Split by quantity as well as percentage (D-2)
**Market practice.** Ariba splits "by percentage or quantity", Oracle by quantity, and Jaggaer "by quantity count or quantity percentages".

**Decision.** Add quantity. The buyer chooses "Split by %" or "Split by quantity" per item, the other side is derived, and every line stores both. **Amends** RFX-D5 and REQ-E03-05 BR-06. Built in PR #58 (rule) and #64 (panel).

**What would change this.** If buyers only ever type percentages, the quantity toggle is screen weight with no use; the data would still hold both.

### RFX-D8 · File limits (D-3)
**Market practice.** Coupa allows 250 MB per upload and bars ZIP and executables; Ariba defaults to 100 MB; Jaggaer to 50 MB.

**Decision.** At most 25 MB per file and 30 files per response. Allowed: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, PNG, DWG, DXF, STEP, STP. No ZIP or executables. The limits are named constants, so a change is a 1-line edit. New rule CE-11e. Built in PR #55 (rule), #56 (verbs) and #63 (checked on pick).

**What would change this.** A real dieline, mold drawing or sample-photo set above 25 MB, or a supplier that needs more files than the limit. Both are values the owner can move.

### RFX-D9 · Partial award and a break per item (D-4)
**Market practice.** Fairmarkit lets the buyer "award the remaining line items later"; Oracle leaves remaining units "not awarded". Quantity tiers that differ per award line were not found for any vendor.

**Decision.** Allow both. Each item has its own break, an item can stay "Not awarded now", and the event is Partly awarded until the last item is awarded or the rest is marked "Will not award". **Amends** REQ-E03-05 BR-06 and BR-06a; adds BR-11. Built in PR #58 and #64. On an RFP, "Will not award the rest" is not offered yet (PR #67, BL-130).

**What would change this.** If Partly awarded events pile up with open items nobody closes, the hub would need a reminder or an automatic close after the quotes expire.

### RFX-D10 · Approval before award (D-5)
**Market practice.** Ariba has "Approval for Award"; Oracle approves awards above an amount limit.

**Decision.** No approval in the MVP, matching CE-06 for sending an event. Award, cancel and "Raised in SAP" are separate permissions, so Procurement can give them to different people. An approval by value needs approval-policy and approval-act ledgers this platform does not have, and stays on the later list. REQ-E03-05 BR-17. The separate permissions were built in PR #61 (RFQ) and #66 (RFP).

**What would change this.** An audit finding on an award, or a finance rule that awards above a value need a second signature.

### RFX-D11 · Revise after submit for RFI and RFP (D-6)
**Market practice.** Suppliers revise until the deadline and "the last submitted response" counts (Ariba customer guide); Coupa suppliers "update your information as many times as needed"; Oracle keeps revised and archived responses.

**Decision.** Allow revise until the supplier's deadline, as the RFQ quote already allowed. Every version is kept with its files, and the buyer reads the latest. **Amends** the RFI and RFP response lifecycles, in which a submitted response was final. CE-11g, REQ-E03-02 BR-18, REQ-E03-04 BR-14. Built in PR #59 (verbs and versions) and #63 (screens).

**What would change this.** If buyers start evaluating before the deadline and suppliers use revisions to react to what they hear, a sealed period (BL-87) would be needed.

### RFX-D12 · Cancel an award (D-7)
**Market practice.** Oracle reopens an award decision with a reason, and "This activity is recorded"; Ariba lets a resubmitted award scenario overwrite the earlier one.

**Decision.** An award can be cancelled with a reason until it is marked "Raised in SAP" with the SAP document number. The cancelled record is kept, and a correction is a cancel followed by a new award. **Replaces** the REQ-E03-05 edge case that returned the event to evaluation; REQ-E03-05 BR-13 and BR-14. Built in PR #61 (RFQ verbs), #64 (RFQ screens), #66 (RFP verbs) and #67 (RFP screens).

**What would change this.** Once SAP sends the document number back (SAP seam, BL-121), "Raised in SAP" should be set by the interface rather than typed.

### RFX-D13 · Response targets in the metrics tables (D-8)
**Market practice.** None; these are PTI's own targets. No baselines exist.

**Decision.** Accept the proposed targets of sections 4j, 5j and 6j of the analysis as starting targets, and review them after 3 months. Recorded in CE-11m and in the metrics of REQ-E03-04 and REQ-E03-05. No build.

**What would change this.** The first 3 months of measurement.

### RFX-D14 · Certificate expired at the deadline (D-9)
**Market practice.** Ariba's certificate answer carries a number and effective and expiry dates. No vendor rule for an expired certificate at submission was found.

**Decision.** Accept the submission and flag the certificate to the buyer, so a supplier that is renewing is not locked out and the buyer sees the flag at award. CE-11d. Built in PR #56 (rule) and #62 (flag in the buyer's file view). An RFx certificate does not update the compliance registry or the compliance gate (CR-23).

**What would change this.** If an expired certificate reaches an award unnoticed, the flag should block the award line instead of the submission.

### RFX-D15 · Firm-offer round on a Partly awarded RFP (FU-7, decided 2026-09-28)
**Market practice.** Ariba opens a new round of bidding after bidding closes and before items are awarded, the same source graded A for RFX-D6 and D-1 (section 10 of `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`). Nothing there requires every item to be unawarded, so a round for the items still open after a partial award follows the same practice.

**Decision.** Allow it. A firm-offer round opens on a Closed or a Partly awarded RFP, for the options still open: an option named by an award in force, or sourced by an RFQ created from the RFP, is refused by name. The newer round's firm prices replace the older ones for the same supplier and option, and the final award on the remaining options moves the RFP to Awarded. RFP → RFQ stays available for any open option. **Amends** REQ-E03-04 BR-15e; closes FU-7 and BL-128. Built in PR #71.

**What would change this.** If buyers keep sending the open options to an RFQ anyway, the second round adds a path nobody uses and could be withdrawn. If suppliers reprice options already awarded through a later round, the settled check already refuses that; a need to reopen an awarded option would instead mean cancelling its award first.

---

## RFx UX decisions (decided 2026-10-19)

The owner ruled on the open questions of the RFx UX evaluation (`research/RFX-UX-EVALUATION-2026-10.md`, section 9, plus BL-132 and the module names) on 2026-10-19, and on B-02 during the build. They are recorded here as RFX-D16 to RFX-D24 and built in GitLab MRs for waves 1 and 2 (branches `feat/rfx-ux-wave1` and `feat/rfx-ux-wave2`). Build status per finding is in section 10 of the evaluation.

### RFX-D16 · Firm-offer round or RFQ from the RFP (Q1, B-07)
**Decision.** A firm-offer round firms up full-service and ODM options settled inside the RFP. "Create RFQ from this RFP" is for components tendered per item. Once an option is named by a firm-offer round, the RFQ path closes for that option: the RFQ create policy refuses it (`RFQ_OPTION_IN_FIRM_ROUND`) and the RFP page shows it greyed "In firm-offer round N". **Amends** RFX-D15's "RFP → RFQ stays available for any open option" and REQ-E03-04 BR-08 for options in a round.

**What would change this.** Buyers needing a per-item tender for part of a full-service option would need the option split first.

### RFX-D17 · RFI and RFP details on their own pages (Q2, B-09)
**Decision.** The RFI and RFP details become pages of their own (`/buyer/rfi/:id`, `/buyer/rfp/:id`), like the RFQ event page. Creation stays the modal wizard opened from the list page; after saving, the wizard opens the new event's page instead of expanding a row.

### RFX-D18 · Award notice to the supplier at award (Q3, S-04)
**Decision.** The supplier's award notice (To do row and the hub bell) appears when the award is recorded, not when it is marked raised in SAP, with the line "The purchase order follows from SAP". A withdrawal is notified the same way. Email stays BL-120.

### RFX-D19 · Incoterms default FOB (Q4, B-03)
**Decision.** "CIF Jakarta" is not added to the option list. A new RFQ draft defaults to FOB; a stored value outside the list is shown red on the Review step ("Choose a term on the Terms step"), not refused.

### RFX-D20 · Supplier To do grouped by lane (Q5, X-02)
**Decision.** The supplier To do is grouped by lane (Orders, Stock, Sourcing, Forecast and commitments, then Invoices and documents), each lane ordered by deadline. Levi approves the ordering. A red row no longer jumps above other lanes.

### RFX-D21 · Intent and decline on the RFI and RFP (Q6, S-13)
**Decision.** BL-132 is approved for build: the supplier says it will respond or declines with a reason on the RFI and the RFP, as on the RFQ.

### RFX-D22 · No win rate in the supplier's award history (Q7, S-03)
**Decision.** The win-rate tile is dropped. Award history is one row per event, read from the award record.

### RFX-D23 · One name per module (Q8, X-01)
**Decision.** The names in proposal X-01 are used in menu, page titles, To do and toasts, with the acronym first ("RFQ · Quotation requests"). The Indonesian section header "Sourcing" becomes "Pengadaan", which is also the Indonesian name of the Procurement role.

### RFX-D24 · The RFQ side panel becomes a summary (B-02)
**Decision.** Move, then trim. Move to review, recording the exchange rate and answering clarifications move from the board's side panel to the RFQ event page, each with its own handoff notice; the panel keeps status, Next, deadline, response counts, three links, lifecycle actions, the award box (award notice, "no supplier can win" notice, award link), Save as template and the timeline. **Amends** the §76 reading of the panel as a workspace for these actions only. With no recorded exchange rate the event page keeps the bids visible with "—" scores under a banner naming each currency and the rate date; the award rule is unchanged.

**What would change this.** If buyers review quotes mostly from the board, a "Review" link straight to the comparison section is the cheaper fix than moving the actions back.

### RFX-D25 · Proposal view on the RFI and RFP pages (decided 2026-10-20)
**Decision.** The RFI and RFP pages get three tabs: Overview, Compare and By supplier. Compare opens by default once a proposal or answer is submitted; Overview opens when none is. Compare starts with one summary card per supplier, best scored first, then the grid: "Show deviations only" (on by default when a deviation exists), collapsible term groups with their deviation counts, a sticky supplier header, and a neutral "Best" tag on comparable rows (lowest price, shortest lead time, most payment days, longest price validity) and on the lowest indicative price per option and quantity. By supplier shows one proposal at a time. The invitee table stays on Overview; Compare shows a one-line count. List rows have one "Open" button and read "N of M submitted". Display only: no score, rule or award changes. Built in lane 2G (wave 2 MR).

**What would change this.** If buyers read "Best" as a recommendation to award, drop the tag and keep the deviations view.

## RFx owner rulings (decided 2026-10-22)

Levi ruled on six points left open after RFx UX waves 1 and 2 on 2026-10-22. RFX-D26 to RFX-D28 keep what waves 1 and 2 built; RFX-D29 to RFX-D31 are built on branch `feat/rfx-ux-owner-rulings-1022`.

### RFX-D26 · Legacy RFQs need "I will respond" before quoting
**Decision.** Keep. A supplier states "I will respond" on a legacy RFQ before the quote form opens, as on a tiered RFQ (built in wave 2).

**What would change this.** Suppliers skipping legacy RFQs because of the extra step, seen as fewer quotes on legacy events than before wave 2.

### RFX-D27 · A decline on the RFI and RFP is final
**Decision.** Keep. A supplier that declines an RFI or RFP cannot take the decline back or answer afterwards; "I will respond" can still become a decline until the response is sent (built).

**What would change this.** Buyers asking to re-invite a supplier that declined by mistake; the fix then is a buyer re-invite, not an undo for the supplier.

### RFX-D28 · Response drafts stay in the browser
**Decision.** Keep. A supplier's unsent RFI or RFP answers are kept in its own browser; drafts on the server are BL-214 (built).

**What would change this.** Suppliers losing drafts when they switch device or clear the browser, which moves BL-214 up.

### RFX-D29 · "Best" on MOQ, allocation and OTIF
**Decision.** The "Best" tag on the RFP Compare grid also marks the lowest minimum order quantity (`moq`), the most capacity allocated to PTI per month (`allocation`) and the highest on-time-in-full commitment (`otifCommitment`), beside price, lead time, payment days and price validity. Quantities are read in pieces or kilograms (a bare number in pieces) and allocation per month; OTIF is a percentage from 0 to 100. A value that cannot be read as a number in the row's common unit gets no tag, and a row split evenly between two units gets none. Display only, as RFX-D25.

**What would change this.** Suppliers writing these terms in units the reader cannot convert, so the tag is missing on most rows; the term would then need a number-with-unit field.

### RFX-D30 · No default unit for an "Other" RFQ
**Decision.** The RFQ wizard defaults the unit by category: Packaging to PCS; Fragrance, Active Ingredients, Emulsifiers and Botanical to KG; Other to none. With no unit the Scope step does not advance and says "Choose a unit". The create verb refuses an empty unit (`UOM_MISSING`) or one off the list (`UOM_UNKNOWN`) by the same rule. A unit the buyer picked is kept when the category changes.

**What would change this.** Most "Other" RFQs ending up in one unit, which would make that unit the default.

### RFX-D31 · Decline reasons per event type
**Decision.** A shared core (not our product range, no capacity, compliance not met, specification unclear, other) plus reasons that fit the event: the RFQ adds lead time too short and quantity too small; the RFI adds confidentiality or T&C terms not acceptable; the RFP adds the T&C reason, commercial terms not met and cannot develop the formula or design (ODM). The supplier's own words stay required. Each intent verb refuses a reason off its event type's list (`DECLINE_REASON_UNKNOWN`). Seeded declines keep valid reasons.

**What would change this.** Many declines filed as "Other" with the same words, which names a reason the list is missing.

### RFX-D32 · The response deadline is checked when the buyer leaves it
Levi accepted this on 2026-10-26, after the react-hook-form conversion of the RFI and RFP create wizards pinned two differences between them.

**Decision.** Both create wizards check the response deadline when the buyer leaves the field, not while they type. Then a blank deadline says "Deadline is required." ("Batas waktu wajib diisi.") and a past one says "The response deadline must be a date in the future." Until the field has been left, neither shows; Next stays disabled either way. Before this, the RFP refused a past date as it was typed and said nothing about a blank one, and the RFI said "must be a date in the future" for a blank one too. The rule for what counts as past is unchanged: the submit verb's own, end of the deadline day (CE-07).

**What would change this.** Buyers typing a date and pressing Next without leaving the field, so the disabled Next has no reason beside it.

---

## Inventory & Capacity UX decisions (decided 2026-10-22)

The owner accepted every recommendation on the open questions of the Inventory & Capacity UX evaluation (`research/INVENTORY-UX-EVALUATION-2026-10.md`, section 9) on 2026-10-22. They are recorded here as INV-D1 to INV-D11; INV-D12 and INV-D13 follow the owner's rulings on BL-225 and BL-226 during the wave 2 build. Four close backlog decisions (BL-65, BL-68, BL-144, BL-148); two stay open with an interim build rule (BL-149, BL-150).

### INV-D1 · Risk class on supplier cover, named as such (BL-68, P-08)
**Decision.** CR-24 days of cover stay supplier stock ÷ demand. The figure is labelled "Supplier cover" (ID "Cakupan stok pemasok") wherever it drives a risk class; PTI cover is shown beside it as a second figure. An alert about PTI stock states its own basis instead of borrowing supplier cover. Labels change; the rule does not.

**What would change this.** If planners act on PTI cover more than supplier cover, the class moves to PTI cover and CR-24 is reworded.

### INV-D2 · Capacity entered per week, with "Copy to all weeks" (BL-65, S-05)
**Decision.** Capacity stays one value per week on the 13-week grid. The supplier gets "Copy to all weeks" (ID "Salin ke semua minggu") to fill steady capacity in one action, then edits the weeks that differ.

### INV-D3 · Stock simulation sample row stays until real data replaces it (BL-148, P-10)
**Decision.** The labelled sample row (sup-004 × FR-WARD-4410) stays on Stock simulation until a seed pair reproduces the MR-7 worked example; it is removed in the same change that adds that pair.

### INV-D4 · Weekly panel shows one deadline until Material Planning names the second (BL-149, S-02)
**Decision.** BL-149 stays open with Material Planning. Until it is answered, the weekly-update panel, the supplier To do and the Stock page show one status built on the stock-update cutoff; no second deadline and no SOP link are shown.

**Superseded 2026-11-02 (owner, BL-149).** The weekly confirmation is the supplier's stock, capacity and feedstock, together in one visit by the Thursday cutoff, so the panel and the To do show all three (BL-236). The SOP link still waits on the document.

### INV-D5 · Alert next steps now, grouping after the rule list (BL-150, P-03, P-04)
**Decision.** BL-150 stays open until the 2026-09-23 alert list is shared. P-03 (a next step, days to impact and a fitting action on each alert) is built now. P-04 (one card per supplier × material) waits for the final rule set.

### INV-D6 · Update mode: admin changes it, planner sees it (BL-144, P-14)
**Decision.** Changing a supplier's stock update mode stays with the administrator lane (`supplier:set-update-mode`, unchanged). Inventory shows each supplier's current mode with a link to the admin page; a Material Planner cannot change it there.

### INV-D7 · A dispatched call-off counts as shipped (P-09)
**Decision.** In the stock simulation a call-off counts as shipped from dispatch, with or without an ASN, and leaves "not shipped". An ASN, when it arrives, confirms the same quantity rather than adding to it.

### INV-D8 · Capacity gap follow-up: accept or ask, both recorded (P-07)
**Decision.** On a gap week the planner can "Accept additional capacity" (ID "Terima kapasitas tambahan") or "Ask supplier" (ID "Tanyakan ke pemasok"); both are recorded on the planning group and week. "Move demand" is not built here; it belongs to the order plan.

### INV-D9 · "Ask supplier" is a hub message (P-02, P-07)
**Decision.** "Ask supplier" creates a hub ask that appears on the supplier's To do and is answered in the hub, with an optional WhatsApp share of the link. No email (BL-26).

### INV-D10 · Blank template rows are ignored and named (S-03)
**Decision.** A template row left blank is not an error. The upload result reads "N rows left blank, not sent" (ID "N baris kosong, tidak dikirim") beside the button, next to what was sent; only a filled row that breaks a rule is refused.

### INV-D11 · The supplier is told when PTI stock access is removed (S-10)
**Decision.** When PTI removes a supplier's access to PTI stock, the supplier's Stock page shows one line saying PTI stock is no longer shared, with no reason given.

### INV-D12 · Accepted additional capacity and the capacity alert (BL-225, decided 2026-10-22)
**Decision.** An amber week (LTP above capacity, within capacity + additional capacity) that PTI accepted under INV-D8 no longer counts toward the "Allocated capacity below the LTP" alert. A red week (LTP above BE) always counts, whatever is recorded on it. When every gap week of a plan is accepted, the plan raises no capacity alert; days to impact run to the first week that still counts. Built on `feat/inv-ux-wave2` (`alertGapWeeks` in `capacityRules.js`).

**What would change this.** If accepted weeks later fall short in delivery, the alert should count an accepted week again once the supplier resubmits below the accepted figure.

### INV-D13 · PTI may accept before the supplier confirms (BL-226, decided 2026-10-22)
**Decision.** PTI can accept a week's additional capacity whether or not the supplier has confirmed it under CAP-3 BR-03. Unchanged from the wave 2 build.

### INV-D14 · Alert thresholds and the stale period per material group (decided 2026-10-23)
**Decision.** REQ-E08-05 BR-03 is built as first written: each alert threshold (the CR-24 lead-time multiples, the CR-02 fallback bands) and the stale period can be overridden per material group on the Alert thresholds page; unset values use the global setting. Stale period precedence: supplier × material (BL-32), then material group, then global. A group's manual stale period in days replaces the weekly cutoff for manual suppliers in that group; API suppliers use the group's hours. Built on `feat/inv-gaps-1023` through the existing `t_setting_set` with scoped keys. Replaces the 2026-10-23 doc alignment that described thresholds as global only.

**What would change this.** If no group gets an override within a quarter of go-live, retire the per-group section to keep one set of numbers.

**INV-D2 built (2026-10-23).** "Copy W36 to all weeks" on the supplier's capacity rows; reasons are never copied.

**INV-D11 built (2026-10-23).** The supplier's Stock page says "PTI stopped sharing its stock with you on <date>" after a full removal; narrowing to fewer materials shows nothing.

---

## Foresight review rulings (decided 2026-11-03)

Levi ruled in chat on 2026-11-03 on the six open questions in section 7 of the Foresight end-to-end review (`research/FORESIGHT-E2E-REVIEW-2026-11.md`). The rulings are recorded here as FSR-D1 to FSR-D6, each with the finding it closes and the alternative not taken. They add BL-259 to BL-261 and reword BL-237, BL-238, BL-251 and BL-138 in section 4d of `BACKLOG.md`; FSR-D6 supersedes build decision DRC-B37 in `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md`. Two stay on the Material Planning team's list as confirmations (L-08, L-15 in `research/FORESIGHT-LOGIC-REVIEW-2026-11.md`).

### FSR-D1 · The hub sample is the plan of record; the engine is the challenger (C-01, C-02, BL-237, L-08)
**Decision.** "Hub sample wins." Until the SAP feeds land, the hub sample data (LTP, demand anticipation, call-offs and the OSIP columns) is the plan of record for every Foresight figure; the engine dataset (the What to order netting, Material requirement and the Safety stock challenger columns) is the challenger. The basis line BL-237 adds under each figure group says which of the two it is, "plan of record" or "challenger", and not only the dataset name. L-08's recommendation becomes "the OSIP safety order nets What to order"; it stays on the team's list as a confirmation.

**Alternative not taken.** Labelling both datasets without ranking them (C-01's proposal), which would have left the planner to decide per page which stock figure to act on.

**What would change this.** The SAP stock and plan feeds landing: the engine then reads the same stock as the hub and the two worlds become one.

### FSR-D2 · The leftover liability stays PTI-only until BL-207 is ruled (U-18, BL-259)
**Decision.** "PTI only." The "Liability, not priced" flag the feedstock reconcile builds under the [Proposed] BL-207 rule is shown to PTI only. The supplier's Feedstock reconcile page does not show it until the owner rules on BL-207. The flag stays behind the existing switch (`FEEDSTOCK_LEFTOVER_RULES.leftoverRule`); the computation and the PTI view are unchanged.

**Alternative not taken.** Leaving the proposal visible to suppliers as their liability before the rule is agreed, against DRC design rule 5.

**What would change this.** The BL-207 ruling itself: once the leftover rule is agreed, the flag is shown to both sides under that rule.

### FSR-D3 · Demand anticipation (DA) is step 6 of the weekly step strip (U-11, BL-251)
**Decision.** "Step 6." The Demand anticipation (DA) page joins the weekly step strip as step 6, after Foresight commitments, with the "Decision here / Uses / Next" purpose header and the Data health chip the other steps carry. The strip returns to This week after DA. This supersedes the strip order recorded in `research/IA-BUILD-DECISIONS-2026-10.md` D-19, where the strip returned to This week after Foresight commitments.

**Alternative not taken.** Keeping DA as a side page in the Weekly plan menu with its own header and no step.

**What would change this.** Planners publishing DA at a fixed point earlier in the week than step 6: the step then moves, the strip stays.

### FSR-D4 · The forecast number-format site leaves BL-138 (C-07, BL-260, BL-138)
**Decision.** "Un-park them." The number-format site on the weekly cycle, `qtyText` in `pages-v2/forecasts/forecastDisplay.jsx`, one helper serving Foresight commitments for both personas, leaves BL-138 and is fixed now: quantities follow the reader's language (X-01 of `research/INVENTORY-UX-EVALUATION-2026-10.md`) through `formatNumber`, the helper BL-223 introduced. The RFx pages define their own local `qtyText`, so the change does not reach them. The RFx sites stay parked under the 26 Oct rule of no new RFx code until the RFx requirement is confirmed.

**Alternative not taken.** Keeping the forecast site parked with the RFx ones, leaving "34,300" beside "34.300" on one Indonesian cycle.

**What would change this.** Nothing on the forecast side; the RFx requirement being confirmed releases the rest of BL-138.

### FSR-D5 · The Publish to suppliers basis line is built now (C-03, BL-238)
**Decision.** "Add it now." The basis line under the "Per supplier and material" table on Publish to suppliers is built now, saying that Engine value, Last published and First published are the engine's versions replayed 12 weeks back and that suppliers hold the sample Version 2. The Source column still waits for the engine (F-13, FUX-D4); no column is renamed. BL-238 stands as written with its "or wait" condition removed.

**Alternative not taken.** Waiting for the engine's Source column (FUX-D4) to make the replay visible, leaving "Last published 0 PCS" unexplained until then.

**What would change this.** The engine replacing the replay: the basis line then names the engine's version instead of the replay.

### FSR-D6 · The call-off trigger re-arms on every check (U-01, L-15, BL-261; supersedes DRC-B37)
**Decision.** "Re-arm every check." While stock on hand stays at or below ROP Fisik, the call-off trigger drafts again on every check instead of waiting for SOH to be seen above ROP Fisik first. This replaces build decision DRC-B37. The what-if sandbox then shows a chain of call-offs plus a PR recommendation for what no open PO covers, instead of 22 weeks of negative stock beside "PR 0". The change is built behind a switch whose default is re-arm-every-check and whose other variant is DRC-B37. L-15 stays on the team's list as a confirmation; if the Material Planning team reads the rule differently, the switch flips back.

**Alternative not taken.** Keeping DRC-B37 (one open draft, re-arm only after SOH is above ROP Fisik) until the team answers L-15.

**What would change this.** The team's answer to L-15 (PERTANYAAN F2) naming DRC-B37 as the rule, or a call-offs-per-drop rule that makes repeated drafts unnecessary.

### FSR-D7 · BL-243 and BL-249 are built: the page name applies IA R-2, the DA labels gain the check qualifier (U-07, U-10; decided 2026-11-05)
**Decision.** "Follow-up MR." Levi ruled in chat on 2026-11-05, in the Foresight review session, after both readings were laid out. BL-243 is not a rename: it applies the name IA R-2 already gave the page ("Foresight commitments", ID "Komitmen foresight") to the strings that still carried "Commitments & gaps", "Forecast & commitments" and their Indonesian forms. BL-249 keeps TL-D1's "Demand anticipation (DA)" and adds the qualifier, as TL-D13 did on the history page: the What-if headline reads "Demand anticipation (DA) over the lead time, before the check", and the grid rows read "Demand anticipation (DA) after the check, current plan / this scenario". No figure changes. Both are built in a follow-up MR stacked on MR !94.

**Alternative not taken.** Keeping both rows held as label renames until a wider label review.

**What would change this.** The Material Planning team naming their own word for "after the check" (TL-D13 keeps it on their question list): the qualifier then changes on both pages together.

### FSR-D8 · BL-263's Indonesian labels are renamed too: the team's English terms stay English inside the label (U-14; decided 2026-11-05)
**Decision.** Levi ruled in chat on 2026-11-05, relayed by the Foresight review session while wave 3 was being built: "BL-263: rename the Indonesian ID labels too (B2, B4, B8, Panduan sheet), keeping the team's English terms per TL-D11/TL-D17." On Safety stock targets the four Indonesian labels now read "SD untuk safety order (B2)", "Safety order dibulatkan ke atas ke (B4)", "Max (B8)" and "Panduan sheet: ROP + cycle stock"; the (B2), (B4) and (B8) question suffixes and the English labels are unchanged. This is the label-side ruling TL-R1 BR-03 requires: BL-256 and the BL-263 sentence sites applied TL-D17 to sentences, and BL-263 held the labels until this ruling. Built on branch `feat/foresight-wave3`.

**Alternative not taken.** Keeping the four labels as agreed text while the sentences around them say "safety order", "Max" and "cycle stock".

**What would change this.** The ruling names four labels. The glossary labels "Waktu tunggu PO", "Waktu tunggu pengaman", "Waktu tunggu pengaman dari nilai bawaan grup" and "Waktu tunggu produksi bottleneck (ROP Supplier)" sit under the same TL-D11 term (lead time) and are left for a ruling that names them (BL-280); FSR-D9 is that ruling.

### FSR-D9 · BL-280: lead time stays English on the planning pages, and the four held glossary labels follow (decided 2026-11-09)
**Decision.** Levi ruled on 2026-11-09: apply TL-D11 and TL-D17 to the planning pages only, and include the glossary labels FSR-D8 held. In the Indonesian text of the planning dictionaries "waktu tunggu" is now "lead time". The four labels read "Lead time PO", "Safety lead time", "Safety lead time dari nilai bawaan grup" and "Lead time produksi bottleneck (ROP Supplier)"; "Safety lead time" is the team's own term (`FORECAST-ENGINE-REQUIREMENTS.md` line 313), and the other three replace only the term, as FSR-D8 did, keeping the Indonesian words around it. The three safety lead time sentences (`sst.subtitle`, `sst.def.slt`, the `sltGroupDefault` tip) follow. He also agreed to leave `weeksChangedInLeadTime` ("Porsi jadwal yang berubah dalam waktu tunggu", TL-D35) as is, and to add four planner-read lines: the `buyerSupplierProfile` KPI eyebrow ("Kepatuhan Lead Time"), `sdcConsolidation` and `processFlowPurpose` (2). Built on branch `feat/bl280-lead-time-label`, merged as `8e19be41` (GitLab MR !99).

**Alternative not taken.** Applying the rule to every dictionary (RFx, admin and the supplier-read pages included), or keeping the four labels as agreed text. The full English "PO lead time" and "Bottleneck production lead time (ROP Supplier)" the sources also show were not taken: the ruling kept the Indonesian words around the term.

**What would change this.** The owner ruling that TL-D11 reaches the RFx, admin and supplier-read pages (BL-288), or the Material Planning team naming a different word for the PO and bottleneck lead times.

## PEX wave 1 build rulings (decided 2026-11-05)

Levi ruled in the tracker on 2026-11-05 on the 17 build decisions in MR !97 (PEX wave 1 and P0 fixes, merged as `b1bc58e8` on 2026-11-09, `SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md`) and on the Stabilise and Reschedule labels. They continue that file's numbering (PEX-D1 to PEX-D15).

### PEX-D16 · Old Trade-off and Forecast weeks both read plain "Zone Capacity" (BL-264, PEX-1)
**Decision.** "Plain Zone Capacity." Every zone name for the weeks after the lead time reads "Zone Capacity", in EN and ID, with no "damped weeks" or "later weeks" suffix: zone pills, Stabilise and Reschedule zone labels and rule names, the Stabilise damping weight and tolerance band settings, the admin settings, the alert basis and the supplier acknowledgement line. The engine keeps its internal keys and rules, so no figure moved. Tips and formula sentences that explain how damping works still say which weeks are damped, because they describe a rule, not a zone name. Two labels keep a qualifier because dropping it makes them wrong or ambiguous: the Stabilise setting "Damping weight, Zone Capacity later weeks" sits beside "Damping weight, Zone Capacity", and the Foresight gap note counts "Zone Liability and Zone Capacity periods that need a commitment".

**Alternative not taken.** "Zone Capacity, damped weeks" and "Zone Capacity, later weeks".

**What would change this.** Planners or suppliers mixing up the weeks that need a commitment with the weeks that need only an acknowledgement in the usability test.

### PEX-D17 · The fulfil-by lead time is DRC-6's (BL-273, PEX-10)
**Decision.** "DRC-6 breakdown." The hub's lead time for "Fulfil by" is `leadTimeBreakdown` over the pair's DRC-6 source (30 days for sup-002 RM-EMUL-9410). The Stock page's `SUPPLIER_LEAD_TIME_DAYS` in `fixtures/inventoryHub.js` (21 days for the same pair) is not changed in this MR; the mismatch is BL-285.

**Alternative not taken.** The Stock page's sample table.

**What would change this.** Master data from OSIP (PEX-14) giving one lead time per pair, which then feeds both.

### PEX-D18 · A call-off with no lead time on record uses the material-type default, labelled (BL-273, PEX-10)
**Decision.** "Default 14/30 days." With no DRC-6 source for the pair, the call-off uses `DEFAULT_LEAD_TIME_DAYS` for the material type (packaging 14 days, raw material 30) and says so: "(default lead time 30 days for this material type)", ID "(waktu tunggu bawaan 30 hari untuk jenis material ini)". Every call-off with a known material type now shows a fulfil-by date. The Foresight commitment row keeps "No lead time on record", because the ruling named call-offs.

**Alternative not taken.** "No lead time on record for this material, so no fulfil-by date."

**What would change this.** PEX-14 master data landing, which gives each pair its own lead time.

### PEX-D19 · The tracking-link step runs as sup-005 on its seeded shipment (BL-279, PEX-16)
**Decision.** "Seed a shipment", then "(a) Use sup-005" once the seed was measured. sup-005 is the only test supplier with a principal (a distributor for RM-EMUL-3310), and it already has a seeded principal shipment on its way (`ish-0002`, Booked, ETA 8 Oct 2026). The usability test runs the tracking-link step as sup-005 on `ish-0002`; nothing new is seeded. sup-002 and sup-007 are manufacturers, and the hub allows a principal shipment only for a distributor.

**Alternative not taken.** Make sup-007 a distributor for one packaging material and seed a principal shipment for it.

**What would change this.** The usability test needing the step as sup-007.

### PEX-D20 · The other MR !97 build decisions are accepted as built (BL-264 to BL-266, BL-273, BL-274, BL-234, BL-78)
**Decision.** "Accept as built." Levi accepted the remaining build decisions of MR !97 as built, on 2026-11-05:
- Supplier class "Semi-firm" reads Zone Capacity; "Visibility only" is unchanged (BL-264).
- A month that starts inside week 17: its days join that month's column, labelled with the full month (PEX-2 BR-03).
- PEX-2 AC-01 reads W45 2026 to W8 2027: 2026 has 53 ISO weeks.
- Months to 12 are counted from the planning week's month; raw material from its first month.
- Fulfil-by counts calendar days from the confirmation day in WIB.
- Before the supplier answers: call-offs read "If confirmed today, fulfil by …"; Foresight reads "Lead time n days; the date is set when you submit"; acknowledge-only periods show no date.
- Indonesian wording of the lead time on fulfil-by: accepted as two wordings, then made one by FSR-D8 (MR !98, merged first): call-offs and Foresight both read "lead time" ("Penuhi paling lambat … (lead time n hari)"), the team's English term (TL-D17).
- The feedstock reconcile flag "Shipped beyond the call-offs" moved under "ASN requested" (BL-274).
- OTIF and CFOT: a call-off date the planner changed and the supplier has not re-confirmed is measured against the previously agreed date (BL-234, BL-66 (2)).
- BL-78 reuses "Baseline period — no target yet"; the radar is titled "Performance radar"; grade and late or on-time colours stay because they show state.

Three items stay deferred, not built: the Zone Capacity quantity (PEX-1 BR-02/BR-03, BL-283), weekly raw material (PEX-2 BR-04, BL-282) and the per-week LTP, SOH and gap hover (PEX-3 BR-02, BL-284).

**Alternative not taken.** The alternatives listed with each decision in the MR !97 report.

**What would change this.** The usability test on 9 or 10 November 2026.

### PEX-D21 · Stabilise and Reschedule keep the zone renames, with their rules unchanged (BL-264, Q-W2)
**Decision.** "Keep renames." The planner pages Stabilise and Reschedule show "Zone Liability" and plain "Zone Capacity" (PEX-D16). Their rules do not change: Stabilise still damps and band-holds the first weeks after the lead time and publishes the later weeks as calculated, and Reschedule keeps its penalties and ranking. The engine's internal zone keys stay firm, tradeOff and forecast.

**Alternative not taken.** Keep the old Firm, Trade-off and Forecast names on the two planner pages, where the rules still differ by week.

**What would change this.** Planners misreading which Zone Capacity weeks are damped.

### PEX-D22 · Zone Capacity periods are acknowledge-only; commitments are typed in Zone Liability only (BL-264, Q-W1)
**Decision.** "Fix in !97 now", then "Do it fully (a)" once the effect was measured (Levi, 2026-11-05). The supplier types a commitment only in Zone Liability periods. A Zone Capacity period (the engine's old Trade-off and Forecast weeks) is read-only with an Acknowledge action; the commit verb refuses it ("line is Zone Capacity") and the acknowledge verb refuses a Zone Liability line. The capacity-left quantity stays in BL-283. The engine's zones, Stabilise and Reschedule rules are unchanged (PEX-D21). Build calls (my call): the setting "Shortfall below forecast accepted in Zone Capacity periods" (`commitment.tradeOffShortfallPct`) is removed, not marked deprecated, because it no longer changes any outcome; sup-007's reduced capacity week (60,000 against LTP 72,800, reason Material) moved from 14 Sep to 7 Sep 2026 so the red capacity check still has a Zone Liability week to show.

**What moved on the sample data (demo clock 31 Aug 2026), before → after:**
- Commitment exceptions: 3 → 2 (the old Trade-off exception on PK-PETB-8802 is now acknowledged).
- Old Trade-off lines: 4 accepted + 1 exception + 19 awaiting → 5 acknowledged + 19 awaiting acknowledgement.
- "Committed below forecast" alerts: 3 → 2 (the Medium alert on PK-PETB-8802 is gone; the two High alerts stay). All alerts: 32 → 31.
- Order summary answers over the 108 lines: Confirmed 8 → 4, Gap 3 → 2, Awaiting 24 → 5, Not required 73 → 97.
- Cumulative commitment rows: 13 → 5 periods.
- The capacity alert for sup-007 rigid plastics: days to impact 14 → 7 (same gap, 12,800 PCS).
- Unchanged: overdue commitment lines (4, all Zone Liability), the other alert rules, forecast quantities.

**Alternative not taken.** (b) the supplier page only, with the buyer rules unchanged; (c) defer to BL-283.

**What would change this.** Suppliers in the usability test expecting to commit beyond the lead time, or the capacity confirmation feeding Zone Capacity (BL-283).

### PEX-D23 · PO On Hold grace and no-movement days count working days (BL-270, BL-272, PEX-7)
**Decision.** "Working days." Levi ruled on 2026-11-09 that the PO On Hold grace period and the no-movement days count working days on the hub calendar, not calendar days. The defaults stay 14 each (PEX-D7), per supplier × material. "Decision due" and the days left are working days. Built in MR !100 (`55b63846`, commit `63946249`).

**Alternative not taken.** Calendar days, which is how the first build counted them.

**What would change this.** Material Planning wanting the grace period tied to the supplier's own working calendar.

### PEX-D24 · Wave 1 questions Q-W3, Q-W4 and Q-W5 (BL-284, BL-279)
**Decision.** Levi accepted the recommended answer to each of Q-W1 to Q-W5 on 2026-11-05 (source: the superseded note at the head of `prompts/plan-execution-wave1-build.md`). Q-W1 and Q-W2 were then ruled as PEX-D22 and PEX-D21. The other three:
- **Q-W3.** Suppliers see the heads-up sentence only. The per-week LTP, SOH and gap show on the buyer Commitments grid, and on the supplier page only for materials with granted PTI-stock access. Not built: BL-284 stays open.
- **Q-W4.** The principal tracking link is held by a governed, append-only ledger verb in the supplier lane. Built as `t_incomingshipment_track` (MR !97), not under the name `t_incomingtracking_set` the question used.
- **Q-W5.** The supplier test build is a Vercel preview deploy from the CLI of merged GitLab `main`, with the owner's OK, while the GitHub sync is paused.

**Alternative not taken.** Q-W3 per-week figures to every supplier; Q-W4 a display-only field held in the page session; Q-W5 resuming the GitHub sync for the one merge.

**What would change this.** BL-284's own condition: an owner ruling on showing PTI stock to suppliers.

### PEX wave 2 build calls, proposed and not ruled

The wave 2 lanes built the "My calls" rows of `SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md` section 6 as written: PEX-D3, PEX-D9 and PEX-D14 (MR !100), PEX-D10 to PEX-D13 (MR !102) and PEX-D15 (MR !101). They are **proposed**; the owner has not ruled on them, so this guide does not record them as decisions. A change after merge is a small follow-up MR.

### Builder calls from MR !117, !127, !130 and !131, proposed and not ruled (2026-11-11 to 2026-11-12)

The owner was away, so four builds went ahead on the builders' own calls. Each call below is **[Proposed]**: no source settles it and the owner has not ruled on it. The lists come from each builder's own report of its "Decisions for the user"; the MR descriptions themselves are on private GitLab and were not read in this pass. A change after merge is a small follow-up MR. PEX-D25 to PEX-D28 were ruled by the owner on 2026-11-12 and are recorded in section 6 of `SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md`; the calls under MR !127 are the builder's calls inside that ruling.

**MR !117: end-of-grace execution of the PO On Hold decision (`5dbcf76c`, PEX-8, PEX-10).** The MR description says the owner accepted all seven calls on 2026-11-11 ("Accept all"). **Unverified:** no record of that answer was found in the repository or the documents; it rests on the MR description and a hand-over note. The owner separately accepted the execution as built on 2026-11-12 (PEX-D27), which does not say whether these seven calls were accepted. Treat the seven as open until the owner confirms.

| Ref | Call | Alternative |
|---|---|---|
| !117-1 | FG with no computable cap waits, it does not absorb 0 | Absorb 0 and spend the one run |
| !117-2 | FG is not offered as a suggestion while the cap is not computable | Offer it anyway |
| !117-3 | A spread week with no existing call-off takes nothing | Use the week's Monday as the need date |
| !117-4 | Execution call-offs are left out of the DA week supply, so their quantity leaves hold | Count them as DA supply; the line then never clears, because a spread inside the DA cap does not change PO On Hold under PEX-7 BR-01 |
| !117-5 | A consumption week counts as stock movement on the week's last working day, capped at today | None stated |
| !117-6 | A line left on hold after FG or a capped spread has no "suggest again" path: one suggestion per episode. **Since MR !135** (merged to `main` on 2026-11-16, in production since 2026-11-17) **the path exists, as a new round [Proposed]**: calls !135-1 to !135-3 and the question !135-3a | None stated |
| !117-7 | The existing line "FG absorbs nothing and the whole quantity stays on hold" is kept, though it reads slightly off now that the execution waits | None stated |

**MR !127: sourcing-share split and brand share per month (`15f9712f`, PEX-D25, PEX-D26).**

| Ref | Call | Alternative |
|---|---|---|
| !127-1 | `materialShares` is unchanged, so the stock-on-hand share, the consumption split (BL-211), OSIP safety and the sandbox still use the LTP share | Move all of them to the sourcing share |
| !127-2 | A supplier with no share on record, for a material that has shares, reads 0; recorded shares are used as they are, not scaled to add up to 1. **The second half is replaced by BL-313 (PEX-D29, accepted by the owner 2026-11-17, MR !140): each share is divided by the total of the material's recorded shares** | None stated |
| !127-3 | A recorded share of 0 counts as no share, so the material falls back to the MR !102 rule | None stated |
| !127-4 | A month with no BOM demand for the material (from 2027-03 in the sample data) uses the share over the whole run | Show that demand under "No brand on record" |
| !127-5 | A week counts in the month its Monday falls in, the same way the heads-up already counts demand | None stated |

**MR !130: per-line invoice amounts and files kept by an earlier version (`73fe2b7a`, BL-75, BL-142).**

| Ref | Call | Alternative |
|---|---|---|
| !130-1 | The Correct-and-resubmit (Fix) panel still takes one total | Per-line amounts there too |
| !130-2 | The invoice total is computed from the lines, so no mismatch can occur | A typed header total checked under the strictest line rule |
| !130-3 | A file is freed on removal only if it was picked in the current edit, from a per-control record of picked files; a file picked and saved while the form stays mounted can still be freed by a later removal | A version-aware record fed by the RFx version-saving code, which edits held RFx pages |
| !130-4 | With no lines selected the total shows "Rp 0" and the note "The sum of the line amounts above." | None stated |

**MR !131: PEX-12 recommended action and PO cancellation request (`b3067dbf`, BL-312).** Every rule has no source: Mba Septi has given neither the thresholds nor the cancellation flow.

| Ref | Call | Alternative |
|---|---|---|
| !131-a | Material class means the SAP material group (`MG-xx`) | Material type (ROH, VERP), which is coarser |
| !131-b | Thresholds are whole percents (0 to 100) of the line's open PO quantity, two keys: `autoAbsorbMaxPct` and `autoCarryMaxPct`; no defaults | A quantity per threshold; not chosen because quantities differ by unit of measure |
| !131-c | Auto absorb needs the FG conditions, a known cap that covers the whole quantity, and the share within the threshold | None stated |
| !131-d | Auto carry-over needs the FS + spread conditions and the share within the threshold; carry-over means spread over the next weeks | None stated |
| !131-e | FS only never recommends auto | None stated |
| !131-f | Cancellation is per PO, not per line; a reason of at least 10 characters is required; a second request is refused while one is waiting and allowed again after the supplier acknowledges; a Closed or Delivered PO is refused | Per PO line |
| !131-g | Only the planner can request (`pocancel:request`) and only the owning supplier can acknowledge (`pocancel:acknowledge`); both verbs are new | None stated |
| !131-h | The request and acknowledge controls sit in the PO On Hold decision cell, one per PO | None stated |
| !131-i | Thresholds are edited in the existing "Edit periods" editor | None stated |
| !131-j | The shared registry files and `docs/contracts/C1-methods.md` were edited (counts: 68 flows, 229 transitions, 62 wired) because the contract test pins them; the files mention RFx but the edits are not RFx logic | None stated |
| !131-k | `scripts/floor.json` was bumped on the gates' note | None stated |

### Builder calls from MR !135, proposed and not ruled (2026-11-13)

**MR !135: PO On Hold marker on system-made call-offs and "Suggest again" for a remainder (`3890c224`, merged to `main` as `18f75ebc` on 2026-11-16, in production since 2026-11-17 01:39 WIB; PEX-8, BL-314, BL-315).** The MR was merged under the owner's GitLab account without a ruling on its four calls: it has no notes, and no ruling is recorded in the documents. Each call below is **[Proposed]**, owner Levi. The list comes from the MR description, which was read in this pass; each call was checked against the code on `18f75ebc`. A change after merge is a small follow-up MR. The MR description says the supplier-seat marker and the button were checked in jsdom tests only. A browser check on a local build of `48030abe` (its `src` is the same as `b87a8af7`, the commit in production) then passed for the marker on both seats, "Suggest again" through rounds 1 to 3, one execution per decision, the 375 px width and the Indonesian strings; dark mode does not apply, because the app has no dark theme. It also found the question in row !135-3a. What is still not checked is in BL-316. **On 2026-11-17 the owner ruled !135-3 and !135-3a** (below); !135-1, !135-2 and !135-4 stay open.

| Ref | Call | Alternative |
|---|---|---|
| !135-1 | A new round restarts the grace period on the hub day, so the supplier can choose again before it runs; the length is the line's grace setting (14 working days by default, PEX-D7; at 0 the round runs at once, with no supplier window, as seen in the browser check) | Run the new round at once, with no supplier choice |
| !135-2 | A planner starts the round with a "Suggest again" button, shown on a line that still has a quantity on hold after its decision executed | The system opens the round at execution time |
| !135-3 | Rounds are not limited, so a round that places nothing (for example an FG cap of 0) can be followed by another. **Ruled 2026-11-17 as proposed** (MR !145 call 3 records the same reading: a round with no room still runs, places 0 and writes a ledger row) | Refuse a repeat of an option that placed nothing, or cap the rounds |
| !135-3a | **Question for the owner, found in the browser check (BL-317):** a call-off an earlier round made does not count against the week's room, so with FS + spread every round spreads the same DA room again and repeated rounds can put a week's call-offs above its DA (sup-007 PK-PETB-8801, week 36: DA 39,300 = 35,000 called off + 4,300 not yet called off; call-offs 35,000 + 3 × 4,300 = 47,900, which is 8,600 above DA). The code does this on purpose, so that the quantity an execution took leaves hold (`poOnHoldReadModel.js:146-149`) | Count an earlier round's call-off against the week's room, and for FG what an earlier round absorbed against the cap. **Ruled 2026-11-17: "Count them: yes, count earlier rounds"**; built in MR !145 (`6772bec9`, merged as `9f637083`), BL-317 closed |
| !135-4 | The "From PO On Hold" marker links to the Feedstock reconcile page, not to the PO On Hold line | A row anchor; the Feedstock reconcile page reads no URL parameter today, so a deep link would be built first |

### Builder calls from MR !145, ruled 2026-11-17

**MR !145: an earlier "Suggest again" round counts against a week's DA room and the FG cap (`6772bec9`, merged to `main` as `9f637083` on 2026-11-17; BL-317; finding D1 of `reviews/VERIFY-135-2026-11-16.md`).** The owner ruled D1 on 2026-11-17 ("Count them: yes, count earlier rounds") and, in the same session, accepted every call below as proposed. The list comes from the MR description. Nothing here is [Proposed] any more.

| Ref | Call (ruled as proposed) | Alternative not taken |
|---|---|---|
| !145-1 | FG counts earlier rounds too: a round's cap left is the formula's cap less what every earlier execution of the same supplier × material absorbed, never below 0 | Leave FG as it was (each round absorbs up to the full cap again), or count only the rounds of the same decision chain |
| !145-2 | The row's `cap` field means the cap left, documented in the read model's typedef (`poOnHoldReadModel.js:59`); no screen shows it | Keep `cap` as the formula's figure and add a `capLeft` field |
| !145-3 | Rounds stay unlimited and a round with no room still runs: it places 0, writes a ledger row with no call-off and no key, closes its decision, and the remainder stays on hold | Refuse a repeat of an option that placed nothing; cap the rounds; do not write an empty execution |
| !145-4 | The pickers still offer an option with no room; the no-room line explains it after the round runs. Follow-up for a pre-send hint: BL-323 | Do not offer an option that has no room |
| !145-5 | "No room left" shows in the planner's read-only preview and in executed rows of both seats; the supplier sees it only on executed rows (no preview before the end of the grace period) | Show it on the "Suggest again" note before sending (BL-323); show it to the supplier during the grace period |
| !145-6 | The wording of the two new strings, EN and ID, built from existing terms (DA, call-off, round, FG cap, "Stays on hold, back to the planner") | Any rewording |
| !145-7 | Every released call-off counts against a week's room, including FS-only call-offs an earlier round made and call-offs of an earlier episode | Count only the spread call-offs |
| !145-8 | The screen keeps the !117 decision-4 reading, so after round 1 "DA not yet called off" still reads 4,300 while the week's room is 0; the question of reversing it is BL-324 | Reverse decision 4 (changes OSPO behaviour) |

**Follow-ups logged on the owner's 2026-11-17 ruling:** BL-323 (show the no-room line before sending) and BL-324 (the decision-4 contradiction on screen).

### PO On Hold browser-check findings (VERIFY-135, D1 to D3), 2026-11-17

**Source:** section 5 of `reviews/VERIFY-135-2026-11-16.md`, found in the MR !135 browser check. D1 was ruled in chat on 2026-11-17 ("Count them: yes, count earlier rounds"); D2's ruling is recorded in MR !147's description the same day; D3 is call !135-4 and has no ruling yet.

| Ref | Finding | Ruling and build |
|---|---|---|
| D1 (BL-317) | With FS + spread, repeated "Suggest again" rounds spread the same DA room again | Ruled 2026-11-17: earlier rounds count. Built in MR !145 (`6772bec9`, merged `9f637083`). |
| D2 (BL-318) | A closed round row read 0 PCS in the PO On Hold column next to "Stays on hold ... 113,400 PCS" | Ruled 2026-11-17, recorded in MR !147's description: the closed row shows the quantity that stayed on hold after that round; hiding the column is not taken. Built in MR !147 (`af252b58`, merged `f3ad2476`). |
| D3 | Closed rounds sit after all live rows, and the marker link lands at the page top | No ruling recorded; carried as call !135-4 (the marker links to the page, not the line) |

### Builder calls from MR !159, !160 and !161, my calls 2026-11-18

**Source:** the MR descriptions. These are the orchestrator's and builders' calls made under the owner's away grant of 2026-11-17/18; none is a ruling. They stay [Proposed] until the owner overrules or confirms them.

| Ref | Call | Alternative |
|---|---|---|
| !159-1 (BL-79) | `/buyer/chase` stays as a `LegacyRedirect` to the follow-up tab | Delete the redirect so old links 404 |
| !159-2 (BL-79) | The two entry links keep `?tab=follow-up` | A bare `/buyer/comm-hub` |
| !160-1 (BL-322) | A clickable card is named by its own content, not the merged (i) name | Point `aria-labelledby` at the whole term label and re-merge the names |
| !160-2 (BL-322) | Hovering the label text no longer opens the tip; only the (i) does | Let the label intercept the pointer |
| !160-3 (BL-322) | The focus ring draws 1px inside the card border | Keep the ring outside by changing the button box |
| !161-1 (BL-284) | LTP = the line's forecast quantity (one demand figure across pages) | LTP = ordered + SOH, which makes the note's equation exact but creates a second LTP |
| !161-2 (BL-284) | SOH = the supplier's share of PTI SOH via the line's period allocation | The CAP-D11 four-week-window share |
| !161-3 (BL-284) | Today's SAP SOH is held for every period (no weekly SOH feed) | Project it with `projectedSoh` |
| !161-4 (BL-284) | A negative gap is shown as it is; no floor at 0 | Floor at 0 |
| !161-5 (BL-284) | The wording of the two supplier sentences and the buyer tip (EN + ID) | Any rewording |
| !161-6 (BL-284) | Without the grant the supplier hover says the figures are shown only for granted materials (the old "not in the data yet" claim is false now) | Keep the old sentence |
| !161-7 (BL-284) | **Open question:** the row's ordered quantity is the gross LTP share, so the hover's gap (13,300) does not equal the cell (34,300). Today's numbers were not moved | Re-derive `forecastQty` so the row equals the gap (changes today's numbers) |

**Follow-ups:** BL-357 (the 7-day rule) awaits the owner. The !161-7 question needs an owner ruling.

## SC Hub Material decisions (decided 2026-09-29)

The owner accepted every recommendation in section 13.2 of `SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md` (MAT-D1 to MAT-D15) on 2026-09-29, and ruled on 6 more points while the material build ran (section 4.1 of `SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md`), recorded here as MAT-D16 to MAT-D21. They sit in section 9 of the requirements. The build is PRs #84 to #93, #97 and #101 to #110, all merged 2026-09-29. Market sources and their grades (A vendor documentation, B standard or regulator, C practitioner guide, D vendor marketing) are in section 17 of the material requirements.

### MAT-D1 · Alert severity scale
**Market practice.** SAP IBP custom alerts use 3 severities, High, Medium and Low, set by thresholds (A); SAP SCC ranks inventory alerts in a fixed 3-step order (A); Oracle ASCP orders exceptions by importance and sorts late ones by days late (A). No 4-level scale and no "stale data" severity was found.

**Decision.** Keep CR-24's High, Medium and Low, and sort each class by days to impact, then supplier name. Replaces the Critical / High / Medium scale proposed in the MOM review. REQ-E08-05 BR-06 to BR-08. Built in PR #87.

**What would change this.** Planners reporting that a High class still buries the alert they must act on first, which would argue for a sub-order other than days to impact.

### MAT-D2 · Where the stock simulation lives
**Market practice.** The market shows projected stock on the main screen: SAP SCC in the collaboration grid (A), Pfizer's supplier guide in the same grid (C). No tool was found that keeps it only in a separate view.

**Decision.** A separate Stock simulation page for the first release, revisited after 3 months of use, so REQ-E08-01 BR-01 ("no separate available figure", from the business users) stands. REQ-E08-08 BR-10. Built in PR #108.

**What would change this.** Planners opening both pages side by side for every decision, or asking for the simulated figure on the stock page, after 3 months.

### MAT-D3 · Name for the manufacturer → distributor leg
**Market practice.** "In transit" means ASNs without goods receipt in SAP SCC and stock that left the issuing plant in S/4 (A); Oracle lists in-transits as a supply type (A). No standard term for the manufacturer → distributor leg was found.

**Decision.** "To distributor". "Incoming" keeps its hub meaning (in production plus in transit, REQ-E08-01 BR-06). REQ-E08-08 BR-10. **Superseded on the supplier view, 2026-11-18 (TL-D43, Q-24):** Incoming becomes In Production; the combined Incoming group label is retired on the supplier stock view. The PTI inventory view keeps its Incoming group.

**What would change this.** Users reading "To distributor" as stock at the distributor rather than on its way there.

### MAT-D4 · Template columns D to F
**Market practice.** SAP SCC keeps supplier manufacturing orders and firm receipts as their own key figures, apart from stock on hand (A). Which quantity columns are required in SAP's or Oracle's upload templates was not found.

**Decision.** In-production quantity (E) required, 0 allowed; completion date (F) required when E is above 0; supplier ROP (D) optional. Amends REQ-E08-02 BR-06. Built in PR #104; the verb enforces it too since MAT-D21.

**What would change this.** Suppliers leaving the upload because they cannot state production, which would show as template rows refused for E or F.

### MAT-D5 · ASN batch when no batches are declared
**Market practice.** SAP SCC ship notices take the batch as a typed field (A); GS1 DESADV carries batch and expiry as optional free text (B). A portal that forces a pick from declared stock was not found.

**Decision.** Free text, marked "not in declared stock", when the supplier declared no batches; a list of declared batches with available quantity when it did. REQ-E07-04 BR-06 to BR-09. Built in PR #89 and #101.

**What would change this.** Typed batches that turn out wrong at goods receipt often enough to justify requiring declared batches for some materials.

### MAT-D6 · Shelf-life rule: which materials, who approves
**Market practice.** BPOM CPKB treats raw and packaging materials together as starting materials with an expiry limit, and has deviations approved by the Head of QC (B). SAP S/4 checks minimum remaining shelf life at goods receipt and can post to blocked stock on error (A).

**Decision.** The rule applies to every shelf-life relevant material, raw material and packaging alike. The exception is approved by Quality (the `compliance` lane, atom `asn:approve-shelf-life`) only, not planning; approved goods are received into blocked stock. Replaces "QA or Material Planning" in the MOM review. **Amended by MAT-D16** on which materials are relevant by default. REQ-E07-04 BR-10 to BR-14. Built in PR #93.

**What would change this.** Exceptions waiting on Quality long enough to delay urgent receipts, which would argue for a named deputy rather than for planners approving their own.

### MAT-D7 · Weekly cycle details
**Market practice.** Oracle lets buyers upload supplier on-hand on the supplier's behalf (A); SAP SCC shows the last customer and supplier updates separately (A). A specific cutoff, holiday rule or all-or-nothing week was not found.

**Decision.** Cutoff Thursday 23:59 WIB, the last working day before it when Thursday is a holiday; a PTI-entered record counts and stays labelled; a week is compliant only when every material was updated. REQ-E08-02 BR-14, BR-15, BR-24. Built in PR #88 and #105.

**What would change this.** Suppliers with many slow-moving materials missing weeks only on those, which would argue for a per-material cadence.

### MAT-D8 · API stale threshold
**Market practice.** EDI 846 practice is daily at minimum (C); SAP SCC alerts on transmission failure, not on data age (A). A published threshold for supplier inventory integrations was not found.

**Decision.** 24 hours (`stale.apiHours`). **Amended by MAT-D17** on what a failed pull does. REQ-E08-02 BR-16. Built in PR #88.

**What would change this.** The 2-hour scheduled pull running (BACKLOG BL-151), after which a shorter limit becomes possible.

### MAT-D9 · How update compliance enters the score
**Market practice.** SAP Ariba SPM and S/4 supplier evaluation let the customer set weights with no defaults (A); changing weights later breaks comparison over time (A, snippet).

**Decision.** A weighted blend: score = (1 − w) × delivery score + w × compliance, w = 0.10, fixed at release; with "No history", w = 0. The weight moves score, grade and band, not the compliance gate (CR-23) or CR-15, which read OTIF. REQ-E08-02 BR-27. Built in PR #105; no fixture supplier changed grade.

**What would change this.** Procurement wanting update discipline to count at award beyond the reason rule (REQ-E03-05 BR-18), which would mean a gate criterion, not a heavier weight.

### MAT-D10 · Open call-offs in the simulation
**Market practice.** Every availability formula found subtracts committed demand: JD Edwards ATP, Oracle projected available balance, SAP SCC projected stock (A).

**Decision.** Show "Already called off, not shipped" and "Free to call off" = Supplier available stock − that quantity, beside Supplier available stock; never merged. REQ-E08-08 BR-07. Built in PR #103 and #108.

**What would change this.** Planners reading only one of the two figures, which would argue for showing one by default.

### MAT-D11 · Capacity used for the simulation's cap
**Market practice.** SAP SCC records upside apart from the commit (A); Oracle ASCP plans on base capacity plus tolerance fences (A).

**Decision.** Allocated capacity only; additional capacity is not counted. REQ-E08-08 BR-04. Built in PR #103.

**What would change this.** Suppliers routinely producing into their additional capacity without being asked.

### MAT-D12 · Where planning groups are mastered
**Market practice.** Oracle masters supplier capacity in the ERP approved supplier list (A); SAP IBP defines aggregated constraints across product groups inside IBP (A).

**Decision.** In the hub now; moved to SAP master data with MDM when the SAP feed runs. REQ-E08-04 BR-18. Built in PR #92.

**What would change this.** MDM agreeing a SAP characteristic for the planning group, after which the hub becomes a copy and its planning-group verbs are turned off.

### MAT-D13 · Direct vs indirect on an event
**Market practice.** SAP Ariba filters eligibility by commodity, and material groups map to commodities (A). An event-level direct / indirect flag was not found.

**Decision.** Derived from the category or purchasing group, mapped once by Procurement; the event shows it and fixes it at publish. Every mapping starts Direct, because all of today's purchasing groups are production materials. CE-12f. Built in PR #109.

**What would change this.** A category that holds both direct and indirect purchases, which a per-category map cannot express.

### MAT-D14 · Vendor drops a level mid-event
**Market practice.** SAP Ariba sets a minimum status for award eligibility (A, snippet); Oracle blocks publish for a not-eligible supplier and lets one eligible with a warning take part (A).

**Decision.** The vendor can still respond, and cannot be awarded until it is back at the level. CE-12g. Built in PR #109; warn-only while the lists are placeholders (MAT-D19).

**What would change this.** A supplier renewing a certificate that misses an award for it, repeatedly, which would argue for a grace period at award.

### MAT-D15 · Documents required per qualification level
**Market practice.** SAP Ariba qualifies before preferring, per commodity and region, with certificates that carry expiry (A); ISO 22716 §6.2 ties purchasing to supplier evaluation, which points to Quality co-owning the requirements (B); halal is mandatory for cosmetics and their raw materials from 17 Oct 2026 (C).

**Decision.** Procurement and Quality define the lists together; blocking for the MR-10 go-live. Recommended starting point: Approved = business licence (NIB), tax ID (NPWP), halal for materials in scope; Preferred = Approved + GMP / ISO 22716 or ISO 9001, and BPOM where applicable. Labelled placeholder lists are in force until then. CE-12d. **Still open** (BACKLOG BL-146).

**What would change this.** A vendor that supplies certified and uncertified categories, which one level per vendor (A-12) cannot express.

### MAT-D16 · Raw materials default to the shelf-life check (build ruling, A2)
**Market practice.** As MAT-D6: CPKB puts an expiry limit on raw materials (B).

**Decision.** A material is shelf-life relevant by default when it is a raw material (ROH) or has a minimum remaining shelf life in master data; packaging without one is not. An administrator can switch any material. Amends MAT-D6's "by master data, never by material type". REQ-E07-04 BR-12. Built in PR #84.

**What would change this.** The SAP material feed showing the minimum maintained for every relevant material, after which master data alone can decide.

### MAT-D17 · API staleness and a failed pull (build ruling, B1)
**Market practice.** As MAT-D8: SAP SCC alerts on transmission failure, not on data age (A).

**Decision.** An API figure is stale only when its last successful pull is older than 24 hours. A failed pull shows "Last pull failed <time>" on the row and does not make the figure stale by itself. Supersedes the REQ-E08-02 edge case "flag them as stale". REQ-E08-02 BR-16. Built in PR #88.

**What would change this.** A failed pull followed by a planner acting on the old figure inside the 24 hours.

### MAT-D18 · Who edits the qualification lists (build ruling, G1)
**Market practice.** As MAT-D15: ISO 22716 points to Quality co-owning supplier requirements (B).

**Decision.** Procurement and Quality: `qualification:manage` sits in both the `procurement` and the `compliance` lanes. Replaces "procurement and the Hub administrator" in MR-10. CE-12d. Built in PR #91.

**What would change this.** One of the two owners changing a list the other disagrees with, which would argue for a second approval on list changes.

### MAT-D19 · Qualification checks while a list is a placeholder (build ruling, G1 and G2)
**Market practice.** Oracle lets a supplier eligible with a warning take part (A).

**Decision.** While a list for the needed level is a placeholder, the invite filter, the publish check and the award check warn ("Not qualified: <missing documents>") and ask for a reason instead of refusing; the warnings are stored. Enforcement switches on by itself when Procurement and Quality save a real list. Holds the build plan's fail-closed rule (AD-8) until MAT-D15 is answered. CE-12g. Built in PR #109.

**What would change this.** MAT-D15 answered, which ends this ruling on its own.

### MAT-D20 · BL-133's LTP-to-capacity join follows planning groups (build ruling, C5)
**Market practice.** None needed; it keeps one grouping for capacity.

**Decision.** The LTP of a planning group is the sum of its materials' LTP; the BL-133 tests changed keys only, and no expected figure, level or refusal changed. REQ-E08-04 BR-16. Built in PR #92.

**What would change this.** Nothing expected; a second capacity grouping would.

### MAT-D21 · In-production enforced by the verb (build ruling, C1)
**Market practice.** As MAT-D4.

**Decision.** The declare and record verb refuses a blank in-production quantity, and one above 0 without a completion date, on manual, template and PTI records; an API pull is exempt, because a supplier ERP may not send it, and the simulation shows it as Missing. Extends MAT-D4 from the form and template to the verb. REQ-E08-02 BR-06. Built in PR #107 (C1b).

**What would change this.** Connected suppliers whose ERP does send production, after which the API exemption could be narrowed per supplier.

---

## BL-81 and BL-84 build rulings (decided 2026-11-17)

### Builder calls from MR !150, ruled 2026-11-17

**MR !150: a forecast commitment is late only after its deadline, and a goods receipt kept open reopens the missing quantity (`614e8400`, merged to `main` as `817a2fd1` on 2026-11-17; BL-81, applying BL-69 and BL-71's reopening answer, both ruled by the owner on 2026-11-02).** The owner accepted all seven calls as proposed on 2026-11-17.

| Ref | Call (ruled as proposed) | Alternative not taken |
|---|---|---|
| !150-1 | Only a short-over line reopens; a shortfall within tolerance (2% or less) and an over-delivery reopen nothing | Reopen any short line, or any discrepancy |
| !150-2 | The whole missing quantity reopens (shipped minus received), not only the part beyond tolerance | Reopen only the part beyond tolerance |
| !150-3 | No second receipt is required: the quantity reopens as soon as the receipt is kept open, derived from the same PO line and material, with no document edited | Require a new receipt before the quantity is available again |
| !150-4 | A receipt still under inspection reopens on the same terms its label already shows | Hold the reopened quantity until the inspection is final |
| !150-5 | The supplier's acknowledgement or dispute does not stop the reopening | Block the reopening while a dispute is open |
| !150-6 | A receipt against a cancelled ASN reopens nothing | Reopen from a cancelled ASN too |
| !150-7 | "Another shipment" is a new ASN against the same PO line; call-off quantities are unchanged | Reopen against the call-off rather than the PO line |

**Follow-up logged on 2026-11-17:** BL-325, the ASN review of the reopening (two receipts against one ASN double the reopen; a receipt whose ASN is not on record reopens a shipment that was never subtracted; a non-numeric `qtyReceived` returns `NaN`; the deep-link seed latches before the receipts read resolves).

### Builder calls from MR !151, ruled 2026-11-17

**MR !151: the accessibility items BL-84 lists (`e62709c2`, merged to `main` as `399bdc91` on 2026-11-17; BL-84, from `BUILD-GAP.md` "Accessibility (BL-31)", needed before UAT per SC-07).** The owner accepted all seven calls as proposed on 2026-11-17.

| Ref | Call (ruled as proposed) | Alternative not taken |
|---|---|---|
| !151-1 | The PTI bell's "3" has no data source; one constant feeds both the badge and its accessible name | Drop the badge until a buyer-notice read exists |
| !151-2 | The supplier bell states "Notifications: 0" when empty | Name the bell without a count below one |
| !151-3 | The sign-in page uses the product name as its h1, and all of its chrome is localized in English and Indonesian | Keep the English-only notice |
| !151-4 | The five pages BL-84 names are closed by retirement (IA P-10), not by heading edits | Restore the pages and fix their heading order |
| !151-5 | `SpecFieldInput` shows "Required"/"Wajib" under an empty required RFQ spec value, so the invalid field has a message | Leave the invalid field with no message |
| !151-6 | The wording `Owner for "{{title}}"` and `Due date for "{{title}}"` | Any other wording |
| !151-7 | Only field-level errors get `aria-describedby`; form-level submit refusals stay `role="alert"` banners | Give form-level refusals a describedby too |

**Follow-up logged on 2026-11-17:** BL-326, the accessibility review of this MR (the gate's invariant 3 checks that `aria-describedby` appears in source rather than that a description renders; and controls whose invalid flag, description or described element does not match what is on screen).

### Builder calls from MR !113, proposed and not ruled (2026-11-10)

**MR !113: raw-material batches and expiry, the Stock page template and the stock simulation (`f543bdff`, merged to `main` on 2026-11-10; BL-289, BL-290 and BL-291, from the owner's stock feedback of 2026-11-10).** The two calls below are [Proposed]: no source settles them and the owner has not ruled.

| Ref | Call | Alternative |
|---|---|---|
| !113-1 | The Stock page's template carries feedstock quantity and date as optional columns K and L, beside "Download template" | Leave feedstock out of the template |
| !113-2 | A blank feedstock date is the upload day | Refuse a blank date, or default it to the period end |

---

## Forecast engine (E14)

These come from `FORECAST-ENGINE-REQUIREMENTS.md`, the in-house engine the owner decided on 2026-09-23 (ENG-1). They are ordered by what blocks the build.
- **Decided:** 9, on 2026-09-23, all as recommended.
- **Open:** 6. None blocks the first build (E14-01 to E14-04 on synthetic data).
- **Research:** `research/FORECAST-METHOD-SPEC.md`.

**Decided 2026-09-23**

### ENG-D1 · Who owns the engine's input data
**Market practice.** In the tools reviewed, the ERP stays the system of record for bills of materials, stock and receipts, and the planning layer reads them on a schedule. SAP Business Network extracts net demand after MRP; E2open writes supplier responses back to the buyer's SAP (`research/FORECAST-BEST-PRACTICE-2026-09.md`, section 5).

**Decision.** The Master Data Management team owns the input data:
- forecast inputs
- the breakdown through the bill of materials
- stock
- ERP master data

The engine runs on a synthetic dataset, labelled simulated and never shown to suppliers, until the team connects SAP. The feed specification is handed over as BL-103; the synthetic dataset is BL-102.

**What would change this.** None expected. The one caution: results on synthetic data prove the calculations, not how much of the low CFOT comes from suppliers not confirming. That waits for SAP data.

### ENG-D2 · Stock-accuracy tolerance
**Market practice.** Cycle counting by ABC class is standard practice. It was not researched in this pass, so no vendor or paper is cited.

**Decision.**
- 2% to start.
- A material over the tolerance is flagged and its recommendations wait for the planner; nothing is blocked outright.
- High-volume packaging is counted most often.
- The tolerance tightens per class after the first counting cycle.

**What would change this.** If the first counts show most materials over 2%, the problem is stock control rather than the threshold, and fixing it comes before trusting the engine's net requirements.

### ENG-D3 · Suppliers see their confirmation rate from day one
**Market practice.**
- Oracle raises an exception when a commit is past due.
- E2open sends missing-response alerts and requires a reason code on "No Commit".
- SCOR measures delivery against the commit date.

**Decision.** Yes. Each supplier sees its own confirmation rate and commitment reliability, plus PTI's plan-change figure for its materials. It never sees another supplier's figures. Showing PTI's own figure keeps the measure fair, since suppliers give worse service to buyers whose plans keep changing (Terwiesch et al. 2005).

**What would change this.** A supplier contract that forbids performance disclosure. None is known.

### ENG-D5 · Service targets for safety stock
**Market practice.**
- Inventory optimisation sizes stock to a service target per item; SAP IBP's multistage safety stock is one example.
- Kourentzes et al. (2020) tuned forecasts for household and personal-care items to a service target. Bias fell by up to 62%.

**Decision.** Fill rate, not cycle service level, tiered:
- 95% for high-volume packaging on production-critical lines
- 90% for the rest
- 85% for slow movers

Until the Material Planner lists the materials in each tier (ENG-D14), the engine assigns them by volume rank.

**What would change this.** If a production line stops for a material in the 85% tier, that material belongs in a higher tier. Keep the tiers; move the material.

### ENG-D8 · Trade-off tolerance band
**Market practice.**
- Quantity-flexibility contracts limit how much each period may be revised per planning cycle, with tighter limits as the period gets closer (Tsay and Lovejoy 1999).
- SAP S/4HANA scheduling agreements attach cost liability to each zone.
- No paper derives 10% as optimal; it is a policy choice.

**Decision.** Two limits:
- ±10% per version (the CR-21 value)
- a cumulative cap from the first value the supplier saw, starting at ±20%

Per-version limits alone let 3 steps of +10% add up to +33%.

**What would change this.** Pilot suppliers asking for a different cap: ENG-D8a is that confirmation.

### ENG-D9 · Plan damping weight
**Market practice.** Godahewa et al. (IJF 2025) show that one weight blending the new forecast with the previous one trades accuracy against stability.

**Decision.** 0.5 in the Trade-off zone and 0 in the Forecast zone, tuned from the backtest.

**What would change this.** The backtest (E14-10) showing a different weight gives better simulated service at the same stability.

### ENG-D4 · Other plants and intercompany transfers
**Market practice.** No sourced benchmark; this is a scope decision.

**Decision (2026-09-23).** Pilot plants only in the MVP; intercompany transfers in Phase 2.

**What would change this.** A pilot material regularly supplied by transfer from another plant. Its requirement would be missed without the transfer in scope.


### ENG-D6 · Cost rates for order sizing
**Market practice.** Standard lot sizing needs three rates: holding cost, ordering cost and the cost of extra space (Wagner–Whitin and the capacitated models in the method spec, M5).

**Decision (2026-09-23).** Finance provides:
- **Holding cost:** % of value per year.
- **Ordering cost:** per order.
- **Rented space:** per pallet per week. Take this from the actual 3PL invoices now.

Until Finance does, the three rates are admin settings with placeholder values, labelled "placeholder — Finance to confirm" on the admin and Order plan pages.

**What would change this.** None. Without these rates, E14-05 cannot weigh rented space against extra orders.


### ENG-D7 · One warehouse capacity or separate
**Market practice.** The capacitated lot-sizing research models capacity per storage resource, and SAP IBP does the same in its optimiser.

**Decision (2026-09-23).** Separate capacity per physical warehouse, in pallets. This matches the owner's slides, which report packaging and raw material separately. A pooled figure would hide the packaging overload behind raw-material space.

**What would change this.** Packaging and raw material actually sharing floor space.


**Still open**

### ENG-D8a · The cumulative cap agreed with pilot suppliers
**Decided (owner, 2026-09-28).** ±20%, as recommended.

**Recommendation.** Run on ±20% and review it with DP Group and Lautan Luas after the first 8 weekly versions, using MASC-I (E14-02).

**What would change this.** Suppliers needing a tighter cap to hold capacity. A tighter cap then needs a stronger reason rule on PTI's side.

### ENG-D10 · Forecast grain
**Decided (owner, 2026-09-28).** Sell-in for now, own brands only. OEM products are planned from the brand's POs (ENG-D20).

**Market practice.** Forecasting shipments (sell-in) and using sell-out as a leading signal is common practice for manufacturers. Not sourced in this pass.

**Recommendation.** Weekly sell-in per SKU, with sell-out as an input where it exists. Channel split later.

**What would change this.** Sell-out data covering most volume and arriving weekly. It would then earn a larger role.

### ENG-D11 · Who reviews the forecast
**Decided (owner, 2026-09-28).** The Material Planning team reviews the forecast before it drives material plans.

**Market practice.** Forecast value added (FVA) measures each step and its owner (Gilliland). A 15-year study found large upward overrides made forecasts 26% worse (Fildes and Goodwin 2021).

**Recommendation.** Demand Planning owns the finished-goods forecast and the Material Planner owns the material plan. Every override needs a reason code (E14-11).

**What would change this.** No Demand Planning team in place. The Material Planner then owns both, and FVA reports per person.

### ENG-D12 · Promotion calendar
**Decided in part (owner, 2026-09-28).** Marketing owns it; the owner fills it in for them meanwhile. How far ahead it is fixed stays open (ENG-D12a).

**Market practice.**
- Modelling promotions explicitly cut promotion forecast error by up to 30% (Trapero et al. 2015).
- Every M5 winner used promotion inputs.

**Recommendation.** Marketing owns the calendar. A promotion is fixed at least the supplier lead time plus the production lead time before it starts; a later change triggers the band check (E14-06).

**What would change this.** Promotions that are routinely decided inside that window. The engine can then only react, and the buffer must carry them.

### ENG-D13 · Plan-stability limit for choosing models
**Market practice.** Judge models on service and stability, not accuracy alone (Chin et al. 2026; Godahewa et al. 2025).

**Recommendation.** Set it after the first backtest, from the spread observed. Do not pick a number now.

**What would change this.** Not applicable until the backtest runs.

### ENG-D14 · Materials per service tier
**Decided (owner, 2026-09-28).** Keep the volume ranking.

**Recommendation.** The Material Planner names the production-critical packaging for the 95% tier. Until then the engine uses the top 20% of materials by volume, marked as a default.

**What would change this.** Volume rank and criticality diverging. A low-volume component on a bottleneck line belongs in the top tier.

### ENG-D23 · BL-286 is display only: the forecast keeps the Comb (decided 2026-11-10)
**Decision.** Levi ruled on 2026-11-10 that BL-286 shows each SKU's chosen model and does not apply it. The Demand forecast page keeps its numbers on the Comb and names the model the backtest (Forecast → Model backtest) chose for the SKU, marked simulated. This confirms the 2026-09-29 acceptance that material planning is not switched on synthetic evidence (ENG-B66) and ENG-B89 (the engine beats SAP's plan on fill rate and space for 0 of 16 SKUs). `ForecastMethod`, the reconciliation and the override baseline are unchanged. Built on branch `feat/bl286-chosen-model`.

**Alternative not taken.** Switching the page's numbers to the chosen model per SKU (Theta for 11, Comb for 5 on the synthetic data), which needs a Theta value in `ForecastMethod` and moves the reconciliation and the override baseline; or parking BL-286 until real data (BL-100).

**What would change this.** A backtest on real sales and SAP plans (BL-100) showing the chosen models beat SAP's plan, and the owner ruling the switch (ENG-B66, ENG-B89).

### ENG-D24 · The chosen model shows in the SKU detail panel only (decided 2026-11-10)
**Decision.** Levi ruled on 2026-11-10 that the line sits in the SKU detail panel, under the method text, with a link to Forecast → Model backtest (`/buyer/model-backtest`). The SKU list and its agreed "Method" column (glossary `dfMethod`) do not change. Four accepted build rules go with it: a SKU the backtest does not compare (new SKU, OEM, discontinued; ENG-B81) shows no line; a slow SKU (SBA, Croston, TSB) gets the same line with its chosen model's name; a planner override does not change the line; and the panel reads the backtest through `useModelBacktest`, so while it loads the line is absent and the rest of the page does not wait.

**Alternative not taken.** A second pill under the Method pill in the list, or a new "Backtest pick" column. Both show every mismatch at a glance; both change an agreed column or add one.

**What would change this.** The Material Planner saying the mismatch must be visible without opening each SKU.

### ENG-D25 · The line names the chosen model and says the forecast still uses the Comb (decided 2026-11-10)
**Decision.** Levi ruled on 2026-11-10 for English "Backtest’s chosen model: **Theta** (simulated). This forecast still uses the Comb." and Indonesian "Model terpilih backtest: **Theta** (simulasi). Prakiraan ini tetap memakai Comb." When the chosen model is the method in use (the Comb for 5 SKUs on the synthetic data), the second sentence reads "This forecast uses the same model." / "Prakiraan ini memakai model yang sama." (accepted with the ruling). "Chosen model" / "Model terpilih" is Model backtest's agreed label; no agreed label is renamed. Keys `df.detail.backtest.*` in `src/lib/i18n/demandForecast.js`.

**Alternative not taken.** "Backtest picks: Theta (simulated)" (a new phrase that does not say the numbers stayed) and "Chosen model: Theta" (reads as if the forecast used Theta).

**What would change this.** The Material Planner choosing other wording, or ENG-D23 being reversed.

### ENG-D26 · BL-287: judging overrides by service is deferred (decided 2026-11-10, approved 2026-11-11)
**Decision.** Levi ruled to defer BR-04 (`FORECAST-ENGINE-REQUIREMENTS.md`, REQ-E14-11). The replay of PTI's ordering exists (BL-112). Two facts block it instead. The override ledger is held for the session and a reload clears it (ENG-B106). The synthetic data has no override history. BL-287 is built once overrides persist (BL-299, ENG-D27) and 13 weeks of them have sold, the window of the review flag (ENG-B108). The 2026-09-29 acceptance of BR-04 as a follow-up stands; only its timing changes.

**Alternative not taken.** Build now, testable only with injected overrides. Or drop BR-04 and judge by accuracy only, which would reverse the 2026-09-29 acceptance.

**What would change this.** The Material Planning team entering overrides in the pilot on a saved ledger, or the owner wanting the replay proven on injected overrides before the backend exists.

### ENG-D27 · Saving the override ledger is backend work (decided 2026-11-10, approved 2026-11-11)
**Decision.** A row in `BACKLOG.md` section 3, work waiting on the backend: BL-299, persist the forecast override ledger. Size M, proposed; IT (TEAM-03) sizes it. No row covered it before.

**Alternative not taken.** Browser storage now (size S). It would reverse ENG-B106, and history in one planner's browser is not team history, so BR-04 still could not run on it.

**What would change this.** IT specifying the backend with the ledger included, or sizing it differently.

### ENG-D28 · The Forecast bias service note gives the true reason (decided 2026-11-10, approved 2026-11-11)
**Decision.** The note under "Override value by month" said the replay "is built separately", which stopped being true when BL-112 was built. It now reads: "Judging overrides by service, not accuracy alone, starts once overrides are saved and 13 weeks of them have sold. Until then they are judged by accuracy only." The Indonesian text says the same. Built in GitLab MR !120 (`372a074b`). The key `fb.fva.service`, the test id and every agreed label stay.

**Alternative not taken.** Keep the note, which leaves a false reason on the page. Remove it, which hides the deferral from planners.

**What would change this.** BL-287 being built; the note is then replaced by the service result.

## Sources

Market practice above draws on these, read 2026-09-21, plus the vendor research already recorded in section 8 of the requirements:

- [3-way matching tolerances in accounts payable](https://www.procurify.com/blog/what-is-three-way-matching/) and [Microsoft Dynamics 365 invoice matching validation](https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/tasks/set-up-accounts-payable-invoice-matching-validation) — tolerance ranges and defaults
- [Three-way matching tolerances that work](https://www.dynamicsdad.com/post/three-way-matching-decoded-po-receipt-and-invoice-tolerances-that-actually-work) — percentage versus absolute caps
- [OTIF meaning, benchmarks and best practice](https://redstagfulfillment.com/on-time-and-in-full-otif/) and [OTIF formula and benchmarks](https://www.linenow.co/blog/glossary/on-time-in-full) — delivery windows, the 95% benchmark, retailer penalties
- [On-time delivery and the 98% benchmark](https://www.symestic.com/en-us/what-is/on-time-delivery-otd) — measurement grain
- [Frozen zone, slushy zone and time fences](https://www.erp-information.com/frozen-zone.html) and [the frozen planning period](https://www.brightworkresearch.com/frozen-period/) — zone lengths tied to lead time
- RFx practice (RFX-D1 to RFX-D5): `research/RFX-BEST-PRACTICE-2026-09.md`, summarised in section 8.3 of the requirements, including the [SAP Ariba Event Management API guide](https://help.sap.com/doc/7b8bf5aa499341489687038610fa0bea/cloud/en-US/f342574f194c4af6a24a42087a665607.pdf), [Oracle negotiation types](https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/negotiation-types.html) and [Ariba manual award scenarios](https://learning.sap.com/courses/project-monitoring-and-event-administration-within-sap-ariba-guided-sourcing/creating-manual-award-scenarios-to-award-guided-sourcing-events)
- Forecast engine (ENG-D1 to ENG-D14): `research/FORECAST-METHOD-SPEC.md` and `research/FORECAST-BEST-PRACTICE-2026-09.md`, which cite Terwiesch et al. 2005, Tsay and Lovejoy 1999, Kourentzes et al. 2020, Godahewa et al. 2025, Fildes and Goodwin 2021, Trapero et al. 2015, Chin et al. 2026, and the SAP, Oracle and E2open documentation
- [SAP over- and under-delivery tolerances](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/over-delivery-under-delivery-tolerances/ba-p/13522481) and [applying tolerances and the delivery completed indicator](https://learning.sap.com/courses/inventory-management-and-physical-inventory-in-sap-s-4hana/applying-tolerances-and-the-delivery-completed-indicator) — where tolerances are held and how goods receipt checks them
