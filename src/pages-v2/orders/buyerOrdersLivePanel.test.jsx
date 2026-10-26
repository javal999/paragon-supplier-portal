// ─────────────────────────────────────────────────────────────────────────────
// BuyerOrders follows the LIVE row and the LIVE clock.
//
// 1. The PO panel is opened on a snapshot (`selectedPO`). Every section that
//    shows something a command can change must read the live row, or a review
//    leaves the timeline and line items one step behind the status pill until
//    the panel is reopened. Each assertion below compares the open panel with
//    what a freshly opened panel shows, so it names the defect, not a layout.
// 2. `Escalated` is a clock projection. The tab counts and the tab's rows must
//    move when the orders clock passes a PO's deadline, with the PO list itself
//    unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { commandAuditSink } from '@services/data/mock/MockCommandService';
import { POStatus } from '@services/data/types';
import { sdcClock } from '@services/sdc/clock';
import { responseDeadline } from '@services/data/poResponseProjection';
import BuyerOrders from '../BuyerOrders';

/** @typedef {import('@services/data/types').PurchaseOrder} PurchaseOrder */

beforeEach(() => {
  purchaseOrderStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

afterEach(() => {
  sdcClock.reset();
});

const panelEl = () => /** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]'));
const panel = () => within(panelEl());

const adjustPo008 = () =>
  purchaseOrderStore.update('po-008', (po) => ({
    ...po,
    status: POStatus.ADJUSTED,
    response: {
      option: 'adjust',
      respondedAt: '2025-04-03T05:00:00.000Z',
      lines: [
        { lineId: 'li-008a', reasonCode: 'material', counterQty: 100000, counterDate: '2025-05-02' }
      ]
    }
  }));

/** The timeline step titles and whether each reads as reached (not pending). */
const timelineState = () => {
  const heading = panel().getByText('Lifecycle', { selector: 'h3' });
  const list = /** @type {HTMLElement} */ (
    /** @type {HTMLElement} */ (heading.parentElement).querySelector('ol')
  );
  return [...list.querySelectorAll('li')].map((li) => {
    const title = /** @type {HTMLElement} */ (li.querySelector('span.text-sm'));
    return `${li.textContent} | ${title.className.includes('text-text-tertiary') ? 'pending' : 'reached'}`;
  });
};

const lineItemsText = () => {
  const heading = panel().getByText('Line items', { selector: 'h3' });
  return /** @type {HTMLElement} */ (heading.parentElement).textContent;
};

const nextActText = () => panel().getByTestId('next-act-buyer-po').textContent;

const reopen = async () => {
  fireEvent.click(panel().getByRole('button', { name: /close/i }));
  await waitFor(() => expect(document.querySelector('aside[role="dialog"]')).toBeNull());
  fireEvent.click(await screen.findByText('PO-2025-00108'));
  await waitFor(() => expect(panelEl()).not.toBeNull());
};

describe('BuyerOrders panel follows the live PO', () => {
  it('accepting a counter-offer moves the timeline and next act without reopening', async () => {
    adjustPo008();
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders?view=list' });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    const before = timelineState();
    // Adjusted is rank 3: the shipping-notice step is still pending.
    expect(before.find((s) => s.startsWith('ASN'))).toMatch(/\| pending$/);

    fireEvent.click(panel().getByRole('button', { name: 'Accept counter-offer' }));
    await waitFor(() =>
      expect(/** @type {PurchaseOrder} */ (purchaseOrderStore.get('po-008')).status).toBe(
        POStatus.CONFIRMED
      )
    );
    // The status pill already reads the live row …
    await waitFor(() => expect(panel().getAllByText('Confirmed').length).toBeGreaterThan(0));
    // … and Confirmed (rank 4) makes the shipping-notice step current.
    expect(timelineState().find((s) => s.startsWith('ASN'))).toMatch(/\| reached$/);

    const open = { timeline: timelineState(), nextAct: nextActText() };
    await reopen();
    expect(open).toEqual({ timeline: timelineState(), nextAct: nextActText() });
  });

  it('rejecting a counter-offer drops the acknowledged step back without reopening', async () => {
    adjustPo008();
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders?view=list' });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    expect(timelineState().find((s) => s.startsWith('Acknowledged'))).toMatch(/after send/);

    fireEvent.click(panel().getByRole('button', { name: 'Reject counter-offer' }));
    fireEvent.change(panel().getByLabelText('Comment for the supplier'), {
      target: { value: 'Full quantity needed' }
    });
    fireEvent.click(panel().getByRole('button', { name: 'Send back to supplier' }));
    await waitFor(() =>
      expect(/** @type {PurchaseOrder} */ (purchaseOrderStore.get('po-008')).status).toBe(
        POStatus.SENT
      )
    );
    // Sent (rank 1): no acknowledgement time any more.
    await waitFor(() =>
      expect(timelineState().find((s) => s.startsWith('Acknowledged'))).not.toMatch(/after send/)
    );

    const open = { timeline: timelineState(), nextAct: nextActText() };
    await reopen();
    expect(open).toEqual({ timeline: timelineState(), nextAct: nextActText() });
  });

  it('line items show the live row after a command refetches the PO', async () => {
    adjustPo008();
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders?view=list' });
    fireEvent.click(await screen.findByText('PO-2025-00108'));
    const before = lineItemsText();
    // The row changes underneath the open panel (another seat, a sync); the
    // accept command's refetch is what brings it to this page.
    purchaseOrderStore.update('po-008', (po) => ({
      ...po,
      lineItems: po.lineItems.map((li) => ({ ...li, description: `${li.description} (rev B)` }))
    }));
    fireEvent.click(panel().getByRole('button', { name: 'Accept counter-offer' }));
    await waitFor(() => expect(panel().getAllByText('Confirmed').length).toBeGreaterThan(0));
    await waitFor(() => expect(lineItemsText()).toContain('(rev B)'));
    expect(lineItemsText()).not.toBe(before);
  });
});

describe('BuyerOrders worklist follows the orders clock', () => {
  /** @returns {number} */
  const escalatedCount = () => {
    const tab = screen.getByRole('tab', { name: /^Escalated/ });
    return Number((tab.textContent ?? '').replace(/\D+/g, ''));
  };

  it('the Escalated count and rows move when the clock passes the deadline', async () => {
    // po-021 is the fixture's one awaiting PO still inside its response window
    // at the declared present (every other awaiting PO is already late).
    const po021 = /** @type {PurchaseOrder} */ (purchaseOrderStore.get('po-021'));
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders?view=list' });
    fireEvent.click(await screen.findByRole('tab', { name: /^Escalated/ }));
    const countBefore = escalatedCount();
    expect(screen.queryByText(po021.poNumber)).toBeNull();

    // One minute past po-021's deadline. The PO list is unchanged.
    sdcClock.set(new Date(responseDeadline(po021).getTime() + 60_000).toISOString());
    // A re-render that changes none of the memo inputs except the clock:
    // open the panel on another escalated row.
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBeGreaterThan(0);
    fireEvent.click(/** @type {HTMLElement} */ (rows[0].querySelector('td')));
    await waitFor(() => expect(panelEl()).not.toBeNull());

    expect(escalatedCount()).toBe(countBefore + 1);
    expect(screen.getByText(po021.poNumber)).toBeInTheDocument();
  });
});
