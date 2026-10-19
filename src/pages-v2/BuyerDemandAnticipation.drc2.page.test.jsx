// ─────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) and DRC-4 (BL-190) on the screen — the Demand anticipation
// page on fixture data: the planning week published by the seeded sample
// publication, the horizon as the lead time, the new rows (safety order,
// carried in, surplus absorbed), the plan vs execution check with the
// "Provisional" label (A1, A2, A8b, A9), "would be" after a new LTP, publishing
// with the supplier's agreement to carry outside the horizon [Owner A8], the
// handoff notice, and both locales with the figure never abbreviated to "DA".
//
// Replaces the CAP-10 page suite (`BuyerDemandAnticipation.cap10.page.test.jsx`),
// whose fixed 4-week horizons, lock markers, stock and reorder point share rows
// and "next horizon" publish text DRC-2 BR-01/02 supersede.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { currentVersion } from '@services/data/mock/forecastReadModel';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { NO_PERSON } from '@context/noPerson';
import { formatNumber } from '@lib/format';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
// sup-007 × PK-PETB-8802 — one supplier, a 2-week horizon (14 days).
const KEY = 'sup-007-PK-PETB-8802';
const W36 = '2026-08-31';
const W37 = '2026-09-07';
// sup-002 × RM-EMUL-9410 — a 5-week horizon and a remainder to carry.
const EMUL = 'sup-002-RM-EMUL-9410';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  // The seed is computed at the first read: take it before a test moves the LTP.
  demandAnticipationStore.all();
});

/** No figure, label or message reads "DA" — it labels Delivery Agreements (CAP-D10). */
const expectNoAbbreviation = () => expect(document.body.textContent ?? '').not.toMatch(/\bDA\b/);

const readRows = async () =>
  (
    await mockDataService.procurement.getDemandAnticipation({
      personaType: 'buyer',
      supplierId: null,
      businessRoles: SEEDED_SEAT_ROLES.buyer
    })
  ).items;

/** @param {string} key */
const rowOf = async (key) => {
  const row = (await readRows()).find((r) => `${r.supplierId}-${r.materialCode}` === key);
  if (!row) throw new Error(`no row ${key}`);
  return row;
};

const raiseWeek2 = () => {
  const current = /** @type {import('@services/sdc/types').ForecastPublication} */ (
    currentVersion('packaging')
  );
  forecastVersionStore.add({
    ...current,
    publicationId: 'FC-PK-DRC2-PAGE',
    version: (current.version ?? 0) + 1,
    publishedAt: '2026-08-31T10:00:00.000Z',
    lines: current.lines.map((l) =>
      l.supplierId === 'sup-007' && l.materialCode === 'PK-PETB-8802' && l.periodBucket === W37
        ? { ...l, forecastQty: l.forecastQty + 10_000 }
        : l
    )
  });
};

describe('the page opens on the published planning week', () => {
  it('names W36, says it is published from the sample, and marks only the horizon weeks', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    expect(screen.getByTestId('dant-planning-week')).toHaveTextContent('W36');
    expect(screen.getByTestId('dant-publication-state')).toHaveTextContent(
      'published; today’s figures match'
    );
    expect(screen.getByTestId('dant-latest-publication')).toHaveTextContent(/Sample publication/);
    // DRC-2 BR-01 — the horizon is the 2-week lead time: W36 and W37 only.
    for (const week of [W36, W37])
      expect(within(card).getByTestId(`dant-week-${KEY}-${week}`)).toHaveAttribute(
        'data-published',
        'true'
      );
    expect(within(card).getByTestId(`dant-week-${KEY}-2026-09-14`)).not.toHaveAttribute(
      'data-in-horizon'
    );
    expect(within(card).getByTestId(`dant-figure-${KEY}-${W37}`)).toHaveAttribute(
      'data-published',
      'true'
    );
    expect(screen.getByTestId('sample-data-badge')).toBeInTheDocument();
    expectNoAbbreviation();
  });

  it('shows the new rows: safety order in week 1, and the rows in order', async () => {
    const row = await rowOf(KEY);
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const grid = await screen.findByTestId(`dant-grid-${KEY}`);
    const labels = within(grid)
      .getAllByRole('rowheader')
      .map((h) => h.textContent ?? '');
    const at = (/** @type {string} */ name) => labels.findIndex((l) => l.startsWith(name));
    expect(at('Safety order')).toBeGreaterThan(at('LTP'));
    expect(at('Carried in')).toBe(at('Safety order') + 1);
    expect(at('Demand anticipation')).toBe(at('Carried in') + 1);
    expect(at('Would be')).toBe(at('Demand anticipation') + 1);
    expect(at('Surplus absorbed')).toBe(at('Would be') + 1);
    expect(at('PTI stock share')).toBe(-1);
    expect(within(grid).getByTestId(`dant-safety-${KEY}-${W36}`)).toHaveTextContent(
      formatNumber(row.plan.safetyOrder)
    );
    expect(within(grid).getByTestId(`dant-figure-${KEY}-${W36}`)).toHaveTextContent(
      formatNumber(/** @type {number} */ (row.weeks[0].qty))
    );
  });
});

