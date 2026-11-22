import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { NOTICE_READS_STORAGE_KEY, resetNoticeReads } from '@services/stores/noticeReadsStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { invoiceStore } from '@services/data/mock/stores/invoiceStore';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import SidebarV2 from './SidebarV2';
import { SupplierNoticeBell } from './SupplierNotices';

// BL-213 — the supplier bell's badge is the UNREAD count, and the menu items
// with a derived population carry one. Fixtures: sup-015 holds one seeded
// award on rfq-015 and one on rfq-024 (2 notices); sup-013 holds rfq-024 (1).

/**
 * @param {string} supplierId
 * @returns {CurrentIdentity}
 */
const seat = (supplierId) => ({ ...SUPPLIER, supplierId, supplierName: supplierId });
const SUP_015 = seat('sup-015');
const SUP_013 = seat('sup-013');

beforeEach(() => {
  resetNoticeReads();
});

/** @returns {Promise<HTMLElement>} */
const findBell = () => screen.findByTestId('supplier-notice-bell');

describe('SupplierNoticeBell — unread count versus total (BL-213)', () => {
  it('starts with the badge showing the unread count, and keeps the total separate', async () => {
    renderWithProviders(<SupplierNoticeBell />, { identity: SUP_015 });
    const bell = await findBell();
    await waitFor(() => expect(bell).toHaveAttribute('data-unread-count', '2'));
    expect(bell).toHaveAttribute('data-total-count', '2');
    expect(within(bell).getByTestId('supplier-notice-badge')).toHaveTextContent('2');
    expect(bell).toHaveAccessibleName('Notifications: 2 unread');
  });

  it('opening marks the listed notices read: the badge clears, the total does not', async () => {
    renderWithProviders(<SupplierNoticeBell />, { identity: SUP_015 });
    const bell = await findBell();
    await waitFor(() => expect(bell).toHaveAttribute('data-unread-count', '2'));

    fireEvent.click(bell);

    expect(screen.queryByTestId('supplier-notice-badge')).toBeNull();
    expect(bell).toHaveAttribute('data-unread-count', '0');
    expect(bell).toHaveAttribute('data-total-count', '2');
    expect(bell).toHaveAccessibleName('Notifications: 0');
    // Both listed notices are still distinguishable as new FOR THIS VIEWING.
    const awarded = screen.getByTestId('supplier-notice-rfq:rfq-015:awarded');
    const awarded024 = screen.getByTestId('supplier-notice-rfq:rfq-024:awarded');
    for (const item of [awarded, awarded024]) {
      expect(item).toHaveAttribute('data-new', 'true');
      expect(item).toHaveTextContent('New');
      expect(item).toHaveAccessibleName(/^New Awarded to you/);
    }
    expect(awarded).toHaveTextContent('Awarded to you · RFQ-2026-015 · 70% of item 1');
  });

  it('a reload keeps the read state: no badge, same total, and no notice reads as new', async () => {
    const first = renderWithProviders(<SupplierNoticeBell />, { identity: SUP_015 });
    const bell = await findBell();
    await waitFor(() => expect(bell).toHaveAttribute('data-unread-count', '2'));
    fireEvent.click(bell);
    first.unmount();

    renderWithProviders(<SupplierNoticeBell />, { identity: SUP_015 });
    const again = await findBell();
    await waitFor(() => expect(again).toHaveAttribute('data-total-count', '2'));
    expect(again).toHaveAttribute('data-unread-count', '0');
    expect(screen.queryByTestId('supplier-notice-badge')).toBeNull();

    fireEvent.click(again);
    const item = screen.getByTestId('supplier-notice-rfq:rfq-015:awarded');
    expect(item).toHaveAttribute('data-new', 'false');
    expect(item).not.toHaveTextContent('New');
  });

  it('one supplier’s reads never clear another supplier’s badge', async () => {
    const first = renderWithProviders(<SupplierNoticeBell />, { identity: SUP_015 });
    const bell = await findBell();
    await waitFor(() => expect(bell).toHaveAttribute('data-unread-count', '2'));
    fireEvent.click(bell);
    first.unmount();

    renderWithProviders(<SupplierNoticeBell />, { identity: SUP_013 });
    const other = await findBell();
    await waitFor(() => expect(other).toHaveAttribute('data-unread-count', '1'));
    expect(within(other).getByTestId('supplier-notice-badge')).toHaveTextContent('1');
  });

  it('a corrupt store does not crash the shell: the badge falls back to all-unread', async () => {
    localStorage.setItem(NOTICE_READS_STORAGE_KEY, '{not json');
    renderWithProviders(<SupplierNoticeBell />, { identity: SUP_015 });
    const bell = await findBell();
    await waitFor(() => expect(bell).toHaveAttribute('data-unread-count', '2'));
    expect(within(bell).getByTestId('supplier-notice-badge')).toHaveTextContent('2');
  });
});

describe('supplier menu counts — only where a derived population exists (BL-213)', () => {
  const ACTION_POS = ['Sent', 'Acknowledged'];

  it('counts the Orders Action tab, call-offs awaiting confirmation, and invoices to act on', async () => {
    // Expected values come from the SAME stores the mock service reads, with
    // the same predicates the pages use.
    const orders = purchaseOrderStore
      .all()
      .filter((po) => po.supplierId === 'sup-007' && ACTION_POS.includes(po.status)).length;
    const callOffs = callOffStore
      .all()
      .filter((c) => c.supplierId === 'sup-007' && c.status === 'Awaiting Confirmation').length;
    const invoices = invoiceStore
      .all()
      .filter(
        (i) => i.supplierId === 'sup-007' && (i.status === 'Draft' || i.status === 'Disputed')
      ).length;

    // Population control: each fixture set must actually hold a member, or the
    // assertions below would only be proving that three absent counts absent.
    expect(orders).toBeGreaterThan(0);
    expect(callOffs).toBeGreaterThan(0);
    expect(invoices).toBeGreaterThan(0);

    renderWithProviders(<SidebarV2 />, { identity: SUPPLIER, route: '/supplier/home' });

    expect(await screen.findByTestId('nav-count-/supplier/orders')).toHaveTextContent(
      String(orders)
    );
    expect(await screen.findByTestId('nav-count-/supplier/call-offs')).toHaveTextContent(
      String(callOffs)
    );
    expect(await screen.findByTestId('nav-count-/supplier/invoices')).toHaveTextContent(
      String(invoices)
    );
  });

  it('refuses a count on Shipments: a Draft ASN is the supplier’s own unfinished work', async () => {
    renderWithProviders(<SidebarV2 />, { identity: SUPPLIER, route: '/supplier/home' });
    // Population control: the menu did render, so the absence below is a choice.
    expect(await screen.findByRole('button', { name: 'Shipments & ASN' })).toBeInTheDocument();
    expect(screen.queryByTestId('nav-count-/supplier/shipments')).toBeNull();
  });
});
