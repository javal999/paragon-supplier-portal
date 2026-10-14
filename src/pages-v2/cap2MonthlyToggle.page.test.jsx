// ─────────────────────────────────────────────────────────────────────────────
// CAP-2 (BL-171, SC-HUB-CAPACITY-REQUIREMENTS-2026-10 §3) — the Weekly/Monthly
// toggle on the three week grids. Every expected figure is read from the same
// fixture or rule the page reads and summed here by hand over the month's ISO
// weeks, written out literally, so the grid's own grouping is never the oracle.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { forecastOverrideStore } from '@services/data/mock/stores/forecastOverrideStore';
import { allCapacityPlans } from '@services/data/mock/inventoryReadModel';
import { ltpCapacityWeeks } from '@services/transitions/capacityRules';
import { mockDataService } from '@services/data/mock/mockDataService';
import { sdcClock } from '@services/sdc';
import { NO_PERSON } from '@context/noPerson';
import { formatDate, formatNumber } from '@lib/format';
import i18n from '@lib/i18n';
import { weekGridEn, weekGridId } from '@lib/i18n/weekGrid';
import { demandForecastEn, demandForecastId } from '@lib/i18n/demandForecast';
import { qty } from './inventory/inventoryDisplay';
import BuyerDemandForecast from './BuyerDemandForecast';
import BuyerCapacity from './BuyerCapacity';
import SupplierCapacity from './SupplierCapacity';
/** @import { CapacityPlan, DemandForecastView, DemandForecastSkuView } from '@services/data/types' */

const clearStorage = () => {
  try {
    window.localStorage.clear();
  } catch {
    // nothing stored
  }
};

