// ─────────────────────────────────────────────────────────────────────────────
// CAP-1 wave 2 (SC-HUB-CAPACITY-REQUIREMENTS-2026-10 CAP-1, AC-05) — the four
// tables that moved onto the shared `WeekGrid` in this wave. Every figure is
// read back from the same service or rule the page reads, never restated:
// "same figures" asserts every (metric, week) cell against the value the week
// row showed before the pivot.
//
// Tables: D Material requirement, E Make warehouse room fill, F What to order
// fill, G Stock simulation. Table G's cells were pinned by no spec before, so
// its assertions are new.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { sapChangeMarkStore } from '@services/data/mock/stores/sapChangeMarkStore';
import { warehouseDecisionStore } from '@services/data/mock/stores/warehouseDecisionStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { simulationOverrideStore } from '@services/data/mock/stores/simulationOverrideStore';
import { sdcClock } from '@services/sdc';
import { selectionEffect } from '@services/engine/reschedule';
import { isoWeek } from '@services/engine/dates';
import { formatIDR, formatNumber } from '@lib/format';
import { weekHeaderDate } from '@lib/weekMonths';
import i18n from '@lib/i18n';
import { qtyOf } from './materialPlan/planDisplay';
import { qty } from './inventory/inventoryDisplay';
import { STANDARD } from './BuyerReschedule/const';
import BuyerMaterialRequirement from './BuyerMaterialRequirement';
import BuyerReschedule from './BuyerReschedule';
import BuyerOrderPlan from './BuyerOrderPlan';
import BuyerStockSimulation from './BuyerStockSimulation';
/** @import { MaterialPlanView, MaterialRequirementView, RescheduleView, OrderPlanView, StockSimulationRow, WarehousePlanView, WarehouseRescheduleView } from '@services/data/types' */

/** @type {import('@services/data/types').QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
  sapChangeMarkStore.reset();
  warehouseDecisionStore.reset();
  forecastVersionStore.reset();
  simulationOverrideStore.reset();
  sdcClock.reset();
});

afterEach(() => {
  void i18n.changeLanguage('en');
});

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

/**
 * PSC-5 BR-01 — the week header reads `W<iso week>` over the Monday date.
 * @param {string} testId the week header's test id
 * @param {string} week the Monday, ISO date
 */
const expectWeekHeader = (testId, week) => {
  const head = screen.getByTestId(testId);
  expect(head.tagName).toBe('TH');
  expect(head).toHaveTextContent(`W${isoWeek(week)}`);
  expect(head).toHaveTextContent(weekHeaderDate(week, 'en'));
  expect(head).not.toHaveTextContent('Sept');
};

/**
 * @param {number | null} x
 * @returns {string}
 */
