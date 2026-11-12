// ─────────────────────────────────────────────────────────────────────────────
// B11 (SSTP walkthrough, 2026-11-12) — the changed-results bar. The results
// table sits above the inputs, so an edit looked like it did nothing. The bar
// appears once an input differs from the current plan, names each figure that
// moved with plan → scenario and the difference, says so when nothing moved
// (Supplier feedstock: no rule reads it), and goes away on reset.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';

// The live SSTP pair the walkthrough used (sup-007 × 2000028400).
const SSTP_LIVE = '/buyer/what-if?supplier=sup-007&material=2000028400';

beforeEach(async () => {
  sdcClock.reset();
  whatIfScenarioStore.reset();
  await i18n.changeLanguage('en');
});

describe('B11 · the moved figures stay in view while editing', () => {
  it('is absent until an input changes', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: SSTP_LIVE });
    await screen.findByLabelText('Z (B3)');
    expect(screen.queryByTestId('wi-changed-bar')).toBeNull();
  });

  it('Z 1.65 → 2.5 lists the safety order, ROP Order and DA with plan → scenario; reset hides it', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: SSTP_LIVE });
    fireEvent.change(await screen.findByLabelText('Z (B3)'), { target: { value: '2.5' } });
    const bar = screen.getByTestId('wi-changed-bar');
    expect(bar).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('wi-changed-bar-title')).toHaveTextContent(
      '5 figures moved from the current plan'
    );
    expect(screen.getByTestId('wi-changed-safetyOrder')).toHaveTextContent(
      '27,311 → 54,622 (+27,311)'
    );
    expect(screen.getByTestId('wi-changed-ropOrder')).toHaveTextContent(
      '146,911 → 174,222 (+27,311)'
    );
    // The bar and the table read the same runs.
    expect(screen.getByTestId('wi-scn-ropOrder')).toHaveTextContent('174,222');
    // An unmoved figure is not listed.
    expect(screen.queryByTestId('wi-changed-ropFisik')).toBeNull();
    fireEvent.click(screen.getByTestId('wi-reset'));
    expect(screen.queryByTestId('wi-changed-bar')).toBeNull();
  });

  it('a week figure reads as a shift: open PO 0 moves the first shortage week', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: SSTP_LIVE });
    const ospo = await screen.findByLabelText('Open PO not yet called off');
    fireEvent.change(ospo, { target: { value: '0' } });
    expect(screen.getByTestId('wi-changed-firstShortageWeek')).toHaveTextContent(/W\d+ → W\d+/);
    expect(screen.getByTestId('wi-changed-firstShortageWeek')).not.toHaveTextContent('(');
  });

  it('Supplier feedstock moves no figure, and the bar says so', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: SSTP_LIVE });
    const feedstock = await screen.findByLabelText('Supplier feedstock');
    fireEvent.change(feedstock, { target: { value: '0' } });
    expect(screen.getByTestId('wi-changed-bar-title')).toHaveTextContent(
      'No figure moved from the current plan'
    );
    expect(screen.getByTestId('wi-edited')).toHaveTextContent('1 input or switch changed');
  });

  it('"See all results" points at the results table', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: SSTP_LIVE });
    fireEvent.change(await screen.findByLabelText('Z (B3)'), { target: { value: '2.5' } });
    const anchor = document.getElementById('wi-results-anchor');
    expect(anchor).not.toBeNull();
    expect(anchor?.querySelector('[data-testid="wi-results"]')).not.toBeNull();
    expect(screen.getByTestId('wi-changed-bar-see')).toHaveAttribute('href', '#wi-results-anchor');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerWhatIfSandbox />, { route: SSTP_LIVE });
    const z = await screen.findByTestId('wi-in-z');
    fireEvent.change(z.querySelector('input') ?? z, { target: { value: '2.5' } });
    expect(screen.getByTestId('wi-changed-bar-title')).toHaveTextContent(
      '5 angka berubah dari rencana saat ini'
    );
    expect(screen.getByTestId('wi-changed-bar-see')).toHaveTextContent('Lihat semua hasil');
  });
});
