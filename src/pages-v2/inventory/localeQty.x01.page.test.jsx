// X-01 — the stock simulation page in Indonesian groups quantities the
// Indonesian way ("10.000 PCS"), the same way the entry hint reads numbers.
// English stays "10,000 PCS" (BuyerStockSimulation.test.jsx).

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { simulationOverrideStore } from '@services/data/mock/stores/simulationOverrideStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { sdcClock } from '@services/sdc';
import BuyerStockSimulation from '../BuyerStockSimulation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const CASE3 = 'sup-007-PK-CART-9910';

beforeEach(async () => {
  simulationOverrideStore.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
  sdcClock.reset();
  await i18n.changeLanguage('id');
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('X-01 — inventory quantities in Indonesian', () => {
  it('stock simulation row reads 7.000 · 10.000 · 15.000 PCS', async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation?date=2026-09-01'
    });
    await screen.findByTestId(`sim-row-${CASE3}`);
    expect(screen.getByTestId(`sim-available-${CASE3}`)).toHaveTextContent(/^7\.000 PCS$/);
    expect(screen.getByTestId(`sim-calledoff-${CASE3}`)).toHaveTextContent(/^10\.000 PCS$/);
    expect(screen.getByTestId(`sim-pti-${CASE3}`)).toHaveTextContent(/^15\.000 PCS$/);
  });
});
