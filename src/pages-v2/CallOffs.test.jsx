// ─────────────────────────────────────────────────────────────────────────────
// Call-off management on the screens (REQ-E09-01, REQ-E09-03, REQ-E09-04): the
// PTI and supplier Call-offs pages, the menu, the Home tasks and the Order
// summary column. Every walk that acts ends in the STORE, not only in the DOM.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { nextFreeSequence } from '@services/transitions/shipmentNotice';
/** @import { CallOff } from '@services/data/types' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { PTI_NAV, SUPPLIER_NAV } from '@components/layout-v2/navConfig';
import { callOffsEn, callOffsId } from '@lib/i18n/callOffs';
import BuyerCallOffs from './BuyerCallOffs';
import SupplierCallOffs from './SupplierCallOffs';
import BuyerHome from './BuyerHome';
import SupplierHome from './SupplierHome';
import BuyerOrderSummary from './BuyerOrderSummary';

beforeEach(() => {
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
});

/** @type {CurrentIdentity} */
const SUP_008 = {
  personaType: 'supplier',
  supplierId: 'sup-008',
  supplierName: 'PT Sample Carton Packaging',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));

/**
 * P-12 — opens one of the Call-offs tabs, by its visible name.
 * @param {string} name
 */
const openTab = async (name) => fireEvent.click(await screen.findByRole('tab', { name }));

describe('menu and copy', () => {
  it('both menus point Call-offs at the new pages; the old routes are out of the menu', () => {
    const all = [...PTI_NAV, ...SUPPLIER_NAV].flatMap((s) => s.items.map((i) => i.path));
    expect(all).toContain('/buyer/call-offs');
    expect(all).toContain('/supplier/call-offs');
    expect(all.filter((p) => p.includes('delivery-agreements'))).toEqual([]);
  });

  it('every new string exists in EN and ID', () => {
    // BL-159 plural rule: compare BASE keys, with the plural suffix stripped.
    // English has `_one` and `_other`; Indonesian has no plural forms, so its
    // plural keys carry `_other` only. Which forms each locale carries is
    // pinned by `src/lib/i18n/fragments.test.js`; this test pins that every
    // string exists in both languages.
    /** @param {string[]} keys */
    const base = (keys) =>
      [...new Set(keys.map((k) => k.replace(/_(zero|one|two|few|many|other)$/, '')))].sort();
    expect(base(Object.keys(callOffsId))).toEqual(base(Object.keys(callOffsEn)));
  });
});

