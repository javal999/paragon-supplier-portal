// RFx UX 1D — the RFQ board as a work queue (B-04) and the wizard's stored
// Incoterm (B-03). B-02 (the side panel cut to a summary) is not built: see the
// lane report.
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import i18n from '@lib/i18n';
/** @import { IDataService } from '@services/data/types' */
/** @import { RFQ } from '@data/mockRfqs' */
import BuyerSourcing from './index';
import { byNextDeadline, emptyDraft, matchesGroup, rfqNextStep } from './utils';
import WizardReviewStep from './components/WizardReviewStep';
import { isIncotermOption } from './components/WizardTermsStep';

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
});

/**
 * @param {Partial<RFQ>} over
 * @returns {RFQ}
 */
const rfq = (over) =>
  /** @type {RFQ} */ ({
    id: 'rfq-x',
    rfqNumber: 'RFQ-X',
    status: 'Open',
    invitedSupplierIds: ['s1', 's2'],
    respondedSupplierIds: [],
    responseDeadline: '2026-06-01',
    awardDeadline: '2026-06-15',
    ...over
  });

const none = { quoted: 0, rounds: [], inForce: [] };

describe("B-04 — rfqNextStep: the buyer's next act, derived from state", () => {
  it('Draft → Publish; Open with some quotes → Review quotes; all quoted → Award', () => {
    expect(rfqNextStep(rfq({ status: 'Draft' }), none)).toBe('send');
    expect(rfqNextStep(rfq({}), { ...none, quoted: 1 })).toBe('quotes');
    expect(rfqNextStep(rfq({}), { ...none, quoted: 2 })).toBe('award');
  });

  it('an open round → close the round; an award not in SAP → raise in SAP', () => {
    expect(
      rfqNextStep(rfq({ status: 'Closed' }), { ...none, quoted: 1, rounds: [{ closed: false }] })
    ).toBe('round');
    const active = { status: 'Active', lines: [1] };
    expect(rfqNextStep(rfq({ status: 'Awarded' }), { ...none, inForce: [active] })).toBe('sap');
  });

  it("KNOWN-BAD twins — waiting on suppliers, raised in SAP and cancelled are not the buyer's act", () => {
    expect(rfqNextStep(rfq({}), none)).toBeNull();
    expect(rfqNextStep(rfq({ status: 'Closed' }), none)).toBeNull();
    const raised = { status: 'Raised in SAP', lines: [1] };
    expect(rfqNextStep(rfq({ status: 'Awarded' }), { ...none, inForce: [raised] })).toBeNull();
    expect(rfqNextStep(rfq({ status: 'Cancelled' }), { ...none, quoted: 2 })).toBeNull();
  });

  it('every status sits in exactly one non-queue tab', () => {
    /** @type {import('./const').GroupTab[]} */
    const tabs = ['open', 'pending', 'draft', 'awarded', 'closed'];
    for (const status of /** @type {const} */ ([
      'Draft',
      'Open',
      'Closed',
      'Partly awarded',
      'Awarded',
      'Cancelled'
    ])) {
      const hits = tabs.filter((g) => matchesGroup(rfq({ status }), g, null));
      expect(hits, status).toHaveLength(1);
    }
  });

  it('orders by next deadline, Closed and Cancelled last', () => {
    const rows = [
      rfq({ id: 'c', rfqNumber: 'C', status: 'Closed', awardDeadline: '2026-01-01' }),
      rfq({ id: 'b', rfqNumber: 'B', responseDeadline: '2026-06-09' }),
      rfq({ id: 'a', rfqNumber: 'A', status: 'Awarded', awardDeadline: '2026-06-05' }),
      rfq({ id: 'd', rfqNumber: 'D', status: 'Draft', responseDeadline: '2026-06-02' })
    ].sort(byNextDeadline);
    expect(rows.map((r) => r.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});

describe('B-04 — the board opens on "Needs my action"', () => {
  it('the default tab is "Needs my action", and every row names its Next act', async () => {
    renderWithProviders(<BuyerSourcing />);
    const tab = await screen.findByRole('tab', { name: /^Needs my action/ });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: /^All/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Draft/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Next' })).toBeInTheDocument();
    const next = await screen.findAllByTestId(/^rfq-next-/);
    expect(next.length).toBeGreaterThan(0);
    // RFx UX B-15/B-16 — the Next column speaks the stage bar's words.
    const labels = [
      'Send to suppliers',
      'Review quotes',
      'Close the round',
      'Award',
      'Mark the award Raised in SAP'
    ];
    for (const cell of next) expect(labels).toContain(cell.textContent);
  });

  it('a KPI tile filters the table to the RFQs it counts, and clicked again clears', async () => {
    renderWithProviders(<BuyerSourcing />);
    const tile = (await screen.findByText('Ready to Award')).closest('button');
    expect(tile).not.toBeNull();
    const btn = /** @type {HTMLButtonElement} */ (tile);
    const count = Number(within(btn).getByText(/^\d+$/).textContent);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: /^Needs my action/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.queryAllByTestId(/^rfq-next-/)).toHaveLength(count);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('tab', { name: /^Needs my action/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('empty queue — "Nothing needs your action today" (ID: "Tidak ada yang perlu…")', async () => {
    /** @type {IDataService} */
    const waitingOnly = {
      ...mockDataService,
      procurement: new Proxy(mockDataService.procurement, {
        get(target, prop, receiver) {
          if (prop === 'getRFQs')
            return async (/** @type {any[]} */ ...args) => {
              const res = await target.getRFQs(.../** @type {[any]} */ (args));
              return { ...res, items: res.items.filter((r) => r.rfqNumber === 'RFQ-2026-022') };
            };
          if (prop === 'getQuotations') return async () => ({ items: [] });
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      })
    };
    renderWithProviders(<BuyerSourcing />, { service: waitingOnly });
    expect(await screen.findByTestId('rfq-board-empty')).toHaveTextContent(
      'Nothing needs your action today'
    );
    // The waiting RFQ is still on the board, under "Open".
    fireEvent.click(screen.getByRole('tab', { name: /^Open/ }));
    expect(await screen.findByText('RFQ-2026-022')).toBeInTheDocument();
    expect(i18n.getResource('id', 'translation', 'sourcing.table.emptyAction')).toMatch(
      /^Tidak ada yang perlu/
    );
  });
});

describe('B-03 — the wizard seeds Incoterms from the list and Review shows the stored value', () => {
  /** @param {string} incoterms */
  const renderReview = (incoterms) =>
    renderWithProviders(
      <WizardReviewStep
        draft={{ ...emptyDraft(), incoterms }}
        rfqNumbers={/** @type {any} */ ({ ok: false })}
        sourcePrefill={null}
        authoringRows={{ basics: [], items: [], options: [] }}
        docItems={[]}
        supplierNameById={new Map()}
        editingRfqId={null}
        publishAvailability={/** @type {any} */ ({ kind: 'held' })}
        sendPending={false}
        isStepValid={() => true}
        saveAndSend={() => {}}
        setWizardStep={() => {}}
        setTemplateToSave={() => {}}
        t={i18n.t}
      />
    );

  it('a fresh draft stores FOB, an option of the Terms select (owner ruling Q4)', () => {
    expect(emptyDraft().incoterms).toBe('FOB');
    expect(isIncotermOption(emptyDraft().incoterms)).toBe(true);
  });

  it('an in-list value reads plainly on Review', () => {
    renderReview('FOB');
    expect(screen.getByText('FOB')).toBeInTheDocument();
    expect(screen.queryByTestId('review-incoterms-out-of-list')).not.toBeInTheDocument();
  });

  it('KNOWN-BAD twin — a seeded "CIF Jakarta" shows as stored, in red, with the fix', () => {
    renderReview('CIF Jakarta');
    const row = screen.getByTestId('review-incoterms-out-of-list');
    expect(row).toHaveTextContent('CIF Jakarta · Choose a term on the Terms step');
    expect(row).toHaveClass('text-danger');
  });
});
