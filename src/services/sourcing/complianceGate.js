// ────────────────────────────────────────────────────────────────────────────
// CR-23 — THE COMPLIANCE GATE (REQ-E03-01 BR-06, REQ-E03-05 BR-01a).
//
// A pass/fail check of ONE supplier against the materials of ONE sourcing
// event. Pure: no store, no clock of its own — `nowIso` is injected, so the
// award verb, the comparison and the invitee list all read the same answer.
//
// A supplier passes only when every criterion holds:
//   · halal — a valid (unexpired) halal certificate for each material that
//     needs halal (`halalApplicable: 'REQUIRED'` on the material master);
//   · bpom  — a valid BPOM registration for each material where BPOM applies
//     (`bpomApplicable: 'APPLICABLE'`);
//   · gmp   — GMP / ISO 22716 when the event sources cosmetic raw material
//     (material type `ROH`);
//   · status — not Suspended and not Blacklisted;
//   · otif  — measured OTIF at or above the gate minimum; "No history" is
//     judged by `gateNoHistoryPasses()` (both values: BL-55 placeholders).
//
// ⚠️ **`UNDETERMINED` IS NOT `REQUIRED`.** A material the master has not
// classified asks for no certificate here: the gate refuses an award on a rule
// somebody stated, never on one this module guessed. A code the master does not
// know at all asks for nothing, for the same reason.
//
// ⚠️ **WHERE A CERTIFICATE COMES FROM.** The compliance registry is the
// material-grain record (supplier × material × certificate), so when it holds a
// halal or BPOM row for this supplier and material, that row decides — valid
// only if `schemeValid` says so, which also retires a MUI-legacy halal cert on
// the BPJPH mandate date. Where the registry holds no such row, the supplier
// master's own flag decides: `halalCertified` with `certExpiryDate` on or after
// today, `bpomRegistered`, `gmpIso22716`.
//
// A failing supplier can still be found, invited and can quote. The gate only
// decides who can be SCORED (CR-15) and who can be AWARDED.
// ────────────────────────────────────────────────────────────────────────────

import { SupplierStatus } from '@app-types/supplier.types';
import { schemeValid } from '../data/complianceProjection';
/** @import { ComplianceRegistryEntry } from '../data/types' */
import { MATERIAL_MASTER } from '../sdc/fixtures';
/** @import { MaterialMaster } from '../sdc/types' */
import { gateMinOtifPct, gateNoHistoryPasses } from './complianceGateConfig';

/** The criteria of CR-23, in the order a buyer reads them. */
export const GATE_CRITERIA = /** @type {const} */ (['halal', 'bpom', 'gmp', 'status', 'otif']);
/** @typedef {(typeof GATE_CRITERIA)[number]} GateCriterion */

/** The gate's answer. `failed` is empty exactly when `passes` is true. */
/**
 * @typedef {object} GateResult
 * @property {boolean} passes
 * @property {readonly GateCriterion[]} failed
 * @property {true} [otifNoHistory] Present (true) only when `otif` failed because the supplier has NO history
 *   and the administrator has ruled that "No history" does not pass (BL-55,
 *   BL-32) — so the reason can say so, rather than "OTIF below N%" about a
 *   supplier with no OTIF at all.
 */

/** What the gate reads about a supplier — a supplier master row, narrowed. */
/**
 * @typedef {object} GateSupplier
 * @property {string} id
 * @property {SupplierStatus} status
 * @property {boolean} halalCertified
 * @property {string} certExpiryDate -  The halal certificate's expiry on the master (`YYYY-MM-DD`).
 * @property {boolean} bpomRegistered
 * @property {boolean} [gmpIso22716] -  GMP / ISO 22716 held. Absent = no evidence, which does not pass.
 */

/** What a set of materials asks of a supplier. */
/**
 * @typedef {object} GateRequirement
 * @property {boolean} halal
 * @property {boolean} bpom
 * @property {boolean} gmp
 */

/**
 * The requirement of a sourcing event's materials, read off the material master.
 * @param {readonly string[]} materialCodes
 * @param {MaterialMaster} [master]
 * @returns {GateRequirement}
 */
