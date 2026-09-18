// ────────────────────────────────────────────────────────────────────────────
// Command hooks (v2.2 Step 3.6 + 3.10) — the write side of the query layer.
//
// The canonical mutation pattern: dispatch a command through the service seam →
// on a non-failed outcome, targeted invalidateQueries by scopeKey (procurement,
// current scope only) → the page re-derives from the mutated store. Pages hold
// NO local seeded copy.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDataService } from '../data/DataServiceContext';
import { useToast } from '../../hooks/useToast';
import { classifySettleFault } from '../transitions/settleFaults';
import { DataError } from '../data/types';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { scopeKey } from './useServiceQuery';
import type { BidCurrency } from '../../lib/currencyPolicy';
import type { FxPinSource } from '../../lib/fxPin';
import type {
  CommandResult,
  CommandStatus,
  QueryScope,
  InspectionResult,
  CommandDecision,
  CertificateDeclaration,
  SupplierDocumentCategory,
  PoLineResponse,
  PoRejectionCause,
  InvoiceLine,
  CallOffDelivery,
  CallOffType,
} from '../data/types';
import type { AsnLineInput } from '../transitions/fulfilmentRules';

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
 */
function useScope(): QueryScope {
  const { identity } = useCurrentIdentity();
  return {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    businessRoles: identity.businessRoles,
    actor: identity.actor,
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
async function settleOrRefuse(
  settle: (scope: QueryScope, correlationId: string) => Promise<CommandStatus | null>,
  scope: QueryScope,
  correlationId: string,
): Promise<CommandStatus> {
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
// `commandHooks.ts` contained ZERO `onError` handlers — a rejected settle was an
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
// re-attempts is the SETTLE, on the SAME correlationId: `dispatcher.ts` leaves a
// failed settle `submitted` with its `pending` context undeleted precisely so a
// second `settle()` completes. A re-POST would mint a SECOND correlationId and
// orphan the first, so widening `from` would have broken the thing it was meant
// to fix.
//
// ⚠️ **AND A TOAST IS NOT A REMEDY.** This handler names the remedy; the SURFACE
// has to offer it. Both consumers now hold the correlationId of the settles they
// started and render a retry on the interim state, gated on
// `SETTLE_FAULT_RETRYABLE` (`BuyerInvoices`, then `BuyerGoodsReceipt` at §91e).
function useSettleErrorToast(): (err: unknown, vars: { correlationId: string }) => void {
  const { toast } = useToast();
  const { t } = useTranslation();
  return (err, vars) => {
    const fault = classifySettleFault(err);
    toast({
      variant: 'error',
      title: t('settle.failed.title'),
      description: `${t(`settle.failed.${fault}`)} ${t('settle.failed.ref', {
        correlationId: vars.correlationId,
      })}`,
    });
  };
}

// Targeted invalidation: only the current scope's procurement reads (the last
// key element is the scopeKey), so a command never disturbs another supplier's
// cache and every derivation of THIS scope re-derives together.
function useInvalidateProcurement() {
  const qc = useQueryClient();
  return (scope: QueryScope) => {
    const key = scopeKey(scope);
    qc.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'procurement' && q.queryKey[q.queryKey.length - 1] === key,
    });
  };
}

export interface PoConfirmVars {
  poId: string;
  confirmedQuantities: number[];
  /** REQ-E07-02 Approve — the delivery date the supplier confirms. Optional so
   *  an older caller that sends quantities only still dispatches. */
  confirmedDeliveryDate?: string;
  comment?: string;
}

/**
 * Confirm a purchase order (fires `t_po_confirm`). On a non-failed outcome,
 * invalidates the current scope's procurement reads so the PO list/detail
 * re-derive with the new Confirmed status.
 */
export function usePurchaseOrderConfirm() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, PoConfirmVars>({
    mutationFn: ({ poId, confirmedQuantities, confirmedDeliveryDate, comment }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_po_confirm',
        entity: 'purchaseOrder',
        entityId: poId,
        payload: {
          confirmedQuantities,
          ...(confirmedDeliveryDate ? { confirmedDeliveryDate } : {}),
          ...(comment ? { comment } : {}),
        },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface PoAcknowledgeVars {
  poId: string;
}

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

  return useMutation<CommandResult, Error, PoAcknowledgeVars>({
    mutationFn: ({ poId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_po_acknowledge',
        entity: 'purchaseOrder',
        entityId: poId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ── PO response verbs (REQ-E07-02) and the shipping notice (REQ-E07-05) ────
// Same shape as confirm: dispatch through the seam, invalidate this scope's
// procurement reads on a non-failed outcome. `poId`, never `poNumber` (see
// `usePurchaseOrderAcknowledge`).

function usePoCommand<V extends { poId: string }>(
  transitionId: string,
  payloadOf: (vars: V) => Record<string, unknown>,
) {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();
  return useMutation<CommandResult, Error, V>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId,
        entity: 'purchaseOrder',
        entityId: vars.poId,
        payload: payloadOf(vars),
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface PoAdjustVars {
  poId: string;
  lineResponses: PoLineResponse[];
  comment?: string;
}

/** Adjust a PO with a per-line counter-offer (fires `t_po_adjust`). */
export function usePurchaseOrderAdjust() {
  return usePoCommand<PoAdjustVars>('t_po_adjust', ({ lineResponses, comment }) => ({
    lineResponses,
    ...(comment ? { comment } : {}),
  }));
}

export interface PoRejectVars {
  poId: string;
  rejectionCauses: PoRejectionCause[];
  comment?: string;
}

/** Reject a PO (fires `t_po_reject`). */
export function usePurchaseOrderReject() {
  return usePoCommand<PoRejectVars>('t_po_reject', ({ rejectionCauses, comment }) => ({
    rejectionCauses,
    ...(comment ? { comment } : {}),
  }));
}

/** The planner accepts a counter-offer (fires `t_po_accept_counter`). */
export function usePurchaseOrderAcceptCounter() {
  return usePoCommand<{ poId: string }>('t_po_accept_counter', () => ({}));
}

export interface PoRejectCounterVars {
  poId: string;
  reviewComment: string;
}

/** The planner rejects a counter-offer with a comment (fires `t_po_reject_counter`). */
export function usePurchaseOrderRejectCounter() {
  return usePoCommand<PoRejectCounterVars>('t_po_reject_counter', ({ reviewComment }) => ({
    reviewComment,
  }));
}

export interface PoShippingNoticeVars {
  poId: string;
  expectedCompletionDate: string;
}

/** Record or move the expected completion date (fires `t_po_shipping_notice`). */
export function usePurchaseOrderShippingNotice() {
  return usePoCommand<PoShippingNoticeVars>('t_po_shipping_notice', ({ expectedCompletionDate }) => ({
    expectedCompletionDate,
  }));
}

export interface AsnCreateVars {
  poReference: string;
  carrier?: string;
  trackingNumber?: string;
  eta?: string;
  /** REQ-E07-04 — shipped quantity, batch and expiry per PO line. Omitted, the
   *  draft proposes each line's open quantity. */
  lines?: AsnLineInput[];
  shipDate?: string;
  packingListFile?: string;
  /** BR-02 — required when a line ships more than its open quantity. */
  overShipReason?: string;
  /** REQ-E09-03 BR-06 — the confirmed call-off this ASN ships, if any. */
  callOffId?: string;
}

/**
 * Draft an ASN from a confirmed PO (fires the `creation` verb `t_asn_create`).
 * No entityId — the store assigns the ASN number, returned on the result. On a
 * non-failed outcome the ASN list AND the "awaiting ASN" panel re-derive.
 */
export function useAdvanceShipNoticeCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, AsnCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_create',
        entity: 'advanceShipNotice',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface AsnSubmitVars {
  asnNumber: string;
  carrier: string;
  trackingNumber: string;
  eta: string;
  shipDate?: string;
  lines?: AsnLineInput[];
  overShipReason?: string;
}

/** Submit a Draft ASN (fires `t_asn_submit`, Draft → Submitted). */
export function useAdvanceShipNoticeSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, AsnSubmitVars>({
    mutationFn: ({ asnNumber, carrier, trackingNumber, eta, shipDate, lines, overShipReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_submit',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
        payload: {
          carrier,
          trackingNumber,
          eta,
          ...(shipDate ? { shipDate } : {}),
          ...(lines ? { lines } : {}),
          ...(overShipReason ? { overShipReason } : {}),
        },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { asnNumber: string }>({
    mutationFn: ({ asnNumber }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_cancel',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── Receipt discrepancy (REQ-E07-06) ───────────────────────────────────────

export interface ReceiptDiscrepancyAnswerVars {
  receiptId: string;
  answer: 'acknowledge' | 'dispute';
  comment: string;
}

/** The supplier acknowledges or disputes a receipt discrepancy with a comment. */
export function useReceiptDiscrepancyAnswer() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, ReceiptDiscrepancyAnswerVars>({
    mutationFn: ({ receiptId, answer, comment }) =>
      svc.commands.dispatch(scope, {
        transitionId:
          answer === 'acknowledge' ? 't_receiptdiscrepancy_acknowledge' : 't_receiptdiscrepancy_dispute',
        entity: 'receiptDiscrepancy',
        payload: { receiptId, comment },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** PTI's planner resolves a disputed receipt discrepancy with a comment. */
export function useReceiptDiscrepancyResolve() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { receiptId: string; resolutionComment: string }>({
    mutationFn: ({ receiptId, resolutionComment }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_receiptdiscrepancy_resolve',
        entity: 'receiptDiscrepancy',
        entityId: receiptId,
        payload: { resolutionComment },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface AsnResolveDiscrepancyVars {
  asnNumber: string;
}

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

  return useMutation<CommandResult, Error, AsnResolveDiscrepancyVars>({
    mutationFn: ({ asnNumber }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_asn_resolve_discrepancy',
        entity: 'advanceShipNotice',
        entityId: asnNumber,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── RFQ create (Phase A/2 — retires extraRfqs) ──────────────────────────────
// Buyer raises a sourcing event through the SAME dispatcher creation mechanism as
// t_pr_create / t_asn_create (a creation-shape verb, near-clone of
// usePurchaseRequisitionCreate). Buyer-only: a supplier scope is SCOPE_DENIED
// before the role gate (RFQ creation is a buyer verb). This is the ONLY RFQ write
// path for a new event — it replaces the `extraRfqs` client-fabrication; on a
// non-failed outcome the sourcing board re-reads and the minted RFQ is list-visible.

export interface RfqCreateVars {
  /** The t_rfq_create payload (title + materialCategory required). */
  payload: Record<string, unknown>;
}

/** Raise a new RFQ (fires the `creation` verb `t_rfq_create`). */
export function useRfqCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqCreateVars>({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_create',
        entity: 'rfq',
        payload,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── RFQ award (Step 4 batch iv) — the cascade-class verb ────────────────────
// Buyer awards an RFQ to a chosen quotation. The dispatcher fans out (winner →
// Awarded, every other → Rejected) under one causation group; a non-failed
// outcome invalidates the buyer's procurement reads so the sourcing board, the
// awards history, and the quotation statuses all re-derive together.

export interface RfqAwardVars {
  rfqId: string;
  awardedQuotationId: string;
  awardedSupplierId: string;
}

/** Award an Open/Closed RFQ to a quotation (fires the cascade source `t_rfq_award`). */
export function useRfqAward() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqAwardVars>({
    mutationFn: ({ rfqId, awardedQuotationId, awardedSupplierId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_award',
        entity: 'rfq',
        entityId: rfqId,
        payload: { awardedQuotationId, awardedSupplierId },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

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

export interface RfqFxPinVars {
  rfqId: string;
  /** The bid currency being converted (never the base — its rate is 1). */
  quote: BidCurrency;
  /** Units of base per ONE unit of `quote`. */
  rate: number;
  /** The RATE's vintage (ISO date) — what staleness is measured from. */
  asOf: string;
  source: FxPinSource;
  /** SAP rate type ('M'/'B'/'G'), when the source distinguishes them. */
  rateType?: string;
}

/** Record (or supersede) the FX basis for one currency on one RFQ. */
export function useRfqFxPin() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqFxPinVars>({
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
          ...(rateType ? { rateType } : {}),
        },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

export interface RfqLifecycleVars {
  rfqId: string;
}

/** Cancel an RFQ before award (fires `t_rfq_cancel`, Draft/Open/Closed → Cancelled). */
export function useRfqCancel() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqLifecycleVars>({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_cancel',
        entity: 'rfq',
        entityId: rfqId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, RfqLifecycleVars>({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_publish',
        entity: 'rfq',
        entityId: rfqId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Reopen a closed RFQ for further responses (fires `t_rfq_reopen`, Closed → Open). */
export function useRfqReopen() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, RfqLifecycleVars>({
    mutationFn: ({ rfqId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_rfq_reopen',
        entity: 'rfq',
        entityId: rfqId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── Quotation lifecycle (Task 3b — the last sourcing-spine piece) ───────────
// t_quotation_submit is the ONE supplier-owned CREATION verb: the invited
// supplier answers an RFQ through the SAME dispatcher creation mechanism as
// t_rfq_create / t_pr_create (near-clone of useRfqCreate). Scope is ASN-faithful
// — the target's creationOwner admits the caller only if it is invited to the
// RFQ (else SCOPE_DENIED). The payload is RAW FACTS; the engine owns scoring at
// read (#78). t_quotation_review is the buyer's Submitted → Under Review move.

export interface QuotationSubmitVars {
  /** The t_quotation_submit payload (rfqId + unitPrice + leadTimeDays required). */
  payload: Record<string, unknown>;
}

/** Submit a quotation against an invited RFQ (fires the `creation` verb `t_quotation_submit`). */
export function useQuotationSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, QuotationSubmitVars>({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_quotation_submit',
        entity: 'quotation',
        payload,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface QuotationReviewVars {
  quotationId: string;
}

/** Move a submitted quote into evaluation (fires `t_quotation_review`, Submitted → Under Review). */
export function useQuotationReview() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, QuotationReviewVars>({
    mutationFn: ({ quotationId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_quotation_review',
        entity: 'quotation',
        entityId: quotationId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── Goods receipt (Step 4 batch ii) ────────────────────────────────────────
// The GR is a buyer/warehouse document, so these dispatch under the buyer scope.
// Create records the finalized inspection results; the header disposition is a
// ROLLUP the dispatcher re-derives from those stored lines (the UI cannot claim
// "Approved" a line rollup contradicts). Post is the first real sapBoundary verb.

export interface GrCreateVars {
  /** The parent shipment's ASN number (or a manual ASN ref). */
  asnReference: string;
  inspectionResults: InspectionResult[];
  receivedDate: string;
  receivedBy: string;
  notes?: string;
}

/**
 * Receive a GR from an arrived shipment (fires the `creation` verb
 * `t_gr_create`). No entityId — the store assigns the GR number, returned on
 * the result. Records the inspection results at create.
 */
export function useGoodsReceiptCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, GrCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_create',
        entity: 'goodsReceipt',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface GrFinalizeVars {
  grId: string;
  /** The rolled-up header verb: t_gr_approve | t_gr_partial_approve | t_gr_reject. */
  headerVerb: string;
  /** Required by t_gr_reject; ignored otherwise. */
  dispositionReason?: string;
}

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

  return useMutation<CommandResult, Error, GrFinalizeVars>({
    mutationFn: async ({ grId, headerVerb, dispositionReason }) => {
      // Move into inspection if still Pending; ignore an illegal-from-here result.
      await svc.commands.dispatch(scope, {
        transitionId: 't_gr_start_inspection',
        entity: 'goodsReceipt',
        entityId: grId,
      });
      return svc.commands.dispatch(scope, {
        transitionId: headerVerb,
        entity: 'goodsReceipt',
        entityId: grId,
        payload: dispositionReason ? { dispositionReason } : {},
      });
    },
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { grId: string }>({
    mutationFn: ({ grId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_post',
        entity: 'goodsReceipt',
        entityId: grId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { grId: string }>({
    mutationFn: ({ grId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_gr_request_retest',
        entity: 'goodsReceipt',
        entityId: grId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandStatus, Error, { correlationId: string }>({
    mutationFn: ({ correlationId }) =>
      settleOrRefuse((sc, cid) => svc.commands.settle(sc, cid), scope, correlationId),
    onSuccess: () => invalidate(scope),
    onError: onSettleError,
  });
}

// ─── Invoice (Step 4 batch iii, DR-7) ───────────────────────────────────────
// ONE canonical machine; both persona surfaces re-derive from one store. The
// supplier drafts + submits against its own PO (creation-shape); the buyer
// approves, disputes/resolves, and releases payment — the release is the second
// sapBoundary verb (Option B: no "paid" claim until settlement mints the FI doc).

export interface InvoiceCreateVars {
  /** The parent PO the invoice bills against (the supplier's own, confirmed or delivered). */
  poReference: string;
  amount: number;
  /** REQ-E07-07 — lines drawn from the selected goods receipts. */
  lines: InvoiceLine[];
  invoiceNumber: string;
  invoiceDate: string;
  /** Tax invoice (e-Faktur) file name. */
  taxInvoiceFile: string;
  dueDate?: string;
  submittedDate?: string;
  bankAccount?: string;
}

/** Draft an invoice against a confirmed PO (fires the `creation` verb
 *  `t_invoice_create`). No entityId — the store assigns the invoice number. */
export function useInvoiceCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, InvoiceCreateVars>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_create',
        entity: 'invoice',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Submit a Draft invoice (fires `t_invoice_submit`, Draft → Submitted). */
export function useInvoiceSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string; amount: number }>({
    mutationFn: ({ invoiceId, amount }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_submit',
        entity: 'invoice',
        entityId: invoiceId,
        payload: { amount },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

export interface InvoiceResubmitVars {
  invoiceId: string;
  amount: number;
  lines?: InvoiceLine[];
  invoiceNumber?: string;
  invoiceDate?: string;
  taxInvoiceFile?: string;
}

/** Correct and resubmit a returned invoice (fires `t_invoice_resubmit`). */
export function useInvoiceResubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, InvoiceResubmitVars>({
    mutationFn: ({ invoiceId, ...payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_resubmit',
        entity: 'invoice',
        entityId: invoiceId,
        payload: Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined && v !== '')),
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Approve a Matched invoice (fires `t_invoice_approve`, Matched → Approved). */
export function useInvoiceApprove() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string }>({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_approve',
        entity: 'invoice',
        entityId: invoiceId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Dispute a pre-payment invoice (fires `t_invoice_dispute`). Requires a reason. */
export function useInvoiceDispute() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string; disputeReason: string }>({
    mutationFn: ({ invoiceId, disputeReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_dispute',
        entity: 'invoice',
        entityId: invoiceId,
        payload: { disputeReason },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Resolve a disputed invoice (fires `t_invoice_resolve`, Disputed → Submitted). */
export function useInvoiceResolve() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { invoiceId: string }>({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_resolve',
        entity: 'invoice',
        entityId: invoiceId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { invoiceId: string }>({
    mutationFn: ({ invoiceId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_invoice_release_payment',
        entity: 'invoice',
        entityId: invoiceId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandStatus, Error, { correlationId: string }>({
    mutationFn: ({ correlationId }) =>
      settleOrRefuse((sc, cid) => svc.commands.settle(sc, cid), scope, correlationId),
    onSuccess: () => invalidate(scope),
    onError: onSettleError,
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

export interface PrCreateVars {
  /** The t_pr_create payload (material + quantity required; C7 §2.1). */
  payload: Record<string, unknown>;
  /** Governed-decision provenance, present only on a genuine quantity override. */
  decision?: CommandDecision;
}

/** Push a planned intake line to a Draft PR (fires the `creation` verb `t_pr_create`). */
export function usePurchaseRequisitionCreate() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, PrCreateVars>({
    mutationFn: ({ payload, decision }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_create',
        entity: 'purchaseRequisition',
        payload,
        ...(decision ? { decision } : {}),
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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
export interface RoleGrantVars {
  /** The system role being copied — the command's entityId. */
  parent: string;
  roleId: string;
  displayName: string;
  description: string;
  adds: readonly string[];
}

/** Grant a custom role: copy one system role and add to it (`t_role_grant`). */
export function useRoleGrant() {
  const svc = useDataService();
  const scope = useScope();
  const { identity } = useCurrentIdentity();

  return useMutation<CommandResult, Error, RoleGrantVars>({
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
          grantedBy: identity.actor,
        },
      }),
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

  return useMutation<CommandResult, Error, { prId: string }>({
    mutationFn: ({ prId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_approve',
        entity: 'purchaseRequisition',
        entityId: prId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { prId: string; rejectionReason: string }>({
    mutationFn: ({ prId, rejectionReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_reject',
        entity: 'purchaseRequisition',
        entityId: prId,
        payload: { rejectionReason },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { prId: string }>({
    mutationFn: ({ prId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_submit',
        entity: 'purchaseRequisition',
        entityId: prId,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { prId: string; revisionNote: string }>({
    mutationFn: ({ prId, revisionNote }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_pr_revise',
        entity: 'purchaseRequisition',
        entityId: prId,
        payload: { revisionNote },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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
export type CertificateDeclarationVars = Omit<
  CertificateDeclaration,
  'declaredAt' | 'declaredBy'
>;

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

  return useMutation<CommandResult, Error, CertificateDeclarationVars & { supplierId: string }>({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<
    CommandResult,
    Error,
    { supplierId: string; category: SupplierDocumentCategory; note?: string }
  >({
    mutationFn: (vars) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_request',
        entity: 'supplierDocument',
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Declare against a slot the buyer opened, or re-declare after a refusal
 *  (fires `t_supplierdoc_submit`, atom `supplierdoc:submit`). */
export function useSupplierDocumentSubmit() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, CertificateDeclarationVars & { docId: string }>({
    mutationFn: ({ docId, ...vars }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_submit',
        entity: 'supplierDocument',
        entityId: docId,
        payload: { ...vars },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Compliance accepts the declaration (`t_supplierdoc_verify`). */
export function useSupplierDocumentVerify() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { docId: string }>({
    mutationFn: ({ docId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_verify',
        entity: 'supplierDocument',
        entityId: docId,
        payload: {},
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { docId: string; rejectionReason: string }>({
    mutationFn: ({ docId, rejectionReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_supplierdoc_reject',
        entity: 'supplierDocument',
        entityId: docId,
        payload: { rejectionReason },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

export interface ApplicationSubmitVars {
  /**
   * The `t_application_submit` payload: `requestType` + `companyName` always,
   * `s4Vendor` for the vendor-bearing type, `declarations` optional.
   *
   * `Record<string, unknown>` matches `useRfqCreate`/`useQuotationSubmit` and is
   * deliberate rather than lazy: a narrower type here would be a SECOND
   * statement of what the verb requires, sitting one layer above
   * `APPLICATION_BIRTH_FIELDS` and the three policy hooks, free to drift from
   * them and impossible to falsify from either side.
   */
  payload: Record<string, unknown>;
}

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

  return useMutation<CommandResult, Error, ApplicationSubmitVars>({
    mutationFn: ({ payload }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_submit',
        entity: 'supplierApplication',
        payload,
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

/** Pick an application off the queue (`application:review`). */
export function useApplicationStartReview() {
  const svc = useDataService();
  const scope = useScope();
  const invalidate = useInvalidateProcurement();

  return useMutation<CommandResult, Error, { applicationId: string }>({
    mutationFn: ({ applicationId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_start_review',
        entity: 'supplierApplication',
        entityId: applicationId,
        payload: {},
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { applicationId: string }>({
    mutationFn: ({ applicationId }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_approve',
        entity: 'supplierApplication',
        entityId: applicationId,
        payload: {},
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
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

  return useMutation<CommandResult, Error, { applicationId: string; rejectionReason: string }>({
    mutationFn: ({ applicationId, rejectionReason }) =>
      svc.commands.dispatch(scope, {
        transitionId: 't_application_reject',
        entity: 'supplierApplication',
        entityId: applicationId,
        payload: { rejectionReason },
      }),
    onSuccess: (result) => {
      if (result.status !== 'failed') invalidate(scope);
    },
  });
}

// ─── Call-offs (REQ-E09-01, REQ-E09-03, REQ-E09-04) ─────────────────────────
//
// One dispatch per verb. The buyer's release and the supplier's answer touch
// the same record, and both personas' reads are keyed under their own scope, so
// a successful call-off command invalidates EVERY scope's `callOffs` read (and
// the ASN read, which a linked ASN changes) — a persona switch in the same
// session then shows the change.

export type CallOffCommandVars =
  | { verb: 'release'; poId: string; poLineId: string; quantity: number; needDate: string; type: CallOffType }
  | { verb: 'draft'; poId: string; poLineId: string; quantity: number; needDate: string; type: CallOffType }
  | { verb: 'editDraft'; id: string; reason: string; quantity?: number; needDate?: string; type?: CallOffType }
  | { verb: 'releaseDraft'; id: string }
  | { verb: 'dismiss'; id: string; reason: string }
  | { verb: 'change'; id: string; reason: string; quantity?: number; needDate?: string }
  | { verb: 'confirm'; id: string; comment?: string }
  | { verb: 'confirmNewDate'; id: string; confirmedDate: string; comment?: string }
  | { verb: 'confirmChanges'; id: string; confirmedQty: number; confirmedDate?: string; comment?: string }
  | { verb: 'confirmPartial'; id: string; deliveries: CallOffDelivery[]; comment?: string }
  | { verb: 'reject'; id: string; reason: string }
  | { verb: 'approve'; id: string }
  | { verb: 'rejectConfirmation'; id: string; reviewComment: string }
  | {
      verb: 'dispatch';
      id: string;
      shippedDate: string;
      expectedArrival: string;
      quantity: number;
      asnNumber?: string;
    };

const CALL_OFF_TRANSITION: Record<CallOffCommandVars['verb'], string> = {
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
  dispatch: 't_calloff_dispatch',
};

export function useCallOffCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return useMutation<CommandResult, Error, CallOffCommandVars>({
    mutationFn: (vars) => {
      const { verb, ...rest } = vars;
      const creation = verb === 'release' || verb === 'draft';
      const { id, ...payload } = rest as { id?: string } & Record<string, unknown>;
      return svc.commands.dispatch(scope, {
        transitionId: CALL_OFF_TRANSITION[verb],
        entity: 'callOff',
        ...(creation ? {} : { entityId: id }),
        payload: creation ? { ...rest } : payload,
      });
    },
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'procurement' && (q.queryKey[1] === 'callOffs' || q.queryKey[1] === 'asns'),
      });
    },
  });
}

// ─── Inventory & capacity (REQ-E08-02 to REQ-E08-05) ────────────────────────
//
// One dispatch per verb. Every one of these changes figures BOTH personas read
// (a PTI recording is about a supplier; a supplier's submission feeds the
// planner's view; access decides what a supplier sees), so a successful command
// invalidates EVERY scope's inventory, access, capacity and alert reads — and
// the SDC reads, which show the same declarations on the forecast page.

export type InventoryCommandVars =
  | {
      verb: 'declare';
      supplierId: string;
      materialCode: string;
      totalQty: number;
      channel: 'template' | 'manual';
      supplierRop?: number;
      inProductionQty?: number;
      productionCompletionDate?: string;
      batches?: readonly { batchNumber: string; qty: number; expiryDate?: string }[];
    }
  | {
      verb: 'record';
      supplierId: string;
      materialCode: string;
      totalQty: number;
      supplierRop?: number;
      inProductionQty?: number;
      productionCompletionDate?: string;
      batches?: readonly { batchNumber: string; qty: number; expiryDate?: string }[];
    }
  | { verb: 'sync'; supplierId: string }
  | { verb: 'grantAccess'; supplierId: string; materials: readonly string[]; alreadyGranted: boolean }
  | { verb: 'removeAccess'; supplierId: string }
  | {
      verb: 'submitCapacity';
      supplierId: string;
      materialGroup: string;
      weeks: readonly { week: string; allocated: number; upside?: number; reason?: string; note?: string }[];
    }
  | { verb: 'closeAlert'; key: string; actionNote: string };

const INVENTORY_READS = new Set(['inventory', 'stockAccess', 'capacityPlans', 'inventoryAlerts']);

export function useInventoryCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return useMutation<CommandResult, Error, InventoryCommandVars>({
    mutationFn: (vars) => {
      switch (vars.verb) {
        case 'declare':
        case 'record': {
          const { verb, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: verb === 'declare' ? 't_inventorydeclaration_declare' : 't_inventorydeclaration_record',
            entity: 'inventoryDeclaration',
            payload,
          });
        }
        case 'sync':
          return svc.commands.dispatch(scope, {
            transitionId: 't_stocksync_run',
            entity: 'stockSync',
            payload: { supplierId: vars.supplierId },
          });
        case 'grantAccess':
          return svc.commands.dispatch(scope, {
            transitionId: vars.alreadyGranted ? 't_stockaccess_change' : 't_stockaccess_grant',
            entity: 'stockAccess',
            entityId: vars.supplierId,
            payload: { materials: [...vars.materials] },
          });
        case 'removeAccess':
          return svc.commands.dispatch(scope, {
            transitionId: 't_stockaccess_remove',
            entity: 'stockAccess',
            entityId: vars.supplierId,
            payload: {},
          });
        case 'submitCapacity':
          return svc.commands.dispatch(scope, {
            transitionId: 't_capacity_submit',
            entity: 'capacitySubmission',
            payload: { supplierId: vars.supplierId, materialGroup: vars.materialGroup, weeks: vars.weeks.map((w) => ({ ...w })) },
          });
        case 'closeAlert':
          return svc.commands.dispatch(scope, {
            transitionId: 't_inventoryalert_close',
            entity: 'inventoryAlert',
            entityId: vars.key,
            payload: { actionNote: vars.actionNote },
          });
      }
    },
    onSuccess: (result) => {
      if (result.status === 'failed') return;
      qc.invalidateQueries({
        predicate: (q) =>
          (q.queryKey[0] === 'procurement' && INVENTORY_READS.has(String(q.queryKey[1]))) || q.queryKey[0] === 'sdc',
      });
    },
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

export interface ForecastLineRef {
  readonly publicationId: string;
  readonly planVersion: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly periodBucket: string;
}

export type ForecastCommandVars =
  | { verb: 'publish'; stream: 'packaging' | 'rawMaterial'; emergency?: boolean }
  | {
      verb: 'reassign';
      publicationId: string;
      materialCode: string;
      periodBucket: string;
      fromSupplierId: string;
      toSupplierId: string;
      note: string;
    }
  | { verb: 'recordView'; publicationId: string; supplierId: string }
  | {
      verb: 'commit';
      line: ForecastLineRef;
      committedQty: number;
      commitmentDate: string;
      upsideQty?: number;
      reason?: string;
      note?: string;
      /** Save as a draft only (not visible to PTI). */
      draftOnly?: boolean;
    }
  | { verb: 'submitDraft'; responseId: string }
  | { verb: 'acknowledge'; line: ForecastLineRef; note?: string }
  | { verb: 'accept'; responseId: string; status: string }
  | { verb: 'requestRevision'; responseId: string; status: string; note: string };

const FORECAST_READS = new Set(['forecastVersions', 'forecastCommitments', 'forecastCoverage', 'inventoryAlerts']);

export function useForecastCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  const review = async (responseId: string, status: string): Promise<CommandResult | null> => {
    if (status !== 'Submitted') return null;
    const res = await svc.commands.dispatch(scope, {
      transitionId: 't_requirementresponse_review',
      entity: 'requirementResponse',
      entityId: responseId,
      payload: {},
    });
    return res.status === 'failed' ? res : null;
  };

  return useMutation<CommandResult, Error, ForecastCommandVars>({
    mutationFn: async (vars) => {
      switch (vars.verb) {
        case 'publish':
          return svc.commands.dispatch(scope, {
            transitionId: 't_forecastversion_publish',
            entity: 'forecastVersion',
            payload: { stream: vars.stream, ...(vars.emergency ? { emergency: true } : {}) },
          });
        case 'reassign': {
          const { verb, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_forecastversion_reassign',
            entity: 'forecastVersion',
            payload: { ...payload },
          });
        }
        case 'recordView':
          return svc.commands.dispatch(scope, {
            transitionId: 't_forecastview_record',
            entity: 'forecastView',
            payload: { publicationId: vars.publicationId, supplierId: vars.supplierId },
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
              committedDate: vars.commitmentDate,
              ...(vars.upsideQty !== undefined ? { upsideQty: vars.upsideQty } : {}),
              ...(vars.reason ? { rootCause: { level1: vars.reason, ...(vars.note ? { note: vars.note } : {}) } } : {}),
            },
          });
          if (created.status === 'failed' || vars.draftOnly || !created.entityId) return created;
          return svc.commands.dispatch(scope, {
            transitionId: 't_requirementresponse_promote',
            entity: 'requirementResponse',
            entityId: created.entityId,
            payload: {},
          });
        }
        case 'submitDraft':
          return svc.commands.dispatch(scope, {
            transitionId: 't_requirementresponse_promote',
            entity: 'requirementResponse',
            entityId: vars.responseId,
            payload: {},
          });
        case 'acknowledge':
          return svc.commands.dispatch(scope, {
            transitionId: 't_requirementresponse_acknowledge',
            entity: 'requirementResponse',
            payload: { ...vars.line, ...(vars.note ? { acknowledgment: { note: vars.note } } : {}) },
          });
        case 'accept': {
          const refused = await review(vars.responseId, vars.status);
          if (refused) return refused;
          return svc.commands.dispatch(scope, {
            transitionId: 't_requirementresponse_accept',
            entity: 'requirementResponse',
            entityId: vars.responseId,
            payload: {},
          });
        }
        case 'requestRevision': {
          const refused = await review(vars.responseId, vars.status);
          if (refused) return refused;
          return svc.commands.dispatch(scope, {
            transitionId: 't_requirementresponse_dispute',
            entity: 'requirementResponse',
            entityId: vars.responseId,
            payload: { disputeReason: vars.note },
          });
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        predicate: (q) =>
          (q.queryKey[0] === 'procurement' && FORECAST_READS.has(String(q.queryKey[1]))) || q.queryKey[0] === 'sdc',
      });
    },
  });
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

import type {
  AwardLine,
  RfiAnswer,
  RfiQuestion,
  RfpTermAnswer,
  RfpTermRow,
} from '../sourcing/types';
import type { QuoteLineInput } from '../transitions/rfxRules';

export type RfxCommandVars =
  // — REQ-E03-02 · RFI —
  | {
      verb: 'createRfi';
      title: string;
      templateId: string;
      materialCategory: string;
      purchasingGroup?: string;
      responseDeadline: string;
      invitedSupplierIds: readonly string[];
      questions?: readonly RfiQuestion[];
      /** Send it to the invitees in the same act. */
      publish?: boolean;
    }
  | { verb: 'publishRfi'; rfiId: string }
  | { verb: 'closeRfi'; rfiId: string }
  | { verb: 'extendRfi'; rfiId: string; deadline: string; supplierIds?: readonly string[] }
  | {
      verb: 'answerRfi';
      rfiId: string;
      supplierId: string;
      answers: readonly RfiAnswer[];
      /** Draft only — PTI does not see it (REQ-E03-02 edge case). */
      draftOnly?: boolean;
    }
  // — REQ-E03-04 · RFP —
  | {
      verb: 'createRfp';
      title: string;
      scope: string;
      materialCategory: string;
      purchasingGroup?: string;
      responseDeadline: string;
      currency: string;
      invitedSupplierIds: readonly string[];
      terms: readonly RfpTermRow[];
      publish?: boolean;
    }
  | { verb: 'publishRfp'; rfpId: string }
  | { verb: 'closeRfp'; rfpId: string }
  | { verb: 'extendRfp'; rfpId: string; deadline: string; supplierIds?: readonly string[] }
  | {
      verb: 'answerRfp';
      rfpId: string;
      supplierId: string;
      answers: readonly RfpTermAnswer[];
      otherTerms?: string;
      draftOnly?: boolean;
    }
  // — REQ-E03-03 · RFQ deadline —
  | { verb: 'extendRfq'; rfqId: string; deadline: string; supplierIds?: readonly string[] }
  // — REQ-E03-05 · negotiation and award —
  | {
      verb: 'openRound';
      rfqId: string;
      deadline: string;
      invitedSupplierIds: readonly string[];
      message?: string;
      targetUnitPrice?: number;
      bestAndFinal?: boolean;
    }
  | { verb: 'closeRound'; roundId: string }
  | {
      verb: 'reviseQuote';
      roundId: string;
      rfqId: string;
      supplierId: string;
      roundNumber: number;
      supersedesQuotationId?: string;
      unitPrice: number;
      leadTimeDays: number;
      currency: BidCurrency;
      paymentTermsOffered?: string;
      validUntil?: string;
      notes?: string;
      lines?: readonly QuoteLineInput[];
      bestAndFinal?: boolean;
    }
  | {
      verb: 'award';
      rfqId: string;
      awardedQuotationId: string;
      awardedSupplierId: string;
      awardLines?: readonly AwardLine[];
      awardReason?: string;
    };

/** Every read an RFx act can change, on either persona. */
const RFX_READS = new Set([
  'rfiEvents',
  'rfpEvents',
  'negotiationRounds',
  'awards',
  'rfqs',
  'quotations',
  'inviteeCandidates',
]);

export function useRfxCommand() {
  const svc = useDataService();
  const scope = useScope();
  const qc = useQueryClient();

  return useMutation<CommandResult, Error, RfxCommandVars>({
    mutationFn: async (vars) => {
      switch (vars.verb) {
        case 'createRfi': {
          const { verb, publish, ...payload } = vars;
          const created = await svc.commands.dispatch(scope, {
            transitionId: 't_rfi_create',
            entity: 'rfiEvent',
            payload: { ...payload, invitedSupplierIds: [...payload.invitedSupplierIds] },
          });
          if (created.status === 'failed' || !publish || !created.entityId) return created;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_publish',
            entity: 'rfiEvent',
            entityId: created.entityId,
            payload: {},
          });
        }
        case 'publishRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_publish',
            entity: 'rfiEvent',
            entityId: vars.rfiId,
            payload: {},
          });
        case 'closeRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_close',
            entity: 'rfiEvent',
            entityId: vars.rfiId,
            payload: {},
          });
        case 'extendRfi':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfi_extend',
            entity: 'rfiEvent',
            entityId: vars.rfiId,
            payload: { deadline: vars.deadline, supplierIds: [...(vars.supplierIds ?? [])] },
          });
        case 'answerRfi': {
          const saved = await svc.commands.dispatch(scope, {
            transitionId: 't_rfiresponse_save',
            entity: 'rfiResponse',
            payload: { rfiId: vars.rfiId, supplierId: vars.supplierId, answers: [...vars.answers] },
          });
          if (saved.status === 'failed' || vars.draftOnly || !saved.entityId) return saved;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfiresponse_submit',
            entity: 'rfiResponse',
            entityId: saved.entityId,
            payload: {},
          });
        }
        case 'createRfp': {
          const { verb, publish, ...payload } = vars;
          const created = await svc.commands.dispatch(scope, {
            transitionId: 't_rfp_create',
            entity: 'rfpEvent',
            payload: {
              ...payload,
              invitedSupplierIds: [...payload.invitedSupplierIds],
              terms: [...payload.terms],
            },
          });
          if (created.status === 'failed' || !publish || !created.entityId) return created;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_publish',
            entity: 'rfpEvent',
            entityId: created.entityId,
            payload: {},
          });
        }
        case 'publishRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_publish',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: {},
          });
        case 'closeRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_close',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: {},
          });
        case 'extendRfp':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfp_extend',
            entity: 'rfpEvent',
            entityId: vars.rfpId,
            payload: { deadline: vars.deadline, supplierIds: [...(vars.supplierIds ?? [])] },
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
            },
          });
          if (saved.status === 'failed' || vars.draftOnly || !saved.entityId) return saved;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfpresponse_submit',
            entity: 'rfpResponse',
            entityId: saved.entityId,
            payload: {},
          });
        }
        case 'extendRfq':
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfq_extend',
            entity: 'rfq',
            entityId: vars.rfqId,
            payload: { deadline: vars.deadline, supplierIds: [...(vars.supplierIds ?? [])] },
          });
        case 'openRound': {
          const { verb, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_negotiationround_open',
            entity: 'negotiationRound',
            payload: { ...payload, invitedSupplierIds: [...payload.invitedSupplierIds] },
          });
        }
        case 'closeRound':
          return svc.commands.dispatch(scope, {
            transitionId: 't_negotiationround_close',
            entity: 'negotiationRound',
            entityId: vars.roundId,
            payload: {},
          });
        case 'reviseQuote': {
          const { verb, lines, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_quotation_revise',
            entity: 'quotation',
            payload: { ...payload, ...(lines ? { lines: lines.map((l) => ({ ...l })) } : {}) },
          });
        }
        case 'award': {
          const { verb, rfqId, awardLines, ...payload } = vars;
          return svc.commands.dispatch(scope, {
            transitionId: 't_rfq_award',
            entity: 'rfq',
            entityId: rfqId,
            payload: { ...payload, ...(awardLines ? { awardLines: awardLines.map((l) => ({ ...l })) } : {}) },
          });
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'procurement' && RFX_READS.has(String(q.queryKey[1])),
      });
    },
  });
}
