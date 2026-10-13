// ─────────────────────────────────────────────────────────────────────────────
// CAP-10 (BL-179) on the screen — the Demand anticipation page on fixture data:
// weeks 1 to 4 frozen by the seeded sample publication, "would be" after a new
// LTP (AC-01), the publish confirm naming the hub weeks and freezing the next
// horizon, the handoff notice for a seat without `forecast:publish` (AC-03),
// and both locales with the figure never abbreviated to "DA" (CAP-D10).
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { currentVersion } from '@services/data/mock/forecastReadModel';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { NO_PERSON } from '@context/noPerson';
import { formatDate, formatNumber } from '@lib/format';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
// sup-007 × PK-PETB-8802 — one supplier, so a raised LTP moves "would be" one for one.
const KEY = 'sup-007-PK-PETB-8802';
const WEEK2 = '2026-09-07';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
});

/** No figure, label or message reads "DA" — it labels Delivery Agreements (CAP-D10). */
const expectNoAbbreviation = () => expect(document.body.textContent ?? '').not.toMatch(/\bDA\b/);

describe('CAP-10 — the page opens frozen (the seeded sample publication)', () => {
  it('weeks W36 to W39 carry the lock and the frozen figure; W40 does not; the seed says it is a sample', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    for (const week of ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'])
      expect(within(card).getByTestId(`dant-week-${KEY}-${week}`)).toHaveAttribute(
        'data-frozen',
        'true'
      );
    expect(within(card).getByTestId(`dant-week-${KEY}-2026-09-28`)).not.toHaveAttribute(
      'data-frozen'
    );
    expect(within(card).getByTestId(`dant-figure-${KEY}-2026-09-07`)).toHaveAttribute(
      'data-frozen',
      'true'
    );
    expect(screen.getByTestId('dant-frozen-weeks')).toHaveTextContent('W36–W39');
    expect(screen.getByTestId('dant-latest-publication')).toHaveTextContent(/Sample publication/);
    expect(screen.getByTestId('sample-data-badge')).toBeInTheDocument();
    expectNoAbbreviation();
  });
});

describe('AC-01 — a new LTP raising week 2 by 10,000', () => {
  it('keeps the frozen figure and shows would be +10,000 beside it', async () => {
    // The seed froze week 2 at today's figure, before the new LTP.
    const seeded = demandAnticipationStore
      .all()[0]
      .entries.find(
        (e) => e.supplierId === 'sup-007' && e.materialCode === 'PK-PETB-8802' && e.week === WEEK2
      );
    expect(seeded).toBeDefined();
    const current = /** @type {import('@services/sdc/types').ForecastPublication} */ (
      currentVersion('packaging')
    );
    forecastVersionStore.add({
      ...current,
      publicationId: 'FC-PK-CAP10-PAGE',
      version: (current.version ?? 0) + 1,
      publishedAt: '2026-08-31T10:00:00.000Z',
      lines: current.lines.map((l) =>
        l.supplierId === 'sup-007' && l.materialCode === 'PK-PETB-8802' && l.periodBucket === WEEK2
          ? { ...l, forecastQty: l.forecastQty + 10_000 }
          : l
      )
    });
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const cell = await screen.findByTestId(`dant-figure-${KEY}-${WEEK2}`);
    const qty = /** @type {NonNullable<typeof seeded>} */ (seeded).qty;
    expect(cell).toHaveTextContent(formatNumber(qty));
    expect(screen.getByTestId(`dant-wouldbe-${KEY}-${WEEK2}`)).toHaveTextContent(
      `${formatNumber(qty + 10_000)} (+10,000)`
    );
  });
});

describe('Publish (BR-01, AC-02 shape) and AC-03', () => {
  it('the confirm names W40–W43; publishing freezes them and the button then says the horizon is frozen', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const button = await screen.findByTestId('dant-publish-button');
    expect(button).toHaveTextContent('Publish demand anticipation · W40–W43');
    fireEvent.click(button);
    const confirm = await screen.findByTestId('dant-publish-confirm');
    expect(within(confirm).getByTestId('dant-publish-confirm-body')).toHaveTextContent(
      `W40–W43 (${formatDate('2026-09-28')} – ${formatDate('2026-10-25')})`
    );
    fireEvent.click(within(confirm).getByTestId('dant-publish-commit'));
    await waitFor(() => expect(demandAnticipationStore.all()).toHaveLength(2));
    await waitFor(() =>
      expect(screen.getByTestId('dant-frozen-weeks')).toHaveTextContent('W36–W43')
    );
    expect(screen.getByTestId('dant-publish-button')).toBeDisabled();
    expect(screen.getByTestId('dant-publish-all-frozen')).toBeInTheDocument();
    // The newest publication is named, not the seed: both carry the same hub-clock
    // instant (the demo clock does not move), so the id breaks the tie.
    expect(screen.getByTestId('dant-latest-publication')).toHaveTextContent(/^Last published/);
  });

  it('AC-03 — a seat without forecast:publish sees the handoff notice instead of Publish', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: ROUTE
    });
    expect(await screen.findByTestId('handoff-demand-anticipation-publish')).toBeInTheDocument();
    expect(screen.queryByTestId('dant-publish-button')).toBeNull();
    // The figures still read: the notice gates the act, not the page.
    expect(screen.getByTestId(`dant-card-${KEY}`)).toBeInTheDocument();
  });

  it('control — the planner seat sees Publish and no handoff notice', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    expect(await screen.findByTestId('dant-publish-button')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-demand-anticipation-publish')).toBeNull();
  });
});

describe('both locales (CAP-D10)', () => {
  it('renders in Indonesian with every row label translated and no "DA"', async () => {
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
      const card = await screen.findByTestId(`dant-card-${KEY}`);
      expect(screen.getAllByText('Antisipasi permintaan').length).toBeGreaterThan(0);
      for (const label of [
        'Bagian stok PTI',
        'Bagian titik pemesanan ulang',
        'Jika dihitung ulang'
      ])
        expect(within(card).getByText(label)).toBeInTheDocument();
      expect(screen.getByTestId('dant-publish-button')).toHaveTextContent(
        'Publikasikan antisipasi permintaan · W40–W43'
      );
      expectNoAbbreviation();
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('control — the English labels, and the abbreviation check would catch a "DA"', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    for (const label of [
      'PTI stock share',
      'Reorder point share',
      'Would be',
      'Demand anticipation'
    ])
      expect(within(card).getByText(label)).toBeInTheDocument();
    expectNoAbbreviation();
    // The instrument fires: the same matcher on a text that carries the abbreviation.
    expect('Contract DA-2026-01').toMatch(/\bDA\b/);
  });

  it('a supplier persona reads no rows (the read is PTI only)', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, {
      identity: {
        personaType: 'supplier',
        supplierId: 'sup-007',
        supplierName: 'PT Sample Packaging Indonesia',
        businessRoles: SEEDED_SEAT_ROLES.supplier,
        actor: NO_PERSON
      },
      route: ROUTE
    });
    expect(await screen.findByTestId('dant-empty')).toBeInTheDocument();
    expect(screen.queryByTestId(`dant-card-${KEY}`)).toBeNull();
  });
});
