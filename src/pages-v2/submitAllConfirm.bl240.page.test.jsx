// ─────────────────────────────────────────────────────────────────────────────
// BL-240 (U-02) — Supplier Foresight commitments: Submit all opens a summary of
// every material, period and quantity about to be committed, the untouched
// pre-filled ones marked; nothing reaches the store until it is confirmed. The
// pre-fill itself (BR-09) stays. Every walk ends in the STORE.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import i18n from '@lib/i18n';
import SupplierForecastCommitments from './SupplierForecastCommitments';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  sdcClock.reset();
});

/** @param {string} period */
const submittedFor = (period) =>
  requirementResponseStore
    .all()
    .filter((r) => r.supplierId === 'sup-007' && r.periodBucket === period)
    .filter((r) => r.status === 'Submitted')
    .map((r) => r.materialCode)
    .sort();

describe('BL-240 — Submit all asks first (U-02)', () => {
  it('lists each material, period and quantity, marks the pre-filled ones, and sends nothing on Cancel', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    await screen.findByTestId(`fc-week-${W[6]}`);
    const before = submittedFor(W[6]);
    fireEvent.click(screen.getByTestId(`fc-week-submit-${W[6]}`));
    const dialog = screen.getByRole('dialog', {
      name: `Submit Week of ${formatDate(W[6])} to PTI?`
    });
    expect(dialog).toHaveTextContent('Materials: 2.');
    const line = within(dialog).getByTestId('fc-week-confirm-line-PK-PETB-8802');
    expect(line).toHaveTextContent(`PK-PETB-8802 · Week of ${formatDate(W[6])} · 38,500`);
    expect(line).toHaveAttribute('data-prefilled', 'true');
    expect(line).toHaveTextContent('Pre-filled with the forecast, not changed');
    expect(dialog).toHaveTextContent('A pre-filled quantity is PTI’s forecast');
    // Nothing is sent before the confirm.
    expect(submittedFor(W[6])).toEqual(before);
    fireEvent.click(within(dialog).getByTestId('fc-week-confirm-cancel'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(submittedFor(W[6])).toEqual(before);
  });

  it('a typed quantity is not marked pre-filled, and confirm submits the period', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const section = await screen.findByTestId('fc-sup-material-PK-PETB-8802');
    const row = within(section).getByTestId(`fc-sup-row-PK-PETB-8802-${W[6]}`);
    fireEvent.change(within(row).getByLabelText(/^Commitment quantity for/), {
      target: { value: '40000' }
    });
    fireEvent.click(screen.getByTestId(`fc-week-submit-${W[6]}`));
    const dialog = screen.getByRole('dialog');
    const typed = within(dialog).getByTestId('fc-week-confirm-line-PK-PETB-8802');
    expect(typed).toHaveAttribute('data-prefilled', 'false');
    expect(typed).toHaveTextContent('40,000');
    expect(typed).not.toHaveTextContent('Pre-filled');
    expect(within(dialog).getByTestId('fc-week-confirm-line-PK-PETB-8801')).toHaveAttribute(
      'data-prefilled',
      'true'
    );
    fireEvent.click(within(dialog).getByTestId('fc-week-confirm-submit'));
    await waitFor(() => expect(submittedFor(W[6])).toEqual(['PK-PETB-8801', 'PK-PETB-8802']));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierForecastCommitments />, {
        identity: SUPPLIER,
        route: '/supplier/forecasts'
      });
      await screen.findByTestId(`fc-week-${W[6]}`);
      fireEvent.click(screen.getByTestId(`fc-week-submit-${W[6]}`));
      const dialog = screen.getByRole('dialog', { name: /^Kirim .* ke PTI\?$/ });
      expect(dialog).toHaveTextContent('Material: 2.');
      expect(dialog).toHaveTextContent('Terisi dari prakiraan, belum diubah');
      expect(within(dialog).getByTestId('fc-week-confirm-cancel')).toHaveTextContent('Batal');
      expect(within(dialog).getByTestId('fc-week-confirm-submit')).toHaveTextContent('Kirim semua');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