describe('PTI Call-offs page (REQ-E09-01, REQ-E09-03)', () => {
  it('shows each umbrella PO line with remaining quantity and its call-offs in their states', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    // P-12 — every call-off, in every state, is under "All call-offs".
    await openTab('All call-offs');
    const pet = await screen.findByTestId('calloff-umbrella-po-007-li-007a');
    expect(within(pet).getByTestId('calloff-remaining-li-007a')).toHaveTextContent('15,000 PCS');
    /** @param {string} id */
    const row = (id) => screen.getByTestId(`calloff-row-${id}`);
    expect(within(row('co-0001')).getByText('Late')).toBeInTheDocument();
    expect(within(row('co-0002')).getByText('Dispatched')).toBeInTheDocument();
    expect(within(row('co-0003')).getByText('Awaiting Confirmation')).toBeInTheDocument();
    expect(within(row('co-0004')).getByText('Awaiting Approval')).toBeInTheDocument();
    expect(within(row('co-0005')).getByText('At Risk')).toBeInTheDocument();
    expect(within(row('co-0009')).getByText('Escalated')).toBeInTheDocument();
    expect(within(row('co-0012')).getByText('Draft')).toBeInTheDocument();
    // CR-09 drift, by supplier NAME: the carton misses (co-0007/0008), and — BL-64 —
    // the gate demo's sup-020, whose three missed 200ml-bottle call-offs are what
    // hold its OTIF at 79%. No other supplier drifts.
    const drift = screen.getAllByTestId('pti-calloff-drift').map((el) => el.textContent ?? '');
    expect(drift).toHaveLength(2);
    expect(drift.some((t) => t.includes('PT Sample Carton Packaging'))).toBe(true);
    expect(drift.some((t) => t.includes('PT Sample PET Bottle Karawang (illustrative)'))).toBe(
      true
    );
    // AC-04 — no dock or slot booking anywhere on the page.
    expect(screen.queryByText(/dock|slot/i)).toBeNull();
  });

  it('release beyond what remains is blocked on the form; within it, the call-off is released', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const pet = await screen.findByTestId('calloff-umbrella-po-007-li-007a');
    fireEvent.click(within(pet).getByRole('button', { name: 'New call-off' }));
    fireEvent.change(panel().getByLabelText('Quantity (PCS)'), { target: { value: '15001' } });
    fireEvent.change(panel().getByLabelText('Need date'), { target: { value: '2026-09-20' } });
    expect(panel().getByTestId('calloff-exceeds-remaining')).toBeInTheDocument();
    expect(panel().getByRole('button', { name: 'Release to supplier' })).toBeDisabled();

    fireEvent.change(panel().getByLabelText('Quantity (PCS)'), { target: { value: '15000' } });
    fireEvent.click(panel().getByRole('button', { name: 'Release to supplier' }));
    await waitFor(() =>
      expect(
        callOffStore
          .all()
          .some(
            (c) =>
              c.quantity === 15000 &&
              c.needDate === '2026-09-20' &&
              c.status === 'Awaiting Confirmation'
          )
      ).toBe(true)
    );
  });

  it('generate series: previews the split and creates drafts', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const carton = await screen.findByTestId('calloff-umbrella-po-017-li-017a');
    fireEvent.click(within(carton).getByRole('button', { name: 'Generate series' }));
    fireEvent.change(panel().getByLabelText('Total quantity'), { target: { value: '7000' } });
    fireEvent.change(panel().getByLabelText('Quantity per call-off'), {
      target: { value: '3000' }
    });
    fireEvent.change(panel().getByLabelText('First need date'), {
      target: { value: '2026-09-07' }
    });
    fireEvent.click(panel().getByRole('button', { name: 'Preview' }));
    const preview = panel().getByTestId('calloff-series-preview');
    expect(within(preview).getByLabelText('Quantity for call-off 3')).toHaveValue('1000');
    fireEvent.click(panel().getByRole('button', { name: 'Create 3 drafts' }));
    await waitFor(() =>
      expect(
        callOffStore
          .all()
          .filter((c) => c.poId === 'po-017' && c.status === 'Draft')
          .map((c) => [c.quantity, c.needDate])
      ).toEqual([
        [3000, '2026-09-07'],
        [3000, '2026-09-14'],
        [1000, '2026-09-21']
      ])
    );
  });

  it('review: reject waits for a comment; approve accepts the confirmation', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    fireEvent.click(
      within(await screen.findByTestId('calloff-row-co-0004')).getByRole('button', {
        name: /Review/
      })
    );
    const review = panel().getByTestId('calloff-review');
    expect(within(review).getByRole('button', { name: 'Reject' })).toBeDisabled();
    fireEvent.click(within(review).getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(
        /** @type {import('@services/data/types').CallOff} */ (callOffStore.get('co-0004'))
          .confirmation?.approval
      ).toBe('approved')
    );
  });

  it('review: rejecting with a comment sends the call-off back to the supplier', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    fireEvent.click(
      within(await screen.findByTestId('calloff-row-co-0010')).getByRole('button', {
        name: /Review/
      })
    );
    const review = panel().getByTestId('calloff-review');
    fireEvent.change(within(review).getByLabelText(/Comment for the supplier/), {
      target: { value: 'One delivery only, please' }
    });
    fireEvent.click(within(review).getByRole('button', { name: 'Reject' }));
    await waitFor(() =>
      expect(
        /** @type {import('@services/data/types').CallOff} */ (callOffStore.get('co-0010')).status
      ).toBe('Awaiting Confirmation')
    );
    expect(
      /** @type {import('@services/data/types').CallOff} */ (callOffStore.get('co-0010'))
        .confirmation
    ).toBeUndefined();
  });

  it('a PTI seat without the planning lane sees the handoff, not the planner controls', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: { ...BUYER, businessRoles: ['finance'] } });
    await screen.findByTestId('calloff-umbrella-po-007-li-007a');
    expect(screen.queryByRole('button', { name: 'New call-off' })).toBeNull();
    expect(screen.getAllByTestId('handoff-calloff-plan').length).toBeGreaterThan(0);
  });
});

