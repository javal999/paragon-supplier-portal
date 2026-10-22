// ─────────────────────────────────────────────────────────────────────────────
// P-01 — a PO's lifecycle steps link to their stage pages (IA-X01).
//
// A reached step (done, current or stopped) is a link to the page that owns its
// records, filtered to the PO with `?po=`; a step not reached yet is plain text.
// A stage page opened from a step offers "Back to purchase order <number>".
// Fixtures are read from the store by status, so the specs follow the data.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { POStatus } from '@services/data/types';
import { lifecycleSteps } from '@services/data/poResponseProjection';
import { PoLifecycleSteps } from './PoCollaboration';
import { lifecycleStepHref, purchaseOrderPath } from './orderSummaryDrill';
import BuyerOrders from '../BuyerOrders';
import BuyerShipments from '../BuyerShipments';
import SupplierGoodsReceipts from '../SupplierGoodsReceipts';

beforeEach(() => purchaseOrderStore.reset());

/**
 * @param {POStatus} status
 * @param {string | null} [supplierId]
 */
const poWith = (status, supplierId) => {
  const po = purchaseOrderStore
    .all()
    .find((p) => p.status === status && (!supplierId || p.supplierId === supplierId));
  if (!po)
    throw new Error(`fixture premise: a ${status} PO${supplierId ? ` of ${supplierId}` : ''}`);
  return po;
};

describe('lifecycleStepHref — one destination per step, per persona', () => {
  it('maps each step to the summary column that owns its records', () => {
    expect(lifecycleStepHref('response', 'buyer', 'po-007')).toBe(
      '/buyer/orders?po=po-007&focus=response'
    );
    expect(lifecycleStepHref('confirmations', 'supplier', 'po-007')).toBe(
      '/supplier/orders?po=po-007&focus=shipping'
    );
    expect(lifecycleStepHref('asn', 'buyer', 'po-007')).toBe('/buyer/shipments?po=po-007&from=po');
    expect(lifecycleStepHref('asn', 'supplier', 'po-007')).toBe(
      '/supplier/shipments?po=po-007&from=po'
    );
    expect(lifecycleStepHref('goodsReceipt', 'buyer', 'po-007')).toBe(
      '/buyer/goods-receipt?po=po-007&from=po'
    );
    expect(lifecycleStepHref('goodsReceipt', 'supplier', 'po-007')).toBe(
      '/supplier/goods-receipts?po=po-007&from=po'
    );
    expect(lifecycleStepHref('invoice', 'supplier', 'po-007')).toBe(
      '/supplier/invoices?po=po-007&from=po'
    );
    expect(purchaseOrderPath('buyer', 'po-007')).toBe('/buyer/orders?po=po-007');
  });
});

describe('PoLifecycleSteps — reached steps are links, unreached steps are not', () => {
  it('PTI: a delivered PO links its receipt and invoice steps to the filtered pages', () => {
    const po = poWith(POStatus.DELIVERED);
    renderWithProviders(<PoLifecycleSteps po={po} asnCount={1} persona="buyer" />, {
      identity: BUYER
    });
    expect(screen.getByTestId('po-step-link-goodsReceipt')).toHaveAttribute(
      'href',
      `/buyer/goods-receipt?po=${po.id}&from=po`
    );
    expect(screen.getByTestId('po-step-link-asn')).toHaveAttribute(
      'href',
      `/buyer/shipments?po=${po.id}&from=po`
    );
    // The current step keeps `aria-current`, and is a link too.
    const invoice = /** @type {HTMLElement} */ (
      screen.getByTestId('po-lifecycle-steps').querySelector('[data-step="invoice"]')
    );
    expect(invoice).toHaveAttribute('aria-current', 'step');
    expect(within(invoice).getByRole('link')).toHaveAttribute(
      'href',
      `/buyer/invoices?po=${po.id}&from=po`
    );
  });

  it('supplier: a shipped PO links its ASN step to its own Shipments & ASN; later steps stay text', () => {
    const po = poWith(POStatus.CONFIRMED, SUPPLIER.supplierId);
    const steps = lifecycleSteps(po, 1);
    // Population control: this PO has steps reached and steps not reached yet.
    expect(steps.find((s) => s.id === 'asn')?.state).toBe('done');
    expect(steps.filter((s) => s.state === 'upcoming').map((s) => s.id)).toEqual([
      'goodsReceipt',
      'invoice'
    ]);
    renderWithProviders(<PoLifecycleSteps po={po} asnCount={1} persona="supplier" />, {
      identity: SUPPLIER
    });
    expect(screen.getByTestId('po-step-link-asn')).toHaveAttribute(
      'href',
      `/supplier/shipments?po=${po.id}&from=po`
    );
    expect(screen.getByTestId('po-step-link-response')).toHaveAttribute(
      'href',
      `/supplier/orders?po=${po.id}&focus=response`
    );
    for (const step of steps) {
      const li = /** @type {HTMLElement} */ (
        screen.getByTestId('po-lifecycle-steps').querySelector(`[data-step="${step.id}"]`)
      );
      if (step.state === 'upcoming') {
        expect(within(li).queryByRole('link')).toBeNull();
      } else {
        expect(within(li).getByRole('link')).toHaveAttribute(
          'href',
          lifecycleStepHref(step.id, 'supplier', po.id)
        );
      }
    }
  });

  it('the PO panel on Purchase orders carries the links', async () => {
    const po = poWith(POStatus.DELIVERED);
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: `/buyer/orders?po=${po.id}` });
    expect(await screen.findByTestId('po-step-link-goodsReceipt')).toHaveAttribute(
      'href',
      `/buyer/goods-receipt?po=${po.id}&from=po`
    );
  });
});

describe('a stage page opened from a PO offers the way back to it', () => {
  it('PTI Shipments: "Back to purchase order <number>" reopens the PO', async () => {
    const po = poWith(POStatus.DELIVERED);
    renderWithProviders(<BuyerShipments />, {
      identity: BUYER,
      route: `/buyer/shipments?po=${po.id}&from=po`
    });
    const back = await screen.findByTestId('back-to-purchase-order');
    expect(back).toHaveAttribute('href', `/buyer/orders?po=${po.id}`);
    expect(back).toHaveTextContent(`Back to purchase order ${po.poNumber}`);
    // Not opened from the summary, so its way back is not offered.
    expect(screen.queryByTestId('back-to-order-summary')).toBeNull();
  });

  it('supplier Goods receipts, in Indonesian', async () => {
    const po = poWith(POStatus.DELIVERED, SUPPLIER.supplierId);
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<SupplierGoodsReceipts />, {
        identity: SUPPLIER,
        route: `/supplier/goods-receipts?po=${po.id}&from=po`
      });
      const back = await screen.findByTestId('back-to-purchase-order');
      expect(back).toHaveAttribute('href', `/supplier/orders?po=${po.id}`);
      expect(back).toHaveTextContent(`Kembali ke pesanan pembelian ${po.poNumber}`);
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('a menu visit (no `from`) shows no way back', async () => {
    const po = poWith(POStatus.DELIVERED);
    renderWithProviders(<BuyerShipments />, {
      identity: BUYER,
      route: `/buyer/shipments?po=${po.id}`
    });
    await screen.findByTestId('po-filter-banner');
    expect(screen.queryByTestId('back-to-purchase-order')).toBeNull();
  });
});
