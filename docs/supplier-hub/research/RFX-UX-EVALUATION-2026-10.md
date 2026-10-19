# RFx Management: UX evaluation, buyer and supplier (2026-10)

- **Checkout evaluated:** `main` at `6cba31b5` ("Merge MR !6: DRC wave 3"), after fast-forwarding the local checkout from `748d595e`.
- **How it was run:** `npm run build` (Node 22.23.2) passed, then `vite preview` through the `portal-aliases` launch configuration on port 5320. Viewport 1440×900. Demo session "PTI" with the identity menu's "Menu for" set to **Buyer** (the menu offers Material Planner, Buyer, Finance and All PTI roles; there is no option called Procurement). Supplier pages opened with the sidebar persona toggle set to Supplier, which signs in as sup-007, PT Sample Packaging Indonesia. Language checked in English, with one pass in Bahasa Indonesia on the RFQ board, the RFQ event page and the supplier RFQ page.
- **What was done in the session (mock stores, reset on reload):** RFI-2026-004 created and sent; RFI-2026-002 answered by the supplier and closed; RFQ-2026-901 created, published and quoted; RFQ-2026-021 quoted, taken through negotiation round 1, awarded 60/40 and marked for SAP; RFP-2026-003 answered, closed, taken through firm-offer round 1 and awarded. The RFP wizard was not opened (see flow trace 3).
- **Prior state:** `RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md` sections 2 and 3 (F-01 to F-16), `BUILD-GAP.md` RFx rows, `SCENARIOS.md` UC1, `BACKLOG.md`. A finding that repeats an F or BL item names it.
- **Evidence format:** `file:line` paths are relative to `paragon-supplier-portal/src/`. "Screen" means the route as rendered in the preview on 31 Aug 2026, the hub's declared present.
- **Known complaints slot:** none supplied. Severity therefore rests on what a first-time user meets on screen.

---

## 1. VERDICT

**Buyer:** a buyer can run an RFI, RFQ or RFP end to end, but every event lives on one very long page or inline block with no stage indicator, and the two commits that matter most (close, award) fire with no confirmation.

**Supplier:** a supplier can answer, quote, revise and read an outcome, but the forms lose work and hide what is missing, and the award is shown three ways that disagree.

1. **Work is lost silently.** A failed send on the RFP form followed by a navigation threw away a 35-field proposal; no autosave, no leave guard exists anywhere in the RFx forms (`SupplierRfp.jsx:89-98`; no `beforeunload` or route blocker in `src/`).
2. **The RFQ event page runs about 8 screens** from invitees to the award panel with no section navigation; the only anchor is the board footer's `?section=award` (`BuyerSourcingEvent/index.jsx:142-147`).
3. **Two award views contradict each other.** "Awards & history" lists RFQ-2026-021 as both Awarded and Not Awarded, dated with the award deadline and valued at the first quote's total (`SupplierRFQs/utils.js:134-147`), while the rounds page says "Your share: 60%".
4. **The RFQ wizard publishes terms the buyer never chose.** The draft default `incoterms: 'CIF Jakarta'` (`BuyerSourcing/utils.js:281`) is not among the Terms step's five options (`WizardTermsStep.jsx:13`), so the select shows FOB while CIF Jakarta is saved and reaches the supplier card.

---

## 2. SCREEN MAP

| # | Persona | Route | First-time guess | What it actually does | State shown | Next action shown | Who acts next |
|---|---|---|---|---|---|---|---|
| 1 | Buyer | `/buyer/home` My tasks | Inbox | Lists tasks incl. "Sourcing events ready to award 16" | Urgent / due soon | Open | Buyer |
| 2 | Buyer | `/buyer/rfi` list | Table of RFIs | 4 rows: number, deadline, template, responses; row button "Answer" | Open / Draft / Closed pills | Answer / Open the event; New information request | Buyer |
| 3 | Buyer | `/buyer/rfi` inline detail | Event page | Card with Close the event, Create proposal request, Save as template, invitee table, answers grid, documents | Pill only, no deadline in header | Close the event; Create quotation request (table footer) | Buyer or supplier, not stated |
| 4 | Buyer | RFI wizard (5 steps) | Form | Scope, Questions (library), Invitees (filters), Documents, Review | Step stepper | Next; Save draft; Send to suppliers | Buyer |
| 5 | Buyer | `/buyer/rfq` board | Pipeline | 4 KPI tiles, 5 status tabs, category filter, 26-row table, awards history | Status column, days remaining | Row click opens side panel; New RFQ; Templates | Buyer |
| 6 | Buyer | RFQ side panel | Event summary | Links, supplier responses, clarifications, summary, lifecycle actions, timeline, legacy quote comparison, award link | Status, "NEXT Your move" | Publish / Cancel / Edit draft; Export comparison; footer "Award RFQ" | Buyer |
| 7 | Buyer | RFQ wizard (8 steps) | Form | Scope, Items, Breaks, Options, Suppliers (AI recommendation), Terms, Documents, Review | Step stepper | Save RFQ draft only | Buyer |
| 8 | Buyer | `/buyer/rfq/:id` event page | Event page | Response window, items and spec, bid comparison, per-item comparison, documents, negotiation rounds, award panel, award records | Status pill, deadline, "Updates 92%" pills | Extend; Open the round; Award the event; Cancel award; Mark raised in SAP | Buyer |
| 9 | Buyer | `/buyer/rfp` list | Table of RFPs | 4 rows; row button "Compare proposals" even with 0 proposals | Open / Draft / Closed, Confidential | Compare proposals; New proposal request | Buyer |
| 10 | Buyer | `/buyer/rfp` inline detail | Event page | Scope, T&C, extend, template, invitee table with acceptance columns, term comparison, prices by option, firm-offer rounds, award, Create RFQ from this RFP, questions, documents | Status pill | Close the event; Ask for firm offers; Create RFQ; Award the event | Buyer |
| 11 | Supplier | `/supplier/home` To do | Inbox | 17 task rows; RFx rows are 10th, 14th, 15th, 16th | Urgent / due soon | Open | Supplier |
| 12 | Supplier | `/supplier/rfi` | List | 3 rows: number, title, deadline, response pill, "Answer"; detail opens inline | Not started / Submitted | Answer | Supplier |
| 13 | Supplier | `/supplier/rfi` form | Questionnaire | Scope, PTI documents, 11 questions each with a Description box, documents, Save draft, Send answers | Draft hidden notice; version line after send | Send answers; Revise response | Supplier |
| 14 | Supplier | `/supplier/rfq` Open events | Invitations | 3 KPI tiles, 3 tabs, one card per RFQ with items, breaks, evaluation bar, intent, quote entrance, clarifications | Days to deadline pill, Confidential | I will respond / Decline / Submit quote / Ask question | Supplier |
| 15 | Supplier | RFQ quote drawer | Form | Step 1 prices per item and break, spec fields, one-time costs; Step 2 validity, questions, sample, notes, documents | Refusal line at top | Submit quotation | Supplier |
| 16 | Supplier | `/supplier/rfq` My Quotes, Awards & history | History | Quote cards with derived unit price; award table and win rate | Submitted / Under Review / Rejected; Awarded / Not Awarded | Revise quote | Buyer |
| 17 | Supplier | `/supplier/rfq/rounds` | Unknown ("Revised quotes") | One block per open round with prefilled prices; award outcomes per item below | Revised / Not revised, deadline | Send the revised quote | Supplier |
| 18 | Supplier | `/supplier/rfp` | List | 3 rows; detail opens inline: confidentiality gate, T&C gate, term grid, other terms, questions, prices, sample, timeline, validity, documents; firm-offer form and award outcome under the row | Submitted pill stays after award | Answer; Send proposal; Send firm offer | Supplier |

