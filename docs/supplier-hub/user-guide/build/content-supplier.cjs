// Version B: supplier only, doubles as the early supplier user-testing script.
// Source: ../SCENARIOS-SUPPLIER.md (tasks T1-T11), evidence in ../SCENARIOS.md, GitLab main aeabdc83.
const S = (text) => ({ actor: 'SUP', text });
const P = (text) => ({ actor: 'PTI', text });

const slides = [];
const add = (s) => slides.push(s);
const task = (id, name) => `${id} · ${name}`;

add({
  type: 'title',
  title: 'Paragon Supplier Portal for suppliers',
  subtitle: 'Your tasks, one at a time, and the script for early user testing',
  meta: 'User guide, supplier version · 4 November 2026 · Demo build, GitLab main aeabdc83 (2026-11-02) · Test supplier: PT Sample Packaging Indonesia (sup-007)',
  notes: 'Built from docs/supplier-hub/user-guide/SCENARIOS-SUPPLIER.md, which is cut from SCENARIOS.md (the evidence). Onboarding and registration are out of scope (a colleague owns them).'
});
add({
  type: 'cards',
  kicker: 'Before you start',
  title: 'Two ways to use this deck',
  cards: [
    { head: 'As a guide', body: 'Each task slide shows the menu, the steps with the exact button names, and the status after. Read it in order, or jump to the task you need.' },
    { head: 'As a test script', body: 'The amber TEST TASK box is what the moderator reads out. The participant does the task without the steps; the steps are the expected path.' },
    { head: 'What to record', body: 'Pass, assisted or fail; time; first wrong turn; the words the participant used; confidence 1 to 5. Sheet at the end.' }
  ],
  legend: [
    { actor: 'SUP', text: 'You, the supplier. The lane you need is named on each task: Commercial, Fulfilment or Back Office.' },
    { actor: 'PTI', text: 'Paragon (PTI). Shown only where PTI acts before or after you.' }
  ],
  footnote: 'Demo data only: nothing reaches Paragon\'s SAP. Screens come from a build of aeabdc83, the commit prod runs.',
  notes: 'Evidence: SCENARIOS-SUPPLIER.md sections 1 and 3.'
});
add({
  type: 'step', kicker: 'Getting in · 1 of 3', title: 'Sign in and land on To do',
  menu: 'Sign-in page → Home → To do',
  shot: 'INTRO-4-todo-supplier.png', route: '#/login, then /supplier/home', seat: 'Supplier', record: 'sup-007',
  steps: [
    S('Sign-in page: View as Supplier (email and password are ignored)'),
    S('To do: what Paragon waits for, grouped by area, nearest deadline first'),
    S('Top: the weekly stock update and "PTI has N questions for you"'),
    S('Each row opens the page and the rows it counts')
  ],
  statusAfter: 'Signed in as PT Sample Packaging Indonesia',
  notes: 'Evidence: src/pages/auth/Login.jsx:326 (the button reads "i View as Supplier"); src/lib/i18n/hub.js:137-139,188-220; src/pages-v2/SupplierHome.jsx:600-638.'
});
add({
  type: 'table', kicker: 'Getting in · 2 of 3', title: 'Your lanes and your menu',
  columns: ['Menu', 'Section', 'Use it to', 'Lane', 'Task'],
  colW: [2.6, 1.6, 4.73, 2.2, 1.0],
  fontSize: 12,
  rows: [
    ['To do', 'Home', 'See what Paragon waits for', 'any', 'T1'],
    ['Purchase orders', 'Orders', 'Acknowledge, confirm, adjust or reject; Create ASN', 'Fulfilment', 'T2'],
    ['Goods receipts', 'Orders', 'Acknowledge or dispute a receipt discrepancy', 'Fulfilment', 'T3'],
    ['Invoices', 'Invoices', 'Create, submit, correct and resubmit', 'Back Office', 'T4'],
    ['Call-offs · Shipments & ASN', 'Orders', 'Confirm call-offs, answer a delay, dispatch, ASN', 'Fulfilment', 'T5'],
    ['Foresight commitments', 'Planning', 'Commit to the forecast per period', 'Commercial', 'T6'],
    ['Capacity', 'Planning', 'Capacity per week against PTI\'s LTP', 'Fulfilment', 'T7'],
    ['Stock', 'Planning', 'Weekly stock update, feedstock, PTI questions', 'Fulfilment', 'T8, T9'],
    ['Profile & documents', 'Company', 'Declare certificates; see expiry', 'Back Office', 'T10'],
    ['RFI · RFQ · RFP invitations', 'Sourcing', 'Answer sourcing events', 'Commercial', 'T11']
  ],
  caption: 'Also in the menu: Feedstock reconcile and My performance (read only). Help & glossary sits in the avatar menu.',
  notes: 'Evidence: src/components/layout-v2/navConfig.js:232-296,364; labels src/lib/i18n/hub.js:82-103; lanes src/services/transitions/businessRoles.js:442,484.'
});
add({
  type: 'step', kicker: 'Getting in · 3 of 3', title: 'Help on every page, and "Awaiting …"',
  menu: 'Any page',
  shot: 'INTRO-5-term-tip.png', route: '/supplier/capacity', seat: 'Supplier', record: '(i) on "Allocated" open',
  steps: [
    S('(i) beside a term: what it means, how it is calculated, also called, not'),
    S('Help & glossary (avatar menu): every term in one list'),
    S('Search... (Ctrl K): find any page in your menu'),
    S('No lane for an action: "Awaiting {lane}" replaces the button')
  ],
  statusAfter: 'Ask a colleague with that lane, or your administrator',
  notes: 'Evidence: src/lib/i18n/forecastUx.js:54-56; src/components/forecast/TermTip.jsx:146-165; src/lib/i18n.js:540; src/lib/i18n/roles.js:49-53. Awaiting screen: INTRO-6-awaiting-supplier.png.'
});
add({
  type: 'table', kicker: 'Your tasks', title: 'Tasks at a glance',
  columns: ['Task', 'Lane', 'Menu', 'Ends in'],
  colW: [4.1, 1.8, 3.4, 2.83],
  fontSize: 12,
  rows: [
    ['T1 Find what Paragon is waiting for', 'any', 'To do', 'The right page and rows'],
    ['T2 Confirm a PO and create its ASN', 'Fulfilment', 'Purchase orders', 'PO Confirmed; ASN Submitted'],
    ['T3 Answer a receipt discrepancy', 'Fulfilment', 'Goods receipts', 'Answered'],
    ['T4 Correct a returned invoice', 'Back Office', 'Invoices', 'Submitted; match re-runs'],
    ['T5 Confirm a call-off, answer a delay, dispatch', 'Fulfilment', 'Call-offs', 'Confirmed; notice sent'],
    ['T6 Commit to the forecast', 'Commercial', 'Foresight commitments', 'Submitted per period'],
    ['T7 Submit capacity', 'Fulfilment', 'Capacity', 'Capacity submitted'],
    ['T8 Weekly stock update and feedstock', 'Fulfilment', 'Stock', 'Declared; feedstock Confirmed'],
    ['T9 Answer PTI\'s question, read your alerts', 'Fulfilment', 'To do', 'Answered'],
    ['T10 Declare a certificate', 'Back Office', 'Profile & documents', 'Under Review'],
    ['T11 Quote on an RFQ (optional, RFx paused)', 'Commercial', 'RFQ invitations', 'Quotation Submitted']
  ],
  notes: 'Evidence: SCENARIOS-SUPPLIER.md section 2.'
});

