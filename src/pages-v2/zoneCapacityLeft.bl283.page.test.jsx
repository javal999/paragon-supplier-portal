// ─────────────────────────────────────────────────────────────────────────────
// BL-283 (PEX-1 BR-02 / BR-03, PEX-D22) — the supplier's Zone Capacity periods
// stay acknowledge-only and show ONE read-only figure: the capacity left. A
// week with a confirmed capacity shows a number; a month with none says
// "No capacity confirmed" (never 0). Nothing there takes a typed quantity.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
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

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

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
    // Acknowledge-only still: no quantity field in the period's column.
    const column = screen.getByTestId(`fc-sup-row-RM-EMUL-9410-${M[5]}`);
    expect(within(column).queryByRole('spinbutton')).toBeNull();
    expect(within(column).getByText('Acknowledge')).toBeInTheDocument();
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
    // Week 18 is the first monthly period (March 2027): no monthly entry yet.
    const cell = await screen.findByTestId(`fc-cap-left-RM-EMUL-9410-${M[17]}`);
    expect(cell).toHaveTextContent('No capacity confirmed');
    expect(cell).not.toHaveTextContent('KG');
  });
});
