// ─────────────────────────────────────────────────────────────────────────────
// B5 — RFP → RFQ (spec D3) and the review polish list.
//
//   · the `seedFromRfp` adapter over the existing `prefillRfqItemsFromRfp`;
//   · "Create RFQ from this RFP" — offered only where it can do something, and
//     landing on `/buyer/rfq?rfp=…&options=…`;
//   · the RFQ stores `sourceRfpId` and its event page says "Created from RFP-…";
//   · plurals ("1 proposal", "1 variant"), the eyebrow rule, tie honesty on the
//     Oslo comparison, the compact "Lowest" marker, the supplier card's clock
//     and its real evaluation criteria.
//
// The wizard half (landing pre-filled, sending, the stored `sourceRfpId`) is in
// `sourcing/RfqAuthoring.test.jsx`, beside the RFI pre-fill it mirrors.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route, useLocation } from 'react-router-dom';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { RFP_EVENT_SEED, RFP_RESPONSE_SEED } from '@services/data/mock/fixtures/rfxHub';
import { prefillRfqItemsFromRfp } from '@services/sourcing/rfxPrefill';
/** @import { QuoteScore } from '@lib/quoteScore' */
import { scoreStanding, compositeText } from '@lib/quoteScore';
import { daysUntil } from '@services/data/dayProjection';
import { obviousItemType, seedFromRfp } from '../sourcing/rfqDraft';
import { defaultEvaluationTierQty, topRankedOf } from '@services/sourcing/rfqComparison';
import { bestScoredByItem } from '@services/data/mock/rfxReadModel';
import BuyerRfp from '../BuyerRfp';
import BuyerRfi from '../BuyerRfi';
import BuyerRequisitions from '../BuyerRequisitions';
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import SupplierRFQs from '../SupplierRFQs';
import { rfxNow } from './rfxDisplay';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {CurrentIdentity} */
const RECEIVING = { ...BUYER, businessRoles: ['receiving'] };
const tundra = /** @type {import('../../services/sourcing/types').RfpEvent} */ (
  RFP_EVENT_SEED.find((e) => e.id === 'rfp-002')
);

// ── The adapter ─────────────────────────────────────────────────────────────

describe('seedFromRfp — the neutral RFP seed as the wizard draft', () => {
  const seed = seedFromRfp(
    prefillRfqItemsFromRfp(tundra, RFP_RESPONSE_SEED, ['opt-pump-cap', 'sup-opt-1']),
    'RFP-2026-002'
  );

  it('carries title, category, currency, responders, source and origin', () => {
    expect(seed.title).toBe('Tundra — open-spec bottle and pump');
    expect(seed.category).toBe('Packaging');
    expect(seed.currency).toBe('IDR');
    expect(seed.invitedSupplierIds).toEqual(['sup-007']);
    expect(seed.sourceRfpId).toBe('rfp-002');
    expect(seed.origin).toEqual({ kind: 'rfp', label: 'RFP-2026-002' });
  });

  it('each chosen option is an item (title plus detail, obvious type); the points are the breaks', () => {
    expect(seed.items?.map((i) => i.description)).toEqual([
      'Pump and cap only — PTI sources the bottle; you supply a matching pump and over-cap.',
      'Stock 150 ml bottle with 24/410 lotion pump — Our existing mould, so no bottle tooling cost; shape differs slightly from the reference.'
    ]);
    expect(seed.items?.map((i) => i.itemType)).toEqual(['bottleClosure', 'bottleClosure']);
    expect(seed.tiers).toEqual([
      { qty: 10_000, basis: 'total' },
      { qty: 50_000, basis: 'total' },
      { qty: 100_000, basis: 'total' }
    ]);
    expect(seed.totalQty).toBe('20000');
    expect(seed.uom).toBe('PCS');
  });

  it('a per-variant RFP keeps its basis (ICY points are per variant)', () => {
    const icy = /** @type {import('../../services/sourcing/types').RfpEvent} */ (
      RFP_EVENT_SEED.find((e) => e.id === 'rfp-003')
    );
    const s = seedFromRfp(prefillRfqItemsFromRfp(icy, [], ['opt-pack-1']), icy.eventNumber);
    expect(s.tiers).toEqual([
      { qty: 25_000, basis: 'perVariant' },
      { qty: 50_000, basis: 'perVariant' }
    ]);
    expect(s.items?.[0]?.itemType).toBe('unitBox');
    // Nobody answered ICY, so nobody is invited — never invented.
    expect(s.invitedSupplierIds).toEqual([]);
  });

  it('obviousItemType names only what the title says plainly — known-good and known-bad', () => {
    expect(obviousItemType('Oslo front sticker')).toBe('sticker');
    expect(obviousItemType('Secondary pack option 1: unit box, 3 colours + hot stamp')).toBe(
      'unitBox'
    );
    expect(obviousItemType('Redwood cap mould')).toBe('moldComponent');
    expect(obviousItemType('Full set: bottle, pump and cap')).toBe('bottleClosure');
    // Not obvious → Other, for the buyer to choose.
    expect(obviousItemType('Formula option 1: matte lip cream')).toBe('other');
    expect(obviousItemType('Secondary pack option 3: printed sleeve, 1 colour')).toBe('other');
    // "capacity" is not a cap.
    expect(obviousItemType('Extra capacity for Q3')).toBe('other');
  });
});

