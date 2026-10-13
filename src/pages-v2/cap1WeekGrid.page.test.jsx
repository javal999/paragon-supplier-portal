// ─────────────────────────────────────────────────────────────────────────────
// CAP-1 wave 1 (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10, section 6) — the three
// tables drawn week-as-column. Every figure is read back from the same service
// or rule the page reads, never restated: "same figures" asserts every
// (metric, week) cell against the value today's row showed.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { allCapacityPlans } from '@services/data/mock/inventoryReadModel';
import { isGapWeek, ltpCapacityWeeks } from '@services/transitions/capacityRules';
import { BUILT_IN_LABEL_PREFIX } from '@services/transitions/reasonCodes';
import { mockDataService } from '@services/data/mock/mockDataService';
import { sdcClock } from '@services/sdc';
import { formatDate, formatNumber } from '@lib/format';
import i18n from '@lib/i18n';
import { inventoryCapacityEn, inventoryCapacityId } from '@lib/i18n/inventoryCapacity';
import { weekGridEn, weekGridId } from '@lib/i18n/weekGrid';
import { qty } from './inventory/inventoryDisplay';
import BuyerDemandForecast from './BuyerDemandForecast';
import BuyerCapacity from './BuyerCapacity';
import SupplierCapacity from './SupplierCapacity';
/** @import { CapacityPlan } from '@services/data/types' */

