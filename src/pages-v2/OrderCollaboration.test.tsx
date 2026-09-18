// ─────────────────────────────────────────────────────────────────────────────
// Order collaboration phase 2a on the screens: the supplier's Adjust / Reject,
// the planner's counter-offer review, the shipping notice, Home, and the Order
// summary pages (REQ-E07-02, REQ-E07-03, REQ-E07-05).
//
// Every walk ends in the STORE, not only in the DOM: a toast can lie, the
// store is what the next reader sees.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import { POStatus } from '../services/data/types';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import i18n from '../lib/i18n';
import SupplierOrders from './SupplierOrders';
import BuyerOrders from './BuyerOrders';
import BuyerHome from './BuyerHome';
import BuyerOrderSummary from './BuyerOrderSummary';
import SupplierOrderSummary from './SupplierOrderSummary';

beforeEach(() => {
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});

const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);

const openSupplierPo = async (poNumber: string, identity = SUPPLIER) => {
  renderWithProviders(<SupplierOrders />, { identity });
  fireEvent.click(await screen.findByText(poNumber));
  await waitFor(() => expect(panel().getByRole('heading', { name: new RegExp(poNumber) })).toBeInTheDocument());
};

describe('supplier — Adjust (REQ-E07-02 AC-02)', () => {
  it('cannot send until a line has a reason and a valid quantity; then the PO is Adjusted', async () => {
    await openSupplierPo('PO-2025-00108');
    expect(panel().getByTestId('po-respond-by')).toBeInTheDocument();
    fireEvent.click(panel().getByRole('button', { name: 'Confirm order' }));
    fireEvent.click(panel().getByRole('button', { name: 'Adjust' }));
    const send = panel().getByRole('button', { name: 'Send adjustment' });
    expect(send).toBeDisabled(); // no line chosen yet

    fireEvent.click(panel().getByRole('checkbox'));
    expect(send).toBeDisabled(); // no reason yet
    fireEvent.change(panel().getByLabelText('Reason'), { target: { value: 'capacity' } });
    fireEvent.change(panel().getByLabelText('Quantity you can supply'), { target: { value: '200000' } });
    expect(panel().getByRole('alert')).toHaveTextContent('not more than 150000');
    expect(send).toBeDisabled();

    fireEvent.change(panel().getByLabelText('Quantity you can supply'), { target: { value: '120000' } });
    fireEvent.change(panel().getByLabelText('Date you can deliver'), { target: { value: '2025-05-10' } });
    expect(send).not.toBeDisabled();
    fireEvent.click(send);

    await waitFor(() => expect(purchaseOrderStore.get('po-008')!.status).toBe(POStatus.ADJUSTED));
    expect(purchaseOrderStore.get('po-008')!.response?.lines).toEqual([
      { lineId: 'li-008a', reasonCode: 'capacity', counterQty: 120000, counterDate: '2025-05-10' },
    ]);
  });
});

describe('supplier — Reject (AC-03)', () => {
  it('needs a cause; then the PO is Rejected with its causes', async () => {
    await openSupplierPo('PO-2025-00108');
    fireEvent.click(panel().getByRole('button', { name: 'Confirm order' }));
    fireEvent.click(panel().getByRole('button', { name: 'Reject' }));
    const send = panel().getByRole('button', { name: 'Send rejection' });
    expect(send).toBeDisabled();
    fireEvent.click(panel().getByLabelText('Quantity'));
    fireEvent.change(panel().getByLabelText('Comment (optional)'), { target: { value: 'Mould broken' } });
    fireEvent.click(send);
    await waitFor(() => expect(purchaseOrderStore.get('po-008')!.status).toBe(POStatus.REJECTED));
    expect(purchaseOrderStore.get('po-008')!.response).toMatchObject({
      option: 'reject',
      rejectionCauses: ['quantity'],
      comment: 'Mould broken',
    });
  });

  it('a seat without fulfilment reads the wait instead of Adjust / Reject', async () => {
    const commercial = { ...SUPPLIER, businessRoles: ['supplier', 'commercial'] };
    await openSupplierPo('PO-2025-00108', commercial);
    expect(panel().queryByRole('button', { name: 'Adjust' })).toBeNull();
    expect(panel().getByTestId('handoff-po-confirm')).toBeInTheDocument();
  });
});

describe('supplier — shipping notice (REQ-E07-05)', () => {
  it('saves the expected completion date on a confirmed PO', async () => {
    await openSupplierPo('PO-2025-00107');
    expect(panel().getByTestId('po-shipping-notice')).toHaveTextContent('Not given yet.');
    fireEvent.change(panel().getByLabelText('Expected completion date'), { target: { value: '2025-04-20' } });
    fireEvent.click(panel().getByRole('button', { name: 'Save date' }));
    await waitFor(() =>
      expect(purchaseOrderStore.get('po-007')!.shippingNotice?.expectedCompletionDate).toBe('2025-04-20'),
    );
    expect(purchaseOrderStore.get('po-007')!.status).toBe(POStatus.CONFIRMED);
  });
});