---

## 3. FLOW TRACE

### 3.1 RFI (reached Closed)

1. Buyer · RFI wizard, Scope: "The response deadline must be a date in the future" shows before anything is typed.
2. Buyer · Questions, Invitees, Documents: clean, though the modal shrinks on Documents so Next moves.
3. Buyer · Review: dates read `2026-09-30`, invitees read "1 selected" with no name; Save draft sits in the body and Send to suppliers in the footer.
4. Buyer · Send to suppliers: clean; lands on the new event with a toast.
5. Supplier · To do shows "Information requests to answer" as the 14th row; `/supplier/rfi` rows show a date but no days left.
6. Supplier · RFI-2026-002 form: PTI's brief reads "not available in this session"; every question carries an extra Description box; Send answers stays disabled with one bottom line and no field marked.
7. Supplier · Send answers: clean; version line and Revise response appear.
8. Buyer · `/buyer/rfi` row "Answer": the detail opens below the fold; the row now reads "Close" beside "Close the event".
9. Buyer · Close the event: fires at once, no confirmation; event Closed.

### 3.2 RFQ (reached Awarded, marked for SAP)

1. Buyer · New RFQ, Scope: UOM defaults to KG for a packaging item.
2. Buyer · Breaks: empty; the Scope quantity is not offered as the first break.
3. Buyer · Terms: select shows FOB; Review shows CIF Jakarta.
4. Buyer · Review: only "Save RFQ draft"; the toast then says publish from the board.
5. Buyer · Board row → side panel → Publish RFQ: clean, second step.
6. Supplier · Card RFQ-2026-021: "I will respond" first, then Submit quote; the legacy cards beside it offer Submit quote directly.
7. Supplier · Quote drawer: about 30 fields; empty submit returns one refusal at the top ("Give every item a lead time", then "A sample offer states its ready date") while the field is far below; the sample date is asked twice.
8. Supplier · Submit quotation: clean; My Quotes shows "Unit price Rp 519,58".
9. Buyer · Event page → Negotiation rounds, 5 screens down: Open the round opens while the response window is still open, no warning.
10. Supplier · Round found only through the "Revised quotes (negotiation rounds)" text link or To do; the card itself shows nothing.
11. Supplier · Send the revised quote: clean; prefilled.
12. Buyer · Close the round → shares 60/40 → "Award the event" stays disabled with only "0% of 100%" as a hint until shares and the reason are in; then it records at once, no confirmation.
13. Buyer · Mark raised in SAP: clean; SAP number field inline.
14. Supplier · Awards & history: RFQ-2026-021 appears twice, Awarded and Not Awarded; rounds page shows the 60% share.

### 3.3 RFP (reached Awarded; creation step not exercised)

1. Buyer · New proposal request: not opened. RFP-2026-003 from the fixtures was used; the wizard is the same component family as the RFI's (`rfx/RfpCreateWizard.jsx`).
2. Supplier · `/supplier/rfp` Answer → confidentiality gate → T&C tick and "Accept and continue": two gates in sequence; the form is visible and editable before the T&C is accepted.
3. Supplier · Form: sample is a checkbox, so "no" cannot be said; the development timeline is asked as a question and again as "Timeline"; one failed send plus a navigation lost everything.
4. Supplier · Send proposal (second attempt): clean.
5. Buyer · RFP detail: comparison grid plus two forward paths, "Firm-offer rounds (once closed)" and "Create an RFQ from this RFP", with no rule for which applies.
6. Buyer · Close the event → Ask for firm offers → options, points, supplier, deadline → Open the round: clean.
7. Supplier · Firm-offer form shows under the RFP row without expanding it: clean.
8. Supplier · Send firm offer: clean.
9. Buyer · Close round → 100% per option → reason → Award the event: records at once, no confirmation.
10. Supplier · RFP row still reads "Submitted"; "Your award outcome" sits inside the card.

