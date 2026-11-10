# SC Hub requirement BL-233: term labels keep the source wording, and every important term explains itself

| Field | Value |
|---|---|
| Status | **Accepted 2026-10-29: TL-D1 to TL-D13; TL-D14 to TL-D18 on 2026-10-30; TL-D19 to TL-D35 on 2026-11-02.** The owner answered the 4 open questions (section 5) and the 27 inventory questions (TL-D10 to TL-D13, `research/TERM-LABEL-INVENTORY-2026-10.md` section 1) the same day. Wave 1 merged 2026-10-30 (MR !65, `7f29d078`) |
| Date | 2026-10-29 |
| Source | Owner, 2026-10-29, reviewing the Demand anticipation grid: the row label differs from the team's input. Owner rules: (1) an agreed column wording is not replaced with another name; (2) every important term gets an information icon with its definition and the other names it goes by |
| Code read | `main` at `59199b4f` |
| Supersedes | CAP-D10 (name "Demand anticipation", never "DA") in `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` and `SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md` |
| Does not change | Any figure, formula or rule. This is labels and definitions only, except 3 display fixes the inventory found (TL-D12): the RFQ Awards history shows the real award date and amount, and "vs Should-Cost" is hidden while the model is parked |

**Tags.** [Code] = built behaviour, cited `path:line` under `src/`. [Owner, 2026-10-29] = the owner's ruling in this review. [Team] = the Material Planning team's own words, from the 2026-10-14 MoM, the OSIP playbook PPT and `analysis/osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md`. [Proposed] = a value written before review.

---

## 1. The problem

The team calls the weekly figure **DA** [Team: MoM 14 Oct; questions file section A, "Demand Anticipation (DA)"; PPT slide 7 "Simulasi incoming DA", slide 8 "DA Adjustment"]. The hub shows **"Demand anticipation"** in EN and **"Antisipasi permintaan"** in ID [Code: `lib/i18n/demandAnticipation.js:67`, the ID block below it]. CAP-D10 chose that on 2026-10-13 because "DA" already labels Delivery Agreements on the contract pages [Code: `pages-v2/BuyerContractDetail.jsx:5-9`].

The reason was sound, but the effect is the one the owner now rules out: the team reads a word it never used, for a figure it defined. Nothing stops the next build or copy pass from doing the same to another term, because no rule says where a label's wording comes from.

The hub has one place that already explains terms at the point of use: `TermTip`, an information button with a definition read from the glossary [Code: `components/forecast/TermTip.jsx`]. It covers 7 planning terms (Firm, Trade-off, MASC, Tracking signal, Reorder point, P50/P90, Safety stock) [Code: `lib/glossary/planning.glossary.js:21`] and 10 other source files use it, all forecast components and pages. Tables, grid rows elsewhere and KPI cards have no definitions.

---

## 2. The rules

### TL-R1. Agreed wording is kept

- **BR-01. The label is the source's word.** A term's label is written as the source writes it. The sources, in order: (1) the MoM and the team's own material (PPT, questions and answers files); (2) the hub's accepted requirement and decision documents under `docs/supplier-hub/`. The code is never a source for a label [Owner, 2026-10-29, TL-D2].
- **BR-02. A clash is shown, not renamed.** When the source's word already means something else in the hub, the label carries both: the full name with the source's word in brackets, e.g. "Demand anticipation (DA)". The tooltip names what it is not, e.g. "Not Delivery Agreement" [Owner, 2026-10-29, TL-D1].
- **BR-03. A rename needs a ruling.** No build, UX evaluation or copy pass changes an agreed label. A session that thinks a label is wrong writes it as a [Proposed] question for the owner and leaves the label as it is. A ruling gets a decision ID, and the glossary entry and the label change in the same MR [Owner, 2026-10-29, TL-D3].
- **BR-04. The team's words stay in ID too [Owner, 2026-10-29, TL-D6].** A term the team writes in English inside Indonesian text is not translated in the ID locale. TL-D6 named DA, LTP, safety order, carry-over, OSPO and ROP; TL-D11 made it an open rule, which also covers FG demand, Max, Firm, call-off, lead time, Uplift, Protection buffer and Strategic buffer. Today the ID locale translates DA to "Antisipasi permintaan", which the team does not say.

### TL-R2. Every important term explains itself

