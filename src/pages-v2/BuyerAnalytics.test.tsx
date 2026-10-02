import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import BuyerAnalytics from './BuyerAnalytics';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerAnalytics — four honest states', () => {
  it('data: renders the analytics workspace with wired reads', async () => {
    renderWithProviders(<BuyerAnalytics />);
    expect(
      await screen.findByText('Analytics & Procurement Intelligence'),
    ).toBeInTheDocument();
    // A performance-table row proves the supplier-performance read resolved.
    expect(await screen.findByText('Sample Vitamins Co.')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerAnalytics />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(
      screen.queryByText('Analytics & Procurement Intelligence'),
    ).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerAnalytics />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerAnalytics />, { identity: SUPPLIER });
    expect(await screen.findByText('No analytics yet')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-E10-01 — the OTIF column and the portfolio card are CALCULATED.
// ────────────────────────────────────────────────────────────────────────────
describe('BuyerAnalytics — calculated performance (REQ-E10-01)', () => {
  it('each supplier row reads its own measured OTIF, and an unmeasured one reads "No history"', async () => {
    renderWithProviders(<BuyerAnalytics />);
    await screen.findByText('Analytics & Procurement Intelligence');
    // sup-007: six measured deliveries in the window, five met → 83% (BL-94).
    expect(await screen.findByTestId('analytics-otif-sup-007')).toHaveTextContent('83%');
    // sup-009: nothing measured → the sentence, never a zero.
    expect(await screen.findByTestId('analytics-otif-sup-009')).toHaveTextContent(
      'No history',
    );
  });

  it('the portfolio OTIF is computed for the period, not an authored string', async () => {
    renderWithProviders(<BuyerAnalytics />);
    expect(await screen.findByTestId('analytics-portfolio-otif')).toHaveTextContent(
      'deliveries due in this period',
    );
  });

  it('the grade bands and the sample columns are stated on screen', async () => {
    renderWithProviders(<BuyerAnalytics />);
    expect(await screen.findByTestId('perf-grade-bands')).toHaveTextContent(
      'Grades from the score: A 90+ · B 80+ · C 70+ · D 0+',
    );
    expect(
      await screen.findByText(/On-time delivery rate, reply speed and invoice match are sample figures/),
    ).toBeInTheDocument();
  });
});
