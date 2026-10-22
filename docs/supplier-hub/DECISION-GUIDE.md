# Supplier Hub: recommendations for the open decisions

| | |
|---|---|
| Version | 1.13, 2026-10-22 (INV-D12, INV-D13 added: accepted capacity and the alert; 1.12 added RFX-D26 to RFX-D31 and INV-D1 to INV-D11) |
| Covers | BL-01 to BL-19b in `BACKLOG.md` — the 21 decisions that block or confirm work; the RFx decisions RFX-D1 to RFX-D5 (2026-09-21) and RFX-D6 to RFX-D14 (2026-09-25) and RFX-D15 (2026-09-28) and the RFx UX decisions RFX-D16 to RFX-D24 (2026-10-19) and RFX-D25 (2026-10-20) and RFX-D26 to RFX-D31 (2026-10-22); the Inventory & Capacity UX decisions INV-D1 to INV-D13 (2026-10-22); the SC Hub Material decisions MAT-D1 to MAT-D15 and the build rulings MAT-D16 to MAT-D21 (2026-09-29); and the 15 forecast engine decisions ENG-D1 to ENG-D14 with ENG-D8a (2026-09-23) |
| Purpose | Give the project owner a defensible recommendation to take to each owner: what the market does, what we suggest for PTI, and what would change our mind |
| Status | **18 of the 21 were decided on 2026-09-21**, mostly as recommended; the outcomes are in section 9 of the requirements and in the Closed section of `BACKLOG.md`. Still open: BL-01 REPL, BL-11 interface technology, BL-12 call-off record, and three values (BL-54 invoice cap, BL-55 gate OTIF minimum, BL-56 early allowance). Where the owner decided differently from this guide — the hub keeps its own calendar (BL-14), capacity stays at 13 weekly buckets (BL-08), Web Tukar Faktur stays separate (BL-17), and TMS access becomes a 3PL tracking link (BL-03) — the decision stands and this guide is kept as the reasoning behind the others. All decided items are built and in production as of 2026-09-21 (BL-43 to BL-53). The builds raised six new questions, BL-66 to BL-71 in the backlog, which this guide does not yet cover |
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

---

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

**Decision.** "To distributor". "Incoming" keeps its hub meaning (in production plus in transit, REQ-E08-01 BR-06). REQ-E08-08 BR-10.

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
