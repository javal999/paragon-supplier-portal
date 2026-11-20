import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import BuyerScorecard from './BuyerScorecard';
import { REJECTION_PENALTY_POINTS, supplierMeasure } from '@services/data/performanceRules';
import { masterMeasure, performanceInput } from '@services/data/mock/supplierMeasureReadModel';
import { sdcClock } from '@services/sdc';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerScorecard — four honest states', () => {
  it('data: renders the scorecard with wired reads', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(
      await screen.findByRole('heading', { name: 'Supplier performance' })
    ).toBeInTheDocument();
    // The default-selected supplier appears in both the selector option and the
    // identity hero — proof the scorecard read resolved and drove the page.
    expect((await screen.findAllByText('Sample Vitamins Co.')).length).toBeGreaterThan(0);
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerScorecard />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Supplier performance' })).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerScorecard />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerScorecard />, { identity: SUPPLIER });
    expect(await screen.findByText('No scorecards yet')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-E10-01 — the figures on this page are CALCULATED now.
//
// The default supplier (sup-007) has seven measured deliveries in the window,
// six met and one late, so the page must read 86% — a number that exists
// nowhere in any fixture and can only come from the rule. (It read 50% on two
// deliveries until BL-94 gave sup-007 four earlier on-time call-offs; the
// walkthrough pair's received call-off counts on its own id since BL-359.)
//
// ⚠️ **CFOT AND THE REJECTION COUNT WERE BOTH UNREACHABLE HERE AND ARE NOT ANY
// MORE, SO TWO LITERALS IN THIS BLOCK MOVED.** Until the purchase-order family
// was anchored to the declared present, every `confirmedDeliveryDate` in the
// fixture sat in 2025 — outside every period, YTD included — so `cfotAggregate`
// returned null for every supplier and the score was the OTIF number alone.
// The same re-anchor put `po-023`'s rejection inside the period. What the
// figures are is asserted below by ARITHMETIC over the three numbers the page
// itself renders, rather than by a fourth literal nobody can check.
// ────────────────────────────────────────────────────────────────────────────
describe('BuyerScorecard — calculated performance (REQ-E10-01)', () => {
  it('renders the calculated OTIF, the rejection count and a grade read from the score', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(
      await screen.findByRole('heading', { name: 'Supplier performance' })
    ).toBeInTheDocument();
    expect(await screen.findByTestId('scorecard-otif')).toHaveTextContent(
      'From 7 deliveries due in this period'
    );
    expect(await screen.findByText('86%')).toBeInTheDocument();
    // CFOT is measured now — over the orders whose confirmed date falls in the
    // period, which is the half of the assessment that had no reachable member.
    expect(await screen.findByTestId('scorecard-cfot')).toHaveTextContent(
      'From 3 orders due in this period'
    );
    expect(await screen.findByText('40%')).toBeInTheDocument();
    expect(await screen.findByTestId('scorecard-rejections')).toHaveTextContent(
      'Orders rejected: 1'
    );
    // ⚠️ THE SCORE IS CHECKED AGAINST THE PAGE'S OWN NUMBERS, not restated.
    // `assessmentScore` is the mean of what was measured less
    // REJECTION_PENALTY_POINTS per rejection, blended with the update
    // compliance the page shows (Material B3, weight 0.10) — so the letter
    // beside them cannot disagree with them without this line failing.
    expect(await screen.findByTestId('scorecard-update-compliance-value')).toHaveTextContent(
      'Update compliance 92%'
    );
    const delivery = Math.round((86 + 40) / 2) - 1 * REJECTION_PENALTY_POINTS;
    const expected = Math.round(0.9 * delivery + 0.1 * 92);
    expect(await screen.findByTestId('scorecard-grade')).toHaveTextContent(`${expected}/100`);
  });

  it('states the grade bands on screen, so the letter can be read back to the score', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(
      await screen.findByText(/Grades from the score: A 90\+ · B 80\+ · C 70\+ · D 0\+/)
    ).toBeInTheDocument();
  });

  it('offers the period chips, and the period is named in the page meta', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(await screen.findByText('Last 30 days')).toBeInTheDocument();
    expect(await screen.findByText('Last 90 days')).toBeInTheDocument();
    expect(await screen.findByText('This year')).toBeInTheDocument();
  });

  it('a supplier with nothing measured reads "No history", never 0%', async () => {
    renderWithProviders(<BuyerScorecard />);
    await screen.findByRole('heading', { name: 'Supplier performance' });
    // sup-006 has no call-offs at all, and its one order is confirmed for a
    // date still in the future — so NEITHER measure has history.
    fireEvent.change(screen.getByLabelText('Select supplier'), {
      target: { value: 'sup-006' }
    });
    await waitFor(() => expect(screen.getAllByText('No history').length).toBeGreaterThan(0));
    expect(screen.getByTestId('scorecard-cfot')).toHaveTextContent(
      'Nothing measured in this period yet.'
    );
  });

  it('⚠️ a MEASURED 0% is not "No history" — the distinction, on one page', async () => {
    // ⚠️ THE CONTRAST THIS PAGE COULD NOT DRAW UNTIL CFOT BECAME MEASURABLE.
    // The rule's whole point is that an unmeasured supplier is not the worst
    // performer in the room; that claim is only worth anything if a REAL zero
    // renders differently. sup-009's `PO-2025-00115` is confirmed inside the
    // period and its receipt arrived after that date — nothing was delivered on
    // time, which is 0%, not silence.
    renderWithProviders(<BuyerScorecard />);
    await screen.findByRole('heading', { name: 'Supplier performance' });
    fireEvent.change(screen.getByLabelText('Select supplier'), {
      target: { value: 'sup-009' }
    });
    await waitFor(() =>
      expect(screen.getByTestId('scorecard-cfot')).toHaveTextContent(
        'From 1 order due in this period'
      )
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Material B3 (AR-09, MR-2) — update compliance on the scorecard, and ONE score
// on both calculation paths: the mock read model (`masterMeasure`, which the
// supplier master, CR-15 and the invitee list read) and the page's
// `usePerformance`, which reads `getUpdateCompliance` and calls the same
// `supplierMeasure`.
// ────────────────────────────────────────────────────────────────────────────
describe('BuyerScorecard — update compliance (Material B3)', () => {
  it('both calculation paths give the same score for one supplier, and the compliance moved it', async () => {
    renderWithProviders(<BuyerScorecard />);
    // The default supplier (sup-007) over the default period, which is the master window.
    expect(await screen.findByTestId('scorecard-update-compliance-value')).toHaveTextContent(
      'Update compliance 92%'
    );
    const mock = masterMeasure('sup-007');
    expect(mock.updateCompliance?.pct).toBe(92);
    expect(await screen.findByTestId('scorecard-grade')).toHaveTextContent(`${mock.score}/100`);
    // Control: without compliance the same inputs score differently (B4's sample
    // history puts sup-007 at 92%, above its delivery score), so equality is not vacuous.
    const now = sdcClock.now();
    const deliveryOnly = supplierMeasure(
      'sup-007',
      { ...performanceInput(now), updateCompliance: undefined },
      '90d',
      now
    );
    expect(deliveryOnly.score).not.toBe(mock.score);
  });

  it('shows the 13-week strip with a state per week and the one-line definition', async () => {
    renderWithProviders(<BuyerScorecard />);
    const strip = await screen.findByTestId('scorecard-update-compliance-strip');
    await waitFor(() => expect(strip.querySelectorAll('li')).toHaveLength(13));
    const states = [...strip.querySelectorAll('li')].map((li) => li.getAttribute('data-state'));
    expect(states).toEqual(masterMeasure('sup-007').updateCompliance?.weeks.map((w) => w.state));
    expect(
      screen.getByText(/Share of the last 13 weekly stock updates made on time/)
    ).toBeInTheDocument();
  });

  it('MAT-R4 · the read is narrowed in the service: a supplier gets only its own row', async () => {
    const own = await mockDataService.suppliers.getUpdateCompliance({
      personaType: 'supplier',
      supplierId: 'sup-007'
    });
    expect(own.items.map((c) => c.supplierId)).toEqual(['sup-007']);
    const all = await mockDataService.suppliers.getUpdateCompliance({
      personaType: 'buyer',
      supplierId: null
    });
    expect(all.items.map((c) => c.supplierId)).toEqual(
      expect.arrayContaining(['sup-007', 'sup-002', 'sup-009'])
    );
    // Edge case 1 — a supplier with no material assigned reads "No history".
    expect(all.items.find((c) => c.supplierId === 'sup-004')?.pct).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Forecast UX phase 2, B6 (F-11, FUX-D2, FUX-D5) — the scorecard is the one
// supplier-evaluation page: it states its purpose, carries the one simulated-
// data banner, and says the basis of its "Delivered on the confirmed date".
// ────────────────────────────────────────────────────────────────────────────
describe('BuyerScorecard — purpose header, banner and measure basis (B6)', () => {
  it('renders the purpose header and the simulated-data banner, and no old "Sample data" label', async () => {
    renderWithProviders(<BuyerScorecard />, { route: '/buyer/scorecard' });
    const header = await screen.findByTestId('purpose-header');
    expect(header).toHaveAttribute('data-page', 'performance');
    expect(screen.getByTestId('purpose-decision')).toHaveTextContent(
      'Which suppliers to follow up this month.'
    );
    expect(screen.getByTestId('purpose-uses')).toHaveTextContent('Foresight commitments');
    expect(screen.getByTestId('purpose-uses')).toHaveAttribute('href', '/buyer/collaboration');
    expect(screen.getByTestId('purpose-next')).toHaveTextContent('Forecast quality');
    expect(screen.getByTestId('purpose-next')).toHaveAttribute('href', '/buyer/demand-forecast');
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.getByTestId('data-as-of')).toBeInTheDocument();
    // The old ProvenanceMarker label read exactly "Sample data" (rendered upper-case).
    expect(screen.queryByText('Sample data')).toBeNull();
  });

  it('keeps the screen-reader chart tables clipped inside their card, so they cannot widen the page at phone size', async () => {
    renderWithProviders(<BuyerScorecard />, { route: '/buyer/scorecard' });
    for (const id of ['scorecard-radar-table', 'scorecard-trend-table']) {
      const table = await screen.findByTestId(id);
      expect(table).toHaveClass('sr-only');
      // A table grows to its content despite `sr-only`; the card positions and clips it.
      const card = table.closest('section');
      expect(card).toHaveClass('relative');
      expect(card).toHaveClass('overflow-hidden');
    }
  });

  it('states the basis of "Delivered on the confirmed date" for the selected period', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(await screen.findByTestId('scorecard-cfot-basis')).toHaveTextContent(
      'By quantity, per order, last 90 days.'
    );
    fireEvent.click(screen.getByText('Last 30 days'));
    await waitFor(() =>
      expect(screen.getByTestId('scorecard-cfot-basis')).toHaveTextContent(
        'By quantity, per order, last 30 days.'
      )
    );
  });

  it('links to Supplier reliability for the plan-change measures', async () => {
    renderWithProviders(<BuyerScorecard />);
    const line = await screen.findByTestId('scorecard-reliability-link');
    expect(line).toHaveTextContent(
      'Plan-change measures behind the weekly plan → Supplier reliability'
    );
    expect(line.querySelector('a')).toHaveAttribute('href', '/buyer/reliability');
  });
});