- **BR-05. Where.** An information icon (i) sits next to the label of every important term in: table column headers, grid row labels (such as the Demand anticipation weeks grid), and KPI card titles. Filters and form fields are out of scope [Owner, 2026-10-29, TL-D4].
- **BR-06. What counts as important [Owner, 2026-10-29, TL-D7].** A measure, quantity, state or rule the reader has to understand to act: LTP, Demand anticipation (DA), Safety order, Gap, ROP Fisik, OSPO, Share, Firm. Not: plain identifiers and dates (Week, Date, Supplier, Material, Code, Name, Actions), and units shown after a label ("· KG").
- **BR-07. What the tooltip says.** In this order, each line only when it applies:
  1. **Definition:** 1 to 2 sentences, at most 40 words, in plain words.
  2. **How it is calculated:** the formula in the source's terms, for a computed figure (e.g. "LTP of the week; week 1 also carries the safety order").
  3. **Also called:** every other name for it, each with where that name is used: the team, SAP (field or transaction), industry (e.g. APICS). Example: "Also called: DA (Material Planning team, OSIP playbook)" [Owner, 2026-10-29, TL-D5].
  4. **Not:** a term it is easy to confuse it with, e.g. "Not Delivery Agreement (also DA, on contract pages)".
- **BR-08. One source for the label and its tooltip.** The label text and the tooltip text come from the same glossary entry, in EN and ID. A page does not hold its own copy of either, so a label cannot drift from its definition.
- **BR-09. Accessible as `TermTip` already is.** Opens on hover and on keyboard focus; Escape closes it; 24 px hit area, 44 px on touch; a closed tip takes no space; the button's `aria-describedby` reads the text [Code: `components/forecast/TermTip.jsx`, header comment].
- **BR-10. An unknown "Also called" is left out, not guessed.** If no source gives another name, the line is not shown. A builder does not invent an SAP field or an industry synonym; it lists the term as a question for the owner.

---

## 3. What changes on the Demand anticipation grid

| Row (EN today) | ID today | Team's word [Team] | After this requirement |
|---|---|---|---|
| Demand anticipation | Antisipasi permintaan | DA | **Demand anticipation (DA)** in EN and ID (TL-D1, BR-04). Tooltip: definition, "LTP of the week; week 1 also carries the safety order; plus carry-over", "Also called: DA (Material Planning team, OSIP playbook)", "Not Delivery Agreement (also DA, on contract pages)" |
| LTP | LTP | LTP | Unchanged; gets a tooltip |
| Safety order | Safety order | safety order | Unchanged; gets a tooltip. Not "safety stock": the team's safety order is the ROP Order component, 1.65 × √LT × SD |
| Carried in | Sisa dibawa masuk | carry-over, sisa DA | **Carry-over** in EN and ID (TL-D8). Tooltip: "Also called: sisa DA (Material Planning team)". Same on the history page column, its CSV header and the "Published …" sentence |
| Would be | Jika dihitung ulang | none found | Unchanged for now; gets a tooltip. Asked of the team (TL-D9) |
| Surplus absorbed | Kelebihan diserap | none found | Unchanged for now; gets a tooltip. Asked of the team (TL-D9) |
| FG demand, LTP − FG demand, Consumption 13-week average, Recorded consumption, Open supply, Gap | as EN | from the hub's own documents (DRC-18, CAP-11, CAP-12) | Unchanged; each gets a tooltip |

Everywhere else "Demand anticipation" appears as a label (the history page, publish button, What to order section "Below demand anticipation", alerts), it follows TL-D1. Running sentences may keep "demand anticipation" after the label has introduced "(DA)" once on the page.

---

## 4. Acceptance criteria

- AC-01: the Demand anticipation grid's row reads "Demand anticipation (DA)" in EN and in ID.
- AC-02: focusing that row's (i) shows the definition, the calculation, "Also called: DA …" and "Not Delivery Agreement …"; Escape closes it.
- AC-03: every label covered by BR-05 and BR-06 on a page in the first wave has an (i); filters and form fields have none.
- AC-04: a test fails when a covered label's text is not the label of a glossary entry (guard for BR-01, BR-08).
- AC-05: a test fails when a glossary entry lacks EN or ID text (already true for the planning vocabulary [Code: `lib/glossary/glossary.coverage.test.js`]).
- AC-06: no tooltip shows an "Also called" line with no named source (BR-10).
- AC-07: done with this document: `CAP-D10` reads "Superseded by TL-D1, 2026-10-29" in both documents that list it.

---

## 5. Questions the owner answered, 2026-10-29

Each was asked with a recommendation; the owner took the recommendation every time.

