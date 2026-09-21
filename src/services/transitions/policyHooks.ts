// ────────────────────────────────────────────────────────────────────────────
// Policy-hook NAME registry (v2.2 Step 3.1).
//
// Flow definitions reference policy hooks BY NAME (never as embedded closures),
// so the metadata stays serialisable and inspectable. The dispatcher (Step 3.4)
// binds each name to its implementation. This module owns the allowlist of known
// names; `validate.ts` rejects any flow referencing an unregistered hook.
// ────────────────────────────────────────────────────────────────────────────

const REGISTERED = new Set<string>();

/** Register a policy-hook name so flows may reference it. Idempotent. */
export function registerPolicyHook(name: string): void {
  REGISTERED.add(name);
}

/** True if `name` has been registered. */
export function isRegisteredPolicyHook(name: string): boolean {
  return REGISTERED.has(name);
}

/** All registered hook names, sorted (for inspection / tests). */
export function getRegisteredPolicyHooks(): readonly string[] {
  return [...REGISTERED].sort();
}

// — Seed hooks referenced by the shipped flows ───────────────────────────────
// Named business rules; the dispatcher binds each name to its implementation at
// Step 3.4. Registered eagerly on import so a flow that references one validates.
export const POLICY_HOOKS = {
  /**
   * §82 · supplierdoc reject: `rejectionReason` must be text with substance.
   *
   * ⚠️ **`requiredFields` IS NOT ENOUGH AND THIS IS THE THIRD VERB TO LEARN IT.**
   * The dispatcher's emptiness check admits a string of spaces, so a required
   * field can be satisfied by the space bar. That matters more here than
   * anywhere: §80 built a supplier-facing surface that renders this text
   * verbatim, so a blank reason is a refusal notice with an empty accusation in
   * it. Twin of `PR_REJECT_REASON_AUTHORED` / `PR_REVISION_NOTE_AUTHORED`.
   */
  SUPPLIERDOC_REFUSAL_AUTHORED: 'supplierdoc_refusal_authored',
  /** PO confirm: each confirmed line qty must be > 0 and ≤ the ordered qty. */
  PO_CONFIRM_QTY_WITHIN_ORDERED: 'po_confirm_qty_within_ordered',
  /** PO adjust (REQ-E07-02 AC-02): every counter-offer names a line of this PO,
   *  a predefined reason (a note when the reason is Other), a quantity within
   *  CR-10 and a readable date. At least one line. */
  PO_ADJUST_COUNTER_OFFER_VALID: 'po_adjust_counter_offer_valid',
  /** PO reject (AC-03): at least one cause from date / quantity / quality, and
   *  nothing off that list. */
  PO_REJECT_CAUSE_GIVEN: 'po_reject_cause_given',
  /** Counter-offer rejected by the planner: the comment is substance, not presence. */
  PO_COUNTER_REVIEW_COMMENT_AUTHORED: 'po_counter_review_comment_authored',
  /** Shipping notice: the expected completion date is a real `YYYY-MM-DD` date. */
  PO_SHIPPING_NOTICE_DATE_VALID: 'po_shipping_notice_date_valid',
  /** ASN create (REQ-E07-04 BR-01): the parent PO (payload.poReference) must be
   *  approved and still open — Confirmed or Partially Delivered, so a partial
   *  shipment can follow a first receipt. */
  ASN_CREATE_PO_APPROVED: 'asn_create_po_approved',
  /** ASN create / submit (BR-02): every line names a material of the PO and a
   *  positive shipped quantity no larger than the line's open quantity, unless
   *  the supplier gives a reason. */
  ASN_LINES_WITHIN_OPEN: 'asn_lines_within_open',
  /** ASN submit (BR-04): ship date, expected arrival (not before the ship
   *  date) and a batch number on every line. */
  ASN_SUBMIT_COMPLETE: 'asn_submit_complete',
  /** ASN cancel: nothing has been received against the ASN yet. */
  ASN_CANCEL_NOT_RECEIVED: 'asn_cancel_not_received',
  /** ASN create / submit (BL-51, BR-05): a 3PL the ASN names is on the 3PL list
   *  and still offered. An ASN naming no 3PL is untouched. */
  ASN_THREE_PL_LISTED: 'asn_three_pl_listed',
  /** GR create: the parent shipment/ASN (payload.asnReference) must have arrived. */
  GR_CREATE_SHIPMENT_RECEIVED: 'gr_create_shipment_received',
  // GR header disposition = ROLLUP of the per-line sub-flow states (census G2).
  // The header verb is only legal when the line rollup matches its terminal —
  // "Approved" is provably derived, never asserted.
  /** GR approve: every line rolls up Accepted. */
  GR_ROLLUP_APPROVED: 'gr_rollup_all_accepted',
  /** GR partial approve: lines are a mix of accepted + rejected. */
  GR_ROLLUP_PARTIAL: 'gr_rollup_mixed',
  /** GR reject: every line rolls up Rejected. */
  GR_ROLLUP_REJECTED: 'gr_rollup_all_rejected',
  /** Quotation submit (2e-c-2): payload.currency must be a PERMITTED bid
   *  currency (`BID_CURRENCIES`). `requiredFields` proves presence only — this
   *  proves membership, so an off-list token is refused BY NAME rather than
   *  coerced to the base currency or stored as an unrecognised denomination. */
  QUOTATION_SUBMIT_CURRENCY_PERMITTED: 'quotation_submit_currency_permitted',
  /** RFQ FX pin (2e-c-3): the recorded basis must be WELL-FORMED — a permitted
   *  non-base quote currency, a finite positive rate, a readable vintage and a
   *  known source. A malformed pin is worse than no pin: an absent one refuses
   *  loudly, a malformed one is a basis a comparison could be ranked on. */
  RFQ_FX_PIN_WELL_FORMED: 'rfq_fx_pin_well_formed',
  /** RFQ create (RFx spec 2026-09-21): the items, quantity breaks, questions,
   *  sample request and currency are sound WHEN SENT — at least one item with
   *  its required buyer fields filled, 1 to 8 strictly increasing breaks, and a
   *  permitted bid currency. Refusals are named. A legacy single-item dispatch
   *  sends none of these and is not refused for it. */
  RFQ_CREATE_VALID: 'rfq_create_valid',
  /** Invoice create (REQ-E07-07): the parent PO (payload.poReference) must be
   *  Confirmed, Partially Delivered or Delivered. */
  INVOICE_CREATE_PO_INVOICEABLE: 'invoice_create_po_invoiceable',
  /** Invoice create / resubmit (BR-01, BR-02): every line is drawn from a
   *  received goods receipt of the supplier's own PO, at the PO unit price, for
   *  at most the accepted quantity not yet invoiced; the invoice date is a date
   *  and the tax invoice is attached. */
  INVOICE_LINES_FROM_RECEIPTS: 'invoice_lines_from_receipts',
  /** Invoice create / resubmit (AC-02): no other invoice from the same supplier
   *  carries the same invoice number. */
  INVOICE_NUMBER_UNIQUE: 'invoice_number_unique',
  /** Receipt discrepancy answer (REQ-E07-06 AC-03): the receipt has a derived
   *  discrepancy, has not been answered yet, and the comment is substance. */
  RECEIPT_DISCREPANCY_ANSWERABLE: 'receipt_discrepancy_answerable',
  /** Receipt discrepancy resolution: PTI's comment is substance, not presence. */
  RECEIPT_DISCREPANCY_RESOLUTION_AUTHORED: 'receipt_discrepancy_resolution_authored',
  /** Call-off release / draft (REQ-E09-01 BR-02): the umbrella PO is approved and
   *  open, the line exists, the quantity is positive, the need date is a date on
   *  or after today, and the type is JIT or forecast-based. */
  CALLOFF_LINE_VALID: 'calloff_line_valid',
  /** Call-off release / change (BR-04, CR-04): the quantity and its value stay
   *  within what remains on the umbrella PO line. */
  CALLOFF_WITHIN_REMAINING: 'calloff_within_remaining',
  /** Draft edit / call-off change: a reason is given, and a new quantity or
   *  need date is valid. */
  CALLOFF_EDIT_VALID: 'calloff_edit_valid',
  /** Call-off change: nothing has been dispatched yet and no confirmation is
   *  waiting for the planner. */
  CALLOFF_CHANGEABLE: 'calloff_changeable',
  /** Dismiss a draft / supplier rejection: the reason is substance. */
  CALLOFF_REASON_AUTHORED: 'calloff_reason_authored',
  /** Supplier confirmation (REQ-E09-03 BR-02): the answer is well formed for
   *  its kind (a changed date, a changed quantity, two dated deliveries). */
  CALLOFF_CONFIRMATION_VALID: 'calloff_confirmation_valid',
  /** Planner approval / rejection: a confirmation is waiting for approval. */
  CALLOFF_AWAITING_APPROVAL: 'calloff_awaiting_approval',
  /** Planner rejection of a confirmation: the comment is substance. */
  CALLOFF_REVIEW_COMMENT_AUTHORED: 'calloff_review_comment_authored',
  /** Dispatch heads-up (REQ-E09-04): the confirmation is accepted, the dates are
   *  dates with arrival on or after shipping, and the quantity is positive. */
  CALLOFF_DISPATCH_VALID: 'calloff_dispatch_valid',
  /** ASN create (REQ-E09-03 BR-06): an ASN naming a call-off needs that call-off
   *  to be on the same PO and confirmed. A PO-level ASN is unaffected. */
  ASN_CALLOFF_CONFIRMED: 'asn_calloff_confirmed',
  /** Stock submission detail (REQ-E08-02 BR-06): supplier ROP and in-production
   *  quantity are non-negative numbers, the completion date is a date, and the
   *  channel is template or manual (API and PTI channels are set by the target). */
  INV_DECLARE_DETAIL_VALID: 'inv_declare_detail_valid',
  /** Supplier access grant (REQ-E08-03): the supplier is in the inventory model
   *  and every named material is one it supplies. */
  STOCK_ACCESS_SCOPE_VALID: 'stock_access_scope_valid',
  /** API sync (REQ-E08-02 BR-03): the supplier is API-connected. */
  STOCK_SYNC_CONNECTED: 'stock_sync_connected',
  /** Capacity submission (REQ-E08-04): weeks inside the 13-week horizon, valid
   *  quantities, and a starter reason for every week below demand. */
  CAPACITY_SUBMISSION_VALID: 'capacity_submission_valid',
  /** Closing an alert (REQ-E08-05): the action note is substance. */
  ALERT_ACTION_NOTE_AUTHORED: 'alert_action_note_authored',
  /** Invoice match: the match sub-flow must have rolled up to a clean Matched
   *  before the header can advance Submitted → Matched (census G2). */
  INVOICE_ROLLUP_MATCHED: 'invoice_rollup_matched',
  /** RR submit (SDC-2a): payload.planVersion must be the referenced
   *  publication's own planVersion — the snapshot binding is un-falsifiable. */
  RR_SUBMIT_PLANVERSION_BOUND: 'rr_submit_planversion_bound',
  // SDC-2b-EXT — the symmetric class guards (the honesty lock). Together they
  // make commitmentClass ⟺ verb exactly 1:1, so the shared create can branch on
  // the PUBLISHED class (authoritative our-side data) and never silently
  // transmute a commitment into an acknowledgment or vice versa.
  /** RR submit: the fanned line must NOT be visibility-only (a "confirmed
   *  commitment" against a no-commitment class would be a fabricated claim). */
  RR_SUBMIT_COMMITMENT_CLASS: 'rr_submit_commitment_class',
  /**
   * RR submit: `confirmedQty` must be a FINITE number and NOT NEGATIVE.
   *
   * ⚠️ **THE FLOOR IS `>= 0`, NOT `> 0`, AND THE DIFFERENCE IS RATIFIED.**
   * `PO_CONFIRM_QTY_WITHIN_ORDERED` — the neighbouring verb that already
   * enforces this shape on a field of the same name — requires `q > 0`, because
   * a purchase-order line confirmed at zero is a line that should not have been
   * confirmed. A forecast response is the opposite case: **a TYPED 0 is the
   * legal "cannot supply at all" short confirmation (F-2)** and is recorded as
   * the commitment it is (`submitModel.ts`). Copying the neighbour's bound
   * verbatim would have refused the one answer this verb exists to carry.
   *
   * `Number.isFinite` rather than `typeof === 'number'` — the 2f-c SE-Team spec
   * edit, for the same reason it was made there: `typeof NaN === 'number'`, and
   * NaN fails every comparison silently, so a hand-crafted dispatch could stamp
   * `confirmedQty: NaN` into the store and poison every Σ that reads it.
   *
   * ⚠️ **WHAT THIS HOOK DOES NOT DO, AND CANNOT.** It validates the VALUE, never
   * the READING — 2400 and 2.4 are both finite and non-negative. That gap is now
   * closed by its neighbour below rather than held open; `SUB-01` was the witness
   * that failed the day it closed, and it is INVERTED, not deleted.
   */
  RR_SUBMIT_QTY_FLOOR: 'rr_submit_qty_floor',
  /**
   * RR submit — THE QUANTITY AGREES WITH THE TOKEN IT WAS READ FROM.
   *
   * The floor above proves the VALUE; this proves the READING, by re-running the
   * one legal parser (`normalizeQty`) over the raw token the caller shipped and
   * requiring the result to equal the number the caller declared.
   *
   * ⚠️ **THIS IS NOT THE GUARD THAT WAS FIRST RULED, AND THE DIFFERENCE IS THE
   * POINT.** The ruling asked for `LOCALE_MISMATCH`: the transition would compare
   * the convention on the draft against a `locale` the datasheet carries per row.
   * Measured, there is no such field and there cannot be one without a new type —
   * `GridRow` is `Record<string, string>`, the concrete datasheet row is
   * `{ batchNumber, qty, expiryDate }`, and the convention exists exactly ONCE PER
   * PARSE CALL on `GridContext.numberFormatHint`, which never enters a draft or a
   * payload. **A MISMATCH CHECK NEEDS TWO INDEPENDENTLY-SUPPLIED LOCALES AND THERE
   * IS ONE**, so a `LOCALE_MISMATCH` authored against this tree would have compared
   * the single convention with itself, refused nothing, and shipped green —
   * `EMPTY-INPUT-REPORTS-CLEAN-01` (§42b) wearing a guard's clothes.
   *
   * The second witness is not a second locale. It is the RAW TOKEN, which the
   * surface has always had and always discarded. That makes the guard:
   *   · a caller that parses under one convention and DECLARES another — caught,
   *     because re-parsing under the declared convention yields a different number
   *     than the one shipped;
   *   · a caller that parses correctly and ships a different number — caught;
   *   · an ambiguous token declared as one of its two readings — caught, because
   *     the hint-free re-parse refuses AMBIGUOUS_QTY at the TRANSITION and not
   *     only at the surface;
   *   · a hand-crafted dispatch carrying a bare number and NO token — caught, and
   *     this is the case `requiredFields` cannot see alone: rule 5 is `isEmpty`,
   *     and `isEmpty('   ')` is false.
   *
   * ⚠️ **THE HONEST COST, STATED AS THE BATCH'S COST AND NOT AS A CAVEAT.** This
   * moves the parse INTO the contract and leaves the thing that makes it correct
   * OUTSIDE it. The convention is still supplied by the caller, and nothing here
   * can tell a truthful `'id'` from a mistaken one: a caller that reads an
   * Indonesian typist's "1.234" under a declared `'en'` produces 1.234, declares
   * 1.234, and agrees with itself perfectly. What changed is that a caller must now
   * be INTERNALLY CONSISTENT, which is strictly more than it had to be. It is not
   * the same thing as being right, and no guard at this layer can be.
   *
   * ⚠️ **ABSENCE OF `numberConvention` MEANS HINT-FREE, WHICH IS THE STRICTER
   * READING.** A caller that omits it gets a parse that REFUSES cross-convention
   * ambiguity rather than resolving it, so forgetting the field can only tighten
   * this guard, never loosen it. That direction is deliberate: an optional field
   * whose absence RELAXED a check would be the `isEmpty` defect one layer up.
   */
  RR_SUBMIT_QTY_AGREES: 'rr_submit_qty_agrees',
  /**
   * REQ-E06-02 BR-04 / AC-02 — a commitment below the line's forecast needs a
   * starter reason code (section 3.6), and `other` needs a note. Enforced at
   * the verb, so screen, upload and a hand-made dispatch are held to it alike.
   */
  RR_SUBMIT_SHORTFALL_REASON: 'rr_submit_shortfall_reason',
  /**
   * REQ-E06-02 BR-08 — a commitment to a forecast version carries a commitment
   * date, and an upside quantity when given is a number of zero or more.
   */
  RR_SUBMIT_COMMITMENT_DETAIL: 'rr_submit_commitment_detail',
  /** REQ-E06-01 BR-02 — publish names a forecast stream (packaging or raw material). */
  FORECAST_PUBLISH_VALID: 'forecast_publish_valid',
  /**
   * REQ-E06-03 BR-05 — reassign moves a line of the CURRENT version to a
   * different supplier qualified for the material, with a note.
   */
  FORECAST_REASSIGN_VALID: 'forecast_reassign_valid',
  /**
   * RR dispute / resolve: the authored text must be SUBSTANCE, not presence.
   *
   * ⚠️ **THE DISPATCHER'S `requiredFields` RULE IS `isEmpty`, AND `isEmpty('   ')`
   * IS FALSE.** So is `isEmpty(0)`, `isEmpty(false)` and `isEmpty({})`. A
   * required text field therefore admits a space bar, a number and an object —
   * which is the RR_SUBMIT_QTY_FLOOR lesson on a string: presence is not a
   * value, and **an omitted field passes a check written for a bad one**
   * (operator, the quantity batch). This hook is what makes "required" mean
   * "somebody wrote something".
   *
   * It proves the text is a NON-BLANK STRING. It cannot prove the text is TRUE,
   * relevant, or responsive — no value-level guard can, exactly as the qty floor
   * cannot tell 2400 from 2.4. That limit is stated, not papered over.
   */
  RR_DISPUTE_TEXT_AUTHORED: 'rr_dispute_text_authored',
  /** RR acknowledge: the fanned line MUST be visibility-only (an acknowledge
   *  can never dodge the commitment floor on a firm/semi-firm line). */
  RR_ACKNOWLEDGE_VISIBILITY_CLASS: 'rr_acknowledge_visibility_class',
  /** Inventory declare (SDC-3a, total-first): when batch detail is present,
   *  Σ batch qty must equal totalQty — a total that disagrees with its own
   *  detail is a fabricated number. */
  INV_DECLARE_BATCH_TOTAL: 'inv_declare_batch_total',
  // SDC-3a — the symmetric direction guards (the SDC-2b-EXT class-guard
  // discipline applied to shipment direction ⟺ ASN linkage, exactly 1:1).
  /** Shipment report: to-paragon MUST link a resolvable ASN (converges on the
   *  ASN machine — link, never duplicate; design §2.3). */
  ISH_TOPARAGON_ASN_LINKED: 'ish_toparagon_asn_linked',
  /** Shipment report: principal-to-distributor must NOT carry an asnRef
   *  (Paragon is not the consignee — no ASN exists for that leg). */
  ISH_P2D_NO_ASN: 'ish_p2d_no_asn',
  /** Shipment report: principal-to-distributor is legal ONLY for a supplier
   *  whose relationship for the material is distributor — a manufacturer has
   *  no principal leg (design §7). */
  ISH_P2D_DISTRIBUTOR_ONLY: 'ish_p2d_distributor_only',
  // ── CP-2 · B1 — the MASTER-MISS refusals (operator ruling D-OPS-MASTERMISS) ──
  /** Any SDC write verb: `payload.materialCode` must be a code the MATERIAL
   *  MASTER names. Creation scope already proves the supplier COLLABORATES on
   *  the material, but membership there is relationships ∪ publications — NOT
   *  the master — so a relationship row naming a code the master lacks would
   *  reach `create` and take a fabricated unit. This proves the unit EXISTS
   *  before anything is stamped with one. Refused by name: UNKNOWN_MATERIAL. */
  SDC_MATERIAL_KNOWN: 'sdc_material_known',
  /** GR create: every `inspectionResults[].materialCode` must appear on the
   *  PARENT shipment's / ASN's own line items.
   *
   *  NOT a material-master check — deliberately. The GR lane's documents live
   *  in the mock*.ts identity space (~30 codes), of which the five-entry SDC
   *  master names two (MASTER-STRADDLE-01), so a master gate here would refuse
   *  nearly every legitimate receipt. This gate is the ratified collision
   *  principle applied instead — identity settled by DECLARED OWNERSHIP, never
   *  by content plausibility: a receipt may only inspect what its parent
   *  document actually declared arrived. Strictly STRONGER than a master check
   *  at this seam (it also refuses a master-valid code the ASN never named). */
  GR_INSPECTION_MATERIALS_DECLARED: 'gr_inspection_materials_declared',
  /** Enforcement set (CP-3 · E2): the recorded relaxation must be GOVERNED —
   *  a mode this build recognises, a well-formed actor attribution, a review
   *  date on anything below BLOCK, and A NAMED ACTOR ON ANY LOOSENING.
   *  Tightening is always legal, so the safest act needs no permission. */
  ENFORCEMENT_SET_GOVERNED: 'enforcement_set_governed',
  // The privilege grant. Refuses a cross-tenancy add BY NAME, per atom — a
  // surface can prevent the gesture, only the verb can prevent the act.
  ROLE_GRANT_GOVERNED: 'role_grant_governed',
  /**
   * BL-51 — one 3PL on the administrator's list: a well-formed id, a name no
   * other 3PL on the list carries, an `https://` tracking address with exactly
   * one `{tracking}`, a boolean `active`, and a well-formed attribution.
   */
  THREE_PL_GOVERNED: 'three_pl_governed',
  /**
   * BL-50 — a ruling on one day of the hub's working calendar: the date is one
   * the SAP load covers, the kind is working or non-working, the reason is
   * SUBSTANCE rather than presence (`requiredFields` admits a space bar), and
   * the attribution is well formed. The same predicates re-validate a stored
   * ruling on read, so a hand-edited store is held to the verb's rule.
   */
  CALENDAR_DAY_GOVERNED: 'calendar_day_governed',

  /**
   * PR reject (§67): the rejection reason must be SUBSTANCE, not presence.
   *
   * ⚠️ **THE SAME GUARD AS `RR_DISPUTE_TEXT_AUTHORED`, ON THE SAME GROUND, AND
   * IT IS A DELIBERATE SECOND INSTANCE RATHER THAN A SHARED HOOK.** The two
   * verbs read DIFFERENT payload fields (`rejectionReason` / `disputeReason`)
   * and refuse in different words, so a shared implementation would have to
   * branch on `toState` to know which field it was proving — which is exactly
   * the fragility `RR_DISPUTE_TEXT_AUTHORED`'s own header warns about, where
   * `t_requirementresponse_review` ALSO lands on `UnderReview` and `toState`
   * alone cannot separate a resolution from a review.
   *
   * It proves a NON-BLANK STRING. It cannot prove the text is true, relevant or
   * responsive; no value-level guard can. `requiredFields` alone would not even
   * reach that bar — `isEmpty('   ')` is false.
   */
  PR_REJECT_REASON_AUTHORED: 'pr_reject_reason_authored',

  /**
   * §68 — the revision note is SUBSTANCE, not presence. The exact twin of
   * `PR_REJECT_REASON_AUTHORED` one edge over, and a THIRD deliberate instance
   * of the same two-line guard rather than a shared "non-blank text" hook: the
   * three read different payload fields, and a shared hook would have to branch
   * on `toState` to know which — a conditional inside a guard, so that reading
   * the guard no longer tells you what it guards.
   */
  PR_REVISION_NOTE_AUTHORED: 'pr_revision_note_authored',

  /**
   * §68 — an approval NAMES ITS DECIDER, from the session and never from the
   * payload (C10 §6.2). Two obligations in one hook because they are two halves
   * of one rule: the session must carry an actor, and a caller must not be able
   * to supply one. The second half is §6.2's *"REFUSED BY NAME ON WRITE"*,
   * which had no implementation anywhere in the tree before this.
   */
  PR_APPROVAL_ATTRIBUTED: 'pr_approval_attributed',

  // ── B1 · SUPPLIER APPLICATION — the three guards on the birth and the
  //    refusal of an application ───────────────────────────────────────────
  /**
   * Application submit: `requestType` must be one of the three the platform
   * recognises. `requiredFields` proves PRESENCE, so without this an off-list
   * token reaches `create` and is stored as a request type nothing can read —
   * the `QUOTATION_SUBMIT_CURRENCY_PERMITTED` shape, and the same remedy:
   * refuse an unknown token BY NAME rather than coerce it to a default.
   */
  APPLICATION_REQUEST_TYPE_KNOWN: 'application_request_type_known',
  /**
   * Application submit: an application naming an EXISTING vendor must name one
   * the governed roster actually holds.
   *
   * ⚠️ **THIS IS THE C4b RESOLUTION, AND IT IS A HOOK BECAUSE THE C4b *FLAG*
   * CANNOT CARRY IT — MEASURED, NOT ASSUMED.** `requireCreationOwner` is
   * per-TARGET and all-or-nothing: the dispatcher refuses any buyer creation
   * whose `creationOwner` returns null (`dispatcher.ts`, the buyer branch). Two
   * of the three request types have NO existing vendor by definition, so their
   * owner is legitimately null — setting the flag would refuse every External
   * SR and every KOL, which is the majority of the population and the whole
   * point of the lane.
   *
   * **What is preserved is the thing the flag exists for: A PAYLOAD ECHO IS NOT
   * A RESOLUTION** (operator ruling, Wave E / #284). The resolution still runs
   * in `creationOwner` — against the roster, in the data layer that owns it —
   * and this hook is what makes it BINDING for the one request type it applies
   * to. The hook reads it through `ctx.target`, so no roster knowledge crosses
   * into the transitions layer and there is exactly one resolver.
   */
  APPLICATION_INTERNAL_VENDOR_RESOLVED: 'application_internal_vendor_resolved',
  /**
   * Application reject: the reason must be SUBSTANCE, not presence — the fourth
   * deliberate instance of this two-line guard rather than a shared "non-blank
   * text" hook, for the reason `PR_REJECT_REASON_AUTHORED` states: the four read
   * different payload fields, and a shared hook would have to branch on
   * `toState` to know which, so that reading the guard no longer tells you what
   * it guards.
   */
  APPLICATION_REFUSAL_AUTHORED: 'application_refusal_authored',
  /**
   * Application submit: if the payload carries declarations, every one of them
   * must name a known subject and carry a reference with something in it.
   *
   * ⚠️ **REFUSED, NOT FILTERED.** The tempting build reads the well-formed
   * entries and drops the rest, which leaves the applicant believing they
   * declared four documents and the record holding three — a silent
   * subtraction from data somebody actually supplied. Declarations are
   * OPTIONAL (an application carrying none is legal and common); a
   * declarations key that is present and malformed is not.
   */
  APPLICATION_DECLARATIONS_WELL_FORMED: 'application_declarations_well_formed',

  // ── REQ-E03-01 to REQ-E03-05 · RFx MANAGEMENT ────────────────────────────
  /**
   * RFI create (REQ-E03-02): the event names a template Procurement keeps, a
   * readable deadline, and — when the buyer edited the question set — questions
   * whose kinds this build recognises. `requiredFields` proves presence only, so
   * without this an unknown template id would mint an event with no questions
   * at all and a supplier would be sent an empty form.
   */
  RFI_CREATE_VALID: 'rfi_create_valid',
  /**
   * RFI / RFP / RFQ publish: the event has at least one invitee, and every
   * invitee is a supplier the invitee filter would return (REQ-E03-01 BR-04).
   *
   * ⚠️ **THE SECOND HALF IS THE ONE THAT MATTERS.** A screen that hides
   * suspended suppliers from the picker does not stop an event whose draft was
   * built before the supplier was suspended — nor a dispatch that never opened
   * the picker. The status is re-read at PUBLICATION, which is the moment the
   * invitation actually goes out.
   */
  RFX_PUBLISH_HAS_INVITEES: 'rfx_publish_has_invitees',
  /**
   * RFI / RFP / RFQ extend (REQ-E03-02 / -03 edge cases): the new date is a
   * readable date and is LATER than the deadline in force. A date that moves
   * earlier is not an extension — it would retroactively close a window
   * suppliers are still answering in — and any named invitees must be invitees.
   */
  RFX_EXTEND_VALID: 'rfx_extend_valid',
  /**
   * RFI / RFP response save: the supplier is an invitee of an OPEN event.
   * Creation scope proves the payload names the supplier's own id; this proves
   * the supplier was asked at all.
   */
  RFX_RESPONSE_INVITED: 'rfx_response_invited',
  /**
   * RFI submit (REQ-E03-02 template rule): every REQUIRED question is answered,
   * and the response deadline in force for this supplier has not passed. The
   * refusal names the questions, so it is a refusal a supplier can act on.
   */
  RFI_SUBMIT_COMPLETE: 'rfi_submit_complete',
  /**
   * RFP create (REQ-E03-04): every term row names a term from the STANDARD
   * LIST and carries PTI's requested value. An off-list term id would produce a
   * comparison column no supplier's answer can be read against.
   */
  RFP_CREATE_TERMS_KNOWN: 'rfp_create_terms_known',
  /**
   * RFP submit (REQ-E03-04): every term the buyer asked for is answered, every
   * answer takes a stance, and **a Deviate carries a comment**. The deviation
   * is what changes the deal; a deviation nobody explained is not an answer.
   */
  RFP_SUBMIT_TERMS_ANSWERED: 'rfp_submit_terms_answered',
  /**
   * Quotation submit (REQ-E03-03 AC-05): no quote after the response deadline
   * in force for THIS supplier (its own extension, or the event's).
   */
  QUOTATION_SUBMIT_BEFORE_DEADLINE: 'quotation_submit_before_deadline',
  /**
   * Quotation submit / revise (REQ-E03-03): when the quote carries per-item
   * lines, every line names an item once, with a positive quantity and a
   * positive unit price. A quote without lines is the single-price quote that
   * has always been legal, so this refuses malformed detail and never absence.
   */
  QUOTATION_LINES_WELL_FORMED: 'quotation_lines_well_formed',
  /**
   * Quotation submit / revise (RFx spec 2026-09-21, "Supplier response"): on an
   * RFQ with items, the quote answers every item — each required supplier spec
   * field, a price at every quantity break, an amount for every requested
   * one-time cost — alternatives only where allowed, the required questions in
   * their type, and a sample offer when samples were requested. On an RFQ
   * without items the per-item fields are refused by name. The confidentiality
   * terms must be accepted first, and a supplier that declined cannot quote.
   */
  QUOTATION_TIERED_WELL_FORMED: 'quotation_tiered_well_formed',
  /** RFQ intent (RFx spec): invited, the event open and inside its deadline,
   *  one intent per invitee, a decline with a listed reason and words. */
  RFQ_INTENT_VALID: 'rfq_intent_valid',
  /** RFQ confidentiality: the RFQ is confidential, the supplier invited, and
   *  the terms not accepted already. */
  RFQ_CONFIDENTIALITY_ACCEPTABLE: 'rfq_confidentiality_acceptable',
  /** RFQ clarification ask: invited, the event open, and a real question. */
  RFQ_CLARIFICATION_ASKABLE: 'rfq_clarification_askable',
  /** RFQ clarification answer: an answer with substance, private or published. */
  RFQ_CLARIFICATION_ANSWERABLE: 'rfq_clarification_answerable',
  /**
   * Quotation revise (REQ-E03-05 BR-03): the round exists, is open, its
   * deadline has not passed, and **this supplier was invited to it**. Being on
   * the RFQ is not enough — a round is a shortlist, and letting an uninvited
   * bidder revise would make the shortlist decorative.
   */
  QUOTATION_REVISE_IN_ROUND: 'quotation_revise_in_round',
  /**
   * Negotiation round open (REQ-E03-05 BR-03): the RFQ exists and is not
   * already awarded, the deadline is a readable date, and every invited
   * supplier actually quoted on this RFQ.
   */
  NEGOTIATION_ROUND_VALID: 'negotiation_round_valid',
  /**
   * RFQ award (REQ-E03-05 BR-06 / BR-07): **each item's shares total 100%**,
   * every share and quantity is positive, and an award that does NOT follow the
   * best-scored quote carries a reason.
   *
   * ⚠️ **BOTH HALVES ARE POLICY, NOT VALIDATION.** A split that totals 90%
   * leaves a tenth of the demand placed nowhere and reads on screen as a
   * complete award; an award that passes over the top-ranked quote with no
   * reason is exactly the decision the charter's audit trail exists to explain.
   * Neither is a field being empty, so neither is expressible in
   * `requiredFields`.
   */
  RFQ_AWARD_GOVERNED: 'rfq_award_governed',
} as const;

for (const name of Object.values(POLICY_HOOKS)) registerPolicyHook(name);
