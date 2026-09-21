// ─────────────────────────────────────────────────────────────────────────────
// BL-53 · THE DEFINITIONS ON BOTH PERFORMANCE PAGES — the same section, the
// same numbers, and "Baseline period" where the 90% target used to be.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import BuyerScorecard from './BuyerScorecard';
import SupplierPerformance from './SupplierPerformance';
import { MATCH_WINDOW_DAYS, DELIVERY_GRACE_DAYS } from '../services/delivery/fulfillment';

const expectDefinitions = async () => {
  const section = await screen.findByTestId('kpi-definitions');
  const otif = within(section).getByTestId('kpi-definition-otif');
  expect(within(otif).getByTestId('kpi-otif-window')).toHaveTextContent(`within ${MATCH_WINDOW_DAYS} days`);
  expect(within(otif).getByTestId('kpi-otif-window')).toHaveTextContent(`${DELIVERY_GRACE_DAYS} days after it: missed`);
  expect(within(otif).getByTestId('kpi-otif-early')).toHaveTextContent(`up to ${MATCH_WINDOW_DAYS} days early`);
  expect(within(otif).getByTestId('kpi-otif-grain')).toHaveTextContent('Per call-off');
  expect(within(otif).getByTestId('kpi-otif-dateChange')).toHaveTextContent('Resets');
  const cfot = within(section).getByTestId('kpi-definition-cfot');
  expect(within(cfot).getByTestId('kpi-cfot-early')).toHaveTextContent('however early');
  expect(within(cfot).getByTestId('kpi-cfot-grain')).toHaveTextContent('Per purchase order, by quantity');
  for (const id of ['otif', 'cfot']) {
    expect(within(section).getByTestId(`kpi-${id}-target`)).toHaveTextContent('Baseline period — no target yet');
    expect(within(section).getByTestId(`kpi-${id}-target`)).toHaveTextContent('after 3 months');
  }
};

describe('BL-53 · KPI definitions on the performance pages', () => {
  it('PTI scorecard: the definitions, and no 90% target on the calculated OTIF', async () => {
    renderWithProviders(<BuyerScorecard />, { identity: BUYER });
    await expectDefinitions();
    expect(screen.getByTestId('scorecard-otif')).not.toHaveTextContent(/target 9\d%/);
    expect(screen.queryByText('OTIF target')).not.toBeInTheDocument();
  });

  it('supplier performance: the SAME definitions the buyer reads', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    await expectDefinitions();
    expect(screen.getByTestId('my-performance-otif')).not.toHaveTextContent(/target 9\d%/);
  });
});