describe('planner — counter-offer review on BuyerOrders', () => {
  const adjustPo008 = () =>
    purchaseOrderStore.update('po-008', (po) => ({
      ...po,
      status: POStatus.ADJUSTED,
      response: {
        option: 'adjust',
        respondedAt: '2025-04-03T05:00:00.000Z',
        lines: [{ lineId: 'li-008a', reasonCode: 'material', counterQty: 100000, counterDate: '2025-05-02' }],
      },
    }));

  it('accepting confirms the PO at the counter-offer', async () => {
    adjustPo008();
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    expect(panel().getByTestId('po-response-details')).toHaveTextContent('Material');
    fireEvent.click(panel().getByRole('button', { name: 'Accept counter-offer' }));
    await waitFor(() => expect(purchaseOrderStore.get('po-008')!.status).toBe(POStatus.CONFIRMED));
    expect(purchaseOrderStore.get('po-008')!.lineItems[0].confirmedQty).toBe(100000);
  });

  it('rejecting needs a comment, and reopens the PO for the supplier', async () => {
    adjustPo008();
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    fireEvent.click(panel().getByRole('button', { name: 'Reject counter-offer' }));
    const send = panel().getByRole('button', { name: 'Send back to supplier' });
    expect(send).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Comment for the supplier'), { target: { value: 'Full quantity needed' } });
    fireEvent.click(send);
    await waitFor(() => expect(purchaseOrderStore.get('po-008')!.status).toBe(POStatus.SENT));
  });

  it('a buyer seat without procurement reads the wait, naming Procurement', async () => {
    adjustPo008();
    const receivingOnly = { ...BUYER, businessRoles: ['receiving'] };
    renderWithProviders(<BuyerOrders />, { identity: receivingOnly });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    const notice = panel().getByTestId('handoff-po-review-response');
    expect(notice).toHaveTextContent(i18n.t('roles.owner.procurement'));
    expect(panel().queryByRole('button', { name: 'Accept counter-offer' })).toBeNull();
  });

  it('the Escalated and Rejected tabs exist and a rejected PO names its supplier', async () => {
    purchaseOrderStore.update('po-008', (po) => ({
      ...po,
      status: POStatus.REJECTED,
      response: { option: 'reject', respondedAt: '2025-04-03T05:00:00.000Z', rejectionCauses: ['date'] },
    }));
    renderWithProviders(<BuyerOrders />, { identity: BUYER });
    fireEvent.click(await screen.findByRole('tab', { name: /^Rejected/ }));
    const row = (await screen.findByText('PO-2025-00108')).closest('tr')!;
    expect(row).toHaveTextContent('PT Sample Packaging Indonesia');
    expect(screen.getByRole('tab', { name: /^Escalated/ })).toBeInTheDocument();
  });
});

describe('PTI Home', () => {
  it('shows escalated and rejected purchase orders as urgent tasks', async () => {
    purchaseOrderStore.update('po-008', (po) => ({
      ...po,
      status: POStatus.REJECTED,
      response: { option: 'reject', respondedAt: '2025-04-03T05:00:00.000Z', rejectionCauses: ['date'] },
    }));
    renderWithProviders(<BuyerHome />, { identity: { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer } });
    const rejected = await screen.findByTestId('home-task-rejected-po');
    expect(rejected).toHaveTextContent('Rejected purchase orders');
    // ⚠️ THE REASON THIS TASK IS NON-EMPTY CHANGED. It read "the fixture orders
    // are dated 2025, long past any deadline: every unanswered one is
    // escalated" — true, and true of EVERY order, which made the assertion
    // unfalsifiable by anything short of deleting the projection. The orders are
    // anchored to the declared present now, and the seed deliberately holds BOTH
    // shapes: `po-021` is sent on the present and is NOT escalated, while the
    // older unanswered ones are. So this counts something the fixture could get
    // wrong, and `BuyerOrders`' Escalated tab is reachable rather than universal.
    expect(await screen.findByTestId('home-task-escalated-po')).toHaveTextContent('Escalated purchase orders');
    expect(screen.queryByText(/after 48 hours/)).toBeNull();
  });
});

describe('Order summary pages (REQ-E07-03)', () => {
  it('PTI: one row per PO with supplier, response, ASNs and the 3 confirmations', async () => {
    renderWithProviders(<BuyerOrderSummary />, { identity: BUYER });
    expect(await screen.findByRole('columnheader', { name: 'Supplier' })).toBeInTheDocument();
    const row = await screen.findByTestId('order-summary-row-po-007');
    expect(row).toHaveTextContent('PO-2025-00107');
    expect(row).toHaveTextContent('PT Sample Packaging Indonesia');
    // REQ-E08-04 — capacity is wired: sup-007's rigid plastic packaging
    // submission has a week below demand, so po-007 reads Gap (was Not started).
    expect(within(row).getByTestId('order-summary-capacity')).toHaveTextContent('Gap');
    expect(within(row).getByTestId('order-summary-shipping-po-007')).toHaveTextContent('Missing');
    expect(within(row).getByRole('link', { name: 'PO-2025-00107' })).toHaveAttribute(
      'href',
      '/buyer/orders?po=po-007',
    );
    expect(screen.getByTestId('order-summary-row-po-001')).toBeInTheDocument();
  });

  it('supplier: only its own POs, linking to its own pages', async () => {
    renderWithProviders(<SupplierOrderSummary />, { identity: SUPPLIER });
    const row = await screen.findByTestId('order-summary-row-po-008');
    expect(within(row).getByRole('link', { name: 'PO-2025-00108' })).toHaveAttribute(
      'href',
      '/supplier/orders?po=po-008',
    );
    expect(screen.getByTestId('order-summary-row-po-007')).toBeInTheDocument();
    expect(screen.queryByTestId('order-summary-row-po-001')).toBeNull(); // sup-001's
    expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull(); // no supplier column on the supplier side
  });

  it('a summary link opens that PO on the orders page', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER, route: '/supplier/orders?po=po-007' });
    await waitFor(() =>
      expect(panel().getByRole('heading', { name: /PO-2025-00107/ })).toBeInTheDocument(),
    );
    expect(panel().getByTestId('po-lifecycle-steps')).toBeInTheDocument();
  });
});