add({
  type: 'step', kicker: task('T1', 'Find what Paragon is waiting for'), title: 'Read your To do',
  menu: 'Home → To do',
  shot: 'INTRO-4-todo-supplier.png', route: '/supplier/home', seat: 'Supplier', record: 'sup-007',
  steps: [
    S('Scan the areas: Orders, Stock, Sourcing, Foresight commitments, Invoices and documents'),
    S('Rows such as "Purchase orders to respond to", "Call-offs to confirm"'),
    S('Open a row: it lands on the rows it counts')
  ],
  statusAfter: 'You know what to do first',
  testId: 'T1',
  test: '"What does Paragon need from you today, and which one would you do first?"',
  notes: 'Pass: names 3 waiting items and opens one. Watch: is "PTI has … questions" noticed? Evidence: src/lib/i18n/hub.js:137-139,188-204.'
});
add({
  type: 'step', kicker: task('T2', 'Confirm a PO and create its ASN'), title: 'Acknowledge and confirm the PO',
  menu: 'Orders → Purchase orders',
  shot: 'UC2-1-supplier.png', route: '/supplier/orders', seat: 'Supplier', record: 'PO-2026-00121 Sent',
  steps: [
    S('Open PO-2026-00121'),
    S('Acknowledge receipt'),
    S('Confirm order with the confirmed quantity and date'),
    S('Cannot deliver as ordered? Adjust or Reject instead')
  ],
  statusAfter: 'Sent → Acknowledged → Confirmed',
  testId: 'T2 part 1',
  test: '"Paragon sent you a new PO. Let them know you received it, then confirm you can deliver it."',
  notes: 'Watch: are "acknowledge" and "confirm" read as two acts? Evidence: src/lib/i18n/supplierOrders.js:65; src/pages-v2/SupplierOrders/components/PanelFooter.jsx:94-103,125-126,146-192; src/data/mockPurchaseOrders/sup007Walkthrough.js:21-35.'
});
add({
  type: 'step', kicker: task('T2', 'Confirm a PO and create its ASN'), title: 'Create the ASN from the PO',
  menu: 'Orders → Purchase orders → Shipments & ASN',
  shot: 'UC2-2-supplier.png', route: '/supplier/shipments', seat: 'Supplier', record: 'PO-2026-00127 Confirmed',
  steps: [
    S('Open PO-2026-00127 (Confirmed, nothing shipped)'),
    S('Create ASN: the ASN wizard opens for that PO'),
    S('Check lines, batch, carrier and tracking'),
    S('Submit ASN')
  ],
  statusAfter: 'ASN: Draft → Submitted',
  testId: 'T2 part 2',
  test: '"Tell Paragon what you are shipping for the order you confirmed last week."',
  notes: 'Watch: are the wizard\'s lines understood? Evidence: src/lib/i18n/supplierOrders.js:58; src/pages-v2/SupplierOrders/index.jsx:338-354; src/pages-v2/SupplierShipments/index.jsx:306,346-349.'
});
add({
  type: 'step', kicker: task('T3', 'Answer a receipt discrepancy'), title: 'Acknowledge or dispute a short receipt',
  menu: 'Orders → Goods receipts',
  shot: 'UC2-6-supplier.png', route: '/supplier/goods-receipts', seat: 'Supplier', record: 'open discrepancy on PO-2026-00125',
  steps: [
    S('Open the receipt with a discrepancy'),
    S('Compare shipped and received quantities'),
    S('Respond, write a comment (required)'),
    S('Acknowledge, or Dispute')
  ],
  statusAfter: 'Answered; PTI reconciles or resolves',
  testId: 'T3',
  test: '"Paragon received fewer goods than you shipped on one delivery. Tell them whether you agree."',
  notes: 'Evidence: src/lib/i18n/fulfilmentCollaboration.js:123,135,136; src/pages-v2/SupplierGoodsReceipts.jsx:346,357-379; src/lib/i18n/hub.js:198.'
});
add({
  type: 'step', kicker: task('T4', 'Correct a returned invoice'), title: 'Correct and resubmit',
  menu: 'Invoices → Invoices, filter Returned',
  shot: 'UC2-7-supplier.png', route: '/supplier/invoices?stage=Returned', seat: 'Supplier', record: 'INV-2025-BRL-0043',
  steps: [
    S('Open the invoice marked Returned'),
    S('Read the banner: "Returned by Finance:" and the reason'),
    S('Correct and resubmit')
  ],
  statusAfter: 'Submitted; the 3-way match runs again',
  testId: 'T4',
  test: '"Paragon sent one of your invoices back. Find out why and send it again."',
  notes: 'Evidence: src/lib/i18n/supplierInvoices.js:33,37; src/lib/i18n/fulfilmentCollaboration.js:244; src/pages-v2/SupplierInvoices/components/InvoiceRow.jsx:119; src/services/data/mock/fixtures/invoices.js:52-66 (Disputed for PTI, Returned for the supplier, src/services/transitions/fulfilmentRules/invoice.js:284-285).'
});
add({
  type: 'step', kicker: task('T5', 'Call-offs'), title: 'Confirm a call-off with a new date',
  menu: 'Orders → Call-offs, filter Awaiting your confirmation',
  shot: 'UC3-2-supplier.png', route: '/supplier/call-offs', seat: 'Supplier', record: 'CO-2026-0003 Awaiting Confirmation',
  steps: [
    S('Respond on CO-2026-0003'),
    S('Confirm with a new date'),
    S('Read: "Outside tolerance: PTI must approve this before you ship."'),
    S('Send confirmation')
  ],
  statusAfter: 'Confirmed with New Date, waiting for PTI approval',
  testId: 'T5 part 1',
  test: '"Paragon called off a delivery. Confirm it, but you can only deliver 2 days later than asked."',
  notes: 'Other answers: Confirm as requested, Confirm with a different quantity, Partially confirm in 2 deliveries, Reject. Within +5% is accepted at once. Evidence: src/lib/i18n/callOffs.js:22,269-287; src/pages-v2/SupplierCallOffs/components/RespondForm.jsx:50-61,138,151.'
});
add({
  type: 'step', kicker: task('T5', 'Call-offs'), title: 'Answer a delay, then dispatch',
  menu: 'Orders → Call-offs',
  shot: 'UC3-3-supplier.png', route: '/supplier/call-offs', seat: 'Supplier', record: 'a confirmed call-off; moderator sets up the delay',
  steps: [
    P('Planning changed the call-off: LTP dropped, later need date'),
    S('Approve the delay, or Reject the delay, keep {date}'),
    S('On a call-off you shipped: Send dispatch notice'),
    S('Create the ASN for this call-off')
  ],
  statusAfter: 'Delay answered; dispatch notice sent',
  testId: 'T5 parts 2-3',
  test: '"Paragon asked to move one delivery later. Decide. Then tell them you shipped another one today."',
  notes: 'Setup: moderator as PTI, Call-offs → Change call-off → Reason type LTP dropped → Change and ask again. Evidence: src/lib/i18n/callOffs.js:216-238,290-299; src/pages-v2/SupplierCallOffs/components/DelayAnswerForm.jsx:41-57; DispatchSection.jsx:74-179.'
});
add({
  type: 'step', kicker: task('T6', 'Commit to the forecast'), title: 'Commit per period',
  menu: 'Planning → Foresight commitments, tab Commitments',
  shot: 'UC4-1-supplier.png', route: '/supplier/forecasts', seat: 'Supplier', record: 'FC-PK-V2 lines',
  steps: [
    S('Enter Commitment ({uom}); Upside ({uom}) if you can do more'),
    S('Short of forecast: Reason below forecast → Choose a reason'),
    S('Save draft (not visible to PTI yet)'),
    S('Under "Submit by period": Submit all; Acknowledge Forecast rows')
  ],
  statusAfter: 'Submitted: Accepted, or Outside tolerance',
  testId: 'T6',
  test: '"Tell Paragon how much you commit to, period by period. For one period you can only supply 80%."',
  notes: 'Reasons: Capacity, Material, Logistics, Quality, Force Majeure, Discontinued, Other (last 3 need a note). Blocked by "Confirm capacity for {group} first." → Confirm capacity. Evidence: src/lib/i18n/forecastCollaboration.js:59-67,83,122-126,135,144-162; src/lib/glossary/termLabels.glossary.js:1281,1286.'
});
add({
  type: 'step', kicker: task('T7', 'Submit capacity'), title: 'Submit capacity per week',
  menu: 'Planning → Capacity',
  shot: 'UC6-3-supplier.png', route: '/supplier/capacity', seat: 'Supplier', record: 'an amber week',
  steps: [
    S('Weeks are columns: Allocated, then Copy {week} to all weeks'),
    S('Additional capacity where you can add more; tick Confirm additional capacity'),
    S('A week below the LTP needs a reason'),
    S('Submit capacity')
  ],
  statusAfter: 'Within capacity · Needs additional capacity · Cannot be supplied',
  testId: 'T7',
  test: '"Tell Paragon how much you can produce each week. It is the same every week; one week you can add extra."',
  notes: 'Watch: are weeks as columns read right? Is the (i) on LTP, current forecast opened? After PTI accepts: "PTI accepted your additional capacity on {date}". Evidence: src/lib/i18n/inventoryCapacity.js:374-384,392,415,418; src/lib/i18n/capacityDecision.js:33; src/pages-v2/SupplierCapacity.jsx:287,323,408-641.'
});
add({
  type: 'step', kicker: task('T8', 'Weekly stock update and feedstock'), title: 'Send stock, then confirm feedstock',
  menu: 'Planning → Stock',
  shot: 'UC6-1-supplier.png', route: '/supplier/inventory', seat: 'Supplier', record: 'weekly update, materials still missing',
  steps: [
    S('"Weekly stock update · N of M sent": under Still missing, Enter stock'),
    S('Save stock (or Upload template for many materials)'),
    S('Tab Feedstock to confirm: Confirm, quantity, Confirmed as of'),
    S('Confirm feedstock (feedstock is not stock until produced)')
  ],
  statusAfter: 'Declared; feedstock Confirmed',
  testId: 'T8',
  test: '"It is your weekly stock update. Send stock for the materials still missing, then confirm the feedstock you hold."',
  notes: 'Evidence: src/lib/i18n/inventoryCapacity.js:154-156,201,240,269,613-624; src/lib/i18n/feedstockConfirm.js:11-37. Feedstock screen: UC6-2-supplier.png.'
});
add({
  type: 'step', kicker: task('T9', 'Answer PTI\'s question, read your alerts'), title: 'Answer PTI and read your alerts',
  menu: 'Home → To do',
  shot: 'UC6-6-supplier.png', route: '/supplier/home', seat: 'Supplier', record: 'ask-0001 production date, PK-PETB-8802',
  steps: [
    S('"PTI has 2 questions for you": Answer'),
    S('Your answer, Date (optional) → Send answer'),
    S('Scroll to "Alerts about your materials"'),
    S('Open inventory, Open capacity or Open commitments & gaps')
  ],
  statusAfter: '"Answer sent to PTI"; alerts clear when the data is fixed',
  testId: 'T9',
  test: '"Paragon has a question about a production date. Answer it. Then tell me what Paragon is worried about."',
  notes: 'You see 5 of PTI\'s 12 alert rules: below your reorder point, figures out of date, capacity below the LTP, stock and incoming below 30 days, commitment below forecast. Evidence: src/lib/i18n/inventoryCapacity.js:452-454,571-588; src/services/data/mock/stores/supplierAskStore.js:18-60. Alerts screen: UC7-2-supplier.png.'
});
add({
  type: 'step', kicker: task('T10', 'Declare a certificate'), title: 'Declare a requested or expiring certificate',
  menu: 'Company → Profile & documents',
  shot: 'UC5-2-supplier.png', route: '/supplier/documents', seat: 'Supplier', record: 'doc-006 Awaiting Upload; doc-001 Expiring Soon',
  steps: [
    S('To do: "Documents PTI asked for" or "Certificates expired or expiring"'),
    S('Declare on the document'),
    S('Fill in the certificate details → Record declaration'),
    S('Refused? Read the reason, Declare again')
  ],
  statusAfter: 'Under Review; PTI confirms (Valid) or refuses',
  testId: 'T10',
  test: '"Paragon asked for a document, and one of your certificates is about to expire. Deal with both."',
  notes: 'Watch: expecting a file upload (none is sent today). Evidence: src/lib/i18n/hub.js:194,196; src/lib/i18n/supplierDocuments.js:79,84,119,137; src/lib/statusLabel.js:43; src/services/data/mock/fixtures/supplierDocuments.js:33,104 (doc-001 expires 14 Oct 2026 after the demo date shift; no document is expired).'
});
add({
  type: 'step', kicker: task('T11', 'Quote on an RFQ (optional)'), title: 'Answer an RFQ invitation',
  menu: 'Sourcing → RFQ invitations',
  shot: 'UC1-2-supplier.png', route: '/supplier/rfq', seat: 'Supplier', record: 'rfq-021 Open',
  steps: [
    S('Open the RFQ, I will respond'),
    S('Accept confidentiality terms, if asked'),
    S('Submit quote → Submit quotation'),
    S('Or Decline RFQ with a reason ("No capacity for this", …)')
  ],
  statusAfter: 'Quotation Submitted (or Declined)',
  testId: 'T11',
  test: '"Paragon invited you to quote. Say you will take part and send your quote."',
  notes: 'RFx is paused; this task is optional. Evidence: src/lib/i18n/rfqResponse.js:24,34; src/lib/i18n/rfqs.js:48,50,111.'
});

