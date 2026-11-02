// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 8 on the screen — suppliers, performance and reliability: the
// reliability KPIs and table carry their (i) (the sort column through a
// separate (i) beside its button), and the suppliers list reads "Channel"
// (TL-D12 Q26).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { textWithoutTips } from '@test/termText';
import BuyerReliability from './BuyerReliability';
import BuyerSuppliers from './BuyerSuppliers';

describe('BL-233 wave 8', () => {
  it('/buyer/reliability: the measures carry an (i), the sort column included', async () => {
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    await screen.findByTestId('rel-row-sup-007');
    const sortCell = screen.getByTestId('rel-sort-confirmation').closest('th');
    expect(sortCell?.querySelector('[data-testid="term-tip-rel-confirmation"]')).not.toBeNull();
    const tip = within(screen.getAllByTestId('term-tip-rel-commitment')[0]).getByRole('tooltip');
    expect(tip).toHaveTextContent(
      'How it is calculated: Quantity received on or before the committed date ÷ committed quantity.'
    );
    for (const id of [
      'rel-cfot',
      'rel-misses',
      'rel-plan-change-kpi',
      'rel-plan-change-col',
      'rel-masc',
      'rel-masc-i'
    ])
      expect(screen.getAllByTestId(`term-tip-${id}`).length).toBeGreaterThan(0);
  });

  it('/buyer/suppliers: "Tier" reads "Channel", with its (i)', async () => {
    renderWithProviders(<BuyerSuppliers />, { identity: BUYER, route: '/buyer/suppliers' });
    const tip = await screen.findByTestId('term-tip-supplier-channel');
    expect(textWithoutTips(tip)).toBe('Channel');
    expect(screen.queryByRole('columnheader', { name: /^Tier/ })).toBeNull();
  });
});
