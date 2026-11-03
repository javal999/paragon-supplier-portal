// ─────────────────────────────────────────────────────────────────────────────
// BL-245 (U-03) — the Demand anticipation (DA) grid shows the planning week's
// carried remainder as PENDING in its target cell, so the grid agrees with the
// card sentence ("4,300 carried to W40 (last week of the horizon)"). The
// figure is not yet in force (DRC-B22: it counts from the next planning week),
// so the row's sum does not include it.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { formatNumber } from '@lib/format';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
// sup-002 × RM-EMUL-9410 — a 5-week horizon and a remainder to carry (drc2 suite).
const EMUL = 'sup-002-RM-EMUL-9410';
const ROUTE = `/buyer/demand-anticipation?supplier=sup-002&material=RM-EMUL-9410`;
const LOAD = { timeout: 15000 };

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  demandAnticipationStore.all();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

const rowOf = async () => {
  const rows = (
    await mockDataService.procurement.getDemandAnticipation({
      personaType: 'buyer',
      supplierId: null,
      businessRoles: SEEDED_SEAT_ROLES.buyer
    })
  ).items;
  const row = rows.find((r) => `${r.supplierId}-${r.materialCode}` === EMUL);
  if (!row) throw new Error(`no row ${EMUL}`);
  return row;
};

describe('BL-245 — the pending carry in the grid', () => {
  it('renders the remainder as pending in its target week, without adding it to the Carry-over row', async () => {
    const row = await rowOf();
    const carry = row.plan.carry;
    expect(carry).not.toBeNull();
    if (carry === null) throw new Error('fixture no longer carries');
    expect(row.plan.carryTarget).toBe('lastWeek');
    // The target is a grid column, and the read holds nothing carried IN there yet.
    const target = row.weeks.find((w) => w.week === carry.week);
    expect(target).toBeDefined();
    expect(target?.inputs.carriedIn).toEqual([]);

    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const grid = await screen.findByTestId(`dant-grid-${EMUL}`, {}, LOAD);
    const cell = within(grid).getByTestId(`dant-carry-pending-${EMUL}-${carry.week}`);
    expect(cell).toHaveTextContent(
      `${formatNumber(carry.qty)} pending (counts from next planning week)`
    );
    // The same quantity and week the card sentence names.
    expect(screen.getByTestId(`dant-carry-${EMUL}`)).toHaveTextContent(
      `${formatNumber(carry.qty)} carried to W40 (last week of the horizon)`
    );
    // Not a carried-in figure: no Data cell for the week, and the row's sum is unchanged.
    expect(within(grid).queryByTestId(`dant-carried-${EMUL}-${carry.week}`)).toBeNull();
    const tr = /** @type {HTMLElement} */ (
      within(grid)
        .getAllByRole('rowheader')
        .find((h) => (h.textContent ?? '').startsWith('Carry-over'))
        ?.closest('tr')
    );
    expect(tr).toContainElement(cell);
    // Outside the pending cell the row reads no carried quantity at all on this
    // fixture (nothing carried in), so the pending figure is in no cell or sum.
    const outside = (tr.textContent ?? '').replace(cell.textContent ?? '', '');
    expect(
      row.weeks.every((w) => w.inputs.carriedIn.length === 0),
      'fixture carries nothing in'
    ).toBe(true);
    expect(outside).not.toContain(formatNumber(carry.qty));
    // No other week carries the pending marker.
    expect(within(grid).getAllByTestId(/^dant-carry-pending-/)).toHaveLength(1);
  });

  it('[Owner A8] after the supplier agrees, the pending cell moves to the first week after the horizon', async () => {
    const before = (await rowOf()).plan;
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await screen.findByTestId(`dant-grid-${EMUL}`, {}, LOAD);
    fireEvent.click(screen.getByTestId('dant-publish-button'));
    const confirm = await screen.findByTestId('dant-publish-confirm');
    fireEvent.click(within(confirm).getByTestId('dant-agree-sup-002-RM-EMUL-9410'));
    fireEvent.click(within(confirm).getByTestId('dant-publish-commit'));
    await waitFor(() => expect(demandAnticipationStore.all()).toHaveLength(2));
    const after = (await rowOf()).plan;
    expect(after.carryTarget).toBe('firstOutside');
    if (after.carry === null) throw new Error('fixture no longer carries');
    await waitFor(() =>
      expect(
        screen.getByTestId(`dant-carry-pending-${EMUL}-${after.carry?.week ?? ''}`)
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByTestId(`dant-carry-pending-${EMUL}-${before.carry?.week ?? ''}`)
    ).toBeNull();
  });

  it('reads in Indonesian', async () => {
    const row = await rowOf();
    if (row.plan.carry === null) throw new Error('fixture no longer carries');
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const grid = await screen.findByTestId(`dant-grid-${EMUL}`, {}, LOAD);
    expect(
      within(grid).getByTestId(`dant-carry-pending-${EMUL}-${row.plan.carry.week}`)
    ).toHaveTextContent('tertunda (dihitung mulai minggu perencanaan berikutnya)');
  });
});