| # | Question | Answer [Owner, 2026-10-29] |
|---|---|---|
| Q1 | "Carried in": the team says "carry-over" and "sisa DA" [Team: questions file A8]. Rename to the team's word? | Yes: "Carry-over", tooltip "Also called: sisa DA (Material Planning team)" (TL-D8) |
| Q2 | "Would be" and "Surplus absorbed" have no team word. Keep the hub's labels? | Keep both labels for now and add them to the next question list for the Material Planning team, so the team names them (TL-D9). The team's names then replace these under BR-01 |
| Q3 | TL-D6: keep the team's English terms untranslated in ID? | Yes: DA, LTP, safety order, carry-over, OSPO and ROP stay in English in the ID locale |
| Q4 | TL-D7: is the "important" list in BR-06 right? | Yes, as written. The step 1 inventory (section 6) lists every label the rule covers, and the owner can strike any out |

---

## 6. Build order

1. **Inventory (no code change).** List every table column header, grid row label and KPI card title in `src/pages-v2` and `src/components`: page, label EN and ID, i18n key, important (Y/N, BR-06), source wording (BR-01) and any clash. On `main` 92 source files render a table and 29 use `KpiCard` [Code: `components/ui-v2/KpiCard.jsx`]. The owner strikes out labels before step 3.
2. **Wave 1: the mechanism and the Demand anticipation pages.**
   - Generalise `TermTip` from the planning vocabulary to any glossary registry, keeping BR-09.
   - Add a label field to the glossary entry so the label and its tooltip share one entry (BR-08), with optional `formula`, `alsoCalled` (name + source) and `notToConfuse` lines (BR-07).
   - Let table headers, grid row labels and `KpiCard` titles take a term.
   - Apply TL-D1 and TL-D8 on the Demand anticipation page, its history page, What to order's "Below demand anticipation" section and the alerts.
   - Add the guard test (AC-04).
   - Update the CAP-D10 comments in `lib/i18n/demandAnticipation.js` and `lib/i18n/consumption.js`.
3. **Wave 2 onwards: the rest of the inventory**, one page group per wave, in the owner's priority order (Goal A, then Goal C, then the rest; RFx pages last while RFx is paused).

---

## 7. Decisions

