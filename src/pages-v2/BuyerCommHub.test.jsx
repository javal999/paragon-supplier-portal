import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, pickSelectFieldOption } from '@test/test-utils';
import BuyerCommHub from './BuyerCommHub';
import { useUnifiedChase } from '@services/query/chaseHooks';
import { useConsolidationRows } from '@services/query/sdcBuyerHooks';
import { useSuppliers } from '@services/query/hooks';
import { outboundRequestStore, channelProvenanceStore } from '@services/channel';
import { makeProvenanceRef } from '@services/channel/types';
import { openSubmissionSession } from '@services/sdc';
/** @import { SupplierChaseView } from '@services/chase' */

// The three data hooks are mocked so the outbound-queue derivation runs over
// crafted inputs (deterministic status + worst-first ordering). The real-fixture
// mount is covered by allRoutes.smoke. outboundRequestStore keeps its SIMULATED
// seed (sup-005 whatsapp @ 08-18, sup-007 email @ 08-19).
vi.mock('@services/query/chaseHooks', () => ({ useUnifiedChase: vi.fn() }));
// useConsolidationRows drives the outbound fold. The C4d triage panel no longer
// has a write hook of its own (BL-73): it pre-fills the Inventory page's entry
// form, whose dispatch runs REAL here against the mock service, and whose stock
// rows come from the real `useInventory` read — so only `useSuppliers` is stubbed
// in the hooks module.
vi.mock('@services/query/sdcBuyerHooks', () => ({
  useConsolidationRows: vi.fn()
}));
vi.mock('@services/query/hooks', async (importOriginal) => ({
  ...(await /** @type {typeof importOriginal<typeof import('@services/query/hooks')>} */ (
    importOriginal
  )()),
  useSuppliers: vi.fn()
}));

/**
 * @param {string} supplierId
 * @param {SupplierChaseView['overallSeverity']} overallSeverity
 * @returns {SupplierChaseView}
 */
const view = (supplierId, overallSeverity) => ({
  supplierId,
  dataReasons: [],
  commitmentEntries: [],
  overallSeverity,
  chaseCount: 1
});

// A minimal consolidation row carrying only what foldReplies reads
// (line.supplierId + state.response.submittedAt). The array is cast to the hook's
// return type at the call site, so this plain shape is sufficient.
/**
 * @param {string} supplierId
 * @param {string} submittedAt
 */
const reply = (supplierId, submittedAt) => ({
  id: `${supplierId}-row`,
  line: { supplierId },
  state: { kind: 'confirmed-full', response: { submittedAt }, carriedForward: false }
});

/**
 * @param {SupplierChaseView[]} data
 * @param {Partial<{ isPending: boolean; isError: boolean }>} [over]
 */
const chaseResult = (data, over = {}) =>
  /** @type {ReturnType< typeof useUnifiedChase >} */ (
    /** @type {unknown} */ ({
      data,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      ...over
    })
  );

beforeEach(() => {
  outboundRequestStore.reset();
  channelProvenanceStore.reset();
  vi.mocked(useSuppliers).mockReturnValue(
    /** @type {ReturnType<typeof useSuppliers>} */ (
      /** @type {unknown} */ ({
        data: {
          items: [
            { id: 'sup-002', name: 'PT Alpha' },
            { id: 'sup-005', name: 'PT Beta' },
            { id: 'sup-007', name: 'PT Sample Packaging Indonesia' }
          ]
        }
      })
    )
  );
  vi.mocked(useConsolidationRows).mockReturnValue(
    /** @type {ReturnType<typeof useConsolidationRows>} */ (/** @type {unknown} */ ({ data: [] }))
  );
  vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([]));
});

afterEach(() => {
  outboundRequestStore.reset();
  channelProvenanceStore.reset();
  vi.clearAllMocks();
});

// The Request log tab holds the outbound queue and the provenance trail.
const LOG = { route: '/?tab=log' };
const REPLY = { route: '/?tab=reply' };

