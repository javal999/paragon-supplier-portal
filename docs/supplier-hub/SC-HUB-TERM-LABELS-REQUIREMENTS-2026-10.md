# SC Hub requirement BL-233: term labels keep the source wording, and every important term explains itself

| Field | Value |
|---|---|
| Status | **Accepted 2026-10-29: TL-D1 to TL-D5.** TL-D6 and TL-D7, and the labels in section 5, are [Proposed] and wait on the owner. Nothing is built yet |
| Date | 2026-10-29 |
| Source | Owner, 2026-10-29, reviewing the Demand anticipation grid: the row label differs from the team's input. Owner rules: (1) an agreed column wording is not replaced with another name; (2) every important term gets an information icon with its definition and the other names it goes by |
| Code read | `main` at `59199b4f` |
| Supersedes | CAP-D10 (name "Demand anticipation", never "DA") in `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md` and `SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10.md` |
| Does not change | Any figure, formula or rule. This is labels and definitions only |

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
- **BR-04. The team's words stay in ID too [Proposed, TL-D6].** A term the team writes in English inside Indonesian text (DA, LTP, safety order, carry-over, OSPO, ROP) is not translated in the ID locale. Today the ID locale translates DA to "Antisipasi permintaan", which the team does not say.

### TL-R2. Every important term explains itself

- **BR-05. Where.** An information icon (i) sits next to the label of every important term in: table column headers, grid row labels (such as the Demand anticipation weeks grid), and KPI card titles. Filters and form fields are out of scope [Owner, 2026-10-29, TL-D4].
- **BR-06. What counts as important [Proposed, TL-D7].** A measure, quantity, state or rule the reader has to understand to act: LTP, Demand anticipation (DA), Safety order, Gap, ROP Fisik, OSPO, Share, Firm. Not: plain identifiers and dates (Week, Date, Supplier, Material, Code, Name, Actions), and units shown after a label ("· KG").
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
| Carried in | Sisa dibawa masuk | carry-over, sisa DA | Open: see section 5 |
| Would be | Jika dihitung ulang | none found | Open: see section 5 |
| Surplus absorbed | Kelebihan diserap | none found | Open: see section 5 |
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

## 5. Open for the owner

| # | Question | Recommendation [Proposed] |
|---|---|---|
| Q1 | "Carried in": the team says "carry-over" and "sisa DA" [Team: questions file A8]. Rename to the team's word? | "Carry-over", tooltip "Also called: sisa DA (Material Planning team)". By BR-01 the team's word wins |
| Q2 | "Would be" and "Surplus absorbed" have no team word. Keep the hub's labels? | Keep them, and add both to the next question list for the team so they can name them |
| Q3 | TL-D6: keep the team's English terms untranslated in ID? | Yes |
| Q4 | TL-D7: is the "important" list in BR-06 right? | Yes, and the first-wave inventory (section 6, step 1) lists every label it would cover, for the owner to strike out |

---

## 6. Build order

1. **Inventory (no code change).** List every table column header, grid row label and KPI card title in `src/pages-v2` and `src/components`: page, label EN and ID, i18n key, important (Y/N, BR-06), source wording (BR-01) and any clash. On `main` 92 source files render a table and 29 use `KpiCard` [Code: `components/ui-v2/KpiCard.jsx`]. The owner strikes out labels before step 3.
2. **Wave 1: the mechanism and the Demand anticipation pages.**
   - Generalise `TermTip` from the planning vocabulary to any glossary registry, keeping BR-09.
   - Add a label field to the glossary entry so the label and its tooltip share one entry (BR-08), with optional `formula`, `alsoCalled` (name + source) and `notToConfuse` lines (BR-07).
   - Let table headers, grid row labels and `KpiCard` titles take a term.
   - Apply TL-D1 on the Demand anticipation page, its history page, What to order's "Below demand anticipation" section and the alerts.
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
| TL-D6 | Team terms in the ID locale | Not translated (BR-04) | [Proposed] |
| TL-D7 | What counts as an important term | The BR-06 rule, checked against the step 1 inventory | [Proposed] |
