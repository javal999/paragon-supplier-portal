// ────────────────────────────────────────────────────────────────────────────
// The ASN form's line model (REQ-E07-04, MR-6 BR-01 to BR-04).
//
// The form keeps what the supplier typed as text, and reads it once here into
// the shape the verbs read. Every check on a line is `asnLineRefusal`, the same
// function both ASN policy hooks call (AR-11), so the form cannot drift from
// the verb. Nothing here re-derives a rule.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty } from '@lib/localeNumber';
/** @import { AsnBatchSource, AsnLineCheck, AsnLineInput, AvailableBatch } from '@services/transitions/fulfilmentRules' */
import {
  asnLineRefusal,
  asnSequenceRead,
  availableBatches,
  batchAboveAvailable,
  onlyShelfLifeRefused,
  openQtyForLine,
  shelfLifeLineView
} from '@services/transitions/fulfilmentRules';
/** @import { ASN, CallOff, InventoryPosition, PurchaseOrder } from '@services/data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */

/** One line as the supplier types it (REQ-E07-04 BR-04): text, parsed once. */
/**
 * @typedef {object} LineEntry
 * @property {string} qty
 * @property {string} batch
 * @property {string} expiry
 * @property {AsnBatchSource} batchSource -  MR-6 BR-04 — whether the supplier is picking from declared stock or typing.
 */

/** @type {LineEntry} */
export const EMPTY_LINE = { qty: '', batch: '', expiry: '', batchSource: 'declared' };

/**
 * @typedef {object} OpenLine
 * @property {string} materialCode
 * @property {string} description
 * @property {string} uom
 * @property {number} open
 * @property {number} [valueLimit] -  BL-140 — an SAP value-limit line (BL-49): it commits this value and carries no quantity.
 */

/**
 * A typed quantity, read by the one legal parser; NaN when unreadable.
 * @param {string} raw
 * @returns {number}
 */
export const readQty = (raw) => {
  const r = normalizeQty(raw);
  return r.ok ? r.value : Number.NaN;
};

/**
 * The PO's lines with their open quantity (BR-02), leaving one ASN out.
 * `receipts`:  GR-1 / BL-71 — a kept-open receipt reopens its missing quantity.
 * @param {PurchaseOrder} po
 * @param {readonly ASN[]} asns
 * @param {string} [excludeAsn]
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [receipts]
 * @returns {OpenLine[]}
 */
export const openLinesFor = (po, asns, excludeAsn, receipts = []) =>
  po.lineItems.map((li) => ({
    materialCode: li.materialCode,
    description: li.description,
    uom: li.uom,
    open: openQtyForLine(po, li, asns, excludeAsn, receipts),
    ...(li.valueLimit !== undefined ? { valueLimit: li.valueLimit } : {})
  }));

/**
 * Seed the line entries: each open line proposes its open quantity.
 * @param {readonly OpenLine[]} lines
 * @returns {Record<string, LineEntry>}
 */
export const seedLines = (lines) =>
  Object.fromEntries(
    lines.map((l) => [l.materialCode, { ...EMPTY_LINE, qty: l.open > 0 ? String(l.open) : '' }])
  );

/**
 * MR-6 BR-01 / BR-02 — the declared batches the supplier can still ship from,
 * per material, read from its own stock positions (the read model narrows them
 * to the supplier, MAT-R4).
 * @param {string} supplierId
 * @param {readonly Pick<InventoryPosition, 'supplierId' | 'materialCode' | 'lastUpdatedAt' | 'batches'>[]} positions
 * @param {readonly ASN[]} asns
 * @returns {Record<string, AvailableBatch[]>}
 */
export const batchesByMaterial = (supplierId, positions, asns) => {
  /** @type {Record<string, AvailableBatch[]>} */
  const out = {};
  for (const p of positions) {
    if (p.supplierId !== supplierId || p.lastUpdatedAt === null) continue;
    const list = availableBatches(supplierId, p.materialCode, asns, {
      declaredAt: p.lastUpdatedAt,
      batches: p.batches
    });
    if (list.length > 0) out[p.materialCode] = list;
  }
  return out;
};

/**
 * How a line's batch is being entered. With declared batches on offer, the
 * supplier picks one (`declared`) or chooses to type one (`typed`, edge case 4).
 * With none on offer, it is always typed (BR-04). A declared pick that is no
 * longer on offer reads as typed, never as declared.
 * @param {LineEntry} entry
 * @param {readonly AvailableBatch[]} options
 * @returns {AsnBatchSource}
 */
export const batchModeOf = (entry, options) =>
  options.length > 0 &&
  entry.batchSource === 'declared' &&
  (entry.batch.trim() === '' || options.some((o) => o.batchNumber === entry.batch.trim()))
    ? 'declared'
    : 'typed';

