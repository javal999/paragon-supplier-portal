// ─────────────────────────────────────────────────────────────────────────────
// BL-242 (U-06) — Supplier Home: a forecast-commitment task row names its due
// date, not the stock-cover line; a stock task keeps the cover. The cover still
// counts toward the severity (the stripe), only the detail line changes.
// ─────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { formatDate } from '@lib/format';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { sdcClock } from '@services/sdc';
import { withSeverity } from './severityDisplay';
import SupplierHome from '../SupplierHome';

const TODAY = '2026-08-31T12:00:00.000Z';
// Cover 4 days against a 14-day lead time: the stock-out comes first.
const STOCK = [{ daysOfCover: 4, leadTimeDays: 14 }];
const t = i18n.getFixedT('en');
const tId = i18n.getFixedT('id');

/**
 * @param {boolean} preferDue
 * @param {readonly string[]} deadlines
 */
const task = (preferDue, deadlines) => ({
  id: 'x',
  label: 'X',
  count: 1,
  to: '/',
  deadlines,
  stock: STOCK,
  ...(preferDue ? { preferDue: true } : {})
});

describe('BL-242 — the detail line under a Home task', () => {
  it('a commitment task with a deadline names the due date, not the cover', () => {
    const [row] = withSeverity([task(true, ['2026-09-02'])], TODAY, t);
    expect(row.detail).toBe(`Due ${formatDate('2026-09-02')}`);
    expect(row.detail).not.toMatch(/Cover/);
    // The cover still decides the stripe.
    expect(row.severity).toBe('critical');
  });

  it('a stock task keeps the cover and lead time', () => {
    const [row] = withSeverity([task(false, ['2026-09-02'])], TODAY, t);
    expect(row.detail).toBe('Cover 4 days · Lead time 14 days');
  });

  it('a commitment task with no deadline falls back to the cover', () => {
    const [row] = withSeverity([task(true, [])], TODAY, t);
    expect(row.detail).toBe('Cover 4 days · Lead time 14 days');
  });

  it('a passed deadline still reads overdue, with or without preferDue', () => {
    const [row] = withSeverity([task(true, ['2026-08-28'])], TODAY, t);
    expect(row.detail).toMatch(/^Due .* · /);
  });

  it('reads in Indonesian', () => {
    const [row] = withSeverity([task(true, ['2026-09-02'])], TODAY, tId);
    expect(row.detail).toBe(`Jatuh tempo ${formatDate('2026-09-02')}`);
  });
});

describe('BL-242 — on Supplier Home (sup-007)', () => {
  beforeEach(() => {
    requirementResponseStore.reset();
    forecastVersionStore.reset();
    forecastViewStore.reset();
    inventoryAlertLedger.reset();
    sdcClock.reset();
  });

  it('the commitment rows show a due date and no cover line', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER, route: '/supplier/home' });
    for (const id of ['commitments-overdue', 'commitments-due-soon']) {
      const detail = await screen.findByTestId(`home-task-detail-${id}`);
      expect(detail).toHaveTextContent(/^Due /);
      expect(detail).not.toHaveTextContent('Cover');
    }
  });
});
