// ─────────────────────────────────────────────────────────────────────────────
// BL-204 (DRC-1, DRC-8 Incoming DA) on the screen with `SUPPLIER_DA_VIEW_ENABLED`
// switched ON for this file only (it ships false; see
// `SupplierDemandAnticipation.bl204.page.test.jsx`). The menu lists the page;
// the supplier sees its own pairs only, with the planner's published figures
// and the Provisional label (A1, A2, A8b, A9), in EN and ID; the feedstock
// confirmation offers "Incoming demand anticipation confirmed" and stores it.
// Every expected figure is read from the planner's own read, never restated.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { SUPPLIER_NAV } from '@components/layout-v2/navConfig';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { feedstockConfirmationStore } from '@services/data/mock/stores/feedstockConfirmationStore';
import { allDemandAnticipation } from '@services/data/mock/demandAnticipationReadModel';
import { SUPPLIER_DA_VIEW_ENABLED } from '@services/transitions/supplierDaView';
import { sdcClock } from '@services/sdc';
import { formatNumber } from '@lib/format';
import i18n from '@lib/i18n';
import SupplierDemandAnticipation from './SupplierDemandAnticipation';
import SupplierInventory from './SupplierInventory';
import { expectNoBareDa } from '@test/noBareDa';

vi.mock('@services/transitions/supplierDaView', async (importOriginal) => ({
  .../** @type {object} */ (await importOriginal()),
  SUPPLIER_DA_VIEW_ENABLED: true
}));

const ROUTE = '/supplier/demand-anticipation';
const KEY = 'sup-007-PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  feedstockConfirmationStore.reset();
});

describe('BL-204 · flag on — the supplier page (DRC-1)', () => {
  it('the mock took, and the Planning menu lists the page after Forecast & commitments', () => {
    expect(SUPPLIER_DA_VIEW_ENABLED).toBe(true);
    const paths = SUPPLIER_NAV.find((s) => s.id === 'planning')?.items.map((i) => i.path) ?? [];
    expect(paths.indexOf(ROUTE)).toBe(paths.indexOf('/supplier/forecasts') + 1);
  });

  it('shows the own pairs only, each figure equal to the planner’s published one', async () => {
    const planner = allDemandAnticipation();
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    const card = await screen.findByTestId(`supda-card-${KEY}`);
    expect(
      within(screen.getByRole('navigation')).getByRole('button', { name: 'Demand anticipation' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('supda-provisional').textContent).toBe(
      'Provisional: rule awaiting Material Planning (A8b, A9)'
    );
    // Own pairs only: every card is sup-007's, and every sup-007 pair has one.
    const cards = [...document.querySelectorAll('[data-testid^="supda-card-"]')].map((c) =>
      c.getAttribute('data-testid')
    );
    const own = planner.filter((r) => r.supplierId === 'sup-007');
    expect(cards).toEqual(own.map((r) => `supda-card-${r.supplierId}-${r.materialCode}`));
    expect(cards.length).toBeGreaterThan(0);
    // Same figures as the planner's page, week by week.
    const row =
      /** @type {import('@services/transitions/demandAnticipationRules').DemandAnticipationRow} */ (
        planner.find((r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8802')
      );
    const published = row.weeks.filter((w) => w.published !== null);
    expect(published.length).toBeGreaterThan(0);
    for (const w of published)
      expect(within(card).getByTestId(`supda-figure-${KEY}-${w.week}`).textContent).toBe(
        formatNumber(/** @type {number} */ (w.published))
      );
    expect(within(card).getByTestId(`supda-total-${KEY}`).textContent).toContain(
      formatNumber(published.reduce((n, w) => n + /** @type {number} */ (w.published), 0))
    );
    // TL-D1: "DA" only as the bracket in "Demand anticipation (DA)".
    expectNoBareDa(card);
  });

  it('reads in Indonesian', async () => {
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
      const card = await screen.findByTestId(`supda-card-${KEY}`);
      expect(within(card).getByText('Demand anticipation (DA)')).toBeInTheDocument();
      expect(screen.getByTestId('supda-provisional').textContent).toBe(
        'Sementara: aturan menunggu Material Planning (A8b, A9)'
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('BL-204 · flag on — Incoming DA on the feedstock confirmation (DRC-8)', () => {
  it('offers the box for a material with a publication and stores it with the confirmation', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      // Inventory UX S-01 — the feedstock confirmation is its own tab.
      route: '/supplier/inventory?tab=feedstock'
    });
    fireEvent.click(await screen.findByTestId('feedstock-open-PK-PETB-8802'));
    const box = await screen.findByTestId('feedstock-incoming-da-box');
    expect(screen.getByTestId('feedstock-incoming-da').textContent).toContain(
      'Incoming demand anticipation confirmed'
    );
    fireEvent.change(screen.getByTestId('feedstock-qty'), { target: { value: '12' } });
    fireEvent.click(box);
    fireEvent.click(screen.getByTestId('feedstock-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('feedstock-incoming-da-PK-PETB-8802').textContent).toBe(
        'Incoming demand anticipation confirmed (W36 publication)'
      )
    );
    expect(feedstockConfirmationStore.all()).toMatchObject([
      {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8802',
        feedstockQty: 12,
        incomingDa: { publicationId: 'dap-0001', planningWeek: '2026-08-31' }
      }
    ]);
  });

  it('left unticked, the confirmation stores no Incoming DA', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      // Inventory UX S-01 — the feedstock confirmation is its own tab.
      route: '/supplier/inventory?tab=feedstock'
    });
    fireEvent.click(await screen.findByTestId('feedstock-open-PK-PETB-8802'));
    await screen.findByTestId('feedstock-incoming-da-box');
    fireEvent.change(screen.getByTestId('feedstock-qty'), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('feedstock-submit'));
    await waitFor(() => expect(feedstockConfirmationStore.all()).toHaveLength(1));
    expect(feedstockConfirmationStore.all()[0].incomingDa).toBeUndefined();
  });
});
