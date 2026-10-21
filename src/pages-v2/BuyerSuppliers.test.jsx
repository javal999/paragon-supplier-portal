import { screen, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import BuyerSuppliers from './BuyerSuppliers';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerSuppliers — four honest states', () => {
  it('data: renders the directory once the suppliers resolve', async () => {
    renderWithProviders(<BuyerSuppliers />);
    expect(await screen.findByRole('heading', { name: 'Suppliers' })).toBeInTheDocument();
    expect(await screen.findByText(/records · last updated/)).toBeInTheDocument();
  });

  // ⚠️ NEW BEHAVIOUR (REQ-E10-01, marker-polish pass). The "Sample data" marker used
  // to sit on the page meta line, which claimed the OTIF column too — and OTIF stopped
  // being a stored field when phase 6b made it a measure over this hub's own call-offs.
  // It moved onto the table, which is authored, and names the column it does not cover.
  // Asserted BY PLACEMENT in both directions: a marker back on the meta line, or a
  // marker that stops naming the calculated column, fails here.
  it('the sample marker sits on the table and names the calculated column, not the page', async () => {
    renderWithProviders(<BuyerSuppliers />);
    const meta = await screen.findByText(/records · last updated/);
    // The meta line itself, not some ancestor — otherwise the assertion below would
    // be about the whole page and could never fail for the right reason.
    expect(meta.tagName).toBe('P');
    expect(within(meta).queryByText('Sample data')).toBeNull();

    const provenance = screen.getByTestId('suppliers-provenance');
    expect(provenance).toHaveTextContent('Sample data');
    expect(provenance).toHaveTextContent('Calculated from deliveries and orders in this hub');
    // …and the marker is the only one on the route, so the assertion above is not
    // passing because some other block happens to carry one.
    expect(screen.getAllByText('Sample data')).toHaveLength(1);
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerSuppliers />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Suppliers' })).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerSuppliers />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when no suppliers are in scope', async () => {
    // A supplier persona sees no directory (suppliers.list returns empty).
    renderWithProviders(<BuyerSuppliers />, { identity: SUPPLIER });
    expect(await screen.findByText('No suppliers yet')).toBeInTheDocument();
  });
});