describe('Supplier Call-offs page (REQ-E09-03, REQ-E09-04)', () => {
  it('lists only its own released call-offs, with confirm-by and status', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    expect(await screen.findByText('CO-2026-0003')).toBeInTheDocument();
    expect(screen.queryByText('CO-2026-0009')).toBeNull(); // sup-008's
    expect(screen.queryByText('CO-2026-0012')).toBeNull(); // a draft
    expect(screen.getByTestId('supplier-calloff-banner')).toHaveTextContent(
      'Call-offs to confirm: 1'
    );
  });

  // The material description is the table's only free-text column. The row
  // does not bound or truncate it, so the full value is always directly
  // visible in the cell, not hidden behind a `title` tooltip.
  // BL-38 — 7 columns, not 10, so Confirmation, Delivery and the action stay on
  // a 1280px screen (measured in a browser: 304px of overflow before, 0 after,
  // in English and Indonesian). jsdom has no layout, so this holds the SHAPE:
  // the PO rides under the call-off, the type under the need date, and the
  // confirm-by deadline under the confirmation, with each header naming both.
  // The PIC (#90) rides under the material rather than as an eighth column,
  // which put 257px (EN) / 286px (ID) of overflow back at 1280px.
  it('BL-38 — seven columns, with the PO, type and confirm-by as second lines', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    const row = await screen.findByTestId('supplier-calloff-row-co-0003');
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual([
      // UCX-P2 (BL-363) — the leading select-for-confirm column.
      'Select for confirm',
      'Call-off Purchase order',
      'Material PICSample data · not from SAP yet',
      'Quantity',
      'Need date Type',
      'Confirmation Confirm by',
      'Delivery',
      'Action'
    ]);
    const cells = within(row).getAllByRole('cell');
    expect(cells).toHaveLength(8);
    expect(cells[1]).toHaveTextContent(/^CO-2026-0003PO-2025-00107$/);
    expect(
      within(/** @type {HTMLElement} */ (cells[2])).getByTestId('supplier-calloff-pic-co-0003')
    ).toBeInTheDocument();
    // Awaiting confirmation: the deadline sits under the confirmation, labelled.
    expect(
      within(/** @type {HTMLElement} */ (cells[5])).getByTestId(
        'supplier-calloff-confirm-by-co-0003'
      )
    ).toHaveTextContent(/^Confirm by \d{2} /);
    // A confirmed call-off has no deadline line.
    const confirmed = screen.getByTestId('supplier-calloff-row-co-0001');
    expect(within(confirmed).queryByTestId('supplier-calloff-confirm-by-co-0001')).toBeNull();
  });

  it('shows the full material description directly in the row', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    const row = await screen.findByTestId('supplier-calloff-row-co-0003');
    const full = 'PET Bottle 200ml Frosted — Wardah Series';
    const cell = within(row).getByText(full);
    // jsdom has no layout, so text in the DOM passes whether or not it is
    // ellipsized; the class is what decides it. Without this line the spec is
    // green on the old truncated cell too.
    expect(cell.className).not.toMatch(/\btruncate\b/);
    // …and the full value is reachable a second way, in the panel this row opens.
    fireEvent.click(within(row).getByRole('button', { name: /Respond/ }));
    expect(panel().getByText(full, { exact: false })).toBeInTheDocument();
  });

  it('confirm with a new date: the page says it goes to PTI, and the store agrees', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    fireEvent.click(
      within(await screen.findByTestId('supplier-calloff-row-co-0003')).getByRole('button', {
        name: /Respond/
      })
    );
    fireEvent.click(panel().getByLabelText('Confirm with a new date'));
    fireEvent.change(panel().getByLabelText('New delivery date'), {
      target: { value: '2026-09-09' }
    });
    expect(panel().getByTestId('supplier-calloff-tolerance')).toHaveTextContent(
      'Outside tolerance'
    );
    fireEvent.click(panel().getByRole('button', { name: 'Send confirmation' }));
    await waitFor(() =>
      expect(callOffStore.get('co-0003')).toMatchObject({
        status: 'Confirmed with New Date',
        confirmation: { approval: 'awaiting', deliveries: [{ date: '2026-09-09' }] }
      })
    );
  });

  it('confirm as requested is within tolerance', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    fireEvent.click(
      within(await screen.findByTestId('supplier-calloff-row-co-0003')).getByRole('button', {
        name: /Respond/
      })
    );
    expect(panel().getByTestId('supplier-calloff-tolerance')).toHaveTextContent('Within tolerance');
    fireEvent.click(panel().getByRole('button', { name: 'Send confirmation' }));
    await waitFor(() =>
      expect(
        /** @type {import('@services/data/types').CallOff} */ (callOffStore.get('co-0003')).status
      ).toBe('Confirmed')
    );
  });

  // UCX-P3 (BL-364) — the one step replaces "Send dispatch notice" and the
  // "Create the ASN for this call-off" link. It starts from the call-off's own
  // values (today, its need date, its agreed quantity), sends the notice and
  // opens ONE draft ASN with the same values — never the PO's open quantity
  // (UCX-F9), and never a second record for the same shipment (UCX-F10).
  it('Mark as shipped sends the notice and opens the draft ASN from the call-off’s values', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    fireEvent.click(
      within(await screen.findByTestId('supplier-calloff-row-co-0004')).getByRole('button', {
        name: /View/
      })
    );
    expect(panel().getByTestId('supplier-calloff-awaiting-approval')).toBeInTheDocument();
    expect(panel().queryByTestId('supplier-calloff-dispatch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    fireEvent.click(
      within(screen.getByTestId('supplier-calloff-row-co-0006')).getByRole('button', {
        name: /View/
      })
    );
    const c = /** @type {CallOff} */ (callOffStore.get('co-0006'));
    // UCX-D13 — the sequence prefills the next free number. The counter's
    // arithmetic is pinned in `shipmentNotice.test.js`; here the assertion is
    // that the act passes the supplier's live ASNs to it.
    const expectedSequence = nextFreeSequence(
      asnStore.all().filter((a) => a.supplierId === 'sup-007')
    );
    // The step starts from the call-off: the hub's today, its need date, its quantity.
    expect(panel().getByLabelText('Shipped date')).toHaveValue(DECLARED_PRESENT);
    expect(panel().getByLabelText('Expected arrival')).toHaveValue(c.needDate);
    expect(panel().getByLabelText('Quantity (PCS)')).toHaveValue('10000');

    fireEvent.click(panel().getByRole('button', { name: 'Mark as shipped' }));
    await waitFor(() =>
      expect(/** @type {CallOff} */ (callOffStore.get('co-0006')).dispatches).toEqual([
        expect.objectContaining({
          shippedDate: DECLARED_PRESENT,
          expectedArrival: c.needDate,
          quantity: 10000
        })
      ])
    );
    // The draft carries the call-off's line and quantity — the PO's open
    // quantity for this material is 200,000, so 10,000 can only come from it.
    await waitFor(() => {
      const draft = asnStore.all().find((a) => a.callOffId === 'co-0006' && a.status === 'Draft');
      expect(draft).toBeTruthy();
      expect(draft?.poReference).toBe('PO-2025-00107');
      expect(draft?.eta).toBe(c.needDate);
      expect(draft?.lineItems).toEqual([
        expect.objectContaining({ materialCode: 'PK-PETB-8801', shippedQty: 10000 })
      ]);
      // UCX-D13 — the sequence prefills the next free number.
      expect(draft?.sequence).toBe(expectedSequence);
    });
    // One report, one record: the step now offers its step 2 on that draft.
    const link = await panel().findByTestId('calloff-complete-details');
    expect(link).toHaveTextContent('Complete the delivery details');
    expect(link.getAttribute('href')).toContain('draft=ASN-2026-901');
  });
});

