// ─────────────────────────────────────────────────────────────────────────────
// UCX-P2 v2 (BL-363) · UCX-F27 — "confirm as requested" on Purchase orders:
// nothing starts ticked; an escalated order and a value-limit order cannot be
// ticked; select-all takes only the eligible; the review dialog repeats each
// record; a refused record is reported while the others stay confirmed.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { commandAuditSink } from '@services/data/mock/MockCommandService';
import { POStatus } from '@services/data/types';
import { isAwaitingResponse } from '@services/data/poResponseProjection';
import { ordersNow } from './orders/PoCollaboration';
import { poBulkEligible, poNeedsDecision } from './SupplierOrders/bulkConfirm';
import SupplierOrders from './SupplierOrders';

beforeEach(() => {
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});

const ROUTE = '/supplier/orders?view=list';
const render = () => renderWithProviders(<SupplierOrders />, { identity: SUPPLIER, route: ROUTE });

/** sup-007's own orders. */
const myPos = () => purchaseOrderStore.all().filter((p) => p.supplierId === SUPPLIER.supplierId);

describe('UCX-P2 — the eligibility rule (the record’s own)', () => {
  it('refuses an escalated order, a value-limit order and an answered one', () => {
    const nowIso = ordersNow();
    const [first] = myPos();
    expect(first).toBeTruthy();
    const escalated = { ...first, status: POStatus.SENT, orderDate: '2020-01-01' };
    expect(poNeedsDecision(escalated, nowIso)).toBe('escalated');
    const valueLimit = {
      ...first,
      status: POStatus.SENT,
      orderDate: nowIso,
      lineItems: [{ ...first.lineItems[0], valueLimit: 1000 }]
    };
    expect(poNeedsDecision(valueLimit, nowIso)).toBe('valueLimit');
    expect(poNeedsDecision({ ...first, status: POStatus.CONFIRMED }, nowIso)).toBe('answered');
    expect(poBulkEligible({ ...first, status: POStatus.SENT, orderDate: nowIso }, nowIso)).toBe(
      true
    );
  });
});

describe('UCX-P2 — the bulk bar', () => {
  it('starts with nothing ticked; select-all takes only eligible orders; the dialog repeats each row', async () => {
    // One clearly eligible order: awaiting and inside its window.
    const nowIso = ordersNow();
    const po = myPos()[0];
    purchaseOrderStore.update(po.id, (p) => ({
      ...p,
      status: POStatus.SENT,
      orderDate: nowIso,
      responseRequestedAt: undefined,
      response: undefined
    }));
    render();
    const bar = await screen.findByTestId('orders-bulk-bar', {}, { timeout: 15000 });
    expect(within(bar).getByTestId('orders-bulk-count')).toHaveTextContent('0 selected');
    // Nothing is ticked at the start (safeguard 1).
    for (const box of screen.queryAllByTestId(/^po-bulk-tick-/))
      expect(/** @type {HTMLInputElement} */ (box)).not.toBeChecked();
    // Select-all ticks exactly the eligible rows.
    fireEvent.click(within(bar).getByTestId('orders-bulk-select-all'));
    const eligibleIds = myPos()
      .filter((p) => poBulkEligible(p, nowIso))
      .map((p) => p.id);
    for (const id of eligibleIds)
      expect(
        /** @type {HTMLInputElement} */ (screen.getByTestId(`po-bulk-tick-${id}`))
      ).toBeChecked();
    // The review dialog lists every selected record with its figures.
    fireEvent.click(within(bar).getByTestId('orders-bulk-open'));
    const dialog = await screen.findByTestId('bulk-confirm-dialog', {}, { timeout: 8000 });
    for (const id of eligibleIds)
      expect(within(dialog).getByTestId(`bulk-confirm-row-${id}`)).toBeInTheDocument();
    // One confirm for the batch.
    fireEvent.click(within(dialog).getByTestId('bulk-confirm-submit'));
    await waitFor(() => {
      for (const id of eligibleIds)
        expect(purchaseOrderStore.get(id)?.status).toBe(POStatus.CONFIRMED);
    });
    expect(within(dialog).getByTestId('bulk-confirm-result')).toHaveTextContent(
      `${eligibleIds.length} confirmed`
    );
  });

  it('a record refused at the batch is reported with its reason while the others stay confirmed', async () => {
    const nowIso = ordersNow();
    const [a, b] = myPos();
    for (const p of [a, b])
      purchaseOrderStore.update(p.id, (x) => ({
        ...x,
        status: POStatus.SENT,
        orderDate: nowIso,
        responseRequestedAt: undefined,
        response: undefined
      }));
    render();
    const bar = await screen.findByTestId('orders-bulk-bar', {}, { timeout: 15000 });
    fireEvent.click(within(bar).getByTestId('orders-bulk-select-all'));
    // b stops being legal between selection and confirm: the rule changed under
    // the batch (the store says Confirmed, so the dispatcher refuses the move).
    purchaseOrderStore.update(b.id, (x) => ({ ...x, status: POStatus.CONFIRMED }));
    fireEvent.click(within(bar).getByTestId('orders-bulk-open'));
    const dialog = await screen.findByTestId('bulk-confirm-dialog', {}, { timeout: 8000 });
    fireEvent.click(within(dialog).getByTestId('bulk-confirm-submit'));
    await waitFor(() =>
      expect(within(dialog).getByTestId('bulk-confirm-result')).toBeInTheDocument()
    );
    expect(purchaseOrderStore.get(a.id)?.status).toBe(POStatus.CONFIRMED);
    expect(within(dialog).getAllByTestId('bulk-confirm-refused').length).toBeGreaterThan(0);
    // The refused record's reason is the dispatcher's own.
    expect(within(dialog).getByTestId('bulk-confirm-result')).toHaveTextContent('was refused:');
  });

  it('an escalated order cannot be ticked, and its checkbox says why', async () => {
    const po = myPos()[0];
    purchaseOrderStore.update(po.id, (p) => ({
      ...p,
      status: POStatus.SENT,
      orderDate: '2020-01-01',
      responseRequestedAt: undefined,
      response: undefined
    }));
    expect(isAwaitingResponse(/** @type {any} */ (purchaseOrderStore.get(po.id)))).toBe(true);
    render();
    await screen.findByTestId('orders-bulk-bar', {}, { timeout: 15000 });
    const box = /** @type {HTMLInputElement} */ (screen.getByTestId(`po-bulk-tick-${po.id}`));
    expect(box).toBeDisabled();
    expect(box.title).toMatch(/Escalated/);
  });
});
