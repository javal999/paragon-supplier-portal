// ────────────────────────────────────────────────────────────────────────────
// Material A1 · THE SUPPLIER OVERLAY TARGET (MR-1 BR-02, AC-06; plan AD-4, AD-5).
//
// `entityId` IS the supplier id — there is no supplier payload field — so the
// supplier commanded and the supplier recorded cannot disagree.
//
//   · `readState` answers `Defined` for any non-blank id, so an id the master
//     does not hold reaches the policy hook and is refused BY NAME
//     (`UNKNOWN_SUPPLIER`) rather than as a bare NOT_FOUND.
//   · `readScopeOwner` names the supplier when the master holds it — the
//     overlay is about that supplier — and null otherwise, so a supplier seat
//     is refused at SCOPE on every other supplier and on an unknown id alike
//     (no existence oracle, §86). No supplier lane holds the atom, so its own
//     row is refused at the ROLE gate.
//   · `applyTransition` APPENDS a row. `setAt` is the hub clock, `setBy` the
//     session's actor; neither is read from the payload.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  supplierUpdateModeRefusal,
  updateModeReasonOf,
  isStockUpdateMode
} from '../../../transitions/supplierOverlayRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { supplierOverlayStore } from '../stores/supplierOverlayStore';
import { isKnownSupplier, supplierEntry } from '../supplierMaster';

/** @type {CommandTarget} */
export const supplierOverlayTarget = {
  readState: (id) => (id.trim() !== '' ? 'Defined' : null),
  readScopeOwner: (id) => (isKnownSupplier(id) ? id : null),
  readEntity: (id) => supplierEntry(id),
  applyTransition: (id, _toState, payload, scope) => {
    // The policy hook has already refused every value this could reject.
    if (!isStockUpdateMode(payload.stockUpdateMode)) return;
    const reason = updateModeReasonOf(payload.reason);
    supplierOverlayStore.append({
      supplierId: id,
      stockUpdateMode: payload.stockUpdateMode,
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON,
      ...(reason !== undefined ? { reason } : {})
    });
  }
};

bindPolicyHook(POLICY_HOOKS.SUPPLIER_UPDATE_MODE_VALID, ({ entityId, payload }) => {
  const refusal = supplierUpdateModeRefusal(entityId, payload.stockUpdateMode, isKnownSupplier);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
