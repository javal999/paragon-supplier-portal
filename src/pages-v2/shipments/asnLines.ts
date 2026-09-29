// ────────────────────────────────────────────────────────────────────────────
// The ASN form's line model (REQ-E07-04, MR-6 BR-01 to BR-04).
//
// The form keeps what the supplier typed as text, and reads it once here into
// the shape the verbs read. Every check on a line is `asnLineRefusal`, the same
// function both ASN policy hooks call (AR-11), so the form cannot drift from
// the verb. Nothing here re-derives a rule.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty } from '../../lib/localeNumber';
import {
  asnLineRefusal,
  availableBatches,
  batchAboveAvailable,
  onlyShelfLifeRefused,
  openQtyForLine,
  shelfLifeLineView,
  type AsnBatchSource,
  type AsnLineCheck,
  type AsnLineInput,
  type AvailableBatch,
} from '../../services/transitions/fulfilmentRules';
import type { ASN, InventoryPosition, PurchaseOrder } from '../../services/data/types';

/** One line as the supplier types it (REQ-E07-04 BR-04): text, parsed once. */
export interface LineEntry {
  qty: string;
  batch: string;
  expiry: string;
  /** MR-6 BR-04 — whether the supplier is picking from declared stock or typing. */
  batchSource: AsnBatchSource;
}

export const EMPTY_LINE: LineEntry = { qty: '', batch: '', expiry: '', batchSource: 'declared' };

export interface OpenLine {
  materialCode: string;
  description: string;
  uom: string;
  open: number;
}

/** A typed quantity, read by the one legal parser; NaN when unreadable. */
export const readQty = (raw: string): number => {
  const r = normalizeQty(raw);
  return r.ok ? r.value : Number.NaN;
};

/** The PO's lines with their open quantity (BR-02), leaving one ASN out. */
export const openLinesFor = (po: PurchaseOrder, asns: readonly ASN[], excludeAsn?: string): OpenLine[] =>
  po.lineItems.map((li) => ({
    materialCode: li.materialCode,
    description: li.description,
    uom: li.uom,
    open: openQtyForLine(po, li, asns, excludeAsn),
  }));

/** Seed the line entries: each open line proposes its open quantity. */
export const seedLines = (lines: readonly OpenLine[]): Record<string, LineEntry> =>
  Object.fromEntries(
    lines.map((l) => [l.materialCode, { ...EMPTY_LINE, qty: l.open > 0 ? String(l.open) : '' }]),
  );

/**
 * MR-6 BR-01 / BR-02 — the declared batches the supplier can still ship from,
 * per material, read from its own stock positions (the read model narrows them
 * to the supplier, MAT-R4).
 */
export const batchesByMaterial = (
  supplierId: string,
  positions: readonly Pick<InventoryPosition, 'supplierId' | 'materialCode' | 'lastUpdatedAt' | 'batches'>[],
  asns: readonly ASN[],
): Record<string, AvailableBatch[]> => {
  const out: Record<string, AvailableBatch[]> = {};
  for (const p of positions) {
    if (p.supplierId !== supplierId || p.lastUpdatedAt === null) continue;
    const list = availableBatches(supplierId, p.materialCode, asns, {
      declaredAt: p.lastUpdatedAt,
      batches: p.batches,
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
 */
export const batchModeOf = (entry: LineEntry, options: readonly AvailableBatch[]): AsnBatchSource =>
  options.length > 0 &&
  entry.batchSource === 'declared' &&
  (entry.batch.trim() === '' || options.some((o) => o.batchNumber === entry.batch.trim()))
    ? 'declared'
    : 'typed';

/** What the form knows around its lines. */
export interface AsnLinesContext {
  po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'> | undefined;
  asns: readonly ASN[];
  /** The draft being submitted, left out of its own open quantity. */
  excludeAsn?: string;
  eta: string;
  overShipReason: string;
  /** Declared batches on offer, per material. */
  batches: Readonly<Record<string, readonly AvailableBatch[]>>;
}

/** The entered lines as the verb reads them, with what the form can see about them. */
export const readLines = (
  entries: Record<string, LineEntry>,
  open: readonly OpenLine[],
  ctx: AsnLinesContext,
) => {
  const po = ctx.po ?? { poNumber: '', lineItems: [] };
  const lines = open
    .filter((l) => entries[l.materialCode] && entries[l.materialCode].qty.trim() !== '')
    .map((l) => {
      const e = entries[l.materialCode];
      const shippedQty = readQty(e.qty);
      const batch = e.batch.trim();
      const options = ctx.batches[l.materialCode] ?? [];
      const batchSource = batchModeOf(e, options);
      const check: AsnLineCheck = {
        materialCode: l.materialCode,
        shippedQty,
        lotNumber: batch,
        ...(e.expiry ? { expiryDate: e.expiry } : {}),
        ...(ctx.eta ? { eta: ctx.eta } : {}),
      };
      // As drafted (is it above open?) and as submitted (is it complete?).
      const drafted = asnLineRefusal(check, po, ctx.asns, { excludeAsn: ctx.excludeAsn, requireBatch: false });
      const submitted = asnLineRefusal(check, po, ctx.asns, {
        excludeAsn: ctx.excludeAsn,
        overShipReason: ctx.overShipReason,
        requireBatch: true,
      });
      const picked = batchSource === 'declared' ? options.find((o) => o.batchNumber === batch) : undefined;
      return {
        line: l,
        input: {
          materialCode: l.materialCode,
          shippedQty,
          batchNumber: batch,
          ...(e.expiry ? { expiryDate: e.expiry } : {}),
          ...(batch ? { batchSource } : {}),
        } as AsnLineInput,
        refusal: submitted,
        qtyOk: drafted !== 'quantity',
        over: drafted === 'overOpen',
        batchSource,
        // MR-6 BR-03 — a warning only; it never blocks.
        aboveAvailable: picked && batchAboveAvailable(check, options) ? picked.available : null,
        // MR-6 d step 4 — "Expiry <date> · <n> months left at ETA".
        shelfLife: shelfLifeLineView(check),
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
  };
};

export type AsnLinesRead = ReturnType<typeof readLines>;
