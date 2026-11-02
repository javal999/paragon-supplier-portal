// Briefing deck: what came of the 07, 14 and 28 Oct meetings, and what the planners still confirm.
// Source: ../SC-Hub-MoM-Updates-07-14-28-Oct.md (evidence and sources there). Read at GitLab main f79a26c1.
const slides = [];
const add = (s) => slides.push(s);
const NOTE = 'Source: SC-Hub-MoM-Updates-07-14-28-Oct.md (same folder), read at GitLab main f79a26c1.';

add({
  type: 'title',
  title: 'SC Hub: 07, 14 and 28 Oct meetings',
  subtitle: 'What was decided, what is live, and what the planners still need to confirm',
  meta: 'Material Planner session · Wednesday 4 November 2026 · Prod build f79a26c1 (2 Nov 2026)',
  notes: NOTE + ' Companion decks: SC-Hub-Planner-04-Nov-What-Changed.pptx (MR !83, changes since 21 Oct with worked examples) and Paragon-Supplier-Portal-User-Guide.pptx (MR !84, how each flow works).'
});
add({
  type: 'cards',
  kicker: 'In one line',
  title: 'Everything decided is live; answers are what is left',
  intro: 'Every decision from 07, 14 and 28 Oct is built and running in prod. Three kinds of item are still open.',
  cards: [
    { mark: '29', head: 'Questions for Material Planning', body: 'DA, ROP and safety, OSIP level, NPD and feedstock, labels, backlog items and three proposed defaults. Reply asked by Friday 6 Nov (C2 message).' },
    { mark: '12', head: 'Alert rules to confirm', body: 'The alerts the hub raises today, written from the build because the team\'s 23 Sept list was never shared. Missing, unwanted, wrong audience?' },
    { mark: '6', head: 'Items waiting on the owner', body: 'Three rules built as proposals, the supplier DA view, the remaining week tables, and the early-receipt KPI rule.' }
  ],
  cardH: 3.3,
  footnote: 'Check before the session: on 2 Nov the C2 message to the team was still a draft.',
  notes: NOTE
});

// ── 07 Oct ─────────────────────────────────────────────────────────────
add({ type: 'section', kicker: 'Weekly SC Hub · 07 Oct', title: 'Capacity, forecast confirmation, DA horizon', body: 'Decisions CAP-D1 to CAP-D8 accepted 12 Oct, CAP-D9 to CAP-D17 on 13 Oct. Backlog BL-170 to BL-181.', notes: NOTE });
const capCols = ['Meeting point', 'Decided', 'Status in prod', 'Where'];
const capW = [2.6, 4.2, 3.2, 2.13];
add({
  type: 'table', kicker: '07 Oct · part 1 of 2', title: 'Capacity and forecast confirmation',
  columns: capCols, colW: capW,
  rows: [
    ['Week = column (CAP-1)', 'Time-series tables show weeks as columns', 'Partly: Capacity and Demand forecast. 7 tables wait for owner confirmation', 'Capacity, Demand forecast'],
    ['Weekly/Monthly (CAP-2)', 'A week counts in the month of its Thursday; monthly read only', 'Built', 'Capacity, Demand forecast'],
    ['Three capacity states (CAP-3)', 'Within capacity, Needs additional capacity, Cannot be supplied', 'Built', 'Capacity, Submit by period'],
    ['Force Majeure, Discontinued (CAP-4, 5)', 'Note required; Discontinued alerts PTI to find another source', 'Built (no Procurement screen)', 'Commitments, Capacity, Alerts'],
    ['No commitment date (CAP-6)', 'Supplier confirms quantity per period', 'Built', 'Foresight commitments'],
    ['Request revision (CAP-7)', 'Hide first', 'Built: switched off', 'Foresight commitments']
  ],
  notes: NOTE + ' Status per CAP: BUILD-GAP.md section 1.2.'
});
add({
  type: 'table', kicker: '07 Oct · part 2 of 2', title: 'Planner actions and the DA horizon',
  columns: capCols, colW: capW,
  rows: [
    ['Move demand (CAP-8)', 'One quantity per supplier, in the material\'s unit', 'Built', 'Foresight commitments'],
    ['Blanket PO run-out (CAP-9)', '"New PO needed by"; oldest blanket PO drawn first', 'Built', 'Call-offs, Alerts'],
    ['DA frozen per 4 weeks (CAP-10, 11)', 'Built 13 Oct, then replaced 19 Oct: horizon = lead time, rolling weekly', 'Built as replaced (DRC-2)', 'Demand anticipation (DA)'],
    ['PO < DA (CAP-12)', 'Hub recommends, planner raises the PO', 'Built: Below DA section', 'What to order'],
    ['Capacity per week (BL-65)', 'Per week, plus "Copy to all weeks"', 'Built', 'Capacity'],
    ['Ary\'s spike case', 'Build on placeholders, replace with Ary\'s numbers', 'Open (BL-209, question D2)', '–']
  ],
  notes: NOTE
});