beforeEach(() => {
  capacityStore.reset();
  inventoryAlertLedger.reset();
  forecastOverrideStore.reset();
  sdcClock.reset();
  clearStorage();
});
afterEach(() => {
  vi.restoreAllMocks();
  clearStorage();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

// BR-02 — the ISO weeks of each month in the 13-week capacity horizon
// (Mon 31 Aug … Mon 23 Nov 2026), by the Thursday rule, written out.
const SEP = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'];
const OCT = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];

/** @param {string} id */
const planOf = (id) =>
  /** @type {CapacityPlan} */ (
    allCapacityPlans().find((p) => `${p.supplierId}-${p.planningGroupId}` === id)
  );

/**
 * @param {HTMLElement} grid the <table>
 * @returns {string[]}
 */
const monthColumns = (grid) =>
  [...grid.querySelectorAll('thead th[data-month]')].map(
    (h) => /** @type {string} */ (h.getAttribute('data-month'))
  );

/**
 * Clicks Monthly in the toggle that belongs to the grid `testId`.
 * @param {string} testId
 */
const toMonthly = (testId) =>
  fireEvent.click(
    within(screen.getAllByTestId(`${testId}-view`)[0]).getByRole('button', { name: /Monthly/ })
  );

const openSupplierGroup = async () => {
  const r = renderWithProviders(<SupplierCapacity />, {
    identity: SUPPLIER,
    route: '/supplier/capacity'
  });
  fireEvent.click(await screen.findByRole('tab', { name: 'Rigid plastic packaging' }));
  await screen.findByTestId('capacity-grid');
  return r;
};

describe('CAP-2 supplier Capacity (Table C) — Monthly', () => {
  it('AC-02 — monthly LTP for October equals the sum of its five ISO weeks’ LTP', async () => {
    const plan = planOf('sup-007-pg-MG-20');
    const octLtp = OCT.map(
      (w) =>
        /** @type {CapacityPlan['weeks'][number]} */ (plan.weeks.find((x) => x.week === w)).demand
    );
    expect(octLtp).toHaveLength(5);
    await openSupplierGroup();
    toMonthly('capacity-grid');
    const grid = screen.getByTestId('capacity-grid');
    expect(monthColumns(grid)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(screen.getByTestId('capacity-grid-ltp-2026-10').textContent).toBe(
      qty(octLtp.reduce((a, b) => a + b, 0))
    );
    // BR-04 — the header names the month, its week count and first–last Monday.
    const head = screen.getByTestId('capacity-grid-month-2026-10');
    expect(head).toHaveTextContent('Oct 2026');
    expect(head).toHaveTextContent('5 wk');
    // BL-186 — the grid's own short date: `28 Sep`, never the portal's `28 Sept`.
    expect(head).toHaveTextContent('28 Sep – 26 Oct');
    expect(head).not.toHaveTextContent('Sept');
    expect(head).not.toHaveAttribute('data-partial');
  });

  it('AC-03 — a month holding one red week shows the red pill and its count', async () => {
    const plan = planOf('sup-007-pg-MG-20');
    const levels = ltpCapacityWeeks(plan);
    /** @param {readonly string[]} ws */
    const reds = (ws) =>
      levels.filter((l) => ws.includes(l.week) && l.level === 'cannotSupply').map((l) => l.week);
    // Precondition from the fixture: September's one red week is W38; October has none.
    expect(reds(SEP)).toEqual(['2026-09-14']);
    expect(reds(OCT)).toEqual([]);
    await openSupplierGroup();
    // In Weekly, make one October week red: 1,000 against its LTP, no additional.
    const w = '2026-10-12';
    fireEvent.change(screen.getByLabelText(`Allocated capacity for the week of ${formatDate(w)}`), {
      target: { value: '1000' }
    });
    fireEvent.change(
      screen.getByLabelText(`Additional capacity for the week of ${formatDate(w)}`),
      {
        target: { value: '' }
      }
    );
    toMonthly('capacity-grid');
    const sep = screen.getByTestId('capacity-grid-ltpCheck-2026-09');
    expect(sep.querySelector('[data-level]')?.getAttribute('data-level')).toBe('cannotSupply');
    expect(sep).toHaveTextContent('Cannot be supplied');
    expect(sep).toHaveTextContent('1 of 4 wk');
    const oct = screen.getByTestId('capacity-grid-ltpCheck-2026-10');
    expect(oct.querySelector('[data-level]')?.getAttribute('data-level')).toBe('cannotSupply');
    expect(oct).toHaveTextContent('Cannot be supplied · 1 of 5 wk');
    // BR-04 (G-08) — a month holding a gap week is tinted, header and cells.
    expect(screen.getByTestId('capacity-grid-month-2026-09')).toHaveAttribute('data-gap', 'true');
    expect(sep.className).toContain('bg-warning-soft');
  });

  it('AC-04 — Monthly renders no input or select, says "Switch to Weekly to edit." and the refusal names its week without a link', async () => {
    await openSupplierGroup();
    // Leave W38 without a reason so the refusal line is up.
    fireEvent.change(screen.getByLabelText(`Reason for the week of ${formatDate('2026-09-14')}`), {
      target: { value: '' }
    });
    expect(screen.getByTestId('capacity-refusal-week').tagName).toBe('BUTTON');
    const grid = screen.getByTestId('capacity-grid');
    expect(grid.querySelectorAll('input, select').length).toBeGreaterThan(0);
    toMonthly('capacity-grid');
    expect(grid.querySelectorAll('input, select, textarea, button')).toHaveLength(0);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.getByTestId('capacity-grid-readonly')).toHaveTextContent(
      'Switch to Weekly to edit.'
    );
    expect(screen.queryByTestId('capacity-refusal-week')).toBeNull();
    expect(screen.getByTestId('capacity-refusal')).toHaveTextContent(
      `The week of ${formatDate('2026-09-14')} is below the LTP`
    );
    // The month's reason row lists the distinct reasons as text.
    expect(screen.getByTestId('capacity-grid-reason-2026-10')).toHaveTextContent('—');
    // Back to Weekly: the draft is kept and the inputs return.
    fireEvent.click(
      within(screen.getByTestId('capacity-grid-view')).getByRole('button', { name: /Weekly/ })
    );
    expect(screen.queryByTestId('capacity-grid-readonly')).toBeNull();
    expect(screen.getByLabelText(`Reason for the week of ${formatDate('2026-09-14')}`)).toHaveValue(
      ''
    );
  });

  it('BR-01 — Weekly is the default; the choice survives a remount, per page', async () => {
    const first = await openSupplierGroup();
    const grid = screen.getByTestId('capacity-grid');
    expect(monthColumns(grid)).toEqual([]);
    expect(
      within(screen.getByTestId('capacity-grid-view')).getByRole('button', { name: /Weekly/ })
    ).toHaveAttribute('aria-pressed', 'true');
    toMonthly('capacity-grid');
    first.unmount();
    await openSupplierGroup();
    expect(monthColumns(screen.getByTestId('capacity-grid'))).toHaveLength(3);
    expect(
      within(screen.getByTestId('capacity-grid-view')).getByRole('button', { name: /Monthly/ })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('paragon.weekGridView.supplierCapacity')).toBe('monthly');
    // Per page: PTI Capacity still opens Weekly.
    expect(window.localStorage.getItem('paragon.weekGridView.buyerCapacity')).toBeNull();
  });

  it('storage that throws on every read and write does not break the page; the toggle still works', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      await openSupplierGroup();
      const grid = screen.getByTestId('capacity-grid');
      expect(grid.querySelectorAll('thead th[data-week]')).toHaveLength(13);
      toMonthly('capacity-grid');
      expect(monthColumns(grid)).toHaveLength(3);
    } finally {
      // Leave the in-memory fallback on Weekly for the next test.
      fireEvent.click(
        within(screen.getByTestId('capacity-grid-view')).getByRole('button', { name: /Weekly/ })
      );
    }
  });
});

