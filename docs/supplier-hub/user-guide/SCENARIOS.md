# Paragon Supplier Portal: use-case scenario catalog

**Status:** Phase 1, approved by PTI on 2026-10-06 with supplier onboarding removed. The deck is built from this file after approval.
**Basis:** the code on `main` at `7078ea3`; UC1 updated on 2026-10-19 for the RFx UX build (decisions RFX-D16 to RFX-D24). All paths are under `src/`. Every behavior cites a `file:line`. Citations into pages later split into folders (frontend-standard Phase 5) were re-pointed on 2026-10-08 to the file in the folder that now holds the code; every other line number is as of `7078ea3`. If a behavior has no citation, it is under section 4 (Unverified and known limits). Menu names and section 3 updated on 2026-10-21 for the IA navigation build; line citations in section 2 were not re-checked then.
**Data:** all data is in-memory demo data. Nothing reaches SAP. The demo date is 2026-08-31 (`services/data/fixturePresent.js:184,206`).

---

## 1. Roles and lanes

The portal has two separate role concepts, and the deck must explain both.

| Concept | What it does | How to change it in the app | Evidence |
|---|---|---|---|
| **Menu for** (PTI only): Material Planner, Buyer, Finance, All PTI roles | Filters the sidebar sections and the Home tasks. Its hint reads "It does not change what you are allowed to do." | Avatar menu → **Menu for** | `components/layout-v2/hubRole.js:15-19`; `lib/i18n/hub.js:104-111`; `components/layout-v2/navConfig.js:340-344` |
| **Roles** (business roles, the real permissions) | Decides which actions a seat can take | Avatar menu → **Roles** → tick or untick. You cannot remove the last role. | `components/layout-v2/IdentityPanel.jsx:269-346`; `services/transitions/businessRoles.js:756-765` |

**PTI business roles** (`services/transitions/businessRoles.js:537-547`):

| Role | Main actions it holds |
|---|---|
| Procurement | RFI/RFQ/RFP create, publish, award, cancel; PR approve and reject; raise supplier applications; qualification lists |
| Requisitioner | PR create, submit, revise |
| Receiving | goods receipt, ASN flag |
| Finance | invoice pay, invoice dispute |
| Compliance | application review and decision; document request and confirmation; qualification lists |
| Planning | call-off plan and review; stock access; record stock; receipt discrepancy resolve; forecast commitment review |

Evidence: `services/transitions/businessRoles.js:144-180,244-247,353-394,460-521`.

**Supplier lanes** (`services/transitions/businessRoles.js:415-435,441-443,460-528,557-560`):

| Lane | Main actions it holds |
|---|---|
| Supplier Commercial | quotations, RFQ intent, RFI and RFP answers, firm offers, forecast commitments |
| Supplier Fulfilment | PO acknowledge and confirm, ASN, receipt answers, call-off confirm and dispatch, stock and capacity |
| Supplier Back Office | invoices, document declarations, forecast acknowledgement |

**Demo seats.**
- **"View as Buyer"** opens the PTI seat with all 6 PTI roles.
- **"View as Supplier"** opens `sup-007`, "PT Sample Packaging Indonesia", with all 3 lanes. Email and password are ignored.
- The sidebar toggle **PTI / Supplier** switches persona.
- Evidence: `pages/auth/Login.jsx:12,37-57,278-317`; `context/identitySources.js:13-14,33-48`; `services/transitions/businessRoles.js:805-816`; `components/layout-v2/SidebarV2.jsx:92-135`.

**A missing permission.** The action is replaced by **"Awaiting {owner}"**, with the hint "Your role cannot take this action." If no role holds the action, it reads "No role holds this action". Evidence: `components/ui-v2/HandoffNotice.jsx:43-71`; `lib/i18n/roles.js:26-53`.

**Not in the code:**
- There is no admin role. The admin pages sit in **Help & administration** in the avatar menu for every PTI seat (`components/layout-v2/navConfig.js:266-325`).
- A supplier seat cannot change its own access scope: "Contact your administrator to change your access scope." (`components/layout-v2/IdentityPanel.jsx:246-263`).

---

## 2. Use cases

**Final list: 7 use cases** (UC7 Alerts added 2026-10-06). Supplier onboarding is out of scope: it is built in a separate codebase. I merged 2 of the remaining candidates into others:
- **Comm Hub into UC6.** Its only working action is recording stock from a supplier reply.
- **Performance into the Menu Directory only.** Both performance pages are read-only, and their action buttons do nothing (section 4).

**Actor shorthand:**
- **PTI-Proc, PTI-Req, PTI-Rcv, PTI-Fin, PTI-Cmp, PTI-Plan** = PTI with the Procurement, Requisitioner, Receiving, Finance, Compliance or Planning role.
- **Sup-Com, Sup-Ful, Sup-BO** = Supplier with the Commercial, Fulfilment or Back Office lane.

### UC1 Sourcing: requisition, RFI, RFQ, RFP, award

**Purpose:** turn a purchase need into a competitive event, collect supplier answers, negotiate, and record the award. The PO or contract is then raised in SAP (`lib/i18n/rfx.js:336`).

