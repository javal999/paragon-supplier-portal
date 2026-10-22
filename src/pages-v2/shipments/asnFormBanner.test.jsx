// ─────────────────────────────────────────────────────────────────────────────
// IA F-4 — the PO filter banner counts the shipment list, so the ASN form
// opened from a PO shows the order and the way back, without a count that would
// read "No record on this order" before the ASN exists.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import SupplierShipments from '../SupplierShipments';

beforeEach(async () => {
  purchaseOrderStore.reset();
  await i18n.changeLanguage('en');
});

const ownPo = () => {
  const po = purchaseOrderStore.all().find((p) => p.supplierId === SUPPLIER.supplierId);
  if (!po) throw new Error('fixture premise: a PO of the demo supplier');
  return po;
};

describe('the PO filter banner on Shipments & ASN', () => {
  it('on the ASN form: the order and the way back, no count', async () => {
    const po = ownPo();
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      route: `/supplier/shipments?tab=create&po=${po.id}&from=po`
    });
    const banner = await screen.findByTestId('po-filter-banner');
    expect(within(banner).getByTestId('po-filter-statement')).toHaveTextContent(po.poNumber);
    expect(within(banner).queryByTestId('po-filter-count')).toBeNull();
    expect(banner).not.toHaveTextContent('No record on this order');
    expect(within(banner).getByText(/Back to purchase order/)).toBeInTheDocument();
  });

  it('on the shipment list: the count is shown', async () => {
    const po = ownPo();
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      route: `/supplier/shipments?po=${po.id}&from=po`
    });
    const banner = await screen.findByTestId('po-filter-banner');
    expect(within(banner).getByTestId('po-filter-count')).toBeInTheDocument();
  });
});
