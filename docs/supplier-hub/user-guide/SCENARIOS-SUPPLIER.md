# Paragon Supplier Portal: supplier guide and early user-testing script

**Status:** version B (supplier only) for Wed 4 Nov 2026. It is built from the complete catalog, `SCENARIOS.md`, and keeps only the supplier's screens and tasks. Every label, status and file:line here is the same as in `SCENARIOS.md`, which holds the evidence; where this file cites, the citation is at GitLab `main` `aeabdc83`.
**Two uses:**
1. **Guide.** A supplier user reads sections 1 and 2 to learn the portal one task at a time.
2. **Test script.** A moderator runs sections 3 to 5 with a supplier in an early user test of the end-to-end prototype. Each task has a prompt to read out, a start point, the expected path, a pass condition, what to watch, and questions to ask after.
**Data:** demo data only. Nothing reaches SAP or PTI's real systems. The test supplier is always `sup-007`, "PT Sample Packaging Indonesia". Supplier registration and onboarding are out of scope (a colleague owns them). The RFx (sourcing) and invoice flows are left out of this guide (owner, 2026-11-02); their menus stay in the portal and are marked "Not in this guide" below.

---

## 1. The supplier's portal

**Sign in.** Open the sign-in page → **View as Supplier** (the demo button reads "i View as Supplier"; see section 6). You land on **To do** (`pages/auth/Login.jsx:326`).

**Your lanes (permissions).** A supplier seat holds up to 3 lanes. A missing lane shows "Awaiting {lane}" in place of the button, with the hint "Your role cannot take this action." (`lib/i18n/roles.js:49-53`).

| Lane | What it lets you do |
|---|---|
| Supplier Commercial | Quotations and RFQ, RFI and RFP answers; forecast commitments |
| Supplier Fulfilment | Purchase orders, ASNs, receipt answers, call-offs, stock, feedstock, capacity, answers to PTI questions |
| Supplier Back Office | Invoices, document declarations, forecast acknowledgement |

**Your menu** (`components/layout-v2/navConfig.js:232-296`; labels `lib/i18n/hub.js:82-99`):

| Section | Menu | Use it to | Task |
|---|---|---|---|
| Home | **To do** | See what Paragon waits for, by area, nearest deadline first | T1 |
| Orders | **Purchase orders** | Acknowledge, confirm, adjust or reject a PO; create the ASN | T2 |
| Orders | **Call-offs** | Confirm, change or reject a call-off; answer a delay; send the dispatch notice | T4 |
| Orders | **Shipments & ASN** | Create and submit ASNs | T2, T4 |
| Orders | **Goods receipts** | Acknowledge or dispute a receipt discrepancy | T3 |
| Planning | **Foresight commitments** | Commit to PTI's forecast per period | T5 |
| Planning | **Feedstock reconcile** | Read PO ordered against called off and shipped (read only) | – |
| Planning | **Stock** | Weekly stock update, feedstock, PTI's questions | T7, T8 |
| Planning | **Capacity** | Capacity per week against PTI's LTP | T6 |
| Sourcing | **RFI invitations** · **RFQ invitations** · **RFP invitations** | Answer sourcing events | Not in this guide |
| Invoices | **Invoices** | Create, submit, correct and resubmit invoices | Not in this guide |
| Company | **Profile & documents** | Declare certificates; see expiry | T9 |
| Company | **My performance** | Your scorecard, read only | – |
| Avatar menu | **Help & glossary** | What each term means | – |

**Help on every page.**
- An **(i)** beside a term opens its meaning, then "How it is calculated:", "Also called:" and "Not:" when they apply. Examples: **Supplier stock** and **Your reorder point** on Stock, **LTP, current forecast** and **Allocated** on Capacity (`lib/i18n/forecastUx.js:54-56`).
- **Search... (Ctrl K)** in the top bar finds any page in your menu (`lib/i18n.js:540`).

---

## 2. Supplier tasks at a glance

