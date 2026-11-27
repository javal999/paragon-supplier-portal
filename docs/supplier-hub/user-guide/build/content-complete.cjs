// Version A: the complete guide (PTI and supplier). Source: ../SCENARIOS.md at GitLab main aeabdc83.
// Every slide's evidence is in its notes; labels are the app's English labels, copied, never reworded.
const P = (text) => ({ actor: 'PTI', text });
const S = (text) => ({ actor: 'SUP', text });
const BASIS = 'GitLab main aeabdc83 (2026-11-02)';

function uc(n, name, total) {
  return (k, what) => `UC${n} · ${name} · ${what || `step ${k} of ${total}`}`;
}

const slides = [];
const add = (s) => slides.push(s);

// ── Intro ────────────────────────────────────────────────────────────────
add({
  type: 'title',
  title: 'Paragon Supplier Portal',
  subtitle: 'How PTI and suppliers use it, one use case at a time',
  meta: `User guide, complete version (PTI and supplier) · Material planners' session, Wednesday 4 November 2026 · Demo build, ${BASIS}`,
  notes: 'Built from docs/supplier-hub/user-guide/SCENARIOS.md. Every behavior has file:line evidence there and in each slide\'s notes. Supplier onboarding and registration are out of scope (a colleague owns them). The supplier-only version is Paragon-Supplier-Portal-User-Guide-Supplier.pptx.'
});
add({
  type: 'cards',
  kicker: 'Before you start',
  title: 'How to read this deck',
  intro: 'Each use case is one section. Every step names who acts, the menu to open, and the status after it.',
  cards: [
    { head: 'Positive end-to-end', body: 'The normal path, from the first action to a closed outcome. One slide per step.' },
    { head: 'When it goes wrong', body: 'Full runs where someone rejects, a rule blocks, or data does not match: trigger, what the system shows, who acts next.' },
    { head: 'Edge cases', body: 'Boundary conditions inside a valid flow: tolerances, flags, partial quantities, missing permissions. 1 row each.' }
  ],
  legend: [
    { actor: 'PTI', text: 'A PTI user. The role that can act is named in the step, for example Planning or Finance.' },
    { actor: 'SUP', text: 'A supplier user. The lane that can act is named in the step: Commercial, Fulfilment or Back Office.' }
  ],
  footnote: 'All screens use demo data, captured from a build of aeabdc83, the commit prod runs. Nothing in this build reaches SAP.',
  notes: 'Evidence: services/data/fixturePresent.js:184,206 (demo date 2026-08-31); SCENARIOS.md header and section 5.'
});
add({
  type: 'table',
  kicker: 'Since 6 October',
  title: 'What changed in this guide',
  columns: ['Use case', 'Change since the 6 Oct guide'],
  colW: [3.4, 8.73],
  rows: [
    ['All', '(i) term tips on agreed terms, Help & glossary, top-bar search (Ctrl K), weekly plan card on My tasks'],
    ['UC1 PO to goods receipt', 'Ends at the goods receipt (RFx and invoices left out of this guide); Create ASN from the PO page opens the ASN wizard; both receipt answers need a comment'],
    ['UC2 Call-offs', 'Hub drafts at ROP Fisik with flags (live stock feed only); delay approval; blanket PO run-out'],
    ['UC3 Forecast', 'No commitment date; Submit all per period; Force Majeure and Discontinued; Move demand to several suppliers; Request revision off'],
    ['UC4 Compliance', 'Labels re-checked; the amber pill reads "Expiring Soon"'],
    ['UC5 Stock & capacity', 'Weekly update now also counts capacity and feedstock; feedstock confirmation; 3 capacity states; Copy to all weeks; PTI accept / Undo; PTI questions'],
    ['UC6 Alerts', 'Next step and Impact in N days; asks named for their topic; 12 rules'],
    ['UC7 Demand anticipation', 'New, PTI only: publish DA, plan vs execution, Below DA → draft call-off, DA history']
  ],
  notes: 'Evidence: SCENARIOS.md section 2 table; git log 7078ea3..aeabdc83.'
});
add({
  type: 'step',
  kicker: 'Start · getting in · step 1 of 4',
  title: 'Sign in with Demo Mode',
  menu: 'Sign-in page',
  shot: 'INTRO-1-signin.png', route: '#/login', seat: '–', record: '–',
  steps: [
    P('View as Buyer: the PTI seat with all 6 PTI roles, lands on My tasks'),
    S('View as Supplier: PT Sample Packaging Indonesia (sup-007), all 3 lanes, lands on To do'),
    P('Email and password are ignored in this build'),
    S('Switch side any time with Portal view: PTI / Supplier in the sidebar')
  ],
  statusAfter: 'Signed in as the demo seat',
  notes: 'Evidence: src/pages/auth/Login.jsx:129-130,304,326 (the buttons read "i View as Buyer" / "i View as Supplier": the i is literal text, section 4 item 19); src/data/mockSuppliers.js:227-230; src/lib/i18n/hub.js:10-13.'
});
add({
  type: 'step',
  kicker: 'Start · getting in · step 2 of 4',
  title: '"Menu for" filters menus; Roles grant actions',
  menu: 'Avatar menu (top right)',
  shot: 'INTRO-2-identity-pti.png', route: '/buyer/home', seat: 'PTI, avatar menu open', record: '–',
  steps: [
    P('Menu for: Material Planner, Buyer, Finance or All PTI roles. Changes menus only.'),
    P('Roles: tick or untick business roles. These decide which actions you can take.'),
    S('Suppliers have no Menu for. Their Roles list holds the 3 lanes.'),
    P('Help & administration holds the admin pages and Help & glossary')
  ],
  statusAfter: 'Menus and permissions change at once; the last role cannot be removed',
  notes: 'Evidence: src/lib/i18n/hub.js:102-125; src/components/layout-v2/IdentityPanel.jsx; src/components/layout-v2/navConfig.js:300-364.'
});
add({
  type: 'step',
  kicker: 'Start · getting in · step 3 of 4',
  title: 'Start every day from Home',
  menu: 'Home → My tasks (PTI) · Home → To do (Supplier)',
  shot: 'INTRO-3-mytasks-pti.png', route: '/buyer/home', seat: 'PTI, Menu for Material Planner', record: 'weekly plan card',
  steps: [
    P('My tasks: what needs your action, most urgent first'),
    P('Weekly plan card: "Weekly plan, step N of M" and the input check'),
    P('Each task\'s Open lands on exactly the rows it counts'),
    S('To do: what Paragon waits for, grouped by area, nearest deadline first'),
    S('Top of To do: weekly stock update and "PTI has N questions for you"')
  ],
  statusAfter: 'You open the page each task points to',
  notes: 'Evidence: src/lib/i18n/hub.js:129-139,188-220; src/pages-v2/BuyerHome.jsx:203,483; src/pages-v2/SupplierHome.jsx:600-638; src/lib/i18n/inventoryCapacity.js:571-572,613. Supplier screen: INTRO-4-todo-supplier.png.'
});
add({
  type: 'step',
  kicker: 'Start · getting in · step 4 of 4',
  title: 'Help on every page, and "Awaiting …"',
  menu: 'Any page',
  shot: 'INTRO-5-term-tip.png', route: '/supplier/capacity', seat: 'Supplier', record: '(i) on "Allocated" open',
  steps: [
    S('(i) beside a term: what it means, how it is calculated, also called, not'),
    P('Help & glossary (avatar menu) lists every term'),
    P('Search... (Ctrl K) finds any page in your own menu'),
    S('No lane for an action: "Awaiting {lane}" replaces the button'),
    P('"No role holds this action": nobody can do it in this build')
  ],
  statusAfter: 'Nothing changes until a user with the named role acts',
  notes: 'Evidence: src/lib/i18n/forecastUx.js:54-56; src/components/forecast/TermTip.jsx:146-165; src/lib/glossary/termLabels.glossary.js; src/lib/i18n.js:540,573; src/components/layout-v2/TopBarSearch.jsx:37-38; src/lib/i18n/roles.js:49-53. Awaiting screen: INTRO-6-awaiting-supplier.png (Supplier without Fulfilment on /supplier/inventory).'
});
add({
  type: 'table',
  kicker: 'Who can do what',
  title: 'PTI roles and supplier lanes',
  columns: ['Role or lane', 'Side', 'Main actions it holds'],
  colW: [2.6, 1.3, 8.23],
  rows: [
    ['Procurement', 'PTI', 'RFI, RFQ, RFP: create, publish, award, cancel. PR approve and reject.'],
    ['Requisitioner', 'PTI', 'PR create, submit, revise'],
    ['Receiving', 'PTI', 'Goods receipts; flag ASNs'],
    ['Finance', 'PTI', 'Invoice payment release and dispute'],
    ['Compliance', 'PTI', 'Document requests and confirmation; alert thresholds and stale periods'],
    ['Planning', 'PTI', 'Call-offs, stock access, recorded stock, commitments, capacity decisions, questions to suppliers, DA publish'],
    ['Supplier Commercial', 'Supplier', 'Quotations, RFI and RFP answers, firm offers, forecast commitments'],
    ['Supplier Fulfilment', 'Supplier', 'PO confirm, ASN, receipt answers, call-offs, stock, feedstock, capacity, answers to PTI'],
    ['Supplier Back Office', 'Supplier', 'Invoices, document declarations, forecast acknowledgement']
  ],
  notes: 'Evidence: src/services/transitions/businessRoles.js (procurement :144, receiving :244, finance :247, compliance :261 with thresholds :303, planning :353 incl. forecast:publish :371, supplierask:raise :404, capacitydecision:accept :409, requisitioner :413, commercial :442, fulfilment :484 incl. feedstock:confirm :518, supplierask:answer :522).'
});
add({
  type: 'table',
  kicker: 'Capability map',
  title: 'Which menu each role uses, per use case',
  columns: ['Use case', 'PTI: Material Planner', 'PTI: Buyer', 'PTI: Finance', 'Supplier'],
  colW: [2.3, 3.5, 2.2, 1.3, 2.83],
  fontSize: 12,
  rows: [
    ['UC1 PO to goods receipt', 'Purchase orders · Shipments & ASN · Goods receipts', '–', '–', 'Purchase orders · Shipments & ASN · Goods receipts'],
    ['UC2 Call-offs', 'Call-offs · What to order', '–', '–', 'Call-offs · Shipments & ASN'],
    ['UC3 Forecast', 'This week · Publish to suppliers · Foresight commitments', '–', '–', 'Foresight commitments · Capacity'],
    ['UC4 Compliance', '–', 'Supplier documents', '–', 'Profile & documents'],
    ['UC5 Stock & capacity', 'Stock · Capacity · Supplier access · Supplier follow-ups', '–', '–', 'Stock · Capacity · To do'],
    ['UC6 Alerts', 'Alerts · My tasks', '–', '–', 'To do'],
    ['UC7 Demand anticipation', 'Demand anticipation (DA) · What to order · Call-offs · DA history', 'DA history', 'DA history', '–']
  ],
  caption: 'Columns follow the "Menu for" view. RFx (Sourcing) and Invoices are not in this guide. Full list in the Menu Directory at the end.',
  notes: 'Evidence: src/components/layout-v2/navConfig.js:88-296; labels src/lib/i18n/hub.js:17-99.'
});