add({
  type: 'table', kicker: 'When it goes wrong', title: 'What you see, and what to do',
  columns: ['You see', 'Why', 'What to do', 'Menu'],
  colW: [4.0, 2.9, 3.0, 2.23],
  fontSize: 12.5,
  rows: [
    ['"Outside tolerance: PTI must approve this before you ship."', 'More than +5% or a later date', 'Wait for PTI\'s approval', 'Call-offs'],
    ['"Confirm capacity for {group} first."', 'Capacity not submitted', 'Confirm capacity, then Submit all', 'Foresight commitments'],
    ['"The week of {week} is below the LTP. Choose a reason."', 'A week below PTI\'s LTP', 'Pick a reason', 'Capacity'],
    ['Invoice marked Returned', 'Finance disputed it', 'Correct and resubmit', 'Invoices'],
    ['"{count} document was refused:"', 'PTI refused a declaration', 'Declare again', 'Profile & documents'],
    ['"Awaiting Supplier Fulfilment"', 'Your seat lacks that lane', 'Ask a colleague or your administrator', 'Any'],
    ['"PTI stopped sharing its stock with you on {date}."', 'PTI turned off stock sharing', 'Nothing; PTI stock columns are gone', 'Stock']
  ],
  notes: 'Evidence: src/lib/i18n/callOffs.js:285; src/lib/i18n/forecastCollaboration.js:158; src/lib/i18n/inventoryCapacity.js:161,415; src/lib/i18n/supplierInvoices.js:33,37; src/lib/i18n/supplierDocuments.js:137; src/lib/i18n/roles.js:49-53.'
});

