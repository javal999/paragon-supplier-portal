// ────────────────────────────────────────────────────────────────────────────
// Material C2 · THE SUPPLIER TRADE NAME TARGET (MR-3 BR-01 to BR-06; plan AD-5).
//
//   · Two creation verbs. `t_materialname_submit` (supplier) mints a record in
//     `Awaiting approval`; `t_materialname_load` (PTI, one command per file
//     row) mints one in `Approved`, marked `loadedByPti`. A load row identical
//     to the approved name in force returns that record and changes nothing,
//     so loading the same file twice is a no-op (BR-06).
//   · The owner is the supplier the payload names, resolved against the
//     supplier master for every persona (`requireCreationOwner`): a supplier
//     can only name itself, and PTI cannot mint a name for a supplier that
//     does not exist.
//   · `readScopeOwner` names the record's supplier. No supplier lane holds the
//     review atom, so a supplier reaches the ROLE gate on its own records and
//     the SCOPE gate on another's.
//   · `submittedBy` / `decidedBy` come from the session, the times from the
//     hub clock; neither is read from the payload.
//   · `materialNameCascades` picks which earlier record steps aside when a
//     newer one is submitted, approved or loaded (BR-01, BR-02).
// ────────────────────────────────────────────────────────────────────────────

import {
  bindPolicyHook,
  cascadesFor,
  POLICY_HOOKS,
  type CascadeCommand,
  type CascadeContext,
  type CommandTarget,
} from '../../../transitions';
import {
  cleanSupplierMaterialNo,
  cleanTradeName,
  materialNameEntryRefusal,
  materialNameRejectRefusal,
} from '../../../transitions/materialNameRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { materialNameStore } from '../stores/materialNameStore';
import { isAssignedMaterial } from '../inventoryReadModel';
import { isKnownSupplier } from '../supplierMaster';

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The approved record in force for a pair, or undefined. */
const approvedOf = (supplierId: string, materialCode: string) => {
  const approved = materialNameStore.forPair(supplierId, materialCode).filter((n) => n.state === 'Approved');
  return approved[approved.length - 1];
};

export const materialNameTarget: CommandTarget = {
  readState: (id) => materialNameStore.get(id)?.state ?? null,
  readScopeOwner: (id) => materialNameStore.get(id)?.supplierId ?? null,
  readEntity: (id) => materialNameStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope) => {
    const actor = scope.actor ?? NO_PERSON;
    if (toState === 'Approved') {
      materialNameStore.decide(id, 'Approved', { decidedBy: actor, decidedAt: sdcClock.now() });
    } else if (toState === 'Rejected') {
      // The policy hook has already refused a missing or blank reason.
      materialNameStore.decide(id, 'Rejected', {
        decidedBy: actor,
        decidedAt: sdcClock.now(),
        rejectionReason: str(payload.rejectionReason),
      });
    } else if (toState === 'Replaced') {
      materialNameStore.decide(id, 'Replaced');
    }
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = str(payload.supplierId);
    return isKnownSupplier(sid) ? sid : null;
  },
  create: (payload, toState, scope) => {
    const supplierId = str(payload.supplierId);
    const materialCode = str(payload.materialCode);
    const tradeName = cleanTradeName(payload.tradeName);
    const supplierMaterialNo = cleanSupplierMaterialNo(payload.supplierMaterialNo);
    const actor = scope.actor ?? NO_PERSON;
    const now = sdcClock.now();
    if (toState === 'Approved') {
      // BR-06 — upsert by supplier × material: the same name loaded again is no change.
      const current = approvedOf(supplierId, materialCode);
      if (current && current.tradeName === tradeName && current.supplierMaterialNo === supplierMaterialNo) {
        return { entityId: current.id };
      }
    }
    const row = materialNameStore.insert({
      supplierId,
      materialCode,
      tradeName,
      ...(supplierMaterialNo !== undefined ? { supplierMaterialNo } : {}),
      state: toState === 'Approved' ? 'Approved' : 'Awaiting approval',
      submittedBy: actor,
      submittedAt: now,
      ...(toState === 'Approved' ? { decidedBy: actor, decidedAt: now, loadedByPti: true } : {}),
    });
    return { entityId: row.id };
  },
};

/**
 * The cascade: a newer record makes the earlier one of the SAME standing step
 * aside — a new approved name replaces the approved one (at most one per
 * supplier × material, BR-01); a new submission replaces a name still awaiting
 * approval, and leaves the approved one in use until the new one is approved
 * (BR-02). Only ids that exist are returned (the fan-out's `catch` would
 * otherwise swallow a NOT_FOUND without a trace).
 */
export function materialNameCascades(ctx: CascadeContext): CascadeCommand[] {
  const row = materialNameStore.get(ctx.entityId);
  const [link] = cascadesFor(ctx.transitionId);
  if (!row || !link) return [];
  if (row.state !== 'Approved' && row.state !== 'Awaiting approval') return [];
  return materialNameStore
    .forPair(row.supplierId, row.materialCode)
    .filter((n) => n.id !== row.id && n.state === row.state)
    .map((n) => ({ entity: link.targetEntity, entityId: n.id, transitionId: link.targetTransitionId }));
}

bindPolicyHook(POLICY_HOOKS.MATERIAL_NAME_VALID, ({ currentState, toState, payload }) => {
  let refusal: string | null = null;
  if (toState === 'Rejected') {
    refusal = materialNameRejectRefusal(payload.rejectionReason);
  } else if (currentState === '') {
    // A creation (submit or load): the same rule the forms call.
    refusal = materialNameEntryRefusal({
      assigned: isAssignedMaterial(str(payload.supplierId), str(payload.materialCode)),
      tradeName: payload.tradeName,
      supplierMaterialNo: payload.supplierMaterialNo,
    });
  }
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