// ── UC1 PO to goods receipt (invoice steps left out, owner 2026-11-02) ───────────────────────────────────────────────────
const u2 = uc(1, 'Purchase order to goods receipt', 3);
add({
  type: 'overview', kicker: 'Use case 1 of 7', title: 'UC1 · Purchase order to goods receipt',
  purpose: 'The supplier confirms the PO and ships against an ASN; PTI receives and posts the goods receipt; the supplier answers any receipt discrepancy. Invoicing and payment are not part of this guide.',
  menus: [{ actor: 'PTI', text: 'Order collaboration → Goods receipts' }, { actor: 'SUP', text: 'Orders → Purchase orders · Shipments & ASN · Goods receipts' }],
  lanes: {
    pti: [{ n: 3, label: 'Create GR, post to SAP' }, { n: 5, label: 'Reconcile or resolve' }],
    sup: [{ n: 1, label: 'Confirm the PO (acknowledge is optional)' }, { n: 2, label: 'Create and submit ASN' }, { n: 4, label: 'Answer a receipt discrepancy' }]
  },
  caption: 'The PO itself comes from SAP. Steps 4 and 5 happen only when the receipt is short or has rejected lines.',
  notes: 'Evidence: SCENARIOS.md UC1.'
});
add({
  type: 'step', kicker: u2(1), title: 'Supplier confirms the PO',
  menu: 'Orders → Purchase orders',
  shot: 'UC2-1-supplier.png', route: '/supplier/orders', seat: 'Supplier', record: 'PO-2026-00121 Sent',
  steps: [
    S('Open the PO (To do: "Purchase orders to respond to")'),
    S('Confirm order, with the confirmed quantity and date'),
    S('Acknowledge receipt is optional: Confirm is allowed straight from Sent'),
    S('Or: Adjust → Send adjustment, or Reject → Send rejection')
  ],
  statusAfter: 'PO: Sent → Confirmed (acknowledge is optional)',
  notes: 'Evidence: src/lib/i18n/supplierOrders.js:65; src/pages-v2/SupplierOrders/components/PanelFooter.jsx:94-103,125-126,146-156,163-192; src/pages-v2/SupplierOrders/hooks/usePoCommands.js:74,164,203; src/lib/i18n/hub.js:188.'
});
add({
  type: 'step', kicker: u2(2), title: 'Supplier creates the ASN from the PO',
  menu: 'Orders → Purchase orders → Shipments & ASN',
  shot: 'UC2-2-supplier.png', route: '/supplier/shipments', seat: 'Supplier', record: 'PO-2026-00127 Confirmed',
  steps: [
    S('On a Confirmed PO: Create ASN (or Create ASN now after confirming)'),
    S('The ASN wizard opens on Shipments & ASN for that PO'),
    S('Check lines, batch, carrier and tracking'),
    S('Submit ASN')
  ],
  statusAfter: 'ASN: Draft → Submitted',
  notes: 'Evidence: src/lib/i18n/supplierOrders.js:58; src/pages-v2/SupplierOrders/index.jsx:338-354; src/pages-v2/shipments/asnWizardEntry.js:42; src/pages-v2/SupplierShipments/index.jsx:306,346-349; ASN column "Batch" (TL-D35, src/lib/i18n/supplierShipments.js). New since 6 Oct: Create ASN on the PO page used to show a toast only (commit 9d4c5a6b).'
});
add({
  type: 'step', kicker: u2(3), title: 'PTI receives the goods',
  menu: 'Order collaboration → Goods receipts',
  shot: 'UC2-3-pti.png', route: '/buyer/goods-receipt', seat: 'PTI, Menu for Material Planner', record: 'New GR',
  steps: [
    P('Receiving: New GR'),
    P('Source: pick the inbound ASN'),
    P('Details, then quality per line'),
    P('Create GR: approves and posts to SAP in one go')
  ],
  statusAfter: 'GR: Approved → Posted to SAP',
  notes: 'Evidence: src/pages-v2/BuyerGoodsReceipt/components/GoodsReceiptHeader.jsx:63; src/components/v2-features/GRInspectionWizard/index.jsx:206; src/services/transitions/grRollup.js.'
});
add({
  type: 'table', kicker: u2(0, 'negative scenarios'), title: 'When it goes wrong',
  columns: ['Trigger', 'What the system shows', 'Who acts next', 'Menu'],
  colW: [3.0, 3.6, 3.3, 2.23],
  rows: [
    ['Supplier adjusts the PO', 'PO: Adjusted', 'PTI: Reject counter-offer → Send back to supplier', 'Purchase orders'],
    ['GR has short or rejected lines', 'ASN flagged Discrepancy', 'Supplier: Respond → Acknowledge or Dispute, comment required', 'Goods receipts'],
    ['Supplier disputes the receipt', 'Dispute open', 'PTI: Reconcile, or Resolve', 'Goods receipts']
  ],
  notes: 'Evidence: src/lib/i18n/orderCollaboration.js:51-55,80,82; src/pages-v2/BuyerOrders/components/PoCounterReview.jsx:64,96; src/lib/i18n/fulfilmentCollaboration.js:123,135,136,244; src/pages-v2/SupplierGoodsReceipts.jsx:357-379; src/lib/i18n/goodsReceipt.js:301; src/lib/i18n/buyerInvoices.js:94,97; src/services/transitions/fulfilmentRules/invoice.js:284-285.'
});
add({
  type: 'table', kicker: u2(0, 'edge cases'), title: 'Edge cases',
  columns: ['Condition', 'What happens', 'Menu'],
  colW: [4.0, 5.5, 2.63],
  rows: [
    ['Confirmed qty above ordered qty', 'Blocked', 'Purchase orders'],
    ['ASN qty above the open qty', 'Refused unless an over-ship reason is given', 'Shipments & ASN'],
    ['Shelf life too short', 'Request shelf-life exception; goes to PTI for approval', 'Shipments & ASN'],
    ['GR on Quality Hold', 'Request lab retest → Under Inspection', 'Goods receipts'],
    ['Supplier seat without the Fulfilment lane', '"Awaiting Supplier Fulfilment" replaces Create ASN', 'Purchase orders']
  ],
  notes: 'Evidence: src/services/transitions/policies/purchaseOrder.js:38,51-54; src/services/transitions/fulfilmentRules/asn.js:160-162; src/lib/i18n/fulfilmentCollaboration.js:64; src/services/transitions/hubSettings.js:119-147; src/services/data/mock/MockCommandService.js:1261,1282; src/lib/i18n/goodsReceipt.js:72; src/pages-v2/SupplierOrders/index.jsx:338-354.'
});