/** Renders the page address, so a spec can read what the page wrote to it. */
const LocationProbe = () => {
  const { search } = useLocation();
  return <output data-testid="location-search">{search}</output>;
};

describe('BuyerCommHub — Supplier follow-ups (IA P-05, on the C4a Communication Hub)', () => {
  it('renders the Supplier follow-ups header and honest framing', () => {
    renderWithProviders(<BuyerCommHub />);
    expect(screen.getAllByText('Supplier follow-ups').length).toBeGreaterThan(0);
    expect(screen.queryByText('Communication Hub')).not.toBeInTheDocument();
    expect(screen.getByText('No live channel — nothing is sent from here.')).toBeInTheDocument();
  });

  it('shows the SIMULATED liveness marker and NO fabricated channel chrome', () => {
    renderWithProviders(<BuyerCommHub />);
    // Honest amber "Sample" marker (LivenessRegistry two-gate).
    expect(screen.getAllByText('Sample data').length).toBeGreaterThan(0);
    // None of the retired mock's dishonest chrome survives.
    expect(screen.queryByText(/360dialog/i)).not.toBeInTheDocument();
    expect(screen.queryByText('✓✓')).not.toBeInTheDocument();
    expect(screen.queryByText(/🟢/)).not.toBeInTheDocument();
  });

  it('derives composed / awaiting / stale and renders them worst-first', () => {
    // sup-005 (hard) has a seed ask + a fresh reply → awaiting.
    // sup-002 (hard) has no ask → composed.
    // sup-007 (soft) has a seed ask + no reply → stale.
    vi.mocked(useUnifiedChase).mockReturnValue(
      chaseResult([view('sup-005', 'hard'), view('sup-002', 'hard'), view('sup-007', 'soft')])
    );
    vi.mocked(useConsolidationRows).mockReturnValue(
      /** @type {ReturnType<typeof useConsolidationRows>} */ (
        /** @type {unknown} */ ({
          data: [reply('sup-005', '2026-08-24T09:00:00.000Z')]
        })
      )
    );

    renderWithProviders(<BuyerCommHub />, LOG);

    // All three derived statuses render.
    expect(screen.getByText('Awaiting reply')).toBeInTheDocument();
    expect(screen.getByText('To compose')).toBeInTheDocument();
    expect(screen.getByText('No reply yet')).toBeInTheDocument();

    // Worst-first: hard group first (composed before awaiting by status rank),
    // soft last → PT Alpha (hard/composed), PT Beta (hard/awaiting), PT Sample Packaging (soft/stale).
    const rows = screen.getAllByTestId('commhub-outbound-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('PT Alpha')).toBeInTheDocument();
    expect(within(rows[1]).getByText('PT Beta')).toBeInTheDocument();
    expect(within(rows[2]).getByText('PT Sample Packaging Indonesia')).toBeInTheDocument();
  });

  it('marks every outbound request "composed — not sent" (never sent)', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(
      chaseResult([view('sup-005', 'hard'), view('sup-007', 'soft')])
    );
    renderWithProviders(<BuyerCommHub />, LOG);
    const rows = screen.getAllByTestId('commhub-outbound-row');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(within(row).getByText('Composed — not sent')).toBeInTheDocument();
    }
  });

  it('shows an honest empty state when the chase is clear', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([]));
    renderWithProviders(<BuyerCommHub />, LOG);
    expect(screen.getByText('No outstanding requests — the chase is clear.')).toBeInTheDocument();
  });

  it('provenance: shows an honest empty state when nothing is channel-sourced yet', () => {
    renderWithProviders(<BuyerCommHub />, LOG);
    const section = screen.getByTestId('commhub-provenance');
    expect(
      within(section).getByText(/No channel-sourced submissions recorded yet/)
    ).toBeInTheDocument();
  });

  it('provenance: joins a recorded channel reply into the audit trail', () => {
    const session = openSubmissionSession('ss-cm', 'sup-007', '2026-08-25T12:00:00.000Z');
    session.attempt('InventoryDeclaration', 'inv-1', 'corr-9');
    channelProvenanceStore.append(makeProvenanceRef('cm-777', session.envelope()));

    renderWithProviders(<BuyerCommHub />, LOG);
    const rows = screen.getAllByTestId('commhub-provenance-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('cm-777')).toBeInTheDocument();
    expect(within(rows[0]).getByText('corr-9')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Recorded')).toBeInTheDocument();
  });

  it('the C4a deep-link is gone; the C4d in-place triage panel replaces it (supplier binding first)', () => {
    renderWithProviders(<BuyerCommHub />, REPLY);
    // The old honest deep-link to the supplier Channel Inbox is retired.
    expect(screen.queryByRole('link', { name: /Open Channel Inbox/i })).not.toBeInTheDocument();
    // The in-place triage panel is present, gated on picking a supplier FIRST.
    const triage = screen.getByTestId('commhub-triage');
    expect(within(triage).getByTestId('triage-supplier')).toBeInTheDocument();
    // Before a supplier is picked there is no message field and no confirm action.
    expect(within(triage).queryByTestId('triage-message')).not.toBeInTheDocument();
    expect(within(triage).queryByTestId('triage-enter-0')).not.toBeInTheDocument();
    // And there is NEVER a free supplierId text field — the subject is picked.
    expect(within(triage).queryByLabelText(/supplier id/i)).not.toBeInTheDocument();
  });

  it('recording via the in-place panel adds a row to the Channel-sourced submissions trail', async () => {
    renderWithProviders(<BuyerCommHub />, LOG);
    // Empty audit trail to begin.
    expect(
      within(screen.getByTestId('commhub-provenance')).getByText(/No channel-sourced submissions/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Record a reply' }));
    // Bind the subject, paste, parse, open the entry form, save (BL-73: the form
    // is the Inventory page's own, and its save is the record dispatch).
    await pickSelectFieldOption('triage-supplier', 'sup-007');
    fireEvent.change(screen.getByTestId('triage-message'), {
      target: { value: 'STOK PK-PETB-8810 2400 KG' }
    });
    fireEvent.click(screen.getByTestId('triage-parse'));
    fireEvent.click(await screen.findByTestId('triage-enter-0'));
    const form = within(
      /** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]'))
    );
    fireEvent.change(form.getByLabelText('Material'), { target: { value: 'PK-PETB-8810' } });
    fireEvent.change(form.getByLabelText('Stock on hand (PCS)'), { target: { value: '2400' } });
    fireEvent.change(form.getByLabelText('In production (PCS)'), { target: { value: '0' } }); // MAT-D4 — required, 0 allowed
    fireEvent.click(form.getByTestId('stock-entry-submit'));
    await waitFor(() => expect(screen.getByTestId('triage-result')).toBeInTheDocument());
    // The onRecorded refresh re-reads the append-only store → a provenance row shows
    // on the Request log tab.
    fireEvent.click(screen.getByRole('tab', { name: 'Request log' }));
    await waitFor(() => expect(screen.getAllByTestId('commhub-provenance-row').length).toBe(1));
    expect(
      within(screen.getByTestId('commhub-provenance')).getByText('Recorded')
    ).toBeInTheDocument();
  });

  it('opens on "Suppliers to follow up" by default and shows the chase list there', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(
      chaseResult([view('sup-005', 'hard'), view('sup-007', 'soft')])
    );
    renderWithProviders(<BuyerCommHub />);
    expect(screen.getByRole('tab', { name: /Suppliers to follow up/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const cards = screen.getAllByTestId('chase-card');
    expect(cards).toHaveLength(2);
    // Worst first, as the chase reducer ordered them.
    expect(within(cards[0]).getByText('PT Beta')).toBeInTheDocument();
    expect(within(cards[1]).getByText('PT Sample Packaging Indonesia')).toBeInTheDocument();
    // The list keeps its own honesty statement; the other tabs' sections are not shown.
    expect(screen.getByText(/no message is sent from here/)).toBeInTheDocument();
    expect(screen.queryByTestId('commhub-triage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('commhub-log')).not.toBeInTheDocument();
  });

  it('shows an honest empty follow-up list when nobody needs chasing', () => {
    renderWithProviders(<BuyerCommHub />);
    expect(
      screen.getByText('Nothing to chase — every supplier is responsive and on-calendar.')
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('chase-card')).toHaveLength(0);
  });

  it.each([
    ['follow-up', 'Suppliers to follow up', 'commhub-followup'],
    ['reply', 'Record a reply', 'commhub-triage'],
    ['log', 'Request log', 'commhub-log']
  ])('?tab=%s renders its own section (%s) and only that one', (key, label, testId) => {
    renderWithProviders(<BuyerCommHub />, { route: `/?tab=${key}` });
    expect(screen.getByRole('tab', { name: new RegExp(label) })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    for (const id of ['commhub-followup', 'commhub-triage', 'commhub-log']) {
      if (id === testId) expect(screen.getByTestId(id)).toBeInTheDocument();
      else expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }
    // The page-level honesty banner stays on every tab.
    expect(screen.getByText('No live channel — nothing is sent from here.')).toBeInTheDocument();
  });

  it('clicking a tab shows its section and writes ?tab= to the address', () => {
    renderWithProviders(
      <>
        <BuyerCommHub />
        <LocationProbe />
      </>
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Request log' }));
    expect(screen.getByTestId('commhub-outbound')).toBeInTheDocument();
    expect(screen.getByTestId('commhub-provenance')).toBeInTheDocument();
    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=log');
    fireEvent.click(screen.getByRole('tab', { name: 'Record a reply' }));
    expect(screen.getByTestId('commhub-triage')).toBeInTheDocument();
    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=reply');
  });

  it('"Record a reply" on a supplier row opens the reply tab with that supplier preselected', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(
      chaseResult([view('sup-005', 'hard'), view('sup-007', 'soft')])
    );
    renderWithProviders(
      <>
        <BuyerCommHub />
        <LocationProbe />
      </>
    );
    const row = screen.getAllByTestId('chase-card')[1];
    fireEvent.click(within(row).getByRole('button', { name: 'Record a reply' }));
    expect(screen.getByRole('tab', { name: 'Record a reply' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const triage = screen.getByTestId('commhub-triage');
    // Bound to the row's supplier: the recording-for banner names it and the
    // message field (shown only once a supplier is bound) is open.
    expect(
      within(triage).getByText('PT Sample Packaging Indonesia', { selector: 'strong' })
    ).toBeInTheDocument();
    expect(within(triage).getByTestId('triage-message')).toBeInTheDocument();
    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=reply&supplier=sup-007');
  });

  it('a ?tab=reply&supplier= deep link preselects that supplier; an unknown id binds nobody', () => {
    const { unmount } = renderWithProviders(<BuyerCommHub />, {
      route: '/?tab=reply&supplier=sup-005'
    });
    expect(
      within(screen.getByTestId('commhub-triage')).getByText('PT Beta', { selector: 'strong' })
    ).toBeInTheDocument();
    unmount();

    renderWithProviders(<BuyerCommHub />, { route: '/?tab=reply&supplier=sup-999' });
    const triage = screen.getByTestId('commhub-triage');
    expect(within(triage).queryByTestId('triage-message')).not.toBeInTheDocument();
    expect(
      within(triage).getByText('Pick a supplier to begin — the reply is recorded against them.')
    ).toBeInTheDocument();
  });

  it('renders the loading state while the chase read is pending', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([], { isPending: true }));
    renderWithProviders(<BuyerCommHub />);
    expect(
      screen.queryByText('No live channel — nothing is sent from here.')
    ).not.toBeInTheDocument();
  });

  it('renders the error state when the chase read throws', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([], { isError: true }));
    renderWithProviders(<BuyerCommHub />);
    expect(screen.getByText('Unable to load this page')).toBeInTheDocument();
  });
});
