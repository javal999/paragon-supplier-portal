// ─────────────────────────────────────────────────────────────────────────────
// BL-241 (U-05) — Supplier Foresight commitments: "Draft saved (not visible to
// PTI)" shows only while the line is still awaited and a draft exists. Once the
// period is submitted PTI sees it, so the marker goes.
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

// PEX-D22 (owner, 2026-11-05) — a draft and Submit all exist on Zone
// Liability periods only, so the row is sup-007's awaiting firm week W[0]
// (it was the Trade-off week W[6], now acknowledgement only).
const rowOf = () =>
  within(screen.getByTestId('fc-sup-material-PK-PETB-8802')).getByTestId(
    `fc-sup-row-PK-PETB-8802-${W[0]}`
  );

describe('BL-241 — the draft marker leaves once the period is submitted (U-05)', () => {
  it('shows after Save draft, and is gone after Submit all', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    await screen.findByTestId('fc-sup-material-PK-PETB-8802');
    expect(rowOf()).not.toHaveTextContent('Draft saved (not visible to PTI)');
    fireEvent.click(
      within(rowOf()).getByRole('button', { name: `Save draft for Week of ${formatDate(W[0])}` })
    );
    await waitFor(() => expect(rowOf()).toHaveTextContent('Draft saved (not visible to PTI)'));
    fireEvent.click(screen.getByTestId(`fc-week-submit-${W[0]}`));
    fireEvent.click(screen.getByTestId('fc-week-confirm-submit'));
    // W[0] is past its Zone Liability deadline (the BL-48 demo), so it lands late.
    await waitFor(() => expect(rowOf()).toHaveTextContent('Submitted late'));
    // The draft record is still in the store; the screen no longer calls it invisible.
    expect(
      requirementResponseStore
        .all()
        .some(
          (r) =>
            r.materialCode === 'PK-PETB-8802' && r.periodBucket === W[0] && r.status === 'Draft'
        )
    ).toBe(true);
    expect(rowOf()).not.toHaveTextContent('Draft saved (not visible to PTI)');
  });

  it('reads in Indonesian while the draft is awaited', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierForecastCommitments />, {
        identity: SUPPLIER,
        route: '/supplier/forecasts'
      });
      await screen.findByTestId('fc-sup-material-PK-PETB-8802');
      fireEvent.click(within(rowOf()).getByRole('button', { name: /^Simpan draf untuk/ }));
      await waitFor(() =>
        expect(rowOf()).toHaveTextContent('Draf tersimpan (tidak terlihat oleh PTI)')
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
