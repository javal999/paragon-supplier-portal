import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierPerformance from './SupplierPerformance';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A real supplier (sup-002) whose KPI snapshot is not yet published — the
// record resolves but the performance data is empty.
const SUPPLIER_NO_PERF: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sinar Meadow',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

describe('SupplierPerformance — four honest states', () => {
  it('data: renders the scorecard for the seeded supplier', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByText('My Performance')).toBeInTheDocument();
    // PREMISE CHANGED (REQ-E10-01): the authored "OTIF Rate" row left this
    // fixture — OTIF is calculated now and sits in its own KPI card above.
    expect(await screen.findByText('KPI Scorecard — 5 metrics')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('KPI Scorecard — 6 metrics')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no published scorecard', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER_NO_PERF });
    expect(await screen.findByText('No performance data yet')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-E10-01 — the supplier's own figures are CALCULATED now.
// sup-007 has two measured deliveries in the window, one met and one late.
// ────────────────────────────────────────────────────────────────────────────
describe('My performance — calculated (REQ-E10-01)', () => {
  it('shows the calculated OTIF over the deliveries measured in the period', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByTestId('my-performance-otif')).toHaveTextContent(
      'From 2 deliveries due in this period',
    );
    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('the grade comes from the calculated score, and the bands are stated on screen', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByTestId('my-performance-grade')).toHaveTextContent('50/100');
    expect(
      await screen.findByText(/Grades from the score: A 90\+ · B 80\+ · C 70\+ · D 0\+/),
    ).toBeInTheDocument();
  });

  it('CFOT with no measurable order reads "No history", never 0%', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByTestId('my-performance-cfot')).toHaveTextContent(
      'Nothing measured in this period yet.',
    );
  });

  it('offers the period chips that drive the computation', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByText('Last 30 days')).toBeInTheDocument();
    expect(await screen.findByText('This year')).toBeInTheDocument();
  });
});