add({
  type: 'section', kicker: 'For the moderator', title: 'Running an early supplier test',
  body: '1 participant, 1 moderator, 1 note-taker. 75 minutes: 5 intro, 60 tasks (pick 6 to 8 that fit the participant\'s job), 10 wrap-up. The goal is to find where a supplier gets stuck, not to train them.',
  notes: 'From SCENARIOS-SUPPLIER.md section 3.'
});
add({
  type: 'cards', kicker: 'For the moderator', title: 'Setup and rules',
  cardH: 3.6,
  cards: [
    { head: 'Before each session', body: 'Fresh browser profile; open the portal; View as Supplier. Check To do shows "PTI has 2 questions for you". For T5, as PTI change a confirmed call-off with LTP dropped, then switch back. Set the language the participant prefers.' },
    { head: 'During the task', body: 'Read the TEST TASK box as written. Do not name buttons or menus. Ask them to think aloud. "What would you try?" when they ask. Help only after 3 minutes or 2 failed tries, and mark it assisted.' },
    { head: 'Demo data', body: 'Everyone is PT Sample Packaging Indonesia. If a number looks odd, say "it is sample data" and move on. Nothing reaches SAP and no message is sent.' }
  ],
  notes: 'From SCENARIOS-SUPPLIER.md section 3. Asks seeded: src/services/data/mock/stores/supplierAskStore.js:18-60.'
});
add({
  type: 'table', kicker: 'For the note-taker', title: 'Observation sheet',
  columns: ['Task', 'Pass / assisted / fail', 'Time (min)', 'First wrong turn', 'Words they used', 'Confidence 1-5'],
  colW: [1.0, 2.2, 1.4, 2.8, 2.9, 1.83],
  rows: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11'].map((t) => [t, '', '', '', '', '']),
  caption: 'A task failed or assisted by 2 or more participants is a finding. Log it in BACKLOG.md with the task number.',
  notes: 'From SCENARIOS-SUPPLIER.md section 5.'
});
add({
  type: 'cards', kicker: 'Wrap-up', title: 'Three questions to close',
  cards: [
    { mark: 'Q1', head: 'Every week', body: 'Which task would you do in the portal every week, and which would you rather do by email or WhatsApp?' },
    { mark: 'Q2', head: 'Words', body: 'Which word on the screens did not match the word you use at work?' },
    { mark: 'Q3', head: 'What is missing', body: 'What is missing for you to stop sending this information another way?' }
  ],
  notes: 'From SCENARIOS-SUPPLIER.md section 5.'
});
add({
  type: 'list', kicker: 'Known limits', title: 'What the participant will hit',
  intro: 'Tell the participant up front so a limit is not scored as a usability fault.',
  items: [
    { lead: 'Demo data only:', text: 'nothing reaches Paragon\'s SAP; a page reload resets the demo.' },
    { lead: 'No messages:', text: 'no email or WhatsApp for PTI questions, alerts or call-offs; To do, Stock and the bell only.' },
    { lead: 'No file upload:', text: 'Declare records certificate details only.' },
    { lead: 'Demand anticipation:', text: 'built for suppliers but switched off.' },
    { lead: 'My performance:', text: 'Export Report and Acknowledge & plan are not available.' },
    { lead: 'Sign-in:', text: 'the demo button reads "i View as Supplier"; the "i" is stray text.' },
    { lead: 'One supplier:', text: 'every demo seat is sup-007; all participants see the same data.' },
    { lead: 'Call-off flags:', text: 'Below minimum delivery and Above Max show to PTI only.' }
  ],
  notes: 'From SCENARIOS.md section 4 items 13, 15, 17, 20-24.'
});

module.exports = {
  docTitle: 'Paragon Supplier Portal user guide (supplier)',
  footer: 'Supplier Portal user guide · supplier version · 4 Nov 2026',
  slides,
  screenshots: true
};
