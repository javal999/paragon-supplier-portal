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
  /** MR-6 BR-08 — a shelf-life exception request: the ASN would pass every
   *  submission check but the shelf-life rule, at least one line fails that
   *  rule, and the reason is substance (`asnLineRefusal`, `onlyShelfLifeRefused`). */
  ASN_SHELF_LIFE_EXCEPTION_ONLY: 'asn_shelf_life_exception_only',
  /** MR-6 BR-08 — a shelf-life exception rejected with a reason of substance. */
  ASN_SHELF_LIFE_REASON_GIVEN: 'asn_shelf_life_reason_given',
  /** MR-6 edge case 1 — an ETA change on a submitted ASN is legal only when its
   *  approved exception no longer covers the new ETA (`etaNeedsReapproval`). */
  ASN_ETA_NEEDS_REAPPROVAL: 'asn_eta_needs_reapproval',
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
  /**
   * Call-off release (X-03, owner decision 2026-09-23): a call-off whose origin
   * is the forecast engine (a draft the Order plan created) is not released to
   * the supplier while the engine dataset is not live — simulated output is
   * never shown to a supplier. Call-off CHANGE too (REQ-E14-13 BR-08): a change
   * the reschedule report sends names the engine as its origin and is refused
   * the same way. Reads the call-off through `target.readEntity`
   * and the liveness registry's `isLive('engineDataset')` at call time.
   * Refused by name: ENGINE_DATA_SIMULATED. Ordinary call-offs are untouched.
   */
  CALLOFF_ENGINE_DATA_LIVE: 'calloff_engine_data_live',
  /**
   * "Taken to SAP" (REQ-E14-13 BR-07): the line is an open PO line of the
   * engine's dataset, the proposal type is one of the four, the quantity is a
   * whole non-negative number no larger than the line, and a date (except for a
   * cancellation) is a real date on or after today.
   */
  SAP_CHANGE_MARK_VALID: 'sapchange_mark_valid',
  /**
   * "Taken to SAP" (X-03, ENG-B24): refused while the engine dataset is not
   * live — a change taken to SAP reaches the supplier through SAP, so a
   * proposal calculated on simulated data may not be taken there. Refused by
   * name: ENGINE_DATA_SIMULATED.
   */
  SAP_CHANGE_ENGINE_DATA_LIVE: 'sapchange_engine_data_live',
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
  /** Closing an alert (REQ-E08-05, MR-9 BR-04): an active `alertClose` reason,
   *  and a note when it is "Other". Refusals REASON_UNKNOWN, NOTE_REQUIRED. */
  ALERT_CLOSE_REASON_GIVEN: 'alert_close_reason_given',
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
  /**
   * BL-133 (ENG-D19, REQ-E06-02 BR-11 / BR-12) — the pokayoke. A commitment to
   * a forecast version is SUBMITTED only when the supplier has confirmed
   * capacity for every horizon week its period touches (refused by name
   * CAPACITY_NOT_CONFIRMED), and a period whose group LTP is above BE
   * (capacity + additional capacity) in one of those weeks carries a starter
   * reason (ABOVE_BE_NEEDS_REASON; `other` needs a note). Runs on the
   * promotion, which is the submission — a draft is not gated.
   */
  RR_PROMOTE_CAPACITY_CONFIRMED: 'rr_promote_capacity_confirmed',
  /** REQ-E06-01 BR-02 — publish names a forecast stream (packaging or raw material). */
  FORECAST_PUBLISH_VALID: 'forecast_publish_valid',
  /**
   * REQ-E14-06 (X-03, ENG-B35) — a publication whose source is the forecast
   * engine (`source: 'engine'`) is refused: while the engine dataset is not
   * live, by name ENGINE_DATA_SIMULATED (simulated output is never shown to a
   * supplier); once it is live, by name C8_ENGINE_SOURCE_UNRATIFIED until SOMO
   * ratifies C8 §8 (the portal computing the totals, BL-101). Reads the
   * liveness registry's `isLive('engineDataset')` at call time. A publication
   * that names no source (SAP's plan, as today) is untouched; any other source
   * is refused by name.
   */
  FORECAST_ENGINE_PUBLISH_ALLOWED: 'forecast_engine_publish_allowed',
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
   * Material A1 (MR-1 BR-02) — a supplier's stock update mode: the supplier is
   * on the master (UNKNOWN_SUPPLIER) and the value is `api` or `manual`
   * (UPDATE_MODE_INVALID). The rule is `supplierUpdateModeRefusal`, the one the
   * admin page's pre-check calls.
   */
  SUPPLIER_UPDATE_MODE_VALID: 'supplier_update_mode_valid',
  /**
   * Material G1 (MR-10 BR-04) — the documents one qualification level requires:
   * a known level (QUALIFICATION_LEVEL_UNKNOWN), a well-formed, non-repeating
   * list (QUALIFICATION_RULE_INVALID), and a Preferred list that includes every
   * Approved document (PREFERRED_MISSING_APPROVED). The rule is
   * `qualificationRuleRefusal`, the one the admin page's pre-check calls.
   */
  QUALIFICATION_RULE_VALID: 'qualification_rule_valid',
  /**
   * Material G2 (MR-10 BR-06) — one key of the sourcing type map: a known
   * category or purchasing group (SOURCING_TYPE_KEY_UNKNOWN) set to direct or
   * indirect (SOURCING_TYPE_INVALID). The rule is `sourcingTypeRefusal`, the
   * one the admin page's pre-check calls.
   */
  SOURCING_TYPE_GOVERNED: 'sourcing_type_governed',
  /**
   * Material C5 (MR-8 BR-01, BR-03, AC-04) — a planning-group change: a name is
   * not blank (NAME_REQUIRED), a new group sits under an SAP group with
   * materials (UNKNOWN_SAP_GROUP), a move names known materials of the group's
   * own SAP group not already in it (NO_MATERIALS, UNKNOWN_MATERIAL,
   * MIXED_SAP_GROUP, ALREADY_IN_GROUP), and a retired group is empty
   * (RETIRE_NOT_EMPTY). The rule is `planningGroupRefusal`, the one the admin
   * page's pre-check calls.
   */
  PLANNING_GROUP_VALID: 'planning_group_valid',
  /**
   * Material C4 (MR-5 BR-02) — one MRP controller on the administrator's list:
   * the code is SAP-shaped (MRP_CONTROLLER_CODE_INVALID), it has a name
   * (MRP_CONTROLLER_NAME_REQUIRED) and at least one hub user label
   * (MRP_CONTROLLER_USERS_REQUIRED). The rule is `mrpControllerRefusal`, the
   * one the admin page's pre-check calls.
   */
  MRP_CONTROLLER_GOVERNED: 'mrp_controller_governed',
  /**
   * BL-157 — unmapping an MRP controller code: the code is SAP-shaped
   * (MRP_CONTROLLER_CODE_INVALID) and has a mapping in force to remove
   * (MRP_CONTROLLER_NOT_MAPPED). The rule is `mrpControllerUnmapRefusal`, the
   * one the admin page's pre-check calls.
   */
  MRP_CONTROLLER_UNMAPPABLE: 'mrp_controller_unmappable',
  /**
   * Material C2 (MR-3 BR-05, AC-01, AC-05) — a supplier trade name: the
   * material is assigned to the supplier (NOT_ASSIGNED), the name is 2 to 80
   * characters (NAME_LENGTH), the supplier material number is at most 40
   * (SUPPLIER_NO_LENGTH), and a rejection carries a reason (REASON_REQUIRED).
   * The rules are in `materialNameRules.ts`, the ones the pages' pre-checks call.
   */
  MATERIAL_NAME_VALID: 'material_name_valid',
  /**
   * Material E1 (MR-7 BR-06, BR-08) — a planner input to the stock simulation:
   * a known supplier (UNKNOWN_SUPPLIER) and material (UNKNOWN_MATERIAL), one of
   * soh / inProduction / toDistributor (UNKNOWN_FIELD), a quantity of 0 or more
   * (INVALID_QUANTITY), and a date for inProduction and toDistributor only
   * (DATE_REQUIRED, INVALID_DATE, DATE_NOT_ALLOWED). The rule is
   * `simulationOverrideRefusal`, the one the simulation page's pre-check calls.
   */
  SIMULATION_OVERRIDE_VALID: 'simulation_override_valid',
  /**
   * BL-50 — a ruling on one day of the hub's working calendar: the date is one
   * the SAP load covers, the kind is working or non-working, the reason is
   * SUBSTANCE rather than presence (`requiredFields` admits a space bar), and
   * the attribution is well formed. The same predicates re-validate a stored
   * ruling on read, so a hand-edited store is held to the verb's rule.
   */
  CALENDAR_DAY_GOVERNED: 'calendar_day_governed',
  /**
   * BL-32 — one rule value the Hub administrator changes: a key the registry
   * defines (or a stale-period override), a value of the key's type inside its
   * bounds, the order rules that tie values together still holding after the
   * change (no negative %, no min above max, no band out of order), and a
   * well-formed attribution. Every refusal names the key and what was wrong.
   * The same predicate re-checks a stored change on read.
   */
  SETTING_GOVERNED: 'setting_governed',
  /**
   * BL-32 — one code on one reason list: a known list, a well-formed code,
   * non-empty English and Indonesian labels no other code on the list shows, a
   * boolean `active`, never the last offered code retired, and a well-formed
   * attribution. The same predicate re-checks a stored change on read.
   */
  REASON_CODE_GOVERNED: 'reason_code_governed',
  /**
   * REQ-E06-04 BR-06 — a maximum stock for one supplier × material: the entity
   * is `<supplierId>|<materialCode>`, the quantity a whole number above zero or
   * null to clear it, and a well-formed attribution.
   */
  MAX_STOCK_GOVERNED: 'max_stock_governed',

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
   * Material G2 (MR-10 BR-05, BR-07; plan AR-16) — on RFI, RFP and RFQ
   * publish, every invitee holds the level the event's sourcing type needs
   * (Direct: Preferred; Indirect: Approved or Preferred). Reads `invitees` on
   * an RFI / RFP and `invitedSupplierIds` on an RFQ. Refused
   * SUPPLIER_NOT_QUALIFIED naming the vendor — but only against a real list:
   * while the list for the needed level is the placeholder (owner ruling
   * 2026-09-29) publish passes and the event records `qualificationWarnings`.
   * The rule is `inviteesQualificationRefusal`.
   */
  RFX_INVITEES_QUALIFIED: 'rfx_invitees_qualified',
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
   * RFI / RFP response save (RFx authoring): a save that CARRIES ANSWERS is
   * refused while the event's confidentiality terms stand unaccepted
   * (`CONFIDENTIALITY_NOT_ACCEPTED`), and on an RFP with a T&C document while
   * the T&C stands unaccepted (`TC_NOT_ACCEPTED`). An acceptance-only save is
   * how the supplier accepts, so it passes. The READ withholds a confidential
   * event's content until then; this is the write-side half of the same gate.
   */
  RFX_RESPONSE_ACCEPTANCE_GATE: 'rfx_response_acceptance_gate',
  /**
   * RFI submit (REQ-E03-02 template rule): every REQUIRED question is answered,
   * and the response deadline in force for this supplier has not passed. The
   * refusal names the questions, so it is a refusal a supplier can act on.
   */
  RFI_SUBMIT_COMPLETE: 'rfi_submit_complete',
  /**
   * RFP create (REQ-E03-04 + RFx authoring): every term row is either a term
   * from the STANDARD LIST or a CUSTOM term (`custom-…`) carrying its own label,
   * value kind and — for a choice — options; every row carries PTI's requested
   * value in its kind. An off-list id WITHOUT the custom prefix is still refused
   * (`UNKNOWN_TERM`): it would be a comparison column nothing can label. The
   * optional questions, indicative-pricing and T&C sections are validated here
   * by the same predicates the template store reads.
   */

  RFP_CREATE_TERMS_KNOWN: 'rfp_create_terms_known',
  /**
   * RFP submit (REQ-E03-04): every term the buyer asked for is answered, every
   * answer takes a stance, and **a Deviate carries a comment**. The deviation
   * is what changes the deal; a deviation nobody explained is not an answer.
   */
  RFP_SUBMIT_TERMS_ANSWERED: 'rfp_submit_terms_answered',
  /**
   * RFI / RFP response save (NR-1 BR-05, D-3): every document the save carries
   * is a file record within the file limits. A draft is not held to the
   * required requests yet: that is the submit's rule.
   */
  RFX_RESPONSE_DOCUMENTS_WITHIN_LIMITS: 'rfx_response_documents_within_limits',
  /**
   * RFI / RFP response submit (NR-1 BR-03 to BR-05): `responseDocumentsRefusal`
   * over the stored documents and the event's requests: no unknown request, no
   * required request without a file (named), certificate fields present, and
   * the file limits.
   */
  RFX_RESPONSE_DOCUMENTS_COMPLETE: 'rfx_response_documents_complete',
  /**
   * RFI / RFP response save and revise (NR-1 BR-08, AC-07, D-6):
   * `responseWindowRefusal` — refused `RESPONSE_DEADLINE_PASSED` when the event
   * is not Open or the deadline in force for this supplier has passed. A
   * screen that hides "Revise" is not enough; the verb refuses.
   */
  RFX_RESPONSE_WINDOW_OPEN: 'rfx_response_window_open',
  /**
   * RFI / RFP response save (NR-1 BR-08, BR-10): `responseAlreadySubmittedRefusal`
   * — refused `RESPONSE_ALREADY_SUBMITTED` when this supplier's response to the
   * event is already Submitted. A submitted response changes only through
   * revise, which keeps the earlier version.
   */
  RFX_RESPONSE_NOT_SUBMITTED: 'rfx_response_not_submitted',
  /**
   * Quotation submit and revise (NR-1 BR-03 to BR-05, BR-09): the same rule over
   * the quote's documents and the RFQ's requests.
   */
  QUOTATION_DOCUMENTS_COMPLETE: 'quotation_documents_complete',
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
   * RFP firm-offer round open (NR-2 BR-02): the RFP is Closed, the options
   * exist (the buyer's or a submitted proposal's), the quantity points are
   * above zero, and every invitee submitted a response and passes CR-23.
   */
  RFP_OFFER_ROUND_VALID: 'rfp_offer_round_valid',
  /**
   * RFP firm offer submit / revise (NR-2 BR-01 / BR-03): an invited supplier,
   * an open round inside its deadline, prices only for the round's options and
   * points and above zero, and a validity reaching the round deadline.
   */
  RFP_FIRM_OFFER_VALID: 'rfp_firm_offer_valid',
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
   *
   * RFx C1 — ONE hook for the final award (`t_rfq_award`) and the partial
   * award (`t_rfq_award_partial`), told apart by the target state: the final
   * award may leave no item open (AWARD_ITEMS_OPEN), the partial award must
   * leave one (AWARD_NOTHING_OPEN). Everything else — the item rule
   * (`awardShapeRefusal`), CR-23, "on this event" and the reason — is the same
   * code for both, so the two verbs cannot drift.
   */
  RFQ_AWARD_GOVERNED: 'rfq_award_governed',
  /**
   * RFx C2 (NR-3 BR-09, D-7) — ONE hook for the cancel pair
   * (`t_rfq_award_cancel` → Closed, `t_rfq_award_cancel_partial` → Partly
   * awarded), told apart by the target state. Refuses AWARD_NOT_ACTIVE (the
   * award is not an active award of this event), AWARD_RAISED_IN_SAP (naming
   * the SAP document), AWARD_REASON_REQUIRED (blank reason) and
   * AWARD_CANCEL_TARGET_WRONG (the other verb of the pair fits: whether another
   * award stays in force). The rule is `awardCancelRefusal` in
   * `sourcing/awardStatus.ts`.
   */
  RFQ_AWARD_CANCEL_GOVERNED: 'rfq_award_cancel_governed',
  /**
   * RFx C2 (NR-3 BR-10) — "Raised in SAP": the award is an active award of this
   * event, not already marked (AWARD_RAISED_IN_SAP), and the SAP document number
   * is not blank. The rule is `awardSapMarkRefusal`.
   */
  RFQ_AWARD_SAP_GOVERNED: 'rfq_award_sap_governed',
  /**
   * RFx D2 (NR-2 BR-01, BR-05 to BR-08) — ONE hook for the RFP's final award
   * (`t_rfp_award`) and partial award (`t_rfp_award_partial`), told apart by
   * the target state. The C1 shape rule over `awardItemsOfRfp` (options of
   * closed firm-offer rounds; AWARD_ITEM_NOT_QUOTED / AWARD_OFFER_EXPIRED for a
   * line whose firm offer does not count), the open options (AWARD_ITEMS_OPEN /
   * AWARD_NOTHING_OPEN), AWARD_OPTION_SOURCED_ELSEWHERE for an option an RFQ
   * created from the RFP sources, CR-23 per awarded supplier, and
   * AWARD_REASON_REQUIRED on every RFP award.
   */
  RFP_AWARD_GOVERNED: 'rfp_award_governed',
  /** RFx D2 (NR-3 BR-09) — the cancel pair on an RFP; the rule is `awardCancelRefusal`. */
  RFP_AWARD_CANCEL_GOVERNED: 'rfp_award_cancel_governed',
  /** RFx D2 (NR-3 BR-10) — "Raised in SAP" on an RFP award; the rule is `awardSapMarkRefusal`. */
  RFP_AWARD_SAP_GOVERNED: 'rfp_award_sap_governed',
  /**
   * RFx D2 (NR-2 BR-08) — an RFQ created from an RFP may not source an option
   * an award in force on that RFP already placed (AWARD_OPTION_SOURCED_ELSEWHERE).
   * The rule is `rfpOptionSourcedRefusal`, the one the RFP → RFQ pre-fill uses.
   */
  RFQ_CREATE_RFP_OPTIONS_FREE: 'rfq_create_rfp_options_free',
} as const;

for (const name of Object.values(POLICY_HOOKS)) registerPolicyHook(name);
