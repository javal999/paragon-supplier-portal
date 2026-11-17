import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { commandAuditSink } from '@services/data/mock/MockCommandService';
/** @import { IDataService } from '@services/data/types' */
import { POStatus } from '@services/data/types';
import i18n from '@lib/i18n';
import SupplierOrders from './SupplierOrders';

// The command layer mutates a shared store + audit sink — reset between tests.
beforeEach(() => {
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Valid supplier (sup-007) but no POs — override just getPurchaseOrders to [].
/** @type {IDataService} */
const noOrders = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getPurchaseOrders') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  })
};

describe('SupplierOrders — four honest states', () => {
  it('data: renders the scoped PO workspace with wired reads', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?view=list'
    });
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Total Value Pending')).toBeInTheDocument();
    // A real sup-007 PO proves the scoped read drove the table.
    expect(await screen.findByText('PO-2025-00108')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: alwaysPending,
      route: '/supplier/orders?view=list'
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Value Pending')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: alwaysFails,
      route: '/supplier/orders?view=list'
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no purchase orders', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: noOrders,
      route: '/supplier/orders?view=list'
    });
    expect(await screen.findByText('No purchase orders yet')).toBeInTheDocument();
  });
});

describe('SupplierOrders — PO-confirm end-to-end proof (Step 3.10)', () => {
  it('confirms a Sent PO through the dispatcher: store mutates + event emitted', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?view=list'
    });

    // The Sent PO (PO-2025-00108 / po-008) surfaces a "Confirm" row action.
    // ⚠️ SCOPED TO ITS OWN ROW. This read `screen.getByRole('button', {name:
    // 'Confirm'})` and passed only while sup-007 owned exactly ONE order
    // awaiting a response; the demo-data batch gives it a second (`po-021`,
    // ordered on the declared present and deliberately NOT escalated), so the
    // page-wide query now finds two. The row is what this spec was ever about.
    const row108 = /** @type {HTMLTableRowElement} */ (
      (await screen.findByText('PO-2025-00108')).closest('tr')
    );
    fireEvent.click(within(row108).getByRole('button', { name: 'Confirm' }));

    // Editing panel opens → dispatch t_po_confirm with the confirmedQuantities payload.
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm order' }));

    // Success surface renders (driven by the non-failed command outcome).
    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();

    // 3.6: the store mutated (Sent → Confirmed) — no page-local seeded copy.
    expect(purchaseOrderStore.get('po-008')?.status).toBe('Confirmed');
    expect(purchaseOrderStore.get('po-008')?.lineItems[0].confirmedQty).toBe(150000);

    // 3.8: exactly one done event was emitted, actor-scoped to sup-007.
    const done = commandAuditSink.byEvent('t_po_confirm').filter((e) => e.outcome === 'done');
    expect(done).toHaveLength(1);
    expect(done[0].actor).toBe('supplier:sup-007');

    // KPI cards, tab counts, and the banner must re-derive from the SAME
    // invalidated query as the table — no parallel/local derivation, no stale
    // memo.
    //
    // ⚠️ DERIVED FROM THE STORE, NOT PINNED. This read "All actions cleared",
    // no banner, and In progress "2" — true only while sup-007 owned exactly
    // two orders, both of them the ones this spec confirms. The walkthrough set
    // gives it more, including one deliberately left awaiting a response, so
    // the page-wide literals stopped describing the page. What the spec is
    // about is that the three surfaces agree with the mutated store, and that
    // is what is asserted now.
    const mine = purchaseOrderStore.all().filter((p) => p.supplierId === 'sup-007');
    const awaiting = mine.filter(
      (p) => p.status === POStatus.SENT || p.status === POStatus.ACKNOWLEDGED
    ).length;
    const inProgress = mine.filter(
      (p) => p.status === POStatus.CONFIRMED || p.status === POStatus.PARTIALLY_DELIVERED
    ).length;
    // CONTROL: the two counts must actually be exercised — a seed where nothing
    // is awaiting would make the banner assertion vacuous.
    expect(awaiting).toBeGreaterThan(0);
    expect(inProgress).toBeGreaterThan(0);
    // The banner is pluralised, so the count is matched rather than the sentence.
    expect(
      await screen.findByText(new RegExp(`^${awaiting} orders? needs? your confirmation:$`))
    ).toBeInTheDocument();
    expect(screen.queryByText('All actions cleared')).not.toBeInTheDocument();
    const inProgressTab = screen.getByRole('tab', { name: /In progress/ });
    expect(within(inProgressTab).getByText(String(inProgress))).toBeInTheDocument();

    // Riding fix: the drawer Key Facts derives from the live query, not the
    // frozen open-time snapshot. po-008 is now Confirmed, so no 'Sent' status
    // lingers on ITS row or in the drawer.
    //
    // ⚠️ SCOPED. This asked the whole document for 'Sent' and was only ever
    // about po-008 — it passed because po-008 was sup-007's only awaiting
    // order. `po-021` is Sent on purpose (it is the demo's one un-escalated
    // order awaiting a response), so a page-wide query now finds a legitimate
    // 'Sent' that has nothing to do with this walk.
    const confirmedRow = /** @type {HTMLTableRowElement} */ (
      screen
        .getAllByText('PO-2025-00108')
        .map((el) => el.closest('tr'))
        .find(/** @returns {el is HTMLTableRowElement} */ (el) => el !== null)
    );
    expect(within(confirmedRow).queryByText('Sent')).not.toBeInTheDocument();
    const drawer = /** @type {HTMLElement | null} */ (
      document.querySelector('aside[role="dialog"]')
    );
    expect(drawer).not.toBeNull();
    expect(within(/** @type {HTMLElement} */ (drawer)).queryByText('Sent')).not.toBeInTheDocument();
  });

  // F2-24 surfaced the command id here; BL-310 (owner ruling 2026-11-13) drops it:
  // the id is a support reference that stays on the audit event, and a supplier
  // cannot act on it. The toast still makes no delivery claim.
  it('confirm toast is honest (F2-24, BL-310): no command id, no false delivery claim', () => {
    for (const lng of ['en', 'id']) {
      expect(i18n.exists('po.confirm.success.desc', { lng })).toBe(false);
      const title = i18n.t('po.confirm.success.title', { lng, poNumber: 'PO-2026-00121' });
      expect(title).toContain('PO-2026-00121');
      expect(title).not.toMatch(/cmd_|notified|diberitahu/i);
    }
  });

  it('no success toast shows the command id (BL-310); the failure reference keeps it', () => {
    const keys = [
      'asn.create.success.desc',
      'gr.create.success.desc',
      'gr.dispose.success.desc',
      'invoice.create.success.desc',
      'invoice.submit.success.desc',
      'invoice.dispute.success.desc',
      'invoice.resolve.success.desc'
    ];
    for (const lng of ['en', 'id']) {
      expect(i18n.exists('asn.submit.success.desc', { lng })).toBe(false);
      for (const key of keys) {
        expect(i18n.exists(key, { lng })).toBe(true);
        const text = i18n.t(key, { lng, poNumber: 'PO-1', correlationId: 'cmd_0001' });
        expect(text).not.toContain('cmd_0001');
      }
      // Known-good half: the failure reference still carries the id.
      expect(i18n.t('settle.failed.ref', { lng, correlationId: 'cmd_0001' })).toContain('cmd_0001');
    }
  });
});