// ── UC2 Call-offs ───────────────────────────────────────────────────────
const u3 = uc(2, 'Call-offs against agreements', 4);
add({
  type: 'overview', kicker: 'Use case 2 of 7', title: 'UC2 · Call-offs against agreements',
  purpose: 'PTI releases call-offs against a blanket PO line; the supplier confirms, changes or rejects, then dispatches. New: with a live stock feed the hub drafts a call-off itself at ROP Fisik and flags quantities below the minimum delivery or above Max (none in the demo).',
  menus: [{ actor: 'PTI', text: 'Order collaboration → Call-offs' }, { actor: 'SUP', text: 'Orders → Call-offs · Shipments & ASN' }],
  lanes: {
    pti: [{ n: 1, label: 'New call-off on a blanket PO line' }, { n: 2, label: 'Release to supplier' }, { n: 4, label: 'Approve if outside tolerance' }],
    sup: [{ n: 3, label: 'Respond → Send confirmation' }, { n: 5, label: 'Send dispatch notice' }, { n: 6, label: 'Create the ASN' }]
  },
  caption: 'Step 4 happens only when the confirmation is outside tolerance (more than +5% or a later date).',
  notes: 'Evidence: SCENARIOS.md UC2; src/lib/i18n/callOffs.js; src/services/transitions/callOffTriggerRules.js.'
});
add({
  type: 'step', kicker: u3(1), title: 'PTI starts a call-off and releases it',
  menu: 'Order collaboration → Call-offs, tab To act',
  shot: 'UC3-1-pti.png', route: '/buyer/call-offs', seat: 'PTI, Menu for Material Planner', record: 'New call-off on PO-2025-00117',
  steps: [
    P('New call-off on a blanket PO line: the panel shows what remains'),
    P('Type, Quantity and Need date'),
    P('Release to supplier (or Save as draft)'),
    P('Live feed only: hub drafts marked Drafted at ROP Fisik, with flags')
  ],
  statusAfter: 'Call-off: Draft → Awaiting Confirmation',
  notes: 'Evidence: src/lib/i18n/callOffs.js:59,159-160,173-203,337; src/pages-v2/BuyerCallOffs/components/DraftSection.jsx:88,109,127; src/pages-v2/BuyerCallOffs/components/ropFisikTrigger.jsx:61-143; src/services/transitions/callOffTriggerRules.js:1-35,357-399; src/services/transitions/flows/callOff.flow.js:65-126.'
});
add({
  type: 'step', kicker: u3(2), title: 'Supplier confirms the call-off',
  menu: 'Orders → Call-offs, filter Awaiting your confirmation',
  shot: 'UC3-2-supplier.png', route: '/supplier/call-offs', seat: 'Supplier', record: 'CO-2026-0003 Awaiting Confirmation',
  steps: [
    S('Respond on the call-off'),
    S('Confirm as requested, or with a new date, a different quantity, or in 2 deliveries'),
    S('Read the hint: within tolerance is accepted at once'),
    S('Send confirmation (or Reject → Send rejection)'),
    P('Outside tolerance: Planning approves or rejects, with a comment')
  ],
  statusAfter: 'Confirmed (or waiting for PTI approval)',
  notes: 'Evidence: src/lib/i18n/callOffs.js:17,22,241-246,269-287; src/pages-v2/SupplierCallOffs/components/CallOffRow.jsx:88-94; src/pages-v2/SupplierCallOffs/components/RespondForm.jsx:50-61,138,151; src/pages-v2/BuyerCallOffs/components/ReviewSection.jsx:33-65.'
});
add({
  type: 'step', kicker: u3(3), title: 'PTI delays a call-off; the supplier answers',
  menu: 'Call-offs (both sides)',
  shot: 'UC3-4-pti.png', route: '/buyer/call-offs', seat: 'PTI, Menu for Material Planner', record: 'a confirmed call-off',
  steps: [
    P('Change call-off → Reason type: LTP dropped'),
    P('Later need date, same quantity → Change and ask again'),
    S('Approve the delay, or Reject the delay, keep {date}'),
    S('Both sides see "Delay for an LTP drop" in the history')
  ],
  statusAfter: 'Confirmed; the need date moves only if the supplier approves',
  notes: 'Evidence: src/lib/i18n/callOffs.js:216-238; src/pages-v2/BuyerCallOffs/components/ChangeSection.jsx:64-121; src/pages-v2/SupplierCallOffs/components/DelayAnswerForm.jsx:41-57; src/pages-v2/callOffs/CallOffDelays.jsx; src/services/transitions/callOffRules.js:477-491. BL-191.'
});
add({
  type: 'step', kicker: u3(4), title: 'Supplier dispatches and creates the ASN',
  menu: 'Orders → Call-offs → Shipments & ASN',
  shot: 'UC3-3-supplier.png', route: '/supplier/call-offs', seat: 'Supplier', record: 'a confirmed call-off',
  steps: [
    S('Open the confirmed call-off'),
    S('Send dispatch notice: Shipped date, Expected arrival, ASN optional'),
    S('Create the ASN for this call-off: the wizard opens with it chosen'),
    S('Mark "This is the last ASN for this call-off" if it is')
  ],
  statusAfter: 'Confirmed (dispatched); ASN Submitted',
  notes: 'Evidence: src/lib/i18n/callOffs.js:290-310; src/pages-v2/SupplierCallOffs/components/DispatchSection.jsx:74-179; src/pages-v2/SupplierCallOffs/components/CallOffPanel.jsx:88.'
});
add({
  type: 'table', kicker: u3(0, 'negative scenarios'), title: 'When it goes wrong',
  columns: ['Trigger', 'What the system shows', 'Who acts next', 'Menu'],
  colW: [3.2, 3.6, 3.1, 2.23],
  rows: [
    ['Supplier confirms with a new date or other quantity', '"Outside tolerance: PTI must approve this before you ship."', 'Planning: Approve, or Reject with a comment', 'Call-offs'],
    ['PTI rejects the confirmation', 'Back to Awaiting Confirmation', 'Planning: Change and ask again', 'Call-offs'],
    ['Supplier rejects the call-off', 'Rejected, with the reason', 'Planning: Change and ask again', 'Call-offs'],
    ['Supplier rejects a delay', 'Need date kept', 'Planning re-plans', 'Call-offs']
  ],
  notes: 'Evidence: src/lib/i18n/callOffs.js:216-246,269-287; src/services/transitions/flows/callOff.flow.js:129-229.'
});
add({
  type: 'table', kicker: u3(0, 'edge cases'), title: 'Edge cases',
  columns: ['Condition', 'What happens', 'Menu'],
  colW: [4.2, 5.5, 2.43],
  rows: [
    ['Drafted qty below the supplier\'s minimum delivery', 'Pill Below minimum delivery; check with the supplier (PTI only; live feed only)', 'Call-offs'],
    ['Minimum delivery does not fit under Max', 'Pill Above Max; stock goes above Max on arrival (live feed only)', 'Call-offs'],
    ['ROP Fisik reached, no blanket balance', '"Create a PR in SAP…" (live feed only)', 'What to order'],
    ['Blanket PO running out', 'Runs out, New PO needed by, Raise the next PO (within 4 weeks)', 'Call-offs, tab 3'],
    ['Call-off above the remaining agreement', 'Release disabled and refused', 'Call-offs'],
    ['Up to +5% over the requested qty', 'Accepted at once; the 5% is an admin setting', 'Call-offs'],
    ['Draft from a What to order recommendation', 'Release withheld while the plan uses simulated data', 'Call-offs'],
    ['Change after dispatch', 'Refused', 'Call-offs']
  ],
  notes: 'Evidence: src/lib/i18n/callOffs.js:34-55,80-82,155-158,190-212,284; src/services/transitions/callOffTriggerRules.js:79-87,357-399; src/services/transitions/blanketPoRules.js:48,227,271,312; src/services/transitions/hubSettings.js:89-95; src/services/data/mock/MockCommandService.js:1690-1702,1708-1727,1779.'
});

