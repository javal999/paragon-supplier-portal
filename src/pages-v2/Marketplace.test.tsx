import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import Marketplace from './Marketplace';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('Marketplace — four honest states', () => {
  it('data: renders the marketplace once suppliers resolve', async () => {
    renderWithProviders(<Marketplace />);
    expect(await screen.findByText('Global Supplier Marketplace')).toBeInTheDocument();
    expect(await screen.findByText('Total Suppliers')).toBeInTheDocument();
    // D-CENSUS-8 — was `findByText('Sample data')`, a hardcoded English literal that
    // vanished under Bahasa (MARKER-I18N-HOLE-01). It is now the registry-derived,
    // translated ProvenanceMarker.
    //
    // ⚠️ PREMISE CHANGED at the marker-polish pass. It used to be TWO, one of them
    // PAGE-LEVEL — and the page level is exactly what stopped being true when
    // REQ-E10-01 made each card's grade and OTIF a measure over this hub's own
    // call-offs. Three now, each on a block that really is authored: the KPI tiles,
    // the supplier grid (which names the two values the marker does not cover), and
    // the open-RFQ teaser. Asserted BY PLACEMENT as well as by count — a count alone
    // cannot tell "moved onto the sections" from "moved back onto the page".
    expect(await screen.findAllByText('Sample data')).toHaveLength(3);
    expect(screen.getByTestId('marketplace-kpi-provenance')).toHaveTextContent(
      'Sample data',
    );
    const cards = screen.getByTestId('marketplace-cards-provenance');
    expect(cards).toHaveTextContent('Sample data');
    // …and it says which figures beside it are NOT sample.
    expect(cards).toHaveTextContent(
      'Calculated from deliveries and orders in this hub',
    );
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<Marketplace />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Suppliers')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<Marketplace />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when no suppliers are in scope', async () => {
    renderWithProviders(<Marketplace />, { identity: SUPPLIER });
    expect(await screen.findByText('No suppliers in the marketplace')).toBeInTheDocument();
  });
});
