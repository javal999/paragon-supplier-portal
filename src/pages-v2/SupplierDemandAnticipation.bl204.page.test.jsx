// ─────────────────────────────────────────────────────────────────────────────
// BL-204 (DRC-1, DRC-8 Incoming DA) on the screen, in the SHIPPED state:
// `SUPPLIER_DA_VIEW_ENABLED` is false (DRC-D10). No menu item, the route says
// "not available yet" (EN and ID), and the feedstock confirmation offers no
// Incoming DA box — even for a material that HAS a publication (the control).
// The flag-on screens are in `SupplierDemandAnticipation.flagOn.bl204.page.test.jsx`.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { SUPPLIER_NAV } from '@components/layout-v2/navConfig';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { feedstockConfirmationStore } from '@services/data/mock/stores/feedstockConfirmationStore';
import { supplierDemandAnticipation } from '@services/data/mock/demandAnticipationReadModel';
import { SUPPLIER_DA_VIEW_ENABLED } from '@services/transitions/supplierDaView';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import SupplierDemandAnticipation from './SupplierDemandAnticipation';
import SupplierInventory from './SupplierInventory';

const ROUTE = '/supplier/demand-anticipation';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  feedstockConfirmationStore.reset();
});

describe('BL-204 · flag off (DRC-D10)', () => {
  it('ships off', () => {
    expect(SUPPLIER_DA_VIEW_ENABLED).toBe(false);
  });

  it('the supplier menu has no Demand anticipation item; Planning keeps its other items', async () => {
    const planning = SUPPLIER_NAV.find((s) => s.id === 'planning');
    expect(planning?.items.map((i) => i.path)).toContain('/supplier/forecasts');
    expect(planning?.items.map((i) => i.path)).not.toContain(ROUTE);
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('supda-not-available');
    // The rendered sidebar holds the Planning items but no entry for this page.
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('button', { name: 'Foresight commitments' })).toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: 'Demand anticipation' })).toBeNull();
  });

  it('the route renders the "not available yet" notice and no figure, though figures are published', async () => {
    // Control: sup-007 has published figures the page could have shown.
    expect(supplierDemandAnticipation().some((r) => r.supplierId === 'sup-007')).toBe(true);
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    const notice = await screen.findByTestId('supda-not-available');
    expect(within(notice).getByText('Not available yet')).toBeInTheDocument();
    expect(screen.queryByTestId('supda-provisional')).toBeNull();
    expect(document.querySelector('[data-testid^="supda-card-"]')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
      const notice = await screen.findByTestId('supda-not-available');
      expect(within(notice).getByText('Belum tersedia')).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('the feedstock confirmation hides Incoming DA, even for a material with a publication', async () => {
    expect(
      supplierDemandAnticipation().some(
        (r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8802'
      )
    ).toBe(true);
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByTestId('feedstock-open-PK-PETB-8802'));
    expect(screen.getByTestId('feedstock-form')).toBeInTheDocument();
    expect(screen.queryByTestId('feedstock-incoming-da')).toBeNull();
    expect(screen.queryByText(/demand anticipation/i)).toBeNull();
  });
});
