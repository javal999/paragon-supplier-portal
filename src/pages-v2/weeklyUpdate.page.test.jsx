import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
/** @import { IDataService, InventoryPosition } from '@services/data/types' */
import { BUYER, renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { sdcClock } from '@services/sdc';
import SupplierInventory from './SupplierInventory';
import SupplierHome from './SupplierHome';
import BuyerInventory from './BuyerInventory';

// ─────────────────────────────────────────────────────────────────────────────
// Material B2 — the supplier's weekly-update panel, its reminders and the PTI
// "This cycle" column (MR-1 d, AC-01, BR-06).
//
// The cycle under test closes on Thursday 10 Sep 2026 at 23:59 WIB (16:59Z).
// The inventory read is re-shaped through a proxy so each case controls
// exactly which figures fall inside the cycle; the clock is the hub clock.
// ─────────────────────────────────────────────────────────────────────────────

const IN_CYCLE = '2026-09-05T03:00:00.000Z';
const LAST_CYCLE = '2026-08-30T03:00:00.000Z';

/**
 * The real read for the identity, cut to three rows with the given update times.
 * @param {readonly (string | null)[]} times
 * @param {Partial<InventoryPosition>} [patch]
 * @returns {{ service: IDataService; codes: () => string[] }}
 */
function withRows(times, patch = {}) {
  /** @type {string[]} */
  let codes = [];
  /** @type {IDataService} */
  const service = {
    ...mockDataService,
    procurement: new Proxy(mockDataService.procurement, {
      get(target, prop, receiver) {
        if (prop === 'getInventory')
          return /** @param {Parameters<IDataService['procurement']['getInventory']>} args */ async (
            ...args
          ) => {
            const page = await target.getInventory(...args);
            const first = page.items.slice(0, times.length);
            codes = first.map((p) => p.materialCode);
            return {
              ...page,
              items: first.map((p, i) => ({
                ...p,
                lastUpdatedAt: times[i],
                staleAt: null,
                ...patch
              }))
            };
          };
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    })
  };
  return { service, codes: () => codes };
}

afterEach(() => sdcClock.reset());

describe('MAT B2 · manual supplier panel (MR-1 AC-01)', () => {
  it('2 of 3 updated: the missing material and the due time show, and it opens the entry form on that material', async () => {
    sdcClock.set('2026-09-08T03:00:00.000Z'); // Tuesday 10:00 WIB
    const { service, codes } = withRows([IN_CYCLE, IN_CYCLE, LAST_CYCLE]);
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, service });
    const panel = await screen.findByTestId('weekly-update');
    const missing = codes()[2];
    // Inventory UX S-02 (INV-D4) — one status on the stock-update cutoff.
    expect(within(panel).getByTestId('weekly-status').textContent).toMatch(
      /^Weekly stock update · 2 of 3 sent · due Thu 10 Sept? 23:59 WIB$/
    );
    expect(within(panel).getByTestId(`weekly-missing-${missing}`)).toBeTruthy();
    expect(within(panel).queryByTestId(`weekly-missing-${codes()[0]}`)).toBeNull();
    // No second deadline and no SOP line (INV-D4); 2 working days out, so no reminder.
    expect(panel.textContent).not.toMatch(/SOP|left/);
    expect(within(panel).queryByTestId('weekly-reminder')).toBeNull();

    fireEvent.click(within(panel).getByTestId(`weekly-enter-${missing}`));
    await screen.findByTestId('stock-entry-panel');
    await waitFor(() =>
      expect(
        /** @type {HTMLSelectElement} */ (document.getElementById('stock-entry-material')).value
      ).toBe(missing)
    );
  });

  it('S-02: after the cutoff there is no "Missed" strip; the status counts the new cycle and names what is out of date and since when', async () => {
    sdcClock.set('2026-09-11T03:00:00.000Z'); // Friday 10:00 WIB, the next cycle
    const { service } = withRows([IN_CYCLE, IN_CYCLE, LAST_CYCLE], {
      staleAt: '2026-09-03T16:59:00.000Z'
    });
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, service });
    const panel = await screen.findByTestId('weekly-update');
    expect(within(panel).getByTestId('weekly-status').textContent).toMatch(
      /^Weekly stock update · 0 of 3 sent · due Thu 17 Sept? 23:59 WIB$/
    );
    expect(within(panel).getByTestId('weekly-out-of-date').textContent).toMatch(
      /^3 out of date since 3 Sept?$/
    );
    expect(screen.queryByTestId('weekly-missed')).toBeNull();
    expect(panel.textContent).not.toMatch(/Missed/);
  });

  it('the in-hub reminder appears 1 working day before the cutoff (09:00 WIB) and not 2', async () => {
    const { service } = withRows([IN_CYCLE, IN_CYCLE, LAST_CYCLE]);

    sdcClock.set('2026-09-08T03:00:00.000Z'); // Tuesday, 2 working days before
    const first = renderWithProviders(<SupplierHome />, { identity: SUPPLIER, service });
    await screen.findByTestId('weekly-update');
    expect(screen.queryByTestId('weekly-reminder')).toBeNull();
    first.unmount();

    sdcClock.set('2026-09-09T02:00:00.000Z'); // Wednesday 09:00 WIB, 1 working day before
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER, service });
    expect((await screen.findByTestId('weekly-reminder')).textContent).toBe(
      'Reminder: materials still needing a stock figure before the cutoff: 1'
    );
    // S-02 — the To do Stock row says what the panel says, in the same words.
    const row = await screen.findByTestId('home-task-weekly-update');
    const status = screen.getByTestId('weekly-status').textContent ?? '';
    expect(status).toMatch(/^Weekly stock update · 2 of 3 sent · due Thu 10 Sept? 23:59 WIB$/);
    expect(row.textContent).toContain(status);
    expect(screen.queryByTestId('home-task-stale-stock')).toBeNull();
  });

  it('BL-236: capacity and feedstock show beside the stock update, due at the same cutoff', async () => {
    sdcClock.set('2026-09-08T03:00:00.000Z'); // Tuesday 10:00 WIB
    const { service } = withRows([IN_CYCLE, IN_CYCLE, LAST_CYCLE], {
      feedstock: /** @type {InventoryPosition['feedstock']} */ (
        /** @type {unknown} */ ({
          recordedAt: IN_CYCLE,
          feedstockQty: 10,
          confirmedOn: '2026-09-05'
        })
      )
    });
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, service });
    const panel = await screen.findByTestId('weekly-update');
    expect((await within(panel).findByTestId('weekly-feedstock')).textContent).toBe(
      'Feedstock · 3 of 3 confirmed'
    );
    expect((await within(panel).findByTestId('weekly-capacity')).textContent).toMatch(
      /^Capacity · \d+ of \d+ groups confirmed/
    );
    expect(within(panel).getByTestId('weekly-also-due').textContent).toContain(
      'Also due by the same cutoff'
    );
  });

  it('every material updated: no reminder even on the cutoff day, and the panel says so', async () => {
    sdcClock.set('2026-09-10T05:00:00.000Z'); // Thursday 12:00 WIB
    const { service } = withRows([IN_CYCLE, IN_CYCLE, IN_CYCLE]);
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, service });
    expect(await screen.findByTestId('weekly-all-done')).toBeTruthy();
    expect(screen.queryByTestId('weekly-reminder')).toBeNull();
  });
});