// ── UC3 Forecast ───────────────────────────────────────────────────────
const u4 = uc(3, 'Forecast collaboration', 3);
add({
  type: 'overview', kicker: 'Use case 3 of 7', title: 'UC3 · Forecast collaboration',
  purpose: 'PTI shares its forecast; the supplier commits quantities per period; PTI accepts the shortfall or moves demand to other suppliers.',
  menus: [{ actor: 'PTI', text: 'Weekly plan → This week · Foresight commitments' }, { actor: 'SUP', text: 'Planning → Foresight commitments · Capacity' }],
  lanes: {
    pti: [{ n: 1, label: 'Forecast version published' }, { n: 4, label: 'Accept, or Move demand' }],
    sup: [{ n: 2, label: 'Commit per row, Save draft' }, { n: 3, label: 'Submit all per period; Acknowledge forecast rows' }, { n: 5, label: 'Re-commit on Changes' }]
  },
  caption: 'New since 6 Oct: no commitment date (CAP-6); Request revision is switched off; Move demand splits one shortfall across several suppliers (CAP-8).',
  notes: 'Evidence: src/services/transitions/forecastConfig.js:351 (REQUEST_REVISION_ENABLED = false); commit c330f466; commit d31aa12d.'
});
add({
  type: 'step', kicker: u4(1), title: 'Supplier commits per row',
  menu: 'Planning → Foresight commitments, tab Commitments',
  shot: 'UC4-1-supplier.png', route: '/supplier/forecasts', seat: 'Supplier', record: 'FC-PK-V2 lines on PK-PETB-8801/8802',
  steps: [
    S('Enter Commitment ({uom}) and, if any, Upside ({uom})'),
    S('Below forecast: Reason below forecast → Choose a reason'),
    S('Force Majeure, Discontinued and Other need a note'),
    S('Save draft: "Draft saved (not visible to PTI)"')
  ],
  statusAfter: 'Draft, not visible to PTI',
  notes: 'Evidence: src/lib/glossary/termLabels.glossary.js:1281,1286; src/lib/i18n/forecastCollaboration.js:59-67,83,125-126,135,284; src/pages-v2/SupplierForecastCommitments/components/CommitmentRow.jsx:86-158. Spreadsheet route: Download forecast, Download commitment template, Upload commitments (:121,170-171).'
});
add({
  type: 'step', kicker: u4(2), title: 'Supplier submits by period',
  menu: 'Foresight commitments → Submit by period',
  shot: 'UC4-2-supplier.png', route: '/supplier/forecasts', seat: 'Supplier', record: '–',
  steps: [
    S('Commercial: Submit all, once per period, every material together'),
    S('Blocked? "Awaiting Supplier Fulfilment: capacity for {group}" → Confirm capacity'),
    S('Back Office: Acknowledge on Forecast-zone rows (no commitment needed)'),
    S('A new version: the Changes sub-tab lists what moved')
  ],
  statusAfter: 'Submitted: Accepted, or Outside tolerance',
  notes: 'Evidence: src/lib/i18n/forecastCollaboration.js:87-89,120-123,144,153-162; src/pages-v2/SupplierForecastCommitments/components/PeriodSubmitRow.jsx:73-76,121-140; ForecastZoneRow.jsx:51-65; ChangesTable.jsx.'
});
add({
  type: 'step', kicker: u4(3), title: 'PTI accepts or moves demand',
  menu: 'Weekly plan → Foresight commitments, tab Commitments & gaps',
  shot: 'UC4-3-pti.png', route: '/buyer/collaboration', seat: 'PTI, Menu for Material Planner', record: 'exception row for sup-007',
  steps: [
    P('Read the exceptions: shortfalls outside tolerance'),
    P('Accept → "Accept commitment" → Accept'),
    P('Or Move demand: a quantity per qualified supplier, plus a note'),
    P('Move demand publishes a new forecast version')
  ],
  statusAfter: 'Accepted by PTI · or a new version for the other suppliers',
  notes: 'Evidence: src/lib/i18n/forecastCollaboration.js:36,216-268,280; src/pages-v2/BuyerCommitments/components/ExceptionRow.jsx:123-150; src/pages-v2/BuyerCommitments/components/ActionPanelBody.jsx:115-229.'
});
add({
  type: 'table', kicker: u4(0, 'when it goes wrong · edge cases'), title: 'When it goes wrong, and edge cases',
  columns: ['Condition', 'What happens', 'Who acts next', 'Menu'],
  colW: [3.4, 4.3, 2.2, 2.23],
  rows: [
    ['Commitment below forecast', 'Outside tolerance; a reason is required', 'Planning: Accept or Move demand', 'Foresight commitments'],
    ['Capacity not confirmed', 'Submit all blocked: "Awaiting Supplier Fulfilment: capacity for {group}"', 'Supplier Fulfilment: Submit capacity', 'Capacity'],
    ['Move demand above a supplier\'s headroom', 'Warns; a total above the shortfall is refused', 'Planning', 'Foresight commitments'],
    ['New forecast version', 'Unchanged periods carry forward; others go back to awaiting', 'Supplier Commercial', 'Foresight commitments'],
    ['Firm vs Trade-off line', 'Firm: any shortfall is an exception. Trade-off: up to 10% short accepted.', 'Planning', 'Foresight commitments'],
    ['Supplier marks a material Discontinued', 'PTI alert: it needs another source', 'Planning', 'Alerts'],
    ['PTI wants a revision', 'Request revision is switched off', '–', '–']
  ],
  notes: 'Evidence: src/lib/i18n/forecastCollaboration.js:83,135,158,260-263; src/services/transitions/forecastRules.js; src/lib/i18n/inventoryCapacity.js:434-450; src/services/transitions/forecastConfig.js:351.'
});

