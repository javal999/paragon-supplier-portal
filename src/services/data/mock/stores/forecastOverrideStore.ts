// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-11 X-06 — the forecast override ledger.
//
// A Material Planning team member's override of one SKU × week of the demand
// forecast: who, when, the old value, the new value, the engine's value and
// the reason code. Append-only; the latest override of a cell is in force.
// Empty at start: the synthetic dataset carries no override history and none
// is invented, so the override-value report is empty until overrides are
// entered and their weeks have sold. Held for the session, like the other
// planner ledgers of the mock (ENG-B106).
// ────────────────────────────────────────────────────────────────────────────

import type { ForecastOverride } from '../../types';

let rows: ForecastOverride[] = [];
let seq = 0;

export const forecastOverrideStore = {
  all(): readonly ForecastOverride[] {
    return rows;
  },
  get(id: string): ForecastOverride | undefined {
    return rows.find((r) => r.id === id);
  },
  add(row: Omit<ForecastOverride, 'id'>): ForecastOverride {
    seq += 1;
    const made: ForecastOverride = { ...row, id: `fo-${String(seq).padStart(4, '0')}` };
    rows = [...rows, made];
    return made;
  },
  reset(): void {
    rows = [];
    seq = 0;
  },
};
