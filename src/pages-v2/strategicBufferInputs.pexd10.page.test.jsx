// ─────────────────────────────────────────────────────────────────────────────
// PEX-D10 — the Capacity page's strategic buffer reads LTP Festive − LTP A for a
// month LTP Festive covers, and keeps DRC-9a (LTP − baseline) everywhere else.
// Every figure is read back from the rules the page reads, never restated.
// ─────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { allCommitmentLines } from '@services/data/mock/forecastReadModel';
import { ltpInputStore } from '@services/data/mock/stores/ltpInputStore';
import { strategicBufferRows } from '@services/transitions/drcBufferRules';
import { sdcClock } from '@services/sdc';
import { qty } from './inventory/inventoryDisplay';
import BuyerCapacity from './BuyerCapacity';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  capacityStore.reset();
  inventoryAlertLedger.reset();
  ltpInputStore.reset();
  sdcClock.reset();
});
afterEach(() => ltpInputStore.reset());

// A pair with a festive window whose first month has a DRC-9a buffer to compare with.
const rows = strategicBufferRows(allCommitmentLines(null));
const target = rows.find((r) => r.windows.some((w) => w.months.length > 0));
const win = target?.windows.find((w) => w.months.length > 0);
const month = win?.months[0].month ?? '';

/** The Mondays of a month, as YYYY-MM-DD. */
const mondays = (/** @type {string} */ m) => {
  /** @type {string[]} */
  const out = [];
  for (let d = new Date(`${m}-01T00:00:00Z`); d.toISOString().slice(0, 7) === m;) {
    if (d.getUTCDay() === 1) out.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 86_400_000);
  }
  return out;
};

/** @param {'A' | 'Festive'} series @param {number} q */
const append = (series, q) =>
  ltpInputStore.append({
    key: `upload|${target?.materialCode}|${series}`,
    kind: 'upload',
    materialCode: /** @type {string} */ (target?.materialCode),
    series,
    weeks: Object.fromEntries(mondays(month).map((w) => [w, q])),
    sourceFile: `${series}.csv`,
    choice: null,
    previousChoice: null,
    setAt: sdcClock.now(),
    setBy: /** @type {any} */ ({ kind: 'UNATTRIBUTED' })
  });

describe('PEX-D10 — strategic buffer on the Capacity page', () => {
  it('the control exists: a pair with a festive window and a month to read', () => {
    expect(target).toBeDefined();
    expect(month).not.toBe('');
  });

  it('without LTP Festive the month reads LTP − baseline (DRC-9a), marked as such', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const key = `${target?.supplierId}-${target?.materialCode}-${win?.window.id}-${month}`;
    const value = await screen.findByTestId(`strategic-buffer-value-${key}`);
    expect(value).toHaveAttribute('data-source', 'drc9a');
    const m = win?.months[0];
    expect(value).toHaveTextContent(
      m?.buffer === null ? '—' : qty(/** @type {number} */ (m?.buffer))
    );
    expect(screen.queryByTestId(`strategic-buffer-source-${key}`)).toBeNull();
    expect(screen.getByTestId('strategic-buffer-festive-note')).toHaveTextContent(
      'LTP Festive − LTP A'
    );
  });

  it('with LTP Festive uploaded the month reads Festive − A, per supplier share, and says so', async () => {
    append('A', 1000);
    append('Festive', 1400);
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const key = `${target?.supplierId}-${target?.materialCode}-${win?.window.id}-${month}`;
    const value = await screen.findByTestId(`strategic-buffer-value-${key}`);
    await screen.findByTestId(`strategic-buffer-source-${key}`);
    expect(value).toHaveAttribute('data-source', 'festive');
    expect(screen.getByTestId(`strategic-buffer-source-${key}`)).toHaveTextContent(
      'LTP Festive − LTP A'
    );
    // The figure is a sum of weekly (1,400 − 1,000) × the supplier's share over the month's Mondays:
    // positive, and a multiple of nothing larger than 400 per week.
    const shown = Number((value.textContent ?? '').replace(/[^\d]/g, ''));
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThanOrEqual(400 * mondays(month).length);
  });
});
