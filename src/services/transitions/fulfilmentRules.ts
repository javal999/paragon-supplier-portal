// ────────────────────────────────────────────────────────────────────────────
// Order fulfilment rules — ASN, goods receipt discrepancy, invoice
// (REQ-E07-04, REQ-E07-06, REQ-E07-07; CR-11 to CR-14).
//
// PURE functions of the records they are handed: no store, no clock. Each rule
// is ONE expression read by the policy (the law, bound in the mock adapter where
// the cross-entity reads live) and by the screens (a courtesy mirror), on the
// `confirmedQtyWithinBounds` precedent — so the form cannot drift from the verb.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../data/types';
import type {
  ASN,
  AsnLineItem,
  AsnShelfLifeEvent,
  AsnShelfLifeLine,
  AsnStatus,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  PurchaseOrder,
  POLineItem,
  SupplierInvoiceStage,
} from '../data/types';
import type { GoodsReceipt, GRStatus } from '@data/mockGoodsReceipts';
import { checkPrice, type MatchVerdict, type PriceCheck, type PriceRule } from './invoiceRollup';
import { receiptQtyToleranceFor, shelfLifeRuleFor } from './fulfilmentConfig';

const isNonBlank = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** A real calendar date written `YYYY-MM-DD`. */
export const isCalendarDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

// ── ASN (REQ-E07-04) ────────────────────────────────────────────────────────

/** A PO an ASN may be created against: approved, and not yet fully received. */
export const ASN_PO_STATES: readonly POStatus[] = [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED];

/** ASN states that no longer carry goods toward PTI. */
export const ASN_INACTIVE_STATES: readonly AsnStatus[] = ['Cancelled'];

/**
 * ASN states the supplier may still cancel — before anything was received.
 * MR-6 BR-08 — an ASN awaiting a shelf-life exception has not shipped, so the
 * supplier may withdraw it instead of waiting for Quality.
 */
export const ASN_CANCELLABLE_STATES: readonly AsnStatus[] = ['Draft', 'Submitted', 'Awaiting exception'];

export const isActiveAsn = (a: Pick<ASN, 'status'>): boolean => !ASN_INACTIVE_STATES.includes(a.status);

/** The quantity the supplier committed on a PO line: confirmed, else ordered. */
export const committedQty = (li: Pick<POLineItem, 'quantity' | 'confirmedQty'>): number =>
  li.confirmedQty > 0 ? li.confirmedQty : li.quantity;

/**
 * BR-02 — open quantity on a PO line = committed quantity minus the quantity on
 * the PO's non-cancelled ASNs for that material. `excludeAsn` leaves one ASN out
 * (the one being edited). Never below zero.
 */
export function openQtyForLine(
  po: Pick<PurchaseOrder, 'poNumber'>,
  line: Pick<POLineItem, 'materialCode' | 'quantity' | 'confirmedQty'>,
  asns: readonly ASN[],
  excludeAsn?: string,
): number {
  const shipped = asns
    .filter((a) => a.poReference === po.poNumber && isActiveAsn(a) && a.asnNumber !== excludeAsn)
    .flatMap((a) => a.lineItems)
    .filter((l) => l.materialCode === line.materialCode)
    .reduce((sum, l) => sum + (Number.isFinite(l.shippedQty) ? l.shippedQty : 0), 0);
  return Math.max(0, committedQty(line) - shipped);
}

/**
 * MR-6 BR-04 — how a line's batch was entered: picked from the supplier's
 * declared stock, or typed (shown to PTI as "not in declared stock").
 */
export type AsnBatchSource = NonNullable<AsnLineItem['batchSource']>;

/** One ASN line as the supplier enters it (the command payload). */
export interface AsnLineInput {
  materialCode: string;
  shippedQty: number;
  batchNumber?: string;
  expiryDate?: string;
  /** MR-6 BR-04 — picked from declared stock, or typed. */
  batchSource?: AsnBatchSource;
}

/**
 * AR-11 — one ASN line as the rule reads it: the line with its batch and
 * expiry, and the ASN's expected arrival. The form and both ASN policy hooks
 * build this same shape, so a rule that needs the batch, the expiry or the ETA
 * sees them on every path.
 */
