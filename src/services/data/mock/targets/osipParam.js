// ────────────────────────────────────────────────────────────────────────────
// Team answers 2026-10-28 · THE OSIP VALUE TARGET (B3, B6, B7, B10, E2).
//
// `entityId` IS the ledger key (`osipParamKey`); the value is the payload's
// `osipParamValue` (null resets to the default).
//
//   · `readState` answers `Maintained` for a well-formed key whose material
//     (and supplier) the masters resolve; any other key is NOT_FOUND, never a
//     silently created row (the `osipLevel` shape).
//   · `readScopeOwner` is null: the values are PTI's Material Planning team's,
//     so a supplier seat is denied at SCOPE on every key, real or not (§86).
//   · `applyTransition` APPENDS a row; `previous`, `setAt` (hub clock) and
//     `setBy` (the session's actor) are assigned here.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { mockSuppliers } from '@data/mockSuppliers';
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  osipParamRefusal,
  osipReasonRefusal,
  parseOsipParamKey
} from '../../../transitions/osipParams';
import { isKnownMaterial, sdcClock } from '../../../sdc';
import { declaredGroups } from '../../../sdc/materialGroups';
import { NO_PERSON } from '@context/noPerson';
import { osipParamStore } from '../stores/osipParamStore';
import { recordRopOnlyChange } from '../ropOrderAudit';

/**
 * PSC-4 BR-10 (BL-339) — the params that move ROP Order ONLY. A change to one
 * writes no DA version; it is recorded with the ROP Order figure's stored
 * inputs and rules version (DRC-D16). `safetyStockOn`, z and g move DA and are
 * the DA-version causes instead (`daCauseRules`).
 * @type {ReadonlySet<string>}
 */
const ROP_ONLY_PARAMS = new Set([
  'coverWeeks',
  'coverageWeeks',
  'materialBufferOn',
  'protectionBufferOn'
]);

/**
 * The key's parts, when the masters resolve every one of them.
 * @param {string} id
 */
function resolved(id) {
  const k = parseOsipParamKey(id);
  if (!k) return null;
  // PEX-12 [Proposed]: a material class is the SAP material group; only a declared one resolves.
  if (k.materialClass !== undefined && !declaredGroups().includes(k.materialClass)) return null;
  if (k.materialCode !== null && !isKnownMaterial(k.materialCode)) return null;
  if (k.supplierId !== null && !mockSuppliers.some((s) => s.id === k.supplierId)) return null;
  return k;
}

/** @type {CommandTarget} */
export const osipParamTarget = {
  readState: (id) => (resolved(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (resolved(id) ? { key: id, value: osipParamStore.valueOf(id) } : null),
  applyTransition: (id, _toState, payload, scope) => {
    const k = resolved(id);
    // The policy hook has already refused every payload this could reject.
    if (!k || osipParamRefusal(k.param, payload.osipParamValue) !== null) return;
    const reason =
      typeof payload.osipParamReason === 'string' ? payload.osipParamReason.trim() || null : null;
    osipParamStore.append({
      key: id,
      param: k.param,
      value: /** @type {number | boolean | null} */ (payload.osipParamValue),
      previous: osipParamStore.valueOf(id),
      reason,
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON
    });
    // PSC-4 BR-10 — an ROP-Order-only change is audited (DRC-D16), never a
    // DA version. The material is the key's; a supplier-scoped param never is.
    if (ROP_ONLY_PARAMS.has(k.param) && k.materialCode !== null)
      recordRopOnlyChange({
        key: id,
        field:
          /** @type {'coverWeeks' | 'coverageWeeks' | 'materialBufferOn' | 'protectionBufferOn'} */ (
            k.param
          ),
        value: /** @type {number | boolean | null} */ (payload.osipParamValue),
        reason,
        materialCode: k.materialCode,
        scope
      });
  }
};

// The same predicates the page's form calls (`osipParamRefusal`, `osipReasonRefusal`).
bindPolicyHook(POLICY_HOOKS.OSIP_PARAM_VALID, ({ entityId, payload }) => {
  const k = parseOsipParamKey(entityId);
  if (!k) return { ok: false, reason: 'OSIP_PARAM_UNKNOWN' };
  if (payload.osipParamValue === undefined)
    return { ok: false, reason: 'OSIP_PARAM_INVALID: a value (or null to reset) is expected' };
  const refusal =
    osipParamRefusal(k.param, payload.osipParamValue) ??
    osipReasonRefusal(k.param, payload.osipParamReason);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