// ── 14 Oct ─────────────────────────────────────────────────────────────
add({ type: 'section', kicker: 'Weekly SC Hub · 14 Oct', title: 'DA, ROP and call-off (OSIP)', body: 'DRC-1 to DRC-19, accepted 19 Oct ("approve all"), built in MRs !4 to !13 (19 to 20 Oct). Values tagged [Default] stay provisional until the team confirms them.', notes: NOTE });
const drcCols = ['Requirement', 'Status in prod', 'Waits on'];
const drcW = [4.2, 5.2, 2.73];
add({
  type: 'table', kicker: '14 Oct · part 1 of 3', title: 'Demand anticipation and the plan check',
  columns: drcCols, colW: drcW,
  rows: [
    ['DRC-1 Suppliers see their own DA', 'Built, switched off: suppliers must not plan on unconfirmed figures', 'Owner; B1, B4'],
    ['DRC-2 Rolling DA over the lead time', 'Built', 'A9'],
    ['DRC-3 DA history and audit view', 'Built', '–'],
    ['DRC-4 Plan vs execution check', 'Built; since 28 Oct Total DA vs Total OSPO', 'N1'],
    ['DRC-5 Delayed call-off needs supplier approval', 'Built: Approve / Reject the delay', '–'],
    ['DRC-6 Lead time by step', 'Built', '–'],
    ['DRC-18 LTP vs FG demand, consumption', 'Built on [Default]; consumption typed until the SAP GI feed', 'SAP feed']
  ],
  notes: NOTE
});
add({
  type: 'table', kicker: '14 Oct · part 2 of 3', title: 'Reorder points, safety and buffers',
  columns: drcCols, colW: drcW,
  rows: [
    ['DRC-7 Safety order and safety', 'Built; 13-week SD since 28 Oct', 'B1, B4'],
    ['DRC-9a Strategic buffer', 'Built on [Default]', 'C4'],
    ['DRC-9b Production limit', 'Built: allocated capacity as a placeholder', 'Q8'],
    ['DRC-9c Protection buffer', 'Built as a proposal, display only', 'Owner; C3'],
    ['DRC-10 System ROPs and Max per level', 'Built on [Default]; ROP FS removed 28 Oct', 'B8, N4, N6'],
    ['DRC-11 CV, stable or fluctuative', 'Built; 6 monthly buckets since 28 Oct', '–'],
    ['DRC-19 Automatic OSIP level', 'Built as a proposal ("Use suggestion")', 'Owner; C2']
  ],
  notes: NOTE
});
add({
  type: 'table', kicker: '14 Oct · part 3 of 3', title: 'Call-off trigger, feedstock, NPD, sandbox',
  columns: drcCols, colW: drcW,
  rows: [
    ['DRC-13 Call-off trigger at ROP Fisik', 'Built; quantity = minimum delivery. Not visible in the demo: needs the eWM stock feed', 'eWM feed; MDQ'],
    ['DRC-14 Cycle f per supplier', 'Built, editable per supplier', '–'],
    ['DRC-8 Supplier confirms feedstock', 'Built: daily on a pull agreement, else weekly', 'N7'],
    ['DRC-15a Feedstock reconcile', 'Built', '–'],
    ['DRC-15b Leftover rule at PO end', 'Built as a proposal', 'Owner'],
    ['DRC-12a NPD tag and ROP review', 'Built on [Default]', 'N5'],
    ['DRC-12b NPD vs CMM, code rules', 'On hold with MDM', 'MDM'],
    ['DRC-17 What-if sandbox', 'Built: "Try a what-if"', '–']
  ],
  notes: NOTE
});