export interface AsnLineCheck {
  materialCode: string;
  shippedQty: number;
  lotNumber?: string;
  expiryDate?: string;
  eta?: string;
}

/**
 * Why a line is refused. MR-6 BR-05 to BR-07 add two, both read at submission
 * only (`requireBatch`), for a material with `shelfLifeRelevant`:
 *   expiryRequired — the line carries no expiry
 *   shelfLife      — expiry is before ETA + the material's minimum remaining
 *                    shelf life. Checked LAST, so a line that returns it has
 *                    nothing else wrong — which is what lets the supplier ask
 *                    for an exception instead (BR-08).
 */
export type AsnLineRefusal =
  | 'unknownMaterial'
  | 'quantity'
  | 'overOpen'
  | 'batch'
  | 'expiry'
  | 'expiryRequired'
  | 'shelfLife';

/** A stored ASN line as the rule reads it, carrying the ASN's ETA. */
export const asnLineCheckOf = (
  line: Pick<AsnLineItem, 'materialCode' | 'shippedQty' | 'lotNumber' | 'expiryDate'>,
  eta: string | undefined,
): AsnLineCheck => ({
  materialCode: line.materialCode,
  shippedQty: line.shippedQty,
  lotNumber: line.lotNumber,
  ...(line.expiryDate !== undefined ? { expiryDate: line.expiryDate } : {}),
  ...(eta !== undefined ? { eta } : {}),
});

/**
 * Why one ASN line would be refused, or null. `requireBatch` is off at draft
 * time (a draft may be incomplete) and on at submission (BR-04). The ASN form
 * and both ASN policy hooks call this one function (AR-11).
 *
 * The line's own completeness (quantity, then batch) is read before the PO
 * checks, so a submission names a missing batch first, as it always has, and
 * the batch is required on every line the ASN carries.
 */
export function asnLineRefusal(
  line: Partial<AsnLineCheck> | null | undefined,
  po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>,
  asns: readonly ASN[],
  opts: {
    excludeAsn?: string;
    overShipReason?: unknown;
    requireBatch: boolean;
    /** MR-6 BR-08 — Quality approved an exception covering this line. */
    waiveShelfLife?: boolean;
  },
): AsnLineRefusal | null {
  if (!line) return 'unknownMaterial';
  const q = line.shippedQty;
  if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) return 'quantity';
  if (opts.requireBatch && !isNonBlank(line.lotNumber)) return 'batch';
  // MR-6 BR-07 — expiry is part of a complete line for a shelf-life material.
  const rule = opts.requireBatch && typeof line.materialCode === 'string' ? shelfLifeRuleFor(line.materialCode) : null;
  if (rule?.relevant && !isNonBlank(line.expiryDate)) return 'expiryRequired';
  const item = po.lineItems.find((li) => li.materialCode === line.materialCode);
  if (!item) return 'unknownMaterial';
  if (q > openQtyForLine(po, item, asns, opts.excludeAsn) && !isNonBlank(opts.overShipReason)) {
    return 'overOpen';
  }
  if (line.expiryDate !== undefined && line.expiryDate !== '' && !isCalendarDate(line.expiryDate)) {
    return 'expiry';
  }
  // MR-6 BR-05 / BR-06 — last, so it is the only thing wrong when it fires.
  if (
    rule?.relevant &&
    !opts.waiveShelfLife &&
    isCalendarDate(line.expiryDate) &&
    isCalendarDate(line.eta) &&
    !shelfLifeMet(line.expiryDate, line.eta, rule.minMonths)
  ) {
    return 'shelfLife';
  }
  return null;
}

// ── Shelf life (MR-6 BR-05 to BR-09) ────────────────────────────────────────

/**
 * A `YYYY-MM-DD` date moved by whole calendar months. A day the target month
 * does not have is its last day (2026-08-31 + 6 → 2027-02-28).
 */
export function addCalendarMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = total - ty * 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${String(ty).padStart(4, '0')}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** MR-6 BR-05 — expiry ≥ ETA + the minimum, in calendar months (edge case 3: equal passes). */
export const shelfLifeMet = (expiryDate: string, eta: string, minMonths: number): boolean =>
  expiryDate >= addCalendarMonths(eta, minMonths);

