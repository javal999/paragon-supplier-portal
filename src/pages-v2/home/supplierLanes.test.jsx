import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { QueryScope } from '@services/data/types' */
/** @import { AwardRecord } from '@services/sourcing/types' */
/** @import { NegotiationRoundView } from '@services/sourcing/views' */
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { awardStore, resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { supplierSourcingQueue } from '@services/sourcing/supplierOutcome';
import { groupTasksByLane } from './TaskList';
import SupplierHome from '../SupplierHome';

// ─────────────────────────────────────────────────────────────────────────────
// RFx UX X-02 (owner ruling Q5) — the supplier To do grouped by lane, each lane
// ordered by deadline, Sourcing rows naming the event and the days left; and
// S-04 (owner ruling Q3) — the award row, shown from the moment it is recorded,
// with the note that the purchase order follows from SAP.
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

/**
 * @param {string} supplierId
 * @returns {CurrentIdentity}
 */
const seat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  supplierName: supplierId,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});

/**
 * @param {string} id
 * @param {string} lane
 * @param {string | null} deadline
 * @param {{ severity?: 'critical' | 'warning' | 'info' | 'none'; count?: number }} [opts]
 */
const task = (id, lane, deadline, opts = {}) => ({
  id,
  label: id,
  count: opts.count ?? 1,
  severity: opts.severity ?? 'info',
  to: '/',
  lane,
  deadline
});

const LANES = [
  { id: 'orders', label: 'Orders' },
  { id: 'sourcing', label: 'Sourcing' }
];

describe('groupTasksByLane — lanes in the given order, each lane by deadline', () => {
  it('orders a lane by its oldest deadline, not by severity or count', () => {
    const groups = groupTasksByLane(
      [
        task('late', 'sourcing', '2026-10-25', { severity: 'critical', count: 9 }),
        task('soon', 'sourcing', '2026-10-21'),
        task('asn', 'orders', '2026-11-01')
      ],
      LANES
    );
    expect(groups.map((g) => g.lane.id)).toEqual(['orders', 'sourcing']);
    expect(groups[1]?.tasks.map((t) => t.id)).toEqual(['soon', 'late']);
  });

  it('puts an undated row after every dated one, and a "none" row (money owed) last', () => {
    const groups = groupTasksByLane(
      [
        task('owed', 'sourcing', null, { severity: 'none' }),
        task('undated', 'sourcing', null, { severity: 'warning' }),
        task('dated', 'sourcing', '2026-12-01')
      ],
      LANES
    );
    expect(groups[0]?.tasks.map((t) => t.id)).toEqual(['dated', 'undated', 'owed']);
  });

  it('KNOWN-BAD twin — drops empty lanes and zero rows, and keeps a row naming no lane', () => {
    const groups = groupTasksByLane(
      [task('zero', 'orders', '2026-10-21', { count: 0 }), task('stray', 'nowhere', null)],
      LANES
    );
    expect(groups.map((g) => g.lane.id)).toEqual(['']);
    expect(groups[0]?.tasks.map((t) => t.id)).toEqual(['stray']);
  });
});

describe('supplierSourcingQueue — the count the To do and the menu share', () => {
  /**
   * @param {boolean} closed
   * @param {number} awaiting
   * @returns {NegotiationRoundView}
   */
  const round = (closed, awaiting) =>
    /** @type {NegotiationRoundView} */ (
      /** @type {unknown} */ ({ id: 'nr-x', rfqId: 'rfq-x', closed, awaiting })
    );
  const queue = (/** @type {NegotiationRoundView[]} */ rounds) =>
    supplierSourcingQueue({ rfqs: [], rfis: [], rfps: [], rounds, supplierId: 'sup-007' })
      .openRounds;

  it('an open round still awaiting this supplier counts', () => {
    expect(queue([round(false, 1)])).toHaveLength(1);
  });

  it('KNOWN-BAD twin — an answered or closed round does not', () => {
    expect(queue([round(false, 0), round(true, 1)])).toHaveLength(0);
  });
});

describe('Supplier Home — the To do grouped by lane (X-02)', () => {
  it('renders lane sections in Orders · Stock · Sourcing · Forecast order, money last', async () => {
    renderWithProviders(<SupplierHome />, { identity: seat('sup-007'), route: '/supplier/home' });
    const sourcing = await screen.findByTestId('home-lane-sourcing');
    await screen.findByTestId('home-lane-forecast');
    const order = [...document.querySelectorAll('[data-testid^="home-lane-"]')].map((el) =>
      el.getAttribute('data-testid')
    );
    const expected = ['orders', 'stock', 'sourcing', 'forecast', 'money']
      .map((id) => `home-lane-${id}`)
      .filter((id) => order.includes(id));
    expect(order).toEqual(expected);
    expect(order[order.length - 1]).toBe('home-lane-money');
    // The sourcing rows sit under the Sourcing header, not among stock rows.
    expect(within(sourcing).getByText('Sourcing')).toBeInTheDocument();
    expect(within(sourcing).getByTestId('home-task-revised-quote')).toBeInTheDocument();
  });

  it('a Sourcing row names its nearest event and the days left', async () => {
    renderWithProviders(<SupplierHome />, { identity: seat('sup-007'), route: '/supplier/home' });
    expect(await screen.findByTestId('home-task-detail-revised-quote')).toHaveTextContent(
      'RFQ-2026-014 · 2 days left'
    );
  });
});

describe('Supplier Home — the award row (S-04)', () => {
  it('the awarded supplier reads "Awarded to you · <RFQ> · <share>" and the SAP note', async () => {
    renderWithProviders(<SupplierHome />, { identity: seat('sup-015'), route: '/supplier/home' });
    const row = await screen.findByTestId('home-task-awarded-rfq-rfq-015');
    expect(row).toHaveTextContent('Awarded to you · RFQ-2026-015 · 70% of item 1');
    expect(row).toHaveTextContent('The purchase order follows from SAP');
    expect(
      within(screen.getByTestId('home-lane-sourcing')).getByTestId('home-task-awarded-rfq-rfq-015')
    ).toBeInTheDocument();
  });

  it('KNOWN-BAD twin — a supplier told "not awarded" gets no award row', async () => {
    renderWithProviders(<SupplierHome />, { identity: seat('sup-007'), route: '/supplier/home' });
    await screen.findByTestId('home-lane-sourcing');
    expect(screen.queryByTestId('home-task-awarded-rfq-rfq-015')).toBeNull();
  });

  it('a withdrawn award leaves the To do', async () => {
    /** @type {QueryScope} */
    const buyer = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: PERSONA_SYSTEM_ROLES.buyer,
      actor: NO_PERSON
    };
    const award = /** @type {AwardRecord} */ (
      awardStore.all().find((a) => a.eventId === 'rfq-015')
    );
    const res = await new MockCommandService().dispatch(buyer, {
      transitionId: 't_rfq_award_cancel',
      entity: 'rfq',
      entityId: 'rfq-015',
      payload: { awardId: award.id, cancelReason: 'Wrong split entered.' }
    });
    expect(res.status, res.reason).toBe('done');
    renderWithProviders(<SupplierHome />, { identity: seat('sup-015'), route: '/supplier/home' });
    // Population control: the award read has arrived (sup-015's seeded share
    // of rfq-024 still stands), so the absence below is not a loading gap.
    await screen.findByTestId('home-task-awarded-rfq-rfq-024');
    expect(screen.queryByTestId('home-task-awarded-rfq-rfq-015')).toBeNull();
  });
});