| ID | Decision | Choice | Status |
|---|---|---|---|
| TL-D1 | Label of the weekly figure | "Demand anticipation (DA)" on screen, in EN and ID; the tooltip says "Not Delivery Agreement". `demandAnticipation` stays the code name. Supersedes CAP-D10 | Accepted, owner, 2026-10-29 |
| TL-D2 | Where a label's wording comes from | The MoM and the team's material first, then the hub's accepted requirement and decision documents; never the code | Accepted, owner, 2026-10-29 |
| TL-D3 | Renaming an agreed label | Only by an owner ruling with a decision ID; builders raise [Proposed] questions | Accepted, owner, 2026-10-29 |
| TL-D4 | Where the (i) goes | Table column headers, grid row labels and KPI card titles; not filters or form fields | Accepted, owner, 2026-10-29 |
| TL-D5 | Other names in the tooltip | All of them: the team's, SAP's and the industry's, each with its source; none guessed | Accepted, owner, 2026-10-29 |
| TL-D6 | Team terms in the ID locale | Not translated (BR-04) | Accepted, owner, 2026-10-29 |
| TL-D7 | What counts as an important term | The BR-06 rule, checked against the step 1 inventory | Accepted, owner, 2026-10-29 |
| TL-D8 | Label of the carried quantity | "Carry-over" in EN and ID (was "Carried in" / "Sisa dibawa masuk"); tooltip "Also called: sisa DA (Material Planning team)" | Accepted, owner, 2026-10-29 |
| TL-D9 | Labels with no team word ("Would be", "Surplus absorbed") | Kept for now; asked of the Material Planning team in the next question list; the team's names replace them under BR-01 | Accepted, owner, 2026-10-29 |
| TL-D10 | Scope answers from the inventory (Q1 to Q9) | Out: /buyer/inventory summary tiles (filters), screen-reader-only chart tables, the 57 admin rule-value rows (their hint line is enough). In: scorecard and supplier performance KPI tiles now (with i18n keys), headers over input cells, every alert rule name, the DA history facts list (its CSV headers keep the same words, no tooltip), RFx summary-card facts and RFP term-catalog rows in the last wave | Accepted, owner, 2026-10-29 |
| TL-D11 | Reach of BR-04 | Open rule: any term the team writes in English inside Indonesian text stays English in ID (extends TL-D6) | Accepted, owner, 2026-10-29 |
| TL-D12 | Wording and display fixes from the inventory (Q11 to Q26) | Max Stock / Max Stock Supplier; PR Generated; Incoming (Not Incoming DA); Commitment gap; Status; Accepted / Diterima; Disputed on both sides; 3-way match on both sides; Selisih vs Ketidaksesuaian; Certificate validity; Budget; Award date and Award value show the real award date and amount; vs Should-Cost hidden while parked; Sisa kuantitas; Channel. Rows listed in the inventory | Accepted, owner, 2026-10-29 |
| TL-D13 | More labels with no team word | "After the check" and "Called off, not yet shipped" kept; added to the team's next question list with the TL-D9 pair | Accepted, owner, 2026-10-29 |
| TL-D14 | Label of the 13-week consumption average | The team's "Moving average consumption" (Q-file A11) in EN and ID; was "Consumption, 13-week average" | Accepted, owner, 2026-10-30 |
| TL-D15 | Is ROP Order another name for the safety order? | No. ROP Order = LTP × lead time + safety order (DRC-10), so it contains the safety order. The safety order's tooltip lists ROP Order under "Not", never under "Also called". DRC-7's heading "Safety order (ROP Order)" is read as "the safety order inside ROP Order" | Accepted, owner, 2026-10-30 |
| TL-D16 | Full name of LTP | Not shown; LTP's tooltip gives no expansion | Accepted, owner, 2026-10-30 |
| TL-D17 | TL-D11 in Indonesian sentences | Applies to sentences too, not only labels: ID text says "demand anticipation", never "antisipasi permintaan" | Accepted, owner, 2026-10-30 |
| TL-D18 | "(DA)" in navigation and page titles | Yes: the nav items and page titles of the Demand anticipation pages read "Demand anticipation (DA)", in EN and ID | Accepted, owner, 2026-10-30 |
| TL-D19 | Inventory labels against their source | "Supplier available" becomes the source's "Supplier available stock" (MAT MR-7; ID unchanged, the source gives none). "PTI reorder point" becomes "PTI ROP", ID "ROP PTI" (SC-HUB-CAPACITY-REQUIREMENTS) | Accepted, owner, 2026-11-02 |
| TL-D20 | "Safety order (ROP Order)" on the Safety stock page | "Safety order", in EN and ID: the column is the safety part of ROP Order, not ROP Order (TL-D15) | Accepted, owner, 2026-11-02 |
| TL-D21 | "ROP Fisik safety" | The team's "Safety ROP Fisik", in EN and ID. Replaces the builder's TL-D11 reading that kept the hub's word order | Accepted, owner, 2026-11-02 |
| TL-D22 | "ROP to principal" and "Replenishment cycle f" | The team's "ROP order to principal" and "Cycle replenishment (f)", in EN and ID | Accepted, owner, 2026-11-02 |
| TL-D23 | Where an "Also called" source points | A tip names only the team ("Material Planning team"), never a question ID, deck or sheet. The trail stays in this document (section 8). Sources that are hub documents keep the document's plain name | Accepted, owner, 2026-11-02 |
| TL-D24 | Sign of "PR Generated" on the what-if | Positive, as built; the tip says the team's slide writes the same need as a negative number | Accepted, owner, 2026-11-02 |
| TL-D25 | Stabilise KPI titles against the engine requirements | Kept as they are; the engine's names stay under "Also called" | Accepted, owner, 2026-11-02 |

