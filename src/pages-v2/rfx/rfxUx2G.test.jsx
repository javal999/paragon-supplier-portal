// ─────────────────────────────────────────────────────────────────────────────
// RFx UX 2G — the proposal view on the RFP and RFI event pages (owner ruling
// 2026-10-20).
//
// A · tabs Overview · Compare · By supplier, default Compare once anything is
//     submitted (Overview before), kept in the URL (`?tab=`, `&supplier=`),
//     back/forward move between them, `?section=` selects the holding tab.
// B · Compare opens on a summary strip, best scored first (the score the page
//     already computes), and the invitee one-liner.
// C · the terms grid: "Show deviations only" (ON when anything deviates),
//     collapsible groups with their deviation counts, "Best" on comparable rows
//     (`bestValueIds`), lowest indicative price (`lowestIndicativePrices`).
//     RFI: "Show answers that differ" (OFF by default).
// D · By supplier: one supplier at a time, Previous / Next.
// F · list rows: one "Open" button, "N of M submitted".
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { RfpResponseView } from '@services/sourcing/views' */
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocation, useNavigate } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerRfxRoutes, { selectEventTab } from '@test/buyerRfxRoutes';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import {
  resetRfxStores,
  rfpIntentStore,
  rfpResponseStore
} from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfxEn, rfxId } from '@lib/i18n/rfx';
import {
  bestValueIds,
  comparableNumber,
  inviteeTally,
  lowestIndicativePrices,
  rfxTabOf
} from './rfxCompare';

/** @type {CurrentIdentity} */
const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Prints the location and offers Back / Forward, as the browser would. */
const HistoryProbe = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="loc">{`${loc.pathname}${loc.search}`}</span>
      <button type="button" data-testid="go-back" onClick={() => navigate(-1)}>
        back
      </button>
      <button type="button" data-testid="go-forward" onClick={() => navigate(1)}>
        forward
      </button>
    </div>
  );
};

/** @param {string} route */
const at = (route) =>
  renderWithProviders(
    <>
      <BuyerRfxRoutes />
      <HistoryProbe />
    </>,
    { identity: BUYER_SEAT, route }
  );

/** @returns {string} */
const activeTab = () =>
  screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')?.textContent ??
  '';

describe('A — the tabs, their default and the URL', () => {
  it('rfp-003 (ICY, 0 proposals) opens on Overview; Compare and By supplier say "No proposals yet"', async () => {
    at('/buyer/rfp/rfp-003');
    await screen.findByTestId('rfp-tab-overview');
    expect(activeTab()).toBe('Overview');
    await selectEventTab('Compare');
    expect(screen.getByTestId('rfp-tab-empty-compare')).toHaveTextContent('No proposals yet');
    await selectEventTab('By supplier');
    expect(screen.getByTestId('rfp-tab-empty-supplier')).toHaveTextContent('No proposals yet');
  });

  it('rfp-001 (3 proposals) opens on Compare, its count beside it', async () => {
    at('/buyer/rfp/rfp-001');
    await screen.findByTestId('rfp-tab-compare');
    expect(activeTab()).toBe('Compare3');
    expect(screen.queryByTestId('rfp-tab-overview')).not.toBeInTheDocument();
  });

  it('the tab and supplier are in the URL, and back / forward move between tabs', async () => {
    at('/buyer/rfp/rfp-001');
    await screen.findByTestId('rfp-tab-compare');
    await selectEventTab('Overview');
    expect(screen.getByTestId('loc')).toHaveTextContent('/buyer/rfp/rfp-001?tab=overview');
    fireEvent.click(screen.getByTestId('go-back'));
    expect(await screen.findByTestId('rfp-tab-compare')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('go-forward'));
    expect(await screen.findByTestId('rfp-tab-overview')).toBeInTheDocument();
    // A link straight to one supplier's proposal.
    at('/buyer/rfp/rfp-001?tab=supplier&supplier=sup-008');
    expect(await screen.findByTestId('rfp-supplier-terms-sup-008')).toBeInTheDocument();
  });

  it('?section= still lands on its section, on the tab that holds it', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const first = at('/buyer/rfp/rfp-001?section=rfp-event-invitees');
    expect(await screen.findByTestId('rfp-tab-overview')).toBeInTheDocument();
    expect(scroll.mock.contexts).toContain(document.getElementById('rfp-event-invitees'));
    first.unmount();
    at('/buyer/rfp/rfp-003?section=rfp-event-comparison');
    // No proposal on ICY: Compare is selected and says so.
    expect(await screen.findByTestId('rfp-tab-empty-compare')).toBeInTheDocument();
  });

  it('rfxTabOf — tab wins, then section, then the submitted count', () => {
    const sectionTab = /** @type {const} */ ({ 'x-invitees': 'overview' });
    expect(rfxTabOf({ tab: 'supplier', section: 'x-invitees', submitted: 3, sectionTab })).toBe(
      'supplier'
    );
    expect(rfxTabOf({ tab: null, section: 'x-invitees', submitted: 3, sectionTab })).toBe(
      'overview'
    );
    expect(rfxTabOf({ tab: 'nonsense', section: null, submitted: 1, sectionTab })).toBe('compare');
    expect(rfxTabOf({ tab: null, section: 'unknown', submitted: 0, sectionTab })).toBe('overview');
  });

  it('the "Jump to" nav lists only the active tab’s sections', async () => {
    at('/buyer/rfp/rfp-001');
    const nav = await screen.findByTestId('event-nav');
    expect(within(nav).getByTestId('event-nav-rfp-event-comparison')).toBeInTheDocument();
    expect(within(nav).queryByTestId('event-nav-rfp-event-invitees')).not.toBeInTheDocument();
    // The actions row stays above the tabs.
    expect(screen.getByTestId('rfp-actions-rfp-001')).toBeInTheDocument();
  });
});

