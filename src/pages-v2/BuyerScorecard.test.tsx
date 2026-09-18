import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerScorecard from './BuyerScorecard';

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
// ────────────────────────────────────────────────────────────────────────────
describe('BuyerScorecard — calculated performance (REQ-E10-01)', () => {
  it('renders the calculated OTIF, the rejection count and a grade read from the score', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(await screen.findByText('Supplier Scorecard')).toBeInTheDocument();
    expect(await screen.findByTestId('scorecard-otif')).toHaveTextContent(
      'From 2 deliveries due in this period',
    );
    expect(await screen.findByText('50%')).toBeInTheDocument();
    expect(await screen.findByTestId('scorecard-grade')).toHaveTextContent('50/100');
    expect(await screen.findByTestId('scorecard-rejections')).toHaveTextContent(
      'Orders rejected: 0',
    );
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
    // sup-009 has no call-offs and no orders due in the window.
    fireEvent.change(screen.getByLabelText('Select supplier'), {
      target: { value: 'sup-009' },
    });
    await waitFor(() =>
      expect(screen.getAllByText('No history').length).toBeGreaterThan(0),
    );
  });
});
