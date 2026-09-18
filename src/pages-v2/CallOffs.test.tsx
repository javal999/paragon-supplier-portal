// ─────────────────────────────────────────────────────────────────────────────
// Call-off management on the screens (REQ-E09-01, REQ-E09-03, REQ-E09-04): the
// PTI and supplier Call-offs pages, the menu, the Home tasks and the Order
// summary column. Every walk that acts ends in the STORE, not only in the DOM.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { callOffStore } from '../services/data/mock/stores/callOffStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { PTI_NAV, SUPPLIER_NAV } from '../components/layout-v2/navConfig';
import { callOffsEn, callOffsId } from '../lib/i18n/callOffs';
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

const SUP_008: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-008',
  supplierName: 'PT Sample Carton Packaging',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
};
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);

describe('menu and copy', () => {
  it('both menus point Call-offs at the new pages; the old routes are out of the menu', () => {
    const all = [...PTI_NAV, ...SUPPLIER_NAV].flatMap((s) => s.items.map((i) => i.path));
    expect(all).toContain('/buyer/call-offs');
    expect(all).toContain('/supplier/call-offs');
    expect(all.filter((p) => p.includes('delivery-agreements'))).toEqual([]);
  });

  it('every new string exists in EN and ID', () => {
    expect(Object.keys(callOffsId).sort()).toEqual(Object.keys(callOffsEn).sort());
  });
});

describe('PTI Call-offs page (REQ-E09-01, REQ-E09-03)', () => {
  it('shows each umbrella PO line with remaining quantity and its call-offs in their states', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const pet = await screen.findByTestId('calloff-umbrella-po-007-li-007a');
    expect(within(pet).getByTestId('calloff-remaining-li-007a')).toHaveTextContent('15,000 PCS');
    const row = (id: string) => screen.getByTestId(`calloff-row-${id}`);
    expect(within(row('co-0001')).getByText('Late')).toBeInTheDocument();
    expect(within(row('co-0002')).getByText('Dispatched')).toBeInTheDocument();
    expect(within(row('co-0003')).getByText('Awaiting Confirmation')).toBeInTheDocument();
    expect(within(row('co-0004')).getByText('Awaiting Approval')).toBeInTheDocument();
    expect(within(row('co-0005')).getByText('At Risk')).toBeInTheDocument();
    expect(within(row('co-0009')).getByText('Escalated')).toBeInTheDocument();
    expect(within(row('co-0012')).getByText('Draft')).toBeInTheDocument();
    expect(screen.getByTestId('pti-calloff-drift')).toHaveTextContent('PT Sample Carton Packaging');
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
      expect(callOffStore.all().some((c) => c.quantity === 15000 && c.needDate === '2026-09-20' && c.status === 'Awaiting Confirmation')).toBe(true),
    );
  });

  it('generate series: previews the split and creates drafts', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const carton = await screen.findByTestId('calloff-umbrella-po-017-li-017a');
    fireEvent.click(within(carton).getByRole('button', { name: 'Generate series' }));
    fireEvent.change(panel().getByLabelText('Total quantity'), { target: { value: '7000' } });
    fireEvent.change(panel().getByLabelText('Quantity per call-off'), { target: { value: '3000' } });
    fireEvent.change(panel().getByLabelText('First need date'), { target: { value: '2026-09-07' } });
    fireEvent.click(panel().getByRole('button', { name: 'Preview' }));
    const preview = panel().getByTestId('calloff-series-preview');
    expect(within(preview).getByLabelText('Quantity for call-off 3')).toHaveValue('1000');
    fireEvent.click(panel().getByRole('button', { name: 'Create 3 drafts' }));
    await waitFor(() =>
      expect(
        callOffStore
          .all()
          .filter((c) => c.poId === 'po-017' && c.status === 'Draft')
          .map((c) => [c.quantity, c.needDate]),
      ).toEqual([
        [3000, '2026-09-07'],
        [3000, '2026-09-14'],
        [1000, '2026-09-21'],
      ]),
    );
  });

  it('review: reject waits for a comment; approve accepts the confirmation', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    fireEvent.click(within(await screen.findByTestId('calloff-row-co-0004')).getByRole('button', { name: /Review/ }));
    const review = panel().getByTestId('calloff-review');
    expect(within(review).getByRole('button', { name: 'Reject' })).toBeDisabled();
    fireEvent.click(within(review).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(callOffStore.get('co-0004')!.confirmation?.approval).toBe('approved'));
  });

  it('review: rejecting with a comment sends the call-off back to the supplier', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    fireEvent.click(within(await screen.findByTestId('calloff-row-co-0010')).getByRole('button', { name: /Review/ }));
    const review = panel().getByTestId('calloff-review');
    fireEvent.change(within(review).getByLabelText(/Comment for the supplier/), { target: { value: 'One delivery only, please' } });
    fireEvent.click(within(review).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(callOffStore.get('co-0010')!.status).toBe('Awaiting Confirmation'));
    expect(callOffStore.get('co-0010')!.confirmation).toBeUndefined();
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
    expect(screen.getByTestId('supplier-calloff-banner')).toHaveTextContent('Call-offs to confirm: 1');
  });

  // ⚠️ NEW BEHAVIOUR — the material description is now BOUNDED. Ten columns is the
  // widest table in the hub and this is its only free-text one; unbounded it wrapped
  // over several lines at 1280–1440px and pushed the Action column off the edge.
  // Truncation is only honest if the whole value stays REACHABLE, so the guard is
  // bilateral: the cell must truncate AND must still carry the full string, and the
  // row's side panel must print it in full. A `truncate` with no `title` passes a
  // "does it truncate?" spec and loses the value, which is the failure this pins.
  it('the material description is truncated in the row and kept whole on the title', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    const row = await screen.findByTestId('supplier-calloff-row-co-0003');
    const full = 'PET Bottle 200ml Frosted — Wardah Series';
    const cell = within(row).getByTitle(full);
    expect(cell).toHaveTextContent(full);
    expect(cell.className).toContain('truncate');
    // Bounded, not merely clipped: an unbounded `truncate` inside a table cell does
    // nothing, so the max-width is the half that makes the class bite.
    expect(cell.className).toMatch(/max-w-\[/);
    // …and the full value is reachable a second way, in the panel this row opens.
    fireEvent.click(within(row).getByRole('button', { name: /Respond/ }));
    expect(panel().getByText(full, { exact: false })).toBeInTheDocument();
  });

  it('confirm with a new date: the page says it goes to PTI, and the store agrees', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    fireEvent.click(within(await screen.findByTestId('supplier-calloff-row-co-0003')).getByRole('button', { name: /Respond/ }));
    fireEvent.click(panel().getByLabelText('Confirm with a new date'));
    fireEvent.change(panel().getByLabelText('New delivery date'), { target: { value: '2026-09-09' } });
    expect(panel().getByTestId('supplier-calloff-tolerance')).toHaveTextContent('Outside tolerance');
    fireEvent.click(panel().getByRole('button', { name: 'Send confirmation' }));
    await waitFor(() =>
      expect(callOffStore.get('co-0003')).toMatchObject({
        status: 'Confirmed with New Date',
        confirmation: { approval: 'awaiting', deliveries: [{ date: '2026-09-09' }] },
      }),
    );
  });

  it('confirm as requested is within tolerance', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    fireEvent.click(within(await screen.findByTestId('supplier-calloff-row-co-0003')).getByRole('button', { name: /Respond/ }));
    expect(panel().getByTestId('supplier-calloff-tolerance')).toHaveTextContent('Within tolerance');
    fireEvent.click(panel().getByRole('button', { name: 'Send confirmation' }));
    await waitFor(() => expect(callOffStore.get('co-0003')!.status).toBe('Confirmed'));
  });

  it('a dispatch notice is offered only on an accepted confirmation, and is recorded', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    fireEvent.click(within(await screen.findByTestId('supplier-calloff-row-co-0004')).getByRole('button', { name: /View/ }));
    expect(panel().getByTestId('supplier-calloff-awaiting-approval')).toBeInTheDocument();
    expect(panel().queryByTestId('supplier-calloff-dispatch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    fireEvent.click(within(screen.getByTestId('supplier-calloff-row-co-0006')).getByRole('button', { name: /View/ }));
    fireEvent.change(panel().getByLabelText('Shipped date'), { target: { value: '2026-09-01' } });
    fireEvent.change(panel().getByLabelText('Expected arrival'), { target: { value: '2026-09-02' } });
    fireEvent.click(panel().getByRole('button', { name: 'Send dispatch notice' }));
    await waitFor(() =>
      expect(callOffStore.get('co-0006')!.dispatches).toEqual([
        expect.objectContaining({ shippedDate: '2026-09-01', expectedArrival: '2026-09-02', quantity: 10000 }),
      ]),
    );
  });
});