| TL-D26 | ID label of "Risk · supplier cover" | "Risiko · cakupan stok pemasok", per INV-D1; EN unchanged | Accepted, owner, 2026-11-02 |
| TL-D27 | What-if "Max" | "Max Stock" in EN and ID, as TL-D12 does on Safety stock and What to order; same formula | Accepted, owner, 2026-11-02 |
| TL-D28 | What "In Transit" (buyer orders) and "In Progress" (supplier orders) count | POs in delivery and not yet fully delivered: Partially delivered only. A PO that is only Confirmed has not started delivery. The KPI counts change; the supplier's "In progress" tab still lists Confirmed POs | Accepted, owner, 2026-11-02 |
| TL-D29 | "Accepted" and "Recv" both read "Diterima" in ID | Kept: "Accepted" is the inspection decision, "Recv" the physical receipt; each (i) says which | Accepted, owner, 2026-11-02 |
| TL-D30 | Returned vs Disputed on invoices | Different states. The supplier KPI reads "Returned" / "Dikembalikan" again (Finance sent the invoice back to correct and resubmit); the buyer KPI "Disputed" is a dispute over a price or quantity difference. Each tip names the other under "Not". Supersedes TL-D12 Q17 ("one word: Disputed on both sides") | Accepted, owner, 2026-11-02 |
| TL-D31 | Reliability labels that show a rate | A label over a percentage names the rate: "Confirmation rate" (ID "Tingkat konfirmasi") and "Commitment reliability" (ID "Keandalan komitmen"). "Confirmed by the deadline" would be a count. **Open:** the owner also chose "CFOT" for both confirmed-date measures, which conflicts with FUX-D5 (the reliability measure is by PO line, the scorecard's by PO, and they are named apart on purpose; the usability test plan checks it). Ruled in TL-D34 | Accepted, owner, 2026-11-02 |
| TL-D32 | "Band" and "Stale after" | "Performance band" (ID "Kelompok kinerja"; it also renames the RFx invite filter, which shares the key) and "Stale period" (ID "Periode usang") | Accepted, owner, 2026-11-02 |
| TL-D33 | Confirmed as they stand | The tips for the invoice aging tab (bucket, % of AP, Risk) and contract "Performance"; "Kanal" for Channel; "Selisih komitmen" for Commitment gap; renames change labels only, not sentences or switch names. The tips for "Reach", "Required role" and "Stock figure now" are written from the code and accepted; noted to source them when a document defines them | Accepted, owner, 2026-11-02 |
| TL-D34 | The two CFOT measures | Named by their basis, keeping FUX-D5's split: "CFOT, by PO line" (ID "CFOT, per baris PO") on Supplier reliability, "CFOT, by PO" (ID "CFOT, per PO") on the scorecard and supplier performance. Labels only (TL-D33): the sentences that name the measure keep their wording | Accepted, owner, 2026-11-02 |
| TL-D35 | The proposed label changes outside RFx | All 14 accepted as proposed. "PTI stock on hand (SOH), all plants"; "Size of changes (MASC)"; "Share of schedules changed inside lead time"; "Trade-off weeks within the tolerance band"; GR panel "Exp" becomes "Shipped" (ID "Dikirim"), as on the supplier goods-receipt page; Overdue on Buyer orders and Buyer invoices reads "Lewat jatuh tempo" in ID; invoice line "Expected value"; "Awaiting response"; PO line "Unit price" (ID "Harga satuan"); "Counter-offer quantity" and "Counter-offer date"; "Goods receipts"; ASN line "Batch". The RFQ compare "Weighted score" waits with RFx | Accepted, owner, 2026-11-02 |
| TL-D36 | Protection buffer tip after PEX-5 | Label "Protection buffer" kept (TL-R1). The tip is to be rewritten: since MR !102 the hub has two protection buffers, the BL-205 uplift (Capacity page, shown only) and LTP B − LTP A (DA grid, added to ROP Order in the DA figure), while the tip says nothing is ordered from it. Wording to be proposed under BL-294 | Open, 2026-11-10 |

**Open, 2026-11-02.** One question goes to the Material Planning team in the C2 message: is "Max Supplier" another name for the production limit? Question E3 is headed "Max Supplier / Production Limit"; until the team answers, the production limit's tip lists no other name (BR-10) and no label changes.

---

## 8. Where each "Also called" name was found (TL-D23)

The tips name only the team. This is the trail. Q-file = `analysis/osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md`.

| Term (glossary key) | Other name | Where the team uses it |
|---|---|---|
| demandAnticipation | DA | OSIP playbook; Q-file section A |
| carryOver, whatIfCarryOver | sisa DA | Q-file A8 |
| remainder, whatIfRemainder | sisa | Q-file A8 |
| additionalPo | PO tambahan | Q-file A9 |
| daOverLeadTime | Total DA | Q-file A2 |
| supplierOwnRop | ROP PM in Supplier | the team's stock sheet, Q-file B10 |
| demandCv | CV | Q-file C1 |
| osipLevel | Level OSIP | Q-file C2 |
| replenishmentCycle | call-off lead time | MoM, Q-file B6 |
| protectionBuffer | risk protection | the team's sheet "Guidance", Q-file C3 |

Names from hub documents: "days of cover" (`SUPPLIER-HUB-REQUIREMENTS.md`, CR-24); "supplier SOH", "PTI SOH", "PTI ROP" (`SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`, alert rules); "Size of changes", "Share of schedules changed inside lead time", "tolerance band" (`FORECAST-ENGINE-REQUIREMENTS.md`, E14-02 and E14-06).

