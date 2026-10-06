// ─────────────────────────────────────────────────────────────────────────────
// A PO schedule line with everything that happened to it — the one join every
// line-grain measure reads (E14-02 reliability, the CFOT calculation).
//
// Pure: inputs in, histories out. "As of" is always an argument.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { Confirmation, EngineDataset, IsoDate, IsoInstant, PoLine, Receipt, ScheduleChange } from './types' */
import { lineKey } from './types';

/**
 * @typedef {object} LineHistory
 * @property {PoLine} line
 * @property {readonly ScheduleChange[]} changes -  Oldest first.
 * @property {readonly Confirmation[]} confirmations -  Oldest first.
 * @property {readonly Receipt[]} receipts -  Oldest first.
 */

/** @typedef {Pick<EngineDataset, 'poLines' | 'scheduleChanges' | 'confirmations' | 'receipts'>} LineInputs */

/**
 * @template T
 * @param {readonly T[]} rows
 * @param {(r: T) => string} key
 * @returns {Map<string, T[]>}
 */
function groupBy(rows, key) {
  const out = /** @type {Map<string, T[]>} */ (new Map());
  for (const r of rows) {
    const k = key(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

/**
 * Every line with its changes, confirmations and receipts, each oldest first.
 * @param {LineInputs} data
 * @returns {LineHistory[]}
 */
export function lineHistories(data) {
  const changes = groupBy(data.scheduleChanges, (c) => lineKey(c.poNumber, c.line));
  const confs = groupBy(data.confirmations, (c) => lineKey(c.poNumber, c.line));
  const recs = groupBy(data.receipts, (r) => lineKey(r.poNumber, r.line));
  return data.poLines.map((line) => {
    const k = lineKey(line.poNumber, line.line);
    return {
      line,
      changes: [...(changes.get(k) ?? [])].sort((a, b) => a.at.localeCompare(b.at)),
      confirmations: [...(confs.get(k) ?? [])].sort((a, b) =>
        a.confirmedAt.localeCompare(b.confirmedAt)
      ),
      receipts: [...(recs.get(k) ?? [])].sort((a, b) =>
        a.receivedDate.localeCompare(b.receivedDate)
      )
    };
  });
}

/**
 * What PTI asked for, after every change made on or before `asOf` (all changes when omitted).
 * @param {LineHistory} h
 * @param {IsoInstant} [asOf]
 * @returns {{ qty: number; date: IsoDate }}
 */
export function requirementAt(h, asOf) {
  let qty = h.line.orderedQty;
  let date = h.line.requestedDate;
  for (const c of h.changes) {
    if (asOf !== undefined && c.at > asOf) break;
    if (c.field === 'quantity') qty = c.to;
    else date = c.to;
  }
  return { qty, date };
}

/**
 * Did the supplier confirm the line by its deadline (E14-02 BR-01)?
 * @param {LineHistory} h
 * @returns {boolean}
 */
export function confirmedByDeadline(h) {
  const first = h.confirmations[0];
  return first !== undefined && first.confirmedAt <= h.line.confirmDeadline;
}

/**
 * The latest confirmation — the commitment in force (SCOR: a re-confirmation supersedes).
 * @param {LineHistory} h
 * @returns {Confirmation | null}
 */
export const latestConfirmation = (h) => h.confirmations[h.confirmations.length - 1] ?? null;

/**
 * Quantity received on or before `date`.
 * @param {LineHistory} h
 * @param {IsoDate} date
 * @returns {number}
 */
export function receivedBy(h, date) {
  let sum = 0;
  for (const r of h.receipts) if (r.receivedDate <= date) sum += r.receivedQty;
  return sum;
}

/**
 * A line PTI cancelled: its quantity was changed to zero.
 * @param {LineHistory} h
 * @returns {boolean}
 */
export const isCancelled = (h) => requirementAt(h).qty === 0;