describe('Home tasks (CR-09)', () => {
  it('supplier: call-offs to confirm, and confirmed call-offs due within 7 days with no dispatch notice', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    expect(await screen.findByTestId('home-task-confirm-calloffs')).toHaveTextContent('Call-offs to confirm');
    expect(screen.getByTestId('home-task-calloffs-due')).toHaveTextContent('Call-offs due within 7 days with no ASN or dispatch notice');
  });

  it('supplier sup-008: its escalated call-off makes the confirm task critical-listed; nothing due', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUP_008 });
    expect(await screen.findByTestId('home-task-confirm-calloffs')).toBeInTheDocument();
    expect(screen.queryByTestId('home-task-calloffs-due')).toBeNull();
  });

  it('PTI planner: at risk, awaiting approval, escalated and delivery drift', async () => {
    renderWithProviders(<BuyerHome />, { identity: PLANNER });
    expect(await screen.findByTestId('home-task-calloffs-at-risk')).toHaveTextContent('Call-offs at risk');
    expect(screen.getByTestId('home-task-calloffs-approval')).toHaveTextContent('Call-offs awaiting your approval');
    expect(screen.getByTestId('home-task-calloffs-escalated')).toHaveTextContent('Escalated call-offs');
    expect(screen.getByTestId('home-task-calloffs-drift')).toHaveTextContent('Delivery drift');
  });
});

describe('Order summary (REQ-E07-03 with call-offs)', () => {
  it('shows the call-off count and the most urgent confirmation status per PO', async () => {
    renderWithProviders(<BuyerOrderSummary />, { identity: PLANNER });
    expect(await screen.findByTestId('order-summary-calloffs-po-007')).toHaveTextContent('6Awaiting approval');
    expect(screen.getByTestId('order-summary-calloffs-po-017')).toHaveTextContent('3Escalated');
    expect(screen.getByTestId('order-summary-calloffs-po-001')).toHaveTextContent('—');
  });
});