describe('CR-05 on the screens — the applied rule and its reason (BL-47)', () => {
  /** @param {string} id */
  const respondTo = async (id) => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    fireEvent.click(
      within(await screen.findByTestId(`supplier-calloff-row-${id}`)).getByRole('button', {
        name: /Respond/
      })
    );
    fireEvent.click(panel().getByLabelText('Confirm with a different quantity'));
  };
  /** @param {string} value */
  const typeQty = (value) =>
    fireEvent.change(panel().getByLabelText('Quantity (PCS)'), { target: { value } });

  it('supplier, before sending: exactly +5% is within, and the rule says why', async () => {
    await respondTo('co-0003'); // 15,000 PCS
    typeQty('15750');
    expect(panel().getByTestId('supplier-calloff-tolerance')).toHaveTextContent('Within tolerance');
    expect(panel().getByTestId('supplier-calloff-tolerance-rule')).toHaveTextContent(
      '750 PCS over the requested quantity (5%). Up to 5% over is accepted automatically.'
    );
  });

  it('supplier, before sending: one unit beyond +5% is outside, and the rule says PTI must approve', async () => {
    await respondTo('co-0003');
    typeQty('15751');
    expect(panel().getByTestId('supplier-calloff-tolerance')).toHaveTextContent(
      'Outside tolerance'
    );
    expect(panel().getByTestId('supplier-calloff-tolerance-rule')).toHaveTextContent(
      'More than 5% over needs PTI approval.'
    );
  });

  it('supplier, before sending: a shortfall is within — a partial delivery that stays visible', async () => {
    await respondTo('co-0003');
    typeQty('9000');
    expect(panel().getByTestId('supplier-calloff-tolerance')).toHaveTextContent('Within tolerance');
    expect(panel().getByTestId('supplier-calloff-tolerance-rule')).toHaveTextContent(
      '6,000 PCS short of the requested quantity (40%). Accepted as a partial delivery'
    );
    fireEvent.click(panel().getByRole('button', { name: 'Send confirmation' }));
    await waitFor(() =>
      expect(callOffStore.get('co-0003')).toMatchObject({
        status: 'Confirmed with Changes',
        confirmation: { approval: 'auto' }
      })
    );
  });

  it('planner: the later-date answer (CO-2026-0004) names the rule on the row and in the review panel', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const row = await screen.findByTestId('calloff-row-co-0004');
    expect(within(row).getByTestId('calloff-tol-co-0004')).toHaveTextContent(
      'Later date, needs approval'
    );
    fireEvent.click(within(row).getByRole('button', { name: /Review/ }));
    expect(panel().getByTestId('calloff-tolerance-applied')).toHaveTextContent(
      'A later date always needs PTI approval.'
    );
  });

  it('planner: the exactly-+5% JIT answer (CO-2026-0005) reads as accepted on the row', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const row = await screen.findByTestId('calloff-row-co-0005');
    expect(within(row).getByTestId('calloff-tol-co-0005')).toHaveTextContent(
      '500 PCS over (5%), accepted'
    );
  });
});

