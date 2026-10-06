// ────────────────────────────────────────────────────────────────────────────
// FUX-D3 · THE WAREHOUSE-WEEK DECISION — the one rule, page and verb (MAT-R2).
//
// A week that does not fit the warehouse even with the most rented space the
// administrator allows (the order plan's `shortfallWeeks`, BL-117) gets the
// Material Planner's recorded decision: rent space, push out orders, reduce
// orders, or accept the overflow. "Accept" carries a note, because accepting an
// overflow is the one choice that does nothing about it.
//
// The decision is a planner's record of intent. It changes no order, no
// call-off and no engine result, and it is never sent to SAP or a supplier.
//
//   1. THE ENTITY ID (`warehouseDecisionEntityId` / `parseWarehouseDecisionId`):
//      `<stream>|<weekStart>`. The target answers `Maintained` for any
//      well-formed id and NOT_FOUND for anything else.
//   2. THE ONE RULE (`warehouseDecisionRefusal`), called by the policy hook and
//      by the page's pre-check, each refusal by name.
//   3. THE LEDGER READS (`decisionInForce`, `madeOnOlderPlan`): the latest
//      record of a week is in force; earlier ones stay (MAT-R3). Nothing here
//      is stored.
// ────────────────────────────────────────────────────────────────────────────

import type { ForecastStream } from '../sdc/types';

export const WAREHOUSE_DECISION_CHOICES = ['rent', 'pushOut', 'reduce', 'accept'] as const;
export type WarehouseDecisionChoice = (typeof WAREHOUSE_DECISION_CHOICES)[number];

export const DECISION_CHOICE_UNKNOWN = 'WAREHOUSE_DECISION_CHOICE_UNKNOWN';
export const DECISION_NOTE_REQUIRED = 'WAREHOUSE_DECISION_NOTE_REQUIRED';

const STREAMS: readonly ForecastStream[] = ['packaging', 'rawMaterial'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isWarehouseDecisionChoice = (v: unknown): v is WarehouseDecisionChoice =>
  typeof v === 'string' && (WAREHOUSE_DECISION_CHOICES as readonly string[]).includes(v);

export const warehouseDecisionEntityId = (stream: ForecastStream, weekStart: string): string => `${stream}|${weekStart}`;

/** The stream and week an id names, or null for a malformed id. */
export function parseWarehouseDecisionId(id: string): { stream: ForecastStream; weekStart: string } | null {
  const [stream, weekStart, ...rest] = id.split('|');
  if (rest.length > 0 || !STREAMS.includes(stream as ForecastStream) || !ISO_DAY.test(weekStart ?? '')) return null;
  return { stream: stream as ForecastStream, weekStart };
}

const filled = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

/** Why this decision cannot be recorded, by name, or null when it can. */
export function warehouseDecisionRefusal(choice: unknown, note: unknown): string | null {
  if (!isWarehouseDecisionChoice(choice)) {
    return `${DECISION_CHOICE_UNKNOWN}: a warehouse decision is one of ${WAREHOUSE_DECISION_CHOICES.join(', ')}, got ${JSON.stringify(choice)}`;
  }
  if (choice === 'accept' && !filled(note)) {
    return `${DECISION_NOTE_REQUIRED}: accepting the overflow needs a note saying why`;
  }
  return null;
}

/** The fields the ledger reads; the stored record carries these and more. */
export interface DecisionKey {
  readonly stream: ForecastStream;
  readonly weekStart: string;
  readonly planVersion: number | null;
}

/** The decision in force for a week: the latest record (the ledger is in recording order). */
export function decisionInForce<T extends DecisionKey>(records: readonly T[], stream: ForecastStream, weekStart: string): T | null {
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const r = records[i];
    if (r.stream === stream && r.weekStart === weekStart) return r;
  }
  return null;
}

/** Earlier records of the same week, latest first — kept, never edited. */
export function earlierDecisions<T extends DecisionKey>(records: readonly T[], stream: ForecastStream, weekStart: string): T[] {
  const mine = records.filter((r) => r.stream === stream && r.weekStart === weekStart);
  return mine.slice(0, -1).reverse();
}

/** The decision was made against a plan version that is no longer the current one. */
export function madeOnOlderPlan(record: DecisionKey, currentVersion: number | null): boolean {
  return currentVersion !== null && record.planVersion !== currentVersion;
}