// ── UC4 Compliance ─────────────────────────────────────────────────────
const u5 = uc(4, 'Compliance documents', 2);
add({
  type: 'overview', kicker: 'Use case 4 of 7', title: 'UC4 · Compliance documents',
  purpose: 'PTI asks for a certificate; the supplier declares it; PTI confirms or refuses it. Expiry is tracked.',
  menus: [{ actor: 'PTI', text: 'Sourcing → Supplier documents' }, { actor: 'SUP', text: 'Company → Profile & documents' }],
  lanes: {
    pti: [{ n: 1, label: 'Ask for a document' }, { n: 3, label: 'Confirm or Refuse' }],
    sup: [{ n: 2, label: 'Declare → Record declaration' }, { n: 4, label: 'Declare again if refused' }]
  },
  caption: 'No file is sent to Paragon in this build: Declare records the details only.',
  notes: 'Evidence: SCENARIOS.md UC4.'
});
add({
  type: 'step', kicker: u5(1), title: 'PTI asks; the supplier declares',
  menu: 'Supplier documents · Profile & documents',
  shot: 'UC5-2-supplier.png', route: '/supplier/documents', seat: 'Supplier', record: 'doc-006 Awaiting Upload; doc-001 Expiring Soon',
  steps: [
    P('Compliance: Ask for a document → Check it over → Open the request'),
    S('To do: "Documents PTI asked for"'),
    S('Back Office: Declare → fill in the details → Record declaration'),
    S('Expired and Expiring Soon pills show what to renew')
  ],
  statusAfter: 'Awaiting Upload → Under Review',
  notes: 'Evidence: src/lib/i18n/compliance.js:151,170,172; src/pages-v2/BuyerCompliance/components/RequestPanelFooter.jsx:34,44; src/lib/i18n/hub.js:194,196; src/lib/i18n/supplierDocuments.js:79,84; src/pages-v2/SupplierDocuments/components/DeclarationPanel.jsx:69; src/lib/statusLabel.js:43.'
});
add({
  type: 'step', kicker: u5(2), title: 'PTI confirms or refuses',
  menu: 'Sourcing → Supplier documents',
  shot: 'UC5-1-pti.png', route: '/buyer/compliance', seat: 'PTI, Menu for Buyer', record: 'doc-010 Under Review',
  steps: [
    P('Open "Declared certificates awaiting review"'),
    P('Confirm: the document becomes Valid'),
    P('Or Refuse → reason → Record refusal'),
    S('Supplier sees "{count} document was refused:" → Declare again')
  ],
  statusAfter: 'Valid, or Rejected then Under Review again',
  notes: 'Evidence: src/lib/i18n/compliance.js:99,112,113,115; src/pages-v2/BuyerCompliance/components/ReviewQueueItem.jsx:73,85; RejectReasonForm.jsx:56; src/lib/i18n/supplierDocuments.js:119,137.'
});
add({
  type: 'table', kicker: u5(0, 'when it goes wrong · edge cases'), title: 'When it goes wrong, and edge cases',
  columns: ['Condition', 'What happens', 'Who acts next', 'Menu'],
  colW: [3.4, 4.3, 2.2, 2.23],
  rows: [
    ['Declaration refused', 'Rejected, with the reason', 'Supplier Back Office: Declare again', 'Profile & documents'],
    ['Certificate past its expiry date', 'Red Expired pill; banner asks for immediate renewal (none in the demo)', 'Supplier Back Office', 'Profile & documents'],
    ['Expiring within 180 days (doc-001)', 'Amber Expiring Soon pill; To do task', 'Supplier Back Office', 'Profile & documents'],
    ['No expiry date (BPJPH)', 'Treated as no expiry', '–', 'Profile & documents'],
    ['PTI confirms a document', 'The compliance registry table is not updated', '–', 'Supplier documents']
  ],
  notes: 'Evidence: src/services/data/dayProjection.js:138,210-219; src/lib/i18n/supplierDocuments.js:34-36,59; src/services/data/documentDisplayState.js:158,176; src/lib/i18n/hub.js:194; src/pages-v2/BuyerCompliance/index.jsx.'
});

// ── UC5 Stock, feedstock, capacity ─────────────────────────────────────
const u6 = uc(5, 'Stock, feedstock and capacity', 5);
add({
  type: 'overview', kicker: 'Use case 5 of 7', title: 'UC5 · Shared stock, feedstock, capacity and PTI questions',
  purpose: 'Suppliers share stock, feedstock and capacity every week; PTI reads them by risk, decides on capacity gaps and asks the supplier when something is missing.',
  menus: [{ actor: 'PTI', text: 'Inventory & capacity → Stock · Capacity' }, { actor: 'SUP', text: 'Planning → Stock · Capacity · Home → To do' }],
  lanes: {
    pti: [{ n: 4, label: 'Stock by risk, material drawer' }, { n: 5, label: 'Accept capacity, or ask' }],
    sup: [{ n: 1, label: 'Weekly stock update' }, { n: 2, label: 'Confirm feedstock' }, { n: 3, label: 'Submit capacity' }, { n: 6, label: 'Answer PTI\'s question' }]
  },
  caption: 'Questions and answers stay in the portal: no email or WhatsApp is sent.',
  notes: 'Evidence: SCENARIOS.md UC5.'
});
add({
  type: 'step', kicker: u6(1), title: 'Supplier sends the weekly stock update',
  menu: 'Planning → Stock (or To do → Weekly stock update)',
  shot: 'UC6-1-supplier.png', route: '/supplier/inventory', seat: 'Supplier', record: 'weekly update, materials still missing',
  steps: [
    S('Read "Weekly stock update · N of M sent" and the due date'),
    S('Under "Still missing this cycle": Enter stock'),
    S('Or Enter stock on screen / Upload template for many materials'),
    S('Save stock'),
    S('"Also due by the same cutoff": Confirm capacity, Confirm feedstock')
  ],
  statusAfter: 'Declared; the sent count rises',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:154,201,240,269,613-624; src/pages-v2/SupplierInventory.jsx:233-271; src/pages-v2/inventory/WeeklyUpdatePanel.jsx:156-200. API suppliers see "Stock sync schedule" instead. BL-236 (at f79a26c1): "Also due by the same cutoff" with Capacity and Feedstock counts and links, src/lib/i18n/inventoryCapacity.js:623-631, src/pages-v2/inventory/WeeklyUpdatePanel.jsx:166-199.'
});
add({
  type: 'step', kicker: u6(2), title: 'Supplier confirms feedstock',
  menu: 'Planning → Stock, tab Feedstock to confirm',
  shot: 'UC6-2-supplier.png', route: '/supplier/inventory', seat: 'Supplier', record: 'Feedstock to confirm tab',
  steps: [
    S('Current feedstock: Confirm on a material'),
    S('Feedstock quantity and Confirmed as of'),
    S('Confirm feedstock (feedstock is not stock until produced)'),
    P('PTI reads "Feedstock (confirmed {date})" in the material drawer')
  ],
  statusAfter: 'Confirmed (or Due / Missed)',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:156; src/lib/i18n/feedstockConfirm.js:11-37,57-58; src/pages-v2/SupplierInventory.jsx:273-275; src/pages-v2/inventory/MaterialDrawer.jsx:231. BL-194. The rule is labelled "Provisional: rule awaiting Material Planning" (feedstockConfirm.js:14).'
});
add({
  type: 'step', kicker: u6(3), title: 'Supplier submits capacity',
  menu: 'Planning → Capacity',
  shot: 'UC6-3-supplier.png', route: '/supplier/capacity', seat: 'Supplier', record: 'an amber week',
  steps: [
    S('Weeks are columns: enter Allocated, then Copy {week} to all weeks'),
    S('Additional capacity where you can add more'),
    S('Amber week: tick Confirm additional capacity'),
    S('A week below the LTP needs a reason'),
    S('Submit capacity')
  ],
  statusAfter: 'Within capacity · Needs additional capacity · Cannot be supplied',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:374-384,392,415,418-419; src/pages-v2/SupplierCapacity.jsx:287,323,408-641. CAP-1, CAP-3, INV-D2.'
});
add({
  type: 'step', kicker: u6(4), title: 'PTI reads stock by risk',
  menu: 'Inventory & capacity → Stock',
  shot: 'UC6-4-pti.png', route: '/buyer/inventory', seat: 'PTI, Menu for Material Planner', record: 'sup-002 RM-STEAR-7300',
  steps: [
    P('Tiles: High risk, PTI stock below PTI ROP, Supplier figures out of date'),
    P('Click a row: the material drawer opens'),
    P('Open stock simulation, Create call-off or Create PO request'),
    P('Ask for a production date, or Ask for stock figures'),
    P('Record stock from a supplier message, when it came by message')
  ],
  statusAfter: 'Action taken, or the supplier asked',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:82,87-94,119,519-542; src/lib/i18n/stockSimulation.js:102-103; src/pages-v2/inventory/MaterialDrawer.jsx:163-165,300-370.'
});
add({
  type: 'step', kicker: u6(5), title: 'PTI decides on a capacity gap; the supplier answers',
  menu: 'Inventory & capacity → Capacity · supplier To do',
  shot: 'UC6-5-pti.png', route: '/buyer/capacity', seat: 'PTI, Menu for Material Planner', record: 'an amber week',
  steps: [
    P('Amber week: Accept additional capacity (Undo takes it back)'),
    P('Or Ask about the capacity gap → Send ask'),
    S('"PTI has N questions for you": Answer → Send answer'),
    S('Capacity shows "PTI accepted your additional capacity on {date}"')
  ],
  statusAfter: 'Additional capacity accepted · Answered',
  notes: 'Evidence: src/lib/i18n/capacityDecision.js:17-37; src/lib/i18n/inventoryCapacity.js:521,526-542,571-577; src/pages-v2/inventory/CapacityGapActions.jsx:102-146; src/pages-v2/inventory/PtiAsksBlock.jsx:53-202; src/pages-v2/SupplierCapacity.jsx:607. Supplier screen: UC6-6-supplier.png.'
});
add({
  type: 'table', kicker: u6(0, 'negative scenarios'), title: 'When it goes wrong',
  columns: ['Trigger', 'What the system shows', 'Who acts next', 'Menu'],
  colW: [3.2, 3.8, 2.9, 2.23],
  rows: [
    ['Week below the LTP, no reason', '"The week of {week} is below the LTP. Choose a reason."', 'Supplier Fulfilment', 'Capacity'],
    ['Week cannot be covered (red)', '"Additional capacity cannot cover this week. Still short:"', 'Planning: ask, or move demand (UC3)', 'Capacity'],
    ['Reply arrives by message, cannot be parsed', '"Could not interpret this as a stock update."', 'Planning: Record stock from a supplier message', 'Supplier follow-ups · Stock']
  ],
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:82,415; src/lib/i18n/capacityDecision.js:20; src/services/transitions/capacityDecisionRules.js:52-59; src/lib/i18n/commHubInbound.js:23,37; src/lib/i18n/buyerCommHub.js:14.'
});
add({
  type: 'table', kicker: u6(0, 'edge cases'), title: 'Edge cases',
  columns: ['Condition', 'What happens', 'Menu'],
  colW: [4.0, 5.6, 2.53],
  rows: [
    ['Supplier on API sync', '"Stock sync schedule", Last sync, Next sync instead of the weekly panel', 'Stock'],
    ['PTI stops sharing its stock', '"PTI stopped sharing its stock with you on {date}."', 'Stock (supplier)'],
    ['Additional capacity figure changed', 'Its confirmation clears; tick it again', 'Capacity'],
    ['PTI undoes an accepted week', 'The week counts toward the capacity alert again', 'Capacity'],
    ['Supplier seat without the Fulfilment lane', '"Awaiting Supplier Fulfilment" instead of the Stock buttons', 'Stock']
  ],
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:161,625-626; src/pages-v2/SupplierInventory.jsx:183-188,253,295-299; src/pages-v2/SupplierCapacity.jsx:474-488; src/lib/i18n/capacityDecision.js:35-37.'
});

