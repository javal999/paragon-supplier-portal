// ─────────────────────────────────────────────────────────────────────────────
// DRC-3 (BL-189) on the screen — the Demand anticipation history page on
// fixture data: the seeded publication with its stamp and parts, a superseded
// publication named, the filters (in the page address), the "Provisional"
// label, the link from the Demand anticipation page, who may see it [Owner
// A10], and both locales with the figure never abbreviated to "DA".
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { RULES_VERSION } from '@services/transitions/osipRules';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { NO_PERSON } from '@context/noPerson';
import BuyerDemandAnticipationHistory from './BuyerDemandAnticipationHistory';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const ROUTE = '/buyer/demand-anticipation-history';
const W36 = '2026-08-31';
// dap-0001 × sup-002 × RM-EMUL-9410 — the seeded publication, a 5-week horizon.
const EMUL = 'dap-0001-sup-002-RM-EMUL-9410';
const PET = 'dap-0001-sup-007-PK-PETB-8801';
/** @param {readonly string[]} roles */
const seat = (roles) => ({ ...BUYER, businessRoles: roles });

beforeEach(async () => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  callOffStore.reset();
  demandAnticipationStore.all();
  await i18n.changeLanguage('en');
});

/** No figure, label or message reads "DA" — it labels Delivery Agreements (CAP-D10). */
const expectNoAbbreviation = () => expect(document.body.textContent ?? '').not.toMatch(/\bDA\b/);

describe('the publications, with their stamp and parts', () => {
  it('lists the seeded publication per supplier × material, in force, with its rules version', async () => {
    renderWithProviders(<BuyerDemandAnticipationHistory />, {
      identity: seat(SEEDED_SEAT_ROLES.buyer),
      route: ROUTE
    });
    const card = await screen.findByTestId(`dah-card-${EMUL}`);
    expect(within(card).getByTestId(`dah-status-${EMUL}`)).toHaveTextContent('In force');
    expect(within(card).getByTestId(`dah-rules-${EMUL}`)).toHaveTextContent(RULES_VERSION);
    expect(within(card).getByTestId(`dah-published-${EMUL}`)).toHaveTextContent(
      'not attributed to a person'
    );
    expect(within(card).getByTestId(`dah-published-${EMUL}`)).toHaveTextContent(
      'Sample publication'
    );
    // The week's parts, in a WeekGrid: the figure of the planning week is stored.
    expect(within(card).getByTestId(`dah-grid-${EMUL}`)).toBeInTheDocument();
    expect(within(card).getByTestId(`dah-da-${EMUL}-${W36}`).textContent).toMatch(/\d/);
    expect(within(card).getByTestId(`dah-carry-${EMUL}`)).toHaveTextContent('Carried to W');
    expect(within(card).getByTestId(`dah-agreed-${EMUL}`)).toHaveTextContent('No');
    // Design rule 5 — built on [Default] A1, A2, A8b, A9.
    expect(screen.getByTestId('dah-provisional')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (A1, A2, A8b, A9)'
    );
    expectNoAbbreviation();
  });

  it('a re-published week shows the earlier publication as superseded, naming the new one', async () => {
    const res = await mockDataService.commands.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
      {
        transitionId: 't_demandanticipation_publish',
        entity: 'demandAnticipation',
        payload: { planningWeek: W36, agreedFirstOutside: ['sup-002|RM-EMUL-9410'] }
      }
    );
    expect(res.status, res.reason).toBe('done');
    renderWithProviders(<BuyerDemandAnticipationHistory />, { route: ROUTE });
    expect(await screen.findByTestId(`dah-status-${EMUL}`)).toHaveTextContent(
      'Superseded by dap-0002'
    );
    const now = screen.getByTestId('dah-card-dap-0002-sup-002-RM-EMUL-9410');
    expect(within(now).getByTestId('dah-agreed-dap-0002-sup-002-RM-EMUL-9410')).toHaveTextContent(
      'Yes'
    );
  });
});

describe('the filters', () => {
  it('supplier and material narrow the cards; a range with no publication says so', async () => {
    renderWithProviders(<BuyerDemandAnticipationHistory />, { route: ROUTE });
    await screen.findByTestId(`dah-card-${EMUL}`);
    expect(screen.getByTestId(`dah-card-${PET}`)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: 'sup-002' } });
    expect(screen.queryByTestId(`dah-card-${PET}`)).toBeNull();
    expect(screen.getByTestId(`dah-card-${EMUL}`)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: 'RM-STEAR-7300' } });
    expect(screen.queryByTestId(`dah-card-${EMUL}`)).toBeNull();
    expect(screen.getByTestId('dah-card-dap-0001-sup-002-RM-STEAR-7300')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dah-filters-clear'));
    expect(screen.getByTestId(`dah-card-${PET}`)).toBeInTheDocument();
    // A range that ends before the planning week holds nothing.
    fireEvent.change(screen.getByLabelText('Planning week to'), {
      target: { value: '2026-08-23' }
    });
    expect(screen.getByTestId('dah-empty')).toHaveTextContent(
      'No publication matches these filters'
    );
    // Nothing to export: the CSV export is off (and on again with rows).
    expect(screen.getByTestId('dah-export')).toBeDisabled();
    fireEvent.click(screen.getByTestId('dah-filters-clear'));
    expect(screen.getByTestId('dah-export')).toBeEnabled();
  });

  it('opens on the current week and 52 weeks back', async () => {
    renderWithProviders(<BuyerDemandAnticipationHistory />, { route: ROUTE });
    await screen.findByTestId(`dah-card-${EMUL}`);
    expect(screen.getByLabelText('Planning week from')).toHaveValue('2025-09-01');
    expect(screen.getByLabelText('Planning week to')).toHaveValue(W36);
    expect(screen.getByTestId('dah-range')).toHaveTextContent('52 weeks back');
  });
});

describe('who sees it [Owner A10]', () => {
  it.each([['planning'], ['procurement'], ['finance']])(
    'a %s seat sees the publications',
    async (role) => {
      renderWithProviders(<BuyerDemandAnticipationHistory />, {
        identity: seat([role]),
        route: ROUTE
      });
      expect(await screen.findByTestId(`dah-card-${EMUL}`)).toBeInTheDocument();
    }
  );

  it('a supplier, and a PTI seat with none of those roles, is told it is not available', async () => {
    renderWithProviders(<BuyerDemandAnticipationHistory />, { identity: SUPPLIER, route: ROUTE });
    expect(await screen.findByTestId('dah-refused')).toHaveTextContent(
      'Suppliers do not see PTI’s plan'
    );
    expect(screen.queryByTestId(`dah-card-${EMUL}`)).toBeNull();
  });

  it('a requisitioner seat is refused too', async () => {
    renderWithProviders(<BuyerDemandAnticipationHistory />, {
      identity: seat(['requisitioner']),
      route: ROUTE
    });
    expect(await screen.findByTestId('dah-refused')).toBeInTheDocument();
  });
});

describe('the way in and the locales', () => {
  it('the Demand anticipation page links to the history', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { route: '/buyer/demand-anticipation' });
    const link = await screen.findByTestId('dant-history-link');
    expect(link).toHaveTextContent('Publication history');
    expect(link.getAttribute('href')).toMatch(/demand-anticipation-history$/);
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandAnticipationHistory />, { route: ROUTE });
    expect(await screen.findByTestId(`dah-status-${EMUL}`)).toHaveTextContent('Berlaku');
    expect(screen.getByTestId('dah-provisional')).toHaveTextContent('Sementara');
    expectNoAbbreviation();
    await i18n.changeLanguage('en');
  });
});
