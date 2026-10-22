// ─────────────────────────────────────────────────────────────────────────────
// P-12 (IA-B06) on Demand anticipation: "This week" first, "Record
// consumption" second, the history as its own page linked beside the tabs,
// the tab in the address, and the `supplier=` / `material=` filters (the
// links from What to order and from the DRC-4 alert) still landing on the
// cards they filter.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const KEY = 'sup-002-RM-STEAR-7300';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  consumptionStore.reset();
});
afterEach(() => {
  sdcClock.reset();
  void i18n.changeLanguage('en');
});

/** @param {string} route */
const render = (route) =>
  renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route });

describe('Demand anticipation — tabs (P-12)', () => {
  it('opens on This week: the publication and the cards, with the history linked beside the tabs', async () => {
    render('/buyer/demand-anticipation');
    expect(await screen.findByTestId(`dant-card-${KEY}`)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'This week',
      'Record consumption'
    ]);
    expect(screen.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('dant-publication')).toBeInTheDocument();
    expect(screen.queryByTestId('consumption-panel')).toBeNull();
    expect(screen.getByTestId('dant-history-tab-link')).toHaveAttribute(
      'href',
      '/buyer/demand-anticipation-history'
    );
    // The Sample data badge stays above the tabs.
    expect(
      screen.getByTestId('sample-data-badge').compareDocumentPosition(screen.getByRole('tablist')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('?tab=consumption opens Record consumption', async () => {
    render('/buyer/demand-anticipation?tab=consumption');
    expect(await screen.findByTestId('consumption-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Record consumption' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByTestId('dant-publication')).toBeNull();
  });

  it('?supplier=&material= still filter the cards, on This week', async () => {
    render('/buyer/demand-anticipation?supplier=sup-002&material=RM-STEAR-7300');
    expect(await screen.findByTestId(`dant-card-${KEY}`)).toBeInTheDocument();
    expect(screen.getAllByTestId(/^dant-card-/)).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
    // Clearing the filters keeps the tab and drops only the filters.
    fireEvent.click(screen.getByTestId('dant-filters-clear'));
    expect(screen.getAllByTestId(/^dant-card-/).length).toBeGreaterThan(1);
    expect(screen.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render('/buyer/demand-anticipation');
    await screen.findByTestId(`dant-card-${KEY}`);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Minggu ini',
      'Catat pemakaian'
    ]);
  });
});
