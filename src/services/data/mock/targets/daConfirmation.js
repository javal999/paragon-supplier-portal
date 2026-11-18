// ────────────────────────────────────────────────────────────────────────────
// PSC-1 (BL-336) · THE DA WEEKLY CONFIRMATION TARGET.
//
// `entityId` is the record id (`dac-0001`, minted by the store).
//
//   · `readState` answers `Confirmed` for a record that exists.
//   · `readScopeOwner` names the record's supplier, and `creationOwner` the
//     supplier the payload names, resolved against the supplier master
//     (`requireCreationOwner`): a supplier seat can confirm only its own
//     material, and nobody can confirm for a supplier that does not exist.
//   · `create` APPENDS a record. The time (hub clock) and the actor (the
//     session's) are assigned here. BR-08: the changed fields are DERIVED here
//     against the figure in force before the submission (the stock record, else
//     the last confirmation) — never taken from the payload.
//   · `applyTransition` is a no-op: a record is never changed; a later record
//     for the same supplier × week supersedes it at read.
//
// It writes ONLY `daConfirmationStore`. The stock record stays the single stock
// source through the stock verb (PSC-1 BR-06, REQ-E08-02 BR-09): this target
// stores the figure that PRE-FILLS the stock page and never a declaration.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { changedSohFields, daConfirmationRefusal } from '../../../transitions/daConfirmationRules';
import { supplierDaRows } from '../../../transitions/supplierDaView';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { daConfirmationStore } from '../stores/daConfirmationStore';
import { daSohBefore } from '../daConfirmationReadModel';
import { isAssignedMaterial } from '../inventoryReadModel';
import { isKnownSupplier } from '../supplierMaster';
import { demandAnticipationStore } from '../stores/demandAnticipationStore';
import { inventoryDeclarationStore } from '../stores/inventoryDeclarationStore';

/**
 * @param {unknown} v
 * @returns {string}
 */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * The payload's material figures, whatever shape reached the target.
 * @param {unknown} raw
 * @returns {{ materialCode: string; soh: unknown }[]}
 */
const materialsOf = (raw) =>
  Array.isArray(raw)
    ? raw
        .filter((m) => m && typeof m === 'object')
        .map((m) => ({
          materialCode: str(/** @type {{ materialCode?: unknown }} */ (m).materialCode),
          soh: /** @type {{ soh?: unknown }} */ (m).soh
        }))
    : [];

/**
 * Does the pair's publication hold this week? (PSC-1 BR-02 / BR-09: the
 * deadline, and the confirmation, apply to a published period only.)
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} week
 * @returns {boolean}
 */
const pairPublishedIn = (supplierId, materialCode, week) =>
  supplierDaRows(demandAnticipationStore.all()).some(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode && r.planningWeek === week
  );

/** @type {CommandTarget} */
export const daConfirmationTarget = {
  readState: (id) => (daConfirmationStore.get(id) ? 'Confirmed' : null),
  readScopeOwner: (id) => daConfirmationStore.get(id)?.supplierId ?? null,
  readEntity: (id) => daConfirmationStore.get(id) ?? null,
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
    const supplierId = str(payload.supplierId);
    const week = str(payload.week);
    const soh = materialsOf(payload.soh).map((m) => ({
      materialCode: m.materialCode,
      soh: Number(m.soh)
    }));
    // BR-08 — what changed against the figure in force before the submission.
    const before = daSohBefore(
      supplierId,
      week,
      soh.map((m) => m.materialCode),
      (s, m) => inventoryDeclarationStore.latestFor(s, m)?.totalQty ?? null
    );
    const row = daConfirmationStore.insert({
      supplierId,
      week,
      publicationId: str(payload.publicationId),
      soh,
      changedFields: changedSohFields(soh, before),
      recordedAt: sdcClock.now(),
      recordedBy: scope.actor ?? NO_PERSON
    });
    return { entityId: row.id };
  }
};

// PSC-1 BR-10 / BR-06 — the same rule the page's pre-check calls: a known
// supplier, a week that is a date, a publication holding every material of the
// confirmation (so no figure is confirmed against a period nobody published),
// each material assigned to the supplier, and a figure of 0 or more.
bindPolicyHook(POLICY_HOOKS.DA_CONFIRMATION_VALID, ({ payload }) => {
  const supplierId = str(payload.supplierId);
  const week = payload.week;
  const materials = materialsOf(payload.soh);
  const refusal = daConfirmationRefusal({
    supplierKnown: isKnownSupplier(supplierId),
    week,
    publicationHolds:
      materials.length > 0 &&
      materials.every((m) => pairPublishedIn(supplierId, m.materialCode, str(week))),
    materials: materials.map((m) => ({
      materialCode: m.materialCode,
      soh: m.soh,
      assigned: isAssignedMaterial(supplierId, m.materialCode)
    }))
  });
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
