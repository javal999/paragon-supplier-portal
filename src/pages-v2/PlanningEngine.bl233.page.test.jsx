// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 10 on the screen — material requirement and model backtest: the
// KPIs and the method columns carry their (i), with no requirement code (F-18).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerMaterialRequirement from './BuyerMaterialRequirement';
import BuyerModelBacktest from './BuyerModelBacktest';

describe('BL-233 wave 10', () => {
  it('/buyer/material-requirement: the KPIs and the net requirement give their rule', async () => {
    renderWithProviders(<BuyerMaterialRequirement />, {
      identity: BUYER,
      route: '/buyer/material-requirement'
    });
    const tip = await screen.findByTestId('term-tip-mrq-late-kpi', {}, { timeout: 15000 });
    expect(within(tip).getByRole('tooltip')).toHaveTextContent('release week has already passed');
    const net = within(screen.getAllByTestId('term-tip-mrp-net')[0]).getByRole('tooltip');
    expect(net).toHaveTextContent(
      'How it is calculated: Gross requirement + safety stock − (stock at start + confirmed receipts), never below 0.'
    );
  });

  it('/buyer/model-backtest: the method columns carry an (i); the fallback says it is the floor', async () => {
    renderWithProviders(<BuyerModelBacktest />, {
      identity: BUYER,
      route: '/buyer/model-backtest'
    });
    await screen.findByTestId('mb-skus', {}, { timeout: 15000 });
    const comb = within(screen.getAllByTestId('term-tip-cand-comb')[0]).getByRole('tooltip');
    expect(comb).toHaveTextContent('A model that does not beat it is not used.');
    expect(screen.getAllByTestId('term-tip-mb-fill-rate').length).toBeGreaterThan(0);
  });
});
