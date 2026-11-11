import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerDemandForecast from './BuyerDemandForecast';
import { mockDataService } from '@services/data/mock/mockDataService';
import { promotionStore } from '@services/data/mock/stores/promotionStore';
import { formatNumber } from '@lib/format';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
/** @import { QueryScope } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// BL-235 — the planner adds, changes and withdraws a promotion for one SKU on
// the Demand forecast page; the week is marked and the forecast shown follows.
// Figures are read back from the service, never restated.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const view = async () =>
  /** @type {import('@services/data/types').DemandForecastView} */ (
    await mockDataService.procurement.getDemandForecast(buyerScope)
  );

afterEach(() => {
  promotionStore.reset();
});

describe('BuyerDemandForecast — promotion for one SKU', () => {
  it('adds, changes and withdraws; the week is marked while it is in force', async () => {
    const v0 = await view();
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    const panel = await screen.findByTestId('df-promo');
    const sku = v0.skus[0];
    const week = v0.weeks[0];
    expect(screen.queryByTestId(`df-week-promotion-${week}`)).toBeNull();

    fireEvent.change(screen.getByTestId('df-promo-value'), { target: { value: '25' } });
    fireEvent.click(screen.getByTestId('df-promo-save'));
    const mark = await screen.findByTestId(`df-week-promotion-${week}`);
    const v1 = await view();
    const lift = Math.round((sku.engineForecast[0] * 25) / 100);
    expect(mark).toHaveTextContent('Promotion');
    expect(mark).toHaveTextContent('+25%');
    expect(mark.getAttribute('title')).toContain(formatNumber(sku.engineForecast[0] + lift));
    expect(v1.skus[0].promotions).toHaveLength(1);
    expect(screen.getByTestId('df-promo-history')).toBeInTheDocument();

    // change: units
    fireEvent.click(screen.getByTestId(`df-promo-change-${week}`));
    fireEvent.change(screen.getByTestId('df-promo-kind'), { target: { value: 'units' } });
    fireEvent.change(screen.getByTestId('df-promo-value'), { target: { value: '40' } });
    fireEvent.click(screen.getByTestId('df-promo-save'));
    await waitFor(() =>
      expect(screen.getByTestId(`df-week-promotion-${week}`)).toHaveTextContent('+40 units')
    );

    // withdraw
    fireEvent.click(screen.getByTestId(`df-promo-withdraw-${week}`));
    await waitFor(() => expect(screen.queryByTestId(`df-week-promotion-${week}`)).toBeNull());
    expect((await view()).promotionsInForce).toBe(0);
    expect(panel).toBeInTheDocument();
  });

  it('refuses a percentage above the cap in the form, so nothing is sent', async () => {
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    await screen.findByTestId('df-promo');
    fireEvent.change(screen.getByTestId('df-promo-value'), { target: { value: '5000' } });
    expect(screen.getByTestId('df-promo-save')).toBeDisabled();
    expect(promotionStore.all()).toHaveLength(0);
  });
});
