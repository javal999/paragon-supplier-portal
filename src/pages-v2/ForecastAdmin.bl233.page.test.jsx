// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 9 on the screen — the demand forecast's bias tab
// KPIs: the measures carry their (i), with no requirement code (F-18).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerDemandForecast from './BuyerDemandForecast';

describe('BL-233 wave 9', () => {
  it('the bias tab: the alarm and override KPIs carry an (i)', async () => {
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast?tab=bias'
    });
    const tip = await screen.findByTestId('term-tip-fb-skus-alarm', {}, { timeout: 15000 });
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'the tracking signal is past 0.51 either way'
    );
    for (const id of ['fb-materials-alarm', 'fb-overrides', 'fb-value'])
      expect(screen.getByTestId(`term-tip-${id}`)).toBeInTheDocument();
    // The FVA table renders only once a month of overrides exists; the seed has none.
  });
});