// ── 28 Oct ─────────────────────────────────────────────────────────────
add({ type: 'section', kicker: 'Team answers and owner rulings · 28 Oct', title: 'What the answers changed', body: 'Septiana (Material Planning) answered 16 of 23 questions. The owner ruled the same day, and the build went live (MR !57; BL-232 in MR !58, live 2 Nov).', notes: NOTE });
add({
  type: 'table', kicker: '28 Oct · rulings', title: 'Eight changes live, one held',
  columns: ['#', 'What changed', 'Status'],
  colW: [0.9, 8.6, 2.63],
  rows: [
    ['3.1', 'Plan check = Total DA vs Total OSPO; SOH, OSPR, PR shown as context only (A2)', 'Live'],
    ['3.2', 'Safety order SD over the next 13 weeks of LTP (B2); ROP Fisik part waits on B1', 'Live (ROP Order)'],
    ['3.3', 'CV over 6 monthly buckets, threshold 0.5 (C1)', 'Live'],
    ['3.4', 'ROP FS removed; ROP Supplier = demand × bottleneck lead time (B10)', 'Live'],
    ['3.5', 'Z and g per material (B3, B7)', 'Live'],
    ['3.6', 'Level 6 (JIT): which demand replaces LTP (B5)', 'Held: asked as N6'],
    ['3.7', 'Cycle f editable per supplier (B6)', 'Live'],
    ['3.8', 'Feedstock confirmation daily on a pull agreement, else weekly (E2)', 'Live'],
    ['3.9', 'Call-off quantity = supplier\'s minimum delivery, rounded like Max (F5)', 'Live']
  ],
  caption: 'Confirmed by the team, no longer provisional: A1, A6, A11, B3, B5 (levels 1 to 5, NPD), C1, D1, E1.',
  notes: NOTE + ' Source: SC-HUB-MATERIAL-TEAM-ANSWERS-2026-10.md section 3.'
});
add({
  type: 'table', kicker: '28 Oct and after', title: 'Follow-up rulings',
  columns: ['Item', 'Ruling', 'Status'],
  colW: [1.6, 7.9, 2.63],
  rows: [
    ['BL-230', 'A minimum delivery above Max is still called off, flagged "Above Max" (28 Oct)', 'Live; not in the demo'],
    ['BL-231', 'The PPT 7 golden case stays on the lead-time SD variant (28 Oct)', 'Ruled'],
    ['BL-232', 'A balance below the minimum delivery is called off, flagged, PR for the rest (28 Oct)', 'Live 2 Nov; not in the demo'],
    ['KPI-2', 'An early receipt Material Planning confirmed counts as on time (2 Nov)', 'Not built (BL-234)'],
    ['BL-236', 'Stock, capacity and feedstock confirmed together by the Thursday cutoff (2 Nov)', 'Live'],
    ['BL-235', 'Promotion entry per SKU (2 Nov)', 'Backlog']
  ],
  notes: NOTE
});