/** What the form knows around its lines. */
/**
 * @typedef {object} AsnLinesContext
 * @property {Pick<PurchaseOrder, 'poNumber' | 'lineItems'> | undefined} po
 * @property {readonly ASN[]} asns
 * @property {string} [excludeAsn] -  The draft being submitted, left out of its own open quantity.
 * @property {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [receipts] -  GR-1 / BL-71 — kept-open receipts reopen their missing quantity.
 * @property {string} eta
 * @property {string} [sequence] -  AIB-1 BR-03 (BL-348) — the sequence the form holds.
 * @property {string} [externalId] -  AIB-1 BR-04 (BL-348) — the Surat Jalan (SJ) the form holds.
 * @property {string} overShipReason
 * @property {Readonly<Record<string, readonly AvailableBatch[]>>} batches -  Declared batches on offer, per material.
 * @property {Pick<CallOff, 'materialCode' | 'quantity'>} [callOff] -  BL-140 — the released call-off the ASN names; a value-limit line is raised against it.
 */

/**
 * The entered lines as the verb reads them, with what the form can see about them.
 * @param {Record<string, LineEntry>} entries
 * @param {readonly OpenLine[]} open
 * @param {AsnLinesContext} ctx
 */
export const readLines = (entries, open, ctx) => {
  const po = ctx.po ?? { poNumber: '', lineItems: [] };
  const lines = open
    .filter((l) => entries[l.materialCode] && entries[l.materialCode].qty.trim() !== '')
    .map((l) => {
      const e = entries[l.materialCode];
      const shippedQty = readQty(e.qty);
      const batch = e.batch.trim();
      const options = ctx.batches[l.materialCode] ?? [];
      const batchSource = batchModeOf(e, options);
      /** @type {AsnLineCheck} */
      const check = {
        materialCode: l.materialCode,
        shippedQty,
        lotNumber: batch,
        ...(e.expiry ? { expiryDate: e.expiry } : {}),
        ...(ctx.eta ? { eta: ctx.eta } : {})
      };
      // As drafted (is it above open?) and as submitted (is it complete?).
      const drafted = asnLineRefusal(check, po, ctx.asns, {
        excludeAsn: ctx.excludeAsn,
        requireBatch: false,
        receipts: ctx.receipts,
        callOff: ctx.callOff
      });
      const submitted = asnLineRefusal(check, po, ctx.asns, {
        excludeAsn: ctx.excludeAsn,
        overShipReason: ctx.overShipReason,
        requireBatch: true,
        receipts: ctx.receipts,
        callOff: ctx.callOff
      });
      const picked =
        batchSource === 'declared' ? options.find((o) => o.batchNumber === batch) : undefined;
      return {
        line: l,
        input: /** @type {AsnLineInput} */ ({
          materialCode: l.materialCode,
          shippedQty,
          batchNumber: batch,
          ...(e.expiry ? { expiryDate: e.expiry } : {}),
          ...(batch ? { batchSource } : {})
        }),
        refusal: submitted,
        qtyOk: drafted !== 'quantity',
        over: drafted === 'overOpen',
        batchSource,
        // MR-6 BR-03 — a warning only; it never blocks.
        aboveAvailable: picked && batchAboveAvailable(check, options) ? picked.available : null,
        // MR-6 d step 4 — "Expiry <date> · <n> months left at ETA".
        shelfLife: shelfLifeLineView(check)
      };
    });
  return {
    lines,
    overCount: lines.filter((l) => l.over).length,
    aboveAvailable: lines.filter((l) => l.aboveAvailable !== null),
    complete: lines.length > 0 && lines.every((l) => l.refusal === null),
    // MR-6 BR-08 — shelf life is the one thing wrong: the supplier may ask for
    // an exception instead of submitting (the verb's own test).
    onlyShelfLife: onlyShelfLifeRefused(lines.map((l) => l.refusal)),
    // AIB-1 BR-03 / BR-04 (BL-348) — the 4 ZWME021 sequence rules through the
    // SAME function the submit policy hook calls, so the form cannot drift from
    // the verb (AR-11).
    sequenceRead: asnSequenceRead({
      sequence: ctx.sequence,
      externalId: ctx.externalId,
      poReference: po.poNumber,
      deliveryDate: ctx.eta,
      lines: lines.map((l) => ({ materialCode: l.line.materialCode })),
      peers: ctx.asns
        .filter((a) => a.status !== 'Cancelled' && a.asnNumber !== ctx.excludeAsn)
        .map((a) => ({
          asnNumber: a.asnNumber,
          sequence: a.sequence,
          externalId: a.externalId,
          poReference: a.poReference,
          eta: a.eta
        }))
    })
  };
};

/** @typedef {ReturnType<typeof readLines>} AsnLinesRead */