describe('CAP-2 PTI Capacity (Table B) — Monthly', () => {
  it('sums the flows, shows the worst week with its count, and every accordion switches together', async () => {
    const plan = planOf('sup-007-pg-MG-20');
    const lws = ltpCapacityWeeks(plan);
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    await screen.findByTestId('capacity-grid-sup-007-pg-MG-20');
    toMonthly('capacity-grid-sup-007-pg-MG-20');
    const key = 'sup-007-pg-MG-20';
    const sepWeeks = plan.weeks.filter((w) => SEP.includes(w.week));
    expect(screen.getByTestId(`capacity-grid-${key}-ltp-2026-09`).textContent).toBe(
      qty(sepWeeks.reduce((a, w) => a + w.demand, 0))
    );
    const short = sepWeeks
      .filter((w) => w.entry && w.entry.allocated < w.demand)
      .reduce((a, w) => a + (w.demand - (w.entry?.allocated ?? 0)), 0);
    expect(short).toBe(12_800);
    expect(screen.getByTestId(`capacity-grid-${key}-gap-2026-09`)).toHaveTextContent('12,800');
    const sep = screen.getByTestId(`capacity-grid-${key}-ltpCheck-2026-09`);
    expect(sep).toHaveTextContent('Cannot be supplied');
    expect(sep).toHaveTextContent(
      `${lws.filter((l) => SEP.includes(l.week) && l.level === 'cannotSupply').length} of 4 wk`
    );
    expect(screen.getByTestId(`capacity-grid-${key}-reason-2026-09`)).toHaveTextContent('Material');
    // PTI Capacity is read only: no "Switch to Weekly to edit." line.
    expect(screen.queryByTestId(`capacity-grid-${key}-readonly`)).toBeNull();
    // BR-01 — one choice per page: the other open accordion is Monthly too.
    const other = screen.getByTestId('capacity-grid-sup-005-pg-MG-02');
    expect(monthColumns(other).length).toBeGreaterThan(0);
  });
});