// ── Questions ──────────────────────────────────────────────────────────
add({ type: 'section', kicker: 'For the Material Planning team', title: '29 questions still open', body: 'Same IDs as the planner deck (MR !83) and the C2 message, reply asked by Friday 6 November. "Today" is what the hub does until the answer arrives.', notes: NOTE + ' Questions verbatim in sc-hub-vision/work-tracker/C2-MATERIAL-TEAM-MESSAGE-2026-10-30.md.' });
const qCols = ['ID', 'Question', 'Today in the hub'];
const qW = [1.3, 6.0, 4.83];
add({
  type: 'table', kicker: 'Questions · 1 of 4', title: 'DA and the plan check',
  columns: qCols, colW: qW,
  rows: [
    ['A9', 'Additional PO formula, and who issues it: planner or SAP MRP?', 'Σ DA − OSPO, OSPO counting the new PO'],
    ['N1 (A2)', 'The answer says MRP raises a PR "when demand < supply". Typo?', 'Shortfall → PR recommendation'],
    ['N2 (A6)', 'The example item is PCEB (confirmation only)', '–'],
    ['D1', 'Does a call-off surplus in one week reduce later weeks\' gaps? For how long?', 'Carried forward until a week with no DA'],
    ['D2', 'Ary: one spike case with numbers per week', 'Placeholders']
  ],
  notes: NOTE
});
add({
  type: 'table', kicker: 'Questions · 2 of 4', title: 'ROP and safety',
  columns: qCols, colW: qW,
  rows: [
    ['B1', 'Final ROP Fisik safety formula: deck or sheet?', 'Deck (PPT 11); sheet as a switch'],
    ['B4', 'Safety rounding: MPQ, koli or MOQ?', 'Up to a multiple of MPQ'],
    ['B8', 'Max formula; koli per pallet or pack size?', 'Deck; koli per pallet (Non stc), pack size (stc)'],
    ['N3 (B7)', 'Does g also apply to ROP Order?', 'ROP Fisik only'],
    ['N4 (B10)', 'What is "ROP to principal"?', 'Follows the XLS columns'],
    ['N6 (B5)', 'Level 6 (JIT): which demand replaces LTP?', 'CEILING(c × d, pallet), c = daily LTP; held']
  ],
  notes: NOTE
});
add({
  type: 'table', kicker: 'Questions · 3 of 4', title: 'OSIP level, NPD, feedstock, Max Supplier',
  columns: qCols, colW: qW,
  rows: [
    ['C2', 'Level definitions: the Google Doc link', 'Level per material, default 4'],
    ['C3', 'Protection buffer', 'Proposal only'],
    ['C4', 'Strategic buffer', 'LTP − average of 3 months before festive'],
    ['N5 (D1)', 'What do CO and IR mean in the NPD rule?', 'Not defined'],
    ['N7 (E2)', 'What happens when a supplier does not confirm?', 'Shown as missed; no further rule'],
    ['N8 (E1)', 'What does "LT spare" mean?', 'LT spare = 0, feedstock target 0'],
    ['Q8 (E3)', '"Max Supplier": Prod Cap/week (MADR) or Supplier Cap/week (SADR)?', 'Allocated capacity as a placeholder']
  ],
  notes: NOTE
});
add({
  type: 'table', kicker: 'Questions · 4 of 4', title: 'Labels, backlog items, proposed defaults',
  columns: qCols, colW: qW,
  rows: [
    ['L1–L4', '"Would be", "Surplus absorbed", "After the check", "Called off, not yet shipped": right words?', 'As listed'],
    ['L5', 'The 12 alert rules: right names and definitions?', 'Next two slides'],
    ['BL-71', 'Over-delivery measured against the order or the ASN?', 'ASN when linked, else order'],
    ['BL-140', 'ASN against a value-limit PO line', 'Open quantity 0: cannot ship'],
    ['BL-149', 'The SOP document to link on the Stock page', 'SOP named, not linked'],
    ['MDQ', 'Supplier minimum delivery = MOQ?', 'MDQ = MOQ [Proposed]'],
    ['Pull', 'Pull agreement default "no" for every supplier?', 'No [Proposed]'],
    ['LT', 'No default bottleneck lead time?', 'ROP Supplier "not available"']
  ],
  caption: 'Also asked: the Google Doc link for C2, and Status and Tanggal filled on the answered rows of the sheet.',
  notes: NOTE
});

