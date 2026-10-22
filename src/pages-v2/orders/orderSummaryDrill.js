// ─────────────────────────────────────────────────────────────────────────────
// THE DRILL-THROUGH CONTRACT — REQ-E07-03 BR-02 to BR-05, and its table.
//
// One module holds, per column: where it goes for each persona, what the
// address says, and what the cell reads when there is nothing behind it. The
// requirement states that table once; so does this file, and every consumer —
// the summary's cells, the destinations' filter banners, the specs — reads it
// from here rather than restating it. A destination that moved and a cell that
// did not is then one edit, not a hunt.
//
// ⚠️ **ADDRESSES CARRY THE PO's `id`, NOT ITS NUMBER, AND THE REASON IS THE
// EXISTING CONVENTION.** `/buyer/orders?po=po-007` already shipped and already
// resolves an id. A second spelling of the same parameter (a PO NUMBER on the
// shipments page, an id on the orders page) is the shape that produces a link
// that works on one page and silently filters to nothing on the next. So `po`
// means "the PO's id" everywhere, and a destination that joins on `poNumber`
// resolves the id through the PO read it is already scoped by — which is also
// what makes tenancy free (BR-06): a supplier's PO read cannot return another
// supplier's PO, so an addressed id it does not hold is indistinguishable from
// one that does not exist (AC-07).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { Persona } from '@components/layout-v2/navConfig' */
/** @import { LifecycleStepId } from '@services/data/poResponseProjection' */

/** The columns of the summary, in the order BR-01 lists them. */
/**
 * @typedef {| 'po'
 *   | 'supplier'
 *   | 'response'
 *   | 'asns'
 *   | 'callOffs'
 *   | 'capacity'
 *   | 'foresight'
 *   | 'shipping'
 *   | 'receipts'
 *   | 'invoices'} DrillColumn
 */

/** @type {readonly DrillColumn[]} */
export const DRILL_COLUMNS = [
  'po',
  'supplier',
  'response',
  'asns',
  'callOffs',
  'capacity',
  'foresight',
  'shipping',
  'receipts',
  'invoices'
];

/** The parameter that marks a destination as reached FROM the summary (BR-04). */
export const FROM_PARAM = 'from';
export const FROM_ORDER_SUMMARY = 'order-summary';
/** The `from` value that marks a stage page as reached FROM a PO record (P-01). */
export const FROM_PO = 'po';
/** The PO filter parameter — the convention `/buyer/orders?po=` already set. */
export const PO_PARAM = 'po';

/**
 * Where each column goes, per persona. `null` = the column never links here.
 * @type {Record<DrillColumn, Record<Persona, string | null>>}
 */
const DESTINATION = {
  po: { buyer: '/buyer/orders', supplier: '/supplier/orders' },
  // A supplier has no profile page for itself on its own summary (the table's
  // "no link on the supplier's own summary").
  supplier: { buyer: '/buyer/suppliers', supplier: null },
  response: { buyer: '/buyer/orders', supplier: '/supplier/orders' },
  asns: { buyer: '/buyer/shipments', supplier: '/supplier/shipments' },
  callOffs: { buyer: '/buyer/call-offs', supplier: '/supplier/call-offs' },
  capacity: { buyer: '/buyer/capacity', supplier: '/supplier/capacity' },
  foresight: { buyer: '/buyer/collaboration', supplier: '/supplier/forecasts' },
  shipping: { buyer: '/buyer/orders', supplier: '/supplier/orders' },
  receipts: { buyer: '/buyer/goods-receipt', supplier: '/supplier/goods-receipts' },
  invoices: { buyer: '/buyer/invoices', supplier: '/supplier/invoices' }
};

/**
 * The path a column drills into, without its query.
 * @param {DrillColumn} column
 * @param {Persona} persona
 * @returns {string | null}
 */
export const drillPath = (column, persona) => DESTINATION[column][persona];

/**
 * Which part of the PO detail a column opens. The PO detail owns the response
 * (REQ-E07-02) and the shipping notice (REQ-E07-05); both columns land on the
 * same page and say which record they came for.
 */
