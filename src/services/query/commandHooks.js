// ────────────────────────────────────────────────────────────────────────────
// Command hooks (v2.2 Step 3.6 + 3.10) — the write side of the query layer.
//
// The canonical mutation pattern: dispatch a command through the service seam →
// on a non-failed outcome, targeted invalidateQueries by scopeKey (procurement,
// current scope only) → the page re-derives from the mutated store. Pages hold
// NO local seeded copy.
// ────────────────────────────────────────────────────────────────────────────

import { maxStockEntityId } from '../transitions/maxStock';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDataService } from '../data/DataServiceContext';
import { useToast } from '@hooks/useToast';
import { classifySettleFault } from '../transitions/settleFaults';
import { DataError } from '../data/types';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { scopeKey } from './useServiceQuery';
/** @import { BidCurrency } from '@lib/currencyPolicy' */
/** @import { FxPinSource } from '@lib/fxPin' */
/** @import { CommandResult, CommandStatus, QueryScope, InspectionResult, CommandDecision, CertificateDeclaration, SupplierDocumentCategory, PoLineResponse, PoRejectionCause, InvoiceLine, CallOffDelivery, CallOffType, CallOffOrigin, StockUpdateMode, QualificationRequiredDoc, QualificationRuleLevel } from '../data/types' */
/** @import { AsnLineInput } from '../transitions/fulfilmentRules' */
/** @import { DelayAnswer } from '../transitions/callOffRules' */
/** @import { SourcingType, SourcingTypeKey } from '../sourcing/sourcingType' */
/** @import { ProposalType } from '../engine/reschedule' */
/** @import { SimulationOverrideField } from '../data/types' */
/** @import { ReasonListId } from '../transitions/reasonCodes' */
import { reasonCodeEntityId } from '../transitions/reasonCodes';
/** @import { WarehouseDecisionChoice } from '../transitions/warehouseDecisionRules' */
import { warehouseDecisionEntityId } from '../transitions/warehouseDecisionRules';
/** @import { ForecastStream } from '../sdc/types' */

/**
 * The COMMAND scope — tenancy plus the seat's business roles.
 *
 * ⚠️ **THIS IS THE PRODUCTION PATH THE WILDCARD RETIREMENT TURNS ON.** Every
 * governed act in the portal dispatches through a hook in this file, and every
 * one of them takes its scope from here. Before this arc the scope carried
 * tenancy only and the dispatcher widened it to the whole persona; now the
 * seat's roles travel with the command and the dispatcher resolves atoms from
 * THEM. A scope built anywhere else without roles is refused at the role gate
 * rather than silently granted 48 atoms — which is the whole point.
 * @returns {QueryScope}
 */
function useScope() {
  const { identity } = useCurrentIdentity();
  return {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    businessRoles: identity.businessRoles,
    actor: identity.actor
  };
}

// ── §90 · A `null` SETTLE IS A REFUSAL THAT TRAVELLED BY RETURN ─────────────
//
// ⚠️ **AND EVERY SURFACE READ IT AS SUCCESS.** `settle` resolves to
// `CommandStatus | null`, and `null` is a legitimate RESOLUTION rather than a
// rejection — so TanStack ran `onSuccess`, and all four call sites toast their
// success string there. MEASURED, with `settle` forced to `null` and nothing
// else changed:
//
//   · BuyerInvoices     → store `Releasing Payment`, `paymentRef: null`, toast
//     *"INV-2025-GIV-0892 — payment released · SAP assigned the FI document on
//     settlement."*
//   · BuyerGoodsReceipt → store `Posting to SAP`, `sapMaterialDoc: undefined`,
//     toast *"GR-2026-003 posted to SAP · SAP assigned the material document on
//     settlement."*
//
// **That is the law-0.6 claim the whole Option-B boundary exists to prevent** —
// the surface names a document SAP never assigned. It is NOT a silent no-op;
// silence would have been the milder defect.
//
// ⚠️ **THE FIX IS HERE AND NOT AT THE CALL SITES, FOR THE REASON THE HANDLER
// BELOW ALREADY GIVES.** `useSettleErrorToast` was put on the mutation precisely
// so *"a fourth settle call site cannot be silent by omission"*; a `null` that
// each site had to remember to check reinstates exactly the shape that comment
// retired. One conversion here reaches all four.
//
// ⚠️ **THE CODE IS `NOT_FOUND`, AND `SCOPE_DENIED` WOULD HAVE UNDONE #307.** The
// dispatcher answers `null` for *"no such command"* AND for *"not yours"*
// deliberately — that collision IS the remedy, because a distinguishing refusal
// is an existence oracle by refusal KIND. This boundary cannot tell the two
// apart and **must not appear to**, so it raises the code naming the only thing
// it actually knows: nothing reachable came back. Both codes classify `REFUSED`
// (`DISPATCHER_THROWN_CODES`), so the rendered outcome is identical either way —
// the choice is about what the wire value CLAIMS, not about what the user sees.
//
// `REFUSED` is not retryable, which is the honest disposition: a governed answer
// does not change on a second ask. No new copy: `settle.failed.REFUSED` already
// names the rule, the document's unchanged state and the futility of asking
// again, in EN and ID both.
/**
 * @param {(scope: QueryScope, correlationId: string) => Promise<CommandStatus | null>} settle
 * @param {QueryScope} scope
 * @param {string} correlationId
 * @returns {Promise<CommandStatus>}
 */
async function settleOrRefuse(settle, scope, correlationId) {
  const status = await settle(scope, correlationId);
  if (status === null) {
    // Diagnostic only — the surface renders `settle.failed.REFUSED`, and
    // `settleFaultDetail` reads the CODE, never this string.
    throw new DataError('NOT_FOUND', 'settle returned no reachable command status');
  }
  return status;
}

// ── §43 · THE SETTLE FAILURE SURFACE ────────────────────────────────────────
//
// ⚠️ **IT LIVES IN THE HOOK, AND THAT IS THE FIX.** Before this batch
// `commandHooks.js` contained ZERO `onError` handlers — a rejected settle was an
// unhandled mutation rejection: no toast, no banner, no i18n key. The document
// sat in 'Posting to SAP' or 'Releasing Payment' and nothing ever said why.
// That was not an oversight at one call site; it was the SHAPE — three call
// sites each had to opt in and none did. Putting the handler on the mutation
// itself means a fourth settle call site cannot be silent by omission.
//
// The string is chosen by the classified fault, so a permanent misconfiguration
// does not read as a retryable blip, and every branch names the document's state
// and whether asking again helps (`HALAL-REFUSAL-DEAD-ENDS-01` — a refusal that
// only reports failure is half a remedy).
//
// ⚠️ **THE REMEDY FOR TRANSPORT IS REAL, AND §91e HAD TO NAME *WHICH* ACTION
// BEFORE THAT SENTENCE WAS TRUE.** The line here read *"the same action
// genuinely re-attempts"*, which is right about the machine and was read at §91
// as a claim about `t_gr_post` — whose `from` excludes the interim state, making
// the whole remedy look like a machine change. It is not. The action that
// re-attempts is the SETTLE, on the SAME correlationId: `dispatcher.js` leaves a
// failed settle `submitted` with its `pending` context undeleted precisely so a
// second `settle()` completes. A re-POST would mint a SECOND correlationId and
// orphan the first, so widening `from` would have broken the thing it was meant
// to fix.
//
// ⚠️ **AND A TOAST IS NOT A REMEDY.** This handler names the remedy; the SURFACE
// has to offer it. Both consumers now hold the correlationId of the settles they
// started and render a retry on the interim state, gated on
// `SETTLE_FAULT_RETRYABLE` (`BuyerInvoices`, then `BuyerGoodsReceipt` at §91e).
/** @returns {(err: unknown, vars: { correlationId: string }) => void} */
function useSettleErrorToast() {
  const { toast } = useToast();
  const { t } = useTranslation();
  return (err, vars) => {
    const fault = classifySettleFault(err);
    toast({
      variant: 'error',
      title: t('settle.failed.title'),
      description: `${t(`settle.failed.${fault}`)} ${t('settle.failed.ref', {
        correlationId: vars.correlationId
      })}`
    });
  };
}

// Targeted invalidation: only the current scope's procurement reads (the last
// key element is the scopeKey), so a command never disturbs another supplier's
// cache and every derivation of THIS scope re-derives together.
function useInvalidateProcurement() {
  const qc = useQueryClient();
  return /** @param {QueryScope} scope */ (scope) => {
    const key = scopeKey(scope);
    qc.invalidateQueries({
      predicate: (q) => q.queryKey[0] === 'procurement' && q.queryKey[q.queryKey.length - 1] === key
    });
  };
}

/**
 * @typedef {object} PoConfirmVars
 * @property {string} poId
 * @property {number[]} confirmedQuantities
 * @property {string} [confirmedDeliveryDate] -  REQ-E07-02 Approve — the delivery date the supplier confirms. Optional so
 *    an older caller that sends quantities only still dispatches.
 * @property {string} [comment]
 */

/**
 * Confirm a purchase order (fires `t_po_confirm`). On a non-failed outcome,
 * invalidates the current scope's procurement reads so the PO list/detail
 * re-derive with the new Confirmed status.
 */
