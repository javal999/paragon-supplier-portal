// ────────────────────────────────────────────────────────────────────────────
// Material C2 · SUPPLIER TRADE NAMES, AS THE READER MAY SEE THEM
// (MR-3 BR-02, BR-03, edge case 2; MAT-R4, MAT-R15).
//
// The narrowing happens HERE, not in a page: a supplier reads its own names
// only (AC-03), PTI reads all. A name whose material is no longer assigned to
// its supplier stays on record but is left out of every read (edge case 2).
// PTI's description comes through the material master resolver.
// ────────────────────────────────────────────────────────────────────────────

/** @import { MaterialNameRow, QueryScope, SupplierMaterialName } from '../types' */
import { labelOf } from '../../sdc/materialMaster';
import { materialNameStore } from './stores/materialNameStore';
import { assignedMaterialCodesOf, isAssignedMaterial, supplierNameOf } from './inventoryReadModel';

/**
 * @param {string} supplierId
 * @param {string} materialCode
 */
const pairKey = (supplierId, materialCode) => `${supplierId}|${materialCode}`;

/**
 * Every name this reader may see: its own for a supplier, all for PTI; assigned materials only.
 * @param {QueryScope} scope
 * @returns {SupplierMaterialName[]}
 */
export function materialNamesFor(scope) {
  return materialNameStore
    .all()
    .filter((n) => scope.personaType !== 'supplier' || n.supplierId === scope.supplierId)
    .filter((n) => isAssignedMaterial(n.supplierId, n.materialCode));
}

/**
 * The approved name in force for a supplier × material, or undefined (none, or not assigned).
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {SupplierMaterialName | undefined}
 */
export function approvedNameFor(supplierId, materialCode) {
  if (!isAssignedMaterial(supplierId, materialCode)) return undefined;
  const approved = materialNameStore
    .forPair(supplierId, materialCode)
    .filter((n) => n.state === 'Approved');
  return approved[approved.length - 1];
}

/**
 * The row with its supplier's approved trade name attached (unchanged when there is none).
 * @template {{ readonly supplierId: string; readonly materialCode: string; readonly tradeName?: string }} T
 * @param {T} row
 * @returns {T}
 */
export function withTradeName(row) {
  const name = approvedNameFor(row.supplierId, row.materialCode)?.tradeName;
  return name ? { ...row, tradeName: name } : row;
}

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {readonly SupplierMaterialName[]} history
 * @returns {MaterialNameRow}
 */
function rowOf(supplierId, materialCode, history) {
  const approved = history.filter((n) => n.state === 'Approved');
  return {
    supplierId,
    supplierName: supplierNameOf(supplierId),
    materialCode,
    materialLabel: labelOf(materialCode),
    ...(approved.length > 0 ? { approved: approved[approved.length - 1] } : {}),
    ...(history.length > 0 ? { latest: history[history.length - 1] } : {}),
    history
  };
}

/**
 * The rows for this reader. A supplier: one row per material assigned to it,
 * named or not ("My materials"). PTI: one row per supplier × material that
 * carries at least one visible name.
 * @param {QueryScope} scope
 * @returns {MaterialNameRow[]}
 */
export function materialNameRowsFor(scope) {
  const visible = materialNamesFor(scope);
  const byPair = /** @type {Map<string, SupplierMaterialName[]>} */ (new Map());
  for (const n of visible) {
    const k = pairKey(n.supplierId, n.materialCode);
    byPair.set(k, [...(byPair.get(k) ?? []), n]);
  }
  if (scope.personaType === 'supplier') {
    const sid = scope.supplierId ?? '';
    return assignedMaterialCodesOf(sid).map((code) =>
      rowOf(sid, code, byPair.get(pairKey(sid, code)) ?? [])
    );
  }
  return [...byPair.values()]
    .map((h) => rowOf(h[0].supplierId, h[0].materialCode, h))
    .sort(
      (a, b) =>
        a.materialCode.localeCompare(b.materialCode) || a.supplierName.localeCompare(b.supplierName)
    );
}