// ── The button on the RFP board ─────────────────────────────────────────────

/** @type {React.FC} */
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="at">{`${loc.pathname}${loc.search}`}</div>;
};

/** @param {CurrentIdentity} [identity] */
const renderBoard = (identity = BUYER_SEAT) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfp" element={<BuyerRfp />} />
      <Route path="/buyer/rfq" element={<LocationProbe />} />
    </Routes>,
    { identity, route: '/buyer/rfp' }
  );

describe('"Create RFQ from this RFP" on the board', () => {
  it('Tundra: pick "pump and cap only" and the supplier’s stock bottle, and land on the RFQ link', async () => {
    renderBoard();
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    const panel = await screen.findByTestId('rfp-to-rfq-rfp-002');
    // PTI's options and the one sup-007 proposed, the latter named as such.
    expect(within(panel).getByText('Pump and cap only')).toBeInTheDocument();
    expect(
      within(panel).getByText('Stock 150 ml bottle with 24/410 lotion pump')
    ).toBeInTheDocument();
    expect(panel).toHaveTextContent(/Proposed by PT Sample Packaging Indonesia/);
    // Nothing chosen: the button waits and says why.
    const button = within(panel).getByTestId('rfp-to-rfq-btn-rfp-002');
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByTestId('rfp-to-rfq-option-opt-pump-cap'));
    // PREMISE CHANGED (RFx D3, NR-2 BR-08): options travel by REF, so the
    // supplier's own `sup-opt-1` names its proposer (`sup-007:sup-opt-1`).
    fireEvent.click(within(panel).getByTestId('rfp-to-rfq-option-sup-007:sup-opt-1'));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(await screen.findByTestId('at')).toHaveTextContent(
      '/buyer/rfq?rfp=rfp-002&options=opt-pump-cap,sup-007%3Asup-opt-1'
    );
  });

  it('NO FALSE AFFORDANCE — no button on an RFP without options (rfp-001) or without a proposal (ICY, rfp-003)', async () => {
    renderBoard();
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-001'));
    await screen.findByTestId('rfp-detail-rfp-001');
    expect(screen.queryByTestId('rfp-to-rfq-rfp-001')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfp-open-rfp-003'));
    await screen.findByTestId('rfp-detail-rfp-003');
    expect(screen.queryByTestId('rfp-to-rfq-rfp-003')).not.toBeInTheDocument();
  });

  it('a seat without rfq:create reads whose act it is instead of a button', async () => {
    renderBoard(RECEIVING);
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    const panel = await screen.findByTestId('rfp-to-rfq-rfp-002');
    expect(within(panel).queryByTestId('rfp-to-rfq-btn-rfp-002')).not.toBeInTheDocument();
    expect(within(panel).getByTestId('handoff-rfp-to-rfq')).toBeInTheDocument();
  });
});

// ── The event page names its source ─────────────────────────────────────────