describe('DRC-4 — the plan vs execution check on each card', () => {
  it('shows Total demand anticipation, ROP Order, SOH + OSPO + OSPR + PR, the gap and the result', async () => {
    const { plan } = await rowOf(KEY);
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const check = await screen.findByTestId(`dant-check-${KEY}`);
    expect(within(check).getByTestId(`dant-check-horizon-${KEY}`)).toHaveTextContent(
      '2 weeks · W36–W37'
    );
    expect(within(check).getByTestId(`dant-check-total-${KEY}`)).toHaveTextContent(
      formatNumber(plan.totalDa)
    );
    expect(within(check).getByTestId(`dant-check-rop-${KEY}`)).toHaveTextContent(
      `${formatNumber(plan.ropOrder)} (cycle stock ${formatNumber(plan.cycleStock)} + safety order ${formatNumber(plan.safetyOrder)})`
    );
    expect(within(check).getByTestId(`dant-check-supply-${KEY}`)).toHaveTextContent(
      `${formatNumber(plan.supply)} (${formatNumber(plan.soh)} + ${formatNumber(plan.ospo)} + 0 + ${formatNumber(plan.pr)})`
    );
    expect(within(check).getByTestId(`dant-check-gap-${KEY}`)).toHaveTextContent(
      formatNumber(plan.gap)
    );
    expect(within(check).getByTestId(`dant-check-result-${KEY}`)).toHaveTextContent('Balanced');
    // Design rule 5 — built on [Default] A1, A2, A8b and A9.
    expect(within(check).getByTestId(`dant-check-provisional-${KEY}`)).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (A1, A2, A8b, A9)'
    );
    // The data the hub does not hold is named, not hidden.
    const flags = within(check).getByTestId(`dant-check-flags-${KEY}`);
    expect(flags).toHaveTextContent('OSPR counts 0');
    expect(flags).toHaveTextContent('No carry-over limit applied');
  });

  it('a surplus reads as absorbed in the last week, with what that week cannot take', async () => {
    const key = 'sup-007-PK-PETB-8801';
    const { plan } = await rowOf(key);
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const check = await screen.findByTestId(`dant-check-${key}`);
    expect(within(check).getByTestId(`dant-check-result-${key}`)).toHaveTextContent(
      `Surplus: ${formatNumber(plan.absorbedLastWeek)} absorbed in W37; ${formatNumber(plan.unabsorbed)} more than that week can take`
    );
    expect(screen.getByTestId(`dant-absorbed-${key}-${W37}`)).toHaveTextContent(
      `−${formatNumber(plan.absorbedLastWeek)} supply above demand anticipation`
    );
  });

  it('a shortfall reads as a PR recommendation in warning tone; the hub posts nothing', async () => {
    // At W37 the W36 remainder of sup-005 × RM-EMUL-9410 is carried into its
    // horizon, so the total exceeds ROP Order and the supply behind it.
    sdcClock.set('2026-09-08T03:00:00.000Z');
    const key = 'sup-005-RM-EMUL-9410';
    const { plan } = await rowOf(key);
    expect(plan.gap).toBeGreaterThan(0);
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const result = await screen.findByTestId(`dant-check-result-${key}`);
    expect(result).toHaveTextContent(
      `Shortfall: recommend a PR of ${formatNumber(plan.prRecommendation)} (raise it in SAP)`
    );
    expect(result.querySelector('[data-tone="warning"]')).not.toBeNull();
    expect(screen.getByTestId(`dant-check-source-${key}`)).toHaveTextContent(
      'W37 · today’s figures, not published'
    );
  });
});