| Task | Use case in `SCENARIOS.md` | Lane | Menu | Ends in |
|---|---|---|---|---|
| T1 Find what Paragon is waiting for | All | any | To do | The right page, on the right rows |
| T2 Confirm a PO and create its ASN | UC1 | Fulfilment | Purchase orders → Shipments & ASN | PO Confirmed; ASN Submitted |
| T3 Answer a receipt discrepancy | UC1 | Fulfilment | Goods receipts | Answered |
| T4 Confirm a call-off, answer a delay, dispatch | UC2 | Fulfilment | Call-offs | Confirmed; dispatch notice sent |
| T5 Commit to the forecast | UC3 | Commercial, Back Office | Foresight commitments | Submitted; forecast rows acknowledged |
| T6 Submit capacity | UC3, UC5 | Fulfilment | Capacity | Capacity submitted |
| T7 Weekly stock update and feedstock | UC5 | Fulfilment | Stock | Declared; feedstock Confirmed |
| T8 Answer PTI's question and read your alerts | UC5, UC6 | Fulfilment | To do | Answered |
| T9 Declare a certificate | UC4 | Back Office | Profile & documents | Under Review |

---

## 3. How a test session runs

**Goal of early testing:** find where a supplier user gets stuck on the end-to-end prototype before wider rollout. It is not a demo and not a training session.

**People:** 1 supplier participant (planner, sales admin or finance staff of a real supplier), 1 moderator, 1 note-taker. The moderator also plays PTI for the setup steps.