describe('B — the summary strip on rfp-001', () => {
  it('one card per proposal, best weighted score first, with its facts', async () => {
    at('/buyer/rfp/rfp-001');
    const strip = await screen.findByTestId('rfp-summary-rfp-001');
    const order = within(strip)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-testid'));
    expect(order).toEqual(['rfp-card-sup-007', 'rfp-card-sup-015', 'rfp-card-sup-008']);
    const top = screen.getByTestId('rfp-card-sup-007');
    expect(within(top).getByTestId('rfp-card-sup-007-name')).toHaveTextContent(
      'PT Sample Packaging Indonesia'
    );
    expect(within(top).getByTestId('rfp-card-sup-007-score')).toHaveTextContent('82');
    expect(within(top).getByTestId('rfp-card-sup-007-deviations')).toHaveTextContent('0');
    expect(within(top).getByTestId('rfp-card-sup-007-lead')).toHaveTextContent('21 days');
    expect(within(top).getByTestId('rfp-card-sup-007-version')).toHaveTextContent(
      'Version 1 · submitted on'
    );
    expect(screen.getByTestId('rfp-card-sup-008-deviations')).toHaveTextContent('7');
    // "View proposal" opens By supplier on that supplier.
    fireEvent.click(screen.getByTestId('rfp-card-sup-015-view'));
    expect(await screen.findByTestId('rfp-supplier-terms-sup-015')).toBeInTheDocument();
    expect(screen.getByTestId('loc')).toHaveTextContent('tab=supplier&supplier=sup-015');
  });

  it('a priced RFP shows the lowest indicative price per option on the card (rfp-002)', async () => {
    at('/buyer/rfp/rfp-002');
    expect(await screen.findByTestId('rfp-card-sup-007-price-opt-full-set')).toHaveTextContent(
      /Lowest indicative price, Full set.*Rp 3\.900/
    );
  });

  it('the invitee one-liner counts the declined, and links to the Overview table', async () => {
    rfpIntentStore.add({
      id: 'rfpi-2g',
      eventId: 'rfp-001',
      supplierId: 'sup-013',
      intent: 'decline',
      reason: 'notOurProduct',
      text: 'Not our line.',
      at: sdcClock.now()
    });
    at('/buyer/rfp/rfp-001');
    const line = await screen.findByTestId('rfp-tally-rfp-001');
    expect(line).toHaveTextContent('4 invited · 3 submitted · 0 not started · 1 declined');
    fireEvent.click(line);
    expect(await screen.findByTestId('rfp-invitees-title-rfp-001')).toBeInTheDocument();
  });

  it('inviteeTally — submitted wins over intent; a draft is in progress', () => {
    expect(
      inviteeTally([
        { responseState: 'submitted', intent: null },
        { responseState: 'notStarted', intent: null },
        { responseState: 'draft', intent: null },
        {
          responseState: 'notStarted',
          intent: { intentId: 'i', intent: 'decline', reason: 'other', text: 'x', at: '2026-10-01' }
        }
      ])
    ).toEqual({ invited: 4, submitted: 1, inProgress: 1, notStarted: 1, declined: 1 });
  });
});