describe('"would be" and publishing', () => {
  it('a new LTP keeps the published figure, shows would be +10,000, and says the week changed', async () => {
    const before = (await rowOf(KEY)).weeks[1];
    raiseWeek2();
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    expect(await screen.findByTestId(`dant-figure-${KEY}-${W37}`)).toHaveTextContent(
      formatNumber(/** @type {number} */ (before.published))
    );
    expect(screen.getByTestId(`dant-wouldbe-${KEY}-${W37}`)).toHaveTextContent(
      `${formatNumber(/** @type {number} */ (before.published) + 10_000)} (+10,000)`
    );
    expect(screen.getByTestId('dant-publication-state')).toHaveTextContent(
      'published; 1 supplier × material differs from today’s figures'
    );
  });

  it('with nothing changed the confirm’s commit is off; ticking an agreement turns it on', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const button = await screen.findByTestId('dant-publish-button');
    expect(button).toHaveTextContent('Publish demand anticipation · W36');
    fireEvent.click(button);
    const confirm = await screen.findByTestId('dant-publish-confirm');
    expect(within(confirm).getByTestId('dant-publish-commit')).toBeDisabled();
    fireEvent.click(within(confirm).getByTestId('dant-agree-sup-002-RM-EMUL-9410'));
    expect(within(confirm).getByTestId('dant-publish-commit')).not.toBeDisabled();
  });

  it('[Owner A8] publishing the agreement moves that remainder to the first week after the horizon', async () => {
    const before = (await rowOf(EMUL)).plan;
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    expect(await screen.findByTestId(`dant-carry-${EMUL}`)).toHaveTextContent(
      `${formatNumber(before.remainder)} carried to W40 (last week of the horizon)`
    );
    fireEvent.click(screen.getByTestId('dant-publish-button'));
    const confirm = await screen.findByTestId('dant-publish-confirm');
    const option = within(confirm).getByTestId('dant-agree-sup-002-RM-EMUL-9410');
    expect(option.closest('li')).toHaveTextContent(
      `${formatNumber(before.remainder)} to W41 instead of W40`
    );
    fireEvent.click(option);
    fireEvent.click(within(confirm).getByTestId('dant-publish-commit'));
    await waitFor(() => expect(demandAnticipationStore.all()).toHaveLength(2));
    expect(demandAnticipationStore.all()[1].agreedFirstOutside).toEqual(['sup-002|RM-EMUL-9410']);
    await waitFor(() =>
      expect(screen.getByTestId(`dant-carry-${EMUL}`)).toHaveTextContent(
        `${formatNumber(before.remainder)} carried to W41 (first week after the horizon, supplier agreed)`
      )
    );
    expect(screen.getByTestId('dant-latest-publication')).toHaveTextContent(/^Last published/);
  });

  it('a seat without forecast:publish sees the handoff notice instead of Publish', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: ROUTE
    });
    expect(await screen.findByTestId('handoff-demand-anticipation-publish')).toBeInTheDocument();
    expect(screen.queryByTestId('dant-publish-button')).toBeNull();
    expect(screen.getByTestId(`dant-check-${KEY}`)).toBeInTheDocument();
  });

  it('control — the planner seat sees Publish and no handoff notice', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    expect(await screen.findByTestId('dant-publish-button')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-demand-anticipation-publish')).toBeNull();
  });
});

describe('both locales (CAP-D10)', () => {
  it('renders in Indonesian with the new rows, the check and the label, and no "DA"', async () => {
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
      const card = await screen.findByTestId(`dant-card-${KEY}`);
      expect(screen.getAllByText('Antisipasi permintaan').length).toBeGreaterThan(0);
      for (const label of ['Sisa dibawa masuk', 'Jika dihitung ulang', 'Kelebihan diserap'])
        expect(within(card).getByText(label)).toBeInTheDocument();
      expect(within(card).getByText('Rencana vs eksekusi')).toBeInTheDocument();
      expect(screen.getByTestId(`dant-check-provisional-${KEY}`)).toHaveTextContent(
        'Sementara: aturan menunggu Material Planning (A1, A2, A8b, A9)'
      );
      expect(screen.getByTestId('dant-publish-button')).toHaveTextContent(
        'Publikasikan antisipasi permintaan · W36'
      );
      expectNoAbbreviation();
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('control — the abbreviation check would catch a "DA"', () => {
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