describe('CAP-2 Demand forecast (Table A) — Monthly', () => {
  /** @returns {Promise<DemandForecastView>} */
  const view = async () =>
    /** @type {DemandForecastView} */ (
      await mockDataService.procurement.getDemandForecast({
        personaType: 'buyer',
        supplierId: null,
        businessRoles: PERSONA_SYSTEM_ROLES.buyer
      })
    );

  it('sums each flow over the month’s weeks; P bands carry the not-a-percentile note; events are distinct', async () => {
    const v = await view();
    const sku = /** @type {DemandForecastSkuView} */ (
      v.skus.find((s) => s.method === 'comb' && s.theta)
    );
    const range = v.range.skus.find((r) => r.key === sku.skuCode) ?? null;
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    fireEvent.click(await screen.findByTestId(`df-sku-${sku.skuCode}`));
    toMonthly('df-weeks');
    const idx = OCT.map((w) => v.weeks.indexOf(w)).filter((i) => i >= 0);
    expect(idx.length).toBeGreaterThan(0);
    /** @param {readonly (number | null)[]} xs */
    const sumAt = (xs) => idx.reduce((a, i) => a + (xs[i] ?? 0), 0);
    expect(screen.getByTestId('df-weeks-forecast-2026-10')).toHaveTextContent(
      formatNumber(sumAt(sku.forecast))
    );
    expect(screen.getByTestId('df-weeks-base-2026-10')).toHaveTextContent(
      formatNumber(Math.round(sumAt(sku.base)))
    );
    for (const b of range?.bands ?? []) {
      expect(screen.getByTestId(`df-weeks-p${b.level}-2026-10`)).toHaveTextContent(
        formatNumber(sumAt(b.values))
      );
      expect(screen.getByTestId(`df-weeks-note-p${b.level}`)).toHaveTextContent(
        'not a monthly percentile'
      );
    }
    const names = [
      ...new Set(
        idx.flatMap((i) =>
          (v.events.horizon[i]?.events ?? []).map((e) => i18n.t(`df.events.event.${e}`))
        )
      )
    ];
    expect(screen.getByTestId('df-weeks-events-2026-10').textContent).toBe(
      names.length ? names.join(', ') : '—'
    );
  });

  it('the override marker becomes a count of the month’s overridden weeks', async () => {
    const v = await view();
    const sku = /** @type {DemandForecastSkuView} */ (v.skus.find((s) => s.method === 'comb'));
    const [w1, w2] = OCT.filter((w) => v.weeks.includes(w));
    for (const w of [w1, w2]) {
      const res = await mockDataService.commands.dispatch(
        {
          personaType: 'buyer',
          supplierId: null,
          businessRoles: PERSONA_SYSTEM_ROLES.buyer,
          actor: NO_PERSON
        },
        {
          transitionId: 't_forecastoverride_record',
          entity: 'forecastOverride',
          payload: {
            skuCode: sku.skuCode,
            weekStart: w,
            newValue: sku.forecast[v.weeks.indexOf(w)] + 100,
            reasonCode: 'promotion'
          }
        }
      );
      expect(res.status, JSON.stringify(res)).toBe('done');
    }
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    fireEvent.click(await screen.findByTestId(`df-sku-${sku.skuCode}`));
    expect(await screen.findByTestId(`df-week-overridden-${w1}`)).toBeInTheDocument();
    toMonthly('df-weeks');
    expect(screen.queryByTestId(`df-week-overridden-${w1}`)).toBeNull();
    expect(screen.getByTestId('df-month-overridden-2026-10')).toHaveTextContent('2 wk overridden');
    expect(screen.queryByTestId('df-month-overridden-2026-09')).toBeNull();
  });
});

describe('CAP-2 strings exist in both languages', () => {
  it('every new key is in EN and ID', () => {
    const keys = [
      'weekGrid.view.label',
      'weekGrid.view.weekly',
      'weekGrid.view.monthly',
      'weekGrid.month.corner',
      'weekGrid.month.weeks',
      'weekGrid.month.partial',
      'weekGrid.thisMonth',
      'weekGrid.month.weeksOf',
      'weekGrid.monthlyReadOnly'
    ];
    for (const k of keys) {
      expect(weekGridEn[k], k).toBeTruthy();
      expect(weekGridId[k], k).toBeTruthy();
    }
    expect(weekGridEn['weekGrid.monthlyReadOnly']).toBe('Switch to Weekly to edit.');
    expect(demandForecastEn['df.detail.month.bandNote']).toBeTruthy();
    expect(demandForecastId['df.detail.month.bandNote']).toBeTruthy();
    expect(demandForecastId['df.detail.month.overridden']).toBeTruthy();
  });
});