/** @typedef {'response' | 'shipping'} PoFocus */

/**
 * `poId`:  The PO's id — the `po` filter value.
 * `supplierId`:  The supplier's id, for the supplier / capacity / foresight destinations.
 * `groups`:  Material groups the capacity destination is filtered to (BR-05).
 * `weeks`:  The Mondays of the weeks the PO delivers into (BR-05).
 * `materials`:  Materials the foresight destination is filtered to (BR-05).
 *
 * @typedef {{
 *     readonly poId: string;
 *     readonly supplierId?: string;
 *     readonly groups?: readonly string[];
 *     readonly weeks?: readonly string[];
 *     readonly materials?: readonly string[];
 *     readonly focus?: PoFocus;
 *   }} DrillTarget
 */

/**
 * The address for one cell. Always carries `from=order-summary`, so the
 * destination can offer "Back to order summary" (BR-04) without guessing, and
 * so a normal visit from the menu is unaffected.
 * @param {DrillColumn} column
 * @param {Persona} persona
 * @param {DrillTarget} target
 * @returns {string | null}
 */
export function drillHref(column, persona, target) {
  const path = drillPath(column, persona);
  if (path === null) return null;

  // The supplier profile is a nested route, not a filter.
  if (column === 'supplier') {
    if (!target.supplierId) return null;
    return `${path}/${encodeURIComponent(target.supplierId)}?${FROM_PARAM}=${FROM_ORDER_SUMMARY}&${PO_PARAM}=${encodeURIComponent(target.poId)}`;
  }

  const q = new URLSearchParams();
  q.set(PO_PARAM, target.poId);
  if (column === 'capacity') {
    if (target.supplierId) q.set('supplier', target.supplierId);
    if (target.groups && target.groups.length > 0) q.set('groups', target.groups.join(','));
    if (target.weeks && target.weeks.length > 0) q.set('weeks', target.weeks.join(','));
  }
  if (column === 'foresight') {
    if (target.supplierId) q.set('supplier', target.supplierId);
    // `material` (singular) is the parameter the forecast pages already read.
    if (target.materials && target.materials.length > 0) q.set('material', target.materials[0]);
    if (target.materials && target.materials.length > 1)
      q.set('materials', target.materials.join(','));
  }
  if (target.focus && (column === 'response' || column === 'shipping'))
    q.set('focus', target.focus);
  q.set(FROM_PARAM, FROM_ORDER_SUMMARY);
  return `${path}?${q.toString()}`;
}

/**
 * Where "Back to order summary" points (BR-04). The summary is the default
 * view of Purchase orders (P-02); `view=summary` names it explicitly so the
 * address still says which view it opens.
 * @param {Persona} persona
 * @returns {string}
 */
export const orderSummaryPath = (persona) => `${drillPath('po', persona)}?view=summary`;

// ── The PO record's own links (P-01) ────────────────────────────────────────

/**
 * Which summary column each PO lifecycle step opens. The step reads the same
 * record the column does, so it reuses the column's destination rather than
 * keeping a second map of pages.
 * @type {Record<LifecycleStepId, DrillColumn>}
 */
const STEP_COLUMN = {
  response: 'response',
  confirmations: 'shipping',
  asn: 'asns',
  goodsReceipt: 'receipts',
  invoice: 'invoices'
};

/**
 * The address a reached lifecycle step links to, filtered to its PO. The
 * response and shipping-notice steps open the PO itself, so they carry
 * `focus` and no way back; the stage pages carry `from=po`, so they can offer
 * "Back to purchase order".
 * @param {LifecycleStepId} step
 * @param {Persona} persona
 * @param {string} poId
 * @returns {string}
 */
export function lifecycleStepHref(step, persona, poId) {
  const column = STEP_COLUMN[step];
  const q = new URLSearchParams();
  q.set(PO_PARAM, poId);
  if (column === 'response' || column === 'shipping') q.set('focus', column);
  else q.set(FROM_PARAM, FROM_PO);
  return `${drillPath(column, persona)}?${q.toString()}`;
}