const dayNumber = (date: string): number => Date.parse(`${date}T00:00:00.000Z`) / 86_400_000;

/**
 * Remaining shelf life at ETA in calendar months, with the part month as a
 * fraction of that month's days ("7.4 months left at ETA"). Negative when the
 * batch expires before it arrives.
 */
export function monthsLeftAt(eta: string, expiryDate: string): number {
  let whole = 0;
  if (expiryDate >= eta) {
    while (addCalendarMonths(eta, whole + 1) <= expiryDate) whole++;
  } else {
    while (addCalendarMonths(eta, whole) > expiryDate) whole--;
  }
  const from = addCalendarMonths(eta, whole);
  const to = addCalendarMonths(eta, whole + 1);
  return whole + (dayNumber(expiryDate) - dayNumber(from)) / (dayNumber(to) - dayNumber(from));
}

/** What the form shows under a line's expiry (MR-6 d step 4). */
export interface ShelfLifeLineView {
  minMonths: number;
  /** Null until both expiry and ETA are real dates. */
  monthsLeft: number | null;
  /** False when the line fails BR-05. */
  ok: boolean;
}

/** The shelf-life view of a line, or null when the material is not shelf-life relevant. */
export function shelfLifeLineView(
  line: Pick<AsnLineCheck, 'materialCode' | 'expiryDate' | 'eta'>,
): ShelfLifeLineView | null {
  const rule = shelfLifeRuleFor(line.materialCode);
  if (!rule?.relevant) return null;
  if (!isCalendarDate(line.expiryDate) || !isCalendarDate(line.eta)) {
    return { minMonths: rule.minMonths, monthsLeft: null, ok: true };
  }
  return {
    minMonths: rule.minMonths,
    monthsLeft: monthsLeftAt(line.eta, line.expiryDate),
    ok: shelfLifeMet(line.expiryDate, line.eta, rule.minMonths),
  };
}

/**
 * MR-6 BR-08 — a supplier may ask for an exception only when shelf life is the
 * ONE thing wrong: at least one line refused for it, and every other line clean.
 */
export const onlyShelfLifeRefused = (refusals: readonly (AsnLineRefusal | null)[]): boolean =>
  refusals.some((r) => r === 'shelfLife') && refusals.every((r) => r === null || r === 'shelfLife');

/** The request an exception decision is about: the latest request or reopening. */
type ShelfLifeRequest = Extract<AsnShelfLifeEvent, { kind: 'requested' | 'etaChanged' }>;
type ShelfLifeDecision = Extract<AsnShelfLifeEvent, { kind: 'approved' | 'rejected' }>;

/** MR-6 BR-09 — where an ASN's exception stands, derived from its record. */
export interface ShelfLifeExceptionView {
  state: 'pending' | 'approved' | 'rejected';
  /** The latest request (or the ETA change that reopened it). */
  request: ShelfLifeRequest;
  /** The latest request's reason — the supplier's own words. */
  reason: string;
  /** The decision on `request`, when there is one. */
  decision: ShelfLifeDecision | null;
  history: readonly AsnShelfLifeEvent[];
}

export function shelfLifeExceptionOf(asn: Pick<ASN, 'shelfLifeException'>): ShelfLifeExceptionView | null {
  const history = asn.shelfLifeException ?? [];
  let request: ShelfLifeRequest | null = null;
  let reason = '';
  let decision: ShelfLifeDecision | null = null;
  for (const e of history) {
    if (e.kind === 'requested' || e.kind === 'etaChanged') {
      request = e;
      decision = null;
      if (e.kind === 'requested') reason = e.reason;
    } else {
      decision = e;
    }
  }
  if (!request) return null;
  const state = decision === null ? 'pending' : decision.kind === 'approved' ? 'approved' : 'rejected';
  return { state, request, reason, decision, history };
}

const coveredBy = (
  lines: readonly AsnShelfLifeLine[],
  line: Pick<AsnLineCheck, 'materialCode' | 'lotNumber' | 'expiryDate'>,
) =>
  lines.some(
    (l) =>
      l.materialCode === line.materialCode &&
      l.lotNumber === (line.lotNumber ?? '').trim() &&
      l.expiryDate === line.expiryDate,
  );