// ── UC6 Alerts ─────────────────────────────────────────────────────────
const u7 = uc(6, 'Inventory and capacity alerts', 2);
add({
  type: 'overview', kicker: 'Use case 6 of 7', title: 'UC6 · Inventory and capacity alerts',
  purpose: 'The portal checks stock, capacity, commitments, call-offs and demand anticipation against 12 rules and raises an alert for each risk. Planning acts on it and closes it with a reason. Alerts are computed live.',
  menus: [{ actor: 'PTI', text: 'Inventory & capacity → Alerts · My tasks' }, { actor: 'SUP', text: 'Home → To do → Alerts about your materials' }],
  lanes: {
    pti: [{ n: 2, label: 'Review alerts, highest risk first' }, { n: 3, label: 'Next step: act or ask' }, { n: 5, label: 'Close alert, with a reason' }],
    sup: [{ n: 1, label: 'Updates data (or does not)' }, { n: 4, label: 'Sees own alerts; answers PTI' }]
  },
  caption: 'Suppliers see 5 of the 12 rules, about their own materials.',
  notes: 'Evidence: src/services/transitions/inventoryAlertRules.js:81-114; src/services/data/mock/MockProcurementService.js:667-670.'
});
add({
  type: 'table', kicker: u7(0, 'the 12 rules'), title: 'The 12 alert rules',
  columns: ['Rule (label on Alerts)', 'Supplier sees it'],
  colW: [10.13, 2.0],
  rows: [
    ['PTI stock is below the PTI reorder point', 'No'],
    ['Supplier stock is below the system-calculated supplier reorder point (ROP Supplier)', 'Yes'],
    ['PTI stock runs out before the next incoming delivery', 'No'],
    ['Allocated capacity is below the LTP', 'Yes'],
    ['Supplier stock figures are out of date', 'Yes'],
    ['Supplier stock and incoming do not cover the next 30 days of demand', 'Yes'],
    ['Committed quantity below forecast beyond tolerance', 'Yes'],
    ['No supplier lead time on record: risk uses the day bands until the master data is fixed', 'No'],
    ['A confirmed call-off due within the lead time is larger than the supplier stock plus production due before the need date', 'No'],
    ['The supplier marked this material Discontinued: it needs another source', 'No'],
    ['A blanket PO runs out soon: raise the next PO by its "new PO needed by" week', 'No'],
    ['Supply above demand anticipation (DA) is more than the last week of the horizon can absorb', 'No']
  ],
  caption: 'Urgency: High when cover < 1× lead time, Medium < 1.5×, else Low. Thresholds per material group: Help & administration → Alert thresholds and stale periods.',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:434-450 (PTI labels), :579-588 (supplier wording); src/services/transitions/inventoryAlertRules.js:81-114; commit 72592a0f (thresholds per material group).'
});
add({
  type: 'step', kicker: u7(1), title: 'PTI works the alerts',
  menu: 'Inventory & capacity → Alerts',
  shot: 'UC7-1-pti.png', route: '/buyer/alerts', seat: 'PTI, Menu for Material Planner', record: 'open alerts',
  steps: [
    P('Highest risk first; filter by severity, planning group, PIC'),
    P('Read Next step and "Impact in N days"'),
    P('Act: Open stock simulation, Create call-off or Create PO request'),
    P('Or ask, named for the topic: Ask for a production date'),
    P('Close alert → Reason ("Other" needs a note under What was done)')
  ],
  statusAfter: 'Alert: Open → Closed',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:401-407,457-460,474-479,519-522; src/pages-v2/inventory/alertNextStep.jsx:46-65,117-137; src/pages-v2/BuyerAlerts.jsx.'
});
add({
  type: 'step', kicker: u7(2), title: 'Supplier sees its own alerts',
  menu: 'Home → To do',
  shot: 'UC7-2-supplier.png', route: '/supplier/home', seat: 'Supplier', record: 'Alerts about your materials',
  steps: [
    S('Scroll to "Alerts about your materials"'),
    S('Read the alert, for example "Your stock figures are out of date"'),
    S('Open inventory, Open capacity or Open commitments & gaps'),
    S('Fix the data: the alert clears at the next read')
  ],
  statusAfter: 'Alert clears when the condition clears',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:452-454,578-588; src/pages-v2/SupplierHome.jsx:600-638; src/services/data/mock/inventoryReadModel.js.'
});
add({
  type: 'table', kicker: u7(0, 'when it goes wrong · edge cases'), title: 'When it goes wrong, and edge cases',
  columns: ['Condition', 'What happens', 'Who acts next', 'Menu'],
  colW: [3.4, 4.3, 2.2, 2.23],
  rows: [
    ['PTI user without Planning', '"Awaiting Planning" instead of Close alert', 'Planning', 'Alerts'],
    ['Closed with "Other (note required)" and no note', 'Refused', 'Planning adds a note', 'Alerts'],
    ['PTI accepted additional capacity on an amber week', 'That week stops counting toward the capacity alert', '–', 'Alerts'],
    ['No lead time on record', 'Day bands decide urgency; no Impact line', 'PTI fixes master data', 'Alerts'],
    ['Condition clears, then returns', 'A new alert opens', 'Planning', 'Alerts'],
    ['Demo reset', 'Closures lost; all alerts Open again', '–', 'Alerts']
  ],
  notes: 'Evidence: src/pages-v2/BuyerAlerts.jsx; src/lib/i18n/inventoryCapacity.js:407; commit 512b7773 (INV-D12); src/pages-v2/inventory/alertNextStep.jsx:62-65; src/services/transitions/inventoryAlertRules.js; src/services/data/mock/stores/inventoryHubStores.js.'
});

