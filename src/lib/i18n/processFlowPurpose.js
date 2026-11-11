// ─────────────────────────────────────────────────────────────────────────────
// PF-2 · PURPOSE PROSE. Namespace: processFlows.purpose.*
//
// ⚠️ **THIS IS THE ONLY AUTHORED PROSE ABOUT A SPECIFIC MACHINE IN THE TREE'S
// UI LAYER, AND IT IS DELIBERATELY QUARANTINED IN ITS OWN FILE.** `processFlows.
// ts` next door is page CHROME — not one string there names a flow, state or
// verb, and that claim is worth keeping literally true. Everything here does the
// opposite by design: each value explains ONE registered thing.
//
// ── ⚠️ EVERY KEY IS NAMED BY AN ANNOTATION, AND EVERY ANNOTATION IS HERE ────
//   `services/transitions/annotations.js` holds the keys; this file holds the
//   words. `annotations.test.js` pins the two together in BOTH directions, so
//   an orphan key here is red and a keyless annotation there is red. Nothing in
//   this file is looked up by concatenation — see the annotation header.
//
// ── ⚠️ NOT ONE SENTENCE RESTATES A MACHINE FACT ─────────────────────────────
//   No value below contains its own flow's state names, roles, required fields,
//   hook names, transition ids, entity key, or a trigger word. Those RENDER
//   FROM THE REGISTRY, next to the sentence, so a sentence that repeated one
//   would be a second copy — and the copy is the half that goes wrong silently
//   when somebody renames a state. Enforced, EN and ID, by the no-restatement
//   test. It is also why several sentences read a little sideways ("the goods
//   are frozen", not "the goods go on quality hold"): the sideways phrasing is
//   the one that survives a rename.
//
// ── WHO THIS IS WRITTEN FOR ─────────────────────────────────────────────────
//   A procurement person, not an engineer. Every sentence answers "why would I
//   do this, and what happens to my delivery" — never "what does this function
//   call". Purpose is the ONE thing the schema does not carry, and the audience
//   for it is the upstream supply-chain team.
//
// EN+ID from birth (MARKER-I18N-HOLE-01): ~110 hand-authored strings landing
// late in a page's life is the exact class an i18n coverage sweep is blind to.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
export const processFlowPurposeEn = {
  // ── purchaseOrder ──────────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseOrder':
    "Paragon's commitment to buy — what was ordered, at what price, for when. Every shipment, receipt and bill downstream hangs off this one document.",
  'processFlows.purpose.t_po_issue':
    'Buying makes its decision binding. Until this document exists, a supplier has nothing it can safely start producing against.',
  'processFlows.purpose.t_po_view':
    'Tells the buyer the order reached a person and not just an inbox — the first point at which silence starts to mean something.',
  'processFlows.purpose.t_po_acknowledge':
    'The supplier says it has the order and is working through it, without yet committing to the numbers. Useful when a real answer will take days.',
  'processFlows.purpose.t_po_confirm':
    'The supplier commits to the line amounts it will actually ship. This is the promise the plant plans production around, and the figure every later shortfall is measured against.',
  'processFlows.purpose.t_po_adjust':
    'The supplier cannot meet the order as written and says what it can do instead: a quantity and date per line, with a reason. The planner learns early, and the reason becomes data for supplier assessment.',
  'processFlows.purpose.t_po_reject':
    'The supplier cannot meet the date, quantity or quality at all. Saying so on time lets the planner find the supply elsewhere, and the rejection counts in supplier performance.',
  'processFlows.purpose.t_po_accept_counter':
    'The planner agrees to the supplier’s counter-offer, so the order stands at the new quantity and date and the supplier can plan shipping.',
  'processFlows.purpose.t_po_reject_counter':
    'The planner cannot accept the counter-offer and says why. The order goes back to the supplier for a new answer.',
  'processFlows.purpose.t_po_shipping_notice':
    'The supplier states when shipping of an order it has committed to will be complete, and updates it if it moves. The planner sees whether the order is still safe.',
  'processFlows.purpose.t_po_partial_deliver':
    'Part of the order has physically arrived. Worth recording because a partly served order still owes something, and the shortfall is what buying chases.',
  'processFlows.purpose.t_po_deliver':
    'Everything ordered has physically arrived. Buying stops chasing and finance starts expecting a bill.',
  'processFlows.purpose.t_po_close':
    'The order is finished with — received, billed and settled — and stops appearing in anybody’s open work.',

  // ── advanceShipNotice ──────────────────────────────────────────────────────
  'processFlows.purpose.entity.advanceShipNotice':
    'The supplier’s heads-up that goods are on their way, and what is on them. It is what lets a warehouse plan dock time instead of discovering a truck.',
  'processFlows.purpose.t_asn_create':
    'The supplier begins telling Paragon what it is about to send, while the details are still theirs to change.',
  'processFlows.purpose.t_asn_submit':
    'Hands the shipping details to Paragon’s warehouse: who is carrying it, how to trace it, and when to expect it.',
  'processFlows.purpose.t_asn_cancel':
    'The supplier withdraws a notice before anything arrived, so the warehouse stops expecting those goods and the quantity is free to ship again.',
  'processFlows.purpose.t_asn_in_transit':
    'The goods have left the supplier. From here the arrival date is a logistics question, not a production one.',
  'processFlows.purpose.t_asn_deliver':
    'The goods reached Paragon. The notice stops being a forecast and becomes something the receiving team can check against.',
  'processFlows.purpose.t_asn_discrepancy':
    'What turned up did not match what was announced. It follows from the receiving team’s finding, and it is the supplier’s cue that something needs explaining.',
  'processFlows.purpose.t_asn_resolve_discrepancy':
    'The mismatch has been talked through and settled, so the notice stops sitting in an unresolved pile.',
  'processFlows.purpose.t_asn_request_exception':
    'The goods would arrive with less shelf life left than Paragon accepts. The supplier says why they should come anyway and asks Quality to decide before anything ships.',
  'processFlows.purpose.t_asn_approve_exception':
    'Quality accepts the short-dated goods. The notice goes to the warehouse, and the goods are received into blocked stock.',
  'processFlows.purpose.t_asn_reject_exception':
    'Quality refuses the short-dated goods and says why. The notice goes back to the supplier to rework.',
  'processFlows.purpose.t_asn_change_eta':
    'The supplier moves the arrival later than the date Quality approved, so the shelf life left at arrival is shorter and Quality decides again.',

  // ── goodsReceipt ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceipt':
    'Paragon’s record of what physically turned up and whether it was fit to use. It is the fact finance pays against, so anything wrong here becomes a billing argument later.',
  'processFlows.purpose.t_gr_create':
    'Opens the receiving record for a delivery that has reached the dock, so the goods are accounted for before anybody touches them.',
  'processFlows.purpose.t_gr_start_inspection':
    'Quality picks the delivery up and starts checking it. From here somebody owns the decision.',
  'processFlows.purpose.t_gr_hold':
    'Something looks wrong, so the goods are frozen rather than taken or refused. The reason written here is what the supplier will be asked about.',
  'processFlows.purpose.t_gr_request_retest':
    'The problem that froze the goods has been dealt with — look again. Without this, frozen stock has no way back into use.',
  'processFlows.purpose.t_gr_approve':
    'Quality takes the whole delivery. The supplier gets clean credit for it and the goods can be used.',
  'processFlows.purpose.t_gr_partial_approve':
    'Some of the delivery is usable and some is not. Paragon keeps what it can use, and the rest becomes a claim against the supplier.',
  'processFlows.purpose.t_gr_reject':
    'None of the delivery is usable. The reason written here is what the supplier and buying argue from, and it blocks payment for the lot.',
  'processFlows.purpose.t_gr_post':
    'Hands the receipt to SAP so the stock exists in the books and the plant can consume it. Nothing is truly received until SAP says so.',

  // ── goodsReceiptLine ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceiptLine':
    'The per-item verdict behind a delivery’s overall outcome. A delivery is only as good as its worst item, and this is where that is decided.',
  'processFlows.purpose.t_grline_inspect':
    'Somebody physically looks at one item — its condition and its packaging — and writes down what they saw.',
  'processFlows.purpose.t_grline_accept':
    'This item is fit for use. It counts toward the delivery being cleared as a whole.',
  'processFlows.purpose.t_grline_reject':
    'This item is not fit for use, with a reason attached. One such item is enough to stop a delivery being cleared whole.',
  'processFlows.purpose.t_grline_quarantine':
    'The item is set aside until somebody decides — not usable yet, not refused either. It keeps doubtful stock out of production.',
  'processFlows.purpose.t_grline_release':
    'The second look settled the doubt in its favour, so the item stops being held and joins the stock the plant may draw on.',
  'processFlows.purpose.t_grline_return':
    'The item goes back to the supplier rather than being scrapped or kept, so ownership of the problem goes back with it.',

  // ── invoice ────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoice':
    'The supplier’s claim to be paid, and Paragon’s decision on it. One document per claim, whichever side is looking at it.',
  'processFlows.purpose.t_invoice_create':
    'The supplier starts a bill against an order it has served, while the figures are still theirs to correct.',
  'processFlows.purpose.t_invoice_submit':
    'The supplier formally asks to be paid. The clock on payment terms starts running here.',
  'processFlows.purpose.t_invoice_match':
    'Paragon checks the bill against what was ordered and what was received. A bill that fails this check is not a bill anybody can pay.',
  'processFlows.purpose.t_invoice_approve':
    'Finance agrees the claim is owed. The decision to pay is taken here; the money moves later.',
  'processFlows.purpose.t_invoice_release_payment':
    'Sends the payment instruction to SAP. Until SAP confirms, nobody should tell a supplier they have been paid.',
  'processFlows.purpose.t_invoice_remit':
    'The supplier acknowledges the money and the advice that came with it. The claim is finished.',
  'processFlows.purpose.t_invoice_dispute':
    'Paragon does not take the claim as it stands, and says why. It stops the payment clock and puts the ball back with the supplier.',
  'processFlows.purpose.t_invoice_resubmit':
    'The supplier fixes what Finance sent back and asks to be paid again. The bill is checked again from the start, as if it were new.',
  'processFlows.purpose.t_invoice_resolve':
    'The disagreement has been settled and the claim goes back for checking. Without this, a contested bill has nowhere to go.',

  // ── invoiceMatch ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoiceMatch':
    'The three-way check behind a bill: what was ordered, what arrived, what is being charged. It is why a wrong bill is caught before money moves, not after.',
  'processFlows.purpose.t_invmatch_await_gr':
    'The bill cannot be checked until the goods are booked in. This is the wait, made visible instead of looking like a stall.',
  'processFlows.purpose.t_invmatch_matched':
    'Order, receipt and bill agree. Nothing stands in the way of paying.',
  'processFlows.purpose.t_invmatch_qty_variance':
    'The supplier is charging for more than Paragon can show it received. Somebody has to establish which count is right.',
  'processFlows.purpose.t_invmatch_price_variance':
    'The unit price on the bill sits above what was agreed, beyond what tolerance allows. Buying owns that conversation, not finance.',

  // ── rfq ────────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.rfq':
    'A sourcing event: Paragon asks several suppliers for an offer on the same requirement, so the comparison is like for like.',
  'processFlows.purpose.t_rfq_create':
    'Buying starts shaping a request — what is needed, in what category, how much — while it is still internal.',
  'processFlows.purpose.t_rfq_publish':
    'Puts the request in front of the invited suppliers. Nothing is visible to them before this, so it is the moment sourcing actually begins.',
  'processFlows.purpose.t_rfq_close':
    'The response window ends. Late offers are not compared, which is what makes the comparison fair to everyone who answered on time.',
  'processFlows.purpose.t_rfq_award':
    'Buying picks the winning offer and records why. Everyone who bid learns where they stand, in one act rather than by rumour.',
  'processFlows.purpose.t_rfq_award_partial':
    'Buying awards the items that are ready and comes back for the rest later. Nobody is turned down yet, because a supplier may still win an item not decided.',
  'processFlows.purpose.t_rfq_award_cancel':
    'Buying withdraws an award, with a reason, before it is raised in SAP. The award stays on record, a new winner can be chosen, and the offers it decided go back to evaluation.',
  'processFlows.purpose.t_rfq_award_cancel_partial':
    'Buying withdraws one award while others stand. Its items reopen, the other awards are untouched, and every step stays on record.',
  'processFlows.purpose.t_rfq_award_sap_raised':
    'Records that an award was raised in SAP, with the SAP document number. From here changes are made in SAP, not by cancelling in the hub.',
  'processFlows.purpose.t_rfq_fx_pin':
    'Records the exchange basis foreign offers are being compared on, so a decision taken today can still be explained a year from now.',
  'processFlows.purpose.t_rfq_cancel':
    'Buying calls the event off before picking anyone — the requirement changed, or the budget went. The suppliers get told rather than left waiting.',
  'processFlows.purpose.t_rfq_reopen':
    'Reopens a finished event for further responses — too few answers, or a requirement that moved. It reuses the request rather than starting a new one.',

  // ── RFQ response: intent, confidentiality, clarifications ────────────────
  'processFlows.purpose.entity.rfqIntent':
    'Whether an invited supplier will answer a price request at all, and if not, why — so a silent supplier and one that said no are not the same row.',
  'processFlows.purpose.t_rfqintent_respond': 'The supplier says it will send a quote.',
  'processFlows.purpose.t_rfqintent_decline':
    'The supplier says it will not quote, picks why from the list and explains in its own words. Buying reads both.',
  'processFlows.purpose.t_rfqintent_withdraw':
    'A supplier that said it would quote changes its mind, picks why from the list and explains in its own words. What it first said stays on record.',
  'processFlows.purpose.entity.rfqConfidentiality':
    'The confidentiality terms a supplier accepts before it may read a confidential request’s specification, notes and files.',
  'processFlows.purpose.t_rfqconfidentiality_accept':
    'The supplier accepts the terms once, the time is recorded, and the hidden content opens to it.',
  'processFlows.purpose.entity.rfqClarification':
    'Something a supplier wants explained about a price request while it is open, and what buying replies.',
  'processFlows.purpose.t_rfqclarification_ask':
    'An invited supplier asks buying what something in the request means.',
  'processFlows.purpose.t_rfqclarification_answer':
    'Buying replies, either to the supplier that raised it or to every invited supplier without saying who raised it.',

  // ── quotation ──────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.quotation':
    'A supplier’s offer against one sourcing request — the price and the delivery promise it is prepared to stand behind.',
  'processFlows.purpose.t_quotation_submit':
    'The supplier makes its offer: what it costs, in what money, and how long delivery takes. All three, because a price with no date is not comparable.',
  'processFlows.purpose.t_quotation_review':
    'Buying takes the offer into evaluation. It separates what has been read from what is still in the pile.',
  'processFlows.purpose.t_quotation_award':
    'This offer won. It follows from the buying decision on the request, and is never entered against a single supplier by hand.',
  'processFlows.purpose.t_quotation_reject':
    'This offer did not win. It lands at the same moment as the winning one, so nobody is left wondering and no one has to be told individually.',
  'processFlows.purpose.t_quotation_reinstate':
    'The award this offer depended on was withdrawn, so the offer goes back to evaluation instead of standing as won or lost.',

  // ── shipment ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.shipment':
    'The inbound leg as logistics sees it — one physical movement tracked from the supplier’s gate to Paragon’s yard.',
  'processFlows.purpose.t_shipment_create':
    'Opens tracking for goods Paragon is expecting, so an inbound movement exists to hang milestones on before anything moves.',
  'processFlows.purpose.t_shipment_asn_received':
    'The supplier’s advance notice has landed, and the movement now carries real detail — what is coming, and when.',
  'processFlows.purpose.t_shipment_depart':
    'The goods have left the supplier. From here, the arrival date is somebody else’s to influence.',
  'processFlows.purpose.t_shipment_arrive_port':
    'The goods reached the port of entry. For an import, this is where the long tail of paperwork starts.',
  'processFlows.purpose.t_shipment_customs':
    'The goods are with the border authorities. Nothing Paragon does speeds that up, but knowing it stops a planner chasing the supplier.',
  'processFlows.purpose.t_shipment_dock':
    'The goods are at Paragon’s gate waiting for a slot. The delay from here on is Paragon’s own.',
  'processFlows.purpose.t_shipment_unload':
    'The container is being emptied. Receiving can start counting.',
  'processFlows.purpose.t_shipment_deliver':
    'The goods are physically in. The logistics leg is over and the receiving record takes over.',

  // ── contract ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.contract':
    'The standing agreement a supplier is bought from — the prices, volumes and terms that orders inherit rather than renegotiate each time.',
  'processFlows.purpose.t_contract_draft':
    'Buying begins setting out terms with a supplier, before anything binds either side.',
  'processFlows.purpose.t_contract_activate':
    'The terms take effect. Orders raised from now on inherit them, so this is the moment a negotiated price becomes a real price.',
  'processFlows.purpose.t_contract_renew':
    'The agreement continues for a further period. Recorded as its own act so nobody has to guess whether a lapsed date was an oversight or a decision.',
  'processFlows.purpose.t_contract_terminate':
    'The agreement ends, at its term or before it. Nothing new is bought under it from here, whatever the calendar says.',

  // ── obligation ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.obligation':
    'A promise written into an agreement — a volume, a rebate, a service level — tracked so somebody notices whether it was actually kept.',
  'processFlows.purpose.t_obligation_track':
    'Starts watching one commitment from an agreement, so it lives somewhere other than in a document nobody rereads.',
  'processFlows.purpose.t_obligation_complete':
    'The commitment was met. Recorded because an unmet promise is only visible if the kept ones are marked.',

  // ── purchaseRequisition ────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseRequisition':
    'The internal request that starts everything: somebody in the plant needs something bought, and says so where it can be reviewed and traced.',
  'processFlows.purpose.t_pr_create':
    'A requester writes down what the plant needs, so a need enters Paragon as a document rather than as a message somebody may forget.',
  'processFlows.purpose.t_pr_submit':
    'Sends the request out for a decision. Until this happens it is one person’s note, not a claim on the budget.',
  'processFlows.purpose.t_pr_approve':
    'A budget holder agrees the need is real and funded. Nothing is sourced or ordered before this.',
  'processFlows.purpose.t_pr_reject':
    'The decision is no. The request stops here rather than quietly ageing in a queue.',
  'processFlows.purpose.t_pr_revise':
    'Puts a declined request back in the requester’s hands with a note on what changed, so the next reviewer sees a different document.',
  'processFlows.purpose.t_pr_source':
    'The need is going out to several suppliers for offers rather than straight to a known one. Recorded on the request so the requester can see where their need went.',
  'processFlows.purpose.t_pr_convert':
    'The need has become a real order. This is what closes the loop for whoever raised it.',

  // ── supplierDocument ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.supplierDocument':
    'The paperwork Paragon must hold on a supplier — certificates, licences, bank details — and where each one stands.',
  'processFlows.purpose.t_supplierdoc_request':
    'Paragon asks a supplier for one specific piece of paperwork, so the gap sits on somebody’s list rather than being discovered at an audit.',
  'processFlows.purpose.t_supplierdoc_declare':
    'The supplier states the details of a certificate nobody asked for — which scheme, which number, who granted it, when it runs out — so a certificate Paragon did not know to ask for can still reach the people who check it. No file is transmitted; what is recorded is what the supplier says.',
  'processFlows.purpose.t_supplierdoc_submit':
    'The supplier states the details of what was asked for. From here the delay is Paragon’s, not theirs.',
  'processFlows.purpose.t_supplierdoc_verify':
    'Somebody has confirmed the paper is genuine and current. Only now does it count for anything.',
  'processFlows.purpose.t_supplierdoc_reject':
    'The paper does not do the job — wrong one, out of date, or unreadable — and the supplier is asked again.',

  // ── compliance ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.compliance':
    'Whether a supplier holds the certificates a material actually requires — halal, BPOM and the rest — and where each requirement stands today.',
  'processFlows.purpose.t_compliance_submit':
    'The supplier provides the certificate for a requirement it has not yet covered. It is the only way that gap closes.',
  'processFlows.purpose.t_compliance_verify':
    'The certificate has been checked and stands up. Material covered by it can be bought without an exception.',
  'processFlows.purpose.t_compliance_reject':
    'The certificate does not satisfy the requirement, so the requirement is outstanding again and the supplier has to try once more.',

  // ── requirementResponse ────────────────────────────────────────────────────
  'processFlows.purpose.entity.requirementResponse':
    'A supplier’s answer to a published forecast line: how much of what Paragon asked for it can actually supply, in that period.',
  'processFlows.purpose.t_requirementresponse_submit':
    'The supplier works out what it can commit to against one forecast line, while the number is still theirs to change.',
  'processFlows.purpose.t_requirementresponse_acknowledge':
    'The supplier confirms it has seen a line it was not asked to commit against. Silence and “seen it” are different facts, and planning uses them differently.',
  'processFlows.purpose.t_requirementresponse_promote':
    'Sends the commitment to Paragon’s planner. Nothing is visible to planning before this, so it is the act that makes a promise a promise.',
  'processFlows.purpose.t_requirementresponse_review':
    'The planner takes the answer into evaluation rather than taking it on sight.',
  'processFlows.purpose.t_requirementresponse_accept':
    'The planner takes the commitment as the number to plan on. Downstream planning treats it as real from here.',
  'processFlows.purpose.t_requirementresponse_dispute':
    'The planner does not take the answer — the gap is too big, or the reason given does not hold — and says so to the supplier.',
  'processFlows.purpose.t_requirementresponse_resolve':
    'The disagreement has been worked through and the answer goes back for a decision, instead of sitting unfinished.',

  // ── inventoryDeclaration ───────────────────────────────────────────────────
  'processFlows.purpose.entity.inventoryDeclaration':
    'What a supplier says it is holding right now, for one item. It is the number Paragon plans against when it cannot see the supplier’s own stock.',
  'processFlows.purpose.t_inventorydeclaration_declare':
    'A supplier states its own stock on hand. Every statement is kept, so what was said last month is still there to compare against.',
  'processFlows.purpose.t_inventorydeclaration_record':
    'A planner writes down stock a supplier reported over chat or email. Kept apart from the supplier’s own statement, because who said it matters when the number turns out wrong.',

  // ── incomingShipment ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.incomingShipment':
    'A supply leg a supplier tells Paragon about — goods heading to Paragon, or goods moving between a principal and a distributor that Paragon’s own supply depends on.',
  'processFlows.purpose.t_incomingshipment_report':
    'The supplier tells Paragon a consignment exists, what is on it and how much. It is how supply visibility starts without waiting for a delivery.',
  'processFlows.purpose.t_incomingshipment_ship':
    'The leg has departed. The date it will land stops being a plan and becomes a travel estimate.',
  'processFlows.purpose.t_incomingshipment_arrive':
    'The leg has landed. For a supply-assurance leg, this is where Paragon’s exposure eases.',
  'processFlows.purpose.t_incomingshipment_track':
    'The supplier adds the carrier’s tracking link to a shipment from its principal, so the leg can be followed without asking.',
  'processFlows.purpose.t_incomingshipment_cancel':
    'The leg is called off while under way. Better recorded than left in a plan as stock that is never coming.',

  // ── enforcement ────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.enforcement':
    'How hard each rule bites — blocking, warning, or merely watching — recorded as a decision somebody made rather than a setting nobody owns.',
  'processFlows.purpose.t_enforcement_set':
    'Somebody decides how strictly one rule is applied, and is named for it. Loosening a rule is exactly the act an audit asks about a year later.',

  // ── the permission bundles ─────────────────────────────────────
  // ⚠️ NEITHER SENTENCE CONTAINS THE WORD THIS MACHINE IS NAMED AFTER, and that
  // is the PF-2 rule rather than an evasion: a purpose that restates a machine
  // token tells a reader what the page already shows beside it.
  'processFlows.purpose.entity.role':
    'A copy of one permission bundle with extra permissions on top of it, kept as a record of what was copied and by whom — so a seat somebody invented last Tuesday reads differently from a standard one.',
  'processFlows.purpose.t_role_grant':
    'Somebody copies an existing set of permissions and widens it. Widening never removes anything, so nobody quietly loses an authority they were relied on to have, and the act is recorded like every other governed act.',

  // ── the hub's working calendar (BL-50) ─────────────────────────────────
  'processFlows.purpose.entity.workingCalendar':
    'Which days count as working days for every deadline in the hub, starting from the calendar SAP holds and corrected by the hub administrator where the plant knows better.',
  'processFlows.purpose.t_calendar_day_set':
    'The hub administrator says one date is or is not a working day, and why. Every response and commitment deadline that spans that date moves with it at once, so the grounds for it have to be on record.',
  // ── the logistics providers list (BL-51) ─────────────────────────────
  'processFlows.purpose.entity.threePl':
    'The logistics providers a supplier can choose on a shipping notice, each with the public page where its tracking numbers can be looked up. The hub only links to that page; it never reads a status from it.',
  'processFlows.purpose.t_threepl_set':
    'The hub administrator adds a logistics provider or changes one: what it is called, its public tracking address, and whether new shipping notices may still choose it. Every tracking link in the hub is built from this list, so each change is on record.',
  // ── the supplier overlay (Material A1) ───────────────────────────────
  'processFlows.purpose.entity.supplierOverlay':
    'What the hub itself decides about a supplier, on top of the supplier master copied from SAP. Today that is how the supplier shares its stock: pulled straight from the supplier’s own ERP, or entered by template or by hand.',
  'processFlows.purpose.t_supplier_set_update_mode':
    'The hub administrator sets whether a supplier’s stock is pulled from its ERP or entered by the supplier, with an optional reason. The mode decides how often the stock must be updated and when it counts as out of date, so each change is on record with who made it and when.',
  // ── the qualification lists (Material G1) ───────────────────────────
  'processFlows.purpose.entity.qualificationRule':
    'The documents a vendor must hold, valid and in date, to be Approved or Preferred. The hub works out every vendor’s level from these lists and its documents; nobody sets a level by hand.',
  'processFlows.purpose.t_qualification_rule_set':
    'Procurement and Quality set the documents one level requires. The Preferred list always includes every Approved document. A change moves vendors up or down at once, so each change is on record with who made it and when.',
  // ── the sourcing type map (Material G2) ─────────────────────────────
  'processFlows.purpose.entity.sourcingType':
    'Whether a sourcing category or purchasing group is Direct or Indirect. An RFI, RFQ or RFP takes its type from its category, and the type decides which vendors may be invited and awarded: Direct needs Preferred, Indirect needs Approved or Preferred.',
  'processFlows.purpose.t_sourcingtype_set':
    'Procurement sets a category or purchasing group to Direct or Indirect. Events published earlier keep the type they were published with, so each change is on record with who made it and when.',
  // ── planning groups (Material C5) ────────────────────────────────────
  'processFlows.purpose.entity.planningGroup':
    'A set of materials that share capacity at a supplier, under one SAP material group. Until Material Planning splits an SAP group it has one default planning group with the same materials, so capacity reads as it always did.',
  'processFlows.purpose.t_planninggroup_create':
    'Material Planning creates a new, empty planning group under one SAP material group, to split materials that run on different lines at the supplier. The change is on record with who made it and when.',
  'processFlows.purpose.t_planninggroup_rename':
    'Material Planning renames a planning group. Suppliers and planners see what it is called on capacity and alerts, so each change is on record.',
  'processFlows.purpose.t_planninggroup_move_materials':
    'Material Planning moves materials into a planning group of the same SAP material group. A material is in exactly one group, and the capacity already entered for the weeks ahead on both groups is marked for the supplier to enter again.',
  'processFlows.purpose.t_planninggroup_retire':
    'Material Planning retires a planning group once no material is left in it. A group is never deleted, so the capacity entered against it stays readable.',
  // ── the MRP controller list (Material C4) ───────────────────────────
  'processFlows.purpose.entity.mrpController':
    'Who handles a material in planning. SAP gives each material an MRP controller code; the hub keeps who that code is: the planner or desk a supplier can ask for, and the hub users behind it.',
  'processFlows.purpose.t_mrpcontroller_set':
    'The hub administrator maps an MRP controller code to the planner or desk behind it and one or more hub users, or changes that mapping. Suppliers see who to contact on their stock, call-offs and shipping notices, so each change is on record with who made it and when.',
  'processFlows.purpose.t_mrpcontroller_unmap':
    'The hub administrator removes the mapping of an MRP controller code. Materials with that code then show the code only, and suppliers no longer see who handles them. The removal is on record with who made it and when.',
  // ── supplier trade names (Material C2) ───────────────────────────────
  'processFlows.purpose.entity.materialName':
    'A supplier’s own name for a PTI material it supplies, with its own material number if it has one. Once Material Planning approves it, the name shows beside PTI’s description, so the supplier recognises its products and a planner can match what the supplier writes.',
  'processFlows.purpose.t_materialname_submit':
    'The supplier enters its trade name for a material assigned to it. The name waits for Material Planning, and the name in use stays until Material Planning accepts the new one.',
  'processFlows.purpose.t_materialname_approve':
    'Material Planning approves a supplier’s trade name. Each supplier has one name in use per material, so the earlier accepted name steps aside.',
  'processFlows.purpose.t_materialname_reject':
    'Material Planning rejects a supplier’s trade name with a reason, which the supplier sees and can answer with a new name.',
  'processFlows.purpose.t_materialname_load':
    'PTI loads accepted trade names in bulk from a file of PTI code, supplier, trade name and supplier material number. They take effect on load and are marked as loaded by PTI; a row that matches the name in use changes nothing.',
  'processFlows.purpose.t_materialname_replace':
    'A newer name for the same supplier and material takes the place of the earlier one, so only one name is in use at a time and only one waits for a decision.',
  // ── the stock simulation's planner input (Material E1) ─────────────────
  'processFlows.purpose.entity.simulationOverride':
    'A figure the planner enters for the stock simulation where the supplier has not given one: stock on hand, a quantity in production with its completion date, or a shipment to the distributor with its arrival date. It is used until the supplier’s next stock update and never changes what the supplier reported.',
  'processFlows.purpose.t_simulation_override_set':
    'The planner enters a missing figure so the stock simulation can still run. The simulation shows it as planner input with who entered it and when, and drops it once the supplier sends a new stock update.',

  // ── the hub's rule values (BL-32) ────────────────────────────────────
  'processFlows.purpose.entity.hubSetting':
    'One value a hub rule compares against: a tolerance, a deadline, an alert threshold or a stale period. It decides what is accepted without a person looking, so it is changed only by the hub administrator and every change is on record.',
  'processFlows.purpose.t_setting_set':
    'The hub administrator changes one rule value, or sets it back to its default. A value that is negative, out of range, or that would put a band out of order is refused, and the rules read the new value the next time they run.',
  'processFlows.purpose.entity.reasonCode':
    'One code on a reason list a supplier chooses from — why a purchase order line is adjusted or rejected, or why a commitment or capacity is below what was asked. A code is never deleted, so an old answer keeps its label.',
  'processFlows.purpose.t_reasoncode_set':
    'The hub administrator adds a reason code, renames it in English and Indonesian, retires it, or offers it again. A retired code is no longer offered on a new answer but still reads on the answers that carry it.',

  // ── maximum stock (REQ-E06-04) ───────────────────────────────────────
  'processFlows.purpose.entity.maxStock':
    'The most a supplier may hold for PTI of one material, agreed with the supplier. It is shown on the feedstock reconcile.',
  'processFlows.purpose.t_maxstock_set':
    'Procurement sets, changes or clears the maximum stock of one supplier and material. Every change is kept with the value before it, so the maximum that stood at any time can be read back.',

  // ── supplierApplication ──────────────────────────────────────────────
  'processFlows.purpose.entity.supplierApplication':
    'The record that a company has asked to supply Paragon, who is handling it, and what was decided. Without it a company could finish the sign-up form and be handed a reference number that nothing anywhere stood behind.',
  'processFlows.purpose.t_application_submit':
    'Paragon writes down that a company has asked to supply it — who they are, which kind of request this is, and which papers they say they hold. From here the reference the applicant is given names a real row, which is the whole reason this step exists.',
  'processFlows.purpose.t_application_start_review':
    'Somebody takes the file off the pile and puts their name to it, so the queue can tell the applications nobody has opened yet from the ones already being worked.',
  'processFlows.purpose.t_application_approve':
    'Paragon accepts the applicant. What this records is the decision and nothing else — the vendor master record is raised in S/4HANA, which owns supplier identity.',
  'processFlows.purpose.t_application_reject':
    'Paragon declines, and must say why in words somebody can repeat to the applicant. The applicant holds no seat here, so that text is the only account of the decision that will ever exist.',

  // ── receiptDiscrepancy ───────────────────────────────────────────────
  'processFlows.purpose.entity.receiptDiscrepancy':
    'The conversation about a delivery that did not arrive as announced, or that failed inspection in part. It lets both sides agree on the quantity before the bill is written, instead of arguing about it afterwards.',
  'processFlows.purpose.t_receiptdiscrepancy_acknowledge':
    'The supplier agrees with what Paragon counted and says so in its own words. The difference stands, and the bill will follow the quantity Paragon accepted.',
  'processFlows.purpose.t_receiptdiscrepancy_dispute':
    'The supplier does not agree with what Paragon counted and explains why, so the planner can check it while the delivery is still fresh.',
  'processFlows.purpose.t_receiptdiscrepancy_resolve':
    'The planner closes the disagreement and writes down how it was settled, so neither side has to reopen it when the bill arrives.',
  // ── callOff ─────────────────────────────────────────────────────────
  'processFlows.purpose.entity.callOff':
    'One delivery called off against an umbrella purchase order: how much, by when, and whether the supplier has committed to it. The hub keeps this record, because SAP only knows the umbrella order.',
  'processFlows.purpose.t_calloff_release':
    'The planner asks the supplier for one delivery under the umbrella order. It cannot ask for more than is left on the order, so the order is never overdrawn.',
  'processFlows.purpose.t_calloff_draft':
    'The planner lays out a call-off without sending it yet, often as one of a series spread over weeks or months, so the plan can be checked before the supplier sees it.',
  'processFlows.purpose.t_calloff_edit_draft':
    'The planner adjusts a planned call-off before sending it and says why, so the explanation for the change stays with the plan.',
  'processFlows.purpose.t_calloff_release_draft':
    'The planner sends a planned call-off to the supplier. The amount still has to fit in what is left on the umbrella order.',
  'processFlows.purpose.t_calloff_dismiss':
    'The planner drops a planned call-off that is no longer needed and records why, so nobody wonders later what happened to it.',
  'processFlows.purpose.t_calloff_change':
    'The planner changes a call-off the supplier already saw. Because the ask changed, the supplier has to confirm it again.',
  'processFlows.purpose.t_calloff_confirm':
    'The supplier commits to the delivery exactly as asked. From here the supplier can ship and send its notice.',
  'processFlows.purpose.t_calloff_confirm_new_date':
    'The supplier commits to the full amount on a different date. Any date change goes to the planner unless it is within the agreed tolerance.',
  'processFlows.purpose.t_calloff_confirm_changes':
    'The supplier commits to a different amount. A small increase on a forecast-based call-off, or any increase on a JIT one, is accepted; anything else goes to the planner.',
  'processFlows.purpose.t_calloff_confirm_partial':
    'The supplier splits the delivery into two, each with its own date and amount. Each part is measured on its own for on-time and in-full.',
  'processFlows.purpose.t_calloff_reject':
    'The supplier cannot deliver this call-off and says why, so the planner can find the goods another way.',
  'processFlows.purpose.t_calloff_approve':
    'The planner accepts an answer from the supplier that was outside tolerance. The date and amount the supplier gave become what delivery is measured against.',
  'processFlows.purpose.t_calloff_reject_confirmation':
    'The planner does not accept the confirmation from the supplier and explains why. The call-off goes back to the supplier to confirm again.',
  'processFlows.purpose.t_calloff_dispatch':
    'The supplier tells PTI the goods have left, with the expected arrival. It is the heads-up the planner needs; an ASN for the same call-off counts as one.',

  // ── inventory & capacity ────────────────────────────────────────────
  'processFlows.purpose.entity.stockAccess':
    'Whether a supplier may see PTI stock, and for which materials. Only selected suppliers see it, so commercial information stays protected.',
  'processFlows.purpose.t_stockaccess_grant':
    'The planner lets a supplier see PTI stock, for every material it supplies or only chosen ones, so the supplier can plan replenishment itself. The change is logged.',
  'processFlows.purpose.t_stockaccess_remove':
    'The planner stops a supplier seeing PTI stock. It takes effect the next time the supplier opens a page, and the change is logged.',
  'processFlows.purpose.entity.stockSync':
    'One attempt to pull stock figures straight from a connected supplier, kept whether it worked or not.',
  'processFlows.purpose.t_stocksync_run':
    'The planner pulls the latest stock figures from a connected supplier. If the supplier does not answer, the error and time are shown and the previous figures stay, marked out of date.',
  'processFlows.purpose.t_stocksync_pull':
    'A connected supplier pulls its own latest stock figures from its own records with the Sync button. If they do not answer, the error and time are shown and the previous figures stay, marked out of date.',
  'processFlows.purpose.t_stockaccess_change':
    'The planner changes which materials a supplier with access may see PTI stock for. The change is logged.',
  'processFlows.purpose.entity.capacitySubmission':
    'The capacity a supplier allocates to PTI per material group for each of the next 13 weekly periods.',
  'processFlows.purpose.t_capacity_submit':
    'The supplier states the capacity it allocates per week. A week below PTI demand needs a reason, so the planner sees the gap and why before it reaches the factory.',
  'processFlows.purpose.entity.inventoryAlert':
    'A warning that stock or capacity is heading for a shortage, with a risk class, so the planner acts before material is missing.',
  'processFlows.purpose.t_inventoryalert_close':
    'The planner closes an alert with a reason from the list, and a note when the reason is "Other". The same condition does not raise it again until it has cleared and come back.',
  'processFlows.purpose.entity.forecastVersion':
    'One version of PTI’s forecast for packaging (weekly) or raw material (monthly), with a zone per period. Every version is kept.',
  'processFlows.purpose.t_forecastversion_publish':
    'The planner publishes the next forecast version, on the cadence or as an emergency re-publication. Suppliers are asked to open it and commit.',
  'processFlows.purpose.t_forecastversion_reassign':
    'The planner moves part or all of one period’s shortfall from a supplier to one or more other suppliers of the material, a quantity each, and explains why. Suppliers receive it as a new version.',
  'processFlows.purpose.entity.forecastView':
    'The moment a supplier first opened a forecast version, so the planner sees who has seen the plan.',
  'processFlows.purpose.t_forecastview_record':
    'Opening a forecast version records that the supplier has seen it.',

  'processFlows.purpose.entity.sapChangeMark':
    'The record that a Material Planner took a proposed change to an open purchase order into SAP. The hub never changes a purchase order itself, so this is how the reschedule report knows which of its proposals were acted on.',
  'processFlows.purpose.t_sapchange_mark':
    'The Material Planner marks a proposal to move, reduce or cancel part of a purchase order as taken to SAP, with the change and the time. It is refused while the forecast engine runs on simulated data, because a change made in SAP reaches the supplier.',
  'processFlows.purpose.entity.forecastOverride':
    'A Material Planning team member’s change to one week of one product’s demand forecast, with the old and new value, the reason, who and when. The latest change of a week is the one in force; the forecast bias page measures whether changes of each kind made the forecast better or worse.',
  'processFlows.purpose.t_forecastoverride_record':
    'The Material Planning team overrides the demand forecast for one product and week. Raising it above the engine’s forecast needs a reason code. It does not change material planning, which still runs on SAP’s plan.',
  'processFlows.purpose.entity.warehouseDecision':
    'The Material Planner’s decision for a week that does not fit the warehouse even with the most rented space: rent space, push out orders, reduce orders, or accept the overflow. It records the plan version it was made against. The latest decision of a week is the one in force; earlier ones stay on record.',
  'processFlows.purpose.t_warehousedecision_record':
    'The Material Planner records how a week that does not fit the warehouse will be handled. Accepting the overflow needs a note. The decision is a record of intent: it changes no order and is never sent to SAP or a supplier.',
  'processFlows.purpose.entity.demandAnticipation':
    'A publication of the demand anticipation of one planning week, per supplier and material, over the lead time: each week’s LTP plus any remainder carried into it, with the safety order in the first week. Each figure keeps its inputs and the rules version that made it. A later publication of the same week supersedes it; every publication stays on record.',
  'processFlows.purpose.t_demandanticipation_publish':
    'The Material Planner records the current planning week’s demand anticipation, and any supplier’s agreement to take a remainder in the first week after the horizon. The next week’s publication rolls forward from it. Nothing is sent to SAP or a supplier.',
  'processFlows.purpose.entity.consumption':
    'How much of a material PTI used in one Monday-to-Sunday period, typed in or uploaded by the Material Planner until the SAP goods-issue feed exists. A later entry for the same material and period replaces the earlier one; both are kept.',
  'processFlows.purpose.t_consumption_record':
    'The Material Planner enters how much of a material was used in one Monday-to-Sunday period. It shows beside the demand anticipation and feeds the moving average of use. Nothing is sent to SAP or a supplier.',
  'processFlows.purpose.entity.osipLevel':
    'A material’s OSIP level, which picks the formula of its physical reorder point (ROP Fisik). A material nobody has set is at level 4. Every change keeps the level before it, who set it and when; the latest is in force.',
  'processFlows.purpose.t_osiplevel_set':
    'The Material Planner sets or confirms a material’s OSIP level, from 1 to 6. Confirming it closes the “Review ROP after first order” task. Nothing is sent to SAP or a supplier.',
  'processFlows.purpose.entity.osipParam':
    'An OSIP value the Material Planner set for one material (service-level factor Z, fixed safety days g), one supplier (replenishment cycle f, pull agreement) or one supplier and material (bottleneck production lead time). With none set, the default applies. Every change keeps the value before it, who set it and when; the latest is in force.',
  'processFlows.purpose.t_osipparam_set':
    'The Material Planner sets or resets one OSIP value. The reorder points, the call-off need date and the confirmation cadence follow it. Nothing is sent to SAP or a supplier.',
  'processFlows.purpose.entity.capacityMonth':
    'A supplier’s capacity stated month by month beyond the 13 weekly buckets, for one planning group. A changed entry is a new submission; the latest that states a month is in force.',
  'processFlows.purpose.t_capacitymonth_submit':
    'The supplier states its capacity for a planning group month by month, where the weekly entry does not reach. The capacity heads-up reads it. Nothing is sent to SAP.',
  'processFlows.purpose.entity.ltpInput':
    'An LTP quantity the Material Planner uploaded for one material (LTP A, LTP Festive or LTP B, a quantity per week, with the file it came from) or the LTP choice for that material. Nothing is edited or deleted; the latest of each is in force.',
  'processFlows.purpose.t_ltpinput_set':
    'The Material Planner uploads LTP A, LTP Festive or LTP B for a material, or records which of them the demand anticipation uses. The hub never picks the LTP. Nothing is sent to SAP or a supplier.',
  'processFlows.purpose.entity.promotion':
    'The expected increase the Material Planner entered for one SKU in one week of a campaign, as a percentage or a number of units. A change or a withdrawal is a new entry; nothing is edited or deleted, so the history stays.',
  'processFlows.purpose.t_promotion_set':
    'The Material Planner enters, changes or withdraws the expected increase for one SKU and week of a campaign. The demand forecast adds it to that week for that SKU only and marks the week. Nothing is sent to SAP or a supplier.',
  'processFlows.purpose.entity.whatIfScenario':
    'A what-if scenario the Material Planner kept for one supplier and material: the figures it was run on, its rule choices and the rules version in force at the time. Nothing is edited or deleted; keeping other numbers makes a new scenario.',
  'processFlows.purpose.t_whatifscenario_save':
    'The Material Planner keeps a what-if scenario under a title, to compare it with the current plan later. Analysis only: nothing changes the plan or reaches suppliers or SAP.',
  'processFlows.purpose.entity.feedstockConfirmation':
    'A supplier’s confirmation of its current feedstock for one material: the quantity in the material’s unit, the day the figure holds for, and an optional note. Feedstock is not stock until it is produced, so it never adds to the supplier’s stock on hand. A newer confirmation replaces the earlier one; every confirmation stays on record.',
  'processFlows.purpose.t_feedstock_confirm':
    'The supplier confirms its current feedstock for an assigned material, weekly with the stock update. PTI sees it as its own line beside the supplier stock. Nothing is sent to SAP.',
  'processFlows.purpose.entity.supplierAsk':
    'PTI asks one supplier about one material, or about one planning group and week, with an optional due date. The ask shows on the supplier’s To do and Stock page and the supplier replies in the hub. Every step stays on record; nothing is sent by email.',
  'processFlows.purpose.t_supplierask_raise':
    'The planner asks a supplier about a material it supplies, or about a capacity planning group and week. A subject can have only one ask waiting at a time. Nothing is sent to SAP.',
  'processFlows.purpose.t_supplierask_answer':
    'The supplier replies to PTI’s ask in the hub, with an optional date. Only the supplier the ask names can reply.',
  'processFlows.purpose.t_supplierask_close':
    'The planner has read the supplier’s reply and ends the ask. The ask and the reply stay on record.',
  'processFlows.purpose.t_supplierask_withdraw':
    'The planner takes back an ask the supplier has not replied to yet, because PTI no longer needs it.',
  'processFlows.purpose.entity.poOnHoldDecision':
    'What happens to a PO On Hold line, the open PO quantity the demand anticipation does not absorb. The planner suggests feedstock only, feedstock and spread, or finished goods; the supplier makes the final choice. Both steps stay on record.',
  'processFlows.purpose.t_poonhold_suggest':
    'The planner suggests what to do with a PO On Hold line. The supplier sees the suggestion and can choose differently until the grace period ends.',
  'processFlows.purpose.t_poonhold_choose':
    'The supplier makes the final choice for its PO On Hold line. The choice cannot be changed. If the supplier does not choose, the planner’s suggestion applies at the end of the grace period.',
  'processFlows.purpose.entity.capacityDecision':
    'PTI’s decision on a capacity gap: the planner agrees to use the additional capacity a supplier offered for one planning group in one period of the capacity plan. The supplier sees PTI’s answer on its Capacity page. The planner can undo an acceptance; it stays on record.',
  'processFlows.purpose.t_capacitydecision_accept':
    'The planner agrees to use the supplier’s additional capacity where the LTP is above capacity but within capacity plus additional capacity. A period above that cannot be taken up. Nothing is sent to SAP.',
  'processFlows.purpose.t_capacitydecision_withdraw':
    'The planner takes back an acceptance. That period counts toward the capacity alert again, and the acceptance stays on record.',

  // ── RFx management (REQ-E03-02 / REQ-E03-04 / REQ-E03-05) ─────────────────
  'processFlows.purpose.entity.rfiEvent':
    'A structured set of questions about what a supplier can make, where, and how — asked before anybody talks about price.',
  'processFlows.purpose.t_rfi_create':
    'Buying starts from the question set Procurement keeps for the category, then adds or removes questions for this one event.',
  'processFlows.purpose.t_rfi_publish':
    'The questions reach the invited suppliers. Until this happens they are still being prepared and nobody outside PTI sees them.',
  'processFlows.purpose.t_rfi_revise_draft':
    'Buying reopens a request it has not sent yet and changes any part of it: questions, invitees, dates, files. Suppliers still see none of it, and every edit is recorded with who made it and when.',
  'processFlows.purpose.t_rfi_extend':
    'Buying gives every invited supplier — or only the ones it names — more time to answer.',
  'processFlows.purpose.t_rfi_close':
    'The answering window ends, and buying compares what came in.',
  'processFlows.purpose.t_rfi_cancel':
    'PTI drops the request, so suppliers stop spending time on it.',
  'processFlows.purpose.t_rfq_revise_draft':
    'Buying reopens a price request it has not sent yet and changes any part of it: items, quantity breaks, invitees, dates. Suppliers still see none of it, and every edit is recorded with who made it and when.',
  'processFlows.purpose.t_rfq_extend':
    'Buying gives every invited supplier — or only the ones it names — more time to price the work.',
  'processFlows.purpose.t_quotation_revise':
    'A supplier asked to improve what it offered sends a better one. The earlier version is kept, so buying can see exactly how far it moved.',
  'processFlows.purpose.entity.rfiResponse':
    'What one supplier says about its capability, experience, sites and products — kept against that supplier so a later price request can reuse it.',
  'processFlows.purpose.t_rfiresponse_save':
    'A half-finished answer is kept for the supplier to come back to, and PTI cannot see it yet.',
  'processFlows.purpose.t_rfiresponse_submit':
    'The supplier sends its answers to PTI. Every question marked as needed has to be answered first, so what arrives is comparable.',
  'processFlows.purpose.t_rfiresponse_revise':
    'The supplier corrects answers it already sent, up to the deadline. Each sent version is kept, so PTI reads the latest and can still see what came before.',
  'processFlows.purpose.entity.rfpEvent':
    'A request for the commercial terms a supplier will trade on — payment, delivery, service level and contract — rather than a unit figure alone.',
  'processFlows.purpose.t_rfp_create':
    'Buying picks the terms it needs answered from the standard list and states what PTI is asking for on each one.',
  'processFlows.purpose.t_rfp_publish':
    'The terms reach the invited suppliers, and only then can a proposal arrive.',
  'processFlows.purpose.t_rfp_revise_draft':
    'Buying reopens a proposal request it has not sent yet and changes any part of it: terms, options, invitees, dates. Suppliers still see none of it, and every edit is recorded with who made it and when.',
  'processFlows.purpose.t_rfp_extend':
    'Buying gives every invited supplier — or only the ones it names — more time to propose.',
  'processFlows.purpose.t_rfp_close':
    'The proposing window ends, and buying compares the terms side by side.',
  'processFlows.purpose.t_rfp_cancel':
    'PTI drops the request, so suppliers stop spending time on it.',
  'processFlows.purpose.t_rfp_award':
    'Buying awards the proposal option by option on the firm offers, with a reason. Each responder learns its own outcome, and the PO or contract is raised in SAP.',
  'processFlows.purpose.t_rfp_award_partial':
    'Buying awards the options that are ready on their firm offers and comes back for the rest. Nobody is turned down yet.',
  'processFlows.purpose.t_rfp_award_cancel':
    'Buying withdraws an RFP award, with a reason, before it is raised in SAP. The award stays on record and its options can be decided again.',
  'processFlows.purpose.t_rfp_award_cancel_partial':
    'Buying withdraws one RFP award while others stand. Its options reopen and every step stays on record.',
  'processFlows.purpose.t_rfp_award_sap_raised':
    'Records that an RFP award was raised in SAP, with the SAP document number. From here changes are made in SAP.',
  'processFlows.purpose.entity.rfpResponse':
    'One supplier’s proposed terms: what it offers on each point PTI raised, whether it will match it, and why where it will not.',
  'processFlows.purpose.t_rfpresponse_save':
    'A partly filled proposal is kept for the supplier to come back to, and PTI cannot see it yet.',
  'processFlows.purpose.t_rfpresponse_submit':
    'The supplier sends its terms to PTI. Anything it will not match has to carry an explanation, so a departure is never silent.',
  'processFlows.purpose.t_rfpresponse_revise':
    'The supplier corrects a proposal it already sent, up to the deadline, with the same checks as the first send. Each sent version and its files are kept, so PTI reads the latest and can still see the earlier ones.',
  'processFlows.purpose.entity.rfiIntent':
    'Whether an invited supplier will answer an information request at all, and if not, why — so a silent supplier and one that said no are not the same row.',
  'processFlows.purpose.t_rfiintent_respond':
    'The supplier says it will answer the information request.',
  'processFlows.purpose.t_rfiintent_decline':
    'The supplier says it will not answer, picks why from the list and explains in its own words. Buying reads both.',
  'processFlows.purpose.t_rfiintent_withdraw':
    'A supplier that said it would answer changes its mind before sending, picks why from the list and explains in its own words. When it first said yes stays on record.',
  'processFlows.purpose.entity.rfpIntent':
    'Whether an invited supplier will send a proposal at all, and if not, why — so a silent supplier and one that said no are not the same row.',
  'processFlows.purpose.t_rfpintent_respond': 'The supplier says it will send a proposal.',
  'processFlows.purpose.t_rfpintent_decline':
    'The supplier says it will not send a proposal, picks why from the list and explains in its own words. Buying reads both.',
  'processFlows.purpose.t_rfpintent_withdraw':
    'A supplier that said it would send a proposal changes its mind before sending, picks why from the list and explains in its own words. When it first said yes stays on record.',
  'processFlows.purpose.entity.negotiationRound':
    'A round of asking a shortlist to improve what they offered, with a date to answer by and an optional target.',
  'processFlows.purpose.t_negotiationround_open':
    'Buying asks the suppliers it shortlisted to improve what they offered, with a date to answer by and an optional message and target figure. Nobody else may answer.',
  'processFlows.purpose.t_negotiationround_close':
    'Buying stops taking improved offers for this round. A supplier that said nothing keeps what it offered before.',
  'processFlows.purpose.entity.rfpOfferRound':
    'A round of asking shortlisted RFP suppliers for firm prices on the options buying chose, at set quantities, with a date to answer by.',
  'processFlows.purpose.t_rfp_round_open':
    'After the proposals are in, buying asks the suppliers that answered and pass the compliance check for firm prices on chosen options and quantities. Nobody else may answer.',
  'processFlows.purpose.t_rfp_round_close':
    'Buying stops taking firm offers for this round. Offers already sent stay on record.',
  'processFlows.purpose.entity.rfpFirmOffer':
    'One supplier’s firm offer in a round: what it will charge per option and quantity, and the date it holds that until. Every version it sent is kept.',
  'processFlows.purpose.t_rfpfirmoffer_submit':
    'The supplier commits to what it will charge for the options and quantities asked, until a date no earlier than the round deadline.',
  'processFlows.purpose.t_rfpfirmoffer_revise':
    'The supplier changes its firm offer before the round closes. The earlier version is kept and the new one counts.'
};