/**
 * MR-6 BR-08 — a pending or approved exception waives the shelf-life refusal
 * for the lines the request named (same material, batch and expiry), at an ETA
 * no later than the one asked about (edge case 1).
 */
export function shelfLifeWaivedFor(
  asn: Pick<ASN, 'shelfLifeException'>,
  line: Pick<AsnLineCheck, 'materialCode' | 'lotNumber' | 'expiryDate' | 'eta'>,
): boolean {
  const view = shelfLifeExceptionOf(asn);
  if (!view || view.state === 'rejected') return false;
  return isCalendarDate(line.eta) && line.eta <= view.request.eta && coveredBy(view.request.lines, line);
}

/**
 * MR-6 BR-08 / BR-09 — the lines approved to be received into blocked stock.
 * Empty unless the exception stands and the ASN is on its way (a draft, a
 * cancelled ASN and one awaiting a decision carry no approval to receipt).
 */
export function approvedShelfLifeLines(asn: Pick<ASN, 'status' | 'shelfLifeException'>): AsnShelfLifeLine[] {
  if (asn.status === 'Draft' || asn.status === 'Cancelled' || asn.status === 'Awaiting exception') return [];
  const view = shelfLifeExceptionOf(asn);
  return view?.state === 'approved' ? [...view.request.lines] : [];
}

/**
 * Edge case 1 — an ETA change on an ASN whose exception was approved needs a
 * new decision when the new ETA is later than the approved one and a line still
 * fails the rule there.
 */
export function etaNeedsReapproval(
  asn: Pick<ASN, 'shelfLifeException' | 'lineItems'>,
  newEta: string,
): boolean {
  const view = shelfLifeExceptionOf(asn);
  if (!view || view.state !== 'approved' || !isCalendarDate(newEta) || newEta <= view.request.eta) return false;
  return shelfLifeFailingLines(asn.lineItems, newEta).length > 0;
}

/** The lines of an ASN that fail the rule at an ETA, as an exception records them. */
export function shelfLifeFailingLines(
  lines: readonly Pick<AsnLineItem, 'materialCode' | 'lotNumber' | 'expiryDate'>[],
  eta: string,
): AsnShelfLifeLine[] {
  const out: AsnShelfLifeLine[] = [];
  for (const l of lines) {
    const rule = shelfLifeRuleFor(l.materialCode);
    if (!rule?.relevant || !isCalendarDate(l.expiryDate) || !isCalendarDate(eta)) continue;
    if (shelfLifeMet(l.expiryDate, eta, rule.minMonths)) continue;
    out.push({
      materialCode: l.materialCode,
      lotNumber: l.lotNumber.trim(),
      expiryDate: l.expiryDate,
      minMonths: rule.minMonths,
    });
  }
  return out;
}

// ── Batch from declared stock (MR-6 BR-01 to BR-03) ─────────────────────────

/** MR-6 BR-02 — the ASN states whose quantity is taken out of a declared batch. */
export const BATCH_CONSUMING_ASN_STATES: readonly AsnStatus[] = [
  'Submitted',
  'In Transit',
  'Delivered',
  'Awaiting exception',
];

/** One declared batch the supplier can still ship from. */
export interface AvailableBatch {
  batchNumber: string;
  available: number;
  expiryDate?: string;
}

/** The part of a stock record the batch rule reads. */
export interface DeclaredBatches {
  /** The stock record's as-of (ISO). */
  declaredAt: string;
  batches?: readonly { batchNumber: string; qty: number; expiryDate?: string }[];
}

/**
 * MR-6 BR-01 / BR-02 — the batches of the supplier's latest stock record for a
 * material, each with its available quantity: the declared quantity minus the
 * quantity on this supplier's ASNs for that batch that are Submitted, In
 * Transit, Delivered or Awaiting exception, with a ship date on or after the record's `declaredAt`
 * (compared by calendar day). Batches with nothing left are left out. An ASN
 * with no ship date has no date to compare, so it is not counted.
 */
export function availableBatches(
  supplierId: string,
  materialCode: string,
  asns: readonly ASN[],
  declaration: DeclaredBatches | null | undefined,
): AvailableBatch[] {
  if (!declaration?.batches?.length) return [];
  const since = declaration.declaredAt.slice(0, 10);
  const taken = new Map<string, number>();
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
      ...(b.expiryDate ? { expiryDate: b.expiryDate } : {}),
    }))
    .filter((b) => b.available > 0);
}

