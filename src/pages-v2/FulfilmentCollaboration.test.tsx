// ─────────────────────────────────────────────────────────────────────────────
// Order collaboration phase 2b on the screens: the supplier Goods receipts page,
// PTI's disputed-discrepancy section, the Home tasks, the ASN cancel, and the
// supplier invoice status list (REQ-E07-04, REQ-E07-06, REQ-E07-07).
//
// Every walk ends in the STORE, not only in the DOM.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import type { CurrentIdentity } from '@context/CurrentIdentityContext';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { receiptDiscrepancyStore } from '@services/data/mock/stores/receiptDiscrepancyStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { invoiceStore } from '@services/data/mock/stores/invoiceStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';
import { SUPPLIER_NAV } from '@components/layout-v2/navConfig';
import { fulfilmentCollaborationEn, fulfilmentCollaborationId } from '@lib/i18n/fulfilmentCollaboration';
import SupplierGoodsReceipts from './SupplierGoodsReceipts';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import SupplierHome from './SupplierHome';
import BuyerHome from './BuyerHome';
import SupplierShipments from './SupplierShipments';
import SupplierInvoices from './SupplierInvoices';

beforeEach(() => {
  goodsReceiptStore.reset();
  receiptDiscrepancyStore.reset();
  asnStore.reset();
  invoiceStore.reset();
  purchaseOrderStore.reset();
});

// sup-008 owns gr-006 (Posted to SAP, 5,000 rejected) and gr-008 (under inspection).
const SUP_008: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-008',
  supplierName: 'PT Sample Carton',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
};

const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);

describe('menu and copy', () => {
  it('supplier Orders lists Goods receipts right after Shipments & ASN', () => {
    const orders = SUPPLIER_NAV.find((s) => s.id === 'orders')!;
    const paths = orders.items.map((i) => i.path);
    expect(paths.indexOf('/supplier/goods-receipts')).toBe(paths.indexOf('/supplier/shipments') + 1);
    expect(i18n.t('hub.nav.sup.goodsReceipts')).toBe('Goods receipts');
  });

  it('every new string exists in EN and ID', () => {
    expect(Object.keys(fulfilmentCollaborationId).sort()).toEqual(Object.keys(fulfilmentCollaborationEn).sort());
  });
});

describe('supplier Goods receipts page (REQ-E07-06)', () => {
  it('shows only its own receipts with shipped, received, rejected, QC result and the discrepancy flag', async () => {
    renderWithProviders(<SupplierGoodsReceipts />, { identity: SUP_008 });
    expect(await screen.findByText('GR-2026-006')).toBeInTheDocument();
    expect(screen.getByText('GR-2026-008')).toBeInTheDocument();
    expect(screen.queryByText('GR-2026-002')).toBeNull(); // sup-007's
    const row = screen.getByText('GR-2026-006').closest('tr')!;
    expect(within(row).getAllByText('240,000')).toHaveLength(2); // shipped and received
    expect(within(row).getByText('5,000')).toBeInTheDocument();
    expect(within(row).getByText('Partially Approved')).toBeInTheDocument();
    expect(within(row).getByText('Discrepancy')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-gr-discrepancy-banner')).toHaveTextContent('1 receipt discrepancy');
    // The internal checklist never reaches the supplier.
    expect(screen.queryByText(/halal/i)).toBeNull();
  });

  it('empty state for a supplier with no receipts', async () => {
    renderWithProviders(<SupplierGoodsReceipts />, { identity: { ...SUP_008, supplierId: 'sup-999' } });
    expect(await screen.findByText('No goods receipts yet')).toBeInTheDocument();
  });

  it('dispute needs a comment; then the receipt reads Disputed', async () => {
    renderWithProviders(<SupplierGoodsReceipts />, { identity: SUP_008 });
    fireEvent.click(await screen.findByRole('button', { name: 'Respond GR-2026-006' }));
    const dispute = panel().getByRole('button', { name: 'Dispute' });
    expect(dispute).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Comment'), { target: { value: 'Our QC passed this batch.' } });
    fireEvent.click(panel().getByRole('button', { name: 'Dispute' }));
    await waitFor(() => expect(receiptDiscrepancyStore.get('gr-006')?.status).toBe('Disputed'));
  });

  it('PTI planner sees the open dispute and resolves it with a comment', async () => {
    receiptDiscrepancyStore.add({
      receiptId: 'gr-006',
      supplierId: 'sup-008',
      status: 'Disputed',
      comment: 'Our QC passed this batch.',
      respondedAt: '2026-09-16T03:00:00.000Z',
    });
    renderWithProviders(<BuyerGoodsReceipt />, { identity: BUYER });
    const section = await screen.findByTestId('gr-receipt-disputes');
    // ⚠️ SCOPED TO THE ROW THIS SPEC ADDED. The section-wide query found one
    // button only while `receiptDiscrepancyStore` started empty; it now carries
    // one seeded dispute (`gr-016`, sup-007) so that PTI's resolve affordance is
    // reachable in the demo without somebody first dispatching a dispute by
    // hand. The comment text is what identifies this spec's own row.
    const row = within(section).getByText('Our QC passed this batch.').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Resolve' }));
    const confirm = panel().getByRole('button', { name: 'Resolve dispute' });
    expect(confirm).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Resolution comment for the supplier'), {
      target: { value: 'Retest confirmed the rejection.' },
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(receiptDiscrepancyStore.get('gr-006')?.status).toBe('Resolved'));
    expect(receiptDiscrepancyStore.get('gr-006')?.resolutionComment).toBe('Retest confirmed the rejection.');
  });
});