/** @type {Record<string, string>} */
export const processFlowPurposeId = {
  // ── purchaseOrder ──────────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseOrder':
    'Komitmen Paragon untuk membeli — apa yang dipesan, dengan harga berapa, untuk kapan. Setiap pengiriman, penerimaan, dan tagihan di hilir bergantung pada satu dokumen ini.',
  'processFlows.purpose.t_po_issue':
    'Pembelian menjadikan keputusannya mengikat. Sebelum dokumen ini ada, pemasok tidak punya dasar yang aman untuk mulai berproduksi.',
  'processFlows.purpose.t_po_view':
    'Memberi tahu pembeli bahwa pesanan sampai ke seseorang, bukan sekadar ke kotak masuk — titik pertama saat diamnya pemasok mulai berarti sesuatu.',
  'processFlows.purpose.t_po_acknowledge':
    'Pemasok menyatakan pesanan sudah diterima dan sedang ditelaah, tanpa mengikat diri pada angkanya. Berguna ketika jawaban sungguhan butuh berhari-hari.',
  'processFlows.purpose.t_po_confirm':
    'Pemasok berkomitmen pada jumlah tiap baris yang benar-benar akan dikirim. Inilah janji yang dipakai pabrik untuk merencanakan produksi, dan angka pembanding bagi setiap kekurangan di kemudian hari.',
  'processFlows.purpose.t_po_adjust':
    'Pemasok tidak dapat memenuhi pesanan seperti tertulis dan menyatakan yang bisa dipenuhi: jumlah dan tanggal per baris, dengan alasan. Planner tahu lebih awal, dan alasannya menjadi data penilaian pemasok.',
  'processFlows.purpose.t_po_reject':
    'Pemasok sama sekali tidak dapat memenuhi tanggal, jumlah, atau mutu. Menyampaikannya tepat waktu membuat planner bisa mencari pasokan lain, dan penolakan dihitung dalam kinerja pemasok.',
  'processFlows.purpose.t_po_accept_counter':
    'Planner menyetujui penawaran balik pemasok, sehingga pesanan berlaku dengan jumlah dan tanggal baru dan pemasok dapat merencanakan pengiriman.',
  'processFlows.purpose.t_po_reject_counter':
    'Planner tidak dapat menerima penawaran balik dan menyebutkan alasannya. Pesanan kembali ke pemasok untuk jawaban baru.',
  'processFlows.purpose.t_po_shipping_notice':
    'Pemasok menyatakan kapan pengiriman pesanan terkonfirmasi akan selesai, dan memperbaruinya bila bergeser. Planner melihat apakah pesanan masih aman.',
  'processFlows.purpose.t_po_partial_deliver':
    'Sebagian pesanan sudah tiba secara fisik. Perlu dicatat karena pesanan yang baru terpenuhi sebagian masih menyisakan kewajiban, dan sisa itulah yang dikejar tim pembelian.',
  'processFlows.purpose.t_po_deliver':
    'Seluruh pesanan sudah tiba secara fisik. Pembelian berhenti mengejar dan keuangan mulai menunggu tagihan.',
  'processFlows.purpose.t_po_close':
    'Pesanan ini selesai — sudah diterima, ditagih, dan dibayar — dan tidak lagi muncul dalam daftar pekerjaan siapa pun.',

  // ── advanceShipNotice ──────────────────────────────────────────────────────
  'processFlows.purpose.entity.advanceShipNotice':
    'Pemberitahuan awal dari pemasok bahwa barang sedang dalam perjalanan, beserta isinya. Inilah yang memungkinkan gudang menjadwalkan waktu bongkar, bukan mendadak menemukan truk di depan pintu.',
  'processFlows.purpose.t_asn_create':
    'Pemasok mulai memberi tahu Paragon apa yang akan dikirimnya, selagi rinciannya masih bisa mereka ubah.',
  'processFlows.purpose.t_asn_submit':
    'Menyerahkan rincian pengapalan ke gudang Paragon: siapa yang membawa, bagaimana menelusurinya, dan kapan harus ditunggu.',
  'processFlows.purpose.t_asn_cancel':
    'Pemasok menarik pemberitahuan sebelum barang apa pun tiba, sehingga gudang berhenti menunggu barang itu dan kuantitasnya bisa dikirim lagi.',
  'processFlows.purpose.t_asn_in_transit':
    'Barang sudah meninggalkan pemasok. Sejak titik ini tanggal kedatangan menjadi urusan logistik, bukan lagi urusan produksi.',
  'processFlows.purpose.t_asn_deliver':
    'Barang sampai di Paragon. Pemberitahuan ini berhenti menjadi perkiraan dan menjadi acuan yang bisa dicocokkan tim penerimaan.',
  'processFlows.purpose.t_asn_discrepancy':
    'Yang datang tidak sesuai dengan yang diberitahukan. Ini mengikuti temuan tim penerimaan, dan menjadi tanda bagi pemasok bahwa ada yang harus dijelaskan.',
  'processFlows.purpose.t_asn_resolve_discrepancy':
    'Ketidaksesuaiannya sudah dibicarakan dan dituntaskan, sehingga pemberitahuan ini tidak lagi menumpuk sebagai perkara terbuka.',
  'processFlows.purpose.t_asn_request_exception':
    'Barang akan tiba dengan sisa umur simpan lebih pendek dari yang diterima Paragon. Pemasok menjelaskan mengapa barang tetap perlu dikirim dan meminta Mutu memutuskan sebelum apa pun dikirim.',
  'processFlows.purpose.t_asn_approve_exception':
    'Mutu menerima barang yang umur simpannya pendek. Pemberitahuan diteruskan ke gudang, dan barang diterima ke stok terblokir.',
  'processFlows.purpose.t_asn_reject_exception':
    'Mutu menolak barang yang umur simpannya pendek dan menyebutkan alasannya. Pemberitahuan kembali ke pemasok untuk diperbaiki.',
  'processFlows.purpose.t_asn_change_eta':
    'Pemasok memundurkan tanggal tiba melewati tanggal yang disetujui Mutu, sehingga sisa umur simpan saat tiba lebih pendek dan Mutu memutuskan lagi.',

  // ── goodsReceipt ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceipt':
    'Catatan Paragon tentang apa yang benar-benar datang dan apakah layak dipakai. Inilah fakta yang menjadi dasar pembayaran keuangan, sehingga kekeliruan di sini akan berubah menjadi perselisihan tagihan di kemudian hari.',
  'processFlows.purpose.t_gr_create':
    'Membuka catatan penerimaan untuk kiriman yang sudah sampai di dermaga, agar barangnya tercatat sebelum ada yang menyentuhnya.',
  'processFlows.purpose.t_gr_start_inspection':
    'Tim mutu mengambil alih kiriman dan mulai memeriksanya. Sejak titik ini ada orang yang memikul keputusannya.',
  'processFlows.purpose.t_gr_hold':
    'Ada yang tampak tidak beres, sehingga barangnya dibekukan alih-alih diterima atau ditolak. Alasan yang ditulis di sini adalah yang nanti ditanyakan kepada pemasok.',
  'processFlows.purpose.t_gr_request_retest':
    'Masalah yang membekukan barang sudah ditangani — periksa ulang. Tanpa ini, stok yang dibekukan tidak punya jalan kembali untuk dipakai.',
  'processFlows.purpose.t_gr_approve':
    'Tim mutu menerima seluruh kiriman. Pemasok mendapat penilaian bersih untuk kiriman itu dan barangnya boleh dipakai.',
  'processFlows.purpose.t_gr_partial_approve':
    'Sebagian kiriman layak pakai dan sebagian tidak. Paragon menyimpan yang bisa dipakai, sisanya menjadi klaim terhadap pemasok.',
  'processFlows.purpose.t_gr_reject':
    'Tidak ada bagian kiriman yang layak pakai. Alasan yang ditulis di sini menjadi dasar perundingan pemasok dan pembelian, sekaligus menahan pembayaran untuk seluruh lot.',
  'processFlows.purpose.t_gr_post':
    'Menyerahkan penerimaan ini ke SAP agar stoknya ada di pembukuan dan bisa dipakai pabrik. Tidak ada yang benar-benar diterima sebelum SAP menyatakannya.',

  // ── goodsReceiptLine ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceiptLine':
    'Putusan per barang di balik hasil keseluruhan sebuah kiriman. Mutu kiriman hanya sebaik barang terburuknya, dan di sinilah hal itu diputuskan.',
  'processFlows.purpose.t_grline_inspect':
    'Seseorang memeriksa satu barang secara fisik — kondisi dan kemasannya — lalu menuliskan apa yang dilihatnya.',
  'processFlows.purpose.t_grline_accept':
    'Barang ini layak pakai. Ia menambah bobot agar kirimannya bisa diloloskan secara utuh.',
  'processFlows.purpose.t_grline_reject':
    'Barang ini tidak layak pakai, disertai alasannya. Satu barang seperti ini sudah cukup membuat kirimannya tidak bisa diloloskan seluruhnya.',
  'processFlows.purpose.t_grline_quarantine':
    'Barangnya disisihkan sampai ada yang memutuskan — belum boleh dipakai, belum juga ditolak. Ini menjaga stok yang meragukan tetap jauh dari produksi.',
  'processFlows.purpose.t_grline_release':
    'Pemeriksaan kedua menyelesaikan keraguan itu dengan hasil yang menguntungkan, sehingga barangnya berhenti ditahan dan bergabung dengan stok yang boleh dipakai pabrik.',
  'processFlows.purpose.t_grline_return':
    'Barangnya dikembalikan ke pemasok alih-alih dibuang atau disimpan, sehingga tanggung jawab atas masalahnya ikut kembali.',

  // ── invoice ────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoice':
    'Klaim pemasok untuk dibayar, dan keputusan Paragon atasnya. Satu dokumen per klaim, dari sisi mana pun ia dilihat.',
  'processFlows.purpose.t_invoice_create':
    'Pemasok mulai menyusun tagihan atas pesanan yang telah dipenuhinya, selagi angkanya masih bisa mereka perbaiki.',
  'processFlows.purpose.t_invoice_submit':
    'Pemasok resmi meminta pembayaran. Hitungan tempo pembayaran mulai berjalan dari sini.',
  'processFlows.purpose.t_invoice_match':
    'Paragon mencocokkan tagihan dengan apa yang dipesan dan apa yang diterima. Tagihan yang gagal di pemeriksaan ini bukan tagihan yang bisa dibayar siapa pun.',
  'processFlows.purpose.t_invoice_approve':
    'Keuangan menyetujui bahwa klaimnya memang terutang. Keputusan untuk membayar diambil di sini; uangnya berpindah kemudian.',
  'processFlows.purpose.t_invoice_release_payment':
    'Mengirim instruksi pembayaran ke SAP. Sebelum SAP mengonfirmasi, jangan ada yang memberi tahu pemasok bahwa mereka sudah dibayar.',
  'processFlows.purpose.t_invoice_remit':
    'Pemasok mengakui penerimaan uang beserta nota yang menyertainya. Klaim ini selesai.',
  'processFlows.purpose.t_invoice_dispute':
    'Paragon tidak menerima klaim itu apa adanya, dan menyatakan alasannya. Ini menghentikan hitungan pembayaran dan mengembalikan bola ke pemasok.',
  'processFlows.purpose.t_invoice_resubmit':
    'Pemasok memperbaiki apa yang dikembalikan Finance dan kembali meminta pembayaran. Tagihan diperiksa ulang dari awal, seolah-olah baru.',
  'processFlows.purpose.t_invoice_resolve':
    'Perselisihannya sudah dituntaskan dan klaimnya dikembalikan untuk diperiksa. Tanpa ini, tagihan yang dipersoalkan tidak punya jalan ke mana pun.',

  // ── invoiceMatch ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoiceMatch':
    'Pemeriksaan tiga arah di balik sebuah tagihan: apa yang dipesan, apa yang datang, dan berapa yang ditagihkan. Inilah sebabnya tagihan yang keliru tertangkap sebelum uang berpindah, bukan sesudahnya.',
  'processFlows.purpose.t_invmatch_await_gr':
    'Tagihannya belum bisa diperiksa sebelum barangnya tercatat masuk. Ini adalah masa tunggu, ditampilkan terang-terangan alih-alih tampak seperti mandek.',
  'processFlows.purpose.t_invmatch_matched':
    'Pesanan, penerimaan, dan tagihan sudah sejalan. Tidak ada lagi yang menghalangi pembayaran.',
  'processFlows.purpose.t_invmatch_qty_variance':
    'Pemasok menagih lebih banyak daripada yang bisa dibuktikan diterima Paragon. Seseorang harus memastikan hitungan mana yang benar.',
  'processFlows.purpose.t_invmatch_price_variance':
    'Harga satuan pada tagihan berada di atas kesepakatan, melampaui toleransi yang diizinkan. Percakapan itu milik pembelian, bukan keuangan.',

  // ── rfq ────────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.rfq':
    'Sebuah acara pengadaan: Paragon meminta penawaran dari beberapa pemasok atas kebutuhan yang sama, agar perbandingannya setara.',
  'processFlows.purpose.t_rfq_create':
    'Pembelian mulai menyusun permintaan — apa yang dibutuhkan, dalam kategori apa, sebanyak apa — selagi masih bersifat internal.',
  'processFlows.purpose.t_rfq_publish':
    'Menyodorkan permintaan itu kepada para pemasok yang diundang. Sebelum ini tidak ada yang terlihat oleh mereka, jadi inilah saat pengadaan benar-benar dimulai.',
  'processFlows.purpose.t_rfq_close':
    'Jendela tanggapan berakhir. Penawaran yang terlambat tidak ikut dibandingkan, dan itulah yang membuat perbandingannya adil bagi semua yang menjawab tepat waktu.',
  'processFlows.purpose.t_rfq_award':
    'Pembelian memilih penawaran pemenang dan mencatat alasannya. Semua yang ikut menawar tahu posisinya, lewat satu tindakan, bukan lewat kabar burung.',
  'processFlows.purpose.t_rfq_award_partial':
    'Pembelian menetapkan item yang sudah siap dan kembali untuk sisanya nanti. Belum ada yang ditolak, karena pemasok masih bisa memenangkan item yang belum diputuskan.',
  'processFlows.purpose.t_rfq_award_cancel':
    'Pembelian menarik sebuah penetapan pemenang, dengan alasan, sebelum dibuat di SAP. Catatannya tetap tersimpan, event terbuka untuk penetapan baru, dan penawaran yang diputuskannya kembali dievaluasi.',
  'processFlows.purpose.t_rfq_award_cancel_partial':
    'Pembelian menarik satu penetapan pemenang sementara yang lain tetap berlaku. Itemnya dibuka kembali, penetapan lain tidak tersentuh, dan setiap langkah tetap tercatat.',
  'processFlows.purpose.t_rfq_award_sap_raised':
    'Mencatat bahwa penetapan pemenang sudah dibuat di SAP, beserta nomor dokumen SAP-nya. Sejak itu perubahan dilakukan di SAP, bukan dengan membatalkan di hub.',
  'processFlows.purpose.t_rfq_fx_pin':
    'Mencatat dasar kurs yang dipakai membandingkan penawaran bermata uang asing, agar keputusan hari ini masih bisa dijelaskan setahun kemudian.',
  'processFlows.purpose.t_rfq_cancel':
    'Pembelian membatalkan acaranya sebelum memilih siapa pun — kebutuhannya berubah, atau anggarannya hilang. Para pemasok diberi tahu, bukan dibiarkan menunggu.',
  'processFlows.purpose.t_rfq_reopen':
    'Membuka kembali acara yang sudah berakhir untuk tanggapan tambahan — jawabannya terlalu sedikit, atau kebutuhannya bergeser. Permintaan yang sama dipakai ulang alih-alih membuat yang baru.',

  // ── Respons RFQ: niat, kerahasiaan, klarifikasi ──────────────────────────
  'processFlows.purpose.entity.rfqIntent':
    'Apakah pemasok yang diundang akan menjawab permintaan harga, dan jika tidak, mengapa — sehingga pemasok yang diam dan yang menolak tidak tampil sebagai baris yang sama.',
  'processFlows.purpose.t_rfqintent_respond': 'Pemasok menyatakan akan mengirim penawaran.',
  'processFlows.purpose.t_rfqintent_decline':
    'Pemasok menyatakan tidak akan menawar, memilih alasan dari daftar dan menjelaskannya dengan kata-katanya sendiri. Pembelian membaca keduanya.',
  'processFlows.purpose.t_rfqintent_withdraw':
    'Pemasok yang tadinya akan menawar berubah pikiran, dengan alasan dan penjelasannya sendiri. Pernyataan pertamanya tetap tercatat.',
  'processFlows.purpose.entity.rfqConfidentiality':
    'Syarat kerahasiaan yang diterima pemasok sebelum boleh membaca spesifikasi, catatan, dan berkas permintaan yang rahasia.',
  'processFlows.purpose.t_rfqconfidentiality_accept':
    'Pemasok menerima syaratnya sekali, waktunya dicatat, dan isi yang disembunyikan terbuka baginya.',
  'processFlows.purpose.entity.rfqClarification':
    'Pertanyaan pemasok tentang permintaan harga selama masih terbuka, beserta jawaban pembelian.',
  'processFlows.purpose.t_rfqclarification_ask':
    'Pemasok yang diundang bertanya kepada pembelian apa maksud sesuatu dalam permintaan.',
  'processFlows.purpose.t_rfqclarification_answer':
    'Pembelian menjawab, hanya kepada pemasok yang bertanya atau kepada semua pemasok yang diundang tanpa menyebut siapa yang bertanya.',

  // ── quotation ──────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.quotation':
    'Penawaran seorang pemasok atas satu permintaan pengadaan — harga dan janji pengiriman yang siap mereka pertanggungjawabkan.',
  'processFlows.purpose.t_quotation_submit':
    'Pemasok mengajukan penawarannya: berapa biayanya, dalam mata uang apa, dan berapa lama pengirimannya. Ketiganya, karena harga tanpa tanggal tidak bisa dibandingkan.',
  'processFlows.purpose.t_quotation_review':
    'Pembelian membawa penawaran itu ke tahap penilaian. Ini memisahkan yang sudah dibaca dari yang masih menumpuk.',
  'processFlows.purpose.t_quotation_award':
    'Penawaran ini menang. Ia mengikuti keputusan pembelian atas permintaannya, dan tidak pernah dimasukkan satu per satu secara manual.',
  'processFlows.purpose.t_quotation_reject':
    'Penawaran ini tidak menang. Ia jatuh pada saat yang sama dengan yang menang, sehingga tak ada yang dibiarkan menerka dan tak seorang pun perlu dikabari satu per satu.',
  'processFlows.purpose.t_quotation_reinstate':
    'Penetapan pemenang yang menjadi dasar penawaran ini ditarik, sehingga penawaran kembali dievaluasi dan tidak lagi berstatus menang atau kalah.',

  // ── shipment ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.shipment':
    'Rute masuk sebagaimana dilihat logistik — satu perpindahan fisik yang dilacak dari gerbang pemasok sampai halaman Paragon.',
  'processFlows.purpose.t_shipment_create':
    'Membuka pelacakan untuk barang yang ditunggu Paragon, agar ada satu perpindahan masuk sebagai tempat menggantungkan tonggak-tonggaknya sebelum apa pun bergerak.',
  'processFlows.purpose.t_shipment_asn_received':
    'Pemberitahuan awal dari pemasok sudah masuk, dan perpindahan ini kini membawa rincian nyata — apa yang datang, dan kapan.',
  'processFlows.purpose.t_shipment_depart':
    'Barang sudah meninggalkan pemasok. Sejak titik ini, tanggal kedatangan ada di tangan pihak lain.',
  'processFlows.purpose.t_shipment_arrive_port':
    'Barang sampai di pelabuhan masuk. Untuk barang impor, di sinilah rentetan panjang urusan dokumen dimulai.',
  'processFlows.purpose.t_shipment_customs':
    'Barangnya berada di tangan otoritas perbatasan. Tidak ada tindakan Paragon yang bisa mempercepatnya, tetapi mengetahuinya membuat perencana berhenti mengejar pemasok.',
  'processFlows.purpose.t_shipment_dock':
    'Barangnya sudah di gerbang Paragon menunggu giliran bongkar. Keterlambatan sejak titik ini adalah milik Paragon sendiri.',
  'processFlows.purpose.t_shipment_unload':
    'Peti kemasnya sedang dikosongkan. Tim penerimaan bisa mulai menghitung.',
  'processFlows.purpose.t_shipment_deliver':
    'Barangnya sudah masuk secara fisik. Rute logistiknya berakhir dan catatan penerimaan mengambil alih.',

  // ── contract ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.contract':
    'Perjanjian tetap yang menjadi dasar pembelian dari seorang pemasok — harga, volume, dan syarat yang diwarisi setiap pesanan alih-alih dirundingkan ulang tiap kali.',
  'processFlows.purpose.t_contract_draft':
    'Pembelian mulai menyusun syarat bersama pemasok, sebelum ada yang mengikat kedua pihak.',
  'processFlows.purpose.t_contract_activate':
    'Syarat-syaratnya mulai berlaku. Pesanan yang diterbitkan sejak sekarang mewarisinya, jadi inilah saat harga hasil perundingan menjadi harga sungguhan.',
  'processFlows.purpose.t_contract_renew':
    'Perjanjiannya dilanjutkan untuk satu periode berikutnya. Dicatat sebagai tindakan tersendiri agar tak seorang pun perlu menebak apakah tanggal yang lewat itu kelalaian atau keputusan.',
  'processFlows.purpose.t_contract_terminate':
    'Perjanjiannya berakhir, pada masanya atau sebelum itu. Tidak ada lagi pembelian baru di bawahnya sejak titik ini, apa pun kata kalender.',

  // ── obligation ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.obligation':
    'Sebuah janji yang tertulis dalam perjanjian — volume, potongan, tingkat layanan — dilacak agar ada yang menyadari apakah janji itu benar-benar ditepati.',
  'processFlows.purpose.t_obligation_track':
    'Mulai mengawasi satu komitmen dari sebuah perjanjian, agar ia hidup di suatu tempat selain dokumen yang tak pernah dibaca ulang.',
  'processFlows.purpose.t_obligation_complete':
    'Komitmennya sudah dipenuhi. Dicatat karena janji yang tak ditepati hanya terlihat kalau yang ditepati ikut ditandai.',

  // ── purchaseRequisition ────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseRequisition':
    'Permintaan internal yang memulai segalanya: ada orang di pabrik yang butuh sesuatu dibeli, dan menyampaikannya di tempat yang bisa ditelaah dan dilacak.',
  'processFlows.purpose.t_pr_create':
    'Pemohon menuliskan apa yang dibutuhkan pabrik, agar kebutuhan itu masuk ke Paragon sebagai dokumen, bukan sebagai pesan yang bisa terlupakan.',
  'processFlows.purpose.t_pr_submit':
    'Mengirim permintaan itu untuk diputuskan. Sebelum ini terjadi, ia hanyalah catatan satu orang, bukan klaim atas anggaran.',
  'processFlows.purpose.t_pr_approve':
    'Pemegang anggaran menyetujui bahwa kebutuhannya nyata dan ada dananya. Tidak ada pengadaan atau pemesanan sebelum ini.',
  'processFlows.purpose.t_pr_reject':
    'Keputusannya tidak. Permintaannya berhenti di sini alih-alih menua diam-diam dalam antrean.',
  'processFlows.purpose.t_pr_revise':
    'Mengembalikan permintaan yang ditolak ke tangan pemohon disertai catatan tentang apa yang berubah, agar penelaah berikutnya melihat dokumen yang berbeda.',
  'processFlows.purpose.t_pr_source':
    'Kebutuhan ini ditawarkan ke beberapa pemasok sekaligus, bukan langsung ke satu yang sudah dikenal. Dicatat pada permintaannya agar pemohon bisa melihat ke mana kebutuhannya pergi.',
  'processFlows.purpose.t_pr_convert':
    'Kebutuhan itu sudah menjadi pesanan sungguhan. Inilah yang menutup lingkaran bagi siapa pun yang mengajukannya.',

  // ── supplierDocument ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.supplierDocument':
    'Dokumen yang wajib dipegang Paragon atas seorang pemasok — sertifikat, izin, rincian bank — dan posisi masing-masing.',
  'processFlows.purpose.t_supplierdoc_request':
    'Paragon meminta satu berkas tertentu dari pemasok, agar celahnya ada di daftar seseorang, bukan baru ketahuan saat audit.',
  'processFlows.purpose.t_supplierdoc_declare':
    'Pemasok menyatakan rincian sertifikat yang tidak diminta siapa pun — skema, nomor, penerbit, tanggal — sehingga sertifikat yang tidak Paragon ketahui pun tetap sampai ke pihak yang memeriksanya. Tidak ada berkas yang dikirim; yang dicatat adalah rinciannya.',
  'processFlows.purpose.t_supplierdoc_submit':
    'Pemasok menyatakan rincian atas apa yang diminta. Sejak titik ini keterlambatan ada di pihak Paragon, bukan pada mereka.',
  'processFlows.purpose.t_supplierdoc_verify':
    'Ada yang sudah memastikan berkasnya asli dan masih berlaku. Baru sekaranglah ia berarti sesuatu.',
  'processFlows.purpose.t_supplierdoc_reject':
    'Berkasnya tidak memenuhi kebutuhan — keliru, kedaluwarsa, atau tidak terbaca — dan pemasok diminta lagi.',

  // ── compliance ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.compliance':
    'Apakah seorang pemasok memegang sertifikat yang benar-benar dituntut oleh sebuah bahan — halal, BPOM, dan lainnya — serta posisi tiap persyaratan hari ini.',
  'processFlows.purpose.t_compliance_submit':
    'Pemasok menyerahkan sertifikat untuk persyaratan yang belum dipenuhinya. Hanya dengan cara inilah celah itu tertutup.',
  'processFlows.purpose.t_compliance_verify':
    'Sertifikatnya sudah diperiksa dan terbukti sah. Bahan yang tercakup olehnya boleh dibeli tanpa pengecualian.',
  'processFlows.purpose.t_compliance_reject':
    'Sertifikatnya tidak memenuhi persyaratan, sehingga persyaratan itu tertunggak lagi dan pemasok harus mencoba sekali lagi.',

  // ── requirementResponse ────────────────────────────────────────────────────
  'processFlows.purpose.entity.requirementResponse':
    'Jawaban pemasok atas satu baris ramalan yang diterbitkan: berapa banyak dari yang diminta Paragon yang benar-benar bisa dipasok, pada periode itu.',
  'processFlows.purpose.t_requirementresponse_submit':
    'Pemasok menghitung apa yang bisa dikomitmenkannya terhadap satu baris ramalan, selagi angkanya masih bisa mereka ubah.',
  'processFlows.purpose.t_requirementresponse_acknowledge':
    'Pemasok memastikan telah melihat sebuah baris yang tidak meminta komitmen apa pun. Diam dan “sudah dilihat” adalah dua fakta berbeda, dan perencanaan memakainya secara berbeda.',
  'processFlows.purpose.t_requirementresponse_promote':
    'Mengirim komitmen itu ke perencana Paragon. Sebelum ini tidak ada yang terlihat oleh perencanaan, jadi inilah tindakan yang membuat sebuah janji benar-benar menjadi janji.',
  'processFlows.purpose.t_requirementresponse_review':
    'Perencana membawa jawaban itu ke tahap penilaian alih-alih memakainya begitu saja.',
  'processFlows.purpose.t_requirementresponse_accept':
    'Perencana memakai komitmen itu sebagai angka untuk merencanakan. Perencanaan di hilir memperlakukannya sebagai nyata sejak titik ini.',
  'processFlows.purpose.t_requirementresponse_dispute':
    'Perencana tidak memakai jawaban itu — selisihnya terlalu besar, atau alasan yang diberikan tidak kuat — dan menyampaikannya kepada pemasok.',
  'processFlows.purpose.t_requirementresponse_resolve':
    'Perselisihannya sudah dibereskan dan jawabannya dikembalikan untuk diputuskan, alih-alih menggantung tanpa penyelesaian.',

  // ── inventoryDeclaration ───────────────────────────────────────────────────
  'processFlows.purpose.entity.inventoryDeclaration':
    'Apa yang dinyatakan pemasok sedang dipegangnya saat ini, untuk satu barang. Inilah angka yang dipakai Paragon untuk merencanakan ketika ia tidak bisa melihat stok pemasok sendiri.',
  'processFlows.purpose.t_inventorydeclaration_declare':
    'Pemasok menyatakan sendiri stok yang dipegangnya. Setiap pernyataan disimpan, sehingga apa yang disampaikan bulan lalu masih ada untuk dibandingkan.',
  'processFlows.purpose.t_inventorydeclaration_record':
    'Perencana mencatat stok yang dilaporkan pemasok lewat obrolan atau surel. Disimpan terpisah dari pernyataan pemasok sendiri, karena siapa yang mengatakannya jadi penting ketika angkanya ternyata keliru.',

  // ── incomingShipment ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.incomingShipment':
    'Satu rute pasokan yang dilaporkan pemasok kepada Paragon — barang menuju Paragon, atau barang yang berpindah antara prinsipal dan distributor yang menjadi sandaran pasokan Paragon sendiri.',
  'processFlows.purpose.t_incomingshipment_report':
    'Pemasok memberi tahu Paragon bahwa ada satu kiriman, apa isinya dan sebanyak apa. Beginilah keterlihatan pasokan dimulai tanpa menunggu barangnya datang.',
  'processFlows.purpose.t_incomingshipment_ship':
    'Rute ini sudah berangkat. Tanggal tibanya berhenti menjadi rencana dan berubah menjadi perkiraan perjalanan.',
  'processFlows.purpose.t_incomingshipment_arrive':
    'Rute ini sudah mendarat. Untuk rute penjaminan pasokan, di sinilah risiko Paragon mengendur.',
  'processFlows.purpose.t_incomingshipment_track':
    'Pemasok menambahkan tautan pelacakan kurir pada kiriman dari prinsipalnya, agar rute ini bisa diikuti tanpa perlu bertanya.',
  'processFlows.purpose.t_incomingshipment_cancel':
    'Rute ini dibatalkan di tengah jalan. Lebih baik dicatat daripada dibiarkan dalam rencana sebagai stok yang tak akan pernah datang.',

  // ── enforcement ────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.enforcement':
    'Seberapa keras tiap aturan menggigit — menghalangi, memperingatkan, atau sekadar mengamati — dicatat sebagai keputusan yang dibuat seseorang, bukan pengaturan tanpa pemilik.',
  'processFlows.purpose.t_enforcement_set':
    'Seseorang memutuskan seberapa ketat satu aturan diterapkan, dan namanya tercatat untuk itu. Melonggarkan sebuah aturan justru tindakan yang ditanyakan audit setahun kemudian.',

  'processFlows.purpose.entity.role':
    'Salinan satu paket izin dengan izin tambahan di atasnya, disimpan sebagai catatan tentang apa yang disalin dan oleh siapa — sehingga kursi yang dibuat seseorang Selasa lalu terbaca berbeda dari kursi standar.',
  'processFlows.purpose.t_role_grant':
    'Seseorang menyalin satu kumpulan izin lalu memperluasnya. Memperluas tidak pernah menghapus apa pun, sehingga tidak ada yang diam-diam kehilangan wewenang yang diandalkan darinya, dan tindakan itu dicatat seperti setiap tindakan diatur lainnya.',

  'processFlows.purpose.entity.workingCalendar':
    'Hari mana yang dihitung sebagai hari kerja untuk setiap tenggat di hub, berawal dari kalender yang disimpan SAP lalu dikoreksi oleh administrator hub bila pabrik lebih tahu.',
  'processFlows.purpose.t_calendar_day_set':
    'Administrator hub menyatakan satu tanggal adalah atau bukan hari kerja, beserta alasannya. Setiap tenggat tanggapan dan komitmen yang melewati tanggal itu langsung ikut bergeser, sehingga alasannya harus tercatat.',
  'processFlows.purpose.entity.threePl':
    'Penyedia logistik yang dapat disebut pemasok pada pemberitahuan pengiriman, masing-masing dengan halaman publik tempat nomor pelacakannya dapat dicari. Hub hanya menautkan ke halaman itu; hub tidak pernah membaca status darinya.',
  'processFlows.purpose.t_threepl_set':
    'Administrator hub menambahkan atau mengubah penyedia logistik: namanya, alamat pelacakan publiknya, dan apakah pemberitahuan pengiriman baru masih boleh menyebutnya. Setiap tautan pelacakan di hub dibuat dari daftar ini, sehingga setiap perubahan tercatat.',
  'processFlows.purpose.entity.supplierOverlay':
    'Hal yang ditetapkan hub sendiri tentang seorang pemasok, di atas data induk pemasok yang disalin dari SAP. Saat ini: cara pemasok berbagi stoknya, ditarik dari sistemnya sendiri atau diisi lewat templat atau secara manual.',
  'processFlows.purpose.t_supplier_set_update_mode':
    'Administrator hub menetapkan apakah stok pemasok ditarik dari sistemnya atau diisi oleh pemasok, dengan alasan opsional. Cara ini menentukan seberapa sering stok harus diperbarui dan kapan dianggap usang, sehingga setiap perubahan tercatat beserta siapa dan kapan.',
  'processFlows.purpose.entity.qualificationRule':
    'Dokumen yang harus dimiliki vendor, sah dan belum kedaluwarsa, agar berstatus Approved atau Preferred. Hub menghitung level setiap vendor dari daftar ini dan dokumennya; tidak ada yang menetapkan level secara manual.',
  'processFlows.purpose.t_qualification_rule_set':
    'Procurement dan Quality menetapkan dokumen yang diwajibkan untuk satu level. Daftar Preferred selalu memuat setiap dokumen Approved. Perubahan langsung menaikkan atau menurunkan level vendor, sehingga setiap perubahan tercatat beserta siapa dan kapan.',
  'processFlows.purpose.entity.sourcingType':
    'Apakah sebuah kategori sourcing atau purchasing group termasuk Direct atau Indirect. RFI, RFQ, atau RFP mengambil jenisnya dari kategorinya, dan jenis itu menentukan vendor mana yang boleh diundang dan dimenangkan: Direct memerlukan Preferred, Indirect memerlukan Approved atau Preferred.',
  'processFlows.purpose.t_sourcingtype_set':
    'Procurement menetapkan kategori atau purchasing group sebagai Direct atau Indirect. Event yang sudah dipublikasikan tetap memakai jenis saat dipublikasikan, sehingga setiap perubahan tercatat beserta siapa dan kapan.',
  'processFlows.purpose.entity.planningGroup':
    'Sekumpulan material yang berbagi kapasitas di satu pemasok, di bawah satu grup material SAP. Sebelum Material Planning memecah sebuah grup SAP, grup itu memiliki satu grup perencanaan bawaan dengan material yang sama, sehingga kapasitas terbaca seperti sebelumnya.',
  'processFlows.purpose.t_planninggroup_create':
    'Material Planning membuat grup perencanaan baru yang kosong di bawah satu grup material SAP, untuk memisahkan material yang diproduksi di lini berbeda di pemasok. Perubahan tercatat beserta siapa dan kapan.',
  'processFlows.purpose.t_planninggroup_rename':
    'Material Planning mengganti nama grup perencanaan. Nama inilah yang dilihat pemasok dan perencana pada kapasitas dan peringatan, sehingga setiap perubahan tercatat.',
  'processFlows.purpose.t_planninggroup_move_materials':
    'Material Planning memindahkan material ke grup perencanaan dari grup material SAP yang sama. Satu material hanya berada di satu grup, dan kapasitas yang sudah diisi untuk minggu-minggu mendatang pada kedua grup ditandai agar pemasok mengisinya kembali.',
  'processFlows.purpose.t_planninggroup_retire':
    'Material Planning menonaktifkan grup perencanaan setelah tidak ada material tersisa di dalamnya. Grup tidak pernah dihapus, sehingga kapasitas yang pernah diisi tetap dapat dibaca.',
  'processFlows.purpose.entity.mrpController':
    'Siapa yang menangani suatu material di perencanaan. SAP memberi setiap material kode MRP controller; hub menyimpan siapa pemilik kode itu: nama yang dapat dihubungi pemasok, dan pengguna hub di baliknya.',
  'processFlows.purpose.t_mrpcontroller_set':
    'Administrator hub memetakan kode MRP controller ke sebuah nama dan satu atau lebih pengguna hub, atau mengubah pemetaan itu. Pemasok melihat nama itu pada stok, call-off, dan pemberitahuan pengirimannya, sehingga setiap perubahan tercatat beserta siapa dan kapan.',
  'processFlows.purpose.t_mrpcontroller_unmap':
    'Administrator hub menghapus pemetaan sebuah kode MRP controller. Material dengan kode itu kemudian hanya menampilkan kodenya, dan pemasok tidak melihat nama untuknya. Penghapusan itu tercatat beserta siapa dan kapan.',
  'processFlows.purpose.entity.materialName':
    'Nama dagang pemasok untuk material PTI yang dipasoknya, beserta nomor materialnya sendiri bila ada. Setelah disetujui Material Planning, nama itu tampil di samping deskripsi PTI, sehingga pemasok mengenali produknya dan perencana dapat mencocokkan tulisan pemasok.',
  'processFlows.purpose.t_materialname_submit':
    'Pemasok mengisi nama dagangnya untuk material yang ditugaskan kepadanya. Nama itu menunggu Material Planning, dan nama yang sudah disetujui tetap dipakai sampai nama baru disetujui.',
  'processFlows.purpose.t_materialname_approve':
    'Material Planning menyetujui nama dagang pemasok. Setiap pemasok memiliki paling banyak satu nama yang disetujui per material, sehingga nama lama yang disetujui digantikan.',
  'processFlows.purpose.t_materialname_reject':
    'Material Planning menolak nama dagang pemasok dengan alasan, yang dilihat pemasok dan dapat dijawab dengan nama baru.',
  'processFlows.purpose.t_materialname_load':
    'PTI memuat nama dagang yang disetujui secara massal dari berkas berisi kode PTI, pemasok, nama dagang, dan nomor material pemasok. Nama itu langsung disetujui dan ditandai dimuat oleh PTI; baris yang sama dengan nama yang disetujui tidak mengubah apa pun.',
  'processFlows.purpose.t_materialname_replace':
    'Nama yang lebih baru untuk pemasok dan material yang sama menggantikan nama sebelumnya, sehingga hanya satu nama yang disetujui dan hanya satu yang menunggu persetujuan.',
  'processFlows.purpose.entity.simulationOverride':
    'Angka yang diisi perencana untuk simulasi stok bila pemasok belum memberikannya: stok di tangan, jumlah dalam produksi beserta tanggal selesainya, atau kiriman ke distributor beserta tanggal tibanya. Angka ini dipakai sampai pembaruan stok berikutnya dari pemasok dan tidak pernah mengubah data yang dilaporkan pemasok.',
  'processFlows.purpose.t_simulation_override_set':
    'Perencana mengisi angka yang belum ada agar simulasi stok tetap berjalan. Simulasi menandainya sebagai masukan perencana beserta siapa dan kapan, lalu membuangnya saat pemasok mengirim pembaruan stok baru.',

  'processFlows.purpose.entity.hubSetting':
    'Satu nilai yang menjadi pembanding aturan hub: toleransi, tenggat, ambang peringatan, atau periode data usang. Nilai ini menentukan apa yang diterima tanpa diperiksa orang, sehingga hanya administrator hub yang dapat mengubahnya dan setiap perubahan tercatat.',
  'processFlows.purpose.t_setting_set':
    'Administrator hub mengubah satu nilai aturan, atau mengembalikannya ke nilai bawaan. Nilai negatif, di luar batas, atau yang membuat urutan rentang terbalik ditolak, dan aturan membaca nilai baru saat berjalan berikutnya.',
  'processFlows.purpose.entity.reasonCode':
    'Satu kode pada daftar alasan yang dipilih pemasok — mengapa baris pesanan pembelian disesuaikan atau ditolak, atau mengapa komitmen atau kapasitas di bawah yang diminta. Kode tidak pernah dihapus, sehingga jawaban lama tetap berlabel.',
  'processFlows.purpose.t_reasoncode_set':
    'Administrator hub menambahkan kode alasan, mengganti namanya dalam bahasa Inggris dan Indonesia, menghentikannya, atau menawarkannya lagi. Kode yang dihentikan tidak ditawarkan lagi pada jawaban baru tetapi tetap terbaca pada jawaban yang memakainya.',

  // ── maximum stock (REQ-E06-04) ───────────────────────────────────────
  'processFlows.purpose.entity.maxStock':
    'Jumlah terbanyak yang boleh dipegang pemasok untuk PTI atas satu material, sesuai kesepakatan dengan pemasok. Angka ini ditampilkan pada rekonsiliasi feedstock.',
  'processFlows.purpose.t_maxstock_set':
    'Procurement menetapkan, mengubah, atau menghapus stok maksimum satu pemasok dan material. Setiap perubahan disimpan beserta nilai sebelumnya, sehingga stok maksimum yang berlaku pada waktu mana pun dapat dibaca kembali.',

  // ── supplierApplication ──────────────────────────────────────────────
  'processFlows.purpose.entity.supplierApplication':
    'Catatan bahwa sebuah perusahaan meminta menjadi pemasok Paragon, siapa yang menanganinya, dan apa keputusannya. Tanpa itu, sebuah perusahaan bisa menyelesaikan formulir pendaftaran lalu diberi nomor rujukan yang tidak berpijak pada catatan apa pun.',
  'processFlows.purpose.t_application_submit':
    'Paragon mencatat bahwa sebuah perusahaan meminta menjadi pemasok — siapa mereka, jenis permintaannya, dan dokumen apa saja yang mereka nyatakan dimiliki. Sejak saat itu nomor rujukan yang diberikan kepada pemohon menunjuk baris yang benar-benar ada, dan itulah seluruh alasan langkah ini ada.',
  'processFlows.purpose.t_application_start_review':
    'Seseorang mengambil berkas dari tumpukan dan mencantumkan namanya, sehingga antrean dapat membedakan permohonan yang belum dibuka siapa pun dari yang sudah dikerjakan.',
  'processFlows.purpose.t_application_approve':
    'Paragon menerima pemohon. Yang dicatat hanyalah keputusannya — catatan induk vendor diterbitkan di S/4HANA, tempat identitas pemasok berada.',
  'processFlows.purpose.t_application_reject':
    'Paragon menolak, dan wajib menyatakan alasannya dengan kata-kata yang bisa diteruskan kepada pemohon. Pemohon tidak punya kursi di sini, sehingga teks itulah satu-satunya keterangan atas keputusan tersebut yang akan pernah ada.',

  // ── receiptDiscrepancy ───────────────────────────────────────────────
  'processFlows.purpose.entity.receiptDiscrepancy':
    'Percakapan tentang pengiriman yang tidak tiba sesuai pemberitahuan, atau yang sebagian gagal pemeriksaan. Kedua pihak menyepakati kuantitas sebelum tagihan dibuat, bukan memperdebatkannya sesudahnya.',
  'processFlows.purpose.t_receiptdiscrepancy_acknowledge':
    'Pemasok setuju dengan hitungan Paragon dan menyatakannya dengan kata-katanya sendiri. Selisihnya berlaku, dan tagihan akan mengikuti kuantitas yang diterima Paragon.',
  'processFlows.purpose.t_receiptdiscrepancy_dispute':
    'Pemasok tidak setuju dengan hitungan Paragon dan menjelaskan alasannya, agar perencana dapat memeriksanya selagi pengiriman masih baru.',
  'processFlows.purpose.t_receiptdiscrepancy_resolve':
    'Perencana menutup ketidaksepakatan dan mencatat cara penyelesaiannya, sehingga tidak ada pihak yang perlu membukanya lagi saat tagihan datang.',
  // ── callOff ─────────────────────────────────────────────────────────
  'processFlows.purpose.entity.callOff':
    'Satu pengiriman yang dipanggil dari pesanan pembelian induk: berapa banyak, kapan, dan apakah pemasok sudah berkomitmen. Hub menyimpan catatan ini karena SAP hanya mengenal pesanan induknya.',
  'processFlows.purpose.t_calloff_release':
    'Perencana meminta satu pengiriman kepada pemasok dari pesanan induk. Permintaan tidak boleh melebihi sisa pesanan, sehingga pesanan tidak pernah terlampaui.',
  'processFlows.purpose.t_calloff_draft':
    'Perencana menyusun call-off tanpa mengirimkannya dulu, sering sebagai bagian dari rangkaian mingguan atau bulanan, agar rencana dapat diperiksa sebelum dilihat pemasok.',
  'processFlows.purpose.t_calloff_edit_draft':
    'Perencana mengubah draf sebelum dikirim dan menyatakan alasannya, sehingga alasan perubahan tetap melekat pada rencana.',
  'processFlows.purpose.t_calloff_release_draft':
    'Perencana mengirim call-off dari draf kepada pemasok. Kuantitasnya tetap harus muat dalam sisa pesanan induk.',
  'processFlows.purpose.t_calloff_dismiss':
    'Perencana membatalkan draf yang tidak lagi diperlukan dan mencatat alasannya, agar tidak ada yang bertanya-tanya nanti.',
  'processFlows.purpose.t_calloff_change':
    'Perencana mengubah call-off yang sudah dilihat pemasok. Karena permintaannya berubah, pemasok harus mengonfirmasi lagi.',
  'processFlows.purpose.t_calloff_confirm':
    'Pemasok berkomitmen pada pengiriman persis seperti diminta. Setelah itu pemasok dapat mengirim dan menyampaikan pemberitahuannya.',
  'processFlows.purpose.t_calloff_confirm_new_date':
    'Pemasok berkomitmen pada kuantitas di tanggal lain. Setiap perubahan tanggal diteruskan ke perencana kecuali masih dalam toleransi.',
  'processFlows.purpose.t_calloff_confirm_changes':
    'Pemasok berkomitmen pada kuantitas yang berbeda. Kenaikan kecil pada call-off berbasis prakiraan, atau kenaikan berapa pun pada JIT, diterima; selebihnya diteruskan ke perencana.',
  'processFlows.purpose.t_calloff_confirm_partial':
    'Pemasok membagi pengiriman menjadi dua, masing-masing dengan tanggal dan kuantitasnya. Setiap bagian diukur sendiri untuk tepat waktu dan lengkap.',
  'processFlows.purpose.t_calloff_reject':
    'Pemasok tidak dapat memenuhi call-off ini dan menyatakan alasannya, agar perencana dapat mencari barang dengan cara lain.',
  'processFlows.purpose.t_calloff_approve':
    'Perencana menerima konfirmasi yang di luar toleransi. Tanggal dan kuantitas yang dikonfirmasi menjadi dasar pengukuran pengiriman.',
  'processFlows.purpose.t_calloff_reject_confirmation':
    'Perencana tidak menerima konfirmasi pemasok dan menjelaskan alasannya. Call-off kembali ke pemasok untuk dikonfirmasi ulang.',
  'processFlows.purpose.t_calloff_dispatch':
    'Pemasok memberi tahu PTI bahwa barang sudah berangkat, beserta perkiraan tiba. Inilah kabar yang dibutuhkan perencana; ASN untuk call-off yang sama juga dihitung.',

  // ── inventory & capacity ────────────────────────────────────────────
  'processFlows.purpose.entity.stockAccess':
    'Apakah pemasok boleh melihat stok PTI, dan untuk material apa saja. Hanya pemasok terpilih yang melihatnya, agar informasi komersial tetap terlindungi.',
  'processFlows.purpose.t_stockaccess_grant':
    'Perencana mengizinkan pemasok melihat stok PTI, untuk semua material yang dipasoknya atau hanya yang dipilih, agar pemasok dapat merencanakan pengisian sendiri. Perubahan dicatat.',
  'processFlows.purpose.t_stockaccess_change':
    'Perencana mengubah material yang stok PTI-nya boleh dilihat pemasok yang sudah memiliki akses. Perubahan dicatat.',
  'processFlows.purpose.t_stockaccess_remove':
    'Perencana menghentikan akses pemasok ke stok PTI. Berlaku saat pemasok membuka halaman berikutnya, dan perubahan dicatat.',
  'processFlows.purpose.entity.stockSync':
    'Satu upaya menarik angka stok dari sistem pemasok yang terhubung ke hub, disimpan baik berhasil maupun gagal.',
  'processFlows.purpose.t_stocksync_run':
    'Perencana menarik angka stok terbaru dari pemasok yang terhubung. Jika sistem pemasok tidak menjawab, kesalahan dan waktunya ditampilkan dan angka sebelumnya tetap ada, ditandai kedaluwarsa.',
  'processFlows.purpose.t_stocksync_pull':
    'Pemasok yang terhubung menarik angka stok terbarunya sendiri dari catatan stoknya dengan tombol Sinkronkan. Jika tidak ada jawaban, kesalahan dan waktunya ditampilkan dan angka sebelumnya tetap ada, ditandai kedaluwarsa.',
  'processFlows.purpose.entity.capacitySubmission':
    'Kapasitas yang dialokasikan pemasok untuk PTI per kelompok material dan minggu, untuk 13 minggu ke depan.',
  'processFlows.purpose.t_capacity_submit':
    'Pemasok menyatakan kapasitas yang dialokasikan per minggu. Minggu di bawah kebutuhan PTI memerlukan alasan, agar perencana melihat kekurangannya dan penyebabnya sebelum sampai ke pabrik.',
  'processFlows.purpose.entity.inventoryAlert':
    'Peringatan bahwa stok atau kapasitas menuju kekurangan, dengan kelas risiko, agar perencana bertindak sebelum material habis.',
  'processFlows.purpose.t_inventoryalert_close':
    'Perencana menutup peringatan dengan alasan dari daftar, dan catatan bila alasannya "Lainnya". Kondisi yang sama tidak memunculkannya lagi sampai kondisi itu pulih lalu terjadi lagi.',
  'processFlows.purpose.entity.forecastVersion':
    'Satu versi prakiraan PTI yang diterbitkan untuk kemasan (mingguan) atau bahan baku (bulanan), dengan zona per periode. Setiap versi disimpan.',
  'processFlows.purpose.t_forecastversion_publish':
    'Perencana menerbitkan versi prakiraan berikutnya, sesuai jadwal atau sebagai penerbitan ulang darurat. Pemasok diminta membukanya dan memberi komitmen.',
  'processFlows.purpose.t_forecastversion_reassign':
    'Perencana memindahkan sebagian atau seluruh kekurangan satu periode dari satu pemasok ke satu atau beberapa pemasok lain material itu, dengan kuantitas masing-masing, dan menjelaskan alasannya. Pemasok menerimanya sebagai versi baru.',
  'processFlows.purpose.entity.forecastView':
    'Saat pemasok pertama kali membuka versi prakiraan, agar perencana tahu siapa yang sudah melihat rencananya.',
  'processFlows.purpose.t_forecastview_record':
    'Membuka versi prakiraan mencatat bahwa pemasok sudah melihatnya.',

  'processFlows.purpose.entity.sapChangeMark':
    'Catatan bahwa Perencana Material membawa usulan perubahan baris pesanan pembelian terbuka ke SAP. Hub tidak pernah mengubah pesanan pembelian sendiri, jadi dengan catatan ini laporan penjadwalan ulang tahu usulan mana yang sudah ditindaklanjuti.',
  'processFlows.purpose.t_sapchange_mark':
    'Perencana Material menandai usulan untuk memindahkan, mengurangi, atau membatalkan baris pesanan pembelian sebagai sudah dibawa ke SAP, beserta perubahan dan waktunya. Ditolak selama mesin prakiraan memakai data simulasi, karena perubahan di SAP sampai ke pemasok.',
  'processFlows.purpose.entity.forecastOverride':
    'Perubahan oleh anggota tim Perencanaan Material pada satu minggu prakiraan permintaan satu produk, beserta nilai lama dan baru, alasan, siapa, dan kapan. Perubahan terakhir pada suatu minggu adalah yang berlaku; halaman bias prakiraan mengukur apakah perubahan tiap jenis membuat prakiraan lebih baik atau lebih buruk.',
  'processFlows.purpose.t_forecastoverride_record':
    'Tim Perencanaan Material menyesuaikan prakiraan permintaan satu produk untuk satu minggu. Menaikkannya di atas prakiraan mesin memerlukan kode alasan. Ini tidak mengubah perencanaan material, yang tetap memakai rencana SAP.',
  'processFlows.purpose.entity.warehouseDecision':
    'Keputusan Perencana Material untuk minggu yang tidak muat di gudang meski dengan ruang sewa terbanyak: sewa ruang, mundurkan pesanan, kurangi pesanan, atau terima kelebihan. Keputusan mencatat versi rencana yang menjadi dasarnya. Keputusan terakhir pada suatu minggu adalah yang berlaku; keputusan sebelumnya tetap tercatat.',
  'processFlows.purpose.t_warehousedecision_record':
    'Perencana Material mencatat cara menangani minggu yang tidak muat di gudang. Menerima kelebihan memerlukan catatan. Keputusan ini catatan niat: tidak mengubah pesanan apa pun dan tidak pernah dikirim ke SAP atau pemasok.',
  'processFlows.purpose.entity.demandAnticipation':
    'Publikasi demand anticipation satu minggu perencanaan, per pemasok dan material, sepanjang lead time: LTP tiap minggu ditambah sisa yang dibawa ke minggu itu, dengan safety order di minggu pertama. Tiap angka menyimpan inputnya dan versi aturan yang menghasilkannya. Publikasi berikutnya untuk minggu yang sama menggantikannya; setiap publikasi tetap tercatat.',
  'processFlows.purpose.t_demandanticipation_publish':
    'Perencana Material mencatat demand anticipation minggu perencanaan saat ini, dan persetujuan pemasok untuk menerima sisa di minggu pertama setelah horizon. Publikasi minggu berikutnya bergulir maju darinya. Tidak ada yang dikirim ke SAP atau pemasok.',
  'processFlows.purpose.entity.consumption':
    'Pemakaian material yang tercatat dalam satu minggu, diketik atau diunggah oleh Perencana Material sampai umpan pengeluaran barang SAP tersedia. Catatan yang lebih baru untuk material dan minggu yang sama menggantikan yang lebih lama; keduanya tetap tercatat.',
  'processFlows.purpose.t_consumption_record':
    'Perencana Material mencatat berapa banyak material yang dipakai dalam satu minggu. Pemakaian tampil di samping demand anticipation dan masuk ke rata-rata pemakaian. Tidak ada yang dikirim ke SAP atau pemasok.',
  'processFlows.purpose.entity.osipLevel':
    'Level OSIP suatu material, yang menentukan rumus titik pemesanan ulang fisiknya (ROP Fisik). Material yang belum diatur berada di level 4. Setiap perubahan menyimpan level sebelumnya, siapa yang mengatur, dan kapan; yang terakhir berlaku.',
  'processFlows.purpose.t_osiplevel_set':
    'Perencana Material mengatur atau mengonfirmasi level OSIP suatu material, dari 1 sampai 6. Mengonfirmasinya menutup tugas “Tinjau ROP setelah pesanan pertama”. Tidak ada yang dikirim ke SAP atau pemasok.',
  'processFlows.purpose.entity.osipParam':
    'Nilai OSIP yang diatur Perencana Material untuk satu material (faktor tingkat layanan Z, hari pengaman tetap g), satu pemasok (siklus pengisian ulang f, perjanjian tarik) atau satu pemasok dan material (lead time produksi bottleneck). Bila belum diatur, nilai bawaan berlaku. Setiap perubahan menyimpan nilai sebelumnya, siapa yang mengatur, dan kapan; yang terakhir berlaku.',
  'processFlows.purpose.t_osipparam_set':
    'Perencana Material mengatur atau mengembalikan satu nilai OSIP. Titik pemesanan ulang, tanggal kebutuhan call-off, dan irama konfirmasi mengikutinya. Tidak ada yang dikirim ke SAP atau pemasok.',
  'processFlows.purpose.entity.capacityMonth':
    'Kapasitas pemasok per bulan untuk bulan di luar 13 bucket mingguan, untuk satu grup perencanaan. Perubahan menjadi pengajuan baru; yang terbaru untuk suatu bulan berlaku.',
  'processFlows.purpose.t_capacitymonth_submit':
    'Pemasok menyatakan kapasitas satu grup perencanaan per bulan, untuk bulan yang tidak dicakup entri mingguan. Capacity heads-up membacanya. Tidak ada yang dikirim ke SAP.',
  'processFlows.purpose.entity.ltpInput':
    'Kuantitas LTP yang diunggah Perencana Material untuk satu material (LTP A, LTP Festive atau LTP B, kuantitas per minggu, beserta berkasnya) atau pilihan LTP untuk material itu. Tidak ada yang diubah atau dihapus; yang terakhir berlaku.',
  'processFlows.purpose.t_ltpinput_set':
    'Perencana Material mengunggah LTP A, LTP Festive atau LTP B untuk satu material, atau mencatat mana yang dipakai demand anticipation. Hub tidak pernah memilih LTP. Tidak ada yang dikirim ke SAP atau pemasok.',
  'processFlows.purpose.entity.promotion':
    'Promosi yang dimasukkan Perencana Material untuk satu SKU pada satu minggu: kenaikan yang diharapkan dalam persen atau jumlah unit. Perubahan atau penarikan menjadi entri baru; tidak ada yang diubah atau dihapus, sehingga riwayat tetap ada.',
  'processFlows.purpose.t_promotion_set':
    'Perencana Material memasukkan, mengubah, atau menarik promosi untuk satu SKU dan minggu. Prakiraan permintaan menambahkan kenaikan itu ke minggu tersebut hanya untuk SKU itu dan menandai minggunya. Tidak ada yang dikirim ke SAP atau pemasok.',
  'processFlows.purpose.entity.whatIfScenario':
    'Skenario what-if yang disimpan Perencana Material untuk satu pemasok dan material: angka yang dipakai, pilihan aturannya, dan versi aturan yang berlaku saat itu. Tidak ada yang diubah atau dihapus; angka lain menjadi skenario baru.',
  'processFlows.purpose.t_whatifscenario_save':
    'Perencana Material menyimpan skenario what-if dengan sebuah judul, untuk dibandingkan dengan rencana saat ini nanti. Hanya analisis: tidak ada yang mengubah rencana atau sampai ke pemasok atau SAP.',
  'processFlows.purpose.entity.feedstockConfirmation':
    'Konfirmasi pemasok atas feedstock saat ini untuk satu material: jumlah dalam satuan material, tanggal konfirmasi, dan catatan opsional. Feedstock belum menjadi stok sampai diproduksi, sehingga tidak pernah menambah stok pemasok. Konfirmasi yang lebih baru menggantikan yang lama; setiap konfirmasi tetap tercatat.',
  'processFlows.purpose.t_feedstock_confirm':
    'Pemasok mengonfirmasi feedstock saat ini untuk material yang ditugaskan, setiap minggu bersama pembaruan stok. PTI melihatnya sebagai baris tersendiri di samping stok pemasok. Tidak ada yang dikirim ke SAP.',
  'processFlows.purpose.entity.supplierAsk':
    'Pertanyaan PTI kepada satu pemasok tentang satu material, atau tentang satu grup perencanaan dan minggu: topik, pertanyaan, dan tenggat opsional. Pertanyaan tampil di Tugas dan halaman Stok pemasok dan dijawab di hub. Setiap langkah tetap tercatat; tidak ada yang dikirim lewat email.',
  'processFlows.purpose.t_supplierask_raise':
    'Perencana bertanya kepada pemasok tentang material yang dipasoknya, atau tentang grup perencanaan kapasitas dan minggu. Hanya satu pertanyaan per subjek yang boleh terbuka sekaligus. Tidak ada yang dikirim ke SAP.',
  'processFlows.purpose.t_supplierask_answer':
    'Pemasok menjawab pertanyaan PTI di hub, dengan tanggal opsional. Hanya pemasok yang disebut pertanyaan itu yang dapat menjawabnya.',
  'processFlows.purpose.t_supplierask_close':
    'Perencana sudah membaca jawaban pemasok dan menutup pertanyaan. Pertanyaan dan jawaban tetap tercatat.',
  'processFlows.purpose.t_supplierask_withdraw':
    'Perencana menarik pertanyaan yang belum dijawab pemasok, karena PTI tidak lagi memerlukan jawabannya.',
  'processFlows.purpose.entity.poOnHoldDecision':
    'Apa yang terjadi pada baris PO On Hold, yaitu kuantitas PO terbuka yang tidak diserap antisipasi permintaan. Perencana mengusulkan hanya feedstock, feedstock dan sebaran, atau barang jadi; pemasok membuat pilihan akhir. Kedua langkah tetap tercatat.',
  'processFlows.purpose.t_poonhold_suggest':
    'Perencana mengusulkan apa yang dilakukan pada baris PO On Hold. Pemasok melihat usulan itu dan dapat memilih lain sampai masa tenggang berakhir.',
  'processFlows.purpose.t_poonhold_choose':
    'Pemasok membuat pilihan akhir untuk baris PO On Hold miliknya. Pilihan tidak dapat diubah. Jika pemasok tidak memilih, usulan perencana berlaku di akhir masa tenggang.',
  'processFlows.purpose.entity.capacityDecision':
    'Keputusan PTI atas kekurangan kapasitas: perencana setuju memakai kapasitas tambahan yang ditawarkan pemasok untuk satu grup perencanaan pada satu periode rencana kapasitas. Pemasok melihat jawaban PTI di halaman Kapasitas. Perencana dapat membatalkan penerimaan; penerimaan tetap tercatat.',
  'processFlows.purpose.t_capacitydecision_accept':
    'Perencana setuju memakai kapasitas tambahan pemasok bila LTP di atas kapasitas tetapi masih dalam kapasitas ditambah kapasitas tambahan. Periode di atas itu tidak dapat diambil. Tidak ada yang dikirim ke SAP.',
  'processFlows.purpose.t_capacitydecision_withdraw':
    'Perencana membatalkan penerimaan. Periode itu kembali dihitung dalam peringatan kapasitas, dan penerimaan tetap tercatat.',

  // ── RFx (REQ-E03-02 / REQ-E03-04 / REQ-E03-05) ────────────────────────────
  'processFlows.purpose.entity.rfiEvent':
    'Rangkaian pertanyaan terstruktur tentang apa yang bisa dibuat pemasok, di mana, dan bagaimana — ditanyakan sebelum membahas harga.',
  'processFlows.purpose.t_rfi_create':
    'Pembelian mulai dari kumpulan pertanyaan yang dipelihara Procurement untuk kategori itu, lalu menambah atau menghapus pertanyaan khusus acara ini.',
  'processFlows.purpose.t_rfi_publish':
    'Pertanyaan sampai ke pemasok yang diundang. Sebelum itu masih disiapkan dan tidak terlihat di luar PTI.',
  'processFlows.purpose.t_rfi_revise_draft':
    'Pembelian membuka lagi permintaan yang belum dikirim dan mengubah bagian mana pun: pertanyaan, undangan, tanggal, berkas. Tetap berupa draf, dan setiap perubahan dicatat beserta siapa dan kapan.',
  'processFlows.purpose.t_rfi_extend':
    'Pembelian memberi semua pemasok yang diundang — atau hanya yang disebut — waktu tambahan untuk menjawab.',
  'processFlows.purpose.t_rfi_close':
    'Masa menjawab berakhir, dan pembelian membandingkan yang masuk.',
  'processFlows.purpose.t_rfi_cancel':
    'PTI membatalkan permintaan, sehingga pemasok berhenti mengerjakannya.',
  'processFlows.purpose.t_rfq_revise_draft':
    'Pembelian membuka lagi permintaan harga yang belum dikirim dan mengubah bagian mana pun: item, jenjang jumlah, undangan, tanggal. Tetap berupa draf, dan setiap perubahan dicatat beserta siapa dan kapan.',
  'processFlows.purpose.t_rfq_extend':
    'Pembelian memberi semua pemasok yang diundang — atau hanya yang disebut — waktu tambahan untuk memberi harga.',
  'processFlows.purpose.t_quotation_revise':
    'Pemasok yang diminta memperbaiki tawarannya mengirim yang lebih baik. Versi sebelumnya tetap disimpan, sehingga pembelian bisa melihat seberapa jauh pergerakannya.',
  'processFlows.purpose.entity.rfiResponse':
    'Yang disampaikan satu pemasok tentang kemampuan, pengalaman, lokasi, dan produknya — disimpan pada pemasok itu agar permintaan harga berikutnya bisa memakainya lagi.',
  'processFlows.purpose.t_rfiresponse_save':
    'Jawaban yang belum selesai disimpan agar pemasok bisa melanjutkan, dan PTI belum bisa melihatnya.',
  'processFlows.purpose.t_rfiresponse_submit':
    'Pemasok mengirim jawabannya ke PTI. Semua pertanyaan yang ditandai wajib harus terjawab lebih dulu agar hasilnya bisa dibandingkan.',
  'processFlows.purpose.t_rfiresponse_revise':
    'Pemasok memperbaiki jawaban yang sudah dikirim, sampai batas waktu. Setiap versi yang dikirim disimpan, sehingga PTI membaca yang terbaru dan tetap bisa melihat yang sebelumnya.',
  'processFlows.purpose.entity.rfpEvent':
    'Permintaan syarat komersial yang akan dipakai pemasok — pembayaran, pengiriman, tingkat layanan, dan kontrak — bukan sekadar angka satuan.',
  'processFlows.purpose.t_rfp_create':
    'Pembelian memilih syarat yang perlu dijawab dari daftar standar dan menyatakan apa yang diminta PTI pada masing-masing.',
  'processFlows.purpose.t_rfp_publish':
    'Syarat sampai ke pemasok yang diundang, dan baru setelah itu proposal bisa masuk.',
  'processFlows.purpose.t_rfp_revise_draft':
    'Pembelian membuka lagi permintaan proposal yang belum dikirim dan mengubah bagian mana pun: syarat, opsi, undangan, tanggal. Tetap berupa draf, dan setiap perubahan dicatat beserta siapa dan kapan.',
  'processFlows.purpose.t_rfp_extend':
    'Pembelian memberi semua pemasok yang diundang — atau hanya yang disebut — waktu tambahan untuk mengusulkan.',
  'processFlows.purpose.t_rfp_close':
    'Masa mengusulkan berakhir, dan pembelian membandingkan syarat berdampingan.',
  'processFlows.purpose.t_rfp_cancel':
    'PTI membatalkan permintaan, sehingga pemasok berhenti mengerjakannya.',
  'processFlows.purpose.t_rfp_award':
    'Pembelian menetapkan pemenang proposal per opsi berdasarkan penawaran tetap, dengan alasan. Setiap pemasok yang menjawab tahu hasilnya sendiri, dan PO atau kontrak dibuat di SAP.',
  'processFlows.purpose.t_rfp_award_partial':
    'Pembelian menetapkan opsi yang sudah siap berdasarkan penawaran tetapnya dan kembali untuk sisanya. Belum ada yang ditolak.',
  'processFlows.purpose.t_rfp_award_cancel':
    'Pembelian menarik penetapan pemenang RFP, dengan alasan, sebelum dibuat di SAP. Catatannya tetap tersimpan dan opsinya bisa diputuskan lagi.',
  'processFlows.purpose.t_rfp_award_cancel_partial':
    'Pembelian menarik satu penetapan pemenang RFP sementara yang lain tetap berlaku. Opsinya dibuka kembali dan setiap langkah tetap tercatat.',
  'processFlows.purpose.t_rfp_award_sap_raised':
    'Mencatat bahwa penetapan pemenang RFP sudah dibuat di SAP, beserta nomor dokumen SAP-nya. Sejak itu perubahan dilakukan di SAP.',
  'processFlows.purpose.entity.rfpResponse':
    'Syarat yang diusulkan satu pemasok: apa yang ditawarkan pada tiap pokok yang diangkat PTI, apakah bisa dipenuhi, dan alasannya bila tidak.',
  'processFlows.purpose.t_rfpresponse_save':
    'Proposal yang belum lengkap disimpan agar pemasok bisa melanjutkan, dan PTI belum bisa melihatnya.',
  'processFlows.purpose.t_rfpresponse_submit':
    'Pemasok mengirim syaratnya ke PTI. Hal yang tidak bisa dipenuhi wajib disertai penjelasan, sehingga penyimpangan tidak pernah senyap.',
  'processFlows.purpose.t_rfpresponse_revise':
    'Pemasok memperbaiki proposal yang sudah dikirim, sampai batas waktu, dengan pemeriksaan yang sama seperti pengiriman pertama. Setiap versi yang dikirim beserta berkasnya disimpan, sehingga PTI membaca yang terbaru dan tetap bisa melihat yang sebelumnya.',
  'processFlows.purpose.entity.rfiIntent':
    'Apakah pemasok yang diundang akan menjawab permintaan informasi, dan jika tidak, mengapa — sehingga pemasok yang diam dan yang menolak tidak tampil sebagai baris yang sama.',
  'processFlows.purpose.t_rfiintent_respond':
    'Pemasok menyatakan akan menjawab permintaan informasi.',
  'processFlows.purpose.t_rfiintent_decline':
    'Pemasok menyatakan tidak akan menjawab, memilih alasan dari daftar dan menjelaskannya dengan kata-katanya sendiri. Pembelian membaca keduanya.',
  'processFlows.purpose.t_rfiintent_withdraw':
    'Pemasok yang tadinya akan menjawab berubah pikiran sebelum mengirim, dengan alasan dan penjelasannya sendiri. Kapan ia pertama menyatakan ya tetap tercatat.',
  'processFlows.purpose.entity.rfpIntent':
    'Apakah pemasok yang diundang akan mengirim proposal, dan jika tidak, mengapa — sehingga pemasok yang diam dan yang menolak tidak tampil sebagai baris yang sama.',
  'processFlows.purpose.t_rfpintent_respond': 'Pemasok menyatakan akan mengirim proposal.',
  'processFlows.purpose.t_rfpintent_decline':
    'Pemasok menyatakan tidak akan mengirim proposal, memilih alasan dari daftar dan menjelaskannya dengan kata-katanya sendiri. Pembelian membaca keduanya.',
  'processFlows.purpose.t_rfpintent_withdraw':
    'Pemasok yang tadinya akan mengirim proposal berubah pikiran sebelum mengirim, dengan alasan dan penjelasannya sendiri. Kapan ia pertama menyatakan ya tetap tercatat.',
  'processFlows.purpose.entity.negotiationRound':
    'Satu putaran meminta daftar pendek memperbaiki tawarannya, dengan tanggal untuk menjawab dan target yang boleh dicantumkan.',
  'processFlows.purpose.t_negotiationround_open':
    'Pembelian meminta pemasok dalam daftar pendek memperbaiki tawarannya, dengan tanggal untuk menjawab serta pesan dan angka target bila ada. Pihak lain tidak boleh menjawab.',
  'processFlows.purpose.t_negotiationround_close':
    'Pembelian berhenti menerima tawaran perbaikan untuk putaran ini. Pemasok yang tidak menjawab tetap pada tawaran sebelumnya.',
  'processFlows.purpose.entity.rfpOfferRound':
    'Satu putaran meminta pemasok RFP dalam daftar pendek memberi harga pasti untuk opsi yang dipilih pembelian, pada kuantitas tertentu, dengan tanggal untuk menjawab.',
  'processFlows.purpose.t_rfp_round_open':
    'Setelah proposal masuk, pembelian meminta pemasok yang menjawab dan lolos pemeriksaan kepatuhan memberi harga pasti untuk opsi dan kuantitas yang dipilih. Pihak lain tidak boleh menjawab.',
  'processFlows.purpose.t_rfp_round_close':
    'Pembelian berhenti menerima penawaran pasti untuk putaran ini. Penawaran yang sudah dikirim tetap tercatat.',
  'processFlows.purpose.entity.rfpFirmOffer':
    'Harga pasti satu pemasok dalam satu putaran: per opsi dan kuantitas, beserta tanggal berlakunya. Setiap versi yang dikirim disimpan.',
  'processFlows.purpose.t_rfpfirmoffer_submit':
    'Pemasok berkomitmen pada harga pasti untuk opsi dan kuantitas yang diminta, sampai tanggal yang tidak lebih awal dari batas waktu putaran.',
  'processFlows.purpose.t_rfpfirmoffer_revise':
    'Pemasok mengubah penawaran pastinya sebelum putaran ditutup. Versi sebelumnya disimpan dan versi baru yang berlaku.'
};
