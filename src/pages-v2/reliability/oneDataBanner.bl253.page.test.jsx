// ─────────────────────────────────────────────────────────────────────────────
// BL-253 (U-20) — Supplier Foresight commitments carries ONE data marker: the
// page's "Sample data" at the top. The "Your reliability" panel on the same
// page no longer adds its own "Synthetic data · awaiting the MDM SAP feed".
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { widgetEn, widgetId } from '@lib/i18n/widget';
import SupplierForecastCommitments from '../SupplierForecastCommitments';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  sdcClock.reset();
});

describe.each(
  /** @type {const} */ ([
    ['en', 'Sample data', widgetEn],
    ['id', 'Data contoh', widgetId]
  ])
)('BL-253 — one data marker on the page (%s)', (lang, sample, widget) => {
  it('the page badge once at the top; the reliability panel adds no strip', async () => {
    await i18n.changeLanguage(lang);
    try {
      renderWithProviders(<SupplierForecastCommitments />, {
        identity: SUPPLIER,
        route: '/supplier/forecasts'
      });
      const panel = await screen.findByTestId('rel-sup-panel');
      const badges = screen.getAllByTestId('sample-data-badge');
      expect(badges).toHaveLength(1);
      expect(badges[0]).toHaveTextContent(sample);
      const strip = widget['widget.honesty.awaitingMdmFeed'];
      expect(strip).toBeTruthy();
      expect(within(panel).queryByText(new RegExp(strip, 'i'))).toBeNull();
      expect(screen.queryByText(new RegExp(strip, 'i'))).toBeNull();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