const pct = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 100))}%`);

describe('CAP-1 wave 2 Table D — Material requirement, same figures', () => {
  it('every metric × week of the selected material equals the value its week row showed', async () => {
    const run = /** @type {MaterialRequirementView} */ (
      await mockDataService.procurement.getMaterialRequirement(buyerScope)
    );
    const m = /** @type {MaterialPlanView} */ (
      run.materials.find((x) => x.totals.net > 0 && x.weeks.some((w) => w.gross > 0))
    );
    expect(m, 'the fixture has a material with a gross requirement').toBeDefined();
    renderWithProviders(<BuyerMaterialRequirement />, {
      identity: BUYER,
      route: '/buyer/material-requirement'
    });
    fireEvent.click(await screen.findByTestId(`mrq-row-${m.materialCode}`));
    const grid = await screen.findByTestId('mrq-weeks');
    expect(weekColumns(grid)).toEqual(m.weeks.map((w) => w.weekStart));
    expectWeekHeader(`mrq-week-${m.weeks[0].weekStart}`, m.weeks[0].weekStart);
    for (const w of m.weeks) {
      expect(cellAt(grid, 'gross', w.weekStart)).toHaveTextContent(qtyOf(w.gross, m.uom));
      expect(cellAt(grid, 'stockStart', w.weekStart)).toHaveTextContent(
        qtyOf(w.projectedStart, m.uom)
      );
      expect(cellAt(grid, 'receipts', w.weekStart)).toHaveTextContent(qtyOf(w.receipts, m.uom));
      if (w.unconfirmedReceipts > 0)
        expect(
          within(cellAt(grid, 'receipts', w.weekStart)).getByTestId(
            `mrq-unconfirmed-${w.weekStart}`
          )
        ).toHaveTextContent(qtyOf(w.unconfirmedReceipts, m.uom));
      expect(cellAt(grid, 'safetyStock', w.weekStart)).toHaveTextContent(
        qtyOf(w.safetyStock, m.uom)
      );
      expect(cellAt(grid, 'net', w.weekStart)).toHaveTextContent(qtyOf(w.net, m.uom));
      expect(cellAt(grid, 'planned', w.weekStart)).toHaveTextContent(
        qtyOf(w.plannedReceipt, m.uom)
      );
      const release = cellAt(grid, 'release', w.weekStart);
      expect(release).toHaveTextContent(w.releaseWeek ? `W${isoWeek(w.releaseWeek)}` : '—');
      expect(within(release).queryByText('Late to release') !== null).toBe(w.lateToRelease);
      expect(cellAt(grid, 'stockEnd', w.weekStart)).toHaveTextContent(qtyOf(w.projectedEnd, m.uom));
    }
    // The eight metric rows the week columns carried, and no week row.
    expect(grid.querySelectorAll('tbody tr[data-row]')).toHaveLength(8);
  });

  it('BR-05 — the gross requirement opens the pegs panel below the grid, for that week', async () => {
    const run = /** @type {MaterialRequirementView} */ (
      await mockDataService.procurement.getMaterialRequirement(buyerScope)
    );
    const m = /** @type {MaterialPlanView} */ (
      run.materials.find((x) => x.weeks.some((w) => w.gross > 0 && w.pegs.length > 0))
    );
    expect(m, 'the fixture has a material with pegs').toBeDefined();
    const w = /** @type {import('@services/engine/requirement').MaterialWeek} */ (
      m.weeks.find((x) => x.gross > 0 && x.pegs.length > 0)
    );
    renderWithProviders(<BuyerMaterialRequirement />, {
      identity: BUYER,
      route: '/buyer/material-requirement'
    });
    fireEvent.click(await screen.findByTestId(`mrq-row-${m.materialCode}`));
    const grid = await screen.findByTestId('mrq-weeks');
    fireEvent.click(
      within(cellAt(grid, 'gross', w.weekStart)).getByTestId(`mrq-gross-${w.weekStart}`)
    );
    const pegs = screen.getByTestId('mrq-pegs');
    expect(within(pegs).getByTestId('mrq-pegs-total')).toHaveTextContent(qtyOf(w.gross, m.uom));
    // BR-05 — the panel sits under the grid, not inside a week row.
    expect(grid.compareDocumentPosition(pegs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('CAP-1 wave 2 Table E — Make warehouse room fill, same figures', () => {
  it('every metric × week equals the value its week row showed, pill included', async () => {
    const r = /** @type {RescheduleView} */ (
      await mockDataService.procurement.getReschedule(buyerScope)
    );
    const w = /** @type {WarehouseRescheduleView} */ (
      r.warehouses.find((x) => x.kind === 'packaging')
    );
    const effect = selectionEffect(w, new Set(), r.costs);
    renderWithProviders(<BuyerReschedule />, {
      identity: PLANNER,
      route: '/buyer/reschedule?tab=fill'
    });
    const grid = await screen.findByTestId('rs-fill-weeks');
    expect(weekColumns(grid)).toEqual(w.weeks.map((wk) => wk.weekStart));
    expectWeekHeader(`rs-week-${w.weeks[0].weekStart}`, w.weeks[0].weekStart);
    for (const [i, wk] of w.weeks.entries()) {
      expect(cellAt(grid, 'fillNow', wk.weekStart)).toHaveTextContent(pct(wk.fill));
      expect(cellAt(grid, 'fillSelected', wk.weekStart)).toHaveTextContent(pct(effect.fill[i]));
      expect(cellAt(grid, 'fillRelief', wk.weekStart)).toHaveTextContent(pct(wk.fillAfterRelief));
      expect(cellAt(grid, 'fillOnHand', wk.weekStart)).toHaveTextContent(pct(wk.onHandFill));
      // The status pill, in the order the week row read it.
      const state =
        wk.onHandOverPallets > 0
          ? 'onHand'
          : effect.fill[i] > 1
            ? 'over'
            : effect.fill[i] > STANDARD
              ? 'above'
              : 'within';
      expect(cellAt(grid, 'fillStatus', wk.weekStart)).toHaveTextContent(
        i18n.t(`rs.fill.status.${state}`)
      );
    }
    // The five metric rows the week columns carried.
    expect(grid.querySelectorAll('tbody tr[data-row]')).toHaveLength(5);
  });
});

describe('CAP-1 wave 2 Table F — What to order fill, same figures', () => {
  it('every metric × week equals the value its week row showed, pill included', async () => {
    const p = /** @type {OrderPlanView} */ (
      await mockDataService.procurement.getOrderPlan(buyerScope)
    );
    const w = /** @type {WarehousePlanView} */ (p.warehouses.find((x) => x.kind === 'packaging'));
    renderWithProviders(<BuyerOrderPlan />, {
      identity: PLANNER,
      route: '/buyer/order-plan?tab=fill'
    });
    const grid = await screen.findByTestId('op-fill-weeks');
    expect(weekColumns(grid)).toEqual(w.weeks.map((wk) => wk.weekStart));
    expectWeekHeader(`op-fill-${w.weeks[0].weekStart}`, w.weeks[0].weekStart);
    for (const wk of w.weeks) {
      const plan = cellAt(grid, 'fillPlan', wk.weekStart);
      expect(plan).toHaveTextContent(pct(wk.fill));
      expect(plan).toHaveTextContent(formatNumber(Math.round(wk.pallets)));
      expect(cellAt(grid, 'fillInterim', wk.weekStart)).toHaveTextContent(pct(wk.interimFill));
      expect(cellAt(grid, 'fillLowest', wk.weekStart)).toHaveTextContent(pct(wk.lowestFill));
      const state =
        wk.fill === null ? null : wk.fill > 1 ? 'over' : wk.fill > STANDARD ? 'above' : 'within';
      const status = cellAt(grid, 'fillStatus', wk.weekStart);
      expect(status.textContent).toBe(state ? i18n.t(`op.fill.status.${state}`) : '');
      expect(cellAt(grid, 'fillRented', wk.weekStart)).toHaveTextContent(
        formatNumber(Math.round(wk.rentedPallets))
      );
      if (wk.beyondCapPallets > 0)
        expect(screen.getByTestId(`op-beyond-${wk.weekStart}`)).toHaveTextContent(
          formatNumber(Math.round(wk.beyondCapPallets))
        );
      expect(cellAt(grid, 'rentCost', wk.weekStart)).toHaveTextContent(
        formatIDR(Math.round(wk.rentIdr))
      );
    }
    // The six metric rows the week columns carried.
    expect(grid.querySelectorAll('tbody tr[data-row]')).toHaveLength(6);
  });
});

describe('CAP-1 wave 2 Table G — Stock simulation, same figures', () => {
  const SAMPLE = 'sup-004-FR-WARD-4410';

  it('every metric × week equals the simulation’s own figures and events', async () => {
    const rows = (await mockDataService.procurement.getStockSimulation(buyerScope)).items;
    const row = /** @type {StockSimulationRow} */ (
      rows.find((x) => `${x.supplierId}-${x.materialCode}` === SAMPLE)
    );
    expect(row?.simulation, 'the labelled sample row simulates').not.toBeNull();
    const sim = /** @type {NonNullable<StockSimulationRow['simulation']>} */ (row.simulation);
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation'
    });
    fireEvent.click(await screen.findByTestId(`sim-toggle-${SAMPLE}`));
    const grid = await screen.findByTestId(`sim-detail-${SAMPLE}-weeks`);
    expect(weekColumns(grid)).toEqual(sim.weekly.map((wk) => wk.weekStart));
    expectWeekHeader(`sim-week-${sim.weekly[0].weekStart}`, sim.weekly[0].weekStart);
    for (const wk of sim.weekly) {
      expect(cellAt(grid, 'available', wk.weekStart)).toHaveTextContent(
        wk.available === null ? 'Missing' : qty(wk.available)
      );
      expect(cellAt(grid, 'free', wk.weekStart)).toHaveTextContent(
        wk.freeToCallOff === null ? 'Missing' : qty(wk.freeToCallOff)
      );
      expect(cellAt(grid, 'ptiInbound', wk.weekStart)).toHaveTextContent(qty(wk.ptiInbound));
      const events = cellAt(grid, 'events', wk.weekStart);
      if (wk.events.length === 0) expect(events).toHaveTextContent('No movement');
      else
        for (const c of wk.events) {
          expect(events).toHaveTextContent(i18n.t(`sim.event.${c.kind}`));
          if (c.dispatchOnly) expect(events).toHaveTextContent('Dispatched, no ASN yet');
        }
    }
    // The four metric rows the week columns carried. (`tr[data-row]` names the
    // metric rows only: this grid is nested in the page's own table, where a
    // `tbody tr` selector also reaches the inner table's week header.)
    expect(grid.querySelectorAll('tbody tr[data-row]')).toHaveLength(4);
  });
});
