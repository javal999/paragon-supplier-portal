// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 7 on the screen — contracts and compliance: the KPI cards and the
// registry's state columns carry their (i). The delivery-agreement card's
// "Remaining" reads "Sisa kuantitas" in ID (TL-D12 Q25), checked at the glossary.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import BuyerContracts from './BuyerContracts';
import BuyerCompliance from './BuyerCompliance';

describe('BL-233 wave 7', () => {
  it('/buyer/contracts: the four KPIs carry an (i); overdue obligations say what they count', async () => {
    renderWithProviders(<BuyerContracts />);
    const tip = await screen.findByTestId('term-tip-obligations-overdue');
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'Contract obligations past their due date and not met, across all contracts.'
    );
    for (const id of ['contracts-active', 'contracts-expiring', 'contracts-active-value'])
      expect(screen.getByTestId(`term-tip-${id}`)).toBeInTheDocument();
  });

  it('/buyer/compliance: the five certificate KPIs and the SAP column carry an (i)', async () => {
    renderWithProviders(<BuyerCompliance />, { route: '/buyer/compliance' });
    const tip = await screen.findByTestId('term-tip-cert-expired');
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'An expired certificate blocks new POs.'
    );
    for (const id of [
      'cert-expiring',
      'cert-missing',
      'cert-under-review',
      'cert-valid',
      'cert-in-sap'
    ])
      expect(screen.getByTestId(`term-tip-${id}`)).toBeInTheDocument();
  });
});