// ── Alerts ─────────────────────────────────────────────────────────────
add({
  type: 'table', kicker: 'Alerts to confirm (L5, BL-150)', title: 'The 12 alerts the hub raises today',
  columns: ['#', 'Rule (as on screen)', 'Shown to'],
  colW: [0.6, 9.4, 2.13],
  rows: [
    ['1', 'PTI stock is below the PTI reorder point', 'PTI'],
    ['2', 'Supplier stock is below the system-calculated supplier reorder point (ROP Supplier)', 'PTI, supplier'],
    ['3', 'PTI stock runs out before the next incoming delivery', 'PTI'],
    ['4', 'Allocated capacity is below the LTP', 'PTI, supplier'],
    ['5', 'Supplier stock figures are out of date', 'PTI, supplier'],
    ['6', 'Supplier stock and incoming do not cover the next 30 days of demand', 'PTI, supplier'],
    ['7', 'Committed quantity below forecast beyond tolerance', 'PTI, supplier'],
    ['8', 'No supplier lead time on record', 'PTI'],
    ['9', 'A confirmed call-off due within the lead time is larger than the supplier stock plus production due before the need date', 'PTI'],
    ['10', 'The supplier marked this material Discontinued: it needs another source', 'PTI'],
    ['11', 'A blanket PO runs out soon: raise the next PO by its "new PO needed by" week', 'PTI'],
    ['12', 'Supply above demand anticipation (DA) is more than the last week of the horizon can absorb', 'PTI']
  ],
  caption: 'Risk: High below 1 × supplier lead time of cover, Medium below 1.5 ×; thresholds per material group. Closing needs a reason.',
  notes: NOTE + ' Source: research/ALERT-RULES-FOR-TEAM-2026-11-02.md; rules ALERT_RULES and PTI_ONLY_RULES in src/services/transitions/inventoryAlertRules.js.'
});
add({
  type: 'cards', kicker: 'Alerts to confirm (L5, BL-150)', title: 'Four questions on the alerts',
  intro: 'The team\'s own list from the 23 Sept meeting (MOM 6.3) was never shared, so these rules come from the build.',
  cards: [
    { mark: '1', head: 'Missing?', body: 'Is any alert from your 23 Sept list not here? Each missing one becomes a new rule.' },
    { mark: '2', head: 'Not wanted?', body: 'Is any rule here not wanted, or worded differently from how you say it?' },
    { mark: '3', head: 'Right audience?', body: 'Is "Shown to" right for each rule: PTI only, or PTI and the supplier?' },
    { mark: '4', head: 'One card per material?', body: 'Once the list is final: one card per supplier × material instead of one per rule?' }
  ],
  cardH: 3.2,
  notes: NOTE + ' Question 4 is INV-D5 / P-04, waiting on this list.'
});

// ── Owner and demo ─────────────────────────────────────────────────────
add({
  type: 'table', kicker: 'Waiting on the owner', title: 'Six items for Levi, not the team',
  columns: ['Item', 'What is needed'],
  colW: [4.4, 7.73],
  rows: [
    ['Protection buffer (BL-205, DRC-9c)', 'Accept, change or drop the proposal (also needs C3)'],
    ['Feedstock leftover rule (BL-207, DRC-15b)', 'Pick: flag the liability (current), show only, or carry to the next PO'],
    ['Automatic OSIP level (BL-208, DRC-19)', 'Accept the suggestion rule (also needs C2)'],
    ['Supplier DA view (DRC-1)', 'When to switch it on (after B1, B4)'],
    ['Week tables, waves 2 and 3 (CAP-1)', 'Confirm each of the 7 remaining tables first'],
    ['Early receipt confirmed by MP (BL-234)', 'Build it: today one 7-day window applies to every early receipt']
  ],
  notes: NOTE
});
add({
  type: 'list', kicker: 'Before the demo', title: 'What the demo cannot show yet',
  intro: 'Say these up front so they are not read as defects.',
  items: [
    { lead: 'ROP Fisik drafts:', text: 'none in the demo, so "Below minimum delivery" and "Above Max" cannot be shown; the trigger runs on the eWM stock feed.' },
    { lead: 'Sample data:', text: 'order-plan drafts and Publish to suppliers are withheld.' },
    { lead: 'Consumption:', text: 'typed or uploaded by the planner until the SAP goods-issue feed exists.' },
    { lead: 'Supplier DA view:', text: 'built, switched off.' },
    { lead: 'Messages:', text: 'no email or WhatsApp for supplier questions or alerts; everything stays in the portal.' }
  ],
  notes: NOTE + ' Full list: SCENARIOS.md section 4 (27 items).'
});

// Room-sized text: tables scale with their row count; cards and the list read from the back of the room.
slides.forEach((sl) => {
  if (sl.type === 'table') sl.fontSize = sl.rows.length > 9 ? 13 : sl.rows.length > 6 ? 14 : 15;
  if (sl.type === 'cards') sl.bodySize = 14;
  if (sl.type === 'list') sl.fontSize = 17;
});

module.exports = {
  docTitle: 'SC Hub: 07, 14 and 28 Oct meetings',
  footer: 'SC Hub · 07, 14, 28 Oct meetings · 4 Nov 2026',
  slides
};
