// ────────────────────────────────────────────────────────────────────────────
// BL-194 · THE SUPPLIER FEEDSTOCK CONFIRMATION TARGET (DRC-8 BR-a; DRC-D17).
//
// `entityId` is the record id (`fsc-0001`, minted by the store).
//
//   · `readState` answers `Confirmed` for a record that exists.
//   · `readScopeOwner` names the record's supplier, and `creationOwner` the
//     supplier the payload names, resolved against the supplier master for
//     every persona (`requireCreationOwner`): a supplier seat can confirm only
//     its OWN materials, and nobody can confirm for a supplier that does not
//     exist. The policy hook then refuses a material not assigned to it.
//   · `create` APPENDS a record. The unit comes from the material master,
//     never the payload; the time (hub clock) and the actor (the session's)
//     are assigned here.
//   · `applyTransition` is a no-op: a record is never changed; a later record
//     for the same supplier × material supersedes it at read.
//
// MoM 2B / MR-7 BR-01: this writes ONLY to `feedstockConfirmationStore`. The
// stock declarations behind SOH, the simulation and "free to call off" are
// untouched (feedstockConfirm.test.js holds that).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { feedstockEntryRefusal } from '../../../transitions/feedstockRules';
import { dayOf } from '../../../transitions/inventoryRules';
import { materialEntry, sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { feedstockConfirmationStore } from '../stores/feedstockConfirmationStore';
import { isAssignedMaterial } from '../inventoryReadModel';
import { isKnownSupplier } from '../supplierMaster';

/**
 * @param {unknown} v
 * @returns {string}
 */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** @type {CommandTarget} */
export const feedstockConfirmationTarget = {
  readState: (id) => (feedstockConfirmationStore.get(id) ? 'Confirmed' : null),
  readScopeOwner: (id) => feedstockConfirmationStore.get(id)?.supplierId ?? null,
  readEntity: (id) => feedstockConfirmationStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a confirmation is never changed */
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = str(payload.supplierId);
    return isKnownSupplier(sid) ? sid : null;
  },
  create: (payload, _toState, scope) => {
    // The policy hook has refused every payload this could not store.
    const materialCode = str(payload.materialCode);
    const note = str(payload.note);
    const row = feedstockConfirmationStore.insert({
      supplierId: str(payload.supplierId),
      materialCode,
      feedstockQty: Number(payload.feedstockQty),
      uom: materialEntry(materialCode)?.canonicalUom ?? '',
      confirmedOn: str(payload.confirmedOn),
      ...(note !== '' ? { note } : {}),
      recordedAt: sdcClock.now(),
      recordedBy: scope.actor ?? NO_PERSON
    });
    return { entityId: row.id };
  }
};

// DRC-8 BR-a — the same rule the supplier form calls. "Today" is the hub
// clock's day, the convention the stock submission's batch dates use.
bindPolicyHook(POLICY_HOOKS.FEEDSTOCK_CONFIRMATION_VALID, ({ payload }) => {
  const refusal = feedstockEntryRefusal({
    assigned: isAssignedMaterial(str(payload.supplierId), str(payload.materialCode)),
    feedstockQty: payload.feedstockQty,
    confirmedOn: payload.confirmedOn,
    note: payload.note,
    today: dayOf(sdcClock.now())
  });
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