export function gateRequirementFor(materialCodes, master = MATERIAL_MASTER) {
  const rows = materialCodes.map((c) => master[c]).filter((r) => r !== undefined);
  return {
    halal: rows.some((r) => r.halalApplicable === 'REQUIRED'),
    bpom: rows.some((r) => r.bpomApplicable === 'APPLICABLE'),
    gmp: rows.some((r) => r.materialType === 'ROH')
  };
}

/** @param {ComplianceRegistryEntry} c */
const isHalalCert = (c) => c.certType.startsWith('HALAL');
/** @param {ComplianceRegistryEntry} c */
const isBpomCert = (c) => c.certType === 'BPOM';

/**
 * Does the supplier hold a valid certificate of one kind for ONE material?
 * Registry row first (material grain), the master's flag otherwise.
 * @param {string} materialCode
 * @param {readonly ComplianceRegistryEntry[]} certs
 * @param {(c: ComplianceRegistryEntry) => boolean} kind
 * @param {boolean} masterSays
 * @param {string} nowIso
 * @returns {boolean}
 */
function holdsFor(materialCode, certs, kind, masterSays, nowIso) {
  const rows = certs.filter((c) => kind(c) && c.materialCodes.includes(materialCode));
  if (rows.length > 0) return rows.some((c) => schemeValid(c, nowIso));
  return masterSays;
}

/**
 * True when a measured OTIF (or its absence) clears the gate minimum.
 * @param {number | null | undefined} otif
 * @returns {boolean}
 */
export function otifPassesGate(otif) {
  if (otif === null || otif === undefined) return gateNoHistoryPasses();
  return otif >= gateMinOtifPct();
}

/**
 * CR-23 — check one supplier against the materials of one sourcing event.
 *
 * @param certificates the supplier's compliance-registry rows (any supplier's
 *   rows are ignored — the gate filters on `supplierId` itself).
 * @param {GateSupplier} supplier
 * @param {number | null} otif
 * @param {readonly string[]} materialCodes
 * @param {string} nowIso
 * @param {readonly ComplianceRegistryEntry[]} [certificates]
 * @param {MaterialMaster} [master]
 * @returns {GateResult}
 */
export function complianceGate(
  supplier,
  otif,
  materialCodes,
  nowIso,
  certificates = [],
  master = MATERIAL_MASTER
) {
  const today = nowIso.slice(0, 10);
  const certs = certificates.filter((c) => c.supplierId === supplier.id);
  /** @param {(code: string) => boolean} pick */
  const needs = (pick) => materialCodes.filter((c) => master[c] !== undefined && pick(c));

  const halalMaster = supplier.halalCertified && supplier.certExpiryDate >= today;
  const halalOk = needs((c) => master[c].halalApplicable === 'REQUIRED').every((c) =>
    holdsFor(c, certs, isHalalCert, halalMaster, nowIso)
  );
  const bpomOk = needs((c) => master[c].bpomApplicable === 'APPLICABLE').every((c) =>
    holdsFor(c, certs, isBpomCert, supplier.bpomRegistered, nowIso)
  );
  const gmpOk = !gateRequirementFor(materialCodes, master).gmp || supplier.gmpIso22716 === true;
  const statusOk =
    supplier.status !== SupplierStatus.SUSPENDED && supplier.status !== SupplierStatus.BLACKLISTED;
  const otifOk = otifPassesGate(otif);

  /** @type {Record<GateCriterion, boolean>} */
  const ok = {
    halal: halalOk,
    bpom: bpomOk,
    gmp: gmpOk,
    status: statusOk,
    otif: otifOk
  };
  const failed = GATE_CRITERIA.filter((k) => !ok[k]);
  const noHistoryFail = !otifOk && (otif === null || otif === undefined);
  return {
    passes: failed.length === 0,
    failed,
    ...(noHistoryFail ? { otifNoHistory: /** @type {const} */ (true) } : {})
  };
}

/**
 * The refusal an award line naming a failing supplier earns (REQ-E03-05 BR-01a).
 * @param {string} supplierId
 * @param {readonly GateCriterion[]} failed
 * @returns {string}
 */
export const gateRefusal = (supplierId, failed) =>
  `COMPLIANCE_GATE_FAILED: ${supplierId} does not pass the compliance gate (${failed.join(', ')})`;