/** @param {string} rfqId */
const renderEvent = (rfqId) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` }
  );

describe('"Created from …" names every recorded source by its document number, linked', () => {
  /** @param {string} testId */
  const at = (testId) => screen.findByTestId(testId);
  /** @param {HTMLElement} el */
  const hrefOf = (el) => within(el).getByRole('link').getAttribute('href');

  it('sourceRfpId → RFP-2026-002, linked to the RFP board opened on it', async () => {
    rfqStore.update('rfq-021', (r) => ({ ...r, sourceRfpId: 'rfp-002' }));
    renderEvent('rfq-021');
    const el = await at('event-from-rfp');
    expect(el).toHaveTextContent('Created from RFP-2026-002');
    expect(hrefOf(el)).toBe('/buyer/rfp?open=rfp-002');
  });

  it('sourceRfiId → RFI-2026-002 (the number, not the internal id rfi-002), linked', async () => {
    rfqStore.update('rfq-021', (r) => ({ ...r, sourceRfiId: 'rfi-002' }));
    renderEvent('rfq-021');
    const el = await at('event-from-rfi');
    expect(el).toHaveTextContent('Created from RFI-2026-002');
    expect(el).not.toHaveTextContent('rfi-002');
    expect(hrefOf(el)).toBe('/buyer/rfi?open=rfi-002');
  });

  it('the requisition → PR-2026-00343, read from the PR that records this RFQ as its linked document', async () => {
    renderEvent('rfq-004');
    const el = await at('event-from-pr');
    expect(el).toHaveTextContent('Created from PR-2026-00343');
    expect(hrefOf(el)).toBe('/buyer/purchase-requisition?open=pr-003');
  });

  it('copiedFromRfqId → RFQ-2026-021, linked to its event page', async () => {
    rfqStore.update('rfq-022', (r) => ({ ...r, copiedFromRfqId: 'rfq-021' }));
    renderEvent('rfq-022');
    const el = await at('event-copied-from');
    expect(el).toHaveTextContent('Copied from RFQ-2026-021');
    expect(hrefOf(el)).toBe('/buyer/rfq/rfq-021');
  });

  it('templateId → the template’s name, with no link (no page shows a template)', async () => {
    rfqStore.update('rfq-022', (r) => ({ ...r, templateId: 'sys-sticker-roll-tiered' }));
    renderEvent('rfq-022');
    const el = await at('event-from-template');
    expect(el).toHaveTextContent('Started from the template “Sticker, roll, tiered”');
    expect(within(el).queryByRole('link')).toBeNull();
  });

  it('a source the reads cannot resolve still says what it claims, by id, unlinked', async () => {
    rfqStore.update('rfq-021', (r) => ({ ...r, sourceRfpId: 'rfp-999' }));
    renderEvent('rfq-021');
    const el = await at('event-from-rfp');
    expect(el).toHaveTextContent('Created from rfp-999');
    expect(within(el).queryByRole('link')).toBeNull();
  });

  it('KNOWN-BAD twin — an RFQ with no source says nothing', async () => {
    renderEvent('rfq-022');
    await screen.findByTestId('rfq-content');
    for (const id of [
      'event-from-rfi',
      'event-from-rfp',
      'event-from-pr',
      'event-copied-from',
      'event-from-template'
    ]) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }
  });

  it('the links land: ?open= opens the RFP, the RFI and the requisition', async () => {
    const { unmount } = renderWithProviders(<BuyerRfp />, {
      identity: BUYER_SEAT,
      route: '/buyer/rfp?open=rfp-002'
    });
    expect(await screen.findByTestId('rfp-detail-rfp-002')).toBeInTheDocument();
    unmount();
    const r2 = renderWithProviders(<BuyerRfi />, {
      identity: BUYER_SEAT,
      route: '/buyer/rfi?open=rfi-002'
    });
    expect(await screen.findByTestId('rfi-detail-rfi-002')).toBeInTheDocument();
    r2.unmount();
    renderWithProviders(<BuyerRequisitions />, {
      identity: BUYER_SEAT,
      route: '/buyer/purchase-requisition?open=pr-003'
    });
    expect(await screen.findByText('PR PR-2026-00343')).toBeInTheDocument();
  });
});

// ── Firm prices (D4) ────────────────────────────────────────────────────────

describe('every RFQ price is labelled Firm (D4) — the buyer comparison and the award table', () => {
  it('the per-item comparison and the award table carry the Firm tag', async () => {
    renderEvent('rfq-021');
    expect(await screen.findByTestId('item-cmp-firm-1')).toHaveTextContent('Firm');
    expect(screen.getByTestId('item-cmp-firm-2')).toHaveTextContent('Firm');
    expect(await screen.findByTestId('award-firm-1')).toHaveTextContent('Firm');
  });

  it('the supplier quote grid labels its prices per break Firm', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const oslo = within(await screen.findByTestId('rfq-card-rfq-021'));
    fireEvent.click(oslo.getByTestId('intent-respond-rfq-021'));
    fireEvent.click(await oslo.findByRole('button', { name: 'Submit quote' }));
    await screen.findByTestId('tiered-quote-form');
    expect(screen.getByTestId('grid-item-1-firm')).toHaveTextContent('Firm');
    expect(screen.getByTestId('grid-item-2-firm')).toHaveTextContent('Firm');
  });
});

// ── Plurals ─────────────────────────────────────────────────────────────────

describe('plurals — "1 proposal", never "1 proposals"', () => {
  it('the RFP board and comparison read the singular at one', async () => {
    renderBoard();
    const tundraRow = await screen.findByTestId('rfp-row-rfp-002');
    expect(tundraRow).toHaveTextContent('1 proposal');
    expect(tundraRow).not.toHaveTextContent('1 proposals');
    // …and the plural where there are several.
    expect(screen.getByTestId('rfp-row-rfp-001')).toHaveTextContent('3 proposals');
    fireEvent.click(screen.getByTestId('rfp-open-rfp-002'));
    const detail = await screen.findByTestId('rfp-detail-rfp-002');
    expect(detail).toHaveTextContent('1 deviation');
    expect(detail).not.toHaveTextContent('1 deviations');
  });

  it('the supplier card reads "1 variant" (Redwood)', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const redwood = await screen.findByTestId('rfq-items-rfq-023');
    expect(redwood).toHaveTextContent('1 variant ·');
    expect(redwood).not.toHaveTextContent('1 variants');
  });
});

// ── The eyebrow ─────────────────────────────────────────────────────────────

describe('the eyebrow does not repeat the title', () => {
  it('the RFP board reads "Sourcing", not "Sourcing · Proposal requests"', async () => {
    renderBoard();
    await screen.findByTestId('rfp-row-rfp-002');
    expect(screen.queryByText('Sourcing · Proposal requests')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Proposal requests');
  });

  it('the supplier RFQ page reads "Sourcing" alone — not "Sourcing · Acquire" or a stale page name', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER, route: '/supplier/rfq' });
    await screen.findByTestId('rfq-card-rfq-021');
    const eyebrow = /** @type {Element} */ (document.querySelector('.text-eyebrow'));
    expect(eyebrow.textContent).toBe('Sourcing');
  });
});

// ── Tie honesty ─────────────────────────────────────────────────────────────

/**
 * @param {string} quoteId
 * @param {number} exact
 * @returns {QuoteScore}
 */
const score = (quoteId, exact, topRanked = false) => ({
  quoteId,
  priceScore: 0,
  leadTimeScore: 0,
  reliabilityScore: 0,
  composite: Math.round(exact),
  compositeExact: exact,
  compositeLiveness: 'live',
  topRanked
});

describe('scoreStanding — one decimal when two scores round alike, "tied" only on a real tie', () => {
  it('72.0 against 71.6: one best, shown to one decimal', () => {
    const s = scoreStanding([score('a', 71.6), score('b', 72, true)]);
    expect(s).toEqual({ tiedIds: ['b'], oneDecimal: true });
    expect(compositeText(score('a', 71.6), s)).toBe('71.6');
  });
  it('a genuine tie names every tied quote', () => {
    expect(scoreStanding([score('a', 72, true), score('b', 72)]).tiedIds).toEqual(['a', 'b']);
  });
  it('KNOWN-GOOD — a clear winner keeps whole numbers', () => {
    const s = scoreStanding([score('a', 80, true), score('b', 71.6)]);
    expect(s).toEqual({ tiedIds: ['a'], oneDecimal: false });
    expect(compositeText(score('b', 71.6), s)).toBe('72');
  });
});

describe('a genuine tie has no single best to follow — the comparison and the award rule agree', () => {
  /** @param {QuoteScore[]} scores */
  const scored = (scores) => ({
    kind: /** @type {const} */ ('scored'),
    scores,
    basis: { currency: 'IDR', pins: [], homogeneous: true }
  });
  it('topRankedOf is null on an exact tie, and names the winner otherwise (known-good)', () => {
    expect(
      topRankedOf(/** @type {never} */ (scored([score('a', 72, true), score('b', 72)])))
    ).toBeNull();
    expect(
      topRankedOf(/** @type {never} */ (scored([score('a', 71.6), score('b', 72, true)])))
    ).toBe('b');
  });
  it('Oslo item 1 at the default break ties, so the award rule names no best for it', async () => {
    const oslo = /** @type {import('../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-021'));
    const byItem = bestScoredByItem(
      oslo,
      rfxNow(),
      /** @type {NonNullable<ReturnType<typeof defaultEvaluationTierQty>>} */ (
        defaultEvaluationTierQty(oslo)
      )
    );
    expect(byItem.get(1)).toBeNull();
    // …and the page shows the tie rather than a "Best scored" the numbers cannot explain.
    renderEvent('rfq-021');
    const item = await screen.findByTestId('item-cmp-1');
    expect(within(item).getAllByText('Tied for best').length).toBeGreaterThan(1);
    expect(within(item).queryByText('Best scored')).toBeNull();
    expect(within(item).getByTestId('item-score-note-1')).toHaveTextContent(
      'exactly the same weighted score'
    );
  });
});

describe('the Oslo comparison at 3,000 reads honestly', () => {
  it('the header table shows 71.6 and 72.0, one "Best scored", and the stated rule', async () => {
    renderEvent('rfq-021');
    const weighted = await screen.findByTestId('cmp-row-weighted');
    expect(weighted).toHaveTextContent('71.6');
    expect(weighted).toHaveTextContent('72.0');
    expect(screen.getByTestId('cmp-decimal-note')).toHaveTextContent(
      'Best scored follows the unrounded score'
    );
    const header = /** @type {HTMLTableSectionElement} */ (
      /** @type {HTMLTableElement} */ (weighted.closest('table')).querySelector('thead')
    );
    expect(within(/** @type {HTMLElement} */ (header)).getAllByText('Best scored')).toHaveLength(1);
  });

  it('"Lowest" is a compact marker with one legend line, and still reads in full to a screen reader', async () => {
    renderEvent('rfq-021');
    const item = await screen.findByTestId('item-cmp-1');
    const best = item.querySelectorAll('[data-best="true"]');
    expect(best.length).toBeGreaterThan(0);
    for (const cell of best) {
      expect(within(/** @type {HTMLElement} */ (cell)).getByText('Lowest')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
      expect(
        within(/** @type {HTMLElement} */ (cell)).getByText(/Lowest price at this break/)
      ).toHaveClass('sr-only');
    }
    expect(within(item).getByTestId('item-legend-1')).toHaveTextContent(
      'Lowest: the lowest unit price at that break'
    );
  });
});

// ── The supplier card ───────────────────────────────────────────────────────

describe('the supplier RFQ card', () => {
  it('counts the deadline on the hub clock, as the buyer pages do', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const oslo = await screen.findByTestId('rfq-card-rfq-021');
    const deadline = /** @type {import('../../data/mockRfqs').RFQ} */ (
      rfqStore.all().find((r) => r.id === 'rfq-021')
    ).responseDeadline;
    const days = /** @type {NonNullable<ReturnType<typeof daysUntil>>} */ (
      daysUntil(deadline, rfxNow())
    );
    expect(days).toBeGreaterThan(0);
    expect(oslo).toHaveTextContent(new RegExp(`${days} days (remaining|to deadline)`));
  });

  it('shows the REAL criteria — price 40, lead time 20, reliability 40, after the gate — and no invented ones', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const oslo = await screen.findByTestId('rfq-card-rfq-021');
    expect(oslo).toHaveTextContent('Price 40%');
    expect(oslo).toHaveTextContent('Lead time 20%');
    expect(oslo).toHaveTextContent('Reliability 40%');
    expect(within(oslo).getByTestId('rfq-eval-gate-rfq-021')).toHaveTextContent('compliance gate');
    expect(oslo).not.toHaveTextContent('Sustainability');
    expect(oslo).not.toHaveTextContent('Quality 25%');
  });
});
