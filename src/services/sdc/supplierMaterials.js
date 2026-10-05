// ────────────────────────────────────────────────────────────────────────────
// SDC-3b — the supplier's collaborated-material set (a P1 read selector).
//
// "A material Paragon collaborates with you on" = the (i)∪(ii) membership the
// declare/report CommandTargets authorise against (MockCommandService
// `collaboratedMaterial`): a relationship exists (i) OR any publication ever
// fanned this supplier × material (ii). This selector is the SURFACE mirror of
// that server rule — it populates the material picker with EXACTLY the set the
// command would accept, so the UI never offers a material the dispatch will deny.
// Pure (inputs as arguments, the SDC selector convention).
//
// The relationship `supplierType` rides each entry because it gates DIRECTION
// legality: principal-to-distributor is legal ONLY for a distributor
// (ISH_P2D_DISTRIBUTOR_ONLY); a fanned-only material with no relationship, or a
// manufacturer, offers to-paragon alone. `supplierType` is null when the pair is
// collaborated by fan-out only (no relationship row).
// ────────────────────────────────────────────────────────────────────────────

/** @import { ForecastPublication, SupplierMaterialRelationship, SupplierType } from './types' */

/**
 * @typedef {object} CollaboratedMaterial
 * @property {string} materialCode
 * @property {SupplierType | null} supplierType -  The relationship type for the pair; null when collaborated by fan-out only.
 */

/**
 * The supplier's collaborated materials (i)∪(ii), sorted by code. A relationship
 * row wins over a fan-out-only entry for the same material (its `supplierType` is
 * the interpretable one).
 * @param {readonly SupplierMaterialRelationship[]} relationships
 * @param {readonly ForecastPublication[]} publications
 * @param {string} supplierId
 * @returns {readonly CollaboratedMaterial[]}
 */
export function ownCollaboratedMaterials(relationships, publications, supplierId) {
  const byCode = /** @type {Map<string, SupplierType | null>} */ (new Map());
  // (i) relationships first — their supplierType is authoritative for the pair.
  for (const r of relationships) {
    if (r.supplierId === supplierId) byCode.set(r.materialCode, r.supplierType);
  }
  // (ii) ever-fanned materials — added only if not already known via a relationship.
  for (const p of publications) {
    for (const l of p.lines) {
      if (l.supplierId === supplierId && !byCode.has(l.materialCode)) {
        byCode.set(l.materialCode, null);
      }
    }
  }
  return [...byCode.entries()]
    .map(([materialCode, supplierType]) => ({ materialCode, supplierType }))
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode));
}