// ── UC7 Demand anticipation (new, PTI only) ────────────────────────────
const u8 = uc(7, 'Demand anticipation and replenishment', 3);
add({
  type: 'overview', kicker: 'Use case 7 of 7 · new', title: 'UC7 · Demand anticipation (DA) and replenishment',
  purpose: 'Each week the planner publishes the DA per supplier × material over its lead-time horizon, checks plan against execution, and turns any gap into a draft call-off or a PR in SAP. PTI only: the supplier DA view is built but switched off.',
  menus: [{ actor: 'PTI', text: 'Weekly plan → Demand anticipation (DA) · What to order' }, { actor: 'PTI', text: 'Review → Demand anticipation (DA) history' }],
  lanes: {
    pti: [{ n: 1, label: 'Read the DA weeks' }, { n: 2, label: 'Plan vs execution' }, { n: 3, label: 'Publish DA' }, { n: 4, label: 'Below DA → draft call-off' }, { n: 5, label: 'Release (UC2)' }],
    sup: []
  },
  caption: 'The horizon is the lead time and rolls weekly (the fixed 4-week horizons were retired). Step 5 hands over to the supplier in UC2.',
  notes: 'Evidence: src/services/transitions/supplierDaView.js:31 (SUPPLIER_DA_VIEW_ENABLED = false); commit 93fed066; src/lib/i18n/demandAnticipation.js:15-18.'
});
add({
  type: 'step', kicker: u8(1), title: 'Read the DA and check plan vs execution',
  menu: 'Weekly plan → Demand anticipation (DA), tab This week',
  shot: 'UC8-1-pti.png', route: '/buyer/demand-anticipation', seat: 'PTI, Menu for Material Planner', record: 'a card with Show the weeks open',
  steps: [
    P('Status line: this planning week published or not'),
    P('Show the weeks: LTP, Safety order, Carry-over, DA, Open supply, Gap'),
    P('Plan vs execution: Total DA, ROP Order, Total OSPO, Gap, Result'),
    P('Result: Balanced, Surplus absorbed, or Shortfall: recommend a PR'),
    P('Record consumption tab: type or upload the week\'s consumption')
  ],
  statusAfter: 'Read only',
  notes: 'Evidence: src/lib/i18n/demandAnticipation.js:61,74-105,118; src/pages-v2/BuyerDemandAnticipation/index.jsx:147-296; src/pages-v2/BuyerDemandAnticipation/components/PlanCheck.jsx:64-201; src/lib/glossary/termLabels.glossary.js:75-180; src/lib/i18n/consumption.js:10-37. Plan vs execution screen: UC8-2-pti.png.'
});
add({
  type: 'step', kicker: u8(2), title: 'Publish the DA',
  menu: 'Demand anticipation (DA)',
  shot: 'UC8-2-pti.png', route: '/buyer/demand-anticipation', seat: 'PTI, Menu for Material Planner', record: 'Publish dialog',
  steps: [
    P('Publish demand anticipation (DA) · {week}'),
    P('Tick "Supplier agreed to take the remainder after the horizon" if agreed'),
    P('Publish (disabled while no figure differs)'),
    P('History: Publication history, or Review → DA history; Export CSV')
  ],
  statusAfter: '"Demand anticipation published for {week}"; earlier ones Superseded',
  notes: 'Evidence: src/lib/i18n/demandAnticipation.js:31-46; src/pages-v2/BuyerDemandAnticipation/components/PublishPanel.jsx:41-147 (needs the Planning role, forecast:publish); src/lib/i18n/demandAnticipationHistory.js:11-49. History screen: UC8-4-pti.png.'
});
add({
  type: 'step', kicker: u8(3), title: 'Turn a gap into a draft call-off',
  menu: 'Weekly plan → What to order, Below demand anticipation (DA)',
  shot: 'UC8-3-pti.png', route: '/buyer/order-plan', seat: 'PTI, Menu for Material Planner', record: 'Below demand anticipation (DA)',
  steps: [
    P('Read Week, DA, Open supply, Gap and the Proposal'),
    P('"Call off {qty} on {po}" uses the oldest blanket line with balance'),
    P('Or "New PO needed": raise it in SAP'),
    P('Create draft call-off, then Release to supplier on Call-offs')
  ],
  statusAfter: 'Released call-off counts as Open supply; the Gap shrinks',
  notes: 'Evidence: src/lib/i18n/supplyGap.js:14-49; src/pages-v2/BuyerOrderPlan/components/BelowDemandSection.jsx:74-231; src/lib/i18n/callOffs.js:160. Commit 9abc52e4 (CAP-12).'
});
add({
  type: 'table', kicker: u8(0, 'when it goes wrong · edge cases'), title: 'When it goes wrong, and edge cases',
  columns: ['Condition', 'What happens', 'Menu'],
  colW: [4.0, 5.8, 2.33],
  rows: [
    ['Draft from a What to order recommendation', 'Release withheld: the plan uses simulated data (Below DA and ROP Fisik drafts are not)', 'Call-offs'],
    ['Nothing differs from the publication in force', 'Publish stays disabled (demo: "0 … differ")', 'DA'],
    ['Supply above a week\'s DA', 'Carries forward and reduces later Gaps', 'What to order'],
    ['Surplus larger than the last week can take', '"…more than that week can take", plus an alert (UC6)', 'DA · Alerts'],
    ['No lead time on record', 'Horizon falls back to 4 weeks, flagged on the card', 'DA'],
    ['Trying an alternative', 'Try a what-if: analysis only, nothing changes the plan', 'What-if sandbox'],
    ['ROP Order, ROP Fisik, Max Stock, OSIP level', 'On Planning engine · Safety stock targets', 'Avatar menu']
  ],
  notes: 'Evidence: src/lib/i18n/callOffs.js:212; src/lib/i18n/orderPlan.js:136; src/lib/i18n/demandAnticipation.js:44,95-96,107; src/services/data/mock/targets/demandAnticipation.js:63-71; src/lib/i18n/supplyGap.js:22; src/services/transitions/supplyBelowDemandRules.js:19-104; src/lib/i18n/whatIfSandbox.js:12,212; src/pages-v2/BuyerSafetyStock.jsx:62-73,366-397.'
});