describe('CR-04 on the screens — release by remaining quantity, value only without one (BL-49)', () => {
  it('the new call-off panel states the remaining quantity and refuses over-release with the figures', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const pet = await screen.findByTestId('calloff-umbrella-po-007-li-007a');
    expect(within(pet).getByTestId('calloff-basis-li-007a')).toHaveTextContent(
      'checked against the remaining quantity'
    );
    fireEvent.click(within(pet).getByRole('button', { name: 'New call-off' }));
    expect(panel().getByTestId('calloff-new-remaining')).toHaveTextContent(
      'Remaining on this line: 15,000 PCS'
    );
    fireEvent.change(panel().getByLabelText('Quantity (PCS)'), { target: { value: '15001' } });
    expect(panel().getByTestId('calloff-exceeds-remaining')).toHaveTextContent(
      '15,001 PCS is more than the 15,000 PCS remaining on this line. Release is not possible.'
    );
    fireEvent.change(panel().getByLabelText('Quantity (PCS)'), { target: { value: '15000' } });
    expect(panel().queryByTestId('calloff-exceeds-remaining')).toBeNull();
  });

  it('draft CO-2026-0018 over the remaining quantity: refused on the panel, release disabled', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    fireEvent.click(
      within(await screen.findByTestId('calloff-row-co-0018')).getByRole('button', {
        name: /Open draft/
      })
    );
    expect(panel().getByTestId('calloff-draft-remaining')).toHaveTextContent(
      'Remaining on this line: 37,000 PCS'
    );
    expect(panel().getByTestId('calloff-draft-exceeds-remaining')).toHaveTextContent(
      '45,000 PCS is more than the 37,000 PCS remaining on this line.'
    );
    expect(panel().getByRole('button', { name: 'Release to supplier' })).toBeDisabled();
  });

  it('draft CO-2026-0019 of exactly the remainder releases, and the store agrees', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    fireEvent.click(
      within(await screen.findByTestId('calloff-row-co-0019')).getByRole('button', {
        name: /Open draft/
      })
    );
    expect(panel().queryByTestId('calloff-draft-exceeds-remaining')).toBeNull();
    fireEvent.click(panel().getByRole('button', { name: 'Release to supplier' }));
    await waitFor(() =>
      expect(
        /** @type {import('@services/data/types').CallOff} */ (callOffStore.get('co-0019')).status
      ).toBe('Awaiting Confirmation')
    );
  });

  it('the value-limit line (po-028) shows no quantity, checks value, and refuses draft CO-2026-0021 on value', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    const line = await screen.findByTestId('calloff-umbrella-po-028-li-028a');
    expect(within(line).getByTestId('calloff-basis-li-028a')).toHaveTextContent(
      'No quantity on this line'
    );
    expect(within(line).queryByTestId('calloff-remaining-li-028a')).toBeNull();
    expect(within(line).getByTestId('calloff-remaining-value-li-028a')).toHaveTextContent(
      '280.000.000'
    );
    fireEvent.click(
      within(screen.getByTestId('calloff-row-co-0021')).getByRole('button', { name: /Open draft/ })
    );
    expect(panel().getByTestId('calloff-draft-exceeds-remaining')).toHaveTextContent(
      'which has no quantity'
    );
    expect(panel().getByRole('button', { name: 'Release to supplier' })).toBeDisabled();
  });

  it('the demo rows carry their CR-05 tag on the planner rows: +5.1% (0014), partial (0015), earlier (0016)', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    expect(await screen.findByTestId('calloff-tol-co-0014')).toHaveTextContent(
      '408 PCS over (5.1%), needs approval'
    );
    expect(screen.getByTestId('calloff-tol-co-0015')).toHaveTextContent('Partial: 600 PCS short');
    expect(screen.getByTestId('calloff-tol-co-0016')).toHaveTextContent(
      'Earlier date, needs approval'
    );
    expect(screen.getByTestId('calloff-tol-co-0017')).toHaveTextContent(
      '200 PCS over (5%), accepted'
    );
  });

  // Found in the built app, not by a spec: once the planner approved the
  // earlier-date answer, its row still read "needs approval". The finding is the
  // rule's; the verdict is the call-off's.
  it('after the planner approves CO-2026-0014, its row says approved — not "needs approval"', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    fireEvent.click(
      within(await screen.findByTestId('calloff-row-co-0014')).getByRole('button', {
        name: /Review/
      })
    );
    fireEvent.click(
      within(panel().getByTestId('calloff-review')).getByRole('button', { name: 'Approve' })
    );
    await waitFor(() =>
      expect(
        /** @type {import('@services/data/types').CallOff} */ (callOffStore.get('co-0014'))
          .confirmation?.approval
      ).toBe('approved')
    );
    await waitFor(() =>
      expect(screen.getByTestId('calloff-tol-co-0014')).toHaveTextContent(
        '408 PCS over (5.1%), approved by PTI'
      )
    );
    expect(screen.getByTestId('calloff-tol-co-0014')).not.toHaveTextContent('needs approval');
  });

  it('…and on the supplier rows', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    expect(await screen.findByTestId('supplier-calloff-tol-co-0014')).toHaveTextContent(
      'needs approval'
    );
    expect(screen.getByTestId('supplier-calloff-tol-co-0015')).toHaveTextContent(
      'Partial: 600 PCS short'
    );
    expect(screen.getByTestId('supplier-calloff-tol-co-0005')).toHaveTextContent(
      '500 PCS over (5%), accepted'
    );
  });
});

