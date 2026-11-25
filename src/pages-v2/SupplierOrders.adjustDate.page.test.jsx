// ─────────────────────────────────────────────────────────────────────────────
// UCX-P2 v2 (BL-363) · UCX-S2 — the Adjust path shows the delivery date box
// BESIDE the quantity. The simulated test could not say where a new date goes
// (the proposal's text named a reason and a quantity only); on the build the
// two inputs sit in the same grid row, and this spec pins it so a restyle
// cannot separate them silently.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { POStatus } from '@services/data/types';
import { ordersNow } from './orders/PoCollaboration';
import SupplierOrders from './SupplierOrders';

beforeEach(() => {
  purchaseOrderStore.reset();
});

describe('UCX-P2 — the Adjust path shows the date beside the quantity', () => {
  it('quantity and delivery date are two inputs in the same grid', async () => {
    const nowIso = ordersNow();
    const po = purchaseOrderStore.all().find((p) => p.supplierId === SUPPLIER.supplierId);
    expect(po).toBeTruthy();
    purchaseOrderStore.update(/** @type {any} */ (po).id, (p) => ({
      ...p,
      status: POStatus.SENT,
      orderDate: nowIso,
      responseRequestedAt: undefined,
      response: undefined
    }));
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?view=list'
    });
    fireEvent.click(await screen.findByText(/** @type {any} */ (po).poNumber));
    // Confirm order opens the answer form; Adjust opens the counter-offer form.
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm order' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Adjust' }));
    const form = await screen.findByTestId('po-adjust-form');
    fireEvent.click(within(form).getAllByRole('checkbox')[0]);
    const line = /** @type {any} */ (po).lineItems[0];
    const qtyId = /** @type {HTMLElement} */ (
      within(form).getByLabelText('Quantity you can supply')
    );
    const dateInput = /** @type {HTMLElement} */ (
      within(form).getByLabelText('Date you can deliver')
    );
    expect(qtyId).toHaveAttribute('id', `adj-qty-${line.id}`);
    expect(dateInput).toHaveAttribute('id', `adj-date-${line.id}`);
    // The two sit in the same grid row (beside each other), not in two stacks.
    const qtyCell = qtyId.closest('.grid');
    const dateCell = dateInput.closest('.grid');
    expect(qtyCell).not.toBeNull();
    expect(qtyCell).toBe(dateCell);
  });
});
