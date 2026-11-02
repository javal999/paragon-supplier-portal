// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 11 on the screen — What to order, Make warehouse room: the KPIs
// carry their (i), with no requirement code (F-18).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import BuyerOrderPlan from './BuyerOrderPlan';
import BuyerReschedule from './BuyerReschedule';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

describe('BL-233 wave 11', () => {
  it('/buyer/order-plan: the warehouse KPIs carry an (i)', async () => {
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const tip = await screen.findByTestId('term-tip-rent-cost', {}, { timeout: 15000 });
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'How it is calculated: Rented pallet-weeks × the rented-space rate.'
    );
    expect(screen.getByTestId('term-tip-peak-fill')).toBeInTheDocument();
    expect(screen.getByTestId('term-tip-rented-pallet-weeks')).toBeInTheDocument();
  });

  it('/buyer/reschedule: the KPIs carry an (i)', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const tip = await screen.findByTestId('term-tip-rs-on-hand-load', {}, { timeout: 15000 });
    expect(within(tip).getByRole('tooltip')).toHaveTextContent('which no rescheduling can move');
    for (const id of ['rs-over', 'rs-relief', 'rs-saving'])
      expect(screen.getAllByTestId(`term-tip-${id}`).length).toBeGreaterThan(0);
  });
});