describe('Home tasks (CR-09)', () => {
  it('supplier: call-offs to confirm, and confirmed call-offs due within 7 days with no dispatch notice', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    expect(await screen.findByTestId('home-task-confirm-calloffs')).toHaveTextContent(
      'Call-offs to confirm'
    );
    expect(screen.getByTestId('home-task-calloffs-due')).toHaveTextContent(
      'Call-offs due within 7 days with no ASN or dispatch notice'
    );
  });

  it('supplier sup-008: its escalated call-off makes the confirm task critical-listed; nothing due', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUP_008 });
    expect(await screen.findByTestId('home-task-confirm-calloffs')).toBeInTheDocument();
    expect(screen.queryByTestId('home-task-calloffs-due')).toBeNull();
  });

  it('PTI planner: at risk, awaiting approval, escalated and delivery drift', async () => {
    renderWithProviders(<BuyerHome />, { identity: PLANNER });
    expect(await screen.findByTestId('home-task-calloffs-at-risk')).toHaveTextContent(
      'Call-offs at risk'
    );
    expect(screen.getByTestId('home-task-calloffs-approval')).toHaveTextContent(
      'Call-offs awaiting your approval'
    );
    expect(screen.getByTestId('home-task-calloffs-escalated')).toHaveTextContent(
      'Escalated call-offs'
    );
    expect(screen.getByTestId('home-task-calloffs-drift')).toHaveTextContent('Delivery drift');
  });
});