**Time:** 75 minutes: 5 intro, 60 tasks (pick 6 to 8 tasks to fit the participant's job), 10 wrap-up.

**Setup before each session** (moderator, about 10 minutes):
1. Open the portal on the test laptop (prod after the 4 Nov redeploy, or the build named by Levi). Use a fresh browser profile so the demo starts clean; a page reload resets the demo data.
2. Sign in with **View as Supplier**. Check that **To do** shows "PTI has 2 questions for you" (asks `ask-0001` and `ask-0002`, `services/data/mock/stores/supplierAskStore.js:18-60`).
3. For T4's delay: switch **Portal view** to **PTI**, open **Call-offs**, open a confirmed call-off → **Change call-off** → Reason type **LTP dropped** → later need date → **Change and ask again**. Switch back to **Supplier**.
4. Set the language the participant prefers (English or Bahasa Indonesia, top bar). Labels in this script are the English ones.

**Moderator rules:**
- Read the prompt as written. Do not name buttons or menus the prompt does not name.
- Ask the participant to think aloud. When they ask "what do I do?", answer "What would you try?".
- Help only after 3 minutes stuck, or 2 failed tries. Record it as "assisted".
- Do not explain the demo data. If the participant asks why a number is odd, say "it is sample data" and move on.

**What to record per task** (sheet in section 5): pass, assisted or fail; time on task; wrong turns (menu or button tried first); words the participant used for things; confidence after the task (1 to 5); quotes.

---

## 4. Task script

Each task: **Prompt** (read out), **Start**, **Expected path** (exact labels), **Pass when**, **Watch for**, **Ask after**.

### T1 Find what Paragon is waiting for

- **Prompt:** "You start your day in the portal. What does Paragon need from you today, and which one would you do first?"
- **Start:** To do, just after sign-in.
- **Expected path:** Reads **To do** ("What Paragon is waiting for from you, grouped by area, nearest deadline first in each.") → names rows such as "Purchase orders to respond to", "Call-offs to confirm", "Weekly stock update", "PTI has 2 questions for you" → opens one row (`lib/i18n/hub.js:137-139,188-204`; `lib/i18n/inventoryCapacity.js:571-572,613`).
- **Pass when:** the participant names at least 3 waiting items and opens one that lands on the matching rows.
- **Watch for:** whether the area grouping makes sense; whether "PTI has … questions" is noticed above the task list.
- **Ask after:** "What is the most urgent thing here? How do you know?"

### T2 Confirm a PO and create its ASN (UC1)

- **Prompt:** "Paragon sent you a new purchase order. Let them know you received it, confirm you can deliver it, then tell them what you are shipping for an order you already confirmed."
- **Start:** To do → "Purchase orders to respond to", or Orders → **Purchase orders**. Records: PO-2026-00121 (Sent); PO-2026-00127 (Confirmed, nothing shipped) (`data/mockPurchaseOrders/sup007Walkthrough.js:21-35`).
- **Expected path:** open PO-2026-00121 → **Acknowledge receipt** → **Confirm order** with qty and date → status Confirmed. Then PO-2026-00127 → **Create ASN** → ASN wizard on **Shipments & ASN** → **Submit ASN** (`lib/i18n/supplierOrders.js:58,65`; `pages-v2/SupplierOrders/index.jsx:338-354`).
- **Pass when:** PO-2026-00121 shows Confirmed and an ASN for PO-2026-00127 shows Submitted.
- **Watch for:** whether "acknowledge" and "confirm" read as two different acts; whether **Adjust** or **Reject** is tried by mistake; whether the ASN wizard's lines are understood.
- **Ask after:** "Today, how do you confirm a PO to Paragon? What is faster or slower here?"

### T3 Answer a receipt discrepancy (UC1)

- **Prompt:** "Paragon received fewer goods than you shipped on one delivery. Tell them whether you agree."
- **Start:** To do → "Receipt discrepancies to acknowledge or dispute", or Orders → **Goods receipts**. Record: the open discrepancy on PO-2026-00125.
- **Expected path:** **Respond** → write a comment → **Acknowledge** or **Dispute** (both need a comment) (`lib/i18n/fulfilmentCollaboration.js:123,135,136`; `pages-v2/SupplierGoodsReceipts.jsx:357-379`).
- **Pass when:** the receipt shows as answered.
- **Watch for:** whether the participant finds the shipped vs received quantities before answering.
- **Ask after:** "What else would you need to see before you agree or dispute?"

### T4 Confirm a call-off, answer a delay, send the dispatch notice (UC2)

- **Prompt (part 1):** "Paragon called off a delivery from your agreement. Confirm it, but you can only deliver 2 days later than asked."
- **Start:** To do → "Call-offs to confirm", or Orders → **Call-offs**, filter **Awaiting your confirmation**. Record: CO-2026-0003.
- **Expected path:** **Respond** → **Confirm with a new date** → reads "Outside tolerance: PTI must approve this before you ship." → **Send confirmation** (`lib/i18n/callOffs.js:275,285,286`).
- **Prompt (part 2):** "Paragon asked to move one of your confirmed deliveries later. Decide."
- **Expected path:** opens the call-off with "Delay for an LTP drop" → **Approve the delay** or **Reject the delay, keep {date}** (`lib/i18n/callOffs.js:226,237-238`). Needs setup step 3.
- **Prompt (part 3):** "You shipped a confirmed call-off today. Tell Paragon."
- **Expected path:** **Send dispatch notice** (Shipped date, Expected arrival) → **Create the ASN for this call-off** (`lib/i18n/callOffs.js:290,293-299`).
- **Pass when:** CO-2026-0003 shows the new-date confirmation waiting for PTI; the delay is answered; a dispatch notice is sent.
- **Watch for:** whether the tolerance hint is read before sending; whether "dispatch notice" and "ASN" read as different things.
- **Ask after:** "When would you use Partially confirm in 2 deliveries?"

### T5 Commit to the forecast (UC3)

- **Prompt:** "Paragon published its forecast for the next periods. Tell them how much you commit to, period by period. For one period you can only supply 80%."
- **Start:** To do → "New forecast version to review", or Planning → **Foresight commitments**, tab **Commitments**.
- **Expected path:** per row **Commitment ({uom})**, optional **Upside ({uom})** → for the short row, **Reason below forecast** → **Choose a reason** (Capacity, Material, Logistics, Quality, Force Majeure, Discontinued, Other) → **Save draft** → under "Submit by period", **Submit all**. On forecast-zone rows, **Acknowledge** (`lib/i18n/forecastCollaboration.js:59-67,83,122-126,144,156`).
- **Pass when:** the period shows submitted, the short row carries a reason, and forecast-zone rows are acknowledged.
- **Watch for:** whether the participant expects a per-row submit; whether "Draft saved (not visible to PTI)" is noticed; whether "Confirm capacity for {group} first." blocks them and they find **Confirm capacity**.
- **Ask after:** "What does 'Upside' mean to you? What does 'Firm' vs 'Trade-off' mean?"

### T6 Submit capacity (UC3, UC5)

- **Prompt:** "Tell Paragon how much you can produce each week for the next weeks. Your capacity is the same every week. In one week you can add extra capacity."
- **Start:** Planning → **Capacity**, or To do → "Capacity confirmations due", or **Confirm capacity** under "Also due by the same cutoff" in the weekly stock update (BL-236).
- **Expected path:** **Allocated** in the first week → **Copy {week} to all weeks** → **Additional capacity** in one week → tick **Confirm additional capacity** on an amber week → a reason on any week below the LTP → **Submit capacity** (`lib/i18n/inventoryCapacity.js:381,384,392,418`).
- **Pass when:** "Capacity submitted" and every week has a state: Within capacity, Needs additional capacity or Cannot be supplied.
- **Watch for:** whether weeks as columns are read correctly; whether the (i) on **LTP, current forecast** and **Allocated** is opened.
- **Ask after:** "What is the difference between Allocated and Additional capacity?"

### T7 Weekly stock update and feedstock (UC5)

- **Prompt:** "It is your weekly stock update. Send Paragon your stock for the materials still missing, then confirm the feedstock you hold."
- **Start:** To do → "Weekly stock update", or Planning → **Stock**.
- **Expected path:** "Weekly stock update · {sent} of {total} sent · due …" → "Still missing this cycle" → **Enter stock** → **Save stock**. Then **Confirm feedstock** under "Also due by the same cutoff" (or tab **Feedstock to confirm**) → **Confirm** → Feedstock quantity, Confirmed as of → **Confirm feedstock** (`lib/i18n/inventoryCapacity.js:156,240,269,613-631` at `f79a26c1`; `lib/i18n/feedstockConfirm.js:11-37`).
- **Watch for (BL-236):** whether the participant sees that capacity and feedstock are due at the same cutoff as stock.
- **Pass when:** the sent count rises and the material shows feedstock Confirmed.
- **Watch for:** whether "feedstock is not stock" is understood; whether **Upload template** is preferred for many materials.
- **Ask after:** "How do you send stock to Paragon today, and how often?"

### T8 Answer PTI's question and read your alerts (UC5, UC6)

- **Prompt:** "Paragon has a question for you about a production date. Answer it. Then tell me what Paragon is worried about for your materials."
- **Start:** To do → "PTI has 2 questions for you". Record: ask-0001 (production date, PK-PETB-8802).
- **Expected path:** **Answer** → Your answer, Date (optional) → **Send answer** → "Answer sent to PTI". Then scroll to "Alerts about your materials" and read one alert, for example "Your stock figures are out of date" (`lib/i18n/inventoryCapacity.js:571-588`).
- **Pass when:** the question shows as answered and the participant names one alert and the page it points to.
- **Watch for:** whether the alerts are read as the supplier's job or as information.
- **Ask after:** "How would you want to be told about a new question: in the portal, by email or by WhatsApp?" (none is sent today; section 6)

### T9 Declare a certificate (UC4)

- **Prompt:** "Paragon asked for a document, and one of your certificates is about to expire. Deal with both."
- **Start:** To do → "Documents PTI asked for" / "Certificates expired or expiring", or Company → **Profile & documents**. Records: doc-006 (Awaiting Upload), doc-001 (Halal Certificate, Expiring Soon, expires 14 Oct 2026). No sup-007 document is expired at the demo date (`services/data/mock/fixtures/supplierDocuments.js:33,104`).
- **Expected path:** **Declare** → certificate details → **Record declaration** → Under Review (`lib/i18n/supplierDocuments.js:79,84`).
- **Pass when:** doc-006 shows Under Review.
- **Watch for:** the expectation to upload a file (no file is sent today; section 6).
- **Ask after:** "Which documents does Paragon ask you for most often?"

---

## 5. Observation sheet (one per participant)

| Task | Result (pass / assisted / fail) | Time (min) | First wrong turn | Words the participant used | Confidence 1-5 | Quote |
|---|---|---|---|---|---|---|
| T1 | | | | | | |
| T2 | | | | | | |
| T3 | | | | | | |
| T4 | | | | | | |
| T5 | | | | | | |
| T6 | | | | | | |
| T7 | | | | | | |
| T8 | | | | | | |
| T9 | | | | | | |

**Wrap-up questions:**
1. Which task would you do in the portal every week, and which would you rather do by email or WhatsApp?
2. Which word on the screens did not match the word you use at work?
3. What is missing for you to stop sending this information another way?

**After the round:** collect the sheets in one table per task; a task failed or assisted by 2 or more participants is a finding. Log findings in `docs/supplier-hub/BACKLOG.md` with the task number.

---

## 6. What the participant will hit (known limits, supplier side)

From `SCENARIOS.md` section 4:
- **Demo data only.** Nothing reaches Paragon's SAP; a page reload resets the demo.
- **No email or WhatsApp is sent** for PTI questions, alerts or call-offs. The supplier sees them on To do, Stock and the bell only.
- **No file upload to Paragon** for certificates: **Declare** records the details only.
- **Suppliers do not see demand anticipation yet** (built, switched off).
- **My performance** actions are not available ("Report export not available yet").
- **The demo buttons read "i View as Buyer" / "i View as Supplier"**; the "i" is stray text.
- **Every demo seat is sup-007.** All participants see the same supplier and the same data.