/**
 * Where "Back to purchase order" points: the PO opened on Purchase orders.
 * @param {Persona} persona
 * @param {string} poId
 * @returns {string}
 */
export const purchaseOrderPath = (persona, poId) =>
  `${drillPath('po', persona)}?${PO_PARAM}=${encodeURIComponent(poId)}`;

// ── The empty-cell contract (BR-03) ─────────────────────────────────────────

/**
 * The statement and the reason a cell shows when nothing is behind it. The
 * statement is what is read; the reason is the `title` and the screen-reader
 * text. `null` = the requirement's table says this column is never empty.
 */
/**
 * @typedef {{
 *     readonly labelKey: string;
 *     readonly reasonKey: string;
 *   }} EmptyContract
 */

/** @type {Record<DrillColumn, EmptyContract | null>} */
export const EMPTY_CONTRACT = {
  po: null, // never empty
  supplier: { labelKey: 'oc.summary.empty.supplier', reasonKey: 'oc.summary.empty.supplier.why' },
  response: null, // never empty — "Awaiting response" still opens the PO
  asns: { labelKey: 'oc.summary.empty.asns', reasonKey: 'oc.summary.empty.asns.why' },
  callOffs: { labelKey: 'oc.summary.empty.callOffs', reasonKey: 'oc.summary.empty.callOffs.why' },
  capacity: { labelKey: 'oc.summary.empty.capacity', reasonKey: 'oc.summary.empty.capacity.why' },
  foresight: {
    labelKey: 'oc.summary.empty.foresight',
    reasonKey: 'oc.summary.empty.foresight.why'
  },
  shipping: { labelKey: 'oc.summary.empty.shipping', reasonKey: 'oc.summary.empty.shipping.why' },
  receipts: { labelKey: 'oc.summary.empty.receipts', reasonKey: 'oc.summary.empty.receipts.why' },
  invoices: { labelKey: 'oc.summary.empty.invoices', reasonKey: 'oc.summary.empty.invoices.why' }
};

/**
 * BR-08 — a confirmation the PO does not need. Not a link, and says so.
 * @type {EmptyContract}
 */
export const NOT_REQUIRED = {
  labelKey: 'oc.summary.empty.notRequired',
  reasonKey: 'oc.summary.empty.notRequired.why'
};

// ── Reading an address back (BR-02, and the malformed-filter refusal) ───────

/** A `po` (or any id-shaped) filter value is one plain document id. */
const ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * @template T
 * @typedef {{ readonly kind: 'absent' } | { readonly kind: 'ok'; readonly value: T } | { readonly kind: 'malformed' }} ParsedFilter
 */

/**
 * Read one id-shaped parameter. Anything else is malformed, never guessed at.
 * @param {string | null} raw
 * @returns {ParsedFilter<string>}
 */
export function parseIdParam(raw) {
  if (raw === null || raw === '') return { kind: 'absent' };
  return ID_SHAPE.test(raw) ? { kind: 'ok', value: raw } : { kind: 'malformed' };
}

/**
 * Read a comma-separated list parameter; one bad member makes the list malformed.
 * @param {string | null} raw
 * @returns {ParsedFilter<readonly string[]>}
 */
export function parseListParam(raw) {
  if (raw === null || raw === '') return { kind: 'absent' };
  const parts = raw.split(',').map((p) => p.trim());
  return parts.every((p) => ID_SHAPE.test(p))
    ? { kind: 'ok', value: parts }
    : { kind: 'malformed' };
}

/** Read a comma-separated list of `YYYY-MM-DD` weeks (BR-05's delivery weeks). */
const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * @param {string | null} raw
 * @returns {ParsedFilter<readonly string[]>}
 */
export function parseWeeksParam(raw) {
  if (raw === null || raw === '') return { kind: 'absent' };
  const parts = raw.split(',').map((p) => p.trim());
  return parts.every((p) => DAY_SHAPE.test(p))
    ? { kind: 'ok', value: parts }
    : { kind: 'malformed' };
}
