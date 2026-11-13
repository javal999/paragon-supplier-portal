// ────────────────────────────────────────────────────────────────────────────
// PEX-12 [Proposed] · THE PO CANCELLATION REQUEST TARGET (`poOnHoldDecision`'s
// shape). `entityId` is the request id (`poc-0001`, minted by the store).
//   · `readScopeOwner` NAMES THE SUPPLIER of the PO, so a supplier seat can
//     acknowledge only its own PO's request (§86).
//   · `create` inserts the request with the planner's reason; `applyTransition`
//     appends the acknowledgement. Time (hub clock) and actor are assigned here.
//   · NOTHING ELSE CHANGES: the PO keeps its status, no "Cancelled" exists and
//     no SAP write is made (the SAP identifier is unknown).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { poCancellationStore } from '../stores/poCancellationStore';
import { purchaseOrderStore } from '../stores/purchaseOrderStore';
import { isKnownSupplier } from '../supplierMaster';

/** @param {unknown} v @returns {string} */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** [Proposed] a request carries a reason of at least this many characters. */
export const PO_CANCEL_REASON_MIN_LENGTH = 10;

/** @type {CommandTarget} */
export const poCancellationTarget = {
  readState: (id) => poCancellationStore.get(id)?.state ?? null,
  readScopeOwner: (id) => poCancellationStore.get(id)?.supplierId ?? null,
  readEntity: (id) => poCancellationStore.get(id) ?? null,
  applyTransition: (id, _toState, _payload, scope) => {
    poCancellationStore.append(id, 'Acknowledged', {
      kind: 'acknowledged',
      at: sdcClock.now(),
      actor: scope.actor ?? NO_PERSON
    });
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = str(payload.supplierId);
    return isKnownSupplier(sid) ? sid : null;
  },
  create: (payload, _toState, scope) => {
    const po = purchaseOrderStore.get(str(payload.poId));
    const row = poCancellationStore.insert({
      supplierId: str(payload.supplierId),
      poId: str(payload.poId),
      poNumber: po?.poNumber ?? str(payload.poId),
      state: 'Requested',
      history: [
        {
          kind: 'requested',
          at: sdcClock.now(),
          actor: scope.actor ?? NO_PERSON,
          reason: str(payload.reason)
        }
      ]
    });
    return { entityId: row.id };
  }
};

// The PO exists and is the supplier's, has no request waiting, and the request
// carries a reason. Closed POs are refused: there is nothing left to cancel.
bindPolicyHook(POLICY_HOOKS.PO_CANCEL_REQUESTABLE, ({ payload }) => {
  const po = purchaseOrderStore.get(str(payload.poId));
  if (!po || po.supplierId !== str(payload.supplierId))
    return { ok: false, reason: 'PO_CANCEL_NO_PO: no such purchase order for this supplier' };
  if (po.status === 'Closed' || po.status === 'Delivered')
    return { ok: false, reason: 'PO_CANCEL_PO_CLOSED: this purchase order is already complete' };
  if (poCancellationStore.forPo(po.id)?.state === 'Requested')
    return {
      ok: false,
      reason: 'PO_CANCEL_ALREADY_REQUESTED: a cancellation request for this PO is waiting'
    };
  if (str(payload.reason).length < PO_CANCEL_REASON_MIN_LENGTH)
    return {
      ok: false,
      reason: `PO_CANCEL_REASON_REQUIRED: a reason of at least ${PO_CANCEL_REASON_MIN_LENGTH} characters is expected`
    };
  return { ok: true };
});