beforeEach(() => {
  capacityStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/**
 * The cell of row `rowId` under week `week`, found through the table's own
 * header (G-15): the column a week header sits in is the column of its cells.
 * @param {HTMLElement} grid the <table>
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

/**
 * @param {HTMLElement} grid
 * @returns {string[]}
 */
const weekColumns = (grid) =>
  [...grid.querySelectorAll('thead th[data-week]')].map(
    (h) => /** @type {string} */ (h.getAttribute('data-week'))
  );

/** @param {string} id */
const planOf = (id) =>
  /** @type {CapacityPlan} */ (
    allCapacityPlans().find((p) => `${p.supplierId}-${p.planningGroupId}` === id)
  );

/** @param {string} code */
const reasonName = (code) =>
  i18n.t(`${BUILT_IN_LABEL_PREFIX.capacityShortfall}${code}`, { defaultValue: code });

describe('CAP-1 Table A — Demand forecast SKU detail, same figures', () => {
  it('every metric × week cell equals the value the week row showed', async () => {
    const v = /** @type {import('@services/data/types').DemandForecastView} */ (
      await mockDataService.procurement.getDemandForecast({
        personaType: 'buyer',
        supplierId: null,
        businessRoles: PERSONA_SYSTEM_ROLES.buyer
      })
    );
    const sku = /** @type {import('@services/data/types').DemandForecastSkuView} */ (
      v.skus.find((s) => s.method === 'comb' && s.theta)
    );
    const range = v.range.skus.find((r) => r.key === sku.skuCode) ?? null;
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    fireEvent.click(await screen.findByTestId(`df-sku-${sku.skuCode}`));
    const grid = screen.getByTestId('df-weeks');
    expect(weekColumns(grid)).toEqual([...v.weeks]);
    // A-01 — no inner vertical scroll box any more.
    expect(screen.getByTestId('df-detail').querySelector('.max-h-96')).toBeNull();
    v.weeks.forEach((w, i) => {
      expect(cellAt(grid, 'base', w)).toHaveTextContent(formatNumber(Math.round(sku.base[i])));
      expect(cellAt(grid, 'forecast', w)).toHaveTextContent(formatNumber(sku.forecast[i]));
      for (const b of range?.bands ?? []) {
        const val = b.values[i];
        expect(cellAt(grid, `p${b.level}`, w)).toHaveTextContent(
          val === null ? '—' : formatNumber(val)
        );
      }
      expect(cellAt(grid, 'theta', w)).toHaveTextContent(
        formatNumber(Math.round(/** @type {readonly number[]} */ (sku.theta)[i]))
      );
      expect(cellAt(grid, 'sap', w)).toHaveTextContent(
        sku.sapPlan ? formatNumber(sku.sapPlan[i]) : '—'
      );
      const names = (v.events.horizon[i]?.events ?? []).map((e) => i18n.t(`df.events.event.${e}`));
      expect(cellAt(grid, 'events', w).textContent).toBe(
        names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ')
      );
    });
    // The ids that named a week row now sit on the week's header cell.
    expect(screen.getByTestId(`df-week-${v.weeks[0]}`).tagName).toBe('TH');
    // The P bands come from the run; Theta is shown because this SKU has it (G-10).
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(5 + (range?.bands.length ?? 0));
  });

  it('Theta is hidden when the SKU has none, and leaves no row (G-10)', async () => {
    const v = /** @type {import('@services/data/types').DemandForecastView} */ (
      await mockDataService.procurement.getDemandForecast({
        personaType: 'buyer',
        supplierId: null,
        businessRoles: PERSONA_SYSTEM_ROLES.buyer
      })
    );
    const sku = /** @type {import('@services/data/types').DemandForecastSkuView} */ (
      v.skus.find((s) => !s.theta)
    );
    expect(sku, 'the fixture has a SKU without Theta').toBeDefined();
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    fireEvent.click(await screen.findByTestId(`df-sku-${sku.skuCode}`));
    const grid = screen.getByTestId('df-weeks');
    expect(grid.querySelector('tbody tr[data-row="theta"]')).toBeNull();
    // Known-good control: the rows around it are still there.
    expect(grid.querySelector('tbody tr[data-row="sap"]')).not.toBeNull();
  });
});

describe('CAP-1 Table B — PTI Capacity', () => {
  it('same figures: every metric × week of sup-007 MG-20 equals what its week row showed', async () => {
    const plan = planOf('sup-007-pg-MG-20');
    const lws = ltpCapacityWeeks(plan);
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const grid = await screen.findByTestId('capacity-grid-sup-007-pg-MG-20');
    expect(weekColumns(grid)).toEqual(plan.weeks.map((w) => w.week));
    for (const w of plan.weeks) {
      const lw = lws.find((x) => x.week === w.week);
      const gap = isGapWeek(w);
      expect(cellAt(grid, 'ltp', w.week)).toHaveTextContent(qty(lw?.ltp ?? 0));
      expect(cellAt(grid, 'allocated', w.week)).toHaveTextContent(
        w.entry ? qty(w.entry.allocated) : 'Not stated'
      );
      expect(cellAt(grid, 'upside', w.week)).toHaveTextContent(
        w.entry?.upside !== undefined ? qty(w.entry.upside) : '—'
      );
      expect(cellAt(grid, 'be', w.week)).toHaveTextContent(lw?.be != null ? qty(lw.be) : '—');
      expect(
        cellAt(grid, 'ltpCheck', w.week).querySelector('[data-level]')?.getAttribute('data-level')
      ).toBe(lw?.level);
      expect(cellAt(grid, 'gap', w.week)).toHaveTextContent(
        gap && w.entry ? qty(w.demand - w.entry.allocated) : '—'
      );
      expect(cellAt(grid, 'reason', w.week).textContent).toBe(
        w.entry?.reason
          ? `${reasonName(w.entry.reason)}${w.entry.note ? ` — ${w.entry.note}` : ''}`
          : '—'
      );
      // B-02 — a gap week tints its whole column, header to last row.
      for (const id of ['ltp', 'allocated', 'reason'])
        expect(cellAt(grid, id, w.week).className.includes('bg-warning-soft')).toBe(gap);
    }
    // B-AC3 — the header and seven metric rows, whatever the horizon.
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(7);
  });

  it('B-AC1 — PT Sample Packaging Indonesia, W38 (14 Sep): the gap week reads as specified', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const grid = await screen.findByTestId('capacity-grid-sup-007-pg-MG-20');
    const week = '2026-09-14';
    const head = screen.getByTestId(`capacity-gap-sup-007-pg-MG-20-${week}`);
    expect(head).toHaveTextContent('W38');
    expect(head).toHaveTextContent('14 Sep');
    expect(cellAt(grid, 'ltp', week)).toHaveTextContent('72,800');
    expect(cellAt(grid, 'allocated', week)).toHaveTextContent('60,000');
    expect(cellAt(grid, 'upside', week)).toHaveTextContent('—');
    expect(cellAt(grid, 'be', week)).toHaveTextContent('60,000');
    expect(cellAt(grid, 'ltpCheck', week)).toHaveTextContent('Cannot be supplied');
    expect(cellAt(grid, 'gap', week)).toHaveTextContent('12,800');
    expect(cellAt(grid, 'reason', week)).toHaveTextContent('Material');
  });

  it('Gaps only hides week COLUMNS: each plan shows exactly its gap weeks (B-04, B-AC2)', async () => {
    renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: '/buyer/capacity?gapsOnly=1'
    });
    for (const id of ['sup-007-pg-MG-20', 'sup-005-pg-MG-02']) {
      const grid = await screen.findByTestId(`capacity-grid-${id}`);
      const expected = planOf(id)
        .weeks.filter(isGapWeek)
        .map((w) => w.week);
      expect(expected.length).toBeGreaterThan(0);
      expect(weekColumns(grid)).toEqual(expected);
      // Rows are metrics, so the filter never changes them.
      expect(grid.querySelectorAll('tbody tr')).toHaveLength(7);
    }
    expect(weekColumns(screen.getByTestId('capacity-grid-sup-007-pg-MG-20'))).toEqual([
      '2026-09-14'
    ]);
  });

  it('a PO drill-down shows only the drilled weeks’ columns; a filter that leaves none says so', async () => {
    const drilled = ['2026-09-07', '2026-09-21'];
    const r = renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: `/buyer/capacity?po=po-007&supplier=sup-007&weeks=${drilled.join(',')}&from=order-summary`
    });
    const grid = await screen.findByTestId('capacity-grid-sup-007-pg-MG-20');
    expect(weekColumns(grid)).toEqual(drilled);
    r.unmount();
    // The drilled weeks hold no gap, so Gaps only leaves no week in this plan.
    renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: `/buyer/capacity?po=po-007&supplier=sup-007&weeks=${drilled.join(',')}&gapsOnly=1&from=order-summary`
    });
    const none = await screen.findByTestId('capacity-no-week-sup-007-pg-MG-20');
    expect(none).toHaveTextContent('No week matches the filters');
    expect(screen.queryByTestId('capacity-grid-sup-007-pg-MG-20')).toBeNull();
  });
});