/**
 * MR-6 BR-03 — a line ships more of a declared batch than is available. A
 * warning, never a refusal: the stock record can be up to a cycle old.
 */
export const batchAboveAvailable = (
  line: Pick<AsnLineCheck, 'shippedQty' | 'lotNumber'>,
  batches: readonly AvailableBatch[],
): boolean => {
  const b = batches.find((x) => x.batchNumber === line.lotNumber);
  return !!b && Number.isFinite(line.shippedQty) && line.shippedQty > b.available;
};

/** Why an ASN cannot be submitted (BR-04), or null when it is complete. */
export type AsnSubmitRefusal = 'noLines' | 'shipDate' | 'eta' | 'etaBeforeShip';

export function asnSubmitRefusal(fields: {
  lineCount: number;
  shipDate: unknown;
  eta: unknown;
}): AsnSubmitRefusal | null {
  if (fields.lineCount === 0) return 'noLines';
  if (!isCalendarDate(fields.shipDate)) return 'shipDate';
  if (!isCalendarDate(fields.eta)) return 'eta';
  if ((fields.eta as string) < (fields.shipDate as string)) return 'etaBeforeShip';
  return null;
}

// ── Goods receipt discrepancy (REQ-E07-06) ──────────────────────────────────

// ⚠️ `RECEIPT_QTY_TOLERANCE = 0` ("PQ-04 — until the tolerance is decided, any
// difference is a discrepancy") IS RETIRED. PQ-04 was decided on 2026-09-21 as
// CR-25 (BL-45): any over-delivery is flagged; a shortfall above 2% is flagged
// and keeps the receipt open; a shortfall at or below 2% closes it. The values
// are per material, in `fulfilmentConfig.ts`.

/**
 * CR-25 — what a received quantity means against what was shipped:
 *   exact       — received exactly what was shipped
 *   overWithin  — over by no more than the over-delivery tolerance (not flagged).
 *                 Unreachable at the decided 0%; exists because the
 *                 administrator can set more (BL-32), and "received as shipped"
 *                 would then be a false sentence about a line that was not
 *   over        — over by more than the over-delivery tolerance; at the decided
 *                 0%, any quantity above what was shipped (flagged: a decision,
 *                 not a default)
 *   shortWithin — short by no more than the material's tolerance (closes, not flagged)
 *   shortOver   — short by more than the tolerance (flagged; the receipt stays open)
 */
export type ReceiptQtyOutcome = 'exact' | 'overWithin' | 'over' | 'shortWithin' | 'shortOver';

/**
 * CR-25 for one line. PURE. The percentage test is written as
 * |difference| × 100 ≤ shipped × pct so exactly 2% is decided exactly.
 */
export function receiptQtyOutcome(materialCode: string, shipped: number, received: number): ReceiptQtyOutcome {
  const difference = received - shipped;
  if (difference === 0) return 'exact';
  const tol = receiptQtyToleranceFor(materialCode);
  if (difference > 0) return difference * 100 <= shipped * tol.overPct ? 'overWithin' : 'over';
  return -difference * 100 <= shipped * tol.shortPct ? 'shortWithin' : 'shortOver';
}

/** Receipt states in which the inspection result is final. */
export const RECEIPT_INSPECTED_STATES: readonly GRStatus[] = [
  'Approved',
  'Partially Approved',
  'Rejected',
  'Posting to SAP',
  'Posted to SAP',
];

export interface ReceiptLineComparison {
  materialCode: string;
  description: string;
  /** From the ASN line for this material; the receipt's expected quantity when
   *  the ASN is not on record. */
  shipped: number;
  received: number;
  accepted: number;
  rejected: number;
  /** received − shipped (negative = short). */
  difference: number;
  /** |difference| ÷ shipped × 100; null when nothing was shipped. */
  differencePct: number | null;
  /** CR-25 — what the quantity difference means for this material. */
  qtyOutcome: ReceiptQtyOutcome;
  /** BR-03 / BR-05 — outside tolerance, or anything rejected at inspection. */
  flagged: boolean;
}