// ── CP-0 · W1 · 2f-c — the confirm cells, and why the TYPE is the test ───────
//
// 2f-FIND-03 (as amended). The cells were `type="number"` read with a bare
// `Number()`, and that failure is invisible in this suite: en-US Chrome returns
// "1.500" verbatim and jsdom does no locale parsing at all (4b-FIND-01). So the
// durable lock is the INPUT CONTRACT — `type="text"` + `inputMode` — with the
// behavioural specs stacked on top, honest about what they can prove.
//
// THE INVERTED LOCKS: 2f-b was one lock by necessity (no dispatcher). Here the
// SECOND lock (`poConfirmQtyWithinOrdered`) exists and holds — these specs
// guard the FIRST, and the policy's own first direct unit tests live in
// `services/transitions/policies.test.js`.
describe('SupplierOrders — the confirm cells are text, so the parser is load-bearing', () => {
  /** Open PO-2025-00108 (sup-007, Sent, one line: 150,000 PCS) in editing mode. */
  const openEditing = async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?view=list'
    });
    // Scoped to the row — sup-007 has more than one order awaiting a response
    // since the demo-data batch. See the note in the dispatcher proof above.
    const row = /** @type {HTMLTableRowElement} */ (
      (await screen.findByText('PO-2025-00108')).closest('tr')
    );
    fireEvent.click(within(row).getByRole('button', { name: 'Confirm' }));
    return screen.findByLabelText('Confirmed PK-PETB-8802');
  };

  it('THE LOCK — the cell is not type="number" (Ruling 6.2)', async () => {
    const cell = await openEditing();
    expect(cell).toHaveAttribute('type', 'text');
    expect(cell).toHaveAttribute('inputmode', 'decimal');
    // min/max were number-input affordances that never bound anything; the
    // bound is the policy's, mirrored on the surface from the SAME predicate.
    expect(cell).not.toHaveAttribute('min');
    expect(cell).not.toHaveAttribute('max');
  });

  it('SEEDS canonical ungrouped digits — 150000, not the "150.000" the parser refuses', async () => {
    const cell = await openEditing();
    expect(cell).toHaveValue('150000');
    expect(screen.queryByTestId('po-confirm-refusal-0')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm order' })).not.toBeDisabled();
  });

  it('POSITIVE TWIN — an edited readable quantity DISPATCHES and stores the parsed number', async () => {
    // A negative assertion alone proves nothing (the 2e-b-4a rule): a reduced
    // confirmation must still go through, end to end, into the store.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '120000' } });
    expect(screen.queryByTestId('po-confirm-refusal-0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm order' }));
    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();
    expect(purchaseOrderStore.get('po-008')?.lineItems[0].confirmedQty).toBe(120000);
  });

  it('a cross-convention "1.500" REFUSES at the cell and disables Confirm — the token the policy passes as 1.5', async () => {
    // The live defect: 0 < 1.5 ≤ 150000 satisfies the bounds policy, so the
    // misread was stamped onto the stored line and poisoned expectedValue,
    // the 3-way match input. The FIRST lock is the only one that can catch it.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '1.500' } });
    const refusal = screen.getByTestId('po-confirm-refusal-0');
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal.textContent).toMatch(/can be read two ways/i);
    expect(cell).toHaveAttribute('aria-invalid', 'true');
    // BL-84 — the cell names the refusal it is refused by.
    const describedBy = cell.getAttribute('aria-describedby');
    expect(describedBy).toBe('po-confirm-refusal-0');
    expect(document.getElementById('po-confirm-refusal-0')).toBe(refusal);
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
    expect(purchaseOrderStore.get('po-008')?.status).toBe('Sent');
  });

  it('a CLEARED cell refuses by name — no fabricated zero, no dispatcher debug-string toast', async () => {
    // Retired path: Number('') fabricated 0 into state, dispatched, and the
    // policy bounced it with a raw English bounds string. Now the refusal is
    // at the cell, translated, before any dispatch exists to fail.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '' } });
    expect(screen.getByTestId('po-confirm-refusal-0').textContent).toMatch(
      /not a confirmation of none/i
    );
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  });

  it('a typed ZERO parses and the BOUNDS MIRROR speaks — courtesy on the surface, law in the policy', async () => {
    // The zero is READ (a real assertion); it is the policy's 0 < q that
    // refuses it, and the mirror explains that bound pre-dispatch using the
    // SAME shared predicate the policy runs. Confirm-disabled is UX; the
    // policy refusal is the guarantee.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '0' } });
    expect(screen.queryByTestId('po-confirm-refusal-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('po-confirm-bounds-0').textContent).toMatch(
      /between 1 and 150,?000/i
    );
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  });

  it('an OVER-ORDERED quantity gets the same mirror, naming the line’s own bound', async () => {
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '150001' } });
    expect(screen.getByTestId('po-confirm-bounds-0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  });

  it('the diff warning derives from the PARSED read — suppressed under a refusal, never summed over a guess', async () => {
    const cell = await openEditing();
    // A readable short-confirmation raises the honest diff warning…
    fireEvent.change(cell, { target: { value: '120000' } });
    expect(screen.getByText(/Confirmed values differ from the original PO/i)).toBeInTheDocument();
    // …an unreadable token suppresses it: the refusal speaks instead.
    fireEvent.change(cell, { target: { value: '1.500' } });
    expect(
      screen.queryByText(/Confirmed values differ from the original PO/i)
    ).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WHO ACTS NEXT — the silence this batch exists to answer.
//
// ⚠️ PREMISE CHANGED BY REQ-E07-05 (order collaboration phase 2a): a `Confirmed`
// PO now carries the supplier's shipping notice (`t_po_shipping_notice`), so the
// supplier is the next actor there and the line reads `mine`. The S/4HANA wait
// this block was written for still exists one state later — every exit from
// `Delivered` is an S/4HANA fact — so the external assertions move to that state
// rather than being deleted. The Confirmed PO is set to Delivered in the store
// for them.
// ─────────────────────────────────────────────────────────────────────────────
describe('SupplierOrders — who acts next on a stranded PO', () => {
  const deliverPo007 = () =>
    purchaseOrderStore.update('po-007', (po) => ({ ...po, status: POStatus.DELIVERED }));

  it('a Confirmed PO is the supplier’s own next act — the shipping notice', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?view=list'
    });
    fireEvent.click(await screen.findByText('PO-2025-00107'));
    const line = await screen.findByTestId('next-act-supplier-po');
    expect(line).toHaveAttribute('data-next-act', 'mine');
  });

  it('a PO in Delivered names S/4HANA, on the supplier side', async () => {
    deliverPo007();
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?view=list'
    });
    // PO-2025-00107 is sup-007's, moved to `Delivered` above.
    fireEvent.click(await screen.findByText('PO-2025-00107'));
    const line = await screen.findByTestId('next-act-supplier-po');
    expect(line).toHaveAttribute('data-next-act', 'external');
    expect(line).toHaveTextContent('Awaiting S/4HANA');
  });

  it('…and in Indonesian, where the FRAMING translates and the product name does not', async () => {
    // `Menunggu` is the divergent token: it shares no spelling with "Awaiting".
    // `S/4HANA` is identical in both locales by decision, so asserting on it
    // alone would be an assertion that cannot fail.
    await i18n.changeLanguage('id');
    try {
      deliverPo007();
      renderWithProviders(<SupplierOrders />, {
        identity: SUPPLIER,
        route: '/supplier/orders?view=list'
      });
      fireEvent.click(await screen.findByText('PO-2025-00107'));
      const line = await screen.findByTestId('next-act-supplier-po');
      expect(line).toHaveTextContent('Menunggu S/4HANA');
      expect(line).not.toHaveTextContent('Awaiting');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