describe('CAP-1 Table C — supplier Capacity', () => {
  const openGroup = async () => {
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: '/supplier/capacity' });
    fireEvent.click(await screen.findByRole('tab', { name: 'Rigid plastic packaging' }));
    return screen.findByTestId('capacity-grid');
  };

  it('same figures: every metric × week equals what the week row showed', async () => {
    const plan = planOf('sup-007-pg-MG-20');
    const grid = await openGroup();
    expect(weekColumns(grid)).toEqual(plan.weeks.map((w) => w.week));
    for (const w of plan.weeks) {
      expect(cellAt(grid, 'ltp', w.week)).toHaveTextContent(qty(w.demand));
      expect(cellAt(grid, 'allocated', w.week).querySelector('input')).toHaveValue(
        w.entry ? String(w.entry.allocated) : ''
      );
      expect(cellAt(grid, 'upside', w.week).querySelector('input')).toHaveValue(
        w.entry?.upside !== undefined ? String(w.entry.upside) : ''
      );
      expect(cellAt(grid, 'be', w.week)).toHaveTextContent(
        w.entry ? qty(w.entry.allocated + (w.entry.upside ?? 0)) : '—'
      );
      const lw = ltpCapacityWeeks(plan).find((x) => x.week === w.week);
      expect(
        cellAt(grid, 'ltpCheck', w.week).querySelector('[data-level]')?.getAttribute('data-level')
      ).toBe(lw?.level);
      const below = w.entry !== null && w.entry !== undefined && w.entry.allocated < w.demand;
      expect(cellAt(grid, 'reason', w.week).querySelector('select') !== null).toBe(below);
    }
    // C-02 — the Reason row is present even in a week that needs none.
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(6);
  });

  it('tab order runs along a row: every Allocated week, then every Additional week, then the reason selects (G-11, C-05)', async () => {
    const plan = planOf('sup-007-pg-MG-20');
    await openGroup();
    const weeks = plan.weeks.map((w) => formatDate(w.week));
    const reasonWeeks = plan.weeks
      .filter((w) => w.entry && w.entry.allocated < w.demand)
      .map((w) => formatDate(w.week));
    const expected = [
      ...weeks.map((w) => `Allocated capacity for the week of ${w}`),
      ...weeks.map((w) => `Additional capacity for the week of ${w}`),
      ...reasonWeeks.map((w) => `Reason for the week of ${w}`)
    ];
    // Population control: 13 weeks per row, and at least one reason select.
    expect(weeks).toHaveLength(13);
    expect(reasonWeeks.length).toBeGreaterThan(0);
    // BL-186 — real Tab presses (user-event), from the grid's scroll container:
    // W36 → W37 → … → W48 along Allocated, then the Additional row, then the
    // reason selects, left to right.
    const user = userEvent.setup();
    screen.getByTestId('capacity-grid-scroll').focus();
    /** @type {(string | null)[]} */
    const visited = [];
    for (let i = 0; i < expected.length; i += 1) {
      await user.tab();
      visited.push(document.activeElement?.getAttribute('aria-label') ?? null);
    }
    expect(visited).toEqual(expected);
    // Shift+Tab walks back the same way: from the first reason select to Additional W48.
    await user.tab({ shift: true });
    expect(document.activeElement?.getAttribute('aria-label')).toBe(expected[expected.length - 2]);
    // C-AC1 — Enter in Allocated W36 moves to Allocated W37.
    const first = screen.getByLabelText(`Allocated capacity for the week of ${weeks[0]}`);
    first.focus();
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(document.activeElement).toBe(
      screen.getByLabelText(`Allocated capacity for the week of ${weeks[1]}`)
    );
  });

  it('C-AC2 — 60000 in W38 shows the reason select and tints W38 only; 90000 removes both', async () => {
    const grid = await openGroup();
    const w38 = '2026-09-14';
    const input = screen.getByLabelText(`Allocated capacity for the week of ${formatDate(w38)}`);
    fireEvent.change(input, { target: { value: '90000' } });
    expect(screen.getByTestId(`capacity-week-${w38}`)).not.toHaveAttribute('data-gap');
    expect(cellAt(grid, 'reason', w38).querySelector('select')).toBeNull();
    fireEvent.change(input, { target: { value: '60000' } });
    expect(screen.getByTestId(`capacity-week-${w38}`)).toHaveAttribute('data-gap', 'true');
    expect(cellAt(grid, 'reason', w38).querySelector('select')).not.toBeNull();
    const tinted = [...grid.querySelectorAll('thead th[data-gap="true"]')].map((h) =>
      h.getAttribute('data-week')
    );
    expect(tinted).toEqual([w38]);
  });

  it('C-AC3 — the week named by the refusal is a link that focuses that week’s reason select', async () => {
    await openGroup();
    const w38 = '2026-09-14';
    const select = screen.getByLabelText(`Reason for the week of ${formatDate(w38)}`);
    fireEvent.change(select, { target: { value: '' } });
    expect(screen.getByTestId('capacity-submit')).toBeDisabled();
    const refusal = screen.getByTestId('capacity-refusal');
    expect(refusal).toHaveTextContent(`The week of ${formatDate(w38)} is below the LTP`);
    const link = screen.getByTestId('capacity-refusal-week');
    expect(link.tagName).toBe('BUTTON');
    expect(link).toHaveTextContent(formatDate(w38));
    expect(document.activeElement).not.toBe(select);
    fireEvent.click(link);
    await waitFor(() => expect(document.activeElement).toBe(select));
  });

  it('BL-186 — the chosen reason is readable: a reason week’s cell is wider, the select is compact and its title is the full label', async () => {
    const grid = await openGroup();
    const w38 = '2026-09-14';
    const w37 = '2026-09-07';
    const select = /** @type {HTMLSelectElement} */ (
      screen.getByLabelText(`Reason for the week of ${formatDate(w38)}`)
    );
    fireEvent.change(select, { target: { value: 'force-majeure' } });
    expect(select).toHaveValue('force-majeure');
    expect(select).toHaveAttribute('title', 'Force Majeure');
    expect(select.className).toContain('text-xs');
    // Its cell holds at least 128 px, so only this week grows to 144 px; a week
    // with no select keeps the 112 px column (W1-Q1).
    expect(/** @type {HTMLElement} */ (select.parentElement).className).toContain('min-w-[128px]');
    expect(cellAt(grid, 'reason', w37).querySelector('select')).toBeNull();
    expect(cellAt(grid, 'reason', w37).querySelector('.min-w-\\[128px\\]')).toBeNull();
    fireEvent.change(select, { target: { value: '' } });
    expect(select).toHaveAttribute('title', 'Select a reason…');
    // ID: the full Indonesian label. The switch redraws the page, so the
    // select is found again by its id.
    await i18n.changeLanguage('id');
    try {
      const idSelect = await waitFor(() => {
        const el = document.getElementById(`capacity-reason-input-${w38}`);
        expect(el).not.toBeNull();
        return /** @type {HTMLSelectElement} */ (el);
      });
      fireEvent.change(idSelect, { target: { value: 'force-majeure' } });
      expect(idSelect).toHaveAttribute('title', 'Keadaan kahar');
      expect(idSelect.selectedOptions[0].textContent).toBe('Keadaan kahar');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('BL-186 (G-02, G-03) — a metric’s unit follows its name in grey; week headers read "07 Sep"', async () => {
    const plan = planOf('sup-007-pg-MG-20');
    const grid = await openGroup();
    const ltp = /** @type {HTMLElement} */ (
      grid.querySelector('tbody tr[data-row="ltp"] th[scope="row"]')
    );
    expect(ltp.textContent).toBe(`LTP, current forecast · ${plan.uom}`);
    const unit = /** @type {HTMLElement} */ (ltp.querySelector('.text-text-tertiary'));
    expect(unit.textContent).toBe(` · ${plan.uom}`);
    // The label itself no longer carries the unit in its own colour.
    expect(ltp.textContent).not.toContain(`(${plan.uom})`);
    for (const id of ['allocated', 'upside', 'be'])
      expect(
        grid.querySelector(`tbody tr[data-row="${id}"] th[scope="row"] .text-text-tertiary`)
      ).toHaveTextContent(`· ${plan.uom}`);
    // A row with no unit has no grey part.
    expect(
      grid.querySelector('tbody tr[data-row="reason"] th[scope="row"] .text-text-tertiary')
    ).toBeNull();
    expect(screen.getByTestId('capacity-week-2026-09-07')).toHaveTextContent('07 Sep');
    expect(screen.getByTestId('capacity-week-2026-09-07')).not.toHaveTextContent('Sept');
  });
});

describe('CAP-1 C-AC4 — after a supplier submits, PTI Capacity shows the same figures', () => {
  it('every week of sup-007 MG-20 reads on PTI Capacity as the supplier submitted it', async () => {
    const before = planOf('sup-007-pg-MG-20');
    const w36 = before.weeks[0];
    const w40 = before.weeks[4];
    // Population control: W40 has an LTP to fall under.
    expect(w40.demand).toBeGreaterThan(1000);
    const sup = renderWithProviders(<SupplierCapacity />, {
      identity: SUPPLIER,
      route: '/supplier/capacity'
    });
    fireEvent.click(await screen.findByRole('tab', { name: 'Rigid plastic packaging' }));
    await screen.findByTestId('capacity-grid');
    /** @param {string} name @param {string} week */
    const field = (name, week) =>
      /** @type {HTMLInputElement | HTMLSelectElement} */ (
        screen.getByLabelText(`${name} for the week of ${formatDate(week)}`)
      );
    // New figures in two weeks: W36 above the LTP with additional capacity,
    // W40 under it with a reason.
    fireEvent.change(field('Allocated capacity', w36.week), {
      target: { value: String(w36.demand + 1234) }
    });
    fireEvent.change(field('Additional capacity', w36.week), { target: { value: '4321' } });
    fireEvent.change(field('Allocated capacity', w40.week), {
      target: { value: String(w40.demand - 1000) }
    });
    fireEvent.change(field('Reason', w40.week), { target: { value: 'force-majeure' } });
    // Force Majeure needs a note.
    fireEvent.change(field('Note', w40.week), { target: { value: 'Flood at the plant' } });
    // What the supplier sends, week by week, read off the form itself.
    const sent = before.weeks.map((w) => ({
      week: w.week,
      allocated: Number(field('Allocated capacity', w.week).value),
      upside: field('Additional capacity', w.week).value,
      reason:
        /** @type {HTMLSelectElement | null} */ (
          document.getElementById(`capacity-reason-input-${w.week}`)
        )?.value ?? ''
    }));
    expect(sent.find((s) => s.week === w40.week)?.reason).toBe('force-majeure');
    const submit = screen.getByTestId('capacity-submit');
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(planOf('sup-007-pg-MG-20').latest?.id).not.toBe(before.latest?.id));
    sup.unmount();

    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const grid = await screen.findByTestId('capacity-grid-sup-007-pg-MG-20');
    expect(weekColumns(grid)).toEqual(sent.map((s) => s.week));
    for (const s of sent) {
      const upside = s.upside === '' ? null : Number(s.upside);
      expect(cellAt(grid, 'allocated', s.week)).toHaveTextContent(qty(s.allocated));
      expect(cellAt(grid, 'upside', s.week)).toHaveTextContent(upside === null ? '—' : qty(upside));
      expect(cellAt(grid, 'be', s.week)).toHaveTextContent(qty(s.allocated + (upside ?? 0)));
      expect(cellAt(grid, 'reason', s.week).textContent).toContain(
        s.reason ? reasonName(s.reason) : '—'
      );
    }
    // The two changed weeks, in figures written out.
    expect(cellAt(grid, 'allocated', w36.week)).toHaveTextContent(qty(w36.demand + 1234));
    expect(cellAt(grid, 'upside', w36.week)).toHaveTextContent('4,321');
    expect(cellAt(grid, 'allocated', w40.week)).toHaveTextContent(qty(w40.demand - 1000));
    expect(cellAt(grid, 'reason', w40.week)).toHaveTextContent('Force Majeure');
  });
});

describe('CAP-1 strings exist in both languages', () => {
  it('"This week" and "No week matches the filters" are keyed in EN and ID', () => {
    expect(weekGridEn['weekGrid.thisWeek']).toBe('This week');
    expect(weekGridId['weekGrid.thisWeek']).toBeTruthy();
    expect(inventoryCapacityEn['inv.capacity.grid.noWeekMatches']).toBe(
      'No week matches the filters'
    );
    expect(inventoryCapacityId['inv.capacity.grid.noWeekMatches']).toBeTruthy();
  });
});
