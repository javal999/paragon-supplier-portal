// ────────────────────────────────────────────────────────────────────────────
// Fulfilment rules · batch from declared stock (MR-6 BR-01 to BR-03) and the
// ASN submission check (BR-04). Separate because it reads the supplier's stock
// declaration, which no other ASN rule does.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN, AsnStatus } from '../../data/types' */
/** @import { AsnLineCheck } from './asn' */
import { isCalendarDate } from './shared';

// ── Batch from declared stock (MR-6 BR-01 to BR-03) ─────────────────────────

/**
 * MR-6 BR-02 — the ASN states whose quantity is taken out of a declared batch.
 * @type {readonly AsnStatus[]}
 */
export const BATCH_CONSUMING_ASN_STATES = [
  'Submitted',
  'In Transit',
  'Delivered',
  'Awaiting exception'
];

/** One declared batch the supplier can still ship from. */
/**
 * @typedef {object} AvailableBatch
 * @property {string} batchNumber
 * @property {number} available
 * @property {string} [expiryDate]
 */

/** The part of a stock record the batch rule reads. */
/**
 * @typedef {object} DeclaredBatches
 * @property {string} declaredAt -  The stock record's as-of (ISO).
 * @property {readonly { batchNumber: string; qty: number; expiryDate?: string }[]} [batches]
 */

/**
 * MR-6 BR-01 / BR-02 — the batches of the supplier's latest stock record for a
 * material, each with its available quantity: the declared quantity minus the
 * quantity on this supplier's ASNs for that batch that are Submitted, In
 * Transit, Delivered or Awaiting exception, with a ship date on or after the record's `declaredAt`
 * (compared by calendar day). Batches with nothing left are left out. An ASN
 * with no ship date has no date to compare, so it is not counted.
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {readonly ASN[]} asns
 * @param {DeclaredBatches | null | undefined} declaration
 * @returns {AvailableBatch[]}
 */
export function availableBatches(supplierId, materialCode, asns, declaration) {
  if (!declaration?.batches?.length) return [];
  const since = declaration.declaredAt.slice(0, 10);
  const taken = /** @type {Map<string, number>} */ (new Map());
  for (const a of asns) {
    if (a.supplierId !== supplierId || !BATCH_CONSUMING_ASN_STATES.includes(a.status)) continue;
    if (!a.shipDate || a.shipDate < since) continue;
    for (const l of a.lineItems) {
      if (l.materialCode !== materialCode || !Number.isFinite(l.shippedQty)) continue;
      const lot = l.lotNumber.trim();
      taken.set(lot, (taken.get(lot) ?? 0) + l.shippedQty);
    }
  }
  return declaration.batches
    .map((b) => ({
      batchNumber: b.batchNumber,
      available: b.qty - (taken.get(b.batchNumber.trim()) ?? 0),
      ...(b.expiryDate ? { expiryDate: b.expiryDate } : {})
    }))
    .filter((b) => b.available > 0);
}

/**
 * MR-6 BR-03 — a line ships more of a declared batch than is available. A
 * warning, never a refusal: the stock record can be up to a cycle old.
 * @param {Pick<AsnLineCheck, 'shippedQty' | 'lotNumber'>} line
 * @param {readonly AvailableBatch[]} batches
 * @returns {boolean}
 */
export const batchAboveAvailable = (line, batches) => {
  const b = batches.find((x) => x.batchNumber === line.lotNumber);
  return !!b && Number.isFinite(line.shippedQty) && line.shippedQty > b.available;
};

/** Why an ASN cannot be submitted (BR-04), or null when it is complete. */
/** @typedef {'noLines' | 'shipDate' | 'eta' | 'etaBeforeShip'} AsnSubmitRefusal */

/**
 * @param {{ lineCount: number; shipDate: unknown; eta: unknown; }} fields
 * @returns {AsnSubmitRefusal | null}
 */
export function asnSubmitRefusal(fields) {
  if (fields.lineCount === 0) return 'noLines';
  if (!isCalendarDate(fields.shipDate)) return 'shipDate';
  if (!isCalendarDate(fields.eta)) return 'eta';
  if (/** @type {string} */ (fields.eta) < /** @type {string} */ (fields.shipDate))
    return 'etaBeforeShip';
  return null;
}
