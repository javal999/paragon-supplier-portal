import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import BasisLine from './BasisLine';

// ─────────────────────────────────────────────────────────────────────────────
// FSR-D1 (BL-237) — the basis line says the dataset AND its standing, in one
// shared wording, in both languages.
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BasisLine', () => {
  it('plan of record: names the hub sample data and ranks the engine as the challenger', () => {
    renderWithProviders(<BasisLine standing="planOfRecord" />, { identity: BUYER });
    const line = screen.getByTestId('basis-line');
    expect(line).toHaveAttribute('data-standing', 'planOfRecord');
    expect(line).toHaveTextContent(
      'Plan of record: hub sample data (LTP, SAP stock, call-offs, OSIP columns). The engine dataset is the challenger.'
    );
  });

  it('challenger: names the engine dataset and ranks the hub sample as the plan of record', () => {
    renderWithProviders(<BasisLine standing="challenger" />, { identity: BUYER });
    const line = screen.getByTestId('basis-line');
    expect(line).toHaveAttribute('data-standing', 'challenger');
    expect(line).toHaveTextContent(
      'Challenger: engine dataset (SAP plan, synthetic). The hub sample data (LTP, demand anticipation, call-offs, OSIP) is the plan of record.'
    );
  });

  it('reads in Indonesian, with "pembanding" for the challenger as the Safety stock columns already say', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BasisLine standing="challenger" />, { identity: BUYER });
    expect(screen.getByTestId('basis-line')).toHaveTextContent(
      'Pembanding: dataset mesin (rencana SAP, sintetis). Data contoh hub (LTP, demand anticipation, call-off, OSIP) adalah rencana acuan.'
    );
  });
});