/** @type {CurrentIdentity} */
const API_SUPPLIER = { ...SUPPLIER, supplierId: 'sup-001', supplierName: 'API supplier' };

describe('MAT B2 · API supplier panel (MR-1 BR-01, MAT-R14)', () => {
  it('shows Last sync and Next sync (last attempt + 2 h) with the not-active note and its liveness pill', async () => {
    sdcClock.set('2026-09-08T03:00:00.000Z');
    const { service } = withRows([IN_CYCLE, IN_CYCLE], {
      apiConnected: true,
      lastSync: {
        id: 'sync-t',
        supplierId: 'sup-001',
        at: '2026-09-07T10:00:00.000Z',
        outcome: 'success'
      }
    });
    renderWithProviders(<SupplierInventory />, { identity: API_SUPPLIER, service });
    const panel = await screen.findByTestId('weekly-api');
    expect(within(panel).getByTestId('weekly-api-sync').textContent).toBe(
      'Last sync 07 Sept 2026, 17:00 WIB · Next sync 07 Sept 2026, 19:00 WIB'.replace(
        /Sept/g,
        formatMonth()
      )
    );
    expect(within(panel).getByTestId('weekly-api-not-active').textContent).toBe(
      'Scheduled sync: not active in the prototype'
    );
    expect(within(panel).getByText('Not running · awaiting Stage F')).toBeTruthy();
    expect(screen.queryByTestId('weekly-update')).toBeNull();
  });
});

describe('MAT B2 · PTI "This cycle" (in the material drawer since Inventory UX P-01)', () => {
  /**
   * Opens each row's drawer and reads its "This cycle" figure.
   * @param {RegExp} rowPattern
   * @param {RegExp} cyclePattern
   * @returns {string[]}
   */
  const cycleTexts = (rowPattern, cyclePattern) =>
    screen.getAllByTestId(rowPattern).map((row) => {
      fireEvent.click(row);
      return screen.getByTestId(cyclePattern).textContent ?? '';
    });

  it('reads "<n> of <m>" for a manual supplier and "API" for a connected one', async () => {
    sdcClock.set('2026-09-08T03:00:00.000Z');
    renderWithProviders(<BuyerInventory />, { identity: BUYER });
    await screen.findAllByTestId(/^pti-stock-row-/);
    // The table no longer carries the column.
    expect(screen.queryByRole('columnheader', { name: 'This cycle' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Packaging/i }));
    const manual = cycleTexts(/^pti-stock-row-sup-007-/, /^pti-stock-cycle-sup-007-/);
    expect(manual.length).toBeGreaterThan(0);
    for (const text of manual) expect(text).toMatch(/^\d+ of \d+$/);
    // One supplier, one figure: every row of the supplier reads the same.
    expect(new Set(manual).size).toBe(1);
    // sup-001 supplies raw material and is connected by API.
    fireEvent.click(screen.getByRole('tab', { name: /Raw material/i }));
    const api = cycleTexts(/^pti-stock-row-sup-001-/, /^pti-stock-cycle-sup-001-/);
    expect(api.length).toBeGreaterThan(0);
    for (const text of api) expect(text).toBe('API');
  });
});

/**
 * en-GB writes September as "Sep" or "Sept" depending on the ICU build; read it off the runtime.
 * @returns {string}
 */
function formatMonth() {
  return new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'Asia/Jakarta' }).format(
    new Date('2026-09-07T10:00:00.000Z')
  );
}