**Positive end-to-end: PR to RFQ award with a negotiation round**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Req | Sourcing → **Requisitions** | **New PR**, then **Submit for approval** | Draft → Pending Approval | `pages-v2/BuyerRequisitions/index.jsx:203`; `pages-v2/BuyerRequisitions/components/RequisitionPanelFooter.jsx:89-104` |
| 2 | PTI-Proc | same | **Approve** | Approved | `pages-v2/BuyerRequisitions/components/RequisitionPanelFooter.jsx:173-215` |
| 3 | PTI-Proc | same | **Raise sourcing event**. Opens the RFQ wizard pre-filled; saving the RFQ moves the PR. | PR: Sourcing Event | `pages-v2/BuyerRequisitions/hooks/useRequisitionActions.js:281-282`; `pages-v2/BuyerRequisitions/components/StatusNotes.jsx:114-121`; `services/transitions/cascades.js:62` |
| 4 | PTI-Proc | Sourcing → **RFQ** | **New RFQ** → Define Scope / Invite Suppliers / Terms & Deadlines / Review & Submit → **Save RFQ draft**, then **Send to suppliers** (or **Save and send to suppliers** on Review) | Draft → Open | `pages-v2/BuyerSourcing/components/SourcingHeader.jsx:82`; `pages-v2/BuyerSourcing/components/RfqWizardModal.jsx:216`; `pages-v2/BuyerSourcing/components/RfqLifecycleActions.jsx:83-87` |
| 5 | Sup-Com | Sourcing → **RFQ invitations** | **I will respond** → **Submit quote** → **Submit quotation** | Quotation Submitted | `pages-v2/rfqs/RfqEngagementControls.jsx:192`; `pages-v2/SupplierRFQs/components/RFQCard.jsx:201`; `pages-v2/SupplierRFQs/components/QuotePanel.jsx:76-78` |
| 6 | PTI-Proc | RFQ → event page, Comparison | **Move to review** (moved from the board's side panel, RFX-D24) | Under Review | `pages-v2/BuyerSourcingEvent/components/ComparisonTable.jsx:367` |
| 7 | PTI-Proc | RFQ → event page | **Open the round**, for a shortlist of suppliers who quoted | Round Open | `pages-v2/BuyerSourcingEvent/components/NewRoundForm.jsx:121-140` |
| 8 | Sup-Com | RFQ invitations → My Quotes round strip → **Send a revised quote** (or RFQ rounds · Revised quotes) | **Send the revised quote** | Quotation revised | `pages-v2/SupplierNegotiations.jsx:231-283` |
| 9 | PTI-Proc | RFQ event page | **Close the round**, then award per item (Award, or Split by % / by quantity) → **Award the event** → check the confirmation sheet (suppliers affected, shares, reason) → **Record the award** | Awarded (or Partly awarded) | `pages-v2/BuyerSourcingEvent/components/NegotiationSection.jsx:104-111`; `pages-v2/BuyerSourcingEvent/components/AwardSection.jsx:118-191`; `pages-v2/rfx/AwardPanel/components/ItemAwardForm.jsx:227`; confirmation `pages-v2/BuyerSourcingEvent/components/AwardSection.jsx:218-221`, `lib/i18n/rfx.js:352` |
| 10 | PTI-Proc | same | **Mark raised in SAP** → **Save SAP number** | Award locked | `services/transitions/flows/rfq.flow.js:210-257` |
| 11 | Sup-Com | To do (Sourcing) and the bell; RFQ invitations → Awards & history | Sees "Awarded to you · RFQ-… · x% of item n" with "The purchase order follows from SAP" as soon as the award is recorded (RFX-D18); Awards & history shows one row per event with the share, the award date and the awarded value | – | `lib/i18n/hub.js:199-200,208`; `services/sourcing/supplierOutcome.js:78,258`; `pages-v2/SupplierRFQs/utils.js:140-147` |

**RFI and RFP use the same pattern:**
- **RFI:** **New information request** → **Send to suppliers** (Open; the wizard opens the RFI's own page `/buyer/rfi/:id`) → supplier **I will respond** (or **Decline** with a reason) → supplier **Send answers** (the form keeps a draft in the browser and marks each missing answer "Still missing") → **Close the event** → confirm on the sheet (`pages-v2/BuyerRfi.jsx:156,369,409-423`; `pages-v2/SupplierRfi.jsx`; `pages-v2/rfx/ConfirmSheet.jsx`).
- **RFP:** adds **Ask for firm offers** and an award that always needs a reason. After the RFP is closed, "Firm up the prices" offers the firm-offer round (full-service or ODM options) or **Create RFQ from this RFP** (components tendered per item); an option in a firm-offer round cannot go to an RFQ (RFX-D16, `pages-v2/BuyerRfp/components/RfpFirmUp.jsx`). Close and award confirm on a sheet (`pages-v2/BuyerRfp/components/RfpEventActions.jsx:80`) (`pages-v2/BuyerRfp/components/RfpEventActions.jsx:43,67`; `pages-v2/rfx/RfpFirmOffers.jsx:90-96`; `services/transitions/flows/rfpEvent.flow.js:117-135`).

**Negative end-to-end: supplier declines**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Com | RFQ, RFI or RFP invitations | **Decline RFQ** (or **Decline** on an RFI or RFP) → reason ("No capacity", …) → **Decline this RFQ** | Declined | `lib/i18n/rfqResponse.js:34-39`; `services/query/commandHooks.js:982` |
| 2 | PTI-Proc | RFQ | Reads the reason and the supplier's note | – | `lib/i18n/rfqResponse.js` hint "The buyer reads both the reason and your words." |

**Negative end-to-end: no supplier passes the compliance gate**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Proc | RFQ event page (rfq-020) | Opens the award panel | "This RFQ cannot be awarded: no supplier that quoted passes the compliance gate…" | `lib/i18n/rfx.js:278`; `pages-v2/BuyerSourcingEvent/components/AwardSection.jsx:165-171` |
| 2 | PTI-Proc | RFQ | **Cancel RFQ** | Cancelled | `pages-v2/BuyerSourcing/components/RfqLifecycleActions.jsx:110-117` |

**Negative end-to-end: PR rejected**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Proc | Requisitions | **Reject** → reason → **Confirm rejection** | Rejected | `pages-v2/BuyerRequisitions/components/RequisitionPanelFooter.jsx:173-215` |
| 2 | PTI-Req | same | **Revise and return to draft** | Draft | `pages-v2/BuyerRequisitions/components/DecisionCaptures.jsx:67-85` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Quote after the deadline | Refused: "Quotation could not be submitted" (PAST_DEADLINE). The RFQ itself stays Open, because nothing closes it automatically. | PTI-Proc extends the deadline | RFQ invitations | `services/data/mock/MockCommandService.js:4659`; `pages-v2/SupplierRFQs/hooks/useQuoteSubmission.js:188-199`; `services/transitions/flows/rfq.flow.js:136-158` |
| Extend deadline | For every supplier or for selected suppliers. The new date must be later than the current one. | Sup-Com | RFQ event page | `pages-v2/BuyerSourcingEvent/components/ResponseWindowSection.jsx:146-176` |
| Split award does not total 100% | Refused (AWARD_SPLIT_INCOMPLETE) | PTI-Proc corrects the split | RFQ event page | `services/sourcing/awardShape.js:286-289` |
| Award departs from the best-scored quote | A reason is required | PTI-Proc | RFQ event page | `services/data/mock/MockCommandService.js:4950-4975` |
| Attachment too large or wrong type | Limits: 25 MB per file, 30 files per response, listed file types only | Supplier | Any RFx response | `services/attachments/fileRules.js:11-63` |
| Confidential RFQ | Masked until the supplier accepts the terms | Sup-Com | RFQ invitations | `services/data/mock/MockProcurementService.js:996`; `pages-v2/rfqs/RfqEngagementControls.jsx:254` |
| Supplier views the RFI/RFP invitee list | Sees only its own row | – | RFI / RFP invitations | `services/data/mock/rfxReadModel.js:245-253` |

### UC2 Purchase order to payment

**Purpose:** the supplier confirms the PO, ships against an ASN, PTI receives and posts the goods receipt, and the invoice is matched and paid.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Orders → **Purchase orders** | **Acknowledge receipt** | Acknowledged | `pages-v2/SupplierOrders.jsx:865-872` |
| 2 | Sup-Ful | same | **Confirm order**, with confirmed qty and date | Confirmed | `pages-v2/SupplierOrders.jsx:897,934-942` |
| 3 | Sup-Ful | Orders → **Shipments & ASN** | **Create ASN** → **Submit ASN** | ASN Submitted | `pages-v2/SupplierShipments/hooks/useAsnRowCommands.js:66-101`; `pages-v2/SupplierShipments/index.jsx:310-324` |
| 4 | PTI-Rcv | Order collaboration → **Goods receipts** | **New GR** → 4-step wizard → **Create GR** | Approved → Posted to SAP | `components/v2-features/GRInspectionWizard/hooks/useCompleteReceipt.js:75-226`; `services/transitions/grRollup.js:55-79` |
| 5 | Sup-BO | Invoices → **Invoices** | **New invoice** → **Submit invoice** | Submitted → Matched | `pages-v2/SupplierInvoices/index.jsx:128-171`; `pages-v2/SupplierInvoices/components/NewInvoicePanel.jsx:65-121`; `services/transitions/cascades.js:44-46` |
| 6 | PTI-Fin | Invoices → **Invoices** | **Release payment** → **Confirm release — {amount}** (Approved invoices only, see section 4) | Payment Released | `pages-v2/BuyerInvoices/components/InvoicePanelFooter.jsx:111-136`; `pages-v2/BuyerInvoices/hooks/useInvoiceCommands.js:131-188` |

**Negative end-to-end: supplier adjusts the PO and PTI rejects the counter-offer**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Purchase orders | **Adjust** → **Send adjustment** | Adjusted | `pages-v2/SupplierOrders.jsx:918-965` |
| 2 | PTI (MP menu) | Order collaboration → **Purchase orders** | **Reject counter-offer** → comment → **Send back to supplier** | Sent | `pages-v2/BuyerOrders.jsx:803-855` |
| 3 | Sup-Ful | Purchase orders | **Confirm order**, or **Reject** with a cause → **Send rejection** | Confirmed or Rejected (terminal) | `pages-v2/SupplierOrders.jsx:918-965` |

**Negative end-to-end: short receipt, then invoice dispute**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Rcv | Goods receipts | **Create GR** with rejected or short lines | GR Partially Approved; ASN flagged Discrepancy | `services/transitions/cascades.js:28-31` |
| 2 | Sup-Ful | Orders → **Goods receipts** | **Respond** → **Acknowledge** or **Dispute** (comment required) | Answered | `pages-v2/SupplierGoodsReceipts.jsx:302-338` |
| 3 | PTI-Rcv or PTI-Plan | Goods receipts → Shipment discrepancies | **Reconcile**, or **Resolve** a dispute | ASN Delivered | `pages-v2/BuyerGoodsReceipt/components/DiscrepancySection.jsx:34-91`; `pages-v2/receipts/ReceiptDisputesSection.jsx:109-116` |
| 4 | Sup-BO | Invoices | **Submit invoice** | Match: Qty Mismatch; PTI sees "Pending Match" | `services/transitions/invoiceRollup.js:88-131`; `services/data/invoiceProjection.js:90-97` |
| 5 | PTI-Fin | Invoices | **Dispute** → reason → **Raise dispute** | Disputed (supplier sees "Returned") | `pages-v2/BuyerInvoices/components/InvoicePanelFooter.jsx:73,138-152`; `services/transitions/fulfilmentRules.js:903-904` |
| 6 | Sup-BO | Invoices | **Correct and resubmit** | Submitted; the match re-runs | `services/transitions/flows/invoice.flow.js:173-191` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Confirmed qty above the ordered qty | Blocked | Sup-Ful | Purchase orders | `services/transitions/policies.js:102` |
| ASN qty above the open qty | Refused (OVER_OPEN_QUANTITY) unless an over-ship reason is given | Sup-Ful | Shipments & ASN | `services/transitions/fulfilmentRules.js:168-182`; `services/data/mock/MockCommandService.js:744-787` |
| Shelf life too short | **Request shelf-life exception**; ASN goes to Awaiting exception | PTI approves or rejects | Shipments & ASN | `pages-v2/BuyerShipments/index.jsx:272` |
| Invoice price outside tolerance (2%, cap Rp 500,000) | Match: Price Variance; invoice held | PTI-Fin | Invoices | `services/transitions/hubSettings.js:121-167` |
| Duplicate invoice number, or over-invoicing | Refused (DUPLICATE_INVOICE_NUMBER / OVER_INVOICED) | Sup-BO | Invoices | `services/data/mock/MockCommandService.js:1198-1251` |
| GR on Quality Hold | **Request lab retest** → Under Inspection | PTI-Rcv | Goods receipts | `pages-v2/BuyerGoodsReceipt/components/footerForStatus.jsx:101-106` |

### UC3 Call-offs against agreements

**Purpose:** PTI releases call-offs against an agreement; the supplier confirms, changes or rejects, then dispatches.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | Order collaboration → **Call-offs** | **New call-off** → **Release to supplier** | Awaiting Confirmation | `pages-v2/BuyerCallOffs/components/UmbrellaSection.jsx:104-110`; `pages-v2/BuyerCallOffs/components/NewCallOffPanel.jsx:87-93` |
| 2 | Sup-Ful | Orders → **Call-offs** | **Respond** → **Confirm as requested** → **Send confirmation** | Confirmed | `pages-v2/SupplierCallOffs.jsx:206-232,385-391,795` |
| 3 | Sup-Ful | same | **Send dispatch notice** | Confirmed (dispatched) | `pages-v2/SupplierCallOffs.jsx:618-631` |
| 4 | Sup-Ful | Shipments & ASN | Create the ASN for the confirmed call-off | ASN Submitted | `services/data/mock/MockCommandService.js:719-742` |

**Negative end-to-end: supplier confirms with changes, PTI rejects and asks again**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Call-offs | **Respond** → "…new date" → **Send confirmation** | Confirmed with New Date (awaiting approval) | `pages-v2/SupplierCallOffs.jsx:206-232` |
| 2 | PTI-Plan | Call-offs | **Reject**, with a comment | Awaiting Confirmation | `pages-v2/BuyerCallOffs/components/ReviewSection.jsx:48-59`; `services/data/mock/MockCommandService.js:1651` |
| 3 | PTI-Plan | same | **Change and ask again** | Awaiting Confirmation | `pages-v2/BuyerCallOffs/components/ChangeSection.jsx:99-122` |

**Negative end-to-end: supplier rejects the call-off**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Call-offs | **Respond** → **Reject**, with a reason → **Send confirmation** | Rejected | `services/data/mock/MockCommandService.js:1629` |
| 2 | PTI-Plan | Call-offs | **Change and ask again** | Awaiting Confirmation | `pages-v2/BuyerCallOffs/components/ChangeSection.jsx:99-122` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Call-off above the remaining agreement qty or value | Release is disabled, and refused (EXCEEDS_REMAINING / _VALUE) | PTI-Plan | Call-offs | `pages-v2/BuyerCallOffs/components/NewCallOffPanel.jsx:89`; `pages-v2/BuyerCallOffs/components/DraftSection.jsx:124`; `services/data/mock/MockCommandService.js:1570-1590` |
| Supplier confirms up to +5% | Accepted. Above +5%, or a later date, needs PTI approval (CO-2026-0014). | PTI-Plan | Call-offs | `services/transitions/callOffRules.js:372-420` |
| Draft generated by the planning engine | Release withheld (ENGINE_DATA_SIMULATED) | – | Call-offs | `services/data/mock/MockCommandService.js:1552-1568` |
| Change after dispatch | Refused (ALREADY_DISPATCHED) | – | Call-offs | `services/data/mock/MockCommandService.js:1617-1627` |
| Partial confirmation | **Partially confirm in 2 deliveries** → Partially Confirmed | PTI-Plan | Call-offs | `lib/i18n/callOffs.js:187-199` |

### UC4 Forecast collaboration

**Purpose:** PTI shares its forecast; the supplier commits quantities per period; PTI accepts or asks for a revision.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI (MP menu) | Weekly plan → **This week** | Reads the cycle cards and opens the next step | – | `pages-v2/BuyerThisWeek.jsx:75-80,145-207` |
| 2 | Sup-Com | Planning → **Foresight commitments** | Opens the page (the view is recorded); enters qty per row → **Save draft** | Draft ("not visible to PTI") | `pages-v2/SupplierForecastCommitments/hooks/useRecordView.js:20-26`; `pages-v2/SupplierForecastCommitments/components/CommitmentRow.jsx:84-91,159-166` |
| 3 | Sup-Com | same, "Submit by period" | **Submit all** | Submitted | `pages-v2/SupplierForecastCommitments/hooks/useCommitmentActions.js:54-87`; `pages-v2/SupplierForecastCommitments/components/PeriodSubmitRow.jsx:114-122` |
| 4 | Sup-BO | same | **Acknowledge** on Forecast-zone rows | Acknowledged | `pages-v2/SupplierForecastCommitments/components/ForecastZoneRow.jsx:57-66` |
| 5 | PTI-Plan | Weekly plan → **Foresight commitments** | **Accept** → **Accept** | Accepted by PTI | `pages-v2/BuyerCommitments/hooks/useCommitmentAction.js:36-44`; `pages-v2/BuyerCommitments/components/ExceptionRow.jsx:106-112` |

**Negative end-to-end: commitment below forecast, PTI asks for revision**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Com | Foresight commitments | Commits below forecast. A reason is required ("Below forecast: choose a reason."). | Submitted, Outside tolerance | `services/transitions/forecastRules.js:493-505,516-522` |
| 2 | PTI-Plan | Foresight commitments | **Request revision** → note → **Send request** | Revision requested | `pages-v2/BuyerCommitments/hooks/useCommitmentAction.js:45-54`; `pages-v2/BuyerCommitments/components/ExceptionRow.jsx:113-119` |
| 3 | Sup-Com | Foresight commitments | Sees "PTI asked for a revision", revises, **Submit all** | Submitted | `pages-v2/SupplierForecastCommitments/components/CommitmentLogRow.jsx:16-30`; `pages-v2/SupplierForecastCommitments/components/PeriodSubmitRow.jsx:114-122` |

**Negative end-to-end: capacity not confirmed**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Com | Foresight commitments | **Submit all**; blocked with "Confirm capacity for {group} first." | Draft | `pages-v2/SupplierForecastCommitments/utils.js:150-153`; `pages-v2/SupplierForecastCommitments/components/PeriodSubmitRow.jsx:123-135` |
| 2 | Sup-Ful | Planning → **Capacity** | **Submit capacity** | Capacity Submitted | `pages-v2/SupplierCapacity.jsx:176-185,369-376` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| New forecast version | A commitment carries forward if the period qty is unchanged; otherwise it goes back to awaiting. The supplier sees "was {qty}" and a Changes tab. | Sup-Com | Foresight commitments | `services/transitions/forecastRules.js:15-16`; `pages-v2/SupplierForecastCommitments/components/CommitmentRow.jsx:70-74`; `pages-v2/SupplierForecastCommitments/components/ChangesTable.jsx`; `pages-v2/SupplierForecastCommitments/components/ViewToolbar.jsx` |
| Emergency republish | "Emergency re-publication" badge | Sup-Com | Foresight commitments | `pages-v2/SupplierForecastCommitments/components/VersionSection.jsx:58-62` |
| Firm vs Trade-off line | Firm: any shortfall is an exception. Trade-off: up to 10% short is auto-accepted. | PTI-Plan | Foresight commitments | `services/transitions/forecastRules.js:516-522` |
| Commitment deadline | Firm lines due 1 working day after publish, others 3. Overdue lines become exceptions. | Sup-Com | Foresight commitments | `services/transitions/forecastRules.js:524-537,838-840` |
| PTI moves demand | **Move demand** publishes a new version | Sup-Com re-commits | Foresight commitments | `pages-v2/BuyerCommitments/hooks/useCommitmentAction.js:55-66`; `pages-v2/BuyerCommitments/components/ExceptionRow.jsx:125-131` |
| Supplier wants to dispute | No supplier dispute action exists; the supplier commits below forecast with a reason | – | – | `services/transitions/businessRoles.js:441-443,520-528` |

### UC5 Compliance documents

**Purpose:** PTI asks for a certificate; the supplier declares it; PTI confirms or refuses it. Expiry is tracked.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Cmp | Sourcing → **Supplier documents** | **Ask for a document** → **Check it over** → **Open the request** | Awaiting Upload | `pages-v2/BuyerCompliance/hooks/useDocumentRequest.js:30,70-86`; `pages-v2/BuyerCompliance/components/RequestPanelFooter.jsx:23-44` |
| 2 | Sup-BO | Company → **Profile & documents** | **Declare** → **Record declaration** | Under Review | `pages-v2/SupplierDocuments.jsx:402-430,844-856` |
| 3 | PTI-Cmp | Compliance → "Declared certificates awaiting review" | **Confirm** | Valid | `pages-v2/BuyerCompliance/hooks/useDocumentReview.js:42-51`; `pages-v2/BuyerCompliance/components/ReviewQueueItem.jsx:65-73` |

**Negative end-to-end: declaration refused**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Cmp | Compliance | **Refuse** → reason → **Record refusal** | Rejected | `pages-v2/BuyerCompliance/hooks/useDocumentReview.js:61-81`; `pages-v2/BuyerCompliance/components/ReviewQueueItem.jsx:79-101`; `pages-v2/BuyerCompliance/components/RejectReasonForm.jsx:24-56` |
| 2 | Sup-BO | Profile & documents | Sees "{count} document was refused:" → **Declare again** | Under Review | `lib/i18n/supplierDocuments.js:117,135`; `services/transitions/flows/supplierDocument.flow.js:115-117` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Certificate expired (doc-001) | Red "Expired" pill; banner "…immediate renewal required" | Sup-BO | Profile & documents | `services/data/dayProjection.js:138,210-219`; `lib/i18n/supplierDocuments.js:33-37` |
| Expiring within 180 days (doc-005, doc-008) | Amber "Expiring" pill; a Home task "Certificates expired or expiring" | Sup-BO | Profile & documents; To do | `services/data/documentDisplayState.js:153-179`; `lib/i18n/hub.js:157` |
| No expiry date (BPJPH) | Treated as no expiry | – | Profile & documents | `pages-v2/SupplierDocuments.jsx:409-411` |
| Confirming a document | Does not update the compliance registry table (a separate fixed list) | – | Compliance | `pages-v2/BuyerCompliance/index.jsx:65-69` |

### UC6 Shared stock, capacity and supplier replies

**Purpose:** suppliers share stock and capacity; PTI records stock that arrives by message, handles alerts, and checks stock at cycle end.

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful | Planning → **Stock** | **Enter stock** → **Save stock** | Declared | `pages-v2/SupplierInventory.jsx:183-192,359-366` |
| 2 | Sup-Ful | Planning → **Capacity** | **Submit capacity** | Submitted | `pages-v2/SupplierCapacity.jsx:176-185,369-376` |
| 3 | PTI-Plan | Home → **Supplier follow-ups** → Record a reply | Pick supplier → paste reply → **Parse reply** → **Record this stock** → **Record stock** | Declared ("Recorded by Paragon from {channel}…") | `pages-v2/BuyerChannelTriage.jsx:236-262,366-373,575-586` |
| 4 | PTI (MP menu) | Inventory & capacity → **Stock** / **Capacity** | Reviews stock and capacity; Capacity is read-only | – | `pages-v2/BuyerInventory.jsx:182-191`; `pages-v2/BuyerCapacity.jsx:286,501` |
| 5 | PTI-Plan | Inventory & capacity → **Alerts** | **Close alert** → reason | Closed | `pages-v2/BuyerAlerts.jsx:224-240,446-461` |
| 6 | PTI-Proc | Performance → **Feedstock reconcile** | **Set max stock** → **Save** | Max stock set | `pages-v2/FixedStockReconcile.jsx:123,315-330,387-404` |

**Negative end-to-end: supplier reply cannot be read**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | Supplier follow-ups | **Parse reply** on free text | "Could not interpret this as a stock update." | `lib/i18n/commHubInbound.js:37` |
| 2 | PTI-Plan | Inventory | **Record stock from a supplier message**, entered by hand | Declared | `pages-v2/BuyerInventory.jsx:182-191` |

**Negative end-to-end: stock check shows a gap**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI or Supplier | **Feedstock reconcile** | Reads, per material, PO ordered against called off and ASN requested: "Not yet called off" and "Called off, not yet shipped" (DRC-15a; what happens to a remainder is still open, DRC-15b) | – | `lib/i18n/feedstockReconcile.js` |
| 2 | Sup-Ful | To do | "Stock figures to update" → **Enter stock** | Declared | `lib/i18n/hub.js:163`; `pages-v2/SupplierInventory.jsx:183-192` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| Supplier on API sync (sup-001) vs manual entry | API suppliers get a sync panel; manual suppliers get the weekly panel. The mode is set in admin. | PTI admin | Supplier stock update mode | `services/data/mock/inventoryReadModel.js:69`; `pages-v2/inventory/WeeklyUpdatePanel.jsx:220-224` |
| API sync fails (sup-003) | "Last sync failed: {error}"; figures kept and flagged stale | PTI-Plan | Inventory | `pages-v2/BuyerInventory.jsx:249-253` |
| Capacity below the LTP | A reason is required | Sup-Ful | Capacity | `lib/i18n/inventoryCapacity.js:344-350` |
| Closing an alert with reason "Other" | A note is required | PTI-Plan | Alerts | `lib/i18n/inventoryCapacity.js:381-396` |
| Supplier seat without the Fulfilment lane | "Awaiting Supplier Fulfilment" in place of **Save stock** | Sup-Ful | Stock | `pages-v2/CommHubInbound.jsx:634-640` |

### UC7 Inventory and capacity alerts

**Purpose:** the portal checks stock, capacity, forecast commitments and call-offs against 9 rules and raises an alert for each risk; Planning acts on it and closes it with a reason. Alerts are computed live each time they are read (`services/data/mock/MockProcurementService.js:499-511`, `services/data/mock/inventoryReadModel.js:269-284`, `services/transitions/inventoryAlertRules.js:240-364`). Demo: 30 open, 17 High, 6 Medium, 7 Low (read from the Alerts screen, 2026-10-06).

**The 9 rules** (`services/transitions/inventoryAlertRules.js:54-77`; labels `lib/i18n/inventoryCapacity.js:367-377`)

| Rule | Fires when | Urgency | Supplier sees it | Evidence |
|---|---|---|---|---|
| PTI stock below PTI reorder point | PTI stock on hand < PTI reorder point | Cover vs lead time | No | `services/transitions/inventoryRules.js:414,551` |
| Supplier stock below supplier reorder point | Supplier stock < reorder point the supplier declared | Cover vs lead time | Yes | `services/transitions/inventoryRules.js:420-421,549` |
| PTI stock runs out before next delivery | PTI stock ÷ daily demand < days to next incoming; no incoming date = no alert | Cover vs lead time | No | `services/transitions/inventoryRules.js:433-439` |
| Allocated capacity below the LTP | Any of the next 13 weeks: capacity < LTP demand | Worst class in the planning group, else Low | Yes | `services/transitions/capacityRules.js:139-145`; `services/transitions/inventoryAlertRules.js:316-330` |
| Supplier stock figures out of date | Never submitted, or past the refresh deadline | Always Low | Yes | `services/transitions/inventoryRules.js:394-406`; `services/transitions/inventoryAlertRules.js:301` |
| Stock and incoming do not cover 30 days | Supplier stock + incoming < 100% of 30-day demand | Cover vs lead time | Yes | `services/transitions/inventoryRules.js:363-377` |
| Commitment below forecast beyond tolerance | Short beyond Firm 0% / Trade-off 10%, or revision requested | High if a Firm period, else Medium | Yes | `services/transitions/forecastRules.js:516-521,871-890`; `services/transitions/inventoryAlertRules.js:335-342` |
| No supplier lead time on record | Lead time missing for the material | Day bands | No | `services/transitions/inventoryAlertRules.js:310-311` |
| Call-off larger than supplier can deliver | Confirmed call-offs due within lead time > stock + production due | Cover vs lead time | No | `services/transitions/inventoryAlertRules.js:213-229,347-361` |

**Urgency:** High when cover < 1× lead time, Medium < 1.5×, else Low; with no lead time, < 14 days High and < 30 days Medium (`services/transitions/inventoryRules.js:189-197,243-259`). Settings live under Help & administration → Alert thresholds and stale periods, editable by the Compliance role (`pages-v2/admin/AdminRuleValues/index.jsx:61,209,215`; `services/transitions/businessRoles.js:314`), and apply at the next calculation (`services/transitions/inventoryConfig.js:13-17,38-67`).

**Positive end-to-end**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | Sup-Ful / Sup-Com | Stock · Capacity · Foresight commitments | Updates data (or fails to) | – | `services/transitions/inventoryAlertRules.js:240-364` |
| 2 | PTI (MP menu) | Home → **My tasks** / Inventory & capacity → **Alerts** | Reviews open alerts, highest risk first; filters by severity, planning group, PIC | Open | `pages-v2/BuyerHome.jsx:156-164`; `pages-v2/BuyerAlerts.jsx:255,282-296,322` |
| 3 | Sup (any lane) | Home → **To do** → "Alerts about your materials" | Sees own open alerts from 5 rules | Open | `pages-v2/SupplierHome.jsx:334-354`; `services/data/mock/MockProcurementService.js:503-506` |
| 4 | PTI-Plan | Alerts | Acts (call-off, PO, chase), then **Close alert** → reason | Closed | `pages-v2/BuyerAlerts.jsx:224-240,445-461`; `services/transitions/reasonCodes.js:78-86`; `services/transitions/businessRoles.js:368` |

**Negative end-to-end: closing without the right role or note**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI without Planning | Alerts | Sees "Awaiting Planning" instead of Close alert | Open | `pages-v2/BuyerAlerts.jsx:445-461` |
| 2 | PTI-Plan | Alerts | Closes with "Other" and no note: refused | Open | `services/transitions/inventoryAlertRules.js:453-462` |
| 3 | PTI-Plan | Alerts | Adds a note, closes | Closed | same |

**Negative end-to-end: risk comes back**

| Step | Actor | Menu | Action | Status after | Evidence |
|---|---|---|---|---|---|
| 1 | PTI-Plan | Alerts | Closes the alert | Closed | `services/data/mock/MockCommandService.js:6383` |
| 2 | – | – | Condition clears, then returns | New alert Open | `services/transitions/inventoryAlertRules.js:386-421` |

**Edge cases**

| Condition | What the system does | Who acts next | Menu | Evidence |
|---|---|---|---|---|
| No lead time on record | Day bands decide urgency | PTI fixes master data | Alerts | `services/transitions/inventoryRules.js:189-197` |
| No incoming delivery date | Stock-out rule does not fire | – | Alerts | `services/transitions/inventoryRules.js:433-439` |
| Condition clears before anyone acts | Alert disappears; no closure recorded | – | Alerts | `services/data/mock/inventoryReadModel.js:269-284` |
| Demo reset | Closures lost; all alerts Open again | – | Alerts | `services/data/mock/stores/inventoryHubStores.js:136-154` |

---

## 3. Menu Directory

Every item in `components/layout-v2/navConfig.js`, as built on 2026-10-21 by the navigation evaluation (`research/PORTAL-IA-EVALUATION-2026-10.md`). "Role" is the **Menu for** view that shows the item. Being able to see a menu does not mean the user can take its actions (section 1).

### PTI main menu

| Menu label | Section | Role | What it does | Use case |
|---|---|---|---|---|
| My tasks | Home | All | Counts what needs action; each **Open** lands on the rows its count names | All |
| Supplier follow-ups | Home | All | Suppliers to follow up, record a reply, request log | UC6 |
| Purchase orders | Order collaboration | Material Planner | Summary view (each order's response, ASNs and confirmations) and List view; a PO's steps link to its stage pages | UC2 |
| Call-offs | Order collaboration | Material Planner | Releases call-offs and reviews supplier confirmations; tabs To act, All call-offs, Blanket POs running out | UC3 |
| Shipments & ASN | Order collaboration | Material Planner | Tracks ASNs; approves shelf-life exceptions | UC2 |
| Goods receipts | Order collaboration | Material Planner | Creates and posts GRs; reconciles ASN discrepancies | UC2 |
| This week | Weekly plan | Material Planner | Starting point of the weekly planning cycle | UC4 |
| What to order | Weekly plan | Material Planner | Proposes orders; creates draft call-offs; rows open a what-if | Not walked through |
| Make warehouse room | Weekly plan | Material Planner | Records a decision when the warehouse overflows | Not walked through |
| Publish to suppliers | Weekly plan | Material Planner | Publishes forecast versions (blocked on sample data) | UC4 |
| Foresight commitments | Weekly plan | Material Planner | Accepts or returns supplier commitments; Consolidation tab reads the sample plan | UC4 |
| Demand anticipation | Weekly plan | Material Planner | Weekly demand anticipation; Record consumption tab | Not walked through |
| Supplier performance | Review | Material Planner | Supplier scorecard per period | Not walked through |
| Forecast quality | Review | Material Planner | 26-week sell-in forecast per finished good and its bias | Not walked through |
| Feedstock reconcile | Review | Material Planner | Ordered against called off and shipped, per day; max stock | UC6 |
| Demand anticipation history | Review | Material Planner | Every publication with its rules version | Not walked through |
| Stock | Inventory & capacity | Material Planner | Supplier and PTI stock, reorder points, incoming supply; rows link to the estimate and to a what-if | UC6 |
| Stock simulation | Inventory & capacity | Material Planner | Estimated supplier stock on a check date | Not walked through |
| Capacity | Inventory & capacity | Material Planner | Supplier capacity against the LTP per week, read-only | UC6 |
| Alerts | Inventory & capacity | Material Planner | Stock and commitment alerts, closed with a reason | UC7 |
| Supplier access | Inventory & capacity | Material Planner | Grants suppliers a view of PTI stock | Not walked through |
| Trade names | Inventory & capacity | Material Planner | Approves the names suppliers use for PTI materials | Not walked through |
| Requisitions | Sourcing | Buyer | Creates, submits and approves requisitions; raises a sourcing event | UC1 |
| RFI | Sourcing | Buyer | Information requests to suppliers | UC1 |
| RFQ | Sourcing | Buyer | Quotation requests, negotiation rounds, award | UC1 |
| RFP | Sourcing | Buyer | Proposal requests, firm-offer rounds, award | UC1 |
| Suppliers | Sourcing | Buyer | Supplier list and profile, read-only | Not walked through |
| Supplier documents | Sourcing | Buyer | Asks for certificates and confirms or refuses declarations | UC5 |
| Invoices | Invoices | Finance | Invoice match, dispute, payment release | UC2 |
| Demand anticipation history | Audit | Buyer, Finance | Same page as under Review (DRC-D18) | Not walked through |
| Supplier performance | Performance | Buyer | Same scorecard page as under Review | Not walked through |
| Feedstock reconcile | Performance | Buyer | Same page as under Review; Procurement sets max stock | UC6 |

The What-if sandbox has no menu item: it opens from a row on What to order or Stock, or blank from its own "New blank scenario".

### PTI Help & administration, avatar menu

Unchanged: Help & glossary, Roles, Process flows, Interface monitor, Working calendar, 3PL tracking links, Supplier stock update mode, Vendor qualification, Sourcing types, Planning groups, MRP controllers (PIC), Tolerances and rule values, Alert thresholds and stale periods, Reason codes, and the five Planning engine pages (Material requirement, Safety stock targets, Data health, Model backtest, Supplier reliability).

### Supplier menu

| Menu label | Section | What it does | Use case |
|---|---|---|---|
| To do | Home | What Paragon waits for, most urgent first, including documents PTI asked for | All |
| Purchase orders | Orders | Summary and List views; acknowledge, confirm, adjust or reject; Create ASN opens the ASN form for the PO | UC2 |
| Call-offs | Orders | Confirm, change or reject call-offs; send dispatch notice; create the ASN for a call-off | UC3 |
| Shipments & ASN | Orders | Create and submit ASNs | UC2 |
| Goods receipts | Orders | See receipts; acknowledge or dispute discrepancies | UC2 |
| Foresight commitments | Planning | Commit per period; acknowledge forecast rows; Responses & shipments tab reads the sample plan | UC4 |
| Feedstock reconcile | Planning | PO ordered against call-offs and ASNs requested, daily, read-only; max stock shown | UC6 |
| Stock | Planning | Enter stock; see PTI stock if shared | UC6 |
| Capacity | Planning | Submit capacity per material group and week | UC4, UC6 |
| RFI invitations | Sourcing | Answer RFIs | UC1 |
| RFQ invitations | Sourcing | Quote, decline, revise in rounds, see awards | UC1 |
| RFP invitations | Sourcing | Send proposals and firm offers | UC1 |
| Invoices | Invoices | Create, submit, correct and resubmit invoices | UC2 |
| Profile & documents | Company | Declare certificates; see expiry | UC5 |
| My performance | Company | Own scorecard, read-only | Not walked through |
| Help & glossary (avatar menu) | – | What each portal term means | Not walked through |

**Pages with no menu item:** `/buyer/contracts`, `/buyer/delivery-agreements`, `/buyer/supplier-applications`, `/supplier/delivery-agreements` and the RFQ revised-quotes page, each reached from another page. Redirects: `/buyer/order-summary` and `/supplier/order-summary` to the Summary view of Purchase orders, `/buyer/chase` to Supplier follow-ups, and the two old commitments pages to their tabs. The 11 legacy pages with no menu item and no inbound link (Procurement Command Center, Analytics, Supply Risk, Supplier Discovery, the marketplace and its storefront page, Plan Grid, Intake Review, the supplier welcome dashboard, My Catalog, Channel Demo and Channel Inbox) were deleted on 2026-10-21 [Owner].

---

## 4. Unverified and known limits

A reader might expect these to work. The code shows they do not, or that they are simulated.

**Sourcing**

1. **An RFQ never closes automatically at its deadline.** (`services/transitions/flows/rfq.flow.js:136-158`)
2. **An Open RFI or RFP cannot be cancelled.** Only a Draft can be discarded. (`services/query/commandHooks.js:3364,3503`)

**Requisitions and contracts**

3. **PR to PO directly is not available.** The PO is raised in S/4. (`lib/i18n/requisitions.js:122-123`)
4. **"New Contract" creates nothing.** It ends with "No contract was created". Contract actions belong to S/4. (`pages-v2/BuyerContracts/index.jsx:171-208`; `lib/i18n/contracts.js:178`; `services/transitions/flows/contract.flow.js:46-120`)
5. **Delivery agreement releases are simulated:** "Released in the portal (simulated) — not posted to SAP". (`services/data/mock/MockDeliveryService.js:16-20,83-125`)

**PO to payment**

6. **A Matched invoice never becomes Approved in the UI.** The approve action is deliberately not offered, so only seeded Approved invoices can be released. (`pages-v2/invoices/invoiceActionModel.js:99-102`)
7. **These buttons only show a toast:**
    - Goods receipts: "Submit inspection results", "Override hold". (`pages-v2/BuyerGoodsReceipt/components/footerForStatus.jsx:77-130`)
    - Shipments: "Send reminder to supplier", "Track shipment". (`pages-v2/BuyerShipments/components/footerForStatus.jsx:29-89`)
    - Invoices: "Review match", "Escalate". (`pages-v2/BuyerInvoices/hooks/useInvoiceCommands.js:76-124`)
    - Supplier orders: "Create ASN" on the PO page. (`pages-v2/SupplierOrders.jsx:543-568`)
    - Buyer orders: "Export", "New PO", "View Full Details" have no handler. (`pages-v2/BuyerOrders.jsx:493-496,707-711`)
8. **ASN In Transit and Delivered, and PO delivered and closed, come from TMS/S4.** No screen produces them. (`services/transitions/flows/advanceShipNotice.flow.js:180-210`)

**Forecast and planning**

9. **"Publish to suppliers" is always refused on sample data:** "Nothing can be published until real data arrives…". Published versions exist only as demo data, or through "Move demand". (`pages-v2/BuyerStabilise/components/PublishSection.jsx:73-76`; `services/data/mock/MockCommandService.js:3380-3396`)
10. **Order-plan drafts cannot be released** until the SAP feed is live. (`lib/i18n/orderPlan.js:144-149`)
11. **Reschedule actions are off on sample data:** "Send change to supplier" and "Mark as taken to SAP". (`pages-v2/BuyerReschedule/index.jsx:84`; `pages-v2/BuyerReschedule/components/ProposalAction.jsx:60-135`)

**Compliance**

12. **The compliance certificate registry cannot be edited.** Its approval actions cannot fire. (`services/data/mock/MockCommandService.js:5938-6035`; `services/transitions/flows/compliance.flow.js:45,57,76`)
13. **No file is sent to Paragon.** "View" download is not available yet, and "Renew" opens a read-only walkthrough. (`lib/i18n/supplierDocuments.js:95,121-122`; `pages-v2/SupplierDocuments.jsx:740-760`)
14. **"Export Report" and "Remind" are simulated.** (`lib/i18n/compliance.js:26-27`; `pages-v2/BuyerCompliance/components/RegistryRow.jsx:111-125`)

**Communication and performance**

15. **Nothing is sent from Supplier follow-ups:** "No live channel — nothing is sent from here." (`pages-v2/BuyerCommHub.jsx:151-192`)
16. **The supplier WhatsApp/Email page is scripted.** Its buttons show success banners and dispatch nothing. (`pages-v2/SupplierWhatsApp/components/EmailBody.jsx:17-63`)
17. **These buttons only show a toast, or a false success toast:**
    - "Send improvement plan" (scorecard). (`pages-v2/BuyerScorecard.jsx:684-695`)
    - Supplier "Export Report" and "Acknowledge & plan". (`pages-v2/SupplierPerformance.jsx:243-248,660-673`)

**Access**

18. **There is no sign-in guard.** Every page renders without signing in. (`router/AppRouter.jsx:124-306`)
19. **The supplier switch always loads sup-007.** (`components/layout-v2/SidebarV2.jsx:120-127`)

**Alerts**

20. **The bell icon in the top bar always shows "3"** and does nothing when clicked. (`components/layout-v2/TopBarV2.jsx:62-70`)
21. **No email or WhatsApp alerts; closures are lost when the demo resets.** (`pages-v2/BuyerAlerts.jsx:59-60`; `services/data/mock/stores/inventoryHubStores.js:136-154`)

---

## 5. Screenshot plan

Shared setup for every step:
- Run `npm run dev` and open `#/login` at the address Vite prints (5173 by default).
- Use **View as Buyer** or **View as Supplier**. The supplier is `sup-007`.
- To show an "Awaiting …" notice, untick the role or lane under avatar → **Roles**.
- Seeded records are cited from the readers' fixture reads (`fixtures/*`, `data/mock*`).

| UC | Step | Persona, role or lane | Route | Demo record |
|---|---|---|---|---|
| UC1 | 1-3 | PTI | `/buyer/purchase-requisition` | pr-005 Draft, pr-004 Pending, pr-002 Approved |
| UC1 | 4 | PTI, Menu for Buyer | `/buyer/rfq` | rfq-025 Draft |
| UC1 | 5 | Supplier | `/supplier/rfq` | rfq-021 Open |
| UC1 | 7-9 | PTI | `/buyer/rfq/rfq-014` | rfq-014 with round nr-0001 |
| UC1 | 8 | Supplier | `/supplier/rfq/rounds` | nr-0001 |
| UC1 | 11 | Supplier | `/supplier/rfq` Awards & history | rfq-015 (70/30 split) |
| UC1 | neg | PTI | `/buyer/rfq/rfq-020` | All bidders fail the gate |
| UC2 | 1-2 | Supplier | `/supplier/orders` | PO-2026-00121 Sent |
| UC2 | 3 | Supplier | `/supplier/shipments` | PO-2026-00124 Confirmed |
| UC2 | 4 | PTI, Menu for Material Planner | `/buyer/goods-receipt` | New GR; gr-002 Pending Inspection |
| UC2 | 5 | Supplier | `/supplier/invoices` | inv-brl-0055 Draft |
| UC2 | 6 | PTI, Menu for Finance | `/buyer/invoices` | inv-giv-0892 Approved |
| UC2 | neg | Supplier, PTI | `/supplier/orders`, `/buyer/orders`, `/supplier/goods-receipts` | PO-2026-00122 Adjusted; gr-015 short; inv-brl-0062 Price Variance |
| UC3 | 1 | PTI | `/buyer/call-offs` | New call-off; CO-2026-0003 |
| UC3 | 2-3 | Supplier | `/supplier/call-offs` | CO-2026-0003 Awaiting Confirmation |
| UC3 | neg | PTI | `/buyer/call-offs` | CO-2026-0004 (new date), CO-2026-0014 (+5.1%) |
| UC4 | 1 | PTI | `/buyer/this-week` | – |
| UC4 | 2-4 | Supplier | `/supplier/forecasts` | FC-PK-V2 lines on PK-PETB-8801/8802 |
| UC4 | 5 | PTI | `/buyer/collaboration` | Exception row for sup-007 |
| UC5 | 1, 3 | PTI | `/buyer/compliance` | doc-010 Under Review |
| UC5 | 2 | Supplier | `/supplier/documents` | doc-006 Awaiting Upload; doc-001 expired; doc-012 Rejected |
| UC6 | 1-2 | Supplier | `/supplier/inventory`, `/supplier/capacity` | PK-PETB-8810 stale |
| UC6 | 3 | PTI | `/buyer/comm-hub` | Pasted sample reply |
| UC6 | 4-5 | PTI | `/buyer/inventory`, `/buyer/alerts` | sup-002 RM-STEAR-7300 stock-out |
| UC6 | 6 | PTI, Menu for Buyer | `/buyer/fs-reconcile` | – |
| UC7 | 2 | PTI, Menu for Material Planner | `/buyer/alerts` | 30 open alerts |
| UC7 | 4 | PTI | `/buyer/alerts` → Close alert | Any open alert |
| UC7 | 3 | Supplier | `/supplier/home`, scrolled to "Alerts about your materials" | sup-007, 7 alerts |
| All | Notices | PTI or Supplier with one role removed | Any page above | e.g. untick Supplier Fulfilment on `/supplier/inventory` |

**Roles or lanes not reachable in Demo Mode: none.** Every PTI role and supplier lane is reachable by ticking or unticking under avatar → Roles. The one limit is the supplier itself: the toggle always loads sup-007, so screens for any other supplier are not reachable without editing `localStorage`.