---

## 4. FINDINGS

### 4.1 Buyer

- **B-01** · Major · high · Consistency, language and visual hierarchy · `/buyer/rfq/:id`
  Evidence: 5 scrolls of 10 ticks from Response window to Award on RFQ-2026-021; no in-page nav; only anchor is `?section=award` (`BuyerSourcingEvent/index.jsx:142-147`).
  Problem: a first-time buyer cannot see where the event stands or where the award lives; the comparison summary, per-item tables, documents, rounds and award read as one undifferentiated scroll.
  Recommendation: add a stage bar (Sent → Quotes in → Round → Award → Raised in SAP) and a sticky section nav with counts; fold the per-break tables behind the summary. See proposal B-01 and mockup `B-01-rfq-event-page.html`.

- **B-02** · Major · high · Evaluation and comparison · `/buyer/rfq` side panel
  Evidence: the panel carries links, responses, clarifications, summary, lifecycle actions, timeline and a legacy "Quote comparison (2 quotes)" scored at the 3,000 break, then "Compare by break on the event page" (`RfqSidePanel.jsx:101`, `QuoteComparison`).
  Problem: two evaluation surfaces for one RFQ; the buyer does not know which is authoritative, and the panel scrolls almost as far as the event page.
  Recommendation: make the panel a summary (status, next step, responses, 3 links) and keep every comparison on the event page.

- **B-03** · Major · high · Event authoring · RFQ wizard Terms and Review
  Evidence: default `incoterms: 'CIF Jakarta'` (`BuyerSourcing/utils.js:281`); options are FOB, CIF, EXW, DDP, FCA (`WizardTermsStep.jsx:13`); Review showed "Incoterms CIF Jakarta" and the supplier card "Delivery terms: CIF Jakarta" after FOB was displayed.
  Problem: the select misrepresents the saved value; the published RFQ carries a term the buyer never saw.
  Recommendation: seed the draft with a value from the option list, or add "CIF Jakarta" to it; show the Review row in red when the value is outside the list.

- **B-04** · Major · high · Work queue and wayfinding · `/buyer/rfq` board
  Evidence: default tab "All 26" opens with six Closed sample events first; `useRfqBoard.js:65-75` filters, never sorts; Draft rows have no tab; "Ready to award 4" tile is not a filter.
  Problem: the buyer scans 26 rows to find the 2 that need action.
  Recommendation: default to a "Needs my action" view ordered by next deadline, make the KPI tiles filter the table, and add a Draft tab.

- **B-05** · Major · high · Status, feedback and state · RFI/RFP detail, RFQ award panel
  Evidence: "Close the event" dispatches on click (`BuyerRfi.jsx:395`); "Award the event" recorded aw-0003 on click with only a toast; no confirm step in `AwardSection.jsx`.
  Problem: an event closes and an award is recorded with no restatement of what will happen to suppliers; the cancel-award verb exists but is a recovery, not a check.
  Recommendation: a confirmation sheet for close, cancel and award that lists the suppliers affected, the shares and the reason, then "Record the award". See mockup B-01.

- **B-06** · Major · medium · Event authoring · `/buyer/rfp` detail
  Evidence: RFP-2026-003 with 0 proposals showed scope, T&C, invitees and "No proposals received yet" twice; the 6 terms and 5 options appeared only after a proposal arrived (`BuyerRfp/components/RfpComparison.jsx` renders terms as a comparison grid).
  Problem: the buyer cannot review what was sent until someone answers. Confidence medium: the terms may be reachable through Edit draft on a Draft, not checked on an Open event.
  Recommendation: render the term list and option list on the detail from publish onward, with the supplier columns added as proposals arrive.

- **B-07** · Major · high · Rounds · `/buyer/rfp` detail after close
  Evidence: "Firm-offer rounds · Firm offers can be asked once the RFP is closed" and "Create an RFQ from this RFP … Indicative prices are not carried over" sit one card apart with no rule stated.
  Problem: RFX-D4/D6 decide this (full-service and ODM settle in the RFP; otherwise an RFQ), but the screen leaves the buyer to guess, and both paths stay open after an award.
  Recommendation: one "Firm up prices" block with two labelled choices and a one-line rule for each; hide "Create RFQ" for options already awarded.

- **B-08** · Minor · high · Consistency, language and visual hierarchy · RFI/RFP list rows
  Evidence: buyer row button "Answer" (`BuyerRfi.jsx:208`, `rfx.js:79`); RFP row "Compare proposals" at 0 proposals (`rfx.js:193`); row "Close" (collapse) beside "Close the event" (lifecycle) on the same screen.
  Problem: "Answer" is the supplier's verb; "Close" means two things 300 px apart.
  Recommendation: row button "Open"; "Collapse" for the toggle; "Compare proposals" only when at least one proposal exists.

- **B-09** · Minor · high · Visual hierarchy · RFI/RFP detail placement
  Evidence: clicking a row renders the detail below the 4-row table, starting under the fold at 1440×900.
  Problem: the first click appears to do nothing beyond relabelling the button.
  Recommendation: open the detail on its own route (as the RFQ already does) or scroll it into view and collapse the list.