/** Compare every receipt line with what was shipped. Derived at read time. */
export function compareReceipt(
  gr: Pick<GoodsReceipt, 'inspectionResults' | 'status'>,
  asn?: Pick<ASN, 'lineItems'> | null,
): ReceiptLineComparison[] {
  const inspected = RECEIPT_INSPECTED_STATES.includes(gr.status);
  return gr.inspectionResults.map((r) => {
    const asnLine = asn?.lineItems.find((l) => l.materialCode === r.materialCode);
    const shipped = asnLine ? asnLine.shippedQty : r.qtyExpected;
    const difference = r.qtyReceived - shipped;
    // CR-11 — rejected quantity counts only once the inspection is final.
    const rejected = inspected ? r.qtyRejected : 0;
    // CR-25 — the quantity check, per material.
    const qtyOutcome = receiptQtyOutcome(r.materialCode, shipped, r.qtyReceived);
    return {
      materialCode: r.materialCode,
      description: r.description,
      shipped,
      received: r.qtyReceived,
      accepted: inspected ? r.qtyAccepted : 0,
      rejected,
      difference,
      differencePct: shipped > 0 ? (Math.abs(difference) / shipped) * 100 : null,
      qtyOutcome,
      flagged: qtyOutcome === 'over' || qtyOutcome === 'shortOver' || rejected > 0,
    };
  });
}

/**
 * CR-25 — the receipt stays OPEN while any line is short by more than its
 * tolerance: the rest of the shipment is still owed. Derived at read time,
 * never stored. A shortfall within tolerance, an exact line and an
 * over-delivery do not keep it open (an over-delivery is flagged instead).
 */
export const receiptKeptOpen = (
  gr: Pick<GoodsReceipt, 'inspectionResults' | 'status'>,
  asn?: Pick<ASN, 'lineItems'> | null,
): boolean => compareReceipt(gr, asn).some((l) => l.qtyOutcome === 'shortOver');

export const hasReceiptDiscrepancy = (
  gr: Pick<GoodsReceipt, 'inspectionResults' | 'status'>,
  asn?: Pick<ASN, 'lineItems'> | null,
): boolean => compareReceipt(gr, asn).some((l) => l.flagged);

/** A discrepancy still waiting for the supplier's answer. */
export const awaitsSupplierAnswer = (
  gr: Pick<GoodsReceipt, 'inspectionResults' | 'status' | 'discrepancyResponse'>,
  asn?: Pick<ASN, 'lineItems'> | null,
): boolean => hasReceiptDiscrepancy(gr, asn) && !gr.discrepancyResponse;

/** A dispute PTI has not resolved yet. */
export const isOpenDispute = (gr: Pick<GoodsReceipt, 'discrepancyResponse'>): boolean =>
  gr.discrepancyResponse?.status === 'Disputed';

// ── Invoice (REQ-E07-07) ────────────────────────────────────────────────────

/** POs an invoice may bill against — confirmed, partly or fully delivered. */
export const INVOICEABLE_PO_STATES: readonly POStatus[] = [
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
  POStatus.DELIVERED,
];

/** Receipts whose accepted quantity is final and so can be invoiced. */
export const INVOICEABLE_RECEIPT_STATES: readonly GRStatus[] = [
  'Approved',
  'Partially Approved',
  'Posting to SAP',
  'Posted to SAP',
];

const lineKey = (receiptId: string, materialCode: string) => `${receiptId}|${materialCode}`;

/** Quantity already invoiced per receipt line, across every invoice but one. */
export function invoicedQtyByReceiptLine(
  invoices: readonly Pick<Invoice, 'id' | 'lines'>[],
  excludeInvoiceId?: string,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.id === excludeInvoiceId) continue;
    for (const l of inv.lines ?? []) {
      const k = lineKey(l.receiptId, l.materialCode);
      out.set(k, (out.get(k) ?? 0) + l.quantity);
    }
  }
  return out;
}