// ── Menu Directory ─────────────────────────────────────────────────────
const ptiMenu = [
  ['My tasks', 'Home', 'All', 'Counts what needs action; weekly plan card', 'All'],
  ['Supplier follow-ups', 'Home', 'All', 'Suppliers to follow up, record a reply, request log', 'UC5'],
  ['Purchase orders', 'Order collaboration', 'Material Planner', 'Summary and List views; steps link to stage pages', 'UC1'],
  ['Call-offs', 'Order collaboration', 'Material Planner', 'Release and review call-offs; blanket POs running out', 'UC2'],
  ['Shipments & ASN', 'Order collaboration', 'Material Planner', 'Tracks ASNs; approves shelf-life exceptions', 'UC1'],
  ['Goods receipts', 'Order collaboration', 'Material Planner', 'Creates and posts GRs; reconciles discrepancies', 'UC1'],
  ['This week', 'Weekly plan', 'Material Planner', 'Input check and the steps of the weekly cycle', 'UC3, UC7'],
  ['What to order', 'Weekly plan', 'Material Planner', 'Order proposals; Below DA with draft call-offs', 'UC7'],
  ['Make warehouse room', 'Weekly plan', 'Material Planner', 'Decision when the warehouse overflows', '–'],
  ['Publish to suppliers', 'Weekly plan', 'Material Planner', 'Publishes forecast versions (withheld on sample data)', 'UC3'],
  ['Foresight commitments', 'Weekly plan', 'Material Planner', 'Accept commitments or move demand', 'UC3'],
  ['Demand anticipation (DA)', 'Weekly plan', 'Material Planner', 'DA over the lead time; publish; record consumption', 'UC7'],
  ['Supplier performance', 'Review', 'Material Planner', 'Supplier scorecard per period', '–'],
  ['Forecast quality', 'Review', 'Material Planner', '26-week sell-in forecast per finished good, bias', '–'],
  ['Feedstock reconcile', 'Review', 'Material Planner', 'PO ordered vs called off vs ASN requested; max stock', 'UC7'],
  ['Demand anticipation (DA) history', 'Review', 'Material Planner', 'Every DA publication with its rules version', 'UC7'],
  ['Stock', 'Inventory & capacity', 'Material Planner', 'Stock by risk; material drawer with actions', 'UC5'],
  ['Stock simulation', 'Inventory & capacity', 'Material Planner', 'Estimated supplier stock on a check date', '–'],
  ['Capacity', 'Inventory & capacity', 'Material Planner', 'Capacity vs LTP per week; accept or ask', 'UC5'],
  ['Alerts', 'Inventory & capacity', 'Material Planner', '12 alert rules, closed with a reason', 'UC6'],
  ['Supplier access', 'Inventory & capacity', 'Material Planner', 'Grants suppliers a view of PTI stock', 'UC5'],
  ['Trade names', 'Inventory & capacity', 'Material Planner', 'Approves suppliers\' names for PTI materials', '–'],
  ['Requisitions', 'Sourcing', 'Buyer', 'Create, submit, approve PRs; raise a sourcing event', 'Not in guide'],
  ['RFI', 'Sourcing', 'Buyer', 'Information requests to suppliers', 'Not in guide'],
  ['RFQ', 'Sourcing', 'Buyer', 'Quotation requests, rounds, award', 'Not in guide'],
  ['RFP', 'Sourcing', 'Buyer', 'Proposal requests, firm-offer rounds, award', 'Not in guide'],
  ['Suppliers', 'Sourcing', 'Buyer', 'Supplier list and profile, read-only', '–'],
  ['Supplier documents', 'Sourcing', 'Buyer', 'Ask for certificates; confirm or refuse', 'UC4'],
  ['Invoices', 'Invoices', 'Finance', 'Match, dispute, payment release', 'Not in guide'],
  ['Demand anticipation (DA) history', 'Audit', 'Buyer, Finance', 'Same page as under Review', 'UC7'],
  ['Supplier performance', 'Performance', 'Buyer', 'Same scorecard page as under Review', '–'],
  ['Feedstock reconcile', 'Performance', 'Buyer', 'Same page as under Review; Procurement sets max stock', 'UC7']
];
const supMenu = [
  ['To do', 'Home', 'What Paragon waits for; weekly update, PTI questions, alerts', 'All'],
  ['Purchase orders', 'Orders', 'Acknowledge, confirm, adjust or reject; Create ASN', 'UC1'],
  ['Call-offs', 'Orders', 'Confirm, change or reject; answer a delay; dispatch notice', 'UC2'],
  ['Shipments & ASN', 'Orders', 'Create and submit ASNs', 'UC1, UC2'],
  ['Goods receipts', 'Orders', 'Acknowledge or dispute discrepancies', 'UC1'],
  ['Foresight commitments', 'Planning', 'Commit per period; acknowledge forecast rows', 'UC3'],
  ['Feedstock reconcile', 'Planning', 'Ordered vs called off vs requested, read-only', 'UC7'],
  ['Stock', 'Planning', 'Weekly stock update, feedstock, PTI questions', 'UC5'],
  ['Capacity', 'Planning', 'Capacity per week vs the LTP', 'UC3, UC5'],
  ['RFI invitations', 'Sourcing', 'Answer RFIs', 'Not in guide'],
  ['RFQ invitations', 'Sourcing', 'Quote, decline, revise in rounds, see awards', 'Not in guide'],
  ['RFP invitations', 'Sourcing', 'Send proposals and firm offers', 'Not in guide'],
  ['Invoices', 'Invoices', 'Create, submit, correct and resubmit invoices', 'Not in guide'],
  ['Profile & documents', 'Company', 'Declare certificates; see expiry', 'UC4'],
  ['My performance', 'Company', 'Own scorecard, read-only', '–'],
  ['Help & glossary', 'Avatar menu', 'What each portal term means', 'Intro']
];
const chunks = (a, k) => Array.from({ length: Math.ceil(a.length / k) }, (_, i) => a.slice(i * k, i * k + k));
const ptiParts = chunks(ptiMenu, 11);
ptiParts.forEach((rows, i) => add({
  type: 'table', kicker: `Menu directory · PTI · part ${i + 1} of ${ptiParts.length}`, title: 'PTI main menu',
  columns: ['Menu label', 'Section', 'Role', 'What it does', 'Use case'],
  colW: [2.9, 2.2, 1.9, 4.03, 1.1],
  rows,
  caption: i === ptiParts.length - 1 ? 'Help & administration (avatar menu): Help & glossary, Roles, Process flows, Interface monitor, admin lists, and the five Planning engine pages.' : '"Role" is the Menu for view that shows the item. Seeing a menu does not mean you can take its actions.',
  notes: 'Evidence: src/components/layout-v2/navConfig.js:88-230,300-363; labels src/lib/i18n/hub.js:17-116.'
}));
chunks(supMenu, 8).forEach((rows, i) => add({
  type: 'table', kicker: `Menu directory · Supplier · part ${i + 1} of 2`, title: 'Supplier menu',
  columns: ['Menu label', 'Section', 'What it does', 'Use case'],
  colW: [2.9, 2.0, 5.83, 1.4], fontSize: 12,
  rows,
  caption: i === 1 ? 'Demand anticipation (DA) for suppliers is built but not listed while it is switched off.' : undefined,
  notes: 'Evidence: src/components/layout-v2/navConfig.js:232-296,364; labels src/lib/i18n/hub.js:82-103; SUPPLIER_DA_VIEW_ENABLED src/services/transitions/supplierDaView.js:31.'
}));

// ── Known limits ───────────────────────────────────────────────────────
add({
  type: 'list', kicker: 'Known limits · part 1 of 2', title: 'What this build does not do yet',
  intro: 'From SCENARIOS.md section 4. Demo data only: nothing reaches SAP. RFx and invoice limits are left out with those flows.',
  items: [
    { lead: 'Delivery agreements:', text: 'releases are simulated, not posted to SAP.' },
    { lead: 'Toast-only buttons:', text: 'Submit inspection results, Override hold, Send reminder to supplier, Track shipment.' },
    { lead: 'TMS/S4 states:', text: 'ASN In Transit and Delivered, PO delivered and closed: no screen produces them.' },
    { lead: 'Publish to suppliers:', text: 'withheld on sample data; versions exist as demo data or through Move demand.' },
    { lead: 'Order-plan drafts:', text: 'cannot be released until the SAP feed is live; reschedule actions are off on sample data.' },
    { lead: 'Request revision:', text: 'switched off; PTI accepts or moves demand.' }
  ],
  notes: 'Evidence: SCENARIOS.md section 4 items 1-7.'
});
add({
  type: 'list', kicker: 'Known limits · part 2 of 2', title: 'What this build does not do yet',
  intro: 'Proposed rules are labelled on screen as awaiting owner review.',
  items: [
    { lead: 'Supplier DA view:', text: 'built, switched off; the route shows "Not available yet".' },
    { lead: 'Proposed rules:', text: 'suggested OSIP level, feedstock leftover rule, feedstock confirmation rule.' },
    { lead: 'Call-off flags:', text: 'Below minimum delivery and Above Max show to PTI only; no ROP Fisik draft exists in the demo, so neither shows.' },
    { lead: 'Compliance:', text: 'registry cannot be edited; no file is sent; Export Report and Remind are simulated.' },
    { lead: 'Messages:', text: 'nothing is sent from Supplier follow-ups; PTI questions and alerts send no email or WhatsApp.' },
    { lead: 'My performance:', text: 'Export Report and Acknowledge & plan are not available.' },
    { lead: 'Access:', text: 'no sign-in guard; the supplier switch always loads sup-007; demo buttons read "i View as …".' },
    { lead: 'Alerts:', text: 'the PTI bell always shows 3 and does nothing; closures are lost on demo reset.' }
  ],
  notes: 'Evidence: SCENARIOS.md section 4 items 8-22.'
});

module.exports = {
  docTitle: 'Paragon Supplier Portal user guide (complete)',
  footer: 'Supplier Portal user guide · complete · 4 Nov 2026',
  slides,
  screenshots: true
};
