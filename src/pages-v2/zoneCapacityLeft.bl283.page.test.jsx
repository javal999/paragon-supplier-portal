// ─────────────────────────────────────────────────────────────────────────────
// BL-283 (PEX-1 BR-02 / BR-03, PEX-D22) — the supplier's Zone Capacity periods
// stay acknowledge-only and show ONE read-only figure: the capacity left. A
// week with a confirmed capacity shows a number; a month with none says
// "No capacity confirmed" (never 0). Nothing there takes a typed quantity.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { NO_PERSON } from '@context/noPerson';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_RAW_MATERIAL_PERIODS as M } from '@services/data/mock/fixtures/forecastHub';
import { sdcClock } from '@services/sdc';
import SupplierForecastCommitments from './SupplierForecastCommitments';

const clearStorage = () => {
  try {
    window.localStorage.clear();
  } catch {
    // nothing stored
  }
};

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
  clearStorage();
});

/**
 * The cell of grid row `rowId` under period `bucket` in the material's grid
 * (CAP-1 wave 3: the periods are the `WeekGrid`'s columns).
 * @param {string} rowId
 * @param {string} bucket
 * @param {'week' | 'month'} [kind]
 * @returns {HTMLElement}
 */
const cellAt = (rowId, bucket, kind = 'week') => {
  const grid = screen.getByTestId('fc-sup-grid-RM-EMUL-9410');
  const heads = [...grid.querySelectorAll('thead th')];
  const col = heads.findIndex((h) => h.getAttribute(`data-${kind}`) === bucket);
  expect(col, `period ${bucket} is a column`).toBeGreaterThan(0);
  const row = grid.querySelector(`tbody tr[data-row="${rowId}"]`);
  expect(row, `row ${rowId}`).not.toBeNull();
  return /** @type {HTMLElement} */ (/** @type {Element} */ (row).querySelectorAll('td')[col - 1]);
};

/** @type {CurrentIdentity} */
const SUP_002 = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};

describe('Zone Capacity periods show the capacity left, read only', () => {
  it('a confirmed week reads confirmed capacity less what the group already takes', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_002,
      route: '/supplier/forecasts'
    });
    // Week 6 (5 Oct) is past sup-002's 30-day lead time: Zone Capacity. The
    // sample confirms 1,200 KG a week for the group and nothing else takes it.
    const cell = await screen.findByTestId(`fc-cap-left-RM-EMUL-9410-${M[5]}`);
    expect(cell).toHaveTextContent(/Capacity left/);
    expect(cell).toHaveTextContent('1,200 KG');
    // Acknowledge-only still: no quantity field in the period's column, and
    // the period's own Acknowledge sits in the actions row.
    expect(within(cellAt('commitment', M[5])).queryByRole('spinbutton')).toBeNull();
    expect(within(cellAt('actions', M[5])).getByText('Acknowledge')).toBeInTheDocument();
  });

  it('a Zone Liability week shows no capacity figure (it takes the commitment)', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_002,
      route: '/supplier/forecasts'
    });
    await screen.findByTestId(`fc-cap-left-RM-EMUL-9410-${M[5]}`);
    expect(screen.queryByTestId(`fc-cap-left-RM-EMUL-9410-${M[0]}`)).toBeNull();
  });

  it('a month beyond the confirmed weeks says "No capacity confirmed", not a number', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_002,
      route: '/supplier/forecasts'
    });
    // CAP-1 wave 3 / CAP-2 BR-07 — the months are the grid's Monthly view.
    // Week 18 is the first monthly period (March 2027): no monthly entry yet.
    await screen.findByTestId(`fc-cap-left-RM-EMUL-9410-${M[5]}`);
    fireEvent.click(
      within(screen.getByTestId('fc-sup-grid-RM-EMUL-9410-view')).getByRole('button', {
        name: /Monthly/
      })
    );
    const cell = await screen.findByTestId(`fc-cap-left-RM-EMUL-9410-${M[17]}`);
    expect(cell).toHaveTextContent('No capacity confirmed');
    expect(cell).not.toHaveTextContent('KG');
  });
});
