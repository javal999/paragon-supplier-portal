import { screen, act, within } from '@testing-library/react';
import i18n from '@lib/i18n';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import SupplierDashboard from './SupplierDashboard';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';

// The OTIF pill's band test (below) forces `perfVariant`; every other test
// gets the real function (`forced.variant` stays null).
const forced = vi.hoisted(() => ({
  /** @type {null | 'success' | 'warning' | 'danger'} */ variant: null
}));
vi.mock('./SupplierDashboard/utils', async (importOriginal) => {
  const actual = /** @type {typeof import('./SupplierDashboard/utils')} */ (await importOriginal());
  return {
    ...actual,
    /** @param {number} v */
    perfVariant: (v) => forced.variant ?? actual.perfVariant(v)
  };
});

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// sup-999 has no supplier record — getCurrent resolves null → EmptyState.
/** @type {CurrentIdentity} */
const SUPPLIER_NO_PROFILE = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

describe('SupplierDashboard — four honest states', () => {
  it('data: renders the dashboard with wired reads', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    // KPI strip only renders in the data branch — proof the reads resolved.
    expect(await screen.findByText('Open Orders')).toBeInTheDocument();
    expect(screen.getByText('My recent purchase orders')).toBeInTheDocument();
  });

  it('data: documents section is driven by the scoped useDocuments read', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    // A real sup-007 compliance document proves the wired list (not hardcoded).
    //
    // ⚠️ `findAllByText`, NOT `findByText`, AND THE PLURAL IS THE FINDING.
    // The briefing's certificate card is derived now, so it NAMES the same
    // document — two mentions of one certificate on one page, which is what
    // a briefing that reads real data looks like. The singular query broke,
    // and that break was the first evidence the card had stopped being
    // fiction: the authored card it replaced named a certificate (`ISO 9001`)
    // that was not expiring at all.
    const mentions = await screen.findAllByText(/Halal Certificate/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it('data: the placeholder briefing is honestly flagged as sample data', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    // The briefing carries a "Sample data" pill — and so may fixture-backed
    // widgets (e.g. Certificates). At least one honest sample flag is present;
    // none are faked green.
    const flags = await screen.findAllByText('Sample data');
    expect(flags.length).toBeGreaterThanOrEqual(1);
  });

  // ⚠️ NEW BEHAVIOUR (REQ-E10-01, marker-polish pass). The marker used to sit on the
  // page meta line, which read over the identity card immediately below it — and that
  // card is nothing but the grade, the score and the OTIF, all three MEASURED from this
  // supplier's own call-offs, heads-ups, receipts and orders since phase 6b. It moved
  // onto the KPI strip, which is counted from fixtures, and names the one tile there
  // that is calculated. Pinned in both directions: back onto the meta line fails, and
  // so does a strip that stops distinguishing its measured tile.
  it('the sample marker sits on the KPI strip, not on the page meta line', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    const strip = await screen.findByTestId('supplier-dashboard-kpi-provenance');
    expect(strip).toHaveTextContent('Sample data');
    expect(strip).toHaveTextContent('Calculated from deliveries and orders in this hub');

    const meta = screen.getByText(/Supplier identity ·/);
    expect(meta).not.toHaveTextContent('Sample data');
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierDashboard />, {
      identity: SUPPLIER,
      service: alwaysPending
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Open Orders')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierDashboard />, {
      identity: SUPPLIER,
      service: alwaysFails
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no profile record', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER_NO_PROFILE });
    expect(await screen.findByText('No supplier profile yet')).toBeInTheDocument();
  });
});

// The OTIF pill's label and its colour come from ONE band: `perfVariant`.
// Before, the label carried its own 90/80 thresholds beside `perfVariant`'s
// `targetStatus(v, 90)`, so the two could drift apart without any test
// noticing. Forcing the variant proves the label follows it.
describe('SupplierDashboard — OTIF pill label follows the perfVariant band', () => {
  afterEach(async () => {
    forced.variant = null;
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  /** @param {string} label */
  const pillIn = async (label) => {
    const otifLine = await screen.findByText(/^OTIF: /);
    const card = /** @type {HTMLElement} */ (otifLine.parentElement);
    return within(card).getByText(label);
  };

  it.each(
    /** @type {const} */ ([
      ['success', 'On Track', 'text-success'],
      ['warning', 'Needs Attention', 'text-warning-hover'],
      ['danger', 'At Risk', 'text-danger']
    ])
  )('variant %s reads "%s" in the pill of that colour', async (variant, label, colour) => {
    forced.variant = variant;
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    const pill = await pillIn(label);
    expect(pill).toHaveClass(colour);
  });

  it('the pill label is Indonesian under the ID locale', async () => {
    forced.variant = 'danger';
    await act(async () => {
      await i18n.changeLanguage('id');
    });
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    const pill = await pillIn('Berisiko');
    expect(pill).toHaveClass('text-danger');
  });
});
