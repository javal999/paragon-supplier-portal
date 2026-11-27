# Paragon Supplier Portal: use-case scenario catalog (complete: PTI and supplier)

**Status:** version for the material planners' session on Wed 4 Nov 2026. It replaces the 6 Oct catalog, which PTI approved with supplier onboarding removed. The supplier-only version is `SCENARIOS-SUPPLIER.md`, which doubles as the script for early supplier user testing.
**Basis:** the code on GitLab `main` at `aeabdc83` (2026-11-02), after BL-233 term labels (MR !65 to !81) froze the labels. The weekly-panel rows (BL-236) and their 5 screenshots follow `f79a26c1`, the main prod runs from 2026-11-02 14:38 WIB. All paths are under `src/`. Rows rewritten on 2026-11-02 cite line numbers at `aeabdc83`. If a behavior has no citation, it is in section 4 (Unverified and known limits).
**Data:** all data is in-memory demo data. Nothing reaches SAP. The demo date is 2026-08-31 (`services/data/fixturePresent.js:184,206`).
**Scope change, 2026-11-02 (owner):** the RFx flow and the invoice flow are left out of this guide; use cases renumbered (section 2).
**What changed since 6 Oct:** call-offs, forecast, stock and alerts rewritten; demand anticipation and replenishment (PTI only) added; section 1 adds the (i) term tips, search and the weekly plan card; section 3 follows the menu as built; section 4 drops the limits that no longer hold or belong to the removed flows.

---

## 1. Roles and lanes

The portal has two separate role concepts, and the deck must explain both.

| Concept | What it does | How to change it in the app | Evidence |
|---|---|---|---|
| **Menu for** (PTI only): Material Planner, Buyer, Finance, All PTI roles | Filters the sidebar sections and the Home tasks. Its hint reads "It does not change what you are allowed to do." | Avatar menu → **Menu for** | `lib/i18n/hub.js:119-125`; `components/layout-v2/hubRole.js` |
| **Roles** (business roles, the real permissions) | Decides which actions a seat can take | Avatar menu → **Roles** → tick or untick. You cannot remove the last role. | `components/layout-v2/IdentityPanel.jsx`; `services/transitions/businessRoles.js` |

**PTI business roles:**

| Role | Main actions it holds |
|---|---|
| Procurement | RFI/RFQ/RFP create, publish, award, cancel; PR approve and reject; qualification lists |
| Requisitioner | PR create, submit, revise |
| Receiving | goods receipt, ASN flag |
| Finance | invoice pay, invoice dispute |
| Compliance | document request and confirmation; qualification lists; alert thresholds |
| Planning | call-off plan and review; stock access; record stock; receipt discrepancy resolve; forecast commitment review; capacity decisions; demand anticipation publish |

**Supplier lanes:**

| Lane | Main actions it holds |
|---|---|
| Supplier Commercial | quotations, RFQ intent, RFI and RFP answers, firm offers, forecast commitments |
| Supplier Fulfilment | PO acknowledge and confirm, ASN, receipt answers, call-off confirm and dispatch, stock, feedstock and capacity, answers to PTI questions |
| Supplier Back Office | invoices, document declarations, forecast acknowledgement |

Evidence for both tables: `services/transitions/businessRoles.js` (`SYSTEM_ROLES`, `LANE_BUNDLES`). Role and lane names are the app's; counts are not restated (the file is the source).

**Demo seats.**
- Sign-in page tabs **Paragon Team** and **Supplier Login** (`pages/auth/Login.jsx:129-130`). Email and password are ignored.
- **View as Buyer** opens the PTI seat with all 6 PTI roles and lands on **My tasks**. **View as Supplier** opens `sup-007`, "PT Sample Packaging Indonesia", with all 3 lanes and lands on **To do** (`pages/auth/Login.jsx:304,326`; `data/mockSuppliers.js:227-230`).
- The sidebar switch **Portal view** (**PTI** / **Supplier**) changes persona; Supplier always seats sup-007 (`lib/i18n/hub.js:10-13`; `components/layout-v2/SidebarV2.jsx`).

**A missing permission.** The action is replaced by **"Awaiting {owner}"**, with the hint "Your role cannot take this action." If no role holds the action, it reads "No role holds this action" (`lib/i18n/roles.js:49-53`; `components/ui-v2/HandoffNotice.jsx`).

**Help on every page (new since 6 Oct).**
- **(i) term tips (BL-233).** Agreed terms show an (i) next to the label. It opens the definition, then "How it is calculated:", "Also called:" (each name with its source) and "Not:", each only when present (`lib/i18n/forecastUx.js:54-56`; `components/forecast/TermTip.jsx:146-165`; registry `lib/glossary/termLabels.glossary.js`). Supplier pages carry them too, for example **Supplier stock** and **Your reorder point** on Stock, **LTP, current forecast** and **Allocated** on Capacity.
- **Help & glossary** (avatar menu, PTI and supplier) opens the Glossary page with every term (`components/layout-v2/navConfig.js:306,364`; `lib/i18n/glossary.js:15`).
- **Search** in the top bar: "Search... (Ctrl K)", or Ctrl K / ⌘ K, lists "Matching pages" from the viewer's own menu (`lib/i18n.js:540,573`; `components/layout-v2/TopBarSearch.jsx:37-38`).
- **My tasks** (PTI, Menu for Material Planner or All) opens with the weekly plan card "Weekly plan, step {step} of {total}: {page}" and the input check; each task's **Open** lands on exactly the rows it counts (`lib/i18n/hub.js:132-136`; `pages-v2/BuyerHome.jsx:203,483`).
- **To do** (supplier) reads "What Paragon is waiting for from you, grouped by area, nearest deadline first in each." (`lib/i18n/hub.js:137-139`).

**Not in the code:**
- There is no admin role. The admin pages sit in **Help & administration** in the avatar menu for every PTI seat (`components/layout-v2/navConfig.js:300-363`).
- A supplier seat cannot change its own access scope: "Contact your administrator to change your access scope." (`components/layout-v2/IdentityPanel.jsx`).

---

## 2. Use cases

