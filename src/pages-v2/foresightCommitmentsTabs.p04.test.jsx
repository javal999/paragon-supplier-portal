// ─────────────────────────────────────────────────────────────────────────────
// P-04 (IA-B05, IA-S03) — one Foresight commitments page per persona. The
// existing content is the first, default tab; the consolidation view that had
// its own page (/buyer/collaboration/responses, /supplier/forecasts/responses)
// is the second, says it reads the published sample plan, and keeps the
// deep-link params the first tab reads. The links to the separate pages are gone.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { sdcClock } from '@services/sdc';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import { incomingShipmentStore } from '@services/data/mock/stores/incomingShipmentStore';
import { forecastCollaborationEn, forecastCollaborationId } from '@lib/i18n/forecastCollaboration';
import BuyerCommitments from './BuyerCommitments';
import SupplierForecastCommitments from './SupplierForecastCommitments';

/** @type {CurrentIdentity} */
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const en = forecastCollaborationEn;

beforeEach(() => {
  sdcClock.reset();
  requirementResponseStore.reset();
  incomingShipmentStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

/** @param {string} name */
const tab = (name) => screen.getByRole('tab', { name });

describe('Buyer · Foresight commitments tabs (P-04, IA-B05)', () => {
  it('the default tab is the existing Commitments & gaps content; no link to the separate page', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER, route: '/buyer/collaboration' });
    const panel = await screen.findByTestId('fc-pti-gaps-tab');
    expect(within(panel).getByTestId('fc-exceptions')).toBeInTheDocument();
    expect(tab(en['fc.pti.pageTab.gaps'])).toHaveAttribute('aria-selected', 'true');
    expect(tab(en['fc.pti.pageTab.consolidation'])).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByTestId('fc-pti-consolidation-tab')).toBeNull();
    expect(document.querySelector('a[href*="/collaboration/responses"]')).toBeNull();
  });

  it('`?tab=consolidation` renders the consolidation page’s content, under a note naming the sample plan', async () => {
    renderWithProviders(<BuyerCommitments />, {
      identity: PLANNER,
      route: '/buyer/collaboration?tab=consolidation'
    });
    const panel = await screen.findByTestId('fc-pti-consolidation-tab');
    expect(tab(en['fc.pti.pageTab.consolidation'])).toHaveAttribute('aria-selected', 'true');
    expect(within(panel).getByTestId('fc-pti-consolidation-note')).toHaveTextContent(
      en['fc.pti.pageTab.consolidationNote']
    );
    // BuyerCollaboration's own content: the period bar and its plan summary.
    expect(await within(panel).findByTestId('sdc-period-bar')).toBeInTheDocument();
    expect(within(panel).getByText(/published lines · .* plan /)).toBeInTheDocument();
    expect(within(panel).getByText(/the review lane writes/i)).toBeInTheDocument();
    // Embedded: one page header, the host's. The old page title is not shown.
    expect(screen.queryByRole('heading', { name: 'Supplier Collaboration' })).toBeNull();
    expect(screen.queryByTestId('fc-pti-gaps-tab')).toBeNull();
  });

  it('switching tabs keeps the deep-link filters the first tab read (`material`, `supplier`)', async () => {
    renderWithProviders(<BuyerCommitments />, {
      identity: PLANNER,
      route: '/buyer/collaboration?tab=consolidation&material=RM-STEAR-7300&supplier=sup-002'
    });
    await screen.findByTestId('fc-pti-consolidation-tab');
    fireEvent.click(tab(en['fc.pti.pageTab.gaps']));
    await screen.findByTestId('fc-pti-gaps-tab');
    expect(screen.getByTestId('fc-material-filter')).toHaveValue('RM-STEAR-7300');
    expect(screen.getByTestId('fc-supplier-filter')).toHaveValue('sup-002');
    const ids = within(await screen.findByTestId('fc-exceptions'))
      .queryAllByTestId(/^fc-exception-/)
      .map((el) => String(el.getAttribute('data-testid')).replace('fc-exception-', ''));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => !id.startsWith('sup-002-RM-STEAR-7300-'))).toEqual([]);
    // And back again: the consolidation view renders on a click.
    fireEvent.click(tab(en['fc.pti.pageTab.consolidation']));
    expect(await screen.findByTestId('sdc-period-bar')).toBeInTheDocument();
  });

  it('the Indonesian tabs say the second reads the sample plan', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCommitments />, {
      identity: PLANNER,
      route: '/buyer/collaboration?tab=consolidation'
    });
    await screen.findByTestId('fc-pti-consolidation-tab');
    expect(tab(forecastCollaborationId['fc.pti.pageTab.consolidation'])).toHaveTextContent(
      'rencana sampel'
    );
    expect(tab(forecastCollaborationId['fc.pti.pageTab.gaps'])).toBeInTheDocument();
  });
});

describe('Supplier · Foresight commitments tabs (P-04, IA-S03)', () => {
  it('the default tab is the existing commitments content; no link to the separate page', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const panel = await screen.findByTestId('fc-sup-commitments-tab');
    expect(within(panel).getByTestId('fc-sup-material-PK-PETB-8801')).toBeInTheDocument();
    expect(tab(en['fc.sup.pageTab.commitments'])).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('fc-sup-responses-tab')).toBeNull();
    expect(document.querySelector('a[href*="/forecasts/responses"]')).toBeNull();
  });

  it('`?tab=responses` renders the responses page’s content, with its incoming-shipment action', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts?tab=responses'
    });
    const panel = await screen.findByTestId('fc-sup-responses-tab');
    expect(within(panel).getByTestId('fc-sup-responses-note')).toHaveTextContent(
      en['fc.sup.pageTab.responsesNote']
    );
    // SupplierForecasts' own content: its published lines and its sub-tabs.
    expect(await within(panel).findByTestId('sdcsup-lines')).toBeInTheDocument();
    expect(within(panel).getByText(/published line\(s\) · .* plan /)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('tab', { name: /Shipments/ }));
    fireEvent.click(await within(panel).findByRole('button', { name: /^Report shipment$/ }));
    await waitFor(() => expect(document.getElementById('sdcsup-ship-material')).not.toBeNull());
    // Embedded: the old page title is not shown.
    expect(screen.queryByRole('heading', { name: 'Forecast Commitments' })).toBeNull();
  });

  it('switching tabs keeps the deep-link `material` the first tab read', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts?tab=responses&material=PK-PETB-8802'
    });
    await screen.findByTestId('fc-sup-responses-tab');
    fireEvent.click(tab(en['fc.sup.pageTab.commitments']));
    await screen.findByTestId('fc-sup-commitments-tab');
    expect(screen.getByTestId('fc-material-filter')).toHaveValue('PK-PETB-8802');
    expect(screen.getByTestId('fc-sup-material-PK-PETB-8802')).toBeInTheDocument();
    expect(screen.queryByTestId('fc-sup-material-PK-PETB-8801')).toBeNull();
  });

  it('the Indonesian tabs say the second reads the sample plan', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts?tab=responses'
    });
    await screen.findByTestId('fc-sup-responses-tab');
    expect(tab(forecastCollaborationId['fc.sup.pageTab.responses'])).toHaveTextContent(
      'rencana sampel'
    );
  });
});