describe('Order summary (REQ-E07-03 with call-offs)', () => {
  it('shows the call-off count and the most urgent confirmation status per PO', async () => {
    renderWithProviders(<BuyerOrderSummary />, { identity: PLANNER });
    expect(await screen.findByTestId('order-summary-calloffs-po-007')).toHaveTextContent(
      '6Awaiting approval'
    );
    expect(screen.getByTestId('order-summary-calloffs-po-017')).toHaveTextContent('3Escalated');
    expect(screen.getByTestId('order-summary-calloffs-po-001')).toHaveTextContent('—');
  });
});

// D9 (deep-links PR #74 review): BuyerCallOffs/SupplierCallOffs read a
// `?status=` filter from the URL (the deep-link a My Tasks item sends), but
// had no page-level spec rendering the route with the param. One spec per
// page asserts the filtered rows; one asserts the old, unfiltered default.
describe('D9 — the `?status=` deep link BuyerCallOffs/SupplierCallOffs read', () => {
  it('BuyerCallOffs: `?status=awaitingApproval` selects that chip and keeps only call-offs awaiting approval', async () => {
    renderWithProviders(<BuyerCallOffs />, {
      identity: PLANNER,
      route: '/buyer/call-offs?status=awaitingApproval'
    });
    expect(await screen.findByTestId('calloff-row-co-0004')).toBeInTheDocument();
    expect(screen.queryByTestId('calloff-row-co-0001')).toBeNull();
    expect(screen.getByRole('radio', { name: /Awaiting approval/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('BuyerCallOffs: no `status` param opens To act with every chip off (`Everything to act on`), and All call-offs still shows every row', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER, route: '/buyer/call-offs' });
    expect(await screen.findByTestId('calloff-row-co-0004')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'To act' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: /^Everything to act on/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    // P-12 — a dispatched call-off with nothing to act on is not in To act.
    expect(screen.queryByTestId('calloff-row-co-0002')).toBeNull();
    await openTab('All call-offs');
    expect(await screen.findByTestId('calloff-row-co-0002')).toBeInTheDocument();
    expect(screen.getByTestId('calloff-row-co-0001')).toBeInTheDocument();
    expect(screen.getByTestId('calloff-row-co-0004')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^Everything to act on/ })).toBeNull();
  });

  it("SupplierCallOffs: `?status=toConfirm` selects that chip and keeps only the call-off awaiting this supplier's confirmation", async () => {
    renderWithProviders(<SupplierCallOffs />, {
      identity: SUPPLIER,
      route: '/supplier/call-offs?status=toConfirm'
    });
    expect(await screen.findByTestId('supplier-calloff-row-co-0003')).toBeInTheDocument();
    expect(screen.queryByTestId('supplier-calloff-row-co-0001')).toBeNull();
    expect(screen.getByRole('radio', { name: /Awaiting your confirmation/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('SupplierCallOffs: no `status` param renders exactly as before this feature — `All` selected, every row shown', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER, route: '/supplier/call-offs' });
    expect(await screen.findByTestId('supplier-calloff-row-co-0003')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-calloff-row-co-0001')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^All/ })).toHaveAttribute('aria-checked', 'true');
  });
});
