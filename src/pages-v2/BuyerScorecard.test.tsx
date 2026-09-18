import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerScorecard from './BuyerScorecard';
import { REJECTION_PENALTY_POINTS } from '../services/data/performanceRules';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerScorecard — four honest states', () => {
  it('data: renders the scorecard with wired reads', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(await screen.findByText('Supplier Scorecard')).toBeInTheDocument();
    // The default-selected supplier appears in both the selector option and the
    // identity hero — proof the scorecard read resolved and drove the page.
    expect(
      (await screen.findAllByText('Sample Vitamins Co.')).length,
    ).toBeGreaterThan(0);
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerScorecard />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Supplier Scorecard')).not.toBeInTheDocument();
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
// The default supplier (sup-007) has two measured deliveries in the window,
// one met and one late, so the page must read 50% — a number that exists
// nowhere in any fixture and can only come from the rule.
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
    expect(await screen.findByText('Supplier Scorecard')).toBeInTheDocument();
    expect(await screen.findByTestId('scorecard-otif')).toHaveTextContent(
      'From 2 deliveries due in this period',
    );
    expect(await screen.findByText('50%')).toBeInTheDocument();
    // CFOT is measured now — over the orders whose confirmed date falls in the
    // period, which is the half of the assessment that had no reachable member.
    expect(await screen.findByTestId('scorecard-cfot')).toHaveTextContent(
      'From 3 orders due in this period',
    );
    expect(await screen.findByText('40%')).toBeInTheDocument();
    expect(await screen.findByTestId('scorecard-rejections')).toHaveTextContent(
      'Orders rejected: 1',
    );
    // ⚠️ THE SCORE IS CHECKED AGAINST THE PAGE'S OWN THREE NUMBERS, not restated.
    // `assessmentScore` is the mean of what was measured less
    // REJECTION_PENALTY_POINTS per rejection — so the letter beside them cannot
    // disagree with them without this line failing.
    const expected = Math.round((50 + 40) / 2) - 1 * REJECTION_PENALTY_POINTS;
    expect(await screen.findByTestId('scorecard-grade')).toHaveTextContent(`${expected}/100`);
  });

  it('states the grade bands on screen, so the letter can be read back to the score', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(
      await screen.findByText(/Grades from the score: A 90\+ · B 80\+ · C 70\+ · D 0\+/),
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
    await screen.findByText('Supplier Scorecard');
    // sup-006 has no call-offs at all, and its one order is confirmed for a
    // date still in the future — so NEITHER measure has history.
    fireEvent.change(screen.getByLabelText('Select supplier'), {
      target: { value: 'sup-006' },
    });
    await waitFor(() =>
      expect(screen.getAllByText('No history').length).toBeGreaterThan(0),
    );
    expect(screen.getByTestId('scorecard-cfot')).toHaveTextContent(
      'Nothing measured in this period yet.',
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
    await screen.findByText('Supplier Scorecard');
    fireEvent.change(screen.getByLabelText('Select supplier'), {
      target: { value: 'sup-009' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('scorecard-cfot')).toHaveTextContent(
        'From 1 order due in this period',
      ),
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