**Final list: 7 use cases.** On 2026-11-02 the owner excluded the RFx flow (sourcing: requisitions, RFI, RFQ, RFP, award) and the invoice flow from this guide, so the old sourcing use case is gone, purchase order to payment now ends at the goods receipt, and the use cases are renumbered UC1 to UC7 (the 6 Oct guide's UC2 to UC8). UC6 = alerts; UC7 is new and PTI only. Supplier onboarding and registration are out of scope (a colleague owns them). Screenshot file names keep their old prefixes.

| UC | Name | Change since 6 Oct |
|---|---|---|
| UC1 | Purchase order to goods receipt | Ends at the goods receipt (invoice steps removed); Create ASN from the PO page now works; both receipt answers need a comment |
| UC2 | Call-offs against agreements | Extended: hub drafts at ROP Fisik with below-minimum-delivery and above-Max flags (live stock feed only, none in the demo), delay approval, blanket PO run-out |
| UC3 | Forecast collaboration | Rewritten: no commitment date, Submit all per period, Force Majeure and Discontinued reasons, Move demand to several suppliers; Request revision is switched off |
| UC4 | Compliance documents | Labels re-checked; pill reads "Expiring Soon" |
| UC5 | Shared stock, feedstock, capacity and PTI questions | Rewritten: Stock leads with this week; capacity and feedstock are due with the weekly stock update (BL-236); feedstock confirmation, three capacity states, Copy to all weeks, PTI accept/undo, PTI questions and answers |
| UC6 | Inventory and capacity alerts | Next step and Impact in N days; asks named for their topic |
| UC7 | Demand anticipation (DA) and replenishment | New, PTI only |

**Actor shorthand:**
- **PTI-Proc, PTI-Req, PTI-Rcv, PTI-Fin, PTI-Cmp, PTI-Plan** = PTI with the Procurement, Requisitioner, Receiving, Finance, Compliance or Planning role.
- **Sup-Com, Sup-Ful, Sup-BO** = Supplier with the Commercial, Fulfilment or Back Office lane.

### UC1 Purchase order to goods receipt

**Purpose:** the supplier confirms the PO and ships against an ASN; PTI receives and posts the goods receipt; the supplier answers any receipt discrepancy. Invoicing and payment are left out of this guide (owner, 2026-11-02).

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Orders → **Purchase orders** | **Acknowledge receipt** (optional — Confirm is allowed straight from Sent, so it is not needed first) | Acknowledged, or Sent if skipped | `lib/i18n/supplierOrders.js:65`; `pages-v2/SupplierOrders/components/PanelFooter.jsx:94-103`; `pages-v2/SupplierOrders/hooks/usePoCommands.js:203` |
| 2 | Sup-Ful | same | **Confirm order**, with confirmed qty and date | Confirmed | `pages-v2/SupplierOrders/components/PanelFooter.jsx:125-126,163-170`; `pages-v2/SupplierOrders/hooks/usePoCommands.js:74` |
| 3 | Sup-Ful | same, or Orders → **Shipments & ASN** | **Create ASN** (or **Create ASN now** after confirming) opens the ASN wizard for that PO → **Submit ASN** | ASN Submitted | `lib/i18n/supplierOrders.js:58`; `pages-v2/SupplierOrders/index.jsx:338-354`; `pages-v2/shipments/asnWizardEntry.js:42`; `pages-v2/SupplierShipments/index.jsx:306,346-349` |
| 4 | PTI-Rcv | Order collaboration → **Goods receipts** | **New GR** → 4-step wizard → **Create GR** | Approved → Posted to SAP | `pages-v2/BuyerGoodsReceipt/components/GoodsReceiptHeader.jsx:63`; `components/v2-features/GRInspectionWizard/index.jsx:206`; `services/transitions/grRollup.js` |

**Negative end-to-end: supplier adjusts the PO and PTI rejects the counter-offer**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Purchase orders | **Adjust** → **Send adjustment** | Adjusted | `lib/i18n/orderCollaboration.js:51,54`; `pages-v2/SupplierOrders/components/PanelFooter.jsx:146-148,178-184` |
| 2 | PTI (MP menu) | Order collaboration → **Purchase orders** | **Reject counter-offer** → comment → **Send back to supplier** | Sent | `lib/i18n/orderCollaboration.js:80,82`; `pages-v2/BuyerOrders/components/PoCounterReview.jsx:64,96` |
| 3 | Sup-Ful | Purchase orders | **Confirm order**, or **Reject** with a cause → **Send rejection** | Confirmed or Rejected (terminal) | `lib/i18n/orderCollaboration.js:52,55`; `pages-v2/SupplierOrders/components/PanelFooter.jsx:153-156,187-192`; `pages-v2/SupplierOrders/hooks/usePoCommands.js:164` |

**Negative end-to-end: short receipt**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Rcv | Goods receipts | **Create GR** with rejected or short lines | GR Partially Approved; ASN flagged Discrepancy | `services/transitions/cascades.js` |
| 2 | Sup-Ful | Orders → **Goods receipts** | **Respond** → comment → **Acknowledge** or **Dispute** (both need a comment) | Answered | `lib/i18n/fulfilmentCollaboration.js:123,135,136`; `pages-v2/SupplierGoodsReceipts.jsx:346,357-379` |
| 3 | PTI-Rcv or PTI-Plan | Goods receipts → Shipment discrepancies | **Reconcile**, or **Resolve** a dispute | ASN Delivered | `lib/i18n/goodsReceipt.js:301`; `pages-v2/BuyerGoodsReceipt/components/DiscrepancySection.jsx:90`; `pages-v2/receipts/ReceiptDisputesSection.jsx:116` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Confirmed qty above the ordered qty | Blocked | Sup-Ful | Purchase orders | `services/transitions/policies/purchaseOrder.js:38,51-54` |
| ASN qty above the open qty | Refused (OVER_OPEN_QUANTITY) unless an over-ship reason is given | Sup-Ful | Shipments & ASN | `services/transitions/fulfilmentRules/asn.js:160-162`; `services/data/mock/MockCommandService.js:783-816` |
| Shelf life too short | **Request shelf-life exception**; ASN goes to Awaiting exception | PTI approves or rejects | Shipments & ASN | `lib/i18n/fulfilmentCollaboration.js:64`; `pages-v2/SupplierShipments/components/SubmitAsnPanel.jsx:104` |
| GR on Quality Hold | **Request lab retest** → Under Inspection | PTI-Rcv | Goods receipts | `lib/i18n/goodsReceipt.js:72`; `pages-v2/BuyerGoodsReceipt/components/footerForStatus.jsx:105` |
| Supplier seat without the Fulfilment lane opens a Confirmed PO | "Awaiting Supplier Fulfilment" replaces **Create ASN** | Sup-Ful | Purchase orders | `pages-v2/SupplierOrders/index.jsx:338-354` |

### UC2 Call-offs against agreements

**Purpose:** PTI releases call-offs against a blanket PO (agreement) line; the supplier confirms, changes or rejects, then dispatches and creates the ASN. Since 6 Oct the hub also drafts call-offs itself when PTI stock reaches ROP Fisik, and flags quantities below the supplier's minimum delivery or above Max. Those drafts are made only when the PTI stock feed refreshes (the eWM seam `applyPtiStockRefresh`, `services/data/mock/MockCommandService.js:1646`), which no screen calls, so the demo has none (section 4 item 22).

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | Order collaboration → **Call-offs**, tab **To act** | **New call-off** on a blanket PO line → Type, Quantity, Need date (the panel shows what remains on the line). With a live stock feed, the hub's own drafts appear here marked **Drafted at ROP Fisik**, with "Why the hub drafted this" (ROP Fisik, Max Stock, released not yet received, drafted quantity) | Draft | `lib/i18n/callOffs.js:59,178-203,337`; `pages-v2/BuyerCallOffs/components/UmbrellaSection.jsx:102`; `services/transitions/callOffTriggerRules.js:1-35` |
| 2 | PTI-Plan | same | **Release to supplier** (or **Save as draft**, **Dismiss draft**) | Awaiting Confirmation | `lib/i18n/callOffs.js:159-160,173-175`; `pages-v2/BuyerCallOffs/components/DraftSection.jsx:88,109,127`; `services/transitions/flows/callOff.flow.js:65-126` |
| 3 | Sup-Ful | Orders → **Call-offs** (filter **Awaiting your confirmation**) | **Respond** → **Confirm as requested** → **Send confirmation** | Confirmed | `lib/i18n/callOffs.js:22,274,286`; `pages-v2/SupplierCallOffs/components/CallOffRow.jsx:88-94`; `pages-v2/SupplierCallOffs/components/RespondForm.jsx:50-61,151` |
| 4 | Sup-Ful | same | **Send dispatch notice** (Shipped date, Expected arrival, ASN optional) | Confirmed (dispatched) | `lib/i18n/callOffs.js:293-299`; `pages-v2/SupplierCallOffs/components/DispatchSection.jsx:94-179` |
| 5 | Sup-Ful | same → Shipments & ASN | **Create the ASN for this call-off** (opens the ASN wizard with the call-off chosen) | ASN Submitted | `lib/i18n/callOffs.js:290,306-310`; `pages-v2/SupplierCallOffs/components/DispatchSection.jsx:74-84` |

**Negative end-to-end: confirmation outside tolerance, PTI rejects and asks again**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Call-offs | **Respond** → **Confirm with a new date** (or **Confirm with a different quantity**) → hint "Outside tolerance: PTI must approve this before you ship." → **Send confirmation** | Confirmed with New Date, waiting for PTI | `lib/i18n/callOffs.js:269-270,275-276,285`; `pages-v2/SupplierCallOffs/components/RespondForm.jsx:138` |
| 2 | PTI-Plan | Call-offs, filter **Awaiting approval** | "Confirmation outside tolerance" → comment → **Reject** (or **Approve**) | Awaiting Confirmation (Approve keeps the confirmation) | `lib/i18n/callOffs.js:17,241-246`; `pages-v2/BuyerCallOffs/components/ReviewSection.jsx:33-65`; `services/transitions/flows/callOff.flow.js:205-229` |
| 3 | PTI-Plan | same | **Change and ask again** | Awaiting Confirmation | `lib/i18n/callOffs.js:216-223`; `pages-v2/BuyerCallOffs/components/ChangeSection.jsx:64-121` |

**Negative end-to-end: PTI delays a call-off because the LTP dropped (BL-191)**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | Call-offs | On a confirmed call-off: **Change call-off** → Reason type **LTP dropped** → later need date, same quantity → **Change and ask again** | Awaiting the supplier's answer to the delay | `lib/i18n/callOffs.js:216-221`; `pages-v2/BuyerCallOffs/components/ChangeSection.jsx:86-89`; `services/transitions/reasonCodes.js:129,143` |
| 2 | Sup-Ful | Call-offs | **Approve the delay**, or **Reject the delay, keep {date}** | Confirmed; the need date moves only on approval | `lib/i18n/callOffs.js:237-238`; `pages-v2/SupplierCallOffs/components/DelayAnswerForm.jsx:41-57`; `services/transitions/callOffRules.js:477-491` |
| 3 | Both | Call-offs | Read "Delay for an LTP drop" in the call-off history | – | `lib/i18n/callOffs.js:226`; `pages-v2/callOffs/CallOffDelays.jsx` |

**Negative end-to-end: supplier rejects the call-off**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Call-offs | **Respond** → **Reject**, with a reason → **Send rejection** | Rejected | `lib/i18n/callOffs.js:278,287` |
| 2 | PTI-Plan | Call-offs | **Change and ask again** | Awaiting Confirmation | `pages-v2/BuyerCallOffs/components/ChangeSection.jsx:64-121` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Drafted quantity below the supplier's minimum delivery (BL-232) | Pill **Below minimum delivery** beside "Supplier minimum delivery"; the planner is told to check with the supplier before release. PTI side only. | PTI-Plan | Call-offs | `lib/i18n/callOffs.js:190-195`; `pages-v2/BuyerCallOffs/components/ropFisikTrigger.jsx:103-131`; `services/transitions/callOffTriggerRules.js:381-399` |
| The minimum delivery does not fit under Max (BL-230) | Pill **Above Max**: "stock will go above Max when it arrives". The call-off is still drafted. | PTI-Plan | Call-offs | `lib/i18n/callOffs.js:196-198`; `services/transitions/callOffTriggerRules.js:79-87,357-362` |
| ROP Fisik reached, no blanket line has balance (live stock feed only) | What to order shows "Create a PR in SAP: no umbrella PO balance at ROP Fisik" | PTI-Plan raises the PR in SAP | What to order | `lib/i18n/callOffs.js:205`; `pages-v2/BuyerOrderPlan/index.jsx:207-210` |
| Blanket PO running out (CAP-9) | Tab **Blanket POs running out**: "Runs out", "New PO needed by", pill **Raise the next PO** within 4 weeks; lines of one supplier and material are drawn oldest first | PTI-Proc raises the next PO in SAP | Call-offs | `lib/i18n/callOffs.js:34-55,339`; `services/transitions/blanketPoRules.js:48,227,271,312` |
| Call-off above the remaining agreement qty or value | Release is disabled, and refused (EXCEEDS_REMAINING / _VALUE) | PTI-Plan | Call-offs | `lib/i18n/callOffs.js:155-158`; `services/data/mock/MockCommandService.js:1708-1727` |
| Supplier confirms up to +5% over the requested qty | Accepted at once ("Within tolerance: this will be accepted immediately."). Above it, or a later date, needs PTI approval. The 5% is an admin setting. | PTI-Plan | Call-offs | `lib/i18n/callOffs.js:80-82,284`; `services/transitions/hubSettings.js:89-95`; `services/transitions/callOffRules.js:381-436` |
| Draft from a What to order recommendation | Release withheld while the plan runs on simulated data (ENGINE_DATA_SIMULATED). Drafts at ROP Fisik and from Below DA are not withheld. | – | Call-offs | `lib/i18n/callOffs.js:212`; `services/data/mock/MockCommandService.js:1690-1702` |
| Change after dispatch | Refused (ALREADY_DISPATCHED) | – | Call-offs | `services/data/mock/MockCommandService.js:1779` |
| Partial confirmation | **Partially confirm in 2 deliveries** (Delivery 1 and 2 quantity and date) → Partially Confirmed | PTI-Plan | Call-offs | `lib/i18n/callOffs.js:277,281-282` |

### UC3 Forecast collaboration

**Purpose:** PTI shares its forecast; the supplier commits quantities per period; PTI accepts the shortfall or moves demand to other suppliers.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI (MP menu) | Weekly plan → **This week** | Reads the input check and the step cards; **Open {page}** goes to the next step | – | `lib/i18n/forecastUx.js:83-103`; `pages-v2/BuyerThisWeek.jsx:60-84,145-205` |
| 2 | Sup-Com | Planning → **Foresight commitments**, tab **Commitments** | Per row: **Commitment ({uom})** and **Upside ({uom})** (no date since CAP-6) → **Save draft** | Draft ("Draft saved (not visible to PTI)") | `lib/i18n/forecastCollaboration.js:125-126,284`; `pages-v2/SupplierForecastCommitments/components/CommitmentRow.jsx:86-103,151-158` |
| 3 | Sup-Com | same, "Submit by period" | **Submit all** (one per period, every material together) | Submitted: Accepted, or Outside tolerance | `lib/i18n/forecastCollaboration.js:144,156,162`; `pages-v2/SupplierForecastCommitments/components/PeriodSubmitRow.jsx:121-128` |
| 4 | Sup-BO | same | **Acknowledge** on Forecast-zone rows ("No commitment is needed.") | Acknowledged | `lib/i18n/forecastCollaboration.js:122-123`; `pages-v2/SupplierForecastCommitments/components/ForecastZoneRow.jsx:51,57-65` |
| 5 | PTI-Plan | Weekly plan → **Foresight commitments**, tab **Commitments & gaps** | **Accept** → panel "Accept commitment" → **Accept** | Accepted by PTI | `lib/i18n/forecastCollaboration.js:36,216,245,280`; `pages-v2/BuyerCommitments/components/ExceptionRow.jsx:123-129` |

**Negative end-to-end: commitment below forecast, PTI moves demand**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Com | Foresight commitments | Commits below forecast and picks a **Reason below forecast**: Capacity, Material, Logistics, Quality, Force Majeure, Discontinued, Other (the last 3 need a note) | Submitted, Outside tolerance | `lib/i18n/forecastCollaboration.js:59-67,83,135`; `pages-v2/SupplierForecastCommitments/components/CommitmentRow.jsx:106-135` |
| 2 | PTI-Plan | Foresight commitments → Commitments & gaps | **Move demand** → "Move demand to other suppliers": a quantity per qualified supplier, a note the supplier can read → **Move demand** | New forecast version published | `lib/i18n/forecastCollaboration.js:218,244,247,255-268`; `pages-v2/BuyerCommitments/components/ActionPanelBody.jsx:115-229` |
| 3 | Sup-Com (other supplier) | Foresight commitments, sub-tab **Changes** | Reads the changed lines (previous and current version) and commits again | Draft → Submitted | `lib/i18n/forecastCollaboration.js:87-89,120`; `pages-v2/SupplierForecastCommitments/components/ChangesTable.jsx` |

**Negative end-to-end: capacity not confirmed**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Com | Foresight commitments | **Submit all**; blocked with "Confirm capacity for {group} first." and a **Confirm capacity** link | Draft | `lib/i18n/forecastCollaboration.js:153,158`; `pages-v2/SupplierForecastCommitments/components/PeriodSubmitRow.jsx:73-76,136-140` |
| 2 | Sup-Ful | Planning → **Capacity** | Enters capacity → **Submit capacity** (see UC5) | Capacity submitted | `lib/i18n/inventoryCapacity.js:418-419` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| New forecast version | A commitment carries forward if the period qty is unchanged; otherwise it goes back to awaiting. **Changes** lists every changed or new line. | Sup-Com | Foresight commitments | `services/transitions/forecastRules.js`; `lib/i18n/forecastCollaboration.js:87-89,164-166` |
| Move demand above a supplier's headroom | Warns ("You can still move it."); a total above the shortfall is refused | PTI-Plan | Foresight commitments | `lib/i18n/forecastCollaboration.js:260-263` |
| Firm vs Trade-off line | Firm: any shortfall is an exception. Trade-off: up to 10% short is auto-accepted. | PTI-Plan | Foresight commitments | `services/transitions/forecastRules.js` |
| Supplier marks a material Discontinued | PTI gets the alert "The supplier marked this material Discontinued: it needs another source" (UC6) | PTI-Plan | Alerts | `lib/i18n/inventoryCapacity.js:434-450` |
| Spreadsheet route | **Download forecast**, **Download commitment template**, **Upload commitments**; an old file with a date column is accepted and the date ignored | Sup-Com | Foresight commitments | `lib/i18n/forecastCollaboration.js:121,170-171`; `pages-v2/SupplierForecastCommitments/components/CommitmentRow.jsx:25-26` |
| PTI wants a revision | **Request revision** is switched off (`REQUEST_REVISION_ENABLED = false`); PTI accepts or moves demand | – | Foresight commitments | `services/transitions/forecastConfig.js:351`; `pages-v2/BuyerCommitments/components/ExceptionRow.jsx:130` |

### UC4 Compliance documents

**Purpose:** PTI asks for a certificate; the supplier declares it; PTI confirms or refuses it. Expiry is tracked.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Cmp | Sourcing → **Supplier documents** | **Ask for a document** → **Check it over** → **Open the request** | Awaiting Upload | `lib/i18n/compliance.js:151,170,172`; `pages-v2/BuyerCompliance/index.jsx:173`; `pages-v2/BuyerCompliance/components/RequestPanelFooter.jsx:34,44` |
| 2 | Sup-BO | Company → **Profile & documents** (To do: "Documents PTI asked for") | **Declare** → **Record declaration** | Under Review | `lib/i18n/supplierDocuments.js:79,84`; `lib/i18n/hub.js:196`; `pages-v2/SupplierDocuments/components/DeclarationPanel.jsx:69` |
| 3 | PTI-Cmp | Supplier documents → "Declared certificates awaiting review" | **Confirm** | Valid | `lib/i18n/compliance.js:99,112`; `pages-v2/BuyerCompliance/components/ReviewQueueItem.jsx:73` |

**Negative end-to-end: declaration refused**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Cmp | Supplier documents | **Refuse** → reason → **Record refusal** | Rejected | `lib/i18n/compliance.js:113,115`; `pages-v2/BuyerCompliance/components/ReviewQueueItem.jsx:85`; `pages-v2/BuyerCompliance/components/RejectReasonForm.jsx:56` |
| 2 | Sup-BO | Profile & documents | Sees "{count} document was refused:" → **Declare again** | Under Review | `lib/i18n/supplierDocuments.js:119,137`; `services/transitions/flows/supplierDocument.flow.js:115-117` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Certificate past its expiry date | Red "Expired" pill; banner "…immediate renewal required". No sup-007 document is expired at the demo date. | Sup-BO | Profile & documents | `services/data/dayProjection.js:138,210-219`; `lib/i18n/supplierDocuments.js:34-36` |
| Expiring within 180 days (doc-001, Halal Certificate, expires 14 Oct 2026 after the demo date shift) | Amber "Expiring Soon" pill; filter "Expiring soon"; To do task "Certificates expired or expiring" | Sup-BO | Profile & documents; To do | `services/data/documentDisplayState.js:158,176`; `lib/statusLabel.js:43`; `lib/i18n/supplierDocuments.js:59`; `lib/i18n/hub.js:194` |
| No expiry date (BPJPH) | Treated as no expiry | – | Profile & documents | `pages-v2/SupplierDocuments/hooks/useDeclarationPanel.js` |
| Confirming a document | Does not update the compliance registry table (a separate fixed list) | – | Supplier documents | `pages-v2/BuyerCompliance/index.jsx` |

### UC5 Shared stock, feedstock, capacity and PTI questions

**Purpose:** suppliers share stock, feedstock and capacity every week; PTI reads them by risk, decides on capacity gaps and asks the supplier when something is missing.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Planning → **Stock** (or To do → "Weekly stock update") | The page leads with "Weekly stock update · {sent} of {total} sent · due …" and "Still missing this cycle" → **Enter stock** (or **Enter stock on screen** / **Upload template**) → **Save stock**. Under "Also due by the same cutoff" the panel also counts Capacity ("{confirmed} of {total} groups confirmed", **Confirm capacity**) and Feedstock ("{confirmed} of {total} confirmed", **Confirm feedstock**) (BL-236) | Declared | `lib/i18n/inventoryCapacity.js:154,201,240,269,613-631` (at `f79a26c1`); `pages-v2/inventory/WeeklyUpdatePanel.jsx:166-199` (at `f79a26c1`); `pages-v2/SupplierInventory.jsx:233-271`; `pages-v2/inventory/WeeklyUpdatePanel.jsx:156-200` |
| 2 | Sup-Ful | Stock, tab **Feedstock to confirm** | "Current feedstock" → **Confirm** → Feedstock quantity, Confirmed as of → **Confirm feedstock** (feedstock does not count as stock) | Confirmed | `lib/i18n/inventoryCapacity.js:156`; `lib/i18n/feedstockConfirm.js:11-37`; `pages-v2/SupplierInventory.jsx:273-275` |
| 3 | Sup-Ful | Planning → **Capacity** | Weeks as columns: **Allocated**, **Additional capacity** per week; **Copy {week} to all weeks**; a reason on any week below the LTP; on an amber week tick **Confirm additional capacity** → **Submit capacity** | Capacity submitted; each week Within capacity, Needs additional capacity or Cannot be supplied | `lib/i18n/inventoryCapacity.js:374-384,392,415,418-419`; `pages-v2/SupplierCapacity.jsx:287,323,408-641` |
| 4 | PTI (MP menu) | Inventory & capacity → **Stock** | Risk-first table and tiles (High risk, PTI stock below PTI ROP, Supplier figures out of date, No lead time on record); a row opens the material drawer: **Open stock simulation**, **Create call-off** or **Create PO request**, an ask button, "Feedstock (confirmed {date})" | – | `lib/i18n/inventoryCapacity.js:87-94,119`; `lib/i18n/feedstockConfirm.js:57-58`; `pages-v2/inventory/MaterialDrawer.jsx:231,300-370` |
| 5 | PTI-Plan | Inventory & capacity → **Capacity** | On an amber week: **Accept additional capacity** (**Undo** takes it back), or **Ask about the capacity gap** | Additional capacity accepted | `lib/i18n/capacityDecision.js:17-37`; `lib/i18n/inventoryCapacity.js:521`; `pages-v2/inventory/CapacityGapActions.jsx:102-146` |
| 6 | Sup-Ful | To do or Stock → "PTI has {count} question(s) for you" | **Answer** → Your answer, Date (optional) → **Send answer** | Answered; PTI closes the ask | `lib/i18n/inventoryCapacity.js:571-577`; `pages-v2/inventory/PtiAsksBlock.jsx:53-202`; `pages-v2/SupplierHome.jsx:600-638` |
| 7 | Sup-Ful | Capacity | Reads "PTI accepted your additional capacity on {date}" in the row "PTI's decision" | – | `lib/i18n/capacityDecision.js:33`; `pages-v2/SupplierCapacity.jsx:607` |

**Negative end-to-end: supplier reply arrives by message and cannot be read**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | Home → **Supplier follow-ups** → **Record a reply** | Pick supplier → paste reply → **Parse reply** | "Could not interpret this as a stock update." | `lib/i18n/buyerCommHub.js:14`; `lib/i18n/commHubInbound.js:23,37` |
| 2 | PTI-Plan | Stock → material drawer | **Record stock from a supplier message**, entered by hand → **Record stock** | Declared | `lib/i18n/inventoryCapacity.js:82,270` |

**Negative end-to-end: capacity week cannot be covered**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Capacity | Submits a week below the LTP without a reason | Refused: "The week of {week} is below the LTP. Choose a reason." | `lib/i18n/inventoryCapacity.js:415` |
| 2 | Sup-Ful | Capacity | Picks a reason (Force Majeure, Discontinued and Other need a note) → **Submit capacity** | Week shows Cannot be supplied (red) | `lib/i18n/inventoryCapacity.js:377,392-398` |
| 3 | PTI-Plan | Capacity | Red week: "Additional capacity cannot cover this week. Still short:" (no accept offered) → **Ask about the capacity gap** or move demand (UC3) | Open | `lib/i18n/capacityDecision.js:20`; `services/transitions/capacityDecisionRules.js:52-59` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Supplier on API sync vs manual entry | API suppliers see "Stock sync schedule", Last sync, Next sync; manual suppliers get the weekly panel. The mode is set in admin. | PTI admin | Supplier stock update mode | `lib/i18n/inventoryCapacity.js:625-626`; `pages-v2/inventory/WeeklyUpdatePanel.jsx` |
| PTI stops sharing its stock (INV-D11) | The supplier reads "PTI stopped sharing its stock with you on {date}."; PTI stock columns disappear | – | Stock (supplier) | `lib/i18n/inventoryCapacity.js:161`; `pages-v2/SupplierInventory.jsx:183-188,295-299` |
| Changing an additional-capacity figure | Clears its confirmation; the supplier ticks **Confirm additional capacity** again | Sup-Ful | Capacity | `pages-v2/SupplierCapacity.jsx:474-488` |
| PTI undoes an accepted week | "Acceptance undone. The week counts toward the capacity alert again." | PTI-Plan | Capacity | `lib/i18n/capacityDecision.js:35-37` |
| Supplier seat without the Fulfilment lane | "Awaiting Supplier Fulfilment" in place of the Stock buttons | Sup-Ful | Stock | `pages-v2/SupplierInventory.jsx:253` |

### UC6 Inventory and capacity alerts

**Purpose:** the portal checks stock, capacity, forecast commitments, call-offs and demand anticipation against 12 rules and raises an alert for each risk; Planning acts on it and closes it with a reason. Alerts are computed live each time they are read (`services/transitions/inventoryAlertRules.js:81-114`).

**The 12 rules** (labels `lib/i18n/inventoryCapacity.js:434-450`; supplier wording `:579-588`; PTI-only list `services/transitions/inventoryAlertRules.js:103-114`)

| Rule (label as on Alerts) | Supplier sees it |
|---|---|
| PTI stock is below the PTI reorder point | No |
| Supplier stock is below the system-calculated supplier reorder point (ROP Supplier) | Yes |
| PTI stock runs out before the next incoming delivery | No |
| Allocated capacity is below the LTP | Yes |
| Supplier stock figures are out of date | Yes |
| Supplier stock and incoming do not cover the next 30 days of demand | Yes |
| Committed quantity below forecast beyond tolerance | Yes |
| No supplier lead time on record: risk uses the day bands until the master data is fixed | No |
| A confirmed call-off due within the lead time is larger than the supplier stock plus production due before the need date | No |
| The supplier marked this material Discontinued: it needs another source | No |
| A blanket PO runs out soon: raise the next PO by its "new PO needed by" week | No |
| Supply above demand anticipation (DA) is more than the last week of the horizon can absorb | No |

**Urgency:** High when cover < 1× lead time, Medium < 1.5×, else Low; with no lead time, day bands. Thresholds and stale periods are set per material group under Help & administration → **Alert thresholds and stale periods**, editable by the Compliance role (`services/transitions/inventoryRules.js`; commit 72592a0f).

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful / Sup-Com | Stock · Capacity · Foresight commitments | Updates data (or fails to) | – | `services/transitions/inventoryAlertRules.js` |
| 2 | PTI (MP menu) | Home → **My tasks** / Inventory & capacity → **Alerts** | Reviews open alerts, highest risk first; filters by severity, planning group, PIC | Open | `pages-v2/BuyerAlerts.jsx` |
| 3 | Sup (any lane) | Home → **To do** → "Alerts about your materials" | Sees own open alerts from 5 rules; **Open inventory**, **Open capacity** or **Open commitments & gaps** | Open | `lib/i18n/inventoryCapacity.js:578-588`; `services/data/mock/MockProcurementService.js:667-670` |
| 4 | PTI-Plan | Alerts | Reads **Next step** and "Impact in {count} days", acts with the alert's own action (**Open stock simulation**, **Create call-off** or **Create PO request**, or an ask named for its topic: **Ask for a production date**, **Ask for stock figures**, **Ask about the capacity gap**) | Open | `lib/i18n/inventoryCapacity.js:474-479,519-522`; `pages-v2/inventory/alertNextStep.jsx:46-59,117-137` |
| 5 | Sup-Ful | To do → "PTI has {count} question(s) for you" | **Answer** → **Send answer** | Answered | `lib/i18n/inventoryCapacity.js:571-577` |
| 6 | PTI-Plan | Alerts | **Close alert** → Reason (for example "Supplier updated its data") | Closed | `lib/i18n/inventoryCapacity.js:401-407,457` |

**Negative end-to-end: closing without the right role or note**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI without Planning | Alerts | Sees "Awaiting Planning" instead of **Close alert** | Open | `pages-v2/BuyerAlerts.jsx` |
| 2 | PTI-Plan | Alerts | Closes with "Other (note required)" and no note: refused | Open | `lib/i18n/inventoryCapacity.js:407`; `services/transitions/inventoryAlertRules.js` |
| 3 | PTI-Plan | Alerts | Adds a note under "What was done", closes | Closed | same |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| PTI accepted additional capacity on an amber week | That week stops counting toward the capacity alert (INV-D12) | – | Alerts | commit 512b7773; `lib/i18n/capacityDecision.js:37` |
| No lead time on record | Day bands decide urgency; no "Impact" line | PTI fixes master data | Alerts | `pages-v2/inventory/alertNextStep.jsx:62-65` |
| Condition clears before anyone acts | Alert disappears; no closure recorded | – | Alerts | `services/data/mock/inventoryReadModel.js` |
| Condition clears, then returns | A new alert opens | PTI-Plan | Alerts | `services/transitions/inventoryAlertRules.js` |
| Demo reset | Closures lost; all alerts Open again | – | Alerts | `services/data/mock/stores/inventoryHubStores.js` |

### UC7 Demand anticipation (DA) and replenishment (PTI only, new)

**Purpose:** each week the planner publishes the demand anticipation (DA) per supplier × material over its lead-time horizon, checks plan against execution, and turns any gap into a draft call-off or a PR in SAP. The supplier is not involved yet: the supplier DA view is built but switched off (`SUPPLIER_DA_VIEW_ENABLED = false`, `services/transitions/supplierDaView.js:31`). The horizon is the lead time and rolls weekly; the fixed 4-week horizons of CAP-D17 were retired (commit 93fed066).

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI (MP menu) | Weekly plan → **Demand anticipation (DA)**, tab **This week** | Reads the status line (published or not), **Show the weeks** on a card: LTP, Safety order, Carry-over, Demand anticipation (DA), Open supply, Gap | – | `lib/i18n/demandAnticipation.js:61,118`; `pages-v2/BuyerDemandAnticipation/index.jsx:147-296`; `lib/glossary/termLabels.glossary.js:75-180` |
| 2 | PTI-Plan | same | Reads **Plan vs execution**: Horizon (lead time), Total demand anticipation, ROP Order, Total OSPO, Gap, Result (Balanced, Surplus absorbed, or Shortfall: recommend a PR) | – | `lib/i18n/demandAnticipation.js:74-105`; `pages-v2/BuyerDemandAnticipation/components/PlanCheck.jsx:64-201` |
| 3 | PTI-Plan | same, tab **Record consumption** | Types or uploads consumption (**Download consumption template**, **Upload consumption file**) | Recorded for this week | `lib/i18n/consumption.js:10-37` |
| 4 | PTI-Plan | same | **Publish demand anticipation (DA) · {week}** → tick "Supplier agreed to take the remainder after the horizon" if it applies → **Publish** | Published ("Demand anticipation published for {week}") | `lib/i18n/demandAnticipation.js:31-46`; `pages-v2/BuyerDemandAnticipation/components/PublishPanel.jsx:63-147` |
| 5 | PTI-Plan | Weekly plan → **What to order**, section **Below demand anticipation (DA)** | Reads Gap and Proposal ("Call off {qty} on {po}", oldest blanket line with balance, or "New PO needed: …") → **Create draft call-off** | Draft call-off created | `lib/i18n/supplyGap.js:14-49`; `pages-v2/BuyerOrderPlan/components/BelowDemandSection.jsx:74-231` |
| 6 | PTI-Plan | Order collaboration → **Call-offs** | **Release to supplier** (UC2 continues with the supplier) | Released; counts as Open supply and the Gap shrinks | `lib/i18n/callOffs.js:160`; `lib/i18n/supplyGap.js:41-42` |
| 7 | PTI (MP menu) | Review → **Demand anticipation (DA) history** (or **Publication history** on the DA page) | Filters by planning week; **Export CSV**; each row In force or Superseded | – | `lib/i18n/demandAnticipationHistory.js:11-49` |

**Negative end-to-end: draft from the order plan cannot be released**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | What to order, recommendations | **Create draft call-off** | Draft | `pages-v2/BuyerOrderPlan/hooks/useDraftCallOff.js:46` |
| 2 | PTI-Plan | Call-offs | **Release to supplier** is withheld: "Not released to the supplier: this draft comes from an order-plan recommendation calculated on simulated data…" | Draft (edit or dismiss) | `lib/i18n/callOffs.js:212`; `lib/i18n/orderPlan.js:136` |

**Negative end-to-end: publishing the same week twice**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | Demand anticipation (DA) | Opens Publish when no figure differs from the publication in force (the demo: "0 supplier × materials differ") | **Publish** stays disabled; the command itself refuses with "Could not publish demand anticipation" (NOTHING_CHANGED) | `lib/i18n/demandAnticipation.js:44`; `services/data/mock/targets/demandAnticipation.js:63-71` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Supply above a week's DA (BL-228) | Carries forward and reduces later weeks' Gap; the Gap cell tips "{qty} carried from earlier weeks" | – | What to order | `lib/i18n/supplyGap.js:22`; `services/transitions/supplyBelowDemandRules.js:19-104` |
| Surplus larger than the last week can take | "Surplus: {qty} absorbed in {week}; {left} more than that week can take", and the alert "Supply above demand anticipation (DA)…" (UC6) | PTI-Plan | DA; Alerts | `lib/i18n/demandAnticipation.js:95-96` |
| No lead time on record | Horizon falls back to 4 weeks, flagged on the card | PTI fixes master data | DA | `lib/i18n/demandAnticipation.js:107`; `services/transitions/demandAnticipationRules.js:105` |
| PTI stock reaches ROP Fisik (live stock feed only) | The hub drafts a call-off ("Drafted at ROP Fisik", UC2); with no blanket balance, "Create a PR in SAP…" | PTI-Plan | Call-offs; What to order | `lib/i18n/callOffs.js:178-211` |
| Trying an alternative | **Try a what-if** on a Stock, What to order or Below DA row opens the What-if sandbox: "Analysis only — nothing here changes the plan or reaches suppliers or SAP" | PTI-Plan | What-if sandbox (no menu item) | `lib/i18n/whatIfSandbox.js:12,212` |
| ROP Order, ROP Fisik, Max Stock and the OSIP level | Kept on Planning engine · Safety stock targets (avatar menu); a suggested level shows "Use suggestion", labelled Proposed | PTI-Plan | Safety stock targets | `lib/i18n/safetyStock.js:256`; `pages-v2/BuyerSafetyStock.jsx:62-73,366-397` |

---

## 3. Menu Directory

Every item in `components/layout-v2/navConfig.js`, with labels from `lib/i18n/hub.js:17-116`, at `aeabdc83`. "Role" is the **Menu for** view that shows the item. Seeing a menu does not mean the user can take its actions (section 1).

### PTI main menu

| Menu label | Section | Role | What it does | Use case |
|---|---|---|---|---|
| My tasks | Home | All | Counts what needs action; weekly plan card; each **Open** lands on the rows its count names | All |
| Supplier follow-ups | Home | All | Suppliers to follow up, record a reply, request log | UC5 |
| Purchase orders | Order collaboration | Material Planner | Summary and List views; a PO's steps link to its stage pages | UC1 |
| Call-offs | Order collaboration | Material Planner | Release call-offs, review confirmations; tabs To act, All call-offs, Blanket POs running out | UC2 |
| Shipments & ASN | Order collaboration | Material Planner | Tracks ASNs; approves shelf-life exceptions | UC1 |
| Goods receipts | Order collaboration | Material Planner | Creates and posts GRs; reconciles ASN discrepancies | UC1 |
| This week | Weekly plan | Material Planner | Input check and the steps of the weekly cycle | UC3, UC7 |
| What to order | Weekly plan | Material Planner | Order proposals; Below demand anticipation (DA) with draft call-offs | UC7 |
| Make warehouse room | Weekly plan | Material Planner | Records a decision when the warehouse overflows | Not walked through |
| Publish to suppliers | Weekly plan | Material Planner | Publishes forecast versions (withheld on sample data) | UC3 |
| Foresight commitments | Weekly plan | Material Planner | Accept commitments or move demand; Consolidation tab reads the sample plan | UC3 |
| Demand anticipation (DA) | Weekly plan | Material Planner | DA per supplier × material over the lead time; plan vs execution; publish; record consumption | UC7 |
| Supplier performance | Review | Material Planner | Supplier scorecard per period | Not walked through |
| Forecast quality | Review | Material Planner | 26-week sell-in forecast per finished good and its bias | Not walked through |
| Feedstock reconcile | Review | Material Planner | PO ordered against called off and ASN requested; max stock | UC7 |
| Demand anticipation (DA) history | Review | Material Planner | Every DA publication, in force or superseded, with its rules version | UC7 |
| Stock | Inventory & capacity | Material Planner | Supplier and PTI stock by risk; material drawer with actions and feedstock | UC5 |
| Stock simulation | Inventory & capacity | Material Planner | Estimated supplier stock on a check date | Not walked through |
| Capacity | Inventory & capacity | Material Planner | Capacity against the LTP per week; accept additional capacity or ask | UC5 |
| Alerts | Inventory & capacity | Material Planner | 12 alert rules, next step, closed with a reason | UC6 |
| Supplier access | Inventory & capacity | Material Planner | Grants suppliers a view of PTI stock | UC5 (edge) |
| Trade names | Inventory & capacity | Material Planner | Approves the names suppliers use for PTI materials | Not walked through |
| Requisitions | Sourcing | Buyer | Creates, submits and approves requisitions; raises a sourcing event | Not in this guide |
| RFI | Sourcing | Buyer | Information requests to suppliers | Not in this guide |
| RFQ | Sourcing | Buyer | Quotation requests, negotiation rounds, award | Not in this guide |
| RFP | Sourcing | Buyer | Proposal requests, firm-offer rounds, award | Not in this guide |
| Suppliers | Sourcing | Buyer | Supplier list and profile, read-only | Not walked through |
| Supplier documents | Sourcing | Buyer | Asks for certificates and confirms or refuses declarations | UC4 |
| Invoices | Invoices | Finance | Invoice match, dispute, payment release | Not in this guide |
| Demand anticipation (DA) history | Audit | Buyer, Finance | Same page as under Review | UC7 |
| Supplier performance | Performance | Buyer | Same scorecard page as under Review | Not walked through |
| Feedstock reconcile | Performance | Buyer | Same page as under Review; Procurement sets max stock | UC7 |

The What-if sandbox has no menu item: it opens from **Try a what-if** on a Stock, What to order or Below DA row, or blank from "New blank scenario".

### PTI Help & administration, avatar menu

Help & glossary, Roles, Process flows, Interface monitor, Working calendar, 3PL tracking links, Supplier stock update mode, Vendor qualification, Sourcing types, Planning groups, MRP controllers (PIC), Tolerances and rule values, Alert thresholds and stale periods, Reason codes, and the five Planning engine pages (Material requirement, Safety stock targets, Data health, Model backtest, Supplier reliability) (`lib/i18n/hub.js:75-79,102-116`).

### Supplier menu

| Menu label | Section | What it does | Use case |
|---|---|---|---|
| To do | Home | What Paragon waits for, by area, nearest deadline first; weekly stock update, PTI questions, alerts | All |
| Purchase orders | Orders | Summary and List views; acknowledge, confirm, adjust or reject; **Create ASN** | UC1 |
| Call-offs | Orders | Confirm, change or reject call-offs; answer a delay; dispatch notice; ASN for a call-off | UC2 |
| Shipments & ASN | Orders | Create and submit ASNs | UC1, UC2 |
| Goods receipts | Orders | See receipts; acknowledge or dispute discrepancies | UC1 |
| Foresight commitments | Planning | Commit per period; acknowledge forecast rows; Responses & shipments tab reads the sample plan | UC3 |
| Feedstock reconcile | Planning | PO ordered against call-offs and ASNs requested, read-only; max stock shown | UC7 (read) |
| Stock | Planning | Weekly stock update, feedstock to confirm, PTI questions, PTI stock if shared | UC5 |
| Capacity | Planning | Capacity per week against the LTP; confirm additional capacity | UC3, UC5 |
| RFI invitations | Sourcing | Answer RFIs | Not in this guide |
| RFQ invitations | Sourcing | Quote, decline, revise in rounds, see awards | Not in this guide |
| RFP invitations | Sourcing | Send proposals and firm offers | Not in this guide |
| Invoices | Invoices | Create, submit, correct and resubmit invoices | Not in this guide |
| Profile & documents | Company | Declare certificates; see expiry | UC4 |
| My performance | Company | Own scorecard, read-only | Not walked through |
| Help & glossary (avatar menu) | – | What each portal term means | Section 1 |

"Demand anticipation (DA)" for suppliers is built but not listed while `SUPPLIER_DA_VIEW_ENABLED` is false (`components/layout-v2/navConfig.js:258-266`).

**Pages with no menu item:** `/buyer/contracts`, `/buyer/delivery-agreements`, `/buyer/supplier-applications`, `/supplier/delivery-agreements`, `/buyer/what-if` and the RFQ revised-quotes page, each reached from another page.

---

## 4. Unverified and known limits

A reader might expect these to work. The code shows they do not, or that they are simulated. RFx and invoice limits were dropped with those flows (owner, 2026-11-02).

**Contracts**

1. **Delivery agreement releases are simulated:** "Released in the portal (simulated) — not posted to SAP". (`services/data/mock/MockDeliveryService.js`)

**PO to goods receipt**

2. **These buttons only show a toast:** Goods receipts "Submit inspection results", "Override hold"; Shipments "Send reminder to supplier", "Track shipment". (`pages-v2/BuyerGoodsReceipt/components/footerForStatus.jsx`; `pages-v2/BuyerShipments/components/footerForStatus.jsx`). Not re-checked on 2026-11-02. **No longer a limit:** supplier **Create ASN** on the PO page now opens the ASN wizard (commit 9d4c5a6b).
3. **ASN In Transit and Delivered, and PO delivered and closed, come from TMS/S4.** No screen produces them. (`services/transitions/flows/advanceShipNotice.flow.js`)

**Forecast, planning and replenishment**

4. **"Publish to suppliers" is withheld on sample data.** Published versions exist only as demo data, or through **Move demand**. (`lib/i18n/forecastUx.js:98`)
5. **Order-plan drafts cannot be released** until the Master Data Management team's SAP feed is live. (`lib/i18n/orderPlan.js:136`; `lib/i18n/callOffs.js:212`)
6. **Reschedule actions are off on sample data:** "Send change to supplier" and "Mark as taken to SAP". (`pages-v2/BuyerReschedule/`)
7. **Request revision is switched off.** PTI cannot send a commitment back for revision; it accepts or moves demand. (`services/transitions/forecastConfig.js:351`)
8. **Suppliers do not see demand anticipation yet.** The page is built and hidden behind `SUPPLIER_DA_VIEW_ENABLED = false`; the route shows "Not available yet". (`services/transitions/supplierDaView.js:31`)
9. **Several planning rules are labelled Proposed, awaiting owner review:** the suggested OSIP level ("Use suggestion", BL-208), the feedstock reconcile leftover rule (BL-207, "Liability, not priced"), the feedstock confirmation rule ("Provisional: rule awaiting Material Planning"). (`lib/i18n/safetyStock.js`; `lib/i18n/feedstockReconcile.js`; `lib/i18n/feedstockConfirm.js:14`)
10. **The suppliers do not see the below-minimum-delivery or above-Max flags.** They show on the PTI call-off panel only; no supplier-side code renders them. (`pages-v2/BuyerCallOffs/components/ropFisikTrigger.jsx`)

**Compliance**

11. **The compliance certificate registry cannot be edited.** Its approval actions cannot fire. (`services/transitions/flows/compliance.flow.js`)
12. **No file is sent to Paragon.** "View" download is not available yet, and "Renew" opens a read-only walkthrough. (`lib/i18n/supplierDocuments.js`; `pages-v2/SupplierDocuments/components/DocumentRow.jsx`)
13. **"Export Report" and "Remind" are simulated.** (`lib/i18n/compliance.js`; `pages-v2/BuyerCompliance/components/RegistryRow.jsx`)

**Communication and performance**

14. **Nothing is sent from Supplier follow-ups:** "No live channel — nothing is sent from here." (`pages-v2/BuyerCommHub.jsx`)
15. **PTI questions to the supplier (asks) stay inside the portal.** No email or WhatsApp goes out; the supplier sees them on To do and Stock only. (`pages-v2/inventory/PtiAsksBlock.jsx`)
16. **My performance actions are not available:** "Export Report" shows "Report export not available yet"; "Acknowledge & plan" shows "Action plan not available yet — nothing was submitted". (`pages-v2/SupplierPerformance.jsx:265-270,687-700`; `lib/i18n/supplierPerformance.js:39`). Scorecard "Send improvement plan" shows a toast only (`pages-v2/BuyerScorecard.jsx`, not re-checked).

**Access and demo**

17. **There is no sign-in guard.** Every page renders without signing in. (`router/AppRouter.jsx`)
18. **The supplier switch always loads sup-007.** (`components/layout-v2/SidebarV2.jsx`)
19. **The demo buttons read "i View as Buyer" and "i View as Supplier".** The "i" is literal text in the button, not an icon. The guide writes **View as Buyer** / **View as Supplier**. (`pages/auth/Login.jsx:304,326`)

**Alerts**

20. **The PTI bell in the top bar always shows "3" and does nothing when clicked.** The supplier bell lists award and withdrawal notices. (`components/layout-v2/TopBarV2.jsx:73-87`)
21. **No email or WhatsApp alerts; closures are lost when the demo resets.** (`services/data/mock/stores/inventoryHubStores.js`)

**Call-offs**

22. **No "Drafted at ROP Fisik" call-off can appear in the demo.** The hub drafts one only when the PTI stock feed refreshes (`applyPtiStockRefresh`, `services/data/mock/MockCommandService.js:1646`), and no screen calls it; the seeded call-offs carry no ROP Fisik origin. So the Below minimum delivery and Above Max flags cannot be shown either. Checked in a local build of `aeabdc83` on 2026-11-02.

---

## 5. Screenshot plan

**Status on 2026-11-02:** retaken. Prod runs `aeabdc83` (MR !81, labels frozen), but prod sits behind the access gate and the in-app browser captures only 800 px wide, so the owner chose a local build of the same commit (`aeabdc83`, `vite build` + `vite preview`), captured headless at 1440 × 900 × 1.5 = 2160 × 1350 px. BL-236 (MR !82) is not in that commit and does not show. Not captured: INTRO-6 (used in speaker notes only) and UC2-5, UC8-4 (notes only). After BL-236 reached prod (`f79a26c1`, 14:38 WIB), INTRO-4, UC6-1, UC6-2, UC6-6 and UC7-2 were retaken from a local build of `f79a26c1` the same way. Older files in `screens/` stay, because README.md embeds some of them.

Shared setup:
- Build and preview the app (`npm run build`, then `npx vite preview`), or open prod after the redeploy. Open `#/login`.
- Use **View as Buyer** or **View as Supplier**. The supplier is `sup-007`.
- To show an "Awaiting …" notice, untick the role or lane under avatar → **Roles**.
- File name `<UC>-<step>-<pti|supplier>.png`, viewport 1440 × 900, in `screens/`.

| File | Persona, Menu for, lane | Route | Demo record |
|---|---|---|---|
| INTRO-1-signin.png | – | `#/login` | – |
| INTRO-2-identity-pti.png | PTI, avatar menu open | `/buyer/home` | – |
| INTRO-3-mytasks-pti.png | PTI, Material Planner | `/buyer/home` | weekly plan card |
| INTRO-4-todo-supplier.png | Supplier | `/supplier/home` | sup-007 |
| INTRO-5-term-tip.png | Supplier | `/supplier/capacity` | (i) on "Allocated" open |
| INTRO-6-awaiting-supplier.png | Supplier without Fulfilment | `/supplier/inventory` | – |
| UC2-1-supplier.png | Supplier | `/supplier/orders` | PO-2026-00121 Sent |
| UC2-2-supplier.png | Supplier | `/supplier/shipments` (ASN wizard from a PO) | PO-2026-00124 Confirmed |
| UC2-3-pti.png | PTI, Material Planner | `/buyer/goods-receipt` | New GR |
| UC2-6-supplier.png | Supplier | `/supplier/goods-receipts` | open discrepancy on PO-2026-00125 |
| UC3-1-pti.png | PTI, Material Planner | `/buyer/call-offs` To act → New call-off | PO-2025-00117 |
| UC3-2-supplier.png | Supplier | `/supplier/call-offs` | CO-2026-0003 Awaiting Confirmation |
| UC3-3-supplier.png | Supplier | `/supplier/call-offs` | a confirmed call-off, dispatch section |
| UC3-4-pti.png | PTI | `/buyer/call-offs` | panel with Below minimum delivery pill |
| UC4-1-supplier.png | Supplier | `/supplier/forecasts` | FC-PK-V2 lines |
| UC4-2-supplier.png | Supplier | `/supplier/forecasts` Submit by period | – |
| UC4-3-pti.png | PTI | `/buyer/collaboration` Commitments & gaps | exception row for sup-007 |
| UC5-1-pti.png | PTI, Buyer | `/buyer/compliance` | doc-010 Under Review |
| UC5-2-supplier.png | Supplier | `/supplier/documents` | doc-006 Awaiting Upload; doc-001 Expiring Soon; doc-012 refused |
| UC6-1-supplier.png | Supplier | `/supplier/inventory` | weekly update, still missing |
| UC6-2-supplier.png | Supplier | `/supplier/inventory` Feedstock to confirm | – |
| UC6-3-supplier.png | Supplier | `/supplier/capacity` | an amber week |
| UC6-4-pti.png | PTI | `/buyer/inventory` material drawer | sup-002 RM-STEAR-7300 |
| UC6-5-pti.png | PTI | `/buyer/capacity` | an amber week with Accept |
| UC6-6-supplier.png | Supplier | `/supplier/home` | PTI question block, Answer open |
| UC7-1-pti.png | PTI | `/buyer/alerts` | open alerts, next step |
| UC7-2-supplier.png | Supplier | `/supplier/home` | Alerts about your materials |
| UC8-1-pti.png | PTI | `/buyer/demand-anticipation` | card with Show the weeks open |
| UC8-2-pti.png | PTI | `/buyer/demand-anticipation` → Publish dialog | 0 supplier × materials differ |
| UC8-3-pti.png | PTI | `/buyer/order-plan` | Below demand anticipation (DA) |
| UC8-4-pti.png | PTI | `/buyer/demand-anticipation-history` | – |

**Roles or lanes not reachable in Demo Mode: none.** Every PTI role and supplier lane is reachable by ticking or unticking under avatar → Roles. The supplier is always sup-007.