- **B-10** · Minor · high · Work queue and wayfinding · RFI/RFP detail actions
  Evidence: "Create a proposal request from this" in the header card, "Create a quotation request from this" in the invitee table footer beside "Extend the deadline", "Save as a template" with a prefilled input on every detail; invitee table titled "Invite suppliers" on a live event where nobody can be added (`rfx.invite.title`).
  Problem: next-step actions are scattered and a rarely used action takes prime space.
  Recommendation: one actions row (Close, Extend, Create RFQ, Create RFP, Save as template as a menu item); rename the table "Invited suppliers".

- **B-11** · Minor · high · Event authoring · RFI wizard
  Evidence: deadline refusal visible before input (`RfiCreateWizard.jsx:453-455`); Review shows `2026-09-30` where lists show "06 Sept 2026"; "Invited suppliers: 1 selected"; the modal shrinks on the Documents step so Next moves.
  Problem: small frictions that make the wizard feel unfinished on first use.
  Recommendation: validate on blur, format dates with `formatDate`, list invitee names, fix the modal height.

- **B-12** · Minor · medium · Event authoring · RFQ wizard
  Evidence: Breaks step opens empty although Scope asked for a total quantity; UOM defaults to KG (`BuyerSourcing/utils.js:277`); Review offers "Save RFQ draft" only while the RFI and RFP wizards offer "Send to suppliers"; the AI recommendation panel exists only in this wizard's Suppliers step.
  Problem: the three wizards behave differently for the same job.
  Recommendation: seed the first break from Scope, pick UOM from the category, add "Save and publish" to the Review step, and offer the recommendation panel in all three invitee steps or none.

- **B-13** · Minor · high · Status, feedback and state · `/buyer/rfq` board header
  Evidence: no "As of" line (RFI and RFP pages have one); meta reads "last updated 03 Sept 2026" while the hub's present is 31 Aug 2026; tiered RFQs show "—" under Est. value.
  Problem: the buyer cannot tell what date the day counts are relative to.
  Recommendation: use the same "As of" meta line as the other RFx pages; compute an estimate from the first break for tiered RFQs or drop the column.

- **B-14** · Minor · high · Cognitive load · RFQ event page and award panel
  Evidence: "Not qualified (placeholder rules) · Is Registered; this Direct event needs Preferred. Missing: …" printed for each supplier in the response window and again under each award item (3 times per supplier on RFQ-2026-021).
  Problem: the same two lines of warning fill a third of the award panel.
  Recommendation: show the pill everywhere and the explanation once, in the invitee table, with a tooltip elsewhere.

- **B-15** · Minor · medium · Rounds · RFQ event page
  Evidence: round 1 opened with deadline 05 Sept while the response deadline was 09 Sept; status stayed "Open"; the side panel's NEXT read "Your move" with two invitees still "Will respond".
  Problem: the stage of the event is ambiguous to a first-time buyer.
  Recommendation: state the stage explicitly ("Collecting quotes · round 1 open") and warn when a round opens before the window closes.

- **B-16** · Polish · high · Consistency, language · round and send labels
  Evidence: "Close the round" on the RFQ (`rfx.js:318`) and "Close round" on the RFP (`rfx.js:495`); "Send to suppliers" for RFI and RFP, "Publish RFQ" for the RFQ.
  Problem: three verbs for one act.
  Recommendation: "Send to suppliers" and "Close the round" everywhere, in both languages.

### 4.2 Supplier

- **S-01** · Blocker · high · Supplier response · `/supplier/rfp`, `/supplier/rfi`, RFQ quote drawer
  Evidence: RFP-2026-003 proposal (6 terms, 3 answers, 8 prices, validity) lost after one refused send and a navigation; drafts live in component state (`SupplierRfp.jsx:89-98`, `SupplierRfi.jsx` draft state); no `beforeunload`, `useBlocker` or autosave in `src/pages-v2`.
  Problem: a supplier who follows a To do link or a toast loses a long form; the "Save draft" button is the only protection and nothing prompts it.
  Recommendation: autosave the draft on change, show "Saved 19:04" by the title, and block navigation with a prompt while unsaved. See mockup `S-01-supplier-response-form.html`.

- **S-02** · Major · high · Supplier response · RFI form, RFQ quote drawer, RFP form
  Evidence: RFI shows one line "Answer every required question before sending" with Send disabled and no field marked (`RfxQuestionForm.jsx:81-83,103` marks invalid, not missing); the quote drawer shows one refusal at a time at the top ("Give every item a lead time in whole days. (item 1)", `TieredQuoteForm.jsx:136,379`) while the field is 4 screens down; the RFP form lists 3 generic lines.
  Problem: the supplier hunts for what is missing on forms of 20 to 35 fields.
  Recommendation: inline error under each missing field, a jump list at the top naming the fields, all refusals at once. See mockup S-01.

