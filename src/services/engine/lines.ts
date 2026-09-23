// ─────────────────────────────────────────────────────────────────────────────
// A PO schedule line with everything that happened to it — the one join every
// line-grain measure reads (E14-02 reliability, the CFOT calculation).
//
// Pure: inputs in, histories out. "As of" is always an argument.
// ─────────────────────────────────────────────────────────────────────────────

import {
  lineKey,
  type Confirmation,
  type EngineDataset,
  type IsoDate,
  type IsoInstant,
  type PoLine,
  type Receipt,
  type ScheduleChange,
} from './types';

export interface LineHistory {
  readonly line: PoLine;
  /** Oldest first. */
  readonly changes: readonly ScheduleChange[];
  /** Oldest first. */
  readonly confirmations: readonly Confirmation[];
  /** Oldest first. */
  readonly receipts: readonly Receipt[];
}

type LineInputs = Pick<EngineDataset, 'poLines' | 'scheduleChanges' | 'confirmations' | 'receipts'>;

function groupBy<T>(rows: readonly T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

/** Every line with its changes, confirmations and receipts, each oldest first. */
export function lineHistories(data: LineInputs): LineHistory[] {
  const changes = groupBy(data.scheduleChanges, (c) => lineKey(c.poNumber, c.line));
  const confs = groupBy(data.confirmations, (c) => lineKey(c.poNumber, c.line));
  const recs = groupBy(data.receipts, (r) => lineKey(r.poNumber, r.line));
  return data.poLines.map((line) => {
    const k = lineKey(line.poNumber, line.line);
    return {
      line,
      changes: [...(changes.get(k) ?? [])].sort((a, b) => a.at.localeCompare(b.at)),
      confirmations: [...(confs.get(k) ?? [])].sort((a, b) => a.confirmedAt.localeCompare(b.confirmedAt)),
      receipts: [...(recs.get(k) ?? [])].sort((a, b) => a.receivedDate.localeCompare(b.receivedDate)),
    };
  });
}

/** What PTI asked for, after every change made on or before `asOf` (all changes when omitted). */
export function requirementAt(h: LineHistory, asOf?: IsoInstant): { qty: number; date: IsoDate } {
  let qty = h.line.orderedQty;
  let date = h.line.requestedDate;
  for (const c of h.changes) {
    if (asOf !== undefined && c.at > asOf) break;
    if (c.field === 'quantity') qty = c.to;
    else date = c.to;
  }
  return { qty, date };
}

/** Did the supplier confirm the line by its deadline (E14-02 BR-01)? */
export function confirmedByDeadline(h: LineHistory): boolean {
  const first = h.confirmations[0];
  return first !== undefined && first.confirmedAt <= h.line.confirmDeadline;
}

/** The latest confirmation — the commitment in force (SCOR: a re-confirmation supersedes). */
export const latestConfirmation = (h: LineHistory): Confirmation | null =>
  h.confirmations[h.confirmations.length - 1] ?? null;

/** Quantity received on or before `date`. */
export function receivedBy(h: LineHistory, date: IsoDate): number {
  let sum = 0;
  for (const r of h.receipts) if (r.receivedDate <= date) sum += r.receivedQty;
  return sum;
}

/** A line PTI cancelled: its quantity was changed to zero. */
export const isCancelled = (h: LineHistory): boolean => requirementAt(h).qty === 0;
