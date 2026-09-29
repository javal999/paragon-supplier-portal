import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierPerformance from './SupplierPerformance';
import { REJECTION_PENALTY_POINTS } from '../services/data/performanceRules';
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
// sup-007 has six measured deliveries in the window, five met and one late
// (BL-94 added the four earlier on-time call-offs; it read two, one met).
// ────────────────────────────────────────────────────────────────────────────
describe('My performance — calculated (REQ-E10-01)', () => {
  it('shows the calculated OTIF over the deliveries measured in the period', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByTestId('my-performance-otif')).toHaveTextContent(
      'From 6 deliveries due in this period',
    );
    expect(await screen.findByText('83%')).toBeInTheDocument();
  });

  it('the grade comes from the calculated score, and the bands are stated on screen', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    // ⚠️ 50/100 UNTIL CFOT BECAME MEASURABLE. The score is the mean of what was
    // measured less the rejection penalty; while every order sat in 2025 it was
    // the OTIF number alone. Checked against the two percentages the page
    // renders beside it rather than restated as a third literal.
    // Material B3 — blended with the update compliance the page shows (weight 0.10).
    expect(await screen.findByTestId('my-update-compliance-value')).toHaveTextContent('Update compliance 92%');
    const delivery = Math.round((83 + 40) / 2) - 1 * REJECTION_PENALTY_POINTS;
    const expected = Math.round(0.9 * delivery + 0.1 * 92);
    expect(await screen.findByTestId('my-performance-grade')).toHaveTextContent(`${expected}/100`);
    expect(
      await screen.findByText(/Grades from the score: A 90\+ · B 80\+ · C 70\+ · D 0\+/),
    ).toBeInTheDocument();
  });

  // ⚠️ **THE TEST THAT STOOD HERE HAD ITS PREMISE RETIRED BY THE FIXTURES, AND
  // IT IS REPLACED RATHER THAN RE-PINNED.** As written:
  //
  //     it('CFOT with no measurable order reads "No history", never 0%', …
  //        expect(await screen.findByTestId('my-performance-cfot'))
  //          .toHaveTextContent('Nothing measured in this period yet.'))
  //
  // It was TRUE of sup-007 only because no purchase order anywhere in the tree
  // had a confirmed delivery date inside any period — the orders were dated
  // 2025 and the present is 2026. So the assertion read as a claim about the
  // RULE ("never 0%") while measuring an accident of the seed, and it would have
  // gone on passing if `cfotAggregate` had been deleted.
  //
  // ⚠️ IT CANNOT BE RE-POINTED ON THIS PAGE: sup-007 is the only supplier with a
  // published KPI snapshot, so every other identity renders the empty state
  // instead. The claim it was making — "No history" is not 0%, and a real 0% is
  // not "No history" — now lives on `BuyerScorecard.test.tsx`, which can choose
  // its supplier: sup-006 has nothing measured, sup-009 has a measured zero, and
  // both are asserted there. What is left here is the half this page can still
  // make falsifiable: CFOT is computed, and it names the orders it counted.
  it('CFOT is calculated from the orders due in the period, and says how many', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByTestId('my-performance-cfot')).toHaveTextContent(
      'From 3 orders due in this period',
    );
    expect(await screen.findByText('40%')).toBeInTheDocument();
  });

  it('offers the period chips that drive the computation', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByText('Last 30 days')).toBeInTheDocument();
    expect(await screen.findByText('This year')).toBeInTheDocument();
  });
});