- **S-03** · Major · high · Award and outcome · `/supplier/rfq` Awards & history
  Evidence: RFQ-2026-021 listed twice, "Awarded" and "Not Awarded", both dated 16 Sept 2026 (the award deadline) with contract value Rp 24.940.000 (the first quote's total), because rows are built per quotation version (`SupplierRFQs/utils.js:134-147`); win rate "1 of 3 decided RFQs" counts the same RFQ twice (`AwardsTab.jsx:93`); the rounds page shows the real outcome, "Your share: 60%".
  Problem: the supplier's record of what it won is wrong on the page named for it.
  Recommendation: one row per event from the award record (share, quantity, break, award date), superseded versions excluded; drop the win rate until it counts events. See mockup `S-03-supplier-rfq-workspace.html`.

- **S-04** · Major · high · Award and outcome · To do, `/supplier/rfq`, `/supplier/rfq/rounds`, `/supplier/rfp`
  Evidence: after the RFQ and RFP awards the To do carried no award row and the bell no new item; outcomes appear in three places (Awards & history tab, the "Award" section at the foot of Revised quotes, "Your award outcome" inside the RFP card). F-08 / BL-120 covers email; this is the in-hub half.
  Problem: a supplier learns of an award only by opening the right tab.
  Recommendation: a To do row "Awarded to you: RFQ-2026-021 · 60% of item 1" and an in-hub notification on award and on withdrawal; one outcome strip on the event card. See mockup S-03.

- **S-05** · Major · high · Rounds · `/supplier/rfq`
  Evidence: rounds reachable through the text link "Revised quotes (negotiation rounds)" at the top right (`RfqPageHeader.jsx:44-50`) or the To do row; the RFQ-2026-021 card showed no round while round 1 was open; the menu item carries no count.
  Problem: a round with a 5-day deadline is the most urgent thing on the page and the least visible.
  Recommendation: a round strip on the card ("PTI asked for a revised quote · by 05 Sept"), a count on the menu item, and the revision form opened from the card. See mockup S-03.

- **S-06** · Major · high · Supplier response · RFP form, RFQ quote drawer
  Evidence: RFP sample offer is a checkbox; unticked returns "Say whether you can provide a sample." (`rfxAuthoring.js:242`); RFQ asks "Sample ready date" as a buyer question and again inside the sample offer; RFP asks the timeline as a question and again as "Timeline" (`RfpPricing.jsx:480-488`).
  Problem: a control that cannot say "no" blocks the send; the same fact is typed twice.
  Recommendation: Yes/No control for the sample; when a buyer question duplicates a built-in field, show it once and copy the value.

- **S-07** · Minor · high · Invitation, gate and intent · `/supplier/rfq` cards
  Evidence: legacy cards (RFQ-2026-010, 011) show "Submit quote" beside "I will respond"; tiered cards show "Say you will respond to open the quote grid"; the confidential card stacks "Accept confidentiality terms" above "I will respond" (`RFQCard.jsx:59-60,200-209`).
  Problem: three entry patterns on one list.
  Recommendation: a 2-step strip on every card ("Step 1: say if you will respond · Step 2: quote"), with the confidentiality acceptance as step 0 when it applies.

- **S-08** · Minor · high · Consistency, language · supplier RFQ cards and toasts
  Evidence: "Award by: 2026-09-27", "Received 2026-08-31", "will review by 2026-09-09" against "06 Sept 2026" on every other RFx screen.
  Problem: two date formats within one flow.
  Recommendation: `formatDate` everywhere; add days-left where a deadline is shown.

- **S-09** · Minor · high · Status, feedback and state · My Quotes, rounds page
  Evidence: tiered quote card shows "Unit price Rp 519,58", "Min. order qty: Same as RFQ qty" (`rfqs.js:73`) although MOQ 3,000 was entered per item; rounds page "Your last quote: IDR 520 · 21 days".
  Problem: a derived average presented as the supplier's price, with a decimal comma.
  Recommendation: for tiered quotes show items priced, the break-1 price per item and per-item MOQ; keep the derived figure off the card.

- **S-10** · Minor · high · Status, feedback and state · `/supplier/rfi`, `/supplier/rfp` rows
  Evidence: rows show a date with no days-left; "Answer" on a Submitted row (`SupplierRfi.jsx:280`); the RFP row stayed "Submitted" after the award while "Your award outcome" sat inside the card.
  Problem: the list does not say what needs doing or what was decided.
  Recommendation: "N days left" pill, button text by state (Answer / View / Revise), and an "Awarded" pill on the row.

- **S-11** · Minor · high · Supplier response · `/supplier/rfi` form
  Evidence: every question carries a "Description" box, doubling 11 questions to 22 fields; help text "Between — and 5." when no minimum is set (`rfxAuthoring.js:64`); PTI's brief reads "not available in this session" (BL-27).
  Problem: a longer form than the questions need, and a dead link to the one document the supplier wants.
  Recommendation: collapse the comment behind "Add a comment"; hide the bound text when a bound is missing; word the file line as "PTI's file is not stored yet; ask your buyer for it".

- **S-12** · Minor · medium · First-time experience · legacy RFQ cards
  Evidence: "SPECIAL REQUIREMENTS · SAMPLE DETAIL · Full RFQ specifics arrive with the Paragon sourcing packet (illustrative sample)…" on RFQ-2026-010 and 011 (`SupplierRFQs/utils.js:156`).
  Problem: sample copy that promises a packet that never comes. Confidence medium: it is fixture text, but a demo supplier sees it.
  Recommendation: drop the placeholder block on legacy cards or show the RFQ's own description.

- **S-13** · Minor · high · Invitation, gate and intent · `/supplier/rfi`, `/supplier/rfp`
  Evidence: no intent or decline control on RFI and RFP (repeat of F-13, BL-132); the buyer's invitee table shows "Not started" indefinitely.
  Problem: a supplier that will not answer has no way to say so.
  Recommendation: build BL-132 as the same 2-step strip as the RFQ card.

### 4.3 Both

- **X-01** · Major · high · Consistency, language · menu, page titles, To do
  Evidence: menu "RFQ" / "RFQ invitations", page "Quotation requests", To do "Sourcing invitations to answer" (`hub.js:177`) beside "Information requests to answer" and "Proposal requests to answer"; section header "Sourcing" untranslated in Bahasa Indonesia (`hub.js:211`); "Send to suppliers" vs "Publish RFQ".
  Problem: a first-time user meets four names for one module across the three places they look.
  Recommendation: one term per module (RFQ · Quotation request) used in menu, title, To do and toasts; translate the section header.

- **X-02** · Major · high · Work queue and wayfinding · `/supplier/home`, `/buyer/home`
  Evidence: supplier To do lists RFx rows 10th, 14th, 15th and 16th of 17, under three names; buyer My tasks has one row "Sourcing events ready to award 16 · Overdue 44 days" (sample).
  Problem: sourcing work sits below stock and ASN rows regardless of deadline.
  Recommendation: order To do rows by deadline across lanes, group the three RFx rows under one "Sourcing" header, and give the menu items a count.

- **X-03** · Minor · high · Status, feedback and state · award panels
  Evidence: pills "Updates 92%", "No history", "Best scored", "Tied for best" beside supplier names with no legend; "Updates 92%" is explained only on the award record as "Weekly update compliance at award".
  Problem: scores that affect the award decision are unexplained where the decision is made.
  Recommendation: a one-line legend above the award table and a tooltip on each pill.

---

## 5. DESIGN PROPOSALS

- **B-01 · RFQ event page.** Change: add a stage bar and a sticky section nav. Layout: header (title, number, status pill, deadline with days left, "Next" pill) → 6-step stage bar (Sent · Quotes in · Round · Award · Raised in SAP · Done) → two columns: 200 px nav (Invitees 4 · What is quoted · Comparison 3 · Rounds 1 open · Documents · Award) and the sections. Comparison shows the summary table with "Show every break" folded. Labels EN/ID: "Stage" / "Tahap", "Next" / "Berikutnya", "Jump to" / "Lompat ke". States: Open, Round open, Closed, Partly awarded, Awarded, Raised in SAP; empty: "No quotes yet". Replaces the flat scroll and the `?section=award` anchor.

- **B-02 · RFQ side panel.** Change: cut the panel to a summary. Layout top to bottom: number and title, status and Next, response deadline with days left, invited/responded counts with a 4-pill supplier list, 3 links (Open event · Comparison · Award), lifecycle actions, timeline. Remove the legacy comparison and clarifications (both live on the event page). Controls: "Open event" / "Buka acara", "Publish RFQ" → "Send to suppliers" / "Kirim ke pemasok". States: Draft (Edit, Send, Discard), Open (Extend, Cancel), Closed (Reopen, Award on event page), Awarded (View award). Replaces `QuoteComparison` and `RfqEngagementSection` in the panel.

- **B-03 · RFQ wizard Terms.** Change: seed `incoterms` from the option list and show the saved value. Layout: Terms step keeps two date fields, Incoterms select (FOB, CIF, EXW, DDP, FCA, with "CIF Jakarta" added if Procurement wants the port), Payment terms, Currency. Review row shows the stored value and flags red when it is not in the list. States: valid, out-of-list (red row with "Choose a term on the Terms step"). Replaces the silent default in `utils.js:281`.

- **B-04 · RFQ board.** Change: default view "Needs my action". Layout: KPI tiles become filters (Active, Awaiting response, Ready to award, Awarded); tabs: Needs my action · Open · Pending award · Draft · Awarded · Closed; rows ordered by next deadline, Closed last. Each row gains a "Next" column (Publish, Review quotes, Close round, Award, Raise in SAP). Labels EN/ID: "Needs my action" / "Perlu tindakan saya". States: empty "Nothing needs your action today". Replaces the "All" default and the unsorted list.

- **B-05 · Confirmation sheets.** Change: close, cancel and award confirm before dispatch. Layout: inline sheet under the button: title, 3 to 5 bullet effects (who is told, what closes, what the supplier sees, what is reversible), reason field when owed, "Record the award" / "Catat pemenang" and "Back to edit" / "Kembali". States: before (sheet), submitting, recorded (toast plus the record card). Replaces direct dispatch on "Close the event" and "Award the event".

- **B-06 · RFP detail before proposals.** Change: show the sent terms and options from publish. Layout: term grid with column "PTI asks for" only, option list with quantity points, a "Supplier columns appear as proposals arrive" note. Labels EN/ID: "Terms sent" / "Syarat yang dikirim". States: 0 proposals (one column), N proposals (comparison). Replaces "No proposals received yet" as the only content.

- **B-07 · Firm up prices.** Change: one block with two labelled choices. Layout: heading "Firm up the prices" → two cards side by side: "Ask for firm offers in this RFP · for full-service or ODM options settled here" and "Create an RFQ from this RFP · for components you will tender per item"; each with its own button; awarded options greyed with "Awarded". Labels EN/ID: "Firm up the prices" / "Pastikan harga". States: RFP Open (both disabled with "Close the RFP first"), Closed, Partly awarded, Awarded. Replaces two separate cards with no rule.

- **S-01 · Supplier response form.** Change: autosave, leave guard, stepper. Layout: header (number, deadline pill, "Draft · saved 19:04"), step stepper (Terms · Questions · Prices · Sample & validity · Documents · Review & send), one section per step, sticky footer (Back, Next, Send disabled with reason, save state), right rail with per-section counts. Labels EN/ID: "Saved to draft" / "Tersimpan sebagai draf", "Send proposal" / "Kirim proposal". States: unsaved (leave prompt), saved, submitted (read-only with Revise), closed. Replaces the single-scroll form held in component state. Mockup S-01.

- **S-02 · Inline validation.** Change: every missing or invalid field marked where it sits. Layout: red border and one-line message under the field; banner at the top "N answers still missing" with links; Send disabled with a tooltip naming the count. Labels EN/ID: "Still missing" / "Belum diisi". States: clean, missing, invalid, server refusal (banner names the field and scrolls to it). Replaces the one-line bottom message and the one-at-a-time top refusal. Mockup S-01.

- **S-03 · Award history.** Change: one row per event from the award record. Layout: table RFQ · Material · Result (Awarded 60% of item 1 · Not awarded · Withdrawn) · Award date (record date) · Your awarded value · PO issued; expand row for per-item shares. Labels EN/ID: "Your share" / "Bagian Anda". States: none yet, awarded, not awarded, withdrawn (date, no reason). Replaces rows per quotation version and the win-rate tile. Mockup S-03.

- **S-04 · Award outcome surfacing.** Change: To do row and notification on award. Layout: To do row "Awarded to you · RFQ-2026-021 · 60% of item 1 · 14,400 pcs" under a Sourcing header; bell item with the same text; outcome strip on the event card. Labels EN/ID: "Awarded to you" / "Dimenangkan oleh Anda", "Not awarded" / "Tidak dimenangkan", "Award withdrawn" / "Pemenangan ditarik". States: awarded, not awarded, withdrawn, raised in SAP (links to the PO when it exists). Replaces outcomes spread over three pages. Mockup S-03.

- **S-05 · Rounds on the card.** Change: the round request lives on the RFQ card. Layout: amber strip "PTI asked for a revised quote · by 05 Sept · 5 days left" with the message and a "Send a revised quote" button that opens the prefilled revision inline; menu item "RFQ invitations · 1 round". Labels EN/ID: "Revise by" / "Revisi sebelum". States: round open, revised, closed. Replaces the separate Revised quotes page as the only entrance; keep the page as a filtered view. Mockup S-03.

- **S-06 · Sample and duplicate fields.** Change: Yes/No control and single entry. Layout: "Can you provide a sample batch?" as a two-option control; "Sample ready date" shown once, enabled on Yes; "Development timeline" shown once. Labels EN/ID: "Yes" / "Ya", "No" / "Tidak". States: unanswered (error inline), yes (date required), no. Replaces the checkbox and the duplicated date and timeline fields.

- **X-01 · One name per module.** Change: align menu, title, To do and toasts. Layout: menu "RFI · RFQ · RFP" (buyer), "RFI · RFQ · RFP invitations" (supplier); page titles "RFI · Information requests" etc. with the acronym first; To do rows "RFQ invitations to answer", "RFI to answer", "RFP to answer", "RFQ round to answer". ID: "Undangan RFQ untuk dijawab" and so on; section header "Sourcing" → "Pengadaan". Replaces four names for one module.

- **X-02 · Sourcing in the To do.** Change: group and rank. Layout: To do sections by lane (Orders, Stock, Sourcing, Forecast) each ordered by deadline, Sourcing rows carrying the event number and days left; menu items with counts. States: nothing due, due soon, overdue. Replaces the flat 17-row list.

---

## 6. MOCKUPS

Folder: `docs/supplier-hub/research/rfx-ux-mockups/`. Self-contained HTML, inline CSS, no external files. Each opened in the preview on 2026-10-19 and rendered with no console errors.

- `S-01-supplier-response-form.html` — the RFP response form with autosave state, stepper, inline errors, a jump list, the sample question asked once, and a sticky footer (S-01, S-02, S-06).
- `B-01-rfq-event-page.html` — the RFQ event page with a stage bar, a sticky section nav, qualification text collapsed to one place, a summary comparison, and an award confirmation sheet (B-01, B-05, B-14).
- `S-03-supplier-rfq-workspace.html` — the supplier RFQ list with "Needs my action" first, a per-card step strip, the round request and the award outcome as strips on the card, and a count on the menu item (S-03, S-04, S-05, S-07).

---

## 7. ROADMAP

| Size | Quick wins (labels, order, headers, links, refusal text) | Larger changes (new panels, merged screens, new states) |
|---|---|---|
| S | B-03 seed incoterms from the list · B-08 row button labels · B-11 wizard polish · B-13 As-of line · B-16 one verb per act · S-08 date format · S-10 row pills and days left · S-11 copy and collapsed comment · S-12 drop placeholder block · X-01 names · X-03 pill legend · S-07 step copy | B-05 confirmation sheets · B-06 terms on the RFP detail · B-07 firm-up block · S-06 Yes/No sample and single fields · X-02 To do grouping |
| M | B-14 collapse qualification text · B-12 seed breaks, UOM by category, Save and publish | S-01 autosave and leave guard · S-02 inline validation · S-03 award rows from the record · S-04 award To do and notification · S-05 round strip on the card · B-02 panel trimmed to a summary · B-04 board default view |
| L | — | B-01 stage bar and section nav (also for RFI and RFP once they get their own pages, B-09) |

---

## 8. DROPPED

- "The confidential RFQ card reveals item names and breaks before acceptance": the gate text says scope stays visible and spec, notes and files are hidden; by design.
- "The side panel's TOP-RANKED contradicts the event page's Best scored": both named PT Sample Preform Works at the time; the panel's pill belongs to the second column.
- "A supplier persona can open `/buyer/rfp`": that is the demo persona toggle, not a product screen; route guarding is out of scope.
- "Both RFI responders score 100": the weighted questions produced the same score; a scoring question, not an experience one.
- "Board rows read OsloOslo": a text-extraction artefact of the project tag beside the title; on screen it is a pill.
- "The award demanded a reason for the best-scored supplier": the reason was owed for PT Sample Preform Works (not qualified), and the panel said so.

Not exercised, not dropped: the late-quote refusal (`PAST_DEADLINE`). The hub clock is pinned to 31 Aug 2026 and no Open RFQ the demo supplier can quote is past its deadline, so the refusal text was not seen.

---

## 9. OPEN QUESTIONS

1. Which rule should the RFP screen state for firm-offer round versus RFQ-from-RFP (RFX-D4/D6), and should the RFQ path close once a firm-offer round has run?
2. Should the RFI and RFP details become routes of their own, like the RFQ event page, or stay inline under the list?
3. Confirmation before close and award: does the operator's "a button the machine would refuse is worse than an absent one" principle allow a confirmation sheet, or should the cancel verb stay the only recovery?
4. Should a supplier's award notice wait until the award is marked raised in SAP, or appear at the moment of the award?
5. "Menu for" offers "Buyer"; the roles catalogue and the docs say Procurement. Which name do first-time PTI users know?
6. Is "CIF Jakarta" a term Procurement uses? If so it belongs in the option list; if not, the default should be FOB.
7. Who owns the supplier To do ordering across lanes (Material Planning set the stock SOP; Procurement owns the sourcing rows)?

---

## 10. BUILD STATUS

The owner ruled on section 9, on BL-132 and the module names on 2026-10-19, and on B-02 during the build (recorded as RFX-D16 to RFX-D24 in `DECISION-GUIDE.md`). Wave 1 built the Blocker and the 14 Major findings on branch `feat/rfx-ux-wave1`; wave 2 builds the 17 Minor and Polish findings on `feat/rfx-ux-wave2`, cut from wave 1. Each lane's commit is the head of its lane branch, merged into the wave branch with a merge commit.

| ID | Severity | Status | Lane · commit | Pinned by |
|---|---|---|---|---|
| S-01 | Blocker | Built: draft kept in this browser as the supplier types, "Draft saved on this device at HH:MM", leave guard when the save fails; RFI, RFP and RFQ quote drawer. Stepper not built | 1A · `66afbe90` | `rfx/responseDraft.test.jsx`, `rfx/SupplierResponseForms.test.jsx` |
| B-01 | Major | Built: stage bar, Next pill, days left, sticky section nav with counts, per-break tables folded | 1C · `1aa58900` | `BuyerSourcingEvent/eventStage.test.jsx` |
| B-02 | Major | Built (RFX-D24): side panel is a summary; review, exchange rate and clarifications on the event page | 1D2 · `a7fc4126` | `BuyerSourcing/rfxUxB02.test.jsx` |
| B-03 | Major | Built (RFX-D19): FOB default, out-of-list value red on Review | 1D · `88c64995` | `BuyerSourcing/rfxUx1D.test.jsx` |
| B-04 | Major | Built: "Needs my action" by next deadline, KPI tiles filter, Draft tab, Next column | 1D · `88c64995` | `BuyerSourcing/rfxUx1D.test.jsx` |
| B-05 | Major | Built: confirmation sheet before close (RFI, RFP), award and cancel-award (RFQ, RFP). RFQ cancel in the side panel has none (BL-212) | 1C · `1aa58900` | `rfx/RfxConfirmSheets.test.jsx` |
| B-06 | Major | Built: "Terms sent" and the option list before any proposal | 1E · `370eade0` | `BuyerRfp/rfpDetailUx.test.jsx` |
| B-07 | Major | Built (RFX-D16): "Firm up the prices" block; RFQ refused for an option in a firm-offer round | 1E · `370eade0` | `BuyerRfp/rfpDetailUx.test.jsx`, `services/sourcing/rfqOptionInRound.test.js` |
| S-02 | Major | Built: "Still missing" under each field, banner with jump links, every gap at once, Send disabled with the count | 1A · `66afbe90` | `rfqs/tieredDraftProblems.test.js`, `rfx/SupplierResponseForms.test.jsx` |
| S-03 | Major | Built (RFX-D22): one row per event from the award record, no win rate | 1B · `1f7d8f81` | `SupplierRFQs/rfxUx1B.test.jsx` |
| S-04 | Major | Built (RFX-D18): To do row and hub bell at award and withdrawal, "The purchase order follows from SAP", outcome strip | 1B · `1f7d8f81` | `SupplierRFQs/rfxUx1B.test.jsx`, `home/supplierLanes.test.jsx` |
| S-05 | Major | Built: round strip with deadline and days left, button to the revision, "1 round" on the menu | 1B · `1f7d8f81` | `SupplierRFQs/rfxUx1B.test.jsx` |
| S-06 | Major | Built: sample as Yes/No; a buyer question repeating a built-in field shown once | 1A · `66afbe90` | `rfx/builtInDuplicates.test.jsx` |
| X-01 | Major | Built (RFX-D23): acronym-first titles, To do names, "Pengadaan" | 1E · `370eade0` | `lib/i18n/rfxModuleNames.test.js` |
| X-02 | Major | Built (RFX-D20): To do grouped by lane, deadline order inside each, event number and days left | 1B · `1f7d8f81` | `home/supplierLanes.test.jsx` |
| B-08 to B-16, S-07 to S-13, X-03 | Minor, Polish | Wave 2 (see the wave 2 report) | 2A to 2D | — |
