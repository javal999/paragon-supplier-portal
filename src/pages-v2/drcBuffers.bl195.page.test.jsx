// ─────────────────────────────────────────────────────────────────────────────
// BL-195 — the PTI Capacity page names the allocated capacity "Production
// limit" (DRC-9b, [Default E3]) and shows the strategic buffer per supplier ×
// material per festive month (DRC-9a, [Default C4]), both "Provisional". Every
// figure is read back from the rule the page reads, never restated.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { allCapacityPlans } from '@services/data/mock/inventoryReadModel';
import { allCommitmentLines } from '@services/data/mock/forecastReadModel';
import { productionLimitFor, strategicBufferRows } from '@services/transitions/drcBufferRules';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { qty } from './inventory/inventoryDisplay';
import BuyerCapacity from './BuyerCapacity';
/** @import { CapacityPlan } from '@services/data/types' */

beforeEach(() => {
  capacityStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const KEY = 'sup-007-pg-MG-20';

/**
 * @param {HTMLElement} grid
 * @param {string} rowId
 * @param {string} week
 * @returns {HTMLElement}
 */
const cellAt = (grid, rowId, week) => {
  const heads = [...grid.querySelectorAll('thead th')];
  const col = heads.findIndex((h) => h.getAttribute('data-week') === week);
  expect(col, `week ${week} is a column`).toBeGreaterThan(0);
  const row = grid.querySelector(`tbody tr[data-row="${rowId}"]`);
  expect(row, `row ${rowId}`).not.toBeNull();
  return /** @type {HTMLElement} */ (/** @type {Element} */ (row).querySelectorAll('td')[col - 1]);
};

describe('DRC-9b — the allocated capacity is named Production limit', () => {
  it('the row reads "Production limit", Provisional (E3), and each week equals productionLimitFor', async () => {
    const plans = allCapacityPlans();
    const plan = /** @type {CapacityPlan} */ (
      plans.find((p) => `${p.supplierId}-${p.planningGroupId}` === KEY)
    );
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const grid = await screen.findByTestId(`capacity-grid-${KEY}`);
    const label = /** @type {HTMLElement} */ (
      grid.querySelector('tbody tr[data-row="allocated"] th[scope="row"]')
    );
    expect(label).toHaveTextContent('Production limit (allocated capacity)');
    expect(screen.getByTestId(`capacity-production-limit-provisional-${KEY}`)).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (E3)'
    );
    let stated = 0;
    for (const w of plan.weeks) {
      const limit = productionLimitFor(plans, 'sup-007', 'pg-MG-20', w.week);
      if (limit.status === 'available') {
        stated += 1;
        expect(cellAt(grid, 'allocated', w.week)).toHaveTextContent(qty(limit.value));
      } else {
        expect(limit.status).toBe('notStated');
        expect(cellAt(grid, 'allocated', w.week)).toHaveTextContent('Not stated');
      }
    }
    // Known-good control: the plan has stated weeks, so the loop compared figures.
    expect(stated).toBeGreaterThan(0);
    // Not a second row: the grid keeps its seven metric rows, plus PTI's
    // decision row (INV-D8, P-07).
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(8);
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    const view = renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: '/buyer/capacity'
    });
    try {
      const grid = await screen.findByTestId(`capacity-grid-${KEY}`);
      expect(
        grid.querySelector('tbody tr[data-row="allocated"] th[scope="row"]')
      ).toHaveTextContent('Batas produksi (kapasitas dialokasikan)');
      expect(screen.getByTestId(`capacity-production-limit-provisional-${KEY}`)).toHaveTextContent(
        'Sementara: aturan menunggu Material Planning (E3)'
      );
      expect(await screen.findByTestId('strategic-buffer-provisional')).toHaveTextContent(
        'Sementara: aturan menunggu Material Planning (C4)'
      );
    } finally {
      // Unmount first, so switching back is not a render outside act().
      view.unmount();
      await i18n.changeLanguage('en');
    }
  });
});

describe('DRC-9a — strategic buffer section', () => {
  const rows = strategicBufferRows(allCommitmentLines(null));

  it('is Provisional (C4) and says where the festive windows come from, CNY absent', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    await screen.findByTestId('strategic-buffer-table');
    expect(screen.getByTestId('strategic-buffer-provisional')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (C4)'
    );
    expect(screen.getByTestId('strategic-buffer-calendar')).toHaveTextContent(
      'no Chinese New Year'
    );
  });

  it('every supplier × material × festive month shows its LTP, baseline and buffer as the rule computes', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    await screen.findByTestId('strategic-buffer-table');
    let cells = 0;
    for (const r of rows) {
      expect(
        screen.getAllByTestId(`strategic-buffer-row-${r.supplierId}-${r.materialCode}`).length
      ).toBeGreaterThan(0);
      for (const w of r.windows)
        for (const m of w.months) {
          const k = `${r.supplierId}-${r.materialCode}-${w.window.id}-${m.month}`;
          expect(screen.getByTestId(`strategic-buffer-ltp-${k}`)).toHaveTextContent(
            m.qty === null ? 'No LTP' : qty(m.qty)
          );
          expect(screen.getByTestId(`strategic-buffer-baseline-${k}`)).toHaveTextContent(
            w.baseline === null ? '—' : qty(w.baseline)
          );
          expect(screen.getByTestId(`strategic-buffer-value-${k}`)).toHaveTextContent(
            m.buffer === null ? '—' : qty(m.buffer)
          );
          cells += 1;
        }
    }
    expect(cells).toBeGreaterThan(0);
  });

  it('sup-002 RM-STEAR-7300, Ramadan 1448: Feb LTP 11,800 under the baseline reads 0; March has no LTP', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    await screen.findByTestId('strategic-buffer-table');
    const k = 'sup-002-RM-STEAR-7300-H1448';
    expect(screen.getByTestId(`strategic-buffer-window-${k}`)).toHaveTextContent('Ramadan 1448 H');
    expect(screen.getByTestId(`strategic-buffer-ltp-${k}-2027-02`)).toHaveTextContent('11,800');
    expect(screen.getByTestId(`strategic-buffer-baseline-${k}-2027-02`)).toHaveTextContent(
      '12,666.67'
    );
    expect(screen.getByTestId(`strategic-buffer-value-${k}-2027-02`)).toHaveTextContent('0');
    expect(screen.getByTestId(`strategic-buffer-ltp-${k}-2027-03`)).toHaveTextContent('No LTP');
    expect(screen.getByTestId(`strategic-buffer-value-${k}-2027-03`)).toHaveTextContent('—');
  });

  it('the supplier filter narrows the section to that supplier', async () => {
    renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: '/buyer/capacity?supplier=sup-002'
    });
    const table = await screen.findByTestId('strategic-buffer-table');
    const supplierRows = rows.filter((r) => r.supplierId === 'sup-002');
    expect(supplierRows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const shown = within(table).queryAllByTestId(
        `strategic-buffer-row-${r.supplierId}-${r.materialCode}`
      );
      expect(shown.length > 0, `${r.supplierId} ${r.materialCode}`).toBe(
        r.supplierId === 'sup-002'
      );
    }
  });
});