describe('C — the comparison grid', () => {
  it('"Show deviations only" is ON when a proposal deviates, and hides the rows nobody deviates on', async () => {
    at('/buyer/rfp/rfp-001');
    const toggle = await screen.findByTestId('rfp-only-deviations-rfp-001');
    expect(toggle).toBeChecked();
    expect(screen.queryByTestId('rfp-term-incoterms')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-term-priceBasis')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByTestId('rfp-term-incoterms')).toBeInTheDocument();
  });

  it('KNOWN-GOOD twin — with no deviation it is OFF and disabled, with the reason', async () => {
    rfpResponseStore.update('rfp-resp-004', (r) => ({
      ...r,
      answers: r.answers.map((a) => ({
        termId: a.termId,
        proposedValue: a.proposedValue,
        stance: /** @type {const} */ ('comply')
      }))
    }));
    at('/buyer/rfp/rfp-002');
    const toggle = await screen.findByTestId('rfp-only-deviations-rfp-002');
    expect(toggle).not.toBeChecked();
    expect(toggle).toBeDisabled();
    expect(screen.getByTestId('rfp-only-deviations-rfp-002-reason')).toHaveTextContent(
      'No proposal deviates from the terms sent.'
    );
  });

  it('groups collapse, with their deviation count in the header', async () => {
    at('/buyer/rfp/rfp-001');
    expect(await screen.findByTestId('rfp-group-count-price')).toHaveTextContent('3 deviations');
    expect(screen.getByTestId('rfp-group-count-payment')).toHaveTextContent('1 deviation');
    const toggle = screen.getByTestId('rfp-group-toggle-price');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('rfp-term-priceBasis')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByTestId('rfp-term-priceBasis')).toBeInTheDocument();
  });

  it('"Best" marks the lowest price and the shortest lead time, and nothing on a non-comparable row', async () => {
    at('/buyer/rfp/rfp-001');
    fireEvent.click(await screen.findByTestId('rfp-only-deviations-rfp-001'));
    expect(screen.getByTestId('rfp-best-priceBasis-sup-008')).toHaveTextContent('Best');
    expect(screen.queryByTestId('rfp-best-priceBasis-sup-007')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-best-leadTime-sup-015')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('rfp-term-incoterms')).queryByText('Best')
    ).not.toBeInTheDocument();
    // The supplier header row is sticky while the grid scrolls.
    expect(
      within(screen.getByTestId('rfp-grid-head')).getAllByRole('columnheader')[2]?.className
    ).toMatch(/sticky top-0/);
  });

  it('RFI: "Show answers that differ" is OFF by default and keeps only the questions answered differently', async () => {
    at('/buyer/rfi/rfi-001');
    const toggle = await screen.findByTestId('rfi-only-differ-rfi-001');
    expect(toggle).not.toBeChecked();
    // Both answered "packaging" for the categories; years differ (12 vs 7).
    expect(screen.getByTestId('rfi-answer-row-a-categories')).toBeInTheDocument();
    expect(screen.getByTestId('rfi-answer-row-b-years')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId('rfi-answer-row-a-categories')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfi-answer-row-b-years')).toBeInTheDocument();
  });
});

describe('C — bestValueIds and lowestIndicativePrices (pure)', () => {
  /** @param {readonly [string, string | undefined][]} pairs */
  const entries = (pairs) => pairs.map(([id, value]) => ({ id, value }));

  it('PASSES — the lowest price, the longest payment days, the longest validity (read in days)', () => {
    expect([
      ...(bestValueIds(
        'priceBasis',
        entries([
          ['a', '1480'],
          ['b', '1390'],
          ['c', '1520']
        ])
      ) ?? [])
    ]).toEqual(['b']);
    expect([
      ...(bestValueIds(
        'paymentTerms',
        entries([
          ['a', '60'],
          ['b', '45'],
          ['c', '60']
        ])
      ) ?? [])
    ]).toEqual(['a', 'c']);
    expect([
      ...(bestValueIds(
        'priceValidity',
        entries([
          ['a', '1 year'],
          ['b', '6 months']
        ])
      ) ?? [])
    ]).toEqual(['a']);
    expect(comparableNumber('priceValidity', '12 months')).toBe(360);
  });

  it('REFUSED — a non-comparable row has no marker (null), and no winner without two readable, different values', () => {
    expect(
      bestValueIds(
        'incoterms',
        entries([
          ['a', 'DDP'],
          ['b', 'FOB']
        ])
      )
    ).toBeNull();
    expect(
      bestValueIds(
        'custom-dosage',
        entries([
          ['a', '1.5'],
          ['b', '2']
        ])
      )
    ).toBeNull();
    expect(
      bestValueIds(
        'leadTime',
        entries([
          ['a', '21'],
          ['b', '21']
        ])
      )?.size
    ).toBe(0);
    expect(
      bestValueIds(
        'leadTime',
        entries([
          ['a', '21'],
          ['b', 'on request']
        ])
      )?.size
    ).toBe(0);
    // A validity with no unit is not read.
    expect(comparableNumber('priceValidity', '12')).toBeNull();
  });

  it('lowest indicative price per option × quantity, only where two suppliers differ', () => {
    /** @type {(id: string, prices: { optionId: string; qty: number; unitPrice: number }[]) => RfpResponseView} */
    const resp = (id, prices) =>
      /** @type {RfpResponseView} */ (
        /** @type {unknown} */ ({ id, pricing: { prices, proposedOptions: [] } })
      );
    const low = lowestIndicativePrices(
      [{ id: 'o1', title: 'One' }],
      [
        resp('r1', [
          { optionId: 'o1', qty: 10, unitPrice: 5 },
          { optionId: 'o1', qty: 50, unitPrice: 4 },
          { optionId: 'sup-opt-1', qty: 10, unitPrice: 1 }
        ]),
        resp('r2', [
          { optionId: 'o1', qty: 10, unitPrice: 6 },
          { optionId: 'o1', qty: 50, unitPrice: 4 }
        ])
      ]
    );
    expect([...(low.get('o1|10') ?? [])]).toEqual(['r1']);
    // Same price at 50: nothing to mark; a supplier's own option is never compared.
    expect(low.has('o1|50')).toBe(false);
    expect(low.has('sup-opt-1|10')).toBe(false);
  });
});

describe('D — By supplier, one at a time', () => {
  it('Previous / Next walk the strip order and stop at the ends', async () => {
    at('/buyer/rfp/rfp-001?tab=supplier');
    expect(await screen.findByTestId('rfp-supplier-terms-sup-007')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-supplier-step-prev')).toBeDisabled();
    expect(screen.getByTestId('rfp-supplier-step-position')).toHaveTextContent('1 of 3');
    fireEvent.click(screen.getByTestId('rfp-supplier-step-next'));
    expect(await screen.findByTestId('rfp-supplier-terms-sup-015')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfp-supplier-step-next'));
    expect(await screen.findByTestId('rfp-supplier-terms-sup-008')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-supplier-step-next')).toBeDisabled();
    // The proposal as sent: the comment on a deviation, the files, the versions.
    expect(screen.getByTestId('rfp-supplier-term-paymentTerms')).toHaveTextContent('Deviate');
    expect(screen.getByTestId('rfp-supplier-docs-sup-008')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-supplier-versions-sup-008-1')).toHaveTextContent('Version 1');
    fireEvent.click(screen.getByTestId('rfp-supplier-step-prev'));
    expect(await screen.findByTestId('rfp-supplier-terms-sup-015')).toBeInTheDocument();
  });

  it('RFI: the answers of one supplier by section', async () => {
    at('/buyer/rfi/rfi-001?tab=supplier&supplier=sup-008');
    const answers = await screen.findByTestId('rfi-supplier-answers-sup-008');
    expect(within(answers).getByTestId('rfi-supplier-answers-sup-008-b-years')).toHaveTextContent(
      '7'
    );
    expect(screen.getByTestId('rfi-supplier-step-position')).toHaveTextContent('2 of 2');
  });
});

describe('F — the list rows', () => {
  it('RFP: one "Open" per row and "N of M submitted"; Open on rfp-001 lands on Compare', async () => {
    at('/buyer/rfp');
    expect(await screen.findByTestId('rfp-submitted-rfp-001')).toHaveTextContent(
      '3 of 4 submitted'
    );
    const row = screen.getByTestId('rfp-row-rfp-001');
    expect(
      within(row)
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['Open']);
    fireEvent.click(screen.getByTestId('rfp-open-rfp-001'));
    expect(await screen.findByTestId('rfp-tab-compare')).toBeInTheDocument();
  });

  it('RFI: "2 of 3 submitted"; the string reads in Indonesian too', async () => {
    at('/buyer/rfi');
    expect(await screen.findByTestId('rfi-submitted-rfi-001')).toHaveTextContent(
      '2 of 3 submitted'
    );
    expect(rfxEn['rfx.list.submittedOf']).toBe('{{n}} of {{m}} submitted');
    expect(rfxId['rfx.list.submittedOf']).toBe('{{n}} dari {{m}} terkirim');
    expect(rfxEn).not.toHaveProperty(['rfx.rfp.compare']);
    expect(rfxId).not.toHaveProperty(['rfx.rfp.compare']);
  });
});

describe('RFX-D29 — "Best" on MOQ, allocation and OTIF (pure)', () => {
  /** @param {readonly [string, string | undefined][]} pairs */
  const entries = (pairs) => pairs.map(([id, value]) => ({ id, value }));
  /** @param {string} termId @param {readonly [string, string | undefined][]} pairs */
  const best = (termId, pairs) => [...(bestValueIds(termId, entries(pairs)) ?? [])];

  it('PASSES — moq: the lowest minimum order quantity, read in pieces', () => {
    expect(
      best('moq', [
        ['a', '10,000 pcs'],
        ['b', '5000 pieces'],
        ['c', '20000']
      ])
    ).toEqual(['b']);
    expect(comparableNumber('moq', '2 tons')).toBe(2000);
  });

  it('REFUSED — moq: an unreadable value, or one in another unit, gets no tag', () => {
    expect(
      best('moq', [
        ['a', '10,000 pcs'],
        ['b', 'to be agreed'],
        ['c', '5,000 pcs']
      ])
    ).toEqual(['c']);
    expect(comparableNumber('moq', '3 pallets')).toBeNull();
    // b is in kilograms: the row's common unit is pieces, so b is not tagged.
    expect(
      best('moq', [
        ['a', '10,000 pcs'],
        ['b', '100 kg'],
        ['c', '8,000 pcs']
      ])
    ).toEqual(['c']);
    // An even split between two units: no common unit, no tag.
    expect(
      best('moq', [
        ['a', '10,000 pcs'],
        ['b', '100 kg']
      ])
    ).toEqual([]);
  });

  it('PASSES — allocation: the most capacity per month, another period converted', () => {
    expect(comparableNumber('allocation', '400,000 pcs per month')).toBe(400_000);
    expect(comparableNumber('allocation', '100,000 pcs per week')).toBeCloseTo(428_571.43, 1);
    expect(
      best('allocation', [
        ['a', '400,000 pcs per month'],
        ['b', '100,000 pcs per week'],
        ['c', '350000']
      ])
    ).toEqual(['b']);
  });

  it('REFUSED — allocation: no number, an unknown unit or an unknown period gets no tag', () => {
    expect(comparableNumber('allocation', 'as available')).toBeNull();
    expect(comparableNumber('allocation', '400,000 boxes per month')).toBeNull();
    expect(comparableNumber('allocation', '50,000 pcs per batch')).toBeNull();
    expect(
      best('allocation', [
        ['a', '400,000 pcs per month'],
        ['b', 'as available'],
        ['c', '300,000 pcs per month']
      ])
    ).toEqual(['a']);
  });

  it('PASSES — otifCommitment: the highest percentage', () => {
    expect(
      best('otifCommitment', [
        ['a', '95%'],
        ['b', '98 %'],
        ['c', '90']
      ])
    ).toEqual(['b']);
  });

  it('REFUSED — otifCommitment: a value that is not a percentage gets no tag', () => {
    expect(comparableNumber('otifCommitment', 'best effort')).toBeNull();
    expect(comparableNumber('otifCommitment', '120%')).toBeNull();
    expect(comparableNumber('otifCommitment', '95 days')).toBeNull();
    expect(
      best('otifCommitment', [
        ['a', '95%'],
        ['b', 'best effort'],
        ['c', '97%']
      ])
    ).toEqual(['c']);
  });
});