/** BR-02 — accepted minus already invoiced, for one receipt line. */
export function remainingInvoiceableQty(
  gr: Pick<GoodsReceipt, 'id' | 'inspectionResults'>,
  materialCode: string,
  invoices: readonly Pick<Invoice, 'id' | 'lines'>[],
  excludeInvoiceId?: string,
): number {
  const r = gr.inspectionResults.find((x) => x.materialCode === materialCode);
  if (!r) return 0;
  const done = invoicedQtyByReceiptLine(invoices, excludeInvoiceId).get(lineKey(gr.id, materialCode)) ?? 0;
  return Math.max(0, r.qtyAccepted - done);
}

/**
 * Pre-fill: one invoice line per receipt line with quantity left to invoice —
 * invoiced quantity = accepted not yet invoiced, at the PO unit price.
 */
export function prefillInvoiceLines(
  receipts: readonly GoodsReceipt[],
  po: Pick<PurchaseOrder, 'lineItems'>,
  invoices: readonly Pick<Invoice, 'id' | 'lines'>[],
  excludeInvoiceId?: string,
): InvoiceLine[] {
  const lines: InvoiceLine[] = [];
  for (const gr of receipts) {
    for (const r of gr.inspectionResults) {
      const qty = remainingInvoiceableQty(gr, r.materialCode, invoices, excludeInvoiceId);
      if (qty <= 0) continue;
      const poLine = po.lineItems.find((li) => li.materialCode === r.materialCode);
      lines.push({
        receiptId: gr.id,
        grNumber: gr.grNumber,
        materialCode: r.materialCode,
        description: r.description,
        quantity: qty,
        uom: poLine?.uom,
        unitPrice: poLine?.unitPrice ?? 0,
        ...(poLine?.contractNumber ? { contractNumber: poLine.contractNumber } : {}),
      });
    }
  }
  return lines;
}

export type InvoiceLineRefusal =
  | 'unknownReceipt'
  | 'foreignReceipt'
  | 'notReceived'
  | 'unknownMaterial'
  | 'quantity'
  | 'overInvoiced'
  | 'price';

/**
 * Why one invoice line would be refused, or null. BR-01 (own POs only: the
 * receipt must belong to this supplier and this PO), BR-02 (quantity at most
 * accepted minus already invoiced), CR-12 (the PO unit price is the basis, and
 * so is the PO line's contract: a line cannot drop or change the contract that
 * puts it at 0% tolerance; a billed amount, when given, must be a positive
 * number).
 */
export function invoiceLineRefusal(
  line: Partial<InvoiceLine> | null | undefined,
  ctx: {
    supplierId: string;
    po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>;
    receipts: readonly GoodsReceipt[];
    invoices: readonly Pick<Invoice, 'id' | 'lines'>[];
    excludeInvoiceId?: string;
  },
): InvoiceLineRefusal | null {
  const gr = ctx.receipts.find((g) => g.id === line?.receiptId);
  if (!line || !gr) return 'unknownReceipt';
  if (gr.supplierId !== ctx.supplierId || gr.poNumber !== ctx.po.poNumber) return 'foreignReceipt';
  if (!INVOICEABLE_RECEIPT_STATES.includes(gr.status)) return 'notReceived';
  const poLine = ctx.po.lineItems.find((li) => li.materialCode === line.materialCode);
  if (!poLine || !gr.inspectionResults.some((r) => r.materialCode === line.materialCode)) {
    return 'unknownMaterial';
  }
  const q = line.quantity;
  if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) return 'quantity';
  if (q > remainingInvoiceableQty(gr, poLine.materialCode, ctx.invoices, ctx.excludeInvoiceId)) {
    return 'overInvoiced';
  }
  if (line.unitPrice !== poLine.unitPrice) return 'price';
  if ((line.contractNumber ?? null) !== (poLine.contractNumber ?? null)) return 'price';
  if (
    line.billedAmount !== undefined &&
    !(typeof line.billedAmount === 'number' && Number.isFinite(line.billedAmount) && line.billedAmount > 0)
  ) {
    return 'price';
  }
  return null;
}

/** AC-02 — the same invoice number from the same supplier is a duplicate. */
export function isDuplicateInvoiceNumber(
  invoiceNumber: string,
  supplierId: string,
  invoices: readonly Pick<Invoice, 'id' | 'supplierId' | 'invoiceNumber'>[],
  excludeInvoiceId?: string,
): boolean {
  const norm = invoiceNumber.trim().toLowerCase();
  return invoices.some(
    (i) =>
      i.id !== excludeInvoiceId &&
      i.supplierId === supplierId &&
      i.invoiceNumber.trim().toLowerCase() === norm,
  );
}