describe('Home tasks', () => {
  it('supplier: receipt discrepancies to acknowledge or dispute, gone once answered', async () => {
    const { unmount } = renderWithProviders(<SupplierHome />, { identity: SUP_008 });
    expect(await screen.findByTestId('home-task-receipt-discrepancies')).toHaveTextContent(
      'Receipt discrepancies to acknowledge or dispute',
    );
    unmount();
    receiptDiscrepancyStore.add({
      receiptId: 'gr-006',
      supplierId: 'sup-008',
      status: 'Acknowledged',
      comment: 'Agreed.',
      respondedAt: '2026-09-16T03:00:00.000Z',
    });
    renderWithProviders(<SupplierHome />, { identity: SUP_008 });
    await screen.findByTestId('home-tasks');
    expect(screen.queryByTestId('home-task-receipt-discrepancies')).toBeNull();
  });

  it('PTI: disputed receipt discrepancies', async () => {
    receiptDiscrepancyStore.add({
      receiptId: 'gr-006',
      supplierId: 'sup-008',
      status: 'Disputed',
      comment: 'Disagree.',
      respondedAt: '2026-09-16T03:00:00.000Z',
    });
    renderWithProviders(<BuyerHome />, { identity: { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer } });
    expect(await screen.findByTestId('home-task-disputed-receipts')).toHaveTextContent(
      'Disputed receipt discrepancies',
    );
  });

  it('supplier: returned invoices to correct and resubmit', async () => {
    invoiceStore.update('inv-brl-0055', (i) => ({ ...i, status: 'Disputed', returnReason: 'Wrong PO' }));
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    expect(await screen.findByTestId('home-task-returned-invoices')).toHaveTextContent(
      'Returned invoices to correct and resubmit',
    );
  });
});

describe('ASN cancel on the Shipments page (REQ-E07-04)', () => {
  it('cancels a Draft ASN after the confirmation step', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel ASN ASN-2025-00215' }));
    fireEvent.click(panel().getByRole('button', { name: 'Yes, cancel this ASN' }));
    await waitFor(() => expect(asnStore.get('ASN-2025-00215')?.status).toBe('Cancelled'));
  });
});

describe('supplier invoice status list (REQ-E07-07)', () => {
  it('shows Returned with the reason and offers Correct and resubmit', async () => {
    invoiceStore.update('inv-brl-0055', (i) => ({ ...i, status: 'Disputed', returnReason: 'Amount above PO price' }));
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    const row = (await screen.findByText('INV-2026-BRL-0055')).closest('tr')!;
    expect(within(row).getByText('Returned')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'Correct and resubmit' }));
    expect(panel().getByText(/Amount above PO price/)).toBeInTheDocument();
    fireEvent.click(panel().getByRole('button', { name: 'Resubmit invoice' }));
    await waitFor(() => expect(invoiceStore.get('inv-brl-0055')?.status).toBe('Submitted'));
  });
});