export function usePurchaseOrderConfirm() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, PoConfirmVars>} */ (useMutation)({
    mutationFn: ({ poId, confirmedQuantities, confirmedDeliveryDate, comment }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_po_confirm',
        entity: 'purchaseOrder',
        entityId: poId,
        payload: {
          confirmedQuantities,
          ...(confirmedDeliveryDate ? { confirmedDeliveryDate } : {}),
          ...(comment ? { comment } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * @typedef {object} PoAcknowledgeVars
 * @property {string} poId
 */

/**
 * Acknowledge a purchase order (fires `t_po_acknowledge`, Sent | Viewed →
 * Acknowledged).
 *
 * ⚠️ **`poId`, NOT `poNumber`, AND THE TWO KEY SPACES DO NOT OVERLAP.**
 * `purchaseOrderTarget` reads through `purchaseOrderStore.get(id)`, which
 * matches on `p.id` (`po-008`); `findPoByNumber` is a SEPARATE lookup on
 * `p.poNumber` (`PO-2025-00108`). Derived: the two sets intersect in ZERO
 * members, so passing a PO number here does not fail loudly — it resolves no
 * entity and the dispatcher throws `NOT_FOUND`. `usePurchaseOrderConfirm` takes
 * `poId` for the same reason and this mirrors it exactly.
 *
 * PAYLOAD-FREE, derived not chosen: the transition declares
 * `requiredFields: []` and `policyHooks: []`. It also shares
 * `applyTransition` with `t_po_confirm`, which writes `lineItems` from
 * `payload.confirmedQuantities` — with no payload that branch is skipped and
 * the ordered quantities are left untouched, which is the correct behaviour for
 * an act that commits to nothing.
 */
export function usePurchaseOrderAcknowledge() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, PoAcknowledgeVars>} */ (useMutation)({
    mutationFn: ({ poId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_po_acknowledge',
        entity: 'purchaseOrder',
        entityId: poId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ── PO response verbs (REQ-E07-02) and the shipping notice (REQ-E07-05) ────
// Same shape as confirm: dispatch through the seam, invalidate this scope's
// procurement reads on a non-failed outcome. `poId`, never `poNumber` (see
// `usePurchaseOrderAcknowledge`).

/**
 * @template {{ poId: string }} V
 * @param {string} transitionId
 * @param {(vars: V) => Record<string, unknown>} payloadOf
 */
function usePoCommand(transitionId, payloadOf) {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();
  return /** @type {typeof useMutation<CommandResult, Error, V>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId,
        entity: 'purchaseOrder',
        entityId: vars.poId,
        payload: payloadOf(vars)
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * @typedef {object} PoAdjustVars
 * @property {string} poId
 * @property {PoLineResponse[]} lineResponses
 * @property {string} [comment]
 */

/** Adjust a PO with a per-line counter-offer (fires `t_po_adjust`). */
export function usePurchaseOrderAdjust() {
  return /** @type {typeof usePoCommand<PoAdjustVars>} */ (usePoCommand)(
    't_po_adjust',
    ({ lineResponses, comment }) => ({
      lineResponses,
      ...(comment ? { comment } : {})
    })
  );
}

/**
 * @typedef {object} PoRejectVars
 * @property {string} poId
 * @property {PoRejectionCause[]} rejectionCauses
 * @property {string} [comment]
 */

/** Reject a PO (fires `t_po_reject`). */
export function usePurchaseOrderReject() {
  return /** @type {typeof usePoCommand<PoRejectVars>} */ (usePoCommand)(
    't_po_reject',
    ({ rejectionCauses, comment }) => ({
      rejectionCauses,
      ...(comment ? { comment } : {})
    })
  );
}

/** The planner accepts a counter-offer (fires `t_po_accept_counter`). */
export function usePurchaseOrderAcceptCounter() {
  return /** @type {typeof usePoCommand<{ poId: string }>} */ (usePoCommand)(
    't_po_accept_counter',
    () => ({})
  );
}

/**
 * @typedef {object} PoRejectCounterVars
 * @property {string} poId
 * @property {string} reviewComment
 */

/** The planner rejects a counter-offer with a comment (fires `t_po_reject_counter`). */
export function usePurchaseOrderRejectCounter() {
  return /** @type {typeof usePoCommand<PoRejectCounterVars>} */ (usePoCommand)(
    't_po_reject_counter',
    ({ reviewComment }) => ({
      reviewComment
    })
  );
}

/**
 * @typedef {object} PoShippingNoticeVars
 * @property {string} poId
 * @property {string} expectedCompletionDate
 */

/** Record or move the expected completion date (fires `t_po_shipping_notice`). */
export function usePurchaseOrderShippingNotice() {
  return /** @type {typeof usePoCommand<PoShippingNoticeVars>} */ (usePoCommand)(
    't_po_shipping_notice',
    ({ expectedCompletionDate }) => ({
      expectedCompletionDate
    })
  );
}

/**
 * @typedef {object} AsnCreateVars
 * @property {string} poReference
 * @property {string} [carrier]
 * @property {string} [threePlId] -  BL-51 — the 3PL picked from the list; omitted when the carrier is typed.
 * @property {string} [trackingNumber]
 * @property {string} [eta]
 * @property {AsnLineInput[]} [lines] -  REQ-E07-04 — shipped quantity, batch and expiry per PO line. Omitted, the
 *    draft proposes each line's open quantity.
 * @property {string} [shipDate]
 * @property {string} [packingListFile]
 * @property {string} [overShipReason] -  BR-02 — required when a line ships more than its open quantity.
 * @property {string} [callOffId] -  REQ-E09-03 BR-06 — the confirmed call-off this ASN ships, if any.
 * @property {boolean} [callOffFinal] -  MR-6 BR-10 — the last ASN for its call-off (a shortfall then warns).
 */

/**
 * Draft an ASN from a confirmed PO (fires the `creation` verb `t_asn_create`).
 * No entityId — the store assigns the ASN number, returned on the result. On a
 * non-failed outcome the ASN list AND the "awaiting ASN" panel re-derive.
 */
export function useAdvanceShipNoticeCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, AsnCreateVars>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_create',
        entity: 'advanceShipNotice',
        payload: { ...vars }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * @typedef {object} AsnSubmitVars
 * @property {string} asnNumber
 * @property {string} carrier
 * @property {string} [threePlId] BL-51 — the 3PL picked from the list. `''` clears a 3PL the draft named
 *   (the carrier typed by name instead); omitted keeps the draft's.
 * @property {string} trackingNumber
 * @property {string} eta
 * @property {string} [shipDate]
 * @property {AsnLineInput[]} [lines]
 * @property {string} [overShipReason]
 * @property {boolean} [callOffFinal] -  MR-6 BR-10 — the last ASN for its call-off; omitted keeps the draft's.
 */

/** Submit a Draft ASN (fires `t_asn_submit`, Draft → Submitted). */
export function useAdvanceShipNoticeSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, AsnSubmitVars>} */ (useMutation)({
    mutationFn: ({
      asnNumber,
      carrier,
      threePlId,
      trackingNumber,
      eta,
      shipDate,
      lines,
      overShipReason,
      callOffFinal
    }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_submit',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
        payload: {
          carrier,
          ...(threePlId !== undefined ? { threePlId } : {}),
          trackingNumber,
          eta,
          ...(shipDate ? { shipDate } : {}),
          ...(lines ? { lines } : {}),
          ...(overShipReason ? { overShipReason } : {}),
          ...(callOffFinal !== undefined ? { callOffFinal } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Cancel a Draft or Submitted ASN before anything was received (fires
 * `t_asn_cancel`). A cancelled ASN stops counting toward open quantity.
 */
export function useAdvanceShipNoticeCancel() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { asnNumber: string }>} */ (
    useMutation
  )({
    mutationFn: ({ asnNumber }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_cancel',
        entity: 'advanceShipNotice',
        entityId: asnNumber
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── Shelf-life exception (MR-6 BR-08, edge case 1) ─────────────────────────

/** A submission's fields plus the supplier's reason (`t_asn_request_exception`). */
/**
 * @typedef {AsnSubmitVars & {
 *     reason: string;
 *   }} AsnRequestExceptionVars
 */

/**
 * The supplier asks Quality for a shelf-life exception instead of submitting
 * (Draft → Awaiting exception). Carries what a submission carries.
 */
export function useAdvanceShipNoticeRequestException() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, AsnRequestExceptionVars>} */ (
    useMutation
  )({
    mutationFn: ({
      asnNumber,
      carrier,
      threePlId,
      trackingNumber,
      eta,
      shipDate,
      lines,
      overShipReason,
      reason
    }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_request_exception',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
        payload: {
          carrier,
          ...(threePlId !== undefined ? { threePlId } : {}),
          trackingNumber,
          eta,
          ...(shipDate ? { shipDate } : {}),
          ...(lines ? { lines } : {}),
          ...(overShipReason ? { overShipReason } : {}),
          reason
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Quality's decision on a shelf-life exception (a reason is required to reject). */
/**
 * @typedef {object} AsnExceptionDecisionVars
 * @property {string} asnNumber
 * @property {'approve' | 'reject'} decision
 * @property {string} [reason]
 */

/**
 * Quality approves (Awaiting exception → Submitted) or rejects (→ Draft) a
 * shelf-life exception.
 */
export function useAdvanceShipNoticeExceptionDecision() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, AsnExceptionDecisionVars>} */ (
    useMutation
  )({
    mutationFn: ({ asnNumber, decision, reason }) =>
      svc.commands.dispatch(scope, {
        transitionId: decision === 'approve' ? 't_asn_approve_exception' : 't_asn_reject_exception',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
        payload: reason?.trim() ? { reason: reason.trim() } : {}
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * MR-6 edge case 1 — the supplier moves an approved ASN's ETA later; a line
 * still fails there, so Quality decides again (Submitted → Awaiting exception).
 */
export function useAdvanceShipNoticeChangeEta() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { asnNumber: string; eta: string }>} */ (
    useMutation
  )({
    mutationFn: ({ asnNumber, eta }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_change_eta',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
        payload: { eta }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── Receipt discrepancy (REQ-E07-06) ───────────────────────────────────────

/**
 * @typedef {object} ReceiptDiscrepancyAnswerVars
 * @property {string} receiptId
 * @property {'acknowledge' | 'dispute'} answer
 * @property {string} comment
 */

/** The supplier acknowledges or disputes a receipt discrepancy with a comment. */
export function useReceiptDiscrepancyAnswer() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, ReceiptDiscrepancyAnswerVars>} */ (
    useMutation
  )({
    mutationFn: ({ receiptId, answer, comment }) =>
      svc.commands.dispatch(scope, {
        transitionId:
          answer === 'acknowledge'
            ? 't_receiptdiscrepancy_acknowledge'
            : 't_receiptdiscrepancy_dispute',
        entity: 'receiptDiscrepancy',
        payload: { receiptId, comment }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** PTI's planner resolves a disputed receipt discrepancy with a comment. */
export function useReceiptDiscrepancyResolve() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { receiptId: string; resolutionComment: string }>} */ (
    useMutation
  )({
    mutationFn: ({ receiptId, resolutionComment }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_receiptdiscrepancy_resolve',
        entity: 'receiptDiscrepancy',
        entityId: receiptId,
        payload: { resolutionComment }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * @typedef {object} AsnResolveDiscrepancyVars
 * @property {string} asnNumber
 */

/**
 * Resolve a discrepancy on an ASN (fires `t_asn_resolve_discrepancy`,
 * Discrepancy → Delivered).
 *
 * ⚠️ **THE ATOM IS `asn:flag`, WHICH IS A `receiving` ATOM — SO THIS IS THE
 * DOCK'S ACT, NOT THE SUPPLIER'S**, and that is the whole reason the control
 * lives on `/buyer/goods-receipt`. The same atom carries `t_asn_discrepancy`,
 * which the GR mismatch cascade fires under the automation grant: **the
 * authority that raised the problem state is the authority that clears it**
 * (the `t_invoice_resolve` shape the flow header points at). A supplier holds
 * `asn:create` / `asn:submit` in `fulfilment` and NO supplier lane holds
 * `asn:flag`, so a supplier-side resolve control can never be anything but a
 * wait — which is what `SupplierShipments` now renders.
 *
 * PAYLOAD-FREE ON PURPOSE, and it is derived rather than chosen:
 * `t_asn_resolve_discrepancy` declares `requiredFields: []` and
 * `policyHooks: []`. Inventing a reason field here would put a value in the
 * command that no machine reads and no gate checks — a field with a writer and
 * no reader, which is the stored-field gate's whole subject one layer down.
 */
export function useAdvanceShipNoticeResolveDiscrepancy() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, AsnResolveDiscrepancyVars>} */ (
    useMutation
  )({
    mutationFn: ({ asnNumber }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_resolve_discrepancy',
        entity: 'advanceShipNotice',
        entityId: asnNumber
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── RFQ create (Phase A/2 — retires extraRfqs) ──────────────────────────────
// Buyer raises a sourcing event through the SAME dispatcher creation mechanism as
// t_pr_create / t_asn_create (a creation-shape verb, near-clone of
// usePurchaseRequisitionCreate). Buyer-only: a supplier scope is SCOPE_DENIED
// before the role gate (RFQ creation is a buyer verb). This is the ONLY RFQ write
// path for a new event — it replaces the `extraRfqs` client-fabrication; on a
// non-failed outcome the sourcing board re-reads and the minted RFQ is list-visible.

/**
 * @typedef {object} RfqCreateVars
 * @property {Record<string, unknown>} payload -  The t_rfq_create payload (title + materialCategory required).
 */

/** Raise a new RFQ (fires the `creation` verb `t_rfq_create`). */
export function useRfqCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, RfqCreateVars>} */ (useMutation)({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_create',
        entity: 'rfq',
        payload
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── RFQ revise draft (BL-93) ──────────────────────────────────────────────────
// The buyer edits a DRAFT RFQ through `t_rfq_revise_draft` — the same payload
// the create verb takes, judged by the same `rfq_create_valid` hook — and may
// send it in the same act. Both dispatches carry `expectedState: 'Draft'`: a
// draft a colleague sent while this buyer was editing is refused STALE_STATE
// rather than silently rewritten under the suppliers now quoting it.

/**
 * @typedef {object} RfqReviseDraftVars
 * @property {string} rfqId
 * @property {Record<string, unknown>} payload
 * @property {boolean} [publish] -  Send it once saved (`t_rfq_publish`). Needs `rfq:publish`.
 */

/** Save an edited draft RFQ, and optionally send it. */
export function useRfqReviseDraft() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, RfqReviseDraftVars>} */ (useMutation)({
    mutationFn: async ({ rfqId, payload, publish }) => {
      const revised = await svc.commands.dispatch(scope, {
        transitionId: 't_rfq_revise_draft',
        entity: 'rfq',
        entityId: rfqId,
        expectedState: 'Draft',
        payload
      });
      if (revised.status === 'failed' || !publish) return revised;
      return svc.commands.dispatch(scope, {
        transitionId: 't_rfq_publish',
        entity: 'rfq',
        entityId: rfqId,
        expectedState: 'Draft'
      });
    },
    // Invalidate on every settle: a revise that saved and a publish that was
    // then refused still changed the draft.
    onSettled: () => invalidate(scope)
  });
}

// ─── RFQ award — RFx C3 (AR-03): `useRfqAward` is GONE ───────────────────────
// It sent a single winner with no lines and no reason, from the RFQ list page
// only, so a legacy RFQ could be awarded around the split rules. Every award
// now goes through `useRfxCommand` (`award` / `awardPartial`) from the award
// panel on the event page, which the list page links to.

// ─── FX basis (CP-0 · 2e-c-3/4) — the buyer records the rate a multi-currency
//     comparison is ranked against ───────────────────────────────────────────
//
// STATE-PRESERVING: this records a fact ON the RFQ without moving it, so an Open
// RFQ stays Open and a Closed one stays Closed. Invalidating on success is what
// makes the comparison re-score — the refusal the buyer was looking at is
// replaced by a ranking, in one round trip.
//
// There is deliberately NO `useRfqFxPinEdit`. A moved rate is recorded by
// dispatching this verb AGAIN: the store appends, the prior basis survives, and
// the D-1 freeze holds because no update path exists to break it.

/**
 * @typedef {object} RfqFxPinVars
 * @property {string} rfqId
 * @property {BidCurrency} quote -  The bid currency being converted (never the base — its rate is 1).
 * @property {number} rate -  Units of base per ONE unit of `quote`.
 * @property {string} asOf -  The RATE's vintage (ISO date) — what staleness is measured from.
 * @property {FxPinSource} source
 * @property {string} [rateType] -  SAP rate type ('M'/'B'/'G'), when the source distinguishes them.
 */

/** Record (or supersede) the FX basis for one currency on one RFQ. */
export function useRfqFxPin() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, RfqFxPinVars>} */ (useMutation)({
    mutationFn: ({ rfqId, quote, rate, asOf, source, rateType }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_fx_pin',
        entity: 'rfq',
        entityId: rfqId,
        payload: {
          quote,
          rate,
          asOf,
          source,
          // Omitted rather than sent empty: a MANUAL pin has no rate type, and
          // an empty string would be a stated blank rather than an absence.
          ...(rateType ? { rateType } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── RFQ lifecycle (F0.3) — the non-award, non-cascade sourcing verbs ─────────
// Buyer-only, payload-free state moves. Neither mints a downstream artifact nor
// fans out (no cascade): cancel is a terminal abandon, reopen returns a closed
// event to the response window. The dispatcher enforces the legal from-states
// (cancel: Draft/Open/Closed; reopen: Closed only) and the buyer role, so an
// illegal-from-here or wrong-persona attempt fails without mutating. On a
// non-failed outcome the sourcing board + awards history re-derive from the store.
// ⚠️ PF-1a — t_rfq_publish IS NOW WIRED. The note that stood here ("the only
// Draft fixture has no invited suppliers, so publish would yield a hollow 0/0
// event") described the world in which nothing could REACH Draft. D-1 moved
// creation there, so every RFQ a buyer raises now arrives carrying its invited
// list and waits to be published. (t_quotation_submit / t_quotation_review are
// WIRED below, Task 3b.)

/**
 * @typedef {object} RfqLifecycleVars
 * @property {string} rfqId
 */

/** Cancel an RFQ before award (fires `t_rfq_cancel`, Draft/Open/Closed → Cancelled). */
export function useRfqCancel() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, RfqLifecycleVars>} */ (useMutation)({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_cancel',
        entity: 'rfq',
        entityId: rfqId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Publish a drafted RFQ to its invited suppliers (fires `t_rfq_publish`,
 * Draft → Open).
 *
 * ⚠️ THIS IS THE ACT THAT MAKES THE EVENT VISIBLE, not a status relabel:
 * supplier RFQ reads exclude `Draft` (`MockProcurementService.getRFQs`), so an
 * unpublished event is on nobody's board but the buyer's.
 */
export function useRfqPublish() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, RfqLifecycleVars>} */ (useMutation)({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_publish',
        entity: 'rfq',
        entityId: rfqId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Reopen a closed RFQ for further responses (fires `t_rfq_reopen`, Closed → Open). */
export function useRfqReopen() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, RfqLifecycleVars>} */ (useMutation)({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_reopen',
        entity: 'rfq',
        entityId: rfqId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── Quotation lifecycle (Task 3b — the last sourcing-spine piece) ───────────
// t_quotation_submit is the ONE supplier-owned CREATION verb: the invited
// supplier answers an RFQ through the SAME dispatcher creation mechanism as
// t_rfq_create / t_pr_create (near-clone of useRfqCreate). Scope is ASN-faithful
// — the target's creationOwner admits the caller only if it is invited to the
// RFQ (else SCOPE_DENIED). The payload is RAW FACTS; the engine owns scoring at
// read (#78). t_quotation_review is the buyer's Submitted → Under Review move.

/**
 * @typedef {object} QuotationSubmitVars
 * @property {Record<string, unknown> & { documents?: readonly ResponseDocumentInput[] }} payload The t_quotation_submit payload (rfqId + unitPrice + leadTimeDays required).
 *   NR-1 BR-01 — `documents` carries the supplier's files; the store stamps
 *   their upload times.
 */

/** Submit a quotation against an invited RFQ (fires the `creation` verb `t_quotation_submit`). */
export function useQuotationSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, QuotationSubmitVars>} */ (useMutation)(
    {
      mutationFn: ({ payload }) =>
        svc.commands.dispatch(scope, {
          transitionId: 't_quotation_submit',
          entity: 'quotation',
          payload
        }),
      onSuccess: (result) => {
        if (result.status !== 'failed') invalidate(scope);
      }
    }
  );
}

/**
 * @typedef {object} QuotationReviewVars
 * @property {string} quotationId
 */

/** Move a submitted quote into evaluation (fires `t_quotation_review`, Submitted → Under Review). */
export function useQuotationReview() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, QuotationReviewVars>} */ (useMutation)(
    {
      mutationFn: ({ quotationId }) =>
        svc.commands.dispatch(scope, {
          transitionId: 't_quotation_review',
          entity: 'quotation',
          entityId: quotationId
        }),
      onSuccess: (result) => {
        if (result.status !== 'failed') invalidate(scope);
      }
    }
  );
}

// ─── RFQ supplier response (RFx spec 2026-09-21) ─────────────────────────────
// Intent ("I will respond" / a reasoned decline), the confidentiality terms,
// and clarification Q&A. The supplier's acts dispatch under its own scope and
// are refused at scope when it is not invited; the answer is the buyer's.

/**
 * @typedef {| { verb: 'respond'; rfqId: string; supplierId: string }
 *   | { verb: 'decline'; rfqId: string; supplierId: string; reason: RfqDeclineReason; text: string }
 *   | { verb: 'withdraw'; intentId: string; reason: RfqDeclineReason; text: string }
 *   | { verb: 'acceptTerms'; rfqId: string; supplierId: string }
 *   | { verb: 'ask'; rfqId: string; supplierId: string; question: string }
 *   | { verb: 'answer'; clarificationId: string; answer: string; visibility: 'private' | 'published' }} RfqEngagementVars
 */

/** Every act on a tiered RFQ's supplier response, through the command spine. */
export function useRfqEngagementCommand() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, RfqEngagementVars>} */ (useMutation)({
    mutationFn: (vars) => {
      switch (vars.verb) {
        case 'respond':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfqintent_respond',
            entity: 'rfqIntent',
            payload: { rfqId: vars.rfqId, supplierId: vars.supplierId }
          });
        case 'decline':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfqintent_decline',
            entity: 'rfqIntent',
            payload: {
              rfqId: vars.rfqId,
              supplierId: vars.supplierId,
              reason: vars.reason,
              text: vars.text
            }
          });
        case 'withdraw':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfqintent_withdraw',
            entity: 'rfqIntent',
            entityId: vars.intentId,
            payload: { reason: vars.reason, text: vars.text }
          });
        case 'acceptTerms':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfqconfidentiality_accept',
            entity: 'rfqConfidentiality',
            payload: { rfqId: vars.rfqId, supplierId: vars.supplierId }
          });
        case 'ask':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfqclarification_ask',
            entity: 'rfqClarification',
            payload: { rfqId: vars.rfqId, supplierId: vars.supplierId, question: vars.question }
          });
        case 'answer':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfqclarification_answer',
            entity: 'rfqClarification',
            entityId: vars.clarificationId,
            payload: { answer: vars.answer, visibility: vars.visibility }
          });
      }
    },
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── Goods receipt (Step 4 batch ii) ────────────────────────────────────────
// The GR is a buyer/warehouse document, so these dispatch under the buyer scope.
// Create records the finalized inspection results; the header disposition is a
// ROLLUP the dispatcher re-derives from those stored lines (the UI cannot claim
// "Approved" a line rollup contradicts). Post is the first real sapBoundary verb.

/**
 * @typedef {object} GrCreateVars
 * @property {string} asnReference -  The parent shipment's ASN number (or a manual ASN ref).
 * @property {InspectionResult[]} inspectionResults
 * @property {string} receivedDate
 * @property {string} receivedBy
 * @property {string} [notes]
 */

/**
 * Receive a GR from an arrived shipment (fires the `creation` verb
 * `t_gr_create`). No entityId — the store assigns the GR number, returned on
 * the result. Records the inspection results at create.
 */
export function useGoodsReceiptCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, GrCreateVars>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_create',
        entity: 'goodsReceipt',
        payload: { ...vars }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * @typedef {object} GrFinalizeVars
 * @property {string} grId
 * @property {string} headerVerb -  The rolled-up header verb: t_gr_approve | t_gr_partial_approve | t_gr_reject.
 * @property {string} [dispositionReason] -  Required by t_gr_reject; ignored otherwise.
 */

/**
 * Finalize inspection: advance Pending → Under Inspection (best-effort — a GR
 * already Under Inspection stays put) then fire the rolled-up header verb. The
 * verb's rollup policy hook re-derives the disposition from the stored lines, so
 * the header is provably derived. A reject/partial cascades an ASN discrepancy.
 */
export function useGoodsReceiptFinalize() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, GrFinalizeVars>} */ (useMutation)({
    mutationFn: async ({ grId, headerVerb, dispositionReason }) => {
      // Move into inspection if still Pending; ignore an illegal-from-here result.
      await svc.commands.dispatch(scope, {
        transitionId: 't_gr_start_inspection',
        entity: 'goodsReceipt',
        entityId: grId
      });
      return svc.commands.dispatch(scope, {
        transitionId: headerVerb,
        entity: 'goodsReceipt',
        entityId: grId,
        payload: dispositionReason ? { dispositionReason } : {}
      });
    },
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Post an Approved / Partially Approved GR to SAP (fires the sapBoundary verb
 * `t_gr_post`). Resolves `submitted`: the GR moves to the interim 'Posting to
 * SAP' with NO material document yet — the caller settles to finalize.
 */
export function useGoodsReceiptPost() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { grId: string }>} */ (useMutation)({
    mutationFn: ({ grId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_post',
        entity: 'goodsReceipt',
        entityId: grId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Release a GR from quality hold for re-inspection (fires `t_gr_request_retest`,
 * Quality Hold → Under Inspection).
 *
 * ⚠️ PF-1a — the verb behind an affordance that already shipped. "Request
 * Retest" rendered on `Quality Hold` and fired A TOAST; the state had no exit at
 * all, so the button promised something the machine could not do. Payload-free:
 * the hold already recorded its reason, and a required field here would have
 * forced the surface to invent one.
 */
export function useGoodsReceiptRequestRetest() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { grId: string }>} */ (useMutation)({
    mutationFn: ({ grId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_request_retest',
        entity: 'goodsReceipt',
        entityId: grId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Settle a submitted `t_gr_post` (the async SAP callback): advances 'Posting to
 * SAP' → 'Posted to SAP' and assigns the real material document under the same
 * correlationId. Idempotent.
 */
export function useGoodsReceiptSettle() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();
  const onSettleError = useSettleErrorToast();

  return /** @type {typeof useMutation<CommandStatus, Error, { correlationId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ correlationId }) =>
      settleOrRefuse((sc, cid) => svc.commands.settle(sc, cid), scope, correlationId),
    onSuccess: () => invalidate(scope),
    onError: onSettleError
  });
}

// ─── Invoice (Step 4 batch iii, DR-7) ───────────────────────────────────────
// ONE canonical machine; both persona surfaces re-derive from one store. The
// supplier drafts + submits against its own PO (creation-shape); the buyer
// approves, disputes/resolves, and releases payment — the release is the second
// sapBoundary verb (Option B: no "paid" claim until settlement mints the FI doc).

/**
 * @typedef {object} InvoiceCreateVars
 * @property {string} poReference -  The parent PO the invoice bills against (the supplier's own, confirmed or delivered).
 * @property {number} amount
 * @property {InvoiceLine[]} lines -  REQ-E07-07 — lines drawn from the selected goods receipts.
 * @property {string} invoiceNumber
 * @property {string} invoiceDate
 * @property {string} taxInvoiceFile -  Tax invoice (e-Faktur) file name.
 * @property {string} [dueDate]
 * @property {string} [submittedDate]
 * @property {string} [bankAccount]
 */

/** Draft an invoice against a confirmed PO (fires the `creation` verb
 *  `t_invoice_create`). No entityId — the store assigns the invoice number. */
export function useInvoiceCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, InvoiceCreateVars>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_create',
        entity: 'invoice',
        payload: { ...vars }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Submit a Draft invoice (fires `t_invoice_submit`, Draft → Submitted). */
export function useInvoiceSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { invoiceId: string; amount: number }>} */ (
    useMutation
  )({
    mutationFn: ({ invoiceId, amount }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_submit',
        entity: 'invoice',
        entityId: invoiceId,
        payload: { amount }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * @typedef {object} InvoiceResubmitVars
 * @property {string} invoiceId
 * @property {number} amount
 * @property {InvoiceLine[]} [lines]
 * @property {string} [invoiceNumber]
 * @property {string} [invoiceDate]
 * @property {string} [taxInvoiceFile]
 */

/** Correct and resubmit a returned invoice (fires `t_invoice_resubmit`). */
export function useInvoiceResubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, InvoiceResubmitVars>} */ (useMutation)(
    {
      mutationFn: ({ invoiceId, ...payload }) =>
        svc.commands.dispatch(scope, {
          transitionId: 't_invoice_resubmit',
          entity: 'invoice',
          entityId: invoiceId,
          payload: Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== undefined && v !== '')
          )
        }),
      onSuccess: (result) => {
        if (result.status !== 'failed') invalidate(scope);
      }
    }
  );
}

/** Approve a Matched invoice (fires `t_invoice_approve`, Matched → Approved). */
export function useInvoiceApprove() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { invoiceId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_approve',
        entity: 'invoice',
        entityId: invoiceId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Dispute a pre-payment invoice (fires `t_invoice_dispute`). Requires a reason. */
export function useInvoiceDispute() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { invoiceId: string; disputeReason: string }>} */ (
    useMutation
  )({
    mutationFn: ({ invoiceId, disputeReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_dispute',
        entity: 'invoice',
        entityId: invoiceId,
        payload: { disputeReason }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Resolve a disputed invoice (fires `t_invoice_resolve`, Disputed → Submitted). */
export function useInvoiceResolve() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { invoiceId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_resolve',
        entity: 'invoice',
        entityId: invoiceId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Release payment on an Approved invoice (fires the sapBoundary verb
 * `t_invoice_release_payment`). Resolves `submitted`: the invoice moves to the
 * interim 'Releasing Payment' with NO FI document yet — the caller settles to
 * finalize. NO "paid" claim is truthful until then.
 */
export function useInvoiceReleasePayment() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { invoiceId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: invoiceId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Settle a submitted `t_invoice_release_payment` (the async SAP callback):
 * advances 'Releasing Payment' → 'Payment Released' and assigns the real FI
 * document + payment reference under the same correlationId. Idempotent.
 */
export function useInvoiceSettlePayment() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();
  const onSettleError = useSettleErrorToast();

  return /** @type {typeof useMutation<CommandStatus, Error, { correlationId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ correlationId }) =>
      settleOrRefuse((sc, cid) => svc.commands.settle(sc, cid), scope, correlationId),
    onSuccess: () => invalidate(scope),
    onError: onSettleError
  });
}

// ─── Purchase requisition (G1.2b — C7 intake push, C6-LOCK) ──────────────────
// The plan grid's ONE mutation: push a single planned intake line to a Draft PR
// through the wired purchaseRequisition target (G1.1). A creation-shape verb, an
// exact near-clone of useAdvanceShipNoticeCreate — buyer-only (a supplier scope
// is SCOPE_DENIED before the role gate; PRs are buyer-internal). SINGLE-ROW: the
// public seam still cannot group causation (G0.1-FIND-01), so each push is one
// dispatch. When the line carries a governed quantity override (C6-LOCK), the
// opaque `decision` rides through to the DR-10 audit — the dispatcher forwards it
// verbatim. This is the ONLY exit from PLANNED (C6 §3); on a non-failed outcome
// the PR list re-derives and the pushed Draft is list-visible.

/**
 * @typedef {object} PrCreateVars
 * @property {Record<string, unknown>} payload -  The t_pr_create payload (material + quantity required; C7 §2.1).
 * @property {CommandDecision} [decision] -  Governed-decision provenance, present only on a genuine quantity override.
 */

/** Push a planned intake line to a Draft PR (fires the `creation` verb `t_pr_create`). */
export function usePurchaseRequisitionCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, PrCreateVars>} */ (useMutation)({
    mutationFn: ({ payload, decision }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_create',
        entity: 'purchaseRequisition',
        payload,
        ...(decision ? { decision } : {})
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ── DUPLICATE-AND-NARROW — the privilege grant ──────────────────────────────
//
// ⚠️ **`entityId` IS THE PARENT SYSTEM ROLE, AND THERE IS NO `parent` PAYLOAD
// FIELD.** The entity commanded IS the role being copied, so the two cannot
// disagree — enforcement's `checkId` discipline, applied to a role.
//
// ⚠️ **`grantedBy` COMES FROM THE SESSION, NEVER FROM THE FORM (C10 §6.2).**
// It is `identity.actor` — today always `UNATTRIBUTED: NO_PERSON_IN_SESSION`,
// which is a CLAIM the platform is entitled to make, not a placeholder. A form
// field for it would let a caller name whoever it liked as the granter of a
// privilege, which is the payload-refusal C10 §6.2 exists to state.
//
// There is NO `invalidateProcurement` here: a role definition is not procurement
// data and no query reads it. The catalogue re-derives from the store directly,
// which is why the page bumps a version rather than awaiting a refetch.
/**
 * @typedef {object} RoleGrantVars
 * @property {string} parent -  The system role being copied — the command's entityId.
 * @property {string} roleId
 * @property {string} displayName
 * @property {string} description
 * @property {readonly string[]} adds
 */

/** Grant a custom role: copy one system role and add to it (`t_role_grant`). */
export function useRoleGrant() {
  const svc = useDataService();
  const scope = useScope();
  const { identity } = useCurrentIdentity();

  return /** @type {typeof useMutation<CommandResult, Error, RoleGrantVars>} */ (useMutation)({
    mutationFn: ({ parent, roleId, displayName, description, adds }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_role_grant',
        entity: 'role',
        entityId: parent,
        payload: {
          roleId,
          displayName,
          description,
          adds: [...adds],
          grantedBy: identity.actor
        }
      })
  });
}

// ── BL-51 · ONE 3PL ON THE ADMINISTRATOR'S LIST ──────────────────────────────
//
// ⚠️ **`entityId` IS THE 3PL ID, AND THERE IS NO ID PAYLOAD FIELD** — the
// `checkId` / `parent` discipline. `setBy` comes from the session, never the
// form (C10 §6.2). The list is read straight from its store by the pages that
// show a tracking number (they subscribe to it), so nothing in the query cache
// holds a stale copy of an address; the ASN queries are refreshed anyway so a
// 3PL that stopped being offered drops out of the ASN form at once.
/**
 * @typedef {object} ThreePlSetVars
 * @property {string} threePlId -  `tpl-…` — the command's entityId.
 * @property {string} name
 * @property {string} trackingUrlPattern
 * @property {boolean} active
 */

/** Add a 3PL to the list or change one (`t_threepl_set`). */
export function useThreePlSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();
  const { identity } = useCurrentIdentity();

  return /** @type {typeof useMutation<CommandResult, Error, ThreePlSetVars>} */ (useMutation)({
    mutationFn: ({ threePlId, name, trackingUrlPattern, active }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_threepl_set',
        entity: 'threePl',
        entityId: threePlId,
        payload: { name, trackingUrlPattern, active, setBy: identity.actor }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── Material A1 · A SUPPLIER'S STOCK UPDATE MODE (MR-1 BR-02, AC-06) ──────────
//
// `entityId` IS the supplier id; there is no supplier payload field. `setBy`
// and `setAt` are stamped by the target from the session and the hub clock.
// The mode decides whether the supplier's stock rows read as API-connected, so
// the whole cache is invalidated rather than a guessed list of keys.
/**
 * @typedef {object} SupplierSetUpdateModeVars
 * @property {string} supplierId
 * @property {StockUpdateMode} stockUpdateMode
 * @property {string} [reason]
 */

/** Set a supplier's stock update mode (`t_supplier_set_update_mode`). */
export function useSupplierSetUpdateMode() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, SupplierSetUpdateModeVars>} */ (
    useMutation
  )({
    mutationFn: ({ supplierId, stockUpdateMode, reason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplier_set_update_mode',
        entity: 'supplierOverlay',
        entityId: supplierId,
        payload: {
          stockUpdateMode,
          ...(reason && reason.trim() !== '' ? { reason: reason.trim() } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── Material G1 · THE DOCUMENTS A QUALIFICATION LEVEL REQUIRES (MR-10 BR-04) ──
//
// `entityId` IS the level (`approved` | `preferred`); the list replaces the one
// in force. `setBy` and `setAt` are stamped by the target from the session and
// the hub clock. Every vendor's level is read from the lists, so the whole
// cache is invalidated rather than a guessed list of keys.
/**
 * @typedef {object} QualificationRuleSetVars
 * @property {QualificationRuleLevel} level
 * @property {readonly QualificationRequiredDoc[]} requiredDocs
 */

/** Set the documents one qualification level requires (`t_qualification_rule_set`). */
export function useQualificationRuleSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, QualificationRuleSetVars>} */ (
    useMutation
  )({
    mutationFn: ({ level, requiredDocs }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_qualification_rule_set',
        entity: 'qualificationRule',
        entityId: level,
        payload: { requiredDocs: requiredDocs.map((r) => ({ ...r })) }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── Material G2 · THE SOURCING TYPE MAP (MR-10 BR-06) ────────────────────────
//
// `entityId` IS the key (`category:<RFQCategory>` or `pg:<code>`). `setBy` and
// `setAt` are stamped by the target. A Draft's type and every invitee's
// eligibility read the map, so the whole cache is invalidated.
/**
 * @typedef {object} SourcingTypeSetVars
 * @property {SourcingTypeKey} key
 * @property {SourcingType} sourcingType
 */

/** Set one category's or purchasing group's sourcing type (`t_sourcingtype_set`). */
export function useSourcingTypeSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, SourcingTypeSetVars>} */ (useMutation)(
    {
      mutationFn: ({ key, sourcingType }) =>
        svc.commands.dispatch(scope, {
          transitionId: 't_sourcingtype_set',
          entity: 'sourcingType',
          entityId: key,
          payload: { sourcingType }
        }),
      onSuccess: (result) => {
        if (result.status !== 'failed') void qc.invalidateQueries();
      }
    }
  );
}

// ── Material C5 · PLANNING GROUPS (MR-8 BR-01 to BR-05) ──────────────────────
//
// Create mints the id; rename, move and retire name the group as `entityId`
// (a move names the DESTINATION group). Attribution and time are stamped by
// the target from the session and the hub clock. A move changes which group
// capacity is kept by, so the whole cache is invalidated.
/**
 * @typedef {| { verb: 'create'; name: string; sapMaterialGroup: string }
 *   | { verb: 'rename'; groupId: string; name: string }
 *   | { verb: 'move'; groupId: string; materialCodes: readonly string[] }
 *   | { verb: 'retire'; groupId: string }} PlanningGroupCommandVars
 */

/** Create, rename, move materials into, or retire a planning group. */
export function usePlanningGroupCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, PlanningGroupCommandVars>} */ (
    useMutation
  )({
    mutationFn: (vars) => {
      switch (vars.verb) {
        case 'create':
          return svc.commands.dispatch(scope, {
            transitionId: 't_planninggroup_create',
            entity: 'planningGroup',
            payload: { name: vars.name.trim(), sapMaterialGroup: vars.sapMaterialGroup }
          });
        case 'rename':
          return svc.commands.dispatch(scope, {
            transitionId: 't_planninggroup_rename',
            entity: 'planningGroup',
            entityId: vars.groupId,
            payload: { name: vars.name.trim() }
          });
        case 'move':
          return svc.commands.dispatch(scope, {
            transitionId: 't_planninggroup_move_materials',
            entity: 'planningGroup',
            entityId: vars.groupId,
            payload: { materialCodes: [...vars.materialCodes] }
          });
        case 'retire':
          return svc.commands.dispatch(scope, {
            transitionId: 't_planninggroup_retire',
            entity: 'planningGroup',
            entityId: vars.groupId,
            payload: {}
          });
      }
    },
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── Material C4 · ONE MRP CONTROLLER ON THE ADMINISTRATOR'S LIST (MR-5 BR-02) ─
//
// `entityId` IS the SAP code; there is no code payload field. `setBy` and
// `setAt` are stamped by the target from the session and the hub clock. Every
// material surface shows the controller's name, so the whole cache is
// invalidated rather than a guessed list of keys.
/**
 * @typedef {object} MrpControllerSetVars
 * @property {string} code
 * @property {string} name
 * @property {readonly string[]} userLabels
 */

/** Map an MRP controller code to a name and hub users (`t_mrpcontroller_set`). */
export function useMrpControllerSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, MrpControllerSetVars>} */ (
    useMutation
  )({
    mutationFn: ({ code, name, userLabels }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_mrpcontroller_set',
        entity: 'mrpController',
        entityId: code,
        payload: { name, userLabels: [...userLabels] }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

/** BL-157 — remove an MRP controller code's mapping (`t_mrpcontroller_unmap`). */
export function useMrpControllerUnmap() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, { code: string }>} */ (useMutation)({
    mutationFn: ({ code }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_mrpcontroller_unmap',
        entity: 'mrpController',
        entityId: code,
        payload: {}
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── Material C2 · SUPPLIER TRADE NAMES (MR-3 BR-01 to BR-06) ─────────────────
//
// The supplier submits; Material Planning approves, rejects or loads in bulk.
// `submittedBy` / `decidedBy` and the times are stamped by the target from the
// session and the hub clock. An approved name shows on the stock pages, so the
// whole cache is invalidated rather than a guessed list of keys.
/**
 * @typedef {object} MaterialNameSubmitVars
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {string} tradeName
 * @property {string} [supplierMaterialNo]
 */

/** A supplier submits its trade name for an assigned material (`t_materialname_submit`). */
export function useMaterialNameSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, MaterialNameSubmitVars>} */ (
    useMutation
  )({
    mutationFn: ({ supplierId, materialCode, tradeName, supplierMaterialNo }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_materialname_submit',
        entity: 'materialName',
        payload: {
          supplierId,
          materialCode,
          tradeName,
          ...(supplierMaterialNo && supplierMaterialNo.trim() !== '' ? { supplierMaterialNo } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

/**
 * @typedef {object} MaterialNameDecideVars
 * @property {string} id
 * @property {'approve' | 'reject'} decision
 * @property {string} [rejectionReason]
 */

/** Material Planning approves or rejects a trade name (`t_materialname_approve` / `_reject`). */
export function useMaterialNameDecide() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, MaterialNameDecideVars>} */ (
    useMutation
  )({
    mutationFn: ({ id, decision, rejectionReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: decision === 'approve' ? 't_materialname_approve' : 't_materialname_reject',
        entity: 'materialName',
        entityId: id,
        expectedState: 'Awaiting approval',
        payload: decision === 'reject' ? { rejectionReason: rejectionReason ?? '' } : {}
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

/** One row of a bulk load, with its line in the file. */
/**
 * @typedef {MaterialNameSubmitVars & {
 *     line: number;
 *   }} MaterialNameLoadRow
 */

/** The outcome of one bulk-load row. A thrown refusal is reported as its code. */
/**
 * @typedef {object} MaterialNameLoadOutcome
 * @property {number} line
 * @property {'done' | 'failed'} status
 * @property {string} [reason]
 */

/** PTI loads approved trade names, one `t_materialname_load` per row (BR-06). */
export function useMaterialNameLoad() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<MaterialNameLoadOutcome[], Error, readonly MaterialNameLoadRow[]>} */ (
    useMutation
  )({
    mutationFn: async (rows) => {
      /** @type {MaterialNameLoadOutcome[]} */
      const out = [];
      for (const r of rows) {
        try {
          const result = await svc.commands.dispatch(scope, {
            transitionId: 't_materialname_load',
            entity: 'materialName',
            payload: {
              supplierId: r.supplierId,
              materialCode: r.materialCode,
              tradeName: r.tradeName,
              ...(r.supplierMaterialNo ? { supplierMaterialNo: r.supplierMaterialNo } : {})
            }
          });
          out.push({
            line: r.line,
            status: result.status === 'failed' ? 'failed' : 'done',
            reason: result.reason
          });
        } catch (e) {
          out.push({
            line: r.line,
            status: 'failed',
            reason: e instanceof DataError ? e.code : /** @type {Error} */ (e).message
          });
        }
      }
      return out;
    },
    onSuccess: (outcomes) => {
      if (outcomes.some((o) => o.status === 'done')) void qc.invalidateQueries();
    }
  });
}

// ── BL-194 · SUPPLIER FEEDSTOCK CONFIRMATION (DRC-8 BR-a; DRC-D17) ───────────
//
// The supplier confirms its current feedstock for one assigned material. The
// unit, `recordedAt` and `recordedBy` are set by the target from the master,
// the hub clock and the session; none is a payload field. The confirmation
// shows on both stock pages, so the whole cache is invalidated.
/**
 * @typedef {object} FeedstockConfirmVars
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number} feedstockQty
 * @property {string} confirmedOn
 * @property {string} [note]
 */

/** A supplier confirms its current feedstock (`t_feedstock_confirm`). */
export function useFeedstockConfirm() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, FeedstockConfirmVars>} */ (
    useMutation
  )({
    mutationFn: ({ supplierId, materialCode, feedstockQty, confirmedOn, note }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_feedstock_confirm',
        entity: 'feedstockConfirmation',
        payload: {
          supplierId,
          materialCode,
          feedstockQty,
          confirmedOn,
          ...(note && note.trim() !== '' ? { note } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── BL-50 · A RULING ON ONE DAY OF THE HUB'S WORKING CALENDAR ────────────────
//
// ⚠️ **`entityId` IS THE DATE, AND THERE IS NO `date` PAYLOAD FIELD** — the
// `checkId` / `parent` discipline, so the day commanded and the day recorded
// cannot disagree. `setBy` comes from the session, never the form (C10 §6.2).
//
// Every deadline in the hub is derived from the calendar at read, so after a
// ruling EVERY query that renders a deadline is stale. The whole cache is
// invalidated rather than a guessed list of keys — a missed key would show the
// old deadline next to the new calendar, which is the one thing this act must
// not do.
/**
 * @typedef {object} CalendarDaySetVars
 * @property {string} date -  `YYYY-MM-DD` — the command's entityId.
 * @property {'working' | 'non-working'} kind
 * @property {string} reason
 */

/** Rule one date working or non-working (`t_calendar_day_set`). */
export function useCalendarDaySet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();
  const { identity } = useCurrentIdentity();

  return /** @type {typeof useMutation<CommandResult, Error, CalendarDaySetVars>} */ (useMutation)({
    mutationFn: ({ date, kind, reason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_calendar_day_set',
        entity: 'workingCalendar',
        entityId: date,
        payload: { kind, reason, setBy: identity.actor }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── BL-32 · ONE RULE VALUE THE HUB ADMINISTRATOR CHANGES ─────────────────────
//
// ⚠️ **`entityId` IS THE SETTING KEY, AND THERE IS NO KEY PAYLOAD FIELD.**
// `setBy` comes from the session, never the form (C10 §6.2). "Reset to
// default" is this same hook writing the default back. Every query is refreshed
// on success, because a value moves verdicts on pages whose data is cached
// (positions carry their stale period; call-off views their tolerance check).
/**
 * @typedef {object} SettingSetVars
 * @property {string} key -  The setting key — the command's entityId.
 * @property {number | boolean | null} value -  The new value; `null` removes a stale-period override.
 */

/** Change one rule value, or set it back to its default (`t_setting_set`). */
export function useSettingSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();
  const { identity } = useCurrentIdentity();

  return /** @type {typeof useMutation<CommandResult, Error, SettingSetVars>} */ (useMutation)({
    mutationFn: ({ key, value }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_setting_set',
        entity: 'hubSetting',
        entityId: key,
        payload: { value, setBy: identity.actor }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── BL-32 · ONE CODE ON ONE REASON LIST ──────────────────────────────────────
// `entityId` IS `<list>:<code>`; there is no delete — retiring is `active:
// false`. `setBy` comes from the session, never the form.
/**
 * @typedef {object} ReasonCodeSetVars
 * @property {ReasonListId} list
 * @property {string} code
 * @property {string} labelEn
 * @property {string} labelId
 * @property {boolean} active
 */

/** Add, rename, retire or re-offer one reason code (`t_reasoncode_set`). */
export function useReasonCodeSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();
  const { identity } = useCurrentIdentity();

  return /** @type {typeof useMutation<CommandResult, Error, ReasonCodeSetVars>} */ (useMutation)({
    mutationFn: ({ list, code, labelEn, labelId, active }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_reasoncode_set',
        entity: 'reasonCode',
        entityId: reasonCodeEntityId(list, code),
        payload: { labelEn, labelId, active, setBy: identity.actor }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── REQ-E06-04 BR-06 · ONE SUPPLIER × MATERIAL'S MAXIMUM STOCK ───────────────
// `quantity: null` clears it back to "no max stock agreed". `setBy` comes from
// the session, never the form.
/**
 * @typedef {object} MaxStockSetVars
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number | null} quantity
 */

/** Set, change or clear the maximum stock of one supplier × material (`t_maxstock_set`). */
export function useMaxStockSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();
  const { identity } = useCurrentIdentity();

  return /** @type {typeof useMutation<CommandResult, Error, MaxStockSetVars>} */ (useMutation)({
    mutationFn: ({ supplierId, materialCode, quantity }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_maxstock_set',
        entity: 'maxStock',
        entityId: maxStockEntityId(supplierId, materialCode),
        payload: { quantity, setBy: identity.actor }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ── §67 · THE APPROVAL LANE — approve / reject, the two verbs procurement holds ─
//
// ⚠️ **THE GAP THIS CLOSES WAS NEVER A SURFACE.** `BuyerRequisitions` already
// rendered the list, the detail, the status and the line facts; C7's intake
// already dispatches `t_pr_create`. `t_pr_approve` and `t_pr_reject` have been
// authored, registered, dispatchable and green-tested since F0.4 with **zero
// call sites in the tree — not even a consumerless hook**, which is strictly
// less than `t_invoice_approve` ever had. These two functions are the whole
// missing connection.
//
// Both are near-clones of `useInvoiceDispute` and deliberately so: same
// `useMutation<CommandResult, Error, Vars>` shape, same `invalidate` on a
// non-failed outcome, no local state, no interpretation of the refusal. A
// refusal is returned to the caller as a `CommandResult`, never absorbed —
// the surface renders `result.reason`.

/** Approve a requisition sitting in `Pending Approval` (`pr:approve`). */
export function useRequisitionApprove() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { prId: string }>} */ (useMutation)({
    mutationFn: ({ prId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_approve',
        entity: 'purchaseRequisition',
        entityId: prId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Reject a requisition, WITH THE REASON THE VERB REQUIRES (`pr:reject`).
 *
 * `rejectionReason` is not optional in this signature and that is the point:
 * a caller cannot forget it, so the only way to reach the dispatcher's refusal
 * is to pass something blank — which `PR_REJECT_REASON_AUTHORED` then refuses
 * by name. The type carries the requirement to the call site; the hook carries
 * it to the verb; the verb carries it to the store.
 */
export function useRequisitionReject() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { prId: string; rejectionReason: string }>} */ (
    useMutation
  )({
    mutationFn: ({ prId, rejectionReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_reject',
        entity: 'purchaseRequisition',
        entityId: prId,
        payload: { rejectionReason }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ── §68 · THE REQUESTER'S SIDE — submit / revise ────────────────────────────
//
// ⚠️ **THESE TWO ARE WHY THE APPROVAL QUEUE CAN FILL AT ALL.** §67 made
// approve/reject reachable, but `t_pr_create` lands a requisition at `Draft`,
// `t_pr_submit` is the only edge out of `Draft`, and nothing dispatched it —
// so the queue emptied and nothing filled it, and the approval surface had only
// ever acted on a seeded fixture. Both verbs were authored, registered and
// dispatchable since F0.4 with zero call sites; the connection was the gap,
// exactly as it was for approve/reject one batch ago.
//
// `t_pr_submit` IS NOT A CREATION VERB. It acts on a document that already
// exists, so surfacing it adds no second producer beside the ratified C7 seam.

/** Send a Draft requisition to the approval queue (`pr:submit`). */
export function useRequisitionSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { prId: string }>} */ (useMutation)({
    mutationFn: ({ prId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_submit',
        entity: 'purchaseRequisition',
        entityId: prId
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Return a rejected requisition to Draft, WITH THE NOTE THE VERB REQUIRES
 * (`pr:revise`).
 *
 * `revisionNote` is non-optional in this signature for the same reason
 * `rejectionReason` is on `useRequisitionReject`: the type carries the
 * requirement to the call site, so the only way to reach the dispatcher's
 * refusal is to pass something blank — which `PR_REVISION_NOTE_AUTHORED` then
 * refuses by name.
 *
 * A DISTINCT ATOM from submit (`pr:revise`), because revising a declined
 * requisition and drafting a new one are different acts; and the two-step
 * (revise → Draft → submit) IS the revision — nothing reaches an approver again
 * without somebody deliberately re-submitting it.
 */
export function useRequisitionRevise() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { prId: string; revisionNote: string }>} */ (
    useMutation
  )({
    mutationFn: ({ prId, revisionNote }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_revise',
        entity: 'purchaseRequisition',
        entityId: prId,
        payload: { revisionNote }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ── §82 · SUPPLIER DOCUMENTS — the declaration and compliance's review ───────
//
// ⚠️ **THE VARS TYPES CARRY THE VERB'S `requiredFields`, DELIBERATELY.** The
// dispatcher refuses a blank one by name, but a caller that never had to think
// about `certNumber` learns that at runtime; a required property teaches it at
// the call site. Same argument as `useRequisitionRevise`'s non-optional
// `revisionNote` — the only way to reach the dispatcher's refusal is to pass
// something deliberately empty.
//
// ⚠️ **AND `declaredBy` / `declaredAt` ARE ABSENT FROM EVERY SHAPE HERE, WHICH
// IS THE POINT.** They are minted in the target from `scope.actor` and the
// clock. A form field for either would be attribution by assertion (C10 §6.2)
// and a caller that could set `declaredAt` could backdate its own declaration
// against an expiry.

/**
 * What a supplier states about a certificate.
 *
 * SUBTRACTED FROM THE STORED SHAPE BY NAME, rather than re-declared beside it.
 * `declaredAt` and `declaredBy` are minted in the target from the clock and
 * `scope.actor`; naming them here in an `Omit` is C10 6.2 written as a type
 * rather than as a comment, and it means a caller CANNOT supply either. A
 * parallel interface would have been a second copy of the same six fields,
 * free to drift, and the stored-field gate flagged exactly that when it was one
 * (eight fields declared and never read).
 *
 * `expiresOn` keeps the stored shape, `string | null`, rather than being widened
 * to optional. It is the one field the verb does not require, and `null` already
 * says so precisely: a permanent-validity certificate HAS no expiry, which is an
 * answer rather than a missing one. Re-declaring it as `expiresOn?: string`
 * would have added a ninth field to the intersection with no reader, which is
 * how the stored-field gate found the parallel interface in the first place.
 */
/**
 * @typedef {Omit<
 *     CertificateDeclaration,
 *     'declaredAt' | 'declaredBy'
 *   >} CertificateDeclarationVars
 */

/**
 * Declare a certificate nobody asked for (fires the `creation` verb
 * `t_supplierdoc_declare`, atom `supplierdoc:upload`).
 *
 * `supplierId` travels in the payload because `creationOwner` reads it there and
 * the dispatcher checks it against `scope.supplierId` — a supplier may declare
 * only for itself, QueryScope on a creation exactly as on a read.
 */
export function useSupplierDocumentDeclare() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, CertificateDeclarationVars & { supplierId: string }>} */ (
    useMutation
  )({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: { ...vars }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Ask a supplier for a document (fires the `creation` verb
 * `t_supplierdoc_request`, atom `supplierdoc:request` — the `compliance` lane).
 *
 * ⚠️ **THE BUYER NAMES THE SUPPLIER, AND THAT IS THE ONE DIRECTION THIS
 * PLATFORM ALLOWS A `supplierId` TO COME FROM SOMEWHERE OTHER THAN THE SESSION.**
 * Everywhere else the id is the seat's own (`scope.supplierId`); here it is the
 * subject of the act, because a request with no addressee is not a request. What
 * keeps that from being a spoofable field is `supplierDocumentTarget`'s
 * `creationOwner` + `requireCreationOwner` (C4b): the dispatcher refuses
 * `SCOPE_DENIED` unless the id resolves to a real tenant on the roster, so the
 * payload carries a validated SELECTION rather than a free string.
 *
 * `note` is the buyer's own words and is OPTIONAL AT THE VERB — the machine
 * requires `supplierId` + `category`. The surface requires it; see
 * `BuyerCompliance`'s confirm step.
 */
export function useSupplierDocumentRequest() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { supplierId: string; category: SupplierDocumentCategory; note?: string }>} */ (
    useMutation
  )({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_request',
        entity: 'supplierDocument',
        payload: { ...vars }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Declare against a slot the buyer opened, or re-declare after a refusal
 *  (fires `t_supplierdoc_submit`, atom `supplierdoc:submit`). */
export function useSupplierDocumentSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, CertificateDeclarationVars & { docId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ docId, ...vars }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_submit',
        entity: 'supplierDocument',
        entityId: docId,
        payload: { ...vars }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Compliance accepts the declaration (`t_supplierdoc_verify`). */
export function useSupplierDocumentVerify() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { docId: string }>} */ (useMutation)({
    mutationFn: ({ docId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_verify',
        entity: 'supplierDocument',
        entityId: docId,
        payload: {}
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      invalidate(scope);
      // Material G1 — a verified document can move the vendor's qualification
      // level, which is projected on the supplier reads (MR-10 AC-01).
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'suppliers' });
    }
  });
}

/**
 * Compliance refuses the declaration, WITH THE REASON THE VERB REQUIRES
 * (`t_supplierdoc_reject`).
 *
 * `rejectionReason` is non-optional here for `useRequisitionReject`'s reason,
 * and it matters more: §80 built the supplier's refusal surface on the promise
 * that a reason always travels with the refusal, and a refusal with no reason is
 * the dead end restated in the supplier's own language.
 */
export function useSupplierDocumentReject() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { docId: string; rejectionReason: string }>} */ (
    useMutation
  )({
    mutationFn: ({ docId, rejectionReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_reject',
        entity: 'supplierDocument',
        entityId: docId,
        payload: { rejectionReason }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ── B2 · THE SUPPLIER-APPLICATION REVIEW LANE ───────────────────────────────
//
// Three verbs, three hooks, one per act — the `useRequisition*` shape, because
// the review lane is the same shape one document over: a buyer-side collection
// whose acts are gated per atom and whose refusals reach the operator through
// the dispatcher's own channel rather than an invented message.
//
// ⚠️ **`t_application_submit` IS HERE AS OF B3, AND IT IS A BUYER'S VERB.**
// It stood deliberately absent while B2 shipped, on the ground that B3 was
// blocked. It was not: the block was named as an identifier-space mismatch and
// measured to be a copy defect — the `1000456` space this tree writes into
// `/register`'s placeholder holds ZERO rows, so there were never two populated
// spaces to reconcile. The roster is the one space, and the door resolves
// against it rather than teaching a format.

/**
 * @typedef {object} ApplicationSubmitVars
 * @property {Record<string, unknown>} payload The `t_application_submit` payload: `requestType` + `companyName` always,
 *   `s4Vendor` for the vendor-bearing type, `declarations` optional.
 *
 *   `Record<string, unknown>` matches `useRfqCreate`/`useQuotationSubmit` and is
 *   deliberate rather than lazy: a narrower type here would be a SECOND
 *   statement of what the verb requires, sitting one layer above
 *   `APPLICATION_BIRTH_FIELDS` and the three policy hooks, free to drift from
 *   them and impossible to falsify from either side.
 */

/**
 * Raise an application on an applicant's behalf (`application:submit`).
 *
 * ⚠️ **THE APPLICANT DOES NOT FIRE THIS AND CANNOT.** Every atom on this
 * machine is buyer-side, and `/register` sits behind the SEC-GATE-01 edge
 * matcher (`'/(.*)'`) — so nobody without Paragon's shared credential ever
 * reaches it, and there is no anonymous applicant to hold a seat. A Paragon
 * buyer records that somebody applied; that is what this verb means.
 */
export function useApplicationSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, ApplicationSubmitVars>} */ (
    useMutation
  )({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_submit',
        entity: 'supplierApplication',
        payload
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/** Pick an application off the queue (`application:review`). */
export function useApplicationStartReview() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { applicationId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ applicationId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_start_review',
        entity: 'supplierApplication',
        entityId: applicationId,
        payload: {}
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Accept the applicant (`application:decide`).
 *
 * No payload. The decision's attribution comes from the SESSION inside the
 * target (C10 §6.2) — a caller-supplied decider would be attribution by
 * assertion, which is the seam `PR_APPROVAL_ATTRIBUTED` exists to refuse one
 * lane over.
 */
export function useApplicationApprove() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { applicationId: string }>} */ (
    useMutation
  )({
    mutationFn: ({ applicationId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_approve',
        entity: 'supplierApplication',
        entityId: applicationId,
        payload: {}
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

/**
 * Refuse the applicant (`application:decide`), with the reason that refusal
 * will one day be delivered on.
 *
 * ⚠️ **`rejectionReason` IS NON-OPTIONAL IN THE TYPE**, for
 * `useRequisitionReject`'s reason: the verb requires it, the policy hook proves
 * it non-blank, and a caller that could omit it here would be refused at the
 * dispatcher with a type that had promised otherwise.
 */
export function useApplicationReject() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return /** @type {typeof useMutation<CommandResult, Error, { applicationId: string; rejectionReason: string }>} */ (
    useMutation
  )({
    mutationFn: ({ applicationId, rejectionReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_reject',
        entity: 'supplierApplication',
        entityId: applicationId,
        payload: { rejectionReason }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    }
  });
}

// ─── Call-offs (REQ-E09-01, REQ-E09-03, REQ-E09-04) ─────────────────────────
//
// One dispatch per verb. The buyer's release and the supplier's answer touch
// the same record, and both personas' reads are keyed under their own scope, so
// a successful call-off command invalidates EVERY scope's `callOffs` read (and
// the ASN read, which a linked ASN changes) — a persona switch in the same
// session then shows the change.

/**
 *  X-03 — set by the Order plan: the draft comes from an engine recommendation.
 *  REQ-E14-13 — set by the reschedule report: the change comes from an engine proposal (X-03).
 *  BL-32 / DRC-5 (BL-191) — `reasonCode` on a change: the coded reason (`callOffChange`);
 *  `ltp-dropped` proposes a delay the supplier answers with `delayAnswer` on `confirm`.
 *
 * @typedef {| { verb: 'release'; poId: string; poLineId: string; quantity: number; needDate: string; type: CallOffType }
 *   | {
 *       verb: 'draft';
 *       poId: string;
 *       poLineId: string;
 *       quantity: number;
 *       needDate: string;
 *       type: CallOffType;
 *       origin?: CallOffOrigin;
 *     }
 *   | { verb: 'editDraft'; id: string; reason: string; quantity?: number; needDate?: string; type?: CallOffType }
 *   | { verb: 'releaseDraft'; id: string }
 *   | { verb: 'dismiss'; id: string; reason: string }
 *   | {
 *       verb: 'change';
 *       id: string;
 *       reason: string;
 *       reasonCode?: string;
 *       quantity?: number;
 *       needDate?: string;
 *       origin?: CallOffOrigin;
 *     }
 *   | { verb: 'confirm'; id: string; comment?: string; delayAnswer?: DelayAnswer }
 *   | { verb: 'confirmNewDate'; id: string; confirmedDate: string; comment?: string }
 *   | { verb: 'confirmChanges'; id: string; confirmedQty: number; confirmedDate?: string; comment?: string }
 *   | { verb: 'confirmPartial'; id: string; deliveries: CallOffDelivery[]; comment?: string }
 *   | { verb: 'reject'; id: string; reason: string }
 *   | { verb: 'approve'; id: string }
 *   | { verb: 'rejectConfirmation'; id: string; reviewComment: string }
 *   | {
 *       verb: 'dispatch';
 *       id: string;
 *       shippedDate: string;
 *       expectedArrival: string;
 *       quantity: number;
 *       asnNumber?: string;
 *     }} CallOffCommandVars
 */

/** @type {Record<CallOffCommandVars['verb'], string>} */
const CALL_OFF_TRANSITION = {
  release: 't_calloff_release',
  draft: 't_calloff_draft',
  editDraft: 't_calloff_edit_draft',
  releaseDraft: 't_calloff_release_draft',
  dismiss: 't_calloff_dismiss',
  change: 't_calloff_change',
  confirm: 't_calloff_confirm',
  confirmNewDate: 't_calloff_confirm_new_date',
  confirmChanges: 't_calloff_confirm_changes',
  confirmPartial: 't_calloff_confirm_partial',
  reject: 't_calloff_reject',
  approve: 't_calloff_approve',
  rejectConfirmation: 't_calloff_reject_confirmation',
  dispatch: 't_calloff_dispatch'
};

/** Every call-off act, one verb per transition in `CALL_OFF_TRANSITION`. */
export function useCallOffCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, CallOffCommandVars>} */ (useMutation)({
    mutationFn: (vars) => {
      const { verb, ...rest } = vars;
      const creation = verb === 'release' || verb === 'draft';
      const { id, ...payload } = /** @type {{ id?: string } & Record<string, unknown>} */ (rest);
      return svc.commands.dispatch(scope, {
        transitionId: CALL_OFF_TRANSITION[verb],
        entity: 'callOff',
        ...(creation ? {} : { entityId: id }),
        payload: creation ? { ...rest } : payload
      });
    },
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'procurement' &&
          (q.queryKey[1] === 'callOffs' ||
            q.queryKey[1] === 'asns' ||
            q.queryKey[1] === 'reschedule' ||
            // CAP-9 — a release changes what remains, so the run-out moves.
            q.queryKey[1] === 'blanketPoRunOuts' ||
            // CAP-12 — and open supply, the gap and its proposal.
            q.queryKey[1] === 'demandAnticipation' ||
            q.queryKey[1] === 'inventoryAlerts')
      });
    }
  });
}

// ─── Reschedule proposals taken to SAP (REQ-E14-13 BR-07, ENG-D16) ──────────
//
// The Hub does not edit a PO; the Material Planner records that a PO-line
// proposal was taken to SAP. Refused while the engine data is simulated (X-03).

/**
 * @typedef {{
 *   readonly poNumber: string;
 *   readonly line: number;
 *   readonly proposalType: ProposalType;
 *   readonly proposedDate: string | null;
 *   readonly proposedQuantity: number;
 * }} SapChangeMarkVars
 */

/** Record that a PO-line reschedule proposal was taken to SAP (fires `t_sapchange_mark`). */
export function useSapChangeMarkCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, SapChangeMarkVars>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_sapchange_mark',
        entity: 'sapChangeMark',
        payload: {
          poNumber: vars.poNumber,
          line: vars.line,
          proposalType: vars.proposalType,
          proposedQuantity: vars.proposedQuantity,
          ...(vars.proposedDate !== null ? { proposedDate: vars.proposedDate } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'procurement' && q.queryKey[1] === 'reschedule'
      });
    }
  });
}

// ─── Material E1 · a planner input to the stock simulation (MR-7 BR-08) ──────
//
// Creation-only; `enteredBy` / `enteredAt` are stamped by the target from the
// session and the hub clock. The supplier's stock record is never touched.
/**
 * `date`:  `YYYY-MM-DD`, for inProduction and toDistributor.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly field: SimulationOverrideField;
 *   readonly value: number;
 *   readonly date?: string;
 * }} SimulationOverrideVars
 */

/** Enter a missing figure for the stock simulation (`t_simulation_override_set`). */
export function useSimulationOverrideSet() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, SimulationOverrideVars>} */ (
    useMutation
  )({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_simulation_override_set',
        entity: 'simulationOverride',
        payload: {
          supplierId: vars.supplierId,
          materialCode: vars.materialCode,
          field: vars.field,
          value: vars.value,
          ...(vars.date ? { date: vars.date } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') void qc.invalidateQueries();
    }
  });
}

// ─── Forecast overrides (REQ-E14-11 X-06 / BR-03) ───────────────────────────
//
// A Material Planning team member overrides one SKU × week of the demand
// forecast. The target reads the engine's value and the old value itself; the
// form sends the new value, the reason code and the note. A success changes the
// forecast shown on both forecast pages.

/**
 * @typedef {{
 *   readonly skuCode: string;
 *   readonly weekStart: string;
 *   readonly newValue: number;
 *   readonly reasonCode: string | null;
 *   readonly note: string | null;
 * }} ForecastOverrideVars
 */

/** Override one SKU × week of the demand forecast (fires `t_forecastoverride_record`). */
export function useForecastOverrideCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, ForecastOverrideVars>} */ (
    useMutation
  )({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_forecastoverride_record',
        entity: 'forecastOverride',
        payload: {
          skuCode: vars.skuCode,
          weekStart: vars.weekStart,
          newValue: vars.newValue,
          ...(vars.reasonCode ? { reasonCode: vars.reasonCode } : {}),
          ...(vars.note ? { note: vars.note } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'procurement' &&
          (q.queryKey[1] === 'forecastBias' || q.queryKey[1] === 'demandForecast')
      });
    }
  });
}

// ─── Warehouse-week decisions (FUX-D3) ──────────────────────────────────────
//
// The Material Planner records how a week that does not fit the warehouse is
// handled. The entity is `<stream>|<weekStart>`; the target reads the plan
// version, the time and the actor itself. A record of intent: a success
// changes the Make warehouse room page and nothing else.

/**
 * @typedef {{
 *     readonly stream: ForecastStream;
 *     readonly weekStart: string;
 *     readonly choice: WarehouseDecisionChoice;
 *     readonly note: string | null;
 *   }} WarehouseDecisionVars
 */

/** Record how a warehouse week that does not fit is handled (fires `t_warehousedecision_record`). */
export function useWarehouseDecisionCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, WarehouseDecisionVars>} */ (
    useMutation
  )({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_warehousedecision_record',
        entity: 'warehouseDecision',
        entityId: warehouseDecisionEntityId(vars.stream, vars.weekStart),
        payload: {
          choice: vars.choice,
          ...(vars.note ? { note: vars.note } : {})
        }
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'procurement' && q.queryKey[1] === 'reschedule'
      });
    }
  });
}

/**
 * DRC-D11 (BL-196) — set or confirm one material's OSIP level (fires
 * `t_osiplevel_set`). The Safety stock targets page re-reads, so the ROP
 * Fisik formula follows the new level, and Home re-reads its review task.
 * @typedef {{ readonly materialCode: string; readonly level: number }} OsipLevelVars
 */

/** Set or confirm a material's OSIP level (fires `t_osiplevel_set`). */
export function useOsipLevelCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, OsipLevelVars>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_osiplevel_set',
        entity: 'osipLevel',
        entityId: vars.materialCode,
        payload: { osipLevel: vars.level }
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'procurement' &&
          (q.queryKey[1] === 'safetyStock' || q.queryKey[1] === 'npdReviews')
      });
    }
  });
}

/**
 * DRC-17 BR-05 (BL-202) — save a what-if scenario (fires
 * `t_whatifscenario_save`). Only the sandbox's own read refreshes: the verb
 * changes no plan (BR-06).
 * @typedef {{
 *   readonly name: string;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly inputs: import('../transitions/whatIfSandboxRules').WhatIfInputs;
 *   readonly switches: import('../transitions/whatIfSandboxRules').WhatIfSwitches;
 * }} WhatIfScenarioVars
 */

/** Save a what-if scenario (fires `t_whatifscenario_save`). */
export function useWhatIfScenarioCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, WhatIfScenarioVars>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_whatifscenario_save',
        entity: 'whatIfScenario',
        payload: {
          name: vars.name,
          supplierId: vars.supplierId,
          materialCode: vars.materialCode,
          inputs: vars.inputs,
          switches: vars.switches
        }
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'procurement' && q.queryKey[1] === 'whatIf'
      });
    }
  });
}

/**
 * DRC-2 (BL-188) — publish the rolling demand anticipation of the current
 * planning week (fires `t_demandanticipation_publish`). `planningWeek` is the
 * Monday the confirm named; the verb refuses it once the hub week has moved on.
 * `agreedFirstOutside` records the suppliers who agreed to take the remainder
 * in the first week outside the horizon [Owner A8]. The figure moves the
 * surplus alert (DRC-4), so both reads are refreshed.
 */
export function useDemandAnticipationCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, { readonly planningWeek: string; readonly agreedFirstOutside: readonly string[] }>} */ (
    useMutation
  )({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_demandanticipation_publish',
        entity: 'demandAnticipation',
        payload: { planningWeek: vars.planningWeek, agreedFirstOutside: vars.agreedFirstOutside }
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'procurement' &&
          (q.queryKey[1] === 'demandAnticipation' || q.queryKey[1] === 'inventoryAlerts')
      });
    }
  });
}

/**
 * CAP-11 — record a material's consumption in a week (fires
 * `t_consumption_record`). It moves the grid's recorded consumption and the
 * DRC-18 moving average; the alerts read is refreshed with it.
 */
export function useConsumptionRecordCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, { readonly materialCode: string; readonly week: string; readonly qty: number; readonly unit: string; readonly source: 'manual' | 'upload' }>} */ (
    useMutation
  )({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_consumption_record',
        entity: 'consumption',
        payload: { ...vars }
      }),
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'procurement' &&
          (q.queryKey[1] === 'demandAnticipation' || q.queryKey[1] === 'inventoryAlerts')
      });
    }
  });
}

// ─── Inventory & capacity (REQ-E08-02 to REQ-E08-05) ────────────────────────
//
// One dispatch per verb. Every one of these changes figures BOTH personas read
// (a PTI recording is about a supplier; a supplier's submission feeds the
// planner's view; access decides what a supplier sees), so a successful command
// invalidates EVERY scope's inventory, access, capacity and alert reads — and
// the SDC reads, which show the same declarations on the forecast page.

/**
 *  BL-73 — the audit anchor of an earlier dispatch in the same visit (channel triage).
 *  BL-59 — the supplier pulls its OWN ERP stock (its own seat, its own id).
 *  Material C5 (MR-8 BR-04) — the planning group the capacity is for.
 *
 * @typedef {| {
 *       verb: 'declare';
 *       supplierId: string;
 *       materialCode: string;
 *       totalQty: number;
 *       channel: 'template' | 'manual';
 *       causationId?: string;
 *       supplierRop?: number;
 *       inProductionQty?: number;
 *       productionCompletionDate?: string;
 *       batches?: readonly { batchNumber: string; qty: number; manufacturingDate?: string; expiryDate?: string }[];
 *     }
 *   | {
 *       verb: 'record';
 *       supplierId: string;
 *       materialCode: string;
 *       totalQty: number;
 *       causationId?: string;
 *       supplierRop?: number;
 *       inProductionQty?: number;
 *       productionCompletionDate?: string;
 *       batches?: readonly { batchNumber: string; qty: number; manufacturingDate?: string; expiryDate?: string }[];
 *     }
 *   | { verb: 'sync'; supplierId: string }
 *   | { verb: 'pull'; supplierId: string }
 *   | { verb: 'grantAccess'; supplierId: string; materials: readonly string[]; alreadyGranted: boolean }
 *   | { verb: 'removeAccess'; supplierId: string }
 *   | {
 *       verb: 'submitCapacity';
 *       supplierId: string;
 *       planningGroupId: string;
 *       weeks: readonly { week: string; allocated: number; upside?: number; upsideConfirmed?: true; reason?: string; note?: string }[];
 *     }
 *   | { verb: 'closeAlert'; key: string; closeReason: string; actionNote?: string }} InventoryCommandVars
 */

const INVENTORY_READS = new Set(['inventory', 'stockAccess', 'capacityPlans', 'inventoryAlerts']);

/** Every inventory act: declarations, stock sync, stock access, capacity and alert close. */
export function useInventoryCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, InventoryCommandVars>} */ (
    useMutation
  )({
    mutationFn: (vars) => {
      switch (vars.verb) {
        case 'declare':
        case 'record': {
          // `causationId` is dispatch metadata, never a payload field.
          const { verb, causationId, ...payload } = vars;
          return svc.commands.dispatch(
            scope,
            {
              transitionId:
                verb === 'declare'
                  ? 't_inventorydeclaration_declare'
                  : 't_inventorydeclaration_record',
              entity: 'inventoryDeclaration',
              payload
            },
            causationId
          );
        }
        case 'sync':
          return svc.commands.dispatch(scope, {
            transitionId: 't_stocksync_run',
            entity: 'stockSync',
            payload: { supplierId: vars.supplierId }
          });
        case 'pull':
          return svc.commands.dispatch(scope, {
            transitionId: 't_stocksync_pull',
            entity: 'stockSync',
            payload: { supplierId: vars.supplierId }
          });
        case 'grantAccess':
          return svc.commands.dispatch(scope, {
            transitionId: vars.alreadyGranted ? 't_stockaccess_change' : 't_stockaccess_grant',
            entity: 'stockAccess',
            entityId: vars.supplierId,
            payload: { materials: [...vars.materials] }
          });
        case 'removeAccess':
          return svc.commands.dispatch(scope, {
            transitionId: 't_stockaccess_remove',
            entity: 'stockAccess',
            entityId: vars.supplierId,
            payload: {}
          });
        case 'submitCapacity':
          return svc.commands.dispatch(scope, {
            transitionId: 't_capacity_submit',
            entity: 'capacitySubmission',
            payload: {
              supplierId: vars.supplierId,
              planningGroupId: vars.planningGroupId,
              weeks: vars.weeks.map((w) => ({ ...w }))
            }
          });
        case 'closeAlert':
          return svc.commands.dispatch(scope, {
            transitionId: 't_inventoryalert_close',
            entity: 'inventoryAlert',
            entityId: vars.key,
            payload: {
              closeReason: vars.closeReason,
              ...(vars.actionNote ? { actionNote: vars.actionNote } : {})
            }
          });
      }
    },
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          (q.queryKey[0] === 'procurement' && INVENTORY_READS.has(String(q.queryKey[1]))) ||
          q.queryKey[0] === 'sdc'
      });
    }
  });
}

// ─── Forecast collaboration (REQ-E06-01 to REQ-E06-03) ──────────────────────
//
// One mutation per business act. Some acts are two governed verbs in a row:
//   · commit — `t_requirementresponse_submit` creates the draft, then
//     `t_requirementresponse_promote` submits it (a draft stays hidden from PTI
//     until then, BR-10); "Save draft" stops after the first.
//   · accept / request revision — the planner's review verb, then accept or
//     dispute (the dispute text is the revision request the supplier reads).
// Every act changes what BOTH personas read (lines, versions, alerts), so a
// successful one invalidates every scope's forecast and alert reads.

/**
 * @typedef {{
 *   readonly publicationId: string;
 *   readonly planVersion: string;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly periodBucket: string;
 * }} ForecastLineRef
 */

/**
 *  REQ-E14-06 — the stabilised engine plan (refused while simulated, ENG-B35).
 *  Save as a draft only (not visible to PTI).
 *
 * @typedef {| { verb: 'publish'; stream: 'packaging' | 'rawMaterial'; emergency?: boolean;   source?: 'engine' }
 *   | {
 *       verb: 'reassign';
 *       publicationId: string;
 *       materialCode: string;
 *       periodBucket: string;
 *       fromSupplierId: string;
 *       allocations: readonly { readonly supplierId: string; readonly qty: number }[];
 *       note: string;
 *     }
 *   | { verb: 'recordView'; publicationId: string; supplierId: string }
 *   | {
 *       verb: 'commit';
 *       line: ForecastLineRef;
 *       committedQty: number;
 *       upsideQty?: number;
 *       reason?: string;
 *       note?: string;
 *       draftOnly?: boolean;
 *     }
 *   | { verb: 'acknowledge'; line: ForecastLineRef; note?: string }
 *   | { verb: 'accept'; responseId: string; status: string }
 *   | { verb: 'requestRevision'; responseId: string; status: string; note: string }} ForecastCommandVars
 */

const FORECAST_READS = new Set([
  'forecastVersions',
  'forecastCommitments',
  'forecastCoverage',
  'inventoryAlerts',
  // The LTP is the current forecast version, so a new version (publish, or a
  // CAP-8 move) changes every capacity plan's demand and headroom.
  'capacityPlans',
  // CAP-9 — and every blanket PO's run-out, which draws the LTP down.
  'blanketPoRunOuts',
  // CAP-10 — and today's demand anticipation ("would be"), which starts from the LTP.
  'demandAnticipation'
]);

/** Every forecast-collaboration act: publish, reassign, record a view, commit, acknowledge, accept, request a revision. */
export function useForecastCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  /**
   * @param {string} responseId
   * @param {string} status
   * @returns {Promise<CommandResult | null>}
   */
  const review = async (responseId, status) => {
    if (status !== 'Submitted') return null;
    const res = await svc.commands.dispatch(scope, {
      transitionId: 't_requirementresponse_review',
      entity: 'requirementResponse',
      entityId: responseId,
      payload: {}
    });
    return res.status === 'failed' ? res : null;
  };

  return /** @type {typeof useMutation<CommandResult, Error, ForecastCommandVars>} */ (useMutation)(
    {
      mutationFn: async (vars) => {
        switch (vars.verb) {
          case 'publish':
            return svc.commands.dispatch(scope, {
              transitionId: 't_forecastversion_publish',
              entity: 'forecastVersion',
              payload: {
                stream: vars.stream,
                ...(vars.emergency ? { emergency: true } : {}),
                ...(vars.source ? { source: vars.source } : {})
              }
            });
          case 'reassign': {
            const { verb, ...payload } = vars;
            return svc.commands.dispatch(scope, {
              transitionId: 't_forecastversion_reassign',
              entity: 'forecastVersion',
              payload: { ...payload }
            });
          }
          case 'recordView':
            return svc.commands.dispatch(scope, {
              transitionId: 't_forecastview_record',
              entity: 'forecastView',
              payload: { publicationId: vars.publicationId, supplierId: vars.supplierId }
            });
          case 'commit': {
            const created = await svc.commands.dispatch(scope, {
              transitionId: 't_requirementresponse_submit',
              entity: 'requirementResponse',
              payload: {
                ...vars.line,
                confirmedQty: vars.committedQty,
                // The token the number was read from: the canonical digits, which
                // read the same in either convention.
                confirmedQtyRaw: String(vars.committedQty),
                // CAP-6 (BL-175) — no date: the store records the period start.
                ...(vars.upsideQty !== undefined ? { upsideQty: vars.upsideQty } : {}),
                ...(vars.reason
                  ? {
                      rootCause: { level1: vars.reason, ...(vars.note ? { note: vars.note } : {}) }
                    }
                  : {})
              }
            });
            if (created.status === 'failed' || vars.draftOnly || !created.entityId) return created;
            return svc.commands.dispatch(scope, {
              transitionId: 't_requirementresponse_promote',
              entity: 'requirementResponse',
              entityId: created.entityId,
              payload: {}
            });
          }
          case 'acknowledge':
            return svc.commands.dispatch(scope, {
              transitionId: 't_requirementresponse_acknowledge',
              entity: 'requirementResponse',
              payload: {
                ...vars.line,
                ...(vars.note ? { acknowledgment: { note: vars.note } } : {})
              }
            });
          case 'accept': {
            const refused = await review(vars.responseId, vars.status);
            if (refused) return refused;
            return svc.commands.dispatch(scope, {
              transitionId: 't_requirementresponse_accept',
              entity: 'requirementResponse',
              entityId: vars.responseId,
              payload: {}
            });
          }
          case 'requestRevision': {
            const refused = await review(vars.responseId, vars.status);
            if (refused) return refused;
            return svc.commands.dispatch(scope, {
              transitionId: 't_requirementresponse_dispute',
              entity: 'requirementResponse',
              entityId: vars.responseId,
              payload: { disputeReason: vars.note }
            });
          }
        }
      },
      onSettled: () => {
        qc.invalidateQueries({
          predicate: (q) =>
            (q.queryKey[0] === 'procurement' && FORECAST_READS.has(String(q.queryKey[1]))) ||
            q.queryKey[0] === 'sdc'
        });
      }
    }
  );
}

// ── RFx MANAGEMENT (REQ-E03-01 to REQ-E03-05) ──────────────────────────────
//
// ONE mutation hook for the whole RFx lane, in the shape `useForecastCommand`
// established: a discriminated `verb` per act, every act dispatched through the
// service seam, and ONE invalidation predicate — because an RFI answered, a
// round opened or an award recorded changes what BOTH personas read, across
// several reads each.
//
// Composite acts (save-then-submit) dispatch twice and STOP AT THE FIRST
// REFUSAL, returning it: a "sent" toast after a refused submit is the shape
// §90 exists to prevent.

/** @import { AwardLine, DocumentRequest, ResponseDocument, RfpAwardLine, RfiAnswer, RfiQuestion, RfpFirmPrice, RfpPricingAnswer, RfpPricingRequest, RfpTermAnswer, RfpTermRow, RfpTermsDocument, RfxConfidentiality, RfxCustomSection } from '../sourcing/types' */
/** @import { AttachmentMeta } from '../attachments/sessionAttachments' */

/**
 * A response document as a supplier sends it: the store stamps `uploadedAt`
 * and the session's `uploadedBy` (CE-11i). A carried document may still hold
 * both; the store ignores them and keeps its own record.
 */
/**
 * @typedef {Omit<ResponseDocument, 'uploadedAt' | 'uploadedBy'> &
 *   Partial<Pick<ResponseDocument, 'uploadedAt' | 'uploadedBy'>>} ResponseDocumentInput
 */

/** The authoring fields an RFI and an RFP both carry (RFx authoring batch). */
/**
 * @typedef {object} RfxAuthoringVars
 * @property {readonly RfxCustomSection[]} [customSections]
 * @property {readonly AttachmentMeta[]} [attachments]
 * @property {RfxConfidentiality} [confidentiality]
 * @property {readonly DocumentRequest[]} [documentRequests] -  NR-1 BR-02 — the documents the buyer asks every supplier for.
 */
/** @import { QuoteLineInput } from '../transitions/rfxRules' */
/** @import { QuotationAlternative, QuotationItemQuote, RfqDeclineReason, SampleOffer } from '../sourcing/rfqModel' */

/**
 * — REQ-E03-02 · RFI —
 *  What PTI wants to learn (section 3.6a CE-07).
 *  Send it to the invitees in the same act.
 * BL-93 — edit a DRAFT RFI (`t_rfi_revise_draft`). The whole content,
 * as the create verb takes it; `publish` then sends it in the same act.
 * Both dispatches carry `expectedState: 'Draft'`, so a draft somebody
 * else sent in the meantime is refused STALE_STATE, not overwritten.
 *  BL-93 — discard a DRAFT RFI (`t_rfi_cancel`, compare-and-set on Draft).
 *  NR-1 BR-01 — replaces the stored documents when sent; the upload times are the store's.
 *  Draft only — PTI does not see it (REQ-E03-02 edge case).
 * NR-1 BR-08 (D-6) — the supplier revises its SUBMITTED RFI response until
 * the deadline (`t_rfiresponse_revise`). The payload is the revised content;
 * the response stays Submitted and the revision is appended as the next
 * version. Not `reviseRfi`, which is the buyer's draft-edit verb.
 *  The supplier accepts a confidential RFI's terms (an answer-free save).
 * — REQ-E03-04 · RFP —
 *  The RFI this RFP is created from (spec D3).
 *  BL-93 — edit a DRAFT RFP (`t_rfp_revise_draft`); as `reviseRfi`.
 *  BL-93 — discard a DRAFT RFP (`t_rfp_cancel`, compare-and-set on Draft).
 *  NR-1 BR-01 — as `answerRfi`.
 * NR-1 BR-08 (D-6) — the supplier revises its SUBMITTED proposal until the
 * deadline (`t_rfpresponse_revise`); as `reviseRfiResponse`. Not `reviseRfp`,
 * which is the buyer's draft-edit verb.
 * The supplier accepts an RFP's confidentiality terms and/or its T&C document
 * (an answer-free save; the times are store-assigned).
 * — REQ-E03-03 · RFQ deadline —
 * — REQ-E03-05 · negotiation and award —
 * — NR-2 · firm-offer round on an RFP (D-1) —
 *  Option refs (`rfpOptionRef`), never a bare supplier `sup-opt-N` id.
 * RFx spec 2026-09-21 — a revision on a tiered RFQ re-prices per break
 * and carries the rest of the tiered answer forward.
 * NR-1 BR-09 — the files the revised quote carries (the earlier version's,
 * carried forward), judged by `quotation_documents_complete` as on submit.
 * The FINAL award (`t_rfq_award`): every item awarded, now or earlier, or
 * named in `notAwardedItems` ("Will not award", by `AwardItem.key`).
 * RFx C1 — the PARTIAL award (`t_rfq_award_partial`): some items now,
 * the rest later. The same payload, the same policy, a different verb.
 * — RFx D2 · award an RFP per option on firm offers, cancel, SAP marking —
 * The FINAL award (`t_rfp_award`): every option of the closed rounds
 * settled, now or earlier, or named in `notAwardedItems` (by option ref).
 * RFx C2/C3 (NR-3 BR-09) — cancel an award with a reason. `cancelAward` is
 * `t_rfq_award_cancel` (no other award stays in force: the RFQ returns to
 * Closed); `cancelAwardPartial` is `t_rfq_award_cancel_partial` (another award
 * stays: the RFQ stays Partly awarded). The page picks one with
 * `othersInForceAfterCancel`, the function the policy refuses the wrong one by.
 *  RFx C2/C3 (NR-3 BR-10) — mark an award "Raised in SAP" (`t_rfq_award_sap_raised`).
 *
 * @typedef {| ({
 *       verb: 'createRfi';
 *       title: string;
 *       description?: string;
 *       templateId: string;
 *       materialCategory: string;
 *       purchasingGroup?: string;
 *       responseDeadline: string;
 *       invitedSupplierIds: readonly string[];
 *       questions?: readonly RfiQuestion[];
 *       publish?: boolean;
 *     } & RfxAuthoringVars)
 *   | ({
 *       verb: 'reviseRfi';
 *       rfiId: string;
 *       title: string;
 *       description?: string;
 *       templateId: string;
 *       materialCategory: string;
 *       purchasingGroup?: string;
 *       responseDeadline: string;
 *       invitedSupplierIds: readonly string[];
 *       questions?: readonly RfiQuestion[];
 *       publish?: boolean;
 *     } & RfxAuthoringVars)
 *   | { verb: 'publishRfi'; rfiId: string }
 *   | { verb: 'discardRfi'; rfiId: string }
 *   | { verb: 'closeRfi'; rfiId: string }
 *   | { verb: 'extendRfi'; rfiId: string; deadline: string; supplierIds?: readonly string[] }
 *   | {
 *       verb: 'answerRfi';
 *       rfiId: string;
 *       supplierId: string;
 *       answers: readonly RfiAnswer[];
 *       documents?: readonly ResponseDocumentInput[];
 *       draftOnly?: boolean;
 *     }
 *   | {
 *       verb: 'reviseRfiResponse';
 *       responseId: string;
 *       answers: readonly RfiAnswer[];
 *       documents?: readonly ResponseDocumentInput[];
 *     }
 *   | { verb: 'acceptRfi'; rfiId: string; supplierId: string }
 *   | ({
 *       verb: 'createRfp';
 *       title: string;
 *       scope: string;
 *       materialCategory: string;
 *       purchasingGroup?: string;
 *       responseDeadline: string;
 *       currency: string;
 *       invitedSupplierIds: readonly string[];
 *       terms: readonly RfpTermRow[];
 *       publish?: boolean;
 *       sourceRfiId?: string;
 *       questions?: readonly RfiQuestion[];
 *       termsDocument?: RfpTermsDocument;
 *       pricing?: RfpPricingRequest;
 *     } & RfxAuthoringVars)
 *   | ({
 *       verb: 'reviseRfp';
 *       rfpId: string;
 *       title: string;
 *       scope: string;
 *       materialCategory: string;
 *       purchasingGroup?: string;
 *       responseDeadline: string;
 *       currency: string;
 *       invitedSupplierIds: readonly string[];
 *       terms: readonly RfpTermRow[];
 *       publish?: boolean;
 *       questions?: readonly RfiQuestion[];
 *       termsDocument?: RfpTermsDocument;
 *       pricing?: RfpPricingRequest;
 *     } & RfxAuthoringVars)
 *   | { verb: 'publishRfp'; rfpId: string }
 *   | { verb: 'discardRfp'; rfpId: string }
 *   | { verb: 'closeRfp'; rfpId: string }
 *   | { verb: 'extendRfp'; rfpId: string; deadline: string; supplierIds?: readonly string[] }
 *   | {
 *       verb: 'answerRfp';
 *       rfpId: string;
 *       supplierId: string;
 *       answers: readonly RfpTermAnswer[];
 *       otherTerms?: string;
 *       questionAnswers?: readonly RfiAnswer[];
 *       pricing?: RfpPricingAnswer;
 *       documents?: readonly ResponseDocumentInput[];
 *       draftOnly?: boolean;
 *     }
 *   | {
 *       verb: 'reviseRfpResponse';
 *       responseId: string;
 *       answers: readonly RfpTermAnswer[];
 *       otherTerms?: string;
 *       questionAnswers?: readonly RfiAnswer[];
 *       pricing?: RfpPricingAnswer;
 *       documents?: readonly ResponseDocumentInput[];
 *     }
 *   | { verb: 'acceptRfp'; rfpId: string; supplierId: string; confidentiality?: boolean; terms?: boolean }
 *   | { verb: 'extendRfq'; rfqId: string; deadline: string; supplierIds?: readonly string[] }
 *   | {
 *       verb: 'openRound';
 *       rfqId: string;
 *       deadline: string;
 *       invitedSupplierIds: readonly string[];
 *       message?: string;
 *       targetUnitPrice?: number;
 *       bestAndFinal?: boolean;
 *     }
 *   | { verb: 'closeRound'; roundId: string }
 *   | {
 *       verb: 'openRfpRound';
 *       rfpId: string;
 *       optionRefs: readonly string[];
 *       quantityPoints: readonly number[];
 *       invitedSupplierIds: readonly string[];
 *       deadline: string;
 *       message?: string;
 *     }
 *   | { verb: 'closeRfpRound'; roundId: string }
 *   | {
 *       verb: 'submitFirmOffer';
 *       roundId: string;
 *       supplierId: string;
 *       prices: readonly RfpFirmPrice[];
 *       validUntil: string;
 *       documents?: readonly AttachmentMeta[];
 *     }
 *   | {
 *       verb: 'reviseFirmOffer';
 *       offerId: string;
 *       prices: readonly RfpFirmPrice[];
 *       validUntil: string;
 *       documents?: readonly AttachmentMeta[];
 *     }
 *   | {
 *       verb: 'reviseQuote';
 *       roundId: string;
 *       rfqId: string;
 *       supplierId: string;
 *       roundNumber: number;
 *       supersedesQuotationId?: string;
 *       unitPrice: number;
 *       leadTimeDays: number;
 *       currency: BidCurrency;
 *       paymentTermsOffered?: string;
 *       validUntil?: string;
 *       notes?: string;
 *       lines?: readonly QuoteLineInput[];
 *       bestAndFinal?: boolean;
 *       itemQuotes?: readonly QuotationItemQuote[];
 *       alternatives?: readonly QuotationAlternative[];
 *       answers?: readonly RfiAnswer[];
 *       sampleOffer?: SampleOffer;
 *       documents?: readonly ResponseDocumentInput[];
 *     }
 *   | {
 *       verb: 'award';
 *       rfqId: string;
 *       awardedQuotationId: string;
 *       awardedSupplierId: string;
 *       awardLines?: readonly AwardLine[];
 *       awardReason?: string;
 *       notAwardedItems?: readonly string[];
 *     }
 *   | {
 *       verb: 'awardPartial';
 *       rfqId: string;
 *       awardedQuotationId: string;
 *       awardedSupplierId: string;
 *       awardLines: readonly AwardLine[];
 *       awardReason?: string;
 *     }
 *   | {
 *       verb: 'awardRfp';
 *       rfpId: string;
 *       awardLines: readonly RfpAwardLine[];
 *       awardReason: string;
 *       notAwardedItems?: readonly string[];
 *     }
 *   | { verb: 'awardRfpPartial'; rfpId: string; awardLines: readonly RfpAwardLine[]; awardReason: string }
 *   | { verb: 'cancelRfpAward'; rfpId: string; awardId: string; cancelReason: string }
 *   | { verb: 'cancelRfpAwardPartial'; rfpId: string; awardId: string; cancelReason: string }
 *   | { verb: 'markRfpAwardSap'; rfpId: string; awardId: string; sapDocumentNo: string }
 *   | { verb: 'cancelAward' | 'cancelAwardPartial'; rfqId: string; awardId: string; cancelReason: string }
 *   | { verb: 'markAwardSapRaised'; rfqId: string; awardId: string; sapDocumentNo: string }} RfxCommandVars
 */

/** Every read an RFx act can change, on either persona. */
const RFX_READS = new Set([
  'rfiEvents',
  'rfpEvents',
  'negotiationRounds',
  'rfpOfferRounds',
  'awards',
  'rfpAwards',
  'rfqs',
  'quotations',
  'inviteeCandidates'
]);

/** Every RFI / RFQ / RFP act, one verb per transition; refreshes `RFX_READS`. */
export function useRfxCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, RfxCommandVars>} */ (useMutation)({
    mutationFn: async (vars) => {
      switch (vars.verb) {
        case 'createRfi': {
          const { verb, publish, ...payload } = vars;
          const created = await svc.commands.dispatch(scope, {
            transitionId: 't_rfi_create',
            entity: 'rfiEvent',
            payload: { ...payload, invitedSupplierIds: [...payload.invitedSupplierIds] }
          });
          if (created.status === 'failed' || !publish || !created.entityId) return created;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_publish',
            entity: 'rfiEvent',
            entityId: created.entityId,
            payload: {}
          });
        }
        case 'reviseRfi': {
          const { verb, rfiId, publish, ...payload } = vars;
          const revised = await svc.commands.dispatch(scope, {
            transitionId: 't_rfi_revise_draft',
            entity: 'rfiEvent',
            entityId: rfiId,
            expectedState: 'Draft',
            payload: { ...payload, invitedSupplierIds: [...payload.invitedSupplierIds] }
          });
          if (revised.status === 'failed' || !publish) return revised;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_publish',
            entity: 'rfiEvent',
            entityId: rfiId,
            expectedState: 'Draft',
            payload: {}
          });
        }
        case 'discardRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_cancel',
            entity: 'rfiEvent',
            entityId: vars.rfiId,
            expectedState: 'Draft',
            payload: {}
          });
        case 'publishRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_publish',
            entity: 'rfiEvent',
            entityId: vars.rfiId,
            payload: {}
          });
        case 'closeRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_close',
            entity: 'rfiEvent',
            entityId: vars.rfiId,
            payload: {}
          });
        case 'extendRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_extend',
            entity: 'rfiEvent',
            entityId: vars.rfiId,
            payload: { deadline: vars.deadline, supplierIds: [...(vars.supplierIds ?? [])] }
          });
        case 'answerRfi': {
          const saved = await svc.commands.dispatch(scope, {
            transitionId: 't_rfiresponse_save',
            entity: 'rfiResponse',
            payload: {
              rfiId: vars.rfiId,
              supplierId: vars.supplierId,
              answers: [...vars.answers],
              ...(vars.documents !== undefined
                ? { documents: vars.documents.map((d) => ({ ...d })) }
                : {})
            }
          });
          if (saved.status === 'failed' || vars.draftOnly || !saved.entityId) return saved;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfiresponse_submit',
            entity: 'rfiResponse',
            entityId: saved.entityId,
            payload: {}
          });
        }
        case 'reviseRfiResponse':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfiresponse_revise',
            entity: 'rfiResponse',
            entityId: vars.responseId,
            expectedState: 'Submitted',
            payload: {
              answers: [...vars.answers],
              ...(vars.documents !== undefined
                ? { documents: vars.documents.map((d) => ({ ...d })) }
                : {})
            }
          });
        case 'reviseRfpResponse':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfpresponse_revise',
            entity: 'rfpResponse',
            entityId: vars.responseId,
            expectedState: 'Submitted',
            payload: {
              answers: [...vars.answers],
              ...(vars.otherTerms !== undefined ? { otherTerms: vars.otherTerms } : {}),
              ...(vars.questionAnswers !== undefined
                ? { questionAnswers: [...vars.questionAnswers] }
                : {}),
              ...(vars.pricing !== undefined ? { pricing: vars.pricing } : {}),
              ...(vars.documents !== undefined
                ? { documents: vars.documents.map((d) => ({ ...d })) }
                : {})
            }
          });
        case 'acceptRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfiresponse_save',
            entity: 'rfiResponse',
            payload: { rfiId: vars.rfiId, supplierId: vars.supplierId, acceptConfidentiality: true }
          });
        case 'acceptRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfpresponse_save',
            entity: 'rfpResponse',
            payload: {
              rfpId: vars.rfpId,
              supplierId: vars.supplierId,
              ...(vars.confidentiality ? { acceptConfidentiality: true } : {}),
              ...(vars.terms ? { acceptTerms: true } : {})
            }
          });
        case 'createRfp': {
          const { verb, publish, ...payload } = vars;
          const created = await svc.commands.dispatch(scope, {
            transitionId: 't_rfp_create',
            entity: 'rfpEvent',
            payload: {
              ...payload,
              invitedSupplierIds: [...payload.invitedSupplierIds],
              terms: [...payload.terms]
            }
          });
          if (created.status === 'failed' || !publish || !created.entityId) return created;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_publish',
            entity: 'rfpEvent',
            entityId: created.entityId,
            payload: {}
          });
        }
        case 'reviseRfp': {
          const { verb, rfpId, publish, ...payload } = vars;
          const revised = await svc.commands.dispatch(scope, {
            transitionId: 't_rfp_revise_draft',
            entity: 'rfpEvent',
            entityId: rfpId,
            expectedState: 'Draft',
            payload: {
              ...payload,
              invitedSupplierIds: [...payload.invitedSupplierIds],
              terms: [...payload.terms]
            }
          });
          if (revised.status === 'failed' || !publish) return revised;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_publish',
            entity: 'rfpEvent',
            entityId: rfpId,
            expectedState: 'Draft',
            payload: {}
          });
        }
        case 'discardRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_cancel',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            expectedState: 'Draft',
            payload: {}
          });
        case 'publishRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_publish',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: {}
          });
        case 'closeRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_close',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: {}
          });
        case 'extendRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_extend',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: { deadline: vars.deadline, supplierIds: [...(vars.supplierIds ?? [])] }
          });
        case 'answerRfp': {
          const saved = await svc.commands.dispatch(scope, {
            transitionId: 't_rfpresponse_save',
            entity: 'rfpResponse',
            payload: {
              rfpId: vars.rfpId,
              supplierId: vars.supplierId,
              answers: [...vars.answers],
              ...(vars.otherTerms !== undefined ? { otherTerms: vars.otherTerms } : {}),
              ...(vars.questionAnswers !== undefined
                ? { questionAnswers: [...vars.questionAnswers] }
                : {}),
              ...(vars.pricing !== undefined ? { pricing: vars.pricing } : {}),
              ...(vars.documents !== undefined
                ? { documents: vars.documents.map((d) => ({ ...d })) }
                : {})
            }
          });
          if (saved.status === 'failed' || vars.draftOnly || !saved.entityId) return saved;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfpresponse_submit',
            entity: 'rfpResponse',
            entityId: saved.entityId,
            payload: {}
          });
        }
        case 'extendRfq':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfq_extend',
            entity: 'rfq',
            entityId: vars.rfqId,
            payload: { deadline: vars.deadline, supplierIds: [...(vars.supplierIds ?? [])] }
          });
        case 'openRound': {
          const { verb, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_negotiationround_open',
            entity: 'negotiationRound',
            payload: { ...payload, invitedSupplierIds: [...payload.invitedSupplierIds] }
          });
        }
        case 'closeRound':
          return svc.commands.dispatch(scope, {
            transitionId: 't_negotiationround_close',
            entity: 'negotiationRound',
            entityId: vars.roundId,
            payload: {}
          });
        case 'openRfpRound': {
          const { verb, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_round_open',
            entity: 'rfpOfferRound',
            payload: {
              ...payload,
              optionRefs: [...payload.optionRefs],
              quantityPoints: [...payload.quantityPoints],
              invitedSupplierIds: [...payload.invitedSupplierIds]
            }
          });
        }
        case 'closeRfpRound':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_round_close',
            entity: 'rfpOfferRound',
            entityId: vars.roundId,
            payload: {}
          });
        case 'submitFirmOffer': {
          const { verb, prices, documents, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfpfirmoffer_submit',
            entity: 'rfpFirmOffer',
            payload: {
              ...payload,
              prices: prices.map((p) => ({ ...p })),
              ...(documents ? { documents: [...documents] } : {})
            }
          });
        }
        case 'reviseFirmOffer': {
          const { verb, offerId, prices, documents, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfpfirmoffer_revise',
            entity: 'rfpFirmOffer',
            entityId: offerId,
            payload: {
              ...payload,
              prices: prices.map((p) => ({ ...p })),
              ...(documents ? { documents: [...documents] } : {})
            }
          });
        }
        case 'reviseQuote': {
          const { verb, lines, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_quotation_revise',
            entity: 'quotation',
            payload: { ...payload, ...(lines ? { lines: lines.map((l) => ({ ...l })) } : {}) }
          });
        }
        case 'award': {
          const { verb, rfqId, awardLines, notAwardedItems, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfq_award',
            entity: 'rfq',
            entityId: rfqId,
            payload: {
              ...payload,
              ...(awardLines ? { awardLines: awardLines.map((l) => ({ ...l })) } : {}),
              ...(notAwardedItems ? { notAwardedItems: [...notAwardedItems] } : {})
            }
          });
        }
        case 'awardPartial': {
          const { verb, rfqId, awardLines, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfq_award_partial',
            entity: 'rfq',
            entityId: rfqId,
            payload: { ...payload, awardLines: awardLines.map((l) => ({ ...l })) }
          });
        }
        case 'awardRfp':
        case 'awardRfpPartial': {
          const { verb, rfpId, awardLines, ...rest } = vars;
          const notAwardedItems = verb === 'awardRfp' ? vars.notAwardedItems : undefined;
          return svc.commands.dispatch(scope, {
            transitionId: verb === 'awardRfp' ? 't_rfp_award' : 't_rfp_award_partial',
            entity: 'rfpEvent',
            entityId: rfpId,
            payload: {
              awardReason: rest.awardReason,
              awardLines: awardLines.map((l) => ({ ...l })),
              ...(notAwardedItems ? { notAwardedItems: [...notAwardedItems] } : {})
            }
          });
        }
        case 'cancelRfpAward':
        case 'cancelRfpAwardPartial':
          return svc.commands.dispatch(scope, {
            transitionId:
              vars.verb === 'cancelRfpAward' ? 't_rfp_award_cancel' : 't_rfp_award_cancel_partial',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: { awardId: vars.awardId, cancelReason: vars.cancelReason }
          });
        case 'markRfpAwardSap':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_award_sap_raised',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: { awardId: vars.awardId, sapDocumentNo: vars.sapDocumentNo }
          });
        case 'cancelAward':
        case 'cancelAwardPartial':
          return svc.commands.dispatch(scope, {
            transitionId:
              vars.verb === 'cancelAward' ? 't_rfq_award_cancel' : 't_rfq_award_cancel_partial',
            entity: 'rfq',
            entityId: vars.rfqId,
            payload: { awardId: vars.awardId, cancelReason: vars.cancelReason }
          });
        case 'markAwardSapRaised':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfq_award_sap_raised',
            entity: 'rfq',
            entityId: vars.rfqId,
            payload: { awardId: vars.awardId, sapDocumentNo: vars.sapDocumentNo }
          });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'procurement' && RFX_READS.has(String(q.queryKey[1]))
      });
    }
  });
}