/** CR-12 — expected value = Σ invoiced quantity × PO unit price. */
export const expectedInvoiceValue = (lines: readonly Pick<InvoiceLine, 'quantity' | 'unitPrice'>[]): number =>
  lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

/** CR-12 — the rule a line is checked under: 0% on a contract price, else 2% within the cap. */
export const linePriceRule = (l: Pick<InvoiceLine, 'contractNumber'>): PriceRule =>
  l.contractNumber ? 'contract' : 'standard';

/** CR-12 for one invoice line: billed amount (or quantity × price) against quantity × PO price. */
export interface InvoiceLinePriceCheck extends PriceCheck {
  receiptId: string;
  materialCode: string;
  contractNumber: string | null;
}

/** CR-12 across an invoice's lines, plus any part of the total not split by line. */
export interface InvoicePriceCheck {
  lines: InvoiceLinePriceCheck[];
  /**
   * The invoice total minus the lines' billed amounts, checked on its own; null
   * when the total equals the lines. Checked at 0% when any line carries a
   * contract price — a difference that is not split by line cannot be shown to
   * fall on a line allowed 2% — else at 2% within the cap, against the whole
   * expected value.
   */
  unsplit: PriceCheck | null;
  /** True when any line, or the unsplit part, is held. */
  held: boolean;
}

/**
 * CR-12, line by line. PURE — reads only the invoice. Each line is checked
 * under its own rule (`linePriceRule`); a line with no billed amount of its own
 * is billed at quantity × unit price, so a line can only be held on its own
 * account when the supplier stated what it billed for it.
 */
export function checkInvoicePrices(inv: Pick<Invoice, 'amount' | 'lines'>): InvoicePriceCheck {
  const lines = (inv.lines ?? []).map((l) => {
    const expected = l.quantity * l.unitPrice;
    return {
      ...checkPrice(linePriceRule(l), expected, l.billedAmount ?? expected),
      receiptId: l.receiptId,
      materialCode: l.materialCode,
      contractNumber: l.contractNumber ?? null,
    };
  });
  const billedTotal = lines.reduce((a, l) => a + l.billed, 0);
  const expectedTotal = lines.reduce((a, l) => a + l.expected, 0);
  const rest = Math.round((inv.amount - billedTotal) * 100) / 100;
  const unsplit =
    rest === 0
      ? null
      : checkPrice(lines.some((l) => l.rule === 'contract') ? 'contract' : 'standard', expectedTotal, expectedTotal + rest);
  return { lines, unsplit, held: lines.some((l) => l.held) || (unsplit?.held ?? false) };
}

/**
 * The match at submission: CR-13 first (any rejected quantity on a referenced
 * receipt → Quantity mismatch), then CR-12 line by line (`checkInvoicePrices`:
 * any held line, or a held unsplit difference → Price variance, else Matched).
 * The same `checkPrice` the receipt-post match uses, so the two moments cannot
 * disagree about the rule.
 */
export function deriveInvoiceVerdict(
  inv: Pick<Invoice, 'amount' | 'lines'>,
  receipts: readonly GoodsReceipt[],
): MatchVerdict {
  const lines = inv.lines ?? [];
  const ids = new Set(lines.map((l) => l.receiptId));
  const rejects = receipts.some((gr) => ids.has(gr.id) && gr.inspectionResults.some((r) => r.qtyRejected > 0));
  if (rejects) return 'Qty Mismatch';
  return checkInvoicePrices(inv).held ? 'Price Variance' : 'Matched';
}

/** Stored invoice state → the supplier's status list (REQ-E07-07 step 5). */
export function supplierInvoiceStage(status: InvoiceStatus): SupplierInvoiceStage {
  switch (status) {
    case 'Draft':
      return 'Draft';
    case 'Submitted':
      return 'Submitted';
    case 'Matched':
    case 'Approved':
      return 'Verified';
    case 'Releasing Payment':
      return 'Scheduled for payment';
    case 'Payment Released':
    case 'Remittance Received':
      return 'Paid';
    case 'Disputed':
      return 'Returned';
  }
}
